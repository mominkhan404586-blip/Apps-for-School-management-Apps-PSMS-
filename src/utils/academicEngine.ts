import type {
  AcademicCancelClassReason,
  AcademicRecordCategory,
  AcademicSecondaryAction,
  AssignmentItem,
  ClassSessionRecord,
  ClassworkItem,
  CurriculumUnit,
  DailyLessonHomeworkItem,
  ExamMarkEntry,
  ExamRecord,
  GlobalAcademicSearchResult,
  GradingRuleItem,
  LessonPlanItem,
  ResultAuditEntry,
  Role,
  RoutineSlot,
  SchoolRecord,
  StudentRecord,
  SubjectResultSubmission,
  SubstitutePermissionRecord,
  SubstituteReason,
  TeacherAttendanceLog,
  TeacherDailyTaskItem,
  TeacherPerformanceMetrics,
  TeacherRecord,
  TeacherSubjectAssignment,
} from '../types';
import { calculateBDGradeAndGPA, computeStudentMeritList } from './rbacAndGrading';

export const SUBSTITUTE_REASONS: SubstituteReason[] = [
  'Teacher Absent',
  'Emergency',
  'Room Unavailable',
  'Special Event',
  'Exam',
  'Administrative Reason',
  'Other',
];

export const DEFAULT_NCTB_GRADING_RULES: GradingRuleItem[] = [
  { id: 'gr-1', minPercent: 80, maxPercent: 100, letterGrade: 'A+', gradePoint: 5.0, remarkBn: 'অসাধারণ', remarkEn: 'Outstanding' },
  { id: 'gr-2', minPercent: 70, maxPercent: 79, letterGrade: 'A', gradePoint: 4.0, remarkBn: 'অতি উত্তম', remarkEn: 'Excellent' },
  { id: 'gr-3', minPercent: 60, maxPercent: 69, letterGrade: 'A-', gradePoint: 3.5, remarkBn: 'উত্তম', remarkEn: 'Very Good' },
  { id: 'gr-4', minPercent: 50, maxPercent: 59, letterGrade: 'B', gradePoint: 3.0, remarkBn: 'ভালো', remarkEn: 'Good' },
  { id: 'gr-5', minPercent: 40, maxPercent: 49, letterGrade: 'C', gradePoint: 2.0, remarkBn: 'সন্তোষজনক', remarkEn: 'Satisfactory' },
  { id: 'gr-6', minPercent: 33, maxPercent: 39, letterGrade: 'D', gradePoint: 1.0, remarkBn: 'পাশ', remarkEn: 'Pass' },
  { id: 'gr-7', minPercent: 0, maxPercent: 32, letterGrade: 'F', gradePoint: 0.0, remarkBn: 'অকৃতকার্য', remarkEn: 'Fail' },
];

/**
 * Strict Teacher Subject + Class Permission Check:
 * A teacher may only enter/edit marks for their explicitly assigned Class & Subject.
 */
export function canTeacherEnterSubjectMarks(
  teacher: TeacherRecord,
  assignments: TeacherSubjectAssignment[],
  className: string | undefined,
  subjectBn: string,
  subjectEn: string
): boolean {
  const teacherAssignments = assignments.filter((a) => a.teacherId === teacher.id);
  const normSubBn = subjectBn.trim().toLowerCase();
  const normSubEn = subjectEn.trim().toLowerCase();

  if (teacherAssignments.length > 0) {
    return teacherAssignments.some((a) => {
      const subjectMatch =
        a.subjectBn.trim().toLowerCase() === normSubBn ||
        a.subjectEn.trim().toLowerCase() === normSubEn ||
        normSubBn.includes(a.subjectBn.trim().toLowerCase()) ||
        a.subjectBn.trim().toLowerCase().includes(normSubBn);
      const classMatch = !className || a.className === className;
      return subjectMatch && classMatch;
    });
  }

  const subjectInProfile = teacher.subjects.some(
    (s) =>
      s.trim().toLowerCase() === normSubBn ||
      s.trim().toLowerCase() === normSubEn ||
      normSubBn.includes(s.trim().toLowerCase())
  );
  const classInProfile = !className || teacher.assignedClasses.includes(className);
  return subjectInProfile && classInProfile;
}

export interface TeacherWorkloadSummary {
  teacherId: string;
  teacherName: string;
  assignedClassCount: number;
  assignedSubjectCount: number;
  weeklyPeriods: number;
  todaySlotsCount: number;
  utilizationStatus: 'balanced' | 'high' | 'light';
}

export function computeTeacherWorkload(
  teacher: TeacherRecord,
  assignments: TeacherSubjectAssignment[],
  routineSlots: RoutineSlot[]
): TeacherWorkloadSummary {
  const mine = assignments.filter((a) => a.teacherId === teacher.id);
  const distinctClasses = new Set(mine.map((a) => `${a.className}-${a.section}`));
  const distinctSubjects = new Set(mine.map((a) => a.subjectCode));
  const weeklyPeriods = mine.reduce((sum, a) => sum + a.weeklyPeriods, 0);
  const todaySlotsCount = routineSlots.filter(
    (r) => (r.substituteTeacherId ?? r.teacherId) === teacher.id && r.status !== 'cancelled'
  ).length;

  const utilizationStatus =
    weeklyPeriods >= 22 ? 'high' : weeklyPeriods >= 10 ? 'balanced' : 'light';

  return {
    teacherId: teacher.id,
    teacherName: teacher.nameBn,
    assignedClassCount: distinctClasses.size || teacher.assignedClasses.length,
    assignedSubjectCount: distinctSubjects.size || teacher.subjects.length,
    weeklyPeriods,
    todaySlotsCount,
    utilizationStatus,
  };
}

export function calculateCustomGradeAndGPA(
  obtainedMarks: number,
  fullMarks = 100,
  passMarks = 33,
  rules: GradingRuleItem[] = DEFAULT_NCTB_GRADING_RULES
): {
  totalObtained: number;
  percentage: number;
  letterGrade: string;
  gpa: number;
  passed: boolean;
} {
  if (!rules || rules.length === 0) {
    return calculateBDGradeAndGPA(obtainedMarks, fullMarks, passMarks);
  }
  const safeFull = fullMarks > 0 ? fullMarks : 100;
  const clamped = Math.max(0, Math.min(obtainedMarks, safeFull));
  const percentage = Number(((clamped / safeFull) * 100).toFixed(2));
  const passPercent = (passMarks / safeFull) * 100;

  if (percentage < passPercent) {
    return { totalObtained: clamped, percentage, letterGrade: 'F', gpa: 0.0, passed: false };
  }

  const sorted = [...rules].sort((a, b) => b.minPercent - a.minPercent);
  const matched =
    sorted.find((r) => percentage >= r.minPercent && percentage <= r.maxPercent) ??
    sorted.find((r) => percentage >= r.minPercent);

  if (!matched) {
    return calculateBDGradeAndGPA(obtainedMarks, fullMarks, passMarks);
  }

  return {
    totalObtained: clamped,
    percentage,
    letterGrade: matched.letterGrade,
    gpa: matched.gradePoint,
    passed: matched.gradePoint > 0 && matched.letterGrade !== 'F',
  };
}

export function computeEntryTotalMarks(entry: ExamMarkEntry): number {
  if (typeof entry.mcq === 'number') {
    return entry.written + entry.mcq + entry.oral + entry.continuous;
  }
  return entry.written + entry.oral + entry.continuous;
}

export function computeClassworkStats(items: ClassworkItem[]) {
  let completed = 0;
  let pending = 0;
  let notSubmitted = 0;

  for (const item of items) {
    for (const st of item.studentStatuses) {
      if (st.status === 'completed') completed += 1;
      else if (st.status === 'pending') pending += 1;
      else notSubmitted += 1;
    }
  }
  const total = completed + pending + notSubmitted;
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, pending, notSubmitted, total, completionPct };
}

export interface SubjectProgressDetail {
  subjectBn: string;
  subjectEn: string;
  examScore: number;
  fullMarks: number;
  previousScore: number;
  delta: number;
  letterGrade: string;
  gpa: number;
  subjectRank: number;
  classworkPct: number;
  homeworkPct: number;
  assignmentPct: number;
}

export interface StudentAcademicProgressSummary {
  studentId: string;
  studentName: string;
  overallAvgPct: number;
  previousAvgPct: number;
  improvementDelta: number;
  overallGpa: number;
  overallRank: number;
  totalRankedStudents: number;
  attendancePct: number;
  classworkCompletionPct: number;
  homeworkCompletionPct: number;
  assignmentCompletionPct: number;
  strengths: string[];
  weaknesses: string[];
  subjectBreakdown: SubjectProgressDetail[];
}

export function computeStudentAcademicProgress(
  student: StudentRecord,
  exams: ExamRecord[],
  assignments: AssignmentItem[],
  classworks: ClassworkItem[],
  gradingRules: GradingRuleItem[] = DEFAULT_NCTB_GRADING_RULES
): StudentAcademicProgressSummary {
  const exam = exams[0];
  const entries = exam ? exam.entries : [];
  const meritList = computeStudentMeritList(entries);
  const studentMerit = meritList.find((m) => m.studentId === student.id);

  const myEntries = entries.filter((e) => e.studentId === student.id);
  const myAssignments = assignments.filter((a) => a.studentId === student.id && !a.isHomework);
  const myHomeworks = assignments.filter((a) => a.studentId === student.id && a.isHomework);

  // Compute classwork completion per student
  let cwTotal = 0;
  let cwDone = 0;
  for (const cw of classworks) {
    const rec = cw.studentStatuses.find((s) => s.studentId === student.id);
    if (rec) {
      cwTotal += 1;
      if (rec.status === 'completed') cwDone += 1;
    }
  }
  const classworkCompletionPct = cwTotal > 0 ? Math.round((cwDone / cwTotal) * 100) : 90;

  const homeworkCompletionPct =
    myHomeworks.length > 0
      ? Math.round((myHomeworks.filter((h) => h.status === 'submitted').length / myHomeworks.length) * 100)
      : 85;
  const assignmentCompletionPct =
    myAssignments.length > 0
      ? Math.round((myAssignments.filter((a) => a.status === 'submitted').length / myAssignments.length) * 100)
      : 82;

  const subjectBreakdown: SubjectProgressDetail[] = myEntries.map((entry) => {
    const total = computeEntryTotalMarks(entry);
    const prev = entry.previousTotal ?? Math.max(40, total - 4);
    const grade = calculateCustomGradeAndGPA(total, entry.fullMarks, entry.passMarks, gradingRules);

    const sameSubjectPeers = entries
      .filter((e) => e.subjectEn === entry.subjectEn)
      .map((e) => ({ studentId: e.studentId, total: computeEntryTotalMarks(e) }))
      .sort((a, b) => b.total - a.total);
    const rankIdx = sameSubjectPeers.findIndex((p) => p.studentId === student.id);

    // Subject-specific classwork/homework ratios
    const subCw = classworks.filter((cw) => cw.subjectEn === entry.subjectEn);
    let subCwDone = 0;
    let subCwTot = 0;
    for (const cw of subCw) {
      const st = cw.studentStatuses.find((s) => s.studentId === student.id);
      if (st) {
        subCwTot += 1;
        if (st.status === 'completed') subCwDone += 1;
      }
    }
    const subAsg = myAssignments.filter((a) => a.subjectEn === entry.subjectEn);
    const subHw = myHomeworks.filter((a) => a.subjectEn === entry.subjectEn);

    return {
      subjectBn: entry.subjectBn,
      subjectEn: entry.subjectEn,
      examScore: total,
      fullMarks: entry.fullMarks,
      previousScore: prev,
      delta: total - prev,
      letterGrade: grade.letterGrade,
      gpa: grade.gpa,
      subjectRank: rankIdx >= 0 ? rankIdx + 1 : 1,
      classworkPct: subCwTot > 0 ? Math.round((subCwDone / subCwTot) * 100) : classworkCompletionPct,
      homeworkPct:
        subHw.length > 0
          ? Math.round((subHw.filter((h) => h.status === 'submitted').length / subHw.length) * 100)
          : homeworkCompletionPct,
      assignmentPct:
        subAsg.length > 0
          ? Math.round((subAsg.filter((a) => a.status === 'submitted').length / subAsg.length) * 100)
          : assignmentCompletionPct,
    };
  });

  const overallAvgPct =
    subjectBreakdown.length > 0
      ? Math.round(
          subjectBreakdown.reduce((s, b) => s + (b.examScore / b.fullMarks) * 100, 0) /
            subjectBreakdown.length
        )
      : 84;
  const previousAvgPct =
    subjectBreakdown.length > 0
      ? Math.round(
          subjectBreakdown.reduce((s, b) => s + (b.previousScore / b.fullMarks) * 100, 0) /
            subjectBreakdown.length
        )
      : 80;

  const sortedByScore = [...subjectBreakdown].sort((a, b) => b.examScore - a.examScore);
  const strengths = sortedByScore
    .filter((s) => s.examScore >= 80)
    .map((s) => `${s.subjectBn} (${s.examScore}%)`);
  const weaknesses = sortedByScore
    .filter((s) => s.examScore < 80)
    .slice(-2)
    .map((s) => `${s.subjectBn} (${s.examScore}%)`);

  return {
    studentId: student.id,
    studentName: student.nameBn,
    overallAvgPct,
    previousAvgPct,
    improvementDelta: overallAvgPct - previousAvgPct,
    overallGpa: studentMerit?.gpa ?? 4.75,
    overallRank: studentMerit?.rank ?? 1,
    totalRankedStudents: meritList.length || 1,
    attendancePct: student.attendancePct,
    classworkCompletionPct,
    homeworkCompletionPct,
    assignmentCompletionPct,
    strengths: strengths.length > 0 ? strengths : sortedByScore.slice(0, 1).map((s) => s.subjectBn),
    weaknesses:
      weaknesses.length > 0
        ? weaknesses
        : sortedByScore.length > 1
          ? [sortedByScore[sortedByScore.length - 1].subjectBn]
          : [],
    subjectBreakdown,
  };
}

export function startClassSessionOnSlot(
  slot: RoutineSlot,
  presentStudentIds: string[],
  totalClassStudents: number,
  startedAt: string,
  lessonTopic?: string
): RoutineSlot {
  const session: ClassSessionRecord = {
    sessionId: `SES-${slot.id}-${Date.now().toString().slice(-4)}`,
    slotId: slot.id,
    date: '2026-11-18',
    startedAt,
    autoAttendanceCount: presentStudentIds.length,
    autoAttendanceTotal: Math.max(presentStudentIds.length, totalClassStudents),
    presentStudentIds,
    lessonTopic: lessonTopic || slot.lessonTopic || `${slot.subjectBn} - আজকের পাঠ`,
    learningObjective: `${slot.subjectBn} বিষয়ের মূল ধারণা ও সমস্যা সমাধান দক্ষতা অর্জন।`,
    classworkSummary: slot.session?.classworkSummary ?? 'শ্রেণিতে অনুশীলনী প্রশ্ন সমাধান।',
    teachingActivity: slot.session?.teachingActivity ?? 'বোর্ড উদাহরণ ও দলীয় আলোচনা',
    teacherPrivateNotes: slot.session?.teacherPrivateNotes ?? '',
    homeworkSummary: slot.homeworkText ?? '',
  };

  return {
    ...slot,
    status: 'in_progress',
    startedAt,
    lessonTopic: session.lessonTopic,
    session,
  };
}

export function assignSubstituteWithReason(
  slot: RoutineSlot,
  substituteTeacherId: string,
  substituteTeacherName: string,
  reason: SubstituteReason | string
): RoutineSlot {
  if (!reason || !reason.trim()) {
    throw new Error('Substitute teacher assignment requires an explicit reason.');
  }
  return {
    ...slot,
    substituteTeacherId,
    substituteTeacher: substituteTeacherName,
    substituteReason: reason.trim(),
    status: slot.status === 'sub_requested' ? 'pending' : slot.status,
  };
}

export interface AcademicReportSummaryBundle {
  classPerformance: Array<{ className: string; avgScorePct: number; attendancePct: number; studentCount: number }>;
  subjectPerformance: Array<{ subjectBn: string; subjectEn: string; avgMarks: number; highestMarks: number; passPct: number }>;
  teacherPerformance: Array<{ teacherName: string; weeklyPeriods: number; completedLessons: number; score: number }>;
  gradeDistribution: Array<{ grade: string; count: number; pct: number }>;
  curriculumCompletion: Array<{ subjectBn: string; className: string; completed: number; total: number; pct: number }>;
  passFailStats: { passed: number; failed: number; total: number; passRatePct: number };
  assignmentCompletionPct: number;
  lessonCompletionPct: number;
}

export function computeAcademicReportsBundle(
  students: StudentRecord[],
  teachers: TeacherRecord[],
  assignments: TeacherSubjectAssignment[],
  routineSlots: RoutineSlot[],
  exams: ExamRecord[],
  studentAssignments: AssignmentItem[],
  curriculum: CurriculumUnit[],
  lessonPlans: LessonPlanItem[]
): AcademicReportSummaryBundle {
  const entries = exams[0]?.entries ?? [];
  const meritList = computeStudentMeritList(entries);

  // Class performance
  const classes = Array.from(new Set(students.map((s) => s.className)));
  const classPerformance = classes.map((cls) => {
    const clsStudents = students.filter((s) => s.className === cls);
    const avgAtt =
      clsStudents.length > 0
        ? Number((clsStudents.reduce((sum, s) => sum + s.attendancePct, 0) / clsStudents.length).toFixed(1))
        : 0;
    const clsEntries = entries.filter((e) => (e.className ?? 'Class 4') === cls);
    const avgScorePct =
      clsEntries.length > 0
        ? Math.round(clsEntries.reduce((sum, e) => sum + computeEntryTotalMarks(e), 0) / clsEntries.length)
        : Math.round(avgAtt * 0.9);
    return { className: cls, avgScorePct, attendancePct: avgAtt, studentCount: clsStudents.length };
  });

  // Subject performance
  const subjectsMap = new Map<string, { bn: string; en: string; scores: number[]; passes: number }>();
  for (const e of entries) {
    const total = computeEntryTotalMarks(e);
    const passed = total >= e.passMarks;
    const prev = subjectsMap.get(e.subjectEn);
    if (prev) {
      prev.scores.push(total);
      if (passed) prev.passes += 1;
    } else {
      subjectsMap.set(e.subjectEn, { bn: e.subjectBn, en: e.subjectEn, scores: [total], passes: passed ? 1 : 0 });
    }
  }
  const subjectPerformance = Array.from(subjectsMap.values()).map((s) => ({
    subjectBn: s.bn,
    subjectEn: s.en,
    avgMarks: Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length),
    highestMarks: Math.max(...s.scores),
    passPct: Math.round((s.passes / s.scores.length) * 100),
  }));

  // Teacher performance
  const teacherPerformance = teachers.slice(0, 6).map((t) => {
    const wl = computeTeacherWorkload(t, assignments, routineSlots);
    const completedLessons = lessonPlans.filter((lp) => lp.teacherId === t.id && lp.status === 'taught').length;
    return {
      teacherName: t.nameBn,
      weeklyPeriods: wl.weeklyPeriods,
      completedLessons,
      score: t.performanceScore,
    };
  });

  // Grade distribution
  const gradeCounts = new Map<string, number>();
  for (const m of meritList) {
    gradeCounts.set(m.letterGrade, (gradeCounts.get(m.letterGrade) ?? 0) + 1);
  }
  const gradeDistribution = Array.from(gradeCounts.entries()).map(([grade, count]) => ({
    grade,
    count,
    pct: meritList.length > 0 ? Math.round((count / meritList.length) * 100) : 0,
  }));

  const passed = meritList.filter((m) => m.passed).length;
  const failed = meritList.length - passed;
  const passRatePct = meritList.length > 0 ? Math.round((passed / meritList.length) * 100) : 100;

  const curriculumCompletion = curriculum.map((c) => ({
    subjectBn: c.subjectBn,
    className: c.className,
    completed: c.completedChapters,
    total: c.totalChapters,
    pct: c.totalChapters > 0 ? Math.round((c.completedChapters / c.totalChapters) * 100) : 0,
  }));

  const assignmentCompletionPct =
    studentAssignments.length > 0
      ? Math.round((studentAssignments.filter((a) => a.status === 'submitted').length / studentAssignments.length) * 100)
      : 0;

  const lessonCompletionPct =
    lessonPlans.length > 0
      ? Math.round((lessonPlans.filter((l) => l.status === 'taught' || l.status === 'reviewed').length / lessonPlans.length) * 100)
      : 0;

  return {
    classPerformance,
    subjectPerformance,
    teacherPerformance,
    gradeDistribution,
    curriculumCompletion,
    passFailStats: { passed, failed, total: meritList.length, passRatePct },
    assignmentCompletionPct,
    lessonCompletionPct,
  };
}

// === 1. Teacher Class Ownership, Substitute Permission, Cancel/Restore Class & Performance ===

export const CANCEL_CLASS_REASONS: AcademicCancelClassReason[] = [
  'Teacher Unavailable',
  'Emergency',
  'Student Issue',
  'Technical Problem',
  'School Activity',
  'Other',
];

export function grantSubstitutePermission(
  slot: RoutineSlot,
  ownerTeacher: TeacherRecord,
  substituteTeacher: TeacherRecord,
  date: string,
  reason: string,
  durationDays = 1
): SubstitutePermissionRecord {
  if (slot.teacherId !== ownerTeacher.id) {
    throw new Error('Only the assigned class owner teacher can grant substitute permission.');
  }
  if (ownerTeacher.id === substituteTeacher.id) {
    throw new Error('Cannot grant substitute permission to yourself.');
  }
  if ((slot.schoolId ?? ownerTeacher.schoolId) !== substituteTeacher.schoolId) {
    throw new Error('Substitute teacher must belong to the same school.');
  }
  if (!reason.trim()) {
    throw new Error('Reason is required to grant substitute permission.');
  }
  return {
    id: `subp-${Date.now().toString().slice(-5)}`,
    schoolId: slot.schoolId ?? ownerTeacher.schoolId,
    slotId: slot.id,
    className: slot.className,
    section: slot.section,
    subjectBn: slot.subjectBn,
    subjectEn: slot.subjectEn,
    ownerTeacherId: ownerTeacher.id,
    ownerTeacherName: ownerTeacher.nameBn,
    substituteTeacherId: substituteTeacher.id,
    substituteTeacherName: substituteTeacher.nameBn,
    date,
    timeRange: slot.timeRange,
    reason: reason.trim(),
    durationDays: Math.max(1, durationDays),
    status: 'pending_admin',
    createdAt: 'এইমাত্র',
  };
}

export function reviewSubstitutePermission(
  permission: SubstitutePermissionRecord,
  slot: RoutineSlot,
  action: 'approve' | 'revoke',
  actorName: string
): { permission: SubstitutePermissionRecord; slot: RoutineSlot } {
  if (action === 'approve') {
    return {
      permission: { ...permission, status: 'approved', reviewedBy: actorName },
      slot: {
        ...slot,
        substituteTeacherId: permission.substituteTeacherId,
        substituteTeacher: permission.substituteTeacherName,
        substituteReason: permission.reason,
        substitutePermissionId: permission.id,
        status: slot.status === 'sub_requested' ? 'pending' : slot.status,
      },
    };
  }
  return {
    permission: { ...permission, status: 'revoked', reviewedBy: actorName },
    slot: {
      ...slot,
      substituteTeacherId: undefined,
      substituteTeacher: undefined,
      substituteReason: undefined,
      substitutePermissionId: undefined,
      status: slot.status === 'sub_requested' ? 'pending' : slot.status,
    },
  };
}

export function cancelClassSlotWithReason(
  slot: RoutineSlot,
  actorTeacherId: string | null,
  isSchoolAdmin: boolean,
  reason: AcademicCancelClassReason | string,
  remarks?: string
): RoutineSlot {
  if (!isSchoolAdmin && slot.teacherId !== actorTeacherId && slot.substituteTeacherId !== actorTeacherId) {
    throw new Error('Unauthorized: only assigned teacher or School Admin can cancel this class.');
  }
  if (!reason.trim()) {
    throw new Error('Class cancellation requires a valid reason.');
  }
  return {
    ...slot,
    status: 'cancelled',
    cancelledReason: reason.trim(),
    cancelledRemarks: remarks?.trim() || undefined,
  };
}

export function restoreCancelledClassSlot(slot: RoutineSlot, isSchoolAdmin: boolean): RoutineSlot {
  if (!isSchoolAdmin) {
    throw new Error('Only School Admin can restore a cancelled class.');
  }
  return {
    ...slot,
    status: 'pending',
    cancelledReason: undefined,
    cancelledRemarks: undefined,
  };
}

export function computeTeacherDailyTasks(
  teacher: TeacherRecord,
  attendanceLog: TeacherAttendanceLog | undefined,
  slots: RoutineSlot[],
  dailyLessons: DailyLessonHomeworkItem[],
  submissions: SubjectResultSubmission[]
): { tasks: TeacherDailyTaskItem[]; completedCount: number; totalCount: number; pct: number } {
  const checkedIn = attendanceLog?.status === 'present' || attendanceLog?.status === 'late';
  const mySlots = slots.filter((s) => (s.substituteTeacherId ?? s.teacherId) === teacher.id);

  const tasks: TeacherDailyTaskItem[] = [
    {
      id: 'task-checkin',
      titleBn: 'স্কুল Check In সম্পন্ন করুন',
      titleEn: 'Complete School Check In',
      type: 'checkin',
      status: checkedIn ? 'completed' : 'pending',
    },
  ];

  mySlots.forEach((slot, idx) => {
    tasks.push({
      id: `task-cls-${slot.id}`,
      titleBn: `${idx + 1}. ${slot.className} · ${slot.subjectBn} ক্লাস নিন`,
      titleEn: `${idx + 1}. Conduct ${slot.className} · ${slot.subjectEn}`,
      type: 'class',
      status:
        slot.status === 'completed'
          ? 'completed'
          : slot.status === 'in_progress'
            ? 'in_progress'
            : 'pending',
      slotId: slot.id,
    });
    const hasHomework =
      Boolean(slot.homeworkText) ||
      dailyLessons.some(
        (d) =>
          d.teacherId === teacher.id &&
          d.className === slot.className &&
          d.subjectEn.toLowerCase() === slot.subjectEn.toLowerCase() &&
          d.status === 'published'
      );
    tasks.push({
      id: `task-hw-${slot.id}`,
      titleBn: `${idx + 1}. ${slot.className} · ${slot.subjectBn} আজকের পড়া/Homework দিন`,
      titleEn: `${idx + 1}. Publish ${slot.className} · ${slot.subjectEn} Homework`,
      type: 'homework',
      status: hasHomework ? 'completed' : 'pending',
      slotId: slot.id,
    });
  });

  const pendingMarks = submissions.filter((s) => s.teacherId === teacher.id && s.status === 'pending').length;
  tasks.push({
    id: 'task-marks',
    titleBn: 'পরীক্ষার নম্বর যাচাই ও জমা দিন',
    titleEn: 'Verify & Submit Exam Marks',
    type: 'marks',
    status: pendingMarks === 0 ? 'completed' : 'pending',
  });

  const allClassesDone = mySlots.length > 0 && mySlots.every((s) => s.status === 'completed' || s.status === 'cancelled');
  tasks.push({
    id: 'task-report',
    titleBn: 'দৈনিক পাঠ প্রতিবেদন (Daily Report) সম্পন্ন',
    titleEn: 'Daily Academic Report Summary',
    type: 'report',
    status: checkedIn && allClassesDone ? 'completed' : 'pending',
  });

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const totalCount = tasks.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  return { tasks, completedCount, totalCount, pct };
}

export function computeTeacherPerformanceMetrics(
  teacher: TeacherRecord,
  slots: RoutineSlot[],
  dailyLessons: DailyLessonHomeworkItem[],
  attendanceLog: TeacherAttendanceLog | undefined
): TeacherPerformanceMetrics {
  const mySlots = slots.filter((s) => (s.substituteTeacherId ?? s.teacherId) === teacher.id);
  const activeOrDone = mySlots.filter((s) => s.status === 'completed' || s.status === 'in_progress').length;
  const attendancePct = attendanceLog?.status === 'late' ? 92 : attendanceLog?.status === 'present' ? 98 : 95;
  const onTimeStartPct = mySlots.length > 0 ? Math.min(100, Math.round(88 + (activeOrDone / mySlots.length) * 10)) : 92;
  const classCompletionPct =
    mySlots.length > 0
      ? Math.round((mySlots.filter((s) => s.status === 'completed' || s.status === 'in_progress').length / mySlots.length) * 100)
      : 90;
  const myLessons = dailyLessons.filter((d) => d.teacherId === teacher.id);
  const homeworkSubmissionPct = myLessons.length > 0 ? Math.min(100, 82 + myLessons.length * 4) : 88;
  const adminEvaluationPct = teacher.performanceScore;
  const overallScorePct = Math.round(
    (attendancePct * 0.2 +
      onTimeStartPct * 0.2 +
      classCompletionPct * 0.2 +
      homeworkSubmissionPct * 0.15 +
      adminEvaluationPct * 0.25)
  );

  return {
    teacherId: teacher.id,
    attendancePct,
    onTimeStartPct,
    classCompletionPct,
    homeworkSubmissionPct,
    adminEvaluationPct,
    overallScorePct,
  };
}

// === 2. Roll-wise Marks Submission, Multi-Level Result Control & Positions ===

export interface MarksValidationReport {
  isValid: boolean;
  errors: string[];
  missingCount: number;
  totalStudents: number;
}

export function validateMarksEntrySubmission(
  teacher: TeacherRecord,
  assignments: TeacherSubjectAssignment[],
  exam: ExamRecord,
  className: string,
  subjectBn: string,
  subjectEn: string,
  classStudents: StudentRecord[]
): MarksValidationReport {
  const errors: string[] = [];
  const allowed = canTeacherEnterSubjectMarks(teacher, assignments, className, subjectBn, subjectEn);
  if (!allowed) {
    return {
      isValid: false,
      errors: [`Unauthorized: ${teacher.nameBn} is not assigned to ${className} · ${subjectEn}.`],
      missingCount: classStudents.length,
      totalStudents: classStudents.length,
    };
  }
  if (exam.schoolId && exam.schoolId !== teacher.schoolId) {
    return {
      isValid: false,
      errors: ['Cross-school data violation: exam belongs to another school.'],
      missingCount: classStudents.length,
      totalStudents: classStudents.length,
    };
  }

  let missingCount = 0;
  for (const stu of classStudents) {
    const entry = exam.entries.find(
      (e) =>
        e.studentId === stu.id &&
        (e.subjectEn.toLowerCase() === subjectEn.toLowerCase() || e.subjectBn === subjectBn)
    );
    if (!entry) {
      missingCount += 1;
      continue;
    }
    const total = computeEntryTotalMarks(entry);
    if (Number.isNaN(total) || entry.written < 0 || (entry.mcq ?? 0) < 0 || total > entry.fullMarks) {
      errors.push(`Invalid marks range for Roll ${stu.roll} (${stu.nameBn}): total=${total}/${entry.fullMarks}.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    missingCount,
    totalStudents: classStudents.length,
  };
}

export function submitSubjectResultMarks(
  submissions: SubjectResultSubmission[],
  teacher: TeacherRecord,
  assignments: TeacherSubjectAssignment[],
  exam: ExamRecord,
  className: string,
  subjectBn: string,
  subjectEn: string,
  timestamp: string
): { submissions: SubjectResultSubmission[]; auditEntry: ResultAuditEntry } {
  if (!canTeacherEnterSubjectMarks(teacher, assignments, className, subjectBn, subjectEn)) {
    throw new Error(`Teacher ${teacher.nameEn} is not authorized to submit marks for ${className} ${subjectEn}.`);
  }
  if (exam.schoolId && exam.schoolId !== teacher.schoolId) {
    throw new Error('Cannot submit marks for a different school.');
  }

  const existing = submissions.find(
    (s) =>
      s.schoolId === (exam.schoolId ?? teacher.schoolId) &&
      s.examId === exam.id &&
      s.className === className &&
      s.subjectEn.toLowerCase() === subjectEn.toLowerCase()
  );

  const nextSubmissions: SubjectResultSubmission[] = existing
    ? submissions.map((s) =>
        s.id === existing.id
          ? { ...s, teacherId: teacher.id, teacherName: teacher.nameBn, status: 'submitted', submittedAt: timestamp }
          : s
      )
    : [
        ...submissions,
        {
          id: `rsub-${Date.now().toString().slice(-5)}`,
          schoolId: exam.schoolId ?? teacher.schoolId,
          academicYear: exam.academicYear ?? '২০২৬ শিক্ষাবর্ষ',
          examId: exam.id,
          className,
          subjectBn,
          subjectEn,
          teacherId: teacher.id,
          teacherName: teacher.nameBn,
          status: 'submitted',
          submittedAt: timestamp,
        },
      ];

  const auditEntry: ResultAuditEntry = {
    id: `raud-${Date.now().toString().slice(-5)}`,
    schoolId: exam.schoolId ?? teacher.schoolId,
    examId: exam.id,
    className,
    subjectEn,
    actorName: teacher.nameBn,
    actorRole: 'teacher',
    action: 'submitted',
    timestamp,
    note: `${className} · ${subjectBn} নম্বর চূড়ান্তভাবে জমা দেওয়া হয়েছে।`,
  };

  return { submissions: nextSubmissions, auditEntry };
}

export function computeResultCompletionProgress(
  submissions: SubjectResultSubmission[],
  schoolId: string,
  examId: string
): {
  completedCount: number;
  totalCount: number;
  percentage: number;
  pendingSubmissions: SubjectResultSubmission[];
  allCompleted: boolean;
} {
  const scoped = submissions.filter((s) => s.schoolId === schoolId && s.examId === examId);
  const completedCount = scoped.filter((s) => s.status === 'submitted' || s.status === 'verified').length;
  const totalCount = scoped.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const pendingSubmissions = scoped.filter((s) => s.status === 'pending' || s.status === 'correction_requested');
  return {
    completedCount,
    totalCount,
    percentage,
    pendingSubmissions,
    allCompleted: totalCount > 0 && completedCount === totalCount,
  };
}

export function canSchoolPublishResult(
  school: SchoolRecord,
  exam: ExamRecord,
  submissions: SubjectResultSubmission[]
): { allowed: boolean; reasonBn: string; reasonEn: string } {
  if (exam.isCentralControlled && exam.centralPublished === false) {
    return {
      allowed: false,
      reasonBn: '১ম/২য়/বার্ষিক প্রান্তিক পরীক্ষা Central Admin কর্তৃক অনুমোদিত ও প্রকাশিত না হওয়া পর্যন্ত বন্ধ থাকবে।',
      reasonEn: 'Term 1/2/3 exam remains locked until published by Central Admin.',
    };
  }
  if (school.resultPublishAllowed === false) {
    return {
      allowed: false,
      reasonBn: 'Central Admin কর্তৃক ফলাফল প্রকাশ লক করা আছে (Publish Locked 🔒)।',
      reasonEn: 'Result publishing is currently locked by Central Admin.',
    };
  }
  if (exam.schoolId && exam.schoolId !== school.id) {
    return {
      allowed: false,
      reasonBn: 'ভিন্ন বিদ্যালয়ের পরীক্ষার ফলাফল প্রকাশ অনুমোদিত নয়।',
      reasonEn: 'Exam belongs to a different school.',
    };
  }
  const progress = computeResultCompletionProgress(submissions, school.id, exam.id);
  if (progress.totalCount > 0 && !progress.allCompleted) {
    return {
      allowed: false,
      reasonBn: `সকল বিষয়ের নম্বর এখনো জমা হয়নি (${progress.completedCount}/${progress.totalCount})।`,
      reasonEn: `Not all subjects have been submitted (${progress.completedCount}/${progress.totalCount}).`,
    };
  }
  return {
    allowed: true,
    reasonBn: 'সকল শর্ত পূরণ হয়েছে — ফলাফল প্রকাশের জন্য প্রস্তুত।',
    reasonEn: 'All checks passed — ready to publish.',
  };
}

export function publishAllEligibleSchoolsResults(
  schools: SchoolRecord[],
  exams: ExamRecord[],
  submissions: SubjectResultSubmission[]
): {
  updatedExams: ExamRecord[];
  publishedSchoolIds: string[];
  skippedSchoolIds: string[];
} {
  const publishedSchoolIds: string[] = [];
  const skippedSchoolIds: string[] = [];

  const updatedExams = exams.map((exam) => {
    const school = schools.find((s) => s.id === (exam.schoolId ?? 'GPS-1042'));
    if (!school) {
      if (!skippedSchoolIds.includes(exam.schoolId ?? 'unknown')) {
        skippedSchoolIds.push(exam.schoolId ?? 'unknown');
      }
      return exam;
    }
    const eligibility = canSchoolPublishResult(school, exam, submissions);
    if (eligibility.allowed) {
      if (!publishedSchoolIds.includes(school.id)) {
        publishedSchoolIds.push(school.id);
      }
      return { ...exam, status: 'published' as const };
    }
    if (!skippedSchoolIds.includes(school.id)) {
      skippedSchoolIds.push(school.id);
    }
    return exam;
  });

  return { updatedExams, publishedSchoolIds, skippedSchoolIds };
}

export interface StudentMarksheetSummary {
  studentId: string;
  studentName: string;
  roll: number;
  className: string;
  isPublished: boolean;
  overallPosition: number;
  totalClassStudents: number;
  overallGpa: number;
  overallGrade: string;
  totalMarksObtained: number;
  totalFullMarks: number;
  subjects: Array<{
    subjectBn: string;
    subjectEn: string;
    written: number;
    mcq: number;
    oral: number;
    continuous: number;
    total: number;
    fullMarks: number;
    letterGrade: string;
    gpa: number;
    subjectPosition: number;
  }>;
}

export function computeSubjectAndOverallPositions(
  exam: ExamRecord,
  student: StudentRecord,
  gradingRules: GradingRuleItem[] = DEFAULT_NCTB_GRADING_RULES
): StudentMarksheetSummary | null {
  if (exam.schoolId && exam.schoolId !== student.schoolId) {
    return null;
  }
  if (exam.status !== 'published') {
    return {
      studentId: student.id,
      studentName: student.nameBn,
      roll: student.roll,
      className: student.className,
      isPublished: false,
      overallPosition: 0,
      totalClassStudents: 0,
      overallGpa: 0,
      overallGrade: '—',
      totalMarksObtained: 0,
      totalFullMarks: 0,
      subjects: [],
    };
  }

  const classEntries = exam.entries.filter((e) => (e.className ?? exam.className) === student.className);
  const myEntries = classEntries.filter((e) => e.studentId === student.id);
  const meritList = computeStudentMeritList(classEntries);
  const myMerit = meritList.find((m) => m.studentId === student.id);

  const subjects = myEntries.map((entry) => {
    const total = computeEntryTotalMarks(entry);
    const grade = calculateCustomGradeAndGPA(total, entry.fullMarks, entry.passMarks, gradingRules);
    const peers = classEntries
      .filter((e) => e.subjectEn === entry.subjectEn)
      .map((e) => ({ studentId: e.studentId, total: computeEntryTotalMarks(e) }))
      .sort((a, b) => b.total - a.total);
    const posIdx = peers.findIndex((p) => p.studentId === student.id);
    return {
      subjectBn: entry.subjectBn,
      subjectEn: entry.subjectEn,
      written: entry.written,
      mcq: entry.mcq ?? 0,
      oral: entry.oral,
      continuous: entry.continuous,
      total,
      fullMarks: entry.fullMarks,
      letterGrade: grade.letterGrade,
      gpa: grade.gpa,
      subjectPosition: posIdx >= 0 ? posIdx + 1 : 1,
    };
  });

  const totalMarksObtained = subjects.reduce((s, item) => s + item.total, 0);
  const totalFullMarks = subjects.reduce((s, item) => s + item.fullMarks, 0);

  return {
    studentId: student.id,
    studentName: student.nameBn,
    roll: student.roll,
    className: student.className,
    isPublished: true,
    overallPosition: myMerit?.rank ?? 1,
    totalClassStudents: meritList.length || 1,
    overallGpa: myMerit?.gpa ?? 0,
    overallGrade: myMerit?.letterGrade ?? '—',
    totalMarksObtained,
    totalFullMarks,
    subjects,
  };
}

// === 3. আজকের পড়া (Today's Lessons) RBAC & Scoping ===

export function canTeacherPublishDailyLesson(
  teacher: TeacherRecord,
  assignments: TeacherSubjectAssignment[],
  schoolId: string,
  className: string,
  subjectBn: string,
  subjectEn: string
): boolean {
  if (teacher.schoolId !== schoolId) return false;
  return canTeacherEnterSubjectMarks(teacher, assignments, className, subjectBn, subjectEn);
}

export function filterDailyLessonsForRole(
  lessons: DailyLessonHomeworkItem[],
  params: {
    role: Role;
    schoolId: string;
    student?: StudentRecord;
    teacher?: TeacherRecord;
    date?: string;
    className?: string;
    subjectEn?: string;
  }
): DailyLessonHomeworkItem[] {
  return lessons.filter((item) => {
    if (item.schoolId !== params.schoolId) return false;
    if (params.date && item.date !== params.date) return false;

    if (params.role === 'student' || params.role === 'guardian') {
      if (!params.student) return false;
      if (item.schoolId !== params.student.schoolId) return false;
      if (item.className !== params.student.className) return false;
      if (item.status !== 'published') return false;
    }

    if (params.className && params.className !== 'all' && item.className !== params.className) {
      return false;
    }
    if (
      params.subjectEn &&
      params.subjectEn !== 'all' &&
      item.subjectEn.toLowerCase() !== params.subjectEn.toLowerCase()
    ) {
      return false;
    }
    return true;
  });
}

// === 4. Clean Action Bar RBAC & Important Record Delete Protection ===

const PROTECTED_ACADEMIC_CATEGORIES: AcademicRecordCategory[] = [
  'result',
  'marks',
  'exam',
  'attendance',
  'document',
];

export function getAllowedSecondaryActions(
  role: Role,
  category: AcademicRecordCategory,
  status: string,
  readOnlyOversight = false
): AcademicSecondaryAction[] {
  if (role === 'student' || role === 'guardian') {
    return category === 'document' || category === 'result' ? ['download', 'print'] : ['history'];
  }
  if (readOnlyOversight && role === 'central_admin') {
    if (category === 'result') {
      return status === 'locked' ? ['unlock', 'history', 'download'] : ['lock', 'history', 'download'];
    }
    return ['history', 'download', 'print'];
  }

  const isProtected = PROTECTED_ACADEMIC_CATEGORIES.includes(category);
  const actions: AcademicSecondaryAction[] = [];

  if (category === 'result' || category === 'marks' || category === 'exam') {
    actions.push(status === 'locked' ? 'unlock' : 'lock');
    actions.push('correction_request', 'void', 'archive', 'history', 'download', 'print');
  } else if (category === 'attendance' || category === 'document') {
    actions.push('correction_request', 'archive', 'history', 'download', 'print');
  } else {
    actions.push('change', 'duplicate', 'archive', 'history');
    if (role === 'school_admin' && !isProtected) {
      actions.push('delete');
    }
  }
  return actions;
}

// === 5. Global Academic Search ===

export function buildGlobalAcademicSearchResults(
  query: string,
  params: {
    role: Role;
    students: StudentRecord[];
    teacherAssignments: TeacherSubjectAssignment[];
    routineSlots: RoutineSlot[];
    dailyLessons: DailyLessonHomeworkItem[];
    exams: ExamRecord[];
    assignments: AssignmentItem[];
  }
): GlobalAcademicSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: GlobalAcademicSearchResult[] = [];
  const canSeeAdminStuff = params.role === 'central_admin' || params.role === 'school_admin';

  for (const stu of params.students) {
    if (
      stu.nameBn.toLowerCase().includes(q) ||
      stu.nameEn.toLowerCase().includes(q) ||
      stu.permanentId.toLowerCase().includes(q)
    ) {
      results.push({
        id: `gs-stu-${stu.id}`,
        category: 'student',
        title: `${stu.nameBn} (${stu.nameEn})`,
        subtitle: `${stu.className} · Roll ${stu.roll} · ${stu.schoolNameBn}`,
        targetRoleTab: canSeeAdminStuff ? 'students' : 'dashboard',
        targetModule: 'student_progress',
        contextClass: stu.className,
        studentId: stu.id,
      });
    }
  }

  for (const ta of params.teacherAssignments) {
    if (
      ta.subjectBn.toLowerCase().includes(q) ||
      ta.subjectEn.toLowerCase().includes(q) ||
      ta.teacherName.toLowerCase().includes(q) ||
      ta.className.toLowerCase().includes(q)
    ) {
      results.push({
        id: `gs-ta-${ta.id}`,
        category: 'teacher_assignment',
        title: `${ta.className} · ${ta.subjectBn} (${ta.subjectEn})`,
        subtitle: `${ta.teacherName} · Room ${ta.room}`,
        targetRoleTab: params.role === 'teacher' ? 'my_classes' : 'academics',
        targetModule: 'teacher_assignment',
        contextClass: ta.className,
        contextSubjectEn: ta.subjectEn,
      });
    }
  }

  for (const dl of params.dailyLessons) {
    if (
      dl.subjectBn.toLowerCase().includes(q) ||
      dl.subjectEn.toLowerCase().includes(q) ||
      dl.lessonTitleBn.toLowerCase().includes(q) ||
      dl.homeworkTextBn.toLowerCase().includes(q)
    ) {
      results.push({
        id: `gs-dl-${dl.id}`,
        category: 'lesson',
        title: `আজকের পড়া: ${dl.subjectBn} — ${dl.lessonTitleBn}`,
        subtitle: `${dl.className} (${dl.date}) · ${dl.teacherName}`,
        targetRoleTab: params.role === 'teacher' ? 'teaching' : params.role === 'student' || params.role === 'guardian' ? 'todays_lessons' : 'academics',
        targetModule: 'todays_lessons',
        contextClass: dl.className,
        contextSubjectEn: dl.subjectEn,
      });
    }
  }

  for (const ex of params.exams) {
    if (
      ex.titleBn.toLowerCase().includes(q) ||
      ex.titleEn.toLowerCase().includes(q) ||
      ex.className.toLowerCase().includes(q) ||
      'result'.includes(q) ||
      'ফলাফল'.includes(q)
    ) {
      results.push({
        id: `gs-ex-${ex.id}`,
        category: 'result',
        title: `${ex.titleBn}`,
        subtitle: `${ex.className} · Status: ${ex.status}`,
        targetRoleTab: params.role === 'teacher' ? 'assessment' : params.role === 'student' || params.role === 'guardian' ? 'results' : 'academics',
        targetModule: 'result',
        contextClass: ex.className,
      });
    }
  }

  for (const slot of params.routineSlots) {
    if (
      slot.subjectBn.toLowerCase().includes(q) ||
      slot.subjectEn.toLowerCase().includes(q) ||
      slot.teacherName.toLowerCase().includes(q)
    ) {
      results.push({
        id: `gs-rt-${slot.id}`,
        category: 'routine',
        title: `Routine: ${slot.className} · ${slot.subjectBn}`,
        subtitle: `Period ${slot.period} (${slot.timeRange}) · Room ${slot.room}`,
        targetRoleTab: params.role === 'teacher' ? 'my_routine' : params.role === 'student' || params.role === 'guardian' ? 'routine' : 'academics',
        targetModule: 'class_routine',
        contextClass: slot.className,
        contextSubjectEn: slot.subjectEn,
      });
    }
  }

  for (const asg of params.assignments) {
    if (
      asg.titleBn.toLowerCase().includes(q) ||
      asg.subjectBn.toLowerCase().includes(q) ||
      asg.subjectEn.toLowerCase().includes(q)
    ) {
      results.push({
        id: `gs-asg-${asg.id}`,
        category: 'assignment',
        title: asg.titleBn,
        subtitle: `${asg.subjectBn} · Due: ${asg.dueDate}`,
        targetRoleTab:
          params.role === 'guardian'
            ? 'assignments'
            : params.role === 'student'
              ? 'assignment'
              : 'academics',
        targetModule: 'assignment',
        contextSubjectEn: asg.subjectEn,
      });
    }
  }

  if ('report'.includes(q) || 'রিপোর্ট'.includes(q) || 'merit'.includes(q)) {
    results.push({
      id: 'gs-rep-1',
      category: 'report',
      title: 'Academic Reports & Merit Analysis (১৪ রিপোর্ট)',
      subtitle: 'Class Performance · Subject Pass Rate · Merit List',
      targetRoleTab: params.role === 'teacher' ? 'reports' : 'academics',
      targetModule: 'academic_reports',
    });
  }

  return results.slice(0, 12);
}

