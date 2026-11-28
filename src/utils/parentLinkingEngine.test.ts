import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authenticateRegisteredParent,
  linkChildToParentAccount,
  registerParentAccount,
} from './parentLinkingEngine';
import {
  INITIAL_ADMIN_ACCOUNTS,
  INITIAL_SCHOOLS,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
} from './testFixtures';

test('registerParentAccount enforces uniqueness and supports multi-child linking by School Code & Student ID', () => {
  const reg = registerParentAccount({
    name: 'মোঃ রফিকুল হক',
    username: 'parent_rafiq',
    uniqueIdCode: 'PAR-2026-01',
    mobile: '01811223344',
    gender: 'Male',
    password: 'password123',
    existingParents: [],
    schools: INITIAL_SCHOOLS,
    teachers: INITIAL_TEACHERS,
    admins: INITIAL_ADMIN_ACCOUNTS,
    students: INITIAL_STUDENTS,
  });

  assert.equal(reg.ok, true);
  assert.ok(reg.parent);
  assert.equal(reg.parent.linkedChildIds.length, 0);

  // Link first child
  const firstStudent = INITIAL_STUDENTS[0];
  const link1 = linkChildToParentAccount({
    parentAccount: reg.parent!,
    schoolQuery: firstStudent.schoolId,
    studentQuery: firstStudent.permanentId,
    schools: INITIAL_SCHOOLS,
    students: reg.updatedStudents!,
  });
  assert.equal(link1.ok, true);
  assert.equal(link1.parent!.linkedChildIds.length, 1);

  // Duplicate link is rejected cleanly
  const dupLink = linkChildToParentAccount({
    parentAccount: link1.parent!,
    schoolQuery: firstStudent.schoolId,
    studentQuery: firstStudent.permanentId,
    schools: INITIAL_SCHOOLS,
    students: link1.students!,
  });
  assert.equal(dupLink.ok, false);
  assert.equal(dupLink.code, 'already_linked');

  // Link a second different child from same/another school
  const secondStudent = INITIAL_STUDENTS.find((s) => s.id !== firstStudent.id)!;
  const link2 = linkChildToParentAccount({
    parentAccount: link1.parent!,
    schoolQuery: secondStudent.schoolId,
    studentQuery: secondStudent.permanentId,
    schools: INITIAL_SCHOOLS,
    students: link1.students!,
  });
  assert.equal(link2.ok, true);
  assert.equal(link2.parent!.linkedChildIds.length, 2);

  // Authenticate registered Parent account and verify both children resolve
  const authRes = authenticateRegisteredParent(
    [link2.parent!],
    link2.students!,
    'parent_rafiq',
    'password123'
  );
  assert.equal(authRes.ok, true);
  assert.equal(authRes.linkedStudentIds.length, 2);
});
