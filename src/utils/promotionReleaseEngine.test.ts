import test from 'node:test';
import assert from 'node:assert/strict';
import {
  executeBulkClassPromotion,
  executeBulkClassRelease,
  getNextClassName,
} from './promotionReleaseEngine';
import { INITIAL_STUDENTS } from './testFixtures';

test('getNextClassName maps primary & secondary progression accurately', () => {
  assert.equal(getNextClassName('Class 4'), 'Class 5');
  assert.equal(getNextClassName('Class 10'), 'Graduated (SSC Complete)');
});

test('executeBulkClassPromotion preserves previous year snapshot and promotes selected students without deleting data', () => {
  const schoolId = INITIAL_STUDENTS[0].schoolId;
  const class4Students = INITIAL_STUDENTS.filter(
    (s) => s.schoolId === schoolId && s.className === INITIAL_STUDENTS[0].className
  );
  const targetIds = class4Students.map((s) => s.id);

  const promoted = executeBulkClassPromotion({
    students: INITIAL_STUDENTS,
    studentIds: targetIds,
    schoolId,
    sourceAcademicYear: '2026',
    targetAcademicYear: '2027',
    sourceClassName: INITIAL_STUDENTS[0].className,
    targetClassName: getNextClassName(INITIAL_STUDENTS[0].className),
    actorName: 'Head Teacher',
  });

  assert.equal(promoted.ok, true);
  assert.equal(promoted.promotedCount, targetIds.length);
  assert.equal(promoted.students.length, INITIAL_STUDENTS.length);
  const firstUpdated = promoted.students.find((s) => s.id === targetIds[0])!;
  assert.equal(firstUpdated.academicYear, '2027');
  assert.equal(firstUpdated.enrollmentStatus, 'promoted');
  assert.equal(firstUpdated.academicSnapshots?.length, 1);
  assert.equal(firstUpdated.academicSnapshots?.[0].academicYear, '2026');
  assert.equal(firstUpdated.academicSnapshots?.[0].statusAtClose, 'promoted');
  assert.ok(promoted.historyEntry);
  assert.equal(promoted.historyEntry!.actionType, 'promote');
});

test('executeBulkClassRelease sets enrollmentStatus=released and preserves all student records', () => {
  const target = INITIAL_STUDENTS[0];
  const released = executeBulkClassRelease({
    students: INITIAL_STUDENTS,
    studentIds: [target.id],
    schoolId: target.schoolId,
    sourceAcademicYear: '2026',
    sourceClassName: target.className,
    actorName: 'Head Teacher',
    note: 'Class completion release',
  });

  assert.equal(released.ok, true);
  assert.equal(released.releasedCount, 1);
  assert.equal(released.students.length, INITIAL_STUDENTS.length);
  const updated = released.students.find((s) => s.id === target.id)!;
  assert.equal(updated.enrollmentStatus, 'released');
  assert.equal(updated.academicSnapshots?.[0].statusAtClose, 'released');
  assert.equal(released.historyEntry?.actionType, 'release');
});
