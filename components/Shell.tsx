import Ionicons from '@expo/vector-icons/Ionicons';
import { StackActions, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Keyboard, Modal, Platform, Pressable, ScrollView, Share, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radii, shadow, useTheme } from '../lib/theme';
import { useStore } from '../lib/store';
import { Logo, LogoMark } from './Logo';
import { Divider, IconButton, Txt } from './ui';
import { getAndroidBackTarget, shouldHideAppShell } from '../lib/navigation';
import type { AppHeaderRoute, AppNavigation, AppStackRouteName } from '../lib/navigation';
import { translateLabel } from '../lib/i18n';
import { getAppShareUrl, getDistributionLinkMessage } from '../lib/shareLinks';

export type NavKey =
| 'Dashboard'
| 'Library'
| 'Groups'
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
| 'Admin'
| 'Statistics'
| 'StudyPlanner';

type NavItem = { key: NavKey; label: string; icon: keyof typeof Ionicons.glyphMap; adminOnly?: boolean };

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
{
title: 'Study',
items: [
{ key: 'Dashboard', label: 'Dashboard', icon: 'home-outline' },
{ key: 'Statistics', label: 'Statistics', icon: 'analytics-outline' },
{ key: 'Library', label: 'Library', icon: 'library-outline' },
{ key: 'Groups', label: 'Groups', icon: 'people-outline' },
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
{ key: 'StudyPlanner', label: 'Study Planner', icon: 'calendar-outline' },
],
},
];

const MOBILE_TABS: NavItem[] = [
{ key: 'Dashboard', label: 'Home', icon: 'home' },
{ key: 'Library', label: 'Library', icon: 'library' },
{ key: 'Groups', label: 'Groups', icon: 'people' },
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

function navigateToRoute(nav: AppNavigation, name: AppStackRouteName) {
const state = nav.getState?.();
const currentRoute = state?.routes?.[state.index ?? 0]?.name;
if (currentRoute === name) return;
const existsInStack = Array.isArray(state?.routes) && state.routes.some((route) => route.name === name);
if (existsInStack) {
nav.dispatch(StackActions.popTo(name));
return;
}
nav.navigate(name as never);
}

export function useSmartAndroidBack(onBack?: () => boolean) {
const nav = useNavigation<AppNavigation>();
const route = useRoute<AppHeaderRoute>();

useFocusEffect(
useCallback(() => {
if (Platform.OS !== 'android' || ['DashboardRoot', 'Groups', 'FocusLock'].includes(route.name)) return;
const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
if (onBack?.()) return true;
const state = nav.getState();
const target = getAndroidBackTarget(route.name, state.routes.slice(0, state.index).map((item) => item.name));
if (!target) return false;
navigateToRoute(nav, target);
return true;
});
return () => subscription.remove();
}, [nav, onBack, route.name])
);
}

export function AppHeader({
safeAreaTop = true,
appHeaderActions,
}: {
safeAreaTop?: boolean;
appHeaderActions?: React.ReactNode;
}) {
const nav = useNavigation<AppNavigation>();
const route = useRoute<AppHeaderRoute>();
const insets = useSafeAreaInsets();
const { mode, scheme, colors } = useTheme();
const { state, unread, dispatch, syncStatus } = useStore();
const language = state.settings.language;

// Overflow Menu States
const [menuVisible, setMenuVisible] = useState(false);
const menuButtonRef = useRef<View>(null);
const { width, height: windowHeight } = useWindowDimensions();
const defaultAnchorTop = (safeAreaTop ? insets.top : 0) + 54;
const defaultAnchorRight = width < 768 ? 14 : 22;
const [menuAnchor, setMenuAnchor] = useState({ top: defaultAnchorTop, right: defaultAnchorRight });

// Help Modal Multi-Step States
const [helpModalVisible, setHelpModalVisible] = useState(false);
const [helpStep, setHelpStep] = useState<1 | 2 | 3>(1);
const [selectedCategory, setSelectedCategory] = useState<'Report an issue' | 'Share an idea' | 'Appreciate the team'>('Report an issue');
const [shareLogs, setShareLogs] = useState(true);
const [includeScreenshot, setIncludeScreenshot] = useState(false);
const [selectedSubIssue, setSelectedSubIssue] = useState('Subscription Issue');
const [descriptionText, setDescriptionText] = useState('');

const parentState = nav.getParent?.()?.getState?.();
const parentRoute = parentState?.routes?.[parentState.index ?? parentState.routes?.length - 1];
const parentHeaderBrand =
parentRoute?.params && 'headerBrand' in parentRoute.params ? parentRoute.params.headerBrand : undefined;
const routeHeaderBrand =
route.params && 'headerBrand' in route.params ? route.params.headerBrand : undefined;

const isSakhaAI =
route.name === 'SakhaAI' ||
routeHeaderBrand === 'SakhaAI' ||
parentHeaderBrand === 'SakhaAI';

const isHome = route.name === 'DashboardRoot';

const cycleTheme = () => {
const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
dispatch({ type: 'settings', patch: { themeMode: next } });
};

const navigate = useCallback((name: AppStackRouteName) => {
setMenuVisible(false);
navigateToRoute(nav, name);
}, [nav]);
const goHome = () => navigate('DashboardRoot');

useEffect(() => {
const addListener = (nav as { addListener?: (event: string, listener: () => void) => () => void }).addListener;
if (!addListener) return undefined;
return addListener('blur', () => {
setMenuVisible(false);
});
}, [nav]);

const closeMenu = useCallback(() => setMenuVisible(false), []);

const openOverflowMenu = useCallback(() => {
const fallbackTop = Math.max(insets.top + 8, Math.min(defaultAnchorTop, windowHeight - 230));
const fallbackRight = Math.max(12, defaultAnchorRight);
setMenuAnchor({ top: fallbackTop, right: fallbackRight });
setMenuVisible(true);
const buttonNode = menuButtonRef.current;
if (buttonNode && typeof buttonNode.measureInWindow === 'function') {
buttonNode.measureInWindow((x, y, buttonWidth, buttonHeight) => {
if (!Number.isFinite(x) || !Number.isFinite(y) || buttonWidth <= 0 || buttonHeight <= 0) return;
const clampedTop = Math.max(insets.top + 8, Math.min(y + buttonHeight + 6, windowHeight - 230));
const clampedRight = Math.max(12, Math.min(width - (x + buttonWidth), width - 220));
setMenuAnchor({ top: clampedTop, right: clampedRight });
});
}
}, [defaultAnchorRight, defaultAnchorTop, insets.top, width, windowHeight]);

const openHelpModal = useCallback(() => {
setMenuVisible(false);
setHelpStep(1);
setHelpModalVisible(true);
}, []);

const handleShareApp = useCallback(async () => {
setMenuVisible(false);
try {
const url = getAppShareUrl();
const result = await Share.share(
{
title: 'Study Sakha',
message: `I'm using Study Sakha to prepare for competitive exams. ${getDistributionLinkMessage()}\n${url}`,
...(Platform.OS === 'ios' ? { url } : {}),
},
{ dialogTitle: 'Share Study Sakha' }
);
if (result?.action === Share.dismissedAction) return;
} catch (error) {
if (error instanceof Error && error.name === 'AbortError') return;
Alert.alert(
'Unable to share',
error instanceof Error ? error.message : 'Sharing is not supported on this device.'
);
}
}, []);

const glassBackground = scheme === 'dark' ? 'rgba(20,28,46,0.92)' : 'rgba(248,248,250,0.92)';
const secondaryText = colors.textMuted;

const handleContinue = () => {
if (helpStep === 1) {
if (selectedCategory === 'Report an issue') {
setHelpStep(2);
} else {
setHelpStep(3);
}
} else if (helpStep === 2) {
setHelpStep(3);
} else {
// Final Submit
setHelpModalVisible(false);
setHelpStep(1);
setDescriptionText('');
}
};

const handleBack = () => {
if (helpStep === 3) {
setHelpStep(selectedCategory === 'Report an issue' ? 2 : 1);
} else if (helpStep === 2) {
setHelpStep(1);
}
};

return (
<View style={{ backgroundColor: glassBackground, borderBottomWidth: 1, borderBottomColor: `${colors.border}CC`, paddingTop: safeAreaTop ? insets.top : 0 }}>
<View style={{ width: '100%', minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: width < 768 ? 16 : 24 }}>
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
<Pressable
onPress={!isHome && !isSakhaAI ? goHome : undefined}
disabled={isHome || isSakhaAI}
accessibilityRole={!isHome && !isSakhaAI ? 'button' : undefined}
accessibilityLabel={!isHome && !isSakhaAI ? 'Go to Home' : undefined}
style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
>
<Logo size={30} compact wordmark={isSakhaAI ? 'Sakha AI' : 'Study Sakha'} />
</Pressable>
</View>
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
{appHeaderActions}
<View
accessible
accessibilityLabel={syncStatus === 'synced' ? 'Account synced' : syncStatus === 'syncing' ? 'Syncing account data' : syncStatus === 'offline' ? 'Account sync offline' : syncStatus === 'pending' ? 'Account changes pending' : 'Account sync status unavailable'}
style={{ width: 30, height: 36, alignItems: 'center', justifyContent: 'center' }}
>
<Ionicons
name={syncStatus === 'synced' ? 'cloud-done-outline' : syncStatus === 'syncing' ? 'sync-outline' : syncStatus === 'offline' ? 'cloud-offline-outline' : 'cloud-upload-outline'}
size={16}
color={syncStatus === 'offline' || syncStatus === 'error' ? colors.danger : secondaryText}
/>
</View>
<Pressable onPress={cycleTheme} style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.surfaceAlt : 'transparent' })} accessibilityRole="button" accessibilityLabel="Toggle theme">
<Ionicons name={scheme === 'dark' ? 'sunny-outline' : 'moon-outline'} size={18} color={secondaryText} />
</Pressable>
<Pressable onPress={() => navigate('Notifications')} style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.surfaceAlt : 'transparent' })} accessibilityRole="button" accessibilityLabel="Notifications">
<View>
<Ionicons name="notifications-outline" size={20} color={secondaryText} />
{unread > 0 ? (
<View style={{ position: 'absolute', top: -5, right: -6, width: 16, height: 16, borderRadius: 8, backgroundColor: scheme === 'dark' ? colors.danger : '#FF3B30', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: scheme === 'dark' ? colors.surface : '#F2F2F7' }}>
<Txt size={9} weight="600" color="#FFF">{unread > 9 ? '9+' : unread}</Txt>
</View>
) : null}
</View>
</Pressable>

{/* Three-Dot Overflow Menu Button */}
<View ref={menuButtonRef} collapsable={false}>
<Pressable
onPress={openOverflowMenu}
accessibilityRole="button"
accessibilityLabel="More options"
accessibilityState={{ expanded: menuVisible }}
testID="header-more-button"
style={({ pressed }) => ({
width: 36,
height: 36,
borderRadius: 18,
alignItems: 'center',
justifyContent: 'center',
backgroundColor: menuVisible || pressed ? colors.surfaceAlt : 'transparent',
opacity: pressed ? 0.8 : 1,
})}
>
<Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
</Pressable>
</View>
</View>
</View>

{/* WhatsApp-style Anchored Overflow Menu */}
<Modal
animationType="none"
transparent
statusBarTranslucent
visible={menuVisible}
onRequestClose={closeMenu}
>
<Pressable
onPress={closeMenu}
accessibilityLabel="Close menu"
testID="header-overflow-backdrop"
style={{ flex: 1, backgroundColor: 'transparent' }}
>
<Pressable
onPress={(e) => e.stopPropagation()}
accessibilityRole="menu"
testID="header-overflow-menu"
style={{
position: 'absolute',
top: menuAnchor.top,
right: menuAnchor.right,
minWidth: 212,
maxWidth: Math.min(264, width - 24),
borderRadius: 14,
backgroundColor: scheme === 'dark' ? colors.surface : '#FFFFFF',
borderWidth: 1,
borderColor: scheme === 'dark' ? colors.border : 'rgba(15, 23, 42, 0.08)',
overflow: 'hidden',
...(Platform.OS === 'web'
? ({ boxShadow: scheme === 'dark' ? '0 10px 28px rgba(0,0,0,0.45)' : '0 8px 24px rgba(15,23,42,0.14)' } as any)
: shadow(colors, 3)),
}}
>
{[
{ key: 'guide', label: translateLabel('How to use the app', language), icon: 'book-outline' as const, onPress: () => navigate('AppGuide') },
{ key: 'settings', label: translateLabel('Settings', language), icon: 'settings-outline' as const, onPress: () => navigate('Settings') },
{ key: 'help', label: translateLabel('Help', language), icon: 'help-circle-outline' as const, onPress: openHelpModal },
{ key: 'share', label: translateLabel('Share with friends', language), icon: 'share-social-outline' as const, onPress: () => { void handleShareApp(); } },
].map((item, idx) => (
<React.Fragment key={item.key}>
{idx > 0 ? <View style={{ height: 1, backgroundColor: colors.borderSubtle }} /> : null}
<Pressable
onPress={item.onPress}
accessibilityRole="menuitem"
accessibilityLabel={item.label}
testID={`header-menu-${item.key}`}
style={({ pressed }) => ({
flexDirection: 'row',
alignItems: 'center',
gap: 12,
minHeight: 46,
paddingHorizontal: 16,
paddingVertical: 12,
backgroundColor: pressed ? colors.surfaceInteractive : 'transparent',
})}
>
<Ionicons name={item.icon} size={19} color={colors.text} />
<Txt size={14.5} weight="600" color={colors.text}>{item.label}</Txt>
</Pressable>
</React.Fragment>
))}
</Pressable>
</Pressable>
</Modal>

{/* Multi-Step Help Modal */}
<Modal
animationType="fade"
transparent
visible={helpModalVisible}
onRequestClose={() => setHelpModalVisible(false)}
>
<View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'flex-end' }}>
<View style={{ width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderBottomWidth: 0, backgroundColor: scheme === 'dark' ? '#141416' : colors.surface, borderColor: colors.border, maxHeight: '85%' }}>


{/* Modal Header with Back & Close */}
<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
{helpStep > 1 ? (
<Pressable onPress={handleBack} hitSlop={10}>
<Ionicons name="arrow-back" size={22} color={colors.text} />
</Pressable>
) : <View />}
<Pressable onPress={() => setHelpModalVisible(false)} hitSlop={10}>
<Ionicons name="close" size={22} color={colors.textMuted} />
</Pressable>
</View>

{/* STEP 1: Main Category Selection */}
{helpStep === 1 && (
<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 20 }}>
<View style={{ gap: 4, marginBottom: 10 }}>
<Txt size={14} color={colors.textMuted} weight="600">Hey,</Txt>
<Txt size={22} color={colors.text} weight="800">How can we help you?</Txt>
</View>

{[
{ id: 'Report an issue', label: 'Report an issue' },
{ id: 'Share an idea', label: 'Share an idea' },
{ id: 'Appreciate the team', label: 'Appreciate the team' },
].map((opt) => {
const isSelected = selectedCategory === opt.id;
return (
<View
key={opt.id}
style={{
borderRadius: 16,
borderWidth: 1.5,
padding: 16,
backgroundColor: scheme === 'dark' ? '#1E2024' : colors.surfaceAlt,
borderColor: isSelected ? '#34C759' : colors.border,
gap: 12,
}}
>
<Pressable
onPress={() => setSelectedCategory(opt.id as any)}
style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
>
<Txt size={15} color={colors.text} weight="700">{opt.label}</Txt>
<View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center', borderColor: isSelected ? '#34C759' : colors.textMuted }}>
{isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#34C759' }} />}
</View>
</Pressable>

{/* Sub-options for Report an issue when selected */}
{isSelected && opt.id === 'Report an issue' && (
<View style={{ gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderSubtle }}>
<Pressable
onPress={() => setShareLogs(!shareLogs)}
style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
>
<View style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: shareLogs ? '#34C759' : 'transparent', borderWidth: 2, borderColor: shareLogs ? '#34C759' : colors.textMuted, alignItems: 'center', justifyContent: 'center' }}>
{shareLogs && <Ionicons name="checkmark" size={12} color="#FFF" />}
</View>
<Txt size={13} color={colors.text}>Share logs to help us debug the issue</Txt>
</Pressable>

<Pressable
onPress={() => setIncludeScreenshot(!includeScreenshot)}
style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
>
<View style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: includeScreenshot ? '#34C759' : 'transparent', borderWidth: 2, borderColor: includeScreenshot ? '#34C759' : colors.textMuted, alignItems: 'center', justifyContent: 'center' }}>
{includeScreenshot && <Ionicons name="checkmark" size={12} color="#FFF" />}
</View>
<Txt size={13} color={colors.text}>Include Screenshot</Txt>
</Pressable>
</View>
)}
</View>
);
})}
</ScrollView>
)}

{/* STEP 2: Sub-issue type (Only for Report an issue) */}
{helpStep === 2 && (
<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
<Txt size={22} color={colors.text} weight="800" style={{ marginBottom: 10 }}>What issue are you facing?</Txt>

{[
'Subscription Issue',
'Block/Feature not working',
'Permission Issue',
'App crashing',
'Other',
].map((issue) => {
const isSelected = selectedSubIssue === issue;
return (
<Pressable
key={issue}
onPress={() => setSelectedSubIssue(issue)}
style={{
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'space-between',
paddingVertical: 16,
paddingHorizontal: 16,
borderRadius: 16,
borderWidth: 1.5,
backgroundColor: scheme === 'dark' ? '#1E2024' : colors.surfaceAlt,
borderColor: isSelected ? '#34C759' : colors.border,
}}
>
<Txt size={14.5} color={colors.text} weight="700">{issue}</Txt>
<View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center', borderColor: isSelected ? '#34C759' : colors.textMuted }}>
{isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#34C759' }} />}
</View>
</Pressable>
);
})}
</ScrollView>
)}

{/* STEP 3: Description Input & Submit */}
{helpStep === 3 && (
<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 20 }}>
<Txt size={22} color={colors.text} weight="800" style={{ marginBottom: 4 }}>
{selectedCategory === 'Report an issue' ? 'Tell us more about the issue' : 'What would you like to see in Study Sakha?'}
</Txt>

<View
style={{
borderRadius: 16,
borderWidth: 1.5,
borderColor: colors.border,
backgroundColor: scheme === 'dark' ? '#1E2024' : colors.surfaceAlt,
padding: 12,
}}
>
<TextInput
style={{
color: colors.text,
fontSize: 14,
minHeight: 120,
textAlignVertical: 'top',
...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
}}
placeholder="Describe it..."
placeholderTextColor={colors.textMuted}
multiline
maxLength={2000}
value={descriptionText}
onChangeText={setDescriptionText}
/>
<Txt size={11} color={colors.textMuted} style={{ textAlign: 'right', marginTop: 8 }}>
{descriptionText.length}/2000 characters
</Txt>
</View>
</ScrollView>
)}

{/* Bottom Continue / Submit Button */}
<View style={{ marginTop: 10 }}>
<Pressable
onPress={handleContinue}
style={{
height: 52,
borderRadius: 26,
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'center',
gap: 8,
backgroundColor: '#FFFFFF',
}}
>
<Txt size={15} color="#000000" weight="800">
{helpStep === 3 ? (selectedCategory === 'Report an issue' ? 'Submit issue' : 'Submit idea') : 'Continue'}
</Txt>
{helpStep === 3 && <Ionicons name="logo-whatsapp" size={18} color="#25D366" />}
</Pressable>
</View>

</View>
</View>
</Modal>
</View>
);
}

export function AppBottomNav({ active }: { active: NavKey }) {
const nav = useNavigation<AppNavigation>();
const insets = useSafeAreaInsets();
const { colors } = useTheme();
const { state } = useStore();
const language = state.settings.language;
const { width } = useWindowDimensions();

const go = (key: NavKey) => {
const routeName = key === 'Dashboard' ? 'DashboardRoot' : key;
navigateToRoute(nav, routeName);
};

const glassBackground = colors.bg === '#0C1220' ? 'rgba(20,28,46,0.94)' : 'rgba(255,255,255,0.88)';
const inactive = colors.textMuted;
return (
<View testID="app-bottom-nav" style={{ backgroundColor: glassBackground, borderTopWidth: 1, borderTopColor: `${colors.border}CC`, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 6), ...shadow(colors, 2) }}>
<View style={{ width: '92%', maxWidth: width < 768 ? 383 : 545, alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24 }}>
{MOBILE_TABS.map((t) => {
const on = t.key === active;
return (
<Pressable key={t.key} onPress={() => go(t.key)} accessibilityRole="button" accessibilityState={{ selected: on }} style={({ pressed }) => ({ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2, opacity: pressed ? 0.6 : 1 })}>
<View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
<Ionicons name={on ? t.icon : (`${t.icon}-outline` as any)} size={20} color={on ? colors.blue : inactive} />
</View>
<Txt size={10} weight={on ? '700' : '500'} color={on ? colors.blue : inactive} style={{ marginTop: 2 }}>
{translateLabel(t.label, language)}
</Txt>
</Pressable>
);
})}
<Pressable onPress={() => go('Profile')} accessibilityRole="button" accessibilityState={{ selected: active === 'Profile' }} style={({ pressed }) => ({ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2, opacity: pressed ? 0.6 : 1 })}>
<View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
<Ionicons name={active === 'Profile' ? 'person' : 'person-outline'} size={20} color={active === 'Profile' ? colors.blue : inactive} />
</View>
<Txt size={10} weight={active === 'Profile' ? '700' : '500'} color={active === 'Profile' ? colors.blue : inactive} style={{ marginTop: 2 }}>
{translateLabel('Profile', language)}
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
appHeaderActions,
fitContentToBottomNav = false,
hideChrome = false,
}: {
active: NavKey;
title: string;
subtitle?: string;
children: React.ReactNode;
scroll?: boolean;
maxWidth?: number;
headerRight?: React.ReactNode;
contentPadding?: number;
appHeaderActions?: React.ReactNode;
fitContentToBottomNav?: boolean;
hideChrome?: boolean;
}) {
const { colors, layoutDensity } = useTheme();
const nav = useNavigation<AppNavigation>();
const route = useRoute<AppHeaderRoute>();
const { isMobile, isTablet, isDesktop } = useLayout();
const { state, unread } = useStore();
const language = state.settings.language;
const [collapsed, setCollapsed] = useState(false);
const [keyboardVisible, setKeyboardVisible] = useState(false);
const fullScreenMode = hideChrome || shouldHideAppShell(route?.name, route?.params);

useSmartAndroidBack();

useEffect(() => {
if (Platform.OS === 'web') return undefined;
const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
return () => {
showSub.remove();
hideSub.remove();
};
}, []);

const isAdmin = state.user?.role === 'admin';
const sidebarCollapsed = isTablet ? !collapsed : collapsed;
const effectiveContentPadding = layoutDensity === 'compact' ? Math.max(12, contentPadding - 4) : contentPadding;
const sidebarWidth = sidebarCollapsed ? 76 : 248;
const hasPageHeading = Boolean(title.trim() || subtitle?.trim());

const go = (key: NavKey) => {
const routeName = key === 'Dashboard' ? 'DashboardRoot' : key;
navigateToRoute(nav, routeName);
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
{translateLabel(group.title, language).toUpperCase()}
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
{translateLabel(item.label, language)}
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
padding: effectiveContentPadding,
paddingBottom: effectiveContentPadding + 40,
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

if (fullScreenMode) {
return (
<View style={{ flex: 1, backgroundColor: colors.bg }}>
{children}
</View>
);
}

if (isMobile) {
return (
<View style={{ flex: 1, backgroundColor: colors.bg }}>
<AppHeader appHeaderActions={appHeaderActions} />
<View style={{ flex: 1, minHeight: 0 }}>
{scroll ? (
<ScrollView contentContainerStyle={{ padding: layoutDensity === 'compact' ? 12 : 16, paddingBottom: layoutDensity === 'compact' ? 20 : 24 }} showsVerticalScrollIndicator={false}>
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
<View style={{ flex: 1, minHeight: 0, paddingBottom: 0 }}>
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
{!keyboardVisible ? <AppBottomNav active={active} /> : null}
</View>
);
}

return (
<View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
{Sidebar}
<View style={{ flex: 1 }}>
<AppHeader appHeaderActions={appHeaderActions} />
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
onlyKeys,
}: {
onGo: (k: NavKey) => void;
active: NavKey;
isAdmin: boolean;
unread: number;
onlyKeys?: NavKey[];
}) {
const { colors } = useTheme();
const { state } = useStore();
const language = state.settings.language;
const groups = onlyKeys
? [{ title: 'More', items: NAV_GROUPS.flatMap((group) => group.items).filter((item) => onlyKeys.includes(item.key)) }]
: [...NAV_GROUPS].sort((a, b) => (a.title === 'Account' ? -1 : b.title === 'Account' ? 1 : 0));
return (
<View style={{ gap: 16 }}>
{groups.map((g) => {
const items = g.items.filter((i) => !i.adminOnly || isAdmin);
if (!items.length) return null;
return (
<View key={g.title} style={{ gap: 10 }}>
<Txt size={11} weight="800" color={colors.textFaint} style={{ letterSpacing: 1.2, paddingHorizontal: 4 }}>
{translateLabel(g.title, language).toUpperCase()}
</Txt>
<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
{items.map((item) => {
const on = item.key === active;
return (
<Pressable
key={item.key}
onPress={() => onGo(item.key)}
accessibilityRole="button"
accessibilityState={{ selected: on }}
style={({ pressed }) => ({
width: '47.5%',
flexGrow: 1,
minHeight: 88,
borderRadius: 18,
borderWidth: 1,
borderColor: on ? colors.blue : colors.borderSubtle,
backgroundColor: on ? (colors.bg === '#0C1220' ? 'rgba(0,122,255,0.18)' : '#EBF5FF') : pressed ? colors.surfaceAlt : colors.surface,
padding: 14,
justifyContent: 'space-between',
transform: [{ scale: pressed ? 0.985 : 1 }],
opacity: pressed ? 0.9 : 1,
})}
>
<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
<View
style={{
width: 36,
height: 36,
borderRadius: 12,
backgroundColor: on ? colors.blue : colors.tint,
alignItems: 'center',
justifyContent: 'center',
}}
>
<Ionicons name={item.icon} size={19} color={on ? '#FFFFFF' : colors.blue} />
</View>
{item.key === 'Notifications' && unread > 0 ? (
<View
style={{
minWidth: 20,
height: 20,
borderRadius: 10,
backgroundColor: colors.danger,
alignItems: 'center',
justifyContent: 'center',
paddingHorizontal: 5,
}}
>
<Txt size={10.5} weight="800" color="#fff">
{unread}
</Txt>
</View>
) : (
<Ionicons name="chevron-forward" size={15} color={colors.textFaint} />
)}
</View>
<Txt size={13.5} weight="700" color={on ? colors.blue : colors.text} numberOfLines={1}>
{translateLabel(item.label, language)}
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
gap: 12,
}}
>
<Pressable
onPress={onBack}
hitSlop={8}
accessibilityRole="button"
accessibilityLabel="Back"
style={({ pressed }) => ({
width: 38,
height: 38,
borderRadius: 12,
alignItems: 'center',
justifyContent: 'center',
backgroundColor: pressed ? colors.surfaceAlt : colors.bg,
borderWidth: 1,
borderColor: colors.borderSubtle,
transform: [{ scale: pressed ? 0.97 : 1 }],
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
