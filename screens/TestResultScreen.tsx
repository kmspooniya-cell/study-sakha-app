import { useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigation, AppRoute } from '../lib/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Award,
  BarChart2,
  CheckCircle2,
  Layers,
  List,
  MessageSquare,
  PieChart,
  RefreshCw,
  Sparkles,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Donut, HBar, SvgLegend } from '../components/Charts';
import { DetailHeader, useLayout, useSmartAndroidBack } from '../components/Shell';
import { ProgressRing } from '../components/ui';
import {
  SSDSBadge,
  SSDSButton,
  SSDSEmptyState,
  SSDSIcon,
  SSDSProgressBar,
  SSDSRow,
  SSDSSectionHeader,
  SSDSStack,
  SSDSSurface,
  SSDSText,
  useSSDSTheme,
} from '../lib/ssds';
import { getTests } from '../lib/data';
import { useStore } from '../lib/store';

export default function TestResultScreen() {
  useSmartAndroidBack();
  const { tokens } = useSSDSTheme();
  const nav = useNavigation<AppNavigation>();
  const route = useRoute<AppRoute<'TestResult'>>();
  const { state } = useStore();
  const tests = useMemo(() => getTests(state.managedContent), [state.managedContent]);
  const { isMobile, isDesktop } = useLayout();
  const [tab, setTab] = useState<'summary' | 'review'>('summary');
  const headerContext = route.params?.headerBrand
    ? { headerBrand: route.params.headerBrand }
    : {};

  const result =
    state.results.find((r) => r.id === route.params?.resultId) ?? state.results[0];
  const test = result ? tests.find((t) => t.id === result.testId) : undefined;
  const comparisonStatus = result?.comparisonStatus ?? 'estimated';

  if (!result || !test) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: tokens.colors.background }}
        edges={['top', 'bottom']}
      >
        <DetailHeader title="Result" onBack={() => nav.navigate('Tests', headerContext)} />
        <SSDSEmptyState
          icon={BarChart2}
          title="No result to show"
          description="Attempt a mock test and your analysis will appear here."
          primaryAction={{
            label: 'Browse tests',
            onPress: () => nav.navigate('Tests', headerContext),
          }}
        />
      </SafeAreaView>
    );
  }

  const pctScore = Math.max(0, result.score) / result.maxScore;
  const weakest = [...result.bySubject].sort(
    (a, b) => a.correct / a.total - b.correct / b.total,
  )[0];
  const strongest = [...result.bySubject].sort(
    (a, b) => b.correct / b.total - a.correct / a.total,
  )[0];

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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: tokens.colors.background }}
      edges={['top', 'bottom']}
    >
      <DetailHeader
        title="Test result"
        subtitle={result.title}
        onBack={() => nav.navigate('Tests', headerContext)}
        right={
          <SSDSButton
            size="small"
            variant="secondary"
            leadingIcon={RefreshCw}
            onPress={() =>
              nav.replace('TestPlayer', { testId: test.id, ...headerContext })
            }
          >
            Retake
          </SSDSButton>
        }
      />

      <ScrollView
        contentContainerStyle={{
          padding: isMobile ? 16 : 24,
          maxWidth: 1100,
          width: '100%',
          alignSelf: 'center',
          paddingBottom: 44,
        }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[tokens.colors.primaryDark, tokens.colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: tokens.radius.xl, padding: isMobile ? 18 : 24 }}
        >
          <View
            style={{
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: 'center',
              gap: 22,
            }}
          >
            <ProgressRing
              size={140}
              stroke={13}
              progress={pctScore}
              from="#FFFFFF"
              to="#C9F4EC"
            >
              <SSDSText variant="DisplayTitle" color="#FFFFFF">
                {result.score.toFixed(1)}
              </SSDSText>
              <SSDSText variant="Caption" color="rgba(255,255,255,0.8)">
                of {result.maxScore}
              </SSDSText>
            </ProgressRing>
            <SSDSStack gap={10} style={{ flex: 1 }}>
              <SSDSText
                variant="ScreenTitle"
                color="#FFFFFF"
                style={{ fontSize: isMobile ? 19 : 23, lineHeight: isMobile ? 26 : 30 }}
              >
                {result.accuracy >= 85
                  ? 'Excellent attempt'
                  : result.accuracy >= 60
                    ? 'Solid attempt — fixable gaps'
                    : 'Recoverable. Here is the plan.'}
              </SSDSText>
              <SSDSRow wrap="wrap" gap={10}>
                {[
                  {
                    l:
                      comparisonStatus === 'estimated'
                        ? 'Estimated percentile'
                        : 'Percentile',
                    v:
                      comparisonStatus === 'measured'
                        ? result.percentile.toFixed(1)
                        : comparisonStatus === 'estimated'
                          ? `Estimate ${result.percentile.toFixed(1)}`
                          : 'Unavailable',
                  },
                  {
                    l: comparisonStatus === 'estimated' ? 'Estimated rank' : 'Rank',
                    v:
                      comparisonStatus === 'measured'
                        ? `${result.rank.toLocaleString('en-IN')} / ${result.totalAspirants.toLocaleString('en-IN')}`
                        : comparisonStatus === 'estimated' && result.totalAspirants > 0
                          ? `Estimate ${result.rank.toLocaleString('en-IN')}`
                          : comparisonStatus === 'estimated'
                            ? 'Estimate'
                            : 'Unavailable',
                  },
                  { l: 'Accuracy', v: `${Math.round(result.accuracy)}%` },
                  { l: 'Time', v: `${Math.round(result.timeTakenSec / 60)}m` },
                ].map((s) => (
                  <View
                    key={s.l}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.16)',
                      paddingHorizontal: 13,
                      paddingVertical: 9,
                      borderRadius: tokens.radius.md,
                      minWidth: 92,
                    }}
                  >
                    <SSDSText variant="CardTitle" color="#FFFFFF">
                      {s.v}
                    </SSDSText>
                    <SSDSText variant="Caption" color="rgba(255,255,255,0.75)">
                      {s.l}
                    </SSDSText>
                  </View>
                ))}
              </SSDSRow>
            </SSDSStack>
          </View>
        </LinearGradient>

        <SSDSRow gap={8} style={{ marginTop: 18, marginBottom: 14 }}>
          {(['summary', 'review'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              accessibilityRole="button"
              accessibilityState={{ selected: tab === t }}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                height: 40,
                borderRadius: tokens.radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  tab === t ? tokens.colors.primary : tokens.colors.surface,
                borderWidth: 1,
                borderColor:
                  tab === t ? tokens.colors.primary : tokens.colors.borderSubtle,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <SSDSText
                variant="ButtonLabel"
                color={tab === t ? '#FFFFFF' : 'textSecondary'}
              >
                {t === 'summary' ? 'Analysis' : `Review (${test.questions.length})`}
              </SSDSText>
            </Pressable>
          ))}
        </SSDSRow>

        {tab === 'summary' ? (
          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
            <SSDSStack gap={16} style={{ flex: 1 }}>
              <SSDSSurface variant="outlined" padding={16}>
                <SSDSSectionHeader title="Attempt split" icon={PieChart} compact />
                <SSDSRow gap={20}>
                  <Donut
                    segments={[
                      { label: 'Correct', value: result.correct, color: tokens.colors.success },
                      { label: 'Wrong', value: result.wrong, color: tokens.colors.danger },
                      {
                        label: 'Skipped',
                        value: result.skipped,
                        color: tokens.colors.textTertiary,
                      },
                    ]}
                    center={
                      <>
                        <SSDSText variant="StatisticValue">{result.correct}</SSDSText>
                        <SSDSText variant="Caption">correct</SSDSText>
                      </>
                    }
                  />
                  <View style={{ flex: 1 }}>
                    <SvgLegend
                      items={[
                        {
                          label: 'Correct',
                          color: tokens.colors.success,
                          value: `${result.correct}`,
                        },
                        {
                          label: 'Wrong',
                          color: tokens.colors.danger,
                          value: `${result.wrong}`,
                        },
                        {
                          label: 'Skipped',
                          color: tokens.colors.textTertiary,
                          value: `${result.skipped}`,
                        },
                      ]}
                    />
                  </View>
                </SSDSRow>
              </SSDSSurface>

              <SSDSSurface variant="outlined" padding={16}>
                <SSDSSectionHeader
                  title="Subject-wise breakdown"
                  icon={Layers}
                  compact
                />
                {result.bySubject.map((s) => (
                  <HBar
                    key={s.subject}
                    label={s.subject}
                    value={s.correct}
                    total={s.total}
                    color={
                      s.correct / s.total >= 0.7
                        ? tokens.colors.success
                        : s.correct / s.total >= 0.4
                          ? tokens.colors.warning
                          : tokens.colors.danger
                    }
                  />
                ))}
              </SSDSSurface>
            </SSDSStack>

            <SSDSStack gap={16} style={{ flex: 1 }}>
              <SSDSSurface variant="outlined" padding={16}>
                <SSDSSectionHeader
                  title="Sakha AI recovery plan"
                  icon={Sparkles}
                  compact
                />
                <SSDSStack gap={11}>
                  {plan.map((p, i) => (
                    <SSDSRow key={i} align="flex-start" gap={10}>
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: tokens.colors.secondaryLight,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: 1,
                        }}
                      >
                        <SSDSText variant="Caption" color="secondary">
                          {i + 1}
                        </SSDSText>
                      </View>
                      <SSDSText variant="BodySecondary" style={{ flex: 1 }}>
                        {p}
                      </SSDSText>
                    </SSDSRow>
                  ))}
                </SSDSStack>
                <SSDSButton
                  variant="secondary"
                  leadingIcon={MessageSquare}
                  fullWidth
                  style={{ marginTop: 14 }}
                  onPress={() =>
                    nav.navigate('SakhaAI', {
                      prompt: 'Analyse my last mock and fix my weak areas',
                    })
                  }
                >
                  Discuss this with Sakha AI
                </SSDSButton>
              </SSDSSurface>

              <SSDSSurface variant="outlined" padding={16}>
                <SSDSSectionHeader title="Score comparison" icon={Award} compact />
                {comparisonStatus === 'unavailable' ? (
                  <SSDSText variant="BodySecondary">
                    Percentile and rank are unavailable because no verified cohort results are
                    available for this test. Your score and accuracy above are calculated from
                    your answers.
                  </SSDSText>
                ) : comparisonStatus === 'estimated' ? (
                  <SSDSText variant="BodySecondary">
                    The historical percentile and rank are estimates from an earlier scoring
                    formula, not official or cohort-verified results.
                  </SSDSText>
                ) : (
                  <SSDSStack gap={8}>
                    <SSDSText variant="BodySecondary">
                      Based on verified comparison data from{' '}
                      {result.totalAspirants.toLocaleString('en-IN')} attempts.
                    </SSDSText>
                    <SSDSStack gap={6}>
                      <SSDSRow justify="space-between">
                        <SSDSText variant="BodyPrimary">Your measured percentile</SSDSText>
                        <SSDSText variant="ButtonLabel" color="primary">
                          {result.percentile.toFixed(1)}
                        </SSDSText>
                      </SSDSRow>
                      <SSDSProgressBar
                        value={Math.max(0, Math.min(100, result.percentile))}
                        height={8}
                        showLabel={false}
                      />
                    </SSDSStack>
                  </SSDSStack>
                )}
              </SSDSSurface>
            </SSDSStack>
          </View>
        ) : (
          <SSDSStack gap={12}>
            {test.questions.map((q, i) => {
              const picked = result.answers[q.id];
              const right = picked === q.answer;
              return (
                <SSDSSurface key={q.id} variant="outlined" padding={16}>
                  <SSDSRow gap={8} style={{ marginBottom: 10 }}>
                    <SSDSBadge variant="neutral" size="sm">
                      {`Q${i + 1}`}
                    </SSDSBadge>
                    <SSDSBadge variant="primary" size="sm">
                      {q.section}
                    </SSDSBadge>
                    <SSDSBadge
                      variant={
                        picked == null ? 'neutral' : right ? 'success' : 'danger'
                      }
                      size="sm"
                    >
                      {picked == null ? 'Skipped' : right ? 'Correct' : 'Wrong'}
                    </SSDSBadge>
                  </SSDSRow>
                  <SSDSText variant="CardTitle" style={{ marginBottom: 10 }}>
                    {q.question}
                  </SSDSText>
                  <SSDSStack gap={7}>
                    {q.options.map((o, oi) => {
                      const isAns = oi === q.answer;
                      const isPicked = picked === oi;
                      return (
                        <SSDSRow
                          key={oi}
                          gap={9}
                          style={{
                            padding: 11,
                            borderRadius: tokens.radius.md,
                            borderWidth: 1,
                            borderColor: isAns
                              ? tokens.colors.success
                              : isPicked
                                ? tokens.colors.danger
                                : tokens.colors.border,
                            backgroundColor: isAns
                              ? tokens.colors.successBackground
                              : isPicked
                                ? tokens.colors.dangerBackground
                                : tokens.colors.surface,
                          }}
                        >
                          <SSDSText
                            variant="Caption"
                            color={
                              isAns ? 'success' : isPicked ? 'danger' : 'textSecondary'
                            }
                          >
                            {String.fromCharCode(65 + oi)}
                          </SSDSText>
                          <SSDSText variant="BodyPrimary" style={{ flex: 1 }}>
                            {o}
                          </SSDSText>
                          {isAns ? (
                            <SSDSIcon icon={CheckCircle2} size={17} color="success" />
                          ) : null}
                        </SSDSRow>
                      );
                    })}
                  </SSDSStack>
                  <View
                    style={{
                      marginTop: 11,
                      padding: 12,
                      borderRadius: tokens.radius.md,
                      backgroundColor: tokens.colors.surfaceSecondary,
                    }}
                  >
                    <SSDSText variant="BodySecondary">
                      <SSDSText variant="InputLabel" color="secondary">
                        Why:{' '}
                      </SSDSText>
                      {q.explanation}
                    </SSDSText>
                  </View>
                </SSDSSurface>
              );
            })}
          </SSDSStack>
        )}

        <SSDSRow wrap="wrap" gap={10} style={{ marginTop: 18 }}>
          <SSDSButton
            variant="outline"
            leadingIcon={List}
            onPress={() => nav.navigate('Tests', headerContext)}
          >
            Back to test series
          </SSDSButton>
          <SSDSButton
            variant="secondary"
            leadingIcon={Layers}
            onPress={() =>
              nav.navigate('PYQ', { subject: weakest.subject, ...headerContext })
            }
          >
            Practise weak PYQs
          </SSDSButton>
        </SSDSRow>
      </ScrollView>
    </SafeAreaView>
  );
}
