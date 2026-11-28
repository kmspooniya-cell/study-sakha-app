import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigation, AppRoute, AppStackRouteName } from '../lib/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GeminiFocusTimer from '../components/GeminiFocusTimer';
import type { FocusTimerController } from '../components/GeminiFocusTimer';
import { FocusMusicSelection } from '../components/FocusMusicSelection';
import { Button, Txt } from '../components/ui';
import {
  FocusSessionProvider,
  formatFocusClock,
  isValidFocusSessionSetup,
  useFocusSession,
  useOptionalFocusSession,
} from '../lib/focusSession';
import type { FocusCompletionPayload, FocusSessionContextValue } from '../lib/focusSession';
import type { GroupRoomFocusStatus } from '../lib/groupRoomFocusBridge';
import type { ActiveStudyGroup } from '../lib/groupRooms';
import { getFocusedMilliseconds, getFocusedSeconds } from '../lib/focusTimerAccounting';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';
import { SSDSSurface, SSDSText, useSSDSTheme } from '../lib/ssds';

function FocusCenterContent({ focus }: { focus: FocusSessionContextValue }) {
  const { colors } = useTheme();
  const { tokens } = useSSDSTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AppNavigation>();
  const route = useRoute<AppRoute<'FocusCenter'>>();
  const { state: storeState, dispatch } = useStore();
  const breakSeconds = Math.max(0, (storeState.settings?.shortBreakMinutes ?? 5) * 60);
  const selectedMusicId = storeState.settings?.focusMusicId ?? 'pure_cosmic_waves';

  const [musicSelectionVisible, setMusicSelectionVisible] = useState(false);
  const [groupSelectModalVisible, setGroupSelectModalVisible] = useState(false);
  const [showDiagnosticPanel, setShowDiagnosticPanel] = useState(false);

  const returningToOrigin = useRef(false);
  const consumedSetupRef = useRef<unknown>(null);
  const sessionOrigin = useRef<'DashboardRoot' | 'Groups'>(
    route.params?.roomFocus ? 'Groups' : 'DashboardRoot'
  );

  const {
    session,
    sessionRef,
    clockNow,
    sessionStorageReady,
    isFinalizing,
    saveError,
    endConfirmationVisible,
    earlyExitConfirmationVisible,
    joinedGroups,
    joinedGroupsLoading,
    joinedGroupsError,
    diagnosticState,
    setActiveRoomContext,
    startSession,
    togglePause,
    toggleBreak,
    resetSession,
    requestEndSession,
    completeSession,
    discardSession,
    stayInSession,
    cancelEndSession,
    registerCompletionHandler,
    refreshJoinedGroups,
    actualFocusedSeconds,
    secondsRemaining,
    isOnBreak,
  } = focus;

  const navigatingToCompletionRef = useRef(false);

  const navigateToCompletion = useCallback((payload: FocusCompletionPayload) => {
    if (navigatingToCompletionRef.current) return;
    navigatingToCompletionRef.current = true;
    returningToOrigin.current = true;
    if (route.params?.roomFocus) {
      navigation.setParams({ roomFocus: undefined });
    }
    navigation.replace('FocusCompletion', payload);
  }, [navigation, route.params?.roomFocus]);

  useEffect(() => {
    registerCompletionHandler(navigateToCompletion);
    return () => {
      registerCompletionHandler(null);
    };
  }, [navigateToCompletion, registerCompletionHandler]);

  useFocusEffect(useCallback(() => {
    refreshJoinedGroups();
    return undefined;
  }, [refreshJoinedGroups]));

  useEffect(() => {
    if (route.params?.roomFocus) {
      setActiveRoomContext(route.params.roomFocus);
      sessionOrigin.current = 'Groups';
    }
  }, [route.params?.roomFocus, setActiveRoomContext]);

  useEffect(() => {
    if (session?.groupId) {
      sessionOrigin.current = 'Groups';
    }
  }, [session?.groupId]);

  useEffect(() => {
    const incoming = route.params?.focusSession;
    if (!sessionStorageReady || !incoming) return;
    if (consumedSetupRef.current === incoming) return;
    consumedSetupRef.current = incoming;
    if (!isValidFocusSessionSetup(incoming)) {
      navigation.setParams({ focusSession: undefined });
      return;
    }
    const current = sessionRef.current;
    const sameTaskActive = Boolean(
      current &&
      incoming.task &&
      (current.scheduleOccurrenceId === incoming.scheduleOccurrenceId ||
        current.taskId === incoming.task.id)
    );
    if (!current || !sameTaskActive) {
      returningToOrigin.current = false;
      startSession(incoming, route.params?.roomFocus ?? null);
    }
    navigation.setParams({ focusSession: undefined });
  }, [navigation, route.params?.focusSession, route.params?.roomFocus, sessionRef, sessionStorageReady, startSession]);

  useEffect(() => {
    if (
      !sessionStorageReady ||
      sessionRef.current ||
      route.params?.focusSession ||
      isFinalizing ||
      returningToOrigin.current
    ) return;
    navigation.popTo(route.params?.roomFocus ? 'Groups' : sessionOrigin.current);
  }, [isFinalizing, navigation, route.params?.focusSession, route.params?.roomFocus, session, sessionRef, sessionStorageReady]);

  const leaveFocusCenterTo = useCallback((targetRoute?: AppStackRouteName) => {
    if (targetRoute) {
      navigation.navigate(targetRoute as never);
      return;
    }
    if (typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.popTo(sessionRef.current?.groupId || route.params?.roomFocus ? 'Groups' : sessionOrigin.current);
  }, [navigation, route.params?.roomFocus, sessionRef]);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (musicSelectionVisible) {
        setMusicSelectionVisible(false);
        return true;
      }
      if (groupSelectModalVisible) {
        setGroupSelectModalVisible(false);
        return true;
      }
      if (earlyExitConfirmationVisible) {
        stayInSession();
        return true;
      }
      if (endConfirmationVisible) {
        cancelEndSession();
        return true;
      }
      leaveFocusCenterTo();
      return true;
    });
    return () => subscription.remove();
  }, [
    cancelEndSession,
    earlyExitConfirmationVisible,
    endConfirmationVisible,
    groupSelectModalVisible,
    leaveFocusCenterTo,
    musicSelectionVisible,
    stayInSession,
  ]));

  const currentSession = session;
  const focusTimerController: FocusTimerController | null = currentSession ? {
    totalSeconds: isOnBreak
      ? currentSession.breakDurationSeconds ?? breakSeconds
      : currentSession.mode === 'stopwatch'
        ? Math.max(1, secondsRemaining)
        : currentSession.plannedSeconds ?? 0,
    remainingSeconds: secondsRemaining,
    running: currentSession.phase === 'focus' || currentSession.phase === 'break',
    isBreak: Boolean(isOnBreak),
    sessionLabel: currentSession.sessionLabel,
    modeLabel: currentSession.mode.toUpperCase(),
  } : null;

  const activeSubject = currentSession
    ? currentSession.tagType === 'activity'
      ? currentSession.activity || 'No subject or activity selected'
      : [currentSession.topic, currentSession.subject].filter(Boolean).join(' · ') || 'No subject or activity selected'
    : '';

  const openJoinedGroup = (group: ActiveStudyGroup) => {
    setGroupSelectModalVisible(false);
    const current = sessionRef.current;
    const currentSeconds = current
      ? getFocusedSeconds({
          accumulatedMilliseconds: current.focusedMilliseconds,
          startedAtMilliseconds: current.focusSegmentStartedAt,
          plannedSeconds: current.plannedSeconds,
          mode: current.mode,
          phase: current.phase === 'paused' && current.resumePhase === 'break'
            ? 'break'
            : current.phase,
        }, clockNow)
      : 0;
    const status: GroupRoomFocusStatus | undefined = current
      ? current.phase === 'break' ||
        (current.phase === 'paused' && current.resumePhase === 'break')
        ? 'break'
        : current.phase === 'paused'
          ? 'paused'
          : 'focusing'
      : undefined;
    navigation.navigate('Groups', {
      openGroupRoom: {
        groupId: group.id,
        roomId: 'silent-focus',
        ...(current && status ? {
          focusSession: {
            sessionId: current.id,
            subject: current.subject ?? 'General Study',
            startedAt: current.startedAt,
            elapsedSeconds: currentSeconds,
            status,
          },
        } : {}),
      },
    });
  };

  if (currentSession && focusTimerController) {
    const _keepUnusedImport = getFocusedMilliseconds;
    void _keepUnusedImport;

    return (
      <>
        {__DEV__ && <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open realtime diagnostics"
          onPress={() => setShowDiagnosticPanel((visible) => !visible)}
          style={[styles.diagnosticButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Txt size={11} weight="700">Realtime diagnostics</Txt>
        </Pressable>}
        {__DEV__ && showDiagnosticPanel ? (
          <View style={[styles.diagnosticPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Txt size={11}>Session user: {diagnosticState.sessionId ?? 'none'}</Txt>
            <Txt size={11}>Verified user: {diagnosticState.verifiedUserId ?? 'none'}</Txt>
            <Txt size={11}>Session/token: {diagnosticState.sessionExists ? 'yes' : 'no'} / {diagnosticState.authTokenPresent ? 'present' : 'missing'}</Txt>
            <Txt size={11}>Membership/topic: {diagnosticState.activeGroupMembershipMatch ? 'match' : 'no match'} / {diagnosticState.topic ?? 'none'}</Txt>
            <Txt size={11}>Subscription: {diagnosticState.subscriptionStatus}</Txt>
            {diagnosticState.authorizationError ? <Txt size={11} color={colors.danger}>Error: {diagnosticState.authorizationError}</Txt> : null}
          </View>
        ) : null}
        <GeminiFocusTimer
          timer={focusTimerController}
          subject={activeSubject}
          groupName="Group"
          onPause={togglePause}
          onStop={() => requestEndSession(Date.now(), { onCompleted: navigateToCompletion })}
          onBreak={toggleBreak}
          onReset={resetSession}
          onGroupPress={() => setGroupSelectModalVisible(true)}
          onMusicPress={() => setMusicSelectionVisible(true)}
          blockedAppsCount={5}
          onManageBlockedApps={() => navigation.navigate('FocusLock')}
          onNavigateApp={leaveFocusCenterTo}
        />
        <FocusMusicSelection
          visible={musicSelectionVisible}
          selectedId={selectedMusicId}
          volume={storeState.settings?.focusMusicVolume ?? 0.65}
          sessionRunning={currentSession.phase === 'focus'}
          onSelect={(id) => dispatch({ type: 'settings', patch: { focusMusicId: id } })}
          onClose={() => setMusicSelectionVisible(false)}
        />

        <Modal animationType="slide" transparent visible={groupSelectModalVisible} onRequestClose={() => setGroupSelectModalVisible(false)}>
          <View style={styles.bottomSheetBackdrop}>
            <SSDSSurface variant="elevated" style={[styles.bottomSheetCard, { backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border }]}>
              <View style={styles.sheetHandle} />
              <View style={styles.modalHeader}>
                <SSDSText variant="CardTitle" style={{ fontSize: 18, fontWeight: '800' }}>Your Groups</SSDSText>
                <Pressable accessibilityRole="button" accessibilityLabel="Close group selection" onPress={() => setGroupSelectModalVisible(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
              <Txt size={12} color={colors.textMuted} style={{ marginBottom: 10 }}>
                Choose a joined group&apos;s Silent Focus Hall. Your current focus session will keep running.
              </Txt>
              {joinedGroupsLoading ? (
                <Txt size={13} color={colors.textMuted}>Loading your joined groups…</Txt>
              ) : joinedGroupsError ? (
                <Txt size={13} color={colors.danger}>{joinedGroupsError}</Txt>
              ) : joinedGroups.length === 0 ? (
                <Txt size={13} color={colors.textMuted}>You have not joined any study groups yet.</Txt>
              ) : joinedGroups.map((group) => (
                <Pressable
                  key={group.id}
                  accessibilityRole="button"
                  onPress={() => openJoinedGroup(group)}
                  style={[styles.optionRow, { backgroundColor: colors.surfaceAlt }]}
                >
                  <View style={{ flex: 1 }}>
                    <Txt size={14} weight="700">{group.name}</Txt>
                    <Txt size={11} color={colors.textMuted} style={{ marginTop: 2 }}>Open Silent Focus Hall</Txt>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.blue} />
                </Pressable>
              ))}
            </SSDSSurface>
          </View>
        </Modal>

        <Modal
          visible={earlyExitConfirmationVisible}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={stayInSession}
        >
          <View style={[styles.modalBackdrop, { paddingTop: Math.max(20, insets.top), paddingBottom: Math.max(20, insets.bottom) }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss leave confirmation"
              style={StyleSheet.absoluteFill}
              onPress={stayInSession}
            />
            <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border, padding: 20 }]}>
              <View style={styles.popupHeaderRow}>
                <Txt size={17} weight="800" style={{ flex: 1 }}>Are you sure you want to leave?</Txt>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close leave confirmation"
                  hitSlop={8}
                  onPress={stayInSession}
                  style={({ pressed }) => [styles.popupCloseButton, { backgroundColor: pressed ? colors.surfaceAlt : 'transparent' }]}
                >
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
              <Txt size={13} color={colors.textMuted} style={{ marginTop: 6 }}>
                This session has not been saved.
              </Txt>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel and continue focus"
                  onPress={stayInSession}
                  style={({ pressed }) => ({
                    minHeight: 46,
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
                  })}
                >
                  <Txt size={13} weight="700">Stay</Txt>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isFinalizing}
                  onPress={() => {
                    const current = sessionRef.current;
                    if (!current) return;
                    returningToOrigin.current = true;
                    void discardSession(current, () => {
                      if (route.params?.roomFocus) navigation.setParams({ roomFocus: undefined });
                      navigation.popTo(current.groupId ? 'Groups' : sessionOrigin.current);
                    });
                  }}
                  style={({ pressed }) => ({
                    minHeight: 46,
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    backgroundColor: colors.danger,
                    opacity: isFinalizing ? 0.6 : pressed ? 0.85 : 1,
                  })}
                >
                  <Txt size={13} weight="700" color="#FFFFFF">Leave</Txt>
                </Pressable>
              </View>
              {saveError ? <Txt size={12} color={colors.danger} style={{ marginTop: 10 }}>{saveError}</Txt> : null}
            </View>
          </View>
        </Modal>

        <Modal
          visible={endConfirmationVisible}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={cancelEndSession}
        >
          <View style={[styles.bottomSheetBackdrop, { paddingTop: insets.top }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss stop confirmation"
              style={StyleSheet.absoluteFill}
              onPress={cancelEndSession}
            />
            <View
              style={[
                styles.bottomSheetCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  maxHeight: Math.max(320, (height - insets.top - insets.bottom) * 0.9),
                  paddingBottom: Math.max(24, insets.bottom + 16),
                },
              ]}
            >
              <View style={styles.sheetTopBar}>
                <View style={styles.sheetTopSpacer} />
                <View style={styles.sheetHandle} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close stop confirmation"
                  hitSlop={8}
                  onPress={cancelEndSession}
                  style={({ pressed }) => [styles.popupCloseButton, { backgroundColor: pressed ? colors.surfaceAlt : 'transparent' }]}
                >
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                <View style={{ alignItems: 'center', marginBottom: 18 }}>
                  <View style={[styles.endIcon, { backgroundColor: `${colors.amber}20` }]}>
                    <Ionicons name="hourglass-outline" size={24} color={colors.amber} />
                  </View>
                  <Txt size={20} weight="800" style={{ marginTop: 12 }}>End Focus Session?</Txt>
                  <Txt size={13} color={colors.textMuted} style={{ textAlign: 'center', marginTop: 5 }}>
                    Your focused time is ready to save or discard.
                  </Txt>
                </View>
                <View style={[styles.sessionSummary, { backgroundColor: colors.surfaceAlt }]}>
                  <View style={styles.summaryRow}>
                    <Txt size={12} color={colors.textMuted}>Actual focused time</Txt>
                    <Txt size={15} weight="800" style={{ fontVariant: ['tabular-nums'] }}>{formatFocusClock(actualFocusedSeconds)}</Txt>
                  </View>
                  <View style={styles.summaryRow}>
                    <Txt size={12} color={colors.textMuted}>Planned duration</Txt>
                    <Txt size={13} weight="700">
                      {currentSession?.plannedSeconds === null ? 'Open-ended' : formatFocusClock(currentSession?.plannedSeconds ?? 0)}
                    </Txt>
                  </View>
                  {currentSession?.topic || currentSession?.subject || currentSession?.activity ? (
                    <View style={styles.summaryRow}>
                      <Txt size={12} color={colors.textMuted}>
                        {currentSession.tagType === 'activity' ? 'Activity' : 'Subject / task'}
                      </Txt>
                      <Txt size={13} weight="700" numberOfLines={2} style={{ maxWidth: '60%', textAlign: 'right' }}>
                        {currentSession.tagType === 'activity'
                          ? currentSession.activity
                          : [currentSession.topic, currentSession.subject].filter(Boolean).join(' · ')}
                      </Txt>
                    </View>
                  ) : null}
                  <View style={styles.summaryRow}>
                    <Txt size={12} color={colors.textMuted}>Mode</Txt>
                    <Txt size={13} weight="700">{currentSession?.mode.charAt(0).toUpperCase()}{currentSession?.mode.slice(1)}</Txt>
                  </View>
                </View>
                {saveError ? <Txt size={12} color={colors.danger} style={{ marginVertical: 10 }}>{saveError}</Txt> : null}
              </ScrollView>
              <View style={{ gap: 10, marginTop: 16 }}>
                <Button
                  label="Save Session"
                  icon="checkmark"
                  full
                  disabled={isFinalizing}
                  onPress={() => {
                    const current = sessionRef.current;
                    if (current) {
                      void completeSession(current, 'saved_early', current.pendingRecord, {
                        onCompleted: navigateToCompletion,
                      });
                    }
                  }}
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancel and continue focus"
                    disabled={isFinalizing}
                    onPress={cancelEndSession}
                    style={({ pressed }) => ({
                      minHeight: 48,
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 12,
                      backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                    })}
                  >
                    <Txt size={13} weight="700" color={colors.text}>Continue Focus</Txt>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isFinalizing}
                    onPress={() => {
                      const current = sessionRef.current;
                      if (!current) return;
                      returningToOrigin.current = true;
                      void discardSession(current, () => {
                        if (route.params?.roomFocus) navigation.setParams({ roomFocus: undefined });
                        navigation.popTo(current.groupId ? 'Groups' : sessionOrigin.current);
                      });
                    }}
                    style={({ pressed }) => ({
                      minHeight: 48,
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 12,
                      backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                    })}
                  >
                    <Txt size={13} weight="700" color={colors.danger}>Delete Session</Txt>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Modal>
        {saveError && !endConfirmationVisible ? (
          <View pointerEvents="none" style={[styles.errorBanner, { backgroundColor: colors.surface, borderColor: colors.danger }]}>
            <Txt size={12} color={colors.danger}>{saveError}</Txt>
          </View>
        ) : null}
      </>
    );
  }

  return null;
}

function StandaloneFocusCenter() {
  const focus = useFocusSession();
  return <FocusCenterContent focus={focus} />;
}

export default function FocusCenterScreen() {
  const existing = useOptionalFocusSession();
  if (existing) {
    return <FocusCenterContent focus={existing} />;
  }
  return (
    <FocusSessionProvider>
      <StandaloneFocusCenter />
    </FocusSessionProvider>
  );
}

const styles = StyleSheet.create({
  diagnosticButton: { position: 'absolute', top: 12, right: 16, zIndex: 6, minHeight: 36, paddingHorizontal: 10, justifyContent: 'center', borderWidth: 1, borderRadius: 10 },
  diagnosticPanel: { position: 'absolute', top: 54, right: 16, zIndex: 6, width: 280, padding: 12, gap: 4, borderWidth: 1, borderRadius: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 420, maxHeight: '90%', borderRadius: 20, padding: 20, borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  optionRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, marginBottom: 8 },
  textInput: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 13.5 },
  addButton: { minWidth: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingHorizontal: 14 },
  menuRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, marginBottom: 10 },
  menuLabel: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, marginRight: 8 },
  menuAction: { minHeight: 40, minWidth: 56, alignItems: 'center', justifyContent: 'center' },
  bottomSheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheetCard: { width: '100%', maxWidth: 620, alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 30, borderWidth: 1, borderBottomWidth: 0 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 4 },
  sheetTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sheetTopSpacer: { width: 36, height: 36 },
  popupHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  popupCloseButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  endIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sessionSummary: { padding: 14, borderRadius: 16, gap: 12 },
  summaryRow: { minHeight: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  errorBanner: { position: 'absolute', top: 24, left: 16, right: 16, padding: 12, borderWidth: 1, borderRadius: 12 },
});
