import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  Eye,
  FileBarChart2,
  FileCheck2,
  GraduationCap,
  Layers,
  Lock,
  MapPin,
  Megaphone,
  MoreVertical,
  Plus,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  Ban,
  Download,
  ArrowRight,
  KeyRound,
  Edit3,
  Bell,
  Play,
  PauseCircle,
  RotateCcw,
  Search,
  Filter,
  Info,
  Briefcase,
  History,
  Trash2,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  MessageSquare,
  Send,
  Database,
} from 'lucide-react';
import type {
  AcademicCalendarEvent,
  AcademicSubjectConfig,
  AcademicYearRecord,
  AdminAccount,
  AdminReviewerRole,
  ApprovalRequest,
  AssignmentItem,
  AuditLogEntry,
  BdLocationDatabase,
  ClassSectionRoomConfig,
  ClassTestQuizItem,
  ClassworkItem,
  ContactAdminMessage,
  CurriculumUnit,
  DailyLessonHomeworkItem,
  ExamRecord,
  ExamRoutineRecord,
  ExamScheduleItem,
  ExtraAcademicItem,
  GradingRuleItem,
  Language,
  LessonPlanItem,
  LocationNode,
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
  RolePermissionMatrix,
  RoutineSlot,
  SchoolAdminMember,
  SchoolDeactivationRecord,
  SchoolInspectionRecord,
  SchoolRecord,
  SchoolSuspensionDetails,
  SchoolTypeCode,
  StudentChangeRequest,
  StudentRecord,
  StudentStatus,
  StudyMaterialItem,
  SubjectResultSubmission,
  SubstitutePermissionRecord,
  TeacherApprovalCategory,
  TeacherChangeRequest,
  TeacherRecord,
  TeacherStatus,
  TeacherSubjectAssignment,
} from '../types';
import { AVATARS, CENTRAL_ADMIN_CREDENTIALS, NCTB_SUBJECTS } from '../data/mockData';
import {
  getSchoolTypeConfig,
  SCHOOL_TYPE_OPTIONS,
} from '../utils/schoolConfigAndAddress';
import {
  computeSchoolSummaryCounts,
  deriveApprovalStatus,
  filterSchools,
  type AdminManagementMode,
  type AdminManagementPayload,
  type SchoolEditPatch,
} from '../utils/schoolLifecycle';
import {
  computeTeacherSummaryCounts,
  deriveTeacherApprovalStatus,
  filterTeachers,
  TEACHER_APPROVAL_CATEGORIES,
  type TeacherEditPatch,
  type TeacherWorkflowActionPayload,
} from '../utils/teacherLifecycle';
import {
  ALL_GOVERNANCE_ACTIONS,
  computePipelineStage,
  deriveVerificationStatus,
  GOVERNED_ENTITIES,
  hasGovernancePermission,
  type VerificationQueueItem,
} from '../utils/governanceAndVerification';
import { b, tr } from '../i18n/translations';
import { ProgressMeter } from './Charts';
import type { ConfirmDialogState } from './Modals';
import { SchoolProfileView, type SchoolProfileSubTab } from './SchoolProfileView';
import {
  EditSchoolModal,
  SchoolAdminHandoverModal,
  SchoolDeactivationModal,
  SchoolInspectionModal,
  SchoolNoticeModal,
} from './SchoolGovernanceModals';
import { TeacherProfileView, type TeacherProfileSubTab } from './TeacherProfileView';
import {
  NewTeacherRegistrationModal,
  TeacherEditModal,
  TeacherNoticeModal,
  TeacherWorkflowActionModal,
} from './TeacherGovernanceModals';
import { StudentDirectoryPanel } from './StudentDirectoryPanel';
import type { StudentEditPatch } from '../utils/studentLifecycle';
import { VerificationCenterView } from './VerificationCenterView';
import { EntityReportAndActivityModal, type EntityModalTarget } from './EntityReportAndActivityModal';
import { AcademicManagementHub } from './AcademicManagementHub';
import { DEFAULT_NCTB_GRADING_RULES } from '../utils/academicEngine';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type CreateNoticePayload,
} from '../utils/notificationAndNoticeEngine';
import type { CreateLocalExamPayload } from '../utils/examGovernanceEngine';
import { CentralAdminResultControlPanel } from './ResultGovernancePanels';
import {
  DashboardNotificationPreview,
  NotificationCenterPanel,
} from './NotificationCenterView';
import { NoticeCommunicationCenter } from './NoticeCommunicationCenter';
import { ExaminationManagementPanel } from './ExaminationManagementPanel';
import { OfficialDocumentSystem } from './OfficialDocumentSystem';
import { ExamRoutineSystem } from './ExamRoutineSystem';
import { isMainCentralAdmin } from '../utils/adminAndTeacherIdentityEngine';
import { CentralRealtimeDataPanel } from './CentralRealtimeDataPanel';

interface CentralAdminViewsProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  lang: Language;
  searchQuery: string;
  schools: SchoolRecord[];
  teachers: TeacherRecord[];
  students: StudentRecord[];
  requests: ApprovalRequest[];
  auditLogs: AuditLogEntry[];
  adminAccounts: AdminAccount[];
  notices: NoticeItem[];
  notifications: NotificationItem[];
  locationDb: BdLocationDatabase;
  onOpenConfirm: (cfg: Omit<ConfirmDialogState, 'open'>) => void;
  onOpenSchoolReg: (mode: 'ONLINE' | 'MANUAL') => void;
  onOpenAddAdmin: () => void;
  onInspectStudent: (student: StudentRecord) => void;
  onUpdateRequestStatus: (reqId: string, status: ApprovalRequest['status'], reason: string) => void;
  onUpdateSchoolStatus: (schoolId: string, status: SchoolRecord['status'], reason: string) => void;
  onChangeSchoolType: (schoolId: string, newType: SchoolTypeCode, customSchoolType: string | undefined, reason: string) => void;
  onVerifyManualAddress: (schoolId: string, reason: string) => void;
  onDeleteSchool: (schoolId: string, reason: string) => void;
  onUpdateStudentStatus: (studentId: string, status: StudentStatus, reason: string) => void;
  studentRequests: StudentChangeRequest[];
  onEditStudent: (studentId: string, patch: StudentEditPatch) => void;
  onTransferStudent: (studentId: string, targetSchoolId: string, reason: string) => void;
  onSendStudentNotice: (student: StudentRecord, notice: NoticeItem) => void;
  onVerifyStudentDocument: (studentId: string, docId: string, verified: boolean) => void;
  onProcessStudentRequest: (
    reqId: string,
    decision: 'approved' | 'rejected' | 'under_review' | 'pending',
    note: string
  ) => void;
  onAddNotice: (notice: NoticeItem) => void;
  onToggleAdminStatus: (adminId: string, reason: string) => void;
  onAddLocationNode: (level: keyof BdLocationDatabase, node: LocationNode) => void;
  onToggleLocationActive: (level: keyof BdLocationDatabase, nodeId: string) => void;
  onEditSchoolInfo: (schoolId: string, patch: SchoolEditPatch) => void;
  onSuspendSchool: (schoolId: string, details: SchoolSuspensionDetails) => void;
  onReactivateSchool: (schoolId: string, reason: string) => void;
  onPermanentDeactivateSchool: (schoolId: string, record: SchoolDeactivationRecord) => void;
  onSendSchoolNotice: (school: SchoolRecord, notice: NoticeItem) => void;
  onSchoolAdminAction: (schoolId: string, payload: AdminManagementPayload) => void;
  onRecordInspection: (schoolId: string, inspection: SchoolInspectionRecord) => void;
  onReturnForRevision: (schoolId: string, note: string) => void;
  onAssignSchoolCodes: (schoolId: string, registrationId: string, code: string, eiin: string) => void;
  teacherRequests: TeacherChangeRequest[];
  routineSlots: RoutineSlot[];
  navKey?: number;
  onRegisterTeacher: (teacher: TeacherRecord) => void;
  onEditTeacherInfo: (teacherId: string, patch: TeacherEditPatch) => void;
  onTeacherWorkflowAction: (teacherId: string, payload: TeacherWorkflowActionPayload) => void;
  onUpdateTeacherStatus: (teacherId: string, status: TeacherStatus, reason: string) => void;
  onSendTeacherNotice: (teacher: TeacherRecord, notice: NoticeItem) => void;
  onProcessTeacherRequest: (reqId: string, decision: 'approved' | 'rejected' | 'under_review', note: string) => void;
  onVisitTeacherDashboard: (teacher: TeacherRecord) => void;
  permissionMatrix: RolePermissionMatrix;
  activeReviewerRole: AdminReviewerRole;
  onChangeReviewerRole: (role: AdminReviewerRole) => void;
  onTogglePermission: (role: AdminReviewerRole, key: PermissionKey) => void;
  onVerifyQueueItem: (
    item: VerificationQueueItem,
    decision: 'verified' | 'flagged',
    note: string
  ) => void;
  onVerifySchool: (schoolId: string, note: string) => void;
  onVerifyTeacher: (teacherId: string, note: string) => void;
  onVerifyStudent: (studentId: string, note: string) => void;
  onReissueTeacherId: (teacherId: string) => void;
  onReissueStudentId: (studentId: string) => void;
  // Academic Oversight Props
  exams?: ExamRecord[];
  assignments?: AssignmentItem[];
  academicYears?: AcademicYearRecord[];
  calendarEvents?: AcademicCalendarEvent[];
  classSections?: ClassSectionRoomConfig[];
  subjects?: AcademicSubjectConfig[];
  teacherAssignments?: TeacherSubjectAssignment[];
  classworks?: ClassworkItem[];
  curriculumUnits?: CurriculumUnit[];
  lessonPlans?: LessonPlanItem[];
  studyMaterials?: StudyMaterialItem[];
  classTests?: ClassTestQuizItem[];
  questionBank?: QuestionBankItem[];
  examSchedules?: ExamScheduleItem[];
  gradingRules?: GradingRuleItem[];
  extraItems?: ExtraAcademicItem[];
  dailyLessons?: DailyLessonHomeworkItem[];
  substitutePermissions?: SubstitutePermissionRecord[];
  subjectSubmissions?: SubjectResultSubmission[];
  resultAuditLogs?: ResultAuditEntry[];
  onToggleSchoolPublishPermission?: (schoolId: string, allow: boolean) => void;
  onPublishAllEligibleResults?: () => void;
  // Notification, Notice & Central Term Exam Control
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
  onToggleCentralTermPublish?: (examId: string, publish: boolean) => void;
  onCreateLocalExam?: (payload: CreateLocalExamPayload) => void;
  onUpdateExamMark?: (examId: string, studentId: string, subjectEn: string, written: number, mcq?: number) => void;
  masterRoutines?: MasterRoutineRecord[];
  // New Governance, Security, Docs, Exam Routines & Notice Images Props
  currentAdmin?: AdminAccount;
  contactAdminMessages?: ContactAdminMessage[];
  onUpdateContactMessageStatus?: (id: string, status: ContactAdminMessage['status'], replyNote?: string) => void;
  onUpdateAdminPermissions?: (adminId: string, permissions: string[], accessLevel: AdminAccount['accessLevel']) => void;
  onDeleteAdmin?: (adminId: string) => void;
  onOpenAddStudent?: () => void;
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
  onOpenAdminPhotoEditor?: () => void;
  onEditStudentPhoto?: (student: StudentRecord) => void;
  onEditTeacherPhoto?: (teacher: TeacherRecord) => void;
  onEditSchoolCover?: (school: SchoolRecord) => void;
  settingsCenterElement?: React.ReactNode;
}

export const CentralAdminViews: React.FC<CentralAdminViewsProps> = ({
  activeTab,
  onSelectTab,
  lang,
  searchQuery,
  schools,
  teachers,
  students,
  requests,
  auditLogs,
  adminAccounts,
  notices,
  notifications,
  locationDb,
  onOpenConfirm,
  onOpenSchoolReg,
  onOpenAddAdmin,
  onInspectStudent,
  onUpdateRequestStatus,
  onUpdateSchoolStatus,
  onChangeSchoolType,
  onVerifyManualAddress,
  onDeleteSchool,
  onUpdateStudentStatus,
  studentRequests,
  onEditStudent,
  onTransferStudent,
  onSendStudentNotice,
  onVerifyStudentDocument,
  onProcessStudentRequest,
  onAddNotice,
  onToggleAdminStatus,
  onAddLocationNode,
  onToggleLocationActive,
  onEditSchoolInfo,
  onSuspendSchool,
  onReactivateSchool,
  onPermanentDeactivateSchool,
  onSendSchoolNotice,
  onSchoolAdminAction,
  onRecordInspection,
  onReturnForRevision,
  onAssignSchoolCodes,
  teacherRequests,
  routineSlots,
  navKey = 0,
  onRegisterTeacher,
  onEditTeacherInfo,
  onTeacherWorkflowAction,
  onUpdateTeacherStatus,
  onSendTeacherNotice,
  onProcessTeacherRequest,
  onVisitTeacherDashboard,
  permissionMatrix,
  activeReviewerRole,
  onChangeReviewerRole,
  onTogglePermission,
  onVerifyQueueItem,
  onVerifySchool,
  onVerifyTeacher,
  onVerifyStudent,
  onReissueTeacherId,
  onReissueStudentId,
  exams = [],
  assignments = [],
  academicYears = [],
  calendarEvents = [],
  classSections = [],
  subjects = [],
  teacherAssignments = [],
  classworks = [],
  curriculumUnits = [],
  lessonPlans = [],
  studyMaterials = [],
  classTests = [],
  questionBank = [],
  examSchedules = [],
  gradingRules = DEFAULT_NCTB_GRADING_RULES,
  extraItems = [],
  dailyLessons = [],
  substitutePermissions = [],
  subjectSubmissions = [],
  resultAuditLogs = [],
  onToggleSchoolPublishPermission,
  onPublishAllEligibleResults,
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
  onToggleCentralTermPublish,
  onCreateLocalExam,
  onUpdateExamMark,
  masterRoutines = [],
  currentAdmin,
  contactAdminMessages = [],
  onUpdateContactMessageStatus,
  onUpdateAdminPermissions,
  onDeleteAdmin,
  onOpenAddStudent,
  officialDocuments = [],
  documentTemplates = [],
  onUpdateOfficialDocuments,
  examRoutines = [],
  onUpdateExamRoutines,
  maxNoticeImages = 4,
  onUpdateMaxNoticeImages,
  onUpdateNoticeImages,
  onOpenAdminPhotoEditor,
  onEditStudentPhoto,
  onEditTeacherPhoto,
  onEditSchoolCover,
  settingsCenterElement,
}) => {
  const can = (key: PermissionKey) =>
    hasGovernancePermission(permissionMatrix, activeReviewerRole, key);
  const [entityModal, setEntityModal] = useState<EntityModalTarget | null>(null);

  const [visitingSchoolId, setVisitingSchoolId] = useState<string | null>(null);
  const [profileInitialTab, setProfileInitialTab] = useState<SchoolProfileSubTab>('overview');
  const openSchoolProfile = (schoolId: string, subTab: SchoolProfileSubTab = 'overview') => {
    setProfileInitialTab(subTab);
    setVisitingSchoolId(schoolId);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const [visitingTeacherId, setVisitingTeacherId] = useState<string | null>(null);
  const [teacherProfileInitialTab, setTeacherProfileInitialTab] = useState<TeacherProfileSubTab>('overview');
  const openTeacherProfile = (teacherId: string, subTab: TeacherProfileSubTab = 'overview') => {
    setTeacherProfileInitialTab(subTab);
    setVisitingTeacherId(teacherId);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    setVisitingSchoolId(null);
    setVisitingTeacherId(null);
  }, [activeTab, navKey]);

  const [openMenuReqId, setOpenMenuReqId] = useState<string | null>(null);
  const [openMoreSchoolId, setOpenMoreSchoolId] = useState<string | null>(null);
  const [openMoreTeacherId, setOpenMoreTeacherId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [schoolTypeFilter, setSchoolTypeFilter] = useState<'ALL' | SchoolTypeCode>('ALL');

  // All Schools Filters
  const [schoolSearch, setSchoolSearch] = useState('');
  const [divFilter, setDivFilter] = useState('ALL');
  const [distFilter, setDistFilter] = useState('ALL');
  const [upzFilter, setUpzFilter] = useState('ALL');
  const [schoolStatusFilter, setSchoolStatusFilter] = useState('ALL');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState('ALL');
  const [regDateFilter, setRegDateFilter] = useState('');
  const [oversightSchoolId, setOversightSchoolId] = useState(schools[0]?.id ?? '');
  const [docSchoolId, setDocSchoolId] = useState(schools[0]?.id ?? '');
  const [examRoutineSchoolId, setExamRoutineSchoolId] = useState(schools[0]?.id ?? '');
  const [editingSubAdminId, setEditingSubAdminId] = useState<string | null>(null);
  const [editSubPerms, setEditSubPerms] = useState<string[]>([]);
  const [editSubLevel, setEditSubLevel] = useState<AdminAccount['accessLevel']>('Regional Reviewer');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  // Teacher Governance Filters & Modals State
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherSchoolFilter, setTeacherSchoolFilter] = useState('ALL');
  const [teacherStatusFilter, setTeacherStatusFilter] = useState('ALL');
  const [teacherReqCategoryFilter, setTeacherReqCategoryFilter] = useState<string>('ALL');
  const [showTeacherGuide, setShowTeacherGuide] = useState(false);
  const [newTeacherModalOpen, setNewTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRecord | null>(null);
  const [noticeTeacher, setNoticeTeacher] = useState<TeacherRecord | null>(null);
  const [workflowTeacherState, setWorkflowTeacherState] = useState<{
    teacher: TeacherRecord;
    category?: TeacherApprovalCategory;
  } | null>(null);

  // Governance Modals State
  const [editingSchool, setEditingSchool] = useState<SchoolRecord | null>(null);
  const [noticeSchool, setNoticeSchool] = useState<SchoolRecord | null>(null);
  const [deactivatingState, setDeactivatingState] = useState<{
    school: SchoolRecord;
    mode: 'suspend' | 'deactivate';
  } | null>(null);
  const [adminHandoverState, setAdminHandoverState] = useState<{
    school: SchoolRecord;
    mode: AdminManagementMode;
    targetAdmin?: SchoolAdminMember;
  } | null>(null);
  const [inspectionSchool, setInspectionSchool] = useState<SchoolRecord | null>(null);

  // Location Manager state
  const [locLevel, setLocLevel] = useState<keyof BdLocationDatabase>('districts');
  const [locParentId, setLocParentId] = useState('div-dhk');
  const [locNameBn, setLocNameBn] = useState('');
  const [locNameEn, setLocNameEn] = useState('');

  const visitingSchool = visitingSchoolId
    ? schools.find((s) => s.id === visitingSchoolId) ?? null
    : null;
  const visitingTeacher = visitingTeacherId
    ? teachers.find((t) => t.id === visitingTeacherId) ?? null
    : null;
  const teacherSummary = useMemo(() => computeTeacherSummaryCounts(teachers), [teachers]);

  const q = searchQuery.trim().toLowerCase();
  const pendingReqs = requests.filter((r) => r.status === 'pending' || r.status === 'under_review');
  const urgentReqs = pendingReqs.filter((r) => r.priority === 'urgent');

  const schoolSummary = useMemo(() => computeSchoolSummaryCounts(schools), [schools]);
  const divisionOptions = useMemo(() => Array.from(new Set(schools.map((s) => s.division))), [schools]);
  const districtOptions = useMemo(
    () =>
      Array.from(
        new Set(schools.filter((s) => divFilter === 'ALL' || s.division === divFilter).map((s) => s.district))
      ),
    [schools, divFilter]
  );
  const upazilaOptions = useMemo(
    () =>
      Array.from(
        new Set(
          schools
            .filter(
              (s) =>
                (divFilter === 'ALL' || s.division === divFilter) &&
                (distFilter === 'ALL' || s.district === distFilter)
            )
            .map((s) => s.upazila)
        )
      ),
    [schools, divFilter, distFilter]
  );

  const statusTextClass = (status: string) => {
    switch (status) {
      case 'verified':
      case 'active':
      case 'approved':
        return 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';
      case 'under_review':
        return 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800';
      case 'pending':
      case 'revision_requested':
        return 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800';
      case 'suspended':
      case 'rejected':
      case 'deactivated':
      case 'archived':
      case 'flagged':
        return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800';
      default:
        return 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  };

  const renderGovernanceModals = () => (
    <>
      <EditSchoolModal
        school={editingSchool}
        lang={lang}
        onClose={() => setEditingSchool(null)}
        onSave={onEditSchoolInfo}
      />
      <SchoolDeactivationModal
        school={deactivatingState?.school ?? null}
        initialMode={deactivatingState?.mode ?? 'suspend'}
        lang={lang}
        onClose={() => setDeactivatingState(null)}
        onSuspend={onSuspendSchool}
        onPermanentDeactivate={onPermanentDeactivateSchool}
      />
      <SchoolNoticeModal
        school={noticeSchool}
        lang={lang}
        onClose={() => setNoticeSchool(null)}
        onSendNotice={onSendSchoolNotice}
      />
      {adminHandoverState && (
        <SchoolAdminHandoverModal
          open={true}
          school={adminHandoverState.school}
          initialMode={adminHandoverState.mode}
          targetAdmin={adminHandoverState.targetAdmin}
          lang={lang}
          onClose={() => setAdminHandoverState(null)}
          onSubmit={onSchoolAdminAction}
        />
      )}
      {inspectionSchool && (
        <SchoolInspectionModal
          open={true}
          school={inspectionSchool}
          lang={lang}
          onClose={() => setInspectionSchool(null)}
          onSubmit={onRecordInspection}
        />
      )}
      <EntityReportAndActivityModal
        target={entityModal}
        lang={lang}
        auditLogs={auditLogs}
        onClose={() => setEntityModal(null)}
      />
    </>
  );

  const renderTeacherModals = () => (
    <>
      <NewTeacherRegistrationModal
        open={newTeacherModalOpen}
        schools={schools}
        existingTeachers={teachers}
        lang={lang}
        onClose={() => setNewTeacherModalOpen(false)}
        onRegister={onRegisterTeacher}
      />
      <TeacherEditModal
        teacher={editingTeacher}
        lang={lang}
        onClose={() => setEditingTeacher(null)}
        onSave={onEditTeacherInfo}
      />
      <TeacherNoticeModal
        teacher={noticeTeacher}
        lang={lang}
        onClose={() => setNoticeTeacher(null)}
        onSend={onSendTeacherNotice}
      />
      {workflowTeacherState && (
        <TeacherWorkflowActionModal
          teacher={workflowTeacherState.teacher}
          initialCategory={workflowTeacherState.category}
          schools={schools}
          lang={lang}
          onClose={() => setWorkflowTeacherState(null)}
          onSubmit={onTeacherWorkflowAction}
        />
      )}
      <EntityReportAndActivityModal
        target={entityModal}
        lang={lang}
        auditLogs={auditLogs}
        onClose={() => setEntityModal(null)}
      />
    </>
  );

  // Teacher Profile & Visit Sub-view
  if (visitingTeacher) {
    return (
      <>
        <TeacherProfileView
          teacher={visitingTeacher}
          initialSubTab={teacherProfileInitialTab}
          lang={lang}
          routineSlots={routineSlots}
          students={students}
          notifications={notifications}
          auditLogs={auditLogs}
          hasPermission={can}
          onBack={() => setVisitingTeacherId(null)}
          onOpenConfirm={onOpenConfirm}
          onOpenEditModal={(t) => setEditingTeacher(t)}
          onOpenNoticeModal={(t) => setNoticeTeacher(t)}
          onOpenWorkflowModal={(t, category) =>
            setWorkflowTeacherState({ teacher: t, category })
          }
          onUpdateTeacherStatus={onUpdateTeacherStatus}
          onVerifyTeacher={onVerifyTeacher}
          onReissueTeacherId={onReissueTeacherId}
          onOpenTeacherReport={(t) => setEntityModal({ kind: 'teacher', mode: 'report', entity: t })}
          onEditTeacherPhoto={onEditTeacherPhoto}
        />
        {renderTeacherModals()}
      </>
    );
  }

  // School Profile & Visit Sub-view
  if (visitingSchool) {
    return (
      <>
        <SchoolProfileView
          school={visitingSchool}
          initialSubTab={profileInitialTab}
          lang={lang}
          students={students}
          teachers={teachers}
          auditLogs={auditLogs}
          hasPermission={can}
          onBack={() => setVisitingSchoolId(null)}
          onInspectStudent={onInspectStudent}
          onOpenConfirm={onOpenConfirm}
          onUpdateSchoolStatus={onUpdateSchoolStatus}
          onReturnForRevision={onReturnForRevision}
          onAssignSchoolCodes={onAssignSchoolCodes}
          onChangeSchoolType={onChangeSchoolType}
          onVerifyManualAddress={onVerifyManualAddress}
          onOpenEditModal={(sc) => setEditingSchool(sc)}
          onOpenNoticeModal={(sc) => setNoticeSchool(sc)}
          onOpenDeactivateModal={(sc, mode) => setDeactivatingState({ school: sc, mode })}
          onReactivateSchool={onReactivateSchool}
          onOpenAdminHandover={(mode, targetAdmin) =>
            setAdminHandoverState({ school: visitingSchool, mode, targetAdmin })
          }
          onOpenInspectionModal={() => setInspectionSchool(visitingSchool)}
          onVerifySchool={onVerifySchool}
          onOpenSchoolReport={(sc) => setEntityModal({ kind: 'school', mode: 'report', entity: sc })}
          onArchiveSchool={(schoolId, reason) => onUpdateSchoolStatus(schoolId, 'archived', reason)}
          onEditSchoolCover={onEditSchoolCover}
        />
        {renderGovernanceModals()}
      </>
    );
  }



  // Dashboard View
  if (activeTab === 'dashboard') {
    const filteredRequests = requests.filter(
      (r) =>
        !q ||
        r.applicantName.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.schoolName.toLowerCase().includes(q)
    );

    return (
      <div className="space-y-6">
        {/* Emerald-Teal Gradient Hero Banner (matches Central Admin reference) */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-emerald-100/90 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-200" />
              <span>{b('জাতীয় কেন্দ্রীয় বিদ্যালয় প্রশাসন পোর্টাল', 'National Central School Governance Portal', lang)}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {b('কেন্দ্রীয় প্রশাসন ড্যাশবোর্ড (Central Admin Portal)', 'Central Administration Dashboard', lang)}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl">
              {b(
                'সকল নিবন্ধিত বিদ্যালয়, শিক্ষক, শিক্ষার্থী, অনুমোদন আবেদন এবং যাচাই কার্যক্রম এক স্থান থেকে পরিচালনা করুন।',
                'Central governance over registered schools, teachers, students, approval pipelines, and verification audits.',
                lang
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onSelectTab('approval')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approval Center
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('verification')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-emerald-600/70 hover:bg-emerald-600 border border-white/25 text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              Verification Center
            </button>
          </div>
        </div>

        {/* 4 Summary KPI Cards with Tinted Icon Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => onSelectTab('schools')}
            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors shadow-xs cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {b('মোট বিদ্যালয়', 'Total Schools', lang)}
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white mt-2">
              {(1240 + schools.length).toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-1.5 tabular-nums">
              Verified: {1195 + schools.filter((s) => s.status === 'verified').length} · {b('দেখুন', 'View', lang)} →
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('teachers')}
            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors shadow-xs cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {b('মোট শিক্ষক', 'Total Teachers', lang)}
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white mt-2">
              8,642
            </div>
            <div className="text-xs text-amber-700 dark:text-amber-400 font-semibold mt-1.5 tabular-nums">
              Pending Approval: 126 · {b('দেখুন', 'View', lang)} →
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('students')}
            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors shadow-xs cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {b('মোট শিক্ষার্থী', 'Total Students', lang)}
              </span>
              <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white mt-2">
              2,45,780
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-400 font-semibold mt-1.5 tabular-nums">
              Verification Pending: 1,284 · {b('দেখুন', 'View', lang)} →
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('approval')}
            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors shadow-xs cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Pending Requests
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white mt-2">
              {182 + pendingReqs.length}
            </div>
            <div className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1.5 tabular-nums">
              Urgent: {12 + urgentReqs.length} · {b('পর্যালোচনা করুন', 'Review', lang)} →
            </div>
          </button>
        </div>

        {/* Horizontal 6-Tile Quick Actions */}
        <section aria-label="Central Quick Actions" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {b('দ্রুত কার্যক্রম (Quick Actions)', 'Quick Actions', lang)}
            </h2>
            <span className="text-[11px] text-slate-500">{b('এক ক্লিকে কেন্দ্রীয় মডিউল', 'One-click governance shortcuts', lang)}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { id: 'approval', labelBn: 'Approval Center', labelEn: 'Approval Center', icon: CheckCircle2, badgeBg: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400' },
              { id: 'verification', labelBn: 'Verification Center', labelEn: 'Verification Center', icon: ShieldCheck, badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' },
              { id: 'schools', labelBn: 'বিদ্যালয় যাচাই', labelEn: 'Verify Schools', icon: Building2, badgeBg: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400' },
              { id: 'teachers', labelBn: 'শিক্ষক যাচাই', labelEn: 'Verify Teachers', icon: UserCheck, badgeBg: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400' },
              { id: 'students', labelBn: 'শিক্ষার্থী যাচাই', labelEn: 'Verify Students', icon: GraduationCap, badgeBg: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400' },
              { id: 'notices', labelBn: 'Central Notice', labelEn: 'Central Notice', icon: Megaphone, badgeBg: 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400' },
            ].map((act) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => onSelectTab(act.id)}
                  className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 hover:border-emerald-500 hover:bg-white dark:hover:bg-slate-800 transition-colors text-center cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${act.badgeBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {b(act.labelBn, act.labelEn, lang)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Dashboard Notification Preview (Role-Scoped + Since Last Visit) */}
        <DashboardNotificationPreview
          lang={lang}
          role="central_admin"
          notifications={notifications}
          preferences={notificationPreferences}
          lastLoginIso={lastLoginIso}
          onOpenNotificationCenter={() => onSelectTab('notifications')}
          onNavigateFromNotification={
            onNavigateFromNotification ?? ((item) => onSelectTab(item.targetTab ?? 'dashboard'))
          }
        />

        {/* Two-Column Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left: Recent Approval Requests */}
          <div className="xl:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('সাম্প্রতিক Approval Requests', 'Recent Approval Requests', lang)}
              </h2>
              <button
                type="button"
                onClick={() => onSelectTab('approval')}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {b('সব দেখুন', 'View all', lang)} →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-4 font-semibold">Request ID</th>
                    <th className="py-2.5 px-3 font-semibold">{b('ধরন', 'Type', lang)}</th>
                    <th className="py-2.5 px-3 font-semibold">{b('আবেদনকারী', 'Applicant', lang)}</th>
                    <th className="py-2.5 px-3 font-semibold">{b('তারিখ', 'Date', lang)}</th>
                    <th className="py-2.5 px-3 font-semibold">{b('অবস্থা', 'Status', lang)}</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {req.id}
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {b(req.typeLabelBn, req.typeLabelEn, lang)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{req.applicantName}</div>
                        <div className="text-[11px] text-slate-500">{req.schoolName}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap tabular-nums">
                        {req.submittedAt}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold ${statusTextClass(req.status)}`}>
                          {req.status === 'pending'
                            ? b('অপেক্ষমান', 'Pending', lang)
                            : req.status === 'under_review'
                              ? b('পর্যালোচনাধীন', 'Under Review', lang)
                              : req.status === 'revision_requested'
                                ? b('সংশোধন ফেরত', 'Revision Requested', lang)
                                : req.status === 'verified'
                                  ? b('যাচাইকৃত', 'Verified', lang)
                                  : req.status === 'rejected'
                                    ? b('প্রত্যাখ্যাত', 'Rejected', lang)
                                    : b('স্থগিত', 'Suspended', lang)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 relative">
                          <button
                            type="button"
                            onClick={() => {
                              const targetSchool = schools.find((s) => s.id === req.schoolId);
                              if (targetSchool) {
                                openSchoolProfile(targetSchool.id, 'overview');
                              }
                            }}
                            aria-label={`View ${req.id}`}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {req.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() =>
                                onOpenConfirm({
                                  title: b('অনুরোধ যাচাই ও অনুমোদন', 'Verify & Approve Request', lang),
                                  message: b(`${req.id} (${req.applicantName}) অনুমোদন করতে চান?`, `Approve request ${req.id} for ${req.applicantName}?`, lang),
                                  confirmLabel: tr('verify', lang),
                                  onConfirm: (reason) => onUpdateRequestStatus(req.id, 'verified', reason),
                                })
                              }
                              aria-label={`Verify ${req.id}`}
                              className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                            >
                              ✓ {b('যাচাই', 'Verify', lang)}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setOpenMenuReqId(openMenuReqId === req.id ? null : req.id)}
                            aria-label={`More actions for ${req.id}`}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                          {openMenuReqId === req.id && (
                            <div className="absolute right-0 top-8 w-36 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg z-20 p-1 text-left">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuReqId(null);
                                  onOpenConfirm({
                                    title: b('অনুরোধ স্থগিত করুন', 'Suspend Request', lang),
                                    message: b(`আপনি কি ${req.id} স্থগিত করতে চান?`, `Are you sure you want to suspend ${req.id}?`, lang),
                                    confirmLabel: tr('suspend', lang),
                                    danger: true,
                                    requireReason: true,
                                    onConfirm: (reason) => onUpdateRequestStatus(req.id, 'suspended', reason),
                                  });
                                }}
                                className="w-full px-2.5 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded cursor-pointer"
                              >
                                {tr('suspend', lang)}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Central Verification Progress */}
          <div className="xl:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Central Verification
              </h2>
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="space-y-3.5">
              <ProgressMeter label={b('বিদ্যালয় যাচাই', 'Schools Verified', lang)} value={96} detailText="1,198 / 1,245" barColorClass="bg-blue-700 dark:bg-blue-500" />
              <ProgressMeter label={b('শিক্ষক যাচাই', 'Teachers Verified', lang)} value={92} detailText="8,516 / 8,642" barColorClass="bg-emerald-600" />
              <ProgressMeter label={b('শিক্ষার্থী যাচাই', 'Students Verified', lang)} value={89} detailText="2,44,496 / 2,45,780" barColorClass="bg-sky-600" />
              <ProgressMeter label={b('ডকুমেন্ট যাচাই', 'Document Audit', lang)} value={84} detailText="84%" barColorClass="bg-indigo-600" />
              <ProgressMeter label={b('ডুপ্লিকেট শনাক্তকরণ', 'Duplicate Screening', lang)} value={98} detailText="98%" barColorClass="bg-teal-600" />
              <ProgressMeter label={b('ঠিকানা ও লোকেশন', 'Address / Geo Location', lang)} value={91} detailText="91%" barColorClass="bg-amber-600" />
            </div>
          </div>
        </div>

        {/* Full-Width Recent Activity & Audit Log */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Recent Activity & Audit Log
            </h2>
            <button
              type="button"
              onClick={() => onSelectTab('audit')}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              {b('সম্পূর্ণ অডিট লগ', 'Full Audit Log', lang)} →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-4 font-semibold">Who</th>
                  <th className="py-2.5 px-3 font-semibold">When</th>
                  <th className="py-2.5 px-3 font-semibold">What</th>
                  <th className="py-2.5 px-3 font-semibold">Request ID</th>
                  <th className="py-2.5 px-4 font-semibold">Old Value → New Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.slice(0, 6).map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{log.who}</td>
                    <td className="py-3 px-3 text-slate-500 tabular-nums whitespace-nowrap">{log.when}</td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{log.what}</div>
                      <div className="text-[11px] text-slate-500">{log.targetName}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">{log.requestId}</td>
                    <td className="py-3 px-4 tabular-nums">
                      <span className="text-slate-500 line-through mr-1.5">{log.oldValue}</span>
                      <ArrowRight className="inline w-3 h-3 text-slate-400 mr-1.5" />
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">{log.newValue}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clickable Status Filter Bar Footer */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {b('স্ট্যাটাস ফিল্টার ও দ্রুত নির্দেশিকা:', 'Quick Governance Filter:', lang)}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: b('Verified (যাচাইকৃত)', 'Verified', lang), status: 'verified', cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
              { label: b('Pending (অপেক্ষমান)', 'Pending', lang), status: 'pending', cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
              { label: b('Under Review (পর্যালোচনা)', 'Under Review', lang), status: 'under_review', cls: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
              { label: b('Suspended (স্থগিত)', 'Suspended', lang), status: 'suspended', cls: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' },
            ].map((item) => (
              <button
                key={item.status}
                type="button"
                onClick={() => {
                  setSchoolStatusFilter(item.status);
                  onSelectTab('schools');
                }}
                className={`px-3 py-1 rounded-lg border font-semibold cursor-pointer hover:opacity-90 ${item.cls}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // All Schools Dashboard / List
  if (activeTab === 'schools') {
    const effectiveSearch = schoolSearch.trim() ? schoolSearch : searchQuery;
    const visibleSchools = filterSchools(schools, {
      search: effectiveSearch,
      division: divFilter,
      district: distFilter,
      upazila: upzFilter,
      schoolType: schoolTypeFilter,
      status: schoolStatusFilter,
      approvalStatus: approvalStatusFilter,
      registrationDate: regDateFilter,
    });

    const summaryCards = [
      {
        id: 'total',
        labelBn: 'মোট বিদ্যালয়',
        labelEn: 'Total Schools',
        count: schoolSummary.total,
        filterStatus: 'ALL',
        filterApp: 'ALL',
        tone: 'text-slate-900 dark:text-white',
      },
      {
        id: 'approved',
        labelBn: 'অনুমোদিত / সক্রিয়',
        labelEn: 'Approved / Active',
        count: schoolSummary.approvedActive,
        filterStatus: 'approved_active',
        filterApp: 'ALL',
        tone: 'text-emerald-700 dark:text-emerald-400',
      },
      {
        id: 'pending',
        labelBn: 'অপেক্ষমান অনুমোদন',
        labelEn: 'Pending Approval',
        count: schoolSummary.pending + schoolSummary.revisionRequested,
        filterStatus: 'pending',
        filterApp: 'ALL',
        tone: 'text-amber-700 dark:text-amber-400',
      },
      {
        id: 'under_review',
        labelBn: 'পর্যালোচনাধীন',
        labelEn: 'Under Review',
        count: schoolSummary.underReview,
        filterStatus: 'under_review',
        filterApp: 'ALL',
        tone: 'text-blue-700 dark:text-blue-400',
      },
      {
        id: 'rejected',
        labelBn: 'প্রত্যাখ্যাত',
        labelEn: 'Rejected',
        count: schoolSummary.rejected,
        filterStatus: 'rejected',
        filterApp: 'ALL',
        tone: 'text-rose-700 dark:text-rose-400',
      },
      {
        id: 'suspended',
        labelBn: 'সাময়িক নিষ্ক্রিয়',
        labelEn: 'Suspended',
        count: schoolSummary.suspended,
        filterStatus: 'suspended',
        filterApp: 'ALL',
        tone: 'text-orange-700 dark:text-orange-400',
      },
      {
        id: 'deactivated',
        labelBn: 'স্থায়ী বাতিল',
        labelEn: 'Deactivated / Deleted',
        count: schoolSummary.deactivated,
        filterStatus: 'deactivated',
        filterApp: 'ALL',
        tone: 'text-red-700 dark:text-red-400',
      },
    ];

    const resetFilters = () => {
      setSchoolSearch('');
      setDivFilter('ALL');
      setDistFilter('ALL');
      setUpzFilter('ALL');
      setSchoolTypeFilter('ALL');
      setSchoolStatusFilter('ALL');
      setApprovalStatusFilter('ALL');
      setRegDateFilter('');
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {b('সকল বিদ্যালয় ব্যবস্থাপনা ও অনুমোদন ড্যাশবোর্ড', 'All Schools Governance & Management', lang)}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {b(
                'নিবন্ধন, পরিদর্শন, অনুমোদন, তথ্য ও GPS পরিবর্তন, School Admin হস্তান্তর এবং সাময়িক/স্থায়ী বাতিল নিয়ন্ত্রণ',
                'Registration, inspection, approval workflow, GPS & info editing, admin handover, and suspension/closure',
                lang
              )}
            </p>
          </div>
          {can('school:create') && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenSchoolReg('ONLINE')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4 shrink-0" />
                {b('নতুন বিদ্যালয় আবেদন', 'New School Application', lang)}
              </button>
              <button
                type="button"
                onClick={() => onOpenSchoolReg('MANUAL')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4 shrink-0" />
                {b('নতুন বিদ্যালয় নিবন্ধন', 'Register School (Admin)', lang)}
              </button>
            </div>
          )}
        </div>

        {/* 7 Summary Cards (Clickable Quick Filter) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
          {summaryCards.map((card) => {
            const isSelected = schoolStatusFilter === card.filterStatus;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setSchoolStatusFilter(card.filterStatus);
                  setApprovalStatusFilter(card.filterApp);
                }}
                className={`text-left rounded-xl p-3.5 border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-500'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400'
                }`}
              >
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                  {b(card.labelBn, card.labelEn, lang)}
                </div>
                <div className={`text-2xl font-bold tabular-nums mt-1 ${card.tone}`}>{card.count}</div>
              </button>
            );
          })}
        </div>

        {/* Search + Multi-Filter Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={schoolSearch}
                onChange={(e) => setSchoolSearch(e.target.value)}
                placeholder={b(
                  'স্কুলের নাম, School ID, EIIN বা School Admin নাম দিয়ে খুঁজুন...',
                  'Search by School Name, School ID, EIIN, or Admin Name...',
                  lang
                )}
                aria-label="Search schools"
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              {b('ফিল্টার রিসেট', 'Reset Filters', lang)}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
            <select
              value={divFilter}
              onChange={(e) => {
                setDivFilter(e.target.value);
                setDistFilter('ALL');
                setUpzFilter('ALL');
              }}
              aria-label="Filter by Division"
              className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              <option value="ALL">{b('সকল বিভাগ', 'All Divisions', lang)}</option>
              {divisionOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={distFilter}
              onChange={(e) => {
                setDistFilter(e.target.value);
                setUpzFilter('ALL');
              }}
              aria-label="Filter by District"
              className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              <option value="ALL">{b('সকল জেলা', 'All Districts', lang)}</option>
              {districtOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={upzFilter}
              onChange={(e) => setUpzFilter(e.target.value)}
              aria-label="Filter by Upazila"
              className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              <option value="ALL">{b('সকল উপজেলা', 'All Upazilas', lang)}</option>
              {upazilaOptions.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>

            <select
              value={schoolTypeFilter}
              onChange={(e) => setSchoolTypeFilter(e.target.value as 'ALL' | SchoolTypeCode)}
              aria-label="Filter by School Type"
              className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              <option value="ALL">{b('সকল স্কুল ধরন', 'All School Types', lang)}</option>
              {SCHOOL_TYPE_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>{o.code}</option>
              ))}
            </select>

            <select
              value={schoolStatusFilter}
              onChange={(e) => setSchoolStatusFilter(e.target.value)}
              aria-label="Filter by Status"
              className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              <option value="ALL">{b('সকল Status', 'All Statuses', lang)}</option>
              <option value="approved_active">Approved / Active</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="revision_requested">Revision Requested</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
              <option value="deactivated">Deactivated</option>
              <option value="archived">Archived</option>
            </select>

            <select
              value={approvalStatusFilter}
              onChange={(e) => setApprovalStatusFilter(e.target.value)}
              aria-label="Filter by Approval Status"
              className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              <option value="ALL">{b('Approval অবস্থা', 'Approval Status', lang)}</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="revision_requested">Revision Requested</option>
              <option value="rejected">Rejected</option>
            </select>

            <input
              type="date"
              value={regDateFilter}
              onChange={(e) => setRegDateFilter(e.target.value)}
              aria-label="Filter by Registration Date"
              className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>
        </div>

        {/* Schools Table (All 11 fields + Permission-gated Actions) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-900 dark:text-white">
              {b('বিদ্যালয় ডিরেক্টরি', 'Schools Directory', lang)} ({visibleSchools.length})
            </span>
            <span className="text-slate-500">
              {b('সক্রিয় অনুমতি ভূমিকা:', 'Active Reviewer Role:', lang)}{' '}
              <span className="font-semibold text-blue-700 dark:text-blue-400">{activeReviewerRole}</span>
            </span>
          </div>
          <div className="overflow-x-auto min-h-[280px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                  <th className="py-3 px-4 font-semibold">School ID</th>
                  <th className="py-3 px-3 font-semibold">{b('বিদ্যালয়ের নাম ও ঠিকানা', 'School Name & Address', lang)}</th>
                  <th className="py-3 px-3 font-semibold">{b('লোকেশন ও স্থাপিত', 'Location & Est.', lang)}</th>
                  <th className="py-3 px-3 font-semibold">{b('School Admin', 'School Admin', lang)}</th>
                  <th className="py-3 px-3 font-semibold text-right">{b('শিক্ষক / শিক্ষার্থী', 'Teachers / Students', lang)}</th>
                  <th className="py-3 px-3 font-semibold">{b('Status / Verify / Approval', 'Status / Verify / Approval', lang)}</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visibleSchools.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      {b('ফিল্টারের সাথে মিল থাকা কোনো বিদ্যালয় পাওয়া যায়নি।', 'No schools match the active search or filters.', lang)}
                    </td>
                  </tr>
                ) : (
                  visibleSchools.map((sc, idx) => {
                    const appSt = deriveApprovalStatus(sc);
                    const verSt = deriveVerificationStatus(sc);
                    const openUpward = idx >= 2 && idx >= visibleSchools.length - 2;
                    return (
                      <tr key={sc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono font-semibold text-slate-900 dark:text-white">{sc.code}</div>
                          <div className="font-mono text-[11px] text-slate-500">EIIN: {sc.eiin}</div>
                          <div className="font-mono text-[10px] text-slate-400">{sc.registrationId ?? `REG-${sc.code}`}</div>
                        </td>
                        <td className="py-3 px-3 min-w-[200px]">
                          <div className="font-semibold text-slate-900 dark:text-white">{sc.nameBn}</div>
                          <div className="text-[11px] text-slate-500">{sc.nameEn}</div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{sc.fullAddress}</div>
                          {sc.addressSource === 'MANUAL' && !sc.addressVerified && (
                            <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mt-0.5">
                              Address Entered Manually — Verification Required
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {sc.division} → {sc.district} → {sc.upazila}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {b('স্থাপিত:', 'Est:', lang)} <span className="tabular-nums font-semibold">{sc.establishedYear ?? '—'}</span> · {sc.schoolType}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">{sc.headTeacher}</div>
                          <div className="font-mono text-[11px] text-slate-500">{sc.mobile}</div>
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums font-semibold whitespace-nowrap">
                          <div>{sc.teacherCount} {b('শিক্ষক', 'Teachers', lang)}</div>
                          <div className="text-[11px] text-slate-500">{sc.studentCount} {b('শিক্ষার্থী', 'Students', lang)}</div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap space-y-1">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold ${statusTextClass(sc.status)}`}>
                              {sc.status}
                            </span>
                            <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold ${statusTextClass(verSt)}`}>
                              V: {verSt}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">Approval: <span className="font-semibold">{appSt}</span></div>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 relative">
                            {can('school:view') && (
                              <button
                                type="button"
                                onClick={() => openSchoolProfile(sc.id, 'overview')}
                                title={b('প্রোফাইল দেখুন', 'View School Profile', lang)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 shrink-0" />
                                <span>{b('দেখুন', 'View', lang)}</span>
                              </button>
                            )}
                            {can('school:edit') && (
                              <button
                                type="button"
                                onClick={() => setEditingSchool(sc)}
                                title={b('তথ্য পরিবর্তন', 'Edit School Information', lang)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                                <span>{b('এডিট', 'Edit', lang)}</span>
                              </button>
                            )}
                            {can('school:notice') && (
                              <button
                                type="button"
                                onClick={() => setNoticeSchool(sc)}
                                title={b('নোটিশ পাঠান', 'Send Notice', lang)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                              >
                                <Bell className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400 shrink-0" />
                                <span>{b('নোটিশ', 'Notice', lang)}</span>
                              </button>
                            )}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setOpenMoreSchoolId(openMoreSchoolId === sc.id ? null : sc.id)}
                                aria-label={`More actions for ${sc.code}`}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                              {openMoreSchoolId === sc.id && (
                                <div className={`absolute right-0 ${openUpward ? 'bottom-8' : 'top-8'} w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg z-30 p-1.5 text-left space-y-0.5`}>
                                  {can('school:view') && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMoreSchoolId(null);
                                        openSchoolProfile(sc.id, 'inspections');
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold cursor-pointer"
                                    >
                                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                                      <span>{b('ভিজিট ও পরিদর্শন', 'Visit & Inspect', lang)}</span>
                                    </button>
                                  )}
                                  {can('school:verify') && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMoreSchoolId(null);
                                        onOpenConfirm({
                                          title: b('বিদ্যালয়ের তথ্য যাচাই (Verify)', 'Verify School Details', lang),
                                          message: b(
                                            `"${sc.nameBn}"-এর নিবন্ধন, EIIN ও অবস্থান তথ্য যাচাইকৃত হিসেবে চিহ্নিত করতে চান?`,
                                            `Verify details and documents for "${sc.nameEn}"?`,
                                            lang
                                          ),
                                          confirmLabel: b('যাচাই সম্পন্ন', 'Mark Verified', lang),
                                          onConfirm: (note) => onVerifySchool(sc.id, note),
                                        });
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 font-semibold cursor-pointer"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                      <span>{b('তথ্য যাচাই (Verify)', 'Verify School Info', lang)}</span>
                                    </button>
                                  )}
                                  {can('school:approve') && (sc.status === 'pending' || sc.status === 'under_review' || sc.status === 'revision_requested') && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMoreSchoolId(null);
                                        onOpenConfirm({
                                          title: b('বিদ্যালয় অনুমোদন প্রদান', 'Approve School Registration', lang),
                                          message: b(`"${sc.nameBn}"-কে অনুমোদন ও সক্রিয় করতে চান?`, `Approve and activate "${sc.nameEn}"?`, lang),
                                          confirmLabel: b('অনুমোদন করুন', 'Approve School', lang),
                                          onConfirm: (reason) => onUpdateSchoolStatus(sc.id, 'active', reason),
                                        });
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                      <span>{b('অনুমোদন করুন (Approve)', 'Approve School', lang)}</span>
                                    </button>
                                  )}
                                  {can('school:restore') && (sc.status === 'suspended' || sc.status === 'deactivated' || sc.status === 'archived') && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMoreSchoolId(null);
                                        onOpenConfirm({
                                          title: b('বিদ্যালয় পুনরুদ্ধার / সক্রিয় করুন', 'Restore / Reactivate School', lang),
                                          message: b(`"${sc.nameBn}"-কে পুনরায় সক্রিয় (Active) করতে চান?`, `Restore "${sc.nameEn}" to active?`, lang),
                                          confirmLabel: b('সক্রিয় করুন', 'Restore / Activate', lang),
                                          requireReason: true,
                                          onConfirm: (reason) => onReactivateSchool(sc.id, reason),
                                        });
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold cursor-pointer"
                                    >
                                      <Play className="w-3.5 h-3.5 shrink-0" />
                                      <span>{b('পুনরুদ্ধার (Restore)', 'Restore / Activate', lang)}</span>
                                    </button>
                                  )}
                                  {can('school:suspend') && sc.status !== 'suspended' && sc.status !== 'deactivated' && sc.status !== 'archived' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMoreSchoolId(null);
                                        setDeactivatingState({ school: sc, mode: 'suspend' });
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-semibold cursor-pointer"
                                    >
                                      <PauseCircle className="w-3.5 h-3.5 shrink-0" />
                                      <span>{b('সাময়িক নিষ্ক্রিয় (Suspend)', 'Suspend School', lang)}</span>
                                    </button>
                                  )}
                                  {can('school:deactivate') && sc.status !== 'deactivated' && sc.status !== 'archived' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMoreSchoolId(null);
                                        setDeactivatingState({ school: sc, mode: 'deactivate' });
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold cursor-pointer"
                                    >
                                      <Ban className="w-3.5 h-3.5 shrink-0" />
                                      <span>{b('স্থায়ী বাতিল (Deactivate)', 'Permanent Deactivate', lang)}</span>
                                    </button>
                                  )}
                                  {can('school:delete_archive') && sc.status !== 'archived' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMoreSchoolId(null);
                                        onOpenConfirm({
                                          title: b('বিদ্যালয় আর্কাইভ / অপসারণ', 'Archive / Delete School', lang),
                                          message: b(
                                            `"${sc.nameBn}"-কে আর্কাইভ করলে পূর্বের অডিট ও ইতিহাস অক্ষত থাকবে এবং প্রয়োজনে Restore করা যাবে।`,
                                            `Archive "${sc.nameEn}"? Audit history stays intact and can be restored.`,
                                            lang
                                          ),
                                          confirmLabel: b('আর্কাইভ করুন', 'Archive School', lang),
                                          danger: true,
                                          requireReason: true,
                                          onConfirm: (reason) => onUpdateSchoolStatus(sc.id, 'archived', reason),
                                        });
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                      <span>{b('আর্কাইভ / অপসারণ (Delete)', 'Delete / Archive', lang)}</span>
                                    </button>
                                  )}
                                  {can('school:edit') && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMoreSchoolId(null);
                                        openSchoolProfile(sc.id, 'admins');
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                                    >
                                      <UserCheck className="w-3.5 h-3.5 shrink-0" />
                                      <span>{b('School Admin হস্তান্তর', 'Admin Handover', lang)}</span>
                                    </button>
                                  )}
                                  {can('school:activity_history') && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMoreSchoolId(null);
                                        setEntityModal({ kind: 'school', mode: 'history', entity: sc });
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                                    >
                                      <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                                      <span>{b('Activity History দেখুন', 'Activity History', lang)}</span>
                                    </button>
                                  )}
                                  {can('school:reports') && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMoreSchoolId(null);
                                        setEntityModal({ kind: 'school', mode: 'report', entity: sc });
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-semibold cursor-pointer"
                                    >
                                      <FileBarChart2 className="w-3.5 h-3.5 shrink-0" />
                                      <span>{b('রিপোর্ট দেখুন (Reports)', 'View Reports', lang)}</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        {renderGovernanceModals()}
      </div>
    );
  }

  // Central Admin Student Governance, Statistics (Class 1-10, School, Geo), Transfer & Change Review Hub
  if (activeTab === 'students') {
    return (
      <StudentDirectoryPanel
        actorRole="central_admin"
        lang={lang}
        globalSearch={searchQuery}
        students={students}
        schools={schools}
        studentRequests={studentRequests}
        auditLogs={auditLogs}
        notifications={notifications}
        navKey={navKey}
        senderLabel={`${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`}
        hasPermission={can}
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

  // Teacher Approval & Governance Hub
  if (activeTab === 'teachers') {
    const effectiveTeacherSearch = teacherSearch.trim() ? teacherSearch : searchQuery;
    const visibleTeachers = filterTeachers(teachers, {
      search: effectiveTeacherSearch,
      schoolId: teacherSchoolFilter,
      status: teacherStatusFilter,
    });

    const filteredTeacherReqs = teacherRequests.filter(
      (req) => teacherReqCategoryFilter === 'ALL' || req.category === teacherReqCategoryFilter
    );

    const teacherSummaryCards = [
      {
        id: 'ALL',
        labelBn: 'মোট শিক্ষক',
        labelEn: 'Total Teacher',
        count: teacherSummary.total,
        tone: 'text-slate-900 dark:text-white',
      },
      {
        id: 'active',
        labelBn: 'অনুমোদিত / সক্রিয়',
        labelEn: 'Approved / Active',
        count: teacherSummary.active,
        tone: 'text-emerald-700 dark:text-emerald-400',
      },
      {
        id: 'pending',
        labelBn: 'অপেক্ষমান অনুমোদন',
        labelEn: 'Pending Approval',
        count: teacherSummary.pending,
        tone: 'text-amber-700 dark:text-amber-400',
      },
      {
        id: 'under_review',
        labelBn: 'পর্যালোচনাধীন',
        labelEn: 'Under Review',
        count: teacherSummary.under_review,
        tone: 'text-blue-700 dark:text-blue-400',
      },
      {
        id: 'rejected',
        labelBn: 'প্রত্যাখ্যাত',
        labelEn: 'Rejected',
        count: teacherSummary.rejected,
        tone: 'text-rose-700 dark:text-rose-400',
      },
      {
        id: 'suspended',
        labelBn: 'সাময়িক স্থগিত',
        labelEn: 'Suspended',
        count: teacherSummary.suspended,
        tone: 'text-orange-700 dark:text-orange-400',
      },
      {
        id: 'deactivated',
        labelBn: 'নিষ্ক্রিয় / বাতিল',
        labelEn: 'Deactivated / Deleted',
        count: teacherSummary.deactivated,
        tone: 'text-red-700 dark:text-red-400',
      },
    ];

    const resetTeacherFilters = () => {
      setTeacherSearch('');
      setTeacherSchoolFilter('ALL');
      setTeacherStatusFilter('ALL');
    };

    return (
      <div className="space-y-5">
        {/* Header & Primary Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {b('শিক্ষক অনুমোদন ও ব্যবস্থাপনা ড্যাশবোর্ড', 'Teacher Approval & Governance Hub', lang)}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {b(
                'নতুন নিবন্ধন, নিয়োগ, পদোন্নতি, বদলি, বিদ্যালয়/শাখা/বিষয়/দায়িত্ব পরিবর্তন, স্থগিত/পুনর্বহাল ও ৩-মুখী নোটিফিকেশন',
                'Registration, appointment, promotion, transfer, school/subject/duty changes, suspension, & 3-way alerts',
                lang
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTeacherGuide((g) => !g)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 whitespace-nowrap cursor-pointer"
            >
              <Info className="w-4 h-4 shrink-0" />
              <span>{b('কিভাবে কাজ করবে (Workflow Guide)', 'How It Works (18 Steps)', lang)}</span>
              {showTeacherGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {can('teacher:create') && (
              <button
                type="button"
                onClick={() => setNewTeacherModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4 shrink-0" />
                {b('নতুন শিক্ষক নিবন্ধন', 'Register New Teacher', lang)}
              </button>
            )}
          </div>
        </div>

        {/* Interactive How-It-Works Guidance & All 18 Governance Categories */}
        {showTeacherGuide && (
          <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                  {b('নির্দেশনা: শিক্ষক অনুমোদন ব্যবস্থা কিভাবে কাজ করবে (১৮টি ধাপ)', 'Workflow Guide: How Teacher Approval Governance Works (18 Categories)', lang)}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  {b(
                    '১. নতুন আবেদন বা পরিবর্তন অনুরোধ যাচাই → ২. অনুমোদন / পর্যালোচনা / তথ্য সংশোধন প্রয়োগ → ৩. Teacher Profile → Approval History, Audit Log এবং Central Admin, School Admin ও শিক্ষকের কাছে তাৎক্ষণিক নোটিফিকেশন প্রেরণ।',
                    '1. Review request/application → 2. Approve, review, or apply workflow change → 3. Immutable Teacher Approval History, Audit Log, and 3-way Notifications (Central Admin, School Admin & Teacher).',
                    lang
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTeacherGuide(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                {b('বন্ধ করুন', 'Collapse', lang)}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 text-xs">
              {TEACHER_APPROVAL_CATEGORIES.map((cat, idx) => (
                <div
                  key={cat.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40"
                >
                  <div className="font-bold text-slate-900 dark:text-white">
                    {idx + 1}. {b(cat.labelBn, cat.labelEn, lang)}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                    {b(cat.howItWorksBn, cat.howItWorksEn, lang)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7 Clickable Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
          {teacherSummaryCards.map((card) => {
            const isSelected = teacherStatusFilter === card.id;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setTeacherStatusFilter(card.id)}
                className={`text-left rounded-xl p-3.5 border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-500'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400'
                }`}
              >
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                  {b(card.labelBn, card.labelEn, lang)}
                </div>
                <div className={`text-2xl font-bold tabular-nums mt-1 ${card.tone}`}>{card.count}</div>
              </button>
            );
          })}
        </div>

        {/* Pending Teacher Approval & Change Requests Queue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('শিক্ষক অনুমোদন ও পরিবর্তন অনুরোধ সারি', 'Teacher Approval & Change Request Queue', lang)} ({filteredTeacherReqs.length})
              </h2>
              <p className="text-[11px] text-slate-500">
                {b('নিবন্ধন, পদোন্নতি, বদলি, শ্রেণি/বিষয় বরাদ্দ ও তথ্য পরিবর্তনের আবেদন যাচাই করুন', 'Verify onboarding, promotion, transfer, allocation & profile update requests', lang)}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={teacherReqCategoryFilter}
                onChange={(e) => setTeacherReqCategoryFilter(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold outline-none cursor-pointer"
              >
                <option value="ALL">{b('সকল ১৮টি ক্যাটাগরি', 'All 18 Categories', lang)}</option>
                {TEACHER_APPROVAL_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {b(c.labelBn, c.labelEn, lang)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                  <th className="py-2.5 px-4 font-semibold">Req ID</th>
                  <th className="py-2.5 px-3 font-semibold">{b('শিক্ষক ও বিদ্যালয়', 'Teacher & School', lang)}</th>
                  <th className="py-2.5 px-3 font-semibold">{b('ক্যাটাগরি', 'Category', lang)}</th>
                  <th className="py-2.5 px-3 font-semibold">{b('পরিবর্তন (Current → Proposed)', 'Change (Current → Proposed)', lang)}</th>
                  <th className="py-2.5 px-3 font-semibold">{b('অবস্থা', 'Status', lang)}</th>
                  <th className="py-2.5 px-4 font-semibold text-right">{b('সিদ্ধান্ত', 'Decision', lang)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTeacherReqs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      {b('এই ক্যাটাগরিতে কোনো আবেদন পাওয়া যায়নি।', 'No requests found for this category.', lang)}
                    </td>
                  </tr>
                ) : (
                  filteredTeacherReqs.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-semibold whitespace-nowrap">{req.id}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{req.teacherNameBn}</div>
                        <div className="text-[11px] text-slate-500">
                          {req.schoolNameBn} · {req.submittedAt}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-indigo-700 dark:text-indigo-400">
                        {b(req.titleBn, req.titleEn, lang)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-slate-500">{req.currentValue}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-900 dark:text-white">{req.proposedValue}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{req.reason}</div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold ${statusTextClass(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openTeacherProfile(req.teacherId, 'approval_history')}
                            title={b('প্রোফাইল ও হিস্ট্রি', 'View Profile & History', lang)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {(req.status === 'pending' || req.status === 'under_review') && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenConfirm({
                                    title: b('আবেদন অনুমোদন করুন', 'Approve Teacher Request', lang),
                                    message: b(
                                      `${req.teacherNameBn}-এর "${req.titleBn}" (${req.proposedValue}) অনুমোদন করতে চান?`,
                                      `Approve "${req.titleEn}" for ${req.teacherNameBn}?`,
                                      lang
                                    ),
                                    confirmLabel: b('অনুমোদন দিন', 'Approve', lang),
                                    onConfirm: (note) => onProcessTeacherRequest(req.id, 'approved', note),
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold whitespace-nowrap cursor-pointer"
                              >
                                {b('অনুমোদন', 'Approve', lang)}
                              </button>
                              {req.status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => onProcessTeacherRequest(req.id, 'under_review', 'পর্যালোচনার জন্য গৃহীত')}
                                  className="px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold whitespace-nowrap cursor-pointer"
                                >
                                  {b('পর্যালোচনা', 'Review', lang)}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenConfirm({
                                    title: b('আবেদন প্রত্যাখ্যান করুন', 'Reject Teacher Request', lang),
                                    message: b(`${req.teacherNameBn}-এর আবেদন প্রত্যাখ্যানের কারণ লিখুন:`, `Provide reason to reject ${req.id}:`, lang),
                                    confirmLabel: b('প্রত্যাখ্যান', 'Reject', lang),
                                    danger: true,
                                    requireReason: true,
                                    onConfirm: (note) => onProcessTeacherRequest(req.id, 'rejected', note),
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 font-semibold whitespace-nowrap cursor-pointer"
                              >
                                {b('প্রত্যাখ্যান', 'Reject', lang)}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="relative lg:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                placeholder={b('শিক্ষকের নাম / Teacher ID / বিষয় / মোবাইল দিয়ে খুঁজুন...', 'Search Teacher Name / Teacher ID / Subject / Mobile...', lang)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>
            <select
              value={teacherSchoolFilter}
              onChange={(e) => setTeacherSchoolFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">{b('সকল বিদ্যালয়', 'All Schools', lang)}</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameBn} ({s.code})
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <select
                value={teacherStatusFilter}
                onChange={(e) => setTeacherStatusFilter(e.target.value)}
                className="flex-1 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">{b('সকল অবস্থা', 'All Status', lang)}</option>
                <option value="active">{b('অনুমোদিত / সক্রিয়', 'Approved / Active', lang)}</option>
                <option value="pending">{b('অপেক্ষমান', 'Pending Approval', lang)}</option>
                <option value="under_review">{b('পর্যালোচনাধীন', 'Under Review', lang)}</option>
                <option value="rejected">{b('প্রত্যাখ্যাত', 'Rejected', lang)}</option>
                <option value="suspended">{b('সাময়িক স্থগিত', 'Suspended', lang)}</option>
                <option value="deactivated">{b('নিষ্ক্রিয় / বাতিল', 'Deactivated / Deleted', lang)}</option>
                <option value="archived">{b('আর্কাইভ', 'Archived', lang)}</option>
              </select>
              <button
                type="button"
                onClick={resetTeacherFilters}
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold whitespace-nowrap cursor-pointer"
              >
                {b('রিসেট', 'Reset', lang)}
              </button>
            </div>
          </div>
        </div>

        {/* All-Schools Teachers Table (Photo, ID, Name, School, Subject, Designation, Contact, Status, Verification, Approval) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-900 dark:text-white">
              {b('সকল বিদ্যালয়ের শিক্ষক তালিকা', 'All-Schools Teacher Directory', lang)} ({visibleTeachers.length})
            </span>
            <span className="text-slate-500">
              {b('সক্রিয় অনুমতি ভূমিকা:', 'Active Reviewer Role:', lang)}{' '}
              <span className="font-semibold text-blue-700 dark:text-blue-400">{activeReviewerRole}</span>
            </span>
          </div>

          <div className="overflow-x-auto min-h-[280px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                  <th className="py-3 px-4 font-semibold">Teacher ID</th>
                  <th className="py-3 px-3 font-semibold">{b('ছবি ও নাম', 'Photo & Name', lang)}</th>
                  <th className="py-3 px-3 font-semibold">{b('বিদ্যালয়', 'School', lang)}</th>
                  <th className="py-3 px-3 font-semibold">{b('বিষয় ও পদবি', 'Subject & Designation', lang)}</th>
                  <th className="py-3 px-3 font-semibold">{b('যোগাযোগ', 'Contact', lang)}</th>
                  <th className="py-3 px-3 font-semibold">{b('Status / Verify / Approval', 'Status / Verify / Approval', lang)}</th>
                  <th className="py-3 px-4 font-semibold text-right">{b('কার্যক্রম', 'Actions', lang)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visibleTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      {b('ফিল্টারের সাথে মিল থাকা কোনো শিক্ষক পাওয়া যায়নি।', 'No teachers match the current search or filters.', lang)}
                    </td>
                  </tr>
                ) : (
                  visibleTeachers.map((t, idx) => {
                    const appStatus = deriveTeacherApprovalStatus(t);
                    const verStatus = deriveVerificationStatus(t);
                    const openUpward = idx >= 2 && idx >= visibleTeachers.length - 2;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono font-semibold text-slate-900 dark:text-white">{t.teacherCode}</div>
                          <div className="font-mono text-[10px] text-slate-400">{t.joiningDate}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={t.photoUrl ?? AVATARS.headTeacher}
                              alt={t.nameEn}
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">{t.nameBn}</div>
                              <div className="text-[11px] text-slate-500">{t.nameEn} · {t.qualification}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{t.schoolNameBn}</div>
                          <div className="text-[11px] text-slate-500">{t.branchName ?? b('মূল ক্যাম্পাস', 'Main Campus', lang)}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{t.designation}</div>
                          <div className="text-[11px] text-slate-500">{t.subjects.join(', ')}</div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-mono font-medium text-slate-800 dark:text-slate-200">{t.mobile}</div>
                          <div className="text-[11px] text-slate-500">{t.email}</div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap space-y-1">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold ${statusTextClass(t.status)}`}>
                              {t.status}
                            </span>
                            <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold ${statusTextClass(verStatus)}`}>
                              V: {verStatus}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">Approval: <span className="font-semibold">{appStatus}</span></div>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 relative">
                            {can('teacher:view') && (
                              <button
                                type="button"
                                onClick={() => openTeacherProfile(t.id, 'overview')}
                                title={b('শিক্ষকের প্রোফাইল দেখুন', 'View Teacher Profile', lang)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 shrink-0" />
                                <span>{b('দেখুন', 'View', lang)}</span>
                              </button>
                            )}
                            {can('teacher:edit') && (
                              <button
                                type="button"
                                onClick={() => setEditingTeacher(t)}
                                title={b('শিক্ষকের তথ্য এডিট করুন', 'Edit Teacher Information', lang)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                                <span>{b('এডিট', 'Edit', lang)}</span>
                              </button>
                            )}
                            {can('teacher:notice') && (
                              <button
                                type="button"
                                onClick={() => setNoticeTeacher(t)}
                                title={b('শিক্ষককে নোটিশ পাঠান', 'Send Notice to Teacher', lang)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                              >
                                <Bell className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400 shrink-0" />
                                <span>{b('নোটিশ', 'Notice', lang)}</span>
                              </button>
                            )}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setOpenMoreTeacherId(openMoreTeacherId === t.id ? null : t.id)}
                                aria-label={`More actions for ${t.teacherCode}`}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                              {openMoreTeacherId === t.id && (
                                <div className={`absolute right-0 ${openUpward ? 'bottom-8' : 'top-8'} w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg z-30 p-1.5 text-left space-y-0.5`}>
                                  {can('teacher:view') && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMoreTeacherId(null);
                                        onVisitTeacherDashboard(t);
                                        openTeacherProfile(t.id, 'dashboard_visit');
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold cursor-pointer"
                                    >
                                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                                      <span>{b('ড্যাশবোর্ড ভিজিট', 'Visit Dashboard', lang)}</span>
                                    </button>
                                  )}
                                  {can('teacher:verify') && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMoreTeacherId(null);
                                        onOpenConfirm({
                                          title: b('শিক্ষকের তথ্য ও সনদ যাচাই', 'Verify Teacher Profile', lang),
                                          message: b(
                                            `"${t.nameBn}" (${t.teacherCode})-এর যোগ্যতা ও NID যাচাইকৃত হিসেবে চিহ্নিত করতে চান?`,
                                            `Verify qualification and ID details for "${t.nameEn}"?`,
                                            lang
                                          ),
                                          confirmLabel: b('যাচাই সম্পন্ন', 'Mark Verified', lang),
                                          onConfirm: (note) => onVerifyTeacher(t.id, note),
                                        });
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 font-semibold cursor-pointer"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                      <span>{b('তথ্য যাচাই (Verify)', 'Verify Teacher', lang)}</span>
                                    </button>
                                  )}
                                  {can('teacher:approve') && t.status !== 'active' && t.status !== 'suspended' && t.status !== 'deactivated' && t.status !== 'archived' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMoreTeacherId(null);
                                        onOpenConfirm({
                                          title: b('শিক্ষক অনুমোদন ও সক্রিয় করুন', 'Approve & Activate Teacher', lang),
                                          message: b(`"${t.nameBn}"-কে অনুমোদন ও সক্রিয় (Active) করতে চান?`, `Approve "${t.nameEn}"?`, lang),
                                          confirmLabel: b('অনুমোদন করুন', 'Approve', lang),
                                          requireReason: true,
                                          onConfirm: (reason) => onUpdateTeacherStatus(t.id, 'active', reason),
                                        });
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                      <span>{b('অনুমোদন করুন (Approve)', 'Approve Teacher', lang)}</span>
                                    </button>
                                  )}
                                  {can('teacher:restore') && (t.status === 'suspended' || t.status === 'deactivated' || t.status === 'archived') && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMoreTeacherId(null);
                                        onOpenConfirm({
                                          title: b('শিক্ষক পুনরুদ্ধার / পুনর্বহাল', 'Restore Teacher', lang),
                                          message: b(`"${t.nameBn}"-কে পুনরায় সক্রিয় (Active) করতে চান?`, `Restore "${t.nameEn}" to active?`, lang),
                                          confirmLabel: b('পুনরুদ্ধার করুন', 'Restore', lang),
                                          requireReason: true,
                                          onConfirm: (reason) => onUpdateTeacherStatus(t.id, 'active', reason),
                                        });
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold cursor-pointer"
                                    >
                                      <Play className="w-3.5 h-3.5 shrink-0" />
                                      <span>{b('পুনরুদ্ধার (Restore)', 'Restore Teacher', lang)}</span>
                                    </button>
                                  )}
                                  {can('teacher:transfer') && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMoreTeacherId(null);
                                        setWorkflowTeacherState({ teacher: t, category: 'transfer_approval' });
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-semibold cursor-pointer"
                                    >
                                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                                      <span>{b('বদলি / বিদ্যালয় পরিবর্তন', 'Transfer School', lang)}</span>
                                    </button>
                                  )}
                                  {can('teacher:reissue_id') && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMoreTeacherId(null);
                                        onReissueTeacherId(t.id);
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-semibold cursor-pointer"
                                    >
                                      <CreditCard className="w-3.5 h-3.5 shrink-0" />
                                      <span>{b('আইডি কার্ড পুনঃইস্যু', 'Re-issue Teacher ID', lang)}</span>
                                    </button>
                                  )}
                                  {(can('teacher:edit') || can('teacher:approve')) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMoreTeacherId(null);
                                        setWorkflowTeacherState({ teacher: t });
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-semibold cursor-pointer"
                                    >
                                      <Briefcase className="w-3.5 h-3.5 shrink-0" />
                                      <span>{b('১৮টি ওয়ার্কফ্লো কার্যক্রম', '18 Workflow Actions', lang)}</span>
                                    </button>
                                  )}
                                  {can('teacher:suspend') && t.status !== 'suspended' && t.status !== 'deactivated' && t.status !== 'archived' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMoreTeacherId(null);
                                        onOpenConfirm({
                                          title: b('শিক্ষক সাময়িক স্থগিত (Suspend)', 'Suspend Teacher', lang),
                                          message: b(`"${t.nameBn}"-কে সাময়িক স্থগিত করার কারণ উল্লেখ করুন:`, `Provide reason to suspend "${t.nameEn}":`, lang),
                                          confirmLabel: b('স্থগিত করুন', 'Suspend', lang),
                                          danger: true,
                                          requireReason: true,
                                          onConfirm: (reason) => onUpdateTeacherStatus(t.id, 'suspended', reason),
                                        });
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-semibold cursor-pointer"
                                    >
                                      <PauseCircle className="w-3.5 h-3.5 shrink-0" />
                                      <span>{b('সাময়িক স্থগিত (Suspend)', 'Suspend Teacher', lang)}</span>
                                    </button>
                                  )}
                                  {can('teacher:deactivate') && t.status !== 'deactivated' && t.status !== 'archived' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMoreTeacherId(null);
                                        onOpenConfirm({
                                          title: b('শিক্ষক নিষ্ক্রিয় করুন (Deactivate)', 'Deactivate Teacher', lang),
                                          message: b(`"${t.nameBn}"-কে নিষ্ক্রিয় করার কারণ লিখুন:`, `Reason to deactivate "${t.nameEn}":`, lang),
                                          confirmLabel: b('নিষ্ক্রিয় করুন', 'Deactivate', lang),
                                          danger: true,
                                          requireReason: true,
                                          onConfirm: (reason) => onUpdateTeacherStatus(t.id, 'deactivated', reason),
                                        });
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold cursor-pointer"
                                    >
                                      <Ban className="w-3.5 h-3.5 shrink-0" />
                                      <span>{b('নিষ্ক্রিয় (Deactivate)', 'Deactivate Teacher', lang)}</span>
                                    </button>
                                  )}
                                  {can('teacher:delete_archive') && t.status !== 'archived' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMoreTeacherId(null);
                                        onOpenConfirm({
                                          title: b('শিক্ষক আর্কাইভ / অপসারণ (Delete/Archive)', 'Delete / Archive Teacher', lang),
                                          message: b(
                                            `"${t.nameBn}"-কে আর্কাইভ করলে পূর্বের Approval History ও অডিট লগ অক্ষত থাকবে এবং প্রয়োজনে Restore করা যাবে।`,
                                            `Archiving "${t.nameEn}" preserves audit history and allows restoration.`,
                                            lang
                                          ),
                                          confirmLabel: b('আর্কাইভ করুন', 'Delete / Archive', lang),
                                          danger: true,
                                          requireReason: true,
                                          onConfirm: (reason) => onUpdateTeacherStatus(t.id, 'archived', reason),
                                        });
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                      <span>{b('আর্কাইভ / অপসারণ (Delete)', 'Delete / Archive', lang)}</span>
                                    </button>
                                  )}
                                  {can('teacher:activity_history') && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMoreTeacherId(null);
                                        setEntityModal({ kind: 'teacher', mode: 'history', entity: t });
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                                    >
                                      <History className="w-3.5 h-3.5 shrink-0" />
                                      <span>{b('Activity History দেখুন', 'Activity History', lang)}</span>
                                    </button>
                                  )}
                                  {can('teacher:reports') && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMoreTeacherId(null);
                                        setEntityModal({ kind: 'teacher', mode: 'report', entity: t });
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-semibold cursor-pointer"
                                    >
                                      <FileBarChart2 className="w-3.5 h-3.5 shrink-0" />
                                      <span>{b('রিপোর্ট দেখুন (Reports)', 'View Reports', lang)}</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        {renderTeacherModals()}
      </div>
    );
  }

  if (activeTab === 'settings' && settingsCenterElement) {
    return <>{settingsCenterElement}</>;
  }

  // Security & Admin Management (Single Main Owner Security + Sub-Admins + Manual Provisioning + Contact Admin Inbox)
  if (activeTab === 'security') {
    const activeAdmin =
      currentAdmin ?? adminAccounts.find((a) => isMainCentralAdmin(a)) ?? adminAccounts[0];
    const isMainOwnerSession = activeAdmin ? isMainCentralAdmin(activeAdmin) : true;
    const permPool = [
      'schools',
      'verification',
      'teachers',
      'students',
      'academics',
      'exams',
      'notices',
      'messages',
      'audit',
    ];

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {b('নিরাপত্তা, একমাত্র Main Admin & সাব-অ্যাডমিন নিয়ন্ত্রণ', 'Security, Main System Owner & Sub-Admin Control', lang)}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {b(
                'পাবলিক Admin Sign-up স্থায়ীভাবে বন্ধ। একমাত্র Main System Admin-এর ব্যক্তিগত পরিচয় সকল স্কুল, শিক্ষক, শিক্ষার্থী ও অভিভাবক পোর্টাল থেকে গোপন রাখা হয়েছে।',
                'Public Admin Sign-up is permanently disabled. Main System Owner identity is strictly masked from all non-central roles.',
                lang
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onOpenAdminPhotoEditor && (
              <button
                type="button"
                onClick={onOpenAdminPhotoEditor}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                {b('Main Admin ছবি পরিবর্তন / ক্রপ', 'Edit Main Admin Photo', lang)}
              </button>
            )}
            <button
              type="button"
              disabled={!isMainOwnerSession}
              onClick={onOpenAddAdmin}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              {b('নতুন Sub-Admin তৈরি', 'Create Sub-Admin', lang)}
            </button>
          </div>
        </div>

        {/* Central Admin Accounts Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <span className="font-bold text-sm">
              {b('কেন্দ্রীয় অ্যাডমিন ও সাব-অ্যাডমিন অ্যাকাউন্ট তালিকা', 'Central Owner & Subordinate Admin Accounts', lang)}
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              {b('মূল মালিক সুরক্ষিত', 'Main Owner Protected', lang)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                  <th className="py-2.5 px-4 font-semibold">{b('নাম ও ভূমিকা', 'Name & Role', lang)}</th>
                  <th className="py-2.5 px-3 font-semibold">Username / Mobile</th>
                  <th className="py-2.5 px-3 font-semibold">Gmail / Email</th>
                  <th className="py-2.5 px-3 font-semibold">Access Level & Permissions</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {adminAccounts.map((adm) => {
                  const isOwner = isMainCentralAdmin(adm);
                  return (
                    <React.Fragment key={adm.id}>
                      <tr>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{adm.name}</div>
                          {isOwner && (
                            <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300">
                              <ShieldCheck className="w-3 h-3" /> Main System Owner
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono">{adm.username} · {adm.mobile}</td>
                        <td className="py-3 px-3">{adm.email}</td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-blue-700 dark:text-blue-400">{adm.accessLevel}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {adm.permissions?.includes('*')
                              ? b('সর্বময় ক্ষমতা (Full System Access)', 'Full Unrestricted Owner Access', lang)
                              : (adm.permissions ?? []).join(', ') || 'Default'}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-semibold ${
                              adm.status === 'active'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {adm.status} · {adm.twoFactorEnabled ? '2FA' : 'No-2FA'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {isOwner ? (
                            <span className="text-[11px] font-semibold text-slate-400">
                              {b('লকড (অপরিবর্তনীয়)', 'Locked Owner', lang)}
                            </span>
                          ) : (
                            <>
                              {onUpdateAdminPermissions && isMainOwnerSession && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (editingSubAdminId === adm.id) {
                                      setEditingSubAdminId(null);
                                    } else {
                                      setEditingSubAdminId(adm.id);
                                      setEditSubPerms(adm.permissions ?? ['schools', 'verification']);
                                      setEditSubLevel(adm.accessLevel);
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold cursor-pointer"
                                >
                                  {b('অধিকার সম্পাদনা', 'Permissions', lang)}
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={!isMainOwnerSession}
                                onClick={() =>
                                  onOpenConfirm({
                                    title: b('Sub-Admin স্ট্যাটাস পরিবর্তন', 'Toggle Sub-Admin Status', lang),
                                    message: b(`${adm.name}-এর অ্যাক্সেস পরিবর্তন করতে চান?`, `Toggle access status for ${adm.name}?`, lang),
                                    confirmLabel: tr('confirm', lang),
                                    danger: adm.status === 'active',
                                    requireReason: true,
                                    onConfirm: (reason) => onToggleAdminStatus(adm.id, reason),
                                  })
                                }
                                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                              >
                                {adm.status === 'active' ? tr('suspend', lang) : b('সক্রিয়', 'Activate', lang)}
                              </button>
                              {onDeleteAdmin && isMainOwnerSession && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenConfirm({
                                      title: b('Sub-Admin অপসারণ', 'Delete Subordinate Admin', lang),
                                      message: b(`${adm.name} অ্যাকাউন্ট স্থায়ীভাবে অপসারণ করতে চান?`, `Remove subordinate admin ${adm.name}?`, lang),
                                      confirmLabel: tr('confirm', lang),
                                      danger: true,
                                      requireReason: false,
                                      onConfirm: () => onDeleteAdmin(adm.id),
                                    })
                                  }
                                  className="px-2.5 py-1 rounded border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-semibold cursor-pointer"
                                >
                                  {b('মুছুন', 'Delete', lang)}
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                      {editingSubAdminId === adm.id && !isOwner && onUpdateAdminPermissions && (
                        <tr className="bg-slate-50 dark:bg-slate-800/40">
                          <td colSpan={6} className="p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {b(`${adm.name}-এর অনুমতি ও লেভেল সম্পাদনা`, `Edit Permissions for ${adm.name}`, lang)}
                              </span>
                              <select
                                value={editSubLevel}
                                onChange={(e) => setEditSubLevel(e.target.value as AdminAccount['accessLevel'])}
                                className="h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                              >
                                <option value="Regional Reviewer">Regional Reviewer</option>
                                <option value="Audit Officer">Audit Officer</option>
                                <option value="Super Central Admin">Subordinate Central Admin</option>
                              </select>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {permPool.map((p) => (
                                <label
                                  key={p}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={editSubPerms.includes(p)}
                                    onChange={() =>
                                      setEditSubPerms((prev) =>
                                        prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
                                      )
                                    }
                                  />
                                  <span>{p}</span>
                                </label>
                              ))}
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingSubAdminId(null)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                              >
                                {tr('cancel', lang)}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateAdminPermissions(adm.id, editSubPerms, editSubLevel);
                                  setEditingSubAdminId(null);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer"
                              >
                                {b('সংরক্ষণ করুন', 'Save Permissions', lang)}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Manual Account Creation by Main Admin */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('সরাসরি অ্যাকাউন্ট তৈরি (Manual Provisioning — Main Admin)', 'Direct Manual Account Creation (Main Admin Only)', lang)}
              </h2>
              <p className="text-xs text-slate-500">
                {b(
                  'পাবলিক অ্যাডমিন সাইনআপ বন্ধ থাকলেও Main Admin সরাসরি বিদ্যালয়, শিক্ষক ও শিক্ষার্থী অ্যাকাউন্ট তৈরি করতে পারবেন।',
                  'Directly provision School, Teacher, or Student accounts from Central Control.',
                  lang
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => onOpenSchoolReg('MANUAL')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5" />
                {b('+ ম্যানুয়াল বিদ্যালয় তৈরি', '+ Create School', lang)}
              </button>
              <button
                type="button"
                onClick={() => setNewTeacherModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-semibold cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {b('+ শিক্ষক তৈরি (Part A)', '+ Create Teacher', lang)}
              </button>
              {onOpenAddStudent && (
                <button
                  type="button"
                  onClick={onOpenAddStudent}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  {b('+ শিক্ষার্থী ভর্তি (৬-অংশ)', '+ Admit Student', lang)}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Contact Admin Inbox (Direct Messages to Main Admin) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
              <MessageSquare className="w-4 h-4 text-teal-600" />
              <span>{b('Contact Admin ইনবক্স (ব্যবহারকারীর সরাসরি বার্তা)', 'Contact Admin Direct Message Inbox', lang)}</span>
            </div>
            <span className="text-xs font-semibold tabular-nums text-amber-700 dark:text-amber-400">
              {contactAdminMessages.filter((m) => m.status === 'Pending').length} {b('অপেক্ষমাণ', 'Pending', lang)}
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {contactAdminMessages.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                {b('এখনো কোনো ব্যবহারকারী সরাসরি বার্তা পাঠাননি।', 'No messages received yet.', lang)}
              </div>
            ) : (
              contactAdminMessages.map((msg) => (
                <div key={msg.id} className="p-4 space-y-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {msg.subject}
                        {msg.senderSchoolId && (
                          <span className="ml-2 text-blue-700 dark:text-blue-400">[{msg.senderSchoolId}]</span>
                        )}
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        {msg.senderName} ({msg.senderRole}) · {msg.senderContact} · <span className="font-mono">{msg.createdAt}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded border font-semibold ${
                        msg.status === 'Replied'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : msg.status === 'Reviewed'
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {msg.status}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg">
                    {msg.message}
                  </p>
                  {msg.replyNote && (
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                      {b('Admin উত্তর:', 'Admin Reply:', lang)} {msg.replyNote}
                    </div>
                  )}
                  {onUpdateContactMessageStatus && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={replyDrafts[msg.id] ?? ''}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({ ...prev, [msg.id]: e.target.value }))
                        }
                        placeholder={b('উত্তর বা মন্তব্য লিখুন...', 'Type reply note...', lang)}
                        className="flex-1 min-w-[200px] h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateContactMessageStatus(msg.id, 'Reviewed', replyDrafts[msg.id])}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                      >
                        {b('Reviewed চিহ্নিত', 'Mark Reviewed', lang)}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateContactMessageStatus(
                            msg.id,
                            'Replied',
                            replyDrafts[msg.id] || b('কেন্দ্রীয় প্রশাসন কর্তৃক পর্যালোচনা ও সমাধান সম্পন্ন।', 'Reviewed and resolved by Central Administration.', lang)
                          );
                          setReplyDrafts((prev) => ({ ...prev, [msg.id]: '' }));
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        {b('উত্তর পাঠান (Replied)', 'Send Reply', lang)}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Lock className="w-4 h-4 text-emerald-600" />
              Single Main Owner Bootstrap Security
            </div>
            <p className="text-slate-500">Public "Register as Admin" permanently disabled & Main Owner identity hidden from all public/user views.</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <ShieldAlert className="w-4 h-4 text-blue-700" />
              School-wise Data Isolation (RLS)
            </div>
            <p className="text-slate-500">School Admins locked strictly to their own school_id scope.</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <KeyRound className="w-4 h-4 text-amber-600" />
              Device Session &amp; Revocation
            </div>
            <p className="text-slate-500">Active sessions: 2 verified devices (Dhaka, Bangladesh).</p>
          </div>
        </div>

        <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs">
            <Database className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <div className="font-bold text-slate-900 dark:text-white">
                {b('Firebase Realtime Database লাইভ ডেটা ও সিঙ্ক টেস্ট', 'Firebase Realtime Database Data & Live Sync Test', lang)}
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                {b(
                  'RTDB-তে লাইভ টেস্ট পিং পাঠান, ইউজার প্রোফাইল/রোল আপডেট করুন এবং রোল-ভিত্তিক সিকিউরিটি রুলস দেখুন।',
                  'Send live RTDB test pings, edit user profiles/roles in real time, and review role-scoped RTDB rules.',
                  lang
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('realtime_db')}
            className="h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{b('লাইভ RTDB প্যানেল খুলুন →', 'Open Live RTDB Panel →', lang)}</span>
          </button>
        </div>
      </div>
    );
  }

  if (activeTab === 'realtime_db') {
    return <CentralRealtimeDataPanel lang={lang} schools={schools} />;
  }

  // Permission System (Interactive Governance Matrix + 8-Role RBAC Reference)
  if (activeTab === 'permissions') {
    const reviewerRoles: AdminReviewerRole[] = [
      'Super Central Admin',
      'Verification Officer',
      'Approval Officer',
      'Audit Officer',
    ];
    const matrix = [
      { capBn: 'সকল বিদ্যালয় ও School Type নিয়ন্ত্রণ', capEn: 'Multi-School & School Type Config', r: ['Full', 'Blocked', 'Blocked', 'Blocked', 'Blocked', 'Blocked', 'Blocked', 'Blocked'] },
      { capBn: 'বিদ্যালয় ও ঠিকানা যাচাই / অনুমোদন', capEn: 'Approve Schools & Verify Address', r: ['Full', 'Blocked', 'Blocked', 'Blocked', 'Blocked', 'Blocked', 'Blocked', 'Blocked'] },
      { capBn: 'নিজ বিদ্যালয়ের শিক্ষার্থী ও শিক্ষক', capEn: 'Own School Students & Teachers', r: ['Full (Audit)', 'Full (Own)', 'Class Only', 'Fee View', 'Admission/TC', 'Library ID', 'Blocked', 'Own Profile'] },
      { capBn: 'ক্লাস পরিচালনা ও নম্বর প্রদান', capEn: 'Class Execution & Marks Entry', r: ['View Only', 'Full (Own)', 'Assigned Subj', 'Blocked', 'Blocked', 'Blocked', 'Blocked', 'Blocked'] },
      { capBn: 'ফি, রসিদ ও বকেয়া হিসাব', capEn: 'Fees, Receipts & Ledger', r: ['Audit View', 'Full (Own)', 'Blocked', 'Full (Own)', 'Receipt Print', 'Blocked', 'Own Child', 'Own Status'] },
      { capBn: 'রুটিন, হাজিরা, বাড়ির কাজ ও ফলাফল', capEn: 'Routine, Attendance, HW & Results', r: ['View Only', 'Full (Own)', 'Assigned', 'Blocked', 'Attendance Log', 'Blocked', 'Own Child', 'Own Only'] },
    ];
    const enabledCount = Object.values(permissionMatrix[activeReviewerRole] ?? {}).filter(Boolean).length;
    const totalCount = ALL_GOVERNANCE_ACTIONS.length * GOVERNED_ENTITIES.length;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0" />
              {b('Permission System & লাইভ অ্যাক্সেস নিয়ন্ত্রণ', 'Interactive Governance Permission System', lang)}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {b(
                'নিচের যেকোনো ভূমিকা (Reviewer Role) নির্বাচন করে View / Create / Edit / Verify / Approve / Suspend / Re-issue ID / Archive / Restore / Reports অনুমতি চালু বা বন্ধ করলে সাথে সাথে সকল ড্যাশবোর্ডে বাটন নিয়ন্ত্রিত হবে।',
                'Switch the active Reviewer Role or toggle individual permissions below to dynamically enforce action access across Schools, Teachers, Students, and Verification.',
                lang
              )}
            </p>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-800 dark:text-blue-300 tabular-nums">
            {activeReviewerRole}: {enabledCount}/{totalCount} {b('অনুমতি সক্রিয়', 'Active', lang)}
          </div>
        </div>

        {/* Reviewer Role Switcher */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {b('সক্রিয় Reviewer Role নির্বাচন করুন:', 'Simulate / Configure Reviewer Role:', lang)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {reviewerRoles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onChangeReviewerRole(r)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  activeReviewerRole === r
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Entity x Action Permission Matrix */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-900 dark:text-white">
              {b(`লাইভ অনুমতি ম্যাট্রিক্স — ${activeReviewerRole}`, `Live Action Controls — ${activeReviewerRole}`, lang)}
            </span>
            <span className="text-slate-500">
              {b('প্রতিটি টগল তাৎক্ষণিক কার্যকর হয়', 'Changes apply immediately across all modules', lang)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                  <th className="py-3 px-4 font-semibold">{b('কার্যক্রম (Action)', 'Governance Action', lang)}</th>
                  {GOVERNED_ENTITIES.map((ent) => (
                    <th key={ent.id} className="py-3 px-4 font-semibold text-center">
                      {b(ent.labelBn, ent.labelEn, lang)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ALL_GOVERNANCE_ACTIONS.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {b(act.labelBn, act.labelEn, lang)}
                    </td>
                    {GOVERNED_ENTITIES.map((ent) => {
                      const pKey = `${ent.id}:${act.id}` as PermissionKey;
                      const enabled = hasGovernancePermission(permissionMatrix, activeReviewerRole, pKey);
                      return (
                        <td key={pKey} className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={enabled}
                            aria-label={`${activeReviewerRole} ${ent.labelEn} ${act.labelEn}`}
                            onClick={() => onTogglePermission(activeReviewerRole, pKey)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer transition-colors ${
                              enabled
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <span>{enabled ? b('অনুমোদিত', 'Allowed', lang) : b('বন্ধ', 'Blocked', lang)}</span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 8-Role RBAC Reference */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white">
            {b('৮-রোল সিস্টেম Role-Based Access Control (RBAC) কাঠামো', '8-Role System RBAC Reference', lang)}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                  <th className="py-3 px-4 font-semibold">{b('কার্যক্রম / মডিউল', 'Capability', lang)}</th>
                  <th className="py-3 px-2.5 font-semibold">Super Admin</th>
                  <th className="py-3 px-2.5 font-semibold">School Admin</th>
                  <th className="py-3 px-2.5 font-semibold">Teacher</th>
                  <th className="py-3 px-2.5 font-semibold">Accountant</th>
                  <th className="py-3 px-2.5 font-semibold">Office Staff</th>
                  <th className="py-3 px-2.5 font-semibold">Librarian</th>
                  <th className="py-3 px-2.5 font-semibold">Guardian</th>
                  <th className="py-3 px-3 font-semibold">Student</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {matrix.map((row) => (
                  <tr key={row.capEn}>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{b(row.capBn, row.capEn, lang)}</td>
                    {row.r.map((perm, idx) => (
                      <td
                        key={`${row.capEn}-${idx}`}
                        className={`py-3 px-2.5 font-semibold whitespace-nowrap ${
                          perm === 'Blocked'
                            ? 'text-slate-400'
                            : perm.startsWith('Full')
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-blue-700 dark:text-blue-400'
                        }`}
                      >
                        {perm}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Location Database Manager (BD Divisions -> Districts -> Upazilas -> Unions -> Villages)
  if (activeTab === 'locations') {
    const levelOptions: { id: keyof BdLocationDatabase; labelBn: string; labelEn: string; parentLevel?: keyof BdLocationDatabase }[] = [
      { id: 'divisions', labelBn: 'বিভাগ (Divisions)', labelEn: 'Divisions' },
      { id: 'districts', labelBn: 'জেলা (Districts)', labelEn: 'Districts', parentLevel: 'divisions' },
      { id: 'upazilas', labelBn: 'উপজেলা (Upazilas)', labelEn: 'Upazilas', parentLevel: 'districts' },
      { id: 'unions', labelBn: 'ইউনিয়ন / ওয়ার্ড (Unions)', labelEn: 'Unions', parentLevel: 'upazilas' },
      { id: 'villages', labelBn: 'গ্রাম / এলাকা (Villages)', labelEn: 'Villages', parentLevel: 'unions' },
    ];
    const currentMeta = levelOptions.find((l) => l.id === locLevel)!;
    const parentNodes = currentMeta.parentLevel ? locationDb[currentMeta.parentLevel] : [];
    const currentNodes = locationDb[locLevel];

    const handleAddLoc = (e: React.FormEvent) => {
      e.preventDefault();
      if (!locNameBn.trim() || !locNameEn.trim()) return;
      if (currentMeta.parentLevel && !locParentId) return;
      onAddLocationNode(locLevel, {
        id: `${locLevel.slice(0, 3)}-${Date.now().toString().slice(-5)}`,
        parentId: currentMeta.parentLevel ? locParentId : null,
        nameBn: locNameBn.trim(),
        nameEn: locNameEn.trim(),
        isActive: true,
      });
      setLocNameBn('');
      setLocNameEn('');
    };

    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-700" />
            {b('বাংলাদেশ প্রশাসনিক লোকেশন ডাটাবেজ ম্যানেজার', 'Central BD Location Database Manager', lang)}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {b(
              'বিভাগ → জেলা → উপজেলা → ইউনিয়ন → গ্রাম প্যারেন্ট-চাইল্ড লিংকিং, সংযোজন এবং Active/Inactive নিয়ন্ত্রণ। অপ্রাপ্য ঠিকানা রেজিস্ট্রেশনে Manual Entry-তে সংরক্ষিত হয়।',
              'Manage hierarchical Bangladesh locations with parent-child ID validation and Active/Inactive status.',
              lang
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs">
          {levelOptions.map((lvl) => (
            <button
              key={lvl.id}
              type="button"
              onClick={() => {
                setLocLevel(lvl.id);
                if (lvl.parentLevel) {
                  setLocParentId(locationDb[lvl.parentLevel][0]?.id ?? '');
                } else {
                  setLocParentId('');
                }
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                locLevel === lvl.id
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {b(lvl.labelBn, lvl.labelEn, lang)} ({locationDb[lvl.id].length})
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={handleAddLoc}
            className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 text-xs h-fit"
          >
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {b('নতুন লোকেশন যুক্ত করুন', 'Add Location Entry', lang)}
            </h2>
            {currentMeta.parentLevel && (
              <div>
                <label className="block font-semibold mb-1">{b('Parent নির্বাচন করুন *', 'Select Parent *', lang)}</label>
                <select
                  value={locParentId}
                  onChange={(e) => setLocParentId(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {parentNodes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameBn} ({p.nameEn})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block font-semibold mb-1">{b('বাংলা নাম *', 'Name (Bangla) *', lang)}</label>
              <input
                type="text"
                value={locNameBn}
                onChange={(e) => setLocNameBn(e.target.value)}
                placeholder="যেমন: নরসিংদী"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('ইংরেজি নাম *', 'Name (English) *', lang)}</label>
              <input
                type="text"
                value={locNameEn}
                onChange={(e) => setLocNameEn(e.target.value)}
                placeholder="e.g. Narsingdi"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <button type="submit" className="w-full py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer">
              <Plus className="w-3.5 h-3.5 inline mr-1" />
              {b('ডাটাবেজে যুক্ত করুন', 'Add to Location DB', lang)}
            </button>
          </form>

          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                    <th className="py-3 px-4 font-semibold">ID</th>
                    <th className="py-3 px-3 font-semibold">{b('বাংলা ও ইংরেজি নাম', 'Location Name', lang)}</th>
                    {currentMeta.parentLevel && <th className="py-3 px-3 font-semibold">Parent</th>}
                    <th className="py-3 px-3 font-semibold">{b('অবস্থা', 'Active', lang)}</th>
                    <th className="py-3 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentNodes.map((node) => {
                    const parentName = node.parentId
                      ? parentNodes.find((p) => p.id === node.parentId)?.nameBn ?? node.parentId
                      : '-';
                    return (
                      <tr key={node.id}>
                        <td className="py-2.5 px-4 font-mono text-slate-500">{node.id}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          {node.nameBn} <span className="text-slate-500 font-normal">({node.nameEn})</span>
                        </td>
                        {currentMeta.parentLevel && <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{parentName}</td>}
                        <td className="py-2.5 px-3">
                          <span className={`font-semibold ${node.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
                            {node.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onToggleLocationActive(locLevel, node.id)}
                            className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                          >
                            {node.isActive ? b('নিষ্ক্রিয় করুন', 'Deactivate', lang) : b('সক্রিয় করুন', 'Activate', lang)}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // System Architecture & 10-Phase Blueprint View
  if (activeTab === 'architecture') {
    const phases = [
      { p: 'Phase 1', t: 'Multi-School Foundation, RLS Isolation & Central Super Admin Auth' },
      { p: 'Phase 2', t: 'School Registration (Online/Manual), Workflow & School Type Config Engine' },
      { p: 'Phase 3', t: 'BD Location Hierarchy DB (Division → Village) + Non-Blocking Manual Entry' },
      { p: 'Phase 4', t: 'Student Admission, Permanent Student ID, QR ID, Activation Code & GLC' },
      { p: 'Phase 5', t: 'Teacher Management, Assigned Class/Subject RBAC & Substitute Approval' },
      { p: 'Phase 6', t: 'Class Routine Sequential Execution (Start → Lesson → Homework → Complete)' },
      { p: 'Phase 7', t: 'Smart QR Kiosk Attendance, <75% Alerts & Guardian SMS Notification' },
      { p: 'Phase 8', t: 'NCTB Grading, Automated Merit List, Publish/Hold & Marksheet Printing' },
      { p: 'Phase 9', t: 'Fee Ledger, bKash/Nagad Receipts, Health BMI, Stipend & Offline Sync Queue' },
      { p: 'Phase 10', t: 'Immutable Audit Trail, Automated Encrypted Backups & Production Deployment' },
    ];

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-700" />
            {b('মাল্টি-স্কুল সিস্টেম আর্কিটেকচার ও বাস্তবায়ন ব্লুপ্রিন্ট', 'Multi-School Architecture & 10-Phase Blueprint', lang)}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {b(
              'Normalized PostgreSQL Schema, Row-Level Security (school_id), School Type Rule Engine ও Production Deployment পরিকল্পনা।',
              'Normalized PostgreSQL ERD, school_id RLS isolation, School Type Rule Engine, and Production Deployment guide.',
              lang
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2.5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {b('১০-ধাপের ইঞ্জিনিয়ারিং রোডম্যাপ (Phase 1–10)', '10-Phase Engineering Roadmap', lang)}
            </h2>
            <ul className="space-y-2">
              {phases.map((item) => (
                <li key={item.p} className="flex items-start gap-2">
                  <span className="font-mono font-bold text-blue-700 dark:text-blue-400 shrink-0">{item.p}</span>
                  <span className="text-slate-700 dark:text-slate-300">{item.t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2.5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {b('Core Database Tables & Multi-School Isolation', 'Normalized Schema & RLS Policies', lang)}
            </h2>
            <div className="space-y-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
              <div>• schools (id, code, eiin, school_type, address_source, status)</div>
              <div>• school_type_configs (school_type, allowed_classes, subjects_json, modules)</div>
              <div>• bd_locations (id, parent_id, level, name_bn, name_en, is_active)</div>
              <div>• users &amp; role_assignments (user_id, school_id NULLABLE, role_code)</div>
              <div>• students (id, permanent_id, activation_code, glc, school_id FK)</div>
              <div>• teachers (id, teacher_code, school_id FK, subjects[], classes[])</div>
              <div>• routine_slots, attendance_logs, exams, exam_marks, fee_ledgers</div>
              <div>• audit_logs (immutable append-only: actor_id, school_id, old_val, new_val)</div>
            </div>
            <div className="pt-2 text-slate-600 dark:text-slate-400">
              RLS Policy: <span className="font-mono">CREATE POLICY school_isolation ON students USING (school_id = current_setting(&apos;app.school_id&apos;)::uuid OR is_super_admin());</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dedicated Verification Center (Strictly separate from Approval Decisions)
  if (activeTab === 'verification') {
    return (
      <VerificationCenterView
        lang={lang}
        schools={schools}
        teachers={teachers}
        students={students}
        requests={requests}
        teacherRequests={teacherRequests}
        studentRequests={studentRequests}
        canVerify={can('verification:verify')}
        onVerifyItem={onVerifyQueueItem}
        onNavigateApprovalCenter={() => onSelectTab('approval')}
      />
    );
  }

  // Approval Center (Decision Stage: Request -> Verification -> Approval -> Final Action)
  if (activeTab === 'approval') {
    const filtered = requests.filter((r) => {
      const matchType = filterType === 'all' || r.type === filterType;
      const matchSchoolType = schoolTypeFilter === 'ALL' || r.schoolType === schoolTypeFilter;
      return matchType && matchSchoolType;
    });

    const canApproveReqType = (type: ApprovalRequest['type']) => {
      if (type === 'school') return can('school:approve');
      if (type === 'teacher') return can('teacher:approve');
      return can('student:approve');
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {b('Approval Center (অনুমোদন সিদ্ধান্ত কেন্দ্র)', 'Approval Center', lang)}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {b(
                'যাচাইকরণ (Verification) ও অনুমোদন (Approval) পৃথক ধাপ — অনুমোদনের আগে তথ্য যাচাই সম্পন্ন আছে কি না দেখে নিন।',
                'Verification validates facts/documents separately from Approval decisions.',
                lang
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectTab('verification')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              {b('Verification Center খুলুন', 'Open Verification Center', lang)}
            </button>
            <select
              value={schoolTypeFilter}
              onChange={(e) => setSchoolTypeFilter(e.target.value as 'ALL' | SchoolTypeCode)}
              aria-label="Filter requests by school type"
              className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="ALL">{b('সকল School Type', 'All School Types', lang)}</option>
              {SCHOOL_TYPE_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.code}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
              {[
                { id: 'all', label: b('সব', 'All', lang) },
                { id: 'school', label: b('বিদ্যালয়', 'School', lang) },
                { id: 'teacher', label: b('শিক্ষক', 'Teacher', lang) },
                { id: 'student', label: b('শিক্ষার্থী', 'Student', lang) },
                { id: 'tc', label: 'TC' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterType(f.id)}
                  className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                    filterType === f.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4-Stage Pipeline Indicator */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {[
              { step: '1', labelBn: 'Request (আবেদন)', labelEn: '1. Request', tone: 'text-slate-700 dark:text-slate-200' },
              { step: '2', labelBn: 'Verification (তথ্য/নথি যাচাই)', labelEn: '2. Verification', tone: 'text-teal-700 dark:text-teal-400' },
              { step: '3', labelBn: 'Approval (সিদ্ধান্ত প্রদান)', labelEn: '3. Approval (Active)', tone: 'text-blue-700 dark:text-blue-400' },
              { step: '4', labelBn: 'Final Action (কার্যকর ও অডিট)', labelEn: '4. Final Action', tone: 'text-emerald-700 dark:text-emerald-400' },
            ].map((st) => (
              <div key={st.step} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-semibold flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-700 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                  {st.step}
                </span>
                <span className={st.tone}>{b(st.labelBn, st.labelEn, lang)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((req) => {
            const matchedSchool = schools.find((s) => s.id === req.schoolId);
            const vStatus =
              req.verificationStatus ??
              (req.type === 'school' && matchedSchool
                ? deriveVerificationStatus(matchedSchool)
                : req.status === 'verified'
                  ? 'verified'
                  : 'pending');
            const stage = computePipelineStage({
              verificationStatus: vStatus,
              approvalStatus: req.status === 'verified' ? 'approved' : req.status,
              entityStatus: req.status,
            });
            const allowDecision = canApproveReqType(req.type);

            return (
              <div
                key={req.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs text-blue-700 dark:text-blue-400 font-semibold">
                      {req.id} · {b(req.typeLabelBn, req.typeLabelEn, lang)}
                      {req.schoolType ? ` · ${req.schoolType}` : ''}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{req.applicantName}</h3>
                    <p className="text-xs text-slate-500">{req.schoolName} · {req.submittedAt}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${statusTextClass(req.status)}`}>
                      Approval: {req.status}
                    </span>
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${statusTextClass(vStatus)}`}>
                      Verify: {vStatus}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                  {b(stage.labelBn, stage.labelEn, lang)}
                </div>
                {req.addressSource === 'MANUAL' && (
                  <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    ⚠️ Address Entered Manually — Verification Required
                  </div>
                )}
                <p className="text-xs text-slate-600 dark:text-slate-300">{req.details}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {vStatus !== 'verified' && (
                    <button
                      type="button"
                      onClick={() => onSelectTab('verification')}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 cursor-pointer"
                    >
                      {b('প্রথমে যাচাই করুন →', 'Verify First →', lang)}
                    </button>
                  )}
                  {allowDecision && req.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenConfirm({
                          title: b('পর্যালোচনা শুরু (Under Review)', 'Move to Under Review', lang),
                          message: b(`${req.applicantName} পর্যালোচনা ধাপে নিতে চান?`, `Move ${req.applicantName} to Under Review?`, lang),
                          confirmLabel: b('Under Review করুন', 'Start Review', lang),
                          onConfirm: (reason) => onUpdateRequestStatus(req.id, 'under_review', reason),
                        })
                      }
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-700 text-white cursor-pointer"
                    >
                      {b('Under Review', 'Under Review', lang)}
                    </button>
                  )}
                  {allowDecision && (req.status === 'pending' || req.status === 'under_review') && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenConfirm({
                          title: b('অনুমোদন ও সক্রিয় করুন', 'Approve Request', lang),
                          message: b(`${req.applicantName} অনুমোদন করতে চান?`, `Approve ${req.applicantName}?`, lang),
                          confirmLabel: b('অনুমোদন দিন', 'Approve', lang),
                          onConfirm: (reason) => onUpdateRequestStatus(req.id, 'verified', reason),
                        })
                      }
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white cursor-pointer"
                    >
                      {b('অনুমোদন (Approve)', 'Approve', lang)}
                    </button>
                  )}
                  {allowDecision && req.type === 'school' && (req.status === 'pending' || req.status === 'under_review') && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenConfirm({
                          title: b('সংশোধনের জন্য আবেদন ফেরত', 'Return Application for Revision', lang),
                          message: b(`${req.applicantName}-কে সংশোধনের নোট পাঠান:`, `Send revision feedback for ${req.applicantName}:`, lang),
                          confirmLabel: b('সংশোধনের জন্য ফেরত', 'Return for Revision', lang),
                          requireReason: true,
                          onConfirm: (note) => onReturnForRevision(req.schoolId, note),
                        })
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {b('সংশোধনের ফেরত', 'Return for Revision', lang)}
                    </button>
                  )}
                  {allowDecision && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenConfirm({
                          title: b('বাতিল / স্থগিত', 'Reject / Suspend', lang),
                          message: b(`${req.id} স্থগিত বা বাতিল করতে চান?`, `Reject or suspend ${req.id}?`, lang),
                          confirmLabel: tr('suspend', lang),
                          danger: true,
                          requireReason: true,
                          onConfirm: (reason) => onUpdateRequestStatus(req.id, 'rejected', reason),
                        })
                      }
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 cursor-pointer"
                    >
                      {b('বাতিল / স্থগিত', 'Reject / Suspend', lang)}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Central Official Documents & Certificates Oversight
  if (activeTab === 'documents') {
    const selectedDocSchool = schools.find((s) => s.id === docSchoolId) ?? schools[0];
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-700" />
              {b('কেন্দ্রীয় অফিশিয়াল ডকুমেন্ট, সনদ ও মার্কশিট নিয়ন্ত্রণ', 'Central Official Documents, Certificates & QR Verification', lang)}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {b(
                'সকল বিদ্যালয়ের প্রত্যয়নপত্র, প্রশংসাপত্র, ছাড়পত্র (TC), ডিজিটাল আইডি ও মার্কশিট অনুমোদন, বাতিল বা QR যাচাই করুন।',
                'Approve, issue, cancel, reissue, and QR-verify official student and teacher documents across schools.',
                lang
              )}
            </p>
          </div>
          <select
            value={selectedDocSchool?.id ?? ''}
            onChange={(e) => setDocSchoolId(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
          >
            {schools.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.nameBn} ({sc.code})
              </option>
            ))}
          </select>
        </div>

        {selectedDocSchool && (
          <OfficialDocumentSystem
            lang={lang}
            role="central_admin"
            school={selectedDocSchool}
            actorName={CENTRAL_ADMIN_CREDENTIALS.displayNameBn}
            students={students}
            teachers={teachers}
            exams={exams}
            documents={officialDocuments}
            templates={documentTemplates}
            onUpdateDocuments={onUpdateOfficialDocuments ?? (() => {})}
            canGenerate={true}
          />
        )}
      </div>
    );
  }

  // Central Notices & Communication Center
  if (activeTab === 'notices') {
    return (
      <NoticeCommunicationCenter
        lang={lang}
        role="central_admin"
        userId="central-admin"
        actorName={CENTRAL_ADMIN_CREDENTIALS.displayNameBn}
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
              author: payload.author,
              authorRole: 'central_admin',
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
    );
  }

  // Central Examination Management, Exam Routine & Term Publish Control
  if (activeTab === 'exams') {
    const selectedExamSchool = schools.find((s) => s.id === examRoutineSchoolId) ?? schools[0];
    return (
      <div className="space-y-6">
        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
          <span>
            {b(
              'কেন্দ্রীয় অ্যাডমিন ভূমিকা সীমা: Central Admin কেবল স্কুল অনুমোদন, নীতি ও সাময়িক পরীক্ষা প্রকাশ নিয়ন্ত্রণ করে। দৈনিক শ্রেণি হাজিরা, নম্বর এন্ট্রি ও পাঠদান সংশ্লিষ্ট শিক্ষক ও School Admin সম্পন্ন করেন।',
              'Central Admin Governance Scope: Oversees schools, approvals & central exam publishing. Daily attendance, classroom marks entry & teaching remain strictly scoped to Teachers & School Admins.',
              lang
            )}
          </span>
        </div>
        <ExaminationManagementPanel
          lang={lang}
          role="central_admin"
          actorName={CENTRAL_ADMIN_CREDENTIALS.displayNameBn}
          schools={schools}
          students={students}
          exams={exams}
          onCreateLocalExam={onCreateLocalExam ?? (() => {})}
          onToggleCentralTermPublish={onToggleCentralTermPublish ?? (() => {})}
          onUpdateExamMark={onUpdateExamMark ?? (() => {})}
        />

        {selectedExamSchool && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {b('বিদ্যালয়ভিত্তিক পরীক্ষার রুটিন তদারকি', 'School Exam Routine Oversight', lang)}
              </div>
              <select
                value={selectedExamSchool.id}
                onChange={(e) => setExamRoutineSchoolId(e.target.value)}
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                {schools.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.nameBn} ({sc.code})
                  </option>
                ))}
              </select>
            </div>
            <ExamRoutineSystem
              lang={lang}
              role="central_admin"
              school={selectedExamSchool}
              actorName={CENTRAL_ADMIN_CREDENTIALS.displayNameBn}
              teachers={teachers}
              exams={exams}
              examRoutines={examRoutines}
              onUpdateExamRoutines={onUpdateExamRoutines}
            />
          </div>
        )}

        {onToggleSchoolPublishPermission && onPublishAllEligibleResults && (
          <CentralAdminResultControlPanel
            lang={lang}
            schools={schools}
            exams={exams}
            subjectSubmissions={subjectSubmissions}
            onToggleSchoolPublishPermission={onToggleSchoolPublishPermission}
            onPublishAllEligibleResults={onPublishAllEligibleResults}
          />
        )}
      </div>
    );
  }

  // Academics Oversight (National Curriculum + Read-Only Multi-School Academic Oversight)
  if (activeTab === 'academics') {
    const selectedOversightSchool =
      schools.find((s) => s.id === oversightSchoolId) ?? schools[0];
    const scopedStudents = selectedOversightSchool
      ? students.filter((st) => st.schoolId === selectedOversightSchool.id)
      : students;
    const scopedTeachers = selectedOversightSchool
      ? teachers.filter((t) => t.schoolId === selectedOversightSchool.id)
      : teachers;

    return (
      <div className="space-y-6">
        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
          <span>
            {b(
              'কেন্দ্রীয় পর্যবেক্ষণ মোড (Platform Governance Only): Central Admin এখানে সকল বিদ্যালয়ের একাডেমিক মান পর্যবেক্ষণ করে; সরাসরি শ্রেণি পাঠদান বা দৈনিক হাজিরা গ্রহণ করে না।',
              'Central Admin Read-Only Academic Oversight: Platform governance only; daily teaching & attendance are conducted exclusively by School Admins and Teachers.',
              lang
            )}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {b('জাতীয় পাঠ্যক্রম ও কেন্দ্রীয় একাডেমিক মনিটরিং (Pre-Primary – Class 10)', 'National Curriculum & Central Academic Oversight', lang)}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {b(
                'সকল নিবন্ধিত বিদ্যালয়ের শিক্ষাবর্ষ, রুটিন, ক্লাসওয়ার্ক, ফলাফল ও ১৪টি একাডেমিক রিপোর্ট কেন্দ্রীয়ভাবে পর্যবেক্ষণ করুন।',
                'Inspect academic years, routines, classwork, grading rules, documents, and 14 reports across all approved schools.',
                lang
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <label htmlFor="central-academic-school-select" className="font-semibold text-slate-600 dark:text-slate-300">
              {b('বিদ্যালয় নির্বাচন:', 'Inspect School:', lang)}
            </label>
            <select
              id="central-academic-school-select"
              value={selectedOversightSchool?.id ?? ''}
              onChange={(e) => setOversightSchoolId(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold cursor-pointer"
            >
              {schools.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.nameBn} ({sc.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                <th className="py-3 px-4 font-semibold">Subject Code</th>
                <th className="py-3 px-3 font-semibold">{b('বিষয়', 'Subject', lang)}</th>
                <th className="py-3 px-3 font-semibold">{b('শ্রেণি সীমা', 'Grade Range', lang)}</th>
                <th className="py-3 px-4 font-semibold text-right">{b('সাপ্তাহিক পিরিয়ড', 'Weekly Load', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {NCTB_SUBJECTS.map((sub) => (
                <tr key={sub.code}>
                  <td className="py-3 px-4 font-mono font-semibold">{sub.code}</td>
                  <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">{b(sub.nameBn, sub.nameEn, lang)}</td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{sub.classes}</td>
                  <td className="py-3 px-4 text-right tabular-nums font-semibold">{sub.weeklyPeriods}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedOversightSchool && (
          <AcademicManagementHub
            key={selectedOversightSchool.id}
            lang={lang}
            readOnlyOversight={true}
            initialModule="academic_dashboard"
            school={selectedOversightSchool}
            students={scopedStudents.length > 0 ? scopedStudents : students}
            teachers={scopedTeachers.length > 0 ? scopedTeachers : teachers}
            routineSlots={routineSlots.filter(
              (r) => !r.schoolId || r.schoolId === selectedOversightSchool.id
            )}
            exams={exams.filter((e) => !e.schoolId || e.schoolId === selectedOversightSchool.id)}
            assignments={assignments}
            academicYears={academicYears}
            onCreateAcademicYear={() => {}}
            onSelectCurrentAcademicYear={() => {}}
            onAddTermToYear={() => {}}
            calendarEvents={calendarEvents}
            onAddCalendarEvent={() => {}}
            classSections={classSections}
            onAddClassSection={() => {}}
            subjects={subjects}
            onAddSubject={() => {}}
            teacherAssignments={teacherAssignments}
            onSaveTeacherAssignment={() => {}}
            onReplaceAssignedTeacher={() => {}}
            onCreateRoutineSlot={() => {}}
            onUpdateRoutineSlot={() => {}}
            onAssignSubstituteTeacher={() => {}}
            classworks={classworks}
            onCreateClasswork={() => {}}
            onUpdateClassworkStudentStatus={() => {}}
            curriculumUnits={curriculumUnits}
            lessonPlans={lessonPlans}
            onAddLessonPlan={() => {}}
            studyMaterials={studyMaterials}
            classTests={classTests}
            questionBank={questionBank}
            examSchedules={examSchedules}
            gradingRules={gradingRules}
            onUpdateGradingRule={() => {}}
            extraItems={extraItems}
            onUpdateExamMark={() => {}}
            onToggleExamStatus={() => {}}
            onPromoteAllEligible={() => {}}
            dailyLessons={dailyLessons}
            substitutePermissions={substitutePermissions}
            subjectSubmissions={subjectSubmissions}
            resultAuditLogs={resultAuditLogs}
            masterRoutines={masterRoutines.filter((r) => r.schoolId === selectedOversightSchool.id)}
          />
        )}

        {onToggleSchoolPublishPermission && onPublishAllEligibleResults && (
          <CentralAdminResultControlPanel
            lang={lang}
            schools={schools}
            exams={exams}
            subjectSubmissions={subjectSubmissions}
            onToggleSchoolPublishPermission={onToggleSchoolPublishPermission}
            onPublishAllEligibleResults={onPublishAllEligibleResults}
          />
        )}
      </div>
    );
  }

  if (activeTab === 'audit') {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {b('অপরিবর্তনীয় কেন্দ্রীয় অডিট লগ (Immutable Audit Trail)', 'Central Immutable Audit Trail', lang)}
        </h1>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                  <th className="py-3 px-4 font-semibold">Who</th>
                  <th className="py-3 px-3 font-semibold">When</th>
                  <th className="py-3 px-3 font-semibold">Action & Target</th>
                  <th className="py-3 px-3 font-semibold">Old → New</th>
                  <th className="py-3 px-4 font-semibold">Reason / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{log.who}</td>
                    <td className="py-3 px-3 tabular-nums text-slate-500">{log.when}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold">{log.what}</div>
                      <div className="text-[11px] text-slate-500">{log.targetName}</div>
                    </td>
                    <td className="py-3 px-3 tabular-nums">
                      {log.oldValue} → <span className="font-semibold text-blue-700 dark:text-blue-400">{log.newValue}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{log.reason ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Reports, Archive, Notifications
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {activeTab === 'reports'
            ? b('রিপোর্ট ও মনিটরিং', 'Central Reports & Monitoring', lang)
            : activeTab === 'archive'
              ? b('স্থগিত ও আর্কাইভকৃত রেকর্ড', 'Suspended & Archived Records', lang)
              : 'Notification Center'}
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

      {activeTab === 'notifications' ? (
        <NotificationCenterPanel
          lang={lang}
          role="central_admin"
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
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {activeTab === 'archive'
              ? b('স্থগিত বিদ্যালয় ও আর্কাইভকৃত অ্যাকাউন্টগুলো এখানে সংরক্ষিত থাকে।', 'Suspended schools and archived records are retained safely here for audit compliance.', lang)
              : b('সকল নিবন্ধিত বিদ্যালয়ের উপস্থিতি, ফলাফল ও উপবৃত্তির সমন্বিত রিপোর্ট।', 'Aggregated national report on attendance, exam results, and stipend verification.', lang)}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {schools
              .filter((s) =>
                activeTab === 'archive'
                  ? s.status === 'suspended' || s.status === 'deactivated' || s.status === 'archived'
                  : true
              )
              .map((s) => (
                <div key={s.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-slate-900 dark:text-white">{s.nameBn}</div>
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${statusTextClass(s.status)}`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="text-slate-500">{s.code} · {s.district}</div>
                  {s.suspensionDetails && s.status === 'suspended' && (
                    <div className="text-amber-700 dark:text-amber-400">
                      Resume: {s.suspensionDetails.expectedResumeDate}
                    </div>
                  )}
                  {s.deactivationDetails && s.status === 'deactivated' && (
                    <div className="text-red-700 dark:text-red-400">
                      Closed: {s.deactivationDetails.finalApprovalDate} ({s.deactivationDetails.inspectionReportRef})
                    </div>
                  )}
                  <div className="tabular-nums font-semibold text-blue-700 dark:text-blue-400">
                    {b('উপস্থিতি:', 'Attendance:', lang)} {s.attendanceRate}%
                  </div>
                </div>
              ))}
          </div>

          {activeTab === 'reports' && onToggleSchoolPublishPermission && onPublishAllEligibleResults && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <CentralAdminResultControlPanel
                lang={lang}
                schools={schools}
                exams={exams}
                subjectSubmissions={subjectSubmissions}
                onToggleSchoolPublishPermission={onToggleSchoolPublishPermission}
                onPublishAllEligibleResults={onPublishAllEligibleResults}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
