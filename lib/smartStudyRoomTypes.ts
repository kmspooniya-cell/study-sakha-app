import type { AppNavigationTarget } from './navigation';

export type ChairState = 'available' | 'focusing' | 'paused';

export type FocusMode = 'Pomodoro' | 'Timer' | 'Stopwatch';

export interface StudyMember {
  id: string;
  name: string;
  initials: string;
  /** Background hex color for avatar badge (e.g., '#059669') */
  avatarBgColor: string;
  /** Text hex color for avatar initials (defaults to '#FFFFFF') */
  avatarTextColor?: string;
  exam: string | null;
  state: ChairState;
  subject: string | null;
  topic: string | null;
  mode: FocusMode | null;
  targetSeconds: number | null;
  elapsedSeconds: number;
  startedAt: string | null;
}

export interface FocusSessionConfig {
  mode: FocusMode;
  targetSeconds: number | null;
  subject: string;
  topic: string | null;
  exam: string | null;
}

export interface ResponsiveMetrics {
  width: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  gridGap: number;
  cardPadding: number;
  cardMinHeight: number;
  cardRadius: number;
  containerPaddingX: number;
  svgWidth: number;
  svgHeight: number;
}

export interface SmartStudyRoomScreenProps {
  /** Connect to your existing Study Sakha ThemeProvider */
  isDark?: boolean;
  onToggleTheme?: () => void;
  /** Room title (defaults to 'Silent Focus Hall') */
  roomName?: string;
  /** Connect to your existing Supabase realtime / presence store */
  currentUserChair?: StudyMember;
  partners?: StudyMember[];
  onStartFocus?: (config: FocusSessionConfig) => void;
  onTogglePause?: () => void;
  onEndSession?: () => void;
  /** Connect to React Navigation (e.g. () => navigation.goBack()) */
  onExitHall?: () => void;
  navigation?: {
    goBack: () => void;
  };
}

export type { AppNavigationTarget };