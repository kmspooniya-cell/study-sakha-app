import { useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigation, AppRoute } from '../lib/navigation';
import {
  BarChart2,
  Building2,
  Calculator,
  CreditCard,
  FileText,
  GraduationCap,
  HeartPulse,
  Info,
  Layers,
  MapPin,
  Newspaper,
  Play,
  Radio,
  Zap,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Shell } from '../components/Shell';
import {
  SSDSBadge,
  SSDSButton,
  SSDSEmptyState,
  SSDSIcon,
  SSDSRow,
  SSDSSectionHeader,
  SSDSStack,
  SSDSSurface,
  SSDSText,
  useSSDSTheme,
} from '../lib/ssds';
import { EXAMS, getTests } from '../lib/data';
import { useStore } from '../lib/store';
import type { MockTest } from '../lib/types';

const TEST_CATEGORIES = [
  { id: 'upsc', label: 'UPSC', icon: GraduationCap },
  { id: 'ssc', label: 'SSC', icon: GraduationCap },
  { id: 'banking', label: 'Banking', icon: CreditCard },
  { id: 'neet', label: 'NEET', icon: HeartPulse },
  { id: 'jee', label: 'JEE', icon: Calculator },
  { id: 'ras', label: 'RAS', icon: MapPin },
  { id: 'rpsc', label: 'RPSC', icon: Building2 },
  { id: 'rssb', label: 'RSSB', icon: Building2 },
  { id: 'current-affairs-pyq', label: 'Current Affairs PYQ', icon: Newspaper },
] as const;

type TestCategory = (typeof TEST_CATEGORIES)[number]['id'];

export default function TestsScreen() {
  const { tokens } = useSSDSTheme();
  const nav = useNavigation<AppNavigation>();
  const route = useRoute<AppRoute<'Tests'>>();
  const { state } = useStore();
  const allTests = useMemo(() => getTests(state.managedContent), [state.managedContent]);
  const [selectedCategory, setSelectedCategory] = useState<TestCategory | null>(null);
  const headerContext = route.params?.headerBrand
    ? { headerBrand: route.params.headerBrand }
    : {};

  const selected = TEST_CATEGORIES.find((category) => category.id === selectedCategory);
  const tests = useMemo(() => {
    if (selectedCategory === 'current-affairs-pyq') {
      return allTests.filter(
        (test) =>
          (test.kind === 'Daily Quiz' &&
            test.title.toLowerCase().includes('current affairs')) ||
          test.topic?.toLowerCase().includes('current affairs'),
      );
    }
    return allTests.filter((test) => test.exam === selectedCategory);
  }, [selectedCategory, allTests]);

  const renderTest = (test: MockTest) => {
    const exam = EXAMS.find((item) => item.id === test.exam);
    const attempted = state.results.filter((result) => result.testId === test.id);
    const best = attempted.length
      ? Math.max(...attempted.map((result) => result.score))
      : null;

    const kindIcon =
      test.kind === 'Live'
        ? Radio
        : test.kind === 'Daily Quiz'
          ? Zap
          : test.kind === 'Sectional'
            ? Layers
            : FileText;

    return (
      <SSDSSurface key={test.id} variant="outlined" padding={16}>
        <SSDSStack gap={13}>
          <SSDSRow align="flex-start" gap={12}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                backgroundColor: `${exam?.color ?? tokens.colors.primary}1F`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SSDSIcon
                icon={kindIcon}
                size={21}
                color={exam?.color ?? tokens.colors.primary}
              />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <SSDSRow wrap="wrap" gap={6}>
                {exam ? (
                  <SSDSBadge variant="primary" size="sm">
                    {exam.short}
                  </SSDSBadge>
                ) : null}
                <SSDSBadge
                  variant={test.kind === 'Live' ? 'danger' : 'neutral'}
                  size="sm"
                >
                  {test.kind}
                </SSDSBadge>
                {best !== null ? (
                  <SSDSBadge variant="success" size="sm">
                    {`Best ${best.toFixed(1)}`}
                  </SSDSBadge>
                ) : null}
              </SSDSRow>
              <SSDSText variant="CardTitle" maxLines={2}>
                {test.title}
              </SSDSText>
              <SSDSText variant="Caption">
                {test.questions.length} questions · {test.durationMin} min · +{test.marksPerQ}{' '}
                correct, −{test.negative.toFixed(2)} wrong
                {test.liveAt ? ` · ${test.liveAt}` : ''}
              </SSDSText>
            </View>
          </SSDSRow>

          <SSDSRow wrap="wrap" gap={7}>
            {test.sections.map((section) => (
              <SSDSRow
                key={section.name}
                gap={5}
                style={{
                  paddingHorizontal: 9,
                  paddingVertical: 5,
                  borderRadius: tokens.radius.sm,
                  backgroundColor: tokens.colors.surfaceSecondary,
                }}
              >
                <SSDSText variant="Caption" color="textSecondary">
                  {section.name}
                </SSDSText>
                <View
                  style={{
                    paddingHorizontal: 6,
                    borderRadius: 6,
                    backgroundColor: tokens.colors.surface,
                  }}
                >
                  <SSDSText variant="Caption" color="primary">
                    {section.count}
                  </SSDSText>
                </View>
              </SSDSRow>
            ))}
          </SSDSRow>

          <SSDSRow gap={10}>
            <SSDSButton
              size="small"
              leadingIcon={Play}
              onPress={() =>
                nav.navigate('TestPlayer', { testId: test.id, ...headerContext })
              }
            >
              {attempted.length ? 'Re-attempt' : 'Start test'}
            </SSDSButton>
            {attempted.length ? (
              <SSDSButton
                variant="outline"
                size="small"
                leadingIcon={BarChart2}
                onPress={() =>
                  nav.navigate('TestResult', {
                    resultId: attempted[0].id,
                    ...headerContext,
                  })
                }
              >
                Last result
              </SSDSButton>
            ) : null}
            <SSDSText variant="Caption" style={{ marginLeft: 'auto' }}>
              {test.attempts.toLocaleString('en-IN')} attempts
            </SSDSText>
          </SSDSRow>
        </SSDSStack>
      </SSDSSurface>
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
                borderRadius: 18,
                borderWidth: 1,
                borderColor: isActive
                  ? tokens.colors.primary
                  : tokens.colors.borderSubtle,
                backgroundColor: isActive
                  ? tokens.colors.primaryLight
                  : pressed
                    ? tokens.colors.surfaceSecondary
                    : tokens.colors.surface,
                padding: 14,
                gap: 10,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              })}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isActive
                    ? tokens.colors.primary
                    : tokens.colors.primaryLight,
                }}
              >
                <SSDSIcon
                  icon={category.icon}
                  size={20}
                  color={isActive ? '#FFFFFF' : tokens.colors.primary}
                />
              </View>
              <SSDSText
                variant="CardTitle"
                color={isActive ? 'primary' : 'textPrimary'}
              >
                {category.label}
              </SSDSText>
            </Pressable>
          );
        })}
      </View>

      {selectedCategory && selected ? (
        <SSDSStack gap={16} style={{ marginTop: 20 }}>
          {tests.length ? (
            <>
              <SSDSSectionHeader title={selected.label} icon={selected.icon} compact />
              {tests.map(renderTest)}
              <SSDSSurface variant="outlined" padding={16}>
                <SSDSSectionHeader title="Marking scheme" icon={Info} compact />
                <SSDSStack gap={9}>
                  {[
                    {
                      label: 'Correct answer',
                      value: '+ full marks',
                      color: tokens.colors.success,
                    },
                    {
                      label: 'Wrong answer',
                      value: '− one-third of marks',
                      color: tokens.colors.danger,
                    },
                    {
                      label: 'Unattempted',
                      value: 'no penalty',
                      color: tokens.colors.textSecondary,
                    },
                    {
                      label: 'Marked for review',
                      value: 'evaluated if answered',
                      color: tokens.colors.chartQuaternary,
                    },
                  ].map((row) => (
                    <SSDSRow key={row.label} justify="space-between">
                      <SSDSText variant="BodySecondary">{row.label}</SSDSText>
                      <SSDSText variant="ButtonLabel" color={row.color}>
                        {row.value}
                      </SSDSText>
                    </SSDSRow>
                  ))}
                </SSDSStack>
              </SSDSSurface>
            </>
          ) : (
            <SSDSEmptyState
              icon={selected.icon}
              title={`No ${selected.label} tests available`}
              description="There are no matching tests in the current study data."
              primaryAction={{
                label: 'Back to test categories',
                onPress: () => setSelectedCategory(null),
              }}
            />
          )}
        </SSDSStack>
      ) : null}
    </Shell>
  );
}
