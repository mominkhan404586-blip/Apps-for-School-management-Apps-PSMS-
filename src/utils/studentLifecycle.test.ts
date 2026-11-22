import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_SCHOOLS, INITIAL_STUDENTS, INITIAL_STUDENT_CHANGE_REQUESTS } from '../data/mockData';
import {
  STANDARD_CLASSES,
  applyStudentAllowedSelfPatch,
  applyStudentEdit,
  applyStudentTransfer,
  canRolePerformStudentAction,
  computeClassBreakdown,
  computeGeoStudentBreakdown,
  computeSchoolStudentBreakdown,
  computeStudentSummaryCounts,
  executeStudentStatusChange,
  filterAdminStudents,
  getVisibleStudentsForRole,
  processStudentChangeRequest,
  verifyStudentDocument,
} from './studentLifecycle';

test('computeStudentSummaryCounts accurately totals Boys, Girls, Pending, Active, and Suspended students', () => {
  const summary = computeStudentSummaryCounts(INITIAL_STUDENTS, INITIAL_STUDENT_CHANGE_REQUESTS);
  assert.equal(summary.total, INITIAL_STUDENTS.length);
  assert.equal(summary.boys + summary.girls, summary.total);
  assert.ok(summary.boys > 0 && summary.girls > 0);
  assert.ok(summary.pending >= 1);
  assert.ok(summary.suspended >= 1);
  assert.equal(summary.pendingRequestsCount, 3);
});

test('computeClassBreakdown covers all 11 classes Pre-Primary through Class 10 with Boys/Girls/Total consistency', () => {
  const rows = computeClassBreakdown(INITIAL_STUDENTS, INITIAL_SCHOOLS);
  assert.equal(rows.length, STANDARD_CLASSES.length);
  assert.equal(rows[0].className, 'Pre-Primary');
  assert.equal(rows[rows.length - 1].className, 'Class 10');
  for (const r of rows) {
    assert.equal(r.boys + r.girls, r.total);
  }
  const activeNonRejected = INITIAL_STUDENTS.filter(
    (s) => s.status !== 'deactivated' && s.status !== 'rejected'
  );
  const summed = rows.reduce((sum, r) => sum + r.total, 0);
  assert.equal(summed, activeNonRejected.length);
});

test('computeSchoolStudentBreakdown and computeGeoStudentBreakdown match active student totals', () => {
  const schoolRows = computeSchoolStudentBreakdown(INITIAL_STUDENTS, INITIAL_SCHOOLS);
  const geoRows = computeGeoStudentBreakdown(INITIAL_STUDENTS, INITIAL_SCHOOLS);

  const schoolSum = schoolRows.reduce((s, r) => s + r.total, 0);
  const geoSum = geoRows.reduce((s, r) => s + r.total, 0);
  assert.equal(schoolSum, geoSum);
  assert.ok(geoRows.some((g) => g.division === 'ঢাকা' && g.district === 'ঢাকা'));
  assert.ok(geoRows.some((g) => g.division === 'চট্টগ্রাম'));
});

test('filterAdminStudents filters by division, schoolId, gender, className, and search text', () => {
  const dhakaGirls = filterAdminStudents(INITIAL_STUDENTS, INITIAL_SCHOOLS, {
    division: 'ঢাকা',
    gender: 'Female',
  });
  assert.ok(dhakaGirls.length >= 2);
  assert.ok(dhakaGirls.every((s) => s.gender === 'Female'));

  const byId = filterAdminStudents(INITIAL_STUDENTS, INITIAL_SCHOOLS, {
    search: 'STD-2026-GPS1042-0012',
  });
  assert.equal(byId.length, 1);
  assert.equal(byId[0].id, 'stu-rahim');
});

test('Central Admin cannot approve new student registrations, whereas School Admin can approve and verify documents', () => {
  const regReq = INITIAL_STUDENT_CHANGE_REQUESTS.find((r) => r.category === 'new_registration')!;
  const pendingStu = INITIAL_STUDENTS.find((s) => s.id === regReq.studentId)!;

  const centralAttempt = processStudentChangeRequest(
    regReq,
    pendingStu,
    INITIAL_SCHOOLS,
    'approved',
    'Attempt',
    'Central Admin',
    'central_admin',
    '2026-11-17'
  );
  assert.equal(centralAttempt.allowed, false);

  const verifiedStu = verifyStudentDocument(
    pendingStu,
    pendingStu.documents![0].id,
    true,
    'বেগম ফাতেমা খাতুন (School Admin)',
    '2026-11-17'
  );
  assert.equal(verifiedStu.documents![0].verified, true);

  const schoolAttempt = processStudentChangeRequest(
    regReq,
    verifiedStu,
    INITIAL_SCHOOLS,
    'approved',
    'ডকুমেন্ট যাচাই সম্পন্ন',
    'বেগম ফাতেমা খাতুন (School Admin)',
    'school_admin',
    '2026-11-17'
  );
  assert.equal(schoolAttempt.allowed, true);
  assert.equal(schoolAttempt.updatedStudent.status, 'active');
  assert.equal(schoolAttempt.updatedRequest.status, 'approved');
});

test('Important profile change approval updates target field and school transfer preserves permanentId & history', () => {
  const changeReq = INITIAL_STUDENT_CHANGE_REQUESTS.find((r) => r.category === 'important_profile_change')!;
  const rahim = INITIAL_STUDENTS.find((s) => s.id === changeReq.studentId)!;

  const approvedChange = processStudentChangeRequest(
    changeReq,
    rahim,
    INITIAL_SCHOOLS,
    'approved',
    'Birth Reg verified',
    'Central Admin',
    'central_admin',
    '2026-11-17'
  );
  assert.equal(approvedChange.allowed, true);
  assert.equal(approvedChange.updatedStudent.nameEn, 'Md. Raheem Uddin');

  const transferTarget = INITIAL_SCHOOLS.find((s) => s.id === 'NBD-3012')!;
  const { updatedStudent: transferred } = applyStudentTransfer(
    approvedChange.updatedStudent,
    transferTarget,
    'অভিভাবকের বদলি',
    'Central Admin',
    '2026-11-17'
  );
  assert.equal(transferred.permanentId, rahim.permanentId);
  assert.equal(transferred.schoolId, 'NBD-3012');
  assert.ok(transferred.previousSchools?.some((p) => p.includes('GPS-1042')));
});

test('applyStudentEdit and executeStudentStatusChange handle edit, suspend, and permanent deactivate', () => {
  const stu = INITIAL_STUDENTS[0];
  const { updatedStudent } = applyStudentEdit(
    stu,
    {
      nameBn: stu.nameBn,
      nameEn: stu.nameEn,
      gender: stu.gender,
      dob: stu.dob,
      birthRegNo: stu.birthRegNo,
      fatherName: stu.fatherName,
      motherName: stu.motherName,
      guardianMobile: '01700000001',
      bloodGroup: 'B+',
      className: 'Class 5',
      section: 'ক (A)',
      roll: 1,
      reason: 'Promotion correction',
    },
    'Central Admin',
    '2026-11-17'
  );
  assert.equal(updatedStudent.guardianMobile, '01700000001');
  assert.equal(updatedStudent.className, 'Class 5');

  const suspended = executeStudentStatusChange(updatedStudent, 'suspended', 'Conduct review', 'Central Admin', '2026-11-17');
  assert.equal(suspended.status, 'suspended');
  assert.equal(suspended.suspensionReason, 'Conduct review');

  const deactivated = executeStudentStatusChange(suspended, 'deactivated', 'Moved abroad permanently', 'Central Admin', '2026-11-17');
  assert.equal(deactivated.status, 'deactivated');
  assert.equal(deactivated.deactivationReason, 'Moved abroad permanently');
});

test('Strict Student RBAC blocks viewing/editing other students, admits/approvals/transfers/suspensions, and ignores restricted self-patch fields', () => {
  assert.equal(canRolePerformStudentAction('student', 'view_student', 'stu-rahim', 'stu-rahim'), true);
  assert.equal(canRolePerformStudentAction('student', 'view_student', 'stu-karim', 'stu-rahim'), false);
  assert.equal(canRolePerformStudentAction('student', 'self_update_allowed', 'stu-rahim', 'stu-rahim'), true);
  assert.equal(canRolePerformStudentAction('student', 'request_important_change', 'stu-rahim', 'stu-rahim'), true);

  for (const forbidden of [
    'admit_student',
    'approve_registration',
    'edit_student_admin',
    'transfer_student',
    'suspend_student',
    'deactivate_student',
    'view_audit_history',
    'send_notice',
  ] as const) {
    assert.equal(canRolePerformStudentAction('student', forbidden, 'stu-rahim', 'stu-rahim'), false);
  }

  assert.equal(canRolePerformStudentAction('central_admin', 'admit_student'), false);
  assert.equal(canRolePerformStudentAction('central_admin', 'approve_registration'), false);
  assert.equal(canRolePerformStudentAction('central_admin', 'transfer_student'), true);
  assert.equal(canRolePerformStudentAction('school_admin', 'admit_student', 'stu-rahim', undefined, 'GPS-1042', 'GPS-1042'), true);
  assert.equal(canRolePerformStudentAction('school_admin', 'view_student', 'stu-dhs-8', undefined, 'DHS-2019', 'GPS-1042'), false);

  const visibleToStudent = getVisibleStudentsForRole(INITIAL_STUDENTS, 'student', 'GPS-1042', 'stu-rahim');
  assert.equal(visibleToStudent.length, 1);
  assert.equal(visibleToStudent[0].id, 'stu-rahim');

  const patched = applyStudentAllowedSelfPatch(INITIAL_STUDENTS[0], {
    emergencyContact: '01999888777',
    address: 'নতুন বাসা, মিরপুর ১২',
    nameEn: 'Hacked Name',
    className: 'Class 10',
    status: 'suspended',
    permanentId: 'FAKE-ID',
  });
  assert.equal(patched.emergencyContact, '01999888777');
  assert.equal(patched.address, 'নতুন বাসা, মিরপুর ১২');
  assert.equal(patched.nameEn, INITIAL_STUDENTS[0].nameEn);
  assert.equal(patched.className, INITIAL_STUDENTS[0].className);
  assert.equal(patched.permanentId, INITIAL_STUDENTS[0].permanentId);
});
