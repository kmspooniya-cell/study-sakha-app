export interface SubjectCategory {
  id: string;
  title: string;
  subjects: string[];
}

export interface CustomSubjectPackage {
  id: string;
  name: string;
  subjects: string[];
  updatedAt: string;
}

export const SUBJECT_CATEGORIES: SubjectCategory[] = [
  {
    id: 'rajasthan_studies',
    title: 'Rajasthan Studies',
    subjects: [
      'Rajasthan History & Culture',
      'Rajasthan Geography',
      'Rajasthan Polity',
      'Rajasthan Economy',
      'Rajasthan Art & Heritage',
    ],
  },
  {
    id: 'indian_history',
    title: 'Indian History',
    subjects: [
      'Ancient History',
      'Medieval History',
      'Modern History',
      'Indian National Movement',
    ],
  },
  {
    id: 'indian_geography',
    title: 'Indian Geography',
    subjects: [
      'Physical Geography',
      'Human Geography',
      'Economic Geography',
    ],
  },
  {
    id: 'indian_polity',
    title: 'Indian Polity',
    subjects: [
      'Constitution',
      'Governance',
      'Administration',
    ],
  },
  {
    id: 'indian_economy',
    title: 'Indian Economy',
    subjects: [
      'Banking',
      'Budget',
      'Economic Development',
    ],
  },
  {
    id: 'science_tech',
    title: 'Science & Technology',
    subjects: [
      'Physics',
      'Chemistry',
      'Biology',
      'IT',
      'Space Technology',
    ],
  },
  {
    id: 'environment',
    title: 'Environment',
    subjects: [
      'Ecology',
      'Biodiversity',
      'Climate Change',
    ],
  },
  {
    id: 'current_affairs',
    title: 'Current Affairs',
    subjects: [
      'National Current Affairs',
      'International Current Affairs',
      'Rajasthan Current Affairs',
    ],
  },
  {
    id: 'reasoning_aptitude',
    title: 'Reasoning & Aptitude',
    subjects: [
      'Logical Reasoning',
      'Quantitative Aptitude',
      'Mental Ability',
    ],
  },
  {
    id: 'languages',
    title: 'Languages',
    subjects: [
      'Hindi Grammar',
      'English Grammar',
      'Hindi & English Writing',
    ],
  },
  {
    id: 'ethics_admin',
    title: 'Ethics & Administration',
    subjects: [
      'Ethics',
      'Integrity',
      'Aptitude',
      'Public Administration',
    ],
  },
];

export function normalizeSubjectList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export function normalizeCustomPackages(value: unknown): CustomSubjectPackage[] {
  if (!Array.isArray(value)) return [];
  const result: CustomSubjectPackage[] = [];
  const seenIds = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const id = typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim() : '';
    const name = typeof rec.name === 'string' && rec.name.trim() ? rec.name.trim() : '';
    if (!id || !name || seenIds.has(id)) continue;
    seenIds.add(id);
    result.push({
      id,
      name,
      subjects: normalizeSubjectList(rec.subjects),
      updatedAt: typeof rec.updatedAt === 'string' && rec.updatedAt ? rec.updatedAt : new Date().toISOString(),
    });
  }
  return result;
}

export function toggleCategorySubjects(
  current: string[],
  categorySubjects: string[],
  selectAll: boolean
): string[] {
  const normalizedCurrent = normalizeSubjectList(current);
  const categoryKeys = new Set(categorySubjects.map((s) => s.trim().toLowerCase()));

  if (selectAll) {
    return normalizeSubjectList([...normalizedCurrent, ...categorySubjects]);
  }
  return normalizedCurrent.filter((s) => !categoryKeys.has(s.trim().toLowerCase()));
}

export function isPackageFullySelected(current: string[], pkgSubjects: string[]): boolean {
  if (pkgSubjects.length === 0) return false;
  const currentKeys = new Set(normalizeSubjectList(current).map((s) => s.toLowerCase()));
  return pkgSubjects.every((s) => currentKeys.has(s.trim().toLowerCase()));
}

export function getPreferredSubjectOptions(preferredSubjects: string[]): string[] {
  return normalizeSubjectList(preferredSubjects);
}
