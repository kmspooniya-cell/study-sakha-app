import React, { useState, useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { X, Play, Timer, ChevronDown, BookOpen, GraduationCap, Clock } from 'lucide-react-native';
import { BottomSheet } from './BottomSheet';
import type { FocusMode, FocusSessionConfig } from '../lib/smartStudyRoomTypes';
import { EXAM_OPTIONS, SUBJECT_PRESETS, DURATION_PRESETS, FOCUS_MODES } from '../lib/smartStudyRoom';

export interface FocusSetupBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  initialExam: string | null;
  onStartFocus: (config: FocusSessionConfig) => void;
}

export const FocusSetupBottomSheet: React.FC<FocusSetupBottomSheetProps> = ({
  isOpen,
  onClose,
  isDark,
  initialExam,
  onStartFocus,
}) => {
  const [selectedMode, setSelectedMode] = useState<FocusMode>('Pomodoro');
  const [durationMinutes, setDurationMinutes] = useState<number>(50);
  const [subject, setSubject] = useState<string>('Indian Polity');
  const [customSubject, setCustomSubject] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [exam, setExam] = useState<string>(initialExam || 'RAS');
  const [examDropdownOpen, setExamDropdownOpen] = useState<boolean>(false);

  const handleModeSelect = useCallback((modeId: FocusMode, defaultMinutes: number | null) => {
    setSelectedMode(modeId);
    if (defaultMinutes) {
      setDurationMinutes(defaultMinutes);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    const finalSubject = customSubject.trim() || subject;
    onStartFocus({
      mode: selectedMode,
      targetSeconds: selectedMode === 'Stopwatch' ? null : durationMinutes * 60,
      subject: finalSubject,
      topic: topic.trim() || null,
      exam: exam || null,
    });
    setExamDropdownOpen(false);
    onClose();
  }, [selectedMode, durationMinutes, subject, customSubject, topic, exam, onStartFocus, onClose]);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} isDark={isDark}>
      <View style={styles.setupHeader}>
        <View>
          <Text style={[styles.setupTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
            Start Focusing
          </Text>
          <Text
            style={[styles.setupSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}
          >
            Take your seat in Silent Focus Hall
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close focus setup"
          style={styles.closeIconBtn}
        >
          <X size={20} color={isDark ? '#94A3B8' : '#64748B'} />
        </Pressable>
      </View>

      <View style={styles.formSection}>
        <Text style={[styles.formLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
          FOCUS MODE
        </Text>
        <View style={styles.modeGrid}>
          {FOCUS_MODES.map((m) => {
            const active = selectedMode === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => handleModeSelect(m.id, m.defaultMinutes)}
                style={[
                  styles.modeBtn,
                  {
                    backgroundColor: active
                      ? '#2563EB'
                      : isDark
                      ? '#171F2E'
                      : '#F8FAFC',
                    borderColor: active
                      ? '#2563EB'
                      : isDark
                      ? '#1E293B'
                      : '#E2E8F0',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modeBtnText,
                    {
                      color: active ? '#FFFFFF' : isDark ? '#CBD5E1' : '#334155',
                    },
                  ]}
                >
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {selectedMode !== 'Stopwatch' && (
        <View style={styles.formSection}>
          <Text style={[styles.formLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            SESSION DURATION
          </Text>
          <View style={styles.chipWrap}>
            {DURATION_PRESETS.map((mins) => {
              const active = durationMinutes === mins;
              return (
                <Pressable
                  key={mins}
                  onPress={() => setDurationMinutes(mins)}
                  style={[
                    styles.durationChip,
                    {
                      backgroundColor: active
                        ? isDark
                          ? 'rgba(59, 130, 246, 0.2)'
                          : '#EFF6FF'
                        : isDark
                        ? '#171F2E'
                        : '#FFFFFF',
                      borderColor: active
                        ? isDark
                          ? 'rgba(59, 130, 246, 0.5)'
                          : '#93C5FD'
                        : isDark
                        ? '#1E293B'
                        : '#E2E8F0',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.durationChipText,
                      {
                        color: active
                          ? isDark
                            ? '#93C5FD'
                            : '#1D4ED8'
                          : isDark
                          ? '#CBD5E1'
                          : '#475569',
                      },
                    ]}
                  >
                    {mins} min
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.formSection}>
        <Text style={[styles.formLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
          SUBJECT
        </Text>
        <View style={[styles.chipWrap, { marginBottom: 10 }]}>
          {SUBJECT_PRESETS.map((sub) => {
            const active = !customSubject.trim() && subject === sub;
            return (
              <Pressable
                key={sub}
                onPress={() => {
                  setSubject(sub);
                  setCustomSubject('');
                }}
                style={[
                  styles.subjectChip,
                  {
                    backgroundColor: active
                      ? isDark
                        ? 'rgba(16, 185, 129, 0.2)'
                        : '#ECFDF5'
                      : isDark
                      ? '#171F2E'
                      : '#FFFFFF',
                    borderColor: active
                      ? isDark
                        ? 'rgba(16, 185, 129, 0.5)'
                        : '#6EE7B7'
                      : isDark
                      ? '#1E293B'
                      : '#E2E8F0',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.subjectChipText,
                    {
                      color: active
                        ? isDark
                          ? '#6EE7B7'
                          : '#047857'
                        : isDark
                        ? '#CBD5E1'
                        : '#475569',
                    },
                  ]}
                >
                  {sub}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          value={customSubject}
          onChangeText={setCustomSubject}
          placeholder="Or type another subject..."
          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
          maxLength={40}
          style={[
            styles.textInput,
            {
              backgroundColor: isDark ? '#171F2E' : '#F8FAFC',
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
              color: isDark ? '#F1F5F9' : '#0F172A',
            },
          ]}
        />
      </View>

      <View style={styles.topicExamRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.formLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            TOPIC
            <Text style={{ fontWeight: '400', textTransform: 'none' }}>(Optional)</Text>
          </Text>
          <TextInput
            value={topic}
            onChangeText={setTopic}
            placeholder="e.g. Ch. 4 Revision"
            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            maxLength={48}
            style={[
              styles.textInput,
              {
                backgroundColor: isDark ? '#171F2E' : '#F8FAFC',
                borderColor: isDark ? '#1E293B' : '#E2E8F0',
                color: isDark ? '#F1F5F9' : '#0F172A',
              },
            ]}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.formLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            TARGET EXAM
          </Text>
          <Pressable
            onPress={() => setExamDropdownOpen((prev) => !prev)}
            style={[
              styles.selectTrigger,
              {
                backgroundColor: isDark ? '#171F2E' : '#F8FAFC',
                borderColor: isDark ? '#1E293B' : '#E2E8F0',
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.selectTriggerText,
                { color: isDark ? '#F1F5F9' : '#0F172A' },
              ]}
            >
              {exam || 'Keep Private'}
            </Text>
            <ChevronDown size={16} color={isDark ? '#94A3B8' : '#64748B'} />
          </Pressable>
        </View>
      </View>

      {examDropdownOpen && (
        <View
          style={[
            styles.examDropdownPanel,
            {
              backgroundColor: isDark ? '#171F2E' : '#F8FAFC',
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
            },
          ]}
        >
          {['', ...EXAM_OPTIONS].map((option) => {
            const active = exam === option;
            return (
              <Pressable
                key={option || 'private'}
                onPress={() => {
                  setExam(option);
                  setExamDropdownOpen(false);
                }}
                style={[
                  styles.examOptionPill,
                  {
                    backgroundColor: active
                      ? '#2563EB'
                      : isDark
                      ? '#121824'
                      : '#FFFFFF',
                    borderColor: active
                      ? '#2563EB'
                      : isDark
                      ? '#1E293B'
                      : '#E2E8F0',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.examOptionText,
                    { color: active ? '#FFFFFF' : isDark ? '#CBD5E1' : '#334155' },
                  ]}
                >
                  {option || 'Keep Private'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Pressable
        onPress={handleSubmit}
        style={({ pressed }) => [
          styles.primaryCtaBtn,
          { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
        ]}
      >
        <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
        <Text style={styles.primaryCtaText}>Begin Focus Session</Text>
      </Pressable>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  setupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  setupTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  setupSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  formSection: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  modeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  modeBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  durationChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subjectChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  subjectChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  topicExamRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  selectTrigger: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectTriggerText: {
    fontSize: 14,
    flex: 1,
  },
  examDropdownPanel: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  examOptionPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  examOptionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  primaryCtaBtn: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '600',
  },
  closeIconBtn: {
    padding: 8,
    borderRadius: 12,
  },
});
