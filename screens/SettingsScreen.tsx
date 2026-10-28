import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Shell, useLayout } from '../components/Shell';
import { Button, Card, Chip, SectionHeader, Tag, Txt } from '../components/ui';
import { EXAMS } from '../lib/data';
import { t } from '../lib/i18n';
import { useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';

export default function SettingsScreen() {
  const { colors, mode } = useTheme();
  const nav = useNavigation<any>();
  const { state, dispatch, signOut } = useStore();
  const { isDesktop } = useLayout();
  const lang = state.settings.language;
  const [cleared, setCleared] = useState(false);

  const set = (patch: any) => dispatch({ type: 'settings', patch });

  const Row = ({ title, body, right }: { title: string; body?: string; right: React.ReactNode }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 }}>
      <View style={{ flex: 1 }}>
        <Txt size={14} weight="700">
          {title}
        </Txt>
        {body ? (
          <Txt size={12.5} color={colors.textMuted} style={{ marginTop: 2 }}>
            {body}
          </Txt>
        ) : null}
      </View>
      {right}
    </View>
  );

  return (
    <Shell active="Settings" title={t('settings', lang)} subtitle="Personalise theme, language, goals and reading comfort">
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
        <View style={{ flex: 1, gap: 16 }}>
          <Card>
            <SectionHeader title={t('appearance', lang)} icon="color-palette-outline" />
            <Row
              title={t('theme', lang)}
              body={`Currently following ${mode === 'system' ? 'your device setting' : mode}`}
              right={
                <View style={{ flexDirection: 'row', gap: 7 }}>
                  {(['light', 'dark', 'system'] as const).map((m) => (
                    <Chip
                      key={m}
                      label={t(m, lang)}
                      icon={m === 'light' ? 'sunny-outline' : m === 'dark' ? 'moon-outline' : 'contrast-outline'}
                      active={state.settings.themeMode === m}
                      onPress={() => set({ themeMode: m })}
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
                    { l: 'A', v: 0.92 },
                    { l: 'A', v: 1 },
                    { l: 'A', v: 1.12 },
                  ].map((o, i) => (
                    <Pressable
                      key={i}
                      onPress={() => set({ textScale: o.v })}
                      style={{
                        width: 40,
                        height: 36,
                        borderRadius: radii.sm,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: state.settings.textScale === o.v ? colors.blue : colors.border,
                        backgroundColor: state.settings.textScale === o.v ? colors.tint : colors.surface,
                      }}
                    >
                      <Txt size={11 + i * 3} weight="800" color={state.settings.textScale === o.v ? colors.blue : colors.textMuted}>
                        {o.l}
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

          <Card>
            <SectionHeader title={t('study', lang)} icon="school-outline" />
            <Row
              title={t('dailyGoal', lang)}
              body={`${state.settings.dailyGoalMin} minutes per day`}
              right={
                <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {[90, 120, 180, 240].map((g) => (
                    <Chip key={g} label={`${g}m`} active={state.settings.dailyGoalMin === g} onPress={() => set({ dailyGoalMin: g })} />
                  ))}
                </View>
              }
            />
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <View style={{ paddingVertical: 12, gap: 10 }}>
              <Txt size={14} weight="700">
                {t('targetExam', lang)}
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {EXAMS.map((e) => (
                  <Chip
                    key={e.id}
                    label={e.short}
                    tone={e.color}
                    active={state.user?.exam === e.id}
                    onPress={() =>
                      state.user &&
                      dispatch({ type: 'signIn', user: { ...state.user, exam: e.id } })
                    }
                  />
                ))}
              </View>
            </View>
          </Card>

          <Card>
            <SectionHeader title={t('notifications', lang)} icon="notifications-outline" />
            <Row
              title={t('pushNotifications', lang)}
              body={t('pushBody', lang)}
              right={
                <Switch
                  value={state.settings.notifications}
                  onValueChange={(v) => set({ notifications: v })}
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
        </View>

        <View style={{ flex: 1, gap: 16 }}>
          <Card>
            <SectionHeader title={t('account', lang)} icon="person-circle-outline" />
            <Row title={state.user?.name ?? 'Guest'} body={state.user?.email ?? '—'} right={<Tag label={state.user?.role === 'admin' ? 'Admin' : 'Learner'} color={state.user?.role === 'admin' ? colors.violet : colors.teal} />} />
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <View style={{ gap: 10, paddingTop: 12 }}>
              {state.user?.role === 'admin' ? (
                <Button label="Admin portal" icon="shield-checkmark-outline" variant="soft" full onPress={() => nav.navigate('Admin')} />
              ) : null}
              <Button label="View profile" icon="person-outline" variant="outline" full onPress={() => nav.navigate('Profile')} />
              <Button label={t('signOut', lang)} icon="log-out-outline" variant="danger" full onPress={signOut} />
            </View>
          </Card>

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

          <Card style={{ gap: 10 }}>
            <SectionHeader title={t('about', lang)} icon="information-circle-outline" />
            <Txt size={13} color={colors.textMuted}>
              {t('previewBody', lang)}
            </Txt>
            <View style={{ gap: 8, marginTop: 4 }}>
              {[
                ['Version', '1.0.0'],
                ['Build', 'Sakha Web · iOS · Android'],
                ['Content partners', 'Sakha Press, Sakha Research'],
              ].map(([k, v]) => (
                <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Txt size={13} color={colors.textMuted}>
                    {k}
                  </Txt>
                  <Txt size={13} weight="700">
                    {v}
                  </Txt>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.teal} />
              <Txt size={12.5} color={colors.textMuted}>
                Offline-first. No account data leaves your device.
              </Txt>
            </View>
          </Card>
        </View>
      </View>
    </Shell>
  );
}
