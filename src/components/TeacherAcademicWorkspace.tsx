import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Ban,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FolderOpen,
  GraduationCap,
  History,
  Lock,
  Play,
  Plus,
  QrCode,
  Radio,
  Search,
  Shield,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  X,
} from 'lucide-react';
import type {
  AcademicCancelClassReason,
  AssignmentItem,
  ClassworkItem,
  DailyLessonHomeworkItem,
  ExamRecord,
  ExamRoutineRecord,
  GradingRuleItem,
  KioskScanEvent,
  Language,
  LessonPlanItem,
  MasterRoutineRecord,
  NoticeImageAttachment,
  NoticeItem,
  NoticeLifecycleStatus,
  NotificationItem,
  NotificationPreferences,
  OfficialDocumentRecord,
  OfficialDocumentTemplate,
  RoutineSlot,
  SchoolRecord,
  StudentAttendanceHistoryEntry,
  StudentRecord,
  SubjectResultSubmission,
  SubstitutePermissionRecord,
  TeacherAttendanceLog,
  TeacherRecord,
  TeacherSchoolAssignment,
  TeacherSubjectAssignment,
} from '../types';
import {
  CANCEL_CLASS_REASONS,
  computeTeacherDailyTasks,
  computeTeacherPerformanceMetrics,
  computeTeacherWorkload,
} from '../utils/academicEngine';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type CreateNoticePayload,
} from '../utils/notificationAndNoticeEngine';
import type { CreateLocalExamPayload } from '../utils/examGovernanceEngine';
import {
  sanitizeActorDisplayForRole,
  type TeacherPartBUpdatePayload,
} from '../utils/adminAndTeacherIdentityEngine';
import { b } from '../i18n/translations';
import { StudentAcademicProgressPanel } from './AcademicProgressAndDocsPanel';
import { TodaysLessonsPanel } from './TodaysLessonsPanel';
import { TeacherMarksSubmissionPanel } from './ResultGovernancePanels';
import {
  DashboardNotificationPreview,
  NotificationCenterPanel,
} from './NotificationCenterView';
import { AutoIdAttendanceScanner } from './AutoIdAttendanceScanner';
import { NoticeCommunicationCenter } from './NoticeCommunicationCenter';
import { ExaminationManagementPanel } from './ExaminationManagementPanel';
import { RoutineManagementSystem } from './RoutineManagementSystem';
import { OfficialDocumentSystem } from './OfficialDocumentSystem';
import { ExamRoutineSystem } from './ExamRoutineSystem';
import { SchoolCoverBanner } from './SchoolCoverBanner';

interface TeacherAcademicWorkspaceProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  lang: Language;
  teacher: TeacherRecord;
  allTeachers: TeacherRecord[];
  onSwitchTeacher: (teacherId: string) => void;
  notifications: NotificationItem[];
  routineSlots: RoutineSlot[];
  students: StudentRecord[];
  kioskScans: KioskScanEvent[];
  exams: ExamRecord[];
  assignments: AssignmentItem[];
  teacherAssignments: TeacherSubjectAssignment[];
  teacherAttendance: TeacherAttendanceLog[];
  onTeacherCheckInOut: (teacherId: string, action: 'present' | 'late' | 'leave' | 'checkout') => void;
  lessonPlans: LessonPlanItem[];
  classworks: ClassworkItem[];
  onCreateClasswork: (cw: Omit<ClassworkItem, 'id'>) => void;
  onUpdateClassworkStudentStatus: (
    classworkId: string,
    studentId: string,
    status: 'completed' | 'pending' | 'not_submitted',
    feedback?: string
  ) => void;
  gradingRules: GradingRuleItem[];
  onStartClassSession: (slotId: string, lessonTopic: string) => void;
  onUpdateSessionDetails: (
    slotId: string,
    patch: {
      lessonTopic?: string;
      learningObjective?: string;
      classworkSummary?: string;
      teachingActivity?: string;
      teacherPrivateNotes?: string;
      homeworkSummary?: string;
    }
  ) => void;
  onCompleteClass: (slotId: string, lessonTopic: string, homeworkText: string) => void;
  onRequestSubstitute: (slotId: string, reason: string) => void;
  onUpdateAssignedMark: (examId: string, studentId: string, subjectEn: string, written: number, mcq?: number) => void;
  dailyLessons?: DailyLessonHomeworkItem[];
  substitutePermissions?: SubstitutePermissionRecord[];
  subjectSubmissions?: SubjectResultSubmission[];
  onGrantSubstitutePermission?: (
    slotId: string,
    substituteTeacherId: string,
    date: string,
    reason: string,
    durationDays: number
  ) => void;
  onRevokeSubstitutePermission?: (permissionId: string) => void;
  onCancelClassSlot?: (slotId: string, reason: AcademicCancelClassReason | string, remarks?: string) => void;
  onPublishDailyLesson?: (lesson: Omit<DailyLessonHomeworkItem, 'id' | 'studentStates'>) => void;
  onSubmitSubjectMarks?: (examId: string, className: string, subjectBn: string, subjectEn: string) => void;
  onRequestResultCorrection?: (examId: string, className: string, subjectEn: string, note: string) => void;
  // Notification, Auto ID Attendance, Notices & Local Exams
  notices?: NoticeItem[];
  attendanceHistory?: StudentAttendanceHistoryEntry[];
  onRecordAutoScan?: (params: {
    rawCode: string;
    schoolId: string;
    isLate: boolean;
    source: 'auto_camera' | 'manual_teacher' | 'kiosk';
    dateIso: string;
    allowedClasses?: string[];
  }) => {
    status: 'recorded' | 'duplicate' | 'not_found' | 'wrong_school' | 'unauthorized_class';
    messageBn: string;
    messageEn: string;
    student?: StudentRecord;
    firstScanTime?: string;
    scanEvent?: KioskScanEvent;
  };
  onManualAttendanceMark?: (
    student: StudentRecord,
    status: 'present' | 'late' | 'absent',
    dateIso: string
  ) => void;
  onNotifyAllAbsentGuardians?: (
    absentStudents: StudentRecord[],
    schoolId: string,
    dateIso: string
  ) => void;
  notificationPreferences?: NotificationPreferences;
  lastLoginIso?: string;
  onUpdateNotificationPreferences?: (next: NotificationPreferences) => void;
  onMarkNotificationRead?: (id: string, read: boolean) => void;
  onMarkAllNotificationsRead?: () => void;
  onTogglePinNotification?: (id: string) => void;
  onNavigateFromNotification?: (item: NotificationItem) => void;
  onResetLastVisitIso?: (iso: string) => void;
  onCreateNoticeStructured?: (payload: CreateNoticePayload) => void;
  onEditNotice?: (
    noticeId: string,
    patch: {
      titleBn: string;
      titleEn: string;
      bodyBn: string;
      bodyEn: string;
      validityLabel?: string;
      isEmergency?: boolean;
    }
  ) => void;
  onTransitionNoticeStatus?: (noticeId: string, nextStatus: NoticeLifecycleStatus) => void;
  onMarkNoticeRead?: (noticeId: string, userId: string) => void;
  onCreateLocalExam?: (payload: CreateLocalExamPayload) => void;
  masterRoutines?: MasterRoutineRecord[];
  // Global Teacher Identity, Multi-School Switcher, Part B, Docs, Exam Routine & Student Admission
  schools?: SchoolRecord[];
  activeSchool?: SchoolRecord;
  schoolAssignments?: TeacherSchoolAssignment[];
  activeAssignment?: TeacherSchoolAssignment;
  approvedSchoolAssignments?: TeacherSchoolAssignment[];
  onSwitchSchool?: (schoolId: string) => void;
  onApplyJoinSchool?: (schoolId: string, designation: string, subjects: string[]) => void;
  onLeaveSchool?: (assignmentId: string) => void;
  onUpdatePartB?: (teacherId: string, payload: TeacherPartBUpdatePayload) => void;
  onOpenAddStudent6Part?: () => void;
  officialDocuments?: OfficialDocumentRecord[];
  documentTemplates?: OfficialDocumentTemplate[];
  onUpdateOfficialDocuments?: (next: OfficialDocumentRecord[], toast?: string) => void;
  examRoutines?: ExamRoutineRecord[];
  maxNoticeImages?: number;
  onUpdateNoticeImages?: (
    noticeId: string,
    nextImages: NoticeImageAttachment[],
    actionType: 'Image Added' | 'Image Removed' | 'Image Replaced',
    summary: string
  ) => void;
  onOpenPhotoEditor?: () => void;
  settingsCenterElement?: React.ReactNode;
}

export const TeacherAcademicWorkspace: React.FC<TeacherAcademicWorkspaceProps> = ({
  activeTab,
  onSelectTab,
  lang,
  teacher,
  allTeachers,
  onSwitchTeacher,
  notifications,
  routineSlots,
  students,
  kioskScans,
  exams,
  assignments,
  teacherAssignments,
  teacherAttendance,
  onTeacherCheckInOut,
  lessonPlans,
  classworks,
  onCreateClasswork,
  onUpdateClassworkStudentStatus,
  gradingRules,
  onStartClassSession,
  onUpdateSessionDetails,
  onCompleteClass,
  onRequestSubstitute,
  onUpdateAssignedMark,
  dailyLessons = [],
  substitutePermissions = [],
  subjectSubmissions = [],
  onGrantSubstitutePermission,
  onRevokeSubstitutePermission,
  onCancelClassSlot,
  onPublishDailyLesson,
  onSubmitSubjectMarks,
  onRequestResultCorrection,
  notices = [],
  attendanceHistory = [],
  onRecordAutoScan,
  onManualAttendanceMark,
  onNotifyAllAbsentGuardians,
  notificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES,
  lastLoginIso = '2026-11-19T09:00:00',
  onUpdateNotificationPreferences,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onTogglePinNotification,
  onNavigateFromNotification,
  onResetLastVisitIso,
  onCreateNoticeStructured,
  onEditNotice,
  onTransitionNoticeStatus,
  onMarkNoticeRead,
  onCreateLocalExam,
  masterRoutines = [],
  schools = [],
  activeSchool,
  schoolAssignments = [],
  activeAssignment,
  approvedSchoolAssignments = [],
  onSwitchSchool,
  onApplyJoinSchool,
  onLeaveSchool,
  onUpdatePartB,
  onOpenAddStudent6Part,
  officialDocuments = [],
  documentTemplates = [],
  onUpdateOfficialDocuments,
  examRoutines = [],
  maxNoticeImages = 4,
  onUpdateNoticeImages,
  onOpenPhotoEditor,
  settingsCenterElement,
}) => {
  const [subReason, setSubReason] = useState('Teacher Absent');
  const [subSlotId, setSubSlotId] = useState<string | null>(null);
  const [cwTitle, setCwTitle] = useState('');
  const [cwFeedbackDraft, setCwFeedbackDraft] = useState<Record<string, string>>({});
  const [joinSchoolSearch, setJoinSchoolSearch] = useState('');
  const [joinDesignation, setJoinDesignation] = useState('সহকারী শিক্ষক');
  const [joinSubjectsInput, setJoinSubjectsInput] = useState('বাংলা, গণিত');

  // Part B Professional Profile form state
  const [partBDegree, setPartBDegree] = useState(teacher.academicDegree ?? teacher.qualification ?? 'B.A / B.Ed');
  const [partBMajor, setPartBMajor] = useState(teacher.subjectMajor ?? teacher.subjects.join(', ') ?? 'বাংলা ও গণিত');
  const [partBTraining, setPartBTraining] = useState(teacher.training ?? 'C-in-Ed / B.Ed');
  const [partBExp, setPartBExp] = useState(teacher.experienceYears ?? 3);
  const [partBPrevInst, setPartBPrevInst] = useState(teacher.previousInstitution ?? '');
  const [partBStatus, setPartBStatus] = useState<NonNullable<TeacherRecord['employmentStatus']>>(
    teacher.employmentStatus ?? 'Active'
  );
  const [partBType, setPartBType] = useState<NonNullable<TeacherRecord['teacherType']>>(
    teacher.teacherType ?? 'Permanent'
  );

  // Start Class Confirmation Modal & Cancel Class Modal
  const [confirmStartSlot, setConfirmStartSlot] = useState<RoutineSlot | null>(null);
  const [cancelModalSlot, setCancelModalSlot] = useState<RoutineSlot | null>(null);
  const [cancelReason, setCancelReason] = useState<AcademicCancelClassReason>('Teacher Unavailable');
  const [cancelRemarks, setCancelRemarks] = useState('');

  // Substitute Permission Modal (My Classes)
  const [grantPermSlot, setGrantPermSlot] = useState<RoutineSlot | null>(null);
  const [permSubTeacherId, setPermSubTeacherId] = useState(
    allTeachers.find((t) => t.schoolId === teacher.schoolId && t.id !== teacher.id)?.id ?? ''
  );
  const [permDate, setPermDate] = useState('2026-11-19');
  const [permReason, setPermReason] = useState('Personal Leave / Training');
  const [permDuration, setPermDuration] = useState(1);

  const myAttendance = teacherAttendance.find((a) => a.teacherId === teacher.id);
  const myAssignments = teacherAssignments.filter((a) => a.teacherId === teacher.id);
  const scopedSchoolId = activeSchool?.id ?? activeAssignment?.schoolId ?? teacher.schoolId;
  const scopedSchoolNameBn = activeSchool?.nameBn ?? activeAssignment?.schoolNameBn ?? teacher.schoolNameBn;
  const canAddStudent = activeAssignment ? activeAssignment.permissions.addStudent : true;
  const canCreateNotice = activeAssignment ? activeAssignment.permissions.createNotice : true;
  const canGenerateDocs = activeAssignment ? activeAssignment.permissions.generateDocs : true;
  const canTakeAttendance = activeAssignment ? activeAssignment.permissions.takeAttendance : true;
  const workload = useMemo(
    () => computeTeacherWorkload(teacher, teacherAssignments, routineSlots),
    [teacher, teacherAssignments, routineSlots]
  );

  const dailyTasksReport = useMemo(
    () => computeTeacherDailyTasks(teacher, myAttendance, routineSlots, dailyLessons, subjectSubmissions),
    [teacher, myAttendance, routineSlots, dailyLessons, subjectSubmissions]
  );

  const perfMetrics = useMemo(
    () => computeTeacherPerformanceMetrics(teacher, routineSlots, dailyLessons, myAttendance),
    [teacher, routineSlots, dailyLessons, myAttendance]
  );

  const myTodaySlots = routineSlots.filter(
    (s) => (s.substituteTeacherId ?? s.teacherId) === teacher.id
  );
  const myOwnedSlots = routineSlots.filter((s) => s.teacherId === teacher.id);
  const liveSlot = myTodaySlots.find((s) => s.status === 'in_progress');
  const nextSlot = myTodaySlots.find((s) => s.status === 'pending');
  const completedCount = myTodaySlots.filter((s) => s.status === 'completed').length;
  const remainingCount = myTodaySlots.filter((s) => s.status === 'pending').length;

  const autoPresentCount = kioskScans.filter((k) =>
    students.some((st) => st.id === k.studentId)
  ).length;

  const sameSchoolOtherTeachers = allTeachers.filter(
    (t) => t.schoolId === teacher.schoolId && t.id !== teacher.id
  );

  // Tab: Notification Center
  if (activeTab === 'notifications') {
    return (
      <NotificationCenterPanel
        lang={lang}
        role="teacher"
        schoolId={teacher.schoolId}
        teacherId={teacher.id}
        notifications={notifications}
        preferences={notificationPreferences}
        lastLoginIso={lastLoginIso}
        onUpdatePreferences={onUpdateNotificationPreferences ?? (() => {})}
        onMarkRead={onMarkNotificationRead ?? (() => {})}
        onMarkAllRead={onMarkAllNotificationsRead ?? (() => {})}
        onTogglePin={onTogglePinNotification ?? (() => {})}
        onNavigateFromNotification={
          onNavigateFromNotification ?? ((item) => onSelectTab(item.targetTab ?? 'dashboard'))
        }
        onResetLastVisitIso={onResetLastVisitIso ?? (() => {})}
      />
    );
  }

  // Tab: Notices & Communication Center
  if (activeTab === 'notices') {
    return (
      <NoticeCommunicationCenter
        lang={lang}
        role="teacher"
        userId={teacher.id}
        actorName={teacher.nameBn}
        schoolId={scopedSchoolId}
        notices={notices}
        teachers={allTeachers}
        students={students}
        canCreateOverride={canCreateNotice}
        maxNoticeImages={maxNoticeImages}
        onUpdateNoticeImages={onUpdateNoticeImages}
        onCreateNotice={onCreateNoticeStructured ?? (() => {})}
        onEditNotice={onEditNotice ?? (() => {})}
        onTransitionNoticeStatus={onTransitionNoticeStatus ?? (() => {})}
        onMarkNoticeRead={onMarkNoticeRead ?? (() => {})}
      />
    );
  }

  // Tab: Daily Auto ID Card Attendance Scanner
  if (activeTab === 'attendance') {
    return (
      <AutoIdAttendanceScanner
        lang={lang}
        school={activeSchool}
        schoolId={scopedSchoolId}
        schoolNameBn={scopedSchoolNameBn}
        canTakeAttendance={canTakeAttendance}
        allowedClasses={
          activeAssignment?.assignedClasses.length
            ? activeAssignment.assignedClasses
            : teacher.assignedClasses
        }
        students={students}
        kioskScans={kioskScans}
        attendanceHistory={attendanceHistory}
        onRecordAutoScan={
          onRecordAutoScan ??
          (() => ({ status: 'not_found', messageBn: 'স্ক্যানার সংযুক্ত নয়।', messageEn: 'Scanner handler not wired.' }))
        }
        onManualAttendanceMark={onManualAttendanceMark ?? (() => {})}
        onNotifyAllAbsentGuardians={onNotifyAllAbsentGuardians ?? (() => {})}
      />
    );
  }

  // Tab: My Students & Teacher-Led 6-Part Student Admission
  if (activeTab === 'my_students') {
    return (
      <div className="space-y-5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-700" />
              {b(`আমার শিক্ষার্থী ও ভর্তি (${scopedSchoolNameBn})`, `My Students & Admission (${scopedSchoolNameBn})`, lang)}
            </h1>
            <p className="text-slate-500 mt-0.5">
              {b(
                'সক্রিয় বিদ্যালয়ে নির্ধারিত শিক্ষার্থীর তালিকা এবং অনুমোদিত শিক্ষক হিসেবে ৬-অংশের নতুন শিক্ষার্থী ভর্তি।',
                'Scoped students for the active school and 6-part new student admission when authorized.',
                lang
              )}
            </p>
          </div>
          {onOpenAddStudent6Part && (
            <button
              type="button"
              disabled={!canAddStudent || scopedSchoolId === 'UNASSIGNED'}
              onClick={onOpenAddStudent6Part}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {b('+ নতুন শিক্ষার্থী ভর্তি (৬-অংশ)', '+ Admit New Student (6-Part)', lang)}
            </button>
          )}
        </div>

        {!canAddStudent && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-medium">
            {b(
              'এই বিদ্যালয়ে আপনার "Add Student" অনুমতি বর্তমানে বন্ধ রয়েছে। অনুমতির জন্য School Admin-এর সাথে যোগাযোগ করুন।',
              'Student admission permission is currently disabled for your assignment at this school.',
              lang
            )}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                <th className="py-2.5 px-4 font-semibold">Student ID</th>
                <th className="py-2.5 px-3 font-semibold">{b('নাম', 'Name', lang)}</th>
                <th className="py-2.5 px-3 font-semibold">{b('শ্রেণি / রোল', 'Class / Roll', lang)}</th>
                <th className="py-2.5 px-3 font-semibold">{b('উপস্থিতি', 'Attendance', lang)}</th>
                <th className="py-2.5 px-4 font-semibold">{b('অবস্থা', 'Status', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {students.map((st) => (
                <tr key={st.id}>
                  <td className="py-2.5 px-4 font-mono font-semibold text-blue-700 dark:text-blue-400">
                    {st.permanentId}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                    {b(st.nameBn, st.nameEn, lang)}
                  </td>
                  <td className="py-2.5 px-3">{st.className} ({st.section}) · Roll {st.roll}</td>
                  <td className="py-2.5 px-3 tabular-nums">{st.attendancePct}%</td>
                  <td className="py-2.5 px-4 font-semibold">{st.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Tab: Join & Switch Schools
  if (activeTab === 'join_schools') {
    const myAssignmentsList = schoolAssignments.filter((a) => a.teacherId === teacher.id);
    const searchableSchools = schools.filter((sc) => {
      const q = joinSchoolSearch.trim().toLowerCase();
      if (!q) return sc.status === 'active';
      return (
        sc.status === 'active' &&
        (sc.nameBn.toLowerCase().includes(q) ||
          sc.nameEn.toLowerCase().includes(q) ||
          sc.code.toLowerCase().includes(q) ||
          sc.district.toLowerCase().includes(q))
      );
    });

    return (
      <div className="space-y-6 text-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-700" />
            {b('বিদ্যালয়ে যোগদান ও মাল্টি-স্কুল আইসোলেশন', 'Join Schools & Multi-School Switcher', lang)}
          </h1>
          <p className="text-slate-500 mt-0.5">
            {b(
              `আপনার স্থায়ী Global Teacher ID (${teacher.teacherCode}) একই থাকবে। প্রতিটি বিদ্যালয়ের কার্যক্রম সম্পূর্ণ আলাদা।`,
              `Your permanent Global Teacher ID (${teacher.teacherCode}) stays identical while each school workspace stays strictly isolated.`,
              lang
            )}
          </p>
        </div>

        {/* My School Assignments */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {b('আমার বিদ্যালয়সমূহ ও আবেদন অবস্থা', 'My School Assignments & Applications', lang)}
          </h2>
          {myAssignmentsList.length === 0 ? (
            <p className="text-slate-500">{b('এখনো কোনো বিদ্যালয়ে যুক্ত হননি। নিচ থেকে আবেদন করুন।', 'No school assignments yet.', lang)}</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {myAssignmentsList.map((asgn) => (
                <div key={asgn.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {asgn.schoolNameBn} ({asgn.schoolId})
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      {asgn.designation} · {asgn.assignedSubjects.join(', ') || b('বিষয় নির্ধারণ অপেক্ষমাণ', 'Subjects pending', lang)} ·{' '}
                      <span className="font-semibold">
                        {asgn.approvalStatus} / {asgn.employmentStatus}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Permissions: {asgn.permissions.addStudent ? 'AddStudent✓ ' : ''}
                      {asgn.permissions.createNotice ? 'Notice✓ ' : ''}
                      {asgn.permissions.generateDocs ? 'Docs✓ ' : ''}
                      {asgn.permissions.takeAttendance ? 'Attendance✓' : ''}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {asgn.approvalStatus === 'approved' && asgn.employmentStatus === 'Active' && onSwitchSchool && (
                      <button
                        type="button"
                        onClick={() => {
                          onSwitchSchool(asgn.schoolId);
                          onSelectTab('dashboard');
                        }}
                        className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                          scopedSchoolId === asgn.schoolId
                            ? 'bg-emerald-700 text-white'
                            : 'border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        {scopedSchoolId === asgn.schoolId
                          ? b('সক্রিয় কর্মক্ষেত্র', 'Active Workspace', lang)
                          : b('🏫 এই বিদ্যালয়ে যান', 'Switch to School', lang)}
                      </button>
                    )}
                    {asgn.employmentStatus === 'Active' && asgn.approvalStatus === 'approved' && onLeaveSchool && (
                      <button
                        type="button"
                        onClick={() => onLeaveSchool(asgn.id)}
                        className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-semibold cursor-pointer"
                      >
                        {b('বিদ্যালয় ত্যাগ করুন', 'Leave School', lang)}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Apply to Join a School */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {b('নতুন বিদ্যালয়ে যোগদানের আবেদন করুন', 'Apply to Join an Active School', lang)}
            </h2>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={joinSchoolSearch}
                onChange={(e) => setJoinSchoolSearch(e.target.value)}
                placeholder={b('স্কুল নাম বা কোড খুঁজুন...', 'Search school name or code...', lang)}
                className="h-8 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={joinDesignation}
              onChange={(e) => setJoinDesignation(e.target.value)}
              placeholder={b('প্রত্যাশিত পদবি', 'Designation', lang)}
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
            <input
              type="text"
              value={joinSubjectsInput}
              onChange={(e) => setJoinSubjectsInput(e.target.value)}
              placeholder={b('বিষয়সমূহ (কমা দিয়ে)', 'Subjects (comma-separated)', lang)}
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {searchableSchools.map((sc) => {
              const existing = myAssignmentsList.find((a) => a.schoolId === sc.id);
              return (
                <div
                  key={sc.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{sc.nameBn}</div>
                    <div className="text-slate-500">
                      {sc.code} · {sc.district} · {sc.schoolType}
                    </div>
                  </div>
                  {onApplyJoinSchool && (
                    <button
                      type="button"
                      disabled={Boolean(existing && (existing.approvalStatus === 'pending' || (existing.approvalStatus === 'approved' && existing.employmentStatus === 'Active')))}
                      onClick={() =>
                        onApplyJoinSchool(
                          sc.id,
                          joinDesignation,
                          joinSubjectsInput.split(',').map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-semibold cursor-pointer shrink-0"
                    >
                      {existing?.approvalStatus === 'pending'
                        ? b('অপেক্ষমাণ (Pending)', 'Pending', lang)
                        : existing?.approvalStatus === 'approved' && existing.employmentStatus === 'Active'
                          ? b('যুক্ত আছেন', 'Joined', lang)
                          : b('যোগদানের আবেদন', 'Apply to Join', lang)}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Tab: Exam Routine & Invigilator Duties
  if (activeTab === 'exam_routine' && activeSchool) {
    return (
      <ExamRoutineSystem
        lang={lang}
        role="teacher"
        school={activeSchool}
        actorName={teacher.nameBn}
        teacherId={teacher.id}
        teachers={allTeachers}
        exams={exams}
        examRoutines={examRoutines}
      />
    );
  }

  // Tab: Official Documents (Teacher Can Generate Only If Authorized, View Own Experience/Salary/NOC Docs)
  if (activeTab === 'my_documents' && activeSchool) {
    return (
      <OfficialDocumentSystem
        lang={lang}
        role="teacher"
        school={activeSchool}
        actorName={teacher.nameBn}
        students={students}
        teachers={allTeachers}
        exams={exams}
        documents={officialDocuments}
        templates={documentTemplates}
        onUpdateDocuments={onUpdateOfficialDocuments ?? (() => {})}
        canGenerate={canGenerateDocs}
      />
    );
  }

  // Tab 1: Local Class/Model Tests + Strict Subject-Based Marks Entry & Submit Marks Governance
  if (activeTab === 'assessment' || activeTab === 'marks') {
    return (
      <div className="space-y-6">
        <ExaminationManagementPanel
          lang={lang}
          role="teacher"
          schoolId={teacher.schoolId}
          actorName={teacher.nameBn}
          teacher={teacher}
          schools={[]}
          students={students}
          exams={exams}
          teacherAssignments={teacherAssignments}
          onCreateLocalExam={onCreateLocalExam ?? (() => {})}
          onToggleCentralTermPublish={() => {}}
          onUpdateExamMark={onUpdateAssignedMark}
        />
        <TeacherMarksSubmissionPanel
          lang={lang}
          teacher={teacher}
          allTeachers={allTeachers}
          onSwitchTeacher={onSwitchTeacher}
          teacherAssignments={teacherAssignments}
          exams={exams}
          students={students}
          gradingRules={gradingRules}
          subjectSubmissions={subjectSubmissions}
          onUpdateAssignedMark={onUpdateAssignedMark}
          onSubmitSubjectMarks={onSubmitSubjectMarks ?? (() => {})}
          onRequestResultCorrection={onRequestResultCorrection ?? (() => {})}
        />
      </div>
    );
  }

  // Tab: Teaching & আজকের পড়া (Daily Lesson & Homework Publishing)
  if (activeTab === 'teaching') {
    return (
      <div className="space-y-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              {b('📚 Teaching ও আজকের পড়া প্রকাশ', "Teaching & Today's Lesson Publishing", lang)}
            </h1>
            <p className="text-slate-500">
              {b(
                'শুধুমাত্র আপনার নির্ধারিত শ্রেণি ও বিষয়ে আজকের পড়া ও হোমওয়ার্ক প্রকাশ করতে পারবেন।',
                'Publish Today’s Lesson & Homework strictly within your assigned classes and subjects.',
                lang
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('classwork')}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
          >
            {b('Classwork পরিচালনা →', 'Manage Classwork →', lang)}
          </button>
        </div>

        <TodaysLessonsPanel
          role="teacher"
          lang={lang}
          schoolId={teacher.schoolId}
          dailyLessons={dailyLessons}
          teacher={teacher}
          teacherAssignments={teacherAssignments}
          students={students}
          onPublishDailyLesson={onPublishDailyLesson}
        />
      </div>
    );
  }

  // Tab: My Classes (Class Ownership / Teaching Lock + Substitute Permission Grant)
  if (activeTab === 'my_classes') {
    const myPermissions = substitutePermissions.filter((p) => p.ownerTeacherId === teacher.id);
    return (
      <div className="space-y-5 text-xs">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              {b('📚 My Classes — শ্রেণি স্বত্ব ও Substitute Permission', 'My Classes — Class Ownership & Substitute Permission', lang)}
            </h1>
            <p className="text-slate-500 mt-0.5">
              {b(
                'আপনার নির্ধারিত Class + Subject স্লটগুলো আপনার নামে সংরক্ষিত (Teaching Lock)। প্রয়োজনে একই স্কুলের অন্য শিক্ষককে নির্দিষ্ট তারিখের জন্য Substitute Permission দিতে পারবেন।',
                'Assigned Class + Subject slots are locked to your teaching ownership. Grant temporary Substitute Permission to a colleague when needed.',
                lang
              )}
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold tabular-nums">
            🔒 {myOwnedSlots.length} {b('টি লকড স্লট', 'Owned Slots', lang)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myOwnedSlots.map((slot) => (
            <div key={slot.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                    {slot.dayOfWeek ?? 'রবিবার (Sun)'} · Period {slot.period} · {slot.timeRange}
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {slot.className} ({slot.section}) — {b(slot.subjectBn, slot.subjectEn, lang)}
                  </div>
                  <div className="text-slate-500">Room {slot.room} · Duration: {slot.durationMins ?? 45} mins</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold shrink-0">
                  🔒 Owner
                </span>
              </div>
              {slot.substituteTeacher && (
                <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                  {b('বিকল্প শিক্ষক:', 'Substitute:', lang)} <strong>{slot.substituteTeacher}</strong> ({slot.substituteReason})
                </div>
              )}
              {onGrantSubstitutePermission && (
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setGrantPermSlot(slot);
                      setPermSubTeacherId(sameSchoolOtherTeachers[0]?.id ?? '');
                    }}
                    className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-800 dark:text-amber-300 font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer"
                  >
                    {b('বিকল্প অনুমোদন দিন (Grant Substitute)', 'Grant Substitute Permission', lang)}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Granted Substitute Permissions History */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {b('প্রদত্ত Substitute Permission তালিকা', 'My Substitute Permissions', lang)}
          </h2>
          {myPermissions.length === 0 ? (
            <div className="text-slate-500 py-3">{b('কোনো Substitute Permission দেওয়া হয়নি।', 'No substitute permissions granted yet.', lang)}</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {myPermissions.map((sp) => (
                <div key={sp.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {sp.className} · {sp.subjectBn} → {sp.substituteTeacherName}
                    </div>
                    <div className="text-slate-500">
                      Date: {sp.date} · {sp.durationDays} day(s) · {sp.reason} · Status: <strong>{sp.status}</strong>
                    </div>
                  </div>
                  {sp.status !== 'revoked' && onRevokeSubstitutePermission && (
                    <button
                      type="button"
                      onClick={() => onRevokeSubstitutePermission(sp.id)}
                      className="px-3 py-1 rounded border border-red-300 text-red-700 dark:text-red-400 font-semibold cursor-pointer"
                    >
                      {b('প্রত্যাহার (Revoke)', 'Revoke', lang)}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {grantPermSlot && (
          <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-md p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {b('Substitute Permission প্রদান করুন', 'Grant Substitute Permission', lang)}
                </h3>
                <button type="button" onClick={() => setGrantPermSlot(null)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                <strong>{grantPermSlot.className}</strong> · {b(grantPermSlot.subjectBn, grantPermSlot.subjectEn, lang)} ({grantPermSlot.timeRange})
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('বিকল্প শিক্ষক (একই স্কুল)', 'Target Substitute Teacher (Same School)', lang)}</label>
                <select
                  value={permSubTeacherId}
                  onChange={(e) => setPermSubTeacherId(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {sameSchoolOtherTeachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.nameBn} ({t.subjects.join(', ')})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold mb-1">{b('তারিখ', 'Date', lang)}</label>
                  <input type="date" value={permDate} onChange={(e) => setPermDate(e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('মেয়াদ (দিন)', 'Duration (Days)', lang)}</label>
                  <input type="number" min={1} max={15} value={permDuration} onChange={(e) => setPermDuration(Number(e.target.value))} className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('কারণ', 'Reason', lang)}</label>
                <input type="text" value={permReason} onChange={(e) => setPermReason(e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setGrantPermSlot(null)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer">
                  {b('বাতিল', 'Cancel', lang)}
                </button>
                <button
                  type="button"
                  disabled={!permSubTeacherId || !permReason.trim()}
                  onClick={() => {
                    onGrantSubstitutePermission?.(grantPermSlot.id, permSubTeacherId, permDate, permReason, permDuration);
                    setGrantPermSlot(null);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer"
                >
                  {b('অনুমতি জমা দিন', 'Confirm Permission', lang)}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Tab 2: Teacher Assigned Classes, Subjects & Personal Routine (Read-Only RBAC Guard)
  if (activeTab === 'routine' || activeTab === 'my_routine') {
    return (
      <div className="space-y-5 text-xs">
        <RoutineManagementSystem
          lang={lang}
          role="teacher"
          actorName={teacher.nameBn}
          routines={masterRoutines}
          teachers={allTeachers}
          teacherAssignments={teacherAssignments}
          teacherRecord={teacher}
          onUpdateRoutines={() => {}}
        />

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-4 flex items-start gap-2.5 no-print">
          <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-900 dark:text-amber-200">
              {b('নিরাপত্তা নীতি: নির্ধারিত শ্রেণি ও বিষয় (View Only)', 'Security Rule: Assigned Classes & Subjects (Read-Only)', lang)}
            </div>
            <p className="text-amber-800 dark:text-amber-300 mt-0.5">
              {b(
                'শিক্ষক নিজের ইচ্ছায় অন্য শ্রেণি বা বিষয় তৈরি বা পরিবর্তন করতে পারবেন না। শুধুমাত্র School Admin অনুমোদন ও নির্ধারণ করতে পারবেন।',
                'Teachers can view their assigned classes, sections, subjects, rooms, and weekly load, but cannot self-assign or alter class/subject allocations without School Admin approval.',
                lang
              )}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {b('আমার নির্ধারিত শ্রেণি ও বিষয়সমূহ', 'My Assigned Classes, Sections & Subjects', lang)}
            </h2>
            <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
              {workload.weeklyPeriods} {b('পিরিয়ড/সপ্তাহ', 'periods/week', lang)}
            </span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                <th className="py-3 px-4 font-semibold">{b('শ্রেণি ও শাখা', 'Class & Section', lang)}</th>
                <th className="py-3 px-3 font-semibold">{b('বিষয়', 'Subject', lang)}</th>
                <th className="py-3 px-3 font-semibold">Room</th>
                <th className="py-3 px-3 font-semibold text-right">{b('সাপ্তাহিক ক্লাস', 'Weekly Classes', lang)}</th>
                <th className="py-3 px-4 font-semibold">{b('অনুমোদনকারী', 'Approved By', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {myAssignments.map((a) => (
                <tr key={a.id}>
                  <td className="py-3 px-4 font-bold">{a.className} ({a.section})</td>
                  <td className="py-3 px-3 font-semibold">{b(a.subjectBn, a.subjectEn, lang)} ({a.subjectCode})</td>
                  <td className="py-3 px-3 font-mono">Room {a.room}</td>
                  <td className="py-3 px-3 text-right tabular-nums font-bold">{a.weeklyPeriods}</td>
                  <td className="py-3 px-4 text-slate-500">{a.assignedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {b('ব্যক্তিগত দৈনিক ও সাপ্তাহিক রুটিন', 'Teacher Personal Routine', lang)}
          </h2>
          {routineSlots.map((slot) => (
            <div key={slot.id} className="py-2.5 border-b last:border-b-0 border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {slot.dayOfWeek ?? 'রবিবার (Sun)'} · Period {slot.period} ({slot.timeRange}) · {b(slot.subjectBn, slot.subjectEn, lang)}
                </div>
                <div className="text-slate-500">{slot.className} ({slot.section}) · Room {slot.room}</div>
              </div>
              <span className="font-semibold text-blue-700 dark:text-blue-400">
                {(slot.substituteTeacherId ?? slot.teacherId) === teacher.id ? b('আপনার ক্লাস', 'Your Class', lang) : slot.teacherName}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Tab 3: Classwork & Lesson Management
  if (activeTab === 'classwork') {
    return (
      <div className="space-y-5 text-xs">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <h1 className="text-base font-bold text-slate-900 dark:text-white">
            {b('দৈনিক Classwork তৈরি ও শিক্ষার্থীর কাজের অবস্থা (Completed / Pending / Not Submitted)', 'Daily Classwork & Student Status', lang)}
          </h1>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={cwTitle}
              onChange={(e) => setCwTitle(e.target.value)}
              placeholder={b('নতুন Classwork শিরোনাম...', 'New in-class work task...', lang)}
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex-1 min-w-[220px]"
            />
            <button
              type="button"
              onClick={() => {
                if (!cwTitle.trim()) return;
                onCreateClasswork({
                  date: '2026-11-18',
                  className: 'Class 4',
                  section: 'ক (A)',
                  subjectBn: teacher.subjects[0] ?? 'গণিত',
                  subjectEn: teacher.subjects[0] ?? 'Mathematics',
                  teacherId: teacher.id,
                  teacherName: teacher.nameBn,
                  titleBn: cwTitle.trim(),
                  titleEn: cwTitle.trim(),
                  topic: 'আজকের পাঠ অনুশীলন',
                  studentStatuses: students.slice(0, 3).map((st) => ({
                    studentId: st.id,
                    studentName: st.nameBn,
                    roll: st.roll,
                    status: 'pending',
                  })),
                });
                setCwTitle('');
              }}
              className="h-9 px-4 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer"
            >
              + {b('Classwork যোগ করুন', 'Create Classwork', lang)}
            </button>
          </div>
        </div>

        {classworks.map((cw) => (
          <div key={cw.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <div className="font-bold text-sm text-slate-900 dark:text-white">{b(cw.titleBn, cw.titleEn, lang)}</div>
            <div className="text-slate-500">{cw.className} · {b(cw.subjectBn, cw.subjectEn, lang)} · {cw.date}</div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {cw.studentStatuses.map((st) => {
                const key = `${cw.id}-${st.studentId}`;
                return (
                  <div key={st.studentId} className="py-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{st.studentName} (Roll {st.roll})</span>
                    <div className="flex items-center gap-2">
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
                        className="h-7 px-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      >
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="not_submitted">Not Submitted</option>
                      </select>
                      <input
                        type="text"
                        value={cwFeedbackDraft[key] ?? st.feedback ?? ''}
                        onChange={(e) => setCwFeedbackDraft((p) => ({ ...p, [key]: e.target.value }))}
                        placeholder="Feedback..."
                        className="h-7 px-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateClassworkStudentStatus(cw.id, st.studentId, st.status, cwFeedbackDraft[key] ?? st.feedback)}
                        className="h-7 px-2.5 rounded bg-blue-700 text-white font-semibold cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Tab 4: Student Academic Progress
  if (activeTab === 'progress') {
    return (
      <StudentAcademicProgressPanel
        lang={lang}
        students={students}
        exams={exams}
        assignments={assignments}
        classworks={classworks}
        gradingRules={gradingRules}
      />
    );
  }

  // Tab 5: Teacher Performance & Reports
  if (activeTab === 'reports') {
    return (
      <div className="space-y-5 text-xs">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-700" />
              {b('শিক্ষকের পারফরম্যান্স ও দৈনিক রিপোর্ট', 'Teacher Performance & Daily Summary Report', lang)}
            </h1>
            <span className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {perfMetrics.overallScorePct}%
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: b('উপস্থিতি', 'Attendance', lang), val: perfMetrics.attendancePct },
              { label: b('সময়মত শুরু', 'On-Time Start', lang), val: perfMetrics.onTimeStartPct },
              { label: b('ক্লাস সম্পন্ন', 'Class Completion', lang), val: perfMetrics.classCompletionPct },
              { label: b('হোমওয়ার্ক প্রকাশ', 'Homework Rate', lang), val: perfMetrics.homeworkSubmissionPct },
              { label: b('এডমিন মূল্যায়ন', 'Admin Evaluation', lang), val: perfMetrics.adminEvaluationPct },
            ].map((m) => (
              <div key={m.label} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500">{m.label}</div>
                <div className="text-lg font-bold tabular-nums mt-1 text-slate-900 dark:text-white">{m.val}%</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {b('আজকের করণীয় কাজের রিপোর্ট', "Today's Daily Task Checklist Report", lang)} ({dailyTasksReport.completedCount}/{dailyTasksReport.totalCount})
          </h2>
          {dailyTasksReport.tasks.map((tk) => (
            <div key={tk.id} className="py-2 border-b last:border-b-0 border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span>{b(tk.titleBn, tk.titleEn, lang)}</span>
              <span className={`font-semibold ${tk.status === 'completed' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600'}`}>
                {tk.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Tab 6: Teacher Settings + Part B Professional Info Editor + School Switcher
  if (activeTab === 'settings') {
    return (
      <div className="space-y-5 text-xs">
        {settingsCenterElement}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-700" />
              {b('শিক্ষক গ্লোবাল প্রোফাইল ও পার্ট-খ (প্রফেশনাল তথ্য)', 'Teacher Global Profile & Part B Professional Info', lang)}
            </h1>
            {onOpenPhotoEditor && (
              <button
                type="button"
                onClick={onOpenPhotoEditor}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                {b('প্রোফাইল ছবি পরিবর্তন / ক্রপ', 'Edit / Crop Profile Photo', lang)}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="relative shrink-0">
              {teacher.photoUrl ? (
                <img
                  src={teacher.photoUrl}
                  alt={teacher.nameEn}
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-emerald-700 text-white font-bold flex items-center justify-center text-base">
                  {teacher.nameBn.charAt(0)}
                </div>
              )}
              {onOpenPhotoEditor && (
                <button
                  type="button"
                  onClick={onOpenPhotoEditor}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-700 text-white border-2 border-white dark:border-slate-900 flex items-center justify-center cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                </button>
              )}
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white">{teacher.nameBn}</div>
              <div className="text-slate-500">{teacher.teacherCode} · {teacher.designation}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="text-slate-500">{b('নাম ও পদবি', 'Name & Designation', lang)}</div>
              <div className="font-bold mt-1">{teacher.nameBn} ({teacher.designation})</div>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="text-slate-500">{b('স্থায়ী গ্লোবাল টিচার কোড ও বর্তমান বিদ্যালয়', 'Permanent Global Teacher ID & Active School', lang)}</div>
              <div className="font-mono font-bold mt-1">{teacher.teacherCode} · {scopedSchoolNameBn}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">{b('ডেমো শিক্ষক পরিবর্তন করুন', 'Switch Active Teacher Profile', lang)}</label>
              <select
                value={teacher.id}
                onChange={(e) => onSwitchTeacher(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              >
                {allTeachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.nameBn} ({t.teacherCode})</option>
                ))}
              </select>
            </div>
            {approvedSchoolAssignments.length > 0 && onSwitchSchool && (
              <div>
                <label className="block font-semibold mb-1">{b('🏫 কর্মরত বিদ্যালয় পরিবর্তন (Switch School)', 'Switch Active School', lang)}</label>
                <select
                  value={scopedSchoolId}
                  onChange={(e) => onSwitchSchool(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                >
                  {approvedSchoolAssignments.map((a) => (
                    <option key={a.id} value={a.schoolId}>{a.schoolNameBn} ({a.schoolId})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Part B Professional Info Form */}
        {onUpdatePartB && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onUpdatePartB(teacher.id, {
                qualification: partBDegree,
                academicDegree: partBDegree,
                subjectMajor: partBMajor,
                training: partBTraining,
                experienceYears: Number(partBExp) || 0,
                previousInstitution: partBPrevInst,
                employmentStatus: partBStatus,
                teacherType: partBType,
              });
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('অংশ-খ: শিক্ষাগত যোগ্যতা ও পেশাগত তথ্য (Part B Professional Info)', 'Part B: Academic & Professional Information', lang)}
              </h2>
              <span className={`font-semibold ${teacher.partBCompleted ? 'text-emerald-700' : 'text-amber-600'}`}>
                {teacher.partBCompleted ? b('সম্পন্ন', 'Completed', lang) : b('আপডেট প্রয়োজন', 'Incomplete', lang)}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1">{b('সর্বোচ্চ ডিগ্রি', 'Academic Degree', lang)}</label>
                <input
                  type="text"
                  value={partBDegree}
                  onChange={(e) => setPartBDegree(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('মূল বিষয় (Subject Major)', 'Subject Major', lang)}</label>
                <input
                  type="text"
                  value={partBMajor}
                  onChange={(e) => setPartBMajor(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('প্রশিক্ষণ (B.Ed / C-in-Ed)', 'Professional Training', lang)}</label>
                <input
                  type="text"
                  value={partBTraining}
                  onChange={(e) => setPartBTraining(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('অভিজ্ঞতা (বছর)', 'Experience (Years)', lang)}</label>
                <input
                  type="number"
                  min={0}
                  value={partBExp}
                  onChange={(e) => setPartBExp(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('পূর্বের প্রতিষ্ঠান', 'Previous Institution', lang)}</label>
                <input
                  type="text"
                  value={partBPrevInst}
                  onChange={(e) => setPartBPrevInst(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('শিক্ষকের ধরন', 'Teacher Type', lang)}</label>
                <select
                  value={partBType}
                  onChange={(e) => setPartBType(e.target.value as NonNullable<TeacherRecord['teacherType']>)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="Permanent">Permanent</option>
                  <option value="Contract">Contract</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Guest">Guest</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer">
                {b('অংশ-খ তথ্য সংরক্ষণ করুন', 'Save Part B Professional Info', lang)}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  const teacherNotifications = notifications.filter(
    (n) =>
      (n.roleTarget === 'teacher' || n.roleTarget === 'all') &&
      (!n.teacherId || n.teacherId === teacher.id)
  );

  // Default Tab: Teacher Daily Work + Live Class Session Management
  return (
    <div className="space-y-6">
      {scopedSchoolId === 'UNASSIGNED' && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-bold text-amber-900 dark:text-amber-200">
              {b('কোনো বিদ্যালয়ে এখনো যুক্ত নন (Unassigned Pool)', 'Not Joined to Any Active School Yet', lang)}
            </div>
            <p className="text-amber-800 dark:text-amber-300 mt-0.5">
              {b(
                `আপনার স্থায়ী Teacher ID: ${teacher.teacherCode}। শ্রেণি ও শিক্ষার্থী দেখার জন্য অনুগ্রহ করে বিদ্যালয়ে যোগদানের আবেদন করুন।`,
                `Global Teacher ID: ${teacher.teacherCode}. Apply to join an active school to unlock class & student workspaces.`,
                lang
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('join_schools')}
            className="px-3.5 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold cursor-pointer"
          >
            {b('বিদ্যালয়ে যোগদান করুন →', 'Join a School →', lang)}
          </button>
        </div>
      )}

      {activeSchool && (
        <SchoolCoverBanner
          school={activeSchool}
          lang={lang}
          canEditCover={false}
          subtitleBn={`শিক্ষক পোর্টাল · ${teacher.nameBn} (${teacher.teacherCode})`}
          subtitleEn={`Teacher Portal · ${teacher.nameEn} (${teacher.teacherCode})`}
        />
      )}

      {/* Emerald-Teal Teacher Welcome Hero Banner (matches Teacher Portal reference) */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="font-mono text-xs font-semibold text-emerald-100">
            {teacher.teacherCode} · {scopedSchoolNameBn} · {workload.weeklyPeriods} periods/wk
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {teacher.nameBn} — {b('শিক্ষক ও দৈনিক পাঠ ড্যাশবোর্ড', 'Teacher Daily Work & Class Portal', lang)}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90">
            {activeAssignment?.designation ?? teacher.designation} · {b('নির্ধারিত বিষয়:', 'Subjects:', lang)}{' '}
            {(activeAssignment?.assignedSubjects.length ? activeAssignment.assignedSubjects : teacher.subjects).join(', ') || '-'} ·{' '}
            {b('শ্রেণি:', 'Classes:', lang)}{' '}
            {(activeAssignment?.assignedClasses.length ? activeAssignment.assignedClasses : teacher.assignedClasses).join(', ') || '-'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {approvedSchoolAssignments.length > 0 && onSwitchSchool && (
            <select
              aria-label={b('🏫 Switch School', 'Switch School', lang)}
              value={scopedSchoolId}
              onChange={(e) => onSwitchSchool(e.target.value)}
              className="h-9 px-2.5 rounded-xl border border-white/25 bg-white/15 text-white text-xs font-semibold cursor-pointer outline-none"
            >
              {approvedSchoolAssignments.map((a) => (
                <option key={a.id} value={a.schoolId} className="text-slate-900">
                  🏫 {a.schoolNameBn} ({a.schoolId})
                </option>
              ))}
            </select>
          )}
          <select
            aria-label={b('শিক্ষক পরিবর্তন (টেস্ট)', 'Switch Teacher', lang)}
            value={teacher.id}
            onChange={(e) => onSwitchTeacher(e.target.value)}
            className="h-9 px-2.5 rounded-xl border border-white/25 bg-white/15 text-white text-xs font-semibold cursor-pointer outline-none"
          >
            {allTeachers.map((t) => (
              <option key={t.id} value={t.id} className="text-slate-900">
                {t.nameBn} ({t.teacherCode})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onSelectTab('attendance')}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 cursor-pointer whitespace-nowrap shadow-xs"
          >
            {b('Auto ID হাজিরা', 'Auto ID Attendance', lang)}
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('teaching')}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600/80 hover:bg-emerald-600 border border-white/25 text-white cursor-pointer whitespace-nowrap"
          >
            {b('আজকের পড়া', "Today's Lessons", lang)}
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('marks')}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white cursor-pointer whitespace-nowrap"
          >
            {b('নম্বর প্রদান', 'Marks Entry', lang)}
          </button>
        </div>
      </div>

      {/* 5-Tile Quick Actions Grid (দ্রুত কার্যতালিকা) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          {b('দ্রুত কার্যতালিকা (Quick Actions)', 'Quick Actions', lang)}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {[
            { tab: 'attendance', titleBn: 'হাজিরা খাতা', titleEn: 'Attendance', subBn: 'দৈনিক উপস্থিতি লিপিবদ্ধ', subEn: 'Auto ID & manual scan', icon: QrCode, badge: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' },
            { tab: 'marks', titleBn: 'বিষয় ও গ্রেডিং', titleEn: 'Subjects & Marks', subBn: 'নির্ধারিত শ্রেণি ও নম্বর', subEn: 'RBAC subject grading', icon: BookOpen, badge: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400' },
            { tab: 'assessment', titleBn: 'পরীক্ষা ও ফলাফল', titleEn: 'Exams & Results', subBn: 'টার্মভিত্তিক নম্বর ও গ্রেডশিট', subEn: 'Term marks & grades', icon: Award, badge: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400' },
            { tab: 'my_routine', titleBn: 'ক্লাস রুটিন', titleEn: 'Class Routine', subBn: 'পিরিয়ড ও শিক্ষক রুটিন', subEn: 'Weekly & daily slots', icon: CalendarDays, badge: 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400' },
            { tab: 'my_classes', titleBn: 'My Classes ও স্বত্ব', titleEn: 'My Classes', subBn: 'শ্রেণি মালিকানা ও অনুমতি', subEn: 'Class ownership & sub', icon: Lock, badge: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400' },
          ].map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.tab}
                type="button"
                onClick={() => onSelectTab(act.tab)}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500 hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors text-center cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${act.badge}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="font-bold text-slate-900 dark:text-white">{b(act.titleBn, act.titleEn, lang)}</div>
                <div className="text-[11px] text-slate-500">{b(act.subBn, act.subEn, lang)}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. School Attendance (Check-In / Check-Out) + Today -> Next -> Completed -> Remaining */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-700" />
              {b('1️⃣ স্কুল উপস্থিতি (Check-In / Check-Out)', '1. School Attendance', lang)}
            </h2>
            <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">
              {myAttendance?.status === 'present'
                ? `Present · ${myAttendance.checkInTime}`
                : myAttendance?.status === 'late'
                  ? `Late · ${myAttendance.checkInTime}`
                  : myAttendance?.status === 'leave'
                    ? 'On Leave'
                    : 'Not Checked In'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onTeacherCheckInOut(teacher.id, 'present')}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold cursor-pointer"
            >
              🟢 Check In (Present)
            </button>
            <button
              type="button"
              onClick={() => onTeacherCheckInOut(teacher.id, 'late')}
              className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-800 dark:text-amber-300 font-semibold cursor-pointer"
            >
              Late Check-In
            </button>
            <button
              type="button"
              onClick={() => onTeacherCheckInOut(teacher.id, 'leave')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
            >
              Leave
            </button>
            {myAttendance?.checkInTime && !myAttendance?.checkOutTime && (
              <button
                type="button"
                onClick={() => onTeacherCheckInOut(teacher.id, 'checkout')}
                className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-700 text-white font-semibold cursor-pointer"
              >
                Check Out
              </button>
            )}
          </div>
          {myAttendance?.checkOutTime && (
            <div className="text-slate-500">Checked Out at: <span className="font-mono font-semibold">{myAttendance.checkOutTime}</span></div>
          )}
        </div>

        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-700" />
            {b("Today's Classes → Next Class → Completed → Remaining", "Today's Class Timeline", lang)}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <div className="text-slate-500">Today's Classes</div>
              <div className="text-lg font-bold tabular-nums mt-0.5">{myTodaySlots.length}</div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <div className="text-emerald-700 dark:text-emerald-400">Live / Next</div>
              <div className="font-bold mt-0.5 truncate">
                {liveSlot ? `🟢 ${liveSlot.subjectBn}` : nextSlot ? nextSlot.subjectBn : b('শেষ', 'Done', lang)}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <div className="text-blue-700 dark:text-blue-400">Completed</div>
              <div className="text-lg font-bold tabular-nums mt-0.5">{completedCount}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <div className="text-slate-500">Remaining</div>
              <div className="text-lg font-bold tabular-nums mt-0.5">{remainingCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Tasks Checklist + Teacher Performance Score Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ClipboardCheck className="w-4 h-4 text-blue-700" />
              {b("📋 আজকের করণীয় তালিকা (Today's Daily Tasks)", "Today's Daily Tasks Checklist", lang)}
            </h2>
            <span className="font-mono font-bold text-blue-700 dark:text-blue-400 tabular-nums">
              {dailyTasksReport.completedCount}/{dailyTasksReport.totalCount} ({dailyTasksReport.pct}%)
            </span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-700 transition-all" style={{ width: `${dailyTasksReport.pct}%` }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {dailyTasksReport.tasks.map((tk) => (
              <div
                key={tk.id}
                className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                  tk.status === 'completed'
                    ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{b(tk.titleBn, tk.titleEn, lang)}</span>
                <span
                  className={`text-[11px] font-bold shrink-0 ${
                    tk.status === 'completed'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : tk.status === 'in_progress'
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-amber-600'
                  }`}
                >
                  {tk.status === 'completed' ? '✓ Done' : tk.status === 'in_progress' ? 'Live' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-700" />
              {b('📈 Teacher Performance Score', 'Teacher Performance Score', lang)}
            </h2>
            <span className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {perfMetrics.overallScorePct}%
            </span>
          </div>
          <div className="space-y-2">
            {[
              { label: b('উপস্থিতি (Attendance)', 'Attendance', lang), val: perfMetrics.attendancePct },
              { label: b('সময়মতো ক্লাস শুরু', 'On-time Class Start', lang), val: perfMetrics.onTimeStartPct },
              { label: b('ক্লাস ও হোমওয়ার্ক সম্পন্ন', 'Class & HW Completion', lang), val: Math.round((perfMetrics.classCompletionPct + perfMetrics.homeworkSubmissionPct) / 2) },
              { label: b('এডমিন মূল্যায়ন', 'Admin Evaluation', lang), val: perfMetrics.adminEvaluationPct },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                  <span className="font-bold tabular-nums">{item.val}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600" style={{ width: `${item.val}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="pt-1 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => onSelectTab('teaching')} className="text-blue-700 dark:text-blue-400 font-semibold hover:underline cursor-pointer">
              {b('📚 আজকের পড়া প্রকাশ →', "Publish Today's Lesson →", lang)}
            </button>
            <button type="button" onClick={() => onSelectTab('my_classes')} className="text-slate-600 dark:text-slate-300 font-semibold hover:underline cursor-pointer">
              {b('🔒 My Classes →', 'My Classes →', lang)}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Daily Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-slate-500">{b('আজকের ক্লাস', 'Classes Today', lang)}</div>
          <div className="text-xl font-bold tabular-nums mt-1">{myTodaySlots.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-slate-500">{b('ক্লাস সম্পন্ন', 'Completed', lang)}</div>
          <div className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">{completedCount}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-slate-500">{b('উপস্থিত শিক্ষার্থী (ID Scan)', 'Auto Present Students', lang)}</div>
          <div className="text-xl font-bold tabular-nums text-blue-700 dark:text-blue-400 mt-1">{autoPresentCount}/{students.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-slate-500">{b('প্রদত্ত আজকের পড়া', 'Daily Lessons Published', lang)}</div>
          <div className="text-xl font-bold tabular-nums mt-1">
            {dailyLessons.filter((d) => d.teacherId === teacher.id).length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-slate-500">{b('Classwork সম্পন্ন', 'Classwork Items', lang)}</div>
          <div className="text-xl font-bold tabular-nums mt-1">{classworks.length}</div>
        </div>
      </div>

      {/* 3. Today's Classes + Start Class -> Full Class Session Management */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-700" />
            {b('2️⃣ & 3️⃣ ক্লাস সেশন ম্যানেজমেন্ট (Upcoming 🔴 → Live 🟢 → Completed 🔵)', "Today's Classes & Live Session Management", lang)}
          </h2>
          <button
            type="button"
            onClick={() => onSelectTab('classwork')}
            className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
          >
            {b('Classwork ম্যানেজার →', 'Open Classwork →', lang)}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {routineSlots.map((slot, index) => {
            const isAssignedToMe = (slot.substituteTeacherId ?? slot.teacherId) === teacher.id;
            const prevCompleted = index === 0 || routineSlots[index - 1].status === 'completed';

            return (
              <div key={slot.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-mono text-blue-700 dark:text-blue-400 font-semibold">
                      Period {slot.period} · {slot.timeRange} · Room {slot.room}
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {b(slot.subjectBn, slot.subjectEn, lang)} — {slot.className} ({slot.section})
                    </div>
                    <div className="text-slate-500">
                      {slot.substituteTeacher ?? slot.teacherName}{' '}
                      {isAssignedToMe ? b('(আপনার নির্ধারিত ক্লাস)', '(Your Assigned Class)', lang) : ''}
                    </div>
                  </div>
                  <span
                    className={`font-bold ${
                      slot.status === 'completed'
                        ? 'text-blue-700 dark:text-blue-400'
                        : slot.status === 'in_progress'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {slot.status === 'completed'
                      ? b('🔵 Completed', '🔵 Completed', lang)
                      : slot.status === 'in_progress'
                        ? b('🟢 Live / Ongoing', '🟢 Live / Ongoing', lang)
                        : slot.status === 'sub_requested'
                          ? b('বিকল্প অনুরোধকৃত', 'Sub Requested', lang)
                          : b('🔴 Upcoming', '🔴 Upcoming', lang)}
                  </span>
                </div>

                {/* Live Class Session Management Panel */}
                {slot.status === 'in_progress' && (
                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 rounded-lg p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <QrCode className="w-4 h-4" />
                        {b(
                          `অটো ID কার্ড উপস্থিতি (Kiosk Synced): ${autoPresentCount}/${students.length} জন উপস্থিত`,
                          `Auto ID Card Attendance: ${autoPresentCount}/${students.length} Present`,
                          lang
                        )}
                      </span>
                      <span className="font-mono text-slate-500">
                        Started: {slot.startedAt ?? slot.session?.startedAt ?? '09:32 AM'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold mb-1">{b('Lesson নির্বাচন / টপিক', 'Select Lesson / Topic', lang)}</label>
                        <select
                          value={slot.session?.lessonTopic ?? slot.lessonTopic ?? ''}
                          onChange={(e) => onUpdateSessionDetails(slot.id, { lessonTopic: e.target.value })}
                          className="w-full h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 mb-1.5"
                        >
                          <option value={slot.lessonTopic ?? 'ভগ্নাংশের যোগ ও বিয়োগ'}>{slot.lessonTopic ?? 'ভগ্নাংশের যোগ ও বিয়োগ'}</option>
                          {lessonPlans.map((lp) => (
                            <option key={lp.id} value={lp.lessonTopic}>{lp.chapterTitle}: {lp.lessonTopic}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={slot.session?.learningObjective ?? ''}
                          onChange={(e) => onUpdateSessionDetails(slot.id, { learningObjective: e.target.value })}
                          placeholder={b('Learning Objective...', 'Learning Objective...', lang)}
                          className="w-full h-8 px-2.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-semibold">{b('Classwork ও Teaching Activity', 'Classwork & Teaching Activity', lang)}</label>
                        <input
                          type="text"
                          value={slot.session?.classworkSummary ?? ''}
                          onChange={(e) => onUpdateSessionDetails(slot.id, { classworkSummary: e.target.value })}
                          placeholder={b('শ্রেণির কাজ (Classwork)...', 'In-class work...', lang)}
                          className="w-full h-8 px-2.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                        <input
                          type="text"
                          value={slot.session?.teachingActivity ?? ''}
                          onChange={(e) => onUpdateSessionDetails(slot.id, { teachingActivity: e.target.value })}
                          placeholder={b('Teaching Activity...', 'Teaching activity...', lang)}
                          className="w-full h-8 px-2.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        value={slot.session?.teacherPrivateNotes ?? ''}
                        onChange={(e) => onUpdateSessionDetails(slot.id, { teacherPrivateNotes: e.target.value })}
                        placeholder={b('শিক্ষকের ব্যক্তিগত নোট (অভিভাবক দেখবে না)...', 'Teacher notes (private)...', lang)}
                        className="w-full h-8 px-2.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                      <input
                        type="text"
                        value={slot.homeworkText ?? slot.session?.homeworkSummary ?? ''}
                        onChange={(e) => onUpdateSessionDetails(slot.id, { homeworkSummary: e.target.value })}
                        placeholder={b('বাড়ির কাজ (Homework) লিখুন...', 'Assign homework...', lang)}
                        className="w-full h-8 px-2.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onCompleteClass(
                          slot.id,
                          slot.session?.lessonTopic ?? slot.lessonTopic ?? 'অধ্যায় সম্পন্ন',
                          slot.homeworkText ?? slot.session?.homeworkSummary ?? 'অনুশীলনী সমাধান করবে।'
                        )
                      }
                      className="px-3.5 py-2 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                      {b('End Class & পরবর্তী পিরিয়ড আনলক করুন', 'End Class & Unlock Next', lang)}
                    </button>
                  </div>
                )}

                {slot.status === 'cancelled' && slot.cancelledReason && (
                  <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-semibold">
                    ⚫ {b('ক্লাস বাতিল:', 'Cancelled:', lang)} {slot.cancelledReason}
                    {slot.cancelledRemarks ? ` — ${slot.cancelledRemarks}` : ''}
                  </div>
                )}

                {slot.status === 'pending' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={!isAssignedToMe}
                      onClick={() => setConfirmStartSlot(slot)}
                      className={`px-3.5 py-1.5 font-semibold rounded-lg ${
                        isAssignedToMe
                          ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 inline mr-1" />
                      {isAssignedToMe
                        ? b('🟢 Start Class (সেশন শুরু)', 'Start Class', lang)
                        : b('অন্য শিক্ষকের ক্লাস', 'Other Teacher Assigned', lang)}
                    </button>
                    {!prevCompleted && isAssignedToMe && (
                      <span className="text-[11px] text-slate-500">
                        {b('(পূর্ববর্তী পিরিয়ড সম্পন্ন বা প্রস্তুত)', '(Ready to start)', lang)}
                      </span>
                    )}
                    {isAssignedToMe && (
                      <>
                        <button
                          type="button"
                          onClick={() => setSubSlotId(subSlotId === slot.id ? null : slot.id)}
                          className="px-3 py-1.5 font-semibold rounded-lg border border-amber-300 text-amber-800 dark:text-amber-300 cursor-pointer"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                          Request Substitute
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancelModalSlot(slot)}
                          className="px-3 py-1.5 font-semibold rounded-lg border border-red-300 text-red-700 dark:text-red-400 cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5 inline mr-1" />
                          {b('Cancel Class', 'Cancel Class', lang)}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {subSlotId === slot.id && (
                  <div className="flex items-center gap-2 pt-1">
                    <select
                      value={subReason}
                      onChange={(e) => setSubReason(e.target.value)}
                      className="h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    >
                      <option value="Teacher Absent">Teacher Absent</option>
                      <option value="Emergency">Emergency</option>
                      <option value="Administrative Reason">Official Duty</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        onRequestSubstitute(slot.id, subReason);
                        setSubSlotId(null);
                      }}
                      className="px-3 py-1.5 rounded bg-amber-600 text-white font-semibold cursor-pointer"
                    >
                      {b('অনুরোধ পাঠান', 'Submit', lang)}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Role-Scoped Notification Preview & Approval History */}
      <DashboardNotificationPreview
        lang={lang}
        role="teacher"
        schoolId={teacher.schoolId}
        teacherId={teacher.id}
        notifications={notifications}
        preferences={notificationPreferences}
        lastLoginIso={lastLoginIso}
        onOpenNotificationCenter={() => onSelectTab('notifications')}
        onNavigateFromNotification={
          onNavigateFromNotification ?? ((item) => onSelectTab(item.targetTab ?? 'dashboard'))
        }
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <History className="w-4 h-4 text-blue-700" />
          {b('অনুমোদন ইতিহাস', 'My Approval History', lang)}
        </h2>
        {(teacher.approvalHistory ?? []).slice(0, 3).map((h) => (
          <div key={h.id} className="py-1.5 border-b last:border-b-0 border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">{b(h.actionTitleBn, h.actionTitleEn, lang)}</div>
              <div className="text-slate-500">{sanitizeActorDisplayForRole(h.actor, 'teacher')} · {h.date}</div>
            </div>
            <span className="font-mono text-blue-700 dark:text-blue-400">{h.fromValue} → {h.toValue}</span>
          </div>
        ))}
      </div>

      {/* Confirm Start Class Modal */}
      {confirmStartSlot && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-md p-5 space-y-4 text-xs shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('ক্লাস শুরু করার নিশ্চিতকরণ', 'Confirm Start Class', lang)}
              </h3>
              <button type="button" onClick={() => setConfirmStartSlot(null)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">
              {b(
                `আপনি কি ${confirmStartSlot.className} শ্রেণির ${confirmStartSlot.subjectBn} ক্লাস শুরু করতে চান?`,
                `Do you want to start ${confirmStartSlot.className} · ${confirmStartSlot.subjectEn} class now?`,
                lang
              )}
            </p>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 space-y-1 text-slate-600 dark:text-slate-300">
              <div>Period {confirmStartSlot.period} · {confirmStartSlot.timeRange}</div>
              <div>Room {confirmStartSlot.room} · {confirmStartSlot.section}</div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmStartSlot(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
              >
                {b('Cancel', 'Cancel', lang)}
              </button>
              <button
                type="button"
                onClick={() => {
                  onStartClassSession(
                    confirmStartSlot.id,
                    lessonPlans.find((lp) => lp.subjectEn === confirmStartSlot.subjectEn)?.lessonTopic ??
                      `${confirmStartSlot.subjectBn} পাঠ`
                  );
                  setConfirmStartSlot(null);
                }}
                className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-semibold cursor-pointer"
              >
                {b('Confirm Class', 'Confirm Class', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Class with Reason Modal */}
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
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70">
              <strong>{cancelModalSlot.className}</strong> · {b(cancelModalSlot.subjectBn, cancelModalSlot.subjectEn, lang)} ({cancelModalSlot.timeRange})
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('কারণ নির্বাচন করুন (বাধ্যতামূলক)', 'Reason (Mandatory)', lang)}</label>
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
              <label className="block font-semibold mb-1">{b('Remarks (ঐচ্ছিক)', 'Remarks (Optional)', lang)}</label>
              <textarea
                rows={2}
                value={cancelRemarks}
                onChange={(e) => setCancelRemarks(e.target.value)}
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
                  onCancelClassSlot?.(cancelModalSlot.id, cancelReason, cancelRemarks);
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
    </div>
  );
};
