import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { PlannerDashboardAction, CustomStudyPlan } from '../components/DashboardStudyTools';
import { Shell } from '../components/Shell';
import { Button, Card, SectionHeader, Txt } from '../components/ui';
import { TODAY_PLAN } from '../lib/data';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';

type SettingsPanel = 'targets' | 'times' | 'preferences';
const STUDY_TIMES = ['Morning', 'Afternoon', 'Evening'] as const;
const CUSTOM_TIME_PATTERN = /^Custom (\d{2}:\d{2})-(\d{2}:\d{2})$/;

function isValidTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(':').map(Number);
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
}

export default function StudyPlannerScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const { state, dispatch } = useStore();
  const settings = state.plannerSettings;
  const [panel, setPanel] = useState<SettingsPanel | null>(null);
  const [dailyHours, setDailyHours] = useState(String(settings.dailyTargetHours));
  const [weeklyHours, setWeeklyHours] = useState(String(settings.weeklyTargetHours));
  const [preferredTimes, setPreferredTimes] = useState<string[]>(settings.preferredStudyTimes);
  const [customTimeEnabled, setCustomTimeEnabled] = useState(false);
  const [customStart, setCustomStart] = useState('08:00');
  const [customEnd, setCustomEnd] = useState('10:00');
  const [autoScheduling, setAutoScheduling] = useState(settings.autoScheduling);
  const [aiSuggestions, setAiSuggestions] = useState(settings.aiSuggestions);
  const [error, setError] = useState('');

  const openPanel = (next: SettingsPanel) => {
    setDailyHours(String(settings.dailyTargetHours));
    setWeeklyHours(String(settings.weeklyTargetHours));
    setPreferredTimes(settings.preferredStudyTimes.filter((item) => STUDY_TIMES.includes(item as (typeof STUDY_TIMES)[number])));
    const customTime = settings.preferredStudyTimes.find((item) => CUSTOM_TIME_PATTERN.test(item));
    const match = customTime?.match(CUSTOM_TIME_PATTERN);
    setCustomTimeEnabled(Boolean(match));
    setCustomStart(match?.[1] ?? '08:00');
    setCustomEnd(match?.[2] ?? '10:00');
    setAutoScheduling(settings.autoScheduling);
    setAiSuggestions(settings.aiSuggestions);
    setError('');
    setPanel(next);
  };

  const cancelPanel = () => {
    setError('');
    setPanel(null);
  };

  const savePanel = () => {
    if (panel === 'targets') {
      const daily = Number(dailyHours);
      const weekly = Number(weeklyHours);
      if (!Number.isFinite(daily) || daily < 0.5 || daily > 12) {
        setError('Daily target must be between 0.5 and 12 hours.');
        return;
      }
      if (!Number.isFinite(weekly) || weekly < 1 || weekly > 84) {
        setError('Weekly target must be between 1 and 84 hours.');
        return;
      }
      dispatch({ type: 'plannerSettings', patch: { dailyTargetHours: daily, weeklyTargetHours: weekly } });
    } else if (panel === 'times') {
      if (customTimeEnabled) {
        if (!isValidTime(customStart) || !isValidTime(customEnd)) {
          setError('Enter a valid custom time range using HH:MM.');
          return;
        }
        const [startHour, startMinute] = customStart.split(':').map(Number);
        const [endHour, endMinute] = customEnd.split(':').map(Number);
        if (endHour * 60 + endMinute <= startHour * 60 + startMinute) {
          setError('The end time must be later than the start time.');
          return;
        }
      }
      const custom = customTimeEnabled ? [`Custom ${customStart}-${customEnd}`] : [];
      dispatch({
        type: 'plannerSettings',
        patch: { preferredStudyTimes: [...new Set([...preferredTimes, ...custom])] },
      });
    } else if (panel === 'preferences') {
      dispatch({
        type: 'plannerSettings',
        patch: { autoScheduling, aiSuggestions },
      });
    }
    setPanel(null);
    setError('');
  };

  const dashboardActions: PlannerDashboardAction[] = [
    { title: 'Study Targets', icon: 'flag-outline', color: colors.blue, onPress: () => openPanel('targets') },
    { title: 'Preferred Study Time', icon: 'time-outline', color: colors.teal, onPress: () => openPanel('times') },
    { title: 'Planner Preferences', icon: 'options-outline', color: colors.violet, onPress: () => openPanel('preferences') },
  ];

  const openPlanItem = (item: (typeof TODAY_PLAN)[number]) => {
    if (item.kind === 'note') {
      nav.navigate('NoteEditor', { resourceId: item.refId });
    } else if (item.kind === 'pyq') {
      nav.navigate('PYQ', { subject: item.refId });
    } else if (item.kind === 'ca') {
      nav.navigate('CurrentAffairs');
    } else {
      nav.navigate('TestPlayer', { testId: item.refId });
    }
  };

  const toggleStudyTime = (time: string) => {
    setPreferredTimes((current) =>
      current.includes(time) ? current.filter((value) => value !== time) : [...current, time]
    );
  };

  const toggleRow = (title: string, value: boolean, onChange: (value: boolean) => void, description: string) => (
    <View style={{ minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12 }}>
      <View style={{ flex: 1 }}>
        <Txt size={14} weight="700">{title}</Txt>
        <Txt size={12} color={colors.textMuted} style={{ marginTop: 3 }}>{description}</Txt>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.blue, false: colors.border }}
        thumbColor="#FFFFFF"
        accessibilityLabel={title}
      />
    </View>
  );

  return (
    <Shell active="StudyPlanner" title="Study Planner" subtitle="Your study plan and planner controls">
      {state.plannerPersistenceError ? (
        <Card>
          <Txt size={13} weight="700" color={colors.danger}>Changes could not be saved</Txt>
          <Txt size={12} color={colors.textMuted} style={{ marginTop: 4 }}>
            {state.plannerPersistenceError}
          </Txt>
        </Card>
      ) : null}
      <CustomStudyPlan
        plan={TODAY_PLAN.filter((task) => task.id !== 'tp4')}
        planDone={state.planDone}
        tasks={state.plannerTasks}
        tasksLoaded={state.plannerTasksLoaded}
        taskLoadError={state.plannerTaskLoadError}
        persistenceError={state.plannerPersistenceError}
        defaultOverrides={state.plannerDefaultOverrides}
        deletedDefaults={state.plannerDeletedDefaults}
        dispatch={dispatch}
        onOpenItem={openPlanItem}
        onOpenFocus={() => nav.navigate('FocusCenter')}
        dashboardMode
        dashboardActions={dashboardActions}
      />

      <Modal
        visible={panel !== null}
        transparent
        animationType="slide"
        onRequestClose={cancelPanel}
      >
        <View style={{ flex: 1, justifyContent: 'center', padding: 16, backgroundColor: colors.overlay }}>
          <View style={{ width: '100%', maxWidth: 560, maxHeight: '90%', alignSelf: 'center', backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Txt size={19} weight="800" style={{ flex: 1 }}>
                  {panel === 'targets' ? 'Study Targets' : panel === 'times' ? 'Preferred Study Time' : 'Planner Preferences'}
                </Txt>
                <Pressable onPress={cancelPanel} accessibilityRole="button" accessibilityLabel="Close settings" hitSlop={8} style={{ padding: 6 }}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </Pressable>
              </View>

              {panel === 'targets' ? (
                <View style={{ gap: 16 }}>
                  <View style={{ gap: 7 }}>
                    <Txt size={13} weight="700">Daily study target (hours)</Txt>
                    <TextInput
                      value={dailyHours}
                      onChangeText={setDailyHours}
                      keyboardType="decimal-pad"
                      accessibilityLabel="Daily study target in hours"
                      placeholder="For example, 3"
                      placeholderTextColor={colors.textFaint}
                      style={{ color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13 }}
                    />
                    <Txt size={11} color={colors.textMuted}>Choose a value from 0.5 to 12 hours.</Txt>
                  </View>
                  <View style={{ gap: 7 }}>
                    <Txt size={13} weight="700">Weekly study target (hours)</Txt>
                    <TextInput
                      value={weeklyHours}
                      onChangeText={setWeeklyHours}
                      keyboardType="decimal-pad"
                      accessibilityLabel="Weekly study target in hours"
                      placeholder="For example, 15"
                      placeholderTextColor={colors.textFaint}
                      style={{ color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13 }}
                    />
                    <Txt size={11} color={colors.textMuted}>Choose a value from 1 to 84 hours.</Txt>
                  </View>
                </View>
              ) : null}

              {panel === 'times' ? (
                <View style={{ gap: 16 }}>
                  <Txt size={12} color={colors.textMuted}>
                    Select one or more times when you are available to study.
                  </Txt>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {STUDY_TIMES.map((time) => {
                      const selected = preferredTimes.includes(time);
                      return (
                        <Pressable
                          key={time}
                          onPress={() => toggleStudyTime(time)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: selected }}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 12, borderWidth: 1, borderColor: selected ? colors.blue : colors.border, backgroundColor: selected ? colors.tint : colors.bg, paddingHorizontal: 13, paddingVertical: 10 }}
                        >
                          <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={17} color={selected ? colors.blue : colors.textMuted} />
                          <Txt size={12} weight="700" color={selected ? colors.blue : colors.text}>{time}</Txt>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Card style={{ gap: 12 }} level={1}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Txt size={13} weight="700">Custom time range</Txt>
                        <Txt size={11} color={colors.textMuted}>Use 24-hour time.</Txt>
                      </View>
                      <Switch
                        value={customTimeEnabled}
                        onValueChange={setCustomTimeEnabled}
                        trackColor={{ true: colors.blue, false: colors.border }}
                        thumbColor="#FFFFFF"
                        accessibilityLabel="Enable custom study time range"
                      />
                    </View>
                    {customTimeEnabled ? (
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1, gap: 5 }}>
                          <Txt size={11} color={colors.textMuted}>Start</Txt>
                          <TextInput
                            value={customStart}
                            onChangeText={setCustomStart}
                            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                            accessibilityLabel="Custom study time start"
                            placeholder="08:00"
                            placeholderTextColor={colors.textFaint}
                            style={{ color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 11 }}
                          />
                        </View>
                        <View style={{ flex: 1, gap: 5 }}>
                          <Txt size={11} color={colors.textMuted}>End</Txt>
                          <TextInput
                            value={customEnd}
                            onChangeText={setCustomEnd}
                            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                            accessibilityLabel="Custom study time end"
                            placeholder="10:00"
                            placeholderTextColor={colors.textFaint}
                            style={{ color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 11 }}
                          />
                        </View>
                      </View>
                    ) : null}
                  </Card>
                </View>
              ) : null}

              {panel === 'preferences' ? (
                <View>
                  {toggleRow(
                    'Auto Scheduling',
                    autoScheduling,
                    setAutoScheduling,
                    'Use availability, task duration, priority, and due dates when scheduling is supported. Existing tasks will not be moved without confirmation.',
                  )}
                  <View style={{ height: 1, backgroundColor: colors.border }} />
                  {toggleRow(
                    'AI Suggestions',
                    aiSuggestions,
                    setAiSuggestions,
                    'Save your preference for future secure AI integration. No AI results are shown now.',
                  )}
                </View>
              ) : null}

              {error ? (
                <View accessibilityRole="alert" style={{ marginTop: 14 }}>
                  <Txt size={12} color={colors.danger}>{error}</Txt>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                <Button label="Cancel" variant="outline" onPress={cancelPanel} />
                <Button label="Save" onPress={savePanel} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Shell>
  );
}
