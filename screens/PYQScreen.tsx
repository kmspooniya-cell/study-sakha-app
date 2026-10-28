import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Shell, useLayout } from '../components/Shell';
import { Button, Card, Chip, EmptyState, Field, Tag, Txt } from '../components/ui';
import { EXAMS, PYQS, SUBJECTS } from '../lib/data';
import { useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';
import { PYQ } from '../lib/types';

const DIFFICULTY = ['Easy', 'Moderate', 'Hard'] as const;

export default function PYQScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { state, dispatch } = useStore();
  const { isMobile } = useLayout();
  const [exam, setExam] = useState<string>(route.params?.exam ?? 'all');
  const [subject, setSubject] = useState<string>(route.params?.subject ?? 'all');
  const [year, setYear] = useState<number | 'all'>('all');
  const [difficulty, setDifficulty] = useState<string>('all');
  const [onlyBookmarks, setOnlyBookmarks] = useState(false);
  const [query, setQuery] = useState('');
  const [revealed, setRevealed] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);

  const years = useMemo(() => Array.from(new Set(PYQS.map((p) => p.year))).sort((a, b) => b - a), []);
  const subjects = useMemo(
    () => Array.from(new Set(PYQS.filter((p) => exam === 'all' || p.exam === exam).map((p) => p.subject))),
    [exam]
  );

  const data = useMemo(() => {
    let list = PYQS;
    if (exam !== 'all') list = list.filter((p) => p.exam === exam);
    if (subject !== 'all') list = list.filter((p) => p.subject === subject);
    if (year !== 'all') list = list.filter((p) => p.year === year);
    if (difficulty !== 'all') list = list.filter((p) => p.difficulty === difficulty);
    if (onlyBookmarks) list = list.filter((p) => state.bookmarks.includes(p.id));
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => `${p.question} ${p.explanation} ${p.subject}`.toLowerCase().includes(q));
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
    const diffColor = p.difficulty === 'Easy' ? colors.success : p.difficulty === 'Hard' ? colors.danger : colors.warning;
    return (
      <Card style={{ marginBottom: 12 }} key={p.id}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10, flexWrap: 'wrap' }}>
          <Tag label={EXAMS.find((e) => e.id === p.exam)?.short ?? ''} color={colors.blue} />
          <Tag label={`${p.year}`} color={colors.textMuted} />
          <Tag label={p.subject} color={colors.teal} />
          <Tag label={p.difficulty} color={diffColor} />
          <Txt size={11} color={colors.textFaint} style={{ marginLeft: 4 }}>
            {p.paper}
          </Txt>
          <Pressable
            hitSlop={10}
            onPress={() => dispatch({ type: 'toggleBookmark', id: p.id })}
            style={{ marginLeft: 'auto', width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: marked ? colors.tint : colors.surfaceAlt }}
          >
            <Ionicons name={marked ? 'bookmark' : 'bookmark-outline'} size={16} color={marked ? colors.blue : colors.textFaint} />
          </Pressable>
        </View>

        <Txt size={14.5} weight="700" style={{ marginBottom: 12 }}>
          {p.question}
        </Txt>

        <View style={{ gap: 8 }}>
          {p.options.map((opt, i) => {
            const isAnswer = i === p.answer;
            const isPicked = picked === i;
            const bg = !open
              ? colors.surface
              : isAnswer
              ? `${colors.success}18`
              : isPicked
              ? `${colors.danger}15`
              : colors.surface;
            const bc = !open ? colors.border : isAnswer ? colors.success : isPicked ? colors.danger : colors.border;
            return (
              <Pressable
                key={i}
                onPress={() => setRevealed((r) => ({ ...r, [p.id]: i }))}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  borderRadius: radii.md,
                  borderWidth: 1.3,
                  borderColor: bc,
                  backgroundColor: pressed && !open ? colors.surfaceAlt : bg,
                })}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    borderWidth: 1.4,
                    borderColor: open && isAnswer ? colors.success : open && isPicked ? colors.danger : colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Txt size={11.5} weight="800" color={open && isAnswer ? colors.success : open && isPicked ? colors.danger : colors.textMuted}>
                    {String.fromCharCode(65 + i)}
                  </Txt>
                </View>
                <Txt size={13.5} style={{ flex: 1 }}>
                  {opt}
                </Txt>
                {open && isAnswer ? <Ionicons name="checkmark-circle" size={18} color={colors.success} /> : null}
                {open && isPicked && !isAnswer ? <Ionicons name="close-circle" size={18} color={colors.danger} /> : null}
              </Pressable>
            );
          })}
        </View>

        {open ? (
          <View style={{ marginTop: 12, padding: 13, borderRadius: radii.md, backgroundColor: colors.surfaceAlt, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Ionicons name="bulb-outline" size={16} color={colors.teal} />
              <Txt size={12.5} weight="800" color={colors.teal}>
                Explanation
              </Txt>
            </View>
            <Txt size={13} color={colors.textMuted}>
              {p.explanation}
            </Txt>
            <Pressable
              onPress={() => nav.navigate('SakhaAI', { prompt: `Explain in depth: ${p.question}` })}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="sparkles-outline" size={14} color={colors.blue} />
              <Txt size={12.5} weight="800" color={colors.blue}>
                Ask Sakha AI to go deeper
              </Txt>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setRevealed((r) => ({ ...r, [p.id]: -1 }))}
            style={({ pressed }) => ({ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: pressed ? 0.6 : 1 })}
          >
            <Ionicons name="eye-outline" size={15} color={colors.textMuted} />
            <Txt size={12.5} weight="700" color={colors.textMuted}>
              Reveal answer
            </Txt>
          </Pressable>
        )}
      </Card>
    );
  };

  const header = (
    <View style={{ gap: 14, marginBottom: 6 }}>
      <Field value={query} onChangeText={setQuery} placeholder="Search questions, topics, explanations…" icon="search-outline" returnKeyType="search" />

      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        <Card style={{ flexGrow: 1, flexBasis: 140, padding: 12 }}>
          <Txt size={20} weight="800" display>
            {stats.total}
          </Txt>
          <Txt size={11.5} color={colors.textMuted}>
            questions in view
          </Txt>
        </Card>
        <Card style={{ flexGrow: 1, flexBasis: 140, padding: 12 }}>
          <Txt size={20} weight="800" display color={colors.teal}>
            {stats.solved}
          </Txt>
          <Txt size={11.5} color={colors.textMuted}>
            attempted this session
          </Txt>
        </Card>
        <Card style={{ flexGrow: 1, flexBasis: 140, padding: 12 }}>
          <Txt size={20} weight="800" display color={colors.success}>
            {stats.solved ? Math.round((stats.correct / stats.solved) * 100) : 0}%
          </Txt>
          <Txt size={11.5} color={colors.textMuted}>
            session accuracy
          </Txt>
        </Card>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label="All exams" active={exam === 'all'} onPress={() => { setExam('all'); setSubject('all'); }} />
        {EXAMS.map((e) => (
          <Chip key={e.id} label={e.short} tone={e.color} active={exam === e.id} onPress={() => { setExam(e.id); setSubject('all'); }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label="All subjects" active={subject === 'all'} onPress={() => setSubject('all')} />
        {subjects.map((s) => (
          <Chip key={s} label={s} tone={SUBJECTS.find((x) => x.name === s)?.color} active={subject === s} onPress={() => setSubject(s)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label="All years" active={year === 'all'} onPress={() => setYear('all')} />
        {years.map((y) => (
          <Chip key={y} label={`${y}`} active={year === y} onPress={() => setYear(y)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label="Any difficulty" active={difficulty === 'all'} onPress={() => setDifficulty('all')} />
        {DIFFICULTY.map((d) => (
          <Chip
            key={d}
            label={d}
            tone={d === 'Easy' ? colors.success : d === 'Hard' ? colors.danger : colors.warning}
            active={difficulty === d}
            onPress={() => setDifficulty(d)}
          />
        ))}
        <Chip label="Bookmarked" icon="bookmark-outline" active={onlyBookmarks} onPress={() => setOnlyBookmarks((b) => !b)} />
      </View>
    </View>
  );

  return (
    <Shell active="PYQ" title="PYQ Bank" subtitle="Previous year questions with verified answers and explanations" scroll={false}>
      <FlatList
        data={data}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => renderItem(item)}
        contentContainerStyle={{ padding: isMobile ? 16 : 20, paddingBottom: 40 }}
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
            tintColor={colors.blue}
            colors={[colors.blue]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="albums-outline"
            title="No questions match these filters"
            body="Widen the year range or clear the subject filter to see more previous year questions."
            action="Clear filters"
            onAction={() => {
              setExam('all');
              setSubject('all');
              setYear('all');
              setDifficulty('all');
              setOnlyBookmarks(false);
              setQuery('');
            }}
          />
        }
        ListFooterComponent={
          data.length ? (
            <Button
              label="Practise this set as a timed quiz"
              icon="timer-outline"
              variant="soft"
              full
              style={{ marginTop: 6 }}
              onPress={() => nav.navigate('Tests')}
            />
          ) : null
        }
      />
    </Shell>
  );
}
