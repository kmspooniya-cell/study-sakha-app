import React, { useState } from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Settings } from 'lucide-react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockStorage = new Map<string, string>();
const mockGetItem = jest.fn(async (key: string) => mockStorage.get(key) ?? null);
const mockSetItem = jest.fn(async (key: string, value: string) => {
  mockStorage.set(key, value);
});

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return new Proxy(
    {},
    {
      get: (_target, prop) => (props: any) =>
        React.createElement(View, { ...props, accessibilityLabel: String(prop) }),
    },
  );
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: mockGetItem,
  setItem: mockSetItem,
  removeItem: jest.fn(async (key: string) => {
    mockStorage.delete(key);
  }),
  getAllKeys: jest.fn(async () => [...mockStorage.keys()]),
}));

jest.mock('../lib/supabase', () => ({
  STUDENT_CONTENT_BUCKET: 'Student-content',
  supabaseConfigured: false,
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    realtime: {
      setAuth: jest.fn(async () => undefined),
    },
  },
}));

const { SafeAreaProvider } = require('react-native-safe-area-context') as typeof import('react-native-safe-area-context');
const { StoreProvider } = require('../lib/store') as typeof import('../lib/store');
const { ThemeProvider: LegacyThemeProvider } = require('../lib/theme') as typeof import('../lib/theme');
const {
  SSDSBadge,
  SSDSBottomSheet,
  SSDSButton,
  SSDSCheckbox,
  SSDSCircularProgress,
  SSDSDialog,
  SSDSIconButton,
  SSDSProgressBar,
  SSDSRadio,
  SSDSSearchInput,
  SSDSSegmentedControl,
  SSDSSelect,
  SSDSSlider,
  SSDSSnackbar,
  SSDSSwitch,
  SSDSTextInput,
  SSDSThemeProvider,
  SSDSToast,
  useSSDSTheme,
} = require('../lib/ssds') as typeof import('../lib/ssds');

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <StoreProvider>
        <LegacyThemeProvider mode="light">
          <SSDSThemeProvider>{children}</SSDSThemeProvider>
        </LegacyThemeProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function InteractiveShowcase({
  onButtonPress,
  onDisabledPress,
  onLoadingPress,
  onIconPress,
  onDialogConfirm,
  onSnackbarAction,
}: {
  onButtonPress: () => void;
  onDisabledPress: () => void;
  onLoadingPress: () => void;
  onIconPress: () => void;
  onDialogConfirm: () => void;
  onSnackbarAction: () => void;
}) {
  const { showToast, showSnackbar } = useSSDSTheme();
  const [text, setText] = useState('');
  const [search, setSearch] = useState('Polity');
  const [checked, setChecked] = useState(false);
  const [radio, setRadio] = useState<'a' | 'b'>('a');
  const [sw, setSw] = useState(false);
  const [slider, setSlider] = useState(50);
  const [selected, setSelected] = useState('upsc');
  const [segment, setSegment] = useState<'all' | 'pyq'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <SSDSButton variant="primary" onPress={onButtonPress}>
        Save Goal
      </SSDSButton>
      <SSDSButton variant="secondary" disabled onPress={onDisabledPress}>
        Disabled Action
      </SSDSButton>
      <SSDSButton variant="outline" loading onPress={onLoadingPress}>
        Loading Action
      </SSDSButton>
      <SSDSIconButton
        icon={Settings}
        label="Open settings"
        size="small"
        onPress={onIconPress}
      />
      <SSDSTextInput
        label="Email"
        value={text}
        onChangeText={setText}
        errorText={text === 'bad' ? 'Invalid email' : undefined}
        placeholder="Enter email"
      />
      <SSDSSearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search notes"
      />
      <SSDSCheckbox
        checked={checked}
        onChange={setChecked}
        label="Daily reminder"
      />
      <SSDSRadio
        checked={radio === 'a'}
        onPress={() => setRadio('a')}
        label="Option A"
      />
      <SSDSRadio
        checked={radio === 'b'}
        onPress={() => setRadio('b')}
        label="Option B"
      />
      <SSDSSwitch
        checked={sw}
        onChange={setSw}
        label="High contrast"
      />
      <SSDSSlider
        label="Daily goal"
        value={slider}
        min={10}
        max={100}
        step={10}
        unit="m"
        onChange={setSlider}
      />
      <SSDSSelect
        label="Target Exam"
        value={selected}
        options={[
          { label: 'UPSC CSE', value: 'upsc' },
          { label: 'SSC CGL', value: 'ssc' },
        ]}
        onChange={setSelected}
      />
      <SSDSSegmentedControl
        value={segment}
        options={[
          { label: 'All', value: 'all' },
          { label: 'PYQ', value: 'pyq' },
        ]}
        onChange={setSegment}
      />
      <SSDSBadge variant="success">Verified</SSDSBadge>
      <SSDSProgressBar value={65} showLabel />
      <SSDSCircularProgress value={75} showValue />
      <SSDSToast type="info" title="Heads up" message="Static toast" />
      <SSDSSnackbar
        message="Archived note"
        actionLabel="Undo"
        onAction={onSnackbarAction}
      />

      <SSDSButton onPress={() => showToast({ type: 'success', title: 'Saved', message: 'Toast ok' })}>
        Trigger Toast
      </SSDSButton>
      <SSDSButton onPress={() => showSnackbar({ message: 'Synced', actionLabel: 'Retry', onAction: onSnackbarAction })}>
        Trigger Snackbar
      </SSDSButton>
      <SSDSButton onPress={() => setDialogOpen(true)}>
        Open Dialog
      </SSDSButton>
      <SSDSButton onPress={() => setSheetOpen(true)}>
        Open Sheet
      </SSDSButton>

      <SSDSDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Confirm Reset"
        description="Reset current filter?"
        primaryAction={{
          label: 'Confirm',
          onPress: () => {
            onDialogConfirm();
            setDialogOpen(false);
          },
        }}
      />

      <SSDSBottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filter Options"
      >
        <Text>Sheet Body</Text>
      </SSDSBottomSheet>
    </>
  );
}

describe('SSDS Phase 3 Interactive Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
  });

  it('supports Button, IconButton, Forms, Selection, Feedback, and Overlays with zero SSDS AsyncStorage writes', async () => {
    const onButtonPress = jest.fn();
    const onDisabledPress = jest.fn();
    const onLoadingPress = jest.fn();
    const onIconPress = jest.fn();
    const onDialogConfirm = jest.fn();
    const onSnackbarAction = jest.fn();

    const screen = render(
      <Providers>
        <InteractiveShowcase
          onButtonPress={onButtonPress}
          onDisabledPress={onDisabledPress}
          onLoadingPress={onLoadingPress}
          onIconPress={onIconPress}
          onDialogConfirm={onDialogConfirm}
          onSnackbarAction={onSnackbarAction}
        />
      </Providers>,
    );

    // Buttons & IconButton
    fireEvent.press(screen.getByText('Save Goal'));
    expect(onButtonPress).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('Disabled Action'));
    fireEvent.press(screen.getByText('Loading Action'));
    expect(onDisabledPress).not.toHaveBeenCalled();
    expect(onLoadingPress).not.toHaveBeenCalled();

    const iconBtn = screen.getByLabelText('Open settings');
    expect(iconBtn.props.hitSlop).toBeGreaterThanOrEqual(6);
    fireEvent.press(iconBtn);
    expect(onIconPress).toHaveBeenCalledTimes(1);

    // Forms: TextInput, SearchInput, Checkbox, Radio, Switch, Slider
    fireEvent.changeText(screen.getByPlaceholderText('Enter email'), 'bad');
    expect(screen.getByText('Invalid email')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Clear search'));
    expect(screen.getByPlaceholderText('Search notes').props.value).toBe('');

    fireEvent.press(screen.getByText('Daily reminder'));
    expect(screen.getByRole('checkbox').props.accessibilityState.checked).toBe(true);

    fireEvent.press(screen.getByText('Option B'));
    expect(screen.getByLabelText('Option B').props.accessibilityState.selected).toBe(true);

    fireEvent.press(screen.getByRole('switch'));
    expect(screen.getByRole('switch').props.accessibilityState.checked).toBe(true);

    fireEvent(screen.getByLabelText('Daily goal'), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
    expect(screen.getByText('60m')).toBeTruthy();

    // Selection: Select & SegmentedControl
    fireEvent.press(screen.getByLabelText('Target Exam'));
    fireEvent.press(screen.getByText('SSC CGL'));
    expect(screen.getByText('SSC CGL')).toBeTruthy();

    fireEvent.press(screen.getByText('PYQ'));
    const tabs = screen.getAllByRole('tab');
    expect(tabs[1].props.accessibilityState.selected).toBe(true);

    // Feedback: Badge, ProgressBar, CircularProgress, Toast, Snackbar
    expect(screen.getByText('Verified')).toBeTruthy();
    expect(screen.getByText('65%')).toBeTruthy();
    expect(screen.getByText('75%')).toBeTruthy();

    act(() => {
      fireEvent.press(screen.getByText('Trigger Toast'));
    });
    await waitFor(() => {
      expect(screen.getByText('Toast ok')).toBeTruthy();
    });

    act(() => {
      fireEvent.press(screen.getByText('Trigger Snackbar'));
    });
    await waitFor(() => {
      expect(screen.getByText('Synced')).toBeTruthy();
    });

    // Overlays: Dialog & BottomSheet
    fireEvent.press(screen.getByText('Open Dialog'));
    expect(screen.getByText('Confirm Reset')).toBeTruthy();
    fireEvent.press(screen.getByText('Confirm'));
    expect(onDialogConfirm).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('Open Sheet'));
    expect(screen.getByText('Filter Options')).toBeTruthy();
    expect(screen.getByText('Sheet Body')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Close bottom sheet'));

    expect(mockGetItem).not.toHaveBeenCalledWith('ssds_appearance_v1');
    expect(mockGetItem).not.toHaveBeenCalledWith('ssds_custom_presets_v1');
    expect(mockSetItem).not.toHaveBeenCalledWith('ssds_appearance_v1', expect.anything());
    expect(mockSetItem).not.toHaveBeenCalledWith('ssds_custom_presets_v1', expect.anything());
  });
});
