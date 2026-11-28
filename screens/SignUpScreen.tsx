import { useNavigation } from '@react-navigation/native';
import type { AuthNavigation } from '../lib/navigation';
import { AlertCircle, ArrowRight, Lock, Mail, User } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../components/Logo';
import { useLayout } from '../components/Shell';
import {
  SSDSButton,
  SSDSIcon,
  SSDSRow,
  SSDSStack,
  SSDSSurface,
  SSDSText,
  SSDSTextInput,
  useSSDSTheme,
} from '../lib/ssds';
import { EXAMS } from '../lib/data';
import { useStore } from '../lib/store';
import { ExamId } from '../lib/types';

export default function SignUpScreen() {
  const { tokens } = useSSDSTheme();
  const nav = useNavigation<AuthNavigation>();
  const { signUp } = useStore();
  const { isMobile } = useLayout();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [exam, setExam] = useState<ExamId>('upsc');
  const [goal, setGoal] = useState(180);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const res = await signUp(name, email, password, exam);
      if (!res.ok) setError(res.error ?? 'Unable to create the account.');
      else if (res.needsEmailConfirmation) {
        setMessage('Account created. Check your email to confirm it before signing in.');
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Unable to create the account.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: tokens.colors.background }}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            padding: isMobile ? 18 : 40,
            flexGrow: 1,
            justifyContent: 'center',
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center' }}>
            <View style={{ alignItems: isMobile ? 'center' : 'flex-start', marginBottom: 18 }}>
              <Logo size={38} />
            </View>
            <SSDSSurface variant="elevated" radius="lg" padding={isMobile ? 18 : 28}>
              <SSDSStack gap={16}>
                <View>
                  <SSDSText variant="ScreenTitle">Create your account</SSDSText>
                  <SSDSText variant="BodySecondary" style={{ marginTop: 4 }}>
                    Pick a target exam and Sakha will personalise your library, plan and tests.
                  </SSDSText>
                </View>

                <SSDSTextInput
                  label="Full name"
                  value={name}
                  onChangeText={setName}
                  placeholder="Ananya Deshmukh"
                  leadingIcon={User}
                  autoCapitalize="words"
                  disabled={busy}
                />
                <SSDSTextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.in"
                  type="email"
                  leadingIcon={Mail}
                  disabled={busy}
                />
                <SSDSTextInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Minimum 6 characters"
                  type="password"
                  leadingIcon={Lock}
                  onSubmitEditing={submit}
                  returnKeyType="go"
                  disabled={busy}
                />

                <View>
                  <SSDSText
                    variant="InputLabel"
                    color="textSecondary"
                    style={{ marginBottom: 9 }}
                  >
                    Target exam
                  </SSDSText>
                  <SSDSRow wrap="wrap" gap={8}>
                    {EXAMS.map((e) => (
                      <SSDSButton
                        key={e.id}
                        size="small"
                        variant={exam === e.id ? 'primary' : 'outline'}
                        accessibilityLabel={e.short}
                        onPress={() => setExam(e.id)}
                      >
                        {e.short}
                      </SSDSButton>
                    ))}
                  </SSDSRow>
                </View>

                <View>
                  <SSDSText
                    variant="InputLabel"
                    color="textSecondary"
                    style={{ marginBottom: 9 }}
                  >
                    Daily study goal
                  </SSDSText>
                  <SSDSRow wrap="wrap" gap={8}>
                    {[90, 120, 180, 240, 300].map((g) => (
                      <SSDSButton
                        key={g}
                        size="small"
                        variant={goal === g ? 'primary' : 'outline'}
                        onPress={() => setGoal(g)}
                      >
                        {`${g / 60} hr${g > 60 ? 's' : ''}`}
                      </SSDSButton>
                    ))}
                  </SSDSRow>
                </View>

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

                {message ? (
                  <SSDSText variant="BodySecondary" color="success">
                    {message}
                  </SSDSText>
                ) : null}

                <SSDSButton
                  variant="primary"
                  size="large"
                  fullWidth
                  trailingIcon={ArrowRight}
                  loading={busy}
                  disabled={busy}
                  onPress={submit}
                >
                  Create account
                </SSDSButton>

                <SSDSRow justify="center" gap={6}>
                  <SSDSText variant="BodySecondary">Already have an account?</SSDSText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Sign in"
                    onPress={() => nav.navigate('SignIn')}
                  >
                    <SSDSText variant="ButtonLabel" color="primary">
                      Sign in
                    </SSDSText>
                  </Pressable>
                </SSDSRow>
              </SSDSStack>
            </SSDSSurface>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
