import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { HeatMap, LineChart } from '../components/Charts';
import { Shell, useLayout } from '../components/Shell';
import { Avatar, Button, Card, EmptyState, ProgressRing, SectionHeader, Tag, Txt } from '../components/ui';
import { EXAMS, RESOURCES } from '../lib/data';
import { dayKey, useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const { state, streak, todayMinutes, badges, signOut } = useStore();
  const { isMobile, isDesktop } = useLayout();

  const exam = EXAMS.find((e) => e.id === (state.user?.exam ?? 'upsc'))!;
  const total30 = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      sum += state.studyLog[dayKey(d)] ?? 0;
    }
    return sum;
  }, [state.studyLog]);

  const trend = state.results
    .slice(0, 8)
    .reverse()
    .map((r, i) => ({ label: `M${i + 1}`, value: Math.round(r.percentile) }));

  const stats = [
    { label: 'Day streak', value: `${streak}`, icon: 'flame-outline' as const, color: colors.warning },
    { label: 'Mocks taken', value: `${state.results.length}`, icon: 'timer-outline' as const, color: colors.violet },
    { label: 'Notes saved', value: `${state.notes.length}`, icon: 'create-outline' as const, color: colors.blue },
    { label: 'Starred', value: `${state.starred.length}`, icon: 'star-outline' as const, color: colors.teal },
    { label: 'Bookmarked PYQs', value: `${state.bookmarks.length}`, icon: 'bookmark-outline' as const, color: colors.success },
    { label: '30-day minutes', value: `${total30}`, icon: 'hourglass-outline' as const, color: colors.navy },
  ];

  return (
    <Shell active="Profile" title="Profile" subtitle="Your streak, badges and performance history">
      <LinearGradient colors={[colors.navy, colors.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radii.xl, padding: isMobile ? 18 : 24 }}>
        <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 18, alignItems: isMobile ? 'flex-start' : 'center' }}>
          <Avatar name={state.user?.name ?? 'Guest User'} size={isMobile ? 64 : 76} />
          <View style={{ flex: 1, gap: 7 }}>
            <Txt size={isMobile ? 21 : 25} weight="800" display color="#fff" style={{ letterSpacing: -0.6 }}>
              {state.user?.name ?? 'Guest User'}
            </Txt>
            <Txt size={13} color="rgba(255,255,255,0.8)">
              {state.user?.email ?? 'guest@sakha.in'} · joined {state.user?.joined ?? '—'}
            </Txt>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 11, paddingVertical: 6, borderRadius: radii.pill }}>
                <Txt size={12} weight="800" color="#fff">
                  {exam.short} aspirant
                </Txt>
              </View>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 11, paddingVertical: 6, borderRadius: radii.pill }}>
                <Txt size={12} weight="800" color="#fff">
                  {state.user?.role === 'admin' ? 'Administrator' : 'Elite plan'}
                </Txt>
              </View>
            </View>
          </View>
          <ProgressRing size={110} stroke={11} progress={Math.min(1, todayMinutes / state.settings.dailyGoalMin)}>
            <Txt size={20} weight="800" display color="#fff">
              {todayMinutes}m
            </Txt>
            <Txt size={11} color="rgba(255,255,255,0.75)">
              of {state.settings.dailyGoalMin}m
            </Txt>
          </ProgressRing>
        </View>
      </LinearGradient>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
        {stats.map((s) => (
          <Card key={s.label} style={{ flexGrow: 1, flexBasis: isMobile ? '45%' : 150, padding: 14, gap: 8 }}>
            <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: `${s.color}1A`, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={s.icon} size={17} color={s.color} />
            </View>
            <Txt size={21} weight="800" display>
              {s.value}
            </Txt>
            <Txt size={11.5} color={colors.textMuted}>
              {s.label}
            </Txt>
          </Card>
        ))}
      </View>

      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, marginTop: 18 }}>
        <View style={{ flex: 1.2, gap: 16 }}>
          <Card>
            <SectionHeader title="Study heat-map" icon="calendar-outline" action={`${streak}-day streak`} />
            <HeatMap days={state.studyLog} weeks={isMobile ? 10 : 18} />
          </Card>

          <Card>
            <SectionHeader title="Percentile history" icon="trending-up-outline" action="Tests" onAction={() => nav.navigate('Tests')} />
            {trend.length >= 2 ? (
              <LineChart data={trend} color={colors.violet} />
            ) : (
              <Txt size={13} color={colors.textMuted}>
                Attempt two or more mocks to plot your percentile trajectory.
              </Txt>
            )}
          </Card>

          <Card>
            <SectionHeader title="Recent results" icon="ribbon-outline" />
            {state.results.length ? (
              <View style={{ gap: 12 }}>
                {state.results.slice(0, 6).map((r) => (
                  <Pressable key={r.id} onPress={() => nav.navigate('TestResult', { resultId: r.id })} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.75 : 1 })}>
                    <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
                      <Txt size={13} weight="800" color={colors.blue}>
                        {r.percentile.toFixed(0)}
                      </Txt>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt size={13.5} weight="700" numberOfLines={1}>
                        {r.title}
                      </Txt>
                      <Txt size={11.5} color={colors.textMuted}>
                        {r.score.toFixed(1)}/{r.maxScore} · {Math.round(r.accuracy)}% accuracy · {new Date(r.takenAt).toLocaleDateString('en-IN')}
                      </Txt>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                  </Pressable>
                ))}
              </View>
            ) : (
              <EmptyState icon="ribbon-outline" title="No results yet" body="Your mock history, percentile and subject trends will appear here." action="Take a test" onAction={() => nav.navigate('Tests')} />
            )}
          </Card>
        </View>

        <View style={{ flex: 1, gap: 16 }}>
          <Card>
            <SectionHeader title="Badges" icon="trophy-outline" action={`${badges.filter((b) => b.earned).length}/${badges.length}`} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {badges.map((b) => (
                <View
                  key={b.id}
                  style={{
                    width: '47%',
                    flexGrow: 1,
                    padding: 13,
                    borderRadius: radii.md,
                    borderWidth: 1,
                    borderColor: b.earned ? colors.teal : colors.border,
                    backgroundColor: b.earned ? colors.tealTint : colors.surface,
                    gap: 7,
                    opacity: b.earned ? 1 : 0.65,
                  }}
                >
                  <Ionicons name={b.icon as any} size={20} color={b.earned ? colors.teal : colors.textFaint} />
                  <Txt size={13} weight="800">
                    {b.name}
                  </Txt>
                  <Txt size={11.5} color={colors.textMuted}>
                    {b.desc}
                  </Txt>
                </View>
              ))}
            </View>
          </Card>

          <Card>
            <SectionHeader title="My notes" icon="folder-open-outline" action="New" onAction={() => nav.navigate('NoteEditor', {})} />
            <View style={{ gap: 12 }}>
              {state.notes.slice(0, 5).map((n) => (
                <Pressable key={n.id} onPress={() => nav.navigate('NoteEditor', { noteId: n.id })} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.7 : 1 })}>
                  <Ionicons name="document-text-outline" size={17} color={colors.blue} />
                  <View style={{ flex: 1 }}>
                    <Txt size={13} weight="700" numberOfLines={1}>
                      {n.title}
                    </Txt>
                    <Txt size={11.5} color={colors.textFaint}>
                      {n.folder} · {new Date(n.updatedAt).toLocaleDateString('en-IN')}
                    </Txt>
                  </View>
                </Pressable>
              ))}
              {!state.notes.length ? (
                <Txt size={13} color={colors.textFaint}>
                  No personal notes yet.
                </Txt>
              ) : null}
            </View>
          </Card>

          <Card>
            <SectionHeader title="Starred resources" icon="star-outline" action="Library" onAction={() => nav.navigate('Library')} />
            <View style={{ gap: 12 }}>
              {state.starred.map((id) => {
                const r = RESOURCES.find((x) => x.id === id);
                if (!r) return null;
                return (
                  <Pressable
                    key={id}
                    onPress={() => (r.type === 'book' ? nav.navigate('BookReader', { resourceId: id }) : nav.navigate('NoteEditor', { resourceId: id }))}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.7 : 1 })}
                  >
                    <Ionicons name="star" size={16} color={colors.warning} />
                    <Txt size={13} weight="600" style={{ flex: 1 }} numberOfLines={1}>
                      {r.title}
                    </Txt>
                    <Tag label={r.subject} color={colors.teal} />
                  </Pressable>
                );
              })}
              {!state.starred.length ? (
                <Txt size={13} color={colors.textFaint}>
                  Star resources in the library to pin them here.
                </Txt>
              ) : null}
            </View>
          </Card>

          <Card style={{ gap: 10 }}>
            <SectionHeader title="Account" icon="person-circle-outline" />
            <Button label="Open settings" icon="settings-outline" variant="outline" full onPress={() => nav.navigate('Settings')} />
            {state.user?.role === 'admin' ? (
              <Button label="Admin portal" icon="shield-checkmark-outline" variant="soft" full onPress={() => nav.navigate('Admin')} />
            ) : null}
            <Button label="Sign out" icon="log-out-outline" variant="danger" full onPress={signOut} />
          </Card>
        </View>
      </View>
    </Shell>
  );
}
