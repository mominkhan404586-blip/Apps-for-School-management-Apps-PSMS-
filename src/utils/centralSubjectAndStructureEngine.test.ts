import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_GOVERNMENT_SUBJECT_FRAMEWORK,
  addInstitutionSubject,
  bulkApplySubjectsToClasses,
  copySubjectsFromPreviousYear,
  createEmptySchoolSetupConfig,
  getActiveSubjectsForDropdown,
  importSubjectsFromMasterFramework,
  previewMasterFrameworkImport,
  removeOrArchiveSchoolSubject,
  saveClassGroupsAndSubjectsStep,
  saveClassSectionsStep,
  saveClassSubjectsStep,
  saveSchoolTypePermanently,
  saveSelectedClassesStep,
} from './centralSubjectAndStructureEngine';
import type { RoutineSlot, SubjectYearLockConfig } from '../types';

test('School Setup Wizard enforces 5-10 classes & incremental Class 1-8 vs Class 9-10 group/section persistence', () => {
  let cfg = createEmptySchoolSetupConfig('SCH-1');
  cfg = saveSchoolTypePermanently(cfg, 'PRIMARY_SECONDARY');
  assert.equal(cfg.schoolTypeLocked, true);

  const tooFew = saveSelectedClassesStep(cfg, ['Class 1', 'Class 2']);
  assert.equal(tooFew.ok, false);

  const valid = saveSelectedClassesStep(cfg, [
    'Class 1',
    'Class 2',
    'Class 6',
    'Class 9',
    'Class 10',
  ]);
  assert.equal(valid.ok, true);
  cfg = valid.config!;

  // Incremental save for Class 6 subjects then sections preserves subjects
  cfg = saveClassSubjectsStep(cfg, 'Class 6', [
    { code: 'NCTB-101', nameBn: 'বাংলা', nameEn: 'Bangla' },
  ]);
  cfg = saveClassSectionsStep(cfg, 'Class 6', [
    { id: 'sec-a', divisionNameBn: 'বিভাগ ক', divisionNameEn: 'Section A', includedGroups: [] },
    { id: 'sec-b', divisionNameBn: 'বিভাগ খ', divisionNameEn: 'Section B', includedGroups: [] },
  ]);
  assert.equal(cfg.classConfigs['Class 6'].subjects.length, 1);
  assert.equal(cfg.classConfigs['Class 6'].sections.length, 2);

  // Incremental save for Class 9 groups & editable subjects + group-to-section mapping
  cfg = saveClassGroupsAndSubjectsStep(cfg, 'Class 9', ['science', 'humanities'], {
    science: [{ code: 'NCTB-136', nameBn: 'পদার্থবিজ্ঞান', nameEn: 'Physics' }],
    humanities: [{ code: 'NCTB-153', nameBn: 'ইতিহাস', nameEn: 'History' }],
  });
  cfg = saveClassSectionsStep(cfg, 'Class 9', [
    { id: 'c9-a', divisionNameBn: 'বিভাগ ক', divisionNameEn: 'Section A', includedGroups: ['science'] },
    { id: 'c9-b', divisionNameBn: 'বিভাগ খ', divisionNameEn: 'Section B', includedGroups: ['humanities'] },
  ]);
  assert.deepEqual(cfg.classConfigs['Class 9'].selectedGroups, ['science', 'humanities']);
  assert.deepEqual(cfg.classConfigs['Class 9'].sections[0].includedGroups, ['science']);
});

test('Centralized Subject Registry supports Gov Import, Institution Add, Bulk Apply, Year Copy, Lock, & Usage Protection', () => {
  const schoolId = 'SCH-1';
  const year2026 = '2026';
  const preview = previewMasterFrameworkImport({
    frameworkItems: INITIAL_GOVERNMENT_SUBJECT_FRAMEWORK,
    existingSchoolSubjects: [],
    schoolId,
    academicYear: year2026,
    targetClasses: ['Class 4', 'Class 5'],
  });
  assert.ok(preview.toCreateCount >= 8);

  const imported = importSubjectsFromMasterFramework({
    frameworkItems: INITIAL_GOVERNMENT_SUBJECT_FRAMEWORK,
    existingSchoolSubjects: [],
    schoolId,
    academicYear: year2026,
    targetClasses: ['Class 4'],
    actorName: 'School Admin',
    lockConfigs: [],
  });
  assert.ok(imported.addedCount >= 4);
  assert.ok(imported.nextSubjects.every((s) => s.origin === 'government'));

  const addedInst = addInstitutionSubject({
    existingSchoolSubjects: imported.nextSubjects,
    schoolId,
    academicYear: year2026,
    className: 'Class 4',
    code: 'INST-401',
    nameBn: 'কম্পিউটার বেসিক',
    nameEn: 'Computer Basics',
    weeklyPeriods: 2,
    fullMarks: 50,
    passMarks: 17,
    type: 'Co-Curricular',
    actorName: 'School Admin',
    lockConfigs: [],
  });
  assert.equal(addedInst.ok, true);
  const instSub = addedInst.nextSubjects.find((s) => s.code === 'INST-401')!;
  assert.equal(instSub.origin, 'institution');

  // Bulk apply to Class 5
  const bulk = bulkApplySubjectsToClasses({
    sourceSubjects: [instSub],
    existingSchoolSubjects: addedInst.nextSubjects,
    schoolId,
    academicYear: year2026,
    targetClasses: ['Class 5'],
    actorName: 'School Admin',
    lockConfigs: [],
  });
  assert.equal(bulk.appliedCount, 1);

  // Copy from 2026 to 2027
  const copied = copySubjectsFromPreviousYear({
    existingSchoolSubjects: bulk.nextSubjects,
    schoolId,
    fromYear: '2026',
    toYear: '2027',
    actorName: 'School Admin',
  });
  assert.ok(copied.copiedCount >= 5);

  // Usage protection blocks delete when used in Class Routine, and archives when requested
  const routineSlots: RoutineSlot[] = [
    {
      id: 'slot-1',
      schoolId,
      period: 1,
      timeRange: '09:00-09:45',
      className: 'Class 4',
      section: 'A',
      subjectBn: 'কম্পিউটার বেসিক',
      subjectEn: 'Computer Basics',
      teacherId: 't1',
      teacherName: 'Teacher 1',
      room: '101',
      status: 'pending',
    },
  ];
  const blockedDelete = removeOrArchiveSchoolSubject({
    subjectId: instSub.id,
    existingSchoolSubjects: copied.nextSubjects,
    lockConfigs: [],
    routineSlots,
    preferArchiveIfUsed: false,
  });
  assert.equal(blockedDelete.action, 'blocked_in_use');

  const archived = removeOrArchiveSchoolSubject({
    subjectId: instSub.id,
    existingSchoolSubjects: copied.nextSubjects,
    lockConfigs: [],
    routineSlots,
    preferArchiveIfUsed: true,
  });
  assert.equal(archived.action, 'archived');

  // Active dropdown excludes archived subjects
  const dropdown2026 = getActiveSubjectsForDropdown({
    schoolSubjects: archived.nextSubjects,
    schoolId,
    academicYear: '2026',
    className: 'Class 4',
  });
  assert.equal(dropdown2026.some((s) => s.id === instSub.id), false);

  // Year lock blocks additions
  const locks: SubjectYearLockConfig[] = [
    { schoolId, academicYear: '2026', yearLocked: true, lockedClasses: [] },
  ];
  const lockedAdd = addInstitutionSubject({
    existingSchoolSubjects: archived.nextSubjects,
    schoolId,
    academicYear: '2026',
    className: 'Class 4',
    code: 'INST-402',
    nameBn: 'ড্রইং',
    nameEn: 'Drawing',
    weeklyPeriods: 1,
    fullMarks: 50,
    passMarks: 17,
    type: 'Co-Curricular',
    actorName: 'School Admin',
    lockConfigs: locks,
  });
  assert.equal(lockedAdd.ok, false);
});
