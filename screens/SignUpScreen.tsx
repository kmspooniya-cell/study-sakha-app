import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../components/Logo';
import { useLayout } from '../components/Shell';
import { Button, Card, Chip, Field, Txt } from '../components/ui';
import { EXAMS } from '../lib/data';
import { useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';
import { ExamId } from '../lib/types';

export default function SignUpScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const { signUp } = useStore();
  const { isMobile } = useLayout();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [exam, setExam] = useState<ExamId>('upsc');
  const [goal, setGoal] = useState(180);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = () => {
    setError('');
    setBusy(true);
    setTimeout(() => {
      const res = signUp(name, email, password, exam);
      setBusy(false);
      if (!res.ok) setError(res.error ?? 'Unable to create the account.');
    }, 350);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: isMobile ? 18 : 40, flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
          <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center' }}>
            <View style={{ alignItems: isMobile ? 'center' : 'flex-start', marginBottom: 18 }}>
              <Logo size={38} />
            </View>
            <Card style={{ padding: isMobile ? 18 : 28, gap: 16 }}>
              <View>
                <Txt size={24} weight="800" display style={{ letterSpacing: -0.6 }}>
                  Create your account
                </Txt>
                <Txt size={13.5} color={colors.textMuted} style={{ marginTop: 4 }}>
                  Pick a target exam and Sakha will personalise your library, plan and tests.
                </Txt>
              </View>

              <Field label="Full name" value={name} onChangeText={setName} placeholder="Ananya Deshmukh" icon="person-outline" autoCapitalize="words" />
              <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.in" keyboardType="email-address" icon="mail-outline" />
              <Field label="Password" value={password} onChangeText={setPassword} placeholder="Minimum 6 characters" secure icon="lock-closed-outline" onSubmitEditing={submit} returnKeyType="go" />

              <View>
                <Txt size={12.5} weight="700" color={colors.textMuted} style={{ marginBottom: 9 }}>
                  Target exam
                </Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {EXAMS.map((e) => (
                    <Chip key={e.id} label={e.short} tone={e.color} active={exam === e.id} onPress={() => setExam(e.id)} />
                  ))}
                </View>
              </View>

              <View>
                <Txt size={12.5} weight="700" color={colors.textMuted} style={{ marginBottom: 9 }}>
                  Daily study goal
                </Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[90, 120, 180, 240, 300].map((g) => (
                    <Chip key={g} label={`${g / 60} hr${g > 60 ? 's' : ''}`} active={goal === g} onPress={() => setGoal(g)} />
                  ))}
                </View>
              </View>

              {error ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: `${colors.danger}15`, padding: 11, borderRadius: radii.md }}>
                  <Ionicons name="alert-circle" size={17} color={colors.danger} />
                  <Txt size={12.5} weight="600" color={colors.danger} style={{ flex: 1 }}>
                    {error}
                  </Txt>
                </View>
              ) : null}

              <Button label="Create account" icon="arrow-forward" full size="lg" loading={busy} onPress={submit} />

              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                <Txt size={13} color={colors.textMuted}>
                  Already have an account?
                </Txt>
                <Pressable onPress={() => nav.navigate('SignIn')}>
                  <Txt size={13} weight="800" color={colors.blue}>
                    Sign in
                  </Txt>
                </Pressable>
              </View>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
