import type { StudyMember, ResponsiveMetrics } from './smartStudyRoomTypes';
import { Platform, useWindowDimensions } from 'react-native';
import { useMemo } from 'react';

// ============================================================================
// CONSTANTS
// ============================================================================

const MONO_FONT = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

// Fallback local state used ONLY if external Supabase props are not passed
export const DEFAULT_CURRENT_USER: StudyMember = {
  id: 'current-user',
  name: 'Aarav Sharma',
  initials: 'AS',
  avatarBgColor: '#2563EB',
  avatarTextColor: '#FFFFFF',
  exam: 'RAS',
  state: 'available',
  subject: null,
  topic: null,
  mode: null,
  targetSeconds: null,
  elapsedSeconds: 0,
  startedAt: null,
};

export const DEFAULT_PARTNERS: StudyMember[] = [
  {
    id: 'p-1',
    name: 'Priya Rathore',
    initials: 'PR',
    avatarBgColor: '#059669',
    exam: 'RAS',
    state: 'focusing',
    subject: 'Rajasthan History',
    topic: 'Mewar Dynasty & Architecture',
    mode: 'Pomodoro',
    targetSeconds: 50 * 60,
    elapsedSeconds: 34 * 60 + 18,
    startedAt: '06:34 AM',
  },
  {
    id: 'p-2',
    name: 'Rohan Verma',
    initials: 'RV',
    avatarBgColor: '#4F46E5',
    exam: 'UPSC',
    state: 'focusing',
    subject: 'Indian Polity',
    topic: 'Fundamental Rights (Art. 12–35)',
    mode: 'Stopwatch',
    targetSeconds: null,
    elapsedSeconds: 1 * 3600 + 42 * 60 + 51,
    startedAt: '05:25 AM',
  },
  {
    id: 'p-3',
    name: 'Sneha Meena',
    initials: 'SM',
    avatarBgColor: '#D97706',
    exam: 'SSC',
    state: 'paused',
    subject: 'Quantitative Aptitude',
    topic: null,
    mode: 'Timer',
    targetSeconds: 60 * 60,
    elapsedSeconds: 28 * 60 + 10,
    startedAt: '06:20 AM',
  },
  {
    id: 'p-4',
    name: 'Devendra Singh',
    initials: 'DS',
    avatarBgColor: '#0D9488',
    exam: 'RSSB',
    state: 'focusing',
    subject: 'Current Affairs',
    topic: 'Monthly Rajasthan Digest',
    mode: 'Timer',
    targetSeconds: 45 * 60,
    elapsedSeconds: 19 * 60 + 4,
    startedAt: '06:49 AM',
  },
  {
    id: 'p-5',
    name: 'Ananya Joshi',
    initials: 'AJ',
    avatarBgColor: '#7C3AED',
    exam: null,
    state: 'focusing',
    subject: 'Geography',
    topic: 'Indian Monsoon Mechanism',
    mode: 'Pomodoro',
    targetSeconds: 25 * 60,
    elapsedSeconds: 16 * 60 + 44,
    startedAt: '06:51 AM',
  },
  {
    id: 'p-6',
    name: 'Karan Patel',
    initials: 'KP',
    avatarBgColor: '#64748B',
    exam: 'SSC',
    state: 'available',
    subject: null,
    topic: null,
    mode: null,
    targetSeconds: null,
    elapsedSeconds: 0,
    startedAt: null,
  },
  {
    id: 'p-7',
    name: 'Neha Choudhary',
    initials: 'NC',
    avatarBgColor: '#E11D48',
    exam: 'RAS',
    state: 'paused',
    subject: 'General Science',
    topic: 'Human Physiology Notes',
    mode: 'Pomodoro',
    targetSeconds: 50 * 60,
    elapsedSeconds: 41 * 60 + 12,
    startedAt: '06:15 AM',
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export function formatTargetDuration(targetSeconds: number | null): string {
  if (!targetSeconds) return 'Open-ended';
  const mins = Math.round(targetSeconds / 60);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h} hr`;
  }
  return `${mins} min`;
}

export function getCurrentTimeLabel(): string {
  try {
    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Just now';
  }
}

/**
 * Exact 1:1 breakpoint mapping matching Tailwind sm (640px) & lg (1024px)
 */
export function useResponsiveMetrics(): ResponsiveMetrics {
  const { width } = useWindowDimensions();
  return useMemo(() => {
    const isDesktop = width >= 1024;
    const isTablet = width >= 640 && width < 1024;
    const isMobile = width < 640;

    return {
      width,
      isMobile,
      isTablet,
      isDesktop,
      gridGap: isDesktop ? 16 : isTablet ? 12 : 6,
      cardPadding: isDesktop ? 12 : isTablet ? 10 : 6,
      cardMinHeight: isDesktop ? 152 : isTablet ? 138 : 114,
      cardRadius: isMobile ? 12 : 16,
      containerPaddingX: isMobile ? 10 : 24,
      svgWidth: isDesktop ? 56 : isTablet ? 48 : 40,
      svgHeight: isDesktop ? 40 : isTablet ? 36 : 32,
    };
  }, [width]);
}

export { MONO_FONT };