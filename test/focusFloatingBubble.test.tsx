import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';

let mockPanCallbacks: {
  onStart?: () => void;
  onUpdate?: (event: { translationX: number; translationY: number }) => void;
  onEnd?: () => void;
  onFinalize?: () => void;
} = {};

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-reanimated', () => {
  const ReactActual = require('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (init: number | boolean) => ReactActual.useRef({ value: init }).current,
    useAnimatedStyle: (fn: () => Record<string, unknown>) => fn(),
    withSpring: (val: number) => val,
    withTiming: (val: number) => val,
    interpolate: (val: number, input: number[], output: number[]) =>
      val === input[1] ? output[1] : output[0],
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

jest.mock('react-native-gesture-handler', () => {
  const chain: Record<string, (cb?: (...args: never[]) => void) => unknown> = {
    minDistance: () => chain,
    onStart: (cb) => {
      mockPanCallbacks.onStart = cb;
      return chain;
    },
    onUpdate: (cb) => {
      mockPanCallbacks.onUpdate = cb;
      return chain;
    },
    onEnd: (cb) => {
      mockPanCallbacks.onEnd = cb;
      return chain;
    },
    onFinalize: (cb) => {
      mockPanCallbacks.onFinalize = cb;
      return chain;
    },
  };
  return {
    Gesture: { Pan: () => chain },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  };
});

const mockBubbleStore = {
  state: {
    storageReady: true,
    user: { id: 'bubble-user-1', name: 'Aspirant' },
    settings: { focusDurationMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 },
    plannerTaskStudySeconds: {},
    plannerScheduleCompletions: {},
  },
  dispatch: jest.fn(),
};

jest.mock('../lib/store', () => ({
  getUserScopedStorageKey: (base: string, userId?: string | null) => `${base}:user:${userId ?? 'anon'}`,
  useStore: () => mockBubbleStore,
}));

jest.mock('../lib/theme', () => ({
  shadow: () => ({}),
  useTheme: () => ({
    scheme: 'dark',
    reduceMotion: false,
    colors: {
      teal: '#4FB0A8',
      warning: '#E09F3E',
      textMuted: '#94A3B8',
      text: '#F1F5F9',
      surfaceAlt: '#1E293B',
      border: '#334155',
      blue: '#6B9CE8',
    },
  }),
}));

import { ActiveSessionBar } from '../components/ActiveSessionBar';
import {
  BUBBLE_POSITION_STORAGE_KEY,
  BUBBLE_SIZE,
  clampBubblePosition,
  getAnchoredExpandedPosition,
  getBubbleBounds,
  loadBubblePosition,
  saveBubblePosition,
} from '../lib/focusBubblePosition';
import { FocusSessionProvider, useFocusSession } from '../lib/focusSession';

const SAFE_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

function BubbleHarness({ onBackToFocus = jest.fn() }: { onBackToFocus?: () => void }) {
  const focus = useFocusSession();
  const [route, setRoute] = React.useState<'DashboardRoot' | 'Library' | 'FocusCenter'>('DashboardRoot');

  return (
    <SafeAreaProvider initialMetrics={SAFE_METRICS}>
      <Text testID="session-phase">{focus.session?.phase ?? 'none'}</Text>
      <Text testID="session-id">{focus.session?.id ?? 'none'}</Text>
      <Pressable
        testID="start-session"
        onPress={() =>
          focus.startSession({
            mode: 'timer',
            durationMinutes: 25,
            selection: 'manual',
            tag: 'Economy',
            task: null,
          })
        }
      />
      <Pressable
        testID="end-session"
        onPress={() => {
          if (focus.session) void focus.discardSession(focus.session);
        }}
      />
      <Pressable testID="go-library" onPress={() => setRoute('Library')} />
      <Pressable testID="go-focus" onPress={() => setRoute('FocusCenter')} />
      <ActiveSessionBar
        visible={true}
        currentRouteName={route}
        onPressBackToFocus={() => {
          onBackToFocus();
          setRoute('FocusCenter');
        }}
      />
    </SafeAreaProvider>
  );
}

describe('Smart Draggable Floating Focus Bubble', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockPanCallbacks = {};
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('starts collapsed when focus begins, expands on tap, auto-collapses after 3s without restarting on clock ticks, and disappears when focus ends', async () => {
    const view = render(
      <FocusSessionProvider>
        <BubbleHarness />
      </FocusSessionProvider>,
    );
    await act(async () => { await Promise.resolve(); });

    // No session -> bubble hidden
    expect(view.queryByTestId('active-session-bar')).toBeNull();

    // Start session -> collapsed bubble appears with status dot, no timer text or buttons
    fireEvent.press(view.getByTestId('start-session'));
    expect(view.getByTestId('active-session-bar')).toBeTruthy();
    expect(view.getByTestId('focus-bubble-collapsed')).toBeTruthy();
    expect(view.getByTestId('focus-bubble-status-dot')).toBeTruthy();
    expect(view.queryByTestId('focus-bubble-expanded')).toBeNull();
    expect(view.queryByLabelText('Back to Focus')).toBeNull();
    expect(view.queryByText('25:00')).toBeNull();

    // Tap expands bubble
    fireEvent.press(view.getByTestId('focus-bubble-collapsed'));
    expect(view.getByTestId('focus-bubble-expanded')).toBeTruthy();
    expect(view.getByText('25:00')).toBeTruthy();
    expect(view.getByLabelText('Pause active focus session')).toBeTruthy();
    expect(view.getByLabelText('Back to Focus')).toBeTruthy();

    // Advance 2 seconds (clock ticks 25:00 -> 24:58): still expanded!
    act(() => jest.advanceTimersByTime(2000));
    expect(view.getByTestId('focus-bubble-expanded')).toBeTruthy();
    expect(view.getByText('24:58')).toBeTruthy();

    // Advance remaining 1 second (total 3s): auto-collapses!
    act(() => jest.advanceTimersByTime(1000));
    expect(view.queryByTestId('focus-bubble-expanded')).toBeNull();
    expect(view.getByTestId('focus-bubble-collapsed')).toBeTruthy();

    // Timer continues accurately while collapsed (2s + 1s + 5s = 8s elapsed -> 24:52); tapping again shows updated time
    act(() => jest.advanceTimersByTime(5000));
    fireEvent.press(view.getByTestId('focus-bubble-collapsed'));
    expect(view.getByText('24:52')).toBeTruthy();

    // Manual collapse works
    fireEvent.press(view.getByLabelText('Collapse focus timer bubble'));
    expect(view.queryByTestId('focus-bubble-expanded')).toBeNull();
    expect(view.getByTestId('focus-bubble-collapsed')).toBeTruthy();

    // Ending session removes bubble
    jest.useRealTimers();
    await act(async () => {
      fireEvent.press(view.getByTestId('end-session'));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(view.queryByTestId('active-session-bar')).toBeNull();
    });
    view.unmount();
  });

  it('pauses and resumes the real focus session and navigates Back to Focus without creating duplicates', async () => {
    const onBackToFocus = jest.fn();
    const view = render(
      <FocusSessionProvider>
        <BubbleHarness onBackToFocus={onBackToFocus} />
      </FocusSessionProvider>,
    );
    await act(async () => { await Promise.resolve(); });

    fireEvent.press(view.getByTestId('start-session'));
    const sessionId = view.getByTestId('session-id').props.children;
    fireEvent.press(view.getByTestId('focus-bubble-collapsed'));

    // Pause real session
    fireEvent.press(view.getByLabelText('Pause active focus session'));
    expect(view.getByTestId('session-phase').props.children).toBe('paused');
    expect(view.getByLabelText('Resume active focus session')).toBeTruthy();

    // Resume real session
    fireEvent.press(view.getByLabelText('Resume active focus session'));
    expect(view.getByTestId('session-phase').props.children).toBe('focus');

    // Back to Focus navigates and hides bubble on FocusCenter while keeping same session
    fireEvent.press(view.getByLabelText('Back to Focus'));
    expect(onBackToFocus).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('session-id').props.children).toBe(sessionId);
    expect(view.queryByTestId('active-session-bar')).toBeNull();
    view.unmount();
  });

  it('cancels auto-collapse during drag, persists exact released position, and clamps within safe-area bounds', async () => {
    const view = render(
      <FocusSessionProvider>
        <BubbleHarness />
      </FocusSessionProvider>,
    );
    await act(async () => { await Promise.resolve(); });

    fireEvent.press(view.getByTestId('start-session'));
    fireEvent.press(view.getByTestId('focus-bubble-collapsed'));

    // Start drag: cancels 3s auto-collapse
    act(() => {
      mockPanCallbacks.onStart?.();
      mockPanCallbacks.onUpdate?.({ translationX: -120, translationY: -200 });
    });

    // Advancing 3.5s while dragging does NOT collapse
    act(() => jest.advanceTimersByTime(3500));
    expect(view.getByTestId('focus-bubble-expanded')).toBeTruthy();

    // End drag: persists position & finalize reschedules 3s auto-collapse
    await act(async () => {
      mockPanCallbacks.onEnd?.();
      mockPanCallbacks.onFinalize?.();
      await Promise.resolve();
    });
    const persisted = await AsyncStorage.getItem(BUBBLE_POSITION_STORAGE_KEY);
    expect(persisted).toBeTruthy();

    act(() => jest.advanceTimersByTime(3000));
    expect(view.getByTestId('focus-bubble-collapsed')).toBeTruthy();
    view.unmount();
  });

  it('persists/restores bubble position and clamps coordinates inside safe areas', async () => {
    await saveBubblePosition({ x: 42, y: 180 });
    const restored = await loadBubblePosition();
    expect(restored).toEqual({ x: 42, y: 180 });

    const bounds = getBubbleBounds(390, 844, SAFE_METRICS.insets, BUBBLE_SIZE, BUBBLE_SIZE);
    expect(clampBubblePosition({ x: -50, y: 0 }, bounds)).toEqual({
      x: bounds.minX,
      y: bounds.minY,
    });
    expect(clampBubblePosition({ x: 999, y: 999 }, bounds)).toEqual({
      x: bounds.maxX,
      y: bounds.maxY,
    });

    // Anchored expansion stays within viewport bounds on both left and right sides
    const rightAnchored = getAnchoredExpandedPosition({ x: bounds.maxX, y: 300 }, 336, 390, 844, SAFE_METRICS.insets);
    expect(rightAnchored.x + 336).toBeLessThanOrEqual(390 - 12);
    expect(rightAnchored.x).toBeGreaterThanOrEqual(12);
  });
});
