import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Brain,
  Calculator,
  Camera,
  Footprints,
  Keyboard,
  QrCode,
  Smartphone,
} from 'lucide-react-native';
import {
  type ActiveMissionSession,
  appendMissionSessionResult,
  buildMissionQueue,
  clampPhotoThreshold,
  clampShakeTarget,
  clampStepsTarget,
  defaultShakeTargetForDifficulty,
  defaultStepsTargetForDifficulty,
  formatMissionFailure,
  generateMathProblem,
  generateMemorySequence,
  getMemorySequenceConfig,
  getTypingSentence,
  type MissionDifficulty,
  type MissionId,
  type MissionStepResult,
  type PerMissionSettings,
  saveActiveMissionSession,
  validateMathAnswer,
  validateQrCodeMatch,
  validateTypingSentence,
} from './alarmMissions';
import {
  captureNativeBarcode,
  startNativeShakeMission,
  startNativeStepMission,
  stopNativeSensorMission,
  subscribeToMissionSensor,
  verifyNativePhotoAgainstReference,
} from './alarmNative';

export interface HeavySleeperAlarmPayload {
  id: string;
  title: string;
  heavySleeper: boolean;
  missions: MissionId[];
  missionDifficulty: MissionDifficulty;
  missionCount: number;
  randomMission: boolean;
  allowDuplicateMissions?: boolean;
  missionBeforeSnooze: boolean;
  missionRetryLimit?: number;
  missionTimeoutSeconds?: number;
  perMission?: Partial<PerMissionSettings>;
  snoozeEnabled: boolean;
  snoozeDuration: number;
  maxSnooze?: number;
  snoozeCount?: number;
  antiSnooze: boolean;
}

const MISSION_META: Record<MissionId, { name: string; icon: React.ComponentType<{ size?: number; color?: string }> }> = {
  math: { name: 'Math Challenge', icon: Calculator },
  memory: { name: 'Memory Sequence', icon: Brain },
  shake: { name: 'Shake Device', icon: Smartphone },
  typing: { name: 'Typing Challenge', icon: Keyboard },
  qr: { name: 'QR / Barcode', icon: QrCode },
  photo: { name: 'Photo Match', icon: Camera },
  steps: { name: 'Step Counter', icon: Footprints },
};

export function HeavySleeperMissionView({
  alarm,
  activeThemeColors,
  mode,
  restoredSession,
  onSwitchToSnoozeMode,
  onSnoozeDirect,
  onComplete,
  onEmergencyExit,
}: {
  alarm: HeavySleeperAlarmPayload;
  activeThemeColors: readonly [string, string, string];
  mode: 'dismiss' | 'snooze';
  restoredSession?: ActiveMissionSession | null;
  onSwitchToSnoozeMode?: () => void;
  onSnoozeDirect?: () => void;
  onComplete: (summaryLabel: string, results: MissionStepResult[]) => void;
  onEmergencyExit: () => void;
}) {
  const difficulty: MissionDifficulty = alarm.missionDifficulty || 'Medium';
  const allowDuplicates = alarm.allowDuplicateMissions ?? false;
  const retryLimit = alarm.missionRetryLimit ?? 0; // 0 = unlimited
  const timeoutSeconds = alarm.missionTimeoutSeconds ?? 0; // 0 = no timeout

  const [session, setSession] = useState<ActiveMissionSession>(() => {
    if (restoredSession && restoredSession.alarmId === alarm.id && restoredSession.queue.length > 0) {
      return restoredSession;
    }
    const queue = buildMissionQueue({
      missions: alarm.missions,
      missionCount: alarm.missionCount || 1,
      randomMission: Boolean(alarm.randomMission),
      allowDuplicateMissions: allowDuplicates,
    });
    const nowMs = Date.now();
    return {
      sessionId: `ms-${nowMs}-${Math.floor(Math.random() * 1000)}`,
      alarmId: alarm.id,
      mode,
      queue,
      currentIndex: 0,
      retriesUsed: 0,
      retryLimit,
      timeoutSeconds,
      startedAtMs: nowMs,
      stepStartedAtMs: nowMs,
      results: [],
    };
  });
  const currentMissionId: MissionId = session.queue[session.currentIndex] || 'math';
  const totalSteps = session.queue.length;
  const stepIndex = session.currentIndex;

  const [showEmergency, setShowEmergency] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(timeoutSeconds);

  // Mission 1: Math
  const [mathProblem, setMathProblem] = useState(() => generateMathProblem(difficulty));
  const [mathInput, setMathInput] = useState('');

  // Mission 2: Memory
  const [memSeq, setMemSeq] = useState<number[]>([]);
  const [memPhase, setMemPhase] = useState<'showing' | 'input' | 'success'>('showing');
  const [memHighlight, setMemHighlight] = useState(-1);
  const [memUserInput, setMemUserInput] = useState<number[]>([]);
  const [memReplayNonce, setMemReplayNonce] = useState(0);

  // Mission 3: Shake
  const shakeTarget = clampShakeTarget(
    alarm.perMission?.shakeTarget ?? defaultShakeTargetForDifficulty(difficulty)
  );
  const [shakes, setShakes] = useState(() =>
    session.sensorProgress?.stepIndex === session.currentIndex && session.sensorProgress?.missionId === 'shake'
      ? session.sensorProgress.count
      : 0
  );
  const [sensorStatus, setSensorStatus] = useState<string | null>(null);

  // Mission 4: Typing
  const targetSentence = useMemo(
    () => getTypingSentence(difficulty, stepIndex),
    [difficulty, stepIndex]
  );
  const [typedText, setTypedText] = useState('');

  // Mission 5: QR / Barcode
  const registeredQrCode = alarm.perMission?.registeredQrCode?.trim() || '';
  const [qrBusy, setQrBusy] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  // Mission 6: Photo
  const referencePhotoUri = alarm.perMission?.referencePhotoUri?.trim() || '';
  const photoThreshold = clampPhotoThreshold(alarm.perMission?.photoSimilarityThreshold ?? 80);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [lastPhotoSimilarity, setLastPhotoSimilarity] = useState<number | null>(null);

  // Mission 7: Steps
  const stepsTarget = clampStepsTarget(
    alarm.perMission?.stepsTarget ?? defaultStepsTargetForDifficulty(difficulty)
  );
  const [walkedSteps, setWalkedSteps] = useState(() =>
    session.sensorProgress?.stepIndex === session.currentIndex && session.sensorProgress?.missionId === 'steps'
      ? session.sensorProgress.count
      : 0
  );
  const [sensorRetryNonce, setSensorRetryNonce] = useState(0);

  const advancingRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Persist active mission session across restarts/screen lock
  useEffect(() => {
    void saveActiveMissionSession(session);
  }, [session]);

  const advanceMission = useCallback((detail?: string) => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    void stopNativeSensorMission(session.sessionId);

    const nowMs = Date.now();
    const stepResult: MissionStepResult = {
      missionId: currentMissionId,
      passed: true,
      attempts: session.retriesUsed + 1,
      durationMs: Math.max(0, nowMs - session.stepStartedAtMs),
      detail,
    };
    const nextResults = [...session.results, stepResult];
    const nextIndex = session.currentIndex + 1;

    if (nextIndex < session.queue.length) {
      setSession((prev) => ({
        ...prev,
        currentIndex: nextIndex,
        retriesUsed: 0,
        stepStartedAtMs: nowMs,
        results: nextResults,
        sensorProgress: undefined,
      }));
      setStatusError(null);
      setSensorStatus(null);
      setMathProblem(generateMathProblem(difficulty));
      setMathInput('');
      setTypedText('');
      setShakes(0);
      setWalkedSteps(0);
      setLastScannedCode(null);
      setLastPhotoSimilarity(null);
      setSecondsLeft(timeoutSeconds);
      setTimeout(() => {
        advancingRef.current = false;
      }, 150);
    } else {
      const completedNames = nextResults
        .map((r) => MISSION_META[r.missionId]?.name || r.missionId)
        .join(' → ');
      void appendMissionSessionResult({
        sessionId: session.sessionId,
        alarmId: alarm.id,
        mode: session.mode,
        completedAt: new Date().toISOString(),
        passed: true,
        results: nextResults,
      });
      void saveActiveMissionSession(null);
      onCompleteRef.current(completedNames || MISSION_META[currentMissionId].name, nextResults);
    }
  }, [alarm.id, currentMissionId, difficulty, session.currentIndex, session.mode, session.queue.length, session.results, session.retriesUsed, session.sessionId, session.stepStartedAtMs, timeoutSeconds]);

  const advanceMissionRef = useRef(advanceMission);
  useEffect(() => {
    advanceMissionRef.current = advanceMission;
  }, [advanceMission]);

  const recordFailure = useCallback((message: string, onRetryExhausted?: () => void) => {
    Vibration.vibrate(140);
    setSession((prev) => {
      const nextRetries = prev.retriesUsed + 1;
      if (prev.retryLimit > 0 && nextRetries >= prev.retryLimit) {
        if (onRetryExhausted) onRetryExhausted();
        setStatusError(`Retry limit (${prev.retryLimit}) reached — resetting current mission.`);
        return { ...prev, retriesUsed: 0, stepStartedAtMs: Date.now() };
      }
      const remaining = prev.retryLimit > 0 ? ` (${prev.retryLimit - nextRetries} retries left)` : '';
      setStatusError(`${message}${remaining}`);
      return { ...prev, retriesUsed: nextRetries };
    });
  }, []);

  // Mission timeout countdown
  useEffect(() => {
    if (timeoutSeconds <= 0) return undefined;
    const iv = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          recordFailure('Mission timed out — try again', () => {
            setMathProblem(generateMathProblem(difficulty));
            setMathInput('');
            setTypedText('');
            setShakes(0);
            setWalkedSteps(0);
            setMemReplayNonce((n) => n + 1);
          });
          return timeoutSeconds;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [currentMissionId, stepIndex, timeoutSeconds, difficulty, recordFailure]);

  // Memory sequence playback
  useEffect(() => {
    if (currentMissionId !== 'memory') return undefined;
    const { length, intervalMs } = getMemorySequenceConfig(difficulty, stepIndex);
    const seq = generateMemorySequence(length);
    let i = 0;
    let iv: ReturnType<typeof setInterval> | null = null;
    const flashTimers = new Set<ReturnType<typeof setTimeout>>();
    const initTimer = setTimeout(() => {
      setMemSeq(seq);
      setMemUserInput([]);
      setMemPhase('showing');
      setMemHighlight(-1);
      iv = setInterval(() => {
        if (i < seq.length) {
          setMemHighlight(seq[i]);
          const t = setTimeout(() => {
            flashTimers.delete(t);
            setMemHighlight(-1);
          }, Math.max(260, intervalMs - 220));
          flashTimers.add(t);
          i += 1;
        } else {
          if (iv) clearInterval(iv);
          setMemPhase('input');
        }
      }, intervalMs);
    }, 0);
    return () => {
      clearTimeout(initTimer);
      if (iv) clearInterval(iv);
      flashTimers.forEach((t) => clearTimeout(t));
      flashTimers.clear();
    };
  }, [currentMissionId, difficulty, stepIndex, memReplayNonce]);

  // Native Shake & Step sensor lifecycle (isolated from parent re-renders & advanceMission identity)
  const sensorSessionId = `${session.sessionId}-step-${stepIndex}`;
  useEffect(() => {
    if (currentMissionId !== 'shake' && currentMissionId !== 'steps') {
      void stopNativeSensorMission(sensorSessionId);
      return undefined;
    }

    let cancelled = false;

    const handleSensorCount = (missionId: 'shake' | 'steps', count: number) => {
      if (missionId === 'shake') {
        setShakes((prev) => Math.max(prev, count));
        setSession((prev) => (
          prev.sensorProgress?.stepIndex === stepIndex &&
          prev.sensorProgress?.missionId === 'shake' &&
          prev.sensorProgress.count >= count
            ? prev
            : { ...prev, sensorProgress: { stepIndex, missionId: 'shake', count } }
        ));
        if (count >= shakeTarget) {
          advanceMissionRef.current(`${count} shakes`);
        }
      } else {
        setWalkedSteps((prev) => Math.max(prev, count));
        setSession((prev) => (
          prev.sensorProgress?.stepIndex === stepIndex &&
          prev.sensorProgress?.missionId === 'steps' &&
          prev.sensorProgress.count >= count
            ? prev
            : { ...prev, sensorProgress: { stepIndex, missionId: 'steps', count } }
        ));
        if (count >= stepsTarget) {
          advanceMissionRef.current(`${count} steps`);
        }
      }
    };

    const unsubscribe = subscribeToMissionSensor((event) => {
      if (cancelled || event.sessionId !== sensorSessionId) return;
      if (event.type === 'shake' && currentMissionId === 'shake') {
        handleSensorCount('shake', event.count);
      } else if (event.type === 'steps' && currentMissionId === 'steps') {
        handleSensorCount('steps', event.count);
      }
    });

    const startSensor = async () => {
      const res = currentMissionId === 'shake'
        ? await startNativeShakeMission(sensorSessionId, shakeTarget, difficulty === 'Expert' ? 2.35 : 2.05)
        : await startNativeStepMission(sensorSessionId, stepsTarget);
      if (!cancelled) {
        setSensorStatus(res.ok ? null : formatMissionFailure(res.reason));
        if (res.ok && typeof res.count === 'number' && res.count > 0) {
          handleSensorCount(currentMissionId, res.count);
        }
      }
    };
    void startSensor();

    return () => {
      cancelled = true;
      unsubscribe();
      void stopNativeSensorMission(sensorSessionId);
    };
  }, [currentMissionId, difficulty, sensorRetryNonce, sensorSessionId, shakeTarget, stepIndex, stepsTarget]);

  const handleMathVerify = () => {
    if (validateMathAnswer(mathInput, mathProblem)) {
      setStatusError(null);
      advanceMission(mathProblem.q);
    } else {
      setMathInput('');
      recordFailure('Incorrect answer', () => {
        setMathProblem(generateMathProblem(difficulty));
      });
    }
  };

  const handleMemoryTap = (idx: number) => {
    if (memPhase !== 'input') return;
    const next = [...memUserInput, idx];
    const pos = next.length - 1;
    if (memSeq[pos] !== idx) {
      setMemUserInput([]);
      recordFailure('Wrong tile order', () => {
        setMemReplayNonce((n) => n + 1);
      });
      return;
    }
    setMemUserInput(next);
    if (next.length === memSeq.length) {
      setMemPhase('success');
      setTimeout(() => advanceMission(`${memSeq.length} tiles`), 350);
    }
  };

  const handleTypingVerify = () => {
    if (validateTypingSentence(typedText, targetSentence)) {
      setStatusError(null);
      advanceMission('Exact sentence match');
    } else {
      recordFailure('Text does not match the sentence exactly');
    }
  };

  const handleQrScan = async () => {
    if (qrBusy) return;
    if (!registeredQrCode) {
      setStatusError('No QR/Barcode was registered for this alarm before ringing.');
      return;
    }
    setQrBusy(true);
    setStatusError(null);
    try {
      const res = await captureNativeBarcode();
      if (!res.ok) {
        setStatusError(formatMissionFailure(res.reason));
        return;
      }
      setLastScannedCode(res.code);
      if (validateQrCodeMatch(res.code, registeredQrCode)) {
        advanceMission(`Matched ${res.format}`);
      } else {
        recordFailure(`Scanned "${res.code}" does not match registered code`);
      }
    } finally {
      setQrBusy(false);
    }
  };

  const handlePhotoCaptureVerify = async () => {
    if (photoBusy) return;
    if (!referencePhotoUri) {
      setStatusError('No reference photo registered for this alarm.');
      return;
    }
    setPhotoBusy(true);
    setStatusError(null);
    try {
      const res = await verifyNativePhotoAgainstReference(alarm.id, photoThreshold);
      if (!res.ok) {
        setStatusError(formatMissionFailure(res.reason));
        return;
      }
      setLastPhotoSimilarity(res.similarity);
      if (res.matched) {
        advanceMission(`${res.similarity}% similarity`);
      } else {
        recordFailure(`Photo similarity ${res.similarity}% is below required ${res.threshold}%`);
      }
    } finally {
      setPhotoBusy(false);
    }
  };

  const missionMeta = MISSION_META[currentMissionId] || MISSION_META.math;
  const MissionIcon = missionMeta.icon;
  const modeLabel = mode === 'snooze' ? 'Snooze Verification' : 'Dismiss Alarm';

  return (
    <LinearGradient colors={[...activeThemeColors]} style={styles.fullScreen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View>
          <View style={styles.rowBetween}>
            <View style={styles.glassPill}>
              <MissionIcon size={15} color="#FFFFFF" />
              <Text style={styles.glassPillText}>
                {missionMeta.name} · {stepIndex + 1}/{totalSteps}
              </Text>
            </View>
            <View style={[styles.glassPill, { backgroundColor: 'rgba(0,0,0,0.32)' }]}>
              <Text style={styles.glassPillText}>
                {difficulty}
                {timeoutSeconds > 0 ? ` · ${secondsLeft}s` : ''}
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'center', marginTop: 18, marginBottom: 18 }}>
            <Text style={styles.missionSubheading}>
              HEAVY SLEEPER MODE · {modeLabel.toUpperCase()}
            </Text>
            <Text style={styles.missionHeading}>{alarm.title}</Text>
            {retryLimit > 0 && (
              <Text style={styles.retryCaption}>
                Retries used: {session.retriesUsed}/{retryLimit}
              </Text>
            )}
          </View>

          <View style={styles.missionCard}>
            {currentMissionId === 'math' && (
              <View style={{ gap: 14 }}>
                <View style={styles.mathBox}>
                  <Text style={styles.whiteMuted12}>Solve to continue</Text>
                  <Text style={styles.mathQuestion}>{mathProblem.q} = ?</Text>
                </View>
                <TextInput
                  keyboardType="number-pad"
                  value={mathInput}
                  onChangeText={setMathInput}
                  placeholder="Enter answer..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  style={[styles.mathInput, statusError ? { borderColor: '#FB7185' } : null]}
                  onSubmitEditing={handleMathVerify}
                />
                <Pressable onPress={handleMathVerify} style={styles.tealPrimaryBtn} testID="mission-math-verify">
                  <Text style={styles.tealPrimaryBtnText}>Verify Answer</Text>
                </Pressable>
              </View>
            )}

            {currentMissionId === 'memory' && (
              <View style={{ gap: 16, alignItems: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                  {memPhase === 'showing'
                    ? 'Watch the glowing tiles carefully...'
                    : memPhase === 'success'
                      ? 'Sequence Matched!'
                      : `Tap ${memSeq.length - memUserInput.length} remaining tile(s) in order`}
                </Text>
                <View style={styles.memoryGrid}>
                  {Array.from({ length: 9 }).map((_, idx) => {
                    const isGlowing = memHighlight === idx;
                    const isSelected = memUserInput.includes(idx);
                    return (
                      <Pressable
                        key={idx}
                        onPress={() => handleMemoryTap(idx)}
                        style={[
                          styles.memoryTile,
                          isGlowing && { backgroundColor: '#2DD4BF', borderColor: '#FFFFFF' },
                          isSelected && !isGlowing && { backgroundColor: 'rgba(20,184,166,0.5)', borderColor: '#5EEAD4' },
                        ]}
                      />
                    );
                  })}
                </View>
                {memPhase === 'input' && (
                  <Pressable onPress={() => setMemReplayNonce((n) => n + 1)} style={[styles.glassBtn, { width: '100%' }]}>
                    <Text style={styles.glassBtnText}>Replay Sequence</Text>
                  </Pressable>
                )}
              </View>
            )}

            {currentMissionId === 'shake' && (
              <View style={{ alignItems: 'center', gap: 14 }}>
                <View style={styles.circleCounter}>
                  <Smartphone size={28} color="#5EEAD4" />
                  <Text style={styles.circleCounterText}>
                    {shakes}/{shakeTarget}
                  </Text>
                </View>
                <View style={styles.progressTrackWhite}>
                  <View
                    style={[
                      styles.progressFillTeal,
                      { width: `${Math.min(100, (shakes / shakeTarget) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.whiteMuted12}>
                  Shake your phone firmly until the target is reached.
                </Text>
                {sensorStatus && (
                  <>
                    <Text style={styles.errorText}>{sensorStatus}</Text>
                    <Pressable onPress={() => setSensorRetryNonce((n) => n + 1)} style={[styles.glassBtn, { width: '100%' }]}>
                      <Text style={styles.glassBtnText}>Retry Accelerometer</Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}

            {currentMissionId === 'typing' && (
              <View style={{ gap: 14 }}>
                <View style={styles.mathBox}>
                  <Text style={{ color: '#FFFFFF', fontSize: 14, lineHeight: 21, fontWeight: '600' }}>
                    {targetSentence}
                  </Text>
                </View>
                <TextInput
                  multiline
                  numberOfLines={3}
                  value={typedText}
                  onChangeText={setTypedText}
                  placeholder="Type the exact sentence above..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  style={styles.typingInput}
                  autoCorrect={false}
                />
                <Pressable onPress={handleTypingVerify} style={styles.tealPrimaryBtn} testID="mission-typing-verify">
                  <Text style={styles.tealPrimaryBtnText}>Verify Sentence</Text>
                </Pressable>
              </View>
            )}

            {currentMissionId === 'qr' && (
              <View style={{ alignItems: 'center', gap: 14 }}>
                <View style={styles.qrFrame}>
                  <QrCode size={64} color="rgba(255,255,255,0.55)" />
                  <Text style={{ color: '#99F6E4', fontSize: 12, fontWeight: '600', marginTop: 10, textAlign: 'center', paddingHorizontal: 10 }}>
                    {registeredQrCode
                      ? `Registered Code: ${registeredQrCode}`
                      : 'No QR/Barcode registered'}
                  </Text>
                  {lastScannedCode && (
                    <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 4 }}>
                      Last scan: {lastScannedCode}
                    </Text>
                  )}
                </View>
                <Pressable onPress={() => void handleQrScan()} style={[styles.tealPrimaryBtn, { width: '100%' }]} testID="mission-qr-scan">
                  <Text style={styles.tealPrimaryBtnText}>
                    {qrBusy ? 'Opening Camera...' : 'Scan Registered QR / Barcode'}
                  </Text>
                </Pressable>
              </View>
            )}

            {currentMissionId === 'photo' && (
              <View style={{ gap: 14 }}>
                <View style={[styles.rowBetween, styles.mathBox, { paddingHorizontal: 14 }]}>
                  <View>
                    <Text style={styles.whiteMuted12}>Reference Photo</Text>
                    <Text style={{ color: referencePhotoUri ? '#99F6E4' : '#FCA5A5', fontSize: 13, fontWeight: '800' }}>
                      {referencePhotoUri ? 'Registered' : 'No reference photo registered'}
                    </Text>
                  </View>
                  <View style={[styles.glassPill, { backgroundColor: 'rgba(20,184,166,0.3)' }]}>
                    <Text style={{ color: '#99F6E4', fontSize: 11, fontWeight: '700' }}>
                      {lastPhotoSimilarity !== null ? `${lastPhotoSimilarity}% Match` : `Required ≥ ${photoThreshold}%`}
                    </Text>
                  </View>
                </View>
                <View style={styles.photoFrame}>
                  <Camera size={36} color="#5EEAD4" />
                  <Text style={styles.whiteMuted12}>
                    {photoBusy ? 'Comparing captured photo...' : 'Capture the same scene to verify'}
                  </Text>
                </View>
                <Pressable onPress={() => void handlePhotoCaptureVerify()} style={styles.tealPrimaryBtn} testID="mission-photo-verify">
                  <Text style={styles.tealPrimaryBtnText}>
                    {photoBusy ? 'Analyzing Photo...' : 'Capture & Compare Photo'}
                  </Text>
                </Pressable>
              </View>
            )}

            {currentMissionId === 'steps' && (
              <View style={{ alignItems: 'center', gap: 14 }}>
                <View style={styles.circleCounter}>
                  <Footprints size={28} color="#5EEAD4" />
                  <Text style={styles.circleCounterText}>
                    {walkedSteps}/{stepsTarget}
                  </Text>
                </View>
                <View style={styles.progressTrackWhite}>
                  <View
                    style={[
                      styles.progressFillTeal,
                      { width: `${Math.min(100, (walkedSteps / stepsTarget) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.whiteMuted12}>
                  Walk with your device to record real steps.
                </Text>
                {sensorStatus && (
                  <>
                    <Text style={styles.errorText}>{sensorStatus}</Text>
                    <Pressable onPress={() => setSensorRetryNonce((n) => n + 1)} style={[styles.glassBtn, { width: '100%' }]}>
                      <Text style={styles.glassBtnText}>Retry Step Sensor</Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}

            {!!statusError && (
              <Text style={[styles.errorText, { marginTop: 12 }]}>{statusError}</Text>
            )}
          </View>
        </View>

        <View style={{ marginTop: 16, gap: 10, alignItems: 'center' }}>
          {alarm.snoozeEnabled && !alarm.antiSnooze && !(alarm.maxSnooze && alarm.maxSnooze > 0 && (alarm.snoozeCount || 0) >= alarm.maxSnooze) && mode === 'dismiss' && (
            alarm.missionBeforeSnooze ? (
              onSwitchToSnoozeMode && (
                <Pressable onPress={onSwitchToSnoozeMode} style={[styles.glassBtn, { width: '100%' }]}>
                  <Text style={styles.glassBtnText}>
                    Complete Mission to Snooze ({alarm.snoozeDuration}m)
                  </Text>
                </Pressable>
              )
            ) : (
              onSnoozeDirect && (
                <Pressable onPress={onSnoozeDirect} style={[styles.glassBtn, { width: '100%' }]}>
                  <Text style={styles.glassBtnText}>Snooze ({alarm.snoozeDuration}m)</Text>
                </Pressable>
              )
            )
          )}

          {!showEmergency ? (
            <Pressable onPress={() => setShowEmergency(true)} style={{ padding: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 12, textDecorationLine: 'underline' }}>
                Need accessibility or emergency exit?
              </Text>
            </Pressable>
          ) : (
            <View style={styles.emergencyBox}>
              <Text style={{ color: '#FFFFFF', fontSize: 12, textAlign: 'center', marginBottom: 10 }}>
                Accessibility fallback lets you safely dismiss this alarm if a sensor or camera is unavailable.
              </Text>
              <View style={styles.rowGap10}>
                <Pressable onPress={() => setShowEmergency(false)} style={[styles.glassBtn, { flex: 1, paddingVertical: 10 }]}>
                  <Text style={styles.glassBtnText}>Keep Mission</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void stopNativeSensorMission(sensorSessionId);
                    void saveActiveMissionSession(null);
                    onEmergencyExit();
                  }}
                  style={[styles.tealPrimaryBtn, { flex: 1, paddingVertical: 10, backgroundColor: '#F43F5E' }]}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Emergency Dismiss</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'space-between', padding: 20 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowGap10: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  glassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  glassPillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  missionSubheading: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  missionHeading: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 4, textAlign: 'center' },
  retryCaption: { color: '#FDE68A', fontSize: 11, fontWeight: '700', marginTop: 4 },
  missionCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
  },
  mathBox: {
    backgroundColor: 'rgba(0,0,0,0.24)',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  mathQuestion: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', marginTop: 4 },
  mathInput: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  tealPrimaryBtn: {
    backgroundColor: '#14B8A6',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tealPrimaryBtnText: { color: '#020617', fontSize: 15, fontWeight: '800' },
  glassBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  whiteMuted12: { color: 'rgba(255,255,255,0.78)', fontSize: 12, textAlign: 'center' },
  errorText: { color: '#FDA4AF', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  memoryGrid: { width: 228, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  memoryTile: {
    width: 68,
    height: 68,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  circleCounter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 2,
    borderColor: '#2DD4BF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCounterText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', marginTop: 2 },
  progressTrackWhite: {
    width: '100%',
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  progressFillTeal: { height: '100%', backgroundColor: '#2DD4BF', borderRadius: 999 },
  typingInput: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 84,
    textAlignVertical: 'top',
  },
  qrFrame: {
    width: 220,
    height: 190,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.48)',
    borderWidth: 2,
    borderColor: '#2DD4BF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFrame: {
    height: 150,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emergencyBox: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.48)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
  },
});
