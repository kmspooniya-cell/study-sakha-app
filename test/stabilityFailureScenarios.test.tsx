import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockStorage = new Map<string, string>();
const mockGetItem = jest.fn(async (key: string) => mockStorage.get(key) ?? null);
const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
const mockRemoveChannel = jest.fn(async (_channel?: unknown) => 'ok');

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args: [string]) => mockGetItem(...args),
  setItem: jest.fn(async (key: string, value: string) => { mockStorage.set(key, value); }),
  removeItem: jest.fn(async (key: string) => { mockStorage.delete(key); }),
  getAllKeys: jest.fn(async () => [...mockStorage.keys()]),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  useNavigation: () => ({
    navigate: mockNavigate,
    push: jest.fn(),
    replace: jest.fn(),
    goBack: jest.fn(),
    getParent: () => null,
  }),
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  const createGesture = () => {
    const g: Record<string, unknown> = {};
    const chain = () => g;
    ['activeOffsetX', 'failOffsetY', 'onUpdate', 'onEnd', 'onStart', 'onBegin', 'onFinalize', 'enabled'].forEach((k) => {
      g[k] = chain;
    });
    return g;
  };
  return {
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children),
    GestureDetector: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children),
    Gesture: { Pan: createGesture, Tap: createGesture, LongPress: createGesture, Simultaneous: createGesture },
  };
});

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: { View, Text },
    useSharedValue: (v: unknown) => ({ value: v }),
    useAnimatedStyle: (fn: () => unknown) => (typeof fn === 'function' ? fn() : {}),
    withSpring: (v: unknown) => v,
    withTiming: (v: unknown) => v,
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const Icon = ({ name }: { name: string }) => React.createElement(Text, null, name);
  Icon.glyphMap = {};
  return { __esModule: true, default: Icon };
});

jest.mock('../components/Shell', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Shell: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children),
    useLayout: () => ({ isMobile: true, isDesktop: false, width: 390 }),
  };
});

let mockStoreValue = {
  state: {
    user: { id: 'user-1', name: 'Aspirant', exam: 'upsc', targetYear: 2026, role: 'student' },
    notes: [{ id: 'n-corrupt', title: 'Polity Note', body: 'Articles', folder: 'Revision', tags: undefined }],
    progress: {},
    starred: [],
    bookmarks: [],
    managedContent: [],
    notifications: [
      { id: 'notif-unknown', kind: 'unexpected_kind', title: 'Update', body: 'Details', at: Date.now(), read: false },
    ],
    announcements: [],
  },
  unread: 1,
  dispatch: mockDispatch,
};

jest.mock('../lib/store', () => ({
  useStore: () => mockStoreValue,
  getUserScopedStorageKey: (baseKey: string, userId?: string | null) =>
    `${baseKey}:user:${encodeURIComponent(userId?.trim() || '__local__')}`,
}));

jest.mock('../lib/supabase', () => ({
  STUDENT_CONTENT_BUCKET: 'Student-content',
  supabaseConfigured: true,
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    channel: jest.fn(),
    removeChannel: (channel: unknown) => mockRemoveChannel(channel),
  },
}));

const { readFocusLockSnapshot } = require('../lib/focusLockSnapshot') as typeof import('../lib/focusLockSnapshot');
const { isFocusLockNativeAvailable, subscribeFocusLockEvent } = require('../lib/focusLockNative') as typeof import('../lib/focusLockNative');
const { AccountSyncEngine } = require('../lib/sync/syncEngine') as typeof import('../lib/sync/syncEngine');
const NotificationsScreen = require('../screens/NotificationsScreen').default as typeof import('../screens/NotificationsScreen').default;
const CurrentAffairsScreen = require('../screens/CurrentAffairsScreen').default as typeof import('../screens/CurrentAffairsScreen').default;
const SearchScreen = require('../screens/SearchScreen').default as typeof import('../screens/SearchScreen').default;

function requestLocalServer(
  port: number,
  requestPath: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: requestPath,
      method: options.method ?? 'GET',
      headers: options.headers,
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

describe('stability and failure scenario regressions', () => {
  let server: http.Server;
  let serverPort = 0;

  beforeAll(async () => {
    const { app } = require('../server.js') as { app: http.RequestListener };
    await new Promise<void>((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        serverPort = typeof address === 'object' && address ? address.port : 0;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
    mockGetItem.mockImplementation(async (key: string) => mockStorage.get(key) ?? null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('Express audio Range, stream error, and API error handling', () => {
    it('handles valid suffix ranges and rejects malformed or out-of-bounds Range headers with 416', async () => {
      const suffix = await requestLocalServer(serverPort, '/api/audio/deep_positive_energy.mp3', {
        headers: { Range: 'bytes=-128' },
      });
      expect(suffix.status).toBe(206);
      expect(suffix.body.length).toBe(128);
      expect(suffix.headers['content-range']).toMatch(/^bytes \d+-\d+\/\d+$/);

      const invalidRanges = ['bytes=500-100', 'bytes=abc-def', 'bytes=-0', 'bytes=99999999999999999999-', 'bytes=0-10, 20-30'];
      for (const range of invalidRanges) {
        const response = await requestLocalServer(serverPort, '/api/audio/deep_positive_energy.mp3', {
          headers: { Range: range },
        });
        expect(response.status).toBe(416);
      }
    });

    it('returns JSON errors for unknown /api routes and malformed JSON payloads', async () => {
      const notFound = await requestLocalServer(serverPort, '/api/nonexistent-endpoint');
      expect(notFound.status).toBe(404);
      expect(JSON.parse(notFound.body.toString('utf8'))).toEqual({ error: 'API endpoint not found.' });

      const malformed = await requestLocalServer(serverPort, '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid-json',
      });
      expect(malformed.status).toBe(400);
      expect(JSON.parse(malformed.body.toString('utf8'))).toEqual({ error: 'Invalid request payload.' });
    });

    it('survives audio file deletion during catalog stat or streaming without crashing', async () => {
      const origStatSync = fs.statSync;
      jest.spyOn(fs, 'statSync').mockImplementation((target, ...rest) => {
        if (String(target).endsWith('deep_positive_energy.mp3')) {
          throw new Error('ENOENT: deleted');
        }
        return origStatSync(target, ...(rest as []));
      });

      const catalog = await requestLocalServer(serverPort, '/api/audio-catalog');
      expect(catalog.status).toBe(200);
      expect(JSON.parse(catalog.body.toString('utf8'))).toHaveLength(2);

      const deletedStat = await requestLocalServer(serverPort, '/api/audio/deep_positive_energy.mp3');
      expect(deletedStat.status).toBe(404);
      jest.restoreAllMocks();

      const origCreateReadStream = fs.createReadStream;
      jest.spyOn(fs, 'createReadStream').mockImplementation((target, options) => {
        if (String(target).endsWith('deep_positive_energy.mp3')) {
          const fakeStream = new EventEmitter() as fs.ReadStream;
          fakeStream.pipe = (() => fakeStream) as never;
          setImmediate(() => fakeStream.emit('error', new Error('ENOENT pre-open')));
          return fakeStream;
        }
        return origCreateReadStream(target, options);
      });

      const streamFailure = await requestLocalServer(serverPort, '/api/audio/deep_positive_energy.mp3');
      expect(streamFailure.status).toBe(500);
      expect(JSON.parse(streamFailure.body.toString('utf8'))).toEqual({ error: 'Audio stream failed.' });

      const health = await requestLocalServer(serverPort, '/api/health');
      expect(health.status).toBe(200);
    });
  });

  describe('Offline/unconfigured Supabase and corrupted local persistence', () => {
    it('returns null safely when AsyncStorage throws or contains corrupted FocusLock JSON', async () => {
      mockStorage.set('study-sakha-focus-lock-v2:user:user-1', '{corrupt-json');
      await expect(readFocusLockSnapshot('user-1')).resolves.toBeNull();

      mockGetItem.mockRejectedValueOnce(new Error('SQLite disk read failed'));
      await expect(readFocusLockSnapshot('user-1')).resolves.toBeNull();
    });

    it('stops AccountSyncEngine cleanly even when removeChannel fails offline', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockRemoveChannel.mockRejectedValueOnce(new Error('network down'));
      const engine = new AccountSyncEngine();
      (engine as unknown as { channel: unknown; userId: string }).channel = { topic: 'test' };
      (engine as unknown as { userId: string }).userId = 'user-1';
      await expect(engine.stop()).resolves.toBeUndefined();
      expect(warnSpy).toHaveBeenCalled();
    });

    it('guards createStudentContentSignedUrl when Supabase is unconfigured', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.unmock('../lib/supabase');
        const prevUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const prevKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
        delete process.env.EXPO_PUBLIC_SUPABASE_URL;
        delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
        try {
          const mod = require('../lib/supabase') as typeof import('../lib/supabase');
          expect(mod.supabaseConfigured).toBe(false);
          await expect(mod.createStudentContentSignedUrl('notes/test.pdf')).rejects.toThrow('Supabase is not configured.');
        } finally {
          if (prevUrl !== undefined) process.env.EXPO_PUBLIC_SUPABASE_URL = prevUrl;
          if (prevKey !== undefined) process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = prevKey;
        }
      });
    });

    it('handles unavailable JS FocusLock native bridge gracefully', () => {
      expect(isFocusLockNativeAvailable()).toBe(false);
      const unsubscribe = subscribeFocusLockEvent('onSessionExpired', jest.fn());
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('Screen unmount timers and null-safety guards', () => {
    it('clears refresh timers on unmount and renders unknown notification kinds safely', () => {
      jest.useFakeTimers();
      const view = render(<NotificationsScreen />);
      expect(view.getByText('Update')).toBeTruthy();

      const flatList = view.UNSAFE_getByType(require('react-native').FlatList);
      act(() => {
        flatList.props.refreshControl.props.onRefresh();
      });
      view.unmount();
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    });

    it('cancels CurrentAffairs refresh timer on unmount so study minutes are not credited late', () => {
      jest.useFakeTimers();
      const view = render(<CurrentAffairsScreen />);
      const flatList = view.UNSAFE_getByType(require('react-native').FlatList);
      act(() => {
        flatList.props.refreshControl.props.onRefresh();
      });
      view.unmount();
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(mockDispatch).not.toHaveBeenCalledWith({ type: 'study', minutes: 3 });
    });

    it('searches notes and content without crashing when optional arrays like tags are undefined', () => {
      const view = render(<SearchScreen />);
      const input = view.getByPlaceholderText('Search everything in Study Sakha…');
      fireEvent.changeText(input, 'Polity');
      expect(view.getByText('Polity Note')).toBeTruthy();
    });
  });

  describe('Android native FocusLock template sync and safety invariants', () => {
    const repoRoot = path.resolve(__dirname, '..');
    const templateKotlinDir = path.join(repoRoot, 'native/focus-lock/android/java/com/anonymous/agonpreview');
    const generatedKotlinDir = path.join(repoRoot, 'android/app/src/main/java/com/anonymous/agonpreview');

    it('keeps native Kotlin and XML templates synchronized with android/ generated sources', () => {
      if (!fs.existsSync(generatedKotlinDir)) return;
      for (const fileName of fs.readdirSync(templateKotlinDir)) {
        const templateSource = fs.readFileSync(path.join(templateKotlinDir, fileName), 'utf8');
        const generatedSource = fs.readFileSync(path.join(generatedKotlinDir, fileName), 'utf8');
        expect(generatedSource).toBe(templateSource);
      }
      const templateXml = fs.readFileSync(path.join(repoRoot, 'native/focus-lock/android/res/xml/focus_lock_service.xml'), 'utf8');
      const generatedXml = fs.readFileSync(path.join(repoRoot, 'android/app/src/main/res/xml/focus_lock_service.xml'), 'utf8');
      expect(generatedXml).toBe(templateXml);
    });

    it('enforces bridge safety, lock synchronization, alarm deduplication, and boot validation in Kotlin sources', () => {
      const moduleKt = fs.readFileSync(path.join(templateKotlinDir, 'FocusLockModule.kt'), 'utf8');
      const alarmKt = fs.readFileSync(path.join(templateKotlinDir, 'FocusLockAlarm.kt'), 'utf8');
      const bootKt = fs.readFileSync(path.join(templateKotlinDir, 'FocusLockBootReceiver.kt'), 'utf8');
      const blockingKt = fs.readFileSync(path.join(templateKotlinDir, 'FocusLockBlockingActivity.kt'), 'utf8');

      expect(moduleKt).toContain('copyMap(session)');
      expect(moduleKt).toContain('override fun invalidate()');
      expect(moduleKt).toContain('reactContext.hasActiveReactInstance()');
      expect(moduleKt).toContain('synchronized(sessionLock)');
      expect(moduleKt).toContain('promise.resolve(remaining.toDouble())');
      expect(moduleKt).toContain('bitmap?.recycle()');

      expect(alarmKt).toContain('EXTRA_SESSION_ID');
      expect(alarmKt).toContain('if (status != "active") return@synchronized null');
      expect(alarmKt).toContain('if (expectedSessionId.isNotEmpty() && currentId != expectedSessionId)');

      expect(bootKt).toContain('status == "active" || status == "paused"');
      expect(bootKt).toContain('synchronized(FocusLockModule.sessionLock)');

      expect(blockingKt).toContain('override fun onResume()');
      expect(blockingKt).toContain('?.let { startActivity(it) }');
    });
  });
});
