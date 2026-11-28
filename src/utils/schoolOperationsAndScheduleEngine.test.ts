import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTeacherLeaveRequest,
  decideTeacherEarlyReturn,
  decideTeacherLeave,
  endTodaysClassesEarly,
  evaluateAttendanceParentNotification,
  requestTeacherEarlyReturn,
  resolveSchoolLiveTeachingStatus,
  startSchoolDay,
} from './schoolOperationsAndScheduleEngine';
import { INITIAL_EXAM_ROUTINES, INITIAL_STUDENTS } from './testFixtures';
import type { HolidayPlanRecord } from '../types';

test('resolveSchoolLiveTeachingStatus resolves Start School, Exam Pause, Holiday Auto-Resume, and Early Closure', () => {
  const schoolId = 'GPS-1042';
  const examSlot = INITIAL_EXAM_ROUTINES[0].slots[0];
  const examClass = INITIAL_EXAM_ROUTINES[0].className;
  const examDate = examSlot.examDate;
  const examActiveNow = `${examDate}T${examSlot.startTime}:00`;
  const regularDayNow = '2026-11-18T10:15:00';

  // Start school day on regular day
  const opsStarted = startSchoolDay([], schoolId, '2026-11-18', 'Head Teacher', '09:00 AM');
  const running = resolveSchoolLiveTeachingStatus({
    schoolId,
    nowIso: regularDayNow,
    dailyOps: opsStarted,
    holidays: [],
    examRoutines: INITIAL_EXAM_ROUTINES,
  });
  assert.equal(running.status, 'running');
  assert.equal(running.classesActive, true);
  assert.equal(running.communicationOpen, true);

  // During active exam slot, normal classes pause automatically
  const opsOnExamDay = startSchoolDay([], schoolId, examDate, 'Head Teacher', '09:00 AM');
  const duringExam = resolveSchoolLiveTeachingStatus({
    schoolId,
    nowIso: examActiveNow,
    dailyOps: opsOnExamDay,
    holidays: [],
    examRoutines: INITIAL_EXAM_ROUTINES,
    className: examClass,
  });
  assert.equal(duringExam.status, 'exam_running');
  assert.equal(duringExam.classesActive, false);
  assert.equal(duringExam.communicationOpen, true);

  // Early closure shows exact message while communication stays open
  const opsClosedEarly = endTodaysClassesEarly(opsStarted, schoolId, '2026-11-18', 'Head Teacher', '12:30 PM');
  const closedEarly = resolveSchoolLiveTeachingStatus({
    schoolId,
    nowIso: '2026-11-18T13:00:00',
    dailyOps: opsClosedEarly,
    holidays: [],
    examRoutines: INITIAL_EXAM_ROUTINES,
  });
  assert.equal(closedEarly.status, 'ended_early');
  assert.equal(closedEarly.labelBn, 'আজকের ক্লাস কার্যক্রম শেষ');
  assert.equal(closedEarly.communicationOpen, true);

  // Holiday active vs auto-resume after holiday ends
  const holidays: HolidayPlanRecord[] = [
    {
      id: 'hol-1',
      schoolId,
      nameBn: 'শীতকালীন ছুটি',
      holidayType: 'Winter',
      startDateTime: '2026-12-20T08:00',
      endDateTime: '2026-12-25T17:00',
      description: 'Annual winter break',
      createdBy: 'Head Teacher',
      createdAt: '2026-11-18',
    },
  ];
  const opsDec22 = startSchoolDay([], schoolId, '2026-12-22', 'Head Teacher', '09:00 AM');
  const onHoliday = resolveSchoolLiveTeachingStatus({
    schoolId,
    nowIso: '2026-12-22T10:00:00',
    dailyOps: opsDec22,
    holidays,
    examRoutines: [],
  });
  assert.equal(onHoliday.status, 'holiday');
  assert.equal(onHoliday.classesActive, false);

  const opsDec26 = startSchoolDay([], schoolId, '2026-12-26', 'Head Teacher', '09:00 AM');
  const afterHoliday = resolveSchoolLiveTeachingStatus({
    schoolId,
    nowIso: '2026-12-26T10:00:00',
    dailyOps: opsDec26,
    holidays,
    examRoutines: [],
  });
  assert.equal(afterHoliday.status, 'running');
  assert.equal(afterHoliday.classesActive, true);
});

test('evaluateAttendanceParentNotification deduplicates Entry and Exit alerts once per student per day', () => {
  const stu = INITIAL_STUDENTS[0];
  const entry1 = evaluateAttendanceParentNotification({
    student: stu,
    schoolId: stu.schoolId,
    dateIso: '2026-11-28',
    timeText: '09:05 AM',
    mode: 'entry',
    existingRecords: [],
  });
  assert.equal(entry1.shouldNotifyParent, true);
  assert.ok(entry1.messageBn?.includes('স্কুলে পৌঁছেছে'));

  // Repeat entry scan on same day must NOT notify again
  const entry2 = evaluateAttendanceParentNotification({
    student: stu,
    schoolId: stu.schoolId,
    dateIso: '2026-11-28',
    timeText: '09:12 AM',
    mode: 'entry',
    existingRecords: entry1.nextDedupRecords,
  });
  assert.equal(entry2.shouldNotifyParent, false);
  assert.equal(entry2.duplicatePrevented, true);

  // First exit scan on same day SHOULD notify
  const exit1 = evaluateAttendanceParentNotification({
    student: stu,
    schoolId: stu.schoolId,
    dateIso: '2026-11-28',
    timeText: '02:00 PM',
    mode: 'exit',
    existingRecords: entry2.nextDedupRecords,
  });
  assert.equal(exit1.shouldNotifyParent, true);
  assert.ok(exit1.messageBn?.includes('স্কুল ত্যাগ করেছে'));
});

test('Teacher leave request & early return approval workflow', () => {
  const req = createTeacherLeaveRequest({
    schoolId: 'GPS-1042',
    teacherId: 'tch-2',
    teacherName: 'মোঃ আব্দুর রহিম',
    startDateTime: '2026-11-28T09:00',
    endDateTime: '2026-11-30T16:00',
    reason: 'পারিবারিক জরুরি কাজ',
  });
  const approved = decideTeacherLeave([req], req.id, 'approved', 'Head Teacher');
  assert.equal(approved[0].status, 'approved');
  const earlyReq = requestTeacherEarlyReturn(approved, req.id, 'কাজ শেষ হয়েছে, আজই ফিরতে চাই');
  assert.equal(earlyReq[0].earlyReturnStatus, 'pending');
  const earlyApproved = decideTeacherEarlyReturn(earlyReq, req.id, 'approved', 'Head Teacher');
  assert.equal(earlyApproved[0].earlyReturnStatus, 'approved');
  assert.equal(earlyApproved[0].status, 'cancelled');
});
