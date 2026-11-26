import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCascadeDeletePlan,
  buildFirestoreActivityLogPayload,
  buildFirestoreAttendancePayload,
  buildFirestoreExamPayload,
  buildFirestoreMediaAssetPayload,
  buildFirestoreResultPayload,
  buildFirestoreSchoolPayload,
  buildFirestoreStudentPayload,
  buildFirestoreTeacherPayload,
  buildStorageObjectPath,
  evaluateAppCheckConfig,
  isAccountLoginBlocked,
  MAX_SPARK_INLINE_BYTES,
  resolveApprovalTransition,
  sanitizeFirestoreId,
  validateStorageUploadCandidate,
} from './firebaseDataSync';

test('isAccountLoginBlocked rejects rejected, suspended, deactivated, and isActive=false accounts', () => {
  assert.equal(isAccountLoginBlocked({ status: 'active', isActive: true }).blocked, false);
  assert.equal(isAccountLoginBlocked({ status: 'pending', isActive: false }).blocked, true);
  assert.equal(isAccountLoginBlocked({ status: 'suspended', isActive: true }).blocked, true);
  assert.equal(isAccountLoginBlocked({ status: 'rejected', isActive: true }).blocked, true);
  assert.equal(isAccountLoginBlocked({ status: 'deactivated', isActive: true }).blocked, true);
});

test('resolveApprovalTransition enforces pending -> active/rejected/deactivated transitions cleanly', () => {
  const approved = resolveApprovalTransition({
    decision: 'approve',
    requestedRole: 'school_admin',
    schoolId: 'sch-101',
  });
  assert.equal(approved.nextUserStatus, 'active');
  assert.equal(approved.nextApplicationStatus, 'approved');
  assert.equal(approved.nextIsActive, true);
  assert.equal(approved.assignedRole, 'school_admin');
  assert.equal(approved.assignedSchoolId, 'sch-101');

  const rejected = resolveApprovalTransition({
    decision: 'reject',
    requestedRole: 'teacher',
    schoolId: 'sch-101',
  });
  assert.equal(rejected.nextUserStatus, 'rejected');
  assert.equal(rejected.nextApplicationStatus, 'rejected');
  assert.equal(rejected.nextIsActive, false);
  assert.equal(rejected.assignedRole, 'pending');

  const deactivated = resolveApprovalTransition({
    decision: 'deactivate',
    requestedRole: 'student',
  });
  assert.equal(deactivated.nextUserStatus, 'deactivated');
  assert.equal(deactivated.nextIsActive, false);
});

test('Firestore payload builders sanitize IDs, bound strings, and enforce valid enums', () => {
  assert.equal(sanitizeFirestoreId('../evil/path?id=1'), 'evil_path_id_1');

  const school = buildFirestoreSchoolPayload(
    {
      id: 'sch/1',
      code: 'GPS-1042',
      eiin: '104200',
      nameBn: 'ক'.repeat(250),
      nameEn: 'Model School',
      schoolType: 'PRIMARY',
      mobile: '01711111111',
      email: 'sch@psms.bd',
      cluster: 'C1',
      division: 'Dhaka',
      district: 'Dhaka',
      upazila: 'Savar',
      union: 'U1',
      village: 'V1',
      fullAddress: 'Addr',
      addressSource: 'AUTOMATIC',
      headTeacher: 'Head',
      adminUsername: 'sch1',
      studentCount: 100,
      teacherCount: 10,
      classRange: '1-5',
      approvedClasses: ['Class 1'],
      academicYear: '2026',
      status: 'approved',
      registrationMethod: 'ONLINE',
      documents: [],
      verifiedDate: '2026-11-17',
      attendanceRate: 95,
    },
    'owner_1'
  );
  assert.equal(school.schoolId, 'sch_1');
  assert.equal(school.nameBn.length, 200);
  assert.equal(school.status, 'active');

  const teacher = buildFirestoreTeacherPayload(
    {
      id: 'tch-9',
      teacherCode: 'TCH-9',
      schoolId: 'sch-1',
      schoolNameBn: 'School',
      nameBn: 'Teacher Bn',
      nameEn: 'Teacher En',
      designation: 'Assistant Teacher',
      qualification: 'MSc',
      joiningDate: '2022-01-01',
      subjects: ['Math'],
      assignedClasses: ['Class 5'],
      mobile: '01712345678',
      status: 'active',
      performanceScore: 95,
    },
    'uid-1'
  );
  assert.equal(teacher.isActive, true);
  assert.equal(teacher.teacherId, 'tch-9');

  const student = buildFirestoreStudentPayload(
    {
      id: 'stu-9',
      permanentId: 'STU-9',
      activationCode: 'ACT-9',
      guardianLinkCode: 'GL-9',
      schoolId: 'sch-1',
      schoolNameBn: 'School',
      nameBn: 'Student Bn',
      nameEn: 'Student En',
      dob: '2015-01-01',
      birthRegNo: '123456',
      gender: 'Male',
      fatherName: 'Father',
      motherName: 'Mother',
      guardianMobile: '01712345678',
      bloodGroup: 'A+',
      className: 'Class 5',
      section: 'A',
      roll: 0,
      status: 'pending',
      attendancePct: 90,
      heightCm: 140,
      weightKg: 35,
      stipendStatus: 'pending',
      admissionHistory: [],
    },
    'uid-1'
  );
  assert.equal(student.roll, 1);
  assert.equal(student.isActive, false);

  const att = buildFirestoreAttendancePayload(
    {
      id: 'att-1',
      studentId: 'stu-9',
      schoolId: 'sch-1',
      dateIso: '2026-11-26',
      status: 'present',
      source: 'kiosk',
      guardianNotified: true,
    },
    'teacher-uid'
  );
  assert.equal(att.status, 'present');

  const exam = buildFirestoreExamPayload(
    {
      id: 'exm-1',
      schoolId: 'sch-1',
      titleBn: 'বার্ষিক পরীক্ষা',
      titleEn: 'Annual Exam',
      className: 'Class 5',
      dateRange: '2026-11-20',
      status: 'published',
      centralPublished: true,
      fullMarks: 100,
      entries: [],
    },
    'admin-uid'
  );
  assert.equal(exam.centralPublished, true);

  const result = buildFirestoreResultPayload(
    'exm-1',
    'sch-1',
    {
      studentId: 'stu-9',
      studentName: 'Student Bn',
      roll: 1,
      subjectBn: 'গণিত',
      subjectEn: 'Mathematics',
      written: 65,
      mcq: 15,
      oral: 5,
      continuous: 5,
      fullMarks: 100,
      passMarks: 33,
    },
    'teacher-uid'
  );
  assert.equal(result.totalMarks, 90);
  assert.equal(result.passed, true);

  const log = buildFirestoreActivityLogPayload({
    actorUid: 'admin-uid',
    actorRole: 'central_admin',
    actionType: 'APPROVE_USER',
    targetType: 'user',
    targetId: 'u-12',
    summary: 'Approved user role teacher',
    schoolId: 'sch-1',
  });
  assert.equal(log.targetType, 'user');

  const mediaPayload = buildFirestoreMediaAssetPayload({
    assetId: 'profile/uid-1',
    ownerUid: 'uid-1',
    category: 'profile_photos',
    scopeId: 'sch/1',
    fileName: 'avatar.webp',
    mimeType: 'image/webp',
    sizeBytes: 120000,
    dataUrl: 'data:image/webp;base64,AAAA',
  });
  assert.equal(mediaPayload.assetId, 'profile_uid-1');
  assert.equal(mediaPayload.scopeId, 'sch_1');
});

test('Spark Free Plan media validator enforces MIME allowlists, 450KB PDF limit, and safe paths', () => {
  assert.equal(validateStorageUploadCandidate('image/jpeg', 1024 * 500, 'profile_photos').valid, true);
  assert.equal(validateStorageUploadCandidate('application/x-msdownload', 1024, 'profile_photos').valid, false);
  assert.equal(validateStorageUploadCandidate('image/png', 11 * 1024 * 1024, 'profile_photos').valid, false);
  assert.equal(validateStorageUploadCandidate('application/pdf', 300 * 1024, 'documents').valid, true);
  assert.equal(
    validateStorageUploadCandidate('application/pdf', MAX_SPARK_INLINE_BYTES + 1024, 'documents').valid,
    false
  );

  const path = buildStorageObjectPath('profile_photos', 'uid/123', '../../avatar photo.png');
  assert.ok(path.startsWith('profile_photos/uid_123/'));
  assert.ok(path.endsWith('.png'));
});

test('evaluateAppCheckConfig reports recaptcha_v3, debug_token, or unconfigured accurately', () => {
  assert.equal(evaluateAppCheckConfig('', '').configured, false);
  assert.equal(evaluateAppCheckConfig('6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI', '').mode, 'recaptcha_v3');
  assert.equal(evaluateAppCheckConfig('', 'debug-123').mode, 'debug_token');
});

test('buildCascadeDeletePlan includes Firestore, RTDB, and Spark media scopes without Blaze Storage', () => {
  const userPlan = buildCascadeDeletePlan('user', 'uid-abc');
  assert.ok(userPlan.firestoreDocPaths.includes('users/uid-abc'));
  assert.ok(userPlan.rtdbPaths.includes('account_snapshots/uid-abc'));
  assert.ok(userPlan.mediaAssetScopes.includes('uid-abc'));

  const schoolPlan = buildCascadeDeletePlan('school', 'sch-101');
  assert.ok(schoolPlan.firestoreDocPaths.includes('schools/sch-101'));
  assert.ok(schoolPlan.rtdbPaths.includes('schools/sch-101'));
  assert.ok(schoolPlan.mediaAssetScopes.includes('sch-101'));
});
