import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => { mockStorage.set(key, value); }),
  removeItem: jest.fn(async (key: string) => { mockStorage.delete(key); }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const missions = require('../src/modules/alarm/alarmMissions') as typeof import('../src/modules/alarm/alarmMissions');

const ROOT = path.resolve(__dirname, '..');
function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('Heavy Sleeper Mode — Modular Mission Logic & Persistence', () => {
  beforeEach(() => mockStorage.clear());

  it('generates and validates math problems across all four difficulties', () => {
    for (const diff of ['Easy', 'Medium', 'Hard', 'Expert'] as const) {
      const p = missions.generateMathProblem(diff);
      expect(typeof p.q).toBe('string');
      expect(Number.isInteger(p.ans)).toBe(true);
      expect(missions.validateMathAnswer(String(p.ans), p)).toBe(true);
      expect(missions.validateMathAnswer(String(p.ans + 1), p)).toBe(false);
      expect(missions.validateMathAnswer('abc', p)).toBe(false);
    }
  });

  it('scales memory sequence length and speed progressively', () => {
    const easy0 = missions.getMemorySequenceConfig('Easy', 0);
    const expert4 = missions.getMemorySequenceConfig('Expert', 4);
    expect(expert4.length).toBeGreaterThan(easy0.length);
    expect(expert4.intervalMs).toBeLessThan(easy0.intervalMs);
    expect(missions.generateMemorySequence(expert4.length)).toHaveLength(expert4.length);
  });

  it('prevents missionCount from exceeding selected missions when duplicates are disabled', () => {
    expect(missions.clampMissionCount(5, ['math', 'qr'], false)).toBe(2);
    expect(missions.clampMissionCount(5, ['math', 'qr'], true)).toBe(5);
    const queue = missions.buildMissionQueue({
      missions: ['math', 'shake'],
      missionCount: 5,
      randomMission: false,
      allowDuplicateMissions: false,
    });
    expect(queue).toEqual(['math', 'shake']);
  });

  it('clamps per-mission targets and validates typing & QR strictly', () => {
    expect(missions.clampShakeTarget(10)).toBe(20);
    expect(missions.clampShakeTarget(150)).toBe(100);
    expect(missions.clampStepsTarget(5)).toBe(10);
    expect(missions.clampPhotoThreshold(40)).toBe(60);

    expect(missions.validateTypingSentence('Wake up now', 'Wake up now')).toBe(true);
    expect(missions.validateTypingSentence('wake up now', 'Wake up now')).toBe(false);
    expect(missions.validateQrCodeMatch('DESK-QR-1', 'DESK-QR-1')).toBe(true);
    expect(missions.validateQrCodeMatch('OTHER-QR', 'DESK-QR-1')).toBe(false);
    expect(missions.validateQrCodeMatch('', '')).toBe(false);
  });

  it('persists and restores active mission state and sensor progress across restarts', async () => {
    await missions.saveActiveMissionSession({
      sessionId: 'ms-1',
      alarmId: 'alm-1',
      mode: 'dismiss',
      queue: ['math', 'shake', 'qr'],
      currentIndex: 1,
      retriesUsed: 2,
      retryLimit: 5,
      timeoutSeconds: 120,
      startedAtMs: 1000,
      stepStartedAtMs: 2000,
      results: [{ missionId: 'math', passed: true, attempts: 1, durationMs: 1000 }],
      sensorProgress: { stepIndex: 1, missionId: 'shake', count: 18 },
    });
    const restored = await missions.loadActiveMissionSession();
    expect(restored?.alarmId).toBe('alm-1');
    expect(restored?.currentIndex).toBe(1);
    expect(restored?.retriesUsed).toBe(2);
    expect(restored?.queue).toEqual(['math', 'shake', 'qr']);
    expect(restored?.sensorProgress).toEqual({ stepIndex: 1, missionId: 'shake', count: 18 });

    await missions.saveActiveMissionSession(null);
    await expect(missions.loadActiveMissionSession()).resolves.toBeNull();
  });

  it('formats mission permission, sensor, and camera errors clearly', () => {
    expect(missions.formatMissionFailure('permission_denied')).toContain('Permission denied');
    expect(missions.formatMissionFailure('sensor_unavailable')).toContain('sensor is unavailable');
    expect(missions.formatMissionFailure('no_reference_photo')).toContain('No reference photo');
    expect(missions.formatMissionFailure('no_barcode_found')).toContain('No QR or barcode detected');
    expect(missions.formatMissionFailure('cancelled')).toContain('cancelled');
  });
});

describe('Heavy Sleeper Mode — Native Android & No-Simulation Contracts', () => {
  const missionView = readRepoFile('src/modules/alarm/HeavySleeperMissionView.tsx');
  const alarmModule = readRepoFile('src/modules/alarm/StudySakhaAlarmModule.tsx');
  const missionKt = readRepoFile('native/alarm/android/java/com/anonymous/agonpreview/AlarmMissionEngine.kt');
  const serviceKt = readRepoFile('native/alarm/android/java/com/anonymous/agonpreview/AlarmPlaybackService.kt');
  const pluginJs = readRepoFile('plugins/withAlarmEngine.js');

  it('removes all simulated mission buttons and fake timers from HeavySleeperMissionView', () => {
    expect(missionView).not.toContain('Auto-fill Prototype Demo Text');
    expect(missionView).not.toContain('Simulate QR Scan');
    expect(missionView).not.toContain('Simulate Walking');
    expect(missionView).not.toContain('Shake (+5)');
    expect(missionView).not.toContain('Power (+15)');
  });

  it('implements real Android sensors, camera, ZXing barcode, and photo similarity in Kotlin', () => {
    expect(missionKt).toContain('Sensor.TYPE_ACCELEROMETER');
    expect(missionKt).toContain('Sensor.TYPE_STEP_COUNTER');
    expect(missionKt).toContain('Sensor.TYPE_STEP_DETECTOR');
    expect(missionKt).toContain('Manifest.permission.ACTIVITY_RECOGNITION');
    expect(missionKt).toContain('Manifest.permission.CAMERA');
    expect(missionKt).toContain('MultiFormatReader');
    expect(missionKt).toContain('computeSignatureSimilarity');
    expect(missionKt).toContain('onStudySakhaMissionSensor');
  });

  it('enforces heavySleeper & missionBeforeSnooze on native notification actions and snooze reschedules', () => {
    const receiverKt = readRepoFile('native/alarm/android/java/com/anonymous/agonpreview/AlarmEngineReceiver.kt');
    const schedulerKt = readRepoFile('native/alarm/android/java/com/anonymous/agonpreview/AlarmEngineScheduler.kt');
    const moduleKt = readRepoFile('native/alarm/android/java/com/anonymous/agonpreview/AlarmEngineModule.kt');
    expect(serviceKt).toContain('if (!meta.heavySleeper)');
    expect(serviceKt).toContain('!(heavySleeper && missionBeforeSnooze)');
    expect(serviceKt).toContain('putExtra(AlarmEngineScheduler.EXTRA_HEAVY_SLEEPER, meta.heavySleeper)');
    expect(serviceKt).toContain('putExtra(AlarmEngineScheduler.EXTRA_MISSION_BEFORE_SNOOZE, meta.missionBeforeSnooze)');
    expect(receiverKt).toContain('isHeavySleeperAlarm(context, alarmId)');
    expect(receiverKt).toContain('heavySleeper = heavySleeper');
    expect(schedulerKt).toContain('heavySleeper: Boolean = false');
    expect(moduleKt).toContain('override fun invalidate()');
    expect(alarmModule).toContain('missionRestoredRef');
    expect(alarmModule).toContain('activeRingingIdRef');
    expect(alarmModule).toContain("setMissionRunnerMode(alarm.heavySleeper ? 'dismiss' : null)");
  });

  it('wires permissions, FileProvider, ZXing dependency, and AlarmMissionEngine.kt in CNG plugin', () => {
    expect(pluginJs).toContain('AlarmMissionEngine.kt');
    expect(pluginJs).toContain('android.permission.CAMERA');
    expect(pluginJs).toContain('android.permission.ACTIVITY_RECOGNITION');
    expect(pluginJs).toContain('com.google.zxing:core:3.5.3');
    expect(pluginJs).toContain('androidx.core.content.FileProvider');
  });

  it('prevents shake/step sensor restarts on re-renders and persists sensor session state', () => {
    expect(missionView).toContain('advanceMissionRef.current');
    expect(missionView).toContain('onCompleteRef.current');
    expect(missionView).not.toContain('}, [advanceMission,');
    expect(missionView).toContain('if (!referencePhotoUri)');

    expect(missionKt).toContain('study_sakha_alarm_mission_sensor_prefs');
    expect(missionKt).toContain('restorePersistedCount');
    expect(missionKt).toContain('restorePersistedStepState');
    expect(missionKt).toContain('SystemClock.elapsedRealtime()');
    expect(missionKt).toContain('SensorManager.SENSOR_DELAY_UI, 0');
    expect(missionKt).toContain('GlobalHistogramBinarizer');
    expect(missionKt).toContain('fun deleteReferencePhoto');
    expect(missionKt).toContain('fun hasReferencePhoto');
  });

  it('provides QR and Photo registration with Replace/Remove and coordinated session restore in Editor', () => {
    expect(alarmModule).toContain('alarm-editor-qr-scan');
    expect(alarmModule).toContain('alarm-editor-qr-remove');
    expect(alarmModule).toContain('alarm-editor-photo-capture');
    expect(alarmModule).toContain('alarm-editor-photo-preview');
    expect(alarmModule).toContain('alarm-editor-photo-remove');
    expect(alarmModule).toContain('deleteNativeReferencePhoto');
    expect(alarmModule).toContain('missionRestorePromiseRef');
  });
});
