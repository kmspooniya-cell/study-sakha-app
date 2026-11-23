import { describe, expect, it } from '@jest/globals';
import { getAndroidBackTarget } from '../lib/navigation';

describe('Android back targets', () => {
  it('returns from a library detail screen to its main screen', () => {
    expect(getAndroidBackTarget('LibraryBooks', ['DashboardRoot', 'Library'])).toBe('Library');
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
  });

  it('leaves Android back handling to the system on the dashboard', () => {
    expect(getAndroidBackTarget('DashboardRoot', ['DashboardRoot'])).toBeNull();
  });
});
