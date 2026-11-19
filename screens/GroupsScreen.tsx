import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Share, View } from 'react-native';
import { Shell, useLayout } from '../components/Shell';
import { Button, Card, Field, Txt } from '../components/ui';
import type { AppNavigation } from '../lib/navigation';
import { radii, useTheme } from '../lib/theme';

interface FocusingMember {
  id: string;
  name: string;
  time: string;
  initial: string;
  color: string;
  textColor: string;
  verified?: boolean;
}

interface StudyGroup {
  id: string;
  name: string;
  exam?: string;
  membersLabel: string;
  emoji: string;
  emojiBg: string;
  focusingCount: number;
  isPinned?: boolean;
  isPublic?: boolean;
  previewAvatars?: { label: string; bg: string; color: string }[];
}

const LIVE_MEMBERS: FocusingMember[] = [
  { id: 'padhle', name: 'Padhle', time: '12h 14m', initial: 'P', color: '#E0F2FE', textColor: '#0369A1', verified: true },
  { id: 'maahi', name: 'Maahi', time: '12h 14m', initial: 'M', color: '#FCE7F3', textColor: '#BE185D', verified: true },
  { id: 'archu', name: 'Archu', time: '11h 39m', initial: 'A', color: '#F472B6', textColor: '#831843', verified: true },
  { id: 'sush', name: 'sush', time: '11h 36m', initial: 'S', color: '#FEF9C3', textColor: '#CA8A04', verified: true },
  { id: 'tg', name: 'TG', time: '11h 5m', initial: 'T', color: '#E9D5FF', textColor: '#7E22CE' },
  { id: 'jyotsana', name: 'Jyotsana', time: '9h 32m', initial: 'J', color: '#BAE6FD', textColor: '#0284C7' },
  { id: 'shruti', name: 'shruti', time: '7h 54m', initial: 'S', color: '#FEF3C7', textColor: '#D97706' },
  { id: 'jeniii', name: 'Jeniii', time: '6h 46m', initial: 'J', color: '#FBCFE8', textColor: '#DB2777', verified: true },
];

const OFFLINE_MEMBERS = [
  { id: 'offline-m', initial: 'M', bg: '#9CA3AF', color: '#FFFFFF' },
  { id: 'offline-g', initial: 'G', bg: '#F3F4F6', color: '#6B7280' },
  { id: 'offline-r', initial: 'R', bg: '#CBD5E1', color: '#334155' },
  { id: 'offline-k', initial: 'K', bg: '#94A3B8', color: '#FFFFFF' },
  { id: 'offline-a', initial: 'A', bg: '#E2E8F0', color: '#475569' },
  { id: 'offline-v', initial: 'V', bg: '#64748B', color: '#FFFFFF' },
];

const INITIAL_MY_GROUPS: StudyGroup[] = [
  {
    id: 'ras',
    name: 'ras',
    membersLabel: '1 member',
    emoji: '🏓',
    emojiBg: '#3F2E26',
    focusingCount: 0,
    isPinned: true,
    isPublic: true,
  },
  {
    id: 'upsc-2027',
    name: 'upsc 2027',
    membersLabel: '5.9k+ members',
    emoji: '🏰',
    emojiBg: '#233829',
    focusingCount: 201,
    isPinned: false,
    isPublic: true,
    previewAvatars: [
      { label: 'W', bg: '#FEF9C3', color: '#CA8A04' },
      { label: 'P', bg: '#BAE6FD', color: '#0284C7' },
      { label: 'A', bg: '#FBCFE8', color: '#BE185D' },
    ],
  },
];

const INITIAL_SUGGESTED: StudyGroup[] = [
  { id: '12h-study', name: '12 hours study group', membersLabel: '12k+ members', emoji: '🐎', emojiBg: '#2D2620', focusingCount: 412, isPublic: true },
  { id: 'cds-ima', name: 'CDS aspirants/ IMA/OTA', membersLabel: '8.1k+ members', emoji: '🎖️', emojiBg: '#1E293B', focusingCount: 148, isPublic: true },
  { id: 'ras-mains', name: 'RAS Mains Answer Writing', membersLabel: '3.4k+ members', emoji: '📝', emojiBg: '#263447', focusingCount: 76, isPublic: true },
];

const LEADERBOARD = [
  { rank: 1, name: 'Padhle', time: '12h 14m', hours: 96 },
  { rank: 2, name: 'Maahi', time: '11h 42m', hours: 91 },
  { rank: 3, name: 'Archu', time: '10h 58m', hours: 86 },
  { rank: 4, name: 'sush', time: '9h 35m', hours: 74 },
  { rank: 5, name: 'Jyotsana', time: '8h 21m', hours: 65 },
];

export default function GroupsScreen() {
  const { colors, scheme } = useTheme();
  const { isMobile } = useLayout();
  const nav = useNavigation<AppNavigation>();
  const isDark = scheme === 'dark';
  const [myGroups, setMyGroups] = useState<StudyGroup[]>(INITIAL_MY_GROUPS);
  const [suggestedGroups, setSuggestedGroups] = useState<StudyGroup[]>(INITIAL_SUGGESTED);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'live'>('live');
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupExam, setNewGroupExam] = useState('');
  const [newGroupEmoji, setNewGroupEmoji] = useState('📚');
  const [isFocusing, setIsFocusing] = useState(false);

  const togglePin = (id: string) => {
    setMyGroups((groups) => groups.map((group) => group.id === id ? { ...group, isPinned: !group.isPinned } : group));
  };

  const joinGroup = (group: StudyGroup) => {
    setSuggestedGroups((groups) => groups.filter((item) => item.id !== group.id));
    setMyGroups((groups) => [...groups, { ...group, previewAvatars: [{ label: 'S', bg: '#FEF9C3', color: '#CA8A04' }, { label: 'K', bg: '#BAE6FD', color: '#0284C7' }] }]);
  };

  const createGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    const group: StudyGroup = {
      id: `custom-${Date.now()}`,
      name,
      exam: newGroupExam.trim() || undefined,
      membersLabel: '1 member',
      emoji: newGroupEmoji.trim() || '📚',
      emojiBg: isDark ? '#263447' : '#EAF2FF',
      focusingCount: 0,
      isPinned: false,
      isPublic: true,
    };
    setMyGroups((groups) => [...groups, group]);
    setNewGroupName('');
    setNewGroupExam('');
    setNewGroupEmoji('📚');
    setCreateModalVisible(false);
  };

  const inviteFriends = async () => {
    try {
      await Share.share({ message: `Join ${selectedGroup?.name ?? 'my study group'} on Study Sakha and focus together!` });
    } catch (error) {
      Alert.alert('Unable to share', error instanceof Error ? error.message : 'Sharing is not supported on this device.');
    }
  };

  const setGroupVisibility = (isPublic: boolean) => {
    if (!selectedGroup) return;
    const updated = { ...selectedGroup, isPublic };
    setSelectedGroup(updated);
    setMyGroups((groups) => groups.map((group) => group.id === updated.id ? updated : group));
  };

  const renderGroupCard = (group: StudyGroup) => (
    <Card key={group.id} padded={false} style={{ overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
        <Pressable onPress={() => { setSelectedGroup(group); setActiveTab('live'); }} accessibilityRole="button" accessibilityLabel={`Open ${group.name}`} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: group.emojiBg, alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={26}>{group.emoji}</Txt>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt size={15} weight="800" numberOfLines={1}>{group.name}</Txt>
            <Txt size={12} color={colors.textMuted} style={{ marginTop: 3 }}>{group.membersLabel}</Txt>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Pressable>
        <Pressable onPress={() => togglePin(group.id)} accessibilityRole="button" accessibilityLabel={`${group.isPinned ? 'Unpin' : 'Pin'} ${group.name}`} accessibilityState={{ selected: !!group.isPinned }} hitSlop={8} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={group.isPinned ? 'pin' : 'push-outline'} size={18} color={group.isPinned ? colors.blue : colors.textMuted} />
        </Pressable>
      </View>
      <View style={{ minHeight: 42, borderTopWidth: 1, borderTopColor: colors.borderSubtle, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 }}>
        {group.focusingCount > 0 ? (
          <>
            <View style={{ flexDirection: 'row', paddingLeft: 2 }}>
              {(group.previewAvatars ?? []).map((avatar, index) => (
                <View key={`${group.id}-${avatar.label}`} style={{ width: 22, height: 22, borderRadius: 11, marginLeft: index === 0 ? 0 : -6, borderWidth: 2, borderColor: colors.surfaceRaised, backgroundColor: avatar.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt size={9} weight="800" color={avatar.color}>{avatar.label}</Txt>
                </View>
              ))}
            </View>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green }} />
            <Txt size={11.5} color={colors.textSecondary}>{group.focusingCount} focusing now</Txt>
          </>
        ) : (
          <Txt size={11.5} color={colors.textMuted}>Be the first to focus!</Txt>
        )}
      </View>
    </Card>
  );

  const renderSuggestedCard = (group: StudyGroup) => (
    <Card key={group.id} padded={false} style={{ overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 13, gap: 11 }}>
        <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: group.emojiBg, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={23}>{group.emoji}</Txt>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt size={14} weight="800" numberOfLines={1}>{group.name}</Txt>
          <Txt size={11.5} color={colors.textMuted} style={{ marginTop: 3 }}>{group.membersLabel}</Txt>
        </View>
        <Button label="Join" size="sm" variant="soft" onPress={() => joinGroup(group)} style={{ borderRadius: radii.pill }} />
      </View>
    </Card>
  );

  const renderMemberTile = (member: FocusingMember) => (
    <View key={member.id} style={{ width: '31.5%', minHeight: 122, alignItems: 'center', paddingVertical: 8 }}>
      <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: member.color, alignItems: 'center', justifyContent: 'center' }}>
        <Txt size={25} weight="800" color={member.textColor}>{member.initial}</Txt>
        <Pressable onPress={() => Alert.alert('Send a cheer', `Cheer ${member.name} on!`)} accessibilityRole="button" accessibilityLabel={`Cheer ${member.name}`} style={{ position: 'absolute', right: -3, top: -1, width: 25, height: 25, borderRadius: 13, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.borderSubtle, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="happy-outline" size={14} color={colors.orange} />
        </Pressable>
        {member.verified ? (
          <View style={{ position: 'absolute', right: -3, bottom: 1, width: 21, height: 21, borderRadius: 11, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="flame" size={11} color="#FFFFFF" />
          </View>
        ) : null}
      </View>
      <Txt size={11.5} weight="700" numberOfLines={1} style={{ maxWidth: '100%', marginTop: 8 }}>{member.name}</Txt>
      <Txt size={10} color={colors.textMuted} numberOfLines={1} style={{ marginTop: 2 }}>{member.time}</Txt>
    </View>
  );

  const renderLiveView = () => {
    const members = isFocusing
      ? [{ id: 'you', name: 'You', time: 'Focusing', initial: 'Y', color: colors.tint, textColor: colors.blue }, ...LIVE_MEMBERS]
      : LIVE_MEMBERS;
    return (
      <View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 14 }}>
          <Pressable onPress={inviteFriends} accessibilityRole="button" accessibilityLabel="Invite a friend to focus" style={{ width: '31.5%', minHeight: 122, alignItems: 'center', paddingVertical: 8 }}>
            <View style={{ width: 68, height: 68, borderRadius: 34, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.blue, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="add" size={27} color={colors.blue} />
            </View>
            <Txt size={11} weight="700" color={colors.blue} numberOfLines={1} style={{ maxWidth: '100%', marginTop: 8 }}>Invite a friend</Txt>
          </Pressable>
          {members.map(renderMemberTile)}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 5, borderRadius: radii.pill, backgroundColor: colors.surfaceSubtle, paddingVertical: 6, paddingHorizontal: 12 }}>
          <View style={{ flexDirection: 'row', marginRight: 8 }}>
            {['#FEF9C3', '#BAE6FD', '#FBCFE8'].map((bg, index) => (
              <View key={bg} style={{ width: 18, height: 18, borderRadius: 9, marginLeft: index === 0 ? 0 : -5, borderWidth: 1.5, borderColor: colors.surfaceRaised, backgroundColor: bg }} />
            ))}
          </View>
          <Txt size={10.5} weight="700" color={colors.textSecondary}>+194 more</Txt>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textFaint }} />
          <Txt size={13} weight="800" color={colors.textSecondary}>Not focusing</Txt>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {OFFLINE_MEMBERS.map((member) => (
            <View key={member.id} style={{ width: '31.5%', minHeight: 96, alignItems: 'center', paddingVertical: 8 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: member.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Txt size={21} weight="800" color={member.color}>{member.initial}</Txt>
              </View>
              <Txt size={10.5} color={colors.textMuted} style={{ marginTop: 7 }}>Member</Txt>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderLeaderboard = () => (
    <View style={{ gap: 10, marginTop: 16 }}>
      {LEADERBOARD.map((item) => (
        <Card key={item.rank} padded={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: item.rank <= 3 ? (item.rank === 1 ? '#F5C451' : item.rank === 2 ? '#CBD5E1' : '#D99A65') : colors.surfaceSubtle, alignItems: 'center', justifyContent: 'center' }}>
              <Txt size={11} weight="800" color={item.rank <= 3 ? '#263244' : colors.textSecondary}>#{item.rank}</Txt>
            </View>
            <View style={{ flex: 1, gap: 7 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Txt size={13} weight="700" numberOfLines={1}>{item.name}</Txt>
                <Txt size={11.5} weight="700" color={colors.textSecondary}>{item.time}</Txt>
              </View>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.surfaceSubtle, overflow: 'hidden' }}>
                <View style={{ width: `${item.hours}%`, height: '100%', borderRadius: 3, backgroundColor: item.rank === 1 ? colors.green : colors.blue }} />
              </View>
            </View>
          </View>
        </Card>
      ))}
      <Txt size={11} color={colors.textMuted} style={{ textAlign: 'center', marginTop: 5 }}>Study consistently and climb the weekly board.</Txt>
    </View>
  );

  if (selectedGroup) {
    const detailGroup = myGroups.find((group) => group.id === selectedGroup.id) ?? selectedGroup;
    return (
      <Shell active="Groups" title="" scroll={false} contentPadding={0}>
        <View style={{ flex: 1 }}>
          <View style={{ minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle, backgroundColor: colors.surface }}>
            <Pressable onPress={() => setSelectedGroup(null)} accessibilityRole="button" accessibilityLabel="Back to groups" style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="arrow-back" size={21} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1 }} />
            <Button label="Invite friends" icon="person-add-outline" size="sm" variant="soft" onPress={inviteFriends} style={{ borderRadius: radii.pill, backgroundColor: isDark ? 'rgba(43,214,155,0.14)' : 'rgba(52,199,89,0.12)' }} />
            <Pressable onPress={() => setSettingsVisible(true)} accessibilityRole="button" accessibilityLabel="Group settings" style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="settings-outline" size={19} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ width: '100%', maxWidth: 760, alignSelf: 'center', padding: isMobile ? 16 : 24, paddingBottom: 18 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 9 }}>
              <View style={{ width: 66, height: 66, borderRadius: 22, backgroundColor: detailGroup.emojiBg, alignItems: 'center', justifyContent: 'center' }}>
                <Txt size={32}>{detailGroup.emoji}</Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt size={21} weight="800" display>{detailGroup.name}</Txt>
                <Txt size={12} color={colors.textMuted} style={{ marginTop: 4 }}>{detailGroup.membersLabel} • {detailGroup.isPublic ? 'Public' : 'Private'}</Txt>
              </View>
            </View>

            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderSubtle, marginTop: 17 }}>
              {(['leaderboard', 'live'] as const).map((tab) => {
                const active = activeTab === tab;
                return (
                  <Pressable key={tab} onPress={() => setActiveTab(tab)} accessibilityRole="tab" accessibilityState={{ selected: active }} style={{ minHeight: 44, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderBottomWidth: active ? 2 : 0, borderBottomColor: colors.blue }}>
                    {tab === 'live' ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green }} /> : null}
                    <Txt size={12.5} weight={active ? '800' : '600'} color={active ? colors.blue : colors.textMuted}>{tab === 'leaderboard' ? 'Leaderboard' : 'Live (203)'}</Txt>
                  </Pressable>
                );
              })}
            </View>
            {activeTab === 'live' ? renderLiveView() : renderLeaderboard()}
          </ScrollView>

          <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.borderSubtle, backgroundColor: colors.surface }}>
            <Button label={isFocusing ? 'Focusing • Tap to open timer' : 'Start Focus'} icon={isFocusing ? 'timer-outline' : 'play'} onPress={() => isFocusing ? nav.navigate('FocusCenter') : setIsFocusing(true)} full size="lg" style={{ borderRadius: radii.pill }} />
          </View>
        </View>

        <Modal visible={settingsVisible} transparent animationType="fade" onRequestClose={() => setSettingsVisible(false)}>
          <View style={{ flex: 1, justifyContent: 'center', padding: 18, backgroundColor: colors.overlay }}>
            <Card style={{ width: '100%', maxWidth: 460, alignSelf: 'center', gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Txt size={18} weight="800" style={{ flex: 1 }}>Group settings</Txt>
                <Pressable onPress={() => setSettingsVisible(false)} accessibilityRole="button" accessibilityLabel="Close group settings" hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </Pressable>
              </View>
              <Txt size={12.5} color={colors.textMuted}>Choose who can find and join this group.</Txt>
              {([true, false] as const).map((isPublic) => (
                <Pressable key={String(isPublic)} onPress={() => setGroupVisibility(isPublic)} accessibilityRole="radio" accessibilityState={{ checked: detailGroup.isPublic === isPublic }} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 7 }}>
                  <Ionicons name={detailGroup.isPublic === isPublic ? 'radio-button-on' : 'radio-button-off'} size={20} color={detailGroup.isPublic === isPublic ? colors.blue : colors.textMuted} />
                  <View>
                    <Txt size={13} weight="700">{isPublic ? 'Public group' : 'Private group'}</Txt>
                    <Txt size={11} color={colors.textMuted}>{isPublic ? 'Anyone can discover and join.' : 'Only invited members can join.'}</Txt>
                  </View>
                </Pressable>
              ))}
              <Button label="Done" onPress={() => setSettingsVisible(false)} full />
            </Card>
          </View>
        </Modal>
      </Shell>
    );
  }

  const visibleSuggested = showAllSuggestions ? suggestedGroups : suggestedGroups.slice(0, 2);

  return (
    <Shell active="Groups" title="" contentPadding={0}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Txt size={24} weight="800" display>Focus Groups</Txt>
        <Pressable onPress={() => Alert.alert('Focus Groups help', 'Join a study group, invite friends, and focus together.')} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: radii.pill, backgroundColor: colors.surfaceSubtle }}>
          <Ionicons name="chatbox-ellipses-outline" size={15} color={colors.textSecondary} />
          <Txt size={11.5} weight="700" color={colors.textSecondary}>Help</Txt>
        </Pressable>
      </View>

      <View style={{ marginBottom: 25 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
          <Txt size={16} weight="800">Your groups</Txt>
          <Button label="Create Group" icon="add" size="sm" variant="soft" onPress={() => setCreateModalVisible(true)} style={{ borderRadius: radii.pill }} />
        </View>
        <View style={{ gap: 10 }}>{myGroups.map(renderGroupCard)}</View>
      </View>

      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
          <Txt size={16} weight="800">Suggested groups</Txt>
          <Pressable onPress={() => setShowAllSuggestions((visible) => !visible)} accessibilityRole="button" accessibilityState={{ expanded: showAllSuggestions }}>
            <Txt size={12} weight="700" color={colors.blue}>{showAllSuggestions ? 'Show less' : 'View all'}</Txt>
          </Pressable>
        </View>
        <View style={{ gap: 9 }}>{visibleSuggested.map(renderSuggestedCard)}</View>
        {suggestedGroups.length === 0 ? <Txt size={12} color={colors.textMuted} style={{ paddingVertical: 12 }}>You have joined all suggested groups.</Txt> : null}
      </View>

      <Modal visible={createModalVisible} transparent animationType="slide" onRequestClose={() => setCreateModalVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 18, backgroundColor: colors.overlay }}>
          <Card style={{ width: '100%', maxWidth: 500, alignSelf: 'center', gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Txt size={19} weight="800" style={{ flex: 1 }}>Create a study group</Txt>
              <Pressable onPress={() => setCreateModalVisible(false)} accessibilityRole="button" accessibilityLabel="Close create group" hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <Field label="Group name" value={newGroupName} onChangeText={setNewGroupName} placeholder="e.g. RAS daily practice" icon="people-outline" autoCapitalize="words" returnKeyType="next" />
            <Field label="Target exam" value={newGroupExam} onChangeText={setNewGroupExam} placeholder="e.g. RAS 2027" icon="school-outline" autoCapitalize="words" returnKeyType="next" />
            <Field label="Emoji or icon" value={newGroupEmoji} onChangeText={setNewGroupEmoji} placeholder="📚" icon="happy-outline" />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 3 }}>
              <Button label="Cancel" variant="ghost" onPress={() => setCreateModalVisible(false)} />
              <Button label="Create group" icon="add" onPress={createGroup} disabled={!newGroupName.trim()} />
            </View>
          </Card>
        </View>
      </Modal>
    </Shell>
  );
}