import React, { useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  INDEPENDENT_SUBJECTS,
  SUBJECT_GROUPS,
  type CustomSubjectPackage,
  type SubjectDefinition,
  buildUnifiedSubjectRegistry,
  getCustomSubjects,
  getParentGroupTitle,
  isPackageFullySelected,
  normalizeSubjectList,
  toggleCategorySubjects,
} from '../lib/subjectRegistry';
import { useTheme } from '../lib/theme';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface PreferredSubjectsManagerProps {
  preferredSubjects: string[];
  customPackages: CustomSubjectPackage[];
  activePackageId: string | null;
  onChange: (next: {
    preferredSubjects: string[];
    customPackages: CustomSubjectPackage[];
    activePackageId: string | null;
  }) => void;
  onBack?: () => void;
  t?: (en: string, hi?: string) => string;
}

export function PreferredSubjectsManager({
  preferredSubjects,
  customPackages,
  activePackageId,
  onChange,
  onBack,
  t = (en) => en,
}: PreferredSubjectsManagerProps) {
  const { colors, scheme, f, reduceMotion } = useTheme();
  const { width: viewportWidth } = useWindowDimensions();
  const isTablet = viewportWidth >= 768;

  const fs = (size: number) => (typeof f === 'function' ? f(size) : size);
  const isDark = scheme === 'dark';
  const accentColor = colors.brandPrimary || colors.blue || '#4f46e5';
  const selectedBg =
    colors.selectedSurface ||
    colors.tint ||
    (isDark ? 'rgba(111,149,255,0.16)' : 'rgba(79,70,229,0.08)');
  const bgColor = colors.bg || colors.surfaceBase || colors.surfaceAlt;
  const dangerColor = colors.danger || colors.red || '#EF4444';
  const successColor = colors.success || colors.green || '#059669';
  const borderSubtle = colors.borderSubtle || colors.border;
  const borderStrong = colors.borderStrong || colors.border;

  // Only one parent group expanded at a time
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Custom package editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [packageNameInput, setPackageNameInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [packageSubjects, setPackageSubjects] = useState<string[]>([]);
  const [editingSubjectIndex, setEditingSubjectIndex] = useState<number | null>(
    null
  );
  const [editingSubjectText, setEditingSubjectText] = useState('');
  const [editorError, setEditorError] = useState<string | null>(null);

  const selectedList = useMemo(
    () => normalizeSubjectList(preferredSubjects),
    [preferredSubjects]
  );

  const selectedKeySet = useMemo(
    () => new Set(selectedList.map((s) => s.toLowerCase())),
    [selectedList]
  );

  const unifiedRegistry = useMemo(
    () => buildUnifiedSubjectRegistry(selectedList, customPackages),
    [selectedList, customPackages]
  );

  const customSubjectsList = useMemo(
    () => getCustomSubjects(unifiedRegistry),
    [unifiedRegistry]
  );

  const packageNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const pkg of customPackages) {
      map.set(pkg.id, pkg.name);
    }
    return map;
  }, [customPackages]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Search across parent groups, child subjects, independent subjects, and custom subjects
  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];
    const results: {
      entry: SubjectDefinition;
      contextLabel: string;
    }[] = [];

    for (const entry of unifiedRegistry) {
      const parentTitle = getParentGroupTitle(entry.parentGroupId);
      const subjectMatch = entry.name.toLowerCase().includes(normalizedQuery);
      const groupMatch = parentTitle
        ? parentTitle.toLowerCase().includes(normalizedQuery)
        : false;

      if (!subjectMatch && !groupMatch) continue;

      let contextLabel = t('Independent Subject', 'स्वतंत्र विषय');
      if (parentTitle) {
        contextLabel = parentTitle;
      } else if (entry.type === 'custom') {
        const pkgNames = (entry.packageIds ?? [])
          .map((id) => packageNameById.get(id))
          .filter(Boolean);
        contextLabel =
          pkgNames.length > 0
            ? `${t('Custom', 'कस्टम')} · ${pkgNames[0]}`
            : t('Custom Subject', 'कस्टम विषय');
      }

      results.push({ entry, contextLabel });
    }

    return results;
  }, [normalizedQuery, packageNameById, t, unifiedRegistry]);

  const animateLayout = () => {
    if (!reduceMotion && Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  };

  const handleToggleGroup = (groupId: string) => {
    animateLayout();
    setExpandedGroupId((prev) => (prev === groupId ? null : groupId));
  };

  const toggleSubject = (subject: string) => {
    const key = subject.trim().toLowerCase();
    const exists = selectedKeySet.has(key);
    const nextSubjects = exists
      ? selectedList.filter((s) => s.toLowerCase() !== key)
      : normalizeSubjectList([...selectedList, subject]);
    onChange({
      preferredSubjects: nextSubjects,
      customPackages,
      activePackageId,
    });
  };

  const handleClearAll = () => {
    onChange({
      preferredSubjects: [],
      customPackages,
      activePackageId: null,
    });
  };

  const openCreatePackage = () => {
    animateLayout();
    setEditingPackageId(null);
    setPackageNameInput('');
    setSubjectInput('');
    setPackageSubjects([]);
    setEditingSubjectIndex(null);
    setEditingSubjectText('');
    setEditorError(null);
    setEditorOpen(true);
  };

  const openEditPackage = (pkg: CustomSubjectPackage) => {
    animateLayout();
    setEditingPackageId(pkg.id);
    setPackageNameInput(pkg.name);
    setSubjectInput('');
    setPackageSubjects([...pkg.subjects]);
    setEditingSubjectIndex(null);
    setEditingSubjectText('');
    setEditorError(null);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    animateLayout();
    setEditorOpen(false);
    setEditingPackageId(null);
    setEditorError(null);
    setEditingSubjectIndex(null);
  };

  const handleAddSubjectToPackage = () => {
    const trimmed = subjectInput.trim();
    if (!trimmed) return;
    if (
      packageSubjects.some((s) => s.toLowerCase() === trimmed.toLowerCase())
    ) {
      setEditorError(
        t('Subject already in package', 'विषय पहले से पैकेज में है')
      );
      return;
    }
    setPackageSubjects((prev) => [...prev, trimmed]);
    setSubjectInput('');
    setEditorError(null);
  };

  const handleRemoveSubjectFromPackage = (index: number) => {
    setPackageSubjects((prev) => prev.filter((_, i) => i !== index));
    if (editingSubjectIndex === index) {
      setEditingSubjectIndex(null);
      setEditingSubjectText('');
    }
  };

  const handleSaveInlineSubjectEdit = (index: number) => {
    const trimmed = editingSubjectText.trim();
    if (!trimmed) {
      handleRemoveSubjectFromPackage(index);
      return;
    }
    setPackageSubjects((prev) => {
      const next = [...prev];
      next[index] = trimmed;
      return normalizeSubjectList(next);
    });
    setEditingSubjectIndex(null);
    setEditingSubjectText('');
  };

  const handleSavePackage = () => {
    const trimmedName = packageNameInput.trim();
    if (!trimmedName) {
      setEditorError(
        t('Please enter a package name', 'कृपया पैकेज का नाम दर्ज करें')
      );
      return;
    }
    const finalSubjects = normalizeSubjectList(packageSubjects);
    if (finalSubjects.length === 0) {
      setEditorError(t('Add at least one subject', 'कम से कम एक विषय जोड़ें'));
      return;
    }

    const now = new Date().toISOString();
    let nextPackages: CustomSubjectPackage[];
    let nextActiveId = activePackageId;

    if (editingPackageId) {
      nextPackages = customPackages.map((pkg) =>
        pkg.id === editingPackageId
          ? { ...pkg, name: trimmedName, subjects: finalSubjects, updatedAt: now }
          : pkg
      );
    } else {
      const newPkg: CustomSubjectPackage = {
        id: `pkg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: trimmedName,
        subjects: finalSubjects,
        updatedAt: now,
      };
      nextPackages = [newPkg, ...customPackages];
      nextActiveId = newPkg.id;
    }

    const nextPreferred =
      nextActiveId === editingPackageId || !editingPackageId
        ? normalizeSubjectList([...selectedList, ...finalSubjects])
        : selectedList;

    onChange({
      preferredSubjects: nextPreferred,
      customPackages: nextPackages,
      activePackageId: nextActiveId,
    });
    closeEditor();
  };

  const handleDeletePackage = (pkgId: string) => {
    const nextPackages = customPackages.filter((p) => p.id !== pkgId);
    onChange({
      preferredSubjects: selectedList,
      customPackages: nextPackages,
      activePackageId: activePackageId === pkgId ? null : activePackageId,
    });
    if (editingPackageId === pkgId) {
      closeEditor();
    }
  };

  const handleTogglePackageSelection = (pkg: CustomSubjectPackage) => {
    const fullySelected = isPackageFullySelected(selectedList, pkg.subjects);
    if (fullySelected) {
      const nextSubjects = toggleCategorySubjects(
        selectedList,
        pkg.subjects,
        false
      );
      onChange({
        preferredSubjects: nextSubjects,
        customPackages,
        activePackageId: activePackageId === pkg.id ? null : activePackageId,
      });
    } else {
      const nextSubjects = toggleCategorySubjects(
        selectedList,
        pkg.subjects,
        true
      );
      onChange({
        preferredSubjects: nextSubjects,
        customPackages,
        activePackageId: pkg.id,
      });
    }
  };

  return (
    <View style={[styles.workspace, { backgroundColor: bgColor }]}>
      {/* 1. SIMPLIFIED TOP HEADER: ONLY Back arrow + Title */}
      <View
        style={[
          styles.topHeader,
          {
            backgroundColor: colors.surface,
            borderBottomColor: borderSubtle,
          },
        ]}
      >
        <View style={[styles.headerRow, isTablet && styles.responsiveWidth]}>
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              hitSlop={8}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel={t(
                'Back to previous Settings screen',
                'पिछली सेटिंग्स स्क्रीन पर जाएँ'
              )}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>
          ) : null}
          <Text
            style={[
              styles.headerTitle,
              { color: colors.text, fontSize: fs(17) },
            ]}
            numberOfLines={1}
          >
            {t('Subject Preferences', 'विषय प्राथमिकताएं')}
          </Text>
        </View>
      </View>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentColumn, isTablet && styles.responsiveWidth]}>
          {/* 5. SELECTED SUBJECTS */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: borderSubtle,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <Text
                style={{
                  fontSize: fs(14),
                  fontWeight: '700',
                  color: colors.text,
                }}
              >
                {t('Selected Subjects', 'चयनित विषय')}
              </Text>
              {selectedList.length > 0 && (
                <TouchableOpacity
                  onPress={handleClearAll}
                  style={[
                    styles.smallBtn,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: borderSubtle,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Clear all selected subjects"
                >
                  <Text
                    style={{
                      fontSize: fs(11.5),
                      fontWeight: '600',
                      color: colors.textSecondary,
                    }}
                  >
                    {t('Clear All', 'सभी हटाएं')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {selectedList.length > 0 ? (
              <View style={styles.chipsWrap}>
                {selectedList.map((sub) => (
                  <TouchableOpacity
                    key={sub}
                    onPress={() => toggleSubject(sub)}
                    style={[
                      styles.selectedChip,
                      {
                        backgroundColor: selectedBg,
                        borderColor: `${accentColor}45`,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${sub}`}
                  >
                    <Text
                      style={{
                        fontSize: fs(12),
                        fontWeight: '600',
                        color: accentColor,
                        flexShrink: 1,
                      }}
                      numberOfLines={1}
                    >
                      {sub} ×
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text
                style={{
                  fontSize: fs(12),
                  color: colors.textMuted,
                  marginTop: 8,
                }}
              >
                {t(
                  'No subjects selected yet.',
                  'अभी तक कोई विषय नहीं चुना गया है।'
                )}
              </Text>
            )}
          </View>

          {/* 6. DEDICATED SUBJECT SEARCH */}
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: colors.surface,
                borderColor: normalizedQuery ? accentColor : borderStrong,
              },
            ]}
          >
            <Ionicons
              name="search"
              size={17}
              color={normalizedQuery ? accentColor : colors.textMuted}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('Search subjects...', 'विषय खोजें...')}
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              style={[
                styles.searchInput,
                { color: colors.text, fontSize: fs(13.5) },
              ]}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('Clear search', 'खोज साफ करें')}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>

          {normalizedQuery.length > 0 ? (
            /* SEARCH RESULTS WITH PARENT GROUP CONTEXT */
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: borderSubtle,
                  padding: 0,
                  overflow: 'hidden',
                },
              ]}
            >
              {searchResults.length === 0 ? (
                <View style={styles.emptySearchBox}>
                  <Text
                    style={{
                      fontSize: fs(13),
                      fontWeight: '600',
                      color: colors.text,
                    }}
                  >
                    {t(
                      'No matching subjects found',
                      'कोई मेल खाने वाला विषय नहीं मिला'
                    )}
                  </Text>
                </View>
              ) : (
                searchResults.map(({ entry, contextLabel }, idx) => {
                  const isSelected = selectedKeySet.has(
                    entry.name.toLowerCase()
                  );
                  const isLast = idx === searchResults.length - 1;
                  return (
                    <TouchableOpacity
                      key={entry.id}
                      onPress={() => toggleSubject(entry.name)}
                      activeOpacity={0.75}
                      style={[
                        styles.subjectRow,
                        {
                          backgroundColor: isSelected
                            ? selectedBg
                            : colors.surface,
                          borderBottomColor: borderSubtle,
                          borderBottomWidth: isLast
                            ? 0
                            : StyleSheet.hairlineWidth,
                        },
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          {
                            backgroundColor: isSelected
                              ? accentColor
                              : 'transparent',
                            borderColor: isSelected
                              ? accentColor
                              : borderStrong,
                          },
                        ]}
                      >
                        {isSelected && (
                          <Ionicons
                            name="checkmark"
                            size={13}
                            color="#ffffff"
                          />
                        )}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{
                            fontSize: fs(13.5),
                            fontWeight: isSelected ? '600' : '500',
                            color: colors.text,
                          }}
                          numberOfLines={1}
                        >
                          {entry.name}
                        </Text>
                        <Text
                          style={{
                            fontSize: fs(11),
                            color: colors.textMuted,
                            marginTop: 1,
                          }}
                          numberOfLines={1}
                        >
                          {contextLabel}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          ) : (
            <>
              {/* 2 & 3. MAIN SUBJECT GROUPS (ONLY ONE EXPANDED AT A TIME) */}
              <View style={styles.groupsList}>
                {SUBJECT_GROUPS.map((group) => {
                  const expanded = expandedGroupId === group.id;
                  const groupSubjectNames = group.subjects.map((s) => s.name);
                  const selectedInGroup = groupSubjectNames.filter((name) =>
                    selectedKeySet.has(name.toLowerCase())
                  ).length;

                  return (
                    <View
                      key={group.id}
                      style={[
                        styles.groupCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: expanded ? accentColor : borderSubtle,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => handleToggleGroup(group.id)}
                        style={styles.groupHeader}
                        accessibilityRole="button"
                        accessibilityState={{ expanded }}
                      >
                        <Text
                          style={{
                            flex: 1,
                            fontSize: fs(14),
                            fontWeight: '700',
                            color: colors.text,
                          }}
                          numberOfLines={1}
                        >
                          {group.title}
                        </Text>
                        <View style={styles.groupRight}>
                          <Text
                            style={{
                              fontSize: fs(12),
                              fontWeight: '700',
                              color:
                                selectedInGroup > 0
                                  ? accentColor
                                  : colors.textMuted,
                            }}
                          >
                            {selectedInGroup}/{group.subjects.length}
                          </Text>
                          <Ionicons
                            name={expanded ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={colors.textMuted}
                          />
                        </View>
                      </TouchableOpacity>

                      {expanded && (
                        <View
                          style={[
                            styles.groupBody,
                            { borderTopColor: borderSubtle },
                          ]}
                        >
                          <View
                            style={[
                              styles.groupActionsBar,
                              { backgroundColor: colors.surfaceAlt },
                            ]}
                          >
                            <TouchableOpacity
                              onPress={() =>
                                onChange({
                                  preferredSubjects: toggleCategorySubjects(
                                    selectedList,
                                    groupSubjectNames,
                                    true
                                  ),
                                  customPackages,
                                  activePackageId,
                                })
                              }
                              style={[
                                styles.inlineActionBtn,
                                {
                                  backgroundColor: colors.surface,
                                  borderColor: borderSubtle,
                                },
                              ]}
                            >
                              <Text
                                style={{
                                  fontSize: fs(11.5),
                                  fontWeight: '700',
                                  color: accentColor,
                                }}
                              >
                                {t('Select All', 'सभी चुनें')}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() =>
                                onChange({
                                  preferredSubjects: toggleCategorySubjects(
                                    selectedList,
                                    groupSubjectNames,
                                    false
                                  ),
                                  customPackages,
                                  activePackageId,
                                })
                              }
                              style={[
                                styles.inlineActionBtn,
                                {
                                  backgroundColor: colors.surface,
                                  borderColor: borderSubtle,
                                },
                              ]}
                            >
                              <Text
                                style={{
                                  fontSize: fs(11.5),
                                  fontWeight: '600',
                                  color: colors.textSecondary,
                                }}
                              >
                                {t('Clear All', 'सभी हटाएं')}
                              </Text>
                            </TouchableOpacity>
                          </View>

                          {group.subjects.map((sub, idx) => {
                            const isSelected = selectedKeySet.has(
                              sub.name.toLowerCase()
                            );
                            const isLast = idx === group.subjects.length - 1;
                            return (
                              <TouchableOpacity
                                key={sub.id}
                                onPress={() => toggleSubject(sub.name)}
                                activeOpacity={0.75}
                                style={[
                                  styles.subjectRow,
                                  {
                                    backgroundColor: isSelected
                                      ? selectedBg
                                      : colors.surface,
                                    borderBottomColor: borderSubtle,
                                    borderBottomWidth: isLast
                                      ? 0
                                      : StyleSheet.hairlineWidth,
                                  },
                                ]}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: isSelected }}
                              >
                                <View
                                  style={[
                                    styles.checkbox,
                                    {
                                      backgroundColor: isSelected
                                        ? accentColor
                                        : 'transparent',
                                      borderColor: isSelected
                                        ? accentColor
                                        : borderStrong,
                                    },
                                  ]}
                                >
                                  {isSelected && (
                                    <Ionicons
                                      name="checkmark"
                                      size={13}
                                      color="#ffffff"
                                    />
                                  )}
                                </View>
                                <Text
                                  style={{
                                    flex: 1,
                                    fontSize: fs(13.5),
                                    fontWeight: isSelected ? '600' : '500',
                                    color: colors.text,
                                  }}
                                >
                                  {sub.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* D. INDEPENDENT SUBJECTS (INDIVIDUAL SELECTABLE BUTTONS) */}
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: borderSubtle,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: fs(14),
                    fontWeight: '700',
                    color: colors.text,
                  }}
                >
                  {t('Independent Subjects', 'स्वतंत्र विषय')}
                </Text>

                <View style={styles.independentWrap}>
                  {INDEPENDENT_SUBJECTS.map((sub) => {
                    const isSelected = selectedKeySet.has(
                      sub.name.toLowerCase()
                    );
                    return (
                      <TouchableOpacity
                        key={sub.id}
                        onPress={() => toggleSubject(sub.name)}
                        activeOpacity={0.75}
                        style={[
                          styles.independentBtn,
                          {
                            backgroundColor: isSelected
                              ? accentColor
                              : colors.surfaceAlt,
                            borderColor: isSelected
                              ? accentColor
                              : borderSubtle,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Text
                          style={{
                            fontSize: fs(12.5),
                            fontWeight: '600',
                            color: isSelected ? '#ffffff' : colors.text,
                          }}
                        >
                          {sub.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {customSubjectsList.length > 0 && (
                  <View
                    style={[
                      styles.customSubjectsBlock,
                      { borderTopColor: borderSubtle },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: fs(12.5),
                        fontWeight: '700',
                        color: colors.textSecondary,
                      }}
                    >
                      {t('Custom Subjects', 'कस्टम विषय')}
                    </Text>
                    <View style={styles.independentWrap}>
                      {customSubjectsList.map((sub) => {
                        const isSelected = selectedKeySet.has(
                          sub.name.toLowerCase()
                        );
                        return (
                          <TouchableOpacity
                            key={sub.id}
                            onPress={() => toggleSubject(sub.name)}
                            activeOpacity={0.75}
                            style={[
                              styles.independentBtn,
                              {
                                backgroundColor: isSelected
                                  ? accentColor
                                  : colors.surfaceAlt,
                                borderColor: isSelected
                                  ? accentColor
                                  : borderSubtle,
                              },
                            ]}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                          >
                            <Text
                              style={{
                                fontSize: fs(12.5),
                                fontWeight: '600',
                                color: isSelected ? '#ffffff' : colors.text,
                              }}
                            >
                              {sub.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            </>
          )}

          {/* 4. CUSTOM SUBJECT PACKAGES */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: borderSubtle,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <Text
                style={{
                  fontSize: fs(14),
                  fontWeight: '700',
                  color: colors.text,
                }}
              >
                {t('Custom Packages', 'कस्टम पैकेज')}
              </Text>

              {!editorOpen && (
                <TouchableOpacity
                  onPress={openCreatePackage}
                  style={[
                    styles.primarySmallBtn,
                    { backgroundColor: accentColor },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Create Custom Package"
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text
                    style={{
                      fontSize: fs(12),
                      fontWeight: '700',
                      color: '#fff',
                    }}
                  >
                    {t('Create Package', 'पैकेज बनाएं')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {editorOpen && (
              <View
                style={[
                  styles.editorBox,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: borderSubtle,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: fs(13),
                    fontWeight: '700',
                    color: colors.text,
                    marginBottom: 8,
                  }}
                >
                  {editingPackageId
                    ? t('Edit Custom Package', 'कस्टम पैकेज संपादित करें')
                    : t('New Custom Package', 'नया कस्टम पैकेज')}
                </Text>

                <TextInput
                  value={packageNameInput}
                  onChangeText={setPackageNameInput}
                  placeholder={t(
                    'Package Name (e.g. RAS Mains Preparation)',
                    'पैकेज का नाम'
                  )}
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      borderColor: borderSubtle,
                      color: colors.text,
                      fontSize: fs(13),
                    },
                  ]}
                />

                <View style={styles.addSubjectRow}>
                  <TextInput
                    value={subjectInput}
                    onChangeText={setSubjectInput}
                    placeholder={t(
                      'Add custom subject...',
                      'कस्टम विषय जोड़ें...'
                    )}
                    placeholderTextColor={colors.textMuted}
                    onSubmitEditing={handleAddSubjectToPackage}
                    returnKeyType="done"
                    style={[
                      styles.input,
                      {
                        flex: 1,
                        backgroundColor: colors.surface,
                        borderColor: borderSubtle,
                        color: colors.text,
                        fontSize: fs(13),
                        marginBottom: 0,
                      },
                    ]}
                  />
                  <TouchableOpacity
                    onPress={handleAddSubjectToPackage}
                    style={[styles.addBtn, { backgroundColor: accentColor }]}
                  >
                    <Text
                      style={{
                        fontSize: fs(12),
                        fontWeight: '700',
                        color: '#fff',
                      }}
                    >
                      {t('+ Add', '+ जोड़ें')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {packageSubjects.length > 0 && (
                  <View style={styles.pkgSubjectList}>
                    {packageSubjects.map((sub, idx) => (
                      <View
                        key={`${sub}-${idx}`}
                        style={[
                          styles.pkgSubjectItem,
                          {
                            backgroundColor: colors.surface,
                            borderColor: borderSubtle,
                          },
                        ]}
                      >
                        {editingSubjectIndex === idx ? (
                          <View style={styles.inlineEditRow}>
                            <TextInput
                              value={editingSubjectText}
                              onChangeText={setEditingSubjectText}
                              autoFocus
                              onSubmitEditing={() =>
                                handleSaveInlineSubjectEdit(idx)
                              }
                              style={[
                                styles.inlineEditInput,
                                {
                                  color: colors.text,
                                  borderColor: accentColor,
                                  fontSize: fs(12),
                                },
                              ]}
                            />
                            <TouchableOpacity
                              onPress={() => handleSaveInlineSubjectEdit(idx)}
                            >
                              <Ionicons
                                name="checkmark-circle"
                                size={20}
                                color={accentColor}
                              />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <>
                            <Text
                              style={{
                                flex: 1,
                                fontSize: fs(12),
                                color: colors.text,
                                fontWeight: '500',
                              }}
                            >
                              {sub}
                            </Text>
                            <TouchableOpacity
                              onPress={() => {
                                setEditingSubjectIndex(idx);
                                setEditingSubjectText(sub);
                              }}
                              style={{ paddingHorizontal: 6 }}
                            >
                              <Ionicons
                                name="pencil-outline"
                                size={16}
                                color={colors.textMuted}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleRemoveSubjectFromPackage(idx)}
                            >
                              <Ionicons
                                name="close-circle-outline"
                                size={18}
                                color={colors.textMuted}
                              />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {editorError && (
                  <Text
                    style={{
                      fontSize: fs(12),
                      color: dangerColor,
                      marginTop: 6,
                    }}
                  >
                    {editorError}
                  </Text>
                )}

                <View style={styles.editorActions}>
                  <TouchableOpacity
                    onPress={closeEditor}
                    style={[
                      styles.smallBtn,
                      {
                        backgroundColor: colors.surface,
                        borderColor: borderSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: fs(12),
                        fontWeight: '600',
                        color: colors.textSecondary,
                      }}
                    >
                      {t('Cancel', 'रद्द करें')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSavePackage}
                    style={[
                      styles.primarySmallBtn,
                      { backgroundColor: accentColor },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: fs(12),
                        fontWeight: '700',
                        color: '#fff',
                      }}
                    >
                      {t('Save Package', 'पैकेज सहेजें')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {customPackages.length > 0 ? (
              <View style={styles.packageList}>
                {customPackages.map((pkg) => {
                  const selected = isPackageFullySelected(
                    selectedList,
                    pkg.subjects
                  );
                  return (
                    <View
                      key={pkg.id}
                      style={[
                        styles.packageCard,
                        {
                          backgroundColor: selected
                            ? selectedBg
                            : colors.surfaceAlt,
                          borderColor: selected ? accentColor : borderSubtle,
                        },
                      ]}
                    >
                      <View style={{ gap: 2 }}>
                        <Text
                          style={{
                            fontSize: fs(13.5),
                            fontWeight: '700',
                            color: colors.text,
                          }}
                          numberOfLines={1}
                        >
                          {pkg.name}
                        </Text>
                        <Text
                          style={{
                            fontSize: fs(11.5),
                            color: colors.textMuted,
                          }}
                          numberOfLines={2}
                        >
                          {pkg.subjects.length} {t('subjects', 'विषय')}:{' '}
                          {pkg.subjects.join(', ')}
                        </Text>
                      </View>

                      <View style={styles.packageActionsRow}>
                        <TouchableOpacity
                          onPress={() => handleTogglePackageSelection(pkg)}
                          style={[
                            styles.smallBtn,
                            {
                              backgroundColor: selected
                                ? accentColor
                                : colors.surface,
                              borderColor: selected
                                ? accentColor
                                : borderSubtle,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: fs(12),
                              fontWeight: '600',
                              color: selected ? '#fff' : colors.text,
                            }}
                          >
                            {selected
                              ? t('✓ Selected', '✓ चयनित')
                              : t('Select Package', 'पैकेज चुनें')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => openEditPackage(pkg)}
                          style={[
                            styles.smallBtn,
                            {
                              backgroundColor: colors.surface,
                              borderColor: borderSubtle,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: fs(12),
                              fontWeight: '600',
                              color: colors.textSecondary,
                            }}
                          >
                            {t('Edit', 'संपादित करें')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeletePackage(pkg.id)}
                          style={[
                            styles.smallBtn,
                            {
                              backgroundColor: colors.surface,
                              borderColor: borderSubtle,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: fs(12),
                              fontWeight: '600',
                              color: dangerColor,
                            }}
                          >
                            {t('Delete', 'हटाएं')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              !editorOpen && (
                <Text
                  style={{
                    fontSize: fs(12),
                    color: colors.textMuted,
                    marginTop: 10,
                  }}
                >
                  {t(
                    'No custom packages yet. Create one for your target exam.',
                    'अभी कोई कस्टम पैकेज नहीं है।'
                  )}
                </Text>
              )
            )}
          </View>
        </View>
      </ScrollView>

      {/* BOTTOM SYNC STATUS BAR */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: borderSubtle,
          },
        ]}
      >
        <View
          style={[styles.bottomBarInner, isTablet && styles.responsiveWidth]}
        >
          <View style={styles.bottomStatusGroup}>
            <View
              style={[styles.syncDot, { backgroundColor: successColor }]}
            />
            <Text
              style={{
                fontSize: fs(12.5),
                fontWeight: '600',
                color: colors.text,
                flexShrink: 1,
              }}
              numberOfLines={1}
            >
              {selectedList.length} {t('selected', 'चयनित')} •{' '}
              {t('Synced with Study Planner', 'स्टडी प्लानर से सिंक')}
            </Text>
          </View>

          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={[styles.doneBtn, { backgroundColor: accentColor }]}
              accessibilityRole="button"
              accessibilityLabel={t('Done', 'हो गया')}
            >
              <Text
                style={{
                  fontSize: fs(12.5),
                  fontWeight: '700',
                  color: '#ffffff',
                }}
              >
                {t('Done', 'हो गया')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  workspace: {
    flex: 1,
  },
  responsiveWidth: {
    maxWidth: 880,
    width: '100%',
    alignSelf: 'center',
  },
  topHeader: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
  },
  headerTitle: {
    flex: 1,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  scrollContentTablet: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 28,
  },
  contentColumn: {
    gap: 12,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  selectedChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '100%',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
  },
  emptySearchBox: {
    padding: 18,
    alignItems: 'center',
  },
  groupsList: {
    gap: 10,
  },
  groupCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  groupRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupBody: {
    borderTopWidth: 1,
  },
  groupActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  inlineActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 46,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  independentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  independentBtn: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  customSubjectsBlock: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  primarySmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  editorBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
  },
  addSubjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  pkgSubjectList: {
    marginTop: 10,
    gap: 6,
  },
  pkgSubjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  inlineEditRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineEditInput: {
    flex: 1,
    borderBottomWidth: 1,
    paddingVertical: 2,
  },
  editorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  packageList: {
    marginTop: 12,
    gap: 10,
  },
  packageCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  packageActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bottomBar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bottomBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bottomStatusGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  doneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
});
