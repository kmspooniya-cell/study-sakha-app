import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  SUBJECT_CATEGORIES,
  type CustomSubjectPackage,
  isPackageFullySelected,
  normalizeSubjectList,
  toggleCategorySubjects,
} from '../lib/subjectRegistry';
import { useTheme } from '../lib/theme';

export interface PreferredSubjectsManagerProps {
  preferredSubjects: string[];
  customPackages: CustomSubjectPackage[];
  activePackageId: string | null;
  onChange: (next: {
    preferredSubjects: string[];
    customPackages: CustomSubjectPackage[];
    activePackageId: string | null;
  }) => void;
  t?: (en: string, hi?: string) => string;
}

export function PreferredSubjectsManager({
  preferredSubjects,
  customPackages,
  activePackageId,
  onChange,
  t = (en) => en,
}: PreferredSubjectsManagerProps) {
  const { colors } = useTheme();
  const accentColor = colors.blue || '#4f46e5';
  const fs = (size: number) => size;

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    rajasthan_studies: true,
  });

  // Custom package editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [packageNameInput, setPackageNameInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [packageSubjects, setPackageSubjects] = useState<string[]>([]);
  const [editingSubjectIndex, setEditingSubjectIndex] = useState<number | null>(null);
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

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
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
    setEditorOpen(false);
    setEditingPackageId(null);
    setEditorError(null);
    setEditingSubjectIndex(null);
  };

  const handleAddSubjectToPackage = () => {
    const trimmed = subjectInput.trim();
    if (!trimmed) return;
    if (packageSubjects.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setEditorError(t('Subject already in package', 'विषय पहले से पैकेज में है'));
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
      setEditorError(t('Please enter a package name', 'कृपया पैकेज का नाम दर्ज करें'));
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

    // Automatically include subjects of the newly created/edited package if it's active
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
      const nextSubjects = toggleCategorySubjects(selectedList, pkg.subjects, false);
      onChange({
        preferredSubjects: nextSubjects,
        customPackages,
        activePackageId: activePackageId === pkg.id ? null : activePackageId,
      });
    } else {
      const nextSubjects = toggleCategorySubjects(selectedList, pkg.subjects, true);
      onChange({
        preferredSubjects: nextSubjects,
        customPackages,
        activePackageId: pkg.id,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Summary Header */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.summaryHeader}>
          <View>
            <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text }}>
              {t('Selected Subjects', 'चयनित विषय')}
            </Text>
            <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: 2 }}>
              {selectedList.length} {t('selected', 'चयनित')} • {t('Synced with Study Planner', 'स्टडी प्लानर से सिंक')}
            </Text>
          </View>
          {selectedList.length > 0 && (
            <TouchableOpacity
              onPress={handleClearAll}
              style={[styles.smallBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="Clear all selected subjects"
            >
              <Text style={{ fontSize: fs(12), fontWeight: '600', color: colors.textSecondary }}>
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
                  { backgroundColor: accentColor, borderColor: accentColor },
                ]}
              >
                <Text style={{ fontSize: fs(12), fontWeight: '600', color: '#fff' }}>
                  {sub} ×
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: 10 }}>
            {t(
              'No subjects selected yet. Choose from categories below or create a custom package.',
              'अभी तक कोई विषय नहीं चुना गया है। नीचे श्रेणियों से चुनें या कस्टम पैकेज बनाएं।'
            )}
          </Text>
        )}
      </View>

      {/* Custom Packages Section */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text }}>
              {t('Custom Packages', 'कस्टम पैकेज')}
            </Text>
            <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: 2 }}>
              {t('Save & switch custom subject bundles', 'कस्टम विषय बंडल सहेजें और बदलें')}
            </Text>
          </View>
          {!editorOpen && (
            <TouchableOpacity
              onPress={openCreatePackage}
              style={[styles.primarySmallBtn, { backgroundColor: accentColor }]}
              accessibilityRole="button"
              accessibilityLabel="Create Custom Package"
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={{ fontSize: fs(12), fontWeight: '700', color: '#fff' }}>
                {t('Create Package', 'पैकेज बनाएं')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {editorOpen && (
          <View style={[styles.editorBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.text, marginBottom: 8 }}>
              {editingPackageId
                ? t('Edit Custom Package', 'कस्टम पैकेज संपादित करें')
                : t('New Custom Package', 'नया कस्टम पैकेज')}
            </Text>

            <TextInput
              value={packageNameInput}
              onChangeText={setPackageNameInput}
              placeholder={t('Package Name (e.g. RAS Mains Preparation)', 'पैकेज का नाम')}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, fontSize: fs(13) },
              ]}
            />

            <View style={styles.addSubjectRow}>
              <TextInput
                value={subjectInput}
                onChangeText={setSubjectInput}
                placeholder={t('Add custom subject...', 'कस्टम विषय जोड़ें...')}
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={handleAddSubjectToPackage}
                returnKeyType="done"
                style={[
                  styles.input,
                  {
                    flex: 1,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
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
                <Text style={{ fontSize: fs(12), fontWeight: '700', color: '#fff' }}>
                  {t('+ Add', '+ जोड़ें')}
                </Text>
              </TouchableOpacity>
            </View>

            {packageSubjects.length > 0 && (
              <View style={styles.pkgSubjectList}>
                {packageSubjects.map((sub, idx) => (
                  <View
                    key={`${sub}-${idx}`}
                    style={[styles.pkgSubjectItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    {editingSubjectIndex === idx ? (
                      <View style={styles.inlineEditRow}>
                        <TextInput
                          value={editingSubjectText}
                          onChangeText={setEditingSubjectText}
                          autoFocus
                          onSubmitEditing={() => handleSaveInlineSubjectEdit(idx)}
                          style={[
                            styles.inlineEditInput,
                            { color: colors.text, borderColor: accentColor, fontSize: fs(12) },
                          ]}
                        />
                        <TouchableOpacity onPress={() => handleSaveInlineSubjectEdit(idx)}>
                          <Ionicons name="checkmark-circle" size={20} color={accentColor} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <Text style={{ flex: 1, fontSize: fs(12), color: colors.text, fontWeight: '500' }}>
                          {sub}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            setEditingSubjectIndex(idx);
                            setEditingSubjectText(sub);
                          }}
                          style={{ paddingHorizontal: 6 }}
                        >
                          <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleRemoveSubjectFromPackage(idx)}>
                          <Ionicons name="close-circle-outline" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                ))}
              </View>
            )}

            {editorError && (
              <Text style={{ fontSize: fs(12), color: '#EF4444', marginTop: 6 }}>{editorError}</Text>
            )}

            <View style={styles.editorActions}>
              <TouchableOpacity
                onPress={closeEditor}
                style={[styles.smallBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={{ fontSize: fs(12), fontWeight: '600', color: colors.textSecondary }}>
                  {t('Cancel', 'रद्द करें')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSavePackage}
                style={[styles.primarySmallBtn, { backgroundColor: accentColor }]}
              >
                <Text style={{ fontSize: fs(12), fontWeight: '700', color: '#fff' }}>
                  {t('Save Package', 'पैकेज सहेजें')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {customPackages.length > 0 ? (
          <View style={styles.packageList}>
            {customPackages.map((pkg) => {
              const selected = isPackageFullySelected(selectedList, pkg.subjects);
              return (
                <View
                  key={pkg.id}
                  style={[
                    styles.packageCard,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: selected ? accentColor : colors.border,
                    },
                  ]}
                >
                  <View style={styles.packageTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.text }}>
                        {pkg.name}
                      </Text>
                      <Text style={{ fontSize: fs(11), color: colors.textMuted, marginTop: 2 }}>
                        {pkg.subjects.length} {t('subjects', 'विषय')}: {pkg.subjects.join(', ')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.packageActionsRow}>
                    <TouchableOpacity
                      onPress={() => handleTogglePackageSelection(pkg)}
                      style={[
                        styles.smallBtn,
                        {
                          backgroundColor: selected ? accentColor : colors.surface,
                          borderColor: selected ? accentColor : colors.border,
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
                        {selected ? t('✓ Selected', '✓ चयनित') : t('Select Package', 'पैकेज चुनें')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => openEditPackage(pkg)}
                      style={[styles.smallBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <Text style={{ fontSize: fs(12), fontWeight: '600', color: colors.textSecondary }}>
                        {t('Edit', 'संपादित करें')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeletePackage(pkg.id)}
                      style={[styles.smallBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <Text style={{ fontSize: fs(12), fontWeight: '600', color: '#EF4444' }}>
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
            <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: 10 }}>
              {t('No custom packages yet. Create one for your target exam.', 'अभी कोई कस्टम पैकेज नहीं है।')}
            </Text>
          )
        )}
      </View>

      {/* Expandable Categories */}
      {SUBJECT_CATEGORIES.map((category) => {
        const expanded = !!expandedCategories[category.id];
        const selectedInCat = category.subjects.filter((s) =>
          selectedKeySet.has(s.toLowerCase())
        ).length;

        return (
          <View
            key={category.id}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 0, overflow: 'hidden' }]}
          >
            <TouchableOpacity
              onPress={() => toggleCategoryExpand(category.id)}
              style={styles.categoryHeader}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text }}>
                  {category.title}
                </Text>
              </View>
              <View style={styles.categoryRight}>
                <View
                  style={[
                    styles.countBadge,
                    {
                      backgroundColor: selectedInCat > 0 ? accentColor : colors.surfaceAlt,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: fs(11),
                      fontWeight: '700',
                      color: selectedInCat > 0 ? '#fff' : colors.textMuted,
                    }}
                  >
                    {selectedInCat}/{category.subjects.length}
                  </Text>
                </View>
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textMuted}
                />
              </View>
            </TouchableOpacity>

            {expanded && (
              <View style={[styles.categoryBody, { borderTopColor: colors.border }]}>
                <View style={styles.categoryActions}>
                  <TouchableOpacity
                    onPress={() =>
                      onChange({
                        preferredSubjects: toggleCategorySubjects(selectedList, category.subjects, true),
                        customPackages,
                        activePackageId,
                      })
                    }
                    style={[styles.smallBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                  >
                    <Text style={{ fontSize: fs(11), fontWeight: '600', color: colors.text }}>
                      {t('Select All', 'सभी चुनें')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      onChange({
                        preferredSubjects: toggleCategorySubjects(selectedList, category.subjects, false),
                        customPackages,
                        activePackageId,
                      })
                    }
                    style={[styles.smallBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                  >
                    <Text style={{ fontSize: fs(11), fontWeight: '600', color: colors.textSecondary }}>
                      {t('Clear All', 'सभी हटाएं')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.chipsWrap}>
                  {category.subjects.map((sub) => {
                    const isSelected = selectedKeySet.has(sub.toLowerCase());
                    return (
                      <TouchableOpacity
                        key={sub}
                        onPress={() => toggleSubject(sub)}
                        style={[
                          styles.chipBtn,
                          {
                            backgroundColor: isSelected ? accentColor : colors.surfaceAlt,
                            borderColor: isSelected ? accentColor : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: fs(12),
                            fontWeight: '600',
                            color: isSelected ? '#fff' : colors.text,
                          }}
                        >
                          {isSelected ? `✓ ${sub}` : `+ ${sub}`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
    marginTop: 12,
  },
  selectedChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
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
  packageTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  packageActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  categoryBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
});
