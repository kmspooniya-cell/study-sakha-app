import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../components/Logo';
import { useLayout } from '../components/Shell';
import { Button, Card, Field, Txt } from '../components/ui';
import type { AuthNavigation } from '../lib/navigation';
import { validateSignInCredentials } from '../lib/authValidation';
import { useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';

const HIGHLIGHTS = [
  {
    icon: 'library-outline',
    title: '12,000+ curated resources',
    body: 'Notes, books and PYQ sets mapped to every micro-topic.',
    tint: '#38BDF8',
    bg: 'rgba(56, 189, 248, 0.14)',
  },
  {
    icon: 'sparkles-outline',
    title: 'Sakha AI study partner',
    body: 'Grounded answers from your own library, mocks and notes.',
    tint: '#C084FC',
    bg: 'rgba(192, 132, 252, 0.14)',
  },
  {
    icon: 'analytics-outline',
    title: 'Percentile-grade analytics',
    body: 'Subject-wise gaps, accuracy curves and recovery plans.',
    tint: '#4ADE80',
    bg: 'rgba(74, 222, 128, 0.14)',
  },
];

export default function SignInScreen() {
  const { colors } = useTheme();
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
    <Card
      style={{
        width: '100%',
        maxWidth: 420,
        alignSelf: 'center',
        padding: isMobile ? 24 : 36,
        borderRadius: 20,
        gap: 18,
      }}
    >
      {isMobile ? (
        <View style={{ alignItems: 'center', marginBottom: 4 }}>
          <Logo size={38} />
        </View>
      ) : null}

      <View>
        <Txt size={26} weight="800" display style={{ letterSpacing: -0.6 }}>
          Welcome back
        </Txt>
        <Txt size={13.5} color={colors.textMuted} style={{ marginTop: 6 }}>
          Sign in to continue your preparation streak.
        </Txt>
      </View>

      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.in"
        keyboardType="email-address"
        icon="mail-outline"
        returnKeyType="next"
      />

      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        secure
        icon="lock-closed-outline"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      {error ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: `${colors.danger}15`,
            padding: 11,
            borderRadius: radii.md,
          }}
        >
          <Ionicons name="alert-circle" size={17} color={colors.danger} />
          <Txt size={12.5} weight="600" color={colors.danger} style={{ flex: 1 }}>
            {error}
          </Txt>
        </View>
      ) : null}

      <View style={{ marginTop: 2 }}>
        <Button
          label="Sign in"
          icon="log-in-outline"
          full
          loading={busy}
          onPress={submit}
          size="lg"
        />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <Txt size={11} color={colors.textFaint} weight="700" style={{ letterSpacing: 0.6 }}>
          SECURE ACCOUNT ACCESS
        </Txt>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Txt size={13} color={colors.textMuted}>
          New to Study Sakha?
        </Txt>
        <Pressable onPress={() => nav.navigate('SignUp')}>
          <Txt size={13} weight="800" color={colors.blue}>
            Create an account
          </Txt>
        </Pressable>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
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
              {/* Subtle Purple Glow Orb matching Dashboard Hero Card */}
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

              {/* Top Brand Logo (Wrapped in soft pill so dark text in Logo stays visible) */}
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

              {/* Center Highlights */}
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
                    <Txt size={10.5} weight="800" color="#FDA4AF" style={{ letterSpacing: 0.8 }}>
                      TODAY&apos;S MISSION
                    </Txt>
                  </View>

                  <Txt
                    size={34}
                    weight="800"
                    display
                    color="#FFFFFF"
                    style={{ letterSpacing: -0.8, lineHeight: 42 }}
                  >
                    Preparation that adapts to you, every single day.
                  </Txt>
                </View>

                <View style={{ gap: 18 }}>
                  {HIGHLIGHTS.map((h) => (
                    <View
                      key={h.title}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
                    >
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
                        <Ionicons name={h.icon as any} size={20} color={h.tint} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Txt size={15} weight="800" color="#FFFFFF">
                          {h.title}
                        </Txt>
                        <Txt size={13} color="rgba(255, 255, 255, 0.72)">
                          {h.body}
                        </Txt>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Footer Text */}
              <Txt size={12} color="rgba(255, 255, 255, 0.5)">
                Trusted by aspirants preparing for UPSC, SSC, Banking, NEET and JEE.
              </Txt>
            </LinearGradient>
          ) : null}

          {/* Right Form Container */}
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
