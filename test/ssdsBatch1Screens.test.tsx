import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockNavigate = jest.fn();
const mockSignIn = jest.fn(async () => ({ ok: true }));
const mockSignUp = jest.fn(async () => ({
  ok: true,
  needsEmailConfirmation: true,
}));
const mockStorage = new Map<string, string>();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return new Proxy(
    {},
    {
      get: (_target, prop) => (props: any) =>
        React.createElement(View, { ...props, accessibilityLabel: String(prop) }),
    },
  );
});

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    mockStorage.set(key, value);
  }),
  removeItem: jest.fn(async (key: string) => {
    mockStorage.delete(key);
  }),
  getAllKeys: jest.fn(async () => [...mockStorage.keys()]),
}));

jest.mock('../lib/supabase', () => ({
  STUDENT_CONTENT_BUCKET: 'Student-content',
  supabaseConfigured: false,
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    realtime: {
      setAuth: jest.fn(async () => undefined),
    },
  },
}));

jest.mock('../components/Logo', () => ({
  Logo: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, 'Study Sakha');
  },
}));

jest.mock('../components/Shell', () => ({
  useLayout: () => ({ isMobile: true, isDesktop: false, width: 390 }),
  Shell: ({ title, children }: any) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return React.createElement(View, null, React.createElement(Text, null, title), children);
  },
  MoreOptionsGrid: ({ onGo }: any) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    return React.createElement(
      Pressable,
      { onPress: () => onGo('Settings') },
      React.createElement(Text, null, 'Settings'),
    );
  },
}));

jest.mock('../lib/store', () => ({
  useStore: () => ({
    state: {
      hydrated: true,
      user: { id: 'u1', role: 'student' },
      settings: {
        themeMode: 'light',
        textScale: 1,
        accentColor: 'indigo',
        customAccentHex: null,
        highContrast: false,
        reduceMotion: false,
        animationIntensity: 'balanced',
        displayScaling: 100,
        layoutDensity: 'comfortable',
        backgroundId: 'none',
        backgroundOpacity: 100,
        overlayIntensity: 0,
      },
    },
    dispatch: jest.fn(),
    unread: 0,
    signIn: mockSignIn,
    signUp: mockSignUp,
  }),
}));

const { SafeAreaProvider } = require('react-native-safe-area-context') as typeof import('react-native-safe-area-context');
const { ThemeProvider: LegacyThemeProvider } = require('../lib/theme') as typeof import('../lib/theme');
const { SSDSThemeProvider } = require('../lib/ssds') as typeof import('../lib/ssds');
const SignInScreen = require('../screens/SignInScreen').default as typeof import('../screens/SignInScreen').default;
const SignUpScreen = require('../screens/SignUpScreen').default as typeof import('../screens/SignUpScreen').default;
const MoreScreen = require('../screens/MoreScreen').default as typeof import('../screens/MoreScreen').default;

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <LegacyThemeProvider mode="light">
        <SSDSThemeProvider>{children}</SSDSThemeProvider>
      </LegacyThemeProvider>
    </SafeAreaProvider>
  );
}

describe('Phase 6 Batch 1 Screen Migrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
  });

  it('SignInScreen validates empty credentials, toggles password visibility, and signs in', async () => {
    const screen = render(
      <Providers>
        <SignInScreen />
      </Providers>,
    );

    fireEvent.press(screen.getByText('Sign in'));
    expect(screen.getByText('Enter both your email and password.')).toBeTruthy();
    expect(mockSignIn).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByPlaceholderText('you@example.in'), 'user@example.in');
    fireEvent.changeText(screen.getByPlaceholderText('Your password'), 'secret123');

    const toggle = screen.getByLabelText('Show password');
    expect(screen.getByPlaceholderText('Your password').props.secureTextEntry).toBe(true);
    fireEvent.press(toggle);
    expect(screen.getByPlaceholderText('Your password').props.secureTextEntry).toBe(false);

    fireEvent.press(screen.getByText('Sign in'));
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('user@example.in', 'secret123');
    });

    fireEvent.press(screen.getByLabelText('Create an account'));
    expect(mockNavigate).toHaveBeenCalledWith('SignUp');
  });

  it('SignUpScreen preserves exam selection, account creation, and SignIn navigation', async () => {
    const screen = render(
      <Providers>
        <SignUpScreen />
      </Providers>,
    );

    fireEvent.changeText(screen.getByPlaceholderText('Ananya Deshmukh'), 'Ananya');
    fireEvent.changeText(screen.getByPlaceholderText('you@example.in'), 'ananya@example.in');
    fireEvent.changeText(screen.getByPlaceholderText('Minimum 6 characters'), 'password123');
    fireEvent.press(screen.getByLabelText('SSC'));
    fireEvent.press(screen.getByText('Create account'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        'Ananya',
        'ananya@example.in',
        'password123',
        'ssc',
      );
      expect(
        screen.getByText(
          'Account created. Check your email to confirm it before signing in.',
        ),
      ).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Sign in'));
    expect(mockNavigate).toHaveBeenCalledWith('SignIn');
  });

  it('MoreScreen preserves Settings navigation', () => {
    const screen = render(
      <Providers>
        <MoreScreen />
      </Providers>,
    );

    fireEvent.press(screen.getByText('Settings'));
    expect(mockNavigate).toHaveBeenCalledWith('Settings');
  });
});
