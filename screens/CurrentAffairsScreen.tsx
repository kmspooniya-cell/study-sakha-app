import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Shell, useLayout } from '../components/Shell';
import { Button, Card, Chip, EmptyState, Field, Tag, Txt } from '../components/ui';
import { CURRENT_AFFAIRS, EXAMS } from '../lib/data';
import { useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';

export default function CurrentAffairsScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const { state, dispatch } = useStore();
  const { isMobile } = useLayout();
  const [category, setCategory] = useState('all');
  const [exam, setExam] = useState('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(CURRENT_AFFAIRS[0].id);
  const [refreshing, setRefreshing] = useState(false);

  const categories = useMemo(() => Array.from(new Set(CURRENT_AFFAIRS.map((c) => c.category))), []);

  const data = useMemo(() => {
    let list = CURRENT_AFFAIRS;
    if (category !== 'all') list = list.filter((c) => c.category === category);
    if (exam !== 'all') list = list.filter((c) => c.exams.includes(exam as any));
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((c) => `${c.title} ${c.summary} ${c.points.join(' ')}`.toLowerCase().includes(q));
    return list;
  }, [category, exam, query]);

  const header = (
    <View style={{ gap: 14, marginBottom: 8 }}>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="newspaper-outline" size={20} color={colors.teal} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt size={14.5} weight="800">
              Daily digest · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
            </Txt>
            <Txt size={12.5} color={colors.textMuted}>
              {CURRENT_AFFAIRS.length} curated items · prelims-ready bullets · exam tagging
            </Txt>
          </View>
        </View>
        <Button
          label="Take today's current affairs quiz"
          icon="flash-outline"
          variant="soft"
          full
          onPress={() => nav.navigate('TestPlayer', { testId: 't4' })}
        />
      </Card>

      <Field value={query} onChangeText={setQuery} placeholder="Search current affairs…" icon="search-outline" returnKeyType="search" />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label="All topics" active={category === 'all'} onPress={() => setCategory('all')} />
        {categories.map((c) => (
          <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label="All exams" active={exam === 'all'} onPress={() => setExam('all')} />
        {EXAMS.map((e) => (
          <Chip key={e.id} label={e.short} tone={e.color} active={exam === e.id} onPress={() => setExam(e.id)} />
        ))}
      </View>
    </View>
  );

  return (
    <Shell active="CurrentAffairs" title="Current Affairs" subtitle="Exam-tagged news with prelims-ready bullet points" scroll={false}>
      <FlatList
        data={data}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: isMobile ? 16 : 24, paddingBottom: 48, maxWidth: 960, width: '100%', alignSelf: 'center' }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => {
                setRefreshing(false);
                dispatch({ type: 'study', minutes: 3 });
              }, 650);
            }}
            tintColor={colors.blue}
            colors={[colors.blue]}
          />
        }
        renderItem={({ item }) => {
          const expanded = open === item.id;
          return (
            <Card style={{ marginBottom: 12 }}>
              <Pressable onPress={() => setOpen(expanded ? null : item.id)} style={({ pressed }) => ({ gap: 10, opacity: pressed ? 0.85 : 1 })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Tag label={item.category} color={colors.teal} />
                  <Txt size={11.5} color={colors.textFaint}>
                    {item.date} · {item.readMinutes} min read
                  </Txt>
                  <View style={{ flexDirection: 'row', gap: 5, marginLeft: 'auto' }}>
                    {item.exams.map((e) => (
                      <Tag key={e} label={EXAMS.find((x) => x.id === e)?.short ?? e} color={EXAMS.find((x) => x.id === e)?.color} />
                    ))}
                  </View>
                </View>
                <Txt size={15.5} weight="800" display>
                  {item.title}
                </Txt>
                <Txt size={13.5} color={colors.textMuted}>
                  {item.summary}
                </Txt>

                {expanded ? (
                  <View style={{ gap: 10, marginTop: 4, padding: 14, borderRadius: 16, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderSubtle }}>
                    {item.points.map((p, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 9 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.teal, marginTop: 7 }} />
                        <Txt size={13} color={colors.textMuted} style={{ flex: 1 }}>
                          {p}
                        </Txt>
                      </View>
                    ))}
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                      <Button
                        label="Ask Sakha"
                        icon="sparkles-outline"
                        size="sm"
                        variant="soft"
                        onPress={() => nav.navigate('SakhaAI', { prompt: `Explain the exam relevance of: ${item.title}` })}
                      />
                      <Button label="Save as note" icon="bookmark-outline" size="sm" variant="outline" onPress={() => nav.navigate('NoteEditor', {})} />
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Txt size={12.5} weight="800" color={colors.blue}>
                      Read key points
                    </Txt>
                    <Ionicons name="chevron-down" size={14} color={colors.blue} />
                  </View>
                )}
              </Pressable>
            </Card>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="newspaper-outline"
            title="No stories match"
            body="Try another category or clear the exam filter to see the full digest."
            action="Reset"
            onAction={() => {
              setCategory('all');
              setExam('all');
              setQuery('');
            }}
          />
        }
      />
    </Shell>
  );
}
