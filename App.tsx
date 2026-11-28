import Ionicons from '@expo/vector-icons/Ionicons';
import { createNavigationContainerRef, DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationBar } from 'expo-navigation-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, AppState, Easing, Image, Platform, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActiveSessionBar } from './components/ActiveSessionBar';
import { Logo } from './components/Logo';
import { FocusSessionProvider, useOptionalFocusSession } from './lib/focusSession';
import type { FocusCompletionPayload } from './lib/focusSession';
import { StoreProvider, useStore } from './lib/store';
import { SSDSThemeProvider } from './lib/ssdsThemeBridge';
import { ThemeProvider, useTheme } from './lib/theme';
import type {
  AppLinkingOptions,
  AppStackParamList,
  RootStackParamList,
} from './lib/navigation';
import { getNotificationNavigationRoute } from './lib/navigation';
import { peekPendingNativeAlarm, subscribeToNativeAlarm } from './src/modules/alarm/alarmNative';
import LibraryScreen, {
  LibraryBooksScreen,
  LibraryDownloadsScreen,
  LibraryNotesScreen,
  LibraryPYQSetsScreen,
  LibraryStarredScreen,
} from './screens/LibraryScreen';

import AdminScreen from './screens/AdminScreen';
import AppGuideScreen from './screens/AppGuideScreen';
import BookReaderScreen from './screens/BookReaderScreen';
import CurrentAffairsScreen from './screens/CurrentAffairsScreen';
import DashboardScreen from './screens/DashboardScreen';
import FocusCenterScreen from './screens/FocusCenterScreen';
import FocusCompletionScreen from './screens/FocusCompletionScreen';
import FocusLockScreen from './screens/FocusLockScreen';
import GroupsScreen from './screens/GroupsScreen';
import MoreScreen from './screens/MoreScreen';
import NoteEditorScreen from './screens/NoteEditorScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import NotificationSettingsScreen from './screens/NotificationSettingsScreen';
import ProfileScreen from './screens/ProfileScreen';
import PYQScreen from './screens/PYQScreen';
import SakhaAIScreen from './screens/SakhaAIScreen';
import SearchScreen from './screens/SearchScreen';
import SettingsScreen from './screens/SettingsScreen';
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import StatisticsScreen from './screens/StatisticsScreen';
import TaskPerformanceScreen from './screens/TaskPerformanceScreen';
import StudyPlannerScreen from './screens/StudyPlannerScreen';
import StudySakhaAlarmScreen from './screens/StudySakhaAlarmScreen';
import TestPlayerScreen from './screens/TestPlayerScreen';
import TestResultScreen from './screens/TestResultScreen';
import TestsScreen from './screens/TestsScreen';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import {
  capturePresentedNotifications,
  ensureAndroidNotificationChannels,
  flushPendingNotificationIntent,
  notificationFromExpoNotification,
  notificationFromExpoResponse,
  registerDevicePushToken,
  setPendingNotificationIntent,
  syncUpcomingPlannerReminder,
} from './lib/notifications';
import {
  clearPendingGroupInvite,
  extractGroupInviteFromUrl,
  getDeepLinkPrefixes,
  getPendingGroupInvite,
  savePendingGroupInvite,
} from './lib/shareLinks';

const Stack = createNativeStackNavigator<RootStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const MASCOT_SPLASH = require('./assets/mascot/study-sakha-mascot.png');
const navigationRef = createNavigationContainerRef<RootStackParamList>();

const linking: AppLinkingOptions = {
  prefixes: getDeepLinkPrefixes(),
  config: {
    screens: {
      SignIn: 'sign-in',
      SignUp: 'sign-up',
      Dashboard: {
        path: '',
        screens: {
          DashboardRoot: '',
          Library: 'library',
          Groups: 'groups/invite/:inviteToken',
          More: 'more',
          LibraryNotes: 'library/notes',
          LibraryBooks: 'library/books',
          LibraryPYQSets: 'library/pyq-sets',
          LibraryStarred: 'library/starred',
          LibraryDownloads: 'library/downloads',
          PYQ: 'pyq-bank',
          Tests: 'tests',
          TestPlayer: 'tests/attempt',
          TestResult: 'tests/result',
          SakhaAI: 'sakha-ai',
          NoteEditor: 'notes',
          BookReader: 'books',
          CurrentAffairs: 'current-affairs',
          Search: 'search',
          Notifications: 'notifications',
          NotificationSettings: 'notifications/settings',
          Statistics: 'statistics',
          TaskPerformance: 'statistics/tasks',
          StudyPlanner: 'study-planner',
          Alarm: 'alarm',
          FocusCenter: 'focus/center',
          FocusCompletion: 'focus/completed',
          Profile: 'profile',
          Settings: 'settings',
          AppGuide: 'app-guide',
          Admin: 'admin',
          FocusLock: 'focus/lock',
        },
      },
    },
  },
};

function Splash() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 22 }}>
      <Image source={MASCOT_SPLASH} resizeMode="contain" accessibilityLabel="Study Sakha mascot" style={{ width: 150, height: 150 }} />
      <ActivityIndicator color={colors.blue} />
    </View>
  );
}

function BrandIntro({ onFinished }: { onFinished: () => void }) {
  const mascotOpacity = useMemo(() => new Animated.Value(0), []);
  const mascotScale = useMemo(() => new Animated.Value(0.9), []);
  const mascotY = useMemo(() => new Animated.Value(14), []);
  const titleOpacity = useMemo(() => new Animated.Value(0), []);
  const glowOpacity = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(mascotOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(mascotScale, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(mascotY, { toValue: -8, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(glowOpacity, { toValue: 1, duration: 900, delay: 180, useNativeDriver: true }),
      Animated.timing(titleOpacity, { toValue: 1, duration: 520, delay: 520, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(onFinished, 1500);
    return () => clearTimeout(timer);
  }, [glowOpacity, mascotOpacity, mascotScale, mascotY, onFinished, titleOpacity]);

  return (
    <LinearGradient colors={['#111A3B', '#241747', '#100D28']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <StatusBar style="light" />
      <Animated.View style={{ position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#F5A524', opacity: glowOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.08] }), transform: [{ scale: mascotScale }] }} />
      <Animated.View style={{ alignItems: 'center', opacity: mascotOpacity, transform: [{ translateY: mascotY }, { scale: mascotScale }] }}>
        <Animated.View style={{ opacity: titleOpacity }}>
          <Logo size={280} wordmarkSize={28} direction="column" compact wordmark="Study Sakha" wordmarkColor="#FFFFFF" accentColor="#F5C65B" />
        </Animated.View>
      </Animated.View>
    </LinearGradient>
  );
}

// ----------------------------------------------------
// 1. AUTHENTICATED APP NAVIGATOR
// ----------------------------------------------------
export function AuthenticatedStackNavigator() {
  const { colors, reduceMotion } = useTheme();
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === 'web' || reduceMotion ? 'none' : 'default',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <AppStack.Screen name="DashboardRoot" component={DashboardScreen} />
      <AppStack.Screen name="Library" component={LibraryScreen} />
      <AppStack.Screen name="Groups" component={GroupsScreen} />
      <AppStack.Screen name="More" component={MoreScreen} />
      <AppStack.Screen name="LibraryNotes" component={LibraryNotesScreen} />
      <AppStack.Screen name="LibraryBooks" component={LibraryBooksScreen} />
      <AppStack.Screen name="LibraryPYQSets" component={LibraryPYQSetsScreen} />
      <AppStack.Screen name="LibraryStarred" component={LibraryStarredScreen} />
      <AppStack.Screen name="LibraryDownloads" component={LibraryDownloadsScreen} />
      <AppStack.Screen name="PYQ" component={PYQScreen} />
      <AppStack.Screen name="Tests" component={TestsScreen} />
      <AppStack.Screen name="TestPlayer" component={TestPlayerScreen} />
      <AppStack.Screen name="TestResult" component={TestResultScreen} />
      <AppStack.Screen name="SakhaAI" component={SakhaAIScreen} />
      <AppStack.Screen name="NoteEditor" component={NoteEditorScreen} />
      <AppStack.Screen name="BookReader" component={BookReaderScreen} />
      <AppStack.Screen name="CurrentAffairs" component={CurrentAffairsScreen} />
      <AppStack.Screen name="Search" component={SearchScreen} />
      <AppStack.Screen name="Notifications" component={NotificationsScreen} />
      <AppStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <AppStack.Screen name="Statistics" component={StatisticsScreen} />
      <AppStack.Screen name="TaskPerformance" component={TaskPerformanceScreen} />
      <AppStack.Screen name="StudyPlanner" component={StudyPlannerScreen} />
      <AppStack.Screen name="Alarm" component={StudySakhaAlarmScreen} />
      <AppStack.Screen name="FocusCenter" component={FocusCenterScreen} />
      <AppStack.Screen name="FocusCompletion" component={FocusCompletionScreen} />
      <AppStack.Screen name="FocusLock" component={FocusLockScreen} />
      <AppStack.Screen name="Profile" component={ProfileScreen} />
      <AppStack.Screen name="Settings" component={SettingsScreen} />
      <AppStack.Screen name="AppGuide" component={AppGuideScreen} />
      <AppStack.Screen name="Admin" component={AdminScreen} />
    </AppStack.Navigator>
  );
}

// ----------------------------------------------------
// 2. ROOT STACK NAVIGATOR
// ----------------------------------------------------
function Navigation() {
  const { state, dispatch, authStatus } = useStore();
  const { colors, scheme, reduceMotion } = useTheme();
  const focus = useOptionalFocusSession();
  const [showBrandIntro, setShowBrandIntro] = useState(true);
  const [activeRouteName, setActiveRouteName] = useState<string | undefined>(undefined);
  const pendingNotificationRoute = useRef<'Notifications' | null>(null);
  const pendingInviteRef = useRef<{ inviteToken?: string; inviteGroupId?: string } | null>(null);
  const lastDispatchedInviteKeyRef = useRef<string | null>(null);
  const finishBrandIntro = useCallback(() => setShowBrandIntro(false), []);

  const setFocusRouteName = focus?.setCurrentRouteName;

  const syncCurrentRoute = useCallback(() => {
    if (!navigationRef.isReady()) return;
    const nextName = navigationRef.getCurrentRoute()?.name;
    setActiveRouteName((prev) => (prev === nextName ? prev : nextName));
    setFocusRouteName?.(nextName);
  }, [setFocusRouteName]);

  const openPendingInviteRoute = useCallback(() => {
    const pending = pendingInviteRef.current;
    if (
      !pending ||
      !navigationRef.isReady() ||
      !state.hydrated ||
      !state.authReady ||
      showBrandIntro ||
      !state.user
    ) {
      return;
    }
    const inviteKey = `${pending.inviteToken ?? ''}:${pending.inviteGroupId ?? ''}`;
    if (!inviteKey || lastDispatchedInviteKeyRef.current === inviteKey) {
      pendingInviteRef.current = null;
      void clearPendingGroupInvite();
      return;
    }
    lastDispatchedInviteKeyRef.current = inviteKey;
    pendingInviteRef.current = null;
    void clearPendingGroupInvite();
    navigationRef.navigate('Dashboard', {
      screen: 'Groups',
      params: {
        ...(pending.inviteToken ? { inviteToken: pending.inviteToken } : {}),
        ...(pending.inviteGroupId ? { inviteGroupId: pending.inviteGroupId } : {}),
      },
    });
  }, [showBrandIntro, state.authReady, state.hydrated, state.user]);

  const openNotificationRoute = useCallback(() => {
    const flushed = flushPendingNotificationIntent(navigationRef, {
      authenticated: Boolean(state.user),
      hydrated: state.hydrated,
      authReady: state.authReady,
      blockingIntro: showBrandIntro,
      knownResultIds: new Set(state.results.map((r) => r.id)),
      knownPlanIds: new Set(state.plannerScheduleItems.map((p) => p.id)),
    });
    if (flushed) {
      void Notifications.clearLastNotificationResponseAsync().catch((error: unknown) => {
        console.error('Notification response could not be cleared:', error);
      });
      return;
    }
    if (
      pendingNotificationRoute.current !== 'Notifications' ||
      !navigationRef.isReady() ||
      !state.hydrated ||
      !state.authReady ||
      showBrandIntro ||
      !state.user
    ) return;
    pendingNotificationRoute.current = null;
    navigationRef.navigate('Dashboard', { screen: 'Notifications' });
    void Notifications.clearLastNotificationResponseAsync().catch((error: unknown) => {
      console.error('Notification response could not be cleared:', error);
    });
  }, [showBrandIntro, state.authReady, state.hydrated, state.plannerScheduleItems, state.results, state.user]);

  const handleBackToFocus = useCallback(() => {
    if (!navigationRef.isReady() || !state.user) return;
    navigationRef.navigate('Dashboard', { screen: 'FocusCenter' });
  }, [state.user]);

  const navTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: colors.bg,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.blue,
    },
  };

  useEffect(() => {
    if (!state.user?.id || Platform.OS === 'web') return;
    void ensureAndroidNotificationChannels();
    void registerDevicePushToken(state.user.id);
  }, [state.user?.id]);

  useEffect(() => {
    void syncUpcomingPlannerReminder(state.settings.notifications, state.plannerScheduleItems).catch((error: unknown) => {
      console.error('Planner notification reminder could not be synchronized:', error);
    });
  }, [state.plannerScheduleItems, state.settings.notifications]);

  useEffect(() => {
    openNotificationRoute();
  }, [openNotificationRoute]);

  useEffect(() => {
    openPendingInviteRoute();
  }, [openPendingInviteRoute]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !state.user) return undefined;
    const openAlarmIfRinging = () => {
      if (!navigationRef.isReady()) return;
      if (navigationRef.getCurrentRoute()?.name === 'Alarm') return;
      navigationRef.navigate('Dashboard', { screen: 'Alarm' });
    };
    const unsubscribe = subscribeToNativeAlarm(() => {
      openAlarmIfRinging();
    });
    void peekPendingNativeAlarm().then((pending) => {
      if (pending?.alarmId) openAlarmIfRinging();
    });
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      void peekPendingNativeAlarm().then((pending) => {
        if (pending?.alarmId) openAlarmIfRinging();
      });
    });
    return () => {
      unsubscribe();
      appStateSub.remove();
    };
  }, [state.user]);

  useEffect(() => {
    let active = true;
    const captureInviteUrl = (url: string | null | undefined) => {
      const parsed = extractGroupInviteFromUrl(url);
      if (!parsed) return;
      const inviteKey = `${parsed.inviteToken ?? ''}:${parsed.inviteGroupId ?? ''}`;
      if (lastDispatchedInviteKeyRef.current === inviteKey) return;
      pendingInviteRef.current = parsed;
      void savePendingGroupInvite(parsed);
      openPendingInviteRoute();
    };

    void getPendingGroupInvite().then((stored) => {
      if (!active || !stored) return;
      if (!pendingInviteRef.current) {
        pendingInviteRef.current = {
          ...(stored.inviteToken ? { inviteToken: stored.inviteToken } : {}),
          ...(stored.inviteGroupId ? { inviteGroupId: stored.inviteGroupId } : {}),
        };
      }
      openPendingInviteRoute();
    });

    void Linking.getInitialURL().then((initialUrl) => {
      if (active && initialUrl) captureInviteUrl(initialUrl);
    }).catch((error: unknown) => {
      console.error('Initial deep link URL could not be read:', error);
    });

    const urlSub = Linking.addEventListener('url', ({ url }) => {
      if (active) captureInviteUrl(url);
    });

    return () => {
      active = false;
      urlSub.remove();
    };
  }, [openPendingInviteRoute]);

  useEffect(() => {
    let active = true;
    const persistCaptured = (notif: ReturnType<typeof notificationFromExpoNotification>) => {
      if (!notif) return;
      dispatch({ type: 'notify', notif, fromSystem: true });
    };
    const handleReceived = (notification: unknown) => {
      persistCaptured(notificationFromExpoNotification(notification));
    };
    const handleResponse = (response: unknown) => {
      const captured = notificationFromExpoResponse(response);
      if (captured) {
        persistCaptured({ ...captured, read: true });
        setPendingNotificationIntent(captured);
      } else if (getNotificationNavigationRoute(response) === 'Notifications') {
        pendingNotificationRoute.current = 'Notifications';
      } else {
        return;
      }
      openNotificationRoute();
    };
    const receivedSub = Notifications.addNotificationReceivedListener(handleReceived);
    const responseSub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (active && response) handleResponse(response);
    }).catch((error: unknown) => {
      if (active) console.error('Initial notification response could not be read:', error);
    });
    void capturePresentedNotifications(persistCaptured);
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void capturePresentedNotifications(persistCaptured);
      }
    });
    return () => {
      active = false;
      receivedSub.remove();
      responseSub.remove();
      appStateSub.remove();
    };
  }, [dispatch, openNotificationRoute]);

  if (!state.hydrated) return <Splash />;
  if (!state.authReady) return <Splash />;
  if (showBrandIntro) return <BrandIntro onFinished={finishBrandIntro} />;

  return (
    <View style={{ flex: 1 }}>
      {state.user && (authStatus === 'network_unavailable' || authStatus === 'profile_fetch_failed') ? (
        <View style={{ minHeight: 30, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: scheme === 'dark' ? '#3A2E12' : '#FFF4D6' }}>
          <Text style={{ color: scheme === 'dark' ? '#FCD34D' : '#7C4A03', fontSize: 12, textAlign: 'center' }}>
            {authStatus === 'network_unavailable' ? 'You are offline. Your account is safe; reconnecting will resume sync.' : 'Some account details are temporarily unavailable. Your session remains active.'}
          </Text>
        </View>
      ) : null}
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          syncCurrentRoute();
          openNotificationRoute();
          openPendingInviteRoute();
        }}
        onStateChange={syncCurrentRoute}
        theme={navTheme}
        linking={linking}
        fallback={<Splash />}
      >
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <NavigationBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: Platform.OS === 'web' || reduceMotion ? 'none' : 'default',
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          {state.user ? (
            <>
              <Stack.Screen name="Dashboard" component={AuthenticatedStackNavigator} />
            </>
          ) : (
            <>
              <Stack.Screen name="SignIn" component={SignInScreen} />
              <Stack.Screen name="SignUp" component={SignUpScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <ActiveSessionBar
        visible={Boolean(state.user)}
        currentRouteName={activeRouteName}
        onPressBackToFocus={handleBackToFocus}
      />
    </View>
  );
}

function Themed() {
  const { state } = useStore();
  const handleBackgroundCompletion = useCallback((payload: FocusCompletionPayload) => {
    if (!navigationRef.isReady() || !state.user) return;
    navigationRef.navigate('Dashboard', {
      screen: 'FocusCompletion',
      params: payload,
    });
  }, [state.user]);

  return (
    <ThemeProvider
      mode={state.settings.themeMode}
      textScale={state.settings.textScale}
      accentColor={state.settings.accentColor}
      customAccentHex={state.settings.customAccentHex}
      highContrast={state.settings.highContrast}
      reduceMotion={state.settings.reduceMotion}
      animationIntensity={state.settings.animationIntensity}
      displayScaling={state.settings.displayScaling}
      layoutDensity={state.settings.layoutDensity}
      backgroundId={state.settings.backgroundId}
      backgroundOpacity={state.settings.backgroundOpacity}
      overlayIntensity={state.settings.overlayIntensity}
    >
      <SSDSThemeProvider>
        <FocusSessionProvider onNavigateCompletion={handleBackgroundCompletion}>
          <Navigation />
        </FocusSessionProvider>
      </SSDSThemeProvider>
    </ThemeProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const id = 'sakha-google-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@600;700;800&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap';
    document.head.appendChild(link);
    document.title = 'Study Sakha — Competitive Exam Preparation';
  }, []);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
          <Themed />
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
