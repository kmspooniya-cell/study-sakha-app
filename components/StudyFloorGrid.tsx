import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { StudyChairCard } from './StudyChairCard';
import type { ResponsiveMetrics, StudyMember } from '../lib/smartStudyRoomTypes';

export interface StudyFloorGridProps {
  chairs: StudyMember[];
  currentUserId: string;
  isDark: boolean;
  metrics: ResponsiveMetrics;
  onSelectChair: (member: StudyMember) => void;
}

export const StudyFloorGrid: React.FC<StudyFloorGridProps> = ({
  chairs,
  currentUserId,
  isDark,
  metrics,
  onSelectChair,
}) => {
  const maxContentWidth = Math.min(metrics.width, 896);
  const availableWidth = maxContentWidth - metrics.containerPaddingX * 2;
  const cardWidth = Math.floor((availableWidth - metrics.gridGap * 3) / 4);

  return (
    <View
      style={[
        styles.floorContainer,
        {
          paddingHorizontal: metrics.containerPaddingX,
          paddingTop: metrics.isMobile ? 16 : 20,
        },
      ]}
    >
      <View
        style={[
          styles.floorBanner,
          {
            backgroundColor: isDark ? '#111722' : 'rgba(255, 255, 255, 0.78)',
            borderColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(226, 232, 240, 0.85)',
          },
        ]}
      >
        <Text
          style={[
            styles.floorBannerTitle,
            { color: isDark ? '#94A3B8' : '#64748B' },
          ]}
        >
          STUDY FLOOR
        </Text>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.legendLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Focusing
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={[styles.legendLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Paused
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#94A3B8' }]} />
            <Text style={[styles.legendLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Available
            </Text>
          </View>
        </View>
      </View>
      <View style={[styles.gridWrap, { gap: metrics.gridGap }]}>
        {chairs.map((member) => (
          <StudyChairCard
            key={member.id}
            member={member}
            isCurrentUser={member.id === currentUserId}
            isDark={isDark}
            metrics={metrics}
            cardWidth={cardWidth}
            onSelect={onSelectChair}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floorContainer: {
    width: '100%',
    maxWidth: 896,
  },
  floorBanner: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  floorBannerTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.7,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
});