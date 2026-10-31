import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DetailHeader, useLayout } from '../components/Shell';
import { Button, Card, EmptyState, ProgressBar, SectionHeader, Tag, Txt } from '../components/ui';
import { EXAMS, RESOURCES } from '../lib/data';
import { useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';

export default function BookReaderScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { state, dispatch } = useStore();
  const { isMobile, isDesktop } = useLayout();
  const book = RESOURCES.find((r) => r.id === route.params?.resourceId) ?? RESOURCES.find((r) => r.type === 'book')!;
  const [mode, setMode] = useState<'overview' | 'read'>('overview');
  const [page, setPage] = useState(0);
  const [fontSize, setFontSize] = useState(15.5);

  const pages = book.body;
  const takeaways = useMemo(
    () =>
      RESOURCES.filter((r) => r.id !== book.id && r.subject === book.subject)
        .flatMap((r) => r.body.slice(0, 2).map((b) => ({ from: r.title, text: b })))
        .slice(0, 4),
    [book]
  );

  const progress = state.progress[book.id]?.percent ?? 0;
  const starred = state.starred.includes(book.id);

  const turn = (dir: 1 | -1) => {
    const next = Math.max(0, Math.min(pages.length - 1, page + dir));
    setPage(next);
    const pct = Math.round(((next + 1) / pages.length) * 100);
    dispatch({ type: 'progress', id: book.id, percent: pct, title: book.title });
    if (dir === 1) dispatch({ type: 'study', minutes: 2 });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <DetailHeader
        title={book.title}
        subtitle={`${book.author} · ${book.pages} pages`}
        onBack={() => (mode === 'read' ? setMode('overview') : nav.goBack())}
        right={
          <Pressable
            onPress={() => dispatch({ type: 'toggleStar', id: book.id })}
            style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: starred ? `${colors.warning}1F` : colors.bg, borderWidth: 1, borderColor: colors.border }}
          >
            <Ionicons name={starred ? 'star' : 'star-outline'} size={18} color={starred ? colors.warning : colors.textMuted} />
          </Pressable>
        }
      />

      {mode === 'overview' ? (
        <ScrollView contentContainerStyle={{ padding: isMobile ? 16 : 24, maxWidth: 1120, width: '100%', alignSelf: 'center', paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          <Card style={{ gap: 18 }}>
            <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 20 }}>
              <Image source={{ uri: book.cover }} style={{ width: isMobile ? '100%' : 180, height: isMobile ? 220 : 240, borderRadius: radii.lg, backgroundColor: colors.surfaceAlt }} />
              <View style={{ flex: 1, gap: 12 }}>
                <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap' }}>
                  <Tag label={EXAMS.find((e) => e.id === book.exam)?.short ?? ''} color={colors.blue} />
                  <Tag label={book.subject} color={colors.teal} />
                  <Tag label={`★ ${book.rating}`} color={colors.warning} />
                  <Tag label={`${book.downloads.toLocaleString('en-IN')} downloads`} color={colors.textMuted} />
                </View>
                <Txt size={isMobile ? 21 : 26} weight="800" display style={{ letterSpacing: -0.7 }}>
                  {book.title}
                </Txt>
                <Txt size={14} color={colors.textMuted}>
                  {book.summary}
                </Txt>
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Txt size={12.5} weight="700" color={colors.textMuted}>
                      Reading progress
                    </Txt>
                    <Txt size={12.5} weight="800" color={colors.teal}>
                      {progress}%
                    </Txt>
                  </View>
                  <ProgressBar value={progress} color={colors.teal} />
                </View>
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                  <Button label={progress > 0 ? 'Continue reading' : 'Start reading'} icon="book-outline" onPress={() => setMode('read')} />
                  <Button label="Related PYQs" icon="albums-outline" variant="outline" onPress={() => nav.navigate('PYQ', { subject: book.subject, headerBrand: route.params?.headerBrand })} />
                </View>
              </View>
            </View>
          </Card>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, marginTop: 16 }}>
            <Card style={{ flex: 1 }}>
              <SectionHeader title="Table of contents" icon="list-outline" />
              {book.toc?.length ? (
                <View style={{ gap: 2 }}>
                  {book.toc.map((t, i) => (
                    <Pressable
                      key={t}
                      onPress={() => {
                        setPage(Math.min(i, pages.length - 1));
                        setMode('read');
                      }}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingVertical: 11,
                        opacity: pressed ? 0.65 : 1,
                        borderBottomWidth: i === (book.toc?.length ?? 0) - 1 ? 0 : 1,
                        borderBottomColor: colors.border,
                      })}
                    >
                      <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                        <Txt size={11.5} weight="800" color={colors.textMuted}>
                          {i + 1}
                        </Txt>
                      </View>
                      <Txt size={13.5} weight="600" style={{ flex: 1 }}>
                        {t}
                      </Txt>
                      <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <EmptyState icon="list-outline" title="No chapters listed" body="This resource is read as a single flowing document." />
              )}
            </Card>

            <Card style={{ flex: 1 }}>
              <SectionHeader title="Key takeaways from your library" icon="bulb-outline" />
              <View style={{ gap: 14 }}>
                {takeaways.map((t, i) => (
                  <View key={i} style={{ gap: 5 }}>
                    <Txt size={11.5} weight="800" color={colors.teal}>
                      {t.from}
                    </Txt>
                    <Txt size={13} color={colors.textMuted}>
                      {t.text}
                    </Txt>
                  </View>
                ))}
                {!takeaways.length ? (
                  <Txt size={13} color={colors.textFaint}>
                    Add more {book.subject} notes to your library and Sakha will cross-link takeaways here.
                  </Txt>
                ) : null}
              </View>
            </Card>
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
            <Txt size={12.5} weight="700" color={colors.textMuted}>
              Page {page + 1} of {pages.length}
            </Txt>
            <View style={{ flex: 1 }}>
              <ProgressBar value={((page + 1) / pages.length) * 100} height={5} color={colors.teal} />
            </View>
            <Pressable onPress={() => setFontSize((f) => Math.max(13, f - 1))} style={{ padding: 6 }}>
              <Ionicons name="remove-circle-outline" size={19} color={colors.textMuted} />
            </Pressable>
            <Pressable onPress={() => setFontSize((f) => Math.min(21, f + 1))} style={{ padding: 6 }}>
              <Ionicons name="add-circle-outline" size={19} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: isMobile ? 20 : 36, maxWidth: 760, width: '100%', alignSelf: 'center', paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <Txt size={11.5} weight="800" color={colors.teal} style={{ letterSpacing: 1.3, marginBottom: 10 }}>
              {(book.toc?.[page] ?? book.subject).toUpperCase()}
            </Txt>
            <Txt size={fontSize} color={colors.text} style={{ lineHeight: fontSize * 1.75 }}>
              {pages[page]}
            </Txt>

            {page === pages.length - 1 ? (
              <Card style={{ marginTop: 26, gap: 10 }}>
                <Txt size={14} weight="800" display>
                  Chapter complete
                </Txt>
                <Txt size={13} color={colors.textMuted}>
                  Lock this in with 10 PYQs on {book.subject}, or ask Sakha to quiz you on what you just read.
                </Txt>
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                  <Button label="Practise PYQs" icon="albums-outline" size="sm" onPress={() => nav.navigate('PYQ', { subject: book.subject, headerBrand: route.params?.headerBrand })} />
                  <Button label="Quiz me" icon="sparkles-outline" size="sm" variant="soft" onPress={() => nav.navigate('SakhaAI', { prompt: `Quiz me on ${book.title}` })} />
                </View>
              </Card>
            ) : null}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }}>
            <Button label="Previous" icon="chevron-back" variant="outline" onPress={() => turn(-1)} style={{ flex: 1 }} />
            <Button label={page === pages.length - 1 ? 'Finish' : 'Next page'} icon="chevron-forward" onPress={() => (page === pages.length - 1 ? setMode('overview') : turn(1))} style={{ flex: 1 }} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
