import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { DimensionValue } from 'react-native';
import type { GroupRoomFocusActivity } from '../lib/groupRoomFocusBridge';
import type { StudyRoomParticipant } from '../lib/groupRoomRealtime';

type HallColors = {
  surface: string;
  surfaceElevated: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  successSoft: string;
  successBorder: string;
  successText: string;
  warningSoft: string;
  warningBorder: string;
  warning: string;
};

type Seat = {
  key: string;
  name: string;
  initials: string;
  subject: string;
  status: 'empty' | 'here' | 'focusing' | 'paused' | 'break';
  elapsedSeconds: number;
  updatedAt: string | null;
  timerColor: string;
};

function formatElapsedTime(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function FocusElapsed({
  elapsedSeconds,
  updatedAt,
  color,
  now,
}: {
  elapsedSeconds: number;
  updatedAt: string | null;
  color: string;
  now: number;
}) {
  const timestamp = updatedAt ? Date.parse(updatedAt) : Number.NaN;
  const elapsedWhileRunning = Number.isFinite(timestamp)
    ? Math.max(0, (now - timestamp) / 1000)
    : 0;
  return (
    <Text style={{ color, fontSize: 12, fontVariant: ['tabular-nums'] }}>
      {formatElapsedTime(elapsedSeconds + elapsedWhileRunning)}
    </Text>
  );
}

function Chair({ seat, colors, seatWidth, now }: { seat: Seat; colors: HallColors; seatWidth: DimensionValue; now: number }) {
  const focusing = seat.status === 'focusing';
  const paused = seat.status === 'paused' || seat.status === 'break';
  const tone = focusing
    ? colors.successText
    : paused
      ? colors.warning
      : colors.textMuted;
  const background = focusing
    ? colors.successSoft
    : paused
      ? colors.warningSoft
      : colors.surface;
  const border = focusing
    ? colors.successBorder
    : paused
      ? colors.warningBorder
      : colors.border;
  const active = focusing || paused;

  return (
    <View
      accessible
      accessibilityLabel={
        seat.status === 'empty'
          ? 'Your Chair, empty'
          : `${seat.name}, ${seat.status === 'here' ? 'in the hall' : seat.status}`
      }
      style={{
        width: seatWidth,
        minHeight: 142,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: border,
        backgroundColor: active ? background : colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
      }}
    >
      <View style={{ width: 52, height: 44, alignItems: 'center', justifyContent: 'flex-end' }}>
        <View style={{
          position: 'absolute',
          top: 0,
          width: 38,
          height: 30,
          borderRadius: 10,
          backgroundColor: active ? tone : colors.surfaceElevated,
          borderWidth: 1,
          borderColor: active ? tone : colors.border,
        }} />
        {seat.status !== 'empty' && (
          <View style={{
            position: 'absolute',
            top: 4,
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={{ color: active ? tone : colors.textSecondary, fontSize: 9, fontWeight: '800' }}>
              {seat.initials}
            </Text>
          </View>
        )}
        <View style={{
          width: 48,
          height: 12,
          borderRadius: 6,
          backgroundColor: active ? tone : colors.surfaceElevated,
          borderWidth: 1,
          borderColor: active ? tone : colors.border,
        }} />
        <View style={{ position: 'absolute', bottom: 0, left: 8, width: 3, height: 7, backgroundColor: active ? tone : colors.textMuted }} />
        <View style={{ position: 'absolute', bottom: 0, right: 8, width: 3, height: 7, backgroundColor: active ? tone : colors.textMuted }} />
      </View>
      <Text numberOfLines={1} style={{ maxWidth: '100%', color: colors.textPrimary, fontSize: 13, fontWeight: '700' }}>
        {seat.status === 'empty' ? 'Your Chair' : seat.name}
      </Text>
      {active ? (
        <>
          <Text numberOfLines={1} style={{ maxWidth: '100%', color: colors.textSecondary, fontSize: 11 }}>
            {seat.subject}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tone }} />
            <Text style={{ color: tone, fontSize: 11, fontWeight: '700' }}>
              {focusing ? 'Focusing' : seat.status === 'break' ? 'On break' : 'Paused'}
            </Text>
            <FocusElapsed elapsedSeconds={seat.elapsedSeconds} updatedAt={focusing ? seat.updatedAt : null} color={seat.timerColor} now={now} />
          </View>
        </>
      ) : seat.status === 'here' ? (
        <Text style={{ color: colors.textMuted, fontSize: 11 }}>In the hall</Text>
      ) : (
        <Text style={{ color: colors.textMuted, fontSize: 11 }}>Ready when you are</Text>
      )}
    </View>
  );
}

export function VirtualStudyHall({
  width,
  userId,
  userName,
  userInitials,
  activity,
  participants,
  colors,
  connectionMessage,
}: {
  width: number;
  userId: string | null;
  userName: string;
  userInitials: string;
  activity: GroupRoomFocusActivity | null;
  participants: StudyRoomParticipant[];
  colors: HallColors;
  connectionMessage: string | null;
}) {
  const selfStatus = activity?.status ?? 'empty';
  const selfSeat: Seat = {
    key: userId ?? 'self',
    name: userName,
    initials: userInitials,
    subject: activity?.subject ?? '',
    status: selfStatus,
    elapsedSeconds: activity?.elapsedSeconds ?? 0,
    updatedAt: activity?.updatedAt ?? null,
    timerColor: colors.textSecondary,
  };
  const peerSeats: Seat[] = participants
    .filter((participant) => participant.userId !== userId)
    .map((participant) => ({
      key: participant.userId,
      name: participant.name,
      initials: participant.initials,
      subject: participant.subject,
      status: participant.focusSessionActive
        ? participant.focusSessionState
        : 'here',
      elapsedSeconds: participant.focusElapsedSeconds,
      updatedAt: participant.focusUpdatedAt,
      timerColor: colors.textSecondary,
    }));
  const columns = width >= 1024 ? 4 : width >= 680 ? 3 : 2;
  const seatWidth: DimensionValue = columns === 4 ? '23%' : columns === 3 ? '31%' : '48%';
  const activeClockSeats = [selfSeat, ...peerSeats].filter((seat) => seat.status === 'focusing');
  const hasRunningSeat = activeClockSeats.length > 0;
  const [now, setNow] = useState(() => Math.max(
    0,
    ...activeClockSeats.map((seat) => seat.updatedAt ? Date.parse(seat.updatedAt) || 0 : 0)
  ));
  useEffect(() => {
    if (!hasRunningSeat) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasRunningSeat]);
  const upperSeats = peerSeats.slice(0, columns);
  const lowerSeats = [selfSeat, ...peerSeats.slice(columns)];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 24, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {connectionMessage && (
          <Text style={{ alignSelf: 'center', color: colors.textMuted, fontSize: 12, textAlign: 'center' }}>
            {connectionMessage}
          </Text>
        )}
        {upperSeats.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
            {upperSeats.map((seat) => <Chair key={seat.key} seat={seat} colors={colors} seatWidth={seatWidth} now={now} />)}
          </View>
        )}
        <View
          accessibilityLabel="Shared study desk"
          style={{
            height: 52,
            marginHorizontal: width >= 760 ? '12%' : 0,
            borderRadius: 14,
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.border,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View style={{ position: 'absolute', top: 10, left: 14, right: 14, height: 1, backgroundColor: colors.border }} />
          <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 }}>
            STUDY DESK
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
          {lowerSeats.map((seat) => <Chair key={seat.key} seat={seat} colors={colors} seatWidth={seatWidth} now={now} />)}
        </View>
      </ScrollView>
    </View>
  );
}
