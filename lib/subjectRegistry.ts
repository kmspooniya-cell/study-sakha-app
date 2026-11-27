export type SubjectType = 'standard' | 'custom';

export interface SubjectDefinition {
  id: string;
  name: string;
  parentGroupId: string | null;
  type: SubjectType;
  packageIds?: string[];
}

export interface SubjectGroup {
  id: string;
  title: string;
  subjects: SubjectDefinition[];
}

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

export function toSubjectId(name: string, prefix = ''): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!slug) return prefix ? `${prefix}_subject` : 'subject';
  return prefix ? `${prefix}_${slug}` : slug;
}

function makeStandardSubject(
  id: string,
  name: string,
  parentGroupId: string | null
): SubjectDefinition {
  return { id, name, parentGroupId, type: 'standard' };
}

export const SUBJECT_GROUPS: SubjectGroup[] = [
  {
    id: 'gs_india',
    title: 'General Studies – India',
    subjects: [
      makeStandardSubject('indian_history', 'Indian History', 'gs_india'),
      makeStandardSubject('indian_culture', 'Indian Culture', 'gs_india'),
      makeStandardSubject('indian_geography', 'Indian Geography', 'gs_india'),
      makeStandardSubject('indian_polity', 'Indian Polity', 'gs_india'),
      makeStandardSubject('indian_economy', 'Indian Economy', 'gs_india'),
    ],
  },
  {
    id: 'gs_rajasthan',
    title: 'General Studies – Rajasthan',
    subjects: [
      makeStandardSubject('rajasthan_history', 'Rajasthan History', 'gs_rajasthan'),
      makeStandardSubject('rajasthan_culture', 'Rajasthan Culture', 'gs_rajasthan'),
      makeStandardSubject('rajasthan_geography', 'Rajasthan Geography', 'gs_rajasthan'),
      makeStandardSubject('rajasthan_polity', 'Rajasthan Polity', 'gs_rajasthan'),
      makeStandardSubject('rajasthan_economy', 'Rajasthan Economy', 'gs_rajasthan'),
    ],
  },
  {
    id: 'science',
    title: 'Science',
    subjects: [
      makeStandardSubject('biology', 'Biology', 'science'),
      makeStandardSubject('chemistry', 'Chemistry', 'science'),
      makeStandardSubject('physics', 'Physics', 'science'),
    ],
  },
  {
    id: 'ras_mains',
    title: 'RAS Mains Subjects',
    subjects: [
      makeStandardSubject('sociology', 'Sociology', 'ras_mains'),
      makeStandardSubject('management', 'Management', 'ras_mains'),
      makeStandardSubject('accounting_and_auditing', 'Accounting & Auditing', 'ras_mains'),
      makeStandardSubject('ethics', 'Ethics', 'ras_mains'),
      makeStandardSubject('international_relations', 'International Relations', 'ras_mains'),
      makeStandardSubject('public_administration', 'Public Administration', 'ras_mains'),
      makeStandardSubject('behaviour', 'Behaviour', 'ras_mains'),
      makeStandardSubject('law', 'Law', 'ras_mains'),
      makeStandardSubject('general_hindi', 'General Hindi', 'ras_mains'),
      makeStandardSubject('general_english', 'General English', 'ras_mains'),
      makeStandardSubject('world_history', 'World History', 'ras_mains'),
    ],
  },
];

export const INDEPENDENT_SUBJECTS: SubjectDefinition[] = [
  makeStandardSubject('technology', 'Technology', null),
  makeStandardSubject('environment', 'Environment', null),
  makeStandardSubject('mathematics', 'Mathematics', null),
  makeStandardSubject('reasoning', 'Reasoning', null),
  makeStandardSubject('current_affairs', 'Current Affairs', null),
  makeStandardSubject('world_geography', 'World Geography', null),
];

export const STANDARD_SUBJECTS: SubjectDefinition[] = [
  ...SUBJECT_GROUPS.flatMap((g) => g.subjects),
  ...INDEPENDENT_SUBJECTS,
];

/**
 * Compatibility view of the 3 parent groups as SubjectCategory[].
 */
export const SUBJECT_CATEGORIES: SubjectCategory[] = SUBJECT_GROUPS.map((group) => ({
  id: group.id,
  title: group.title,
  subjects: group.subjects.map((s) => s.name),
}));

export function getParentGroupTitle(parentGroupId: string | null): string | null {
  if (!parentGroupId) return null;
  const found = SUBJECT_GROUPS.find((g) => g.id === parentGroupId);
  return found ? found.title : null;
}

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
      updatedAt:
        typeof rec.updatedAt === 'string' && rec.updatedAt
          ? rec.updatedAt
          : new Date().toISOString(),
    });
  }
  return result;
}

/**
 * Builds the unified subject registry combining standard grouped subjects,
 * independent subjects, custom package subjects, and any preserved legacy selections.
 * Deduplicates case-insensitively and retains stable IDs and package associations.
 */
export function buildUnifiedSubjectRegistry(
  preferredSubjects: string[] = [],
  customPackages: CustomSubjectPackage[] = []
): SubjectDefinition[] {
  const byKey = new Map<string, SubjectDefinition>();

  for (const std of STANDARD_SUBJECTS) {
    byKey.set(std.name.toLowerCase(), { ...std, packageIds: [] });
  }

  for (const pkg of customPackages) {
    for (const rawSub of pkg.subjects) {
      const trimmed = rawSub.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      const existing = byKey.get(key);
      if (existing) {
        const nextIds = existing.packageIds ? [...existing.packageIds] : [];
        if (!nextIds.includes(pkg.id)) nextIds.push(pkg.id);
        byKey.set(key, { ...existing, packageIds: nextIds });
      } else {
        byKey.set(key, {
          id: toSubjectId(trimmed, 'custom'),
          name: trimmed,
          parentGroupId: null,
          type: 'custom',
          packageIds: [pkg.id],
        });
      }
    }
  }

  // Preserve any legacy or previously saved user selections not in standard/packages
  for (const rawSub of normalizeSubjectList(preferredSubjects)) {
    const key = rawSub.toLowerCase();
    if (!byKey.has(key)) {
      byKey.set(key, {
        id: toSubjectId(rawSub, 'custom'),
        name: rawSub,
        parentGroupId: null,
        type: 'custom',
        packageIds: [],
      });
    }
  }

  return Array.from(byKey.values());
}

export function getCustomSubjects(registry: SubjectDefinition[]): SubjectDefinition[] {
  return registry.filter((entry) => entry.type === 'custom');
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

export function getPreferredSubjectOptions(
  preferredSubjects: string[],
  customPackages: CustomSubjectPackage[] = []
): string[] {
  const selected = normalizeSubjectList(preferredSubjects);
  if (customPackages.length === 0) return selected;
  const pkgSubjects = customPackages.flatMap((pkg) => pkg.subjects);
  return normalizeSubjectList([...selected, ...pkgSubjects]);
}
