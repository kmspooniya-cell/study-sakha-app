import Ionicons from '@expo/vector-icons/Ionicons';
import { NavigationContext } from '@react-navigation/native';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Txt } from './ui';
import type { PlannerScheduleItem, PlannerTask, State } from '../lib/store';
import { useStore } from '../lib/store';
import {
  getPlannerScheduleOccurrence,
  getPlannerScheduleOccurrences,
  PlannerScheduleOccurrence,
} from '../lib/planner';
import {
  calculateScheduleFocusDuration,
  FOCUS_DURATION_PRESETS,
  isFocusDurationPreset,
  MAX_FOCUS_DURATION_MINUTES,
  MIN_FOCUS_DURATION_MINUTES,
  PREDEFINED_FOCUS_ACTIVITIES,
  validateCustomFocusDuration,
} from '../lib/focusSetup';
import { useTheme } from '../lib/theme';
import { getPreferredSubjectOptions, normalizeSubjectList } from '../lib/subjectRegistry';

export type FocusSessionMode = 'timer' | 'stopwatch' | 'pomodoro';
export type FocusSessionSelection = 'schedule' | 'manual' | null;
export type FocusSessionTagType = 'subject' | 'activity';
export type FocusSessionSetup = {
  mode: FocusSessionMode;
  durationMinutes: number;
  selection: FocusSessionSelection;
  tag: string;
  tagType?: FocusSessionTagType;
  task: PlannerTask | PlannerScheduleItem | null;
  scheduleOccurrenceId?: string;
  startInBreak?: boolean;
};

type SetupSubView = 'setup' | 'schedule' | 'tag';
type TagModalTab = 'subject' | 'activity';
type ScheduleTabStatus = 'upcoming' | 'missed' | 'completed';

function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getSetupTaskTitle(task: PlannerTask | PlannerScheduleItem): string {
  return 'label' in task ? task.label : task.title;
}

function getSetupTaskMeta(task: PlannerTask | PlannerScheduleItem): string {
  if ('label' in task) return `${task.category} · ${task.targetDate}`;
  const date = task.date || task.fromDate || '';
  const time = task.startTime || task.time;
  const subject = task.subject || task.category;
  return [subject, date, time].filter(Boolean).join(' · ');
}

function getTaskOccurrenceDate(
  task: PlannerTask | PlannerScheduleItem,
  scheduleOccurrenceId: string | undefined,
  fallbackDate: string,
): string {
  if (scheduleOccurrenceId) {
    const separator = scheduleOccurrenceId.lastIndexOf('::');
    if (separator !== -1) {
      const parsedDate = scheduleOccurrenceId.slice(separator + 2);
      if (/^\d{4}-\d{2}-\d{2}$/.test(parsedDate)) return parsedDate;
    }
  }
  if ('label' in task) return task.targetDate || fallbackDate;
  return task.date || task.fromDate || fallbackDate;
}

function formatPlanDuration(seconds: number | null) {
  if (seconds === null) return 'No planned time';
  const minutes = Math.round(seconds / 60);
  if (minutes <= 0) return '0m';
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ''}`.trim()
    : `${minutes}m`;
}

function SchedulePlanList({
  state,
  search,
  status,
  selectedOccurrenceId,
  surfaceBg,
  colors,
  onSelect,
}: {
  state: State;
  search: string;
  status: ScheduleTabStatus;
  selectedOccurrenceId: string | null;
  surfaceBg: string;
  colors: ReturnType<typeof useTheme>['colors'];
  onSelect: (occurrence: PlannerScheduleOccurrence) => void;
}) {
  const query = search.trim().toLowerCase();
  const today = new Date();
  const todayKey = toLocalDateKey(today);
  const firstDay = new Date(today);
  firstDay.setDate(firstDay.getDate() - 90);
  const lastDay = new Date(today);
  lastDay.setDate(lastDay.getDate() + 365);
  const occurrences = getPlannerScheduleOccurrences(
    state,
    toLocalDateKey(firstDay),
    toLocalDateKey(lastDay),
    todayKey,
  );
  const filtered = occurrences
    .filter((occurrence) => {
      if (occurrence.status !== status) return false;
      const item = occurrence.item;
      if (!query) return true;
      return [item.title, item.subject, item.category, item.taskType, item.examType, item.activityType]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  if (filtered.length === 0) {
    const emptyTitle = status === 'missed'
      ? 'No missed plans'
      : status === 'completed'
        ? 'No completed plans'
        : 'No upcoming plans';
    const emptyMessage = status === 'missed'
      ? 'You’re all caught up with past plans.'
      : status === 'completed'
        ? 'Completed plans will appear here.'
        : 'Add a plan in Study Planner to see it here.';
    return (
      <View style={styles.scheduleEmptyState}>
        <Ionicons name="calendar-outline" size={24} color={colors.textMuted} />
        <Txt color={colors.text} size={14} weight="700">{emptyTitle}</Txt>
        <Txt color={colors.textMuted} size={12}>{emptyMessage}</Txt>
      </View>
    );
  }

  return (
    <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {filtered.map((occurrence) => {
        const { item } = occurrence;
        const selected = selectedOccurrenceId === occurrence.id;
        const time = item.startTime || item.time;
        const subject = item.subject || item.category;
        const summary = calculateScheduleFocusDuration(occurrence);
        const duration = formatPlanDuration(summary.plannedSeconds);
        const actual = formatPlanDuration(summary.actualFocusedSeconds);
        const remainingText = summary.remainingSeconds === null
          ? null
          : summary.remainingSeconds === 0
            ? '0m left'
            : `${formatPlanDuration(summary.remainingSeconds)} left`;
        return (
          <Pressable
            key={occurrence.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSelect(occurrence)}
            style={[
              styles.modalTagItem,
              {
                backgroundColor: surfaceBg,
                borderWidth: selected ? 1.5 : 1,
                borderColor: selected ? colors.blue : colors.border,
              },
            ]}
          >
            <View style={{ flex: 1, marginRight: 10 }}>
              <Txt color={colors.text} size={14} weight="700">{item.title}</Txt>
              <Txt color={colors.textMuted} size={11} style={{ marginTop: 3 }}>
                {[occurrence.date, subject, time].filter(Boolean).join(' · ')}
              </Txt>
              <Txt color={colors.textMuted} size={11} style={{ marginTop: 3 }}>
                {[
                  `Planned ${duration}`,
                  `Focused ${actual}`,
                  remainingText,
                  `${occurrence.progressPercent}%`,
                ].filter(Boolean).join(' · ')}
              </Txt>
            </View>
            <Txt
              color={summary.isTaskComplete ? colors.textMuted : colors.blue}
              size={11}
              weight="800"
            >
              {summary.isTaskComplete ? 'Completed' : summary.actualFocusedSeconds > 0 ? 'Continue' : 'Start Focus'}
            </Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

type Props = {
  visible: boolean;
  value: FocusSessionSetup;
  onChange: (value: FocusSessionSetup) => void;
  onClose: () => void;
  onContinue: (value: FocusSessionSetup) => void;
  onOpenSubjectPreferences?: () => void;
};

export function FocusSessionSetupModal({
  visible,
  value,
  onChange,
  onClose,
  onContinue,
  onOpenSubjectPreferences,
}: Props) {
  const { colors, scheme } = useTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useStore();
  const navigation = useContext(NavigationContext);
  const [subView, setSubView] = useState<SetupSubView>('setup');
  const [scheduleStatusTab, setScheduleStatusTab] = useState<ScheduleTabStatus>('upcoming');
  const [tagTab, setTagTab] = useState<TagModalTab>('subject');
  const [draftSubject, setDraftSubject] = useState('');
  const [draftActivity, setDraftActivity] = useState('');
  const [customTagInput, setCustomTagInput] = useState('');
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [customActive, setCustomActive] = useState(
    () => value.selection === 'schedule' || !isFocusDurationPreset(value.durationMinutes),
  );
  const [customDurationText, setCustomDurationText] = useState(
    () => ((value.selection === 'schedule' || !isFocusDurationPreset(value.durationMinutes)) && value.durationMinutes > 0
      ? String(value.durationMinutes)
      : ''),
  );
  const customInputRef = useRef<TextInput | null>(null);
  const wasVisibleRef = useRef(false);

  const isDark = scheme === 'dark';
  const surfaceBg = isDark ? '#18191C' : colors.surface;
  const surfaceAltBg = isDark ? '#202225' : colors.surfaceAlt;
  const dangerColor = colors.danger ?? '#EF4444';
  const warningColor = colors.warning ?? '#F59E0B';
  const overlayBg = colors.overlay ?? 'rgba(0,0,0,0.6)';

  useEffect(() => {
    const justOpened = visible && !wasVisibleRef.current;
    wasVisibleRef.current = visible;
    if (!visible) return;
    if (justOpened) {
      setSubView('setup');
      const shouldUseCustom = value.selection === 'schedule' || !isFocusDurationPreset(value.durationMinutes);
      setCustomActive(shouldUseCustom);
      setCustomDurationText(
        shouldUseCustom && value.durationMinutes >= 0 ? String(value.durationMinutes) : '',
      );
    }
  }, [value.durationMinutes, value.selection, visible]);

  const close = () => {
    Keyboard.dismiss();
    setSubView('setup');
    onClose();
  };

  const handleRequestClose = () => {
    if (subView !== 'setup') {
      setSubView('setup');
      return;
    }
    close();
  };

  const update = (patch: Partial<FocusSessionSetup>) => onChange({ ...value, ...patch });

  const todayKey = toLocalDateKey(new Date());
  const selectedScheduleSummary = useMemo(() => {
    if (value.selection !== 'schedule' || !value.task || !('title' in value.task)) return null;
    const occurrenceDate = getTaskOccurrenceDate(value.task, value.scheduleOccurrenceId, todayKey);
    const occurrence = getPlannerScheduleOccurrence(state, value.task, occurrenceDate, todayKey);
    return calculateScheduleFocusDuration(occurrence);
  }, [state, todayKey, value.scheduleOccurrenceId, value.selection, value.task]);

  const customValidation = useMemo(
    () => validateCustomFocusDuration(customDurationText),
    [customDurationText],
  );

  const isDurationRequired = value.mode !== 'stopwatch';
  const isDurationValid = !isDurationRequired || (
    customActive
      ? customValidation.valid && value.durationMinutes === customValidation.minutes
      : Number.isInteger(value.durationMinutes) &&
        value.durationMinutes >= MIN_FOCUS_DURATION_MINUTES &&
        value.durationMinutes <= MAX_FOCUS_DURATION_MINUTES
  );

  const handleSelectPreset = (minutes: number) => {
    Keyboard.dismiss();
    setCustomActive(false);
    setCustomDurationText('');
    update({ durationMinutes: minutes });
  };

  const handlePressCustom = () => {
    setCustomActive(true);
    if (!customDurationText.trim() && !isFocusDurationPreset(value.durationMinutes) && value.durationMinutes > 0) {
      setCustomDurationText(String(value.durationMinutes));
    }
    setTimeout(() => customInputRef.current?.focus(), 20);
  };

  const handleChangeCustomDuration = (rawText: string) => {
    const sanitized = rawText.replace(/[^0-9]/g, '');
    setCustomActive(true);
    setCustomDurationText(sanitized);
    const result = validateCustomFocusDuration(sanitized);
    if (result.valid) {
      update({ durationMinutes: result.minutes });
    }
  };

  const handleSelectOccurrence = (occurrence: PlannerScheduleOccurrence) => {
    const summary = calculateScheduleFocusDuration(occurrence);
    const taskSubject = occurrence.item.subject?.trim();
    const subjectTag = taskSubject || value.tag;
    const tagType: FocusSessionTagType | undefined = taskSubject
      ? 'subject'
      : value.tag
        ? (value.tagType ?? 'subject')
        : undefined;
    const nextDuration = summary.remainingMinutes !== null
      ? summary.remainingMinutes
      : value.durationMinutes;

    if (summary.remainingMinutes !== null) {
      setCustomActive(true);
      setCustomDurationText(String(summary.remainingMinutes));
    }

    update({
      task: occurrence.item,
      scheduleOccurrenceId: occurrence.id,
      selection: 'schedule',
      tag: subjectTag,
      tagType,
      durationMinutes: nextDuration,
    });
    setSubView('setup');
  };

  const preferredSubjectOptions = useMemo(
    () => getPreferredSubjectOptions(
      state.settings?.preferredSubjects ?? [],
      state.settings?.customSubjectPackages ?? [],
    ),
    [state.settings?.customSubjectPackages, state.settings?.preferredSubjects],
  );

  const activityOptions = useMemo(
    () => normalizeSubjectList([
      ...PREDEFINED_FOCUS_ACTIVITIES,
      ...(state.settings?.customActivities ?? []),
    ]),
    [state.settings?.customActivities],
  );

  const openTagManually = () => {
    const isManual = value.selection === 'manual';
    const currentType: TagModalTab = isManual && value.tagType === 'activity' ? 'activity' : 'subject';
    setTagTab(currentType);
    setDraftSubject(isManual && currentType === 'subject' ? value.tag : '');
    setDraftActivity(isManual && currentType === 'activity' ? value.tag : '');
    setCustomTagInput('');
    setSubView('tag');
  };

  const handleConfirmTag = () => {
    Keyboard.dismiss();
    if (draftActivity) {
      update({
        tag: draftActivity,
        tagType: 'activity',
        selection: 'manual',
        task: null,
        scheduleOccurrenceId: undefined,
      });
    } else if (draftSubject) {
      update({
        tag: draftSubject,
        tagType: 'subject',
        selection: 'manual',
        task: null,
        scheduleOccurrenceId: undefined,
      });
    }
    setCustomTagInput('');
    setSubView('setup');
  };

  const handleAddCustomActivity = () => {
    const clean = customTagInput.trim();
    if (!clean) return;
    const existingMatch = activityOptions.find(
      (item) => item.toLowerCase() === clean.toLowerCase(),
    );
    const resolved = existingMatch ?? clean;
    if (!existingMatch) {
      const nextCustom = normalizeSubjectList([...(state.settings?.customActivities ?? []), clean]);
      dispatch({ type: 'settings', patch: { customActivities: nextCustom } });
    }
    setDraftActivity(resolved);
    setDraftSubject('');
    setCustomTagInput('');
    Keyboard.dismiss();
  };

  const handleOpenSubjectPreferences = () => {
    close();
    if (onOpenSubjectPreferences) {
      onOpenSubjectPreferences();
      return;
    }
    navigation?.navigate({ name: 'Settings', params: { openDetail: 'preferred_subjects' } } as never);
  };

  const handleContinuePress = () => {
    if (!isDurationValid) return;
    Keyboard.dismiss();
    if (isDurationRequired && customActive) {
      if (!customValidation.valid) return;
      onContinue({ ...value, durationMinutes: customValidation.minutes });
      return;
    }
    onContinue(value);
  };

  const usableHeight = Math.max(280, height - insets.top - insets.bottom);
  const showZeroCompleteBanner = Boolean(
    selectedScheduleSummary?.isTaskComplete &&
    (value.durationMinutes === 0 || (customActive && customDurationText.trim() === '0')),
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleRequestClose}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardRoot}>
        <View style={[styles.bottomSheetBackdrop, { backgroundColor: overlayBg, paddingTop: insets.top }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close focus session setup backdrop"
            style={StyleSheet.absoluteFill}
            onPress={close}
          />
          <View
            style={[
              styles.bottomSheetCard,
              {
                maxHeight: usableHeight * 0.92,
                paddingBottom: Math.max(24, insets.bottom + 16),
                backgroundColor: surfaceBg,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.sheetHandleBar} />

            {subView === 'setup' ? (
              <>
                <View style={styles.sheetHeaderRow}>
                  <Txt color={colors.text} size={18} weight="800">Focus Session Setup</Txt>
                  <Pressable
                    onPress={close}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Close focus session setup"
                  >
                    <Ionicons name="close" size={20} color={colors.textMuted} />
                  </Pressable>
                </View>

                <ScrollView
                  style={styles.setupScroll}
                  contentContainerStyle={styles.setupScrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={[styles.modeTabsRow, { backgroundColor: surfaceAltBg, marginBottom: 16 }]}>
                    {(['timer', 'stopwatch', 'pomodoro'] as const).map((mode) => (
                      <Pressable
                        key={mode}
                        onPress={() => update({ mode })}
                        style={[styles.modeTabItem, value.mode === mode && { backgroundColor: surfaceBg }]}
                      >
                        <Txt
                          color={value.mode === mode ? colors.text : colors.textMuted}
                          size={13}
                          weight={value.mode === mode ? '800' : '600'}
                        >
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </Txt>
                      </Pressable>
                    ))}
                  </View>

                  <Txt color={colors.textMuted} size={11.5} weight="700" style={{ marginBottom: 6 }}>
                    SUBJECT OR TASK (OPTIONAL)
                  </Txt>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: value.selection === 'schedule' }}
                      onPress={() => setSubView('schedule')}
                      style={[
                        styles.studySourceButton,
                        {
                          backgroundColor: value.selection === 'schedule' ? `${colors.blue}18` : surfaceAltBg,
                          borderColor: value.selection === 'schedule' ? colors.blue : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={17}
                        color={value.selection === 'schedule' ? colors.blue : colors.textMuted}
                      />
                      <Txt
                        color={value.selection === 'schedule' ? colors.blue : colors.text}
                        size={12}
                        weight="700"
                        numberOfLines={1}
                      >
                        Add from Schedule
                      </Txt>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: value.selection === 'manual' }}
                      onPress={openTagManually}
                      style={[
                        styles.studySourceButton,
                        {
                          backgroundColor: value.selection === 'manual' ? `${colors.blue}18` : surfaceAltBg,
                          borderColor: value.selection === 'manual' ? colors.blue : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="pricetag-outline"
                        size={17}
                        color={value.selection === 'manual' ? colors.blue : colors.textMuted}
                      />
                      <Txt
                        color={value.selection === 'manual' ? colors.blue : colors.text}
                        size={12}
                        weight="700"
                        numberOfLines={1}
                      >
                        Tag Manually
                      </Txt>
                    </Pressable>
                  </View>

                  {value.selection === 'schedule' && value.task ? (
                    <View style={[styles.selectedScheduleCard, { backgroundColor: surfaceAltBg, borderColor: colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Txt color={colors.text} size={13} weight="800" numberOfLines={1}>
                          {getSetupTaskTitle(value.task)}
                        </Txt>
                        <Txt color={colors.textMuted} size={11} style={{ marginTop: 3 }} numberOfLines={1}>
                          {getSetupTaskMeta(value.task)}
                        </Txt>
                        {selectedScheduleSummary ? (
                          <Txt color={colors.textMuted} size={11} style={{ marginTop: 3 }} numberOfLines={2}>
                            {[
                              selectedScheduleSummary.plannedSeconds !== null
                                ? `Planned ${formatPlanDuration(selectedScheduleSummary.plannedSeconds)}`
                                : 'No planned duration set',
                              `Focused ${formatPlanDuration(selectedScheduleSummary.actualFocusedSeconds)}`,
                              selectedScheduleSummary.remainingSeconds !== null
                                ? selectedScheduleSummary.remainingSeconds === 0
                                  ? '0m remaining (Complete)'
                                  : `${formatPlanDuration(selectedScheduleSummary.remainingSeconds)} remaining`
                                : null,
                            ].filter(Boolean).join(' · ')}
                          </Txt>
                        ) : null}
                      </View>
                      <Pressable
                        onPress={() => setSubView('schedule')}
                        accessibilityRole="button"
                        accessibilityLabel="Change scheduled plan"
                      >
                        <Txt color={colors.blue} size={12} weight="800">Change</Txt>
                      </Pressable>
                      <Pressable
                        onPress={() => update({ selection: null, task: null, scheduleOccurrenceId: undefined })}
                        accessibilityRole="button"
                        accessibilityLabel="Remove scheduled plan"
                        style={{ marginLeft: 10 }}
                      >
                        <Ionicons name="close-circle-outline" size={20} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  ) : null}

                  {value.selection === 'manual' && value.tag ? (
                    <View style={[styles.selectedScheduleCard, { backgroundColor: surfaceAltBg, borderColor: colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Txt color={colors.text} size={13} weight="800" numberOfLines={1}>
                          {value.tagType === 'activity' ? `Activity: ${value.tag}` : `Subject: ${value.tag}`}
                        </Txt>
                      </View>
                      <Pressable
                        onPress={openTagManually}
                        accessibilityRole="button"
                        accessibilityLabel="Change selected tag"
                      >
                        <Txt color={colors.blue} size={12} weight="800">Change</Txt>
                      </Pressable>
                      <Pressable
                        onPress={() => update({ selection: null, tag: '', tagType: undefined, task: null, scheduleOccurrenceId: undefined })}
                        accessibilityRole="button"
                        accessibilityLabel="Remove selected tag"
                        style={{ marginLeft: 10 }}
                      >
                        <Ionicons name="close-circle-outline" size={20} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  ) : null}

                  {isDurationRequired ? (
                    <>
                      <Txt color={colors.textMuted} size={11.5} weight="700" style={{ marginBottom: 6 }}>
                        DURATION (MINUTES)
                      </Txt>
                      <View style={styles.durationRow}>
                        {FOCUS_DURATION_PRESETS.map((minutes) => {
                          const selected = !customActive && value.durationMinutes === minutes;
                          return (
                            <Pressable
                              key={minutes}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                              onPress={() => handleSelectPreset(minutes)}
                              style={[
                                styles.durationPill,
                                {
                                  backgroundColor: selected ? colors.blue : surfaceAltBg,
                                  borderColor: selected ? colors.blue : colors.border,
                                },
                              ]}
                            >
                              <Txt color={selected ? '#FFFFFF' : colors.text} size={13} weight="700">
                                {minutes}m
                              </Txt>
                            </Pressable>
                          );
                        })}
                        {customActive ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Custom duration"
                            accessibilityState={{ selected: true }}
                            onPress={() => customInputRef.current?.focus()}
                            style={[
                              styles.durationPill,
                              styles.inlineCustomPill,
                              {
                                backgroundColor: `${colors.blue}14`,
                                borderWidth: 1.5,
                                borderColor: !customValidation.valid
                                  ? (showZeroCompleteBanner ? warningColor : dangerColor)
                                  : colors.blue,
                              },
                            ]}
                          >
                            <TextInput
                              ref={customInputRef}
                              accessibilityLabel="Custom duration minutes"
                              value={customDurationText}
                              onChangeText={handleChangeCustomDuration}
                              onSubmitEditing={() => Keyboard.dismiss()}
                              keyboardType="number-pad"
                              returnKeyType="done"
                              maxLength={3}
                              selectTextOnFocus
                              placeholder="min"
                              placeholderTextColor={colors.textMuted}
                              style={[styles.inlineCustomInput, { color: colors.text }]}
                            />
                            <Txt color={colors.textMuted} size={11.5} weight="700">min</Txt>
                          </Pressable>
                        ) : (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Custom duration"
                            accessibilityState={{ selected: false }}
                            onPress={handlePressCustom}
                            style={[
                              styles.durationPill,
                              {
                                backgroundColor: surfaceAltBg,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <Txt color={colors.text} size={13} weight="700">
                              Custom
                            </Txt>
                          </Pressable>
                        )}
                      </View>

                      {customActive ? (
                        showZeroCompleteBanner ? (
                          <View style={[styles.feedbackBanner, { borderColor: warningColor, backgroundColor: `${warningColor}18` }]}>
                            <Ionicons name="checkmark-circle-outline" size={16} color={warningColor} />
                            <Txt color={colors.text} size={11.5} style={{ flex: 1 }}>
                              This task is already complete (0 min remaining). Enter 1–{MAX_FOCUS_DURATION_MINUTES} min or choose a preset.
                            </Txt>
                          </View>
                        ) : !customValidation.valid ? (
                          <Txt color={dangerColor} size={11.5} weight="600" style={{ marginBottom: 6 }}>
                            {customValidation.error}
                          </Txt>
                        ) : selectedScheduleSummary && selectedScheduleSummary.remainingMinutes !== null ? (
                          <Txt color={colors.textMuted} size={11} style={{ marginBottom: 6 }}>
                            Auto-filled from remaining planned time. Editing this duration will not alter your Study Planner task.
                          </Txt>
                        ) : null
                      ) : null}
                    </>
                  ) : null}
                </ScrollView>

                <View style={styles.setupFooter}>
                  <Button
                    label="Continue to Full Focus"
                    icon="arrow-forward-outline"
                    full
                    size="lg"
                    disabled={!isDurationValid}
                    onPress={handleContinuePress}
                  />
                </View>
              </>
            ) : subView === 'schedule' ? (
              <>
                <View style={styles.sheetHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Pressable
                      onPress={() => setSubView('setup')}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Back to focus setup"
                    >
                      <Ionicons name="arrow-back" size={20} color={colors.text} />
                    </Pressable>
                    <Txt color={colors.text} size={18} weight="800">Add from Schedule</Txt>
                  </View>
                  <Pressable
                    onPress={() => setSubView('setup')}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Close scheduled task list"
                  >
                    <Ionicons name="close" size={20} color={colors.textMuted} />
                  </Pressable>
                </View>
                <TextInput
                  value={scheduleSearch}
                  onChangeText={setScheduleSearch}
                  placeholder="Search plans"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.modalInput, { flex: 0, backgroundColor: surfaceAltBg, borderColor: colors.border, color: colors.text, marginBottom: 10 }]}
                />
                <View style={[styles.scheduleTabs, { backgroundColor: surfaceAltBg }]}>
                  {([
                    { id: 'upcoming', label: 'Upcoming' },
                    { id: 'missed', label: 'Missed' },
                    { id: 'completed', label: 'Completed' },
                  ] as const).map((tab) => {
                    const selected = scheduleStatusTab === tab.id;
                    return (
                      <Pressable
                        key={tab.id}
                        accessibilityRole="tab"
                        accessibilityState={{ selected }}
                        onPress={() => setScheduleStatusTab(tab.id)}
                        style={[styles.scheduleTab, selected && { backgroundColor: surfaceBg }]}
                      >
                        <Txt color={selected ? colors.text : colors.textMuted} size={12.5} weight={selected ? '800' : '600'}>
                          {tab.label}
                        </Txt>
                      </Pressable>
                    );
                  })}
                </View>
                {!state.storageReady ? (
                  <Txt color={colors.textMuted} size={13}>Loading scheduled plans...</Txt>
                ) : (
                  <SchedulePlanList
                    state={state}
                    search={scheduleSearch}
                    status={scheduleStatusTab}
                    selectedOccurrenceId={value.scheduleOccurrenceId ?? null}
                    surfaceBg={surfaceAltBg}
                    colors={colors}
                    onSelect={handleSelectOccurrence}
                  />
                )}
              </>
            ) : (
              <>
                <View style={styles.sheetHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Pressable
                      onPress={() => {
                        Keyboard.dismiss();
                        setSubView('setup');
                      }}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Back to focus setup"
                    >
                      <Ionicons name="arrow-back" size={20} color={colors.text} />
                    </Pressable>
                    <Txt color={colors.text} size={18} weight="800">Tag Manually</Txt>
                  </View>
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      setSubView('setup');
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Close tag manually"
                  >
                    <Ionicons name="close" size={20} color={colors.textMuted} />
                  </Pressable>
                </View>

                <View style={[styles.tagTabBar, { backgroundColor: surfaceAltBg }]}>
                  {([
                    { id: 'subject', label: 'Subject' },
                    { id: 'activity', label: 'Activity' },
                  ] as const).map((tab) => {
                    const active = tagTab === tab.id;
                    return (
                      <Pressable
                        key={tab.id}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                        onPress={() => setTagTab(tab.id)}
                        style={[
                          styles.tagTabButton,
                          active && { backgroundColor: surfaceBg },
                        ]}
                      >
                        <Txt
                          color={active ? colors.text : colors.textMuted}
                          size={13}
                          weight={active ? '800' : '600'}
                        >
                          {tab.label}
                        </Txt>
                      </Pressable>
                    );
                  })}
                </View>

                <ScrollView
                  style={{ flexShrink: 1 }}
                  contentContainerStyle={{ paddingBottom: 8 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {tagTab === 'subject' ? (
                    preferredSubjectOptions.length === 0 ? (
                      <View style={[styles.scheduleEmptyState, { backgroundColor: surfaceAltBg, borderRadius: 14, borderWidth: 1, borderColor: colors.border }]}>
                        <Ionicons name="book-outline" size={26} color={colors.textMuted} />
                        <Txt color={colors.text} size={14} weight="700" style={{ textAlign: 'center' }}>
                          No subjects selected in Subject Preferences
                        </Txt>
                        <Txt color={colors.textMuted} size={12} style={{ textAlign: 'center' }}>
                          Select your subjects in Subject Preferences to tag focus sessions by subject.
                        </Txt>
                        <Pressable
                          accessibilityRole="button"
                          onPress={handleOpenSubjectPreferences}
                          style={[styles.openPrefsBtn, { backgroundColor: colors.blue }]}
                        >
                          <Txt color="#FFFFFF" size={12.5} weight="700">Open Subject Preferences</Txt>
                        </Pressable>
                      </View>
                    ) : (
                      preferredSubjectOptions.map((subjectName) => {
                        const selected = draftSubject === subjectName && !draftActivity;
                        return (
                          <Pressable
                            key={subjectName}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            onPress={() => {
                              setDraftSubject(subjectName);
                              setDraftActivity('');
                            }}
                            style={[
                              styles.modalTagItem,
                              {
                                backgroundColor: selected ? `${colors.blue}16` : surfaceAltBg,
                                borderWidth: selected ? 1.5 : 1,
                                borderColor: selected ? colors.blue : colors.border,
                              },
                            ]}
                          >
                            <Txt color={selected ? colors.blue : colors.text} size={14} weight="700">
                              {subjectName}
                            </Txt>
                            {selected ? <Ionicons name="checkmark-circle" size={18} color={colors.blue} /> : null}
                          </Pressable>
                        );
                      })
                    )
                  ) : (
                    <>
                      <View style={styles.activityGrid}>
                        {activityOptions.map((activityName) => {
                          const selected = draftActivity === activityName && !draftSubject;
                          return (
                            <Pressable
                              key={activityName}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                              onPress={() => {
                                setDraftActivity(activityName);
                                setDraftSubject('');
                              }}
                              style={[
                                styles.activityChip,
                                {
                                  backgroundColor: selected ? `${colors.blue}16` : surfaceAltBg,
                                  borderWidth: selected ? 1.5 : 1,
                                  borderColor: selected ? colors.blue : colors.border,
                                },
                              ]}
                            >
                              <Txt
                                color={selected ? colors.blue : colors.text}
                                size={13}
                                weight="700"
                                numberOfLines={1}
                              >
                                {activityName}
                              </Txt>
                              {selected ? <Ionicons name="checkmark-circle" size={16} color={colors.blue} /> : null}
                            </Pressable>
                          );
                        })}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                        <TextInput
                          style={[styles.modalInput, { backgroundColor: surfaceAltBg, borderColor: colors.border, color: colors.text }]}
                          placeholder="Add custom activity..."
                          placeholderTextColor={colors.textMuted}
                          value={customTagInput}
                          onChangeText={setCustomTagInput}
                          onSubmitEditing={handleAddCustomActivity}
                          returnKeyType="done"
                        />
                        <Pressable
                          accessibilityRole="button"
                          onPress={handleAddCustomActivity}
                          style={[styles.addTagBtn, { backgroundColor: colors.blue }]}
                        >
                          <Txt color="#FFFFFF" size={13} weight="700">Add</Txt>
                        </Pressable>
                      </View>
                    </>
                  )}
                </ScrollView>

                <View style={[styles.setupFooter, { flexDirection: 'row', gap: 10 }]}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      Keyboard.dismiss();
                      setSubView('setup');
                    }}
                    style={[styles.cancelTagBtn, { backgroundColor: surfaceAltBg, borderColor: colors.border }]}
                  >
                    <Txt color={colors.text} size={13.5} weight="700">Cancel</Txt>
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Confirm"
                      full
                      size="lg"
                      disabled={!draftSubject && !draftActivity}
                      onPress={handleConfirmTag}
                    />
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bottomSheetBackdrop: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  keyboardRoot: { flex: 1 },
  bottomSheetCard: {
    width: '100%',
    maxWidth: 620,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 14,
    borderWidth: 1,
    borderBottomWidth: 0,
    flexShrink: 1,
    overflow: 'hidden',
  },
  sheetHandleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 14 },
  sheetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  setupScroll: { flexShrink: 1 },
  setupScrollContent: { paddingBottom: 8 },
  setupFooter: { paddingTop: 12 },
  scheduleTabs: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 10 },
  scheduleTab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  scheduleEmptyState: { minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 },
  modeTabsRow: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  modeTabItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  studySourceButton: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingHorizontal: 8 },
  selectedScheduleCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14 },
  durationRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  durationPill: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  inlineCustomPill: { flexDirection: 'row', paddingHorizontal: 6, gap: 2 },
  inlineCustomInput: { minWidth: 26, flexShrink: 1, fontSize: 13.5, fontWeight: '800', textAlign: 'center', paddingVertical: 4, paddingHorizontal: 0 },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalTagItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, marginBottom: 8 },
  modalInput: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 13.5 },
  addTagBtn: { paddingHorizontal: 16, minHeight: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tagTabBar: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 12 },
  tagTabButton: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activityChip: {
    width: '48.5%',
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  openPrefsBtn: { marginTop: 6, paddingHorizontal: 16, minHeight: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cancelTagBtn: { minHeight: 48, paddingHorizontal: 18, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
