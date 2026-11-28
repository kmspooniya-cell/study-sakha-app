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
AppState,
BackHandler,
Easing,
Image,
Modal,
Platform,
Pressable,
ScrollView,
StatusBar,
StyleSheet,
Text,
TextInput,
Vibration,
View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ALARM_STORAGE_KEY,
  formatAlarmOccurrenceLabel,
  formatLocalDateLabel,
  getSecondsUntilAlarm as getStoredSecondsUntilAlarm,
} from './alarmStorage';
import { NativeDatePicker, WebDatePicker } from '../../../components/NativeSchedulePickers';
import {
  captureNativeBarcode,
  captureNativeReferencePhoto,
  clearPendingNativeAlarm,
  consumePendingNativeAction,
  deleteNativeReferencePhoto,
  getAlarmPermissionStatus,
  openExactAlarmSettings,
  openFullScreenIntentSettings,
  openNotificationSettings,
  peekPendingNativeAlarm,
  scheduleNativeSnooze,
  stopNativeAlarm,
  subscribeToNativeAlarm,
  subscribeToNativeAlarmAction,
  syncNativeAlarms,
  type AlarmPermissionStatus,
} from './alarmNative';
import {
  type ActiveMissionSession,
  clampMissionCount,
  clampPhotoThreshold,
  clampShakeTarget,
  clampStepsTarget,
  defaultShakeTargetForDifficulty,
  defaultStepsTargetForDifficulty,
  formatMissionFailure,
  loadActiveMissionSession,
  type MissionDifficulty,
  type MissionId,
  type PerMissionSettings,
  saveActiveMissionSession,
} from './alarmMissions';
import { HeavySleeperMissionView } from './HeavySleeperMissionView';
import {
  type AlarmFriendsDashboard,
  type AlarmUserSearchResult,
  createAlarmWakeSquad,
  fetchAlarmFriendsDashboard,
  markAlarmNotificationsRead,
  removeAlarmFriend,
  respondAlarmFriendRequest,
  respondAlarmSquadInvite,
  searchAlarmUsers,
  sendAlarmFriendNudge,
  sendAlarmFriendRequest,
  upsertMyAlarmWakeStatus,
} from './alarmFriendsApi';
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
ChevronDown,
ChevronLeft,
Clock,
Copy,
Edit3,
Eye,
FileText,
Flame,
Footprints,
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
Settings,
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
export type AlarmScreenId =
| 'dashboard'
| 'editor'
| 'ringing'
| 'morning'
| 'sleep'
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
allowDuplicateMissions?: boolean;
missionBeforeSnooze: boolean;
missionRetryLimit?: number;
missionTimeoutSeconds?: number;
perMission?: Partial<PerMissionSettings>;
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
/* Optional global bottom navigation rendered by the host app */
globalBottomNav?: React.ReactNode;
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
// Demo buddy arrays removed: Friends tab uses real authenticated Supabase data only.
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
// 4. REUSABLE NATIVE COMPONENTS (WHEEL PICKER, TOGGLE, AVATARS, CHARTS)
// ============================================================================
const WHEEL_ITEM_HEIGHT = 44;

function parseAlarmSpecificDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value || '').trim());
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatAlarmSpecificDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function WheelColumn({
  items,
  selectedIndex,
  onSelectIndex,
  textColor,
  mutedColor,
  accentColor,
  testID,
}: {
  items: readonly string[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  testID?: string;
}) {
  const scrollRef = useRef<ScrollView | null>(null);
  const clampedIndex = Math.max(0, Math.min(items.length - 1, selectedIndex));

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: clampedIndex * WHEEL_ITEM_HEIGHT, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [clampedIndex]);

  const handleScrollEnd = (offsetY: number) => {
    const nextIdx = Math.max(0, Math.min(items.length - 1, Math.round(offsetY / WHEEL_ITEM_HEIGHT)));
    if (nextIdx !== clampedIndex) {
      onSelectIndex(nextIdx);
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      testID={testID}
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      snapToInterval={WHEEL_ITEM_HEIGHT}
      decelerationRate="fast"
      contentContainerStyle={{ paddingVertical: WHEEL_ITEM_HEIGHT * 2 }}
      onMomentumScrollEnd={(e) => handleScrollEnd(e.nativeEvent.contentOffset.y)}
      onScrollEndDrag={(e) => handleScrollEnd(e.nativeEvent.contentOffset.y)}
      style={styles.wheelColumnScroll}
    >
      {items.map((item, idx) => {
        const selected = idx === clampedIndex;
        return (
          <Pressable
            key={`${item}-${idx}`}
            onPress={() => {
              scrollRef.current?.scrollTo({ y: idx * WHEEL_ITEM_HEIGHT, animated: true });
              onSelectIndex(idx);
            }}
            style={styles.wheelItem}
          >
            <Text
              style={{
                fontSize: selected ? 22 : 16,
                fontWeight: selected ? '800' : '500',
                color: selected ? accentColor : mutedColor,
                opacity: selected ? 1 : Math.abs(idx - clampedIndex) === 1 ? 0.72 : 0.4,
                fontVariant: ['tabular-nums'],
              }}
            >
              {item}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

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
// Do not hydrate legacy local/demo friend entries (fr-*); Friends are loaded from Supabase.
setFriends([]);
if (typeof parsed.studyStreak === 'number') setStudyStreak(parsed.studyStreak);
if (typeof parsed.activeThemeId === 'string' && ALARM_THEMES.some((t) => t.id === parsed.activeThemeId)) setActiveThemeId(parsed.activeThemeId);
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
globalBottomNav,
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
const insets = useSafeAreaInsets();
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
const [restoredMissionSession, setRestoredMissionSession] = useState<ActiveMissionSession | null>(null);
const [missionSetupBusy, setMissionSetupBusy] = useState(false);
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
const [historyFilter, setHistoryFilter] = useState('All');
const [historySearch, setHistorySearch] = useState('');
// Modals
const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
const [showCategoryModal, setShowCategoryModal] = useState(false);
const [showSpecificDatePicker, setShowSpecificDatePicker] = useState(false);
const [themePreviewVisible, setThemePreviewVisible] = useState(false);
const [showSaveConfirm, setShowSaveConfirm] = useState(false);
const [showResetConfirm, setShowResetConfirm] = useState(false);
const [showInviteFriendModal, setShowInviteFriendModal] = useState(false);
// Modal Form Inputs
const [inviteInput, setInviteInput] = useState('');
// Real Supabase Friends & Accountability state
const [friendsDashboard, setFriendsDashboard] = useState<AlarmFriendsDashboard | null>(null);
const [friendsLoading, setFriendsLoading] = useState(false);
const [friendsError, setFriendsError] = useState<string | null>(null);
const [userSearchResults, setUserSearchResults] = useState<AlarmUserSearchResult[]>([]);
const [userSearchLoading, setUserSearchLoading] = useState(false);
const [targetWakeInput, setTargetWakeInput] = useState('06:00');
const [showCreateSquadModal, setShowCreateSquadModal] = useState(false);
const [squadNameInput, setSquadNameInput] = useState('');
const [squadTimeInput, setSquadTimeInput] = useState('06:00');
const [squadSelectedIds, setSquadSelectedIds] = useState<string[]>([]);
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
if (activeScreen !== 'ringing' && Platform.OS !== 'android') {
Vibration.cancel();
}
}, [activeScreen]);
const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const showToast = useCallback((msg: string) => {
if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
setToastMsg(msg);
toastTimerRef.current = setTimeout(() => {
setToastMsg(null);
toastTimerRef.current = null;
}, 2600);
}, []);
useEffect(() => () => {
if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
}, []);
useEffect(() => {
if (Platform.OS !== 'android') return undefined;
const sub = BackHandler.addEventListener('hardwareBackPress', () => {
if (activeScreen === 'ringing') return true;
if (activeScreen !== 'dashboard') {
setActiveScreen('dashboard');
return true;
}
return false;
});
return () => sub.remove();
}, [activeScreen]);
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
allowDuplicateMissions: false,
missionBeforeSnooze: false,
missionRetryLimit: 0,
missionTimeoutSeconds: 0,
perMission: {
  shakeTarget: 40,
  stepsTarget: 25,
  photoSimilarityThreshold: 80,
  registeredQrCode: '',
},
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
setEditingAlarm({
  ...alarm,
  perMission: alarm.perMission ? { ...alarm.perMission } : undefined,
});
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
        {
          ...alarm,
          id: `alm-${Date.now()}`,
          title: `${alarm.title} (Copy)`,
          enabled: true,
          skippedOnce: false,
          snoozeCount: 0,
          perMission: alarm.perMission ? { ...alarm.perMission, referencePhotoUri: undefined } : undefined,
        },
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
void deleteNativeReferencePhoto(id).catch(() => {});
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
const [permStatus, setPermStatus] = useState<AlarmPermissionStatus | null>(null);
const refreshPermStatus = useCallback(() => {
if (Platform.OS !== 'android') return;
void getAlarmPermissionStatus().then(setPermStatus).catch(() => {});
}, []);
useEffect(() => {
refreshPermStatus();
if (Platform.OS !== 'android') return undefined;
const sub = AppState.addEventListener('change', (nextState) => {
  if (nextState === 'active') refreshPermStatus();
});
return () => sub.remove();
}, [refreshPermStatus]);

const dismissingAlarmIdRef = useRef<string | null>(null);
const triggerAlarmRinging = useCallback((alarm: AlarmItem, fromNative = false) => {
dismissingAlarmIdRef.current = null;
setOpenMenuId(null);
setRingingAlarm(alarm);
setMissionRunnerMode(alarm.heavySleeper ? 'dismiss' : null);
setActiveScreen('ringing');
if (alarm.vibration && !(fromNative && Platform.OS === 'android')) {
Vibration.vibrate([400, 600, 400, 600], true);
}
}, []);

// Restore persisted mission state once after hydration across app restart / process recreation
const missionRestoredRef = useRef(false);
const missionRestorePromiseRef = useRef<Promise<void>>(Promise.resolve());
const activeRingingIdRef = useRef<string | null>(null);
useEffect(() => {
  activeRingingIdRef.current = ringingAlarm?.id ?? null;
}, [ringingAlarm]);

useEffect(() => {
  if (!hydrated || missionRestoredRef.current) return;
  missionRestoredRef.current = true;
  let cancelled = false;
  missionRestorePromiseRef.current = loadActiveMissionSession().then((saved) => {
    if (cancelled || !saved) return;
    if (activeRingingIdRef.current) return;
    const targetAlarm = alarms.find((a) => a.id === saved.alarmId);
    if (!targetAlarm || !targetAlarm.heavySleeper) {
      void saveActiveMissionSession(null);
      return;
    }
    activeRingingIdRef.current = targetAlarm.id;
    setRestoredMissionSession(saved);
    setRingingAlarm(targetAlarm);
    setMissionRunnerMode(saved.mode);
    setActiveScreen('ringing');
  });
  return () => { cancelled = true; };
}, [hydrated, alarms]);

const buildFallbackAlarm = useCallback((alarmId: string, title?: string): AlarmItem => ({
id: alarmId,
hour: new Date().getHours(),
minute: new Date().getMinutes(),
title: title?.trim() || 'Study Sakha Alarm',
description: '',
category: 'wakeup',
days: [],
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
antiSnooze: false,
smartWakeup: false,
smartWindow: settings.smartWindow,
heavySleeper: false,
missions: [],
missionDifficulty: 'Medium',
missionCount: 1,
randomMission: false,
missionBeforeSnooze: false,
motivationalMsg: 'Stay consistent. Every session counts!',
spokenMessage: false,
flashAlert: false,
preventAccidental: false,
holidayExclusion: false,
linkedModule: 'planner',
specificDate: '',
sharedWithFriends: false,
}), [settings]);

const handleSnoozeAlarm = useCallback((alarm: AlarmItem) => {
Vibration.cancel();
const snoozeCount = alarm.snoozeCount || 0;
if (alarm.maxSnooze > 0 && snoozeCount >= alarm.maxSnooze) {
showToast(`Maximum snoozes reached (${alarm.maxSnooze})`);
return;
}
const mins = alarm.snoozeDuration || 5;
setAlarms((prev) => prev.map((item) => (item.id === alarm.id ? { ...item, snoozeCount: snoozeCount + 1 } : item)));
void clearPendingNativeAlarm(alarm.id).catch(() => {});
void stopNativeAlarm(alarm.id).catch(() => {});
void saveActiveMissionSession(null);
setRestoredMissionSession(null);
void scheduleNativeSnooze({
alarmId: alarm.id,
atMillis: Date.now() + mins * 60 * 1000,
title: alarm.title,
soundId: alarm.soundId,
volume: alarm.volume,
vibration: alarm.vibration,
gradualVolume: alarm.gradualVolume,
vibrationPattern: alarm.vibrationPattern,
heavySleeper: alarm.heavySleeper,
missionBeforeSnooze: alarm.missionBeforeSnooze,
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
void upsertMyAlarmWakeStatus(targetWakeInput, 'snoozing', studyStreak).catch(() => {});
showToast(`Snoozed for ${mins} minutes`);
}, [setAlarms, setHistory, settings.use24h, showToast, studyStreak, targetWakeInput]);

const handleDismissAlarm = useCallback((alarm: AlarmItem, missionName = 'None') => {
if (dismissingAlarmIdRef.current === alarm.id) return;
dismissingAlarmIdRef.current = alarm.id;
Vibration.cancel();
void clearPendingNativeAlarm(alarm.id).catch(() => {});
void stopNativeAlarm(alarm.id).catch(() => {});
void saveActiveMissionSession(null);
setRestoredMissionSession(null);
setAlarms((prev) =>
prev.map((item) => {
if (item.id !== alarm.id) return item;
const isOneTime = item.days.length === 0 && !item.specificDate;
return {
...item,
snoozeCount: 0,
enabled: isOneTime ? false : item.enabled,
};
})
);
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
const nextStreak = studyStreak + 1;
setStudyStreak(nextStreak);
void upsertMyAlarmWakeStatus(targetWakeInput, 'awake', nextStreak).catch(() => {});
setDismissedAlarm(alarm);
setRingingAlarm(null);
setActiveScreen('morning');
}, [setAlarms, setHistory, setStudyStreak, settings.use24h, studyStreak, targetWakeInput]);

useEffect(() => {
if (!hydrated) return undefined;
let mounted = true;
const handleNativeAlarm = (payload: { alarmId: string; title?: string; heavySleeper?: boolean; missionBeforeSnooze?: boolean }) => {
if (!mounted || !payload?.alarmId) return;
if (activeRingingIdRef.current === payload.alarmId) return;
const matched = alarms.find((item) => item.id === payload.alarmId);
const alarm = matched || {
  ...buildFallbackAlarm(payload.alarmId, payload.title),
  heavySleeper: payload.heavySleeper ?? false,
  missionBeforeSnooze: payload.missionBeforeSnooze ?? false,
};
triggerAlarmRinging(alarm, true);
};
const handleNativeAction = (payload: { alarmId: string; action: 'dismissed' | 'snoozed'; snoozeMinutes: number }) => {
if (!mounted || !payload?.alarmId) return;
Vibration.cancel();
void saveActiveMissionSession(null);
setRestoredMissionSession(null);
setMissionRunnerMode(null);
const target = alarms.find((item) => item.id === payload.alarmId) || buildFallbackAlarm(payload.alarmId);
if (payload.action === 'dismissed') {
handleDismissAlarm(target, 'Notification Stop');
} else if (payload.action === 'snoozed') {
const mins = payload.snoozeMinutes || target.snoozeDuration || 5;
setSnoozedBanner({ alarmTitle: target.title, mins, secondsLeft: mins * 60 });
setRingingAlarm(null);
setActiveScreen('dashboard');
showToast(`Snoozed for ${mins} minutes`);
}
};
const unsubscribeTrigger = subscribeToNativeAlarm(handleNativeAlarm);
const unsubscribeAction = subscribeToNativeAlarmAction(handleNativeAction);
void consumePendingNativeAction().then((actionPayload) => {
if (mounted && actionPayload) handleNativeAction(actionPayload);
});
void missionRestorePromiseRef.current.then(() => peekPendingNativeAlarm()).then((payload) => {
if (mounted && payload) handleNativeAlarm(payload);
});
return () => {
mounted = false;
unsubscribeTrigger();
unsubscribeAction();
};
}, [alarms, buildFallbackAlarm, handleDismissAlarm, hydrated, showToast, triggerAlarmRinging]);
// --- Real Supabase Friends Operations ---
const loadFriendsDashboard = useCallback(async () => {
setFriendsLoading(true);
setFriendsError(null);
const res = await fetchAlarmFriendsDashboard();
setFriendsLoading(false);
if (!res.ok) {
setFriendsDashboard(null);
setFriends([]);
setFriendsError(res.message);
return;
}
setFriendsDashboard(res.data);
if (res.data.my_status?.target_wake_time) {
setTargetWakeInput(res.data.my_status.target_wake_time);
}
const avatarTypes: FriendBuddyItem['avatarType'][] = ['circle', 'square', 'clover', 'cloud'];
setFriends(
res.data.friends.map((item, idx) => ({
id: item.user_id,
name: item.display_name,
handle: item.exam_id ? item.exam_id.toUpperCase() : 'Aspirant',
exam: item.exam_id ? item.exam_id.toUpperCase() : 'Study Sakha',
avatarType: avatarTypes[idx % avatarTypes.length],
status:
item.last_wake_status === 'awake'
? 'Awake'
: item.last_wake_status === 'snoozing'
? 'Snoozing'
: item.last_wake_status === 'sleeping'
? 'Sleeping'
: 'No wake-up recorded',
statusType:
item.last_wake_status === 'awake'
? 'awake'
: item.last_wake_status === 'snoozing'
? 'snoozing'
: 'sleeping',
streak: item.current_streak,
targetTime: item.target_wake_time || 'Not set',
nudged: item.recently_nudged,
}))
);
}, [setFriends]);

useEffect(() => {
if (activeScreen === 'friends') {
void loadFriendsDashboard();
}
}, [activeScreen, loadFriendsDashboard]);

const handleSearchUsers = useCallback(async (q: string) => {
setInviteInput(q);
if (q.trim().length < 2) {
setUserSearchResults([]);
return;
}
setUserSearchLoading(true);
const res = await searchAlarmUsers(q);
setUserSearchLoading(false);
if (res.ok) {
setUserSearchResults(res.users);
} else {
setUserSearchResults([]);
showToast(res.message);
}
}, [showToast]);

const handleSendFriendRequest = useCallback(async (targetUserId: string) => {
const res = await sendAlarmFriendRequest(targetUserId);
if (!res.ok) {
showToast(res.message);
return;
}
showToast('Friend request sent');
setUserSearchResults((prev) =>
prev.map((u) => (u.user_id === targetUserId ? { ...u, relationship_status: 'outgoing_pending' } : u))
);
void loadFriendsDashboard();
}, [loadFriendsDashboard, showToast]);

const handleRespondFriendRequest = useCallback(async (requestId: string, decision: 'accept' | 'reject' | 'cancel') => {
const res = await respondAlarmFriendRequest(requestId, decision);
if (!res.ok) {
showToast(res.message);
return;
}
showToast(
decision === 'accept'
? 'Friend request accepted'
: decision === 'reject'
? 'Friend request declined'
: 'Friend request cancelled'
);
void loadFriendsDashboard();
}, [loadFriendsDashboard, showToast]);

const handleRemoveFriend = useCallback(async (friendUserId: string) => {
const res = await removeAlarmFriend(friendUserId);
if (!res.ok) {
showToast(res.message);
return;
}
showToast('Friend removed');
void loadFriendsDashboard();
}, [loadFriendsDashboard, showToast]);

const handleSaveTargetWakeTime = useCallback(async () => {
if (!/^\d{2}:\d{2}$/.test(targetWakeInput.trim())) {
showToast('Enter wake time in HH:MM (24h) format');
return;
}
const res = await upsertMyAlarmWakeStatus(targetWakeInput.trim(), friendsDashboard?.my_status?.last_wake_status || 'unknown', studyStreak);
if (!res.ok) {
showToast(res.message);
return;
}
showToast('Target wake-up time updated');
void loadFriendsDashboard();
}, [friendsDashboard?.my_status?.last_wake_status, loadFriendsDashboard, showToast, studyStreak, targetWakeInput]);

const handleCheerOrNudgeFriend = useCallback(async (friendUserId: string, kind: 'cheer' | 'nudge') => {
Vibration.vibrate(40);
const res = await sendAlarmFriendNudge(friendUserId, kind);
if (!res.ok) {
showToast(res.message);
return;
}
showToast(kind === 'cheer' ? 'Sent morning cheer!' : 'Sent wake-up nudge!');
void loadFriendsDashboard();
}, [loadFriendsDashboard, showToast]);

const handleCreateSquad = useCallback(async () => {
if (squadNameInput.trim().length < 2) {
showToast('Enter a squad name');
return;
}
if (!/^\d{2}:\d{2}$/.test(squadTimeInput.trim())) {
showToast('Enter target time in HH:MM format');
return;
}
const res = await createAlarmWakeSquad(squadNameInput.trim(), squadTimeInput.trim(), squadSelectedIds);
if (!res.ok) {
showToast(res.message);
return;
}
setShowCreateSquadModal(false);
setSquadNameInput('');
setSquadSelectedIds([]);
showToast('Wake-Up Squad created & invites sent');
void loadFriendsDashboard();
}, [loadFriendsDashboard, showToast, squadNameInput, squadSelectedIds, squadTimeInput]);

const handleRespondSquadInvite = useCallback(async (squadId: string, acceptInvite: boolean) => {
const res = await respondAlarmSquadInvite(squadId, acceptInvite);
if (!res.ok) {
showToast(res.message);
return;
}
showToast(acceptInvite ? 'Joined Wake-Up Squad!' : 'Declined squad invite');
void loadFriendsDashboard();
}, [loadFriendsDashboard, showToast]);

const handleMarkNotificationsRead = useCallback(async () => {
const unreadIds = (friendsDashboard?.notifications || []).filter((n) => !n.read_at).map((n) => n.id);
if (unreadIds.length === 0) return;
await markAlarmNotificationsRead(unreadIds);
void loadFriendsDashboard();
}, [friendsDashboard?.notifications, loadFriendsDashboard]);
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
<Pressable
  onPress={() => setHeaderMenuOpen(true)}
  style={styles.iconBtn}
  accessibilityRole="button"
  accessibilityLabel="Alarm menu"
  testID="alarm-header-menu-button"
>
  <MoreVertical size={20} color={P.textSecondary} />
</Pressable>
</View>
</View>
<Modal
  visible={headerMenuOpen}
  transparent
  animationType="none"
  statusBarTranslucent
  onRequestClose={() => setHeaderMenuOpen(false)}
>
  <Pressable
    style={styles.headerMenuBackdrop}
    onPress={() => setHeaderMenuOpen(false)}
    accessibilityLabel="Close alarm menu"
  >
    <View
      style={[
        styles.headerMenuDropdown,
        {
          top: Math.max(insets.top, 8) + 54,
          backgroundColor: P.card,
          borderColor: P.borderSubtle,
        },
      ]}
    >
      {(
        [
          { id: 'sleep', label: 'Sleep', icon: BedDouble, color: '#6366F1' },
          { id: 'stats', label: 'Analytics', icon: BarChart3, color: '#10B981' },
          { id: 'history', label: 'History', icon: History, color: '#0EA5E9' },
          { id: 'friends', label: 'Friends', icon: Users, color: '#F59E0B' },
          { id: 'settings', label: 'Settings', icon: Settings, color: P.textSecondary },
        ] as const
      ).map((item) => {
        const Icon = item.icon;
        return (
          <Pressable
            key={item.id}
            onPress={() => {
              setHeaderMenuOpen(false);
              setActiveScreen(item.id);
            }}
            style={styles.headerMenuItem}
            accessibilityRole="menuitem"
          >
            <Icon size={17} color={item.color} />
            <Text style={[styles.headerMenuItemText, { color: P.text }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  </Pressable>
</Modal>
<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90, gap: 16 }}>
{Platform.OS === 'android' && permStatus && (!permStatus.canScheduleExactAlarms || !permStatus.canUseFullScreenIntent || !permStatus.notificationsEnabled) && (
<View style={[styles.snoozeBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
<View style={{ flex: 1, paddingRight: 10 }}>
<Text style={{ fontSize: 12, fontWeight: '800', color: '#991B1B' }}>
{!permStatus.canScheduleExactAlarms
  ? 'Exact alarm permission needed'
  : !permStatus.notificationsEnabled
  ? 'Alarm notifications disabled'
  : 'Full-screen alarm permission needed'}
</Text>
<Text style={{ fontSize: 11, color: '#B91C1C', marginTop: 2 }}>
{!permStatus.canScheduleExactAlarms
  ? 'Enable Alarms & Reminders so alarms ring reliably when closed or locked.'
  : !permStatus.notificationsEnabled
  ? 'Allow notifications so alarms can alert you when the app is in background.'
  : 'Allow Full-Screen Intent so alarms wake the lock screen.'}
</Text>
</View>
<Pressable
  onPress={() => {
    if (!permStatus.canScheduleExactAlarms) void openExactAlarmSettings().catch(() => {});
    else if (!permStatus.notificationsEnabled) void openNotificationSettings().catch(() => {});
    else void openFullScreenIntentSettings().catch(() => {});
  }}
  style={[styles.snoozeDismissBtn, { backgroundColor: '#DC2626' }]}
>
<Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>Enable</Text>
</Pressable>
</View>
)}
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
<View style={[styles.heroCard, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: P.borderSubtle }]}>
{nextAlarm && nextFmt ? (
<>
<View style={styles.rowBetween}>
<View style={[styles.nextBadge, { backgroundColor: 'rgba(20,184,166,0.12)', borderColor: 'rgba(20,184,166,0.3)' }]}>
<View style={styles.tealDot} />
<Text style={[styles.nextBadgeText, { color: '#0F766E' }]}>NEXT SCHEDULED ALARM</Text>
</View>
<View style={[styles.heroCatPill, { backgroundColor: '#F1F5F9' }]}>
<Text style={{ color: '#334155', fontSize: 11, fontWeight: '600' }}>
{getCategoryMeta(nextAlarm.category).label}
</Text>
</View>
</View>
<View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 12 }}>
<Text style={[styles.heroTime, { color: '#0F172A' }]}>{nextFmt.timeStr}</Text>
{!!nextFmt.period && <Text style={[styles.heroPeriod, { color: '#0D9488' }]}>{nextFmt.period}</Text>}
</View>
<Text style={{ color: '#0F172A', fontSize: 14, fontWeight: '700', marginTop: 4 }}>
{nextAlarm.title}
</Text>
<Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>
{formatAlarmOccurrenceLabel(nextAlarm, now) ?? 'Scheduled'} · {formatRepeatLabel(nextAlarm.days, nextAlarm.specificDate)}
</Text>
<View style={[styles.rowGap8, { marginTop: 14 }]}>
<Pressable onPress={() => openEditAlarm(nextAlarm)} style={[styles.heroActionBtn, { flex: 1, backgroundColor: '#F1F5F9' }]}>
<Edit3 size={14} color="#0F172A" />
<Text style={[styles.heroActionText, { color: '#0F172A' }]}>Edit</Text>
</Pressable>
<Pressable onPress={() => toggleAlarmEnabled(nextAlarm.id)} style={[styles.heroActionBtn, { flex: 1, backgroundColor: '#F1F5F9' }]}>
<BellOff size={14} color="#0F172A" />
<Text style={[styles.heroActionText, { color: '#0F172A' }]}>Disable</Text>
</Pressable>
</View>
</>
) : (
<View style={{ alignItems: 'center', paddingVertical: 14 }}>
<AlarmClock size={36} color="#0D9488" />
<Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '800', marginTop: 8 }}>
No Active Alarms
</Text>
<Text style={{ color: '#64748B', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
Enable an alarm or create a new smart schedule.
</Text>
<Pressable onPress={() => openCreateAlarm()} style={styles.heroCreateBtn}>
<Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Add Alarm</Text>
</Pressable>
</View>
)}
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
</View>
) : (
<View style={{ gap: 12 }}>
{filteredAlarms.map((alarm) => {
const { timeStr, period } = formatAlarmTime(alarm.hour, alarm.minute, settings.use24h);
const cat = getCategoryMeta(alarm.category);
const CatIcon = cat.icon;
const isMenuOpen = openMenuId === alarm.id;
const occurrenceLabel = alarm.enabled && !alarm.skippedOnce
  ? formatAlarmOccurrenceLabel(alarm, now)
  : null;
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
{occurrenceLabel ? `${occurrenceLabel} · ${formatRepeatLabel(alarm.days, alarm.specificDate)}` : formatRepeatLabel(alarm.days, alarm.specificDate)}
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
</View>
);
};
// --- SCREEN 2: CREATE / EDIT ALARM ---
const renderEditorScreen = () => {
if (!editingAlarm) return null;
const { timeStr, period } = formatAlarmTime(editingAlarm.hour, editingAlarm.minute, settings.use24h);
const updateField = <K extends keyof AlarmItem>(k: K, v: AlarmItem[K]) =>
setEditingAlarm((prev) => (prev ? { ...prev, [k]: v } : prev));
const hourItems12 = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] as const;
const hourItems24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const minuteItems = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const periodItems = ['AM', 'PM'] as const;
const selectedHourIndex = settings.use24h
  ? editingAlarm.hour
  : ((editingAlarm.hour % 12) === 0 ? 11 : (editingAlarm.hour % 12) - 1);
const selectedPeriodIndex = editingAlarm.hour >= 12 ? 1 : 0;
const selectedCategory = getCategoryMeta(editingAlarm.category);
const SelectedCategoryIcon = selectedCategory.icon;
const toggleDay = (d: string) => {
const exists = editingAlarm.days.includes(d);
updateField('days', exists ? editingAlarm.days.filter((x) => x !== d) : [...editingAlarm.days, d]);
updateField('specificDate', '');
};
const toggleMission = (mId: MissionId) => {
const cur = editingAlarm.missions || [];
const exists = cur.includes(mId);
const next = exists ? cur.filter((x) => x !== mId) : [...cur, mId];
const finalMissions = next.length > 0 ? next : [mId];
updateField('missions', finalMissions);
if (!editingAlarm.allowDuplicateMissions) {
  updateField('missionCount', clampMissionCount(editingAlarm.missionCount, finalMissions, false));
}
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
<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 16 }}>
{/* A. Time Selection (Vertical Scrolling Wheel Picker) */}
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<View style={styles.rowBetween}>
<Text style={[styles.sectionLabel, { color: P.textMuted }]}>TIME SELECTION</Text>
<Pressable
onPress={() => setSettings((s) => ({ ...s, use24h: !s.use24h }))}
style={[styles.smallChipBtn, { backgroundColor: P.cardAlt }]}
>
<Text style={{ color: P.text, fontSize: 11, fontWeight: '700' }}>
{settings.use24h ? '24-Hour' : '12-Hour'}
</Text>
</Pressable>
</View>
<View style={styles.wheelColumnsRow} testID="alarm-wheel-time-picker">
<View
pointerEvents="none"
style={[
styles.wheelSelectionBand,
{ backgroundColor: P.tealSoft, borderColor: 'rgba(20,184,166,0.35)' },
]}
/>
<View style={styles.wheelColumnWrap}>
<WheelColumn
testID="alarm-wheel-hour"
items={settings.use24h ? hourItems24 : hourItems12}
selectedIndex={selectedHourIndex}
onSelectIndex={(idx) => {
  if (settings.use24h) {
    updateField('hour', idx);
  } else {
    const hour12 = idx + 1;
    const isPm = editingAlarm.hour >= 12;
    const nextHour24 = isPm ? (hour12 % 12) + 12 : hour12 % 12;
    updateField('hour', nextHour24);
  }
}}
textColor={P.text}
mutedColor={P.textMuted}
accentColor={P.teal}
/>
</View>
<Text style={{ fontSize: 22, fontWeight: '800', color: P.teal, marginHorizontal: 2 }}>:</Text>
<View style={styles.wheelColumnWrap}>
<WheelColumn
testID="alarm-wheel-minute"
items={minuteItems}
selectedIndex={editingAlarm.minute}
onSelectIndex={(idx) => updateField('minute', idx)}
textColor={P.text}
mutedColor={P.textMuted}
accentColor={P.teal}
/>
</View>
{!settings.use24h && (
<View style={styles.wheelColumnWrap}>
<WheelColumn
testID="alarm-wheel-period"
items={periodItems}
selectedIndex={selectedPeriodIndex}
onSelectIndex={(idx) => {
  if (idx === 0 && editingAlarm.hour >= 12) updateField('hour', editingAlarm.hour - 12);
  if (idx === 1 && editingAlarm.hour < 12) updateField('hour', editingAlarm.hour + 12);
}}
textColor={P.text}
mutedColor={P.textMuted}
accentColor={P.teal}
/>
</View>
)}
</View>
</View>
{/* B. Alarm Details */}
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<Text style={[styles.sectionLabel, { color: P.textMuted }]}>ALARM DETAILS</Text>
<Pressable
onPress={() => setShowCategoryModal(true)}
style={[styles.categorySelectorRow, { backgroundColor: P.cardAlt, borderColor: P.border }]}
accessibilityRole="button"
accessibilityLabel="Select alarm category"
testID="alarm-category-selector"
>
<View style={styles.rowCenter}>
<View style={[styles.shortcutIconBox, { backgroundColor: selectedCategory.bg }]}>
<SelectedCategoryIcon size={16} color={selectedCategory.color} />
</View>
<View style={{ marginLeft: 10 }}>
<Text style={{ fontSize: 11, fontWeight: '600', color: P.textSecondary }}>Category</Text>
<Text style={{ fontSize: 14, fontWeight: '800', color: P.text }}>{selectedCategory.label}</Text>
</View>
</View>
<ChevronDown size={18} color={P.textSecondary} />
</Pressable>
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
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>Specific Date</Text>
<Pressable
onPress={() => setShowSpecificDatePicker(true)}
style={[styles.inlineInput, { backgroundColor: P.cardAlt, borderColor: P.border }]}
accessibilityRole="button"
accessibilityLabel="Select specific date"
testID="alarm-specific-date-field"
>
<Text style={{ fontSize: 12, fontWeight: '600', color: editingAlarm.specificDate ? P.text : P.textMuted, textAlign: 'center' }}>
{editingAlarm.specificDate || 'Select date'}
</Text>
</Pressable>
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
onPress={() => {
  updateField('missionDifficulty', d);
  updateField('perMission', {
    ...editingAlarm.perMission,
    shakeTarget: defaultShakeTargetForDifficulty(d),
    stepsTarget: defaultStepsTargetForDifficulty(d),
  });
}}
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
{[1, 2, 3, 5].map((cnt) => {
  const allowDups = Boolean(editingAlarm.allowDuplicateMissions);
  const disabled = !allowDups && cnt > editingAlarm.missions.length;
  const activeCount = clampMissionCount(editingAlarm.missionCount, editingAlarm.missions, allowDups);
  return (
<Pressable
key={cnt}
disabled={disabled}
onPress={() => updateField('missionCount', cnt)}
style={[
styles.segBtn,
{
  backgroundColor: activeCount === cnt ? '#F43F5E' : P.cardAlt,
  opacity: disabled ? 0.4 : 1,
},
]}
>
<Text
style={{
fontSize: 12,
fontWeight: '800',
color: activeCount === cnt ? '#FFFFFF' : P.textSecondary,
}}
>
{cnt}
</Text>
</Pressable>
  );
})}
</View>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '600', color: P.text }}>Allow Duplicate Missions</Text>
<CustomToggle
value={Boolean(editingAlarm.allowDuplicateMissions)}
onChange={(v) => {
  updateField('allowDuplicateMissions', v);
  if (!v) {
    updateField('missionCount', clampMissionCount(editingAlarm.missionCount, editingAlarm.missions, false));
  }
}}
activeColor="#F43F5E"
dark={darkMode}
/>
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
<Text style={{ fontSize: 11, fontWeight: '700', color: P.textSecondary }}>Retry Limit</Text>
<View style={styles.rowGap8}>
{[
  { label: 'Unlimited', val: 0 },
  { label: '3', val: 3 },
  { label: '5', val: 5 },
  { label: '10', val: 10 },
].map((opt) => {
  const active = (editingAlarm.missionRetryLimit ?? 0) === opt.val;
  return (
    <Pressable
      key={opt.val}
      onPress={() => updateField('missionRetryLimit', opt.val)}
      style={[styles.segBtn, { backgroundColor: active ? '#F43F5E' : P.cardAlt }]}
    >
      <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#FFFFFF' : P.textSecondary }}>
        {opt.label}
      </Text>
    </Pressable>
  );
})}
</View>
<Text style={{ fontSize: 11, fontWeight: '700', color: P.textSecondary }}>Mission Timeout</Text>
<View style={styles.rowGap8}>
{[
  { label: 'None', val: 0 },
  { label: '60s', val: 60 },
  { label: '120s', val: 120 },
  { label: '180s', val: 180 },
].map((opt) => {
  const active = (editingAlarm.missionTimeoutSeconds ?? 0) === opt.val;
  return (
    <Pressable
      key={opt.val}
      onPress={() => updateField('missionTimeoutSeconds', opt.val)}
      style={[styles.segBtn, { backgroundColor: active ? '#F43F5E' : P.cardAlt }]}
    >
      <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#FFFFFF' : P.textSecondary }}>
        {opt.label}
      </Text>
    </Pressable>
  );
})}
</View>
{editingAlarm.missions.includes('shake') && (
<View style={[styles.rowBetween, { backgroundColor: P.cardAlt, padding: 10, borderRadius: 12 }]}>
  <Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>
    Shake Target: {clampShakeTarget(editingAlarm.perMission?.shakeTarget ?? defaultShakeTargetForDifficulty(editingAlarm.missionDifficulty))}
  </Text>
  <View style={styles.rowGap8}>
    <Pressable
      onPress={() => {
        const cur = clampShakeTarget(editingAlarm.perMission?.shakeTarget ?? defaultShakeTargetForDifficulty(editingAlarm.missionDifficulty));
        updateField('perMission', { ...editingAlarm.perMission, shakeTarget: clampShakeTarget(cur - 10) });
      }}
      style={[styles.smallChipBtn, { backgroundColor: P.card }]}
    >
      <Text style={{ fontWeight: '800', color: P.text }}>-10</Text>
    </Pressable>
    <Pressable
      onPress={() => {
        const cur = clampShakeTarget(editingAlarm.perMission?.shakeTarget ?? defaultShakeTargetForDifficulty(editingAlarm.missionDifficulty));
        updateField('perMission', { ...editingAlarm.perMission, shakeTarget: clampShakeTarget(cur + 10) });
      }}
      style={[styles.smallChipBtn, { backgroundColor: P.card }]}
    >
      <Text style={{ fontWeight: '800', color: P.text }}>+10</Text>
    </Pressable>
  </View>
</View>
)}
{editingAlarm.missions.includes('steps') && (
<View style={[styles.rowBetween, { backgroundColor: P.cardAlt, padding: 10, borderRadius: 12 }]}>
  <Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>
    Steps Target: {clampStepsTarget(editingAlarm.perMission?.stepsTarget ?? defaultStepsTargetForDifficulty(editingAlarm.missionDifficulty))}
  </Text>
  <View style={styles.rowGap8}>
    <Pressable
      onPress={() => {
        const cur = clampStepsTarget(editingAlarm.perMission?.stepsTarget ?? defaultStepsTargetForDifficulty(editingAlarm.missionDifficulty));
        updateField('perMission', { ...editingAlarm.perMission, stepsTarget: clampStepsTarget(cur - 5) });
      }}
      style={[styles.smallChipBtn, { backgroundColor: P.card }]}
    >
      <Text style={{ fontWeight: '800', color: P.text }}>-5</Text>
    </Pressable>
    <Pressable
      onPress={() => {
        const cur = clampStepsTarget(editingAlarm.perMission?.stepsTarget ?? defaultStepsTargetForDifficulty(editingAlarm.missionDifficulty));
        updateField('perMission', { ...editingAlarm.perMission, stepsTarget: clampStepsTarget(cur + 5) });
      }}
      style={[styles.smallChipBtn, { backgroundColor: P.card }]}
    >
      <Text style={{ fontWeight: '800', color: P.text }}>+5</Text>
    </Pressable>
  </View>
</View>
)}
{editingAlarm.missions.includes('qr') && (
<View style={{ backgroundColor: P.cardAlt, padding: 12, borderRadius: 12, gap: 10 }}>
  <View style={styles.rowBetween}>
    <Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>Registered QR / Barcode</Text>
    <Text style={{ fontSize: 11, fontWeight: '700', color: editingAlarm.perMission?.registeredQrCode ? P.teal : P.textMuted }}>
      {editingAlarm.perMission?.registeredQrCode ? 'Registered' : 'Not registered'}
    </Text>
  </View>
  {editingAlarm.perMission?.registeredQrCode ? (
    <View style={{ backgroundColor: P.card, padding: 10, borderRadius: 10, gap: 2 }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: P.textSecondary }}>
        Format: {editingAlarm.perMission.registeredQrFormat || 'QR_CODE'}
      </Text>
      <Text numberOfLines={2} style={{ fontSize: 12, fontWeight: '700', color: P.text }}>
        {editingAlarm.perMission.registeredQrCode}
      </Text>
    </View>
  ) : (
    <Text style={{ fontSize: 11, color: P.textSecondary }}>
      Scan a QR code or barcode before saving so only that code can dismiss this alarm.
    </Text>
  )}
  <View style={styles.rowGap8}>
    <Pressable
      disabled={missionSetupBusy}
      testID="alarm-editor-qr-scan"
      onPress={async () => {
        setMissionSetupBusy(true);
        try {
          const targetId = editingAlarm.id || `alm-${Date.now()}`;
          const res = await captureNativeBarcode();
          if (res.ok) {
            setEditingAlarm((prev) => (
              prev
                ? {
                    ...prev,
                    id: prev.id || targetId,
                    perMission: {
                      ...prev.perMission,
                      registeredQrCode: res.code,
                      registeredQrFormat: res.format,
                    },
                  }
                : prev
            ));
            showToast(`Registered ${res.format}: ${res.code}`);
          } else {
            showToast(formatMissionFailure(res.reason));
          }
        } finally {
          setMissionSetupBusy(false);
        }
      }}
      style={[styles.smallChipBtn, { backgroundColor: '#F43F5E' }]}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
        {missionSetupBusy ? 'Scanning...' : editingAlarm.perMission?.registeredQrCode ? 'Replace QR / Barcode' : 'Scan & Register QR / Barcode'}
      </Text>
    </Pressable>
    {!!editingAlarm.perMission?.registeredQrCode && (
      <Pressable
        disabled={missionSetupBusy}
        testID="alarm-editor-qr-remove"
        onPress={() => {
          setEditingAlarm((prev) => (
            prev
              ? {
                  ...prev,
                  perMission: {
                    ...prev.perMission,
                    registeredQrCode: '',
                    registeredQrFormat: undefined,
                  },
                }
              : prev
          ));
          showToast('Registered QR / Barcode removed');
        }}
        style={[styles.smallChipBtn, { backgroundColor: P.card }]}
      >
        <Text style={{ color: P.textSecondary, fontSize: 11, fontWeight: '700' }}>Remove</Text>
      </Pressable>
    )}
  </View>
</View>
)}
{editingAlarm.missions.includes('photo') && (
<View style={{ backgroundColor: P.cardAlt, padding: 12, borderRadius: 12, gap: 10 }}>
  <View style={styles.rowBetween}>
    <Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>Reference Photo</Text>
    <Text style={{ fontSize: 11, fontWeight: '700', color: editingAlarm.perMission?.referencePhotoUri ? P.teal : P.textMuted }}>
      {editingAlarm.perMission?.referencePhotoUri ? 'Registered' : 'Not registered'}
    </Text>
  </View>
  {editingAlarm.perMission?.referencePhotoUri ? (
    <Image
      source={{ uri: editingAlarm.perMission.referencePhotoUri }}
      style={{ width: '100%', height: 120, borderRadius: 10, backgroundColor: P.card }}
      resizeMode="cover"
      testID="alarm-editor-photo-preview"
    />
  ) : (
    <Text style={{ fontSize: 11, color: P.textSecondary }}>
      Capture a reference photo of a location or object before scheduling this alarm.
    </Text>
  )}
  <View style={styles.rowGap8}>
    <Pressable
      disabled={missionSetupBusy}
      testID="alarm-editor-photo-capture"
      onPress={async () => {
        setMissionSetupBusy(true);
        try {
          const targetId = editingAlarm.id || `alm-${Date.now()}`;
          if (!editingAlarm.id) updateField('id', targetId);
          const res = await captureNativeReferencePhoto(targetId);
          if (res.ok) {
            setEditingAlarm((prev) => (
              prev
                ? {
                    ...prev,
                    id: prev.id || targetId,
                    perMission: {
                      ...prev.perMission,
                      referencePhotoUri: res.referenceUri,
                    },
                  }
                : prev
            ));
            showToast('Reference photo saved');
          } else {
            showToast(formatMissionFailure(res.reason));
          }
        } finally {
          setMissionSetupBusy(false);
        }
      }}
      style={[styles.smallChipBtn, { backgroundColor: '#F43F5E' }]}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
        {missionSetupBusy ? 'Opening Camera...' : editingAlarm.perMission?.referencePhotoUri ? 'Replace Photo' : 'Capture Reference Photo'}
      </Text>
    </Pressable>
    {!!editingAlarm.perMission?.referencePhotoUri && (
      <Pressable
        disabled={missionSetupBusy}
        testID="alarm-editor-photo-remove"
        onPress={() => {
          const alarmIdToDelete = editingAlarm.id;
          if (alarmIdToDelete) {
            void deleteNativeReferencePhoto(alarmIdToDelete).catch(() => {});
          }
          setEditingAlarm((prev) => (
            prev
              ? {
                  ...prev,
                  perMission: {
                    ...prev.perMission,
                    referencePhotoUri: undefined,
                  },
                }
              : prev
          ));
          showToast('Reference photo removed');
        }}
        style={[styles.smallChipBtn, { backgroundColor: P.card }]}
      >
        <Text style={{ color: P.textSecondary, fontSize: 11, fontWeight: '700' }}>Remove</Text>
      </Pressable>
    )}
  </View>
  <View style={styles.rowGap8}>
    {[70, 80, 85, 90].map((pct) => {
      const cur = clampPhotoThreshold(editingAlarm.perMission?.photoSimilarityThreshold ?? 80);
      return (
        <Pressable
          key={pct}
          onPress={() => updateField('perMission', { ...editingAlarm.perMission, photoSimilarityThreshold: pct })}
          style={[styles.segBtn, { backgroundColor: cur === pct ? '#F43F5E' : P.card }]}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: cur === pct ? '#FFFFFF' : P.textSecondary }}>
            {pct}%
          </Text>
        </Pressable>
      );
    })}
  </View>
</View>
)}
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
<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 2 }}>
{filteredSounds.map((s) => {
const selected = editingAlarm.soundId === s.id;
const playing = previewSoundId === s.id;
return (
<Pressable
key={s.id}
onPress={() => updateField('soundId', s.id)}
style={[
styles.soundCard,
{
borderColor: selected ? P.teal : P.borderSubtle,
backgroundColor: selected ? P.tealSoft : P.cardAlt,
},
]}
testID={`alarm-sound-card-${s.id}`}
>
<View style={styles.rowBetween}>
<Music size={15} color={selected ? P.teal : P.textMuted} />
<Pressable
onPress={() => toggleSoundPreview(s.id)}
style={[styles.soundPreviewBtn, { backgroundColor: playing ? P.teal : P.card }]}
accessibilityRole="button"
accessibilityLabel={playing ? `Pause ${s.name}` : `Play ${s.name}`}
>
{playing ? <Pause size={12} color="#FFFFFF" /> : <Play size={12} color={P.teal} />}
</Pressable>
</View>
<Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: P.text, marginTop: 8 }}>
{s.name}
</Text>
<Text numberOfLines={1} style={{ fontSize: 10, color: P.textSecondary, marginTop: 2 }}>
{s.category} · {s.duration}
</Text>
</Pressable>
);
})}
</ScrollView>
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
{/* Category Selection Modal */}
<Modal visible={showCategoryModal} transparent animationType="slide" onRequestClose={() => setShowCategoryModal(false)}>
<View style={styles.modalBackdrop}>
<View style={[styles.bottomSheet, { backgroundColor: P.card }]}>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 16, fontWeight: '800', color: P.text }}>Select Category</Text>
<Pressable onPress={() => setShowCategoryModal(false)} accessibilityLabel="Close category selector">
<X size={20} color={P.textSecondary} />
</Pressable>
</View>
<View style={{ gap: 8 }}>
{ALARM_CATEGORIES.map((c) => {
const Icon = c.icon;
const sel = editingAlarm.category === c.id;
return (
<Pressable
key={c.id}
onPress={() => {
  updateField('category', c.id);
  setShowCategoryModal(false);
}}
style={[
styles.missionSelectRow,
{
borderColor: sel ? P.teal : P.borderSubtle,
backgroundColor: sel ? P.tealSoft : P.cardAlt,
},
]}
>
<View style={styles.rowCenter}>
<View style={[styles.shortcutIconBox, { backgroundColor: c.bg }]}>
<Icon size={16} color={c.color} />
</View>
<Text style={{ fontSize: 13, fontWeight: '700', color: sel ? P.teal : P.text, marginLeft: 10 }}>
{c.label}
</Text>
</View>
{sel && <CheckCircle2 size={16} color={P.teal} />}
</Pressable>
);
})}
</View>
</View>
</View>
</Modal>
{/* Specific Date Picker (Reused from Study Planner) */}
{Platform.OS === 'android' ? (
<NativeDatePicker
visible={showSpecificDatePicker}
value={editingAlarm.specificDate || formatAlarmSpecificDate(new Date())}
onSave={(dateStr) => {
  updateField('specificDate', dateStr);
  updateField('days', []);
  setShowSpecificDatePicker(false);
}}
onCancel={() => setShowSpecificDatePicker(false)}
parseDate={parseAlarmSpecificDate}
formatDate={formatAlarmSpecificDate}
/>
) : (
<WebDatePicker
visible={showSpecificDatePicker}
value={editingAlarm.specificDate || formatAlarmSpecificDate(new Date())}
title="Select Specific Date"
palette={{
  card: P.card,
  field: P.cardAlt,
  text: P.text,
  muted: P.textSecondary,
  blue: P.teal,
  border: P.border,
}}
onSave={(dateStr) => {
  updateField('specificDate', dateStr);
  updateField('days', []);
  setShowSpecificDatePicker(false);
}}
onCancel={() => setShowSpecificDatePicker(false)}
parseDate={parseAlarmSpecificDate}
formatDate={formatAlarmSpecificDate}
/>
)}
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
<HeavySleeperMissionView
  alarm={ringingAlarm}
  activeThemeColors={activeTheme.colors}
  mode={missionRunnerMode}
  restoredSession={restoredMissionSession}
  onSwitchToSnoozeMode={() => setMissionRunnerMode('snooze')}
  onSnoozeDirect={() => {
    setMissionRunnerMode(null);
    setRestoredMissionSession(null);
    void saveActiveMissionSession(null);
    handleSnoozeAlarm(ringingAlarm);
  }}
  onComplete={(missionName) => {
    const mode = missionRunnerMode;
    setMissionRunnerMode(null);
    setRestoredMissionSession(null);
    if (mode === 'snooze') handleSnoozeAlarm(ringingAlarm);
    else handleDismissAlarm(ringingAlarm, missionName);
  }}
  onEmergencyExit={() => {
    setMissionRunnerMode(null);
    setRestoredMissionSession(null);
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
<View style={{ flex: 1, justifyContent: 'space-between', padding: 24 }}>
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
Today · {formatLocalDateLabel(now)}
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
{ringingAlarm.snoozeEnabled && !ringingAlarm.antiSnooze && !(ringingAlarm.maxSnooze > 0 && (ringingAlarm.snoozeCount || 0) >= ringingAlarm.maxSnooze) && (
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
</View>
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
if (onOpenStudyPlanner) onOpenStudyPlanner();
else setActiveScreen('dashboard');
}}
style={[styles.tealPrimaryBtn, { backgroundColor: P.teal }]}
>
<Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>{primaryCta}</Text>
</Pressable>
<View style={styles.rowGap10}>
<Pressable
onPress={() => (onOpenStudyPlanner ? onOpenStudyPlanner() : setActiveScreen('dashboard'))}
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
<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 16 }}>
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
// --- SCREEN 9: ALARM THEME LIBRARY (4 THEMES) ---
const renderThemesScreen = () => (
<View style={{ flex: 1 }}>
<View style={[styles.header, { backgroundColor: P.card, borderBottomColor: P.borderSubtle, paddingHorizontal: 12 }]}>
<View style={[styles.rowCenter, { flex: 1, minWidth: 0, marginRight: 8 }]}>
<Pressable onPress={() => setActiveScreen('settings')} style={styles.iconBtn} accessibilityLabel="Back to Alarm Settings">
<ChevronLeft size={22} color={P.text} />
</Pressable>
<View style={{ marginLeft: 4, flex: 1, minWidth: 0 }}>
<Text numberOfLines={1} style={[styles.headerTitle, { color: P.text }]}>Alarm Themes</Text>
<Text numberOfLines={1} style={[styles.headerSub, { color: P.textSecondary }]}>
{ALARM_THEMES.length} curated themes
</Text>
</View>
</View>
<View style={[styles.rowGap8, { flexShrink: 0 }]}>
<Pressable
onPress={() => setThemePreviewVisible(true)}
style={[styles.smallChipBtn, styles.rowCenter, { gap: 4, backgroundColor: P.cardAlt }]}
accessibilityRole="button"
accessibilityLabel="Preview alarm theme"
testID="alarm-theme-preview-btn"
>
<Eye size={13} color={P.text} />
<Text style={{ color: P.text, fontSize: 12, fontWeight: '700' }}>Preview</Text>
</Pressable>
<Pressable
onPress={() => setActiveScreen('settings')}
style={[styles.headerSaveBtn, styles.rowCenter, { gap: 4, paddingHorizontal: 12 }]}
accessibilityRole="button"
accessibilityLabel="Done selecting alarm theme"
testID="alarm-theme-done-btn"
>
<CheckCircle2 size={13} color="#FFFFFF" />
<Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Done</Text>
</Pressable>
</View>
</View>
<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}>
<LinearGradient colors={[...activeTheme.colors]} style={styles.heroCard}>
<View style={styles.rowBetween}>
<Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>Active Theme</Text>
<Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>{activeTheme.name}</Text>
</View>
<Text style={{ color: '#FFFFFF', fontSize: 34, fontWeight: '900', marginTop: 12 }}>{nextAlarm ? `${formatAlarmTime(nextAlarm.hour, nextAlarm.minute, settings.use24h).timeStr} ${formatAlarmTime(nextAlarm.hour, nextAlarm.minute, settings.use24h).period}`.trim() : 'No alarm'}</Text>
<Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 }}>
{nextAlarm?.title || 'Previewing theme appearance'}
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
showToast(`Selected "${t.name}" theme`);
}}
accessibilityRole="button"
accessibilityState={{ selected }}
accessibilityLabel={`Select ${t.name} theme`}
testID={`alarm-theme-card-${t.id}`}
style={[
styles.themeCardWrap,
{ borderColor: selected ? '#2DD4BF' : 'transparent' },
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
<Modal
  visible={themePreviewVisible}
  transparent={false}
  animationType="fade"
  statusBarTranslucent
  onRequestClose={() => setThemePreviewVisible(false)}
>
  <LinearGradient colors={[...activeTheme.colors]} style={styles.fullScreen}>
    <View style={{ flex: 1, justifyContent: 'space-between', padding: 24, paddingTop: Math.max(insets.top + 20, 48), paddingBottom: Math.max(insets.bottom + 24, 36) }}>
      <View style={{ alignItems: 'center' }}>
        <View style={styles.glassPill}>
          <Eye size={14} color="#FFFFFF" />
          <Text style={styles.glassPillText}>Theme Preview · {activeTheme.name}</Text>
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 18 }}>
          {now.toDateString()}
        </Text>
        <Text style={[styles.ringingClock, { marginTop: 12 }]}>
          {nextAlarm ? formatAlarmTime(nextAlarm.hour, nextAlarm.minute, settings.use24h).timeStr : '06:30'}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', marginTop: 10 }}>
          {activeTheme.group} Theme
        </Text>
      </View>
      <Pressable
        onPress={() => setThemePreviewVisible(false)}
        style={styles.tealPrimaryBtn}
        accessibilityRole="button"
        accessibilityLabel="Dismiss theme preview"
        testID="alarm-theme-preview-dismiss"
      >
        <Text style={styles.tealPrimaryBtnText}>Dismiss Preview</Text>
      </Pressable>
    </View>
  </LinearGradient>
</Modal>
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
<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 14 }}>
<Pressable onPress={() => setActiveScreen('themes')}>
<View style={[styles.heroCard, styles.rowBetween, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: P.borderSubtle }]}>
<View>
<View style={[styles.themeGroupPill, { alignSelf: 'flex-start', marginBottom: 6, backgroundColor: 'rgba(20,184,166,0.12)' }]}>
<Text style={{ color: '#0F766E', fontSize: 9, fontWeight: '800' }}>PREMIUM PERSONALIZATION</Text>
</View>
<Text style={{ color: '#0F172A', fontSize: 15, fontWeight: '800' }}>
Theme Library ({ALARM_THEMES.length} Styles)
</Text>
<Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>
Current: {activeTheme.name}
</Text>
</View>
<Palette size={26} color="#0F766E" />
</View>
</Pressable>
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<Text style={[styles.sectionLabel, { color: P.textMuted }]}>NOTIFICATIONS</Text>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>Upcoming Alarm Notifications</Text>
<CustomToggle value={settings.notifyUpcoming} onChange={(v) => setS('notifyUpcoming', v)} dark={darkMode} />
</View>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>Missed Study Task Alerts</Text>
<CustomToggle value={settings.notifyMissed} onChange={(v) => setS('notifyMissed', v)} dark={darkMode} />
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
</View>
);
};
// --- SCREEN 11: FRIENDS — WAKE UP TOGETHER (REAL SUPABASE BACKED) ---
const renderFriendsScreen = () => {
const incoming = friendsDashboard?.incoming_requests || [];
const outgoing = friendsDashboard?.outgoing_requests || [];
const squads = friendsDashboard?.squads || [];
const notifications = friendsDashboard?.notifications || [];
const unreadNotifCount = notifications.filter((n) => !n.read_at).length;
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
<View style={styles.rowGap8}>
<Pressable onPress={() => void loadFriendsDashboard()} style={[styles.shortcutIconBox, { backgroundColor: P.cardAlt }]} accessibilityLabel="Refresh friends">
<RefreshCw size={16} color={P.text} />
</Pressable>
<Pressable onPress={() => setShowInviteFriendModal(true)} style={[styles.shortcutIconBox, { backgroundColor: P.cardAlt }]} accessibilityLabel="Find and add friends">
<UserPlus size={18} color={P.text} />
</Pressable>
</View>
</View>

{friendsLoading && !friendsDashboard ? (
<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
<Text style={{ fontSize: 14, color: P.textSecondary, fontWeight: '600' }}>Loading friends & wake-up squad…</Text>
</View>
) : friendsError ? (
<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 80 }}>
<Users size={42} color={P.textMuted} />
<Text style={{ fontSize: 18, fontWeight: '800', color: P.text, marginTop: 16, textAlign: 'center' }}>Friends Unavailable</Text>
<Text style={{ fontSize: 13, color: P.textSecondary, marginTop: 6, textAlign: 'center' }}>{friendsError}</Text>
<Pressable
onPress={() => void loadFriendsDashboard()}
style={[styles.inviteMainBtn, { backgroundColor: darkMode ? P.teal : '#333847' }]}
>
<Text style={{ color: darkMode ? '#020617' : '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Retry</Text>
</Pressable>
</View>
) : (
<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 14 }}>
{/* My Target Wake-Up Time */}
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle }]}>
<View style={styles.rowBetween}>
<View>
<Text style={{ fontSize: 13, fontWeight: '800', color: P.text }}>My Target Wake-Up Time</Text>
<Text style={{ fontSize: 11, color: P.textSecondary }}>
Shared only with accepted friends (24h HH:MM)
</Text>
</View>
<View style={styles.rowGap8}>
<TextInput
value={targetWakeInput}
onChangeText={setTargetWakeInput}
placeholder="06:00"
placeholderTextColor={P.textMuted}
maxLength={5}
style={[styles.inputBox, { width: 72, paddingVertical: 6, textAlign: 'center', backgroundColor: P.cardAlt, borderColor: P.border, color: P.text }]}
/>
<Pressable onPress={() => void handleSaveTargetWakeTime()} style={[styles.smallChipBtn, { backgroundColor: darkMode ? P.teal : '#0F172A' }]}>
<Text style={{ fontSize: 11, fontWeight: '800', color: darkMode ? '#020617' : '#FFFFFF' }}>Save</Text>
</Pressable>
</View>
</View>
</View>

{/* Notifications */}
{notifications.length > 0 && (
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle, gap: 8 }]}>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 12, fontWeight: '800', color: P.text }}>
Activity & Alerts {unreadNotifCount > 0 ? `(${unreadNotifCount} new)` : ''}
</Text>
{unreadNotifCount > 0 && (
<Pressable onPress={() => void handleMarkNotificationsRead()}>
<Text style={{ fontSize: 11, fontWeight: '700', color: P.teal }}>Mark read</Text>
</Pressable>
)}
</View>
{notifications.slice(0, 4).map((n) => (
<View key={n.id} style={{ backgroundColor: P.cardAlt, padding: 10, borderRadius: 12, opacity: n.read_at ? 0.7 : 1 }}>
<Text style={{ fontSize: 12, fontWeight: '700', color: P.text }}>{n.title}</Text>
<Text style={{ fontSize: 11, color: P.textSecondary, marginTop: 2 }}>{n.body}</Text>
</View>
))}
</View>
)}

{/* Pending Incoming Requests */}
{incoming.length > 0 && (
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle, gap: 8 }]}>
<Text style={{ fontSize: 12, fontWeight: '800', color: P.text }}>Incoming Requests ({incoming.length})</Text>
{incoming.map((req) => (
<View key={req.request_id} style={[styles.rowBetween, { backgroundColor: P.cardAlt, padding: 10, borderRadius: 14 }]}>
<View style={{ flex: 1, paddingRight: 8 }}>
<Text style={{ fontSize: 13, fontWeight: '700', color: P.text }}>{req.display_name}</Text>
<Text style={{ fontSize: 11, color: P.textSecondary }}>{req.exam_id ? req.exam_id.toUpperCase() : 'Study Sakha Learner'}</Text>
</View>
<View style={styles.rowGap8}>
<Pressable onPress={() => void handleRespondFriendRequest(req.request_id, 'accept')} style={[styles.smallChipBtn, { backgroundColor: '#10B981' }]}>
<Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Accept</Text>
</Pressable>
<Pressable onPress={() => void handleRespondFriendRequest(req.request_id, 'reject')} style={[styles.smallChipBtn, { backgroundColor: P.card }]}>
<Text style={{ fontSize: 11, fontWeight: '700', color: P.textSecondary }}>Decline</Text>
</Pressable>
</View>
</View>
))}
</View>
)}

{/* Pending Outgoing Requests */}
{outgoing.length > 0 && (
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle, gap: 8 }]}>
<Text style={{ fontSize: 12, fontWeight: '800', color: P.text }}>Sent Requests ({outgoing.length})</Text>
{outgoing.map((req) => (
<View key={req.request_id} style={[styles.rowBetween, { backgroundColor: P.cardAlt, padding: 10, borderRadius: 14 }]}>
<View style={{ flex: 1, paddingRight: 8 }}>
<Text style={{ fontSize: 13, fontWeight: '700', color: P.text }}>{req.display_name}</Text>
<Text style={{ fontSize: 11, color: P.textSecondary }}>Pending acceptance</Text>
</View>
<Pressable onPress={() => void handleRespondFriendRequest(req.request_id, 'cancel')} style={[styles.smallChipBtn, { backgroundColor: P.card }]}>
<Text style={{ fontSize: 11, fontWeight: '700', color: P.textSecondary }}>Cancel</Text>
</Pressable>
</View>
))}
</View>
)}

{/* Wake-Up Squads */}
{squads.length > 0 && (
<View style={[styles.sectionCard, { backgroundColor: P.card, borderColor: P.borderSubtle, gap: 10 }]}>
<Text style={{ fontSize: 12, fontWeight: '800', color: P.text }}>Wake-Up Squads ({squads.length})</Text>
{squads.map((sq) => (
<View key={sq.squad_id} style={{ backgroundColor: P.cardAlt, padding: 12, borderRadius: 14, gap: 6 }}>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 13, fontWeight: '800', color: P.text }}>{sq.name}</Text>
<Text style={{ fontSize: 11, fontWeight: '700', color: P.teal }}>Target {sq.target_wake_time}</Text>
</View>
<Text style={{ fontSize: 11, color: P.textSecondary }}>
Members: {sq.members.map((m) => `${m.display_name} (${m.status})`).join(', ')}
</Text>
{sq.my_status === 'invited' && (
<View style={[styles.rowGap8, { marginTop: 4 }]}>
<Pressable onPress={() => void handleRespondSquadInvite(sq.squad_id, true)} style={[styles.smallChipBtn, { backgroundColor: '#10B981' }]}>
<Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Join Squad</Text>
</Pressable>
<Pressable onPress={() => void handleRespondSquadInvite(sq.squad_id, false)} style={[styles.smallChipBtn, { backgroundColor: P.card }]}>
<Text style={{ fontSize: 11, fontWeight: '700', color: P.textSecondary }}>Decline</Text>
</Pressable>
</View>
)}
</View>
))}
</View>
)}

{friends.length === 0 ? (
<View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 28 }}>
<View style={styles.friendsAvatarGrid}>
<FriendBuddyAvatar type="circle" size="lg" />
<FriendBuddyAvatar type="square" size="lg" />
<FriendBuddyAvatar type="clover" size="lg" />
<FriendBuddyAvatar type="cloud" size="lg" />
</View>
<Text style={{ fontSize: 20, fontWeight: '800', color: P.text, marginTop: 24 }}>No friends yet</Text>
<Text style={{ fontSize: 13, color: P.textSecondary, marginTop: 6, textAlign: 'center' }}>
Search for real Study Sakha learners by name or email to build your wake-up circle.
</Text>
<Pressable
onPress={() => setShowInviteFriendModal(true)}
style={[styles.inviteMainBtn, { backgroundColor: darkMode ? P.teal : '#333847' }]}
>
<Text style={{ color: darkMode ? '#020617' : '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
Find Friends
</Text>
</Pressable>
</View>
) : (
<>
<LinearGradient colors={['#232634', '#2C3144', '#172B3A']} style={styles.heroCard}>
<View style={styles.rowBetween}>
<View style={[styles.miniBadge, { backgroundColor: 'rgba(245,158,11,0.2)' }]}>
<Text style={{ color: '#FCD34D', fontSize: 10, fontWeight: '800' }}>WAKE-UP ACCOUNTABILITY</Text>
</View>
<Text style={{ color: '#5EEAD4', fontSize: 12, fontWeight: '700' }}>
{awakeCount}/{friends.length} Awake
</Text>
</View>
<Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 10 }}>
Wake Up Together · {targetWakeInput}
</Text>
<Text style={{ color: '#CBD5E1', fontSize: 12, marginTop: 4 }}>
Send cheers or wake-up nudges to your accepted friends.
</Text>
<View style={[styles.rowGap8, { marginTop: 14 }]}>
<Pressable
onPress={() => {
setSquadTimeInput(targetWakeInput);
setSquadSelectedIds(friends.map((f) => f.id));
setShowCreateSquadModal(true);
}}
style={[styles.heroActionBtn, { flex: 1, backgroundColor: '#14B8A6' }]}
>
<AlarmClock size={14} color="#020617" />
<Text style={{ color: '#020617', fontSize: 12, fontWeight: '800' }}>Create Squad</Text>
</Pressable>
<Pressable onPress={() => setShowInviteFriendModal(true)} style={[styles.heroActionBtn, { paddingHorizontal: 14 }]}>
<UserPlus size={14} color="#FFFFFF" />
<Text style={styles.heroActionText}>Add Friend</Text>
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
const actionKind: 'cheer' | 'nudge' = f.statusType === 'snoozing' || f.statusType === 'sleeping' ? 'nudge' : 'cheer';
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
{f.streak > 0 && (
<>
<Flame size={12} color="#F59E0B" style={{ marginLeft: 5 }} />
<Text style={{ fontSize: 11, fontWeight: '700', color: '#F59E0B', marginLeft: 2 }}>
{f.streak}d
</Text>
</>
)}
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
disabled={f.nudged}
onPress={() => void handleCheerOrNudgeFriend(f.id, actionKind)}
style={[
styles.smallChipBtn,
styles.rowCenter,
{
gap: 4,
backgroundColor: f.nudged ? P.tealSoft : darkMode ? P.teal : '#0F172A',
opacity: f.nudged ? 0.75 : 1,
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
{f.nudged ? (actionKind === 'cheer' ? 'Cheered' : 'Nudged') : actionKind === 'nudge' ? 'Nudge' : 'Cheer'}
</Text>
</Pressable>
<Pressable onPress={() => void handleRemoveFriend(f.id)} style={{ padding: 6, marginLeft: 2 }} accessibilityLabel={`Remove ${f.name}`}>
<X size={16} color={P.textMuted} />
</Pressable>
</View>
</View>
</View>
);
})}
</>
)}
</ScrollView>
)}
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
case 'stats': return renderStatsScreen();
case 'history': return renderHistoryScreen();
case 'themes': return renderThemesScreen();
case 'settings': return renderSettingsScreen();
case 'friends': return renderFriendsScreen();
default: return renderDashboardScreen();
}
};
const showGlobalBottomNav = Boolean(globalBottomNav) && activeScreen !== 'ringing';
return (
<SafeAreaView edges={showGlobalBottomNav ? ['top', 'right', 'left'] : ['top', 'right', 'bottom', 'left']} style={{ flex: 1, backgroundColor: P.bg }}>
<StatusBar
  barStyle={darkMode || activeScreen === 'ringing' ? 'light-content' : 'dark-content'}
  backgroundColor={activeScreen === 'ringing' ? activeTheme.colors[0] : P.card}
/>
<View style={{ flex: 1 }}>
{renderScreen()}
</View>
{showGlobalBottomNav ? globalBottomNav : null}
{/* Toast Pill */}
{!!toastMsg && (
<View style={[styles.toastPill, { top: Math.max(insets.top + 8, 16), backgroundColor: darkMode ? '#FFFFFF' : '#0F172A' }]}>
<CheckCircle2 size={15} color="#14B8A6" />
<Text style={{ color: darkMode ? '#020617' : '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
{toastMsg}
</Text>
</View>
)}
{/* Find & Add Real Study Friends Modal */}
<Modal visible={showInviteFriendModal} transparent animationType="slide" onRequestClose={() => setShowInviteFriendModal(false)}>
<View style={styles.modalBackdrop}>
<View style={[styles.bottomSheet, { backgroundColor: P.card, maxHeight: '85%' }]}>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 16, fontWeight: '800', color: P.text }}>Find Study Friends</Text>
<Pressable onPress={() => setShowInviteFriendModal(false)}>
<X size={20} color={P.textSecondary} />
</Pressable>
</View>
<Text style={{ fontSize: 12, color: P.textSecondary }}>
Search by display name or exact email to send a friend request.
</Text>
<TextInput
value={inviteInput}
onChangeText={(text) => void handleSearchUsers(text)}
placeholder="Search name or email (min 2 chars)..."
placeholderTextColor={P.textMuted}
autoCapitalize="none"
style={[styles.inputBox, { backgroundColor: P.cardAlt, borderColor: P.border, color: P.text }]}
/>
<ScrollView contentContainerStyle={{ gap: 8 }}>
{userSearchLoading ? (
<Text style={{ fontSize: 12, color: P.textSecondary, textAlign: 'center', paddingVertical: 14 }}>Searching learners…</Text>
) : inviteInput.trim().length < 2 ? (
<Text style={{ fontSize: 12, color: P.textMuted, textAlign: 'center', paddingVertical: 14 }}>Type at least 2 characters to search.</Text>
) : userSearchResults.length === 0 ? (
<Text style={{ fontSize: 12, color: P.textMuted, textAlign: 'center', paddingVertical: 14 }}>No matching learners found.</Text>
) : (
userSearchResults.map((u) => {
const isDisabled = u.relationship_status !== 'none';
const label =
u.relationship_status === 'accepted'
? 'Friends'
: u.relationship_status === 'outgoing_pending'
? 'Requested'
: u.relationship_status === 'incoming_pending'
? 'Pending'
: 'Add';
return (
<View key={u.user_id} style={[styles.rowBetween, { backgroundColor: P.cardAlt, padding: 10, borderRadius: 16 }]}>
<View style={{ flex: 1, paddingRight: 8 }}>
<Text style={{ fontSize: 13, fontWeight: '700', color: P.text }}>{u.display_name}</Text>
<Text style={{ fontSize: 11, color: P.textSecondary }}>{u.exam_id ? u.exam_id.toUpperCase() : 'Study Sakha Learner'}</Text>
</View>
<Pressable
disabled={isDisabled}
onPress={() => void handleSendFriendRequest(u.user_id)}
style={[
styles.smallChipBtn,
{ backgroundColor: isDisabled ? 'rgba(16,185,129,0.16)' : darkMode ? P.teal : '#333847' },
]}
>
<Text style={{ fontSize: 11, fontWeight: '700', color: isDisabled ? '#10B981' : darkMode ? '#020617' : '#FFFFFF' }}>
{label}
</Text>
</Pressable>
</View>
);
})
)}
</ScrollView>
</View>
</View>
</Modal>

{/* Create Wake-Up Squad Modal */}
<Modal visible={showCreateSquadModal} transparent animationType="slide" onRequestClose={() => setShowCreateSquadModal(false)}>
<View style={styles.modalBackdrop}>
<View style={[styles.bottomSheet, { backgroundColor: P.card, maxHeight: '85%' }]}>
<View style={styles.rowBetween}>
<Text style={{ fontSize: 16, fontWeight: '800', color: P.text }}>Create Wake-Up Squad</Text>
<Pressable onPress={() => setShowCreateSquadModal(false)}>
<X size={20} color={P.textSecondary} />
</Pressable>
</View>
<TextInput
value={squadNameInput}
onChangeText={setSquadNameInput}
placeholder="Squad name (e.g. 6 AM Polity Circle)"
placeholderTextColor={P.textMuted}
style={[styles.inputBox, { backgroundColor: P.cardAlt, borderColor: P.border, color: P.text }]}
/>
<TextInput
value={squadTimeInput}
onChangeText={setSquadTimeInput}
placeholder="Target time (HH:MM)"
placeholderTextColor={P.textMuted}
maxLength={5}
style={[styles.inputBox, { backgroundColor: P.cardAlt, borderColor: P.border, color: P.text }]}
/>
<Text style={[styles.sectionLabel, { color: P.textMuted }]}>INVITE ACCEPTED FRIENDS</Text>
<ScrollView contentContainerStyle={{ gap: 8 }}>
{friends.map((f) => {
const checked = squadSelectedIds.includes(f.id);
return (
<Pressable
key={f.id}
onPress={() => setSquadSelectedIds((prev) => (checked ? prev.filter((id) => id !== f.id) : [...prev, f.id]))}
style={[styles.rowBetween, { backgroundColor: P.cardAlt, padding: 10, borderRadius: 14 }]}
>
<Text style={{ fontSize: 13, fontWeight: '700', color: P.text }}>{f.name}</Text>
<Text style={{ fontSize: 11, fontWeight: '800', color: checked ? P.teal : P.textMuted }}>{checked ? 'Selected' : 'Tap to invite'}</Text>
</Pressable>
);
})}
</ScrollView>
<Pressable onPress={() => void handleCreateSquad()} style={[styles.inviteMainBtn, { alignSelf: 'center', marginTop: 10, backgroundColor: darkMode ? P.teal : '#0F172A' }]}>
<Text style={{ color: darkMode ? '#020617' : '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Create & Send Invites</Text>
</Pressable>
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
left: 18,
bottom: 18,
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
headerMenuBackdrop: {
flex: 1,
backgroundColor: 'rgba(2,6,23,0.18)',
},
headerMenuDropdown: {
position: 'absolute',
right: 16,
width: 196,
borderRadius: 16,
borderWidth: 1,
paddingVertical: 6,
shadowColor: '#000',
shadowOpacity: 0.16,
shadowRadius: 14,
shadowOffset: { width: 0, height: 6 },
elevation: 10,
},
headerMenuItem: {
flexDirection: 'row',
alignItems: 'center',
gap: 12,
paddingHorizontal: 14,
paddingVertical: 11,
},
headerMenuItemText: {
fontSize: 13,
fontWeight: '700',
},
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
wheelColumnsRow: {
height: WHEEL_ITEM_HEIGHT * 5,
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'center',
position: 'relative',
overflow: 'hidden',
},
wheelSelectionBand: {
position: 'absolute',
left: 4,
right: 4,
top: WHEEL_ITEM_HEIGHT * 2,
height: WHEEL_ITEM_HEIGHT,
borderRadius: 12,
borderWidth: 1,
},
wheelColumnWrap: {
flex: 1,
height: WHEEL_ITEM_HEIGHT * 5,
alignItems: 'center',
},
wheelColumnScroll: {
width: '100%',
},
wheelItem: {
height: WHEEL_ITEM_HEIGHT,
alignItems: 'center',
justifyContent: 'center',
},
categorySelectorRow: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'space-between',
borderWidth: 1,
borderRadius: 16,
paddingHorizontal: 12,
paddingVertical: 10,
},
soundCard: {
width: 156,
borderRadius: 16,
borderWidth: 1,
padding: 12,
},
soundPreviewBtn: {
width: 28,
height: 28,
borderRadius: 9,
alignItems: 'center',
justifyContent: 'center',
},
dayCircle: {
width: 38,
height: 38,
borderRadius: 19,
alignItems: 'center',
justifyContent: 'center',
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
themeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
themeCardWrap: {
width: '48.2%',
height: 98,
borderRadius: 18,
borderWidth: 2.5,
borderColor: 'transparent',
},
themeCardInner: {
flex: 1,
borderRadius: 15.5,
overflow: 'hidden',
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
