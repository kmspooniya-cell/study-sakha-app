import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform, Share } from 'react-native';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
let mockStackRoutes: { key: string; name: string }[] = [{ key: 'dash-1', name: 'DashboardRoot' }];
let mockStackIndex = 0;
let mockBlurListeners: (() => void)[] = [];

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
jest.mock('@react-navigation/native', () => ({
  StackActions: { popTo: (name: string) => ({ type: 'POP_TO', payload: { name } }) },
  useNavigation: () => ({
    navigate: mockNavigate,
    dispatch: mockDispatch,
    getState: () => ({ index: mockStackIndex, routes: mockStackRoutes }),
    getParent: () => ({ getState: () => ({ history: [], routes: [] }) }),
    addListener: (event: string, listener: () => void) => {
      if (event === 'blur') mockBlurListeners.push(listener);
      return () => {
        mockBlurListeners = mockBlurListeners.filter((item) => item !== listener);
      };
    },
  }),
  useRoute: () => ({ name: mockStackRoutes[mockStackIndex]?.name ?? 'DashboardRoot', params: undefined }),
  useFocusEffect: () => undefined,
}));
jest.mock('../lib/store', () => ({
  StoreProvider: ({ children }: { children: React.ReactNode }) => children,
  useStore: () => ({
    state: {
      user: { id: 'u1', name: 'Asha Learner', email: 'asha@example.test', role: 'learner' },
      settings: { language: 'en' },
    },
    unread: 0,
    syncStatus: 'synced',
    dispatch: jest.fn(),
  }),
  getDisplayName: (user: { name?: string } | null) => user?.name ?? 'Aspirant',
}));

const { AppHeader } = require('../components/Shell') as typeof import('../components/Shell');
const { ThemeProvider } = require('../lib/theme') as typeof import('../lib/theme');

function renderHeader(mode: 'light' | 'dark' = 'light') {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 24, right: 0, bottom: 20, left: 0 },
      }}
    >
      <ThemeProvider mode={mode} reduceMotion>
        <AppHeader />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

describe('Header three-dot overflow menu and repeated Settings navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStackRoutes = [{ key: 'dash-1', name: 'DashboardRoot' }];
    mockStackIndex = 0;
    mockBlurListeners = [];
  });

  it('removes the hamburger drawer button and old circular Help button from the header', () => {
    const view = renderHeader();
    expect(view.queryByLabelText('Open menu')).toBeNull();
    expect(view.queryByLabelText('Open Help Menu')).toBeNull();
    expect(view.getByTestId('header-more-button')).toBeTruthy();
  });

  it('opens the overflow menu with the exact four options in order', () => {
    const view = renderHeader();
    fireEvent.press(view.getByTestId('header-more-button'));

    const menu = view.getByTestId('header-overflow-menu');
    expect(menu).toBeTruthy();
    expect(view.getByTestId('header-menu-guide')).toBeTruthy();
    expect(view.getByTestId('header-menu-settings')).toBeTruthy();
    expect(view.getByTestId('header-menu-help')).toBeTruthy();
    expect(view.getByTestId('header-menu-share')).toBeTruthy();
    expect(view.getByText('How to use the app')).toBeTruthy();
    expect(view.getByText('Settings')).toBeTruthy();
    expect(view.getByText('Help')).toBeTruthy();
    expect(view.getByText('Share with friends')).toBeTruthy();
  });

  it('navigates to Settings reliably across 12 consecutive open/return cycles on Android', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    try {
      const view = renderHeader();

      for (let cycle = 0; cycle < 12; cycle += 1) {
        fireEvent.press(view.getByTestId('header-more-button'));
        expect(view.getByTestId('header-overflow-menu')).toBeTruthy();

        fireEvent.press(view.getByTestId('header-menu-settings'));
        expect(view.queryByTestId('header-overflow-menu')).toBeNull();
        expect(mockNavigate).toHaveBeenCalledTimes(cycle + 1);
        expect(mockNavigate).toHaveBeenLastCalledWith('Settings');

        // Simulate returning from Settings back to DashboardRoot
        act(() => {
          mockBlurListeners.forEach((cb) => cb());
        });
      }
    } finally {
      Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
    }
  });

  it('pops back to existing Settings route instead of duplicating it when already in stack', () => {
    mockStackRoutes = [
      { key: 'dash-1', name: 'DashboardRoot' },
      { key: 'set-1', name: 'Settings' },
      { key: 'guide-1', name: 'AppGuide' },
    ];
    mockStackIndex = 2;

    const view = renderHeader();
    fireEvent.press(view.getByTestId('header-more-button'));
    fireEvent.press(view.getByTestId('header-menu-settings'));

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'POP_TO',
      payload: { name: 'Settings' },
    });
  });

  it('navigates to AppGuide, opens Help modal, and invokes Share with friends', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    const view = renderHeader('dark');

    // 1. How to use the app
    fireEvent.press(view.getByTestId('header-more-button'));
    fireEvent.press(view.getByTestId('header-menu-guide'));
    expect(mockNavigate).toHaveBeenCalledWith('AppGuide');

    // 2. Help modal
    fireEvent.press(view.getByTestId('header-more-button'));
    fireEvent.press(view.getByTestId('header-menu-help'));
    expect(view.getByText('How can we help you?')).toBeTruthy();

    // 3. Share with friends
    fireEvent.press(view.getByTestId('header-more-button'));
    await act(async () => {
      fireEvent.press(view.getByTestId('header-menu-share'));
    });
    expect(shareSpy).toHaveBeenCalledTimes(1);
    const [content] = shareSpy.mock.calls[0] as [{ title?: string; message?: string }];
    expect(content.title).toBe('Study Sakha');
    expect(content.message).toContain('Study Sakha');
    expect(content.message).not.toContain('groups/invite');

    shareSpy.mockRestore();
  });

  it('closes the overflow menu when tapping outside', () => {
    const view = renderHeader();
    fireEvent.press(view.getByTestId('header-more-button'));
    expect(view.getByTestId('header-overflow-menu')).toBeTruthy();

    fireEvent.press(view.getByTestId('header-overflow-backdrop'));
    expect(view.queryByTestId('header-overflow-menu')).toBeNull();
  });
});
