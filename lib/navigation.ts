import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import type { LinkingOptions, NavigatorScreenParams, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ExamId } from './types';

type HeaderParams = { headerBrand?: 'SakhaAI' };
type OptionalScreenParams = HeaderParams | undefined;
type LibraryParams = HeaderParams & { exam?: ExamId; subject?: string; category?: string };

export type AppStackParamList = {
  DashboardRoot: OptionalScreenParams;
  Library: LibraryParams | undefined;
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
  StudyPlanner: OptionalScreenParams;
  FocusCenter: OptionalScreenParams;
  FocusLock: OptionalScreenParams;
  Hobbies: OptionalScreenParams;
  Profile: OptionalScreenParams;
  Settings: OptionalScreenParams;
  AppGuide: OptionalScreenParams;
  StudentTestimonials: OptionalScreenParams;
  Admin: OptionalScreenParams;
};

export type DrawerParamList = {
  MainStack: NavigatorScreenParams<AppStackParamList> | undefined;
};
export type AppStackNavigationTarget = NavigatorScreenParams<AppStackParamList>;

export type RootStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  Dashboard: NavigatorScreenParams<DrawerParamList> | undefined;
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
export type AppDrawerContentProps = DrawerContentComponentProps;
