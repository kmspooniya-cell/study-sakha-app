import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight, Moon, Pause, Play, Square, Sun } from 'lucide-react-native';
import {
  RoomHeader,
} from '../components/RoomHeader';
import {
  StudyFloorGrid,
} from '../components/StudyFloorGrid';
import {
  ChairDetailBottomSheet,
} from '../components/ChairDetailBottomSheet';
import type {
  ResponsiveMetrics,
  SmartStudyRoomScreenProps,
  StudyMember,
} from '../lib/smartStudyRoomTypes';
import {
  useResponsiveMetrics,
  formatDuration,
  formatTargetDuration,
  DEFAULT_CURRENT_USER,
  DEFAULT_PARTNERS,
} from '../lib/smartStudyRoom';
import type { AppNavigation } from '../lib/navigation';
import { getDisplayedFocusElapsedSeconds } from '../lib/groupFocusTimer';

function getDisplayedMember(member: StudyMember, now: number): StudyMember {
  return {
    ...member,
    elapsedSeconds: getDisplayedFocusElapsedSeconds(member.elapsedSeconds, member.state, member.focusUpdatedAt, now),
  };
}

export const SmartStudyRoomScreen: React.FC<SmartStudyRoomScreenProps> = ({
  isDark: externalIsDark,
  onToggleTheme: externalOnToggleTheme,
  roomName = 'Silent Focus Hall',
  currentUserChair: externalCurrentUserChair,
  partners: externalPartners,
  onStartFocus: externalOnStartFocus,
  onTogglePause: externalOnTogglePause,
  onEndSession: externalOnEndSession,
  onExitHall: externalOnExitHall,
  navigation,
}) => {
  const metrics = useResponsiveMetrics();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<AppNavigation>();

  const [internalIsDark, setInternalIsDark] = useState<boolean>(false);
  const [screen, setScreen] = useState<'room' | 'lobby'>('room');
  const [internalCurrentUser, setInternalCurrentUser] =
    useState<StudyMember>(DEFAULT_CURRENT_USER);
  const [internalPartners, setInternalPartners] =
    useState<StudyMember[]>(DEFAULT_PARTNERS);

  const isDark = externalIsDark !== undefined ? externalIsDark : internalIsDark;
  const currentUserChair = externalCurrentUserChair || internalCurrentUser;
  const partners = externalPartners || internalPartners;

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const handleToggleTheme = useCallback(() => {
    if (externalOnToggleTheme) {
      externalOnToggleTheme();
    } else {
      setInternalIsDark((d) => !d);
    }
  }, [externalOnToggleTheme]);

  useEffect(() => {
    if (screen !== 'room' || externalCurrentUserChair) return;

    const interval = setInterval(() => {
      setInternalCurrentUser((prev) =>
        prev.state === 'focusing'
          ? { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 }
          : prev
      );
      setInternalPartners((prevList) =>
        prevList.map((p) =>
          p.state === 'focusing' ? { ...p, elapsedSeconds: p.elapsedSeconds + 1 } : p
        )
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [screen, externalCurrentUserChair]);

  const hasExternallyRunningMember = [currentUserChair, ...partners].some((member) => member.state === 'focusing');
  const [displayNow, setDisplayNow] = useState(Date.now);

  useEffect(() => {
    if (screen !== 'room' || !hasExternallyRunningMember) return;
    const interval = setInterval(() => setDisplayNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasExternallyRunningMember, screen]);

  const displayedCurrentUser = useMemo(() => getDisplayedMember(currentUserChair, displayNow), [currentUserChair, displayNow]);
  const displayedPartners = useMemo(() => partners.map((member) => getDisplayedMember(member, displayNow)), [partners, displayNow]);

  const allChairs = useMemo(
    () => [displayedCurrentUser, ...displayedPartners],
    [displayedCurrentUser, displayedPartners]
  );

  const selectedMember = useMemo(
    () => allChairs.find((m) => m.id === selectedMemberId) || null,
    [allChairs, selectedMemberId]
  );

  const totalPartnersPresent = partners.length;
  const focusingNowCount = useMemo(
    () => allChairs.filter((m) => m.state === 'focusing').length,
    [allChairs]
  );

  const handleStartFocus = useCallback(() => externalOnStartFocus?.(), [externalOnStartFocus]);

  const handleTogglePause = useCallback(() => {
    if (externalOnTogglePause) {
      externalOnTogglePause();
      return;
    }
    setInternalCurrentUser((prev) => {
      if (prev.state === 'focusing') return { ...prev, state: 'paused' };
      if (prev.state === 'paused') return { ...prev, state: 'focusing' };
      return prev;
    });
  }, [externalOnTogglePause]);

  const handleEndSession = useCallback(() => {
    if (externalOnEndSession) {
      externalOnEndSession();
      return;
    }
    setInternalCurrentUser((prev) => ({
      ...prev,
      state: 'available',
      subject: null,
      topic: null,
      mode: null,
      targetSeconds: null,
      elapsedSeconds: 0,
      startedAt: null,
    }));
  }, [externalOnEndSession]);

  const handleChairClick = useCallback(
    (member: StudyMember) => {
      if (member.id === currentUserChair.id && member.state === 'available') {
        handleStartFocus();
        return;
      }
      if (member.state !== 'available') {
        setSelectedMemberId(member.id);
      }
    },
    [currentUserChair.id, handleStartFocus]
  );

  const handleBackFromHall = useCallback(() => {
    setSelectedMemberId(null);
    if (externalOnExitHall) {
      externalOnExitHall();
    } else if (nav && typeof nav.canGoBack === 'function' && nav.canGoBack()) {
      nav.goBack();
    } else {
      setScreen('lobby');
    }
  }, [externalOnExitHall, nav]);

  if (screen === 'lobby') {
    return (
      <SafeAreaView
        style={[
          styles.lobbyRoot,
          { backgroundColor: isDark ? '#0B0F17' : '#F6F8FB' },
        ]}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View
          style={[
            styles.lobbyCard,
            {
              backgroundColor: isDark ? '#131924' : '#FFFFFF',
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
            },
          ]}
        >
          <View style={styles.lobbyHeader}>
            <View>
              <Text style={[styles.lobbyBrand, { color: isDark ? '#60A5FA' : '#2563EB' }]}>
                STUDY SAKHA
              </Text>
              <Text style={[styles.lobbyTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                Smart Study Rooms
              </Text>
            </View>
            <Pressable
              onPress={handleToggleTheme}
              style={[
                styles.iconSquareBtn,
                {
                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                  borderColor: isDark ? '#1E293B' : '#E2E8F0',
                },
              ]}
            >
              {isDark ? <Sun size={20} strokeWidth={1.9} color="#FCD34D" /> : <Moon size={20} strokeWidth={1.9} color="#475569" />}
            </Pressable>
          </View>

          <Pressable
            onPress={() => setScreen('room')}
            style={({ pressed }) => [
              styles.lobbyRoomBtn,
              {
                backgroundColor: isDark ? '#171F2E' : '#F8FAFC',
                borderColor: isDark ? '#1E293B' : '#E2E8F0',
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View>
              <Text
                style={[styles.lobbyRoomTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}
              >
                {roomName}
              </Text>
              <View style={styles.lobbyRoomSubRow}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text
                  style={[styles.lobbyRoomSub, { color: isDark ? '#94A3B8' : '#64748B' }]}
                >
                  {totalPartnersPresent} study partners present
                </Text>
              </View>
            </View>
            <View style={styles.lobbyChevronBox}>
              <ChevronRight size={20} strokeWidth={2} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isUserActive = currentUserChair.state !== 'available';
  const isUserFocusing = currentUserChair.state === 'focusing';

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[
        styles.root,
        { backgroundColor: isDark ? '#0B0F17' : '#F6F8FB' },
      ]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <RoomHeader
        roomName={roomName}
        totalPartnersPresent={totalPartnersPresent}
        focusingNowCount={focusingNowCount}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        onPressBack={handleBackFromHall}
      />

      <ScrollView
        style={styles.scrollFloor}
        contentContainerStyle={[
          styles.scrollFloorContent,
          { paddingBottom: Math.max(112, insets.bottom + 96) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <StudyFloorGrid
          chairs={allChairs}
          currentUserId={currentUserChair.id}
          isDark={isDark}
          metrics={metrics}
          onSelectChair={handleChairClick}
        />
      </ScrollView>

      <View
        style={[
          styles.footerOuter,
          {
            backgroundColor: isDark ? 'rgba(11, 15, 23, 0.94)' : 'rgba(255, 255, 255, 0.94)',
            borderTopColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(226, 232, 240, 0.85)',
            paddingBottom: Math.max(14, insets.bottom + 8),
          },
        ]}
      >
        <View style={styles.footerInner}>
          {!isUserActive ? (
            <Pressable
              onPress={handleStartFocus}
              style={({ pressed }) => [
                styles.startFocusingBtn,
                {
                  opacity: pressed ? 0.92 : 1,
                  transform: [{ scale: pressed ? 0.99 : 1 }],
                },
              ]}
            >
              <Text style={styles.startFocusingText}>Start Focusing</Text>
            </Pressable>
          ) : (
            <View style={styles.activeFooterRow}>
              <Pressable
                onPress={() => setSelectedMemberId(currentUserChair.id)}
                style={[
                  styles.liveStatusPill,
                  {
                    backgroundColor: isUserFocusing
                      ? isDark
                        ? 'rgba(16, 185, 129, 0.12)'
                        : '#ECFDF5'
                      : isDark
                      ? 'rgba(245, 158, 11, 0.12)'
                      : '#FFFBEB',
                    borderColor: isUserFocusing
                      ? isDark
                        ? 'rgba(16, 185, 129, 0.35)'
                        : '#A7F3D0'
                      : isDark
                      ? 'rgba(245, 158, 11, 0.35)'
                      : '#FDE68A',
                  },
                ]}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.livePillSubject,
                      {
                        color: isUserFocusing
                          ? isDark
                            ? '#6EE7B7'
                            : '#065F46'
                          : isDark
                          ? '#FCD34D'
                          : '#92400E',
                      },
                    ]}
                  >
                    {currentUserChair.subject}
                  </Text>
                  <Text
                    style={[
                      styles.livePillTimer,
                      {
                        color: isUserFocusing
                          ? isDark
                            ? '#6EE7B7'
                            : '#065F46'
                          : isDark
                          ? '#FCD34D'
                          : '#92400E',
                      },
                    ]}
                  >
                    {formatDuration(currentUserChair.elapsedSeconds)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.livePillStateLabel,
                    {
                      color: isUserFocusing
                        ? isDark
                          ? '#6EE7B7'
                          : '#065F46'
                        : isDark
                        ? '#FCD34D'
                        : '#92400E',
                    },
                  ]}
                >
                  {isUserFocusing ? 'Focusing' : 'Paused'}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleTogglePause}
                accessibilityRole="button"
                accessibilityLabel={
                  isUserFocusing ? 'Pause focus session' : 'Resume focus session'
                }
                style={({ pressed }) => [
                  styles.footerControlBtn,
                  {
                    backgroundColor: isUserFocusing
                      ? isDark
                        ? 'rgba(245, 158, 11, 0.2)'
                        : '#FEF3C7'
                      : '#059669',
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                {isUserFocusing ? (
                  <>
                    <Pause size={18} strokeWidth={2} color={isDark ? '#FCD34D' : '#92400E'} />
                    {!metrics.isMobile && (
                      <Text
                        style={[
                          styles.footerControlText,
                          { color: isDark ? '#FCD34D' : '#92400E' },
                        ]}
                      >
                        Pause
                      </Text>
                    )}
                  </>
                ) : (
                  <>
                    <Play size={18} strokeWidth={2} color="#FFFFFF" />
                    {!metrics.isMobile && (
                      <Text style={[styles.footerControlText, { color: '#FFFFFF' }]}>
                        Resume
                      </Text>
                    )}
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={handleEndSession}
                accessibilityRole="button"
                accessibilityLabel="End focus session"
                style={({ pressed }) => [
                  styles.footerControlBtn,
                  {
                    backgroundColor: isDark ? 'rgba(244, 63, 94, 0.12)' : '#FFF1F2',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(244, 63, 94, 0.35)' : '#FECDD3',
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Square size={16} strokeWidth={2} color={isDark ? '#FDA4AF' : '#E11D48'} />
                {!metrics.isMobile && (
                  <Text
                    style={[
                      styles.footerControlText,
                      { color: isDark ? '#FDA4AF' : '#E11D48' },
                    ]}
                  >
                    End
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </View>

      <ChairDetailBottomSheet
        member={selectedMember}
        isCurrentUser={selectedMember?.id === currentUserChair.id}
        isOpen={Boolean(selectedMember)}
        onClose={() => setSelectedMemberId(null)}
        isDark={isDark}
        onPauseToggle={handleTogglePause}
        onEndSession={handleEndSession}
      />
    </SafeAreaView>
  );
};

export default SmartStudyRoomScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  lobbyRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  lobbyCard: {
    width: '100%',
    maxWidth: 448,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  lobbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  lobbyBrand: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  lobbyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  lobbyRoomBtn: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lobbyRoomTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  lobbyRoomSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  lobbyRoomSub: {
    fontSize: 12,
  },
  lobbyChevronBox: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  iconSquareBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollFloor: {
    flex: 1,
  },
  scrollFloorContent: {
    alignItems: 'center',
  },
  footerOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingTop: 14,
    paddingHorizontal: 16,
  },
  footerInner: {
    width: '100%',
    maxWidth: 512,
    alignSelf: 'center',
  },
  startFocusingBtn: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: '#007BFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  startFocusingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  activeFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  liveStatusPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  livePillSubject: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.85,
  },
  livePillTimer: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  livePillStateLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  footerControlBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerControlText: {
    fontSize: 14,
    fontWeight: '600',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
