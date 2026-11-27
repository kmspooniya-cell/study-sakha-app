import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnnouncementCard } from '../components/notifications/AnnouncementCard';
import { NotificationActionMenu } from '../components/notifications/NotificationActionMenu';
import { NotificationEmptyState } from '../components/notifications/NotificationEmptyState';
import { NotificationErrorState } from '../components/notifications/NotificationErrorState';
import { NotificationFilters } from '../components/notifications/NotificationFilters';
import { NotificationHeader } from '../components/notifications/NotificationHeader';
import { NotificationRow } from '../components/notifications/NotificationRow';
import { NotificationSkeleton } from '../components/notifications/NotificationSkeleton';
import { UndoSnackbar } from '../components/notifications/UndoSnackbar';
import { Button, Txt } from '../components/ui';
import {
  getSavedFeedScrollOffset,
  saveFeedScrollOffset,
  useNotifications,
} from '../hooks/notifications/useNotifications';
import type { AppNavigation } from '../lib/navigation';
import type { GroupedNotificationRow } from '../lib/notifications/notificationSelectors';
import type { AnnouncementRecord, AppNotification } from '../lib/notifications/types';
import { radii, useTheme } from '../lib/theme';

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const horizontalPadding = viewportWidth >= 768 ? 20 : 16;
  const navigation = useNavigation<AppNavigation>();
  const flatListRef = useRef<FlatList<GroupedNotificationRow>>(null);

  const {
    notifications,
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
    hasMore,
    error,
    refresh,
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
  } = useNotifications(navigation);

  const [menuNotif, setMenuNotif] = useState<AppNotification | null>(null);
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementRecord | null>(null);
  const [viewAllAnnouncements, setViewAllAnnouncements] = useState(false);

  const handleBack = useCallback(() => {
    if (menuNotif) {
      setMenuNotif(null);
      return true;
    }
    if (selectedAnnouncement) {
      setSelectedAnnouncement(null);
      return true;
    }
    if (viewAllAnnouncements) {
      setViewAllAnnouncements(false);
      return true;
    }
    if (selectionMode) {
      exitSelectionMode();
      return true;
    }
    if (openSwipeId) {
      setOpenSwipeId(null);
      return true;
    }
    if (navigation.canGoBack?.()) {
      navigation.goBack();
    } else {
      navigation.navigate('DashboardRoot');
    }
    return true;
  }, [
    exitSelectionMode,
    menuNotif,
    navigation,
    openSwipeId,
    selectedAnnouncement,
    selectionMode,
    viewAllAnnouncements,
  ]);

  useFocusEffect(
    useCallback(() => {
      const savedOffset = getSavedFeedScrollOffset();
      if (savedOffset > 0 && flatListRef.current) {
        const timer = setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: savedOffset, animated: false });
        }, 50);
        return () => clearTimeout(timer);
      }
      return undefined;
    }, []),
  );

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigation.isFocused && !navigation.isFocused()) return false;
      return handleBack();
    });
    return () => sub.remove();
  }, [handleBack, navigation]);

  const handleToggleRead = useCallback((notif: AppNotification) => {
    if (notif.read) markUnread([notif.id]);
    else markRead([notif.id]);
  }, [markRead, markUnread]);

  const handleDeleteOne = useCallback((notif: AppNotification) => {
    softDelete([notif.id]);
  }, [softDelete]);

  const handleSwipeOpen = useCallback((id: string) => {
    setOpenSwipeId(id);
  }, []);

  const handleSwipeClose = useCallback((id: string) => {
    setOpenSwipeId((prev) => (prev === id ? null : prev));
  }, []);

  const handleBulkMarkRead = useCallback(() => {
    const ids = Array.from(selectedIds);
    markRead(ids);
    exitSelectionMode();
  }, [exitSelectionMode, markRead, selectedIds]);

  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    softDelete(ids);
    exitSelectionMode();
  }, [exitSelectionMode, selectedIds, softDelete]);

  const renderItem = useCallback(({ item }: { item: GroupedNotificationRow }) => {
    if (item.type === 'header') {
      return (
        <View
          style={{
            paddingHorizontal: horizontalPadding,
            paddingTop: 14,
            paddingBottom: 6,
            backgroundColor: colors.bg,
          }}
        >
          <Txt
            size={11}
            weight="700"
            color={colors.textFaint}
            style={{ letterSpacing: 0.8 }}
          >
            {item.title.toUpperCase()}
          </Txt>
        </View>
      );
    }

    const notif = item.notif;
    return (
      <NotificationRow
        notif={notif}
        selectionMode={selectionMode}
        selected={selectedIds.has(notif.id)}
        isSwipeOpen={openSwipeId === notif.id}
        horizontalPadding={horizontalPadding}
        onPress={openNotification}
        onLongPress={(n) => enterSelectionMode(n.id)}
        onPressMore={setMenuNotif}
        onToggleRead={handleToggleRead}
        onDelete={handleDeleteOne}
        onSwipeOpen={handleSwipeOpen}
        onSwipeClose={handleSwipeClose}
      />
    );
  }, [
    colors.bg,
    colors.textFaint,
    enterSelectionMode,
    handleDeleteOne,
    handleSwipeClose,
    handleSwipeOpen,
    handleToggleRead,
    horizontalPadding,
    openNotification,
    openSwipeId,
    selectedIds,
    selectionMode,
  ]);

  const latestAnnouncement = activeAnnouncements[0] ?? null;

  return (
    <View
      testID="notifications-immersive-screen"
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      {/* Sticky Immersive Header */}
      <NotificationHeader
        unreadCount={unreadCount}
        selectionMode={selectionMode}
        selectedCount={selectedIds.size}
        totalVisibleCount={notifications.length}
        onBack={handleBack}
        onMarkAllRead={markAllRead}
        onOpenSettings={() => navigation.navigate('NotificationSettings')}
        onCancelSelection={exitSelectionMode}
        onSelectAll={selectAllVisible}
        onBulkMarkRead={handleBulkMarkRead}
        onBulkDelete={handleBulkDelete}
      />

      {/* Scrollable Feed */}
      <FlatList
        ref={flatListRef}
        data={groupedRows}
        keyExtractor={(row) => row.id}
        renderItem={renderItem}
        style={{ flex: 1, width: '100%' }}
        onScroll={(e) => saveFeedScrollOffset(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={100}
        onEndReached={() => {
          if (hasMore) void loadMore();
        }}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: undoBatch ? 88 : 28,
          flexGrow: 1,
          width: '100%',
          maxWidth: 1080,
          alignSelf: 'center',
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.blue}
            colors={[colors.blue]}
          />
        }
        ListHeaderComponent={
          <View style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle }}>
            <AnnouncementCard
              announcement={latestAnnouncement}
              totalActiveCount={activeAnnouncements.length}
              horizontalPadding={horizontalPadding}
              onPressOpen={setSelectedAnnouncement}
              onPressDismiss={dismissAnnouncement}
              onPressViewAll={() => setViewAllAnnouncements(true)}
            />

            {/* Activity Summary */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: horizontalPadding,
                paddingTop: 14,
                paddingBottom: 2,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Txt size={14} weight="800" display>
                  Activity
                </Txt>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: radii.pill,
                    backgroundColor: colors.surfaceAlt,
                  }}
                >
                  <Txt
                    size={11}
                    weight="600"
                    color={unreadCount > 0 ? colors.blue : colors.textMuted}
                  >
                    {unreadCount} unread
                  </Txt>
                </View>
              </View>

              {unreadCount > 0 ? (
                <Pressable
                  onPress={markAllRead}
                  accessibilityRole="button"
                  accessibilityLabel="Mark all as read"
                  style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: 4 }}
                >
                  <Txt size={12.5} weight="700" color={colors.blue}>
                    Mark all read
                  </Txt>
                </Pressable>
              ) : null}
            </View>

            {/* 5 Smart Filters */}
            <NotificationFilters
              selectedFilter={selectedFilter}
              counts={filterCounts}
              horizontalPadding={horizontalPadding}
              onSelectFilter={(next) => {
                setOpenSwipeId(null);
                setSelectedFilter(next);
              }}
            />

            {error ? (
              <NotificationErrorState
                message={error}
                hasCachedData={notifications.length > 0}
                horizontalPadding={horizontalPadding}
                onRetry={() => void refresh()}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isLoading && notifications.length === 0 ? (
            <NotificationSkeleton />
          ) : (
            <NotificationEmptyState
              filter={selectedFilter}
              totalCount={filterCounts.all}
              onResetFilter={() => setSelectedFilter('all')}
            />
          )
        }
      />

      {/* Contextual Action Menu */}
      <NotificationActionMenu
        notif={menuNotif}
        onClose={() => setMenuNotif(null)}
        onOpen={openNotification}
        onToggleRead={handleToggleRead}
        onDelete={handleDeleteOne}
      />

      {/* Undo Snackbar */}
      <UndoSnackbar
        visible={Boolean(undoBatch)}
        message={undoBatch?.message ?? ''}
        onUndo={undoDelete}
      />

      {/* Announcement Detail Modal */}
      <Modal
        visible={Boolean(selectedAnnouncement)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSelectedAnnouncement(null)}
      >
        <Pressable
          onPress={() => setSelectedAnnouncement(null)}
          style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 20 }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation?.()}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.xl,
              padding: 20,
              gap: 12,
              maxHeight: '80%',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="megaphone-outline" size={20} color={colors.teal} />
                <Txt size={12} weight="800" color={colors.teal}>
                  ANNOUNCEMENT
                </Txt>
              </View>
              <Pressable
                onPress={() => setSelectedAnnouncement(null)}
                accessibilityRole="button"
                accessibilityLabel="Close announcement"
                style={{ minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Txt size={18} weight="800" display style={{ marginBottom: 8 }}>
                {selectedAnnouncement?.title}
              </Txt>
              <Txt size={14} color={colors.textMuted} style={{ lineHeight: 21 }}>
                {selectedAnnouncement?.body}
              </Txt>
              {selectedAnnouncement?.audience ? (
                <Txt size={12} color={colors.textFaint} style={{ marginTop: 12 }}>
                  Audience: {selectedAnnouncement.audience}
                </Txt>
              ) : null}
            </ScrollView>
            <Button label="Close" variant="outline" onPress={() => setSelectedAnnouncement(null)} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* View All Announcements Modal */}
      <Modal
        visible={viewAllAnnouncements}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setViewAllAnnouncements(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <View
            style={{
              minHeight: 56,
              paddingHorizontal: 12,
              backgroundColor: colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Pressable
              onPress={() => setViewAllAnnouncements(false)}
              accessibilityRole="button"
              accessibilityLabel="Close all announcements"
              style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </Pressable>
            <Txt size={18} weight="800" display>
              All Announcements
            </Txt>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            {activeAnnouncements.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  setViewAllAnnouncements(false);
                  setSelectedAnnouncement(item);
                }}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 16,
                  gap: 6,
                }}
              >
                <Txt size={15.5} weight="800" display>
                  {item.title}
                </Txt>
                <Txt size={13.5} color={colors.textMuted} numberOfLines={3}>
                  {item.body}
                </Txt>
                <Txt size={11.5} color={colors.textFaint}>
                  {item.audience}
                </Txt>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
