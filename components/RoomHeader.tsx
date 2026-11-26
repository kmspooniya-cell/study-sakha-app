import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, Moon, Sun } from 'lucide-react-native';

export interface RoomHeaderProps {
  roomName: string;
  totalPartnersPresent: number;
  focusingNowCount: number;
  isDark: boolean;
  onToggleTheme: () => void;
  onPressBack?: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  roomName,
  totalPartnersPresent,
  focusingNowCount,
  isDark,
  onToggleTheme,
  onPressBack,
}) => {
  return (
    <View
      style={[
        styles.headerOuter,
        {
          backgroundColor: isDark ? 'rgba(11, 15, 23, 0.94)' : 'rgba(255, 255, 255, 0.94)',
          borderBottomColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(226, 232, 240, 0.85)',
        },
      ]}
    >
      <View style={styles.headerInner}>
        {onPressBack ? (
          <Pressable
            onPress={onPressBack}
            accessibilityRole="button"
            accessibilityLabel="Back from Silent Focus Hall"
            style={({ pressed }) => [
              styles.iconSquareBtn,
              {
                backgroundColor: isDark ? '#131924' : '#F8FAFC',
                borderColor: isDark ? '#1E293B' : '#E2E8F0',
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <ChevronLeft size={19} color={isDark ? '#F1F5F9' : '#0F172A'} />
          </Pressable>
        ) : null}
        <View style={styles.headerTitleGroup}>
          <Text
            numberOfLines={1}
            style={[styles.headerTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}
          >
            {roomName}
          </Text>
          <View style={styles.headerSubtitleRow}>
            <Text
              style={[
                styles.headerSubtitle,
                { color: isDark ? '#94A3B8' : '#64748B' },
              ]}
            >
              {totalPartnersPresent}{' '}
              {totalPartnersPresent === 1 ? 'study partner' : 'study partners'} present
            </Text>
            {focusingNowCount > 0 && (
              <>
                <Text
                  style={[
                    styles.headerDotSep,
                    { color: isDark ? '#64748B' : '#94A3B8' },
                  ]}
                >
                  ·
                </Text>
                <Text
                  style={[
                    styles.headerFocusingCount,
                    { color: isDark ? '#34D399' : '#059669' },
                  ]}
                >
                  {focusingNowCount} focusing
                </Text>
              </>
            )}
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={onToggleTheme}
            accessibilityRole="button"
            accessibilityLabel={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            style={({ pressed }) => [
              styles.iconSquareBtn,
              {
                backgroundColor: isDark ? '#131924' : '#F8FAFC',
                borderColor: isDark ? '#1E293B' : '#E2E8F0',
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            {isDark ? <Sun size={17} color="#FCD34D" /> : <Moon size={17} color="#475569" />}
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerOuter: {
    borderBottomWidth: 1,
    zIndex: 30,
  },
  headerInner: {
    width: '100%',
    maxWidth: 1024,
    alignSelf: 'center',
    paddingHorizontal: 16,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitleGroup: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  headerSubtitle: {
    fontSize: 12.5,
  },
  headerDotSep: {
    fontSize: 12.5,
  },
  headerFocusingCount: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconSquareBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});