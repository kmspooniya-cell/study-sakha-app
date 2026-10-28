import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Shell, useLayout } from '../components/Shell';
import { Button, Card, Chip, EmptyState, SectionHeader, Tag, Txt } from '../components/ui';
import { useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';

const KIND_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  test: { icon: 'timer-outline', label: 'Tests' },
  content: { icon: 'library-outline', label: 'Library' },
  streak: { icon: 'flame-outline', label: 'Streak' },
  announcement: { icon: 'megaphone-outline', label: 'Announcement' },
};

const ago = (ts: number) => {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const { state, unread, dispatch } = useStore();
  const { isMobile } = useLayout();
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const list = state.notifications.filter((n) => filter === 'all' || n.kind === filter);

  const tone = (kind: string) =>
    kind === 'test' ? colors.violet : kind === 'content' ? colors.blue : kind === 'streak' ? colors.warning : colors.teal;

  return (
    <Shell
      active="Notifications"
      title="Notifications"
      subtitle={unread ? `${unread} unread update${unread === 1 ? '' : 's'}` : 'You are all caught up'}
      scroll={false}
      headerRight={unread ? <Button label="Mark all read" size="sm" variant="ghost" onPress={() => dispatch({ type: 'readNotif' })} /> : undefined}
    >
      <FlatList
        data={list}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: isMobile ? 16 : 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 600);
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

            {unread && !isMobile ? null : null}
            {unread && isMobile ? (
              <Button label="Mark all as read" icon="checkmark-done-outline" variant="outline" full onPress={() => dispatch({ type: 'readNotif' })} />
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const meta = KIND_META[item.kind];
          const color = tone(item.kind);
          return (
            <Pressable
              onPress={() => {
                dispatch({ type: 'readNotif', id: item.id });
                if (item.kind === 'test') nav.navigate('Tests');
                else if (item.kind === 'content') nav.navigate('Library');
                else if (item.kind === 'streak') nav.navigate('Profile');
              }}
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <Tag label={meta.label} color={color} />
                        <Txt size={11.5} color={colors.textFaint}>
                          {ago(item.at)}
                        </Txt>
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
            body="Test reminders, library updates and streak milestones will land in this inbox."
            action="Browse tests"
            onAction={() => nav.navigate('Tests')}
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
