import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button, Txt } from './ui';
import type { PlannerScheduleItem, PlannerTask, State } from '../lib/store';
import { useStore } from '../lib/store';
import {
  getPlannerScheduleOccurrences,
  PlannerScheduleOccurrence,
} from '../lib/planner';
import { useTheme } from '../lib/theme';

export type FocusSessionMode = 'timer' | 'stopwatch' | 'pomodoro';
export type FocusSessionSelection = 'schedule' | 'manual' | null;
export type FocusSessionSetup = {
  mode: FocusSessionMode;
  durationMinutes: number;
  selection: FocusSessionSelection;
  tag: string;
  task: PlannerTask | PlannerScheduleItem | null;
  scheduleOccurrenceId?: string;
};

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

function formatPlanDuration(seconds: number | null) {
  if (seconds === null) return 'No planned time';
  const minutes = Math.round(seconds / 60);
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
  status: 'missed' | 'upcoming';
  selectedOccurrenceId: string | null;
  surfaceBg: string;
  colors: ReturnType<typeof useTheme>['colors'];
  onSelect: (occurrence: PlannerScheduleOccurrence) => void;
}) {
  const query = search.trim().toLowerCase();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const firstDay = new Date(today);
  firstDay.setDate(firstDay.getDate() - 90);
  const lastDay = new Date(today);
  lastDay.setDate(lastDay.getDate() + 365);
  const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const occurrences = getPlannerScheduleOccurrences(state, dateKey(firstDay), dateKey(lastDay), todayKey);
  const filtered = occurrences.filter((occurrence) => {
    if (occurrence.status !== status) return false;
    const item = occurrence.item;
    if (!query) return true;
    return [item.title, item.subject, item.category, item.taskType, item.examType, item.activityType]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  if (filtered.length === 0) {
    const emptyTitle = status === 'missed' ? 'No missed plans' : 'No upcoming plans';
    const emptyMessage = status === 'missed'
      ? 'You’re all caught up with past plans.'
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
    <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
      {filtered
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((occurrence) => {
          const { item } = occurrence;
          const selected = selectedOccurrenceId === occurrence.id;
          const time = item.startTime || item.time;
          const subject = item.subject || item.category;
          const duration = formatPlanDuration(occurrence.plannedSeconds);
          const actual = formatPlanDuration(occurrence.actualSeconds);
          return (
            <Pressable
              key={occurrence.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onSelect(occurrence)}
              style={[styles.modalTagItem, { backgroundColor: surfaceBg, borderWidth: selected ? 1 : 0, borderColor: colors.blue }]}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Txt color={colors.text} size={14} weight="700">{item.title}</Txt>
                <Txt color={colors.textMuted} size={11} style={{ marginTop: 3 }}>
                  {[occurrence.date, subject, time].filter(Boolean).join(' · ')}
                </Txt>
                <Txt color={colors.textMuted} size={11} style={{ marginTop: 3 }}>
                  Planned {duration} · Focused {actual} · {occurrence.progressPercent}%
                </Txt>
              </View>
              <Txt color={colors.blue} size={11} weight="800">
                {occurrence.actualSeconds > 0 ? 'Continue' : 'Start Focus'}
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
};

export function FocusSessionSetupModal({ visible, value, onChange, onClose, onContinue }: Props) {
  const { colors, scheme } = useTheme();
  const { state } = useStore();
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [scheduleTaskModalVisible, setScheduleTaskModalVisible] = useState(false);
  const [scheduleStatusTab, setScheduleStatusTab] = useState<'missed' | 'upcoming'>('upcoming');
  const [customTagInput, setCustomTagInput] = useState('');
  const [scheduleSearch, setScheduleSearch] = useState('');
  const isDark = scheme === 'dark';
  const surfaceBg = isDark ? '#18191C' : colors.surface;
  const surfaceAltBg = isDark ? '#202225' : colors.surfaceAlt;

  const close = () => {
    setTagModalVisible(false);
    setScheduleTaskModalVisible(false);
    onClose();
  };
  const update = (patch: Partial<FocusSessionSetup>) => onChange({ ...value, ...patch });

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
        <View style={styles.bottomSheetBackdrop}>
          <View style={[styles.bottomSheetCard, { backgroundColor: surfaceBg, borderColor: colors.border }]}>
            <View style={styles.sheetHandleBar} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Txt color={colors.text} size={18} weight="800">Focus Session Setup</Txt>
              <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close focus session setup">
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={[styles.modeTabsRow, { backgroundColor: surfaceAltBg, marginBottom: 16 }]}>
              {(['timer', 'stopwatch', 'pomodoro'] as const).map((mode) => (
                <Pressable key={mode} onPress={() => update({ mode })} style={[styles.modeTabItem, value.mode === mode && { backgroundColor: surfaceBg }]}>
                  <Txt color={value.mode === mode ? colors.text : colors.textMuted} size={13} weight={value.mode === mode ? '800' : '600'}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Txt>
                </Pressable>
              ))}
            </View>

            <Txt color={colors.textMuted} size={11.5} weight="700" style={{ marginBottom: 6 }}>SUBJECT OR TASK (OPTIONAL)</Txt>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: value.selection === 'schedule' }}
                onPress={() => {
                  update({ selection: 'schedule' });
                  setScheduleTaskModalVisible(true);
                }}
                style={[styles.studySourceButton, { backgroundColor: value.selection === 'schedule' ? `${colors.blue}18` : surfaceAltBg, borderColor: value.selection === 'schedule' ? colors.blue : colors.border }]}
              >
                <Ionicons name="calendar-outline" size={17} color={value.selection === 'schedule' ? colors.blue : colors.textMuted} />
                <Txt color={value.selection === 'schedule' ? colors.blue : colors.text} size={12} weight="700" numberOfLines={1}>Add from Schedule</Txt>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: value.selection === 'manual' }}
                onPress={() => {
                  update({ selection: 'manual' });
                  setTagModalVisible(true);
                }}
                style={[styles.studySourceButton, { backgroundColor: value.selection === 'manual' ? `${colors.blue}18` : surfaceAltBg, borderColor: value.selection === 'manual' ? colors.blue : colors.border }]}
              >
                <Ionicons name="pricetag-outline" size={17} color={value.selection === 'manual' ? colors.blue : colors.textMuted} />
                <Txt color={value.selection === 'manual' ? colors.blue : colors.text} size={12} weight="700" numberOfLines={1}>Tag Manually</Txt>
              </Pressable>
            </View>

            {value.selection === 'schedule' && value.task ? (
              <View style={[styles.selectedScheduleCard, { backgroundColor: surfaceAltBg, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Txt color={colors.text} size={13} weight="800" numberOfLines={1}>{getSetupTaskTitle(value.task)}</Txt>
                  <Txt color={colors.textMuted} size={11} style={{ marginTop: 3 }} numberOfLines={1}>{getSetupTaskMeta(value.task)}</Txt>
                </View>
                <Pressable onPress={() => setScheduleTaskModalVisible(true)} accessibilityRole="button" accessibilityLabel="Change scheduled plan">
                  <Txt color={colors.blue} size={12} weight="800">Change</Txt>
                </Pressable>
                <Pressable
                  onPress={() => update({ selection: null, task: null })}
                  accessibilityRole="button"
                  accessibilityLabel="Remove scheduled plan"
                  style={{ marginLeft: 10 }}
                >
                  <Ionicons name="close-circle-outline" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : null}

            {value.mode !== 'stopwatch' ? (
              <>
                <Txt color={colors.textMuted} size={11.5} weight="700" style={{ marginBottom: 6 }}>DURATION (MINUTES)</Txt>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                  {[15, 25, 40, 50].map((minutes) => (
                    <Pressable
                      key={minutes}
                      onPress={() => update({ durationMinutes: minutes })}
                      style={[styles.durationPill, { backgroundColor: value.durationMinutes === minutes ? colors.blue : surfaceAltBg, borderColor: value.durationMinutes === minutes ? colors.blue : colors.border }]}
                    >
                      <Txt color={value.durationMinutes === minutes ? '#FFFFFF' : colors.text} size={13} weight="700">{minutes}m</Txt>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
            <Button label="Continue to Full Focus" icon="arrow-forward-outline" full size="lg" onPress={() => onContinue(value)} />
          </View>
        </View>
      </Modal>

      <Modal visible={scheduleTaskModalVisible} transparent animationType="slide" onRequestClose={() => setScheduleTaskModalVisible(false)}>
        <View style={styles.bottomSheetBackdrop}>
          <View style={[styles.scheduleSheet, { backgroundColor: surfaceBg, borderColor: colors.border }]}>
            <View style={styles.sheetHandleBar} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Txt color={colors.text} size={18} weight="800">Add from Schedule</Txt>
              <Pressable onPress={() => setScheduleTaskModalVisible(false)} accessibilityRole="button" accessibilityLabel="Close scheduled task list">
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <TextInput
              value={scheduleSearch}
              onChangeText={setScheduleSearch}
              placeholder="Search plans"
              placeholderTextColor={colors.textMuted}
              style={[styles.modalInput, { backgroundColor: surfaceAltBg, borderColor: colors.border, color: colors.text, marginBottom: 10 }]}
            />
            <View style={[styles.scheduleTabs, { backgroundColor: surfaceAltBg }]}>
              {(['missed', 'upcoming'] as const).map((status) => {
                const selected = scheduleStatusTab === status;
                return (
                  <Pressable
                    key={status}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => setScheduleStatusTab(status)}
                    style={[styles.scheduleTab, selected && { backgroundColor: surfaceBg }]}
                  >
                    <Txt color={selected ? colors.text : colors.textMuted} size={13} weight={selected ? '800' : '600'}>
                      {status === 'missed' ? 'Missed' : 'Upcoming'}
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
                onSelect={(occurrence) => {
                  const remainingSeconds = occurrence.plannedSeconds === null
                    ? 25 * 60
                    : Math.max(60, occurrence.plannedSeconds - occurrence.actualSeconds);
                  update({
                    task: occurrence.item,
                    scheduleOccurrenceId: occurrence.id,
                    selection: 'schedule',
                    durationMinutes: Math.ceil(remainingSeconds / 60),
                  });
                  setScheduleTaskModalVisible(false);
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={tagModalVisible} transparent animationType="fade" onRequestClose={() => setTagModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: surfaceBg, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Txt color={colors.text} size={18} weight="800">Select Subject Tag</Txt>
              <Pressable onPress={() => setTagModalVisible(false)} accessibilityRole="button" accessibilityLabel="Close subject tags">
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            {['History', 'Polity', 'Economy', 'Rajasthan Geography', 'General Science', 'Work'].map((tag) => (
              <Pressable key={tag} onPress={() => {
                update({ tag, selection: 'manual' });
                setTagModalVisible(false);
              }} style={[styles.modalTagItem, { backgroundColor: surfaceAltBg }]}>
                <Txt color={colors.text} size={14} weight="700">{tag}</Txt>
                {value.tag === tag ? <Ionicons name="checkmark" size={18} color={colors.blue} /> : null}
              </Pressable>
            ))}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TextInput
                style={[styles.modalInput, { backgroundColor: surfaceAltBg, borderColor: colors.border, color: colors.text }]}
                placeholder="Add custom tag..."
                placeholderTextColor={colors.textMuted}
                value={customTagInput}
                onChangeText={setCustomTagInput}
              />
              <Pressable
                onPress={() => {
                  const tag = customTagInput.trim();
                  if (!tag) return;
                  update({ tag, selection: 'manual' });
                  setCustomTagInput('');
                  setTagModalVisible(false);
                }}
                style={[styles.addTagBtn, { backgroundColor: colors.blue }]}
              >
                <Txt color="#FFFFFF" size={13} weight="700">Add</Txt>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bottomSheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheetCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderBottomWidth: 0 },
  sheetHandleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 14 },
  scheduleSheet: { width: '100%', maxHeight: '82%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 32, borderWidth: 1, borderBottomWidth: 0 },
  scheduleTabs: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 10 },
  scheduleTab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  scheduleEmptyState: { minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 },
  modeTabsRow: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  modeTabItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  studySourceButton: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingHorizontal: 8 },
  selectedScheduleCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14 },
  durationPill: { flex: 1, height: 38, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 380, borderRadius: 20, padding: 22, borderWidth: 1 },
  modalTagItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, marginBottom: 8 },
  modalInput: { flex: 1, height: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 13.5 },
  addTagBtn: { paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
