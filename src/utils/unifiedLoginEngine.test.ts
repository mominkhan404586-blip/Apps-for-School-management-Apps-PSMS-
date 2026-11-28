import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_APPROVAL_REQUESTS,
  INITIAL_SCHOOLS,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
} from './testFixtures';
import { BOOT_ADMIN_EMAIL } from './authGuard';
import {
  buildPasswordOverrideKey,
  lookupRegistrationApprovalStatus,
  resolveUnifiedPortalLogin,
  validateLoginIdentifierRealtime,
  validatePasswordChangeInput,
} from './unifiedLoginEngine';

test('resolveUnifiedPortalLogin routes Super Admin Gmail and email accounts to Firebase Auth', () => {
  const adminRes = resolveUnifiedPortalLogin({
    identifier: BOOT_ADMIN_EMAIL,
    password: 'any-password',
    schools: INITIAL_SCHOOLS,
    teachers: INITIAL_TEACHERS,
    students: INITIAL_STUDENTS,
  });
  assert.equal(adminRes.kind, 'firebase_email');

  const genericEmailRes = resolveUnifiedPortalLogin({
    identifier: 'principal.new@example.com',
    password: 'secret',
    schools: INITIAL_SCHOOLS,
    teachers: INITIAL_TEACHERS,
    students: INITIAL_STUDENTS,
  });
  assert.equal(genericEmailRes.kind, 'firebase_email');
});

test('resolveUnifiedPortalLogin authenticates School Admin, Teacher, and Parent while blocking Student login', () => {
  const schoolRes = resolveUnifiedPortalLogin({
    identifier: 'SCH-2026-00015',
    password: 'school@123',
    schools: INITIAL_SCHOOLS,
    teachers: INITIAL_TEACHERS,
    students: INITIAL_STUDENTS,
  });
  assert.equal(schoolRes.kind, 'portal_authenticated');
  if (schoolRes.kind === 'portal_authenticated') {
    assert.equal(schoolRes.role, 'school_admin');
    assert.equal(schoolRes.schoolId, 'GPS-1042');
  }

  const teacherRes = resolveUnifiedPortalLogin({
    identifier: 'TCH-GPS1042-02',
    password: 'teacher@123',
    schools: INITIAL_SCHOOLS,
    teachers: INITIAL_TEACHERS,
    students: INITIAL_STUDENTS,
  });
  assert.equal(teacherRes.kind, 'portal_authenticated');
  if (teacherRes.kind === 'portal_authenticated') {
    assert.equal(teacherRes.role, 'teacher');
    assert.equal(teacherRes.teacherId, 'tch-2');
  }

  // Student IDs must NOT authenticate as a student login; parents access student info via Parent portal
  const studentBlockedRes = resolveUnifiedPortalLogin({
    identifier: 'STD-2026-GPS1042-0012',
    password: '01712345678',
    schools: INITIAL_SCHOOLS,
    teachers: INITIAL_TEACHERS,
    students: INITIAL_STUDENTS,
  });
  assert.equal(studentBlockedRes.kind, 'error');

  const guardianRes = resolveUnifiedPortalLogin({
    identifier: '01712345678',
    password: 'parent@123',
    schools: INITIAL_SCHOOLS,
    teachers: INITIAL_TEACHERS,
    students: INITIAL_STUDENTS,
  });
  assert.equal(guardianRes.kind, 'portal_authenticated');
  if (guardianRes.kind === 'portal_authenticated') {
    assert.equal(guardianRes.role, 'guardian');
  }
});

test('resolveUnifiedPortalLogin honors passwordOverrides after password change', () => {
  const overrides = {
    [buildPasswordOverrideKey('teacher', 'tch-2')]: 'newpass@2026',
  };

  const oldFail = resolveUnifiedPortalLogin({
    identifier: 'TCH-GPS1042-02',
    password: 'teacher@123',
    schools: INITIAL_SCHOOLS,
    teachers: INITIAL_TEACHERS,
    students: INITIAL_STUDENTS,
    passwordOverrides: overrides,
  });
  assert.equal(oldFail.kind, 'error');

  const newOk = resolveUnifiedPortalLogin({
    identifier: 'TCH-GPS1042-02',
    password: 'newpass@2026',
    schools: INITIAL_SCHOOLS,
    teachers: INITIAL_TEACHERS,
    students: INITIAL_STUDENTS,
    passwordOverrides: overrides,
  });
  assert.equal(newOk.kind, 'portal_authenticated');
});

test('validatePasswordChangeInput validates mismatches, weak passwords, and identical passwords', () => {
  const mismatch = validatePasswordChangeInput({
    identifier: 'tch_rahim',
    currentPassword: 'teacher@123',
    newPassword: 'newpassword1',
    confirmPassword: 'newpassword2',
  });
  assert.equal(mismatch.ok, false);

  const shortPass = validatePasswordChangeInput({
    identifier: 'tch_rahim',
    currentPassword: 'teacher@123',
    newPassword: '123',
    confirmPassword: '123',
  });
  assert.equal(shortPass.ok, false);

  const valid = validatePasswordChangeInput({
    identifier: 'tch_rahim',
    currentPassword: 'teacher@123',
    newPassword: 'teacher@2026',
    confirmPassword: 'teacher@2026',
  });
  assert.equal(valid.ok, true);
});

test('validateLoginIdentifierRealtime validates emails, mobile numbers, and usernames in real time', () => {
  assert.equal(validateLoginIdentifierRealtime('').kind, 'empty');
  assert.equal(validateLoginIdentifierRealtime('bad@').valid, false);
  assert.equal(validateLoginIdentifierRealtime('bad@').kind, 'invalid_email');
  assert.equal(validateLoginIdentifierRealtime('teacher@school.edu.bd').valid, true);
  assert.equal(validateLoginIdentifierRealtime('teacher@school.edu.bd').kind, 'email');

  assert.equal(validateLoginIdentifierRealtime('01712').valid, false);
  assert.equal(validateLoginIdentifierRealtime('01712').kind, 'invalid_phone');
  assert.equal(validateLoginIdentifierRealtime('01712345678').valid, true);
  assert.equal(validateLoginIdentifierRealtime('01712345678').kind, 'phone');

  assert.equal(validateLoginIdentifierRealtime('ab').valid, false);
  assert.equal(validateLoginIdentifierRealtime('ab').kind, 'too_short');
  assert.equal(validateLoginIdentifierRealtime('tch_rahim').valid, true);
  assert.equal(validateLoginIdentifierRealtime('tch_rahim').kind, 'code_or_username');
});

test('lookupRegistrationApprovalStatus checks school, teacher, and student registrations accurately', () => {
  const schoolCheck = lookupRegistrationApprovalStatus({
    category: 'school',
    query: 'GPS-1042',
    schools: INITIAL_SCHOOLS,
    requests: INITIAL_APPROVAL_REQUESTS,
    teachers: INITIAL_TEACHERS,
    students: INITIAL_STUDENTS,
  });
  assert.ok(schoolCheck);
  assert.equal(schoolCheck.category, 'school');
  assert.equal(schoolCheck.stepIndex, 4);

  const teacherCheck = lookupRegistrationApprovalStatus({
    category: 'teacher',
    query: 'TCH-GPS1042-02',
    schools: INITIAL_SCHOOLS,
    requests: INITIAL_APPROVAL_REQUESTS,
    teachers: INITIAL_TEACHERS,
    students: INITIAL_STUDENTS,
  });
  assert.ok(teacherCheck);
  assert.equal(teacherCheck.category, 'teacher');

  const studentCheck = lookupRegistrationApprovalStatus({
    category: 'student',
    query: 'STD-2026-GPS1042-0012',
    schools: INITIAL_SCHOOLS,
    requests: INITIAL_APPROVAL_REQUESTS,
    teachers: INITIAL_TEACHERS,
    students: INITIAL_STUDENTS,
  });
  assert.ok(studentCheck);
  assert.equal(studentCheck.category, 'student');

  const missingCheck = lookupRegistrationApprovalStatus({
    category: 'student',
    query: 'NON-EXISTENT-ID-999',
    schools: INITIAL_SCHOOLS,
    requests: INITIAL_APPROVAL_REQUESTS,
    teachers: INITIAL_TEACHERS,
    students: INITIAL_STUDENTS,
  });
  assert.equal(missingCheck, null);
});
