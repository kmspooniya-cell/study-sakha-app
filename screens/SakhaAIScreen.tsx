import Ionicons from '@expo/vector-icons/Ionicons';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigation, AppRoute } from '../lib/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
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
import { askGemini, GEMINI_MODEL_OPTIONS, GeminiModelId } from '../lib/geminiChat';
import { useStore } from '../lib/store';
import { fonts, radii, spacing, useTheme } from '../lib/theme';
import { ChatMsg } from '../lib/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SakhaAIScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<AppNavigation>();
  const route = useRoute<AppRoute<'SakhaAI'>>();
  const { state, streak, todayMinutes, dispatch } = useStore();
  const { isMobile } = useLayout();

  const [input, setInput] = useState('');
  const [inputHeight, setInputHeight] = useState(46);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [androidKeyboardOverlap, setAndroidKeyboardOverlap] = useState(0);
  const [typing, setTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModelId>(GEMINI_MODEL_OPTIONS[0].id);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsKey, setNeedsKey] = useState<boolean>(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const containerRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const handledPrompt = useRef(false);
  const activeRequest = useRef<{ requestId: string; controller: AbortController } | null>(null);
  const requestGeneration = useRef(0);
  const requestInFlight = useRef(false);
  const mounted = useRef(true);

  const dispatchChat = useCallback((msg: ChatMsg) => {
    dispatch({ type: state.settings.aiSaveChatHistory ? 'chat' : 'chatEphemeral', msg });
  }, [dispatch, state.settings.aiSaveChatHistory]);

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
          comparisonStatus: latestResult.comparisonStatus ?? 'estimated',
          ...(latestResult.comparisonStatus === 'unavailable'
            ? {}
            : { percentile: latestResult.percentile }),
          weakestSubject,
        }
      : null,
    activeReading: activeReadingList,
    todayTasks: todayTasksList,
    aiPreferences: {
      responseLanguage: state.settings.aiResponseLanguage,
      responseLength: state.settings.aiResponseLength,
      detailLevel: state.settings.aiDetailLevel,
      learningMode: state.settings.aiLearningMode,
    },
  };

  const send = useCallback(
    async (text: string, isRetry = false, originalMsgId?: string) => {
      const clean = text.trim();
      if (!clean || requestInFlight.current) return;

      requestInFlight.current = true;
      const previousUserMessage = isRetry
        ? [...state.chat].reverse().find((item) => item.role === 'user' && item.text === clean)
        : undefined;
      const requestId = originalMsgId ?? previousUserMessage?.id ?? `u-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
      const responseId = `a-${requestId}`;
      const generation = requestGeneration.current;
      const controller = new AbortController();
      activeRequest.current = { requestId, controller };

      if (mounted.current) {
        setErrorMessage(null);
        setNeedsKey(false);
      }

      dispatchChat({
        id: requestId,
        role: 'user',
        requestId,
        text: clean,
        at: state.chat.find((item) => item.id === requestId)?.at ?? Date.now(),
        status: 'sending',
      });
      if (!isRetry) {
        setInput('');
        setInputHeight(46);
      } else {
        dispatchChat({
          id: responseId,
          role: 'sakha',
          requestId,
          text: 'Retrying your request…',
          at: Date.now(),
          status: 'sending',
        });
      }

      if (mounted.current) setTyping(true);

      if (mounted.current) {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
      }

      try {
        const reply = await askGemini({
          message: clean,
          history: state.settings.aiSaveChatHistory ? state.chat.filter(
            (item) => item.id !== requestId && item.requestId !== requestId && item.status !== 'error'
          ) : [],
          model: selectedModel,
          signal: controller.signal,
          examContext,
        });

        if (generation !== requestGeneration.current) return;
        dispatchChat({
          id: requestId,
          role: 'user',
          requestId,
          text: clean,
          at: state.chat.find((item) => item.id === requestId)?.at ?? Date.now(),
          status: 'sent',
        });
        const sakhaMsg: ChatMsg = {
          id: responseId,
          role: 'sakha',
          requestId,
          text: reply.text,
          at: Date.now(),
          action: reply.action || undefined,
          actions: reply.actions?.length ? reply.actions : reply.action ? [reply.action] : [],
          sources: reply.sources && reply.sources.length > 0 ? reply.sources : undefined,
          chips: reply.chips,
          modelUsed: reply.modelUsed,
          fallbackUsed: reply.fallbackUsed,
          status: 'sent',
        };

        dispatchChat(sakhaMsg);
      } catch (err: unknown) {
        if (generation !== requestGeneration.current) return;
        const error = err instanceof Error ? err : new Error('Unable to reach Sakha AI.');
        const requestError = error as Error & { needsKey?: boolean; status?: number };
        const isKeyMissing = requestError.needsKey || requestError.status === 401 || requestError.status === 403;
        const errorDesc = controller.signal.aborted
          ? 'Request cancelled. Your prompt is saved; retry when you are ready.'
          : error.message;
        if (mounted.current) {
          setNeedsKey(Boolean(isKeyMissing));
          setErrorMessage(errorDesc);
        }
        dispatchChat({
            id: requestId,
            role: 'user',
            requestId,
            text: clean,
            at: state.chat.find((item) => item.id === requestId)?.at ?? Date.now(),
            status: 'error',
        });
        const errorMsg: ChatMsg = {
          id: responseId,
          role: 'sakha',
          requestId,
          text: isKeyMissing
            ? 'Your session or AI service configuration needs attention. Sign in again or contact support.'
            : `⚠️ ${errorDesc}`,
          at: Date.now(),
          status: 'error',
          error: errorDesc,
          retryText: clean,
        };
        dispatchChat(errorMsg);
      } finally {
        if (activeRequest.current?.requestId === requestId) activeRequest.current = null;
        requestInFlight.current = false;
        if (mounted.current) {
          setTyping(false);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
      }
    },
    [dispatchChat, examContext, selectedModel, state.chat, state.settings.aiSaveChatHistory]
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

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
    let inCodeBlock = false;

    const renderInline = (value: string, keyPrefix: string) => value
      .split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*)/g)
      .filter(Boolean)
      .map((part, index) => {
        const key = `${keyPrefix}-${index}`;
        if (part.startsWith('`') && part.endsWith('`')) {
          return <Txt key={key} size={14} color={colors.blue} style={{ fontFamily: fonts.body }}>{part.slice(1, -1)}</Txt>;
        }
        if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
          return <Txt key={key} size={14} weight="700" color={colors.textPrimary}>{part.slice(2, -2)}</Txt>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <Txt key={key} size={14} color={colors.textPrimary} style={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</Txt>;
        }
        return <Txt key={key} size={14} color={colors.text}>{part}</Txt>;
      });

    return (
      <View style={{ gap: 6 }}>
        {lines.map((line, lineIndex) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            return null;
          }
          if (inCodeBlock) {
            return (
              <View key={lineIndex} style={{ backgroundColor: colors.bg, borderRadius: radii.sm, paddingHorizontal: 10, paddingVertical: 7 }}>
                <Txt size={13} color={colors.text} style={{ fontFamily: fonts.body, lineHeight: 19 }}>{line}</Txt>
              </View>
            );
          }
          if (!trimmed) {
            return <View key={lineIndex} style={{ height: 4 }} />;
          }

          if (trimmed.includes('|') && trimmed.split('|').filter(Boolean).length >= 2) {
            const cells = trimmed.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
            if (cells.every((cell) => /^:?-{2,}:?$/.test(cell))) return null;
            return (
              <View key={lineIndex} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }}>
                {cells.map((cell, cellIndex) => (
                  <View key={`${lineIndex}-${cellIndex}`} style={{ flex: 1, paddingHorizontal: 7, paddingVertical: 6 }}>
                    <Txt size={13} color={colors.text}>{renderInline(cell, `${lineIndex}-${cellIndex}`)}</Txt>
                  </View>
                ))}
              </View>
            );
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
            return (
              <View key={lineIndex} style={{ flexDirection: 'row', gap: 7, paddingLeft: 4 }}>
                <Txt size={14} color={colors.blue} weight="800">
                  •
                </Txt>
                <View style={{ flex: 1 }}>
                  <Txt size={14} style={{ lineHeight: 21 }}>
                    {renderInline(bulletBody, `${lineIndex}-bullet`)}
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
                    {renderInline(itemBody, `${lineIndex}-numbered`)}
                  </Txt>
                </View>
              </View>
            );
          }

          // Standard paragraph with bold parts
          return (
            <Txt key={lineIndex} size={14} style={{ lineHeight: 21 }}>
              {renderInline(line, `${lineIndex}-paragraph`)}
            </Txt>
          );
        })}
      </View>
    );
  };

  const empty = state.chat.length === 0;

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardOpen(true);
      if (Platform.OS === 'android') {
        const keyboardTopY = event?.endCoordinates?.screenY;
        const containerNode = containerRef.current;
        if (typeof keyboardTopY === 'number' && containerNode && typeof containerNode.measureInWindow === 'function') {
          requestAnimationFrame(() => {
            containerNode.measureInWindow((_x, y, _w, height) => {
              const overlap = Math.max(0, Math.round(y + height - keyboardTopY));
              setAndroidKeyboardOverlap(overlap);
            });
          });
        }
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardOpen(false);
      setAndroidKeyboardOverlap(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <Shell active="SakhaAI" title="" scroll={false}>
      <View
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          paddingBottom: Platform.OS === 'android' ? androidKeyboardOverlap : 0,
        }}
      >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={{ flex: 1, minHeight: 0 }}
      >
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
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: isMobile ? 14 : 22,
            paddingBottom: isMobile ? 32 : 24,
            gap: 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          {empty ? (
            <View style={{ gap: 16 }}>
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
                              {m.fallbackUsed ? 'Fallback · ' : ''}{m.modelUsed.replace('gemini-', '').replace('-preview', '')}
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
                                  nav.dispatch(
                                    CommonActions.navigate({
                                      name: src.route,
                                      params: { ...(src.params || {}), headerBrand: 'SakhaAI' },
                                    })
                                  )
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
                          onPress={() => send(m.retryText!, true, m.requestId)}
                        />
                      </View>
                    )}
                  </View>

                  {/* Navigation Action Button */}
                  {(m.actions?.length ? m.actions : m.action ? [m.action] : []).map((action, actionIndex) => (
                    <Pressable
                      key={`${action.route}-${action.label}-${actionIndex}`}
                      accessibilityRole="button"
                      accessibilityLabel={action.label}
                      onPress={() =>
                        nav.dispatch(
                          CommonActions.navigate({
                            name: action.route,
                            params: { ...(action.params ?? {}), headerBrand: 'SakhaAI' },
                          })
                        )
                      }
                      style={({ pressed }) => ({
                        minHeight: 48,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: radii.md,
                        borderWidth: 1,
                        borderColor: colors.blue,
                        backgroundColor: pressed ? colors.tint : colors.surface,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      })}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="arrow-forward" size={15} color={colors.blue} />
                        </View>
                        <Txt size={13.5} weight="700" color={colors.textPrimary} numberOfLines={2} style={{ flex: 1 }}>
                          {action.label}
                        </Txt>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.blue} />
                    </Pressable>
                  ))}

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
            paddingTop: 10,
            paddingBottom: keyboardOpen ? 10 : Math.max(10, insets.bottom + 8),
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 8,
          }}
        >
          <View
            style={{
              flex: 1,
              minHeight: 46,
              height: Math.min(128, Math.max(46, inputHeight)),
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
              onContentSizeChange={(event) => {
                const nextHeight = Math.min(128, Math.max(46, event.nativeEvent.contentSize.height + 20));
                setInputHeight(nextHeight);
                if (keyboardOpen) {
                  setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 40);
                }
              }}
              placeholder="Ask Sakha anything (e.g. explain a concept, pull PYQs, mock analysis)…"
              placeholderTextColor={colors.textFaint}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
              blurOnSubmit={false}
              multiline
              scrollEnabled={inputHeight >= 128}
              maxLength={1000}
              style={
                {
                  fontFamily: fonts.body,
                  fontSize: 14.5,
                  color: colors.text,
                  paddingVertical: 10,
                  minHeight: 46,
                  maxHeight: 118,
                  textAlignVertical: 'top',
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

          {state.chat.length > 0 && (
            <Pressable
              onPress={() => setClearDialogOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Clear chat conversation"
              style={({ pressed }) => ({
                width: 38,
                height: 38,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
              })}
            >
              <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
            </Pressable>
          )}
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
            requestGeneration.current += 1;
            activeRequest.current?.controller.abort();
            activeRequest.current = null;
            requestInFlight.current = false;
            dispatch({ type: 'clearChat' });
            setClearDialogOpen(false);
          }}
          onCancel={() => setClearDialogOpen(false)}
        />
      </KeyboardAvoidingView>
      </View>
    </Shell>
  );
}
