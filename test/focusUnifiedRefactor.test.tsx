import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { classifySyncError, clearSyncLogCooldowns } from '../lib/groupSyncErrors';

jest.mock('react-native-reanimated', () => {
  const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: { View: RNView },
    useSharedValue: (init: number | boolean) => ({ value: init }),
    useAnimatedStyle: (fn: () => Record<string, unknown>) => fn(),
    withSpring: (val: number) => val,
    withTiming: (val: number) => val,
    interpolate: (_val: number, _input: number[], output: number[]) => output[0],
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

jest.mock('react-native-gesture-handler', () => {
  const chain = {
    minDistance: () => chain,
    onStart: () => chain,
    onUpdate: () => chain,
    onEnd: () => chain,
    onFinalize: () => chain,
  };
  return {
    Gesture: { Pan: () => chain },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  };
});

const mockStorage = new Map<string, string>();
const mockSubmitStudyMemberActivityToGroups = jest.fn(async () => ({ groupIds: ['grp-1'], failures: [] as { groupId: string; message: string }[] }));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { mockStorage.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { mockStorage.delete(key); }),
  },
}));

jest.mock('../lib/groupRooms', () => ({
  getActiveStudyGroups: jest.fn(async () => []),
  submitStudyMemberActivityToGroups: mockSubmitStudyMemberActivityToGroups,
}));

const mockStore = {
  state: {
    storageReady: true,
    user: { id: 'user-1', name: 'Aspirant' },
    settings: {
      focusDurationMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      focusThemeId: 'obsidian',
      focusAnimationIntensity: 'balanced',
      reduceFocusMotion: false,
      focusMusicId: 'pure_cosmic_waves',
      focusMusicVolume: 0.65,
      focusAutoStartNextSession: true,
    },
    plannerScheduleItems: [
      {
        id: 'plan-1',
        category: 'Tasks',
        title: 'Polity Revision',
        subject: 'Polity',
        date: (() => {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })(),
        durationMinutes: 50,
      },
    ],
    plannerScheduleCompletions: {},
    plannerTaskStudySeconds: {},
  },
  dispatch: jest.fn(),
};

jest.mock('../lib/store', () => ({
  useStore: () => mockStore,
  dayKey: () => '2026-11-26',
  getUserScopedStorageKey: (key: string, userId?: string | null) => `${key}:user:${userId ?? 'local'}`,
}));

jest.mock('../lib/theme', () => ({
  shadow: () => ({}),
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radii: { card: 16, dialog: 20, pill: 999 },
  useTheme: () => ({
    scheme: 'light',
    colors: {
      text: '#111827',
      textMuted: '#6B7280',
      surface: '#FFFFFF',
      surfaceAlt: '#F3F4F6',
      blue: '#2563EB',
      teal: '#14B8A6',
      warning: '#F59E0B',
      danger: '#EF4444',
      border: '#E5E7EB',
      overlay: 'rgba(0,0,0,0.5)',
    },
  }),
}));

jest.mock('../components/ui', () => {
  const ReactActual = require('react');
  const { Pressable, Text: RNText } = require('react-native');
  return {
    Button: ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) =>
      ReactActual.createElement(Pressable, { accessibilityRole: 'button', accessibilityState: { disabled: Boolean(disabled) }, onPress, disabled }, ReactActual.createElement(RNText, null, label)),
    Txt: ({ children }: { children: React.ReactNode }) => ReactActual.createElement(RNText, null, children),
  };
});

jest.mock('@expo/vector-icons/Ionicons', () => {
  const ReactActual = require('react');
  const { Text: RNText } = require('react-native');
  return { __esModule: true, default: ({ name }: { name: string }) => ReactActual.createElement(RNText, null, name) };
});

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('../lib/groupRoomRealtime', () => ({
  useGroupFocusPresence: jest.fn(),
}));

jest.mock('../lib/focusHistory', () => ({
  appendFocusHistory: jest.fn(async (_k: string, record: unknown) => [record]),
}));

const { FocusSessionSetupModal } = require('../components/FocusSessionSetupModal') as typeof import('../components/FocusSessionSetupModal');
const { FocusSessionProvider, useFocusSession } = require('../lib/focusSession') as typeof import('../lib/focusSession');
const { ActiveSessionBar } = require('../components/ActiveSessionBar') as typeof import('../components/ActiveSessionBar');
const { RoomHeader } = require('../components/RoomHeader') as typeof import('../components/RoomHeader');
const { retryPendingStudyMemberActivities, syncStudyMemberActivityWithRetry } = require('../lib/groupActivitySync') as typeof import('../lib/groupActivitySync');

const safeMetrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 24, right: 0, bottom: 20, left: 0 } };

describe('Part 1: Inline Custom Duration Input', () => {
  it('transforms the 4th box into an inline numeric input with no separate Custom Duration section', () => {
    function Harness({ onContinue }: { onContinue: jest.Mock }) {
      const [setup, setSetup] = React.useState({
        mode: 'timer' as const,
        durationMinutes: 25,
        selection: null as 'schedule' | 'manual' | null,
        tag: '',
        task: null as any,
      });
      return (
        <SafeAreaProvider initialMetrics={safeMetrics}>
          <FocusSessionSetupModal
            visible
            value={setup}
            onChange={setSetup}
            onClose={jest.fn()}
            onContinue={onContinue}
          />
        </SafeAreaProvider>
      );
    }

    const onContinue = jest.fn();
    const view = render(<Harness onContinue={onContinue} />);

    expect(view.getByText('15m')).toBeTruthy();
    expect(view.getByText('25m')).toBeTruthy();
    expect(view.getByText('40m')).toBeTruthy();
    expect(view.getByText('Custom')).toBeTruthy();
    expect(view.queryByText('CUSTOM DURATION (MINUTES)')).toBeNull();
    expect(view.queryByLabelText('Custom duration minutes')).toBeNull();

    // Tap Custom -> 4th box becomes inline TextInput
    fireEvent.press(view.getByLabelText('Custom duration'));
    const input = view.getByLabelText('Custom duration minutes');
    expect(input).toBeTruthy();
    expect(input.props.keyboardType).toBe('number-pad');
    expect(view.queryByText('CUSTOM DURATION (MINUTES)')).toBeNull();

    // Invalid value (0) disables Continue and shows feedback
    fireEvent.changeText(input, '0');
    expect(view.getByText('Duration must be at least 1 minute.')).toBeTruthy();
    fireEvent.press(view.getByText('Continue to Full Focus'));
    expect(onContinue).not.toHaveBeenCalled();

    // Invalid value (361) disables Continue
    fireEvent.changeText(input, '361');
    expect(view.getByText('Duration cannot exceed 360 minutes.')).toBeTruthy();
    fireEvent.press(view.getByText('Continue to Full Focus'));
    expect(onContinue).not.toHaveBeenCalled();

    // Valid value (60) starts session directly
    fireEvent.changeText(input, '60');
    fireEvent.press(view.getByText('Continue to Full Focus'));
    expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({ durationMinutes: 60 }));

    // Selecting preset clears custom input state
    fireEvent.press(view.getByText('15m'));
    expect(view.queryByLabelText('Custom duration minutes')).toBeNull();
    expect(view.getByText('Custom')).toBeTruthy();
  });

  it('auto-fills the 4th inline Custom box from Add from Schedule and supports manual override', () => {
    function Harness({ onContinue }: { onContinue: jest.Mock }) {
      const [setup, setSetup] = React.useState({
        mode: 'timer' as const,
        durationMinutes: 25,
        selection: null as 'schedule' | 'manual' | null,
        tag: '',
        task: null as any,
      });
      return (
        <SafeAreaProvider initialMetrics={safeMetrics}>
          <FocusSessionSetupModal
            visible
            value={setup}
            onChange={setSetup}
            onClose={jest.fn()}
            onContinue={onContinue}
          />
        </SafeAreaProvider>
      );
    }

    const onContinue = jest.fn();
    const view = render(<Harness onContinue={onContinue} />);
    fireEvent.press(view.getByText('Add from Schedule'));
    fireEvent.press(view.getByText('Polity Revision'));

    const input = view.getByLabelText('Custom duration minutes');
    expect(input.props.value).toBe('50');

    // Manual override
    fireEvent.changeText(input, '35');
    fireEvent.press(view.getByText('Continue to Full Focus'));
    expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({
      durationMinutes: 35,
      selection: 'schedule',
      scheduleOccurrenceId: expect.stringContaining('plan-1::'),
    }));
  });
});

describe('Part 2: Offline-First Sync & Error Classification (No Red Banner)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
    clearSyncLogCooldowns();
  });

  it('classifies transient network vs auth/permission errors accurately', () => {
    expect(classifySyncError(new Error('Network request failed'))).toMatchObject({
      category: 'temporary_network',
      requiresUserAction: false,
      isTransient: true,
    });
    expect(classifySyncError(null, 'timed out')).toMatchObject({
      category: 'slow_network',
      requiresUserAction: false,
      isTransient: true,
    });
    expect(classifySyncError(new Error('JWT expired (401)'))).toMatchObject({
      category: 'auth_failure',
      requiresUserAction: true,
    });
    expect(classifySyncError(new Error('row-level security policy violation (42501)'))).toMatchObject({
      category: 'permission_rls',
      requiresUserAction: true,
    });
  });

  it('queues failed group activity locally without duplicates and retries when online', async () => {
    mockSubmitStudyMemberActivityToGroups.mockRejectedValueOnce(new Error('Network request failed'));

    const activity = {
      userId: 'user-1',
      eventId: 'focus-evt-1',
      activityType: 'focus_session' as const,
      actualSeconds: 600,
      occurredAt: '2026-11-26T08:00:00.000Z',
    };

    const first = await syncStudyMemberActivityWithRetry(activity, ['grp-1']);
    expect(first.failures).toHaveLength(1);
    expect(mockStorage.get('study-sakha-pending-group-activity-v2:user-1')).toBeTruthy();

    // Retry succeeds -> queue clears
    mockSubmitStudyMemberActivityToGroups.mockResolvedValueOnce({ groupIds: ['grp-1'], failures: [] });
    const failures = await retryPendingStudyMemberActivities('user-1');
    expect(failures).toHaveLength(0);
    expect(mockStorage.get('study-sakha-pending-group-activity-v2:user-1')).toBeUndefined();
  });

  it('removed the red presenceWarning banner from FocusCenterScreen', () => {
    const focusCenterSrc = readFileSync(join(__dirname, '../screens/FocusCenterScreen.tsx'), 'utf8');
    expect(focusCenterSrc).not.toContain('presenceWarning');
  });
});

describe('Part 3: Focus Centre Top Controls', () => {
  it('removes the App button and Explore Study Sakha modal while keeping Group and Hide', () => {
    const timerSrc = readFileSync(join(__dirname, '../components/GeminiFocusTimer.tsx'), 'utf8');
    expect(timerSrc).not.toContain('Explore Study Sakha');
    expect(timerSrc).not.toContain('apps-outline');
    expect(timerSrc).toContain('>Group<');
    expect(timerSrc).toContain('>Hide<');
  });
});

describe('Part 4 & 5: Unified ActiveSessionBar & Group Hall Exit', () => {
  it('coalesces repeated route reports without re-rendering the focus provider forever', async () => {
    let renderCount = 0;
    function Harness() {
      const { setCurrentRouteName } = useFocusSession();
      renderCount += 1;
      React.useEffect(() => {
        setCurrentRouteName('DashboardRoot');
        setCurrentRouteName('DashboardRoot');
      }, [setCurrentRouteName]);
      return <Text testID="route-render-count">{renderCount}</Text>;
    }

    const view = render(<FocusSessionProvider><Harness /></FocusSessionProvider>);
    await waitFor(() => expect(Number(view.getByTestId('route-render-count').props.children)).toBeLessThan(4));
    expect(renderCount).toBeLessThan(4);
    view.unmount();
  });

  it('switches ActiveSessionBar cleanly between FocusCentre, GroupHall, and external screens without duplicates', async () => {
    const onBackToFocus = jest.fn();
    const onReturnToHall = jest.fn();

    function Harness() {
      const focus = useFocusSession();
      const [route, setRoute] = React.useState<'FocusCenter' | 'DashboardRoot' | 'Groups'>('FocusCenter');
      const [insideHall, setInsideHall] = React.useState(false);

      const { setCurrentRouteName } = focus;
      React.useEffect(() => {
        setCurrentRouteName(route);
      }, [setCurrentRouteName, route]);

      return (
        <SafeAreaProvider initialMetrics={safeMetrics}>
          <View>
            <Pressable
              testID="start-focus"
              onPress={() =>
                focus.startSession({
                  mode: 'timer',
                  durationMinutes: 25,
                  selection: 'manual',
                  tag: 'Polity',
                  task: null,
                })
              }
            />
            <Pressable
              testID="enter-hall"
              onPress={() => {
                setRoute('Groups');
                setInsideHall(true);
                focus.setActiveHallContext({
                  groupId: 'grp-1',
                  groupName: 'UPSC Prelims',
                  roomId: 'silent-focus',
                  roomName: 'Silent Focus Hall',
                  roomSessionId: 'room-1',
                  isInsideHall: true,
                });
              }}
            />
            <Pressable
              testID="minimize-hall"
              onPress={() => {
                setInsideHall(false);
                focus.setActiveHallContext({
                  groupId: 'grp-1',
                  groupName: 'UPSC Prelims',
                  roomId: 'silent-focus',
                  roomName: 'Silent Focus Hall',
                  roomSessionId: 'room-1',
                  isInsideHall: false,
                });
              }}
            />
            <Pressable testID="go-focus" onPress={() => setRoute('FocusCenter')} />
            <Pressable testID="go-dash" onPress={() => setRoute('DashboardRoot')} />
            <Text testID="active-session-id">{focus.session?.id ?? 'none'}</Text>
            {insideHall ? (
              <ActiveSessionBar context="hall" onPressBackToFocus={onBackToFocus} />
            ) : null}
            <ActiveSessionBar
              context="global"
              currentRouteName={route}
              onPressBackToFocus={onBackToFocus}
              onPressReturnToHall={onReturnToHall}
            />
          </View>
        </SafeAreaProvider>
      );
    }

    const view = render(
      <FocusSessionProvider>
        <Harness />
      </FocusSessionProvider>,
    );
    await act(async () => { await Promise.resolve(); });

    fireEvent.press(view.getByTestId('start-focus'));
    const sessionId = view.getByTestId('active-session-id').props.children;
    expect(sessionId).not.toBe('none');

    // Case A without Hall: FocusCenter has no redundant bar
    expect(view.queryByTestId('active-session-bar')).toBeNull();

    // Case B: Inside Hall -> shows ONE bubble that expands with Back to Focus
    fireEvent.press(view.getByTestId('enter-hall'));
    expect(view.getAllByTestId('active-session-bar')).toHaveLength(1);
    fireEvent.press(view.getByTestId('focus-bubble-collapsed'));
    expect(view.getByLabelText('Back to Focus')).toBeTruthy();

    // Exit Hall -> Focus session stays intact with same ID!
    fireEvent.press(view.getByTestId('minimize-hall'));
    expect(view.getByTestId('active-session-id').props.children).toBe(sessionId);

    // Case A with active Hall: On FocusCenter -> no persistent Group Hall banner or Return to Hall button
    fireEvent.press(view.getByTestId('go-focus'));
    expect(view.queryByTestId('active-session-bar')).toBeNull();
    expect(view.queryByLabelText('Return to Hall')).toBeNull();
    expect(view.queryByLabelText('Back to Focus')).toBeNull();
    expect(onReturnToHall).not.toHaveBeenCalled();

    // Case C: On DashboardRoot -> shows ONE shared bubble that expands with Back to Focus
    fireEvent.press(view.getByTestId('go-dash'));
    expect(view.getAllByTestId('active-session-bar')).toHaveLength(1);
    const collapsedDashBubble = view.queryByTestId('focus-bubble-collapsed');
    if (collapsedDashBubble) {
      fireEvent.press(collapsedDashBubble);
    }
    expect(view.getByLabelText('Back to Focus')).toBeTruthy();
  });

  it('removes the top-right Leave button from RoomHeader and ExitConfirmModal from SmartStudyRoomScreen', () => {
    const onBack = jest.fn();
    const view = render(
      <RoomHeader
        roomName="Silent Focus Hall"
        totalPartnersPresent={3}
        focusingNowCount={2}
        isDark={false}
        onToggleTheme={jest.fn()}
        onPressBack={onBack}
      />,
    );
    expect(view.queryByLabelText('Exit Silent Focus Hall')).toBeNull();
    fireEvent.press(view.getByLabelText('Back from Silent Focus Hall'));
    expect(onBack).toHaveBeenCalledTimes(1);

    const smartRoomSrc = readFileSync(join(__dirname, '../screens/SmartStudyRoomScreen.tsx'), 'utf8');
    expect(smartRoomSrc).not.toContain('ExitConfirmModal');
  });
});
