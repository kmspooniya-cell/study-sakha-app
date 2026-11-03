import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { AuthNavigation } from '../lib/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../components/Logo';
import { useLayout } from '../components/Shell';
import { Button, Card, Field, Txt } from '../components/ui';
import { useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';

const HIGHLIGHTS = [
  { icon: 'library-outline', title: '12,000+ curated resources', body: 'Notes, books and PYQ sets mapped to every micro-topic.' },
  { icon: 'sparkles-outline', title: 'Sakha AI study partner', body: 'Grounded answers from your own library, mocks and notes.' },
  { icon: 'analytics-outline', title: 'Percentile-grade analytics', body: 'Subject-wise gaps, accuracy curves and recovery plans.' },
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
    if (!email.trim() || !password) {
      setError('Enter both your email and password.');
      return;
    }
    setBusy(true);
    try {
      const res = await signIn(email, password);
      if (!res.ok) setError(res.error ?? 'Unable to sign in.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  };

  const form = (
    <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', gap: 16 }}>
      {isMobile ? (
        <View style={{ alignItems: 'center', marginBottom: 6 }}>
          <Logo size={40} />
        </View>
      ) : null}
      <View>
        <Txt size={26} weight="800" display style={{ letterSpacing: -0.6 }}>
          Welcome back
        </Txt>
        <Txt size={13.5} color={colors.textMuted} style={{ marginTop: 5 }}>
          Sign in to continue your preparation streak.
        </Txt>
      </View>

      <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.in" keyboardType="email-address" icon="mail-outline" returnKeyType="next" />
      <Field label="Password" value={password} onChangeText={setPassword} placeholder="Your password" secure icon="lock-closed-outline" returnKeyType="go" onSubmitEditing={submit} />

      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: `${colors.danger}15`, padding: 11, borderRadius: radii.md }}>
          <Ionicons name="alert-circle" size={17} color={colors.danger} />
          <Txt size={12.5} weight="600" color={colors.danger} style={{ flex: 1 }}>
            {error}
          </Txt>
        </View>
      ) : null}

      <Button label="Sign in" icon="log-in-outline" full loading={busy} onPress={submit} size="lg" />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <Txt size={11.5} color={colors.textFaint} weight="700">SECURE ACCOUNT ACCESS</Txt>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <Txt size={13} color={colors.textMuted}>
          New to Study Sakha?
        </Txt>
        <Pressable onPress={() => nav.navigate('SignUp')}>
          <Txt size={13} weight="800" color={colors.blue}>
            Create an account
          </Txt>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {!isMobile ? (
            <LinearGradient colors={[colors.navy, colors.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, padding: 48, justifyContent: 'space-between' }}>
              <Logo size={36} />
              <View style={{ gap: 22, maxWidth: 440 }}>
                <Txt size={34} weight="800" display color="#fff" style={{ letterSpacing: -1 }}>
                  Preparation that adapts to you, every single day.
                </Txt>
                {HIGHLIGHTS.map((h) => (
                  <View key={h.title} style={{ flexDirection: 'row', gap: 14 }}>
                    <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={h.icon as any} size={20} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt size={15} weight="800" color="#fff">
                        {h.title}
                      </Txt>
                      <Txt size={13} color="rgba(255,255,255,0.78)">
                        {h.body}
                      </Txt>
                    </View>
                  </View>
                ))}
              </View>
              <Txt size={12} color="rgba(255,255,255,0.6)">
                Trusted by aspirants preparing for UPSC, SSC, Banking, NEET and JEE.
              </Txt>
            </LinearGradient>
          ) : null}

          <View style={{ flex: 1, justifyContent: 'center' }}>
            <ScrollView contentContainerStyle={{ padding: isMobile ? 20 : 48, flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
              {isMobile ? <Card style={{ padding: 20 }}>{form}</Card> : form}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
