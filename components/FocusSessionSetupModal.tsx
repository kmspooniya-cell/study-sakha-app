import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button, Txt } from './ui';
import type { PlannerScheduleItem, PlannerTask } from '../lib/store';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';

export type FocusSessionMode = 'timer' | 'stopwatch' | 'pomodoro';
export type FocusSessionSelection = 'schedule' | 'manual' | null;
export type FocusSessionSetup = {
  mode: FocusSessionMode;
  durationMinutes: number;
  selection: FocusSessionSelection;
  tag: string;
  task: PlannerTask | PlannerScheduleItem | null;
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

function isUpcomingOrCurrent(item: PlannerScheduleItem): boolean {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const start = item.date || item.fromDate || '';
  const end = item.repeatUntil || item.untilDate || item.endDate || start;
  return !start || (end >= todayKey);
}

function SchedulePlanList({
  items,
  search,
  showOther,
  selectedId,
  surfaceBg,
  colors,
  onToggleOther,
  onSelect,
}: {
  items: PlannerScheduleItem[];
  search: string;
  showOther: boolean;
  selectedId: string | null;
  surfaceBg: string;
  colors: ReturnType<typeof useTheme>['colors'];
  onToggleOther: () => void;
  onSelect: (task: PlannerScheduleItem) => void;
}) {
  const query = search.trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (!showOther && !isUpcomingOrCurrent(item)) return false;
    if (!query) return true;
    return [item.title, item.subject, item.category, item.taskType, item.examType, item.activityType]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const grouped = new Map<string, PlannerScheduleItem[]>();
  filtered.forEach((item) => {
    const date = item.date || item.fromDate || 'No date';
    grouped.set(date, [...(grouped.get(date) ?? []), item]);
  });

  if (filtered.length === 0) {
    return (
      <>
        <Txt color={colors.textMuted} size={13}>No matching saved plans.</Txt>
        <Pressable onPress={onToggleOther} accessibilityRole="button" style={{ marginTop: 10 }}>
          <Txt color={colors.blue} size={12} weight="800">{showOther ? 'Show upcoming only' : 'View other saved plans'}</Txt>
        </Pressable>
      </>
    );
  }

  return (
    <>
      <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
        {[...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, plans]) => (
          <View key={date} style={{ marginBottom: 12 }}>
            <Txt color={colors.textMuted} size={11} weight="800" style={{ marginBottom: 6 }}>{date}</Txt>
            {plans.map((task) => {
              const selected = selectedId === task.id;
              const time = task.startTime || task.time;
              const subject = task.subject || task.category;
              return (
                <Pressable
                  key={task.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => onSelect(task)}
                  style={[styles.modalTagItem, { backgroundColor: surfaceBg, borderWidth: selected ? 1 : 0, borderColor: colors.blue }]}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Txt color={colors.text} size={14} weight="700">{task.title}</Txt>
                    <Txt color={colors.textMuted} size={12} style={{ marginTop: 3 }}>
                      {[subject, time].filter(Boolean).join(' · ')}
                    </Txt>
                  </View>
                  {selected ? <Ionicons name="checkmark-circle" size={19} color={colors.blue} /> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <Pressable onPress={onToggleOther} accessibilityRole="button" style={{ marginTop: 8 }}>
        <Txt color={colors.blue} size={12} weight="800">{showOther ? 'Show upcoming only' : 'View other saved plans'}</Txt>
      </Pressable>
    </>
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
  const [customTagInput, setCustomTagInput] = useState('');
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [showOtherSchedule, setShowOtherSchedule] = useState(false);
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

      <Modal visible={scheduleTaskModalVisible} transparent animationType="fade" onRequestClose={() => setScheduleTaskModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: surfaceBg, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Txt color={colors.text} size={18} weight="800">Select a Scheduled Task</Txt>
              <Pressable onPress={() => setScheduleTaskModalVisible(false)} accessibilityRole="button" accessibilityLabel="Close scheduled task list">
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            {!state.storageReady ? (
              <Txt color={colors.textMuted} size={13}>Loading scheduled plans...</Txt>
            ) : (
              <>
                <TextInput
                  value={scheduleSearch}
                  onChangeText={setScheduleSearch}
                  placeholder="Search plans"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.modalInput, { backgroundColor: surfaceAltBg, borderColor: colors.border, color: colors.text, marginBottom: 10 }]}
                />
                <SchedulePlanList
                  items={state.plannerScheduleItems}
                  search={scheduleSearch}
                  showOther={showOtherSchedule}
                  selectedId={value.task?.id ?? null}
                  surfaceBg={surfaceAltBg}
                  colors={colors}
                  onToggleOther={() => setShowOtherSchedule((current) => !current)}
                  onSelect={(task) => {
                    update({ task, selection: 'schedule' });
                    setScheduleTaskModalVisible(false);
                  }}
                />
              </>
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
