import type { ExamRoutineConflict, ExamRoutineRecord, ExamRoutineSlot } from '../types';
import { parseTimeToMinutes } from './routineManagementEngine';

function timeRangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const s1 = parseTimeToMinutes(aStart);
  const e1 = parseTimeToMinutes(aEnd);
  const s2 = parseTimeToMinutes(bStart);
  const e2 = parseTimeToMinutes(bEnd);
  if (s1 === null || e1 === null || s2 === null || e2 === null) return false;
  return s1 < e2 && s2 < e1;
}

export function detectExamRoutineConflicts(
  routine: ExamRoutineRecord,
  allSchoolRoutines: ExamRoutineRecord[]
): ExamRoutineConflict[] {
  const conflicts: ExamRoutineConflict[] = [];
  const otherRoutines = allSchoolRoutines.filter(
    (r) =>
      r.id !== routine.id &&
      r.schoolId === routine.schoolId &&
      r.status !== 'Archived'
  );

  for (let i = 0; i < routine.slots.length; i += 1) {
    const slot = routine.slots[i];
    const startMin = parseTimeToMinutes(slot.startTime);
    const endMin = parseTimeToMinutes(slot.endTime);
    if (startMin === null || endMin === null || endMin <= startMin) {
      conflicts.push({
        kind: 'invalid_time',
        slotId: slot.id,
        messageBn: `${slot.subjectBn} (${slot.examDate}): শুরু ও শেষের সময় সঠিক নয়।`,
        messageEn: `${slot.subjectEn} (${slot.examDate}): Invalid start/end time.`,
      });
      continue;
    }

    // Check internal overlaps within same routine (same class + section)
    for (let j = i + 1; j < routine.slots.length; j += 1) {
      const other = routine.slots[j];
      if (slot.examDate !== other.examDate) continue;
      if (!timeRangesOverlap(slot.startTime, slot.endTime, other.startTime, other.endTime)) continue;

      conflicts.push({
        kind: 'class_section_conflict',
        slotId: slot.id,
        messageBn: `একই শ্রেণি ও শাখায় (${routine.className} ${routine.section}) ${slot.examDate} তারিখে একই সময়ে ২টি পরীক্ষা (${slot.subjectBn} ও ${other.subjectBn}) নির্ধারিত হয়েছে।`,
        messageEn: `Same class & section (${routine.className} ${routine.section}) has 2 overlapping exams (${slot.subjectEn} & ${other.subjectEn}) on ${slot.examDate}.`,
      });
    }

    // Check cross-routine overlaps on same date & overlapping time within the school
    for (const otherR of otherRoutines) {
      for (const otherSlot of otherR.slots) {
        if (otherSlot.examDate !== slot.examDate) continue;
        if (!timeRangesOverlap(slot.startTime, slot.endTime, otherSlot.startTime, otherSlot.endTime)) {
          continue;
        }

        if (
          slot.invigilatorTeacherId &&
          otherSlot.invigilatorTeacherId &&
          slot.invigilatorTeacherId === otherSlot.invigilatorTeacherId
        ) {
          conflicts.push({
            kind: otherSlot.room === slot.room ? 'teacher_double_duty' : 'invigilator_conflict',
            slotId: slot.id,
            messageBn: `পরিদর্শক দ্বৈত দায়িত্ব (Conflict): ${slot.invigilatorTeacherName} একই সময়ে (${slot.examDate} ${slot.startTime}) ${otherR.className} (${otherSlot.room})-এ দায়িত্বপ্রাপ্ত।`,
            messageEn: `Invigilator conflict: ${slot.invigilatorTeacherName} already assigned on ${slot.examDate} ${slot.startTime} in ${otherR.className} (${otherSlot.room}).`,
          });
        }

        if (slot.room.trim() && otherSlot.room.trim() && slot.room.trim() === otherSlot.room.trim()) {
          conflicts.push({
            kind: 'room_conflict',
            slotId: slot.id,
            messageBn: `কক্ষ কনফ্লিক্ট: ${slot.room} একই সময়ে (${slot.examDate} ${slot.startTime}) ${otherR.className}-এর পরীক্ষার জন্য বরাদ্দ রয়েছে।`,
            messageEn: `Room conflict: ${slot.room} is already booked on ${slot.examDate} ${slot.startTime} for ${otherR.className}.`,
          });
        }
      }
    }
  }

  return conflicts;
}

export function publishExamRoutine(
  routine: ExamRoutineRecord,
  allSchoolRoutines: ExamRoutineRecord[],
  actorName: string
): {
  ok: boolean;
  routine?: ExamRoutineRecord;
  conflicts: ExamRoutineConflict[];
  errorBn?: string;
  errorEn?: string;
} {
  if (routine.slots.length === 0) {
    return {
      ok: false,
      conflicts: [],
      errorBn: 'প্রকাশ করার আগে অন্তত ১টি পরীক্ষার বিষয় ও সময়সূচি যুক্ত করুন।',
      errorEn: 'Add at least 1 exam slot before publishing.',
    };
  }
  const conflicts = detectExamRoutineConflicts(routine, allSchoolRoutines);
  if (conflicts.length > 0) {
    return {
      ok: false,
      conflicts,
      errorBn: `⚠️ ${conflicts.length}টি সময়সূচি/কক্ষ/পরিদর্শক কনফ্লিক্ট শনাক্ত হয়েছে। কনফ্লিক্ট সমাধান না করে Publish করা যাবে না।`,
      errorEn: `⚠️ ${conflicts.length} conflict(s) detected. Resolve all conflicts before publishing.`,
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  return {
    ok: true,
    conflicts: [],
    routine: {
      ...routine,
      status: 'Published',
      approvedBy: routine.approvedBy ?? actorName,
      updatedAt: today,
      publishedAt: today,
    },
  };
}

export function getStudentPersonalExamRoutine(
  routines: ExamRoutineRecord[],
  schoolId: string,
  className: string,
  section?: string
): ExamRoutineRecord[] {
  return routines.filter(
    (r) =>
      r.schoolId === schoolId &&
      r.status === 'Published' &&
      r.className === className &&
      (!section || !r.section || r.section === section)
  );
}

export interface TeacherInvigilatorDutyItem {
  routineId: string;
  examTitleBn: string;
  examTitleEn: string;
  className: string;
  section: string;
  slot: ExamRoutineSlot;
}

export function getTeacherInvigilatorDuties(
  routines: ExamRoutineRecord[],
  schoolId: string,
  teacherId: string
): TeacherInvigilatorDutyItem[] {
  const duties: TeacherInvigilatorDutyItem[] = [];
  for (const r of routines) {
    if (r.schoolId !== schoolId || r.status !== 'Published') continue;
    for (const s of r.slots) {
      if (s.invigilatorTeacherId === teacherId) {
        duties.push({
          routineId: r.id,
          examTitleBn: r.examTitleBn,
          examTitleEn: r.examTitleEn,
          className: r.className,
          section: r.section,
          slot: s,
        });
      }
    }
  }
  return duties.sort((a, b) => a.slot.examDate.localeCompare(b.slot.examDate));
}

export function exportExamRoutineCsv(routine: ExamRoutineRecord): string {
  const headers = [
    'Exam',
    'Academic Year',
    'Class',
    'Section',
    'Date',
    'Start Time',
    'End Time',
    'Duration (min)',
    'Subject',
    'Exam Type',
    'Full Marks',
    'Room',
    'Seat Allocation',
    'Invigilator',
  ];
  const rows = routine.slots.map((s) => [
    routine.examTitleEn,
    routine.academicYear,
    routine.className,
    routine.section,
    s.examDate,
    s.startTime,
    s.endTime,
    String(s.durationMins),
    s.subjectEn,
    s.examType,
    String(s.fullMarks),
    s.room,
    s.seatAllocation,
    s.invigilatorTeacherName,
  ]);
  return [headers, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n');
}
