import { useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigation, AppRoute } from '../lib/navigation';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  Lightbulb,
  List,
  MinusCircle,
  PlusCircle,
  Sparkles,
  Star,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DetailHeader, useLayout, useSmartAndroidBack } from '../components/Shell';
import {
  SSDSBadge,
  SSDSButton,
  SSDSEmptyState,
  SSDSIcon,
  SSDSProgressBar,
  SSDSRow,
  SSDSSectionHeader,
  SSDSStack,
  SSDSSurface,
  SSDSText,
  useSSDSTheme,
} from '../lib/ssds';
import { EXAMS, getResources } from '../lib/data';
import { useStore } from '../lib/store';
import { createStudentContentSignedUrl } from '../lib/supabase';

export default function BookReaderScreen() {
  const { tokens } = useSSDSTheme();
  const nav = useNavigation<AppNavigation>();
  const route = useRoute<AppRoute<'BookReader'>>();
  const { state, dispatch } = useStore();
  const resources = useMemo(() => getResources(state.managedContent), [state.managedContent]);
  const { isMobile, isDesktop } = useLayout();
  const book =
    resources.find((r) => r.id === route.params?.resourceId) ??
    resources.find((r) => r.type === 'book')!;
  const [mode, setMode] = useState<'overview' | 'read'>('overview');
  const [page, setPage] = useState(0);
  const [fontSize, setFontSize] = useState(15.5);
  const [fileError, setFileError] = useState('');
  useSmartAndroidBack(
    useCallback(() => {
      if (mode !== 'read') return false;
      setMode('overview');
      return true;
    }, [mode]),
  );

  const pages = book.body;
  const takeaways = useMemo(
    () =>
      resources
        .filter((r) => r.id !== book.id && r.subject === book.subject)
        .flatMap((r) => r.body.slice(0, 2).map((b) => ({ from: r.title, text: b })))
        .slice(0, 4),
    [book, resources],
  );

  const progress = state.progress[book.id]?.percent ?? 0;
  const starred = state.starred.includes(book.id);

  const openHostedFile = async () => {
    setFileError('');
    try {
      const url = book.fileObjectPath
        ? await createStudentContentSignedUrl(book.fileObjectPath)
        : book.sourceUrl;
      if (!url) throw new Error('No file is attached to this resource.');
      await Linking.openURL(url);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : 'Unable to open this PDF.');
    }
  };

  const turn = (dir: 1 | -1) => {
    const next = Math.max(0, Math.min(pages.length - 1, page + dir));
    setPage(next);
    const pct = Math.round(((next + 1) / pages.length) * 100);
    dispatch({ type: 'progress', id: book.id, percent: pct, title: book.title });
    if (dir === 1) dispatch({ type: 'study', minutes: 2 });
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: tokens.colors.background }}
      edges={['top', 'bottom']}
    >
      <DetailHeader
        title={book.title}
        subtitle={`${book.author} · ${book.pages} pages`}
        onBack={() => (mode === 'read' ? setMode('overview') : nav.goBack())}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={starred ? 'Remove from starred' : 'Star book'}
            onPress={() => dispatch({ type: 'toggleStar', id: book.id })}
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
        }
      />

      {mode === 'overview' ? (
        <ScrollView
          contentContainerStyle={{
            padding: isMobile ? 16 : 24,
            maxWidth: 1120,
            width: '100%',
            alignSelf: 'center',
            paddingBottom: 48,
          }}
          showsVerticalScrollIndicator={false}
        >
          <SSDSSurface variant="outlined" padding={18}>
            <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 20 }}>
              <Image
                source={{ uri: book.cover }}
                style={{
                  width: isMobile ? '100%' : 180,
                  height: isMobile ? 220 : 240,
                  borderRadius: tokens.radius.lg,
                  backgroundColor: tokens.colors.surfaceSecondary,
                }}
              />
              <SSDSStack gap={12} style={{ flex: 1 }}>
                <SSDSRow wrap="wrap" gap={7}>
                  <SSDSBadge variant="primary" size="sm">
                    {EXAMS.find((e) => e.id === book.exam)?.short ?? ''}
                  </SSDSBadge>
                  <SSDSBadge variant="secondary" size="sm">
                    {book.subject}
                  </SSDSBadge>
                  <SSDSBadge variant="warning" size="sm">
                    {`★ ${book.rating}`}
                  </SSDSBadge>
                  <SSDSBadge variant="neutral" size="sm">
                    {`${book.downloads.toLocaleString('en-IN')} downloads`}
                  </SSDSBadge>
                </SSDSRow>

                <SSDSText
                  variant="ScreenTitle"
                  style={{ fontSize: isMobile ? 21 : 26, lineHeight: isMobile ? 28 : 32 }}
                >
                  {book.title}
                </SSDSText>
                <SSDSText variant="BodySecondary">{book.summary}</SSDSText>

                <SSDSStack gap={6}>
                  <SSDSRow justify="space-between">
                    <SSDSText variant="Caption" color="textSecondary">
                      Reading progress
                    </SSDSText>
                    <SSDSText variant="ButtonLabel" color="secondary">
                      {progress}%
                    </SSDSText>
                  </SSDSRow>
                  <SSDSProgressBar value={progress} color="secondary" showLabel={false} />
                </SSDSStack>

                <SSDSRow wrap="wrap" gap={10}>
                  <SSDSButton
                    leadingIcon={BookOpen}
                    onPress={() => setMode('read')}
                  >
                    {progress > 0 ? 'Continue reading' : 'Start reading'}
                  </SSDSButton>
                  <SSDSButton
                    variant="outline"
                    leadingIcon={Layers}
                    onPress={() =>
                      nav.navigate('PYQ', {
                        subject: book.subject,
                        headerBrand: route.params?.headerBrand,
                      })
                    }
                  >
                    Related PYQs
                  </SSDSButton>
                  {book.fileObjectPath || book.sourceUrl ? (
                    <SSDSButton
                      variant="secondary"
                      leadingIcon={ExternalLink}
                      onPress={openHostedFile}
                    >
                      Open hosted file
                    </SSDSButton>
                  ) : null}
                </SSDSRow>
                {fileError ? <SSDSText variant="ErrorText">{fileError}</SSDSText> : null}
              </SSDSStack>
            </View>
          </SSDSSurface>

          <View
            style={{
              flexDirection: isDesktop ? 'row' : 'column',
              gap: 16,
              marginTop: 16,
            }}
          >
            <SSDSSurface variant="outlined" padding={16} style={{ flex: 1 }}>
              <SSDSSectionHeader title="Table of contents" icon={List} compact />
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
                        borderBottomColor: tokens.colors.border,
                      })}
                    >
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 9,
                          backgroundColor: tokens.colors.surfaceSecondary,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <SSDSText variant="Caption" color="textSecondary">
                          {i + 1}
                        </SSDSText>
                      </View>
                      <SSDSText variant="BodyPrimary" style={{ flex: 1 }}>
                        {t}
                      </SSDSText>
                      <SSDSIcon icon={ChevronRight} size={15} color="textTertiary" />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <SSDSEmptyState
                  icon={List}
                  title="No chapters listed"
                  description="This resource is read as a single flowing document."
                />
              )}
            </SSDSSurface>

            <SSDSSurface variant="outlined" padding={16} style={{ flex: 1 }}>
              <SSDSSectionHeader
                title="Key takeaways from your library"
                icon={Lightbulb}
                compact
              />
              <SSDSStack gap={14}>
                {takeaways.map((t, i) => (
                  <SSDSStack key={i} gap={5}>
                    <SSDSText variant="Caption" color="secondary">
                      {t.from}
                    </SSDSText>
                    <SSDSText variant="BodySecondary">{t.text}</SSDSText>
                  </SSDSStack>
                ))}
                {!takeaways.length ? (
                  <SSDSText variant="BodySecondary" color="textTertiary">
                    Add more {book.subject} notes to your library and Sakha will cross-link
                    takeaways here.
                  </SSDSText>
                ) : null}
              </SSDSStack>
            </SSDSSurface>
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              borderBottomWidth: 1,
              borderBottomColor: tokens.colors.border,
              backgroundColor: tokens.colors.surface,
            }}
          >
            <SSDSText variant="Caption" color="textSecondary">
              Page {page + 1} of {pages.length}
            </SSDSText>
            <View style={{ flex: 1 }}>
              <SSDSProgressBar
                value={((page + 1) / pages.length) * 100}
                height={5}
                color="secondary"
                showLabel={false}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decrease font size"
              onPress={() => setFontSize((f) => Math.max(13, f - 1))}
              style={{ padding: 6 }}
            >
              <SSDSIcon icon={MinusCircle} size={19} color="textSecondary" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Increase font size"
              onPress={() => setFontSize((f) => Math.min(21, f + 1))}
              style={{ padding: 6 }}
            >
              <SSDSIcon icon={PlusCircle} size={19} color="textSecondary" />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{
              padding: isMobile ? 20 : 36,
              maxWidth: 760,
              width: '100%',
              alignSelf: 'center',
              paddingBottom: 40,
            }}
            showsVerticalScrollIndicator={false}
          >
            <SSDSText
              variant="Overline"
              color="secondary"
              style={{ letterSpacing: 1.3, marginBottom: 10 }}
            >
              {(book.toc?.[page] ?? book.subject).toUpperCase()}
            </SSDSText>
            <SSDSText
              variant="BodyPrimary"
              style={{ fontSize, lineHeight: fontSize * 1.75 }}
            >
              {pages[page]}
            </SSDSText>

            {page === pages.length - 1 ? (
              <SSDSSurface variant="outlined" padding={16} style={{ marginTop: 26 }}>
                <SSDSStack gap={10}>
                  <SSDSText variant="CardTitle">Chapter complete</SSDSText>
                  <SSDSText variant="BodySecondary">
                    Lock this in with 10 PYQs on {book.subject}, or ask Sakha to quiz you on
                    what you just read.
                  </SSDSText>
                  <SSDSRow wrap="wrap" gap={10}>
                    <SSDSButton
                      size="small"
                      leadingIcon={Layers}
                      onPress={() =>
                        nav.navigate('PYQ', {
                          subject: book.subject,
                          headerBrand: route.params?.headerBrand,
                        })
                      }
                    >
                      Practise PYQs
                    </SSDSButton>
                    <SSDSButton
                      size="small"
                      variant="secondary"
                      leadingIcon={Sparkles}
                      onPress={() =>
                        nav.navigate('SakhaAI', { prompt: `Quiz me on ${book.title}` })
                      }
                    >
                      Quiz me
                    </SSDSButton>
                  </SSDSRow>
                </SSDSStack>
              </SSDSSurface>
            ) : null}
          </ScrollView>

          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: tokens.colors.border,
              backgroundColor: tokens.colors.surface,
            }}
          >
            <SSDSButton
              variant="outline"
              leadingIcon={ChevronLeft}
              onPress={() => turn(-1)}
              style={{ flex: 1 }}
            >
              Previous
            </SSDSButton>
            <SSDSButton
              trailingIcon={ChevronRight}
              onPress={() => (page === pages.length - 1 ? setMode('overview') : turn(1))}
              style={{ flex: 1 }}
            >
              {page === pages.length - 1 ? 'Finish' : 'Next page'}
            </SSDSButton>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
