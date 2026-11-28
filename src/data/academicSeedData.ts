import type {
  AcademicCalendarEvent,
  AcademicSubjectConfig,
  AcademicYearRecord,
  ClassSectionRoomConfig,
  ClassTestQuizItem,
  ClassworkItem,
  CurriculumUnit,
  DailyLessonHomeworkItem,
  ExamScheduleItem,
  ExtraAcademicItem,
  LessonPlanItem,
  QuestionBankItem,
  ResultAuditEntry,
  StudyMaterialItem,
  SubjectResultSubmission,
  SubstitutePermissionRecord,
  TeacherAttendanceLog,
  TeacherSubjectAssignment,
} from '../types';

export const INITIAL_ACADEMIC_YEARS: AcademicYearRecord[] = [];
export const INITIAL_CALENDAR_EVENTS: AcademicCalendarEvent[] = [];
export const INITIAL_CLASS_SECTIONS: ClassSectionRoomConfig[] = [];
export const INITIAL_ACADEMIC_SUBJECTS: AcademicSubjectConfig[] = [];
export const INITIAL_TEACHER_ASSIGNMENTS: TeacherSubjectAssignment[] = [];
export const INITIAL_TEACHER_ATTENDANCE: TeacherAttendanceLog[] = [];
export const INITIAL_CLASSWORKS: ClassworkItem[] = [];
export const INITIAL_CURRICULUM_UNITS: CurriculumUnit[] = [];
export const INITIAL_LESSON_PLANS: LessonPlanItem[] = [];
export const INITIAL_STUDY_MATERIALS: StudyMaterialItem[] = [];
export const INITIAL_CLASS_TESTS: ClassTestQuizItem[] = [];
export const INITIAL_QUESTION_BANK: QuestionBankItem[] = [];
export const INITIAL_EXAM_SCHEDULES: ExamScheduleItem[] = [];
export const INITIAL_EXTRA_ACADEMIC_ITEMS: ExtraAcademicItem[] = [];
export const INITIAL_DAILY_LESSONS: DailyLessonHomeworkItem[] = [];
export const INITIAL_SUBSTITUTE_PERMISSIONS: SubstitutePermissionRecord[] = [];
export const INITIAL_RESULT_SUBMISSIONS: SubjectResultSubmission[] = [];
export const INITIAL_RESULT_AUDIT_LOGS: ResultAuditEntry[] = [];
