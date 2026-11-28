import { useNavigation } from '@react-navigation/native';
import type { AppNavigation } from '../lib/navigation';
import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { File } from 'expo-file-system';
import {
  BarChart2,
  Calendar,
  Check,
  CheckCheck,
  Clock,
  CloudUpload,
  EyeOff,
  File as FileIcon,
  FilePlus2,
  Gauge,
  Globe,
  Info,
  Layers,
  Link as LinkIcon,
  Lock,
  Megaphone,
  MessageSquare,
  PauseCircle,
  PenSquare,
  PieChart,
  PlayCircle,
  Save,
  Send,
  Trash2,
  Trophy,
  Type,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import { BarChart, Donut, HBar, SvgLegend } from '../components/Charts';
import { Shell, useLayout } from '../components/Shell';
import {
  SSDSAvatar,
  SSDSBadge,
  SSDSButton,
  SSDSConfirmationPattern,
  SSDSEmptyState,
  SSDSIcon,
  SSDSRow,
  SSDSSearchInput,
  SSDSSectionHeader,
  SSDSStack,
  SSDSSurface,
  SSDSText,
  SSDSTextInput,
  useSSDSTheme,
} from '../lib/ssds';
import { EXAMS, getResources, getTests, PYQS } from '../lib/data';
import {
  createFeedbackScreenshotSignedUrl,
  FEEDBACK_STATUS_OPTIONS,
  FeedbackCategory,
  FeedbackStatus,
  FeedbackSubmissionRecord,
  listAllFeedbackSubmissionsForAdmin,
  updateFeedbackSubmissionAdmin,
} from '../lib/feedback';
import { dayKey, useStore } from '../lib/store';
import { ManagedContent, ManagedContentType, TestQuestion } from '../lib/types';

type Tab = 'overview' | 'learners' | 'manage' | 'content' | 'announce' | 'feedback';
type ManagedTypeFilter = 'all' | ManagedContentType;

type ContentDraft = {
  type: ManagedContentType;
  title: string;
  description: string;
  exam: ManagedContent['exam'];
  subject: string;
  topic: string;
  sourceUrl: string;
  published: boolean;
  body: string;
  questionsJson: string;
  durationMin: string;
  points: string;
  eventDate: string;
};

const emptyDraft = (): ContentDraft => ({
  type: 'note',
  title: '',
  description: '',
  exam: 'upsc',
  subject: '',
  topic: '',
  sourceUrl: '',
  published: false,
  body: '',
  questionsJson: '',
  durationMin: '10',
  points: '',
  eventDate: new Date().toISOString().slice(0, 10),
});

const CONTENT_TYPES: { id: ManagedContentType; label: string }[] = [
  { id: 'note', label: 'Note' },
  { id: 'book', label: 'Book / PDF' },
  { id: 'pyq-set', label: 'PYQ Set' },
  { id: 'test', label: 'Test' },
  { id: 'current-affairs', label: 'Current Affairs' },
];

function parseQuestions(value: string, subject: string): TestQuestion[] | null {
  try {
    const raw: unknown = JSON.parse(value);
    if (!Array.isArray(raw) || !raw.length) return null;
    const questions = raw.map((item, index): TestQuestion | null => {
      if (!item || typeof item !== 'object') return null;
      const question = item as Partial<TestQuestion>;
      if (
        typeof question.question !== 'string' ||
        !Array.isArray(question.options) ||
        question.options.length < 2 ||
        !question.options.every((option) => typeof option === 'string') ||
        !Number.isInteger(question.answer) ||
        (question.answer as number) < 0 ||
        (question.answer as number) >= question.options.length
      ) {
        return null;
      }
      return {
        id:
          typeof question.id === 'string' && question.id
            ? question.id
            : `q-${index + 1}`,
        section:
          typeof question.section === 'string' && question.section
            ? question.section
            : subject || 'General',
        subject:
          typeof question.subject === 'string' && question.subject
            ? question.subject
            : subject || 'General',
        question: question.question,
        options: question.options,
        answer: question.answer as number,
        explanation:
          typeof question.explanation === 'string' ? question.explanation : '',
      };
    });
    return questions.every((question): question is TestQuestion => question !== null)
      ? questions
      : null;
  } catch {
    return null;
  }
}

function createContentId(existing: ManagedContent[]) {
  let id = '';
  do {
    id = `content-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  } while (existing.some((item) => item.id === id));
  return id;
}

function contentErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') return fallback;

  const detail = error as {
    message?: unknown;
    code?: unknown;
    statusCode?: unknown;
    details?: unknown;
    hint?: unknown;
  };
  if (typeof detail.message !== 'string') return fallback;
  const code = typeof detail.code === 'string' ? ` (${detail.code})` : '';
  const status =
    typeof detail.statusCode === 'string' || typeof detail.statusCode === 'number'
      ? ` (HTTP ${detail.statusCode})`
      : '';
  const details =
    typeof detail.details === 'string' ? ` Details: ${detail.details}` : '';
  const hint = typeof detail.hint === 'string' ? ` Hint: ${detail.hint}` : '';
  return `${detail.message}${code}${status}${details}${hint}`;
}

export default function AdminScreen() {
  const { tokens } = useSSDSTheme();
  const nav = useNavigation<AppNavigation>();
  const {
    state,
    dispatch,
    saveManagedContent,
    deleteManagedContent: removeManagedContent,
  } = useStore();
  const { isMobile, isDesktop } = useLayout();
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [contentSearch, setContentSearch] = useState('');
  const [contentTypeFilter, setContentTypeFilter] =
    useState<ManagedTypeFilter>('all');
  const [contentExamFilter, setContentExamFilter] = useState<
    'all' | ManagedContent['exam']
  >('all');
  const [draft, setDraft] = useState<ContentDraft>(emptyDraft);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [contentError, setContentError] = useState('');
  const [contentMessage, setContentMessage] = useState('');
  const [contentBusy, setContentBusy] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<DocumentPickerAsset | null>(null);
  const [removePdf, setRemovePdf] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagedContent | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('All learners');
  const [published, setPublished] = useState(false);

  const [feedbackItems, setFeedbackItems] = useState<FeedbackSubmissionRecord[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState<
    'all' | FeedbackCategory
  >('all');
  const [feedbackStatusDrafts, setFeedbackStatusDrafts] = useState<
    Record<string, FeedbackStatus>
  >({});
  const [feedbackResponseDrafts, setFeedbackResponseDrafts] = useState<
    Record<string, string>
  >({});
  const [feedbackSavingId, setFeedbackSavingId] = useState<string | null>(null);

  const isAdmin = state.user?.role === 'admin';

  const loadFeedback = useCallback(async () => {
    if (!isAdmin) return;
    setFeedbackLoading(true);
    setFeedbackError('');
    try {
      const items = await listAllFeedbackSubmissionsForAdmin();
      setFeedbackItems(items);
    } catch (error) {
      setFeedbackError(
        error instanceof Error
          ? error.message
          : 'Unable to load feedback submissions.',
      );
    } finally {
      setFeedbackLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || tab !== 'feedback') return;
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        void loadFeedback();
      }
    });
    return () => {
      active = false;
    };
  }, [isAdmin, loadFeedback, tab]);

  const learners = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.learners.filter(
      (l) => !q || `${l.name} ${l.email} ${l.exam}`.toLowerCase().includes(q),
    );
  }, [state.learners, search]);

  const kpis = useMemo(() => {
    const active = state.learners.filter((l) => l.status === 'active').length;
    const avg = Math.round(
      state.learners.reduce((a, b) => a + b.avgScore, 0) / state.learners.length,
    );
    const tests = state.learners.reduce((a, b) => a + b.tests, 0);
    const pending = state.queue.filter((q) => q.status === 'pending').length;
    return { active, avg, tests, pending };
  }, [state.learners, state.queue]);

  const examSplit = useMemo(
    () =>
      EXAMS.map((e) => ({
        label: e.short,
        value: state.learners.filter((l) => l.exam === e.id).length,
        color: e.color,
      })).filter((x) => x.value > 0),
    [state.learners],
  );

  const managedContent = useMemo(() => {
    const query = contentSearch.trim().toLowerCase();
    return state.managedContent.filter(
      (item) =>
        (contentTypeFilter === 'all' || item.type === contentTypeFilter) &&
        (contentExamFilter === 'all' || item.exam === contentExamFilter) &&
        (!query ||
          `${item.title} ${item.description} ${item.subject} ${item.topic}`
            .toLowerCase()
            .includes(query)),
    );
  }, [state.managedContent, contentSearch, contentTypeFilter, contentExamFilter]);

  const weekly = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return {
        label: date.toLocaleDateString('en-IN', { weekday: 'short' }),
        value: Math.round(state.studyLog[dayKey(date)] ?? 0),
      };
    });
  }, [state.studyLog]);

  const updateDraft = <K extends keyof ContentDraft>(key: K, value: ContentDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const editContent = (item: ManagedContent) => {
    setEditingContentId(item.id);
    setSelectedPdf(null);
    setRemovePdf(false);
    setContentMessage('');
    setDraft({
      type: item.type,
      title: item.title,
      description: item.description,
      exam: item.exam,
      subject: item.subject,
      topic: item.topic,
      sourceUrl: item.sourceUrl ?? '',
      published: item.published,
      body: item.body ?? '',
      questionsJson: item.questions
        ? JSON.stringify(item.questions, null, 2)
        : '',
      durationMin: `${item.durationMin ?? 10}`,
      points: item.points?.join('\n') ?? '',
      eventDate:
        item.eventDate ?? new Date(item.updatedAt).toISOString().slice(0, 10),
    });
    setContentError('');
  };

  const pickPdf = async () => {
    setContentError('');
    setContentMessage('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (
        !asset.name.toLowerCase().endsWith('.pdf') ||
        (asset.mimeType && asset.mimeType.toLowerCase() !== 'application/pdf')
      ) {
        setContentError('Choose a PDF file.');
        return;
      }
      const file = Platform.OS === 'web' ? asset.file : new File(asset.uri);
      if (!file) {
        setContentError('This browser did not provide access to the selected PDF.');
        return;
      }
      const size = asset.size ?? file.size;
      if (size < 1 || size > 50 * 1024 * 1024) {
        setContentError('PDF files must be smaller than 50 MB.');
        return;
      }
      const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
      if (
        Array.from(signature, (byte) => String.fromCharCode(byte)).join('') !== '%PDF-'
      ) {
        setContentError('The selected file does not have a valid PDF signature.');
        return;
      }
      setSelectedPdf(asset);
      setRemovePdf(false);
    } catch (error) {
      setContentError(contentErrorMessage(error, 'Unable to select this PDF.'));
    }
  };

  const saveContent = async () => {
    if (contentBusy) return;
    setContentError('');
    setContentMessage('');
    const titleValue = draft.title.trim();
    const description = draft.description.trim();
    const subject = draft.subject.trim();
    const topic = draft.topic.trim();
    if (!titleValue || !description || !subject || !topic) {
      setContentError('Title, description, subject and topic are required.');
      return;
    }

    const sourceUrl = draft.sourceUrl.trim();
    if (selectedPdf && sourceUrl) {
      setContentError(
        'Choose either a PDF upload or an external source URL, not both.',
      );
      return;
    }
    if (sourceUrl) {
      try {
        const parsed = new URL(sourceUrl);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          throw new Error();
        }
      } catch {
        setContentError(
          'Use a valid HTTP(S) URL to a file hosted outside this device.',
        );
        return;
      }
    }

    let questions: TestQuestion[] | undefined;
    if (draft.type === 'test') {
      questions = parseQuestions(draft.questionsJson, subject) ?? undefined;
      const durationMin = Number(draft.durationMin);
      if (!questions) {
        setContentError(
          'Enter a valid JSON array of questions with at least two options and a valid answer index.',
        );
        return;
      }
      if (!Number.isInteger(durationMin) || durationMin < 1 || durationMin > 600) {
        setContentError('Test duration must be from 1 to 600 minutes.');
        return;
      }
    }

    const item: ManagedContent = {
      id: editingContentId ?? createContentId(state.managedContent),
      type: draft.type,
      title: titleValue,
      description,
      exam: draft.exam,
      subject,
      topic,
      sourceUrl: sourceUrl || undefined,
      fileObjectPath: removePdf
        ? undefined
        : state.managedContent.find((entry) => entry.id === editingContentId)
            ?.fileObjectPath,
      published: draft.published,
      updatedAt: Date.now(),
      body:
        draft.type === 'current-affairs' || draft.type === 'test'
          ? undefined
          : draft.body.trim(),
      questions,
      durationMin: draft.type === 'test' ? Number(draft.durationMin) : undefined,
      points:
        draft.type === 'current-affairs'
          ? draft.points
              .split('\n')
              .map((point) => point.trim())
              .filter(Boolean)
          : undefined,
      eventDate: draft.type === 'current-affairs' ? draft.eventDate : undefined,
    };
    setContentBusy(true);
    setContentMessage('');
    try {
      const selectedFile = selectedPdf
        ? Platform.OS === 'web'
          ? selectedPdf.file
          : new File(selectedPdf.uri)
        : undefined;
      if (selectedPdf && !selectedFile) {
        throw new Error('Unable to access the selected PDF.');
      }
      const uploadFile =
        selectedPdf && selectedFile
          ? {
              blob:
                Platform.OS === 'web'
                  ? selectedFile
                  : await selectedFile.arrayBuffer(),
              name: selectedPdf.name,
              size: selectedPdf.size ?? selectedFile.size,
            }
          : undefined;
      const result = await saveManagedContent(item, uploadFile);
      if (!result.ok) {
        setContentError(result.error);
        return;
      }
      setEditingContentId(null);
      setDraft(emptyDraft());
      setSelectedPdf(null);
      setRemovePdf(false);
      setContentError('');
      setContentMessage(result.warning ?? 'Content saved to Supabase.');
    } catch (error) {
      setContentError(
        contentErrorMessage(error, 'Unable to save managed content.'),
      );
    } finally {
      setContentBusy(false);
    }
  };

  const cancelEdit = () => {
    setEditingContentId(null);
    setDraft(emptyDraft());
    setSelectedPdf(null);
    setRemovePdf(false);
    setContentError('');
    setContentMessage('');
  };

  const togglePublication = async (item: ManagedContent) => {
    if (contentBusy) return;
    setContentBusy(true);
    setContentError('');
    setContentMessage('');
    try {
      const result = await saveManagedContent({
        ...item,
        published: !item.published,
        updatedAt: Date.now(),
      });
      if (!result.ok) setContentError(result.error);
      else setContentMessage(result.warning ?? 'Publication status updated.');
    } catch (error) {
      setContentError(
        contentErrorMessage(error, 'Unable to update publication status.'),
      );
    } finally {
      setContentBusy(false);
    }
  };

  const deleteContent = async () => {
    if (!deleteTarget) return;
    if (contentBusy) return;
    setContentBusy(true);
    setContentError('');
    setContentMessage('');
    try {
      const result = await removeManagedContent(deleteTarget.id);
      if (!result.ok) {
        setContentError(result.error);
        return;
      }
      if (editingContentId === deleteTarget.id) cancelEdit();
      setContentMessage(result.warning ?? 'Content deleted from Supabase.');
      setDeleteTarget(null);
    } catch (error) {
      setContentError(
        error instanceof Error
          ? error.message
          : 'Unable to delete managed content.',
      );
    } finally {
      setContentBusy(false);
    }
  };

  if (!isAdmin) {
    return (
      <Shell active="Admin" title="Admin Portal" subtitle="Restricted area">
        <SSDSSurface variant="outlined" padding={16}>
          <SSDSEmptyState
            icon={Lock}
            title="Administrator access required"
            description="Sign in with an account that has been granted administrator access by a trusted server-side operator."
            primaryAction={{
              label: 'Go to profile',
              onPress: () => nav.navigate('Profile'),
            }}
          />
        </SSDSSurface>
      </Shell>
    );
  }

  const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
    { key: 'overview', label: 'Overview', icon: Gauge },
    { key: 'learners', label: 'Learners', icon: Users },
    { key: 'manage', label: 'Manage Content', icon: PenSquare },
    { key: 'content', label: 'Approvals', icon: CheckCheck },
    { key: 'announce', label: 'Announcements', icon: Megaphone },
    { key: 'feedback', label: 'Feedback', icon: MessageSquare },
  ];

  return (
    <Shell
      active="Admin"
      title="Admin Portal"
      subtitle="Platform health, learner management and content governance"
    >
      {state.managedContentError ? (
        <SSDSSurface variant="outlined" padding={14} style={{ marginBottom: 14 }}>
          <SSDSText variant="ErrorText">{state.managedContentError}</SSDSText>
        </SSDSSurface>
      ) : null}
      {tab !== 'manage' && (contentError || contentMessage) ? (
        <SSDSSurface variant="outlined" padding={14} style={{ marginBottom: 14 }}>
          <SSDSText
            variant="BodySecondary"
            color={contentError ? 'danger' : 'success'}
          >
            {contentError || contentMessage}
          </SSDSText>
        </SSDSSurface>
      ) : null}

      <SSDSRow wrap="wrap" gap={8} style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <SSDSButton
            key={t.key}
            size="small"
            leadingIcon={t.icon}
            variant={tab === t.key ? 'primary' : 'outline'}
            onPress={() => setTab(t.key)}
          >
            {t.label}
          </SSDSButton>
        ))}
      </SSDSRow>

      {tab === 'overview' ? (
        <SSDSStack gap={16}>
          <SSDSRow wrap="wrap" gap={10}>
            {[
              {
                l: 'Active learners',
                v: `${kpis.active}`,
                s: `${state.learners.length} total`,
                i: Users,
                c: tokens.colors.primary,
              },
              {
                l: 'Avg. mock score',
                v: `${kpis.avg}%`,
                s: 'across all exams',
                i: BarChart2,
                c: tokens.colors.secondary,
              },
              {
                l: 'Tests attempted',
                v: kpis.tests.toLocaleString('en-IN'),
                s: 'lifetime',
                i: Clock,
                c: tokens.colors.chartQuaternary,
              },
              {
                l: 'Pending approvals',
                v: `${kpis.pending}`,
                s: 'awaiting review',
                i: FilePlus2,
                c: tokens.colors.warning,
              },
            ].map((k) => (
              <SSDSSurface
                key={k.l}
                variant="outlined"
                padding={16}
                style={{ flexGrow: 1, flexBasis: isMobile ? '45%' : 180 }}
              >
                <SSDSStack gap={9}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor: `${k.c}1A`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SSDSIcon icon={k.i} size={18} color={k.c} />
                  </View>
                  <SSDSText variant="StatisticValue">{k.v}</SSDSText>
                  <SSDSText variant="StatisticLabel">{k.l}</SSDSText>
                  <SSDSText variant="Caption" color="textTertiary">
                    {k.s}
                  </SSDSText>
                </SSDSStack>
              </SSDSSurface>
            ))}
          </SSDSRow>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
            <SSDSSurface variant="outlined" padding={16} style={{ flex: 1.3 }}>
              <SSDSSectionHeader
                title="Weekly platform activity"
                icon={BarChart2}
                description="minutes studied"
                compact
              />
              <BarChart data={weekly} color={tokens.colors.primary} />
            </SSDSSurface>
            <SSDSSurface variant="outlined" padding={16} style={{ flex: 1 }}>
              <SSDSSectionHeader title="Learners by exam" icon={PieChart} compact />
              <SSDSRow gap={18}>
                <Donut
                  segments={examSplit}
                  center={
                    <>
                      <SSDSText variant="StatisticValue">
                        {state.learners.length}
                      </SSDSText>
                      <SSDSText variant="Caption">learners</SSDSText>
                    </>
                  }
                />
                <View style={{ flex: 1 }}>
                  <SvgLegend
                    items={examSplit.map((e) => ({
                      label: e.label,
                      color: e.color,
                      value: `${e.value}`,
                    }))}
                  />
                </View>
              </SSDSRow>
            </SSDSSurface>
          </View>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
            <SSDSSurface variant="outlined" padding={16} style={{ flex: 1 }}>
              <SSDSSectionHeader title="Catalogue coverage" icon={Layers} compact />
              <HBar
                label="Library resources"
                value={getResources(state.managedContent).length}
                total={20}
                color={tokens.colors.primary}
              />
              <HBar
                label="PYQ bank"
                value={PYQS.length}
                total={30}
                color={tokens.colors.secondary}
              />
              <HBar
                label="Mock tests"
                value={getTests(state.managedContent).length}
                total={10}
                color={tokens.colors.chartQuaternary}
              />
              <HBar
                label="Approved submissions"
                value={state.queue.filter((q) => q.status === 'approved').length}
                total={state.queue.length}
                color={tokens.colors.success}
              />
            </SSDSSurface>
            <SSDSSurface variant="outlined" padding={16} style={{ flex: 1 }}>
              <SSDSSectionHeader title="Top performers" icon={Trophy} compact />
              <SSDSStack gap={12}>
                {[...state.learners]
                  .sort((a, b) => b.avgScore - a.avgScore)
                  .slice(0, 5)
                  .map((l, i) => (
                    <SSDSRow key={l.id} gap={11}>
                      <SSDSText
                        variant="Caption"
                        color="textTertiary"
                        style={{ width: 18 }}
                      >
                        {i + 1}
                      </SSDSText>
                      <SSDSAvatar name={l.name} size={32} />
                      <View style={{ flex: 1 }}>
                        <SSDSText variant="CardTitle" truncate>
                          {l.name}
                        </SSDSText>
                        <SSDSText variant="Caption">
                          {l.exam.toUpperCase()} · {l.tests} tests
                        </SSDSText>
                      </View>
                      <SSDSBadge variant="success" size="sm">
                        {`${l.avgScore}%`}
                      </SSDSBadge>
                    </SSDSRow>
                  ))}
              </SSDSStack>
            </SSDSSurface>
          </View>
        </SSDSStack>
      ) : null}

      {tab === 'learners' ? (
        <SSDSStack gap={14}>
          <SSDSSearchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search learners by name, email or exam…"
            returnKeyType="search"
          />
          {learners.map((l) => (
            <SSDSSurface key={l.id} variant="outlined" padding={16}>
              <View
                style={{
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: 14,
                  alignItems: isMobile ? 'flex-start' : 'center',
                }}
              >
                <SSDSAvatar name={l.name} size={44} />
                <SSDSStack gap={4} style={{ flex: 1 }}>
                  <SSDSRow wrap="wrap" gap={8}>
                    <SSDSText variant="CardTitle">{l.name}</SSDSText>
                    <SSDSBadge
                      variant={l.plan === 'Elite' || l.plan === 'Pro' ? 'primary' : 'neutral'}
                      size="sm"
                    >
                      {l.plan}
                    </SSDSBadge>
                    <SSDSBadge
                      variant={l.status === 'active' ? 'success' : 'danger'}
                      size="sm"
                    >
                      {l.status === 'active' ? 'Active' : 'Suspended'}
                    </SSDSBadge>
                  </SSDSRow>
                  <SSDSText variant="Caption">
                    {l.email} · joined {l.joined}
                  </SSDSText>
                  <SSDSRow wrap="wrap" gap={14} style={{ marginTop: 4 }}>
                    {[
                      ['Exam', l.exam.toUpperCase()],
                      ['Streak', `${l.streak}d`],
                      ['Tests', `${l.tests}`],
                      ['Avg', `${l.avgScore}%`],
                    ].map(([k, v]) => (
                      <View key={k}>
                        <SSDSText variant="Caption" color="textTertiary">
                          {k}
                        </SSDSText>
                        <SSDSText variant="CardTitle">{v}</SSDSText>
                      </View>
                    ))}
                  </SSDSRow>
                </SSDSStack>
                <SSDSButton
                  size="small"
                  leadingIcon={l.status === 'active' ? PauseCircle : PlayCircle}
                  variant={l.status === 'active' ? 'outline' : 'primary'}
                  onPress={() =>
                    dispatch({
                      type: 'learnerStatus',
                      id: l.id,
                      status: l.status === 'active' ? 'suspended' : 'active',
                    })
                  }
                >
                  {l.status === 'active' ? 'Suspend' : 'Activate'}
                </SSDSButton>
              </View>
            </SSDSSurface>
          ))}
          {!learners.length ? (
            <SSDSEmptyState
              icon={Users}
              title="No learners found"
              description="Try a different name, email or exam keyword."
            />
          ) : null}
        </SSDSStack>
      ) : null}

      {tab === 'manage' ? (
        <View
          style={{
            flexDirection: isDesktop ? 'row' : 'column',
            alignItems: isDesktop ? 'flex-start' : 'stretch',
            gap: 16,
          }}
        >
          <SSDSSurface
            variant="outlined"
            padding={16}
            style={{
              flex: isDesktop ? 1.1 : undefined,
              width: isDesktop ? undefined : '100%',
            }}
          >
            <SSDSStack gap={14}>
              <SSDSSectionHeader
                title={editingContentId ? 'Edit content' : 'Add educational content'}
                icon={FilePlus2}
                compact
              />
              <SSDSTextInput
                label="Title"
                value={draft.title}
                onChangeText={(value) => updateDraft('title', value)}
                placeholder="Content title"
                leadingIcon={Type}
              />
              <SSDSTextInput
                label="Description"
                value={draft.description}
                onChangeText={(value) => updateDraft('description', value)}
                placeholder="What will students learn?"
                multiline
                rows={4}
              />

              <SSDSStack gap={8}>
                <SSDSText variant="InputLabel" color="textSecondary">
                  Content type
                </SSDSText>
                <SSDSRow wrap="wrap" gap={8}>
                  {CONTENT_TYPES.map((item) => (
                    <SSDSButton
                      key={item.id}
                      size="small"
                      variant={draft.type === item.id ? 'primary' : 'outline'}
                      onPress={() => {
                        updateDraft('type', item.id);
                        setContentError('');
                      }}
                    >
                      {item.label}
                    </SSDSButton>
                  ))}
                </SSDSRow>
              </SSDSStack>

              <SSDSStack gap={8}>
                <SSDSText variant="InputLabel" color="textSecondary">
                  Exam
                </SSDSText>
                <SSDSRow wrap="wrap" gap={8}>
                  {EXAMS.map((item) => (
                    <SSDSButton
                      key={item.id}
                      size="small"
                      variant={draft.exam === item.id ? 'primary' : 'outline'}
                      onPress={() => updateDraft('exam', item.id)}
                    >
                      {item.short}
                    </SSDSButton>
                  ))}
                </SSDSRow>
              </SSDSStack>

              <View
                style={{ flexDirection: isMobile ? 'column' : 'row', gap: 10 }}
              >
                <View style={{ flex: 1 }}>
                  <SSDSTextInput
                    label="Subject"
                    value={draft.subject}
                    onChangeText={(value) => updateDraft('subject', value)}
                    placeholder="e.g. Polity"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <SSDSTextInput
                    label="Topic"
                    value={draft.topic}
                    onChangeText={(value) => updateDraft('topic', value)}
                    placeholder="e.g. Fundamental Rights"
                  />
                </View>
              </View>

              <SSDSTextInput
                label="Hosted file or source URL (optional)"
                value={draft.sourceUrl}
                onChangeText={(value) => updateDraft('sourceUrl', value)}
                placeholder="https://…"
                autoCapitalize="none"
                leadingIcon={LinkIcon}
                helperText="Use a durable HTTP(S) source, or select a PDF below for a private upload to Student-content."
              />

              {draft.type === 'book' ? (
                <SSDSStack gap={8}>
                  <SSDSRow wrap="wrap" gap={8}>
                    <SSDSButton
                      variant="outline"
                      leadingIcon={CloudUpload}
                      loading={contentBusy}
                      onPress={pickPdf}
                    >
                      {selectedPdf ? 'Choose a different PDF' : 'Upload PDF'}
                    </SSDSButton>
                    {selectedPdf ? (
                      <SSDSText variant="Caption">{selectedPdf.name}</SSDSText>
                    ) : editingContentId &&
                      !removePdf &&
                      state.managedContent.find(
                        (item) => item.id === editingContentId,
                      )?.fileObjectPath ? (
                      <SSDSText variant="Caption" color="success">
                        A private PDF is already uploaded.
                      </SSDSText>
                    ) : null}
                    {editingContentId &&
                    state.managedContent.find(
                      (item) => item.id === editingContentId,
                    )?.fileObjectPath ? (
                      <SSDSButton
                        size="small"
                        variant="ghost"
                        onPress={() => setRemovePdf((value) => !value)}
                      >
                        {removePdf ? 'Keep uploaded PDF' : 'Remove uploaded PDF'}
                      </SSDSButton>
                    ) : null}
                  </SSDSRow>
                  {removePdf ? (
                    <SSDSText variant="Caption" color="warning">
                      The existing PDF will be removed when you save.
                    </SSDSText>
                  ) : null}
                  <SSDSText variant="Caption" color="textTertiary">
                    PDF only, maximum 50 MB. Student access is granted only after
                    publication.
                  </SSDSText>
                </SSDSStack>
              ) : null}

              {draft.type === 'note' ||
              draft.type === 'book' ||
              draft.type === 'pyq-set' ? (
                <SSDSTextInput
                  label={
                    draft.type === 'book'
                      ? 'Reading content (optional when a hosted PDF is linked)'
                      : 'Content'
                  }
                  value={draft.body}
                  onChangeText={(value) => updateDraft('body', value)}
                  placeholder="Paste the learning content here…"
                  multiline
                  rows={6}
                />
              ) : null}

              {draft.type === 'test' ? (
                <SSDSStack gap={12}>
                  <SSDSTextInput
                    label="Duration (minutes)"
                    value={draft.durationMin}
                    onChangeText={(value) => updateDraft('durationMin', value)}
                    placeholder="10"
                    type="numeric"
                    leadingIcon={Clock}
                  />
                  <SSDSTextInput
                    label="Questions (JSON)"
                    value={draft.questionsJson}
                    onChangeText={(value) => updateDraft('questionsJson', value)}
                    placeholder={
                      '[{"section":"Polity","subject":"Polity","question":"Question text","options":["Option A","Option B"],"answer":0,"explanation":"Why this is correct"}]'
                    }
                    multiline
                    rows={7}
                    helperText="Each question needs a prompt, at least two options, and a zero-based answer index."
                  />
                </SSDSStack>
              ) : null}

              {draft.type === 'current-affairs' ? (
                <SSDSStack gap={12}>
                  <SSDSTextInput
                    label="Publication date"
                    value={draft.eventDate}
                    onChangeText={(value) => updateDraft('eventDate', value)}
                    placeholder="YYYY-MM-DD"
                    leadingIcon={Calendar}
                  />
                  <SSDSTextInput
                    label="Key points (one per line)"
                    value={draft.points}
                    onChangeText={(value) => updateDraft('points', value)}
                    placeholder="Add exam-relevant facts, one per line"
                    multiline
                    rows={5}
                  />
                </SSDSStack>
              ) : null}

              <SSDSStack gap={8}>
                <SSDSText variant="InputLabel" color="textSecondary">
                  Publication status
                </SSDSText>
                <SSDSRow gap={8}>
                  <SSDSButton
                    size="small"
                    variant={!draft.published ? 'primary' : 'outline'}
                    onPress={() => updateDraft('published', false)}
                  >
                    Draft
                  </SSDSButton>
                  <SSDSButton
                    size="small"
                    leadingIcon={Globe}
                    variant={draft.published ? 'primary' : 'outline'}
                    onPress={() => updateDraft('published', true)}
                  >
                    Published
                  </SSDSButton>
                </SSDSRow>
              </SSDSStack>

              {contentError || contentMessage ? (
                <SSDSSurface
                  variant="outlined"
                  padding={12}
                  style={{
                    borderColor: contentError
                      ? tokens.colors.danger
                      : tokens.colors.success,
                  }}
                >
                  <SSDSText
                    variant="BodySecondary"
                    color={contentError ? 'danger' : 'success'}
                  >
                    {contentError || contentMessage}
                  </SSDSText>
                </SSDSSurface>
              ) : null}

              <SSDSRow wrap="wrap" gap={9}>
                <SSDSButton
                  leadingIcon={Save}
                  loading={contentBusy}
                  onPress={saveContent}
                >
                  {editingContentId ? 'Save changes' : 'Save content'}
                </SSDSButton>
                {editingContentId ? (
                  <SSDSButton variant="outline" onPress={cancelEdit}>
                    Cancel edit
                  </SSDSButton>
                ) : null}
              </SSDSRow>
            </SSDSStack>
          </SSDSSurface>

          <SSDSStack
            gap={16}
            style={{
              flex: isDesktop ? 1 : undefined,
              width: isDesktop ? undefined : '100%',
            }}
          >
            <SSDSSurface variant="outlined" padding={16}>
              <SSDSStack gap={12}>
                <SSDSSectionHeader
                  title="Managed content"
                  icon={Layers}
                  subtitle={`${state.managedContent.length} total`}
                  compact
                />
                <SSDSSearchInput
                  value={contentSearch}
                  onChangeText={setContentSearch}
                  placeholder="Search title, subject or topic"
                  returnKeyType="search"
                />
                <SSDSRow wrap="wrap" gap={7}>
                  <SSDSButton
                    size="small"
                    variant={contentTypeFilter === 'all' ? 'primary' : 'outline'}
                    onPress={() => setContentTypeFilter('all')}
                  >
                    All types
                  </SSDSButton>
                  {CONTENT_TYPES.map((item) => (
                    <SSDSButton
                      key={item.id}
                      size="small"
                      variant={contentTypeFilter === item.id ? 'primary' : 'outline'}
                      onPress={() => setContentTypeFilter(item.id)}
                    >
                      {item.label}
                    </SSDSButton>
                  ))}
                </SSDSRow>
                <SSDSRow wrap="wrap" gap={7}>
                  <SSDSButton
                    size="small"
                    variant={contentExamFilter === 'all' ? 'primary' : 'outline'}
                    onPress={() => setContentExamFilter('all')}
                  >
                    All exams
                  </SSDSButton>
                  {EXAMS.map((item) => (
                    <SSDSButton
                      key={item.id}
                      size="small"
                      variant={contentExamFilter === item.id ? 'primary' : 'outline'}
                      onPress={() => setContentExamFilter(item.id)}
                    >
                      {item.short}
                    </SSDSButton>
                  ))}
                </SSDSRow>
              </SSDSStack>
            </SSDSSurface>

            {managedContent.map((item) => (
              <SSDSSurface key={item.id} variant="outlined" padding={16}>
                <SSDSStack gap={10}>
                  <SSDSRow wrap="wrap" gap={7}>
                    <SSDSBadge variant="primary" size="sm">
                      {CONTENT_TYPES.find((type) => type.id === item.type)?.label ??
                        item.type}
                    </SSDSBadge>
                    <SSDSBadge variant="secondary" size="sm">
                      {EXAMS.find((exam) => exam.id === item.exam)?.short ??
                        item.exam}
                    </SSDSBadge>
                    <SSDSBadge
                      variant={item.published ? 'success' : 'neutral'}
                      size="sm"
                    >
                      {item.published ? 'Published' : 'Draft'}
                    </SSDSBadge>
                  </SSDSRow>
                  <SSDSText variant="CardTitle">{item.title}</SSDSText>
                  <SSDSText variant="Caption">
                    {item.subject} · {item.topic}
                  </SSDSText>
                  <SSDSText variant="BodySecondary" maxLines={3}>
                    {item.description}
                  </SSDSText>
                  <SSDSRow wrap="wrap" gap={8}>
                    <SSDSButton
                      size="small"
                      variant="outline"
                      leadingIcon={PenSquare}
                      onPress={() => editContent(item)}
                    >
                      Edit
                    </SSDSButton>
                    <SSDSButton
                      size="small"
                      variant="secondary"
                      leadingIcon={item.published ? EyeOff : Globe}
                      loading={contentBusy}
                      onPress={() => void togglePublication(item)}
                    >
                      {item.published ? 'Unpublish' : 'Publish'}
                    </SSDSButton>
                    <SSDSButton
                      size="small"
                      variant="destructive"
                      leadingIcon={Trash2}
                      onPress={() => setDeleteTarget(item)}
                    >
                      Delete
                    </SSDSButton>
                  </SSDSRow>
                </SSDSStack>
              </SSDSSurface>
            ))}

            {!managedContent.length && !state.managedContentError ? (
              <SSDSEmptyState
                icon={FileIcon}
                title="No managed content found"
                description="Add content or adjust the search and filters."
              />
            ) : null}
          </SSDSStack>
        </View>
      ) : null}

      {tab === 'content' ? (
        <SSDSStack gap={14}>
          <SSDSSurface variant="outlined" padding={14}>
            <SSDSRow gap={12}>
              <SSDSIcon icon={Info} size={20} color="primary" />
              <SSDSText variant="BodySecondary" style={{ flex: 1 }}>
                {state.queue.filter((q) => q.status === 'pending').length}{' '}
                submission(s) awaiting review. Approved content is published to the
                learner library immediately.
              </SSDSText>
            </SSDSRow>
          </SSDSSurface>
          {state.queue.map((c) => (
            <SSDSSurface key={c.id} variant="outlined" padding={16}>
              <SSDSStack gap={12}>
                <SSDSRow wrap="wrap" gap={8}>
                  <SSDSBadge variant="primary" size="sm">
                    {c.type}
                  </SSDSBadge>
                  <SSDSBadge variant="secondary" size="sm">
                    {EXAMS.find((e) => e.id === c.exam)?.short ?? ''}
                  </SSDSBadge>
                  <SSDSBadge
                    variant={
                      c.status === 'pending'
                        ? 'warning'
                        : c.status === 'approved'
                          ? 'success'
                          : 'danger'
                    }
                    size="sm"
                  >
                    {c.status === 'pending'
                      ? 'Pending'
                      : c.status === 'approved'
                        ? 'Approved'
                        : 'Rejected'}
                  </SSDSBadge>
                  <SSDSText variant="Caption" style={{ marginLeft: 'auto' }}>
                    submitted {c.submitted}
                  </SSDSText>
                </SSDSRow>
                <SSDSText variant="SectionTitle">{c.title}</SSDSText>
                <SSDSText variant="BodySecondary">by {c.author}</SSDSText>
                {c.status === 'pending' ? (
                  <SSDSRow gap={10}>
                    <SSDSButton
                      size="small"
                      leadingIcon={Check}
                      onPress={() =>
                        dispatch({
                          type: 'reviewContent',
                          id: c.id,
                          status: 'approved',
                        })
                      }
                    >
                      Approve
                    </SSDSButton>
                    <SSDSButton
                      size="small"
                      variant="outline"
                      leadingIcon={X}
                      onPress={() =>
                        dispatch({
                          type: 'reviewContent',
                          id: c.id,
                          status: 'rejected',
                        })
                      }
                    >
                      Reject
                    </SSDSButton>
                  </SSDSRow>
                ) : (
                  <SSDSButton
                    size="small"
                    variant="ghost"
                    onPress={() =>
                      dispatch({
                        type: 'reviewContent',
                        id: c.id,
                        status: 'pending',
                      })
                    }
                  >
                    Move back to pending
                  </SSDSButton>
                )}
              </SSDSStack>
            </SSDSSurface>
          ))}
        </SSDSStack>
      ) : null}

      {tab === 'announce' ? (
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
          <SSDSSurface variant="outlined" padding={16} style={{ flex: 1 }}>
            <SSDSStack gap={14}>
              <SSDSSectionHeader
                title="Publish announcement"
                icon={Megaphone}
                compact
              />
              <SSDSTextInput
                label="Title"
                value={title}
                onChangeText={setTitle}
                placeholder="E.g. Prelims Countdown Series begins Monday"
                leadingIcon={Type}
              />
              <SSDSTextInput
                label="Message"
                value={body}
                onChangeText={setBody}
                placeholder="What should learners know?"
                multiline
                rows={5}
              />
              <View>
                <SSDSText
                  variant="InputLabel"
                  color="textSecondary"
                  style={{ marginBottom: 9 }}
                >
                  Audience
                </SSDSText>
                <SSDSRow wrap="wrap" gap={8}>
                  {[
                    'All learners',
                    'UPSC aspirants',
                    'SSC aspirants',
                    'Banking aspirants',
                    'Elite plan',
                  ].map((a) => (
                    <SSDSButton
                      key={a}
                      size="small"
                      variant={audience === a ? 'primary' : 'outline'}
                      onPress={() => setAudience(a)}
                    >
                      {a}
                    </SSDSButton>
                  ))}
                </SSDSRow>
              </View>
              <SSDSButton
                leadingIcon={published ? CheckCheck : Send}
                fullWidth
                onPress={() => {
                  if (!title.trim() || !body.trim()) return;
                  const item = {
                    id: `a-${Date.now()}`,
                    title: title.trim(),
                    body: body.trim(),
                    audience,
                    at: Date.now(),
                  };
                  dispatch({ type: 'announce', item });
                  dispatch({
                    type: 'notify',
                    notif: {
                      id: `n-${Date.now()}`,
                      title: item.title,
                      body: item.body,
                      at: Date.now(),
                      kind: 'announcement',
                      read: false,
                    },
                  });
                  setTitle('');
                  setBody('');
                  setPublished(true);
                  setTimeout(() => setPublished(false), 2200);
                }}
              >
                {published ? 'Published' : 'Publish announcement'}
              </SSDSButton>
            </SSDSStack>
          </SSDSSurface>

          <SSDSSurface variant="outlined" padding={16} style={{ flex: 1 }}>
            <SSDSSectionHeader
              title="Published"
              icon={Clock}
              actionLabel="Inbox"
              onAction={() => nav.navigate('Notifications')}
              compact
            />
            <SSDSStack gap={14}>
              {state.announcements.map((a) => (
                <View
                  key={a.id}
                  style={{
                    padding: 13,
                    borderRadius: tokens.radius.md,
                    borderWidth: 1,
                    borderColor: tokens.colors.border,
                    gap: 6,
                  }}
                >
                  <SSDSText variant="CardTitle">{a.title}</SSDSText>
                  <SSDSText variant="BodySecondary">{a.body}</SSDSText>
                  <SSDSRow gap={8}>
                    <SSDSBadge variant="secondary" size="sm">
                      {a.audience}
                    </SSDSBadge>
                    <SSDSText variant="Caption">
                      {new Date(a.at).toLocaleString('en-IN')}
                    </SSDSText>
                  </SSDSRow>
                </View>
              ))}
            </SSDSStack>
          </SSDSSurface>
        </View>
      ) : null}

      {tab === 'feedback' ? (
        <SSDSStack gap={14}>
          <SSDSSurface variant="outlined" padding={16}>
            <SSDSStack gap={12}>
              <SSDSSectionHeader
                title="User Feedback & Issues"
                icon={MessageSquare}
                actionLabel={feedbackLoading ? 'Loading...' : 'Refresh'}
                onAction={() => {
                  void loadFeedback();
                }}
                compact
              />
              <SSDSRow wrap="wrap" gap={8}>
                {([
                  { id: 'all', label: 'All' },
                  { id: 'report_issue', label: 'Issues' },
                  { id: 'share_idea', label: 'Ideas' },
                  { id: 'appreciate_team', label: 'Appreciation' },
                ] as const).map((cat) => (
                  <SSDSButton
                    key={cat.id}
                    size="small"
                    variant={
                      feedbackCategoryFilter === cat.id ? 'primary' : 'outline'
                    }
                    onPress={() => setFeedbackCategoryFilter(cat.id)}
                  >
                    {cat.label}
                  </SSDSButton>
                ))}
              </SSDSRow>
              {feedbackError ? (
                <SSDSText variant="ErrorText">{feedbackError}</SSDSText>
              ) : null}
            </SSDSStack>
          </SSDSSurface>

          {feedbackItems
            .filter(
              (item) =>
                feedbackCategoryFilter === 'all' ||
                item.category === feedbackCategoryFilter,
            )
            .map((item) => {
              const draftStatus = feedbackStatusDrafts[item.id] ?? item.status;
              const draftResponse =
                feedbackResponseDrafts[item.id] ?? (item.admin_response ?? '');
              const categoryLabel =
                item.category === 'report_issue'
                  ? 'Issue'
                  : item.category === 'share_idea'
                    ? 'Idea'
                    : 'Appreciation';
              const screenshotPath = item.attachment_metadata?.screenshotPath;
              const logsPreview = item.attachment_metadata?.logsPreview;

              return (
                <SSDSSurface key={item.id} variant="outlined" padding={16}>
                  <SSDSStack gap={10}>
                    <SSDSRow justify="space-between" wrap="wrap" gap={8}>
                      <SSDSRow wrap="wrap" gap={6}>
                        <SSDSBadge
                          variant={
                            item.category === 'report_issue'
                              ? 'danger'
                              : item.category === 'share_idea'
                                ? 'primary'
                                : 'success'
                          }
                          size="sm"
                        >
                          {categoryLabel}
                        </SSDSBadge>
                        {item.sub_category ? (
                          <SSDSBadge variant="neutral" size="sm">
                            {item.sub_category}
                          </SSDSBadge>
                        ) : null}
                        <SSDSBadge variant="secondary" size="sm">
                          {item.status}
                        </SSDSBadge>
                      </SSDSRow>
                      <SSDSText variant="Caption">
                        {new Date(item.created_at).toLocaleString('en-IN')}
                      </SSDSText>
                    </SSDSRow>

                    <SSDSText variant="CardTitle">{item.message}</SSDSText>
                    {item.reproduction_steps ? (
                      <SSDSText variant="BodySecondary">
                        Steps: {item.reproduction_steps}
                      </SSDSText>
                    ) : null}

                    <SSDSText variant="Caption">
                      Sender: {item.user_id} • v{item.app_version || '1.0.0'} •{' '}
                      {item.platform || 'unknown'}
                    </SSDSText>

                    {item.logs_shared || item.screenshot_included ? (
                      <View
                        style={{
                          gap: 6,
                          padding: 10,
                          borderRadius: tokens.radius.sm,
                          backgroundColor: tokens.colors.surfaceSecondary,
                        }}
                      >
                        <SSDSText variant="Caption" color="textSecondary">
                          Attachments:{' '}
                          {item.logs_shared ? 'Logs (redacted)' : 'No logs'} •{' '}
                          {item.screenshot_included
                            ? 'Screenshot'
                            : 'No screenshot'}
                        </SSDSText>
                        {logsPreview ? (
                          <SSDSText variant="Caption" maxLines={4}>
                            {logsPreview}
                          </SSDSText>
                        ) : null}
                        {screenshotPath ? (
                          <Pressable
                            onPress={async () => {
                              try {
                                const url =
                                  await createFeedbackScreenshotSignedUrl(
                                    screenshotPath,
                                  );
                                await Linking.openURL(url);
                              } catch (err) {
                                setFeedbackError(
                                  err instanceof Error
                                    ? err.message
                                    : 'Unable to open screenshot.',
                                );
                              }
                            }}
                            style={{ alignSelf: 'flex-start', paddingVertical: 4 }}
                          >
                            <SSDSText variant="ButtonLabel" color="primary">
                              Open signed screenshot
                            </SSDSText>
                          </Pressable>
                        ) : null}
                      </View>
                    ) : null}

                    <SSDSRow wrap="wrap" gap={6}>
                      {FEEDBACK_STATUS_OPTIONS.map((st) => (
                        <SSDSButton
                          key={st}
                          size="small"
                          variant={draftStatus === st ? 'primary' : 'outline'}
                          onPress={() =>
                            setFeedbackStatusDrafts((prev) => ({
                              ...prev,
                              [item.id]: st,
                            }))
                          }
                        >
                          {st}
                        </SSDSButton>
                      ))}
                    </SSDSRow>

                    <SSDSTextInput
                      label="Internal / Admin Response"
                      value={draftResponse}
                      onChangeText={(txt) =>
                        setFeedbackResponseDrafts((prev) => ({
                          ...prev,
                          [item.id]: txt,
                        }))
                      }
                      placeholder="Add resolution notes or response..."
                      multiline
                    />

                    <SSDSButton
                      size="small"
                      disabled={feedbackSavingId === item.id}
                      loading={feedbackSavingId === item.id}
                      onPress={async () => {
                        setFeedbackSavingId(item.id);
                        setFeedbackError('');
                        try {
                          const updated = await updateFeedbackSubmissionAdmin(
                            item.id,
                            {
                              status: draftStatus,
                              adminResponse: draftResponse,
                              respondedBy: state.user?.id,
                            },
                          );
                          setFeedbackItems((prev) =>
                            prev.map((row) =>
                              row.id === updated.id ? updated : row,
                            ),
                          );
                        } catch (err) {
                          setFeedbackError(
                            err instanceof Error
                              ? err.message
                              : 'Unable to save feedback update.',
                          );
                        } finally {
                          setFeedbackSavingId(null);
                        }
                      }}
                    >
                      {feedbackSavingId === item.id ? 'Saving...' : 'Save update'}
                    </SSDSButton>
                  </SSDSStack>
                </SSDSSurface>
              );
            })}

          {!feedbackLoading && feedbackItems.length === 0 ? (
            <SSDSSurface variant="outlined" padding={16}>
              <SSDSEmptyState
                icon={MessageSquare}
                title="No feedback submissions yet"
                description="Submitted issues, ideas, and appreciations will appear here once learners submit them."
              />
            </SSDSSurface>
          ) : null}
        </SSDSStack>
      ) : null}

      <SSDSConfirmationPattern
        open={Boolean(deleteTarget)}
        title="Delete this content?"
        description={`${deleteTarget?.title ?? ''} will be removed from Supabase and the student-facing catalog.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={contentBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          void deleteContent();
        }}
      />
    </Shell>
  );
}
