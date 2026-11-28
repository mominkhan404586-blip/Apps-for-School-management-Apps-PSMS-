import type {
  ClassSectionDivisionConfig,
  ClassStreamGroup,
  ClassStructureConfig,
  ClassSubjectDraftItem,
  ExamRecord,
  ExamRoutineRecord,
  MasterRoutineRecord,
  MasterSubjectFrameworkItem,
  RoutineSlot,
  SchoolSetupConfig,
  SchoolSetupType,
  SchoolSubjectRecord,
  SubjectYearLockConfig,
  TeacherSubjectAssignment,
} from '../types';

export const SETUP_CLASS_RANGE_1_TO_10 = [
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
] as const;

export const CLASS_STREAM_GROUPS: {
  id: ClassStreamGroup;
  labelBn: string;
  labelEn: string;
}[] = [
  { id: 'science', labelBn: 'বিজ্ঞান', labelEn: 'Science' },
  { id: 'humanities', labelBn: 'মানবিক', labelEn: 'Humanities' },
  { id: 'business', labelBn: 'ব্যবসায় শিক্ষা', labelEn: 'Business Studies' },
  { id: 'vocational', labelBn: 'ভোকেশনাল', labelEn: 'Vocational' },
];

export const SCHOOL_SETUP_TYPE_OPTIONS: {
  id: SchoolSetupType;
  labelBn: string;
  labelEn: string;
}[] = [
  { id: 'PRIMARY', labelBn: 'প্রাথমিক', labelEn: 'Primary' },
  { id: 'SECONDARY', labelBn: 'মাধ্যমিক', labelEn: 'Secondary' },
  { id: 'PRIMARY_SECONDARY', labelBn: 'প্রাথমিক ও মাধ্যমিক', labelEn: 'Primary & Secondary' },
  { id: 'KINDERGARTEN', labelBn: 'কিন্ডার গার্ডেন', labelEn: 'Kindergarten' },
  { id: 'MADRASA', labelBn: 'মাদ্রাসা', labelEn: 'Madrasa' },
];

export const INITIAL_GOVERNMENT_SUBJECT_FRAMEWORK: MasterSubjectFrameworkItem[] = [
  {
    id: 'gov-sub-bangla',
    code: 'NCTB-101',
    nameBn: 'বাংলা',
    nameEn: 'Bangla',
    applicableClasses: ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'],
    weeklyPeriods: 6,
    fullMarks: 100,
    passMarks: 33,
    type: 'Compulsory',
    origin: 'government',
  },
  {
    id: 'gov-sub-english',
    code: 'NCTB-102',
    nameBn: 'ইংরেজি',
    nameEn: 'English',
    applicableClasses: ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'],
    weeklyPeriods: 6,
    fullMarks: 100,
    passMarks: 33,
    type: 'Compulsory',
    origin: 'government',
  },
  {
    id: 'gov-sub-math',
    code: 'NCTB-103',
    nameBn: 'গণিত',
    nameEn: 'Mathematics',
    applicableClasses: ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'],
    weeklyPeriods: 6,
    fullMarks: 100,
    passMarks: 33,
    type: 'Compulsory',
    origin: 'government',
  },
  {
    id: 'gov-sub-science',
    code: 'NCTB-104',
    nameBn: 'বিজ্ঞান',
    nameEn: 'Science',
    applicableClasses: ['Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8'],
    weeklyPeriods: 4,
    fullMarks: 100,
    passMarks: 33,
    type: 'Compulsory',
    origin: 'government',
  },
  {
    id: 'gov-sub-bgs',
    code: 'NCTB-105',
    nameBn: 'বাংলাদেশ ও বিশ্বপরিচয়',
    nameEn: 'Bangladesh & Global Studies',
    applicableClasses: ['Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'],
    weeklyPeriods: 4,
    fullMarks: 100,
    passMarks: 33,
    type: 'Compulsory',
    origin: 'government',
  },
  {
    id: 'gov-sub-religion',
    code: 'NCTB-106',
    nameBn: 'ধর্ম ও নৈতিক শিক্ষা',
    nameEn: 'Religion & Moral Education',
    applicableClasses: ['Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'],
    weeklyPeriods: 3,
    fullMarks: 100,
    passMarks: 33,
    type: 'Compulsory',
    origin: 'government',
  },
  {
    id: 'gov-sub-ict',
    code: 'NCTB-107',
    nameBn: 'তথ্য ও যোগাযোগ প্রযুক্তি (ICT)',
    nameEn: 'ICT',
    applicableClasses: ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'],
    weeklyPeriods: 3,
    fullMarks: 50,
    passMarks: 17,
    type: 'Compulsory',
    origin: 'government',
  },
  {
    id: 'gov-sub-physics',
    code: 'NCTB-136',
    nameBn: 'পদার্থবিজ্ঞান',
    nameEn: 'Physics',
    applicableClasses: ['Class 9', 'Class 10'],
    groupName: 'science',
    weeklyPeriods: 4,
    fullMarks: 100,
    passMarks: 33,
    type: 'Elective',
    origin: 'government',
  },
  {
    id: 'gov-sub-chemistry',
    code: 'NCTB-137',
    nameBn: 'রসায়ন',
    nameEn: 'Chemistry',
    applicableClasses: ['Class 9', 'Class 10'],
    groupName: 'science',
    weeklyPeriods: 4,
    fullMarks: 100,
    passMarks: 33,
    type: 'Elective',
    origin: 'government',
  },
  {
    id: 'gov-sub-biology',
    code: 'NCTB-138',
    nameBn: 'জীববিজ্ঞান',
    nameEn: 'Biology',
    applicableClasses: ['Class 9', 'Class 10'],
    groupName: 'science',
    weeklyPeriods: 4,
    fullMarks: 100,
    passMarks: 33,
    type: 'Elective',
    origin: 'government',
  },
  {
    id: 'gov-sub-history',
    code: 'NCTB-153',
    nameBn: 'বাংলাদেশের ইতিহাস ও বিশ্বসভ্যতা',
    nameEn: 'History & World Civilization',
    applicableClasses: ['Class 9', 'Class 10'],
    groupName: 'humanities',
    weeklyPeriods: 4,
    fullMarks: 100,
    passMarks: 33,
    type: 'Elective',
    origin: 'government',
  },
  {
    id: 'gov-sub-accounting',
    code: 'NCTB-146',
    nameBn: 'হিসাববিজ্ঞান',
    nameEn: 'Accounting',
    applicableClasses: ['Class 9', 'Class 10'],
    groupName: 'business',
    weeklyPeriods: 4,
    fullMarks: 100,
    passMarks: 33,
    type: 'Elective',
    origin: 'government',
  },
  {
    id: 'gov-sub-voc-trade',
    code: 'NCTB-191',
    nameBn: 'ভোকেশনাল ট্রেড-১',
    nameEn: 'Vocational Trade I',
    applicableClasses: ['Class 9', 'Class 10'],
    groupName: 'vocational',
    weeklyPeriods: 5,
    fullMarks: 100,
    passMarks: 33,
    type: 'Elective',
    origin: 'government',
  },
];

export function createEmptySchoolSetupConfig(schoolId: string): SchoolSetupConfig {
  return {
    schoolId,
    schoolType: null,
    schoolTypeLocked: false,
    selectedClasses: [],
    classConfigs: {},
    updatedAt: new Date().toISOString(),
  };
}

export function saveSchoolTypePermanently(
  config: SchoolSetupConfig,
  schoolType: SchoolSetupType
): SchoolSetupConfig {
  return {
    ...config,
    schoolType,
    schoolTypeLocked: true,
    updatedAt: new Date().toISOString(),
  };
}

export function saveSelectedClassesStep(
  config: SchoolSetupConfig,
  classes: string[]
): { ok: boolean; config?: SchoolSetupConfig; errorBn?: string; errorEn?: string } {
  const unique = Array.from(new Set(classes)).filter((c) =>
    (SETUP_CLASS_RANGE_1_TO_10 as readonly string[]).includes(c)
  );
  if (unique.length < 5 || unique.length > 10) {
    return {
      ok: false,
      errorBn: 'শ্রেণি ১ম থেকে ১০ম-এর মধ্যে সর্বনিম্ন ৫টি এবং সর্বোচ্চ ১০টি শ্রেণি নির্বাচন করুন।',
      errorEn: 'Select between 5 and 10 classes from Class 1 to Class 10.',
    };
  }

  const ordered = SETUP_CLASS_RANGE_1_TO_10.filter((c) => unique.includes(c));
  const nextClassConfigs = { ...config.classConfigs };
  ordered.forEach((cls) => {
    if (!nextClassConfigs[cls]) {
      nextClassConfigs[cls] = {
        className: cls,
        subjects: [],
        selectedGroups: [],
        groupSubjects: {},
        sections: [
          { id: `sec-${cls}-a`, divisionNameBn: 'বিভাগ ক', divisionNameEn: 'Section A', includedGroups: [] },
          { id: `sec-${cls}-b`, divisionNameBn: 'বিভাগ খ', divisionNameEn: 'Section B', includedGroups: [] },
        ],
      };
    }
  });

  return {
    ok: true,
    config: {
      ...config,
      selectedClasses: ordered,
      classConfigs: nextClassConfigs,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function isUpperSecondaryClass(className: string): boolean {
  return className === 'Class 9' || className === 'Class 10';
}

export function saveClassSubjectsStep(
  config: SchoolSetupConfig,
  className: string,
  subjects: ClassSubjectDraftItem[]
): SchoolSetupConfig {
  const existing = config.classConfigs[className] ?? {
    className,
    subjects: [],
    selectedGroups: [],
    groupSubjects: {},
    sections: [],
  };
  return {
    ...config,
    classConfigs: {
      ...config.classConfigs,
      [className]: {
        ...existing,
        subjects: [...subjects],
        subjectsSavedAt: new Date().toISOString(),
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function saveClassGroupsAndSubjectsStep(
  config: SchoolSetupConfig,
  className: string,
  selectedGroups: ClassStreamGroup[],
  groupSubjects: Partial<Record<ClassStreamGroup, ClassSubjectDraftItem[]>>
): SchoolSetupConfig {
  const existing = config.classConfigs[className] ?? {
    className,
    subjects: [],
    selectedGroups: [],
    groupSubjects: {},
    sections: [],
  };
  return {
    ...config,
    classConfigs: {
      ...config.classConfigs,
      [className]: {
        ...existing,
        selectedGroups: [...selectedGroups],
        groupSubjects: { ...groupSubjects },
        groupsSavedAt: new Date().toISOString(),
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function saveClassSectionsStep(
  config: SchoolSetupConfig,
  className: string,
  sections: ClassSectionDivisionConfig[]
): SchoolSetupConfig {
  const existing = config.classConfigs[className] ?? {
    className,
    subjects: [],
    selectedGroups: [],
    groupSubjects: {},
    sections: [],
  };
  return {
    ...config,
    classConfigs: {
      ...config.classConfigs,
      [className]: {
        ...existing,
        sections: [...sections],
        sectionsSavedAt: new Date().toISOString(),
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function isYearOrClassLocked(
  lockConfigs: SubjectYearLockConfig[],
  schoolId: string,
  academicYear: string,
  className?: string
): boolean {
  const rec = lockConfigs.find(
    (l) => l.schoolId === schoolId && l.academicYear === academicYear
  );
  if (!rec) return false;
  if (rec.yearLocked) return true;
  return Boolean(className && rec.lockedClasses.includes(className));
}

export function previewMasterFrameworkImport(params: {
  frameworkItems: MasterSubjectFrameworkItem[];
  existingSchoolSubjects: SchoolSubjectRecord[];
  schoolId: string;
  academicYear: string;
  targetClasses: string[];
}): { toCreateCount: number; skippedDuplicatesCount: number; previewItems: { className: string; item: MasterSubjectFrameworkItem }[] } {
  const previewItems: { className: string; item: MasterSubjectFrameworkItem }[] = [];
  let skippedDuplicatesCount = 0;

  for (const cls of params.targetClasses) {
    for (const fw of params.frameworkItems) {
      if (!fw.applicableClasses.includes(cls)) continue;
      const dup = params.existingSchoolSubjects.some(
        (s) =>
          s.schoolId === params.schoolId &&
          s.academicYear === params.academicYear &&
          s.className === cls &&
          (s.groupName ?? '') === (fw.groupName ?? '') &&
          (s.code.toLowerCase() === fw.code.toLowerCase() ||
            s.nameEn.toLowerCase() === fw.nameEn.toLowerCase())
      );
      if (dup) {
        skippedDuplicatesCount += 1;
      } else {
        previewItems.push({ className: cls, item: fw });
      }
    }
  }

  return {
    toCreateCount: previewItems.length,
    skippedDuplicatesCount,
    previewItems,
  };
}

export function importSubjectsFromMasterFramework(params: {
  frameworkItems: MasterSubjectFrameworkItem[];
  existingSchoolSubjects: SchoolSubjectRecord[];
  schoolId: string;
  academicYear: string;
  targetClasses: string[];
  actorName: string;
  lockConfigs: SubjectYearLockConfig[];
}): {
  addedCount: number;
  skippedLockedCount: number;
  nextSubjects: SchoolSubjectRecord[];
} {
  const nowIso = new Date().toISOString();
  const next = [...params.existingSchoolSubjects];
  let addedCount = 0;
  let skippedLockedCount = 0;

  for (const cls of params.targetClasses) {
    if (isYearOrClassLocked(params.lockConfigs, params.schoolId, params.academicYear, cls)) {
      skippedLockedCount += 1;
      continue;
    }
    for (const fw of params.frameworkItems) {
      if (!fw.applicableClasses.includes(cls)) continue;
      const dup = next.some(
        (s) =>
          s.schoolId === params.schoolId &&
          s.academicYear === params.academicYear &&
          s.className === cls &&
          (s.groupName ?? '') === (fw.groupName ?? '') &&
          (s.code.toLowerCase() === fw.code.toLowerCase() ||
            s.nameEn.toLowerCase() === fw.nameEn.toLowerCase())
      );
      if (dup) continue;
      next.push({
        id: `ssub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        schoolId: params.schoolId,
        academicYear: params.academicYear,
        className: cls,
        groupName: fw.groupName,
        code: fw.code,
        nameBn: fw.nameBn,
        nameEn: fw.nameEn,
        weeklyPeriods: fw.weeklyPeriods,
        fullMarks: fw.fullMarks,
        passMarks: fw.passMarks,
        type: fw.type,
        origin: 'government',
        sourceFrameworkId: fw.id,
        status: 'active',
        createdBy: params.actorName,
        createdAt: nowIso,
      });
      addedCount += 1;
    }
  }

  return { addedCount, skippedLockedCount, nextSubjects: next };
}

export function addInstitutionSubject(params: {
  existingSchoolSubjects: SchoolSubjectRecord[];
  schoolId: string;
  academicYear: string;
  className: string;
  groupName?: ClassStreamGroup;
  code: string;
  nameBn: string;
  nameEn: string;
  weeklyPeriods: number;
  fullMarks: number;
  passMarks: number;
  type: SchoolSubjectRecord['type'];
  actorName: string;
  lockConfigs: SubjectYearLockConfig[];
}): { ok: boolean; nextSubjects: SchoolSubjectRecord[]; errorBn?: string; errorEn?: string } {
  if (
    isYearOrClassLocked(
      params.lockConfigs,
      params.schoolId,
      params.academicYear,
      params.className
    )
  ) {
    return {
      ok: false,
      nextSubjects: params.existingSchoolSubjects,
      errorBn: `${params.className} (${params.academicYear}) বর্তমানে লক করা আছে।`,
      errorEn: `${params.className} (${params.academicYear}) is locked.`,
    };
  }

  const dup = params.existingSchoolSubjects.some(
    (s) =>
      s.schoolId === params.schoolId &&
      s.academicYear === params.academicYear &&
      s.className === params.className &&
      (s.groupName ?? '') === (params.groupName ?? '') &&
      (s.code.toLowerCase() === params.code.trim().toLowerCase() ||
        s.nameEn.toLowerCase() === params.nameEn.trim().toLowerCase())
  );

  if (dup) {
    return {
      ok: false,
      nextSubjects: params.existingSchoolSubjects,
      errorBn: 'এই শ্রেণিতে একই কোড বা নামের বিষয় ইতোমধ্যে যুক্ত আছে।',
      errorEn: 'A subject with this code or name already exists in this class.',
    };
  }

  const record: SchoolSubjectRecord = {
    id: `ssub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    schoolId: params.schoolId,
    academicYear: params.academicYear,
    className: params.className,
    groupName: params.groupName,
    code: params.code.trim(),
    nameBn: params.nameBn.trim(),
    nameEn: params.nameEn.trim(),
    weeklyPeriods: params.weeklyPeriods,
    fullMarks: params.fullMarks,
    passMarks: params.passMarks,
    type: params.type,
    origin: 'institution',
    status: 'active',
    createdBy: params.actorName,
    createdAt: new Date().toISOString(),
  };

  return {
    ok: true,
    nextSubjects: [record, ...params.existingSchoolSubjects],
  };
}

export function bulkApplySubjectsToClasses(params: {
  sourceSubjects: SchoolSubjectRecord[];
  existingSchoolSubjects: SchoolSubjectRecord[];
  schoolId: string;
  academicYear: string;
  targetClasses: string[];
  actorName: string;
  lockConfigs: SubjectYearLockConfig[];
}): { appliedCount: number; nextSubjects: SchoolSubjectRecord[] } {
  const next = [...params.existingSchoolSubjects];
  let appliedCount = 0;
  const nowIso = new Date().toISOString();

  for (const cls of params.targetClasses) {
    if (isYearOrClassLocked(params.lockConfigs, params.schoolId, params.academicYear, cls)) {
      continue;
    }
    for (const src of params.sourceSubjects) {
      const dup = next.some(
        (s) =>
          s.schoolId === params.schoolId &&
          s.academicYear === params.academicYear &&
          s.className === cls &&
          (s.groupName ?? '') === (src.groupName ?? '') &&
          s.code.toLowerCase() === src.code.toLowerCase()
      );
      if (dup) continue;
      next.push({
        ...src,
        id: `ssub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        className: cls,
        academicYear: params.academicYear,
        createdBy: params.actorName,
        createdAt: nowIso,
      });
      appliedCount += 1;
    }
  }

  return { appliedCount, nextSubjects: next };
}

export function copySubjectsFromPreviousYear(params: {
  existingSchoolSubjects: SchoolSubjectRecord[];
  schoolId: string;
  fromYear: string;
  toYear: string;
  actorName: string;
}): { copiedCount: number; nextSubjects: SchoolSubjectRecord[] } {
  const sourceList = params.existingSchoolSubjects.filter(
    (s) => s.schoolId === params.schoolId && s.academicYear === params.fromYear && s.status === 'active'
  );
  const next = [...params.existingSchoolSubjects];
  let copiedCount = 0;
  const nowIso = new Date().toISOString();

  for (const src of sourceList) {
    const dup = next.some(
      (s) =>
        s.schoolId === params.schoolId &&
        s.academicYear === params.toYear &&
        s.className === src.className &&
        (s.groupName ?? '') === (src.groupName ?? '') &&
        s.code.toLowerCase() === src.code.toLowerCase()
    );
    if (dup) continue;
    next.push({
      ...src,
      id: `ssub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      academicYear: params.toYear,
      createdBy: params.actorName,
      createdAt: nowIso,
    });
    copiedCount += 1;
  }

  return { copiedCount, nextSubjects: next };
}

export function checkSubjectUsageReferences(params: {
  subject: SchoolSubjectRecord;
  masterRoutines?: MasterRoutineRecord[];
  routineSlots?: RoutineSlot[];
  examRoutines?: ExamRoutineRecord[];
  teacherAssignments?: TeacherSubjectAssignment[];
  exams?: ExamRecord[];
}): { inUse: boolean; usedIn: string[] } {
  const usedIn: string[] = [];
  const matchName = (bn?: string, en?: string) =>
    (bn && bn.trim() === params.subject.nameBn) ||
    (en && en.trim().toLowerCase() === params.subject.nameEn.toLowerCase());

  if (
    (params.routineSlots ?? []).some(
      (r) =>
        r.schoolId === params.subject.schoolId &&
        r.className === params.subject.className &&
        matchName(r.subjectBn, r.subjectEn)
    ) ||
    (params.masterRoutines ?? []).some(
      (mr) =>
        mr.schoolId === params.subject.schoolId &&
        mr.className === params.subject.className &&
        mr.schedules.some((sc) => matchName(sc.subjectBn, sc.subjectEn))
    )
  ) {
    usedIn.push('Class Routine');
  }

  if (
    (params.examRoutines ?? []).some(
      (er) =>
        er.schoolId === params.subject.schoolId &&
        er.className === params.subject.className &&
        er.slots.some((sl) => matchName(sl.subjectBn, sl.subjectEn))
    )
  ) {
    usedIn.push('Exam Routine');
  }

  if (
    (params.teacherAssignments ?? []).some(
      (ta) =>
        ta.className === params.subject.className &&
        (ta.subjectCode === params.subject.code || matchName(ta.subjectBn, ta.subjectEn))
    )
  ) {
    usedIn.push('Teacher Assignment');
  }

  if (
    (params.exams ?? []).some(
      (ex) =>
        ex.schoolId === params.subject.schoolId &&
        ex.className === params.subject.className &&
        (matchName(ex.subjectBn, ex.subjectEn) ||
          ex.entries.some((e) => matchName(e.subjectBn, e.subjectEn)))
    )
  ) {
    usedIn.push('Examination & Marks');
  }

  return { inUse: usedIn.length > 0, usedIn };
}

export function removeOrArchiveSchoolSubject(params: {
  subjectId: string;
  existingSchoolSubjects: SchoolSubjectRecord[];
  lockConfigs: SubjectYearLockConfig[];
  masterRoutines?: MasterRoutineRecord[];
  routineSlots?: RoutineSlot[];
  examRoutines?: ExamRoutineRecord[];
  teacherAssignments?: TeacherSubjectAssignment[];
  exams?: ExamRecord[];
  preferArchiveIfUsed?: boolean;
}): {
  action: 'deleted' | 'archived' | 'blocked_locked' | 'blocked_in_use' | 'not_found';
  usedIn?: string[];
  nextSubjects: SchoolSubjectRecord[];
} {
  const target = params.existingSchoolSubjects.find((s) => s.id === params.subjectId);
  if (!target) {
    return { action: 'not_found', nextSubjects: params.existingSchoolSubjects };
  }

  if (
    target.isLocked ||
    isYearOrClassLocked(params.lockConfigs, target.schoolId, target.academicYear, target.className)
  ) {
    return { action: 'blocked_locked', nextSubjects: params.existingSchoolSubjects };
  }

  const usage = checkSubjectUsageReferences({
    subject: target,
    masterRoutines: params.masterRoutines,
    routineSlots: params.routineSlots,
    examRoutines: params.examRoutines,
    teacherAssignments: params.teacherAssignments,
    exams: params.exams,
  });

  if (usage.inUse) {
    if (params.preferArchiveIfUsed) {
      return {
        action: 'archived',
        usedIn: usage.usedIn,
        nextSubjects: params.existingSchoolSubjects.map((s) =>
          s.id === params.subjectId ? { ...s, status: 'archived' } : s
        ),
      };
    }
    return {
      action: 'blocked_in_use',
      usedIn: usage.usedIn,
      nextSubjects: params.existingSchoolSubjects,
    };
  }

  return {
    action: 'deleted',
    nextSubjects: params.existingSchoolSubjects.filter((s) => s.id !== params.subjectId),
  };
}

export function getActiveSubjectsForDropdown(params: {
  schoolSubjects: SchoolSubjectRecord[];
  schoolId: string;
  academicYear?: string;
  className: string;
  groupName?: ClassStreamGroup;
}): SchoolSubjectRecord[] {
  return params.schoolSubjects.filter(
    (s) =>
      s.schoolId === params.schoolId &&
      s.className === params.className &&
      s.status === 'active' &&
      (!params.academicYear || s.academicYear === params.academicYear) &&
      (!params.groupName || !s.groupName || s.groupName === params.groupName)
  );
}
