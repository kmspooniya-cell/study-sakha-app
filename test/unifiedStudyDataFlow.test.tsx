import './mocks/native';
import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { FocusSessionSetupModal, type FocusSessionSetup } from '../components/FocusSessionSetupModal';
import GeminiFocusTimer from '../components/GeminiFocusTimer';
import { StoreProvider, useStore } from '../lib/store';
import { ThemeProvider } from '../lib/theme';
import { deriveStatistics } from '../lib/statistics';
import { getScheduleOccurrenceFocusedSeconds } from '../lib/planner';
import { PREDEFINED_FOCUS_ACTIVITIES } from '../lib/focusSetup';

const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderWithProviders(node: React.ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <StoreProvider>
        <ThemeProvider mode="light">{node}</ThemeProvider>
      </StoreProvider>
    </SafeAreaProvider>,
  );
}

function SetupHarness({
  initialSetup,
  onContinue,
  onOpenSubjectPreferences,
  preferredSubjects = [],
}: {
  initialSetup: FocusSessionSetup;
  onContinue: jest.Mock;
  onOpenSubjectPreferences?: jest.Mock;
  preferredSubjects?: string[];
}) {
  const [setup, setSetup] = React.useState<FocusSessionSetup>(initialSetup);
  const { dispatch } = useStore();
  React.useEffect(() => {
    if (preferredSubjects.length > 0) {
      dispatch({ type: 'settings', patch: { preferredSubjects } });
    }
  }, [dispatch, preferredSubjects]);
  return (
    <FocusSessionSetupModal
      visible
      value={setup}
      onChange={setSetup}
      onClose={jest.fn()}
      onContinue={onContinue}
      onOpenSubjectPreferences={onOpenSubjectPreferences}
    />
  );
}

describe('Unified Study Data Flow', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('Tag Manually shows Subject & Activity tabs, uses only Subject Preferences, and enforces mutual exclusivity', async () => {
    const onContinue = jest.fn();
    const view = renderWithProviders(
      <SetupHarness
        preferredSubjects={['Rajasthan History', 'Indian Polity']}
        initialSetup={{ mode: 'timer', durationMinutes: 25, selection: null, tag: '', task: null }}
        onContinue={onContinue}
      />,
    );

    fireEvent.press(view.getByText('Tag Manually'));
    expect(view.getByText('Subject')).toBeTruthy();
    expect(view.getByText('Activity')).toBeTruthy();
    expect(view.getByText('Rajasthan History')).toBeTruthy();
    expect(view.getByText('Indian Polity')).toBeTruthy();
    // Hardcoded fallback subjects must NOT appear
    expect(view.queryByText('Rajasthan Geography')).toBeNull();
    expect(view.queryByText('Work')).toBeNull();

    // Select Rajasthan History, switch to Activity, switch back -> preserved
    fireEvent.press(view.getByText('Rajasthan History'));
    fireEvent.press(view.getByText('Activity'));
    for (const act of PREDEFINED_FOCUS_ACTIVITIES) {
      expect(view.getByText(act)).toBeTruthy();
    }
    fireEvent.press(view.getByText('Subject'));
    fireEvent.press(view.getByText('Confirm'));

    expect(view.getByText('Subject: Rajasthan History')).toBeTruthy();
    fireEvent.press(view.getByText('Continue to Full Focus'));
    expect(onContinue).toHaveBeenCalledWith(
      expect.objectContaining({
        selection: 'manual',
        tag: 'Rajasthan History',
        tagType: 'subject',
        durationMinutes: 25,
      }),
    );
  });

  it('Tag Manually shows empty state with Open Subject Preferences when no subjects are selected', () => {
    const onOpenSubjectPreferences = jest.fn();
    const view = renderWithProviders(
      <SetupHarness
        preferredSubjects={[]}
        initialSetup={{ mode: 'timer', durationMinutes: 25, selection: null, tag: '', task: null }}
        onContinue={jest.fn()}
        onOpenSubjectPreferences={onOpenSubjectPreferences}
      />,
    );

    fireEvent.press(view.getByText('Tag Manually'));
    expect(view.getByText('No subjects selected in Subject Preferences')).toBeTruthy();
    fireEvent.press(view.getByText('Open Subject Preferences'));
    expect(onOpenSubjectPreferences).toHaveBeenCalledTimes(1);
  });

  it('Tag Manually Activity tab supports selecting Meditation and adding a custom activity without duplicates', () => {
    const onContinue = jest.fn();
    const view = renderWithProviders(
      <SetupHarness
        preferredSubjects={['Rajasthan History']}
        initialSetup={{ mode: 'timer', durationMinutes: 25, selection: null, tag: '', task: null }}
        onContinue={onContinue}
      />,
    );

    fireEvent.press(view.getByText('Tag Manually'));
    fireEvent.press(view.getByText('Activity'));
    fireEvent.press(view.getByText('Meditation'));
    fireEvent.press(view.getByText('Confirm'));

    expect(view.getByText('Activity: Meditation')).toBeTruthy();
    fireEvent.press(view.getByText('Continue to Full Focus'));
    expect(onContinue).toHaveBeenCalledWith(
      expect.objectContaining({
        selection: 'manual',
        tag: 'Meditation',
        tagType: 'activity',
      }),
    );
  });

  it('Tag Manually Cancel does not overwrite existing selection', () => {
    const view = renderWithProviders(
      <SetupHarness
        preferredSubjects={['Rajasthan History', 'Indian Polity']}
        initialSetup={{ mode: 'timer', durationMinutes: 25, selection: 'manual', tag: 'Rajasthan History', tagType: 'subject', task: null }}
        onContinue={jest.fn()}
      />,
    );

    fireEvent.press(view.getByText('Tag Manually'));
    fireEvent.press(view.getByText('Indian Polity'));
    fireEvent.press(view.getByText('Cancel'));
    expect(view.getByText('Subject: Rajasthan History')).toBeTruthy();
  });

  it('GeminiFocusTimer renders informational tag text without dropdown or hardcoded subjects', () => {
    const view = renderWithProviders(
      <GeminiFocusTimer
        timer={{
          totalSeconds: 1500,
          remainingSeconds: 1500,
          running: true,
          isBreak: false,
          sessionLabel: '25-minute Focus',
          modeLabel: 'TIMER',
        }}
        subject="No subject or activity selected"
        groupName="Group"
        onPause={jest.fn()}
        onStop={jest.fn()}
        onBreak={jest.fn()}
        onReset={jest.fn()}
        onGroupPress={jest.fn()}
        onMusicPress={jest.fn()}
        blockedAppsCount={0}
        onManageBlockedApps={jest.fn()}
      />,
    );

    expect(view.getByText('No subject or activity selected')).toBeTruthy();
    expect(view.queryByText('Choose Study Sakha subject…')).toBeNull();
  });

  it('deriveStatistics separates Subjects from Activities, excludes incomplete sessions, and deduplicates by id', () => {
    const today = new Date().toISOString().slice(0, 10);
    const sessions = [
      {
        id: 's1',
        sessionId: 's1',
        completedAt: `${today}T10:00:00.000Z`,
        date: today,
        tagType: 'subject',
        subject: 'Rajasthan History',
        actualSeconds: 1500,
        focusedSeconds: 1500,
        status: 'completed',
      },
      {
        id: 's1',
        sessionId: 's1',
        completedAt: `${today}T10:00:00.000Z`,
        date: today,
        tagType: 'subject',
        subject: 'Rajasthan History',
        actualSeconds: 1500,
        focusedSeconds: 1500,
        status: 'completed',
      },
      {
        id: 'a1',
        sessionId: 'a1',
        completedAt: `${today}T11:00:00.000Z`,
        date: today,
        tagType: 'activity',
        activity: 'Meditation',
        sessionType: 'meditation',
        actualSeconds: 600,
        focusedSeconds: 600,
        status: 'completed',
      },
      {
        id: 'inc1',
        sessionId: 'inc1',
        completedAt: `${today}T12:00:00.000Z`,
        date: today,
        tagType: 'subject',
        subject: 'Indian Polity',
        actualSeconds: 300,
        focusedSeconds: 300,
        status: 'interrupted',
      },
    ];

    const stats = deriveStatistics(
      {
        planDone: {},
        plannerTasks: [],
        plannerScheduleItems: [],
        plannerScheduleCompletions: {},
        plannerDefaultOverrides: {},
        plannerDeletedDefaults: [],
        focusHistory: [],
        plannerTaskStudySeconds: {},
      } as never,
      sessions,
      { startDate: today, endDate: today },
    );

    expect(stats.subjects.map((s) => s.subject)).toEqual(['Rajasthan History']);
    expect(stats.subjects[0].actualMinutes).toBe(25);
    expect(stats.activities.map((a) => a.activity)).toEqual(['Meditation']);
    expect(stats.activities[0].actualMinutes).toBe(10);
    expect(stats.overall.focusSessionCount).toBe(2);
  });

  it('getScheduleOccurrenceFocusedSeconds credits only matching task without duplicates', () => {
    const state = {
      plannerTaskStudySeconds: {},
      focusHistory: [
        {
          id: 'f1',
          sessionId: 'f1',
          completedAt: '2026-11-27T10:00:00.000Z',
          date: '2026-11-27',
          taskId: 'plan-1::2026-11-27',
          scheduleId: 'plan-1',
          scheduleOccurrenceId: 'plan-1::2026-11-27',
          focusedSeconds: 900,
          actualSeconds: 900,
          status: 'completed',
          sessionType: 'study',
        },
        {
          id: 'f1',
          sessionId: 'f1',
          completedAt: '2026-11-27T10:00:00.000Z',
          date: '2026-11-27',
          taskId: 'plan-1::2026-11-27',
          scheduleId: 'plan-1',
          scheduleOccurrenceId: 'plan-1::2026-11-27',
          focusedSeconds: 900,
          actualSeconds: 900,
          status: 'completed',
          sessionType: 'study',
        },
        {
          id: 'f2',
          sessionId: 'f2',
          completedAt: '2026-11-27T11:00:00.000Z',
          date: '2026-11-27',
          focusedSeconds: 600,
          actualSeconds: 600,
          status: 'completed',
          sessionType: 'study',
        },
      ],
    } as never;

    const seconds = getScheduleOccurrenceFocusedSeconds(
      state,
      { id: 'plan-1', category: 'Tasks', title: 'Polity' } as never,
      '2026-11-27',
    );
    expect(seconds).toBe(900);
  });
});
