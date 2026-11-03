import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Platform, Pressable, RefreshControl, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Shell, useLayout } from '../components/Shell';
import { Button, Chip, EmptyState, Field, ProgressBar, Skeleton, StitchCard, Tag, Txt } from '../components/ui';
import { EXAMS, getResources, SUBJECTS } from '../lib/data';
import { downloadResourceFile, getResourceDownloads, removeResourceDownload } from '../lib/resourceDownloads';
import type { ResourceDownload } from '../lib/resourceDownloads';
import { createStudentContentSignedUrl } from '../lib/supabase';
import { useStore } from '../lib/store';
import type { State } from '../lib/store';
import { radii, useTheme } from '../lib/theme';
import { Resource } from '../lib/types';
import type { ExamId } from '../lib/types';
import type { AppNavigation, AppRoute } from '../lib/navigation';

const LIBRARY_SECTIONS = [
  { route: 'LibraryNotes', key: 'note', label: 'Notes', icon: 'document-text-outline', description: 'Your revision notes and study material.' },
  { route: 'LibraryBooks', key: 'book', label: 'Books & PDFs', icon: 'book-outline', description: 'Browse books and PDF resources.' },
  { route: 'LibraryPYQSets', key: 'pyq-set', label: 'PYQ Sets', icon: 'albums-outline', description: 'Practice previous-year question sets.' },
  { route: 'LibraryStarred', key: 'starred', label: 'Starred', icon: 'star-outline', description: 'Quick access to resources you starred.' },
  { route: 'LibraryDownloads', key: 'downloads', label: 'Downloads', icon: 'cloud-download-outline', description: 'Saved offline files on this device.' },
] as const;

type LibrarySection = (typeof LIBRARY_SECTIONS)[number];
type LibrarySectionKey = LibrarySection['key'];

const BOOK_CATEGORIES = [
  'Spirituality',
  'Culture',
  'History',
  'Science & Technology',
  'Polity',
  'Economics',
  'Geography',
  'Hindi Literature',
  'English Literature',
] as const;

function getSectionResources(section: LibrarySectionKey, state: State): Resource[] {
  const resources = getResources(state.managedContent);
  if (section === 'starred') return resources.filter((resource) => state.starred.includes(resource.id));
  if (section === 'downloads') return [];
  return resources.filter((resource) => resource.type === section);
}

function SectionCount({ section, state }: { section: LibrarySection; state: State }) {
  const count = getSectionResources(section.key, state).length;
  return (
    <Txt size={12} weight="700" color={useTheme().colors.textMuted}>
      {section.key === 'downloads' ? 'Manage saved files' : `${count} resource${count === 1 ? '' : 's'}`}
    </Txt>
  );
}

async function shareDownloadedFile(download: ResourceDownload) {
  const info = await FileSystem.getInfoAsync(download.localUri);
  if (!info.exists) throw new Error('This downloaded file is no longer available on this device.');
  if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is not available on this device.');
  await Sharing.shareAsync(download.localUri, {
    mimeType: 'application/pdf',
    dialogTitle: `Share ${download.title}`,
  });
}

export default function LibraryScreen() {
  const nav = useNavigation<AppNavigation>();
  const route = useRoute<AppRoute<'Library'>>();
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
        contentContainerStyle={{ padding: isMobile ? 16 : 24, paddingBottom: 48, gap: 12, maxWidth: 920, width: '100%', alignSelf: 'center' }}
        renderItem={({ item: section }) => (
          <StitchCard style={{ flex: 1, padding: 0 }} tone="glass">
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
          </StitchCard>
        )}
      />
    </Shell>
  );
}

function LibrarySectionScreen({ sectionKey }: { sectionKey: LibrarySectionKey }) {
  const { colors } = useTheme();
  const nav = useNavigation<AppNavigation>();
  const route = useRoute<AppRoute<'LibraryNotes' | 'LibraryBooks' | 'LibraryPYQSets' | 'LibraryStarred' | 'LibraryDownloads'>>();
  const { state, dispatch } = useStore();
  const { isMobile, isDesktop, isTablet } = useLayout();
  const section = LIBRARY_SECTIONS.find((item) => item.key === sectionKey)!;
  const bookCategories = useMemo(
    () => Array.from(new Set([
      ...BOOK_CATEGORIES,
      ...getResources(state.managedContent)
        .filter((resource) => resource.type === 'book')
        .map((resource) => resource.category)
        .filter((category): category is string => Boolean(category)),
    ])),
    [state.managedContent]
  );

  const [exam, setExam] = useState<ExamId | 'all'>(route.params?.exam ?? 'all');
  const [subject, setSubject] = useState<string>(route.params?.subject ?? 'all');
  const [bookCategory, setBookCategory] = useState<string>(route.params?.category ?? 'all');
  const [bookCategoryOpen, setBookCategoryOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloads, setDownloads] = useState<ResourceDownload[]>([]);
  const [downloadScope, setDownloadScope] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>({});
  const downloadProgressRef = useRef<Record<string, number>>({});
  const mountedRef = useRef(false);
  const userId = state.user?.id;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const scope = userId ?? '__local__';
    setDownloadScope(null);
    setDownloads([]);
    setDownloadProgress({});
    setDownloadErrors({});
    downloadProgressRef.current = {};
    getResourceDownloads(userId).then((saved) => {
      if (!active) return;
      setDownloads(saved);
      setDownloadScope(scope);
    }).catch((error: unknown) => {
      if (!active) return;
      setDownloadErrors((current) => ({
        ...current,
        __storage: error instanceof Error ? error.message : 'Saved downloads could not be loaded.',
      }));
      setDownloadScope(scope);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const downloadFile = async (resource: Resource) => {
    if (Platform.OS === 'web') return;
    setDownloadErrors((current) => ({ ...current, [resource.id]: '' }));
    setDownloadProgress((current) => ({ ...current, [resource.id]: 0 }));
    downloadProgressRef.current[resource.id] = 0;
    try {
      const url = resource.fileObjectPath
        ? await createStudentContentSignedUrl(resource.fileObjectPath)
        : undefined;
      if (!url) throw new Error('This resource has no attached downloadable file.');
      const saved = await downloadResourceFile(userId, resource, url, (progress) => {
        if (!mountedRef.current || userIdRef.current !== userId) return;
        const rounded = Math.floor(progress * 20) / 20;
        if (rounded !== downloadProgressRef.current[resource.id] && rounded < 1) {
          downloadProgressRef.current[resource.id] = rounded;
          setDownloadProgress((current) => ({ ...current, [resource.id]: rounded }));
        }
      });
      if (!mountedRef.current || userIdRef.current !== userId) return;
      setDownloads((current) => [saved, ...current.filter((item) => item.resourceId !== saved.resourceId)]);
      setDownloadProgress((current) => ({ ...current, [resource.id]: 1 }));
    } catch (error) {
      if (!mountedRef.current || userIdRef.current !== userId) return;
      setDownloadErrors((current) => ({
        ...current,
        [resource.id]: error instanceof Error ? error.message : 'The resource could not be downloaded.',
      }));
      setDownloadProgress((current) => {
        const next = { ...current };
        delete next[resource.id];
        return next;
      });
    }
  };

  const sectionResources = useMemo(
    () => getSectionResources(sectionKey, state),
    [sectionKey, state.managedContent, state.starred]
  );

  const subjects = useMemo(() => {
    return exam === 'all' ? SUBJECTS : SUBJECTS.filter((item) => item.exams.includes(exam));
  }, [exam]);

  const data = useMemo(() => {
    let list = sectionResources;
    if (sectionKey === 'book' && bookCategory !== 'all') {
      list = list.filter((resource) => resource.category === bookCategory);
    }
    if (sectionKey !== 'book') {
      if (exam !== 'all') list = list.filter((resource) => resource.exam === exam);
      if (subject !== 'all') list = list.filter((resource) => resource.subject === subject);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((resource) =>
        `${resource.title} ${resource.summary} ${resource.tags.join(' ')} ${resource.subject} ${resource.author}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [sectionResources, sectionKey, bookCategory, exam, subject, query]);

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  };

  const applyExam = (id: ExamId | 'all') => {
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
    const hasFile = Boolean(resource.fileObjectPath);
    const savedDownload = downloadScope === (userId ?? '__local__')
      ? downloads.find((item) => item.resourceId === resource.id)
      : undefined;
    const downloadBusy = downloadProgress[resource.id] !== undefined && downloadProgress[resource.id] < 1;
    const progress = state.progress[resource.id]?.percent ?? 0;
    const subjectMeta = SUBJECTS.find((item) => item.name === resource.subject);
    return (
      <StitchCard style={{ flex: 1, margin: 6, padding: 14 }} key={resource.id} tone="raised">
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
            {hasFile && Platform.OS !== 'web' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={savedDownload ? `Share downloaded file for ${resource.title}` : `Download ${resource.title} for offline use`}
                disabled={downloadBusy}
                onPress={() => {
                  if (savedDownload) {
                    void shareDownloadedFile(savedDownload).catch((error: unknown) => {
                      setDownloadErrors((current) => ({
                        ...current,
                        [resource.id]: error instanceof Error ? error.message : 'The downloaded file could not be opened.',
                      }));
                    });
                    return;
                  }
                  void downloadFile(resource);
                }}
                style={({ pressed }) => ({
                  minWidth: 34,
                  height: 32,
                  paddingHorizontal: 7,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: savedDownload ? `${colors.success}1A` : colors.surfaceAlt,
                  opacity: pressed || downloadBusy ? 0.6 : 1,
                  flexDirection: 'row',
                  gap: 4,
                })}
              >
                {downloadBusy ? (
                  <ActivityIndicator size="small" color={colors.blue} />
                ) : (
                  <Ionicons name={savedDownload ? 'checkmark-circle' : 'cloud-download-outline'} size={16} color={savedDownload ? colors.success : colors.blue} />
                )}
              </Pressable>
            ) : null}
          </View>
          {downloadErrors[resource.id] ? (
            <Txt size={11} color={colors.danger}>{downloadErrors[resource.id]}</Txt>
          ) : null}
          {downloadBusy ? (
            <View style={{ gap: 4 }}>
              <ProgressBar value={(downloadProgress[resource.id] ?? 0) * 100} height={4} color={colors.blue} />
              <Txt size={10.5} color={colors.textMuted}>Saving for offline use…</Txt>
            </View>
          ) : null}
        </View>
      </StitchCard>
    );
  };

  const header = (
    <View style={{ gap: 14, paddingHorizontal: isMobile ? 10 : 6, paddingTop: 6, maxWidth: 1120, width: '100%', alignSelf: 'center' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to Library categories"
        onPress={() => nav.navigate('Library')}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 5, opacity: pressed ? 0.65 : 1 })}
      >
        <Ionicons name="chevron-back" size={17} color={colors.blue} />
        <Txt size={12.5} weight="800" color={colors.blue}>Library categories</Txt>
      </Pressable>
      {sectionKey === 'book' ? (
        <View style={{ gap: 8 }}>
          <Txt size={11} weight="800" color={colors.textFaint} style={{ letterSpacing: 1 }}>CATEGORY</Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select Books and PDFs category"
            accessibilityState={{ expanded: bookCategoryOpen }}
            onPress={() => setBookCategoryOpen(true)}
            style={({ pressed }) => ({
              minHeight: 48,
              paddingHorizontal: 14,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
              backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <Ionicons name="filter-outline" size={17} color={colors.blue} />
              <Txt size={13.5} weight="800">{bookCategory === 'all' ? 'All categories' : bookCategory}</Txt>
            </View>
            <Ionicons name="chevron-down" size={17} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}
      <Field value={query} onChangeText={setQuery} placeholder={`Search ${section.label.toLowerCase()}…`} icon="search-outline" returnKeyType="search" />
      {sectionKey !== 'book' ? (
        <>
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
        </>
      ) : null}
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
                setBookCategory('all');
                setQuery('');
              }}
            />
          }
        />
      )}
      {sectionKey === 'book' ? (
        <Modal visible={bookCategoryOpen} transparent animationType="fade" onRequestClose={() => setBookCategoryOpen(false)}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close category selector"
            onPress={() => setBookCategoryOpen(false)}
            style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.45)' }}
          >
            <Pressable onPress={() => undefined} style={{ maxHeight: '86%', borderRadius: radii.lg, padding: 18, backgroundColor: colors.surface, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Txt size={17} weight="800">Books & PDFs category</Txt>
                <Pressable accessibilityRole="button" accessibilityLabel="Close category selector" onPress={() => setBookCategoryOpen(false)} hitSlop={10}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </Pressable>
              </View>
              {['all', ...bookCategories].map((category) => {
                const active = bookCategory === category;
                return (
                  <Pressable
                    key={category}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      setBookCategory(category);
                      setBookCategoryOpen(false);
                    }}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 11, borderRadius: radii.md, backgroundColor: active ? colors.tint : pressed ? colors.surfaceAlt : 'transparent' })}
                  >
                    <Txt size={13.5} weight={active ? '800' : '600'} color={active ? colors.blue : colors.text}>{category === 'all' ? 'All categories' : category}</Txt>
                    {active ? <Ionicons name="checkmark-circle" size={18} color={colors.blue} /> : null}
                  </Pressable>
                );
              })}
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
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
  const { colors } = useTheme();
  const nav = useNavigation<AppNavigation>();
  const { state } = useStore();
  const [downloads, setDownloads] = useState<ResourceDownload[]>([]);
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const userId = state.user?.id;
  const scope = userId ?? '__local__';
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setLoadedScope(null);
    setDownloads([]);
    getResourceDownloads(userId).then((saved) => {
      if (active) {
        setDownloads(saved);
        setLoadedScope(scope);
      }
    }).catch((loadError: unknown) => {
      if (active) {
        setError(loadError instanceof Error ? loadError.message : 'Saved downloads could not be loaded.');
        setLoadedScope(scope);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [retry, scope, userId]);

  const remove = async (resourceId: string) => {
    setError(null);
    try {
      await removeResourceDownload(userId, resourceId);
      if (userIdRef.current !== userId) return;
      setDownloads((current) => current.filter((item) => item.resourceId !== resourceId));
    } catch (removeError) {
      if (userIdRef.current !== userId) return;
      setError(removeError instanceof Error ? removeError.message : 'The download could not be removed.');
    }
  };

  const open = async (download: ResourceDownload) => {
    setError(null);
    try {
      await shareDownloadedFile(download);
    } catch (openError) {
      if (userIdRef.current !== userId) return;
      setError(openError instanceof Error ? openError.message : 'The downloaded file could not be opened.');
    }
  };

  return (
    <Shell active="Library" title="Downloads" subtitle="Files saved on this device for offline access" scroll={false}>
      {loading || loadedScope !== scope ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      ) : (
        <FlatList
          data={downloads}
          keyExtractor={(item) => item.resourceId}
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12, flexGrow: 1 }}
          ListHeaderComponent={
            <View style={{ gap: 10, marginBottom: 8 }}>
              {error ? (
                <View style={{ gap: 8 }}>
                  <Txt size={12.5} color={colors.danger}>{error}</Txt>
                  <Button label="Retry" icon="refresh-outline" variant="outline" onPress={() => setRetry((value) => value + 1)} />
                </View>
              ) : null}
              {Platform.OS === 'web' ? (
                <Txt size={12.5} color={colors.textMuted}>Offline file downloads are available in the Android and iOS apps.</Txt>
              ) : null}
              <Txt size={12} color={colors.textMuted}>
                {downloads.length} file{downloads.length === 1 ? '' : 's'} saved locally
              </Txt>
            </View>
          }
          renderItem={({ item }) => (
            <StitchCard style={{ padding: 16 }} tone="raised">
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="document-text-outline" size={20} color={colors.blue} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Txt size={14} weight="800">{item.title}</Txt>
                    <Txt size={11} color={colors.textMuted}>
                      Saved {new Date(item.savedAt).toLocaleDateString()}
                    </Txt>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <Button label="Open / share file" icon="open-outline" onPress={() => void open(item)} />
                  <Button label="Remove download" icon="trash-outline" variant="outline" onPress={() => void remove(item.resourceId)} />
                </View>
              </View>
            </StitchCard>
          )}
          ListEmptyComponent={
            error ? null : (
              <EmptyState
                icon="cloud-download-outline"
                title="No offline files yet"
                body="Download a resource with an attached PDF from the Library to keep a local copy on this device."
                action="Browse Library"
                onAction={() => nav.navigate('Library')}
              />
            )
          }
        />
      )}
    </Shell>
  );
}
