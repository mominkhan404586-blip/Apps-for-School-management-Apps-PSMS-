import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  FileText,
  GraduationCap,
  HeartPulse,
  Lock,
  Megaphone,
  Plus,
  QrCode,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  UserPlus,
  Users,
  Wallet,
  AlertCircle,
  Printer,
  Database,
  Bell,
  PauseCircle,
  RotateCcw,
} from 'lucide-react';
import type {
  AcademicCalendarEvent,
  AcademicCancelClassReason,
  AcademicModuleId,
  AcademicSubjectConfig,
  AcademicYearRecord,
  AssignmentItem,
  AuditLogEntry,
  ClassSectionRoomConfig,
  ClassTestQuizItem,
  ClassworkItem,
  CurriculumUnit,
  DailyLessonHomeworkItem,
  ExamRecord,
  ExamRoutineRecord,
  ExamScheduleItem,
  ExtraAcademicItem,
  FeeRecord,
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
  PermissionKey,
  QuestionBankItem,
  ResultAuditEntry,
  RoutineSlot,
  SchoolRecord,
  StudentAttendanceHistoryEntry,
  StudentChangeRequest,
  StudentRecord,
  StudentStatus,
  StudyMaterialItem,
  SubjectResultSubmission,
  SubstitutePermissionRecord,
  SubstituteReason,
  TeacherRecord,
  TeacherSchoolAssignment,
  TeacherSchoolPermissions,
  TeacherSubjectAssignment,
} from '../types';
import {
  calculateBDGradeAndGPA,
  calculateBMI,
  computeStudentMeritList,
  filterStudents,
  studentsToCsv,
} from '../utils/rbacAndGrading';
import { getSchoolTypeConfig } from '../utils/schoolConfigAndAddress';
import { b, tr } from '../i18n/translations';
import { AttendanceDonutChart, ClassBarChart, ProgressMeter } from './Charts';
import type { ConfirmDialogState } from './Modals';
import { StudentDirectoryPanel } from './StudentDirectoryPanel';
import type { StudentEditPatch } from '../utils/studentLifecycle';
import { AcademicManagementHub } from './AcademicManagementHub';
import { AcademicCertificatesDocsPanel } from './AcademicProgressAndDocsPanel';
import { SchoolAdminResultManagementPanel } from './ResultGovernancePanels';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type CreateNoticePayload,
} from '../utils/notificationAndNoticeEngine';
import {
  pickPrimaryTermOrPublishedExam,
  type CreateLocalExamPayload,
} from '../utils/examGovernanceEngine';
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
import { sanitizeActorDisplayForRole } from '../utils/adminAndTeacherIdentityEngine';
import {
  AchievementTrophyIllustration,
  SchoolCampusIllustration,
} from './PortalIllustrations';
import { SchoolCoverBanner } from './SchoolCoverBanner';

interface SchoolAdminViewsProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  lang: Language;
  searchQuery: string;
  ownSchool: SchoolRecord;
  allSchools: SchoolRecord[];
  onSwitchActiveSchool: (schoolId: string) => void;
  students: StudentRecord[];
  teachers: TeacherRecord[];
  routineSlots: RoutineSlot[];
  kioskScans: KioskScanEvent[];
  exams: ExamRecord[];
  fees: FeeRecord[];
  notices: NoticeItem[];
  notifications: NotificationItem[];
  auditLogs: AuditLogEntry[];
  onOpenAddStudent: () => void;
  onInspectStudent: (student: StudentRecord) => void;
  studentRequests: StudentChangeRequest[];
  onEditStudent: (studentId: string, patch: StudentEditPatch) => void;
  onTransferStudent: (studentId: string, targetSchoolId: string, reason: string) => void;
  onUpdateStudentStatus: (studentId: string, status: StudentStatus, reason: string) => void;
  onSendStudentNotice: (student: StudentRecord, notice: NoticeItem) => void;
  onVerifyStudentDocument: (studentId: string, docId: string, verified: boolean) => void;
  onProcessStudentRequest: (
    reqId: string,
    decision: 'approved' | 'rejected' | 'under_review' | 'pending',
    note: string
  ) => void;
  onOpenConfirm: (cfg: Omit<ConfirmDialogState, 'open'>) => void;
  onUpdateRoutineSlot: (slotId: string, patch: Partial<RoutineSlot>, unlockNext?: boolean) => void;
  onSimulateKioskScan: (studentId: string, isLate: boolean) => void;
  onToggleExamStatus: (examId: string, status: ExamRecord['status'], reason: string) => void;
  onUpdateExamMark: (examId: string, studentId: string, subjectEn: string, written: number, mcq?: number) => void;
  onCollectFee: (feeId: string, method: FeeRecord['method'], ref: string) => void;
  onAddNotice: (notice: NoticeItem) => void;
  onPromoteAllEligible: () => void;
  onApproveTeacher: (teacherId: string) => void;
  onRequestReactivation: (schoolId: string, note: string) => void;
  hasPermission?: (key: PermissionKey) => boolean;
  onVerifyStudent?: (studentId: string, note: string) => void;
  onReissueStudentId?: (studentId: string) => void;
  // Extended Academic Management Props
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
  externalAcademicModule?: AcademicModuleId;
  favoriteModules?: AcademicModuleId[];
  onToggleFavorite?: (moduleId: AcademicModuleId) => void;
  recentModules?: AcademicModuleId[];
  onRecordRecent?: (moduleId: AcademicModuleId) => void;
  // Notification, Auto ID Scanner, Notice & Exam Modules
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
  onUpdateMasterRoutines?: (next: MasterRoutineRecord[], toastMsg?: string) => void;
  // Multi-School Teacher Joining, Official Docs, Exam Routine & Notice Images
  teacherSchoolAssignments?: TeacherSchoolAssignment[];
  onReviewTeacherJoinApplication?: (
    assignmentId: string,
    decision: 'approved' | 'rejected',
    permissions?: Partial<TeacherSchoolPermissions>,
    assignedClasses?: string[],
    assignedSubjects?: string[]
  ) => void;
  onToggleTeacherAssignmentStatus?: (
    assignmentId: string,
    nextStatus: 'Active' | 'Suspended' | 'Inactive'
  ) => void;
  officialDocuments?: OfficialDocumentRecord[];
  documentTemplates?: OfficialDocumentTemplate[];
  onUpdateOfficialDocuments?: (next: OfficialDocumentRecord[], toast?: string) => void;
  examRoutines?: ExamRoutineRecord[];
  onUpdateExamRoutines?: (next: ExamRoutineRecord[], toast?: string) => void;
  maxNoticeImages?: number;
  onUpdateMaxNoticeImages?: (n: number) => void;
  onUpdateNoticeImages?: (
    noticeId: string,
    nextImages: NoticeImageAttachment[],
    actionType: 'Image Added' | 'Image Removed' | 'Image Replaced',
    summary: string
  ) => void;
  isSchoolLoginLocked?: boolean;
  onOpenCoverGallery?: () => void;
  onOpenBannerCrop?: () => void;
  onOpenPhotoEditor?: () => void;
  onEditStudentPhoto?: (student: StudentRecord) => void;
  onEditTeacherPhoto?: (teacher: TeacherRecord) => void;
  settingsCenterElement?: React.ReactNode;
}

export const SchoolAdminViews: React.FC<SchoolAdminViewsProps> = ({
  activeTab,
  onSelectTab,
  lang,
  searchQuery,
  ownSchool,
  allSchools,
  onSwitchActiveSchool,
  students,
  teachers,
  routineSlots,
  kioskScans,
  exams,
  fees,
  notices,
  notifications,
  auditLogs,
  onOpenAddStudent,
  onInspectStudent,
  studentRequests,
  onEditStudent,
  onTransferStudent,
  onUpdateStudentStatus,
  onSendStudentNotice,
  onVerifyStudentDocument,
  onProcessStudentRequest,
  onOpenConfirm,
  onUpdateRoutineSlot,
  onSimulateKioskScan,
  onToggleExamStatus,
  onUpdateExamMark,
  onCollectFee,
  onAddNotice,
  onPromoteAllEligible,
  onApproveTeacher,
  onRequestReactivation,
  hasPermission,
  onVerifyStudent,
  onReissueStudentId,
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
  dailyLessons = [],
  substitutePermissions = [],
  subjectSubmissions = [],
  resultAuditLogs = [],
  onReviewSubstitutePermission,
  onCancelClassSlot,
  onRestoreClassSlot,
  onSendDelayedTeacherAlert,
  onTogglePublishResult,
  externalAcademicModule,
  favoriteModules,
  onToggleFavorite,
  recentModules,
  onRecordRecent,
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
  onUpdateMasterRoutines,
  teacherSchoolAssignments = [],
  onReviewTeacherJoinApplication,
  onToggleTeacherAssignmentStatus,
  officialDocuments = [],
  documentTemplates = [],
  onUpdateOfficialDocuments,
  examRoutines = [],
  onUpdateExamRoutines,
  maxNoticeImages = 4,
  onUpdateMaxNoticeImages,
  onUpdateNoticeImages,
  isSchoolLoginLocked = false,
  onOpenCoverGallery,
  onOpenBannerCrop,
  onOpenPhotoEditor,
  onEditStudentPhoto,
  onEditTeacherPhoto,
  settingsCenterElement,
}) => {
  const [classFilter, setClassFilter] = useState('all');
  const [payMethod, setPayMethod] = useState<FeeRecord['method']>('bKash');
  const [smsLog] = useState([
    { id: 'sms-1', target: 'সকল অভিভাবক (২৪৮ জন)', message: 'আগামী ২০ নভেম্বর বার্ষিক পরীক্ষা শুরু।', status: 'Delivered (99.2%)', time: 'আজ সকাল ১০:০০' },
    { id: 'sms-2', target: 'অনুপস্থিত শিক্ষার্থীর অভিভাবক (১২ জন)', message: 'আপনার সন্তান আজ বিদ্যালয়ে অনুপস্থিত।', status: 'Delivered (100%)', time: 'আজ সকাল ০৯:৪৫' },
  ]);

  const typeConfig = getSchoolTypeConfig(ownSchool.schoolType, ownSchool.approvedClasses);
  const allowedClasses = typeConfig.defaultClasses;
  const effectiveClassFilter = classFilter === 'all' || allowedClasses.includes(classFilter) ? classFilter : 'all';
  const filteredStudents = filterStudents(students, searchQuery, effectiveClassFilter);

  const classDistributionData = allowedClasses.slice(0, 6).map((cls, idx) => {
    const actualCount = students.filter((s) => s.className === cls).length;
    return {
      label: cls,
      value: actualCount > 0 ? actualCount * 18 + 20 : 38 + ((idx * 7) % 19),
    };
  });

  const downloadCsv = () => {
    const csv = studentsToCsv(filteredStudents);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ownSchool.code}-students.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (activeTab === 'settings' && settingsCenterElement) {
    return <>{settingsCenterElement}</>;
  }

  // Dashboard View
  if (activeTab === 'dashboard') {
    return (
      <div className="flex flex-col gap-6">
        {/* School Type & Active School Isolation Switcher */}
        <div className="order-5 md:order-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-0.5 text-xs">
            <div className="font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
              <span>{b('সক্রিয় স্কুল কনফিগারেশন:', 'Active School Configuration:', lang)}</span>
              <span className="font-mono text-blue-700 dark:text-blue-400">
                school_type = {ownSchool.schoolType}
              </span>
              <span>· {b(typeConfig.labelBn, typeConfig.labelEn, lang)}</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              {b(typeConfig.excludedDescriptionBn, typeConfig.excludedDescriptionEn, lang)}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0 w-full lg:w-auto text-xs">
            {isSchoolLoginLocked ? (
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {b(
                    `সুরক্ষিত বিদ্যালয় লগইন: ${ownSchool.nameBn} (${ownSchool.schoolPublicId ?? ownSchool.code})`,
                    `Locked to Authenticated School: ${ownSchool.nameEn} (${ownSchool.schoolPublicId ?? ownSchool.code})`,
                    lang
                  )}
                </span>
              </div>
            ) : (
              <>
                <label htmlFor="school-admin-switcher" className="font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0">
                  {b('স্কুল পরিবর্তন (টেস্ট):', 'Switch School:', lang)}
                </label>
                <select
                  id="school-admin-switcher"
                  value={ownSchool.id}
                  onChange={(e) => {
                    setClassFilter('all');
                    onSwitchActiveSchool(e.target.value);
                  }}
                  className="h-9 px-2.5 w-full sm:w-auto max-w-full min-w-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold outline-none cursor-pointer"
                >
                  {allSchools.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.nameBn} ({sc.schoolPublicId ?? sc.code} · {sc.schoolType})
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {/* School Governance Alerts: Temporary Suspension / Revision Feedback / Deactivation */}
        {ownSchool.status === 'suspended' && (
          <div className="order-5 md:order-none bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <PauseCircle className="w-4 h-4" />
                {b('বিদ্যালয় সাময়িকভাবে নিষ্ক্রিয় (Temporary Suspended)', 'School Temporarily Suspended', lang)}
              </div>
              {ownSchool.suspensionDetails && (
                <div className="text-amber-800 dark:text-amber-300">
                  {ownSchool.suspensionDetails.reason} · {b('শুরু:', 'Start:', lang)} {ownSchool.suspensionDetails.startDate} ·{' '}
                  {b('সম্ভাব্য চালু:', 'Expected Resume:', lang)} {ownSchool.suspensionDetails.expectedResumeDate}
                </div>
              )}
            </div>
            {ownSchool.suspensionDetails?.reactivationRequested ? (
              <span className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-semibold">
                ✓ {b('পুনরায় সক্রিয় করার আবেদন পাঠানো হয়েছে', 'Reactivation Request Submitted', lang)}
              </span>
            ) : (
              <button
                type="button"
                onClick={() =>
                  onOpenConfirm({
                    title: b('পুনরায় সক্রিয় করার আবেদন', 'Request School Reactivation', lang),
                    message: b(
                      'কেন্দ্রীয় প্রশাসনের কাছে বিদ্যালয়টি পুনরায় সক্রিয় করার আবেদন ও ব্যাখ্যা পাঠান:',
                      'Submit reactivation request & compliance explanation to Central Admin:',
                      lang
                    ),
                    confirmLabel: b('আবেদন পাঠান', 'Submit Request', lang),
                    requireReason: true,
                    onConfirm: (note) => onRequestReactivation(ownSchool.id, note),
                  })
                }
                className="px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold whitespace-nowrap cursor-pointer"
              >
                {b('পুনরায় সক্রিয় করার আবেদন', 'Request Reactivation', lang)}
              </button>
            )}
          </div>
        )}

        {ownSchool.status === 'revision_requested' && ownSchool.revisionNote && (
          <div className="order-5 md:order-none bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-4 text-xs space-y-1">
            <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" />
              {b('কেন্দ্রীয় প্রশাসন থেকে সংশোধনের জন্য ফেরত পাঠানো হয়েছে', 'Application Returned for Revision', lang)}
            </div>
            <div className="text-amber-800 dark:text-amber-300">{ownSchool.revisionNote}</div>
          </div>
        )}

        {(ownSchool.status === 'deactivated' || ownSchool.status === 'archived') && (
          <div className="order-5 md:order-none bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-xl p-4 text-xs space-y-1">
            <div className="font-bold text-red-900 dark:text-red-200">
              {ownSchool.status === 'archived'
                ? b('এই বিদ্যালয়টি কেন্দ্রীয়ভাবে আর্কাইভ করা হয়েছে (Archived)', 'School Archived by Central Admin', lang)
                : b('এই বিদ্যালয়ের নিবন্ধন স্থায়ীভাবে বাতিল করা হয়েছে (Permanent Deactivated)', 'School Permanently Deactivated', lang)}
            </div>
            {ownSchool.deactivationDetails && (
              <div className="text-red-800 dark:text-red-300">{ownSchool.deactivationDetails.reason}</div>
            )}
          </div>
        )}

        {/* 10-Tile Quick Actions Strip across top (Desktop unchanged; Mobile order-3 renders primary 6) */}
        <section
          aria-label="School Quick Actions Strip"
          data-testid="dashboard-quick-actions-section"
          className="order-3 md:order-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs"
        >
          <div className="grid grid-cols-2 sm:grid-cols-5 xl:grid-cols-10 gap-2">
            {[
              { labelBn: 'নতুন শিক্ষার্থী', labelEn: 'New Student', icon: UserPlus, bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400', action: onOpenAddStudent },
              { labelBn: 'শিক্ষক প্যানেল', labelEn: 'Teachers', icon: Users, bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400', action: () => onSelectTab('teachers') },
              { labelBn: 'নতুন Assignment', labelEn: 'Assignments', icon: FileText, bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400', action: () => onSelectTab('lessons') },
              { labelBn: 'Notice তৈরি', labelEn: 'Create Notice', icon: Megaphone, bg: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400', action: () => onSelectTab('notices') },
              { labelBn: 'আজকের রুটিন', labelEn: 'Today Routine', icon: CalendarDays, bg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400', action: () => onSelectTab('routine') },
              { labelBn: 'পরীক্ষা পরিচালনা', labelEn: 'Manage Exams', icon: ClipboardList, bg: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400', action: () => onSelectTab('exams') },
              { labelBn: 'ফলাফল দেখুন', labelEn: 'View Results', icon: Award, bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400', action: () => onSelectTab('results') },
              { labelBn: 'উপস্থিতি Kiosk', labelEn: 'Auto Attendance', icon: Clock, bg: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400', action: () => onSelectTab('attendance') },
              { labelBn: 'ডকুমেন্ট', labelEn: 'Documents', icon: Upload, bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400', action: () => onSelectTab('documents') },
              { labelBn: 'Academic Hub', labelEn: 'Academic Hub', icon: BookOpen, bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300', action: () => onSelectTab('academics') },
            ].map((q, idx) => {
              const Icon = q.icon;
              return (
                <button
                  key={q.labelEn}
                  type="button"
                  onClick={q.action}
                  className={`${idx >= 6 ? 'hidden md:flex' : 'flex'} flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-500 hover:bg-slate-50/80 dark:hover:bg-slate-800/70 transition-colors text-center cursor-pointer`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${q.bg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                    {b(q.labelBn, q.labelEn, lang)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Dynamic Editable School Campus Cover Banner */}
        <div data-testid="dashboard-cover-section" className="order-1 md:order-none">
        <SchoolCoverBanner
          school={ownSchool}
          lang={lang}
          canEditCover={true}
          onOpenCoverGallery={onOpenCoverGallery}
          onOpenCustomBannerCrop={onOpenBannerCrop}
          subtitleBn={`প্রধান শিক্ষক ড্যাশবোর্ড · ${ownSchool.headTeacher} · School ID: ${ownSchool.schoolPublicId ?? ownSchool.code}`}
          subtitleEn={`Head Teacher / School Admin Portal · ${ownSchool.headTeacher} · ID: ${ownSchool.schoolPublicId ?? ownSchool.code}`}
          rightSlot={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenAddStudent}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-white text-blue-800 hover:bg-blue-50 whitespace-nowrap cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                {b('নতুন শিক্ষার্থী', 'New Student', lang)}
              </button>
              <button
                type="button"
                onClick={() =>
                  onOpenConfirm({
                    title: b('শ্রেণি উন্নয়ন (Promotion)', 'Class Promotion', lang),
                    message: b('যোগ্য শিক্ষার্থীদের পরবর্তী শ্রেণিতে উন্নীত করতে চান? স্থায়ী Student ID অপরিবর্তিত থাকবে।', 'Promote eligible students to next grade while keeping Permanent Student IDs?', lang),
                    confirmLabel: b('উন্নীত করুন', 'Promote Eligible', lang),
                    onConfirm: () => onPromoteAllEligible(),
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white whitespace-nowrap cursor-pointer"
              >
                <GraduationCap className="w-4 h-4" />
                {b('শ্রেণি উন্নয়ন', 'Promotion', lang)}
              </button>
              {onOpenPhotoEditor && (
                <button
                  type="button"
                  onClick={onOpenPhotoEditor}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white whitespace-nowrap cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {b('প্রধান শিক্ষক ছবি', 'Admin Photo', lang)}
                </button>
              )}
            </div>
          }
        />
        </div>

        {/* School Admin Teaching Mode Panel */}
        <section
          aria-label="School Admin Teaching Mode"
          data-testid="dashboard-teaching-mode-section"
          className="order-2 md:order-none rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-blue-950 text-white border border-indigo-800/50 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs"
        >
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold">
              <BookOpen className="w-3.5 h-3.5" />
              {b('টিচিং মোড (Teaching Mode Active)', 'Head Teacher Teaching Mode', lang)}
            </div>
            <h2 className="text-base font-extrabold text-white">
              {b('আমার ক্লাস ও পাঠদান — প্রধান শিক্ষক হিসেবে সরাসরি ক্লাস পরিচালনা', 'My Classes & Teaching — Direct Classroom Actions', lang)}
            </h2>
            <p className="text-xs text-slate-300">
              {b(
                'নিজ বিদ্যালয়ের ক্লাস হাজিরা, দৈনিক পড়া/হোমওয়ার্ক এবং পরীক্ষার নম্বর প্রদান এক ক্লিকে সম্পন্ন করুন।',
                'Take class attendance, publish daily lessons/homework, and enter exam marks for your school.',
                lang
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
            <button
              type="button"
              onClick={() => onSelectTab('attendance')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              {b('হাজিরা নিন (QR Scanner)', 'Take Attendance (QR)', lang)}
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('lessons')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              {b('আজকের পড়া / Assignment', 'Publish Lesson / HW', lang)}
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('exams')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold cursor-pointer"
            >
              <ClipboardList className="w-4 h-4" />
              {b('নম্বর এন্ট্রি করুন', 'Enter Exam Marks', lang)}
            </button>
          </div>
        </section>

        {/* Scenic School Campus Reference Illustration Strip */}
        <div
          data-testid="dashboard-school-profile-section"
          className="order-4 md:order-none rounded-2xl bg-gradient-to-r from-blue-800 via-blue-700 to-emerald-700 text-white px-6 py-4 shadow-xs overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        >
          <div className="space-y-1 max-w-xl">
            <div className="text-xs font-semibold text-blue-100 flex flex-wrap items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>{ownSchool.schoolPublicId ?? ownSchool.code} · {b('শিক্ষাবর্ষ ২০২৬', 'Academic Year 2026', lang)} · {ownSchool.classRange}</span>
            </div>
            <p className="text-xs sm:text-sm text-blue-100/95">
              {b(ownSchool.nameBn, ownSchool.nameEn, lang)} — {b('এক নজরে উপস্থিতি, শ্রেণি কার্যক্রম, পরীক্ষা ও একাডেমিক নিয়ন্ত্রণ।', 'Unified view of attendance, classes, exams, and institutional compliance.', lang)}
            </p>
          </div>
          <div className="hidden md:flex items-center justify-end shrink-0">
            <SchoolCampusIllustration className="w-48 h-24 drop-shadow-sm" />
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="order-6 md:order-none grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              title: b('মোট শিক্ষার্থী', 'Total Students', lang),
              value: ownSchool.studentCount.toString(),
              growth: `${students.length} ${b('সক্রিয় প্রোফাইল', 'sample profiles', lang)}`,
              tab: 'students',
              icon: GraduationCap,
              badge: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
            },
            {
              title: b('মোট শিক্ষক', 'Total Teachers', lang),
              value: ownSchool.teacherCount.toString(),
              growth: `${teachers.length} ${b('নিবন্ধিত শিক্ষক', 'directory teachers', lang)}`,
              tab: 'teachers',
              icon: Users,
              badge: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400',
            },
            {
              title: b('অনুমোদিত শ্রেণি', 'Configured Classes', lang),
              value: allowedClasses.length.toString(),
              growth: ownSchool.classRange,
              tab: 'classes',
              icon: BookOpen,
              badge: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400',
            },
            {
              title: b('মোট পরীক্ষা', 'Total Exams', lang),
              value: exams.length.toString(),
              growth: b('৩য় সাময়িক প্রকাশিত', '3rd Term Published', lang),
              tab: 'exams',
              icon: ClipboardList,
              badge: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400',
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{card.title}</span>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.badge}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">{card.value}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{card.growth}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectTab(card.tab)}
                  className="text-left text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {tr('viewDetails', lang)} →
                </button>
              </div>
            );
          })}
        </div>

        {/* 3-Column Analytics Row: Attendance Donut + Class Bar Chart + Emerald Quick Links Panel */}
        <div className="order-7 md:order-none grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('শিক্ষার্থীর উপস্থিতি সারসংক্ষেপ', 'Student Attendance Overview', lang)}
              </h2>
              <button
                type="button"
                onClick={() => onSelectTab('attendance')}
                className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
              >
                QR Kiosk →
              </button>
            </div>
            <AttendanceDonutChart
              centerValue="93.5%"
              centerLabel={b('উপস্থিতির হার', 'Attendance Rate', lang)}
              segments={[
                { label: b('উপস্থিত (Present)', 'Present', lang), value: 232, color: '#059669' },
                { label: b('অনুপস্থিত (Absent)', 'Absent', lang), value: 11, color: '#DC2626' },
                { label: b('ছুটি (Leave)', 'On Leave', lang), value: 5, color: '#D97706' },
              ]}
            />
          </div>

          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('শ্রেণি ভিত্তিক শিক্ষার্থী সংখ্যা', 'Class-wise Student Distribution', lang)}
              </h2>
              <span className="text-xs text-slate-500">{ownSchool.classRange}</span>
            </div>
            <ClassBarChart data={classDistributionData} unitLabel={b('জন', 'students', lang)} />
          </div>

          {/* Emerald Quick Links Panel matching reference */}
          <div className="lg:col-span-4 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 text-white p-5 flex flex-col justify-between gap-4 shadow-xs">
            <div>
              <h2 className="text-base font-extrabold">{b('দ্রুত লিংক (Quick Links)', 'Quick Links', lang)}</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                {b('বিদ্যালয়ের দৈনন্দিন প্রশাসনিক ও একাডেমিক শর্টকাট', 'Direct access to school workflows & controls', lang)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { labelBn: 'হাজিরা Kiosk', labelEn: 'Attendance Kiosk', tab: 'attendance' },
                { labelBn: 'মাস্টার রুটিন', labelEn: 'Master Routine', tab: 'routine' },
                { labelBn: 'ফি সংগ্রহ', labelEn: 'Fees & Finance', tab: 'finance' },
                { labelBn: 'ফলাফল প্রকাশ', labelEn: 'Publish Results', tab: 'results' },
                { labelBn: '৩৪ একাডেমিক হাব', labelEn: 'Academic Hub', tab: 'academics' },
                { labelBn: 'অডিট ও নিরাপত্তা', labelEn: 'Audit & Security', tab: 'security' },
              ].map((ql) => (
                <button
                  key={ql.tab}
                  type="button"
                  onClick={() => onSelectTab(ql.tab)}
                  className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-left font-semibold transition-colors cursor-pointer"
                >
                  {b(ql.labelBn, ql.labelEn, lang)} →
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section Breakdown for PRIMARY_SECONDARY / MADRASA / Configured Structure */}
        {typeConfig.sectionsStructure.length > 0 && (
          <div className="order-8 md:order-none grid grid-cols-1 md:grid-cols-2 gap-4">
            {typeConfig.sectionsStructure.map((sec) => (
              <div
                key={sec.titleEn}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2 text-xs"
              >
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {b(sec.titleBn, sec.titleEn, lang)}
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  {b('সক্রিয় শ্রেণি:', 'Active Classes:', lang)} {sec.classes.join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Live Class Monitor Snapshot Banner */}
        <div className="order-9 md:order-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('লাইভ ক্লাস মনিটর (Live Class Monitor Snapshot)', 'Live Class Monitor Snapshot', lang)}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {b(
                  `চলমান: ${routineSlots.filter((s) => s.status === 'in_progress').length} · আসন্ন: ${routineSlots.filter((s) => s.status === 'pending').length} · সম্পন্ন: ${routineSlots.filter((s) => s.status === 'completed').length}`,
                  `Live: ${routineSlots.filter((s) => s.status === 'in_progress').length} · Upcoming: ${routineSlots.filter((s) => s.status === 'pending').length} · Completed: ${routineSlots.filter((s) => s.status === 'completed').length}`,
                  lang
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectTab('routine')}
                className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                {b('লাইভ ক্লাস মনিটর খুলুন', 'Open Live Monitor', lang)}
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('academics')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                {b('৩৪-মডিউল একাডেমিক হাব', '34-Module Academic Hub', lang)}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {routineSlots.slice(0, 3).map((slot) => (
              <div key={slot.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {slot.className} · {b(slot.subjectBn, slot.subjectEn, lang)}
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    {slot.substituteTeacher ?? slot.teacherName} · {slot.timeRange}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded font-semibold shrink-0 ${
                    slot.status === 'in_progress'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                      : slot.status === 'completed'
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {slot.status === 'in_progress' ? 'Live' : slot.status === 'completed' ? 'Done' : 'Upcoming'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Grid: Timeline + Notices + Latest Exam Spotlight + Account Security */}
        <div className="order-10 md:order-none grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {/* Timeline */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {b('সাম্প্রতিক কার্যক্রম', 'Recent Activity Timeline', lang)}
            </h2>
            <ul className="space-y-3 text-xs">
              {[
                { title: b('নতুন শিক্ষার্থী নিবন্ধন', 'New Student Registered', lang), meta: 'মেহেদী হাসান · Pre-Primary' },
                { title: b('Assignment জমা সম্পন্ন', 'Assignment Submitted', lang), meta: 'Class 4 · ৩৮/৪০ জন' },
                { title: b('পরীক্ষার ফলাফল প্রকাশ', 'Exam Results Published', lang), meta: '৩য় সাময়িক ২০২৬' },
                { title: b('নোটিশ প্রকাশ', 'Notice Published', lang), meta: 'বার্ষিক পরীক্ষার সময়সূচি' },
              ].map((item) => (
                <li key={item.title} className="border-b last:border-b-0 border-slate-100 dark:border-slate-800 pb-2 last:pb-0">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</div>
                  <div className="text-slate-500 mt-0.5">{item.meta}</div>
                </li>
              ))}
            </ul>
          </div>

          {/* Recent Notices */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('নোটিশ ও বিজ্ঞপ্তি', 'Recent Notices', lang)}
              </h2>
              <button type="button" onClick={() => onSelectTab('notices')} className="text-xs text-blue-700 dark:text-blue-400 font-semibold cursor-pointer">
                {b('সব', 'All', lang)} →
              </button>
            </div>
            <div className="space-y-3 text-xs">
              {notices.slice(0, 3).map((n) => (
                <div key={n.id} className="border-b last:border-b-0 border-slate-100 dark:border-slate-800 pb-2 last:pb-0">
                  <div className="font-semibold text-slate-900 dark:text-white">{b(n.titleBn, n.titleEn, lang)}</div>
                  <div className="text-slate-500 mt-0.5">{n.date} · {sanitizeActorDisplayForRole(n.author, 'school_admin')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Latest Exam / Result Trophy Spotlight */}
          <div className="bg-gradient-to-br from-blue-50 to-emerald-50/70 dark:from-slate-900 dark:to-slate-900 border border-blue-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {b('পরীক্ষা ও ফলাফল', 'Latest Exam & Result', lang)}
                </h2>
                {(() => {
                  const latestExam = pickPrimaryTermOrPublishedExam(exams);
                  return latestExam ? (
                    <div className="text-xs space-y-1">
                      <div className="font-semibold text-blue-900 dark:text-blue-200">
                        {b(latestExam.titleBn, latestExam.titleEn, lang)}
                      </div>
                      <div className="text-slate-500">{latestExam.className} · {latestExam.dateRange}</div>
                      <div className="tabular-nums font-bold text-emerald-700 dark:text-emerald-400 pt-1">
                        {b('পাসের হার: ৯৭.৮% · জিপিএ-৫: ১৪ জন', 'Pass Rate: 97.8% · GPA 5.0: 14', lang)}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      {b('নতুন স্থানীয় পরীক্ষা তৈরি বা ফলাফল দেখুন।', 'Open Exams to manage Class/Model tests.', lang)}
                    </p>
                  );
                })()}
              </div>
              <AchievementTrophyIllustration className="w-16 h-14 shrink-0" />
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('results')}
              className="w-full py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer"
            >
              {b('ফলাফল ও মেধাতালিকা দেখুন', 'Results & Merit List', lang)}
            </button>
          </div>

          {/* Account Security */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Account Security</h2>
            </div>
            <div className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
              <div>{b('শেষ লগইন:', 'Last Login:', lang)} ১৭ নভে ২০২৬, ০৮:৫০ AM</div>
              <div>{b('স্কুল স্কোপ:', 'School Scope:', lang)} <span className="font-mono font-semibold">{ownSchool.code} Only</span></div>
              <div>{b('নিরাপত্তা অবস্থা:', 'Security Status:', lang)} <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Protected (RLS Active)</span></div>
              <button
                type="button"
                onClick={() => onSelectTab('security')}
                className="text-blue-700 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
              >
                {b('সিকিউরিটি সেটিংস', 'Security Settings', lang)} →
              </button>
            </div>
          </div>
        </div>

        {/* School Admin Role-Scoped Notification Preview */}
        <div className="order-11 md:order-none">
          <DashboardNotificationPreview
            lang={lang}
            role="school_admin"
            schoolId={ownSchool.id}
            notifications={notifications}
            preferences={notificationPreferences}
            lastLoginIso={lastLoginIso}
            onOpenNotificationCenter={() => onSelectTab('notifications')}
            onNavigateFromNotification={
              onNavigateFromNotification ?? ((item) => onSelectTab(item.targetTab ?? 'dashboard'))
            }
          />
        </div>

        {/* Mobile Bottom 4 Cards Only (ফলাফল দেখুন | উপস্থিতি Kiosk | ডকুমেন্ট | Academic Hub) */}
        <section
          aria-label="Mobile Bottom Module Shortcuts"
          data-testid="mobile-bottom-four-cards"
          className="order-12 md:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs space-y-2.5"
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
            {b('দ্রুত মডিউল শর্টকাট', 'Quick Module Shortcuts', lang)}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { labelBn: 'ফলাফল দেখুন', labelEn: 'View Results', icon: Award, bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400', action: () => onSelectTab('results') },
              { labelBn: 'উপস্থিতি Kiosk', labelEn: 'Auto Attendance', icon: Clock, bg: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400', action: () => onSelectTab('attendance') },
              { labelBn: 'ডকুমেন্ট', labelEn: 'Documents', icon: Upload, bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400', action: () => onSelectTab('documents') },
              { labelBn: 'Academic Hub', labelEn: 'Academic Hub', icon: BookOpen, bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300', action: () => onSelectTab('academics') },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.labelEn}
                  type="button"
                  onClick={card.action}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/40 transition-colors text-left cursor-pointer"
                >
                  <div className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center ${card.bg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                    {b(card.labelBn, card.labelEn, lang)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  // Students View (Own School Isolated + Admission Approval + Document Verification + Action Bar)
  if (activeTab === 'students') {
    return (
      <StudentDirectoryPanel
        actorRole="school_admin"
        lang={lang}
        globalSearch={searchQuery}
        students={students}
        schools={allSchools}
        ownSchool={ownSchool}
        studentRequests={studentRequests}
        auditLogs={auditLogs}
        notifications={notifications}
        senderLabel={`${ownSchool.headTeacher} (${ownSchool.code} School Admin)`}
        hasPermission={hasPermission}
        onOpenAddStudent={onOpenAddStudent}
        onEditStudent={onEditStudent}
        onTransferStudent={onTransferStudent}
        onUpdateStudentStatus={onUpdateStudentStatus}
        onSendStudentNotice={onSendStudentNotice}
        onVerifyStudentDocument={onVerifyStudentDocument}
        onProcessStudentRequest={onProcessStudentRequest}
        onVerifyStudent={onVerifyStudent}
        onReissueStudentId={onReissueStudentId}
        onInspectStudent={onInspectStudent}
        onEditStudentPhoto={onEditStudentPhoto}
      />
    );
  }

  // Full 34-Module Academic Management Hub (mapped from Academics, Classes, Routine, Subjects, Lessons, Events, Reports)
  if (activeTab === 'routine') {
    return (
      <div className="space-y-6">
        <RoutineManagementSystem
          lang={lang}
          role="school_admin"
          school={ownSchool}
          actorName={ownSchool.headTeacher}
          routines={masterRoutines}
          teachers={teachers}
          subjects={subjects}
          teacherAssignments={teacherAssignments}
          onUpdateRoutines={onUpdateMasterRoutines ?? (() => {})}
        />
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 no-print">
          <AcademicManagementHub
            key="routine-live-monitor"
            lang={lang}
            initialModule="live_class_monitor"
            school={ownSchool}
            students={students}
            teachers={teachers}
            routineSlots={routineSlots}
            masterRoutines={masterRoutines}
            onUpdateMasterRoutines={onUpdateMasterRoutines}
            exams={exams}
            assignments={assignments}
            academicYears={academicYears}
            onCreateAcademicYear={onCreateAcademicYear}
            onSelectCurrentAcademicYear={onSelectCurrentAcademicYear}
            onAddTermToYear={onAddTermToYear}
            calendarEvents={calendarEvents}
            onAddCalendarEvent={onAddCalendarEvent}
            classSections={classSections}
            onAddClassSection={onAddClassSection}
            subjects={subjects}
            onAddSubject={onAddSubject}
            teacherAssignments={teacherAssignments}
            onSaveTeacherAssignment={onSaveTeacherAssignment}
            onReplaceAssignedTeacher={onReplaceAssignedTeacher}
            onCreateRoutineSlot={onCreateRoutineSlot}
            onUpdateRoutineSlot={onUpdateRoutineSlot}
            onAssignSubstituteTeacher={onAssignSubstituteTeacher}
            classworks={classworks}
            onCreateClasswork={onCreateClasswork}
            onUpdateClassworkStudentStatus={onUpdateClassworkStudentStatus}
            curriculumUnits={curriculumUnits}
            lessonPlans={lessonPlans}
            onAddLessonPlan={onAddLessonPlan}
            studyMaterials={studyMaterials}
            classTests={classTests}
            questionBank={questionBank}
            examSchedules={examSchedules}
            gradingRules={gradingRules}
            onUpdateGradingRule={onUpdateGradingRule}
            extraItems={extraItems}
            onUpdateExamMark={onUpdateExamMark}
            onToggleExamStatus={onToggleExamStatus}
            onPromoteAllEligible={onPromoteAllEligible}
            dailyLessons={dailyLessons}
            substitutePermissions={substitutePermissions}
            subjectSubmissions={subjectSubmissions}
            resultAuditLogs={resultAuditLogs}
            onReviewSubstitutePermission={onReviewSubstitutePermission}
            onCancelClassSlot={onCancelClassSlot}
            onRestoreClassSlot={onRestoreClassSlot}
            onSendDelayedTeacherAlert={onSendDelayedTeacherAlert}
            onTogglePublishResult={onTogglePublishResult}
            externalModule={externalAcademicModule}
            favoriteModules={favoriteModules}
            onToggleFavorite={onToggleFavorite}
            recentModules={recentModules}
            onRecordRecent={onRecordRecent}
          />
        </div>
      </div>
    );
  }

  // Academic Management System (All 34 Modules Unified with School Profile)
  if (
    activeTab === 'academics' ||
    activeTab === 'classes' ||
    activeTab === 'subjects' ||
    activeTab === 'lessons' ||
    activeTab === 'events' ||
    activeTab === 'reports'
  ) {
    const initialModuleMap: Record<string, AcademicModuleId> = {
      academics: 'academic_dashboard',
      classes: 'class_management',
      subjects: 'subject_management',
      lessons: 'classwork',
      events: 'academic_calendar',
      reports: 'academic_reports',
    };

    return (
      <AcademicManagementHub
        key={activeTab}
        lang={lang}
        initialModule={initialModuleMap[activeTab] ?? 'academic_dashboard'}
        school={ownSchool}
        students={students}
        teachers={teachers}
        routineSlots={routineSlots}
        masterRoutines={masterRoutines}
        onUpdateMasterRoutines={onUpdateMasterRoutines}
        exams={exams}
        assignments={assignments}
        academicYears={academicYears}
        onCreateAcademicYear={onCreateAcademicYear}
        onSelectCurrentAcademicYear={onSelectCurrentAcademicYear}
        onAddTermToYear={onAddTermToYear}
        calendarEvents={calendarEvents}
        onAddCalendarEvent={onAddCalendarEvent}
        classSections={classSections}
        onAddClassSection={onAddClassSection}
        subjects={subjects}
        onAddSubject={onAddSubject}
        teacherAssignments={teacherAssignments}
        onSaveTeacherAssignment={onSaveTeacherAssignment}
        onReplaceAssignedTeacher={onReplaceAssignedTeacher}
        onCreateRoutineSlot={onCreateRoutineSlot}
        onUpdateRoutineSlot={onUpdateRoutineSlot}
        onAssignSubstituteTeacher={onAssignSubstituteTeacher}
        classworks={classworks}
        onCreateClasswork={onCreateClasswork}
        onUpdateClassworkStudentStatus={onUpdateClassworkStudentStatus}
        curriculumUnits={curriculumUnits}
        lessonPlans={lessonPlans}
        onAddLessonPlan={onAddLessonPlan}
        studyMaterials={studyMaterials}
        classTests={classTests}
        questionBank={questionBank}
        examSchedules={examSchedules}
        gradingRules={gradingRules}
        onUpdateGradingRule={onUpdateGradingRule}
        extraItems={extraItems}
        onUpdateExamMark={onUpdateExamMark}
        onToggleExamStatus={onToggleExamStatus}
        onPromoteAllEligible={onPromoteAllEligible}
        dailyLessons={dailyLessons}
        substitutePermissions={substitutePermissions}
        subjectSubmissions={subjectSubmissions}
        resultAuditLogs={resultAuditLogs}
        onReviewSubstitutePermission={onReviewSubstitutePermission}
        onCancelClassSlot={onCancelClassSlot}
        onRestoreClassSlot={onRestoreClassSlot}
        onSendDelayedTeacherAlert={onSendDelayedTeacherAlert}
        onTogglePublishResult={onTogglePublishResult}
        externalModule={externalAcademicModule}
        favoriteModules={favoriteModules}
        onToggleFavorite={onToggleFavorite}
        recentModules={recentModules}
        onRecordRecent={onRecordRecent}
      />
    );
  }

  // Attendance & Automatic ID Card Scanning System
  if (activeTab === 'attendance') {
    return (
      <div className="space-y-5">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            {tr('print', lang)}
          </button>
        </div>
        <AutoIdAttendanceScanner
          lang={lang}
          school={ownSchool}
          schoolId={ownSchool.id}
          schoolNameBn={ownSchool.nameBn}
          students={students}
          kioskScans={kioskScans}
          attendanceHistory={attendanceHistory}
          onRecordAutoScan={
            onRecordAutoScan ??
            (({ rawCode, isLate }) => {
              const matched = students.find(
                (s) =>
                  s.id === rawCode ||
                  s.permanentId === rawCode ||
                  s.digitalIdSerial === rawCode ||
                  s.guardianLinkCode === rawCode
              );
              if (!matched) {
                return { status: 'not_found', messageBn: 'শিক্ষার্থী পাওয়া যায়নি।', messageEn: 'Student not found.' };
              }
              onSimulateKioskScan(matched.id, isLate);
              return { status: 'recorded', messageBn: `${matched.nameBn} উপস্থিত রেকর্ড হয়েছে।`, messageEn: `${matched.nameEn} recorded.` };
            })
          }
          onManualAttendanceMark={onManualAttendanceMark ?? (() => {})}
          onNotifyAllAbsentGuardians={onNotifyAllAbsentGuardians ?? (() => {})}
        />
      </div>
    );
  }

  // Exams & Results (Local Autonomous Tests + Centrally Published Term Exams + Merit Rank)
  if (activeTab === 'exams' || activeTab === 'results') {
    const exam = pickPrimaryTermOrPublishedExam(exams);
    const meritList = exam ? computeStudentMeritList(exam.entries) : [];

    return (
      <div className="space-y-6">
        <ExaminationManagementPanel
          lang={lang}
          role="school_admin"
          schoolId={ownSchool.id}
          actorName={ownSchool.headTeacher}
          schools={[ownSchool]}
          students={students}
          exams={exams}
          onCreateLocalExam={onCreateLocalExam ?? (() => {})}
          onToggleCentralTermPublish={() => {}}
          onUpdateExamMark={onUpdateExamMark}
        />

        {activeTab === 'exams' && (
          <ExamRoutineSystem
            lang={lang}
            role="school_admin"
            school={ownSchool}
            actorName={ownSchool.headTeacher}
            teachers={teachers}
            exams={exams}
            examRoutines={examRoutines}
            onUpdateExamRoutines={onUpdateExamRoutines}
          />
        )}

        {exam ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {b(exam.titleBn, exam.titleEn, lang)}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {exam.className} · {exam.dateRange} · {b('অবস্থা:', 'Status:', lang)}{' '}
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {exam.status === 'published' ? b('প্রকাশিত (Published)', 'Published', lang) : b('স্থগিত (Held)', 'Held', lang)}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onOpenConfirm({
                      title: exam.status === 'published' ? b('ফলাফল স্থগিত করুন', 'Hold Result Publication', lang) : b('ফলাফল প্রকাশ করুন', 'Publish Result', lang),
                      message:
                        exam.status === 'published'
                          ? b('প্রধান শিক্ষক হিসেবে এই পরীক্ষার ফলাফল সাময়িকভাবে স্থগিত করতে চান?', 'Hold this exam result from guardian/student portals?', lang)
                          : b('সকল নম্বর যাচাই শেষে ফলাফল প্রকাশ করতে চান?', 'Publish final marksheets, GPA, and merit positions?', lang),
                      confirmLabel: tr('confirm', lang),
                      danger: exam.status === 'published',
                      onConfirm: (reason) =>
                        onToggleExamStatus(exam.id, exam.status === 'published' ? 'held' : 'published', reason),
                    })
                  }
                  className={`px-4 py-2 text-xs font-semibold rounded-lg text-white cursor-pointer ${
                    exam.status === 'published' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-700 hover:bg-emerald-800'
                  }`}
                >
                  {exam.status === 'published' ? b('ফলাফল স্থগিত করুন (Hold)', 'Hold Result', lang) : b('ফলাফল প্রকাশ করুন (Publish)', 'Publish Result', lang)}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {b('নম্বরপত্র প্রিন্ট', 'Print Marksheet', lang)}
                </button>
              </div>
            </div>

            {/* Result Submission Completion & Delayed Teacher Alerts */}
            {onSendDelayedTeacherAlert && onTogglePublishResult && (
              <SchoolAdminResultManagementPanel
                lang={lang}
                school={ownSchool}
                exams={exams}
                subjectSubmissions={subjectSubmissions}
                resultAuditLogs={resultAuditLogs}
                onSendDelayedTeacherAlert={onSendDelayedTeacherAlert}
                onTogglePublishResult={onTogglePublishResult}
              />
            )}

        {/* Auto Merit List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 font-bold text-sm">
            {b('স্বয়ংক্রিয় মেধা তালিকা ও GPA (NCTB জাতীয় গ্রেডিং)', 'Automated Merit List & GPA (NCTB Standard)', lang)}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                  <th className="py-2.5 px-4 font-semibold">{b('মেধাক্রম', 'Merit Rank', lang)}</th>
                  <th className="py-2.5 px-3 font-semibold">{b('শিক্ষার্থী', 'Student', lang)}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{b('মোট নম্বর', 'Total Marks', lang)}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">GPA</th>
                  <th className="py-2.5 px-4 font-semibold">{b('গ্রেড', 'Letter Grade', lang)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {meritList.map((m) => (
                  <tr key={m.studentId}>
                    <td className="py-3 px-4 font-bold tabular-nums text-blue-700 dark:text-blue-400">#{m.rank}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                      {m.studentName} <span className="text-slate-500 font-normal">(Roll {m.roll})</span>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-semibold">
                      {m.totalObtained} / {m.totalFull}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-bold">{m.gpa.toFixed(2)}</td>
                    <td className="py-3 px-4 font-bold text-emerald-700 dark:text-emerald-400">{m.letterGrade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Teacher Subject-wise Marks Entry */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 font-bold text-sm">
            {b('বিষয়ভিত্তিক নম্বর প্রদান (লিখিত + মৌখিক + ধারাবাহিক মূল্যায়ন)', 'Subject-wise Marks Entry (Written + Oral + Continuous)', lang)}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                  <th className="py-2.5 px-4 font-semibold">{b('শিক্ষার্থী', 'Student', lang)}</th>
                  <th className="py-2.5 px-3 font-semibold">{b('বিষয়', 'Subject', lang)}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{b('লিখিত (৮০)', 'Written (80)', lang)}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{b('মৌখিক (১০)', 'Oral (10)', lang)}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{b('ধারাবাহিক (১০)', 'CA (10)', lang)}</th>
                  <th className="py-2.5 px-4 font-semibold text-right">{b('মোট ও গ্রেড', 'Total & Grade', lang)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {exam.entries.map((entry) => {
                  const total = entry.written + entry.oral + entry.continuous;
                  const gr = calculateBDGradeAndGPA(total, entry.fullMarks, entry.passMarks);
                  return (
                    <tr key={`${entry.studentId}-${entry.subjectEn}`}>
                      <td className="py-2.5 px-4 font-semibold">{entry.studentName}</td>
                      <td className="py-2.5 px-3">{b(entry.subjectBn, entry.subjectEn, lang)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          min={0}
                          max={80}
                          value={entry.written}
                          onChange={(e) =>
                            onUpdateExamMark(exam.id, entry.studentId, entry.subjectEn, Number(e.target.value))
                          }
                          aria-label={`${entry.studentName} ${entry.subjectEn} written marks`}
                          className="w-16 h-7 px-2 text-right tabular-nums rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{entry.oral}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{entry.continuous}</td>
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
          </>
        ) : null}

        {activeTab === 'results' && (
          <AcademicCertificatesDocsPanel
            lang={lang}
            school={ownSchool}
            students={students}
            exams={exams}
            classworks={classworks}
            assignments={assignments}
            gradingRules={gradingRules}
          />
        )}
      </div>
    );
  }

  // Finance / Fee Management
  if (activeTab === 'finance') {
    const totalAssessed = fees.reduce((s, f) => s + f.totalAmount, 0);
    const totalCollected = fees.reduce((s, f) => s + f.paidAmount, 0);
    const totalDue = totalAssessed - totalCollected;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {b('আর্থিক ও ফি ব্যবস্থাপনা (Fee Ledger)', 'Fee & Financial Management', lang)}
          </h1>
          <div className="flex items-center gap-2 text-xs">
            <label className="font-semibold">{b('পেমেন্ট মাধ্যম:', 'Method:', lang)}</label>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as FeeRecord['method'])}
              className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="Cash">নগদ (Cash)</option>
              <option value="bKash">বিকাশ (bKash)</option>
              <option value="Nagad">নগদ (Nagad)</option>
              <option value="Bank">ব্যাংক (Bank)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500">{b('মোট ধার্য টাকা', 'Total Assessed', lang)}</div>
            <div className="text-2xl font-bold tabular-nums mt-1">৳ {totalAssessed.toLocaleString()}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500">{b('মোট আদায়কৃত টাকা', 'Total Collected', lang)}</div>
            <div className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
              ৳ {totalCollected.toLocaleString()}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500">{b('মোট বকেয়া', 'Total Due', lang)}</div>
            <div className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400 mt-1">
              ৳ {totalDue.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                  <th className="py-3 px-4 font-semibold">Receipt / Ref</th>
                  <th className="py-3 px-3 font-semibold">{b('শিক্ষার্থী', 'Student', lang)}</th>
                  <th className="py-3 px-3 font-semibold">{b('ফি খাত', 'Fee Category', lang)}</th>
                  <th className="py-3 px-3 font-semibold text-right">{b('ধার্য / আদায়', 'Assessed / Paid', lang)}</th>
                  <th className="py-3 px-3 font-semibold">{b('মাধ্যম', 'Method', lang)}</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {fees.map((f) => {
                  const due = f.totalAmount - f.paidAmount;
                  return (
                    <tr key={f.id}>
                      <td className="py-3 px-4 font-mono">
                        <div className="font-semibold">{f.receiptNo}</div>
                        <div className="text-[11px] text-slate-500">Ref: {f.transactionRef}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold">{f.studentName} ({f.className})</td>
                      <td className="py-3 px-3">{b(f.categoryBn, f.categoryEn, lang)} · {f.month}</td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        ৳ {f.totalAmount} / <span className="font-bold text-emerald-700 dark:text-emerald-400">৳ {f.paidAmount}</span>
                      </td>
                      <td className="py-3 px-3 font-semibold">{f.method}</td>
                      <td className="py-3 px-4 text-right">
                        {due > 0 ? (
                          <button
                            type="button"
                            onClick={() => onCollectFee(f.id, payMethod, `TXN-${Date.now().toString().slice(-6)}`)}
                            className="px-3 py-1.5 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer"
                          >
                            {b(`৳${due} আদায় করুন`, `Collect ৳${due}`, lang)}
                          </button>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{b('পরিশোধিত', 'Paid', lang)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Health, Growth & Stipend (উপবৃত্তি)
  if (activeTab === 'health') {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {b('শিক্ষার্থীর স্বাস্থ্য, পুষ্টি ও উপবৃত্তি ব্যবস্থাপনা', 'Student Health, Growth & Stipend (উপবৃত্তি)', lang)}
        </h1>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                <th className="py-3 px-4 font-semibold">{b('শিক্ষার্থী', 'Student', lang)}</th>
                <th className="py-3 px-3 font-semibold text-right">{b('উচ্চতা / ওজন', 'Height / Weight', lang)}</th>
                <th className="py-3 px-3 font-semibold text-right">BMI</th>
                <th className="py-3 px-3 font-semibold">{b('পুষ্টি অবস্থান', 'Nutrition Status', lang)}</th>
                <th className="py-3 px-4 font-semibold">{b('উপবৃত্তি অবস্থা', 'Stipend Status', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {students.map((st) => {
                const bmi = calculateBMI(st.heightCm, st.weightKg);
                return (
                  <tr key={st.id}>
                    <td className="py-3 px-4 font-semibold">{st.nameBn} ({st.className})</td>
                    <td className="py-3 px-3 text-right tabular-nums">{st.heightCm} cm · {st.weightKg} kg</td>
                    <td className="py-3 px-3 text-right tabular-nums font-bold">{bmi.bmi}</td>
                    <td className="py-3 px-3">{b(bmi.categoryBn, bmi.categoryEn, lang)}</td>
                    <td className="py-3 px-4 font-semibold">
                      <span className={st.stipendStatus === 'approved' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600'}>
                        {st.stipendStatus === 'approved'
                          ? b('উপবৃত্তি অনুমোদিত', 'Stipend Approved', lang)
                          : st.stipendStatus === 'pending'
                            ? b('যাচাই অপেক্ষমান', 'Pending Check', lang)
                            : b('আবেদনকৃত নয়', 'Not Applied', lang)}
                      </span>
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

  // AI Smart Analysis
  if (activeTab === 'ai_insights') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-700 dark:text-blue-400" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {b('AI ও স্মার্ট একাডেমিক বিশ্লেষণ', 'AI School Insights & Actionable Analytics', lang)}
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
            <div className="text-xs font-bold text-red-600 dark:text-red-400">
              {b('হাজিরার হার কমে যাওয়ার প্রবণতা', 'Attendance Drop Detection', lang)}
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Class 8 — রাকিব হাসান (68.5%)</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {b('গত ১৪ দিনে ৫ দিন অনুপস্থিত। অভিভাবকের সাথে জরুরি যোগাযোগ সাজেস্ট করা হলো।', 'Absent 5 days in last 14 days. Immediate guardian outreach recommended.', lang)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
            <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
              {b('দুর্বল বিষয় শনাক্তকরণ', 'Weak Subject Detection', lang)}
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Class 4 — {b('ইংরেজি (গড় ৭৪%)', 'English (Avg 74%)', lang)}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {b('অন্য বিষয়ের তুলনায় ইংরেজিতে প্যারাগ্রাফ অংশে অতিরিক্ত অনুশীলন প্রয়োজন।', 'Lower writing rubric score compared to Bangla and Math.', lang)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              {b('পরীক্ষার প্রস্তুতি ও প্রশাসনিক করণীয়', 'Exam Readiness & Action Items', lang)}
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{b('সিলেবাস সম্পন্ন: ৯৪%', 'Syllabus Coverage: 94%', lang)}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {b('২০ নভেম্বরের পরীক্ষার পূর্বে ১টি রিভিশন মডেল টেস্ট ও প্রবেশপত্র বিতরণ সম্পন্ন করুন।', 'Complete 1 revision test and admit card print before 20 Nov.', lang)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Teachers View (Own School Teachers + Multi-School Join Requests & Permission Toggles)
  if (activeTab === 'teachers') {
    const schoolJoinAssignments = teacherSchoolAssignments.filter((a) => a.schoolId === ownSchool.id);
    const pendingJoins = schoolJoinAssignments.filter((a) => a.approvalStatus === 'pending');
    const activeJoins = schoolJoinAssignments.filter((a) => a.approvalStatus === 'approved');

    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {b('শিক্ষক ব্যবস্থাপনা, যোগদান অনুমোদন ও অনুমতি', 'Teacher Management, Join Requests & Permissions', lang)}
        </h1>

        {pendingJoins.length > 0 && (
          <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 space-y-3 text-xs">
            <div className="font-bold text-sm text-amber-900 dark:text-amber-200">
              {b(`অপেক্ষমাণ শিক্ষক যোগদান আবেদন (${pendingJoins.length})`, `Pending Teacher Join Applications (${pendingJoins.length})`, lang)}
            </div>
            {pendingJoins.map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {req.teacherCode} · {req.designation}
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    {b('আবেদনের বিষয়:', 'Requested Subjects:', lang)} {req.assignedSubjects.join(', ') || 'সাধারণ'} · {req.appliedAt}
                  </div>
                </div>
                {onReviewTeacherJoinApplication && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onReviewTeacherJoinApplication(
                          req.id,
                          'approved',
                          { addStudent: true, createNotice: true, generateDocs: true, takeAttendance: true },
                          ownSchool.approvedClasses.slice(0, 2),
                          req.assignedSubjects.length > 0 ? req.assignedSubjects : ['বাংলা']
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                    >
                      {b('অনুমোদন ও অনুমতি দিন', 'Approve & Grant Access', lang)}
                    </button>
                    <button
                      type="button"
                      onClick={() => onReviewTeacherJoinApplication(req.id, 'rejected')}
                      className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-semibold cursor-pointer"
                    >
                      {b('প্রত্যাখ্যান', 'Reject', lang)}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeJoins.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 text-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {b('বিদ্যালয়ে নিযুক্ত শিক্ষকদের অনুমতি ও শ্রেণি নিয়ন্ত্রণ', 'Assigned Teacher School-Level Permissions', lang)}
            </h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeJoins.map((asgn) => (
                <div key={asgn.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {asgn.teacherCode} · {asgn.designation} ({asgn.employmentStatus})
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      {b('শ্রেণি:', 'Classes:', lang)} {asgn.assignedClasses.join(', ') || '-'} · {b('বিষয়:', 'Subjects:', lang)}{' '}
                      {asgn.assignedSubjects.join(', ') || '-'}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {onReviewTeacherJoinApplication &&
                      (['addStudent', 'createNotice', 'generateDocs', 'takeAttendance'] as const).map((permKey) => (
                        <label
                          key={permKey}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={asgn.permissions[permKey]}
                            onChange={(e) =>
                              onReviewTeacherJoinApplication(asgn.id, 'approved', {
                                [permKey]: e.target.checked,
                              })
                            }
                          />
                          <span>{permKey}</span>
                        </label>
                      ))}
                    {onToggleTeacherAssignmentStatus && (
                      <button
                        type="button"
                        onClick={() =>
                          onToggleTeacherAssignmentStatus(
                            asgn.id,
                            asgn.employmentStatus === 'Active' ? 'Suspended' : 'Active'
                          )
                        }
                        className="px-2.5 py-1 rounded border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 font-semibold cursor-pointer"
                      >
                        {asgn.employmentStatus === 'Active' ? b('স্কুল থেকে স্থগিত', 'Suspend at School', lang) : b('সক্রিয় করুন', 'Reactivate', lang)}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teachers.map((t) => (
            <div key={t.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2.5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs text-blue-700 dark:text-blue-400 font-semibold">{t.teacherCode}</span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.nameBn}</h3>
                  <p className="text-xs text-slate-500">{t.designation} · {t.qualification}</p>
                </div>
                <span className="text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {t.performanceScore}/100
                </span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <div>{b('বিষয়:', 'Subjects:', lang)} {t.subjects.join(', ')}</div>
                <div>{b('শ্রেণি:', 'Classes:', lang)} {t.assignedClasses.join(', ')}</div>
                {t.specialDuty && <div>{b('বিশেষ দায়িত্ব:', 'Special Duty:', lang)} {t.specialDuty}</div>}
              </div>
                {t.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => onApproveTeacher(t.id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white cursor-pointer"
                  >
                    {b('শিক্ষক যোগদান অনুমোদন করুন', 'Approve Teacher Joining', lang)}
                  </button>
                )}
                {onEditTeacherPhoto && (
                  <button
                    type="button"
                    onClick={() => onEditTeacherPhoto(t)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                    {b('ছবি পরিবর্তন', 'Edit Photo', lang)}
                  </button>
                )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Notices & Communication Center
  if (activeTab === 'notices') {
    return (
      <div className="space-y-6">
        <NoticeCommunicationCenter
          lang={lang}
          role="school_admin"
          userId={`adm-${ownSchool.id}`}
          actorName={ownSchool.headTeacher}
          schoolId={ownSchool.id}
          notices={notices}
          teachers={teachers}
          students={students}
          maxNoticeImages={maxNoticeImages}
          onUpdateMaxNoticeImages={onUpdateMaxNoticeImages}
          onUpdateNoticeImages={onUpdateNoticeImages}
          onCreateNotice={
            onCreateNoticeStructured ??
            ((payload) => {
              onAddNotice({
                id: `not-${Date.now()}`,
                titleBn: payload.titleBn,
                titleEn: payload.titleEn,
                bodyBn: payload.bodyBn,
                bodyEn: payload.bodyEn,
                category: payload.category,
                audience: 'all',
                date: '১৯ নভে ২০২৬',
                schoolId: ownSchool.id,
                author: ownSchool.headTeacher,
                authorRole: 'school_admin',
                noticeType: payload.noticeType,
                status: payload.status,
                audienceGroup: payload.audienceGroup,
                isEmergency: payload.isEmergency,
                images: payload.images,
                allowImageDownload: payload.allowImageDownload,
              });
            })
          }
          onEditNotice={onEditNotice ?? (() => {})}
          onTransitionNoticeStatus={onTransitionNoticeStatus ?? (() => {})}
          onMarkNoticeRead={onMarkNoticeRead ?? (() => {})}
        />

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {b('SMS ও নোটিফিকেশন ডেলিভারি হিস্ট্রি', 'SMS Delivery History', lang)}
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {smsLog.map((s) => (
              <div key={s.id} className="py-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{s.target}</div>
                  <div className="text-slate-600 dark:text-slate-300 mt-0.5">{s.message}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-emerald-700 dark:text-emerald-400 font-semibold">{s.status}</div>
                  <div className="text-slate-400">{s.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Full Notification Center
  if (activeTab === 'notifications') {
    return (
      <NotificationCenterPanel
        lang={lang}
        role="school_admin"
        schoolId={ownSchool.id}
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

  // Remaining School Admin tabs: school, events, documents, reports, security, audit, support
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {activeTab === 'documents'
            ? b('অফিশিয়াল ডকুমেন্ট, সনদ ও ব্যাকআপ', 'Official Documents, Certificates & Cloud Sync', lang)
            : activeTab === 'audit'
              ? b('বিদ্যালয়ের অডিট লগ', 'School Audit Log', lang)
              : activeTab === 'school'
                ? ownSchool.nameBn
                : b('বিদ্যালয় ব্যবস্থাপনা প্যানেল', 'School Operations Panel', lang)}
        </h1>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          {tr('print', lang)}
        </button>
      </div>

      {activeTab === 'documents' ? (
        <div className="space-y-6">
          <OfficialDocumentSystem
            lang={lang}
            role="school_admin"
            school={ownSchool}
            actorName={ownSchool.headTeacher}
            students={students}
            teachers={teachers}
            exams={exams}
            documents={officialDocuments}
            templates={documentTemplates}
            onUpdateDocuments={onUpdateOfficialDocuments ?? (() => {})}
            canGenerate={true}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                <Database className="w-4 h-4 text-blue-700" />
                {b('ডাটাবেস ব্যাকআপ ও পুনরুদ্ধার পরিকল্পনা', 'Database Backup & Restore Plan', lang)}
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                {b('সর্বশেষ স্বয়ংক্রিয় ব্যাকআপ: আজ সকাল ০২:০০ AM · এনক্রিপ্টেড আর্কাইভ প্রস্তুত।', 'Last automated backup: Today 02:00 AM · Encrypted snapshot verified.', lang)}
              </p>
              <ProgressMeter label={b('ক্লাউড সিঙ্ক স্থিতি', 'Cloud Sync Integrity', lang)} value={100} detailText="Synced" />
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                <Lock className="w-4 h-4 text-emerald-600" />
                {b('বিদ্যালয়-ভিত্তিক ডেটা আইসোলেশন', 'School-wise Data Isolation', lang)}
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                {b(
                  `এই অ্যাকাউন্ট শুধুমাত্র ${ownSchool.code} বিদ্যালয়ের তথ্য দেখতে পারবে। অন্য বিদ্যালয়ের তথ্য ব্লক করা আছে।`,
                  `Access restricted strictly to ${ownSchool.code}. Cross-school queries are blocked.`,
                  lang
                )}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 text-xs">
          <div className="font-bold text-sm text-slate-900 dark:text-white">
            {ownSchool.nameBn} ({ownSchool.code}) — {b('অডিট ও কার্যক্রম সারাংশ', 'Audit & Activity Summary', lang)}
          </div>
          {auditLogs.map((log) => (
            <div key={log.id} className="py-2 border-b last:border-b-0 border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">{log.what} — {log.targetName}</div>
                <div className="text-slate-500">{sanitizeActorDisplayForRole(log.who, 'school_admin')} · {log.when}</div>
              </div>
              <span className="font-semibold text-blue-700 dark:text-blue-400">{log.newValue}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
