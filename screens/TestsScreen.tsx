import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { LineChart } from '../components/Charts';
import { Shell, useLayout } from '../components/Shell';
import { Button, Card, Chip, EmptyState, SectionHeader, Tag, Txt } from '../components/ui';
import { EXAMS, TESTS } from '../lib/data';
import { useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';

export default function TestsScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const { state } = useStore();
  const { isMobile, isDesktop } = useLayout();
  const [filter, setFilter] = useState<string>('all');

  const tests = useMemo(() => (filter === 'all' ? TESTS : TESTS.filter((t) => t.exam === filter)), [filter]);
  const live = TESTS.find((t) => t.kind === 'Live');

  const trend = state.results
    .slice(0, 6)
    .reverse()
    .map((r, i) => ({ label: `#${i + 1}`, value: Math.round((r.score / r.maxScore) * 100) }));

  return (
    <Shell active="Tests" title="Test Series" subtitle="Live mocks, sectionals and daily quizzes with real exam patterns">
      {live ? (
        <LinearGradient
          colors={[colors.navy, colors.violet]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: radii.xl, padding: isMobile ? 18 : 24, marginBottom: 18 }}
        >
          <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 18, alignItems: isMobile ? 'flex-start' : 'center' }}>
            <View style={{ flex: 1, gap: 9 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6B70' }} />
                <Txt size={11.5} weight="800" color="rgba(255,255,255,0.85)" style={{ letterSpacing: 1 }}>
                  LIVE TODAY · {live.liveAt?.toUpperCase()}
                </Txt>
              </View>
              <Txt size={isMobile ? 20 : 25} weight="800" display color="#fff" style={{ letterSpacing: -0.6 }}>
                {live.title}
              </Txt>
              <Txt size={13} color="rgba(255,255,255,0.8)">
                {live.questions.length} questions · {live.durationMin} minutes · +{live.marksPerQ} / −{live.negative.toFixed(2)} marking ·{' '}
                {live.attempts.toLocaleString('en-IN')} enrolled
              </Txt>
            </View>
            <Button label="Start now" icon="play" variant="soft" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} onPress={() => nav.navigate('TestPlayer', { testId: live.id })} />
          </View>
        </LinearGradient>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <Chip label="All exams" active={filter === 'all'} onPress={() => setFilter('all')} />
        {EXAMS.map((e) => (
          <Chip key={e.id} label={e.short} tone={e.color} active={filter === e.id} onPress={() => setFilter(e.id)} />
        ))}
      </View>

      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
        <View style={{ flex: 1.3, gap: 14 }}>
          <SectionHeader title="Available tests" icon="timer-outline" />
          {tests.map((t) => {
            const exam = EXAMS.find((e) => e.id === t.exam)!;
            const attempted = state.results.filter((r) => r.testId === t.id);
            const best = attempted.length ? Math.max(...attempted.map((r) => r.score)) : null;
            return (
              <Card key={t.id} style={{ gap: 13 }}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                  <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: `${exam.color}1F`, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons
                      name={t.kind === 'Live' ? 'radio-outline' : t.kind === 'Daily Quiz' ? 'flash-outline' : t.kind === 'Sectional' ? 'layers-outline' : 'documents-outline'}
                      size={21}
                      color={exam.color}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      <Tag label={exam.short} color={exam.color} />
                      <Tag label={t.kind} color={t.kind === 'Live' ? colors.danger : colors.textMuted} />
                      {best !== null ? <Tag label={`Best ${best.toFixed(1)}`} color={colors.success} /> : null}
                    </View>
                    <Txt size={15} weight="800" numberOfLines={2}>
                      {t.title}
                    </Txt>
                    <Txt size={12} color={colors.textMuted}>
                      {t.questions.length} questions · {t.durationMin} min · +{t.marksPerQ} correct, −{t.negative.toFixed(2)} wrong
                    </Txt>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                  {t.sections.map((s) => (
                    <View key={s.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: colors.surfaceAlt }}>
                      <Txt size={11.5} weight="700" color={colors.textMuted}>
                        {s.name}
                      </Txt>
                      <View style={{ paddingHorizontal: 6, borderRadius: 7, backgroundColor: colors.surface }}>
                        <Txt size={11} weight="800" color={colors.blue}>
                          {s.count}
                        </Txt>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Button label={attempted.length ? 'Re-attempt' : 'Start test'} icon="play" size="sm" onPress={() => nav.navigate('TestPlayer', { testId: t.id })} />
                  {attempted.length ? (
                    <Button label="Last result" icon="stats-chart-outline" variant="outline" size="sm" onPress={() => nav.navigate('TestResult', { resultId: attempted[0].id })} />
                  ) : null}
                  <Txt size={11.5} color={colors.textFaint} style={{ marginLeft: 'auto' }}>
                    {t.attempts.toLocaleString('en-IN')} attempts
                  </Txt>
                </View>
              </Card>
            );
          })}
        </View>

        <View style={{ flex: 1, gap: 16 }}>
          <Card>
            <SectionHeader title="Your score trend" icon="trending-up-outline" />
            {trend.length >= 2 ? (
              <LineChart data={trend} />
            ) : (
              <View style={{ paddingVertical: 10 }}>
                <Txt size={13} color={colors.textMuted}>
                  Attempt at least two mocks to unlock the trend curve. Sakha then tracks accuracy, attempt rate and percentile drift for you.
                </Txt>
              </View>
            )}
          </Card>

          <Card>
            <SectionHeader title="Recent attempts" icon="time-outline" action={state.results.length ? 'Profile' : undefined} onAction={() => nav.navigate('Profile')} />
            {state.results.length ? (
              <View style={{ gap: 12 }}>
                {state.results.slice(0, 5).map((r) => (
                  <Pressable key={r.id} onPress={() => nav.navigate('TestResult', { resultId: r.id })} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.75 : 1 })}>
                    <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
                      <Txt size={13} weight="800" color={colors.blue}>
                        {Math.round((r.score / r.maxScore) * 100)}%
                      </Txt>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt size={13} weight="700" numberOfLines={1}>
                        {r.title}
                      </Txt>
                      <Txt size={11.5} color={colors.textMuted}>
                        {new Date(r.takenAt).toLocaleDateString('en-IN')} · {r.percentile.toFixed(1)} percentile · {r.correct}/{r.correct + r.wrong + r.skipped} correct
                      </Txt>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                  </Pressable>
                ))}
              </View>
            ) : (
              <EmptyState
                icon="documents-outline"
                title="No attempts yet"
                body="Finish your first mock and Sakha will produce a subject-wise breakdown with a recovery plan."
                action="Take a daily quiz"
                onAction={() => nav.navigate('TestPlayer', { testId: 't4' })}
              />
            )}
          </Card>

          <Card>
            <SectionHeader title="Marking scheme" icon="information-circle-outline" />
            <View style={{ gap: 9 }}>
              {[
                { l: 'Correct answer', v: '+ full marks', c: colors.success },
                { l: 'Wrong answer', v: '− one-third of marks', c: colors.danger },
                { l: 'Unattempted', v: 'no penalty', c: colors.textMuted },
                { l: 'Marked for review', v: 'evaluated if answered', c: colors.violet },
              ].map((row) => (
                <View key={row.l} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Txt size={13} color={colors.textMuted}>
                    {row.l}
                  </Txt>
                  <Txt size={13} weight="800" color={row.c}>
                    {row.v}
                  </Txt>
                </View>
              ))}
            </View>
          </Card>
        </View>
      </View>
    </Shell>
  );
}
