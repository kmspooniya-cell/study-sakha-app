import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  SUBJECT_CATEGORIES,
  getPreferredSubjectOptions,
  isPackageFullySelected,
  normalizeCustomPackages,
  normalizeSubjectList,
  toggleCategorySubjects,
} from '../lib/subjectRegistry';
import { PreferredSubjectsManager } from '../components/PreferredSubjectsManager';

jest.mock('../lib/theme', () => ({
  useTheme: () => ({
    colors: {
      surface: '#ffffff',
      surfaceAlt: '#f8fafc',
      border: '#e2e8f0',
      text: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#64748b',
    },
    activeAccent: {
      500: '#6366f1',
      600: '#4f46e5',
    },
    fs: (n: number) => n,
  }),
}));

describe('subjectRegistry', () => {
  it('provides all 11 organized subject categories', () => {
    expect(SUBJECT_CATEGORIES.length).toBe(11);
    const titles = SUBJECT_CATEGORIES.map((c) => c.title);
    expect(titles).toContain('Rajasthan Studies');
    expect(titles).toContain('Indian History');
    expect(titles).toContain('Ethics & Administration');
  });

  it('normalizes and deduplicates subject lists case-insensitively', () => {
    expect(normalizeSubjectList(['  Polity ', 'polity', '', 'History'])).toEqual([
      'Polity',
      'History',
    ]);
  });

  it('toggles all subjects in a category on and off', () => {
    const rajasthan = SUBJECT_CATEGORIES[0].subjects;
    const added = toggleCategorySubjects(['Physics'], rajasthan, true);
    expect(added).toContain('Physics');
    expect(added).toContain('Rajasthan History & Culture');
    expect(added).toContain('Rajasthan Art & Heritage');

    const removed = toggleCategorySubjects(added, rajasthan, false);
    expect(removed).toEqual(['Physics']);
  });

  it('normalizes custom packages and checks full selection', () => {
    const pkgs = normalizeCustomPackages([
      {
        id: 'p1',
        name: 'RAS Mains Preparation',
        subjects: ['Rajasthan History', 'Ethics', 'ethics'],
        updatedAt: '2026-11-26T00:00:00Z',
      },
      { id: '', name: 'Invalid', subjects: [] },
    ]);
    expect(pkgs).toHaveLength(1);
    expect(pkgs[0].subjects).toEqual(['Rajasthan History', 'Ethics']);
    expect(isPackageFullySelected(['Rajasthan History', 'Ethics', 'Polity'], pkgs[0].subjects)).toBe(true);
    expect(isPackageFullySelected(['Rajasthan History'], pkgs[0].subjects)).toBe(false);
  });

  it('returns dynamic planner options from preferred subjects', () => {
    expect(getPreferredSubjectOptions(['Rajasthan History', 'Answer Writing'])).toEqual([
      'Rajasthan History',
      'Answer Writing',
    ]);
  });
});

describe('PreferredSubjectsManager', () => {
  it('allows selecting subjects, creating a custom package, and toggling packages', () => {
    const onChange = jest.fn();
    const { getByText, getByPlaceholderText, getByLabelText } = render(
      <PreferredSubjectsManager
        preferredSubjects={['Rajasthan History & Culture']}
        customPackages={[]}
        activePackageId={null}
        onChange={onChange}
      />
    );

    expect(getByText('1 selected • Synced with Study Planner')).toBeTruthy();

    // Open custom package creator
    fireEvent.press(getByLabelText('Create Custom Package'));
    fireEvent.changeText(
      getByPlaceholderText('Package Name (e.g. RAS Mains Preparation)'),
      'RAS Mains Preparation'
    );
    fireEvent.changeText(getByPlaceholderText('Add custom subject...'), 'Answer Writing');
    fireEvent.press(getByText('+ Add'));
    fireEvent.press(getByText('Save Package'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const payload = onChange.mock.calls[0][0];
    expect(payload.customPackages).toHaveLength(1);
    expect(payload.customPackages[0].name).toBe('RAS Mains Preparation');
    expect(payload.customPackages[0].subjects).toEqual(['Answer Writing']);
    expect(payload.preferredSubjects).toEqual(['Rajasthan History & Culture', 'Answer Writing']);
  });

  it('handles null, undefined, and invalid preferredSubjects and customPackages safely', () => {
    expect(normalizeSubjectList(null)).toEqual([]);
    expect(normalizeSubjectList(undefined)).toEqual([]);
    expect(normalizeSubjectList([123, null, '  Polity  ', ''])).toEqual(['Polity']);
    expect(normalizeCustomPackages(null)).toEqual([]);
    expect(normalizeCustomPackages(undefined)).toEqual([]);
    expect(normalizeCustomPackages([{ id: 'p1', name: 'Test', subjects: null }])).toMatchObject([
      { id: 'p1', name: 'Test', subjects: [] },
    ]);
  });
});
