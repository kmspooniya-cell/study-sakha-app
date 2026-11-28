import AsyncStorage from '@react-native-async-storage/async-storage';

export type MissionId = 'math' | 'memory' | 'shake' | 'typing' | 'qr' | 'photo' | 'steps';
export type MissionDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert';

export const MISSION_STATE_STORAGE_KEY = '@study_sakha_alarm_mission_state_v1';
export const MISSION_RESULTS_STORAGE_KEY = '@study_sakha_alarm_mission_results_v1';

export interface PerMissionSettings {
  shakeTarget: number;
  stepsTarget: number;
  photoSimilarityThreshold: number;
  registeredQrCode: string;
  registeredQrFormat?: string;
  referencePhotoUri?: string;
}

export interface MissionConfig {
  missions: MissionId[];
  missionDifficulty: MissionDifficulty;
  missionCount: number;
  randomMission: boolean;
  allowDuplicateMissions: boolean;
  missionBeforeSnooze: boolean;
  missionRetryLimit: number; // 0 = unlimited
  missionTimeoutSeconds: number; // 0 = no timeout
  perMission: PerMissionSettings;
}

export interface MathProblem {
  q: string;
  ans: number;
}

export interface MissionStepResult {
  missionId: MissionId;
  passed: boolean;
  attempts: number;
  durationMs: number;
  detail?: string;
}

export interface ActiveMissionSession {
  sessionId: string;
  alarmId: string;
  mode: 'dismiss' | 'snooze';
  queue: MissionId[];
  currentIndex: number;
  retriesUsed: number;
  retryLimit: number;
  timeoutSeconds: number;
  startedAtMs: number;
  stepStartedAtMs: number;
  results: MissionStepResult[];
  sensorProgress?: {
    stepIndex: number;
    missionId: 'shake' | 'steps';
    count: number;
  };
}

export interface CompletedMissionSessionRecord {
  sessionId: string;
  alarmId: string;
  mode: 'dismiss' | 'snooze';
  completedAt: string;
  passed: boolean;
  results: MissionStepResult[];
}

export const TYPING_SENTENCES: Record<MissionDifficulty, readonly string[]> = {
  Easy: [
    'Small steps every day lead to massive success.',
    'Wake up with determination and study with focus.',
    'One focused hour beats five distracted hours.',
  ],
  Medium: [
    'Consistency beats intensity in competitive exam preparation.',
    'Discipline today builds the rank and confidence of tomorrow.',
    'Every morning revision session compounds into mastery.',
  ],
  Hard: [
    'Precision in Prelims and clarity in Mains come from daily revision.',
    'Stay calm under pressure, trust your notes, and finish every mock test.',
    'True aspirants rise on schedule regardless of mood or weather.',
  ],
  Expert: [
    'Consistent active recall, timed PYQ practice, and honest error analysis win ranks.',
    'Champions do not negotiate with the snooze button when their target is clear.',
    'Focused execution at 06:00 AM sets the rhythm for the entire study day.',
  ],
};

export function clampShakeTarget(value: number): number {
  if (!Number.isFinite(value)) return 40;
  return Math.max(20, Math.min(100, Math.round(value)));
}

export function clampStepsTarget(value: number): number {
  if (!Number.isFinite(value)) return 25;
  return Math.max(10, Math.min(100, Math.round(value)));
}

export function clampPhotoThreshold(value: number): number {
  if (!Number.isFinite(value)) return 80;
  return Math.max(60, Math.min(95, Math.round(value)));
}

export function defaultShakeTargetForDifficulty(difficulty: MissionDifficulty): number {
  switch (difficulty) {
    case 'Easy': return 20;
    case 'Hard': return 60;
    case 'Expert': return 100;
    default: return 40;
  }
}

export function defaultStepsTargetForDifficulty(difficulty: MissionDifficulty): number {
  switch (difficulty) {
    case 'Easy': return 15;
    case 'Hard': return 40;
    case 'Expert': return 60;
    default: return 25;
  }
}

export function clampMissionCount(
  requestedCount: number,
  selectedMissions: readonly MissionId[],
  allowDuplicates: boolean
): number {
  const safeCount = Math.max(1, Math.round(requestedCount || 1));
  if (allowDuplicates || selectedMissions.length === 0) return safeCount;
  return Math.min(safeCount, selectedMissions.length);
}

export function buildMissionQueue(config: {
  missions: readonly MissionId[];
  missionCount: number;
  randomMission: boolean;
  allowDuplicateMissions: boolean;
}): MissionId[] {
  const pool: MissionId[] = config.missions.length > 0 ? [...config.missions] : ['math'];
  const effectiveCount = clampMissionCount(
    config.missionCount,
    pool,
    config.allowDuplicateMissions
  );

  const orderedPool = [...pool];
  if (config.randomMission) {
    for (let i = orderedPool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [orderedPool[i], orderedPool[j]] = [orderedPool[j], orderedPool[i]];
    }
  }

  const queue: MissionId[] = [];
  for (let i = 0; i < effectiveCount; i += 1) {
    if (i < orderedPool.length) {
      queue.push(orderedPool[i]);
    } else if (config.allowDuplicateMissions) {
      if (config.randomMission) {
        queue.push(pool[Math.floor(Math.random() * pool.length)]);
      } else {
        queue.push(orderedPool[i % orderedPool.length]);
      }
    }
  }
  return queue;
}

export function generateMathProblem(difficulty: MissionDifficulty): MathProblem {
  if (difficulty === 'Easy') {
    const a = 12 + Math.floor(Math.random() * 25);
    const b = 8 + Math.floor(Math.random() * 20);
    if (Math.random() < 0.5) return { q: `${a} + ${b}`, ans: a + b };
    const hi = Math.max(a, b) + 10;
    const lo = Math.min(a, b);
    return { q: `${hi} - ${lo}`, ans: hi - lo };
  }
  if (difficulty === 'Medium') {
    const a = 24 + Math.floor(Math.random() * 55);
    const b = 13 + Math.floor(Math.random() * 35);
    const c = 4 + Math.floor(Math.random() * 12);
    return Math.random() < 0.5
      ? { q: `${a} + ${b} - ${c}`, ans: a + b - c }
      : { q: `${c} × ${b} + ${a}`, ans: c * b + a };
  }
  if (difficulty === 'Hard') {
    const a = 12 + Math.floor(Math.random() * 18);
    const b = 11 + Math.floor(Math.random() * 16);
    const c = 15 + Math.floor(Math.random() * 30);
    return { q: `(${a} × ${b}) - ${c}`, ans: a * b - c };
  }
  const a = 15 + Math.floor(Math.random() * 20);
  const b = 14 + Math.floor(Math.random() * 19);
  const c = 25 + Math.floor(Math.random() * 45);
  return { q: `(${a} × ${b}) + ${c}`, ans: a * b + c };
}

export function validateMathAnswer(input: string, problem: MathProblem): boolean {
  const trimmed = input.trim();
  if (!/^-?\d+$/.test(trimmed)) return false;
  return Number.parseInt(trimmed, 10) === problem.ans;
}

export function getMemorySequenceConfig(difficulty: MissionDifficulty, stepIndex: number) {
  const baseLength = difficulty === 'Easy' ? 3 : difficulty === 'Hard' ? 5 : difficulty === 'Expert' ? 6 : 4;
  const length = Math.min(8, baseLength + Math.floor(stepIndex / 2));
  const intervalMs = difficulty === 'Easy' ? 760 : difficulty === 'Hard' ? 540 : difficulty === 'Expert' ? 460 : 640;
  return { length, intervalMs };
}

export function generateMemorySequence(length: number, gridSize = 9): number[] {
  const seq: number[] = [];
  for (let i = 0; i < length; i += 1) {
    seq.push(Math.floor(Math.random() * gridSize));
  }
  return seq;
}

export function getTypingSentence(difficulty: MissionDifficulty, stepIndex: number): string {
  const pool = TYPING_SENTENCES[difficulty] || TYPING_SENTENCES.Medium;
  return pool[stepIndex % pool.length];
}

export function validateTypingSentence(input: string, target: string): boolean {
  return input.trim() === target.trim();
}

export function validateQrCodeMatch(scannedCode: string, registeredCode: string): boolean {
  const scanned = scannedCode.trim();
  const registered = registeredCode.trim();
  return scanned.length > 0 && registered.length > 0 && scanned === registered;
}

export async function saveActiveMissionSession(session: ActiveMissionSession | null): Promise<void> {
  try {
    if (!session) {
      await AsyncStorage.removeItem(MISSION_STATE_STORAGE_KEY);
      return;
    }
    await AsyncStorage.setItem(MISSION_STATE_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Non-fatal persistence guard
  }
}

export async function loadActiveMissionSession(): Promise<ActiveMissionSession | null> {
  try {
    const raw = await AsyncStorage.getItem(MISSION_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ActiveMissionSession>;
    if (!parsed || typeof parsed.alarmId !== 'string' || !Array.isArray(parsed.queue) || parsed.queue.length === 0) {
      return null;
    }
    return {
      sessionId: typeof parsed.sessionId === 'string' ? parsed.sessionId : `ms-${Date.now()}`,
      alarmId: parsed.alarmId,
      mode: parsed.mode === 'snooze' ? 'snooze' : 'dismiss',
      queue: parsed.queue,
      currentIndex: typeof parsed.currentIndex === 'number' ? Math.max(0, Math.min(parsed.queue.length - 1, parsed.currentIndex)) : 0,
      retriesUsed: typeof parsed.retriesUsed === 'number' ? Math.max(0, parsed.retriesUsed) : 0,
      retryLimit: typeof parsed.retryLimit === 'number' ? Math.max(0, parsed.retryLimit) : 0,
      timeoutSeconds: typeof parsed.timeoutSeconds === 'number' ? Math.max(0, parsed.timeoutSeconds) : 0,
      startedAtMs: typeof parsed.startedAtMs === 'number' ? parsed.startedAtMs : Date.now(),
      stepStartedAtMs: typeof parsed.stepStartedAtMs === 'number' ? parsed.stepStartedAtMs : Date.now(),
      results: Array.isArray(parsed.results) ? parsed.results : [],
      sensorProgress:
        parsed.sensorProgress &&
        typeof parsed.sensorProgress.stepIndex === 'number' &&
        (parsed.sensorProgress.missionId === 'shake' || parsed.sensorProgress.missionId === 'steps') &&
        typeof parsed.sensorProgress.count === 'number'
          ? {
              stepIndex: parsed.sensorProgress.stepIndex,
              missionId: parsed.sensorProgress.missionId,
              count: Math.max(0, Math.round(parsed.sensorProgress.count)),
            }
          : undefined,
    };
  } catch {
    return null;
  }
}

export function formatMissionFailure(reason?: string): string {
  switch (reason) {
    case 'permission_denied':
      return 'Permission denied. Please allow access in Android settings and retry.';
    case 'sensor_unavailable':
      return 'Required hardware sensor is unavailable on this device.';
    case 'sensor_register_failed':
      return 'Could not register device sensor listener. Please retry.';
    case 'no_barcode_found':
      return 'No QR or barcode detected in the captured image. Try again with clearer focus.';
    case 'no_reference_photo':
      return 'No reference photo was registered for this alarm.';
    case 'cancelled':
      return 'Camera capture cancelled.';
    case 'camera_unavailable':
      return 'Camera app is unavailable on this device.';
    case 'camera_busy':
      return 'Camera is already open. Finish or cancel the active capture first.';
    case 'capture_decode_failed':
      return 'Could not read the captured photo. Please try again.';
    case 'reference_save_failed':
      return 'Failed to save reference photo on device storage.';
    case 'native_module_unavailable':
      return 'Native Android sensor/camera module is only available in an Android build.';
    default:
      return reason ? `Verification failed (${reason}).` : 'Verification failed. Try again.';
  }
}

export async function appendMissionSessionResult(record: CompletedMissionSessionRecord): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(MISSION_RESULTS_STORAGE_KEY);
    const existing = raw ? (JSON.parse(raw) as CompletedMissionSessionRecord[]) : [];
    const next = [record, ...(Array.isArray(existing) ? existing : [])].slice(0, 60);
    await AsyncStorage.setItem(MISSION_RESULTS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Non-fatal persistence guard
  }
}
