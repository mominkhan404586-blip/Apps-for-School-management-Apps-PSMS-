import React, { useMemo, useState } from 'react';
import {
  Award,
  Bell,
  BookOpen,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  Home,
  MessageSquare,
  Printer,
  Send,
  UserCog,
  UserPlus,
} from 'lucide-react';
import type {
  AssignmentItem,
  ClassworkItem,
  CurriculumUnit,
  DailyLessonHomeworkItem,
  ExamRecord,
  ExamRoutineRecord,
  FeeRecord,
  GradingRuleItem,
  HolidayPlanRecord,
  Language,
  LeaveRequestItem,
  MasterRoutineRecord,
  NoticeItem,
  NotificationItem,
  NotificationPreferences,
  OfficialDocumentRecord,
  OfficialDocumentTemplate,
  RoutineSlot,
  SchoolDailyOperationsState,
  SchoolRecord,
  StudentAttendanceHistoryEntry,
  StudentRecord,
  StudyMaterialItem,
  TeacherMessageItem,
  TeacherRecord,
} from '../types';
import { calculateBDGradeAndGPA } from '../utils/rbacAndGrading';
import { DEFAULT_NCTB_GRADING_RULES } from '../utils/academicEngine';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../utils/notificationAndNoticeEngine';
import { pickPrimaryTermOrPublishedExam } from '../utils/examGovernanceEngine';
import { resolveSchoolLiveTeachingStatus } from '../utils/schoolOperationsAndScheduleEngine';
import { b } from '../i18n/translations';
import { AttendanceDonutChart, ProgressMeter, TrendLineChart } from './Charts';
import { AchievementTrophyIllustration, StudentBooksIllustration } from './PortalIllustrations';
import { ParentLiveClassAndDailyStudyWidget } from './LiveClassRoleWidgets';
import {
  AcademicCertificatesDocsPanel,
  StudentAcademicProgressPanel,
} from './AcademicProgressAndDocsPanel';
import { TodaysLessonsPanel } from './TodaysLessonsPanel';
import { StudentMarksheetModal } from './ResultGovernancePanels';
import {
  DashboardNotificationPreview,
  NotificationCenterPanel,
} from './NotificationCenterView';
import { NoticeCommunicationCenter } from './NoticeCommunicationCenter';
import { ExaminationManagementPanel } from './ExaminationManagementPanel';
import { RoutineManagementSystem } from './RoutineManagementSystem';
import { ExamRoutineSystem } from './ExamRoutineSystem';
import { OfficialDocumentSystem } from './OfficialDocumentSystem';
import { SchoolCoverBanner } from './SchoolCoverBanner';
import { StudentQrIdCardPanel } from './StudentQrIdCardPanel';
import { useSyncEffect } from '../hooks/useSyncEffect';

interface GuardianViewsProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  lang: Language;
  child?: StudentRecord;
  allChildren: StudentRecord[];
  onSelectChild: (childId: string) => void;
  guardianName?: string;
  guardianUsername?: string;
  guardianUniqueId?: string;
  assignments: AssignmentItem[];
  onToggleAssignmentSubmit: (assignmentId: string) => void;
  routineSlots: RoutineSlot[];
  masterRoutines?: MasterRoutineRecord[];
  exams: ExamRecord[];
  fees: FeeRecord[];
  notices: NoticeItem[];
  notifications?: NotificationItem[];
  notificationPreferences?: NotificationPreferences;
  lastLoginIso?: string;
  attendanceHistory?: StudentAttendanceHistoryEntry[];
  onUpdateNotificationPreferences?: (next: NotificationPreferences) => void;
  onMarkNotificationRead?: (id: string, read: boolean) => void;
  onMarkAllNotificationsRead?: () => void;
  onTogglePinNotification?: (id: string) => void;
  onNavigateFromNotification?: (item: NotificationItem) => void;
  onResetLastVisitIso?: (iso: string) => void;
  onMarkNoticeRead?: (noticeId: string, userId: string) => void;
  leaveRequests: LeaveRequestItem[];
  onSubmitLeaveRequest: (req: Omit<LeaveRequestItem, 'id' | 'status'>) => void;
  messages: TeacherMessageItem[];
  onSendMessage: (text: string) => void;
  onLinkChildByCode: (schoolCode: string, studentIdOrGlc: string) => string | null;
  school?: SchoolRecord;
  schoolDailyOps?: SchoolDailyOperationsState[];
  holidayPlans?: HolidayPlanRecord[];
  classworks?: ClassworkItem[];
  curriculumUnits?: CurriculumUnit[];
  studyMaterials?: StudyMaterialItem[];
  gradingRules?: GradingRuleItem[];
  dailyLessons?: DailyLessonHomeworkItem[];
  examRoutines?: ExamRoutineRecord[];
  officialDocuments?: OfficialDocumentRecord[];
  documentTemplates?: OfficialDocumentTemplate[];
  teachers?: TeacherRecord[];
  guardianPhotoUrl?: string;
  onOpenPhotoEditor?: () => void;
  onOpenUserProfileManager?: () => void;
  rtdbSyncTick?: number;
  settingsCenterElement?: React.ReactNode;
}

export const GuardianViews: React.FC<GuardianViewsProps> = ({
  activeTab,
  onSelectTab,
  lang,
  child,
  allChildren,
  onSelectChild,
  guardianName,
  guardianUsername,
  guardianUniqueId,
  assignments,
  onToggleAssignmentSubmit,
  routineSlots,
  masterRoutines = [],
  exams,
  fees,
  notices,
  notifications = [],
  notificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES,
  lastLoginIso = '',
  attendanceHistory = [],
  onUpdateNotificationPreferences,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onTogglePinNotification,
  onNavigateFromNotification,
  onResetLastVisitIso,
  onMarkNoticeRead,
  leaveRequests,
  onSubmitLeaveRequest,
  messages,
  onSendMessage,
  onLinkChildByCode,
  school,
  schoolDailyOps = [],
  holidayPlans = [],
  classworks = [],
  curriculumUnits = [],
  studyMaterials = [],
  gradingRules = DEFAULT_NCTB_GRADING_RULES,
  dailyLessons = [],
  examRoutines = [],
  officialDocuments = [],
  documentTemplates = [],
  teachers = [],
  guardianPhotoUrl,
  onOpenPhotoEditor,
  onOpenUserProfileManager,
  rtdbSyncTick = 0,
  settingsCenterElement,
}) => {
  const [leaveReason, setLeaveReason] = useState('অসুস্থতা');
  const [leaveDates, setLeaveDates] = useState(() => new Date().toISOString().slice(0, 10));
  const [leaveNote, setLeaveNote] = useState('');
  const [msgInput, setMsgInput] = useState('');
  const [linkSchoolCode, setLinkSchoolCode] = useState(child?.schoolId ?? '');
  const [linkStudentCode, setLinkStudentCode] = useState('');
  const [linkFeedback, setLinkFeedback] = useState('');
  const [marksheetOpen, setMarksheetOpen] = useState(false);
  const [, setRtdbRefreshNonce] = useState(0);

  const parentDisplayName = guardianName?.trim() || b('অভিভাবক', 'Parent', lang);

  useSyncEffect({
    syncTick: rtdbSyncTick,
    rtdbPath: child?.schoolId && child?.id ? `schools/${child.schoolId}/students/${child.id}` : undefined,
    onSync: () => {
      if (child?.schoolId) {
        setLinkSchoolCode(child.schoolId);
      }
      setRtdbRefreshNonce((v) => v + 1);
    },
  });

  const childAssignments = useMemo(
    () => (child ? assignments.filter((a) => a.studentId === child.id) : []),
    [assignments, child]
  );
  const pendingCount = childAssignments.filter((a) => a.status === 'pending').length;
  const publishedExam = pickPrimaryTermOrPublishedExam(exams);
  const childExamMarks = useMemo(
    () => (publishedExam && child ? publishedExam.entries.filter((e) => e.studentId === child.id) : []),
    [publishedExam, child]
  );
  const childFees = useMemo(
    () => (child ? fees.filter((f) => f.studentId === child.id) : []),
    [fees, child]
  );
  const childMessages = useMemo(
    () => (child ? messages.filter((m) => m.studentId === child.id) : []),
    [messages, child]
  );
  const childLeaves = useMemo(
    () => (child ? leaveRequests.filter((l) => l.studentId === child.id) : []),
    [leaveRequests, child]
  );
  const childAttendanceHistory = useMemo(
    () => (child ? attendanceHistory.filter((h) => h.studentId === child.id) : []),
    [attendanceHistory, child]
  );

  const classTeacher = useMemo(() => {
    if (!child) return undefined;
    return (
      teachers.find(
        (t) =>
          t.schoolId === child.schoolId &&
          (t.assignedClasses.includes(child.className) || t.subjects.length > 0)
      ) ?? teachers.find((t) => t.schoolId === child.schoolId)
    );
  }, [teachers, child]);

  const liveSchoolStatus = useMemo(() => {
    if (!child) return null;
    return resolveSchoolLiveTeachingStatus({
      schoolId: child.schoolId,
      nowIso: new Date().toISOString(),
      dailyOps: schoolDailyOps,
      holidays: holidayPlans,
      examRoutines,
    });
  }, [child, schoolDailyOps, holidayPlans, examRoutines]);

  const upcomingExamSchedule = useMemo(() => {
    if (!child) return null;
    const matchingRoutine = examRoutines.find(
      (r) => r.schoolId === child.schoolId && r.className === child.className && r.slots.length > 0
    );
    if (matchingRoutine) {
      return {
        dateLabel: matchingRoutine.slots[0].examDate,
        title: b(matchingRoutine.examTitleBn, matchingRoutine.examTitleEn || matchingRoutine.examTitleBn, lang),
      };
    }
    if (publishedExam) {
      return {
        dateLabel: publishedExam.date || '—',
        title: b(publishedExam.titleBn, publishedExam.titleEn, lang),
      };
    }
    return null;
  }, [child, examRoutines, publishedExam, lang]);

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkSchoolCode.trim() || !linkStudentCode.trim()) return;
    const msg = onLinkChildByCode(linkSchoolCode.trim(), linkStudentCode.trim());
    setLinkFeedback(msg ?? b('নতুন সন্তান সফলভাবে যুক্ত হয়েছে!', 'Child linked successfully!', lang));
    setLinkStudentCode('');
  };

  if (activeTab === 'settings' && settingsCenterElement) {
    return <>{settingsCenterElement}</>;
  }

  if (activeTab === 'notifications') {
    return (
      <NotificationCenterPanel
        lang={lang}
        role="guardian"
        schoolId={child?.schoolId ?? ''}
        studentId={child?.id ?? ''}
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

  // Empty State: Parent registered / signed in with 0 linked children yet
  if (!child) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 rounded-2xl p-6 text-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight text-white">
              {b(`স্বাগতম, ${parentDisplayName}!`, `Welcome, ${parentDisplayName}!`, lang)}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100">
              {b(
                'আপনার Parent অ্যাকাউন্ট প্রস্তুত। আপনার সন্তানের বিদ্যালয় কোড ও ইউনিক Student ID যুক্ত করে সব তথ্য সরাসরি দেখুন।',
                'Your Parent account is ready. Link your child using School ID/Code and Unique Student ID below.',
                lang
              )}
            </p>
            {(guardianUniqueId || guardianUsername) && (
              <p className="text-[11px] font-mono text-sky-100">
                {guardianUniqueId ? `ID: ${guardianUniqueId}` : ''}
                {guardianUniqueId && guardianUsername ? ' · ' : ''}
                {guardianUsername ? `@${guardianUsername}` : ''}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onOpenUserProfileManager && (
              <button
                type="button"
                onClick={onOpenUserProfileManager}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-semibold cursor-pointer"
              >
                <UserCog className="w-4 h-4" />
                {b('প্রোফাইল ও ইউনিক আইডি', 'Account Profile', lang)}
              </button>
            )}
            {onOpenPhotoEditor && (
              <button
                type="button"
                onClick={onOpenPhotoEditor}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-blue-800 text-xs font-bold cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                {b('প্রোফাইল ছবি', 'Profile Photo', lang)}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {b('সন্তান যুক্ত করুন (School ID + Student ID)', 'Link Your Child (School ID + Student ID)', lang)}
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              {b(
                'ভর্তির সময় বিদ্যালয় থেকে প্রদত্ত School Code/ID এবং শিক্ষার্থীর Unique Student ID বা লিংক কোড লিখুন। একাধিক সন্তান থাকলেও প্রতিটি সন্তানকে আলাদাভাবে যুক্ত করা যাবে।',
                'Enter the School ID/Code and the student’s Unique Student ID or link code provided at admission. You can link multiple children.',
                lang
              )}
            </p>
            <form onSubmit={handleLinkSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">{b('বিদ্যালয়ের আইডি / কোড / ইউজারনেম *', 'School ID / Code / Username *', lang)}</label>
                <input
                  type="text"
                  required
                  value={linkSchoolCode}
                  onChange={(e) => setLinkSchoolCode(e.target.value)}
                  placeholder={b('বিদ্যালয়ের প্রদত্ত আইডি বা কোড লিখুন', 'Enter School ID or Code', lang)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('শিক্ষার্থীর ইউনিক আইডি / লিংক কোড *', 'Unique Student ID / Link Code *', lang)}</label>
                <input
                  type="text"
                  required
                  value={linkStudentCode}
                  onChange={(e) => setLinkStudentCode(e.target.value)}
                  placeholder={b('ভর্তির সময় প্রদত্ত Student ID লিখুন', 'Enter Unique Student ID', lang)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                />
              </div>
              {linkFeedback && (
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-lg">
                  {linkFeedback}
                </p>
              )}
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
              >
                {b('সন্তান যুক্ত করুন', 'Link Child Account', lang)}
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3 text-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {b('অভিভাবক পোর্টাল নির্দেশনা', 'Parent Portal Guide', lang)}
            </h2>
            <ul className="space-y-2 text-slate-600 dark:text-slate-300 list-disc pl-4">
              <li>{b('শিক্ষার্থীর আলাদা কোনো লগইন নেই — আপনার Parent অ্যাকাউন্ট থেকেই সন্তানের সব একাডেমিক ও হাজিরা তথ্য দেখতে পারবেন।', 'Students do not have separate logins — track all academic and attendance data from your Parent account.', lang)}</li>
              <li>{b('বিদ্যালয়ে QR কার্ড প্রবেশ/প্রস্থান স্ক্যান হলেই রিয়েল-টাইমে উপস্থিতি ও ছুটি নোটিফিকেশন পাবেন।', 'Receive instant Entry/Exit attendance alerts when your child’s QR ID is scanned at school.', lang)}</li>
              <li>{b('একাধিক সন্তান একই অ্যাকাউন্টে যুক্ত করে দ্রুত পরিবর্তন করতে পারবেন।', 'Link multiple children to this single Parent account and switch anytime.', lang)}</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const attendanceSegments = (() => {
    const presentCount = childAttendanceHistory.filter((h) => h.status === 'present').length;
    const absentCount = childAttendanceHistory.filter((h) => h.status === 'absent').length;
    const lateCount = childAttendanceHistory.filter((h) => h.status === 'late').length;
    const leaveCount = childAttendanceHistory.filter((h) => h.status === 'leave').length;
    if (presentCount + absentCount + lateCount + leaveCount === 0) {
      return [];
    }
    return [
      { label: 'Present', value: presentCount, color: '#059669' },
      { label: 'Absent', value: absentCount, color: '#DC2626' },
      { label: 'Late', value: lateCount, color: '#D97706' },
      { label: 'Leave', value: leaveCount, color: '#2563EB' },
    ];
  })();

  // Dashboard View (Clean, Child-Focused)
  if (activeTab === 'dashboard') {
    const academicSummaryStatus =
      childExamMarks.length === 0
        ? b('তথ্য অপেক্ষমাণ', 'No Results Yet', lang)
        : child.gpa
          ? `GPA ${child.gpa}`
          : b('প্রকাশিত', 'Published', lang);

    return (
      <div className="space-y-6">
        {school && (
          <SchoolCoverBanner
            school={school}
            lang={lang}
            canEditCover={false}
            subtitleBn={`অভিভাবক (Parent) ড্যাশবোর্ড · সন্তান: ${child.nameBn} (${child.className})`}
            subtitleEn={`Parent Portal · Child: ${child.nameEn} (${child.className})`}
          />
        )}

        {/* Crisp Blue Welcome Hero Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 rounded-2xl p-5 sm:p-6 text-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight text-white">
              {b(`স্বাগতম, ${parentDisplayName}!`, `Welcome, ${parentDisplayName}!`, lang)}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100">
              {b(
                'আপনার সন্তানের পড়াশোনা, উপস্থিতি ও অগ্রগতি এক নজরে দেখুন।',
                'Track your child’s daily attendance, classwork, results, and teacher updates.',
                lang
              )}
            </p>
            {liveSchoolStatus && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/15 border border-white/25 text-[11px] font-semibold text-white">
                <Clock className="w-3.5 h-3.5" />
                <span>{b(liveSchoolStatus.labelBn, liveSchoolStatus.labelEn, lang)}</span>
              </div>
            )}
            {allChildren.length > 0 && (
              <div className="sm:hidden pt-2">
                <select
                  value={child.id}
                  onChange={(e) => onSelectChild(e.target.value)}
                  aria-label={b('সন্তান নির্বাচন', 'Select Child', lang)}
                  className="w-full h-9 px-3 text-xs font-semibold rounded-lg bg-white/95 text-blue-900 border border-white/40"
                >
                  {allChildren.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameBn} — {c.className}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <StudentBooksIllustration className="hidden xl:block w-44 h-22 shrink-0" />
            <div className="flex items-center gap-3.5 bg-white/15 backdrop-blur-xs border border-white/25 rounded-xl px-4 py-3 shrink-0">
              {child.photoUrl ? (
                <img
                  src={child.photoUrl}
                  alt={child.nameEn}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-white/50 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white text-blue-800 font-bold text-lg flex items-center justify-center shrink-0">
                  {child.nameBn.charAt(0)}
                </div>
              )}
              <div>
                <div className="text-sm font-bold text-white">{b(child.nameBn, child.nameEn, lang)}</div>
                <div className="text-xs text-blue-100 tabular-nums">
                  {child.className} · {b('রোল', 'Roll', lang)} {child.roll} · {child.section}
                </div>
                <div className="text-[11px] font-mono text-sky-100">
                  {child.schoolNameBn} · {child.permanentId}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Class Status + Daily Study Overview */}
        <ParentLiveClassAndDailyStudyWidget
          lang={lang}
          child={child}
          routineSlots={routineSlots}
          classworks={classworks}
          curriculumUnits={curriculumUnits}
        />

        {/* Role-Scoped Notification Preview */}
        <DashboardNotificationPreview
          lang={lang}
          role="guardian"
          schoolId={child.schoolId}
          studentId={child.id}
          notifications={notifications}
          preferences={notificationPreferences}
          lastLoginIso={lastLoginIso}
          onOpenNotificationCenter={() => onSelectTab('notifications')}
          onNavigateFromNotification={
            onNavigateFromNotification ?? ((item) => onSelectTab(item.targetTab ?? 'dashboard'))
          }
        />

        {/* Compact Today's Lessons Summary for Parent */}
        <TodaysLessonsPanel
          role="guardian"
          lang={lang}
          schoolId={child.schoolId}
          dailyLessons={dailyLessons}
          student={child}
          compactSummaryOnly={true}
          onViewAllClick={() => onSelectTab('todays_lessons')}
        />

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => onSelectTab('attendance')}
            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-blue-400 transition-colors cursor-pointer"
          >
            <div className="text-xs font-semibold text-slate-500">{b('উপস্থিতি', 'Attendance', lang)}</div>
            <div className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
              {child.attendancePct}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {b(`${childAttendanceHistory.length}টি স্ক্যান রেকর্ড`, `${childAttendanceHistory.length} scan records`, lang)}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('progress')}
            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-blue-400 transition-colors cursor-pointer"
          >
            <div className="text-xs font-semibold text-slate-500">{b('একাডেমিক অগ্রগতি', 'Academic Progress', lang)}</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">
              {academicSummaryStatus}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {b(`${childExamMarks.length}টি বিষয়ের মূল্যায়ন`, `${childExamMarks.length} evaluated subjects`, lang)}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('assignments')}
            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-blue-400 transition-colors cursor-pointer"
          >
            <div className="text-xs font-semibold text-slate-500">{b('বাকি অ্যাসাইনমেন্ট', 'Pending Assignment', lang)}</div>
            <div className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400 mt-1">
              {pendingCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">{b('মোট নির্ধারিত কাজ', 'Due tasks', lang)}</div>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('exams')}
            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-blue-400 transition-colors cursor-pointer"
          >
            <div className="text-xs font-semibold text-slate-500">{b('আসন্ন পরীক্ষা', 'Upcoming Exam', lang)}</div>
            <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
              {upcomingExamSchedule ? upcomingExamSchedule.dateLabel : b('নির্ধারিত নয়', 'Not Scheduled', lang)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">
              {upcomingExamSchedule ? upcomingExamSchedule.title : b('কোনো সূচি যুক্ত হয়নি', 'No exam schedule yet', lang)}
            </div>
          </button>
        </div>

        {/* 9 Horizontal Quick Actions Strip */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {b('দ্রুত অ্যাক্সেস (Quick Actions)', 'Quick Actions', lang)}
            </h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2.5">
            {[
              { key: 'today', tab: 'routine', labelBn: 'আজকের ক্লাস', labelEn: "Today's Class", icon: BookOpen, tone: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200/70 dark:border-sky-800/60' },
              { key: 'routine', tab: 'routine', labelBn: 'ক্লাস রুটিন', labelEn: 'Routine', icon: CalendarDays, tone: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/60' },
              { key: 'attendance', tab: 'attendance', labelBn: 'উপস্থিতি', labelEn: 'Attendance', icon: Clock, tone: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200/70 dark:border-teal-800/60' },
              { key: 'assignments', tab: 'assignments', labelBn: 'অ্যাসাইনমেন্ট', labelEn: 'Assignment', icon: ClipboardList, tone: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-800/60' },
              { key: 'homework', tab: 'homework', labelBn: 'হোমওয়ার্ক', labelEn: 'Homework', icon: Home, tone: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/60' },
              { key: 'exams', tab: 'exams', labelBn: 'পরীক্ষা', labelEn: 'Exams', icon: FileText, tone: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200/70 dark:border-blue-800/60' },
              { key: 'results', tab: 'results', labelBn: 'ফলাফল', labelEn: 'Result', icon: Award, tone: 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border-violet-200/70 dark:border-violet-800/60' },
              { key: 'notices', tab: 'notices', labelBn: 'নোটিশ', labelEn: 'Notice', icon: Bell, tone: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200/70 dark:border-rose-800/60' },
              { key: 'messages', tab: 'messages', labelBn: 'শিক্ষক যোগাযোগ', labelEn: 'Teacher Contact', icon: MessageSquare, tone: 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-200/70 dark:border-cyan-800/60' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelectTab(item.tab)}
                  className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all hover:shadow-xs text-center cursor-pointer ${item.tone}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-white/80 dark:bg-slate-900/70 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-semibold leading-tight">
                    {b(item.labelBn, item.labelEn, lang)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Dashboard Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Child Attendance Donut */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('আমার সন্তানের উপস্থিতি', "My Child's Attendance", lang)}
              </h2>
              <button type="button" onClick={() => onSelectTab('attendance')} className="text-xs text-blue-700 dark:text-blue-400 font-semibold cursor-pointer">
                {b('ছুটির আবেদন', 'Apply Leave', lang)} →
              </button>
            </div>
            {attendanceSegments.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                {b('এখনো কোনো উপস্থিতি স্ক্যান রেকর্ড পাওয়া যায়নি।', 'No attendance scan records yet.', lang)}
              </p>
            ) : (
              <AttendanceDonutChart
                centerValue={`${child.attendancePct}%`}
                centerLabel={b('উপস্থিত', 'Present', lang)}
                segments={attendanceSegments}
              />
            )}
          </div>

          {/* Today's Classes */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('আজকের ক্লাস', "Today's Classes", lang)}
              </h2>
              <span className="text-xs text-slate-500">{child.className}</span>
            </div>
            {routineSlots.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                {b('আজকের কোনো রুটিন স্লট নির্ধারিত নেই।', 'No class slots scheduled for today.', lang)}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {routineSlots.map((slot) => (
                  <div key={slot.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {slot.timeRange} – {b(slot.subjectBn, slot.subjectEn, lang)}
                      </div>
                      <div className="text-slate-500">
                        {b('শিক্ষক:', 'Teacher:', lang)} {slot.teacherName} · Room {slot.room}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded font-semibold ${
                        slot.status === 'in_progress'
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                          : slot.status === 'completed'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {slot.status === 'in_progress'
                        ? b('চলছে', 'Live', lang)
                        : slot.status === 'completed'
                          ? b('সম্পন্ন', 'Done', lang)
                          : b('আসন্ন', 'Upcoming', lang)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignments */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {b('অ্যাসাইনমেন্ট ও বাড়ির কাজ', 'Assignments & Homework', lang)}
            </h2>
            {childAssignments.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                {b('বর্তমানে কোনো অ্যাসাইনমেন্ট নেই।', 'No assignments assigned yet.', lang)}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {childAssignments.map((asg) => (
                  <div key={asg.id} className="py-3 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{b(asg.titleBn, asg.titleEn, lang)}</div>
                      <div className="text-slate-500">
                        {b(asg.subjectBn, asg.subjectEn, lang)} · Due: {asg.dueDate}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleAssignmentSubmit(asg.id)}
                      className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                        asg.status === 'submitted'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {asg.status === 'submitted' ? 'Submitted' : 'Pending (Mark Done)'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Result */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AchievementTrophyIllustration className="w-12 h-10 shrink-0" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {b('সাম্প্রতিক ফলাফল', 'Recent Result', lang)}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {b('সর্বশেষ মূল্যায়ন ও বিষয়ভিত্তিক গ্রেড', 'Latest assessment & grades', lang)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {publishedExam && publishedExam.status === 'published' && childExamMarks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMarksheetOpen(true)}
                    className="px-2.5 py-1 rounded bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    {b('মার্কশিট দেখুন', 'View Marksheet', lang)}
                  </button>
                )}
                <button type="button" onClick={() => onSelectTab('results')} className="text-xs text-blue-700 dark:text-blue-400 font-semibold cursor-pointer">
                  {b('নম্বরপত্র', 'Marksheet', lang)} →
                </button>
              </div>
            </div>
            {!publishedExam || publishedExam.status !== 'published' || childExamMarks.length === 0 ? (
              <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                {b('পরীক্ষার প্রকাশিত ফলাফল এখনো যুক্ত হয়নি।', 'No published exam marks available for this child yet.', lang)}
              </p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2 font-semibold">{b('বিষয়', 'Subject', lang)}</th>
                    <th className="py-2 font-semibold text-right">{b('নম্বর', 'Marks', lang)}</th>
                    <th className="py-2 font-semibold text-right">{b('গ্রেড', 'Grade', lang)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {childExamMarks.map((m) => {
                    const total = m.written + m.oral + m.continuous;
                    const g = calculateBDGradeAndGPA(total, m.fullMarks, m.passMarks);
                    return (
                      <tr key={m.subjectEn}>
                        <td className="py-2 font-semibold text-slate-900 dark:text-white">{b(m.subjectBn, m.subjectEn, lang)}</td>
                        <td className="py-2 text-right tabular-nums">{g.totalObtained} / {m.fullMarks}</td>
                        <td className="py-2 text-right font-bold text-emerald-700 dark:text-emerald-400">{g.letterGrade}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Bottom 3 Cards: Academic Progress + Latest Notice + Teacher Contact */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{b('একাডেমিক অগ্রগতি', 'Academic Progress', lang)}</h2>
            {childExamMarks.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">
                {b('বিষয়ভিত্তিক পরীক্ষার নম্বর এন্ট্রি হলে অগ্রগতি বার প্রদর্শিত হবে।', 'Subject progress meters appear once exam marks are recorded.', lang)}
              </p>
            ) : (
              childExamMarks.slice(0, 5).map((m, idx) => {
                const total = m.written + m.oral + m.continuous;
                const pct = m.fullMarks > 0 ? Math.min(100, Math.round((total / m.fullMarks) * 100)) : 0;
                const palette = ['bg-blue-700', 'bg-sky-600', 'bg-emerald-600', 'bg-indigo-600', 'bg-teal-600'];
                return (
                  <ProgressMeter
                    key={m.subjectEn}
                    label={b(m.subjectBn, m.subjectEn, lang)}
                    value={pct}
                    barColorClass={palette[idx % palette.length]}
                  />
                );
              })
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{b('সর্বশেষ নোটিশ', 'Latest Notice', lang)}</h2>
              <button type="button" onClick={() => onSelectTab('notices')} className="text-xs text-blue-700 dark:text-blue-400 font-semibold cursor-pointer">
                {b('সব দেখুন', 'View all', lang)}
              </button>
            </div>
            {notices.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">{b('কোনো নোটিশ প্রকাশিত হয়নি।', 'No notices published yet.', lang)}</p>
            ) : (
              <div className="space-y-2.5 text-xs">
                {notices.slice(0, 3).map((n) => (
                  <div key={n.id} className="border-b last:border-b-0 border-slate-100 dark:border-slate-800 pb-2 last:pb-0">
                    <div className="font-semibold text-slate-900 dark:text-white">{b(n.titleBn, n.titleEn, lang)}</div>
                    <div className="text-slate-500 mt-0.5">{n.date} · {n.category}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{b('শ্রেণি শিক্ষক যোগাযোগ', 'Teacher Contact', lang)}</h2>
              {classTeacher ? (
                <>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {b(classTeacher.nameBn, classTeacher.nameEn, lang)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {classTeacher.designation} · {child.className}
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-500">
                  {b('সন্তানের শ্রেণির জন্য শিক্ষকের সাথে সরাসরি বার্তা পাঠান।', 'Send direct messages to your child’s school teachers.', lang)}
                </div>
              )}
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {b('সন্তানের পড়াশোনা বা উপস্থিতি বিষয়ে সরাসরি মেসেজ পাঠান।', 'Send direct messages regarding homework, attendance, or progress.', lang)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('messages')}
              className="w-full py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer"
            >
              {b('শিক্ষকের সাথে কথা বলুন', 'Contact / Message Teacher', lang)}
            </button>
          </div>
        </div>
        {publishedExam && (
          <StudentMarksheetModal
            open={marksheetOpen}
            onClose={() => setMarksheetOpen(false)}
            lang={lang}
            student={child}
            school={school}
            exam={publishedExam}
            gradingRules={gradingRules}
          />
        )}
      </div>
    );
  }

  // Dedicated Today's Lessons Tab for Parent
  if (activeTab === 'todays_lessons') {
    return (
      <TodaysLessonsPanel
        role="guardian"
        lang={lang}
        schoolId={child.schoolId}
        dailyLessons={dailyLessons}
        student={child}
      />
    );
  }

  // Child Profile + Printable A4 Digital QR ID Card + Link Another Child via School Code & Student ID
  if (activeTab === 'child' || activeTab === 'profile') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {b('সন্তানের প্রোফাইল ও ডিজিটাল QR আইডি কার্ড', 'Child Profile & Printable Digital QR ID Card', lang)}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {onOpenUserProfileManager && (
              <button
                type="button"
                onClick={onOpenUserProfileManager}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 cursor-pointer"
              >
                <UserCog className="w-3.5 h-3.5" />
                {b('অ্যাকাউন্ট প্রোফাইল ও ইউনিক আইডি', 'Manage Parent Profile', lang)}
              </button>
            )}
            {onOpenPhotoEditor && (
              <button
                type="button"
                onClick={onOpenPhotoEditor}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                {b('অভিভাবক ছবি পরিবর্তন / ক্রপ', 'Edit Parent Photo', lang)}
              </button>
            )}
          </div>
        </div>

        {/* Parent Personal Profile Summary Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              {guardianPhotoUrl ? (
                <img
                  src={guardianPhotoUrl}
                  alt={parentDisplayName}
                  className="w-14 h-14 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-sky-600 text-white font-bold text-lg flex items-center justify-center">
                  {parentDisplayName.charAt(0)}
                </div>
              )}
              {onOpenPhotoEditor && (
                <button
                  type="button"
                  onClick={onOpenPhotoEditor}
                  title={b('ছবি পরিবর্তন / ক্রপ', 'Change Photo', lang)}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-700 hover:bg-blue-800 text-white border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-xs cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="text-xs">
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {parentDisplayName} ({b('অভিভাবক / Parent', 'Parent Account', lang)})
              </div>
              <div className="text-slate-500 mt-0.5">
                {b('সংযুক্ত সন্তান:', 'Linked Children:', lang)} {allChildren.length} · {b('বর্তমান বিদ্যালয়:', 'School:', lang)} {child.schoolNameBn}
              </div>
            </div>
          </div>
          {onOpenPhotoEditor && (
            <button
              type="button"
              onClick={onOpenPhotoEditor}
              className="px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer"
            >
              {b('প্রোফাইল ছবি সেট ও ক্রপ করুন', 'Upload & Crop Photo', lang)}
            </button>
          )}
        </div>

        {/* Printable A4 Student Digital QR ID Card + Link Another Child */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <StudentQrIdCardPanel
              lang={lang}
              student={child}
              school={school}
              attendanceHistory={childAttendanceHistory}
            />
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 h-fit">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-700" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('স্কুল কোড ও Student ID দিয়ে সন্তান সংযুক্তি', 'Link Another Child via School Code & Student ID', lang)}
              </h2>
            </div>
            <form onSubmit={handleLinkSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">{b('বিদ্যালয়ের কোড / আইডি / ইউজারনেম', 'School Code / ID / Username', lang)}</label>
                <input
                  type="text"
                  required
                  value={linkSchoolCode}
                  onChange={(e) => setLinkSchoolCode(e.target.value)}
                  placeholder={b('বিদ্যালয়ের কোড লিখুন', 'Enter school ID or code', lang)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('Unique Student ID বা লিংক কোড', 'Unique Student ID or Link Code', lang)}</label>
                <input
                  type="text"
                  required
                  value={linkStudentCode}
                  onChange={(e) => setLinkStudentCode(e.target.value)}
                  placeholder={b('ভর্তির সময় প্রদত্ত Student ID লিখুন', 'Enter Unique Student ID', lang)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                />
              </div>
              {linkFeedback && (
                <p className="text-emerald-700 dark:text-emerald-400 font-semibold">{linkFeedback}</p>
              )}
              <button type="submit" className="px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer">
                {b('সন্তান যুক্ত করুন', 'Link Child Account', lang)}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Attendance & Leave Application
  if (activeTab === 'attendance') {
    const handleLeave = (e: React.FormEvent) => {
      e.preventDefault();
      if (!leaveNote.trim()) return;
      onSubmitLeaveRequest({
        studentId: child.id,
        studentName: child.nameBn,
        reasonType: leaveReason,
        dateRange: leaveDates,
        note: leaveNote.trim(),
      });
      setLeaveNote('');
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {b('ছুটির আবেদন / অনুপস্থিতির কারণ পাঠান', 'Leave Application & Absence Reason', lang)}
          </h2>
          <form onSubmit={handleLeave} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">{b('কারণ', 'Reason Type', lang)}</label>
              <select
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="অসুস্থতা">অসুস্থতা (Illness)</option>
                <option value="পারিবারিক জরুরি কাজ">পারিবারিক জরুরি কাজ (Family Emergency)</option>
                <option value="ভ্রমণ">ভ্রমণ (Travel)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('তারিখ', 'Date(s)', lang)}</label>
              <input
                type="text"
                value={leaveDates}
                onChange={(e) => setLeaveDates(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('বিস্তারিত বিবরণ *', 'Note *', lang)}</label>
              <textarea
                rows={3}
                value={leaveNote}
                onChange={(e) => setLeaveNote(e.target.value)}
                placeholder={b('অনুপস্থিতির কারণ লিখুন...', 'Describe reason for absence...', lang)}
                className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <button type="submit" className="px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer">
              {b('আবেদন জমা দিন', 'Submit Leave Application', lang)}
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {b('ছুটির আবেদনের তালিকা', 'Submitted Leave Requests', lang)}
          </h2>
          {childLeaves.length === 0 ? (
            <p className="text-xs text-slate-500">{b('কোনো ছুটির আবেদন নেই।', 'No leave requests submitted.', lang)}</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {childLeaves.map((lv) => (
                <div key={lv.id} className="py-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{lv.reasonType} · {lv.dateRange}</div>
                    <div className="text-slate-500 mt-0.5">{lv.note}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold">
                    {lv.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {b('দৈনিক ID স্ক্যান ও উপস্থিতির ইতিহাস', 'Daily ID Scan & Attendance History', lang)}
            </h2>
            <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
              {b('উপস্থিতির হার:', 'Attendance Rate:', lang)} {child.attendancePct}%
            </span>
          </div>
          {childAttendanceHistory.length === 0 ? (
            <p className="text-slate-500">{b('কোনো উপস্থিতি লগ নেই।', 'No attendance scan logs yet.', lang)}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {childAttendanceHistory.slice(0, 9).map((h) => (
                <div
                  key={h.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white tabular-nums">{h.dateIso}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {h.scanTime ?? '--'} · {h.source}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded font-semibold ${
                      h.status === 'present'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                        : h.status === 'late'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                          : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {h.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Two-Way Teacher Communication
  if (activeTab === 'messages') {
    const handleSend = (e: React.FormEvent) => {
      e.preventDefault();
      if (!msgInput.trim()) return;
      onSendMessage(msgInput.trim());
      setMsgInput('');
    };

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 max-w-3xl">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
          <h1 className="text-base font-bold text-slate-900 dark:text-white">
            {b('শিক্ষকের সাথে দ্বিমুখী যোগাযোগ', 'Two-Way Communication with Class Teacher', lang)}
          </h1>
          <p className="text-xs text-slate-500">
            {(classTeacher ? `${classTeacher.nameBn} · ` : '')}
            {child.nameBn} ({child.className})
          </p>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {childMessages.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              {b('এখনো কোনো বার্তা আদান-প্রদান হয়নি। নিচে আপনার বার্তা লিখুন।', 'No messages yet. Write a message below.', lang)}
            </p>
          ) : (
            childMessages.map((m) => (
              <div
                key={m.id}
                className={`p-3 rounded-xl text-xs max-w-[85%] ${
                  m.sender === 'guardian'
                    ? 'ml-auto bg-blue-700 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                }`}
              >
                <div className="font-semibold opacity-85 mb-0.5">{m.senderName}</div>
                <div>{m.text}</div>
                <div className="text-[10px] opacity-70 mt-1 text-right">{m.time}</div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSend} className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <input
            type="text"
            value={msgInput}
            onChange={(e) => setMsgInput(e.target.value)}
            placeholder={b('শিক্ষকের জন্য বার্তা লিখুন...', 'Write a message to teacher...', lang)}
            className="flex-1 h-10 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-blue-700 text-white text-xs font-semibold cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            {b('পাঠান', 'Send', lang)}
          </button>
        </form>
      </div>
    );
  }

  // Fees View
  if (activeTab === 'fees') {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {b('সন্তানের ফি ও পেমেন্ট ইতিহাস', 'Child Fees & Payment History', lang)}
        </h1>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {childFees.length === 0 ? (
            <p className="p-6 text-xs text-slate-500 text-center">
              {b('কোনো ফি বা রশিদ এখনো যুক্ত হয়নি।', 'No fee receipts recorded yet.', lang)}
            </p>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                  <th className="py-3 px-4 font-semibold">Receipt</th>
                  <th className="py-3 px-3 font-semibold">{b('বিবরণ', 'Description', lang)}</th>
                  <th className="py-3 px-3 font-semibold text-right">{b('টাকা', 'Amount', lang)}</th>
                  <th className="py-3 px-4 font-semibold">{b('মাধ্যম ও তারিখ', 'Method & Date', lang)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {childFees.map((f) => (
                  <tr key={f.id}>
                    <td className="py-3 px-4 font-mono font-semibold">{f.receiptNo}</td>
                    <td className="py-3 px-3">{b(f.categoryBn, f.categoryEn, lang)} · {f.month}</td>
                    <td className="py-3 px-3 text-right tabular-nums font-bold">৳ {f.paidAmount} / ৳ {f.totalAmount}</td>
                    <td className="py-3 px-4">{f.method} · {f.paidDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // Results / Progress / Study / Notices / Routine / Support
  const trendPoints = exams
    .filter((ex) => ex.entries.some((en) => en.studentId === child.id))
    .map((ex) => {
      const entries = ex.entries.filter((en) => en.studentId === child.id);
      const totalObt = entries.reduce((sum, en) => sum + en.written + en.oral + en.continuous, 0);
      const totalFull = entries.reduce((sum, en) => sum + en.fullMarks, 0);
      return {
        label: b(ex.titleBn, ex.titleEn, lang),
        value: totalFull > 0 ? Math.round((totalObt / totalFull) * 100) : 0,
      };
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {activeTab === 'results' || activeTab === 'exams'
            ? b('সন্তানের পরীক্ষার ফলাফল ও নম্বরপত্র', "Child's Exam Results & Marksheet", lang)
            : activeTab === 'progress'
              ? b('একাডেমিক অগ্রগতির ট্রেন্ড চার্ট', 'Academic Progress & Trend Chart', lang)
              : activeTab === 'notices'
                ? b('বিদ্যালয়ের নোটিশ ও বিজ্ঞপ্তি', 'School Notices & Announcements', lang)
                : b('পড়াশোনা ও ক্লাস রুটিন', 'Study Plan & Class Routine', lang)}
        </h1>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer no-print"
        >
          <Printer className="w-3.5 h-3.5" />
          {b('প্রিন্ট', 'Print', lang)}
        </button>
      </div>

      {activeTab === 'progress' ? (
        <div className="space-y-5">
          <StudentAcademicProgressPanel
            lang={lang}
            students={[child]}
            selectedStudentId={child.id}
            allowStudentSwitch={false}
            exams={exams}
            assignments={assignments}
            classworks={classworks}
            gradingRules={gradingRules}
          />
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-bold mb-3">{child.nameBn} — {b('ধারাবাহিক ফলাফলের ট্রেন্ড', 'Exam Score Trend', lang)}</h2>
            {trendPoints.length === 0 ? (
              <p className="text-xs text-slate-500">
                {b('এখনো একাধিক পরীক্ষার ফলাফল না থাকায় ট্রেন্ড চার্ট তৈরি হয়নি।', 'Exam score trend will appear as exam records are published.', lang)}
              </p>
            ) : (
              <TrendLineChart points={trendPoints} />
            )}
          </div>
        </div>
      ) : activeTab === 'results' || activeTab === 'exams' || activeTab === 'documents' ? (
        <div className="space-y-5">
          {activeTab === 'exams' && (
            <>
              <ExaminationManagementPanel
                lang={lang}
                role="guardian"
                schoolId={child.schoolId}
                actorName={parentDisplayName}
                studentClass={child.className}
                studentId={child.id}
                schools={school ? [school] : []}
                students={[child]}
                exams={exams}
                onCreateLocalExam={() => {}}
                onToggleCentralTermPublish={() => {}}
                onUpdateExamMark={() => {}}
              />
              {school && (
                <ExamRoutineSystem
                  lang={lang}
                  role="guardian"
                  school={school}
                  actorName={parentDisplayName}
                  studentClass={child.className}
                  studentSection={child.section}
                  teachers={teachers}
                  exams={exams}
                  examRoutines={examRoutines}
                />
              )}
            </>
          )}
          {!publishedExam || publishedExam.status !== 'published' ? (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-5 text-xs text-amber-800 dark:text-amber-200 font-semibold">
              {b('প্রধান শিক্ষক বা কেন্দ্রীয় প্রশাসন কর্তৃক পরীক্ষার ফলাফল এখনো প্রকাশিত হয়নি।', 'Exam results are currently awaiting publication.', lang)}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{b(publishedExam.titleBn, publishedExam.titleEn, lang)}</div>
                  <div className="text-slate-500">{b('বিষয়ভিত্তিক ও মেধাক্রম পজিশন সহ ডিজিটাল মার্কশিট দেখুন।', 'View full digital marksheet with Subject & Overall Rank.', lang)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setMarksheetOpen(true)}
                  className="px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
                >
                  {b('মার্কশিট দেখুন', 'View Marksheet', lang)}
                </button>
              </div>
              {school && (
                <AcademicCertificatesDocsPanel
                  lang={lang}
                  school={school}
                  students={[child]}
                  exams={exams}
                  classworks={classworks}
                  assignments={assignments}
                  gradingRules={gradingRules}
                  lockedStudentId={child.id}
                />
              )}
            </div>
          )}
          {activeTab === 'documents' && school && (
            <OfficialDocumentSystem
              lang={lang}
              role="guardian"
              school={school}
              actorName={`${parentDisplayName} (Parent)`}
              students={[child]}
              teachers={teachers}
              exams={exams}
              documents={officialDocuments.filter((d) => d.targetEntityId === child.id || d.targetPermanentId === child.permanentId)}
              templates={documentTemplates}
              onUpdateDocuments={() => {}}
              canGenerate={false}
            />
          )}
        </div>
      ) : activeTab === 'materials' || activeTab === 'school_info' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 text-xs">
          <div className="font-bold text-sm text-slate-900 dark:text-white">
            {b('অধ্যয়ন সামগ্রী ও নোটস (Study Materials)', 'Study Materials & Class Notes', lang)}
          </div>
          {studyMaterials.length === 0 ? (
            <p className="text-slate-500">{b('কোনো স্টাডি ম্যাটেরিয়াল এখনো যুক্ত হয়নি।', 'No study materials uploaded yet.', lang)}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {studyMaterials.map((mat) => (
                <div key={mat.id} className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-semibold text-blue-700 dark:text-blue-400">{mat.materialType}</span>
                    <span className="text-slate-400">{mat.uploadedDate}</span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white">{b(mat.titleBn, mat.titleEn, lang)}</div>
                  <div className="text-slate-500">{mat.subjectEn} · {mat.uploadedBy}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'homework' || activeTab === 'assignments' || activeTab === 'study' ? (
        <div className="space-y-5 text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {b('ক্লাসওয়ার্ক ও দৈনিক শ্রেণি কার্যক্রম (Classwork)', 'In-Class Daily Classwork', lang)}
            </h2>
            {classworks.filter((cw) => cw.className === child.className).length === 0 ? (
              <p className="text-slate-500">{b('আজকের কোনো ক্লাসওয়ার্ক নেই।', 'No classwork recorded for this class.', lang)}</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {classworks
                  .filter((cw) => cw.className === child.className)
                  .map((cw) => {
                    const rec = cw.studentStatuses.find((st) => st.studentId === child.id);
                    return (
                      <div key={cw.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {b(cw.subjectBn, cw.subjectEn, lang)} — {b(cw.titleBn, cw.titleEn, lang)}
                          </div>
                          <div className="text-slate-500 mt-0.5">
                            {cw.teacherName} · {cw.date} {rec?.feedback ? `· Feedback: ${rec.feedback}` : ''}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded font-semibold ${
                            rec?.status === 'completed'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {rec?.status ?? 'pending'}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {b('বাড়ির কাজ ও অ্যাসাইনমেন্ট (Homework & Assignment)', 'Homework & Assignments', lang)}
            </h2>
            {childAssignments.length === 0 ? (
              <p className="text-slate-500">{b('কোনো অ্যাসাইনমেন্ট নেই।', 'No assignments available.', lang)}</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {childAssignments.map((asg) => (
                  <div key={asg.id} className="py-3 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{b(asg.titleBn, asg.titleEn, lang)}</div>
                      <div className="text-slate-500">{b(asg.subjectBn, asg.subjectEn, lang)} · Due: {asg.dueDate}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleAssignmentSubmit(asg.id)}
                      className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                        asg.status === 'submitted'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {asg.status === 'submitted' ? 'Submitted' : 'Pending (Mark Done)'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'notices' ? (
        <NoticeCommunicationCenter
          lang={lang}
          role="guardian"
          userId={child.id}
          actorName={`${parentDisplayName} (Parent)`}
          schoolId={child.schoolId}
          studentClass={child.className}
          notices={notices}
          onCreateNotice={() => {}}
          onEditNotice={() => {}}
          onTransitionNoticeStatus={() => {}}
          onMarkNoticeRead={onMarkNoticeRead ?? (() => {})}
        />
      ) : (
        <div className="space-y-5">
          <RoutineManagementSystem
            lang={lang}
            role="guardian"
            school={school}
            actorName={`${parentDisplayName} (Parent)`}
            routines={masterRoutines}
            teachers={[]}
            teacherAssignments={[]}
            studentClass={child.className}
            studentSection={child.section}
            studentName={child.nameBn}
            onUpdateRoutines={() => {}}
          />
          {school && (
            <ExamRoutineSystem
              lang={lang}
              role="guardian"
              school={school}
              actorName={`${parentDisplayName} (Parent)`}
              studentClass={child.className}
              studentSection={child.section}
              teachers={teachers}
              exams={exams}
              examRoutines={examRoutines}
            />
          )}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 text-xs no-print">
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              {child.nameBn} ({child.className}) — {b('আজকের শ্রেণি ও বাড়ির কাজ', "Today's Classwork & Homework", lang)}
            </div>
            {routineSlots.length === 0 ? (
              <p className="text-slate-500">{b('আজকের কোনো রুটিন স্লট পাওয়া যায়নি।', 'No routine slots available.', lang)}</p>
            ) : (
              routineSlots.map((slot) => (
                <div key={slot.id} className="py-2.5 border-b last:border-b-0 border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{slot.timeRange} · {b(slot.subjectBn, slot.subjectEn, lang)}</div>
                    <div className="text-slate-500">{slot.substituteTeacher ?? slot.teacherName} · Room {slot.room}</div>
                  </div>
                  {slot.homeworkText && (
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">{slot.homeworkText}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {publishedExam && (
        <StudentMarksheetModal
          open={marksheetOpen}
          onClose={() => setMarksheetOpen(false)}
          lang={lang}
          student={child}
          school={school}
          exam={publishedExam}
          gradingRules={gradingRules}
        />
      )}
    </div>
  );
};

