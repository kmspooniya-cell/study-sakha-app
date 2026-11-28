import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

import { AppBottomNav } from '../components/Shell';
import type { AppNavigation } from '../lib/navigation';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';
import { SSDSSurface, useSSDSTheme } from '../lib/ssds';

/** Host adapter for the isolated alarm module. */
export default function StudySakhaAlarmScreen() {
  // Keep the optional alarm surface out of unrelated Jest/module initialization paths.
  // The module is loaded only when this registered route is actually opened.
  const StudySakhaAlarmModule = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../src/modules/alarm/StudySakhaAlarmModule').default as typeof import('../src/modules/alarm/StudySakhaAlarmModule').default;
  }, []);
  const navigation = useNavigation<AppNavigation>();
  const { dispatch } = useStore();
  const { scheme } = useTheme();
  const { tokens } = useSSDSTheme();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleToggleDarkMode = useCallback((nextDark: boolean) => {
    dispatch({ type: 'settings', patch: { themeMode: nextDark ? 'dark' : 'light' } });
  }, [dispatch]);

  const handleExitToHome = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleOpenStudyPlanner = useCallback(() => {
    navigation.navigate('StudyPlanner');
  }, [navigation]);

  return (
    <SSDSSurface variant="flat" style={{ flex: 1, backgroundColor: tokens.colors.background }}>
      <StudySakhaAlarmModule
      isDarkMode={scheme === 'dark'}
      onExitToHome={handleExitToHome}
      onToggleDarkMode={handleToggleDarkMode}
      onOpenStudyPlanner={handleOpenStudyPlanner}
      globalBottomNav={!keyboardVisible ? <AppBottomNav active="Dashboard" /> : null}
      />
    </SSDSSurface>
  );
}
