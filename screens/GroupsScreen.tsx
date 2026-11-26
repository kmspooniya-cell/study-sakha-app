import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  BackHandler,
  ActivityIndicator,
  Animated,
  View,
  Text,
  Pressable,
  RefreshControl,
  TextInput,
  ScrollView,
  Modal,
  Switch,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Share,
  useWindowDimensions,
} from 'react-native';
import Svg, { Ellipse, Rect, Circle } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import type { LucideIcon } from 'lucide-react-native';
import type { ChairState, StudyMember } from '../lib/smartStudyRoomTypes';
import {
  Search,
  Plus,
  Bell,
  Users,
  Clock,
  Video,
  VideoOff,
  Lock,
  Globe,
  Shield,
  Sparkles,
  MessageSquare,
  Target,
  BookOpen,
  Calendar,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronDown,
  Check,
  CheckCircle2,
  X,
  Award,
  FileText,
  Bookmark,
  ThumbsUp,
  Send,
  Flag,
  AlertTriangle,
  Play,
  Pause,
  LogOut,
  Share2,
  Trophy,
  Zap,
  HeartHandshake,
  Hash,
  Paperclip,
  CheckSquare,
  Download,
  Eye,
  Filter,
  Volume2,
  VolumeX,
  EyeOff,
} from 'lucide-react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isAppDrawerOpen, Shell } from '../components/Shell';
import { FocusSessionSetupModal } from '../components/FocusSessionSetupModal';
import type { FocusSessionSetup } from '../components/FocusSessionSetupModal';
import { SmartStudyRoomScreen } from '../screens/SmartStudyRoomScreen';
import type { AppNavigation, AppRoute } from '../lib/navigation';
import { useTheme } from '../lib/theme';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { AudioPlayerLifecycle } from '../lib/audioPlayerLifecycle';
import { useStore } from '../lib/store';
import { useOptionalFocusSession } from '../lib/focusSession';
import { getGroupInviteUrl } from '../lib/shareLinks';
import { supabase, supabaseConfigured } from '../lib/supabase';
import {
  AmbientAudio,
  createRoomSession,
  createStudyGroup,
  createStudyGroupInvite,
  disbandStudyGroup,
  finishRoomSession,
  getStudyGroupInvitePreview,
  getStudyRoomLogs,
  getStudyRoomProfiles,
  GroupRoomId,
  GroupRoomPhase,
  joinOpenStudyGroup,
  joinStudyGroupByInvite,
  listDiscoverableStudyGroups,
  listStudyGroupInvites,
  reportRoomMember,
  revokeStudyGroupInvite,
  RoomMicroGoal,
  sendBreakRoomMessage,
  StudyGroupInvite,
  StudyGroupInvitePreview,
  StudyRoomLog,
  StudyRoomProfile,
  updateRoomSession,
  updateSharedRoomPhase,
} from '../lib/groupRooms';
import { StudyRoomParticipant, useGroupRoomRealtime } from '../lib/groupRoomRealtime';
import {
  clearGroupRoomFocusContext,
  endGroupRoomFocus,
  getGroupRoomFocusActivity,
  publishGroupRoomFocus,
  publishGroupRoomFocusControl,
  setGroupRoomFocusContext,
  subscribeGroupRoomFocus,
} from '../lib/groupRoomFocusBridge';
import type { GroupRoomFocusActivity } from '../lib/groupRoomFocusBridge';
import { getRoomFocusStreak } from '../lib/groupRoomStats';
import softRainAudio from '../assets/Sounds/calming_rain.mp3';
import brownNoiseAudio from '../assets/Sounds/brown_noise.wav';
import libraryHumAudio from '../assets/Sounds/library_hum.wav';

const EMPTY_ROOM_STUDY_LOGS: StudyRoomLog[] = [];
const EMPTY_ROOM_STUDY_PROFILES: StudyRoomProfile[] = [];
let studyGroupsSyncChannelSeq = 0;

/**
 * ============================================================================
 * STUDY SAKHA — ADVANCED GROUP & COLLABORATIVE LEARNING ECOSYSTEM (REACT NATIVE)
 * ============================================================================
 * Production-ready React Native (Expo / RN CLI) TypeScript conversion.
 * Preserves 100% of original Study Sakha features, screens, modals, themes,
 * and interactive workflows using native primitives & StyleSheet.
 *
 * Required Dependencies:
 * - react, react-native
 * - lucide-react-native
 * - react-native-svg
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. TYPES & DESIGN SYSTEM THEME TOKENS (LIGHT / DARK)
// ----------------------------------------------------------------------------

interface ThemeColors {
  canvas: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  primaryText: string;
  teal: string;
  tealSoft: string;
  tealText: string;
  live: string;
  warning: string;
  warningSoft: string;
  warningBorder: string;
  danger: string;
  dangerSoft: string;
  premium: string;
  premiumSoft: string;
  premiumBorder: string;
  successSoft: string;
  successBorder: string;
  successText: string;
  overlay: string;
}

interface GroupItem {
  id: string;
  name: string;
  shortName: string;
  description: string;
  exam: string;
  subject: string;
  type: 'General Study' | 'Cam Study';
  privacy: 'Public' | 'Private';
  joinMethod: 'Open Join' | 'Password Protected' | 'Answer-based Entry' | 'Leader Approval';
  passwordHint?: string;
  screeningQuestion?: string;
  language: string;
  membersCount?: number;
  memberLimit?: number;
  liveStudying?: number;
  dailyTargetHours?: number;
  groupProgressPct?: number;
  userHoursToday?: number;
  joined: boolean;
  unreadCount: number;
  activeRoomLabel: string;
  accentHex: string;
  treeLevel: number;
  treeXp: number;
  matchReason: string;
  dataSource?: 'backend' | 'fixture';
}

interface StudyRoom {
  id: GroupRoomId;
  name: string;
  type: string;
  isCam: boolean;
}

interface GoalItem {
  id: string;
  timeframe: string;
  type: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  userContribution: number;
  userTarget: number;
  deadline: string;
}

interface ChatMessageItem {
  id: string;
  sender: string;
  initials: string;
  role: string;
  time: string;
  pinned?: boolean;
  text: string;
  attachment?: { name: string; size: string };
  poll?: {
    question: string;
    options: { id: string; label: string; votes: number }[];
    votedId: string | null;
  };
  reactions: { emoji: string; count: number; reacted: boolean }[];
  replies: number;
}

interface EventItem {
  id: string;
  title: string;
  type: string;
  date: string;
  dayNum: string;
  month: string;
  time: string;
  countdown: string;
  host: string;
  description: string;
  goingCount: number;
  limit: number;
  rsvp: string | null;
  reminder: boolean;
  isPast: boolean;
}

interface DoubtItem {
  id: string;
  isDoubtOfDay: boolean;
  status: 'Solved' | 'Unsolved';
  subject: string;
  topic: string;
  title: string;
  body: string;
  author: string;
  time: string;
  votes: number;
  voted: boolean;
  bestAnswer: { author: string; text: string } | null;
  answersCount: number;
}

type GroupResource = {
  id: string;
  title: string;
  type: string;
  subject: string;
  size: string;
  uploader: string;
  bookmarked: boolean;
};

type GroupMemberRecord = {
  id: string;
  name: string;
  initials: string;
  role: string;
  status: 'studying' | 'online' | 'offline';
  exam: string;
  slot: string;
  streak: number;
  goalPct: number;
  pyqAcc: number;
  helpfulVotes: number;
};

type GroupNotification = {
  id: string;
  type: string;
  title: string;
  time: string;
  read: boolean;
  actionable: boolean;
};

interface ConfirmModalConfig {
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
  requireText?: string;
  onConfirm?: () => void;
}

// ----------------------------------------------------------------------------
// 2. REALISTIC SAMPLE DATA (INDIAN COMPETITIVE EXAM ECOSYSTEM)
// ----------------------------------------------------------------------------

/* const INITIAL_GROUPS: GroupItem[] = [
  {
    id: 'grp-ras-mains',
    name: 'RAS Mains 2026 — Rajasthan Special',
    shortName: 'RM',
    description:
      'Disciplined daily answer writing, Rajasthan Economic Review, and silent Pomodoro blocks for RAS Mains 2026 aspirants.',
    exam: 'RAS',
    subject: 'Rajasthan GK & Mains',
    type: 'General Study',
    privacy: 'Private',
    joinMethod: 'Leader Approval',
    language: 'Bilingual',
    membersCount: 42,
    memberLimit: 50,
    liveStudying: 11,
    dailyTargetHours: 6,
    groupProgressPct: 74,
    userHoursToday: 4.4,
    joined: true,
    unreadCount: 3,
    activeRoomLabel: 'Silent Focus Room · 38m left',
    accentHex: '#2563EB',
    treeLevel: 7,
    treeXp: 78,
    matchReason: 'Matches RAS + Morning Slot',
  },
  {
    id: 'grp-upsc-cam',
    name: 'UPSC CSE 2027 — Dawn Cam Batch',
    shortName: 'UC',
    description:
      'Desk-only camera accountability group (5:30 AM – 11:30 AM IST). Strict privacy consent, zero distractions, 50/10 Pomodoros.',
    exam: 'UPSC',
    subject: 'GS + CSAT',
    type: 'Cam Study',
    privacy: 'Public',
    joinMethod: 'Open Join',
    language: 'English',
    membersCount: 18,
    memberLimit: 25,
    liveStudying: 9,
    dailyTargetHours: 8,
    groupProgressPct: 62,
    userHoursToday: 4.1,
    joined: true,
    unreadCount: 0,
    activeRoomLabel: 'Cam Pomodoro 50/10 · Live',
    accentHex: '#0D9488',
    treeLevel: 5,
    treeXp: 64,
    matchReason: 'Matches UPSC + Cam Study',
  },
  {
    id: 'grp-rssb-patwari',
    name: 'RSSB Patwari & VDO 2026 Rapid PYQ',
    shortName: 'RP',
    description:
      'Daily 100 PYQ target covering Rajasthan History, Geography, Hindi Grammar, and Computer Awareness with weekly mock reviews.',
    exam: 'RSSB',
    subject: 'Rajasthan GK & Hindi',
    type: 'General Study',
    privacy: 'Public',
    joinMethod: 'Open Join',
    language: 'Hindi',
    membersCount: 84,
    memberLimit: 100,
    liveStudying: 19,
    dailyTargetHours: 5,
    groupProgressPct: 81,
    userHoursToday: 0,
    joined: false,
    unreadCount: 0,
    activeRoomLabel: 'PYQ Marathon · 19 active',
    accentHex: '#4F46E5',
    treeLevel: 8,
    treeXp: 90,
    matchReason: 'Trending in Rajasthan',
  },
  {
    id: 'grp-ssc-cgl',
    name: 'SSC CGL Tier-II Quant & Reasoning',
    shortName: 'SC',
    description:
      'Timed calculation drills, live doubt solving, and weekend Oliveboard/Testbook mock analysis.',
    exam: 'SSC',
    subject: 'Maths & Reasoning',
    type: 'General Study',
    privacy: 'Private',
    joinMethod: 'Password Protected',
    passwordHint: 'Use code: SSC2026',
    language: 'Bilingual',
    membersCount: 31,
    memberLimit: 40,
    liveStudying: 6,
    dailyTargetHours: 6,
    groupProgressPct: 68,
    userHoursToday: 0,
    joined: false,
    unreadCount: 0,
    activeRoomLabel: 'Doubt Solving Room · 6 active',
    accentHex: '#0284C7',
    treeLevel: 6,
    treeXp: 51,
    matchReason: 'Matches Evening Schedule',
  },
  {
    id: 'grp-ras-answer',
    name: 'Jodhpur RAS Peer Answer Writing Circle',
    shortName: 'JR',
    description:
      'Structured 50/100-word Mains answers evaluated within 24 hours by peers and senior RAS mentors.',
    exam: 'RAS',
    subject: 'Answer Writing',
    type: 'Cam Study',
    privacy: 'Public',
    joinMethod: 'Answer-based Entry',
    screeningQuestion:
      'Which RAS attempt are you targeting, and which Paper needs the most work?',
    language: 'Bilingual',
    membersCount: 22,
    memberLimit: 30,
    liveStudying: 7,
    dailyTargetHours: 7,
    groupProgressPct: 88,
    userHoursToday: 0,
    joined: false,
    unreadCount: 0,
    activeRoomLabel: 'Answer Writing Room · Live',
    accentHex: '#059669',
    treeLevel: 9,
    treeXp: 82,
    matchReason: '96% Exam & Subject Match',
  },
]; */

const STUDY_ROOMS: StudyRoom[] = [
  {
    id: 'silent-focus',
    name: 'Silent Focus Hall',
    type: 'Focus room',
    isCam: false,
  },
  {
    id: 'pomodoro',
    name: '50/10 Deep Pomodoro',
    type: 'Focus room',
    isCam: false,
  },
  {
    id: 'desk-cam',
    name: 'Desk-Cam Accountability',
    type: 'Desk-Cam',
    isCam: true,
  },
  {
    id: 'exam-simulation',
    name: '3-Hour Exam Simulation',
    type: 'Exam simulation',
    isCam: false,
  },
];

const ROOM_SUBJECTS = [
  'Rajasthan History',
  'Indian Polity',
  'Paper II — Ethics',
  'Rajasthan Economy',
  'Science & Tech',
  'Current Affairs',
];

const AMBIENT_AUDIO_OPTIONS: { value: AmbientAudio; label: string }[] = [
  { value: 'muted', label: 'Muted' },
  { value: 'brown-noise', label: 'Brown noise' },
  { value: 'soft-rain', label: 'Soft rain' },
  { value: 'library-hum', label: 'Library hum' },
];

/* const INITIAL_GOALS: GoalItem[] = [
  {
    id: 'g1',
    timeframe: 'Daily',
    type: 'Study Hours',
    title: 'Collective Focus Target',
    current: 185,
    target: 250,
    unit: 'hrs',
    userContribution: 4.4,
    userTarget: 6,
    deadline: 'Today, 11:59 PM',
  },
  {
    id: 'g2',
    timeframe: 'Weekly',
    type: 'PYQ Completion',
    title: 'Rajasthan GK 2013–2025 PYQs',
    current: 3920,
    target: 5000,
    unit: 'PYQs',
    userContribution: 140,
    userTarget: 150,
    deadline: 'Sunday, 10:00 PM',
  },
  {
    id: 'g3',
    timeframe: 'Monthly',
    type: 'Answer Writing',
    title: 'Mains Paper-I & II Structured Answers',
    current: 410,
    target: 600,
    unit: 'answers',
    userContribution: 14,
    userTarget: 20,
    deadline: 'Nov 30, 2026',
  },
  {
    id: 'g4',
    timeframe: 'Custom Missions',
    type: 'Revision Targets',
    title: 'Economic Review 2025–26 Complete Revision',
    current: 9,
    target: 11,
    unit: 'chapters',
    userContribution: 9,
    userTarget: 11,
    deadline: 'Nov 26, 2026',
  },
]; */

const CHAT_CHANNELS = [
  { id: 'general-chat', name: 'general-chat', unread: 0, desc: 'Daily coordination and group discussions', lockedWrite: false },
  { id: 'announcements', name: 'announcements', unread: 2, desc: 'Admin & Mentor notices only', lockedWrite: true },
  { id: 'motivation', name: 'motivation', unread: 0, desc: 'Milestones, streaks & peer encouragement', lockedWrite: false },
];

/* const INITIAL_MESSAGES: Record<string, ChatMessageItem[]> = {
  'general-chat': [
    {
      id: 'm1',
      sender: 'Dr. Rajesh Sharma',
      initials: 'RS',
      role: 'Mentor',
      time: '09:15 PM',
      pinned: true,
      text: 'Reminder: Sunday 10 AM RAS Paper-II Answer Writing Marathon will cover Science & Tech + Rajasthan Geography. Please keep A4 ruled sheets ready.',
      reactions: [
        { emoji: '👍', count: 14, reacted: true },
        { emoji: '🔥', count: 6, reacted: false },
      ],
      replies: 4,
    },
    {
      id: 'm2',
      sender: 'Priya Mathur',
      initials: 'PM',
      role: 'Admin',
      time: '10:02 PM',
      text: 'Uploaded the condensed 8-page notes for Rajasthan Budget 2026–27 schemes. Check #study-resources or grab it below.',
      attachment: { name: 'Rajasthan_Budget_2026_Summary.pdf', size: '2.4 MB' },
      reactions: [{ emoji: '🙏', count: 9, reacted: false }],
      replies: 2,
    },
    {
      id: 'm3',
      sender: 'Vikram Rathore',
      initials: 'VR',
      role: 'Member',
      time: '10:34 PM',
      text: 'Which topic should we pick for tomorrow’s 8 PM Group Quiz Battle?',
      poll: {
        question: 'Tomorrow 8 PM Quiz Battle Topic',
        options: [
          { id: 'o1', label: 'Prajamandal & Peasant Movements', votes: 14 },
          { id: 'o2', label: 'Constitutional Amendments (42nd–106th)', votes: 19 },
          { id: 'o3', label: 'Rajasthan Rivers & Irrigation Projects', votes: 8 },
        ],
        votedId: null,
      },
      reactions: [],
      replies: 0,
    },
  ],
  'doubt-corner': [
    {
      id: 'm4',
      sender: 'Neha Choudhary',
      initials: 'NC',
      role: 'Member',
      time: '08:45 PM',
      text: '@Aarav Can we invoke Article 365 directly without a Governor’s report under Article 356?',
      reactions: [{ emoji: '👀', count: 3, reacted: false }],
      replies: 3,
    },
  ],
  'study-resources': [
    {
      id: 'm5',
      sender: 'Priya Mathur',
      initials: 'PM',
      role: 'Admin',
      time: 'Yesterday',
      text: 'Compiled all RPSC RAS Prelims Polity PYQs (2013–2024) sorted chapter-wise.',
      attachment: { name: 'RPSC_Polity_PYQ_Master.pdf', size: '4.1 MB' },
      reactions: [{ emoji: '📚', count: 21, reacted: true }],
      replies: 1,
    },
  ],
  'pyq-discussion': [],
  announcements: [
    {
      id: 'm6',
      sender: 'Aarav Singh',
      initials: 'AS',
      role: 'Owner',
      time: 'Nov 18',
      pinned: true,
      text: 'Welcome to Week 4 of our RAS Mains Sprint! Our shared Group Tree just hit Level 7 with 100% verified focus sessions.',
      reactions: [{ emoji: '🌳', count: 24, reacted: true }],
      replies: 0,
    },
  ],
  motivation: [
    {
      id: 'm7',
      sender: 'Kavita Deora',
      initials: 'KD',
      role: 'Member',
      time: '07:20 PM',
      text: 'Completed my 14-day morning consistency streak today. Studying with the 6 AM Silent Room made all the difference!',
      reactions: [{ emoji: '👏', count: 16, reacted: true }],
      replies: 2,
    },
  ],
}; */

/* const INITIAL_EVENTS: EventItem[] = [
  {
    id: 'ev1',
    title: 'RAS Paper-II Answer Writing Sprint',
    type: 'Answer Writing Session',
    date: 'Nov 20, 2026',
    dayNum: '20',
    month: 'NOV',
    time: '07:00 PM – 08:30 PM',
    countdown: 'Starts in 19h 40m',
    host: 'Dr. Rajesh Sharma (Mentor)',
    description:
      '3 questions (50, 100, 100 words) from Rajasthan Geography & Science-Tech followed by 30 mins live peer evaluation.',
    goingCount: 28,
    limit: 40,
    rsvp: 'Going',
    reminder: true,
    isPast: false,
  },
  {
    id: 'ev2',
    title: 'Weekly Full-Length Mock & Analysis',
    type: 'Weekly Mock Test',
    date: 'Nov 22, 2026',
    dayNum: '22',
    month: 'NOV',
    time: '10:00 AM – 01:00 PM',
    countdown: 'In 2 days',
    host: 'Priya Mathur (Admin)',
    description:
      'Strict 3-hour simulated sitting in Exam Marathon Room. AI Weak Topic Detection runs automatically after score upload.',
    goingCount: 35,
    limit: 50,
    rsvp: 'Interested',
    reminder: true,
    isPast: false,
  },
  {
    id: 'ev3',
    title: 'November Current Affairs Rapid Revision',
    type: 'Current Affairs Discussion',
    date: 'Nov 24, 2026',
    dayNum: '24',
    month: 'NOV',
    time: '08:30 PM – 09:30 PM',
    countdown: 'In 4 days',
    host: 'Aarav Singh (Owner)',
    description:
      'Covering Sujas Rajasthan highlights, RBI Monetary Policy, and major national schemes.',
    goingCount: 19,
    limit: 50,
    rsvp: null,
    reminder: false,
    isPast: false,
  },
  {
    id: 'ev4',
    title: 'Polity Constitutional Bodies Revision',
    type: 'Daily Revision',
    date: 'Nov 16, 2026',
    dayNum: '16',
    month: 'NOV',
    time: '08:00 PM – 09:00 PM',
    countdown: 'Completed',
    host: 'Priya Mathur (Admin)',
    description: 'Completed with 34 attendees and 42 shared flashcards.',
    goingCount: 34,
    limit: 50,
    rsvp: 'Going',
    reminder: false,
    isPast: true,
  },
]; */

/* const INITIAL_DOUBTS: DoubtItem[] = [
  {
    id: 'd1',
    isDoubtOfDay: true,
    status: 'Solved',
    subject: 'Polity',
    topic: 'Emergency Provisions',
    title: 'How to concisely contrast Article 356 vs Article 365 in a 50-word RAS Mains answer?',
    body: 'I always exceed the word limit when explaining the President’s Rule trigger under Art. 365. What keywords fetch maximum marks?',
    author: 'Neha Choudhary',
    time: '3h ago',
    votes: 18,
    voted: false,
    bestAnswer: {
      author: 'Dr. Rajesh Sharma (Mentor)',
      text: 'Use a 2-column micro-table: Art. 356 = Failure of constitutional machinery (Governor report or otherwise). Art. 365 = Non-compliance with Union executive directions, which creates a lawful presumption for invoking Art. 356. Cite S.R. Bommai (1994) in 1 line.',
    },
    answersCount: 4,
  },
  {
    id: 'd2',
    isDoubtOfDay: false,
    status: 'Unsolved',
    subject: 'Rajasthan Economy',
    topic: 'GSDP & Inflation',
    title: 'Constant vs Current prices share of Agriculture sector in Economic Review 2025–26?',
    body: 'Seeing two slightly different percentages in coaching compilations. Can someone verify from the official Directorate of Economics PDF?',
    author: 'Vikram Rathore',
    time: '5h ago',
    votes: 9,
    voted: true,
    bestAnswer: null,
    answersCount: 2,
  },
];

*/
/* const PYQ_LIST_FIXTURE = [
  {
    id: 'pyq1',
    examYear: 'RAS Prelims 2023',
    subject: 'Rajasthan Art & Culture',
    question:
      'Which historical fort of Rajasthan is popularly known as "Garh Bithli" and was praised by Bishop Heber as the "Gibraltar of the East"?',
    options: ['Mehrangarh Fort', 'Taragarh Fort (Ajmer)', 'Chittorgarh Fort', 'Kumbhalgarh Fort'],
    correctIndex: 1,
    explanation:
      'Taragarh Fort in Ajmer was built by Ajayraj Chauhan on the Bithli hill, giving it the name "Garh Bithli". Note: Do not confuse it with Taragarh Fort in Bundi.',
    memberNotesCount: 14,
  },
  {
    id: 'pyq2',
    examYear: 'UPSC CSE 2024',
    subject: 'Indian Polity',
    question:
      'Under the Indian Constitution, the power to increase the number of judges in the Supreme Court of India is vested in:',
    options: ['The President of India', 'The Parliament', 'The Chief Justice of India', 'The Law Commission'],
    correctIndex: 1,
    explanation:
      'Article 124(1) empowers Parliament by law to prescribe a larger number of Supreme Court judges. Currently the sanctioned strength is 34 (1 CJI + 33 Judges).',
    memberNotesCount: 22,
  },
]; */
const PYQ_LIST: Array<{ id: string; examYear: string; subject: string; question: string; options: string[]; correctIndex: number; explanation: string; memberNotesCount: number }> = [];

/* const SHARED_RESOURCES = [
  { id: 'r1', title: 'Rajasthan Economic Review 2025–26 Short Notes', type: 'PDF', subject: 'Economy', size: '4.2 MB · 28 pages', uploader: 'Priya Mathur', bookmarked: true },
  { id: 'r2', title: 'Prajamandal Movements Chronology Mindmap', type: 'Note', subject: 'History', size: '1.1 MB · 4 pages', uploader: 'Aarav Singh', bookmarked: false },
  { id: 'r3', title: 'Sujas Monthly Official Bulletin — Oct 2026', type: 'Link', subject: 'Current Affairs', size: 'DIPR Rajasthan Portal', uploader: 'Dr. Rajesh', bookmarked: true },
  { id: 'r4', title: 'Polity Articles 12–51 High-Yield Revision Sheet', type: 'PDF', subject: 'Polity', size: '1.8 MB · 12 pages', uploader: 'Kavita Deora', bookmarked: false },
]; */

/* const FLASHCARD_DECK_FIXTURE = [
  {
    id: 'fc1',
    subject: 'Polity',
    front: '73rd Constitutional Amendment Act (1992)',
    back: 'Added Part IX (Articles 243 to 243O) and 11th Schedule (29 functional items) granting constitutional status to Panchayati Raj Institutions.',
  },
  {
    id: 'fc2',
    subject: 'Rajasthan GK',
    front: 'Bijolia Peasant Movement (1897–1941)',
    back: 'Longest non-violent peasant movement in India (44 years) in Mewar. Led sequentially by Sadhu Sitaram Das, Vijay Singh Pathik, and Manikyalal Verma.',
  },
  {
    id: 'fc3',
    subject: 'Economy',
    front: 'Repo Rate vs Reverse Repo Rate',
    back: 'Repo Rate: Rate at which RBI lends short-term funds to commercial banks against securities. Reverse Repo: Rate at which RBI absorbs liquidity from banks.',
  },
]; */
const FLASHCARD_DECK: Array<{ id: string; subject: string; front: string; back: string }> = [];

/* const MEMBERS_DATA = [
  { id: 'u1', name: 'Aarav Singh', initials: 'AS', role: 'Owner', streak: 19, goalPct: 92, pyqAcc: 86, helpfulVotes: 34, status: 'studying', exam: 'RAS 2026', slot: 'Morning (5–10 AM)' },
  { id: 'u2', name: 'Priya Mathur', initials: 'PM', role: 'Admin', streak: 24, goalPct: 95, pyqAcc: 89, helpfulVotes: 48, status: 'studying', exam: 'RAS 2026', slot: 'Morning (5–10 AM)' },
  { id: 'u3', name: 'Dr. Rajesh Sharma', initials: 'RS', role: 'Mentor', streak: 15, goalPct: 88, pyqAcc: 94, helpfulVotes: 92, status: 'online', exam: 'RAS Rank-42 Mentor', slot: 'Evening (7–10 PM)' },
  { id: 'u4', name: 'Vikram Rathore', initials: 'VR', role: 'Moderator', streak: 12, goalPct: 81, pyqAcc: 82, helpfulVotes: 27, status: 'studying', exam: 'RAS 2026', slot: 'Night (9 PM–1 AM)' },
  { id: 'u5', name: 'Neha Choudhary', initials: 'NC', role: 'Member', streak: 16, goalPct: 89, pyqAcc: 84, helpfulVotes: 19, status: 'offline', exam: 'RAS + RSSB', slot: 'Morning (6–11 AM)' },
  { id: 'u6', name: 'Kavita Deora', initials: 'KD', role: 'Member', streak: 14, goalPct: 86, pyqAcc: 79, helpfulVotes: 22, status: 'online', exam: 'RAS 2026', slot: 'Evening (6–11 PM)' },
]; */

/* const INITIAL_NOTIFICATIONS = [
  { id: 'n1', type: 'Join Request', title: 'Rohan Bishnoi requested to join RAS Mains 2026', time: '5m ago', read: false, actionable: true },
  { id: 'n2', type: 'Live Session', title: 'Silent Focus Hall is active (11 members studying)', time: '18m ago', read: false, actionable: false },
  { id: 'n3', type: 'Mentor Reply', title: 'Dr. Rajesh Sharma marked Best Answer on your Polity doubt', time: '2h ago', read: false, actionable: false },
  { id: 'n4', type: 'Quiz Challenge', title: 'Jodhpur Achievers challenged your group to a 20-Q History Battle', time: '4h ago', read: true, actionable: false },
  { id: 'n5', type: 'Goal Achievement', title: 'Group Tree reached Level 7 — 100% verified focus hours!', time: 'Yesterday', read: true, actionable: false },
]; */

// ----------------------------------------------------------------------------
// 3. HELPERS & REUSABLE NATIVE DESIGN SYSTEM COMPONENTS
// ----------------------------------------------------------------------------

/** Reusable MemberAvatar */
const MemberAvatar = ({
  initials,
  size = 'md',
  status = 'offline',
  accent = '#2563EB',
  theme,
}: {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'studying' | 'online' | 'offline' | 'none';
  accent?: string;
  theme: ThemeColors;
}) => {
  const dim = size === 'sm' ? 28 : size === 'lg' ? 48 : 36;
  const fontSize = size === 'sm' ? 11 : size === 'lg' ? 15 : 12;
  const dotColor =
    status === 'studying' ? theme.successText : status === 'online' ? theme.textMuted : '#94A3B8';

  return (
    <View style={{ width: dim, height: dim, position: 'relative' }}>
      <View
        style={{
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize }}>{initials}</Text>
      </View>
      {status !== 'none' && (
        <View
          style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: dotColor,
            borderWidth: 2,
            borderColor: theme.surface,
          }}
        />
      )}
    </View>
  );
};

/** Reusable LiveStatusIndicator */
const LiveStatusIndicator = ({
  count,
  label = 'studying',
  theme,
}: {
  count: number;
  label?: string;
  theme: ThemeColors;
}) => (
  <View
    style={[
      styles.livePill,
      { backgroundColor: theme.successSoft, borderColor: theme.successBorder + '55' },
    ]}
  >
    <View style={[styles.liveDot, { backgroundColor: theme.live }]} />
    <Text style={[styles.livePillText, { color: theme.successText }]}>
      {count} {label}
    </Text>
  </View>
);

/** Reusable EmptyState */
const EmptyState = ({
  icon: Icon,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  theme,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  theme: ThemeColors;
}) => (
  <View
    style={[
      styles.emptyBox,
      { backgroundColor: theme.surface, borderColor: theme.border },
    ]}
  >
    <View style={[styles.emptyIconWrap, { backgroundColor: theme.primarySoft }]}>
      <Icon size={24} color={theme.primary} />
    </View>
    <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>{title}</Text>
    <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>{description}</Text>
    <View style={styles.emptyBtnRow}>
      {primaryLabel && onPrimary && (
        <Pressable
          onPress={onPrimary}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
        </Pressable>
      )}
      {secondaryLabel && onSecondary && (
        <Pressable
          onPress={onSecondary}
          style={({ pressed }) => [
            styles.secondaryBtn,
            { backgroundColor: theme.surfaceElevated, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.secondaryBtnText, { color: theme.textPrimary }]}>
            {secondaryLabel}
          </Text>
        </Pressable>
      )}
    </View>
  </View>
);

interface SelectionOption {
  label: string;
  value: string;
}

type SelectionSheetKind =
  | 'learn-categories'
  | 'learn-filters'
  | 'learn-compose-subject'
  | 'members-categories'
  | 'members-filters'
  | 'insights-categories'
  | 'leaderboard-categories';

const LEARN_MODULE_OPTIONS: SelectionOption[] = [
  { value: 'doubts', label: 'Doubt Board' },
  { value: 'pyqs', label: 'PYQ Discussion' },
  { value: 'resources', label: 'Resources' },
  { value: 'quiz', label: 'Quiz Battle' },
  { value: 'flashcards', label: 'Flashcards' },
  { value: 'answer', label: 'Answer Writing' },
];

const DOUBT_SUBJECT_OPTIONS: SelectionOption[] = [
  { value: 'Polity', label: 'Polity' },
  { value: 'Rajasthan Economy', label: 'Rajasthan Economy' },
  { value: 'Rajasthan History', label: 'Rajasthan History' },
  { value: 'Science & Tech', label: 'Science & Tech' },
];

const MEMBER_FILTER_OPTIONS: SelectionOption[] = [
  { value: 'All', label: 'All members' },
  { value: 'Studying Now', label: 'Studying now' },
  { value: 'Morning', label: 'Morning' },
  { value: 'Evening', label: 'Evening' },
  { value: 'Night', label: 'Night' },
  { value: 'Mentors', label: 'Mentors' },
];

const MEMBER_CATEGORY_OPTIONS: SelectionOption[] = [
  { value: 'directory', label: 'Members & Roles' },
  { value: 'buddy', label: 'Study Buddy' },
  { value: 'mentors', label: 'Peer Mentors' },
  { value: 'partner', label: 'Accountability Partner' },
];

const LIVE_CATEGORY_OPTIONS: SelectionOption[] = [
  { value: 'focus', label: 'Focus rooms' },
  { value: 'cam', label: 'Desk-Cam' },
];

const INSIGHTS_CATEGORY_OPTIONS: SelectionOption[] = [
  { value: 'ai', label: 'AI Assistant' },
  { value: 'analytics', label: 'Analytics & Ranks' },
  { value: 'universe', label: 'Study Universe' },
];

const LEADERBOARD_CATEGORY_OPTIONS: SelectionOption[] = [
  { value: 'Most Consistent', label: 'Most Consistent' },
  { value: 'Goal Achiever', label: 'Goal Achiever' },
  { value: 'PYQ Champion', label: 'PYQ Champion' },
  { value: 'Helpful Member', label: 'Helpful Member' },
];

const SelectionSheet = ({
  visible,
  title,
  options,
  selectedValues,
  multiple = false,
  onToggle,
  onClose,
  onClear,
  theme,
}: {
  visible: boolean;
  title: string;
  options: SelectionOption[];
  selectedValues: string[];
  multiple?: boolean;
  onToggle: (value: string) => void;
  onClose: () => void;
  onClear?: () => void;
  theme: ThemeColors;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]}>
      <View style={[styles.modalSheet, { maxHeight: '80%', backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{title}</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close options" style={styles.iconBtn}>
            <X size={18} color={theme.textSecondary} />
          </Pressable>
        </View>
        <ScrollView style={{ flexGrow: 0, marginTop: 10 }} showsVerticalScrollIndicator={false}>
          {options.map((option) => {
            const selected = selectedValues.includes(option.value);
            return (
              <Pressable
                key={option.value}
                onPress={() => onToggle(option.value)}
                accessibilityRole={multiple ? 'checkbox' : 'radio'}
                accessibilityState={{ checked: selected, selected }}
                style={({ pressed }) => ({
                  minHeight: 48,
                  paddingHorizontal: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: 10,
                  backgroundColor: pressed ? theme.surfaceElevated : 'transparent',
                })}
              >
                <Text style={{ flex: 1, fontSize: 14, fontWeight: selected ? '700' : '500', color: selected ? theme.primaryText : theme.textPrimary }}>
                  {option.label}
                </Text>
                {selected && <Check size={17} color={theme.primary} />}
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={[styles.modalFooter, { justifyContent: 'space-between' }]}>
          {onClear ? (
            <Pressable onPress={onClear} accessibilityRole="button" style={[styles.secondaryBtn, { backgroundColor: theme.surfaceElevated }]}>
              <Text style={[styles.secondaryBtnText, { color: theme.textPrimary }]}>Clear All</Text>
            </Pressable>
          ) : <View />}
          <Pressable onPress={onClose} accessibilityRole="button" style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
);

const CategoryMenuButton = ({
  label,
  onPress,
  theme,
}: {
  label: string;
  onPress: () => void;
  theme: ThemeColors;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`Choose category, currently ${label}`}
    style={({ pressed }) => ({
      minHeight: 44,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.primary + '55',
      backgroundColor: theme.primarySoft,
      opacity: pressed ? 0.8 : 1,
    })}
  >
    <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, fontWeight: '700', color: theme.primaryText }}>{label}</Text>
    <ChevronDown size={16} color={theme.primary} />
  </Pressable>
);

const FilterButton = ({
  count,
  onPress,
  theme,
}: {
  count: number;
  onPress: () => void;
  theme: ThemeColors;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={count ? `Filters, ${count} active` : 'Filters'}
    style={({ pressed }) => ({
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: count ? theme.primary : theme.border,
      backgroundColor: pressed ? theme.surfaceElevated : count ? theme.primarySoft : theme.surface,
    })}
  >
    <Filter size={15} color={count ? theme.primary : theme.textSecondary} />
    <Text style={{ fontSize: 12, fontWeight: '700', color: count ? theme.primaryText : theme.textSecondary }}>Filter</Text>
    {count > 0 && (
      <View style={{ minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>{count}</Text>
      </View>
    )}
  </Pressable>
);

const SegmentedControl = ({
  options,
  selected,
  onSelect,
  theme,
}: {
  options: (SelectionOption & { accessibilityLabel?: string })[];
  selected: string;
  onSelect: (value: string) => void;
  theme: ThemeColors;
}) => (
  <View style={{ flexDirection: 'row', gap: 3, padding: 3, borderRadius: 12, backgroundColor: theme.surfaceElevated }}>
    {options.map((option) => {
      const active = selected === option.value;
      return (
        <Pressable
          key={option.value}
          onPress={() => onSelect(option.value)}
          accessibilityRole="tab"
          accessibilityLabel={option.accessibilityLabel}
          accessibilityState={{ selected: active }}
          style={({ pressed }) => ({
            flex: 1,
            minWidth: 0,
            minHeight: 42,
            paddingHorizontal: 4,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 9,
            backgroundColor: active ? theme.surface : 'transparent',
            borderWidth: active ? 1 : 0,
            borderColor: active ? theme.border : 'transparent',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 12, fontWeight: active ? '700' : '600', color: active ? theme.primaryText : theme.textSecondary }}>
            {option.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

const CategoryTransition = ({ children }: { children: React.ReactNode }) => {
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const transition = Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: Platform.OS !== 'web' });
    transition.start();
    return () => transition.stop();
  }, [opacity]);

  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
};

/** Reusable PremiumFeatureCard */
const PremiumFeatureCard = ({
  featureName,
  benefits,
  onUpgrade,
  theme,
}: {
  featureName: string;
  benefits: string[];
  onUpgrade: () => void;
  theme: ThemeColors;
}) => (
  <View
    style={[
      styles.card,
      {
        backgroundColor: theme.surface,
        borderColor: theme.premiumBorder,
        padding: 18,
      },
    ]}
  >
    <View style={styles.rowWrapGap8}>
      <View style={[styles.badgePill, { backgroundColor: theme.premiumSoft }]}>
        <Sparkles size={13} color={theme.premium} />
        <Text style={[styles.badgePillText, { color: theme.premium }]}>Study Sakha Plus</Text>
      </View>
      <Text style={{ fontSize: 12, color: theme.textSecondary }}>
        Core study rooms & doubts remain free
      </Text>
    </View>
    <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 10 }]}>
      Unlock {featureName}
    </Text>
    <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 4, lineHeight: 19 }}>
      Upgrade to collaborate deeper with organized channels, threads, polls, and AI-powered study insights.
    </Text>
    <View style={{ marginTop: 12, gap: 8 }}>
      {benefits.map((b, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <CheckCircle2 size={16} color={theme.teal} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, fontSize: 13, color: theme.textPrimary, lineHeight: 18 }}>
            {b}
          </Text>
        </View>
      ))}
    </View>
    <Pressable
      onPress={onUpgrade}
      style={({ pressed }) => [
        styles.primaryBtn,
        { backgroundColor: theme.primary, marginTop: 16, alignSelf: 'flex-start', opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={styles.primaryBtnText}>Preview Plus Experience Now</Text>
    </Pressable>
  </View>
);

/** Reusable ConfirmationModal */
const ConfirmationModal = ({
  modal,
  onClose,
  theme,
}: {
  modal: ConfirmModalConfig | null;
  onClose: () => void;
  theme: ThemeColors;
}) => {
  const [typedText, setTypedText] = useState('');
  if (!modal) return null;
  const isBlocked = Boolean(modal.requireText && typedText.trim() !== modal.requireText);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]}>
        <View style={[styles.modalSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View
                style={[
                  styles.iconBadge,
                  { backgroundColor: modal.danger ? theme.dangerSoft : theme.primarySoft },
                ]}
              >
                <AlertTriangle size={18} color={modal.danger ? theme.danger : theme.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: theme.textPrimary, flex: 1 }]}>
                {modal.title}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.iconBtn}>
              <X size={18} color={theme.textSecondary} />
            </Pressable>
          </View>
          <Text style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 20, marginTop: 10 }}>
            {modal.body}
          </Text>
          {modal.requireText && (
            <View style={{ marginTop: 14 }}>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 6 }}>
                Type <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{modal.requireText}</Text> to confirm:
              </Text>
              <TextInput
                value={typedText}
                onChangeText={setTypedText}
                placeholder={modal.requireText}
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: theme.border,
                    color: theme.textPrimary,
                  },
                ]}
              />
            </View>
          )}
          <View style={styles.modalFooter}>
            <Pressable
              onPress={onClose}
              style={[styles.secondaryBtn, { backgroundColor: theme.surfaceElevated }]}
            >
              <Text style={[styles.secondaryBtnText, { color: theme.textPrimary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={isBlocked}
              onPress={() => {
                modal.onConfirm?.();
                setTypedText('');
                onClose();
              }}
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: modal.danger ? theme.danger : theme.primary,
                  opacity: isBlocked ? 0.4 : 1,
                },
              ]}
            >
              <Text style={styles.primaryBtnText}>{modal.confirmLabel || 'Confirm'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

function initialsForName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatFocusElapsed(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

// ----------------------------------------------------------------------------
// 4. MAIN REACT NATIVE APPLICATION COMPONENT
// ----------------------------------------------------------------------------

export default function StudySakhaGroupsRN() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const insets = useSafeAreaInsets();
  const { colors: appColors, scheme } = useTheme();
  const store = useStore();
  const globalFocus = useOptionalFocusSession();
  const navigation = useNavigation<AppNavigation>();
  const route = useRoute<AppRoute<'Groups'>>();
  const roomUser = store.state.user;

  // Screen state
  const [isPremium, setIsPremium] = useState(true);
  const [activeScreen, setActiveScreen] = useState<'main' | 'detail' | 'notifications'>('main');
  const theme = useMemo<ThemeColors>(() => ({
    canvas: appColors.bg,
    surface: appColors.surface,
    surfaceElevated: appColors.surfaceAlt,
    border: appColors.border,
    borderSubtle: appColors.borderSubtle,
    textPrimary: appColors.textPrimary,
    textSecondary: appColors.textSecondary,
    textMuted: appColors.textMuted,
    primary: appColors.blue,
    primarySoft: appColors.tint,
    primaryText: appColors.blue,
    teal: appColors.teal,
    tealSoft: appColors.tealTint,
    tealText: appColors.teal,
    live: appColors.green,
    warning: appColors.warning,
    warningSoft: scheme === 'dark' ? 'rgba(255,184,77,0.12)' : 'rgba(255,149,0,0.12)',
    warningBorder: appColors.warning,
    danger: appColors.danger,
    dangerSoft: scheme === 'dark' ? 'rgba(255,107,112,0.14)' : 'rgba(255,59,48,0.12)',
    premium: appColors.purple,
    premiumSoft: scheme === 'dark' ? 'rgba(154,130,255,0.16)' : 'rgba(175,82,222,0.12)',
    premiumBorder: appColors.purple,
    successSoft: scheme === 'dark' ? 'rgba(43,214,155,0.14)' : 'rgba(52,199,89,0.12)',
    successBorder: appColors.green,
    successText: appColors.green,
    overlay: appColors.overlay,
  }), [appColors, scheme]);

  // Groups Data & Filters
  // Group discovery is backend-owned. Never seed the production list with fixtures.
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [groupMembershipsLoaded, setGroupMembershipsLoaded] = useState(false);
  const [groupMembershipLoadError, setGroupMembershipLoadError] = useState<string | null>(null);
  const [groupMembershipRetry, setGroupMembershipRetry] = useState(0);
  const [refreshingGroups, setRefreshingGroups] = useState(false);
  const [mainCategory, setMainCategory] = useState('my_groups');
  const [recommendedCategory, setRecommendedCategory] = useState('recommended');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Group & Detail Tabs
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [detailTab, setDetailTab] = useState('live');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeInvite, setActiveInvite] = useState<StudyGroupInvite | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invitePreviewToken, setInvitePreviewToken] = useState<string | null>(null);
  const [invitePreview, setInvitePreview] = useState<StudyGroupInvitePreview | null>(null);
  const [invitePreviewLoading, setInvitePreviewLoading] = useState(false);
  const [invitePreviewError, setInvitePreviewError] = useState<string | null>(null);
  const [joiningByInvite, setJoiningByInvite] = useState(false);
  const handledInviteKeyRef = useRef<string | null>(null);

  // Interactive Study Rooms
  const [activeRoom, setActiveRoom] = useState<StudyRoom | null>(null);
  const [activeRoomGroupId, setActiveRoomGroupId] = useState<string | null>(null);
  const [roomSessionId, setRoomSessionId] = useState<string | null>(null);
  const [roomFocusActivity, setRoomFocusActivity] = useState<GroupRoomFocusActivity | null>(
    () => getGroupRoomFocusActivity()
  );
  const [openedFocusSession, setOpenedFocusSession] = useState(
    () => route.params?.openGroupRoom?.focusSession ?? null
  );
  const [roomClockNow, setRoomClockNow] = useState(Date.now);
  const [joiningRoomId, setJoiningRoomId] = useState<GroupRoomId | null>(null);
  const [roomJoinError, setRoomJoinError] = useState<string | null>(null);
  const [isLeavingRoom, setIsLeavingRoom] = useState(false);
  const [roomMinimized, setRoomMinimized] = useState(false);

  useEffect(() => {
    if (!globalFocus?.setActiveHallContext) return;
    if (activeRoom && roomSessionId) {
      const groupName = groups.find((g) => g.id === (activeRoomGroupId ?? selectedGroupId))?.name ?? 'Study Group';
      globalFocus.setActiveHallContext({
        groupId: activeRoomGroupId ?? selectedGroupId,
        groupName,
        roomId: activeRoom.id,
        roomName: activeRoom.name,
        roomSessionId,
        isInsideHall: !roomMinimized,
      });
    } else {
      globalFocus.setActiveHallContext(null);
    }
  }, [activeRoom, activeRoomGroupId, globalFocus, groups, roomMinimized, roomSessionId, selectedGroupId]);

  useEffect(() => {
    if (!globalFocus?.registerHallOpener) return;
    globalFocus.registerHallOpener(() => {
      returningToFocusRef.current = false;
      setRoomMinimized(false);
      navigation.navigate('Groups');
    });
    return () => globalFocus.registerHallOpener(null);
  }, [globalFocus, navigation]);
  const [roomFocusing, setRoomFocusing] = useState(false);
  const [roomSubject, setRoomSubject] = useState('Current Affairs');
  const [showRoomFocusSetup, setShowRoomFocusSetup] = useState(false);
  const [roomFocusSetup, setRoomFocusSetup] = useState<FocusSessionSetup>({
    mode: 'timer',
    durationMinutes: 25,
    selection: 'manual',
    tag: 'Current Affairs',
    task: null,
  });
  const [roomAmbientAudio, setRoomAmbientAudio] = useState<AmbientAudio>('muted');
  const [roomError, setRoomError] = useState<string | null>(null);
  const [roomAudioActionError, setRoomAudioActionError] = useState<string | null>(null);
  const [roomMicroGoals, setRoomMicroGoals] = useState<RoomMicroGoal[]>([]);
  const [newRoomGoal, setNewRoomGoal] = useState('');
  const [breakChatInput, setBreakChatInput] = useState('');
  const [showMockPaper, setShowMockPaper] = useState(true);
  const [showExamReflection, setShowExamReflection] = useState(false);
  const [examQuestionsAttempted, setExamQuestionsAttempted] = useState('');
  const [examTimeRating, setExamTimeRating] = useState(3);
  const [camConsentRoom, setCamConsentRoom] = useState<StudyRoom | null>(null);
  const [camConsentChecked, setCamConsentChecked] = useState(false);
  const [camDimSelfView, setCamDimSelfView] = useState(false);
  const [hiddenRoomMembers, setHiddenRoomMembers] = useState<string[]>([]);
  const [reportingRoomMember, setReportingRoomMember] = useState<StudyRoomParticipant | null>(null);
  const [reportReason, setReportReason] = useState<'Harassment' | 'Unsafe behavior' | 'Spam' | 'Other'>('Other');
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [roomInsights, setRoomInsights] = useState<{
    groupId: string;
    userId: string;
    logs: StudyRoomLog[];
    profiles: StudyRoomProfile[];
    error: string | null;
  } | null>(null);
  const [roomLogRefresh, setRoomLogRefresh] = useState(0);
  const roomUpdateQueue = useRef(Promise.resolve());
  const groupMembershipRequest = useRef(0);
  const handledOpenRoomRef = useRef<unknown>(null);
  const openingDirectHallRef = useRef(false);
  const openingDirectHall = Boolean(route.params?.openGroupRoom) && !activeRoom;
  const activeRoomRef = useRef<StudyRoom | null>(null);
  const roomSessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeRoomRef.current = activeRoom;
    roomSessionIdRef.current = roomSessionId;
  }, [activeRoom, roomSessionId]);
  const joiningRoomRef = useRef(false);
  const leavingRoomRef = useRef(false);
  const focusLaunchRef = useRef(false);
  const returningToFocusRef = useRef(false);

  // Chat State
  const [activeChannel, setActiveChannel] = useState('general-chat');
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, ChatMessageItem[]>>({});
  const [chatInput, setChatInput] = useState('');
  const [threadMessage, setThreadMessage] = useState<ChatMessageItem | null>(null);

  // Goals State
  const [goalTimeframe, setGoalTimeframe] = useState('Daily');
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [dailyPledge, setDailyPledge] = useState<{ id: string; label: string; done: boolean }[]>([]);
  const [newPledge, setNewPledge] = useState('');

  // Learn Together State
  const [learnModule, setLearnModule] = useState('doubts');
  const [doubts, setDoubts] = useState<DoubtItem[]>([]);
  const [newDoubtTitle, setNewDoubtTitle] = useState('');
  const [doubtSubject, setDoubtSubject] = useState('Polity');
  const [selectedDoubtSubjects, setSelectedDoubtSubjects] = useState<string[]>([]);
  const [doubtFilter, setDoubtFilter] = useState('All');
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [answeringDoubtId, setAnsweringDoubtId] = useState<string | null>(null);
  const [pyqSelections, setPyqSelections] = useState<Record<string, number>>({});
  const [resources, setResources] = useState<GroupResource[]>([]);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const [liveRoomCategory, setLiveRoomCategory] = useState('focus');
  const [selectionSheet, setSelectionSheet] = useState<SelectionSheetKind | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Events State
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventView, setEventView] = useState<'upcoming' | 'calendar' | 'past'>('upcoming');

  // Members & Insights Sub-tabs
  const [membersSubTab, setMembersSubTab] = useState('directory');
  const [buddyRequested, setBuddyRequested] = useState<Record<string, boolean>>({});
  const [memberSearch, setMemberSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState('All');
  const [insightsSubTab, setInsightsSubTab] = useState('ai');
  const [leaderboardCategory, setLeaderboardCategory] = useState('Most Consistent');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'Weekly' | 'Monthly'>('Weekly');
  const [aiMessages, setAiMessages] = useState<{ role: 'ai' | 'user'; text: string; title?: string; actionLabel?: string; actionTab?: string }[]>([]);
  const [aiInput, setAiInput] = useState('');

  // Notifications & Modals
  const [notifications, setNotifications] = useState<GroupNotification[]>([]);
  const [notifFilter, setNotifFilter] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [newGroupForm, setNewGroupForm] = useState({
    name: '',
    description: '',
    exam: 'RAS',
    type: 'General Study' as 'General Study' | 'Cam Study',
    dailyTargetHours: 6,
    memberLimit: 50,
    privacy: 'Public' as 'Public' | 'Private',
    joinMethod: 'Open Join' as GroupItem['joinMethod'],
    language: 'Bilingual',
  });
  const [joinModalGroup, setJoinModalGroup] = useState<GroupItem | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'privacy' | 'log'>('general');
  const [privacyPrefs, setPrivacyPrefs] = useState([true, true, true, true]);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalConfig | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) || groups[0],
    [groups, selectedGroupId]
  );
  const currentRoomFocusActivity = roomFocusActivity?.groupId === activeRoomGroupId &&
    roomFocusActivity.roomSessionId === roomSessionId
    ? roomFocusActivity
    : null;
  const focusBarSession = currentRoomFocusActivity
    ? {
        sessionId: currentRoomFocusActivity.focusSessionId ?? openedFocusSession?.sessionId ?? '',
        status: currentRoomFocusActivity.status,
        elapsedSeconds: currentRoomFocusActivity.elapsedSeconds,
        updatedAt: currentRoomFocusActivity.updatedAt,
      }
    : openedFocusSession
      ? {
          sessionId: openedFocusSession.sessionId,
          status: openedFocusSession.status,
          elapsedSeconds: openedFocusSession.elapsedSeconds,
          updatedAt: null,
        }
      : null;
  const focusBarElapsedSeconds = focusBarSession
    ? focusBarSession.elapsedSeconds + (
        focusBarSession.status === 'focusing' && focusBarSession.updatedAt
          ? Math.max(0, Math.floor((roomClockNow - Date.parse(focusBarSession.updatedAt)) / 1000))
          : 0
      )
    : 0;
  const roomRealtime = useGroupRoomRealtime({
    groupId: activeRoomGroupId ?? selectedGroupId,
    roomId: activeRoom?.id ?? null,
    userId: roomUser?.id ?? null,
    displayName: roomUser?.name ?? 'Aspirant',
    subject: roomSubject,
    focusing: roomFocusing,
    focusActivity: currentRoomFocusActivity,
  });
  const roomAudioPlayer = useAudioPlayer(null);
  const roomAudioLifecycle = useMemo(
    () => new AudioPlayerLifecycle(roomAudioPlayer, (error) => {
      setRoomAudioActionError(error instanceof Error ? error.message : 'Ambient audio could not play.');
    }),
    [roomAudioPlayer],
  );
  const roomAudioStatus = useAudioPlayerStatus(roomAudioPlayer);
  useEffect(() => () => roomAudioLifecycle.close(), [roomAudioLifecycle]);
  useEffect(() => {
    if (!activeRoom || activeRoom.id !== 'silent-focus' || !focusBarSession) return;
    const timer = setInterval(() => setRoomClockNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [activeRoom, focusBarSession?.sessionId]);
  const currentRoomInsights = roomInsights?.groupId === selectedGroupId &&
    roomInsights.userId === roomUser?.id
    ? roomInsights
    : null;
  const roomStudyLogs = currentRoomInsights?.logs ?? EMPTY_ROOM_STUDY_LOGS;
  const roomStudyProfiles = currentRoomInsights?.profiles ?? EMPTY_ROOM_STUDY_PROFILES;
  const roomInsightsError = currentRoomInsights?.error ?? null;
  const roomAudioError = roomAudioActionError ??
    (roomAudioStatus.error ? `Ambient audio could not play: ${roomAudioStatus.error}` : null);
  const liveMemberCount = activeRoom ? roomRealtime.participants.length : 0;
  const liveRoomPeerCount = roomRealtime.participants.filter((participant) => participant.userId !== roomUser?.id).length;
  const roomFocusSecondsTotal = useMemo(
    () => roomStudyLogs.reduce((total, session) => total + session.focused_seconds, 0),
    [roomStudyLogs]
  );
  const ownRoomFocusStreak = useMemo(
    () => roomUser ? getRoomFocusStreak(roomStudyLogs, roomUser.id) : 0,
    [roomStudyLogs, roomUser]
  );
  const roomProfileNames = useMemo(
    () => new Map(roomStudyProfiles.map((profile) => [profile.user_id, profile.display_name])),
    [roomStudyProfiles]
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const refreshGroups = useCallback(async (options?: { silent?: boolean }) => {
    if (!roomUser?.id) return;
    const requestId = ++groupMembershipRequest.current;
    if (!options?.silent) {
      setGroupMembershipLoadError(null);
    }
    try {
      const discoverable = await listDiscoverableStudyGroups(roomUser.id);
      if (requestId !== groupMembershipRequest.current) return;
      setGroupMembershipLoadError(null);
      setGroups((current) => {
        const previousById = new Map(current.map((group) => [group.id, group]));
        return discoverable.map((group) => {
          const prev = previousById.get(group.id);
          return {
            id: group.id,
            name: group.name,
            shortName: prev?.shortName ?? group.name.slice(0, 2).toUpperCase(),
            description: prev?.description ?? (group.privacy === 'Public'
              ? 'Public Study Sakha group open for collaborative exam preparation.'
              : 'Private Study Sakha group.'),
            exam: prev?.exam ?? 'General',
            subject: prev?.subject ?? 'General Study',
            type: prev?.type ?? 'General Study',
            privacy: group.privacy,
            joinMethod: group.joinMethod,
            language: prev?.language ?? 'Bilingual',
            membersCount: group.memberCount,
            memberLimit: prev?.memberLimit,
            dailyTargetHours: prev?.dailyTargetHours,
            joined: group.isMember,
            unreadCount: prev?.unreadCount ?? 0,
            activeRoomLabel: prev?.activeRoomLabel ?? 'Silent Focus Hall',
            accentHex: prev?.accentHex ?? '#2563EB',
            treeLevel: prev?.treeLevel ?? 1,
            treeXp: prev?.treeXp ?? 0,
            matchReason: group.isMember
              ? (group.memberRole === 'Owner' ? 'Created by You' : 'Joined group')
              : 'Public Study Circle',
            dataSource: 'backend',
          };
        });
      });
    } catch (error: unknown) {
      if (requestId !== groupMembershipRequest.current) return;
      const message = error instanceof Error ? error.message : 'Could not load study groups.';
      setGroupMembershipLoadError(message);
      if (!options?.silent) showToast(message);
    } finally {
      if (requestId === groupMembershipRequest.current) {
        setGroupMembershipsLoaded(true);
        setRefreshingGroups(false);
      }
    }
  }, [roomUser?.id, showToast]);

  useEffect(() => {
    void refreshGroups();
  }, [groupMembershipRetry, refreshGroups]);

  const refreshGroupsRef = useRef(refreshGroups);
  useEffect(() => {
    refreshGroupsRef.current = refreshGroups;
  }, [refreshGroups]);

  useEffect(() => {
    if (!roomUser?.id || !supabaseConfigured || typeof supabase.channel !== 'function') return;
    let active = true;
    const channelTopic = `study-groups-sync:${roomUser.id}:${++studyGroupsSyncChannelSeq}`;
    const channel = supabase.channel(channelTopic);
    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'study_groups' },
        () => {
          if (active) void refreshGroupsRef.current({ silent: true });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'study_group_memberships', filter: `user_id=eq.${roomUser.id}` },
        () => {
          if (active) void refreshGroupsRef.current({ silent: true });
        }
      );
    channel.subscribe();
    return () => {
      active = false;
      if (typeof supabase.removeChannel === 'function') {
        void supabase.removeChannel(channel).catch(() => {});
      } else if (typeof channel.unsubscribe === 'function') {
        void channel.unsubscribe().catch(() => {});
      }
    };
  }, [roomUser?.id]);

  useEffect(() => {
    if (!roomUser?.id) return;
    let active = true;
    void getStudyRoomLogs(selectedGroupId).then(async (logs) => {
      const profiles = await getStudyRoomProfiles(
        selectedGroupId,
        [...new Set(logs.map((session) => session.user_id))]
      );
      if (active) {
        setRoomInsights({
          groupId: selectedGroupId,
          userId: roomUser.id,
          logs,
          profiles,
          error: null,
        });
      }
    }).catch((error: unknown) => {
      if (active) {
        setRoomInsights({
          groupId: selectedGroupId,
          userId: roomUser.id,
          logs: [],
          profiles: [],
          error: error instanceof Error ? error.message : 'Could not load group study logs.',
        });
      }
    });
    return () => {
      active = false;
    };
  }, [roomLogRefresh, roomUser?.id, selectedGroupId]);

  useFocusEffect(
    useCallback(() => {
      returningToFocusRef.current = false;
      focusLaunchRef.current = false;
      void refreshGroups({ silent: true });
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (isAppDrawerOpen(navigation)) return false;
        if (activeScreen === 'main') navigation.popTo('DashboardRoot');
        else setActiveScreen('main');
        return true;
      });
      return () => subscription.remove();
    }, [activeScreen, navigation, refreshGroups])
  );

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (mainCategory === 'my_groups' && !g.joined) return false;
      if (mainCategory === 'recommended') {
        if (recommendedCategory === 'recommended' && (g.joined || !/match/i.test(g.matchReason))) return false;
        if (recommendedCategory === 'discover' && g.joined) return false;
        if (recommendedCategory === 'live' && !(g.liveStudying && g.liveStudying > 0)) return false;
        if (recommendedCategory === 'cam' && g.type !== 'Cam Study') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          g.name.toLowerCase().includes(q) ||
          g.exam.toLowerCase().includes(q) ||
          g.subject.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [groups, mainCategory, recommendedCategory, searchQuery]);

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const handleOpenGroupDetail = useCallback((group: GroupItem) => {
    setSelectedGroupId(group.id);
    setActiveScreen('detail');
    setDetailTab('live');
  }, []);

  // Join Group Flow
  const handleInitiateJoin = async (group: GroupItem) => {
    if (group.joined) {
      handleOpenGroupDetail(group);
      return;
    }
    if (group.joinMethod === 'Open Join') {
      try {
        await joinOpenStudyGroup(group.id);
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Could not join this group.');
        return;
      }
      groupMembershipRequest.current += 1;
      setGroups((prev) =>
        prev.map((g) =>
          g.id === group.id ? { ...g, joined: true } : g
        )
      );
      showToast(`Joined ${group.name}!`);
      handleOpenGroupDetail(group);
    } else {
      setJoinModalGroup(group);
    }
  };

  const handleCreateGroup = async () => {
    const created: GroupItem = {
      id: `grp-${Date.now()}`,
      name: newGroupForm.name.trim() || 'RAS 2026 Focus Circle',
      shortName: (newGroupForm.name.trim() || 'RF').slice(0, 2).toUpperCase(),
      description:
        newGroupForm.description.trim() || 'Collaborative exam preparation group on Study Sakha.',
      exam: newGroupForm.exam,
      subject: 'General Preparation',
      type: newGroupForm.type,
      privacy: newGroupForm.privacy,
      joinMethod: newGroupForm.joinMethod,
      language: newGroupForm.language,
      memberLimit: newGroupForm.memberLimit,
      dailyTargetHours: newGroupForm.dailyTargetHours,
      joined: true,
      unreadCount: 0,
      activeRoomLabel: 'Ready to start first session',
      accentHex: newGroupForm.type === 'Cam Study' ? '#0D9488' : '#2563EB',
      treeLevel: 1,
      treeXp: 15,
      matchReason: 'Created by You',
      dataSource: 'backend',
    };
    try {
      await createStudyGroup({
        groupId: created.id,
        name: created.name,
        privacy: created.privacy,
        joinMethod: created.joinMethod,
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not create this group.');
      return;
    }
    groupMembershipRequest.current += 1;
    setGroups((prev) => [created, ...prev]);
    setShowCreateModal(false);
    setCreateStep(1);
    handleOpenGroupDetail(created);
    showToast(`Created "${created.name}" successfully!`);
  };

  const persistRoomUpdate = useCallback((sessionId: string, update: Parameters<typeof updateRoomSession>[1]) => {
    roomUpdateQueue.current = roomUpdateQueue.current
      .catch(() => undefined)
      .then(async () => {
        await updateRoomSession(sessionId, update);
        if (update.focusing === false) setRoomLogRefresh((current) => current + 1);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Could not save your room update.';
        setRoomError(message);
      });
  }, []);

  useEffect(() => subscribeGroupRoomFocus((event) => {
    if (event.type !== 'stop') {
      const { activity } = event;
      if (activity.groupId !== activeRoomGroupId || activity.roomSessionId !== roomSessionId) return;
      setRoomFocusActivity(activity);
      setRoomFocusing(activity.status === 'focusing');
      setRoomSubject(activity.subject);
      focusLaunchRef.current = false;
      persistRoomUpdate(activity.roomSessionId, {
        focusing: activity.status === 'focusing',
        subject: activity.subject,
      });
      return;
    }

    if (event.roomSessionId !== roomSessionId) return;
    setRoomFocusActivity(null);
    setOpenedFocusSession(null);
    setRoomFocusing(false);
    setRoomMinimized(false);
    focusLaunchRef.current = false;
    persistRoomUpdate(event.roomSessionId, { focusing: false });
  }), [activeRoomGroupId, persistRoomUpdate, roomSessionId]);

  const clearRoomSession = useCallback(() => {
    const currentSessionId = roomSessionIdRef.current;
    if (currentSessionId) {
      endGroupRoomFocus(currentSessionId);
      clearGroupRoomFocusContext(currentSessionId);
    }
    roomAudioLifecycle.run((player) => player.pause());
    focusLaunchRef.current = false;
    setActiveRoom(null);
    setActiveRoomGroupId(null);
    setRoomSessionId(null);
    setRoomMinimized(false);
    setRoomFocusing(false);
    setRoomAmbientAudio('muted');
    setShowRoomFocusSetup(false);
    setRoomMicroGoals([]);
    setRoomError(null);
    setRoomJoinError(null);
    setOpenedFocusSession(null);
    setRoomLogRefresh((current) => current + 1);
  }, [roomAudioLifecycle]);

  const openGroupRoomParam = route.params?.openGroupRoom;
  const inviteTokenParam = route.params?.inviteToken;
  const inviteGroupIdParam = route.params?.inviteGroupId;
  const fallbackSelectedGroupId = selectedGroup?.id ?? '';

  useEffect(() => {
    if (!showInviteModal || !selectedGroup?.id || !roomUser?.id) return;
    let active = true;
    setInviteLoading(true);
    setInviteError(null);
    void listStudyGroupInvites(selectedGroup.id)
      .then(async (existing) => {
        if (!active) return;
        if (existing.length > 0) {
          setActiveInvite(existing[0]);
          return;
        }
        const created = await createStudyGroupInvite({ groupId: selectedGroup.id });
        if (active) setActiveInvite(created);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setActiveInvite(null);
        setInviteError(error instanceof Error ? error.message : 'Could not prepare an invitation link.');
      })
      .finally(() => {
        if (active) setInviteLoading(false);
      });
    return () => {
      active = false;
    };
  }, [roomUser?.id, selectedGroup?.id, showInviteModal]);

  useEffect(() => {
    const rawToken = inviteTokenParam?.trim();
    const rawGroupId = inviteGroupIdParam?.trim();
    const normalizedToken = rawToken && !rawToken.startsWith('grp-') ? rawToken : undefined;
    const normalizedGroupId = rawGroupId || (rawToken && rawToken.startsWith('grp-') ? rawToken : undefined);
    const inviteKey = normalizedToken ? `token:${normalizedToken}` : normalizedGroupId ? `group:${normalizedGroupId}` : '';

    if (!inviteKey) {
      handledInviteKeyRef.current = null;
      return;
    }
    if (handledInviteKeyRef.current === inviteKey) return;
    if (!roomUser?.id) return;

    if (normalizedToken) {
      handledInviteKeyRef.current = inviteKey;
      navigation.setParams({ inviteToken: undefined, inviteGroupId: undefined });
      setInvitePreviewToken(normalizedToken);
      setInvitePreview(null);
      setInvitePreviewError(null);
      setInvitePreviewLoading(true);
      void getStudyGroupInvitePreview(normalizedToken)
        .then((preview) => {
          setInvitePreview(preview);
          if (preview.valid && preview.isMember && preview.groupId) {
            void refreshGroups({ silent: true });
            setSelectedGroupId(preview.groupId);
            setActiveScreen('detail');
            setDetailTab('live');
            setInvitePreviewToken(null);
            showToast(`Opened ${preview.groupName ?? 'study group'}.`);
          }
        })
        .catch((error: unknown) => {
          setInvitePreviewError(error instanceof Error ? error.message : 'Could not verify this invitation.');
        })
        .finally(() => {
          setInvitePreviewLoading(false);
        });
      return;
    }

    if (!groupMembershipsLoaded || !normalizedGroupId) return;
    handledInviteKeyRef.current = inviteKey;
    navigation.setParams({ inviteToken: undefined, inviteGroupId: undefined });
    const targetGroup = groups.find((g) => g.id === normalizedGroupId);
    if (targetGroup?.joined) {
      handleOpenGroupDetail(targetGroup);
      showToast(`Opened ${targetGroup.name}.`);
    } else if (targetGroup && targetGroup.privacy === 'Public' && targetGroup.joinMethod === 'Open Join') {
      void handleInitiateJoin(targetGroup);
    } else {
      showToast('This group requires a valid invitation link.');
    }
  }, [
    groupMembershipsLoaded,
    groups,
    handleInitiateJoin,
    handleOpenGroupDetail,
    inviteGroupIdParam,
    inviteTokenParam,
    navigation,
    refreshGroups,
    roomUser?.id,
    showToast,
  ]);

  const beginRoomSession = useCallback(async (
    room: StudyRoom,
    cameraConsent = false,
    groupId = fallbackSelectedGroupId,
    options?: { bypassActiveRoomCheck?: boolean },
  ) => {
    if (joiningRoomRef.current) return false;
    if (!roomUser) {
      setRoomJoinError('Sign in before joining a study room.');
      return false;
    }
    if (!options?.bypassActiveRoomCheck && activeRoomRef.current) {
      setRoomJoinError('Leave your current room before joining another.');
      return false;
    }
    joiningRoomRef.current = true;
    setJoiningRoomId(room.id);
    setRoomJoinError(null);
    setRoomError(null);
    try {
      const sessionId = await createRoomSession({
        groupId,
        roomId: room.id,
        subject: roomSubject,
        cameraConsent,
      });
      setGroupRoomFocusContext({ groupId, roomId: room.id, roomSessionId: sessionId });
      setRoomSessionId(sessionId);
      setRoomFocusActivity(null);
      setActiveRoomGroupId(groupId);
      setActiveRoom(room);
      setRoomMinimized(false);
      setRoomFocusing(false);
      const preview = openGroupRoomParam?.focusSession;
      if (preview && room.id === 'silent-focus' && groupId === openGroupRoomParam?.groupId) {
        const activity: GroupRoomFocusActivity = {
          groupId,
          roomId: room.id,
          roomSessionId: sessionId,
          focusSessionId: preview.sessionId,
          subject: preview.subject,
          status: preview.status,
          startedAt: preview.startedAt,
          elapsedSeconds: preview.elapsedSeconds,
          updatedAt: new Date().toISOString(),
        };
        setRoomFocusActivity(activity);
        setRoomFocusing(preview.status === 'focusing');
        setRoomSubject(preview.subject);
        setOpenedFocusSession(preview);
        publishGroupRoomFocus(activity, 'start');
      }
      setRoomAmbientAudio('muted');
      setShowRoomFocusSetup(false);
      setRoomMicroGoals([]);
      setNewRoomGoal('');
      setRoomError(null);
      showToast(`Joined ${room.name}.`);
      return true;
    } catch (error) {
      setRoomJoinError(error instanceof Error ? error.message : 'Could not join this study room.');
      return false;
    } finally {
      joiningRoomRef.current = false;
      setJoiningRoomId(null);
    }
  }, [fallbackSelectedGroupId, openGroupRoomParam, roomSubject, roomUser, showToast]);

  const handleJoinRoom = (room: StudyRoom) => {
    if (joiningRoomRef.current) return;
    if (activeRoom) {
      setRoomJoinError('Leave your current room before joining another.');
      return;
    }
    setRoomJoinError(null);
    if (room.isCam) {
      setCamConsentChecked(false);
      setCamConsentRoom(room);
    } else {
      void beginRoomSession(room);
    }
  };

  const handleConfirmCamConsent = async () => {
    if (!camConsentRoom || !camConsentChecked) return;
    if (await beginRoomSession(camConsentRoom, true)) setCamConsentRoom(null);
  };

  const openGroupRoomKey = openGroupRoomParam
    ? `${openGroupRoomParam.groupId}:${openGroupRoomParam.roomId}:${openGroupRoomParam.focusSession?.sessionId ?? ''}`
    : '';

  useEffect(() => {
    const target = openGroupRoomParam;
    if (!target || !openGroupRoomKey) {
      handledOpenRoomRef.current = null;
      return;
    }
    if (handledOpenRoomRef.current === openGroupRoomKey || openingDirectHallRef.current) return;

    if (!roomUser?.id) {
      handledOpenRoomRef.current = openGroupRoomKey;
      navigation.setParams({ openGroupRoom: undefined });
      queueMicrotask(() => showToast('Sign in before joining a study room.'));
      return;
    }
    if (!groupMembershipsLoaded || joiningRoomRef.current) return;

    const group = groups.find((candidate) => candidate.id === target.groupId);
    if (!group || !group.joined) {
      handledOpenRoomRef.current = openGroupRoomKey;
      navigation.setParams({ openGroupRoom: undefined });
      queueMicrotask(() => showToast('This group is not among your active memberships.'));
      return;
    }
    const room = STUDY_ROOMS.find((candidate) => candidate.id === target.roomId);
    if (!room) {
      handledOpenRoomRef.current = openGroupRoomKey;
      navigation.setParams({ openGroupRoom: undefined });
      queueMicrotask(() => showToast('That study room is not available.'));
      return;
    }

    handledOpenRoomRef.current = openGroupRoomKey;

    // Restore an already-active matching Hall directly without creating another instance.
    if (activeRoomRef.current?.id === room.id && activeRoomGroupId === group.id) {
      queueMicrotask(() => {
        returningToFocusRef.current = false;
        focusLaunchRef.current = false;
        handleOpenGroupDetail(group);
        setRoomMinimized(false);
        if (target.focusSession) {
          setOpenedFocusSession(target.focusSession);
          if (roomSessionId && (!currentRoomFocusActivity || currentRoomFocusActivity.focusSessionId !== target.focusSession.sessionId)) {
            const activity: GroupRoomFocusActivity = {
              groupId: group.id,
              roomId: room.id,
              roomSessionId,
              focusSessionId: target.focusSession.sessionId,
              subject: target.focusSession.subject,
              status: target.focusSession.status,
              startedAt: target.focusSession.startedAt,
              elapsedSeconds: target.focusSession.elapsedSeconds,
              updatedAt: new Date().toISOString(),
            };
            setRoomFocusActivity(activity);
            setRoomFocusing(target.focusSession.status === 'focusing');
            setRoomSubject(target.focusSession.subject);
            publishGroupRoomFocus(activity, 'update');
          }
        }
        navigation.setParams({ openGroupRoom: undefined });
      });
      return;
    }

    openingDirectHallRef.current = true;
    void (async () => {
      try {
        if (activeRoomRef.current && roomSessionIdRef.current) {
          try {
            await roomUpdateQueue.current;
            await finishRoomSession(roomSessionIdRef.current, { status: 'left' });
          } catch {
            // Best-effort cleanup of previous room session before switching halls.
          }
          clearRoomSession();
        }
        const joined = await beginRoomSession(room, false, group.id, { bypassActiveRoomCheck: true });
        if (joined) {
          returningToFocusRef.current = false;
          focusLaunchRef.current = false;
          handleOpenGroupDetail(group);
        }
      } finally {
        openingDirectHallRef.current = false;
        navigation.setParams({ openGroupRoom: undefined });
      }
    })();
  }, [
    activeRoom,
    activeRoomGroupId,
    beginRoomSession,
    clearRoomSession,
    currentRoomFocusActivity,
    groupMembershipsLoaded,
    groups,
    handleOpenGroupDetail,
    navigation,
    openGroupRoomParam,
    roomSessionId,
    roomUser?.id,
    showToast,
  ]);

  const handleLeaveRoom = async () => {
    if (!activeRoom || !roomSessionId || leavingRoomRef.current) return;
    leavingRoomRef.current = true;
    setIsLeavingRoom(true);
    const roomName = activeRoom.name;
    try {
      await roomUpdateQueue.current;
      await finishRoomSession(roomSessionId, { status: 'left' });
      clearRoomSession();
      showToast(`Left ${roomName}. Session logged.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not log the room session.';
      setRoomError(message);
      showToast(message);
    } finally {
      leavingRoomRef.current = false;
      setIsLeavingRoom(false);
    }
  };

  const handleToggleFocusing = () => {
    if (!roomSessionId) return;
    const next = !roomFocusing;
    setRoomFocusing(next);
    persistRoomUpdate(roomSessionId, { focusing: next });
  };

  const handleSubjectChange = (nextSubject: string) => {
    setRoomSubject(nextSubject);
    if (roomSessionId) persistRoomUpdate(roomSessionId, { subject: nextSubject });
  };

  const handleAmbientAudioChange = async (nextAudio: AmbientAudio) => {
    setRoomAudioActionError(null);
    setRoomAmbientAudio(nextAudio);
    try {
      if (nextAudio === 'muted') {
        roomAudioLifecycle.run((player) => player.pause());
      } else {
        await setAudioModeAsync({ playsInSilentMode: true });
        if (!roomAudioLifecycle.isActive) return;
        const source = nextAudio === 'soft-rain'
          ? softRainAudio
          : nextAudio === 'brown-noise'
            ? brownNoiseAudio
            : libraryHumAudio;
        roomAudioLifecycle.run((player) => {
          player.replace(source);
          // Expo Audio exposes looping as a mutable player control.
          // eslint-disable-next-line react-hooks/immutability
          player.loop = true;
          player.play();
        });
      }
      if (roomSessionId) persistRoomUpdate(roomSessionId, { ambient_audio: nextAudio });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not start ambient audio.';
      setRoomAudioActionError(message);
    }
  };

  const syncPomodoroPhase = async (next: GroupRoomPhase) => {
    if (!activeRoom || activeRoom.id !== 'pomodoro' || !activeRoomGroupId || !roomUser) return false;
    setRoomError(null);
    try {
      await updateSharedRoomPhase(activeRoomGroupId, activeRoom.id, next, roomUser.id);
      roomRealtime.setPhase(next);
      return true;
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Could not sync the room phase.');
      return false;
    }
  };

  const handleTogglePomodoroPhase = () => {
    const next = roomRealtime.phase === 'focus' ? 'break' : 'focus';
    void syncPomodoroPhase(next);
  };

  useEffect(() => {
    if (activeRoom?.id !== 'pomodoro' || roomRealtime.phase !== 'break' || !roomFocusing || !roomSessionId) return;
    // Break phase may be started by another member, so stop this local focus session.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoomFocusing(false);
    persistRoomUpdate(roomSessionId, { focusing: false });
  }, [activeRoom?.id, persistRoomUpdate, roomFocusing, roomRealtime.phase, roomSessionId]);

  const handleRoomFocusButton = async () => {
    if (activeRoom?.id === 'pomodoro' && roomRealtime.phase === 'break' && !roomFocusing) {
      if (await syncPomodoroPhase('focus')) {
        setRoomFocusing(true);
        if (roomSessionId) persistRoomUpdate(roomSessionId, { focusing: true });
      }
      return;
    }
    handleToggleFocusing();
  };

  const handleStartFocusSessionInRoom = () => {
    if (!activeRoom || activeRoom.id !== 'silent-focus' || !activeRoomGroupId || !roomSessionId) return;
    if (focusLaunchRef.current) return;
    if (currentRoomFocusActivity) {
      navigation.navigate('FocusCenter', {
        roomFocus: {
          groupId: activeRoomGroupId,
          roomId: activeRoom.id,
          roomSessionId,
        },
      });
      return;
    }
    setShowRoomFocusSetup(true);
  };

  const handleContinueRoomFocus = (setup: FocusSessionSetup) => {
    if (!activeRoom || activeRoom.id !== 'silent-focus' || !activeRoomGroupId || !roomSessionId || focusLaunchRef.current) return;
    focusLaunchRef.current = true;
    setRoomFocusSetup(setup);
    setShowRoomFocusSetup(false);
    setRoomMinimized(true);
    navigation.navigate('FocusCenter', {
      focusSession: setup,
      roomFocus: {
        groupId: activeRoomGroupId,
        roomId: activeRoom.id,
        roomSessionId,
      },
    });
  };

// Smart Study Room participant mapping (outside JSX)
  const currentUserChairForSmartRoom = useMemo(() => {
    const focusing = currentRoomFocusActivity?.status === 'focusing';
    const paused = currentRoomFocusActivity?.status === 'paused' || currentRoomFocusActivity?.status === 'break';
    const state: ChairState = focusing ? 'focusing' : paused ? 'paused' : 'available';
    const member: StudyMember = {
      id: roomUser?.id ?? 'self',
      name: roomUser?.name ?? 'You',
      initials: initialsForName(roomUser?.name ?? 'You'),
      avatarBgColor: '#059669',
      exam: null,
      state,
      subject: currentRoomFocusActivity?.subject ?? roomSubject ?? null,
      topic: null,
      mode: null,
      targetSeconds: null,
      elapsedSeconds: currentRoomFocusActivity?.elapsedSeconds ?? 0,
      startedAt: currentRoomFocusActivity?.startedAt ?? null,
      focusUpdatedAt: currentRoomFocusActivity?.updatedAt ?? null,
    };
    return member;
  }, [roomUser?.id, roomUser?.name, currentRoomFocusActivity, roomSubject]);

  const partnersForSmartRoom = useMemo(() => {
    if (!roomRealtime?.participants) return [];
    return roomRealtime.participants
      .filter((p) => p.userId !== (roomUser?.id ?? ''))
      .filter((p) => !hiddenRoomMembers?.includes(p.userId ?? ''))
      .map((p) => ({
        id: p.userId,
        name: p.name,
        initials: p.initials,
        avatarBgColor: '#059669',
        exam: null,
        topic: null,
        subject: p.subject ?? roomSubject ?? null,
        focusSessionState: p.focusSessionState ?? 'available',
        elapsedSeconds: p.focusElapsedSeconds ?? 0,
        state: (p.focusSessionState === 'focusing'
          ? 'focusing'
          : p.focusSessionState === 'paused' || p.focusSessionState === 'break'
            ? 'paused'
            : 'available') as ChairState,
        mode: null,
        targetSeconds: null,
        startedAt: null,
        focusUpdatedAt: p.focusUpdatedAt ?? null,
      }));
  }, [roomRealtime?.participants, roomUser?.id, hiddenRoomMembers]);

  const handleTogglePauseForSmartRoom = () => {
    if (!activeRoom || activeRoom.id !== 'silent-focus' || !roomSessionId) return;
    publishGroupRoomFocusControl({
      type: 'togglePause',
      roomSessionId,
    });
  };

  const handleEndSessionForSmartRoom = () => {
    if (!activeRoom || activeRoom.id !== 'silent-focus' || !roomSessionId) return;
    publishGroupRoomFocusControl({
      type: 'end',
      roomSessionId,
    });
  };

  const handleExitHallForSmartRoom = () => {
    if (!activeRoom || activeRoom.id !== 'silent-focus') return;
    returningToFocusRef.current = false;
    setRoomMinimized(true);
  };
  const handleAddMicroGoal = () => {
    const title = newRoomGoal.trim();
    if (!title || !roomSessionId) return;
    const next = [...roomMicroGoals, { id: `goal-${Date.now()}`, title, completed: false }];
    setRoomMicroGoals(next);
    setNewRoomGoal('');
    persistRoomUpdate(roomSessionId, { micro_goals: next });
  };

  const handleToggleMicroGoal = (goalId: string) => {
    if (!roomSessionId) return;
    const next = roomMicroGoals.map((goal) => goal.id === goalId
      ? { ...goal, completed: !goal.completed }
      : goal);
    setRoomMicroGoals(next);
    persistRoomUpdate(roomSessionId, { micro_goals: next });
  };

  const handleSendBreakMessage = async () => {
    const body = breakChatInput.trim();
    if (!body || !activeRoomGroupId || activeRoom?.id !== 'pomodoro' || roomRealtime.phase !== 'break') return;
    try {
      await sendBreakRoomMessage(activeRoomGroupId, body);
      setBreakChatInput('');
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Could not send your break message.');
    }
  };

  const handleFinishExam = async () => {
    if (leavingRoomRef.current) return;
    if (!roomSessionId || !/^\d+$/.test(examQuestionsAttempted)) {
      setRoomError('Enter the number of questions attempted before finishing the exam.');
      return;
    }
    leavingRoomRef.current = true;
    setIsLeavingRoom(true);
    try {
      await roomUpdateQueue.current;
      await finishRoomSession(roomSessionId, {
        status: 'completed',
        questions_attempted: Number(examQuestionsAttempted),
        time_management_rating: examTimeRating,
      });
      setShowExamReflection(false);
      clearRoomSession();
      showToast('Exam reflection saved to your group study log.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save the exam reflection.';
      setRoomError(message);
    } finally {
      leavingRoomRef.current = false;
      setIsLeavingRoom(false);
    }
  };

  const handleReportRoomMember = async () => {
    if (!activeRoomGroupId || !activeRoom || !reportingRoomMember) return;
    setReportError(null);
    try {
      await reportRoomMember({
        groupId: activeRoomGroupId,
        roomId: activeRoom.id,
        reportedUserId: reportingRoomMember.userId,
        reason: reportReason,
      });
      setReportingRoomMember(null);
      setReportSuccess(`${reportingRoomMember.name} was reported to the group moderators.`);
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'Could not submit the room report.');
    }
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const msg: ChatMessageItem = {
      id: `m-${Date.now()}`,
      sender: 'You (Aarav)',
      initials: 'AS',
      role: 'Owner',
      time: 'Just now',
      text: chatInput.trim(),
      reactions: [],
      replies: 0,
    };
    setMessagesByChannel((prev) => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), msg],
    }));
    setChatInput('');
  };

  const handlePollVote = (channelId: string, msgId: string, optionId: string) => {
    setMessagesByChannel((prev) => ({
      ...prev,
      [channelId]: prev[channelId].map((m) => {
        if (m.id !== msgId || !m.poll) return m;
        const previousVote = m.poll.votedId;
        const nextVote = previousVote === optionId ? null : optionId;
        return {
          ...m,
          poll: {
            ...m.poll,
            votedId: nextVote,
            options: m.poll.options.map((o) =>
              o.id === optionId
                ? { ...o, votes: o.votes + (nextVote === optionId ? 1 : -1) }
                : o.id === previousVote
                  ? { ...o, votes: o.votes - 1 }
                  : o
            ),
          },
        };
      }),
    }));
    showToast('Poll vote updated.');
  };

  const toggleMessageReaction = (channelId: string, messageId: string, reactionIndex: number) => {
    setMessagesByChannel((prev) => ({
      ...prev,
      [channelId]: prev[channelId].map((message) =>
        message.id !== messageId
          ? message
          : {
              ...message,
              reactions: message.reactions.map((reaction, index) =>
                index !== reactionIndex
                  ? reaction
                  : {
                      ...reaction,
                      reacted: !reaction.reacted,
                      count: reaction.count + (reaction.reacted ? -1 : 1),
                    }
              ),
            }
      ),
    }));
  };

  const handleAiPrompt = (promptText?: string) => {
    const q = (promptText || aiInput).trim();
    if (!q) return;
    let reply =
      'Based on your group’s authorized study logs this week, average daily focus increased by +14%. I recommend scheduling a 45-min revision sprint on Rajasthan Economic Review Ch. 4.';
    let title = 'Weekly Study Pulse';
    let actionLabel = 'Save to Group Planner';
    let actionTab = 'goals';
    if (q.toLowerCase().includes('quiz')) {
      title = '10-Question Weak-Topic Quiz';
      actionLabel = 'Start 10-Min Quiz';
      actionTab = 'learn';
      reply =
        'Generated 10-Question Weak-Topic Quiz: 4 Qs on Monetary Policy & RBI Tools, 3 Qs on Article 356/365, and 3 Qs on Mewar Prajamandal. Ready to launch in Learn Together → Quiz Battle.';
    } else if (q.toLowerCase().includes('summarize') || q.toLowerCase().includes('pyq')) {
      title = 'Weekly PYQ Summary';
      actionLabel = 'Pin Summary to Resources';
      actionTab = 'learn';
      reply =
        'Weekly PYQ Summary: Your group solved 1,240 PYQs with 84% accuracy. Most discussed trap: confusing Taragarh (Ajmer) with Taragarh (Bundi).';
    } else if (q.toLowerCase().includes('revision') || q.toLowerCase().includes('plan')) {
      title = '7-Day Revision Plan';
      actionLabel = 'Save to Group Planner';
      actionTab = 'goals';
    }
    setAiMessages((prev) => [...prev, { role: 'user', text: q }, { role: 'ai', text: reply, title, actionLabel, actionTab }]);
    setAiInput('');
  };

  // --------------------------------------------------------------------------
  // 5. SECTION RENDERERS
  // --------------------------------------------------------------------------

  const renderGroupCard = (g: GroupItem) => {
    return (
      <Pressable
        key={g.id}
        accessibilityRole="button"
        accessibilityLabel={`Open ${g.name}`}
        onPress={() => handleOpenGroupDetail(g)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: pressed ? theme.surfaceElevated : theme.surface,
            borderColor: theme.border,
            borderLeftWidth: g.joined ? 4 : 1,
            borderLeftColor: g.joined ? theme.primary : theme.border,
            width: isTablet ? '48.5%' : '100%',
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        {/* Top Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <View style={[styles.groupAvatar, { backgroundColor: g.accentHex }]}>
              <Text style={styles.groupAvatarText}>{g.shortName}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text numberOfLines={1} style={[styles.cardTitle, { color: theme.textPrimary, flexShrink: 1 }]}>
                  {g.name}
                </Text>
                {g.joined && g.unreadCount > 0 && (
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: theme.primary }} />
                )}
              </View>
              {g.dataSource !== 'backend' && <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                <View style={[styles.tagChip, { backgroundColor: theme.surfaceElevated }]}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textPrimary }}>{g.exam}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  {g.type === 'Cam Study' ? (
                    <Video size={12} color={theme.teal} />
                  ) : (
                    <BookOpen size={12} color={theme.primary} />
                  )}
                  <Text style={{ fontSize: 11, color: theme.textSecondary }}>{g.type}</Text>
                </View>
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>· {g.language}</Text>
              </View>}
            </View>
          </View>

          {g.dataSource !== 'backend' && <View style={[styles.privacyBadge, { backgroundColor: theme.surfaceElevated }]}>
            {g.privacy === 'Private' ? (
              <Lock size={11} color={theme.textSecondary} />
            ) : (
              <Globe size={11} color={theme.textSecondary} />
            )}
            <Text style={{ fontSize: 11, fontWeight: '500', color: theme.textSecondary }}>{g.privacy}</Text>
          </View>}
        </View>

        {/* Stats Row */}
        {g.membersCount !== undefined || g.liveStudying !== undefined || g.dailyTargetHours !== undefined ? <View style={styles.spaceBetweenRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {g.membersCount !== undefined && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Users size={13} color={theme.textSecondary} />
              <Text style={[styles.tabularText, { fontSize: 12, color: theme.textSecondary }]}>
                {g.membersCount}{g.memberLimit !== undefined ? `/${g.memberLimit}` : ''}
              </Text>
            </View>}
            {g.liveStudying !== undefined && <LiveStatusIndicator count={g.liveStudying} theme={theme} />}
          </View>
          {g.dailyTargetHours !== undefined && <Text style={[styles.tabularText, { fontSize: 12, fontWeight: '600', color: theme.textSecondary }]}>Target: {g.dailyTargetHours}h/day</Text>}
        </View> : null}

        {/* Footer */}
        {g.dataSource !== 'backend' && <View
          style={[
            styles.cardFooter,
            { borderTopColor: theme.borderSubtle, marginTop: 10, paddingTop: 8 },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
            <Zap size={13} color={theme.teal} />
            <Text numberOfLines={1} style={{ fontSize: 12, color: theme.textSecondary, flex: 1 }}>
              {g.activeRoomLabel}
            </Text>
          </View>
          {!g.joined ? (
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                handleInitiateJoin(g);
              }}
              style={[styles.smallOutlineBtn, { borderColor: theme.primary }]}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.primary }}>
                {g.joinMethod === 'Open Join'
                  ? 'Join Group'
                  : g.joinMethod === 'Password Protected'
                  ? 'Unlock'
                  : 'Request'}
              </Text>
            </Pressable>
          ) : null}
        </View>}
      </Pressable>
    );
  };

  /** MAIN GROUPS SCREEN */
  const renderMainScreen = () => {
    const isCompact = width < 380;

    return (
      <View style={{ gap: 16 }}>
        {/* Header Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>Study Groups</Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>
              Focus rooms, peer accountability & exam prep circles
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              onPress={() => setActiveScreen('notifications')}
              accessibilityRole="button"
              accessibilityLabel={`Group notifications${unreadNotifCount ? `, ${unreadNotifCount} unread` : ''}`}
              style={[styles.iconBoxBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Bell size={17} color={theme.textPrimary} />
              {unreadNotifCount > 0 && (
                <View style={[styles.notifBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.notifBadgeText}>{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</Text>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={() => {
                setCreateStep(1);
                setShowCreateModal(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Create study group"
              style={[
                isCompact ? styles.iconBoxBtn : styles.primaryBtn,
                {
                  backgroundColor: theme.primary,
                  borderColor: theme.primary,
                  flexDirection: 'row',
                  gap: 5,
                  paddingHorizontal: isCompact ? 0 : 14,
                },
              ]}
            >
              <Plus size={15} color="#FFFFFF" />
              {!isCompact && <Text style={styles.primaryBtnText}>Create</Text>}
            </Pressable>
          </View>
        </View>

        {/* Search Input */}
        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Search size={16} color={theme.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search groups, exams (RAS, UPSC), subjects..."
            placeholderTextColor={theme.textMuted}
            style={{ flex: 1, fontSize: 13, color: theme.textPrimary, paddingVertical: 8 }}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={15} color={theme.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Category Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[
            { id: 'my_groups', label: 'My Groups' },
            { id: 'recommended', label: 'Recommended' },
          ].map((cat) => {
            const active = mainCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setMainCategory(cat.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[
                  styles.pillTab,
                  {
                    backgroundColor: active ? theme.primary : theme.surface,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#FFFFFF' : theme.textSecondary }}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {mainCategory === 'recommended' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[
              { id: 'recommended', label: 'For You' },
              { id: 'discover', label: 'Discover' },
              { id: 'live', label: 'Live Study' },
              { id: 'cam', label: 'Cam Study' },
            ].map((category) => {
              const active = recommendedCategory === category.id;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => setRecommendedCategory(category.id)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.pillTab,
                    {
                      backgroundColor: active ? theme.primary : theme.surface,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#FFFFFF' : theme.textSecondary }}>
                    {category.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {!groupMembershipsLoaded ? (
          <View style={{ padding: 28, alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color={theme.primary} />
            <Text style={{ color: theme.textSecondary }}>Loading your groups…</Text>
          </View>
        ) : groupMembershipLoadError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Groups could not be loaded"
            description={groupMembershipLoadError}
            primaryLabel="Retry"
            onPrimary={() => {
              setGroupMembershipsLoaded(false);
              setGroupMembershipLoadError(null);
              setGroupMembershipRetry((value) => value + 1);
            }}
            theme={theme}
          />
        ) : filteredGroups.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching groups found"
            description="Try a different search or explore another category—or create a dedicated circle."
            primaryLabel="Clear Search"
            onPrimary={() => setSearchQuery('')}
            secondaryLabel="Create This Group"
            onSecondary={() => setShowCreateModal(true)}
            theme={theme}
          />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{filteredGroups.map(renderGroupCard)}</View>
        )}
      </View>
    );
  };

  // --------------------------------------------------------------------------
  // 6. GROUP DETAIL SCREEN & 7 TABS
  // --------------------------------------------------------------------------
  const renderGroupDetail = () => {
    const tabs = [
      { id: 'live', label: 'Live Study', icon: Clock, badge: liveMemberCount },
      { id: 'chat', label: 'Chat', icon: MessageSquare, premium: !isPremium },
      { id: 'goals', label: 'Goals', icon: Target },
      { id: 'learn', label: 'Learn Together', icon: BookOpen },
      { id: 'events', label: 'Events', icon: Calendar },
      { id: 'members', label: 'Members', icon: Users },
      { id: 'insights', label: 'Insights', icon: BarChart3 },
    ];
    const sheetOptions = selectionSheet === 'learn-categories'
      ? LEARN_MODULE_OPTIONS
      : selectionSheet === 'learn-filters' || selectionSheet === 'learn-compose-subject'
        ? DOUBT_SUBJECT_OPTIONS
        : selectionSheet === 'members-categories'
            ? MEMBER_CATEGORY_OPTIONS
            : selectionSheet === 'members-filters'
              ? MEMBER_FILTER_OPTIONS
            : selectionSheet === 'leaderboard-categories'
              ? LEADERBOARD_CATEGORY_OPTIONS
              : INSIGHTS_CATEGORY_OPTIONS;
    const selectedSheetValues = selectionSheet === 'learn-categories'
      ? [learnModule]
      : selectionSheet === 'learn-filters'
        ? selectedDoubtSubjects
        : selectionSheet === 'learn-compose-subject'
          ? [doubtSubject]
          : selectionSheet === 'members-categories'
              ? [membersSubTab]
              : selectionSheet === 'members-filters'
                ? [memberFilter]
                : selectionSheet === 'leaderboard-categories'
                  ? [leaderboardCategory]
                  : [insightsSubTab];
    const sheetTitles: Record<SelectionSheetKind, string> = {
      'learn-categories': 'Learn Together',
      'learn-filters': 'Filter doubts by subject',
      'learn-compose-subject': 'Choose a subject',
      'members-categories': 'Group members',
      'members-filters': 'Filter members',
      'insights-categories': 'Group insights',
      'leaderboard-categories': 'Leaderboard ranking',
    };

    return (
      <View style={{ width: '100%', maxWidth: 1120, alignSelf: 'center', flex: 1 }}>
        <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              onPress={() => setActiveScreen('main')}
              accessibilityRole="button"
              accessibilityLabel="Back to all groups"
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -6 }}
            >
              <ChevronLeft size={20} color={theme.textSecondary} />
            </Pressable>
            <View style={[styles.heroAvatar, { backgroundColor: selectedGroup.accentHex, marginTop: 0, borderColor: theme.border }]}>
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>{selectedGroup.shortName}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '700', color: theme.textPrimary, flexShrink: 1 }}>
                  {selectedGroup.name}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {selectedGroup.membersCount !== undefined && <Text style={{ fontSize: 11, color: theme.textSecondary }}>{selectedGroup.membersCount}{selectedGroup.memberLimit !== undefined ? `/${selectedGroup.memberLimit}` : ''} members</Text>}
                <LiveStatusIndicator count={liveMemberCount} label="studying" theme={theme} />
                {selectedGroup.dataSource !== 'backend' && <Text style={{ fontSize: 11, color: theme.textMuted }}>{selectedGroup.exam}</Text>}
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Pressable
                onPress={() => setShowInviteModal(true)}
                accessibilityRole="button"
                style={[styles.smallPrimaryBtn, { backgroundColor: theme.primary }]}
              >
                <Share2 size={13} color="#FFFFFF" />
                <Text style={styles.smallPrimaryBtnText}>Invite</Text>
              </Pressable>
              <Pressable
                onPress={() => { setSettingsTab('general'); setShowSettingsModal(true); }}
                accessibilityRole="button"
                accessibilityLabel="Group settings"
                style={[styles.iconBoxBtn, { width: 40, height: 40, backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <Settings size={16} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginTop: 6, borderBottomWidth: 1, borderBottomColor: theme.border }}
          contentContainerStyle={{ gap: 4, minWidth: isTablet ? '100%' : undefined, justifyContent: 'space-between' }}
        >
          {tabs.map((t) => {
            const active = detailTab === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setDetailTab(t.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[
                  styles.detailTabBtn,
                  {
                    borderRadius: 0,
                    borderBottomWidth: 2,
                    borderBottomColor: active ? theme.primary : 'transparent',
                    paddingHorizontal: isTablet ? 12 : 9,
                    backgroundColor: 'transparent',
                  },
                ]}
              >
                <t.icon size={14} color={active ? theme.primary : theme.textSecondary} />
                <Text style={{ fontSize: 12, fontWeight: active ? '700' : '600', color: active ? theme.primary : theme.textSecondary }}>
                  {t.label}
                </Text>
                {t.badge ? (
                  <View style={[styles.tabCountBadge, { backgroundColor: theme.successSoft }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: theme.successText }}>{t.badge}</Text>
                  </View>
                ) : null}
                {t.premium && <Lock size={11} color={theme.premium} />}
              </Pressable>
            );
          })}
        </ScrollView>

        {detailTab === 'chat' ? (
          <View style={{ flex: 1, minHeight: 0, marginTop: 12, overflow: 'hidden' }}>
            {renderChatTab()}
          </View>
        ) : (
          <ScrollView
            key={detailTab}
            style={{ flex: 1, minHeight: 0, marginTop: 12 }}
            contentContainerStyle={{ gap: 12, paddingBottom: activeRoom ? 92 : 12 }}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
          >
            {detailTab === 'live' && renderLiveStudyTab()}
            {detailTab === 'goals' && renderGoalsTab()}
            {detailTab === 'learn' && renderLearnTogetherTab()}
            {detailTab === 'events' && renderEventsTab()}
            {detailTab === 'members' && renderMembersTab()}
            {detailTab === 'insights' && renderInsightsTab()}
          </ScrollView>
        )}
        {selectionSheet && (
          <SelectionSheet
            visible
            title={sheetTitles[selectionSheet]}
            options={sheetOptions}
            selectedValues={selectedSheetValues}
            multiple={selectionSheet === 'learn-filters'}
            onClose={() => setSelectionSheet(null)}
            onToggle={(value) => {
              if (selectionSheet === 'learn-categories') setLearnModule(value);
              else if (selectionSheet === 'learn-filters') {
                setSelectedDoubtSubjects((current) => current.includes(value)
                  ? current.filter((subject) => subject !== value)
                  : [...current, value]);
              } else if (selectionSheet === 'learn-compose-subject') setDoubtSubject(value);
              else if (selectionSheet === 'members-categories') setMembersSubTab(value);
              else if (selectionSheet === 'members-filters') setMemberFilter(value);
              else if (selectionSheet === 'leaderboard-categories') setLeaderboardCategory(value);
              else setInsightsSubTab(value);
              if (selectionSheet !== 'learn-filters') setSelectionSheet(null);
            }}
            onClear={selectionSheet === 'learn-filters'
              ? () => setSelectedDoubtSubjects([])
              : selectionSheet === 'members-filters'
                ? () => setMemberFilter('All')
                : undefined}
            theme={theme}
          />
        )}
      </View>
    );
  };

  const renderRoomSubjectSelector = () => (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>What are you studying?</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {ROOM_SUBJECTS.map((subject) => {
          const selected = roomSubject === subject;
          return (
            <Pressable
              key={subject}
              onPress={() => handleSubjectChange(subject)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.smallOutlineBtn, { minHeight: 44, paddingHorizontal: 12, backgroundColor: selected ? theme.primarySoft : theme.surface, borderColor: selected ? theme.primary : theme.border }]}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: selected ? theme.primaryText : theme.textSecondary }}>{subject}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderAmbientAudioControls = () => (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Ambient audio</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {AMBIENT_AUDIO_OPTIONS.map((option) => {
          const selected = roomAmbientAudio === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => void handleAmbientAudioChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.smallOutlineBtn, { minHeight: 44, flexGrow: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: selected ? theme.primarySoft : theme.surface, borderColor: selected ? theme.primary : theme.border }]}
            >
              {option.value === 'muted' ? <VolumeX size={14} color={selected ? theme.primaryText : theme.textSecondary} /> : <Volume2 size={14} color={selected ? theme.primaryText : theme.textSecondary} />}
              <Text style={{ fontSize: 12, fontWeight: '700', color: selected ? theme.primaryText : theme.textSecondary }}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {roomAudioError && <Text style={{ fontSize: 12, color: theme.danger }}>{roomAudioError}</Text>}
    </View>
  );

  /** TAB 1: SMART STUDY ROOMS + CAM STUDY */
  const renderLiveStudyTab = () => {
    const visibleRooms = STUDY_ROOMS.filter((room) => (
      liveRoomCategory === 'focus'
        ? !room.isCam
        : room.isCam
    ));
    const descriptions: Record<GroupRoomId, string> = {
      'silent-focus': 'A quiet room for individual focus. Chat stays off.',
      pomodoro: 'A shared focus and break lounge, synced with the group.',
      'exam-simulation': 'A distraction-free exam hall with a mock paper reference.',
      'desk-cam': 'Camera-off accountability. Desk video is not available yet.',
    };
    return (
      <View style={{ gap: 12 }}>
        <View style={[styles.spaceBetweenRowTight, { flexWrap: 'wrap', gap: 8 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Study rooms</Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>
              Four rooms for focused, distraction-free study.
            </Text>
          </View>
        </View>
        <SegmentedControl
          options={LIVE_CATEGORY_OPTIONS}
          selected={liveRoomCategory}
          onSelect={setLiveRoomCategory}
          theme={theme}
        />
        {roomJoinError && (
          <View style={{ padding: 12, borderRadius: 10, borderWidth: 1, borderColor: theme.danger, backgroundColor: theme.dangerSoft }}>
            <Text accessibilityRole="alert" style={{ fontSize: 12, lineHeight: 18, color: theme.danger }}>{roomJoinError}</Text>
          </View>
        )}
        <CategoryTransition key={liveRoomCategory}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {visibleRooms.map((room) => {
              const joined = activeRoom?.id === room.id;
              const roomCount = joined ? roomRealtime.participants.length : 0;
              const Icon = room.isCam
                ? VideoOff
                : room.id === 'exam-simulation'
                  ? FileText
                  : room.id === 'pomodoro'
                    ? Zap
                    : BookOpen;
              return (
                <View
                  key={room.id}
                  style={[
                    styles.card,
                    {
                      width: isTablet ? '48%' : '100%',
                      backgroundColor: theme.surface,
                      borderColor: joined ? theme.successBorder : theme.border,
                      gap: 12,
                    },
                  ]}
                >
                  <View style={[styles.spaceBetweenRowTight, { alignItems: 'flex-start' }]}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: room.isCam ? theme.tealSoft : theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={18} color={room.isCam ? theme.teal : theme.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{room.name}</Text>
                        <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 3 }}>{room.type}</Text>
                      </View>
                    </View>
                    {joined && <LiveStatusIndicator count={roomCount} label="live" theme={theme} />}
                  </View>
                  <Text style={{ fontSize: 12, lineHeight: 18, color: theme.textSecondary }}>{descriptions[room.id]}</Text>
                  <View style={[styles.spaceBetweenRowTight, { borderTopWidth: 1, borderTopColor: theme.borderSubtle, paddingTop: 10 }]}>
                    <Text style={{ flex: 1, fontSize: 11, color: theme.textMuted }}>
                      {joined ? `${roomCount} ${roomCount === 1 ? 'learner' : 'learners'} in this room` : 'Live members appear after you join'}
                    </Text>
                    <Pressable
                      onPress={() => joined ? setRoomMinimized(false) : handleJoinRoom(room)}
                      disabled={Boolean(joiningRoomId) || isLeavingRoom}
                      accessibilityRole="button"
                      accessibilityState={{ busy: joiningRoomId === room.id, disabled: Boolean(joiningRoomId) || isLeavingRoom }}
                      style={[
                        styles.smallOutlineBtn,
                        {
                          minHeight: 44,
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          borderColor: joined ? theme.successBorder : theme.primary + '55',
                          backgroundColor: joined ? theme.successSoft : theme.primarySoft,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          opacity: joiningRoomId && joiningRoomId !== room.id ? 0.55 : 1,
                        },
                      ]}
                    >
                      {joiningRoomId === room.id
                        ? <ActivityIndicator size="small" color={theme.primary} />
                        : joined
                          ? <Play size={14} color={theme.successText} />
                          : room.isCam
                            ? <Shield size={14} color={theme.primary} />
                            : <Play size={14} color={theme.primary} />}
                      <Text style={{ fontSize: 12, fontWeight: '700', color: joined ? theme.successText : theme.primaryText }}>
                        {joiningRoomId === room.id ? 'Joining…' : joined ? 'Return' : room.isCam ? 'Privacy & join' : 'Join room'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </CategoryTransition>
      </View>
    );
  };

  /** TAB 3: GROUP CHAT (PREMIUM FEATURE) */
  const renderChatTab = () => {
    if (!isPremium) {
      return (
        <View style={{ gap: 12 }}>
          <PremiumFeatureCard
            featureName="Structured Group Chat"
            benefits={[
              '6 dedicated exam channels (#doubt-corner, #pyq-discussion, #study-resources, #announcements)',
              'Threaded discussions, quick study polls, pinned mentor notes, and PDF sharing',
              'Free users retain full access to Doubt Board, Live Study Rooms, PYQs, and Safety Reporting',
            ]}
            onUpgrade={() => {
              setIsPremium(true);
              showToast('Switched to Study Sakha Plus preview!');
            }}
            theme={theme}
          />
        </View>
      );
    }

    const channelMsgs = messagesByChannel[activeChannel] || [];
    const currentChan = CHAT_CHANNELS.find((c) => c.id === activeChannel);

    return (
      <View style={[styles.card, { flex: 1, minHeight: 0, backgroundColor: theme.surface, borderColor: theme.border, padding: 0, overflow: 'hidden', flexDirection: isTablet ? 'row' : 'column' }]}>
        {isTablet ? (
          <View style={{ width: 224, padding: 10, borderRightWidth: 1, borderRightColor: theme.border }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: theme.textMuted, marginHorizontal: 6, marginBottom: 8, letterSpacing: 0.6 }}>CHANNELS</Text>
            {CHAT_CHANNELS.map((c) => {
              const active = activeChannel === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => { setActiveChannel(c.id); setThreadMessage(null); }}
                  style={{
                    minHeight: 40,
                    paddingHorizontal: 8,
                    marginBottom: 4,
                    borderRadius: 10,
                    backgroundColor: active ? theme.primarySoft : 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Hash size={12} color={active ? theme.primary : theme.textSecondary} />
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 11, fontWeight: active ? '700' : '600', color: active ? theme.primaryText : theme.textSecondary }}>{c.name}</Text>
                  {c.unread > 0 && <Text style={{ fontSize: 10, fontWeight: '700', color: theme.primary }}>{c.unread}</Text>}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, borderBottomWidth: 1, borderBottomColor: theme.border, padding: 10 }} contentContainerStyle={{ gap: 6 }}>
            {CHAT_CHANNELS.map((c) => {
              const active = activeChannel === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => { setActiveChannel(c.id); setThreadMessage(null); }}
                  style={[styles.miniChip, { backgroundColor: active ? theme.primary : theme.surfaceElevated, borderColor: active ? theme.primary : theme.border, flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                >
                  <Hash size={12} color={active ? '#FFFFFF' : theme.textSecondary} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: active ? '#FFFFFF' : theme.textPrimary }}>{c.name}</Text>
                  {c.unread > 0 && <Text style={{ fontSize: 10, fontWeight: '700', color: active ? '#FFFFFF' : theme.primary }}>{c.unread}</Text>}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        <View style={[styles.spaceBetweenRowTight, { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.borderSubtle }]}>
          <View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }}># {activeChannel}</Text>
            <Text style={{ fontSize: 10, color: theme.textSecondary }}>{currentChan?.desc}</Text>
          </View>
          <Text style={{ fontSize: 10, color: theme.textMuted }}>{channelMsgs.length} messages</Text>
        </View>
        {/* Messages */}
        <ScrollView
          style={{ flex: 1, minHeight: 0 }}
          contentContainerStyle={{ padding: 14, gap: 14 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
        >
          {channelMsgs.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title={`No messages in #${activeChannel} yet`}
              description="Start a focused discussion, share a PYQ trick, or drop a revision poll."
              theme={theme}
            />
          ) : (
            channelMsgs.map((m) => (
              <View key={m.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <MemberAvatar
                  initials={m.initials}
                  size="sm"
                  status="none"
                  accent={m.role === 'Mentor' ? '#0D9488' : '#2563EB'}
                  theme={theme}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>{m.sender}</Text>
                    {m.role !== 'Member' && (() => {
                      const roleColors: Record<string, { bg: string; fg: string }> = {
                        Owner: { bg: '#EEF2FF', fg: '#4338CA' },
                        Mentor: { bg: theme.successSoft, fg: theme.successText },
                        Admin: { bg: theme.warningSoft, fg: theme.warning },
                        Moderator: { bg: theme.premiumSoft, fg: theme.premium },
                      };
                      const colors = roleColors[m.role] || { bg: theme.surfaceElevated, fg: theme.textSecondary };
                      return <View style={[styles.tagChip, { backgroundColor: colors.bg }]}><Text style={{ fontSize: 10, fontWeight: '700', color: colors.fg }}>{m.role}</Text></View>;
                    })()}
                    <Text style={{ fontSize: 11, color: theme.textMuted }}>{m.time}</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: theme.textPrimary, marginTop: 4, lineHeight: 19 }}>
                    {m.text}
                  </Text>

                  {m.attachment && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 8,
                        padding: 10,
                        borderRadius: 10,
                        backgroundColor: theme.surfaceElevated,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: theme.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={16} color={theme.danger} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '600', color: theme.textPrimary }}>
                          {m.attachment.name}
                        </Text>
                        <Text style={{ fontSize: 10, color: theme.textSecondary }}>{m.attachment.size} · 8 pages</Text>
                      </View>
                      <Pressable onPress={() => showToast(`Previewing ${m.attachment?.name}`)} accessibilityLabel="Preview attachment" style={styles.iconBtn}><Eye size={15} color={theme.textSecondary} /></Pressable>
                      <Pressable
                        onPress={() => {
                          const attachment = m.attachment;
                          if (!attachment) return;
                          setResources((prev) => prev.some((resource) => resource.id === `chat-${m.id}`)
                            ? prev
                            : [...prev, { id: `chat-${m.id}`, title: attachment.name, type: 'PDF', subject: selectedGroup.subject, size: attachment.size, uploader: m.sender, bookmarked: true }]);
                          showToast('Saved to group resources.');
                        }}
                        accessibilityLabel="Save attachment to resources"
                        style={styles.iconBtn}
                      >
                        <Bookmark size={15} color={theme.textSecondary} />
                      </Pressable>
                      <Pressable onPress={() => showToast('Download started.')} accessibilityLabel="Download attachment" style={styles.iconBtn}><Download size={15} color={theme.textSecondary} /></Pressable>
                    </View>
                  )}

                  {m.poll && (
                    <View
                      style={{
                        marginTop: 8,
                        padding: 10,
                        borderRadius: 12,
                        backgroundColor: theme.surfaceElevated,
                        borderWidth: 1,
                        borderColor: theme.border,
                        gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>
                        {m.poll.question}
                      </Text>
                      <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                        {m.poll.options.reduce((total, option) => total + option.votes, 0)} votes · Ends in 4h
                      </Text>
                      {m.poll.options.map((opt) => {
                        const total = m.poll!.options.reduce((s, o) => s + o.votes, 0);
                        const pct = Math.round((opt.votes / Math.max(1, total)) * 100);
                        const picked = m.poll!.votedId === opt.id;
                        return (
                          <Pressable
                            key={opt.id}
                            onPress={() => handlePollVote(activeChannel, m.id, opt.id)}
                            style={{ minHeight: 36, position: 'relative', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: picked ? theme.primary : theme.border, backgroundColor: theme.surface }}
                          >
                            <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, backgroundColor: picked ? theme.primarySoft : theme.surfaceElevated, opacity: 0.8 }} />
                            <Text style={{ fontSize: 11, fontWeight: picked ? '700' : '500', color: theme.textPrimary, flex: 1 }}>{opt.label}</Text>
                            {picked && <Check size={12} color={theme.primary} />}
                            <Text style={[styles.tabularText, { fontSize: 11, fontWeight: '700', color: theme.primary }]}>
                              {pct}%
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
                    {m.reactions.map((r, i) => (
                      <Pressable key={i} onPress={() => toggleMessageReaction(activeChannel, m.id, i)} style={[styles.tagChip, { backgroundColor: r.reacted ? theme.primarySoft : theme.surfaceElevated }]}>
                        <Text style={{ fontSize: 11, color: r.reacted ? theme.primaryText : theme.textPrimary }}>
                          {r.emoji} {r.count}
                        </Text>
                      </Pressable>
                    ))}
                    <Pressable onPress={() => setThreadMessage(m)}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: theme.primary }}>
                        {m.replies > 0 ? `${m.replies} replies` : 'Reply'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => showToast('Message reported to Group Moderators (Free safety tool).')}
                      accessibilityRole="button"
                      accessibilityLabel="Report message"
                      style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', padding: 6 }}
                    >
                      <Flag size={13} color={theme.textMuted} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {threadMessage && (
          <View style={[styles.spaceBetweenRowTight, { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: theme.primarySoft }]}>
            <Text numberOfLines={1} style={{ fontSize: 11, color: theme.primaryText, flex: 1 }}>
              Replying to {threadMessage.sender}: {threadMessage.text}
            </Text>
            <Pressable onPress={() => setThreadMessage(null)}>
              <X size={14} color={theme.primaryText} />
            </Pressable>
          </View>
        )}

        {/* Composer */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, paddingBottom: 10 + (Platform.OS === 'web' || !isTablet ? 0 : Math.min(insets.bottom, 12)), borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface }}>
          <Pressable onPress={() => showToast('Native PDF / Image picker ready.')} style={styles.iconBtn}>
            <Paperclip size={18} color={theme.textSecondary} />
          </Pressable>
          <TextInput
            editable={!currentChan?.lockedWrite}
            value={chatInput}
            onChangeText={setChatInput}
            onSubmitEditing={handleSendMessage}
            placeholder={
              currentChan?.lockedWrite ? 'Admins & Mentors only' : `Message #${activeChannel}...`
            }
            placeholderTextColor={theme.textMuted}
            style={[
              styles.input,
              { flex: 1, backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary },
            ]}
          />
          <Pressable
            disabled={currentChan?.lockedWrite}
            onPress={handleSendMessage}
            style={[styles.iconBoxBtn, { backgroundColor: theme.primary, borderColor: theme.primary, opacity: currentChan?.lockedWrite ? 0.4 : 1 }]}
          >
            <Send size={15} color="#FFFFFF" />
          </Pressable>
        </View>
        </View>
      </View>
    );
  };

  /** TAB 4: GROUP GOALS & MISSIONS */
  const renderGoalsTab = () => {
    const filteredGoals = goals.filter((g) => g.timeframe === goalTimeframe);
    const activeGoal = filteredGoals[0];
    const activeGoalPct = activeGoal ? Math.min(100, Math.round((activeGoal.current / activeGoal.target) * 100)) : 0;
    const contributionPct = activeGoal ? Math.min(100, Math.round((activeGoal.userContribution / activeGoal.userTarget) * 100)) : 0;
    const completedPledges = dailyPledge.filter((pledge) => pledge.done).length;
    return (
      <View style={{ gap: 12 }}>
        <SegmentedControl
          options={[
            { value: 'Daily', label: 'Daily' },
            { value: 'Weekly', label: 'Weekly' },
            { value: 'Monthly', label: 'Monthly' },
            { value: 'Custom Missions', label: 'Custom', accessibilityLabel: 'Custom Missions' },
          ]}
          selected={goalTimeframe}
          onSelect={setGoalTimeframe}
          theme={theme}
        />

        <CategoryTransition key={goalTimeframe}>
        <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {activeGoal && (
            <View style={[styles.card, { width: isTablet ? '48%' : '100%', backgroundColor: theme.surface, borderColor: theme.border, gap: 10 }]}>
              <View style={styles.spaceBetweenRowTight}>
                <View style={[styles.badgePill, { backgroundColor: theme.primarySoft }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: theme.primaryText }}>{activeGoal.type} · {goalTimeframe}</Text>
                </View>
                <Text style={[styles.tabularText, { fontSize: 24, fontWeight: '800', color: theme.primary }]}>{activeGoalPct}%</Text>
              </View>
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{activeGoal.title}</Text>
              <View style={[styles.progressTrack, { backgroundColor: theme.surfaceElevated, height: 9 }]}>
                <View style={[styles.progressFill, { width: `${activeGoalPct}%`, backgroundColor: theme.primary }]} />
              </View>
              <View style={styles.spaceBetweenRow}>
                <Text style={[styles.tabularText, { fontSize: 12, fontWeight: '700', color: theme.textSecondary }]}>
                  {activeGoal.current} / {activeGoal.target} {activeGoal.unit}
                </Text>
                <Text style={{ fontSize: 11, color: theme.textMuted }}>Due: {activeGoal.deadline}</Text>
              </View>
              <View style={{ borderTopWidth: 1, borderTopColor: theme.borderSubtle, paddingTop: 9, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {([] as GroupMemberRecord[]).slice(0, 3).map((member, index) => (
                      <View key={member.id} style={{ marginLeft: index ? -7 : 0, zIndex: 3 - index }}>
                        <MemberAvatar initials={member.initials} size="sm" status="none" theme={theme} />
                      </View>
                    ))}
                  </View>
                  <Text style={{ flex: 1, fontSize: 11, color: theme.textSecondary }}>Top contributors today</Text>
                  <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    const increment = activeGoal.unit === 'hrs' ? 0.5 : 1;
                    setGoals((prev) => prev.map((item) => item.id === activeGoal.id
                      ? { ...item, current: item.current + increment, userContribution: Number((item.userContribution + increment).toFixed(1)) }
                      : item));
                    showToast(`Progress logged toward "${activeGoal.title}".`);
                  }}
                  style={[styles.smallOutlineBtn, { alignSelf: 'flex-start', minHeight: 36, paddingVertical: 5, borderColor: theme.primary + '55', backgroundColor: theme.primarySoft }]}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.primaryText }}>
                    + Log {activeGoal.unit === 'hrs' ? '+0.5h' : `+1 ${activeGoal.unit}`}
                  </Text>
                </Pressable>
                </View>
              </View>
            </View>
          )}

          <View style={[styles.card, { width: isTablet ? '48%' : '100%', backgroundColor: theme.surface, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }]}>
            <View style={{ flex: 1, gap: 8 }}>
              <View style={[styles.badgePill, { alignSelf: 'flex-start', backgroundColor: theme.warningSoft }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: theme.warning }}>🔥 19-Day Streak</Text>
              </View>
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Your Contribution</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: theme.textPrimary }}>
                {activeGoal?.userContribution ?? 0} <Text style={{ fontSize: 12, fontWeight: '500', color: theme.textMuted }}>/ {activeGoal?.userTarget ?? 0} {activeGoal?.unit}</Text>
              </Text>
              <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                {activeGoal ? `${Math.max(0, activeGoal.userTarget - activeGoal.userContribution)} ${activeGoal.unit} left to hit your target` : 'No goals for this timeframe'}
              </Text>
            </View>
            <View style={{ width: 82, height: 82, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={82} height={82} viewBox="0 0 82 82" style={{ position: 'absolute' }}>
                <Circle cx="41" cy="41" r="34" fill="none" stroke={theme.surfaceElevated} strokeWidth="8" />
                <Circle
                  cx="41" cy="41" r="34" fill="none" stroke={theme.primary} strokeWidth="8"
                  strokeDasharray={`${(213.63 * contributionPct) / 100} 213.63`}
                  strokeLinecap="round" rotation="-90" origin="41, 41"
                />
              </Svg>
              <Text style={{ fontSize: 15, fontWeight: '800', color: theme.textPrimary }}>{contributionPct}%</Text>
            </View>
          </View>
        </View>

        {filteredGoals.slice(1).map((g) => {
          const pct = Math.min(100, Math.round((g.current / g.target) * 100));
          return (
            <View key={g.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.spaceBetweenRowTight}>
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{g.title}</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: theme.primary }}>{pct}%</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: theme.surfaceElevated, height: 8, marginTop: 10 }]}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: theme.primary }]} />
              </View>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 8 }}>{g.current} / {g.target} {g.unit} · Due {g.deadline}</Text>
            </View>
          );
        })}
        </View>
        </CategoryTransition>

        {/* Daily Commitment Checklist */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, gap: 8 }]}>
          <View style={[styles.spaceBetweenRowTight, { marginBottom: 4 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <CheckSquare size={16} color={theme.teal} />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>My Daily Commitment</Text>
            </View>
            <Text style={{ fontSize: 11, color: theme.textSecondary }}>{completedPledges}/{dailyPledge.length} completed</Text>
          </View>
          {dailyPledge.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                setDailyPledge((prev) => prev.map((p) => (p.id === item.id ? { ...p, done: !p.done } : p)));
                showToast('Daily commitment updated!');
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                padding: 11,
                borderRadius: 12,
                backgroundColor: item.done ? theme.successSoft : theme.surfaceElevated,
                borderWidth: 1,
                borderColor: item.done ? theme.successBorder : theme.border,
              }}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  backgroundColor: item.done ? theme.successText : 'transparent',
                  borderWidth: item.done ? 0 : 1.5,
                  borderColor: theme.textMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {item.done && <Check size={12} color="#FFFFFF" />}
              </View>
              <Text
                style={{
                  fontSize: 13,
                  color: theme.textPrimary,
                  textDecorationLine: item.done ? 'line-through' : 'none',
                  opacity: item.done ? 0.7 : 1,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
            <TextInput
              value={newPledge}
              onChangeText={setNewPledge}
              onSubmitEditing={() => {
                const label = newPledge.trim();
                if (!label) return;
                setDailyPledge((prev) => [...prev, { id: `p-${Date.now()}`, label, done: false }]);
                setNewPledge('');
                showToast('Daily commitment added.');
              }}
              placeholder="Add a new daily study commitment..."
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { flex: 1, backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
            />
            <Pressable
              onPress={() => {
                const label = newPledge.trim();
                if (!label) return;
                setDailyPledge((prev) => [...prev, { id: `p-${Date.now()}`, label, done: false }]);
                setNewPledge('');
                showToast('Daily commitment added.');
              }}
              style={[styles.smallPrimaryBtn, { backgroundColor: theme.primary }]}
            >
              <Plus size={14} color="#FFFFFF" />
              <Text style={styles.smallPrimaryBtnText}>Add</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  /** TAB 5: LEARN TOGETHER (6 MODULES) */
  const renderLearnTogetherTab = () => {
    const visibleDoubts = doubts.filter((doubt) => (
      (doubtFilter === 'All' || doubt.status === doubtFilter)
      && (selectedDoubtSubjects.length === 0 || selectedDoubtSubjects.includes(doubt.subject))
    ));
    const currentModule = LEARN_MODULE_OPTIONS.find((module) => module.value === learnModule);
    return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <CategoryMenuButton
          label={currentModule?.label || 'Doubt Board'}
          onPress={() => setSelectionSheet('learn-categories')}
          theme={theme}
        />
        {learnModule === 'doubts' && (
          <FilterButton
            count={selectedDoubtSubjects.length}
            onPress={() => setSelectionSheet('learn-filters')}
            theme={theme}
          />
        )}
      </View>

      <CategoryTransition key={learnModule}>
      <View style={{ gap: 12 }}>
      {/* A. Doubt Board */}
      {learnModule === 'doubts' && (
        <View style={{ gap: 12 }}>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, gap: 8 }]}>
            <Pressable
              onPress={() => setSelectionSheet('learn-compose-subject')}
              accessibilityRole="button"
              accessibilityLabel={`Choose doubt subject, currently ${doubtSubject}`}
              style={{ alignSelf: 'flex-start', minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, borderRadius: 9, backgroundColor: theme.surfaceElevated }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary }}>Post under</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primaryText }}>{doubtSubject}</Text>
              <ChevronDown size={14} color={theme.textSecondary} />
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              value={newDoubtTitle}
              onChangeText={setNewDoubtTitle}
              placeholder="Ask a subject doubt (e.g., Art. 356 vs 365)..."
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { flex: 1, backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
            />
            <Pressable onPress={() => showToast('Attach an image or PDF to your doubt.')} style={[styles.iconBoxBtn, { width: 40, height: 40, backgroundColor: theme.surfaceElevated, borderColor: theme.border }]} accessibilityLabel="Attach doubt image or PDF">
              <Paperclip size={15} color={theme.textSecondary} />
            </Pressable>
            <Pressable
              onPress={() => {
                if (!newDoubtTitle.trim()) return;
                setDoubts((prev) => [
                  {
                    id: `d-${Date.now()}`,
                    isDoubtOfDay: false,
                    status: 'Unsolved',
                    subject: doubtSubject,
                    topic: 'New Query',
                    title: newDoubtTitle.trim(),
                    body: 'Posted from Doubt Board. Peers & Mentors can answer below.',
                    author: 'You (Aarav)',
                    time: 'Just now',
                    votes: 1,
                    voted: true,
                    bestAnswer: null,
                    answersCount: 0,
                  },
                  ...prev,
                ]);
                setNewDoubtTitle('');
                showToast('Doubt posted!');
              }}
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.primaryBtnText}>Ask Doubt</Text>
            </Pressable>
            </View>
          </View>

          <View style={styles.spaceBetweenRowTight}>
            <View style={{ width: 220, maxWidth: '75%' }}>
              <SegmentedControl
                options={[
                  { value: 'All', label: 'All' },
                  { value: 'Unsolved', label: 'Unsolved' },
                  { value: 'Solved', label: 'Solved' },
                ]}
                selected={doubtFilter}
                onSelect={(value) => {
                  if (value === 'All' || value === 'Unsolved' || value === 'Solved') setDoubtFilter(value);
                }}
                theme={theme}
              />
            </View>
            <Text style={{ fontSize: 10, color: theme.textMuted }}>{visibleDoubts.length} threads</Text>
          </View>

          {visibleDoubts.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No doubts match these filters"
              description="Clear the subject or status filters to see more discussions."
              primaryLabel="Clear Filters"
              onPrimary={() => {
                setSelectedDoubtSubjects([]);
                setDoubtFilter('All');
              }}
              theme={theme}
            />
          ) : visibleDoubts.map((d) => (
            <View key={d.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.rowWrapGap8}>
                {d.isDoubtOfDay && (
                  <View style={[styles.badgePill, { backgroundColor: theme.warningSoft }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: theme.warning }}>★ Doubt of the Day</Text>
                  </View>
                )}
                <View style={[styles.badgePill, { backgroundColor: d.status === 'Solved' ? theme.successSoft : theme.surfaceElevated }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: d.status === 'Solved' ? theme.successText : theme.textSecondary }}>
                    {d.status}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: theme.primary }}>
                  {d.subject} · {d.topic}
                </Text>
              </View>
              <Text style={[styles.cardTitle, { color: theme.textPrimary, marginTop: 8 }]}>{d.title}</Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4, lineHeight: 18 }}>{d.body}</Text>
              {d.bestAnswer && (
                <View style={{ marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: theme.successSoft, borderWidth: 1, borderColor: theme.successBorder }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.successText, marginBottom: 4 }}>
                    ✓ Best Answer · {d.bestAnswer.author}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textPrimary, lineHeight: 18 }}>{d.bestAnswer.text}</Text>
                </View>
              )}
              {answeringDoubtId === d.id && (
                <View style={{ marginTop: 10, gap: 8 }}>
                  <TextInput
                    multiline
                    value={answerDrafts[d.id] || ''}
                    onChangeText={(text) => setAnswerDrafts((prev) => ({ ...prev, [d.id]: text }))}
                    placeholder="Write an exam-focused answer..."
                    placeholderTextColor={theme.textMuted}
                    style={[styles.input, { minHeight: 76, textAlignVertical: 'top', backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                    <Pressable onPress={() => setAnsweringDoubtId(null)} style={[styles.smallOutlineBtn, { borderColor: theme.border, backgroundColor: theme.surfaceElevated }]}>
                      <Text style={{ fontSize: 11, color: theme.textSecondary }}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        const answer = (answerDrafts[d.id] || '').trim();
                        if (!answer) return;
                        setDoubts((prev) => prev.map((item) => item.id === d.id ? { ...item, status: 'Solved', bestAnswer: { author: 'You (Aarav)', text: answer }, answersCount: item.answersCount + 1 } : item));
                        setAnswerDrafts((prev) => ({ ...prev, [d.id]: '' }));
                        setAnsweringDoubtId(null);
                        showToast('Answer posted and doubt marked solved.');
                      }}
                      style={[styles.smallPrimaryBtn, { backgroundColor: theme.primary }]}
                    >
                      <Text style={styles.smallPrimaryBtnText}>Post Answer</Text>
                    </Pressable>
                  </View>
                </View>
              )}
              <View style={[styles.spaceBetweenRow, { marginTop: 10 }]}>
                <Text style={{ fontSize: 11, color: theme.textMuted }}>{d.author} · {d.time}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {d.status === 'Unsolved' && <Pressable onPress={() => setAnsweringDoubtId(answeringDoubtId === d.id ? null : d.id)} style={[styles.smallOutlineBtn, { minHeight: 34, paddingVertical: 4, borderColor: theme.primary + '55', backgroundColor: theme.primarySoft }]}><Text style={{ fontSize: 10, fontWeight: '700', color: theme.primaryText }}>Write Answer</Text></Pressable>}
                  <Pressable
                    onPress={() => setDoubts((prev) => prev.map((item) => item.id === d.id ? { ...item, voted: !item.voted, votes: item.voted ? item.votes - 1 : item.votes + 1 } : item))}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: d.voted ? theme.primarySoft : theme.surfaceElevated }}
                  >
                    <ThumbsUp size={13} color={d.voted ? theme.primary : theme.textSecondary} />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: d.voted ? theme.primary : theme.textSecondary }}>Helpful ({d.votes})</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* B. PYQ Discussion */}
      {learnModule === 'pyqs' && (
        <View style={{ gap: 12 }}>
          {PYQ_LIST.map((q) => {
            const picked = pyqSelections[q.id];
            return (
              <View key={q.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.spaceBetweenRowTight}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primary }}>
                    {q.examYear} · {q.subject}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>{q.memberNotesCount} notes</Text>
                </View>
                <Text style={[styles.cardTitle, { color: theme.textPrimary, marginTop: 8, lineHeight: 20 }]}>
                  {q.question}
                </Text>
                <View style={{ gap: 8, marginTop: 10 }}>
                  {q.options.map((opt, idx) => {
                    const isPicked = picked === idx;
                    const isCorrect = idx === q.correctIndex;
                    let bg = theme.surfaceElevated;
                    let bd = theme.border;
                    if (picked !== undefined) {
                      if (isCorrect) { bg = theme.successSoft; bd = theme.successBorder; }
                      else if (isPicked) { bg = theme.dangerSoft; bd = theme.danger; }
                    }
                    return (
                      <Pressable
                        key={idx}
                        onPress={() => setPyqSelections((prev) => ({ ...prev, [q.id]: idx }))}
                        style={{ padding: 11, borderRadius: 10, backgroundColor: bg, borderWidth: 1, borderColor: bd }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textPrimary }}>
                          {String.fromCharCode(65 + idx)}. {opt}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {picked !== undefined && (
                  <View style={{ marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: theme.primarySoft }}>
                    <Text style={{ fontSize: 12, color: theme.textPrimary, lineHeight: 18 }}>
                      <Text style={{ fontWeight: '700', color: theme.primaryText }}>Explanation: </Text>
                      {q.explanation}
                    </Text>
                  </View>
                )}
              </View>
              );
          })}
        </View>
      )}

      {/* C. Shared Resources */}
      {learnModule === 'resources' && (
        <View style={{ gap: 10 }}>
          {resources.map((r) => (
            <View key={r.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={18} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: theme.tealText }}>{r.type} · {r.subject}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary, marginTop: 2 }}>{r.title}</Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>{r.size} · {r.uploader}</Text>
              </View>
              <Pressable
                onPress={() =>
                  setResources((prev) => prev.map((item) => (item.id === r.id ? { ...item, bookmarked: !item.bookmarked } : item)))
                }
                style={[styles.iconBoxBtn, { backgroundColor: r.bookmarked ? theme.primarySoft : theme.surfaceElevated, borderColor: theme.border }]}
              >
                <Bookmark size={16} color={r.bookmarked ? theme.primary : theme.textSecondary} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {selectedGroup.dataSource === 'backend' && ['quiz', 'flashcards', 'answer'].includes(learnModule) && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, padding: 18 }]}>
          <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '700' }}>No verified group content yet</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 6 }}>This section will show content only after it is retrieved from the group backend.</Text>
        </View>
      )}

      {/* D. Group Quiz Battle */}
      {learnModule === 'quiz' && selectedGroup.dataSource !== 'backend' && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, gap: 12 }]}>
          <View style={styles.spaceBetweenRowTight}>
            <View>
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.teal }}>LIVE TWO-GROUP CHALLENGE</Text>
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>RAS Mains vs. Jodhpur Achievers</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <View style={[styles.tagChip, { backgroundColor: theme.primarySoft }]}>
                <Text style={[styles.tabularText, { fontSize: 11, fontWeight: '700', color: theme.primaryText }]}>
                  Us: {quizAnswer === 2 ? '440' : '420'}
                </Text>
              </View>
              <View style={[styles.tagChip, { backgroundColor: theme.surfaceElevated }]}>
                <Text style={[styles.tabularText, { fontSize: 11, fontWeight: '700', color: theme.textSecondary }]}>
                  Rivals: 415
                </Text>
              </View>
            </View>
          </View>
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textPrimary, lineHeight: 20 }}>
            Which committee recommended the three-tier Panchayati Raj system inaugurated in Nagaur, Rajasthan on Oct 2, 1959?
          </Text>
          <View style={{ gap: 8 }}>
            {['Ashok Mehta Committee', 'L.M. Singhvi Committee', 'Balwant Rai Mehta Committee', 'G.V.K. Rao Committee'].map((opt, idx) => (
              <Pressable
                key={idx}
                onPress={() => {
                  setQuizAnswer(idx);
                  showToast(idx === 2 ? '+20 pts! Fast & accurate answer.' : 'Recorded! Review explanation.');
                }}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: quizAnswer === idx ? (idx === 2 ? theme.successBorder : theme.danger) : theme.border,
                  backgroundColor: quizAnswer === idx ? (idx === 2 ? theme.successSoft : theme.dangerSoft) : theme.surfaceElevated,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textPrimary }}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* E. Shared Flashcards */}
      {learnModule === 'flashcards' && selectedGroup.dataSource !== 'backend' && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, alignItems: 'center', gap: 12 }]}>
          <View style={[styles.spaceBetweenRowTight, { width: '100%' }]}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary }}>
              {FLASHCARD_DECK[flashcardIdx].subject} Deck
            </Text>
            <Text style={[styles.tabularText, { fontSize: 12, color: theme.textMuted }]}>
              {flashcardIdx + 1} / {FLASHCARD_DECK.length}
            </Text>
          </View>
          <Pressable
            onPress={() => setFlashcardFlipped(!flashcardFlipped)}
            style={{
              width: '100%',
              minHeight: 150,
              padding: 18,
              borderRadius: 16,
              backgroundColor: theme.surfaceElevated,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.primary, marginBottom: 8 }}>
              {flashcardFlipped ? 'REVISION ANSWER' : 'TAP TO FLIP'}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textPrimary, textAlign: 'center', lineHeight: 21 }}>
              {flashcardFlipped ? FLASHCARD_DECK[flashcardIdx].back : FLASHCARD_DECK[flashcardIdx].front}
            </Text>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['Again', 'Good', 'Easy'].map((r) => (
              <Pressable
                key={r}
                onPress={() => {
                  setFlashcardFlipped(false);
                  setFlashcardIdx((prev) => (prev + 1) % FLASHCARD_DECK.length);
                  showToast(`Marked "${r}" — spaced repetition updated.`);
                }}
                style={[styles.secondaryBtn, { backgroundColor: theme.surfaceElevated }]}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>{r}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* F. Answer Writing */}
      {learnModule === 'answer' && selectedGroup.dataSource !== 'backend' && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, gap: 12 }]}>
          <View style={[styles.badgePill, { backgroundColor: theme.primarySoft, alignSelf: 'flex-start' }]}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.primaryText }}>
              RAS Mains Paper-I · 100 Words · 10 Marks
            </Text>
          </View>
          <Text style={[styles.cardTitle, { color: theme.textPrimary, lineHeight: 21 }]}>
            Evaluate the role of Prajamandal movements in fostering political awakening in Mewar and Marwar.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => showToast('Camera / PDF answer sheet upload ready.')}
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.primaryBtnText}>Submit Answer Sheet</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowModelAnswer(!showModelAnswer)}
              style={[styles.secondaryBtn, { backgroundColor: theme.surfaceElevated }]}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.tealText }}>
                {showModelAnswer ? 'Hide Model' : 'Model Structure'}
              </Text>
            </Pressable>
          </View>
          {showModelAnswer && (
            <View style={{ padding: 12, borderRadius: 12, backgroundColor: theme.surfaceElevated }}>
              <Text style={{ fontSize: 12, color: theme.textPrimary, lineHeight: 19 }}>
                Intro (15w): Define Prajamandals (1930s–40s) for responsible government. Body (70w): Mewar (Manikyalal Verma, 1938) & Marwar (Jai Narayan Vyas, 1934). Conclusion (15w): Foundation for Rajasthan’s integration (1948–56).
              </Text>
            </View>
          )}
        </View>
      )}
      </View>
      </CategoryTransition>
    </View>
    );
  };

  /** TAB 6: EVENTS & CALENDAR */
  const renderEventsTab = () => {
    const visibleEvents = events.filter((e) => (eventView === 'past' ? e.isPast : !e.isPast));
    return (
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <SegmentedControl
              options={[
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'calendar', label: 'Calendar' },
                { value: 'past', label: 'Past' },
              ]}
              selected={eventView}
              onSelect={(value) => {
                if (value === 'upcoming' || value === 'calendar' || value === 'past') setEventView(value);
              }}
              theme={theme}
            />
          </View>
          <Pressable
            onPress={() => showToast('Event scheduler sheet ready.')}
            style={[styles.smallPrimaryBtn, { backgroundColor: theme.primary }]}
          >
            <Plus size={13} color="#FFFFFF" />
            <Text style={styles.smallPrimaryBtnText}>New Event</Text>
          </Pressable>
        </View>

        <CategoryTransition key={eventView}>
        <View style={{ gap: 12 }}>
        {eventView === 'calendar' && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary, marginBottom: 10 }]}>November 2026</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
                const hasEv = [16, 20, 22, 24].includes(day);
                const isToday = day === 19;
                return (
                  <View
                    key={day}
                    style={{
                      width: '14.28%',
                      alignItems: 'center',
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: isToday ? theme.primary : hasEv ? theme.tealSoft : 'transparent',
                    }}
                  >
                    <Text
                      style={[
                        styles.tabularText,
                        {
                          fontSize: 12,
                          fontWeight: isToday || hasEv ? '700' : '500',
                          color: isToday ? '#FFFFFF' : hasEv ? theme.tealText : theme.textSecondary,
                        },
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {visibleEvents.map((ev) => (
          <View key={ev.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, borderLeftWidth: !ev.isPast && eventView === 'upcoming' && visibleEvents.find((item) => !item.isPast)?.id === ev.id ? 4 : 1, borderLeftColor: theme.primary, gap: 10 }]}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: theme.primaryText }}>{ev.month}</Text>
                <Text style={[styles.tabularText, { fontSize: 17, fontWeight: '800', color: theme.textPrimary }]}>{ev.dayNum}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: theme.primaryText }}>
                  {ev.type} · {ev.countdown}
                </Text>
                <Text style={[styles.cardTitle, { color: theme.textPrimary, marginTop: 2 }]}>{ev.title}</Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>{ev.time}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>{ev.description}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.progressTrack, { flex: 1, backgroundColor: theme.surfaceElevated }]}>
                <View style={[styles.progressFill, { width: `${Math.min(100, (ev.goingCount / ev.limit) * 100)}%`, backgroundColor: theme.successText }]} />
              </View>
              <Text style={{ fontSize: 10, color: theme.textSecondary }}>{ev.goingCount}/{ev.limit} Going</Text>
            </View>
            {!ev.isPast && (
              <View style={[styles.spaceBetweenRowTight, { borderTopWidth: 1, borderTopColor: theme.borderSubtle, paddingTop: 8 }]}>
                <View style={{ flexDirection: 'row', gap: 3, padding: 3, borderRadius: 10, backgroundColor: theme.surfaceElevated }}>
                {['Going', 'Interested', 'Not Going'].map((choice) => (
                  <Pressable
                    key={choice}
                    onPress={() => {
                      setEvents((prev) => prev.map((item) => {
                        if (item.id !== ev.id) return item;
                        const delta = (choice === 'Going' && item.rsvp !== 'Going' ? 1 : 0) - (item.rsvp === 'Going' && choice !== 'Going' ? 1 : 0);
                        return { ...item, rsvp: choice, goingCount: Math.max(0, Math.min(item.limit, item.goingCount + delta)) };
                      }));
                      showToast(`RSVP set to "${choice}".`);
                    }}
                    style={[
                      styles.miniChip,
                      {
                        backgroundColor: ev.rsvp === choice ? theme.surface : 'transparent',
                        borderColor: ev.rsvp === choice ? theme.border : 'transparent',
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '600', color: ev.rsvp === choice ? theme.primary : theme.textSecondary }}>
                      {choice}
                    </Text>
                  </Pressable>
                ))}
                </View>
                <Pressable
                  onPress={() => {
                    setEvents((prev) => prev.map((item) => item.id === ev.id ? { ...item, reminder: !item.reminder } : item));
                    showToast(ev.reminder ? 'Reminder turned off.' : 'Reminder set.');
                  }}
                  style={[styles.smallOutlineBtn, { minHeight: 36, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ev.reminder ? theme.warningSoft : theme.surface, borderColor: ev.reminder ? theme.warningBorder : theme.border }]}
                >
                  <Bell size={12} color={ev.reminder ? theme.warning : theme.textSecondary} />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: ev.reminder ? theme.warning : theme.textSecondary }}>{ev.reminder ? 'Reminder On' : 'Remind Me'}</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}
        </View>
        </CategoryTransition>
      </View>
    );
  };

  /** TAB 7: MEMBERS, STUDY BUDDY, MENTORS & PARTNER */
  const renderMembersTab = () => {
    const visibleMembers = ([] as GroupMemberRecord[]).filter((member) => {
      const matchesSearch = `${member.name} ${member.exam}`.toLowerCase().includes(memberSearch.toLowerCase());
      const matchesFilter = memberFilter === 'All'
        || (memberFilter === 'Studying Now' && member.status === 'studying')
        || (memberFilter === 'Mentors' && member.role === 'Mentor')
        || member.slot.toLowerCase().includes(memberFilter.toLowerCase());
      return matchesSearch && matchesFilter;
    });
    const memberRoom: Record<string, string> = {
      u1: 'In Silent Focus Hall',
      u2: 'In Desk-Cam Accountability',
      u4: 'In 50/10 Deep Pomodoro',
      u5: 'In Silent Focus Hall',
    };
    const rolePalette: Record<string, { bg: string; fg: string }> = {
      Owner: { bg: '#EEF2FF', fg: '#4338CA' },
      Mentor: { bg: theme.successSoft, fg: theme.successText },
      Admin: { bg: theme.warningSoft, fg: theme.warning },
      Moderator: { bg: theme.premiumSoft, fg: theme.premium },
    };
    return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <CategoryMenuButton
          label={MEMBER_CATEGORY_OPTIONS.find((category) => category.value === membersSubTab)?.label || 'Members & Roles'}
          onPress={() => setSelectionSheet('members-categories')}
          theme={theme}
        />
        {membersSubTab === 'directory' && (
          <FilterButton
            count={memberFilter === 'All' ? 0 : 1}
            onPress={() => setSelectionSheet('members-filters')}
            theme={theme}
          />
        )}
      </View>

      <CategoryTransition key={membersSubTab}>
      <View style={{ gap: 12 }}>
      {membersSubTab === 'directory' && (
        <View style={{ gap: 10 }}>
        <TextInput
          value={memberSearch}
          onChangeText={setMemberSearch}
          placeholder="Search verified members by name or exam..."
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }]}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {visibleMembers.map((m) => (
            <View
              key={m.id}
              style={{
                width: isTablet ? '48%' : '100%',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                padding: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <MemberAvatar initials={m.initials} status={m.status as 'studying' | 'online' | 'offline'} accent={m.role === 'Mentor' ? '#0D9488' : '#2563EB'} theme={theme} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 }}>
                    <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>{m.name}</Text>
                    {m.role !== 'Member' && <View style={[styles.tagChip, { backgroundColor: rolePalette[m.role]?.bg || theme.surfaceElevated }]}><Text style={{ fontSize: 9, fontWeight: '700', color: rolePalette[m.role]?.fg || theme.textSecondary }}>{m.role}</Text></View>}
                  </View>
                  <Text numberOfLines={1} style={{ fontSize: 10, color: theme.textSecondary, marginTop: 2 }}>
                    {m.exam} · {m.slot}
                  </Text>
                  {memberRoom[m.id] && <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: '600', color: theme.successText, marginTop: 2 }}>{memberRoom[m.id]}</Text>}
                </View>
              </View>
              <View style={[styles.badgePill, { paddingHorizontal: 7, backgroundColor: theme.warningSoft }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: theme.warning }}>🔥 {m.streak}d</Text>
              </View>
              <Pressable onPress={() => { setActiveChannel('general-chat'); setDetailTab('chat'); showToast(`Opening chat with ${m.name}.`); }} style={[styles.iconBoxBtn, { width: 34, height: 34, backgroundColor: theme.surface, borderColor: theme.border }]}>
                <MessageSquare size={14} color={theme.textSecondary} />
              </Pressable>
            </View>
          ))}
          {visibleMembers.length === 0 && <Text style={{ width: '100%', padding: 16, textAlign: 'center', color: theme.textSecondary }}>No members match these filters.</Text>}
        </View>
        </View>
      )}

      {membersSubTab === 'buddy' && (
        <View style={{ gap: 10 }}>
          {([] as GroupMemberRecord[]).slice(3).map((m, idx) => (
            <View key={m.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, gap: 10 }]}>
              <View style={styles.spaceBetweenRowTight}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <MemberAvatar initials={m.initials} status="online" theme={theme} />
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }}>{m.name}</Text>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>{m.exam} · {m.slot}</Text>
                  </View>
                </View>
                <View style={[styles.badgePill, { backgroundColor: theme.tealSoft }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.tealText }}>{94 - idx * 4}% Match</Text>
                </View>
              </View>
              <Pressable
                disabled={buddyRequested[m.id]}
                onPress={() => {
                  setBuddyRequested((prev) => ({ ...prev, [m.id]: true }));
                  showToast(`Study Buddy request sent to ${m.name}!`);
                }}
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: buddyRequested[m.id] ? theme.surfaceElevated : theme.primary,
                    alignItems: 'center',
                  },
                ]}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: buddyRequested[m.id] ? theme.textMuted : '#FFFFFF' }}>
                  {buddyRequested[m.id] ? 'Buddy Request Sent' : 'Send Study Buddy Request'}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {membersSubTab === 'mentors' && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, gap: 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <MemberAvatar initials="RS" size="lg" status="online" accent="#0D9488" theme={theme} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Dr. Rajesh Sharma</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.tealText }}>Verified Peer Mentor · 4.9★</Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                RAS Mains Paper-I & II, Answer Structuring, Indian Polity
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => showToast('Requested a 15-min Mentor Doubt Slot for Friday 8 PM.')}
            style={[styles.primaryBtn, { backgroundColor: theme.teal, alignSelf: 'flex-start' }]}
          >
            <Text style={styles.primaryBtnText}>Book 15m Doubt Slot</Text>
          </Pressable>
        </View>
      )}

      {membersSubTab === 'partner' && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, gap: 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <HeartHandshake size={18} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Partner: Priya Mathur</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: theme.surfaceElevated }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary }}>Your Weekly Goal</Text>
              <Text style={[styles.tabularText, { fontSize: 22, fontWeight: '800', color: theme.primary, marginTop: 2 }]}>92%</Text>
              <Text style={{ fontSize: 11, color: theme.textMuted }}>6/7 check-ins</Text>
            </View>
            <View style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: theme.surfaceElevated }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary }}>Priya’s Weekly Goal</Text>
              <Text style={[styles.tabularText, { fontSize: 22, fontWeight: '800', color: theme.teal, marginTop: 2 }]}>95%</Text>
              <Text style={{ fontSize: 11, color: theme.textMuted }}>7/7 check-ins</Text>
            </View>
          </View>
        </View>
      )}
      </View>
      </CategoryTransition>
    </View>
    );
  };

  /** TAB 8: INSIGHTS (AI ASSISTANT, ANALYTICS & LEADERBOARD, STUDY UNIVERSE TREE) */
  const renderInsightsTab = () => (
    <View style={{ gap: 12 }}>
      <CategoryMenuButton
        label={INSIGHTS_CATEGORY_OPTIONS.find((category) => category.value === insightsSubTab)?.label || 'AI Assistant'}
        onPress={() => setSelectionSheet('insights-categories')}
        theme={theme}
      />

      <CategoryTransition key={insightsSubTab}>
      <View style={{ gap: 12 }}>
      {insightsSubTab === 'ai' && (
        <View style={{ gap: 12 }}>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, gap: 10 }]}>
            <View style={[styles.spaceBetweenRowTight, { borderBottomWidth: 1, borderBottomColor: theme.borderSubtle, paddingBottom: 9 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.iconBadge, { backgroundColor: theme.primarySoft }]}><Sparkles size={15} color={theme.primary} /></View>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }}>Study Sakha AI Assistant</Text>
                  <Text style={{ fontSize: 10, color: theme.textSecondary }}>Group-aware quiz & revision generator</Text>
                </View>
              </View>
              <View style={[styles.badgePill, { paddingVertical: 4, backgroundColor: theme.surfaceElevated }]}>
                <Lock size={10} color={theme.textSecondary} />
                <Text style={{ fontSize: 9, fontWeight: '600', color: theme.textSecondary }}>Authorized group data only</Text>
              </View>
            </View>
            {aiMessages.map((m, i) => (
              <View
                key={i}
                style={{
                  padding: 11,
                  borderRadius: 12,
                  backgroundColor: m.role === 'ai' ? theme.surfaceElevated : theme.primary,
                  marginLeft: m.role === 'user' ? 24 : 0,
                }}
              >
                {m.title && <Text style={{ fontSize: 12, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 }}>{m.title}</Text>}
                <Text style={{ fontSize: 12, color: m.role === 'ai' ? theme.textPrimary : '#FFFFFF', lineHeight: 18 }}>
                  {m.text}
                </Text>
                {m.actionLabel && (
                  <Pressable
                    onPress={() => {
                      setDetailTab(m.actionTab || 'goals');
                      if (m.actionTab === 'learn') setLearnModule(m.title?.includes('Quiz') ? 'quiz' : 'resources');
                      showToast(`${m.actionLabel} selected.`);
                    }}
                    style={[styles.smallOutlineBtn, { alignSelf: 'flex-start', marginTop: 8, minHeight: 34, paddingVertical: 5, borderColor: theme.primary + '55', backgroundColor: theme.primarySoft }]}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color: theme.primaryText }}>{m.actionLabel} →</Text>
                  </Pressable>
                )}
              </View>
            ))}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {['Generate 10-Q Weak Topic Quiz', 'Summarize Weekly PYQs', '7-Day Revision Plan'].map((chip) => (
                <Pressable
                  key={chip}
                  onPress={() => handleAiPrompt(chip)}
                  style={[styles.miniChip, { backgroundColor: theme.primarySoft, borderColor: theme.primary + '40' }]}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: theme.primaryText }}>✨ {chip}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={aiInput}
                onChangeText={setAiInput}
                onSubmitEditing={() => handleAiPrompt()}
                placeholder="Ask AI about group insights or quizzes..."
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { flex: 1, backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
              />
              <Pressable onPress={() => handleAiPrompt()} style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
                <Text style={styles.primaryBtnText}>Ask</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {insightsSubTab === 'analytics' && (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[
              { label: 'Group Goal Completion', value: '89%', detail: '↑ 6% vs last wk', color: theme.successText },
              { label: 'Peak Study Window', value: '6–9 AM', detail: '18 active avg', color: theme.primary },
              { label: 'Top Weak Topic', value: 'Art. 356 vs 365', detail: '4 open doubts', color: theme.warning },
            ].map((item) => (
              <View key={item.label} style={[styles.card, { width: isTablet ? undefined : '100%', minWidth: isTablet ? 180 : undefined, flexGrow: isTablet ? 1 : 0, backgroundColor: theme.surface, borderColor: theme.border, gap: 5 }]}>
                <Text style={{ fontSize: 10, color: theme.textSecondary }}>{item.label}</Text>
                <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: '800', color: theme.textPrimary }}>{item.value}</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: item.color }}>{item.detail}</Text>
              </View>
            ))}
          </View>
          <View style={styles.spaceBetweenRowTight}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Performance Metrics</Text>
            <View style={{ width: 170 }}>
              <SegmentedControl
                options={[
                  { value: 'Weekly', label: 'Weekly' },
                  { value: 'Monthly', label: 'Monthly' },
                ]}
                selected={analyticsPeriod}
                onSelect={(value) => {
                  if (value === 'Weekly' || value === 'Monthly') setAnalyticsPeriod(value);
                }}
                theme={theme}
              />
            </View>
          </View>

          <View style={styles.kpiGrid}>
            {[
              { label: 'Study Hours', val: analyticsPeriod === 'Weekly' ? '312h' : '1,248h', delta: '+14%' },
              { label: 'Attendance', val: '86%', delta: '+5%' },
              { label: 'Goal Hit', val: '79%', delta: '+8%' },
              { label: 'PYQ Accuracy', val: '84%', delta: '+6%' },
            ].map((k) => (
              <View key={k.label} style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border, width: '48%' }]}>
                <View>
                  <Text style={{ fontSize: 11, color: theme.textSecondary }}>{k.label}</Text>
                  <Text style={[styles.tabularText, { fontSize: 19, fontWeight: '800', color: theme.textPrimary, marginTop: 2 }]}>{k.val}</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.live }}>{k.delta}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, gap: 10 }]}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Balanced Leaderboard</Text>
            <CategoryMenuButton
              label={leaderboardCategory}
              onPress={() => setSelectionSheet('leaderboard-categories')}
              theme={theme}
            />
                        {([] as GroupMemberRecord[]).slice(0, 5).map((m, idx) => (
              <View key={m.id} style={[styles.memberRowCard, { backgroundColor: idx === 0 ? theme.primarySoft : theme.surfaceElevated, borderColor: idx === 0 ? theme.primary + '50' : theme.border }]}>
                <Text style={[styles.tabularText, { fontWeight: '800', color: theme.textSecondary, width: 22 }]}>#{idx + 1}</Text>
                <MemberAvatar initials={m.initials} size="sm" status="none" theme={theme} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }}>{m.name}</Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary }}>{m.role}</Text>
                </View>
                <Text style={[styles.tabularText, { fontSize: 12, fontWeight: '700', color: theme.tealText }]}>
                  {leaderboardCategory === 'Most Consistent' && `${m.streak}d streak`}
                  {leaderboardCategory === 'Goal Achiever' && `${m.goalPct}%`}
                  {leaderboardCategory === 'PYQ Champion' && `${m.pyqAcc}% acc`}
                  {leaderboardCategory === 'Helpful Member' && `${m.helpfulVotes} votes`}
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, gap: 10 }]}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Recorded study-room activity</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { label: 'Focused time', value: `${(roomFocusSecondsTotal / 3600).toFixed(1)} h` },
                { label: 'Your room streak', value: `${ownRoomFocusStreak} ${ownRoomFocusStreak === 1 ? 'day' : 'days'}` },
                { label: 'Logged sessions', value: String(roomStudyLogs.length) },
              ].map((item) => (
                <View key={item.label} style={{ flex: 1, minWidth: 105, padding: 10, borderRadius: 10, backgroundColor: theme.surfaceElevated }}>
                  <Text style={{ fontSize: 10, color: theme.textSecondary }}>{item.label}</Text>
                  <Text style={{ marginTop: 3, fontSize: 16, fontWeight: '800', color: theme.textPrimary }}>{item.value}</Text>
                </View>
              ))}
            </View>
            {roomInsightsError ? (
              <Text style={{ fontSize: 12, color: theme.danger }}>{roomInsightsError}</Text>
            ) : roomStudyLogs.length ? (
              roomStudyLogs.slice(0, 6).map((session) => {
                const room = STUDY_ROOMS.find((item) => item.id === session.room_id);
                const focusedMinutes = Math.round(session.focused_seconds / 60);
                return (
                  <View key={session.id} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: theme.borderSubtle, paddingTop: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>
                        {roomProfileNames.get(session.user_id) ?? 'Group member'} · {room?.name ?? 'Study room'}
                      </Text>
                      <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                        {session.subject} · {new Date(session.started_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.tealText }}>{focusedMinutes} min focus</Text>
                    {session.questions_attempted !== null && (
                      <Text style={{ fontSize: 10, color: theme.textSecondary }}>{session.questions_attempted} Q · {session.time_management_rating}/5</Text>
                    )}
                  </View>
                );
              })
            ) : (
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                Focus time and room streaks appear here after you pause or finish a room session.
              </Text>
            )}
          </View>
        </View>
      )}

      {insightsSubTab === 'universe' && selectedGroup.dataSource !== 'backend' && (
        <View style={{ gap: 12 }}>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, alignItems: 'center' }]}>
            <View style={[styles.badgePill, { backgroundColor: theme.tealSoft }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.tealText }}>
                Shared Group Tree · Level {selectedGroup.treeLevel} (Banyan Grove)
              </Text>
            </View>
            {/* Native react-native-svg Group Tree */}
            <Svg width={200} height={145} viewBox="0 0 220 160" style={{ marginVertical: 12 }}>
              <Ellipse cx="110" cy="145" rx="75" ry="10" fill={theme.tealSoft} />
              <Rect x="102" y="92" width="16" height="52" rx="6" fill="#92400E" />
              <Circle cx="110" cy="68" r="38" fill="#0D9488" />
              <Circle cx="80" cy="80" r="24" fill="#10B981" />
              <Circle cx="140" cy="80" r="24" fill="#059669" />
              <Circle cx="110" cy="42" r="22" fill="#14B8A6" />
            </Svg>
            <View style={{ width: '100%' }}>
              <View style={styles.spaceBetweenRowTight}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>Level {selectedGroup.treeLevel} Growth</Text>
                <Text style={[styles.tabularText, { fontSize: 12, fontWeight: '700', color: theme.tealText }]}>{selectedGroup.treeXp}% XP</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: theme.surfaceElevated, height: 8, marginTop: 6 }]}>
                <View style={[styles.progressFill, { width: `${selectedGroup.treeXp}%`, backgroundColor: theme.teal }]} />
              </View>
              <Text style={{ fontSize: 11, color: theme.textSecondary, textAlign: 'center', marginTop: 10 }}>
                Grows exclusively from verified Pomodoro check-ins, PYQs, and submitted answers.
              </Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, gap: 8 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Trophy size={16} color={theme.warning} />
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Group Trophies & Badges</Text>
            </View>
            {[
              { name: 'Sunday Mock 100%', desc: 'All active members sat the 3h mock together', earned: true },
              { name: 'Zero Unsolved Doubts', desc: 'Cleared 25 consecutive Polity doubts', earned: true },
              { name: '5,000 PYQ Milestone', desc: '78% complete · Monthly Challenge', earned: false },
            ].map((b) => (
              <View
                key={b.name}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  backgroundColor: b.earned ? theme.warningSoft : theme.surfaceElevated,
                  borderWidth: 1,
                  borderColor: b.earned ? theme.warningBorder : theme.border,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>{b.name}</Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary }}>{b.desc}</Text>
                </View>
                <Award size={18} color={b.earned ? theme.warning : theme.textMuted} />
              </View>
            ))}
          </View>
        </View>
      )}

      {insightsSubTab === 'universe' && selectedGroup.dataSource === 'backend' && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, padding: 18 }]}>
          <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '700' }}>Group growth data unavailable</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 6 }}>
            Verified group insights will appear here when the backend provides them.
          </Text>
        </View>
      )}
      </View>
      </CategoryTransition>
    </View>
  );

  // --------------------------------------------------------------------------
  // 7. NOTIFICATIONS & DESIGN SPEC SCREENS
  // --------------------------------------------------------------------------
  const renderNotificationsScreen = () => (
    <View style={{ gap: 12 }}>
      <View style={styles.spaceBetweenRowTight}>
        <Pressable onPress={() => setActiveScreen('main')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <ChevronLeft size={18} color={theme.textSecondary} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary }}>Back to Groups</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            showToast('All notifications marked as read.');
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primary }}>Mark all read</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {['All', 'Unread', 'Join Request', 'Live Session', 'Mentor Reply'].map((f) => (
          <Pressable
            key={f}
            onPress={() => setNotifFilter(f)}
            style={[
              styles.pillTab,
              { backgroundColor: notifFilter === f ? theme.primary : theme.surface, borderColor: notifFilter === f ? theme.primary : theme.border },
            ]}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: notifFilter === f ? '#FFFFFF' : theme.textSecondary }}>{f}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, padding: 0, overflow: 'hidden' }]}>
        {notifications.length === 0 ? (
          <View style={{ padding: 18 }}>
            <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '700' }}>No group notifications</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 6 }}>Notifications from your verified group activity will appear here.</Text>
          </View>
        ) : notifications
          .filter((n) => (notifFilter === 'All' ? true : notifFilter === 'Unread' ? !n.read : n.type === notifFilter))
          .map((n, i) => (
            <View
              key={n.id}
              style={{
                padding: 14,
                backgroundColor: !n.read ? theme.primarySoft : theme.surface,
                borderBottomWidth: i < notifications.length - 1 ? 1 : 0,
                borderBottomColor: theme.borderSubtle,
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.tealText }}>{n.type}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textPrimary }}>{n.title}</Text>
              <Text style={{ fontSize: 11, color: theme.textMuted }}>{n.time}</Text>
              {n.actionable && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <Pressable
                    onPress={() => {
                      setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, read: true, actionable: false } : item)));
                      showToast('Approved Rohan Bishnoi into RAS Mains 2026!');
                    }}
                    style={[styles.smallPrimaryBtn, { backgroundColor: theme.primary }]}
                  >
                    <Text style={styles.smallPrimaryBtnText}>Approve</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setNotifications((prev) => prev.filter((item) => item.id !== n.id));
                      showToast('Join request declined.');
                    }}
                    style={[styles.smallOutlineBtn, { borderColor: theme.border, backgroundColor: theme.surfaceElevated }]}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textPrimary }}>Decline</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
      </View>
    </View>
  );

  // --------------------------------------------------------------------------
  // 8. ROOT RENDER & MODALS
  // --------------------------------------------------------------------------
  return (
    <Shell active="Groups" title="" scroll={false} contentPadding={0}>
      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {openingDirectHall && !activeRoom ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Opening Group Hall…</Text>
            </View>
          ) : activeScreen === 'detail' ? (
            <View style={{ flex: 1, padding: 16, paddingBottom: 8 }}>
              {renderGroupDetail()}
            </View>
          ) : (
            <ScrollView
              key={activeScreen}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                activeScreen === 'main' ? (
                  <RefreshControl
                    refreshing={refreshingGroups}
                    onRefresh={() => {
                      setRefreshingGroups(true);
                      void refreshGroups({ silent: true });
                    }}
                    tintColor={theme.primary}
                  />
                ) : undefined
              }
            >
              {activeScreen === 'main' && renderMainScreen()}
              {activeScreen === 'notifications' && renderNotificationsScreen()}
            </ScrollView>
          )}
        </KeyboardAvoidingView>

        <Modal
          visible={Boolean(activeRoom && !roomMinimized)}
          animationType="slide"
          onRequestClose={() => setRoomMinimized(true)}
        >
          {activeRoom && (
            <View style={{ flex: 1, backgroundColor: theme.canvas, paddingTop: insets.top }}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
              >
              {activeRoom.id !== 'silent-focus' && (
              <View style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: activeRoom.id === 'exam-simulation' ? '#111827' : theme.surface,
                borderBottomWidth: 1,
                borderBottomColor: activeRoom.id === 'exam-simulation' ? '#374151' : theme.border,
                gap: 10,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '800', color: activeRoom.id === 'exam-simulation' ? '#FFFFFF' : theme.textPrimary }}>{activeRoom.name}</Text>
                    <Text style={{ fontSize: 11, color: activeRoom.id === 'exam-simulation' ? '#D1D5DB' : theme.textSecondary, marginTop: 2 }}>
                      {activeRoom.id === 'pomodoro'
                        ? 'Shared focus and break lounge'
                        : activeRoom.id === 'exam-simulation'
                          ? 'Strict Exam Hall · No Chat'
                          : 'Camera off · Mic locked · No recording'}
                    </Text>
                  </View>
                  {activeRoom.id === 'pomodoro' && (
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: roomRealtime.phase === 'focus' ? theme.primary : theme.teal }}>
                        {roomRealtime.phase === 'focus' ? 'Focus phase' : 'Break lounge'}
                      </Text>
                      <Pressable
                        onPress={() => void handleTogglePomodoroPhase()}
                        accessibilityRole="button"
                        style={[styles.smallOutlineBtn, { minHeight: 40, paddingHorizontal: 9, backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textPrimary }}>Sync phase</Text>
                      </Pressable>
                    </View>
                  )}
                  {activeRoom.id === 'exam-simulation' && (
                    <Pressable
                      onPress={() => setShowExamReflection(true)}
                      disabled={isLeavingRoom}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: isLeavingRoom }}
                      style={[styles.smallOutlineBtn, { minHeight: 44, paddingHorizontal: 10, borderColor: '#FCA5A5', backgroundColor: '#7F1D1D' }]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>Finish & log</Text>
                    </Pressable>
                  )}
                  {activeRoom.id !== 'exam-simulation' && (
                    <Pressable
                      onPress={() => void handleLeaveRoom()}
                      disabled={isLeavingRoom}
                      accessibilityRole="button"
                      accessibilityState={{ busy: isLeavingRoom, disabled: isLeavingRoom }}
                      accessibilityLabel="Leave and log study room"
                      style={[styles.iconBoxBtn, { width: 44, height: 44, borderColor: theme.danger, backgroundColor: theme.dangerSoft }]}
                    >
                      {isLeavingRoom ? <ActivityIndicator size="small" color={theme.danger} /> : <LogOut size={17} color={theme.danger} />}
                    </Pressable>
                  )}
                </View>
              </View>
              )}

              {activeRoom.id === 'silent-focus' ? (
                <SmartStudyRoomScreen
                  isDark={scheme === 'dark'}
                  roomName={activeRoom.name}
                  currentUserChair={currentUserChairForSmartRoom}
                  partners={partnersForSmartRoom}
                  onStartFocus={handleStartFocusSessionInRoom}
                  onTogglePause={handleTogglePauseForSmartRoom}
                  onEndSession={handleEndSessionForSmartRoom}
                  onExitHall={handleExitHallForSmartRoom}
                  navigation={navigation}
                />
              ) : (
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 16 }}
                  keyboardShouldPersistTaps="handled"
                >
                {roomError && (
                  <View style={{ padding: 12, borderRadius: 10, borderWidth: 1, borderColor: theme.danger, backgroundColor: theme.dangerSoft }}>
                    <Text style={{ fontSize: 12, color: theme.danger }}>{roomError}</Text>
                  </View>
                )}
                {!roomRealtime.connected && (
                  <Text style={{ fontSize: 12, color: theme.warning }}>
                    {roomRealtime.error || 'Connecting to verified group room presence…'}
                  </Text>
                )}
                <View style={{
                  padding: 16,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: activeRoom.id === 'exam-simulation' ? '#374151' : theme.border,
                  backgroundColor: activeRoom.id === 'exam-simulation' ? '#1F2937' : theme.surface,
                  gap: 12,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.liveDot, { backgroundColor: roomFocusing ? theme.live : theme.textMuted }]} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: activeRoom.id === 'exam-simulation' ? '#FFFFFF' : theme.textPrimary }}>
                      {roomFocusing ? 'Focusing active' : activeRoom.id === 'pomodoro' && roomRealtime.phase === 'break' ? 'Break lounge' : 'Ready when you are'}
                    </Text>
                    <Text style={{ marginLeft: 'auto', fontSize: 11, color: activeRoom.id === 'exam-simulation' ? '#D1D5DB' : theme.textSecondary }}>
                      {Math.max(0, roomRealtime.participants.length - 1)} {roomRealtime.participants.length === 2 ? 'peer' : 'peers'} live
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, lineHeight: 18, color: activeRoom.id === 'exam-simulation' ? '#D1D5DB' : theme.textSecondary }}>
                    {activeRoom.id === 'exam-simulation'
                      ? 'Strict exam hall. Chat and room distractions are disabled.'
                      : activeRoom.id === 'pomodoro' && roomRealtime.phase === 'break'
                        ? 'The group is in its break lounge. Return to focus when you are ready.'
                        : 'Mark your focus status for the group.'}
                  </Text>
                  <Pressable
                    onPress={() => void handleRoomFocusButton()}
                    accessibilityRole="button"
                    style={{
                      minHeight: 52,
                      borderRadius: 12,
                      backgroundColor: roomFocusing ? theme.successText : theme.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 8,
                    }}
                  >
                    {roomFocusing ? <Pause size={17} color="#FFFFFF" /> : <Play size={17} color="#FFFFFF" />}
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                      {roomFocusing ? 'Pause Focus' : 'Start Focusing'}
                    </Text>
                  </Pressable>
                </View>

                {activeRoom.id === 'pomodoro' && (
                  <>
                    {renderAmbientAudioControls()}
                    <View style={{ gap: 10 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Session micro-goals</Text>
                      {roomMicroGoals.map((goal) => (
                        <Pressable
                          key={goal.id}
                          onPress={() => handleToggleMicroGoal(goal.id)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: goal.completed }}
                          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9 }}
                        >
                          {goal.completed ? <CheckCircle2 size={18} color={theme.successText} /> : <Check size={18} color={theme.textMuted} />}
                          <Text style={{ flex: 1, fontSize: 13, color: theme.textPrimary, textDecorationLine: goal.completed ? 'line-through' : 'none' }}>{goal.title}</Text>
                        </Pressable>
                      ))}
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput
                          value={newRoomGoal}
                          onChangeText={setNewRoomGoal}
                          onSubmitEditing={handleAddMicroGoal}
                          placeholder="Add a goal for this session"
                          placeholderTextColor={theme.textMuted}
                          returnKeyType="done"
                          style={[styles.input, { flex: 1, minHeight: 44, backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }]}
                        />
                        <Pressable onPress={handleAddMicroGoal} accessibilityRole="button" style={[styles.primaryBtn, { minHeight: 44, justifyContent: 'center', backgroundColor: theme.primary }]}>
                          <Text style={styles.primaryBtnText}>Add</Text>
                        </Pressable>
                      </View>
                    </View>
                    <View style={{ gap: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Break Lounge</Text>
                      <ScrollView
                        style={{ height: 170, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 12 }}
                        contentContainerStyle={{ gap: 10 }}
                        nestedScrollEnabled
                      >
                        {roomRealtime.phase !== 'break' ? (
                          <Text style={{ fontSize: 12, color: theme.textMuted }}>Messages are hidden during the Focus Phase.</Text>
                        ) : roomRealtime.messages.length ? roomRealtime.messages.map((message) => (
                          <View key={message.id} style={{ gap: 2 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textSecondary }}>
                              {message.user_id === roomUser?.id ? 'You' : 'Group member'}
                            </Text>
                            <Text style={{ fontSize: 12, color: theme.textPrimary }}>{message.body}</Text>
                          </View>
                        )) : (
                          <Text style={{ fontSize: 12, color: theme.textMuted }}>Break messages will appear here when the lounge opens.</Text>
                        )}
                      </ScrollView>
                    </View>
                  </>
                )}

                {activeRoom.id === 'exam-simulation' && (
                  <View style={{ gap: 10 }}>
                    <View style={styles.spaceBetweenRowTight}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Mock paper reference</Text>
                      <Pressable
                        onPress={() => setShowMockPaper((current) => !current)}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: showMockPaper }}
                        style={[styles.smallOutlineBtn, { minHeight: 44, paddingHorizontal: 12, backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>{showMockPaper ? 'Hide' : 'Show'}</Text>
                      </Pressable>
                    </View>
                    {showMockPaper && (
                      <View style={{ padding: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, gap: 10 }}>
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>RAS Mains structure · bring your selected paper or group prompt</Text>
                        {['Part A · 15 words', 'Part B · 50 words', 'Part C · 100 words'].map((part) => (
                          <View key={part} style={{ minHeight: 42, borderTopWidth: 1, borderTopColor: theme.borderSubtle, flexDirection: 'row', alignItems: 'center' }}>
                            <FileText size={15} color={theme.primary} />
                            <Text style={{ marginLeft: 8, fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>{part}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {activeRoom.id === 'desk-cam' && (
                  <>
                    {renderRoomSubjectSelector()}
                    <View style={{ padding: 12, borderRadius: 12, backgroundColor: theme.warningSoft, gap: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>Camera-off accountability</Text>
                      <Text style={{ fontSize: 11, lineHeight: 16, color: theme.textSecondary }}>
                        Live video is deferred. No camera or microphone is accessed, streamed, or recorded.
                      </Text>
                      <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textMuted }}>240p Data Saver</Text>
                          <Text style={{ fontSize: 10, color: theme.textMuted }}>Available when live video is integrated</Text>
                        </View>
                        <Switch value={false} disabled trackColor={{ false: theme.border, true: theme.teal }} />
                      </View>
                    </View>
                    <View style={{ gap: 10 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Accountability room</Text>
                      {hiddenRoomMembers.length > 0 && (
                        <Pressable onPress={() => setHiddenRoomMembers([])} accessibilityRole="button" style={{ minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primaryText }}>Show {hiddenRoomMembers.length} hidden {hiddenRoomMembers.length === 1 ? 'peer' : 'peers'}</Text>
                        </Pressable>
                      )}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                        {[
                          {
                            userId: roomUser?.id ?? 'self',
                            name: roomUser?.name ?? 'You',
                            initials: initialsForName(roomUser?.name ?? 'You'),
                            subject: roomSubject,
                            focusSessionId: currentRoomFocusActivity?.focusSessionId ?? null,
                            focusStartedAt: currentRoomFocusActivity?.startedAt ?? null,
                            streak: store.streak,
                            focusing: roomFocusing,
                            focusSessionActive: Boolean(currentRoomFocusActivity),
                            focusSessionState: currentRoomFocusActivity?.status ?? 'focusing',
                            focusElapsedSeconds: currentRoomFocusActivity?.elapsedSeconds ?? 0,
                            focusUpdatedAt: currentRoomFocusActivity?.updatedAt ?? null,
                          },
                          ...roomRealtime.participants.filter((participant) => participant.userId !== roomUser?.id && !hiddenRoomMembers.includes(participant.userId)),
                        ].map((participant) => (
                          <View
                            key={participant.userId}
                            style={{
                              width: width >= 1024 ? '32%' : width >= 768 ? '48%' : '100%',
                              minHeight: 126,
                              padding: 12,
                              borderRadius: 14,
                              borderWidth: 1,
                              borderColor: theme.border,
                              backgroundColor: participant.userId === roomUser?.id && camDimSelfView ? theme.canvas : theme.surface,
                              opacity: participant.userId === roomUser?.id && camDimSelfView ? 0.55 : 1,
                              gap: 8,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <MemberAvatar initials={participant.initials} size="sm" status={participant.focusing ? 'studying' : 'none'} theme={theme} />
                              <View style={{ flex: 1 }}>
                                <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>{participant.name}{participant.userId === roomUser?.id ? ' · You' : ''}</Text>
                                <Text numberOfLines={1} style={{ fontSize: 10, color: theme.textSecondary }}>{participant.subject}</Text>
                              </View>
                            </View>
                            <Text style={{ fontSize: 10, color: theme.textSecondary }}>{participant.focusing ? 'Focusing' : 'Here'} · {participant.streak} day streak</Text>
                            {participant.userId !== roomUser?.id && (
                              <View style={{ flexDirection: 'row', gap: 8 }}>
                                <Pressable
                                  onPress={() => setHiddenRoomMembers((current) => [...current, participant.userId])}
                                  accessibilityRole="button"
                                  style={[styles.smallOutlineBtn, { minHeight: 40, flex: 1, justifyContent: 'center', borderColor: theme.border, backgroundColor: theme.surfaceElevated }]}
                                >
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textPrimary }}>Hide locally</Text>
                                </Pressable>
                                <Pressable
                                  onPress={() => { setReportReason('Other'); setReportError(null); setReportingRoomMember(participant); }}
                                  accessibilityRole="button"
                                  style={[styles.smallOutlineBtn, { minHeight: 40, width: 44, alignItems: 'center', justifyContent: 'center', borderColor: theme.border, backgroundColor: theme.surfaceElevated }]}
                                  accessibilityLabel={`Report ${participant.name}`}
                                >
                                  <Flag size={14} color={theme.danger} />
                                </Pressable>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    </View>
                  </>
                )}
                </ScrollView>
              )}
              {activeRoom.id === 'pomodoro' && (
                <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12), borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface }}>
                  {roomRealtime.phase === 'break' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TextInput
                        value={breakChatInput}
                        onChangeText={setBreakChatInput}
                        onSubmitEditing={() => void handleSendBreakMessage()}
                        placeholder="Message the break lounge"
                        placeholderTextColor={theme.textMuted}
                        returnKeyType="send"
                        style={[styles.input, { flex: 1, minHeight: 44, backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                      />
                      <Pressable onPress={() => void handleSendBreakMessage()} accessibilityRole="button" accessibilityLabel="Send break message" style={[styles.iconBoxBtn, { width: 44, height: 44, backgroundColor: theme.primary, borderColor: theme.primary }]}>
                        <Send size={17} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  ) : (
                    <Text style={{ minHeight: 44, textAlignVertical: 'center', fontSize: 12, color: theme.textMuted }}>
                      Break Lounge Chat is locked during Focus Phase.
                    </Text>
                  )}
                </View>
              )}
              {activeRoom.id === 'desk-cam' && (
                <View style={{ minHeight: 60, paddingHorizontal: 16, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12), borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <VideoOff size={17} color={theme.textSecondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>Camera off · Mic locked</Text>
                    <Text style={{ fontSize: 10, color: theme.textSecondary }}>No media is being captured</Text>
                  </View>
                  <Pressable
                    onPress={() => setCamDimSelfView((current) => !current)}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: camDimSelfView }}
                    style={[styles.smallOutlineBtn, { minHeight: 44, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                  >
                    <EyeOff size={14} color={theme.textSecondary} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textPrimary }}>{camDimSelfView ? 'Brighten' : 'Dim self'}</Text>
                  </Pressable>
                </View>
              )}
              </KeyboardAvoidingView>

              {showExamReflection && activeRoom.id === 'exam-simulation' && (
                <View style={[styles.modalBackdrop, { position: 'absolute', backgroundColor: theme.overlay, justifyContent: 'center', padding: 16 }]}>
                  <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ width: '100%', alignItems: 'center' }}
                  >
                  <View style={[styles.modalSheet, { width: '100%', maxWidth: 480, backgroundColor: theme.surface, borderColor: theme.border, gap: 14 }]}>
                    <View style={styles.modalHeader}>
                      <View>
                        <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Exam reflection</Text>
                        <Text style={{ marginTop: 3, fontSize: 12, color: theme.textSecondary }}>Your completed session will be saved to group insights.</Text>
                      </View>
                      <Pressable onPress={() => setShowExamReflection(false)} disabled={isLeavingRoom} accessibilityRole="button" accessibilityState={{ disabled: isLeavingRoom }} accessibilityLabel="Close exam reflection" style={[styles.iconBoxBtn, { width: 44, height: 44, borderColor: theme.border, backgroundColor: theme.surfaceElevated, opacity: isLeavingRoom ? 0.5 : 1 }]}>
                        <X size={17} color={theme.textSecondary} />
                      </Pressable>
                    </View>
                    <TextInput
                      value={examQuestionsAttempted}
                      onChangeText={setExamQuestionsAttempted}
                      keyboardType="number-pad"
                      placeholder="Questions attempted"
                      placeholderTextColor={theme.textMuted}
                      style={[styles.input, { minHeight: 48, backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    />
                    <View style={{ gap: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>Time management rating</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <Pressable
                            key={rating}
                            onPress={() => setExamTimeRating(rating)}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: examTimeRating === rating }}
                            style={[styles.smallOutlineBtn, { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: examTimeRating === rating ? theme.primarySoft : theme.surface, borderColor: examTimeRating === rating ? theme.primary : theme.border }]}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '700', color: examTimeRating === rating ? theme.primaryText : theme.textSecondary }}>{rating}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                    {roomError && <Text style={{ fontSize: 12, color: theme.danger }}>{roomError}</Text>}
                    <Pressable onPress={() => void handleFinishExam()} disabled={isLeavingRoom} accessibilityRole="button" accessibilityState={{ busy: isLeavingRoom, disabled: isLeavingRoom }} style={[styles.primaryBtn, { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.primary, opacity: isLeavingRoom ? 0.6 : 1 }]}>
                      {isLeavingRoom && <ActivityIndicator size="small" color="#FFFFFF" />}
                      <Text style={styles.primaryBtnText}>{isLeavingRoom ? 'Saving…' : 'Save exam reflection'}</Text>
                    </Pressable>
                  </View>
                  </KeyboardAvoidingView>
                </View>
              )}

              {reportingRoomMember && activeRoom.id === 'desk-cam' && (
                <View style={[styles.modalBackdrop, { position: 'absolute', backgroundColor: theme.overlay, justifyContent: 'center', padding: 16 }]}>
                  <View style={[styles.modalSheet, { width: '100%', maxWidth: 480, backgroundColor: theme.surface, borderColor: theme.border, gap: 10 }]}>
                    <View style={styles.modalHeader}>
                      <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Report {reportingRoomMember.name}</Text>
                      <Pressable onPress={() => setReportingRoomMember(null)} accessibilityRole="button" accessibilityLabel="Close report dialog" style={[styles.iconBoxBtn, { width: 44, height: 44, borderColor: theme.border, backgroundColor: theme.surfaceElevated }]}>
                        <X size={17} color={theme.textSecondary} />
                      </Pressable>
                    </View>
                    {(['Harassment', 'Unsafe behavior', 'Spam', 'Other'] as const).map((reason) => (
                      <Pressable
                        key={reason}
                        onPress={() => setReportReason(reason)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: reportReason === reason }}
                        style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9 }}
                      >
                        {reportReason === reason ? <CheckCircle2 size={17} color={theme.primary} /> : <View style={{ width: 17, height: 17, borderRadius: 9, borderWidth: 1, borderColor: theme.border }} />}
                        <Text style={{ fontSize: 13, color: theme.textPrimary }}>{reason}</Text>
                      </Pressable>
                    ))}
                    {reportError && <Text style={{ fontSize: 12, color: theme.danger }}>{reportError}</Text>}
                    <Pressable onPress={() => void handleReportRoomMember()} accessibilityRole="button" style={[styles.primaryBtn, { minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.danger }]}>
                      <Text style={styles.primaryBtnText}>Send report to moderators</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}
        </Modal>

        <FocusSessionSetupModal
          visible={showRoomFocusSetup && activeRoom?.id === 'silent-focus'}
          value={roomFocusSetup}
          onChange={setRoomFocusSetup}
          onClose={() => setShowRoomFocusSetup(false)}
          onContinue={handleContinueRoomFocus}
        />

        {reportSuccess && (
          <View style={{ position: 'absolute', left: 16, right: 16, bottom: (Platform.OS !== 'web' && !isTablet ? 12 : Math.max(insets.bottom, 12)) + (roomMinimized ? 68 : 12), padding: 12, borderRadius: 12, backgroundColor: theme.successSoft }}>
            <Text style={{ fontSize: 12, color: theme.successText }}>{reportSuccess}</Text>
            <Pressable onPress={() => setReportSuccess(null)} accessibilityRole="button" style={{ minHeight: 40, justifyContent: 'center', alignSelf: 'flex-end' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.successText }}>Dismiss</Text>
            </Pressable>
          </View>
        )}

      {showInviteModal && selectedGroup ? <Modal visible transparent animationType="fade" onRequestClose={() => setShowInviteModal(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: theme.overlay, justifyContent: 'center' }]}>
          <View style={[styles.modalSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Invite to your group</Text>
                {selectedGroup.memberLimit !== undefined && selectedGroup.membersCount !== undefined && <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 3 }}>
                  {Math.max(0, selectedGroup.memberLimit - selectedGroup.membersCount)} seats left
                </Text>}
              </View>
              <Pressable onPress={() => setShowInviteModal(false)} style={styles.iconBtn} accessibilityLabel="Close invite dialog">
                <X size={18} color={theme.textSecondary} />
              </Pressable>
            </View>
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 14, marginBottom: 6 }}>
              Secure invite link (expires in 7 days)
            </Text>
            <View style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, minHeight: 44, justifyContent: 'center' }]}>
              {inviteLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>Generating secure invite link…</Text>
                </View>
              ) : inviteError ? (
                <Text style={{ fontSize: 12, color: theme.danger }}>{inviteError}</Text>
              ) : (
                <Text selectable numberOfLines={1} style={{ fontSize: 12, color: theme.textPrimary }}>
                  {(activeInvite ? getGroupInviteUrl(activeInvite.token) : null) ?? 'Unable to generate invite link.'}
                </Text>
              )}
            </View>
            {activeInvite && !inviteLoading && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Text style={{ fontSize: 11, color: theme.textMuted }}>
                  Used {activeInvite.useCount}{activeInvite.maxUses ? `/${activeInvite.maxUses}` : ''} times
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Pressable
                    onPress={() => {
                      setInviteLoading(true);
                      setInviteError(null);
                      void createStudyGroupInvite({ groupId: selectedGroup.id })
                        .then((created) => {
                          setActiveInvite(created);
                          showToast('Generated a new invite link.');
                        })
                        .catch((err: unknown) => {
                          setInviteError(err instanceof Error ? err.message : 'Could not create invite link.');
                        })
                        .finally(() => setInviteLoading(false));
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.primary }}>New link</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      const currentId = activeInvite.id;
                      setInviteLoading(true);
                      void revokeStudyGroupInvite(currentId)
                        .then(() => createStudyGroupInvite({ groupId: selectedGroup.id }))
                        .then((created) => {
                          setActiveInvite(created);
                          showToast('Previous link revoked. New link ready.');
                        })
                        .catch((err: unknown) => {
                          setInviteError(err instanceof Error ? err.message : 'Could not revoke invite link.');
                        })
                        .finally(() => setInviteLoading(false));
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.danger }}>Revoke</Text>
                  </Pressable>
                </View>
              </View>
            )}
            <View style={styles.modalFooter}>
              <Pressable onPress={() => setShowInviteModal(false)} style={[styles.secondaryBtn, { backgroundColor: theme.surfaceElevated }]}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textPrimary }}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={inviteLoading || !activeInvite}
                onPress={() => {
                  const inviteUrl = activeInvite ? getGroupInviteUrl(activeInvite.token) : null;
                  if (!inviteUrl) {
                    showToast(inviteError ?? 'Generate an invite link first.');
                    return;
                  }
                  void Clipboard.setStringAsync(inviteUrl).then(() => {
                    setShowInviteModal(false);
                    showToast('Invite link copied to clipboard!');
                  }).catch((error: unknown) => {
                    console.error('Unable to copy the group invite link.', error);
                    showToast('Could not copy the invite link. Please try again.');
                  });
                }}
                style={[styles.primaryBtn, { backgroundColor: theme.primary, opacity: inviteLoading || !activeInvite ? 0.5 : 1 }]}
              >
                <Text style={styles.primaryBtnText}>Copy link</Text>
              </Pressable>
              <Pressable
                disabled={inviteLoading || !activeInvite}
                onPress={async () => {
                  const inviteUrl = activeInvite ? getGroupInviteUrl(activeInvite.token) : null;
                  if (!inviteUrl) {
                    showToast(inviteError ?? 'Generate an invite link first.');
                    return;
                  }
                  try {
                    await Share.share({
                      title: `Join ${selectedGroup.name} on Study Sakha`,
                      message: `Join "${selectedGroup.name}" on Study Sakha:\n${inviteUrl}`,
                      ...(Platform.OS === 'ios' ? { url: inviteUrl } : {}),
                    }, { dialogTitle: 'Share group invitation' });
                  } catch (error) {
                    if (!(error instanceof Error && error.name === 'AbortError')) showToast('Could not open the share sheet. Please copy the link instead.');
                  }
                }}
                style={[styles.primaryBtn, { backgroundColor: theme.primary, opacity: inviteLoading || !activeInvite ? 0.5 : 1 }]}
              >
                <Text style={styles.primaryBtnText}>Share</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal> : null}

      {invitePreviewToken ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setInvitePreviewToken(null)}>
          <View style={[styles.modalBackdrop, { backgroundColor: theme.overlay, justifyContent: 'center' }]}>
            <View style={[styles.modalSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Group Invitation</Text>
                <Pressable onPress={() => setInvitePreviewToken(null)} style={styles.iconBtn} accessibilityLabel="Close invitation preview">
                  <X size={18} color={theme.textSecondary} />
                </Pressable>
              </View>
              {invitePreviewLoading ? (
                <View style={{ paddingVertical: 24, alignItems: 'center', gap: 10 }}>
                  <ActivityIndicator color={theme.primary} />
                  <Text style={{ fontSize: 13, color: theme.textSecondary }}>Verifying invitation…</Text>
                </View>
              ) : invitePreviewError || !invitePreview?.valid ? (
                <View style={{ paddingVertical: 14, gap: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.danger }}>
                    Invitation unavailable
                  </Text>
                  <Text style={{ fontSize: 13, lineHeight: 19, color: theme.textSecondary }}>
                    {invitePreviewError ??
                      (invitePreview?.statusReason === 'expired'
                        ? 'This invitation link has expired. Ask a group member for a new link.'
                        : invitePreview?.statusReason === 'revoked'
                          ? 'This invitation link has been revoked by a group admin.'
                          : invitePreview?.statusReason === 'max_uses_reached'
                            ? 'This invitation link has reached its maximum number of uses.'
                            : invitePreview?.statusReason === 'archived'
                              ? 'This study group is no longer active.'
                              : 'This invitation link is invalid.')}
                  </Text>
                  <View style={styles.modalFooter}>
                    <Pressable onPress={() => setInvitePreviewToken(null)} style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
                      <Text style={styles.primaryBtnText}>Close</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={{ paddingTop: 12, gap: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: theme.textPrimary }}>
                    {invitePreview.groupName}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    {invitePreview.privacy} · {invitePreview.memberCount} active {invitePreview.memberCount === 1 ? 'member' : 'members'}
                  </Text>
                  <Text style={{ fontSize: 12, lineHeight: 18, color: theme.textSecondary }}>
                    Join this study circle to access its live study rooms and shared accountability.
                  </Text>
                  <View style={styles.modalFooter}>
                    <Pressable
                      disabled={joiningByInvite}
                      onPress={() => setInvitePreviewToken(null)}
                      style={[styles.secondaryBtn, { backgroundColor: theme.surfaceElevated }]}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textPrimary }}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      disabled={joiningByInvite}
                      onPress={() => {
                        setJoiningByInvite(true);
                        void joinStudyGroupByInvite(invitePreviewToken)
                          .then(async (joinedGroupId) => {
                            await refreshGroups({ silent: true });
                            setInvitePreviewToken(null);
                            setSelectedGroupId(joinedGroupId);
                            setActiveScreen('detail');
                            setDetailTab('live');
                            showToast(`Joined ${invitePreview.groupName ?? 'study group'}!`);
                          })
                          .catch((err: unknown) => {
                            setInvitePreviewError(err instanceof Error ? err.message : 'Could not join this study group.');
                          })
                          .finally(() => setJoiningByInvite(false));
                      }}
                      style={[styles.primaryBtn, { backgroundColor: theme.primary, opacity: joiningByInvite ? 0.6 : 1 }]}
                    >
                      <Text style={styles.primaryBtnText}>{joiningByInvite ? 'Joining…' : 'Join Group'}</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>
      ) : null}

      {/* CREATE GROUP MULTI-STEP MODAL */}
      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Create Study Group</Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>Step {createStep} of 3</Text>
              </View>
              <Pressable onPress={() => setShowCreateModal(false)} style={styles.iconBtn}>
                <X size={18} color={theme.textSecondary} />
              </Pressable>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.surfaceElevated, marginVertical: 12 }]}>
              <View style={[styles.progressFill, { width: `${(createStep / 3) * 100}%`, backgroundColor: theme.primary }]} />
            </View>

            {createStep === 1 && (
              <View style={{ gap: 10 }}>
                <TextInput
                  value={newGroupForm.name}
                  onChangeText={(t) => setNewGroupForm({ ...newGroupForm, name: t })}
                  placeholder="Group Name (e.g., RAS Prelims 2026 Circle)"
                  placeholderTextColor={theme.textMuted}
                  style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                />
                <TextInput
                  multiline
                  numberOfLines={2}
                  value={newGroupForm.description}
                  onChangeText={(t) => setNewGroupForm({ ...newGroupForm, description: t })}
                  placeholder="Target syllabus & daily rules..."
                  placeholderTextColor={theme.textMuted}
                  style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary, minHeight: 60 }]}
                />
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary }}>Group Type</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['General Study', 'Cam Study'] as const).map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => setNewGroupForm({ ...newGroupForm, type: t })}
                      style={{
                        flex: 1,
                        padding: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: newGroupForm.type === t ? theme.primary : theme.border,
                        backgroundColor: newGroupForm.type === t ? theme.primarySoft : theme.surfaceElevated,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {createStep === 2 && (
              <View style={{ gap: 12 }}>
                <View style={styles.spaceBetweenRowTight}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textPrimary }}>Daily Study Target</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Pressable
                      onPress={() => setNewGroupForm((f) => ({ ...f, dailyTargetHours: Math.max(1, f.dailyTargetHours - 1) }))}
                      style={[styles.miniChip, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                    >
                      <Text style={{ fontWeight: '800', color: theme.textPrimary }}>-</Text>
                    </Pressable>
                    <Text style={[styles.tabularText, { fontWeight: '800', color: theme.primary }]}>{newGroupForm.dailyTargetHours} hrs</Text>
                    <Pressable
                      onPress={() => setNewGroupForm((f) => ({ ...f, dailyTargetHours: Math.min(12, f.dailyTargetHours + 1) }))}
                      style={[styles.miniChip, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                    >
                      <Text style={{ fontWeight: '800', color: theme.textPrimary }}>+</Text>
                    </Pressable>
                  </View>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary }}>Member Limit</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[15, 25, 50, 100].map((lim) => (
                    <Pressable
                      key={lim}
                      onPress={() => setNewGroupForm({ ...newGroupForm, memberLimit: lim })}
                      style={[
                        styles.miniChip,
                        {
                          flex: 1,
                          alignItems: 'center',
                          backgroundColor: newGroupForm.memberLimit === lim ? theme.primary : theme.surfaceElevated,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: newGroupForm.memberLimit === lim ? '#FFFFFF' : theme.textPrimary }}>
                        {lim}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {createStep === 3 && (
              <View style={{ gap: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary }}>Join Method</Text>
                <View style={{ gap: 6 }}>
                  {(['Open Join', 'Password Protected', 'Answer-based Entry', 'Leader Approval'] as const).map((jm) => (
                    <Pressable
                      key={jm}
                      onPress={() => setNewGroupForm({ ...newGroupForm, joinMethod: jm })}
                      style={{
                        padding: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: newGroupForm.joinMethod === jm ? theme.teal : theme.border,
                        backgroundColor: newGroupForm.joinMethod === jm ? theme.tealSoft : theme.surfaceElevated,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>{jm}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.modalFooter}>
              {createStep > 1 && (
                <Pressable onPress={() => setCreateStep(createStep - 1)} style={[styles.secondaryBtn, { backgroundColor: theme.surfaceElevated }]}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textPrimary }}>Back</Text>
                </Pressable>
              )}
              {createStep < 3 ? (
                <Pressable onPress={() => setCreateStep(createStep + 1)} style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
                  <Text style={styles.primaryBtnText}>Continue</Text>
                </Pressable>
              ) : (
                <Pressable onPress={handleCreateGroup} style={[styles.primaryBtn, { backgroundColor: theme.teal }]}>
                  <Text style={styles.primaryBtnText}>Launch Group</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* JOIN GROUP MODAL (PASSWORD / ANSWER / APPROVAL) */}
      <Modal visible={Boolean(joinModalGroup)} transparent animationType="fade" onRequestClose={() => setJoinModalGroup(null)}>
        <View style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{joinModalGroup?.joinMethod}</Text>
              <Pressable onPress={() => setJoinModalGroup(null)} accessibilityRole="button" accessibilityLabel="Close group access information" style={[styles.iconBoxBtn, { width: 44, height: 44, borderColor: theme.border, backgroundColor: theme.surfaceElevated }]}>
                <X size={18} color={theme.textSecondary} />
              </Pressable>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary, marginTop: 8 }}>{joinModalGroup?.name}</Text>
            <Text style={{ fontSize: 12, lineHeight: 18, color: theme.textSecondary, marginTop: 8 }}>
              Room access is granted only to active members verified by Supabase. Ask a group admin to approve or invite you; this app will not mark you as a member until that approval is recorded.
            </Text>

            <View style={styles.modalFooter}>
              <Pressable onPress={() => setJoinModalGroup(null)} style={[styles.primaryBtn, { minHeight: 44, justifyContent: 'center', backgroundColor: theme.primary }]}>
                <Text style={styles.primaryBtnText}>Got it</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* CAM STUDY PRIVACY & CONSENT GATE */}
      <Modal
        visible={Boolean(camConsentRoom)}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!joiningRoomId) setCamConsentRoom(null);
        }}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Shield size={18} color={theme.teal} />
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Desk-Cam Privacy Consent</Text>
              </View>
              <Pressable onPress={() => setCamConsentRoom(null)} disabled={Boolean(joiningRoomId)} accessibilityRole="button" accessibilityLabel="Close privacy consent" style={[styles.iconBoxBtn, { width: 44, height: 44, borderColor: theme.border, backgroundColor: theme.surfaceElevated, opacity: joiningRoomId ? 0.5 : 1 }]}>
                <X size={18} color={theme.textSecondary} />
              </Pressable>
            </View>

            <View style={{ marginTop: 12, padding: 14, borderRadius: 12, backgroundColor: theme.tealSoft, gap: 7 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }}>Study alongside your group with your camera off.</Text>
              <Text style={{ fontSize: 12, lineHeight: 18, color: theme.textSecondary }}>
                Live video is not available in this build. Camera-Off Accountability creates a study session without requesting camera or microphone access.
              </Text>
            </View>

            <View style={{ gap: 8, marginTop: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>Session mode</Text>
              <View
                accessible
                accessibilityRole="radio"
                accessibilityState={{ disabled: true }}
                style={[styles.spaceBetweenRowTight, { minHeight: 60, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceElevated, opacity: 0.58 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textMuted }}>Live Video Mode · Unavailable</Text>
                  <Text style={{ fontSize: 10, color: theme.textMuted }}>Requires a video provider integration</Text>
                </View>
                <VideoOff size={16} color={theme.textMuted} />
              </View>
              <View
                accessible
                accessibilityRole="radio"
                accessibilityState={{ selected: true }}
                style={[styles.spaceBetweenRowTight, { minHeight: 56, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.teal, backgroundColor: theme.tealSoft }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>Camera-Off Accountability Mode</Text>
                  <Text style={{ fontSize: 10, color: theme.textSecondary }}>Join without requesting camera or microphone access</Text>
                </View>
                <CheckCircle2 size={18} color={theme.teal} />
              </View>
            </View>

            <Pressable
              disabled={Boolean(joiningRoomId)}
              onPress={() => setCamConsentChecked((checked) => !checked)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: camConsentChecked, disabled: Boolean(joiningRoomId) }}
              style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, opacity: joiningRoomId ? 0.6 : 1 }}
            >
              {camConsentChecked ? <CheckCircle2 size={20} color={theme.teal} /> : <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: theme.border }} />}
              <Text style={{ flex: 1, fontSize: 12, lineHeight: 17, color: theme.textPrimary }}>
                I consent to this camera-off session. Save my consent timestamp for this session only.
              </Text>
            </Pressable>

            <View style={[styles.modalFooter, { justifyContent: 'space-between' }]}>
              <Pressable onPress={() => setCamConsentRoom(null)} disabled={Boolean(joiningRoomId)} style={[styles.secondaryBtn, { minHeight: 44, justifyContent: 'center', backgroundColor: theme.surfaceElevated, opacity: joiningRoomId ? 0.5 : 1 }]}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textPrimary }}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={!camConsentChecked || Boolean(joiningRoomId)}
                onPress={() => void handleConfirmCamConsent()}
                accessibilityRole="button"
                accessibilityState={{ busy: joiningRoomId === 'desk-cam', disabled: !camConsentChecked || Boolean(joiningRoomId) }}
                style={[styles.primaryBtn, { minHeight: 44, minWidth: 142, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.primary, opacity: camConsentChecked && !joiningRoomId ? 1 : 0.45 }]}
              >
                {joiningRoomId === 'desk-cam' && <ActivityIndicator size="small" color="#FFFFFF" />}
                <Text style={styles.primaryBtnText}>{joiningRoomId === 'desk-cam' ? 'Joining…' : 'Consent & join'}</Text>
              </Pressable>
            </View>
            {roomJoinError && (
              <Text accessibilityRole="alert" style={{ fontSize: 12, lineHeight: 18, color: theme.danger, marginTop: 10 }}>
                {roomJoinError}
              </Text>
            )}
          </View>
        </View>
      </Modal>

      {/* GROUP SETTINGS & MODERATION MODAL */}
      <Modal visible={showSettingsModal} transparent animationType="slide" onRequestClose={() => setShowSettingsModal(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Settings & Moderation</Text>
              <Pressable onPress={() => setShowSettingsModal(false)}><X size={18} color={theme.textSecondary} /></Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginVertical: 12 }}>
              {(['general', 'privacy', 'log'] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setSettingsTab(t)}
                  style={[styles.miniChip, { backgroundColor: settingsTab === t ? theme.primary : theme.surfaceElevated, borderColor: theme.border }]}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: settingsTab === t ? '#FFFFFF' : theme.textPrimary, textTransform: 'capitalize' }}>
                    {t === 'log' ? 'Activity Log' : t}
                  </Text>
                </Pressable>
              ))}
            </View>

            {settingsTab === 'general' && (
              <View style={{ gap: 10 }}>
                <Pressable
                  onPress={() => {
                    setShowSettingsModal(false);
                    setConfirmModal({
                      title: 'Transfer Leadership?',
                      body: 'Promote Priya Mathur (Admin) to Owner. You will remain an Admin.',
                      confirmLabel: 'Transfer',
                      onConfirm: () => showToast('Leadership transferred to Priya Mathur.'),
                    });
                  }}
                  style={{ padding: 12, borderRadius: 10, borderWidth: 1, borderColor: theme.border }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }}>Transfer Leadership</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setShowSettingsModal(false);
                    setConfirmModal({
                      title: `Disband "${selectedGroup.name}"?`,
                      body: 'This permanently archives all study rooms, goals, and channels.',
                      confirmLabel: 'Disband Group',
                      danger: true,
                      requireText: selectedGroup.name,
                      onConfirm: () => {
                        const targetGroupId = selectedGroup.id;
                        void disbandStudyGroup(targetGroupId)
                          .then(() => {
                            setGroups((prev) => prev.filter((g) => g.id !== targetGroupId));
                            setActiveScreen('main');
                            showToast('Group disbanded.');
                          })
                          .catch((err: unknown) => {
                            showToast(err instanceof Error ? err.message : 'Could not disband this group.');
                          });
                      },
                    });
                  }}
                  style={{ padding: 12, borderRadius: 10, backgroundColor: theme.dangerSoft }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.danger }}>Disband Group</Text>
                </Pressable>
              </View>
            )}

            {settingsTab === 'privacy' && (
              <View style={{ gap: 8 }}>
                {[
                  'Share daily focus hours with group',
                  'Show live studying status',
                  'Always ask consent before Cam Study',
                  'Allow Study Buddy requests',
                ].map((label, i) => (
                  <View key={label} style={[styles.spaceBetweenRowTight, { padding: 10, borderRadius: 10, backgroundColor: theme.surfaceElevated }]}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textPrimary, flex: 1 }}>{label}</Text>
                    <Switch
                      value={privacyPrefs[i]}
                      onValueChange={(v) => setPrivacyPrefs((prev) => prev.map((p, idx) => (idx === i ? v : p)))}
                      trackColor={{ false: theme.border, true: theme.primary }}
                    />
                  </View>
                ))}
              </View>
            )}

            {settingsTab === 'log' && (
              <View style={{ gap: 8 }}>
                {[
                  'Priya Mathur approved Neha Choudhary · 2h ago',
                  'Dr. Rajesh Sharma pinned Paper-II Sprint notice · 5h ago',
                  'Aarav Singh updated Daily Target to 6 hrs/day · Yesterday',
                ].map((entry, i) => (
                  <View key={i} style={{ padding: 10, borderRadius: 10, backgroundColor: theme.surfaceElevated }}>
                    <Text style={{ fontSize: 12, color: theme.textSecondary }}>{entry}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* REUSABLE CONFIRMATION MODAL */}
      <ConfirmationModal modal={confirmModal} onClose={() => setConfirmModal(null)} theme={theme} />

      {/* NON-BLOCKING TOAST SNACKBAR */}
      {toast && (
        <View style={[styles.toastWrap, { backgroundColor: theme.textPrimary, left: isTablet ? undefined : 16, right: isTablet ? undefined : 16, width: isTablet ? 360 : undefined, alignSelf: 'center' }]}>
          <CheckCircle2 size={16} color={theme.successText} />
          <Text style={[styles.toastText, { color: theme.surface }]}>{toast}</Text>
        </View>
      )}
      </View>
    </Shell>
  );
}

// ----------------------------------------------------------------------------
// 5. REACT NATIVE STYLESHEET
// ----------------------------------------------------------------------------

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  screenTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  tabularText: { fontVariant: ['tabular-nums'] },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  groupAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  tagChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  livePillText: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  spaceBetweenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  spaceBetweenRowTight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowWrapGap8: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  progressTrack: { height: 6, borderRadius: 999, overflow: 'hidden', width: '100%' },
  progressFill: { height: '100%', borderRadius: 999 },
  cardFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  kpiCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillTab: {
    paddingHorizontal: 13,
    minHeight: 40,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  miniChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  filterBox: { padding: 12, borderRadius: 14, borderWidth: 1 },
  primaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 12, fontWeight: '600' },
  smallPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minHeight: 40,
    borderRadius: 10,
  },
  smallPrimaryBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  smallOutlineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
  },
  iconBoxBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  iconBadge: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  heroCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  heroAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
  },
  detailTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    minHeight: 40,
    paddingVertical: 7,
    borderRadius: 10,
  },
  tabCountBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 999 },
  memberRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgePillText: { fontSize: 11, fontWeight: '700' },
  emptyBox: {
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  emptyDesc: { fontSize: 13, textAlign: 'center', marginTop: 4, lineHeight: 19 },
  emptyBtnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 12,
  },
  modalSheet: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  toastWrap: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 6,
  },
  toastText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', flex: 1 },
});
