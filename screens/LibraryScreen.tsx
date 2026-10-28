import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, View } from 'react-native';
import { Shell, useLayout } from '../components/Shell';
import { Card, Chip, EmptyState, Field, ProgressBar, Skeleton, Tag, Txt } from '../components/ui';
import { EXAMS, RESOURCES, SUBJECTS } from '../lib/data';
import { useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';
import { Resource } from '../lib/types';

type Segment = 'all' | 'note' | 'book' | 'pyq-set' | 'starred';

const SEGMENTS: { key: Segment; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'apps-outline' },
  { key: 'note', label: 'Notes', icon: 'document-text-outline' },
  { key: 'book', label: 'Books & PDFs', icon: 'book-outline' },
  { key: 'pyq-set', label: 'PYQ Sets', icon: 'albums-outline' },
  { key: 'starred', label: 'Starred', icon: 'star-outline' },
];

export default function LibraryScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { state, dispatch } = useStore();
  const { isMobile, isDesktop, isTablet } = useLayout();
  const [segment, setSegment] = useState<Segment>('all');
  const [exam, setExam] = useState<string>(route.params?.exam ?? 'all');
  const [subject, setSubject] = useState<string>(route.params?.subject ?? 'all');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const subjects = useMemo(() => {
    const list = exam === 'all' ? SUBJECTS : SUBJECTS.filter((s) => s.exams.includes(exam as any));
    return list;
  }, [exam]);

  const data = useMemo(() => {
    let list: Resource[] = RESOURCES;
    if (segment === 'starred') list = list.filter((r) => state.starred.includes(r.id));
    else if (segment !== 'all') list = list.filter((r) => r.type === segment);
    if (exam !== 'all') list = list.filter((r) => r.exam === exam);
    if (subject !== 'all') list = list.filter((r) => r.subject === subject);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        `${r.title} ${r.summary} ${r.tags.join(' ')} ${r.subject} ${r.author}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [segment, exam, subject, query, state.starred]);

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  };

  const applyExam = (id: string) => {
    setLoading(true);
    setExam(id);
    setSubject('all');
    setTimeout(() => setLoading(false), 280);
  };

  const columns = isDesktop ? 3 : isTablet ? 2 : 1;

  const open = (r: Resource) => {
    dispatch({ type: 'progress', id: r.id, percent: state.progress[r.id]?.percent ?? 5, title: r.title });
    if (r.type === 'book') nav.navigate('BookReader', { resourceId: r.id });
    else nav.navigate('NoteEditor', { resourceId: r.id });
  };

  const renderCard = (r: Resource) => {
    const starred = state.starred.includes(r.id);
    const prog = state.progress[r.id]?.percent ?? 0;
    const subjectMeta = SUBJECTS.find((s) => s.name === r.subject);
    return (
      <Card style={{ flex: 1, margin: 6, padding: 14 }} key={r.id}>
        <Pressable onPress={() => open(r)} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, gap: 12 })}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Image source={{ uri: r.cover }} style={{ width: 62, height: 82, borderRadius: 12, backgroundColor: colors.surfaceAlt }} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Tag label={r.type === 'book' ? 'Book' : r.type === 'note' ? 'Note' : 'PYQ Set'} color={subjectMeta?.color ?? colors.blue} />
                <Tag label={EXAMS.find((e) => e.id === r.exam)?.short ?? ''} color={colors.textMuted} />
              </View>
              <Txt size={14} weight="800" numberOfLines={2}>
                {r.title}
              </Txt>
              <Txt size={11.5} color={colors.textMuted} numberOfLines={2}>
                {r.summary}
              </Txt>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="time-outline" size={13} color={colors.textFaint} />
              <Txt size={11.5} color={colors.textFaint}>
                {r.minutes}m
              </Txt>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="document-outline" size={13} color={colors.textFaint} />
              <Txt size={11.5} color={colors.textFaint}>
                {r.pages}p
              </Txt>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="star" size={13} color={colors.warning} />
              <Txt size={11.5} color={colors.textFaint}>
                {r.rating}
              </Txt>
            </View>
            <Pressable
              hitSlop={10}
              onPress={() => dispatch({ type: 'toggleStar', id: r.id })}
              style={{ marginLeft: 'auto', width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: starred ? `${colors.warning}1F` : colors.surfaceAlt }}
            >
              <Ionicons name={starred ? 'star' : 'star-outline'} size={16} color={starred ? colors.warning : colors.textFaint} />
            </Pressable>
          </View>

          {prog > 0 ? (
            <View style={{ gap: 5 }}>
              <ProgressBar value={prog} height={5} color={colors.teal} />
              <Txt size={11} color={colors.textFaint}>
                {prog}% complete
              </Txt>
            </View>
          ) : null}
        </Pressable>
      </Card>
    );
  };

  const header = (
    <View style={{ gap: 14, paddingHorizontal: isMobile ? 10 : 6, paddingTop: 6 }}>
      <Field value={query} onChangeText={setQuery} placeholder="Search notes, books, PYQ sets…" icon="search-outline" returnKeyType="search" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {SEGMENTS.map((s) => (
          <Chip key={s.key} label={s.label} icon={s.icon} active={segment === s.key} onPress={() => setSegment(s.key)} />
        ))}
      </View>
      <View style={{ gap: 8 }}>
        <Txt size={11} weight="800" color={colors.textFaint} style={{ letterSpacing: 1 }}>
          EXAM
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip label="All exams" active={exam === 'all'} onPress={() => applyExam('all')} />
          {EXAMS.map((e) => (
            <Chip key={e.id} label={e.short} tone={e.color} active={exam === e.id} onPress={() => applyExam(e.id)} />
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Txt size={11} weight="800" color={colors.textFaint} style={{ letterSpacing: 1 }}>
          SUBJECT
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip label="All subjects" active={subject === 'all'} onPress={() => setSubject('all')} />
          {subjects.map((s) => (
            <Chip key={s.id} label={s.name} tone={s.color} active={subject === s.name} onPress={() => setSubject(s.name)} />
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        <Txt size={12.5} weight="700" color={colors.textMuted}>
          {data.length} resource{data.length === 1 ? '' : 's'}
        </Txt>
        <Pressable onPress={() => nav.navigate('NoteEditor', {})} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 5, opacity: pressed ? 0.6 : 1 })}>
          <Ionicons name="add-circle" size={17} color={colors.blue} />
          <Txt size={12.5} weight="800" color={colors.blue}>
            New note
          </Txt>
        </Pressable>
      </View>
    </View>
  );

  return (
    <Shell active="Library" title="Library" subtitle="Notes, books, PDFs and PYQ sets curated for your exam" scroll={false}>
      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {header}
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={120} />
          ))}
        </View>
      ) : (
        <FlatList
          key={`cols-${columns}`}
          data={data}
          keyExtractor={(r) => r.id}
          numColumns={columns}
          ListHeaderComponent={header}
          contentContainerStyle={{ padding: isMobile ? 6 : 14, paddingBottom: 40 }}
          columnWrapperStyle={columns > 1 ? { alignItems: 'stretch' } : undefined}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} colors={[colors.blue]} />}
          renderItem={({ item }) => renderCard(item)}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="Nothing matches those filters"
              body="Try a different exam, subject or search term. Your starred items always stay one tap away."
              action="Reset filters"
              onAction={() => {
                setSegment('all');
                setExam('all');
                setSubject('all');
                setQuery('');
              }}
            />
          }
        />
      )}
    </Shell>
  );
}
