import { useNavigation } from '@react-navigation/native';
import type { AppNavigation } from '../lib/navigation';
import {
  Bookmark,
  ChevronDown,
  ExternalLink,
  Newspaper,
  Sparkles,
  Zap,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Linking, Pressable, RefreshControl, View } from 'react-native';
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
import { EXAMS, getCurrentAffairs } from '../lib/data';
import { useStore } from '../lib/store';
import { ExamId } from '../lib/types';

export default function CurrentAffairsScreen() {
  const { tokens } = useSSDSTheme();
  const nav = useNavigation<AppNavigation>();
  const { state, dispatch } = useStore();
  const currentAffairs = useMemo(
    () => getCurrentAffairs(state.managedContent),
    [state.managedContent],
  );
  const { isMobile } = useLayout();
  const [category, setCategory] = useState('all');
  const [exam, setExam] = useState<ExamId | 'all'>('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    },
    [],
  );

  const categories = useMemo(
    () => Array.from(new Set(currentAffairs.map((c) => c.category))),
    [currentAffairs],
  );

  const data = useMemo(() => {
    let list = currentAffairs;
    if (category !== 'all') list = list.filter((c) => c.category === category);
    if (exam !== 'all') list = list.filter((c) => (c.exams ?? []).includes(exam));
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((c) =>
        `${c.title} ${c.summary} ${(c.points ?? []).join(' ')}`.toLowerCase().includes(q),
      );
    }
    return list;
  }, [currentAffairs, category, exam, query]);

  const header = (
    <SSDSStack gap={14} style={{ marginBottom: 8 }}>
      <SSDSSurface variant="outlined" padding={16}>
        <SSDSStack gap={10}>
          <SSDSRow gap={10}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 13,
                backgroundColor: tokens.colors.secondaryLight,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SSDSIcon icon={Newspaper} size={20} color="secondary" />
            </View>
            <View style={{ flex: 1 }}>
              <SSDSText variant="CardTitle">
                Daily digest ·{' '}
                {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
              </SSDSText>
              <SSDSText variant="BodySecondary">
                {currentAffairs.length} curated items · prelims-ready bullets · exam tagging
              </SSDSText>
            </View>
          </SSDSRow>
          <SSDSButton
            variant="secondary"
            leadingIcon={Zap}
            fullWidth
            onPress={() => nav.navigate('TestPlayer', { testId: 't4' })}
          >
            Take today&apos;s current affairs quiz
          </SSDSButton>
        </SSDSStack>
      </SSDSSurface>

      <SSDSSearchInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search current affairs…"
        returnKeyType="search"
      />

      <SSDSRow wrap="wrap" gap={8}>
        <SSDSButton
          size="small"
          variant={category === 'all' ? 'primary' : 'outline'}
          onPress={() => setCategory('all')}
        >
          All topics
        </SSDSButton>
        {categories.map((c) => (
          <SSDSButton
            key={c}
            size="small"
            variant={category === c ? 'primary' : 'outline'}
            onPress={() => setCategory(c)}
          >
            {c}
          </SSDSButton>
        ))}
      </SSDSRow>

      <SSDSRow wrap="wrap" gap={8}>
        <SSDSButton
          size="small"
          variant={exam === 'all' ? 'primary' : 'outline'}
          onPress={() => setExam('all')}
        >
          All exams
        </SSDSButton>
        {EXAMS.map((e) => (
          <SSDSButton
            key={e.id}
            size="small"
            variant={exam === e.id ? 'primary' : 'outline'}
            onPress={() => setExam(e.id)}
          >
            {e.short}
          </SSDSButton>
        ))}
      </SSDSRow>
    </SSDSStack>
  );

  return (
    <Shell
      active="CurrentAffairs"
      title="Current Affairs"
      subtitle="Exam-tagged news with prelims-ready bullet points"
      scroll={false}
    >
      <FlatList
        data={data}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={header}
        contentContainerStyle={{
          padding: isMobile ? 16 : 24,
          paddingBottom: 24,
          maxWidth: 960,
          width: '100%',
          alignSelf: 'center',
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
              refreshTimerRef.current = setTimeout(() => {
                setRefreshing(false);
                dispatch({ type: 'study', minutes: 3 });
              }, 650);
            }}
            tintColor={tokens.colors.primary}
            colors={[tokens.colors.primary]}
          />
        }
        renderItem={({ item }) => {
          const expanded = open === item.id;
          return (
            <SSDSSurface variant="outlined" padding={16} style={{ marginBottom: 12 }}>
              <Pressable
                onPress={() => setOpen(expanded ? null : item.id)}
                style={({ pressed }) => ({ gap: 10, opacity: pressed ? 0.85 : 1 })}
              >
                <SSDSRow wrap="wrap" gap={8}>
                  <SSDSBadge variant="secondary" size="sm">
                    {item.category}
                  </SSDSBadge>
                  <SSDSText variant="Caption">
                    {item.date} · {item.readMinutes} min read
                  </SSDSText>
                  <SSDSRow gap={5} style={{ marginLeft: 'auto' }}>
                    {(item.exams ?? []).map((e) => (
                      <SSDSBadge key={e} variant="neutral" size="sm">
                        {EXAMS.find((x) => x.id === e)?.short ?? e}
                      </SSDSBadge>
                    ))}
                  </SSDSRow>
                </SSDSRow>

                <SSDSText variant="SectionTitle">{item.title}</SSDSText>
                <SSDSText variant="BodySecondary">{item.summary}</SSDSText>

                {expanded ? (
                  <View
                    style={{
                      gap: 10,
                      marginTop: 4,
                      padding: 14,
                      borderRadius: 16,
                      backgroundColor: tokens.colors.surfaceSecondary,
                      borderWidth: 1,
                      borderColor: tokens.colors.borderSubtle,
                    }}
                  >
                    {(item.points ?? []).map((p, i) => (
                      <SSDSRow key={i} align="flex-start" gap={9}>
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: tokens.colors.secondary,
                            marginTop: 7,
                          }}
                        />
                        <SSDSText variant="BodySecondary" style={{ flex: 1 }}>
                          {p}
                        </SSDSText>
                      </SSDSRow>
                    ))}
                    <SSDSRow wrap="wrap" gap={10} style={{ marginTop: 4 }}>
                      <SSDSButton
                        size="small"
                        variant="secondary"
                        leadingIcon={Sparkles}
                        onPress={() =>
                          nav.navigate('SakhaAI', {
                            prompt: `Explain the exam relevance of: ${item.title}`,
                          })
                        }
                      >
                        Ask Sakha
                      </SSDSButton>
                      <SSDSButton
                        size="small"
                        variant="outline"
                        leadingIcon={Bookmark}
                        onPress={() => nav.navigate('NoteEditor', {})}
                      >
                        Save as note
                      </SSDSButton>
                      {item.sourceUrl && /^https?:\/\//i.test(item.sourceUrl) ? (
                        <SSDSButton
                          size="small"
                          variant="outline"
                          leadingIcon={ExternalLink}
                          onPress={() => {
                            if (item.sourceUrl) {
                              void Linking.openURL(item.sourceUrl).catch(() => {});
                            }
                          }}
                        >
                          Open source
                        </SSDSButton>
                      ) : null}
                    </SSDSRow>
                  </View>
                ) : (
                  <SSDSRow gap={5}>
                    <SSDSText variant="ButtonLabel" color="primary">
                      Read key points
                    </SSDSText>
                    <SSDSIcon icon={ChevronDown} size={14} color="primary" />
                  </SSDSRow>
                )}
              </Pressable>
            </SSDSSurface>
          );
        }}
        ListEmptyComponent={
          <SSDSEmptyState
            icon={Newspaper}
            title="No stories match"
            description="Try another category or clear the exam filter to see the full digest."
            primaryAction={{
              label: 'Reset',
              onPress: () => {
                setCategory('all');
                setExam('all');
                setQuery('');
              },
            }}
          />
        }
      />
    </Shell>
  );
}
