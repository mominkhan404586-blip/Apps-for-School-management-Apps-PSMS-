import assert from 'node:assert/strict';
import test from 'node:test';
import {
  INITIAL_EXAMS,
  INITIAL_KIOSK_SCANS,
  INITIAL_NOTICES,
  INITIAL_NOTIFICATIONS,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
} from './testFixtures';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  computeSinceLastVisitSummary,
  createNoticeRecord,
  editNoticeRecord,
  filterNotifications,
  filterNoticesForRecipient,
  getScopedNotificationsForRole,
  isNoticeReadByUser,
  markNoticeReadByUser,
  transitionNoticeStatus,
} from './notificationAndNoticeEngine';
import {
  buildAbsentGuardianNotifications,
  computeAttendanceSessionStats,
  matchStudentByIdCardCode,
  processAutoIdCardScan,
} from './attendanceScannerEngine';
import {
  canActorEditExamMarks,
  createExamWithGovernance,
  getVisibleExamsForRole,
  setCentralTermExamPublished,
} from './examGovernanceEngine';

test('Notification Engine: role isolation, filtering, preferences, and Since Last Visit summary', () => {
  const teacherScoped = getScopedNotificationsForRole(INITIAL_NOTIFICATIONS, {
    role: 'teacher',
    schoolId: 'GPS-1042',
    teacherId: 'tch-2',
  });
  assert.ok(teacherScoped.some((n) => n.id === 'nf-4'));
  assert.ok(teacherScoped.some((n) => n.id === 'nf-6')); // emergency 'all' in GPS-1042
  assert.ok(!teacherScoped.some((n) => n.roleTarget === 'central_admin'));

  const guardianScoped = getScopedNotificationsForRole(INITIAL_NOTIFICATIONS, {
    role: 'guardian',
    schoolId: 'GPS-1042',
    studentId: 'stu-rahim',
  });
  assert.ok(guardianScoped.some((n) => n.id === 'nf-3'));
  assert.ok(!guardianScoped.some((n) => n.roleTarget === 'school_admin'));

  // Mute message notifications in preferences -> messages hidden, emergency still bypasses mute
  const prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES, message: false };
  const filtered = filterNotifications(
    INITIAL_NOTIFICATIONS,
    { role: 'guardian', schoolId: 'GPS-1042', studentId: 'stu-rahim' },
    { tab: 'all', category: 'all', priority: 'all', preferences: prefs }
  );
  assert.ok(!filtered.some((n) => n.category === 'message'));
  assert.ok(filtered.some((n) => n.priority === 'emergency'));

  // Since Last Visit calculation
  const summary = computeSinceLastVisitSummary(
    INITIAL_NOTIFICATIONS,
    { role: 'guardian', schoolId: 'GPS-1042', studentId: 'stu-rahim' },
    '2026-11-19T09:20:00'
  );
  assert.ok(summary.totalNew >= 3); // nf-3b, nf-3c, nf-6
  assert.equal(summary.emergencyCount, 1);
  assert.equal(summary.messageCount, 1);
  assert.equal(summary.examResultCount, 1);
});

test('Notice & Communication Engine: lifecycle (Draft/Scheduled/Published/Edited/Cancelled), targeting & read tracking', () => {
  const draftNotice = createNoticeRecord({
    titleBn: 'বিশেষ বিজ্ঞান ক্লাব সভা',
    titleEn: 'Special Science Club Meeting',
    bodyBn: 'আগামী বৃহস্পতিবার দুপুর ২টায় ক্লাব সভা।',
    bodyEn: 'Club meeting Thursday 2 PM.',
    noticeType: 'teacher',
    category: 'event',
    audienceGroup: 'specific_users',
    targetUserIds: ['stu-rahim'],
    targetUserNames: ['মোঃ রাহিম উদ্দিন'],
    status: 'Scheduled',
    scheduledAt: '2026-11-21T09:00',
    validityLabel: '5 Days',
    schoolId: 'GPS-1042',
    author: 'মোঃ আব্দুর রহিম',
    authorRole: 'teacher',
    authorId: 'tch-2',
  });

  // Recipients must NOT see Scheduled notice yet
  const studentVisibleBefore = filterNoticesForRecipient([draftNotice, ...INITIAL_NOTICES], {
    role: 'student',
    userId: 'stu-rahim',
    schoolId: 'GPS-1042',
    className: 'Class 4',
  });
  assert.ok(!studentVisibleBefore.some((n) => n.id === draftNotice.id));

  // Publish it
  const published = transitionNoticeStatus(draftNotice, 'Published', 'মোঃ আব্দুর রহিম');
  assert.equal(published.status, 'Published');
  assert.equal(published.history?.length, 2);

  // Targeted student sees it, other student does NOT
  const rahimVisible = filterNoticesForRecipient([published], {
    role: 'student',
    userId: 'stu-rahim',
    schoolId: 'GPS-1042',
    className: 'Class 4',
  });
  const tasnimVisible = filterNoticesForRecipient([published], {
    role: 'student',
    userId: 'stu-tasnim',
    schoolId: 'GPS-1042',
    className: 'Class 4',
  });
  assert.equal(rahimVisible.length, 1);
  assert.equal(tasnimVisible.length, 0);

  // Edit transitions status to Edited and appends history
  const edited = editNoticeRecord(published, { titleBn: 'আপডেটেড বিজ্ঞান ক্লাব সভা' }, 'মোঃ আব্দুর রহিম');
  assert.equal(edited.status, 'Edited');
  assert.equal(edited.history?.[0].action, 'Edited');
  assert.equal(edited.history?.length, 3);

  // Read/Unread tracking per user
  assert.equal(isNoticeReadByUser(edited, 'stu-rahim'), false);
  const marked = markNoticeReadByUser(edited, 'stu-rahim');
  assert.equal(isNoticeReadByUser(marked, 'stu-rahim'), true);
});

test('Auto ID Card Attendance Scanner: matching, school isolation, duplicate blocking & guardian alerts', () => {
  const rahim = INITIAL_STUDENTS.find((s) => s.id === 'stu-rahim')!;
  const sadia = INITIAL_STUDENTS.find((s) => s.id === 'stu-sadia')!;
  const otherSchoolStudent = INITIAL_STUDENTS.find((s) => s.schoolId !== 'GPS-1042')!;

  // Matches by permanentId or guardianLinkCode
  assert.equal(
    matchStudentByIdCardCode(sadia.permanentId, 'GPS-1042', INITIAL_STUDENTS).student?.id,
    sadia.id
  );

  // Multi-school isolation check
  const wrongSchoolRes = processAutoIdCardScan({
    rawCode: otherSchoolStudent.permanentId,
    schoolId: 'GPS-1042',
    students: INITIAL_STUDENTS,
    existingScans: INITIAL_KIOSK_SCANS,
    dateIso: '2026-11-19',
    scanTime: '09:15 AM',
  });
  assert.equal(wrongSchoolRes.status, 'wrong_school');

  // Duplicate prevention for rahim (already in INITIAL_KIOSK_SCANS on 2026-11-19)
  const dupRes = processAutoIdCardScan({
    rawCode: rahim.permanentId,
    schoolId: 'GPS-1042',
    students: INITIAL_STUDENTS,
    existingScans: INITIAL_KIOSK_SCANS,
    dateIso: '2026-11-19',
    scanTime: '09:20 AM',
  });
  assert.equal(dupRes.status, 'duplicate');

  // Valid late scan for sadia triggers Late Arrival guardian notification
  const sadiaScan = processAutoIdCardScan({
    rawCode: sadia.guardianLinkCode,
    schoolId: 'GPS-1042',
    students: INITIAL_STUDENTS,
    existingScans: INITIAL_KIOSK_SCANS,
    dateIso: '2026-11-19',
    scanTime: '09:48 AM',
    isLate: true,
    source: 'auto_camera',
  });
  assert.equal(sadiaScan.status, 'recorded');
  assert.equal(sadiaScan.scanEvent?.attendanceState, 'late');
  assert.equal(sadiaScan.guardianNotification?.roleTarget, 'guardian');
  assert.equal(sadiaScan.guardianNotification?.priority, 'important');

  // Session stats & absent notifications
  const gpsStudents = INITIAL_STUDENTS.filter((s) => s.schoolId === 'GPS-1042');
  const stats = computeAttendanceSessionStats(
    gpsStudents,
    [...INITIAL_KIOSK_SCANS, sadiaScan.scanEvent!],
    '2026-11-19'
  );
  assert.equal(stats.total, gpsStudents.length);
  assert.equal(stats.present, 2); // rahim + tasnim
  assert.equal(stats.late, 2); // mehedi + sadia
  assert.equal(stats.absent, gpsStudents.length - 4);

  const absentAlerts = buildAbsentGuardianNotifications(stats.absentStudents, 'GPS-1042', '2026-11-19');
  assert.equal(absentAlerts.length, stats.absentStudents.length);
  assert.ok(absentAlerts.every((a) => a.roleTarget === 'guardian'));
});

test('Examination Governance Engine: strict Central Admin publish gate for Term 1/2/3 & local exam autonomy', () => {
  // Unpublished Term 1 (exm-2026-t1) must be visible to Central Admin ONLY
  const centralExams = getVisibleExamsForRole(INITIAL_EXAMS, { role: 'central_admin', schoolId: 'GPS-1042' });
  assert.ok(centralExams.some((e) => e.id === 'exm-2026-t1'));
  assert.ok(centralExams.some((e) => e.id === 'exm-2026-t2'));

  for (const nonCentralRole of ['school_admin', 'teacher', 'student', 'guardian'] as const) {
    const visible = getVisibleExamsForRole(INITIAL_EXAMS, {
      role: nonCentralRole,
      schoolId: 'GPS-1042',
      studentClass: 'Class 4',
    });
    assert.ok(!visible.some((e) => e.id === 'exm-2026-t1'), `${nonCentralRole} must NOT see unpublished Term 1`);
    assert.ok(!visible.some((e) => e.id === 'exm-2026-t2'), `${nonCentralRole} must NOT see unpublished Term 2`);
    assert.ok(visible.some((e) => e.id === 'exm-2026-t3'), `${nonCentralRole} MUST see centrally published Term 3`);
    assert.ok(visible.some((e) => e.id === 'exm-2026-ct1'), `${nonCentralRole} MUST see local Class Test 04`);
  }

  // Unpublishing sends ZERO notifications
  const holdResult = setCentralTermExamPublished(INITIAL_EXAMS, 'exm-2026-t1', false);
  assert.equal(holdResult.notificationsToSend.length, 0);

  // Central Admin publishes Term 1 -> unlocks visibility & dispatches notifications
  const pubResult = setCentralTermExamPublished(INITIAL_EXAMS, 'exm-2026-t1', true);
  assert.equal(pubResult.notificationsToSend.length, 4); // school_admin, teacher, student, guardian
  const teacherVisibleAfter = getVisibleExamsForRole(pubResult.updatedExams, {
    role: 'teacher',
    schoolId: 'GPS-1042',
  });
  assert.ok(teacherVisibleAfter.some((e) => e.id === 'exm-2026-t1'));

  // Teacher creates local Weekly Test without Central Admin permission
  const rahimSir = INITIAL_TEACHERS.find((t) => t.id === 'tch-2')!;
  const weeklyTest = createExamWithGovernance({
    schoolId: 'GPS-1042',
    titleBn: 'Weekly Math Quiz 09',
    titleEn: 'Weekly Math Quiz 09',
    examCategory: 'weekly_test',
    className: 'Class 4',
    section: 'ক (A)',
    subjectBn: 'গণিত',
    subjectEn: 'Mathematics',
    examDate: '2026-11-24',
    startTime: '11:00 AM',
    durationMins: 25,
    fullMarks: 20,
    instructionsBn: 'সব প্রশ্নের উত্তর দিতে হবে।',
    createdByRole: 'teacher',
    createdByName: rahimSir.nameBn,
    createdByTeacherId: rahimSir.id,
    students: INITIAL_STUDENTS,
  });

  assert.equal(weeklyTest.isCentralControlled, false);
  assert.equal(weeklyTest.centralPublished, true);
  assert.equal(canActorEditExamMarks(weeklyTest, 'teacher', rahimSir), true);
  const studentSeesWeekly = getVisibleExamsForRole([weeklyTest], {
    role: 'student',
    schoolId: 'GPS-1042',
    studentClass: 'Class 4',
  });
  assert.equal(studentSeesWeekly.length, 1);
});
