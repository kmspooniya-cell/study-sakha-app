import { useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigation, AppRoute } from '../lib/navigation';
import {
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  FolderOpen,
  HelpCircle,
  Info,
  Layers,
  List,
  MessageSquare,
  Plus,
  Save,
  Sparkles,
  Star,
  Tag as TagIcon,
  Tags,
  Trash2,
  Type,
  X,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DetailHeader, useLayout, useSmartAndroidBack } from '../components/Shell';
import {
  SSDSBadge,
  SSDSButton,
  SSDSIcon,
  SSDSRow,
  SSDSSectionHeader,
  SSDSStack,
  SSDSSurface,
  SSDSText,
  SSDSTextInput,
  useSSDSTheme,
} from '../lib/ssds';
import { EXAMS, getResources, SUBJECTS } from '../lib/data';
import { useStore } from '../lib/store';
import { createStudentContentSignedUrl } from '../lib/supabase';
import { UserNote } from '../lib/types';

const FOLDERS = ['My Revision', 'Error Log', 'Quick Facts', 'Mains Answers', 'Formula Sheets'];

function buildSummary(body: string) {
  const sentences = body
    .replace(/\n+/g, ' ')
    .split(/\.\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30);
  const picked = sentences.slice(0, 4);
  if (!picked.length) {
    return 'Add a few lines of content and Sakha will compress them into recall-ready points.';
  }
  return picked.map((s, i) => `${i + 1}. ${s}`).join('\n');
}

function buildFlashcards(body: string) {
  const chunks = body
    .split(/\n+/)
    .map((c) => c.trim())
    .filter((c) => c.length > 25)
    .slice(0, 5);
  return chunks.map((c) => {
    const [head, ...rest] = c.split(/[—:–.]/);
    return {
      front: `${head.trim().slice(0, 80)}?`,
      back: (rest.join(' ').trim() || c).slice(0, 180),
    };
  });
}

function buildQuiz(body: string, subject: string) {
  const chunks = body
    .split(/\n+/)
    .map((c) => c.trim())
    .filter((c) => c.length > 25)
    .slice(0, 3);
  return chunks.map((c, i) => {
    const key = c.split(/[—:–.]/)[0].trim().slice(0, 70);
    const distractors = [
      `A different ${subject} concept`,
      `An unrelated ${subject} provision`,
      'None of the above',
    ];
    return {
      q: `Which statement correctly describes ${key}?`,
      options: [c.slice(0, 110), ...distractors],
      answer: 0,
      _i: i,
    };
  });
}

export default function NoteEditorScreen() {
  useSmartAndroidBack();
  const { tokens } = useSSDSTheme();
  const nav = useNavigation<AppNavigation>();
  const route = useRoute<AppRoute<'NoteEditor'>>();
  const { state, dispatch } = useStore();
  const resources = useMemo(() => getResources(state.managedContent), [state.managedContent]);
  const { isMobile, isDesktop } = useLayout();

  const params = route.params;
  const resource = params?.resourceId
    ? resources.find((r) => r.id === params.resourceId)
    : undefined;
  const existing = params?.noteId
    ? state.notes.find((n) => n.id === params.noteId)
    : undefined;
  const readOnly = !!resource;

  const [title, setTitle] = useState(existing?.title ?? resource?.title ?? '');
  const [folder, setFolder] = useState(existing?.folder ?? FOLDERS[0]);
  const [subject, setSubject] = useState(existing?.subject ?? resource?.subject ?? 'Polity');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(existing?.tags ?? resource?.tags ?? []);
  const [body, setBody] = useState(existing?.body ?? resource?.body.join('\n\n') ?? '');
  const [saved, setSaved] = useState(false);
  const [fileError, setFileError] = useState('');
  const [tool, setTool] = useState<'none' | 'summary' | 'cards' | 'quiz'>('none');
  const [quizPick, setQuizPick] = useState<Record<number, number>>({});

  const summary = useMemo(() => buildSummary(body), [body]);
  const cards = useMemo(() => buildFlashcards(body), [body]);
  const quiz = useMemo(() => buildQuiz(body, subject), [body, subject]);

  const starred = resource ? state.starred.includes(resource.id) : false;

  const openResourceFile = async () => {
    if (!resource) return;
    setFileError('');
    try {
      const url = resource.fileObjectPath
        ? await createStudentContentSignedUrl(resource.fileObjectPath)
        : resource.sourceUrl;
      if (!url) throw new Error('No file is attached to this resource.');
      await Linking.openURL(url);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : 'Unable to open this PDF.');
    }
  };

  const save = () => {
    const note: UserNote = {
      id: existing?.id ?? `un-${Date.now()}`,
      title: title.trim() || 'Untitled note',
      folder,
      tags,
      body,
      exam: state.user?.exam ?? 'upsc',
      subject,
      updatedAt: Date.now(),
      aiSummary: summary,
    };
    dispatch({ type: 'saveNote', note });
    dispatch({ type: 'study', minutes: 5 });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((x) => [...x, t]);
    setTagInput('');
  };

  const markProgress = (pct: number) => {
    if (resource) {
      dispatch({ type: 'progress', id: resource.id, percent: pct, title: resource.title });
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: tokens.colors.background }}
      edges={['top', 'bottom']}
    >
      <DetailHeader
        title={readOnly ? 'Reading note' : existing ? 'Edit note' : 'New note'}
        subtitle={readOnly ? `${resource!.subject} · ${resource!.author}` : `${folder} · ${subject}`}
        onBack={() => nav.goBack()}
        right={
          readOnly ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={starred ? 'Remove from starred' : 'Star note'}
              onPress={() => dispatch({ type: 'toggleStar', id: resource!.id })}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: starred
                  ? tokens.colors.warningBackground
                  : tokens.colors.background,
                borderWidth: 1,
                borderColor: tokens.colors.border,
              }}
            >
              <SSDSIcon
                icon={Star}
                size={18}
                color={starred ? 'warning' : 'textSecondary'}
              />
            </Pressable>
          ) : (
            <SSDSButton
              size="small"
              leadingIcon={saved ? Check : Save}
              onPress={save}
            >
              {saved ? 'Saved' : 'Save'}
            </SSDSButton>
          )
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            padding: isMobile ? 16 : 24,
            maxWidth: 1120,
            width: '100%',
            alignSelf: 'center',
            paddingBottom: 48,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              flexDirection: isDesktop ? 'row' : 'column',
              gap: 18,
              maxWidth: 1120,
              width: '100%',
              alignSelf: 'center',
            }}
          >
            <SSDSStack gap={16} style={{ flex: 1.5 }}>
              <SSDSSurface variant="outlined" padding={16}>
                <SSDSStack gap={14}>
                  {readOnly ? (
                    <SSDSStack gap={10}>
                      <SSDSRow wrap="wrap" gap={7}>
                        <SSDSBadge variant="primary" size="sm">
                          {EXAMS.find((e) => e.id === resource!.exam)?.short ?? ''}
                        </SSDSBadge>
                        <SSDSBadge variant="secondary" size="sm">
                          {resource!.subject}
                        </SSDSBadge>
                        <SSDSBadge variant="neutral" size="sm">
                          {`${resource!.minutes} min read`}
                        </SSDSBadge>
                        <SSDSBadge variant="warning" size="sm">
                          {`★ ${resource!.rating}`}
                        </SSDSBadge>
                      </SSDSRow>
                      <SSDSText
                        variant="ScreenTitle"
                        style={{ fontSize: isMobile ? 20 : 24, lineHeight: isMobile ? 27 : 31 }}
                      >
                        {resource!.title}
                      </SSDSText>
                      <SSDSText variant="BodySecondary">{resource!.summary}</SSDSText>
                    </SSDSStack>
                  ) : (
                    <>
                      <SSDSTextInput
                        label="Title"
                        value={title}
                        onChangeText={setTitle}
                        placeholder="E.g. Fundamental Rights quick recall"
                        leadingIcon={Type}
                      />
                      <View>
                        <SSDSText
                          variant="InputLabel"
                          color="textSecondary"
                          style={{ marginBottom: 9 }}
                        >
                          Folder
                        </SSDSText>
                        <SSDSRow wrap="wrap" gap={8}>
                          {FOLDERS.map((f) => (
                            <SSDSButton
                              key={f}
                              size="small"
                              variant={folder === f ? 'primary' : 'outline'}
                              onPress={() => setFolder(f)}
                            >
                              {f}
                            </SSDSButton>
                          ))}
                        </SSDSRow>
                      </View>
                      <View>
                        <SSDSText
                          variant="InputLabel"
                          color="textSecondary"
                          style={{ marginBottom: 9 }}
                        >
                          Subject
                        </SSDSText>
                        <SSDSRow wrap="wrap" gap={8}>
                          {SUBJECTS.slice(0, 8).map((s) => (
                            <SSDSButton
                              key={s.id}
                              size="small"
                              variant={subject === s.name ? 'primary' : 'outline'}
                              onPress={() => setSubject(s.name)}
                            >
                              {s.name}
                            </SSDSButton>
                          ))}
                        </SSDSRow>
                      </View>
                    </>
                  )}
                </SSDSStack>
              </SSDSSurface>

              <SSDSSurface variant="outlined" padding={16}>
                <SSDSSectionHeader
                  title={readOnly ? 'Content' : 'Your note'}
                  icon={FileText}
                  compact
                />
                {readOnly ? (
                  <SSDSStack gap={14}>
                    {resource!.body.map((p, i) => (
                      <SSDSText
                        key={i}
                        variant="BodySecondary"
                        style={{ fontSize: 14.5, lineHeight: 24 }}
                      >
                        {p}
                      </SSDSText>
                    ))}
                    <SSDSRow wrap="wrap" gap={10} style={{ marginTop: 4 }}>
                      <SSDSButton
                        variant="outline"
                        size="small"
                        onPress={() => markProgress(50)}
                      >
                        Mark 50% done
                      </SSDSButton>
                      <SSDSButton
                        size="small"
                        leadingIcon={CheckCircle2}
                        onPress={() => markProgress(100)}
                      >
                        Mark complete
                      </SSDSButton>
                      {resource!.fileObjectPath || resource!.sourceUrl ? (
                        <SSDSButton
                          size="small"
                          variant="secondary"
                          leadingIcon={ExternalLink}
                          onPress={openResourceFile}
                        >
                          Open hosted source
                        </SSDSButton>
                      ) : null}
                    </SSDSRow>
                    {fileError ? <SSDSText variant="ErrorText">{fileError}</SSDSText> : null}
                  </SSDSStack>
                ) : (
                  <SSDSTextInput
                    value={body}
                    onChangeText={setBody}
                    placeholder={
                      'Write your revision points here.\n\nUse one line per idea — Sakha turns each line into a flashcard.'
                    }
                    multiline
                    rows={10}
                    inputStyle={{ minHeight: 240 }}
                  />
                )}
              </SSDSSurface>

              {!readOnly ? (
                <SSDSSurface variant="outlined" padding={16}>
                  <SSDSSectionHeader title="Tags" icon={Tags} compact />
                  <SSDSStack gap={12}>
                    <SSDSRow align="flex-end" gap={10}>
                      <View style={{ flex: 1 }}>
                        <SSDSTextInput
                          value={tagInput}
                          onChangeText={setTagInput}
                          placeholder="Add a tag"
                          leadingIcon={TagIcon}
                          onSubmitEditing={addTag}
                          returnKeyType="done"
                        />
                      </View>
                      <SSDSButton leadingIcon={Plus} onPress={addTag}>
                        Add
                      </SSDSButton>
                    </SSDSRow>
                    <SSDSRow wrap="wrap" gap={8}>
                      {tags.map((t) => (
                        <Pressable
                          key={t}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove tag ${t}`}
                          onPress={() => setTags((x) => x.filter((y) => y !== t))}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingHorizontal: 11,
                            height: 32,
                            borderRadius: tokens.radius.pill,
                            backgroundColor: tokens.colors.primaryLight,
                          }}
                        >
                          <SSDSText variant="Caption" color="primary">
                            {t}
                          </SSDSText>
                          <SSDSIcon icon={X} size={13} color="primary" />
                        </Pressable>
                      ))}
                      {!tags.length ? (
                        <SSDSText variant="Caption" color="textTertiary">
                          No tags yet. Tags power search and Sakha AI retrieval.
                        </SSDSText>
                      ) : null}
                    </SSDSRow>
                  </SSDSStack>
                </SSDSSurface>
              ) : null}
            </SSDSStack>

            <SSDSStack gap={16} style={{ flex: 1 }}>
              <SSDSSurface variant="outlined" padding={16}>
                <SSDSSectionHeader title="Sakha AI tools" icon={Sparkles} compact />
                <SSDSStack gap={12}>
                  <SSDSRow wrap="wrap" gap={8}>
                    <SSDSButton
                      size="small"
                      leadingIcon={List}
                      variant={tool === 'summary' ? 'primary' : 'outline'}
                      onPress={() => setTool(tool === 'summary' ? 'none' : 'summary')}
                    >
                      Summarise
                    </SSDSButton>
                    <SSDSButton
                      size="small"
                      leadingIcon={Layers}
                      variant={tool === 'cards' ? 'primary' : 'outline'}
                      onPress={() => setTool(tool === 'cards' ? 'none' : 'cards')}
                    >
                      Flashcards
                    </SSDSButton>
                    <SSDSButton
                      size="small"
                      leadingIcon={HelpCircle}
                      variant={tool === 'quiz' ? 'primary' : 'outline'}
                      onPress={() => setTool(tool === 'quiz' ? 'none' : 'quiz')}
                    >
                      Generate MCQs
                    </SSDSButton>
                  </SSDSRow>

                  {tool === 'summary' ? (
                    <View
                      style={{
                        padding: 13,
                        borderRadius: tokens.radius.md,
                        backgroundColor: tokens.colors.surfaceSecondary,
                      }}
                    >
                      <SSDSText variant="BodySecondary" style={{ lineHeight: 21 }}>
                        {summary}
                      </SSDSText>
                    </View>
                  ) : null}

                  {tool === 'cards' ? (
                    <SSDSStack gap={10}>
                      {cards.length ? (
                        cards.map((c, i) => (
                          <View
                            key={i}
                            style={{
                              padding: 13,
                              borderRadius: tokens.radius.md,
                              borderWidth: 1,
                              borderColor: tokens.colors.border,
                              gap: 6,
                            }}
                          >
                            <SSDSText variant="CardTitle">{c.front}</SSDSText>
                            <SSDSText variant="BodySecondary">{c.back}</SSDSText>
                          </View>
                        ))
                      ) : (
                        <SSDSText variant="Caption" color="textTertiary">
                          Add more content to generate flashcards.
                        </SSDSText>
                      )}
                    </SSDSStack>
                  ) : null}

                  {tool === 'quiz' ? (
                    <SSDSStack gap={12}>
                      {quiz.length ? (
                        quiz.map((q, qi) => (
                          <SSDSStack key={qi} gap={8}>
                            <SSDSText variant="CardTitle">
                              {qi + 1}. {q.q}
                            </SSDSText>
                            {q.options.map((o, oi) => {
                              const picked = quizPick[qi];
                              const show = picked !== undefined;
                              const correct = oi === q.answer;
                              return (
                                <Pressable
                                  key={oi}
                                  onPress={() => setQuizPick((p) => ({ ...p, [qi]: oi }))}
                                  style={{
                                    padding: 10,
                                    borderRadius: tokens.radius.sm,
                                    borderWidth: 1,
                                    borderColor:
                                      show && correct
                                        ? tokens.colors.success
                                        : show && picked === oi
                                          ? tokens.colors.danger
                                          : tokens.colors.border,
                                    backgroundColor:
                                      show && correct
                                        ? tokens.colors.successBackground
                                        : tokens.colors.surface,
                                  }}
                                >
                                  <SSDSText variant="BodySecondary">
                                    {String.fromCharCode(65 + oi)}. {o}
                                  </SSDSText>
                                </Pressable>
                              );
                            })}
                          </SSDSStack>
                        ))
                      ) : (
                        <SSDSText variant="Caption" color="textTertiary">
                          Add more content to generate practice questions.
                        </SSDSText>
                      )}
                    </SSDSStack>
                  ) : null}

                  <SSDSButton
                    variant="secondary"
                    leadingIcon={MessageSquare}
                    fullWidth
                    onPress={() =>
                      nav.navigate('SakhaAI', {
                        prompt: `Summarise and quiz me on ${title || resource?.title || subject}`,
                      })
                    }
                  >
                    Ask Sakha about this note
                  </SSDSButton>
                </SSDSStack>
              </SSDSSurface>

              {readOnly ? (
                <SSDSSurface variant="outlined" padding={16}>
                  <SSDSSectionHeader title="Resource details" icon={Info} compact />
                  <SSDSStack gap={10}>
                    {[
                      ['Author', resource!.author],
                      ['Folder', resource!.folder],
                      ['Pages', `${resource!.pages}`],
                      ['Downloads', resource!.downloads.toLocaleString('en-IN')],
                      ['Updated', resource!.updated],
                    ].map(([k, v]) => (
                      <SSDSRow key={k} justify="space-between">
                        <SSDSText variant="BodySecondary">{k}</SSDSText>
                        <SSDSText variant="CardTitle">{v}</SSDSText>
                      </SSDSRow>
                    ))}
                    <SSDSButton
                      variant="outline"
                      leadingIcon={Layers}
                      fullWidth
                      style={{ marginTop: 6 }}
                      onPress={() => nav.navigate('PYQ', { subject: resource!.subject })}
                    >
                      Open related PYQs
                    </SSDSButton>
                  </SSDSStack>
                </SSDSSurface>
              ) : (
                <SSDSSurface variant="outlined" padding={16}>
                  <SSDSSectionHeader title="My notes" icon={FolderOpen} compact />
                  <SSDSStack gap={12}>
                    {state.notes.slice(0, 6).map((n) => (
                      <Pressable
                        key={n.id}
                        onPress={() => nav.replace('NoteEditor', { noteId: n.id })}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <SSDSIcon icon={FileText} size={17} color="primary" />
                        <View style={{ flex: 1 }}>
                          <SSDSText variant="CardTitle" truncate>
                            {n.title}
                          </SSDSText>
                          <SSDSText variant="Caption">
                            {n.folder} · {new Date(n.updatedAt).toLocaleDateString('en-IN')}
                          </SSDSText>
                        </View>
                        {existing?.id === n.id ? (
                          <SSDSBadge variant="secondary" size="sm">
                            Editing
                          </SSDSBadge>
                        ) : null}
                      </Pressable>
                    ))}
                    {existing ? (
                      <SSDSButton
                        variant="outline"
                        leadingIcon={Trash2}
                        fullWidth
                        onPress={() => {
                          dispatch({ type: 'deleteNote', id: existing.id });
                          nav.goBack();
                        }}
                      >
                        Delete this note
                      </SSDSButton>
                    ) : null}
                  </SSDSStack>
                </SSDSSurface>
              )}
            </SSDSStack>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
