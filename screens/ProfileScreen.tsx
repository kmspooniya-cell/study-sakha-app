import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, Image, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { Shell, useLayout } from '../components/Shell';
import { Avatar, Button, Card, Chip, Field, SectionHeader, Txt } from '../components/ui';
import { EXAMS } from '../lib/data';
import { ExamId } from '../lib/types';
import { useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';

type ProfileModal = 'badges' | 'edit' | null;

export default function ProfileScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const { state, badges, signOut, dispatch } = useStore();
  const { isMobile } = useLayout();
  const [openModal, setOpenModal] = useState<ProfileModal>(null);
  const [draftName, setDraftName] = useState('');
  const [draftExam, setDraftExam] = useState<ExamId>('upsc');
  const [draftPhotoUri, setDraftPhotoUri] = useState<string | undefined>();
  const [photoError, setPhotoError] = useState('');

  const user = state.user;
  const exam = EXAMS.find((item) => item.id === (user?.exam ?? 'upsc')) ?? EXAMS[0];
  const avatarSize = isMobile ? 68 : 78;

  const openEditProfile = () => {
    setDraftName(user?.name ?? '');
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
    if (name.length < 2) {
      Alert.alert('Name required', 'Please enter at least two characters for your name.');
      return;
    }
    dispatch({ type: 'updateProfile', patch: { name, exam: draftExam, photoUri: draftPhotoUri } });
    setOpenModal(null);
  };

  const profileImage = (size: number) => (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      {user?.photoUri ? (
        <Image source={{ uri: user.photoUri }} resizeMode="cover" style={{ width: size, height: size }} />
      ) : (
        <Avatar name={user?.name ?? 'Guest User'} size={size} />
      )}
    </View>
  );

  return (
    <Shell active="Profile" title="Profile" subtitle="Your profile, badges and performance">
      <LinearGradient
        colors={[colors.navy, colors.blue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: radii.xl, padding: isMobile ? 18 : 24 }}
      >
        <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 18, alignItems: isMobile ? 'flex-start' : 'center' }}>
          <Pressable
            onPress={openEditProfile}
            accessibilityRole="button"
            accessibilityLabel="Edit profile photo and details"
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <View>
              {profileImage(avatarSize)}
              <View
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: 0,
                  width: 25,
                  height: 25,
                  borderRadius: 13,
                  borderWidth: 2,
                  borderColor: colors.navy,
                  backgroundColor: colors.teal,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="camera-outline" size={13} color="#fff" />
              </View>
            </View>
          </Pressable>
          <View style={{ flex: 1, gap: 7 }}>
            <Txt size={isMobile ? 21 : 25} weight="800" display color="#fff" style={{ letterSpacing: -0.6 }}>
              {user?.name ?? 'Guest User'}
            </Txt>
            <Txt size={13} color="rgba(255,255,255,0.8)">
              {user?.email ?? 'guest@sakha.in'} · joined {user?.joined ?? '—'}
            </Txt>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 11, paddingVertical: 6, borderRadius: radii.pill }}>
                <Txt size={12} weight="800" color="#fff">{exam.short} aspirant</Txt>
              </View>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 11, paddingVertical: 6, borderRadius: radii.pill }}>
                <Txt size={12} weight="800" color="#fff">
                  {user?.role === 'admin' ? 'Administrator' : 'Elite plan'}
                </Txt>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
        {[
          { label: 'Your Stats', icon: 'analytics-outline' as const, onPress: () => nav.navigate('Statistics') },
          { label: 'Badges', icon: 'trophy-outline' as const, onPress: () => setOpenModal('badges') },
          { label: 'Edit Profile', icon: 'create-outline' as const, onPress: openEditProfile },
        ].map((action) => (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            style={({ pressed }) => ({
              flexGrow: 1,
              flexBasis: isMobile ? '30%' : 0,
              minWidth: isMobile ? 94 : 120,
              minHeight: 88,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 14,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: pressed ? colors.blue : colors.borderSubtle,
              backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
              transform: [{ scale: pressed ? 0.985 : 1 }],
            })}
            accessibilityRole="button"
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: colors.tint,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={action.icon} size={20} color={colors.blue} />
            </View>
            <Txt size={12.5} weight="700" style={{ textAlign: 'center' }}>{action.label}</Txt>
          </Pressable>
        ))}
      </View>

      <Card style={{ gap: 10, marginTop: 18 }}>
        <SectionHeader title="Account" icon="person-circle-outline" />
        <Button label="Open settings" icon="settings-outline" variant="outline" full onPress={() => nav.navigate('Settings')} />
        {user?.role === 'admin' ? (
          <Button label="Admin portal" icon="shield-checkmark-outline" variant="soft" full onPress={() => nav.navigate('Admin')} />
        ) : null}
        <Button label="Sign out" icon="log-out-outline" variant="danger" full onPress={signOut} />
      </Card>

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
                  <View style={{ gap: 8 }}>
                    <Txt size={12.5} weight="700" color={colors.textMuted}>Relevant exam</Txt>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {EXAMS.map((item) => (
                        <Chip key={item.id} label={item.short} active={draftExam === item.id} onPress={() => setDraftExam(item.id)} />
                      ))}
                    </View>
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
