import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Shell, useLayout } from '../components/Shell';
import { Card, Chip, EmptyState, Field, SectionHeader, Tag, Txt } from '../components/ui';
import { CURRENT_AFFAIRS, PYQS, RESOURCES, TESTS } from '../lib/data';
import { useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';

type Hit = {
  id: string;
  kind: 'Note' | 'Book' | 'PYQ Set' | 'PYQ' | 'Test' | 'My note' | 'Current affairs';
  title: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  go: () => void;
};

const SUGGESTIONS = ['Fundamental Rights', 'Monsoon', 'Inflation targeting', 'Rotational motion', 'Quit India', 'Puzzle'];

export default function SearchScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const { state } = useStore();
  const { isMobile, isDesktop } = useLayout();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'library' | 'pyq' | 'tests' | 'notes'>('all');

  const hits = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: Hit[] = [];

    if (filter === 'all' || filter === 'library') {
      RESOURCES.filter((r) => `${r.title} ${r.summary} ${r.tags.join(' ')} ${r.subject}`.toLowerCase().includes(q)).forEach((r) =>
        out.push({
          id: r.id,
          kind: r.type === 'book' ? 'Book' : r.type === 'note' ? 'Note' : 'PYQ Set',
          title: r.title,
          sub: `${r.subject} · ${r.author} · ${r.minutes} min`,
          icon: r.type === 'book' ? 'book-outline' : 'document-text-outline',
          color: colors.blue,
          go: () => (r.type === 'book' ? nav.navigate('BookReader', { resourceId: r.id }) : nav.navigate('NoteEditor', { resourceId: r.id })),
        })
      );
    }

    if (filter === 'all' || filter === 'pyq') {
      PYQS.filter((p) => `${p.question} ${p.explanation} ${p.subject}`.toLowerCase().includes(q)).forEach((p) =>
        out.push({
          id: p.id,
          kind: 'PYQ',
          title: p.question,
          sub: `${p.exam.toUpperCase()} ${p.year} · ${p.subject} · ${p.difficulty}`,
          icon: 'albums-outline',
          color: colors.teal,
          go: () => nav.navigate('PYQ', { subject: p.subject }),
        })
      );
    }

    if (filter === 'all' || filter === 'tests') {
      TESTS.filter((t) => `${t.title} ${t.sections.map((s) => s.name).join(' ')}`.toLowerCase().includes(q)).forEach((t) =>
        out.push({
          id: t.id,
          kind: 'Test',
          title: t.title,
          sub: `${t.questions.length} questions · ${t.durationMin} min · ${t.kind}`,
          icon: 'timer-outline',
          color: colors.violet,
          go: () => nav.navigate('TestPlayer', { testId: t.id }),
        })
      );
    }

    if (filter === 'all' || filter === 'notes') {
      state.notes
        .filter((n) => `${n.title} ${n.body} ${n.tags.join(' ')}`.toLowerCase().includes(q))
        .forEach((n) =>
          out.push({
            id: n.id,
            kind: 'My note',
            title: n.title,
            sub: `${n.folder} · ${n.tags.join(', ')}`,
            icon: 'create-outline',
            color: colors.amber,
            go: () => nav.navigate('NoteEditor', { noteId: n.id }),
          })
        );
    }

    if (filter === 'all') {
      CURRENT_AFFAIRS.filter((c) => `${c.title} ${c.summary}`.toLowerCase().includes(q)).forEach((c) =>
        out.push({
          id: c.id,
          kind: 'Current affairs',
          title: c.title,
          sub: `${c.category} · ${c.date}`,
          icon: 'newspaper-outline',
          color: colors.success,
          go: () => nav.navigate('CurrentAffairs'),
        })
      );
    }

    return out;
  }, [query, filter, state.notes, colors, nav]);

  return (
    <Shell active="Search" title="Search" subtitle="One query across notes, books, PYQs, tests and current affairs">
      <View style={{ width: '100%', maxWidth: 960, alignSelf: 'center' }}>
      <Field value={query} onChangeText={setQuery} placeholder="Search everything in Study Sakha…" icon="search-outline" returnKeyType="search" />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        {([
          ['all', 'Everything'],
          ['library', 'Library'],
          ['pyq', 'PYQs'],
          ['tests', 'Tests'],
          ['notes', 'My notes'],
        ] as const).map(([k, l]) => (
          <Chip key={k} label={l} active={filter === k} onPress={() => setFilter(k)} />
        ))}
      </View>

      {!query.trim() ? (
        <View style={{ marginTop: 20, gap: 16 }}>
          <Card>
            <SectionHeader title="Popular searches" icon="trending-up-outline" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SUGGESTIONS.map((s) => (
                <Chip key={s} label={s} onPress={() => setQuery(s)} />
              ))}
            </View>
          </Card>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
            <Card style={{ flex: 1 }}>
              <SectionHeader title="Jump back in" icon="time-outline" />
              <View style={{ gap: 12 }}>
                {Object.entries(state.progress)
                  .sort((a, b) => b[1].at - a[1].at)
                  .slice(0, 4)
                  .map(([id, v]) => {
                    const r = RESOURCES.find((x) => x.id === id);
                    if (!r) return null;
                    return (
                      <Pressable
                        key={id}
                        onPress={() => (r.type === 'book' ? nav.navigate('BookReader', { resourceId: id }) : nav.navigate('NoteEditor', { resourceId: id }))}
                        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 11, opacity: pressed ? 0.7 : 1 })}
                      >
                        <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name={r.type === 'book' ? 'book-outline' : 'document-text-outline'} size={17} color={colors.blue} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Txt size={13} weight="700" numberOfLines={1}>
                            {v.title}
                          </Txt>
                          <Txt size={11.5} color={colors.textFaint}>
                            {v.percent}% complete
                          </Txt>
                        </View>
                      </Pressable>
                    );
                  })}
              </View>
            </Card>

            <Card style={{ flex: 1 }}>
              <SectionHeader title="Search tips" icon="bulb-outline" />
              <View style={{ gap: 10 }}>
                {[
                  'Search a micro-topic such as “anti-defection” to pull both notes and PYQs.',
                  'Type a year such as “2024” inside the PYQ bank to isolate that paper.',
                  'Use the filter chips to restrict results to your own notes.',
                ].map((t) => (
                  <View key={t} style={{ flexDirection: 'row', gap: 9 }}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={colors.teal} style={{ marginTop: 2 }} />
                    <Txt size={13} color={colors.textMuted} style={{ flex: 1 }}>
                      {t}
                    </Txt>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        </View>
      ) : hits.length ? (
        <View style={{ marginTop: 18, gap: 10 }}>
          <Txt size={12.5} weight="700" color={colors.textMuted}>
            {hits.length} result{hits.length === 1 ? '' : 's'} for “{query.trim()}”
          </Txt>
          {hits.map((h) => (
            <Pressable key={`${h.kind}-${h.id}`} onPress={h.go}>
              {({ pressed }) => (
                <Card style={{ opacity: pressed ? 0.85 : 1, padding: 14 }}>
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${h.color}1A`, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={h.icon} size={19} color={h.color} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}>
                        <Tag label={h.kind} color={h.color} />
                      </View>
                      <Txt size={14} weight="700" numberOfLines={2}>
                        {h.title}
                      </Txt>
                      <Txt size={11.5} color={colors.textMuted} numberOfLines={1}>
                        {h.sub}
                      </Txt>
                    </View>
                    <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />
                  </View>
                </Card>
              )}
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={{ marginTop: 10 }}>
          <EmptyState
            icon="search-outline"
            title={`No matches for “${query.trim()}”`}
            body="Try a shorter keyword, or ask Sakha AI — it can reason across your library even when the exact words do not match."
            action="Ask Sakha AI"
            onAction={() => nav.navigate('SakhaAI', { prompt: query.trim() })}
          />
        </View>
      )}
      </View>
    </Shell>
  );
}
