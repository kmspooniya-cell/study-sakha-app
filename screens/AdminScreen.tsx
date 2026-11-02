import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { File } from 'expo-file-system';
import React, { useMemo, useState } from 'react';
import { Modal, Platform, View } from 'react-native';
import { BarChart, Donut, HBar, SvgLegend } from '../components/Charts';
import { Shell, useLayout } from '../components/Shell';
import { Avatar, Button, Card, Chip, EmptyState, Field, SectionHeader, Tag, Txt } from '../components/ui';
import { EXAMS, getResources, getTests, PYQS } from '../lib/data';
import { dayKey, useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';
import { ManagedContent, ManagedContentType, TestQuestion } from '../lib/types';

type Tab = 'overview' | 'learners' | 'manage' | 'content' | 'announce';
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
  type: 'note', title: '', description: '', exam: 'upsc', subject: '', topic: '',
  sourceUrl: '', published: false, body: '', questionsJson: '', durationMin: '10', points: '',
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
      ) return null;
      return {
        id: typeof question.id === 'string' && question.id ? question.id : `q-${index + 1}`,
        section: typeof question.section === 'string' && question.section ? question.section : subject || 'General',
        subject: typeof question.subject === 'string' && question.subject ? question.subject : subject || 'General',
        question: question.question,
        options: question.options,
        answer: question.answer as number,
        explanation: typeof question.explanation === 'string' ? question.explanation : '',
      };
    });
    return questions.every((question): question is TestQuestion => question !== null) ? questions : null;
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

export default function AdminScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const { state, dispatch, saveManagedContent, deleteManagedContent: removeManagedContent } = useStore();
  const { isMobile, isDesktop } = useLayout();
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [contentSearch, setContentSearch] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState<ManagedTypeFilter>('all');
  const [contentExamFilter, setContentExamFilter] = useState<'all' | ManagedContent['exam']>('all');
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

  const isAdmin = state.user?.role === 'admin';

  const learners = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.learners.filter((l) => !q || `${l.name} ${l.email} ${l.exam}`.toLowerCase().includes(q));
  }, [state.learners, search]);

  const kpis = useMemo(() => {
    const active = state.learners.filter((l) => l.status === 'active').length;
    const avg = Math.round(state.learners.reduce((a, b) => a + b.avgScore, 0) / state.learners.length);
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
    [state.learners]
  );

  const managedContent = useMemo(() => {
    const query = contentSearch.trim().toLowerCase();
    return state.managedContent.filter((item) =>
      (contentTypeFilter === 'all' || item.type === contentTypeFilter) &&
      (contentExamFilter === 'all' || item.exam === contentExamFilter) &&
      (!query || `${item.title} ${item.description} ${item.subject} ${item.topic}`.toLowerCase().includes(query))
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
      questionsJson: item.questions ? JSON.stringify(item.questions, null, 2) : '',
      durationMin: `${item.durationMin ?? 10}`,
      points: item.points?.join('\n') ?? '',
      eventDate: item.eventDate ?? new Date(item.updatedAt).toISOString().slice(0, 10),
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
      if (Array.from(signature, (byte) => String.fromCharCode(byte)).join('') !== '%PDF-') {
        setContentError('The selected file does not have a valid PDF signature.');
        return;
      }
      setSelectedPdf(asset);
      setRemovePdf(false);
    } catch (error) {
      setContentError(error instanceof Error ? error.message : 'Unable to select this PDF.');
    }
  };

  const saveContent = async () => {
    if (contentBusy) return;
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
      setContentError('Choose either a PDF upload or an external source URL, not both.');
      return;
    }
    if (sourceUrl) {
      try {
        const parsed = new URL(sourceUrl);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error();
      } catch {
        setContentError('Use a valid HTTP(S) URL to a file hosted outside this device.');
        return;
      }
    }

    let questions: TestQuestion[] | undefined;
    if (draft.type === 'test') {
      questions = parseQuestions(draft.questionsJson, subject) ?? undefined;
      const durationMin = Number(draft.durationMin);
      if (!questions) {
        setContentError('Enter a valid JSON array of questions with at least two options and a valid answer index.');
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
        : state.managedContent.find((item) => item.id === editingContentId)?.fileObjectPath,
      published: draft.published,
      updatedAt: Date.now(),
      body: draft.type === 'current-affairs' || draft.type === 'test' ? undefined : draft.body.trim(),
      questions,
      durationMin: draft.type === 'test' ? Number(draft.durationMin) : undefined,
      points: draft.type === 'current-affairs'
        ? draft.points.split('\n').map((point) => point.trim()).filter(Boolean)
        : undefined,
      eventDate: draft.type === 'current-affairs' ? draft.eventDate : undefined,
    };
    setContentBusy(true);
    setContentMessage('');
    try {
      const selectedFile = selectedPdf
        ? Platform.OS === 'web' ? selectedPdf.file : new File(selectedPdf.uri)
        : undefined;
      if (selectedPdf && !selectedFile) throw new Error('Unable to access the selected PDF.');
      const result = await saveManagedContent(
        item,
        selectedPdf && selectedFile
          ? {
              blob: selectedFile,
              name: selectedPdf.name,
              size: selectedPdf.size ?? selectedFile.size,
            }
          : undefined
      );
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
      setContentError(error instanceof Error ? error.message : 'Unable to save managed content.');
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
      const result = await saveManagedContent({ ...item, published: !item.published, updatedAt: Date.now() });
      if (!result.ok) setContentError(result.error);
      else setContentMessage(result.warning ?? 'Publication status updated.');
    } catch (error) {
      setContentError(error instanceof Error ? error.message : 'Unable to update publication status.');
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
      setContentError(error instanceof Error ? error.message : 'Unable to delete managed content.');
    } finally {
      setContentBusy(false);
    }
  };

  if (!isAdmin) {
    return (
      <Shell active="Admin" title="Admin Portal" subtitle="Restricted area">
        <Card>
          <EmptyState
            icon="lock-closed-outline"
            title="Administrator access required"
            body="Sign in with an account that has been granted administrator access by a trusted server-side operator."
            action="Go to profile"
            onAction={() => nav.navigate('Profile')}
          />
        </Card>
      </Shell>
    );
  }

  const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'overview', label: 'Overview', icon: 'speedometer-outline' },
    { key: 'learners', label: 'Learners', icon: 'people-outline' },
    { key: 'manage', label: 'Manage Content', icon: 'create-outline' },
    { key: 'content', label: 'Approvals', icon: 'checkmark-done-outline' },
    { key: 'announce', label: 'Announcements', icon: 'megaphone-outline' },
  ];

  return (
    <Shell active="Admin" title="Admin Portal" subtitle="Platform health, learner management and content governance">
      {state.managedContentError ? (
        <Card style={{ marginBottom: 14 }}>
          <Txt size={13} color={colors.danger}>{state.managedContentError}</Txt>
        </Card>
      ) : null}
      {contentError || contentMessage ? (
        <Card style={{ marginBottom: 14 }}>
          <Txt size={13} color={contentError ? colors.danger : colors.success}>{contentError || contentMessage}</Txt>
        </Card>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {TABS.map((t) => (
          <Chip key={t.key} label={t.label} icon={t.icon} active={tab === t.key} onPress={() => setTab(t.key)} />
        ))}
      </View>

      {tab === 'overview' ? (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[
              { l: 'Active learners', v: `${kpis.active}`, s: `${state.learners.length} total`, i: 'people-outline' as const, c: colors.blue },
              { l: 'Avg. mock score', v: `${kpis.avg}%`, s: 'across all exams', i: 'stats-chart-outline' as const, c: colors.teal },
              { l: 'Tests attempted', v: kpis.tests.toLocaleString('en-IN'), s: 'lifetime', i: 'timer-outline' as const, c: colors.violet },
              { l: 'Pending approvals', v: `${kpis.pending}`, s: 'awaiting review', i: 'document-attach-outline' as const, c: colors.warning },
            ].map((k) => (
              <Card key={k.l} style={{ flexGrow: 1, flexBasis: isMobile ? '45%' : 180, gap: 9 }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: `${k.c}1A`, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={k.i} size={18} color={k.c} />
                </View>
                <Txt size={24} weight="800" display>
                  {k.v}
                </Txt>
                <Txt size={12.5} weight="700" color={colors.textMuted}>
                  {k.l}
                </Txt>
                <Txt size={11.5} color={colors.textFaint}>
                  {k.s}
                </Txt>
              </Card>
            ))}
          </View>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
            <Card style={{ flex: 1.3 }}>
              <SectionHeader title="Weekly platform activity" icon="bar-chart-outline" action="minutes studied" />
              <BarChart data={weekly} color={colors.blue} />
            </Card>
            <Card style={{ flex: 1 }}>
              <SectionHeader title="Learners by exam" icon="pie-chart-outline" />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                <Donut
                  segments={examSplit}
                  center={
                    <>
                      <Txt size={20} weight="800" display>
                        {state.learners.length}
                      </Txt>
                      <Txt size={11} color={colors.textMuted}>
                        learners
                      </Txt>
                    </>
                  }
                />
                <View style={{ flex: 1 }}>
                  <SvgLegend items={examSplit.map((e) => ({ label: e.label, color: e.color, value: `${e.value}` }))} />
                </View>
              </View>
            </Card>
          </View>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
            <Card style={{ flex: 1 }}>
              <SectionHeader title="Catalogue coverage" icon="layers-outline" />
              <HBar label="Library resources" value={getResources(state.managedContent).length} total={20} color={colors.blue} />
              <HBar label="PYQ bank" value={PYQS.length} total={30} color={colors.teal} />
              <HBar label="Mock tests" value={getTests(state.managedContent).length} total={10} color={colors.violet} />
              <HBar label="Approved submissions" value={state.queue.filter((q) => q.status === 'approved').length} total={state.queue.length} color={colors.success} />
            </Card>
            <Card style={{ flex: 1 }}>
              <SectionHeader title="Top performers" icon="trophy-outline" />
              <View style={{ gap: 12 }}>
                {[...state.learners]
                  .sort((a, b) => b.avgScore - a.avgScore)
                  .slice(0, 5)
                  .map((l, i) => (
                    <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                      <Txt size={13} weight="800" color={colors.textFaint} style={{ width: 18 }}>
                        {i + 1}
                      </Txt>
                      <Avatar name={l.name} size={32} />
                      <View style={{ flex: 1 }}>
                        <Txt size={13} weight="700" numberOfLines={1}>
                          {l.name}
                        </Txt>
                        <Txt size={11.5} color={colors.textFaint}>
                          {l.exam.toUpperCase()} · {l.tests} tests
                        </Txt>
                      </View>
                      <Tag label={`${l.avgScore}%`} color={colors.success} />
                    </View>
                  ))}
              </View>
            </Card>
          </View>
        </View>
      ) : null}

      {tab === 'learners' ? (
        <View style={{ gap: 14 }}>
          <Field value={search} onChangeText={setSearch} placeholder="Search learners by name, email or exam…" icon="search-outline" returnKeyType="search" />
          {learners.map((l) => (
            <Card key={l.id}>
              <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 14, alignItems: isMobile ? 'flex-start' : 'center' }}>
                <Avatar name={l.name} size={44} />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Txt size={14.5} weight="800">
                      {l.name}
                    </Txt>
                    <Tag label={l.plan} color={l.plan === 'Elite' ? colors.violet : l.plan === 'Pro' ? colors.blue : colors.textMuted} />
                    <Tag label={l.status === 'active' ? 'Active' : 'Suspended'} color={l.status === 'active' ? colors.success : colors.danger} />
                  </View>
                  <Txt size={12} color={colors.textMuted}>
                    {l.email} · joined {l.joined}
                  </Txt>
                  <View style={{ flexDirection: 'row', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                    {[
                      ['Exam', l.exam.toUpperCase()],
                      ['Streak', `${l.streak}d`],
                      ['Tests', `${l.tests}`],
                      ['Avg', `${l.avgScore}%`],
                    ].map(([k, v]) => (
                      <View key={k}>
                        <Txt size={11} color={colors.textFaint}>
                          {k}
                        </Txt>
                        <Txt size={13} weight="800">
                          {v}
                        </Txt>
                      </View>
                    ))}
                  </View>
                </View>
                <Button
                  label={l.status === 'active' ? 'Suspend' : 'Activate'}
                  icon={l.status === 'active' ? 'pause-circle-outline' : 'play-circle-outline'}
                  size="sm"
                  variant={l.status === 'active' ? 'outline' : 'primary'}
                  onPress={() => dispatch({ type: 'learnerStatus', id: l.id, status: l.status === 'active' ? 'suspended' : 'active' })}
                />
              </View>
            </Card>
          ))}
          {!learners.length ? <EmptyState icon="people-outline" title="No learners found" body="Try a different name, email or exam keyword." /> : null}
        </View>
      ) : null}

      {tab === 'manage' ? (
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', alignItems: 'flex-start', gap: 16 }}>
          <Card style={{ flex: 1.1, width: isDesktop ? undefined : '100%', gap: 14 }}>
            <SectionHeader title={editingContentId ? 'Edit content' : 'Add educational content'} icon="document-attach-outline" />
            <Field label="Title" value={draft.title} onChangeText={(value) => updateDraft('title', value)} placeholder="Content title" icon="text-outline" />
            <Field label="Description" value={draft.description} onChangeText={(value) => updateDraft('description', value)} placeholder="What will students learn?" multiline minHeight={92} />

            <View style={{ gap: 8 }}>
              <Txt size={12.5} weight="700" color={colors.textMuted}>Content type</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CONTENT_TYPES.map((item) => (
                  <Chip key={item.id} label={item.label} active={draft.type === item.id} onPress={() => { updateDraft('type', item.id); setContentError(''); }} />
                ))}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Txt size={12.5} weight="700" color={colors.textMuted}>Exam</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {EXAMS.map((item) => (
                  <Chip key={item.id} label={item.short} tone={item.color} active={draft.exam === item.id} onPress={() => updateDraft('exam', item.id)} />
                ))}
              </View>
            </View>

            <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 10 }}>
              <Field label="Subject" value={draft.subject} onChangeText={(value) => updateDraft('subject', value)} placeholder="e.g. Polity" style={{ flex: 1 }} />
              <Field label="Topic" value={draft.topic} onChangeText={(value) => updateDraft('topic', value)} placeholder="e.g. Fundamental Rights" style={{ flex: 1 }} />
            </View>

            <Field
              label="Hosted file or source URL (optional)"
              value={draft.sourceUrl}
              onChangeText={(value) => updateDraft('sourceUrl', value)}
              placeholder="https://…"
              keyboardType="default"
              autoCapitalize="none"
              icon="link-outline"
              helper="Use a durable HTTP(S) source, or select a PDF below for a private upload to Student-content."
            />

            {draft.type === 'book' ? (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <Button
                    label={selectedPdf ? 'Choose a different PDF' : 'Upload PDF'}
                    icon="cloud-upload-outline"
                    variant="outline"
                    loading={contentBusy}
                    onPress={pickPdf}
                  />
                  {selectedPdf ? (
                    <Txt size={12} color={colors.textMuted}>{selectedPdf.name}</Txt>
                  ) : editingContentId && !removePdf && state.managedContent.find((item) => item.id === editingContentId)?.fileObjectPath ? (
                    <Txt size={12} color={colors.success}>A private PDF is already uploaded.</Txt>
                  ) : null}
                  {editingContentId && state.managedContent.find((item) => item.id === editingContentId)?.fileObjectPath ? (
                    <Button
                      label={removePdf ? 'Keep uploaded PDF' : 'Remove uploaded PDF'}
                      size="sm"
                      variant="ghost"
                      onPress={() => setRemovePdf((value) => !value)}
                    />
                  ) : null}
                </View>
                {removePdf ? <Txt size={11.5} color={colors.warning}>The existing PDF will be removed when you save.</Txt> : null}
                <Txt size={11.5} color={colors.textFaint}>PDF only, maximum 50 MB. Student access is granted only after publication.</Txt>
              </View>
            ) : null}

            {draft.type === 'note' || draft.type === 'book' || draft.type === 'pyq-set' ? (
              <Field
                label={draft.type === 'book' ? 'Reading content (optional when a hosted PDF is linked)' : 'Content'}
                value={draft.body}
                onChangeText={(value) => updateDraft('body', value)}
                placeholder="Paste the learning content here…"
                multiline
                minHeight={170}
              />
            ) : null}

            {draft.type === 'test' ? (
              <View style={{ gap: 12 }}>
                <Field label="Duration (minutes)" value={draft.durationMin} onChangeText={(value) => updateDraft('durationMin', value)} placeholder="10" keyboardType="numeric" icon="time-outline" />
                <Field
                  label="Questions (JSON)"
                  value={draft.questionsJson}
                  onChangeText={(value) => updateDraft('questionsJson', value)}
                  placeholder={'[{"section":"Polity","subject":"Polity","question":"Question text","options":["Option A","Option B"],"answer":0,"explanation":"Why this is correct"}]'}
                  multiline
                  minHeight={190}
                  helper="Each question needs a prompt, at least two options, and a zero-based answer index."
                />
              </View>
            ) : null}

            {draft.type === 'current-affairs' ? (
              <View style={{ gap: 12 }}>
                <Field label="Publication date" value={draft.eventDate} onChangeText={(value) => updateDraft('eventDate', value)} placeholder="YYYY-MM-DD" icon="calendar-outline" />
                <Field label="Key points (one per line)" value={draft.points} onChangeText={(value) => updateDraft('points', value)} placeholder="Add exam-relevant facts, one per line" multiline minHeight={140} />
              </View>
            ) : null}

            <View style={{ gap: 8 }}>
              <Txt size={12.5} weight="700" color={colors.textMuted}>Publication status</Txt>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Chip label="Draft" active={!draft.published} onPress={() => updateDraft('published', false)} />
                <Chip label="Published" icon="globe-outline" active={draft.published} onPress={() => updateDraft('published', true)} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
              <Button label={editingContentId ? 'Save changes' : 'Save content'} icon="save-outline" loading={contentBusy} onPress={saveContent} />
              {editingContentId ? <Button label="Cancel edit" variant="outline" onPress={cancelEdit} /> : null}
            </View>
          </Card>

          <View style={{ flex: 1, width: isDesktop ? undefined : '100%', gap: 12 }}>
            <Card style={{ gap: 12 }}>
              <SectionHeader title="Managed content" icon="library-outline" action={`${state.managedContent.length} total`} />
              <Field value={contentSearch} onChangeText={setContentSearch} placeholder="Search title, subject or topic" icon="search-outline" returnKeyType="search" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                <Chip label="All types" active={contentTypeFilter === 'all'} onPress={() => setContentTypeFilter('all')} />
                {CONTENT_TYPES.map((item) => <Chip key={item.id} label={item.label} active={contentTypeFilter === item.id} onPress={() => setContentTypeFilter(item.id)} />)}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                <Chip label="All exams" active={contentExamFilter === 'all'} onPress={() => setContentExamFilter('all')} />
                {EXAMS.map((item) => <Chip key={item.id} label={item.short} tone={item.color} active={contentExamFilter === item.id} onPress={() => setContentExamFilter(item.id)} />)}
              </View>
            </Card>

            {managedContent.map((item) => (
              <Card key={item.id} style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
                  <Tag label={CONTENT_TYPES.find((type) => type.id === item.type)?.label ?? item.type} color={colors.blue} />
                  <Tag label={EXAMS.find((exam) => exam.id === item.exam)?.short ?? item.exam} color={colors.teal} />
                  <Tag label={item.published ? 'Published' : 'Draft'} color={item.published ? colors.success : colors.textMuted} />
                </View>
                <Txt size={14} weight="800">{item.title}</Txt>
                <Txt size={12} color={colors.textMuted}>{item.subject} · {item.topic}</Txt>
                <Txt size={12.5} color={colors.textMuted} numberOfLines={3}>{item.description}</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Button label="Edit" icon="create-outline" size="sm" variant="outline" onPress={() => editContent(item)} />
                  <Button label={item.published ? 'Unpublish' : 'Publish'} icon={item.published ? 'eye-off-outline' : 'globe-outline'} size="sm" variant="soft" loading={contentBusy} onPress={() => void togglePublication(item)} />
                  <Button label="Delete" icon="trash-outline" size="sm" variant="danger" onPress={() => setDeleteTarget(item)} />
                </View>
              </Card>
            ))}
            {!managedContent.length && !state.managedContentError ? <EmptyState icon="document-outline" title="No managed content found" body="Add content or adjust the search and filters." /> : null}
          </View>
        </View>
      ) : null}

      {tab === 'content' ? (
        <View style={{ gap: 14 }}>
          <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Ionicons name="information-circle-outline" size={20} color={colors.blue} />
            <Txt size={13} color={colors.textMuted} style={{ flex: 1 }}>
              {state.queue.filter((q) => q.status === 'pending').length} submission(s) awaiting review. Approved content is published to the learner library immediately.
            </Txt>
          </Card>
          {state.queue.map((c) => (
            <Card key={c.id} style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Tag label={c.type} color={colors.blue} />
                <Tag label={EXAMS.find((e) => e.id === c.exam)?.short ?? ''} color={colors.teal} />
                <Tag
                  label={c.status === 'pending' ? 'Pending' : c.status === 'approved' ? 'Approved' : 'Rejected'}
                  color={c.status === 'pending' ? colors.warning : c.status === 'approved' ? colors.success : colors.danger}
                />
                <Txt size={11.5} color={colors.textFaint} style={{ marginLeft: 'auto' }}>
                  submitted {c.submitted}
                </Txt>
              </View>
              <Txt size={15} weight="800" display>
                {c.title}
              </Txt>
              <Txt size={12.5} color={colors.textMuted}>
                by {c.author}
              </Txt>
              {c.status === 'pending' ? (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button label="Approve" icon="checkmark" size="sm" onPress={() => dispatch({ type: 'reviewContent', id: c.id, status: 'approved' })} />
                  <Button label="Reject" icon="close" size="sm" variant="outline" onPress={() => dispatch({ type: 'reviewContent', id: c.id, status: 'rejected' })} />
                </View>
              ) : (
                <Button label="Move back to pending" size="sm" variant="ghost" onPress={() => dispatch({ type: 'reviewContent', id: c.id, status: 'pending' as any })} />
              )}
            </Card>
          ))}
        </View>
      ) : null}

      {tab === 'announce' ? (
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
          <Card style={{ flex: 1, gap: 14 }}>
            <SectionHeader title="Publish announcement" icon="megaphone-outline" />
            <Field label="Title" value={title} onChangeText={setTitle} placeholder="E.g. Prelims Countdown Series begins Monday" icon="text-outline" />
            <Field label="Message" value={body} onChangeText={setBody} placeholder="What should learners know?" multiline minHeight={130} />
            <View>
              <Txt size={12.5} weight="700" color={colors.textMuted} style={{ marginBottom: 9 }}>
                Audience
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['All learners', 'UPSC aspirants', 'SSC aspirants', 'Banking aspirants', 'Elite plan'].map((a) => (
                  <Chip key={a} label={a} active={audience === a} onPress={() => setAudience(a)} />
                ))}
              </View>
            </View>
            <Button
              label={published ? 'Published' : 'Publish announcement'}
              icon={published ? 'checkmark-done' : 'send-outline'}
              full
              onPress={() => {
                if (!title.trim() || !body.trim()) return;
                const item = { id: `a-${Date.now()}`, title: title.trim(), body: body.trim(), audience, at: Date.now() };
                dispatch({ type: 'announce', item });
                dispatch({
                  type: 'notify',
                  notif: { id: `n-${Date.now()}`, title: item.title, body: item.body, at: Date.now(), kind: 'announcement', read: false },
                });
                setTitle('');
                setBody('');
                setPublished(true);
                setTimeout(() => setPublished(false), 2200);
              }}
            />
          </Card>

          <Card style={{ flex: 1 }}>
            <SectionHeader title="Published" icon="time-outline" action="Inbox" onAction={() => nav.navigate('Notifications')} />
            <View style={{ gap: 14 }}>
              {state.announcements.map((a) => (
                <View key={a.id} style={{ padding: 13, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, gap: 6 }}>
                  <Txt size={14} weight="800">
                    {a.title}
                  </Txt>
                  <Txt size={12.5} color={colors.textMuted}>
                    {a.body}
                  </Txt>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Tag label={a.audience} color={colors.teal} />
                    <Txt size={11.5} color={colors.textFaint}>
                      {new Date(a.at).toLocaleString('en-IN')}
                    </Txt>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </View>
      ) : null}

      <Modal visible={Boolean(deleteTarget)} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.48)' }}>
          <Card style={{ width: '100%', maxWidth: 420, alignSelf: 'center', gap: 14 }}>
            <Txt size={17} weight="800" display>Delete this content?</Txt>
            <Txt size={13} color={colors.textMuted}>
              {deleteTarget?.title} will be removed from Supabase and the student-facing catalog.
            </Txt>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 9 }}>
              <Button label="Cancel" variant="outline" onPress={() => setDeleteTarget(null)} />
              <Button label="Delete" icon="trash-outline" variant="danger" onPress={deleteContent} />
            </View>
          </Card>
        </View>
      </Modal>
    </Shell>
  );
}
