/**
 * ============================================================================
 * STUDY SAKHA — ADVANCED FOCUS LOCK SYSTEM (REACT NATIVE + TYPESCRIPT)
 * ============================================================================
 * Pixel-accurate React Native / Expo migration of the Study Sakha Focus Lock
 * prototype. Zero UI redesigns, zero omitted features, 100% native RN primitives.
 *
 * REQUIRED EXPO / RN PACKAGES:
 *   - react-native-svg
 *   - expo-linear-gradient
 *   - lucide-react-native
 *   - (Optional persistence) @react-native-async-storage/async-storage
 *
 * MODULAR ARCHITECTURE NOTE:
 * Organized into clear, copy-pasteable module sections so it runs immediately
 * as a single drop-in screen or can be split directly into:
 *   types/index.ts | utils/time.ts | services/* | components/* | FocusLockScreen.tsx
 * ============================================================================
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  StatusBar,
  StyleSheet,
  Platform,
  Dimensions,
  AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Ellipse,
  Path,
  Defs,
  RadialGradient,
  LinearGradient as SvgLinearGradient,
  Stop,
  Rect,
  Line,
  Text as SvgText,
  G,
} from 'react-native-svg';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Timer,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Search,
  Check,
  X,
  Calendar,
  BarChart3,
  Sliders,
  Zap,
  Phone,
  Smartphone,
  Globe,
  AlertTriangle,
  Info,
  Coffee,
  Target,
  Layers,
  TrendingUp,
  Cpu,
} from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { Shell } from '../components/Shell';
import { appendFocusHistory, type FocusHistoryRecord } from '../lib/focusHistory';
import { dayKey, getUserScopedStorageKey, useStore } from '../lib/store';
import { focusLockNative, subscribeFocusLockEvent } from '../lib/focusLockNative';
import { computeDurationSession, computeEndOfDaySession, computeUntilTimeSession } from '../lib/focusLockDuration';
import {
  buildPredefinedProfiles,
  getNextFocusScheduleLabel,
  resolveEffectiveBlockedPackages,
  type FocusLockProfile,
} from '../lib/focusLockP2Helpers';
import { clearExitPin, isValidExitPin, loadExitPin, saveExitPin, verifyExitPin } from '../lib/focusLockPin';
import { FOCUS_LOCK_STORAGE_KEY } from '../lib/focusLockSnapshot';
import { useTheme, type Palette } from '../lib/theme';

/* ============================================================================
 * MODULE 1: TYPES (types/index.ts)
 * ========================================================================== */

export type SessionState =
  | 'initial'
  | 'ready'
  | 'active_focus'
  | 'active_strict'
  | 'scheduled_lock'
  | 'break_active'
  | 'completed'
  | 'emergency_requested'
  | 'permission_missing'
  | 'service_unavailable'
  | 'interrupted';

export type ScreenName =
  | 'home'
  | 'active_session'
  | 'modes'
  | 'apps'
  | 'strict'
  | 'analytics'
  | 'content'
  | 'settings';

export type AnalyticsRange = 'Daily' | 'Weekly' | 'Monthly';
export type AppStrategy = 'block' | 'allow';
export type PermissionStatusType = 'Granted' | 'Not Granted' | 'Restricted' | 'Needs Attention';

export interface InstalledApp {
  id: string;
  name: string;
  pkg: string;
  category: string;
  dailyMins: number;
  launches: number;
  recent: boolean;
  distracting: boolean;
  gradientColors: [string, string];
  short: string;
}

export interface PresetList {
  id: string;
  name: string;
  desc: string;
  appIds: string[];
}

export interface BlockingMode {
  id: string;
  name: string;
  tag: string;
  desc: string;
  icon: keyof typeof MODE_ICONS;
  strictDefault: number;
  supported?: boolean;
  unsupportedReason?: string;
}

export interface PermissionItem {
  id: string;
  name: string;
  status: PermissionStatusType;
  desc: string;
  why: string;
}

export interface StrictConfig {
  preventAccidental: boolean;
  cooldownMins: number;
  pinProtection: boolean;
  trustedApproval: boolean;
  commitmentConfirm: boolean;
  limitEmergencyExits: boolean;
  lockProfileEdit: boolean;
  lockScheduleEdit: boolean;
  confirmEmergency: boolean;
}

export interface BreakConfig {
  presetId: string;
  breakDuration: number;
  dailyBudget: number;
  consumed: number;
  autoResume: boolean;
  noBreakMode: boolean;
}

export interface ContentRules {
  websiteBlocking: boolean;
  ytShorts: boolean;
  igReels: boolean;
  igStories: boolean;
  snapSpotlight: boolean;
  adultFilter: boolean;
  customUrls: string[];
  keywords: string[];
}

export interface NotifSettings {
  dndIntegration: boolean;
  allowSelectedCalls: boolean;
  allowEmergencyContacts: boolean;
  suppressNotifications: boolean;
  sessionStartNotif: boolean;
  sessionCompleteNotif: boolean;
  breakReminders: boolean;
  lockStatusPersistent: boolean;
  restartRecovery: boolean;
}

export interface FocusTrendPoint {
  label: string;
  focusMins: number;
  completion: number;
}

export interface AppAttemptPoint {
  app: string;
  attempts: number;
  actualMins: number;
}

export interface AnalyticsRangeData {
  summary: {
    blockedTime: string;
    blockedAttempts: number;
    sessionsCompleted: number;
    longestSession: string;
    focusScore: number;
    scoreDelta: string;
    mostDistractingApp: string;
    mostDistractingTime: string;
    unlockAttempts: number;
    emergencyBreaks: number;
    consistency: string;
    streak: number;
    actualDistractionUsage: string;
    estimatedTimeReclaimed: string;
  };
  focusTrend: FocusTrendPoint[];
  appAttempts: AppAttemptPoint[];
}

export interface HeatmapData {
  slots: string[];
  rows: { day: string; vals: number[] }[];
}

/* ============================================================================
 * MODULE 2: THEME PALETTE (EXACT 1:1 MATCH WITH ORIGINAL TAILWIND TOKENS)
 * ========================================================================== */

interface ThemePalette {
  isDark: boolean;
  screenBg: string;
  headerBg: string;
  cardBg: string;
  surfaceBg: string;
  surfaceElevated: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  navBg: string;
  indigo: string;
  indigoLight: string;
  indigoSoft: string;
  indigoBorder: string;
  emerald: string;
  emeraldSoft: string;
  rose: string;
  roseSoft: string;
  amber: string;
  amberSoft: string;
  teal: string;
  tealSoft: string;
  violet: string;
  sky: string;
}

function getTheme(colors: Palette, isDark: boolean): ThemePalette {
  return {
    isDark,
    screenBg: colors.bg,
    headerBg: colors.surface,
    cardBg: colors.surface,
    surfaceBg: colors.surfaceAlt,
    surfaceElevated: colors.surfaceInteractive,
    border: colors.border,
    borderSubtle: colors.borderSubtle,
    textPrimary: colors.text,
    textSecondary: colors.textSecondary,
    textMuted: colors.textMuted,
    navBg: colors.surface,
    indigo: colors.brandPrimary,
    indigoLight: colors.brandPrimary,
    indigoSoft: colors.selectedSurface,
    indigoBorder: colors.focusRing,
    emerald: colors.success,
    emeraldSoft: 'rgba(16, 185, 129, 0.14)',
    rose: colors.danger,
    roseSoft: 'rgba(244, 63, 94, 0.14)',
    amber: colors.warning,
    amberSoft: 'rgba(245, 158, 11, 0.14)',
    teal: colors.teal,
    tealSoft: 'rgba(20, 184, 166, 0.14)',
    violet: colors.purple,
    sky: colors.info,
  };
}

/* ============================================================================
 * MODULE 3: REACT NATIVE PERSISTENCE ADAPTER (STOREPROVIDER READY)
 * ========================================================================== */

interface PersistenceAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}

export const FocusLockStorage: PersistenceAdapter = AsyncStorage;

/* ============================================================================
 * MODULE 4: SERVICE ABSTRACTION LAYER (services/*)
 * ========================================================================== */

export const AppDiscoveryService = {
  getInstalledApps(): InstalledApp[] {
    // Android discovery is authoritative. Other platforms expose an honest unavailable state.
    if (Platform.OS !== 'android') return [];
    return [];
    /* return [
      { id: 'instagram', name: 'Instagram', pkg: 'com.instagram.android', category: 'Social Media', dailyMins: 64, launches: 19, recent: true, distracting: true, gradientColors: ['#EC4899', '#F59E0B'], short: 'IG' },
      { id: 'youtube', name: 'YouTube', pkg: 'com.google.android.youtube', category: 'Video Streaming', dailyMins: 82, launches: 14, recent: true, distracting: true, gradientColors: ['#DC2626', '#F43F5E'], short: 'YT' },
      { id: 'x', name: 'X (Twitter)', pkg: 'com.twitter.android', category: 'Social Media', dailyMins: 38, launches: 16, recent: true, distracting: true, gradientColors: ['#334155', '#0F172A'], short: 'X' },
      { id: 'snapchat', name: 'Snapchat', pkg: 'com.snapchat.android', category: 'Social Media', dailyMins: 29, launches: 12, recent: true, distracting: true, gradientColors: ['#FBBF24', '#EAB308'], short: 'SC' },
      { id: 'facebook', name: 'Facebook', pkg: 'com.facebook.katana', category: 'Social Media', dailyMins: 21, launches: 7, recent: false, distracting: true, gradientColors: ['#2563EB', '#1D4ED8'], short: 'FB' },
      { id: 'reddit', name: 'Reddit', pkg: 'com.reddit.frontpage', category: 'Entertainment', dailyMins: 34, launches: 9, recent: false, distracting: true, gradientColors: ['#F97316', '#EF4444'], short: 'RD' },
      { id: 'netflix', name: 'Netflix', pkg: 'com.netflix.mediaclient', category: 'Video Streaming', dailyMins: 48, launches: 3, recent: false, distracting: true, gradientColors: ['#B91C1C', '#7F1D1D'], short: 'NF' },
      { id: 'bgmi', name: 'BGMI', pkg: 'com.pubg.imobile', category: 'Games', dailyMins: 55, launches: 4, recent: true, distracting: true, gradientColors: ['#D97706', '#C2410C'], short: 'BG' },
      { id: 'freefire', name: 'Free Fire MAX', pkg: 'com.dts.freefiremax', category: 'Games', dailyMins: 25, launches: 2, recent: false, distracting: true, gradientColors: ['#F97316', '#D97706'], short: 'FF' },
      { id: 'whatsapp', name: 'WhatsApp', pkg: 'com.whatsapp', category: 'Communication', dailyMins: 42, launches: 28, recent: true, distracting: false, gradientColors: ['#10B981', '#16A34A'], short: 'WA' },
      { id: 'telegram', name: 'Telegram', pkg: 'org.telegram.messenger', category: 'Communication', dailyMins: 31, launches: 15, recent: true, distracting: false, gradientColors: ['#0EA5E9', '#3B82F6'], short: 'TG' },
      { id: 'chrome', name: 'Chrome', pkg: 'com.android.chrome', category: 'Browsers', dailyMins: 45, launches: 18, recent: true, distracting: false, gradientColors: ['#6366F1', '#0EA5E9'], short: 'CH' },
      { id: 'amazon', name: 'Amazon', pkg: 'in.amazon.mShop.android.shopping', category: 'Shopping', dailyMins: 16, launches: 5, recent: false, distracting: false, gradientColors: ['#F59E0B', '#F97316'], short: 'AZ' },
      { id: 'flipkart', name: 'Flipkart', pkg: 'com.flipkart.android', category: 'Shopping', dailyMins: 12, launches: 4, recent: false, distracting: false, gradientColors: ['#3B82F6', '#4F46E5'], short: 'FK' },
      { id: 'anki', name: 'AnkiDroid', pkg: 'com.ichi2.anki', category: 'Other', dailyMins: 50, launches: 6, recent: true, distracting: false, gradientColors: ['#06B6D4', '#2563EB'], short: 'AN' },
      { id: 'drive', name: 'Google Drive', pkg: 'com.google.android.apps.docs', category: 'Other', dailyMins: 28, launches: 5, recent: false, distracting: false, gradientColors: ['#14B8A6', '#059669'], short: 'GD' },
    ]; */
  },
  getCategories(): string[] {
    return ['All', 'Installed Apps'];
  },
  getPresetLists(): PresetList[] {
    return [];
    /* return [
      { id: 'complete', name: 'Complete Distraction Block', desc: 'Social, Games & Streaming', appIds: ['instagram', 'youtube', 'x', 'snapchat', 'facebook', 'reddit', 'netflix', 'bgmi', 'freefire'] },
      { id: 'social', name: 'Social Media Shield', desc: 'Feeds & short-form apps', appIds: ['instagram', 'x', 'snapchat', 'facebook', 'reddit'] },
      { id: 'entertainment', name: 'Entertainment Detox', desc: 'Video & streaming apps', appIds: ['youtube', 'netflix', 'reddit'] },
      { id: 'gaming', name: 'Gaming Lockout', desc: 'Block mobile games', appIds: ['bgmi', 'freefire'] },
      { id: 'custom', name: 'Custom Study List', desc: 'Your hand-picked selection', appIds: ['instagram', 'youtube', 'bgmi', 'whatsapp'] },
    ]; */
  },
};

export const AppBlockingService = {
  getBlockingModes(): BlockingMode[] {
    return [
      { id: 'quick', name: 'Quick Lock', tag: 'Instant', desc: 'Temporarily block selected apps for a chosen sprint.', icon: 'Zap', strictDefault: 1, supported: true },
      { id: 'strict', name: 'Strict Lock', tag: 'High Discipline', desc: 'Prevents casual cancellation and locks active rules.', icon: 'Lock', strictDefault: 2, supported: true },
      { id: 'allowlist', name: 'Allowlist Mode', tag: 'Minimalist', desc: 'Only selected essential study apps remain accessible.', icon: 'ShieldCheck', strictDefault: 2, supported: true },
      { id: 'pomodoro', name: 'Pomodoro Blocking', tag: 'Cyclic', desc: 'Enables cyclic breaks & auto-resume between focus sprints.', icon: 'Timer', strictDefault: 1, supported: true },
      { id: 'deep', name: 'Deep Focus', tag: 'Exam Sprint', desc: 'Level 3 Extreme shield with DND integration when authorized.', icon: 'Target', strictDefault: 3, supported: true },
      { id: 'scheduled', name: 'Scheduled Blocking', tag: 'Planner-linked', desc: 'Displays your next Study Planner session; manual start required.', icon: 'Calendar', strictDefault: 2, supported: true },
      { id: 'custom', name: 'Custom Blocking', tag: 'Unsupported', desc: 'Per-app daily usage quotas & launch limits require a future engine.', icon: 'Sliders', strictDefault: 1, supported: false, unsupportedReason: 'Usage quotas & launch-limit rules are not supported in this build.' },
      { id: 'emergency', name: 'Emergency Focus', tag: 'Instant 45m', desc: 'One-tap 45-minute Level 2 distraction purge.', icon: 'ShieldAlert', strictDefault: 2, supported: true },
    ];
  },
};

export const PermissionService = {
  getInitialPermissions(): PermissionItem[] {
    return [
      { id: 'accessibility', name: 'Accessibility Service', status: 'Needs Attention', desc: 'Displays Focus Lock intervention over distracting apps.', why: 'Enables instant shield activation and blocked-app detection.' },
      { id: 'usage', name: 'Usage Access', status: 'Needs Attention', desc: 'Detects foreground app transitions & accurate screen-time.', why: 'Required to identify distracting usage insights on-device.' },
      { id: 'exact_alarm', name: 'Exact Alarm Access', status: 'Needs Attention', desc: 'Delivers session expiration alarms on time on Android 12+.', why: 'Prevents delayed session endings when the device enters Doze.' },
      { id: 'notification', name: 'Notification Permission', status: 'Needs Attention', desc: 'Allows session status and completion alerts.', why: 'Required for reliable background session notifications.' },
      { id: 'battery', name: 'Battery Optimization', status: 'Needs Attention', desc: 'Exempts Focus Lock from aggressive OEM background limits.', why: 'Prevents MIUI, OneUI, or ColorOS from pausing active focus protection.' },
      { id: 'dnd', name: 'Do Not Disturb Access', status: 'Needs Attention', desc: 'Silences distracting notifications during Focus Lock when enabled.', why: 'Required on Android 6+ to toggle DND and restore it when sessions end.' },
    ];
  },
};

export const FocusAnalyticsService = {
  getDataByRange(range: AnalyticsRange): AnalyticsRangeData {
    // Analytics are populated from verified focus-history and native blocking records.
    // Until those records exist, keep the Gemini surfaces in an honest empty state.
    return {
      summary: {
        blockedTime: '0m', blockedAttempts: 0, sessionsCompleted: 0, longestSession: '0m',
        focusScore: 0, scoreDelta: '—', mostDistractingApp: 'No activity yet', mostDistractingTime: 'No activity yet',
        unlockAttempts: 0, emergencyBreaks: 0, consistency: '—', streak: 0,
        actualDistractionUsage: 'Unavailable', estimatedTimeReclaimed: '0m',
      },
      focusTrend: [],
      appAttempts: [],
    };
    /*
    if (range === 'Daily') {
      return {
        summary: {
          blockedTime: '4h 20m',
          blockedAttempts: 27,
          sessionsCompleted: 5,
          longestSession: '90m',
          focusScore: 89,
          scoreDelta: '+7%',
          mostDistractingApp: 'YouTube',
          mostDistractingTime: '7 PM – 9 PM',
          unlockAttempts: 6,
          emergencyBreaks: 1,
          consistency: '92%',
          streak: 14,
          actualDistractionUsage: '48m',
          estimatedTimeReclaimed: '1h 55m',
        },
        focusTrend: [
          { label: '6 AM', focusMins: 75, completion: 100 },
          { label: '10 AM', focusMins: 50, completion: 100 },
          { label: '2 PM', focusMins: 60, completion: 90 },
          { label: '5 PM', focusMins: 25, completion: 80 },
          { label: '7 PM', focusMins: 50, completion: 85 },
        ],
        appAttempts: [
          { app: 'YouTube', attempts: 10, actualMins: 22 },
          { app: 'Instagram', attempts: 8, actualMins: 14 },
          { app: 'X', attempts: 5, actualMins: 7 },
          { app: 'BGMI', attempts: 4, actualMins: 5 },
        ],
      };
    }
    if (range === 'Monthly') {
      return {
        summary: {
          blockedTime: '112h 45m',
          blockedAttempts: 642,
          sessionsCompleted: 118,
          longestSession: '2h 30m',
          focusScore: 86,
          scoreDelta: '+14%',
          mostDistractingApp: 'YouTube',
          mostDistractingTime: '8 PM – 10 PM',
          unlockAttempts: 74,
          emergencyBreaks: 9,
          consistency: '88%',
          streak: 14,
          actualDistractionUsage: '19h 10m',
          estimatedTimeReclaimed: '44h 20m',
        },
        focusTrend: [
          { label: 'Wk 1', focusMins: 1480, completion: 82 },
          { label: 'Wk 2', focusMins: 1690, completion: 86 },
          { label: 'Wk 3', focusMins: 1820, completion: 91 },
          { label: 'Wk 4', focusMins: 1775, completion: 89 },
        ],
        appAttempts: [
          { app: 'YouTube', attempts: 245, actualMins: 510 },
          { app: 'Instagram', attempts: 198, actualMins: 340 },
          { app: 'BGMI', attempts: 112, actualMins: 185 },
          { app: 'X', attempts: 87, actualMins: 115 },
        ],
      };
    }
    return {
      summary: {
        blockedTime: '28h 40m',
        blockedAttempts: 164,
        sessionsCompleted: 31,
        longestSession: '2h 00m',
        focusScore: 91,
        scoreDelta: '+11%',
        mostDistractingApp: 'YouTube',
        mostDistractingTime: '7 PM – 9 PM',
        unlockAttempts: 18,
        emergencyBreaks: 2,
        consistency: '94%',
        streak: 14,
        actualDistractionUsage: '4h 35m',
        estimatedTimeReclaimed: '11h 15m',
      },
      focusTrend: [
        { label: 'Mon', focusMins: 240, completion: 95 },
        { label: 'Tue', focusMins: 210, completion: 88 },
        { label: 'Wed', focusMins: 290, completion: 100 },
        { label: 'Thu', focusMins: 260, completion: 92 },
        { label: 'Fri', focusMins: 230, completion: 85 },
        { label: 'Sat', focusMins: 310, completion: 100 },
        { label: 'Sun', focusMins: 180, completion: 80 },
      ],
      appAttempts: [
        { app: 'YouTube', attempts: 58, actualMins: 118 },
        { app: 'Instagram', attempts: 49, actualMins: 82 },
        { app: 'X', attempts: 31, actualMins: 44 },
        { app: 'BGMI', attempts: 26, actualMins: 31 },
      ],
    }; */
  },
  getHourlyHeatmap(): HeatmapData {
    return { slots: [], rows: [] };
    /* return {
      slots: ['6a', '9a', '12p', '3p', '7p', '10p'],
      rows: [
        { day: 'Mon', vals: [0, 1, 2, 1, 4, 2] },
        { day: 'Tue', vals: [1, 0, 2, 2, 3, 2] },
        { day: 'Wed', vals: [0, 1, 1, 1, 4, 1] },
        { day: 'Thu', vals: [0, 2, 2, 2, 4, 3] },
        { day: 'Fri', vals: [1, 1, 3, 2, 3, 2] },
      ],
    }; */
  },
};

export const NotificationService = {
  getInitialSettings(): NotifSettings {
    return {
      dndIntegration: false,
      allowSelectedCalls: false,
      allowEmergencyContacts: false,
      suppressNotifications: false,
      sessionStartNotif: false,
      sessionCompleteNotif: false,
      breakReminders: false,
      lockStatusPersistent: false,
      restartRecovery: false,
    };
  },
};

/* ============================================================================
 * MODULE 5: UTILITIES (utils/time.ts)
 * ========================================================================== */

const MODE_ICONS = {
  Zap,
  Lock,
  ShieldCheck,
  Timer,
  Target,
  Calendar,
  Sliders,
  ShieldAlert,
};

function formatClockTime(dateObj: Date): string {
  return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDurationMMSS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function resolveBlockedPackages(
  apps: readonly InstalledApp[],
  selectedAppIds: readonly string[],
  strategy: AppStrategy,
): string[] {
  const selectedSet = new Set(selectedAppIds);
  if (strategy === 'allow') {
    return apps.filter((app) => !selectedSet.has(app.id)).map((app) => app.pkg);
  }
  return apps.filter((app) => selectedSet.has(app.id)).map((app) => app.pkg);
}

export function canCompleteSessionEarly(
  strictLevel: number,
  nowMs: number,
  sessionEndMs: number | null,
): boolean {
  if (strictLevel < 2) return true;
  return sessionEndMs !== null && nowMs >= sessionEndMs - 1000;
}

/* ============================================================================
 * MODULE 6: REUSABLE DESIGN COMPONENTS (components/*)
 * ========================================================================== */

/**
 * Custom Pill Toggle Switch (Preserves exact 40x20 rounded pill aesthetic)
 */
function PillToggle({
  value,
  onToggle,
  activeColor = '#4F46E5',
  isDark,
}: {
  value: boolean;
  onToggle: () => void;
  activeColor?: string;
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={[
        styles.toggleTrack,
        { backgroundColor: value ? activeColor : isDark ? 'rgba(255,255,255,0.16)' : '#CBD5E1' },
      ]}
    >
      <View style={[styles.toggleThumb, { transform: [{ translateX: value ? 18 : 0 }] }]} />
    </TouchableOpacity>
  );
}

/**
 * 1. SakhaOwl3D — Exact 1:1 react-native-svg vector port
 */
export function SakhaOwl3D({ mood = 'calm', size = 56 }: { mood?: 'calm' | 'celebrate' | 'alert'; size?: number }) {
  const eyeGlow = mood === 'celebrate' ? '#34D399' : mood === 'alert' ? '#FBBF24' : '#818CF8';
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Defs>
        <RadialGradient id="owlBody" cx="35%" cy="28%" r="72%">
          <Stop offset="0%" stopColor="#4F46E5" />
          <Stop offset="55%" stopColor="#312E81" />
          <Stop offset="100%" stopColor="#1E1B4B" />
        </RadialGradient>
        <RadialGradient id="owlBelly" cx="50%" cy="30%" r="65%">
          <Stop offset="0%" stopColor="#E0E7FF" />
          <Stop offset="100%" stopColor="#A5B4FC" />
        </RadialGradient>
        <SvgLinearGradient id="owlBeak" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FCD34D" />
          <Stop offset="100%" stopColor="#D97706" />
        </SvgLinearGradient>
      </Defs>
      <Circle cx="40" cy="42" r="34" fill={eyeGlow} fillOpacity={0.14} />
      <Path d="M18 24 L27 12 L33 23 Z" fill="#312E81" />
      <Path d="M62 24 L53 12 L47 23 Z" fill="#312E81" />
      <Ellipse cx="40" cy="45" rx="25" ry="26" fill="url(#owlBody)" />
      <Ellipse cx="40" cy="54" rx="15" ry="14" fill="url(#owlBelly)" fillOpacity={0.92} />
      <Path d="M34 51 Q40 55 46 51" stroke="#4338CA" strokeWidth={1.8} strokeLinecap="round" opacity={0.45} fill="none" />
      <Path d="M35 57 Q40 61 45 57" stroke="#4338CA" strokeWidth={1.8} strokeLinecap="round" opacity={0.35} fill="none" />
      <Path d="M16 40 C11 49 14 59 22 61 C20 53 20 45 16 40 Z" fill="#1E1B4B" />
      <Path d="M64 40 C69 49 66 59 58 61 C60 53 60 45 64 40 Z" fill="#1E1B4B" />
      <Circle cx="30.5" cy="35" r="10.5" fill="#F8FAFC" stroke="#6366F1" strokeWidth={1.5} strokeOpacity={0.4} />
      <Circle cx="49.5" cy="35" r="10.5" fill="#F8FAFC" stroke="#6366F1" strokeWidth={1.5} strokeOpacity={0.4} />
      {mood === 'celebrate' ? (
        <G>
          <Path d="M26 35 Q30.5 30 35 35" stroke="#0F172A" strokeWidth={2.6} strokeLinecap="round" fill="none" />
          <Path d="M45 35 Q49.5 30 54 35" stroke="#0F172A" strokeWidth={2.6} strokeLinecap="round" fill="none" />
        </G>
      ) : (
        <G>
          <Circle cx="31.5" cy="35" r="5" fill="#0F172A" />
          <Circle cx="48.5" cy="35" r="5" fill="#0F172A" />
          <Circle cx="33.2" cy="33.2" r="1.7" fill="#FFFFFF" />
          <Circle cx="50.2" cy="33.2" r="1.7" fill="#FFFFFF" />
        </G>
      )}
      <Path d="M36.5 40.5 L43.5 40.5 L40 46.5 Z" fill="url(#owlBeak)" />
      <Path d="M26 21 Q40 16 54 21" stroke="#A5B4FC" strokeWidth={1.4} strokeLinecap="round" opacity={0.5} fill="none" />
    </Svg>
  );
}

/**
 * 5. CircularFocusTimer — Exact 224x224 Countdown Ring
 */
export function CircularFocusTimer({
  totalSeconds,
  remainingSeconds,
  label,
  sublabel,
  tone = 'indigo',
  theme,
}: {
  totalSeconds: number;
  remainingSeconds: number;
  label: string;
  sublabel: string;
  tone?: 'indigo' | 'rose' | 'teal';
  theme: ThemePalette;
}) {
  const radius = 92;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? Math.min(1, Math.max(0, (totalSeconds - remainingSeconds) / totalSeconds)) : 0;
  const dashOffset = circumference * (1 - progress);

  const strokeColors: Record<'indigo' | 'rose' | 'teal', [string, string]> = {
    indigo: ['#6366F1', '#8B5CF6'],
    rose: ['#F43F5E', '#FB7185'],
    teal: ['#14B8A6', '#34D399'],
  };
  const [c1, c2] = strokeColors[tone];
  const gradId = `ringGrad-${tone}`;

  return (
    <View style={styles.timerContainer}>
      <Svg width={224} height={224} viewBox="0 0 210 210" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <SvgLinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={c1} />
            <Stop offset="100%" stopColor={c2} />
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx="105"
          cy="105"
          r={radius}
          fill="none"
          stroke={theme.isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0'}
          strokeWidth={8}
        />
        <Circle
          cx="105"
          cy="105"
          r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={8.5}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
        />
      </Svg>
      <View style={styles.timerCenterOverlay}>
        <Text style={styles.timerLabel}>{label}</Text>
        <Text style={[styles.timerDigits, { color: theme.textPrimary }]}>{formatDurationMMSS(remainingSeconds)}</Text>
        <Text style={[styles.text11Muted, { color: theme.textMuted, marginTop: 4 }]}>{sublabel}</Text>
      </View>
    </View>
  );
}

/**
 * 6. BlockingModeCard
 */
export function BlockingModeCard({
  mode,
  selected,
  onSelect,
  theme,
}: {
  mode: BlockingMode;
  selected: boolean;
  onSelect: (m: BlockingMode) => void;
  theme: ThemePalette;
}) {
  const Icon = MODE_ICONS[mode.icon] || Shield;
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={() => onSelect(mode)}
      style={[
        styles.modeCard,
        selected
          ? { backgroundColor: theme.indigoSoft, borderColor: '#6366F1' }
          : { backgroundColor: theme.cardBg, borderColor: theme.border },
      ]}
    >
      <View
        style={[
          styles.iconBox40,
          { backgroundColor: selected ? '#4F46E5' : theme.surfaceElevated },
        ]}
      >
        <Icon size={20} color={selected ? '#FFFFFF' : theme.textSecondary} />
      </View>
      <View style={styles.flex1}>
        <View style={styles.rowBetween}>
          <Text style={[styles.textXsBold, { color: theme.textPrimary }]}>{mode.name}</Text>
          <View style={[styles.tagPill, { backgroundColor: theme.surfaceElevated }]}>
            <Text style={[styles.text10Semi, { color: theme.textMuted }]}>{mode.tag}</Text>
          </View>
        </View>
        <Text style={[styles.text11Relaxed, { color: theme.textMuted, marginTop: 4 }]}>{mode.desc}</Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * 7. AppCategoryChip
 */
export function AppCategoryChip({
  label,
  active,
  onPress,
  theme,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: ThemePalette;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.categoryChip,
        active
          ? { backgroundColor: '#4F46E5', borderColor: '#6366F1' }
          : { backgroundColor: theme.cardBg, borderColor: theme.border },
      ]}
    >
      <Text style={[styles.text11Bold, { color: active ? '#FFFFFF' : theme.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/**
 * 8. AppSelectionList
 */
export function AppSelectionList({
  apps,
  selectedAppIds,
  strategy,
  onToggleApp,
  theme,
}: {
  apps: InstalledApp[];
  selectedAppIds: string[];
  strategy: AppStrategy;
  onToggleApp: (id: string) => void;
  theme: ThemePalette;
}) {
  if (apps.length === 0) {
    return (
      <View style={[styles.emptyBox, { backgroundColor: theme.surfaceBg, borderColor: theme.border }]}>
        <Text style={[styles.textXsSemi, { color: theme.textMuted }]}>No applications match your filter.</Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      {apps.map((app) => {
        const isSelected = selectedAppIds.includes(app.id);
        const statusText = strategy === 'block' ? (isSelected ? 'Blocked' : 'Allowed') : isSelected ? 'Allowed' : 'Blocked';
        const isBlockedEffectively = strategy === 'block' ? isSelected : !isSelected;

        return (
          <TouchableOpacity
            key={app.id}
            activeOpacity={0.8}
            onPress={() => onToggleApp(app.id)}
            style={[styles.appRow, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
          >
            <LinearGradient colors={app.gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.appBadge}>
              <Text style={styles.appBadgeText}>{app.short}</Text>
            </LinearGradient>
            <View style={styles.flex1}>
              <View style={styles.rowGap6}>
                <Text numberOfLines={1} style={[styles.textXsBold, { color: theme.textPrimary }]}>
                  {app.name}
                </Text>
                {app.distracting && (
                  <View style={[styles.highRiskTag, { backgroundColor: theme.roseSoft }]}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: theme.rose }}>High Risk</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.text10Muted, { color: theme.textMuted, marginTop: 2 }]}>
                {app.category} • {app.dailyMins}m/day • {app.launches} opens
              </Text>
            </View>
            <View style={styles.rowGap10}>
              <View style={[styles.statusTag, { backgroundColor: isBlockedEffectively ? theme.roseSoft : theme.emeraldSoft }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: isBlockedEffectively ? theme.rose : theme.emerald }}>
                  {statusText}
                </Text>
              </View>
              <View
                style={[
                  styles.checkbox,
                  isSelected
                    ? {
                        backgroundColor: strategy === 'block' ? '#4F46E5' : '#059669',
                        borderColor: strategy === 'block' ? '#4F46E5' : '#059669',
                      }
                    : { borderColor: theme.isDark ? 'rgba(255,255,255,0.22)' : '#CBD5E1' },
                ]}
              >
                {isSelected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * 9. StrictModeSelector
 */
export function StrictModeSelector({
  level,
  onRequestSelectLevel,
  theme,
}: {
  level: number;
  onRequestSelectLevel: (lvl: number) => void;
  theme: ThemePalette;
}) {
  const levels = [
    {
      id: 1,
      name: 'Level 1 — Normal',
      badge: 'Flexible',
      color: theme.indigoLight,
      softBg: theme.indigoSoft,
      border: '#6366F1',
      bullets: ['Flexible focus sessions', 'End session anytime', 'Optional scheduled breaks', 'Gentle intervention reminders'],
    },
    {
      id: 2,
      name: 'Level 2 — Strong',
      badge: 'Recommended',
      color: theme.amber,
      softBg: theme.amberSoft,
      border: '#F59E0B',
      bullets: ['Cooldown before unlocking', 'PIN-based exit protection', 'Limited emergency breaks', 'Active rules locked during session'],
    },
    {
      id: 3,
      name: 'Level 3 — Extreme',
      badge: 'Exam Mode',
      color: theme.rose,
      softBg: theme.roseSoft,
      border: '#F43F5E',
      bullets: ['No ordinary voluntary unlock', 'Trusted person approval option', 'Restricted break budget', 'Persistent scheduled commitment'],
    },
  ];

  return (
    <View style={{ gap: 12 }}>
      {levels.map((l) => {
        const active = level === l.id;
        return (
          <TouchableOpacity
            key={l.id}
            activeOpacity={0.85}
            onPress={() => onRequestSelectLevel(l.id)}
            style={[
              styles.cardRounded2xl,
              {
                backgroundColor: active ? l.softBg : theme.cardBg,
                borderColor: active ? l.border : theme.border,
                padding: 16,
              },
            ]}
          >
            <View style={[styles.rowBetween, { marginBottom: 8 }]}>
              <View style={styles.rowGap8}>
                <Text style={[styles.textXsExtraBold, { color: theme.textPrimary }]}>{l.name}</Text>
                <View style={[styles.statusTag, { backgroundColor: l.softBg }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: l.color }}>{l.badge}</Text>
                </View>
              </View>
              <View
                style={[
                  styles.radioCircle,
                  active
                    ? { borderColor: '#6366F1', backgroundColor: '#6366F1' }
                    : { borderColor: theme.isDark ? 'rgba(255,255,255,0.22)' : '#CBD5E1' },
                ]}
              >
                {active && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
              </View>
            </View>
            <View style={{ gap: 4 }}>
              {l.bullets.map((b, i) => (
                <View key={i} style={styles.rowGap6}>
                  <View style={styles.bulletDot} />
                  <Text style={[styles.text11Muted, { color: theme.textSecondary }]}>{b}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * 13. AnalyticsCard
 */
export function AnalyticsCard({
  label,
  value,
  sub,
  trend,
  theme,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: string;
  theme: ThemePalette;
}) {
  return (
    <View style={[styles.analyticsKpiCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <Text style={[styles.text10Semi, { color: theme.textMuted }]}>{label}</Text>
      <View style={[styles.rowBetween, { alignItems: 'baseline', marginTop: 4 }]}>
        <Text style={[styles.metricValue, { color: theme.textPrimary }]}>{value}</Text>
        {Boolean(trend) && (
          <View style={styles.rowGap4}>
            <TrendingUp size={12} color={theme.emerald} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: theme.emerald }}>{trend}</Text>
          </View>
        )}
      </View>
      {Boolean(sub) && (
        <Text numberOfLines={1} style={[styles.text10Muted, { color: theme.textMuted, marginTop: 2 }]}>
          {sub}
        </Text>
      )}
    </View>
  );
}

/**
 * 14. DistractionChart — Genuine react-native-svg AreaChart + BarChart + Hourly Heatmap
 */
export function DistractionChart({
  focusTrend,
  appAttempts,
  heatmap,
  theme,
}: {
  focusTrend: FocusTrendPoint[];
  appAttempts: AppAttemptPoint[];
  heatmap: HeatmapData;
  theme: ThemePalette;
}) {
  const [selectedTrendIdx, setSelectedTrendIdx] = useState<number | null>(null);
  const [selectedBarIdx, setSelectedBarIdx] = useState<number | null>(null);

  const chartWidth = Math.min(Dimensions.get('window').width - 64, 340);
  const chartHeight = 148;
  const padL = 32;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const innerW = chartWidth - padL - padR;
  const innerH = chartHeight - padT - padB;

  const axisColor = theme.isDark ? '#94A3B8' : '#64748B';
  const gridColor = theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.08)';

  // Area Chart Geometry
  const maxFocus = Math.max(...focusTrend.map((d) => d.focusMins), 1);
  const trendPoints = focusTrend.map((d, i) => {
    const x = padL + (focusTrend.length > 1 ? (i / (focusTrend.length - 1)) * innerW : innerW / 2);
    const y = padT + innerH - (d.focusMins / maxFocus) * innerH;
    return { x, y, ...d };
  });
  const linePath = trendPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath =
    trendPoints.length > 0
      ? `${linePath} L ${trendPoints[trendPoints.length - 1].x.toFixed(1)} ${(padT + innerH).toFixed(1)} L ${trendPoints[0].x.toFixed(1)} ${(padT + innerH).toFixed(1)} Z`
      : '';

  // Bar Chart Geometry
  const barChartH = 136;
  const barInnerH = barChartH - padT - padB;
  const maxAttempts = Math.max(...appAttempts.map((a) => a.attempts), 1);
  const barSlotW = innerW / Math.max(1, appAttempts.length);
  const barW = Math.min(34, barSlotW * 0.56);

  const heatColor = (val: number): string => {
    if (val === 0) return theme.isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9';
    if (val === 1) return theme.isDark ? 'rgba(99,102,241,0.28)' : '#C7D2FE';
    if (val === 2) return theme.isDark ? 'rgba(245,158,11,0.48)' : '#FCD34D';
    if (val === 3) return theme.isDark ? 'rgba(249,115,22,0.72)' : '#FB923C';
    return '#F43F5E';
  };

  return (
    <View style={{ gap: 12 }}>
      {/* Chart 1: Focus Time Protected (AreaChart) */}
      <View style={[styles.cardRounded2xl, { backgroundColor: theme.cardBg, borderColor: theme.border, padding: 16 }]}>
        <View style={[styles.rowBetween, { marginBottom: 10 }]}>
          <View>
            <Text style={[styles.textXsBold, { color: theme.textPrimary }]}>Focus Time Protected (mins)</Text>
            <Text style={[styles.text10Muted, { color: theme.textMuted }]}>Completed sessions trend</Text>
          </View>
          <Text style={[styles.text10Bold, { color: theme.indigoLight }]}>
            {selectedTrendIdx !== null && trendPoints[selectedTrendIdx]
              ? `${trendPoints[selectedTrendIdx].label}: ${trendPoints[selectedTrendIdx].focusMins}m`
              : 'Verified Sessions'}
          </Text>
        </View>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <SvgLinearGradient id="focusAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
              <Stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
            </SvgLinearGradient>
          </Defs>
          {[0, 0.5, 1].map((frac, idx) => {
            const y = padT + innerH * (1 - frac);
            const val = Math.round(maxFocus * frac);
            return (
              <G key={idx}>
                <Line x1={padL} y1={y} x2={chartWidth - padR} y2={y} stroke={gridColor} strokeDasharray="3 3" strokeWidth={1} />
                <SvgText x={padL - 6} y={y + 3} fontSize={9} fill={axisColor} textAnchor="end">
                  {val}
                </SvgText>
              </G>
            );
          })}
          {Boolean(areaPath) && <Path d={areaPath} fill="url(#focusAreaGrad)" />}
          {Boolean(linePath) && <Path d={linePath} fill="none" stroke="#6366F1" strokeWidth={2.5} strokeLinejoin="round" />}
          {trendPoints.map((p, idx) => (
            <G key={p.label} onPress={() => setSelectedTrendIdx(idx)}>
              <Circle cx={p.x} cy={p.y} r={selectedTrendIdx === idx ? 5 : 3} fill="#6366F1" />
              <SvgText x={p.x} y={chartHeight - 6} fontSize={9} fill={axisColor} textAnchor="middle">
                {p.label}
              </SvgText>
            </G>
          ))}
        </Svg>
      </View>

      {/* Chart 2: App-wise Blocked Attempts (BarChart) */}
      <View style={[styles.cardRounded2xl, { backgroundColor: theme.cardBg, borderColor: theme.border, padding: 16 }]}>
        <View style={[styles.rowBetween, { marginBottom: 10 }]}>
          <View>
            <Text style={[styles.textXsBold, { color: theme.textPrimary }]}>App-wise Blocked Attempts</Text>
            <Text style={[styles.text10Muted, { color: theme.textMuted }]}>Separated from actual foreground usage</Text>
          </View>
          {selectedBarIdx !== null && appAttempts[selectedBarIdx] && (
            <Text style={[styles.text10Bold, { color: theme.rose }]}>
              {appAttempts[selectedBarIdx].app}: {appAttempts[selectedBarIdx].attempts}
            </Text>
          )}
        </View>
        <Svg width={chartWidth} height={barChartH}>
          {[0, 0.5, 1].map((frac, idx) => {
            const y = padT + barInnerH * (1 - frac);
            return (
              <G key={idx}>
                <Line x1={padL} y1={y} x2={chartWidth - padR} y2={y} stroke={gridColor} strokeDasharray="3 3" strokeWidth={1} />
                <SvgText x={padL - 6} y={y + 3} fontSize={9} fill={axisColor} textAnchor="end">
                  {Math.round(maxAttempts * frac)}
                </SvgText>
              </G>
            );
          })}
          {appAttempts.map((item, idx) => {
            const h = (item.attempts / maxAttempts) * barInnerH;
            const x = padL + idx * barSlotW + (barSlotW - barW) / 2;
            const y = padT + barInnerH - h;
            const fill = idx === 0 ? '#F43F5E' : idx === 1 ? '#F59E0B' : '#6366F1';
            return (
              <G key={item.app} onPress={() => setSelectedBarIdx(idx)}>
                <Rect x={x} y={y} width={barW} height={Math.max(4, h)} rx={6} ry={6} fill={fill} />
                <SvgText x={x + barW / 2} y={barChartH - 6} fontSize={9} fill={axisColor} textAnchor="middle">
                  {item.app}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>

      {/* Chart 3: Hourly Distraction Heatmap */}
      <View style={[styles.cardRounded2xl, { backgroundColor: theme.cardBg, borderColor: theme.border, padding: 16 }]}>
        <View style={{ marginBottom: 10 }}>
          <Text style={[styles.textXsBold, { color: theme.textPrimary }]}>Hourly Distraction Heatmap</Text>
          <Text style={[styles.text10Muted, { color: theme.textMuted }]}>Peak impulse vulnerability: 7 PM – 9 PM</Text>
        </View>
        <View style={{ gap: 6 }}>
          <View style={styles.heatmapRow}>
            <View style={{ width: 30 }} />
            {heatmap.slots.map((s) => (
              <Text key={s} style={styles.heatmapSlotText}>
                {s}
              </Text>
            ))}
          </View>
          {heatmap.rows.map((r) => (
            <View key={r.day} style={styles.heatmapRow}>
              <Text style={[styles.text10Semi, { width: 30, color: theme.textMuted }]}>{r.day}</Text>
              {r.vals.map((v, i) => (
                <View key={i} style={[styles.heatmapCell, { backgroundColor: heatColor(v) }]} />
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * 16. PermissionStatusCard
 */
export function PermissionStatusCard({
  perm,
  onGrant,
  theme,
}: {
  perm: PermissionItem;
  onGrant: (id: string) => void;
  theme: ThemePalette;
}) {
  const statusMap: Record<PermissionStatusType, { bg: string; color: string; border: string }> = {
    Granted: { bg: theme.emeraldSoft, color: theme.emerald, border: 'rgba(16,185,129,0.28)' },
    'Not Granted': { bg: theme.roseSoft, color: theme.rose, border: 'rgba(244,63,94,0.28)' },
    Restricted: { bg: theme.amberSoft, color: theme.amber, border: 'rgba(245,158,11,0.28)' },
    'Needs Attention': { bg: theme.amberSoft, color: theme.amber, border: 'rgba(245,158,11,0.28)' },
  };
  const st = statusMap[perm.status];

  return (
    <View style={[styles.cardRounded2xl, { backgroundColor: theme.cardBg, borderColor: theme.border, gap: 8 }]}>
      <View style={styles.rowBetween}>
        <View style={[styles.flex1, { paddingRight: 8 }]}>
          <Text style={[styles.textXsBold, { color: theme.textPrimary }]}>{perm.name}</Text>
          <Text style={[styles.text11Muted, { color: theme.textMuted, marginTop: 2 }]}>{perm.desc}</Text>
        </View>
        <View style={[styles.statusTag, { backgroundColor: st.bg, borderWidth: 1, borderColor: st.border }]}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: st.color }}>{perm.status}</Text>
        </View>
      </View>

      <View style={[styles.whyBox, { backgroundColor: theme.surfaceBg }]}>
        <Info size={14} color="#6366F1" style={{ marginTop: 1 }} />
        <Text style={[styles.text10Muted, { color: theme.textMuted, flex: 1 }]}>Why needed: {perm.why}</Text>
      </View>

      {perm.status !== 'Granted' && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onGrant(perm.id)}
          style={styles.indigoSmallBtn}
        >
          <Text style={[styles.textXsBold, { color: '#FFFFFF' }]}>Open Permission Settings</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * 18. EmergencyAccessModal
 */
export function EmergencyAccessModal({
  open,
  strictLevel,
  strictConfig,
  hasConfiguredPin,
  partnerName,
  onClose,
  onVerifyPin,
  onForgotPinReset,
  onGrantEmergency,
  theme,
}: {
  open: boolean;
  strictLevel: number;
  strictConfig: StrictConfig;
  hasConfiguredPin: boolean;
  partnerName: string;
  onClose: () => void;
  onVerifyPin: (pin: string) => Promise<boolean>;
  onForgotPinReset: () => Promise<void>;
  onGrantEmergency: () => void;
  theme: ThemePalette;
}) {
  const [pinInput, setPinInput] = useState('');
  const [partnerRequested, setPartnerRequested] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSecs, setLockoutSecs] = useState(0);
  const [recoveryWaitSecs, setRecoveryWaitSecs] = useState<number | null>(null);
  const [verifying, setVerifying] = useState(false);

  const pinRequired = strictLevel >= 2 && strictConfig.pinProtection && hasConfiguredPin;

  useEffect(() => {
    if (!open) {
      setPinInput('');
      setErrorMsg('');
      setRecoveryWaitSecs(null);
      setVerifying(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || lockoutSecs <= 0) return;
    const t = setTimeout(() => setLockoutSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [open, lockoutSecs]);

  useEffect(() => {
    if (!open || recoveryWaitSecs === null || recoveryWaitSecs <= 0) return;
    const t = setTimeout(() => setRecoveryWaitSecs((s) => (s !== null ? Math.max(0, s - 1) : null)), 1000);
    return () => clearTimeout(t);
  }, [open, recoveryWaitSecs]);

  const handleConfirm = async () => {
    if (verifying) return;
    if (pinRequired) {
      if (lockoutSecs > 0) {
        setErrorMsg(`Too many incorrect attempts. Wait ${lockoutSecs}s.`);
        return;
      }
      if (!isValidExitPin(pinInput)) {
        setErrorMsg('Enter your 4-digit Exit PIN.');
        return;
      }
      setVerifying(true);
      const valid = await onVerifyPin(pinInput);
      setVerifying(false);
      if (!valid) {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        setPinInput('');
        if (nextAttempts >= 5) {
          setFailedAttempts(0);
          setLockoutSecs(30);
          setErrorMsg('Too many incorrect attempts. Locked for 30s.');
        } else {
          setErrorMsg(`Incorrect Exit PIN (${5 - nextAttempts} attempts left).`);
        }
        return;
      }
    }
    setErrorMsg('');
    setPinInput('');
    setFailedAttempts(0);
    setPartnerRequested(false);
    setRecoveryWaitSecs(null);
    onGrantEmergency();
  };

  const handleCompleteRecovery = async () => {
    await onForgotPinReset();
    setErrorMsg('');
    setPinInput('');
    setFailedAttempts(0);
    setRecoveryWaitSecs(null);
    onGrantEmergency();
  };

  return (
    <Modal visible={open} animationType="slide" transparent>
      <View style={styles.modalBackdropBottom}>
        <View style={[styles.bottomSheetCard, { backgroundColor: theme.isDark ? '#141824' : '#FFFFFF', borderColor: theme.border }]}>
          <View style={styles.rowBetween}>
            <View style={styles.rowGap8}>
              <ShieldAlert size={20} color="#F59E0B" />
              <Text style={[styles.textSmExtraBold, { color: theme.textPrimary }]}>Emergency Access Protocol</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeCircle, { backgroundColor: theme.surfaceElevated }]}>
              <X size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.safetyBanner, { backgroundColor: theme.emeraldSoft, borderColor: 'rgba(16,185,129,0.28)' }]}>
            <Phone size={16} color={theme.emerald} />
            <Text style={[styles.text11Relaxed, { color: theme.emerald, flex: 1 }]}>
              <Text style={{ fontWeight: '700' }}>Safety First: </Text>
              Emergency calling (112) & critical safety contacts are always accessible without unlocking.
            </Text>
          </View>

          {strictLevel === 3 && strictConfig.trustedApproval ? (
            <View style={{ gap: 12 }}>
              <View style={[styles.safetyBanner, { backgroundColor: theme.roseSoft, borderColor: 'rgba(244,63,94,0.28)' }]}>
                <Text style={[styles.text11Relaxed, { color: theme.rose, flex: 1 }]}>
                  <Text style={{ fontWeight: '700' }}>Extreme Mode Active: </Text>
                  Ordinary unlocks are locked. Request approval from your Accountability Partner ({partnerName}).
                </Text>
              </View>
              {!partnerRequested ? (
                <TouchableOpacity onPress={() => setPartnerRequested(true)} style={styles.roseFullBtn}>
                  <Text style={[styles.textXsBold, { color: '#FFFFFF' }]}>Send Approval Request to {partnerName}</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.cardRounded2xl, { backgroundColor: theme.amberSoft, borderColor: 'rgba(245,158,11,0.28)', gap: 8 }]}>
                  <Text style={[styles.text11Bold, { color: theme.amber }]}>
                    Request queued locally. Partner approval requires a connected Study Sakha account.
                  </Text>
                  <TouchableOpacity onPress={() => setErrorMsg('Partner approval is unavailable until the account is connected.')} style={styles.amberFullBtn}>
                    <Text style={[styles.textXsBold, { color: '#020617' }]}>Check Partner Approval</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {pinRequired && (
                <View style={{ gap: 8 }}>
                  <Text style={[styles.text11Bold, { color: theme.textMuted }]}>
                    Enter your 4-digit Exit PIN
                  </Text>
                  <TextInput
                    secureTextEntry
                    keyboardType="number-pad"
                    maxLength={4}
                    value={pinInput}
                    onChangeText={setPinInput}
                    placeholder="••••"
                    placeholderTextColor={theme.textMuted}
                    style={[
                      styles.pinInput,
                      { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary },
                    ]}
                  />
                  {Boolean(errorMsg) && <Text style={{ fontSize: 11, color: theme.rose }}>{errorMsg}</Text>}
                  {recoveryWaitSecs === null ? (
                    <TouchableOpacity onPress={() => setRecoveryWaitSecs(30)}>
                      <Text style={[styles.text11Bold, { color: theme.indigoLight }]}>
                        Forgot PIN? Start 30s Recovery Wait
                      </Text>
                    </TouchableOpacity>
                  ) : recoveryWaitSecs > 0 ? (
                    <Text style={[styles.text11Muted, { color: theme.amber }]}>
                      Recovery wait in progress: {recoveryWaitSecs}s remaining...
                    </Text>
                  ) : (
                    <TouchableOpacity onPress={() => void handleCompleteRecovery()} style={styles.roseFullBtn}>
                      <Text style={[styles.textXsBold, { color: '#FFFFFF' }]}>Reset Forgotten PIN & Exit Session</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              <Text style={[styles.text11Muted, { color: theme.textMuted }]}>
                Cooldown configured: <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{strictConfig.cooldownMins} min</Text>. Emergency passes are logged in your analytics.
              </Text>
              <TouchableOpacity
                disabled={verifying || lockoutSecs > 0}
                onPress={() => void handleConfirm()}
                style={[styles.amberFullBtn, { opacity: verifying || lockoutSecs > 0 ? 0.5 : 1 }]}
              >
                <Text style={[styles.textXsExtraBold, { color: '#020617' }]}>
                  {lockoutSecs > 0 ? `Locked (${lockoutSecs}s)` : 'Confirm 5-Min Emergency Access'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

/**
 * 19. SessionCompletionModal
 */
export function SessionCompletionModal({
  open,
  durationMins,
  pointsEarned,
  earnedScreenMins,
  onClose,
  theme,
}: {
  open: boolean;
  durationMins: number;
  pointsEarned: number;
  earnedScreenMins: number;
  onClose: () => void;
  theme: ThemePalette;
}) {
  return (
    <Modal visible={open} animationType="fade" transparent>
      <View style={styles.modalBackdropCenter}>
        <View style={[styles.centerModalCard, { backgroundColor: theme.isDark ? '#131724' : '#FFFFFF', borderColor: theme.border }]}>
          <SakhaOwl3D mood="celebrate" size={76} />
          <View style={{ alignItems: 'center' }}>
            <View style={[styles.statusTag, { backgroundColor: theme.emeraldSoft }]}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: theme.emerald, textTransform: 'uppercase' }}>
                Session Complete
              </Text>
            </View>
            <Text style={[styles.completionTitle, { color: theme.textPrimary }]}>Discipline Victory!</Text>
            <Text style={[styles.textXsMutedCenter, { color: theme.textMuted }]}>
              You completed <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{durationMins} minutes</Text> of distraction-free study.
            </Text>
          </View>

          <View style={[styles.grid2, { width: '100%' }]}>
            <View style={[styles.rewardStatBox, { backgroundColor: theme.amberSoft, borderColor: 'rgba(245,158,11,0.22)' }]}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: theme.amber }}>Focus Points</Text>
              <Text style={[styles.metricValue, { color: '#F59E0B' }]}>+{pointsEarned}</Text>
            </View>
            <View style={[styles.rewardStatBox, { backgroundColor: theme.emeraldSoft, borderColor: 'rgba(16,185,129,0.22)' }]}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: theme.emerald }}>Earned Screen Time</Text>
              <Text style={[styles.metricValue, { color: theme.emerald }]}>+{earnedScreenMins}m</Text>
            </View>
          </View>

          <TouchableOpacity onPress={onClose} style={[styles.indigoFullBtn, { width: '100%' }]}>
            <Text style={[styles.textXsBold, { color: '#FFFFFF' }]}>Back to Focus Lock Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ============================================================================
 * MODULE 7: MAIN FOCUS LOCK SCREEN (FocusLockScreen.tsx)
 * ========================================================================== */

export default function FocusLockScreen() {
  const { state, dispatch } = useStore();
  const { scheme, colors } = useTheme();
  // Theme & Navigation State (React Navigation compatible)
  const isDark = scheme === 'dark';
  const theme = useMemo(() => getTheme(colors, isDark), [colors, isDark]);
  const [screen, setScreen] = useState<ScreenName>('home');
  const [showStateLab, setShowStateLab] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string>('');

  // Session State Machine
  const [sessionState, setSessionState] = useState<SessionState>('ready');
  const [totalSessionSecs, setTotalSessionSecs] = useState<number>(50 * 60);
  const [remainingSecs, setRemainingSecs] = useState<number>(50 * 60);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const sessionEndMs = useRef<number | null>(null);

  // Blocking Modes & Profiles
  const modes = useMemo(() => AppBlockingService.getBlockingModes(), []);
  const [selectedModeId, setSelectedModeId] = useState<string>('quick');
  const activeMode = useMemo(() => modes.find((m) => m.id === selectedModeId) || modes[0], [modes, selectedModeId]);

  // App Management State
  const [nativeApps, setNativeApps] = useState<InstalledApp[]>([]);
  const [nativeStatus, setNativeStatus] = useState<{
    accessibilityEnabled: boolean;
    usageAccessEnabled: boolean;
    exactAlarmEnabled: boolean;
    notificationsEnabled: boolean;
    batteryOptimizationIgnored: boolean;
    dndAccessEnabled: boolean;
  } | null>(null);
  const allApps = useMemo(() => Platform.OS === 'android' ? nativeApps : AppDiscoveryService.getInstalledApps(), [nativeApps]);
  const categories = useMemo(() => AppDiscoveryService.getCategories(), []);
  const [customProfiles, setCustomProfiles] = useState<FocusLockProfile[]>([]);
  const presetLists = useMemo(
    () => [...buildPredefinedProfiles(allApps.map((a) => a.pkg)), ...customProfiles],
    [allApps, customProfiles],
  );
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [profileDraftName, setProfileDraftName] = useState<string>('');
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [appStrategy, setAppStrategy] = useState<AppStrategy>('block');
  const nextScheduleText = useMemo(
    () => getNextFocusScheduleLabel(state.plannerScheduleItems ?? []),
    [state.plannerScheduleItems],
  );
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [appSearch, setAppSearch] = useState<string>('');
  const [appCategoryFilter, setAppCategoryFilter] = useState<string>('All');
  const [appQuickFilter, setAppQuickFilter] = useState<'all' | 'recent' | 'distracting'>('all');

  // Strict Mode State
  const [strictLevel, setStrictLevel] = useState<number>(2);
  const [pendingExtremeConfirm, setPendingExtremeConfirm] = useState<boolean>(false);
  const [hasConfiguredPin, setHasConfiguredPin] = useState<boolean>(false);
  const [showPinSetupModal, setShowPinSetupModal] = useState<boolean>(false);
  const [pinDraft, setPinDraft] = useState<string>('');
  const [pinConfirmDraft, setPinConfirmDraft] = useState<string>('');
  const [pinSetupError, setPinSetupError] = useState<string>('');
  const [strictConfig, setStrictConfig] = useState<StrictConfig>({
    preventAccidental: true,
    cooldownMins: 5,
    pinProtection: false,
    trustedApproval: false,
    commitmentConfirm: true,
    limitEmergencyExits: true,
    lockProfileEdit: true,
    lockScheduleEdit: true,
    confirmEmergency: true,
  });

  // Smart Break Management State
  const [breakConfig, setBreakConfig] = useState<BreakConfig>({
    presetId: '50_10',
    breakDuration: 10,
    dailyBudget: 4,
    consumed: 0,
    autoResume: true,
    noBreakMode: false,
  });
  const [breakRemainingSecs, setBreakRemainingSecs] = useState<number>(5 * 60);

  // Content & Website Blocking State
  const [contentRules, setContentRules] = useState<ContentRules>({
    websiteBlocking: false,
    ytShorts: false,
    igReels: false,
    igStories: false,
    snapSpotlight: false,
    adultFilter: false,
    customUrls: [],
    keywords: [],
  });
  const [newUrlInput, setNewUrlInput] = useState<string>('');
  const [newKeywordInput, setNewKeywordInput] = useState<string>('');

  // Analytics State
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>('Weekly');
  const [showEmptyAnalytics, setShowEmptyAnalytics] = useState<boolean>(false);

  // Permissions & Device Controls State
  const [permissions, setPermissions] = useState<PermissionItem[]>(() => PermissionService.getInitialPermissions());
  const [notifSettings, setNotifSettings] = useState<NotifSettings>(() => NotificationService.getInitialSettings());

  // Study Sakha Focus Points & Partner State
  const [focusPoints, setFocusPoints] = useState<number>(0);
  const [earnRatioStudy] = useState<number>(60);
  const [earnRatioReward] = useState<number>(10);
  const [partnerName] = useState<string>('');
  const [blockedAttemptsToday, setBlockedAttemptsToday] = useState<number>(0);
  const [dailyIntention, setDailyIntention] = useState<string>('');
  const storageKey = useMemo(() => getUserScopedStorageKey(FOCUS_LOCK_STORAGE_KEY, state.user?.id), [state.user?.id]);
  const historyKey = useMemo(() => getUserScopedStorageKey('study-sakha-focus-history-v1', state.user?.id), [state.user?.id]);
  const [historyRecords, setHistoryRecords] = useState<FocusHistoryRecord[]>([]);
  const historyRecordsRef = useRef<FocusHistoryRecord[]>([]);
  useEffect(() => {
    historyRecordsRef.current = historyRecords;
  }, [historyRecords]);
  const creditedSessionId = useRef<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Modals State
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);

  // Restore user preferences once per account. Invalid or stale values are ignored.
  useEffect(() => {
    let active = true;
    void loadExitPin(state.user?.id).then((pin) => {
      if (!active) return;
      setHasConfiguredPin(Boolean(pin));
    });
    FocusLockStorage.getItem(storageKey).then((raw) => {
      if (!active) return;
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as Partial<{
          selectedAppIds: string[]; appStrategy: AppStrategy; selectedModeId: string;
          activeProfileId: string; customProfiles: FocusLockProfile[];
          strictLevel: number; strictConfig: Partial<StrictConfig>;
          dailyIntention: string; focusPoints: number;
          breakConfig: BreakConfig;
          contentRules: ContentRules; notifSettings: NotifSettings; sessionState: SessionState; blockedAttemptsToday: number;
          totalSessionSecs: number; remainingSecs: number; sessionStartTime: string | null;
        }>;
        if (Array.isArray(saved.selectedAppIds)) setSelectedAppIds(saved.selectedAppIds);
        if (saved.appStrategy === 'allow' || saved.appStrategy === 'block') setAppStrategy(saved.appStrategy);
        if (typeof saved.selectedModeId === 'string') setSelectedModeId(saved.selectedModeId);
        if (typeof saved.activeProfileId === 'string') setActiveProfileId(saved.activeProfileId);
        if (Array.isArray(saved.customProfiles)) {
          setCustomProfiles(saved.customProfiles.filter((p): p is FocusLockProfile => Boolean(p && typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.appIds))));
        }
        if (typeof saved.strictLevel === 'number' && Number.isInteger(saved.strictLevel) && saved.strictLevel >= 1 && saved.strictLevel <= 3) setStrictLevel(saved.strictLevel);
        if (saved.strictConfig && typeof saved.strictConfig === 'object') {
          setStrictConfig((prev) => ({
            ...prev,
            preventAccidental: typeof saved.strictConfig?.preventAccidental === 'boolean' ? saved.strictConfig.preventAccidental : prev.preventAccidental,
            cooldownMins: typeof saved.strictConfig?.cooldownMins === 'number' ? saved.strictConfig.cooldownMins : prev.cooldownMins,
            pinProtection: typeof saved.strictConfig?.pinProtection === 'boolean' ? saved.strictConfig.pinProtection : prev.pinProtection,
            trustedApproval: typeof saved.strictConfig?.trustedApproval === 'boolean' ? saved.strictConfig.trustedApproval : prev.trustedApproval,
            commitmentConfirm: typeof saved.strictConfig?.commitmentConfirm === 'boolean' ? saved.strictConfig.commitmentConfirm : prev.commitmentConfirm,
            limitEmergencyExits: typeof saved.strictConfig?.limitEmergencyExits === 'boolean' ? saved.strictConfig.limitEmergencyExits : prev.limitEmergencyExits,
            lockProfileEdit: typeof saved.strictConfig?.lockProfileEdit === 'boolean' ? saved.strictConfig.lockProfileEdit : prev.lockProfileEdit,
            lockScheduleEdit: typeof saved.strictConfig?.lockScheduleEdit === 'boolean' ? saved.strictConfig.lockScheduleEdit : prev.lockScheduleEdit,
            confirmEmergency: typeof saved.strictConfig?.confirmEmergency === 'boolean' ? saved.strictConfig.confirmEmergency : prev.confirmEmergency,
          }));
        }
        if (typeof saved.dailyIntention === 'string') setDailyIntention(saved.dailyIntention);
        if (typeof saved.focusPoints === 'number' && Number.isFinite(saved.focusPoints)) setFocusPoints(saved.focusPoints);
        if (saved.breakConfig) setBreakConfig(saved.breakConfig);
        if (saved.contentRules) setContentRules(saved.contentRules);
        if (saved.notifSettings) setNotifSettings(saved.notifSettings);
        if (saved.sessionState) setSessionState(saved.sessionState);
        if (typeof saved.totalSessionSecs === 'number' && Number.isFinite(saved.totalSessionSecs)) setTotalSessionSecs(saved.totalSessionSecs);
        if (typeof saved.remainingSecs === 'number' && Number.isFinite(saved.remainingSecs)) setRemainingSecs(saved.remainingSecs);
        if (saved.sessionStartTime) setSessionStartTime(new Date(saved.sessionStartTime));
        if (typeof saved.blockedAttemptsToday === 'number' && Number.isFinite(saved.blockedAttemptsToday)) setBlockedAttemptsToday(saved.blockedAttemptsToday);
      } catch { /* recover with safe defaults */ }
    }).catch(() => undefined).finally(() => { if (active) setHydrated(true); });
    return () => { active = false; };
  }, [state.user?.id, storageKey]);

  // Persist all user-owned Focus Lock configuration without writing on every 1s countdown tick.
  useEffect(() => {
    if (!hydrated) return;
    FocusLockStorage.setItem(
      storageKey,
      JSON.stringify({ selectedAppIds, appStrategy, selectedModeId, activeProfileId, customProfiles, strictLevel, strictConfig, dailyIntention, focusPoints, blockedAttemptsToday,
        breakConfig, contentRules, notifSettings, sessionState, totalSessionSecs,
        sessionStartTime: sessionStartTime?.toISOString() ?? null })
    ).catch(() => {});
  }, [hydrated, storageKey, selectedAppIds, appStrategy, selectedModeId, activeProfileId, customProfiles, strictLevel, strictConfig, dailyIntention, focusPoints, blockedAttemptsToday,
    breakConfig, contentRules, notifSettings, sessionState, totalSessionSecs, sessionStartTime]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(historyKey).then((raw) => {
      if (!active || !raw) return;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setHistoryRecords(parsed.filter((item): item is FocusHistoryRecord => Boolean(item && typeof item === 'object' && typeof (item as Record<string, unknown>).id === 'string' && typeof (item as Record<string, unknown>).completedAt === 'string')));
        }
      } catch { /* malformed history is handled by the existing history writer */ }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [historyKey]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Discover real Android launchable applications and refresh permission state when returning from Settings.
  const refreshNativeState = useCallback(async () => {
    if (Platform.OS !== 'android' || !focusLockNative) return;
    try {
      const [apps, status, usage] = await Promise.all([
        focusLockNative.getInstalledApps(),
        focusLockNative.getBlockingStatus(),
        focusLockNative.getUsageStats().catch(() => []),
      ]);
      if (!mountedRef.current) return;
      const usageByPackage = new Map(usage.map((item) => [item.packageId, item]));
      const discoveredApps = apps.map((app) => ({
        id: app.packageId,
        name: app.name,
        pkg: app.packageId,
        category: 'Installed Apps',
        dailyMins: usageByPackage.get(app.packageId)?.dailyMins ?? 0,
        launches: usageByPackage.get(app.packageId)?.launches ?? 0,
        recent: Boolean(usageByPackage.get(app.packageId)?.dailyMins),
        distracting: (usageByPackage.get(app.packageId)?.dailyMins ?? 0) >= 30,
        gradientColors: ['#4F46E5', '#0EA5E9'] as [string, string],
        short: app.name.slice(0, 2).toUpperCase(),
      }));
      setNativeApps(discoveredApps);
      setSelectedAppIds((current) => current.filter((id) => discoveredApps.some((app) => app.id === id)));
      setNativeStatus({
        accessibilityEnabled: status.accessibilityEnabled,
        usageAccessEnabled: status.usageAccessEnabled,
        exactAlarmEnabled: Boolean(status.exactAlarmEnabled),
        notificationsEnabled: Boolean(status.notificationsEnabled),
        batteryOptimizationIgnored: Boolean(status.batteryOptimizationIgnored),
        dndAccessEnabled: Boolean(status.dndAccessEnabled),
      });
      if (typeof status.blockedAttemptsToday === 'number') setBlockedAttemptsToday(status.blockedAttemptsToday);
      if (status.activeSession?.status === 'active' || status.activeSession?.status === 'paused') {
        const startedAt = status.activeSession.startedAt;
        const endsAt = status.activeSession.endsAt;
        const isNativePaused = status.activeSession.status === 'paused';
        const sessionStrategy: AppStrategy = status.activeSession.strategy === 'allow' ? 'allow' : 'block';
        const blockedSet = new Set(status.activeSession.packageIds);
        setAppStrategy(sessionStrategy);
        setSessionId(status.activeSession.id);
        setSessionStartTime(new Date(startedAt));
        setTotalSessionSecs(Math.max(1, Math.ceil((endsAt - startedAt) / 1000)));
        if (isNativePaused) {
          const pausedSecs = Math.max(0, Math.ceil((status.activeSession.pausedRemainingMs ?? 0) / 1000));
          setRemainingSecs(pausedSecs);
          setIsPaused(true);
          sessionEndMs.current = null;
        } else {
          setRemainingSecs(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
          setIsPaused(false);
          sessionEndMs.current = endsAt;
        }
        setSessionState((prev) => (prev === 'active_strict' ? 'active_strict' : 'active_focus'));
        setScreen('active_session');
        setSelectedAppIds(
          sessionStrategy === 'allow'
            ? discoveredApps.filter((app) => !blockedSet.has(app.id)).map((app) => app.id)
            : status.activeSession.packageIds,
        );
      }
      const pending = focusLockNative.peekPendingCompletions
        ? await focusLockNative.peekPendingCompletions().catch(() => [])
        : await (focusLockNative.consumePendingCompletions?.().catch(() => []) ?? Promise.resolve([]));
      if (mountedRef.current && Array.isArray(pending) && pending.length > 0) {
        const ackIds: string[] = [];
        pending.forEach((item) => {
          completeSession(item.completedAt, 'completed', {
            id: item.id,
            startedAt: item.startedAt,
            totalSecs: Math.max(1, Math.round((item.endsAt - item.startedAt) / 1000)),
            packageIds: item.packageIds,
            awardPoints: 45,
          });
          if (item.id) ackIds.push(item.id);
        });
        if (ackIds.length > 0 && focusLockNative.acknowledgePendingCompletions) {
          await focusLockNative.acknowledgePendingCompletions(ackIds).catch(() => undefined);
        }
        if (!status.activeSession) {
          setSessionState('completed');
          setRemainingSecs(0);
          setShowCompletionModal(true);
        }
      }
    } catch { if (mountedRef.current) setNativeStatus(null); }
  }, []);

  useEffect(() => { void refreshNativeState(); }, [refreshNativeState]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => { if (next === 'active') void refreshNativeState(); });
    return () => subscription.remove();
  }, [refreshNativeState]);
  // Toast helper
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToastMsg(''), 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (toastRef.current) clearTimeout(toastRef.current);
    };
  }, []);

  const computedDurationMins = useMemo(() => Math.max(1, Math.round(totalSessionSecs / 60)), [totalSessionSecs]);

  const completeSession = useCallback((
    endedAt: number,
    status: 'completed' | 'interrupted' = 'completed',
    overrideSession?: { id: string; startedAt: number; totalSecs: number; packageIds: string[]; awardPoints?: number },
  ) => {
    const targetId = overrideSession?.id ?? sessionId;
    const startMs = overrideSession?.startedAt ?? sessionStartTime?.getTime() ?? null;
    const plannedSecs = overrideSession?.totalSecs ?? totalSessionSecs;
    if (!targetId || startMs === null || creditedSessionId.current === targetId) return;
    if (historyRecordsRef.current.some((existing) => existing.id === targetId)) {
      creditedSessionId.current = targetId;
      return;
    }
    const seconds = Math.max(0, Math.min(plannedSecs, Math.floor((endedAt - startMs) / 1000)));
    if (seconds <= 0) return;
    creditedSessionId.current = targetId;
    const startDate = new Date(startMs);
    dispatch({
      type: 'recordFocusStudy',
      id: targetId,
      date: dayKey(startDate),
      taskId: null,
      seconds,
      category: 'Focus Lock',
      status,
    });
    const record: FocusHistoryRecord = {
      id: targetId,
      subject: 'Focus Lock',
      topic: (overrideSession?.packageIds ?? selectedAppIds).join(', '),
      minutes: seconds / 60,
      completedAt: new Date(endedAt).toISOString(),
      startedAt: startDate.toISOString(),
      endedAt: new Date(endedAt).toISOString(),
      actualSeconds: seconds,
      plannedMinutes: Math.round(plannedSecs / 60),
      status,
    };
    dispatch({ type: 'upsertFocusHistory', record });
    void appendFocusHistory(historyKey, record)
      .then((records) => { if (mountedRef.current) setHistoryRecords(records); })
      .catch(() => undefined);
    if (status === 'completed') {
      const pointsToAdd = overrideSession?.awardPoints ?? 45;
      if (pointsToAdd > 0) setFocusPoints((p) => p + pointsToAdd);
      if (Platform.OS === 'android' && notifSettings.sessionCompleteNotif) {
        void Notifications.scheduleNotificationAsync({
          content: {
            title: 'Focus Lock Complete',
            body: `You stayed focused for ${Math.max(1, Math.round(seconds / 60))} minutes.`,
          },
          trigger: null,
        }).catch(() => undefined);
      }
    }
    if (Platform.OS === 'android' && focusLockNative?.setDndEnabled) {
      void focusLockNative.setDndEnabled(false).catch(() => undefined);
    }
  }, [dispatch, historyKey, notifSettings.sessionCompleteNotif, selectedAppIds, sessionId, sessionStartTime, totalSessionSecs]);

  useEffect(() => {
    const removeBlocked = subscribeFocusLockEvent('onBlockedAppDetected', (payload) => {
      const count = payload && typeof payload === 'object' && typeof (payload as { blockedAttemptsToday?: unknown }).blockedAttemptsToday === 'number'
        ? (payload as { blockedAttemptsToday: number }).blockedAttemptsToday
        : null;
      setBlockedAttemptsToday((previous) => count ?? previous + 1);
    });
    const removeExpired = subscribeFocusLockEvent('onSessionExpired', () => {
      completeSession(Date.now(), 'completed');
      void focusLockNative?.consumePendingCompletions?.().catch(() => undefined);
      setSessionState('completed');
      setRemainingSecs(0);
      setShowCompletionModal(true);
    });
    return () => { removeBlocked(); removeExpired(); };
  }, [completeSession]);

  // Live countdown derives from a wall-clock deadline so backgrounding does not add free focus time.
  useEffect(() => {
    const isActiveFocus = ['active_focus', 'active_strict', 'scheduled_lock'].includes(sessionState);
    if (!isActiveFocus || isPaused || !sessionEndMs.current) return;

    const interval = setInterval(() => {
      const next = Math.max(0, Math.ceil((sessionEndMs.current! - Date.now()) / 1000));
      setRemainingSecs(next);
      if (next <= 0) {
          clearInterval(interval);
          setSessionState('completed');
          if (focusLockNative && sessionId) void focusLockNative.stopBlockingSession(sessionId, false).catch(() => undefined);
          completeSession(sessionEndMs.current ?? Date.now(), 'completed');
          setShowCompletionModal(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [completeSession, computedDurationMins, earnRatioStudy, earnRatioReward, isPaused, sessionId, sessionState]);

  // Live Circular Break Countdown Timer
  useEffect(() => {
    if (sessionState !== 'break_active') return;
    const interval = setInterval(() => {
      setBreakRemainingSecs((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (breakConfig.autoResume) {
            setSessionState(strictLevel >= 2 ? 'active_strict' : 'active_focus');
            setIsPaused(false);
            if (Platform.OS === 'android' && focusLockNative?.resumeBlockingSession && sessionId) {
              void focusLockNative.resumeBlockingSession(sessionId).then((resumed) => {
                sessionEndMs.current = resumed.endsAt;
                setRemainingSecs(Math.max(0, Math.ceil((resumed.endsAt - Date.now()) / 1000)));
              }).catch(() => undefined);
            } else if (remainingSecs > 0) {
              sessionEndMs.current = Date.now() + remainingSecs * 1000;
            }
            showToast('Break finished — Focus Lock resumed automatically!');
          } else {
            setSessionState('ready');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionState, breakConfig.autoResume, strictLevel, showToast]);

  // Handlers
  const handleStartFocus = (
    overrideMinsOrOptions?: number | { mins?: number; strict?: number; preset?: 'until' | 'eod'; untilTime?: string },
    overrideStrict?: number,
  ) => {
    const options = typeof overrideMinsOrOptions === 'object' ? overrideMinsOrOptions : undefined;
    const now = new Date();
    const windowResult = options?.preset === 'eod'
      ? computeEndOfDaySession(now)
      : options?.preset === 'until'
      ? computeUntilTimeSession(options.untilTime ?? '', now)
      : computeDurationSession(
          typeof overrideMinsOrOptions === 'number' ? overrideMinsOrOptions : (options?.mins ?? computedDurationMins),
          now,
        );
    const lvl = options?.strict ?? overrideStrict ?? strictLevel;
    if (!windowResult) { showToast('Choose a valid focus duration'); return; }
    const { startedAt, endsAt, durationMins: mins } = windowResult;
    const packageIds = resolveEffectiveBlockedPackages(allApps, selectedAppIds, appStrategy, contentRules.websiteBlocking);
    if (Platform.OS === 'android' && packageIds.length === 0) {
      showToast(appStrategy === 'allow' ? 'Keep at least one non-allowed app to block' : 'Select at least one installed app to block');
      return;
    }
    if (Platform.OS === 'android' && !nativeStatus?.accessibilityEnabled) { showToast('Enable Accessibility Service in Settings first'); setScreen('settings'); return; }
    const nextSessionId = `focus-lock-${startedAt}-${Math.random().toString(36).slice(2, 8)}`;
    sessionEndMs.current = endsAt;
    setSessionId(nextSessionId);
    setTotalSessionSecs(Math.max(60, Math.ceil((endsAt - startedAt) / 1000)));
    setRemainingSecs(Math.max(1, Math.ceil((endsAt - startedAt) / 1000)));
    setSessionStartTime(new Date(startedAt));
    setIsPaused(false);
    setSessionState(lvl >= 2 ? 'active_strict' : 'active_focus');
    setScreen('active_session');
    if (Platform.OS === 'android' && focusLockNative) {
      void focusLockNative.startBlockingSession({
        sessionId: nextSessionId,
        userId: state.user?.id ?? 'local-user',
        startedAt,
        endsAt,
        packageIds,
        strategy: appStrategy,
      })
        .then(() => {
          if (notifSettings.dndIntegration && nativeStatus?.dndAccessEnabled && focusLockNative?.setDndEnabled) {
            void focusLockNative.setDndEnabled(true).catch(() => undefined);
          }
          if (notifSettings.sessionStartNotif && nativeStatus?.notificationsEnabled) {
            void Notifications.scheduleNotificationAsync({
              content: {
                title: 'Focus Lock Engaged',
                body: `${activeMode.name} active for ${mins}m (${packageIds.length} apps shielded).`,
              },
              trigger: null,
            }).catch(() => undefined);
          }
        })
        .catch(() => { sessionEndMs.current = null; setSessionState('service_unavailable'); setScreen('settings'); showToast('Android blocking could not start'); });
    }
    showToast(`Focus Lock engaged (${mins}m • Level ${lvl})`);
  };

  const handleApplyProfile = (profile: FocusLockProfile) => {
    const isSessionRunning = ['active_focus', 'active_strict', 'scheduled_lock', 'break_active'].includes(sessionState);
    if (isSessionRunning && strictLevel >= 2 && strictConfig.lockProfileEdit) {
      showToast('Profile editing is locked during active Strict sessions');
      return;
    }
    const installedSet = new Set(allApps.map((a) => a.id));
    const validAppIds = Platform.OS === 'android' && allApps.length > 0
      ? profile.appIds.filter((id) => installedSet.has(id))
      : profile.appIds;
    const effective = resolveEffectiveBlockedPackages(allApps, validAppIds, profile.strategy, contentRules.websiteBlocking);
    if (Platform.OS === 'android' && allApps.length > 0 && effective.length === 0) {
      showToast('Profile has no installed apps to block');
      return;
    }
    setActiveProfileId(profile.id);
    setSelectedAppIds(validAppIds);
    setAppStrategy(profile.strategy);
    if (profile.modeId) setSelectedModeId(profile.modeId);
    showToast(`Profile "${profile.name}" activated`);
  };

  const handleSaveCustomProfile = () => {
    const trimmed = profileDraftName.trim();
    if (!trimmed) {
      showToast('Enter a profile name');
      return;
    }
    if (selectedAppIds.length === 0) {
      showToast('Select at least one app before saving a profile');
      return;
    }
    if (editingProfileId) {
      setCustomProfiles((prev) => prev.map((p) => (
        p.id === editingProfileId
          ? { ...p, name: trimmed, appIds: [...selectedAppIds], strategy: appStrategy, modeId: selectedModeId }
          : p
      )));
      showToast(`Profile "${trimmed}" updated`);
    } else {
      const id = `custom-${Date.now()}`;
      const created: FocusLockProfile = {
        id,
        name: trimmed,
        desc: `${appStrategy === 'allow' ? 'Allowlist' : 'Blocklist'} • ${activeMode.name}`,
        appIds: [...selectedAppIds],
        strategy: appStrategy,
        modeId: selectedModeId,
      };
      setCustomProfiles((prev) => [created, ...prev]);
      setActiveProfileId(id);
      showToast(`Profile "${trimmed}" saved`);
    }
    setShowProfileModal(false);
    setProfileDraftName('');
    setEditingProfileId(null);
  };

  const handleDuplicateProfile = (profile: FocusLockProfile) => {
    const id = `custom-${Date.now()}`;
    const copy: FocusLockProfile = {
      ...profile,
      id,
      name: `${profile.name} (Copy)`,
      isPredefined: false,
    };
    setCustomProfiles((prev) => [copy, ...prev]);
    showToast(`Duplicated "${profile.name}"`);
  };

  const handleDeleteProfile = (profileId: string) => {
    setCustomProfiles((prev) => prev.filter((p) => p.id !== profileId));
    if (activeProfileId === profileId) setActiveProfileId('');
    showToast('Custom profile deleted');
  };

  const handleToggleApp = (appId: string) => {
    setSelectedAppIds((prev) => (prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]));
  };

  const handleRequestStrictLevel = (lvl: number) => {
    if (lvl === 3 && strictLevel !== 3) {
      setPendingExtremeConfirm(true);
    } else {
      setStrictLevel(lvl);
      showToast(`Strictness set to Level ${lvl}`);
    }
  };

  const handleStartBreak = () => {
    if (breakConfig.noBreakMode) {
      showToast('No-Break mode is enabled');
      return;
    }
    if (breakConfig.consumed >= breakConfig.dailyBudget) {
      showToast('Daily break budget reached');
      return;
    }
    if (sessionEndMs.current) {
      setRemainingSecs(Math.max(0, Math.ceil((sessionEndMs.current - Date.now()) / 1000)));
    }
    sessionEndMs.current = null;
    setIsPaused(true);
    if (Platform.OS === 'android' && focusLockNative?.pauseBlockingSession && sessionId) {
      void focusLockNative.pauseBlockingSession(sessionId).catch(() => undefined);
    }
    setBreakConfig((prev) => ({ ...prev, consumed: prev.consumed + 1 }));
    setBreakRemainingSecs((breakConfig.breakDuration || 5) * 60);
    setSessionState('break_active');
    setScreen('active_session');
    showToast(`Smart Break started (${breakConfig.breakDuration || 5}m)`);
  };

  const handleGrantPermission = (permId: string) => {
    if (Platform.OS === 'android' && focusLockNative) {
      if (permId === 'accessibility') {
        void focusLockNative.openAccessibilitySettings();
        showToast('Android Settings opened — return here to refresh status');
        return;
      }
      if (permId === 'usage') {
        void focusLockNative.openUsageAccessSettings();
        showToast('Android Settings opened — return here to refresh status');
        return;
      }
      if (permId === 'exact_alarm' && focusLockNative.openExactAlarmSettings) {
        void focusLockNative.openExactAlarmSettings();
        showToast('Exact Alarm Settings opened — return here to refresh status');
        return;
      }
      if (permId === 'notification' && focusLockNative.openNotificationSettings) {
        void focusLockNative.openNotificationSettings();
        showToast('Notification Settings opened — return here to refresh status');
        return;
      }
      if (permId === 'battery' && focusLockNative.openBatteryOptimizationSettings) {
        void focusLockNative.openBatteryOptimizationSettings();
        showToast('Battery Optimization Settings opened — return here to refresh status');
        return;
      }
      if (permId === 'dnd' && focusLockNative.openDndSettings) {
        void focusLockNative.openDndSettings();
        showToast('Do Not Disturb Settings opened — return here to refresh status');
        return;
      }
    }
    showToast('This permission is unavailable on the current platform');
  };

  const analyticsData = useMemo<AnalyticsRangeData>(() => {
    const now = Date.now();
    const windowMs = analyticsRange === 'Daily' ? 24 * 60 * 60 * 1000 : analyticsRange === 'Monthly' ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    const records = historyRecords.filter((record) => {
      const completedAt = Date.parse(record.completedAt);
      return Number.isFinite(completedAt) && now - completedAt >= 0 && now - completedAt <= windowMs;
    });
    const seconds = records.reduce((total, record) => {
      const value = record as FocusHistoryRecord & { actualSeconds?: number; minutes?: number };
      return total + (Number.isFinite(value.actualSeconds) ? Number(value.actualSeconds) : Math.max(0, Number(value.minutes) * 60 || 0));
    }, 0);
    const completed = records.filter((record) => !record.status || record.status === 'completed').length;
    const longest = records.reduce((max, record) => {
      const value = record as FocusHistoryRecord & { actualSeconds?: number; minutes?: number };
      return Math.max(max, Number(value.actualSeconds) || Number(value.minutes) * 60 || 0);
    }, 0);
    return {
      summary: {
        blockedTime: 'Unavailable', blockedAttempts: blockedAttemptsToday, sessionsCompleted: completed,
        longestSession: longest ? `${Math.round(longest / 60)}m` : '0m', focusScore: completed ? Math.round((completed / Math.max(1, records.length)) * 100) : 0,
        scoreDelta: '—', mostDistractingApp: 'Unavailable', mostDistractingTime: 'Unavailable', unlockAttempts: 0, emergencyBreaks: 0,
        consistency: records.length ? `${Math.round((completed / records.length) * 100)}%` : '—', streak: 0,
        actualDistractionUsage: 'Unavailable', estimatedTimeReclaimed: 'Unavailable',
      },
      focusTrend: seconds ? [{ label: analyticsRange, focusMins: Math.round(seconds / 60), completion: completed ? Math.round((completed / Math.max(1, records.length)) * 100) : 0 }] : [],
      appAttempts: [],
    };
  }, [analyticsRange, blockedAttemptsToday, historyRecords]);
  const heatmapData = useMemo<HeatmapData>(() => ({ slots: [], rows: [] }), []);
  const permissionItems = useMemo(() => permissions.map((permission) => {
    if (Platform.OS !== 'android' || !nativeStatus) return permission;
    if (permission.id === 'accessibility') return { ...permission, status: nativeStatus.accessibilityEnabled ? 'Granted' as const : 'Not Granted' as const };
    if (permission.id === 'usage') return { ...permission, status: nativeStatus.usageAccessEnabled ? 'Granted' as const : 'Not Granted' as const };
    if (permission.id === 'exact_alarm') return { ...permission, status: nativeStatus.exactAlarmEnabled ? 'Granted' as const : 'Needs Attention' as const };
    if (permission.id === 'notification') return { ...permission, status: nativeStatus.notificationsEnabled ? 'Granted' as const : 'Not Granted' as const };
    if (permission.id === 'battery') return { ...permission, status: nativeStatus.batteryOptimizationIgnored ? 'Granted' as const : 'Needs Attention' as const };
    if (permission.id === 'dnd') return { ...permission, status: nativeStatus.dndAccessEnabled ? 'Granted' as const : 'Not Granted' as const };
    return { ...permission, status: 'Needs Attention' as const };
  }), [nativeStatus, permissions]);
  const grantedPermsCount = useMemo(() => permissionItems.filter((p) => p.status === 'Granted').length, [permissionItems]);
  const readinessPct = permissionItems.length > 0 ? Math.round((grantedPermsCount / permissionItems.length) * 100) : 0;

  const handleAndroidBack = useCallback((): boolean => {
    if (showPinSetupModal) {
      setShowPinSetupModal(false);
      return true;
    }
    if (pendingExtremeConfirm) {
      setPendingExtremeConfirm(false);
      return true;
    }
    if (showEmergencyModal) {
      setShowEmergencyModal(false);
      return true;
    }
    if (showCompletionModal) {
      setShowCompletionModal(false);
      setSessionState('ready');
      setScreen('home');
      return true;
    }
    const isSessionRunning = ['active_focus', 'active_strict', 'scheduled_lock', 'break_active'].includes(sessionState);
    if (screen !== 'home') {
      if (screen === 'active_session' && isSessionRunning) {
        showToast('Focus Lock is active — use Emergency Access or Pause/End');
        return true;
      }
      setScreen('home');
      return true;
    }
    if (isSessionRunning) {
      setScreen('active_session');
      showToast('Focus Lock session is still active');
      return true;
    }
    return false;
  }, [pendingExtremeConfirm, screen, sessionState, showCompletionModal, showEmergencyModal, showPinSetupModal, showToast]);

  const filteredApps = useMemo(() => {
    return allApps.filter((a) => {
      if (appCategoryFilter !== 'All' && a.category !== appCategoryFilter) return false;
      if (appQuickFilter === 'recent' && !a.recent) return false;
      if (appQuickFilter === 'distracting' && !a.distracting) return false;
      if (appSearch.trim() && !a.name.toLowerCase().includes(appSearch.toLowerCase())) return false;
      return true;
    });
  }, [allApps, appCategoryFilter, appQuickFilter, appSearch]);

  const renderSubHeader = (title: string, subtitle?: string) => (
    <View style={[styles.headerBar, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
      <View style={[styles.rowGap10, { flex: 1 }]}>
        <TouchableOpacity
          onPress={() => setScreen('home')}
          style={[styles.headerIconBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
        >
          <ChevronLeft size={18} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.flex1}>
          <Text numberOfLines={1} style={[styles.textSmExtraBold, { color: theme.textPrimary }]}>
            {title}
          </Text>
          {Boolean(subtitle) && (
            <Text numberOfLines={1} style={[styles.text11Muted, { color: theme.textMuted }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        onPress={() => dispatch({ type: 'settings', patch: { themeMode: isDark ? 'light' : 'dark' } })}
        style={[styles.headerIconBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
      >
        {isDark ? <Sun size={16} color={theme.textSecondary} /> : <Moon size={16} color={theme.textSecondary} />}
      </TouchableOpacity>
    </View>
  );

  /* ==========================================================================
   * SCREEN RENDERER
   * ======================================================================== */
  const renderScreenContent = () => {
    switch (screen) {
      case 'home':
        return (
          <View style={styles.flex1}>
            {/* SCROLLABLE DASHBOARD BODY */}
            <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
              {/* BLOCKING PROFILES */}
              <View style={{ gap: 10 }}>
                <View style={[styles.rowBetween, { paddingHorizontal: 4 }]}>
                  <View>
                    <Text style={[styles.sectionHeading, { color: theme.textMuted }]}>BLOCKING PROFILES</Text>
                    <Text style={[styles.text10Muted, { color: theme.textMuted, marginTop: 1 }]}>
                      Next scheduled: {nextScheduleText}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingProfileId(null);
                      setProfileDraftName('');
                      setShowProfileModal(true);
                    }}
                    style={[styles.smallPillBtn, { backgroundColor: theme.indigoSoft, borderColor: theme.indigoBorder }]}
                  >
                    <Text style={[styles.text10Bold, { color: theme.indigoLight }]}>+ Save Profile</Text>
                  </TouchableOpacity>
                </View>
                {presetLists.length === 0 ? (
                  <View style={[styles.cardRounded2xl, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                    <Text style={[styles.text11Muted, { color: theme.textMuted }]}>
                      Select apps in App Selection and tap "+ Save Profile" to create your first Focus Lock profile.
                    </Text>
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {presetLists.map((pl) => {
                      const active = activeProfileId === pl.id;
                      return (
                        <View
                          key={pl.id}
                          style={[
                            styles.profileCard,
                            active
                              ? { backgroundColor: '#4F46E5', borderColor: '#6366F1' }
                              : { backgroundColor: theme.cardBg, borderColor: theme.border },
                          ]}
                        >
                          <TouchableOpacity activeOpacity={0.85} onPress={() => handleApplyProfile(pl)}>
                            <Text numberOfLines={1} style={[styles.textXsBold, { color: active ? '#FFFFFF' : theme.textPrimary }]}>
                              {pl.name}
                            </Text>
                            <Text
                              numberOfLines={1}
                              style={{ fontSize: 10, marginTop: 2, color: active ? '#E0E7FF' : theme.textMuted }}
                            >
                              {pl.appIds.length} apps • {pl.strategy === 'allow' ? 'Allowlist' : 'Blocklist'}
                            </Text>
                          </TouchableOpacity>
                          <View style={[styles.rowGap6, { marginTop: 8 }]}>
                            <TouchableOpacity onPress={() => handleDuplicateProfile(pl)}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: active ? '#E0E7FF' : theme.indigoLight }}>
                                Duplicate
                              </Text>
                            </TouchableOpacity>
                            {!pl.isPredefined && (
                              <>
                                <TouchableOpacity
                                  onPress={() => {
                                    setEditingProfileId(pl.id);
                                    setProfileDraftName(pl.name);
                                    setShowProfileModal(true);
                                  }}
                                >
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: active ? '#FFFFFF' : theme.textSecondary }}>
                                    Rename
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDeleteProfile(pl.id)}>
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: active ? '#FECDD3' : theme.rose }}>
                                    Delete
                                  </Text>
                                </TouchableOpacity>
                              </>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              {/* F–L. DISCIPLINE CONTROLS (2-COLUMN GRID) */}
              <View style={{ gap: 10 }}>
                <Text style={[styles.sectionHeading, { color: theme.textMuted, paddingHorizontal: 4 }]}>
                  DISCIPLINE CONTROLS
                </Text>
                <View style={styles.controlsGrid}>
                  {([
                    { id: 'modes', title: 'Blocking Modes', sub: activeMode.name, icon: Layers, color: '#6366F1', bg: 'rgba(99,102,241,0.12)' },
                    { id: 'apps', title: 'App Selection', sub: `${selectedAppIds.length} ${appStrategy === 'block' ? 'blocked' : 'allowed'}`, icon: Smartphone, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
                    { id: 'strict', title: 'Strict Mode', sub: `Level ${strictLevel} • ${strictLevel === 3 ? 'Extreme' : strictLevel === 2 ? 'Strong' : 'Normal'}`, icon: Lock, color: strictLevel === 3 ? '#F43F5E' : '#F59E0B', bg: strictLevel === 3 ? 'rgba(244,63,94,0.12)' : 'rgba(245,158,11,0.12)' },
                    { id: 'analytics', title: 'Focus Analytics', sub: `Score ${analyticsData.summary.focusScore}/100`, icon: BarChart3, color: '#6366F1', bg: 'rgba(99,102,241,0.12)' },
                    { id: 'content', title: 'Web & Shorts', sub: 'Reels & URL guard', icon: Globe, color: '#F43F5E', bg: 'rgba(244,63,94,0.12)' },
                  ] as const).map((item) => {
                    const Icon = item.icon;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.82}
                        onPress={() => setScreen(item.id)}
                        style={[styles.controlCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                      >
                        <View style={styles.rowBetween}>
                          <View style={[styles.iconBox36, { backgroundColor: item.bg }]}>
                            <Icon size={17} color={item.color} />
                          </View>
                          <ChevronRight size={16} color={theme.textMuted} />
                        </View>
                        <View>
                          <Text style={[styles.textXsBold, { color: theme.textPrimary }]}>{item.title}</Text>
                          <Text numberOfLines={1} style={[styles.text10Muted, { color: theme.textMuted, marginTop: 2 }]}>
                            {item.sub}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* L. PERMISSION HEALTH QUICK BAR */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setScreen('settings')}
                style={[styles.cardRounded2xl, styles.rowBetween, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
              >
                <View style={[styles.rowGap10, { flex: 1 }]}>
                  <Cpu size={18} color={readinessPct === 100 ? theme.emerald : theme.amber} />
                  <View style={styles.flex1}>
                    <Text style={[styles.textXsBold, { color: theme.textPrimary }]}>Android Protection Readiness</Text>
                    <Text style={[styles.text10Muted, { color: theme.textMuted, marginTop: 1 }]}>
                      {grantedPermsCount}/{permissions.length} permissions ready • DND & Background Service
                    </Text>
                  </View>
                </View>
                <Text style={[styles.textXsExtraBold, { color: readinessPct === 100 ? theme.emerald : theme.amber }]}>
                  {readinessPct}%
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        );

      case 'active_session': {
        const isBreak = sessionState === 'break_active';
        const isStrict = strictLevel >= 2;
        const expectedEnd = sessionStartTime
          ? new Date(sessionStartTime.getTime() + totalSessionSecs * 1000)
          : new Date(Date.now() + remainingSecs * 1000);

        return (
          <View style={styles.flex1}>
            {renderSubHeader(
              isBreak ? 'Smart Break Active' : 'Focus Lock Active',
              `${activeMode.name} • Strictness Level ${strictLevel}`
            )}
            <ScrollView contentContainerStyle={[styles.scrollBody, { gap: 18 }]}>
              <View style={{ alignItems: 'center' }}>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: isBreak ? theme.tealSoft : strictLevel === 3 ? theme.roseSoft : theme.emeraldSoft,
                      borderColor: isBreak ? 'rgba(20,184,166,0.28)' : strictLevel === 3 ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.28)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.text11Bold,
                      { color: isBreak ? theme.teal : strictLevel === 3 ? theme.rose : theme.emerald },
                    ]}
                  >
                    {isBreak
                      ? 'Auto-resumes focus when timer ends'
                      : strictLevel === 3
                      ? 'Extreme Commitment Locked'
                      : 'Distraction Shield Engaged'}
                  </Text>
                </View>
              </View>

              <CircularFocusTimer
                totalSeconds={isBreak ? (breakConfig.breakDuration || 5) * 60 : totalSessionSecs}
                remainingSeconds={isBreak ? breakRemainingSecs : remainingSecs}
                label={isBreak ? 'BREAK REMAINING' : 'FOCUS REMAINING'}
                sublabel={isBreak ? 'Step away from feeds' : `${selectedAppIds.length} apps shielded`}
                tone={isBreak ? 'teal' : strictLevel === 3 ? 'rose' : 'indigo'}
                theme={theme}
              />

              <View style={styles.controlsGrid}>
                <View style={[styles.metaTile, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                  <Text style={[styles.text10Muted, { color: theme.textMuted }]}>Started At</Text>
                  <Text style={[styles.textXsBold, { color: theme.textPrimary, marginTop: 2 }]}>
                    {sessionStartTime ? formatClockTime(sessionStartTime) : formatClockTime(new Date())}
                  </Text>
                </View>
                <View style={[styles.metaTile, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                  <Text style={[styles.text10Muted, { color: theme.textMuted }]}>Expected End</Text>
                  <Text style={[styles.textXsBold, { color: theme.textPrimary, marginTop: 2 }]}>
                    {formatClockTime(expectedEnd)}
                  </Text>
                </View>
                <View style={[styles.metaTile, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                  <Text style={[styles.text10Muted, { color: theme.textMuted }]}>Active Profile</Text>
                  <Text numberOfLines={1} style={[styles.textXsBold, { color: theme.textPrimary, marginTop: 2 }]}>
                    {presetLists.find((p) => p.id === activeProfileId)?.name || 'Custom'}
                  </Text>
                </View>
                <View style={[styles.metaTile, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                  <Text style={[styles.text10Muted, { color: theme.textMuted }]}>Strictness</Text>
                  <Text style={[styles.textXsBold, { color: theme.indigoLight, marginTop: 2 }]}>
                    Level {strictLevel} ({strictLevel === 3 ? 'Extreme' : strictLevel === 2 ? 'Strong' : 'Normal'})
                  </Text>
                </View>
              </View>

              <View style={{ gap: 10 }}>
                {isBreak ? (
                  <TouchableOpacity
                    onPress={() => {
                      setSessionState(isStrict ? 'active_strict' : 'active_focus');
                      setIsPaused(false);
                      if (Platform.OS === 'android' && focusLockNative?.resumeBlockingSession && sessionId) {
                        void focusLockNative.resumeBlockingSession(sessionId).then((resumed) => {
                          sessionEndMs.current = resumed.endsAt;
                          setRemainingSecs(Math.max(0, Math.ceil((resumed.endsAt - Date.now()) / 1000)));
                        }).catch(() => undefined);
                      } else if (remainingSecs > 0) {
                        sessionEndMs.current = Date.now() + remainingSecs * 1000;
                      }
                      showToast('Returned to Focus Lock early!');
                    }}
                    style={styles.indigoFullBtn}
                  >
                    <Text style={[styles.textXsBold, { color: '#FFFFFF' }]}>End Break Early & Resume Focus</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <View style={styles.grid2}>
                      <TouchableOpacity
                        onPress={() => {
                          if (strictLevel === 3) {
                            showToast('Pause disabled in Extreme Mode');
                            return;
                          }
                          if (isPaused) {
                            setIsPaused(false);
                            if (Platform.OS === 'android' && focusLockNative?.resumeBlockingSession && sessionId) {
                              void focusLockNative.resumeBlockingSession(sessionId).then((resumed) => {
                                sessionEndMs.current = resumed.endsAt;
                                setRemainingSecs(Math.max(0, Math.ceil((resumed.endsAt - Date.now()) / 1000)));
                              }).catch(() => undefined);
                            } else {
                              sessionEndMs.current = Date.now() + remainingSecs * 1000;
                            }
                          } else {
                            if (sessionEndMs.current) setRemainingSecs(Math.max(0, Math.ceil((sessionEndMs.current - Date.now()) / 1000)));
                            sessionEndMs.current = null;
                            setIsPaused(true);
                            if (Platform.OS === 'android' && focusLockNative?.pauseBlockingSession && sessionId) {
                              void focusLockNative.pauseBlockingSession(sessionId).catch(() => undefined);
                            }
                          }
                        }}
                        style={[
                          styles.outlineActionBtn,
                          {
                            backgroundColor: theme.cardBg,
                            borderColor: theme.border,
                            opacity: strictLevel === 3 ? 0.4 : 1,
                          },
                        ]}
                      >
                        {isPaused ? <Play size={14} color={theme.textPrimary} /> : <Pause size={14} color={theme.textPrimary} />}
                        <Text style={[styles.textXsBold, { color: theme.textPrimary }]}>{isPaused ? 'Resume' : 'Pause'}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleStartBreak}
                        style={[styles.outlineActionBtn, { backgroundColor: theme.tealSoft, borderColor: 'rgba(20,184,166,0.3)' }]}
                      >
                        <Coffee size={14} color={theme.teal} />
                        <Text style={[styles.textXsBold, { color: theme.teal }]}>Take Break</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.grid2}>
                      {strictLevel === 1 ? (
                        <>
                          <TouchableOpacity
                            onPress={() => {
                              setSessionState('interrupted');
                              if (focusLockNative && sessionId) void focusLockNative.stopBlockingSession(sessionId, true).catch(() => undefined);
                              completeSession(Date.now(), 'interrupted');
                              setScreen('home');
                              showToast('Session ended early');
                            }}
                            style={[styles.outlineActionBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                          >
                            <Text style={[styles.textXsBold, { color: theme.textPrimary }]}>End Session</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => {
                              if (!canCompleteSessionEarly(strictLevel, Date.now(), sessionEndMs.current)) {
                                showToast('Complete Session is locked in Strict Mode');
                                return;
                              }
                              setRemainingSecs(0);
                              setSessionState('completed');
                              if (focusLockNative && sessionId) void focusLockNative.stopBlockingSession(sessionId, false).catch(() => undefined);
                              completeSession(Date.now(), 'completed');
                              setShowCompletionModal(true);
                            }}
                            style={[styles.outlineActionBtn, { backgroundColor: '#059669', borderColor: '#059669' }]}
                          >
                            <Text style={[styles.textXsBold, { color: '#FFFFFF' }]}>Complete Session</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity
                          onPress={() => {
                            setSessionState('emergency_requested');
                            setShowEmergencyModal(true);
                          }}
                          style={[styles.outlineActionBtn, { backgroundColor: theme.roseSoft, borderColor: 'rgba(244,63,94,0.3)' }]}
                        >
                          <Text style={[styles.textXsBold, { color: theme.rose }]}>Emergency Access</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
              </View>
            </ScrollView>
          </View>
        );
      }

      case 'modes':
        return (
          <View style={styles.flex1}>
            {renderSubHeader('Blocking Modes', 'Choose how Study Sakha enforces protection')}
            <ScrollView contentContainerStyle={styles.scrollBody}>
              {modes.map((m) => (
                <BlockingModeCard
                  key={m.id}
                  mode={m}
                  selected={selectedModeId === m.id}
                  onSelect={(modeObj) => {
                    const isSessionRunning = ['active_focus', 'active_strict', 'scheduled_lock', 'break_active'].includes(sessionState);
                    if (modeObj.supported === false) {
                      showToast(modeObj.unsupportedReason ?? `${modeObj.name} is not supported in this build`);
                      return;
                    }
                    if (isSessionRunning && strictLevel >= 2) {
                      showToast('Cannot switch blocking mode during an active Strict session');
                      return;
                    }
                    setSelectedModeId(modeObj.id);
                    if (modeObj.id === 'allowlist') {
                      setAppStrategy('allow');
                      setStrictLevel(modeObj.strictDefault);
                    } else if (modeObj.id === 'pomodoro') {
                      setAppStrategy('block');
                      setStrictLevel(modeObj.strictDefault);
                      setBreakConfig((prev) => ({ ...prev, noBreakMode: false, autoResume: true }));
                    } else if (modeObj.id === 'deep') {
                      setAppStrategy('block');
                      if (strictLevel !== 3) setPendingExtremeConfirm(true);
                      if (nativeStatus?.dndAccessEnabled) {
                        setNotifSettings((prev) => ({ ...prev, dndIntegration: true }));
                      }
                    } else if (modeObj.id === 'scheduled') {
                      setAppStrategy('block');
                      setStrictLevel(modeObj.strictDefault);
                      showToast(`Next Study Planner session: ${nextScheduleText}`);
                      return;
                    } else if (modeObj.id === 'emergency') {
                      setAppStrategy('block');
                      handleStartFocus(45, 2);
                      return;
                    } else {
                      setAppStrategy('block');
                      setStrictLevel(modeObj.strictDefault);
                    }
                    showToast(`${modeObj.name} activated (Level ${modeObj.strictDefault})`);
                  }}
                  theme={theme}
                />
              ))}
            </ScrollView>
          </View>
        );

      case 'apps':
        return (
          <View style={styles.flex1}>
            {renderSubHeader('App Management', 'Blocklist vs Allowlist control (Demo dataset)')}
            <ScrollView contentContainerStyle={styles.scrollBody}>
              {/* Strategy Switcher */}
              <View style={[styles.segmentTrack, { backgroundColor: theme.surfaceElevated }]}>
                <TouchableOpacity
                  onPress={() => setAppStrategy('block')}
                  style={[styles.segmentTab, appStrategy === 'block' && { backgroundColor: theme.isDark ? '#171C2B' : '#FFFFFF' }]}
                >
                  <Text style={[styles.textXsBold, { color: appStrategy === 'block' ? theme.rose : theme.textMuted }]}>
                    Block Selected ({selectedAppIds.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setAppStrategy('allow')}
                  style={[styles.segmentTab, appStrategy === 'allow' && { backgroundColor: theme.isDark ? '#171C2B' : '#FFFFFF' }]}
                >
                  <Text style={[styles.textXsBold, { color: appStrategy === 'allow' ? theme.emerald : theme.textMuted }]}>
                    Allow Only Selected
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={[styles.searchBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <Search size={16} color={theme.textMuted} />
                <TextInput
                  value={appSearch}
                  onChangeText={setAppSearch}
                  placeholder="Search installed applications..."
                  placeholderTextColor={theme.textMuted}
                  style={[styles.searchInput, { color: theme.textPrimary }]}
                />
              </View>

              {/* Quick Filters + Select All / Clear */}
              <View style={[styles.rowBetween, { flexWrap: 'wrap', gap: 8 }]}>
                <View style={styles.rowGap6}>
                  {([
                    { id: 'all', label: 'All' },
                    { id: 'distracting', label: 'Most Distracting' },
                    { id: 'recent', label: 'Recently Used' },
                  ] as const).map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      onPress={() => setAppQuickFilter(f.id)}
                      style={[
                        styles.quickFilterChip,
                        { backgroundColor: appQuickFilter === f.id ? '#4F46E5' : theme.surfaceElevated },
                      ]}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color: appQuickFilter === f.id ? '#FFFFFF' : theme.textSecondary }}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.rowGap10}>
                  <TouchableOpacity onPress={() => setSelectedAppIds(filteredApps.map((a) => a.id))}>
                    <Text style={[styles.text11Bold, { color: theme.indigoLight }]}>Select All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setSelectedAppIds([])}>
                    <Text style={[styles.text11Bold, { color: theme.textMuted }]}>Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Category Chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {categories.map((c) => (
                  <AppCategoryChip
                    key={c}
                    label={c}
                    active={appCategoryFilter === c}
                    onPress={() => setAppCategoryFilter(c)}
                    theme={theme}
                  />
                ))}
              </ScrollView>

              <Text style={[styles.text10Muted, { color: theme.textMuted, paddingHorizontal: 4 }]}>
                Architecture note: Populated via AppDiscoveryService mock data; maps directly to Android PackageManager in native build.
              </Text>

              <AppSelectionList
                apps={filteredApps}
                selectedAppIds={selectedAppIds}
                strategy={appStrategy}
                onToggleApp={handleToggleApp}
                theme={theme}
              />
            </ScrollView>
          </View>
        );

      case 'strict':
        return (
          <View style={styles.flex1}>
            {renderSubHeader('Strict Mode', 'Configure discipline friction & safeguards')}
            <ScrollView contentContainerStyle={styles.scrollBody}>
              <StrictModeSelector level={strictLevel} onRequestSelectLevel={handleRequestStrictLevel} theme={theme} />

              <View style={[styles.cardRounded2xl, { backgroundColor: theme.cardBg, borderColor: theme.border, padding: 16, gap: 12 }]}>
                <Text style={[styles.textXsExtraBold, { color: theme.textPrimary }]}>Safeguards & Friction</Text>

                <View style={styles.rowBetween}>
                  <Text style={[styles.textXsSemi, { color: theme.textSecondary }]}>Unlock Cooldown</Text>
                  <View style={styles.rowGap4}>
                    {[1, 5, 10, 15].map((m) => (
                      <TouchableOpacity
                        key={m}
                        onPress={() => setStrictConfig((c) => ({ ...c, cooldownMins: m }))}
                        style={[
                          styles.cooldownChip,
                          { backgroundColor: strictConfig.cooldownMins === m ? '#4F46E5' : theme.surfaceElevated },
                        ]}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: strictConfig.cooldownMins === m ? '#FFFFFF' : theme.textMuted }}>
                          {m}m
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {([
                  { key: 'preventAccidental', label: 'Prevent accidental unlocking' },
                  { key: 'pinProtection', label: hasConfiguredPin ? 'PIN protection (Configured)' : 'PIN protection (Not configured)' },
                  { key: 'trustedApproval', label: 'Trusted person approval (Extreme)' },
                  { key: 'commitmentConfirm', label: 'Session commitment confirmation' },
                  { key: 'limitEmergencyExits', label: 'Limit emergency exits (2/week)' },
                  { key: 'lockProfileEdit', label: 'Lock profile changes while active' },
                  { key: 'lockScheduleEdit', label: 'Lock schedule edits while active' },
                ] as const).map((opt) => (
                  <View key={opt.key} style={styles.rowBetween}>
                    <Text style={[styles.textXsSemi, { color: theme.textSecondary, flex: 1 }]}>{opt.label}</Text>
                    <PillToggle
                      value={opt.key === 'pinProtection' ? strictConfig.pinProtection && hasConfiguredPin : strictConfig[opt.key]}
                      onToggle={() => {
                        const isSessionRunning = ['active_focus', 'active_strict', 'scheduled_lock'].includes(sessionState);
                        if (opt.key === 'pinProtection') {
                          if (isSessionRunning && strictLevel >= 2) {
                            showToast('Cannot modify Exit PIN during an active Strict session');
                            return;
                          }
                          if (!hasConfiguredPin) {
                            setPinDraft('');
                            setPinConfirmDraft('');
                            setPinSetupError('');
                            setShowPinSetupModal(true);
                            return;
                          }
                          setStrictConfig((c) => ({ ...c, pinProtection: !c.pinProtection }));
                          return;
                        }
                        setStrictConfig((c) => ({ ...c, [opt.key]: !c[opt.key] }));
                      }}
                      isDark={theme.isDark}
                    />
                  </View>
                ))}
                {hasConfiguredPin && (
                  <View style={styles.rowGap8}>
                    <TouchableOpacity
                      onPress={() => {
                        if (['active_focus', 'active_strict', 'scheduled_lock'].includes(sessionState) && strictLevel >= 2) {
                          showToast('Cannot change Exit PIN during an active Strict session');
                          return;
                        }
                        setPinDraft('');
                        setPinConfirmDraft('');
                        setPinSetupError('');
                        setShowPinSetupModal(true);
                      }}
                      style={[styles.outlineActionBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, paddingVertical: 8 }]}
                    >
                      <Text style={[styles.text11Bold, { color: theme.textPrimary }]}>Change Exit PIN</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        if (['active_focus', 'active_strict', 'scheduled_lock'].includes(sessionState) && strictLevel >= 2) {
                          showToast('Cannot remove Exit PIN during an active Strict session');
                          return;
                        }
                        void clearExitPin(state.user?.id).then(() => {
                          setHasConfiguredPin(false);
                          setStrictConfig((c) => ({ ...c, pinProtection: false }));
                          showToast('Exit PIN removed');
                        });
                      }}
                      style={[styles.outlineActionBtn, { backgroundColor: theme.roseSoft, borderColor: 'rgba(244,63,94,0.3)', paddingVertical: 8 }]}
                    >
                      <Text style={[styles.text11Bold, { color: theme.rose }]}>Remove PIN</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={[styles.cardRounded2xl, { backgroundColor: theme.emeraldSoft, borderColor: 'rgba(16,185,129,0.22)', gap: 6 }]}>
                <View style={styles.rowGap6}>
                  <Phone size={14} color={theme.emerald} />
                  <Text style={[styles.text11Bold, { color: theme.emerald }]}>Emergency Access Always Preserved</Text>
                </View>
                <Text style={[styles.text11Relaxed, { color: theme.textSecondary }]}>
                  Emergency calling and critical device safety actions are never blocked. Note: As a frontend prototype, OS-level uninstall or force-stop prevention requires future native Android Device Policy integration.
                </Text>
              </View>
            </ScrollView>
          </View>
        );

      case 'analytics':
        return (
          <View style={styles.flex1}>
            {renderSubHeader('Focus Analytics', 'Actual usage vs blocked attempts kept separate')}
            <ScrollView contentContainerStyle={styles.scrollBody}>
              <View style={styles.rowBetween}>
                <View style={[styles.segmentTrackInline, { backgroundColor: theme.surfaceElevated }]}>
                  {(['Daily', 'Weekly', 'Monthly'] as const).map((r) => {
                    const active = analyticsRange === r && !showEmptyAnalytics;
                    return (
                      <TouchableOpacity
                        key={r}
                        onPress={() => {
                          setShowEmptyAnalytics(false);
                          setAnalyticsRange(r);
                        }}
                        style={[styles.rangeTab, active && { backgroundColor: theme.isDark ? '#171C2B' : '#FFFFFF' }]}
                      >
                        <Text style={[styles.text11Bold, { color: active ? theme.indigoLight : theme.textMuted }]}>{r}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity onPress={() => setShowEmptyAnalytics((e) => !e)}>
                  <Text style={[styles.text10Bold, { color: theme.textMuted }]}>
                    {showEmptyAnalytics ? 'Show Data' : 'Empty State'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showEmptyAnalytics ? (
                <View style={[styles.emptyAnalyticsBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                  <BarChart3 size={40} color={theme.textMuted} />
                  <Text style={[styles.textSmBold, { color: theme.textPrimary }]}>No Focus Data Yet</Text>
                  <Text style={[styles.textXsMutedCenter, { color: theme.textMuted }]}>
                    Complete your first Study Sakha Focus Lock session to unlock behavioral heatmaps and distraction trends.
                  </Text>
                  <TouchableOpacity onPress={() => setShowEmptyAnalytics(false)} style={styles.simulateBtn}>
                    <Text style={[styles.textXsBold, { color: '#FFFFFF' }]}>View Available Data</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={[styles.separationBanner, { backgroundColor: theme.indigoSoft, borderColor: theme.indigoBorder }]}>
                    <View style={styles.separationCol}>
                      <Text style={[styles.separationLabel, { color: theme.textMuted }]}>ACTUAL USAGE</Text>
                      <Text style={[styles.textXsExtraBold, { color: theme.textPrimary, marginTop: 2 }]}>
                        {analyticsData.summary.actualDistractionUsage}
                      </Text>
                    </View>
                    <View style={[styles.separationCol, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: theme.indigoBorder }]}>
                      <Text style={[styles.separationLabel, { color: theme.textMuted }]}>BLOCKED ATTEMPTS</Text>
                      <Text style={[styles.textXsExtraBold, { color: theme.rose, marginTop: 2 }]}>
                        {analyticsData.summary.blockedAttempts}
                      </Text>
                    </View>
                    <View style={styles.separationCol}>
                      <Text style={[styles.separationLabel, { color: theme.textMuted }]}>EST. RECLAIMED</Text>
                      <Text style={[styles.textXsExtraBold, { color: theme.emerald, marginTop: 2 }]}>
                        {analyticsData.summary.estimatedTimeReclaimed}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.controlsGrid}>
                    <AnalyticsCard label="Total Blocked Time" value={analyticsData.summary.blockedTime} trend={analyticsData.summary.scoreDelta} sub={`${analyticsData.summary.sessionsCompleted} sessions`} theme={theme} />
                    <AnalyticsCard label="Daily Focus Score" value={`${analyticsData.summary.focusScore}/100`} trend={analyticsData.summary.scoreDelta} sub={`Consistency ${analyticsData.summary.consistency}`} theme={theme} />
                    <AnalyticsCard label="Most Distracting" value={analyticsData.summary.mostDistractingApp} sub={`Peak: ${analyticsData.summary.mostDistractingTime}`} theme={theme} />
                    <AnalyticsCard label="Longest Sprint" value={analyticsData.summary.longestSession} sub={`${analyticsData.summary.streak}d streak • ${analyticsData.summary.emergencyBreaks} emergency`} theme={theme} />
                  </View>

                  <DistractionChart
                    focusTrend={analyticsData.focusTrend}
                    appAttempts={analyticsData.appAttempts}
                    heatmap={heatmapData}
                    theme={theme}
                  />
                </>
              )}
            </ScrollView>
          </View>
        );

      case 'content':
        return (
          <View style={styles.flex1}>
            {renderSubHeader('Content & Web Filtering', 'Short-form feeds, URLs & keyword guards')}
            <ScrollView contentContainerStyle={styles.scrollBody}>
              <View style={[styles.safetyBanner, { backgroundColor: theme.amberSoft, borderColor: 'rgba(245,158,11,0.28)' }]}>
                <Info size={16} color={theme.amber} />
                <Text style={[styles.text11Relaxed, { color: theme.amber, flex: 1 }]}>
                  <Text style={{ fontWeight: '700' }}>App-Level Browser Shielding Only: </Text>
                  Browser Blocking shields installed browser apps (Chrome, Brave, Samsung Internet, Firefox) during Blocklist sessions. Per-URL, keyword, and in-app Shorts/Reels filtering are not supported without a local VPN or window-content service.
                </Text>
              </View>

              <View style={[styles.cardRounded2xl, { backgroundColor: theme.cardBg, borderColor: theme.border, padding: 16, gap: 12 }]}>
                <Text style={[styles.textXsExtraBold, { color: theme.textPrimary }]}>Browser & Short-Form Controls</Text>
                {([
                  { key: 'websiteBlocking', label: 'Browser App Blocking (Active)', sub: 'Blocks installed browser apps during Blocklist sessions' },
                  { key: 'ytShorts', label: 'YouTube Shorts (Unsupported)', sub: 'Requires window-content inspection; block YouTube app instead' },
                  { key: 'igReels', label: 'Instagram Reels (Unsupported)', sub: 'Requires window-content inspection; block Instagram app instead' },
                  { key: 'igStories', label: 'Instagram Stories (Unsupported)', sub: 'Requires window-content inspection; not active in this build' },
                  { key: 'snapSpotlight', label: 'Snapchat Spotlight (Unsupported)', sub: 'Requires window-content inspection; not active in this build' },
                  { key: 'adultFilter', label: 'Adult & Explicit Filter (Unsupported)', sub: 'Requires local DNS/VPN service; not active in this build' },
                ] as const).map((item) => (
                  <View key={item.key} style={styles.rowBetween}>
                    <View style={[styles.flex1, { paddingRight: 10 }]}>
                      <Text style={[styles.textXsSemi, { color: theme.textPrimary }]}>{item.label}</Text>
                      <Text style={[styles.text10Muted, { color: theme.textMuted }]}>{item.sub}</Text>
                    </View>
                    <PillToggle
                      value={contentRules[item.key]}
                      onToggle={() => setContentRules((c) => ({ ...c, [item.key]: !c[item.key] }))}
                      isDark={theme.isDark}
                    />
                  </View>
                ))}
              </View>

              {/* Custom Blocked URLs */}
              <View style={[styles.cardRounded2xl, { backgroundColor: theme.cardBg, borderColor: theme.border, padding: 16, gap: 10 }]}>
                <Text style={[styles.textXsBold, { color: theme.textPrimary }]}>Custom Blocked URLs</Text>
                <View style={styles.rowGap8}>
                  <TextInput
                    value={newUrlInput}
                    onChangeText={setNewUrlInput}
                    placeholder="e.g., twitter.com"
                    placeholderTextColor={theme.textMuted}
                    style={[styles.textInputField, { flex: 1, backgroundColor: theme.surfaceBg, borderColor: theme.border, color: theme.textPrimary }]}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      if (!newUrlInput.trim()) return;
                      setContentRules((c) => ({ ...c, customUrls: [newUrlInput.trim(), ...c.customUrls] }));
                      setNewUrlInput('');
                    }}
                    style={styles.addInlineBtn}
                  >
                    <Text style={[styles.textXsBold, { color: '#FFFFFF' }]}>Add</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.wrapRow}>
                  {contentRules.customUrls.map((u) => (
                    <View key={u} style={[styles.removableChip, { backgroundColor: theme.roseSoft }]}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: theme.rose }}>{u}</Text>
                      <TouchableOpacity onPress={() => setContentRules((c) => ({ ...c, customUrls: c.customUrls.filter((x) => x !== u) }))}>
                        <X size={12} color={theme.rose} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>

              {/* Keyword Rules */}
              <View style={[styles.cardRounded2xl, { backgroundColor: theme.cardBg, borderColor: theme.border, padding: 16, gap: 10 }]}>
                <Text style={[styles.textXsBold, { color: theme.textPrimary }]}>Keyword Website Filters</Text>
                <View style={styles.rowGap8}>
                  <TextInput
                    value={newKeywordInput}
                    onChangeText={setNewKeywordInput}
                    placeholder="Add distracting keyword..."
                    placeholderTextColor={theme.textMuted}
                    style={[styles.textInputField, { flex: 1, backgroundColor: theme.surfaceBg, borderColor: theme.border, color: theme.textPrimary }]}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      if (!newKeywordInput.trim()) return;
                      setContentRules((c) => ({ ...c, keywords: [newKeywordInput.trim(), ...c.keywords] }));
                      setNewKeywordInput('');
                    }}
                    style={styles.addInlineBtn}
                  >
                    <Text style={[styles.textXsBold, { color: '#FFFFFF' }]}>Add</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.wrapRow}>
                  {contentRules.keywords.map((k) => (
                    <View key={k} style={[styles.removableChip, { backgroundColor: theme.surfaceElevated }]}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: theme.textSecondary }}>#{k}</Text>
                      <TouchableOpacity onPress={() => setContentRules((c) => ({ ...c, keywords: c.keywords.filter((x) => x !== k) }))}>
                        <X size={12} color={theme.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        );

      case 'settings':
        return (
          <View style={styles.flex1}>
            {renderSubHeader('Settings & Service Health', 'Android DND, notifications & permissions')}
            <ScrollView contentContainerStyle={styles.scrollBody}>
              <LinearGradient
                colors={['rgba(79,70,229,0.16)', 'rgba(16,185,129,0.10)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.cardRounded2xl, { borderColor: theme.indigoBorder, padding: 16, gap: 10 }]}
              >
                <View style={styles.rowBetween}>
                  <View>
                    <Text style={[styles.textXsExtraBold, { color: theme.textPrimary }]}>Protection Readiness Score</Text>
                    <Text style={[styles.text10Muted, { color: theme.textMuted }]}>Android status is checked when native support is available</Text>
                  </View>
                  <Text style={[styles.readinessDigits, { color: theme.indigoLight }]}>{readinessPct}%</Text>
                </View>
                <View style={[styles.progressTrackLg, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.65)' }]}>
                  <LinearGradient
                    colors={['#6366F1', '#10B981']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ height: '100%', width: `${readinessPct}%`, borderRadius: 999 }}
                  />
                </View>
              </LinearGradient>

              <View style={[styles.cardRounded2xl, { backgroundColor: theme.cardBg, borderColor: theme.border, padding: 16, gap: 8 }]}>
                <Text style={[styles.textXsBold, { color: theme.textPrimary }]}>Daily Study Intention (Shown on Intervention)</Text>
                <TextInput
                  value={dailyIntention}
                  onChangeText={setDailyIntention}
                  style={[styles.textInputField, { backgroundColor: theme.surfaceBg, borderColor: theme.border, color: theme.textPrimary }]}
                />
              </View>

              <View style={[styles.cardRounded2xl, { backgroundColor: theme.cardBg, borderColor: theme.border, padding: 16, gap: 12 }]}>
                <Text style={[styles.textXsExtraBold, { color: theme.textPrimary }]}>Android Notification & Device Controls</Text>
                {([
                  { key: 'dndIntegration', label: 'Do Not Disturb Integration', desc: nativeStatus?.dndAccessEnabled ? 'Auto-enable DND during sessions & restore on end' : 'Grant Do Not Disturb Access below to enable' },
                  { key: 'allowSelectedCalls', label: 'Allow Selected Calls (OS DND Policy)', desc: 'Configured in Android System Do Not Disturb settings' },
                  { key: 'allowEmergencyContacts', label: 'Allow Emergency Contacts (OS DND Policy)', desc: 'Configured in Android System Do Not Disturb settings' },
                  { key: 'suppressNotifications', label: 'Suppress Distracting Banners (OS DND)', desc: 'Applied by Android DND interruption filter while active' },
                  { key: 'sessionStartNotif', label: 'Session Start & End Alerts', desc: 'Local notification when Focus Lock starts or completes' },
                  { key: 'sessionCompleteNotif', label: 'Completion Summary Alert', desc: 'Notify when Focus Lock finishes' },
                  { key: 'breakReminders', label: 'Break Reminders (In-App)', desc: 'In-app toast when Smart Break ends' },
                  { key: 'restartRecovery', label: 'Device Restart Recovery', desc: 'Restore active Focus Lock after Android reboot' },
                ] as const).map((s) => (
                  <View key={s.key} style={styles.rowBetween}>
                    <View style={[styles.flex1, { paddingRight: 10 }]}>
                      <Text style={[styles.textXsSemi, { color: theme.textPrimary }]}>{s.label}</Text>
                      <Text style={[styles.text10Muted, { color: theme.textMuted }]}>{s.desc}</Text>
                    </View>
                    <PillToggle
                      value={s.key === 'dndIntegration' ? notifSettings.dndIntegration && Boolean(nativeStatus?.dndAccessEnabled) : notifSettings[s.key]}
                      onToggle={() => {
                        if (s.key === 'dndIntegration') {
                          if (Platform.OS === 'android' && !nativeStatus?.dndAccessEnabled) {
                            void focusLockNative?.openDndSettings?.();
                            showToast('Grant Do Not Disturb Access first');
                            return;
                          }
                          setNotifSettings((prev) => ({ ...prev, dndIntegration: !prev.dndIntegration }));
                          return;
                        }
                        if (s.key === 'sessionStartNotif') {
                          setNotifSettings((prev) => ({ ...prev, sessionStartNotif: !prev.sessionStartNotif, sessionCompleteNotif: !prev.sessionStartNotif }));
                          return;
                        }
                        if (s.key === 'restartRecovery') {
                          const next = !notifSettings.restartRecovery;
                          setNotifSettings((prev) => ({ ...prev, restartRecovery: next }));
                          if (Platform.OS === 'android') {
                            void focusLockNative?.setRestartRecoveryEnabled?.(next).catch(() => undefined);
                          }
                          return;
                        }
                        setNotifSettings((prev) => ({ ...prev, [s.key]: !prev[s.key] }));
                      }}
                      isDark={theme.isDark}
                    />
                  </View>
                ))}
              </View>

              <View style={{ gap: 10 }}>
                <Text style={[styles.sectionHeading, { color: theme.textMuted, paddingHorizontal: 4 }]}>
                  ANDROID PERMISSIONS & SERVICE HEALTH
                </Text>
                {permissionItems.map((perm) => (
                  <PermissionStatusCard key={perm.id} perm={perm} onGrant={handleGrantPermission} theme={theme} />
                ))}
              </View>
            </ScrollView>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Shell active="Dashboard" title="" scroll={false} fitContentToBottomNav onAndroidBack={handleAndroidBack}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.screenBg} />

      <View style={styles.flex1}>{renderScreenContent()}</View>

      {/* Custom Profile Save/Rename Modal */}
      <Modal visible={showProfileModal} transparent animationType="fade">
        <View style={styles.modalBackdropCenter}>
          <View style={[styles.centerModalCard, { backgroundColor: theme.isDark ? '#141824' : '#FFFFFF', borderColor: theme.border }]}>
            <Text style={[styles.textBaseExtraBold, { color: theme.textPrimary }]}>
              {editingProfileId ? 'Rename Profile' : 'Save Focus Profile'}
            </Text>
            <Text style={[styles.textXsMutedCenter, { color: theme.textMuted }]}>
              Saves your current {selectedAppIds.length} selected apps ({appStrategy === 'allow' ? 'Allowlist' : 'Blocklist'}) and {activeMode.name}.
            </Text>
            <TextInput
              value={profileDraftName}
              onChangeText={setProfileDraftName}
              placeholder="e.g., UPSC Deep Study"
              placeholderTextColor={theme.textMuted}
              style={[styles.textInputField, { width: '100%', backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
            />
            <View style={[styles.grid2, { width: '100%' }]}>
              <TouchableOpacity
                onPress={() => {
                  setShowProfileModal(false);
                  setProfileDraftName('');
                  setEditingProfileId(null);
                }}
                style={[styles.cancelSmallBtn, { backgroundColor: theme.surfaceElevated, alignItems: 'center', paddingVertical: 11, flex: 1 }]}
              >
                <Text style={[styles.textXsBold, { color: theme.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveCustomProfile} style={[styles.indigoFullBtn, { flex: 1, paddingVertical: 11 }]}>
                <Text style={[styles.textXsBold, { color: '#FFFFFF' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Extreme Mode Confirmation Modal */}
      <Modal visible={pendingExtremeConfirm} transparent animationType="fade">
        <View style={styles.modalBackdropCenter}>
          <View style={[styles.centerModalCard, { backgroundColor: theme.isDark ? '#141824' : '#FFFFFF', borderColor: 'rgba(244,63,94,0.32)' }]}>
            <View style={[styles.iconBox44, { backgroundColor: theme.roseSoft }]}>
              <AlertTriangle size={24} color="#F43F5E" />
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.textBaseExtraBold, { color: theme.textPrimary }]}>Activate Extreme Mode?</Text>
              <Text style={[styles.textXsMutedCenter, { color: theme.textMuted, marginTop: 6 }]}>
                While active, ordinary voluntary unlock is disabled and rules cannot be weakened. Emergency calling remains available at all times.
              </Text>
            </View>
            <View style={[styles.grid2, { width: '100%' }]}>
              <TouchableOpacity
                onPress={() => setPendingExtremeConfirm(false)}
                style={[styles.cancelSmallBtn, { backgroundColor: theme.surfaceElevated, alignItems: 'center', paddingVertical: 11 }]}
              >
                <Text style={[styles.textXsBold, { color: theme.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setStrictLevel(3);
                  setPendingExtremeConfirm(false);
                  showToast('Extreme Mode Armed');
                }}
                style={[styles.roseFullBtn, { paddingVertical: 11 }]}
              >
                <Text style={[styles.textXsBold, { color: '#FFFFFF' }]}>I Commit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Session State Inspector Modal (All 11 States) */}
      <Modal visible={showStateLab} transparent animationType="slide">
        <View style={styles.modalBackdropBottom}>
          <View style={[styles.bottomSheetCard, { backgroundColor: theme.isDark ? '#141824' : '#FFFFFF', borderColor: theme.border, maxHeight: '82%' }]}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={[styles.textSmExtraBold, { color: theme.textPrimary }]}>Session State Inspector</Text>
                <Text style={[styles.text11Muted, { color: theme.textMuted }]}>Test all 11 Focus Lock UI states & overlays</Text>
              </View>
              <TouchableOpacity onPress={() => setShowStateLab(false)} style={[styles.closeCircle, { backgroundColor: theme.surfaceElevated }]}>
                <X size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 10 }}>
              <View style={styles.controlsGrid}>
                {([
                  { id: 'initial', label: '1. Not Configured' },
                  { id: 'ready', label: '2. Ready to Focus' },
                  { id: 'active_focus', label: '3. Active Focus', nav: 'active_session' as ScreenName },
                  { id: 'active_strict', label: '4. Strict Lock', nav: 'active_session' as ScreenName, strict: 3 },
                  { id: 'scheduled_lock', label: '5. Scheduled Lock' },
                  { id: 'break_active', label: '6. Break Active', nav: 'active_session' as ScreenName },
                  { id: 'completed', label: '7. Session Completed', modal: 'complete' },
                  { id: 'emergency_requested', label: '8. Emergency Access', modal: 'emergency' },
                  { id: 'permission_missing', label: '9. Permission Missing' },
                  { id: 'service_unavailable', label: '10. Service Down' },
                  { id: 'interrupted', label: '11. Interrupted' },
                ] as const).map((st) => {
                  const active = sessionState === st.id;
                  return (
                    <TouchableOpacity
                      key={st.id}
                      onPress={() => {
                        setSessionState(st.id);
                        if ('strict' in st && st.strict) setStrictLevel(st.strict);
                        if ('nav' in st && st.nav) setScreen(st.nav);
                        if ('modal' in st && st.modal === 'complete') setShowCompletionModal(true);
                        if ('modal' in st && st.modal === 'emergency') setShowEmergencyModal(true);
                        setShowStateLab(false);
                        showToast(`State → ${st.label}`);
                      }}
                      style={[
                        styles.stateChip,
                        active
                          ? { backgroundColor: '#4F46E5', borderColor: '#6366F1' }
                          : { backgroundColor: theme.surfaceBg, borderColor: theme.border },
                      ]}
                    >
                      <Text style={[styles.text11Bold, { color: active ? '#FFFFFF' : theme.textSecondary }]}>{st.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Exit PIN Setup Modal */}
      <Modal visible={showPinSetupModal} transparent animationType="fade">
        <View style={styles.modalBackdropCenter}>
          <View style={[styles.centerModalCard, { backgroundColor: theme.isDark ? '#141824' : '#FFFFFF', borderColor: theme.border }]}>
            <Text style={[styles.textBaseExtraBold, { color: theme.textPrimary }]}>Set 4-Digit Exit PIN</Text>
            <Text style={[styles.textXsMutedCenter, { color: theme.textMuted }]}>
              Required to authorize Emergency Access in Strict Mode. Stored securely on this device.
            </Text>
            <View style={{ width: '100%', gap: 10 }}>
              <TextInput
                secureTextEntry
                keyboardType="number-pad"
                maxLength={4}
                value={pinDraft}
                onChangeText={setPinDraft}
                placeholder="Enter 4-digit PIN"
                placeholderTextColor={theme.textMuted}
                style={[styles.pinInput, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
              />
              <TextInput
                secureTextEntry
                keyboardType="number-pad"
                maxLength={4}
                value={pinConfirmDraft}
                onChangeText={setPinConfirmDraft}
                placeholder="Confirm 4-digit PIN"
                placeholderTextColor={theme.textMuted}
                style={[styles.pinInput, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
              />
              {Boolean(pinSetupError) && <Text style={{ fontSize: 11, color: theme.rose }}>{pinSetupError}</Text>}
            </View>
            <View style={[styles.grid2, { width: '100%' }]}>
              <TouchableOpacity
                onPress={() => {
                  setShowPinSetupModal(false);
                  setPinDraft('');
                  setPinConfirmDraft('');
                  setPinSetupError('');
                }}
                style={[styles.cancelSmallBtn, { backgroundColor: theme.surfaceElevated, alignItems: 'center', paddingVertical: 11, flex: 1 }]}
              >
                <Text style={[styles.textXsBold, { color: theme.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (!isValidExitPin(pinDraft)) {
                    setPinSetupError('PIN must be exactly 4 digits.');
                    return;
                  }
                  if (pinDraft !== pinConfirmDraft) {
                    setPinSetupError('PIN entries do not match.');
                    return;
                  }
                  void saveExitPin(pinDraft, state.user?.id).then((saved) => {
                    if (!saved) {
                      setPinSetupError('Could not save PIN securely.');
                      return;
                    }
                    setHasConfiguredPin(true);
                    setStrictConfig((c) => ({ ...c, pinProtection: true }));
                    setShowPinSetupModal(false);
                    setPinDraft('');
                    setPinConfirmDraft('');
                    setPinSetupError('');
                    showToast('Exit PIN configured');
                  });
                }}
                style={[styles.indigoFullBtn, { flex: 1, paddingVertical: 11 }]}
              >
                <Text style={[styles.textXsBold, { color: '#FFFFFF' }]}>Save PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Core Modals */}
      <EmergencyAccessModal
        open={showEmergencyModal}
        strictLevel={strictLevel}
        strictConfig={strictConfig}
        hasConfiguredPin={hasConfiguredPin}
        partnerName={partnerName}
        onClose={() => setShowEmergencyModal(false)}
        onVerifyPin={(pin) => verifyExitPin(pin, state.user?.id)}
        onForgotPinReset={async () => {
          await clearExitPin(state.user?.id);
          setHasConfiguredPin(false);
          setStrictConfig((c) => ({ ...c, pinProtection: false }));
        }}
        onGrantEmergency={() => {
          setShowEmergencyModal(false);
          if (focusLockNative && sessionId) void focusLockNative.stopBlockingSession(sessionId, true).catch(() => undefined);
          completeSession(Date.now(), 'interrupted');
          setSessionState('interrupted');
          setScreen('home');
          showToast('5-min Emergency Pass granted & logged');
        }}
        theme={theme}
      />

      <SessionCompletionModal
        open={showCompletionModal}
        durationMins={computedDurationMins}
        pointsEarned={45}
        earnedScreenMins={Math.max(5, Math.round((computedDurationMins / earnRatioStudy) * earnRatioReward))}
        onClose={() => {
          setShowCompletionModal(false);
          setSessionState('ready');
          setScreen('home');
        }}
        theme={theme}
      />

      {/* Floating Toast */}
      {Boolean(toastMsg) && (
        <View
          pointerEvents="none"
          style={[
            styles.toastPill,
            { backgroundColor: isDark ? '#FFFFFF' : '#0F172A' },
          ]}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#020617' : '#FFFFFF' }}>{toastMsg}</Text>
        </View>
      )}
    </Shell>
  );
}

/* ============================================================================
 * MODULE 8: REACT NATIVE STYLESHEET (EXACT VISUAL FIDELITY)
 * ========================================================================== */

const styles = StyleSheet.create({
  rootSafeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  flex1: { flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowGap4: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowGap6: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowGap8: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowGap10: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowGap12: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  grid2: { flexDirection: 'row', gap: 10 },
  grid3: { flexDirection: 'row', gap: 8 },

  // Typography
  textSmBold: { fontSize: 14, fontWeight: '700' },
  textSmExtraBold: { fontSize: 14, fontWeight: '800' },
  textBaseExtraBold: { fontSize: 16, fontWeight: '800' },
  textXsBold: { fontSize: 12, fontWeight: '700' },
  textXsExtraBold: { fontSize: 12, fontWeight: '800' },
  textXsSemi: { fontSize: 12, fontWeight: '600' },
  textXsRelaxed: { fontSize: 12, lineHeight: 18 },
  textXsMutedCenter: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  text11Bold: { fontSize: 11, fontWeight: '700' },
  text11Muted: { fontSize: 11, fontWeight: '500' },
  text11Relaxed: { fontSize: 11, lineHeight: 16 },
  text10Semi: { fontSize: 10, fontWeight: '600' },
  text10Bold: { fontSize: 10, fontWeight: '700' },
  text10Muted: { fontSize: 10, fontWeight: '500' },
  sectionHeading: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },

  // Header
  headerBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSmallBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sakhaBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  notifDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },

  // Scroll Body
  scrollBody: { padding: 16, gap: 14, paddingBottom: 24 },

  // Cards
  cardRounded3xl: { borderRadius: 24, borderWidth: 1, padding: 16 },
  cardRounded2xl: { borderRadius: 18, borderWidth: 1, padding: 14 },
  owlCard: { borderRadius: 18, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  smallPillBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },

  // Status Card
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  dotContainer: { width: 8, height: 8, alignItems: 'center', justifyContent: 'center' },
  pingRing: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  dotCore: { width: 8, height: 8, borderRadius: 4 },
  openTimerBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: '#4F46E5' },
  metricBox: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 10 },
  metricBoxCenter: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center' },
  metricValue: { fontSize: 18, fontWeight: '800', marginTop: 2, fontVariant: ['tabular-nums'] },

  // Quick Lock
  tagPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: {
    width: '31%',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlinePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  stepperBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stepperSmall: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  timeInput: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, fontSize: 12, fontWeight: '700', minWidth: 74, textAlign: 'center' },
  startFocusCta: {
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startFocusCtaText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.6 },

  // Profiles & Discipline Grid
  profileCard: { width: 160, padding: 12, borderRadius: 16, borderWidth: 1 },
  controlsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  controlCard: { width: '48.2%', padding: 14, borderRadius: 16, borderWidth: 1, gap: 10 },
  metaTile: { width: '48.2%', padding: 12, borderRadius: 16, borderWidth: 1 },
  analyticsKpiCard: { width: '48.2%', padding: 12, borderRadius: 16, borderWidth: 1 },
  iconBox36: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconBox40: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconBox44: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  suiteBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  // Circular Timer
  timerContainer: { width: 224, height: 224, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  timerCenterOverlay: { position: 'absolute', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  timerLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, color: '#94A3B8', marginBottom: 4 },
  timerDigits: { fontSize: 36, fontWeight: '800', fontVariant: ['tabular-nums'] },

  // Modes & Apps
  modeCard: { borderRadius: 16, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  segmentTrack: { flexDirection: 'row', padding: 4, borderRadius: 16, gap: 4 },
  segmentTrackInline: { flexDirection: 'row', padding: 4, borderRadius: 12, gap: 4 },
  segmentTab: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  rangeTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, height: 42 },
  searchInput: { flex: 1, fontSize: 12 },
  quickFilterChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1 },
  appBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  appBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  highRiskTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { paddingVertical: 40, alignItems: 'center', borderRadius: 16, borderWidth: 1, borderStyle: 'dashed' },

  // Toggle
  toggleTrack: { width: 40, height: 22, borderRadius: 999, padding: 3, justifyContent: 'center' },
  toggleThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFFFFF' },

  // Strict & Rules
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  bulletDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#94A3B8' },
  progressTrack: { width: '100%', height: 6, borderRadius: 999, overflow: 'hidden' },
  progressTrackLg: { width: '100%', height: 8, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  selectBtn: { flex: 1, paddingHorizontal: 8, paddingVertical: 9, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cooldownChip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },

  // Breaks & Schedules
  tealCta: { paddingVertical: 11, borderRadius: 12, backgroundColor: '#0D9488', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  presetOptionRow: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayBadge: { width: 20, height: 20, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  plannerStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderRadius: 12, borderWidth: 1, gap: 8 },
  triggerChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },

  // Analytics & Heatmap
  separationBanner: { flexDirection: 'row', padding: 12, borderRadius: 16, borderWidth: 1 },
  separationCol: { flex: 1, alignItems: 'center' },
  separationLabel: { fontSize: 9, fontWeight: '700' },
  heatmapRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heatmapSlotText: { flex: 1, fontSize: 9, fontWeight: '700', color: '#94A3B8', textAlign: 'center' },
  heatmapCell: { flex: 1, height: 20, borderRadius: 6 },
  emptyAnalyticsBox: { paddingVertical: 48, paddingHorizontal: 24, borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', gap: 10 },

  // Sakha Suite & Content
  badgeTile: { flex: 1, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  claimRewardBtn: { paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  aiActionBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 12, gap: 8 },
  groupJoinBtn: { paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  ratioBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 12 },
  removableChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  whyBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, padding: 8, borderRadius: 12 },
  readinessDigits: { fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },

  // Buttons & Inputs
  indigoFullBtn: { paddingVertical: 14, borderRadius: 16, backgroundColor: '#4F46E5', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  indigoSmallBtn: { paddingVertical: 10, borderRadius: 12, backgroundColor: '#4F46E5', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  simulateBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#4F46E5' },
  addInlineBtn: { paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' },
  cancelSmallBtn: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12 },
  outlineActionBtn: { flex: 1, paddingVertical: 12, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  roseFullBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#E11D48', alignItems: 'center', justifyContent: 'center' },
  amberFullBtn: { paddingVertical: 12, borderRadius: 12, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center' },
  textInputField: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1, fontSize: 12 },
  pinInput: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, fontSize: 16, fontWeight: '700', letterSpacing: 6 },

  // Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 4,
  },
  navTab: { flex: 1, paddingVertical: 6, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 2 },

  // Modals
  modalBackdropBottom: { flex: 1, backgroundColor: 'rgba(2,6,23,0.75)', justifyContent: 'flex-end', padding: 12 },
  modalBackdropCenter: { flex: 1, backgroundColor: 'rgba(2,6,23,0.78)', justifyContent: 'center', padding: 20 },
  bottomSheetCard: { borderRadius: 24, borderWidth: 1, padding: 20, gap: 14 },
  centerModalCard: { borderRadius: 24, borderWidth: 1, padding: 22, alignItems: 'center', gap: 16 },
  closeCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  safetyBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 16, borderWidth: 1 },
  completionTitle: { fontSize: 20, fontWeight: '800', marginTop: 8 },
  rewardStatBox: { flex: 1, padding: 12, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  stateChip: { width: '48.2%', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },

  // Intervention Full-Screen Modal
  interventionOverlay: { flex: 1, backgroundColor: 'rgba(9,11,17,0.97)' },
  interventionScroll: { padding: 20, flexGrow: 1, justifyContent: 'space-between' },
  attemptBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(244,63,94,0.2)', borderWidth: 1, borderColor: 'rgba(244,63,94,0.3)' },
  styleSwitchBox: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', padding: 2, borderRadius: 8, gap: 2 },
  styleSwitchTab: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  breathWrapper: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  breathHalo: { position: 'absolute', width: 112, height: 112, borderRadius: 56, backgroundColor: 'rgba(99,102,241,0.25)', borderWidth: 1, borderColor: 'rgba(129,140,248,0.4)' },
  breathCore: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  breathDigits: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  breathSub: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: '#E0E7FF' },
  interventionTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  interventionSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  intentionBox: { marginTop: 12, padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', width: '100%' },
  reasonHeader: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: '#94A3B8', marginBottom: 2 },
  reasonBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  returnStudyBtn: { paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  continueFocusBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  emergencyReqBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, backgroundColor: 'rgba(244,63,94,0.15)', borderWidth: 1, borderColor: 'rgba(244,63,94,0.3)', alignItems: 'center' },

  // Toast
  toastPill: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) + 56 : 70,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
});
