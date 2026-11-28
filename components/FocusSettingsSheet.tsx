/* eslint-disable react-hooks/refs -- PanResponder and ScrollView refs coordinate gesture dismissal and tab visibility. */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themeById } from '../themes';
import type { ThemeId } from '../types';

export type FocusSettingsTab = 'theme' | 'audio' | 'visual' | 'timer' | 'apps';

export const FOCUS_SETTINGS_TABS: readonly {
  id: FocusSettingsTab;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { id: 'theme', label: 'Theme', icon: 'color-palette-outline' },
  { id: 'audio', label: 'Audio', icon: 'musical-notes-outline' },
  { id: 'visual', label: 'Visual', icon: 'sparkles-outline' },
  { id: 'timer', label: 'Timer', icon: 'timer-outline' },
  { id: 'apps', label: 'Apps', icon: 'shield-outline' },
];

export type FocusSettingsSheetProps = {
  visible: boolean;
  onClose: () => void;
  themeId: ThemeId;
  onSelectTheme: (nextTheme: ThemeId) => void;
  onMusicPress: () => void;
  motionEnabled: boolean;
  onToggleMotion: (enabled: boolean) => void;
  focusDurationMinutes: number;
  onResetTimer: () => void;
  blockedAppsCount: number;
  onManageBlockedApps: () => void;
};

export function FocusSettingsSheet({
  visible,
  onClose,
  themeId,
  onSelectTheme,
  onMusicPress,
  motionEnabled,
  onToggleMotion,
  focusDurationMinutes,
  onResetTimer,
  blockedAppsCount,
  onManageBlockedApps,
}: FocusSettingsSheetProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<FocusSettingsTab>('theme');
  const wasVisibleRef = useRef(false);
  const tabScrollRef = useRef<ScrollView | null>(null);
  const contentScrollRef = useRef<ScrollView | null>(null);
  const tabLayoutsRef = useRef<Partial<Record<FocusSettingsTab, { x: number; width: number }>>>({});
  const translateY = useRef(new Animated.Value(0)).current;

  const activeTheme = themeById[themeId] ?? themeById.obsidian;

  useEffect(() => {
    const justOpened = visible && !wasVisibleRef.current;
    wasVisibleRef.current = visible;
    if (justOpened) {
      setActiveTab('theme');
      translateY.setValue(0);
    }
  }, [translateY, visible]);

  const dragPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          translateY.setValue(Math.max(0, gesture.dy));
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 80 || gesture.vy > 0.7) {
            onClose();
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 4,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [onClose, translateY],
  );

  const handleSelectTab = (tabId: FocusSettingsTab) => {
    setActiveTab(tabId);
    const layout = tabLayoutsRef.current[tabId];
    if (layout) {
      tabScrollRef.current?.scrollTo({
        x: Math.max(0, layout.x - 24),
        animated: true,
      });
    }
    contentScrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const sheetMaxHeight = Math.max(
    260,
    height - Math.max(insets.top, 16) - Math.max(insets.bottom, 12) - 24,
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Dismiss settings backdrop"
        />
        <Animated.View
          testID="focus-settings-sheet"
          style={[
            styles.settingsSheet,
            {
              width: Math.min(width - 24, 420),
              maxHeight: sheetMaxHeight,
              marginBottom: Math.max(insets.bottom, 12),
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Fixed Handle + Header (supports drag-to-dismiss without interfering with inner ScrollViews) */}
          <View {...dragPanResponder.panHandlers}>
            <View style={styles.sheetHandle} />
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Focus & Visual Settings</Text>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close settings"
                style={styles.closeButton}
              >
                <Ionicons name="close" size={19} color="rgba(255,255,255,0.85)" />
              </Pressable>
            </View>
          </View>

          {/* Fixed Horizontal Category Navigation Bar */}
          <View style={styles.tabBarWrapper}>
            <ScrollView
              ref={tabScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.tabBarContent}
              testID="focus-settings-tab-bar"
            >
              {FOCUS_SETTINGS_TABS.map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    testID={`focus-settings-tab-${tab.id}`}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isSelected }}
                    onLayout={(event) => {
                      tabLayoutsRef.current[tab.id] = {
                        x: event.nativeEvent.layout.x,
                        width: event.nativeEvent.layout.width,
                      };
                    }}
                    onPress={() => handleSelectTab(tab.id)}
                    style={({ pressed }) => [
                      styles.tabButton,
                      isSelected
                        ? [
                            styles.tabButtonActive,
                            { borderColor: activeTheme.accent },
                          ]
                        : styles.tabButtonInactive,
                      pressed ? styles.tabButtonPressed : null,
                    ]}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={14}
                      color={isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.62)'}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.tabLabel,
                        isSelected ? styles.tabLabelActive : styles.tabLabelInactive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Vertically Scrollable Active Category Content */}
          <ScrollView
            ref={contentScrollRef}
            style={styles.contentScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            contentContainerStyle={[
              styles.contentContainer,
              { paddingBottom: Math.max(insets.bottom > 0 ? 6 : 10, 8) },
            ]}
            testID="focus-settings-content-scroll"
          >
            {activeTab === 'theme' ? (
              <View testID="focus-settings-panel-theme">
                {Object.values(themeById).map((definition) => {
                  const isSelected = themeId === definition.id;
                  return (
                    <Pressable
                      key={definition.id}
                      testID={`focus-theme-option-${definition.id}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => onSelectTheme(definition.id)}
                      style={({ pressed }) => [
                        styles.menuRow,
                        isSelected
                          ? {
                              borderColor: definition.accent,
                              backgroundColor: 'rgba(255,255,255,0.09)',
                            }
                          : null,
                        pressed ? styles.rowPressed : null,
                      ]}
                    >
                      <View style={styles.themeRowLeft}>
                        <View
                          style={[
                            styles.themeSwatch,
                            { backgroundColor: definition.accent },
                          ]}
                        />
                        <View style={styles.rowCopy}>
                          <Text style={styles.settingTitle}>{definition.name}</Text>
                          <Text style={styles.settingDescription} numberOfLines={1}>
                            {definition.mood}
                          </Text>
                        </View>
                      </View>
                      {isSelected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={19}
                          color={definition.accent}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {activeTab === 'audio' ? (
              <View testID="focus-settings-panel-audio">
                <Pressable
                  onPress={onMusicPress}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.menuRow,
                    pressed ? styles.rowPressed : null,
                  ]}
                >
                  <View style={styles.rowCopy}>
                    <Text style={styles.settingTitle}>Music</Text>
                    <Text style={styles.settingDescription}>
                      Ambient tracks & focus soundscapes
                    </Text>
                  </View>
                  <Text style={[styles.actionLabel, { color: activeTheme.accent }]}>
                    Choose
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {activeTab === 'visual' ? (
              <View testID="focus-settings-panel-visual">
                <View style={styles.settingRow}>
                  <View style={styles.settingCopy}>
                    <Text style={styles.settingTitle}>Living Atmosphere</Text>
                    <Text style={styles.settingDescription}>
                      Fireflies, drifting mist & gentle shimmer
                    </Text>
                  </View>
                  <Switch
                    value={motionEnabled}
                    onValueChange={onToggleMotion}
                    trackColor={{ false: '#41434b', true: '#168650' }}
                    thumbColor={motionEnabled ? '#56e69b' : '#f3f4f6'}
                    accessibilityLabel="Living Atmosphere"
                  />
                </View>
              </View>
            ) : null}

            {activeTab === 'timer' ? (
              <View testID="focus-settings-panel-timer">
                <Pressable
                  onPress={onResetTimer}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.resetButton,
                    pressed ? styles.rowPressed : null,
                  ]}
                >
                  <Text style={styles.resetText}>
                    Reset Timer to {focusDurationMinutes}:00
                  </Text>
                </Pressable>
                <Text style={styles.helperText}>
                  Resets the current session timer back to your configured duration.
                </Text>
              </View>
            ) : null}

            {activeTab === 'apps' ? (
              <View testID="focus-settings-panel-apps">
                <Pressable
                  onPress={onManageBlockedApps}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.menuRow,
                    pressed ? styles.rowPressed : null,
                  ]}
                >
                  <View style={styles.rowCopy}>
                    <Text style={styles.settingTitle}>
                      Blocked Apps ({blockedAppsCount})
                    </Text>
                    <Text style={styles.settingDescription}>
                      Manage distracting apps blocked during Focus Mode
                    </Text>
                  </View>
                  <Text style={[styles.actionLabel, { color: activeTheme.accent }]}>
                    Manage
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  settingsSheet: {
    backgroundColor: 'rgba(18,21,32,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 3,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginBottom: 12,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  settingsTitle: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  tabBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
  },
  tabButton: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexShrink: 0,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  tabButtonInactive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.09)',
  },
  tabButtonPressed: {
    opacity: 0.78,
  },
  tabLabel: {
    fontSize: 12,
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
  },
  tabLabelInactive: {
    color: 'rgba(255,255,255,0.68)',
    fontFamily: 'Inter_500Medium',
  },
  contentScroll: {
    flexShrink: 1,
  },
  contentContainer: {
    paddingTop: 12,
  },
  menuRow: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  rowPressed: {
    opacity: 0.8,
  },
  themeRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themeSwatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  rowCopy: {
    flex: 1,
  },
  settingRow: {
    minHeight: 72,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  settingCopy: {
    flex: 1,
  },
  settingTitle: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  settingDescription: {
    color: 'rgba(255,255,255,0.54)',
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    marginTop: 3,
  },
  actionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  resetButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    minHeight: 48,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  helperText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
    paddingHorizontal: 4,
  },
});
