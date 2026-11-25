import React, { useState } from 'react';
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  FolderOpen,
  GraduationCap,
  History,
  Home,
  Play,
  Printer,
  QrCode,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import type {
  AssignmentItem,
  ClassworkItem,
  DailyLessonHomeworkItem,
  DailyLessonStatus,
  ExamRecord,
  ExamRoutineRecord,
  GradingRuleItem,
  Language,
  MasterRoutineRecord,
  NoticeItem,
  NotificationItem,
  NotificationPreferences,
  OfficialDocumentRecord,
  OfficialDocumentTemplate,
  RoutineSlot,
  SchoolRecord,
  StudentAttendanceHistoryEntry,
  StudentChangeRequest,
  StudentImportantFieldKey,
  StudentRecord,
  StudyMaterialItem,
  TeacherRecord,
} from '../types';
import { AVATARS } from '../data/mockData';
import { calculateBDGradeAndGPA } from '../utils/rbacAndGrading';
import { DEFAULT_NCTB_GRADING_RULES } from '../utils/academicEngine';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../utils/notificationAndNoticeEngine';
import { pickPrimaryTermOrPublishedExam } from '../utils/examGovernanceEngine';
import { sanitizeActorDisplayForRole } from '../utils/adminAndTeacherIdentityEngine';
import type { StudentAllowedSelfPatch } from '../utils/studentLifecycle';
import { b } from '../i18n/translations';
import { AttendanceDonutChart, ProgressMeter } from './Charts';
import { AchievementTrophyIllustration, StudentBooksIllustration } from './PortalIllustrations';
import { StudentProfileChangeRequestModal } from './StudentGovernanceModals';
import { StudentLiveClassBanner } from './LiveClassRoleWidgets';
import { StudentQrIdCardPanel } from './StudentQrIdCardPanel';
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

interface TeacherPortalViewProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  lang: Language;
  teacher: TeacherRecord;
  allTeachers?: TeacherRecord[];
  onSwitchTeacher?: (teacherId: string) => void;
  notifications?: NotificationItem[];
  routineSlots: RoutineSlot[];
  students: StudentRecord[];
  exams: ExamRecord[];
  onStartClass: (slotId: string) => void;
  onCompleteClass: (slotId: string, lessonTopic: string, homeworkText: string) => void;
  onRequestSubstitute: (slotId: string, reason: string) => void;
  onUpdateAssignedMark: (examId: string, studentId: string, subjectEn: string, written: number) => void;
}

export const TeacherPortalView: React.FC<TeacherPortalViewProps> = ({
  activeTab,
  onSelectTab,
  lang,
  teacher,
  allTeachers = [],
  onSwitchTeacher,
  notifications = [],
  routineSlots,
  students,
  exams,
  onStartClass,
  onCompleteClass,
  onRequestSubstitute,
  onUpdateAssignedMark,
}) => {
  const [topicDraft, setTopicDraft] = useState<Record<string, string>>({});
  const [hwDraft, setHwDraft] = useState<Record<string, string>>({});
  const [subReason, setSubReason] = useState('অসুস্থতা (Illness)');
  const [subSlotId, setSubSlotId] = useState<string | null>(null);

  const exam = pickPrimaryTermOrPublishedExam(exams);
  const assignedSubjects = teacher.subjects;
  const assignedEntries = exam ? exam.entries.filter((e) => assignedSubjects.includes(e.subjectBn)) : [];

  if (activeTab === 'marks') {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {b('নির্ধারিত বিষয়ের নম্বর প্রদান', 'Assigned Subject Marks Entry', lang)}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {b(
              `নিরাপত্তা নিয়ম: আপনি শুধুমাত্র আপনার নির্ধারিত বিষয় (${assignedSubjects.join(', ')})-এর নম্বর এন্ট্রি করতে পারবেন।`,
              `RBAC Rule: You may only enter marks for your assigned subjects (${assignedSubjects.join(', ')}).`,
              lang
            )}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                <th className="py-3 px-4 font-semibold">{b('শিক্ষার্থী', 'Student', lang)}</th>
                <th className="py-3 px-3 font-semibold">{b('বিষয়', 'Subject', lang)}</th>
                <th className="py-3 px-3 font-semibold text-right">{b('লিখিত (৮০)', 'Written (80)', lang)}</th>
                <th className="py-3 px-4 font-semibold text-right">{b('মোট ও গ্রেড', 'Total & Grade', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {assignedEntries.map((entry) => {
                const total = entry.written + entry.oral + entry.continuous;
                const g = calculateBDGradeAndGPA(total, entry.fullMarks, entry.passMarks);
                return (
                  <tr key={`${entry.studentId}-${entry.subjectEn}`}>
                    <td className="py-3 px-4 font-semibold">{entry.studentName} (Roll {entry.roll})</td>
                    <td className="py-3 px-3">{b(entry.subjectBn, entry.subjectEn, lang)}</td>
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        min={0}
                        max={80}
                        value={entry.written}
                        onChange={(e) => {
                          if (exam) {
                            onUpdateAssignedMark(exam.id, entry.studentId, entry.subjectEn, Number(e.target.value));
                          }
                        }}
                        className="w-16 h-7 px-2 text-right tabular-nums rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold">
                      {g.totalObtained} · <span className="text-blue-700 dark:text-blue-400">{g.letterGrade}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const teacherNotifications = notifications.filter(
    (n) =>
      (n.roleTarget === 'teacher' || n.roleTarget === 'all') &&
      (!n.teacherId || n.teacherId === teacher.id)
  );

  return (
    <div className="space-y-6">
      {/* Teacher Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
            {teacher.teacherCode} · {teacher.schoolNameBn} · Status: {teacher.status}
          </span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            {teacher.nameBn} — {b('শিক্ষক ড্যাশবোর্ড', 'Teacher Dashboard', lang)}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {teacher.designation} · {b('নির্ধারিত বিষয়:', 'Subjects:', lang)} {teacher.subjects.join(', ')} · {b('শ্রেণি:', 'Classes:', lang)} {teacher.assignedClasses.join(', ')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {allTeachers.length > 0 && onSwitchTeacher && (
            <select
              aria-label={b('শিক্ষক পরিবর্তন (টেস্ট)', 'Switch Teacher', lang)}
              value={teacher.id}
              onChange={(e) => onSwitchTeacher(e.target.value)}
              className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold cursor-pointer"
            >
              {allTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nameBn} ({t.teacherCode})
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => onSelectTab('marks')}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white cursor-pointer whitespace-nowrap"
          >
            {b('নম্বর প্রদান করুন (Marks Entry)', 'Enter Subject Marks', lang)}
          </button>
        </div>
      </div>

      {/* Teacher In-App Notifications & Approval Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-sky-600" />
              {b('🔔 সাম্প্রতিক নোটিফিকেশন (In-App)', 'Recent Teacher Notifications', lang)}
            </h2>
            <span className="text-slate-500 tabular-nums">{teacherNotifications.length}</span>
          </div>
          {teacherNotifications.length === 0 ? (
            <p className="text-slate-500">{b('নতুন কোনো নোটিফিকেশন নেই।', 'No notifications yet.', lang)}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {teacherNotifications.slice(0, 4).map((n) => (
                <li key={n.id} className="py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">{b(n.titleBn, n.titleEn, lang)}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">{n.time}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">{b(n.messageBn, n.messageEn, lang)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <History className="w-4 h-4 text-blue-700" />
              {b('অনুমোদন ও পরিবর্তন ইতিহাস (Approval History)', 'My Approval History', lang)}
            </h2>
            <span className="text-slate-500 tabular-nums">{(teacher.approvalHistory ?? []).length}</span>
          </div>
          {(!teacher.approvalHistory || teacher.approvalHistory.length === 0) ? (
            <p className="text-slate-500">{b('কোনো ইতিহাস নেই।', 'No approval records.', lang)}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {teacher.approvalHistory.slice(0, 3).map((h) => (
                <li key={h.id} className="py-2 flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white">{b(h.actionTitleBn, h.actionTitleEn, lang)}</div>
                    <div className="text-slate-500">{sanitizeActorDisplayForRole(h.actor, 'teacher')} · {h.date}</div>
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-blue-700 dark:text-blue-400 break-words sm:text-right">
                    {h.fromValue} → {h.toValue}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500">{b('আজকের ক্লাস', "Today's Classes", lang)}</div>
          <div className="text-2xl font-bold tabular-nums mt-1">{routineSlots.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500">{b('নির্ধারিত শিক্ষার্থী', 'Class Students', lang)}</div>
          <div className="text-2xl font-bold tabular-nums mt-1">{students.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500">{b('সিলেবাস অগ্রগতি', 'Syllabus Progress', lang)}</div>
          <div className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">88%</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500">{b('পারফরম্যান্স', 'Performance', lang)}</div>
          <div className="text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-400 mt-1">{teacher.performanceScore}/100</div>
        </div>
      </div>

      {/* Today's Classes + Start/Complete/Substitute Workflow */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {b("আজকের ক্লাস সেশন (Start → Lesson → Homework → Complete)", "Today's Class Sessions", lang)}
          </h2>
          <span className="text-xs text-slate-500">{b('শুধুমাত্র নির্ধারিত শিক্ষক শুরু করতে পারবেন', 'Authorized Subject Teacher Only', lang)}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {routineSlots.map((slot, index) => {
            const isAssignedToMe = slot.teacherId === teacher.id;
            const prevCompleted = index === 0 || routineSlots[index - 1].status === 'completed';

            return (
              <div key={slot.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono text-blue-700 dark:text-blue-400 font-semibold">
                      Period {slot.period} · {slot.timeRange}
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {b(slot.subjectBn, slot.subjectEn, lang)} — {slot.className}
                    </div>
                    <div className="text-xs text-slate-500">
                      {slot.teacherName} {isAssignedToMe ? b('(আপনার নির্ধারিত ক্লাস)', '(Your Assigned Class)', lang) : ''}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {slot.status === 'completed'
                      ? b('সম্পন্ন', 'Completed', lang)
                      : slot.status === 'in_progress'
                        ? b('চলছে', 'Active', lang)
                        : slot.status === 'sub_requested'
                          ? b('বিকল্প অনুরোধকৃত', 'Sub Requested', lang)
                          : b('নির্ধারিত', 'Scheduled', lang)}
                  </span>
                </div>

                {slot.status === 'in_progress' && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <input
                      type="text"
                      value={topicDraft[slot.id] ?? slot.lessonTopic ?? ''}
                      onChange={(e) => setTopicDraft((p) => ({ ...p, [slot.id]: e.target.value }))}
                      placeholder={b('পাঠের বিষয় (Lesson Topic)...', 'Lesson topic...', lang)}
                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      value={hwDraft[slot.id] ?? slot.homeworkText ?? ''}
                      onChange={(e) => setHwDraft((p) => ({ ...p, [slot.id]: e.target.value }))}
                      placeholder={b('বাড়ির কাজ (Homework)...', 'Assign homework...', lang)}
                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onCompleteClass(
                          slot.id,
                          topicDraft[slot.id] ?? slot.lessonTopic ?? 'অধ্যায় সম্পন্ন',
                          hwDraft[slot.id] ?? slot.homeworkText ?? 'অনুশীলনী সমাধান করবে।'
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                      {b('Complete Class & পরবর্তী পিরিয়ড খুলুন', 'Complete Class', lang)}
                    </button>
                  </div>
                )}

                {slot.status === 'pending' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={!prevCompleted || !isAssignedToMe}
                      onClick={() => onStartClass(slot.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                        prevCompleted && isAssignedToMe
                          ? 'bg-blue-700 text-white cursor-pointer'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 inline mr-1" />
                      {isAssignedToMe ? 'Start Class' : b('অন্য শিক্ষকের ক্লাস', 'Other Teacher Assigned', lang)}
                    </button>
                    {isAssignedToMe && (
                      <button
                        type="button"
                        onClick={() => setSubSlotId(subSlotId === slot.id ? null : slot.id)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 text-amber-800 dark:text-amber-300 cursor-pointer"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                        Request Substitute
                      </button>
                    )}
                  </div>
                )}

                {subSlotId === slot.id && (
                  <div className="flex items-center gap-2 text-xs pt-1">
                    <select
                      value={subReason}
                      onChange={(e) => setSubReason(e.target.value)}
                      className="h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    >
                      <option value="অসুস্থতা (Illness)">অসুস্থতা (Illness)</option>
                      <option value="জরুরি কাজ (Emergency)">জরুরি কাজ (Emergency)</option>
                      <option value="দাপ্তরিক দায়িত্ব (Official Duty)">দাপ্তরিক দায়িত্ব (Official Duty)</option>
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
    </div>
  );
};

interface StudentPortalViewProps {
  activeTab: string;
  onSelectTab?: (tab: string) => void;
  lang: Language;
  student: StudentRecord;
  school?: SchoolRecord;
  routineSlots: RoutineSlot[];
  assignments: AssignmentItem[];
  classworks?: ClassworkItem[];
  studyMaterials?: StudyMaterialItem[];
  gradingRules?: GradingRuleItem[];
  exams: ExamRecord[];
  masterRoutines?: MasterRoutineRecord[];
  examRoutines?: ExamRoutineRecord[];
  officialDocuments?: OfficialDocumentRecord[];
  documentTemplates?: OfficialDocumentTemplate[];
  teachers?: TeacherRecord[];
  notices: NoticeItem[];
  notifications: NotificationItem[];
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
  myChangeRequests: StudentChangeRequest[];
  dailyLessons?: DailyLessonHomeworkItem[];
  onToggleStudentLessonStatus?: (lessonId: string, studentId: string, status: DailyLessonStatus) => void;
  onUpdateAllowedSelfProfile: (studentId: string, patch: StudentAllowedSelfPatch) => void;
  onSubmitImportantChangeRequest: (
    student: StudentRecord,
    payload: {
      fieldKey: StudentImportantFieldKey;
      currentValue: string;
      proposedValue: string;
      reason: string;
    }
  ) => void;
  onOpenPhotoEditor?: () => void;
  settingsCenterElement?: React.ReactNode;
}

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  activeTab,
  onSelectTab,
  lang,
  student,
  school,
  routineSlots,
  assignments,
  classworks = [],
  studyMaterials = [],
  gradingRules = [],
  exams,
  masterRoutines = [],
  examRoutines = [],
  officialDocuments = [],
  documentTemplates = [],
  teachers = [],
  notices,
  notifications,
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
  myChangeRequests,
  dailyLessons = [],
  onToggleStudentLessonStatus,
  onUpdateAllowedSelfProfile,
  onSubmitImportantChangeRequest,
  onOpenPhotoEditor,
  settingsCenterElement,
}) => {
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [selectedMarksheetOpen, setSelectedMarksheetOpen] = useState(false);
  const [editingAllowed, setEditingAllowed] = useState(false);
  const [mobileDraft, setMobileDraft] = useState(student.guardianMobile);
  const [emergencyDraft, setEmergencyDraft] = useState(
    student.emergencyContact ?? student.guardianMobile
  );
  const [addressDraft, setAddressDraft] = useState(student.address ?? '');

  const myAssignments = assignments.filter((a) => a.studentId === student.id);
  const myClassworks = classworks.filter((cw) => cw.className === student.className);
  const exam = pickPrimaryTermOrPublishedExam(exams);
  const myMarks = exam ? exam.entries.filter((e) => e.studentId === student.id) : [];
  const myAttendanceHistory = attendanceHistory.filter((h) => h.studentId === student.id);

  // Strict RBAC isolation: show ONLY notifications addressed to this student or all
  const myStudentNotifications = notifications.filter(
    (n) =>
      (n.roleTarget === 'student' || n.roleTarget === 'all') &&
      (!n.studentId || n.studentId === student.id)
  );

  const handleSaveAllowedUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAllowedSelfProfile(student.id, {
      guardianMobile: mobileDraft,
      emergencyContact: emergencyDraft,
      address: addressDraft,
    });
    setEditingAllowed(false);
  };

  if (activeTab === 'settings' && settingsCenterElement) {
    return <>{settingsCenterElement}</>;
  }

  return (
    <div className="space-y-6">
      {activeTab === 'dashboard' && school && (
        <SchoolCoverBanner
          school={school}
          lang={lang}
          canEditCover={false}
          subtitleBn={`শিক্ষার্থী পোর্টাল · ${student.className} (${student.section}) · রোল ${student.roll}`}
          subtitleEn={`Student Portal · ${student.className} (${student.section}) · Roll ${student.roll}`}
        />
      )}
      {/* Crisp Blue Welcome Hero Banner (Matches Student Portal Reference) */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 rounded-2xl p-5 sm:p-6 text-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="relative shrink-0">
            <img
              src={student.photoUrl ?? AVATARS.studentRahim}
              alt={student.nameEn}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/40 shrink-0"
            />
            {onOpenPhotoEditor && (
              <button
                type="button"
                onClick={onOpenPhotoEditor}
                title={b('ছবি পরিবর্তন / ক্রপ', 'Edit / Crop Photo', lang)}
                className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-white text-blue-700 hover:bg-blue-50 border border-blue-200 flex items-center justify-center shadow-sm cursor-pointer"
              >
                <Camera className="w-3 h-3" />
              </button>
            )}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              {b(`স্বাগতম, ${student.nameBn}!`, `Welcome, ${student.nameEn}!`, lang)}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 mt-0.5">
              {student.schoolNameBn} · {student.className} ({student.section}) · {b('রোল', 'Roll', lang)} {student.roll}
            </p>
            <p className="text-xs font-mono text-sky-100/95 mt-1">
              Permanent ID: {student.permanentId} · Activated: {student.activationCode}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {onOpenPhotoEditor && (
                <button
                  type="button"
                  onClick={onOpenPhotoEditor}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white cursor-pointer shrink-0 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  {b('প্রোফাইল ছবি আপলোড / ক্রপ', 'Edit Profile Photo', lang)}
                </button>
              )}
              <button
                type="button"
                onClick={() => setChangeModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white text-blue-800 hover:bg-blue-50 shadow-xs cursor-pointer shrink-0 transition-colors"
              >
                <FileText className="w-4 h-4" />
                {b('গুরুত্বপূর্ণ Profile পরিবর্তনের আবেদন', 'Request Important Change', lang)}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white cursor-pointer shrink-0 transition-colors"
              >
                <Printer className="w-4 h-4" />
                {b('ডিজিটাল ID কার্ড প্রিন্ট', 'Print Digital ID', lang)}
              </button>
            </div>
          </div>
        </div>

        <StudentBooksIllustration className="hidden lg:block w-56 h-28 shrink-0" />
      </div>

      {/* 9-Tile Quick Actions Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            {b('দ্রুত অ্যাক্সেস (Quick Actions)', 'Quick Access', lang)}
          </h2>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {b('এক ক্লিকে একাডেমিক সেবা', 'One-click academic tools', lang)}
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2.5">
          {[
            { tab: 'classes', labelBn: 'আজকের ক্লাস', labelEn: "Today's Class", icon: BookOpen, tone: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200/70 dark:border-sky-800/60' },
            { tab: 'routine', labelBn: 'আমার রুটিন', labelEn: 'My Routine', icon: CalendarDays, tone: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/60' },
            { tab: 'assignment', labelBn: 'Assignment', labelEn: 'Assignment', icon: ClipboardList, tone: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-800/60' },
            { tab: 'homework', labelBn: 'Homework', labelEn: 'Homework', icon: Home, tone: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/60' },
            { tab: 'classwork', labelBn: 'Classwork', labelEn: 'Classwork', icon: FileText, tone: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200/70 dark:border-teal-800/60' },
            { tab: 'assessment', labelBn: 'Exams', labelEn: 'Exams', icon: Clock, tone: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200/70 dark:border-blue-800/60' },
            { tab: 'results', labelBn: 'Result', labelEn: 'Result', icon: BarChart3, tone: 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border-violet-200/70 dark:border-violet-800/60' },
            { tab: 'notices', labelBn: 'Notice', labelEn: 'Notice', icon: Bell, tone: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200/70 dark:border-rose-800/60' },
            { tab: 'lessons', labelBn: 'Study Materials', labelEn: 'Study Materials', icon: FolderOpen, tone: 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-200/70 dark:border-cyan-800/60' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.tab}
                type="button"
                onClick={() => onSelectTab?.(item.tab)}
                className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all hover:shadow-xs cursor-pointer text-center ${item.tone}`}
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

      {/* Live Class Status Banner (Privacy-safe: Status Only) */}
      <StudentLiveClassBanner lang={lang} student={student} routineSlots={routineSlots} />

      {activeTab === 'notifications' && (
        <NotificationCenterPanel
          lang={lang}
          role="student"
          schoolId={student.schoolId}
          studentId={student.id}
          notifications={notifications}
          preferences={notificationPreferences}
          lastLoginIso={lastLoginIso}
          onUpdatePreferences={onUpdateNotificationPreferences ?? (() => {})}
          onMarkRead={onMarkNotificationRead ?? (() => {})}
          onMarkAllRead={onMarkAllNotificationsRead ?? (() => {})}
          onTogglePin={onTogglePinNotification ?? (() => {})}
          onNavigateFromNotification={
            onNavigateFromNotification ?? ((item) => onSelectTab?.(item.targetTab ?? 'dashboard'))
          }
          onResetLastVisitIso={onResetLastVisitIso ?? (() => {})}
        />
      )}

      {activeTab === 'notices' && (
        <NoticeCommunicationCenter
          lang={lang}
          role="student"
          userId={student.id}
          actorName={student.nameBn}
          schoolId={student.schoolId}
          studentClass={student.className}
          notices={notices}
          onCreateNotice={() => {}}
          onEditNotice={() => {}}
          onTransitionNoticeStatus={() => {}}
          onMarkNoticeRead={onMarkNoticeRead ?? (() => {})}
        />
      )}

      {/* Today's Lessons Full Tab */}
      {activeTab === 'todays_lessons' && (
        <TodaysLessonsPanel
          role="student"
          lang={lang}
          schoolId={student.schoolId}
          dailyLessons={dailyLessons}
          student={student}
          onToggleStudentLessonStatus={onToggleStudentLessonStatus}
        />
      )}

      {/* Dashboard Bento Academic Summary, Notifications & Today's Lessons */}
      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          {/* Bento Academic Summary Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {b('আমার উপস্থিতি ও একাডেমিক সারসংক্ষেপ', 'My Attendance & Academic Summary', lang)}
                </h2>
                <button
                  type="button"
                  onClick={() => onSelectTab?.('progress')}
                  className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {b('বিস্তারিত দেখুন →', 'View details →', lang)}
                </button>
              </div>
              <AttendanceDonutChart
                centerValue={`${student.attendancePct}%`}
                centerLabel={b('উপস্থিতির হার', 'Attendance Rate', lang)}
                segments={[
                  { label: b('উপস্থিত', 'Present', lang), value: 48, color: '#059669' },
                  { label: b('অনুপস্থিত', 'Absent', lang), value: 2, color: '#DC2626' },
                  { label: b('দেরি', 'Late', lang), value: 1, color: '#D97706' },
                  { label: b('ছুটি', 'Leave', lang), value: 1, color: '#2563EB' },
                ]}
              />
            </div>

            <div className="bg-gradient-to-br from-sky-50 via-blue-50 to-emerald-50 dark:from-slate-900 dark:via-blue-950/30 dark:to-emerald-950/20 border border-blue-200/80 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-700 text-white text-[11px] font-bold">
                    {b('ফলাফল ও পরীক্ষা স্পটলাইট', 'Results & Exam Spotlight', lang)}
                  </span>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {b('তুমি আরও ভালো করতে পারবে!', 'Keep up the steady progress!', lang)}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {exam
                      ? `${b(exam.titleBn, exam.titleEn, lang)} · ${b('সর্বশেষ GPA:', 'Latest GPA:', lang)} ${exam.status === 'published' ? (student.gpa ?? '4.88 (A)') : b('প্রকাশের অপেক্ষায়', 'Pending publication', lang)}`
                      : b('নিয়মিত পড়াশোনা করো এবং নিজের লক্ষ্যে এগিয়ে যাও।', 'Stay consistent with daily lessons and assignments.', lang)}
                  </p>
                </div>
                <AchievementTrophyIllustration className="w-20 h-16 shrink-0" />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {exam && (
                  <button
                    type="button"
                    onClick={() => setSelectedMarksheetOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    {b('মার্কশিট দেখুন →', 'Open Marksheet →', lang)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSelectTab?.('results')}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold cursor-pointer"
                >
                  {b('সকল ফলাফল ও মেধাক্রম', 'Results & Ranking', lang)}
                </button>
              </div>
            </div>
          </div>

          <DashboardNotificationPreview
            lang={lang}
            role="student"
            schoolId={student.schoolId}
            studentId={student.id}
            notifications={notifications}
            preferences={notificationPreferences}
            lastLoginIso={lastLoginIso}
            onOpenNotificationCenter={() => onSelectTab?.('notifications')}
            onNavigateFromNotification={
              onNavigateFromNotification ?? ((item) => onSelectTab?.(item.targetTab ?? 'dashboard'))
            }
          />
          <TodaysLessonsPanel
            role="student"
            lang={lang}
            schoolId={student.schoolId}
            dailyLessons={dailyLessons}
            student={student}
            onToggleStudentLessonStatus={onToggleStudentLessonStatus}
            compactSummaryOnly={true}
          />
        </div>
      )}

      {/* Student Dedicated Tabs (Academics / Progress / Ranking / Results / Documents / Lessons / Homework / Classwork / Routine) */}
      {(activeTab === 'academics' ||
        activeTab === 'progress' ||
        activeTab === 'ranking' ||
        activeTab === 'results' ||
        activeTab === 'assessment' ||
        activeTab === 'documents' ||
        activeTab === 'lessons' ||
        activeTab === 'classwork' ||
        activeTab === 'homework' ||
        activeTab === 'assignment' ||
        activeTab === 'classes' ||
        activeTab === 'routine') && (
        <div className="space-y-6">
          {activeTab === 'routine' && (
            <div className="space-y-5">
              <RoutineManagementSystem
                lang={lang}
                role="student"
                school={school}
                actorName={student.nameBn}
                routines={masterRoutines}
                teachers={[]}
                teacherAssignments={[]}
                studentClass={student.className}
                studentSection={student.section}
                studentName={student.nameBn}
                onUpdateRoutines={() => {}}
              />
              {school && (
                <ExamRoutineSystem
                  lang={lang}
                  role="student"
                  school={school}
                  actorName={student.nameBn}
                  studentClass={student.className}
                  studentSection={student.section}
                  teachers={teachers}
                  exams={exams}
                  examRoutines={examRoutines}
                />
              )}
            </div>
          )}
          {(activeTab === 'academics' || activeTab === 'progress' || activeTab === 'ranking' || activeTab === 'results' || activeTab === 'assessment') && (
            <div className="space-y-4">
              {activeTab === 'assessment' && (
                <>
                  <ExaminationManagementPanel
                    lang={lang}
                    role="student"
                    schoolId={student.schoolId}
                    actorName={student.nameBn}
                    studentClass={student.className}
                    studentId={student.id}
                    schools={school ? [school] : []}
                    students={[student]}
                    exams={exams}
                    onCreateLocalExam={() => {}}
                    onToggleCentralTermPublish={() => {}}
                    onUpdateExamMark={() => {}}
                  />
                  {school && (
                    <ExamRoutineSystem
                      lang={lang}
                      role="student"
                      school={school}
                      actorName={student.nameBn}
                      studentClass={student.className}
                      studentSection={student.section}
                      teachers={teachers}
                      exams={exams}
                      examRoutines={examRoutines}
                    />
                  )}
                </>
              )}
              {exam && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{b(exam.titleBn, exam.titleEn, lang)}</div>
                    <div className="text-slate-500">
                      {exam.status === 'published'
                        ? b('ফলাফল প্রকাশিত হয়েছে — বিষয়ভিত্তিক ও মেধাক্রম পজিশন সহ দেখুন।', 'Result published — view Subject & Overall merit positions.', lang)
                        : b('ফলাফল এখনো প্রকাশিত হয়নি।', 'Result pending publication by Head Teacher.', lang)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMarksheetOpen(true)}
                    className="px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
                  >
                    📄 {b('View Marksheet', 'View Marksheet', lang)}
                  </button>
                </div>
              )}
              <StudentAcademicProgressPanel
                lang={lang}
                students={[student]}
                selectedStudentId={student.id}
                allowStudentSwitch={false}
                exams={exams}
                assignments={assignments}
                classworks={classworks}
                gradingRules={gradingRules}
              />
            </div>
          )}

          {(activeTab === 'academics' || activeTab === 'classwork' || activeTab === 'lessons' || activeTab === 'homework' || activeTab === 'assignment') && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {b('আজকের Classwork (শ্রেণির কাজ)', 'Daily Classwork (In-Class)', lang)}
                </h2>
                {myClassworks.map((cw) => {
                  const st = cw.studentStatuses.find((x) => x.studentId === student.id);
                  return (
                    <div key={cw.id} className="py-2 border-b last:border-b-0 border-slate-100 dark:border-slate-800 flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{b(cw.titleBn, cw.titleEn, lang)}</div>
                        <div className="text-slate-500">{b(cw.subjectBn, cw.subjectEn, lang)} · {cw.date}</div>
                        {st?.feedback && <div className="text-blue-700 dark:text-blue-400 mt-0.5">Feedback: {st.feedback}</div>}
                      </div>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">{st?.status ?? 'pending'}</span>
                    </div>
                  );
                })}
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {b('Study Materials ও পাঠ সহায়িকা', 'Study Materials & Notes', lang)}
                </h2>
                {studyMaterials.map((sm) => (
                  <div key={sm.id} className="py-2 border-b last:border-b-0 border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{b(sm.titleBn, sm.titleEn, lang)}</div>
                      <div className="text-slate-500">{b(sm.subjectBn, sm.subjectEn, lang)} · {sm.materialType}</div>
                    </div>
                    <span className="font-mono text-blue-700 dark:text-blue-400">{sm.uploadedDate}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {school && (activeTab === 'academics' || activeTab === 'documents' || activeTab === 'results') && (
            <div className="space-y-5">
              {activeTab === 'documents' && (
                <StudentQrIdCardPanel lang={lang} student={student} school={school} />
              )}
              <AcademicCertificatesDocsPanel
                lang={lang}
                school={school}
                students={[student]}
                exams={exams}
                classworks={classworks}
                assignments={assignments}
                gradingRules={gradingRules}
                lockedStudentId={student.id}
              />
              {activeTab === 'documents' && (
                <OfficialDocumentSystem
                  lang={lang}
                  role="student"
                  school={school}
                  actorName={student.nameBn}
                  students={[student]}
                  teachers={teachers}
                  exams={exams}
                  documents={officialDocuments.filter((d) => d.targetEntityId === student.id || d.targetPermanentId === student.permanentId)}
                  templates={documentTemplates}
                  onUpdateDocuments={() => {}}
                  canGenerate={false}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500">{b('আমার উপস্থিতি', 'My Attendance', lang)}</div>
          <div className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
            {student.attendancePct}%
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500">{b('বাকি বাড়ির কাজ', 'Pending Homework', lang)}</div>
          <div className="text-2xl font-bold tabular-nums text-amber-600 mt-1">
            {myAssignments.filter((a) => a.status === 'pending').length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500">{b('সর্বশেষ GPA', 'Latest GPA', lang)}</div>
          <div className="text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-400 mt-1">
            {exam?.status === 'published' ? (student.gpa ?? '4.88 (A)') : b('প্রকাশিত নয়', 'Pending', lang)}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="text-xs text-slate-500">Digital QR ID</div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <QrCode className="w-6 h-6 text-slate-900 dark:text-white shrink-0" />
              <span className="text-xs font-mono font-semibold truncate">{student.permanentId}</span>
            </div>
            <button
              type="button"
              data-testid="student-open-qr-generator-btn"
              onClick={() => onSelectTab?.('documents')}
              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
            >
              {b('QR কোড দেখুন', 'Open QR ID', lang)}
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'profile' && school && (
        <StudentQrIdCardPanel lang={lang} student={student} school={school} />
      )}

      {/* Own Profile View + Allowed Self Update + Important Change Request Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                {b('আমার প্রোফাইল ও অনুমোদিত তথ্য হালনাগাদ', 'My Profile & Allowed Self-Update', lang)}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {b(
                  'আপনি শুধুমাত্র নিজের প্রোফাইল দেখতে ও অনুমোদিত যোগাযোগ তথ্য আপডেট করতে পারবেন।',
                  'You can view only your own profile and update allowed contact details.',
                  lang
                )}
              </p>
            </div>
            {!editingAllowed && (
              <button
                type="button"
                onClick={() => {
                  setMobileDraft(student.guardianMobile);
                  setEmergencyDraft(student.emergencyContact ?? student.guardianMobile);
                  setAddressDraft(student.address ?? '');
                  setEditingAllowed(true);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {b('✏️ যোগাযোগ তথ্য আপডেট', 'Edit Allowed Contact', lang)}
              </button>
            )}
          </div>

          {!editingAllowed ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="text-slate-500">{b('নাম (বাংলা / ইংরেজি)', 'Name (BN / EN)', lang)}</div>
                <div className="font-semibold text-slate-900 dark:text-white mt-0.5">{student.nameBn}</div>
                <div className="text-slate-600 dark:text-slate-300">{student.nameEn}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="text-slate-500">{b('জন্মনিবন্ধন ও রক্তের গ্রুপ', 'Birth Reg & Blood', lang)}</div>
                <div className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5">{student.birthRegNo}</div>
                <div className="text-red-600 dark:text-red-400 font-semibold">{student.bloodGroup}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="text-slate-500">{b('পিতা ও মাতার নাম', 'Parents', lang)}</div>
                <div className="font-medium text-slate-900 dark:text-white mt-0.5">{student.fatherName}</div>
                <div className="text-slate-600 dark:text-slate-300">{student.motherName}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="text-slate-500">{b('যোগাযোগ ও ঠিকানা (অনুমোদিত আপডেট)', 'Contact & Address (Editable)', lang)}</div>
                <div className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5">
                  {student.guardianMobile} · {student.emergencyContact ?? student.guardianMobile}
                </div>
                <div className="text-slate-600 dark:text-slate-300">{student.address ?? '—'}</div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveAllowedUpdate} className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{b('অভিভাবকের মোবাইল নম্বর', 'Guardian Mobile', lang)}</label>
                  <input
                    type="tel"
                    value={mobileDraft}
                    onChange={(e) => setMobileDraft(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('জরুরি যোগাযোগ নম্বর', 'Emergency Contact', lang)}</label>
                  <input
                    type="tel"
                    value={emergencyDraft}
                    onChange={(e) => setEmergencyDraft(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('বর্তমান ঠিকানা', 'Current Address', lang)}</label>
                <input
                  type="text"
                  value={addressDraft}
                  onChange={(e) => setAddressDraft(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAllowed(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                >
                  {b('বাতিল', 'Cancel', lang)}
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold cursor-pointer"
                >
                  {b('অনুমোদিত তথ্য সংরক্ষণ করুন', 'Save Allowed Info', lang)}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Own Important Profile Change Request Tracker */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              {b('আমার প্রোফাইল পরিবর্তনের আবেদনসমূহ', 'My Important Profile Change Requests', lang)}
            </h2>
            <button
              type="button"
              onClick={() => setChangeModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
            >
              {b('+ নতুন আবেদন', '+ New Request', lang)}
            </button>
          </div>
          {myChangeRequests.length === 0 ? (
            <p className="text-slate-500 py-3">
              {b(
                'নাম, জন্মতারিখ, জন্মনিবন্ধন বা পিতা-মাতার তথ্য সংশোধনের প্রয়োজন হলে আবেদন করুন।',
                'No requests submitted yet. Use "+ New Request" for critical identity updates.',
                lang
              )}
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {myChangeRequests.map((req) => (
                <div key={req.id} className="py-2.5 flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {b(req.titleBn, req.titleEn, lang)}
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      {req.currentValue} → <span className="font-semibold text-blue-700 dark:text-blue-400">{req.proposedValue}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">{req.submittedAt} · {req.reason}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded border text-[11px] font-semibold shrink-0 ${
                      req.status === 'approved'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        : req.status === 'rejected'
                          ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content Grid: Routine & Marksheet (Shown on dashboard) */}
      {activeTab !== 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Routine */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-700" />
              {b('আজকের ক্লাস রুটিন ও বাড়ির কাজ', "Today's Class Routine & Homework", lang)}
            </h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {routineSlots.map((slot) => (
                <div key={slot.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {slot.timeRange} · {b(slot.subjectBn, slot.subjectEn, lang)}
                    </div>
                    <div className="text-slate-500">{slot.teacherName} · Room {slot.room}</div>
                    {slot.homeworkText && (
                      <div className="text-emerald-700 dark:text-emerald-400 mt-0.5">{slot.homeworkText}</div>
                    )}
                  </div>
                  <span
                    className={`font-semibold whitespace-nowrap shrink-0 ${
                      slot.status === 'completed'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : slot.status === 'in_progress'
                          ? 'text-blue-700 dark:text-blue-400'
                          : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {slot.status === 'completed'
                      ? b('সম্পন্ন', 'Completed', lang)
                      : slot.status === 'in_progress'
                        ? b('চলমান', 'In Progress', lang)
                        : slot.status === 'sub_requested'
                          ? b('প্রতিনিধি নির্ধারিত', 'Substitute', lang)
                          : slot.status === 'homework_pending'
                            ? b('বাড়ির কাজ বাকি', 'Homework Due', lang)
                            : b('নির্ধারিত', 'Scheduled', lang)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Marksheet & Progress */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-700" />
                {b('নম্বরপত্র ও ফলাফল', 'Marksheet & Results', lang)}
              </h2>
              {exam && (
                <button
                  type="button"
                  onClick={() => setSelectedMarksheetOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                >
                  📄 {b('View Marksheet', 'View Marksheet', lang)}
                </button>
              )}
            </div>
            {!exam || exam.status !== 'published' ? (
              <p className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                {b('ফলাফল এখনো প্রকাশিত হয়নি।', 'Result not published yet.', lang)}
              </p>
            ) : (
              <div className="space-y-2.5 text-xs">
                {myMarks.map((m) => {
                  const total = m.written + m.oral + m.continuous;
                  const g = calculateBDGradeAndGPA(total, m.fullMarks, m.passMarks);
                  return (
                    <ProgressMeter
                      key={m.subjectEn}
                      label={`${b(m.subjectBn, m.subjectEn, lang)} (${g.letterGrade})`}
                      value={g.totalObtained}
                      max={m.fullMarks}
                      detailText={`${g.totalObtained}/${m.fullMarks} · GPA ${g.gpa.toFixed(1)}`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Personal Notifications & School Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2.5">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-sky-700 dark:text-sky-400" />
            {b('ব্যক্তিগত নোটিফিকেশন ও আবেদন আপডেট', 'Personal Alerts & Request Updates', lang)}
          </h2>
          {myStudentNotifications.length === 0 ? (
            <p className="text-xs text-slate-500">{b('কোনো নতুন নোটিফিকেশন নেই।', 'No new alerts.', lang)}</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {myStudentNotifications.slice(0, 5).map((n) => (
                <div key={n.id} className="text-xs py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">{b(n.titleBn, n.titleEn, lang)}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">{n.time}</span>
                  </div>
                  <div className="text-slate-500 mt-0.5">{b(n.messageBn, n.messageEn, lang)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2.5">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">{b('বিদ্যালয়ের নোটিশ', 'School Notices', lang)}</h2>
          {notices
            .filter((n) => !n.schoolId || n.schoolId === student.schoolId)
            .slice(0, 4)
            .map((n) => (
              <div key={n.id} className="text-xs border-b last:border-b-0 border-slate-100 dark:border-slate-800 pb-2 last:pb-0">
                <div className="font-semibold text-slate-900 dark:text-white">{b(n.titleBn, n.titleEn, lang)}</div>
                <div className="text-slate-500">{b(n.bodyBn, n.bodyEn, lang)}</div>
              </div>
            ))}
          {myAttendanceHistory.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {b('সাম্প্রতিক ID স্ক্যান উপস্থিতি', 'Recent ID Scan Attendance', lang)}
              </div>
              <div className="flex flex-wrap gap-2">
                {myAttendanceHistory.slice(0, 4).map((h) => (
                  <span
                    key={h.id}
                    className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-[11px] font-mono"
                  >
                    {h.dateIso} · {h.status}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <StudentProfileChangeRequestModal
        open={changeModalOpen}
        student={student}
        lang={lang}
        onClose={() => setChangeModalOpen(false)}
        onSubmit={(payload) => onSubmitImportantChangeRequest(student, payload)}
      />

      {exam && (
        <StudentMarksheetModal
          open={selectedMarksheetOpen}
          onClose={() => setSelectedMarksheetOpen(false)}
          lang={lang}
          student={student}
          school={school}
          exam={exam}
          gradingRules={gradingRules.length > 0 ? gradingRules : DEFAULT_NCTB_GRADING_RULES}
        />
      )}
    </div>
  );
};
