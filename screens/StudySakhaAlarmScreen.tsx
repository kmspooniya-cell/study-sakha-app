import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';

import type { AppNavigation } from '../lib/navigation';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';

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
    <StudySakhaAlarmModule
      isDarkMode={scheme === 'dark'}
      onExitToHome={handleExitToHome}
      onToggleDarkMode={handleToggleDarkMode}
      onOpenStudyPlanner={handleOpenStudyPlanner}
    />
  );
}
