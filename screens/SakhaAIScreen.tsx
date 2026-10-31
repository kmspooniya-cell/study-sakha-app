import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { LogoMark } from '../components/Logo';
import { Shell, useLayout } from '../components/Shell';
import { Avatar, Button, Card, Chip, ConfirmDialog, InlineBanner, Txt } from '../components/ui';
import { STARTER_PROMPTS } from '../lib/ai';
import { askGemini } from '../lib/geminiChat';
import { useStore } from '../lib/store';
import { fonts, radii, spacing, useTheme } from '../lib/theme';
import { ChatMsg } from '../lib/types';

const MODELS = [
  { id: 'gemini-3.1-flash-lite', label: '⚡ Fast Mentor', shortName: 'Flash-Lite' },
  { id: 'gemini-3.8-flash', label: '✨ Standard', shortName: 'Gemini 3.8' },
  { id: 'gemini-3.5-flash', label: '🧠 Flash 3.5', shortName: 'Flash 3.5' },
];

export default function SakhaAIScreen() {
  const { colors, scheme } = useTheme();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { state, streak, todayMinutes, dispatch } = useStore();
  const { isMobile, isTablet, isDesktop } = useLayout();

  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.1-flash-lite');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsKey, setNeedsKey] = useState<boolean>(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const handledPrompt = useRef(false);

  const hasCustomName = Boolean(state.user?.name && state.user.name !== 'Guest User' && state.user.name !== 'Aspirant');

  const latestResult = state.results && state.results.length > 0 ? state.results[0] : null;
  const weakestSubject = latestResult?.bySubject
    ? [...latestResult.bySubject].sort((a, b) => (a.correct / (a.total || 1)) - (b.correct / (b.total || 1)))[0]?.subject
    : undefined;

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayTasksList = (state.plannerTasks || [])
    .filter((t) => t.targetDate === todayIso)
    .slice(0, 4)
    .map((t) => ({
      label: t.label,
      category: t.category,
      taskType: t.taskType,
      completed: t.completed,
    }));

  const activeReadingList = Object.entries(state.progress || {})
    .slice(0, 3)
    .map(([resId, prog]) => ({
      resourceId: resId,
      title: prog.title || resId,
      percent: prog.percent || 0,
    }));

  const examContext = {
    name: hasCustomName ? state.user!.name : null,
    exam: state.user?.exam || null,
    streak: streak > 0 ? streak : 0,
    todayMinutes: todayMinutes > 0 ? todayMinutes : 0,
    goalMinutes: state.settings.dailyGoalMin || 180,
    notesCount: state.notes.length,
    starredCount: state.starred.length,
    testsAttempted: state.results.length,
    recentResult: latestResult
      ? {
          title: latestResult.title,
          accuracy: latestResult.accuracy,
          score: latestResult.score,
          maxScore: latestResult.maxScore,
          percentile: latestResult.percentile,
          weakestSubject,
        }
      : null,
    activeReading: activeReadingList,
    todayTasks: todayTasksList,
  };

  const send = useCallback(
    async (text: string, isRetry = false, originalMsgId?: string) => {
      const clean = text.trim();
      if (!clean || typing) return;

      setErrorMessage(null);
      setNeedsKey(false);

      const userMsgId = originalMsgId || `u-${Date.now()}`;
      if (!isRetry) {
        const userMsg: ChatMsg = {
          id: userMsgId,
          role: 'user',
          text: clean,
          at: Date.now(),
          status: 'sent',
        };
        dispatch({ type: 'chat', msg: userMsg });
        setInput('');
      }

      setTyping(true);

      // Auto scroll to bottom
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);

      try {
        const reply = await askGemini({
          message: clean,
          history: state.chat,
          model: selectedModel,
          examContext,
        });

        const sakhaMsg: ChatMsg = {
          id: `s-${Date.now()}`,
          role: 'sakha',
          text: reply.text,
          at: Date.now(),
          action: reply.action || undefined,
          sources: reply.sources && reply.sources.length > 0 ? reply.sources : undefined,
          chips: reply.chips,
          modelUsed: reply.modelUsed,
          status: 'sent',
        };

        dispatch({ type: 'chat', msg: sakhaMsg });
      } catch (err: any) {
        console.error('Failed to get Gemini response:', err);
        const isKeyMissing = err?.needsKey || err?.status === 401 || err?.status === 403;
        setNeedsKey(isKeyMissing);

        const errorDesc =
          err?.message ||
          'Unable to reach Gemini AI mentor. Please check your connection or API key setup.';
        setErrorMessage(errorDesc);

        // Add error message in thread so user can see what failed and retry
        const errorMsg: ChatMsg = {
          id: `err-${Date.now()}`,
          role: 'sakha',
          text: isKeyMissing
            ? '⚠️ Gemini API key setup is required.\n\nPlease configure your Gemini API key in Google AI Studio (under Settings > Secrets) to enable real-time AI mentoring.'
            : `⚠️ ${errorDesc}`,
          at: Date.now(),
          status: 'error',
          error: errorDesc,
          retryText: clean,
        };
        dispatch({ type: 'chat', msg: errorMsg });
      } finally {
        setTyping(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    },
    [dispatch, examContext, selectedModel, state.chat, typing]
  );

  useEffect(() => {
    const p = route.params?.prompt;
    if (p && !handledPrompt.current) {
      handledPrompt.current = true;
      setTimeout(() => send(p), 220);
    }
  }, [route.params?.prompt, send]);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    return () => clearTimeout(t);
  }, [state.chat.length, typing]);

  const renderMarkdownText = (text: string) => {
    const lines = text.split('\n');

    return (
      <View style={{ gap: 6 }}>
        {lines.map((line, lineIndex) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <View key={lineIndex} style={{ height: 4 }} />;
          }

          // Header level 3 or 2
          if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
            const hText = trimmed.replace(/^###?\s+/, '');
            return (
              <Txt
                key={lineIndex}
                size={15}
                weight="800"
                display
                color={colors.textPrimary}
                style={{ marginTop: 8, marginBottom: 2 }}
              >
                {hText}
              </Txt>
            );
          }

          // Bullet points (* or - or •)
          const isBullet = /^[-*•]\s+/.test(trimmed);
          if (isBullet) {
            const bulletBody = trimmed.replace(/^[-*•]\s+/, '');
            const parts = bulletBody.split(/\*\*(.+?)\*\*/g);
            return (
              <View key={lineIndex} style={{ flexDirection: 'row', gap: 7, paddingLeft: 4 }}>
                <Txt size={14} color={colors.blue} weight="800">
                  •
                </Txt>
                <View style={{ flex: 1 }}>
                  <Txt size={14} style={{ lineHeight: 21 }}>
                    {parts.map((p, i) =>
                      i % 2 === 1 ? (
                        <Txt key={i} size={14} weight="700" color={colors.textPrimary}>
                          {p}
                        </Txt>
                      ) : (
                        <Txt key={i} size={14} color={colors.text}>
                          {p}
                        </Txt>
                      )
                    )}
                  </Txt>
                </View>
              </View>
            );
          }

          // Numbered list item (e.g. "1. " or "2. ")
          const numberMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (numberMatch) {
            const num = numberMatch[1];
            const itemBody = numberMatch[2];
            const parts = itemBody.split(/\*\*(.+?)\*\*/g);
            return (
              <View key={lineIndex} style={{ flexDirection: 'row', gap: 7, paddingLeft: 4 }}>
                <View
                  style={{
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: colors.tint,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 1,
                  }}
                >
                  <Txt size={10.5} weight="800" color={colors.blue}>
                    {num}
                  </Txt>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt size={14} style={{ lineHeight: 21 }}>
                    {parts.map((p, i) =>
                      i % 2 === 1 ? (
                        <Txt key={i} size={14} weight="700" color={colors.textPrimary}>
                          {p}
                        </Txt>
                      ) : (
                        <Txt key={i} size={14} color={colors.text}>
                          {p}
                        </Txt>
                      )
                    )}
                  </Txt>
                </View>
              </View>
            );
          }

          // Standard paragraph with bold parts
          const parts = line.split(/\*\*(.+?)\*\*/g);
          return (
            <Txt key={lineIndex} size={14} style={{ lineHeight: 21 }}>
              {parts.map((p, i) =>
                i % 2 === 1 ? (
                  <Txt key={i} size={14} weight="700" color={colors.textPrimary}>
                    {p}
                  </Txt>
                ) : (
                  <Txt key={i} size={14} color={colors.text}>
                    {p}
                  </Txt>
                )
              )}
            </Txt>
          );
        })}
      </View>
    );
  };

  const empty = state.chat.length === 0;

  return (
    <Shell active="SakhaAI" title="" scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={{ flex: 1 }}
      >
        {/* Model Selection and Status Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: isMobile ? 14 : 20,
            paddingVertical: 10,
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderSubtle,
            gap: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Txt size={12} weight="700" color={colors.textMuted}>
              Model:
            </Txt>
            {MODELS.map((m) => {
              const active = selectedModel === m.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => setSelectedModel(m.id)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: radii.pill,
                    backgroundColor: active ? colors.tint : pressed ? colors.surfaceAlt : 'transparent',
                    borderWidth: 1,
                    borderColor: active ? colors.blue : colors.borderSubtle,
                  })}
                >
                  <Txt
                    size={11.5}
                    weight={active ? '800' : '600'}
                    color={active ? colors.blue : colors.textMuted}
                  >
                    {m.label}
                  </Txt>
                </Pressable>
              );
            })}
          </View>

          {state.chat.length > 0 && (
            <Pressable
              onPress={() => setClearDialogOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Clear chat conversation"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: radii.sm,
                backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
              })}
            >
              <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
              <Txt size={12} weight="600" color={colors.textMuted}>
                Clear
              </Txt>
            </Pressable>
          )}
        </View>

        {needsKey && (
          <View style={{ margin: 14, marginBottom: 0 }}>
            <InlineBanner
              tone="warning"
              title="Gemini API Key Required"
              body="To chat with Gemini, ensure your GEMINI_API_KEY is configured in Google AI Studio (Settings > Secrets). Your API key is safely stored on the server."
            />
          </View>
        )}

        {/* Message Thread */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{
            padding: isMobile ? 14 : 22,
            paddingBottom: isMobile ? 32 : 24,
            gap: 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          {empty ? (
            <View style={{ gap: 16 }}>
              {/* Hero Banner */}
              <LinearGradient
                colors={scheme === 'dark' ? [colors.surfaceAlt, colors.surface] : [colors.navy, colors.blue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: radii.xl,
                  padding: isMobile ? 18 : 26,
                  gap: 12,
                  borderWidth: scheme === 'dark' ? 1 : 0,
                  borderColor: colors.borderSubtle,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      backgroundColor: 'rgba(255,255,255,0.18)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="sparkles" size={24} color="#fff" />
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: radii.pill,
                      backgroundColor: 'rgba(255,255,255,0.15)',
                    }}
                  >
                    <Txt size={11.5} weight="700" color="#fff">
                      Gemini 3.8 / Flash
                    </Txt>
                  </View>
                </View>

                <Txt size={isMobile ? 22 : 26} weight="800" display color="#fff" style={{ letterSpacing: -0.6 }}>
                  Sakha AI Mentor
                </Txt>
                <Txt size={13.5} color="rgba(255,255,255,0.88)" style={{ maxWidth: 600, lineHeight: 20 }}>
                  Your personal syllabus-aware AI tutor. Ask questions on concepts, previous year questions (PYQs), mock analysis, or how to navigate and use Study Sakha tools.
                </Txt>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.sm, backgroundColor: 'rgba(255,255,255,0.14)' }}>
                    <Txt size={11.5} weight="700" color="#fff">
                      🎯 {examContext.exam ? examContext.exam.toUpperCase() : 'All Exams'}
                    </Txt>
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.sm, backgroundColor: 'rgba(255,255,255,0.14)' }}>
                    <Txt size={11.5} weight="700" color="#fff">
                      🔥 {streak}-day streak
                    </Txt>
                  </View>
                </View>
              </LinearGradient>

              {/* Starter Prompts */}
              <Card>
                <Txt size={12.5} weight="800" color={colors.textMuted} style={{ marginBottom: 12, letterSpacing: 0.5 }}>
                  TRY ASKING SAKHA
                </Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    ...(latestResult
                      ? ['Analyze my recent mock test performance & weak topics']
                      : []),
                    ...(examContext.exam
                      ? [`Recommend best study materials for ${examContext.exam.toUpperCase()}`]
                      : []),
                    'What books and notes are available in the library?',
                    'Explain Article 32 Writs in the Indian Constitution',
                    'How do I use the Focus Center & Pomodoro timer?',
                    'Recommend a mock test that exists in the app',
                    'How does the Study Planner work?',
                  ].slice(0, 6).map((p) => (
                    <Pressable
                      key={p}
                      onPress={() => send(p)}
                      style={({ pressed }) => ({
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        borderRadius: radii.md,
                        borderWidth: 1,
                        borderColor: colors.borderSubtle,
                        backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 7,
                      })}
                    >
                      <Ionicons name="sparkles-outline" size={14} color={colors.blue} />
                      <Txt size={13} weight="600" color={colors.textPrimary}>
                        {p}
                      </Txt>
                    </Pressable>
                  ))}
                </View>
              </Card>

              {/* Capabilities Highlights */}
              <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
                {[
                  {
                    icon: 'book-outline',
                    t: 'Concept Explanations',
                    b: 'Simplifies complex articles, science mechanisms, and economic models with clear analogies.',
                  },
                  {
                    icon: 'albums-outline',
                    t: 'PYQ Trends & Bank',
                    b: 'Pinpoints high-yield topics and repeated questions from past decade papers.',
                  },
                  {
                    icon: 'analytics-outline',
                    t: 'Mock Strategy & Analysis',
                    b: 'Diagnoses accuracy, negative mark pitfalls, and generates customized revision routines.',
                  },
                ].map((f) => (
                  <Card key={f.t} style={{ flex: 1, gap: 8 }}>
                    <Ionicons name={f.icon as any} size={22} color={colors.blue} />
                    <Txt size={14} weight="800">
                      {f.t}
                    </Txt>
                    <Txt size={12.5} color={colors.textMuted} style={{ lineHeight: 18 }}>
                      {f.b}
                    </Txt>
                  </Card>
                ))}
              </View>
            </View>
          ) : null}

          {/* Render Chat Messages */}
          {state.chat.map((m) =>
            m.role === 'user' ? (
              <View
                key={m.id}
                style={{
                  flexDirection: 'row',
                  gap: 10,
                  alignSelf: 'flex-end',
                  maxWidth: isMobile ? '90%' : '80%',
                }}
              >
                <View
                  style={{
                    backgroundColor: colors.blue,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: radii.lg,
                    borderBottomRightRadius: 4,
                  }}
                >
                  <Txt size={14.5} color="#fff" weight="600" style={{ lineHeight: 21 }}>
                    {m.text}
                  </Txt>
                </View>
                <Avatar name={state.user?.name ?? 'Guest User'} size={32} />
              </View>
            ) : (
              <View
                key={m.id}
                style={{
                  flexDirection: 'row',
                  gap: 10,
                  maxWidth: isMobile ? '96%' : '88%',
                }}
              >
                {/* Sakha Avatar Badge */}
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: colors.surfaceRaised,
                    borderWidth: 1,
                    borderColor: colors.borderSubtle,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 2,
                  }}
                >
                  <LogoMark size={22} />
                </View>

                {/* Sakha Message Card */}
                <View style={{ flex: 1, gap: 10 }}>
                  <View
                    style={{
                      backgroundColor: m.status === 'error' ? `${colors.danger}12` : colors.surfaceRaised,
                      borderWidth: 1,
                      borderColor: m.status === 'error' ? `${colors.danger}44` : colors.borderSubtle,
                      padding: 16,
                      borderRadius: radii.lg,
                      borderTopLeftRadius: 4,
                    }}
                  >
                    {/* Model & Source Attribution */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Txt size={12} weight="800" color={m.status === 'error' ? colors.danger : colors.blue}>
                          Sakha AI
                        </Txt>
                        {m.modelUsed && (
                          <View
                            style={{
                              paddingHorizontal: 7,
                              paddingVertical: 2,
                              borderRadius: radii.sm,
                              backgroundColor: colors.tint,
                            }}
                          >
                            <Txt size={10.5} weight="700" color={colors.blue}>
                              {m.modelUsed.replace('gemini-', '').replace('-preview', '')}
                            </Txt>
                          </View>
                        )}
                      </View>

                      <Txt size={11} color={colors.textFaint}>
                        {new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Txt>
                    </View>

                    {/* Content */}
                    {renderMarkdownText(m.text)}

                    {/* Sources in Study Sakha (Compact & Clickable) */}
                    {m.sources && m.sources.length > 0 && (
                      <View
                        style={{
                          marginTop: 14,
                          paddingTop: 12,
                          borderTopWidth: 1,
                          borderTopColor: colors.borderSubtle,
                          gap: 8,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="library-outline" size={13.5} color={colors.blue} />
                            <Txt size={11} weight="800" color={colors.textMuted} style={{ letterSpacing: 0.5 }}>
                              SOURCES IN STUDY SAKHA
                            </Txt>
                            <View
                              style={{
                                paddingHorizontal: 6,
                                paddingVertical: 1,
                                borderRadius: radii.pill,
                                backgroundColor: colors.tint,
                              }}
                            >
                              <Txt size={10} weight="700" color={colors.blue}>
                                {m.sources.length}
                              </Txt>
                            </View>
                          </View>
                          <Txt size={10.5} color={colors.textFaint}>
                            Tap to open
                          </Txt>
                        </View>

                        <View style={{ gap: 6 }}>
                          {m.sources.map((src, srcIdx) => {
                            const typeColor =
                              src.type === 'Book'
                                ? colors.amber
                                : src.type === 'Note'
                                ? colors.blue
                                : src.type === 'PYQ'
                                ? colors.violet
                                : colors.success;

                            const iconName =
                              src.type === 'Book'
                                ? 'book-outline'
                                : src.type === 'Note'
                                ? 'document-text-outline'
                                : src.type === 'PYQ'
                                ? 'albums-outline'
                                : 'stopwatch-outline';

                            return (
                              <Pressable
                                key={`${src.id}-${srcIdx}`}
                                onPress={() =>
                                  nav.navigate(src.route, {
                                    ...(src.params || {}),
                                    headerBrand: 'SakhaAI',
                                  })
                                }
                                accessibilityRole="button"
                                accessibilityLabel={`Open source ${src.type}: ${src.title}`}
                                style={({ pressed }) => ({
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  paddingHorizontal: 12,
                                  paddingVertical: 9,
                                  borderRadius: radii.md,
                                  backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
                                  borderWidth: 1,
                                  borderColor: colors.borderSubtle,
                                  gap: 10,
                                })}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                  <View
                                    style={{
                                      paddingHorizontal: 7,
                                      paddingVertical: 3,
                                      borderRadius: radii.sm,
                                      backgroundColor: `${typeColor}18`,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                  >
                                    <Ionicons name={iconName as any} size={11} color={typeColor} />
                                    <Txt size={10.5} weight="800" color={typeColor}>
                                      {src.type.toUpperCase()}
                                    </Txt>
                                  </View>

                                  <View style={{ flex: 1 }}>
                                    <Txt size={12.5} weight="700" color={colors.textPrimary} numberOfLines={1}>
                                      {src.title}
                                    </Txt>
                                    {(src.section || src.pages) ? (
                                      <Txt size={11} color={colors.textMuted} numberOfLines={1}>
                                        {src.section ? src.section : ''}
                                        {src.section && src.pages ? ' • ' : ''}
                                        {src.pages ? `${src.pages} pages` : ''}
                                      </Txt>
                                    ) : null}
                                  </View>
                                </View>

                                <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* Error and Retry Action */}
                    {m.status === 'error' && m.retryText && (
                      <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Button
                          label="Retry Request"
                          icon="refresh"
                          size="sm"
                          variant="danger"
                          onPress={() => send(m.retryText!, true, m.id)}
                        />
                      </View>
                    )}
                  </View>

                  {/* Navigation Action Button */}
                  {m.action ? (
                    <Button
                      label={m.action.label}
                      icon="arrow-forward"
                      size="sm"
                      variant="soft"
                      onPress={() =>
                        nav.navigate(m.action!.route, {
                          ...(m.action!.params ?? {}),
                          headerBrand: 'SakhaAI',
                        })
                      }
                    />
                  ) : null}

                  {/* Follow-up Interactive Chips */}
                  {m.chips && m.chips.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 2 }}>
                      {m.chips.map((c) => (
                        <Pressable
                          key={c}
                          onPress={() => send(c)}
                          style={({ pressed }) => ({
                            paddingHorizontal: 12,
                            height: 32,
                            borderRadius: radii.pill,
                            borderWidth: 1,
                            borderColor: colors.borderSubtle,
                            backgroundColor: pressed ? colors.surfaceAlt : colors.surfaceRaised,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                          })}
                        >
                          <Ionicons name="sparkles-outline" size={13} color={colors.blue} />
                          <Txt size={12} weight="600" color={colors.textPrimary}>
                            {c}
                          </Txt>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )
          )}

          {/* Typing Indicator */}
          {typing && (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: colors.surfaceRaised,
                  borderWidth: 1,
                  borderColor: colors.borderSubtle,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LogoMark size={22} />
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: colors.surfaceRaised,
                  borderWidth: 1,
                  borderColor: colors.borderSubtle,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: radii.lg,
                  borderTopLeftRadius: 4,
                }}
              >
                <ActivityIndicator size="small" color={colors.blue} />
                <Txt size={13} weight="600" color={colors.textMuted}>
                  Sakha is formulating a response…
                </Txt>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.borderSubtle,
            backgroundColor: colors.surface,
            paddingHorizontal: isMobile ? 12 : 20,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 8,
          }}
        >
          <View
            style={{
              flex: 1,
              minHeight: 46,
              borderRadius: radii.lg,
              borderWidth: 1.4,
              borderColor: colors.borderSubtle,
              backgroundColor: colors.bg,
              paddingHorizontal: 14,
              justifyContent: 'center',
            }}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask Sakha anything (e.g. explain a concept, pull PYQs, mock analysis)…"
              placeholderTextColor={colors.textFaint}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
              blurOnSubmit={false}
              multiline
              maxLength={1000}
              style={
                {
                  fontFamily: fonts.body,
                  fontSize: 14.5,
                  color: colors.text,
                  paddingVertical: 10,
                  maxHeight: 120,
                  outlineStyle: 'none',
                } as any
              }
            />
          </View>

          <Pressable
            onPress={() => send(input)}
            disabled={!input.trim() || typing}
            accessibilityRole="button"
            accessibilityLabel="Send message to Sakha AI"
            style={({ pressed }) => ({
              width: 46,
              height: 46,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: input.trim() && !typing ? colors.blue : colors.surfaceAlt,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            {typing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={input.trim() && !typing ? '#fff' : colors.textFaint}
              />
            )}
          </Pressable>
        </View>

        {/* Clear Chat Confirmation Dialog */}
        <ConfirmDialog
          visible={clearDialogOpen}
          title="Clear Conversation?"
          message="This will clear your current conversation history with Sakha. Your saved notes, test records, and syllabus bookmarks will remain intact."
          confirmLabel="Clear Chat"
          cancelLabel="Keep History"
          danger
          onConfirm={() => {
            dispatch({ type: 'clearChat' });
            setClearDialogOpen(false);
          }}
          onCancel={() => setClearDialogOpen(false)}
        />
      </KeyboardAvoidingView>
    </Shell>
  );
}
