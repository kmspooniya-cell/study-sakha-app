import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { AppDrawerContentProps } from '../lib/navigation';

const stubScreen = () => null;
const capturedDrawerProps: {
  drawerContent?: (props: AppDrawerContentProps) => React.ReactNode;
  screenListeners?: {
    transitionStart?: (e: { data: { closing: boolean } }) => void;
    transitionEnd?: (e: { data: { closing: boolean } }) => void;
  };
} = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    clear: jest.fn(async () => undefined),
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }));
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { LinearGradient: ({ children, style }: { children?: React.ReactNode; style?: unknown }) => React.createElement(View, { style }, children) };
});
jest.mock('expo-navigation-bar', () => ({ NavigationBar: () => null }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-font', () => ({ useFonts: () => [true] }));
jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: () => ({ remove: jest.fn() }),
  addNotificationResponseReceivedListener: () => ({ remove: jest.fn() }),
  getLastNotificationResponseAsync: async () => null,
  clearLastNotificationResponseAsync: async () => undefined,
}));
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { GestureHandlerRootView: ({ children }: { children?: React.ReactNode }) => React.createElement(View, null, children) };
});
jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({ Navigator: stubScreen, Screen: stubScreen }),
}));
jest.mock('@react-navigation/drawer', () => {
  const React = require('react');
  const { ScrollView, View } = require('react-native');
  return {
    createDrawerNavigator: () => ({
      Navigator: (props: {
        drawerContent: (props: AppDrawerContentProps) => React.ReactNode;
        screenListeners?: typeof capturedDrawerProps.screenListeners;
      }) => {
        capturedDrawerProps.drawerContent = props.drawerContent;
        capturedDrawerProps.screenListeners = props.screenListeners;
        return React.createElement(View, null);
      },
      Screen: stubScreen,
    }),
    DrawerContentScrollView: ({ children, ...rest }: { children?: React.ReactNode }) =>
      React.createElement(ScrollView, rest, children),
    getDrawerStatusFromState: (state: { history?: { type: string; status?: string }[]; default?: string }) => {
      const entry = state.history?.findLast((item) => item.type === 'drawer');
      return (entry?.status ?? state.default ?? 'closed') as 'open' | 'closed';
    },
  };
});

jest.mock('../screens/LibraryScreen', () => ({
  __esModule: true,
  default: stubScreen,
  LibraryBooksScreen: stubScreen,
  LibraryDownloadsScreen: stubScreen,
  LibraryNotesScreen: stubScreen,
  LibraryPYQSetsScreen: stubScreen,
  LibraryStarredScreen: stubScreen,
}));
jest.mock('../screens/AdminScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/AppGuideScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/BookReaderScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/CurrentAffairsScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/DashboardScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/FocusCenterScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/FocusCompletionScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/FocusLockScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/GroupsScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/MoreScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/NoteEditorScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/NotificationsScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/ProfileScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/PYQScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/SakhaAIScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/SearchScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/SettingsScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/SignInScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/SignUpScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/StatisticsScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/TaskPerformanceScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/StudyPlannerScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/TestPlayerScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/TestResultScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../screens/TestsScreen', () => ({ __esModule: true, default: stubScreen }));
jest.mock('../components/FloatingFocusBar', () => ({ FloatingFocusBar: () => null }));
jest.mock('../lib/notifications', () => ({
  capturePresentedNotifications: jest.fn(async () => undefined),
  notificationFromExpoNotification: jest.fn(() => null),
  notificationFromExpoResponse: jest.fn(() => null),
  syncUpcomingPlannerReminder: jest.fn(async () => undefined),
}));
jest.mock('../lib/store', () => ({
  StoreProvider: ({ children }: { children: React.ReactNode }) => children,
  useStore: () => ({
    state: {
      user: { id: 'u1', name: 'Asha Learner', email: 'asha@example.test', role: 'learner' },
      settings: { language: 'en' },
    },
    dispatch: jest.fn(),
  }),
  getDisplayName: (user: { name?: string } | null) => user?.name ?? 'Aspirant',
}));

const { MainDrawerNavigator } = require('../App') as typeof import('../App');
const { ThemeProvider } = require('../lib/theme') as typeof import('../lib/theme');

function createMockDrawerProps(options?: {
  drawerStatus?: 'open' | 'closed';
  stackRoutes?: { key: string; name: string }[];
  stackIndex?: number;
}) {
  const stackRoutes = options?.stackRoutes ?? [{ key: 'dash-1', name: 'DashboardRoot' }];
  const stackIndex = options?.stackIndex ?? 0;
  const drawerStatus = options?.drawerStatus ?? 'open';

  const navigate = jest.fn();
  const dispatch = jest.fn();
  const closeDrawer = jest.fn();

  const state = {
    type: 'drawer',
    key: 'drawer-1',
    index: 0,
    routeNames: ['MainStack'],
    default: 'closed',
    history: drawerStatus === 'open'
      ? [{ type: 'route', key: 'main-1' }, { type: 'drawer', status: 'open' }]
      : [{ type: 'route', key: 'main-1' }],
    routes: [
      {
        key: 'main-1',
        name: 'MainStack',
        state: {
          type: 'stack',
          key: 'stack-1',
          index: stackIndex,
          routeNames: ['DashboardRoot', 'Settings', 'AppGuide', 'LibraryDownloads', 'Profile'],
          routes: stackRoutes,
        },
      },
    ],
  };

  const navigation = {
    navigate,
    dispatch,
    closeDrawer,
  };

  return {
    props: { state, navigation, descriptors: {} } as unknown as AppDrawerContentProps,
    navigate,
    dispatch,
    closeDrawer,
  };
}

function renderMainDrawerWithMock(mockProps: AppDrawerContentProps) {
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 24, right: 0, bottom: 20, left: 0 },
      }}
    >
      <ThemeProvider mode="light" reduceMotion>
        <MainDrawerNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );

  const drawerElement = capturedDrawerProps.drawerContent?.(mockProps);
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 24, right: 0, bottom: 20, left: 0 },
      }}
    >
      <ThemeProvider mode="light" reduceMotion>
        {drawerElement}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

describe('MainDrawerNavigator Settings navigation reliability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedDrawerProps.drawerContent = undefined;
    capturedDrawerProps.screenListeners = undefined;
  });

  it('opens Settings reliably across 12 consecutive open/close cycles after transitionEnd', () => {
    const mock = createMockDrawerProps({ drawerStatus: 'open' });
    const view = renderMainDrawerWithMock(mock.props);

    for (let cycle = 0; cycle < 12; cycle += 1) {
      fireEvent.press(view.getByText('Settings'));
      expect(mock.closeDrawer).toHaveBeenCalledTimes(cycle + 1);
      // Should wait for drawer close transitionEnd before pushing Settings
      expect(mock.navigate).toHaveBeenCalledTimes(cycle);

      act(() => {
        capturedDrawerProps.screenListeners?.transitionEnd?.({ data: { closing: true } });
      });

      expect(mock.navigate).toHaveBeenCalledTimes(cycle + 1);
      expect(mock.navigate).toHaveBeenLastCalledWith('MainStack', { screen: 'Settings' });
    }
  });

  it('deduplicates rapid repeated taps on Settings while drawer is closing', () => {
    const mock = createMockDrawerProps({ drawerStatus: 'open' });
    const view = renderMainDrawerWithMock(mock.props);

    fireEvent.press(view.getByText('Settings'));
    fireEvent.press(view.getByText('Settings'));
    fireEvent.press(view.getByText('Settings'));

    expect(mock.navigate).not.toHaveBeenCalled();

    act(() => {
      capturedDrawerProps.screenListeners?.transitionEnd?.({ data: { closing: true } });
    });

    expect(mock.navigate).toHaveBeenCalledTimes(1);
    expect(mock.navigate).toHaveBeenCalledWith('MainStack', { screen: 'Settings' });
  });

  it('clears pending navigation when drawer is reopened mid-close and works on next tap', () => {
    const mock = createMockDrawerProps({ drawerStatus: 'open' });
    const view = renderMainDrawerWithMock(mock.props);

    fireEvent.press(view.getByText('Settings'));

    // User swipes drawer back open before close finishes
    act(() => {
      capturedDrawerProps.screenListeners?.transitionStart?.({ data: { closing: false } });
      capturedDrawerProps.screenListeners?.transitionEnd?.({ data: { closing: true } });
    });

    expect(mock.navigate).not.toHaveBeenCalled();

    // Tapping Settings again still works on next close
    fireEvent.press(view.getByText('Settings'));
    act(() => {
      capturedDrawerProps.screenListeners?.transitionEnd?.({ data: { closing: true } });
    });

    expect(mock.navigate).toHaveBeenCalledTimes(1);
    expect(mock.navigate).toHaveBeenCalledWith('MainStack', { screen: 'Settings' });
  });

  it('pops back to existing Settings route instead of duplicating it when already in stack', () => {
    const mock = createMockDrawerProps({
      drawerStatus: 'open',
      stackRoutes: [
        { key: 'dash-1', name: 'DashboardRoot' },
        { key: 'set-1', name: 'Settings' },
        { key: 'guide-1', name: 'AppGuide' },
      ],
      stackIndex: 2,
    });
    const view = renderMainDrawerWithMock(mock.props);

    fireEvent.press(view.getByText('Settings'));
    act(() => {
      capturedDrawerProps.screenListeners?.transitionEnd?.({ data: { closing: true } });
    });

    expect(mock.navigate).not.toHaveBeenCalled();
    expect(mock.dispatch).toHaveBeenCalledWith({
      type: 'POP_TO',
      payload: { name: 'Settings', params: undefined },
      target: 'stack-1',
    });
  });
});
