import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radii, shadow, useTheme } from '../lib/theme';
import { useStore } from '../lib/store';
import { Logo, LogoMark } from './Logo';
import { Divider, IconButton, Txt } from './ui';

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
  | 'More'
  | 'AppGuide'
  | 'StudentTestimonials'
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
  {
    title: 'More',
    items: [
      { key: 'StudentTestimonials', label: 'Student Testimonials', icon: 'chatbubbles-outline' },
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

export function AppHeader({ safeAreaTop = true }: { safeAreaTop?: boolean }) {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { mode } = useTheme();
  const { state, unread, dispatch } = useStore();
  const parentState = nav.getParent?.()?.getState?.();
  const parentRoute = parentState?.routes?.[parentState.index ?? parentState.routes?.length - 1];
  const isSakhaAI =
    route.name === 'SakhaAI' ||
    route.params?.headerBrand === 'SakhaAI' ||
    parentRoute?.params?.headerBrand === 'SakhaAI';
  const isHome = route.name === 'DashboardRoot' || route.name === 'Dashboard';
  const first = (state.user?.name ?? 'Guest User').trim().split(/\s+/)[0] || 'Guest';

  const cycleTheme = () => {
    const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
    dispatch({ type: 'settings', patch: { themeMode: next } });
  };

  const navigate = (name: string) => {
    let target: any = nav;
    while (target) {
      const routeNames = target.getState?.().routeNames ?? [];
      if (routeNames.includes(name)) {
        target.navigate(name);
        return;
      }
      target = target.getParent?.();
    }
  };

  const openMenu = () => {
    let target: any = nav;
    while (target) {
      if (typeof target.openDrawer === 'function') {
        target.openDrawer();
        return;
      }
      target = target.getParent?.();
    }
  };

  const goHome = () => navigate('DashboardRoot');

  return (
    <LinearGradient
      colors={['#2A1519', '#1F1013', '#150A0C']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: safeAreaTop ? Math.max(insets.top, 45) : 0,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(244, 63, 94, 0.2)',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={openMenu} style={{ marginRight: 10 }} accessibilityRole="button" accessibilityLabel="Open menu">
          <Ionicons name="menu" size={28} color="#FFF" />
        </Pressable>
        <Pressable
          onPress={!isHome && !isSakhaAI ? goHome : undefined}
          disabled={isHome || isSakhaAI}
          accessibilityRole={!isHome && !isSakhaAI ? 'button' : undefined}
          accessibilityLabel={!isHome && !isSakhaAI ? 'Go to Home' : undefined}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <LinearGradient colors={['#E11D48', '#F43F5E', '#FBBF24']} style={{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="book" size={18} color="#FFF" />
          </LinearGradient>
          <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800' }}>
            {isSakhaAI ? (
              <>Sakha <Text style={{ color: '#2DD4BF' }}>AI</Text></>
            ) : (
              <>Study <Text style={{ color: '#2DD4BF' }}>Sakha</Text></>
            )}
          </Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Pressable onPress={cycleTheme} accessibilityRole="button" accessibilityLabel="Toggle theme">
          <Ionicons name="moon-outline" size={20} color="#CBD5E1" />
        </Pressable>
        <Pressable onPress={() => navigate('Notifications')} accessibilityRole="button" accessibilityLabel="Notifications">
          <View>
            <Ionicons name="notifications-outline" size={20} color="#CBD5E1" />
            {unread > 0 ? (
              <View style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1F1013' }}>
                <Text style={{ color: '#FFF', fontSize: 9, fontWeight: 'bold' }}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            ) : null}
          </View>
        </Pressable>
        <Pressable
          onPress={() => navigate('Profile')}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#E11D48', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>{first.charAt(0)}</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
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
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const { isMobile, isTablet, isDesktop } = useLayout();
  const insets = useSafeAreaInsets();
  const { state, unread } = useStore();
  const [collapsed, setCollapsed] = useState(false);

  const isAdmin = state.user?.role === 'admin';
  const sidebarCollapsed = isTablet ? !collapsed : collapsed;
  const sidebarWidth = sidebarCollapsed ? 76 : 248;
  const hasPageHeading = Boolean(title.trim() || subtitle?.trim());

  const go = (key: NavKey) => {
    const routeName = key === 'Dashboard' ? 'DashboardRoot' : key;
    let target: any = nav;
    while (target) {
      const routeNames = target.getState?.().routeNames ?? [];
      if (routeNames.includes(routeName)) {
        target.navigate(routeName);
        return;
      }
      target = target.getParent?.();
    }
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

  const TopBar = hasPageHeading ? (
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
    </View>
  ) : null;

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
      <Pressable onPress={() => go('More')} style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 }}>
        <Ionicons name="grid-outline" size={21} color={active === 'More' ? colors.blue : colors.textFaint} />
        <Txt size={10.5} weight={active === 'More' ? '800' : '600'} color={active === 'More' ? colors.blue : colors.textFaint}>
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
        <AppHeader />
        <View style={{ flex: 1 }}>
          {scroll ? (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
              {hasPageHeading ? (
                <View style={{ marginBottom: 14 }}>
                  <View style={{ marginBottom: 16 }}>
                    {!!title.trim() && (
                      <Txt size={24} weight="800" display>
                        {title}
                      </Txt>
                    )}
                    {!!subtitle?.trim() && (
                      <Txt size={13} color={colors.textMuted} style={{ marginTop: 4 }}>
                        {subtitle}
                      </Txt>
                    )}
                  </View>
                </View>
              ) : null}
              {children}
            </ScrollView>
          ) : (
            <View style={{ flex: 1 }}>
              {hasPageHeading ? (
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
              ) : null}
              {children}
            </View>
          )}
        </View>
        {BottomNav}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
      {Sidebar}
      <View style={{ flex: 1 }}>
        <AppHeader />
        {TopBar}
        {body}
      </View>
    </View>
  );
}

export function MoreOptionsGrid({
  onGo,
  active,
  isAdmin,
  unread,
}: {
  onGo: (k: NavKey) => void;
  active: NavKey;
  isAdmin: boolean;
  unread: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 14 }}>
      {NAV_GROUPS.map((g) => {
        const items = g.items.filter((i) => !i.adminOnly || isAdmin);
        if (!items.length) return null;
        return (
          <View key={g.title} style={{ gap: 8 }}>
            <Txt size={10.5} weight="800" color={colors.textFaint} style={{ letterSpacing: 1.2 }}>
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
  const { isMobile } = useLayout();
  return (
    <>
      <AppHeader safeAreaTop={false} />
      <View
        style={{
          paddingTop: 12,
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
    </>
  );
}

export const platformSelectShadow = Platform.OS === 'web' ? 1 : 2;
export const shellFonts = fonts;
