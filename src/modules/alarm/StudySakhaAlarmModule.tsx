/* The supplied module intentionally keeps its animated/ref and hydration patterns. */
/* eslint-disable react-hooks/refs, react-hooks/set-state-in-effect, react-hooks/purity */
import React, {
createContext,
useCallback,
useContext,
useEffect,
useMemo,
useRef,
useState,
} from 'react';
import {
Animated,
Easing,
Modal,
Platform,
Pressable,
SafeAreaView,
ScrollView,
Share,
StatusBar,
StyleSheet,
Text,
TextInput,
Vibration,
View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALARM_STORAGE_KEY, getSecondsUntilAlarm as getStoredSecondsUntilAlarm } from './alarmStorage';
import { consumePendingNativeAlarm, scheduleNativeSnooze, stopNativeAlarm, subscribeToNativeAlarm, syncNativeAlarms } from './alarmNative';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
Circle,
Defs,
Line,
LinearGradient as SvgLinearGradient,
Path,
Polyline,
Polygon,
Rect,
Stop,
Text as SvgText,
} from 'react-native-svg';
import {
AlarmClock,
AlertTriangle,
Award,
BarChart3,
BedDouble,
Bell,
BellOff,
BellRing,
BookOpen,
Brain,
Calculator,
Camera,
CheckCircle2,
ChevronLeft,
Clock,
Copy,
Edit3,
Eye,
FileText,
Flame,
Footprints,
GraduationCap,
History,
Keyboard,
Moon,
MoreVertical,
Music,
Palette,
Pause,
Play,
Plus,
QrCode,
RefreshCw,
RotateCcw,
Search,
Send,
Settings,
Share2,
SkipForward,
Smartphone,
Sparkles,
Sun,
Timer,
Trash2,
User,
UserPlus,
Users,
Vibrate,
Volume2,
X,
Zap,
} from 'lucide-react-native';
// ============================================================================
// 1. TYPES & DATA MODELS
// ============================================================================
export type AlarmCategoryId =
| 'wakeup'
| 'study'
| 'revision'
| 'mocktest'
| 'focus'
| 'personal'
| 'bedtime';
export type MissionId = 'math' | 'memory' | 'shake' | 'typing' | 'qr' | 'photo' | 'steps';
export type MissionDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert';
export type AlarmScreenId =
| 'dashboard'
| 'editor'
| 'ringing'
| 'morning'
| 'sleep'
| 'studyAlarms'
| 'stats'
| 'history'
| 'themes'
| 'settings'
| 'friends';
export interface AlarmItem {
id: string;
hour: number;
minute: number;
title: string;
description: string;
category: AlarmCategoryId;
days: string[];
enabled: boolean;
skippedOnce: boolean;
soundId: string;
volume: number;
gradualVolume: boolean;
vibration: boolean;
vibrationPattern: 'Pulse' | 'Escalating' | 'Strong';
snoozeEnabled: boolean;
snoozeDuration: number;
maxSnooze: number;
snoozeCount?: number;
antiSnooze: boolean;
smartWakeup: boolean;
smartWindow: number;
heavySleeper: boolean;
missions: MissionId[];
missionDifficulty: MissionDifficulty;
missionCount: number;
randomMission: boolean;
missionBeforeSnooze: boolean;
motivationalMsg: string;
spokenMessage: boolean;
flashAlert: boolean;
preventAccidental: boolean;
holidayExclusion: boolean;
linkedModule: 'planner' | 'revision' | 'pyq' | 'mocktest' | 'current_affairs' | 'sleep';
specificDate: string;
sharedWithFriends?: boolean;
}
export interface PlannerTaskItem {
id: string;
time: string;
title: string;
subject: string;
completed: boolean;
alarmId: string | null;
missed: boolean;
}
export interface AlarmHistoryItem {
id: string;
date: string;
time: string;
timestamp?: string;
label: string;
category: AlarmCategoryId;
status: 'Successful' | 'Missed' | 'Snoozed' | 'Skipped';
mission: string;
snoozes: number;
linkedTask: string | null;
}
export interface SleepRecordItem {
day: string;
hours: number;
bedtime: string;
wakeup: string;
quality: number;
}
export interface FriendBuddyItem {
id: string;
name: string;
handle: string;
exam: string;
avatarType: 'circle' | 'square' | 'clover' | 'cloud';
status: string;
statusType: 'awake' | 'snoozing' | 'studying' | 'sleeping';
streak: number;
targetTime: string;
nudged: boolean;
}
export interface AlarmSettingsState {
use24h: boolean;
weekStartsMonday: boolean;
defaultRingtone: string;
defaultVolume: number;
gradualVolume: boolean;
vibration: boolean;
vibrationPattern: 'Pulse' | 'Escalating' | 'Strong';
spokenMessages: boolean;
clockStyle: 'Bold' | 'Minimal' | 'Elegant' | 'Retro';
minimalDisplay: boolean;
defaultSnooze: number;
defaultMission: MissionId;
smartWindow: number;
antiSnooze: boolean;
defaultDuration: number;
notifyUpcoming: boolean;
notifyMissed: boolean;
notifyStudy: boolean;
notifyBedtime: boolean;
timezone: string;
holidayExclusion: boolean;
}
export interface BedtimeConfigState {
enabled: boolean;
bedtime: string;
wakeup: string;
targetHours: number;
windDownMins: number;
ambientSound: string;
}
export interface AlarmThemeConfig {
id: string;
name: string;
group: string;
colors: readonly [string, string, string];
accent: string;
}
export interface StudySakhaAlarmModuleProps {
/* Connects directly to your existing Study Sakha ThemeProvider dark/light flag */
isDarkMode?: boolean;
/* Optional callback to propagate appearance changes back to your host ThemeProvider */
onToggleDarkMode?: (nextDark: boolean) => void;
/* Called when pressing Back on the Alarm Dashboard (e.g. navigation.goBack()) */
onExitToHome?: () => void;
/* Called when launching Study Planner from Good Morning screen */
onOpenStudyPlanner?: () => void;
/* Initial screen inside the Alarm Module (defaults to 'dashboard') */
initialScreen?: AlarmScreenId;
}
// ============================================================================
// 2. STATIC LIBRARIES: CATEGORIES, SOUNDS, FOUR THEMES, MISSIONS, DEMO DATA
// ============================================================================
const ALARM_CATEGORIES: {
id: AlarmCategoryId;
label: string;
color: string;
bg: string;
icon: React.ComponentType<{ size?: number; color?: string }>;
}[] = [
{ id: 'wakeup', label: 'Wake-up', color: '#F59E0B', bg: 'rgba(245,158,11,0.14)', icon: Sun },
{ id: 'study', label: 'Study', color: '#14B8A6', bg: 'rgba(20,184,166,0.14)', icon: BookOpen },
{ id: 'revision', label: 'Revision', color: '#6366F1', bg: 'rgba(99,102,241,0.14)', icon: RefreshCw },
{ id: 'mocktest', label: 'Mock Test', color: '#F43F5E', bg: 'rgba(244,63,94,0.14)', icon: FileText },
{ id: 'focus', label: 'Focus Session', color: '#8B5CF6', bg: 'rgba(139,92,246,0.14)', icon: Timer },
{ id: 'personal', label: 'Personal', color: '#0EA5E9', bg: 'rgba(14,165,233,0.14)', icon: User },
{ id: 'bedtime', label: 'Bedtime', color: '#A855F7', bg: 'rgba(168,85,247,0.14)', icon: BedDouble },
];
const SOUND_LIBRARY = [
{ id: 'sunrise', name: 'Sunrise', category: 'Gentle Wake-up', duration: '0:32' },
{ id: 'morning_birds', name: 'Morning Birds', category: 'Nature Sounds', duration: '0:45' },
{ id: 'soft_piano', name: 'Soft Piano', category: 'Gentle Wake-up', duration: '0:40' },
{ id: 'ocean_waves', name: 'Ocean Waves', category: 'Ambient Sounds', duration: '1:00' },
{ id: 'forest_morning', name: 'Forest Morning', category: 'Nature Sounds', duration: '0:52' },
{ id: 'digital_pulse', name: 'Digital Pulse', category: 'Digital Tones', duration: '0:20' },
{ id: 'classic_bell', name: 'Classic Bell', category: 'Classic Alarm', duration: '0:18' },
{ id: 'gentle_chimes', name: 'Gentle Chimes', category: 'Ambient Sounds', duration: '0:38' },
{ id: 'focus_motivate', name: 'Rise & Conquer', category: 'Motivational Sounds', duration: '0:30' },
];
const SOUND_CATEGORIES = [
'All',
'Classic Alarm',
'Nature Sounds',
'Gentle Wake-up',
'Digital Tones',
'Motivational Sounds',
'Ambient Sounds',
];
const MISSION_TYPES: {
id: MissionId;
name: string;
desc: string;
badge: string;
icon: React.ComponentType<{ size?: number; color?: string }>;
}[] = [
{ id: 'math', name: 'Math Challenge', desc: 'Solve arithmetic equations to dismiss', icon: Calculator, badge: 'Popular' },
{ id: 'memory', name: 'Memory Challenge', desc: 'Repeat the flashing color sequence', icon: Brain, badge: 'Brain Boost' },
{ id: 'shake', name: 'Shake Challenge', desc: 'Shake phone 20–100 times actively', icon: Smartphone, badge: 'Physical' },
{ id: 'typing', name: 'Typing Challenge', desc: 'Type a motivational study affirmation', icon: Keyboard, badge: 'Focus' },
{ id: 'qr', name: 'QR / Barcode Mission', desc: 'Scan a saved barcode away from bed', icon: QrCode, badge: 'Out of Bed' },
{ id: 'photo', name: 'Photo Mission', desc: 'Capture a matching photo of your desk', icon: Camera, badge: 'Visual' },
{ id: 'steps', name: 'Step Challenge', desc: 'Walk target steps to wake your body', icon: Footprints, badge: 'Active' },
];
// Keep the four supplied Study Sakha alarm themes only.
const ALARM_THEMES: AlarmThemeConfig[] = [
{ id: 'starry_sky', name: 'Starry Sky', group: 'Cosmic', colors: ['#090D1F', '#1B1E4B', '#0E132B'], accent: '#818CF8' },
{ id: 'cozy_study', name: 'Cozy Study', group: 'Study', colors: ['#78350F', '#292524', '#0A0A0A'], accent: '#FBBF24' },
{ id: 'midnight_blue', name: 'Midnight Blue', group: 'Dark', colors: ['#172554', '#1E1B4B', '#000000'], accent: '#3B82F6' },
{ id: 'obsidian', name: 'Obsidian', group: 'Dark AMOLED', colors: ['#000000', '#0A0A0A', '#000000'], accent: '#14B8A6' },
];
const DAYS_LIST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const INITIAL_ALARMS: AlarmItem[] = [
{
id: 'alm-1',
hour: 6,
minute: 0,
title: 'Wake Up — RAS Preparation',
description: 'Start the morning with fresh energy and Rajasthan History notes.',
category: 'wakeup',
days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
enabled: true,
skippedOnce: false,
soundId: 'sunrise',
volume: 80,
gradualVolume: true,
vibration: true,
vibrationPattern: 'Escalating',
snoozeEnabled: true,
snoozeDuration: 5,
maxSnooze: 2,
antiSnooze: true,
smartWakeup: true,
smartWindow: 30,
heavySleeper: true,
missions: ['math'],
missionDifficulty: 'Medium',
missionCount: 2,
randomMission: false,
missionBeforeSnooze: false,
motivationalMsg: 'Small steps every morning build extraordinary rank!',
spokenMessage: true,
flashAlert: false,
preventAccidental: true,
holidayExclusion: false,
linkedModule: 'planner',
specificDate: '',
sharedWithFriends: false,
},
{
id: 'alm-2',
hour: 8,
minute: 0,
title: 'Indian Polity Revision',
description: 'Fundamental Rights & Constitutional Amendments (Laxmikanth).',
category: 'revision',
days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
enabled: true,
skippedOnce: false,
soundId: 'soft_piano',
volume: 70,
gradualVolume: true,
vibration: true,
vibrationPattern: 'Pulse',
snoozeEnabled: true,
snoozeDuration: 10,
maxSnooze: 3,
antiSnooze: false,
smartWakeup: false,
smartWindow: 15,
heavySleeper: false,
missions: ['typing'],
missionDifficulty: 'Easy',
missionCount: 1,
randomMission: false,
missionBeforeSnooze: false,
motivationalMsg: 'Revision turns reading into retention.',
spokenMessage: false,
flashAlert: false,
preventAccidental: false,
holidayExclusion: true,
linkedModule: 'revision',
specificDate: '',
sharedWithFriends: false,
},
{
id: 'alm-3',
hour: 16,
minute: 0,
title: 'Geography PYQ Practice (50 Qs)',
description: 'Rajasthan Physical Divisions — Previous Year Questions.',
category: 'study',
days: ['Mon', 'Wed', 'Fri', 'Sat'],
enabled: true,
skippedOnce: false,
soundId: 'gentle_chimes',
volume: 65,
gradualVolume: false,
vibration: true,
vibrationPattern: 'Pulse',
snoozeEnabled: true,
snoozeDuration: 5,
maxSnooze: 2,
antiSnooze: false,
smartWakeup: false,
smartWindow: 15,
heavySleeper: false,
missions: ['memory'],
missionDifficulty: 'Medium',
missionCount: 1,
randomMission: false,
missionBeforeSnooze: false,
motivationalMsg: 'Every PYQ solved is a real exam question mastered.',
spokenMessage: false,
flashAlert: false,
preventAccidental: false,
holidayExclusion: false,
linkedModule: 'pyq',
specificDate: '',
sharedWithFriends: false,
},
{
id: 'alm-4',
hour: 20,
minute: 0,
title: 'RAS Prelims Full Mock Test',
description: '150 Questions · 180 Minutes · Negative Marking Practice.',
category: 'mocktest',
days: ['Sun'],
enabled: true,
skippedOnce: false,
soundId: 'digital_pulse',
volume: 85,
gradualVolume: false,
vibration: true,
vibrationPattern: 'Strong',
snoozeEnabled: false,
snoozeDuration: 5,
maxSnooze: 0,
antiSnooze: true,
smartWakeup: false,
smartWindow: 15,
heavySleeper: true,
missions: ['shake'],
missionDifficulty: 'Medium',
missionCount: 1,
randomMission: false,
missionBeforeSnooze: true,
motivationalMsg: 'Simulate the exam hall today to dominate tomorrow.',
spokenMessage: true,
flashAlert: true,
preventAccidental: true,
holidayExclusion: false,
linkedModule: 'mocktest',
specificDate: '',
sharedWithFriends: false,
},
{
id: 'alm-5',
hour: 22,
minute: 45,
title: 'Wind-down & Bedtime',
description: 'Put phone away, light review, and sleep for 7.5 hours.',
category: 'bedtime',
days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
enabled: false,
skippedOnce: false,
soundId: 'ocean_waves',
volume: 45,
gradualVolume: true,
vibration: false,
vibrationPattern: 'Pulse',
snoozeEnabled: true,
snoozeDuration: 15,
maxSnooze: 1,
antiSnooze: false,
smartWakeup: false,
smartWindow: 15,
heavySleeper: false,
missions: [],
missionDifficulty: 'Easy',
missionCount: 1,
randomMission: false,
missionBeforeSnooze: false,
motivationalMsg: 'Deep sleep consolidates everything you studied today.',
spokenMessage: false,
flashAlert: false,
preventAccidental: false,
holidayExclusion: false,
linkedModule: 'sleep',
specificDate: '',
sharedWithFriends: false,
},
];
const INITIAL_SLEEP_DATA: SleepRecordItem[] = [
{ day: 'Mon', hours: 7.4, bedtime: '10:40 PM', wakeup: '06:05 AM', quality: 88 },
{ day: 'Tue', hours: 6.8, bedtime: '11:15 PM', wakeup: '06:00 AM', quality: 80 },
{ day: 'Wed', hours: 7.6, bedtime: '10:25 PM', wakeup: '06:00 AM', quality: 92 },
{ day: 'Thu', hours: 7.1, bedtime: '10:55 PM', wakeup: '06:00 AM', quality: 85 },
{ day: 'Fri', hours: 7.5, bedtime: '10:30 PM', wakeup: '06:00 AM', quality: 90 },
{ day: 'Sat', hours: 8.1, bedtime: '10:50 PM', wakeup: '06:55 AM', quality: 94 },
{ day: 'Sun', hours: 7.8, bedtime: '10:45 PM', wakeup: '06:30 AM', quality: 91 },
];
const SUGGESTED_STUDY_BUDDIES: FriendBuddyItem[] = [
{ id: 'fr-1', name: 'Aarav Sharma', handle: '@aarav_ras', exam: 'RAS 2026', avatarType: 'circle', status: 'Awake · 05:56 AM', statusType: 'awake', streak: 9, targetTime: '06:00 AM', nudged: false },
{ id: 'fr-2', name: 'Priya Rathore', handle: '@priya_studies', exam: 'RAS Prelims', avatarType: 'square', status: 'Snoozing (5m)', statusType: 'snoozing', streak: 6, targetTime: '06:00 AM', nudged: false },
{ id: 'fr-3', name: 'Vikram Choudhary', handle: '@vikram_jdp', exam: 'REET / RAS', avatarType: 'clover', status: 'Studying Polity', statusType: 'studying', streak: 14, targetTime: '05:45 AM', nudged: false },
{ id: 'fr-4', name: 'Sneha Verma', handle: '@sneha_notes', exam: 'UPSC / RAS', avatarType: 'cloud', status: 'Sleeping · 06:30 AM', statusType: 'sleeping', streak: 4, targetTime: '06:30 AM', nudged: false },
];
const DEFAULT_SETTINGS: AlarmSettingsState = {
use24h: false,
weekStartsMonday: true,
defaultRingtone: 'sunrise',
defaultVolume: 75,
gradualVolume: true,
vibration: true,
vibrationPattern: 'Escalating',
spokenMessages: true,
clockStyle: 'Bold',
minimalDisplay: false,
defaultSnooze: 5,
defaultMission: 'math',
smartWindow: 30,
antiSnooze: true,
defaultDuration: 15,
notifyUpcoming: true,
notifyMissed: true,
notifyStudy: true,
notifyBedtime: true,
timezone: 'IST (Asia/Kolkata)',
holidayExclusion: false,
};
const DEFAULT_BEDTIME: BedtimeConfigState = {
enabled: true,
bedtime: '22:30',
wakeup: '06:00',
targetHours: 7.5,
windDownMins: 30,
ambientSound: 'ocean_waves',
};
// ============================================================================
// 3. HELPER UTILITIES & COLOR PALETTE TOKENS
// ============================================================================
function formatAlarmTime(hour: number, minute: number, use24h = false) {
const mm = String(minute).padStart(2, '0');
if (use24h) {
    return { timeStr: `${String(hour).padStart(2, '0')}:${mm}`, period: '' };
}
const period = hour >= 12 ? 'PM' : 'AM';
const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return { timeStr: `${String(h12).padStart(2, '0')}:${mm}`, period };
}
function formatRepeatLabel(days: string[], specificDate?: string) {
  if (specificDate) return `Date: ${specificDate}`;
if (!days || days.length === 0) return 'Once';
if (days.length === 7) return 'Every day';
const wk = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const we = ['Sat', 'Sun'];
if (days.length === 5 && wk.every((d) => days.includes(d))) return 'Weekdays';
if (days.length === 2 && we.every((d) => days.includes(d))) return 'Weekends';
if (days.length === 6 && !days.includes('Sun')) return 'Mon to Sat';
return days.join(', ');
}
const getSecondsUntilAlarm = getStoredSecondsUntilAlarm;
function formatCountdown(totalSec: number) {
const h = Math.floor(totalSec / 3600);
const m = Math.floor((totalSec % 3600) / 60);
const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}
function getCategoryMeta(catId: AlarmCategoryId) {
return ALARM_CATEGORIES.find((c) => c.id === catId) || ALARM_CATEGORIES[0];
}
function getPalette(dark: boolean) {
return {
bg: dark ? '#020617' : '#F8FAFC',
card: dark ? '#0F172A' : '#FFFFFF',
cardAlt: dark ? '#1E293B' : '#F1F5F9',
border: dark ? '#1E293B' : '#E2E8F0',
borderSubtle: dark ? '#1E293B' : '#F1F5F9',
text: dark ? '#F8FAFC' : '#0F172A',
textSecondary: dark ? '#94A3B8' : '#64748B',
textMuted: dark ? '#64748B' : '#94A3B8',
teal: '#14B8A6',
tealDark: '#0EA5A4',
tealSoft: dark ? 'rgba(20,184,166,0.18)' : 'rgba(20,184,166,0.12)',
rose: '#F43F5E',
amber: '#F59E0B',
indigo: '#6366F1',
charcoal: '#333847',
};
}
// ============================================================================
// 4. REUSABLE NATIVE COMPONENTS (TOGGLE, AVATARS, CHARTS)
// ============================================================================
function CustomToggle({
value,
onChange,
activeColor = '#14B8A6',
dark = false,
}: {
value: boolean;
onChange: (next: boolean) => void;
activeColor?: string;
dark?: boolean;
}) {
return (
<Pressable
onPress={() => onChange(!value)}
accessibilityRole="switch"
accessibilityState={{ checked: value }}
style={[
styles.toggleTrack,
{ backgroundColor: value ? activeColor : dark ? '#334155' : '#E2E8F0' },
]}
>
<View
style={[
styles.toggleThumb,
{ transform: [{ translateX: value ? 20 : 0 }] },
]}
/>
</Pressable>
);
}
function FriendBuddyAvatar({
type = 'circle',
size = 'md',
}: {
type?: 'circle' | 'square' | 'clover' | 'cloud';
size?: 'sm' | 'md' | 'lg';
}) {
const px = size === 'lg' ? 80 : size === 'sm' ? 40 : 48;
if (type === 'square') {
return (
<Svg width={px} height={px} viewBox="0 0 80 80">
<Rect x={6} y={6} width={68} height={68} rx={22} fill="#F59E0B" />
<Circle cx={31} cy={36} r={6} fill="#FFFFFF" />
<Circle cx={49} cy={36} r={6} fill="#FFFFFF" />
<Circle cx={32} cy={37} r={3} fill="#1E293B" />
<Circle cx={50} cy={37} r={3} fill="#1E293B" />
<Path d="M24 33 L38 33 M42 33 L56 33" stroke="#1E293B" strokeWidth={2.5} strokeLinecap="round" />
<Path d="M35 49 Q40 53 45 49" fill="none" stroke="#1E293B" strokeWidth={2.4} strokeLinecap="round" />
</Svg>
);
}
if (type === 'clover') {
return (
<Svg width={px} height={px} viewBox="0 0 80 80">
<Circle cx={26} cy={26} r={20} fill="#F59E0B" />
<Circle cx={54} cy={26} r={20} fill="#F59E0B" />
<Circle cx={26} cy={54} r={20} fill="#F59E0B" />
<Circle cx={54} cy={54} r={20} fill="#F59E0B" />
<Rect x={24} y={24} width={32} height={32} fill="#F59E0B" />
<Circle cx={32} cy={35} r={6.5} fill="#FFFFFF" />
<Circle cx={48} cy={35} r={6.5} fill="#FFFFFF" />
<Circle cx={33.5} cy={35} r={3.4} fill="#1E293B" />
<Circle cx={49.5} cy={35} r={3.4} fill="#1E293B" />
<Rect x={31} y={46} width={18} height={7} rx={3.5} fill="#FFFFFF" stroke="#1E293B" strokeWidth={1.8} />
<Line x1={37} y1={46} x2={37} y2={53} stroke="#1E293B" strokeWidth={1.2} />
<Line x1={43} y1={46} x2={43} y2={53} stroke="#1E293B" strokeWidth={1.2} />
</Svg>
);
}
if (type === 'cloud') {
return (
<Svg width={px} height={px} viewBox="0 0 80 80">
<Rect x={14} y={8} width={52} height={64} rx={14} fill="#333847" />
<Circle cx={16} cy={22} r={12} fill="#333847" />
<Circle cx={64} cy={22} r={12} fill="#333847" />
<Circle cx={16} cy={40} r={12} fill="#333847" />
<Circle cx={64} cy={40} r={12} fill="#333847" />
<Circle cx={16} cy={58} r={12} fill="#333847" />
<Circle cx={64} cy={58} r={12} fill="#333847" />
<Circle cx={32} cy={34} r={6.5} fill="#FFFFFF" />
<Circle cx={48} cy={34} r={6.5} fill="#FFFFFF" />
<Circle cx={33.5} cy={34} r={3.4} fill="#0F172A" />
<Circle cx={49.5} cy={34} r={3.4} fill="#0F172A" />
<Path d="M33 46 Q40 54 47 46 Z" fill="#1E293B" />
<Path d="M36 49 Q40 53 44 49" fill="#FB7185" />
</Svg>
);
}
return (
<Svg width={px} height={px} viewBox="0 0 80 80">
<Circle cx={40} cy={40} r={34} fill="#333847" />
<Circle cx={33} cy={35} r={6.5} fill="#FFFFFF" />
<Circle cx={47} cy={35} r={6.5} fill="#FFFFFF" />
<Circle cx={34.5} cy={35} r={3.4} fill="#0F172A" />
<Circle cx={48.5} cy={35} r={3.4} fill="#0F172A" />
<Path d="M29 47 Q40 55 51 47" fill="none" stroke="#1E293B" strokeWidth={2.5} strokeLinecap="round" />
</Svg>
);
}
// Native SVG Sleep Duration Bar Chart (zero brittle chart library dependencies)
function NativeSleepBarChart({ data, dark }: { data: SleepRecordItem[]; dark: boolean }) {
const chartW = 310;
const chartH = 150;
const barSlot = chartW / data.length;
const maxVal = 10;
return (
  <Svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`}>
{[2, 4, 6, 8].map((tick) => {
const y = chartH - 24 - (tick / maxVal) * (chartH - 36);
return (
<Line
key={tick}
x1={0}
y1={y}
x2={chartW}
y2={y}
stroke={dark ? '#1E293B' : '#E2E8F0'}
strokeDasharray="3 3"
/>
);
})}
{data.map((d, idx) => {
const h = (d.hours / maxVal) * (chartH - 36);
const x = idx * barSlot + barSlot * 0.22;
const w = barSlot * 0.56;
const y = chartH - 24 - h;
return (
<React.Fragment key={d.day}>
<Rect
x={x}
y={y}
width={w}
height={h}
rx={6}
fill={d.hours >= 7 ? '#6366F1' : '#F59E0B'}
/>
<SvgText
x={x + w / 2}
y={y - 5}
fontSize={9}
fontWeight="700"
fill={dark ? '#94A3B8' : '#64748B'}
textAnchor="middle"
>
{d.hours}h
</SvgText>
<SvgText
x={x + w / 2}
y={chartH - 7}
fontSize={10}
fontWeight="600"
fill={dark ? '#94A3B8' : '#64748B'}
textAnchor="middle"
>
{d.day}
</SvgText>
</React.Fragment>
);
})}
</Svg>
);
}
// Native SVG Grouped Bar Chart (Successful vs Missed)
function NativeSuccessMissedChart({
data,
dark,
}: {
data: { day: string; success: number; missed: number }[];
dark: boolean;
}) {
const chartW = 310;
const chartH = 150;
const slot = chartW / data.length;
const maxVal = Math.max(4, ...data.map((d) => Math.max(d.success, d.missed)));
return (
  <Svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`}>
{[1, 2, 3].map((tick) => {
const y = chartH - 24 - (tick / maxVal) * (chartH - 36);
return (
<Line
key={tick}
x1={0}
y1={y}
x2={chartW}
y2={y}
stroke={dark ? '#1E293B' : '#E2E8F0'}
strokeDasharray="3 3"
/>
);
})}
{data.map((d, idx) => {
const sH = Math.max(2, (d.success / maxVal) * (chartH - 36));
const mH = d.missed > 0 ? Math.max(4, (d.missed / maxVal) * (chartH - 36)) : 0;
const baseX = idx * slot + slot * 0.16;
const barW = slot * 0.3;
return (
<React.Fragment key={d.day}>
<Rect
x={baseX}
y={chartH - 24 - sH}
width={barW}
height={sH}
rx={4}
fill="#14B8A6"
/>
{mH > 0 && (
<Rect
x={baseX + barW + 3}
y={chartH - 24 - mH}
width={barW}
height={mH}
rx={4}
fill="#F43F5E"
/>
)}
<SvgText
x={idx * slot + slot / 2}
y={chartH - 7}
fontSize={10}
fontWeight="600"
fill={dark ? '#94A3B8' : '#64748B'}
textAnchor="middle"
>
{d.day}
</SvgText>
</React.Fragment>
);
})}
</Svg>
);
}
// Native SVG Area Chart (Weekly Snooze Frequency)
function NativeSnoozeAreaChart({
data,
dark,
}: {
data: { day: string; snoozes: number }[];
dark: boolean;
}) {
const chartW = 310;
const chartH = 125;
const maxVal = Math.max(3, ...data.map((d) => d.snoozes));
const stepX = (chartW - 24) / Math.max(1, data.length - 1);
const points = data.map((d, idx) => {
const x = 12 + idx * stepX;
const y = chartH - 26 - (d.snoozes / maxVal) * (chartH - 42);
return { x, y, label: d.day };
});
  const polylinePts = points.map((p) => `${p.x},${p.y}`).join(' ');
  const polygonPts = `12,${chartH - 26} ${polylinePts} ${points[points.length - 1].x},${chartH - 26}`;
return (
  <Svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`}>
<Defs>
<SvgLinearGradient id="snoozeGrad" x1="0" y1="0" x2="0" y2="1">
<Stop offset="0" stopColor="#F59E0B" stopOpacity="0.38" />
<Stop offset="1" stopColor="#F59E0B" stopOpacity="0.02" />
</SvgLinearGradient>
</Defs>
<Polygon points={polygonPts} fill="url(#snoozeGrad)" />
<Polyline points={polylinePts} fill="none" stroke="#F59E0B" strokeWidth={2.5} />
{points.map((p) => (
<React.Fragment key={p.label}>
<Circle cx={p.x} cy={p.y} r={3.5} fill="#F59E0B" />
<SvgText
x={p.x}
y={chartH - 7}
fontSize={10}
fontWeight="600"
fill={dark ? '#94A3B8' : '#64748B'}
textAnchor="middle"
>
{p.label}
</SvgText>
</React.Fragment>
))}
</Svg>
);
}
// ============================================================================
// 5. HEAVY SLEEPER INTERACTIVE MISSION RUNNER (ALL 7 MISSIONS)
// ============================================================================
function HeavySleeperMissionModal({
alarm,
activeTheme,
onComplete,
onEmergencyExit,
modeLabel = 'Dismiss Alarm',
}: {
alarm: AlarmItem;
activeTheme: AlarmThemeConfig;
onComplete: (missionName: string) => void;
onEmergencyExit: () => void;
modeLabel?: string;
}) {
const missionList: MissionId[] =
alarm.missions && alarm.missions.length > 0 ? alarm.missions : ['math'];
const [missionIdx, setMissionIdx] = useState(0);
const currentMissionId: MissionId = alarm.randomMission
? missionList[missionIdx % missionList.length]
: missionList[missionIdx] || 'math';
const totalSteps = Math.max(1, alarm.missionCount || 1);
const [stepCount, setStepCount] = useState(0);
const [showEmergency, setShowEmergency] = useState(false);
// Mission 1: Math
const generateMathProblem = useCallback((diff: MissionDifficulty) => {
if (diff === 'Easy') {
const a = Math.floor(Math.random() * 15) + 5;
const b = Math.floor(Math.random() * 15) + 4;
      return { q: `${a} + ${b}`, ans: a + b };
}
if (diff === 'Medium') {
const a = Math.floor(Math.random() * 20) + 12;
const b = Math.floor(Math.random() * 8) + 3;
      return { q: `${a} × ${b}`, ans: a * b };
}
if (diff === 'Hard') {
const a = Math.floor(Math.random() * 25) + 15;
const b = Math.floor(Math.random() * 9) + 4;
const c = Math.floor(Math.random() * 40) + 10;
      return { q: `${a} × ${b} + ${c}`, ans: a * b + c };
}
const a = Math.floor(Math.random() * 19) + 13;
const b = Math.floor(Math.random() * 14) + 11;
const c = Math.floor(Math.random() * 35) + 15;
    return { q: `(${a} × ${b}) - ${c}`, ans: a * b - c };
}, []);
const [mathProblem, setMathProblem] = useState(() =>
generateMathProblem(alarm.missionDifficulty || 'Medium')
);
const [mathInput, setMathInput] = useState('');
const [mathError, setMathError] = useState(false);
// Mission 2: Memory
const [memSeq, setMemSeq] = useState<number[]>([0, 4, 8, 2]);
const [memPhase, setMemPhase] = useState<'showing' | 'input' | 'success'>('showing');
const [memHighlight, setMemHighlight] = useState(-1);
const [memUserInput, setMemUserInput] = useState<number[]>([]);
const [memError, setMemError] = useState(false);
useEffect(() => {
if (currentMissionId !== 'memory') return;
const len =
alarm.missionDifficulty === 'Easy' ? 3 : alarm.missionDifficulty === 'Hard' ? 5 : 4;
const seq = Array.from({ length: len }, () => Math.floor(Math.random() * 9));
setMemSeq(seq);
setMemUserInput([]);
setMemPhase('showing');
let i = 0;
const iv = setInterval(() => {
if (i < seq.length) {
setMemHighlight(seq[i]);
setTimeout(() => setMemHighlight(-1), 420);
i++;
} else {
clearInterval(iv);
setMemPhase('input');
}
}, 680);
return () => clearInterval(iv);
}, [currentMissionId, stepCount, alarm.missionDifficulty]);
// Mission 3: Shake
const shakeTarget =
alarm.missionDifficulty === 'Easy'
? 20
: alarm.missionDifficulty === 'Hard'
? 60
: alarm.missionDifficulty === 'Expert'
? 100
: 40;
const [shakes, setShakes] = useState(0);
// Mission 4: Typing
const sentences = [
'Small steps every day lead to massive success.',
'Consistency beats intensity in RAS preparation.',
'Wake up with determination and study with focus.',
];
const targetSentence = sentences[stepCount % sentences.length];
const [typedText, setTypedText] = useState('');
// Mission 5: QR
const [qrScanning, setQrScanning] = useState(false);
const [qrProgress, setQrProgress] = useState(0);
// Mission 6: Photo
const [photoCapturing, setPhotoCapturing] = useState(false);
const [photoMatch, setPhotoMatch] = useState(0);
// Mission 7: Steps
const stepsTarget =
alarm.missionDifficulty === 'Easy' ? 15 : alarm.missionDifficulty === 'Hard' ? 40 : 25;
const [walkedSteps, setWalkedSteps] = useState(0);
const missionMeta = MISSION_TYPES.find((m) => m.id === currentMissionId) || MISSION_TYPES[0];
const MissionIcon = missionMeta.icon;
const advanceMission = () => {
const nextStep = stepCount + 1;
if (nextStep < totalSteps) {
setStepCount(nextStep);
setMathProblem(generateMathProblem(alarm.missionDifficulty || 'Medium'));
setMathInput('');
setTypedText('');
setShakes(0);
setWalkedSteps(0);
if (missionList.length > 1) {
setMissionIdx((prev) => (prev + 1) % missionList.length);
}
} else {
onComplete(missionMeta.name);
}
};
const handleMathVerify = () => {
if (parseInt(mathInput, 10) === mathProblem.ans) {
setMathError(false);
advanceMission();
} else {
setMathError(true);
setMathInput('');
Vibration.vibrate(120);
}
};
const handleMemoryTap = (idx: number) => {
if (memPhase !== 'input') return;
const next = [...memUserInput, idx];
const pos = next.length - 1;
if (memSeq[pos] !== idx) {
setMemError(true);
setMemUserInput([]);
Vibration.vibrate(120);
setTimeout(() => setMemError(false), 600);
return;
}
setMemUserInput(next);
if (next.length === memSeq.length) {
setMemPhase('success');
setTimeout(() => advanceMission(), 450);
}
};
const triggerShake = (amount = 5) => {
Vibration.vibrate(40);
setShakes((prev) => {
const next = Math.min(shakeTarget, prev + amount);
if (next >= shakeTarget) setTimeout(() => advanceMission(), 300);
return next;
});
};
const triggerQrScan = () => {
if (qrScanning) return;
setQrScanning(true);
setQrProgress(20);
const iv = setInterval(() => {
setQrProgress((p) => {
if (p >= 100) {
clearInterval(iv);
setTimeout(() => advanceMission(), 300);
return 100;
}
return p + 25;
});
}, 300);
};
const triggerPhotoMatch = () => {
if (photoCapturing) return;
setPhotoCapturing(true);
setPhotoMatch(32);
setTimeout(() => setPhotoMatch(74), 400);
setTimeout(() => setPhotoMatch(96), 850);
setTimeout(() => advanceMission(), 1300);
};
const triggerStep = (amt = 5) => {
Vibration.vibrate(30);
setWalkedSteps((prev) => {
const next = Math.min(stepsTarget, prev + amt);
if (next >= stepsTarget) setTimeout(() => advanceMission(), 300);
return next;
});
};
return (
<LinearGradient colors={[...activeTheme.colors]} style={styles.fullScreen}>
<SafeAreaView style={{ flex: 1 }}>
<ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', padding: 20 }}>
<View>
{/* Header pills */}
<View style={styles.rowBetween}>
<View style={styles.glassPill}>
<MissionIcon size={15} color="#FFFFFF" />
<Text style={styles.glassPillText}>
{missionMeta.name} · {stepCount + 1}/{totalSteps}
</Text>
</View>
<View style={[styles.glassPill, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
<Text style={styles.glassPillText}>{alarm.missionDifficulty || 'Medium'}</Text>
</View>
</View>
<View style={{ alignItems: 'center', marginTop: 18, marginBottom: 20 }}>
<Text style={styles.missionSubheading}>
HEAVY SLEEPER MODE · {modeLabel.toUpperCase()}
</Text>
<Text style={styles.missionHeading}>{alarm.title}</Text>
</View>
{/* Mission Card */}
<View style={styles.missionCard}>
{/* 1. MATH */}
{currentMissionId === 'math' && (
<View style={{ gap: 14 }}>
<View style={styles.mathBox}>
<Text style={styles.whiteMuted12}>Solve to silence alarm</Text>
<Text style={styles.mathQuestion}>{mathProblem.q} = ?</Text>
</View>
<TextInput
keyboardType="number-pad"
value={mathInput}
onChangeText={setMathInput}
placeholder="Enter answer..."
placeholderTextColor="rgba(255,255,255,0.5)"
style={[
styles.mathInput,
mathError && { borderColor: '#FB7185' },
]}
onSubmitEditing={handleMathVerify}
/>
{mathError && (
<Text style={{ textAlign: 'center', color: '#FDA4AF', fontSize: 12, fontWeight: '600' }}>
Incorrect answer — try again!
</Text>
)}
<Pressable onPress={handleMathVerify} style={styles.tealPrimaryBtn}>
<Text style={styles.tealPrimaryBtnText}>Verify Answer</Text>
</Pressable>
</View>
)}
{/* 2. MEMORY */}
{currentMissionId === 'memory' && (
<View style={{ gap: 16, alignItems: 'center' }}>
<Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
{memPhase === 'showing'
? 'Watch the glowing tiles carefully...'
: memPhase === 'success'
? 'Sequence Matched!'
          : `Tap ${memSeq.length - memUserInput.length} remaining tile(s) in order`}
</Text>
<View style={styles.memoryGrid}>
{Array.from({ length: 9 }).map((_, idx) => {
const isGlowing = memHighlight === idx;
const isSelected = memUserInput.includes(idx);
return (
<Pressable
key={idx}
onPress={() => handleMemoryTap(idx)}
style={[
styles.memoryTile,
isGlowing && { backgroundColor: '#2DD4BF', borderColor: '#FFFFFF' },
isSelected && !isGlowing && { backgroundColor: 'rgba(20,184,166,0.5)', borderColor: '#5EEAD4' },
memError && { backgroundColor: 'rgba(244,63,94,0.45)', borderColor: '#FDA4AF' },
]}
/>
);
})}
</View>
</View>
)}
{/* 3. SHAKE */}
{currentMissionId === 'shake' && (
<View style={{ alignItems: 'center', gap: 14 }}>
<View style={styles.circleCounter}>
<Smartphone size={28} color="#5EEAD4" />
<Text style={styles.circleCounterText}>
{shakes}/{shakeTarget}
</Text>
</View>
<View style={styles.progressTrackWhite}>
<View
style={[
styles.progressFillTeal,
            { width: `${Math.min(100, (shakes / shakeTarget) * 100)}%` },
]}
/>
</View>
<Text style={styles.whiteMuted12}>
Simulated motion sensor: tap rapidly to shake your device
</Text>
<View style={styles.rowGap10}>
<Pressable onPress={() => triggerShake(5)} style={[styles.tealPrimaryBtn, { flex: 1 }]}>
<Text style={styles.tealPrimaryBtnText}>Shake (+5)</Text>
</Pressable>
<Pressable onPress={() => triggerShake(15)} style={[styles.glassBtn, { flex: 1 }]}>
<Text style={styles.glassBtnText}>Power (+15)</Text>
</Pressable>
</View>
</View>
)}
{/* 4. TYPING */}
{currentMissionId === 'typing' && (
<View style={{ gap: 14 }}>
<View style={styles.mathBox}>
<Text style={{ color: '#FFFFFF', fontSize: 14, lineHeight: 21, fontWeight: '600' }}>
{targetSentence}
</Text>
</View>
<TextInput
multiline
numberOfLines={3}
value={typedText}
onChangeText={(val) => {
setTypedText(val);
if (val.trim().toLowerCase() === targetSentence.toLowerCase()) {
setTimeout(() => advanceMission(), 250);
}
}}
placeholder="Type the sentence above..."
placeholderTextColor="rgba(255,255,255,0.5)"
style={styles.typingInput}
/>
<Pressable
onPress={() => {
setTypedText(targetSentence);
setTimeout(() => advanceMission(), 300);
}}
style={styles.glassBtn}
>
<Text style={styles.glassBtnText}>Auto-fill Prototype Demo Text</Text>
</Pressable>
</View>
)}
{/* 5. QR / BARCODE */}
{currentMissionId === 'qr' && (
<View style={{ alignItems: 'center', gap: 14 }}>
<View style={styles.qrFrame}>
<QrCode size={72} color="rgba(255,255,255,0.45)" />
<Text style={{ color: '#99F6E4', fontSize: 12, fontWeight: '600', marginTop: 10 }}>
          {qrScanning ? `Matching Study Desk QR... ${qrProgress}%` : 'Saved Code: Study Desk Book'}
</Text>
</View>
<Pressable onPress={triggerQrScan} style={[styles.tealPrimaryBtn, { width: '100%' }]}>
<Text style={styles.tealPrimaryBtnText}>
{qrScanning ? 'Verifying Barcode...' : 'Simulate QR Scan'}
</Text>
</Pressable>
</View>
)}
{/* 6. PHOTO */}
{currentMissionId === 'photo' && (
<View style={{ gap: 14 }}>
<View style={[styles.rowBetween, styles.mathBox, { paddingHorizontal: 14 }]}>
<View>
<Text style={styles.whiteMuted12}>Reference Object</Text>
<Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Study Desk & Lamp</Text>
</View>
<View style={[styles.glassPill, { backgroundColor: 'rgba(20,184,166,0.3)' }]}>
<Text style={{ color: '#99F6E4', fontSize: 11, fontWeight: '700' }}>
          {photoMatch > 0 ? `${photoMatch}% Match` : 'Required > 85%'}
</Text>
</View>
</View>
<View style={styles.photoFrame}>
<Camera size={36} color="#5EEAD4" />
<Text style={styles.whiteMuted12}>
{photoCapturing ? 'Analyzing reference scene...' : 'Simulated Camera Viewfinder'}
</Text>
</View>
<Pressable onPress={triggerPhotoMatch} style={styles.tealPrimaryBtn}>
<Text style={styles.tealPrimaryBtnText}>
{photoCapturing ? 'Matching Photo...' : 'Capture Reference Photo'}
</Text>
</Pressable>
</View>
)}
{/* 7. STEPS */}
{currentMissionId === 'steps' && (
<View style={{ alignItems: 'center', gap: 14 }}>
<View style={styles.circleCounter}>
<Footprints size={28} color="#5EEAD4" />
<Text style={styles.circleCounterText}>
{walkedSteps}/{stepsTarget}
</Text>
</View>
<View style={styles.progressTrackWhite}>
<View
style={[
styles.progressFillTeal,
            { width: `${Math.min(100, (walkedSteps / stepsTarget) * 100)}%` },
]}
/>
</View>
<Text style={styles.whiteMuted12}>Walk out of bed · Simulated activity pedometer</Text>
<Pressable onPress={() => triggerStep(5)} style={[styles.tealPrimaryBtn, { width: '100%' }]}>
<Text style={styles.tealPrimaryBtnText}>Simulate Walking (+5 Steps)</Text>
</Pressable>
</View>
)}
</View>
</View>
{/* Accessibility / Emergency Exit */}
<View style={{ marginTop: 20, alignItems: 'center' }}>
{!showEmergency ? (
<Pressable onPress={() => setShowEmergency(true)} style={{ padding: 8 }}>
<Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, textDecorationLine: 'underline' }}>
Need accessibility or emergency exit?
</Text>
</Pressable>
) : (
<View style={styles.emergencyBox}>
<Text style={{ color: '#FFFFFF', fontSize: 12, textAlign: 'center', marginBottom: 10 }}>
Accessibility fallback lets you safely dismiss this alarm without completing the mission.
</Text>
<View style={styles.rowGap10}>
<Pressable onPress={() => setShowEmergency(false)} style={[styles.glassBtn, { flex: 1, paddingVertical: 10 }]}>
<Text style={styles.glassBtnText}>Keep Mission</Text>
</Pressable>
<Pressable
onPress={onEmergencyExit}
style={[styles.tealPrimaryBtn, { flex: 1, paddingVertical: 10, backgroundColor: '#F43F5E' }]}
>
<Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Emergency Dismiss</Text>
</Pressable>
</View>
</View>
)}
</View>
</ScrollView>
</SafeAreaView>
</LinearGradient>
);
}
// ============================================================================
// 6. PERSISTENT ALARM STORE CONTEXT (ASYNCSTORAGE BACKED)
// ============================================================================
interface AlarmStoreValue {
alarms: AlarmItem[];
setAlarms: React.Dispatch<React.SetStateAction<AlarmItem[]>>;
plannerTasks: PlannerTaskItem[];
setPlannerTasks: React.Dispatch<React.SetStateAction<PlannerTaskItem[]>>;
history: AlarmHistoryItem[];
setHistory: React.Dispatch<React.SetStateAction<AlarmHistoryItem[]>>;
friends: FriendBuddyItem[];
setFriends: React.Dispatch<React.SetStateAction<FriendBuddyItem[]>>;
studyStreak: number;
setStudyStreak: React.Dispatch<React.SetStateAction<number>>;
activeThemeId: string;
setActiveThemeId: React.Dispatch<React.SetStateAction<string>>;
themeAnimated: boolean;
setThemeAnimated: React.Dispatch<React.SetStateAction<boolean>>;
themeIntensity: number;
setThemeIntensity: React.Dispatch<React.SetStateAction<number>>;
settings: AlarmSettingsState;
setSettings: React.Dispatch<React.SetStateAction<AlarmSettingsState>>;
bedtimeConfig: BedtimeConfigState;
setBedtimeConfig: React.Dispatch<React.SetStateAction<BedtimeConfigState>>;
hydrated: boolean;
}
const AlarmStoreContext = createContext<AlarmStoreValue | null>(null);
export function AlarmStoreProvider({ children }: { children: React.ReactNode }) {
const [alarms, setAlarms] = useState<AlarmItem[]>([]);
const [plannerTasks, setPlannerTasks] = useState<PlannerTaskItem[]>([]);
const [history, setHistory] = useState<AlarmHistoryItem[]>([]);
const [friends, setFriends] = useState<FriendBuddyItem[]>([]);
const [studyStreak, setStudyStreak] = useState<number>(0);
const [activeThemeId, setActiveThemeId] = useState<string>('starry_sky');
const [themeAnimated, setThemeAnimated] = useState<boolean>(true);
const [themeIntensity, setThemeIntensity] = useState<number>(85);
const [settings, setSettings] = useState<AlarmSettingsState>(DEFAULT_SETTINGS);
const [bedtimeConfig, setBedtimeConfig] = useState<BedtimeConfigState>(DEFAULT_BEDTIME);
const [hydrated, setHydrated] = useState<boolean>(false);
// Hydrate persisted Alarm Module state from AsyncStorage on mount
useEffect(() => {
let mounted = true;
(async () => {
try {
const raw = await AsyncStorage.getItem(ALARM_STORAGE_KEY);
if (raw && mounted) {
const parsed = JSON.parse(raw);
if (Array.isArray(parsed.alarms)) setAlarms(parsed.alarms);
if (Array.isArray(parsed.plannerTasks)) setPlannerTasks(parsed.plannerTasks);
if (Array.isArray(parsed.history)) setHistory(parsed.history);
if (Array.isArray(parsed.friends)) setFriends(parsed.friends);
if (typeof parsed.studyStreak === 'number') setStudyStreak(parsed.studyStreak);
if (typeof parsed.activeThemeId === 'string') setActiveThemeId(parsed.activeThemeId);
if (typeof parsed.themeAnimated === 'boolean') setThemeAnimated(parsed.themeAnimated);
if (typeof parsed.themeIntensity === 'number') setThemeIntensity(parsed.themeIntensity);
if (parsed.settings) setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
if (parsed.bedtimeConfig) setBedtimeConfig({ ...DEFAULT_BEDTIME, ...parsed.bedtimeConfig });
}
} catch {
// Fallback to initial demo state if storage is unavailable
} finally {
if (mounted) setHydrated(true);
}
})();
return () => {
mounted = false;
};
}, []);
// Persist changes to AsyncStorage
useEffect(() => {
if (!hydrated) return;
AsyncStorage.setItem(
ALARM_STORAGE_KEY,
JSON.stringify({
alarms,
plannerTasks,
history,
friends,
studyStreak,
activeThemeId,
themeAnimated,
themeIntensity,
settings,
bedtimeConfig,
})
).catch(() => {});
}, [
hydrated,
alarms,
plannerTasks,
history,
friends,
studyStreak,
activeThemeId,
themeAnimated,
themeIntensity,
settings,
bedtimeConfig,
]);
const value = useMemo(
() => ({
alarms,
setAlarms,
plannerTasks,
setPlannerTasks,
history,
setHistory,
friends,
setFriends,
studyStreak,
setStudyStreak,
activeThemeId,
setActiveThemeId,
themeAnimated,
setThemeAnimated,
themeIntensity,
setThemeIntensity,
settings,
setSettings,
bedtimeConfig,
setBedtimeConfig,
hydrated,
}),
[
alarms,
plannerTasks,
history,
friends,
studyStreak,
activeThemeId,
themeAnimated,
themeIntensity,
settings,
bedtimeConfig,
hydrated,
]
);
return <AlarmStoreContext.Provider value={value}>{children}</AlarmStoreContext.Provider>;
}
export function useAlarmStore() {
const ctx = useContext(AlarmStoreContext);
if (!ctx) throw new Error('useAlarmStore must be used inside AlarmStoreProvider');
return ctx;
}
// ============================================================================
// 7. MAIN ALARM MODULE IMPLEMENTATION (STRICTLY SCOPED — NO HOME SCREEN)
// ============================================================================
function AlarmModuleInner({
isDarkMode,
onToggleDarkMode,
onExitToHome,
onOpenStudyPlanner,
initialScreen = 'dashboard',
}: StudySakhaAlarmModuleProps) {
const {
alarms,
setAlarms,
plannerTasks,
setPlannerTasks,
history,
setHistory,
friends,
setFriends,
studyStreak,
setStudyStreak,
activeThemeId,
setActiveThemeId,
themeAnimated,
setThemeAnimated,
themeIntensity,
setThemeIntensity,
settings,
setSettings,
bedtimeConfig,
setBedtimeConfig,
hydrated,
} = useAlarmStore();
const [localDark, setLocalDark] = useState(Boolean(isDarkMode));
const darkMode = isDarkMode !== undefined ? isDarkMode : localDark;
const setDarkMode = (next: boolean) => {
setLocalDark(next);
if (onToggleDarkMode) onToggleDarkMode(next);
};
const P = useMemo(() => getPalette(darkMode), [darkMode]);
const [activeScreen, setActiveScreen] = useState<AlarmScreenId>(initialScreen);
const [editingAlarm, setEditingAlarm] = useState<AlarmItem | null>(null);
const [ringingAlarm, setRingingAlarm] = useState<AlarmItem | null>(null);
const [dismissedAlarm, setDismissedAlarm] = useState<AlarmItem | null>(null);
const [missionRunnerMode, setMissionRunnerMode] = useState<'dismiss' | 'snooze' | null>(null);
const [snoozedBanner, setSnoozedBanner] = useState<{
alarmTitle: string;
mins: number;
secondsLeft: number;
} | null>(null);
const [dashboardCategory, setDashboardCategory] = useState<'all' | AlarmCategoryId>('all');
const [openMenuId, setOpenMenuId] = useState<string | null>(null);
const [previewSoundId, setPreviewSoundId] = useState<string | null>(null);
const [toastMsg, setToastMsg] = useState<string | null>(null);
// Sub-screen states
const [soundFilterCat, setSoundFilterCat] = useState('All');
const [studySubTab, setStudySubTab] = useState<'planner' | 'revision' | 'pyq' | 'mocktest' | 'current' | 'exam'>('planner');
const [examTarget, setExamTarget] = useState({ name: 'RAS Prelims 2026', date: '2026-12-27', m30: true, m15: true, m7: true, m1: true });
const [historyFilter, setHistoryFilter] = useState('All');
const [historySearch, setHistorySearch] = useState('');
// Modals
const [showSaveConfirm, setShowSaveConfirm] = useState(false);
const [showResetConfirm, setShowResetConfirm] = useState(false);
const [showAddTaskModal, setShowAddTaskModal] = useState(false);
const [showFocusCenterModal, setShowFocusCenterModal] = useState(false);
const [showInviteFriendModal, setShowInviteFriendModal] = useState(false);
// Modal Form Inputs
const [newTaskTitle, setNewTaskTitle] = useState('');
const [newTaskTime, setNewTaskTime] = useState('07:00');
const [newTaskSubject, setNewTaskSubject] = useState('Rajasthan History');
const [inviteInput, setInviteInput] = useState('');
// Live Clock & Ringing Pulse Animation
const [now, setNow] = useState(() => new Date());
const pulseAnim = useRef(new Animated.Value(0)).current;
useEffect(() => {
const iv = setInterval(() => {
setNow(new Date());
setSnoozedBanner((prev) => {
if (!prev) return null;
if (prev.secondsLeft <= 1) return null;
return { ...prev, secondsLeft: prev.secondsLeft - 1 };
});
}, 1000);
return () => clearInterval(iv);
}, []);
useEffect(() => {
if (activeScreen === 'ringing' && themeAnimated) {
const loop = Animated.loop(
Animated.timing(pulseAnim, {
toValue: 1,
duration: 2400,
easing: Easing.out(Easing.ease),
useNativeDriver: true,
})
);
loop.start();
return () => loop.stop();
}
pulseAnim.setValue(0);
return undefined;
}, [activeScreen, themeAnimated, pulseAnim]);
useEffect(() => {
if (activeScreen !== 'ringing') {
Vibration.cancel();
}
}, [activeScreen]);
const showToast = useCallback((msg: string) => {
setToastMsg(msg);
setTimeout(() => setToastMsg(null), 2600);
}, []);
const activeTheme = useMemo(
() => ALARM_THEMES.find((t) => t.id === activeThemeId) || ALARM_THEMES[0],
[activeThemeId]
);
const activeAlarms = useMemo(
() => alarms.filter((a) => a.enabled && !a.skippedOnce),
[alarms]
);
const nextAlarm = useMemo(() => {
if (activeAlarms.length === 0) return null;
return activeAlarms
  .map((alarm) => ({ alarm, seconds: getSecondsUntilAlarm(alarm, now) }))
  .filter((entry) => Number.isFinite(entry.seconds))
  .sort((a, b) => a.seconds - b.seconds)[0]?.alarm || null;
}, [activeAlarms, now]);
const nextAlarmCountdown = useMemo(
() => (nextAlarm ? formatCountdown(getSecondsUntilAlarm(nextAlarm, now)) : null),
[nextAlarm, now]
);
useEffect(() => {
if (!hydrated) return;
void syncNativeAlarms(alarms, settings).catch(() => {});
}, [alarms, hydrated, settings]);
const analytics = useMemo(() => {
const total = history.length;
const successful = history.filter((h) => h.status === 'Successful').length;
const missed = history.filter((h) => h.status === 'Missed').length;
const totalSnoozes = history.reduce((acc, h) => acc + (h.snoozes || 0), 0);
const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;
const studyItems = history.filter((h) => ['study', 'revision', 'mocktest', 'focus'].includes(h.category));
const studySuccess = studyItems.filter((h) => h.status === 'Successful').length;
const studyRate = studyItems.length > 0 ? Math.round((studySuccess / studyItems.length) * 100) : 0;
return {
successful,
missed,
totalSnoozes,
successRate,
studyRate,
avgWakeup: (() => {
const successfulTimes = history
  .filter((h) => h.status === 'Successful')
  .map((h) => h.time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i))
  .filter((match): match is RegExpMatchArray => Boolean(match))
  .map((match) => {
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    if (match[3]?.toUpperCase() === 'PM' && hour < 12) hour += 12;
    if (match[3]?.toUpperCase() === 'AM' && hour === 12) hour = 0;
    return hour * 60 + minute;
  });
if (successfulTimes.length === 0) return '—';
const average = Math.round(successfulTimes.reduce((sum, value) => sum + value, 0) / successfulTimes.length);
return `${String(Math.floor(average / 60)).padStart(2, '0')}:${String(average % 60).padStart(2, '0')}`;
})(),
streak: studyStreak,
};
}, [history, studyStreak]);
// --- Sound Preview Simulation (tactile + visual playback state; hook expo-av Sound here for bundled MP3s) ---
const toggleSoundPreview = (soundId: string) => {
if (previewSoundId === soundId) {
setPreviewSoundId(null);
} else {
Vibration.vibrate(40);
setPreviewSoundId(soundId);
const track = SOUND_LIBRARY.find((s) => s.id === soundId);
    showToast(`Previewing "${track?.name || soundId}"`);
setTimeout(() => {
setPreviewSoundId((cur) => (cur === soundId ? null : cur));
}, 3200);
}
};
// --- Alarm CRUD ---
const openCreateAlarm = (prefill: Partial<AlarmItem> = {}) => {
setEditingAlarm({
id: '',
hour: 6,
minute: 30,
title: '',
description: '',
category: 'study',
days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
enabled: true,
skippedOnce: false,
soundId: settings.defaultRingtone,
volume: settings.defaultVolume,
gradualVolume: settings.gradualVolume,
vibration: settings.vibration,
vibrationPattern: settings.vibrationPattern,
snoozeEnabled: true,
snoozeDuration: settings.defaultSnooze,
maxSnooze: 3,
antiSnooze: settings.antiSnooze,
smartWakeup: false,
smartWindow: settings.smartWindow,
heavySleeper: false,
missions: [settings.defaultMission],
missionDifficulty: 'Medium',
missionCount: 1,
randomMission: false,
missionBeforeSnooze: false,
motivationalMsg: 'Stay consistent. Every session counts!',
spokenMessage: settings.spokenMessages,
flashAlert: false,
preventAccidental: false,
holidayExclusion: settings.holidayExclusion,
linkedModule: 'planner',
specificDate: '',
sharedWithFriends: false,
...prefill,
});
setActiveScreen('editor');
};
const openEditAlarm = (alarm: AlarmItem) => {
setEditingAlarm({ ...alarm });
setOpenMenuId(null);
setActiveScreen('editor');
};
const commitSaveAlarm = (testImmediately = false) => {
if (!editingAlarm) return;
if (!Number.isInteger(editingAlarm.hour) || editingAlarm.hour < 0 || editingAlarm.hour > 23 || !Number.isInteger(editingAlarm.minute) || editingAlarm.minute < 0 || editingAlarm.minute > 59) {
showToast('Choose a valid alarm time');
return;
}
if (editingAlarm.specificDate && !/^\d{4}-\d{2}-\d{2}$/.test(editingAlarm.specificDate)) {
showToast('Use a valid date in YYYY-MM-DD format');
return;
}
const cleaned: AlarmItem = {
...editingAlarm,
      id: editingAlarm.id || `alm-${Date.now()}`,
      title: editingAlarm.title.trim() || `${getCategoryMeta(editingAlarm.category).label} Alarm`,
};
setAlarms((prev) => {
const exists = prev.some((a) => a.id === cleaned.id);
if (editingAlarm.id) return exists ? prev.map((a) => (a.id === cleaned.id ? cleaned : a)) : [cleaned, ...prev];
let next = cleaned;
while (prev.some((a) => a.id === next.id)) next = { ...next, id: `alm-${Date.now()}-${Math.floor(Math.random() * 1000)}` };
return [next, ...prev];
});
setShowSaveConfirm(false);
showToast(editingAlarm.id ? 'Alarm updated successfully' : 'New Smart Alarm created');
if (testImmediately) {
triggerAlarmRinging(cleaned);
} else {
setActiveScreen('dashboard');
}
};
const toggleAlarmEnabled = (id: string) => {
setAlarms((prev) =>
prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled, skippedOnce: false } : a))
);
};
const duplicateAlarm = (alarm: AlarmItem) => {
setAlarms((prev) => [
        { ...alarm, id: `alm-${Date.now()}`, title: `${alarm.title} (Copy)`, enabled: true, skippedOnce: false, snoozeCount: 0 },
...prev,
]);
setOpenMenuId(null);
showToast('Alarm duplicated');
};
const skipNextAlarm = (id: string) => {
setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, skippedOnce: !a.skippedOnce } : a)));
setOpenMenuId(null);
showToast('Next occurrence updated');
};
const deleteAlarm = (id: string) => {
setAlarms((prev) => prev.filter((a) => a.id !== id));
setPlannerTasks((prev) => prev.map((t) => (t.alarmId === id ? { ...t, alarmId: null } : t)));
setOpenMenuId(null);
showToast('Alarm deleted');
};
const toggleAllAlarms = (enable: boolean) => {
setAlarms((prev) => prev.map((a) => ({ ...a, enabled: enable, skippedOnce: false })));
showToast(enable ? 'All alarms enabled' : 'All alarms disabled');
};
// --- Ringing Operations ---
const triggerAlarmRinging = (alarm: AlarmItem) => {
setOpenMenuId(null);
setRingingAlarm(alarm);
setMissionRunnerMode(null);
setActiveScreen('ringing');
if (alarm.vibration) {
Vibration.vibrate([400, 600, 400, 600], true);
}
};
useEffect(() => {
let mounted = true;
const handleNativeAlarm = (payload: { alarmId: string }) => {
const alarm = alarms.find((item) => item.id === payload.alarmId);
if (mounted && alarm) triggerAlarmRinging(alarm);
};
const unsubscribe = subscribeToNativeAlarm(handleNativeAlarm);
void consumePendingNativeAlarm().then((payload) => {
if (mounted && payload) handleNativeAlarm(payload);
});
return () => {
mounted = false;
unsubscribe();
};
}, [alarms]);
const handleSnoozeAlarm = (alarm: AlarmItem) => {
Vibration.cancel();
const snoozeCount = alarm.snoozeCount || 0;
if (alarm.maxSnooze > 0 && snoozeCount >= alarm.maxSnooze) {
showToast(`Maximum snoozes reached (${alarm.maxSnooze})`);
return;
}
const mins = alarm.snoozeDuration || 5;
setAlarms((prev) => prev.map((item) => (item.id === alarm.id ? { ...item, snoozeCount: snoozeCount + 1 } : item)));
void stopNativeAlarm(alarm.id).catch(() => {});
void scheduleNativeSnooze({
alarmId: alarm.id,
atMillis: Date.now() + mins * 60 * 1000,
title: alarm.title,
soundId: alarm.soundId,
volume: alarm.volume,
vibration: alarm.vibration,
gradualVolume: alarm.gradualVolume,
vibrationPattern: alarm.vibrationPattern,
}).catch(() => {});
setSnoozedBanner({ alarmTitle: alarm.title, mins, secondsLeft: mins * 60 });
const { timeStr, period } = formatAlarmTime(alarm.hour, alarm.minute, settings.use24h);
setHistory((prev) => [
{
      id: `h-${Date.now()}`,
date: 'Just now',
      time: `${timeStr} ${period}`.trim(),
timestamp: new Date().toISOString(),
label: alarm.title,
category: alarm.category,
status: 'Snoozed',
mission: 'None',
snoozes: snoozeCount + 1,
linkedTask: alarm.linkedModule || null,
},
...prev,
]);
setRingingAlarm(null);
setActiveScreen('dashboard');
    showToast(`Snoozed for ${mins} minutes`);
};
const handleDismissAlarm = (alarm: AlarmItem, missionName = 'None') => {
Vibration.cancel();
void stopNativeAlarm(alarm.id).catch(() => {});
setAlarms((prev) => prev.map((item) => (item.id === alarm.id ? { ...item, snoozeCount: 0 } : item)));
const { timeStr, period } = formatAlarmTime(alarm.hour, alarm.minute, settings.use24h);
setHistory((prev) => [
{
      id: `h-${Date.now()}`,
date: 'Just now',
      time: `${timeStr} ${period}`.trim(),
timestamp: new Date().toISOString(),
label: alarm.title,
category: alarm.category,
status: 'Successful',
mission: missionName,
snoozes: 0,
linkedTask: alarm.title,
},
...prev,
]);
setStudyStreak((s) => s + 1);
setDismissedAlarm(alarm);
setRingingAlarm(null);
setActiveScreen('morning');
};
// --- Friends Operations ---
const addFriendToSquad = (buddy: FriendBuddyItem) => {
setFriends((prev) => (prev.some((f) => f.id === buddy.id) ? prev : [buddy, ...prev]));
    showToast(`${buddy.name} joined your Wake-Up Squad!`);
};
const nudgeFriend = (friendId: string) => {
Vibration.vibrate(50);
setFriends((prev) => prev.map((f) => (f.id === friendId ? { ...f, nudged: true } : f)));
const target = friends.find((f) => f.id === friendId);
    showToast(`Sent wake-up nudge to ${target?.name || 'friend'}!`);
};
const removeFriend = (friendId: string) => {
setFriends((prev) => prev.filter((f) => f.id !== friendId));
showToast('Removed from Wake-Up Squad');
};
// --- Study Planner Task Creation ---
const handleCreateTask = (withAlarm: boolean) => {
if (!newTaskTitle.trim()) return;
const [hh, mm] = newTaskTime.split(':').map(Number);
if (!Number.isInteger(hh) || !Number.isInteger(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
showToast('Enter a valid task time in HH:MM format');
return;
}
const { timeStr, period } = formatAlarmTime(hh, mm, false);
let createdAlarmId: string | null = null;
if (withAlarm) {
    createdAlarmId = `alm-${Date.now()}`;
setAlarms((prev) => [
{
...INITIAL_ALARMS[1],
id: createdAlarmId as string,
hour: hh,
minute: mm,
title: newTaskTitle.trim(),
category: 'study',
enabled: true,
linkedModule: 'planner',
},
...prev,
]);
}
setPlannerTasks((prev) => [
{
      id: `t-${Date.now()}`,
      time: `${timeStr} ${period}`,
title: newTaskTitle.trim(),
subject: newTaskSubject,
completed: false,
alarmId: createdAlarmId,
missed: false,
},
...prev,
]);
setNewTaskTitle('');
setShowAddTaskModal(false);
showToast(withAlarm ? 'Task & Smart Alarm created!' : 'Study task added to planner');
};
// ============================================================================
// 8. SHARED ALARM BOTTOM NAVIGATION BAR
// ============================================================================
const renderAlarmBottomNav = () => {
const items: {
id: AlarmScreenId;
label: string;
icon: React.ComponentType<{ size?: number; color?: string }>;
badge?: number;
}[] = [
{ id: 'dashboard', label: 'Alarms', icon: AlarmClock },
{ id: 'stats', label: 'Statistics', icon: BarChart3 },
{ id: 'friends', label: 'Friends', icon: Users, badge: friends.length > 0 ? friends.length : undefined },
{ id: 'settings', label: 'Settings', icon: Settings },
];
return (
<View
style={[
styles.bottomNav,
{ backgroundColor: P.card, borderTopColor: P.borderSubtle },
]}
>
{items.map((item) => {
const Icon = item.icon;
const active = activeScreen === item.id;
return (
<Pressable
key={item.id}
onPress={() => setActiveScreen(item.id)}
style={styles.bottomNavItem}
>
<View
style={[
styles.bottomNavPill,
active && { backgroundColor: darkMode ? P.teal : '#1E293B' },
]}
>
<Icon
size={20}
color={active ? (darkMode ? '#020617' : '#FFFFFF') : P.textSecondary}
/>
{item.badge !== undefined && (
<View style={styles.navBadge}>
<Text style={styles.navBadgeText}>{item.badge}</Text>
</View>
)}
</View>
<Text
style={{
fontSize: 10,
fontWeight: active ? '800' : '500',
color: active ? (darkMode ? P.teal : '#0F172A') : P.textSecondary,
}}
>
{item.label}
</Text>
</Pressable>
);
})}
</View>
);
};
// ============================================================================
// 9. SCREEN RENDERERS
// ============================================================================
// --- SCREEN 1: MAIN ALARM DASHBOARD ---
const renderDashboardScreen = () => {
const filteredAlarms = alarms.filter((a) =>
dashboardCategory === 'all' ? true : a.category === dashboardCategory
);
const nextFmt = nextAlarm ? formatAlarmTime(nextAlarm.hour, nextAlarm.minute, settings.use24h) : null;
return (
<View style={{ flex: 1 }}>
{/* Header */}
<View style={[styles.header, { backgroundColor: P.card, borderBottomColor: P.borderSubtle }]}>
<View style={styles.rowCenter}>
<Pressable
onPress={() => {
if (onExitToHome) onExitToHome();
else showToast('Connected to Study Sakha Home');
}}
style={styles.iconBtn}
>
<ChevronLeft size={22} color={P.text} />
</Pressable>
<View style={{ marginLeft: 4 }}>
<Text style={[styles.headerTitle, { color: P.text }]}>Smart Alarm</Text>
<Text style={[styles.headerSub, { color: P.textSecondary }]}>
Wake up. Show up. Stay consistent.
</Text>
</View>
</View>
<View style={styles.rowCenter}>
<Pressable onPress={() => setActiveScreen('sleep')} style={styles.iconBtn}>
<BedDouble size={20} color="#6366F1" />
</Pressable>
<Pressable onPress={() => setActiveScreen('settings')} style={styles.iconBtn}>
<Settings size={20} color={P.textSecondary} />
</Pressable>
</View>
</View>
<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 145, gap: 16 }}>
{/* Active Snooze Banner */}
{snoozedBanner && (
<View style={styles.snoozeBanner}>
<View style={styles.rowCenter}>
<Clock size={18} color="#F59E0B" />
<View style={{ marginLeft: 10 }}>
<Text style={{ fontSize: 12, fontWeight: '800', color: '#92400E' }}>
Snoozed: {snoozedBanner.alarmTitle}
</Text>
<Text style={{ fontSize: 11, color: '#B45309' }}>
Ringing again in {Math.floor(snoozedBanner.secondsLeft / 60)}m {snoozedBanner.secondsLeft % 60}s
</Text>
</View>
</View>
<Pressable onPress={() => setSnoozedBanner(null)} style={styles.snoozeDismissBtn}>
<Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>Dismiss</Text>
</Pressable>
</View>
)}
{/* Next Alarm Hero Card */}
<LinearGradient colors={['#191A2E', '#1E293B', '#0F3D3E']} style={styles.heroCard}>
{nextAlarm && nextFmt ? (
<>
<View style={styles.rowBetween}>
<View style={styles.nextBadge}>
<View style={styles.tealDot} />
<Text style={styles.nextBadgeText}>NEXT SCHEDULED ALARM</Text>
</View>
<View style={styles.heroCatPill}>
<Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>
{getCategoryMeta(nextAlarm.category).label}
</Text>
</View>
</View>
<View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 12 }}>
<Text style={styles.heroTime}>{nextFmt.timeStr}</Text>
{!!nextFmt.period && <Text style={styles.heroPeriod}>{nextFmt.period}</Text>}
</View>
<Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginTop: 4 }}>
{nextAlarm.title}
</Text>
<Text style={{ color: '#CBD5E1', fontSize: 12, marginTop: 2 }}>
Tomorrow · {formatRepeatLabel(nextAlarm.days, nextAlarm.specificDate)}
</Text>
<View style={styles.countdownBar}>
<Text style={{ color: '#CBD5E1', fontSize: 12 }}>Next alarm in</Text>
<Text style={styles.countdownMono}>{nextAlarmCountdown}</Text>
</View>
<View style={[styles.rowGap8, { marginTop: 14 }]}>
<Pressable onPress={() => openEditAlarm(nextAlarm)} style={[styles.heroActionBtn, { flex: 1 }]}>
<Edit3 size={14} color="#FFFFFF" />
<Text style={styles.heroActionText}>Edit</Text>
</Pressable>
<Pressable onPress={() => toggleAlarmEnabled(nextAlarm.id)} style={[styles.heroActionBtn, { flex: 1 }]}>
<BellOff size={14} color="#FFFFFF" />
<Text style={styles.heroActionText}>Disable</Text>
</Pressable>
<Pressable
onPress={() => triggerAlarmRinging(nextAlarm)}
style={[styles.heroActionBtn, { flex: 1, backgroundColor: '#14B8A6' }]}
>
<Play size={14} color="#020617" />
<Text style={[styles.heroActionText, { color: '#020617', fontWeight: '800' }]}>Test Ring</Text>
</Pressable>
</View>
</>
) : (
<View style={{ alignItems: 'center', paddingVertical: 14 }}>
<AlarmClock size={36} color="#2DD4BF" />
<Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginTop: 8 }}>
No Active Alarms
</Text>
<Text style={{ color: '#CBD5E1', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
Enable an alarm or create a new smart schedule.
</Text>
<Pressable onPress={() => openCreateAlarm()} style={styles.heroCreateBtn}>
<Text style={{ color: '#020617', fontSize: 12, fontWeight: '800' }}>+ Create Alarm</Text>
</Pressable>
</View>
)}
</LinearGradient>
{/* Ecosystem Navigation Shortcuts (3x2 Grid) */}
<View style={styles.shortcutGrid}>
{[
{ id: 'studyAlarms' as AlarmScreenId, label: 'Study Sync', icon: GraduationCap, color: '#14B8A6', bg: 'rgba(20,184,166,0.12)' },
{ id: 'friends' as AlarmScreenId, label: 'Friends', icon: Users, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
{ id: 'sleep' as AlarmScreenId, label: 'Sleep', icon: BedDouble, color: '#6366F1', bg: 'rgba(99,102,241,0.12)' },
{ id: 'stats' as AlarmScreenId, label: 'Analytics', icon: BarChart3, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
{ id: 'history' as AlarmScreenId, label: 'History', icon: History, color: '#0EA5E9', bg: 'rgba(14,165,233,0.12)' },
{ id: 'themes' as AlarmScreenId, label: 'Themes', icon: Palette, color: '#EC4899', bg: 'rgba(236,72,153,0.12)' },
].map((nav) => {
const Icon = nav.icon;
return (
<Pressable
key={nav.id}
onPress={() => setActiveScreen(nav.id)}
style={[styles.shortcutCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}
>
<View style={[styles.shortcutIconBox, { backgroundColor: nav.bg }]}>
<Icon size={16} color={nav.color} />
</View>
<Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '700', color: P.text, flex: 1 }}>
{nav.label}
</Text>
</Pressable>
);
})}
</View>
{/* Bulk Actions */}
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '800', color: P.text }}>
All Alarms ({filteredAlarms.length})
</Text>
<View style={styles.rowGap8}>
<Pressable onPress={() => toggleAllAlarms(true)} style={[styles.smallChipBtn, { backgroundColor: P.cardAlt }]}>
<Text style={{ fontSize: 11, fontWeight: '700', color: P.textSecondary }}>Enable All</Text>
</Pressable>
<Pressable onPress={() => toggleAllAlarms(false)} style={[styles.smallChipBtn, { backgroundColor: P.cardAlt }]}>
<Text style={{ fontSize: 11, fontWeight: '700', color: P.textSecondary }}>Disable All</Text>
</Pressable>
</View>
</View>
{/* Category Filter Chips */}
<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
<Pressable
onPress={() => setDashboardCategory('all')}
style={[
styles.filterPill,
{
backgroundColor: dashboardCategory === 'all' ? (darkMode ? P.teal : '#0F172A') : P.cardAlt,
},
]}
>
<Text
style={{
fontSize: 12,
fontWeight: '700',
color: dashboardCategory === 'all' ? (darkMode ? '#020617' : '#FFFFFF') : P.textSecondary,
}}
>
All
</Text>
</Pressable>
{ALARM_CATEGORIES.map((cat) => {
const active = dashboardCategory === cat.id;
return (
<Pressable
key={cat.id}
onPress={() => setDashboardCategory(cat.id)}
style={[
styles.filterPill,
{ backgroundColor: active ? (darkMode ? P.teal : '#0F172A') : P.cardAlt },
]}
>
<Text
style={{
fontSize: 12,
fontWeight: '700',
color: active ? (darkMode ? '#020617' : '#FFFFFF') : P.textSecondary,
}}
>
{cat.label}
</Text>
</Pressable>
);
})}
</ScrollView>
{/* Alarm List or Empty State */}
{filteredAlarms.length === 0 ? (
<View style={[styles.emptyCard, { backgroundColor: P.card, borderColor: P.border }]}>
<View style={[styles.emptyIconBox, { backgroundColor: P.tealSoft }]}>
<AlarmClock size={28} color={P.teal} />
</View>
<Text style={{ fontSize: 16, fontWeight: '800', color: P.text, marginTop: 10 }}>
No alarms in this category
</Text>
<Text style={{ fontSize: 12, color: P.textSecondary, textAlign: 'center', marginTop: 4 }}>
Build a consistent study & wake-up routine by creating your first Smart Alarm.
</Text>
<Pressable
onPress={() =>
openCreateAlarm({ category: dashboardCategory === 'all' ? 'wakeup' : dashboardCategory })
}
style={[styles.heroCreateBtn, { marginTop: 14 }]}
>
<Text style={{ color: '#020617', fontSize: 12, fontWeight: '800' }}>+ Add Smart Alarm</Text>
</Pressable>
</View>
) : (
<View style={{ gap: 12 }}>
{filteredAlarms.map((alarm) => {
const { timeStr, period } = formatAlarmTime(alarm.hour, alarm.minute, settings.use24h);
const cat = getCategoryMeta(alarm.category);
const CatIcon = cat.icon;
const isMenuOpen = openMenuId === alarm.id;
return (
<View
key={alarm.id}
style={[
styles.alarmCard,
{
backgroundColor: P.card,
borderColor: P.border,
opacity: alarm.enabled && !alarm.skippedOnce ? 1 : 0.65,
},
]}
>
<View style={styles.rowBetweenStart}>
<Pressable onPress={() => openEditAlarm(alarm)} style={{ flex: 1, paddingRight: 8 }}>
<View style={styles.badgeWrap}>
<View style={[styles.miniBadge, { backgroundColor: cat.bg }]}>
<CatIcon size={11} color={cat.color} />
<Text style={[styles.miniBadgeText, { color: cat.color }]}>{cat.label}</Text>
</View>
{alarm.heavySleeper && (
<View style={[styles.miniBadge, { backgroundColor: 'rgba(244,63,94,0.12)' }]}>
<Zap size={11} color="#F43F5E" />
<Text style={[styles.miniBadgeText, { color: '#F43F5E' }]}>Mission</Text>
</View>
)}
{alarm.smartWakeup && (
<View style={[styles.miniBadge, { backgroundColor: 'rgba(245,158,11,0.14)' }]}>
<Sun size={11} color="#D97706" />
<Text style={[styles.miniBadgeText, { color: '#D97706' }]}>
Smart {alarm.smartWindow}m
</Text>
</View>
)}
{alarm.sharedWithFriends && (
<View style={[styles.miniBadge, { backgroundColor: 'rgba(99,102,241,0.14)' }]}>
<Users size={11} color="#6366F1" />
<Text style={[styles.miniBadgeText, { color: '#6366F1' }]}>Squad</Text>
</View>
)}
{alarm.skippedOnce && (
<View style={[styles.miniBadge, { backgroundColor: P.cardAlt }]}>
<Text style={[styles.miniBadgeText, { color: P.textSecondary }]}>Skipped Next</Text>
</View>
)}
</View>
<View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 6 }}>
<Text style={[styles.alarmTimeText, { color: P.text }]}>{timeStr}</Text>
{!!period && (
<Text style={{ fontSize: 13, fontWeight: '700', color: P.textSecondary }}>{period}</Text>
)}
</View>
<Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700', color: P.text, marginTop: 4 }}>
{alarm.title}
</Text>
<Text style={{ fontSize: 11, color: P.textSecondary, marginTop: 2 }}>
{formatRepeatLabel(alarm.days, alarm.specificDate)}
</Text>
</Pressable>
<View style={styles.rowCenter}>
<CustomToggle
value={alarm.enabled}
onChange={() => toggleAlarmEnabled(alarm.id)}
dark={darkMode}
/>
<Pressable
onPress={() => setOpenMenuId(isMenuOpen ? null : alarm.id)}
style={{ padding: 6, marginLeft: 4 }}
>
<MoreVertical size={18} color={P.textSecondary} />
</Pressable>
</View>
</View>
{/* Inline More Options Menu */}
{isMenuOpen && (
<View style={[styles.inlineMenu, { backgroundColor: P.cardAlt, borderColor: P.border }]}>
<Pressable onPress={() => triggerAlarmRinging(alarm)} style={styles.menuRow}>
<Play size={14} color={P.teal} />
<Text style={[styles.menuText, { color: P.teal }]}>Preview Ringing</Text>
</Pressable>
<Pressable onPress={() => openEditAlarm(alarm)} style={styles.menuRow}>
<Edit3 size={14} color={P.text} />
<Text style={[styles.menuText, { color: P.text }]}>Edit Alarm</Text>
</Pressable>
<Pressable onPress={() => duplicateAlarm(alarm)} style={styles.menuRow}>
<Copy size={14} color={P.text} />
<Text style={[styles.menuText, { color: P.text }]}>Duplicate Alarm</Text>
</Pressable>
<Pressable onPress={() => skipNextAlarm(alarm.id)} style={styles.menuRow}>
<SkipForward size={14} color={P.text} />
<Text style={[styles.menuText, { color: P.text }]}>
{alarm.skippedOnce ? 'Restore Next' : 'Skip Next Alarm'}
</Text>
</Pressable>
<Pressable onPress={() => deleteAlarm(alarm.id)} style={styles.menuRow}>
<Trash2 size={14} color="#F43F5E" />
<Text style={[styles.menuText, { color: '#F43F5E' }]}>Delete Alarm</Text>
</Pressable>
</View>
)}
</View>
);
})}
</View>
)}
</ScrollView>
{/* Floating Add Alarm Button */}
<Pressable onPress={() => openCreateAlarm()} style={styles.fabWrap}>
<LinearGradient colors={['#0EA5A4', '#14B8A6']} style={styles.fabGradient}>
<Plus size={19} color="#FFFFFF" />
<Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Add Alarm</Text>
</LinearGradient>
</Pressable>
{renderAlarmBottomNav()}
</View>
);
};
// --- SCREEN 2: CREATE / EDIT ALARM ---
const renderEditorScreen = () => {
if (!editingAlarm) return null;
const { timeStr, period } = formatAlarmTime(editingAlarm.hour, editingAlarm.minute, settings.use24h);
const previewSec = getSecondsUntilAlarm(editingAlarm, now);
const updateField = <K extends keyof AlarmItem>(k: K, v: AlarmItem[K]) =>
setEditingAlarm((prev) => (prev ? { ...prev, [k]: v } : prev));
const toggleDay = (d: string) => {
const exists = editingAlarm.days.includes(d);
updateField('days', exists ? editingAlarm.days.filter((x) => x !== d) : [...editingAlarm.days, d]);
updateField('specificDate', '');
};
const toggleMission = (mId: MissionId) => {
const cur = editingAlarm.missions || [];
const exists = cur.includes(mId);
const next = exists ? cur.filter((x) => x !== mId) : [...cur, mId];
updateField('missions', next.length > 0 ? next : [mId]);
};
const filteredSounds = SOUND_LIBRARY.filter((s) =>
soundFilterCat === 'All' ? true : s.category === soundFilterCat
);
return (
<View style={{ flex: 1 }}>
<View style={[styles.header, { backgroundColor: P.card, borderBottomColor: P.borderSubtle }]}>
<Pressable onPress={() => setActiveScreen('dashboard')} style={{ padding: 6 }}>
<Text style={{ fontSize: 13, fontWeight: '700', color: P.textSecondary }}>Cancel</Text>
</Pressable>
<Text style={[styles.headerTitle, { color: P.text }]}>
{editingAlarm.id ? 'Edit Smart Alarm' : 'Create Smart Alarm'}
</Text>
<Pressable onPress={() => setShowSaveConfirm(true)} style={styles.headerSaveBtn}>
<Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Save</Text>
</Pressable>
</View>
<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 16 }}>
{/* A. Time Selection */}
<LinearGradient colors={['#0F172A', '#1E1B4B']} style={styles.heroCard}>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 11, fontWeight: '800', color: '#5EEAD4', letterSpacing: 1 }}>
TIME SELECTION
</Text>
<Pressable
onPress={() => setSettings((s) => ({ ...s, use24h: !s.use24h }))}
style={styles.heroCatPill}
>
<Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
{settings.use24h ? '24-Hour' : '12-Hour'}
</Text>
</Pressable>
</View>
<View style={styles.timeStepperRow}>
<View style={{ alignItems: 'center' }}>
<Pressable
onPress={() => updateField('hour', (editingAlarm.hour + 1) % 24)}
style={styles.stepBtn}
>
<Text style={styles.stepBtnText}>▲</Text>
</Pressable>
<Text style={styles.stepperDigits}>{timeStr.split(':')[0]}</Text>
<Pressable
onPress={() => updateField('hour', (editingAlarm.hour + 23) % 24)}
style={styles.stepBtn}
>
<Text style={styles.stepBtnText}>▼</Text>
</Pressable>
</View>
<Text style={{ fontSize: 36, fontWeight: '900', color: '#2DD4BF' }}>:</Text>
<View style={{ alignItems: 'center' }}>
<Pressable
onPress={() => updateField('minute', (editingAlarm.minute + 5) % 60)}
style={styles.stepBtn}
>
<Text style={styles.stepBtnText}>▲</Text>
</Pressable>
<Text style={styles.stepperDigits}>{timeStr.split(':')[1]}</Text>
<Pressable
onPress={() => updateField('minute', (editingAlarm.minute + 55) % 60)}
style={styles.stepBtn}
>
<Text style={styles.stepBtnText}>▼</Text>
</Pressable>
</View>
{!settings.use24h && (
<View style={{ gap: 8, marginLeft: 8 }}>
{(['AM', 'PM'] as const).map((p) => (
<Pressable
key={p}
onPress={() => {
if (p === 'AM' && editingAlarm.hour >= 12) updateField('hour', editingAlarm.hour - 12);
if (p === 'PM' && editingAlarm.hour < 12) updateField('hour', editingAlarm.hour + 12);
}}
style={[
styles.periodBtn,
period === p && { backgroundColor: '#2DD4BF' },
]}
>
<Text
style={{
fontSize: 12,
fontWeight: '800',
color: period === p ? '#020617' : 'rgba(255,255,255,0.7)',
}}
>
{p}
</Text>
</Pressable>
))}
</View>
)}
</View>
<Text style={{ textAlign: 'center', color: '#5EEAD4', fontSize: 12, fontWeight: '700', marginTop: 10 }}>
Next alarm in {formatCountdown(previewSec)}
</Text>
</LinearGradient>
{/* B. Alarm Details */}
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<Text style={[styles.sectionLabel, { color: P.textMuted }]}>ALARM DETAILS</Text>
<TextInput
value={editingAlarm.title}
onChangeText={(t) => updateField('title', t)}
placeholder="e.g., Wake Up — RAS Preparation"
placeholderTextColor={P.textMuted}
style={[styles.inputBox, { backgroundColor: P.cardAlt, borderColor: P.border, color: P.text }]}
/>
<View style={styles.badgeWrap}>
{['Wake Up', 'Rajasthan History', 'Indian Polity Revision', 'Geography PYQ', 'Mock Test', 'Daily Current Affairs'].map((preset) => (
<Pressable
key={preset}
onPress={() => updateField('title', preset)}
style={[styles.smallChipBtn, { backgroundColor: P.cardAlt }]}
>
<Text style={{ fontSize: 11, fontWeight: '600', color: P.textSecondary }}>{preset}</Text>
</Pressable>
))}
</View>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text, marginTop: 4 }}>Category</Text>
<View style={styles.catGrid}>
{ALARM_CATEGORIES.map((c) => {
const Icon = c.icon;
const sel = editingAlarm.category === c.id;
return (
<Pressable
key={c.id}
onPress={() => updateField('category', c.id)}
style={[
styles.catGridItem,
{
borderColor: sel ? P.teal : P.borderSubtle,
backgroundColor: sel ? P.tealSoft : P.card,
},
]}
>
<Icon size={16} color={sel ? P.teal : P.textSecondary} />
<Text numberOfLines={1} style={{ fontSize: 10, fontWeight: '700', color: sel ? P.teal : P.textSecondary }}>
{c.label}
</Text>
</Pressable>
);
})}
</View>
<TextInput
value={editingAlarm.motivationalMsg}
onChangeText={(t) => updateField('motivationalMsg', t)}
placeholder="Optional motivational wake-up message..."
placeholderTextColor={P.textMuted}
style={[styles.inputBox, { backgroundColor: P.cardAlt, borderColor: P.border, color: P.text, fontSize: 12 }]}
/>
</View>
{/* C. Repeat Schedule */}
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<Text style={[styles.sectionLabel, { color: P.textMuted }]}>REPEAT SCHEDULE</Text>
<View style={styles.rowBetween}>
{DAYS_LIST.map((d) => {
const active = editingAlarm.days.includes(d);
return (
<Pressable
key={d}
onPress={() => toggleDay(d)}
style={[
styles.dayCircle,
{ backgroundColor: active ? P.teal : P.cardAlt },
]}
>
<Text style={{ fontSize: 11, fontWeight: '800', color: active ? '#FFFFFF' : P.textSecondary }}>
{d.slice(0, 2)}
</Text>
</Pressable>
);
})}
</View>
<View style={styles.badgeWrap}>
{[
{ label: 'Once', days: [] },
{ label: 'Every day', days: [...DAYS_LIST] },
{ label: 'Weekdays', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
{ label: 'Weekends', days: ['Sat', 'Sun'] },
].map((p) => (
<Pressable
key={p.label}
onPress={() => {
updateField('days', p.days);
updateField('specificDate', '');
}}
style={[styles.smallChipBtn, { backgroundColor: P.cardAlt }]}
>
<Text style={{ fontSize: 11, fontWeight: '700', color: P.textSecondary }}>{p.label}</Text>
</Pressable>
))}
</View>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>Specific Date (YYYY-MM-DD)</Text>
<TextInput
value={editingAlarm.specificDate}
onChangeText={(t) => updateField('specificDate', t)}
placeholder="2026-11-29"
placeholderTextColor={P.textMuted}
style={[styles.inlineInput, { backgroundColor: P.cardAlt, borderColor: P.border, color: P.text }]}
/>
</View>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>Skip Public Holidays</Text>
<CustomToggle
value={editingAlarm.holidayExclusion}
onChange={(v) => updateField('holidayExclusion', v)}
dark={darkMode}
/>
</View>
</View>
{/* D. Heavy Sleeper Mode */}
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: 'rgba(244,63,94,0.35)' }]}>
<View style={styles.rowBetween}>
<View style={styles.rowCenter}>
<View style={[styles.shortcutIconBox, { backgroundColor: 'rgba(244,63,94,0.14)' }]}>
<Zap size={16} color="#F43F5E" />
</View>
<View style={{ marginLeft: 10 }}>
<Text style={{ fontSize: 14, fontWeight: '800', color: P.text }}>Heavy Sleeper Mode</Text>
<Text style={{ fontSize: 11, color: P.textSecondary }}>Complete mission before dismissing</Text>
</View>
</View>
<CustomToggle
value={editingAlarm.heavySleeper}
onChange={(v) => updateField('heavySleeper', v)}
activeColor="#F43F5E"
dark={darkMode}
/>
</View>
{editingAlarm.heavySleeper && (
<View style={{ gap: 10, marginTop: 6 }}>
{MISSION_TYPES.map((m) => {
const Icon = m.icon;
const sel = editingAlarm.missions.includes(m.id);
return (
<Pressable
key={m.id}
onPress={() => toggleMission(m.id)}
style={[
styles.missionSelectRow,
{
borderColor: sel ? '#F43F5E' : P.borderSubtle,
backgroundColor: sel ? 'rgba(244,63,94,0.08)' : P.card,
},
]}
>
<View style={[styles.rowCenter, { flex: 1 }]}>
<View
style={[
styles.shortcutIconBox,
{ backgroundColor: sel ? '#F43F5E' : P.cardAlt },
]}
>
<Icon size={16} color={sel ? '#FFFFFF' : P.textSecondary} />
</View>
<View style={{ marginLeft: 10, flex: 1 }}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>{m.name}</Text>
<Text style={{ fontSize: 10, color: P.textSecondary }}>{m.desc}</Text>
</View>
</View>
<View style={[styles.smallChipBtn, { backgroundColor: P.cardAlt }]}>
<Text style={{ fontSize: 10, fontWeight: '700', color: sel ? '#F43F5E' : P.textSecondary }}>
{sel ? 'Selected' : m.badge}
</Text>
</View>
</Pressable>
);
})}
<Text style={{ fontSize: 11, fontWeight: '700', color: P.textSecondary }}>Difficulty</Text>
<View style={styles.rowGap8}>
{(['Easy', 'Medium', 'Hard', 'Expert'] as MissionDifficulty[]).map((d) => (
<Pressable
key={d}
onPress={() => updateField('missionDifficulty', d)}
style={[
styles.segBtn,
{ backgroundColor: editingAlarm.missionDifficulty === d ? '#F43F5E' : P.cardAlt },
]}
>
<Text
style={{
fontSize: 11,
fontWeight: '700',
color: editingAlarm.missionDifficulty === d ? '#FFFFFF' : P.textSecondary,
}}
>
{d}
</Text>
</Pressable>
))}
</View>
<Text style={{ fontSize: 11, fontWeight: '700', color: P.textSecondary }}>Mission Count</Text>
<View style={styles.rowGap8}>
{[1, 2, 3, 5].map((cnt) => (
<Pressable
key={cnt}
onPress={() => updateField('missionCount', cnt)}
style={[
styles.segBtn,
{ backgroundColor: editingAlarm.missionCount === cnt ? '#F43F5E' : P.cardAlt },
]}
>
<Text
style={{
fontSize: 12,
fontWeight: '800',
color: editingAlarm.missionCount === cnt ? '#FFFFFF' : P.textSecondary,
}}
>
{cnt}
</Text>
</Pressable>
))}
</View>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '600', color: P.text }}>Randomize Missions</Text>
<CustomToggle
value={editingAlarm.randomMission}
onChange={(v) => updateField('randomMission', v)}
activeColor="#F43F5E"
dark={darkMode}
/>
</View>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '600', color: P.text }}>Require Mission before Snooze</Text>
<CustomToggle
value={editingAlarm.missionBeforeSnooze}
onChange={(v) => updateField('missionBeforeSnooze', v)}
activeColor="#F43F5E"
dark={darkMode}
/>
</View>
</View>
)}
</View>
{/* E. Sound & Vibration */}
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<Text style={[styles.sectionLabel, { color: P.textMuted }]}>SOUND & VIBRATION</Text>
<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
{SOUND_CATEGORIES.map((sc) => (
<Pressable
key={sc}
onPress={() => setSoundFilterCat(sc)}
style={[
styles.filterPill,
{ backgroundColor: soundFilterCat === sc ? P.teal : P.cardAlt },
]}
>
<Text
style={{
fontSize: 11,
fontWeight: '700',
color: soundFilterCat === sc ? '#FFFFFF' : P.textSecondary,
}}
>
{sc}
</Text>
</Pressable>
))}
</ScrollView>
<View style={{ gap: 8 }}>
{filteredSounds.map((s) => {
const selected = editingAlarm.soundId === s.id;
const playing = previewSoundId === s.id;
return (
<Pressable
key={s.id}
onPress={() => updateField('soundId', s.id)}
style={[
styles.missionSelectRow,
{
borderColor: selected ? P.teal : P.borderSubtle,
backgroundColor: selected ? P.tealSoft : P.card,
},
]}
>
<View style={styles.rowCenter}>
<Music size={15} color={selected ? P.teal : P.textMuted} />
<View style={{ marginLeft: 10 }}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>{s.name}</Text>
<Text style={{ fontSize: 10, color: P.textSecondary }}>
{s.category} · {s.duration}
</Text>
</View>
</View>
<Pressable
onPress={() => toggleSoundPreview(s.id)}
style={[styles.shortcutIconBox, { backgroundColor: playing ? P.teal : P.cardAlt }]}
>
{playing ? <Pause size={14} color="#FFFFFF" /> : <Play size={14} color={P.teal} />}
</Pressable>
</Pressable>
);
})}
</View>
{/* Volume Stepper Bar */}
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>
Alarm Volume: {editingAlarm.volume}%
</Text>
<View style={styles.rowGap8}>
<Pressable
onPress={() => updateField('volume', Math.max(10, editingAlarm.volume - 10))}
style={[styles.smallChipBtn, { backgroundColor: P.cardAlt }]}
>
<Text style={{ fontWeight: '800', color: P.text }}>-10%</Text>
</Pressable>
<Pressable
onPress={() => updateField('volume', Math.min(100, editingAlarm.volume + 10))}
style={[styles.smallChipBtn, { backgroundColor: P.cardAlt }]}
>
<Text style={{ fontWeight: '800', color: P.text }}>+10%</Text>
</Pressable>
</View>
</View>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '600', color: P.text }}>Gradual Volume Increase</Text>
<CustomToggle value={editingAlarm.gradualVolume} onChange={(v) => updateField('gradualVolume', v)} dark={darkMode} />
</View>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '600', color: P.text }}>Vibration</Text>
<CustomToggle value={editingAlarm.vibration} onChange={(v) => updateField('vibration', v)} dark={darkMode} />
</View>
</View>
{/* F. Snooze, Smart Wake-up, Friends & Advanced */}
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<Text style={[styles.sectionLabel, { color: P.textMuted }]}>SNOOZE & SMART WAKE-UP</Text>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>Enable Snooze</Text>
<CustomToggle value={editingAlarm.snoozeEnabled} onChange={(v) => updateField('snoozeEnabled', v)} dark={darkMode} />
</View>
{editingAlarm.snoozeEnabled && (
<View style={styles.rowGap8}>
{[5, 10, 15, 20].map((m) => (
<Pressable
key={m}
onPress={() => updateField('snoozeDuration', m)}
style={[
styles.segBtn,
{ backgroundColor: editingAlarm.snoozeDuration === m ? P.teal : P.cardAlt },
]}
>
<Text
style={{
fontSize: 12,
fontWeight: '700',
color: editingAlarm.snoozeDuration === m ? '#FFFFFF' : P.textSecondary,
}}
>
{m}m
</Text>
</Pressable>
))}
</View>
)}
<View style={[styles.rowBetween, { paddingTop: 6 }]}>
<View style={{ flex: 1 }}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>Smart Wake-up Window</Text>
<Text style={{ fontSize: 10, color: P.textSecondary }}>Gentle sunrise simulation before target time</Text>
</View>
<CustomToggle value={editingAlarm.smartWakeup} onChange={(v) => updateField('smartWakeup', v)} dark={darkMode} />
</View>
{editingAlarm.smartWakeup && (
<View style={styles.rowGap8}>
{[15, 20, 30].map((w) => (
<Pressable
key={w}
onPress={() => updateField('smartWindow', w)}
style={[
styles.segBtn,
{ backgroundColor: editingAlarm.smartWindow === w ? '#F59E0B' : P.cardAlt },
]}
>
<Text
style={{
fontSize: 11,
fontWeight: '700',
color: editingAlarm.smartWindow === w ? '#FFFFFF' : P.textSecondary,
}}
>
{w} min
</Text>
</Pressable>
))}
</View>
)}
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '600', color: P.text }}>Spoken Alarm Message</Text>
<CustomToggle value={editingAlarm.spokenMessage} onChange={(v) => updateField('spokenMessage', v)} dark={darkMode} />
</View>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '600', color: P.text }}>Flash Notification Alert</Text>
<CustomToggle value={editingAlarm.flashAlert} onChange={(v) => updateField('flashAlert', v)} dark={darkMode} />
</View>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '600', color: P.text }}>Anti-Snooze Protection</Text>
<CustomToggle value={editingAlarm.antiSnooze} onChange={(v) => updateField('antiSnooze', v)} dark={darkMode} />
</View>
<View style={[styles.rowBetween, { borderTopWidth: 1, borderTopColor: P.borderSubtle, paddingTop: 10 }]}>
<View style={{ flex: 1 }}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>Wake Up Together (Friends)</Text>
<Text style={{ fontSize: 10, color: P.textSecondary }}>Sync alarm status & allow nudges from buddies</Text>
</View>
<CustomToggle
value={Boolean(editingAlarm.sharedWithFriends)}
onChange={(v) => updateField('sharedWithFriends', v)}
dark={darkMode}
/>
</View>
</View>
</ScrollView>
{/* Sticky Save Footer */}
<View style={[styles.editorFooter, { backgroundColor: P.card, borderTopColor: P.borderSubtle }]}>
<Pressable
onPress={() => commitSaveAlarm(true)}
style={[styles.footerBtn, { backgroundColor: darkMode ? '#1E293B' : '#0F172A' }]}
>
<Play size={14} color="#FFFFFF" />
<Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Save & Test</Text>
</Pressable>
<Pressable onPress={() => setShowSaveConfirm(true)} style={[styles.footerBtn, { backgroundColor: P.teal }]}>
<Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Save Alarm</Text>
</Pressable>
</View>
{/* Confirmation Summary Modal */}
<Modal visible={showSaveConfirm} transparent animationType="slide">
<View style={styles.modalBackdrop}>
<View style={[styles.bottomSheet, { backgroundColor: P.card }]}>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 16, fontWeight: '800', color: P.text }}>Confirm Alarm Summary</Text>
<Pressable onPress={() => setShowSaveConfirm(false)}>
<X size={20} color={P.textSecondary} />
</Pressable>
</View>
<View style={[styles.summaryBox, { backgroundColor: P.cardAlt }]}>
<Text style={{ fontSize: 20, fontWeight: '900', color: P.teal }}>
{timeStr} {period}
</Text>
<Text style={{ fontSize: 14, fontWeight: '700', color: P.text }}>
{editingAlarm.title || 'Untitled Smart Alarm'}
</Text>
<Text style={{ fontSize: 12, color: P.textSecondary }}>
Repeat: {formatRepeatLabel(editingAlarm.days, editingAlarm.specificDate)}
</Text>
<Text style={{ fontSize: 12, color: P.textSecondary }}>
        Heavy Sleeper: {editingAlarm.heavySleeper ? `Enabled (${editingAlarm.missions.join(', ')})` : 'Off'}
</Text>
<Text style={{ fontSize: 12, color: P.textSecondary }}>
        Smart Wake-up: {editingAlarm.smartWakeup ? `${editingAlarm.smartWindow}m sunrise window` : 'Off'}
</Text>
</View>
<View style={styles.rowGap10}>
<Pressable
onPress={() => setShowSaveConfirm(false)}
style={[styles.footerBtn, { backgroundColor: P.cardAlt }]}
>
<Text style={{ color: P.text, fontWeight: '700', fontSize: 13 }}>Back</Text>
</Pressable>
<Pressable
onPress={() => commitSaveAlarm(false)}
style={[styles.footerBtn, { backgroundColor: P.teal }]}
>
<Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Confirm & Save</Text>
</Pressable>
</View>
</View>
</View>
</Modal>
</View>
);
};
// --- SCREEN 3: FULL-SCREEN ALARM RINGING ---
const renderRingingScreen = () => {
if (!ringingAlarm) return null;
if (missionRunnerMode) {
return (
<HeavySleeperMissionModal
alarm={ringingAlarm}
activeTheme={activeTheme}
modeLabel={missionRunnerMode === 'snooze' ? 'Snooze Verification' : 'Dismiss Alarm'}
onComplete={(missionName) => {
const mode = missionRunnerMode;
setMissionRunnerMode(null);
if (mode === 'snooze') handleSnoozeAlarm(ringingAlarm);
else handleDismissAlarm(ringingAlarm, missionName);
}}
onEmergencyExit={() => {
setMissionRunnerMode(null);
handleDismissAlarm(ringingAlarm, 'Accessibility Exit');
}}
/>
);
}
const { timeStr, period } = formatAlarmTime(ringingAlarm.hour, ringingAlarm.minute, settings.use24h);
const cat = getCategoryMeta(ringingAlarm.category);
const ringScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.45] });
const ringOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
return (
<LinearGradient colors={[...activeTheme.colors]} style={styles.fullScreen}>
<SafeAreaView style={{ flex: 1, justifyContent: 'space-between', padding: 24 }}>
{themeAnimated && (
<Animated.View
pointerEvents="none"
style={[
styles.ringingPulseCircle,
{ transform: [{ scale: ringScale }], opacity: ringOpacity },
]}
/>
)}
{/* Top Info */}
<View style={{ alignItems: 'center', marginTop: 28 }}>
<View style={styles.glassPill}>
<Bell size={14} color="#FFFFFF" />
<Text style={styles.glassPillText}>
{cat.label} Alarm {ringingAlarm.smartWakeup ? '· Smart Sunrise' : ''}
</Text>
</View>
<Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 14 }}>
{now.toDateString()}
</Text>
<View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
<Text style={styles.ringingClock}>{timeStr}</Text>
{!!period && <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFFFFF' }}>{period}</Text>}
</View>
<Text style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginTop: 14, textAlign: 'center' }}>
{ringingAlarm.title}
</Text>
{!!ringingAlarm.motivationalMsg && (
<Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 8, fontStyle: 'italic', textAlign: 'center' }}>
“{ringingAlarm.motivationalMsg}”
</Text>
)}
</View>
{/* Visualizer & Volume */}
<View style={{ alignItems: 'center', gap: 12 }}>
<View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 40 }}>
{[16, 34, 24, 40, 20, 36, 18, 30, 22].map((h, i) => (
<View key={i} style={{ width: 6, height: h, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.85)' }} />
))}
</View>
<View style={[styles.glassPill, { backgroundColor: 'rgba(0,0,0,0.28)' }]}>
<Volume2 size={14} color="#FFFFFF" />
<Text style={styles.glassPillText}>{ringingAlarm.volume}%</Text>
{ringingAlarm.vibration && (
<>
<Vibrate size={14} color="#FFFFFF" />
<Text style={styles.glassPillText}>{ringingAlarm.vibrationPattern}</Text>
</>
)}
</View>
</View>
{/* Snooze & Dismiss */}
<View style={{ gap: 12, marginBottom: 12 }}>
{ringingAlarm.snoozeEnabled && !ringingAlarm.antiSnooze && (
<Pressable
onPress={() => {
if (ringingAlarm.heavySleeper && ringingAlarm.missionBeforeSnooze) {
setMissionRunnerMode('snooze');
} else {
handleSnoozeAlarm(ringingAlarm);
}
}}
style={styles.ringingSnoozeBtn}
>
<Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
Snooze ({ringingAlarm.snoozeDuration} min)
</Text>
</Pressable>
)}
<Pressable
onPress={() => {
if (ringingAlarm.heavySleeper) setMissionRunnerMode('dismiss');
else handleDismissAlarm(ringingAlarm, 'Direct Dismiss');
}}
style={styles.ringingDismissBtn}
>
{ringingAlarm.heavySleeper ? (
<>
<Zap size={20} color="#F43F5E" />
<Text style={{ color: '#020617', fontSize: 16, fontWeight: '900' }}>
Start Mission to Dismiss
</Text>
</>
) : (
<>
<CheckCircle2 size={20} color="#0D9488" />
<Text style={{ color: '#020617', fontSize: 16, fontWeight: '900' }}>Dismiss Alarm</Text>
</>
)}
</Pressable>
</View>
</SafeAreaView>
</LinearGradient>
);
};
// --- SCREEN 4: GOOD MORNING / STUDY LAUNCH SCREEN ---
const renderMorningScreen = () => {
const mod = dismissedAlarm?.linkedModule || 'planner';
const primaryCta =
mod === 'pyq'
? 'Start PYQ Practice'
: mod === 'mocktest'
? 'Start Mock Test'
: mod === 'current_affairs'
? 'Open Current Affairs'
: 'Start Study Session';
return (
<ScrollView
style={{ flex: 1, backgroundColor: P.bg }}
contentContainerStyle={{ padding: 20, gap: 18, flexGrow: 1, justifyContent: 'space-between' }}
>
<View style={{ gap: 16, marginTop: 10 }}>
<View style={styles.rowBetween}>
<View style={[styles.miniBadge, { backgroundColor: 'rgba(245,158,11,0.16)', paddingVertical: 6, paddingHorizontal: 10 }]}>
<Sun size={14} color="#D97706" />
<Text style={{ fontSize: 12, fontWeight: '700', color: '#D97706' }}>Alarm Dismissed</Text>
</View>
<View style={[styles.miniBadge, { backgroundColor: 'rgba(249,115,22,0.16)', paddingVertical: 6, paddingHorizontal: 10 }]}>
<Flame size={14} color="#EA580C" />
<Text style={{ fontSize: 12, fontWeight: '700', color: '#EA580C' }}>{studyStreak} Day Streak</Text>
</View>
</View>
<View>
<Text style={{ fontSize: 28, fontWeight: '900', color: P.text }}>Good morning, Kamlesh!</Text>
<Text style={{ fontSize: 14, color: P.textSecondary, marginTop: 4 }}>
You showed up on time for {dismissedAlarm?.title || 'your study routine'}.
</Text>
</View>
<LinearGradient colors={['#1A1829', '#261D3B']} style={styles.heroCard}>
<Text style={{ fontSize: 10, fontWeight: '800', color: '#5EEAD4', letterSpacing: 1.5 }}>DAILY SPARK</Text>
<Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginTop: 6, lineHeight: 21 }}>
“Success in competitive exams is built in the quiet hours before the world wakes up.”
</Text>
</LinearGradient>
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 14, fontWeight: '800', color: P.text }}>Today&apos;s Study Target</Text>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.teal }}>6 Hours Goal</Text>
</View>
{plannerTasks.slice(0, 3).map((t) => (
<View key={t.id} style={[styles.rowCenter, { backgroundColor: P.cardAlt, padding: 10, borderRadius: 14 }]}>
<CheckCircle2 size={16} color={t.completed ? P.teal : P.textMuted} />
<View style={{ marginLeft: 10 }}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>{t.title}</Text>
<Text style={{ fontSize: 10, color: P.textSecondary }}>
{t.time} · {t.subject}
</Text>
</View>
</View>
))}
</View>
</View>
<View style={{ gap: 10, marginBottom: 12 }}>
<Pressable
onPress={() => {
    showToast(`Launched ${primaryCta}`);
setActiveScreen('studyAlarms');
}}
style={[styles.tealPrimaryBtn, { backgroundColor: P.teal }]}
>
<Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>{primaryCta}</Text>
</Pressable>
<View style={styles.rowGap10}>
<Pressable
onPress={() => (onOpenStudyPlanner ? onOpenStudyPlanner() : setActiveScreen('studyAlarms'))}
style={[styles.footerBtn, { backgroundColor: P.card, borderWidth: 1, borderColor: P.border }]}
>
<Text style={{ color: P.text, fontSize: 12, fontWeight: '700' }}>Open Study Planner</Text>
</Pressable>
<Pressable
onPress={() => setActiveScreen('dashboard')}
style={[styles.footerBtn, { backgroundColor: P.card, borderWidth: 1, borderColor: P.border }]}
>
<Text style={{ color: P.text, fontSize: 12, fontWeight: '700' }}>Alarm Dashboard</Text>
</Pressable>
</View>
</View>
</ScrollView>
);
};
// --- SCREEN 5: SLEEP & BEDTIME SYSTEM ---
const renderSleepScreen = () => (
<View style={{ flex: 1 }}>
<View style={[styles.header, { backgroundColor: P.card, borderBottomColor: P.borderSubtle }]}>
<View style={styles.rowCenter}>
<Pressable onPress={() => setActiveScreen('dashboard')} style={styles.iconBtn}>
<ChevronLeft size={22} color={P.text} />
</Pressable>
<View style={{ marginLeft: 4 }}>
<Text style={[styles.headerTitle, { color: P.text }]}>Sleep & Bedtime</Text>
<Text style={[styles.headerSub, { color: P.textSecondary }]}>Routine & recovery insights</Text>
</View>
</View>
<View style={[styles.miniBadge, { backgroundColor: 'rgba(99,102,241,0.14)' }]}>
<Text style={{ fontSize: 10, fontWeight: '700', color: '#6366F1' }}>Demo Data</Text>
</View>
</View>
<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}>
<LinearGradient colors={['#1E1B4B', '#3B0764', '#020617']} style={styles.heroCard}>
<View style={styles.rowBetween}>
<View style={styles.rowCenter}>
<BedDouble size={16} color="#A5B4FC" />
<Text style={{ color: '#A5B4FC', fontSize: 12, fontWeight: '700', marginLeft: 6 }}>Sleep Schedule</Text>
</View>
<CustomToggle
value={bedtimeConfig.enabled}
onChange={(v) => setBedtimeConfig((b) => ({ ...b, enabled: v }))}
activeColor="#818CF8"
dark
/>
</View>
<View style={[styles.rowGap10, { marginTop: 14 }]}>
<View style={styles.sleepTimeBox}>
<Text style={{ fontSize: 10, color: '#C7D2FE', fontWeight: '700' }}>BEDTIME</Text>
<TextInput
value={bedtimeConfig.bedtime}
onChangeText={(t) => setBedtimeConfig((b) => ({ ...b, bedtime: t }))}
style={{ fontSize: 20, fontWeight: '900', color: '#FFFFFF', marginTop: 4 }}
/>
</View>
<View style={styles.sleepTimeBox}>
<Text style={{ fontSize: 10, color: '#99F6E4', fontWeight: '700' }}>WAKE-UP</Text>
<TextInput
value={bedtimeConfig.wakeup}
onChangeText={(t) => setBedtimeConfig((b) => ({ ...b, wakeup: t }))}
style={{ fontSize: 20, fontWeight: '900', color: '#FFFFFF', marginTop: 4 }}
/>
</View>
</View>
<View style={[styles.rowBetween, { marginTop: 14 }]}>
<Text style={{ fontSize: 12, color: '#C7D2FE' }}>Target Sleep: {bedtimeConfig.targetHours} hrs</Text>
<View style={styles.rowGap8}>
<Pressable
onPress={() => setBedtimeConfig((b) => ({ ...b, targetHours: Math.max(5.5, b.targetHours - 0.5) }))}
style={styles.heroCatPill}
>
<Text style={{ color: '#FFFFFF', fontWeight: '800' }}>-0.5h</Text>
</Pressable>
<Pressable
onPress={() => setBedtimeConfig((b) => ({ ...b, targetHours: Math.min(9.5, b.targetHours + 0.5) }))}
style={styles.heroCatPill}
>
<Text style={{ color: '#FFFFFF', fontWeight: '800' }}>+0.5h</Text>
</Pressable>
</View>
</View>
<View style={[styles.rowBetween, { marginTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 12 }]}>
<Text style={{ fontSize: 12, color: '#C7D2FE' }}>Wind-down Ambient Sound</Text>
<Pressable
onPress={() => toggleSoundPreview(bedtimeConfig.ambientSound)}
style={[styles.heroActionBtn, { paddingHorizontal: 12 }]}
>
{previewSoundId === bedtimeConfig.ambientSound ? (
<Pause size={13} color="#FFFFFF" />
) : (
<Play size={13} color="#FFFFFF" />
)}
<Text style={styles.heroActionText}>Ocean Waves</Text>
</Pressable>
</View>
</LinearGradient>
{/* Metrics */}
<View style={styles.rowGap8}>
{[
{ label: 'Avg Sleep', val: '7h 28m', color: '#6366F1' },
{ label: 'Consistency', val: '89%', color: '#14B8A6' },
{ label: 'Streak', val: '6 Days', color: '#F59E0B' },
].map((m) => (
<View key={m.label} style={[styles.metricTile, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<Text style={{ fontSize: 10, fontWeight: '600', color: P.textSecondary }}>{m.label}</Text>
<Text style={{ fontSize: 16, fontWeight: '900', color: m.color, marginTop: 2 }}>{m.val}</Text>
</View>
))}
</View>
{/* Weekly Sleep Graph */}
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 14, fontWeight: '800', color: P.text }}>Weekly Sleep Duration (hrs)</Text>
<Text style={{ fontSize: 10, color: P.textMuted }}>Simulated prototype data</Text>
</View>
<NativeSleepBarChart data={INITIAL_SLEEP_DATA} dark={darkMode} />
<Text style={{ fontSize: 10, color: P.textMuted }}>
Note: Sleep insights are schedule-based estimates for routine planning, not medical measurements.
</Text>
</View>
{/* Sleep History */}
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<Text style={{ fontSize: 14, fontWeight: '800', color: P.text }}>Recent Sleep Routine</Text>
{INITIAL_SLEEP_DATA.slice(0, 5).map((s) => (
<View key={s.day} style={[styles.rowBetween, { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: P.borderSubtle }]}>
<View>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>{s.day}</Text>
<Text style={{ fontSize: 10, color: P.textSecondary }}>
{s.bedtime} → {s.wakeup}
</Text>
</View>
<View style={{ alignItems: 'flex-end' }}>
<Text style={{ fontSize: 12, fontWeight: '800', color: '#6366F1' }}>{s.hours}h</Text>
<Text style={{ fontSize: 10, color: P.teal }}>Score {s.quality}</Text>
</View>
</View>
))}
</View>
</ScrollView>
</View>
);
// --- SCREEN 6: STUDY SAKHA DEEP INTEGRATION HUB ---
const renderStudyAlarmsScreen = () => {
const missedTasks = plannerTasks.filter((t) => t.missed && !t.completed);
return (
<View style={{ flex: 1 }}>
<View style={[styles.header, { backgroundColor: P.card, borderBottomColor: P.borderSubtle }]}>
<View style={styles.rowCenter}>
<Pressable onPress={() => setActiveScreen('dashboard')} style={styles.iconBtn}>
<ChevronLeft size={22} color={P.text} />
</Pressable>
<View style={{ marginLeft: 4 }}>
<Text style={[styles.headerTitle, { color: P.text }]}>Study Sakha Alarms</Text>
<Text style={[styles.headerSub, { color: P.textSecondary }]}>Planner, Revision, PYQ & Exam Sync</Text>
</View>
</View>
<View style={styles.rowGap8}>
<Pressable onPress={() => setShowFocusCenterModal(true)} style={[styles.smallChipBtn, { backgroundColor: P.cardAlt }]}>
<Text style={{ fontSize: 11, fontWeight: '700', color: P.text }}>Focus</Text>
</Pressable>
<Pressable onPress={() => setShowAddTaskModal(true)} style={styles.headerSaveBtn}>
<Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>+ Task</Text>
</Pressable>
</View>
</View>
<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}>
<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
{(
[
{ id: 'planner', label: 'Planner' },
{ id: 'revision', label: 'Revision' },
{ id: 'pyq', label: 'PYQ' },
{ id: 'mocktest', label: 'Mock Test' },
{ id: 'current', label: 'Current Affairs' },
{ id: 'exam', label: 'Exam Countdown' },
] as const
).map((t) => (
<Pressable
key={t.id}
onPress={() => setStudySubTab(t.id)}
style={[styles.filterPill, { backgroundColor: studySubTab === t.id ? P.teal : P.cardAlt }]}
>
<Text style={{ fontSize: 12, fontWeight: '700', color: studySubTab === t.id ? '#FFFFFF' : P.textSecondary }}>
{t.label}
</Text>
</Pressable>
))}
</ScrollView>
{missedTasks.length > 0 && studySubTab === 'planner' && (
<View style={[styles.sectionCard, { backgroundColor: 'rgba(244,63,94,0.08)', borderColor: 'rgba(244,63,94,0.3)' }]}>
<View style={styles.rowCenter}>
<AlertTriangle size={15} color="#F43F5E" />
<Text style={{ fontSize: 12, fontWeight: '800', color: '#F43F5E', marginLeft: 6 }}>
Missed Study Reminder
</Text>
</View>
<Text style={{ fontSize: 13, fontWeight: '700', color: P.text }}>
{missedTasks[0].time} — {missedTasks[0].title}
</Text>
<View style={styles.badgeWrap}>
<Pressable
onPress={() => openCreateAlarm({ title: missedTasks[0].title, category: 'study', hour: 17, minute: 0 })}
style={[styles.smallChipBtn, { backgroundColor: '#F43F5E' }]}
>
<Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>Reschedule</Text>
</Pressable>
<Pressable
onPress={() => {
setPlannerTasks((prev) =>
prev.map((x) => (x.id === missedTasks[0].id ? { ...x, completed: true, missed: false } : x))
);
showToast('Marked as completed');
}}
style={[styles.smallChipBtn, { backgroundColor: P.card }]}
>
<Text style={{ fontSize: 11, fontWeight: '700', color: P.text }}>Mark Completed</Text>
</Pressable>
<Pressable
onPress={() => {
setPlannerTasks((prev) =>
prev.map((x) => (x.id === missedTasks[0].id ? { ...x, missed: false } : x))
);
showToast('Moved to tomorrow’s planner');
}}
style={[styles.smallChipBtn, { backgroundColor: P.card }]}
>
<Text style={{ fontSize: 11, fontWeight: '700', color: P.text }}>Tomorrow</Text>
</Pressable>
</View>
</View>
)}
{studySubTab === 'planner' &&
plannerTasks.map((task) => {
const linked = alarms.find((a) => a.id === task.alarmId);
return (
<View key={task.id} style={[styles.alarmCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<View style={styles.rowBetween}>
<View style={{ flex: 1, paddingRight: 8 }}>
<View style={styles.rowCenter}>
<Text style={{ fontSize: 11, fontWeight: '800', color: P.teal }}>{task.time}</Text>
<View style={[styles.smallChipBtn, { backgroundColor: P.cardAlt, marginLeft: 8, paddingVertical: 2 }]}>
<Text style={{ fontSize: 10, fontWeight: '600', color: P.textSecondary }}>{task.subject}</Text>
</View>
</View>
<Text
style={{
fontSize: 14,
fontWeight: '700',
color: task.completed ? P.textMuted : P.text,
textDecorationLine: task.completed ? 'line-through' : 'none',
marginTop: 4,
}}
>
{task.title}
</Text>
<Text style={{ fontSize: 11, color: P.textSecondary, marginTop: 2 }}>
          {linked ? `Alarm linked (${linked.enabled ? 'Active' : 'Paused'})` : 'No alarm set'}
</Text>
</View>
{linked ? (
<Pressable onPress={() => openEditAlarm(linked)} style={[styles.smallChipBtn, { backgroundColor: P.tealSoft }]}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.teal }}>Edit Alarm</Text>
</Pressable>
) : (
<Pressable
onPress={() => openCreateAlarm({ title: task.title, category: 'study', linkedModule: 'planner' })}
style={[styles.smallChipBtn, { backgroundColor: darkMode ? P.teal : '#0F172A' }]}
>
<Text style={{ fontSize: 12, fontWeight: '700', color: darkMode ? '#020617' : '#FFFFFF' }}>+ Alarm</Text>
</Pressable>
)}
</View>
</View>
);
})}
{studySubTab === 'revision' && (
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<Text style={{ fontSize: 14, fontWeight: '800', color: P.text }}>Schedule Topic Revision Alarm</Text>
<View style={[styles.summaryBox, { backgroundColor: 'rgba(99,102,241,0.1)' }]}>
<Text style={{ fontSize: 13, fontWeight: '800', color: '#6366F1' }}>Rajasthan History</Text>
<Text style={{ fontSize: 12, color: P.text }}>Topic: Praja Mandal Movements</Text>
<Text style={{ fontSize: 11, color: P.textSecondary }}>Suggested: 29 November · 07:00 AM</Text>
</View>
<Pressable
onPress={() =>
openCreateAlarm({
title: 'Revision: Praja Mandal Movements',
description: 'Rajasthan History — Active Recall Revision',
category: 'revision',
hour: 7,
minute: 0,
specificDate: '2026-11-29',
linkedModule: 'revision',
})
}
style={[styles.tealPrimaryBtn, { backgroundColor: '#6366F1' }]}
>
<Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Create Revision Alarm</Text>
</Pressable>
</View>
)}
{studySubTab === 'pyq' && (
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<Text style={{ fontSize: 14, fontWeight: '800', color: P.text }}>PYQ Practice Alarm</Text>
<Text style={{ fontSize: 12, color: P.textSecondary }}>
Set subject, topic & question count. Dismissing the alarm launches PYQ Practice directly.
</Text>
<View style={styles.rowGap10}>
<View style={[styles.metricTile, { backgroundColor: P.cardAlt, borderColor: 'transparent', alignItems: 'flex-start' }]}>
<Text style={{ fontSize: 10, color: P.textSecondary }}>Subject</Text>
<Text style={{ fontSize: 12, fontWeight: '800', color: P.text }}>Rajasthan Geography</Text>
</View>
<View style={[styles.metricTile, { backgroundColor: P.cardAlt, borderColor: 'transparent', alignItems: 'flex-start' }]}>
<Text style={{ fontSize: 10, color: P.textSecondary }}>Target</Text>
<Text style={{ fontSize: 12, fontWeight: '800', color: P.text }}>50 Questions</Text>
</View>
</View>
<Pressable
onPress={() =>
openCreateAlarm({
title: 'PYQ Practice — Geography (50 Qs)',
category: 'study',
hour: 16,
minute: 30,
linkedModule: 'pyq',
})
}
style={[styles.tealPrimaryBtn, { backgroundColor: P.teal }]}
>
<Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Schedule PYQ Alarm</Text>
</Pressable>
</View>
)}
{studySubTab === 'mocktest' && (
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<Text style={{ fontSize: 14, fontWeight: '800', color: P.text }}>Mock Test Alarm</Text>
<View style={[styles.summaryBox, { backgroundColor: 'rgba(244,63,94,0.1)' }]}>
<Text style={{ fontSize: 13, fontWeight: '800', color: '#F43F5E' }}>RAS Prelims Full Test #08</Text>
<Text style={{ fontSize: 12, color: P.textSecondary }}>Duration: 180 min · Pre-test alert: 15 min before</Text>
</View>
<Pressable
onPress={() =>
openCreateAlarm({
title: 'Mock Test: RAS Prelims #08',
category: 'mocktest',
hour: 10,
minute: 0,
linkedModule: 'mocktest',
heavySleeper: true,
missions: ['math'],
})
}
style={[styles.tealPrimaryBtn, { backgroundColor: '#F43F5E' }]}
>
<Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Schedule Mock Test Alarm</Text>
</Pressable>
</View>
)}
{studySubTab === 'current' && (
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<Text style={{ fontSize: 14, fontWeight: '800', color: P.text }}>Daily Current Affairs Alarm</Text>
<View style={styles.rowGap10}>
<Pressable
onPress={() =>
openCreateAlarm({
title: 'Morning Current Affairs',
category: 'study',
hour: 7,
minute: 30,
days: [...DAYS_LIST],
linkedModule: 'current_affairs',
})
}
style={[styles.metricTile, { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)', alignItems: 'flex-start', padding: 14 }]}
>
<Sun size={18} color="#F59E0B" />
<Text style={{ fontSize: 13, fontWeight: '800', color: P.text, marginTop: 6 }}>Morning Slot</Text>
<Text style={{ fontSize: 11, color: P.textSecondary }}>07:30 AM Daily</Text>
</Pressable>
<Pressable
onPress={() =>
openCreateAlarm({
title: 'Evening Current Affairs Digest',
category: 'study',
hour: 19,
minute: 30,
days: [...DAYS_LIST],
linkedModule: 'current_affairs',
})
}
style={[styles.metricTile, { backgroundColor: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.3)', alignItems: 'flex-start', padding: 14 }]}
>
<Moon size={18} color="#6366F1" />
<Text style={{ fontSize: 13, fontWeight: '800', color: P.text, marginTop: 6 }}>Evening Slot</Text>
<Text style={{ fontSize: 11, color: P.textSecondary }}>07:30 PM Daily</Text>
</Pressable>
</View>
</View>
)}
{studySubTab === 'exam' && (
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<View style={styles.rowBetween}>
<View>
<Text style={{ fontSize: 10, fontWeight: '800', color: P.teal }}>TARGET EXAM</Text>
<Text style={{ fontSize: 16, fontWeight: '800', color: P.text }}>{examTarget.name}</Text>
</View>
<View style={[styles.summaryBox, { backgroundColor: P.tealSoft, alignItems: 'center', paddingHorizontal: 14 }]}>
<Text style={{ fontSize: 18, fontWeight: '900', color: P.teal }}>30</Text>
<Text style={{ fontSize: 9, fontWeight: '800', color: P.teal }}>DAYS LEFT</Text>
</View>
</View>
{(
[
{ key: 'm30', label: '30-Day Strategy Milestone Reminder' },
{ key: 'm15', label: '15-Day Rapid Revision Reminder' },
{ key: 'm7', label: '7-Day Final Mock & Admit Card Alert' },
{ key: 'm1', label: '1-Day Exam Readiness Reminder' },
] as const
).map((m) => (
<View key={m.key} style={[styles.rowBetween, { backgroundColor: P.cardAlt, padding: 12, borderRadius: 14 }]}>
<Text style={{ fontSize: 12, fontWeight: '600', color: P.text, flex: 1 }}>{m.label}</Text>
<CustomToggle
value={examTarget[m.key]}
onChange={(v) => setExamTarget((p) => ({ ...p, [m.key]: v }))}
dark={darkMode}
/>
</View>
))}
</View>
)}
</ScrollView>
</View>
);
};
// --- SCREEN 7: ALARM STATISTICS & PERFORMANCE ANALYTICS ---
const renderStatsScreen = () => {
const weeklyTrend = Array.from({ length: 7 }, (_, index) => {
const date = new Date();
date.setHours(0, 0, 0, 0);
date.setDate(date.getDate() - (6 - index));
return { date: date.toISOString().slice(0, 10), day: date.toLocaleDateString(undefined, { weekday: 'short' }), success: 0, missed: 0, snoozes: 0 };
}).map((day) => {
const dayHistory = history.filter((item) => {
if (item.timestamp) return item.timestamp.slice(0, 10) === day.date;
if (item.date === 'Today') return day.date === new Date().toISOString().slice(0, 10);
return false;
});
return {
day: day.day,
success: dayHistory.filter((item) => item.status === 'Successful').length,
missed: dayHistory.filter((item) => item.status === 'Missed').length,
 snoozes: dayHistory.reduce((sum, item) => sum + item.snoozes, 0),
};
});
return (
<View style={{ flex: 1 }}>
<View style={[styles.header, { backgroundColor: P.card, borderBottomColor: P.borderSubtle }]}>
<View style={styles.rowCenter}>
<Pressable onPress={() => setActiveScreen('dashboard')} style={styles.iconBtn}>
<ChevronLeft size={22} color={P.text} />
</Pressable>
<View style={{ marginLeft: 4 }}>
<Text style={[styles.headerTitle, { color: P.text }]}>Alarm Analytics</Text>
<Text style={[styles.headerSub, { color: P.textSecondary }]}>Live wake-up & study consistency</Text>
</View>
</View>
<Award size={20} color="#F59E0B" />
</View>
<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 16 }}>
<View style={styles.statsGrid}>
{[
      { label: 'Success Rate', val: `${analytics.successRate}%`, color: '#14B8A6' },
      { label: 'Wake Streak', val: `${analytics.streak}d`, color: '#F59E0B' },
{ label: 'Avg Wake-up', val: analytics.avgWakeup, color: '#6366F1' },
{ label: 'Successful', val: String(analytics.successful), color: '#10B981' },
{ label: 'Missed', val: String(analytics.missed), color: '#F43F5E' },
{ label: 'Snoozes', val: String(analytics.totalSnoozes), color: '#0EA5E9' },
].map((m) => (
<View key={m.label} style={[styles.statsTile, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<Text style={{ fontSize: 10, fontWeight: '600', color: P.textSecondary }}>{m.label}</Text>
<Text style={{ fontSize: 17, fontWeight: '900', color: m.color, marginTop: 2 }}>{m.val}</Text>
</View>
))}
</View>
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<Text style={{ fontSize: 14, fontWeight: '800', color: P.text }}>Successful vs Missed Alarms</Text>
<NativeSuccessMissedChart data={weeklyTrend} dark={darkMode} />
</View>
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<Text style={{ fontSize: 14, fontWeight: '800', color: P.text }}>Weekly Snooze Frequency</Text>
<NativeSnoozeAreaChart data={weeklyTrend} dark={darkMode} />
</View>
<View style={[styles.sectionCard, { backgroundColor: P.tealSoft, borderColor: 'rgba(20,184,166,0.3)' }]}>
<View style={styles.rowCenter}>
<Sparkles size={15} color={P.teal} />
<Text style={{ fontSize: 11, fontWeight: '800', color: P.teal, marginLeft: 6, letterSpacing: 1 }}>
SMART INSIGHTS
</Text>
</View>
<Text style={{ fontSize: 12, color: P.text }}>
• Successful wake-ups: {analytics.successful} · Missed alarms: {analytics.missed}.
</Text>
<Text style={{ fontSize: 12, color: P.text }}>
• Study reminder completion rate: {analytics.studyRate}%.
</Text>
<Text style={{ fontSize: 12, color: P.text }}>
• Snoozes recorded: {analytics.totalSnoozes}.
</Text>
</View>
</ScrollView>
{renderAlarmBottomNav()}
</View>
);
};
// --- SCREEN 8: ALARM HISTORY ---
const renderHistoryScreen = () => {
const filtered = history.filter((h) => {
const matchSearch =
h.label.toLowerCase().includes(historySearch.toLowerCase()) ||
(h.linkedTask || '').toLowerCase().includes(historySearch.toLowerCase());
if (!matchSearch) return false;
if (historyFilter === 'All') return true;
if (historyFilter === 'Study') return ['study', 'revision', 'mocktest', 'focus'].includes(h.category);
if (historyFilter === 'Personal') return ['wakeup', 'personal', 'bedtime'].includes(h.category);
return h.status === historyFilter;
});
return (
<View style={{ flex: 1 }}>
<View style={[styles.header, { backgroundColor: P.card, borderBottomColor: P.borderSubtle }]}>
<View style={styles.rowCenter}>
<Pressable onPress={() => setActiveScreen('dashboard')} style={styles.iconBtn}>
<ChevronLeft size={22} color={P.text} />
</Pressable>
<View style={{ marginLeft: 4 }}>
<Text style={[styles.headerTitle, { color: P.text }]}>Alarm History</Text>
<Text style={[styles.headerSub, { color: P.textSecondary }]}>{history.length} recorded events</Text>
</View>
</View>
</View>
<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}>
<View style={[styles.searchBox, { backgroundColor: P.card, borderColor: P.border }]}>
<Search size={16} color={P.textMuted} />
<TextInput
value={historySearch}
onChangeText={setHistorySearch}
placeholder="Search alarms, tasks, missions..."
placeholderTextColor={P.textMuted}
style={{ flex: 1, marginLeft: 8, fontSize: 13, color: P.text }}
/>
</View>
<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
{['All', 'Successful', 'Missed', 'Snoozed', 'Skipped', 'Study', 'Personal'].map((f) => (
<Pressable
key={f}
onPress={() => setHistoryFilter(f)}
style={[
styles.filterPill,
{ backgroundColor: historyFilter === f ? (darkMode ? P.teal : '#0F172A') : P.cardAlt },
]}
>
<Text
style={{
fontSize: 12,
fontWeight: '700',
color: historyFilter === f ? (darkMode ? '#020617' : '#FFFFFF') : P.textSecondary,
}}
>
{f}
</Text>
</Pressable>
))}
</ScrollView>
{filtered.map((item) => {
const statusColor =
item.status === 'Successful'
? '#10B981'
: item.status === 'Missed'
? '#F43F5E'
: item.status === 'Snoozed'
? '#F59E0B'
: P.textSecondary;
return (
<View key={item.id} style={[styles.alarmCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<View style={styles.rowBetweenStart}>
<View style={{ flex: 1 }}>
<Text style={{ fontSize: 13, fontWeight: '800', color: P.text }}>{item.label}</Text>
<Text style={{ fontSize: 11, color: P.textSecondary, marginTop: 2 }}>
{item.date} · {item.time}
</Text>
</View>
      <View style={[styles.miniBadge, { backgroundColor: `${statusColor}20` }]}>
<Text style={{ fontSize: 10, fontWeight: '800', color: statusColor }}>{item.status}</Text>
</View>
</View>
<View style={[styles.badgeWrap, { marginTop: 8 }]}>
{item.mission && item.mission !== 'None' && (
<View style={[styles.smallChipBtn, { backgroundColor: P.cardAlt, paddingVertical: 3 }]}>
<Text style={{ fontSize: 10, fontWeight: '600', color: P.textSecondary }}>
Mission: {item.mission}
</Text>
</View>
)}
{!!item.linkedTask && (
<View style={[styles.smallChipBtn, { backgroundColor: P.tealSoft, paddingVertical: 3 }]}>
<Text style={{ fontSize: 10, fontWeight: '700', color: P.teal }}>
Task: {item.linkedTask}
</Text>
</View>
)}
</View>
</View>
);
})}
</ScrollView>
</View>
);
};
// --- SCREEN 9: ALARM THEME LIBRARY (ALL 22 THEMES) ---
const renderThemesScreen = () => (
<View style={{ flex: 1 }}>
<View style={[styles.header, { backgroundColor: P.card, borderBottomColor: P.borderSubtle }]}>
<View style={styles.rowCenter}>
<Pressable onPress={() => setActiveScreen('dashboard')} style={styles.iconBtn}>
<ChevronLeft size={22} color={P.text} />
</Pressable>
<View style={{ marginLeft: 4 }}>
<Text style={[styles.headerTitle, { color: P.text }]}>Alarm Themes</Text>
<Text style={[styles.headerSub, { color: P.textSecondary }]}>
{ALARM_THEMES.length} curated immersive themes
</Text>
</View>
</View>
<Pressable
onPress={() => {
if (alarms[0]) triggerAlarmRinging(alarms[0]);
else showToast('Create an alarm to preview the ringing theme');
}}
style={[styles.headerSaveBtn, styles.rowCenter, { gap: 4 }]}
>
<Eye size={13} color="#FFFFFF" />
<Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Test Live</Text>
</Pressable>
</View>
<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}>
<LinearGradient colors={[...activeTheme.colors]} style={styles.heroCard}>
<View style={styles.rowBetween}>
<Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>Active Theme</Text>
<Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>{activeTheme.name}</Text>
</View>
<Text style={{ color: '#FFFFFF', fontSize: 34, fontWeight: '900', marginTop: 12 }}>{nextAlarm ? `${formatAlarmTime(nextAlarm.hour, nextAlarm.minute, settings.use24h).timeStr} ${formatAlarmTime(nextAlarm.hour, nextAlarm.minute, settings.use24h).period}`.trim() : 'No alarm'}</Text>
<Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 }}>
{nextAlarm?.title || 'Create an alarm to preview this theme'}
</Text>
</LinearGradient>
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>Animated Background</Text>
<CustomToggle value={themeAnimated} onChange={setThemeAnimated} dark={darkMode} />
</View>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '600', color: P.textSecondary }}>
Visual Intensity: {themeIntensity}%
</Text>
<View style={styles.rowGap8}>
<Pressable
onPress={() => setThemeIntensity((v) => Math.max(40, v - 15))}
style={[styles.smallChipBtn, { backgroundColor: P.cardAlt }]}
>
<Text style={{ fontWeight: '800', color: P.text }}>-</Text>
</Pressable>
<Pressable
onPress={() => setThemeIntensity((v) => Math.min(100, v + 15))}
style={[styles.smallChipBtn, { backgroundColor: P.cardAlt }]}
>
<Text style={{ fontWeight: '800', color: P.text }}>+</Text>
</Pressable>
</View>
</View>
</View>
<View style={styles.themeGrid}>
{ALARM_THEMES.map((t) => {
const selected = activeThemeId === t.id;
return (
<Pressable
key={t.id}
onPress={() => {
setActiveThemeId(t.id);
    showToast(`Applied "${t.name}" theme`);
}}
style={[
styles.themeCardWrap,
selected && { borderColor: '#2DD4BF', borderWidth: 2.5 },
]}
>
<LinearGradient colors={[...t.colors]} style={styles.themeCardInner}>
<View style={styles.rowBetween}>
<View style={styles.themeGroupPill}>
<Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '700' }}>{t.group}</Text>
</View>
{selected && <CheckCircle2 size={16} color="#5EEAD4" />}
</View>
<Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>{t.name}</Text>
</LinearGradient>
</Pressable>
);
})}
</View>
</ScrollView>
</View>
);
// --- SCREEN 10: ALARM SETTINGS ---
const renderSettingsScreen = () => {
const setS = <K extends keyof AlarmSettingsState>(k: K, v: AlarmSettingsState[K]) =>
setSettings((prev) => ({ ...prev, [k]: v }));
return (
<View style={{ flex: 1 }}>
<View style={[styles.header, { backgroundColor: P.card, borderBottomColor: P.borderSubtle }]}>
<View style={styles.rowCenter}>
<Pressable onPress={() => setActiveScreen('dashboard')} style={styles.iconBtn}>
<ChevronLeft size={22} color={P.text} />
</Pressable>
<View style={{ marginLeft: 4 }}>
<Text style={[styles.headerTitle, { color: P.text }]}>Alarm Settings</Text>
<Text style={[styles.headerSub, { color: P.textSecondary }]}>Personalization & system defaults</Text>
</View>
</View>
</View>
<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 14 }}>
<Pressable onPress={() => setActiveScreen('themes')}>
<LinearGradient colors={[...activeTheme.colors]} style={[styles.heroCard, styles.rowBetween]}>
<View>
<View style={[styles.themeGroupPill, { alignSelf: 'flex-start', marginBottom: 6 }]}>
<Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800' }}>PREMIUM PERSONALIZATION</Text>
</View>
<Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
Theme Library ({ALARM_THEMES.length} Styles)
</Text>
<Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 }}>
Current: {activeTheme.name}
</Text>
</View>
<Palette size={26} color="#FFFFFF" />
</LinearGradient>
</Pressable>
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<Text style={[styles.sectionLabel, { color: P.textMuted }]}>DISPLAY SETTINGS</Text>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>Appearance Mode</Text>
<View style={[styles.rowGap8, { backgroundColor: P.cardAlt, padding: 3, borderRadius: 12 }]}>
<Pressable
onPress={() => setDarkMode(false)}
style={[styles.smallChipBtn, !darkMode && { backgroundColor: '#FFFFFF' }]}
>
<Text style={{ fontSize: 11, fontWeight: '700', color: !darkMode ? '#0F172A' : P.textSecondary }}>
Light
</Text>
</Pressable>
<Pressable
onPress={() => setDarkMode(true)}
style={[styles.smallChipBtn, darkMode && { backgroundColor: '#334155' }]}
>
<Text style={{ fontSize: 11, fontWeight: '700', color: darkMode ? '#FFFFFF' : P.textSecondary }}>
Dark
</Text>
</Pressable>
</View>
</View>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>Minimal Display Mode</Text>
<CustomToggle value={settings.minimalDisplay} onChange={(v) => setS('minimalDisplay', v)} dark={darkMode} />
</View>
</View>
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<Text style={[styles.sectionLabel, { color: P.textMuted }]}>WAKE-UP & SOUND DEFAULTS</Text>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>Default Snooze</Text>
<View style={styles.rowGap8}>
{[5, 10, 15].map((m) => (
<Pressable
key={m}
onPress={() => setS('defaultSnooze', m)}
style={[
styles.smallChipBtn,
{ backgroundColor: settings.defaultSnooze === m ? P.teal : P.cardAlt },
]}
>
<Text
style={{
fontSize: 11,
fontWeight: '700',
color: settings.defaultSnooze === m ? '#FFFFFF' : P.textSecondary,
}}
>
{m}m
</Text>
</Pressable>
))}
</View>
</View>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>Gradual Volume Increase</Text>
<CustomToggle value={settings.gradualVolume} onChange={(v) => setS('gradualVolume', v)} dark={darkMode} />
</View>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>Spoken Wake-up Messages</Text>
<CustomToggle value={settings.spokenMessages} onChange={(v) => setS('spokenMessages', v)} dark={darkMode} />
</View>
</View>
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<Text style={[styles.sectionLabel, { color: P.textMuted }]}>NOTIFICATIONS & GENERAL</Text>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>24-Hour Time Format</Text>
<CustomToggle value={settings.use24h} onChange={(v) => setS('use24h', v)} dark={darkMode} />
</View>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>Upcoming Alarm Notifications</Text>
<CustomToggle value={settings.notifyUpcoming} onChange={(v) => setS('notifyUpcoming', v)} dark={darkMode} />
</View>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>Missed Study Task Alerts</Text>
<CustomToggle value={settings.notifyMissed} onChange={(v) => setS('notifyMissed', v)} dark={darkMode} />
</View>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>Time Zone</Text>
<Text style={{ fontSize: 12, color: P.textSecondary }}>{settings.timezone}</Text>
</View>
<Pressable
onPress={() => setShowResetConfirm(true)}
style={[styles.footerBtn, { backgroundColor: 'rgba(244,63,94,0.12)', marginTop: 4 }]}
>
<RotateCcw size={14} color="#F43F5E" />
<Text style={{ color: '#F43F5E', fontSize: 12, fontWeight: '800' }}>Reset Default Settings</Text>
</Pressable>
</View>
</ScrollView>
<Modal visible={showResetConfirm} transparent animationType="fade">
<View style={[styles.modalBackdrop, { justifyContent: 'center', padding: 24 }]}>
<View style={[styles.bottomSheet, { backgroundColor: P.card, borderRadius: 24 }]}>
<Text style={{ fontSize: 15, fontWeight: '800', color: P.text }}>Reset Alarm Settings?</Text>
<Text style={{ fontSize: 12, color: P.textSecondary }}>
This restores sound, snooze, and display preferences to factory defaults.
</Text>
<View style={styles.rowGap10}>
<Pressable onPress={() => setShowResetConfirm(false)} style={[styles.footerBtn, { backgroundColor: P.cardAlt }]}>
<Text style={{ color: P.text, fontWeight: '700', fontSize: 12 }}>Cancel</Text>
</Pressable>
<Pressable
onPress={() => {
setSettings(DEFAULT_SETTINGS);
setActiveThemeId('starry_sky');
setShowResetConfirm(false);
showToast('Settings restored to defaults');
}}
style={[styles.footerBtn, { backgroundColor: '#F43F5E' }]}
>
<Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Reset</Text>
</Pressable>
</View>
</View>
</View>
</Modal>
{renderAlarmBottomNav()}
</View>
);
};
// --- SCREEN 11: FRIENDS — WAKE UP TOGETHER ---
const renderFriendsScreen = () => {
const awakeCount = friends.filter((f) => f.statusType === 'awake' || f.statusType === 'studying').length;
return (
<View style={{ flex: 1 }}>
<View style={[styles.header, { backgroundColor: P.card, borderBottomColor: P.borderSubtle }]}>
<View style={styles.rowCenter}>
<Pressable onPress={() => setActiveScreen('dashboard')} style={styles.iconBtn}>
<ChevronLeft size={22} color={P.text} />
</Pressable>
<View style={{ marginLeft: 4 }}>
<Text style={[styles.headerTitle, { color: P.text }]}>Friends</Text>
<Text style={[styles.headerSub, { color: P.textSecondary }]}>Wake up together & stay accountable</Text>
</View>
</View>
<Pressable onPress={() => setShowInviteFriendModal(true)} style={[styles.shortcutIconBox, { backgroundColor: P.cardAlt }]}>
<UserPlus size={18} color={P.text} />
</Pressable>
</View>
{friends.length === 0 ? (
<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 80 }}>
<View style={styles.friendsAvatarGrid}>
<FriendBuddyAvatar type="circle" size="lg" />
<FriendBuddyAvatar type="square" size="lg" />
<FriendBuddyAvatar type="clover" size="lg" />
<FriendBuddyAvatar type="cloud" size="lg" />
</View>
<Text style={{ fontSize: 20, fontWeight: '800', color: P.text, marginTop: 28 }}>No friends yet</Text>
<Text style={{ fontSize: 14, color: P.textSecondary, marginTop: 6 }}>
Wake up together with friends.
</Text>
<Pressable
onPress={() => setShowInviteFriendModal(true)}
style={[
styles.inviteMainBtn,
{ backgroundColor: darkMode ? P.teal : '#333847' },
]}
>
<Text style={{ color: darkMode ? '#020617' : '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
Invite Friends
</Text>
</Pressable>
<Pressable
onPress={() => {
setFriends(SUGGESTED_STUDY_BUDDIES);
showToast('Loaded 4 RAS Study Buddies');
}}
style={{ marginTop: 14, padding: 6 }}
>
<Text style={{ color: P.teal, fontSize: 12, fontWeight: '700' }}>
Preview with Demo Study Buddies
</Text>
</Pressable>
</View>
) : (
<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 14 }}>
<LinearGradient colors={['#232634', '#2C3144', '#172B3A']} style={styles.heroCard}>
<View style={styles.rowBetween}>
<View style={[styles.miniBadge, { backgroundColor: 'rgba(245,158,11,0.2)' }]}>
<Text style={{ color: '#FCD34D', fontSize: 10, fontWeight: '800' }}>MORNING STUDY SQUAD</Text>
</View>
<Text style={{ color: '#5EEAD4', fontSize: 12, fontWeight: '700' }}>
{awakeCount}/{friends.length} Awake
</Text>
</View>
<Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 10 }}>
Wake Up Together · 06:00 AM
</Text>
<Text style={{ color: '#CBD5E1', fontSize: 12, marginTop: 4 }}>
Nudge snoozing friends or celebrate early risers in your RAS study circle.
</Text>
<View style={[styles.rowGap8, { marginTop: 14 }]}>
<Pressable
onPress={() =>
openCreateAlarm({
title: 'Morning Squad — Wake Up Together',
category: 'wakeup',
hour: 6,
minute: 0,
sharedWithFriends: true,
})
}
style={[styles.heroActionBtn, { flex: 1, backgroundColor: '#14B8A6' }]}
>
<AlarmClock size={14} color="#020617" />
<Text style={{ color: '#020617', fontSize: 12, fontWeight: '800' }}>New Squad Alarm</Text>
</Pressable>
<Pressable onPress={() => setShowInviteFriendModal(true)} style={[styles.heroActionBtn, { paddingHorizontal: 14 }]}>
<UserPlus size={14} color="#FFFFFF" />
<Text style={styles.heroActionText}>Invite</Text>
</Pressable>
</View>
</LinearGradient>
{friends.map((f) => {
const sColor =
f.statusType === 'awake' || f.statusType === 'studying'
? '#10B981'
: f.statusType === 'snoozing'
? '#F59E0B'
: P.textSecondary;
return (
<View key={f.id} style={[styles.alarmCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<View style={styles.rowBetween}>
<View style={[styles.rowCenter, { flex: 1, paddingRight: 8 }]}>
<FriendBuddyAvatar type={f.avatarType} size="md" />
<View style={{ marginLeft: 10, flex: 1 }}>
<View style={styles.rowCenter}>
<Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '800', color: P.text }}>
{f.name}
</Text>
<Flame size={12} color="#F59E0B" style={{ marginLeft: 5 }} />
<Text style={{ fontSize: 11, fontWeight: '700', color: '#F59E0B', marginLeft: 2 }}>
{f.streak}d
</Text>
</View>
<Text style={{ fontSize: 11, color: P.textSecondary }}>
{f.exam} · Target {f.targetTime}
</Text>
      <View style={[styles.miniBadge, { backgroundColor: `${sColor}20`, alignSelf: 'flex-start', marginTop: 4 }]}>
<Text style={{ fontSize: 10, fontWeight: '700', color: sColor }}>{f.status}</Text>
</View>
</View>
</View>
<View style={styles.rowCenter}>
<Pressable
onPress={() => nudgeFriend(f.id)}
style={[
styles.smallChipBtn,
styles.rowCenter,
{
gap: 4,
backgroundColor: f.nudged ? P.tealSoft : darkMode ? P.teal : '#0F172A',
},
]}
>
<BellRing size={13} color={f.nudged ? P.teal : darkMode ? '#020617' : '#FFFFFF'} />
<Text
style={{
fontSize: 11,
fontWeight: '700',
color: f.nudged ? P.teal : darkMode ? '#020617' : '#FFFFFF',
}}
>
{f.nudged ? 'Nudged' : f.statusType === 'snoozing' ? 'Nudge' : 'Cheer'}
</Text>
</Pressable>
<Pressable onPress={() => removeFriend(f.id)} style={{ padding: 6, marginLeft: 2 }}>
<X size={16} color={P.textMuted} />
</Pressable>
</View>
</View>
</View>
);
})}
</ScrollView>
)}
{renderAlarmBottomNav()}
</View>
);
};
// ============================================================================
// 10. ROOT MODULE SWITCHER & SHARED MODALS
// ============================================================================
const renderScreen = () => {
switch (activeScreen) {
case 'dashboard': return renderDashboardScreen();
case 'editor': return renderEditorScreen();
case 'ringing': return renderRingingScreen();
case 'morning': return renderMorningScreen();
case 'sleep': return renderSleepScreen();
case 'studyAlarms': return renderStudyAlarmsScreen();
case 'stats': return renderStatsScreen();
case 'history': return renderHistoryScreen();
case 'themes': return renderThemesScreen();
case 'settings': return renderSettingsScreen();
case 'friends': return renderFriendsScreen();
default: return renderDashboardScreen();
}
};
return (
<SafeAreaView style={{ flex: 1, backgroundColor: P.bg }}>
<StatusBar barStyle={darkMode || activeScreen === 'ringing' ? 'light-content' : 'dark-content'} />
{renderScreen()}
{/* Toast Pill */}
{!!toastMsg && (
<View style={[styles.toastPill, { backgroundColor: darkMode ? '#FFFFFF' : '#0F172A' }]}>
<CheckCircle2 size={15} color="#14B8A6" />
<Text style={{ color: darkMode ? '#020617' : '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
{toastMsg}
</Text>
</View>
)}
{/* Add Study Planner Task Modal ("Add Alarm for this task?") */}
<Modal visible={showAddTaskModal} transparent animationType="slide">
<View style={styles.modalBackdrop}>
<View style={[styles.bottomSheet, { backgroundColor: P.card }]}>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 16, fontWeight: '800', color: P.text }}>Add Study Planner Task</Text>
<Pressable onPress={() => setShowAddTaskModal(false)}>
<X size={20} color={P.textSecondary} />
</Pressable>
</View>
<TextInput
value={newTaskTitle}
onChangeText={setNewTaskTitle}
placeholder="e.g., Mewar Dynasty Notes Revision"
placeholderTextColor={P.textMuted}
style={[styles.inputBox, { backgroundColor: P.cardAlt, borderColor: P.border, color: P.text }]}
/>
<View style={styles.rowGap10}>
<TextInput
value={newTaskTime}
onChangeText={setNewTaskTime}
placeholder="07:00"
placeholderTextColor={P.textMuted}
style={[styles.inputBox, { flex: 1, backgroundColor: P.cardAlt, borderColor: P.border, color: P.text }]}
/>
<TextInput
value={newTaskSubject}
onChangeText={setNewTaskSubject}
placeholder="Subject"
placeholderTextColor={P.textMuted}
style={[styles.inputBox, { flex: 1, backgroundColor: P.cardAlt, borderColor: P.border, color: P.text }]}
/>
</View>
<View style={[styles.summaryBox, { backgroundColor: P.tealSoft }]}>
<View style={styles.rowCenter}>
<AlarmClock size={15} color={P.teal} />
<Text style={{ fontSize: 12, fontWeight: '800', color: P.teal, marginLeft: 6 }}>
Add Alarm for this task?
</Text>
</View>
<Text style={{ fontSize: 11, color: P.textSecondary }}>
Automatically links a Study Alarm to keep you on schedule.
</Text>
</View>
<View style={styles.rowGap10}>
<Pressable onPress={() => handleCreateTask(false)} style={[styles.footerBtn, { backgroundColor: P.cardAlt }]}>
<Text style={{ color: P.text, fontWeight: '700', fontSize: 12 }}>Skip Alarm</Text>
</Pressable>
<Pressable onPress={() => handleCreateTask(true)} style={[styles.footerBtn, { backgroundColor: P.teal }]}>
<Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Add Task + Alarm</Text>
</Pressable>
</View>
</View>
</View>
</Modal>
{/* Focus Center Integration Modal */}
<Modal visible={showFocusCenterModal} transparent animationType="slide">
<View style={styles.modalBackdrop}>
<View style={[styles.bottomSheet, { backgroundColor: P.card }]}>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 16, fontWeight: '800', color: P.text }}>Focus Center Alarms</Text>
<Pressable onPress={() => setShowFocusCenterModal(false)}>
<X size={20} color={P.textSecondary} />
</Pressable>
</View>
{[
{ title: 'Start Focus Session (50 min)', desc: 'Deep work block with Focus Lock', cat: 'focus' as AlarmCategoryId, h: 9, m: 0 },
{ title: 'Pomodoro Break Reminder', desc: '10-minute eye & stretch break', cat: 'focus' as AlarmCategoryId, h: 10, m: 0 },
{ title: 'Morning Meditation Reminder', desc: '15-minute calm mindfulness session', cat: 'personal' as AlarmCategoryId, h: 6, m: 30 },
{ title: 'Long Study Session Check-in', desc: '3-hour RAS marathon checkpoint', cat: 'study' as AlarmCategoryId, h: 14, m: 0 },
].map((item) => (
<Pressable
key={item.title}
onPress={() => {
setShowFocusCenterModal(false);
openCreateAlarm({ title: item.title, description: item.desc, category: item.cat, hour: item.h, minute: item.m });
}}
style={[styles.rowBetween, { backgroundColor: P.cardAlt, padding: 12, borderRadius: 16 }]}
>
<View style={{ flex: 1 }}>
<Text style={{ fontSize: 13, fontWeight: '700', color: P.text }}>{item.title}</Text>
<Text style={{ fontSize: 11, color: P.textSecondary }}>{item.desc}</Text>
</View>
<Plus size={18} color={P.teal} />
</Pressable>
))}
</View>
</View>
</Modal>
{/* Invite Study Friends Modal */}
<Modal visible={showInviteFriendModal} transparent animationType="slide">
<View style={styles.modalBackdrop}>
<View style={[styles.bottomSheet, { backgroundColor: P.card, maxHeight: '85%' }]}>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 16, fontWeight: '800', color: P.text }}>Invite Study Friends</Text>
<Pressable onPress={() => setShowInviteFriendModal(false)}>
<X size={20} color={P.textSecondary} />
</Pressable>
</View>
<View style={[styles.rowBetween, { backgroundColor: P.cardAlt, padding: 14, borderRadius: 18 }]}>
<View>
<Text style={{ fontSize: 10, fontWeight: '700', color: P.textMuted }}>YOUR STUDY SAKHA CODE</Text>
<Text style={{ fontSize: 15, fontWeight: '900', color: P.text, letterSpacing: 1 }}>SAKHA-KAM-26</Text>
</View>
<Pressable
onPress={() => {
Share.share({
message: 'Join my Study Sakha Wake-Up Squad! Use invite code: SAKHA-KAM-26',
}).catch(() => showToast('Invite code SAKHA-KAM-26 ready to share'));
}}
style={[styles.smallChipBtn, styles.rowCenter, { gap: 5, backgroundColor: darkMode ? P.teal : '#333847' }]}
>
<Share2 size={13} color={darkMode ? '#020617' : '#FFFFFF'} />
<Text style={{ fontSize: 12, fontWeight: '700', color: darkMode ? '#020617' : '#FFFFFF' }}>Share</Text>
</Pressable>
</View>
<View style={styles.rowGap8}>
<TextInput
value={inviteInput}
onChangeText={setInviteInput}
placeholder="Enter friend's name or code..."
placeholderTextColor={P.textMuted}
style={[styles.inputBox, { flex: 1, backgroundColor: P.cardAlt, borderColor: P.border, color: P.text }]}
/>
<Pressable
onPress={() => {
if (!inviteInput.trim()) return;
const types: FriendBuddyItem['avatarType'][] = ['circle', 'square', 'clover', 'cloud'];
addFriendToSquad({
      id: `fr-${Date.now()}`,
name: inviteInput.trim(),
      handle: `@${inviteInput.trim().toLowerCase().replace(/\s+/g, '_')}`,
exam: 'RAS 2026',
avatarType: types[friends.length % types.length],
status: 'Invited · Syncs at 06:00 AM',
statusType: 'sleeping',
streak: 1,
targetTime: '06:00 AM',
nudged: false,
});
setInviteInput('');
setShowInviteFriendModal(false);
}}
style={[styles.headerSaveBtn, styles.rowCenter, { gap: 5, paddingHorizontal: 16 }]}
>
<Send size={13} color="#FFFFFF" />
<Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Add</Text>
</Pressable>
</View>
<Text style={[styles.sectionLabel, { color: P.textMuted }]}>SUGGESTED STUDY BUDDIES</Text>
<ScrollView contentContainerStyle={{ gap: 8 }}>
{SUGGESTED_STUDY_BUDDIES.map((b) => {
const added = friends.some((f) => f.id === b.id);
return (
<View key={b.id} style={[styles.rowBetween, { backgroundColor: P.cardAlt, padding: 10, borderRadius: 16 }]}>
<View style={styles.rowCenter}>
<FriendBuddyAvatar type={b.avatarType} size="sm" />
<View style={{ marginLeft: 10 }}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>{b.name}</Text>
<Text style={{ fontSize: 10, color: P.textSecondary }}>
{b.exam} · {b.targetTime}
</Text>
</View>
</View>
<Pressable
disabled={added}
onPress={() => addFriendToSquad(b)}
style={[
styles.smallChipBtn,
{ backgroundColor: added ? 'rgba(16,185,129,0.16)' : darkMode ? P.teal : '#333847' },
]}
>
<Text
style={{
fontSize: 11,
fontWeight: '700',
color: added ? '#10B981' : darkMode ? '#020617' : '#FFFFFF',
}}
>
{added ? 'Added' : 'Add'}
</Text>
</Pressable>
</View>
);
})}
</ScrollView>
</View>
</View>
</Modal>
</SafeAreaView>
);
}
// Default Export: Drop directly into your existing React Navigation Alarm Screen route
export function StudySakhaAlarmModule(props: StudySakhaAlarmModuleProps) {
return (
<AlarmStoreProvider>
<AlarmModuleInner {...props} />
</AlarmStoreProvider>
);
}
export default StudySakhaAlarmModule;
// ============================================================================
// 11. REACT NATIVE STYLESHEET (1:1 VISUAL PARITY WITH GEMINI PROTOTYPE)
// ============================================================================
const styles = StyleSheet.create({
fullScreen: { flex: 1 },
header: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'space-between',
paddingHorizontal: 14,
paddingVertical: 12,
borderBottomWidth: 1,
},
headerTitle: { fontSize: 17, fontWeight: '800' },
headerSub: { fontSize: 11, marginTop: 1 },
headerSaveBtn: {
backgroundColor: '#14B8A6',
paddingHorizontal: 14,
paddingVertical: 8,
borderRadius: 12,
},
iconBtn: { padding: 8, borderRadius: 12 },
rowCenter: { flexDirection: 'row', alignItems: 'center' },
rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
rowBetweenStart: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
rowGap8: { flexDirection: 'row', alignItems: 'center', gap: 8 },
rowGap10: { flexDirection: 'row', alignItems: 'center', gap: 10 },
badgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
heroCard: {
borderRadius: 26,
padding: 20,
shadowColor: '#000',
shadowOpacity: 0.18,
shadowRadius: 14,
shadowOffset: { width: 0, height: 6 },
elevation: 6,
},
nextBadge: {
flexDirection: 'row',
alignItems: 'center',
gap: 6,
backgroundColor: 'rgba(20,184,166,0.2)',
borderColor: 'rgba(45,212,191,0.35)',
borderWidth: 1,
paddingHorizontal: 10,
paddingVertical: 4,
borderRadius: 999,
},
tealDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2DD4BF' },
nextBadgeText: { color: '#5EEAD4', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
heroCatPill: {
backgroundColor: 'rgba(255,255,255,0.12)',
paddingHorizontal: 10,
paddingVertical: 4,
borderRadius: 999,
},
heroTime: { fontSize: 38, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
heroPeriod: { fontSize: 17, fontWeight: '700', color: '#5EEAD4' },
countdownBar: {
marginTop: 14,
backgroundColor: 'rgba(0,0,0,0.26)',
borderColor: 'rgba(255,255,255,0.12)',
borderWidth: 1,
borderRadius: 16,
paddingHorizontal: 14,
paddingVertical: 10,
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
},
countdownMono: {
color: '#5EEAD4',
fontSize: 14,
fontWeight: '800',
fontVariant: ['tabular-nums'],
},
heroActionBtn: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'center',
gap: 5,
backgroundColor: 'rgba(255,255,255,0.14)',
paddingVertical: 9,
borderRadius: 12,
},
heroActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
heroCreateBtn: {
marginTop: 12,
backgroundColor: '#14B8A6',
paddingHorizontal: 18,
paddingVertical: 10,
borderRadius: 14,
},
shortcutGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
shortcutCard: {
width: '31.5%',
flexDirection: 'row',
alignItems: 'center',
gap: 8,
padding: 10,
borderRadius: 16,
borderWidth: 1,
},
shortcutIconBox: {
width: 32,
height: 32,
borderRadius: 10,
alignItems: 'center',
justifyContent: 'center',
},
smallChipBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
filterPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
emptyCard: {
borderRadius: 24,
borderWidth: 1,
borderStyle: 'dashed',
padding: 28,
alignItems: 'center',
},
emptyIconBox: {
width: 56,
height: 56,
borderRadius: 18,
alignItems: 'center',
justifyContent: 'center',
},
alarmCard: {
borderRadius: 24,
padding: 16,
borderWidth: 1,
},
miniBadge: {
flexDirection: 'row',
alignItems: 'center',
gap: 4,
paddingHorizontal: 8,
paddingVertical: 3,
borderRadius: 8,
},
miniBadgeText: { fontSize: 10, fontWeight: '700' },
alarmTimeText: { fontSize: 28, fontWeight: '900', letterSpacing: -0.6 },
inlineMenu: {
marginTop: 12,
borderRadius: 16,
borderWidth: 1,
paddingVertical: 4,
},
menuRow: {
flexDirection: 'row',
alignItems: 'center',
gap: 10,
paddingHorizontal: 14,
paddingVertical: 10,
},
menuText: { fontSize: 12, fontWeight: '700' },
toggleTrack: {
width: 48,
height: 28,
borderRadius: 999,
padding: 4,
justifyContent: 'center',
},
toggleThumb: {
width: 20,
height: 20,
borderRadius: 10,
backgroundColor: '#FFFFFF',
elevation: 2,
},
fabWrap: {
position: 'absolute',
right: 18,
bottom: 84,
borderRadius: 999,
elevation: 8,
shadowColor: '#14B8A6',
shadowOpacity: 0.35,
shadowRadius: 10,
shadowOffset: { width: 0, height: 4 },
},
fabGradient: {
flexDirection: 'row',
alignItems: 'center',
gap: 6,
paddingHorizontal: 20,
paddingVertical: 13,
borderRadius: 999,
},
bottomNav: {
position: 'absolute',
left: 0,
right: 0,
bottom: 0,
flexDirection: 'row',
justifyContent: 'space-around',
paddingVertical: 8,
paddingBottom: Platform.OS === 'ios' ? 20 : 10,
borderTopWidth: 1,
},
bottomNavItem: { alignItems: 'center', gap: 3, minWidth: 68 },
bottomNavPill: {
paddingHorizontal: 16,
paddingVertical: 6,
borderRadius: 999,
position: 'relative',
},
navBadge: {
position: 'absolute',
top: -3,
right: 2,
minWidth: 16,
height: 16,
borderRadius: 8,
backgroundColor: '#F59E0B',
alignItems: 'center',
justifyContent: 'center',
paddingHorizontal: 3,
},
navBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
snoozeBanner: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'space-between',
padding: 12,
borderRadius: 18,
backgroundColor: '#FFFBEB',
borderWidth: 1,
borderColor: '#FDE68A',
},
snoozeDismissBtn: {
backgroundColor: '#F59E0B',
paddingHorizontal: 10,
paddingVertical: 6,
borderRadius: 10,
},
sectionCard: {
borderRadius: 24,
padding: 16,
borderWidth: 1,
gap: 12,
},
sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
inputBox: {
borderWidth: 1,
borderRadius: 14,
paddingHorizontal: 14,
paddingVertical: 11,
fontSize: 14,
},
inlineInput: {
borderWidth: 1,
borderRadius: 12,
paddingHorizontal: 12,
paddingVertical: 6,
fontSize: 12,
minWidth: 120,
textAlign: 'center',
},
catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
catGridItem: {
width: '23%',
alignItems: 'center',
gap: 4,
paddingVertical: 10,
paddingHorizontal: 4,
borderRadius: 14,
borderWidth: 1,
},
dayCircle: {
width: 38,
height: 38,
borderRadius: 19,
alignItems: 'center',
justifyContent: 'center',
},
timeStepperRow: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'center',
gap: 14,
marginVertical: 10,
},
stepBtn: {
backgroundColor: 'rgba(255,255,255,0.12)',
paddingHorizontal: 14,
paddingVertical: 7,
borderRadius: 10,
},
stepBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
stepperDigits: {
color: '#FFFFFF',
fontSize: 44,
fontWeight: '900',
marginVertical: 4,
fontVariant: ['tabular-nums'],
},
periodBtn: {
backgroundColor: 'rgba(255,255,255,0.12)',
paddingHorizontal: 14,
paddingVertical: 9,
borderRadius: 12,
},
missionSelectRow: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'space-between',
padding: 10,
borderRadius: 16,
borderWidth: 1,
},
segBtn: {
flex: 1,
paddingVertical: 9,
borderRadius: 12,
alignItems: 'center',
},
editorFooter: {
position: 'absolute',
left: 0,
right: 0,
bottom: 0,
flexDirection: 'row',
gap: 10,
padding: 14,
borderTopWidth: 1,
},
footerBtn: {
flex: 1,
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'center',
gap: 6,
paddingVertical: 13,
borderRadius: 16,
},
modalBackdrop: {
flex: 1,
backgroundColor: 'rgba(0,0,0,0.52)',
justifyContent: 'flex-end',
padding: 12,
},
bottomSheet: {
borderRadius: 28,
padding: 20,
gap: 14,
},
summaryBox: {
borderRadius: 18,
padding: 14,
gap: 4,
},
ringingPulseCircle: {
position: 'absolute',
alignSelf: 'center',
top: '28%',
width: 240,
height: 240,
borderRadius: 120,
borderWidth: 2,
borderColor: '#FFFFFF',
},
ringingClock: {
fontSize: 64,
fontWeight: '900',
color: '#FFFFFF',
letterSpacing: -2,
},
ringingSnoozeBtn: {
paddingVertical: 16,
borderRadius: 20,
backgroundColor: 'rgba(255,255,255,0.2)',
borderWidth: 1,
borderColor: 'rgba(255,255,255,0.3)',
alignItems: 'center',
},
ringingDismissBtn: {
paddingVertical: 16,
borderRadius: 20,
backgroundColor: '#FFFFFF',
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'center',
gap: 8,
elevation: 6,
},
glassPill: {
flexDirection: 'row',
alignItems: 'center',
gap: 6,
backgroundColor: 'rgba(255,255,255,0.18)',
paddingHorizontal: 14,
paddingVertical: 7,
borderRadius: 999,
},
glassPillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
missionSubheading: {
color: 'rgba(255,255,255,0.75)',
fontSize: 11,
fontWeight: '700',
letterSpacing: 1.2,
},
missionHeading: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginTop: 4 },
missionCard: {
backgroundColor: 'rgba(0,0,0,0.36)',
borderColor: 'rgba(255,255,255,0.18)',
borderWidth: 1,
borderRadius: 26,
padding: 18,
},
mathBox: {
backgroundColor: 'rgba(255,255,255,0.12)',
borderRadius: 18,
padding: 16,
alignItems: 'center',
},
mathQuestion: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', marginTop: 4 },
mathInput: {
backgroundColor: 'rgba(255,255,255,0.15)',
borderColor: 'rgba(255,255,255,0.28)',
borderWidth: 1.5,
borderRadius: 16,
paddingVertical: 13,
textAlign: 'center',
fontSize: 22,
fontWeight: '800',
color: '#FFFFFF',
},
tealPrimaryBtn: {
backgroundColor: '#14B8A6',
paddingVertical: 14,
borderRadius: 16,
alignItems: 'center',
justifyContent: 'center',
},
tealPrimaryBtnText: { color: '#020617', fontSize: 15, fontWeight: '800' },
glassBtn: {
backgroundColor: 'rgba(255,255,255,0.2)',
paddingVertical: 14,
borderRadius: 16,
alignItems: 'center',
justifyContent: 'center',
},
glassBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
whiteMuted12: { color: 'rgba(255,255,255,0.75)', fontSize: 12, textAlign: 'center' },
memoryGrid: {
width: 228,
flexDirection: 'row',
flexWrap: 'wrap',
gap: 10,
},
memoryTile: {
width: 68,
height: 68,
borderRadius: 16,
backgroundColor: 'rgba(255,255,255,0.12)',
borderWidth: 1.5,
borderColor: 'rgba(255,255,255,0.25)',
},
circleCounter: {
width: 96,
height: 96,
borderRadius: 48,
backgroundColor: 'rgba(255,255,255,0.14)',
borderWidth: 2,
borderColor: '#2DD4BF',
alignItems: 'center',
justifyContent: 'center',
},
circleCounterText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', marginTop: 2 },
progressTrackWhite: {
width: '100%',
height: 10,
borderRadius: 999,
backgroundColor: 'rgba(255,255,255,0.18)',
overflow: 'hidden',
},
progressFillTeal: { height: '100%', backgroundColor: '#2DD4BF', borderRadius: 999 },
typingInput: {
backgroundColor: 'rgba(255,255,255,0.15)',
borderColor: 'rgba(255,255,255,0.25)',
borderWidth: 1,
borderRadius: 16,
padding: 14,
color: '#FFFFFF',
fontSize: 14,
minHeight: 84,
textAlignVertical: 'top',
},
qrFrame: {
width: 200,
height: 200,
borderRadius: 22,
backgroundColor: 'rgba(0,0,0,0.48)',
borderWidth: 2,
borderColor: '#2DD4BF',
alignItems: 'center',
justifyContent: 'center',
},
photoFrame: {
height: 160,
borderRadius: 20,
backgroundColor: 'rgba(0,0,0,0.45)',
borderWidth: 1.5,
borderStyle: 'dashed',
borderColor: 'rgba(255,255,255,0.35)',
alignItems: 'center',
justifyContent: 'center',
gap: 8,
},
emergencyBox: {
width: '100%',
backgroundColor: 'rgba(0,0,0,0.48)',
borderColor: 'rgba(255,255,255,0.2)',
borderWidth: 1,
borderRadius: 20,
padding: 14,
},
sleepTimeBox: {
flex: 1,
backgroundColor: 'rgba(255,255,255,0.1)',
borderRadius: 16,
padding: 12,
},
metricTile: {
flex: 1,
borderRadius: 18,
padding: 12,
borderWidth: 1,
alignItems: 'center',
},
statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
statsTile: {
width: '31.5%',
borderRadius: 18,
padding: 12,
borderWidth: 1,
},
searchBox: {
flexDirection: 'row',
alignItems: 'center',
borderWidth: 1,
borderRadius: 16,
paddingHorizontal: 14,
paddingVertical: 10,
},
themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
themeCardWrap: {
width: '48.2%',
height: 98,
borderRadius: 18,
overflow: 'hidden',
},
themeCardInner: {
flex: 1,
padding: 12,
justifyContent: 'space-between',
},
themeGroupPill: {
backgroundColor: 'rgba(0,0,0,0.28)',
paddingHorizontal: 8,
paddingVertical: 3,
borderRadius: 999,
},
friendsAvatarGrid: {
width: 178,
flexDirection: 'row',
flexWrap: 'wrap',
gap: 18,
justifyContent: 'center',
},
inviteMainBtn: {
marginTop: 26,
width: '100%',
maxWidth: 290,
paddingVertical: 16,
borderRadius: 18,
alignItems: 'center',
},
toastPill: {
position: 'absolute',
top: Platform.OS === 'ios' ? 56 : 16,
alignSelf: 'center',
flexDirection: 'row',
alignItems: 'center',
gap: 8,
paddingHorizontal: 16,
paddingVertical: 10,
borderRadius: 18,
elevation: 10,
},
});
