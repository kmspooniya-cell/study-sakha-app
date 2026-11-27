import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';

import type { AppNavigation } from '../lib/navigation';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';

/** Host adapter for the isolated alarm module. */
export default function StudySakhaAlarmScreen() {
  // Keep the optional alarm surface out of unrelated Jest/module initialization paths.
  // The module is loaded only when this registered route is actually opened.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const StudySakhaAlarmModule = require('../src/modules/alarm/StudySakhaAlarmModule').default as typeof import('../src/modules/alarm/StudySakhaAlarmModule').default;
  const navigation = useNavigation<AppNavigation>();
  const { dispatch } = useStore();
  const { scheme } = useTheme();

  const handleToggleDarkMode = useCallback((nextDark: boolean) => {
    dispatch({ type: 'settings', patch: { themeMode: nextDark ? 'dark' : 'light' } });
  }, [dispatch]);

  return (
    <StudySakhaAlarmModule
      isDarkMode={scheme === 'dark'}
      onExitToHome={() => navigation.goBack()}
      onToggleDarkMode={handleToggleDarkMode}
      onOpenStudyPlanner={() => navigation.navigate('StudyPlanner')}
    />
  );
}
