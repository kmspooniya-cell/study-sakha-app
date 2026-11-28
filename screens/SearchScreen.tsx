import { useNavigation } from '@react-navigation/native';
import type { AppNavigation } from '../lib/navigation';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Layers,
  Lightbulb,
  Newspaper,
  PenSquare,
  Search,
  Timer,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Shell, useLayout } from '../components/Shell';
import {
  SSDSBadge,
  SSDSButton,
  SSDSEmptyState,
  SSDSIcon,
  SSDSRow,
  SSDSSearchInput,
  SSDSSectionHeader,
  SSDSStack,
  SSDSSurface,
  SSDSText,
  useSSDSTheme,
} from '../lib/ssds';
import { getCurrentAffairs, getResources, getTests, PYQS } from '../lib/data';
import { useStore } from '../lib/store';

type Hit = {
  id: string;
  kind: 'Note' | 'Book' | 'PYQ Set' | 'PYQ' | 'Test' | 'My note' | 'Current affairs';
  title: string;
  sub: string;
  icon: LucideIcon;
  color: string;
  go: () => void;
};

const SUGGESTIONS = [
  'Fundamental Rights',
  'Monsoon',
  'Inflation targeting',
  'Rotational motion',
  'Quit India',
  'Puzzle',
];

export default function SearchScreen() {
  const { tokens } = useSSDSTheme();
  const nav = useNavigation<AppNavigation>();
  const { state } = useStore();
  const resources = useMemo(() => getResources(state.managedContent), [state.managedContent]);
  const tests = useMemo(() => getTests(state.managedContent), [state.managedContent]);
  const currentAffairs = useMemo(
    () => getCurrentAffairs(state.managedContent),
    [state.managedContent],
  );
  const { isDesktop } = useLayout();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'library' | 'pyq' | 'tests' | 'notes'>('all');

  const hits = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: Hit[] = [];

    if (filter === 'all' || filter === 'library') {
      resources
        .filter((r) =>
          `${r.title} ${r.summary} ${(r.tags ?? []).join(' ')} ${r.subject} ${r.topic ?? ''}`
            .toLowerCase()
            .includes(q),
        )
        .forEach((r) =>
          out.push({
            id: r.id,
            kind: r.type === 'book' ? 'Book' : r.type === 'note' ? 'Note' : 'PYQ Set',
            title: r.title,
            sub: `${r.subject} · ${r.author} · ${r.minutes} min`,
            icon: r.type === 'book' ? BookOpen : FileText,
            color: tokens.colors.primary,
            go: () =>
              r.type === 'book'
                ? nav.navigate('BookReader', { resourceId: r.id })
                : nav.navigate('NoteEditor', { resourceId: r.id }),
          }),
        );
    }

    if (filter === 'all' || filter === 'pyq') {
      PYQS.filter((p) =>
        `${p.question} ${p.explanation} ${p.subject}`.toLowerCase().includes(q),
      ).forEach((p) =>
        out.push({
          id: p.id,
          kind: 'PYQ',
          title: p.question,
          sub: `${p.exam.toUpperCase()} ${p.year} · ${p.subject} · ${p.difficulty}`,
          icon: Layers,
          color: tokens.colors.secondary,
          go: () => nav.navigate('PYQ', { subject: p.subject }),
        }),
      );
    }

    if (filter === 'all' || filter === 'tests') {
      tests
        .filter((t) =>
          `${t.title} ${(t.sections ?? []).map((s) => s.name).join(' ')} ${t.subject ?? ''} ${t.topic ?? ''}`
            .toLowerCase()
            .includes(q),
        )
        .forEach((t) =>
          out.push({
            id: t.id,
            kind: 'Test',
            title: t.title,
            sub: `${(t.questions ?? []).length} questions · ${t.durationMin} min · ${t.kind}`,
            icon: Timer,
            color: tokens.colors.chartQuaternary,
            go: () => nav.navigate('TestPlayer', { testId: t.id }),
          }),
        );
    }

    if (filter === 'all' || filter === 'notes') {
      state.notes
        .filter((n) =>
          `${n.title} ${n.body} ${(n.tags ?? []).join(' ')}`.toLowerCase().includes(q),
        )
        .forEach((n) =>
          out.push({
            id: n.id,
            kind: 'My note',
            title: n.title,
            sub: `${n.folder} · ${(n.tags ?? []).join(', ')}`,
            icon: PenSquare,
            color: tokens.colors.accent,
            go: () => nav.navigate('NoteEditor', { noteId: n.id }),
          }),
        );
    }

    if (filter === 'all') {
      currentAffairs
        .filter((c) =>
          `${c.title} ${c.summary} ${c.topic ?? ''} ${c.subject ?? ''}`
            .toLowerCase()
            .includes(q),
        )
        .forEach((c) =>
          out.push({
            id: c.id,
            kind: 'Current affairs',
            title: c.title,
            sub: `${c.category} · ${c.date}`,
            icon: Newspaper,
            color: tokens.colors.success,
            go: () => nav.navigate('CurrentAffairs'),
          }),
        );
    }

    return out;
  }, [query, filter, state.notes, tokens.colors, nav, resources, tests, currentAffairs]);

  return (
    <Shell
      active="Search"
      title="Search"
      subtitle="One query across notes, books, PYQs, tests and current affairs"
    >
      <View style={{ width: '100%', maxWidth: 960, alignSelf: 'center' }}>
        <SSDSSearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search everything in Study Sakha…"
          returnKeyType="search"
        />

        <SSDSRow wrap="wrap" gap={8} style={{ marginTop: 14 }}>
          {([
            ['all', 'Everything'],
            ['library', 'Library'],
            ['pyq', 'PYQs'],
            ['tests', 'Tests'],
            ['notes', 'My notes'],
          ] as const).map(([k, l]) => (
            <SSDSButton
              key={k}
              size="small"
              variant={filter === k ? 'primary' : 'outline'}
              onPress={() => setFilter(k)}
            >
              {l}
            </SSDSButton>
          ))}
        </SSDSRow>

        {!query.trim() ? (
          <SSDSStack gap={16} style={{ marginTop: 20 }}>
            <SSDSSurface variant="outlined" padding={16}>
              <SSDSSectionHeader title="Popular searches" icon={TrendingUp} compact />
              <SSDSRow wrap="wrap" gap={8}>
                {SUGGESTIONS.map((s) => (
                  <SSDSButton
                    key={s}
                    size="small"
                    variant="outline"
                    onPress={() => setQuery(s)}
                  >
                    {s}
                  </SSDSButton>
                ))}
              </SSDSRow>
            </SSDSSurface>

            <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
              <SSDSSurface variant="outlined" padding={16} style={{ flex: 1 }}>
                <SSDSSectionHeader title="Jump back in" icon={Clock} compact />
                <SSDSStack gap={12}>
                  {Object.entries(state.progress)
                    .sort((a, b) => b[1].at - a[1].at)
                    .slice(0, 4)
                    .map(([id, v]) => {
                      const r = resources.find((x) => x.id === id);
                      if (!r) return null;
                      return (
                        <Pressable
                          key={id}
                          onPress={() =>
                            r.type === 'book'
                              ? nav.navigate('BookReader', { resourceId: id })
                              : nav.navigate('NoteEditor', { resourceId: id })
                          }
                          style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 11,
                            opacity: pressed ? 0.7 : 1,
                          })}
                        >
                          <View
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 11,
                              backgroundColor: tokens.colors.primaryLight,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <SSDSIcon
                              icon={r.type === 'book' ? BookOpen : FileText}
                              size={17}
                              color="primary"
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <SSDSText variant="CardTitle" truncate>
                              {v.title}
                            </SSDSText>
                            <SSDSText variant="Caption">{v.percent}% complete</SSDSText>
                          </View>
                        </Pressable>
                      );
                    })}
                </SSDSStack>
              </SSDSSurface>

              <SSDSSurface variant="outlined" padding={16} style={{ flex: 1 }}>
                <SSDSSectionHeader title="Search tips" icon={Lightbulb} compact />
                <SSDSStack gap={10}>
                  {[
                    'Search a micro-topic such as “anti-defection” to pull both notes and PYQs.',
                    'Type a year such as “2024” inside the PYQ bank to isolate that paper.',
                    'Use the filter chips to restrict results to your own notes.',
                  ].map((t) => (
                    <SSDSRow key={t} align="flex-start" gap={9}>
                      <SSDSIcon
                        icon={CheckCircle2}
                        size={16}
                        color="secondary"
                        style={{ marginTop: 2 }}
                      />
                      <SSDSText variant="BodySecondary" style={{ flex: 1 }}>
                        {t}
                      </SSDSText>
                    </SSDSRow>
                  ))}
                </SSDSStack>
              </SSDSSurface>
            </View>
          </SSDSStack>
        ) : hits.length ? (
          <SSDSStack gap={10} style={{ marginTop: 18 }}>
            <SSDSText variant="Caption" color="textSecondary">
              {hits.length} result{hits.length === 1 ? '' : 's'} for “{query.trim()}”
            </SSDSText>
            {hits.map((h, idx) => (
              <Pressable key={`${h.kind}-${h.id}-${idx}`} onPress={h.go}>
                {({ pressed }) => (
                  <SSDSSurface
                    variant="outlined"
                    padding={14}
                    style={{ opacity: pressed ? 0.85 : 1 }}
                  >
                    <SSDSRow gap={12}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: `${h.color}1A`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <SSDSIcon icon={h.icon} size={19} color={h.color} />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <SSDSRow gap={7}>
                          <SSDSBadge variant="primary" size="sm">
                            {h.kind}
                          </SSDSBadge>
                        </SSDSRow>
                        <SSDSText variant="CardTitle" maxLines={2}>
                          {h.title}
                        </SSDSText>
                        <SSDSText variant="Caption" truncate>
                          {h.sub}
                        </SSDSText>
                      </View>
                      <SSDSIcon icon={ChevronRight} size={17} color="textTertiary" />
                    </SSDSRow>
                  </SSDSSurface>
                )}
              </Pressable>
            ))}
          </SSDSStack>
        ) : (
          <View style={{ marginTop: 10 }}>
            <SSDSEmptyState
              icon={Search}
              title={`No matches for “${query.trim()}”`}
              description="Try a shorter keyword, or ask Sakha AI — it can reason across your library even when the exact words do not match."
              primaryAction={{
                label: 'Ask Sakha AI',
                onPress: () => nav.navigate('SakhaAI', { prompt: query.trim() }),
              }}
            />
          </View>
        )}
      </View>
    </Shell>
  );
}
