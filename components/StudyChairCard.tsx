import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { PulsingEmeraldDot } from './PulsingEmeraldDot';
import { StudyDeskIllustration } from './StudyDeskIllustration';
import type { ResponsiveMetrics, StudyMember } from '../lib/smartStudyRoomTypes';
import { formatDuration } from '../lib/smartStudyRoom';

export interface StudyChairCardProps {
  member: StudyMember;
  isCurrentUser: boolean;
  isDark: boolean;
  metrics: ResponsiveMetrics;
  cardWidth: number;
  onSelect: (member: StudyMember) => void;
}

export const StudyChairCard: React.FC<StudyChairCardProps> = ({
  member,
  isCurrentUser,
  isDark,
  metrics,
  cardWidth,
  onSelect,
}) => {
  const { state, name, initials, avatarBgColor, avatarTextColor, subject, elapsedSeconds } = member;
  const isFocusing = state === 'focusing';
  const isPaused = state === 'paused';
  const isAvailable = state === 'available';

  const cardThemeStyle = useMemo<ViewStyle>(() => {
    if (isFocusing) {
      return isDark
        ? { backgroundColor: '#111D1B', borderColor: 'rgba(16, 185, 129, 0.4)' }
        : { backgroundColor: '#FFFFFF', borderColor: '#A7F3D0', shadowColor: '#10B981', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 1 };
    }
    if (isPaused) {
      return isDark
        ? { backgroundColor: '#1D1912', borderColor: 'rgba(245, 158, 11, 0.4)' }
        : { backgroundColor: '#FFFFFF', borderColor: '#FDE68A', shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 1 };
    }
    return isDark
      ? { backgroundColor: '#131924', borderColor: '#1E293B' }
      : { backgroundColor: '#FFFFFF', borderColor: 'rgba(226, 232, 240, 0.9)', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 };
  }, [isFocusing, isPaused, isDark]);

  const currentUserRingStyle = useMemo<ViewStyle | undefined>(() => {
    if (!isCurrentUser) return undefined;
    return {
      borderWidth: 1.5,
      borderColor: isAvailable ? (isDark ? 'rgba(59, 130, 246, 0.45)' : 'rgba(59, 130, 246, 0.35)') : cardThemeStyle.borderColor,
    };
  }, [isCurrentUser, isAvailable, isDark, cardThemeStyle.borderColor]);

  const nameFontSize = metrics.isDesktop ? 13 : metrics.isTablet ? 12 : 11;
  const subFontSize = metrics.isMobile ? 9.5 : 11;
  const timerFontSize = metrics.isMobile ? 10 : 12;
  const avatarSize = metrics.isMobile ? 16 : 20;

  return (
    <Pressable
      onPress={() => onSelect(member)}
      accessibilityRole="button"
      accessibilityLabel={`${isCurrentUser ? 'Your chair' : name}, ${isFocusing ? `Focusing on ${subject}` : isPaused ? 'Paused' : 'Available'}`}
      style={({ pressed }) => [
        styles.chairCard,
        cardThemeStyle,
        currentUserRingStyle,
        { width: cardWidth, minHeight: metrics.cardMinHeight, padding: metrics.cardPadding, borderRadius: metrics.cardRadius, transform: [{ scale: pressed ? 0.975 : 1 }] },
      ]}
    >
      <View style={styles.chairTopRow}>
        {isFocusing && (
          <View style={[styles.statePill, { paddingHorizontal: metrics.isMobile ? 5 : 8, backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
            <PulsingEmeraldDot />
            {!metrics.isMobile && <Text numberOfLines={1} style={[styles.statePillText, { color: isDark ? '#6EE7B7' : '#047857' }]}>Focusing</Text>}
          </View>
        )}
        {isPaused && (
          <View style={[styles.statePill, { paddingHorizontal: metrics.isMobile ? 5 : 8, backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB' }]}>
            <View style={[styles.staticDot, { backgroundColor: '#F59E0B' }]} />
            {!metrics.isMobile && <Text numberOfLines={1} style={[styles.statePillText, { color: isDark ? '#FCD34D' : '#B45309' }]}>Paused</Text>}
          </View>
        )}
        {isAvailable && (
          <View style={[styles.statePill, { paddingHorizontal: metrics.isMobile ? 5 : 8, backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <View style={[styles.staticDot, { backgroundColor: '#94A3B8' }]} />
            {!metrics.isMobile && <Text numberOfLines={1} style={[styles.statePillText, { color: isDark ? '#94A3B8' : '#64748B' }]}>{isCurrentUser ? 'Your Chair' : 'Available'}</Text>}
          </View>
        )}
        {!isAvailable ? (
          <View style={[styles.compactAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, backgroundColor: avatarBgColor }]}>
            <Text style={[styles.compactAvatarText, { fontSize: metrics.isMobile ? 8 : 9, color: avatarTextColor || '#FFFFFF' }]}>{initials}</Text>
          </View>
        ) : (
          isCurrentUser && (
            <View style={[styles.youMiniTag, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF', paddingHorizontal: metrics.isMobile ? 4 : 6 }]}>
              <Text style={[styles.youMiniTagText, { fontSize: metrics.isMobile ? 9 : 10, color: isDark ? '#93C5FD' : '#2563EB' }]}>You</Text>
            </View>
          )
        )}
      </View>
      <View style={styles.chairIllustrationWrap}>
        <StudyDeskIllustration state={state} isDark={isDark} width={metrics.svgWidth} height={metrics.svgHeight} />
      </View>
      <View style={styles.chairBottomMeta}>
        {isAvailable ? (
          <>
            <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.chairName, { fontSize: nameFontSize, color: isDark ? '#E2E8F0' : '#1E293B' }]}>{isCurrentUser ? 'Your Chair' : name}</Text>
            <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.chairSubtext, { fontSize: subFontSize, color: isDark ? '#64748B' : '#94A3B8' }]}>{isCurrentUser ? 'Ready' : 'Not focusing'}</Text>
          </>
        ) : (
          <>
            <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.chairName, { fontSize: nameFontSize, color: isDark ? '#F1F5F9' : '#0F172A' }]}>{isCurrentUser ? `${name.split(' ')[0]} (You)` : name}</Text>
            {subject && (
              <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.chairSubtext, { fontSize: subFontSize, color: isDark ? '#94A3B8' : '#64748B' }]}>{subject}</Text>
            )}
            <Text numberOfLines={1} style={[styles.chairTimer, { fontSize: timerFontSize, marginTop: metrics.isMobile ? 2 : 4, color: isFocusing ? (isDark ? '#34D399' : '#059669') : (isDark ? '#FBBF24' : '#D97706') }]}>{formatDuration(elapsedSeconds)}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chairCard: { borderWidth: 1, justifyContent: 'space-between', overflow: 'hidden' },
  chairTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginBottom: 4 },
  statePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, borderRadius: 999 },
  statePillText: { fontSize: 10, fontWeight: '600' },
  staticDot: { width: 6, height: 6, borderRadius: 3 },
  compactAvatar: { alignItems: 'center', justifyContent: 'center' },
  compactAvatarText: { fontWeight: '700' },
  youMiniTag: { paddingVertical: 2, borderRadius: 6 },
  youMiniTagText: { fontWeight: '600' },
  chairIllustrationWrap: { alignItems: 'center', justifyContent: 'center', marginVertical: 2 },
  chairBottomMeta: { alignItems: 'center', marginTop: 2, width: '100%' },
  chairName: { fontWeight: '600', textAlign: 'center', width: '100%' },
  chairSubtext: { textAlign: 'center', marginTop: 1, width: '100%' },
  chairTimer: { fontWeight: '700', textAlign: 'center' } as TextStyle,
});
