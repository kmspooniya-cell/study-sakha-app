import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
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
  | 'Statistics'
  | 'StudyPlanner'
  | 'FocusCenter';

type NavItem = { key: NavKey; label: string; icon: keyof typeof Ionicons.glyphMap; adminOnly?: boolean };

const STITCH_LOGO_PATH = 'M12 3C7.03 3 3 7.03 3 12v7a2 2 0 002 2h4.5a2 2 0 002-2v-4a2 2 0 00-2-2H5c0-3.86 3.14-7 7-7s7 3.14 7 7h-2.5a2 2 0 00-2 2v4a2 2 0 002 2H19a2 2 0 002-2v-7c0-4.97-4.03-9-9-9z';

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Study',
    items: [
      { key: 'Dashboard', label: 'Dashboard', icon: 'home-outline' },
      { key: 'Statistics', label: 'Statistics', icon: 'analytics-outline' },
      { key: 'Library', label: 'Library', icon: 'library-outline' },
      { key: 'PYQ', label: 'PYQ Bank', icon: 'albums-outline' },
      { key: 'Tests', label: 'Test Series', icon: 'timer-outline' },
      { key: 'FocusCenter', label: 'Focus & Wellness', icon: 'stopwatch-outline' },
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
      { key: 'StudyPlanner', label: 'Study Planner', icon: 'calendar-outline' },
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
  const { mode, scheme, colors } = useTheme();
  const { state, unread, dispatch } = useStore();
  const { width } = useWindowDimensions();
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

  const glassBackground = scheme === 'dark' ? 'rgba(20,28,46,0.92)' : 'rgba(248,248,250,0.92)';
  const secondaryText = scheme === 'dark' ? colors.textMuted : '#3C3C4399';

  return (
    <View style={{ backgroundColor: glassBackground, borderBottomWidth: 1, borderBottomColor: `${colors.border}CC`, paddingTop: safeAreaTop ? insets.top : 0 }}>
      <View style={{ width: '108%', maxWidth: width < 768 ? 518 : 743, minHeight: 56, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={openMenu} style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.surfaceAlt : 'transparent' })} accessibilityRole="button" accessibilityLabel="Open menu">
            <Ionicons name="menu-outline" size={22} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={!isHome && !isSakhaAI ? goHome : undefined}
            disabled={isHome || isSakhaAI}
            accessibilityRole={!isHome && !isSakhaAI ? 'button' : undefined}
            accessibilityLabel={!isHome && !isSakhaAI ? 'Go to Home' : undefined}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <LinearGradient colors={['#FF9500', '#FF5E3A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', ...shadow(colors, 1) }}>
              <Svg width={17} height={17} viewBox="0 0 24 24" accessibilityLabel="Study Sakha logo">
                <Path d={STITCH_LOGO_PATH} fill="#FFFFFF" />
              </Svg>
            </LinearGradient>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600', letterSpacing: -0.35 }}>
              {isSakhaAI ? (
                <>Sakha <Text style={{ color: colors.blue, fontWeight: '700' }}>AI</Text></>
              ) : (
                <>Study <Text style={{ color: colors.blue, fontWeight: '700' }}>Sakha</Text></>
              )}
            </Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Pressable onPress={cycleTheme} style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.surfaceAlt : 'transparent' })} accessibilityRole="button" accessibilityLabel="Toggle theme">
            <Ionicons name={scheme === 'dark' ? 'sunny-outline' : 'moon-outline'} size={18} color={secondaryText} />
          </Pressable>
          <Pressable onPress={() => navigate('Notifications')} style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.surfaceAlt : 'transparent' })} accessibilityRole="button" accessibilityLabel="Notifications">
            <View>
              <Ionicons name="notifications-outline" size={20} color={secondaryText} />
              {unread > 0 ? (
                <View style={{ position: 'absolute', top: -5, right: -6, width: 16, height: 16, borderRadius: 8, backgroundColor: scheme === 'dark' ? colors.danger : '#FF3B30', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: scheme === 'dark' ? colors.surface : '#F2F2F7' }}>
                  <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '600' }}>{unread > 9 ? '9+' : unread}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
          <Pressable onPress={() => navigate('Profile')} accessibilityRole="button" accessibilityLabel="Open profile" style={({ pressed }) => ({ width: 32, height: 32, marginLeft: 2, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: scheme === 'dark' ? colors.surface : '#FFFFFF', opacity: pressed ? 0.8 : 1, ...shadow(colors, 1) })}>
            <LinearGradient colors={['#FF3B30', '#FF6B6B']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>{first.charAt(0)}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function AppBottomNav({ active }: { active: NavKey }) {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

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

  const glassBackground = colors.bg === '#0C1220' ? 'rgba(20,28,46,0.94)' : 'rgba(255,255,255,0.88)';
  const inactive = colors.bg === '#0C1220' ? colors.textMuted : '#8E8E93';
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: glassBackground, borderTopWidth: 1, borderTopColor: `${colors.border}CC`, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 20), ...shadow(colors, 2) }}>
      <View style={{ width: '92%', maxWidth: width < 768 ? 383 : 545, alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24 }}>
        {MOBILE_TABS.map((t) => {
          const on = t.key === active;
          return (
            <Pressable key={t.key} onPress={() => go(t.key)} accessibilityRole="button" accessibilityState={{ selected: on }} style={({ pressed }) => ({ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2, opacity: pressed ? 0.6 : 1 })}>
              <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={on ? t.icon : (`${t.icon}-outline` as any)} size={20} color={on ? colors.blue : inactive} />
              </View>
              <Txt size={10} weight={on ? '700' : '500'} color={on ? colors.blue : inactive} style={{ marginTop: 2 }}>
                {t.label}
              </Txt>
            </Pressable>
          );
        })}
        <Pressable onPress={() => go('More')} accessibilityRole="button" accessibilityState={{ selected: active === 'More' }} style={({ pressed }) => ({ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2, opacity: pressed ? 0.6 : 1 })}>
          <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="grid" size={20} color={active === 'More' ? colors.blue : inactive} />
          </View>
          <Txt size={10} weight={active === 'More' ? '700' : '500'} color={active === 'More' ? colors.blue : inactive} style={{ marginTop: 2 }}>
            More
          </Txt>
        </Pressable>
      </View>
    </View>
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
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 112 }} showsVerticalScrollIndicator={false}>
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
            <View style={{ flex: 1, paddingBottom: 112 }}>
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
        <AppBottomNav active={active} />
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
