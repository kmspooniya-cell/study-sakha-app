import Ionicons from '@expo/vector-icons/Ionicons';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, Platform, Share, View, Text, Pressable } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Logo } from './components/Logo';
import { StoreProvider, useStore } from './lib/store';
import { ThemeProvider, useTheme } from './lib/theme';
import {
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
import LibraryScreen from './screens/LibraryScreen';
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
import StudentTestimonialsScreen from './screens/StudentTestimonialsScreen';
import TestPlayerScreen from './screens/TestPlayerScreen';
import TestResultScreen from './screens/TestResultScreen';
import TestsScreen from './screens/TestsScreen';

const Stack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const linking = {
  prefixes: [],
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
              Profile: 'profile',
              Settings: 'settings',
              AppGuide: 'app-guide',
              StudentTestimonials: 'student-testimonials',
              Admin: 'admin',
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
      <Logo size={44} />
      <ActivityIndicator color={colors.blue} />
    </View>
  );
}

// ----------------------------------------------------
// 1. CUSTOM LEFT DRAWER COMPONENT
// ----------------------------------------------------
function CustomDrawerContent(props: any) {
  const { state } = useStore();
  const { colors, scheme } = useTheme();
  const first = (state.user?.name ?? 'Aspirant').trim().split(/\s+/)[0] || 'Aspirant';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
        {/* Profile Header (Top) */}
        <LinearGradient 
          colors={scheme === 'dark' ? ['#2A1519', '#1F1013'] : ['#E11D48', '#BE123C']} 
          style={{ padding: 20, paddingTop: 60, paddingBottom: 30, flexDirection: 'row', alignItems: 'center' }}
        >
          <Pressable
            onPress={() => {
              props.navigation.closeDrawer();
              props.navigation.navigate('MainStack', { screen: 'Profile' });
            }}
            accessibilityRole="button"
            accessibilityLabel="View profile"
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', marginRight: 15 }}>
              <Text style={{ color: '#E11D48', fontSize: 20, fontWeight: 'bold' }}>{first.charAt(0)}</Text>
            </View>
            <View>
              <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>{state.user?.name || 'Aspirant'}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 }}>View Profile</Text>
            </View>
          </Pressable>
        </LinearGradient>

        {/* 4 Menu Options */}
        <View style={{ padding: 15, gap: 5 }}>
          {[
            { label: 'Offline downloads', icon: 'cloud-download-outline', route: 'LibraryDownloads' },
            { label: 'How to use the app', icon: 'help-circle-outline', route: 'AppGuide' },
            { label: 'Privacy policy', icon: 'shield-checkmark-outline', route: 'Settings' },
          ].map((item) => (
            <Pressable
              key={item.label}
              onPress={() => {
                props.navigation.closeDrawer();
                props.navigation.navigate('MainStack', { screen: item.route });
              }}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10, borderRadius: 8, opacity: pressed ? 0.7 : 1 })}
            >
              <Ionicons name={item.icon as any} size={22} color={colors.text} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginLeft: 15 }}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </DrawerContentScrollView>

      {/* Share Bottom Bar */}
      <Pressable
        onPress={async () => {
          try {
            await Share.share(
              { message: "I'm using Study Sakha to prepare for competitive exams. Check out the app!" },
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
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', padding: 20, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 })}
      >
        <Ionicons name="share-social-outline" size={24} color={colors.blue} />
        <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.blue, marginLeft: 15 }}>Share with friends</Text>
      </Pressable>
    </View>
  );
}

// ----------------------------------------------------
// 2. AUTHENTICATED APP NAVIGATORS
// ----------------------------------------------------
function AuthenticatedStackNavigator() {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === 'web' ? 'none' : 'slide_from_right',
      }}
    >
      <AppStack.Screen name="DashboardRoot" component={DashboardScreen} />
      <AppStack.Screen name="Library" component={LibraryScreen} />
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
      <AppStack.Screen name="Profile" component={ProfileScreen} />
      <AppStack.Screen name="Settings" component={SettingsScreen} />
      <AppStack.Screen name="AppGuide" component={AppGuideScreen} />
      <AppStack.Screen name="StudentTestimonials" component={StudentTestimonialsScreen} />
      <AppStack.Screen name="Admin" component={AdminScreen} />
    </AppStack.Navigator>
  );
}

function MainDrawerNavigator() {
  return (
    <Drawer.Navigator 
      drawerContent={(props) => <CustomDrawerContent {...props} />}
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
  const { state } = useStore();
  const { colors, scheme } = useTheme();

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

  if (!state.hydrated) return <Splash />;

  return (
    <NavigationContainer theme={navTheme} linking={linking as any} fallback={<Splash />}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: Platform.OS === 'web' ? 'none' : 'slide_from_right',
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
  );
}

function Themed() {
  const { state } = useStore();
  return (
    <ThemeProvider mode={state.settings.themeMode} textScale={state.settings.textScale}>
      <Navigation />
    </ThemeProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font });

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
