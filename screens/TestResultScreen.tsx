import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Donut, HBar, SvgLegend } from '../components/Charts';
import { DetailHeader, useLayout } from '../components/Shell';
import { Button, Card, EmptyState, ProgressRing, SectionHeader, Tag, Txt } from '../components/ui';
import { TESTS } from '../lib/data';
import { useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';

export default function TestResultScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { state } = useStore();
  const { isMobile, isDesktop } = useLayout();
  const [tab, setTab] = useState<'summary' | 'review'>('summary');
  const headerContext = route.params?.headerBrand ? { headerBrand: route.params.headerBrand } : {};

  const result = state.results.find((r) => r.id === route.params?.resultId) ?? state.results[0];
  const test = result ? TESTS.find((t) => t.id === result.testId) : undefined;

  if (!result || !test) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
        <DetailHeader title="Result" onBack={() => nav.navigate('Tests', headerContext)} />
        <EmptyState icon="stats-chart-outline" title="No result to show" body="Attempt a mock test and your analysis will appear here." action="Browse tests" onAction={() => nav.navigate('Tests', headerContext)} />
      </SafeAreaView>
    );
  }

  const pctScore = Math.max(0, result.score) / result.maxScore;
  const weakest = [...result.bySubject].sort((a, b) => a.correct / a.total - b.correct / b.total)[0];
  const strongest = [...result.bySubject].sort((a, b) => b.correct / b.total - a.correct / a.total)[0];

  const plan = [
    `Day 1–2 · Rebuild ${weakest.subject}: revise the core note, then re-solve every ${weakest.subject} question you missed today.`,
    `Day 3 · Attempt a ${weakest.subject} sectional and target 75% accuracy before moving on.`,
    result.skipped > result.correct
      ? 'Day 4 · Attempt-rate drill: solve 40 questions in 30 minutes to break the habit of over-skipping.'
      : 'Day 4 · Accuracy drill: re-solve the wrong answers without options visible, then verify.',
    `Day 5 · Protect your strength in ${strongest.subject} with a 20-minute recall sprint — do not let it decay.`,
    'Day 6 · Full-length mock in exam-slot timing. No pauses, no lookups.',
    'Day 7 · Analyse, update the error log, rest. Retention collapses without sleep.',
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <DetailHeader
        title="Test result"
        subtitle={result.title}
        onBack={() => nav.navigate('Tests', headerContext)}
        right={<Button label="Retake" icon="refresh-outline" size="sm" variant="soft" onPress={() => nav.replace('TestPlayer', { testId: test.id, ...headerContext })} />}
      />

      <ScrollView contentContainerStyle={{ padding: isMobile ? 16 : 24, maxWidth: 1100, width: '100%', alignSelf: 'center', paddingBottom: 44 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[colors.navy, colors.teal]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radii.xl, padding: isMobile ? 18 : 24 }}>
          <View style={{ flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: 22 }}>
            <ProgressRing size={140} stroke={13} progress={pctScore} from="#FFFFFF" to="#C9F4EC">
              <Txt size={26} weight="800" display color="#fff">
                {result.score.toFixed(1)}
              </Txt>
              <Txt size={11.5} color="rgba(255,255,255,0.8)" weight="600">
                of {result.maxScore}
              </Txt>
            </ProgressRing>
            <View style={{ flex: 1, gap: 10 }}>
              <Txt size={isMobile ? 19 : 23} weight="800" display color="#fff" style={{ letterSpacing: -0.5 }}>
                {result.percentile >= 85 ? 'Excellent attempt' : result.percentile >= 60 ? 'Solid attempt — fixable gaps' : 'Recoverable. Here is the plan.'}
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { l: 'Percentile', v: result.percentile.toFixed(1) },
                  { l: 'Rank', v: `${result.rank.toLocaleString('en-IN')} / ${(result.totalAspirants / 1000).toFixed(0)}k` },
                  { l: 'Accuracy', v: `${Math.round(result.accuracy)}%` },
                  { l: 'Time', v: `${Math.round(result.timeTakenSec / 60)}m` },
                ].map((s) => (
                  <View key={s.l} style={{ backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 13, paddingVertical: 9, borderRadius: radii.md, minWidth: 92 }}>
                    <Txt size={16} weight="800" display color="#fff">
                      {s.v}
                    </Txt>
                    <Txt size={11} color="rgba(255,255,255,0.75)">
                      {s.l}
                    </Txt>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 18, marginBottom: 14 }}>
          {(['summary', 'review'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              accessibilityRole="button"
              accessibilityState={{ selected: tab === t }}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                height: 40,
                borderRadius: radii.control,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: tab === t ? colors.blue : colors.surface,
                borderWidth: 1,
                borderColor: tab === t ? colors.blue : colors.borderSubtle,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Txt size={13} weight="800" color={tab === t ? '#fff' : colors.textMuted}>
                {t === 'summary' ? 'Analysis' : `Review (${test.questions.length})`}
              </Txt>
            </Pressable>
          ))}
        </View>

        {tab === 'summary' ? (
          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
            <View style={{ flex: 1, gap: 16 }}>
              <Card>
                <SectionHeader title="Attempt split" icon="pie-chart-outline" />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                  <Donut
                    segments={[
                      { label: 'Correct', value: result.correct, color: colors.success },
                      { label: 'Wrong', value: result.wrong, color: colors.danger },
                      { label: 'Skipped', value: result.skipped, color: colors.textFaint },
                    ]}
                    center={
                      <>
                        <Txt size={21} weight="800" display>
                          {result.correct}
                        </Txt>
                        <Txt size={11} color={colors.textMuted}>
                          correct
                        </Txt>
                      </>
                    }
                  />
                  <View style={{ flex: 1 }}>
                    <SvgLegend
                      items={[
                        { label: 'Correct', color: colors.success, value: `${result.correct}` },
                        { label: 'Wrong', color: colors.danger, value: `${result.wrong}` },
                        { label: 'Skipped', color: colors.textFaint, value: `${result.skipped}` },
                      ]}
                    />
                  </View>
                </View>
              </Card>

              <Card>
                <SectionHeader title="Subject-wise breakdown" icon="layers-outline" />
                {result.bySubject.map((s) => (
                  <HBar
                    key={s.subject}
                    label={s.subject}
                    value={s.correct}
                    total={s.total}
                    color={s.correct / s.total >= 0.7 ? colors.success : s.correct / s.total >= 0.4 ? colors.warning : colors.danger}
                  />
                ))}
              </Card>
            </View>

            <View style={{ flex: 1, gap: 16 }}>
              <Card>
                <SectionHeader title="Sakha AI recovery plan" icon="sparkles-outline" />
                <View style={{ gap: 11 }}>
                  {plan.map((p, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                        <Txt size={11} weight="800" color={colors.teal}>
                          {i + 1}
                        </Txt>
                      </View>
                      <Txt size={13} color={colors.textMuted} style={{ flex: 1 }}>
                        {p}
                      </Txt>
                    </View>
                  ))}
                </View>
                <Button
                  label="Discuss this with Sakha AI"
                  icon="chatbubbles-outline"
                  variant="soft"
                  full
                  style={{ marginTop: 14 }}
                  onPress={() => nav.navigate('SakhaAI', { prompt: 'Analyse my last mock and fix my weak areas' })}
                />
              </Card>

              <Card>
                <SectionHeader title="Percentile ranking" icon="podium-outline" />
                <View style={{ gap: 12 }}>
                  {[
                    { label: 'You', value: result.percentile, color: colors.blue },
                    { label: 'Topper band', value: 97.5, color: colors.success },
                    { label: 'Average aspirant', value: 50, color: colors.textFaint },
                    { label: 'Cut-off estimate', value: 72, color: colors.warning },
                  ].map((row) => (
                    <View key={row.label} style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Txt size={13} weight="600">
                          {row.label}
                        </Txt>
                        <Txt size={12.5} weight="800" color={row.color}>
                          {row.value.toFixed(1)}
                        </Txt>
                      </View>
                      <View style={{ height: 8, borderRadius: 8, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
                        <View style={{ width: `${row.value}%`, height: 8, backgroundColor: row.color, borderRadius: 8 }} />
                      </View>
                    </View>
                  ))}
                </View>
              </Card>
            </View>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {test.questions.map((q, i) => {
              const picked = result.answers[q.id];
              const right = picked === q.answer;
              return (
                <Card key={q.id}>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                    <Tag label={`Q${i + 1}`} color={colors.textMuted} />
                    <Tag label={q.section} color={colors.blue} />
                    <Tag
                      label={picked == null ? 'Skipped' : right ? 'Correct' : 'Wrong'}
                      color={picked == null ? colors.textFaint : right ? colors.success : colors.danger}
                    />
                  </View>
                  <Txt size={14} weight="700" style={{ marginBottom: 10 }}>
                    {q.question}
                  </Txt>
                  <View style={{ gap: 7 }}>
                    {q.options.map((o, oi) => {
                      const isAns = oi === q.answer;
                      const isPicked = picked === oi;
                      return (
                        <View
                          key={oi}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 9,
                            padding: 11,
                            borderRadius: radii.md,
                            borderWidth: 1,
                            borderColor: isAns ? colors.success : isPicked ? colors.danger : colors.border,
                            backgroundColor: isAns ? `${colors.success}12` : isPicked ? `${colors.danger}10` : colors.surface,
                          }}
                        >
                          <Txt size={12} weight="800" color={isAns ? colors.success : isPicked ? colors.danger : colors.textMuted}>
                            {String.fromCharCode(65 + oi)}
                          </Txt>
                          <Txt size={13} style={{ flex: 1 }}>
                            {o}
                          </Txt>
                          {isAns ? <Ionicons name="checkmark-circle" size={17} color={colors.success} /> : null}
                        </View>
                      );
                    })}
                  </View>
                  <View style={{ marginTop: 11, padding: 12, borderRadius: radii.md, backgroundColor: colors.surfaceAlt }}>
                    <Txt size={12.5} color={colors.textMuted}>
                      <Txt size={12.5} weight="800" color={colors.teal}>
                        Why:{' '}
                      </Txt>
                      {q.explanation}
                    </Txt>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
          <Button label="Back to test series" icon="list-outline" variant="outline" onPress={() => nav.navigate('Tests', headerContext)} />
          <Button label="Practise weak PYQs" icon="albums-outline" variant="soft" onPress={() => nav.navigate('PYQ', { subject: weakest.subject, ...headerContext })} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
