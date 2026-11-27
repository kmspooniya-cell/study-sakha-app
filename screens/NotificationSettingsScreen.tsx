import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Txt } from '../components/ui';
import { useNotificationPreferences } from '../hooks/notifications/useNotificationPreferences';
import type { AppNavigation } from '../lib/navigation';
import { radii, useTheme } from '../lib/theme';

const QUIET_START_OPTIONS = ['21:00', '22:00', '22:30', '23:00', '23:30'];
const QUIET_END_OPTIONS = ['05:00', '05:30', '06:00', '06:30', '07:00'];

type PreferenceRowProps = {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  testID?: string;
  last?: boolean;
};

function PreferenceRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
  testID,
  last,
}: PreferenceRowProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        minHeight: 54,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.borderSubtle,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={14.5} weight="600">
          {label}
        </Txt>
        {description ? (
          <Txt size={12} color={colors.textMuted}>
            {description}
          </Txt>
        ) : null}
      </View>
      <Switch
        testID={testID}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.borderStrong, true: colors.blue }}
        thumbColor="#FFFFFF"
        accessibilityLabel={label}
      />
    </View>
  );
}

type ExpandableSectionProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  testID?: string;
};

function ExpandableSection({
  title,
  subtitle,
  icon,
  expanded,
  onToggle,
  children,
  testID,
}: ExpandableSectionProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}. ${subtitle}`}
        testID={testID}
        style={({ pressed }) => ({
          minHeight: 58,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              backgroundColor: colors.tint,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={icon} size={18} color={colors.blue} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Txt size={15} weight="800">
              {title}
            </Txt>
            <Txt size={12} color={colors.textMuted} numberOfLines={1}>
              {subtitle}
            </Txt>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={19}
          color={colors.textMuted}
        />
      </Pressable>
      {expanded ? (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.borderSubtle }}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AppNavigation>();
  const {
    preferences,
    saveFeedback,
    saveError,
    osPermission,
    updatePreferences,
    requestSystemPermission,
    openSystemSettings,
  } = useNotificationPreferences();

  const [expandedSections, setExpandedSections] = useState({
    general: true,
    study: false,
    social: false,
    updates: false,
    quietHours: false,
  });

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBack = useCallback(() => {
    if (navigation.canGoBack?.()) {
      navigation.goBack();
    } else {
      navigation.navigate('Notifications');
    }
    return true;
  }, [navigation]);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigation.isFocused && !navigation.isFocused()) return false;
      return handleBack();
    });
    return () => sub.remove();
  }, [handleBack, navigation]);

  return (
    <View
      testID="notification-settings-screen"
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      {/* Sticky Immersive Header */}
      <View
        style={{
          minHeight: 58,
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
            testID="notification-settings-back"
            style={({ pressed }) => ({
              minWidth: 48,
              minHeight: 48,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
            })}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Txt size={18} weight="800" display numberOfLines={1}>
              Notification Settings
            </Txt>
            <Txt size={12} color={colors.textMuted} numberOfLines={1}>
              Manage alerts, categories, and quiet hours
            </Txt>
          </View>
        </View>

        {saveFeedback ? (
          <View
            testID="notification-settings-saved-pill"
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: radii.pill,
              backgroundColor: `${colors.success}1A`,
            }}
          >
            <Txt size={11.5} weight="700" color={colors.success}>
              {saveFeedback}
            </Txt>
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
      >
        {/* OS-Level Permission Status Banner */}
        {osPermission === 'denied' || osPermission === 'undetermined' ? (
          <View
            testID="os-permission-banner"
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: `${colors.warning}88`,
              padding: 14,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Ionicons name="notifications-off-outline" size={20} color={colors.warning} />
              <View style={{ flex: 1, gap: 3 }}>
                <Txt size={14} weight="800">
                  {osPermission === 'denied'
                    ? 'System notifications are turned off'
                    : 'Allow system notifications'}
                </Txt>
                <Txt size={12.5} color={colors.textMuted}>
                  {osPermission === 'denied'
                    ? 'In-app preferences are saved separately, but Android OS permission is required to show push alerts. Open system settings to allow notifications.'
                    : 'Grant OS notification permission to receive study reminders and group alerts outside the app.'}
                </Txt>
              </View>
            </View>
            <Button
              label={osPermission === 'denied' ? 'Open System Settings' : 'Allow Notifications'}
              variant="outline"
              size="sm"
              onPress={() => {
                if (osPermission === 'denied') void openSystemSettings();
                else void requestSystemPermission();
              }}
            />
          </View>
        ) : null}

        {saveError ? (
          <View
            style={{
              padding: 12,
              borderRadius: radii.md,
              backgroundColor: `${colors.danger}18`,
              borderWidth: 1,
              borderColor: `${colors.danger}55`,
            }}
          >
            <Txt size={12.5} color={colors.danger} weight="600">
              {saveError}
            </Txt>
          </View>
        ) : null}

        {/* 1. General */}
        <ExpandableSection
          title="General"
          subtitle="Push, in-app inbox, sound, and vibration"
          icon="options-outline"
          expanded={expandedSections.general}
          onToggle={() => toggleSection('general')}
          testID="section-general"
        >
          <PreferenceRow
            label="Push notifications"
            description="Deliver alerts to your device notification tray"
            value={preferences.general.pushEnabled}
            testID="toggle-push-enabled"
            onValueChange={(val) =>
              void updatePreferences((prev) => ({
                ...prev,
                general: { ...prev.general, pushEnabled: val },
              }))
            }
          />
          <PreferenceRow
            label="In-app notifications"
            description="Keep updates visible in your Notification Centre"
            value={preferences.general.inAppEnabled}
            testID="toggle-inapp-enabled"
            onValueChange={(val) =>
              void updatePreferences((prev) => ({
                ...prev,
                general: { ...prev.general, inAppEnabled: val },
              }))
            }
          />
          <PreferenceRow
            label="Sound"
            value={preferences.general.sound}
            testID="toggle-sound"
            onValueChange={(val) =>
              void updatePreferences((prev) => ({
                ...prev,
                general: { ...prev.general, sound: val },
              }))
            }
          />
          <PreferenceRow
            label="Vibration"
            value={preferences.general.vibration}
            testID="toggle-vibration"
            last
            onValueChange={(val) =>
              void updatePreferences((prev) => ({
                ...prev,
                general: { ...prev.general, vibration: val },
              }))
            }
          />
        </ExpandableSection>

        {/* 2. Study */}
        <ExpandableSection
          title="Study"
          subtitle="Planner, focus sessions, test results, and streaks"
          icon="book-outline"
          expanded={expandedSections.study}
          onToggle={() => toggleSection('study')}
          testID="section-study"
        >
          <PreferenceRow
            label="Planner reminders"
            value={preferences.study.plannerReminders}
            testID="toggle-study-planner"
            onValueChange={(val) =>
              void updatePreferences((prev) => ({
                ...prev,
                study: { ...prev.study, plannerReminders: val },
              }))
            }
          />
          <PreferenceRow
            label="Focus notifications"
            value={preferences.study.focusNotifications}
            testID="toggle-study-focus"
            onValueChange={(val) =>
              void updatePreferences((prev) => ({
                ...prev,
                study: { ...prev.study, focusNotifications: val },
              }))
            }
          />
          <PreferenceRow
            label="Test results"
            value={preferences.study.testResults}
            testID="toggle-study-tests"
            onValueChange={(val) =>
              void updatePreferences((prev) => ({
                ...prev,
                study: { ...prev.study, testResults: val },
              }))
            }
          />
          <PreferenceRow
            label="Streak updates"
            value={preferences.study.streakUpdates}
            testID="toggle-study-streaks"
            last
            onValueChange={(val) =>
              void updatePreferences((prev) => ({
                ...prev,
                study: { ...prev.study, streakUpdates: val },
              }))
            }
          />
        </ExpandableSection>

        {/* 3. Social */}
        <ExpandableSection
          title="Social"
          subtitle="Friend requests, group invites, messages, and mentions"
          icon="people-outline"
          expanded={expandedSections.social}
          onToggle={() => toggleSection('social')}
          testID="section-social"
        >
          <PreferenceRow
            label="Friend requests"
            value={preferences.social.friendRequests}
            testID="toggle-social-friends"
            onValueChange={(val) =>
              void updatePreferences((prev) => ({
                ...prev,
                social: { ...prev.social, friendRequests: val },
              }))
            }
          />
          <PreferenceRow
            label="Group invitations"
            value={preferences.social.groupInvitations}
            testID="toggle-social-invites"
            onValueChange={(val) =>
              void updatePreferences((prev) => ({
                ...prev,
                social: { ...prev.social, groupInvitations: val },
              }))
            }
          />
          <PreferenceRow
            label="Group messages"
            value={preferences.social.groupMessages}
            testID="toggle-social-messages"
            onValueChange={(val) =>
              void updatePreferences((prev) => ({
                ...prev,
                social: { ...prev.social, groupMessages: val },
              }))
            }
          />
          <PreferenceRow
            label="Mentions and replies"
            value={preferences.social.mentionsAndReplies}
            testID="toggle-social-mentions"
            last
            onValueChange={(val) =>
              void updatePreferences((prev) => ({
                ...prev,
                social: { ...prev.social, mentionsAndReplies: val },
              }))
            }
          />
        </ExpandableSection>

        {/* 4. Updates */}
        <ExpandableSection
          title="Updates"
          subtitle="Announcements, app updates, and system notices"
          icon="megaphone-outline"
          expanded={expandedSections.updates}
          onToggle={() => toggleSection('updates')}
          testID="section-updates"
        >
          <PreferenceRow
            label="Announcements"
            value={preferences.updates.announcements}
            testID="toggle-updates-announcements"
            onValueChange={(val) =>
              void updatePreferences((prev) => ({
                ...prev,
                updates: { ...prev.updates, announcements: val },
              }))
            }
          />
          <PreferenceRow
            label="Important app updates"
            value={preferences.updates.appUpdates}
            testID="toggle-updates-app"
            onValueChange={(val) =>
              void updatePreferences((prev) => ({
                ...prev,
                updates: { ...prev.updates, appUpdates: val },
              }))
            }
          />
          <PreferenceRow
            label="System updates"
            value={preferences.updates.systemUpdates}
            testID="toggle-updates-system"
            last
            onValueChange={(val) =>
              void updatePreferences((prev) => ({
                ...prev,
                updates: { ...prev.updates, systemUpdates: val },
              }))
            }
          />
        </ExpandableSection>

        {/* 5. Quiet Hours */}
        <ExpandableSection
          title="Quiet Hours"
          subtitle={
            preferences.quietHours.enabled
              ? `${preferences.quietHours.startTime} – ${preferences.quietHours.endTime} (${preferences.quietHours.timezone})`
              : 'Off'
          }
          icon="moon-outline"
          expanded={expandedSections.quietHours}
          onToggle={() => toggleSection('quietHours')}
          testID="section-quiet-hours"
        >
          <PreferenceRow
            label="Enable Quiet Hours"
            description="Suppress non-urgent push alerts while keeping inbox items and alarms active"
            value={preferences.quietHours.enabled}
            testID="toggle-quiet-hours"
            onValueChange={(val) =>
              void updatePreferences((prev) => ({
                ...prev,
                quietHours: { ...prev.quietHours, enabled: val },
              }))
            }
          />

          <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
            <View style={{ gap: 6 }}>
              <Txt size={12.5} weight="700" color={colors.textMuted}>
                Start time
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {QUIET_START_OPTIONS.map((time) => {
                  const active = preferences.quietHours.startTime === time;
                  return (
                    <Pressable
                      key={time}
                      onPress={() =>
                        void updatePreferences((prev) => ({
                          ...prev,
                          quietHours: { ...prev.quietHours, startTime: time },
                        }))
                      }
                      style={{
                        minHeight: 36,
                        paddingHorizontal: 12,
                        borderRadius: radii.pill,
                        borderWidth: 1,
                        borderColor: active ? colors.blue : colors.border,
                        backgroundColor: active ? colors.tint : colors.bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Txt size={12.5} weight="700" color={active ? colors.blue : colors.text}>
                        {time}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Txt size={12.5} weight="700" color={colors.textMuted}>
                End time
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {QUIET_END_OPTIONS.map((time) => {
                  const active = preferences.quietHours.endTime === time;
                  return (
                    <Pressable
                      key={time}
                      onPress={() =>
                        void updatePreferences((prev) => ({
                          ...prev,
                          quietHours: { ...prev.quietHours, endTime: time },
                        }))
                      }
                      style={{
                        minHeight: 36,
                        paddingHorizontal: 12,
                        borderRadius: radii.pill,
                        borderWidth: 1,
                        borderColor: active ? colors.blue : colors.border,
                        backgroundColor: active ? colors.tint : colors.bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Txt size={12.5} weight="700" color={active ? colors.blue : colors.text}>
                        {time}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Txt size={11.5} color={colors.textFaint}>
              Timezone: {preferences.quietHours.timezone}
            </Txt>
          </View>
        </ExpandableSection>
      </ScrollView>
    </View>
  );
}
