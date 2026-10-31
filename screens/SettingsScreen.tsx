import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, View } from 'react-native';
import { Shell } from '../components/Shell';
import { Button, Card, Chip, SectionHeader, Tag, Txt } from '../components/ui';
import { EXAMS } from '../lib/data';
import { t } from '../lib/i18n';
import { useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';
import { AppGuideContent } from './AppGuideScreen';

const SETTINGS_SECTIONS = [
  { id: 'appearance', title: 'Appearance', icon: 'color-palette-outline', summary: 'Theme, text size, and language' },
  { id: 'study', title: 'Study', icon: 'school-outline', summary: 'Daily goal and target exam' },
  { id: 'notifications', title: 'Notifications', icon: 'notifications-outline', summary: 'Notification preferences and inbox' },
  { id: 'account', title: 'Account', icon: 'person-circle-outline', summary: 'Profile and sign out' },
  { id: 'data', title: 'Data', icon: 'server-outline', summary: 'Reset and on-device storage' },
  { id: 'about', title: 'About', icon: 'information-circle-outline', summary: 'App version and information' },
  { id: 'guide', title: 'How to Use the App', icon: 'help-circle-outline', summary: 'Explore a quick guide to the app' },
] as const;

type SettingsSection = (typeof SETTINGS_SECTIONS)[number]['id'];

export default function SettingsScreen() {
  const { colors, mode } = useTheme();
  const nav = useNavigation<any>();
  const { state, dispatch, signOut } = useStore();
  const lang = state.settings.language;
  const [cleared, setCleared] = useState(false);
  const [openSection, setOpenSection] = useState<SettingsSection | null>(null);

  const set = (patch: any) => dispatch({ type: 'settings', patch });

  const Row = ({ title, body, right }: { title: string; body?: string; right: React.ReactNode }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 }}>
      <View style={{ flex: 1 }}>
        <Txt size={14} weight="700">{title}</Txt>
        {body ? (
          <Txt size={12.5} color={colors.textMuted} style={{ marginTop: 2 }}>
            {body}
          </Txt>
        ) : null}
      </View>
      {right}
    </View>
  );

  const sectionContent: Record<SettingsSection, React.ReactNode> = {
    appearance: (
      <Card>
        <SectionHeader title={t('appearance', lang)} icon="color-palette-outline" />
        <Row
          title={t('theme', lang)}
          body={`Currently following ${mode === 'system' ? 'your device setting' : mode}`}
          right={
            <View style={{ flexDirection: 'row', gap: 7 }}>
              {(['light', 'dark', 'system'] as const).map((themeMode) => (
                <Chip
                  key={themeMode}
                  label={t(themeMode, lang)}
                  icon={themeMode === 'light' ? 'sunny-outline' : themeMode === 'dark' ? 'moon-outline' : 'contrast-outline'}
                  active={state.settings.themeMode === themeMode}
                  onPress={() => set({ themeMode })}
                />
              ))}
            </View>
          }
        />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <Row
          title={t('textSize', lang)}
          body="Scales every text style across the app"
          right={
            <View style={{ flexDirection: 'row', gap: 7 }}>
              {[
                { label: 'A', value: 0.92 },
                { label: 'A', value: 1 },
                { label: 'A', value: 1.12 },
              ].map((option, index) => (
                <Pressable
                  key={option.value}
                  onPress={() => set({ textScale: option.value })}
                  style={{
                    width: 44,
                    height: 40,
                    borderRadius: radii.control,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: state.settings.textScale === option.value ? colors.blue : colors.borderSubtle,
                    backgroundColor: state.settings.textScale === option.value ? colors.tint : colors.surface,
                  }}
                >
                  <Txt size={11 + index * 3} weight="800" color={state.settings.textScale === option.value ? colors.blue : colors.textMuted}>
                    {option.label}
                  </Txt>
                </Pressable>
              ))}
            </View>
          }
        />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <Row
          title={t('language', lang)}
          body="Interface language for labels and settings"
          right={
            <View style={{ flexDirection: 'row', gap: 7 }}>
              <Chip label="English" active={lang === 'en'} onPress={() => set({ language: 'en' })} />
              <Chip label="हिंदी" active={lang === 'hi'} onPress={() => set({ language: 'hi' })} />
            </View>
          }
        />
      </Card>
    ),
    study: (
      <Card>
        <SectionHeader title={t('study', lang)} icon="school-outline" />
        <Row
          title={t('dailyGoal', lang)}
          body={`${state.settings.dailyGoalMin} minutes per day`}
          right={
            <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {[60, 90, 120, 180, 240, 360, 480, 720].map((goal) => (
                <Chip
                  key={goal}
                  label={`${goal}m`}
                  active={state.settings.dailyGoalMin === goal}
                  onPress={() => {
                    set({ dailyGoalMin: goal });
                    dispatch({ type: 'plannerSettings', patch: { dailyTargetHours: goal / 60 } });
                  }}
                />
              ))}
            </View>
          }
        />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <View style={{ paddingVertical: 12, gap: 10 }}>
          <Txt size={14} weight="700">{t('targetExam', lang)}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {EXAMS.map((exam) => (
              <Chip
                key={exam.id}
                label={exam.short}
                tone={exam.color}
                active={state.user?.exam === exam.id}
                onPress={() => state.user && dispatch({ type: 'signIn', user: { ...state.user, exam: exam.id } })}
              />
            ))}
          </View>
        </View>
      </Card>
    ),
    notifications: (
      <Card>
        <SectionHeader title={t('notifications', lang)} icon="notifications-outline" />
        <Row
          title={t('pushNotifications', lang)}
          body={t('pushBody', lang)}
          right={
            <Switch
              value={state.settings.notifications}
              onValueChange={(value) => set({ notifications: value })}
              trackColor={{ true: colors.blue, false: colors.border }}
              thumbColor="#fff"
            />
          }
        />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <Row
          title="Notification inbox"
          body={`${state.notifications.length} messages stored on this device`}
          right={<Button label="Open" size="sm" variant="outline" onPress={() => nav.navigate('Notifications')} />}
        />
      </Card>
    ),
    account: (
      <Card>
        <SectionHeader title={t('account', lang)} icon="person-circle-outline" />
        <Row
          title={state.user?.name ?? 'Guest'}
          body={state.user?.email ?? '—'}
          right={<Tag label={state.user?.role === 'admin' ? 'Admin' : 'Learner'} color={state.user?.role === 'admin' ? colors.violet : colors.teal} />}
        />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <View style={{ gap: 10, paddingTop: 12 }}>
          {state.user?.role === 'admin' ? (
            <Button label="Admin portal" icon="shield-checkmark-outline" variant="soft" full onPress={() => nav.navigate('Admin')} />
          ) : null}
          <Button label="View profile" icon="person-outline" variant="outline" full onPress={() => nav.navigate('Profile')} />
          <Button label={t('signOut', lang)} icon="log-out-outline" variant="danger" full onPress={signOut} />
        </View>
      </Card>
    ),
    data: (
      <Card>
        <SectionHeader title="Data" icon="server-outline" />
        <Row
          title={t('resetData', lang)}
          body={t('resetBody', lang)}
          right={
            <Button
              label={cleared ? 'Cleared' : 'Reset'}
              size="sm"
              variant="outline"
              onPress={async () => {
                await AsyncStorage.clear();
                setCleared(true);
                setTimeout(() => setCleared(false), 2200);
              }}
            />
          }
        />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <Row title="Storage" body="Notes, progress, streaks, results, chat and announcements" right={<Tag label="On-device" color={colors.teal} />} />
      </Card>
    ),
    about: (
      <Card style={{ gap: 10 }}>
        <SectionHeader title={t('about', lang)} icon="information-circle-outline" />
        <Txt size={13} color={colors.textMuted}>{t('previewBody', lang)}</Txt>
        <View style={{ gap: 8, marginTop: 4 }}>
          {[
            ['Version', '1.0.0'],
            ['Build', 'Sakha Web · iOS · Android'],
            ['Content partners', 'Sakha Press, Sakha Research'],
          ].map(([label, value]) => (
            <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt size={13} color={colors.textMuted}>{label}</Txt>
              <Txt size={13} weight="700">{value}</Txt>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.teal} />
          <Txt size={12.5} color={colors.textMuted}>Offline-first. No account data leaves your device.</Txt>
        </View>
      </Card>
    ),
    guide: <AppGuideContent onOpen={(route) => nav.navigate(route)} />,
  };

  const selectedSection = SETTINGS_SECTIONS.find((section) => section.id === openSection);

  return (
    <Shell active="Settings" title={t('settings', lang)} subtitle="Personalise theme, language, goals and reading comfort">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {SETTINGS_SECTIONS.map((section) => (
          <Pressable
            key={section.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${section.title} settings`}
            onPress={() => setOpenSection(section.id)}
            style={({ pressed }) => ({
              width: '47.5%',
              flexGrow: 1,
              minHeight: 118,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
              backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
              padding: 14,
              gap: 10,
              justifyContent: 'space-between',
              transform: [{ scale: pressed ? 0.985 : 1 }],
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: colors.tint,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={section.icon} size={20} color={colors.blue} />
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </View>
            <View style={{ gap: 2 }}>
              <Txt size={13.5} weight="700">{section.title}</Txt>
              <Txt size={11.5} color={colors.textMuted} numberOfLines={2}>{section.summary}</Txt>
            </View>
          </Pressable>
        ))}
      </View>

      <Modal
        visible={openSection !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenSection(null)}
      >
        <View style={{ flex: 1, justifyContent: 'center', padding: 16, backgroundColor: colors.overlay }}>
          <View
            style={{
              width: '100%',
              maxWidth: 680,
              maxHeight: '88%',
              alignSelf: 'center',
              borderRadius: radii.dialog,
              backgroundColor: colors.bg,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
              overflow: 'hidden',
            }}
          >
            <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Txt size={16} weight="800" display style={{ flex: 1 }}>
                {selectedSection?.title ?? 'Settings'}
              </Txt>
              <Pressable
                onPress={() => setOpenSection(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Back to Settings"
                style={({ pressed }) => ({
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
                  borderWidth: 1,
                  borderColor: colors.borderSubtle,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <Ionicons name="arrow-back" size={18} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              {openSection ? sectionContent[openSection] : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Shell>
  );
}
