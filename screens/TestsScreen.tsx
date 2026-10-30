import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { LineChart } from '../components/Charts';
import { Shell } from '../components/Shell';
import { Button, Card, EmptyState, SectionHeader, Tag, Txt } from '../components/ui';
import { EXAMS, TESTS } from '../lib/data';
import { useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';
import type { MockTest } from '../lib/types';

const TEST_CATEGORIES = [
  { id: 'upsc', label: 'UPSC', icon: 'school-outline' },
  { id: 'ssc', label: 'SSC', icon: 'briefcase-outline' },
  { id: 'ras', label: 'RAS', icon: 'map-outline' },
  { id: 'rssb', label: 'RSSB', icon: 'business-outline' },
  { id: 'other-state-pcs', label: 'Other State PCS', icon: 'earth-outline' },
  { id: 'live', label: 'Live', icon: 'radio-outline' },
  { id: 'daily-current-affairs', label: 'Daily Current Affairs', icon: 'newspaper-outline' },
  { id: 'recent-attempts', label: 'Recent Attempts', icon: 'time-outline' },
] as const;

type TestCategory = (typeof TEST_CATEGORIES)[number]['id'];

export default function TestsScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { state } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<TestCategory | null>(null);
  const headerContext = route.params?.headerBrand ? { headerBrand: route.params.headerBrand } : {};

  const selected = TEST_CATEGORIES.find((category) => category.id === selectedCategory);
  const tests = useMemo(() => {
    if (selectedCategory === 'upsc' || selectedCategory === 'ssc') {
      return TESTS.filter((test) => test.exam === selectedCategory);
    }
    if (selectedCategory === 'live') return TESTS.filter((test) => test.kind === 'Live');
    if (selectedCategory === 'daily-current-affairs') {
      return TESTS.filter(
        (test) => test.kind === 'Daily Quiz' && test.title.toLowerCase().includes('current affairs')
      );
    }
    return [];
  }, [selectedCategory]);

  const trend = state.results
    .slice(0, 6)
    .reverse()
    .map((result, index) => ({
      label: `#${index + 1}`,
      value: Math.round((result.score / result.maxScore) * 100),
    }));

  const renderTest = (test: MockTest) => {
    const exam = EXAMS.find((item) => item.id === test.exam);
    const attempted = state.results.filter((result) => result.testId === test.id);
    const best = attempted.length ? Math.max(...attempted.map((result) => result.score)) : null;

    return (
      <Card key={test.id} style={{ gap: 13 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: `${exam?.color ?? colors.blue}1F`, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons
              name={test.kind === 'Live' ? 'radio-outline' : test.kind === 'Daily Quiz' ? 'flash-outline' : test.kind === 'Sectional' ? 'layers-outline' : 'documents-outline'}
              size={21}
              color={exam?.color ?? colors.blue}
            />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {exam ? <Tag label={exam.short} color={exam.color} /> : null}
              <Tag label={test.kind} color={test.kind === 'Live' ? colors.danger : colors.textMuted} />
              {best !== null ? <Tag label={`Best ${best.toFixed(1)}`} color={colors.success} /> : null}
            </View>
            <Txt size={15} weight="800" numberOfLines={2}>{test.title}</Txt>
            <Txt size={12} color={colors.textMuted}>
              {test.questions.length} questions · {test.durationMin} min · +{test.marksPerQ} correct, −{test.negative.toFixed(2)} wrong
              {test.liveAt ? ` · ${test.liveAt}` : ''}
            </Txt>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          {test.sections.map((section) => (
            <View key={section.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: colors.surfaceAlt }}>
              <Txt size={11.5} weight="700" color={colors.textMuted}>{section.name}</Txt>
              <View style={{ paddingHorizontal: 6, borderRadius: 7, backgroundColor: colors.surface }}>
                <Txt size={11} weight="800" color={colors.blue}>{section.count}</Txt>
              </View>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Button
            label={attempted.length ? 'Re-attempt' : 'Start test'}
            icon="play"
            size="sm"
            onPress={() => nav.navigate('TestPlayer', { testId: test.id, ...headerContext })}
          />
          {attempted.length ? (
            <Button
              label="Last result"
              icon="stats-chart-outline"
              variant="outline"
              size="sm"
              onPress={() => nav.navigate('TestResult', { resultId: attempted[0].id, ...headerContext })}
            />
          ) : null}
          <Txt size={11.5} color={colors.textFaint} style={{ marginLeft: 'auto' }}>
            {test.attempts.toLocaleString('en-IN')} attempts
          </Txt>
        </View>
      </Card>
    );
  };

  return (
    <Shell active="Tests" title="Tests" subtitle="Choose an exam or practice category">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {TEST_CATEGORIES.map((category) => {
          const isActive = selectedCategory === category.id;
          return (
            <Pressable
              key={category.id}
              onPress={() => setSelectedCategory(isActive ? null : category.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              style={({ pressed }) => ({
                width: '47.5%',
                flexGrow: 1,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: isActive ? colors.blue : colors.border,
                backgroundColor: isActive ? colors.tint : pressed ? colors.surfaceAlt : colors.surface,
                padding: 13,
                gap: 8,
              })}
            >
              <Ionicons name={category.icon} size={19} color={isActive ? colors.blue : colors.textMuted} />
              <Txt size={13} weight="700" color={isActive ? colors.blue : colors.text}>
                {category.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      {selectedCategory && selected ? (
        <View style={{ gap: 16, marginTop: 20 }}>
          {selectedCategory === 'recent-attempts' ? (
            <>
              <Card>
                <SectionHeader title="Your score trend" icon="trending-up-outline" />
                {trend.length >= 2 ? (
                  <LineChart data={trend} />
                ) : (
                  <Txt size={13} color={colors.textMuted}>
                    Attempt at least two tests to unlock your score trend.
                  </Txt>
                )}
              </Card>
              <Card>
                <SectionHeader
                  title="Recent Attempts"
                  icon="time-outline"
                  action={state.results.length ? 'Profile' : undefined}
                  onAction={() => nav.navigate('Profile', headerContext)}
                />
                {state.results.length ? (
                  <View style={{ gap: 12 }}>
                    {state.results.slice(0, 5).map((result) => (
                      <Pressable
                        key={result.id}
                        onPress={() => nav.navigate('TestResult', { resultId: result.id, ...headerContext })}
                        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.75 : 1 })}
                      >
                        <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
                          <Txt size={13} weight="800" color={colors.blue}>
                            {Math.round((result.score / result.maxScore) * 100)}%
                          </Txt>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Txt size={13} weight="700" numberOfLines={1}>{result.title}</Txt>
                          <Txt size={11.5} color={colors.textMuted}>
                            {new Date(result.takenAt).toLocaleDateString('en-IN')} · {result.percentile.toFixed(1)} percentile · {result.correct}/{result.correct + result.wrong + result.skipped} correct
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
                    body="Your completed tests and results will appear here."
                    action="Browse UPSC tests"
                    onAction={() => setSelectedCategory('upsc')}
                  />
                )}
              </Card>
            </>
          ) : tests.length ? (
            <>
              <SectionHeader title={selected.label} icon={selected.icon} />
              {tests.map(renderTest)}
              <Card>
                <SectionHeader title="Marking scheme" icon="information-circle-outline" />
                <View style={{ gap: 9 }}>
                  {[
                    { label: 'Correct answer', value: '+ full marks', color: colors.success },
                    { label: 'Wrong answer', value: '− one-third of marks', color: colors.danger },
                    { label: 'Unattempted', value: 'no penalty', color: colors.textMuted },
                    { label: 'Marked for review', value: 'evaluated if answered', color: colors.violet },
                  ].map((row) => (
                    <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Txt size={13} color={colors.textMuted}>{row.label}</Txt>
                      <Txt size={13} weight="800" color={row.color}>{row.value}</Txt>
                    </View>
                  ))}
                </View>
              </Card>
            </>
          ) : (
            <EmptyState
              icon={selected.icon}
              title={`No ${selected.label} tests available`}
              body="There are no matching tests in the current study data."
              action="Back to test categories"
              onAction={() => setSelectedCategory(null)}
            />
          )}
        </View>
      ) : null}
    </Shell>
  );
}
