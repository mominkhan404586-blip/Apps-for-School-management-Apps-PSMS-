import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Ban,
  BarChart3,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Plus,
  Presentation,
  Radio,
  RefreshCw,
  Rocket,
  RotateCcw,
  ScrollText,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import type {
  AcademicCalendarEvent,
  AcademicCalendarEventType,
  AcademicCancelClassReason,
  AcademicModuleId,
  AcademicSubjectConfig,
  AcademicYearRecord,
  AssignmentItem,
  ClassSectionRoomConfig,
  ClassTestQuizItem,
  ClassworkItem,
  CurriculumUnit,
  DailyLessonHomeworkItem,
  ExamRecord,
  ExamScheduleItem,
  ExtraAcademicItem,
  GradingRuleItem,
  Language,
  LessonPlanItem,
  MasterRoutineRecord,
  QuestionBankItem,
  ResultAuditEntry,
  RoutineSlot,
  SchoolRecord,
  StudentRecord,
  StudyMaterialItem,
  SubjectResultSubmission,
  SubstitutePermissionRecord,
  SubstituteReason,
  TeacherRecord,
  TeacherSubjectAssignment,
} from '../types';
import {
  CANCEL_CLASS_REASONS,
  SUBSTITUTE_REASONS,
  calculateCustomGradeAndGPA,
  computeClassworkStats,
  computeEntryTotalMarks,
  computeTeacherWorkload,
} from '../utils/academicEngine';
import { computeStudentMeritList } from '../utils/rbacAndGrading';
import { b } from '../i18n/translations';
import { ProgressMeter } from './Charts';
import {
  AcademicCertificatesDocsPanel,
  AcademicReportsPanel,
  StudentAcademicProgressPanel,
} from './AcademicProgressAndDocsPanel';
import { CleanRowActionBar } from './ActionMenuAndDeleteModal';
import { TodaysLessonsPanel } from './TodaysLessonsPanel';
import {
  SchoolAdminResultManagementPanel,
  StudentMarksheetModal,
} from './ResultGovernancePanels';
import { RoutineManagementSystem } from './RoutineManagementSystem';

interface AcademicManagementHubProps {
  lang: Language;
  readOnlyOversight?: boolean;
  initialModule?: AcademicModuleId;
  school: SchoolRecord;
  students: StudentRecord[];
  teachers: TeacherRecord[];
  routineSlots: RoutineSlot[];
  masterRoutines?: MasterRoutineRecord[];
  onUpdateMasterRoutines?: (next: MasterRoutineRecord[], toastMsg?: string) => void;
  exams: ExamRecord[];
  assignments: AssignmentItem[];
  academicYears: AcademicYearRecord[];
  onCreateAcademicYear: (yearLabel: string, startDate: string, endDate: string) => void;
  onSelectCurrentAcademicYear: (yearId: string) => void;
  onAddTermToYear: (yearId: string, nameBn: string, startDate: string, endDate: string) => void;
  calendarEvents: AcademicCalendarEvent[];
  onAddCalendarEvent: (ev: Omit<AcademicCalendarEvent, 'id'>) => void;
  classSections: ClassSectionRoomConfig[];
  onAddClassSection: (cfg: Omit<ClassSectionRoomConfig, 'id'>) => void;
  subjects: AcademicSubjectConfig[];
  onAddSubject: (sub: Omit<AcademicSubjectConfig, 'id'>) => void;
  teacherAssignments: TeacherSubjectAssignment[];
  onSaveTeacherAssignment: (item: Omit<TeacherSubjectAssignment, 'id' | 'assignedDate'>) => void;
  onReplaceAssignedTeacher: (assignmentId: string, newTeacherId: string) => void;
  onCreateRoutineSlot: (slot: Omit<RoutineSlot, 'id'>) => void;
  onUpdateRoutineSlot: (slotId: string, patch: Partial<RoutineSlot>, unlockNext?: boolean) => void;
  onAssignSubstituteTeacher: (slotId: string, teacherId: string, reason: SubstituteReason) => void;
  classworks: ClassworkItem[];
  onCreateClasswork: (cw: Omit<ClassworkItem, 'id'>) => void;
  onUpdateClassworkStudentStatus: (
    classworkId: string,
    studentId: string,
    status: 'completed' | 'pending' | 'not_submitted',
    feedback?: string
  ) => void;
  curriculumUnits: CurriculumUnit[];
  lessonPlans: LessonPlanItem[];
  onAddLessonPlan: (lp: Omit<LessonPlanItem, 'id'>) => void;
  studyMaterials: StudyMaterialItem[];
  classTests: ClassTestQuizItem[];
  questionBank: QuestionBankItem[];
  examSchedules: ExamScheduleItem[];
  gradingRules: GradingRuleItem[];
  onUpdateGradingRule: (ruleId: string, patch: Partial<GradingRuleItem>) => void;
  extraItems: ExtraAcademicItem[];
  onUpdateExamMark: (examId: string, studentId: string, subjectEn: string, written: number, mcq?: number) => void;
  onToggleExamStatus: (examId: string, status: ExamRecord['status'], reason: string) => void;
  onPromoteAllEligible: () => void;
  dailyLessons?: DailyLessonHomeworkItem[];
  substitutePermissions?: SubstitutePermissionRecord[];
  subjectSubmissions?: SubjectResultSubmission[];
  resultAuditLogs?: ResultAuditEntry[];
  onReviewSubstitutePermission?: (permissionId: string, action: 'approve' | 'revoke') => void;
  onCancelClassSlot?: (slotId: string, reason: AcademicCancelClassReason | string, remarks?: string) => void;
  onRestoreClassSlot?: (slotId: string) => void;
  onSendDelayedTeacherAlert?: (
    teacherId: string,
    teacherName: string,
    subjectBn: string,
    channel: 'notice' | 'message'
  ) => void;
  onTogglePublishResult?: (examId: string, publish: boolean) => void;
  externalModule?: AcademicModuleId;
  favoriteModules?: AcademicModuleId[];
  onToggleFavorite?: (moduleId: AcademicModuleId) => void;
  recentModules?: AcademicModuleId[];
  onRecordRecent?: (moduleId: AcademicModuleId) => void;
}

const MODULE_GROUPS: Array<{
  key: string;
  groupBn: string;
  groupEn: string;
  items: Array<{ id: AcademicModuleId; bn: string; en: string; icon: React.ComponentType<{ className?: string }> }>;
}> = [
  {
    key: 'dashboard',
    groupBn: '১. Academic Dashboard',
    groupEn: '1. Academic Dashboard',
    items: [{ id: 'academic_dashboard', bn: 'Academic Dashboard', en: 'Academic Dashboard', icon: LayoutDashboard }],
  },
  {
    key: 'planning',
    groupBn: '২. Planning ও শিক্ষাবর্ষ',
    groupEn: '2. Planning & Calendar',
    items: [
      { id: 'academic_year', bn: 'Academic Year / Term', en: 'Academic Year / Term', icon: Calendar },
      { id: 'academic_calendar', bn: 'Academic Calendar', en: 'Academic Calendar', icon: CalendarDays },
    ],
  },
  {
    key: 'classes',
    groupBn: '৩. Classes & Subjects',
    groupEn: '3. Classes & Subjects',
    items: [
      { id: 'class_management', bn: 'Class & Group / Section', en: 'Class & Section', icon: Layers },
      { id: 'subject_management', bn: 'Subject Management', en: 'Subject Management', icon: BookOpen },
    ],
  },
  {
    key: 'teachers',
    groupBn: '৪. Teacher & Routine',
    groupEn: '4. Teacher & Routine',
    items: [
      { id: 'teacher_assignment', bn: 'Teacher Subject Assignment', en: 'Teacher Assignment', icon: UserCheck },
      { id: 'class_routine', bn: 'Class Routine', en: 'Class Routine', icon: Clock },
      { id: 'live_class_monitor', bn: 'Live Class Monitor', en: 'Live Class Monitor', icon: Radio },
    ],
  },
  {
    key: 'teaching',
    groupBn: '৫. Teaching & Learning',
    groupEn: '5. Teaching & Learning',
    items: [
      { id: 'todays_lessons', bn: 'আজকের পড়া মনিটরিং', en: "Today's Lessons Monitor", icon: BookOpen },
      { id: 'curriculum', bn: 'Curriculum & Syllabus', en: 'Curriculum & Syllabus', icon: ScrollText },
      { id: 'lesson_plan', bn: 'Lesson Plan & Management', en: 'Lesson Management & Plan', icon: FileText },
      { id: 'study_materials', bn: 'Study Materials', en: 'Study Materials', icon: FolderOpen },
    ],
  },
  {
    key: 'tasks',
    groupBn: '৬. Daily Class Tasks',
    groupEn: '6. Daily Class Tasks',
    items: [
      { id: 'classwork', bn: 'Classwork / Daily Work', en: 'Classwork (In-Class)', icon: ClipboardCheck },
      { id: 'homework', bn: 'Homework', en: 'Homework', icon: ListChecks },
      { id: 'assignment', bn: 'Assignment', en: 'Assignment', icon: ClipboardList },
      { id: 'activity', bn: 'Activity, Project & Viva', en: 'Activity / Project / Viva', icon: Presentation },
    ],
  },
  {
    key: 'assessment',
    groupBn: '৭. Exams & Assessment',
    groupEn: '7. Exams & Assessment',
    items: [
      { id: 'class_test', bn: 'Class Test & Question Bank', en: 'Quiz & Question Bank', icon: FileSpreadsheet },
      { id: 'exam', bn: 'Exam & Exam Schedule', en: 'Exam & Schedule', icon: CalendarDays },
      { id: 'marks_entry', bn: 'Marks Entry & CA', en: 'Marks Entry & CA', icon: Award },
      { id: 'grading_scheme', bn: 'Grading & Marking Scheme', en: 'Grading Scheme', icon: Sparkles },
    ],
  },
  {
    key: 'results',
    groupBn: '৮. Results & Progress',
    groupEn: '8. Results & Progress',
    items: [
      { id: 'result', bn: 'Result & Merit Ranking', en: 'Result & Merit List', icon: GraduationCap },
      { id: 'student_progress', bn: 'Student Academic Progress', en: 'Student Progress', icon: TrendingUp },
      { id: 'certificates', bn: 'Certificates & Documents', en: 'Academic Documents', icon: FileText },
    ],
  },
  {
    key: 'reports',
    groupBn: '৯. Support & Reports',
    groupEn: '9. Support & Reports',
    items: [
      { id: 'learning_outcome', bn: 'Competency, Remedial & Promotion', en: 'Support & Promotion', icon: LifeBuoy },
      { id: 'academic_reports', bn: 'Academic Reports (14)', en: 'Academic Reports (14)', icon: BarChart3 },
    ],
  },
];

export const AcademicManagementHub: React.FC<AcademicManagementHubProps> = ({
  lang,
  readOnlyOversight = false,
  initialModule = 'academic_dashboard',
  school,
  students,
  teachers,
  routineSlots,
  masterRoutines = [],
  onUpdateMasterRoutines,
  exams,
  assignments,
  academicYears,
  onCreateAcademicYear,
  onSelectCurrentAcademicYear,
  onAddTermToYear,
  calendarEvents,
  onAddCalendarEvent,
  classSections,
  onAddClassSection,
  subjects,
  onAddSubject,
  teacherAssignments,
  onSaveTeacherAssignment,
  onReplaceAssignedTeacher,
  onCreateRoutineSlot,
  onUpdateRoutineSlot,
  onAssignSubstituteTeacher,
  classworks,
  onCreateClasswork,
  onUpdateClassworkStudentStatus,
  curriculumUnits,
  lessonPlans,
  onAddLessonPlan,
  studyMaterials,
  classTests,
  questionBank,
  examSchedules,
  gradingRules,
  onUpdateGradingRule,
  extraItems,
  onUpdateExamMark,
  onToggleExamStatus,
  onPromoteAllEligible,
  dailyLessons = [],
  substitutePermissions = [],
  subjectSubmissions = [],
  resultAuditLogs = [],
  onReviewSubstitutePermission,
  onCancelClassSlot,
  onRestoreClassSlot,
  onSendDelayedTeacherAlert,
  onTogglePublishResult,
  externalModule,
  favoriteModules = ['class_routine', 'todays_lessons', 'result'],
  onToggleFavorite,
  recentModules = ['academic_dashboard', 'live_class_monitor', 'teacher_assignment'],
  onRecordRecent,
}) => {
  const [activeModule, setActiveModule] = useState<AcademicModuleId>(externalModule ?? initialModule);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['dashboard']);
  const [localFavorites, setLocalFavorites] = useState<AcademicModuleId[]>(favoriteModules);
  const [localRecent, setLocalRecent] = useState<AcademicModuleId[]>(recentModules);

  // Context-Based Class + Subject Workspace
  const [contextOpen, setContextOpen] = useState(false);
  const [contextClass, setContextClass] = useState('Class 4');
  const [contextSubjectEn, setContextSubjectEn] = useState('Mathematics');
  const [contextTab, setContextTab] = useState<
    'overview' | 'lessons' | 'classwork' | 'homework' | 'assignment' | 'assessment' | 'marks' | 'progress' | 'materials'
  >('overview');

  // Cancel Class Modal & Quick View/Marksheet State
  const [cancelModalSlot, setCancelModalSlot] = useState<RoutineSlot | null>(null);
  const [cancelReason, setCancelReason] = useState<AcademicCancelClassReason>('Teacher Unavailable');
  const [cancelRemarks, setCancelRemarks] = useState('');
  const [detailModal, setDetailModal] = useState<{ title: string; lines: string[] } | null>(null);
  const [marksheetStudent, setMarksheetStudent] = useState<StudentRecord | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  useEffect(() => {
    if (externalModule) {
      setActiveModule(externalModule);
      const grp = MODULE_GROUPS.find((g) => g.items.some((i) => i.id === externalModule));
      if (grp && !expandedGroups.includes(grp.key)) {
        setExpandedGroups((prev) => [...prev, grp.key]);
      }
    }
  }, [externalModule]);

  const effectiveFavorites = onToggleFavorite ? favoriteModules : localFavorites;
  const effectiveRecent = onRecordRecent ? recentModules : localRecent;

  const selectModule = (id: AcademicModuleId) => {
    setActiveModule(id);
    const grp = MODULE_GROUPS.find((g) => g.items.some((i) => i.id === id));
    if (grp && !expandedGroups.includes(grp.key)) {
      setExpandedGroups((prev) => [...prev, grp.key]);
    }
    if (onRecordRecent) {
      onRecordRecent(id);
    } else {
      setLocalRecent((prev) => [id, ...prev.filter((m) => m !== id)].slice(0, 6));
    }
  };

  const handleStarClick = (id: AcademicModuleId) => {
    if (onToggleFavorite) {
      onToggleFavorite(id);
    } else {
      setLocalFavorites((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
    }
  };

  const allModuleItems = useMemo(() => MODULE_GROUPS.flatMap((g) => g.items), []);
  const activeModuleMeta = allModuleItems.find((i) => i.id === activeModule);

  // Academic Year Draft
  const [newYearLabel, setNewYearLabel] = useState('২০২৭ শিক্ষাবর্ষ (Academic Year 2027)');
  const [newYearStart, setNewYearStart] = useState('2027-01-01');
  const [newYearEnd, setNewYearEnd] = useState('2027-12-31');
  const [newTermName, setNewTermName] = useState('');

  // Teacher Subject Assignment Draft
  const [assignTeacherId, setAssignTeacherId] = useState(teachers[0]?.id ?? '');
  const [assignSubjectId, setAssignSubjectId] = useState(subjects[0]?.id ?? '');
  const [assignClass, setAssignClass] = useState('Class 4');
  const [assignSection, setAssignSection] = useState('ক (A)');
  const [assignRoom, setAssignRoom] = useState('204');
  const [assignPeriods, setAssignPeriods] = useState(5);

  // Routine & Substitute Draft
  const [routineDayFilter, setRoutineDayFilter] = useState('সকল দিন (All)');
  const [routineNewDay, setRoutineNewDay] = useState('রবিবার (Sun)');
  const [routineNewPeriod, setRoutineNewPeriod] = useState(5);
  const [routineNewTime, setRoutineNewTime] = useState('01:15 PM – 02:00 PM');
  const [routineNewClass, setRoutineNewClass] = useState('Class 4');
  const [routineNewSubject, setRoutineNewSubject] = useState('বিজ্ঞান');
  const [routineNewTeacherId, setRoutineNewTeacherId] = useState(teachers[0]?.id ?? '');
  const [routineNewRoom, setRoutineNewRoom] = useState('204');

  // Substitute / Admin Live Reassign
  const [reassignSlotId, setReassignSlotId] = useState<string | null>(null);
  const [reassignTeacherId, setReassignTeacherId] = useState(teachers[1]?.id ?? teachers[0]?.id ?? '');
  const [reassignReason, setReassignReason] = useState<SubstituteReason>('Teacher Absent');

  // Classwork Draft (separate from Homework/Assignment)
  const [cwTitle, setCwTitle] = useState('');
  const [cwSubject, setCwSubject] = useState('গণিত');
  const [cwTopic, setCwTopic] = useState('');
  const [cwFeedbackDraft, setCwFeedbackDraft] = useState<Record<string, string>>({});

  // Calendar Event Draft
  const [calType, setCalType] = useState<AcademicCalendarEventType>('exam');
  const [calDate, setCalDate] = useState('2026-12-05');
  const [calTitle, setCalTitle] = useState('');

  // Question Paper Preview selection
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>(questionBank.map((q) => q.id));

  // Class & Subject Draft
  const [newClassName, setNewClassName] = useState('Class 6');
  const [newSectionName, setNewSectionName] = useState('ক (A)');
  const [newRoomNo, setNewRoomNo] = useState('301');
  const [newSubCode, setNewSubCode] = useState('NCTB-108');
  const [newSubNameBn, setNewSubNameBn] = useState('');
  const [newSubNameEn, setNewSubNameEn] = useState('');

  const currentYear = academicYears.find((y) => y.isCurrent) ?? academicYears[0];
  const cwStats = useMemo(() => computeClassworkStats(classworks), [classworks]);
  const liveCount = routineSlots.filter((r) => r.status === 'in_progress').length;
  const completedCount = routineSlots.filter((r) => r.status === 'completed').length;
  const exam = exams[0];
  const meritList = useMemo(() => computeStudentMeritList(exam?.entries ?? []), [exam]);

  const handleAssignTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tch = teachers.find((t) => t.id === assignTeacherId);
    const sub = subjects.find((s) => s.id === assignSubjectId);
    if (!tch || !sub) return;
    onSaveTeacherAssignment({
      academicYear: currentYear?.yearLabel ?? '২০২৬ শিক্ষাবর্ষ',
      teacherId: tch.id,
      teacherName: tch.nameBn,
      subjectCode: sub.code,
      subjectBn: sub.nameBn,
      subjectEn: sub.nameEn,
      className: assignClass,
      section: assignSection,
      weeklyPeriods: assignPeriods,
      room: assignRoom,
      assignedBy: `${school.headTeacher} (School Admin)`,
    });
  };

  const handleCreateRoutineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tch = teachers.find((t) => t.id === routineNewTeacherId) ?? teachers[0];
    const subMatch = subjects.find((s) => s.nameBn === routineNewSubject);
    onCreateRoutineSlot({
      schoolId: school.id,
      dayOfWeek: routineNewDay,
      period: routineNewPeriod,
      timeRange: routineNewTime,
      className: routineNewClass,
      section: 'ক (A)',
      subjectBn: routineNewSubject,
      subjectEn: subMatch?.nameEn ?? routineNewSubject,
      teacherId: tch.id,
      teacherName: tch.nameBn,
      room: routineNewRoom,
      status: 'pending',
    });
  };

  const handleCreateClassworkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cwTitle.trim()) return;
    const subMatch = subjects.find((s) => s.nameBn === cwSubject);
    const classStudents = students.filter((s) => s.className === 'Class 4').slice(0, 4);
    onCreateClasswork({
      date: '2026-11-18',
      className: 'Class 4',
      section: 'ক (A)',
      subjectBn: cwSubject,
      subjectEn: subMatch?.nameEn ?? cwSubject,
      teacherId: teachers[0]?.id ?? 'tch-2',
      teacherName: teachers[0]?.nameBn ?? 'মোঃ আব্দুর রহিম',
      titleBn: cwTitle.trim(),
      titleEn: cwTitle.trim(),
      topic: cwTopic.trim() || 'দৈনিক শ্রেণির কাজ',
      studentStatuses: (classStudents.length > 0 ? classStudents : students.slice(0, 3)).map((st) => ({
        studentId: st.id,
        studentName: st.nameBn,
        roll: st.roll,
        status: 'pending',
      })),
    });
    setCwTitle('');
    setCwTopic('');
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono font-semibold text-blue-700 dark:text-blue-400">
            {school.nameBn} ({school.code}) · {currentYear?.yearLabel}
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            {b('একাডেমিক ম্যানেজমেন্ট সিস্টেম (Academic Management)', 'Comprehensive Academic Management Hub', lang)}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {b(
              'ক্লাস, বিষয়, শিক্ষক বণ্টন, রুটিন, লাইভ ক্লাস মনিটর, Classwork, পরীক্ষা, গ্রেডিং, প্রগ্রেস, ডকুমেন্ট ও ১৪টি রিপোর্ট।',
              'Classes, Subjects, Teacher Workload, Weekly Routine, Live Class Monitor, Classwork, Grading, Progress, Docs & 14 Reports.',
              lang
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
          <button
            type="button"
            onClick={() => selectModule('live_class_monitor')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer whitespace-nowrap"
          >
            <Radio className="w-3.5 h-3.5" />
            {b(`লাইভ ক্লাস (${liveCount})`, `Live Classes (${liveCount})`, lang)}
          </button>
          <button
            type="button"
            onClick={() => setContextOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border font-semibold cursor-pointer whitespace-nowrap ${
              contextOpen
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {b(`কনটেক্সট: ${contextClass} · ${contextSubjectEn}`, `Context: ${contextClass} · ${contextSubjectEn}`, lang)}
          </button>
          <button
            type="button"
            onClick={() => selectModule('academic_reports')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer whitespace-nowrap"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            {b('১৪টি রিপোর্ট', '14 Reports', lang)}
          </button>
        </div>
      </div>

      {/* Favorites + Recent Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-amber-700 dark:text-amber-400">⭐ {b('প্রিয় মডিউল:', 'Favorites:', lang)}</span>
          {effectiveFavorites.map((favId) => {
            const meta = allModuleItems.find((i) => i.id === favId);
            if (!meta) return null;
            return (
              <button
                key={favId}
                type="button"
                onClick={() => selectModule(favId)}
                className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer transition-colors ${
                  activeModule === favId
                    ? 'bg-blue-700 text-white'
                    : 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/70'
                }`}
              >
                {b(meta.bn, meta.en, lang)}
              </button>
            );
          })}
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="font-semibold text-slate-500">🕘 {b('সাম্প্রতিক:', 'Recent:', lang)}</span>
          {effectiveRecent.slice(0, 4).map((recId) => {
            const meta = allModuleItems.find((i) => i.id === recId);
            if (!meta) return null;
            return (
              <button
                key={`rec-${recId}`}
                type="button"
                onClick={() => selectModule(recId)}
                className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium cursor-pointer"
              >
                {b(meta.bn, meta.en, lang)}
              </button>
            );
          })}
        </div>
        {activeModuleMeta && (
          <button
            type="button"
            onClick={() => handleStarClick(activeModule)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer whitespace-nowrap"
          >
            <Star
              className={`w-3.5 h-3.5 ${
                effectiveFavorites.includes(activeModule) ? 'fill-amber-400 text-amber-500' : 'text-slate-400'
              }`}
            />
            {effectiveFavorites.includes(activeModule)
              ? b('প্রিয় থেকে সরান', 'Favorited', lang)
              : b('প্রিয়তে রাখুন', 'Add Favorite', lang)}
          </button>
        )}
      </div>

      {/* Context-Based Class + Subject Workspace (Optional Collapsible Focus Mode) */}
      {contextOpen && (
        <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl p-5 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                {b('কনটেক্সট-ভিত্তিক ওয়ার্কস্পেস (Class + Subject Focus)', 'Context-Based Class + Subject Workspace', lang)}
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {contextClass} · {contextSubjectEn}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={contextClass}
                onChange={(e) => setContextClass(e.target.value)}
                aria-label="Context Class"
                className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              >
                {Array.from(new Set(['Class 4', 'Class 5', ...classSections.map((c) => c.className)])).map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
              <select
                value={contextSubjectEn}
                onChange={(e) => setContextSubjectEn(e.target.value)}
                aria-label="Context Subject"
                className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.nameEn}>
                    {b(sub.nameBn, sub.nameEn, lang)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2.5">
            {(
              [
                { id: 'overview', label: b('Overview', 'Overview', lang) },
                { id: 'lessons', label: b('Lessons (আজকের পড়া)', 'Lessons', lang) },
                { id: 'classwork', label: 'Classwork' },
                { id: 'homework', label: 'Homework' },
                { id: 'assignment', label: 'Assignment' },
                { id: 'assessment', label: 'Assessment' },
                { id: 'marks', label: 'Marks' },
                { id: 'progress', label: 'Progress' },
                { id: 'materials', label: 'Study Materials' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setContextTab(t.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  contextTab === t.id
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {contextTab === 'overview' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500">{b('নির্ধারিত শিক্ষক', 'Assigned Teachers', lang)}</div>
                <div className="font-bold text-sm mt-1">
                  {teacherAssignments.filter((t) => t.className === contextClass && t.subjectEn === contextSubjectEn).length || 1}
                </div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500">{b('রুটিন স্লট', 'Routine Slots', lang)}</div>
                <div className="font-bold text-sm mt-1 tabular-nums">
                  {routineSlots.filter((r) => r.className === contextClass && r.subjectEn === contextSubjectEn).length}
                </div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500">{b('আজকের পড়া', 'Daily Lessons', lang)}</div>
                <div className="font-bold text-sm mt-1 tabular-nums">
                  {dailyLessons.filter((d) => d.className === contextClass && d.subjectEn === contextSubjectEn).length}
                </div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500">{b('নম্বর এন্ট্রি', 'Mark Entries', lang)}</div>
                <div className="font-bold text-sm mt-1 tabular-nums">
                  {(exam?.entries ?? []).filter((e) => e.subjectEn === contextSubjectEn).length}
                </div>
              </div>
            </div>
          )}

          {contextTab === 'lessons' && (
            <div className="space-y-2">
              {dailyLessons
                .filter((d) => d.className === contextClass && d.subjectEn === contextSubjectEn)
                .map((d) => (
                  <div key={d.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold">{d.lessonTitleBn}</div>
                      <div className="text-slate-500">{d.homeworkTextBn} · Due: {d.dueDate}</div>
                    </div>
                    <span className="font-mono text-blue-700 dark:text-blue-400">{d.date}</span>
                  </div>
                ))}
            </div>
          )}

          {contextTab === 'classwork' && (
            <div className="space-y-2">
              {classworks
                .filter((c) => c.className === contextClass && c.subjectEn === contextSubjectEn)
                .map((c) => (
                  <div key={c.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="font-bold">{b(c.titleBn, c.titleEn, lang)}</div>
                    <div className="text-slate-500">{c.topic} · {c.date}</div>
                  </div>
                ))}
            </div>
          )}

          {(contextTab === 'homework' || contextTab === 'assignment') && (
            <div className="space-y-2">
              {assignments
                .filter((a) => a.subjectEn === contextSubjectEn && (contextTab === 'homework' ? a.isHomework : !a.isHomework))
                .map((a) => (
                  <div key={a.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between">
                    <span className="font-semibold">{b(a.titleBn, a.titleEn, lang)}</span>
                    <span className="text-slate-500">Due: {a.dueDate} · {a.status}</span>
                  </div>
                ))}
            </div>
          )}

          {(contextTab === 'assessment' || contextTab === 'marks') && (
            <div className="space-y-2">
              {(exam?.entries ?? [])
                .filter((e) => e.subjectEn === contextSubjectEn)
                .map((e) => (
                  <div key={`${e.studentId}-${e.subjectEn}`} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between">
                    <span className="font-semibold">{e.studentName} (Roll {e.roll})</span>
                    <span className="tabular-nums font-bold">{computeEntryTotalMarks(e)} / {e.fullMarks}</span>
                  </div>
                ))}
            </div>
          )}

          {contextTab === 'progress' && (
            <div className="text-slate-600 dark:text-slate-300">
              {b(
                `${contextClass} · ${contextSubjectEn} গড় উপস্থিতি ৯৪% এবং সিলেবাস অগ্রগতি ৮৫%।`,
                `${contextClass} · ${contextSubjectEn} avg attendance 94% and syllabus coverage 85%.`,
                lang
              )}
            </div>
          )}

          {contextTab === 'materials' && (
            <div className="space-y-2">
              {studyMaterials
                .filter((m) => m.className === contextClass && m.subjectEn === contextSubjectEn)
                .map((m) => (
                  <div key={m.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between">
                    <span className="font-semibold">{b(m.titleBn, m.titleEn, lang)}</span>
                    <span className="font-mono text-blue-700 dark:text-blue-400">{m.materialType}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {actionToast && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-blue-900 dark:text-blue-200 flex items-center justify-between">
          <span>{actionToast}</span>
          <button type="button" onClick={() => setActionToast(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Split: Left 9-Category Collapsible Module Tree + Right Active Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <aside className="xl:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 space-y-1.5">
          {MODULE_GROUPS.map((grp) => {
            const isExpanded = expandedGroups.includes(grp.key);
            const hasActiveChild = grp.items.some((i) => i.id === activeModule);
            return (
              <div key={grp.key} className="border-b last:border-b-0 border-slate-100 dark:border-slate-800 pb-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedGroups((prev) =>
                      prev.includes(grp.key) ? prev.filter((k) => k !== grp.key) : [...prev, grp.key]
                    )
                  }
                  aria-expanded={isExpanded}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    hasActiveChild
                      ? 'text-blue-700 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{b(grp.groupBn, grp.groupEn, lang)}</span>
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                </button>
                {isExpanded && (
                  <div className="mt-1 pl-1.5 space-y-0.5">
                    {grp.items.map((item) => {
                      const Icon = item.icon;
                      const active = activeModule === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => selectModule(item.id)}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
                            active
                              ? 'bg-blue-700 text-white'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{b(item.bn, item.en, lang)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </aside>

        <section className="xl:col-span-9 space-y-5 min-w-0">
          {/* 1. Academic Dashboard */}
          {activeModule === 'academic_dashboard' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <div className="text-slate-500">{b('চলমান শিক্ষাবর্ষ', 'Active Academic Year', lang)}</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white mt-1 tabular-nums">2026</div>
                  <div className="text-emerald-700 dark:text-emerald-400 mt-0.5">{currentYear?.terms.find((t) => t.status === 'active')?.nameBn}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <div className="text-slate-500">{b('আজকের লাইভ / সম্পন্ন ক্লাস', 'Live / Completed Today', lang)}</div>
                  <div className="text-lg font-bold tabular-nums text-blue-700 dark:text-blue-400 mt-1">
                    {liveCount} Live · {completedCount}/{routineSlots.length}
                  </div>
                  <div className="text-slate-500 mt-0.5">{b('রুটিন সক্রিয়', 'Active Routine Slots', lang)}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <div className="text-slate-500">Classwork Completion</div>
                  <div className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
                    {cwStats.completionPct}%
                  </div>
                  <div className="text-slate-500 mt-0.5">{cwStats.completed}/{cwStats.total} {b('সম্পন্ন', 'Completed', lang)}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <div className="text-slate-500">{b('সিলেবাস ও পাঠ সম্পন্ন', 'Syllabus Coverage', lang)}</div>
                  <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white mt-1">87%</div>
                  <div className="text-slate-500 mt-0.5">{curriculumUnits.length} {b('বিষয় ট্র্যাকড', 'Tracked Subjects', lang)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      {b('🔴 আজকের লাইভ ক্লাস মনিটর (সংক্ষিপ্ত)', 'Live Class Snapshot', lang)}
                    </h2>
                    <button type="button" onClick={() => setActiveModule('live_class_monitor')} className="text-blue-700 dark:text-blue-400 font-semibold cursor-pointer">
                      {b('পূর্ণ মনিটর →', 'Open Monitor →', lang)}
                    </button>
                  </div>
                  {routineSlots.map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between py-2 border-b last:border-b-0 border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{slot.className} · {b(slot.subjectBn, slot.subjectEn, lang)}</div>
                        <div className="text-slate-500">{slot.substituteTeacher ?? slot.teacherName} · Room {slot.room}</div>
                      </div>
                      <span className={`font-semibold ${slot.status === 'in_progress' ? 'text-emerald-700 dark:text-emerald-400' : slot.status === 'completed' ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500'}`}>
                        {slot.status === 'in_progress' ? '🟢 Live' : slot.status === 'completed' ? '🔵 Completed' : '⏳ Upcoming'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      {b('আসন্ন একাডেমিক ক্যালেন্ডার', 'Upcoming Academic Calendar', lang)}
                    </h2>
                    <button type="button" onClick={() => setActiveModule('academic_calendar')} className="text-blue-700 dark:text-blue-400 font-semibold cursor-pointer">
                      {b('ক্যালেন্ডার →', 'Full Calendar →', lang)}
                    </button>
                  </div>
                  {calendarEvents.slice(0, 4).map((ev) => (
                    <div key={ev.id} className="flex items-start justify-between gap-2 py-2 border-b last:border-b-0 border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{b(ev.titleBn, ev.titleEn, lang)}</div>
                        <div className="text-slate-500">{ev.descriptionBn}</div>
                      </div>
                      <span className="font-mono text-blue-700 dark:text-blue-400 shrink-0">{ev.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. Academic Year / Term / Semester */}
          {activeModule === 'academic_year' && (
            <div className="space-y-5 text-xs">
              {!readOnlyOversight && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {b('নতুন Academic Year তৈরি করুন', 'Create New Academic Year', lang)}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                      type="text"
                      value={newYearLabel}
                      onChange={(e) => setNewYearLabel(e.target.value)}
                      placeholder="Academic Year Label"
                      className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 sm:col-span-2"
                    />
                    <input
                      type="date"
                      value={newYearStart}
                      onChange={(e) => setNewYearStart(e.target.value)}
                      className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newYearLabel.trim()) return;
                        onCreateAcademicYear(newYearLabel.trim(), newYearStart, newYearEnd);
                      }}
                      className="h-9 px-4 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer"
                    >
                      + {b('নতুন বছর তৈরি', 'Create Year', lang)}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {academicYears.map((yr) => (
                  <div key={yr.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{yr.yearLabel}</div>
                        <div className="text-slate-500 tabular-nums">
                          {yr.startDate} → {yr.endDate} · {b('পাশের হার:', 'Pass Rate:', lang)} {yr.passRatePct}% · {b('উপস্থিতি:', 'Attendance:', lang)} {yr.avgAttendancePct}%
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {yr.isCurrent ? (
                          <span className="px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold">
                            ✓ Current Academic Year
                          </span>
                        ) : (
                          !readOnlyOversight && (
                            <button
                              type="button"
                              onClick={() => onSelectCurrentAcademicYear(yr.id)}
                              className="px-3 py-1 rounded-lg border border-blue-600 text-blue-700 dark:text-blue-400 font-semibold cursor-pointer"
                            >
                              {b('Current Year নির্বাচন করুন', 'Set as Current Year', lang)}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {yr.terms.map((tm) => (
                        <div key={tm.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                          <div className="font-semibold text-slate-900 dark:text-white">{b(tm.nameBn, tm.nameEn, lang)}</div>
                          <div className="text-slate-500 mt-0.5 tabular-nums">{tm.startDate} → {tm.endDate}</div>
                          <div className="mt-1 font-semibold text-blue-700 dark:text-blue-400">{tm.status}</div>
                        </div>
                      ))}
                    </div>

                    {!readOnlyOversight && !yr.isArchived && (
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="text"
                          value={newTermName}
                          onChange={(e) => setNewTermName(e.target.value)}
                          placeholder={b('নতুন টার্ম / সেমিস্টারের নাম...', 'New Term / Semester name...', lang)}
                          className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex-1 max-w-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newTermName.trim()) return;
                            onAddTermToYear(yr.id, newTermName.trim(), '2026-10-01', '2026-12-20');
                            setNewTermName('');
                          }}
                          className="h-8 px-3 rounded-lg bg-slate-900 dark:bg-blue-700 text-white font-semibold cursor-pointer"
                        >
                          + {b('Term যোগ করুন', 'Add Term', lang)}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Academic Calendar */}
          {activeModule === 'academic_calendar' && (
            <div className="space-y-5 text-xs">
              {!readOnlyOversight && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {b('একাডেমিক ক্যালেন্ডার ইভেন্ট যোগ করুন', 'Add Academic Calendar Event', lang)}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <select
                      value={calType}
                      onChange={(e) => setCalType(e.target.value as AcademicCalendarEventType)}
                      className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    >
                      <option value="class_start">Class Start</option>
                      <option value="class_end">Class End</option>
                      <option value="exam">Exam</option>
                      <option value="holiday">Holiday</option>
                      <option value="result_publication">Result Publication</option>
                      <option value="assignment_deadline">Assignment Deadline</option>
                      <option value="school_event">School Event</option>
                      <option value="assessment_date">Assessment Date</option>
                    </select>
                    <input
                      type="date"
                      value={calDate}
                      onChange={(e) => setCalDate(e.target.value)}
                      className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      value={calTitle}
                      onChange={(e) => setCalTitle(e.target.value)}
                      placeholder={b('ইভেন্টের শিরোনাম...', 'Event title...', lang)}
                      className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!calTitle.trim()) return;
                        onAddCalendarEvent({
                          academicYearId: currentYear?.id ?? 'ay-2026',
                          date: calDate,
                          type: calType,
                          titleBn: calTitle.trim(),
                          titleEn: calTitle.trim(),
                          descriptionBn: `${calType} · ${school.nameBn}`,
                        });
                        setCalTitle('');
                      }}
                      className="h-9 px-4 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer"
                    >
                      + {b('তারিখ যোগ করুন', 'Add Date', lang)}
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <th className="py-3 px-4 font-semibold">{b('তারিখ', 'Date', lang)}</th>
                      <th className="py-3 px-3 font-semibold">{b('ধরন', 'Category', lang)}</th>
                      <th className="py-3 px-3 font-semibold">{b('শিরোনাম', 'Event Title', lang)}</th>
                      <th className="py-3 px-4 font-semibold">{b('বিবরণ', 'Details', lang)}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {calendarEvents.map((ev) => (
                      <tr key={ev.id}>
                        <td className="py-3 px-4 font-mono font-semibold text-blue-700 dark:text-blue-400">
                          {ev.date}{ev.endDate ? ` → ${ev.endDate}` : ''}
                        </td>
                        <td className="py-3 px-3 font-semibold">{ev.type}</td>
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{b(ev.titleBn, ev.titleEn, lang)}</td>
                        <td className="py-3 px-4 text-slate-500">{ev.descriptionBn}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. Class & Section Management */}
          {activeModule === 'class_management' && (
            <div className="space-y-5 text-xs">
              {!readOnlyOversight && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block font-semibold mb-1">{b('শ্রেণি', 'Class', lang)}</label>
                    <input value={newClassName} onChange={(e) => setNewClassName(e.target.value)} className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">{b('শাখা / গ্রুপ', 'Section / Group', lang)}</label>
                    <input value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">{b('রুম নং', 'Room No', lang)}</label>
                    <input value={newRoomNo} onChange={(e) => setNewRoomNo(e.target.value)} className="h-9 w-24 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onAddClassSection({
                        className: newClassName,
                        section: newSectionName,
                        roomNo: newRoomNo,
                        capacity: 45,
                        enrolledCount: 0,
                        classTeacherId: teachers[0]?.id ?? 'tch-1',
                        classTeacherName: teachers[0]?.nameBn ?? school.headTeacher,
                      })
                    }
                    className="h-9 px-4 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer"
                  >
                    + {b('শ্রেণি/শাখা যোগ করুন', 'Add Class & Section', lang)}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {classSections.map((cs) => (
                  <div key={cs.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{cs.className} · {cs.section}</span>
                      <span className="font-mono text-blue-700 dark:text-blue-400 font-semibold">Room {cs.roomNo}</span>
                    </div>
                    <div className="text-slate-500">{b('শ্রেণি শিক্ষক:', 'Class Teacher:', lang)} {cs.classTeacherName}</div>
                    <ProgressMeter
                      label={b('শিক্ষার্থী ধারণক্ষমতা', 'Capacity', lang)}
                      value={cs.enrolledCount}
                      max={cs.capacity}
                      detailText={`${cs.enrolledCount}/${cs.capacity}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Subject Management */}
          {activeModule === 'subject_management' && (
            <div className="space-y-5 text-xs">
              {!readOnlyOversight && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Code</label>
                    <input value={newSubCode} onChange={(e) => setNewSubCode(e.target.value)} className="h-9 w-28 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">{b('বিষয়ের নাম (বাংলা)', 'Subject (BN)', lang)}</label>
                    <input value={newSubNameBn} onChange={(e) => setNewSubNameBn(e.target.value)} placeholder="যেমন: চারু ও কারুকলা" className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">{b('নাম (ইংরেজি)', 'Subject (EN)', lang)}</label>
                    <input value={newSubNameEn} onChange={(e) => setNewSubNameEn(e.target.value)} placeholder="Arts & Crafts" className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newSubNameBn.trim()) return;
                      onAddSubject({
                        code: newSubCode,
                        nameBn: newSubNameBn.trim(),
                        nameEn: newSubNameEn.trim() || newSubNameBn.trim(),
                        classRange: 'Class 1 – Class 5',
                        weeklyPeriods: 3,
                        fullMarks: 100,
                        passMarks: 33,
                        type: 'Co-Curricular',
                      });
                      setNewSubNameBn('');
                      setNewSubNameEn('');
                    }}
                    className="h-9 px-4 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer"
                  >
                    + {b('নতুন বিষয়', 'Add Subject', lang)}
                  </button>
                </div>
              )}

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <th className="py-3 px-4 font-semibold">Code</th>
                      <th className="py-3 px-3 font-semibold">{b('বিষয়', 'Subject', lang)}</th>
                      <th className="py-3 px-3 font-semibold">{b('শ্রেণি সীমা', 'Class Range', lang)}</th>
                      <th className="py-3 px-3 font-semibold text-right">{b('পূর্ণমান / পাশ', 'Full / Pass', lang)}</th>
                      <th className="py-3 px-4 font-semibold text-right">{b('সাপ্তাহিক পিরিয়ড', 'Weekly Periods', lang)}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {subjects.map((s) => (
                      <tr key={s.id}>
                        <td className="py-3 px-4 font-mono font-semibold text-blue-700 dark:text-blue-400">{s.code}</td>
                        <td className="py-3 px-3 font-bold">{b(s.nameBn, s.nameEn, lang)}</td>
                        <td className="py-3 px-3">{s.classRange}</td>
                        <td className="py-3 px-3 text-right tabular-nums">{s.fullMarks} / {s.passMarks}</td>
                        <td className="py-3 px-4 text-right tabular-nums font-semibold">{s.weeklyPeriods}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. Teacher Class & Subject Assignment */}
          {activeModule === 'teacher_assignment' && (
            <div className="space-y-5 text-xs">
              {!readOnlyOversight && (
                <form onSubmit={handleAssignTeacherSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {b('শিক্ষককে Class ও Subject নির্ধারণ করুন (School Admin অনুমোদিত)', 'Assign Teacher to Class & Subject', lang)}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <select value={assignTeacherId} onChange={(e) => setAssignTeacherId(e.target.value)} className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>{t.nameBn}</option>
                      ))}
                    </select>
                    <select value={assignSubjectId} onChange={(e) => setAssignSubjectId(e.target.value)} className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>{b(s.nameBn, s.nameEn, lang)}</option>
                      ))}
                    </select>
                    <select value={assignClass} onChange={(e) => setAssignClass(e.target.value)} className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      {classSections.map((c) => (
                        <option key={c.id} value={c.className}>{c.className}</option>
                      ))}
                    </select>
                    <input value={assignSection} onChange={(e) => setAssignSection(e.target.value)} placeholder="Section" className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                    <input type="number" min={1} max={12} value={assignPeriods} onChange={(e) => setAssignPeriods(Number(e.target.value))} className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                    <button type="submit" className="h-9 px-3 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer">
                      + {b('Assign করুন', 'Assign', lang)}
                    </button>
                  </div>
                </form>
              )}

              {/* Teacher Workload Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {teachers.slice(0, 4).map((t) => {
                  const wl = computeTeacherWorkload(t, teacherAssignments, routineSlots);
                  return (
                    <div key={t.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1.5">
                      <div className="font-bold text-slate-900 dark:text-white">{t.nameBn}</div>
                      <div className="text-slate-500">
                        {wl.assignedClassCount} {b('শ্রেণি', 'Classes', lang)} · {wl.assignedSubjectCount} {b('বিষয়', 'Subjects', lang)}
                      </div>
                      <div className="font-mono font-bold text-blue-700 dark:text-blue-400 tabular-nums">
                        {wl.weeklyPeriods} {b('পিরিয়ড/সপ্তাহ', 'periods/week', lang)} ({wl.utilizationStatus})
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <th className="py-3 px-4 font-semibold">{b('শিক্ষক', 'Teacher', lang)}</th>
                      <th className="py-3 px-3 font-semibold">{b('বিষয়', 'Subject', lang)}</th>
                      <th className="py-3 px-3 font-semibold">{b('শ্রেণি ও শাখা', 'Class & Section', lang)}</th>
                      <th className="py-3 px-3 font-semibold">Room</th>
                      <th className="py-3 px-3 font-semibold text-right">{b('সাপ্তাহিক পিরিয়ড', 'Load', lang)}</th>
                      <th className="py-3 px-4 font-semibold text-right">{b('কার্যক্রম', 'Actions', lang)}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {teacherAssignments.map((a) => (
                      <tr key={a.id}>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{a.teacherName}</td>
                        <td className="py-3 px-3">{b(a.subjectBn, a.subjectEn, lang)} ({a.subjectCode})</td>
                        <td className="py-3 px-3">{a.className} · {a.section}</td>
                        <td className="py-3 px-3 font-mono">{a.room}</td>
                        <td className="py-3 px-3 text-right tabular-nums font-semibold">{a.weeklyPeriods}/wk</td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            {!readOnlyOversight && (
                              <select
                                aria-label={`Replace teacher for ${a.subjectEn} ${a.className}`}
                                value={a.teacherId}
                                onChange={(e) => onReplaceAssignedTeacher(a.id, e.target.value)}
                                className="h-7 px-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                              >
                                {teachers.map((t) => (
                                  <option key={t.id} value={t.id}>{t.nameBn}</option>
                                ))}
                              </select>
                            )}
                            <CleanRowActionBar
                              lang={lang}
                              role={readOnlyOversight ? 'central_admin' : 'school_admin'}
                              category="standard"
                              readOnlyOversight={readOnlyOversight}
                              itemTitle={`${a.className} · ${a.subjectBn} (${a.teacherName})`}
                              onView={() =>
                                setDetailModal({
                                  title: `${a.className} · ${b(a.subjectBn, a.subjectEn, lang)}`,
                                  lines: [
                                    `${b('শিক্ষক:', 'Teacher:', lang)} ${a.teacherName}`,
                                    `${b('কক্ষ ও শাখা:', 'Room & Section:', lang)} ${a.room} (${a.section})`,
                                    `${b('সাপ্তাহিক পিরিয়ড:', 'Weekly Periods:', lang)} ${a.weeklyPeriods}`,
                                    `${b('অনুমোদনকারী:', 'Assigned By:', lang)} ${a.assignedBy}`,
                                  ],
                                })
                              }
                              onSecondaryAction={(action, reason) =>
                                setActionToast(
                                  `${a.subjectBn} (${a.className}) — ${action}${reason ? `: ${reason}` : ''}`
                                )
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 7. Class Routine & Weekly Schedule + Substitute + Cancel */}
          {activeModule === 'class_routine' && (
            <div className="space-y-5 text-xs">
              <RoutineManagementSystem
                lang={lang}
                role={readOnlyOversight ? 'central_admin' : 'school_admin'}
                school={school}
                actorName={school.headTeacher}
                routines={masterRoutines}
                teachers={teachers}
                subjects={subjects}
                teacherAssignments={teacherAssignments}
                readOnlyOversight={readOnlyOversight}
                onUpdateRoutines={onUpdateMasterRoutines ?? (() => {})}
              />
              {!readOnlyOversight && (
                <form onSubmit={handleCreateRoutineSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {b('নতুন ক্লাস রুটিন স্লট তৈরি করুন', 'Create Class Routine Slot', lang)}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    <select value={routineNewDay} onChange={(e) => setRoutineNewDay(e.target.value)} className="h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      {['রবিবার (Sun)', 'সোমবার (Mon)', 'মঙ্গলবার (Tue)', 'বুধবার (Wed)', 'বৃহস্পতিবার (Thu)'].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <input type="number" min={1} max={8} value={routineNewPeriod} onChange={(e) => setRoutineNewPeriod(Number(e.target.value))} className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                    <input value={routineNewTime} onChange={(e) => setRoutineNewTime(e.target.value)} className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                    <select value={routineNewSubject} onChange={(e) => setRoutineNewSubject(e.target.value)} className="h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      {subjects.map((s) => (
                        <option key={s.id} value={s.nameBn}>{s.nameBn}</option>
                      ))}
                    </select>
                    <select value={routineNewTeacherId} onChange={(e) => setRoutineNewTeacherId(e.target.value)} className="h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>{t.nameBn}</option>
                      ))}
                    </select>
                    <button type="submit" className="h-9 px-3 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer">
                      + {b('রুটিন যোগ', 'Add Slot', lang)}
                    </button>
                  </div>
                </form>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {['সকল দিন (All)', 'রবিবার (Sun)', 'সোমবার (Mon)', 'মঙ্গলবার (Tue)', 'বুধবার (Wed)', 'বৃহস্পতিবার (Thu)'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setRoutineDayFilter(d)}
                      className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                        routineDayFilter === d ? 'bg-blue-700 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <th className="py-3 px-4 font-semibold">Period & Time</th>
                      <th className="py-3 px-3 font-semibold">{b('শ্রেণি ও রুম', 'Class & Room', lang)}</th>
                      <th className="py-3 px-3 font-semibold">{b('বিষয়', 'Subject', lang)}</th>
                      <th className="py-3 px-3 font-semibold">{b('শিক্ষক / বিকল্প', 'Teacher / Sub', lang)}</th>
                      <th className="py-3 px-3 font-semibold">{b('অবস্থা', 'Status', lang)}</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {routineSlots
                      .filter((r) => routineDayFilter === 'সকল দিন (All)' || (r.dayOfWeek ?? 'রবিবার (Sun)') === routineDayFilter)
                      .map((slot) => (
                        <tr key={slot.id}>
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-blue-700 dark:text-blue-400">Period {slot.period}</div>
                            <div className="text-slate-500">{slot.timeRange}</div>
                          </td>
                          <td className="py-3 px-3 font-semibold">{slot.className} ({slot.section}) · Room {slot.room}</td>
                          <td className="py-3 px-3 font-bold">{b(slot.subjectBn, slot.subjectEn, lang)}</td>
                          <td className="py-3 px-3">
                            <div>{slot.teacherName}</div>
                            {slot.substituteTeacher && (
                              <div className="text-amber-700 dark:text-amber-400 font-semibold">
                                Sub: {slot.substituteTeacher} ({slot.substituteReason})
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 font-semibold">
                            <div>{slot.status}</div>
                            {slot.cancelledReason && (
                              <div className="text-[11px] text-red-600 dark:text-red-400">{slot.cancelledReason}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {!readOnlyOversight && slot.status === 'cancelled' && onRestoreClassSlot && (
                                <button
                                  type="button"
                                  onClick={() => onRestoreClassSlot(slot.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-emerald-300 text-emerald-700 dark:text-emerald-400 font-semibold cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  {b('পুনরুদ্ধার', 'Restore Class', lang)}
                                </button>
                              )}
                              <CleanRowActionBar
                                lang={lang}
                                role={readOnlyOversight ? 'central_admin' : 'school_admin'}
                                category="standard"
                                status={slot.status}
                                readOnlyOversight={readOnlyOversight}
                                itemTitle={`${slot.className} · ${slot.subjectBn} (P${slot.period})`}
                                onView={() =>
                                  setDetailModal({
                                    title: `${slot.className} · ${b(slot.subjectBn, slot.subjectEn, lang)}`,
                                    lines: [
                                      `Period ${slot.period} · ${slot.timeRange}`,
                                      `${b('শিক্ষক:', 'Teacher:', lang)} ${slot.substituteTeacher ?? slot.teacherName}`,
                                      `${b('কক্ষ:', 'Room:', lang)} ${slot.room}`,
                                      `${b('অবস্থা:', 'Status:', lang)} ${slot.status}${slot.cancelledReason ? ` (${slot.cancelledReason})` : ''}`,
                                    ],
                                  })
                                }
                                onEdit={
                                  !readOnlyOversight
                                    ? () => setReassignSlotId(reassignSlotId === slot.id ? null : slot.id)
                                    : undefined
                                }
                                onSecondaryAction={(action, reason) => {
                                  if (action === 'cancel') {
                                    setCancelModalSlot(slot);
                                    return;
                                  }
                                  if (action === 'replace') {
                                    setReassignSlotId(slot.id);
                                    return;
                                  }
                                  setActionToast(
                                    `${slot.className} ${slot.subjectBn} — ${action}${reason ? `: ${reason}` : ''}`
                                  );
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {reassignSlotId && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-4 flex flex-wrap items-center gap-3">
                  <span className="font-bold text-amber-900 dark:text-amber-200">
                    {b('বিকল্প শিক্ষক নির্ধারণ (কারণ বাধ্যতামূলক):', 'Assign Substitute Teacher (Mandatory Reason):', lang)}
                  </span>
                  <select value={reassignTeacherId} onChange={(e) => setReassignTeacherId(e.target.value)} className="h-8 px-2.5 rounded border border-amber-300 bg-white dark:bg-slate-900">
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.nameBn}</option>
                    ))}
                  </select>
                  <select value={reassignReason} onChange={(e) => setReassignReason(e.target.value as SubstituteReason)} className="h-8 px-2.5 rounded border border-amber-300 bg-white dark:bg-slate-900">
                    {SUBSTITUTE_REASONS.map((rs) => (
                      <option key={rs} value={rs}>{rs}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      onAssignSubstituteTeacher(reassignSlotId, reassignTeacherId, reassignReason);
                      setReassignSlotId(null);
                    }}
                    className="h-8 px-3 rounded bg-amber-700 text-white font-semibold cursor-pointer"
                  >
                    {b('সংরক্ষণ করুন', 'Confirm Substitute', lang)}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 8. School Admin Live Class Monitor & Substitute Permission Review */}
          {activeModule === 'live_class_monitor' && (
            <div className="space-y-4 text-xs">
              {substitutePermissions.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/70 rounded-xl p-4 space-y-3">
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {b('শিক্ষকের Substitute Permission অনুমোদন (Admin Oversight)', 'Substitute Teacher Permissions Queue', lang)}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {substitutePermissions.map((sp) => (
                      <div key={sp.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {sp.className} · {sp.subjectBn} ({sp.date})
                          </div>
                          <div className="text-slate-500">
                            {sp.ownerTeacherName} → <strong>{sp.substituteTeacherName}</strong> · {sp.reason}
                          </div>
                          <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                            Status: {sp.status}
                          </div>
                        </div>
                        {!readOnlyOversight && onReviewSubstitutePermission && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {sp.status !== 'approved' && (
                              <button
                                type="button"
                                onClick={() => onReviewSubstitutePermission(sp.id, 'approve')}
                                className="px-2.5 py-1 rounded bg-emerald-700 text-white font-semibold cursor-pointer"
                              >
                                {b('Approve', 'Approve', lang)}
                              </button>
                            )}
                            {sp.status !== 'revoked' && (
                              <button
                                type="button"
                                onClick={() => onReviewSubstitutePermission(sp.id, 'revoke')}
                                className="px-2.5 py-1 rounded border border-red-300 text-red-700 dark:text-red-400 font-semibold cursor-pointer"
                              >
                                {b('Revoke', 'Revoke', lang)}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {b('🔴 Live Classes Monitor (School Admin)', 'School Admin Live Class Monitor', lang)}
                    </h2>
                    <p className="text-slate-500 mt-0.5">
                      {b(
                        'কোন ক্লাস চলছে, কোন শিক্ষক নিচ্ছেন, কখন শুরু ও শেষ হবে এবং কারণসহ ক্লাস বাতিল বা পুনরুদ্ধার করুন।',
                        'Monitor live/upcoming/completed classes in real time, reassign teachers, or cancel/restore with reason.',
                        lang
                      )}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                        <th className="py-2.5 px-3 font-semibold">Class</th>
                        <th className="py-2.5 px-3 font-semibold">Subject</th>
                        <th className="py-2.5 px-3 font-semibold">Teacher</th>
                        <th className="py-2.5 px-3 font-semibold">Room</th>
                        <th className="py-2.5 px-3 font-semibold">Time / Started</th>
                        <th className="py-2.5 px-3 font-semibold">Status</th>
                        {!readOnlyOversight && <th className="py-2.5 px-3 font-semibold text-right">Controls</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {routineSlots.map((slot) => (
                        <tr key={slot.id}>
                          <td className="py-3 px-3 font-bold">{slot.className} ({slot.section})</td>
                          <td className="py-3 px-3 font-semibold">{b(slot.subjectBn, slot.subjectEn, lang)}</td>
                          <td className="py-3 px-3">
                            <div>{slot.substituteTeacher ?? slot.teacherName}</div>
                            {slot.substituteReason && (
                              <div className="text-[11px] text-amber-700 dark:text-amber-400">Reason: {slot.substituteReason}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono">{slot.room}</td>
                          <td className="py-3 px-3 tabular-nums">
                            {slot.timeRange}
                            {slot.startedAt && <div className="text-[11px] text-emerald-700 dark:text-emerald-400">Started: {slot.startedAt}</div>}
                          </td>
                          <td className="py-3 px-3 font-bold">
                            <div>
                              {slot.status === 'in_progress'
                                ? '🟢 Live'
                                : slot.status === 'completed'
                                  ? '🔵 Completed'
                                  : slot.status === 'cancelled'
                                    ? '⚫ Cancelled'
                                    : '⏳ Upcoming'}
                            </div>
                            {slot.cancelledReason && (
                              <div className="text-[11px] text-red-600 dark:text-red-400">{slot.cancelledReason}</div>
                            )}
                          </td>
                          {!readOnlyOversight && (
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setReassignSlotId(reassignSlotId === slot.id ? null : slot.id)}
                                  className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                  {b('বিকল্প', 'Reassign', lang)}
                                </button>
                                {slot.status !== 'cancelled' ? (
                                  <button
                                    type="button"
                                    onClick={() => setCancelModalSlot(slot)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-red-300 text-red-700 dark:text-red-400 font-semibold cursor-pointer"
                                  >
                                    <Ban className="w-3 h-3" />
                                    {b('বাতিল', 'Cancel Class', lang)}
                                  </button>
                                ) : (
                                  onRestoreClassSlot && (
                                    <button
                                      type="button"
                                      onClick={() => onRestoreClassSlot(slot.id)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-emerald-300 text-emerald-700 dark:text-emerald-400 font-semibold cursor-pointer"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      {b('পুনরুদ্ধার', 'Restore', lang)}
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {reassignSlotId && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-4 flex flex-wrap items-center gap-3">
                    <span className="font-bold text-amber-900 dark:text-amber-200">
                      {b('শিক্ষক পরিবর্তনের কারণ (Reason Mandatory):', 'Select Replacement Teacher & Mandatory Reason:', lang)}
                    </span>
                    <select value={reassignTeacherId} onChange={(e) => setReassignTeacherId(e.target.value)} className="h-8 px-2.5 rounded border border-amber-300 bg-white dark:bg-slate-900">
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>{t.nameBn}</option>
                      ))}
                    </select>
                    <select value={reassignReason} onChange={(e) => setReassignReason(e.target.value as SubstituteReason)} className="h-8 px-2.5 rounded border border-amber-300 bg-white dark:bg-slate-900">
                      {SUBSTITUTE_REASONS.map((rs) => (
                        <option key={rs} value={rs}>{rs}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        onAssignSubstituteTeacher(reassignSlotId, reassignTeacherId, reassignReason);
                        setReassignSlotId(null);
                      }}
                      className="h-8 px-3 rounded bg-amber-700 text-white font-semibold cursor-pointer"
                    >
                      {b('পরিবর্তন নিশ্চিত করুন', 'Confirm Change', lang)}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 8B. Today's Lessons Monitoring (আজকের পড়া মনিটরিং) */}
          {activeModule === 'todays_lessons' && (
            <TodaysLessonsPanel
              role={readOnlyOversight ? 'central_admin' : 'school_admin'}
              lang={lang}
              schoolId={school.id}
              dailyLessons={dailyLessons}
              students={students}
            />
          )}

          {/* 9. Curriculum & Syllabus */}
          {(activeModule === 'curriculum' || activeModule === 'syllabus') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {curriculumUnits.map((cu) => {
                const pct = Math.round((cu.completedChapters / cu.totalChapters) * 100);
                return (
                  <div key={cu.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{b(cu.subjectBn, cu.subjectEn, lang)} · {cu.className}</span>
                      <span className="font-mono text-blue-700 dark:text-blue-400 font-semibold">{cu.targetMonth}</span>
                    </div>
                    <div className="font-semibold text-slate-700 dark:text-slate-300">{cu.syllabusTitleBn}</div>
                    <div className="text-slate-500">{cu.learningOutcomesBn}</div>
                    <ProgressMeter
                      label={b('অধ্যায় সম্পন্ন', 'Chapters Completed', lang)}
                      value={pct}
                      detailText={`${cu.completedChapters}/${cu.totalChapters} (${pct}%)`}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* 10. Lesson Management & Lesson Plan */}
          {(activeModule === 'lesson_management' || activeModule === 'lesson_plan') && (
            <div className="space-y-4 text-xs">
              {!readOnlyOversight && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {b('পাঠ পরিকল্পনা ও লেসন ব্যবস্থাপনা (Lesson Plan)', 'Lesson Management & Lesson Plans', lang)}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onAddLessonPlan({
                        className: 'Class 4',
                        subjectBn: 'গণিত',
                        subjectEn: 'Mathematics',
                        teacherId: teachers[0]?.id ?? 'tch-2',
                        teacherName: teachers[0]?.nameBn ?? 'মোঃ আব্দুর রহিম',
                        chapterTitle: 'অধ্যায় ৫: দশমিক ভগ্নাংশ',
                        lessonTopic: 'দশমিক সংখ্যার যোগ ও বিয়োগ',
                        learningObjective: 'দৈনন্দিন টাকা-পয়সার হিসাবে দশমিক ব্যবহার।',
                        teachingMethod: 'বাস্তব উপকরণ ও বোর্ড অনুশীলন',
                        durationMins: 45,
                        status: 'planned',
                      })
                    }
                    className="px-3 py-1.5 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer"
                  >
                    + {b('নতুন Lesson Plan তৈরি', 'Add Lesson Plan', lang)}
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-3">
                {lessonPlans.map((lp) => (
                  <div key={lp.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{lp.chapterTitle} — {lp.lessonTopic}</span>
                      <span className="font-semibold text-blue-700 dark:text-blue-400">{lp.status} · {lp.durationMins}m</span>
                    </div>
                    <div className="text-slate-500">{lp.className} · {b(lp.subjectBn, lp.subjectEn, lang)} · {lp.teacherName}</div>
                    <div className="text-slate-700 dark:text-slate-300"><strong>Objective:</strong> {lp.learningObjective}</div>
                    <div className="text-slate-500"><strong>Method:</strong> {lp.teachingMethod}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 11. Study Materials */}
          {activeModule === 'study_materials' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {studyMaterials.map((sm) => (
                <div key={sm.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-mono text-[11px] text-blue-700 dark:text-blue-400">{sm.materialType} · {sm.className}</div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">{b(sm.titleBn, sm.titleEn, lang)}</div>
                    <div className="text-slate-500 mt-0.5">{b(sm.subjectBn, sm.subjectEn, lang)} · {sm.uploadedBy} · {sm.uploadedDate}</div>
                  </div>
                  <button type="button" onClick={() => window.print()} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer shrink-0">
                    {b('দেখুন', 'Open', lang)}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 12. Classwork / Daily Work (Explicitly Separate from Homework & Assignment) */}
          {activeModule === 'classwork' && (
            <div className="space-y-5 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <div className="text-slate-500">Completed</div>
                  <div className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">{cwStats.completed}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <div className="text-slate-500">Pending</div>
                  <div className="text-xl font-bold tabular-nums text-amber-600 mt-1">{cwStats.pending}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <div className="text-slate-500">Not Submitted</div>
                  <div className="text-xl font-bold tabular-nums text-red-600 mt-1">{cwStats.notSubmitted}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <div className="text-slate-500">{b('Classwork রিপোর্ট %', 'Completion Rate', lang)}</div>
                  <div className="text-xl font-bold tabular-nums text-blue-700 dark:text-blue-400 mt-1">{cwStats.completionPct}%</div>
                </div>
              </div>

              {!readOnlyOversight && (
                <form onSubmit={handleCreateClassworkSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {b('নতুন Classwork / Daily Work তৈরি করুন (Assignment থেকে পৃথক)', 'Create Daily Classwork (Separate from Homework/Assignment)', lang)}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <select value={cwSubject} onChange={(e) => setCwSubject(e.target.value)} className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      {subjects.map((s) => (
                        <option key={s.id} value={s.nameBn}>{s.nameBn}</option>
                      ))}
                    </select>
                    <input value={cwTitle} onChange={(e) => setCwTitle(e.target.value)} placeholder={b('আজকের ক্লাসের কাজ...', 'In-class work task...', lang)} className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 sm:col-span-2" />
                    <button type="submit" className="h-9 px-4 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer">
                      + {b('Classwork দিন', 'Assign Classwork', lang)}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-4">
                {classworks.map((cw) => (
                  <div key={cw.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{b(cw.titleBn, cw.titleEn, lang)}</div>
                        <div className="text-slate-500">{cw.className} ({cw.section}) · {b(cw.subjectBn, cw.subjectEn, lang)} · {cw.teacherName} · {cw.date}</div>
                      </div>
                    </div>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                          <th className="py-2 font-semibold">{b('শিক্ষার্থী', 'Student', lang)}</th>
                          <th className="py-2 font-semibold">{b('অবস্থা', 'Status', lang)}</th>
                          <th className="py-2 font-semibold">{b('শিক্ষকের মন্তব্য (Feedback)', 'Teacher Feedback', lang)}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {cw.studentStatuses.map((st) => {
                          const key = `${cw.id}-${st.studentId}`;
                          return (
                            <tr key={st.studentId}>
                              <td className="py-2 font-semibold">{st.studentName} (Roll {st.roll})</td>
                              <td className="py-2">
                                {readOnlyOversight ? (
                                  <span className="font-semibold">{st.status}</span>
                                ) : (
                                  <select
                                    value={st.status}
                                    onChange={(e) =>
                                      onUpdateClassworkStudentStatus(
                                        cw.id,
                                        st.studentId,
                                        e.target.value as 'completed' | 'pending' | 'not_submitted',
                                        cwFeedbackDraft[key] ?? st.feedback
                                      )
                                    }
                                    className="h-7 px-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                                  >
                                    <option value="completed">Completed</option>
                                    <option value="pending">Pending</option>
                                    <option value="not_submitted">Not Submitted</option>
                                  </select>
                                )}
                              </td>
                              <td className="py-2">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={cwFeedbackDraft[key] ?? st.feedback ?? ''}
                                    onChange={(e) => setCwFeedbackDraft((p) => ({ ...p, [key]: e.target.value }))}
                                    placeholder={b('মন্তব্য লিখুন...', 'Teacher feedback...', lang)}
                                    className="h-7 px-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex-1"
                                  />
                                  {!readOnlyOversight && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onUpdateClassworkStudentStatus(cw.id, st.studentId, st.status, cwFeedbackDraft[key] ?? st.feedback ?? '')
                                      }
                                      className="h-7 px-2 rounded bg-slate-900 dark:bg-blue-700 text-white font-semibold cursor-pointer"
                                    >
                                      Save
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 13. Homework / Assignment / Activity / Project / Viva */}
          {(activeModule === 'homework' || activeModule === 'assignment' || activeModule === 'activity') && (
            <div className="space-y-4 text-xs">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {activeModule === 'homework'
                    ? b('দৈনিক বাড়ির কাজ (Homework Tracker)', 'Daily Homework Management', lang)
                    : activeModule === 'assignment'
                      ? b('অ্যাসাইনমেন্ট তালিকা (Assignments — Classwork থেকে পৃথক)', 'Student Assignments (Distinct from Classwork)', lang)
                      : b('সহ-শিক্ষা কার্যক্রম, প্রজেক্ট ও উপস্থাপনা (Activity, Project & Viva)', 'Activities, Projects & Presentations / Viva', lang)}
                </h2>
                {activeModule === 'activity' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {extraItems
                      .filter((x) => x.category === 'activity' || x.category === 'project' || x.category === 'viva')
                      .map((item) => (
                        <div key={item.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                          <div className="text-[11px] font-mono text-blue-700 dark:text-blue-400 uppercase">{item.category} · {item.className}</div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">{b(item.titleBn, item.titleEn, lang)}</div>
                          <div className="text-slate-500">{item.subjectBn} · {item.participantInfo} · {item.scheduleOrDue}</div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {assignments
                      .filter((a) => (activeModule === 'homework' ? Boolean(a.isHomework) || a.id === 'asg-1' : !a.isHomework))
                      .map((a) => (
                        <div key={a.id} className="py-3 flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{b(a.titleBn, a.titleEn, lang)}</div>
                            <div className="text-slate-500">{b(a.subjectBn, a.subjectEn, lang)} · Due: {a.dueDate}</div>
                          </div>
                          <span className={`font-semibold ${a.status === 'submitted' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600'}`}>
                            {a.status}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 14. Class Test / Quiz + Question Bank + Question Paper */}
          {(activeModule === 'class_test' || activeModule === 'question_bank' || activeModule === 'question_paper') && (
            <div className="space-y-5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classTests.map((ct) => (
                  <div key={ct.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{b(ct.titleBn, ct.titleEn, lang)}</span>
                      <span className="font-mono text-blue-700 dark:text-blue-400">{ct.date}</span>
                    </div>
                    <div className="text-slate-500">{ct.className} · {b(ct.subjectBn, ct.subjectEn, lang)} · Total: {ct.totalMarks}</div>
                    {ct.status === 'completed' && (
                      <div className="text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums">Avg Score: {ct.avgScore}/{ct.totalMarks}</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {b('প্রশ্নব্যাংক ও প্রশ্নপত্র তৈরি (Question Bank & Question Paper Builder)', 'Question Bank & Printable Question Paper', lang)}
                  </h2>
                  <button type="button" onClick={() => window.print()} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer">
                    {b('প্রশ্নপত্র প্রিন্ট', 'Print Question Paper', lang)}
                  </button>
                </div>
                {questionBank.map((q, idx) => {
                  const included = selectedPaperIds.includes(q.id);
                  return (
                    <div key={q.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-[11px] text-blue-700 dark:text-blue-400">
                          Q{idx + 1} · {q.questionType} · {q.difficulty} · {q.marks} Marks ({q.subjectBn})
                        </div>
                        <div className="font-semibold text-slate-900 dark:text-white mt-0.5">{q.questionText}</div>
                      </div>
                      <label className="flex items-center gap-1.5 shrink-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={included}
                          onChange={() =>
                            setSelectedPaperIds((prev) =>
                              prev.includes(q.id) ? prev.filter((id) => id !== q.id) : [...prev, q.id]
                            )
                          }
                        />
                        <span>{b('প্রশ্নপত্রে রাখুন', 'Include', lang)}</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 15. Exam & Exam Schedule */}
          {(activeModule === 'exam' || activeModule === 'exam_schedule') && (
            <div className="space-y-4 text-xs">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">{b(exam.titleBn, exam.titleEn, lang)}</h2>
                  <div className="text-slate-500">{exam.className} · {exam.dateRange} · Status: <strong>{exam.status}</strong></div>
                </div>
                {!readOnlyOversight && (
                  <button
                    type="button"
                    onClick={() => onToggleExamStatus(exam.id, exam.status === 'published' ? 'held' : 'published', 'Academic hub toggle')}
                    className={`px-3.5 py-2 rounded-lg text-white font-semibold cursor-pointer ${exam.status === 'published' ? 'bg-amber-600' : 'bg-emerald-700'}`}
                  >
                    {exam.status === 'published' ? b('ফলাফল স্থগিত (Hold)', 'Hold Result', lang) : b('ফলাফল প্রকাশ (Publish)', 'Publish Result', lang)}
                  </button>
                )}
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <th className="py-3 px-4 font-semibold">{b('তারিখ ও সময়', 'Date & Time', lang)}</th>
                      <th className="py-3 px-3 font-semibold">{b('শ্রেণি', 'Class', lang)}</th>
                      <th className="py-3 px-3 font-semibold">{b('বিষয়', 'Subject', lang)}</th>
                      <th className="py-3 px-3 font-semibold">Room</th>
                      <th className="py-3 px-4 font-semibold">{b('পরিদর্শক', 'Invigilator', lang)}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {examSchedules.map((es) => (
                      <tr key={es.id}>
                        <td className="py-3 px-4 font-mono">{es.date} · {es.timeRange}</td>
                        <td className="py-3 px-3 font-semibold">{es.className}</td>
                        <td className="py-3 px-3 font-bold">{b(es.subjectBn, es.subjectEn, lang)}</td>
                        <td className="py-3 px-3 font-mono">{es.room}</td>
                        <td className="py-3 px-4">{es.invigilator}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 16. Marks Entry & Continuous Assessment */}
          {(activeModule === 'marks_entry' || activeModule === 'continuous_assessment') && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 font-bold text-sm">
                {b('নম্বর এন্ট্রি ও ধারাবাহিক মূল্যায়ন (Written + MCQ + Oral + CA)', 'Marks Entry & Continuous Assessment', lang)}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <th className="py-2.5 px-4 font-semibold">{b('শিক্ষার্থী', 'Student', lang)}</th>
                      <th className="py-2.5 px-3 font-semibold">{b('বিষয়', 'Subject', lang)}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Written</th>
                      <th className="py-2.5 px-3 font-semibold text-right">MCQ</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Oral + CA</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Total & Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {exam.entries.map((entry) => {
                      const total = computeEntryTotalMarks(entry);
                      const gr = calculateCustomGradeAndGPA(total, entry.fullMarks, entry.passMarks, gradingRules);
                      return (
                        <tr key={`${entry.studentId}-${entry.subjectEn}`}>
                          <td className="py-2.5 px-4 font-semibold">{entry.studentName} (Roll {entry.roll})</td>
                          <td className="py-2.5 px-3">{b(entry.subjectBn, entry.subjectEn, lang)}</td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              disabled={readOnlyOversight}
                              min={0}
                              max={80}
                              value={entry.written}
                              onChange={(e) => onUpdateExamMark(exam.id, entry.studentId, entry.subjectEn, Number(e.target.value), entry.mcq)}
                              className="w-16 h-7 px-2 text-right tabular-nums rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{entry.mcq ?? 0}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{entry.oral + entry.continuous}</td>
                          <td className="py-2.5 px-4 text-right tabular-nums font-bold">
                            {gr.totalObtained} · <span className="text-blue-700 dark:text-blue-400">{gr.letterGrade} ({gr.gpa.toFixed(2)})</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 17. Grading & Marking Scheme */}
          {activeModule === 'grading_scheme' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {b('গ্রেডিং ও মার্কিং স্কিম (Marks Range, Grade, Point, Pass Mark)', 'Custom Grading & Marking Scheme', lang)}
                </h2>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                    <th className="py-2.5 px-4 font-semibold">{b('নম্বরের সীমা (%)', 'Marks Range (%)', lang)}</th>
                    <th className="py-2.5 px-3 font-semibold">Letter Grade</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Grade Point</th>
                    <th className="py-2.5 px-4 font-semibold">{b('মন্তব্য', 'Remark', lang)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {gradingRules.map((rule) => (
                    <tr key={rule.id}>
                      <td className="py-2.5 px-4 tabular-nums font-semibold">
                        <input
                          type="number"
                          disabled={readOnlyOversight}
                          value={rule.minPercent}
                          onChange={(e) => onUpdateGradingRule(rule.id, { minPercent: Number(e.target.value) })}
                          className="w-14 h-7 px-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center"
                        />{' '}
                        – {rule.maxPercent}%
                      </td>
                      <td className="py-2.5 px-3 font-bold text-blue-700 dark:text-blue-400">{rule.letterGrade}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-bold">{rule.gradePoint.toFixed(1)}</td>
                      <td className="py-2.5 px-4">{b(rule.remarkBn, rule.remarkEn, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 18. Result & Merit Ranking (with Governance Progress + CleanRowActionBar + Protected Delete) */}
          {(activeModule === 'result' || activeModule === 'merit_ranking') && (
            <div className="space-y-5">
              {onSendDelayedTeacherAlert && onTogglePublishResult && (
                <SchoolAdminResultManagementPanel
                  lang={lang}
                  school={school}
                  exams={exams}
                  subjectSubmissions={subjectSubmissions}
                  resultAuditLogs={resultAuditLogs}
                  readOnlyOversight={readOnlyOversight}
                  onSendDelayedTeacherAlert={onSendDelayedTeacherAlert}
                  onTogglePublishResult={onTogglePublishResult}
                />
              )}

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 font-bold text-sm">
                  {b('ফলাফল ও মেধাক্রম (Overall & Subject-wise Ranking)', 'Results & Automated Merit List', lang)}
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <th className="py-3 px-4 font-semibold">{b('মেধাক্রম', 'Merit Rank', lang)}</th>
                      <th className="py-3 px-3 font-semibold">{b('শিক্ষার্থী', 'Student', lang)}</th>
                      <th className="py-3 px-3 font-semibold text-right">{b('মোট নম্বর', 'Total Marks', lang)}</th>
                      <th className="py-3 px-3 font-semibold text-right">GPA</th>
                      <th className="py-3 px-3 font-semibold text-right">Grade</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {meritList.map((m) => {
                      const stuObj = students.find((st) => st.id === m.studentId);
                      return (
                        <tr key={m.studentId}>
                          <td className="py-3 px-4 font-bold tabular-nums text-blue-700 dark:text-blue-400">#{m.rank}</td>
                          <td className="py-3 px-3 font-semibold">{m.studentName} (Roll {m.roll})</td>
                          <td className="py-3 px-3 text-right tabular-nums">{m.totalObtained}/{m.totalFull}</td>
                          <td className="py-3 px-3 text-right tabular-nums font-bold">{m.gpa.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400">{m.letterGrade}</td>
                          <td className="py-3 px-4 text-right">
                            <CleanRowActionBar
                              lang={lang}
                              role={readOnlyOversight ? 'central_admin' : 'school_admin'}
                              category="result"
                              status={exam?.status === 'published' ? 'active' : 'locked'}
                              readOnlyOversight={readOnlyOversight}
                              itemTitle={`${m.studentName} — ${exam?.titleBn ?? 'Result'}`}
                              onView={() => {
                                if (stuObj) setMarksheetStudent(stuObj);
                              }}
                              onSecondaryAction={(action, reason) =>
                                setActionToast(
                                  `${m.studentName} Result — ${action}${reason ? `: ${reason}` : ''}`
                                )
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 19. Student Academic Progress */}
          {activeModule === 'student_progress' && (
            <StudentAcademicProgressPanel
              lang={lang}
              students={students}
              exams={exams}
              assignments={assignments}
              classworks={classworks}
              gradingRules={gradingRules}
            />
          )}

          {/* 20. Certificates & Academic Documents */}
          {activeModule === 'certificates' && (
            <AcademicCertificatesDocsPanel
              lang={lang}
              school={school}
              students={students}
              exams={exams}
              classworks={classworks}
              assignments={assignments}
              gradingRules={gradingRules}
            />
          )}

          {/* 21. Learning Outcome / Remedial / Enrichment / Academic Promotion */}
          {(activeModule === 'learning_outcome' || activeModule === 'remedial_class' || activeModule === 'enrichment_learning' || activeModule === 'academic_promotion') && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {extraItems
                  .filter((x) => x.category === 'competency' || x.category === 'remedial' || x.category === 'enrichment')
                  .map((item) => (
                    <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1.5">
                      <div className="text-[11px] font-mono text-blue-700 dark:text-blue-400 uppercase">{item.category} · {item.className}</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{b(item.titleBn, item.titleEn, lang)}</div>
                      <div className="text-slate-500">{item.subjectBn} · {item.participantInfo} · {item.scheduleOrDue}</div>
                    </div>
                  ))}
              </div>
              {!readOnlyOversight && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{b('বার্ষিক শ্রেণি উন্নয়ন (Academic Promotion)', 'Batch Academic Promotion', lang)}</div>
                    <div className="text-slate-500">{b('উত্তীর্ণ সকল শিক্ষার্থীকে পরবর্তী শ্রেণিতে উন্নীত করুন (Permanent ID অপরিবর্তিত)।', 'Promote all eligible passing students while preserving Permanent IDs.', lang)}</div>
                  </div>
                  <button type="button" onClick={onPromoteAllEligible} className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-semibold cursor-pointer">
                    <RefreshCw className="w-3.5 h-3.5 inline mr-1" />
                    {b('শ্রেণি উন্নয়ন সম্পন্ন করুন', 'Run Promotion', lang)}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 22. Academic Reports (All 14 Reports) */}
          {activeModule === 'academic_reports' && (
            <AcademicReportsPanel
              lang={lang}
              students={students}
              teachers={teachers}
              teacherAssignments={teacherAssignments}
              routineSlots={routineSlots}
              exams={exams}
              assignments={assignments}
              curriculum={curriculumUnits}
              lessonPlans={lessonPlans}
            />
          )}
        </section>
      </div>

      {/* Cancel Class Reason Modal */}
      {cancelModalSlot && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-md p-5 space-y-4 text-xs shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('কারণসহ ক্লাস বাতিল করুন', 'Cancel Class with Reason', lang)}
              </h3>
              <button type="button" onClick={() => setCancelModalSlot(null)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
              <div className="font-bold">{cancelModalSlot.className} · {b(cancelModalSlot.subjectBn, cancelModalSlot.subjectEn, lang)}</div>
              <div className="text-slate-500 mt-0.5">Period {cancelModalSlot.period} · {cancelModalSlot.timeRange}</div>
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('কারণ নির্বাচন করুন (বাধ্যতামূলক)', 'Select Reason (Mandatory)', lang)}</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value as AcademicCancelClassReason)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                {CANCEL_CLASS_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('মন্তব্য / Remarks (ঐচ্ছিক)', 'Remarks (Optional)', lang)}</label>
              <textarea
                rows={2}
                value={cancelRemarks}
                onChange={(e) => setCancelRemarks(e.target.value)}
                placeholder={b('বাতিলের অতিরিক্ত বিবরণ লিখুন...', 'Enter additional details...', lang)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCancelModalSlot(null)} className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer">
                {b('ফিরে যান', 'Back', lang)}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onCancelClassSlot) {
                    onCancelClassSlot(cancelModalSlot.id, cancelReason, cancelRemarks);
                  } else {
                    onUpdateRoutineSlot(cancelModalSlot.id, {
                      status: 'cancelled',
                      cancelledReason: cancelReason,
                      cancelledRemarks: cancelRemarks,
                    });
                  }
                  setCancelModalSlot(null);
                  setCancelRemarks('');
                }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold cursor-pointer"
              >
                {b('ক্লাস বাতিল নিশ্চিত করুন', 'Confirm Cancel Class', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Inspection Modal */}
      {detailModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-md p-5 space-y-3 text-xs shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{detailModal.title}</h3>
              <button type="button" onClick={() => setDetailModal(null)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
              {detailModal.lines.map((line, i) => (
                <div key={i} className="p-2 rounded bg-slate-50 dark:bg-slate-800/70">{line}</div>
              ))}
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={() => setDetailModal(null)} className="px-4 py-1.5 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer">
                {b('বন্ধ করুন', 'Close', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Marksheet Preview Modal */}
      {marksheetStudent && exam && (
        <StudentMarksheetModal
          open={true}
          onClose={() => setMarksheetStudent(null)}
          lang={lang}
          student={marksheetStudent}
          school={school}
          exam={exam}
          gradingRules={gradingRules}
        />
      )}
    </div>
  );
};
