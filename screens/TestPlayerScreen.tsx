import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigation, AppRoute } from '../lib/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, useLayout } from '../components/Shell';
import { Button, Card, ProgressBar, Tag, Txt } from '../components/ui';
import { getTests } from '../lib/data';
import { getUserScopedStorageKey, useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';
import { TestResult } from '../lib/types';

const fmt = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

type SavedTestAttempt = {
  testId: string;
  startedAt: number;
  deadlineAt: number;
  index: number;
  answers: Record<string, number | null>;
  marked: Record<string, boolean>;
  visited: Record<string, boolean>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSavedAttempt(value: unknown, testId: string, questionCount: number, durationMs: number): SavedTestAttempt {
  if (
    !isRecord(value) ||
    value.testId !== testId ||
    typeof value.startedAt !== 'number' ||
    !Number.isFinite(value.startedAt) ||
    typeof value.deadlineAt !== 'number' ||
    !Number.isFinite(value.deadlineAt) ||
    typeof value.index !== 'number' ||
    !Number.isInteger(value.index) ||
    value.index < 0 ||
    value.index >= questionCount ||
    value.deadlineAt <= value.startedAt ||
    value.deadlineAt - value.startedAt > durationMs + 1000 ||
    !isRecord(value.answers) ||
    !isRecord(value.marked) ||
    !isRecord(value.visited)
  ) throw new Error('The saved test attempt has an invalid format.');

  const answers: Record<string, number | null> = {};
  for (const [id, answer] of Object.entries(value.answers)) {
    if (answer !== null && (typeof answer !== 'number' || !Number.isInteger(answer) || answer < 0)) {
      throw new Error('The saved test answers have an invalid format.');
    }
    answers[id] = answer;
  }
  if ([value.marked, value.visited].some((items) =>
    Object.values(items).some((flag) => typeof flag !== 'boolean')
  )) throw new Error('The saved test navigation state has an invalid format.');

  return {
    testId,
    startedAt: value.startedAt,
    deadlineAt: value.deadlineAt,
    index: value.index,
    answers,
    marked: value.marked as Record<string, boolean>,
    visited: value.visited as Record<string, boolean>,
  };
}

export default function TestPlayerScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<AppNavigation>();
  const route = useRoute<AppRoute<'TestPlayer'>>();
  const { state, dispatch } = useStore();
  const { isMobile, isDesktop } = useLayout();
  const tests = useMemo(() => getTests(state.managedContent), [state.managedContent]);
  const test = tests.find((t) => t.id === route.params?.testId) ?? tests[0];
  const attemptStorageKey = useMemo(
    () => getUserScopedStorageKey(`study-sakha-test-attempt-v1-${test.id}`, state.user?.id),
    [state.user?.id, test.id]
  );

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [visited, setVisited] = useState<Record<string, boolean>>({ [test.questions[0].id]: true });
  const [left, setLeft] = useState(test.durationMin * 60);
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null);
  const [attemptReadyKey, setAttemptReadyKey] = useState<string | null>(null);
  const [attemptError, setAttemptError] = useState<string | null>(null);
  const [attemptRetry, setAttemptRetry] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const submittedRef = useRef(false);
  const mountedRef = useRef(true);
  const startedAtRef = useRef(Date.now());
  const deadlineAtRef = useRef<number | null>(null);
  const attemptWriteQueue = useRef<Promise<void>>(Promise.resolve());
  const resultsRef = useRef(state.results);
  resultsRef.current = state.results;
  const attemptReady = attemptReadyKey === attemptStorageKey;

  const q = test.questions[index];

  useEffect(() => {
    submittedRef.current = false;
    startedAtRef.current = Date.now();
    deadlineAtRef.current = null;
  }, [attemptStorageKey]);

  useEffect(() => {
    let active = true;
    setAttemptReadyKey(null);
    setAttemptError(null);
    AsyncStorage.getItem(attemptStorageKey).then(async (raw) => {
      if (!active) return;
      if (raw) {
        const saved = parseSavedAttempt(JSON.parse(raw), test.id, test.questions.length, test.durationMin * 60_000);
        const existingResult = resultsRef.current.find((result) => result.id === `res-${test.id}-${saved.startedAt}`);
        if (existingResult) {
          await AsyncStorage.removeItem(attemptStorageKey);
          if (active) nav.replace('TestResult', {
            resultId: existingResult.id,
            headerBrand: route.params?.headerBrand,
          });
          return;
        }
        startedAtRef.current = saved.startedAt;
        deadlineAtRef.current = saved.deadlineAt;
        setDeadlineAt(saved.deadlineAt);
        setAnswers(saved.answers);
        setMarked(saved.marked);
        setVisited(saved.visited);
        setIndex(saved.index);
        setLeft(Math.max(0, Math.ceil((saved.deadlineAt - Date.now()) / 1000)));
      } else {
        const startedAt = Date.now();
        const nextDeadline = startedAt + test.durationMin * 60_000;
        startedAtRef.current = startedAt;
        deadlineAtRef.current = nextDeadline;
        setDeadlineAt(nextDeadline);
        const initial: SavedTestAttempt = {
          testId: test.id,
          startedAt,
          deadlineAt: nextDeadline,
          index: 0,
          answers: {},
          marked: {},
          visited: { [test.questions[0].id]: true },
        };
        await AsyncStorage.setItem(attemptStorageKey, JSON.stringify(initial));
      }
      if (active) setAttemptReadyKey(attemptStorageKey);
    }).catch((error: unknown) => {
      if (!active) return;
      setAttemptError(error instanceof Error ? error.message : 'Saved test attempt could not be restored.');
    });
    return () => {
      active = false;
    };
  }, [attemptRetry, attemptStorageKey, nav, route.params?.headerBrand, test.durationMin, test.id, test.questions]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!attemptReady || deadlineAt === null) return;
    const updateRemaining = () => {
      const currentDeadline = deadlineAtRef.current;
      if (currentDeadline === null) return;
      setLeft(Math.max(0, Math.ceil((currentDeadline - Date.now()) / 1000)));
    };
    updateRemaining();
    const interval = setInterval(updateRemaining, 500);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') updateRemaining();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [attemptReady, deadlineAt]);

  useEffect(() => {
    if (!attemptReady || deadlineAt === null) return;
    const snapshot: SavedTestAttempt = {
      testId: test.id,
      startedAt: startedAtRef.current,
      deadlineAt,
      index,
      answers,
      marked,
      visited,
    };
    attemptWriteQueue.current = attemptWriteQueue.current.catch(() => {}).then(async () => {
      await AsyncStorage.setItem(attemptStorageKey, JSON.stringify(snapshot));
      if (mountedRef.current) setAttemptError(null);
    }).catch((error: unknown) => {
      if (mountedRef.current) setAttemptError(error instanceof Error ? error.message : 'Test attempt could not be saved.');
    });
  }, [answers, attemptReady, attemptStorageKey, deadlineAt, index, marked, test.id, visited]);

  useEffect(() => {
    if (attemptReady && left === 0 && !submittedRef.current) submit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptReady, left]);

  const counts = useMemo(() => {
    let answered = 0;
    let review = 0;
    let unseen = 0;
    test.questions.forEach((x) => {
      if (answers[x.id] != null) answered++;
      if (marked[x.id]) review++;
      if (!visited[x.id]) unseen++;
    });
    return { answered, review, unseen, total: test.questions.length };
  }, [answers, marked, visited, test.questions]);

  const goTo = (i: number) => {
    const clamped = Math.max(0, Math.min(test.questions.length - 1, i));
    setIndex(clamped);
    setVisited((v) => ({ ...v, [test.questions[clamped].id]: true }));
    setPaletteOpen(false);
  };

  const submit = (auto = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    const bySubjectMap: Record<string, { correct: number; total: number }> = {};
    test.questions.forEach((x) => {
      const a = answers[x.id];
      bySubjectMap[x.subject] = bySubjectMap[x.subject] ?? { correct: 0, total: 0 };
      bySubjectMap[x.subject].total += 1;
      if (a == null) skipped++;
      else if (a === x.answer) {
        correct++;
        bySubjectMap[x.subject].correct += 1;
      } else wrong++;
    });
    const score = correct * test.marksPerQ - wrong * test.negative * test.marksPerQ;
    const maxScore = test.questions.length * test.marksPerQ;
    const attempted = correct + wrong;
    const result: TestResult = {
      id: `res-${test.id}-${startedAtRef.current}`,
      testId: test.id,
      title: test.title,
      exam: test.exam,
      takenAt: Date.now(),
      score: Number(score.toFixed(2)),
      maxScore,
      correct,
      wrong,
      skipped,
      accuracy: attempted ? (correct / attempted) * 100 : 0,
      percentile: 0,
      rank: 0,
      totalAspirants: 0,
      comparisonStatus: 'unavailable',
      timeTakenSec: test.durationMin * 60 - left,
      bySubject: Object.entries(bySubjectMap).map(([subject, v]) => ({ subject, ...v })),
      answers,
    };
    dispatch({ type: 'result', result });
    dispatch({ type: 'study', minutes: Math.max(1, Math.round((test.durationMin * 60 - left) / 60)) });
    dispatch({
      type: 'notify',
      notif: {
        id: `n-${Date.now()}`,
        title: auto ? 'Time up — test submitted' : 'Test submitted successfully',
        body: `${test.title}: ${score.toFixed(2)}/${maxScore} with ${Math.round(attempted ? (correct / attempted) * 100 : 0)}% accuracy.`,
        at: Date.now(),
        kind: 'test',
        read: false,
      },
    });
    nav.replace('TestResult', { resultId: result.id, headerBrand: route.params?.headerBrand });
  };

  const timeLow = left < 60;
  const retryAttemptSave = async () => {
    const snapshot: SavedTestAttempt = {
      testId: test.id,
      startedAt: startedAtRef.current,
      deadlineAt: deadlineAt ?? Date.now(),
      index,
      answers,
      marked,
      visited,
    };
    const write = attemptWriteQueue.current.catch(() => {}).then(() =>
      AsyncStorage.setItem(attemptStorageKey, JSON.stringify(snapshot))
    );
    attemptWriteQueue.current = write;
    try {
      await write;
      setAttemptError(null);
    } catch (error) {
      setAttemptError(error instanceof Error ? error.message : 'Test attempt could not be saved.');
    }
  };

  if (!attemptReady) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 24 }} edges={['top', 'bottom']}>
        <View style={{ alignItems: 'center', gap: 14 }}>
          {attemptError ? null : <ActivityIndicator size="large" color={colors.blue} />}
          <Txt size={15} weight="700" display>
            {attemptError ? 'Your saved test attempt could not be restored.' : 'Restoring your test attempt...'}
          </Txt>
          {attemptError ? (
            <>
              <Txt size={13} color={colors.textMuted} style={{ textAlign: 'center' }}>{attemptError}</Txt>
              <Button label="Retry recovery" icon="refresh-outline" onPress={() => setAttemptRetry((retry) => retry + 1)} />
            </>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  const palette = (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {[
          { label: 'Answered', value: counts.answered, color: colors.success },
          { label: 'Review', value: counts.review, color: colors.violet },
          { label: 'Not visited', value: counts.unseen, color: colors.textFaint },
        ].map((s) => (
          <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 11, height: 11, borderRadius: 4, backgroundColor: s.color }} />
            <Txt size={11.5} color={colors.textMuted} weight="600">
              {s.label} ({s.value})
            </Txt>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
        {test.questions.map((x, i) => {
          const answered = answers[x.id] != null;
          const isMarked = marked[x.id];
          const seen = visited[x.id];
          const bg = isMarked ? colors.violet : answered ? colors.success : seen ? colors.surfaceAlt : 'transparent';
          const fg = isMarked || answered ? '#fff' : colors.textMuted;
          return (
            <Pressable
              key={x.id}
              onPress={() => goTo(i)}
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: bg,
                borderWidth: i === index ? 2 : 1,
                borderColor: i === index ? colors.blue : colors.border,
              }}
            >
              <Txt size={13} weight="800" color={fg}>
                {i + 1}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <Button label="Submit test" icon="checkmark-done-outline" full onPress={() => setConfirm(true)} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <AppHeader safeAreaTop={false} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable
          onPress={() => setConfirm(true)}
          style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}
        >
          <Ionicons name="close" size={19} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Txt size={isMobile ? 13.5 : 15} weight="800" display numberOfLines={1}>
            {test.title}
          </Txt>
          <Txt size={11.5} color={colors.textMuted}>
            {q.section} · Question {index + 1} of {test.questions.length}
          </Txt>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            paddingHorizontal: 12,
            height: 38,
            borderRadius: radii.pill,
            backgroundColor: timeLow ? `${colors.danger}1A` : colors.surfaceAlt,
          }}
        >
          <Ionicons name="time-outline" size={16} color={timeLow ? colors.danger : colors.textMuted} />
          <Txt size={14} weight="800" color={timeLow ? colors.danger : colors.text}>
            {fmt(left)}
          </Txt>
        </View>
        {!isDesktop ? (
          <Pressable
            onPress={() => setPaletteOpen(true)}
            style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}
          >
            <Ionicons name="grid-outline" size={18} color={colors.text} />
          </Pressable>
        ) : null}
      </View>

      <ProgressBar value={((index + 1) / test.questions.length) * 100} height={3} color={colors.teal} />
      {attemptError ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Txt size={12} color={colors.danger} style={{ flex: 1 }}>{attemptError}</Txt>
          <Button label="Retry save" icon="refresh-outline" variant="outline" onPress={retryAttemptSave} />
        </View>
      ) : null}

      <View style={{ flex: 1, flexDirection: 'row' }}>
        <ScrollView contentContainerStyle={{ padding: isMobile ? 16 : 24, maxWidth: 820, width: '100%', alignSelf: 'center', paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 7, marginBottom: 14, flexWrap: 'wrap' }}>
            <Tag label={q.section} color={colors.blue} />
            <Tag label={`+${test.marksPerQ} / −${(test.negative * test.marksPerQ).toFixed(2)}`} color={colors.textMuted} />
            {marked[q.id] ? <Tag label="Marked for review" color={colors.violet} /> : null}
          </View>

          <Txt size={isMobile ? 16 : 18} weight="700" style={{ marginBottom: 18, lineHeight: (isMobile ? 16 : 18) * 1.5 }}>
            {q.question}
          </Txt>

          <View style={{ gap: 10 }}>
            {q.options.map((opt, i) => {
              const picked = answers[q.id] === i;
              return (
                <Pressable
                  key={i}
                  onPress={() => setAnswers((a) => ({ ...a, [q.id]: picked ? null : i }))}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 15,
                    borderRadius: radii.md,
                    borderWidth: 1.5,
                    borderColor: picked ? colors.blue : colors.border,
                    backgroundColor: picked ? colors.tint : pressed ? colors.surfaceAlt : colors.surface,
                  })}
                >
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      borderWidth: 1.6,
                      borderColor: picked ? colors.blue : colors.border,
                      backgroundColor: picked ? colors.blue : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Txt size={12} weight="800" color={picked ? '#fff' : colors.textMuted}>
                      {String.fromCharCode(65 + i)}
                    </Txt>
                  </View>
                  <Txt size={14.5} style={{ flex: 1 }} weight={picked ? '700' : '500'}>
                    {opt}
                  </Txt>
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
            <Button label="Previous" icon="chevron-back" variant="outline" onPress={() => goTo(index - 1)} />
            <Button
              label={marked[q.id] ? 'Unmark review' : 'Mark for review'}
              icon="flag-outline"
              variant="soft"
              onPress={() => setMarked((m) => ({ ...m, [q.id]: !m[q.id] }))}
            />
            <Button label="Clear" icon="refresh-outline" variant="ghost" onPress={() => setAnswers((a) => ({ ...a, [q.id]: null }))} />
            <View style={{ flex: 1 }} />
            {index === test.questions.length - 1 ? (
              <Button label="Submit" icon="checkmark-done-outline" onPress={() => setConfirm(true)} />
            ) : (
              <Button label="Save & next" icon="chevron-forward" onPress={() => goTo(index + 1)} />
            )}
          </View>
        </ScrollView>

        {isDesktop ? (
          <View style={{ width: 280, borderLeftWidth: 1, borderLeftColor: colors.border, backgroundColor: colors.surface, padding: 18 }}>
            <Txt size={14} weight="800" display style={{ marginBottom: 14 }}>
              Question palette
            </Txt>
            {palette}
          </View>
        ) : null}
      </View>

      <Modal visible={paletteOpen} transparent animationType="slide" onRequestClose={() => setPaletteOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={() => setPaletteOpen(false)} />
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: 20, paddingBottom: 32 }}>
          <View style={{ width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 }} />
          <Txt size={15} weight="800" display style={{ marginBottom: 14 }}>
            Question palette
          </Txt>
          {palette}
        </View>
      </Modal>

      <Modal visible={confirm} transparent animationType="fade" onRequestClose={() => setConfirm(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Card style={{ width: '100%', maxWidth: 420, gap: 14 }} level={3}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="checkmark-done-outline" size={24} color={colors.blue} />
            </View>
            <Txt size={18} weight="800" display>
              Submit this test?
            </Txt>
            <Txt size={13.5} color={colors.textMuted}>
              {counts.answered} answered · {counts.total - counts.answered} unanswered · {counts.review} marked for review. Negative marking applies to wrong answers only.
            </Txt>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="Keep solving" variant="outline" onPress={() => setConfirm(false)} style={{ flex: 1 }} />
              <Button label="Submit now" onPress={() => submit(false)} style={{ flex: 1 }} />
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
