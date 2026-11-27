import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { AppNavigation } from '../../lib/navigation';
import {
  capturePresentedNotifications,
  isDuplicateNotificationTap,
  navigateWithAppNav,
  resolveNotificationDestination,
} from '../../lib/notifications';
import { mergeNotificationCollections } from '../../lib/notifications/notificationDeduplication';
import {
  fetchNotificationsPage,
  fetchPublishedAnnouncements,
  persistNotificationsArchiveState,
  persistNotificationsReadState,
} from '../../lib/notifications/notificationRepository';
import {
  getActiveAnnouncements,
  getNotificationFilterCounts,
  getUnreadNotificationCount,
  getVisibleNotifications,
  groupNotificationsByDate,
} from '../../lib/notifications/notificationSelectors';
import {
  enqueueNotificationOperation,
  flushNotificationSyncQueue,
  loadDismissedAnnouncementIds,
  saveDismissedAnnouncementIds,
  subscribeToUserNotificationsRealtime,
} from '../../lib/notifications/notificationSync';
import type {
  AnnouncementRecord,
  AppNotification,
  NotificationFilter,
} from '../../lib/notifications/types';
import { useStore } from '../../lib/store';

const PAGE_SIZE = 25;
const UNDO_WINDOW_MS = 4500;

let lastSelectedFilter: NotificationFilter = 'all';
let lastFeedScrollOffset = 0;

export function getSavedFeedScrollOffset(): number {
  return lastFeedScrollOffset;
}

export function saveFeedScrollOffset(offset: number): void {
  lastFeedScrollOffset = Math.max(0, offset);
}

export function useNotifications(navigation: Pick<AppNavigation, 'navigate'>) {
  const { state, dispatch } = useStore();
  const userId = state.user?.id ?? null;

  const [selectedFilter, setSelectedFilterState] = useState<NotificationFilter>(lastSelectedFilter);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);
  const [dismissedAnnouncementIds, setDismissedAnnouncementIds] = useState<Set<string>>(() => new Set());

  const [undoBatch, setUndoBatch] = useState<{ items: AppNotification[]; message: string } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingArchiveItemsRef = useRef<AppNotification[]>([]);
  const mountedRef = useRef(true);

  const setSelectedFilter = useCallback((next: NotificationFilter) => {
    lastSelectedFilter = next;
    setSelectedFilterState(next);
  }, []);

  const commitPendingArchive = useCallback(async (items: AppNotification[]) => {
    if (items.length === 0) return;
    const ids = items.map((item) => item.id);
    if (!userId) return;
    const res = await persistNotificationsArchiveState(ids, false);
    if (!res.ok) {
      await enqueueNotificationOperation(userId, { type: 'archive', ids });
    }
  }, [userId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
      if (pendingArchiveItemsRef.current.length > 0) {
        const items = pendingArchiveItemsRef.current;
        pendingArchiveItemsRef.current = [];
        void commitPendingArchive(items);
      }
    };
  }, [commitPendingArchive]);

  useEffect(() => {
    if (!userId) return;
    void loadDismissedAnnouncementIds(userId).then((ids) => {
      if (mountedRef.current) setDismissedAnnouncementIds(new Set(ids));
    });
  }, [userId]);

  const syncWithBackend = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      await capturePresentedNotifications((notif) => {
        dispatch({ type: 'notify', notif, fromSystem: true });
      });

      if (userId) {
        await flushNotificationSyncQueue(userId);
        const [notifRes, annRes] = await Promise.all([
          fetchNotificationsPage({ userId, limit: PAGE_SIZE, offset: 0 }),
          fetchPublishedAnnouncements(),
        ]);
        if (!mountedRef.current) return;

        if (notifRes.error) {
          setError(notifRes.error);
        } else {
          if (notifRes.items.length > 0) {
            const merged = mergeNotificationCollections(state.notifications, notifRes.items);
            dispatch({ type: 'setNotifications', items: merged });
          }
          setHasMore(notifRes.hasMore);
        }

        if (!annRes.error && annRes.items.length > 0) {
          dispatch({ type: 'setAnnouncements', items: annRes.items });
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Unable to refresh notifications.');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [dispatch, state.notifications, userId]);

  useEffect(() => {
    void syncWithBackend('initial');
    // Only run initial sync on mount / user switch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;
    const unsubscribe = subscribeToUserNotificationsRealtime(userId, {
      onUpsert: (notif) => {
        dispatch({ type: 'notify', notif, fromSystem: true });
      },
      onDelete: (id) => {
        dispatch({ type: 'deleteNotif', id });
      },
    });
    const appSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void flushNotificationSyncQueue(userId);
      }
    });
    return () => {
      unsubscribe();
      appSub.remove();
    };
  }, [dispatch, userId]);

  // Reconcile selection when notifications change
  useEffect(() => {
    if (!selectionMode) return;
    const validIds = new Set(state.notifications.map((n) => n.id));
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (validIds.has(id)) next.add(id);
        else changed = true;
      }
      if (next.size === 0 && prev.size > 0) {
        setSelectionMode(false);
        return new Set();
      }
      return changed ? next : prev;
    });
  }, [selectionMode, state.notifications]);

  const unreadCount = useMemo(
    () => getUnreadNotificationCount(state.notifications),
    [state.notifications],
  );

  const filterCounts = useMemo(
    () => getNotificationFilterCounts(state.notifications),
    [state.notifications],
  );

  const visibleNotifications = useMemo(
    () => getVisibleNotifications(state.notifications, selectedFilter),
    [selectedFilter, state.notifications],
  );

  const paginatedNotifications = useMemo(
    () => visibleNotifications.slice(0, visibleLimit),
    [visibleLimit, visibleNotifications],
  );

  const hasMoreLocalOrRemote = hasMore || visibleNotifications.length > visibleLimit;

  const groupedRows = useMemo(
    () => groupNotificationsByDate(paginatedNotifications),
    [paginatedNotifications],
  );

  const activeAnnouncements = useMemo<AnnouncementRecord[]>(
    () => getActiveAnnouncements(state.announcements, dismissedAnnouncementIds),
    [dismissedAnnouncementIds, state.announcements],
  );

  const loadMore = useCallback(async () => {
    if (visibleNotifications.length > visibleLimit) {
      setVisibleLimit((prev) => prev + PAGE_SIZE);
      return;
    }
    if (!hasMore || !userId || isLoading) return;
    const res = await fetchNotificationsPage({
      userId,
      limit: PAGE_SIZE,
      offset: state.notifications.length,
    });
    if (!res.error && res.items.length > 0) {
      const merged = mergeNotificationCollections(state.notifications, res.items);
      dispatch({ type: 'setNotifications', items: merged });
      setVisibleLimit((prev) => prev + PAGE_SIZE);
    }
    setHasMore(res.hasMore);
  }, [dispatch, hasMore, isLoading, state.notifications, userId, visibleLimit, visibleNotifications.length]);

  const markRead = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    dispatch({ type: 'markNotifsRead', ids });
    if (userId) {
      void persistNotificationsReadState(ids, true).then((res) => {
        if (!res.ok) void enqueueNotificationOperation(userId, { type: 'mark_read', ids });
      });
    }
  }, [dispatch, userId]);

  const markUnread = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    dispatch({ type: 'unreadNotif', ids });
    if (userId) {
      void persistNotificationsReadState(ids, false).then((res) => {
        if (!res.ok) void enqueueNotificationOperation(userId, { type: 'mark_unread', ids });
      });
    }
  }, [dispatch, userId]);

  const markAllRead = useCallback(() => {
    const unreadIds = state.notifications.filter((n) => !n.read && !n.archivedAt).map((n) => n.id);
    if (unreadIds.length === 0) return;
    dispatch({ type: 'readNotif' });
    if (userId) {
      void persistNotificationsReadState(null, true).then((res) => {
        if (!res.ok) void enqueueNotificationOperation(userId, { type: 'mark_all_read' });
      });
    }
  }, [dispatch, state.notifications, userId]);

  const softDelete = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const itemsToRemove = state.notifications.filter((n) => idSet.has(n.id));
    if (itemsToRemove.length === 0) return;

    if (pendingArchiveItemsRef.current.length > 0) {
      const prev = pendingArchiveItemsRef.current;
      pendingArchiveItemsRef.current = [];
      void commitPendingArchive(prev);
    }
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }

    dispatch({ type: 'deleteNotifs', ids });
    pendingArchiveItemsRef.current = itemsToRemove;
    setUndoBatch({
      items: itemsToRemove,
      message:
        itemsToRemove.length === 1
          ? 'Notification deleted'
          : `${itemsToRemove.length} notifications deleted`,
    });

    undoTimerRef.current = setTimeout(() => {
      undoTimerRef.current = null;
      const toCommit = pendingArchiveItemsRef.current;
      pendingArchiveItemsRef.current = [];
      setUndoBatch(null);
      void commitPendingArchive(toCommit);
    }, UNDO_WINDOW_MS);
  }, [commitPendingArchive, dispatch, state.notifications]);

  const undoDelete = useCallback(() => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    const toRestore = pendingArchiveItemsRef.current;
    pendingArchiveItemsRef.current = [];
    setUndoBatch(null);
    if (toRestore.length > 0) {
      dispatch({ type: 'restoreNotifs', items: toRestore });
    }
  }, [dispatch]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  }, []);

  const enterSelectionMode = useCallback((initialId: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([initialId]));
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const selectAllVisible = useCallback(() => {
    const allIds = visibleNotifications.map((n) => n.id);
    if (allIds.length === 0) return;
    setSelectionMode(true);
    setSelectedIds(new Set(allIds));
  }, [visibleNotifications]);

  const openNotification = useCallback((notif: AppNotification) => {
    if (selectionMode) {
      toggleSelection(notif.id);
      return;
    }
    if (!notif.read) {
      markRead([notif.id]);
    }
    if (isDuplicateNotificationTap(notif.id)) return;

    const knownResultIds = state.results.length > 0 ? new Set(state.results.map((r) => r.id)) : undefined;
    const knownPlanIds = state.plannerScheduleItems.length > 0 ? new Set(state.plannerScheduleItems.map((p) => p.id)) : undefined;
    const { target } = resolveNotificationDestination(notif, {
      knownResultIds,
      knownPlanIds,
    });
    if (target && target.screen !== 'Notifications') {
      navigateWithAppNav(navigation, target);
    }
  }, [markRead, navigation, selectionMode, state.plannerScheduleItems, state.results, toggleSelection]);

  const dismissAnnouncement = useCallback((announcementId: string) => {
    setDismissedAnnouncementIds((prev) => {
      const next = new Set(prev);
      next.add(announcementId);
      if (userId) void saveDismissedAnnouncementIds(userId, Array.from(next));
      return next;
    });
  }, [userId]);

  return {
    notifications: visibleNotifications,
    groupedRows,
    unreadCount,
    filterCounts,
    selectedFilter,
    setSelectedFilter,
    selectionMode,
    selectedIds,
    toggleSelection,
    enterSelectionMode,
    exitSelectionMode,
    selectAllVisible,
    isLoading,
    isRefreshing,
    hasMore: hasMoreLocalOrRemote,
    error,
    refresh: () => syncWithBackend('refresh'),
    loadMore,
    markRead,
    markUnread,
    markAllRead,
    softDelete,
    undoBatch,
    undoDelete,
    openNotification,
    activeAnnouncements,
    dismissAnnouncement,
  };
}
