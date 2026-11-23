import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  BreakRoomMessage,
  GroupRoomId,
  GroupRoomPhase,
  getBreakRoomMessages,
} from './groupRooms';
import type { GroupRoomFocusStatus } from './groupRoomFocusBridge';
import { supabase, supabaseConfigured } from './supabase';

type PresencePayload = {
  focusing?: boolean;
  subject?: string;
  focusSessionId?: string;
  focusStartedAt?: string;
  focusSessionActive?: boolean;
  focusSessionState?: GroupRoomFocusStatus;
  focusElapsedSeconds?: number;
  focusUpdatedAt?: string;
};

export type StudyRoomParticipant = {
  userId: string;
  name: string;
  initials: string;
  subject: string;
  focusSessionId: string | null;
  focusStartedAt: string | null;
  streak: number;
  focusing: boolean;
  focusSessionActive: boolean;
  focusSessionState: GroupRoomFocusStatus;
  focusElapsedSeconds: number;
  focusUpdatedAt: string | null;
};

export type StudyRoomReaction = {
  id: string;
  emoji: string;
  name: string;
};

type StudyRoomProfile = {
  user_id: string;
  display_name: string;
  streak: number;
};

type RoomState = {
  key: string;
  participants: StudyRoomParticipant[];
  messages: BreakRoomMessage[];
  phase: GroupRoomPhase;
  lastReaction: StudyRoomReaction | null;
  connected: boolean;
  error: string | null;
};

export type RealtimeDiagnosticState = {
  sessionId: string | null;
  verifiedUserId: string | null;
  sessionExists: boolean;
  authTokenPresent: boolean;
  activeGroupMembershipMatch: boolean;
  topic: string | null;
  subscriptionStatus: string;
  authorizationError: string | null;
  subscriptionStartedBeforeAuth: boolean;
};

const emptyRoomState = (key: string): RoomState => ({
  key,
  participants: [],
  messages: [],
  phase: 'focus',
  lastReaction: null,
  connected: false,
  error: null,
});

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function useGroupRoomRealtime({
  groupId,
  roomId,
  userId,
  displayName,
  subject,
  focusing,
  focusActivity,
}: {
  groupId: string;
  roomId: GroupRoomId | null;
  userId: string | null;
  displayName: string;
  subject: string;
  focusing: boolean;
  focusActivity: {
    roomSessionId: string;
    focusSessionId?: string;
    startedAt?: string;
    subject: string;
    status: GroupRoomFocusStatus;
    elapsedSeconds: number;
    updatedAt: string;
  } | null;
}) {
  const roomKey = `${groupId}:${roomId ?? ''}:${userId ?? ''}`;
  const [roomState, setRoomState] = useState(() => emptyRoomState(''));
  const visibleState = roomState.key === roomKey ? roomState : emptyRoomState(roomKey);
  const updateRoomState = useCallback((
    update: Partial<Omit<RoomState, 'key'>> |
      ((current: RoomState) => Partial<Omit<RoomState, 'key'>>)
  ) => {
    setRoomState((current) => {
      const base = current.key === roomKey ? current : emptyRoomState(roomKey);
      return {
        ...base,
        ...(typeof update === 'function' ? update(base) : update),
        key: roomKey,
      };
    });
  }, [roomKey]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const profileRequestRef = useRef(0);
  const phaseEventSeenRef = useRef(false);
  const presencePayloadRef = useRef<PresencePayload>({});
  useEffect(() => {
    presencePayloadRef.current = {
      focusing,
      subject,
      focusSessionActive: Boolean(focusActivity),
      focusSessionId: focusActivity?.focusSessionId,
      focusStartedAt: focusActivity?.startedAt,
      focusSessionState: focusActivity?.status,
      focusElapsedSeconds: focusActivity?.elapsedSeconds ?? 0,
      focusUpdatedAt: focusActivity?.updatedAt,
    };
  }, [focusActivity, focusing, subject]);
  const refreshParticipants = useCallback((channel: RealtimeChannel, activeRoomId: GroupRoomId) => {
    const presence = channel.presenceState<PresencePayload>();
    const memberIds = Object.keys(presence);
    const requestId = ++profileRequestRef.current;
    if (!memberIds.length) {
      updateRoomState({ participants: [] });
      return;
    }

    void supabase.rpc('get_study_room_member_profiles', {
      group_key: groupId,
      member_ids: memberIds,
    }).then(({ data, error: profileError }) => {
      if (requestId !== profileRequestRef.current) return;
      if (profileError) {
        updateRoomState({
          participants: [],
          error: `Could not load room member profiles: ${profileError.message}`,
        });
        return;
      }

      const profiles = (data ?? []) as StudyRoomProfile[];
      const byId = new Map(profiles.map((profile) => [profile.user_id, profile]));
      const next = Object.entries(presence).flatMap(([presenceKey, entries]) => {
        const profile = byId.get(presenceKey);
        if (!profile) return [];
        const current = entries[entries.length - 1];
        if (!current) return [];
        const name = profile.display_name || 'Aspirant';
        return [{
          userId: profile.user_id,
          name,
          initials: initialsFor(name),
          subject: current.subject || 'Choosing a subject',
          focusSessionId: typeof current.focusSessionId === 'string' ? current.focusSessionId : null,
          focusStartedAt: typeof current.focusStartedAt === 'string' ? current.focusStartedAt : null,
          streak: profile.streak ?? 0,
          focusing: Boolean(current.focusing),
          focusSessionActive: Boolean(current.focusSessionActive),
          focusSessionState: current.focusSessionState === 'focusing' ||
            current.focusSessionState === 'paused' ||
            current.focusSessionState === 'break'
            ? current.focusSessionState
            : 'focusing',
          focusElapsedSeconds: typeof current.focusElapsedSeconds === 'number'
            ? Math.max(0, current.focusElapsedSeconds)
            : 0,
          focusUpdatedAt: typeof current.focusUpdatedAt === 'string'
            ? current.focusUpdatedAt
            : null,
        }];
      });
      updateRoomState({ participants: next });
    }, (profileError: unknown) => {
      if (requestId === profileRequestRef.current) {
        updateRoomState({
          participants: [],
          error: `Could not load room member profiles: ${profileError instanceof Error ? profileError.message : 'Unexpected error'}`,
        });
      }
    });

    if (activeRoomId !== 'pomodoro') updateRoomState({ messages: [] });
  }, [groupId, updateRoomState]);

  useEffect(() => {
    phaseEventSeenRef.current = false;
    channelRef.current = null;
    if (!roomId || !userId || !supabaseConfigured) return;

    let active = true;
    const topic = `study-room:${groupId}:${roomId}`;
    let channel: RealtimeChannel | null = null;
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!active || !session?.access_token) return;
      await supabase.realtime.setAuth(session.access_token);
      if (!active) return;

      channel = supabase.channel(topic, {
        config: { private: true, presence: { key: userId } },
      });
      channelRef.current = channel;

      channel.on('presence', { event: 'sync' }, () => refreshParticipants(channel!, roomId));
      channel.on('broadcast', { event: 'silent-reaction' }, (event) => {
        const reaction = event.payload as { emoji?: unknown; displayName?: unknown };
        if (typeof reaction.emoji === 'string') {
          updateRoomState({ lastReaction: {
            id: `${Date.now()}-${Math.random()}`,
            emoji: reaction.emoji,
            name: typeof reaction.displayName === 'string' ? reaction.displayName : 'A study partner',
          } });
        }
      });
      channel.on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'study_group_rooms',
        filter: `group_id=eq.${groupId}`,
      }, (payload) => {
        const row = payload.new as { room_id?: string; phase?: string };
        if (row.room_id === roomId && (row.phase === 'focus' || row.phase === 'break')) {
          phaseEventSeenRef.current = true;
          updateRoomState({ phase: row.phase });
        }
      });

      if (roomId === 'pomodoro') {
        channel.on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'study_room_break_messages',
          filter: `group_id=eq.${groupId}`,
        }, (payload) => {
          const message = payload.new as BreakRoomMessage;
          if (message.room_id === 'pomodoro') {
            updateRoomState((current) => ({
              messages: current.messages.some((item) => item.id === message.id)
                ? current.messages
                : [...current.messages, message],
            }));
          }
        });
      }

      void supabase.from('study_group_rooms')
        .select('phase')
        .eq('group_id', groupId)
        .eq('room_id', roomId)
        .maybeSingle()
        .then(({ data, error: phaseError }) => {
          if (!active) return;
          if (phaseError) {
            updateRoomState({ error: `Could not load the current room phase: ${phaseError.message}` });
          } else if (!phaseEventSeenRef.current && (data?.phase === 'focus' || data?.phase === 'break')) {
            updateRoomState({ phase: data.phase });
          }
        }, (phaseError: unknown) => {
          if (active) {
            updateRoomState({
              error: `Could not load the current room phase: ${phaseError instanceof Error ? phaseError.message : 'Unexpected error'}`,
            });
          }
        });

      channel.subscribe((status, subscribeError) => {
        if (!active) return;
        if (status === 'SUBSCRIBED') {
          updateRoomState({ connected: true, error: null });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          updateRoomState({
            connected: false,
            participants: [],
            error: subscribeError?.message || `Room realtime connection ${status.toLowerCase()}.`,
          });
        } else if (status === 'CLOSED') {
          updateRoomState({ connected: false, participants: [] });
        }
      });
    })().catch((error: unknown) => {
      if (active) {
        updateRoomState({
          connected: false,
          error: error instanceof Error ? error.message : 'Could not prepare room realtime authorization.',
        });
      }
    });

    return () => {
      active = false;
      channelRef.current = null;
      profileRequestRef.current += 1;
      if (channel) {
        void supabase.removeChannel(channel).catch((removeError: unknown) => {
          console.error('Could not leave the study room realtime channel:', removeError);
        });
      }
    };
  }, [groupId, roomId, userId, refreshParticipants, updateRoomState]);

  useEffect(() => {
    if (roomId !== 'pomodoro' || !visibleState.connected || visibleState.phase === 'focus') return;
    let active = true;
    void getBreakRoomMessages(groupId).then((loadedMessages) => {
      if (active) {
        updateRoomState((current) => {
          const byId = new Map(loadedMessages.map((message) => [message.id, message]));
          current.messages.forEach((message) => byId.set(message.id, message));
          return { messages: [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at)) };
        });
      }
    }).catch((loadError: unknown) => {
      if (active) updateRoomState({ error: loadError instanceof Error ? loadError.message : 'Could not load break chat.' });
    });
    return () => {
      active = false;
    };
  }, [groupId, roomId, updateRoomState, visibleState.connected, visibleState.phase]);

  const trackPresence = useCallback(() => {
    if (!visibleState.connected || !channelRef.current || !userId) return;
    void channelRef.current.track({ ...presencePayloadRef.current, userId }).then((result) => {
      if (result === 'error' || result === 'timed out') {
        updateRoomState({ error: 'Could not update your live study status.' });
      }
    }).catch((trackError: unknown) => {
      updateRoomState({ error: trackError instanceof Error ? trackError.message : 'Could not update your live study status.' });
    });
  }, [updateRoomState, userId, visibleState.connected]);

  useEffect(() => {
    trackPresence();
  }, [focusActivity, focusing, subject, trackPresence]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') trackPresence();
    });
    return () => subscription.remove();
  }, [trackPresence]);

  const sendSilentReaction = useCallback(async (emoji: string) => {
    if (roomId !== 'silent-focus' || !channelRef.current || !visibleState.connected) {
      throw new Error('Silent reactions are unavailable until the room is connected.');
    }
    const result = await channelRef.current.send({
      type: 'broadcast',
      event: 'silent-reaction',
      payload: { emoji, userId, displayName },
    });
    if (result !== 'ok') throw new Error('Could not send the silent reaction.');
  }, [displayName, roomId, userId, visibleState.connected]);

  const setSyncedPhase = useCallback((nextPhase: GroupRoomPhase) => {
    phaseEventSeenRef.current = true;
    updateRoomState({ phase: nextPhase });
  }, [updateRoomState]);

  return {
    participants: visibleState.participants,
    messages: visibleState.phase === 'focus' ? [] : visibleState.messages,
    phase: visibleState.phase,
    setPhase: setSyncedPhase,
    connected: visibleState.connected,
    error: visibleState.error,
    lastReaction: visibleState.lastReaction,
    sendSilentReaction,
  };
}

export type GlobalFocusPresence = {
  sessionId: string;
  subject: string;
  startedAt: string;
  status: GroupRoomFocusStatus;
  elapsedSeconds: number;
};

export function useGroupFocusPresence({
  groupIds,
  userId,
  activity,
  onError,
}: {
  groupIds: string[];
  userId: string | null;
  activity: GlobalFocusPresence | null;
  onError?: (message: string) => void;
}) {
  const activityRef = useRef(activity);
  const onErrorRef = useRef(onError);
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const groupKey = Array.from(new Set(groupIds)).sort().join('|');
  const hasActivity = Boolean(activity);
  const [diagnosticState, setDiagnosticState] = useState<RealtimeDiagnosticState>({
    sessionId: null,
    verifiedUserId: null,
    sessionExists: false,
    authTokenPresent: false,
    activeGroupMembershipMatch: false,
    topic: null,
    subscriptionStatus: 'idle',
    authorizationError: null,
    subscriptionStartedBeforeAuth: false,
  });

  useEffect(() => {
    activityRef.current = activity;
    onErrorRef.current = onError;
  }, [activity, onError]);

  const track = useCallback(async (channel: RealtimeChannel) => {
    const current = activityRef.current;
    if (!current) return;
    try {
      const result = await channel.track({
        userId,
        focusing: current.status === 'focusing',
        subject: current.subject,
        focusSessionId: current.sessionId,
        focusStartedAt: current.startedAt,
        focusSessionActive: true,
        focusSessionState: current.status,
        focusElapsedSeconds: current.elapsedSeconds,
        focusUpdatedAt: new Date().toISOString(),
      });
      if (result === 'error' || result === 'timed out') {
        onErrorRef.current?.('Could not update your live focus status in every joined group.');
      }
    } catch (error) {
      onErrorRef.current?.(error instanceof Error ? error.message : 'Could not update your live focus status.');
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || !hasActivity || !supabaseConfigured || !groupKey) return;
    let active = true;
    let channels: RealtimeChannel[] = [];
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let appStateSubscription: { remove: () => void } | null = null;
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const { data: userData } = await supabase.auth.getUser();
      const session = sessionData.session;
      const topics = groupKey.split('|').map((groupId) => `study-room:${groupId}:silent-focus`);
      setDiagnosticState((current) => ({
        ...current,
        sessionId: session?.user?.id ?? null,
        verifiedUserId: userData.user?.id ?? null,
        sessionExists: Boolean(session),
        authTokenPresent: Boolean(session?.access_token),
        activeGroupMembershipMatch: Boolean(session?.user?.id === userId && groupIds.length),
        topic: topics[0] ?? null,
        subscriptionStartedBeforeAuth: !session,
      }));
      if (!active || !session?.access_token) return;
      await supabase.realtime.setAuth(session.access_token);
      if (!active) return;
      channels = topics.map((topic) => {
        const channel = supabase.channel(topic, {
          config: { private: true, presence: { key: userId } },
        });
        channel.subscribe((status, error) => {
          if (!active) return;
          setDiagnosticState((current) => ({
            ...current,
            topic,
            subscriptionStatus: status,
            authorizationError: error?.message ?? (status === 'SUBSCRIBED' ? null : current.authorizationError),
          }));
          if (status === 'SUBSCRIBED') void track(channel);
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            onErrorRef.current?.(error?.message || `Focus presence connection ${status.toLowerCase()}.`);
          }
        });
        return channel;
      });
      channelsRef.current = channels;
      heartbeat = setInterval(() => channels.forEach((channel) => void track(channel)), 15_000);
      appStateSubscription = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active') channels.forEach((channel) => void track(channel));
      });
    })().catch((error: unknown) => {
      if (!active) return;
      const message = error instanceof Error ? error.message : 'Could not prepare focus presence authorization.';
      setDiagnosticState((current) => ({ ...current, subscriptionStatus: 'ERROR', authorizationError: message }));
      onErrorRef.current?.(message);
    });

    return () => {
      active = false;
      if (heartbeat) clearInterval(heartbeat);
      appStateSubscription?.remove();
      channelsRef.current = [];
      channels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
    };
  }, [groupKey, groupIds.length, hasActivity, track, userId]);

  useEffect(() => {
    channelsRef.current.forEach((channel) => void track(channel));
  }, [activity?.sessionId, activity?.startedAt, activity?.status, activity?.subject, track]);

  return { diagnosticState };
}
