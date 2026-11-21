import type { GroupRoomId } from './groupRooms';

export type GroupRoomFocusStatus = 'focusing' | 'paused' | 'break';

export type GroupRoomFocusActivity = {
  groupId: string;
  roomId: GroupRoomId;
  roomSessionId: string;
  subject: string;
  status: GroupRoomFocusStatus;
  startedAt: string;
  elapsedSeconds: number;
  updatedAt: string;
};

export type GroupRoomFocusEvent =
  | { type: 'start' | 'pause' | 'resume' | 'break' | 'update'; activity: GroupRoomFocusActivity }
  | { type: 'stop'; roomSessionId: string };

let currentActivity: GroupRoomFocusActivity | null = null;
const listeners = new Set<(event: GroupRoomFocusEvent) => void>();

export function getGroupRoomFocusActivity() {
  return currentActivity;
}

export function subscribeGroupRoomFocus(listener: (event: GroupRoomFocusEvent) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function publishGroupRoomFocus(
  activity: GroupRoomFocusActivity,
  type: 'start' | 'pause' | 'resume' | 'break' | 'update' = 'update'
) {
  currentActivity = activity;
  listeners.forEach((listener) => listener({ type, activity }));
}

export function endGroupRoomFocus(roomSessionId: string) {
  if (currentActivity?.roomSessionId !== roomSessionId) return;
  currentActivity = null;
  listeners.forEach((listener) => listener({ type: 'stop', roomSessionId }));
}

// --- Control event mechanism ---

export type GroupRoomFocusControlEvent =
  | { type: 'togglePause'; roomSessionId: string }
  | { type: 'end'; roomSessionId: string };

let controlListeners = new Set<(event: GroupRoomFocusControlEvent) => void>;

export function subscribeGroupRoomFocusControls(
  listener: (event: GroupRoomFocusControlEvent) => void
) {
  controlListeners.add(listener);
  return () => {
    controlListeners.delete(listener);
  };
}

export function publishGroupRoomFocusControl(event: GroupRoomFocusControlEvent) {
  if (event.type === 'end') {
    endGroupRoomFocus(event.roomSessionId);
  }
  controlListeners.forEach((listener) => listener(event));
}
