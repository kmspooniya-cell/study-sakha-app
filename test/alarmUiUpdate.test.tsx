import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('Alarm Module UI Update', () => {
  const alarmModule = readRepoFile('src/modules/alarm/StudySakhaAlarmModule.tsx');
  const alarmScreen = readRepoFile('screens/StudySakhaAlarmScreen.tsx');

  it('1. replaces top-right Bed and Settings icons with a 3-dot menu containing Sleep, Analytics, History, Friends, Settings', () => {
    expect(alarmModule).toContain('testID="alarm-header-menu-button"');
    expect(alarmModule).toContain("id: 'sleep', label: 'Sleep'");
    expect(alarmModule).toContain("id: 'stats', label: 'Analytics'");
    expect(alarmModule).toContain("id: 'history', label: 'History'");
    expect(alarmModule).toContain("id: 'friends', label: 'Friends'");
    expect(alarmModule).toContain("id: 'settings', label: 'Settings'");
    expect(alarmModule).not.toContain("<BedDouble size={20} color=\"#6366F1\" />");
  });

  it('2. completely removes the Study button and dedicated Study screen from the Alarm Module', () => {
    expect(alarmModule).not.toContain('studyAlarms');
    expect(alarmModule).not.toContain('renderStudyAlarmsScreen');
    expect(alarmModule).not.toContain("label: 'Study Sync'");
  });

  it('3. removes duplicate shortcuts from the main screen while keeping Theme Library in Settings', () => {
    const dashboardSection = alarmModule.slice(
      alarmModule.indexOf('const renderDashboardScreen = () => {'),
      alarmModule.indexOf('const renderEditorScreen = () => {')
    );
    expect(dashboardSection).not.toContain('shortcutGrid');
    expect(dashboardSection).not.toContain("{ id: 'themes' as AlarmScreenId, label: 'Themes'");
    expect(alarmModule).toContain("case 'themes': return renderThemesScreen();");
    expect(alarmModule).toContain("Theme Library ({ALARM_THEMES.length} Styles)");
  });

  it('7. keeps only two Add Alarm buttons (top card + bottom-left FAB) named Add Alarm', () => {
    const dashboardSection = alarmModule.slice(
      alarmModule.indexOf('const renderDashboardScreen = () => {'),
      alarmModule.indexOf('const renderEditorScreen = () => {')
    );
    expect(dashboardSection).not.toContain('+ Create Alarm');
    expect(dashboardSection).not.toContain('+ Add Smart Alarm');
    const addAlarmMatches = dashboardSection.match(/>Add Alarm</g) ?? [];
    expect(addAlarmMatches).toHaveLength(2);
    expect(alarmModule).toContain('left: 18,');
  });

  it('4. removes internal bottom navigation and uses Study Sakha AppBottomNav', () => {
    expect(alarmModule).not.toContain('renderAlarmBottomNav');
    expect(alarmModule).toContain('globalBottomNav');
    expect(alarmScreen).toContain("from '../components/Shell'");
    expect(alarmScreen).toContain('<AppBottomNav active="Dashboard" />');
  });

  it('5. makes Next Scheduled Alarm card and Settings Theme Library card white', () => {
    expect(alarmModule).not.toContain("colors={['#191A2E', '#1E293B', '#0F3D3E']}");
    expect(alarmModule).not.toContain('colors={[...activeTheme.colors]} style={[styles.heroCard, styles.rowBetween]}');
    expect(alarmModule).toContain("backgroundColor: '#FFFFFF'");
  });

  it('6. removes Next alarm in countdown and Test Ring button from Next Alarm card', () => {
    const dashboardSection = alarmModule.slice(
      alarmModule.indexOf('const renderDashboardScreen = () => {'),
      alarmModule.indexOf('const renderEditorScreen = () => {')
    );
    expect(dashboardSection).not.toContain('Next alarm in');
    expect(alarmModule).not.toContain('nextAlarmCountdown');
    expect(dashboardSection).not.toContain('Test Ring');
  });

  it('preserves all four existing alarm themes', () => {
    expect(alarmModule).toContain("id: 'starry_sky'");
    expect(alarmModule).toContain("id: 'cozy_study'");
    expect(alarmModule).toContain("id: 'midnight_blue'");
    expect(alarmModule).toContain("id: 'obsidian'");
  });

  describe('Alarm Create/Edit Screen UI', () => {
    const editorSection = alarmModule.slice(
      alarmModule.indexOf('const renderEditorScreen = () => {'),
      alarmModule.indexOf('const renderRingingScreen = () => {')
    );

    it('1. replaces up/down arrow time stepper and countdown with a vertical scrolling wheel time picker', () => {
      expect(editorSection).toContain('testID="alarm-wheel-time-picker"');
      expect(editorSection).toContain('testID="alarm-wheel-hour"');
      expect(editorSection).toContain('testID="alarm-wheel-minute"');
      expect(editorSection).toContain('testID="alarm-wheel-period"');
      expect(editorSection).not.toContain('stepBtnText');
      expect(editorSection).not.toContain('Next alarm in');
    });

    it('2. removes alarm title input and preset chips, keeping only one horizontal Category selector', () => {
      expect(editorSection).toContain('testID="alarm-category-selector"');
      expect(editorSection).toContain('Select Category');
      expect(editorSection).not.toContain('e.g., Wake Up — RAS Preparation');
      expect(editorSection).not.toContain('Indian Polity Revision');
      expect(editorSection).not.toContain('Optional motivational wake-up message');
    });

    it('3. opens Study Planner date picker directly on Specific Date tap without keyboard TextInput', () => {
      expect(editorSection).toContain('testID="alarm-specific-date-field"');
      expect(editorSection).toContain('NativeDatePicker');
      expect(editorSection).toContain('WebDatePicker');
      expect(alarmModule).toContain("from '../../../components/NativeSchedulePickers'");
      expect(editorSection).not.toContain('Specific Date (YYYY-MM-DD)');
    });

    it('4. uses a compact horizontal scrolling sound selector while preserving preview, volume, gradual volume, and vibration', () => {
      expect(editorSection).toContain('testID={`alarm-sound-card-${s.id}`}');
      expect(editorSection).toContain('ScrollView horizontal');
      expect(editorSection).toContain('toggleSoundPreview(s.id)');
      expect(editorSection).toContain('Alarm Volume:');
      expect(editorSection).toContain('Gradual Volume Increase');
      expect(editorSection).toContain('Vibration');
    });

    it('5. keeps only the top-right Save button and removes Save & Test and Save Alarm footer buttons', () => {
      expect(editorSection).toContain('styles.headerSaveBtn');
      expect(editorSection).not.toContain('Save & Test');
      expect(editorSection).not.toContain('Save Alarm');
      expect(editorSection).not.toContain('editorFooter');
    });
  });

  describe('Theme Library, Preview & Simplified Alarm Settings', () => {
    const themesSection = alarmModule.slice(
      alarmModule.indexOf('const renderThemesScreen = () => ('),
      alarmModule.indexOf('const renderSettingsScreen = () => {')
    );
    const settingsSection = alarmModule.slice(
      alarmModule.indexOf('const renderSettingsScreen = () => {'),
      alarmModule.indexOf('const renderFriendsScreen = () => {')
    );

    it('1. keeps Theme Library Done button unclipped with minWidth: 0 and flexShrink: 0', () => {
      expect(themesSection).toContain('testID="alarm-theme-done-btn"');
      expect(themesSection).toContain('minWidth: 0');
      expect(themesSection).toContain('flexShrink: 0');
    });

    it('2. renders all 4 themes with stable non-mutating selection styling', () => {
      expect(themesSection).toContain('ALARM_THEMES.map');
      expect(alarmModule).toContain("justifyContent: 'space-between'");
      expect(alarmModule).toContain("borderColor: 'transparent'");
    });

    it('3. keeps Theme Preview isolated from ringing and Good Morning alarm execution', () => {
      expect(themesSection).toContain('setThemePreviewVisible(true)');
      expect(themesSection).toContain('testID="alarm-theme-preview-dismiss"');
      expect(themesSection).not.toContain('triggerAlarmRinging');
    });

    it('4 & 5. removes Display Settings and Wake-up & Sound Defaults, keeping only Notifications and Reset Default Settings', () => {
      expect(settingsSection).not.toContain('DISPLAY SETTINGS');
      expect(settingsSection).not.toContain('Appearance Mode');
      expect(settingsSection).not.toContain('Minimal Display Mode');
      expect(settingsSection).not.toContain('WAKE-UP & SOUND DEFAULTS');
      expect(settingsSection).not.toContain('Default Snooze');
      expect(settingsSection).not.toContain('Gradual Volume Increase');
      expect(settingsSection).not.toContain('Spoken Wake-up Messages');
      expect(settingsSection).not.toContain('24-Hour Time Format');
      expect(settingsSection).not.toContain('Time Zone');
      expect(settingsSection).toContain('NOTIFICATIONS');
      expect(settingsSection).toContain('Upcoming Alarm Notifications');
      expect(settingsSection).toContain('Missed Study Task Alerts');
      expect(settingsSection).toContain('Reset Default Settings');
    });
  });
});
