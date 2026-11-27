import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  INDEPENDENT_SUBJECTS,
  SUBJECT_GROUPS,
  buildUnifiedSubjectRegistry,
  getCustomSubjects,
  getPreferredSubjectOptions,
  isPackageFullySelected,
  normalizeCustomPackages,
  normalizeSubjectList,
  toggleCategorySubjects,
} from '../lib/subjectRegistry';
import { PreferredSubjectsManager } from '../components/PreferredSubjectsManager';

let mockScheme: 'light' | 'dark' = 'light';

jest.mock('../lib/theme', () => ({
  useTheme: () => ({
    scheme: mockScheme,
    colors:
      mockScheme === 'dark'
        ? {
            bg: '#0C1220',
            surface: '#141C2E',
            surfaceAlt: '#1B2439',
            border: '#253049',
            borderSubtle: '#253049',
            borderStrong: '#3A4968',
            text: '#EDF1F8',
            textSecondary: '#9AA6BC',
            textMuted: '#9AA6BC',
            brandPrimary: '#6F95FF',
            selectedSurface: 'rgba(111,149,255,0.15)',
            danger: '#FF6B70',
            success: '#2BD69B',
          }
        : {
            bg: '#F2F2F7',
            surface: '#ffffff',
            surfaceAlt: '#f8fafc',
            border: '#e2e8f0',
            borderSubtle: '#e2e8f0',
            borderStrong: '#cbd5e1',
            text: '#0f172a',
            textSecondary: '#475569',
            textMuted: '#64748b',
            brandPrimary: '#4f46e5',
            selectedSurface: 'rgba(79,70,229,0.08)',
            danger: '#EF4444',
            success: '#059669',
          },
    f: (n: number) => n,
    reduceMotion: true,
  }),
}));

describe('subjectRegistry', () => {
  it('provides 4 hierarchical parent groups and 6 independent subjects', () => {
    expect(SUBJECT_GROUPS.map((g) => g.title)).toEqual([
      'General Studies – India',
      'General Studies – Rajasthan',
      'Science',
      'RAS Mains Subjects',
    ]);
    expect(SUBJECT_GROUPS[0].subjects.map((s) => s.name)).toEqual([
      'Indian History',
      'Indian Culture',
      'Indian Geography',
      'Indian Polity',
      'Indian Economy',
    ]);
    expect(SUBJECT_GROUPS[1].subjects.map((s) => s.name)).toEqual([
      'Rajasthan History',
      'Rajasthan Culture',
      'Rajasthan Geography',
      'Rajasthan Polity',
      'Rajasthan Economy',
    ]);
    expect(SUBJECT_GROUPS[2].subjects.map((s) => s.name)).toEqual([
      'Biology',
      'Chemistry',
      'Physics',
    ]);
    expect(SUBJECT_GROUPS[3].subjects.map((s) => s.name)).toEqual([
      'Sociology',
      'Management',
      'Accounting & Auditing',
      'Ethics',
      'International Relations',
      'Public Administration',
      'Behaviour',
      'Law',
      'General Hindi',
      'General English',
      'World History',
    ]);
    expect(INDEPENDENT_SUBJECTS.map((s) => s.name)).toEqual([
      'Technology',
      'Environment',
      'Mathematics',
      'Reasoning',
      'Current Affairs',
      'World Geography',
    ]);
  });

  it('builds a deduplicated unified registry with stable IDs for custom and legacy subjects', () => {
    const registry = buildUnifiedSubjectRegistry(
      ['Indian History', 'Legacy Topic'],
      [
        {
          id: 'pkg-1',
          name: 'Mains',
          subjects: ['Indian History', 'Answer Writing'],
          updatedAt: '2026-11-27T00:00:00Z',
        },
        {
          id: 'pkg-2',
          name: 'Writing',
          subjects: ['answer writing', 'Essay'],
          updatedAt: '2026-11-27T00:00:00Z',
        },
      ]
    );

    const custom = getCustomSubjects(registry);
    expect(custom.map((c) => c.name)).toEqual([
      'Answer Writing',
      'Essay',
      'Legacy Topic',
    ]);
    const answerWriting = custom.find((c) => c.name === 'Answer Writing');
    expect(answerWriting?.id).toBe('custom_answer_writing');
    expect(answerWriting?.packageIds).toEqual(['pkg-1', 'pkg-2']);
  });

  it('normalizes and deduplicates subject lists case-insensitively', () => {
    expect(normalizeSubjectList(['  Polity ', 'polity', '', 'History'])).toEqual([
      'Polity',
      'History',
    ]);
  });

  it('toggles all subjects in a group on and off', () => {
    const rajasthan = SUBJECT_GROUPS[1].subjects.map((s) => s.name);
    const added = toggleCategorySubjects(['Physics'], rajasthan, true);
    expect(added).toContain('Physics');
    expect(added).toContain('Rajasthan History');
    expect(added).toContain('Rajasthan Economy');

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

  it('returns dynamic planner and focus options from preferred subjects and packages', () => {
    expect(getPreferredSubjectOptions(['Rajasthan History', 'Answer Writing'])).toEqual([
      'Rajasthan History',
      'Answer Writing',
    ]);
    expect(
      getPreferredSubjectOptions(['Indian History'], [
        { id: 'p1', name: 'Pack', subjects: ['Answer Writing'], updatedAt: '2026-11-27T00:00:00Z' },
      ])
    ).toEqual(['Indian History', 'Answer Writing']);
  });
});

describe('PreferredSubjectsManager', () => {
  beforeEach(() => {
    mockScheme = 'light';
  });

  it('renders simplified top header, bottom sync bar, and allows creating custom packages', () => {
    const onChange = jest.fn();
    const onBack = jest.fn();
    const { getByText, queryByText, getByPlaceholderText, getByLabelText } = render(
      <PreferredSubjectsManager
        preferredSubjects={['Rajasthan History']}
        customPackages={[]}
        activePackageId={null}
        onChange={onChange}
        onBack={onBack}
      />
    );

    expect(getByText('Subject Preferences')).toBeTruthy();
    expect(queryByText('Build your study focus')).toBeNull();
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
    const payload = onChange.mock.calls[0][0] as {
      preferredSubjects: string[];
      customPackages: Array<{ name: string; subjects: string[] }>;
      activePackageId: string | null;
    };
    expect(payload.customPackages).toHaveLength(1);
    expect(payload.customPackages[0].name).toBe('RAS Mains Preparation');
    expect(payload.customPackages[0].subjects).toEqual(['Answer Writing']);
    expect(payload.preferredSubjects).toEqual(['Rajasthan History', 'Answer Writing']);

    fireEvent.press(getByLabelText('Done'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('expands only one parent group at a time, selects independent subjects, and searches with parent context', () => {
    const onChange = jest.fn();
    const { getByText, queryByText, getByPlaceholderText } = render(
      <PreferredSubjectsManager
        preferredSubjects={['Indian History']}
        customPackages={[
          {
            id: 'pkg-1',
            name: 'Mains Prep',
            subjects: ['Answer Writing'],
            updatedAt: '2026-11-27T00:00:00Z',
          },
        ]}
        activePackageId={null}
        onChange={onChange}
      />
    );

    // Removable chip in Selected Subjects
    expect(getByText('Indian History ×')).toBeTruthy();
    // Group selected count
    expect(getByText('1/5')).toBeTruthy();

    // Expand General Studies – India
    fireEvent.press(getByText('General Studies – India'));
    expect(getByText('Indian Polity')).toBeTruthy();

    // Expand Science -> collapses General Studies – India
    fireEvent.press(getByText('Science'));
    expect(getByText('Biology')).toBeTruthy();
    expect(queryByText('Indian Polity')).toBeNull();

    // Select an independent subject directly
    fireEvent.press(getByText('Mathematics'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        preferredSubjects: expect.arrayContaining(['Indian History', 'Mathematics']),
      })
    );

    // Custom subject from package is visible in unified selection UI
    expect(getByText('Answer Writing')).toBeTruthy();

    // Search shows matching child subject with parent group context
    fireEvent.changeText(getByPlaceholderText('Search subjects...'), 'Polity');
    expect(getByText('Indian Polity')).toBeTruthy();
    expect(getByText('General Studies – India')).toBeTruthy();
    expect(getByText('Rajasthan Polity')).toBeTruthy();
    expect(getByText('General Studies – Rajasthan')).toBeTruthy();
  });

  it('renders cleanly in dark mode', () => {
    mockScheme = 'dark';
    const { getByText } = render(
      <PreferredSubjectsManager
        preferredSubjects={['Physics', 'Chemistry']}
        customPackages={[
          {
            id: 'pkg-1',
            name: 'Science Pack',
            subjects: ['Physics', 'Chemistry'],
            updatedAt: '2026-11-27T00:00:00Z',
          },
        ]}
        activePackageId="pkg-1"
        onChange={jest.fn()}
      />
    );

    expect(getByText('Subject Preferences')).toBeTruthy();
    expect(getByText('Science Pack')).toBeTruthy();
    expect(getByText('✓ Selected')).toBeTruthy();
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
