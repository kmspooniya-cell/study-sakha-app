import { describe, expect, it } from '@jest/globals';
import { getAndroidBackTarget, getNotificationNavigationRoute } from '../lib/navigation';

describe('Android back targets', () => {
  it('returns from a library detail screen to its main screen', () => {
    expect(getAndroidBackTarget('LibraryBooks', ['DashboardRoot', 'Library'])).toBe('Library');
    expect(getAndroidBackTarget('LibraryNotes', ['DashboardRoot', 'Library'])).toBe('Library');
    expect(getAndroidBackTarget('LibraryPYQSets', ['DashboardRoot', 'Library'])).toBe('Library');
    expect(getAndroidBackTarget('LibraryStarred', ['DashboardRoot', 'Library'])).toBe('Library');
    expect(getAndroidBackTarget('LibraryDownloads', ['DashboardRoot', 'Library'])).toBe('Library');
  });

  it('returns from feature screens directly to the dashboard', () => {
    expect(getAndroidBackTarget('Groups', ['DashboardRoot', 'Library'])).toBe('DashboardRoot');
    expect(getAndroidBackTarget('Groups', ['Groups'])).toBe('DashboardRoot');
  });

  it('falls back to the dashboard when a detail screen has no feature parent in history', () => {
    expect(getAndroidBackTarget('BookReader', ['DashboardRoot'])).toBe('DashboardRoot');
  });

  it('returns contextual detail screens to the screen that opened them', () => {
    expect(getAndroidBackTarget('BookReader', ['DashboardRoot', 'Search'])).toBe('Search');
    expect(getAndroidBackTarget('NoteEditor', ['DashboardRoot', 'Library'])).toBe('Library');
  });

  it('returns test and statistics details to their section parents', () => {
    expect(getAndroidBackTarget('TestPlayer', ['DashboardRoot', 'Tests'])).toBe('Tests');
    expect(getAndroidBackTarget('TestResult', ['DashboardRoot', 'Tests'])).toBe('Tests');
    expect(getAndroidBackTarget('TaskPerformance', ['DashboardRoot', 'Statistics'])).toBe('Statistics');
  });

  it('leaves Android back handling to the system on the dashboard', () => {
    expect(getAndroidBackTarget('DashboardRoot', ['DashboardRoot'])).toBeNull();
  });

  it('keeps Settings and App Guide return navigation stable across repeated opens', () => {
    for (let cycle = 0; cycle < 10; cycle += 1) {
      expect(getAndroidBackTarget('Settings', ['DashboardRoot'])).toBe('DashboardRoot');
      expect(getAndroidBackTarget('AppGuide', ['DashboardRoot'])).toBe('DashboardRoot');
    }
  });

  it('recognizes notification taps that target the in-app notification inbox', () => {
    expect(getNotificationNavigationRoute({
      notification: { request: { content: { data: { route: 'Notifications' } } } },
    })).toBe('Notifications');
    expect(getNotificationNavigationRoute({
      notification: { request: { content: { data: { route: 'Settings' } } } },
    })).toBeNull();
    expect(getNotificationNavigationRoute(null)).toBeNull();
  });
});
