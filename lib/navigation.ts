import type { LinkingOptions, NavigatorScreenParams, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ExamId } from './types';
import type { FocusSessionSetup } from '../components/FocusSessionSetupModal';
import type { GroupRoomId } from './groupRooms';

type HeaderParams = { headerBrand?: 'SakhaAI' };
type OptionalScreenParams = HeaderParams | undefined;
type LibraryParams = HeaderParams & { exam?: ExamId; subject?: string; category?: string };

export type AppStackParamList = {
  DashboardRoot: OptionalScreenParams;
  Library: LibraryParams | undefined;
  Groups: (HeaderParams & {
    inviteGroupId?: string;
    inviteToken?: string;
    openGroupRoom?: {
      groupId: string;
      roomId: GroupRoomId;
      focusSession?: {
        sessionId: string;
        subject: string;
        startedAt: string;
        elapsedSeconds: number;
        status: 'focusing' | 'paused' | 'break';
      };
    };
  }) | undefined;
  More: OptionalScreenParams;
  LibraryNotes: LibraryParams | undefined;
  LibraryBooks: LibraryParams | undefined;
  LibraryPYQSets: LibraryParams | undefined;
  LibraryStarred: LibraryParams | undefined;
  LibraryDownloads: LibraryParams | undefined;
  PYQ: (HeaderParams & { exam?: ExamId; subject?: string }) | undefined;
  Tests: OptionalScreenParams;
  TestPlayer: HeaderParams & { testId: string };
  TestResult: HeaderParams & { resultId: string };
  SakhaAI: (HeaderParams & { prompt?: string }) | undefined;
  NoteEditor: (HeaderParams & { resourceId?: string; noteId?: string }) | undefined;
  BookReader: HeaderParams & { resourceId: string };
  CurrentAffairs: OptionalScreenParams;
  Search: OptionalScreenParams;
  Notifications: OptionalScreenParams;
  Statistics: OptionalScreenParams;
  TaskPerformance: (HeaderParams & { startDate?: string; endDate?: string }) | undefined;
  StudyPlanner: (HeaderParams & { openPlanId?: string; openDate?: string }) | undefined;
  Alarm: OptionalScreenParams;
  FocusCenter: (HeaderParams & {
    focusSession?: FocusSessionSetup;
    roomFocus?: { groupId: string; roomId: GroupRoomId; roomSessionId: string };
  }) | undefined;
  FocusCompletion: {
    session: {
      id: string;
      sessionId: string;
      startedAt: string;
      endedAt: string;
      completedAt?: string;
      focusedSeconds: number;
      actualSeconds?: number;
      plannedSeconds: number | null;
      plannedMinutes?: number;
      mode: 'timer' | 'stopwatch' | 'pomodoro';
      tagType?: 'subject' | 'activity';
      subject?: string;
      activity?: string;
      topic?: string;
      focusQuality?: 'distracted' | 'steady' | 'flow';
      taskId?: string;
      scheduleId?: string;
      scheduleOccurrenceId?: string;
      groupId?: string;
      minutes?: number;
      status: 'completed' | 'saved_early';
    };
    message: string;
    groupSyncWarning?: string;
  };
  FocusLock: OptionalScreenParams;
  Profile: OptionalScreenParams;
  Settings: (HeaderParams & { openDetail?: string }) | undefined;
  AppGuide: OptionalScreenParams;
  Admin: OptionalScreenParams;
};

export type AppStackNavigationTarget = NavigatorScreenParams<AppStackParamList>;

export type RootStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  Dashboard: NavigatorScreenParams<AppStackParamList> | undefined;
};

export type AppNavigationParamList = AppStackParamList & {
  Dashboard: undefined;
};
export type AppStackRouteName = keyof AppStackParamList;
export type AppNavigationRouteName = keyof AppNavigationParamList;

type NavigationTargetFor<RouteName extends keyof AppNavigationParamList> =
  undefined extends AppNavigationParamList[RouteName]
    ? { route: RouteName; params?: Exclude<AppNavigationParamList[RouteName], undefined> }
    : { route: RouteName; params: AppNavigationParamList[RouteName] };

export type AppNavigationTarget = {
  [RouteName in keyof AppNavigationParamList]: NavigationTargetFor<RouteName>;
}[keyof AppNavigationParamList];

export type AppNavigation = NativeStackNavigationProp<AppStackParamList>;
export type AuthNavigation = NativeStackNavigationProp<RootStackParamList>;
export type AppRoute<RouteName extends keyof AppStackParamList> = RouteProp<AppStackParamList, RouteName>;
export type AppHeaderRoute = RouteProp<AppStackParamList, keyof AppStackParamList>;
export type AppLinkingOptions = LinkingOptions<RootStackParamList>;

const APP_BACK_TARGETS: Partial<Record<AppStackRouteName, AppStackRouteName>> = {
  LibraryNotes: 'Library',
  LibraryBooks: 'Library',
  LibraryPYQSets: 'Library',
  LibraryStarred: 'Library',
  LibraryDownloads: 'Library',
  TestPlayer: 'Tests',
  TestResult: 'Tests',
  TaskPerformance: 'Statistics',
};

export function getAndroidBackTarget(
  currentRoute: AppStackRouteName,
  previousRoutes: readonly AppStackRouteName[]
): AppStackRouteName | null {
  if (currentRoute === 'DashboardRoot') return null;
  if (currentRoute === 'NoteEditor' || currentRoute === 'BookReader') {
    return previousRoutes.at(-1) ?? 'DashboardRoot';
  }
  return APP_BACK_TARGETS[currentRoute] ?? 'DashboardRoot';
}

export function getNotificationNavigationRoute(response: unknown): 'Notifications' | null {
  if (!response || typeof response !== 'object') return null;
  const notification = (response as { notification?: unknown }).notification;
  if (!notification || typeof notification !== 'object') return null;
  const request = (notification as { request?: unknown }).request;
  if (!request || typeof request !== 'object') return null;
  const content = (request as { content?: unknown }).content;
  if (!content || typeof content !== 'object') return null;
  const data = (content as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return null;
  const route = (data as { route?: unknown }).route;
  if (route === 'Notifications') return 'Notifications';
  const hasKnownPayload =
    typeof (data as { plannerItemId?: unknown }).plannerItemId === 'string' ||
    typeof (data as { taskId?: unknown }).taskId === 'string' ||
    typeof (data as { groupId?: unknown }).groupId === 'string' ||
    typeof (data as { testId?: unknown }).testId === 'string' ||
    typeof (data as { resultId?: unknown }).resultId === 'string' ||
    typeof (data as { kind?: unknown }).kind === 'string';
  return hasKnownPayload ? 'Notifications' : null;
}
