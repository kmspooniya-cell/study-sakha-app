import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('Production APK Critical UX & Functional Fixes', () => {
  describe('Part 1 — Sakha AI Android keyboard & composer', () => {
    it('configures Android resize mode in app.json and measures keyboard overlap in SakhaAIScreen', () => {
      const appJson = JSON.parse(readRepoFile('app.json'));
      expect(appJson.expo.android.softwareKeyboardLayoutMode).toBe('resize');

      const sakha = readRepoFile('screens/SakhaAIScreen.tsx');
      expect(sakha).toContain('androidKeyboardOverlap');
      expect(sakha).toContain('measureInWindow');
      expect(sakha).toContain('paddingBottom: keyboardOpen ? 10 : Math.max(10, insets.bottom + 8)');
      expect(sakha).toContain('scrollRef.current?.scrollToEnd({ animated: true })');
      expect(sakha).toContain('scrollEnabled={inputHeight >= 128}');
    });
  });

  describe('Part 2 — Alarm screen header safe area', () => {
    it('uses SafeAreaView from react-native-safe-area-context with top/bottom edges', () => {
      const alarmModule = readRepoFile('src/modules/alarm/StudySakhaAlarmModule.tsx');
      expect(alarmModule).toContain("from 'react-native-safe-area-context'");
      expect(alarmModule).toContain("['top', 'right', 'bottom', 'left']");
      const rnImportMatch = alarmModule.match(/import\s*\{[^}]*\}\s*from\s*'react-native';/);
      expect(rnImportMatch?.[0]).toBeTruthy();
      expect(rnImportMatch?.[0]).not.toContain('SafeAreaView');
    });
  });

  describe('Part 3 — Friends tab demo data removal', () => {
    it('removes all fabricated demo users, invite codes, and preview buttons from StudySakhaAlarmModule', () => {
      const alarmModule = readRepoFile('src/modules/alarm/StudySakhaAlarmModule.tsx');
      expect(alarmModule).not.toContain('Aarav Sharma');
      expect(alarmModule).not.toContain('Priya Rathore');
      expect(alarmModule).not.toContain('Vikram Choudhary');
      expect(alarmModule).not.toContain('Sneha Verma');
      expect(alarmModule).not.toContain('SAKHA-KAM-26');
      expect(alarmModule).not.toContain('Preview with Demo Study Buddies');
      expect(alarmModule).not.toContain('SUGGESTED_STUDY_BUDDIES');
    });
  });

  describe('Part 4 — Alarm Friends Supabase backend & API contract', () => {
    it('defines RLS-protected tables and SECURITY DEFINER RPCs in migration 202611270001', () => {
      const sql = readRepoFile('supabase/migrations/202611270001_alarm_friends_and_accountability.sql');
      expect(sql).toContain('create table if not exists public.alarm_friendships');
      expect(sql).toContain('create table if not exists public.alarm_wake_status');
      expect(sql).toContain('create table if not exists public.alarm_wake_squads');
      expect(sql).toContain('create table if not exists public.alarm_friend_nudges');
      expect(sql).toContain('create table if not exists public.alarm_notifications');
      expect(sql).toContain('alter table public.alarm_friendships enable row level security');
      expect(sql).toContain('create or replace function public.search_alarm_users');
      expect(sql).toContain('create or replace function public.send_alarm_friend_request');
      expect(sql).toContain('create or replace function public.respond_alarm_friend_request');
      expect(sql).toContain('create or replace function public.send_alarm_friend_nudge');
      expect(sql).toContain('set search_path = pg_catalog, public');
    });

    it('gracefully reports unconfigured or unauthenticated state without fabricating friends', async () => {
      jest.resetModules();
      jest.doMock('../lib/supabase', () => ({
        supabaseConfigured: false,
        supabase: null,
      }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const api = require('../src/modules/alarm/alarmFriendsApi') as typeof import('../src/modules/alarm/alarmFriendsApi');
      const result = await api.fetchAlarmFriendsDashboard();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('unconfigured');
      }
      const searchRes = await api.searchAlarmUsers('an');
      expect(searchRes.ok).toBe(false);
    });
  });

  describe('Part 5 — Alarm Themes selector stability', () => {
    it('provides an explicit Done button and keeps Themes screen open on theme tap', () => {
      const alarmModule = readRepoFile('src/modules/alarm/StudySakhaAlarmModule.tsx');
      expect(alarmModule).toContain('Done selecting alarm theme');
      expect(alarmModule).toContain('Selected "${t.name}" theme');
      expect(alarmModule).toContain('ALARM_THEMES.some((t) => t.id === parsed.activeThemeId)');
    });
  });

  describe('Part 6 — Alarm Dismiss / Stop & Native Lifecycle', () => {
    it('preserves recurring schedules on stop, exposes notification Stop/Snooze actions, and handles hydration race', () => {
      const moduleKt = readRepoFile('native/alarm/android/java/com/anonymous/agonpreview/AlarmEngineModule.kt');
      const serviceKt = readRepoFile('native/alarm/android/java/com/anonymous/agonpreview/AlarmPlaybackService.kt');
      const receiverKt = readRepoFile('native/alarm/android/java/com/anonymous/agonpreview/AlarmEngineReceiver.kt');
      const schedulerKt = readRepoFile('native/alarm/android/java/com/anonymous/agonpreview/AlarmEngineScheduler.kt');
      const alarmModule = readRepoFile('src/modules/alarm/StudySakhaAlarmModule.tsx');
      const appTsx = readRepoFile('App.tsx');

      // Stop must cancel snooze only, preserving recurring ACTION_FIRE
      expect(moduleKt).toContain('AlarmEngineScheduler.cancelSnooze(reactContext, alarmId)');
      expect(moduleKt).toContain('fun peekPendingAlarm');
      expect(moduleKt).toContain('fun clearPendingAlarm');
      expect(moduleKt).toContain('fun consumePendingAction');

      // Service must provide Stop & Snooze notification actions and deep link
      expect(serviceKt).toContain('ACTION_DISMISS_NOTIFICATION');
      expect(serviceKt).toContain('ACTION_SNOOZE_NOTIFICATION');
      expect(serviceKt).toContain('"Stop"');
      expect(serviceKt).toContain('studysakha://alarm');
      expect(serviceKt).toContain('STOP_FOREGROUND_REMOVE');

      // Receiver must handle notification actions & one-time alarm completion
      expect(receiverKt).toContain('AlarmEngineScheduler.ACTION_DISMISS_NOTIFICATION');
      expect(receiverKt).toContain('AlarmEngineScheduler.ACTION_SNOOZE_NOTIFICATION');
      expect(receiverKt).toContain('AlarmEngineScheduler.handleAlarmFiredInStore');
      expect(schedulerKt).toContain('fun cancelSnooze');

      // JS must wait for hydrated, guard rapid dismiss, and App.tsx must route on native trigger
      expect(alarmModule).toContain('if (!hydrated) return undefined;');
      expect(alarmModule).toContain('dismissingAlarmIdRef');
      expect(alarmModule).toContain('buildFallbackAlarm');
      expect(appTsx).toContain('peekPendingNativeAlarm');
      expect(appTsx).toContain('subscribeToNativeAlarm');
    });
  });
});
