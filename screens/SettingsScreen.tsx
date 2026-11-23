import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigation } from '../lib/navigation';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Switch, View } from 'react-native';
import { Shell } from '../components/Shell';
import { Txt } from '../components/ui';
import { EXAMS } from '../lib/data';
import { t } from '../lib/i18n';
import { useStore } from '../lib/store';
import { radii, useTheme, type ThemeMode } from '../lib/theme';

type SettingsIcon = keyof typeof Ionicons.glyphMap;

function SettingsSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: SettingsIcon;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 }}>
        <Ionicons name={icon} size={16} color={colors.blue} />
        <Txt size={13} weight="800" color={colors.textMuted}>{title}</Txt>
      </View>
      <View
        style={{
          overflow: 'hidden',
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        {children}
      </View>
    </View>
  );
}

function SettingsRow({
  title,
  subtitle,
  icon,
  onPress,
  right,
  last = false,
  danger = false,
}: {
  title: string;
  subtitle?: string;
  icon: SettingsIcon;
  onPress?: () => void;
  right?: React.ReactNode;
  last?: boolean;
  danger?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View>
      <View style={{ minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 8 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: danger ? `${colors.danger}18` : colors.surfaceAlt,
          }}
        >
          <Ionicons name={icon} size={17} color={danger ? colors.danger : colors.textMuted} />
        </View>
        <Pressable
          accessibilityRole={onPress ? 'button' : undefined}
          disabled={!onPress}
          onPress={onPress}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 42,
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Txt size={13.5} weight="700" color={danger ? colors.danger : colors.text}>
            {title}
          </Txt>
          {subtitle ? (
            <Txt size={11.5} color={colors.textMuted} numberOfLines={2} style={{ marginTop: 2 }}>
              {subtitle}
            </Txt>
          ) : null}
        </Pressable>
        {right}
        {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textFaint} /> : null}
      </View>
      {!last ? <View style={{ height: 1, marginLeft: 56, backgroundColor: colors.border }} /> : null}
    </View>
  );
}

function SettingsChoice({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: 34,
        height: 32,
        paddingHorizontal: 7,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? colors.tint : 'transparent',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Txt size={11} weight="800" color={selected ? colors.blue : colors.textMuted}>{label}</Txt>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { colors, mode } = useTheme();
  const nav = useNavigation<AppNavigation>();
  const { state, dispatch, signOut, saveProfile } = useStore();
  const lang = state.settings.language;
  const [picker, setPicker] = useState<'theme' | 'category' | null>(null);
  const [resetComplete, setResetComplete] = useState(false);
  const [actionError, setActionError] = useState('');
  const [resetError, setResetError] = useState('');
  const [profileError, setProfileError] = useState('');

  const setSettings = (patch: Partial<typeof state.settings>) => dispatch({ type: 'settings', patch });
  const updateExam = async (exam: (typeof EXAMS)[number]['id']) => {
    if (!state.user) return;
    setProfileError('');
    try {
      const result = await saveProfile({ exam });
      if (!result.ok) setProfileError(result.error);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Unable to save your study category.');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You can sign back in at any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: t('signOut', lang),
        style: 'destructive',
        onPress: async () => {
          setActionError('');
          try {
            const result = await signOut();
            if (!result.ok) setActionError(result.error ?? 'Unable to sign out.');
          } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Unable to sign out.');
          }
        },
      },
    ]);
  };

  const handleReset = () => {
    Alert.alert('Reset saved data?', 'This removes saved Study Sakha data from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset data',
        style: 'destructive',
        onPress: () => {
          setResetError('');
          setResetComplete(false);
          void AsyncStorage.clear().then(
            () => setResetComplete(true),
            (error: unknown) => setResetError(error instanceof Error ? error.message : 'Unable to reset saved data.'),
          );
        },
      },
    ]);
  };

  const exam = EXAMS.find((item) => item.id === state.user?.exam) ?? EXAMS[0];
  const themeModes: { value: ThemeMode; label: string; icon: SettingsIcon }[] = [
    { value: 'light', label: 'Light', icon: 'sunny-outline' },
    { value: 'dark', label: 'Dark', icon: 'moon-outline' },
    { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
  ];

  return (
    <Shell active="Settings" title={t('settings', lang)} subtitle="Personalise your Study Sakha experience">
      <View style={{ gap: 20, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
        <SettingsSection title="Personal Settings" icon="person-outline">
          <SettingsRow
            title="Appearance"
            subtitle="Choose how Study Sakha looks"
            icon="color-palette-outline"
            onPress={() => setPicker('theme')}
            right={<Txt size={12} weight="700" color={colors.textMuted}>{mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light'}</Txt>}
          />
          <SettingsRow
            title="Theme Settings"
            icon="contrast-outline"
            right={
              <View style={{ flexDirection: 'row', gap: 1 }}>
                {themeModes.map((option) => (
                  <SettingsChoice
                    key={option.value}
                    label={option.label === 'System' ? 'Auto' : option.label}
                    accessibilityLabel={`${option.label} theme`}
                    selected={state.settings.themeMode === option.value}
                    onPress={() => setSettings({ themeMode: option.value })}
                  />
                ))}
              </View>
            }
          />
          <SettingsRow
            title="Text Size"
            icon="text-outline"
            right={
              <View style={{ flexDirection: 'row', gap: 1 }}>
                {[
                  { label: 'A−', value: 0.92 },
                  { label: 'A', value: 1 },
                  { label: 'A+', value: 1.12 },
                ].map((option) => (
                  <SettingsChoice
                    key={option.value}
                    label={option.label}
                    accessibilityLabel={`Text size ${option.value}`}
                    selected={state.settings.textScale === option.value}
                    onPress={() => setSettings({ textScale: option.value })}
                  />
                ))}
              </View>
            }
          />
          <SettingsRow
            title="Study Preferences"
            subtitle="Plan your study schedule and targets"
            icon="school-outline"
            onPress={() => nav.navigate('StudyPlanner')}
          />
          <SettingsRow
            title="Category"
            subtitle={`Current study focus: ${exam.short}`}
            icon="list-outline"
            onPress={() => setPicker('category')}
            right={<Txt size={12} weight="700" color={colors.textMuted}>{exam.short}</Txt>}
          />
          {profileError ? (
            <View accessibilityRole="alert" style={{ paddingHorizontal: 56, paddingBottom: 8 }}>
              <Txt size={12} color={colors.danger}>{profileError}</Txt>
            </View>
          ) : null}
          <SettingsRow
            title="Select Language"
            icon="language-outline"
            last
            right={
              <View style={{ flexDirection: 'row', gap: 1 }}>
                <SettingsChoice label="EN" accessibilityLabel="English" selected={lang === 'en'} onPress={() => setSettings({ language: 'en' })} />
                <SettingsChoice label="हि" accessibilityLabel="Hindi" selected={lang === 'hi'} onPress={() => setSettings({ language: 'hi' })} />
              </View>
            }
          />
        </SettingsSection>

        <SettingsSection title="Group Settings" icon="people-outline">
          <SettingsRow
            title="My Groups"
            subtitle="View joined groups and open a group's profile"
            icon="people-circle-outline"
            onPress={() => nav.navigate('Groups')}
            last
          />
        </SettingsSection>

        <SettingsSection title="Personal Account Settings" icon="person-circle-outline">
          <SettingsRow
            title="Nickname"
            subtitle={state.user?.name ?? 'Guest'}
            icon="create-outline"
            onPress={() => nav.navigate('Profile')}
          />
          <SettingsRow
            title="Account Settings"
            subtitle="Profile and account information"
            icon="settings-outline"
            onPress={() => nav.navigate('Profile')}
          />
          <SettingsRow
            title={t('signOut', lang)}
            icon="log-out-outline"
            onPress={handleSignOut}
            danger
            last
          />
          {actionError ? (
            <View accessibilityRole="alert" style={{ paddingHorizontal: 56, paddingBottom: 10 }}>
              <Txt size={12} color={colors.danger}>{actionError}</Txt>
            </View>
          ) : null}
        </SettingsSection>

        <SettingsSection title="Notifications" icon="notifications-outline">
          <SettingsRow
            title="Notification Preferences"
            subtitle="Controls the notification inbox on this device"
            icon="notifications-outline"
            last
            right={
              <Switch
                accessibilityLabel="Notification Preferences"
                value={state.settings.notifications}
                onValueChange={(notifications) => setSettings({ notifications })}
                trackColor={{ true: colors.blue, false: colors.border }}
                thumbColor="#fff"
              />
            }
          />
        </SettingsSection>

        <SettingsSection title="Privacy & Data" icon="shield-checkmark-outline">
          <SettingsRow
            title="Data & Storage"
            subtitle="Reset locally saved Study Sakha data"
            icon="server-outline"
            onPress={handleReset}
            right={<Txt size={11.5} weight="700" color={resetComplete ? colors.green : colors.textMuted}>{resetComplete ? 'Reset' : 'On device'}</Txt>}
            danger
            last
          />
          {resetError ? (
            <View accessibilityRole="alert" style={{ paddingHorizontal: 56, paddingBottom: 10 }}>
              <Txt size={12} color={colors.danger}>{resetError}</Txt>
            </View>
          ) : null}
        </SettingsSection>

        <SettingsSection title="About & Support" icon="information-circle-outline">
          <SettingsRow
            title="How to Use the App"
            subtitle="Explore a quick guide to Study Sakha"
            icon="help-circle-outline"
            onPress={() => nav.navigate('AppGuide')}
          />
          <SettingsRow
            title="App Version"
            icon="phone-portrait-outline"
            last
            right={<Txt size={12} weight="700" color={colors.textMuted}>1.0.0</Txt>}
          />
        </SettingsSection>
      </View>

      <Modal
        visible={picker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPicker(null)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close settings options"
          onPress={() => setPicker(null)}
          style={{ flex: 1, justifyContent: 'center', padding: 18, backgroundColor: colors.overlay }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 420,
              maxHeight: '80%',
              alignSelf: 'center',
              borderRadius: radii.dialog,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 18,
              backgroundColor: colors.surface,
            }}
          >
            <Txt size={17} weight="800" style={{ marginBottom: 12 }}>
              {picker === 'theme' ? 'Appearance' : 'Select Category'}
            </Txt>
            <ScrollView keyboardShouldPersistTaps="handled">
              {picker === 'theme'
                ? themeModes.map((option) => (
                    <SettingsRow
                      key={option.value}
                      title={option.label}
                      icon={option.icon}
                      last={option.value === 'system'}
                      right={state.settings.themeMode === option.value ? <Ionicons name="checkmark" size={18} color={colors.blue} /> : undefined}
                      onPress={() => {
                        setSettings({ themeMode: option.value });
                        setPicker(null);
                      }}
                    />
                  ))
                : EXAMS.map((option, index) => (
                    <SettingsRow
                      key={option.id}
                      title={option.name}
                      subtitle={`${option.aspirants} aspirants`}
                      icon="school-outline"
                      last={index === EXAMS.length - 1}
                      right={exam.id === option.id ? <Ionicons name="checkmark" size={18} color={colors.blue} /> : undefined}
                      onPress={() => {
                        void updateExam(option.id);
                        setPicker(null);
                      }}
                    />
                  ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Shell>
  );
}
