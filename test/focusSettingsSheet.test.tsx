import './mocks/native';
import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Modal } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@shopify/react-native-skia', () => {
  const { View } = require('react-native');
  return {
    BlendMode: { SrcOver: 0, Plus: 1, DstOut: 2, SrcATop: 3, Multiply: 4, Screen: 5, Overlay: 6, Lighten: 7 },
    TileMode: { Clamp: 0, Repeat: 1, Mirror: 2, Decal: 3 },
    StrokeCap: { Butt: 0, Round: 1, Square: 2 },
    StrokeJoin: { Miter: 0, Round: 1, Bevel: 2 },
    PaintStyle: { Fill: 0, Stroke: 1 },
    BlurMask: View,
    Canvas: View,
    Circle: View,
    Path: View,
    Picture: View,
    Skia: {
      Path: { Make: () => ({ addArc: jest.fn() }) },
      XYWHRect: jest.fn(),
    },
  };
});
jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return { BlurTargetView: View, BlurView: View };
});
jest.mock('../hooks/useProceduralPicture', () => ({
  useProceduralPicture: () => null,
}));

import GeminiFocusTimer from '../components/GeminiFocusTimer';
import { StoreProvider } from '../lib/store';
import { ThemeProvider } from '../lib/theme';
import { themeById } from '../themes';

const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 640 },
  insets: { top: 24, left: 0, right: 0, bottom: 24 },
};

function renderTimer(overrides: Partial<React.ComponentProps<typeof GeminiFocusTimer>> = {}) {
  const props: React.ComponentProps<typeof GeminiFocusTimer> = {
    timer: {
      totalSeconds: 1500,
      remainingSeconds: 1500,
      running: true,
      isBreak: false,
      sessionLabel: '25-minute Focus',
      modeLabel: 'TIMER',
    },
    subject: 'Polity',
    groupName: 'Group',
    onPause: jest.fn(),
    onStop: jest.fn(),
    onBreak: jest.fn(),
    onReset: jest.fn(),
    onGroupPress: jest.fn(),
    onMusicPress: jest.fn(),
    blockedAppsCount: 5,
    onManageBlockedApps: jest.fn(),
    ...overrides,
  };

  const view = render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <StoreProvider>
        <ThemeProvider mode="dark">
          <GeminiFocusTimer {...props} />
        </ThemeProvider>
      </StoreProvider>
    </SafeAreaProvider>,
  );

  return { view, props };
}

describe('Focus & Visual Settings tabbed bottom sheet', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await AsyncStorage.clear();
  });

  it('defaults to Theme tab, renders horizontal single-row tabs, and shows only active tab content', async () => {
    const { view } = renderTimer();
    await act(async () => {});

    fireEvent.press(view.getByLabelText('Options'));

    expect(view.getByText('Focus & Visual Settings')).toBeTruthy();

    const tabBar = view.getByTestId('focus-settings-tab-bar');
    expect(tabBar.props.horizontal).toBe(true);
    expect(tabBar.props.showsHorizontalScrollIndicator).toBe(false);

    // Theme tab is selected by default
    expect(view.getByTestId('focus-settings-tab-theme').props.accessibilityState).toEqual({ selected: true });
    expect(view.getByTestId('focus-settings-tab-audio').props.accessibilityState).toEqual({ selected: false });
    expect(view.getByTestId('focus-settings-panel-theme')).toBeTruthy();
    expect(view.queryByTestId('focus-settings-panel-audio')).toBeNull();
    expect(view.queryByTestId('focus-settings-panel-visual')).toBeNull();
    expect(view.queryByTestId('focus-settings-panel-timer')).toBeNull();
    expect(view.queryByTestId('focus-settings-panel-apps')).toBeNull();

    // Every registered theme is preserved
    for (const def of Object.values(themeById)) {
      expect(view.getByText(def.name)).toBeTruthy();
    }
  });

  it('switches across all 5 tabs without closing the sheet and keeps vertical scroll isolated', async () => {
    const { view } = renderTimer();
    await act(async () => {});

    fireEvent.press(view.getByLabelText('Options'));

    const contentScroll = view.getByTestId('focus-settings-content-scroll');
    expect(contentScroll.props.nestedScrollEnabled).toBe(true);

    // Audio tab
    fireEvent.press(view.getByTestId('focus-settings-tab-audio'));
    expect(view.getByTestId('focus-settings-tab-audio').props.accessibilityState).toEqual({ selected: true });
    expect(view.getByTestId('focus-settings-panel-audio')).toBeTruthy();
    expect(view.getByText('Music')).toBeTruthy();
    expect(view.getByText('Choose')).toBeTruthy();
    expect(view.queryByTestId('focus-settings-panel-theme')).toBeNull();

    // Visual tab
    fireEvent.press(view.getByTestId('focus-settings-tab-visual'));
    expect(view.getByTestId('focus-settings-tab-visual').props.accessibilityState).toEqual({ selected: true });
    expect(view.getByTestId('focus-settings-panel-visual')).toBeTruthy();
    expect(view.getByText('Living Atmosphere')).toBeTruthy();
    expect(view.queryByTestId('focus-settings-panel-audio')).toBeNull();

    // Timer tab
    fireEvent.press(view.getByTestId('focus-settings-tab-timer'));
    expect(view.getByTestId('focus-settings-tab-timer').props.accessibilityState).toEqual({ selected: true });
    expect(view.getByTestId('focus-settings-panel-timer')).toBeTruthy();
    expect(view.getByText('Reset Timer to 25:00')).toBeTruthy();
    expect(view.queryByTestId('focus-settings-panel-visual')).toBeNull();

    // Apps tab
    fireEvent.press(view.getByTestId('focus-settings-tab-apps'));
    expect(view.getByTestId('focus-settings-tab-apps').props.accessibilityState).toEqual({ selected: true });
    expect(view.getByTestId('focus-settings-panel-apps')).toBeTruthy();
    expect(view.getByText('Blocked Apps (5)')).toBeTruthy();
    expect(view.getByText('Manage')).toBeTruthy();
    expect(view.queryByTestId('focus-settings-panel-timer')).toBeNull();
  });

  it('persists theme selection and Living Atmosphere toggle after closing and reopening', async () => {
    const { view } = renderTimer();
    await act(async () => {});

    fireEvent.press(view.getByLabelText('Options'));

    // Select Enchanted Garden
    fireEvent.press(view.getByTestId('focus-theme-option-enchanted-garden'));
    act(() => {
      jest.runAllTimers();
    });
    expect(view.getByTestId('focus-theme-option-enchanted-garden').props.accessibilityState).toEqual({ selected: true });
    expect(view.getByTestId('focus-theme-option-obsidian').props.accessibilityState).toEqual({ selected: false });

    // Switch to Visual and toggle Living Atmosphere off
    fireEvent.press(view.getByTestId('focus-settings-tab-visual'));
    const motionSwitch = view.getByLabelText('Living Atmosphere');
    expect(motionSwitch.props.value).toBe(true);
    fireEvent(motionSwitch, 'valueChange', false);
    expect(view.getByLabelText('Living Atmosphere').props.value).toBe(false);

    // Close sheet via close button
    fireEvent.press(view.getByLabelText('Close settings'));
    expect(view.queryByText('Focus & Visual Settings')).toBeNull();

    // Reopen sheet: defaults back to Theme tab, but settings persist
    fireEvent.press(view.getByLabelText('Options'));
    expect(view.getByTestId('focus-settings-tab-theme').props.accessibilityState).toEqual({ selected: true });
    expect(view.getByTestId('focus-theme-option-enchanted-garden').props.accessibilityState).toEqual({ selected: true });

    fireEvent.press(view.getByTestId('focus-settings-tab-visual'));
    expect(view.getByLabelText('Living Atmosphere').props.value).toBe(false);
  });

  it('wires Audio, Timer reset, Blocked Apps Manage, and Android Back dismissal correctly', async () => {
    const onMusicPress = jest.fn();
    const onReset = jest.fn();
    const onManageBlockedApps = jest.fn();

    const { view } = renderTimer({ onMusicPress, onReset, onManageBlockedApps });
    await act(async () => {});

    fireEvent.press(view.getByLabelText('Options'));

    // Audio -> Music Choose
    fireEvent.press(view.getByTestId('focus-settings-tab-audio'));
    fireEvent.press(view.getByText('Music'));
    expect(onMusicPress).toHaveBeenCalledTimes(1);

    // Apps -> Blocked Apps Manage
    fireEvent.press(view.getByTestId('focus-settings-tab-apps'));
    fireEvent.press(view.getByText('Blocked Apps (5)'));
    expect(onManageBlockedApps).toHaveBeenCalledTimes(1);

    // Timer -> Reset Timer to 25:00 (closes sheet & calls onReset)
    fireEvent.press(view.getByTestId('focus-settings-tab-timer'));
    fireEvent.press(view.getByText('Reset Timer to 25:00'));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(view.queryByText('Focus & Visual Settings')).toBeNull();

    // Reopen and test Android Back (onRequestClose)
    fireEvent.press(view.getByLabelText('Options'));
    expect(view.getByText('Focus & Visual Settings')).toBeTruthy();
    const modal = view.UNSAFE_getByType(Modal);
    act(() => {
      modal.props.onRequestClose();
    });
    expect(view.queryByText('Focus & Visual Settings')).toBeNull();
  });
});
