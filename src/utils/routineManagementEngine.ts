import type {
  MasterRoutineRecord,
  RoutineCellSchedule,
  RoutineConflict,
  RoutineDayConfig,
  RoutinePeriodConfig,
  RoutineStatus,
  RoutineType,
  RoutineVersionSnapshot,
  SchoolRecord,
  TeacherRecord,
  TeacherSubjectAssignment,
} from '../types';

export const DEFAULT_ROUTINE_DAYS: RoutineDayConfig[] = [
  { id: 'day-sun', nameBn: 'রবিবার', nameEn: 'Sunday', shortCode: 'SUN', order: 1, isActive: true },
  { id: 'day-mon', nameBn: 'সোমবার', nameEn: 'Monday', shortCode: 'MON', order: 2, isActive: true },
  { id: 'day-tue', nameBn: 'মঙ্গলবার', nameEn: 'Tuesday', shortCode: 'TUE', order: 3, isActive: true },
  { id: 'day-wed', nameBn: 'বুধবার', nameEn: 'Wednesday', shortCode: 'WED', order: 4, isActive: true },
  { id: 'day-thu', nameBn: 'বৃহস্পতিবার', nameEn: 'Thursday', shortCode: 'THU', order: 5, isActive: true },
];

export const DEFAULT_ROUTINE_PERIODS: RoutinePeriodConfig[] = [
  { id: 'prd-1', periodNumber: 1, nameBn: '১ম পিরিয়ড', nameEn: 'Period 1', startTime: '09:30', endTime: '10:15', durationMins: 45 },
  { id: 'prd-2', periodNumber: 2, nameBn: '২য় পিরিয়ড', nameEn: 'Period 2', startTime: '10:20', endTime: '11:05', durationMins: 45 },
  { id: 'prd-3', periodNumber: 3, nameBn: '৩য় পিরিয়ড', nameEn: 'Period 3', startTime: '11:15', endTime: '12:00', durationMins: 45 },
  { id: 'prd-4', periodNumber: 4, nameBn: '৪র্থ পিরিয়ড', nameEn: 'Period 4', startTime: '12:15', endTime: '13:00', durationMins: 45 },
  { id: 'prd-5', periodNumber: 5, nameBn: '৫ম পিরিয়ড', nameEn: 'Period 5', startTime: '13:15', endTime: '14:00', durationMins: 45 },
];

export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim();
  const match24 = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (match24) {
    const h = Number(match24[1]);
    const m = Number(match24[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return h * 60 + m;
    return null;
  }
  const match12 = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(trimmed);
  if (match12) {
    let h = Number(match12[1]);
    const m = Number(match12[2]);
    const mer = match12[3].toUpperCase();
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;
    if (mer === 'PM' && h !== 12) h += 12;
    if (mer === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  return null;
}

export function formatTimeDisplay(timeStr?: string): string {
  const mins = parseTimeToMinutes(timeStr);
  if (mins === null) return timeStr ?? '—';
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const mer = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${mer}`;
}

export function computeDurationMinutes(startTime?: string, endTime?: string): number {
  const s = parseTimeToMinutes(startTime);
  const e = parseTimeToMinutes(endTime);
  if (s === null || e === null || e <= s) return 0;
  return e - s;
}

export function timesOverlap(aStart?: string, aEnd?: string, bStart?: string, bEnd?: string): boolean {
  const s1 = parseTimeToMinutes(aStart);
  const e1 = parseTimeToMinutes(aEnd);
  const s2 = parseTimeToMinutes(bStart);
  const e2 = parseTimeToMinutes(bEnd);
  if (s1 === null || e1 === null || s2 === null || e2 === null) return false;
  if (e1 <= s1 || e2 <= s2) return false;
  return s1 < e2 && s2 < e1;
}

export function getAssignedTeachersForClassSubject(
  teacherAssignments: TeacherSubjectAssignment[],
  teachers: TeacherRecord[],
  schoolId: string,
  className: string,
  section: string,
  subjectEnOrBn: string
): { assigned: TeacherRecord[]; otherSchoolTeachers: TeacherRecord[] } {
  const schoolTeachers = teachers.filter(
    (t) => t.schoolId === schoolId && t.status === 'active'
  );
  const norm = subjectEnOrBn.trim().toLowerCase();
  const matchedIds = new Set(
    teacherAssignments
      .filter(
        (ta) =>
          ta.className === className &&
          (!section || !ta.section || ta.section === section) &&
          (ta.subjectEn.trim().toLowerCase() === norm ||
            ta.subjectBn.trim().toLowerCase() === norm)
      )
      .map((ta) => ta.teacherId)
  );
  const assigned = schoolTeachers.filter((t) => matchedIds.has(t.id));
  const otherSchoolTeachers = schoolTeachers.filter((t) => !matchedIds.has(t.id));
  return { assigned, otherSchoolTeachers };
}

export function detectRoutineCellConflicts(
  candidate: Omit<RoutineCellSchedule, 'id'> & { id?: string },
  currentRoutine: MasterRoutineRecord,
  allRoutines: MasterRoutineRecord[]
): RoutineConflict[] {
  const conflicts: RoutineConflict[] = [];

  if (!candidate.subjectEn?.trim() && !candidate.subjectBn?.trim()) {
    conflicts.push({
      kind: 'missing_subject',
      messageBn: 'বিষয় (Subject) নির্বাচন করা আবশ্যক।',
      messageEn: 'Subject is required.',
      cellId: candidate.id,
    });
  }

  if (!candidate.teacherId?.trim()) {
    conflicts.push({
      kind: 'missing_teacher',
      messageBn: 'শিক্ষক (Teacher) নির্বাচন করা আবশ্যক।',
      messageEn: 'Teacher is required.',
      cellId: candidate.id,
    });
  }

  const startMin = parseTimeToMinutes(candidate.startTime);
  const endMin = parseTimeToMinutes(candidate.endTime);
  if (startMin === null || endMin === null) {
    conflicts.push({
      kind: 'missing_time',
      messageBn: 'শুরু ও শেষের সময় সঠিকভাবে দিন (HH:MM)।',
      messageEn: 'Valid start and end times are required.',
      cellId: candidate.id,
    });
  } else if (endMin <= startMin) {
    conflicts.push({
      kind: 'invalid_time',
      messageBn: 'শেষের সময় শুরুর সময়ের চেয়ে বেশি হতে হবে।',
      messageEn: 'End time must be after start time.',
      cellId: candidate.id,
    });
  }

  // Check duplicate & internal class conflicts within the current routine
  for (const existing of currentRoutine.schedules) {
    if (candidate.id && existing.id === candidate.id) continue;

    if (
      existing.dayId === candidate.dayId &&
      existing.periodId === candidate.periodId &&
      existing.className === candidate.className &&
      existing.section === candidate.section
    ) {
      conflicts.push({
        kind: 'duplicate_schedule',
        messageBn: `${candidate.className} (${candidate.section})-এ এই দিন ও পিরিয়ডে ইতোমধ্যে একটি ক্লাস নির্ধারিত আছে।`,
        messageEn: `Duplicate schedule in ${candidate.className} (${candidate.section}) for this day & period.`,
        cellId: existing.id,
        conflictingRoutineTitle: currentRoutine.titleBn,
      });
      continue;
    }

    if (
      existing.dayId === candidate.dayId &&
      timesOverlap(candidate.startTime, candidate.endTime, existing.startTime, existing.endTime)
    ) {
      if (
        existing.className === candidate.className &&
        existing.section === candidate.section
      ) {
        conflicts.push({
          kind: 'class_conflict',
          messageBn: `Class Conflict: ${candidate.className} (${candidate.section})-এ একই সময়ে ${existing.subjectBn} ক্লাস রয়েছে।`,
          messageEn: `Class Conflict: ${candidate.className} (${candidate.section}) already has ${existing.subjectEn} at this time.`,
          cellId: existing.id,
          conflictingRoutineTitle: currentRoutine.titleBn,
        });
      }

      if (candidate.teacherId && existing.teacherId === candidate.teacherId) {
        conflicts.push({
          kind: 'teacher_conflict',
          messageBn: `Teacher Conflict: ${existing.teacherName} একই সময়ে (${existing.className}) ক্লাসে নির্ধারিত আছেন।`,
          messageEn: `Teacher Conflict: ${existing.teacherName} is already scheduled in ${existing.className} at this time.`,
          cellId: existing.id,
          conflictingRoutineTitle: currentRoutine.titleBn,
        });
      }

      if (
        candidate.room?.trim() &&
        existing.room?.trim().toLowerCase() === candidate.room.trim().toLowerCase()
      ) {
        conflicts.push({
          kind: 'room_conflict',
          messageBn: `Room Conflict: Room ${existing.room} একই সময়ে ${existing.className} (${existing.subjectBn}) দ্বারা ব্যবহৃত হচ্ছে।`,
          messageEn: `Room Conflict: Room ${existing.room} is already occupied by ${existing.className} (${existing.subjectEn}).`,
          cellId: existing.id,
          conflictingRoutineTitle: currentRoutine.titleBn,
        });
      }
    }
  }

  // Cross-routine school-wide checks across active/published routines in the SAME school
  const peerRoutines = allRoutines.filter(
    (r) =>
      r.id !== currentRoutine.id &&
      r.schoolId === currentRoutine.schoolId &&
      (r.status === 'Active' || r.status === 'Published')
  );

  for (const peer of peerRoutines) {
    for (const existing of peer.schedules) {
      if (existing.dayId !== candidate.dayId) continue;
      if (!timesOverlap(candidate.startTime, candidate.endTime, existing.startTime, existing.endTime)) {
        continue;
      }

      if (candidate.teacherId && existing.teacherId === candidate.teacherId) {
        conflicts.push({
          kind: 'teacher_conflict',
          messageBn: `Teacher Conflict (${peer.className}): ${existing.teacherName} একই সময়ে অন্য রুটিনে (${peer.titleBn}) ক্লাস নিচ্ছেন।`,
          messageEn: `Teacher Conflict (${peer.className}): ${existing.teacherName} is busy in "${peer.titleEn}".`,
          cellId: existing.id,
          conflictingRoutineTitle: peer.titleBn,
        });
      }

      if (
        candidate.room?.trim() &&
        existing.room?.trim().toLowerCase() === candidate.room.trim().toLowerCase()
      ) {
        conflicts.push({
          kind: 'room_conflict',
          messageBn: `Room Conflict (${peer.className}): Room ${existing.room} একই সময়ে "${peer.titleBn}" রুটিনে বরাদ্দ আছে।`,
          messageEn: `Room Conflict (${peer.className}): Room ${existing.room} is occupied in "${peer.titleEn}".`,
          cellId: existing.id,
          conflictingRoutineTitle: peer.titleBn,
        });
      }

      if (
        existing.className === candidate.className &&
        existing.section === candidate.section
      ) {
        conflicts.push({
          kind: 'class_conflict',
          messageBn: `Class Conflict: ${candidate.className} (${candidate.section})-এর আরেকটি সক্রিয় রুটিনে ("${peer.titleBn}") একই সময়ে ক্লাস রয়েছে।`,
          messageEn: `Class Conflict: ${candidate.className} (${candidate.section}) has an overlapping slot in "${peer.titleEn}".`,
          cellId: existing.id,
          conflictingRoutineTitle: peer.titleBn,
        });
      }
    }
  }

  return conflicts;
}

export function validateEntireRoutine(
  routine: MasterRoutineRecord,
  allRoutines: MasterRoutineRecord[]
): RoutineConflict[] {
  const allConflicts: RoutineConflict[] = [];
  for (const cell of routine.schedules) {
    const cellConflicts = detectRoutineCellConflicts(cell, routine, allRoutines);
    allConflicts.push(...cellConflicts);
  }
  return allConflicts;
}

export interface CreateMasterRoutineInput {
  schoolId: string;
  titleBn: string;
  titleEn?: string;
  routineType: RoutineType;
  academicYear: string;
  month?: string;
  className: string;
  section: string;
  createdBy: string;
  isTemporary?: boolean;
  startDate?: string;
  endDate?: string;
  nowIso?: string;
}

export function createNewMasterRoutine(input: CreateMasterRoutineInput): MasterRoutineRecord {
  const now = input.nowIso ?? '2026-11-20';
  const days = DEFAULT_ROUTINE_DAYS.map((d) => ({ ...d }));
  const periods = DEFAULT_ROUTINE_PERIODS.map((p) => ({ ...p }));
  const initialSnapshot: RoutineVersionSnapshot = {
    versionNumber: 1,
    savedAt: now,
    savedBy: input.createdBy,
    status: 'Draft',
    summaryNote: 'Initial Draft Created',
    days,
    periods,
    schedules: [],
  };

  return {
    id: `mrout-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`,
    schoolId: input.schoolId,
    titleBn: input.titleBn.trim(),
    titleEn: (input.titleEn ?? input.titleBn).trim(),
    routineType: input.routineType,
    academicYear: input.academicYear,
    month: input.routineType === 'monthly' ? (input.month ?? 'November 2026') : undefined,
    className: input.className,
    section: input.section,
    status: 'Draft',
    isTemporary: Boolean(input.isTemporary),
    startDate: input.startDate,
    endDate: input.endDate,
    version: 1,
    versions: [initialSnapshot],
    days,
    periods,
    schedules: [],
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

export function upsertRoutineCell(
  routine: MasterRoutineRecord,
  cellPayload: Omit<RoutineCellSchedule, 'id'> & { id?: string }
): MasterRoutineRecord {
  const nextId =
    cellPayload.id ??
    `rcell-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 90 + 10)}`;
  const nextCell: RoutineCellSchedule = {
    ...cellPayload,
    id: nextId,
  };
  const existsIdx = routine.schedules.findIndex(
    (s) =>
      s.id === nextId ||
      (s.dayId === cellPayload.dayId &&
        s.periodId === cellPayload.periodId &&
        s.className === cellPayload.className &&
        s.section === cellPayload.section)
  );
  const nextSchedules =
    existsIdx >= 0
      ? routine.schedules.map((s, idx) => (idx === existsIdx ? { ...nextCell, id: s.id } : s))
      : [...routine.schedules, nextCell];
  return {
    ...routine,
    schedules: nextSchedules,
  };
}

export function saveRoutineWithVersioning(
  routines: MasterRoutineRecord[],
  updatedRoutine: MasterRoutineRecord,
  actorName: string,
  summaryNote: string,
  nowLabel = '2026-11-20 10:30 AM'
): { routines: MasterRoutineRecord[]; savedRoutine: MasterRoutineRecord } {
  const existing = routines.find((r) => r.id === updatedRoutine.id);
  const wasPublishedOrActive =
    existing?.status === 'Published' || existing?.status === 'Active';
  const nextVersion = wasPublishedOrActive ? (existing?.version ?? 1) + 1 : updatedRoutine.version;

  const snapshot: RoutineVersionSnapshot = {
    versionNumber: nextVersion,
    savedAt: nowLabel,
    savedBy: actorName,
    status: updatedRoutine.status,
    summaryNote,
    days: updatedRoutine.days.map((d) => ({ ...d })),
    periods: updatedRoutine.periods.map((p) => ({ ...p })),
    schedules: updatedRoutine.schedules.map((s) => ({ ...s })),
  };

  const savedRoutine: MasterRoutineRecord = {
    ...updatedRoutine,
    version: nextVersion,
    updatedAt: nowLabel,
    versions: wasPublishedOrActive
      ? [snapshot, ...updatedRoutine.versions]
      : updatedRoutine.versions.length > 0
        ? [snapshot, ...updatedRoutine.versions.slice(1)]
        : [snapshot],
  };

  const nextRoutines = routines.some((r) => r.id === savedRoutine.id)
    ? routines.map((r) => (r.id === savedRoutine.id ? savedRoutine : r))
    : [savedRoutine, ...routines];

  return { routines: nextRoutines, savedRoutine };
}

export function publishOrActivateRoutine(
  routines: MasterRoutineRecord[],
  routineId: string,
  options: {
    actorName: string;
    isTemporary?: boolean;
    startDate?: string;
    endDate?: string;
    nowLabel?: string;
  }
): {
  ok: boolean;
  conflicts: RoutineConflict[];
  routines: MasterRoutineRecord[];
  publishedRoutine?: MasterRoutineRecord;
} {
  const target = routines.find((r) => r.id === routineId);
  if (!target) {
    return { ok: false, conflicts: [], routines };
  }

  const conflicts = validateEntireRoutine(
    target,
    routines.filter(
      (r) =>
        !(
          r.schoolId === target.schoolId &&
          r.className === target.className &&
          r.section === target.section &&
          r.id !== target.id
        )
    )
  );
  if (conflicts.length > 0) {
    return { ok: false, conflicts, routines };
  }

  const now = options.nowLabel ?? '2026-11-20 11:00 AM';
  const previousActive = routines.find(
    (r) =>
      r.id !== target.id &&
      r.schoolId === target.schoolId &&
      r.className === target.className &&
      r.section === target.section &&
      r.status === 'Active'
  );

  const nextStatus: RoutineStatus = 'Active';
  const updatedTargetBase: MasterRoutineRecord = {
    ...target,
    status: nextStatus,
    isTemporary: Boolean(options.isTemporary ?? target.isTemporary),
    startDate: options.startDate ?? target.startDate,
    endDate: options.endDate ?? target.endDate,
    previousActiveRoutineId: options.isTemporary
      ? (previousActive?.id ?? target.previousActiveRoutineId)
      : target.previousActiveRoutineId,
    publishedAt: now,
    updatedAt: now,
  };

  const nextVersion = target.versions.length === 0 ? 1 : target.version + 1;
  const snapshot: RoutineVersionSnapshot = {
    versionNumber: nextVersion,
    savedAt: now,
    savedBy: options.actorName,
    status: nextStatus,
    summaryNote: options.isTemporary
      ? `Activated Temporary Routine (${options.startDate ?? ''} → ${options.endDate ?? ''})`
      : 'Published & Activated Routine',
    days: updatedTargetBase.days.map((d) => ({ ...d })),
    periods: updatedTargetBase.periods.map((p) => ({ ...p })),
    schedules: updatedTargetBase.schedules.map((s) => ({ ...s })),
  };

  const publishedRoutine: MasterRoutineRecord = {
    ...updatedTargetBase,
    version: nextVersion,
    versions: [snapshot, ...updatedTargetBase.versions],
  };

  const nextRoutines = routines.map((r) => {
    if (r.id === publishedRoutine.id) return publishedRoutine;
    if (
      r.schoolId === target.schoolId &&
      r.className === target.className &&
      r.section === target.section &&
      r.status === 'Active'
    ) {
      return {
        ...r,
        status: options.isTemporary ? ('Published' as RoutineStatus) : ('Archived' as RoutineStatus),
      };
    }
    return r;
  });

  return { ok: true, conflicts: [], routines: nextRoutines, publishedRoutine };
}

export function checkAndExpireTemporaryRoutines(
  routines: MasterRoutineRecord[],
  todayIso: string
): {
  routines: MasterRoutineRecord[];
  expiredCount: number;
} {
  let expiredCount = 0;
  const restoredPreviousIds = new Set<string>();

  const firstPass = routines.map((r) => {
    if (
      r.isTemporary &&
      (r.status === 'Active' || r.status === 'Published') &&
      r.endDate &&
      r.endDate < todayIso
    ) {
      expiredCount += 1;
      if (r.previousActiveRoutineId) restoredPreviousIds.add(r.previousActiveRoutineId);
      return { ...r, status: 'Expired' as RoutineStatus };
    }
    return r;
  });

  const finalRoutines = firstPass.map((r) => {
    if (restoredPreviousIds.has(r.id) && r.status !== 'Active') {
      return { ...r, status: 'Active' as RoutineStatus };
    }
    return r;
  });

  return { routines: finalRoutines, expiredCount };
}

export function extendTemporaryRoutine(
  routines: MasterRoutineRecord[],
  routineId: string,
  newEndDate: string,
  actorName: string
): MasterRoutineRecord[] {
  return routines.map((r) => {
    if (r.id !== routineId) return r;
    const nextVer = r.version + 1;
    const snap: RoutineVersionSnapshot = {
      versionNumber: nextVer,
      savedAt: '2026-11-20',
      savedBy: actorName,
      status: 'Active',
      summaryNote: `Extended temporary end date to ${newEndDate}`,
      days: r.days,
      periods: r.periods,
      schedules: r.schedules,
    };
    return {
      ...r,
      status: 'Active',
      isTemporary: true,
      endDate: newEndDate,
      version: nextVer,
      versions: [snap, ...r.versions],
      updatedAt: '2026-11-20',
    };
  });
}

export function reactivateRoutine(
  routines: MasterRoutineRecord[],
  routineId: string,
  actorName: string,
  newStartDate?: string,
  newEndDate?: string
): MasterRoutineRecord[] {
  const target = routines.find((r) => r.id === routineId);
  if (!target) return routines;
  return routines.map((r) => {
    if (r.id === routineId) {
      const nextVer = r.version + 1;
      const snap: RoutineVersionSnapshot = {
        versionNumber: nextVer,
        savedAt: '2026-11-20',
        savedBy: actorName,
        status: 'Active',
        summaryNote: 'Reactivated Routine',
        days: r.days,
        periods: r.periods,
        schedules: r.schedules,
      };
      return {
        ...r,
        status: 'Active',
        startDate: newStartDate ?? r.startDate,
        endDate: newEndDate ?? r.endDate,
        version: nextVer,
        versions: [snap, ...r.versions],
        updatedAt: '2026-11-20',
      };
    }
    if (
      r.schoolId === target.schoolId &&
      r.className === target.className &&
      r.section === target.section &&
      r.status === 'Active'
    ) {
      return { ...r, status: 'Published' };
    }
    return r;
  });
}

export function restoreRoutineVersion(
  routines: MasterRoutineRecord[],
  routineId: string,
  versionNumber: number,
  actorName: string
): MasterRoutineRecord[] {
  return routines.map((r) => {
    if (r.id !== routineId) return r;
    const targetSnap = r.versions.find((v) => v.versionNumber === versionNumber);
    if (!targetSnap) return r;
    const nextVer = r.version + 1;
    const restoredSnap: RoutineVersionSnapshot = {
      versionNumber: nextVer,
      savedAt: '2026-11-20',
      savedBy: actorName,
      status: r.status,
      summaryNote: `Restored from v${versionNumber}`,
      days: targetSnap.days.map((d) => ({ ...d })),
      periods: targetSnap.periods.map((p) => ({ ...p })),
      schedules: targetSnap.schedules.map((s) => ({ ...s })),
    };
    return {
      ...r,
      days: targetSnap.days.map((d) => ({ ...d })),
      periods: targetSnap.periods.map((p) => ({ ...p })),
      schedules: targetSnap.schedules.map((s) => ({ ...s })),
      version: nextVer,
      versions: [restoredSnap, ...r.versions],
      updatedAt: '2026-11-20',
    };
  });
}

export function buildStudentPublishedRoutineView(
  routines: MasterRoutineRecord[],
  schoolId: string,
  className: string,
  section: string,
  todayIso = '2026-11-20'
): MasterRoutineRecord | undefined {
  const candidates = routines.filter((r) => {
    if (r.schoolId !== schoolId) return false;
    if (r.className !== className || r.section !== section) return false;
    if (r.status !== 'Active' && r.status !== 'Published') return false;
    if (r.isTemporary && r.endDate && r.endDate < todayIso) return false;
    return true;
  });
  return (
    candidates.find((c) => c.status === 'Active') ??
    candidates.find((c) => c.status === 'Published')
  );
}

export function buildTeacherPersonalRoutineView(
  routines: MasterRoutineRecord[],
  schoolId: string,
  teacherId: string,
  todayIso = '2026-11-20'
): {
  days: RoutineDayConfig[];
  periods: RoutinePeriodConfig[];
  slots: Array<RoutineCellSchedule & { routineTitleBn: string; routineTitleEn: string }>;
} {
  const activeSchoolRoutines = routines.filter((r) => {
    if (r.schoolId !== schoolId) return false;
    if (r.status !== 'Active' && r.status !== 'Published') return false;
    if (r.isTemporary && r.endDate && r.endDate < todayIso) return false;
    return true;
  });

  const dayMap = new Map<string, RoutineDayConfig>();
  const periodMap = new Map<string, RoutinePeriodConfig>();
  const slots: Array<RoutineCellSchedule & { routineTitleBn: string; routineTitleEn: string }> = [];

  for (const d of DEFAULT_ROUTINE_DAYS) dayMap.set(d.id, d);
  for (const p of DEFAULT_ROUTINE_PERIODS) periodMap.set(p.id, p);

  for (const r of activeSchoolRoutines) {
    for (const d of r.days) dayMap.set(d.id, d);
    for (const p of r.periods) periodMap.set(p.id, p);
    for (const s of r.schedules) {
      if (s.teacherId === teacherId) {
        slots.push({
          ...s,
          routineTitleBn: r.titleBn,
          routineTitleEn: r.titleEn,
        });
      }
    }
  }

  return {
    days: Array.from(dayMap.values()).sort((a, b) => a.order - b.order),
    periods: Array.from(periodMap.values()).sort((a, b) => a.periodNumber - b.periodNumber),
    slots,
  };
}

export function exportRoutineToCsv(
  routine: MasterRoutineRecord,
  school?: SchoolRecord
): string {
  const headerMeta = [
    `School,${school ? `${school.nameEn} (${school.code})` : routine.schoolId}`,
    `Routine,${routine.titleEn}`,
    `Type,${routine.routineType}`,
    `Academic Year,${routine.academicYear}`,
    `Class & Section,${routine.className} (${routine.section})`,
    `Status,${routine.status}`,
    '',
  ];
  const cols = ['Day', ...routine.periods.map((p) => `${p.nameEn} (${formatTimeDisplay(p.startTime)}-${formatTimeDisplay(p.endTime)})`)];
  const rows = routine.days.map((day) => {
    const cells = routine.periods.map((period) => {
      const slot = routine.schedules.find(
        (s) => s.dayId === day.id && s.periodId === period.id
      );
      if (!slot) return '—';
      return `"${slot.subjectEn} | ${slot.teacherName} | Room ${slot.room}"`;
    });
    return [`"${day.nameEn}"`, ...cells].join(',');
  });
  return [...headerMeta, cols.join(','), ...rows].join('\n');
}
