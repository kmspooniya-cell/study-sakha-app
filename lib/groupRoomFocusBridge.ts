import type { GroupRoomId } from './groupRooms';

export type GroupRoomFocusStatus = 'focusing' | 'paused' | 'break';

export type GroupRoomFocusContext = {
  groupId: string;
  roomId: GroupRoomId;
  roomSessionId: string;
  focusSessionId?: string;
};

export type GroupRoomFocusActivity = {
  groupId: string;
  roomId: GroupRoomId;
  roomSessionId: string;
  focusSessionId?: string;
  subject: string;
  status: GroupRoomFocusStatus;
  startedAt: string;
  elapsedSeconds: number;
  updatedAt: string;
};

export type GroupRoomFocusEvent =
  | { type: 'start' | 'pause' | 'resume' | 'break' | 'update'; activity: GroupRoomFocusActivity }
  | { type: 'stop'; roomSessionId: string };

const currentActivities = new Map<string, GroupRoomFocusActivity>();
const currentContexts = new Map<string, GroupRoomFocusContext>();
const listeners = new Set<(event: GroupRoomFocusEvent) => void>();

export function getGroupRoomFocusActivity(roomSessionId?: string) {
  if (roomSessionId) return currentActivities.get(roomSessionId) ?? null;
  return Array.from(currentActivities.values()).at(-1) ?? null;
}

export function getGroupRoomFocusContext() {
  return Array.from(currentContexts.values()).at(-1) ?? null;
}

export function getGroupRoomFocusContexts() {
  return Array.from(currentContexts.values());
}

export function setGroupRoomFocusContext(context: GroupRoomFocusContext | null) {
  if (context) currentContexts.set(context.roomSessionId, context);
  else currentContexts.clear();
}

export function clearGroupRoomFocusContext(roomSessionId: string) {
  currentContexts.delete(roomSessionId);
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
  currentActivities.set(activity.roomSessionId, activity);
  listeners.forEach((listener) => listener({ type, activity }));
}

export function endGroupRoomFocus(roomSessionId: string) {
  if (!currentActivities.has(roomSessionId)) return;
  currentActivities.delete(roomSessionId);
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
