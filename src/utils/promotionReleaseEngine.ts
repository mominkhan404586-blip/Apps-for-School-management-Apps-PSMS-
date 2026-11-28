import type {
  PromotionReleaseHistoryEntry,
  StudentRecord,
  StudentYearSnapshot,
} from '../types';

const CLASS_ORDER = [
  'Pre-Primary',
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
];

export function getNextClassName(currentClass: string): string {
  const idx = CLASS_ORDER.indexOf(currentClass);
  if (idx === -1) return currentClass;
  if (idx === CLASS_ORDER.length - 1) return 'Graduated (SSC Complete)';
  return CLASS_ORDER[idx + 1];
}

export interface BulkPromotionParams {
  students: StudentRecord[];
  studentIds: string[];
  schoolId: string;
  sourceAcademicYear: string;
  targetAcademicYear: string;
  sourceClassName: string;
  targetClassName: string;
  targetSection?: string;
  actorName: string;
  note?: string;
}

export interface BulkPromotionResult {
  ok: boolean;
  promotedCount: number;
  students: StudentRecord[];
  historyEntry?: PromotionReleaseHistoryEntry;
  errorBn?: string;
  errorEn?: string;
}

export function executeBulkClassPromotion(
  params: BulkPromotionParams
): BulkPromotionResult {
  if (params.studentIds.length === 0) {
    return {
      ok: false,
      promotedCount: 0,
      students: params.students,
      errorBn: 'প্রমোশনের জন্য অন্তত একজন শিক্ষার্থী নির্বাচন করুন।',
      errorEn: 'Select at least one student to promote.',
    };
  }
  if (!params.targetAcademicYear.trim() || !params.targetClassName.trim()) {
    return {
      ok: false,
      promotedCount: 0,
      students: params.students,
      errorBn: 'লক্ষ্য শিক্ষাবর্ষ এবং পরবর্তী শ্রেণি নির্ধারণ করুন।',
      errorEn: 'Target academic year and target class are required.',
    };
  }

  const idSet = new Set(params.studentIds);
  const nowIso = new Date().toISOString();
  const promotedNames: string[] = [];

  const nextStudents = params.students.map((st) => {
    if (!idSet.has(st.id) || st.schoolId !== params.schoolId) return st;
    promotedNames.push(st.nameBn);
    const snapshot: StudentYearSnapshot = {
      academicYear: params.sourceAcademicYear,
      className: st.className,
      section: st.section,
      roll: st.roll,
      attendancePct: st.attendancePct,
      gpa: st.gpa,
      finalGrade: st.examResultLabel,
      statusAtClose: 'promoted',
      recordedAt: nowIso,
    };

    return {
      ...st,
      className: params.targetClassName,
      section: params.targetSection?.trim() || st.section,
      academicYear: params.targetAcademicYear,
      enrollmentStatus: 'promoted' as const,
      academicSnapshots: [...(st.academicSnapshots ?? []), snapshot],
      admissionHistory: [
        ...st.admissionHistory,
        `${params.sourceAcademicYear} → ${params.targetAcademicYear}: ${st.className} থেকে ${params.targetClassName}-এ উন্নীত (Promoted)`,
      ],
    };
  });

  if (promotedNames.length === 0) {
    return {
      ok: false,
      promotedCount: 0,
      students: params.students,
      errorBn: 'নির্বাচিত বিদ্যালয় ও শ্রেণিতে কোনো শিক্ষার্থী মেলেনি।',
      errorEn: 'No matching students found for promotion.',
    };
  }

  const historyEntry: PromotionReleaseHistoryEntry = {
    id: `prom-${Date.now()}`,
    schoolId: params.schoolId,
    actionType: 'promote',
    sourceAcademicYear: params.sourceAcademicYear,
    targetAcademicYear: params.targetAcademicYear,
    sourceClassName: params.sourceClassName,
    targetClassName: params.targetClassName,
    studentIds: [...params.studentIds],
    studentNames: promotedNames,
    actorName: params.actorName,
    timestamp: nowIso,
    note: params.note,
  };

  return {
    ok: true,
    promotedCount: promotedNames.length,
    students: nextStudents,
    historyEntry,
  };
}

export interface BulkReleaseParams {
  students: StudentRecord[];
  studentIds: string[];
  schoolId: string;
  sourceAcademicYear: string;
  sourceClassName: string;
  actorName: string;
  note?: string;
}

export interface BulkReleaseResult {
  ok: boolean;
  releasedCount: number;
  students: StudentRecord[];
  historyEntry?: PromotionReleaseHistoryEntry;
  errorBn?: string;
  errorEn?: string;
}

export function executeBulkClassRelease(
  params: BulkReleaseParams
): BulkReleaseResult {
  if (params.studentIds.length === 0) {
    return {
      ok: false,
      releasedCount: 0,
      students: params.students,
      errorBn: 'রিলিজ করার জন্য অন্তত একজন শিক্ষার্থী নির্বাচন করুন।',
      errorEn: 'Select at least one student to release.',
    };
  }

  const idSet = new Set(params.studentIds);
  const nowIso = new Date().toISOString();
  const releasedNames: string[] = [];

  const nextStudents = params.students.map((st) => {
    if (!idSet.has(st.id) || st.schoolId !== params.schoolId) return st;
    releasedNames.push(st.nameBn);
    const snapshot: StudentYearSnapshot = {
      academicYear: params.sourceAcademicYear,
      className: st.className,
      section: st.section,
      roll: st.roll,
      attendancePct: st.attendancePct,
      gpa: st.gpa,
      finalGrade: st.examResultLabel,
      statusAtClose: 'released',
      recordedAt: nowIso,
    };

    return {
      ...st,
      enrollmentStatus: 'released' as const,
      academicSnapshots: [...(st.academicSnapshots ?? []), snapshot],
      admissionHistory: [
        ...st.admissionHistory,
        `${params.sourceAcademicYear}: ${st.className} থেকে সমাপন / রিলিজ (Released — সকল রেকর্ড সংরক্ষিত)`,
      ],
    };
  });

  if (releasedNames.length === 0) {
    return {
      ok: false,
      releasedCount: 0,
      students: params.students,
      errorBn: 'রিলিজের জন্য উপযুক্ত শিক্ষার্থী পাওয়া যায়নি।',
      errorEn: 'No matching students found to release.',
    };
  }

  const historyEntry: PromotionReleaseHistoryEntry = {
    id: `rel-${Date.now()}`,
    schoolId: params.schoolId,
    actionType: 'release',
    sourceAcademicYear: params.sourceAcademicYear,
    sourceClassName: params.sourceClassName,
    studentIds: [...params.studentIds],
    studentNames: releasedNames,
    actorName: params.actorName,
    timestamp: nowIso,
    note: params.note,
  };

  return {
    ok: true,
    releasedCount: releasedNames.length,
    students: nextStudents,
    historyEntry,
  };
}
