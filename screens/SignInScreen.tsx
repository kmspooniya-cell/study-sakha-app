import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AlertCircle,
  BarChart2,
  BookOpen,
  Lock,
  LogIn,
  Mail,
  Sparkles,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../components/Logo';
import { useLayout } from '../components/Shell';
import {
  SSDSButton,
  SSDSDivider,
  SSDSIcon,
  SSDSRow,
  SSDSStack,
  SSDSSurface,
  SSDSText,
  SSDSTextInput,
  useSSDSTheme,
} from '../lib/ssds';
import type { AuthNavigation } from '../lib/navigation';
import { validateSignInCredentials } from '../lib/authValidation';
import { useStore } from '../lib/store';

const HIGHLIGHTS = [
  {
    icon: BookOpen,
    title: '12,000+ curated resources',
    body: 'Notes, books and PYQ sets mapped to every micro-topic.',
    tint: '#38BDF8',
    bg: 'rgba(56, 189, 248, 0.14)',
  },
  {
    icon: Sparkles,
    title: 'Sakha AI study partner',
    body: 'Grounded answers from your own library, mocks and notes.',
    tint: '#C084FC',
    bg: 'rgba(192, 132, 252, 0.14)',
  },
  {
    icon: BarChart2,
    title: 'Percentile-grade analytics',
    body: 'Subject-wise gaps, accuracy curves and recovery plans.',
    tint: '#4ADE80',
    bg: 'rgba(74, 222, 128, 0.14)',
  },
];

export default function SignInScreen() {
  const { tokens } = useSSDSTheme();
  const nav = useNavigation<AuthNavigation>();
  const { signIn } = useStore();
  const { isMobile } = useLayout();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    const validationError = validateSignInCredentials(email, password);
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    try {
      const res = await signIn(email.trim(), password);
      if (!res.ok) setError(res.error ?? 'Unable to sign in.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  };

  const form = (
    <SSDSSurface
      variant="elevated"
      radius="xl"
      padding={isMobile ? 24 : 36}
      style={{
        width: '100%',
        maxWidth: 420,
        alignSelf: 'center',
      }}
    >
      <SSDSStack gap={18}>
        {isMobile ? (
          <View style={{ alignItems: 'center', marginBottom: 4 }}>
            <Logo size={38} />
          </View>
        ) : null}

        <View>
          <SSDSText variant="ScreenTitle" style={{ fontSize: 26, lineHeight: 32 }}>
            Welcome back
          </SSDSText>
          <SSDSText variant="BodySecondary" style={{ marginTop: 6 }}>
            Sign in to continue your preparation streak.
          </SSDSText>
        </View>

        <SSDSTextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.in"
          type="email"
          leadingIcon={Mail}
          returnKeyType="next"
          disabled={busy}
        />

        <SSDSTextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          type="password"
          leadingIcon={Lock}
          returnKeyType="go"
          onSubmitEditing={submit}
          disabled={busy}
        />

        {error ? (
          <SSDSRow
            gap={8}
            accessibilityRole="alert"
            style={{
              backgroundColor: tokens.colors.dangerBackground,
              padding: 11,
              borderRadius: tokens.radius.md,
            }}
          >
            <SSDSIcon icon={AlertCircle} size={17} color="danger" />
            <SSDSText variant="ErrorText" style={{ flex: 1 }}>
              {error}
            </SSDSText>
          </SSDSRow>
        ) : null}

        <View style={{ marginTop: 2 }}>
          <SSDSButton
            variant="primary"
            size="large"
            fullWidth
            leadingIcon={LogIn}
            loading={busy}
            disabled={busy}
            onPress={submit}
          >
            Sign in
          </SSDSButton>
        </View>

        <SSDSRow gap={10} style={{ marginTop: 2 }}>
          <SSDSDivider style={{ flex: 1 }} />
          <SSDSText variant="Overline" color="textTertiary">
            SECURE ACCOUNT ACCESS
          </SSDSText>
          <SSDSDivider style={{ flex: 1 }} />
        </SSDSRow>

        <SSDSRow justify="center" gap={6}>
          <SSDSText variant="BodySecondary">New to Study Sakha?</SSDSText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create an account"
            onPress={() => nav.navigate('SignUp')}
          >
            <SSDSText variant="ButtonLabel" color="primary">
              Create an account
            </SSDSText>
          </Pressable>
        </SSDSRow>
      </SSDSStack>
    </SSDSSurface>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: tokens.colors.background }}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {!isMobile ? (
            <LinearGradient
              colors={['#151525', '#1E1B36']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flex: 1,
                padding: 48,
                justifyContent: 'space-between',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: -80,
                  right: -80,
                  width: 280,
                  height: 280,
                  borderRadius: 140,
                  backgroundColor: 'rgba(139, 92, 246, 0.16)',
                }}
              />

              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 12,
                }}
              >
                <Logo size={32} />
              </View>

              <View style={{ gap: 24, maxWidth: 440 }}>
                <View style={{ gap: 10 }}>
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      backgroundColor: 'rgba(225, 29, 72, 0.22)',
                      borderWidth: 1,
                      borderColor: 'rgba(244, 63, 94, 0.35)',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 6,
                    }}
                  >
                    <SSDSText variant="Overline" color="#FDA4AF">
                      TODAY&apos;S MISSION
                    </SSDSText>
                  </View>

                  <SSDSText
                    variant="DisplayTitle"
                    color="#FFFFFF"
                    style={{ fontSize: 34, lineHeight: 42 }}
                  >
                    Preparation that adapts to you, every single day.
                  </SSDSText>
                </View>

                <View style={{ gap: 18 }}>
                  {HIGHLIGHTS.map((h) => (
                    <SSDSRow key={h.title} gap={14}>
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          backgroundColor: h.bg,
                          borderWidth: 1,
                          borderColor: 'rgba(255, 255, 255, 0.08)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <SSDSIcon icon={h.icon} size={20} color={h.tint} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <SSDSText variant="CardTitle" color="#FFFFFF">
                          {h.title}
                        </SSDSText>
                        <SSDSText variant="BodySecondary" color="rgba(255, 255, 255, 0.72)">
                          {h.body}
                        </SSDSText>
                      </View>
                    </SSDSRow>
                  ))}
                </View>
              </View>

              <SSDSText variant="Caption" color="rgba(255, 255, 255, 0.5)">
                Trusted by aspirants preparing for UPSC, SSC, Banking, NEET and JEE.
              </SSDSText>
            </LinearGradient>
          ) : null}

          <View style={{ flex: 1, justifyContent: 'center' }}>
            <ScrollView
              contentContainerStyle={{
                padding: isMobile ? 20 : 48,
                flexGrow: 1,
                justifyContent: 'center',
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {form}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
