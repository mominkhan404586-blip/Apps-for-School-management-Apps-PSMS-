import React, { useState } from 'react';
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
  QrCode,
  Send,
  TrendingUp,
  UserPlus,
  Wallet,
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
  Language,
  LeaveRequestItem,
  MasterRoutineRecord,
  NoticeItem,
  NotificationItem,
  NotificationPreferences,
  OfficialDocumentRecord,
  OfficialDocumentTemplate,
  RoutineSlot,
  SchoolRecord,
  StudentAttendanceHistoryEntry,
  StudentRecord,
  StudyMaterialItem,
  TeacherMessageItem,
  TeacherRecord,
} from '../types';
import { AVATARS } from '../data/mockData';
import { calculateBDGradeAndGPA } from '../utils/rbacAndGrading';
import { DEFAULT_NCTB_GRADING_RULES } from '../utils/academicEngine';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../utils/notificationAndNoticeEngine';
import { pickPrimaryTermOrPublishedExam } from '../utils/examGovernanceEngine';
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

interface GuardianViewsProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  lang: Language;
  child: StudentRecord;
  allChildren: StudentRecord[];
  onSelectChild: (childId: string) => void;
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
  settingsCenterElement?: React.ReactNode;
}

export const GuardianViews: React.FC<GuardianViewsProps> = ({
  activeTab,
  onSelectTab,
  lang,
  child,
  allChildren,
  onSelectChild,
  assignments,
  onToggleAssignmentSubmit,
  routineSlots,
  masterRoutines = [],
  exams,
  fees,
  notices,
  notifications = [],
  notificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES,
  lastLoginIso = '2026-11-19T09:00:00',
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
  settingsCenterElement,
}) => {
  const [leaveReason, setLeaveReason] = useState('অসুস্থতা');
  const [leaveDates, setLeaveDates] = useState('১৮ নভে ২০২৬');
  const [leaveNote, setLeaveNote] = useState('');
  const [msgInput, setMsgInput] = useState('');
  const [linkSchoolCode, setLinkSchoolCode] = useState('GPS-1042');
  const [linkStudentCode, setLinkStudentCode] = useState('');
  const [linkFeedback, setLinkFeedback] = useState('');
  const [marksheetOpen, setMarksheetOpen] = useState(false);

  const childAssignments = assignments.filter((a) => a.studentId === child.id);
  const pendingCount = childAssignments.filter((a) => a.status === 'pending').length;
  const publishedExam = pickPrimaryTermOrPublishedExam(exams);
  const childExamMarks = publishedExam
    ? publishedExam.entries.filter((e) => e.studentId === child.id)
    : [];
  const childFees = fees.filter((f) => f.studentId === child.id);
  const childMessages = messages.filter((m) => m.studentId === child.id);
  const childLeaves = leaveRequests.filter((l) => l.studentId === child.id);
  const childAttendanceHistory = attendanceHistory.filter((h) => h.studentId === child.id);

  if (activeTab === 'settings' && settingsCenterElement) {
    return <>{settingsCenterElement}</>;
  }

  if (activeTab === 'notifications') {
    return (
      <NotificationCenterPanel
        lang={lang}
        role="guardian"
        schoolId={child.schoolId}
        studentId={child.id}
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

  // Dashboard View (Friendly, Clean, Student-Focused)
  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-6">
        {school && (
          <SchoolCoverBanner
            school={school}
            lang={lang}
            canEditCover={false}
            subtitleBn={`অভিভাবক ড্যাশবোর্ড · সন্তান: ${child.nameBn} (${child.className})`}
            subtitleEn={`Guardian Portal · Child: ${child.nameEn} (${child.className})`}
          />
        )}
        {/* Crisp Blue Welcome Hero Banner + Child Profile (Matches Guardian Portal Reference) */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 rounded-2xl p-5 sm:p-6 text-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight text-white">
              {b('স্বাগতম, মোঃ জামাল উদ্দিন!', 'Welcome, Md. Jamal Uddin!', lang)}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100">
              {b(
                'আপনার সন্তানের পড়াশোনা, উপস্থিতি ও অগ্রগতি এক নজরে দেখুন।',
                'Track your child’s daily attendance, classwork, results, and teacher updates.',
                lang
              )}
            </p>
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
                <div className="text-sm font-bold text-white">{child.nameBn}</div>
                <div className="text-xs text-blue-100 tabular-nums">
                  {child.className} · {b('রোল', 'Roll', lang)} {child.roll} · {child.section}
                </div>
                <div className="text-[11px] font-mono text-sky-100">
                  {child.schoolNameBn}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy-Safe Parent Live Class Status + Daily Study Overview */}
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

        {/* Compact Today's Lessons Summary for Guardian */}
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
            <div className="text-[11px] text-slate-500 mt-1">{b('নিয়মিত উপস্থিত', 'Regular attendance', lang)}</div>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('progress')}
            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-blue-400 transition-colors cursor-pointer"
          >
            <div className="text-xs font-semibold text-slate-500">Academic Progress</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">
              {b('ভালো (Good)', 'Good', lang)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">{b('সকল বিষয়ে উন্নতি', 'Steady improvement', lang)}</div>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('assignments')}
            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-blue-400 transition-colors cursor-pointer"
          >
            <div className="text-xs font-semibold text-slate-500">Pending Assignment</div>
            <div className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400 mt-1">
              {pendingCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">{b('জমা দেওয়ার অপেক্ষায়', 'Due this week', lang)}</div>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('exams')}
            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-blue-400 transition-colors cursor-pointer"
          >
            <div className="text-xs font-semibold text-slate-500">Upcoming Exam</div>
            <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
              20 Nov
            </div>
            <div className="text-[11px] text-slate-500 mt-1">{b('বার্ষিক পরীক্ষা ২০২৬', 'Annual Exam 2026', lang)}</div>
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
              { key: 'attendance', tab: 'attendance', labelBn: 'Attendance', labelEn: 'Attendance', icon: Clock, tone: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200/70 dark:border-teal-800/60' },
              { key: 'assignments', tab: 'assignments', labelBn: 'Assignment', labelEn: 'Assignment', icon: ClipboardList, tone: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-800/60' },
              { key: 'homework', tab: 'homework', labelBn: 'Homework', labelEn: 'Homework', icon: Home, tone: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/60' },
              { key: 'exams', tab: 'exams', labelBn: 'Exams', labelEn: 'Exams', icon: FileText, tone: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200/70 dark:border-blue-800/60' },
              { key: 'results', tab: 'results', labelBn: 'Result', labelEn: 'Result', icon: Award, tone: 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border-violet-200/70 dark:border-violet-800/60' },
              { key: 'notices', tab: 'notices', labelBn: 'Notice', labelEn: 'Notice', icon: Bell, tone: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200/70 dark:border-rose-800/60' },
              { key: 'messages', tab: 'messages', labelBn: 'Teacher Contact', labelEn: 'Teacher Contact', icon: MessageSquare, tone: 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-200/70 dark:border-cyan-800/60' },
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
            <AttendanceDonutChart
              centerValue={`${child.attendancePct}%`}
              centerLabel={b('উপস্থিত', 'Present', lang)}
              segments={[
                { label: 'Present', value: 48, color: '#059669' },
                { label: 'Absent', value: 1, color: '#DC2626' },
                { label: 'Late', value: 1, color: '#D97706' },
                { label: 'Leave', value: 2, color: '#2563EB' },
              ]}
            />
          </div>

          {/* Today's Classes */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('আজকের ক্লাস', "Today's Classes", lang)}
              </h2>
              <span className="text-xs text-slate-500">{child.className}</span>
            </div>
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
          </div>

          {/* Assignments */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {b('অ্যাসাইনমেন্ট ও বাড়ির কাজ', 'Assignments & Homework', lang)}
            </h2>
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
                {publishedExam && publishedExam.status === 'published' && (
                  <button
                    type="button"
                    onClick={() => setMarksheetOpen(true)}
                    className="px-2.5 py-1 rounded bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    📄 {b('View Marksheet', 'View Marksheet', lang)}
                  </button>
                )}
                <button type="button" onClick={() => onSelectTab('results')} className="text-xs text-blue-700 dark:text-blue-400 font-semibold cursor-pointer">
                  {b('নম্বরপত্র', 'Marksheet', lang)} →
                </button>
              </div>
            </div>
            {!publishedExam || publishedExam.status !== 'published' ? (
              <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                {b('প্রধান শিক্ষক কর্তৃক পরীক্ষার ফলাফল এখনো প্রকাশিত হয়নি।', 'Exam results are currently held by the Head Teacher.', lang)}
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
                  {(childExamMarks.length > 0
                    ? childExamMarks
                    : [
                        { subjectBn: 'বাংলা', subjectEn: 'Bangla', written: 68, oral: 9, continuous: 9, fullMarks: 100, passMarks: 33 },
                        { subjectBn: 'ইংরেজি', subjectEn: 'English', written: 62, oral: 9, continuous: 8, fullMarks: 100, passMarks: 33 },
                        { subjectBn: 'গণিত', subjectEn: 'Mathematics', written: 74, oral: 10, continuous: 9, fullMarks: 100, passMarks: 33 },
                        { subjectBn: 'বিজ্ঞান', subjectEn: 'Science', written: 66, oral: 9, continuous: 9, fullMarks: 100, passMarks: 33 },
                      ]
                  ).map((m) => {
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
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Academic Progress</h2>
            <ProgressMeter label={b('বাংলা (Bangla)', 'Bangla', lang)} value={86} barColorClass="bg-blue-700" />
            <ProgressMeter label={b('ইংরেজি (English)', 'English', lang)} value={79} barColorClass="bg-sky-600" />
            <ProgressMeter label={b('গণিত (Mathematics)', 'Mathematics', lang)} value={93} barColorClass="bg-emerald-600" />
            <ProgressMeter label={b('বিজ্ঞান (Science)', 'Science', lang)} value={84} barColorClass="bg-indigo-600" />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Latest Notice</h2>
              <button type="button" onClick={() => onSelectTab('notices')} className="text-xs text-blue-700 dark:text-blue-400 font-semibold cursor-pointer">
                {b('সব দেখুন', 'View all', lang)}
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              {notices.slice(0, 3).map((n) => (
                <div key={n.id} className="border-b last:border-b-0 border-slate-100 dark:border-slate-800 pb-2 last:pb-0">
                  <div className="font-semibold text-slate-900 dark:text-white">{b(n.titleBn, n.titleEn, lang)}</div>
                  <div className="text-slate-500 mt-0.5">{n.date} · {n.category}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Teacher Contact</h2>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">মোঃ আব্দুর রহিম (Rahim Sir)</div>
              <div className="text-xs text-slate-500">
                {b('শ্রেণি শিক্ষক ও গণিত ·', 'Class Teacher & Mathematics ·', lang)} {child.className}
              </div>
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

  // Dedicated Today's Lessons Tab for Guardian
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

  // Child Profile + QR ID Card + Link Child via School Code & Student ID
  if (activeTab === 'child' || activeTab === 'profile') {
    const handleLinkSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!linkStudentCode.trim()) return;
      const msg = onLinkChildByCode(linkSchoolCode, linkStudentCode.trim());
      setLinkFeedback(msg ?? b('নতুন সন্তান সফলভাবে যুক্ত হয়েছে!', 'Child linked successfully!', lang));
      setLinkStudentCode('');
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {b('সন্তানের প্রোফাইল ও ডিজিটাল QR আইডি কার্ড', 'Child Profile & Digital QR ID Card', lang)}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {onOpenPhotoEditor && (
              <button
                type="button"
                onClick={onOpenPhotoEditor}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                {b('অভিভাবক ছবি পরিবর্তন / ক্রপ', 'Edit Guardian Photo', lang)}
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              {b('ID কার্ড প্রিন্ট', 'Print ID Card', lang)}
            </button>
          </div>
        </div>

        {/* Guardian Personal Photo Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              {guardianPhotoUrl ? (
                <img
                  src={guardianPhotoUrl}
                  alt="Guardian Profile"
                  className="w-14 h-14 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-sky-600 text-white font-bold text-lg flex items-center justify-center">
                  জ
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
                {b('মোঃ জামাল উদ্দিন (অভিভাবক প্রোফাইল)', 'Md. Jamal Uddin (Guardian Account)', lang)}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-4">
              <img
                src={child.photoUrl ?? AVATARS.studentRahim}
                alt={child.nameEn}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
              />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{child.nameBn}</h2>
                <div className="text-xs text-slate-500">{child.nameEn} · {child.className} · Roll {child.roll}</div>
                <div className="text-xs font-mono text-blue-700 dark:text-blue-400 mt-1">{child.permanentId}</div>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                <QrCode className="w-14 h-14 text-slate-900 dark:text-white" />
              </div>
              <div className="space-y-1">
                <div><span className="text-slate-500">School:</span> {child.schoolNameBn}</div>
                <div><span className="text-slate-500">GLC Code:</span> <span className="font-mono font-semibold">{child.guardianLinkCode}</span></div>
                <div><span className="text-slate-500">Blood Group:</span> <span className="font-semibold text-red-600">{child.bloodGroup}</span></div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-700" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('স্কুল কোড ও Student ID / GLC দিয়ে সন্তান সংযুক্তি', 'Link Another Child via School Code & Student ID', lang)}
              </h2>
            </div>
            <form onSubmit={handleLinkSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">{b('বিদ্যালয়ের কোড', 'School Code', lang)}</label>
                <input
                  type="text"
                  value={linkSchoolCode}
                  onChange={(e) => setLinkSchoolCode(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('Student ID বা Guardian Link Code (GLC)', 'Student ID or GLC', lang)}</label>
                <input
                  type="text"
                  value={linkStudentCode}
                  onChange={(e) => setLinkStudentCode(e.target.value)}
                  placeholder="যেমন: GLC-GPS1042-0003"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                />
              </div>
              {linkFeedback && <p className="text-emerald-700 dark:text-emerald-400 font-semibold">{linkFeedback}</p>}
              <button type="submit" className="px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer">
                {b('সন্তান সংযুক্তির অনুরোধ পাঠান', 'Send Guardian Link Request', lang)}
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
          <p className="text-xs text-slate-500">মোঃ আব্দুর রহিম · {child.nameBn} ({child.className})</p>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {childMessages.map((m) => (
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
          ))}
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
        </div>
      </div>
    );
  }

  // Results / Progress / Study / Notices / Routine / Support
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
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
            <TrendLineChart
              points={[
                { label: '১ম সাময়িক', value: 78 },
                { label: '২য় সাময়িক', value: 82 },
                { label: 'অর্ধ-বার্ষিক', value: 85 },
                { label: '৩য় সাময়িক', value: 88 },
              ]}
            />
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
                actorName="মোঃ জামাল উদ্দিন"
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
                  actorName="মোঃ জামাল উদ্দিন"
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
              {b('প্রধান শিক্ষক বা কেন্দ্রীয় প্রশাসন কর্তৃক পরীক্ষার ফলাফল এখনো প্রকাশিত হয়নি।', 'Exam results are currently held or awaiting publication.', lang)}
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
                  📄 {b('View Marksheet', 'View Marksheet', lang)}
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
              actorName="মোঃ জামাল উদ্দিন (অভিভাবক)"
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
          </div>
        </div>
      ) : activeTab === 'notices' ? (
        <NoticeCommunicationCenter
          lang={lang}
          role="guardian"
          userId={child.id}
          actorName="মোঃ জামাল উদ্দিন (অভিভাবক)"
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
            actorName="মোঃ জামাল উদ্দিন (অভিভাবক)"
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
              actorName="মোঃ জামাল উদ্দিন (অভিভাবক)"
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
            {routineSlots.map((slot) => (
              <div key={slot.id} className="py-2.5 border-b last:border-b-0 border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{slot.timeRange} · {b(slot.subjectBn, slot.subjectEn, lang)}</div>
                  <div className="text-slate-500">{slot.substituteTeacher ?? slot.teacherName} · Room {slot.room}</div>
                </div>
                {slot.homeworkText && (
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">{slot.homeworkText}</span>
                )}
              </div>
            ))}
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
