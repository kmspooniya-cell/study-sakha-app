import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLayout } from '../components/Shell';
import { Button, Card, ProgressBar, Tag, Txt } from '../components/ui';
import { TESTS } from '../lib/data';
import { useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';
import { TestResult } from '../lib/types';

const fmt = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function TestPlayerScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { dispatch } = useStore();
  const { isMobile, isDesktop } = useLayout();
  const test = TESTS.find((t) => t.id === route.params?.testId) ?? TESTS[0];

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [visited, setVisited] = useState<Record<string, boolean>>({ [test.questions[0].id]: true });
  const [left, setLeft] = useState(test.durationMin * 60);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const submittedRef = useRef(false);

  const q = test.questions[index];

  useEffect(() => {
    const id = setInterval(() => {
      setLeft((l) => (l <= 0 ? 0 : l - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (left === 0 && !submittedRef.current) submit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

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
    const ratio = Math.max(0, score) / maxScore;
    const percentile = Math.max(5, Math.min(99.8, 38 + ratio * 61 + (attempted / test.questions.length) * 2));
    const totalAspirants = test.attempts;
    const rank = Math.max(1, Math.round(totalAspirants * (1 - percentile / 100)));
    const result: TestResult = {
      id: `res-${Date.now()}`,
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
      percentile: Number(percentile.toFixed(1)),
      rank,
      totalAspirants,
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
        body: `${test.title}: ${score.toFixed(2)}/${maxScore} with ${percentile.toFixed(1)} percentile.`,
        at: Date.now(),
        kind: 'test',
        read: false,
      },
    });
    nav.replace('TestResult', { resultId: result.id });
  };

  const timeLow = left < 60;

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
