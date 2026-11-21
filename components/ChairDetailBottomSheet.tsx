import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { X, BookOpen, Timer, Square, Pause, Play, ShieldCheck, GraduationCap, Clock } from 'lucide-react-native';
import { BottomSheet } from './BottomSheet';
import type { StudyMember } from '../lib/smartStudyRoomTypes';
import { formatDuration, formatTargetDuration } from '../lib/smartStudyRoom';

export interface ChairDetailBottomSheetProps {
  member: StudyMember | null;
  isCurrentUser: boolean;
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onPauseToggle: () => void;
  onEndSession: () => void;
}

export const ChairDetailBottomSheet: React.FC<ChairDetailBottomSheetProps> = ({
  member,
  isCurrentUser,
  isOpen,
  onClose,
  isDark,
  onPauseToggle,
  onEndSession,
}) => {
  if (!member) return null;

  const isFocusing = member.state === 'focusing';
  const isPaused = member.state === 'paused';

  const hasProgressData =
    typeof member.targetSeconds === 'number' && member.targetSeconds > 0;
  const progressPercent = hasProgressData
    ? Math.min(100, Math.round((member.elapsedSeconds / (member.targetSeconds as number)) * 100))
    : null;

  const statusLabel = isFocusing
    ? 'Focusing'
    : isPaused
    ? 'Paused / On Break'
    : 'Available';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} isDark={isDark}>
      <View style={styles.detailHeader}>
        <View style={styles.detailProfileLeft}>
          <View
            style={[
              styles.detailAvatarRing,
              {
                borderColor: isFocusing
                  ? '#10B981'
                  : isPaused
                  ? '#F59E0B'
                  : 'transparent',
              },
            ]}
          >
            <View
              style={[
                styles.detailAvatarBox,
                { backgroundColor: member.avatarBgColor },
              ]}
            >
              <Text
                style={[
                  styles.detailAvatarInitials,
                  { color: member.avatarTextColor || '#FFFFFF' },
                ]}
              >
                {member.initials}
              </Text>
            </View>
            <View
              style={[
                styles.detailAvatarDot,
                {
                  borderColor: isDark ? '#121824' : '#FFFFFF',
                  backgroundColor: isFocusing
                    ? '#10B981'
                    : isPaused
                    ? '#F59E0B'
                    : '#94A3B8',
                },
              ]}
            />
          </View>

          <View style={styles.detailNameWrap}>
            <View style={styles.detailNameRow}>
              <Text
                numberOfLines={1}
                style={[styles.detailName, { color: isDark ? '#F1F5F9' : '#0F172A' }]}
              >
                {member.name}
              </Text>
              {isCurrentUser && (
                <View
                  style={[
                    styles.detailYouPill,
                    { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#EFF6FF' },
                  ]}
                >
                  <Text
                    style={[
                      styles.detailYouPillText,
                      { color: isDark ? '#93C5FD' : '#1D4ED8' },
                    ]}
                  >
                    You
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.detailBadgesRow}>
              {member.exam && (
                <View
                  style={[
                    styles.detailBadge,
                    { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
                  ]}
                >
                  <GraduationCap size={13} color={isDark ? '#CBD5E1' : '#334155'} />
                  <Text
                    style={[
                      styles.detailBadgeText,
                      { color: isDark ? '#CBD5E1' : '#334155' },
                    ]}
                  >
                    {member.exam}
                  </Text>
                </View>
              )}

              <View
                style={[
                  styles.detailBadge,
                  {
                    backgroundColor: isFocusing
                      ? isDark
                        ? 'rgba(16, 185, 129, 0.15)'
                        : '#ECFDF5'
                      : isDark
                      ? 'rgba(245, 158, 11, 0.15)'
                      : '#FFFBEB',
                  },
                ]}
              >
                <View
                  style={[
                    styles.staticDot,
                    { backgroundColor: isFocusing ? '#10B981' : '#F59E0B' },
                  ]}
                />
                <Text
                  style={[
                    styles.detailBadgeText,
                    {
                      color: isFocusing
                        ? isDark
                          ? '#6EE7B7'
                          : '#047857'
                        : isDark
                        ? '#FCD34D'
                        : '#B45309',
                    },
                  ]}
                >
                  {statusLabel}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close student details"
          style={({ pressed }) => [
            styles.closeIconBtn,
            {
              backgroundColor: pressed
                ? isDark
                  ? '#1E293B'
                  : '#F1F5F9'
                : 'transparent',
            },
          ]}
        >
          <X size={20} color={isDark ? '#94A3B8' : '#64748B'} />
        </Pressable>
      </View>

      <View
        style={[
          styles.infoCard,
          {
            backgroundColor: isDark ? '#171F2E' : 'rgba(248, 250, 252, 0.85)',
            borderColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(226, 232, 240, 0.85)',
            marginBottom: 14,
          },
        ]}
      >
        <Text
          style={[
            styles.infoCardHeading,
            { color: isDark ? '#94A3B8' : '#64748B' },
          ]}
        >
          LIVE STUDY INFORMATION
        </Text>

        {member.subject && (
          <View style={styles.subjectRow}>
            <View
              style={[
                styles.subjectIconBox,
                { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' },
              ]}
            >
              <BookOpen size={16} color={isDark ? '#60A5FA' : '#2563EB'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Currently Studying
              </Text>
              <Text
                style={[styles.subjectTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}
              >
                {member.subject}
              </Text>
              {member.topic && (
                <Text
                  style={[styles.topicText, { color: isDark ? '#CBD5E1' : '#475569' }]}
                >
                  Topic: {member.topic}
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.statGrid}>
          <View
            style={[
              styles.statBox,
              {
                backgroundColor: isDark ? '#121824' : '#FFFFFF',
                borderColor: isDark ? '#1E293B' : 'rgba(226, 232, 240, 0.75)',
              },
            ]}
          >
            <Text style={[styles.statLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Live Elapsed
            </Text>
            <Text
              style={[
                styles.statElapsedValue,
                {
                  color: isFocusing
                    ? isDark
                      ? '#34D399'
                      : '#059669'
                    : isDark
                    ? '#FBBF24'
                    : '#D97706',
                },
              ]}
            >
              {formatDuration(member.elapsedSeconds)}
            </Text>
          </View>

          <View
            style={[
              styles.statBox,
              {
                backgroundColor: isDark ? '#121824' : '#FFFFFF',
                borderColor: isDark ? '#1E293B' : 'rgba(226, 232, 240, 0.75)',
              },
            ]}
          >
            <Text style={[styles.statLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Started At
            </Text>
            <View style={styles.startedAtRow}>
              <Clock size={14} color={isDark ? '#94A3B8' : '#64748B'} />
              <Text
                style={[
                  styles.startedAtValue,
                  { color: isDark ? '#F1F5F9' : '#0F172A' },
                ]}
              >
                {member.startedAt || '—'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.infoCard,
          {
            backgroundColor: isDark ? '#171F2E' : 'rgba(248, 250, 252, 0.85)',
            borderColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(226, 232, 240, 0.85)',
          },
        ]}
      >
        <Text
          style={[
            styles.infoCardHeading,
            { color: isDark ? '#94A3B8' : '#64748B' },
          ]}
        >
          STUDY SESSION
        </Text>

        <View style={styles.sessionMetaGrid}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Focus Mode
            </Text>
            <View style={styles.sessionValueRow}>
              <Timer size={14} color={isDark ? '#CBD5E1' : '#334155'} />
              <Text
                style={[
                  styles.sessionValueText,
                  { color: isDark ? '#F1F5F9' : '#0F172A' },
                ]}
              >
                {member.mode || 'Standard'}
              </Text>
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Session Duration
            </Text>
            <Text
              style={[
                styles.sessionValueText,
                { color: isDark ? '#F1F5F9' : '#0F172A', marginTop: 3 },
              ]}
            >
              {formatTargetDuration(member.targetSeconds)}
            </Text>
          </View>
        </View>

        {hasProgressData && progressPercent !== null && (
          <View
            style={[
              styles.progressSection,
              { borderTopColor: isDark ? '#1E293B' : 'rgba(226, 232, 240, 0.7)' },
            ]}
          >
            <View style={styles.progressLabelRow}>
              <Text style={[styles.fieldLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Session Progress
              </Text>
              <Text
                style={[
                  styles.progressPercentText,
                  { color: isDark ? '#F1F5F9' : '#0F172A' },
                ]}
              >
                {progressPercent}%
              </Text>
            </View>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progressPercent}%`,
                    backgroundColor: isFocusing ? '#10B981' : '#F59E0B',
                  },
                ]}
              />
            </View>
          </View>
        )}
      </View>

      {isCurrentUser && (
        <View style={styles.selfActionsRow}>
          <Pressable
            onPress={onPauseToggle}
            style={({ pressed }) => [
              styles.selfActionBtn,
              {
                backgroundColor: isFocusing
                  ? isDark
                    ? 'rgba(245, 158, 11, 0.15)'
                    : '#FFFBEB'
                  : '#059669',
                borderWidth: isFocusing ? 1 : 0,
                borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : '#FDE68A',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            {isFocusing ? (
              <>
                <Pause size={16} color={isDark ? '#FCD34D' : '#B45309'} />
                <Text
                  style={[
                    styles.selfActionBtnText,
                    { color: isDark ? '#FCD34D' : '#B45309' },
                  ]}
                >
                  Pause Break
                </Text>
              </>
            ) : (
              <>
                <Play size={16} color="#FFFFFF" />
                <Text style={[styles.selfActionBtnText, { color: '#FFFFFF' }]}>
                  Resume Focus
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              onEndSession();
              onClose();
            }}
            style={({ pressed }) => [
              styles.selfActionBtn,
              {
                backgroundColor: isDark ? 'rgba(244, 63, 94, 0.12)' : '#FFF1F2',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(244, 63, 94, 0.35)' : '#FECDD3',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Square size={15} color={isDark ? '#FDA4AF' : '#E11D48'} />
            <Text
              style={[
                styles.selfActionBtnText,
                { color: isDark ? '#FDA4AF' : '#E11D48' },
              ]}
            >
              End Session
            </Text>
          </Pressable>
        </View>
      )}

      {!isCurrentUser && (
        <View style={styles.privacyFooter}>
          <ShieldCheck size={14} color={isDark ? '#64748B' : '#94A3B8'} />
          <Text
            style={[
              styles.privacyFooterText,
              { color: isDark ? '#64748B' : '#94A3B8' },
            ]}
          >
            Showing only live study details shared by {member.name.split(' ')[0]}
          </Text>
        </View>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  detailProfileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  detailAvatarRing: {
    padding: 2,
    borderRadius: 18,
    borderWidth: 2,
    position: 'relative',
  },
  detailAvatarBox: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailAvatarInitials: {
    fontSize: 16,
    fontWeight: '700',
  },
  detailAvatarDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  detailNameWrap: {
    flex: 1,
  },
  detailNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  detailName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  detailYouPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  detailYouPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 5,
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  detailBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  closeIconBtn: {
    padding: 8,
    borderRadius: 12,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  infoCardHeading: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.9,
    marginBottom: 12,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  subjectIconBox: {
    padding: 8,
    borderRadius: 12,
  },
  fieldLabel: {
    fontSize: 12,
  },
  subjectTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  topicText: {
    fontSize: 12,
    marginTop: 2,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  statLabel: {
    fontSize: 11,
  },
  statElapsedValue: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 3,
  },
  startedAtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  startedAtValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  sessionMetaGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  sessionValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  sessionValueText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  selfActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  selfActionBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  selfActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  privacyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  privacyFooterText: {
    fontSize: 11,
  },
  staticDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
