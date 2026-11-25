/* eslint-disable react-hooks/refs, react-hooks/immutability -- Animated values and web canvas nodes synchronize with native/web rendering APIs. */
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurTargetView, BlurView } from 'expo-blur';
import {
  BlurMask,
  Canvas,
  Circle,
  Path,
  Picture,
  Skia,
} from '@shopify/react-native-skia';
import React, { useEffect, useRef, useState } from 'react';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProceduralPicture } from '../hooks/useProceduralPicture';
import { themeById } from '../themes';
import type { ThemeDefinition, ThemeId } from '../types';
import { useStore } from '../lib/store';

const SUBJECTS = ['No subject selected', 'Mathematics', 'Physics', 'Computer Science', 'Design & Art', 'Reading'];

export type FocusTimerController = {
  totalSeconds: number;
  remainingSeconds: number;
  running: boolean;
  isBreak: boolean;
  sessionLabel: string;
  modeLabel: string;
};

type Props = {
  timer: FocusTimerController;
  subject: string;
  groupName: string;
  onPause: () => void;
  onStop: () => void;
  onBreak: () => void;
  onReset: () => void;
  onSubjectChange: (subject: string) => void;
  onChooseStudyTag: () => void;
  onGroupPress: () => void;
  onMusicPress: () => void;
  blockedAppsCount: number;
  onManageBlockedApps: () => void;
};

function formatTime(seconds: number) {
  const clamped = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

function TimerRing({ size, progress, theme }: { size: number; progress: number; theme: ThemeDefinition }) {
  if (typeof document !== 'undefined') {
    const radius = size * (142 / 300);
    const circumference = 2 * Math.PI * radius;
    const clampedProgress = Math.max(0, Math.min(1, progress));
    return (
      <Svg width={size} height={size} pointerEvents="none">
        <SvgCircle cx={size / 2} cy={size / 2} r={radius} stroke={theme.ringTrack} strokeWidth={2.5} fill="none" />
        <SvgCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.ringProgress}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clampedProgress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    );
  }

  const ringPath = Skia.Path.Make();
  const inset = size * (8 / 300);
  ringPath.addArc(Skia.XYWHRect(inset, inset, size - inset * 2, size - inset * 2), -90, Math.max(0.01, Math.min(1, progress)) * 360);

  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Circle cx={size / 2} cy={size / 2} r={size * (142 / 300)} color={theme.ringTrack} style="stroke" strokeWidth={2.5} />
      <Path path={ringPath} color={theme.ringGlow} style="stroke" strokeWidth={7} strokeCap="round">
        {typeof document !== 'undefined' ? null : <BlurMask blur={6} style="normal" />}
      </Path>
      <Path path={ringPath} color={theme.ringProgress} style="stroke" strokeWidth={3} strokeCap="round" />
    </Canvas>
  );
}

function WebThemeCanvas({ canvas, width, height }: { canvas: HTMLCanvasElement | null; width: number; height: number }) {
  const host = useRef<View | null>(null);

  useEffect(() => {
    const element = host.current as unknown as HTMLElement | null;
    if (!element) return;
    if (canvas) {
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.style.display = 'block';
      element.replaceChildren(canvas);
    } else {
      element.replaceChildren();
    }
  }, [canvas, height, width]);

  return <View ref={host} style={{ width, height, overflow: 'hidden' }} />;
}

const MainArtwork = React.memo(function MainArtwork({ themeId, width, height, motion }: {
  themeId: ThemeId;
  width: number;
  height: number;
  motion: boolean;
}) {
  const picture = useProceduralPicture(themeId, width, height, true, motion);
  if (typeof document !== 'undefined') {
    return <WebThemeCanvas canvas={picture as unknown as HTMLCanvasElement | null} width={width} height={height} />;
  }
  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      {picture ? <Picture picture={picture as never} /> : null}
    </Canvas>
  );
});

function IconButton({
  icon,
  label,
  onPress,
  accent,
  border,
  blurTarget,
  surface,
  size = 44,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  accent: string;
  border: string;
  blurTarget: React.RefObject<View | null>;
  surface: string;
  size?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, { width: size, height: size, borderColor: border, backgroundColor: surface, opacity: pressed ? 0.78 : 1 }]}
    >
      <GlassLayer target={blurTarget} tint={surface} />
      <Ionicons name={icon} size={20} color={accent} />
    </Pressable>
  );
}

function GlassLayer({ target, tint, intensity = 24 }: { target: React.RefObject<View | null>; tint: string; intensity?: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <BlurView blurTarget={target} blurMethod="dimezisBlurView" intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
    </View>
  );
}

export default function GeminiFocusTimer({
  timer,
  subject,
  groupName,
  onPause,
  onStop,
  onBreak,
  onReset,
  onSubjectChange,
  onChooseStudyTag,
  onGroupPress,
  onMusicPress,
  blockedAppsCount,
  onManageBlockedApps,
}: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useStore();
  const focusSettings = state.settings ?? ({ focusThemeId: 'obsidian', focusAnimationIntensity: 'balanced', reduceFocusMotion: false, focusDurationMinutes: 25 } as const);
  const themeId = Object.prototype.hasOwnProperty.call(themeById, focusSettings.focusThemeId)
    ? focusSettings.focusThemeId as ThemeId
    : 'obsidian';
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const motionEnabled = !focusSettings.reduceFocusMotion && focusSettings.focusAnimationIntensity !== 'minimal';
  const [dropdown, setDropdown] = useState<'session' | 'subject' | null>(null);
  const [toast, setToast] = useState('');
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTarget = useRef<View | null>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const theme = themeById[themeId];
  const artWidth = Math.max(1, Math.ceil(width));
  const artHeight = Math.max(1, Math.ceil(height));

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(''), 2400);
  };

  const ringSize = Math.min(width * 0.8, 310, Math.max(220, height * 0.46));
  const progress = timer.totalSeconds > 0 ? timer.remainingSeconds / timer.totalSeconds : 0;

  useEffect(() => () => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    if (transitionTimeout.current) clearTimeout(transitionTimeout.current);
  }, []);

  const applyTheme = (nextTheme: ThemeId) => {
    if (nextTheme === themeId) return;
    Animated.timing(fade, { toValue: 0.58, duration: 140, useNativeDriver: true }).start(() => {
      dispatch({ type: 'settings', patch: { focusThemeId: nextTheme } });
      transitionTimeout.current = setTimeout(() => {
        Animated.timing(fade, { toValue: 0, duration: 340, useNativeDriver: true }).start();
      }, 30);
    });
    showToast(`Theme changed to ${themeById[nextTheme].name}`);
  };


  const resetTimer = () => {
    onReset();
    setSettingsOpen(false);
    showToast('Session reset to 25:00');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <BlurTargetView ref={blurTarget} style={StyleSheet.absoluteFill}>
        <MainArtwork themeId={themeId} width={artWidth} height={artHeight} motion={motionEnabled} />
      </BlurTargetView>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.fadeCurtain, { opacity: fade }]} />

      {zenMode ? (
        <SafeAreaView style={styles.zenSafeArea} edges={['bottom']}>
          <Pressable onPress={() => setZenMode(false)} accessibilityRole="button" accessibilityLabel="Show timer UI" style={[styles.zenRestore, { borderColor: theme.pillBorder, backgroundColor: theme.pill, marginBottom: Math.max(insets.bottom, 14) }]}>
            <GlassLayer target={blurTarget} tint={theme.pill} />
            <Ionicons name="eye-outline" size={17} color="#fff" />
            <Text style={styles.zenRestoreText}>Show Timer UI</Text>
          </Pressable>
        </SafeAreaView>
      ) : (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={[styles.shell, { maxWidth: 430, paddingTop: Math.max(8, Math.min(insets.top, 20)), paddingBottom: 12 }]}>
            <View style={styles.header}>
              <View style={styles.headerSpacer} />
              <Pressable onPress={onGroupPress} accessibilityRole="button" accessibilityLabel="Select study group" style={[styles.groupPill, { backgroundColor: theme.pill, borderColor: theme.pillBorder }]}> 
                <GlassLayer target={blurTarget} tint={theme.pill} />
                <Ionicons name="people-outline" size={15} color="#fff" />
                <Text numberOfLines={1} style={styles.groupText}>Group</Text>
              </Pressable>
              <View style={styles.headerSpacer} />
            </View>

            <View style={styles.centerSection}>
              <View style={[styles.timerCircle, { width: ringSize, height: ringSize, borderRadius: ringSize / 2, backgroundColor: theme.timerBackdrop }]}>
                <TimerRing size={ringSize} progress={progress} theme={theme} />
                <View style={styles.timerContent}>
                  <View style={styles.subjectAnchor}>
                    <Pressable onPress={() => setDropdown(dropdown === 'subject' ? null : 'subject')} style={[styles.subjectPill, { backgroundColor: theme.pill, borderColor: theme.pillBorder }]}>
                      <GlassLayer target={blurTarget} tint={theme.pill} />
                      <Text style={[styles.subjectText, { color: theme.secondary }]}>{subject}</Text>
                      <Ionicons name="chevron-down" size={13} color={theme.secondary} />
                    </Pressable>
                    {dropdown === 'subject' ? (
                      <View style={styles.subjectDropdown}>
                        {SUBJECTS.map((item) => (
                          <Pressable key={item} onPress={() => { onSubjectChange(item); setDropdown(null); }} style={styles.dropdownRow}>
                            <Text style={styles.dropdownText}>{item}</Text>
                          </Pressable>
                        ))}
                        <Pressable onPress={() => { onChooseStudyTag(); setDropdown(null); }} style={styles.dropdownRow}>
                          <Text style={styles.dropdownText}>Choose Study Sakha subject…</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.modeLabel, { color: theme.secondary }]}>{timer.isBreak ? 'BREAK' : timer.modeLabel}</Text>
                  <Text adjustsFontSizeToFit numberOfLines={1} style={styles.timerDigits}>{formatTime(timer.remainingSeconds)}</Text>
                  <Pressable onPress={() => { onBreak(); showToast(timer.isBreak ? 'Focus session resumed' : '5-minute break started'); }} style={[styles.breakPill, { backgroundColor: theme.pill, borderColor: theme.pillBorder }]}>
                    <GlassLayer target={blurTarget} tint={theme.pill} />
                    <Text style={styles.breakText}>{timer.isBreak ? 'Back to focus' : 'Take a break'}</Text>
                  </Pressable>
                </View>
              </View>

            </View>

            <View style={styles.footer}>
              <IconButton icon="menu-outline" label="Options" onPress={() => setSettingsOpen(true)} accent="#fff" border={theme.pillBorder} blurTarget={blurTarget} surface={theme.pill} size={52} />
              <Pressable onPress={onStop} style={[styles.actionButton, { backgroundColor: theme.stopBackground }]}>
                <Text style={[styles.actionText, { color: theme.stopText, fontWeight: '700' }]}>Stop Focus</Text>
              </Pressable>
              <Pressable onPress={() => { onPause(); showToast(timer.running ? 'Timer paused' : 'Timer resumed'); }} style={[styles.actionButton, { backgroundColor: theme.pauseBackground, borderColor: theme.pauseBorder, borderWidth: 1, overflow: 'hidden' }]}>
                <GlassLayer target={blurTarget} tint={theme.pauseBackground} />
                <Text style={styles.actionText}>{timer.running ? 'Pause' : 'Resume'}</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      )}

      {toast ? (
        <View pointerEvents="none" style={[styles.toast, { top: insets.top + 10 }]}>
          <View style={[styles.toastDot, { backgroundColor: theme.accent }]} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}

      <Modal visible={settingsOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setSettingsOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSettingsOpen(false)} />
          <View style={[styles.settingsSheet, { width: Math.min(width - 32, 420), maxHeight: height * 0.82, marginBottom: Math.max(insets.bottom, 10) }]}> 
            <View style={styles.sheetHandle} />
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Focus & Visual Settings</Text>
              <Pressable onPress={() => setSettingsOpen(false)} accessibilityLabel="Close settings" style={styles.closeButton}>
                <Ionicons name="close" size={19} color="rgba(255,255,255,0.85)" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            <Text style={styles.sectionLabel}>Theme</Text>
            {Object.values(themeById).map((definition) => (
              <Pressable key={definition.id} onPress={() => applyTheme(definition.id)} style={styles.menuRow}>
                <Text style={styles.settingTitle}>{definition.name}</Text>
                {themeId === definition.id ? <Ionicons name="checkmark-circle" size={19} color={definition.accent} /> : null}
              </Pressable>
            ))}
            <Text style={styles.sectionLabel}>Audio</Text>
            <Pressable onPress={onMusicPress} style={styles.menuRow}>
              <Text style={styles.settingTitle}>Music</Text>
              <Text style={styles.resetText}>Choose</Text>
            </Pressable>
            <Text style={styles.sectionLabel}>Visual Settings</Text>
            <View style={styles.settingRow}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>Living Atmosphere</Text>
                <Text style={styles.settingDescription}>Fireflies, drifting mist & gentle shimmer</Text>
              </View>
              <Switch
                value={motionEnabled}
                onValueChange={(value) => {
                  dispatch({ type: 'settings', patch: { reduceFocusMotion: !value } });
                  showToast(value ? 'Living atmosphere enabled' : 'Static artwork mode');
                }}
                trackColor={{ false: '#41434b', true: '#168650' }}
                thumbColor={motionEnabled ? '#56e69b' : '#f3f4f6'}
                accessibilityLabel="Living Atmosphere"
              />
            </View>
            <Text style={styles.sectionLabel}>Timer</Text>
            <Pressable onPress={resetTimer} style={styles.resetButton}>
              <Text style={styles.resetText}>Reset Timer to {focusSettings.focusDurationMinutes}:00</Text>
            </Pressable>
            <Text style={styles.sectionLabel}>Blocked Apps</Text>
            <Pressable onPress={onManageBlockedApps} style={styles.menuRow}>
              <Text style={styles.settingTitle}>Blocked Apps ({blockedAppsCount})</Text>
              <Text style={styles.resetText}>Manage</Text>
            </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0c10' },
  safeArea: { flex: 1 },
  shell: { flex: 1, width: '100%', alignSelf: 'center', paddingHorizontal: 20, justifyContent: 'space-between' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, zIndex: 5 },
  headerSpacer: { width: 82, minHeight: 44 },
  headerCenter: { flex: 1, alignItems: 'center', position: 'relative', zIndex: 6 },
  groupPill: { width: 82, minHeight: 44, paddingHorizontal: 8, borderRadius: 24, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, overflow: 'hidden' },
  groupText: { maxWidth: 50, color: '#fff', fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  iconButton: { borderWidth: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sessionPill: { minHeight: 42, maxWidth: '100%', paddingHorizontal: 14, borderRadius: 28, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 9, overflow: 'hidden' },
  sessionText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_500Medium', flexShrink: 1 },
  statusDot: { width: 9, height: 9, borderRadius: 5, shadowColor: '#fff', shadowOpacity: 0.55, shadowRadius: 5 },
  paletteFrame: { borderWidth: 1, borderRadius: 24, position: 'relative', shadowColor: '#34c769', shadowOpacity: 0.4, shadowRadius: 10 },
  paletteDot: { position: 'absolute', width: 9, height: 9, right: -1, bottom: -1, borderRadius: 5, borderColor: '#0e1017', borderWidth: 2 },
  sessionDropdown: { position: 'absolute', top: 50, width: 240, padding: 7, borderRadius: 16, borderColor: 'rgba(255,255,255,0.14)', borderWidth: 1, backgroundColor: 'rgba(20,23,34,0.97)', zIndex: 20, elevation: 12 },
  dropdownHeading: { color: 'rgba(255,255,255,0.46)', fontSize: 10, fontFamily: 'Inter_700Bold', paddingHorizontal: 10, paddingVertical: 6, letterSpacing: 1 },
  dropdownRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, borderRadius: 10 },
  dropdownText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontFamily: 'Inter_500Medium' },
  dropdownHint: { color: 'rgba(255,255,255,0.48)', fontSize: 12, fontFamily: 'Inter_400Regular' },
  centerSection: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 0 },
  timerCircle: { alignItems: 'center', justifyContent: 'center' },
  timerContent: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 10, paddingHorizontal: 20 },
  subjectAnchor: { position: 'relative', zIndex: 10 },
  subjectPill: { minHeight: 31, maxWidth: 220, borderRadius: 20, borderWidth: 1, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7, overflow: 'hidden' },
  subjectText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  subjectDropdown: { position: 'absolute', top: 37, left: -35, width: 205, padding: 6, borderRadius: 15, backgroundColor: 'rgba(20,23,34,0.97)', borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1, elevation: 12, zIndex: 25 },
  modeLabel: { fontSize: 10, letterSpacing: 3, fontFamily: 'Inter_700Bold', marginTop: 1 },
  timerDigits: { color: '#fff', fontSize: 58, lineHeight: 66, includeFontPadding: false, fontFamily: 'Inter_800ExtraBold', fontVariant: ['tabular-nums'], textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 14 },
  breakPill: { marginTop: 1, borderRadius: 24, borderWidth: 1, paddingHorizontal: 19, paddingVertical: 8, overflow: 'hidden' },
  breakText: { color: 'rgba(255,255,255,0.96)', fontSize: 12, fontFamily: 'Inter_500Medium' },
  themePill: { marginTop: 22, borderWidth: 1, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, overflow: 'hidden' },
  themeLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  themeName: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold', maxWidth: 190 },
  footer: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8 },
  actionButton: { height: 54, flex: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  fadeCurtain: { backgroundColor: '#06070c', zIndex: 2 },
  toast: { position: 'absolute', zIndex: 50, alignSelf: 'center', maxWidth: '92%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 15, paddingVertical: 9, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.78)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  toastDot: { width: 7, height: 7, borderRadius: 4 },
  toastText: { color: '#fff', fontFamily: 'Inter_500Medium', fontSize: 11 },
  zenSafeArea: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  zenRestore: { flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 1, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, elevation: 8 },
  zenRestoreText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_500Medium' },
  modalRoot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.62)' },
  gallerySheet: { backgroundColor: 'rgba(16,19,28,0.98)', borderColor: 'rgba(255,255,255,0.14)', borderTopWidth: 1, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' },
  sheetHeader: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  sheetHandle: { width: 40, height: 4, borderRadius: 3, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.22)', marginBottom: 12 },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  galleryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetTitle: { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  themeCount: { color: 'rgba(255,255,255,0.78)', fontSize: 9, fontFamily: 'Inter_600SemiBold', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 15 },
  sheetSubtitle: { color: 'rgba(255,255,255,0.52)', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 3 },
  closeButton: { width: 34, height: 34, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  galleryList: { padding: 16, gap: 14, alignItems: 'center' },
  themeCard: { borderRadius: 15, borderWidth: 1, overflow: 'hidden' },
  moodTag: { position: 'absolute', top: 11, left: 11, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 15, paddingHorizontal: 9, paddingVertical: 5 },
  moodText: { color: 'rgba(255,255,255,0.95)', fontSize: 9, fontFamily: 'Inter_500Medium' },
  activeBadge: { position: 'absolute', top: 11, right: 11, borderWidth: 1, borderRadius: 16, paddingHorizontal: 9, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeDot: { width: 6, height: 6, borderRadius: 4 },
  badgeText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  themeCardBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 14 },
  themeCopy: { flex: 1 },
  themeTitle: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
  themeDescription: { color: 'rgba(255,255,255,0.68)', fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular', marginTop: 4 },
  applyText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 10, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 16 },
  galleryFooter: { paddingHorizontal: 18, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.3)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewButton: { flexDirection: 'row', gap: 6, alignItems: 'center', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: 'rgba(255,255,255,0.1)' },
  previewButtonText: { color: '#fff', fontSize: 11, fontFamily: 'Inter_500Medium' },
  doneButton: { borderRadius: 18, backgroundColor: '#fff', paddingHorizontal: 19, paddingVertical: 9 },
  doneText: { color: '#0d0f15', fontFamily: 'Inter_700Bold', fontSize: 11 },
  settingsSheet: { backgroundColor: 'rgba(18,21,32,0.98)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 24, padding: 18, marginBottom: 12 },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionLabel: { color: 'rgba(255,255,255,0.48)', fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1, marginTop: 10, marginBottom: 6 },
  menuRow: { minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  settingsTitle: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
  settingRow: { minHeight: 72, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  settingCopy: { flex: 1 },
  settingTitle: { color: '#fff', fontSize: 13, fontFamily: 'Inter_500Medium' },
  settingDescription: { color: 'rgba(255,255,255,0.54)', fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 4 },
  resetButton: { marginTop: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.08)', minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  resetText: { color: '#fff', fontFamily: 'Inter_500Medium', fontSize: 13 },
  moreOptionsButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  moreOptionsText: { color: 'rgba(255,255,255,0.72)', fontFamily: 'Inter_500Medium', fontSize: 12 },
});
