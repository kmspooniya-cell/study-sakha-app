import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import { Alert, Image, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { Shell, useLayout } from '../components/Shell';
import { FocusSelector } from '../components/FocusSelector';
import { Avatar, Button, Card, Chip, Field, SectionHeader, Txt } from '../components/ui';
import { EXAMS } from '../lib/data';
import { ExamId } from '../lib/types';
import { getDisplayName, useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';

type ProfileModal = 'badges' | 'edit' | null;
type ProfileTab = 'info' | 'statistics' | 'other';
type ExamFocusOption = 'UPSC' | 'RAS' | 'Other RPSC/RSSB Exams';

const EXAM_FOCUS_OPTIONS: ExamFocusOption[] = ['UPSC', 'RAS', 'Other RPSC/RSSB Exams'];

export default function ProfileScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const { state, badges, signOut, dispatch, streak } = useStore();
  const { isMobile } = useLayout();
  const [openModal, setOpenModal] = useState<ProfileModal>(null);
  const [draftName, setDraftName] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [draftBirthday, setDraftBirthday] = useState('');
  const [draftPhoneNumber, setDraftPhoneNumber] = useState('');
  const [draftCurrentCity, setDraftCurrentCity] = useState('');
  const [draftExamFocus, setDraftExamFocus] = useState<ExamFocusOption>('UPSC');
  const [draftOtherExam, setDraftOtherExam] = useState('');
  const [draftExam, setDraftExam] = useState<ExamId>('upsc');
  const [draftPhotoUri, setDraftPhotoUri] = useState<string | undefined>();
  const [photoError, setPhotoError] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState<ProfileTab>('info');

  const user = state.user;
  const exam = EXAMS.find((item) => item.id === (user?.exam ?? 'upsc')) ?? EXAMS[0];
  const examFocus = user?.examFocus?.trim() || exam.short;
  const avatarSize = isMobile ? 68 : 78;
  const handleSignOut = async () => {
    setAuthError('');
    try {
      const result = await signOut();
      if (!result.ok) setAuthError(result.error ?? 'Unable to sign out.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign out.');
    }
  };

  useFocusEffect(
    useCallback(() => {
      setActiveTab('info');
    }, []),
  );

  const openEditProfile = () => {
    setDraftName(user?.name ?? '');
    setDraftEmail(user?.email ?? '');
    setDraftBirthday(user?.birthday ?? '');
    setDraftPhoneNumber(user?.phoneNumber ?? '');
    setDraftCurrentCity(user?.currentCity ?? '');
    const savedFocus = user?.examFocus?.trim() || exam.short;
    const knownFocus = EXAM_FOCUS_OPTIONS.includes(savedFocus as ExamFocusOption);
    setDraftExamFocus(knownFocus ? savedFocus as ExamFocusOption : 'Other RPSC/RSSB Exams');
    setDraftOtherExam(knownFocus ? '' : savedFocus);
    setDraftExam(user?.exam ?? 'upsc');
    setDraftPhotoUri(user?.photoUri);
    setPhotoError('');
    setOpenModal('edit');
  };

  const choosePhoto = async () => {
    setPhotoError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
        base64: Platform.OS === 'web',
      });

      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) throw new Error('The image picker returned no selected photo.');
      if (Platform.OS === 'web') {
        if (!asset.base64) throw new Error('The selected photo could not be read by the browser.');
        setDraftPhotoUri(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
      } else {
        const extension = asset.fileName?.split('.').pop()?.toLowerCase();
        const safeExtension = extension && ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(extension)
          ? extension
          : 'jpg';
        const destination = new File(Paths.document, `study-sakha-profile-${Date.now()}.${safeExtension}`);
        new File(asset.uri).copy(destination);
        setDraftPhotoUri(destination.uri);
      }
    } catch (error) {
      console.error('Unable to select profile photo:', error);
      setPhotoError('We could not load that photo. Please try another image.');
    }
  };

  const saveProfile = () => {
    const name = draftName.trim();
    const email = draftEmail.trim();
    const otherExam = draftOtherExam.trim();
    if (name.length < 2) {
      Alert.alert('Name required', 'Please enter at least two characters for your name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Email required', 'Enter a valid email address.');
      return;
    }
    if (draftExamFocus === 'Other RPSC/RSSB Exams' && otherExam.length < 2) {
      Alert.alert('Exam focus required', 'Enter the relevant RPSC/RSSB exam name.');
      return;
    }
    const selectedFocus = draftExamFocus === 'Other RPSC/RSSB Exams' ? otherExam : draftExamFocus;
    dispatch({
      type: 'updateProfile',
      patch: {
        name,
        email,
        birthday: draftBirthday.trim(),
        phoneNumber: draftPhoneNumber.trim(),
        currentCity: draftCurrentCity.trim(),
        examFocus: selectedFocus,
        exam: draftExam,
        photoUri: draftPhotoUri,
      },
    });
    setDraftExamFocus(draftExamFocus);
    setOpenModal(null);
  };

  const profileImage = (size: number) => (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      {user?.photoUri ? (
        <Image source={{ uri: user.photoUri }} resizeMode="cover" style={{ width: size, height: size }} />
      ) : (
        <Avatar name={getDisplayName(user)} size={size} />
      )}
    </View>
  );

  return (
    <Shell active="Profile" title="" subtitle="">
      <LinearGradient
        colors={[colors.navy, colors.blue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: radii.xl, padding: isMobile ? 18 : 24 }}
      >
        <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 18, alignItems: isMobile ? 'flex-start' : 'center' }}>
          <View accessibilityLabel="Student profile photo">{profileImage(avatarSize)}</View>
          <View style={{ flex: 1, gap: 7 }}>
            <Txt size={isMobile ? 21 : 25} weight="800" display color="#fff" style={{ letterSpacing: -0.6 }}>
              {getDisplayName(user)}
            </Txt>
            <Txt size={13} color="rgba(255,255,255,0.8)">Your current focus: {examFocus}</Txt>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 16 }}
      >
        {([
          ['info', 'Info'],
          ['statistics', 'Statistics'],
          ['other', 'Other'],
        ] as const).map(([value, label]) => {
          const active = activeTab === value;
          return (
            <Pressable
              key={value}
              onPress={() => {
                setActiveTab(value);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={{ minWidth: 84, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: active ? colors.blue : 'transparent' }}
            >
              <Txt size={12.5} weight={active ? '800' : '600'} color={active ? colors.blue : colors.textMuted} numberOfLines={1}>
                {label}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>

      {activeTab === 'info' ? (
        <View style={{ gap: 14 }}>
          <Card style={{ gap: 12 }}>
            <SectionHeader title="Profile information" icon="person-circle-outline" action="Edit" onAction={openEditProfile} />
            <View style={{ gap: 10 }}>
              {[
                ['Name', getDisplayName(user)],
                ['Birthday', user?.birthday],
                ['Email ID', user?.email],
                ['Phone Number', user?.phoneNumber],
                ['Current City', user?.currentCity],
                ['Exam Focus', examFocus],
              ].map(([label, value]) => (
                <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 4 }}>
                  <Txt size={12} color={colors.textMuted}>{label}</Txt>
                  <Txt size={13.5} weight="700" style={{ flex: 1, textAlign: 'right' }}>{value?.trim() || 'Not set'}</Txt>
                </View>
              ))}
            </View>
            <Button label="Edit profile" icon="create-outline" variant="outline" onPress={openEditProfile} />
          </Card>
        </View>
      ) : null}

      {activeTab === 'statistics' ? (
        <View style={{ gap: 14 }}>
          <Card style={{ gap: 12 }}>
            <SectionHeader title="Your statistics" icon="analytics-outline" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {[
                { label: 'Study streak', value: `${streak} days`, icon: 'flame-outline' as const, color: colors.orange },
                { label: 'Study time', value: `${Math.round(Object.values(state.studyLog).reduce((total, minutes) => total + minutes, 0))} min`, icon: 'time-outline' as const, color: colors.blue },
                { label: 'Tasks completed', value: `${state.plannerTasks.filter((task) => task.completedOn === task.targetDate).length}`, icon: 'checkmark-circle-outline' as const, color: colors.success },
                { label: 'Tests taken', value: `${state.results.length}`, icon: 'bar-chart-outline' as const, color: colors.violet },
              ].map((item) => (
                <View key={item.label} style={{ flexGrow: 1, flexBasis: isMobile ? '45%' : '22%', minWidth: 130, padding: 13, borderRadius: 14, backgroundColor: colors.surfaceAlt, gap: 7 }}>
                  <Ionicons name={item.icon} size={19} color={item.color} />
                  <Txt size={18} weight="800" display>{item.value}</Txt>
                  <Txt size={11.5} color={colors.textMuted}>{item.label}</Txt>
                </View>
              ))}
            </View>
            <Button label="Open full Statistics" icon="arrow-forward" variant="outline" onPress={() => nav.navigate('Statistics')} />
          </Card>
        </View>
      ) : null}

      {activeTab === 'other' ? (
        <View style={{ gap: 14 }}>
          <Card style={{ gap: 10 }}>
            <SectionHeader title="Profile extras" icon="sparkles-outline" />
            <Button label="View badges" icon="trophy-outline" variant="outline" full onPress={() => setOpenModal('badges')} />
            <FocusSelector />
          </Card>
          <Card style={{ gap: 10 }}>
            <SectionHeader title="Account actions" icon="person-circle-outline" />
            {user?.role === 'admin' ? (
              <Button label="Admin portal" icon="shield-checkmark-outline" variant="soft" full onPress={() => nav.navigate('Admin')} />
            ) : null}
            {authError ? <Txt size={12.5} color={colors.danger}>{authError}</Txt> : null}
            <Button label="Sign out" icon="log-out-outline" variant="danger" full onPress={handleSignOut} />
          </Card>
        </View>
      ) : null}

      <Modal visible={openModal !== null} transparent animationType="fade" onRequestClose={() => setOpenModal(null)}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 16, backgroundColor: colors.overlay }}>
          <View
            style={{
              width: '100%',
              maxWidth: 680,
              maxHeight: '88%',
              alignSelf: 'center',
              borderRadius: radii.dialog,
              backgroundColor: colors.bg,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
              overflow: 'hidden',
            }}
          >
            <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Txt size={16} weight="800" display style={{ flex: 1 }}>
                {openModal === 'badges' ? 'Badges' : 'Edit Profile'}
              </Txt>
              <Pressable
                onPress={() => setOpenModal(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Back to Profile"
                style={({ pressed }) => ({
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
                  borderWidth: 1,
                  borderColor: colors.borderSubtle,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <Ionicons name="arrow-back" size={18} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              {openModal === 'badges' ? (
                <View style={{ gap: 14 }}>
                  <Txt size={13} color={colors.textMuted}>
                    {badges.filter((badge) => badge.earned).length} of {badges.length} badges earned
                  </Txt>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {badges.map((badge) => (
                      <View
                        key={badge.id}
                        style={{
                          width: '47%',
                          flexGrow: 1,
                          padding: 14,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: badge.earned ? colors.teal : colors.borderSubtle,
                          backgroundColor: badge.earned ? colors.tealTint : colors.surface,
                          gap: 8,
                          opacity: badge.earned ? 1 : 0.65,
                        }}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 11,
                            backgroundColor: badge.earned ? colors.teal : colors.surfaceAlt,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons
                            name={badge.icon as keyof typeof Ionicons.glyphMap}
                            size={19}
                            color={badge.earned ? '#FFFFFF' : colors.textFaint}
                          />
                        </View>
                        <Txt size={13.5} weight="800">{badge.name}</Txt>
                        <Txt size={11.5} color={colors.textMuted}>{badge.desc}</Txt>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={{ gap: 16 }}>
                  <View style={{ alignItems: 'center', gap: 10 }}>
                    {draftPhotoUri ? (
                      <Image source={{ uri: draftPhotoUri }} resizeMode="cover" style={{ width: 84, height: 84, borderRadius: 42 }} />
                    ) : (
                      <Avatar name={draftName || 'Guest User'} size={84} />
                    )}
                    <Button label={draftPhotoUri ? 'Change photo' : 'Add photo'} icon="camera-outline" variant="outline" onPress={choosePhoto} />
                    {photoError ? <Txt size={12} color={colors.danger}>{photoError}</Txt> : null}
                  </View>
                  <Field label="Name" value={draftName} onChangeText={setDraftName} placeholder="Your name" icon="person-outline" autoCapitalize="words" />
                  <Field label="Birthday" value={draftBirthday} onChangeText={setDraftBirthday} placeholder="DD/MM/YYYY" icon="calendar-outline" keyboardType="default" />
                  <Field label="Email ID" value={draftEmail} onChangeText={setDraftEmail} placeholder="you@example.in" icon="mail-outline" keyboardType="email-address" autoCapitalize="none" />
                  <Field label="Phone Number" value={draftPhoneNumber} onChangeText={setDraftPhoneNumber} placeholder="Your phone number" icon="call-outline" keyboardType="numeric" />
                  <Field label="Current City" value={draftCurrentCity} onChangeText={setDraftCurrentCity} placeholder="Your current city" icon="location-outline" autoCapitalize="words" />
                  <View style={{ gap: 8 }}>
                    <Txt size={12.5} weight="700" color={colors.textMuted}>Exam Focus</Txt>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {EXAM_FOCUS_OPTIONS.map((option) => (
                        <Chip
                          key={option}
                          label={option}
                          active={draftExamFocus === option}
                          onPress={() => {
                            setDraftExamFocus(option);
                            if (option === 'UPSC') setDraftExam('upsc');
                          }}
                        />
                      ))}
                    </View>
                    {draftExamFocus === 'Other RPSC/RSSB Exams' ? (
                      <Field label="Relevant exam name" value={draftOtherExam} onChangeText={setDraftOtherExam} placeholder="For example, RAS Mains" icon="school-outline" />
                    ) : null}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
                    <Button label="Cancel" variant="outline" onPress={() => setOpenModal(null)} />
                    <Button label="Save changes" icon="checkmark" onPress={saveProfile} />
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Shell>
  );
}
