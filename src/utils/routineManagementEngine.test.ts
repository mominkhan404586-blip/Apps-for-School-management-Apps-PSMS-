import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStudentPublishedRoutineView,
  buildTeacherPersonalRoutineView,
  checkAndExpireTemporaryRoutines,
  computeDurationMinutes,
  createNewMasterRoutine,
  detectRoutineCellConflicts,
  exportRoutineToCsv,
  extendTemporaryRoutine,
  getAssignedTeachersForClassSubject,
  parseTimeToMinutes,
  publishOrActivateRoutine,
  reactivateRoutine,
  restoreRoutineVersion,
  saveRoutineWithVersioning,
  upsertRoutineCell,
} from './routineManagementEngine';
import { INITIAL_MASTER_ROUTINES } from './testFixtures';
import { INITIAL_TEACHERS } from './testFixtures';
import { INITIAL_TEACHER_ASSIGNMENTS } from './testFixtures';

test('parseTimeToMinutes & computeDurationMinutes handle 24h and invalid times', () => {
  assert.equal(parseTimeToMinutes('09:30'), 570);
  assert.equal(parseTimeToMinutes('01:15 PM'), 795);
  assert.equal(computeDurationMinutes('09:30', '10:15'), 45);
  assert.equal(computeDurationMinutes('10:30', '09:30'), 0);
});

test('getAssignedTeachersForClassSubject filters teachers connected to Teaching Assignments', () => {
  const res = getAssignedTeachersForClassSubject(
    INITIAL_TEACHER_ASSIGNMENTS,
    INITIAL_TEACHERS,
    'GPS-1042',
    'Class 4',
    'ক (A)',
    'Mathematics'
  );
  assert.equal(res.assigned.length, 1);
  assert.equal(res.assigned[0].id, 'tch-2');
});

test('detectRoutineCellConflicts catches missing fields, invalid time, duplicate, teacher, class & room conflicts', () => {
  const base = INITIAL_MASTER_ROUTINES[0];

  // Missing subject, teacher, invalid time
  const invalidConflicts = detectRoutineCellConflicts(
    {
      dayId: 'day-thu',
      periodId: 'prd-2',
      className: 'Class 4',
      section: 'ক (A)',
      subjectBn: '',
      subjectEn: '',
      teacherId: '',
      teacherName: '',
      room: '204',
      startTime: '11:00',
      endTime: '10:00',
    },
    base,
    INITIAL_MASTER_ROUTINES
  );
  const kinds = new Set(invalidConflicts.map((c) => c.kind));
  assert.equal(kinds.has('missing_subject'), true);
  assert.equal(kinds.has('missing_teacher'), true);
  assert.equal(kinds.has('invalid_time'), true);

  // Teacher conflict across Class 5 routine on Sunday Period 5 (Rahim Sir busy in Class 5 Room 205)
  const crossTeacherConflict = detectRoutineCellConflicts(
    {
      dayId: 'day-sun',
      periodId: 'prd-5',
      className: 'Class 4',
      section: 'ক (A)',
      subjectBn: 'গণিত',
      subjectEn: 'Mathematics',
      teacherId: 'tch-2',
      teacherName: 'মোঃ আব্দুর রহিম (Rahim Sir)',
      room: '204',
      startTime: '13:15',
      endTime: '14:00',
    },
    base,
    INITIAL_MASTER_ROUTINES
  );
  assert.equal(
    crossTeacherConflict.some((c) => c.kind === 'teacher_conflict'),
    true
  );

  // Room conflict (Room 205 occupied in Class 5 on Sunday Period 5)
  const roomConflict = detectRoutineCellConflicts(
    {
      dayId: 'day-sun',
      periodId: 'prd-5',
      className: 'Class 4',
      section: 'ক (A)',
      subjectBn: 'ইংরেজি',
      subjectEn: 'English',
      teacherId: 'tch-3',
      teacherName: 'সুমাইয়া পারভীন',
      room: '205',
      startTime: '13:15',
      endTime: '14:00',
    },
    base,
    INITIAL_MASTER_ROUTINES
  );
  assert.equal(
    roomConflict.some((c) => c.kind === 'room_conflict'),
    true
  );

  // Duplicate schedule on Sunday Period 1 in Class 4 (ক (A))
  const dupConflict = detectRoutineCellConflicts(
    {
      dayId: 'day-sun',
      periodId: 'prd-1',
      className: 'Class 4',
      section: 'ক (A)',
      subjectBn: 'বিজ্ঞান',
      subjectEn: 'Science',
      teacherId: 'tch-4',
      teacherName: 'তানজিনা আক্তার',
      room: '206',
      startTime: '09:30',
      endTime: '10:15',
    },
    base,
    INITIAL_MASTER_ROUTINES
  );
  assert.equal(
    dupConflict.some((c) => c.kind === 'duplicate_schedule'),
    true
  );
});

test('Draft routine stays hidden from Student View until Published/Activated', () => {
  // Draft routine alone must return undefined for student view
  const draftOnly = INITIAL_MASTER_ROUTINES.filter((r) => r.status === 'Draft');
  const hiddenStudent = buildStudentPublishedRoutineView(
    draftOnly,
    'GPS-1042',
    'Class 4',
    'ক (A)'
  );
  assert.equal(hiddenStudent, undefined);

  // Publish draft -> Student immediately sees it
  const pubRes = publishOrActivateRoutine(draftOnly, 'mrout-gps-c4a-draft', {
    actorName: 'School Admin',
    isTemporary: true,
    startDate: '2026-11-19',
    endDate: '2026-11-30',
  });
  assert.equal(pubRes.ok, true);
  const visibleStudent = buildStudentPublishedRoutineView(
    pubRes.routines,
    'GPS-1042',
    'Class 4',
    'ক (A)',
    '2026-11-20'
  );
  assert.equal(visibleStudent?.id, 'mrout-gps-c4a-draft');
});

test('Temporary routine auto-expires after endDate, restores previous active routine, and supports Extend & Reactivate', () => {
  const draft = createNewMasterRoutine({
    schoolId: 'GPS-1042',
    titleBn: 'বিশেষ পরীক্ষা পূর্ব প্রস্তুতি রুটিন',
    routineType: 'monthly',
    academicYear: '২০২৬ শিক্ষাবর্ষ',
    className: 'Class 4',
    section: 'ক (A)',
    createdBy: 'School Admin',
    isTemporary: true,
    startDate: '2026-11-10',
    endDate: '2026-11-18',
  });
  const withCell = upsertRoutineCell(draft, {
    dayId: 'day-thu',
    periodId: 'prd-3',
    className: 'Class 4',
    section: 'ক (A)',
    subjectBn: 'বাংলা',
    subjectEn: 'Bangla',
    teacherId: 'tch-1',
    teacherName: 'বেগম ফাতেমা খাতুন',
    room: '204',
    startTime: '11:15',
    endTime: '12:00',
  });

  const pub = publishOrActivateRoutine(
    [withCell, ...INITIAL_MASTER_ROUTINES],
    withCell.id,
    {
      actorName: 'School Admin',
      isTemporary: true,
      startDate: '2026-11-10',
      endDate: '2026-11-18',
    }
  );
  assert.equal(pub.ok, true);
  assert.equal(pub.publishedRoutine?.previousActiveRoutineId, 'mrout-gps-c4a-active');

  // Auto-expire on 2026-11-20
  const expired = checkAndExpireTemporaryRoutines(pub.routines, '2026-11-20');
  assert.equal(expired.expiredCount, 1);
  assert.equal(
    expired.routines.find((r) => r.id === withCell.id)?.status,
    'Expired'
  );
  // Previous routine automatically reactivated!
  assert.equal(
    expired.routines.find((r) => r.id === 'mrout-gps-c4a-active')?.status,
    'Active'
  );

  // Extend temporary routine to 2026-11-28
  const extended = extendTemporaryRoutine(
    expired.routines,
    withCell.id,
    '2026-11-28',
    'School Admin'
  );
  assert.equal(extended.find((r) => r.id === withCell.id)?.status, 'Active');
  assert.equal(extended.find((r) => r.id === withCell.id)?.endDate, '2026-11-28');

  // Reactivate older routine
  const reactivated = reactivateRoutine(
    extended,
    'mrout-gps-c4a-active',
    'School Admin'
  );
  assert.equal(
    reactivated.find((r) => r.id === 'mrout-gps-c4a-active')?.status,
    'Active'
  );
});

test('Routine Edit increments version cleanly and Restore Version reverts schedule', () => {
  const base = INITIAL_MASTER_ROUTINES[0]; // v2 with 11 schedules, v1 had 2 schedules
  const modified = upsertRoutineCell(base, {
    dayId: 'day-thu',
    periodId: 'prd-2',
    className: 'Class 4',
    section: 'ক (A)',
    subjectBn: 'বাংলা',
    subjectEn: 'Bangla',
    teacherId: 'tch-1',
    teacherName: 'বেগম ফাতেমা খাতুন',
    room: '204',
    startTime: '10:20',
    endTime: '11:05',
  });
  const saved = saveRoutineWithVersioning(
    INITIAL_MASTER_ROUTINES,
    modified,
    'School Admin',
    'Added Bangla on Thursday P2'
  );
  assert.equal(saved.savedRoutine.version, 3);
  assert.equal(saved.savedRoutine.schedules.length, 12);

  // Restore v1 (which had 2 schedules)
  const restored = restoreRoutineVersion(saved.routines, base.id, 1, 'School Admin');
  const target = restored.find((r) => r.id === base.id)!;
  assert.equal(target.version, 4);
  assert.equal(target.schedules.length, 2);
});

test('buildTeacherPersonalRoutineView aggregates only teacher assigned schedules & exportRoutineToCsv outputs table', () => {
  const teacherRoutine = buildTeacherPersonalRoutineView(
    INITIAL_MASTER_ROUTINES,
    'GPS-1042',
    'tch-2',
    '2026-11-20'
  );
  assert.ok(teacherRoutine.slots.length >= 6);
  assert.equal(teacherRoutine.slots.every((s) => s.teacherId === 'tch-2'), true);

  const csv = exportRoutineToCsv(INITIAL_MASTER_ROUTINES[0]);
  assert.ok(csv.includes('Mathematics'));
  assert.ok(csv.includes('Sunday'));
});
