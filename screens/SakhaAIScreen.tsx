import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { LogoMark } from '../components/Logo';
import { Shell, useLayout } from '../components/Shell';
import { Avatar, Button, Card, Txt } from '../components/ui';
import { askSakha, STARTER_PROMPTS } from '../lib/ai';
import { useStore } from '../lib/store';
import { fonts, radii, useTheme } from '../lib/theme';
import { ChatMsg } from '../lib/types';

export default function SakhaAIScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { state, streak, todayMinutes, dispatch } = useStore();
  const { isMobile, isDesktop } = useLayout();
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const handledPrompt = useRef(false);

  const send = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean || typing) return;
      const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: 'user', text: clean, at: Date.now() };
      dispatch({ type: 'chat', msg: userMsg });
      setInput('');
      setTyping(true);
      setTimeout(() => {
        const reply = askSakha(clean, {
          name: state.user?.name ?? 'Aspirant',
          exam: state.user?.exam ?? 'upsc',
          streak,
          todayMinutes,
          goalMinutes: state.settings.dailyGoalMin,
          results: state.results,
          notes: state.notes,
          starred: state.starred,
        });
        dispatch({
          type: 'chat',
          msg: {
            id: `s-${Date.now()}`,
            role: 'sakha',
            text: reply.text,
            at: Date.now(),
            chips: reply.chips,
            action: reply.action,
            intent: reply.intent,
          },
        });
        setTyping(false);
      }, 520);
    },
    [dispatch, state, streak, todayMinutes, typing]
  );

  useEffect(() => {
    const p = route.params?.prompt;
    if (p && !handledPrompt.current) {
      handledPrompt.current = true;
      setTimeout(() => send(p), 220);
    }
  }, [route.params?.prompt, send]);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [state.chat.length, typing]);

  const renderText = (text: string) => {
    const parts = text.split(/\*\*(.+?)\*\*/g);
    return (
      <Txt size={14} style={{ lineHeight: 21 }}>
        {parts.map((p, i) =>
          i % 2 === 1 ? (
            <Txt key={i} size={14} weight="800">
              {p}
            </Txt>
          ) : (
            <Txt key={i} size={14}>
              {p}
            </Txt>
          )
        )}
      </Txt>
    );
  };

  const empty = state.chat.length === 0;

  return (
    <Shell active="SakhaAI" title="" scroll={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: isMobile ? 16 : 22, paddingBottom: 20, gap: 14 }}
          showsVerticalScrollIndicator={false}
        >
          {empty ? (
            <View style={{ gap: 16 }}>
              <LinearGradient colors={[colors.teal, colors.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radii.xl, padding: isMobile ? 18 : 24, gap: 12 }}>
                <View style={{ width: 52, height: 52, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="sparkles" size={24} color="#fff" />
                </View>
                <Txt size={isMobile ? 21 : 26} weight="800" display color="#fff" style={{ letterSpacing: -0.6 }}>
                  Ask me anything about your preparation.
                </Txt>
                <Txt size={13.5} color="rgba(255,255,255,0.85)" style={{ maxWidth: 560 }}>
                  I read your library notes, PYQ bank, mock results, streak and daily goal — then answer with specifics, not generic advice.
                </Txt>
              </LinearGradient>

              <Card>
                <Txt size={13} weight="800" color={colors.textMuted} style={{ marginBottom: 12, letterSpacing: 0.6 }}>
                  TRY ASKING
                </Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
                  {STARTER_PROMPTS.map((p) => (
                    <Pressable
                      key={p}
                      onPress={() => send(p)}
                      style={({ pressed }) => ({
                        paddingHorizontal: 13,
                        paddingVertical: 10,
                        borderRadius: radii.md,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 7,
                      })}
                    >
                      <Ionicons name="arrow-forward-circle-outline" size={15} color={colors.blue} />
                      <Txt size={13} weight="600">
                        {p}
                      </Txt>
                    </Pressable>
                  ))}
                </View>
              </Card>

              <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
                {[
                  { icon: 'library-outline', t: 'Library-aware', b: 'Answers cite the exact note or book in your shelf.' },
                  { icon: 'stats-chart-outline', t: 'Result-aware', b: 'Knows your accuracy, percentile and weakest subject.' },
                  { icon: 'flame-outline', t: 'Habit-aware', b: 'Tracks streak and goal to size the plan realistically.' },
                ].map((f) => (
                  <Card key={f.t} style={{ flex: 1, gap: 8 }}>
                    <Ionicons name={f.icon as any} size={20} color={colors.teal} />
                    <Txt size={14} weight="800">
                      {f.t}
                    </Txt>
                    <Txt size={12.5} color={colors.textMuted}>
                      {f.b}
                    </Txt>
                  </Card>
                ))}
              </View>
            </View>
          ) : null}

          {state.chat.map((m) =>
            m.role === 'user' ? (
              <View key={m.id} style={{ flexDirection: 'row', gap: 10, alignSelf: 'flex-end', maxWidth: '88%' }}>
                <View style={{ backgroundColor: colors.blue, paddingHorizontal: 15, paddingVertical: 12, borderRadius: radii.lg, borderBottomRightRadius: 6 }}>
                  <Txt size={14} color="#fff" weight="600">
                    {m.text}
                  </Txt>
                </View>
                <Avatar name={state.user?.name ?? 'Guest User'} size={32} />
              </View>
            ) : (
              <View key={m.id} style={{ flexDirection: 'row', gap: 10, maxWidth: '94%' }}>
                <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                  <LogoMark size={22} />
                </View>
                <View style={{ flex: 1, gap: 10 }}>
                  <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 15, borderRadius: radii.lg, borderTopLeftRadius: 6 }}>
                    {renderText(m.text)}
                  </View>
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
                  {m.chips?.length ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                      {m.chips.map((c) => (
                        <Pressable
                          key={c}
                          onPress={() => send(c)}
                          style={({ pressed }) => ({
                            paddingHorizontal: 12,
                            height: 32,
                            borderRadius: radii.pill,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
                            justifyContent: 'center',
                          })}
                        >
                          <Txt size={12} weight="600" color={colors.textMuted}>
                            {c}
                          </Txt>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
            )
          )}

          {typing ? (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <LogoMark size={22} />
              </View>
              <View style={{ flexDirection: 'row', gap: 5, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 14, borderRadius: radii.lg }}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textFaint, opacity: 1 - i * 0.28 }} />
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
            padding: 12,
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 10,
          }}
        >
          {state.chat.length ? (
            <Pressable
              onPress={() => dispatch({ type: 'clearChat' })}
              style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.surfaceAlt : colors.bg, borderWidth: 1, borderColor: colors.border })}
            >
              <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
          <View
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: radii.lg,
              borderWidth: 1.4,
              borderColor: colors.border,
              backgroundColor: colors.bg,
              paddingHorizontal: 14,
              justifyContent: 'center',
            }}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask Sakha about any topic, PYQ or your performance…"
              placeholderTextColor={colors.textFaint}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
              blurOnSubmit={false}
              style={{ fontFamily: fonts.body, fontSize: 14.5, color: colors.text, paddingVertical: 12, outlineStyle: 'none' } as any}
            />
          </View>
          <Pressable
            onPress={() => send(input)}
            disabled={!input.trim() || typing}
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
            <Ionicons name="send" size={18} color={input.trim() && !typing ? '#fff' : colors.textFaint} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Shell>
  );
}
