import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignSubstituteWithReason,
  buildGlobalAcademicSearchResults,
  calculateCustomGradeAndGPA,
  cancelClassSlotWithReason,
  canSchoolPublishResult,
  canTeacherEnterSubjectMarks,
  canTeacherPublishDailyLesson,
  computeAcademicReportsBundle,
  computeClassworkStats,
  computeResultCompletionProgress,
  computeStudentAcademicProgress,
  computeSubjectAndOverallPositions,
  computeTeacherDailyTasks,
  computeTeacherPerformanceMetrics,
  computeTeacherWorkload,
  filterDailyLessonsForRole,
  getAllowedSecondaryActions,
  grantSubstitutePermission,
  publishAllEligibleSchoolsResults,
  restoreCancelledClassSlot,
  reviewSubstitutePermission,
  startClassSessionOnSlot,
  submitSubjectResultMarks,
  validateMarksEntrySubmission,
} from './academicEngine';
import {
  INITIAL_ASSIGNMENTS,
  INITIAL_EXAMS,
  INITIAL_ROUTINE_SLOTS,
  INITIAL_SCHOOLS,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
} from '../data/mockData';
import {
  INITIAL_CLASSWORKS,
  INITIAL_CURRICULUM_UNITS,
  INITIAL_DAILY_LESSONS,
  INITIAL_LESSON_PLANS,
  INITIAL_RESULT_SUBMISSIONS,
  INITIAL_TEACHER_ASSIGNMENTS,
  INITIAL_TEACHER_ATTENDANCE,
} from '../data/academicSeedData';

test('Teacher subject-based marks entry allows only assigned Class + Subject', () => {
  const rahimTeacher = INITIAL_TEACHERS.find((t) => t.id === 'tch-2')!;
  assert.equal(
    canTeacherEnterSubjectMarks(rahimTeacher, INITIAL_TEACHER_ASSIGNMENTS, 'Class 4', 'গণিত', 'Mathematics'),
    true
  );
  assert.equal(
    canTeacherEnterSubjectMarks(rahimTeacher, INITIAL_TEACHER_ASSIGNMENTS, 'Class 4', 'ইংরেজি', 'English'),
    false
  );
  assert.equal(
    canTeacherEnterSubjectMarks(rahimTeacher, INITIAL_TEACHER_ASSIGNMENTS, 'Class 4', 'বিজ্ঞান', 'Science'),
    false
  );
  assert.equal(
    canTeacherEnterSubjectMarks(rahimTeacher, INITIAL_TEACHER_ASSIGNMENTS, 'Class 9', 'গণিত', 'Mathematics'),
    false
  );
});

test('computeTeacherWorkload computes weekly periods and class counts accurately', () => {
  const rahimTeacher = INITIAL_TEACHERS.find((t) => t.id === 'tch-2')!;
  const wl = computeTeacherWorkload(rahimTeacher, INITIAL_TEACHER_ASSIGNMENTS, INITIAL_ROUTINE_SLOTS);
  assert.ok(wl.weeklyPeriods >= 12);
  assert.ok(wl.assignedClassCount >= 2);
});

test('startClassSessionOnSlot creates live Class Session with auto-attendance and assignSubstituteWithReason enforces reason', () => {
  const slot = INITIAL_ROUTINE_SLOTS[1];
  const liveSlot = startClassSessionOnSlot(slot, ['stu-rahim', 'stu-tasnim'], 40, '10:20 AM', 'Grammar Basics');
  assert.equal(liveSlot.status, 'in_progress');
  assert.equal(liveSlot.session?.autoAttendanceCount, 2);
  assert.equal(liveSlot.session?.lessonTopic, 'Grammar Basics');

  assert.throws(() => assignSubstituteWithReason(slot, 'tch-2', 'মোঃ আব্দুর রহিম', ''), /requires an explicit reason/i);
  const subbed = assignSubstituteWithReason(slot, 'tch-2', 'মোঃ আব্দুর রহিম', 'Teacher Absent');
  assert.equal(subbed.substituteReason, 'Teacher Absent');
  assert.equal(subbed.substituteTeacherId, 'tch-2');
});

test('calculateCustomGradeAndGPA evaluates custom rules and pass mark properly', () => {
  const res90 = calculateCustomGradeAndGPA(90, 100, 33);
  assert.equal(res90.letterGrade, 'A+');
  assert.equal(res90.gpa, 5.0);
  const resFail = calculateCustomGradeAndGPA(28, 100, 33);
  assert.equal(resFail.letterGrade, 'F');
  assert.equal(resFail.passed, false);
});

test('computeClassworkStats and computeStudentAcademicProgress compute accurate progress and rankings', () => {
  const cwStats = computeClassworkStats(INITIAL_CLASSWORKS);
  assert.ok(cwStats.total > 0);
  assert.equal(cwStats.completed + cwStats.pending + cwStats.notSubmitted, cwStats.total);

  const rahim = INITIAL_STUDENTS.find((s) => s.id === 'stu-rahim')!;
  const progress = computeStudentAcademicProgress(rahim, INITIAL_EXAMS, INITIAL_ASSIGNMENTS, INITIAL_CLASSWORKS);
  assert.equal(progress.subjectBreakdown.length, 4);
  assert.ok(progress.overallRank >= 1);
  assert.ok(progress.strengths.length >= 1);
});

test('computeAcademicReportsBundle aggregates all report dimensions without NaN', () => {
  const bundle = computeAcademicReportsBundle(
    INITIAL_STUDENTS,
    INITIAL_TEACHERS,
    INITIAL_TEACHER_ASSIGNMENTS,
    INITIAL_ROUTINE_SLOTS,
    INITIAL_EXAMS,
    INITIAL_ASSIGNMENTS,
    INITIAL_CURRICULUM_UNITS,
    INITIAL_LESSON_PLANS
  );
  assert.ok(bundle.classPerformance.length > 0);
  assert.ok(bundle.subjectPerformance.length === 4);
  assert.equal(bundle.passFailStats.passRatePct, 100);
});

test('Substitute permission enforces ownership, admin approval, and revoke cleanup', () => {
  const rahimTeacher = INITIAL_TEACHERS.find((t) => t.id === 'tch-2')!;
  const sumaiyaTeacher = INITIAL_TEACHERS.find((t) => t.id === 'tch-3')!;
  const mathSlot = INITIAL_ROUTINE_SLOTS.find((r) => r.id === 'rt-5')!;
  const englishSlot = INITIAL_ROUTINE_SLOTS.find((r) => r.id === 'rt-2')!;

  assert.throws(
    () => grantSubstitutePermission(englishSlot, rahimTeacher, sumaiyaTeacher, '2026-11-19', 'Urgent'),
    /owner teacher/i
  );

  const perm = grantSubstitutePermission(mathSlot, rahimTeacher, sumaiyaTeacher, '2026-11-19', 'Official Duty', 1);
  assert.equal(perm.status, 'pending_admin');

  const approved = reviewSubstitutePermission(perm, mathSlot, 'approve', 'School Admin');
  assert.equal(approved.permission.status, 'approved');
  assert.equal(approved.slot.substituteTeacherId, sumaiyaTeacher.id);

  const revoked = reviewSubstitutePermission(approved.permission, approved.slot, 'revoke', 'School Admin');
  assert.equal(revoked.permission.status, 'revoked');
  assert.equal(revoked.slot.substituteTeacherId, undefined);
});

test('Cancel Class requires reason and only School Admin can restore cancelled class', () => {
  const slot = INITIAL_ROUTINE_SLOTS[4];
  assert.throws(() => cancelClassSlotWithReason(slot, 'tch-2', false, ''), /valid reason/i);
  assert.throws(() => cancelClassSlotWithReason(slot, 'tch-3', false, 'Emergency'), /Unauthorized/i);

  const cancelled = cancelClassSlotWithReason(slot, 'tch-2', false, 'Emergency', 'Heavy storm');
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.cancelledReason, 'Emergency');

  assert.throws(() => restoreCancelledClassSlot(cancelled, false), /Only School Admin/i);
  const restored = restoreCancelledClassSlot(cancelled, true);
  assert.equal(restored.status, 'pending');
  assert.equal(restored.cancelledReason, undefined);
});

test('Teacher daily tasks & performance metrics reflect live class and attendance', () => {
  const rahimTeacher = INITIAL_TEACHERS.find((t) => t.id === 'tch-2')!;
  const tasks = computeTeacherDailyTasks(
    rahimTeacher,
    INITIAL_TEACHER_ATTENDANCE[0],
    INITIAL_ROUTINE_SLOTS,
    INITIAL_DAILY_LESSONS,
    INITIAL_RESULT_SUBMISSIONS
  );
  assert.ok(tasks.totalCount >= 4);
  assert.ok(tasks.pct >= 0 && tasks.pct <= 100);

  const perf = computeTeacherPerformanceMetrics(
    rahimTeacher,
    INITIAL_ROUTINE_SLOTS,
    INITIAL_DAILY_LESSONS,
    INITIAL_TEACHER_ATTENDANCE[0]
  );
  assert.ok(perf.overallScorePct > 80);
});

test('Roll-wise Marks Validation, Subject Submission & Multi-Level Result Governance enforce Central Lock & Subject Completion', () => {
  const rahimTeacher = INITIAL_TEACHERS.find((t) => t.id === 'tch-2')!;
  const sumaiyaTeacher = INITIAL_TEACHERS.find((t) => t.id === 'tch-3')!;
  const tanjinaTeacher = INITIAL_TEACHERS.find((t) => t.id === 'tch-4')!;
  const gpsSchool = INITIAL_SCHOOLS.find((s) => s.id === 'GPS-1042')!;
  const dhsSchool = INITIAL_SCHOOLS.find((s) => s.id === 'DHS-2019')!;
  const gpsExam = INITIAL_EXAMS[0];
  const dhsExam = INITIAL_EXAMS[1];
  const class4Students = INITIAL_STUDENTS.filter((s) => s.schoolId === 'GPS-1042' && s.className === 'Class 4');

  // Unassigned teacher cannot validate or submit Math marks
  const badCheck = validateMarksEntrySubmission(sumaiyaTeacher, INITIAL_TEACHER_ASSIGNMENTS, gpsExam, 'Class 4', 'গণিত', 'Mathematics', class4Students);
  assert.equal(badCheck.isValid, false);

  const goodCheck = validateMarksEntrySubmission(rahimTeacher, INITIAL_TEACHER_ASSIGNMENTS, gpsExam, 'Class 4', 'গণিত', 'Mathematics', class4Students);
  assert.equal(goodCheck.isValid, true);
  assert.equal(goodCheck.missingCount, 0);

  // Currently GPS-1042 has 3/4 subjects submitted (Science pending)
  const progBefore = computeResultCompletionProgress(INITIAL_RESULT_SUBMISSIONS, 'GPS-1042', gpsExam.id);
  assert.equal(progBefore.completedCount, 3);
  assert.equal(progBefore.totalCount, 4);
  assert.equal(progBefore.allCompleted, false);

  // Publishing blocked until Science is submitted
  const canBefore = canSchoolPublishResult(gpsSchool, gpsExam, INITIAL_RESULT_SUBMISSIONS);
  assert.equal(canBefore.allowed, false);

  // Tanjina submits Science marks -> 4/4 complete -> allowed!
  const { submissions: updatedSubs, auditEntry } = submitSubjectResultMarks(
    INITIAL_RESULT_SUBMISSIONS,
    tanjinaTeacher,
    INITIAL_TEACHER_ASSIGNMENTS,
    gpsExam,
    'Class 4',
    'বিজ্ঞান',
    'Science',
    '১৯ নভে ২০২৬, ১০:৩০ AM'
  );
  assert.equal(auditEntry.action, 'submitted');
  assert.equal(canSchoolPublishResult(gpsSchool, gpsExam, updatedSubs).allowed, true);

  // Central Lock blocks DHS-2019 even if subjects are submitted
  assert.equal(canSchoolPublishResult(dhsSchool, dhsExam, updatedSubs).allowed, false);

  // Batch publish publishes only GPS-1042 and skips DHS-2019
  const batch = publishAllEligibleSchoolsResults(INITIAL_SCHOOLS, INITIAL_EXAMS, updatedSubs);
  assert.deepEqual(batch.publishedSchoolIds, ['GPS-1042']);
  assert.ok(batch.skippedSchoolIds.includes('DHS-2019'));
});

test('computeSubjectAndOverallPositions enforces published gate, school isolation, and ranks 1st/2nd properly', () => {
  const rahim = INITIAL_STUDENTS.find((s) => s.id === 'stu-rahim')!;
  const tasnim = INITIAL_STUDENTS.find((s) => s.id === 'stu-tasnim')!;
  const publishedExam = INITIAL_EXAMS[0];
  const unpublishedExam = { ...publishedExam, status: 'marks_entry' as const };

  const lockedView = computeSubjectAndOverallPositions(unpublishedExam, rahim);
  assert.equal(lockedView?.isPublished, false);
  assert.equal(lockedView?.subjects.length, 0);

  // Cross-school exam returns null
  assert.equal(computeSubjectAndOverallPositions(INITIAL_EXAMS[1], rahim), null);

  const tasnimSheet = computeSubjectAndOverallPositions(publishedExam, tasnim)!;
  const rahimSheet = computeSubjectAndOverallPositions(publishedExam, rahim)!;
  assert.equal(tasnimSheet.isPublished, true);
  assert.equal(tasnimSheet.overallPosition, 1);
  assert.equal(rahimSheet.overallPosition, 2);
  assert.equal(tasnimSheet.subjects[0].subjectPosition, 1);
  assert.equal(rahimSheet.subjects[0].subjectPosition, 2);
});

test("আজকের পড়া (Today's Lessons) RBAC scopes Student strictly to School+Class and Teacher to Assigned Subject+Class", () => {
  const rahim = INITIAL_STUDENTS.find((s) => s.id === 'stu-rahim')!;
  const karim = INITIAL_STUDENTS.find((s) => s.id === 'stu-karim')!; // Class 2
  const rahimTeacher = INITIAL_TEACHERS.find((t) => t.id === 'tch-2')!; // Math Class 4 & 5

  const rahimLessons = filterDailyLessonsForRole(INITIAL_DAILY_LESSONS, {
    role: 'student',
    schoolId: 'GPS-1042',
    student: rahim,
    date: '2026-11-19',
  });
  assert.equal(rahimLessons.length, 4);

  const karimLessons = filterDailyLessonsForRole(INITIAL_DAILY_LESSONS, {
    role: 'student',
    schoolId: 'GPS-1042',
    student: karim,
    date: '2026-11-19',
  });
  assert.equal(karimLessons.length, 0);

  assert.equal(canTeacherPublishDailyLesson(rahimTeacher, INITIAL_TEACHER_ASSIGNMENTS, 'GPS-1042', 'Class 4', 'গণিত', 'Mathematics'), true);
  assert.equal(canTeacherPublishDailyLesson(rahimTeacher, INITIAL_TEACHER_ASSIGNMENTS, 'GPS-1042', 'Class 4', 'ইংরেজি', 'English'), false);
});

test('Academic Delete Policy prohibits deleting protected records and Global Search returns categorized jumps', () => {
  assert.equal(getAllowedSecondaryActions('school_admin', 'result', 'published').includes('delete'), false);
  assert.equal(getAllowedSecondaryActions('school_admin', 'marks', 'submitted').includes('delete'), false);
  assert.equal(getAllowedSecondaryActions('school_admin', 'standard', 'active').includes('delete'), true);
  assert.equal(getAllowedSecondaryActions('student', 'result', 'published').includes('delete'), false);

  const searchRes = buildGlobalAcademicSearchResults('Mathematics', {
    role: 'school_admin',
    students: INITIAL_STUDENTS,
    teacherAssignments: INITIAL_TEACHER_ASSIGNMENTS,
    routineSlots: INITIAL_ROUTINE_SLOTS,
    dailyLessons: INITIAL_DAILY_LESSONS,
    exams: INITIAL_EXAMS,
    assignments: INITIAL_ASSIGNMENTS,
  });
  assert.ok(searchRes.length > 0);
  assert.ok(searchRes.some((r) => r.category === 'lesson' || r.category === 'teacher_assignment'));
});

