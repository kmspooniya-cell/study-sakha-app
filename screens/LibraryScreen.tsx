import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudDownload,
  ExternalLink,
  FileText,
  Filter,
  Layers,
  PlusCircle,
  RefreshCw,
  Star,
  Timer,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';
import { Shell, useLayout } from '../components/Shell';
import { Popup } from '../components/Popup';
import {
  SSDSBadge,
  SSDSButton,
  SSDSEmptyState,
  SSDSIcon,
  SSDSProgressBar,
  SSDSRow,
  SSDSSearchInput,
  SSDSSkeleton,
  SSDSStack,
  SSDSSurface,
  SSDSText,
  useSSDSTheme,
} from '../lib/ssds';
import { EXAMS, getResources, SUBJECTS } from '../lib/data';
import {
  downloadResourceFile,
  getResourceDownloads,
  removeResourceDownload,
} from '../lib/resourceDownloads';
import type { ResourceDownload } from '../lib/resourceDownloads';
import { createStudentContentSignedUrl } from '../lib/supabase';
import { useStore } from '../lib/store';
import type { State } from '../lib/store';
import { Resource } from '../lib/types';
import type { ExamId } from '../lib/types';
import type { AppNavigation, AppRoute } from '../lib/navigation';
import { translateLabel } from '../lib/i18n';

const LIBRARY_SECTIONS = [
  {
    route: 'LibraryNotes',
    key: 'note',
    label: 'Notes',
    icon: FileText,
    description: 'Your revision notes and study material.',
  },
  {
    route: 'LibraryBooks',
    key: 'book',
    label: 'Books & PDFs',
    icon: BookOpen,
    description: 'Browse books and PDF resources.',
  },
  {
    route: 'LibraryPYQSets',
    key: 'pyq-set',
    label: 'PYQ Sets',
    icon: Layers,
    description: 'Practice previous-year question sets.',
  },
  {
    route: 'Tests',
    key: 'tests',
    label: 'Tests',
    icon: Timer,
    description: 'Practice timed tests and track your results.',
  },
  {
    route: 'LibraryStarred',
    key: 'starred',
    label: 'Starred',
    icon: Star,
    description: 'Quick access to resources you starred.',
  },
  {
    route: 'LibraryDownloads',
    key: 'downloads',
    label: 'Downloads',
    icon: CloudDownload,
    description: 'Saved offline files on this device.',
  },
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
  if (section === 'starred') {
    return resources.filter((resource) => state.starred.includes(resource.id));
  }
  if (section === 'downloads' || section === 'tests') return [];
  return resources.filter((resource) => resource.type === section);
}

function SectionCount({ section, state }: { section: LibrarySection; state: State }) {
  const count = getSectionResources(section.key, state).length;
  const language = state.settings.language;
  return (
    <SSDSText variant="Caption" color="textSecondary">
      {section.key === 'downloads'
        ? language === 'hi'
          ? 'सहेजी गई फ़ाइलें प्रबंधित करें'
          : 'Manage saved files'
        : section.key === 'tests'
          ? language === 'hi'
            ? 'टेस्ट सीरीज़ खोलें'
            : 'Open test series'
          : `${count} ${
              language === 'hi' ? 'संसाधन' : `resource${count === 1 ? '' : 's'}`
            }`}
    </SSDSText>
  );
}

async function shareDownloadedFile(download: ResourceDownload) {
  const info = await FileSystem.getInfoAsync(download.localUri);
  if (!info.exists) {
    throw new Error('This downloaded file is no longer available on this device.');
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('File sharing is not available on this device.');
  }
  await Sharing.shareAsync(download.localUri, {
    mimeType: 'application/pdf',
    dialogTitle: `Share ${download.title}`,
  });
}

export default function LibraryScreen() {
  const nav = useNavigation<AppNavigation>();
  const route = useRoute<AppRoute<'Library'>>();
  const { tokens } = useSSDSTheme();
  const { state } = useStore();
  const { isMobile } = useLayout();
  const language = state.settings.language;

  return (
    <Shell
      active="Library"
      title={translateLabel('Library', language)}
      subtitle={
        language === 'hi'
          ? 'आपके अध्ययन संसाधन एक ही स्थान पर'
          : 'Your study resources, organized in one place'
      }
      scroll={false}
    >
      <FlatList
        data={LIBRARY_SECTIONS}
        keyExtractor={(section) => section.route}
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        contentContainerStyle={{
          padding: isMobile ? 16 : 24,
          paddingBottom: 24,
          gap: 12,
          maxWidth: 920,
          width: '100%',
          alignSelf: 'center',
        }}
        renderItem={({ item: section }) => (
          <SSDSSurface variant="outlined" radius="lg" style={{ flex: 1 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${language === 'hi' ? 'खोलें' : 'Open'} ${translateLabel(section.label, language)}`}
              onPress={() => {
                if (section.route === 'Tests') {
                  nav.navigate(
                    'Tests',
                    route.params?.headerBrand
                      ? { headerBrand: route.params.headerBrand }
                      : undefined,
                  );
                } else {
                  nav.navigate(section.route, route.params);
                }
              }}
              style={({ pressed }) => ({
                minHeight: 160,
                padding: 16,
                gap: 10,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <SSDSRow justify="space-between">
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: tokens.radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: tokens.colors.primaryLight,
                  }}
                >
                  <SSDSIcon icon={section.icon as LucideIcon} size={21} color="primary" />
                </View>
                <SSDSIcon icon={ChevronRight} size={18} color="textTertiary" />
              </SSDSRow>
              <View style={{ flex: 1, gap: 3 }}>
                <SSDSText variant="CardTitle">
                  {translateLabel(section.label, language)}
                </SSDSText>
                <SSDSText variant="Caption" maxLines={2}>
                  {section.description}
                </SSDSText>
              </View>
              <SectionCount section={section} state={state} />
            </Pressable>
          </SSDSSurface>
        )}
      />
    </Shell>
  );
}

function LibrarySectionScreen({ sectionKey }: { sectionKey: LibrarySectionKey }) {
  const { tokens } = useSSDSTheme();
  const nav = useNavigation<AppNavigation>();
  const route =
    useRoute<
      AppRoute<
        | 'LibraryNotes'
        | 'LibraryBooks'
        | 'LibraryPYQSets'
        | 'LibraryStarred'
        | 'LibraryDownloads'
      >
    >();
  const { state, dispatch } = useStore();
  const { isMobile, isDesktop, isTablet } = useLayout();
  const section = LIBRARY_SECTIONS.find((item) => item.key === sectionKey)!;
  const bookCategories = useMemo(
    () =>
      Array.from(
        new Set([
          ...BOOK_CATEGORIES,
          ...getResources(state.managedContent)
            .filter((resource) => resource.type === 'book')
            .map((resource) => resource.category)
            .filter((category): category is string => Boolean(category)),
        ]),
      ),
    [state.managedContent],
  );

  const [exam, setExam] = useState<ExamId | 'all'>(route.params?.exam ?? 'all');
  const [subject, setSubject] = useState<string>(route.params?.subject ?? 'all');
  const [bookCategory, setBookCategory] = useState<string>(
    route.params?.category ?? 'all',
  );
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
    getResourceDownloads(userId)
      .then((saved) => {
        if (!active) return;
        setDownloads(saved);
        setDownloadScope(scope);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setDownloadErrors((current) => ({
          ...current,
          __storage:
            error instanceof Error ? error.message : 'Saved downloads could not be loaded.',
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
      setDownloads((current) => [
        saved,
        ...current.filter((item) => item.resourceId !== saved.resourceId),
      ]);
      setDownloadProgress((current) => ({ ...current, [resource.id]: 1 }));
    } catch (error) {
      if (!mountedRef.current || userIdRef.current !== userId) return;
      setDownloadErrors((current) => ({
        ...current,
        [resource.id]:
          error instanceof Error ? error.message : 'The resource could not be downloaded.',
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
    [sectionKey, state],
  );

  const subjects = useMemo(() => {
    return exam === 'all'
      ? SUBJECTS
      : SUBJECTS.filter((item) => item.exams.includes(exam));
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
        `${resource.title} ${resource.summary} ${resource.tags.join(' ')} ${resource.subject} ${resource.author}`
          .toLowerCase()
          .includes(q),
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
    dispatch({
      type: 'progress',
      id: resource.id,
      percent: state.progress[resource.id]?.percent ?? 5,
      title: resource.title,
    });
    const headerContext = route.params?.headerBrand
      ? { headerBrand: route.params.headerBrand }
      : {};
    if (resource.type === 'book') {
      nav.navigate('BookReader', { resourceId: resource.id, ...headerContext });
    } else {
      nav.navigate('NoteEditor', { resourceId: resource.id, ...headerContext });
    }
  };

  const renderCard = (resource: Resource) => {
    const starred = state.starred.includes(resource.id);
    const hasFile = Boolean(resource.fileObjectPath);
    const savedDownload =
      downloadScope === (userId ?? '__local__')
        ? downloads.find((item) => item.resourceId === resource.id)
        : undefined;
    const downloadBusy =
      downloadProgress[resource.id] !== undefined && downloadProgress[resource.id] < 1;
    const progress = state.progress[resource.id]?.percent ?? 0;

    return (
      <SSDSSurface
        variant="elevated"
        padding={14}
        style={{ flex: 1, margin: 6 }}
        key={resource.id}
      >
        <SSDSStack gap={12}>
          <Pressable
            onPress={() => open(resource)}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, gap: 12 })}
          >
            <SSDSRow align="flex-start" gap={12}>
              <Image
                source={{ uri: resource.cover }}
                style={{
                  width: 62,
                  height: 82,
                  borderRadius: 12,
                  backgroundColor: tokens.colors.surfaceSecondary,
                }}
              />
              <View style={{ flex: 1, gap: 6 }}>
                <SSDSRow gap={6}>
                  <SSDSBadge variant="primary" size="sm">
                    {resource.type === 'book'
                      ? 'Book'
                      : resource.type === 'note'
                        ? 'Note'
                        : 'PYQ Set'}
                  </SSDSBadge>
                  <SSDSBadge variant="neutral" size="sm">
                    {EXAMS.find((item) => item.id === resource.exam)?.short ?? ''}
                  </SSDSBadge>
                </SSDSRow>
                <SSDSText variant="CardTitle" maxLines={2}>
                  {resource.title}
                </SSDSText>
                <SSDSText variant="Caption" maxLines={2}>
                  {resource.summary}
                </SSDSText>
              </View>
            </SSDSRow>

            {progress > 0 ? (
              <SSDSStack gap={5}>
                <SSDSProgressBar
                  value={progress}
                  height={5}
                  color="secondary"
                  showLabel={false}
                />
                <SSDSText variant="Caption" color="textTertiary">
                  {progress}% complete
                </SSDSText>
              </SSDSStack>
            ) : null}
          </Pressable>

          <SSDSRow gap={12}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${resource.title}`}
              onPress={() => open(resource)}
              style={({ pressed }) => ({
                flex: 1,
                opacity: pressed ? 0.65 : 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              })}
            >
              <SSDSRow gap={4}>
                <SSDSIcon icon={Clock} size={13} color="textTertiary" />
                <SSDSText variant="Caption">{resource.minutes}m</SSDSText>
              </SSDSRow>
              <SSDSRow gap={4}>
                <SSDSIcon icon={FileText} size={13} color="textTertiary" />
                <SSDSText variant="Caption">{resource.pages}p</SSDSText>
              </SSDSRow>
              <SSDSRow gap={4}>
                <SSDSIcon icon={Star} size={13} color="warning" />
                <SSDSText variant="Caption">{resource.rating}</SSDSText>
              </SSDSRow>
            </Pressable>
            <Pressable
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={
                starred ? `Unstar ${resource.title}` : `Star ${resource.title}`
              }
              onPress={() => dispatch({ type: 'toggleStar', id: resource.id })}
              style={{
                marginLeft: 'auto',
                width: 32,
                height: 32,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: starred
                  ? tokens.colors.warningBackground
                  : tokens.colors.surfaceSecondary,
              }}
            >
              <SSDSIcon
                icon={Star}
                size={16}
                color={starred ? 'warning' : 'textTertiary'}
              />
            </Pressable>
            {hasFile && Platform.OS !== 'web' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  savedDownload
                    ? `Share downloaded file for ${resource.title}`
                    : `Download ${resource.title} for offline use`
                }
                disabled={downloadBusy}
                onPress={() => {
                  if (savedDownload) {
                    void shareDownloadedFile(savedDownload).catch((error: unknown) => {
                      setDownloadErrors((current) => ({
                        ...current,
                        [resource.id]:
                          error instanceof Error
                            ? error.message
                            : 'The downloaded file could not be opened.',
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
                  backgroundColor: savedDownload
                    ? tokens.colors.successBackground
                    : tokens.colors.surfaceSecondary,
                  opacity: pressed || downloadBusy ? 0.6 : 1,
                  flexDirection: 'row',
                  gap: 4,
                })}
              >
                {downloadBusy ? (
                  <ActivityIndicator size="small" color={tokens.colors.primary} />
                ) : (
                  <SSDSIcon
                    icon={savedDownload ? CheckCircle2 : CloudDownload}
                    size={16}
                    color={savedDownload ? 'success' : 'primary'}
                  />
                )}
              </Pressable>
            ) : null}
          </SSDSRow>
          {downloadErrors[resource.id] ? (
            <SSDSText variant="ErrorText">{downloadErrors[resource.id]}</SSDSText>
          ) : null}
          {downloadBusy ? (
            <SSDSStack gap={4}>
              <SSDSProgressBar
                value={(downloadProgress[resource.id] ?? 0) * 100}
                height={4}
                color="primary"
                showLabel={false}
              />
              <SSDSText variant="Caption">Saving for offline use…</SSDSText>
            </SSDSStack>
          ) : null}
        </SSDSStack>
      </SSDSSurface>
    );
  };

  const header = (
    <SSDSStack
      gap={14}
      style={{
        paddingHorizontal: isMobile ? 10 : 6,
        paddingTop: 6,
        maxWidth: 1120,
        width: '100%',
        alignSelf: 'center',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to Library categories"
        onPress={() => nav.navigate('Library')}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          opacity: pressed ? 0.65 : 1,
        })}
      >
        <SSDSIcon icon={ChevronLeft} size={17} color="primary" />
        <SSDSText variant="ButtonLabel" color="primary">
          Library categories
        </SSDSText>
      </Pressable>

      {sectionKey === 'book' ? (
        <SSDSStack gap={8}>
          <SSDSText variant="Overline" color="textTertiary">
            CATEGORY
          </SSDSText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select Books and PDFs category"
            accessibilityState={{ expanded: bookCategoryOpen }}
            onPress={() => setBookCategoryOpen(true)}
            style={({ pressed }) => ({
              minHeight: 48,
              paddingHorizontal: 14,
              borderRadius: tokens.radius.md,
              borderWidth: 1,
              borderColor: tokens.colors.borderSubtle,
              backgroundColor: pressed
                ? tokens.colors.surfaceSecondary
                : tokens.colors.surface,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            })}
          >
            <SSDSRow gap={9}>
              <SSDSIcon icon={Filter} size={17} color="primary" />
              <SSDSText variant="CardTitle">
                {bookCategory === 'all' ? 'All categories' : bookCategory}
              </SSDSText>
            </SSDSRow>
            <SSDSIcon icon={ChevronDown} size={17} color="textSecondary" />
          </Pressable>
        </SSDSStack>
      ) : null}

      <SSDSSearchInput
        value={query}
        onChangeText={setQuery}
        placeholder={`Search ${section.label.toLowerCase()}…`}
        returnKeyType="search"
      />

      {sectionKey !== 'book' ? (
        <>
          <SSDSStack gap={8}>
            <SSDSText variant="Overline" color="textTertiary">
              EXAM
            </SSDSText>
            <SSDSRow wrap="wrap" gap={8}>
              <SSDSButton
                size="small"
                variant={exam === 'all' ? 'primary' : 'outline'}
                onPress={() => applyExam('all')}
              >
                All exams
              </SSDSButton>
              {EXAMS.map((item) => (
                <SSDSButton
                  key={item.id}
                  size="small"
                  variant={exam === item.id ? 'primary' : 'outline'}
                  onPress={() => applyExam(item.id)}
                >
                  {item.short}
                </SSDSButton>
              ))}
            </SSDSRow>
          </SSDSStack>
          <SSDSStack gap={8}>
            <SSDSText variant="Overline" color="textTertiary">
              SUBJECT
            </SSDSText>
            <SSDSRow wrap="wrap" gap={8}>
              <SSDSButton
                size="small"
                variant={subject === 'all' ? 'primary' : 'outline'}
                onPress={() => setSubject('all')}
              >
                All subjects
              </SSDSButton>
              {subjects.map((item) => (
                <SSDSButton
                  key={item.id}
                  size="small"
                  variant={subject === item.name ? 'primary' : 'outline'}
                  onPress={() => setSubject(item.name)}
                >
                  {item.name}
                </SSDSButton>
              ))}
            </SSDSRow>
          </SSDSStack>
        </>
      ) : null}

      <SSDSRow justify="space-between" style={{ marginTop: 2 }}>
        <SSDSText variant="Caption" color="textSecondary">
          {data.length} resource{data.length === 1 ? '' : 's'}
        </SSDSText>
        <Pressable
          onPress={() => nav.navigate('NoteEditor', {})}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <SSDSIcon icon={PlusCircle} size={17} color="primary" />
          <SSDSText variant="ButtonLabel" color="primary">
            New note
          </SSDSText>
        </Pressable>
      </SSDSRow>
    </SSDSStack>
  );

  const hasSavedResources = section.key === 'downloads' || section.key === 'starred';
  const emptySavedSection = hasSavedResources && sectionResources.length === 0;
  return (
    <Shell
      active="Library"
      title={section.label}
      subtitle={section.description}
      scroll={false}
    >
      {loading ? (
        <SSDSStack gap={12} style={{ padding: 16 }}>
          {header}
          {[0, 1, 2].map((index) => (
            <SSDSSkeleton key={index} height={120} />
          ))}
        </SSDSStack>
      ) : (
        <FlatList
          key={`cols-${columns}`}
          data={data}
          keyExtractor={(resource) => resource.id}
          numColumns={columns}
          ListHeaderComponent={header}
          contentContainerStyle={{ padding: isMobile ? 6 : 14, paddingBottom: 24 }}
          columnWrapperStyle={columns > 1 ? { alignItems: 'stretch' } : undefined}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={tokens.colors.primary}
              colors={[tokens.colors.primary]}
            />
          }
          renderItem={({ item }) => renderCard(item)}
          ListEmptyComponent={
            <SSDSEmptyState
              icon={section.icon as LucideIcon}
              title={
                emptySavedSection
                  ? section.key === 'downloads'
                    ? 'No offline files available'
                    : 'No starred resources yet'
                  : 'Nothing matches those filters'
              }
              description={
                emptySavedSection
                  ? section.key === 'downloads'
                    ? 'Saved offline files will appear here. Downloadable resource files are not configured in this app yet.'
                    : 'Star a resource to keep it easy to find here.'
                  : 'Try a different exam, subject or search term.'
              }
              primaryAction={{
                label: emptySavedSection ? 'Browse Library' : 'Reset filters',
                onPress: () => {
                  if (emptySavedSection) {
                    nav.navigate('Library');
                    return;
                  }
                  setExam('all');
                  setSubject('all');
                  setBookCategory('all');
                  setQuery('');
                },
              }}
            />
          }
        />
      )}
      {sectionKey === 'book' ? (
        <Popup
          visible={bookCategoryOpen}
          onClose={() => setBookCategoryOpen(false)}
          presentation="center"
          title="Books & PDFs category"
        >
          <SSDSStack gap={12}>
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
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 12,
                    paddingVertical: 11,
                    borderRadius: tokens.radius.md,
                    backgroundColor: active
                      ? tokens.colors.primaryLight
                      : pressed
                        ? tokens.colors.surfaceSecondary
                        : 'transparent',
                  })}
                >
                  <SSDSText
                    variant="CardTitle"
                    color={active ? 'primary' : 'textPrimary'}
                  >
                    {category === 'all' ? 'All categories' : category}
                  </SSDSText>
                  {active ? (
                    <SSDSIcon icon={CheckCircle2} size={18} color="primary" />
                  ) : null}
                </Pressable>
              );
            })}
          </SSDSStack>
        </Popup>
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
  const { tokens } = useSSDSTheme();
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
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setLoading(true);
      setError(null);
      setLoadedScope(null);
      setDownloads([]);
      getResourceDownloads(userId)
        .then((saved) => {
          if (active) {
            setDownloads(saved);
            setLoadedScope(scope);
          }
        })
        .catch((loadError: unknown) => {
          if (active) {
            setError(
              loadError instanceof Error
                ? loadError.message
                : 'Saved downloads could not be loaded.',
            );
            setLoadedScope(scope);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
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
      setDownloads((current) =>
        current.filter((item) => item.resourceId !== resourceId),
      );
    } catch (removeError) {
      if (userIdRef.current !== userId) return;
      setError(
        removeError instanceof Error
          ? removeError.message
          : 'The download could not be removed.',
      );
    }
  };

  const open = async (download: ResourceDownload) => {
    setError(null);
    try {
      await shareDownloadedFile(download);
    } catch (openError) {
      if (userIdRef.current !== userId) return;
      setError(
        openError instanceof Error
          ? openError.message
          : 'The downloaded file could not be opened.',
      );
    }
  };

  return (
    <Shell
      active="Library"
      title="Downloads"
      subtitle="Files saved on this device for offline access"
      scroll={false}
    >
      {loading || loadedScope !== scope ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={tokens.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={downloads}
          keyExtractor={(item) => item.resourceId}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 24,
            gap: 12,
            flexGrow: 1,
          }}
          ListHeaderComponent={
            <SSDSStack gap={10} style={{ marginBottom: 8 }}>
              {error ? (
                <SSDSStack gap={8}>
                  <SSDSText variant="ErrorText">{error}</SSDSText>
                  <SSDSButton
                    variant="outline"
                    leadingIcon={RefreshCw}
                    onPress={() => setRetry((value) => value + 1)}
                  >
                    Retry
                  </SSDSButton>
                </SSDSStack>
              ) : null}
              {Platform.OS === 'web' ? (
                <SSDSText variant="BodySecondary">
                  Offline file downloads are available in the Android and iOS apps.
                </SSDSText>
              ) : null}
              <SSDSText variant="Caption">
                {downloads.length} file{downloads.length === 1 ? '' : 's'} saved locally
              </SSDSText>
            </SSDSStack>
          }
          renderItem={({ item }) => (
            <SSDSSurface variant="elevated" padding={16}>
              <SSDSStack gap={12}>
                <SSDSRow gap={10}>
                  <SSDSIcon icon={FileText} size={20} color="primary" />
                  <View style={{ flex: 1, gap: 3 }}>
                    <SSDSText variant="CardTitle">{item.title}</SSDSText>
                    <SSDSText variant="Caption">
                      Saved {new Date(item.savedAt).toLocaleDateString()}
                    </SSDSText>
                  </View>
                </SSDSRow>
                <SSDSRow wrap="wrap" gap={8}>
                  <SSDSButton
                    leadingIcon={ExternalLink}
                    onPress={() => void open(item)}
                  >
                    Open / share file
                  </SSDSButton>
                  <SSDSButton
                    variant="outline"
                    leadingIcon={Trash2}
                    onPress={() => void remove(item.resourceId)}
                  >
                    Remove download
                  </SSDSButton>
                </SSDSRow>
              </SSDSStack>
            </SSDSSurface>
          )}
          ListEmptyComponent={
            error ? null : (
              <SSDSEmptyState
                icon={CloudDownload}
                title="No offline files yet"
                description="Download a resource with an attached PDF from the Library to keep a local copy on this device."
                primaryAction={{
                  label: 'Browse Library',
                  onPress: () => nav.navigate('Library'),
                }}
              />
            )
          }
        />
      )}
    </Shell>
  );
}
