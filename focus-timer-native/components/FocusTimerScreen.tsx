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
import { SESSION_PRESETS, useFocusTimer } from '../hooks/useFocusTimer';
import { useProceduralPicture } from '../hooks/useProceduralPicture';
import { themeById } from '../themes';
import type { ThemeDefinition, ThemeId } from '../types';
import { formatTime } from '../utils/timer';

const SUBJECTS = ['No subject selected', 'Mathematics', 'Physics', 'Computer Science', 'Design & Art', 'Reading'];

function TimerRing({ size, progress, theme }: { size: number; progress: number; theme: ThemeDefinition }) {
  const ringPath = Skia.Path.Make();
  const inset = size * (8 / 300);
  ringPath.addArc(Skia.XYWHRect(inset, inset, size - inset * 2, size - inset * 2), -90, Math.max(0.01, Math.min(1, progress)) * 360);

  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Circle cx={size / 2} cy={size / 2} r={size * (142 / 300)} color={theme.ringTrack} style="stroke" strokeWidth={2.5} />
      <Path path={ringPath} color={theme.ringGlow} style="stroke" strokeWidth={7} strokeCap="round">
        <BlurMask blur={6} style="normal" />
      </Path>
      <Path path={ringPath} color={theme.ringProgress} style="stroke" strokeWidth={3} strokeCap="round" />
    </Canvas>
  );
}

function ThemeArtwork({
  themeId,
  width,
  height,
  active,
  motion,
  preview = false,
}: {
  themeId: ThemeId;
  width: number;
  height: number;
  active: boolean;
  motion: boolean;
  preview?: boolean;
}) {
  const picture = useProceduralPicture(themeId, width, height, active, motion, preview);
  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      {picture ? <Picture picture={picture} /> : null}
    </Canvas>
  );
}

const MainArtwork = React.memo(function MainArtwork({ themeId, width, height, motion }: {
  themeId: ThemeId;
  width: number;
  height: number;
  motion: boolean;
}) {
  const picture = useProceduralPicture(themeId, width, height, true, motion);
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {picture ? <Picture picture={picture} /> : null}
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

function ThemeCard({
  theme,
  width,
  active,
  galleryOpen,
  motion,
  onPress,
}: {
  theme: ThemeDefinition;
  width: number;
  active: boolean;
  galleryOpen: boolean;
  motion: boolean;
  onPress: () => void;
}) {
  const artHeight = theme.id === 'obsidian' ? 144 : 176;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Apply ${theme.name} theme`} onPress={onPress} style={[styles.themeCard, { backgroundColor: theme.cardColor, borderColor: active ? theme.accent : 'rgba(255,255,255,0.15)', width }]}>
      <View style={{ height: artHeight, overflow: 'hidden', backgroundColor: theme.cardColor }}>
        <ThemeArtwork themeId={theme.id} width={width} height={artHeight} active={galleryOpen} motion={motion} preview />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(4,5,12,0.2)' }]} />
        <View pointerEvents="none" style={[styles.moodTag, { borderColor: `${theme.accent}55` }]}>
          <Text style={styles.moodText}>{theme.mood}</Text>
        </View>
        {active ? (
          <View pointerEvents="none" style={[styles.activeBadge, { borderColor: `${theme.accent}99`, backgroundColor: `${theme.accent}30` }]}>
            <View style={[styles.badgeDot, { backgroundColor: theme.accent }]} />
            <Text style={[styles.badgeText, { color: theme.accent }]}>Active</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.themeCardBody}>
        <View style={styles.themeCopy}>
          <Text style={styles.themeTitle}>{theme.name}</Text>
          <Text style={styles.themeDescription}>{theme.description}</Text>
        </View>
        <Text style={styles.applyText}>{active ? 'Applied' : 'Apply'}</Text>
      </View>
    </Pressable>
  );
}

export default function FocusTimerScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [themeId, setThemeId] = useState<ThemeId>('obsidian');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [dropdown, setDropdown] = useState<'session' | 'subject' | null>(null);
  const [subject, setSubject] = useState(SUBJECTS[0]);
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

  const timer = useFocusTimer((wasBreak) => showToast(wasBreak ? 'Break complete — ready to focus!' : 'Focus session complete!'));
  const ringSize = Math.min(width * 0.8, 310, Math.max(220, height * 0.46));
  const galleryWidth = Math.min(width - 28, 520);
  const progress = timer.totalSeconds > 0 ? timer.remainingSeconds / timer.totalSeconds : 0;

  useEffect(() => () => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    if (transitionTimeout.current) clearTimeout(transitionTimeout.current);
  }, []);

  const applyTheme = (nextTheme: ThemeId) => {
    if (nextTheme === themeId) return;
    Animated.timing(fade, { toValue: 0.58, duration: 140, useNativeDriver: true }).start(() => {
      setThemeId(nextTheme);
      transitionTimeout.current = setTimeout(() => {
        Animated.timing(fade, { toValue: 0, duration: 340, useNativeDriver: true }).start();
      }, 30);
    });
    showToast(`Theme changed to ${themeById[nextTheme].name}`);
  };

  const choosePreset = (label: string, minutes: number) => {
    timer.selectPreset({ label, minutes });
    setDropdown(null);
    showToast(`${label} (${minutes}m)`);
  };

  const resetTimer = () => {
    timer.reset(true);
    setSettingsOpen(false);
    showToast('Timer reset to 25:00');
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
              <IconButton icon="sparkles-outline" label="Toggle full-art preview" onPress={() => setZenMode(true)} accent="#fff" border={theme.pillBorder} blurTarget={blurTarget} surface={theme.pill} />
              <View style={styles.headerCenter}>
                <Pressable onPress={() => setDropdown(dropdown === 'session' ? null : 'session')} style={[styles.sessionPill, { backgroundColor: theme.pill, borderColor: theme.pillBorder }]}>
                  <GlassLayer target={blurTarget} tint={theme.pill} />
                  <View style={[styles.statusDot, { backgroundColor: theme.accent }]} />
                  <Text numberOfLines={1} style={styles.sessionText}>{timer.sessionLabel}</Text>
                  <Ionicons name={dropdown === 'session' ? 'chevron-up' : 'chevron-down'} size={15} color="rgba(255,255,255,0.68)" />
                </Pressable>
                {dropdown === 'session' ? (
                  <View style={styles.sessionDropdown}>
                    <Text style={styles.dropdownHeading}>SESSION PRESETS</Text>
                    {SESSION_PRESETS.map((preset) => (
                      <Pressable key={preset.label} onPress={() => choosePreset(preset.label, preset.minutes)} style={styles.dropdownRow}>
                        <Text style={styles.dropdownText}>{preset.label}</Text>
                        <Text style={styles.dropdownHint}>{preset.minutes}m</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
              <View style={[styles.paletteFrame, { borderColor: theme.pillBorder }]}>
                <IconButton icon="color-palette-outline" label="Open Theme Gallery" onPress={() => setGalleryOpen(true)} accent="#fff" border="transparent" blurTarget={blurTarget} surface={theme.pill} />
                <View style={[styles.paletteDot, { backgroundColor: theme.accent }]} />
              </View>
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
                          <Pressable key={item} onPress={() => { setSubject(item); setDropdown(null); }} style={styles.dropdownRow}>
                            <Text style={styles.dropdownText}>{item}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.modeLabel, { color: theme.secondary }]}>{timer.isBreak ? 'BREAK' : 'TIMER'}</Text>
                  <Text adjustsFontSizeToFit numberOfLines={1} style={styles.timerDigits}>{formatTime(timer.remainingSeconds)}</Text>
                  <Pressable onPress={() => { timer.toggleBreak(); showToast(timer.isBreak ? 'Focus session resumed' : '5-minute break started'); }} style={[styles.breakPill, { backgroundColor: theme.pill, borderColor: theme.pillBorder }]}>
                    <GlassLayer target={blurTarget} tint={theme.pill} />
                    <Text style={styles.breakText}>{timer.isBreak ? 'Back to focus' : 'Take a break'}</Text>
                  </Pressable>
                </View>
              </View>

              <Pressable onPress={() => setGalleryOpen(true)} style={[styles.themePill, { backgroundColor: theme.pill, borderColor: theme.pillBorder }]}>
                <GlassLayer target={blurTarget} tint={theme.pill} />
                <View style={[styles.statusDot, { backgroundColor: theme.accent }]} />
                <Text style={[styles.themeLabel, { color: theme.secondary }]}>Theme:</Text>
                <Text style={styles.themeName}>{theme.name}</Text>
                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
              </Pressable>
            </View>

            <View style={styles.footer}>
              <IconButton icon="menu-outline" label="Options" onPress={() => setSettingsOpen(true)} accent="#fff" border={theme.pillBorder} blurTarget={blurTarget} surface={theme.pill} size={52} />
              <Pressable onPress={() => { timer.reset(false); showToast('Focus session stopped & reset'); }} style={[styles.actionButton, { backgroundColor: theme.stopBackground }]}>
                <Text style={[styles.actionText, { color: theme.stopText, fontWeight: '700' }]}>Stop Focus</Text>
              </Pressable>
              <Pressable onPress={() => { timer.togglePause(); showToast(timer.running ? 'Timer paused' : 'Timer resumed'); }} style={[styles.actionButton, { backgroundColor: theme.pauseBackground, borderColor: theme.pauseBorder, borderWidth: 1, overflow: 'hidden' }]}>
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

      <Modal visible={galleryOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setGalleryOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setGalleryOpen(false)} />
          <View style={[styles.gallerySheet, { width: galleryWidth, maxHeight: height * 0.88, paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeaderRow}>
                <View>
                  <View style={styles.galleryTitleRow}>
                    <Text style={styles.sheetTitle}>Theme Gallery</Text>
                    <Text style={styles.themeCount}>7 Themes</Text>
                  </View>
                  <Text style={styles.sheetSubtitle}>Real-time & still procedural environments</Text>
                </View>
                <Pressable onPress={() => setGalleryOpen(false)} accessibilityLabel="Close Theme Gallery" style={styles.closeButton}>
                  <Ionicons name="close" size={19} color="rgba(255,255,255,0.85)" />
                </Pressable>
              </View>
            </View>
            <ScrollView contentContainerStyle={styles.galleryList} showsVerticalScrollIndicator>
              {Object.values(themeById).map((definition) => (
                <ThemeCard
                  key={definition.id}
                  theme={definition}
                  width={galleryWidth - 32}
                  active={themeId === definition.id}
                  galleryOpen={galleryOpen}
                  motion={motionEnabled}
                  onPress={() => applyTheme(definition.id)}
                />
              ))}
            </ScrollView>
            <View style={styles.galleryFooter}>
              <Pressable onPress={() => { setGalleryOpen(false); setZenMode(true); }} style={styles.previewButton}>
                <Ionicons name="sparkles-outline" size={15} color="#fff" />
                <Text style={styles.previewButtonText}>Preview Full Art</Text>
              </Pressable>
              <Pressable onPress={() => setGalleryOpen(false)} style={styles.doneButton}>
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={settingsOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setSettingsOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSettingsOpen(false)} />
          <View style={[styles.settingsSheet, { width: Math.min(width - 32, 380), marginBottom: Math.max(insets.bottom, 10) }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Focus & Visual Settings</Text>
              <Pressable onPress={() => setSettingsOpen(false)} accessibilityLabel="Close settings" style={styles.closeButton}>
                <Ionicons name="close" size={19} color="rgba(255,255,255,0.85)" />
              </Pressable>
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>Living Atmosphere</Text>
                <Text style={styles.settingDescription}>Fireflies, drifting mist & gentle shimmer</Text>
              </View>
              <Switch
                value={motionEnabled}
                onValueChange={(value) => { setMotionEnabled(value); showToast(value ? 'Living atmosphere enabled' : 'Static artwork mode'); }}
                trackColor={{ false: '#41434b', true: '#168650' }}
                thumbColor={motionEnabled ? '#56e69b' : '#f3f4f6'}
                accessibilityLabel="Living Atmosphere"
              />
            </View>
            <Pressable onPress={resetTimer} style={styles.resetButton}>
              <Text style={styles.resetText}>Reset Timer to 25:00</Text>
            </Pressable>
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
  headerCenter: { flex: 1, alignItems: 'center', position: 'relative', zIndex: 6 },
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
  settingsTitle: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
  settingRow: { minHeight: 72, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  settingCopy: { flex: 1 },
  settingTitle: { color: '#fff', fontSize: 13, fontFamily: 'Inter_500Medium' },
  settingDescription: { color: 'rgba(255,255,255,0.54)', fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 4 },
  resetButton: { marginTop: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.08)', minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  resetText: { color: '#fff', fontFamily: 'Inter_500Medium', fontSize: 13 },
});