import type {
  ExamCategoryType,
  ExamMarkEntry,
  ExamRecord,
  NotificationItem,
  Role,
  StudentRecord,
  TeacherRecord,
  TeacherSubjectAssignment,
} from '../types';

export const EXAM_CATEGORY_LABELS: Record<
  ExamCategoryType,
  { labelBn: string; labelEn: string; centralControlled: boolean }
> = {
  term_1: {
    labelBn: 'প্রথম সাময়িক / ১ম প্রান্তিক মূল্যায়ন',
    labelEn: '1st Term / Quarterly Assessment',
    centralControlled: true,
  },
  term_2: {
    labelBn: 'দ্বিতীয় সাময়িক / ২য় প্রান্তিক মূল্যায়ন',
    labelEn: '2nd Term / Mid-Year Assessment',
    centralControlled: true,
  },
  term_3_annual: {
    labelBn: 'বার্ষিক / ৩য় প্রান্তিক মূল্যায়ন',
    labelEn: 'Annual / 3rd Term Assessment',
    centralControlled: true,
  },
  class_test: {
    labelBn: 'Class Test (শ্রেণি পরীক্ষা)',
    labelEn: 'Class Test',
    centralControlled: false,
  },
  model_test: {
    labelBn: 'Model Test (মডেল টেস্ট)',
    labelEn: 'Model Test',
    centralControlled: false,
  },
  weekly_test: {
    labelBn: 'Weekly Test (সাপ্তাহিক পরীক্ষা)',
    labelEn: 'Weekly Test',
    centralControlled: false,
  },
  monthly_test: {
    labelBn: 'Monthly Test (মাসিক পরীক্ষা)',
    labelEn: 'Monthly Test',
    centralControlled: false,
  },
  custom: {
    labelBn: 'অন্যান্য / Custom Exam',
    labelEn: 'Custom Exam',
    centralControlled: false,
  },
};

export function isCentralControlledExamCategory(category?: ExamCategoryType): boolean {
  return category === 'term_1' || category === 'term_2' || category === 'term_3_annual';
}

export function isExamCentralPublished(exam: ExamRecord): boolean {
  const central =
    exam.isCentralControlled ?? isCentralControlledExamCategory(exam.examCategory);
  if (!central) return true;
  return exam.centralPublished !== false;
}

export function getVisibleExamsForRole(
  exams: ExamRecord[],
  ctx: {
    role: Role;
    schoolId?: string;
    studentClass?: string;
  }
): ExamRecord[] {
  return exams.filter((ex) => {
    // Central Admin sees all term & school exams for oversight & publishing control
    if (ctx.role === 'central_admin') {
      if (ctx.schoolId && ex.schoolId && ex.schoolId !== ctx.schoolId) return false;
      return true;
    }

    // Strict Multi-School Isolation
    if (ctx.schoolId && ex.schoolId && ex.schoolId !== ctx.schoolId) {
      return false;
    }

    // CRITICAL RULE: 1st, 2nd & 3rd Term Exams remain completely hidden until Central Admin publishes!
    const central = ex.isCentralControlled ?? isCentralControlledExamCategory(ex.examCategory);
    if (central && ex.centralPublished !== true) {
      return false;
    }

    // Student / Guardian only see exams for their class (or multi-class exams)
    if ((ctx.role === 'student' || ctx.role === 'guardian') && ctx.studentClass) {
      const hasClassEntry = ex.entries.some(
        (e) => (e.className ?? ex.className) === ctx.studentClass
      );
      if (ex.className !== ctx.studentClass && !hasClassEntry) {
        return false;
      }
    }

    return true;
  });
}

export interface CreateLocalExamPayload {
  schoolId: string;
  academicYear?: string;
  titleBn: string;
  titleEn: string;
  examCategory: ExamCategoryType;
  className: string;
  section?: string;
  subjectBn: string;
  subjectEn: string;
  examDate: string;
  startTime: string;
  durationMins: number;
  fullMarks: number;
  passMarks?: number;
  instructionsBn: string;
  instructionsEn?: string;
  createdByRole: Role;
  createdByName: string;
  createdByTeacherId?: string;
  students: StudentRecord[];
}

export function createExamWithGovernance(payload: CreateLocalExamPayload): ExamRecord {
  const isCentral = isCentralControlledExamCategory(payload.examCategory);
  const classStudents = payload.students
    .filter(
      (s) =>
        s.schoolId === payload.schoolId &&
        s.className === payload.className &&
        (!payload.section || payload.section === 'All' || s.section === payload.section)
    )
    .sort((a, b) => a.roll - b.roll);

  const passMarks = payload.passMarks ?? Math.round(payload.fullMarks * 0.33);

  const entries: ExamMarkEntry[] = classStudents.map((stu) => ({
    studentId: stu.id,
    studentName: stu.nameBn,
    roll: stu.roll,
    className: stu.className,
    subjectBn: payload.subjectBn,
    subjectEn: payload.subjectEn,
    written: 0,
    mcq: 0,
    oral: 0,
    continuous: 0,
    fullMarks: payload.fullMarks,
    passMarks,
  }));

  return {
    id: `exm-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 90 + 10)}`,
    schoolId: payload.schoolId,
    academicYear: payload.academicYear ?? '২০২৬ শিক্ষাবর্ষ',
    titleBn: payload.titleBn.trim(),
    titleEn: payload.titleEn.trim() || payload.titleBn.trim(),
    className: payload.className,
    section: payload.section ?? 'ক (A)',
    dateRange: `${payload.examDate} (${payload.startTime})`,
    status: 'marks_entry',
    examCategory: payload.examCategory,
    isCentralControlled: isCentral,
    centralApproved: !isCentral,
    centralPublished: !isCentral,
    subjectBn: payload.subjectBn,
    subjectEn: payload.subjectEn,
    examDate: payload.examDate,
    startTime: payload.startTime,
    durationMins: payload.durationMins,
    fullMarks: payload.fullMarks,
    instructionsBn: payload.instructionsBn,
    instructionsEn: payload.instructionsEn ?? payload.instructionsBn,
    createdByRole: payload.createdByRole,
    createdByName: payload.createdByName,
    createdByTeacherId: payload.createdByTeacherId,
    participantStudentIds: classStudents.map((s) => s.id),
    entries,
  };
}

export function setCentralTermExamPublished(
  exams: ExamRecord[],
  examId: string,
  publish: boolean
): {
  updatedExams: ExamRecord[];
  targetExam?: ExamRecord;
  notificationsToSend: Omit<NotificationItem, 'id' | 'time' | 'read'>[];
} {
  const target = exams.find((e) => e.id === examId);
  if (!target) return { updatedExams: exams, notificationsToSend: [] };

  const cleanTitleBn = publish
    ? target.titleBn.replace(/\s*\(কেন্দ্রীয় অনুমোদন অপেক্ষমান\)/g, '')
    : target.titleBn;
  const cleanTitleEn = publish
    ? target.titleEn.replace(/\s*\(Pending Central Publish\)/g, '')
    : target.titleEn;
  const cleanInstructionsBn =
    publish && target.instructionsBn?.includes('গোপন ও লক থাকবে')
      ? 'কেন্দ্রীয় প্রশাসন কর্তৃক প্রকাশিত — অনুমোদিত সময়সূচি অনুযায়ী মূল্যায়ন সম্পন্ন হবে।'
      : target.instructionsBn;

  const updatedExam: ExamRecord = {
    ...target,
    titleBn: cleanTitleBn,
    titleEn: cleanTitleEn,
    instructionsBn: cleanInstructionsBn,
    centralApproved: publish,
    centralPublished: publish,
    status: publish ? 'published' : 'held',
  };

  const updatedExams = exams.map((e) => (e.id === examId ? updatedExam : e));

  // No notifications may go out when Central Admin unpublishes/holds a term exam!
  if (!publish) {
    return { updatedExams, targetExam: updatedExam, notificationsToSend: [] };
  }

  const targetRoles: Role[] = ['school_admin', 'teacher', 'student', 'guardian'];
  const notificationsToSend: Omit<NotificationItem, 'id' | 'time' | 'read'>[] = targetRoles.map(
    (r) => ({
      roleTarget: r,
      schoolId: target.schoolId,
      category: 'exam_result',
      priority: 'important',
      type: 'success',
      dateLabel: '2026-11-19',
      createdAtIso: '2026-11-19T11:00:00',
      targetTab: r === 'teacher' ? 'assessment' : r === 'central_admin' ? 'academics' : 'exams',
      targetExamId: target.id,
      titleBn: `কেন্দ্রীয়ভাবে পরীক্ষা ও ফলাফল প্রকাশিত: ${target.titleBn}`,
      titleEn: `Centrally Published Exam: ${target.titleEn}`,
      messageBn: `${target.className}-এর ${target.titleBn} Central Admin কর্তৃক অনুমোদিত ও প্রকাশিত হয়েছে। এখন পরীক্ষা ও ফলাফল দেখা যাবে।`,
      messageEn: `${target.titleEn} (${target.className}) has been approved & published by Central Admin.`,
    })
  );

  return { updatedExams, targetExam: updatedExam, notificationsToSend };
}

export function canActorEditExamMarks(
  exam: ExamRecord,
  role: Role,
  teacher?: TeacherRecord,
  teacherAssignments: TeacherSubjectAssignment[] = []
): boolean {
  if (!isExamCentralPublished(exam) && role !== 'central_admin') {
    return false;
  }
  if (role === 'central_admin' || role === 'school_admin') return true;
  if (role === 'teacher' && teacher) {
    if (exam.createdByTeacherId && exam.createdByTeacherId === teacher.id) return true;
    if (exam.subjectEn || exam.subjectBn) {
      return teacherAssignments.some(
        (ta) =>
          ta.teacherId === teacher.id &&
          ta.className === exam.className &&
          (ta.subjectEn.toLowerCase() === (exam.subjectEn ?? '').toLowerCase() ||
            ta.subjectBn === exam.subjectBn)
      );
    }
    return teacherAssignments.some(
      (ta) => ta.teacherId === teacher.id && ta.className === exam.className
    );
  }
  return false;
}

export function pickPrimaryTermOrPublishedExam(exams: ExamRecord[]): ExamRecord | undefined {
  return (
    exams.find(
      (e) =>
        (e.isCentralControlled ?? isCentralControlledExamCategory(e.examCategory)) &&
        e.status === 'published'
    ) ??
    exams.find((e) => e.status === 'published') ??
    exams.find((e) => e.isCentralControlled ?? isCentralControlledExamCategory(e.examCategory)) ??
    exams[0]
  );
}
