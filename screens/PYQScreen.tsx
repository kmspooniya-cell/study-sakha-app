import { useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigation, AppRoute } from '../lib/navigation';
import {
  Bookmark,
  CheckCircle2,
  Eye,
  Layers,
  Lightbulb,
  Sparkles,
  Timer,
  XCircle,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Shell, useLayout } from '../components/Shell';
import {
  SSDSBadge,
  SSDSButton,
  SSDSEmptyState,
  SSDSIcon,
  SSDSRow,
  SSDSSearchInput,
  SSDSStack,
  SSDSSurface,
  SSDSText,
  useSSDSTheme,
} from '../lib/ssds';
import { EXAMS, PYQS } from '../lib/data';
import { useStore } from '../lib/store';
import { PYQ } from '../lib/types';
import type { ExamId } from '../lib/types';

const DIFFICULTY = ['Easy', 'Moderate', 'Hard'] as const;

export default function PYQScreen() {
  const { tokens } = useSSDSTheme();
  const nav = useNavigation<AppNavigation>();
  const route = useRoute<AppRoute<'PYQ'>>();
  const { state, dispatch } = useStore();
  const { isMobile } = useLayout();
  const [exam, setExam] = useState<ExamId | 'all'>(route.params?.exam ?? 'all');
  const [subject, setSubject] = useState<string>(route.params?.subject ?? 'all');
  const [year, setYear] = useState<number | 'all'>('all');
  const [difficulty, setDifficulty] = useState<string>('all');
  const [onlyBookmarks, setOnlyBookmarks] = useState(false);
  const [query, setQuery] = useState('');
  const [revealed, setRevealed] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);

  const years = useMemo(
    () => Array.from(new Set(PYQS.map((p) => p.year))).sort((a, b) => b - a),
    [],
  );
  const subjects = useMemo(
    () =>
      Array.from(
        new Set(PYQS.filter((p) => exam === 'all' || p.exam === exam).map((p) => p.subject)),
      ),
    [exam],
  );

  const data = useMemo(() => {
    let list = PYQS;
    if (exam !== 'all') list = list.filter((p) => p.exam === exam);
    if (subject !== 'all') list = list.filter((p) => p.subject === subject);
    if (year !== 'all') list = list.filter((p) => p.year === year);
    if (difficulty !== 'all') list = list.filter((p) => p.difficulty === difficulty);
    if (onlyBookmarks) list = list.filter((p) => state.bookmarks.includes(p.id));
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        `${p.question} ${p.explanation} ${p.subject}`.toLowerCase().includes(q),
      );
    }
    return list;
  }, [exam, subject, year, difficulty, onlyBookmarks, query, state.bookmarks]);

  const stats = useMemo(() => {
    const total = data.length;
    const solved = data.filter((p) => revealed[p.id] !== undefined).length;
    const correct = data.filter((p) => revealed[p.id] === p.answer).length;
    return { total, solved, correct };
  }, [data, revealed]);

  const renderItem = (p: PYQ) => {
    const picked = revealed[p.id];
    const open = picked !== undefined;
    const marked = state.bookmarks.includes(p.id);
    const diffVariant =
      p.difficulty === 'Easy' ? 'success' : p.difficulty === 'Hard' ? 'danger' : 'warning';

    return (
      <SSDSSurface variant="outlined" padding={16} style={{ marginBottom: 12 }} key={p.id}>
        <SSDSRow wrap="wrap" gap={7} style={{ marginBottom: 10 }}>
          <SSDSBadge variant="primary" size="sm">
            {EXAMS.find((e) => e.id === p.exam)?.short ?? ''}
          </SSDSBadge>
          <SSDSBadge variant="neutral" size="sm">
            {`${p.year}`}
          </SSDSBadge>
          <SSDSBadge variant="secondary" size="sm">
            {p.subject}
          </SSDSBadge>
          <SSDSBadge variant={diffVariant} size="sm">
            {p.difficulty}
          </SSDSBadge>
          <SSDSText variant="Caption" style={{ marginLeft: 4 }}>
            {p.paper}
          </SSDSText>
          <Pressable
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={marked ? 'Remove bookmark' : 'Bookmark question'}
            onPress={() => dispatch({ type: 'toggleBookmark', id: p.id })}
            style={({ pressed }) => ({
              marginLeft: 'auto',
              width: 36,
              height: 36,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: marked
                ? tokens.colors.primaryLight
                : tokens.colors.surfaceSecondary,
              borderWidth: 1,
              borderColor: marked ? tokens.colors.primary : tokens.colors.borderSubtle,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
          >
            <SSDSIcon
              icon={Bookmark}
              size={17}
              color={marked ? 'primary' : 'textTertiary'}
            />
          </Pressable>
        </SSDSRow>

        <SSDSText variant="CardTitle" style={{ marginBottom: 12 }}>
          {p.question}
        </SSDSText>

        <SSDSStack gap={8}>
          {p.options.map((opt, i) => {
            const isAnswer = i === p.answer;
            const isPicked = picked === i;
            const bg = !open
              ? tokens.colors.surface
              : isAnswer
                ? tokens.colors.successBackground
                : isPicked
                  ? tokens.colors.dangerBackground
                  : tokens.colors.surface;
            const bc = !open
              ? tokens.colors.borderSubtle
              : isAnswer
                ? tokens.colors.success
                : isPicked
                  ? tokens.colors.danger
                  : tokens.colors.borderSubtle;
            return (
              <Pressable
                key={i}
                onPress={() => setRevealed((r) => ({ ...r, [p.id]: i }))}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 13,
                  borderRadius: tokens.radius.md,
                  borderWidth: 1.2,
                  borderColor: bc,
                  backgroundColor:
                    pressed && !open ? tokens.colors.surfaceSecondary : bg,
                  transform: [{ scale: pressed && !open ? 0.99 : 1 }],
                })}
              >
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    borderWidth: 1.5,
                    borderColor:
                      open && isAnswer
                        ? tokens.colors.success
                        : open && isPicked
                          ? tokens.colors.danger
                          : tokens.colors.borderSubtle,
                    backgroundColor:
                      open && isAnswer
                        ? tokens.colors.success
                        : open && isPicked
                          ? tokens.colors.danger
                          : tokens.colors.surfaceSecondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SSDSText
                    variant="Caption"
                    color={open && (isAnswer || isPicked) ? '#FFFFFF' : 'textSecondary'}
                  >
                    {String.fromCharCode(65 + i)}
                  </SSDSText>
                </View>
                <SSDSText variant="BodyPrimary" style={{ flex: 1 }}>
                  {opt}
                </SSDSText>
                {open && isAnswer ? (
                  <SSDSIcon icon={CheckCircle2} size={19} color="success" />
                ) : null}
                {open && isPicked && !isAnswer ? (
                  <SSDSIcon icon={XCircle} size={19} color="danger" />
                ) : null}
              </Pressable>
            );
          })}
        </SSDSStack>

        {open ? (
          <View
            style={{
              marginTop: 12,
              padding: 14,
              borderRadius: 16,
              backgroundColor: tokens.colors.surfaceSecondary,
              gap: 7,
              borderWidth: 1,
              borderColor: tokens.colors.borderSubtle,
            }}
          >
            <SSDSRow gap={7}>
              <SSDSIcon icon={Lightbulb} size={16} color="secondary" />
              <SSDSText variant="InputLabel" color="secondary">
                Explanation
              </SSDSText>
            </SSDSRow>
            <SSDSText variant="BodySecondary">{p.explanation}</SSDSText>
            <Pressable
              onPress={() =>
                nav.navigate('SakhaAI', { prompt: `Explain in depth: ${p.question}` })
              }
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                marginTop: 4,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <SSDSIcon icon={Sparkles} size={14} color="primary" />
              <SSDSText variant="ButtonLabel" color="primary">
                Ask Sakha AI to go deeper
              </SSDSText>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setRevealed((r) => ({ ...r, [p.id]: -1 }))}
            style={({ pressed }) => ({
              marginTop: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <SSDSIcon icon={Eye} size={15} color="textSecondary" />
            <SSDSText variant="ButtonLabel" color="textSecondary">
              Reveal answer
            </SSDSText>
          </Pressable>
        )}
      </SSDSSurface>
    );
  };

  const header = (
    <SSDSStack gap={14} style={{ marginBottom: 6 }}>
      <SSDSSearchInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search questions, topics, explanations…"
        returnKeyType="search"
      />

      <SSDSRow wrap="wrap" gap={10}>
        <SSDSSurface
          variant="outlined"
          padding={12}
          style={{ flexGrow: 1, flexBasis: 140 }}
        >
          <SSDSText variant="StatisticValue">{stats.total}</SSDSText>
          <SSDSText variant="StatisticLabel">questions in view</SSDSText>
        </SSDSSurface>
        <SSDSSurface
          variant="outlined"
          padding={12}
          style={{ flexGrow: 1, flexBasis: 140 }}
        >
          <SSDSText variant="StatisticValue" color="secondary">
            {stats.solved}
          </SSDSText>
          <SSDSText variant="StatisticLabel">attempted this session</SSDSText>
        </SSDSSurface>
        <SSDSSurface
          variant="outlined"
          padding={12}
          style={{ flexGrow: 1, flexBasis: 140 }}
        >
          <SSDSText variant="StatisticValue" color="success">
            {stats.solved ? Math.round((stats.correct / stats.solved) * 100) : 0}%
          </SSDSText>
          <SSDSText variant="StatisticLabel">session accuracy</SSDSText>
        </SSDSSurface>
      </SSDSRow>

      <SSDSRow wrap="wrap" gap={8}>
        <SSDSButton
          size="small"
          variant={exam === 'all' ? 'primary' : 'outline'}
          onPress={() => {
            setExam('all');
            setSubject('all');
          }}
        >
          All exams
        </SSDSButton>
        {EXAMS.map((e) => (
          <SSDSButton
            key={e.id}
            size="small"
            variant={exam === e.id ? 'primary' : 'outline'}
            onPress={() => {
              setExam(e.id);
              setSubject('all');
            }}
          >
            {e.short}
          </SSDSButton>
        ))}
      </SSDSRow>

      <SSDSRow wrap="wrap" gap={8}>
        <SSDSButton
          size="small"
          variant={subject === 'all' ? 'primary' : 'outline'}
          onPress={() => setSubject('all')}
        >
          All subjects
        </SSDSButton>
        {subjects.map((s) => (
          <SSDSButton
            key={s}
            size="small"
            variant={subject === s ? 'primary' : 'outline'}
            onPress={() => setSubject(s)}
          >
            {s}
          </SSDSButton>
        ))}
      </SSDSRow>

      <SSDSRow wrap="wrap" gap={8}>
        <SSDSButton
          size="small"
          variant={year === 'all' ? 'primary' : 'outline'}
          onPress={() => setYear('all')}
        >
          All years
        </SSDSButton>
        {years.map((y) => (
          <SSDSButton
            key={y}
            size="small"
            variant={year === y ? 'primary' : 'outline'}
            onPress={() => setYear(y)}
          >
            {`${y}`}
          </SSDSButton>
        ))}
      </SSDSRow>

      <SSDSRow wrap="wrap" gap={8}>
        <SSDSButton
          size="small"
          variant={difficulty === 'all' ? 'primary' : 'outline'}
          onPress={() => setDifficulty('all')}
        >
          Any difficulty
        </SSDSButton>
        {DIFFICULTY.map((d) => (
          <SSDSButton
            key={d}
            size="small"
            variant={difficulty === d ? 'primary' : 'outline'}
            onPress={() => setDifficulty(d)}
          >
            {d}
          </SSDSButton>
        ))}
        <SSDSButton
          size="small"
          leadingIcon={Bookmark}
          variant={onlyBookmarks ? 'primary' : 'outline'}
          onPress={() => setOnlyBookmarks((b) => !b)}
        >
          Bookmarked
        </SSDSButton>
      </SSDSRow>
    </SSDSStack>
  );

  return (
    <Shell
      active="PYQ"
      title="PYQ Bank"
      subtitle="Previous year questions with verified answers and explanations"
      scroll={false}
    >
      <FlatList
        data={data}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => renderItem(item)}
        contentContainerStyle={{
          padding: isMobile ? 16 : 24,
          paddingBottom: 24,
          maxWidth: 980,
          width: '100%',
          alignSelf: 'center',
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => {
                setRevealed({});
                setRefreshing(false);
              }, 600);
            }}
            tintColor={tokens.colors.primary}
            colors={[tokens.colors.primary]}
          />
        }
        ListEmptyComponent={
          <SSDSEmptyState
            icon={Layers}
            title="No questions match these filters"
            description="Widen the year range or clear the subject filter to see more previous year questions."
            primaryAction={{
              label: 'Clear filters',
              onPress: () => {
                setExam('all');
                setSubject('all');
                setYear('all');
                setDifficulty('all');
                setOnlyBookmarks(false);
                setQuery('');
              },
            }}
          />
        }
        ListFooterComponent={
          data.length ? (
            <SSDSButton
              variant="secondary"
              leadingIcon={Timer}
              fullWidth
              style={{ marginTop: 6 }}
              onPress={() =>
                nav.navigate('Tests', { headerBrand: route.params?.headerBrand })
              }
            >
              Practise this set as a timed quiz
            </SSDSButton>
          ) : null
        }
      />
    </Shell>
  );
}
