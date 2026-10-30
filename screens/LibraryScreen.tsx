import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, View } from 'react-native';
import { Shell, useLayout } from '../components/Shell';
import { Card, Chip, EmptyState, Field, ProgressBar, Skeleton, Tag, Txt } from '../components/ui';
import { EXAMS, RESOURCES, SUBJECTS } from '../lib/data';
import { useStore } from '../lib/store';
import type { State } from '../lib/store';
import { radii, useTheme } from '../lib/theme';
import { Resource } from '../lib/types';

const LIBRARY_SECTIONS = [
  { route: 'LibraryNotes', key: 'note', label: 'Notes', icon: 'document-text-outline', description: 'Your revision notes and study material.' },
  { route: 'LibraryBooks', key: 'book', label: 'Books & PDFs', icon: 'book-outline', description: 'Browse books and PDF resources.' },
  { route: 'LibraryPYQSets', key: 'pyq-set', label: 'PYQ Sets', icon: 'albums-outline', description: 'Practice previous-year question sets.' },
  { route: 'LibraryStarred', key: 'starred', label: 'Starred', icon: 'star-outline', description: 'Quick access to resources you starred.' },
  { route: 'LibraryDownloads', key: 'downloads', label: 'Downloads', icon: 'cloud-download-outline', description: 'Saved offline files on this device.' },
] as const;

type LibrarySection = (typeof LIBRARY_SECTIONS)[number];
type LibrarySectionKey = LibrarySection['key'];

function getSectionResources(section: LibrarySectionKey, state: State): Resource[] {
  if (section === 'starred') return RESOURCES.filter((resource) => state.starred.includes(resource.id));
  if (section === 'downloads') return [];
  return RESOURCES.filter((resource) => resource.type === section);
}

function SectionCount({ section, state }: { section: LibrarySection; state: State }) {
  const count = getSectionResources(section.key, state).length;
  return (
    <Txt size={12} weight="700" color={useTheme().colors.textMuted}>
      {count} resource{count === 1 ? '' : 's'}
    </Txt>
  );
}

export default function LibraryScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { state } = useStore();
  const { isMobile } = useLayout();

  return (
    <Shell active="Library" title="Library" subtitle="Your study resources, organized in one place" scroll={false}>
      <FlatList
        data={LIBRARY_SECTIONS}
        keyExtractor={(section) => section.route}
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        contentContainerStyle={{ padding: isMobile ? 12 : 20, paddingBottom: 40, gap: 10 }}
        renderItem={({ item: section }) => (
          <Card style={{ flex: 1, padding: 0 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${section.label}`}
              onPress={() => nav.navigate(section.route, route.params)}
              style={({ pressed }) => ({
                minHeight: 160,
                padding: 16,
                gap: 10,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ width: 42, height: 42, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tint }}>
                  <Ionicons name={section.icon} size={21} color={colors.blue} />
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Txt size={14} weight="800">{section.label}</Txt>
                <Txt size={11.5} color={colors.textMuted} numberOfLines={2}>{section.description}</Txt>
              </View>
              <SectionCount section={section} state={state} />
            </Pressable>
          </Card>
        )}
      />
    </Shell>
  );
}

function LibrarySectionScreen({ sectionKey }: { sectionKey: LibrarySectionKey }) {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { state, dispatch } = useStore();
  const { isMobile, isDesktop, isTablet } = useLayout();
  const section = LIBRARY_SECTIONS.find((item) => item.key === sectionKey)!;

  const [exam, setExam] = useState<string>(route.params?.exam ?? 'all');
  const [subject, setSubject] = useState<string>(route.params?.subject ?? 'all');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const sectionResources = useMemo(
    () => getSectionResources(sectionKey, state),
    [sectionKey, state.starred]
  );

  const subjects = useMemo(() => {
    return exam === 'all' ? SUBJECTS : SUBJECTS.filter((item) => item.exams.includes(exam as any));
  }, [exam]);

  const data = useMemo(() => {
    let list = sectionResources;
    if (exam !== 'all') list = list.filter((resource) => resource.exam === exam);
    if (subject !== 'all') list = list.filter((resource) => resource.subject === subject);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((resource) =>
        `${resource.title} ${resource.summary} ${resource.tags.join(' ')} ${resource.subject} ${resource.author}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [sectionResources, exam, subject, query]);

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

  const open = (resource: Resource) => {
    dispatch({ type: 'progress', id: resource.id, percent: state.progress[resource.id]?.percent ?? 5, title: resource.title });
    const headerContext = route.params?.headerBrand ? { headerBrand: route.params.headerBrand } : {};
    if (resource.type === 'book') nav.navigate('BookReader', { resourceId: resource.id, ...headerContext });
    else nav.navigate('NoteEditor', { resourceId: resource.id, ...headerContext });
  };

  const renderCard = (resource: Resource) => {
    const starred = state.starred.includes(resource.id);
    const progress = state.progress[resource.id]?.percent ?? 0;
    const subjectMeta = SUBJECTS.find((item) => item.name === resource.subject);
    return (
      <Card style={{ flex: 1, margin: 6, padding: 14 }} key={resource.id}>
        <View style={{ gap: 12 }}>
          <Pressable onPress={() => open(resource)} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, gap: 12 })}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Image source={{ uri: resource.cover }} style={{ width: 62, height: 82, borderRadius: 12, backgroundColor: colors.surfaceAlt }} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Tag label={resource.type === 'book' ? 'Book' : resource.type === 'note' ? 'Note' : 'PYQ Set'} color={subjectMeta?.color ?? colors.blue} />
                  <Tag label={EXAMS.find((item) => item.id === resource.exam)?.short ?? ''} color={colors.textMuted} />
                </View>
                <Txt size={14} weight="800" numberOfLines={2}>{resource.title}</Txt>
                <Txt size={11.5} color={colors.textMuted} numberOfLines={2}>{resource.summary}</Txt>
              </View>
            </View>

            {progress > 0 ? (
              <View style={{ gap: 5 }}>
                <ProgressBar value={progress} height={5} color={colors.teal} />
                <Txt size={11} color={colors.textFaint}>{progress}% complete</Txt>
              </View>
            ) : null}
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${resource.title}`}
              onPress={() => open(resource)}
              style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.65 : 1, flexDirection: 'row', alignItems: 'center', gap: 12 })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="time-outline" size={13} color={colors.textFaint} />
                <Txt size={11.5} color={colors.textFaint}>{resource.minutes}m</Txt>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="document-outline" size={13} color={colors.textFaint} />
                <Txt size={11.5} color={colors.textFaint}>{resource.pages}p</Txt>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="star" size={13} color={colors.warning} />
                <Txt size={11.5} color={colors.textFaint}>{resource.rating}</Txt>
              </View>
            </Pressable>
            <Pressable
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={starred ? `Unstar ${resource.title}` : `Star ${resource.title}`}
              onPress={() => dispatch({ type: 'toggleStar', id: resource.id })}
              style={{ marginLeft: 'auto', width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: starred ? `${colors.warning}1F` : colors.surfaceAlt }}
            >
              <Ionicons name={starred ? 'star' : 'star-outline'} size={16} color={starred ? colors.warning : colors.textFaint} />
            </Pressable>
          </View>
        </View>
      </Card>
    );
  };

  const header = (
    <View style={{ gap: 14, paddingHorizontal: isMobile ? 10 : 6, paddingTop: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to Library categories"
        onPress={() => nav.navigate('Library')}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 5, opacity: pressed ? 0.65 : 1 })}
      >
        <Ionicons name="chevron-back" size={17} color={colors.blue} />
        <Txt size={12.5} weight="800" color={colors.blue}>Library categories</Txt>
      </Pressable>
      <Field value={query} onChangeText={setQuery} placeholder={`Search ${section.label.toLowerCase()}…`} icon="search-outline" returnKeyType="search" />
      <View style={{ gap: 8 }}>
        <Txt size={11} weight="800" color={colors.textFaint} style={{ letterSpacing: 1 }}>EXAM</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip label="All exams" active={exam === 'all'} onPress={() => applyExam('all')} />
          {EXAMS.map((item) => (
            <Chip key={item.id} label={item.short} tone={item.color} active={exam === item.id} onPress={() => applyExam(item.id)} />
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Txt size={11} weight="800" color={colors.textFaint} style={{ letterSpacing: 1 }}>SUBJECT</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip label="All subjects" active={subject === 'all'} onPress={() => setSubject('all')} />
          {subjects.map((item) => (
            <Chip key={item.id} label={item.name} tone={item.color} active={subject === item.name} onPress={() => setSubject(item.name)} />
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        <Txt size={12.5} weight="700" color={colors.textMuted}>{data.length} resource{data.length === 1 ? '' : 's'}</Txt>
        <Pressable onPress={() => nav.navigate('NoteEditor', {})} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 5, opacity: pressed ? 0.6 : 1 })}>
          <Ionicons name="add-circle" size={17} color={colors.blue} />
          <Txt size={12.5} weight="800" color={colors.blue}>New note</Txt>
        </Pressable>
      </View>
    </View>
  );

  const hasSavedResources = section.key === 'downloads' || section.key === 'starred';
  const emptySavedSection = hasSavedResources && sectionResources.length === 0;
  return (
    <Shell active="Library" title={section.label} subtitle={section.description} scroll={false}>
      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {header}
          {[0, 1, 2].map((index) => <Skeleton key={index} height={120} />)}
        </View>
      ) : (
        <FlatList
          key={`cols-${columns}`}
          data={data}
          keyExtractor={(resource) => resource.id}
          numColumns={columns}
          ListHeaderComponent={header}
          contentContainerStyle={{ padding: isMobile ? 6 : 14, paddingBottom: 40 }}
          columnWrapperStyle={columns > 1 ? { alignItems: 'stretch' } : undefined}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} colors={[colors.blue]} />}
          renderItem={({ item }) => renderCard(item)}
          ListEmptyComponent={
            <EmptyState
              icon={section.icon}
              title={emptySavedSection ? (section.key === 'downloads' ? 'No offline files available' : 'No starred resources yet') : 'Nothing matches those filters'}
              body={emptySavedSection ? (section.key === 'downloads' ? 'Saved offline files will appear here. Downloadable resource files are not configured in this app yet.' : 'Star a resource to keep it easy to find here.') : 'Try a different exam, subject or search term.'}
              action={emptySavedSection ? 'Browse Library' : 'Reset filters'}
              onAction={() => {
                if (emptySavedSection) {
                  nav.navigate('Library');
                  return;
                }
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

export function LibraryNotesScreen() {
  return <LibrarySectionScreen sectionKey="note" />;
}

export function LibraryBooksScreen() {
  return <LibrarySectionScreen sectionKey="book" />;
}

export function LibraryPYQSetsScreen() {
  return <LibrarySectionScreen sectionKey="pyq-set" />;
}

export function LibraryStarredScreen() {
  return <LibrarySectionScreen sectionKey="starred" />;
}

export function LibraryDownloadsScreen() {
  return <LibrarySectionScreen sectionKey="downloads" />;
}
