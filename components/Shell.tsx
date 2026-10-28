import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radii, shadow, useTheme } from '../lib/theme';
import { useStore } from '../lib/store';
import { Logo, LogoMark } from './Logo';
import { Avatar, Divider, IconButton, Txt } from './ui';

export type NavKey =
  | 'Dashboard'
  | 'Library'
  | 'PYQ'
  | 'Tests'
  | 'CurrentAffairs'
  | 'SakhaAI'
  | 'Search'
  | 'Notifications'
  | 'Profile'
  | 'Settings'
  | 'Admin'
  | 'Statistics';

type NavItem = { key: NavKey; label: string; icon: keyof typeof Ionicons.glyphMap; adminOnly?: boolean };

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Study',
    items: [
      { key: 'Dashboard', label: 'Dashboard', icon: 'home-outline' },
      { key: 'Statistics', label: 'Statistics', icon: 'analytics-outline' },
      { key: 'Library', label: 'Library', icon: 'library-outline' },
      { key: 'PYQ', label: 'PYQ Bank', icon: 'albums-outline' },
      { key: 'Tests', label: 'Test Series', icon: 'timer-outline' },
      { key: 'CurrentAffairs', label: 'Current Affairs', icon: 'newspaper-outline' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { key: 'SakhaAI', label: 'Sakha AI', icon: 'sparkles-outline' },
      { key: 'Search', label: 'Search', icon: 'search-outline' },
      { key: 'Notifications', label: 'Notifications', icon: 'notifications-outline' },
    ],
  },
  {
    title: 'Account',
    items: [
      { key: 'Profile', label: 'Profile', icon: 'person-outline' },
      { key: 'Settings', label: 'Settings', icon: 'settings-outline' },
      { key: 'Admin', label: 'Admin Portal', icon: 'shield-checkmark-outline', adminOnly: true },
    ],
  },
];

const MOBILE_TABS: NavItem[] = [
  { key: 'Dashboard', label: 'Home', icon: 'home' },
  { key: 'Library', label: 'Library', icon: 'library' },
  { key: 'Tests', label: 'Tests', icon: 'timer' },
  { key: 'SakhaAI', label: 'Sakha AI', icon: 'sparkles' },
];

export function useLayout() {
  const { width } = useWindowDimensions();
  return {
    width,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1180,
    isDesktop: width >= 1180,
  };
}

export function Shell({
  active,
  title,
  subtitle,
  children,
  scroll = true,
  maxWidth = 1180,
  headerRight,
  contentPadding = 20,
}: {
  active: NavKey;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
  maxWidth?: number;
  headerRight?: React.ReactNode;
  contentPadding?: number;
}) {
  const { colors, mode } = useTheme();
  const nav = useNavigation<any>();
  const { isMobile, isTablet, isDesktop } = useLayout();
  const insets = useSafeAreaInsets();
  const { state, unread, dispatch } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const isAdmin = state.user?.role === 'admin';
  const sidebarCollapsed = isTablet ? !collapsed : collapsed;
  const sidebarWidth = sidebarCollapsed ? 76 : 248;

  const go = (key: NavKey) => {
    setMoreOpen(false);
    nav.navigate(key as never);
  };

  const cycleTheme = () => {
    const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
    dispatch({ type: 'settings', patch: { themeMode: next } });
  };

  const Sidebar = (
    <View
      style={{
        width: sidebarWidth,
        backgroundColor: colors.surface,
        borderRightWidth: 1,
        borderRightColor: colors.border,
        paddingTop: 18,
        paddingBottom: 14,
      }}
    >
      <View style={{ paddingHorizontal: sidebarCollapsed ? 18 : 18, marginBottom: 22 }}>
        <Pressable onPress={() => go('Dashboard')}>
          {sidebarCollapsed ? <LogoMark size={38} /> : <Logo size={30} />}
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((i) => !i.adminOnly || isAdmin);
          if (!items.length) return null;
          return (
            <View key={group.title} style={{ marginBottom: 18 }}>
              {!sidebarCollapsed ? (
                <Txt size={10.5} weight="800" color={colors.textFaint} style={{ letterSpacing: 1.3, paddingHorizontal: 20, marginBottom: 8 }}>
                  {group.title.toUpperCase()}
                </Txt>
              ) : (
                <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 20, marginBottom: 12 }} />
              )}
              {items.map((item) => {
                const on = item.key === active;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => go(item.key)}
                    style={({ pressed }) => ({
                      marginHorizontal: 10,
                      marginBottom: 3,
                      height: 44,
                      borderRadius: radii.md,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                      gap: 12,
                      paddingHorizontal: sidebarCollapsed ? 0 : 12,
                      backgroundColor: on ? colors.tint : pressed ? colors.surfaceAlt : 'transparent',
                    })}
                  >
                    <Ionicons name={item.icon} size={19} color={on ? colors.blue : colors.textMuted} />
                    {!sidebarCollapsed ? (
                      <Txt size={13.5} weight={on ? '800' : '600'} color={on ? colors.blue : colors.textMuted}>
                        {item.label}
                      </Txt>
                    ) : null}
                    {!sidebarCollapsed && item.key === 'Notifications' && unread > 0 ? (
                      <View
                        style={{
                          marginLeft: 'auto',
                          minWidth: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: colors.danger,
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingHorizontal: 5,
                        }}
                      >
                        <Txt size={11} weight="800" color="#fff">
                          {unread}
                        </Txt>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      <View style={{ paddingHorizontal: 10, paddingTop: 10 }}>
        <Divider />
        <Pressable
          onPress={() => setCollapsed((c) => !c)}
          style={({ pressed }) => ({
            marginTop: 10,
            height: 42,
            borderRadius: radii.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            gap: 10,
            paddingHorizontal: sidebarCollapsed ? 0 : 12,
            backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
          })}
        >
          <Ionicons name={sidebarCollapsed ? 'chevron-forward-outline' : 'chevron-back-outline'} size={18} color={colors.textFaint} />
          {!sidebarCollapsed ? (
            <Txt size={12.5} weight="700" color={colors.textFaint}>
              Collapse
            </Txt>
          ) : null}
        </Pressable>
      </View>
    </View>
  );

  const TopBar = (
    <View
      style={{
        height: 66,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        gap: 14,
        zIndex: 10,
      }}
    >
      <View style={{ flex: 1 }}>
        <Txt size={17} weight="800" display numberOfLines={1}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt size={12} color={colors.textMuted} numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>

      {isDesktop ? (
        <Pressable
          onPress={() => go('Search')}
          style={({ pressed }) => ({
            width: 300,
            height: 40,
            borderRadius: radii.pill,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: pressed ? colors.surfaceAlt : colors.bg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 9,
            paddingHorizontal: 14,
          })}
        >
          <Ionicons name="search-outline" size={16} color={colors.textFaint} />
          <Txt size={13} color={colors.textFaint}>
            Search notes, PYQs, tests…
          </Txt>
          <View
            style={{
              marginLeft: 'auto',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 6,
              backgroundColor: colors.surfaceAlt,
            }}
          >
            <Txt size={10.5} weight="700" color={colors.textFaint}>
              /
            </Txt>
          </View>
        </Pressable>
      ) : (
        <IconButton icon="search-outline" onPress={() => go('Search')} />
      )}

      {headerRight}
      <IconButton icon={mode === 'dark' ? 'moon' : mode === 'light' ? 'sunny-outline' : 'contrast-outline'} onPress={cycleTheme} />
      <IconButton icon="notifications-outline" badge={unread} onPress={() => go('Notifications')} />
      <Pressable onPress={() => go('Profile')} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, flexDirection: 'row', alignItems: 'center', gap: 9 })}>
        <Avatar name={state.user?.name ?? 'Guest User'} size={36} />
        {isDesktop ? (
          <View>
            <Txt size={12.5} weight="800">
              {state.user?.name.split(' ')[0] ?? 'Guest'}
            </Txt>
            <Txt size={11} color={colors.textFaint}>
              {state.user?.role === 'admin' ? 'Administrator' : 'Aspirant'}
            </Txt>
          </View>
        ) : null}
      </Pressable>
    </View>
  );

  const MobileHeader = (
    <View
      style={{
        paddingTop: insets.top + 8,
        paddingBottom: 10,
        paddingHorizontal: 16,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Pressable onPress={() => go('Dashboard')} style={{ flex: 1 }}>
        <Logo size={26} compact />
      </Pressable>
      <IconButton icon={mode === 'dark' ? 'moon' : mode === 'light' ? 'sunny-outline' : 'contrast-outline'} onPress={cycleTheme} size={19} />
      <IconButton icon="notifications-outline" badge={unread} onPress={() => go('Notifications')} size={19} />
      <Pressable onPress={() => go('Profile')} style={{ marginLeft: 4 }}>
        <Avatar name={state.user?.name ?? 'Guest User'} size={32} />
      </Pressable>
    </View>
  );

  const BottomNav = (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: Math.max(insets.bottom, 8),
        paddingTop: 8,
        ...shadow(colors, 2),
      }}
    >
      {MOBILE_TABS.map((t) => {
        const on = t.key === active;
        return (
          <Pressable key={t.key} onPress={() => go(t.key)} style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 }}>
            <Ionicons name={on ? t.icon : (`${t.icon}-outline` as any)} size={21} color={on ? colors.blue : colors.textFaint} />
            <Txt size={10.5} weight={on ? '800' : '600'} color={on ? colors.blue : colors.textFaint}>
              {t.label}
            </Txt>
          </Pressable>
        );
      })}
      <Pressable onPress={() => setMoreOpen(true)} style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 }}>
        <Ionicons name="grid-outline" size={21} color={moreOpen ? colors.blue : colors.textFaint} />
        <Txt size={10.5} weight="600" color={moreOpen ? colors.blue : colors.textFaint}>
          More
        </Txt>
      </Pressable>
    </View>
  );

  const body = (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{
            padding: contentPadding,
            paddingBottom: contentPadding + 40,
            alignSelf: 'center',
            width: '100%',
            maxWidth,
          }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, width: '100%', maxWidth, alignSelf: 'center' }}>{children}</View>
      )}
    </View>
  );

  if (isMobile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {MobileHeader}
        <View style={{ flex: 1 }}>
          {scroll ? (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
              <View style={{ marginBottom: 14 }}>
                <Txt size={21} weight="800" display>
                  {title}
                </Txt>
                {subtitle ? (
                  <Txt size={12.5} color={colors.textMuted}>
                    {subtitle}
                  </Txt>
                ) : null}
              </View>
              {children}
            </ScrollView>
          ) : (
            <View style={{ flex: 1 }}>
              <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
                <Txt size={21} weight="800" display>
                  {title}
                </Txt>
                {subtitle ? (
                  <Txt size={12.5} color={colors.textMuted}>
                    {subtitle}
                  </Txt>
                ) : null}
              </View>
              {children}
            </View>
          )}
        </View>
        {BottomNav}
        <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} onGo={go} active={active} isAdmin={isAdmin} unread={unread} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
      {Sidebar}
      <View style={{ flex: 1 }}>
        {TopBar}
        {body}
      </View>
    </View>
  );
}

function MoreSheet({
  open,
  onClose,
  onGo,
  active,
  isAdmin,
  unread,
}: {
  open: boolean;
  onClose: () => void;
  onGo: (k: NavKey) => void;
  active: NavKey;
  isAdmin: boolean;
  unread: number;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} />
      <View
        style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: radii.xl,
          borderTopRightRadius: radii.xl,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 16) + 8,
          paddingHorizontal: 16,
        }}
      >
        <View style={{ width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 }} />
        {NAV_GROUPS.map((g) => {
          const items = g.items.filter((i) => !i.adminOnly || isAdmin);
          if (!items.length) return null;
          return (
            <View key={g.title} style={{ marginBottom: 14 }}>
              <Txt size={10.5} weight="800" color={colors.textFaint} style={{ letterSpacing: 1.2, marginBottom: 8 }}>
                {g.title.toUpperCase()}
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {items.map((item) => {
                  const on = item.key === active;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => onGo(item.key)}
                      style={({ pressed }) => ({
                        width: '47.5%',
                        flexGrow: 1,
                        borderRadius: radii.md,
                        borderWidth: 1,
                        borderColor: on ? colors.blue : colors.border,
                        backgroundColor: on ? colors.tint : pressed ? colors.surfaceAlt : colors.surface,
                        padding: 13,
                        gap: 8,
                      })}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name={item.icon} size={19} color={on ? colors.blue : colors.textMuted} />
                        {item.key === 'Notifications' && unread > 0 ? (
                          <View
                            style={{
                              marginLeft: 'auto',
                              minWidth: 18,
                              height: 18,
                              borderRadius: 9,
                              backgroundColor: colors.danger,
                              alignItems: 'center',
                              justifyContent: 'center',
                              paddingHorizontal: 4,
                            }}
                          >
                            <Txt size={10.5} weight="800" color="#fff">
                              {unread}
                            </Txt>
                          </View>
                        ) : null}
                      </View>
                      <Txt size={13} weight="700" color={on ? colors.blue : colors.text}>
                        {item.label}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </Modal>
  );
}

export function DetailHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isMobile } = useLayout();
  return (
    <View
      style={{
        paddingTop: (isMobile ? insets.top : 0) + 12,
        paddingBottom: 12,
        paddingHorizontal: 16,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Pressable
        onPress={onBack}
        style={({ pressed }) => ({
          width: 38,
          height: 38,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? colors.surfaceAlt : colors.bg,
          borderWidth: 1,
          borderColor: colors.border,
        })}
      >
        <Ionicons name="chevron-back" size={20} color={colors.text} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Txt size={isMobile ? 15 : 16.5} weight="800" display numberOfLines={1}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt size={11.5} color={colors.textMuted} numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export const platformSelectShadow = Platform.OS === 'web' ? 1 : 2;
export const shellFonts = fonts;
