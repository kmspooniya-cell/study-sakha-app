import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigation } from '../lib/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Shell, useLayout } from '../components/Shell';
import { Button, Card, Chip, EmptyState, SectionHeader, Tag, Txt } from '../components/ui';
import { capturePresentedNotifications, getNotificationDestination } from '../lib/notifications';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';
import type { AppNotification } from '../lib/types';

const KIND_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  planner: { icon: 'calendar-outline', label: 'Planner' },
  focus: { icon: 'hourglass-outline', label: 'Focus' },
  test: { icon: 'timer-outline', label: 'Tests' },
  content: { icon: 'library-outline', label: 'Library' },
  group: { icon: 'people-outline', label: 'Groups' },
  streak: { icon: 'flame-outline', label: 'Streak' },
  announcement: { icon: 'megaphone-outline', label: 'Announcement' },
};

const ago = (ts: number) => {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.round(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

function dateGroupLabel(ts: number): 'Today' | 'Yesterday' | 'Earlier' {
  const target = new Date(ts);
  if (Number.isNaN(target.getTime())) return 'Earlier';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  if (startOfTarget >= startOfToday) return 'Today';
  if (startOfTarget >= startOfYesterday) return 'Yesterday';
  return 'Earlier';
}

type NotificationRowItem =
  | { type: 'header'; id: string; title: 'Today' | 'Yesterday' | 'Earlier' }
  | { type: 'notif'; id: string; notif: AppNotification };

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<AppNavigation>();
  const { state, unread, dispatch } = useStore();
  const { isMobile } = useLayout();
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }, []);

  const list = useMemo(
    () =>
      [...state.notifications]
        .filter((n) => filter === 'all' || n.kind === filter)
        .sort((a, b) => b.at - a.at),
    [filter, state.notifications]
  );

  const groupedRows = useMemo<NotificationRowItem[]>(() => {
    const groups: Record<'Today' | 'Yesterday' | 'Earlier', AppNotification[]> = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };
    list.forEach((notif) => {
      groups[dateGroupLabel(notif.at)].push(notif);
    });
    const rows: NotificationRowItem[] = [];
    (['Today', 'Yesterday', 'Earlier'] as const).forEach((section) => {
      if (groups[section].length === 0) return;
      rows.push({ type: 'header', id: `section-${section}`, title: section });
      groups[section].forEach((notif) => {
        rows.push({ type: 'notif', id: notif.id, notif });
      });
    });
    return rows;
  }, [list]);

  const tone = (kind: string) =>
    kind === 'planner'
      ? colors.blue
      : kind === 'focus'
        ? colors.teal
        : kind === 'test'
          ? colors.violet
          : kind === 'content'
            ? colors.blue
            : kind === 'group'
              ? colors.teal
              : kind === 'streak'
                ? colors.warning
                : colors.teal;

  const handleOpenNotification = (item: AppNotification) => {
    if (!item.read) {
      dispatch({ type: 'readNotif', id: item.id });
    }
    const target = getNotificationDestination(item);
    if (!target) return;
    if (target.screen === 'StudyPlanner') {
      nav.navigate('StudyPlanner', target.params);
    } else if (target.screen === 'Groups') {
      nav.navigate('Groups', target.params);
    } else if (target.screen === 'TestResult' && target.params) {
      nav.navigate('TestResult', target.params);
    } else if (target.screen === 'TestPlayer' && target.params) {
      nav.navigate('TestPlayer', target.params);
    } else if (target.screen === 'Tests') {
      nav.navigate('Tests');
    } else if (target.screen === 'Library') {
      nav.navigate('Library');
    } else if (target.screen === 'Profile') {
      nav.navigate('Profile');
    } else if (target.screen === 'FocusCenter') {
      nav.navigate('FocusCenter');
    }
  };

  return (
    <Shell
      active="Notifications"
      title="Notifications"
      subtitle={unread ? `${unread} unread update${unread === 1 ? '' : 's'}` : 'You are all caught up'}
      scroll={false}
      headerRight={unread ? <Button label="Mark all read" size="sm" variant="ghost" onPress={() => dispatch({ type: 'readNotif' })} /> : undefined}
    >
      <FlatList
        data={groupedRows}
        keyExtractor={(row) => row.id}
        contentContainerStyle={{ padding: isMobile ? 16 : 20, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void capturePresentedNotifications((notif) => {
                dispatch({ type: 'notify', notif, fromSystem: true });
              });
              if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
              refreshTimerRef.current = setTimeout(() => setRefreshing(false), 600);
            }}
            tintColor={colors.blue}
            colors={[colors.blue]}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 10 }}>
            {state.announcements.length ? (
              <Card style={{ gap: 10, borderColor: colors.teal }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                  <Ionicons name="megaphone-outline" size={18} color={colors.teal} />
                  <Txt size={13} weight="800" color={colors.teal}>
                    LATEST ANNOUNCEMENT
                  </Txt>
                </View>
                <Txt size={15} weight="800" display>
                  {state.announcements[0].title}
                </Txt>
                <Txt size={13} color={colors.textMuted}>
                  {state.announcements[0].body}
                </Txt>
                <Txt size={11.5} color={colors.textFaint}>
                  {state.announcements[0].audience} · {ago(state.announcements[0].at)}
                </Txt>
              </Card>
            ) : null}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Chip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
              {Object.entries(KIND_META).map(([k, v]) => (
                <Chip key={k} label={v.label} icon={v.icon} active={filter === k} onPress={() => setFilter(k)} />
              ))}
            </View>

            {unread && isMobile ? (
              <Button label="Mark all as read" icon="checkmark-done-outline" variant="outline" full onPress={() => dispatch({ type: 'readNotif' })} />
            ) : null}
          </View>
        }
        renderItem={({ item: row }) => {
          if (row.type === 'header') {
            return (
              <View style={{ paddingTop: 10, paddingBottom: 6 }}>
                <Txt size={11.5} weight="800" color={colors.textFaint} style={{ letterSpacing: 1.1 }}>
                  {row.title.toUpperCase()}
                </Txt>
              </View>
            );
          }
          const item = row.notif;
          const meta = KIND_META[item.kind] ?? KIND_META.announcement;
          const color = tone(item.kind);
          const destination = getNotificationDestination(item);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.body}`}
              onPress={() => handleOpenNotification(item)}
            >
              {({ pressed }) => (
                <Card style={{ marginBottom: 10, opacity: pressed ? 0.85 : 1, borderColor: item.read ? colors.border : color }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: `${color}1A`, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={meta.icon} size={19} color={color} />
                    </View>
                    <View style={{ flex: 1, gap: 5 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Txt size={14} weight="800" style={{ flex: 1 }} numberOfLines={1}>
                          {item.title}
                        </Txt>
                        {!item.read ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} /> : null}
                      </View>
                      <Txt size={13} color={colors.textMuted}>
                        {item.body}
                      </Txt>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                        <Tag label={meta.label} color={color} />
                        <Txt size={11.5} color={colors.textFaint}>
                          {ago(item.at)}
                        </Txt>
                        {destination ? (
                          <Txt size={11.5} weight="700" color={color}>
                            Open →
                          </Txt>
                        ) : null}
                        <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          {!item.read ? (
                            <Pressable
                              hitSlop={8}
                              accessibilityRole="button"
                              accessibilityLabel={`Mark ${item.title} as read`}
                              onPress={(e) => {
                                e.stopPropagation?.();
                                dispatch({ type: 'readNotif', id: item.id });
                              }}
                            >
                              <Txt size={11.5} weight="700" color={colors.blue}>Mark read</Txt>
                            </Pressable>
                          ) : null}
                          <Pressable
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel={`Delete ${item.title}`}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              dispatch({ type: 'deleteNotif', id: item.id });
                            }}
                          >
                            <Ionicons name="trash-outline" size={16} color={colors.textFaint} />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </View>
                </Card>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="Nothing here yet"
            body="Study reminders, focus updates, group activity and verified announcements will appear here."
          />
        }
        ListFooterComponent={
          state.announcements.length > 1 ? (
            <View style={{ marginTop: 14 }}>
              <SectionHeader title="Earlier announcements" icon="megaphone-outline" />
              {state.announcements.slice(1).map((a) => (
                <Card key={a.id} style={{ marginBottom: 10, gap: 6 }}>
                  <Txt size={14} weight="800">
                    {a.title}
                  </Txt>
                  <Txt size={12.5} color={colors.textMuted}>
                    {a.body}
                  </Txt>
                  <Txt size={11.5} color={colors.textFaint}>
                    {a.audience} · {ago(a.at)}
                  </Txt>
                </Card>
              ))}
            </View>
          ) : null
        }
      />
    </Shell>
  );
}
