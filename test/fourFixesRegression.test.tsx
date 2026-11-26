import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  scheduleNotificationAsync: jest.fn(async () => 'notif-1'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  AndroidImportance: { HIGH: 4 },
}));

jest.mock('expo-linear-gradient', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: any) => ReactActual.createElement(View, props, children),
  };
});

jest.mock('@expo/vector-icons/Ionicons', () => {
  const ReactActual = require('react');
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ name }: { name: string }) => ReactActual.createElement(Text, null, name) };
});

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-svg', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  const Comp = ({ children, ...props }: any) => ReactActual.createElement(View, props, children);
  return {
    __esModule: true,
    default: Comp,
    Svg: Comp,
    Defs: Comp,
    LinearGradient: Comp,
    RadialGradient: Comp,
    Stop: Comp,
    Rect: Comp,
    Circle: Comp,
    Path: Comp,
    G: Comp,
  };
});

const mockDispatch = jest.fn();

jest.mock('../lib/store', () => ({
  useStore: () => ({
    state: {
      storageReady: true,
      user: { id: 'user-1', name: 'Aspirant', email: 'aspirant@example.com', exam: 'upsc' },
      settings: {
        focusDurationMinutes: 25,
        dailyGoalMin: 120,
        themeMode: 'light',
      },
      plannerTasks: [],
      plannerSettings: { recurringTasksEnabled: true },
      plannerScheduleItems: [],
      plannerScheduleCompletions: {},
      plannerScheduleRecovery: [],
      plannerTaskStudySeconds: {},
      studyLogs: [],
      notifications: [],
    },
    dispatch: mockDispatch,
    badges: [{ id: 'b1', earned: true }],
    todayMinutes: 45,
    streak: 3,
    saveProfile: jest.fn(async () => ({ ok: true })),
    signOut: jest.fn(async () => ({ ok: true })),
  }),
  dayKey: () => '2026-11-26',
  getUserScopedStorageKey: (key: string, userId?: string | null) => `${key}:user:${userId ?? 'local'}`,
}));

jest.mock('../lib/theme', () => ({
  shadow: () => ({}),
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radii: { card: 16, dialog: 20, pill: 999 },
  useTheme: () => ({
    scheme: 'light',
    mode: 'light',
    colors: {
      bg: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceAlt: '#F3F4F6',
      text: '#0F172A',
      textMuted: '#64748B',
      border: '#E2E8F0',
      blue: '#2563EB',
      teal: '#14B8A6',
      warning: '#F59E0B',
      danger: '#EF4444',
      overlay: 'rgba(0,0,0,0.5)',
    },
  }),
}));

jest.mock('../components/Shell', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    Shell: ({ children }: { children: React.ReactNode }) => ReactActual.createElement(View, null, children),
    useLayout: () => ({ isMobile: true, isTablet: false, isDesktop: false }),
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => false, setParams: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

const StudyPlannerScreen = require('../screens/StudyPlannerScreen').default;

const safeMetrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 24, right: 0, bottom: 20, left: 0 } };

describe('Four targeted fixes regression checks', () => {
  it('removes duplicate ActiveSessionBar from GroupsScreen Group Hall while keeping SmartStudyRoomScreen footer and popup', () => {
    const groupsSrc = readFileSync(join(__dirname, '../screens/GroupsScreen.tsx'), 'utf8');
    expect(groupsSrc).not.toContain('ActiveSessionBar');
    const smartRoomSrc = readFileSync(join(__dirname, '../screens/SmartStudyRoomScreen.tsx'), 'utf8');
    expect(smartRoomSrc).toContain('ChairDetailBottomSheet');
    expect(smartRoomSrc).toContain('footerOuter');
  });

  it('keeps Study Planner Task, Class, Exam, and Vacation forms independent and removes manual Duration from Task and Class', () => {
    mockDispatch.mockClear();
    const view = render(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <StudyPlannerScreen />
      </SafeAreaProvider>,
    );

    // Open new plan form via Add Plan button
    fireEvent.press(view.getByText('Add Plan'));

    // Task form: manual duration controls must NOT be present
    expect(view.queryByLabelText('Decrease duration')).toBeNull();
    expect(view.queryByLabelText('Increase duration')).toBeNull();
    expect(view.queryByLabelText('Planned duration minutes')).toBeNull();

    // Enter a Task title
    const taskTitleInput = view.getByPlaceholderText('Task Title');
    fireEvent.changeText(taskTitleInput, 'Read Laxmikanth Ch 1');

    // Switch to Class tab: title must be empty (independent!) and no manual duration controls
    fireEvent.press(view.getAllByText('Classes').at(-1)!);
    const classTitleInput = view.getByPlaceholderText('Class Name');
    expect(classTitleInput.props.value).toBe('');
    expect(view.queryByLabelText('Decrease duration')).toBeNull();
    expect(view.queryByLabelText('Increase duration')).toBeNull();
    expect(view.queryByLabelText('Planned duration minutes')).toBeNull();

    // Enter a Class title
    fireEvent.changeText(classTitleInput, 'Polity Live Class');

    // Switch to Exam tab: title must be empty (independent!)
    fireEvent.press(view.getAllByText('Exams').at(-1)!);
    const examTitleInput = view.getByPlaceholderText('Exam Name');
    expect(examTitleInput.props.value).toBe('');

    // Switch to Vacation tab: title must be empty (independent!)
    fireEvent.press(view.getAllByText('Vacations').at(-1)!);
    const vacationTitleInput = view.getByPlaceholderText('Vacation Name');
    expect(vacationTitleInput.props.value).toBe('');

    // Switch back to Task tab: Task draft is preserved independently!
    fireEvent.press(view.getAllByText('Tasks').at(-1)!);
    expect(view.getByPlaceholderText('Task Title').props.value).toBe('Read Laxmikanth Ch 1');

    // Save Task: durationMinutes is auto-calculated from default 09:00 -> 10:00 (60 min)
    fireEvent.press(view.getByText(/^Save/));
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'addPlannerScheduleItem',
        item: expect.objectContaining({
          category: 'Tasks',
          title: 'Read Laxmikanth Ch 1',
          startTime: '09:00',
          endTime: '10:00',
          durationMinutes: 60,
        }),
      }),
    );
  });
});
