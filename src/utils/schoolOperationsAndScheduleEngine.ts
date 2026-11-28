import type {
  AttendanceNotificationDedupRecord,
  ExamRoutineRecord,
  ExamRoutineSlot,
  HolidayPlanRecord,
  SchoolDailyOperationsState,
  SchoolDailyTeachingStatus,
  StudentRecord,
  TeacherLeaveRecord,
} from '../types';

export interface ResolvedSchoolStatus {
  status: SchoolDailyTeachingStatus;
  labelBn: string;
  labelEn: string;
  classesActive: boolean;
  communicationOpen: boolean;
  activeHoliday?: HolidayPlanRecord;
  activeExamRoutine?: ExamRoutineRecord;
  activeExamSlot?: ExamRoutineSlot;
}

export function extractDateIso(isoDateTime: string): string {
  return isoDateTime.slice(0, 10);
}

export function extractHHMM(isoDateTime: string): string {
  if (isoDateTime.includes('T')) {
    return isoDateTime.split('T')[1].slice(0, 5);
  }
  return '09:00';
}

export function startSchoolDay(
  existing: SchoolDailyOperationsState[],
  schoolId: string,
  dateIso: string,
  actorName: string,
  timeText: string
): SchoolDailyOperationsState[] {
  const filtered = existing.filter(
    (op) => !(op.schoolId === schoolId && op.dateIso === dateIso)
  );
  return [
    ...filtered,
    {
      schoolId,
      dateIso,
      isStarted: true,
      startedAt: timeText,
      startedBy: actorName,
      endedEarly: false,
    },
  ];
}

export function endTodaysClassesEarly(
  existing: SchoolDailyOperationsState[],
  schoolId: string,
  dateIso: string,
  actorName: string,
  timeText: string
): SchoolDailyOperationsState[] {
  const current = existing.find(
    (op) => op.schoolId === schoolId && op.dateIso === dateIso
  );
  const filtered = existing.filter(
    (op) => !(op.schoolId === schoolId && op.dateIso === dateIso)
  );
  return [
    ...filtered,
    {
      schoolId,
      dateIso,
      isStarted: current?.isStarted ?? true,
      startedAt: current?.startedAt ?? timeText,
      startedBy: current?.startedBy ?? actorName,
      endedEarly: true,
      endedEarlyAt: timeText,
      endedEarlyBy: actorName,
    },
  ];
}

export function isHolidayActiveAt(
  holiday: HolidayPlanRecord,
  nowIso: string
): boolean {
  if (holiday.manualOverrideInactive) return false;
  const nowMs = Date.parse(nowIso);
  const startMs = Date.parse(holiday.startDateTime);
  const endMs = Date.parse(holiday.endDateTime);
  if (Number.isNaN(nowMs) || Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return false;
  }
  return nowMs >= startMs && nowMs <= endMs;
}

export function findActiveExamSlotAt(params: {
  examRoutines: ExamRoutineRecord[];
  schoolId: string;
  className?: string;
  nowIso: string;
}): { routine: ExamRoutineRecord; slot: ExamRoutineSlot } | null {
  const dateIso = extractDateIso(params.nowIso);
  const nowHHMM = extractHHMM(params.nowIso);

  for (const routine of params.examRoutines) {
    if (routine.schoolId !== params.schoolId) continue;
    if (routine.status !== 'Published' && routine.status !== 'Approved') continue;
    if (params.className && routine.className !== params.className) continue;

    for (const slot of routine.slots) {
      if (slot.examDate !== dateIso) continue;
      if (nowHHMM >= slot.startTime && nowHHMM <= slot.endTime) {
        return { routine, slot };
      }
    }
  }
  return null;
}

export function resolveSchoolLiveTeachingStatus(params: {
  schoolId: string;
  nowIso: string;
  dailyOps: SchoolDailyOperationsState[];
  holidays: HolidayPlanRecord[];
  examRoutines: ExamRoutineRecord[];
  className?: string;
}): ResolvedSchoolStatus {
  const dateIso = extractDateIso(params.nowIso);

  const activeHoliday = params.holidays.find(
    (h) => h.schoolId === params.schoolId && isHolidayActiveAt(h, params.nowIso)
  );
  if (activeHoliday) {
    return {
      status: 'holiday',
      labelBn: `ছুটি চলছে — ${activeHoliday.nameBn}`,
      labelEn: `Holiday Active — ${activeHoliday.nameEn || activeHoliday.nameBn}`,
      classesActive: false,
      communicationOpen: true,
      activeHoliday,
    };
  }

  const todayOps = params.dailyOps.find(
    (op) => op.schoolId === params.schoolId && op.dateIso === dateIso
  );
  if (todayOps?.endedEarly) {
    return {
      status: 'ended_early',
      labelBn: 'আজকের ক্লাস কার্যক্রম শেষ',
      labelEn: "Today's Classes Ended Early",
      classesActive: false,
      communicationOpen: true,
    };
  }

  const activeExam = findActiveExamSlotAt({
    examRoutines: params.examRoutines,
    schoolId: params.schoolId,
    className: params.className,
    nowIso: params.nowIso,
  });
  if (activeExam) {
    return {
      status: 'exam_running',
      labelBn: '📝 পরীক্ষা চলছে — এই সময় সাধারণ ক্লাস কার্যক্রম বন্ধ।',
      labelEn: '📝 Examination in Progress — Regular classes are paused.',
      classesActive: false,
      communicationOpen: true,
      activeExamRoutine: activeExam.routine,
      activeExamSlot: activeExam.slot,
    };
  }

  if (todayOps?.isStarted) {
    return {
      status: 'running',
      labelBn: '🟢 ক্লাস কার্যক্রম চলছে',
      labelEn: '🟢 Classes Running',
      classesActive: true,
      communicationOpen: true,
    };
  }

  return {
    status: 'not_started',
    labelBn: 'আজকের ক্লাস কার্যক্রম এখনো শুরু হয়নি',
    labelEn: 'Classes have not started yet today',
    classesActive: false,
    communicationOpen: true,
  };
}

export function createTeacherLeaveRequest(params: {
  schoolId: string;
  teacherId: string;
  teacherName: string;
  startDateTime: string;
  endDateTime: string;
  reason: string;
}): TeacherLeaveRecord {
  return {
    id: `tlv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    schoolId: params.schoolId,
    teacherId: params.teacherId,
    teacherName: params.teacherName,
    startDateTime: params.startDateTime,
    endDateTime: params.endDateTime,
    reason: params.reason.trim(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

export function decideTeacherLeave(
  leaves: TeacherLeaveRecord[],
  leaveId: string,
  decision: 'approved' | 'rejected',
  approverName: string
): TeacherLeaveRecord[] {
  return leaves.map((lv) =>
    lv.id === leaveId
      ? { ...lv, status: decision, approvedBy: approverName }
      : lv
  );
}

export function requestTeacherEarlyReturn(
  leaves: TeacherLeaveRecord[],
  leaveId: string,
  reason: string
): TeacherLeaveRecord[] {
  return leaves.map((lv) =>
    lv.id === leaveId
      ? {
          ...lv,
          earlyReturnRequested: true,
          earlyReturnReason: reason.trim(),
          earlyReturnStatus: 'pending',
        }
      : lv
  );
}

export function decideTeacherEarlyReturn(
  leaves: TeacherLeaveRecord[],
  leaveId: string,
  decision: 'approved' | 'rejected',
  approverName: string
): TeacherLeaveRecord[] {
  return leaves.map((lv) =>
    lv.id === leaveId
      ? {
          ...lv,
          earlyReturnStatus: decision,
          status: decision === 'approved' ? 'cancelled' : lv.status,
          approvedBy: approverName,
        }
      : lv
  );
}

export interface DedupAttendanceNotificationResult {
  dedupKey: string;
  shouldNotifyParent: boolean;
  duplicatePrevented: boolean;
  nextDedupRecords: AttendanceNotificationDedupRecord[];
  messageBn?: string;
  messageEn?: string;
}

export function evaluateAttendanceParentNotification(params: {
  student: StudentRecord;
  schoolId: string;
  dateIso: string;
  timeText: string;
  mode: 'entry' | 'exit';
  existingRecords: AttendanceNotificationDedupRecord[];
}): DedupAttendanceNotificationResult {
  const dedupKey = `${params.student.id}_${params.dateIso}_${params.mode}`;
  const exists = params.existingRecords.some((r) => r.key === dedupKey);
  if (exists) {
    return {
      dedupKey,
      shouldNotifyParent: false,
      duplicatePrevented: true,
      nextDedupRecords: params.existingRecords,
    };
  }

  const record: AttendanceNotificationDedupRecord = {
    key: dedupKey,
    studentId: params.student.id,
    schoolId: params.schoolId,
    dateIso: params.dateIso,
    type: params.mode,
    timeText: params.timeText,
    sentAtIso: new Date().toISOString(),
  };

  const messageBn =
    params.mode === 'entry'
      ? `✅ আপনার সন্তান আজ ${params.timeText}-এ স্কুলে পৌঁছেছে। উপস্থিতি রেকর্ড হয়েছে।`
      : `🏫 আপনার সন্তান আজ ${params.timeText}-এ স্কুল ত্যাগ করেছে।`;

  const messageEn =
    params.mode === 'entry'
      ? `✅ Your child arrived at school today at ${params.timeText}. Attendance has been recorded.`
      : `🏫 Your child left school today at ${params.timeText}.`;

  return {
    dedupKey,
    shouldNotifyParent: true,
    duplicatePrevented: false,
    nextDedupRecords: [record, ...params.existingRecords],
    messageBn,
    messageEn,
  };
}
