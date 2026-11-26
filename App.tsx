import Ionicons from '@expo/vector-icons/Ionicons';
import { createDrawerNavigator, DrawerContentScrollView, getDrawerStatusFromState } from '@react-navigation/drawer';
import { createNavigationContainerRef, DarkTheme, DefaultTheme, NavigationContainer, StackActions } from '@react-navigation/native';
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
import { ActivityIndicator, Alert, Animated, AppState, Easing, Image, Platform, Share, View, Pressable } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FloatingFocusBar } from './components/FloatingFocusBar';
import { Logo } from './components/Logo';
import { Txt } from './components/ui';
import { FocusSessionProvider } from './lib/focusSession';
import type { FocusCompletionPayload } from './lib/focusSession';
import { getDisplayName, StoreProvider, useStore } from './lib/store';
import { ThemeProvider, useTheme } from './lib/theme';
import type {
  AppDrawerContentProps,
  AppLinkingOptions,
  AppStackNavigationTarget,
  AppStackParamList,
  DrawerParamList,
  RootStackParamList,
} from './lib/navigation';
import { getNotificationNavigationRoute } from './lib/navigation';
import { translateLabel } from './lib/i18n';
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
import TestPlayerScreen from './screens/TestPlayerScreen';
import TestResultScreen from './screens/TestResultScreen';
import TestsScreen from './screens/TestsScreen';
import * as Notifications from 'expo-notifications';
import {
  capturePresentedNotifications,
  notificationFromExpoNotification,
  notificationFromExpoResponse,
  syncUpcomingPlannerReminder,
} from './lib/notifications';
import { getAppShareUrl, getDistributionLinkMessage } from './lib/shareLinks';

const Stack = createNativeStackNavigator<RootStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();
const MASCOT_SPLASH = require('./assets/mascot/study-sakha-mascot.png');
const navigationRef = createNavigationContainerRef<RootStackParamList>();

const DRAWER_ITEMS = [
  { label: 'Offline downloads', icon: 'cloud-download-outline', target: { screen: 'LibraryDownloads' } },
  { label: 'How to use the app', icon: 'help-circle-outline', target: { screen: 'AppGuide' } },
  { label: 'Settings', icon: 'settings-outline', target: { screen: 'Settings' } },
] as const satisfies readonly {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  target: AppStackNavigationTarget;
}[];

const linking: AppLinkingOptions = {
  prefixes: ['studysakha://'],
  config: {
    screens: {
      SignIn: 'sign-in',
      SignUp: 'sign-up',
      Dashboard: {
        path: '',
        screens: {
          MainStack: {
            path: '',
            screens: {
              DashboardRoot: '',
              Library: 'library',
              Groups: 'groups/invite/:inviteGroupId',
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
              Statistics: 'statistics',
              TaskPerformance: 'statistics/tasks',
              StudyPlanner: 'study-planner',
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
// 1. CUSTOM LEFT DRAWER COMPONENT
// ----------------------------------------------------
export function executeDrawerTargetNavigation(
  navigation: AppDrawerContentProps['navigation'],
  drawerState: AppDrawerContentProps['state'],
  target: AppStackNavigationTarget
) {
  if (!target.screen) return;
  const mainStackState = drawerState?.routes?.[drawerState?.index ?? 0]?.state;
  const currentRoute = mainStackState?.routes?.[mainStackState?.index ?? 0]?.name;
  if (currentRoute === target.screen) return;
  const targetScreen = target.screen;
  const targetExistsInStack = Boolean(
    mainStackState?.key &&
    Array.isArray(mainStackState.routes) &&
    mainStackState.routes.some((route) => route.name === targetScreen)
  );
  if (targetExistsInStack && mainStackState?.key) {
    navigation.dispatch({
      ...StackActions.popTo(targetScreen, target.params),
      target: mainStackState.key,
    });
    return;
  }
  navigation.navigate('MainStack', target);
}

export function CustomDrawerContent(
  props: AppDrawerContentProps & {
    onPendingTargetChange?: (target: AppStackNavigationTarget | null) => void;
    onSyncDrawerContext?: (
      navigation: AppDrawerContentProps['navigation'],
      state: AppDrawerContentProps['state']
    ) => void;
  }
) {
  const { state } = useStore();
  const { colors, scheme } = useTheme();
  const first = getDisplayName(state.user).split(/\s+/)[0];
  const mainStackState = props.state?.routes?.[props.state?.index ?? 0]?.state;
  const currentRoute = mainStackState?.routes?.[mainStackState?.index ?? 0]?.name;
  const drawerStatus = getDrawerStatusFromState(props.state);
  const { onPendingTargetChange, onSyncDrawerContext } = props;

  useEffect(() => {
    onSyncDrawerContext?.(props.navigation, props.state);
  }, [onSyncDrawerContext, props.navigation, props.state]);

  useEffect(() => {
    if (drawerStatus === 'open') {
      onPendingTargetChange?.(null);
    }
  }, [drawerStatus, onPendingTargetChange]);

  const navigateToMainStack = useCallback((target: AppStackNavigationTarget) => {
    if (!target.screen || currentRoute === target.screen) {
      onPendingTargetChange?.(null);
      props.navigation.closeDrawer();
      return;
    }
    if (Platform.OS === 'web' || drawerStatus === 'closed') {
      onPendingTargetChange?.(null);
      props.navigation.closeDrawer();
      executeDrawerTargetNavigation(props.navigation, props.state, target);
      return;
    }
    // Wait for the drawer's actual Reanimated close transitionEnd event rather
    // than InteractionManager (which is a stub in RN 0.86+) so native stack
    // transitions never overlap the closing drawer surface on Android.
    onPendingTargetChange?.(target);
    props.navigation.closeDrawer();
  }, [currentRoute, drawerStatus, onPendingTargetChange, props.navigation, props.state]);

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.bg }}>
      <DrawerContentScrollView {...props} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 0 }}>
        {/* Profile Header (Top) */}
        <LinearGradient 
          colors={scheme === 'dark' ? [colors.navy, colors.bg] : [colors.rose, colors.navy]}
          style={{ padding: 20, paddingTop: 56, paddingBottom: 28, flexDirection: 'row', alignItems: 'center' }}
        >
          <Pressable
            onPress={() => navigateToMainStack({ screen: 'Profile' })}
            accessibilityRole="button"
            accessibilityLabel="View profile"
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', opacity: pressed ? 0.82 : 1 })}
          >
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', marginRight: 15 }}>
              <Txt size={20} weight="700" color={colors.brandPrimary}>{first.charAt(0)}</Txt>
            </View>
            <View>
              <Txt size={18} weight="700" color="#FFF">{getDisplayName(state.user)}</Txt>
              <Txt size={13} color="rgba(255,255,255,0.78)" style={{ marginTop: 2 }}>{translateLabel('View Profile', state.settings.language)}</Txt>
            </View>
          </Pressable>
        </LinearGradient>

        {/* 4 Menu Options */}
        <View collapsable={false} style={{ padding: 16, gap: 6 }}>
          {DRAWER_ITEMS.map((item) => (
            <View key={item.label} collapsable={false}>
              <Pressable
                onPress={() => navigateToMainStack(item.target)}
                accessibilityRole="button"
                accessibilityState={{ selected: currentRoute === item.target.screen }}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: currentRoute === item.target.screen ? colors.selectedSurface : pressed ? colors.surfaceInteractive : 'transparent', opacity: pressed ? 0.78 : 1 })}
              >
                <Ionicons name={item.icon} size={22} color={currentRoute === item.target.screen ? colors.brandPrimary : colors.text} />
                <Txt size={15} weight={currentRoute === item.target.screen ? '800' : '600'} color={currentRoute === item.target.screen ? colors.brandPrimary : colors.text} style={{ marginLeft: 15 }}>{translateLabel(item.label, state.settings.language)}</Txt>
              </Pressable>
            </View>
          ))}
        </View>
      </DrawerContentScrollView>

      {/* Share Bottom Bar */}
      <Pressable
        onPress={async () => {
          try {
            const url = getAppShareUrl();
            if (!url) {
              Alert.alert('Study Sakha is not published yet', 'Set EXPO_PUBLIC_APP_DISTRIBUTION_URL to the official APK or Play Store URL before sharing a production installation link.');
              return;
            }
            await Share.share(
              {
                title: 'Study Sakha',
                message: `I'm using Study Sakha to prepare for competitive exams. ${getDistributionLinkMessage()}\n${url}`,
                url,
              },
              { dialogTitle: 'Share Study Sakha' }
            );
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') return;
            Alert.alert(
              'Unable to share',
              error instanceof Error ? error.message : 'Sharing is not supported on this device.'
            );
          }
        }}
        accessibilityRole="button"
        accessibilityLabel="Share Study Sakha with friends"
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', minHeight: 64, padding: 20, borderTopWidth: 1, borderTopColor: colors.borderSubtle, backgroundColor: colors.surfaceRaised, opacity: pressed ? 0.7 : 1 })}
      >
        <Ionicons name="share-social-outline" size={22} color={colors.brandPrimary} />
        <Txt size={15} weight="700" color={colors.brandPrimary} style={{ marginLeft: 15 }}>{translateLabel('Share with friends', state.settings.language)}</Txt>
      </Pressable>
    </View>
  );
}

// ----------------------------------------------------
// 2. AUTHENTICATED APP NAVIGATORS
// ----------------------------------------------------
function AuthenticatedStackNavigator() {
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
      <AppStack.Screen name="Statistics" component={StatisticsScreen} />
      <AppStack.Screen name="TaskPerformance" component={TaskPerformanceScreen} />
      <AppStack.Screen name="StudyPlanner" component={StudyPlannerScreen} />
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

export function MainDrawerNavigator() {
  const pendingTargetRef = useRef<AppStackNavigationTarget | null>(null);
  const latestNavigationRef = useRef<AppDrawerContentProps['navigation'] | null>(null);
  const latestStateRef = useRef<AppDrawerContentProps['state'] | null>(null);

  const handlePendingTargetChange = useCallback((target: AppStackNavigationTarget | null) => {
    pendingTargetRef.current = target;
  }, []);

  const handleSyncDrawerContext = useCallback((
    navigation: AppDrawerContentProps['navigation'],
    drawerState: AppDrawerContentProps['state']
  ) => {
    latestNavigationRef.current = navigation;
    latestStateRef.current = drawerState;
  }, []);

  const renderDrawerContent = useCallback(
    (props: AppDrawerContentProps) => (
      <CustomDrawerContent
        {...props}
        onPendingTargetChange={handlePendingTargetChange}
        onSyncDrawerContext={handleSyncDrawerContext}
      />
    ),
    [handlePendingTargetChange, handleSyncDrawerContext]
  );

  return (
    <Drawer.Navigator 
      drawerContent={renderDrawerContent}
      screenListeners={{
        transitionStart: (e) => {
          if (!e.data.closing) {
            pendingTargetRef.current = null;
          }
        },
        transitionEnd: (e) => {
          if (!e.data.closing) return;
          const nextTarget = pendingTargetRef.current;
          if (!nextTarget) return;
          pendingTargetRef.current = null;
          const nav = latestNavigationRef.current;
          const drawerState = latestStateRef.current;
          if (nav && drawerState) {
            executeDrawerTargetNavigation(nav, drawerState, nextTarget);
          }
        },
      }}
      screenOptions={{ headerShown: false, drawerStyle: { width: 290 } }}
    >
      <Drawer.Screen name="MainStack" component={AuthenticatedStackNavigator} />
    </Drawer.Navigator>
  );
}

// ----------------------------------------------------
// 3. ROOT STACK NAVIGATOR
// ----------------------------------------------------
function Navigation() {
  const { state, dispatch } = useStore();
  const { colors, scheme, reduceMotion } = useTheme();
  const [showBrandIntro, setShowBrandIntro] = useState(true);
  const [activeRouteName, setActiveRouteName] = useState<string | undefined>(undefined);
  const pendingNotificationRoute = useRef<'Notifications' | null>(null);
  const finishBrandIntro = useCallback(() => setShowBrandIntro(false), []);

  const syncCurrentRoute = useCallback(() => {
    if (!navigationRef.isReady()) return;
    setActiveRouteName(navigationRef.getCurrentRoute()?.name);
  }, []);

  const openNotificationRoute = useCallback(() => {
    syncCurrentRoute();
    if (
      pendingNotificationRoute.current !== 'Notifications' ||
      !navigationRef.isReady() ||
      !state.hydrated ||
      !state.authReady ||
      showBrandIntro ||
      !state.user
    ) return;
    pendingNotificationRoute.current = null;
    navigationRef.navigate('Dashboard', { screen: 'MainStack', params: { screen: 'Notifications' } });
    void Notifications.clearLastNotificationResponseAsync().catch((error: unknown) => {
      console.error('Notification response could not be cleared:', error);
    });
  }, [showBrandIntro, state.authReady, state.hydrated, state.user, syncCurrentRoute]);

  const handleBackToFocus = useCallback(() => {
    if (!navigationRef.isReady() || !state.user) return;
    navigationRef.navigate('Dashboard', { screen: 'MainStack', params: { screen: 'FocusCenter' } });
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
    void syncUpcomingPlannerReminder(state.settings.notifications, state.plannerScheduleItems).catch((error: unknown) => {
      console.error('Planner notification reminder could not be synchronized:', error);
    });
  }, [state.plannerScheduleItems, state.settings.notifications]);

  useEffect(() => {
    openNotificationRoute();
  }, [openNotificationRoute]);

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
      if (captured) persistCaptured(captured);
      if (getNotificationNavigationRoute(response) !== 'Notifications' && !captured) return;
      pendingNotificationRoute.current = 'Notifications';
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

  const showFloatingFocusBar = Boolean(state.user) &&
    activeRouteName !== 'FocusCenter' &&
    activeRouteName !== 'FocusCompletion';

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer
        ref={navigationRef}
        onReady={openNotificationRoute}
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
              <Stack.Screen name="Dashboard" component={MainDrawerNavigator} />
            </>
          ) : (
            <>
              <Stack.Screen name="SignIn" component={SignInScreen} />
              <Stack.Screen name="SignUp" component={SignUpScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <FloatingFocusBar visible={showFloatingFocusBar} onPressBackToFocus={handleBackToFocus} />
    </View>
  );
}

function Themed() {
  const { state } = useStore();
  const handleBackgroundCompletion = useCallback((payload: FocusCompletionPayload) => {
    if (!navigationRef.isReady() || !state.user) return;
    navigationRef.navigate('Dashboard', {
      screen: 'MainStack',
      params: { screen: 'FocusCompletion', params: payload },
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
      <FocusSessionProvider onNavigateCompletion={handleBackgroundCompletion}>
        <Navigation />
      </FocusSessionProvider>
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
