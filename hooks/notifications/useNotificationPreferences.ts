import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
} from '../../lib/notifications';
import {
  createDefaultNotificationPreferences,
  loadLocalNotificationPreferences,
  saveLocalNotificationPreferences,
} from '../../lib/notifications/notificationPreferences';
import {
  fetchRemoteNotificationPreferences,
  persistRemoteNotificationPreferences,
} from '../../lib/notifications/notificationRepository';
import type { NotificationPreferences } from '../../lib/notifications/types';
import { useStore } from '../../lib/store';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export function useNotificationPreferences() {
  const { state, dispatch } = useStore();
  const userId = state.user?.id ?? null;

  const [preferences, setPreferences] = useState<NotificationPreferences>(createDefaultNotificationPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [osPermission, setOsPermission] = useState<PermissionStatus>('undetermined');
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshOsPermission = useCallback(async () => {
    const status = await getNotificationPermissionStatus();
    setOsPermission(status);
    return status;
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      const local = await loadLocalNotificationPreferences(userId);
      if (!active) return;
      setPreferences(local);
      await refreshOsPermission();

      if (userId) {
        const remote = await fetchRemoteNotificationPreferences(userId);
        if (active && remote.preferences && remote.preferences.updatedAt > local.updatedAt) {
          setPreferences(remote.preferences);
          await saveLocalNotificationPreferences(userId, remote.preferences);
        }
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, [refreshOsPermission, userId]);

  const showFeedback = useCallback((msg: string) => {
    setSaveFeedback(msg);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setSaveFeedback(null), 2000);
  }, []);

  const updatePreferences = useCallback(async (
    updater: (prev: NotificationPreferences) => NotificationPreferences,
  ) => {
    const previous = preferences;
    const next: NotificationPreferences = {
      ...updater(previous),
      updatedAt: Date.now(),
    };

    // Optimistic UI update
    setPreferences(next);
    setSaveError(null);
    setSaving(true);

    // Sync global master switch with StoreProvider's settings.notifications
    const nextStoreEnabled = next.general.pushEnabled || next.general.inAppEnabled;
    if (nextStoreEnabled !== state.settings.notifications) {
      dispatch({ type: 'settings', patch: { notifications: nextStoreEnabled } });
    }

    try {
      await saveLocalNotificationPreferences(userId, next);
      if (userId) {
        const res = await persistRemoteNotificationPreferences(userId, next);
        if (!res.ok) {
          // Keep local save but report non-blocking sync note if remote fails?
          // Prompt says: "Optimistic toggle updates. Rollback on persistence failure."
          // If local save succeeded we only rollback on hard persistence failure,
          // or if remote explicitly rejects with auth/RLS error.
          if (res.error && !res.error.includes('not configured')) {
            throw new Error(res.error);
          }
        }
      }
      showFeedback('Saved');
    } catch (err) {
      // Rollback on persistence failure
      setPreferences(previous);
      if ((previous.general.pushEnabled || previous.general.inAppEnabled) !== nextStoreEnabled) {
        dispatch({
          type: 'settings',
          patch: { notifications: previous.general.pushEnabled || previous.general.inAppEnabled },
        });
      }
      setSaveError(err instanceof Error ? err.message : 'Failed to save preference. Reverted.');
    } finally {
      setSaving(false);
    }
  }, [dispatch, preferences, showFeedback, state.settings.notifications, userId]);

  const requestSystemPermission = useCallback(async () => {
    const granted = await requestNotificationPermission();
    await refreshOsPermission();
    return granted;
  }, [refreshOsPermission]);

  const openSystemSettings = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      await Linking.openSettings();
    } catch {
      // Ignore if unsupported
    }
  }, []);

  return {
    preferences,
    loading,
    saving,
    saveFeedback,
    saveError,
    osPermission,
    updatePreferences,
    refreshOsPermission,
    requestSystemPermission,
    openSystemSettings,
  };
}
