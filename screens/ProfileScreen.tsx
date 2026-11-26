/* eslint-disable react-hooks/refs, react-hooks/set-state-in-effect -- Preserves stable React Native Animated values and the sheet close animation lifecycle. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigation } from '../lib/navigation';
import { Shell, useLayout } from '../components/Shell';
import { getProfileContentMaxWidth } from '../lib/profileLayout';
import { dayKey, getDisplayName, useStore } from '../lib/store';
import { useTheme } from '../lib/theme';
import { EXAM_ID_BY_FOCUS } from '../lib/examCatalog';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BadgeCheck,
  BarChart3,
  Bell,
  BookOpen,
  Cake,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Contrast,
  Flame,
  GraduationCap,
  HelpCircle,
  Home,
  Layers,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Moon,
  Pencil,
  Phone,
  Plus,
  Repeat,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  Trophy,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react-native';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type TabKey = 'overview' | 'stats' | 'account';
type SheetKey = 'edit' | 'focus' | 'badges' | null;

interface ExamOption {
  id: string;
  label: string;
  desc: string;
}

interface ProfileState {
  name: string;
  email: string;
  birthday: string;
  phone: string;
  city: string;
  focus: string;
  studyMins: number;
  dailyGoal: number;
  photoUri?: string;
}

interface AnimatedBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
  maxHeightRatio?: number;
  children: React.ReactNode;
}

// ============================================================================
// CONSTANTS & THEME TOKENS
// ============================================================================


const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const HERO_RING_CIRCUMFERENCE = 194.77; // 2 * Math.PI * 31

const EXAM_OPTIONS: ExamOption[] = [
  { id: 'UPSC', label: 'UPSC CSE', desc: 'Civil Services & IAS' },
  { id: 'RAS', label: 'RAS', desc: 'Rajasthan Admin Services' },
  { id: 'RPSC/RSSB', label: 'RPSC / RSSB', desc: 'State Govt. Exams' },
  { id: 'SSC', label: 'SSC', desc: 'CGL, CHSL & GD' },
  { id: 'Banking', label: 'Banking', desc: 'IBPS, SBI & RBI' },
  { id: 'NEET', label: 'NEET', desc: 'Medical Entrance' },
];

const LIGHT_THEME = {
  appBg: '#F7F9FC',
  headerBg: 'rgba(247, 249, 252, 0.92)',
  headerBorder: 'rgba(226, 232, 240, 0.6)',
  cardBg: '#FFFFFF',
  cardBorder: 'rgba(226, 232, 240, 0.75)',
  cardBorderStrong: 'rgba(226, 232, 240, 0.85)',
  divider: '#F1F5F9',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  iconDefault: '#475569',
  iconMuted: '#94A3B8',
  subtleBg: '#F1F5F9',
  inputBg: '#F8FAFC',
  inputBorder: '#E2E8F0',
  segmentedBg: 'rgba(226, 232, 240, 0.7)',
  blueSoftBg: '#EFF6FF',
  blueSoftText: '#2563EB',
  amberSoftBg: '#FFFBEB',
  amberCardBg: 'rgba(255, 251, 235, 0.75)',
  amberCardBorder: 'rgba(253, 230, 138, 0.65)',
  amberText: '#D97706',
  indigoCardBg: 'rgba(238, 242, 255, 0.75)',
  indigoCardBorder: 'rgba(199, 210, 254, 0.65)',
  indigoText: '#4F46E5',
  emeraldSoftBg: '#ECFDF5',
  emeraldText: '#059669',
  tealSoftBg: '#F0FDFA',
  violetSoftBg: '#F5F3FF',
  violetText: '#7C3AED',
  slateDashedBg: '#F8FAFC',
  slateDashedBorder: '#E2E8F0',
  barInactive: '#F1F5F9',
  barFri: '#BFDBFE',
  barSat: '#93C5FD',
  goalTrack: '#F1F5F9',
  goalStroke: '#2563EB',
  ctaPrimaryBg: '#0F172A',
  ctaPrimaryText: '#FFFFFF',
  roseBg: '#FFF1F2',
  roseBorder: 'rgba(254, 205, 211, 0.7)',
  roseText: '#E11D48',
  navBg: 'rgba(255, 255, 255, 0.95)',
  navBorder: 'rgba(226, 232, 240, 0.7)',
  sheetBg: '#FFFFFF',
  sheetHandle: '#CBD5E1',
  toastBg: '#0F172A',
  toastText: '#FFFFFF',
  switchTrackOff: '#E2E8F0',
  focusInactiveBg: '#F8FAFC',
  focusInactiveBorder: 'rgba(226, 232, 240, 0.85)',
  focusActiveBg: '#EFF6FF',
  focusActiveText: '#1D4ED8',
};

const DARK_THEME = {
  appBg: '#0B0F19',
  headerBg: 'rgba(11, 15, 25, 0.92)',
  headerBorder: 'rgba(30, 41, 59, 0.7)',
  cardBg: '#0F172A',
  cardBorder: '#1E293B',
  cardBorderStrong: '#1E293B',
  divider: 'rgba(30, 41, 59, 0.85)',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  iconDefault: '#CBD5E1',
  iconMuted: '#64748B',
  subtleBg: '#1E293B',
  inputBg: 'rgba(30, 41, 59, 0.8)',
  inputBorder: '#334155',
  segmentedBg: 'rgba(30, 41, 59, 0.8)',
  blueSoftBg: 'rgba(23, 37, 84, 0.6)',
  blueSoftText: '#60A5FA',
  amberSoftBg: 'rgba(69, 26, 3, 0.5)',
  amberCardBg: 'rgba(69, 26, 3, 0.3)',
  amberCardBorder: 'rgba(146, 64, 14, 0.45)',
  amberText: '#FBBF24',
  indigoCardBg: 'rgba(30, 27, 75, 0.35)',
  indigoCardBorder: 'rgba(55, 48, 163, 0.45)',
  indigoText: '#818CF8',
  emeraldSoftBg: 'rgba(2, 44, 34, 0.55)',
  emeraldText: '#34D399',
  tealSoftBg: 'rgba(4, 47, 46, 0.55)',
  violetSoftBg: 'rgba(46, 16, 101, 0.5)',
  violetText: '#A78BFA',
  slateDashedBg: 'rgba(30, 41, 59, 0.6)',
  slateDashedBorder: '#334155',
  barInactive: '#1E293B',
  barFri: 'rgba(30, 58, 138, 0.7)',
  barSat: '#1E40AF',
  goalTrack: '#1E293B',
  goalStroke: '#60A5FA',
  ctaPrimaryBg: '#FFFFFF',
  ctaPrimaryText: '#0F172A',
  roseBg: 'rgba(76, 5, 25, 0.35)',
  roseBorder: 'rgba(136, 19, 55, 0.55)',
  roseText: '#FB7185',
  navBg: 'rgba(2, 6, 23, 0.94)',
  navBorder: 'rgba(30, 41, 59, 0.8)',
  sheetBg: '#0F172A',
  sheetHandle: '#334155',
  toastBg: '#FFFFFF',
  toastText: '#0F172A',
  switchTrackOff: '#334155',
  focusInactiveBg: 'rgba(30, 41, 59, 0.7)',
  focusInactiveBorder: '#334155',
  focusActiveBg: 'rgba(23, 37, 84, 0.55)',
  focusActiveText: '#93C5FD',
};

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Formats ISO YYYY-MM-DD dates into DD/MM/YYYY to match the original UI.
 * Preserves already formatted strings gracefully.
 */
function formatDisplayDate(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-');
    return `${d}/${m}/${y}`;
  }
  return trimmed;
}

/**
 * Computes up to 2 uppercase initials from the user's full name.
 */
function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join('') || 'U'
  );
}

// ============================================================================
// REUSABLE ANIMATED BOTTOM SHEET COMPONENT
// ============================================================================

/**
 * Mirrors the original HTML sheet backdrop fade + panel cubic-bezier slide-up animation.
 */
const AnimatedBottomSheet: React.FC<AnimatedBottomSheetProps> = ({
  visible,
  onClose,
  isDark,
  maxHeightRatio = 0.9,
  children,
}) => {
  const { height: screenHeight } = useWindowDimensions();
  const screenHeightRef = useRef(screenHeight);
  screenHeightRef.current = screenHeight;
  const [mounted, setMounted] = useState(visible);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 320,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: screenHeightRef.current,
          duration: 260,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMounted(false);
      });
    }
  }, [visible, mounted, backdropOpacity, translateY]);

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlayRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View
            style={[
              styles.sheetBackdrop,
              { opacity: backdropOpacity },
            ]}
          />
        </Pressable>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetKeyboardWrapper}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheetPanel,
              {
                backgroundColor: theme.sheetBg,
                borderTopColor: theme.cardBorder,
                maxHeight: screenHeight * maxHeightRatio,
                transform: [{ translateY }],
              },
            ]}
          >
            {/* Drag Handle */}
            <View
              style={[
                styles.sheetHandle,
                { backgroundColor: theme.sheetHandle },
              ]}
            />
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// ============================================================================
// MAIN SCREEN COMPONENT
// ============================================================================

export default function StudySakhaProfileScreen() {
  const nav = useNavigation<AppNavigation>();
  const { width: profileViewportWidth } = useWindowDimensions();
  const profileContentMaxWidth = getProfileContentMaxWidth(profileViewportWidth);
  const { isMobile } = useLayout();
  const { state, badges, todayMinutes, streak, dispatch, saveProfile, signOut } = useStore();
  const { scheme } = useTheme();
  const isDark = scheme === 'dark';
  const profile = useMemo<ProfileState>(() => ({
    name: getDisplayName(state.user),
    email: state.user?.email ?? '',
    birthday: state.user?.birthday ?? '',
    phone: state.user?.phoneNumber ?? '',
    city: state.user?.currentCity ?? '',
    focus: state.user?.examFocus?.trim() || state.user?.exam.toUpperCase() || 'UPSC',
    studyMins: Math.round(todayMinutes),
    dailyGoal: Math.max(1, state.settings.dailyGoalMin),
    photoUri: state.user?.photoUri,
  }), [state.settings.dailyGoalMin, state.user, todayMinutes]);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [activeSheet, setActiveSheet] = useState<SheetKey>(null);
  const [notesVisible, setNotesVisible] = useState<boolean>(false);

  // Edit Profile form draft state
  const [draftName, setDraftName] = useState<string>('');
  const [draftEmail, setDraftEmail] = useState<string>('');
  const [draftBirthday, setDraftBirthday] = useState<string>('');
  const [draftPhone, setDraftPhone] = useState<string>('');
  const [draftCity, setDraftCity] = useState<string>('');
  const [draftFocus, setDraftFocus] = useState<string>('UPSC');
  const [draftPhotoUri, setDraftPhotoUri] = useState<string | undefined>();
  const [savingProfile, setSavingProfile] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string>('Saved!');
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(8)).current;
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animations (rings, tab transition, pulse dot, dark switch, bars)
  const heroRingOffsetAnim = useRef(new Animated.Value(HERO_RING_CIRCUMFERENCE * 0.5)).current;
  const tabFadeAnim = useRef(new Animated.Value(1)).current;
  const tabSlideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const switchKnobAnim = useRef(new Animated.Value(0)).current;
  const todayBarAnim = useRef(new Animated.Value(36)).current;
  const nudgeBarAnim = useRef(new Animated.Value(50)).current;

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  // Derived metrics (exact formulas from original JS)
  const initials = useMemo(() => getInitials(profile.name), [profile.name]);
  const earnedBadges = badges.filter((badge) => badge.earned).length;
  const previewBadges = badges.filter((badge) => badge.id !== 'b3').slice(0, 3);
  const totalStudyMins = useMemo(
    () => Math.round(Object.values(state.studyLog).reduce((total, minutes) => total + minutes, 0)),
    [state.studyLog]
  );
  const highestTestPercentile = state.results.reduce(
    (highest, result) => Math.max(highest, result.percentile),
    0
  );
  const weeklyData = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);
      const key = dayKey(date);
      const minutes = Math.round(state.studyLog[key] ?? 0);
      return {
        key,
        label: key === dayKey(now) ? 'Today' : ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()],
        today: key === dayKey(now),
        minutes,
        height: Math.max(10, Math.min(100, Math.round((minutes / profile.dailyGoal) * 100))),
      };
    });
  }, [profile.dailyGoal, state.studyLog]);

  const completionData = useMemo(() => {
    const fields = [
      profile.name,
      profile.email,
      profile.focus,
      profile.birthday,
      profile.phone,
      profile.city,
    ];
    const filled = fields.filter(Boolean).length;
    const pct = Math.round((filled / fields.length) * 100);
    const missing: string[] = [];
    if (!profile.city) missing.push('city');
    if (!profile.phone) missing.push('phone');
    if (!profile.birthday) missing.push('birthday');
    return { pct, missing };
  }, [profile]);

  // Emerald status dot pulse animation (matches Tailwind animate-pulse)
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Animate hero profile completion ring & nudge bar whenever completion changes
  useEffect(() => {
    const targetOffset =
      HERO_RING_CIRCUMFERENCE - (HERO_RING_CIRCUMFERENCE * completionData.pct) / 100;

    Animated.parallel([
      Animated.timing(heroRingOffsetAnim, {
        toValue: targetOffset,
        duration: 500,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: false,
      }),
      Animated.timing(nudgeBarAnim, {
        toValue: completionData.pct,
        duration: 500,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: false,
      }),
    ]).start();
  }, [completionData.pct, heroRingOffsetAnim, nudgeBarAnim]);

  // Animate dark mode toggle knob
  useEffect(() => {
    Animated.timing(switchKnobAnim, {
      toValue: isDark ? 20 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isDark, switchKnobAnim]);

  useEffect(() => {
    const today = weeklyData.find((day) => day.today);
    Animated.timing(todayBarAnim, {
      toValue: today?.height ?? 10,
      duration: 500,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start();
  }, [todayBarAnim, weeklyData]);

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // ============================================================================
  // INTERACTION HANDLERS
  // ============================================================================

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(toastTranslateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    toastTimerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslateY, {
          toValue: 8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2200);
  };

  const handleSwitchTab = (tab: TabKey) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    tabFadeAnim.setValue(0);
    tabSlideAnim.setValue(6);
    Animated.parallel([
      Animated.timing(tabFadeAnim, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(tabSlideAnim, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleToggleDarkMode = () => {
    const next = !isDark;
    dispatch({ type: 'settings', patch: { themeMode: next ? 'dark' : 'light' } });
    showToast(next ? 'Dark mode enabled' : 'Light mode enabled');
  };

  const handleOpenSheet = (sheet: Exclude<SheetKey, null>) => {
    if (sheet === 'edit') {
      setDraftName(profile.name);
      setDraftEmail(profile.email);
      setDraftBirthday(profile.birthday);
      setDraftPhone(profile.phone);
      setDraftCity(profile.city);
      setDraftFocus(profile.focus);
      setDraftPhotoUri(profile.photoUri);
    }
    setActiveSheet(sheet);
  };

  const handleCloseSheet = () => {
    setActiveSheet(null);
  };

  const handleSetFocus = async (examId: string) => {
    if (savingProfile) return;
    setSavingProfile(true);
    try {
      const exam = EXAM_ID_BY_FOCUS[examId];
      const result = await saveProfile({
        examFocus: examId,
        ...(exam ? { exam } : {}),
      });
      if (!result.ok) {
        Alert.alert('Unable to update exam focus', result.error);
        return;
      }
      setDraftFocus(examId);
      setActiveSheet(null);
      showToast(`Exam focus switched to ${examId}`);
    } catch (error) {
      Alert.alert(
        'Unable to update exam focus',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveProfile = async () => {
    if (savingProfile) return;
    const trimmedName = draftName.trim();
    const trimmedEmail = draftEmail.trim() || profile.email;
    if (trimmedName.length < 2) {
      Alert.alert('Name required', 'Please enter at least two characters for your name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      Alert.alert('Email required', 'Enter a valid email address.');
      return;
    }

    setSavingProfile(true);
    try {
      const exam = EXAM_ID_BY_FOCUS[draftFocus];
      const result = await saveProfile({
        name: trimmedName,
        email: trimmedEmail,
        birthday: draftBirthday.trim(),
        phoneNumber: draftPhone.trim(),
        currentCity: draftCity.trim(),
        examFocus: draftFocus,
        photoUri: draftPhotoUri,
        ...(exam ? { exam } : {}),
      });
      if (!result.ok) {
        Alert.alert('Profile not saved', result.error);
        return;
      }
      setActiveSheet(null);
      showToast('Profile updated successfully');
      if (result.emailChangePending) {
        Alert.alert('Check your email', 'A confirmation link was sent before the new email address can be used.');
      }
    } catch (error) {
      Alert.alert(
        'Profile not saved',
        error instanceof Error ? error.message : 'Unable to save profile changes.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChoosePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
        base64: Platform.OS === 'web',
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) throw new Error('The image picker returned no selected photo.');
      if (Platform.OS === 'web') {
        if (!asset.base64) throw new Error('The selected photo could not be read by the browser.');
        setDraftPhotoUri(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
      } else {
        const extension = asset.fileName?.split('.').pop()?.toLowerCase();
        const safeExtension = extension && ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(extension)
          ? extension
          : 'jpg';
        const destination = new File(Paths.document, `study-sakha-profile-${Date.now()}.${safeExtension}`);
        await new File(asset.uri).copy(destination);
        setDraftPhotoUri(destination.uri);
      }
    } catch (error) {
      Alert.alert(
        'Unable to select profile photo',
        error instanceof Error ? error.message : 'Please try another image.'
      );
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You can sign back in at any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await signOut();
            if (!result.ok) Alert.alert('Unable to sign out', result.error ?? 'Please try again.');
          } catch (error) {
            Alert.alert(
              'Unable to sign out',
              error instanceof Error ? error.message : 'Please try again.'
            );
          }
        },
      },
    ]);
  };

  // Interpolated animated widths/heights
  const animatedNudgeWidth = nudgeBarAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const animatedTodayBarHeight = todayBarAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Shell active="Profile" title="" scroll={false} contentPadding={0}>
      <View style={[styles.safeArea, { backgroundColor: theme.appBg }]}>
      <View style={[styles.appContainer, { backgroundColor: theme.appBg }]}>
        {/* ==================== TOP APP HEADER ==================== */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.headerBg,
              borderBottomColor: theme.headerBorder,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => showToast('Navigation drawer opened')}
              style={styles.headerIconBtn}
            >
              <Menu size={20} color={theme.iconDefault} />
            </TouchableOpacity>

            <View style={styles.brandRow}>
              <LinearGradient
                colors={['#FBBF24', '#F97316']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.brandLogoBox}
              >
                <Text style={styles.brandOwlEmoji}>🦉</Text>
              </LinearGradient>
              <View style={styles.brandTextRow}>
                <Text style={[styles.brandStudyText, { color: theme.textPrimary }]}>
                  Study
                </Text>
                <Text style={styles.brandSakhaText}> Sakha</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleToggleDarkMode}
              accessibilityLabel="Toggle Theme"
              style={styles.headerIconBtn}
            >
              {isDark ? (
                <Sun size={18} color="#FBBF24" />
              ) : (
                <Moon size={18} color={theme.iconDefault} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => showToast('2 unread exam updates')}
              style={styles.headerIconBtn}
            >
              <Bell size={18} color={theme.iconDefault} />
              <View
                style={[
                  styles.notifBadge,
                  { borderColor: theme.appBg },
                ]}
              >
                <Text style={styles.notifBadgeText}>2</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setNotesVisible(true)}
              accessibilityLabel="UX Design Notes"
              style={[
                styles.headerIconBtn,
                { backgroundColor: theme.blueSoftBg },
              ]}
            >
              <Sparkles size={18} color={theme.blueSoftText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ==================== SCROLLABLE MAIN CONTENT ==================== */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. SMART HERO PROFILE CARD */}
          <View style={[styles.heroCard, { width: '100%', maxWidth: profileContentMaxWidth, alignSelf: 'center' }]}>
            {/* Hero Mesh Gradient Background (Exact match to CSS .hero-mesh) */}
            <Svg
              width="100%"
              height="100%"
              style={StyleSheet.absoluteFill}
              preserveAspectRatio="none"
            >
              <Defs>
                <SvgLinearGradient id="heroBaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={isDark ? '#090D16' : '#0F172A'} />
                  <Stop offset="53%" stopColor={isDark ? '#172554' : '#1E3A8A'} />
                  <Stop offset="100%" stopColor={isDark ? '#1D4ED8' : '#2563EB'} />
                </SvgLinearGradient>
                <RadialGradient id="heroGlowTopRight" cx="88%" cy="15%" r="55%">
                  <Stop
                    offset="0%"
                    stopColor="#38BDF8"
                    stopOpacity={isDark ? '0.25' : '0.35'}
                  />
                  <Stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
                </RadialGradient>
                <RadialGradient id="heroGlowBottomLeft" cx="12%" cy="95%" r="58%">
                  <Stop
                    offset="0%"
                    stopColor="#6366F1"
                    stopOpacity={isDark ? '0.30' : '0.35'}
                  />
                  <Stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#heroBaseGrad)" />
              <Rect width="100%" height="100%" fill="url(#heroGlowTopRight)" />
              <Rect width="100%" height="100%" fill="url(#heroGlowBottomLeft)" />
            </Svg>

            {/* Subtle geometric ring accents */}
            <View style={styles.heroRingOuter} pointerEvents="none" />
            <View style={styles.heroRingInner} pointerEvents="none" />

            {/* Top Row: Avatar + Identity + Quick Edit */}
            <View style={styles.heroTopRow}>
              <View style={styles.heroIdentityGroup}>
                {/* Avatar with Profile Completion SVG Ring */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleOpenSheet('edit')}
                  style={styles.heroAvatarWrapper}
                >
                  <Svg width={68} height={68} viewBox="0 0 68 68">
                    <Circle
                      cx={34}
                      cy={34}
                      r={31}
                      fill="none"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth={3}
                    />
                    <AnimatedCircle
                      cx={34}
                      cy={34}
                      r={31}
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeDasharray={HERO_RING_CIRCUMFERENCE}
                      strokeDashoffset={heroRingOffsetAnim}
                      rotation={-90}
                      origin="34, 34"
                    />
                  </Svg>

                  {profile.photoUri ? (
                    <Image
                      source={{ uri: profile.photoUri }}
                      resizeMode="cover"
                      style={styles.heroAvatarCircle}
                    />
                  ) : (
                    <LinearGradient
                      colors={['#FBBF24', '#F97316', '#F43F5E']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.heroAvatarCircle}
                    >
                      <Text style={styles.heroAvatarInitials}>{initials}</Text>
                    </LinearGradient>
                  )}

                  <View style={styles.heroCameraBadge}>
                    <Camera size={12} color="#0F172A" />
                  </View>
                </TouchableOpacity>

                <View style={styles.heroTextCol}>
                  <View style={styles.heroNameRow}>
                    <Text style={styles.heroName} numberOfLines={1}>
                      {profile.name}
                    </Text>
                    <View style={styles.adminPill}>
                      <Text style={styles.adminPillText}>
                        {state.user?.role === 'admin' ? 'ADMIN' : 'LEARNER'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.heroEmail} numberOfLines={1}>
                    {profile.email}
                  </Text>

                  {/* Interactive Exam Focus Pill */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleOpenSheet('focus')}
                    style={styles.heroFocusPill}
                  >
                    <Animated.View
                      style={[
                        styles.focusPulseDot,
                        { opacity: pulseAnim },
                      ]}
                    />
                    <Text style={styles.heroFocusText}>
                      Focus:{' '}
                      <Text style={styles.heroFocusBold}>{profile.focus}</Text>
                    </Text>
                    <ChevronDown size={14} color="#BFDBFE" />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleOpenSheet('edit')}
                accessibilityLabel="Edit Profile"
                style={styles.heroQuickEditBtn}
              >
                <Pencil size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Glanceable Micro-Metrics Strip */}
            <View style={styles.heroMetricsStrip}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => handleSwitchTab('stats')}
                style={styles.heroMetricItem}
              >
                <View style={styles.heroMetricValueRow}>
                  <Text style={styles.heroFireEmoji}>🔥</Text>
                  <Text style={styles.heroMetricValue}>
                    {streak} {streak === 1 ? 'day' : 'days'}
                  </Text>
                </View>
                <Text style={styles.heroMetricLabel}>Study Streak</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => handleSwitchTab('stats')}
                style={styles.heroMetricItem}
              >
                <View style={styles.heroMetricValueRow}>
                  <Clock size={14} color="#7DD3FC" />
                  <Text style={styles.heroMetricValue}>
                    {profile.studyMins} min
                  </Text>
                </View>
                <Text style={styles.heroMetricLabel}>Today&apos;s Study</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => handleOpenSheet('badges')}
                style={styles.heroMetricItem}
              >
                <View style={styles.heroMetricValueRow}>
                  <Award size={14} color="#6EE7B7" />
                  <Text style={styles.heroMetricValue}>
                    {earnedBadges} / {badges.length}
                  </Text>
                </View>
                <Text style={styles.heroMetricLabel}>Badges</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. SMART PROFILE COMPLETION NUDGE (Auto-hides at 100%) */}
          {completionData.pct < 100 && (
            <View
              style={[
                styles.nudgeCard,
              { width: '100%', maxWidth: profileContentMaxWidth, alignSelf: 'center' },
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorderStrong,
                },
              ]}
            >
              <View style={styles.nudgeLeft}>
                <View
                  style={[
                    styles.nudgeIconBox,
                    { backgroundColor: theme.blueSoftBg },
                  ]}
                >
                  <UserCheck size={20} color={theme.blueSoftText} />
                </View>

                <View style={styles.nudgeTextWrap}>
                  <Text
                    style={[styles.nudgeTitle, { color: theme.textPrimary }]}
                    numberOfLines={1}
                  >
                    Profile {completionData.pct}% complete
                  </Text>
                  <Text
                    style={[styles.nudgeSubtitle, { color: theme.textSecondary }]}
                    numberOfLines={1}
                  >
                    Add {completionData.missing.join(', ')} for localized exam alerts
                  </Text>
                  <View
                    style={[
                      styles.nudgeTrack,
                      { backgroundColor: theme.subtleBg },
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.nudgeFillWrap,
                        { width: animatedNudgeWidth },
                      ]}
                    >
                      <LinearGradient
                        colors={['#3B82F6', '#0EA5A4']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.nudgeFillGradient}
                      />
                    </Animated.View>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleOpenSheet('edit')}
                style={[
                  styles.nudgeFinishBtn,
                  { backgroundColor: theme.ctaPrimaryBg },
                ]}
              >
                <Text
                  style={[
                    styles.nudgeFinishText,
                    { color: theme.ctaPrimaryText },
                  ]}
                >
                  Finish
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 3. MODERN SEGMENTED TAB BAR */}
          <View
            style={[
              styles.segmentedBar,
              { width: '100%', maxWidth: profileContentMaxWidth, alignSelf: 'center' },
              { backgroundColor: theme.segmentedBg },
            ]}
          >
            {(
              [
                { key: 'overview', label: 'Overview' },
                { key: 'stats', label: 'Statistics' },
                { key: 'account', label: 'Account' },
              ] as { key: TabKey; label: string }[]
            ).map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  activeOpacity={0.8}
                  onPress={() => handleSwitchTab(tab.key)}
                  style={[
                    styles.segmentedTabBtn,
                    isActive && [
                      styles.segmentedTabBtnActive,
                      { backgroundColor: theme.cardBg },
                    ],
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentedTabText,
                      {
                        color: isActive ? theme.textPrimary : theme.textSecondary,
                        fontWeight: isActive ? '700' : '600',
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ==================== ANIMATED TAB CONTENT ==================== */}
          <Animated.View
            style={{
              opacity: tabFadeAnim,
              transform: [{ translateY: tabSlideAnim }],
              width: '100%',
              maxWidth: profileContentMaxWidth,
              alignSelf: 'center',
            }}
          >
            {/* ==================== TAB 1: OVERVIEW ==================== */}
            {activeTab === 'overview' && (
              <View style={styles.tabStack}>
                {/* Your Badges Preview Card */}
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.cardBg,
                      borderColor: theme.cardBorder,
                    },
                  ]}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardHeaderLeft}>
                      <View
                        style={[
                          styles.smallIconBadge,
                          { backgroundColor: theme.amberSoftBg },
                        ]}
                      >
                        <Trophy size={16} color="#F59E0B" />
                      </View>
                      <Text
                        style={[styles.cardTitle, { color: theme.textPrimary }]}
                      >
                        Your Badges
                      </Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleOpenSheet('badges')}
                      style={styles.inlineLinkBtn}
                    >
                      <Text
                        style={[
                          styles.inlineLinkText,
                          { color: theme.blueSoftText },
                        ]}
                      >
                        View all
                      </Text>
                      <ChevronRight size={14} color={theme.blueSoftText} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.badgeGrid3}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleOpenSheet('badges')}
                      style={[
                        styles.badgeMiniCard,
                        {
                          backgroundColor: theme.amberCardBg,
                          borderColor: theme.amberCardBorder,
                        },
                      ]}
                    >
                      <Text style={styles.badgeEmoji}>🔥</Text>
                      <Text
                        style={[
                          styles.badgeMiniTitle,
                          { color: theme.textPrimary },
                        ]}
                      >
                        {previewBadges[0]?.name ?? 'Badge'}
                      </Text>
                      <Text
                        style={[
                          styles.badgeMiniStatus,
                          { color: theme.amberText },
                        ]}
                      >
                        {previewBadges[0]?.earned ? 'Earned' : 'Locked'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleOpenSheet('badges')}
                      style={[
                        styles.badgeMiniCard,
                        {
                          backgroundColor: theme.indigoCardBg,
                          borderColor: theme.indigoCardBorder,
                        },
                      ]}
                    >
                      <Text style={styles.badgeEmoji}>⚡</Text>
                      <Text
                        style={[
                          styles.badgeMiniTitle,
                          { color: theme.textPrimary },
                        ]}
                      >
                        {previewBadges[1]?.name ?? 'Badge'}
                      </Text>
                      <Text
                        style={[
                          styles.badgeMiniStatus,
                          { color: theme.indigoText },
                        ]}
                      >
                        {previewBadges[1]?.earned ? 'Earned' : 'Locked'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleOpenSheet('badges')}
                      style={[
                        styles.badgeMiniCard,
                        !previewBadges[2]?.earned && styles.badgeMiniLocked,
                        {
                          backgroundColor: previewBadges[2]?.earned
                            ? theme.amberCardBg
                            : theme.slateDashedBg,
                          borderColor: previewBadges[2]?.earned
                            ? theme.amberCardBorder
                            : theme.slateDashedBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeEmoji,
                          !previewBadges[2]?.earned && styles.lockedEmoji,
                        ]}
                      >
                        🎯
                      </Text>
                      <Text
                        style={[
                          styles.badgeMiniTitle,
                          {
                            color: previewBadges[2]?.earned
                              ? theme.textPrimary
                              : theme.textSecondary,
                          },
                        ]}
                      >
                        {previewBadges[2]?.name ?? 'Badge'}
                      </Text>
                      {previewBadges[2]?.earned ? (
                        <Text
                          style={[
                            styles.badgeMiniStatus,
                            { color: theme.amberText },
                          ]}
                        >
                          Earned
                        </Text>
                      ) : (
                        <Text style={styles.badgeMiniLockedStatus}>
                          {streak} / 30 streak days
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Quick Actions Bento */}
                <View style={styles.bentoGrid2}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleOpenSheet('focus')}
                    style={[
                      styles.bentoActionCard,
                      {
                        backgroundColor: theme.cardBg,
                        borderColor: theme.cardBorder,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.bentoIconBox,
                        { backgroundColor: theme.tealSoftBg },
                      ]}
                    >
                      <Repeat size={16} color="#0EA5A4" />
                    </View>
                    <Text
                      style={[
                        styles.bentoActionTitle,
                        { color: theme.textPrimary },
                      ]}
                    >
                      Switch Focus
                    </Text>
                    <Text
                      style={[
                        styles.bentoActionSub,
                        { color: theme.textSecondary },
                      ]}
                    >
                      UPSC, RAS, SSC...
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => nav.navigate('StudyPlanner')}
                    style={[
                      styles.bentoActionCard,
                      {
                        backgroundColor: theme.cardBg,
                        borderColor: theme.cardBorder,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.bentoIconBox,
                        { backgroundColor: theme.violetSoftBg },
                      ]}
                    >
                      <Sparkles size={16} color={theme.violetText} />
                    </View>
                    <Text
                      style={[
                        styles.bentoActionTitle,
                        { color: theme.textPrimary },
                      ]}
                    >
                      AI Study Plan
                    </Text>
                    <Text
                      style={[
                        styles.bentoActionSub,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Tailored to {profile.focus}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ==================== TAB 2: STATISTICS ==================== */}
            {activeTab === 'stats' && (
              <View style={styles.tabStack}>
                {/* Weekly Study Activity Bar Chart */}
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.cardBg,
                      borderColor: theme.cardBorder,
                    },
                  ]}
                >
                  <View style={styles.weeklyHeader}>
                    <View>
                      <Text
                        style={[styles.cardTitle, { color: theme.textPrimary }]}
                      >
                        Weekly Study Activity
                      </Text>
                      <Text
                        style={[
                          styles.weeklySub,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Mon – Sun focus minutes
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.activeDaysPill,
                        { backgroundColor: theme.emeraldSoftBg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.activeDaysText,
                          { color: theme.emeraldText },
                        ]}
                      >
                        {weeklyData.filter((day) => day.minutes > 0).length}d Active
                      </Text>
                    </View>
                  </View>

                  <View style={styles.barChartRow}>
                    {weeklyData.map((day, idx) => (
                      <View key={day.key} style={styles.barCol}>
                        <View style={styles.barTrack}>
                          {day.today ? (
                            <Animated.View
                              style={[
                                styles.todayBarWrap,
                                { height: animatedTodayBarHeight },
                              ]}
                            >
                              <LinearGradient
                                colors={['#38BDF8', '#2563EB']}
                                start={{ x: 0.5, y: 0 }}
                                end={{ x: 0.5, y: 1 }}
                                style={styles.todayBarGradient}
                              />
                            </Animated.View>
                          ) : (
                            <View
                              style={[
                                styles.barFill,
                                {
                                  height: `${day.height}%` as `${number}%`,
                                  backgroundColor:
                                    idx === 4 ? theme.barFri : idx > 4 ? theme.barSat : theme.barInactive,
                                },
                              ]}
                            />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.barDayLabel,
                            {
                              color: day.today ? theme.blueSoftText : theme.textSecondary,
                              fontWeight: day.today ? '800' : '500',
                            },
                          ]}
                        >
                          {day.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* 2x2 Bento KPI Grid */}
                <View style={styles.kpiGrid}>
                  <View
                    style={[
                      styles.kpiCard,
                      {
                        backgroundColor: theme.cardBg,
                        borderColor: theme.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.kpiTopRow}>
                      <View
                        style={[
                          styles.bentoIconBoxNoMargin,
                          { backgroundColor: theme.amberSoftBg },
                        ]}
                      >
                        <Flame size={20} color="#F59E0B" />
                      </View>
                      <View
                        style={[
                          styles.kpiPill,
                          { backgroundColor: theme.amberSoftBg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.kpiPillText,
                            { color: theme.amberText },
                          ]}
                        >
                          Active
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[styles.kpiValue, { color: theme.textPrimary }]}
                    >
                      {streak} <Text style={styles.kpiUnit}>days</Text>
                    </Text>
                    <Text
                      style={[styles.kpiLabel, { color: theme.textSecondary }]}
                    >
                      Study streak
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.kpiCard,
                      {
                        backgroundColor: theme.cardBg,
                        borderColor: theme.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.kpiTopRow}>
                      <View
                        style={[
                          styles.bentoIconBoxNoMargin,
                          { backgroundColor: theme.blueSoftBg },
                        ]}
                      >
                        <Clock size={20} color={theme.blueSoftText} />
                      </View>
                      <View
                        style={[
                          styles.kpiPill,
                          { backgroundColor: theme.blueSoftBg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.kpiPillText,
                            { color: theme.blueSoftText },
                          ]}
                        >
                          All time
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[styles.kpiValue, { color: theme.textPrimary }]}
                    >
                      {totalStudyMins} <Text style={styles.kpiUnit}>min</Text>
                    </Text>
                    <Text
                      style={[styles.kpiLabel, { color: theme.textSecondary }]}
                    >
                      Total study time
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => nav.navigate('StudyPlanner')}
                    style={[
                      styles.kpiCard,
                      {
                        backgroundColor: theme.cardBg,
                        borderColor: theme.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.kpiTopRow}>
                      <View
                        style={[
                          styles.bentoIconBoxNoMargin,
                          { backgroundColor: theme.emeraldSoftBg },
                        ]}
                      >
                        <CheckCircle2 size={20} color={theme.emeraldText} />
                      </View>
                      <Plus size={16} color={theme.textMuted} />
                    </View>
                    <Text
                      style={[styles.kpiValue, { color: theme.textPrimary }]}
                    >
                      {state.plannerTasks.filter((task) => task.completedOn === task.targetDate).length}
                    </Text>
                    <Text
                      style={[styles.kpiLabel, { color: theme.textSecondary }]}
                    >
                      Tasks completed
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => nav.navigate('Tests')}
                    style={[
                      styles.kpiCard,
                      {
                        backgroundColor: theme.cardBg,
                        borderColor: theme.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.kpiTopRow}>
                      <View
                        style={[
                          styles.bentoIconBoxNoMargin,
                          { backgroundColor: theme.violetSoftBg },
                        ]}
                      >
                        <BarChart3 size={20} color={theme.violetText} />
                      </View>
                      <ArrowUpRight size={16} color={theme.textMuted} />
                    </View>
                    <Text
                      style={[styles.kpiValue, { color: theme.textPrimary }]}
                    >
                      {state.results.length}
                    </Text>
                    <Text
                      style={[styles.kpiLabel, { color: theme.textSecondary }]}
                    >
                      Tests taken
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Full-Width Analytics CTA */}
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => nav.navigate('Statistics')}
                  style={[
                    styles.fullStatsBtn,
                    { backgroundColor: theme.ctaPrimaryBg },
                  ]}
                >
                  <View style={styles.fullStatsLeft}>
                    <TrendingUp size={16} color={theme.ctaPrimaryText} />
                    <Text
                      style={[
                        styles.fullStatsText,
                        { color: theme.ctaPrimaryText },
                      ]}
                    >
                      Open Full Statistics
                    </Text>
                  </View>
                  <ArrowRight size={16} color={theme.ctaPrimaryText} />
                </TouchableOpacity>
              </View>
            )}

            {/* ==================== TAB 3: ACCOUNT ==================== */}
            {activeTab === 'account' && (
              <View style={styles.tabStack}>
                {/* Personal Details Card */}
                <View
                  style={[
                    styles.groupedCard,
                    {
                      backgroundColor: theme.cardBg,
                      borderColor: theme.cardBorder,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.groupedCardHeader,
                      { borderBottomColor: theme.divider },
                    ]}
                  >
                    <Text
                      style={[styles.cardTitle, { color: theme.textPrimary }]}
                    >
                      Personal Information
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleOpenSheet('edit')}
                      style={styles.inlineLinkBtn}
                    >
                      <Text
                        style={[
                          styles.inlineEditText,
                          { color: theme.blueSoftText },
                        ]}
                      >
                        Edit
                      </Text>
                      <Pencil size={12} color={theme.blueSoftText} />
                    </TouchableOpacity>
                  </View>

                  {/* Name Row */}
                  <View
                    style={[
                      styles.infoRow,
                      { borderBottomColor: theme.divider },
                    ]}
                  >
                    <View style={styles.infoRowLeft}>
                      <User size={16} color={theme.iconMuted} />
                      <Text
                        style={[
                          styles.infoLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Name
                      </Text>
                    </View>
                    <Text
                      style={[styles.infoValue, { color: theme.textPrimary }]}
                    >
                      {profile.name}
                    </Text>
                  </View>

                  {/* Email Row */}
                  <View
                    style={[
                      styles.infoRow,
                      { borderBottomColor: theme.divider },
                    ]}
                  >
                    <View style={styles.infoRowLeft}>
                      <Mail size={16} color={theme.iconMuted} />
                      <Text
                        style={[
                          styles.infoLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Email
                      </Text>
                    </View>
                    <View style={styles.emailValueWrap}>
                      <Text
                        style={[styles.infoValue, { color: theme.textPrimary }]}
                        numberOfLines={1}
                      >
                        {profile.email}
                      </Text>
                      <BadgeCheck size={14} color="#3B82F6" />
                    </View>
                  </View>

                  {/* Birthday Row */}
                  <View
                    style={[
                      styles.infoRow,
                      { borderBottomColor: theme.divider },
                    ]}
                  >
                    <View style={styles.infoRowLeft}>
                      <Cake size={16} color={theme.iconMuted} />
                      <Text
                        style={[
                          styles.infoLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Birthday
                      </Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleOpenSheet('edit')}
                    >
                      <Text
                        style={[
                          styles.infoValue,
                          {
                            color: profile.birthday
                              ? theme.textPrimary
                              : theme.blueSoftText,
                          },
                        ]}
                      >
                        {profile.birthday
                          ? formatDisplayDate(profile.birthday)
                          : '+ Add'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Phone Row */}
                  <View
                    style={[
                      styles.infoRow,
                      { borderBottomColor: theme.divider },
                    ]}
                  >
                    <View style={styles.infoRowLeft}>
                      <Phone size={16} color={theme.iconMuted} />
                      <Text
                        style={[
                          styles.infoLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Phone
                      </Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleOpenSheet('edit')}
                    >
                      <Text
                        style={[
                          styles.infoValue,
                          {
                            color: profile.phone
                              ? theme.textPrimary
                              : theme.blueSoftText,
                          },
                        ]}
                      >
                        {profile.phone || '+ Add'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* City Row */}
                  <View
                    style={[
                      styles.infoRow,
                      { borderBottomColor: theme.divider },
                    ]}
                  >
                    <View style={styles.infoRowLeft}>
                      <MapPin size={16} color={theme.iconMuted} />
                      <Text
                        style={[
                          styles.infoLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Current City
                      </Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleOpenSheet('edit')}
                    >
                      <Text
                        style={[
                          styles.infoValue,
                          {
                            color: profile.city
                              ? theme.textPrimary
                              : theme.blueSoftText,
                          },
                        ]}
                      >
                        {profile.city || '+ Add'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Exam Focus Row */}
                  <View style={[styles.infoRow, styles.infoRowLast]}>
                    <View style={styles.infoRowLeft}>
                      <GraduationCap size={16} color={theme.iconMuted} />
                      <Text
                        style={[
                          styles.infoLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Exam Focus
                      </Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => handleOpenSheet('focus')}
                      style={[
                        styles.focusTagChip,
                        { backgroundColor: theme.subtleBg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.focusTagChipText,
                          { color: theme.textPrimary },
                        ]}
                      >
                        {profile.focus}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Workspace & Settings Card */}
                <View
                  style={[
                    styles.groupedCard,
                    {
                      backgroundColor: theme.cardBg,
                      borderColor: theme.cardBorder,
                    },
                  ]}
                >
                  {/* Admin Portal */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => nav.navigate('Admin')}
                    style={[
                      styles.settingRow,
                      { borderBottomColor: theme.divider },
                    ]}
                  >
                    <View style={styles.settingRowLeft}>
                      <View
                        style={[
                          styles.bentoIconBoxNoMargin,
                          { backgroundColor: theme.blueSoftBg },
                        ]}
                      >
                        <ShieldCheck size={16} color={theme.blueSoftText} />
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.settingTitle,
                            { color: theme.textPrimary },
                          ]}
                        >
                          Admin Portal
                        </Text>
                        <Text
                          style={[
                            styles.settingSub,
                            { color: theme.textSecondary },
                          ]}
                        >
                          Manage content, tests & users
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={16} color={theme.textMuted} />
                  </TouchableOpacity>

                  {/* Dark Appearance Toggle */}
                  <View
                    style={[
                      styles.settingRow,
                      { borderBottomColor: theme.divider },
                    ]}
                  >
                    <View style={styles.settingRowLeft}>
                      <View
                        style={[
                          styles.bentoIconBoxNoMargin,
                          { backgroundColor: theme.subtleBg },
                        ]}
                      >
                        <Contrast size={16} color={theme.iconDefault} />
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.settingTitle,
                            { color: theme.textPrimary },
                          ]}
                        >
                          Dark Appearance
                        </Text>
                        <Text
                          style={[
                            styles.settingSub,
                            { color: theme.textSecondary },
                          ]}
                        >
                          Easier on eyes for night study
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleToggleDarkMode}
                      style={[
                        styles.customSwitchTrack,
                        {
                          backgroundColor: isDark
                            ? '#2563EB'
                            : theme.switchTrackOff,
                        },
                      ]}
                    >
                      <Animated.View
                        style={[
                          styles.customSwitchThumb,
                          { transform: [{ translateX: switchKnobAnim }] },
                        ]}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Help & Support */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => nav.navigate('AppGuide')}
                    style={[styles.settingRow, styles.infoRowLast]}
                  >
                    <View style={styles.settingRowLeft}>
                      <View
                        style={[
                          styles.bentoIconBoxNoMargin,
                          { backgroundColor: theme.subtleBg },
                        ]}
                      >
                        <HelpCircle size={16} color={theme.iconDefault} />
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.settingTitle,
                            { color: theme.textPrimary },
                          ]}
                        >
                          Help & Support
                        </Text>
                        <Text
                          style={[
                            styles.settingSub,
                            { color: theme.textSecondary },
                          ]}
                        >
                          FAQs, contact & report issue
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Subtle Modern Sign Out Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleSignOut}
                  style={[
                    styles.signOutBtn,
                    {
                      backgroundColor: theme.roseBg,
                      borderColor: theme.roseBorder,
                    },
                  ]}
                >
                  <LogOut size={16} color={theme.roseText} />
                  <Text
                    style={[styles.signOutText, { color: theme.roseText }]}
                  >
                    Sign Out
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* ==================== BOTTOM NAVIGATION BAR ==================== */}
        <View
          style={[
            styles.bottomNav,
            {
              backgroundColor: theme.navBg,
              borderTopColor: theme.navBorder,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => showToast('Home feed')}
            style={styles.navItem}
          >
            <Home size={20} color="#94A3B8" />
            <Text style={styles.navLabel}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => showToast('Study Library')}
            style={styles.navItem}
          >
            <BookOpen size={20} color="#94A3B8" />
            <Text style={styles.navLabel}>Library</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => showToast('Study Groups')}
            style={styles.navItem}
          >
            <Users size={20} color="#94A3B8" />
            <Text style={styles.navLabel}>Groups</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => showToast('Sakha AI Tutor')}
            style={styles.navItem}
          >
            <LinearGradient
              colors={['#7C3AED', '#3B82F6']}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={styles.navAiIconBox}
            >
              <Sparkles size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.navAiLabel, { color: theme.violetText }]}>
              Sakha AI
            </Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.9} style={styles.navItem}>
            <View
              style={[
                styles.navProfilePill,
                { backgroundColor: theme.blueSoftBg },
              ]}
            >
              <User
                size={20}
                color={theme.blueSoftText}
                fill={theme.blueSoftText}
              />
            </View>
            <Text
              style={[styles.navProfileLabel, { color: theme.blueSoftText }]}
            >
              Profile
            </Text>
          </TouchableOpacity>
        </View>

        {/* ==================== FLOATING TOAST NOTIFICATION ==================== */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toastWrap,
            {
              opacity: toastOpacity,
              bottom: isMobile ? 16 : 24,
              transform: [{ translateY: toastTranslateY }],
            },
          ]}
        >
          <View style={[styles.toastPill, { backgroundColor: theme.toastBg }]}>
            <View style={styles.toastDot} />
            <Text style={[styles.toastText, { color: theme.toastText }]}>
              {toastMessage}
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* ==================== REDESIGNED EDIT PROFILE SHEET ==================== */}
      <AnimatedBottomSheet
        visible={activeSheet === 'edit'}
        onClose={handleCloseSheet}
        isDark={isDark}
        maxHeightRatio={0.9}
      >
        {/* Clean Sticky Header */}
        <View
          style={[
            styles.editHeader,
            { borderBottomColor: theme.divider },
          ]}
        >
          <TouchableOpacity activeOpacity={0.7} onPress={handleCloseSheet}>
            <Text style={[styles.editCancelText, { color: theme.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.editTitleText, { color: theme.textPrimary }]}>
            Edit Profile
          </Text>
          <TouchableOpacity activeOpacity={0.7} onPress={handleSaveProfile}>
            <Text style={[styles.editSaveText, { color: theme.blueSoftText }]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Form Body */}
        <ScrollView
          style={styles.editScroll}
          contentContainerStyle={styles.editScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Centered Avatar Uploader */}
          <View style={styles.editAvatarSection}>
            <View style={styles.editAvatarRelative}>
              {draftPhotoUri ? (
                <Image
                  source={{ uri: draftPhotoUri }}
                  resizeMode="cover"
                  style={styles.editAvatarCircle}
                />
              ) : (
                <LinearGradient
                  colors={['#FBBF24', '#F97316', '#F43F5E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.editAvatarCircle}
                >
                  <Text style={styles.editAvatarInitials}>
                    {getInitials(draftName || profile.name)}
                  </Text>
                </LinearGradient>
              )}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleChoosePhoto}
                style={[
                  styles.editCameraBtn,
                  {
                    backgroundColor: theme.ctaPrimaryBg,
                    borderColor: theme.sheetBg,
                  },
                ]}
              >
                <Camera size={14} color={theme.ctaPrimaryText} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleChoosePhoto}
            >
              <Text
                style={[
                  styles.changePhotoText,
                  { color: theme.blueSoftText },
                ]}
              >
                Change profile photo
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Inputs */}
          <View style={styles.formFieldsStack}>
            {/* Full Name */}
            <View>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                FULL NAME
              </Text>
              <View style={styles.inputIconWrap}>
                <View style={styles.inputLeftIcon}>
                  <User size={16} color="#94A3B8" />
                </View>
                <TextInput
                  value={draftName}
                  onChangeText={setDraftName}
                  placeholder="Your full name"
                  placeholderTextColor="#94A3B8"
                  style={[
                    styles.textInputWithIcon,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.inputBorder,
                      color: theme.textPrimary,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Email Address */}
            <View>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                EMAIL ADDRESS
              </Text>
              <View style={styles.inputIconWrap}>
                <View style={styles.inputLeftIcon}>
                  <Mail size={16} color="#94A3B8" />
                </View>
                <TextInput
                  value={draftEmail}
                  onChangeText={setDraftEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="you@example.com"
                  placeholderTextColor="#94A3B8"
                  style={[
                    styles.textInputWithIcon,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.inputBorder,
                      color: theme.textPrimary,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Birthday + Current City Row */}
            <View style={styles.twoColInputs}>
              <View style={styles.halfCol}>
                <Text
                  style={[styles.fieldLabel, { color: theme.textSecondary }]}
                >
                  BIRTHDAY
                </Text>
                <TextInput
                  value={draftBirthday}
                  onChangeText={setDraftBirthday}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#94A3B8"
                  style={[
                    styles.textInputCompact,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.inputBorder,
                      color: theme.textPrimary,
                    },
                  ]}
                />
              </View>

              <View style={styles.halfCol}>
                <Text
                  style={[styles.fieldLabel, { color: theme.textSecondary }]}
                >
                  CURRENT CITY
                </Text>
                <TextInput
                  value={draftCity}
                  onChangeText={setDraftCity}
                  placeholder="e.g. Jodhpur"
                  placeholderTextColor="#94A3B8"
                  style={[
                    styles.textInputCompact,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.inputBorder,
                      color: theme.textPrimary,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Phone Number */}
            <View>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                PHONE NUMBER
              </Text>
              <View style={styles.inputIconWrap}>
                <View style={styles.inputLeftIcon}>
                  <Phone size={16} color="#94A3B8" />
                </View>
                <TextInput
                  value={draftPhone}
                  onChangeText={setDraftPhone}
                  keyboardType="phone-pad"
                  placeholder="+91 98765 43210"
                  placeholderTextColor="#94A3B8"
                  style={[
                    styles.textInputWithIcon,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.inputBorder,
                      color: theme.textPrimary,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Primary Exam Focus Chips */}
            <View>
              <Text
                style={[
                  styles.fieldLabel,
                  styles.chipsLabelGap,
                  { color: theme.textSecondary },
                ]}
              >
                PRIMARY EXAM FOCUS
              </Text>
              <View style={styles.focusChipsWrap}>
                {EXAM_OPTIONS.map((exam) => {
                  const active = draftFocus === exam.id;
                  return (
                    <TouchableOpacity
                      key={exam.id}
                      activeOpacity={0.8}
                      onPress={() => setDraftFocus(exam.id)}
                      style={[
                        styles.focusChipBtn,
                        active
                          ? {
                              backgroundColor: theme.ctaPrimaryBg,
                              borderColor: theme.ctaPrimaryBg,
                            }
                          : {
                              backgroundColor: theme.inputBg,
                              borderColor: theme.inputBorder,
                            },
                      ]}
                    >
                      <Text
                        style={[
                          styles.focusChipText,
                          {
                            color: active
                              ? theme.ctaPrimaryText
                              : theme.iconDefault,
                          },
                        ]}
                      >
                        {exam.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Sticky Bottom Save CTA */}
        <View
          style={[
            styles.editFooter,
            {
              backgroundColor: theme.sheetBg,
              borderTopColor: theme.divider,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleSaveProfile}
            style={styles.saveChangesBtn}
          >
            <Text style={styles.saveChangesBtnText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </AnimatedBottomSheet>

      {/* ==================== UNIFIED SWITCH FOCUS SHEET ==================== */}
      <AnimatedBottomSheet
        visible={activeSheet === 'focus'}
        onClose={handleCloseSheet}
        isDark={isDark}
        maxHeightRatio={0.8}
      >
        <View style={styles.sheetPaddedBody}>
          <View style={styles.sheetTitleRow}>
            <View style={styles.sheetTitleCol}>
              <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>
                Switch Exam Focus
              </Text>
              <Text
                style={[styles.sheetSubtitle, { color: theme.textSecondary }]}
              >
                Personalizes your library, mocks & Sakha AI
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleCloseSheet}
              style={[
                styles.sheetCloseCircle,
                { backgroundColor: theme.subtleBg },
              ]}
            >
              <X size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.focusGrid}>
            {EXAM_OPTIONS.map((exam) => {
              const active = profile.focus === exam.id;
              return (
                <TouchableOpacity
                  key={exam.id}
                  activeOpacity={0.8}
                  onPress={() => handleSetFocus(exam.id)}
                  style={[
                    styles.focusCard,
                    {
                      backgroundColor: active
                        ? theme.focusActiveBg
                        : theme.focusInactiveBg,
                      borderColor: active
                        ? '#3B82F6'
                        : theme.focusInactiveBorder,
                    },
                  ]}
                >
                  <View style={styles.focusCardTop}>
                    <Text
                      style={[
                        styles.focusCardLabel,
                        {
                          color: active
                            ? theme.focusActiveText
                            : theme.textPrimary,
                        },
                      ]}
                    >
                      {exam.label}
                    </Text>
                    {active && (
                      <View style={styles.focusCheckCircle}>
                        <Text style={styles.focusCheckText}>✓</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.focusCardDesc,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {exam.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </AnimatedBottomSheet>

      {/* ==================== BADGES SHOWCASE SHEET ==================== */}
      <AnimatedBottomSheet
        visible={activeSheet === 'badges'}
        onClose={handleCloseSheet}
        isDark={isDark}
        maxHeightRatio={0.8}
      >
        <View style={styles.sheetPaddedBody}>
          <View style={styles.sheetTitleRow}>
            <View style={styles.sheetTitleCol}>
              <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>
                Badges & Milestones
              </Text>
              <Text
                style={[styles.sheetSubtitle, { color: theme.textSecondary }]}
              >
                {earnedBadges} of {badges.length} earned • Keep studying to unlock more
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleCloseSheet}
              style={[
                styles.sheetCloseCircle,
                { backgroundColor: theme.subtleBg },
              ]}
            >
              <X size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.badgesSheetGrid}>
              {badges.map((badge, index) => {
                const progress =
                  badge.id === 'b4'
                    ? Math.min(100, Math.round((streak / 30) * 100))
                    : badge.id === 'b5'
                      ? Math.min(100, Math.round((highestTestPercentile / 90) * 100))
                      : badge.id === 'b6'
                        ? Math.min(100, Math.round((state.notes.length / 25) * 100))
                        : 0;
                const earnedStyle = index % 2 === 0
                  ? { backgroundColor: theme.amberCardBg, borderColor: theme.amberCardBorder }
                  : { backgroundColor: theme.indigoCardBg, borderColor: theme.indigoCardBorder };
                return (
                  <View
                    key={badge.id}
                    style={[
                      styles.badgeDetailCard,
                      !badge.earned && styles.badgeDetailLocked,
                      badge.earned
                        ? earnedStyle
                        : { backgroundColor: theme.focusInactiveBg, borderColor: theme.cardBorder },
                    ]}
                  >
                    <Text style={[styles.badgeDetailEmoji, !badge.earned && styles.lockedEmoji]}>
                      {['🔥', '⚡', '🎯', '🏆', '📚', '📝'][index] ?? '🏅'}
                    </Text>
                    <Text
                      style={[
                        styles.badgeDetailTitle,
                        { color: badge.earned ? theme.textPrimary : theme.textSecondary },
                      ]}
                    >
                      {badge.name}
                    </Text>
                    <Text
                      style={[
                        styles.badgeDetailDesc,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {badge.desc}
                    </Text>
                    {badge.earned ? (
                      <Text
                        style={[
                          styles.badgeUnlockedText,
                          { color: index % 2 === 0 ? theme.amberText : theme.indigoText },
                        ]}
                      >
                        Unlocked ✓
                      </Text>
                    ) : (
                      <View
                        style={[
                          styles.badgeProgressTrack,
                          { backgroundColor: theme.subtleBg },
                        ]}
                      >
                        <View
                          style={[
                            styles.badgeProgressFill,
                            { width: `${progress}%` as `${number}%` },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </AnimatedBottomSheet>

      {/* ==================== UX/UI REDESIGN SPEC MODAL ==================== */}
      <Modal
        transparent
        visible={notesVisible}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setNotesVisible(false)}
      >
        <View style={styles.notesOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setNotesVisible(false)}
          />
          <View style={styles.notesPanel}>
            <View style={styles.notesHeader}>
              <View>
                <View style={styles.notesSpecPill}>
                  <Layers size={14} color="#1D4ED8" />
                  <Text style={styles.notesSpecPillText}>UX/UI REDESIGN SPEC</Text>
                </View>
                <Text style={styles.notesTitle}>What Changed & Why</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setNotesVisible(false)}
                style={styles.notesCloseBtn}
              >
                <X size={16} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.notesScrollContent}
            >
              <Text style={styles.notesIntro}>
                Interact directly with the prototype—switch tabs, tap{' '}
                <Text style={styles.notesBold}>Focus: UPSC ▾</Text>, toggle{' '}
                <Text style={styles.notesBold}>Dark Mode</Text>, or open{' '}
                <Text style={styles.notesBold}>Edit Profile</Text> to watch the
                profile completion ring update live.
              </Text>

              {[
                {
                  num: '1',
                  title: 'Smarter Information Architecture',
                  body: 'Replaced the generic "Other" junk-drawer tab with Overview • Statistics • Account. High-value student features (Badges and Quick Focus Switcher) are immediately accessible instead of buried.',
                },
                {
                  num: '2',
                  title: 'Upgraded Hero Card & Eliminated Dead Space',
                  body: 'The original blue banner had large unused empty space. The redesigned mesh hero integrates a live Profile Completion Ring around the avatar, an inline interactive Focus Switcher pill, Admin badge, and a 3-column glanceable stats strip.',
                },
                {
                  num: '3',
                  title: 'Fixed Edit Profile UX & Synced Exam Data',
                  body: 'Removed duplicate Edit buttons, fixed the cropped avatar clipping bug, replaced the awkward right-side back arrow with standard Cancel / Save + sticky bottom CTA, and unified the conflicting exam lists (UPSC, RAS, RPSC/RSSB, SSC, Banking, NEET).',
                },
                {
                  num: '4',
                  title: 'Actionable Empty States & Visual Polish',
                  body: 'Replaced passive bold "Not set" text with clickable + Add prompts, added a smart completion nudge card, elevated Statistics with a weekly activity bar chart, softened the harsh solid red Sign Out block into a modern tonal button, and added full Dark Mode support.',
                },
              ].map((item) => (
                <View key={item.num} style={styles.notesItemCard}>
                  <View style={styles.notesItemHeading}>
                    <View style={styles.notesNumberBadge}>
                      <Text style={styles.notesNumberText}>{item.num}</Text>
                    </View>
                    <Text style={styles.notesItemTitle}>{item.title}</Text>
                  </View>
                  <Text style={styles.notesItemBody}>{item.body}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.notesFooter}>
              <Text style={styles.notesFooterMeta}>
                Design System: 8pt Grid • Plus Jakarta Sans
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleToggleDarkMode}
              >
                <Text style={styles.notesFooterLink}>Toggle App Dark Mode</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
    </Shell>
  );
}

// ============================================================================
// STYLESHEET (1:1 DESIGN TOKEN MATCH)
// ============================================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  appContainer: {
    flex: 1,
    position: 'relative',
  },

  // Header
  header: {
    display: 'none',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    zIndex: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogoBox: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  brandOwlEmoji: {
    fontSize: 15,
  },
  brandTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandStudyText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  brandSakhaText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: '#0EA5A4',
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F43F5E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },

  // Scroll Area
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 12,
  },

  // Hero Card
  heroCard: {
    borderRadius: 26,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 4,
  },
  heroRingOuter: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroRingInner: {
    position: 'absolute',
    right: -16,
    top: -16,
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroIdentityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  heroAvatarWrapper: {
    width: 68,
    height: 68,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarCircle: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
    bottom: 5,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarInitials: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroCameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  heroTextCol: {
    flex: 1,
    minWidth: 0,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroName: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  adminPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  adminPillText: {
    color: '#BAE6FD',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  heroEmail: {
    color: 'rgba(219, 234, 254, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  heroFocusPill: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  focusPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  heroFocusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  heroFocusBold: {
    fontWeight: '800',
  },
  heroQuickEditBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMetricsStrip: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    gap: 8,
  },
  heroMetricItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroMetricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroFireEmoji: {
    fontSize: 13,
  },
  heroMetricValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  heroMetricLabel: {
    color: 'rgba(219, 234, 254, 0.75)',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },

  // Profile Completion Nudge
  nudgeCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  nudgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  nudgeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  nudgeTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  nudgeSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  nudgeTrack: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    marginTop: 8,
    overflow: 'hidden',
  },
  nudgeFillWrap: {
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  nudgeFillGradient: {
    flex: 1,
  },
  nudgeFinishBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  nudgeFinishText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Segmented Tabs
  segmentedBar: {
    padding: 4,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 4,
  },
  segmentedTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedTabBtnActive: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentedTabText: {
    fontSize: 12,
  },

  // Shared Card Containers
  tabStack: {
    gap: 14,
  },
  card: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  softTagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  softTagText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Badges Preview
  inlineLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  inlineLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inlineEditText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeGrid3: {
    flexDirection: 'row',
    gap: 10,
  },
  badgeMiniCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  badgeMiniLocked: {
    borderStyle: 'dashed',
    opacity: 0.75,
  },
  badgeEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  lockedEmoji: {
    opacity: 0.45,
  },
  badgeMiniTitle: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  badgeMiniStatus: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  badgeMiniLockedStatus: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 2,
  },

  // Quick Actions Bento
  bentoGrid2: {
    flexDirection: 'row',
    gap: 12,
  },
  bentoActionCard: {
    flex: 1,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  bentoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  bentoIconBoxNoMargin: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoActionTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  bentoActionSub: {
    fontSize: 11,
    marginTop: 2,
  },

  // Statistics Tab
  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weeklySub: {
    fontSize: 11,
    marginTop: 2,
  },
  activeDaysPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  activeDaysText: {
    fontSize: 11,
    fontWeight: '700',
  },
  barChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 112,
    paddingTop: 8,
    gap: 8,
  },
  barCol: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  barTrack: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    maxWidth: 26,
    borderRadius: 8,
  },
  todayBarWrap: {
    width: '100%',
    maxWidth: 26,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  todayBarGradient: {
    flex: 1,
  },
  barDayLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  barTodayLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  kpiPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  kpiPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  kpiUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  kpiLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  fullStatsBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  fullStatsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fullStatsText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Account Tab
  groupedCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  groupedCardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  infoRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoLabel: {
    fontSize: 12,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  emailValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  focusTagChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  focusTagChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  settingRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  settingSub: {
    fontSize: 11,
    marginTop: 1,
  },
  customSwitchTrack: {
    width: 44,
    height: 24,
    borderRadius: 999,
    padding: 2,
    justifyContent: 'center',
  },
  customSwitchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  signOutBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Bottom Navigation Bar
  bottomNav: {
    display: 'none',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 14 : 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94A3B8',
  },
  navAiIconBox: {
    width: 28,
    height: 28,
    marginTop: -4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  navAiLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  navProfilePill: {
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 999,
  },
  navProfileLabel: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Toast
  toastWrap: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 60,
  },
  toastPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  toastDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  toastText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Bottom Sheets Base
  sheetOverlayRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.52)',
  },
  sheetKeyboardWrapper: {
    justifyContent: 'flex-end',
  },
  sheetPanel: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
  },
  sheetPaddedBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  sheetTitleCol: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sheetCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Edit Profile Sheet
  editHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  editCancelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editTitleText: {
    fontSize: 14,
    fontWeight: '800',
  },
  editSaveText: {
    fontSize: 12,
    fontWeight: '700',
  },
  editScroll: {
    maxHeight: '65%',
  },
  editScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
  },
  editAvatarSection: {
    alignItems: 'center',
  },
  editAvatarRelative: {
    position: 'relative',
  },
  editAvatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  editAvatarInitials: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  editCameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
  },
  formFieldsStack: {
    gap: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  chipsLabelGap: {
    marginBottom: 8,
  },
  inputIconWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputLeftIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  textInputWithIcon: {
    paddingLeft: 40,
    paddingRight: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  twoColInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCol: {
    flex: 1,
  },
  textInputCompact: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  focusChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  focusChipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  focusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  editFooter: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
  },
  saveChangesBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  saveChangesBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Focus Switcher Sheet
  focusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  focusCard: {
    width: '48%',
    flexGrow: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  focusCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  focusCardLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  focusCheckCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusCheckText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  focusCardDesc: {
    fontSize: 10,
    marginTop: 4,
  },

  // Badges Sheet
  badgesSheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeDetailCard: {
    width: '48%',
    flexGrow: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  badgeDetailLocked: {
    opacity: 0.8,
  },
  badgeDetailEmoji: {
    fontSize: 24,
  },
  badgeDetailTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  badgeDetailDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  badgeUnlockedText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 8,
  },
  badgeProgressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    marginTop: 10,
    overflow: 'hidden',
  },
  badgeProgressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 999,
  },

  // UX Design Notes Overlay Modal
  notesOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  notesPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 14,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  notesSpecPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
  },
  notesSpecPillText: {
    color: '#1D4ED8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  notesTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
    letterSpacing: -0.4,
  },
  notesCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesScrollContent: {
    gap: 12,
    paddingBottom: 12,
  },
  notesIntro: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
  },
  notesBold: {
    fontWeight: '700',
    color: '#334155',
  },
  notesItemCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.75)',
  },
  notesItemHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notesNumberBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesNumberText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  notesItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  notesItemBody: {
    fontSize: 12,
    lineHeight: 18,
    color: '#475569',
    marginTop: 6,
  },
  notesFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  notesFooterMeta: {
    fontSize: 11,
    color: '#94A3B8',
  },
  notesFooterLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
});
