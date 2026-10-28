import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DetailHeader, useLayout } from '../components/Shell';
import { Button, Card, Chip, Field, SectionHeader, Tag, Txt } from '../components/ui';
import { EXAMS, RESOURCES, SUBJECTS } from '../lib/data';
import { useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';
import { UserNote } from '../lib/types';

const FOLDERS = ['My Revision', 'Error Log', 'Quick Facts', 'Mains Answers', 'Formula Sheets'];

function buildSummary(body: string) {
  const sentences = body
    .replace(/\n+/g, ' ')
    .split(/\.\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30);
  const picked = sentences.slice(0, 4);
  if (!picked.length) return 'Add a few lines of content and Sakha will compress them into recall-ready points.';
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
    const distractors = [`A different ${subject} concept`, `An unrelated ${subject} provision`, 'None of the above'];
    return {
      q: `Which statement correctly describes ${key}?`,
      options: [c.slice(0, 110), ...distractors],
      answer: 0,
      _i: i,
    };
  });
}

export default function NoteEditorScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { state, dispatch } = useStore();
  const { isMobile, isDesktop } = useLayout();

  const resource = route.params?.resourceId ? RESOURCES.find((r) => r.id === route.params.resourceId) : undefined;
  const existing = route.params?.noteId ? state.notes.find((n) => n.id === route.params.noteId) : undefined;
  const readOnly = !!resource;

  const [title, setTitle] = useState(existing?.title ?? resource?.title ?? '');
  const [folder, setFolder] = useState(existing?.folder ?? FOLDERS[0]);
  const [subject, setSubject] = useState(existing?.subject ?? resource?.subject ?? 'Polity');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(existing?.tags ?? resource?.tags ?? []);
  const [body, setBody] = useState(existing?.body ?? resource?.body.join('\n\n') ?? '');
  const [saved, setSaved] = useState(false);
  const [tool, setTool] = useState<'none' | 'summary' | 'cards' | 'quiz'>('none');
  const [quizPick, setQuizPick] = useState<Record<number, number>>({});

  const summary = useMemo(() => buildSummary(body), [body]);
  const cards = useMemo(() => buildFlashcards(body), [body]);
  const quiz = useMemo(() => buildQuiz(body, subject), [body, subject]);

  const starred = resource ? state.starred.includes(resource.id) : false;

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
    if (resource) dispatch({ type: 'progress', id: resource.id, percent: pct, title: resource.title });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <DetailHeader
        title={readOnly ? 'Reading note' : existing ? 'Edit note' : 'New note'}
        subtitle={readOnly ? `${resource!.subject} · ${resource!.author}` : `${folder} · ${subject}`}
        onBack={() => nav.goBack()}
        right={
          readOnly ? (
            <Pressable
              onPress={() => dispatch({ type: 'toggleStar', id: resource!.id })}
              style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: starred ? `${colors.warning}1F` : colors.bg, borderWidth: 1, borderColor: colors.border }}
            >
              <Ionicons name={starred ? 'star' : 'star-outline'} size={18} color={starred ? colors.warning : colors.textMuted} />
            </Pressable>
          ) : (
            <Button label={saved ? 'Saved' : 'Save'} icon={saved ? 'checkmark' : 'save-outline'} size="sm" onPress={save} />
          )
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: isMobile ? 16 : 24, maxWidth: 1080, width: '100%', alignSelf: 'center', paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
            <View style={{ flex: 1.5, gap: 16 }}>
              <Card style={{ gap: 14 }}>
                {readOnly ? (
                  <View style={{ gap: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap' }}>
                      <Tag label={EXAMS.find((e) => e.id === resource!.exam)?.short ?? ''} color={colors.blue} />
                      <Tag label={resource!.subject} color={colors.teal} />
                      <Tag label={`${resource!.minutes} min read`} color={colors.textMuted} />
                      <Tag label={`★ ${resource!.rating}`} color={colors.warning} />
                    </View>
                    <Txt size={isMobile ? 20 : 24} weight="800" display style={{ letterSpacing: -0.6 }}>
                      {resource!.title}
                    </Txt>
                    <Txt size={13.5} color={colors.textMuted}>
                      {resource!.summary}
                    </Txt>
                  </View>
                ) : (
                  <>
                    <Field label="Title" value={title} onChangeText={setTitle} placeholder="E.g. Fundamental Rights quick recall" icon="text-outline" />
                    <View>
                      <Txt size={12.5} weight="700" color={colors.textMuted} style={{ marginBottom: 9 }}>
                        Folder
                      </Txt>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {FOLDERS.map((f) => (
                          <Chip key={f} label={f} active={folder === f} onPress={() => setFolder(f)} />
                        ))}
                      </View>
                    </View>
                    <View>
                      <Txt size={12.5} weight="700" color={colors.textMuted} style={{ marginBottom: 9 }}>
                        Subject
                      </Txt>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {SUBJECTS.slice(0, 8).map((s) => (
                          <Chip key={s.id} label={s.name} tone={s.color} active={subject === s.name} onPress={() => setSubject(s.name)} />
                        ))}
                      </View>
                    </View>
                  </>
                )}
              </Card>

              <Card style={{ gap: 12 }}>
                <SectionHeader title={readOnly ? 'Content' : 'Your note'} icon="document-text-outline" />
                {readOnly ? (
                  <View style={{ gap: 14 }}>
                    {resource!.body.map((p, i) => (
                      <Txt key={i} size={14.5} color={colors.textMuted} style={{ lineHeight: 24 }}>
                        {p}
                      </Txt>
                    ))}
                    <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                      <Button label="Mark 50% done" variant="outline" size="sm" onPress={() => markProgress(50)} />
                      <Button label="Mark complete" icon="checkmark-circle-outline" size="sm" onPress={() => markProgress(100)} />
                    </View>
                  </View>
                ) : (
                  <Field value={body} onChangeText={setBody} placeholder={'Write your revision points here.\n\nUse one line per idea — Sakha turns each line into a flashcard.'} multiline minHeight={260} />
                )}
              </Card>

              {!readOnly ? (
                <Card style={{ gap: 12 }}>
                  <SectionHeader title="Tags" icon="pricetags-outline" />
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
                    <Field value={tagInput} onChangeText={setTagInput} placeholder="Add a tag" icon="pricetag-outline" style={{ flex: 1 }} onSubmitEditing={addTag} returnKeyType="done" />
                    <Button label="Add" icon="add" onPress={addTag} />
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {tags.map((t) => (
                      <Pressable
                        key={t}
                        onPress={() => setTags((x) => x.filter((y) => y !== t))}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, height: 32, borderRadius: radii.pill, backgroundColor: colors.tint }}
                      >
                        <Txt size={12} weight="700" color={colors.blue}>
                          {t}
                        </Txt>
                        <Ionicons name="close" size={13} color={colors.blue} />
                      </Pressable>
                    ))}
                    {!tags.length ? (
                      <Txt size={12.5} color={colors.textFaint}>
                        No tags yet. Tags power search and Sakha AI retrieval.
                      </Txt>
                    ) : null}
                  </View>
                </Card>
              ) : null}
            </View>

            <View style={{ flex: 1, gap: 16 }}>
              <Card style={{ gap: 12 }}>
                <SectionHeader title="Sakha AI tools" icon="sparkles-outline" />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Chip label="Summarise" icon="list-outline" active={tool === 'summary'} onPress={() => setTool(tool === 'summary' ? 'none' : 'summary')} />
                  <Chip label="Flashcards" icon="albums-outline" active={tool === 'cards'} onPress={() => setTool(tool === 'cards' ? 'none' : 'cards')} />
                  <Chip label="Generate MCQs" icon="help-circle-outline" active={tool === 'quiz'} onPress={() => setTool(tool === 'quiz' ? 'none' : 'quiz')} />
                </View>

                {tool === 'summary' ? (
                  <View style={{ padding: 13, borderRadius: radii.md, backgroundColor: colors.surfaceAlt }}>
                    <Txt size={13} color={colors.textMuted} style={{ lineHeight: 21 }}>
                      {summary}
                    </Txt>
                  </View>
                ) : null}

                {tool === 'cards' ? (
                  <View style={{ gap: 10 }}>
                    {cards.length ? (
                      cards.map((c, i) => (
                        <View key={i} style={{ padding: 13, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, gap: 6 }}>
                          <Txt size={13} weight="800">
                            {c.front}
                          </Txt>
                          <Txt size={12.5} color={colors.textMuted}>
                            {c.back}
                          </Txt>
                        </View>
                      ))
                    ) : (
                      <Txt size={12.5} color={colors.textFaint}>
                        Add more content to generate flashcards.
                      </Txt>
                    )}
                  </View>
                ) : null}

                {tool === 'quiz' ? (
                  <View style={{ gap: 12 }}>
                    {quiz.length ? (
                      quiz.map((q, qi) => (
                        <View key={qi} style={{ gap: 8 }}>
                          <Txt size={13} weight="700">
                            {qi + 1}. {q.q}
                          </Txt>
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
                                  borderRadius: radii.sm,
                                  borderWidth: 1,
                                  borderColor: show && correct ? colors.success : show && picked === oi ? colors.danger : colors.border,
                                  backgroundColor: show && correct ? `${colors.success}12` : colors.surface,
                                }}
                              >
                                <Txt size={12.5} color={colors.textMuted}>
                                  {String.fromCharCode(65 + oi)}. {o}
                                </Txt>
                              </Pressable>
                            );
                          })}
                        </View>
                      ))
                    ) : (
                      <Txt size={12.5} color={colors.textFaint}>
                        Add more content to generate practice questions.
                      </Txt>
                    )}
                  </View>
                ) : null}

                <Button
                  label="Ask Sakha about this note"
                  icon="chatbubbles-outline"
                  variant="soft"
                  full
                  onPress={() => nav.navigate('SakhaAI', { prompt: `Summarise and quiz me on ${title || resource?.title || subject}` })}
                />
              </Card>

              {readOnly ? (
                <Card style={{ gap: 10 }}>
                  <SectionHeader title="Resource details" icon="information-circle-outline" />
                  {[
                    ['Author', resource!.author],
                    ['Folder', resource!.folder],
                    ['Pages', `${resource!.pages}`],
                    ['Downloads', resource!.downloads.toLocaleString('en-IN')],
                    ['Updated', resource!.updated],
                  ].map(([k, v]) => (
                    <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Txt size={13} color={colors.textMuted}>
                        {k}
                      </Txt>
                      <Txt size={13} weight="700">
                        {v}
                      </Txt>
                    </View>
                  ))}
                  <Button label="Open related PYQs" icon="albums-outline" variant="outline" full style={{ marginTop: 6 }} onPress={() => nav.navigate('PYQ', { subject: resource!.subject })} />
                </Card>
              ) : (
                <Card style={{ gap: 12 }}>
                  <SectionHeader title="My notes" icon="folder-open-outline" />
                  {state.notes.slice(0, 6).map((n) => (
                    <Pressable
                      key={n.id}
                      onPress={() => nav.replace('NoteEditor', { noteId: n.id })}
                      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.7 : 1 })}
                    >
                      <Ionicons name="document-text-outline" size={17} color={colors.blue} />
                      <View style={{ flex: 1 }}>
                        <Txt size={13} weight="700" numberOfLines={1}>
                          {n.title}
                        </Txt>
                        <Txt size={11.5} color={colors.textFaint}>
                          {n.folder} · {new Date(n.updatedAt).toLocaleDateString('en-IN')}
                        </Txt>
                      </View>
                      {existing?.id === n.id ? <Tag label="Editing" color={colors.teal} /> : null}
                    </Pressable>
                  ))}
                  {existing ? (
                    <Button
                      label="Delete this note"
                      icon="trash-outline"
                      variant="outline"
                      full
                      onPress={() => {
                        dispatch({ type: 'deleteNote', id: existing.id });
                        nav.goBack();
                      }}
                    />
                  ) : null}
                </Card>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
