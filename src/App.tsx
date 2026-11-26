import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { Bell, CalendarDays, LayoutDashboard, Settings, Share2, GraduationCap } from 'lucide-react';
import type {
  AcademicCalendarEvent,
  AcademicCancelClassReason,
  AcademicModuleId,
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
  DailyLessonStatus,
  ExamRecord,
  ExamRoutineRecord,
  ExamScheduleItem,
  ExtraAcademicItem,
  FeeRecord,
  GlobalAcademicSearchResult,
  GradingRuleItem,
  KioskScanEvent,
  Language,
  LeaveRequestItem,
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
  Role,
  RolePermissionMatrix,
  RoutineSlot,
  SchoolAdminHandoverRecord,
  SchoolDeactivationRecord,
  SchoolInspectionRecord,
  SchoolRecord,
  SchoolSuspensionDetails,
  SchoolTypeCode,
  StudentAttendanceHistoryEntry,
  StudentChangeRequest,
  StudentImportantFieldKey,
  StudentRecord,
  StudentStatus,
  StudyMaterialItem,
  SubjectResultSubmission,
  SubstitutePermissionRecord,
  SubstituteReason,
  TeacherAttendanceLog,
  TeacherChangeRequest,
  TeacherMessageItem,
  TeacherRecord,
  TeacherSchoolAssignment,
  TeacherSchoolPermissions,
  TeacherStatus,
  TeacherSubjectAssignment,
  Theme,
} from './types';
import {
  AVATARS,
  CENTRAL_ADMIN_CREDENTIALS,
  DEFAULT_PROFILE_AVATARS,
  INITIAL_ADMIN_ACCOUNTS,
  INITIAL_APPROVAL_REQUESTS,
  INITIAL_ASSIGNMENTS,
  INITIAL_ATTENDANCE_HISTORY,
  INITIAL_AUDIT_LOGS,
  INITIAL_CONTACT_ADMIN_MESSAGES,
  INITIAL_DOCUMENT_TEMPLATES,
  INITIAL_EXAMS,
  INITIAL_EXAM_ROUTINES,
  INITIAL_FEES,
  INITIAL_KIOSK_SCANS,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_NOTICES,
  INITIAL_NOTIFICATIONS,
  INITIAL_OFFICIAL_DOCUMENTS,
  INITIAL_ROUTINE_SLOTS,
  INITIAL_SCHOOLS,
  INITIAL_STUDENTS,
  INITIAL_STUDENT_CHANGE_REQUESTS,
  INITIAL_TEACHERS,
  INITIAL_TEACHER_CHANGE_REQUESTS,
  INITIAL_TEACHER_MESSAGES,
  INITIAL_TEACHER_SCHOOL_ASSIGNMENTS,
  RECOMMENDED_SCHOOL_COVERS,
} from './data/mockData';
import {
  INITIAL_ACADEMIC_SUBJECTS,
  INITIAL_ACADEMIC_YEARS,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_CLASS_SECTIONS,
  INITIAL_CLASS_TESTS,
  INITIAL_CLASSWORKS,
  INITIAL_CURRICULUM_UNITS,
  INITIAL_DAILY_LESSONS,
  INITIAL_EXAM_SCHEDULES,
  INITIAL_EXTRA_ACADEMIC_ITEMS,
  INITIAL_LESSON_PLANS,
  INITIAL_QUESTION_BANK,
  INITIAL_RESULT_AUDIT_LOGS,
  INITIAL_RESULT_SUBMISSIONS,
  INITIAL_STUDY_MATERIALS,
  INITIAL_SUBSTITUTE_PERMISSIONS,
  INITIAL_TEACHER_ASSIGNMENTS,
  INITIAL_TEACHER_ATTENDANCE,
} from './data/academicSeedData';
import { INITIAL_MASTER_ROUTINES } from './data/routineSeedData';
import {
  DEFAULT_NCTB_GRADING_RULES,
  assignSubstituteWithReason,
  buildGlobalAcademicSearchResults,
  cancelClassSlotWithReason,
  canSchoolPublishResult,
  grantSubstitutePermission,
  publishAllEligibleSchoolsResults,
  restoreCancelledClassSlot,
  reviewSubstitutePermission,
  startClassSessionOnSlot,
  submitSubjectResultMarks,
} from './utils/academicEngine';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  createNoticeRecord,
  editNoticeRecord,
  markNoticeReadByUser,
  transitionNoticeStatus,
  updateNoticeImagesWithHistory,
  type CreateNoticePayload,
} from './utils/notificationAndNoticeEngine';
import {
  createSubordinateAdmin,
  createTeacherJoinApplication,
  deleteSubordinateAdmin,
  filterTeacherWorkspaceBySchoolAssignment,
  isCentralAdminActionBlocked,
  leaveOrSuspendSchoolAssignment,
  reviewTeacherJoinApplication,
  sanitizeActorDisplayForRole,
  toggleSubordinateAdminStatus,
  updateSubordinateAdminPermissions,
  updateTeacherPartBProfessional,
  type TeacherPartBUpdatePayload,
} from './utils/adminAndTeacherIdentityEngine';
import { processAutoIdCardScan } from './utils/attendanceScannerEngine';
import {
  createExamWithGovernance,
  getVisibleExamsForRole,
  setCentralTermExamPublished,
  type CreateLocalExamPayload,
} from './utils/examGovernanceEngine';
import { INITIAL_BD_LOCATIONS } from './data/bdLocations';
import { canAccessSchoolData, canAccessStudentData } from './utils/rbacAndGrading';
import { getSchoolTypeConfig } from './utils/schoolConfigAndAddress';
import {
  applySchoolInfoEdit,
  executeSchoolAdminAction,
  type AdminManagementPayload,
  type SchoolEditPatch,
} from './utils/schoolLifecycle';
import {
  applyTeacherEdit,
  applyTeacherWorkflowAction,
  executeTeacherStatusChange,
  getTeacherCategoryMeta,
  type TeacherEditPatch,
  type TeacherWorkflowActionPayload,
} from './utils/teacherLifecycle';
import {
  IMPORTANT_FIELD_LABELS,
  applyStudentAllowedSelfPatch,
  applyStudentEdit,
  applyStudentTransfer,
  executeStudentStatusChange,
  processStudentChangeRequest,
  verifyStudentDocument,
  type StudentAllowedSelfPatch,
  type StudentEditPatch,
} from './utils/studentLifecycle';
import {
  createDefaultRolePermissionMatrix,
  issueStudentTransferLetter,
  reissueStudentDigitalId,
  reissueTeacherId,
  toggleRolePermission,
  type VerificationQueueItem,
} from './utils/governanceAndVerification';
import { b } from './i18n/translations';
import { TopHeader } from './components/TopHeader';
import { Sidebar } from './components/Sidebar';
import { CentralAdminViews } from './components/CentralAdminViews';
import { SchoolAdminViews } from './components/SchoolAdminViews';
import { GuardianViews } from './components/GuardianViews';
import { StudentPortalView } from './components/TeacherAndStudentViews';
import { TeacherAcademicWorkspace } from './components/TeacherAcademicWorkspace';
import { SchoolRegistrationModal } from './components/SchoolRegistrationModal';
import { PortalLandingHub, type DemoRolePreset } from './components/PortalLandingHub';
import { ApplicationStatusTrackerModal } from './components/PortalIllustrations';
import { NewTeacherRegistrationModal } from './components/TeacherGovernanceModals';
import { ContactAdminModal } from './components/ContactAdminModal';
import { TeacherStudentAdmissionModal } from './components/TeacherStudentAdmissionModal';
import { ImageCropModal } from './components/ImageCropModal';
import { CoverGalleryModal } from './components/CoverGalleryModal';
import { SettingsCenterView } from './components/SettingsCenterView';
import { OfflineIndicator, PWAInstallBanner } from './components/PWAInstallBanner';
import { AppDownloadAndShareModal } from './components/AppDownloadAndShareModal';
import { DashboardAppQuickAccessCard } from './components/DashboardAppQuickAccessCard';
import { AuthLoadingScreen } from './components/AuthScreens';
import {
  FirebaseEmailAuthModal,
  type FirebaseEmailAuthTab,
} from './components/FirebaseEmailAuthModal';
import {
  applyRealtimeUserToSession,
  auth,
  changeFirebaseUserPassword,
  loadRtdbAccountSnapshot,
  recordFirebaseAuditEvent,
  reloadCurrentFirebaseUser,
  resendFirebaseVerificationEmail,
  resolveAndSyncFirebaseUser,
  saveCloudAppBackup,
  saveRtdbAccountSnapshot,
  sendFirebasePasswordReset,
  signInWithFirebaseEmail,
  signInWithFirebaseGoogle,
  signOutFirebase,
  subscribeRealtimeUserAccount,
  syncOwnFirebaseProfile,
} from './firebase';
import {
  executeClientCascadeDelete,
  recordActivityLogInFirestore,
  submitApplicationToFirestore,
  subscribeFirestoreMediaAssets,
  subscribeFirestoreNotices,
  subscribeFirestoreSchools,
  subscribeFirestoreStudents,
  subscribeFirestoreTeachers,
  syncAttendanceToFirestore,
  syncClassToFirestore,
  syncExamToFirestore,
  syncNoticeToFirestore,
  syncSchoolToFirestore,
  syncStudentToFirestore,
  syncSubjectToFirestore,
  syncTeacherToFirestore,
} from './firebaseCollections';
import { uploadDataUrlToStorage } from './firebaseStorage';
import {
  createDefaultGuardianProfile,
  loadPersistedDomainState,
  mergeDomainRecordsById,
  savePersistedDomainState,
  type GuardianProfileState,
} from './utils/localDomainPersistence';
import {
  buildPasswordOverrideKey,
  resolveUnifiedPortalLogin,
} from './utils/unifiedLoginEngine';
import {
  BOOT_ADMIN_EMAIL,
  canAccessRoleDashboard,
  clearStoredPortalSession,
  isAuthorizedSuperAdminSession,
  mapFirebaseAuthErrorMessage,
  persistPortalSession,
  readStoredPortalSession,
  reconcileAuthSessionWithFirebase,
  resolveProtectedRouteAccess,
  sanitizeBootstrapNavigation,
  shouldBlockProtectedContent,
  type AuthStatus,
  type AuthenticatedSession,
} from './utils/authGuard';
import {
  canPerformActionUnderSettings,
  createDefaultSettingsState,
  mapExtendedNotificationsToPreferences,
  type SystemSettingsState,
} from './utils/settingsEngine';
import { DevicePreviewBar, DevicePreviewFrameStage } from './components/DevicePreviewBar';
import {
  PREVIEW_ORIENTATION_STORAGE_KEY,
  PREVIEW_VIEW_MODE_STORAGE_KEY,
  detectAutomaticDeviceCategory,
  detectRuntimePlatform,
  resolveEffectiveViewMode,
  resolveInitialPreviewState,
  shouldShowDeveloperDevicePreviewControls,
  type DetectedDeviceCategory,
  type DeviceOrientation,
  type DeviceViewMode,
  type PlatformTarget,
} from './utils/devicePreviewEngine';
import { detectDeploymentEnvironment, resolveApiUrl } from './utils/deploymentConfig';
import {
  ActionConfirmModal,
  AddAdminModal,
  AddStudentModal,
  LoginModal,
  StudentProfileModal,
  type ConfirmDialogState,
  type LoginModalPresetMode,
} from './components/Modals';

interface InitialPreviewBootstrap {
  isEmbeddedPreview: boolean;
  isProductionEnvironment: boolean;
  showDevPreviewControls: boolean;
  role: Role;
  tab: string;
  lang: Language;
  theme: Theme;
  platform: PlatformTarget;
  viewMode: DeviceViewMode;
  orientation: DeviceOrientation;
}

const SCHOOL_COVER_STORAGE_KEY = 'psms_school_cover_overrides_v1';

function readStoredCoverOverrides(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(SCHOOL_COVER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function persistSchoolCoverOverride(schoolId: string, coverUrl: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = readStoredCoverOverrides();
    current[schoolId] = coverUrl;
    window.localStorage.setItem(SCHOOL_COVER_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore storage quota errors
  }
}

function readInitialPreviewBootstrap(): InitialPreviewBootstrap {
  if (typeof window === 'undefined') {
    return {
      isEmbeddedPreview: false,
      isProductionEnvironment: true,
      showDevPreviewControls: false,
      role: 'central_admin',
      tab: 'dashboard',
      lang: 'bn',
      theme: 'light',
      platform: 'web',
      viewMode: 'auto',
      orientation: 'portrait',
    };
  }
  const params = new URLSearchParams(window.location.search);
  const isEmbedded = params.get('previewEmbed') === '1';
  // Never honor ?role=... or ?tab=... before authentication resolves
  const initialRole: Role = 'central_admin';
  const initialTab = 'dashboard';
  const initialLang: Language = params.get('lang') === 'en' ? 'en' : 'bn';
  const initialTheme: Theme = params.get('theme') === 'dark' ? 'dark' : 'light';
  const isCapNative = Boolean(
    (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
  );
  const paramPlatform = params.get('platform');
  const initialPlatform: PlatformTarget =
    paramPlatform === 'android' || paramPlatform === 'web'
      ? paramPlatform
      : detectRuntimePlatform(navigator.userAgent, isCapNative);

  const envMeta = (
    import.meta as unknown as { env?: { DEV?: boolean; PROD?: boolean; MODE?: string } }
  ).env;
  const isDevBuild = Boolean(envMeta?.DEV);
  const isProdBuild = Boolean(envMeta?.PROD);
  const envProfile = detectDeploymentEnvironment({
    isDevBuild,
    isProdBuild,
    buildMode: envMeta?.MODE,
    hostname: window.location.hostname,
    isCapacitorNative: isCapNative,
  });

  // In production environments, force-hide Device Preview Controls regardless of any other parameters.
  const showDevControls = envProfile.isProduction
    ? false
    : shouldShowDeveloperDevicePreviewControls({
        isDevBuild,
        isProdBuild,
        buildMode: envMeta?.MODE,
        hostname: window.location.hostname,
        search: window.location.search,
        isCapacitorNative: isCapNative,
        isEmbeddedPreview: isEmbedded,
      });

  let savedMode: string | null = null;
  let savedOrientation: string | null = null;
  if (!envProfile.isProduction && showDevControls) {
    try {
      savedMode = window.sessionStorage.getItem(PREVIEW_VIEW_MODE_STORAGE_KEY);
      savedOrientation = window.sessionStorage.getItem(PREVIEW_ORIENTATION_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }
  const resolvedPreview = resolveInitialPreviewState(
    window.location.search,
    savedMode,
    savedOrientation
  );

  return {
    isEmbeddedPreview: isEmbedded,
    isProductionEnvironment: envProfile.isProduction,
    showDevPreviewControls: showDevControls,
    role: initialRole,
    tab: initialTab,
    lang: initialLang,
    theme: initialTheme,
    platform: initialPlatform,
    viewMode: envProfile.isProduction
      ? 'auto'
      : resolveEffectiveViewMode(resolvedPreview.viewMode, showDevControls, isEmbedded),
    orientation: resolvedPreview.orientation,
  };
}

export default function App() {
  const initialBootstrap = useMemo(() => readInitialPreviewBootstrap(), []);
  const isEmbeddedPreview = initialBootstrap.isEmbeddedPreview;
  const isProductionEnvironment = initialBootstrap.isProductionEnvironment;
  const showDevPreviewControls = !isProductionEnvironment && initialBootstrap.showDevPreviewControls;

  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [authenticatedSession, setAuthenticatedSession] = useState<AuthenticatedSession | null>(null);
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [emailAuthModalOpen, setEmailAuthModalOpen] = useState(false);
  const [emailAuthInitialTab, setEmailAuthInitialTab] = useState<FirebaseEmailAuthTab>('signin');
  const [emailAuthPrefill, setEmailAuthPrefill] = useState<string>('');

  const [role, setRole] = useState<Role>(initialBootstrap.role);
  const [activeTab, setActiveTab] = useState<string>(initialBootstrap.tab);
  const [lang, setLang] = useState<Language>(initialBootstrap.lang);
  const [theme, setTheme] = useState<Theme>(initialBootstrap.theme);
  const [deviceViewMode, setDeviceViewMode] = useState<DeviceViewMode>(initialBootstrap.viewMode);
  const [deviceOrientation, setDeviceOrientation] = useState<DeviceOrientation>(initialBootstrap.orientation);
  const [previewPlatform, setPreviewPlatform] = useState<PlatformTarget>(initialBootstrap.platform);
  const [detectedDeviceCategory, setDetectedDeviceCategory] = useState<DetectedDeviceCategory>(() =>
    typeof window !== 'undefined' ? detectAutomaticDeviceCategory(window.innerWidth) : 'auto'
  );
  const effectiveDeviceViewMode = isProductionEnvironment
    ? 'auto'
    : resolveEffectiveViewMode(deviceViewMode, showDevPreviewControls, isEmbeddedPreview);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Active School & Student & Teacher Contexts
  const [activeSchoolAdminSchoolId, setActiveSchoolAdminSchoolId] = useState<string>('GPS-1042');
  const [activeStudentPortalId, setActiveStudentPortalId] = useState<string>('stu-rahim');
  const [activeTeacherPortalId, setActiveTeacherPortalId] = useState<string>('tch-2');
  const [centralNavVersion, setCentralNavVersion] = useState(0);

  // Offline Queue & Sync State
  const [isOffline, setIsOffline] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Domain Data State (Auto-hydrated & persisted locally + synced to Firebase)
  const initialPersistedDomain = useMemo(() => loadPersistedDomainState(), []);
  const [schools, setSchools] = useState<SchoolRecord[]>(() => {
    const overrides = readStoredCoverOverrides();
    const mergedSchools = mergeDomainRecordsById(INITIAL_SCHOOLS, initialPersistedDomain?.schools);
    return mergedSchools.map((s) =>
      Object.prototype.hasOwnProperty.call(overrides, s.id)
        ? { ...s, coverImageUrl: overrides[s.id] }
        : s
    );
  });
  const [locationDb, setLocationDb] = useState<BdLocationDatabase>(INITIAL_BD_LOCATIONS);
  const [requests, setRequests] = useState<ApprovalRequest[]>(INITIAL_APPROVAL_REQUESTS);
  const [teacherRequests, setTeacherRequests] = useState<TeacherChangeRequest[]>(
    INITIAL_TEACHER_CHANGE_REQUESTS
  );
  const [studentRequests, setStudentRequests] = useState<StudentChangeRequest[]>(
    INITIAL_STUDENT_CHANGE_REQUESTS
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>(() =>
    mergeDomainRecordsById(INITIAL_ADMIN_ACCOUNTS, initialPersistedDomain?.adminAccounts)
  );
  const [currentAdminId] = useState<string>('adm-1');
  const [students, setStudents] = useState<StudentRecord[]>(() =>
    mergeDomainRecordsById(INITIAL_STUDENTS, initialPersistedDomain?.students)
  );
  const [teachers, setTeachers] = useState<TeacherRecord[]>(() =>
    mergeDomainRecordsById(INITIAL_TEACHERS, initialPersistedDomain?.teachers)
  );
  const [teacherSchoolAssignments, setTeacherSchoolAssignments] = useState<TeacherSchoolAssignment[]>(
    INITIAL_TEACHER_SCHOOL_ASSIGNMENTS
  );
  const [activeTeacherSchoolId, setActiveTeacherSchoolId] = useState<string>('GPS-1042');
  const [officialDocuments, setOfficialDocuments] = useState<OfficialDocumentRecord[]>(
    INITIAL_OFFICIAL_DOCUMENTS
  );
  const [documentTemplates] = useState<OfficialDocumentTemplate[]>(INITIAL_DOCUMENT_TEMPLATES);
  const [examRoutines, setExamRoutines] = useState<ExamRoutineRecord[]>(INITIAL_EXAM_ROUTINES);
  const [maxNoticeImages, setMaxNoticeImages] = useState<number>(5);
  const [contactAdminMessages, setContactAdminMessages] = useState<ContactAdminMessage[]>(
    INITIAL_CONTACT_ADMIN_MESSAGES
  );
  const [routineSlots, setRoutineSlots] = useState<RoutineSlot[]>(INITIAL_ROUTINE_SLOTS);
  const [masterRoutines, setMasterRoutines] = useState<MasterRoutineRecord[]>(INITIAL_MASTER_ROUTINES);
  const [kioskScans, setKioskScans] = useState<KioskScanEvent[]>(INITIAL_KIOSK_SCANS);
  const [attendanceHistory, setAttendanceHistory] = useState<StudentAttendanceHistoryEntry[]>(
    INITIAL_ATTENDANCE_HISTORY
  );
  const [exams, setExams] = useState<ExamRecord[]>(INITIAL_EXAMS);
  const [fees, setFees] = useState<FeeRecord[]>(INITIAL_FEES);
  const [notices, setNotices] = useState<NoticeItem[]>(() =>
    mergeDomainRecordsById(INITIAL_NOTICES, initialPersistedDomain?.notices)
  );
  const [guardianProfile, setGuardianProfile] = useState<GuardianProfileState>(
    () => initialPersistedDomain?.guardianProfile ?? createDefaultGuardianProfile()
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [lastLoginIso, setLastLoginIso] = useState<string>('2026-11-19T09:00:00');
  const [assignments, setAssignments] = useState<AssignmentItem[]>(INITIAL_ASSIGNMENTS);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>(INITIAL_LEAVE_REQUESTS);
  const [messages, setMessages] = useState<TeacherMessageItem[]>(INITIAL_TEACHER_MESSAGES);

  // Extended Academic Management State
  const [academicYears, setAcademicYears] = useState<AcademicYearRecord[]>(INITIAL_ACADEMIC_YEARS);
  const [calendarEvents, setCalendarEvents] = useState<AcademicCalendarEvent[]>(INITIAL_CALENDAR_EVENTS);
  const [classSections, setClassSections] = useState<ClassSectionRoomConfig[]>(INITIAL_CLASS_SECTIONS);
  const [academicSubjects, setAcademicSubjects] = useState<AcademicSubjectConfig[]>(INITIAL_ACADEMIC_SUBJECTS);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherSubjectAssignment[]>(INITIAL_TEACHER_ASSIGNMENTS);
  const [teacherAttendance, setTeacherAttendance] = useState<TeacherAttendanceLog[]>(INITIAL_TEACHER_ATTENDANCE);
  const [classworks, setClassworks] = useState<ClassworkItem[]>(INITIAL_CLASSWORKS);
  const [curriculumUnits] = useState<CurriculumUnit[]>(INITIAL_CURRICULUM_UNITS);
  const [lessonPlans, setLessonPlans] = useState<LessonPlanItem[]>(INITIAL_LESSON_PLANS);
  const [studyMaterials] = useState<StudyMaterialItem[]>(INITIAL_STUDY_MATERIALS);
  const [classTests] = useState<ClassTestQuizItem[]>(INITIAL_CLASS_TESTS);
  const [questionBank] = useState<QuestionBankItem[]>(INITIAL_QUESTION_BANK);
  const [examSchedules] = useState<ExamScheduleItem[]>(INITIAL_EXAM_SCHEDULES);
  const [gradingRules, setGradingRules] = useState<GradingRuleItem[]>(DEFAULT_NCTB_GRADING_RULES);
  const [extraAcademicItems] = useState<ExtraAcademicItem[]>(INITIAL_EXTRA_ACADEMIC_ITEMS);
  const [dailyLessons, setDailyLessons] = useState<DailyLessonHomeworkItem[]>(INITIAL_DAILY_LESSONS);
  const [substitutePermissions, setSubstitutePermissions] = useState<SubstitutePermissionRecord[]>(
    INITIAL_SUBSTITUTE_PERMISSIONS
  );
  const [subjectSubmissions, setSubjectSubmissions] = useState<SubjectResultSubmission[]>(
    INITIAL_RESULT_SUBMISSIONS
  );
  const [resultAuditLogs, setResultAuditLogs] = useState<ResultAuditEntry[]>(INITIAL_RESULT_AUDIT_LOGS);
  const [favoriteModules, setFavoriteModules] = useState<AcademicModuleId[]>([
    'class_routine',
    'todays_lessons',
    'result',
  ]);
  const [recentModules, setRecentModules] = useState<AcademicModuleId[]>([
    'academic_dashboard',
    'live_class_monitor',
    'teacher_assignment',
  ]);
  const [externalAcademicModule, setExternalAcademicModule] = useState<AcademicModuleId | undefined>(
    undefined
  );

  // Guardian Linked Children
  const [linkedChildIds, setLinkedChildIds] = useState<string[]>(['stu-rahim', 'stu-karim']);
  const [selectedChildId, setSelectedChildId] = useState<string>('stu-rahim');

  // Modals
  const [confirmState, setConfirmState] = useState<ConfirmDialogState | null>(null);
  const [inspectedStudent, setInspectedStudent] = useState<StudentRecord | null>(null);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [teacherStudentAdmissionOpen, setTeacherStudentAdmissionOpen] = useState(false);
  const [admissionActorRole, setAdmissionActorRole] = useState<'teacher' | 'school_admin' | 'central_admin'>('teacher');
  const [schoolRegModal, setSchoolRegModal] = useState<{ open: boolean; mode: 'ONLINE' | 'MANUAL' }>({
    open: false,
    mode: 'ONLINE',
  });
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [contactAdminModalOpen, setContactAdminModalOpen] = useState(false);
  const [appDownloadShareModalOpen, setAppDownloadShareModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginPresetMode, setLoginPresetMode] = useState<LoginModalPresetMode>('teacher');
  const landingHubOpen = authStatus !== 'authenticated';
  const [statusTrackerOpen, setStatusTrackerOpen] = useState(false);
  const [publicTeacherRegOpen, setPublicTeacherRegOpen] = useState(false);
  const [publicStudentRegOpen, setPublicStudentRegOpen] = useState(false);
  const [portalPasswordOverrides, setPortalPasswordOverrides] = useState<Record<string, string>>(() => {
    try {
      const raw =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('psms_portal_password_overrides_v1')
          : null;
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      return {};
    }
  });
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [authenticatedSchoolLockId, setAuthenticatedSchoolLockId] = useState<string | null>(null);
  const guardianPhotoUrl = guardianProfile.photoUrl;
  const setGuardianPhotoUrl = useCallback((nextPhotoUrl: string | undefined) => {
    setGuardianProfile((prev) => ({ ...prev, photoUrl: nextPhotoUrl }));
  }, []);
  const [coverGalleryOpen, setCoverGalleryOpen] = useState(false);
  const [cropModalState, setCropModalState] = useState<{
    open: boolean;
    mode: 'profile' | 'banner';
    entityType: 'central_admin' | 'school_admin' | 'teacher' | 'student' | 'guardian' | 'school_cover';
    entityId: string;
    titleBn: string;
    currentUrl?: string;
  } | null>(null);

  // Governance Permission Matrix & Reviewer Role Simulation
  const [permissionMatrix, setPermissionMatrix] = useState<RolePermissionMatrix>(() =>
    createDefaultRolePermissionMatrix()
  );
  const [activeReviewerRole, setActiveReviewerRole] = useState<AdminReviewerRole>(
    'Super Central Admin'
  );

  const activeCentralAdmin = useMemo(
    () => adminAccounts.find((a) => a.id === currentAdminId) ?? adminAccounts[0],
    [adminAccounts, currentAdminId]
  );

  const activeInspectedStudent = useMemo(
    () =>
      inspectedStudent
        ? students.find((s) => s.id === inspectedStudent.id) ?? inspectedStudent
        : null,
    [inspectedStudent, students]
  );

  const [systemSettings, setSystemSettings] = useState<SystemSettingsState>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem('psms_unified_settings_v1') : null;
      if (saved) return JSON.parse(saved) as SystemSettingsState;
    } catch {
      // ignore storage errors
    }
    return createDefaultSettingsState('bn', 'light');
  });

  useEffect(() => {
    savePersistedDomainState({
      version: 1,
      schools,
      teachers,
      students,
      adminAccounts,
      notices,
      guardianProfile,
    });
  }, [schools, teachers, students, adminAccounts, notices, guardianProfile]);

  useEffect(() => {
    let mounted = true;
    fetch(resolveApiUrl('/api/settings'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { settings?: SystemSettingsState } | null) => {
        if (!mounted || !data?.settings?.features) return;
        setSystemSettings((prev) => {
          const prevTs = Date.parse(prev.updatedAt || '');
          const remoteTs = Date.parse(data.settings?.updatedAt || '');
          if (!Number.isNaN(prevTs) && !Number.isNaN(remoteTs) && prevTs > remoteTs) {
            return prev;
          }
          if (!Number.isNaN(prevTs) && prev.updatedBy && prev.updatedBy !== 'System Default' && Number.isNaN(remoteTs)) {
            return prev;
          }
          return data.settings as SystemSettingsState;
        });
      })
      .catch(() => {
        // Offline / client-only fallback already active
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SCHOOL_COVER_STORAGE_KEY) return;
      const overrides = readStoredCoverOverrides();
      setSchools((prev) =>
        prev.map((s) =>
          Object.prototype.hasOwnProperty.call(overrides, s.id)
            ? { ...s, coverImageUrl: overrides[s.id] }
            : s
        )
      );
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const lastSyncedFromParentRef = React.useRef<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => {
      setDetectedDeviceCategory(detectAutomaticDeviceCategory(window.innerWidth));
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (isEmbeddedPreview || !showDevPreviewControls || typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(PREVIEW_VIEW_MODE_STORAGE_KEY, deviceViewMode);
      window.sessionStorage.setItem(PREVIEW_ORIENTATION_STORAGE_KEY, deviceOrientation);
    } catch {
      // ignore storage errors
    }
  }, [isEmbeddedPreview, showDevPreviewControls, deviceViewMode, deviceOrientation]);

  useEffect(() => {
    if (!isEmbeddedPreview) return;
    const onMessage = (event: MessageEvent) => {
      if (typeof window !== 'undefined' && event.origin !== window.location.origin) return;
      const data = event.data as {
        type?: string;
        platform?: PlatformTarget;
        lang?: Language;
        theme?: Theme;
        role?: Role;
        tab?: string;
        viewMode?: DeviceViewMode;
      } | null;
      if (!data || data.type !== 'PSMS_PREVIEW_SYNC') return;
      lastSyncedFromParentRef.current = JSON.stringify({
        platform: data.platform,
        lang: data.lang,
        theme: data.theme,
        role: data.role,
        tab: data.tab,
      });
      if (data.platform === 'web' || data.platform === 'android') {
        setPreviewPlatform(data.platform);
      }
      if (data.lang === 'bn' || data.lang === 'en') {
        setLang(data.lang);
      }
      if (data.theme === 'light' || data.theme === 'dark') {
        setTheme(data.theme);
      }
      if (data.role && canAccessRoleDashboard(authenticatedSession, data.role)) {
        setRole(data.role);
      }
      if (typeof data.tab === 'string' && data.tab.length > 0) {
        setActiveTab(data.tab);
      }
      if (
        data.viewMode === 'auto' ||
        data.viewMode === 'mobile' ||
        data.viewMode === 'tablet' ||
        data.viewMode === 'desktop'
      ) {
        setDeviceViewMode(data.viewMode);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [isEmbeddedPreview]);

  useEffect(() => {
    if (!isEmbeddedPreview || typeof window === 'undefined' || window.parent === window) return;
    const sig = JSON.stringify({
      platform: previewPlatform,
      lang,
      theme,
      role,
      tab: activeTab,
    });
    if (lastSyncedFromParentRef.current === sig) {
      lastSyncedFromParentRef.current = '';
      return;
    }
    window.parent.postMessage(
      {
        type: 'PSMS_EMBED_STATE_CHANGE',
        role,
        tab: activeTab,
        lang,
        theme,
        platform: previewPlatform,
      },
      window.location.origin
    );
  }, [isEmbeddedPreview, role, activeTab, lang, theme, previewPlatform]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    const fontPx =
      systemSettings.appearance.fontSize === 'small'
        ? '14px'
        : systemSettings.appearance.fontSize === 'large'
          ? '18px'
          : '16px';
    root.style.fontSize = fontPx;
  }, [theme, systemSettings.appearance.fontSize]);

  const handleUpdateSystemSettings = (next: SystemSettingsState, auditEntry?: AuditLogEntry) => {
    setSystemSettings(next);
    setNotificationPreferences(mapExtendedNotificationsToPreferences(next.notifications));
    try {
      window.localStorage.setItem('psms_unified_settings_v1', JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
    if (auditEntry) {
      setAuditLogs((prev) => [auditEntry, ...prev]);
    }
    fetch(resolveApiUrl('/api/settings'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: next, auditEntry }),
    }).catch(() => {
      // Cached locally; will sync when online
    });
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const appendAuditLog = (entry: Omit<AuditLogEntry, 'id' | 'when'>) => {
    const nowStr = '১৭ নভে ২০২৬, ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setAuditLogs((prev) => [
      {
        ...entry,
        id: `AUD-${Date.now().toString().slice(-4)}`,
        when: nowStr,
      },
      ...prev,
    ]);
    if (isOffline) {
      setPendingSyncCount((c) => c + 1);
    }
    if (auth.currentUser?.emailVerified) {
      void recordActivityLogInFirestore({
        actorRole: entry.role,
        actionType: entry.what.slice(0, 60),
        targetType: entry.studentId
          ? 'student'
          : entry.teacherId
            ? 'teacher'
            : entry.schoolId
              ? 'school'
              : 'system',
        targetId: entry.studentId || entry.teacherId || entry.schoolId || entry.requestId || 'system',
        summary: `${entry.what}: ${entry.targetName} (${entry.oldValue} -> ${entry.newValue})`,
        schoolId: entry.schoolId,
      });
    }
  };

  const applyVerifiedSession = React.useCallback((session: AuthenticatedSession) => {
    setAuthenticatedSession(session);
    setRole(session.role);
    if (session.role === 'school_admin' && session.schoolId) {
      setActiveSchoolAdminSchoolId(session.schoolId);
      setAuthenticatedSchoolLockId(session.schoolId);
    } else {
      setAuthenticatedSchoolLockId(null);
    }
    if (session.role === 'teacher') {
      if (session.teacherId) setActiveTeacherPortalId(session.teacherId);
      if (session.schoolId) setActiveTeacherSchoolId(session.schoolId);
    }
    if (session.role === 'student' && session.studentId) {
      setActiveStudentPortalId(session.studentId);
    }
    if (session.role === 'guardian' && session.studentId) {
      setSelectedChildId(session.studentId);
    }
    const nav = sanitizeBootstrapNavigation(
      typeof window !== 'undefined' ? window.location.search : '',
      session
    );
    setActiveTab(nav.tab);
    setAuthError(null);
    setAuthNotice(null);
    setAuthStatus('authenticated');
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!active) return;
      const stored = readStoredPortalSession();
      if (firebaseUser) {
        try {
          const {
            session,
            pendingRoleSelection,
            unverifiedEmail,
            blockedReasonBn,
            blockedReasonEn,
          } = await resolveAndSyncFirebaseUser(firebaseUser);
          if (!active) return;
          if (blockedReasonBn || blockedReasonEn) {
            void signOutFirebase();
            clearStoredPortalSession();
            setAuthenticatedSession(null);
            setAuthStatus('unauthenticated');
            setAuthError(
              b(
                blockedReasonBn || 'আপনার অ্যাকাউন্টটি স্থগিত বা নিষ্ক্রিয় রয়েছে।',
                blockedReasonEn || 'Your account is suspended, rejected, or deactivated.',
                lang
              )
            );
            return;
          }
          if (session) {
            persistPortalSession(session);
            applyVerifiedSession(session);
            return;
          }
          if (unverifiedEmail || pendingRoleSelection) {
            const reconciled = reconcileAuthSessionWithFirebase(
              {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                emailVerified: firebaseUser.emailVerified,
              },
              stored
            );
            if (reconciled.clearStored) {
              clearStoredPortalSession();
            }
            if (reconciled.status === 'authenticated' && reconciled.session) {
              applyVerifiedSession(reconciled.session);
              return;
            }
            setAuthenticatedSession(null);
            setAuthStatus('unauthenticated');
            if (pendingRoleSelection) {
              setAuthNotice(
                b(
                  'Google অ্যাকাউন্ট যাচাই সম্পন্ন হয়েছে। অনুমোদিত ড্যাশবোর্ডে প্রবেশ করতে আপনার নির্ধারিত রোল পোর্টাল আইডি-পাসওয়ার্ড ব্যবহার করুন অথবা অ্যাডমিনের অনুমোদনের জন্য অপেক্ষা করুন।',
                  'Google account verified, but no portal role is assigned yet. Please sign in with your School/Teacher/Student/Guardian portal credentials or contact Central Admin.',
                  lang
                )
              );
            }
            return;
          }
        } catch (err) {
          if (!active) return;
          const reconciled = reconcileAuthSessionWithFirebase(
            {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              emailVerified: firebaseUser.emailVerified,
            },
            stored
          );
          if (reconciled.clearStored) {
            clearStoredPortalSession();
          }
          if (reconciled.status === 'authenticated' && reconciled.session) {
            applyVerifiedSession(reconciled.session);
            return;
          }
          setAuthenticatedSession(null);
          setAuthStatus('unauthenticated');
          setAuthError(
            err instanceof Error
              ? err.message
              : b('সেশন যাচাইয়ে ত্রুটি হয়েছে। আবার লগইন করুন।', 'Session verification failed. Please sign in.', lang)
          );
          return;
        }
      }

      const reconciled = reconcileAuthSessionWithFirebase(null, stored);
      if (reconciled.clearStored) {
        clearStoredPortalSession();
      }
      if (reconciled.status === 'authenticated' && reconciled.session) {
        applyVerifiedSession(reconciled.session);
      } else {
        setAuthenticatedSession(null);
        setAuthStatus('unauthenticated');
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [applyVerifiedSession]);

  useEffect(() => {
    if (
      authStatus !== 'authenticated' ||
      !authenticatedSession ||
      authenticatedSession.provider === 'institutional_portal'
    ) {
      return;
    }
    const uid = authenticatedSession.uid;
    if (!uid || !auth.currentUser?.emailVerified) return;

    let cancelled = false;
    void loadRtdbAccountSnapshot(uid).then((snapshot) => {
      if (cancelled || !snapshot) return;
      if (snapshot.language && snapshot.language !== lang) {
        setLang(snapshot.language);
      }
      if (snapshot.themePreference && snapshot.themePreference !== 'system') {
        setTheme(snapshot.themePreference);
      }
      if (snapshot.settingsJson) {
        try {
          const parsed = JSON.parse(snapshot.settingsJson) as Partial<SystemSettingsState>;
          if (parsed && parsed.features) {
            setSystemSettings((prev) => ({
              ...prev,
              ...parsed,
              features: { ...prev.features, ...parsed.features },
              appearance: { ...prev.appearance, ...(parsed.appearance ?? {}) },
              security: { ...prev.security, ...(parsed.security ?? {}) },
              regional: { ...prev.regional, ...(parsed.regional ?? {}) },
              notifications: { ...prev.notifications, ...(parsed.notifications ?? {}) },
            }));
          }
        } catch {
          // ignore malformed remote settings JSON
        }
      }
    });

    const unsubRtdb = subscribeRealtimeUserAccount(uid, (rtdbUser) => {
      if (!rtdbUser) return;

      setAuthenticatedSession((prev) => {
        const outcome = applyRealtimeUserToSession(prev, rtdbUser);
        if (outcome.suspended) {
          void signOutFirebase();
          clearStoredPortalSession();
          setAuthStatus('unauthenticated');
          setAuthError(
            b(
              'আপনার অ্যাকাউন্টটি অ্যাডমিন দ্বারা স্থগিত (Suspended) করা হয়েছে।',
              'Your account has been suspended by an administrator.',
              lang
            )
          );
          return null;
        }
        if (!outcome.changed || !outcome.nextSession) {
          return prev;
        }

        const updated = outcome.nextSession;
        persistPortalSession(updated);

        if (updated.role !== role) {
          setRole(updated.role);
        }
        if (updated.role === 'school_admin' && updated.schoolId) {
          setActiveSchoolAdminSchoolId(updated.schoolId);
          setAuthenticatedSchoolLockId(updated.schoolId);
        }
        if (updated.role === 'teacher' && updated.teacherId) {
          setActiveTeacherPortalId(updated.teacherId);
          if (updated.schoolId) setActiveTeacherSchoolId(updated.schoolId);
        }
        if (updated.role === 'student' && updated.studentId) {
          setActiveStudentPortalId(updated.studentId);
        }
        if (updated.role === 'guardian' && updated.studentId) {
          setSelectedChildId(updated.studentId);
        }
        if (updated.role === 'central_admin') {
          setAdminAccounts((prevAdmins) =>
            prevAdmins.map((adm) =>
              adm.email === updated.email || adm.id === activeCentralAdmin?.id
                ? {
                    ...adm,
                    name: updated.displayName,
                    email: updated.email ?? adm.email,
                    mobile: rtdbUser.phone || adm.mobile,
                  }
                : adm
            )
          );
        }
        if (rtdbUser.phone || rtdbUser.recoveryEmail || rtdbUser.recoveryPhone) {
          setSystemSettings((prevSettings) => ({
            ...prevSettings,
            accountRecoveryEmail:
              rtdbUser.recoveryEmail || rtdbUser.email || prevSettings.accountRecoveryEmail,
            accountRecoveryPhone:
              rtdbUser.recoveryPhone || rtdbUser.phone || prevSettings.accountRecoveryPhone,
          }));
        }

        return updated;
      });
    });

    return () => {
      cancelled = true;
      unsubRtdb();
    };
  }, [authStatus, authenticatedSession?.uid, authenticatedSession?.provider, lang, role, activeCentralAdmin?.id]);

  useEffect(() => {
    if (
      authStatus !== 'authenticated' ||
      !authenticatedSession ||
      authenticatedSession.provider === 'institutional_portal' ||
      !auth.currentUser?.emailVerified
    ) {
      return;
    }

    const unsubSchools = subscribeFirestoreSchools((remoteSchools) => {
      if (!remoteSchools || remoteSchools.length === 0) return;
      setSchools((prev) => {
        const next = [...prev];
        remoteSchools.forEach((rs) => {
          const idx = next.findIndex((s) => s.id === rs.schoolId);
          if (idx >= 0) {
            next[idx] = {
              ...next[idx],
              nameBn: rs.nameBn || next[idx].nameBn,
              nameEn: rs.nameEn || next[idx].nameEn,
              eiin: rs.eiin || next[idx].eiin,
              status: (rs.status as SchoolRecord['status']) || next[idx].status,
            };
          } else if (INITIAL_SCHOOLS[0]) {
            next.unshift({
              ...INITIAL_SCHOOLS[0],
              id: rs.schoolId,
              code: rs.schoolId,
              nameBn: rs.nameBn,
              nameEn: rs.nameEn,
              eiin: rs.eiin,
              status: (rs.status as SchoolRecord['status']) || 'pending',
            });
          }
        });
        return next;
      });
    });

    const unsubNotices = subscribeFirestoreNotices((remoteNotices) => {
      if (!remoteNotices || remoteNotices.length === 0) return;
      setNotices((prev) => {
        const next = [...prev];
        remoteNotices.forEach((rn) => {
          const idx = next.findIndex((n) => n.id === rn.noticeId);
          if (idx >= 0) {
            next[idx] = {
              ...next[idx],
              titleBn: rn.title || next[idx].titleBn,
              bodyBn: rn.body || next[idx].bodyBn,
              isEmergency: rn.priority === 'urgent',
            };
          } else {
            next.unshift({
              id: rn.noticeId,
              titleBn: rn.title,
              titleEn: rn.title,
              bodyBn: rn.body,
              bodyEn: rn.body,
              category: 'central',
              audience:
                rn.audience === 'teachers' || rn.audience === 'students' || rn.audience === 'guardians'
                  ? rn.audience
                  : 'all',
              date: new Date().toISOString().slice(0, 10),
              schoolId: rn.schoolId,
              author: 'Firebase Cloud Sync',
              isEmergency: rn.priority === 'urgent',
              status: rn.status === 'archived' ? 'Expired' : 'Published',
            });
          }
        });
        return next;
      });
    });

    const unsubTeachers = subscribeFirestoreTeachers((remoteTeachers) => {
      if (!remoteTeachers || remoteTeachers.length === 0) return;
      setTeachers((prev) => {
        const next = [...prev];
        remoteTeachers.forEach((rt) => {
          const idx = next.findIndex((t) => t.id === rt.teacherId);
          if (idx >= 0) {
            next[idx] = {
              ...next[idx],
              nameBn: rt.nameBn || next[idx].nameBn,
              nameEn: rt.nameEn || next[idx].nameEn,
              designation: rt.designation || next[idx].designation,
              email: rt.email || next[idx].email,
              mobile: rt.mobile || next[idx].mobile,
              status: (rt.status as TeacherRecord['status']) || next[idx].status,
            };
          } else if (INITIAL_TEACHERS[0]) {
            next.unshift({
              ...INITIAL_TEACHERS[0],
              id: rt.teacherId,
              teacherCode: rt.teacherId,
              schoolId: rt.schoolId,
              nameBn: rt.nameBn,
              nameEn: rt.nameEn,
              designation: rt.designation,
              email: rt.email || '',
              mobile: rt.mobile || '',
              status: (rt.status as TeacherRecord['status']) || 'pending',
            });
          }
        });
        return next;
      });
    });

    const unsubStudents = subscribeFirestoreStudents((remoteStudents) => {
      if (!remoteStudents || remoteStudents.length === 0) return;
      setStudents((prev) => {
        const next = [...prev];
        remoteStudents.forEach((rs) => {
          const idx = next.findIndex((st) => st.id === rs.studentId);
          if (idx >= 0) {
            next[idx] = {
              ...next[idx],
              nameBn: rs.nameBn || next[idx].nameBn,
              nameEn: rs.nameEn || next[idx].nameEn,
              className: rs.className || next[idx].className,
              section: rs.section || next[idx].section,
              roll: rs.roll ?? next[idx].roll,
              guardianMobile: rs.guardianMobile || next[idx].guardianMobile,
              status: (rs.status as StudentRecord['status']) || next[idx].status,
            };
          } else if (INITIAL_STUDENTS[0]) {
            next.unshift({
              ...INITIAL_STUDENTS[0],
              id: rs.studentId,
              permanentId: rs.studentId,
              schoolId: rs.schoolId,
              nameBn: rs.nameBn,
              nameEn: rs.nameEn,
              className: rs.className,
              section: rs.section,
              roll: rs.roll,
              guardianMobile: rs.guardianMobile,
              status: (rs.status as StudentRecord['status']) || 'active',
            });
          }
        });
        return next;
      });
    });

    const unsubMediaAssets = subscribeFirestoreMediaAssets((assets) => {
      if (!assets || assets.length === 0) return;
      assets.forEach((asset) => {
        if (!asset.dataUrl) return;
        if (asset.category === 'school_covers') {
          persistSchoolCoverOverride(asset.scopeId, asset.dataUrl);
          setSchools((prev) =>
            prev.map((s) => (s.id === asset.scopeId ? { ...s, coverImageUrl: asset.dataUrl } : s))
          );
        } else if (asset.category === 'profile_photos') {
          setSchools((prev) =>
            prev.map((s) =>
              s.id === asset.scopeId ? { ...s, headTeacherPhotoUrl: asset.dataUrl } : s
            )
          );
          setTeachers((prev) =>
            prev.map((t) => (t.id === asset.scopeId ? { ...t, photoUrl: asset.dataUrl } : t))
          );
          setStudents((prev) =>
            prev.map((st) => (st.id === asset.scopeId ? { ...st, photoUrl: asset.dataUrl } : st))
          );
          setAdminAccounts((prev) =>
            prev.map((adm) => (adm.id === asset.scopeId ? { ...adm, photoUrl: asset.dataUrl } : adm))
          );
          if (asset.scopeId === 'guardian-1') {
            setGuardianPhotoUrl(asset.dataUrl);
          }
        }
      });
    });

    return () => {
      unsubSchools();
      unsubNotices();
      unsubTeachers();
      unsubStudents();
      unsubMediaAssets();
    };
  }, [authStatus, authenticatedSession?.uid, authenticatedSession?.provider, setGuardianPhotoUrl]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthNotice(null);
    setGoogleSigningIn(true);
    try {
      const user = await signInWithFirebaseGoogle();
      const {
        session,
        pendingRoleSelection,
        blockedReasonBn,
        blockedReasonEn,
      } = await resolveAndSyncFirebaseUser(user);
      if (blockedReasonBn || blockedReasonEn) {
        await signOutFirebase();
        clearStoredPortalSession();
        setAuthenticatedSession(null);
        setAuthStatus('unauthenticated');
        setAuthError(
          b(
            blockedReasonBn || 'আপনার অ্যাকাউন্টটি স্থগিত বা নিষ্ক্রিয় রয়েছে।',
            blockedReasonEn || 'Your account is suspended, rejected, or deactivated.',
            lang
          )
        );
        return;
      }
      if (session) {
        persistPortalSession(session);
        applyVerifiedSession(session);
        setLoginModalOpen(false);
        void recordFirebaseAuditEvent({
          role: session.role,
          what: 'Firebase Google Sign-In Verified',
          targetName: session.email || session.displayName,
          schoolId: session.schoolId,
        });
        showToast(b('Google অ্যাকাউন্ট দিয়ে নিরাপদে প্রবেশ সম্পন্ন হয়েছে।', 'Signed in via Google Firebase Auth.', lang));
      } else if (pendingRoleSelection) {
        setLoginModalOpen(false);
        setAuthStatus('unauthenticated');
        setAuthNotice(
          b(
            'Google অ্যাকাউন্ট যাচাই হয়েছে। রোল নির্ধারণের জন্য নিচের পোর্টাল লগইন কার্ড ব্যবহার করুন অথবা সুপার অ্যাডমিনের অনুমোদন নিন।',
            'Google account verified. Use your portal ID below or contact Central Admin to assign your role.',
            lang
          )
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isPopupIssue =
        message.includes('popup-blocked') ||
        message.includes('popup-closed-by-user') ||
        message.includes('cancelled-popup-request');
      setAuthError(
        isPopupIssue
          ? b(
              'Google পপ-আপ বন্ধ বা ব্লক হয়েছে। মোবাইল অ্যাপ বা ব্রাউজারে পপ-আপ অনুমতি দিন অথবা নিচের পোর্টাল আইডি-পাসওয়ার্ড দিয়ে লগইন করুন।',
              'Google sign-in popup was closed or blocked. Allow popups or sign in using your institutional portal ID below.',
              lang
            )
          : b(
              `Google লগইন সম্পন্ন করা যায়নি (${message})। নিচের পোর্টাল আইডি দিয়ে লগইন করতে পারেন।`,
              `Google sign-in could not complete (${message}). You can sign in using your portal credentials below.`,
              lang
            )
      );
    } finally {
      setGoogleSigningIn(false);
    }
  };

  const handleSuperAdminFirebaseSignIn = async (
    email: string,
    password: string
  ): Promise<{ ok: boolean; unverifiedEmail?: boolean; message?: string }> => {
    setAuthError(null);
    setAuthNotice(null);
    try {
      const user = await signInWithFirebaseEmail(email, password);
      if (!user.emailVerified) {
        try {
          await resendFirebaseVerificationEmail();
        } catch {
          // May already have a recent verification email in flight
        }
        return {
          ok: false,
          unverifiedEmail: true,
          message: b(
            `${user.email ?? email} ঠিকানায় ভেরিফিকেশন লিংক পাঠানো হয়েছে। Gmail ইনবক্স থেকে লিংকে ক্লিক করে "ভেরিফিকেশন যাচাই করুন" বাটনে চাপুন অথবা নিচের Google Sign-In ব্যবহার করুন।`,
            `Verification link sent to ${user.email ?? email}. Click the link in your inbox, then press "Verify & Enter" (or use Google Sign-In below).`,
            lang
          ),
        };
      }

      const resolved = await resolveAndSyncFirebaseUser(user);
      if (resolved.blockedReasonBn || resolved.blockedReasonEn) {
        await signOutFirebase();
        clearStoredPortalSession();
        return {
          ok: false,
          message: b(
            resolved.blockedReasonBn || 'অ্যাকাউন্টটি স্থগিত বা নিষ্ক্রিয় রয়েছে।',
            resolved.blockedReasonEn || 'Account is suspended, rejected, or deactivated.',
            lang
          ),
        };
      }
      if (!resolved.session || !isAuthorizedSuperAdminSession(resolved.session)) {
        await signOutFirebase();
        return {
          ok: false,
          message: b(
            `এই Firebase অ্যাকাউন্ট (${user.email ?? email}) Super Central Admin হিসেবে অনুমোদিত নয়। অনুগ্রহ করে ${BOOT_ADMIN_EMAIL} দিয়ে লগইন করুন।`,
            `This Firebase account (${user.email ?? email}) is not authorized as Super Central Admin. Use ${BOOT_ADMIN_EMAIL}.`,
            lang
          ),
        };
      }

      persistPortalSession(resolved.session);
      applyVerifiedSession(resolved.session);
      void recordFirebaseAuditEvent({
        role: 'central_admin',
        what: 'Super Central Admin Firebase Sign-In Verified',
        targetName: resolved.session.email || resolved.session.displayName,
      });
      showToast(
        b(
          'Super Central Admin হিসেবে Firebase Authentication যাচাই সফল হয়েছে।',
          'Signed in as Super Central Admin via Firebase Authentication.',
          lang
        )
      );
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: mapFirebaseAuthErrorMessage(error, lang),
      };
    }
  };

  const handleSuperAdminRecheckVerification = async (): Promise<{ ok: boolean; message?: string }> => {
    try {
      const refreshed = await reloadCurrentFirebaseUser();
      if (!refreshed) {
        return {
          ok: false,
          message: b('পুনরায় Gmail ও পাসওয়ার্ড দিয়ে লগইন করুন।', 'Please sign in again to recheck verification.', lang),
        };
      }
      if (!refreshed.emailVerified) {
        return {
          ok: false,
          message: b(
            'ইমেইল এখনো ভেরিফাইড দেখাচ্ছে না। Gmail-এর লিংকে ক্লিক করার পর আবার চেষ্টা করুন।',
            'Email is still unverified. Click the link in your Gmail inbox first.',
            lang
          ),
        };
      }
      const resolved = await resolveAndSyncFirebaseUser(refreshed);
      if (resolved.blockedReasonBn || resolved.blockedReasonEn) {
        await signOutFirebase();
        clearStoredPortalSession();
        return {
          ok: false,
          message: b(
            resolved.blockedReasonBn || 'অ্যাকাউন্টটি স্থগিত বা নিষ্ক্রিয় রয়েছে।',
            resolved.blockedReasonEn || 'Account is suspended, rejected, or deactivated.',
            lang
          ),
        };
      }
      if (!resolved.session || !isAuthorizedSuperAdminSession(resolved.session)) {
        await signOutFirebase();
        return {
          ok: false,
          message: b(
            `এই অ্যাকাউন্টটি Super Central Admin (${BOOT_ADMIN_EMAIL}) নয়।`,
            `This account is not an authorized Super Central Admin (${BOOT_ADMIN_EMAIL}).`,
            lang
          ),
        };
      }
      persistPortalSession(resolved.session);
      applyVerifiedSession(resolved.session);
      void recordFirebaseAuditEvent({
        role: 'central_admin',
        what: 'Super Central Admin Email Verified & Signed In',
        targetName: resolved.session.email || resolved.session.displayName,
      });
      showToast(b('সুপার সেন্ট্রাল অ্যাডমিন যাচাই সফল হয়েছে।', 'Super Central Admin verified and signed in.', lang));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: mapFirebaseAuthErrorMessage(error, lang) };
    }
  };

  const handleSuperAdminResendVerification = async (): Promise<{ ok: boolean; message?: string }> => {
    try {
      await resendFirebaseVerificationEmail();
      return {
        ok: true,
        message: b(
          'নতুন ভেরিফিকেশন ইমেইল পাঠানো হয়েছে। অনুগ্রহ করে ইনবক্স ও স্প্যাম ফোল্ডার দেখুন।',
          'Verification email resent. Check your inbox and spam folder.',
          lang
        ),
      };
    } catch (error) {
      return { ok: false, message: mapFirebaseAuthErrorMessage(error, lang) };
    }
  };

  const completePortalLoginSession = useCallback(
    (payload: {
      role: Role;
      displayName: string;
      schoolId?: string;
      teacherId?: string;
      studentId?: string;
      guardianMobile?: string;
      linkedStudentIds?: string[];
    }) => {
      if (payload.linkedStudentIds && payload.linkedStudentIds.length > 0) {
        setLinkedChildIds(payload.linkedStudentIds);
      }
      if (payload.studentId) {
        if (payload.role === 'guardian') {
          setSelectedChildId(payload.studentId);
        } else {
          setActiveStudentPortalId(payload.studentId);
        }
      }
      if (payload.role === 'teacher' && payload.teacherId) {
        setActiveTeacherPortalId(payload.teacherId);
        if (payload.schoolId) setActiveTeacherSchoolId(payload.schoolId);
      }
      if (payload.role === 'school_admin' && payload.schoolId) {
        setActiveSchoolAdminSchoolId(payload.schoolId);
        setAuthenticatedSchoolLockId(payload.schoolId);
      } else if (payload.role === 'central_admin') {
        setAuthenticatedSchoolLockId(null);
      }

      const nextSession: AuthenticatedSession = {
        uid:
          payload.teacherId ||
          payload.studentId ||
          payload.schoolId ||
          payload.guardianMobile ||
          `portal-${payload.role}`,
        role: payload.role,
        displayName: payload.displayName,
        provider: 'institutional_portal',
        schoolId: payload.schoolId,
        teacherId: payload.teacherId,
        studentId: payload.studentId,
        guardianMobile: payload.guardianMobile,
        signedInAtIso: new Date().toISOString(),
      };
      persistPortalSession(nextSession);
      applyVerifiedSession(nextSession);
      showToast(b('পোর্টালে সফলভাবে প্রবেশ করেছেন।', 'Signed in to portal.', lang));
    },
    [applyVerifiedSession, lang]
  );

  const handleUnifiedLoginSubmit = async (
    identifier: string,
    passwordInput: string
  ): Promise<{ ok: boolean; message?: string }> => {
    setAuthError(null);
    setAuthNotice(null);

    const outcome = resolveUnifiedPortalLogin({
      identifier,
      password: passwordInput,
      schools,
      teachers,
      students,
      passwordOverrides: portalPasswordOverrides,
    });

    if (outcome.kind === 'portal_authenticated') {
      completePortalLoginSession({
        role: outcome.role,
        displayName: outcome.displayName,
        schoolId: outcome.schoolId,
        teacherId: outcome.teacherId,
        studentId: outcome.studentId,
        guardianMobile: outcome.guardianMobile,
        linkedStudentIds: outcome.linkedStudentIds,
      });
      return { ok: true };
    }

    if (outcome.kind === 'firebase_email') {
      try {
        const user = await signInWithFirebaseEmail(outcome.email, passwordInput);
        if (!user.emailVerified) {
          try {
            await resendFirebaseVerificationEmail();
          } catch {
            // ignore duplicate recent send
          }
          setEmailAuthPrefill(user.email ?? outcome.email);
          setEmailAuthInitialTab('signin');
          setEmailAuthModalOpen(true);
          return {
            ok: false,
            message: b(
              'আপনার ইমেইল এখনো যাচাইকৃত নয়। ইনবক্স থেকে ভেরিফিকেশন লিংকে ক্লিক করুন অথবা অ্যাকাউন্ট পপ-আপ থেকে যাচাই করুন।',
              'Your email is not verified yet. Check your inbox or verify from the prompt.',
              lang
            ),
          };
        }

        const resolved = await resolveAndSyncFirebaseUser(user);
        if (resolved.blockedReasonBn || resolved.blockedReasonEn) {
          await signOutFirebase();
          clearStoredPortalSession();
          return {
            ok: false,
            message: b(
              resolved.blockedReasonBn || 'আপনার অ্যাকাউন্টটি স্থগিত বা নিষ্ক্রিয় রয়েছে।',
              resolved.blockedReasonEn || 'Your account is suspended, rejected, or deactivated.',
              lang
            ),
          };
        }
        if (!resolved.session) {
          return {
            ok: false,
            message: b(
              'এই Firebase অ্যাকাউন্টের জন্য এখনো পোর্টাল রোল সক্রিয় হয়নি।',
              'No portal role assigned yet for this Firebase account.',
              lang
            ),
          };
        }
        persistPortalSession(resolved.session);
        applyVerifiedSession(resolved.session);
        void recordFirebaseAuditEvent({
          role: resolved.session.role,
          what: 'Unified Firebase Email Sign-In Verified',
          targetName: resolved.session.email || resolved.session.displayName,
          schoolId: resolved.session.schoolId,
        });
        showToast(b('সফলভাবে লগইন সম্পন্ন হয়েছে।', 'Signed in successfully.', lang));
        return { ok: true };
      } catch (err) {
        return { ok: false, message: mapFirebaseAuthErrorMessage(err, lang) };
      }
    }

    return {
      ok: false,
      message: b(outcome.errorBn, outcome.errorEn, lang),
    };
  };

  const handleChangePasswordSubmit = async (
    identifier: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ ok: boolean; message: string }> => {
    const cleanId = identifier.trim();
    const outcome = resolveUnifiedPortalLogin({
      identifier: cleanId,
      password: currentPassword,
      schools,
      teachers,
      students,
      passwordOverrides: portalPasswordOverrides,
    });

    if (outcome.kind === 'portal_authenticated') {
      const targetId =
        outcome.role === 'school_admin'
          ? outcome.schoolId || cleanId
          : outcome.role === 'teacher'
            ? outcome.teacherId || cleanId
            : outcome.role === 'student'
              ? outcome.studentId || cleanId
              : outcome.guardianMobile || cleanId;
      const key = buildPasswordOverrideKey(
        outcome.role as 'school_admin' | 'teacher' | 'student' | 'guardian',
        targetId
      );
      const nextOverrides = { ...portalPasswordOverrides, [key]: newPassword };
      setPortalPasswordOverrides(nextOverrides);
      try {
        window.localStorage.setItem('psms_portal_password_overrides_v1', JSON.stringify(nextOverrides));
      } catch {
        // ignore storage error
      }
      if (outcome.role === 'school_admin' && outcome.schoolId) {
        setSchools((prev) =>
          prev.map((sc) => (sc.id === outcome.schoolId ? { ...sc, loginPassword: newPassword } : sc))
        );
      }
      return {
        ok: true,
        message: b(
          'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে! এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।',
          'Password changed successfully! You can now sign in with your new password.',
          lang
        ),
      };
    }

    if (outcome.kind === 'firebase_email' || cleanId.includes('@')) {
      try {
        await changeFirebaseUserPassword(cleanId, currentPassword, newPassword);
        return {
          ok: true,
          message: b(
            'Firebase অ্যাকাউন্টের পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে! এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।',
            'Firebase password updated! Sign in with your new password.',
            lang
          ),
        };
      } catch (err) {
        return { ok: false, message: mapFirebaseAuthErrorMessage(err, lang) };
      }
    }

    return {
      ok: false,
      message: b(
        outcome.errorBn || 'বর্তমান পাসওয়ার্ড বা ইউজার আইডি সঠিক নয়।',
        outcome.errorEn || 'Current password or account ID is incorrect.',
        lang
      ),
    };
  };

  const handleForgotPasswordSubmit = async (
    identifier: string
  ): Promise<{ ok: boolean; message: string }> => {
    const cleanId = identifier.trim();
    if (cleanId.includes('@')) {
      try {
        await sendFirebasePasswordReset(cleanId);
        return {
          ok: true,
          message: b(
            `${cleanId} ঠিকানায় পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে। ইনবক্স ও স্প্যাম ফোল্ডার দেখুন।`,
            `Password reset link sent to ${cleanId}. Please check your inbox and spam folder.`,
            lang
          ),
        };
      } catch (err) {
        return { ok: false, message: mapFirebaseAuthErrorMessage(err, lang) };
      }
    }

    return {
      ok: true,
      message: b(
        `আইডি (${cleanId}) পুনরুদ্ধারের জন্য আপনার বিদ্যালয়ের প্রধান শিক্ষক অথবা নিচের "অ্যাকাউন্ট সংক্রান্ত সকল বিষয় -> অ্যাডমিনের সাথে যোগাযোগ" ব্যবহার করুন।`,
        `To recover institutional ID (${cleanId}), contact your School Admin or use "All Account Matters -> Contact Admin" below.`,
        lang
      ),
    };
  };

  const handleDemoQuickLogin = (preset: DemoRolePreset) => {
    if (preset === 'school_admin') {
      const demoSchool = schools[0];
      completePortalLoginSession({
        role: 'school_admin',
        displayName: demoSchool?.headTeacher || 'School Admin',
        schoolId: demoSchool?.id || 'GPS-1042',
      });
      return;
    }
    if (preset === 'teacher') {
      const demoTeacher = teachers.find((t) => t.id === 'tch-2') ?? teachers[0];
      completePortalLoginSession({
        role: 'teacher',
        displayName: demoTeacher?.nameEn || 'Teacher',
        schoolId: demoTeacher?.schoolId || 'GPS-1042',
        teacherId: demoTeacher?.id || 'tch-2',
      });
      return;
    }
    if (preset === 'student') {
      const demoStudent = students.find((s) => s.id === 'stu-rahim') ?? students[0];
      completePortalLoginSession({
        role: 'student',
        displayName: demoStudent?.nameEn || 'Student',
        schoolId: demoStudent?.schoolId || 'GPS-1042',
        studentId: demoStudent?.id || 'stu-rahim',
      });
      return;
    }
    const demoStudent = students[0];
    completePortalLoginSession({
      role: 'guardian',
      displayName: guardianProfile.displayName,
      schoolId: demoStudent?.schoolId || 'GPS-1042',
      studentId: demoStudent?.id || 'stu-rahim',
      guardianMobile: guardianProfile.phone || demoStudent?.guardianMobile || '01712345678',
      linkedStudentIds: students
        .filter(
          (st) =>
            st.guardianMobile === (guardianProfile.phone || demoStudent?.guardianMobile || '01712345678')
        )
        .map((st) => st.id),
    });
  };

  const handleLogout = async () => {
    if (auth.currentUser?.emailVerified && authenticatedSession) {
      try {
        await Promise.allSettled([
          saveRtdbAccountSnapshot({
            role: authenticatedSession.role,
            displayName: authenticatedSession.displayName,
            email: authenticatedSession.email,
            schoolId: authenticatedSession.schoolId,
            language: lang,
            themePreference: systemSettings.appearance.themePreference,
            settingsJson: JSON.stringify(systemSettings),
          }),
          saveCloudAppBackup({
            role: authenticatedSession.role,
            language: lang,
            themePreference: systemSettings.appearance.themePreference,
            schoolCount: schools.length,
            teacherCount: teachers.length,
            studentCount: students.length,
            settingsVersion: systemSettings.version,
            note: `Auto-saved on sign-out (${authenticatedSession.role})`,
            backupSettings: {
              appearance: {
                themePreference: systemSettings.appearance.themePreference,
                fontSize: systemSettings.appearance.fontSize,
                layoutDensity: systemSettings.appearance.density,
              },
              regional: systemSettings.regional,
              security: {
                twoFactorEnabled: systemSettings.security.twoFactorEnabled,
                otpVerificationRequired: systemSettings.security.otpVerificationRequired,
                loginAlerts: systemSettings.security.loginAlerts,
                autoLogoutMinutes: systemSettings.security.autoLogoutMinutes,
              },
              notifications: systemSettings.notifications as unknown as Record<string, boolean>,
            },
          }),
        ]);
      } catch {
        // Non-blocking snapshot save before sign-out
      }
    }
    clearStoredPortalSession();
    try {
      await signOutFirebase();
    } catch {
      // ensure local session always terminates
    }
    setAuthenticatedSession(null);
    setAuthenticatedSchoolLockId(null);
    setAuthStatus('unauthenticated');
    setActiveTab('dashboard');
    setSearchQuery('');
    setMobileSidebarOpen(false);
    setLoginModalOpen(false);
    setAuthError(null);
    setAuthNotice(null);
    showToast(b('সফলভাবে লগআউট সম্পন্ন হয়েছে।', 'Signed out successfully.', lang));
  };

  const handleRoleChange = (newRole: Role) => {
    if (!canAccessRoleDashboard(authenticatedSession, newRole)) {
      showToast(
        b(
          'অননুমোদিত রোল পরিবর্তন ব্লক করা হয়েছে — শুধুমাত্র আপনার লগইনকৃত রোলের ড্যাশবোর্ড অনুমোদিত।',
          'Unauthorized role switch blocked — you can only view your authenticated role dashboard.',
          lang
        )
      );
      return;
    }
    setRole(newRole);
    setActiveTab('dashboard');
    setSearchQuery('');
  };

  const openProfilePhotoEditorForRole = (targetRole: Role = role) => {
    if (targetRole === 'central_admin') {
      setCropModalState({
        open: true,
        mode: 'profile',
        entityType: 'central_admin',
        entityId: activeCentralAdmin?.id ?? 'adm-1',
        titleBn: b('কেন্দ্রীয় অ্যাডমিন প্রোফাইল ছবি', 'Central Admin Profile Photo', lang),
        currentUrl: activeCentralAdmin?.photoUrl ?? DEFAULT_PROFILE_AVATARS.central_admin,
      });
      return;
    }
    if (targetRole === 'school_admin') {
      setCropModalState({
        open: true,
        mode: 'profile',
        entityType: 'school_admin',
        entityId: schoolAdminOwnSchool.id,
        titleBn: `${schoolAdminOwnSchool.headTeacher} — প্রোফাইল ছবি`,
        currentUrl: schoolAdminOwnSchool.headTeacherPhotoUrl ?? DEFAULT_PROFILE_AVATARS.school_admin,
      });
      return;
    }
    if (targetRole === 'teacher') {
      setCropModalState({
        open: true,
        mode: 'profile',
        entityType: 'teacher',
        entityId: activeTeacherRecord.id,
        titleBn: `${activeTeacherRecord.nameBn} — শিক্ষক প্রোফাইল ছবি`,
        currentUrl: activeTeacherRecord.photoUrl ?? DEFAULT_PROFILE_AVATARS.teacher,
      });
      return;
    }
    if (targetRole === 'student' && activeStudentRecord) {
      setCropModalState({
        open: true,
        mode: 'profile',
        entityType: 'student',
        entityId: activeStudentRecord.id,
        titleBn: `${activeStudentRecord.nameBn} — শিক্ষার্থী প্রোফাইল ছবি`,
        currentUrl: activeStudentRecord.photoUrl ?? DEFAULT_PROFILE_AVATARS.student,
      });
      return;
    }
    setCropModalState({
      open: true,
      mode: 'profile',
      entityType: 'guardian',
      entityId: 'guardian-1',
      titleBn: b('অভিভাবক প্রোফাইল ছবি', 'Guardian Profile Photo', lang),
      currentUrl: guardianPhotoUrl ?? DEFAULT_PROFILE_AVATARS.guardian,
    });
  };

  const openStudentPhotoEditor = (stu: StudentRecord) => {
    setCropModalState({
      open: true,
      mode: 'profile',
      entityType: 'student',
      entityId: stu.id,
      titleBn: `${stu.nameBn} — শিক্ষার্থী ছবি ক্রপ ও আপলোড`,
      currentUrl: stu.photoUrl ?? DEFAULT_PROFILE_AVATARS.student,
    });
  };

  const openTeacherPhotoEditor = (teacher: TeacherRecord) => {
    setCropModalState({
      open: true,
      mode: 'profile',
      entityType: 'teacher',
      entityId: teacher.id,
      titleBn: `${teacher.nameBn} — শিক্ষক ছবি ক্রপ ও আপলোড`,
      currentUrl: teacher.photoUrl ?? DEFAULT_PROFILE_AVATARS.teacher,
    });
  };

  const openBannerCropEditor = (school: SchoolRecord) => {
    setCropModalState({
      open: true,
      mode: 'banner',
      entityType: 'school_cover',
      entityId: school.id,
      titleBn: `${school.nameBn} — ড্যাশবোর্ড কভার / ব্যানার`,
      currentUrl: school.coverImageUrl ?? RECOMMENDED_SCHOOL_COVERS[0]?.url,
    });
  };

  const handleUpdateSchoolCover = (schoolId: string, coverUrl: string) => {
    persistSchoolCoverOverride(schoolId, coverUrl);
    setSchools((prev) =>
      prev.map((s) => (s.id === schoolId ? { ...s, coverImageUrl: coverUrl } : s))
    );
    showToast(
      b(
        'বিদ্যালয়ের কভার ছবি আপডেট হয়েছে — অ্যাডমিন, শিক্ষক, শিক্ষার্থী ও অভিভাবক ড্যাশবোর্ডে প্রদর্শিত হচ্ছে।',
        'School cover updated across Admin, Teacher, Student & Guardian dashboards.',
        lang
      )
    );
  };

  const handleSaveCroppedImage = (dataUrl: string) => {
    if (!cropModalState) return;
    const { entityType, entityId } = cropModalState;
    const applyMediaUrl = (resolvedUrl: string) => {
      if (entityType === 'central_admin') {
        setAdminAccounts((prev) =>
          prev.map((a) => (a.id === entityId ? { ...a, photoUrl: resolvedUrl } : a))
        );
      } else if (entityType === 'school_admin') {
        setSchools((prev) =>
          prev.map((s) => (s.id === entityId ? { ...s, headTeacherPhotoUrl: resolvedUrl } : s))
        );
      } else if (entityType === 'school_cover') {
        persistSchoolCoverOverride(entityId, resolvedUrl);
        setSchools((prev) =>
          prev.map((s) => (s.id === entityId ? { ...s, coverImageUrl: resolvedUrl } : s))
        );
      } else if (entityType === 'teacher') {
        setTeachers((prev) =>
          prev.map((t) => (t.id === entityId ? { ...t, photoUrl: resolvedUrl } : t))
        );
      } else if (entityType === 'student') {
        setStudents((prev) =>
          prev.map((s) => (s.id === entityId ? { ...s, photoUrl: resolvedUrl } : s))
        );
      } else if (entityType === 'guardian') {
        setGuardianPhotoUrl(resolvedUrl);
      }
    };

    if (entityType === 'school_cover') {
      handleUpdateSchoolCover(entityId, dataUrl);
    } else {
      applyMediaUrl(dataUrl);
      showToast(b('প্রোফাইল ছবি সফলভাবে সংরক্ষণ ও ক্রপ করা হয়েছে।', 'Profile photo cropped & saved.', lang));
    }
    setCropModalState(null);

    if (auth.currentUser?.emailVerified) {
      const storageScopeId = entityId || auth.currentUser.uid;
      void uploadDataUrlToStorage({
        dataUrl,
        category: entityType === 'school_cover' ? 'school_covers' : 'profile_photos',
        scopeId: storageScopeId,
      }).then((uploadRes) => {
        if (uploadRes.ok && uploadRes.url) {
          applyMediaUrl(uploadRes.url);
          void recordActivityLogInFirestore({
            actorRole: role,
            actionType: 'SPARK_MEDIA_VAULT_UPLOAD',
            targetType: 'storage',
            targetId: storageScopeId,
            summary: `Saved ${entityType} media to Spark Free Media Vault (${uploadRes.path ?? ''})`,
          });
        }
      });
    }
  };

  const handleRemovePhoto = () => {
    if (!cropModalState) return;
    const { entityType, entityId } = cropModalState;
    if (entityType === 'central_admin') {
      setAdminAccounts((prev) =>
        prev.map((a) =>
          a.id === entityId ? { ...a, photoUrl: DEFAULT_PROFILE_AVATARS.central_admin } : a
        )
      );
    } else if (entityType === 'school_admin') {
      setSchools((prev) =>
        prev.map((s) =>
          s.id === entityId ? { ...s, headTeacherPhotoUrl: DEFAULT_PROFILE_AVATARS.school_admin } : s
        )
      );
    } else if (entityType === 'school_cover') {
      handleUpdateSchoolCover(entityId, RECOMMENDED_SCHOOL_COVERS[0].url);
      setCropModalState(null);
      return;
    } else if (entityType === 'teacher') {
      setTeachers((prev) =>
        prev.map((t) => (t.id === entityId ? { ...t, photoUrl: undefined } : t))
      );
    } else if (entityType === 'student') {
      setStudents((prev) =>
        prev.map((s) => (s.id === entityId ? { ...s, photoUrl: undefined } : s))
      );
    } else if (entityType === 'guardian') {
      setGuardianPhotoUrl(undefined);
    }
    showToast(b('ডিফল্ট ছবিতে রিসেট করা হয়েছে।', 'Reset to default photo.', lang));
    setCropModalState(null);
  };

  const handleToggleOffline = () => {
    if (isOffline) {
      setIsOffline(false);
      if (pendingSyncCount > 0) {
        showToast(b(`${pendingSyncCount}টি অফলাইন রেকর্ড ক্লাউডে সিঙ্ক হয়েছে।`, `${pendingSyncCount} offline record(s) synced to cloud.`, lang));
        setPendingSyncCount(0);
      }
    } else {
      setIsOffline(true);
      setPendingSyncCount((c) => c + 1);
      showToast(b('অফলাইন কিউ সক্রিয় হয়েছে। পরিবর্তনগুলো সংরক্ষিত থাকবে।', 'Offline Queue enabled. Changes saved locally.', lang));
    }
  };

  // Strict RBAC-Scoped Datasets
  const schoolAdminOwnSchool = useMemo(
    () => schools.find((s) => s.id === activeSchoolAdminSchoolId) ?? schools[0],
    [schools, activeSchoolAdminSchoolId]
  );

  const schoolAdminStudents = useMemo(
    () =>
      students.filter((st) =>
        canAccessStudentData('school_admin', schoolAdminOwnSchool.id, [], st.id, st.schoolId)
      ),
    [students, schoolAdminOwnSchool.id]
  );

  const schoolAdminTeachers = useMemo(
    () =>
      teachers.filter((t) => canAccessSchoolData('school_admin', schoolAdminOwnSchool.id, t.schoolId)),
    [teachers, schoolAdminOwnSchool.id]
  );

  const schoolAdminStudentRequests = useMemo(
    () =>
      studentRequests.filter(
        (r) =>
          r.schoolId === schoolAdminOwnSchool.id ||
          r.targetSchoolId === schoolAdminOwnSchool.id
      ),
    [studentRequests, schoolAdminOwnSchool.id]
  );

  const schoolAdminAuditLogs = useMemo(
    () =>
      auditLogs.filter(
        (l) => !l.schoolId || canAccessSchoolData('school_admin', schoolAdminOwnSchool.id, l.schoolId)
      ),
    [auditLogs, schoolAdminOwnSchool.id]
  );

  const guardianChildren = useMemo(
    () =>
      students.filter((st) =>
        canAccessStudentData('guardian', null, linkedChildIds, st.id, st.schoolId)
      ),
    [students, linkedChildIds]
  );

  const activeGuardianChild =
    guardianChildren.find((c) => c.id === selectedChildId) ?? guardianChildren[0];

  const activeTeacherRecord =
    teachers.find((t) => t.id === activeTeacherPortalId) ?? teachers[0];

  const teacherWorkspaceContext = useMemo(
    () =>
      filterTeacherWorkspaceBySchoolAssignment(
        activeTeacherRecord.id,
        teacherSchoolAssignments,
        activeTeacherSchoolId
      ),
    [activeTeacherRecord.id, teacherSchoolAssignments, activeTeacherSchoolId]
  );

  const teacherScopedSchoolId = teacherWorkspaceContext.scopedSchoolId;
  const teacherActiveSchool = useMemo(
    () =>
      teacherScopedSchoolId
        ? schools.find((s) => s.id === teacherScopedSchoolId)
        : undefined,
    [schools, teacherScopedSchoolId]
  );

  const activeStudentRecord =
    students.find((s) => s.id === activeStudentPortalId) ?? students[0];

  const activeStudentChangeRequests = useMemo(
    () => studentRequests.filter((r) => r.studentId === activeStudentRecord?.id),
    [studentRequests, activeStudentRecord?.id]
  );

  const schoolAdminRoutineSlots = useMemo(
    () => routineSlots.filter((r) => !r.schoolId || r.schoolId === schoolAdminOwnSchool.id),
    [routineSlots, schoolAdminOwnSchool.id]
  );
  const schoolAdminExams = useMemo(
    () => getVisibleExamsForRole(exams, { role: 'school_admin', schoolId: schoolAdminOwnSchool.id }),
    [exams, schoolAdminOwnSchool.id]
  );
  const teacherRoutineSlots = useMemo(
    () =>
      teacherScopedSchoolId
        ? routineSlots.filter((r) => !r.schoolId || r.schoolId === teacherScopedSchoolId)
        : [],
    [routineSlots, teacherScopedSchoolId]
  );
  const teacherExams = useMemo(
    () =>
      teacherScopedSchoolId
        ? getVisibleExamsForRole(exams, { role: 'teacher', schoolId: teacherScopedSchoolId })
        : [],
    [exams, teacherScopedSchoolId]
  );
  const teacherScopedStudents = useMemo(
    () =>
      teacherScopedSchoolId
        ? students.filter((s) => s.schoolId === teacherScopedSchoolId)
        : [],
    [students, teacherScopedSchoolId]
  );
  const guardianRoutineSlots = useMemo(
    () =>
      activeGuardianChild
        ? routineSlots.filter((r) => !r.schoolId || r.schoolId === activeGuardianChild.schoolId)
        : [],
    [routineSlots, activeGuardianChild]
  );
  const guardianExams = useMemo(
    () =>
      getVisibleExamsForRole(exams, {
        role: 'guardian',
        schoolId: activeGuardianChild?.schoolId,
        studentClass: activeGuardianChild?.className,
      }),
    [exams, activeGuardianChild?.schoolId, activeGuardianChild?.className]
  );
  const studentRoutineSlots = useMemo(
    () =>
      activeStudentRecord
        ? routineSlots.filter((r) => !r.schoolId || r.schoolId === activeStudentRecord.schoolId)
        : [],
    [routineSlots, activeStudentRecord]
  );
  const studentExams = useMemo(
    () =>
      getVisibleExamsForRole(exams, {
        role: 'student',
        schoolId: activeStudentRecord?.schoolId,
        studentClass: activeStudentRecord?.className,
      }),
    [exams, activeStudentRecord?.schoolId, activeStudentRecord?.className]
  );

  const globalSearchResults = useMemo(() => {
    const scopedStudents =
      role === 'central_admin'
        ? students
        : role === 'school_admin'
          ? schoolAdminStudents
          : role === 'teacher'
            ? teacherScopedStudents
            : role === 'guardian' && activeGuardianChild
              ? guardianChildren
              : activeStudentRecord
                ? [activeStudentRecord]
                : [];
    const scopedSlots =
      role === 'central_admin'
        ? routineSlots
        : role === 'school_admin'
          ? schoolAdminRoutineSlots
          : role === 'teacher'
            ? teacherRoutineSlots
            : role === 'guardian'
              ? guardianRoutineSlots
              : studentRoutineSlots;
    const scopedExams =
      role === 'central_admin'
        ? exams
        : role === 'school_admin'
          ? schoolAdminExams
          : role === 'teacher'
            ? teacherExams
            : role === 'guardian'
              ? guardianExams
              : studentExams;
    const targetSchoolId =
      role === 'school_admin'
        ? schoolAdminOwnSchool.id
        : role === 'teacher'
          ? activeTeacherRecord.schoolId
          : role === 'guardian'
            ? activeGuardianChild?.schoolId
            : role === 'student'
              ? activeStudentRecord?.schoolId
              : undefined;
    const scopedLessons = targetSchoolId
      ? dailyLessons.filter((l) => l.schoolId === targetSchoolId)
      : dailyLessons;
    const scopedTeacherAssignments =
      role === 'teacher'
        ? teacherAssignments.filter((ta) => ta.teacherId === activeTeacherRecord.id)
        : teacherAssignments;

    return buildGlobalAcademicSearchResults(searchQuery, {
      role,
      students: scopedStudents,
      teacherAssignments: scopedTeacherAssignments,
      routineSlots: scopedSlots,
      dailyLessons: scopedLessons,
      exams: scopedExams,
      assignments,
    });
  }, [
    searchQuery,
    role,
    students,
    schoolAdminStudents,
    activeTeacherRecord.id,
    activeTeacherRecord.schoolId,
    activeGuardianChild,
    guardianChildren,
    activeStudentRecord,
    routineSlots,
    schoolAdminRoutineSlots,
    teacherRoutineSlots,
    guardianRoutineSlots,
    studentRoutineSlots,
    exams,
    schoolAdminExams,
    teacherExams,
    guardianExams,
    studentExams,
    schoolAdminOwnSchool.id,
    dailyLessons,
    teacherAssignments,
    assignments,
  ]);

  const handleSelectGlobalSearchResult = (item: GlobalAcademicSearchResult) => {
    if (item.studentId && (role === 'central_admin' || role === 'school_admin')) {
      const targetStu = students.find((s) => s.id === item.studentId);
      if (targetStu) setInspectedStudent(targetStu);
    }
    if (item.targetModule) {
      setExternalAcademicModule(item.targetModule);
      setRecentModules((prev) => [item.targetModule!, ...prev.filter((m) => m !== item.targetModule)].slice(0, 6));
    }
    if (item.targetRoleTab) {
      setActiveTab(item.targetRoleTab);
    }
    setCentralNavVersion((v) => v + 1);
    setSearchQuery('');
  };

  const pendingTeacherCount = useMemo(
    () =>
      teachers.filter((t) => t.status === 'pending' || t.status === 'under_review').length +
      teacherRequests.filter((r) => r.status === 'pending' || r.status === 'under_review').length,
    [teachers, teacherRequests]
  );

  // Central Admin Handlers
  const handleRegisterSchool = (newSchool: SchoolRecord) => {
    const check = canPerformActionUnderSettings(systemSettings, 'new_school_registration');
    if (!check.allowed) {
      showToast(b(check.reasonBn ?? 'নতুন বিদ্যালয় নিবন্ধন বন্ধ রয়েছে।', check.reasonEn ?? 'School registration is paused.', lang));
      return;
    }
    setSchools((prev) => [newSchool, ...prev]);
    const newSchoolReq: ApprovalRequest = {
      id: `REQ-${Date.now().toString().slice(-4)}`,
      type: 'school',
      typeLabelBn:
        newSchool.addressSource === 'MANUAL'
          ? 'নতুন বিদ্যালয় (Manual Address)'
          : `নতুন বিদ্যালয় (${newSchool.registrationMethod})`,
      typeLabelEn:
        newSchool.addressSource === 'MANUAL'
          ? 'New School (Manual Address)'
          : `New School (${newSchool.registrationMethod})`,
      applicantName: newSchool.nameBn,
      schoolName: `${newSchool.code} • ${newSchool.district}`,
      schoolId: newSchool.id,
      targetEntityId: newSchool.id,
      schoolType: newSchool.schoolType,
      addressSource: newSchool.addressSource,
      submittedAt: 'এইমাত্র',
      status: 'pending',
      priority: newSchool.addressSource === 'MANUAL' ? 'urgent' : 'normal',
      details:
        newSchool.addressSource === 'MANUAL'
          ? `Manual address entered (${newSchool.division}, ${newSchool.district}, ${newSchool.upazila}). Verification required.`
          : `School Type: ${newSchool.schoolType}. Documents: ${newSchool.documents.join(', ')}`,
    };
    setRequests((prev) => [newSchoolReq, ...prev]);
    if (auth.currentUser?.emailVerified) {
      void syncSchoolToFirestore(newSchool);
      void submitApplicationToFirestore(newSchoolReq, 'school_admin');
    }
    appendAuditLog({
      who:
        newSchool.registrationMethod === 'MANUAL'
          ? `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`
          : `${newSchool.headTeacher} (Online Applicant)`,
      role: 'central_admin',
      what: `নতুন বিদ্যালয় নিবন্ধন (${newSchool.registrationMethod} · ${newSchool.schoolType})`,
      targetName: `${newSchool.nameBn} (${newSchool.code})`,
      schoolId: newSchool.id,
      requestId: `REG-${newSchool.code}`,
      oldValue: 'None',
      newValue: `pending (${newSchool.addressSource})`,
    });
    showToast(
      b(
        `${newSchool.nameBn} নিবন্ধিত হয়েছে (Status: Pending)।`,
        `${newSchool.nameEn} registered with Pending status.`,
        lang
      )
    );
  };

  const dispatchNotification = (
    cfg: Omit<NotificationItem, 'id' | 'time' | 'read'>
  ) => {
    setNotifications((prev) => [
      {
        ...cfg,
        id: `nf-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 100)}`,
        time: 'এইমাত্র',
        read: false,
      },
      ...prev,
    ]);
  };

  const todayIso = '2026-11-17';

  const handleUpdateRequestStatus = (reqId: string, status: ApprovalRequest['status'], reason: string) => {
    const target = requests.find((r) => r.id === reqId);
    setRequests((prev) => prev.map((r) => (r.id === reqId ? { ...r, status } : r)));
    if (target && target.type === 'school') {
      const mappedSchoolStatus: SchoolRecord['status'] =
        status === 'verified' ? 'active' : status;
      const mappedApprovalStatus =
        mappedSchoolStatus === 'active' || mappedSchoolStatus === 'approved'
          ? 'approved'
          : mappedSchoolStatus === 'rejected'
            ? 'rejected'
            : mappedSchoolStatus === 'under_review'
              ? 'under_review'
              : 'pending';
      const targetSchool = schools.find((s) => s.id === target.schoolId);
      if (targetSchool) {
        const nextSchool: SchoolRecord = {
          ...targetSchool,
          status: mappedSchoolStatus,
          approvalStatus: mappedApprovalStatus,
          verifiedDate: mappedSchoolStatus === 'active' ? '১৭ নভে ২০২৬' : targetSchool.verifiedDate,
          approvalHistory: [
            {
              id: `APH-${Date.now().toString().slice(-5)}`,
              date: todayIso,
              actor: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
              action: `Request Status → ${mappedSchoolStatus}`,
              fromStatus: targetSchool.status,
              toStatus: mappedSchoolStatus,
              note: reason || undefined,
            },
            ...(targetSchool.approvalHistory ?? []),
          ],
        };
        setSchools((prev) => prev.map((s) => (s.id === target.schoolId ? nextSchool : s)));
        if (auth.currentUser?.emailVerified) {
          void syncSchoolToFirestore(nextSchool);
        }
      }
      dispatchNotification({
        roleTarget: 'school_admin',
        schoolId: target.schoolId,
        type: mappedSchoolStatus === 'rejected' ? 'alert' : 'success',
        titleBn: `বিদ্যালয় আবেদন আপডেট: ${mappedSchoolStatus}`,
        titleEn: `School Application Update: ${mappedSchoolStatus}`,
        messageBn: `${target.applicantName}-এর আবেদন অবস্থা "${mappedSchoolStatus}" করা হয়েছে। ${reason ? `নোট: ${reason}` : ''}`,
        messageEn: `Application status changed to ${mappedSchoolStatus}. ${reason}`,
      });
    }
    if (target) {
      appendAuditLog({
        who: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
        role: 'central_admin',
        what: `অনুরোধ আপডেট (${status})`,
        targetName: target.applicantName,
        schoolId: target.schoolId,
        requestId: reqId,
        oldValue: target.status,
        newValue: status,
        reason,
      });
    }
    showToast(b('কার্যক্রম সম্পন্ন ও অডিট লগে সংরক্ষিত হয়েছে।', 'Action saved and logged to audit trail.', lang));
  };

  const handleUpdateSchoolStatus = (schoolId: string, status: SchoolRecord['status'], reason: string) => {
    const target = schools.find((s) => s.id === schoolId);
    const nextAppStatus =
      status === 'active' || status === 'approved' || status === 'verified'
        ? 'approved'
        : status === 'rejected'
          ? 'rejected'
          : status === 'under_review'
            ? 'under_review'
            : status === 'revision_requested'
              ? 'revision_requested'
              : target?.approvalStatus;
    if (target) {
      const updatedSchool: SchoolRecord = {
        ...target,
        status,
        approvalStatus: nextAppStatus,
        verifiedDate: status === 'active' || status === 'approved' ? '১৭ নভে ২০২৬' : target.verifiedDate,
        approvalHistory: [
          {
            id: `APH-${Date.now().toString().slice(-5)}`,
            date: todayIso,
            actor: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
            action: `Status Changed to ${status}`,
            fromStatus: target.status,
            toStatus: status,
            note: reason || undefined,
          },
          ...(target.approvalHistory ?? []),
        ],
      };
      setSchools((prev) => prev.map((s) => (s.id === schoolId ? updatedSchool : s)));
      if (auth.currentUser?.emailVerified) {
        void syncSchoolToFirestore(updatedSchool);
      }
    }
    if (target) {
      appendAuditLog({
        who: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
        role: 'central_admin',
        what: `বিদ্যালয়ের অবস্থা পরিবর্তন (${status})`,
        targetName: `${target.nameBn} (${target.code})`,
        schoolId,
        requestId: `SCH-${schoolId}`,
        oldValue: target.status,
        newValue: status,
        reason,
      });
      dispatchNotification({
        roleTarget: 'school_admin',
        schoolId,
        type: status === 'rejected' || status === 'suspended' ? 'alert' : 'success',
        titleBn: `বিদ্যালয়ের অবস্থা হালনাগাদ: ${status}`,
        titleEn: `School Status Updated: ${status}`,
        messageBn: `${target.nameBn}-এর অবস্থা "${status}" করা হয়েছে। ${reason || ''}`,
        messageEn: `${target.nameEn} status updated to ${status}. ${reason || ''}`,
      });
    }
    showToast(b(`বিদ্যালয়ের অবস্থা "${status}" হয়েছে।`, `School status updated to ${status}.`, lang));
  };

  const handleEditSchoolInfo = (schoolId: string, patch: SchoolEditPatch) => {
    const target = schools.find((s) => s.id === schoolId);
    if (!target) return;
    const { updatedSchool, changedFields } = applySchoolInfoEdit(
      target,
      patch,
      `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
      todayIso
    );
    setSchools((prev) => prev.map((s) => (s.id === schoolId ? updatedSchool : s)));
    appendAuditLog({
      who: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
      role: 'central_admin',
      what: 'বিদ্যালয়ের তথ্য পরিবর্তন (Edit School Info)',
      targetName: `${updatedSchool.nameBn} (${updatedSchool.code})`,
      schoolId,
      requestId: `EDT-${schoolId}`,
      oldValue: target.nameBn,
      newValue: changedFields.length > 0 ? changedFields.join(', ') : 'Profile Updated',
    });
    dispatchNotification({
      roleTarget: 'school_admin',
      schoolId,
      type: 'info',
      titleBn: 'বিদ্যালয়ের তথ্য হালনাগাদ করা হয়েছে',
      titleEn: 'School Information Updated',
      messageBn: `কেন্দ্রীয় প্রশাসন কর্তৃক আপনার বিদ্যালয়ের তথ্য (${changedFields.join(', ') || 'General'}) হালনাগাদ হয়েছে।`,
      messageEn: `Central Admin updated school fields: ${changedFields.join(', ') || 'General'}.`,
    });
    showToast(b('বিদ্যালয়ের তথ্য সফলভাবে সংরক্ষিত হয়েছে।', 'School information updated & logged.', lang));
  };

  const handleSuspendSchool = (schoolId: string, details: SchoolSuspensionDetails) => {
    const target = schools.find((s) => s.id === schoolId);
    if (!target) return;
    setSchools((prev) =>
      prev.map((s) =>
        s.id === schoolId
          ? {
              ...s,
              status: 'suspended',
              suspensionDetails: details,
              approvalHistory: [
                {
                  id: `APH-${Date.now().toString().slice(-5)}`,
                  date: todayIso,
                  actor: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
                  action: 'Temporary Suspension',
                  fromStatus: s.status,
                  toStatus: 'suspended',
                  note: `${details.reason} (${details.startDate} → ${details.expectedResumeDate})`,
                },
                ...(s.approvalHistory ?? []),
              ],
            }
          : s
      )
    );
    appendAuditLog({
      who: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
      role: 'central_admin',
      what: 'সাময়িক বিদ্যালয় নিষ্ক্রিয় (Temporary Suspend)',
      targetName: `${target.nameBn} (${target.code})`,
      schoolId,
      requestId: `SUS-${schoolId}`,
      oldValue: target.status,
      newValue: `suspended (${details.startDate} → ${details.expectedResumeDate})`,
      reason: details.reason,
    });
    dispatchNotification({
      roleTarget: 'school_admin',
      schoolId,
      type: 'warning',
      titleBn: 'বিদ্যালয় সাময়িকভাবে নিষ্ক্রিয় করা হয়েছে',
      titleEn: 'School Temporarily Suspended',
      messageBn: `কারণ: ${details.reason} | সম্ভাব্য পুনরায় চালু: ${details.expectedResumeDate}`,
      messageEn: `Reason: ${details.reason} | Expected resume: ${details.expectedResumeDate}`,
    });
    showToast(b(`${target.nameBn} সাময়িকভাবে নিষ্ক্রিয় করা হয়েছে।`, `${target.nameEn} temporarily suspended.`, lang));
  };

  const handleRequestReactivation = (schoolId: string, note: string) => {
    const target = schools.find((s) => s.id === schoolId);
    if (!target) return;
    setSchools((prev) =>
      prev.map((s) =>
        s.id === schoolId
          ? {
              ...s,
              suspensionDetails: {
                reason: s.suspensionDetails?.reason ?? 'Suspension review',
                startDate: s.suspensionDetails?.startDate ?? todayIso,
                expectedResumeDate: s.suspensionDetails?.expectedResumeDate ?? todayIso,
                reactivationRequested: true,
                reactivationNote: note,
              },
            }
          : s
      )
    );
    appendAuditLog({
      who: `${target.headTeacher} (School Admin)`,
      role: 'school_admin',
      what: 'পুনরায় সক্রিয় করার আবেদন',
      targetName: `${target.nameBn} (${target.code})`,
      schoolId,
      requestId: `REA-${schoolId}`,
      oldValue: 'suspended',
      newValue: 'reactivation_requested',
      reason: note,
    });
    dispatchNotification({
      roleTarget: 'central_admin',
      schoolId,
      type: 'info',
      titleBn: 'পুনরায় সক্রিয় করার আবেদন পাওয়া গেছে',
      titleEn: 'School Reactivation Request Received',
      messageBn: `${target.nameBn} (${target.code}) পুনরায় সক্রিয় করার আবেদন করেছে: ${note}`,
      messageEn: `${target.nameEn} requested reactivation: ${note}`,
    });
    showToast(b('পুনরায় সক্রিয় করার আবেদন কেন্দ্রীয় প্রশাসনে পাঠানো হয়েছে।', 'Reactivation request submitted to Central Admin.', lang));
  };

  const handleReactivateSchool = (schoolId: string, reason: string) => {
    const target = schools.find((s) => s.id === schoolId);
    if (!target) return;
    setSchools((prev) =>
      prev.map((s) =>
        s.id === schoolId
          ? {
              ...s,
              status: 'active',
              approvalStatus: 'approved',
              verifiedDate: '১৭ নভে ২০২৬',
              suspensionDetails: undefined,
              approvalHistory: [
                {
                  id: `APH-${Date.now().toString().slice(-5)}`,
                  date: todayIso,
                  actor: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
                  action: 'Reactivated / Activated',
                  fromStatus: s.status,
                  toStatus: 'active',
                  note: reason || 'School reactivated',
                },
                ...(s.approvalHistory ?? []),
              ],
            }
          : s
      )
    );
    appendAuditLog({
      who: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
      role: 'central_admin',
      what: 'বিদ্যালয় পুনরায় সক্রিয় (Activate / Unsuspend)',
      targetName: `${target.nameBn} (${target.code})`,
      schoolId,
      requestId: `ACT-${schoolId}`,
      oldValue: target.status,
      newValue: 'active',
      reason,
    });
    dispatchNotification({
      roleTarget: 'school_admin',
      schoolId,
      type: 'success',
      titleBn: 'বিদ্যালয় পুনরায় সক্রিয় করা হয়েছে',
      titleEn: 'School Activated / Unsuspended',
      messageBn: `${target.nameBn} এখন সক্রিয় (Active) অবস্থায় রয়েছে।`,
      messageEn: `${target.nameEn} has been activated.`,
    });
    showToast(b(`${target.nameBn} সক্রিয় হয়েছে।`, `${target.nameEn} activated.`, lang));
  };

  const handlePermanentDeactivateSchool = (schoolId: string, record: SchoolDeactivationRecord) => {
    const target = schools.find((s) => s.id === schoolId);
    if (!target) return;
    setSchools((prev) =>
      prev.map((s) =>
        s.id === schoolId
          ? {
              ...s,
              status: 'deactivated',
              deactivationDetails: record,
              approvalHistory: [
                {
                  id: `APH-${Date.now().toString().slice(-5)}`,
                  date: todayIso,
                  actor: record.finalApprovalBy,
                  action: 'Permanent Deactivation Approved',
                  fromStatus: s.status,
                  toStatus: 'deactivated',
                  note: `${record.reason} (Inspection Ref: ${record.inspectionReportRef})`,
                },
                ...(s.approvalHistory ?? []),
              ],
            }
          : s
      )
    );
    appendAuditLog({
      who: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
      role: 'central_admin',
      what: 'স্থায়ী বিদ্যালয় বাতিল (Permanent Closure Approved)',
      targetName: `${target.nameBn} (${target.code})`,
      schoolId,
      requestId: `CLS-${schoolId}`,
      oldValue: target.status,
      newValue: 'deactivated',
      reason: `${record.reason} | Docs: ${record.evidenceDoc}`,
    });
    dispatchNotification({
      roleTarget: 'school_admin',
      schoolId,
      type: 'alert',
      titleBn: 'বিদ্যালয় স্থায়ীভাবে বাতিল / নিষ্ক্রিয় করা হয়েছে',
      titleEn: 'School Permanently Deactivated',
      messageBn: `কারণ: ${record.reason} (Inspection Ref: ${record.inspectionReportRef})`,
      messageEn: `Reason: ${record.reason} (Ref: ${record.inspectionReportRef})`,
    });
    showToast(b(`${target.nameBn} স্থায়ীভাবে বাতিল করা হয়েছে (অডিট রেকর্ড সংরক্ষিত)।`, `${target.nameEn} permanently deactivated.`, lang));
  };

  const handleSendSchoolNotice = (school: SchoolRecord, notice: NoticeItem) => {
    setNotices((prev) => [notice, ...prev]);
    dispatchNotification({
      roleTarget: 'school_admin',
      schoolId: school.id,
      type: 'info',
      titleBn: `কেন্দ্রীয় নোটিশ: ${notice.titleBn}`,
      titleEn: `Central Notice: ${notice.titleEn}`,
      messageBn: notice.bodyBn,
      messageEn: notice.bodyEn,
    });
    appendAuditLog({
      who: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
      role: 'central_admin',
      what: 'বিদ্যালয়-নির্দিষ্ট নোটিশ প্রেরণ',
      targetName: `${school.nameBn} (${school.code})`,
      schoolId: school.id,
      requestId: notice.id,
      oldValue: 'Notice Draft',
      newValue: notice.titleBn,
    });
    showToast(b(`${school.nameBn}-এ নোটিশ পাঠানো হয়েছে।`, `Notice sent to ${school.nameEn}.`, lang));
  };

  const handleSchoolAdminAction = (schoolId: string, payload: AdminManagementPayload) => {
    const target = schools.find((s) => s.id === schoolId);
    if (!target) return;
    const { updatedSchool, previousAdminName, newAdminName, actionSummary } = executeSchoolAdminAction(
      target,
      payload,
      `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
      todayIso
    );
    setSchools((prev) => prev.map((s) => (s.id === schoolId ? updatedSchool : s)));
    appendAuditLog({
      who: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
      role: 'central_admin',
      what: `School Admin হস্তান্তর / পরিবর্তন (${payload.mode})`,
      targetName: `${updatedSchool.nameBn} (${updatedSchool.code})`,
      schoolId,
      requestId: `HND-${schoolId}`,
      oldValue: previousAdminName,
      newValue: newAdminName,
      reason: payload.handoverNote || actionSummary,
    });
    dispatchNotification({
      roleTarget: 'school_admin',
      schoolId,
      type: 'info',
      titleBn: 'School Admin দায়িত্ব ও অনুমতি আপডেট',
      titleEn: 'School Admin Handover & Permissions Update',
      messageBn: `${actionSummary}। (পূর্বের সকল অডিট রেকর্ড সংরক্ষিত আছে)`,
      messageEn: `${actionSummary}. (Previous admin audit history preserved)`,
    });
    showToast(b('School Admin হস্তান্তর ও অডিট রেকর্ড সংরক্ষিত হয়েছে।', 'School Admin handover recorded (audit preserved).', lang));
  };

  const handleRecordInspection = (schoolId: string, inspection: SchoolInspectionRecord) => {
    const target = schools.find((s) => s.id === schoolId);
    if (!target) return;
    setSchools((prev) =>
      prev.map((s) =>
        s.id === schoolId
          ? {
              ...s,
              inspectionHistory: [inspection, ...(s.inspectionHistory ?? [])],
              approvalHistory: [
                {
                  id: `APH-${Date.now().toString().slice(-5)}`,
                  date: inspection.date,
                  actor: inspection.inspectorName,
                  action: `School Inspection (${inspection.recommendation})`,
                  fromStatus: s.status,
                  toStatus: s.status,
                  note: inspection.findings,
                },
                ...(s.approvalHistory ?? []),
              ],
            }
          : s
      )
    );
    appendAuditLog({
      who: inspection.inspectorName,
      role: 'central_admin',
      what: 'বিদ্যালয় পরিদর্শন রিপোর্ট সংযোজন',
      targetName: `${target.nameBn} (${target.code})`,
      schoolId,
      requestId: inspection.reportRef ?? inspection.id,
      oldValue: target.status,
      newValue: inspection.recommendation,
      reason: inspection.findings,
    });
    dispatchNotification({
      roleTarget: 'school_admin',
      schoolId,
      type: inspection.recommendation === 'recommend_approval' ? 'success' : 'warning',
      titleBn: 'নতুন বিদ্যালয় পরিদর্শন রিপোর্ট যুক্ত হয়েছে',
      titleEn: 'New School Inspection Report Logged',
      messageBn: `${inspection.inspectorName}: ${inspection.findings}`,
      messageEn: `${inspection.inspectorName}: ${inspection.findings}`,
    });
    showToast(b('বিদ্যালয় পরিদর্শন রিপোর্ট সংরক্ষিত হয়েছে।', 'Inspection report saved.', lang));
  };

  const handleReturnForRevision = (schoolId: string, note: string) => {
    const target = schools.find((s) => s.id === schoolId);
    if (!target) return;
    setSchools((prev) =>
      prev.map((s) =>
        s.id === schoolId
          ? {
              ...s,
              status: 'revision_requested',
              approvalStatus: 'revision_requested',
              revisionNote: note,
              approvalHistory: [
                {
                  id: `APH-${Date.now().toString().slice(-5)}`,
                  date: todayIso,
                  actor: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
                  action: 'Returned for Revision',
                  fromStatus: s.status,
                  toStatus: 'revision_requested',
                  note,
                },
                ...(s.approvalHistory ?? []),
              ],
            }
          : s
      )
    );
    setRequests((prev) =>
      prev.map((r) =>
        r.schoolId === schoolId && r.type === 'school'
          ? { ...r, status: 'revision_requested', details: `Revision requested: ${note}` }
          : r
      )
    );
    appendAuditLog({
      who: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
      role: 'central_admin',
      what: 'সংশোধনের জন্য আবেদন ফেরত (Return for Revision)',
      targetName: `${target.nameBn} (${target.code})`,
      schoolId,
      requestId: `REV-${schoolId}`,
      oldValue: target.status,
      newValue: 'revision_requested',
      reason: note,
    });
    dispatchNotification({
      roleTarget: 'school_admin',
      schoolId,
      type: 'warning',
      titleBn: 'আবেদন সংশোধনের জন্য ফেরত পাঠানো হয়েছে',
      titleEn: 'Application Returned for Revision',
      messageBn: `সংশোধন নির্দেশনা: ${note}`,
      messageEn: `Revision required: ${note}`,
    });
    showToast(b('সংশোধনের জন্য আবেদন ফেরত পাঠানো হয়েছে।', 'Application returned for revision.', lang));
  };

  const handleAssignSchoolCodes = (schoolId: string, registrationId: string, code: string, eiin: string) => {
    const target = schools.find((s) => s.id === schoolId);
    if (!target) return;
    setSchools((prev) =>
      prev.map((s) =>
        s.id === schoolId
          ? {
              ...s,
              registrationId: registrationId.trim(),
              code: code.trim(),
              eiin: eiin.trim(),
              approvalHistory: [
                {
                  id: `APH-${Date.now().toString().slice(-5)}`,
                  date: todayIso,
                  actor: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
                  action: 'Assigned Registration ID / EIIN / School Code',
                  fromStatus: `${s.code} / ${s.eiin}`,
                  toStatus: `${code.trim()} / ${eiin.trim()}`,
                  note: `Reg ID: ${registrationId.trim()}`,
                },
                ...(s.approvalHistory ?? []),
              ],
            }
          : s
      )
    );
    appendAuditLog({
      who: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
      role: 'central_admin',
      what: 'School Registration ID / EIIN / Code প্রদান',
      targetName: target.nameBn,
      schoolId,
      requestId: registrationId.trim(),
      oldValue: `${target.code} / ${target.eiin}`,
      newValue: `${code.trim()} / ${eiin.trim()}`,
    });
    dispatchNotification({
      roleTarget: 'school_admin',
      schoolId,
      type: 'success',
      titleBn: 'School Code ও EIIN নির্ধারিত হয়েছে',
      titleEn: 'Official School Code & EIIN Assigned',
      messageBn: `Reg ID: ${registrationId.trim()} · Code: ${code.trim()} · EIIN: ${eiin.trim()}`,
      messageEn: `Reg ID: ${registrationId.trim()} · Code: ${code.trim()} · EIIN: ${eiin.trim()}`,
    });
    showToast(b('Registration ID / Code / EIIN সংরক্ষিত হয়েছে।', 'School codes assigned & saved.', lang));
  };

  const handleChangeSchoolType = (
    schoolId: string,
    newType: SchoolTypeCode,
    customSchoolType: string | undefined,
    reason: string
  ) => {
    const target = schools.find((s) => s.id === schoolId);
    const cfg = getSchoolTypeConfig(newType);
    const newRange = `${cfg.defaultClasses[0]} – ${cfg.defaultClasses[cfg.defaultClasses.length - 1]}`;
    setSchools((prev) =>
      prev.map((s) =>
        s.id === schoolId
          ? {
              ...s,
              schoolType: newType,
              customSchoolType,
              approvedClasses: cfg.defaultClasses,
              classRange: newRange,
            }
          : s
      )
    );
    if (target) {
      appendAuditLog({
        who: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
        role: 'central_admin',
        what: 'School Type কনফিগারেশন পরিবর্তন',
        targetName: `${target.nameBn} (${target.code})`,
        schoolId,
        requestId: `TYP-${schoolId}`,
        oldValue: target.schoolType,
        newValue: newType,
        reason,
      });
    }
    showToast(b(`School Type ${newType}-এ হালনাগাদ হয়েছে।`, `School Type updated to ${newType}.`, lang));
  };

  const handleVerifyManualAddress = (schoolId: string, reason: string) => {
    const target = schools.find((s) => s.id === schoolId);
    setSchools((prev) =>
      prev.map((s) => (s.id === schoolId ? { ...s, addressVerified: true } : s))
    );
    if (target) {
      appendAuditLog({
        who: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
        role: 'central_admin',
        what: 'ম্যানুয়াল ঠিকানা যাচাই সম্পন্ন',
        targetName: `${target.nameBn} (${target.code})`,
        schoolId,
        requestId: `ADR-${schoolId}`,
        oldValue: 'MANUAL (Unverified)',
        newValue: 'MANUAL (Verified)',
        reason,
      });
    }
    showToast(b('ম্যানুয়াল ঠিকানা যাচাইকৃত হিসেবে চিহ্নিত হয়েছে।', 'Manual address marked verified.', lang));
  };

  const handleAddLocationNode = (level: keyof BdLocationDatabase, node: LocationNode) => {
    setLocationDb((prev) => ({
      ...prev,
      [level]: [node, ...prev[level]],
    }));
    showToast(b(`নতুন লোকেশন "${node.nameBn}" যুক্ত হয়েছে।`, `Added location "${node.nameEn}".`, lang));
  };

  const handleToggleLocationActive = (level: keyof BdLocationDatabase, nodeId: string) => {
    setLocationDb((prev) => ({
      ...prev,
      [level]: prev[level].map((n) => (n.id === nodeId ? { ...n, isActive: !n.isActive } : n)),
    }));
  };

  const handleDeleteSchool = (schoolId: string, reason: string) => {
    const target = schools.find((s) => s.id === schoolId);
    setSchools((prev) => prev.filter((s) => s.id !== schoolId));
    if (auth.currentUser?.emailVerified) {
      void executeClientCascadeDelete({
        targetType: 'school',
        targetId: schoolId,
        schoolId,
        reason,
        actorRole: 'central_admin',
      });
    }
    if (target) {
      appendAuditLog({
        who: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
        role: 'central_admin',
        what: 'বিদ্যালয় অপসারণ (Delete)',
        targetName: `${target.nameBn} (${target.code})`,
        schoolId,
        requestId: `DEL-${schoolId}`,
        oldValue: target.status,
        newValue: 'Deleted',
        reason,
      });
    }
    showToast(b('বিদ্যালয় তালিকা থেকে অপসারণ করা হয়েছে।', 'School removed.', lang));
  };

  const dispatchThreeWayStudentNotifications = (
    student: StudentRecord,
    titleBn: string,
    titleEn: string,
    messageBn: string,
    messageEn: string,
    type: NotificationItem['type'] = 'info',
    extraSchoolId?: string
  ) => {
    const stamp = Date.now();
    const newItems: NotificationItem[] = [
      {
        id: `nf-stu-ca-${stamp}`,
        roleTarget: 'central_admin',
        schoolId: student.schoolId,
        studentId: student.id,
        titleBn,
        titleEn,
        messageBn,
        messageEn,
        time: 'এইমাত্র',
        read: false,
        type,
      },
      {
        id: `nf-stu-sa-${stamp + 1}`,
        roleTarget: 'school_admin',
        schoolId: student.schoolId,
        studentId: student.id,
        titleBn,
        titleEn,
        messageBn,
        messageEn,
        time: 'এইমাত্র',
        read: false,
        type,
      },
      {
        id: `nf-stu-st-${stamp + 2}`,
        roleTarget: 'student',
        schoolId: student.schoolId,
        studentId: student.id,
        titleBn,
        titleEn,
        messageBn,
        messageEn,
        time: 'এইমাত্র',
        read: false,
        type,
      },
    ];
    if (extraSchoolId && extraSchoolId !== student.schoolId) {
      newItems.push({
        id: `nf-stu-sa2-${stamp + 3}`,
        roleTarget: 'school_admin',
        schoolId: extraSchoolId,
        studentId: student.id,
        titleBn,
        titleEn,
        messageBn,
        messageEn,
        time: 'এইমাত্র',
        read: false,
        type,
      });
    }
    setNotifications((prev) => [...newItems, ...prev]);
  };

  const handleUpdateStudentStatus = (
    studentId: string,
    status: StudentStatus,
    reason: string,
    actorRole: 'central_admin' | 'school_admin' = role === 'school_admin' ? 'school_admin' : 'central_admin'
  ) => {
    const target = students.find((s) => s.id === studentId);
    if (!target) return;
    if ((status === 'active' || status === 'rejected') && target.status === 'pending' && actorRole === 'central_admin') {
      showToast(b('নতুন শিক্ষার্থী অনুমোদন শুধুমাত্র School Admin সম্পন্ন করবেন।', 'Only School Admin can approve new student registrations.', lang));
      return;
    }
    const actor =
      actorRole === 'school_admin'
        ? `${schoolAdminOwnSchool.headTeacher} (School Admin)`
        : `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`;
    const updated = executeStudentStatusChange(
      target,
      status,
      reason,
      actor,
      new Date().toISOString().slice(0, 10)
    );
    setStudents((prev) => prev.map((s) => (s.id === studentId ? updated : s)));
    if (auth.currentUser?.emailVerified) {
      void syncStudentToFirestore(updated);
    }
    appendAuditLog({
      who: actor,
      role: actorRole,
      what: `শিক্ষার্থীর অবস্থা পরিবর্তন (${status})`,
      targetName: `${target.nameBn} (${target.permanentId})`,
      schoolId: target.schoolId,
      studentId: target.id,
      requestId: target.permanentId,
      oldValue: target.status,
      newValue: status,
      reason,
    });
    dispatchThreeWayStudentNotifications(
      updated,
      `শিক্ষার্থীর অবস্থা আপডেট: ${status}`,
      `Student Status Updated: ${status}`,
      `${updated.nameBn} (${updated.permanentId}) — অবস্থা "${status}"। কারণ: ${reason}`,
      `${updated.nameEn} status updated to ${status}. Reason: ${reason}`,
      status === 'active' ? 'success' : status === 'suspended' ? 'warning' : 'alert'
    );
    showToast(b(`${updated.nameBn}-এর অবস্থা ${status} করা হয়েছে।`, `Student status updated to ${status}.`, lang));
  };

  const handleEditStudentInfo = (
    studentId: string,
    patch: StudentEditPatch,
    actorRole: 'central_admin' | 'school_admin'
  ) => {
    const target = students.find((s) => s.id === studentId);
    if (!target) return;
    const actor =
      actorRole === 'school_admin'
        ? `${schoolAdminOwnSchool.headTeacher} (School Admin)`
        : `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`;
    const { updatedStudent, changedFields } = applyStudentEdit(
      target,
      patch,
      actor,
      new Date().toISOString().slice(0, 10)
    );
    setStudents((prev) => prev.map((s) => (s.id === studentId ? updatedStudent : s)));
    appendAuditLog({
      who: actor,
      role: actorRole,
      what: 'শিক্ষার্থীর প্রোফাইল তথ্য সম্পাদনা',
      targetName: `${updatedStudent.nameBn} (${updatedStudent.permanentId})`,
      schoolId: updatedStudent.schoolId,
      studentId: updatedStudent.id,
      requestId: `SEDT-${studentId}`,
      oldValue: `${target.nameBn} (${target.className})`,
      newValue: changedFields.join(', ') || 'Profile Updated',
      reason: patch.reason,
    });
    dispatchThreeWayStudentNotifications(
      updatedStudent,
      'শিক্ষার্থীর প্রোফাইল তথ্য হালনাগাদ',
      'Student Profile Updated',
      `${updatedStudent.nameBn}-এর প্রোফাইল তথ্য (${changedFields.join(', ') || 'Profile'}) হালনাগাদ হয়েছে।`,
      `${updatedStudent.nameEn}'s profile was updated.`,
      'info'
    );
    showToast(b(`${updatedStudent.nameBn}-এর তথ্য সংরক্ষিত হয়েছে।`, `Student information saved.`, lang));
  };

  const handleTransferStudent = (
    studentId: string,
    targetSchoolId: string,
    reason: string,
    actorRole: 'central_admin' | 'school_admin'
  ) => {
    const target = students.find((s) => s.id === studentId);
    const destSchool = schools.find((s) => s.id === targetSchoolId);
    if (!target || !destSchool) return;
    const actor =
      actorRole === 'school_admin'
        ? `${schoolAdminOwnSchool.headTeacher} (School Admin)`
        : `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`;
    const prevSchoolId = target.schoolId;
    const { updatedStudent, previousSchoolNameBn } = applyStudentTransfer(
      target,
      destSchool,
      reason,
      actor,
      new Date().toISOString().slice(0, 10)
    );
    setStudents((prev) => prev.map((s) => (s.id === studentId ? updatedStudent : s)));
    appendAuditLog({
      who: actor,
      role: actorRole,
      what: 'শিক্ষার্থী বিদ্যালয় পরিবর্তন (School Transfer)',
      targetName: `${updatedStudent.nameBn} (${updatedStudent.permanentId})`,
      schoolId: updatedStudent.schoolId,
      studentId: updatedStudent.id,
      requestId: `STR-${updatedStudent.permanentId}`,
      oldValue: previousSchoolNameBn,
      newValue: destSchool.nameBn,
      reason,
    });
    dispatchThreeWayStudentNotifications(
      updatedStudent,
      'শিক্ষার্থীর বিদ্যালয় পরিবর্তন সম্পন্ন',
      'Student School Transfer Completed',
      `${updatedStudent.nameBn} (${updatedStudent.permanentId}): ${previousSchoolNameBn} → ${destSchool.nameBn}। কারণ: ${reason}`,
      `${updatedStudent.nameEn} transferred from ${previousSchoolNameBn} to ${destSchool.nameBn}.`,
      'success',
      prevSchoolId
    );
    showToast(b(`${updatedStudent.nameBn} নতুন বিদ্যালয়ে স্থানান্তরিত হয়েছেন।`, `Student transferred to ${destSchool.nameEn}.`, lang));
  };

  const handleSendStudentNotice = (
    student: StudentRecord,
    notice: NoticeItem,
    actorRole: 'central_admin' | 'school_admin'
  ) => {
    setNotices((prev) => [notice, ...prev]);
    appendAuditLog({
      who: notice.author,
      role: actorRole,
      what: 'শিক্ষার্থীকে নোটিশ / বার্তা প্রেরণ',
      targetName: `${student.nameBn} (${student.permanentId})`,
      schoolId: student.schoolId,
      studentId: student.id,
      requestId: notice.id,
      oldValue: 'Notice Draft',
      newValue: notice.titleBn,
      reason: notice.bodyBn,
    });
    dispatchThreeWayStudentNotifications(
      student,
      notice.titleBn,
      notice.titleEn,
      notice.bodyBn,
      notice.bodyEn,
      'info'
    );
    showToast(b(`${student.nameBn}-কে নোটিশ পাঠানো হয়েছে।`, `Notice sent to ${student.nameEn}.`, lang));
  };

  const handleVerifyStudentDocument = (
    studentId: string,
    docId: string,
    verified: boolean,
    actorRole: 'central_admin' | 'school_admin'
  ) => {
    const target = students.find((s) => s.id === studentId);
    if (!target) return;
    const actor =
      actorRole === 'school_admin'
        ? `${schoolAdminOwnSchool.headTeacher} (School Admin)`
        : `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`;
    const updated = verifyStudentDocument(
      target,
      docId,
      verified,
      actor,
      new Date().toISOString().slice(0, 10)
    );
    setStudents((prev) => prev.map((s) => (s.id === studentId ? updated : s)));
    appendAuditLog({
      who: actor,
      role: actorRole,
      what: verified ? 'শিক্ষার্থীর ডকুমেন্ট যাচাই সম্পন্ন' : 'ডকুমেন্ট যাচাই পুনরায় খোলা',
      targetName: `${updated.nameBn} (${updated.permanentId})`,
      schoolId: updated.schoolId,
      studentId: updated.id,
      requestId: docId,
      oldValue: verified ? 'Unverified' : 'Verified',
      newValue: verified ? 'Verified' : 'Unverified',
    });
    showToast(
      verified
        ? b('ডকুমেন্ট যাচাইকৃত হিসেবে সংরক্ষিত হয়েছে।', 'Document marked verified.', lang)
        : b('ডকুমেন্ট যাচাই বাতিল করা হয়েছে।', 'Document verification reset.', lang)
    );
  };

  const handleProcessStudentRequest = (
    reqId: string,
    decision: 'approved' | 'rejected' | 'under_review' | 'pending',
    note: string,
    actorRole: 'central_admin' | 'school_admin'
  ) => {
    const req = studentRequests.find((r) => r.id === reqId);
    if (!req) return;
    const targetStudent = students.find((s) => s.id === req.studentId);
    if (!targetStudent) return;
    const actor =
      actorRole === 'school_admin'
        ? `${schoolAdminOwnSchool.headTeacher} (School Admin)`
        : `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`;

    const result = processStudentChangeRequest(
      req,
      targetStudent,
      schools,
      decision,
      note,
      actor,
      actorRole,
      new Date().toISOString().slice(0, 10)
    );

    if (!result.allowed) {
      showToast(result.errorBn ?? b('অনুমতি নেই।', 'Action not permitted.', lang));
      return;
    }

    setStudentRequests((prev) => prev.map((r) => (r.id === reqId ? result.updatedRequest : r)));
    setStudents((prev) =>
      prev.map((s) => (s.id === result.updatedStudent.id ? result.updatedStudent : s))
    );

    appendAuditLog({
      who: actor,
      role: actorRole,
      what: `${req.titleBn} (${decision})`,
      targetName: `${result.updatedStudent.nameBn} (${result.updatedStudent.permanentId})`,
      schoolId: result.updatedStudent.schoolId,
      studentId: result.updatedStudent.id,
      requestId: req.id,
      oldValue: req.currentValue,
      newValue: decision === 'approved' ? req.proposedValue : decision,
      reason: note || req.reason,
    });

    dispatchThreeWayStudentNotifications(
      result.updatedStudent,
      `${req.titleBn}: ${decision}`,
      `${req.titleEn}: ${decision}`,
      `${result.updatedStudent.nameBn} (${req.id}) — ${req.proposedValue}। নোট: ${note || req.reason}`,
      `${result.updatedStudent.nameEn} (${req.id}) — ${req.proposedValue}. Note: ${note || req.reason}`,
      decision === 'approved' ? 'success' : decision === 'rejected' ? 'warning' : 'info',
      req.schoolId
    );

    showToast(b(`${req.id} সিদ্ধান্ত (${decision}) সংরক্ষিত হয়েছে।`, `${req.id} updated to ${decision}.`, lang));
  };

  const handleSubmitImportantStudentChange = (
    student: StudentRecord,
    payload: {
      fieldKey: StudentImportantFieldKey;
      currentValue: string;
      proposedValue: string;
      reason: string;
    }
  ) => {
    const fieldLabel = IMPORTANT_FIELD_LABELS[payload.fieldKey];
    const reqId = `SREQ-${Date.now().toString().slice(-4)}`;
    const newReq: StudentChangeRequest = {
      id: reqId,
      studentId: student.id,
      permanentId: student.permanentId,
      studentNameBn: student.nameBn,
      schoolId: student.schoolId,
      schoolNameBn: student.schoolNameBn,
      category: 'important_profile_change',
      titleBn: `গুরুত্বপূর্ণ তথ্য পরিবর্তন (${fieldLabel.labelBn})`,
      titleEn: `Important Profile Change (${fieldLabel.labelEn})`,
      requestedBy: `${student.nameBn} (Student Portal)`,
      requestedByRole: 'student',
      submittedAt: 'এইমাত্র',
      status: 'pending',
      fieldKey: payload.fieldKey,
      currentValue: payload.currentValue,
      proposedValue: payload.proposedValue,
      reason: payload.reason,
    };
    setStudentRequests((prev) => [newReq, ...prev]);

    dispatchThreeWayStudentNotifications(
      student,
      `নতুন গুরুত্বপূর্ণ প্রোফাইল পরিবর্তনের আবেদন (${reqId})`,
      `New Important Profile Change Request (${reqId})`,
      `${student.nameBn} (${student.permanentId}) "${fieldLabel.labelBn}" পরিবর্তনের আবেদন করেছেন: ${payload.currentValue} → ${payload.proposedValue}`,
      `${student.nameEn} requested ${fieldLabel.labelEn} change: ${payload.currentValue} -> ${payload.proposedValue}`,
      'warning'
    );
    showToast(
      b(
        'গুরুত্বপূর্ণ প্রোফাইল পরিবর্তনের আবেদন School Admin ও Central Admin-এর কাছে পাঠানো হয়েছে।',
        'Important profile change request sent to School Admin & Central Admin.',
        lang
      )
    );
  };

  const handleStudentAllowedSelfUpdate = (
    studentId: string,
    patch: StudentAllowedSelfPatch
  ) => {
    const target = students.find((s) => s.id === studentId);
    if (!target) return;
    const updated = applyStudentAllowedSelfPatch(target, patch);
    setStudents((prev) => prev.map((s) => (s.id === studentId ? updated : s)));
    showToast(b('অনুমোদিত যোগাযোগ তথ্য সফলভাবে হালনাগাদ হয়েছে।', 'Allowed contact info updated.', lang));
  };

  const handleToggleAdminStatus = (adminId: string, reason: string) => {
    const target = adminAccounts.find((a) => a.id === adminId);
    const res = toggleSubordinateAdminStatus(adminAccounts, activeCentralAdmin, adminId);
    if (!res.ok) {
      showToast(b(res.errorBn ?? 'অনুমতি নেই।', res.errorEn ?? 'Permission denied.', lang));
      return;
    }
    setAdminAccounts(res.accounts);
    if (target) {
      appendAuditLog({
        who: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
        role: 'central_admin',
        what: 'Admin অ্যাক্সেস পরিবর্তন',
        targetName: target.name,
        requestId: target.username,
        oldValue: target.status,
        newValue: target.status === 'active' ? 'suspended' : 'active',
        reason,
      });
    }
  };

  const handleUpdateAdminPermissions = (
    adminId: string,
    permissions: string[],
    accessLevel: AdminAccount['accessLevel']
  ) => {
    const res = updateSubordinateAdminPermissions(
      adminAccounts,
      activeCentralAdmin,
      adminId,
      permissions,
      accessLevel
    );
    if (!res.ok) {
      showToast(b(res.errorBn ?? 'ব্যর্থ হয়েছে।', res.errorEn ?? 'Failed.', lang));
      return;
    }
    setAdminAccounts(res.accounts);
    showToast(b('অ্যাডমিনের অনুমতি সফলভাবে হালনাগাদ হয়েছে।', 'Admin permissions updated.', lang));
  };

  const handleDeleteAdmin = (adminId: string) => {
    const res = deleteSubordinateAdmin(adminAccounts, activeCentralAdmin, adminId);
    if (!res.ok) {
      showToast(b(res.errorBn ?? 'অপসারণ সম্ভব নয়।', res.errorEn ?? 'Cannot remove admin.', lang));
      return;
    }
    setAdminAccounts(res.accounts);
    showToast(b('সাব-অ্যাডমিন অ্যাকাউন্ট অপসারণ করা হয়েছে।', 'Subordinate admin removed.', lang));
  };

  const handleSubmitContactAdminMessage = (payload: {
    senderName: string;
    senderRole: Role | 'guest';
    senderSchoolId?: string;
    senderContact: string;
    subject: string;
    message: string;
  }) => {
    const created: ContactAdminMessage = {
      id: `cam-${Date.now().toString().slice(-5)}`,
      senderName: payload.senderName,
      senderRole: payload.senderRole,
      senderSchoolId: payload.senderSchoolId,
      senderContact: payload.senderContact,
      subject: payload.subject,
      message: payload.message,
      createdAt: new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: 'Pending',
    };
    setContactAdminMessages((prev) => [created, ...prev]);
    setNotifications((prev) => [
      {
        id: `nf-cam-${Date.now()}`,
        roleTarget: 'central_admin',
        category: 'message',
        priority: 'important',
        titleBn: `Admin যোগাযোগ বার্তা: ${payload.subject}`,
        titleEn: `Contact Admin Message: ${payload.subject}`,
        messageBn: `${payload.senderName} (${payload.senderRole}) একটি সরাসরি বার্তা পাঠিয়েছেন।`,
        messageEn: `${payload.senderName} (${payload.senderRole}) sent a direct support message.`,
        time: 'এইমাত্র',
        read: false,
        type: 'info',
        targetTab: 'security',
      },
      ...prev,
    ]);
    showToast(b('Main Admin ইনবক্সে আপনার বার্তা সফলভাবে পাঠানো হয়েছে।', 'Message delivered to Central Admin Inbox.', lang));
  };

  const handleUpdateContactMessageStatus = (
    id: string,
    status: ContactAdminMessage['status'],
    replyNote?: string
  ) => {
    setContactAdminMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status, replyNote } : m))
    );
    showToast(b(`বার্তার অবস্থা "${status}" করা হয়েছে।`, `Message marked ${status}.`, lang));
  };

  const handleApplyJoinSchool = (
    schoolId: string,
    designation: string,
    subjects: string[]
  ) => {
    const check = canPerformActionUnderSettings(systemSettings, 'join_school_by_code');
    if (!check.allowed) {
      showToast(b(check.reasonBn ?? 'স্কুলে যোগদান আবেদন বন্ধ রয়েছে।', check.reasonEn ?? 'School joining is currently disabled.', lang));
      return;
    }
    const targetSchool = schools.find((s) => s.id === schoolId);
    if (!targetSchool) return;
    const res = createTeacherJoinApplication(
      teacherSchoolAssignments,
      activeTeacherRecord,
      targetSchool,
      designation,
      subjects
    );
    if (!res.ok || !res.assignment) {
      showToast(b(res.errorBn ?? 'আবেদন করা যায়নি।', res.errorEn ?? 'Could not apply.', lang));
      return;
    }
    setTeacherSchoolAssignments((prev) => [res.assignment!, ...prev]);
    setNotifications((prev) => [
      {
        id: `nf-tjoin-${Date.now()}`,
        roleTarget: 'school_admin',
        schoolId: targetSchool.id,
        category: 'account',
        priority: 'important',
        titleBn: `নতুন শিক্ষক যোগদান আবেদন: ${activeTeacherRecord.nameBn}`,
        titleEn: `New Teacher Join Request: ${activeTeacherRecord.nameEn}`,
        messageBn: `${activeTeacherRecord.teacherCode} · ${designation} পদে যোগদানের আবেদন করেছেন।`,
        messageEn: `${activeTeacherRecord.teacherCode} applied to join as ${designation}.`,
        time: 'এইমাত্র',
        read: false,
        type: 'info',
        targetTab: 'teachers',
      },
      ...prev,
    ]);
    showToast(
      b(
        `${targetSchool.nameBn}-এ যোগদানের আবেদন পাঠানো হয়েছে (Pending)।`,
        `Join application sent to ${targetSchool.nameEn}.`,
        lang
      )
    );
  };

  const handleReviewTeacherJoinApplication = (
    assignmentId: string,
    decision: 'approved' | 'rejected',
    permissions?: Partial<TeacherSchoolPermissions>,
    assignedClasses?: string[],
    assignedSubjects?: string[]
  ) => {
    const target = teacherSchoolAssignments.find((a) => a.id === assignmentId);
    const updated = reviewTeacherJoinApplication(
      teacherSchoolAssignments,
      assignmentId,
      decision,
      schoolAdminOwnSchool.headTeacher,
      {
        permissions,
        assignedClasses,
        assignedSubjects,
      }
    );
    setTeacherSchoolAssignments(updated);
    if (decision === 'approved' && target) {
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === target.teacherId && t.schoolId === 'UNASSIGNED'
            ? {
                ...t,
                schoolId: target.schoolId,
                schoolNameBn: target.schoolNameBn,
                status: 'active',
                approvalStatus: 'approved',
                assignedClasses: assignedClasses ?? t.assignedClasses,
                subjects: assignedSubjects ?? t.subjects,
              }
            : t
        )
      );
      setActiveTeacherSchoolId(target.schoolId);
    }
    showToast(
      decision === 'approved'
        ? b('শিক্ষকের যোগদান আবেদন অনুমোদিত ও অনুমতি নির্ধারিত হয়েছে।', 'Teacher join application approved.', lang)
        : b('শিক্ষকের যোগদান আবেদন বাতিল করা হয়েছে।', 'Teacher join application rejected.', lang)
    );
  };

  const handleToggleTeacherAssignmentStatus = (
    assignmentId: string,
    nextStatus: 'Active' | 'Suspended' | 'Inactive'
  ) => {
    setTeacherSchoolAssignments((prev) =>
      leaveOrSuspendSchoolAssignment(prev, assignmentId, nextStatus)
    );
    showToast(
      b(`বিদ্যালয় দায়িত্বের অবস্থা "${nextStatus}" করা হয়েছে।`, `School assignment set to ${nextStatus}.`, lang)
    );
  };

  const handleUpdateTeacherPartB = (
    teacherId: string,
    payload: TeacherPartBUpdatePayload
  ) => {
    setTeachers((prev) =>
      prev.map((t) =>
        t.id === teacherId ? updateTeacherPartBProfessional(t, payload) : t
      )
    );
    showToast(
      b('শিক্ষকের প্রফেশনাল প্রোফাইল (অংশ-খ) হালনাগাদ হয়েছে।', 'Teacher Part B professional profile saved.', lang)
    );
  };

  // Teacher Governance & 3-Way Notification Helpers
  const dispatchThreeWayTeacherNotifications = (
    teacher: TeacherRecord,
    titleBn: string,
    titleEn: string,
    messageBn: string,
    messageEn: string,
    type: NotificationItem['type'] = 'info',
    extraSchoolId?: string
  ) => {
    const stamp = Date.now();
    const newItems: NotificationItem[] = [
      {
        id: `nf-tch-ca-${stamp}`,
        roleTarget: 'central_admin',
        schoolId: teacher.schoolId,
        teacherId: teacher.id,
        titleBn,
        titleEn,
        messageBn,
        messageEn,
        time: 'এইমাত্র',
        read: false,
        type,
      },
      {
        id: `nf-tch-sa-${stamp + 1}`,
        roleTarget: 'school_admin',
        schoolId: teacher.schoolId,
        teacherId: teacher.id,
        titleBn,
        titleEn,
        messageBn,
        messageEn,
        time: 'এইমাত্র',
        read: false,
        type,
      },
      {
        id: `nf-tch-tr-${stamp + 2}`,
        roleTarget: 'teacher',
        schoolId: teacher.schoolId,
        teacherId: teacher.id,
        titleBn,
        titleEn,
        messageBn,
        messageEn,
        time: 'এইমাত্র',
        read: false,
        type,
      },
    ];
    if (extraSchoolId && extraSchoolId !== teacher.schoolId) {
      newItems.push({
        id: `nf-tch-sa2-${stamp + 3}`,
        roleTarget: 'school_admin',
        schoolId: extraSchoolId,
        teacherId: teacher.id,
        titleBn,
        titleEn,
        messageBn,
        messageEn,
        time: 'এইমাত্র',
        read: false,
        type,
      });
    }
    setNotifications((prev) => [...newItems, ...prev]);
  };

  const handleRegisterTeacher = (newTeacher: TeacherRecord) => {
    const check = canPerformActionUnderSettings(systemSettings, 'new_teacher_registration');
    if (!check.allowed) {
      showToast(b(check.reasonBn ?? 'নতুন শিক্ষক নিবন্ধন বন্ধ রয়েছে।', check.reasonEn ?? 'Teacher registration is paused.', lang));
      return;
    }
    setTeachers((prev) => [newTeacher, ...prev]);
    const reqId = `TREQ-${Date.now().toString().slice(-4)}`;
    setTeacherRequests((prev) => [
      {
        id: reqId,
        teacherId: newTeacher.id,
        teacherCode: newTeacher.teacherCode,
        teacherNameBn: newTeacher.nameBn,
        schoolId: newTeacher.schoolId,
        schoolNameBn: newTeacher.schoolNameBn,
        category: 'new_registration',
        titleBn: 'নতুন শিক্ষক নিবন্ধন / অনুমোদন',
        titleEn: 'New Teacher Registration / Approval',
        requestedBy: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
        currentValue: 'New Applicant',
        proposedValue: `${newTeacher.designation} (${newTeacher.subjects.join(', ')})`,
        reason: 'নতুন শিক্ষক নিবন্ধন ও সনদ যাচাইয়ের আবেদন।',
        submittedAt: 'এইমাত্র',
        status: 'pending',
      },
      ...prev,
    ]);
    if (auth.currentUser?.emailVerified) {
      void syncTeacherToFirestore(newTeacher);
      void submitApplicationToFirestore(
        {
          id: reqId,
          type: 'teacher',
          typeLabelBn: 'নতুন শিক্ষক নিবন্ধন / অনুমোদন',
          typeLabelEn: 'New Teacher Registration / Approval',
          applicantName: newTeacher.nameBn,
          schoolName: newTeacher.schoolNameBn,
          schoolId: newTeacher.schoolId,
          targetEntityId: newTeacher.id,
          submittedAt: 'এইমাত্র',
          status: 'pending',
          priority: 'normal',
          details: `${newTeacher.designation} (${newTeacher.subjects.join(', ')})`,
        },
        'teacher'
      );
    }
    appendAuditLog({
      who: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
      role: 'central_admin',
      what: 'নতুন শিক্ষক নিবন্ধন আবেদন',
      targetName: `${newTeacher.nameBn} (${newTeacher.teacherCode})`,
      schoolId: newTeacher.schoolId,
      teacherId: newTeacher.id,
      requestId: reqId,
      oldValue: 'New',
      newValue: 'pending',
    });
    dispatchThreeWayTeacherNotifications(
      newTeacher,
      'নতুন শিক্ষক নিবন্ধন আবেদন',
      'New Teacher Registration',
      `${newTeacher.nameBn} (${newTeacher.teacherCode}) নিবন্ধনের জন্য যুক্ত হয়েছেন।`,
      `${newTeacher.nameEn} (${newTeacher.teacherCode}) submitted for approval.`,
      'info'
    );
    showToast(b(`নতুন শিক্ষক ${newTeacher.nameBn} নিবন্ধিত হয়েছেন (Pending)।`, `Teacher ${newTeacher.nameEn} registered.`, lang));
  };

  const handleEditTeacherInfo = (teacherId: string, patch: TeacherEditPatch) => {
    const actor = `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`;
    const existing = teachers.find((t) => t.id === teacherId);
    if (!existing) return;
    const todayIso = new Date().toISOString().slice(0, 10);
    const { updatedTeacher } = applyTeacherEdit(existing, patch, actor, todayIso);
    setTeachers((prev) => prev.map((t) => (t.id === teacherId ? updatedTeacher : t)));
    if (auth.currentUser?.emailVerified) {
      void syncTeacherToFirestore(updatedTeacher);
    }
    appendAuditLog({
      who: actor,
      role: 'central_admin',
      what: 'শিক্ষকের তথ্য পরিবর্তন (Edit)',
      targetName: `${updatedTeacher.nameBn} (${updatedTeacher.teacherCode})`,
      schoolId: updatedTeacher.schoolId,
      teacherId: updatedTeacher.id,
      requestId: `TEDIT-${teacherId}`,
      oldValue: `${existing.designation} · ${existing.mobile}`,
      newValue: `${updatedTeacher.designation} · ${updatedTeacher.mobile}`,
      reason: patch.reason,
    });
    dispatchThreeWayTeacherNotifications(
      updatedTeacher,
      'শিক্ষকের প্রোফাইল তথ্য হালনাগাদ',
      'Teacher Profile Updated',
      `${updatedTeacher.nameBn}-এর তথ্য সংশোধন করা হয়েছে: ${patch.reason || 'Profile updated'}`,
      `${updatedTeacher.nameEn}'s profile was updated: ${patch.reason || 'Profile updated'}`,
      'info'
    );
    showToast(b(`${updatedTeacher.nameBn}-এর তথ্য হালনাগাদ হয়েছে।`, `Teacher profile updated.`, lang));
  };

  const handleTeacherWorkflowAction = (
    teacherId: string,
    payload: TeacherWorkflowActionPayload
  ) => {
    const actor = `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`;
    const existing = teachers.find((t) => t.id === teacherId);
    if (!existing) return;
    const todayIso = new Date().toISOString().slice(0, 10);
    const { updatedTeacher, fromValue, toValue, categoryMeta } = applyTeacherWorkflowAction(
      existing,
      payload,
      actor,
      todayIso
    );

    setTeachers((prev) => prev.map((t) => (t.id === teacherId ? updatedTeacher : t)));

    // Sync Head Teacher / School Admin name if school_admin_role_change was executed
    if (payload.category === 'school_admin_role_change') {
      setSchools((prev) =>
        prev.map((s) =>
          s.id === updatedTeacher.schoolId ? { ...s, headTeacher: updatedTeacher.nameBn } : s
        )
      );
    }

    appendAuditLog({
      who: actor,
      role: 'central_admin',
      what: categoryMeta.labelBn,
      targetName: `${updatedTeacher.nameBn} (${updatedTeacher.teacherCode})`,
      schoolId: updatedTeacher.schoolId,
      teacherId: updatedTeacher.id,
      requestId: `TWF-${Date.now().toString().slice(-4)}`,
      oldValue: fromValue,
      newValue: toValue,
      reason: payload.reason,
    });

    dispatchThreeWayTeacherNotifications(
      updatedTeacher,
      categoryMeta.labelBn,
      categoryMeta.labelEn,
      `${updatedTeacher.nameBn}-এর জন্য "${categoryMeta.labelBn}" অনুমোদিত ও কার্যকর হয়েছে। (${payload.reason})`,
      `"${categoryMeta.labelEn}" applied for ${updatedTeacher.nameEn}. (${payload.reason})`,
      updatedTeacher.status === 'active' ? 'success' : 'warning',
      existing.schoolId
    );
    showToast(b(`${categoryMeta.labelBn} সম্পন্ন হয়েছে।`, `${categoryMeta.labelEn} applied.`, lang));
  };

  const handleUpdateTeacherStatus = (
    teacherId: string,
    status: TeacherStatus,
    reason: string
  ) => {
    const actor = `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`;
    const existing = teachers.find((t) => t.id === teacherId);
    if (!existing) return;
    const todayIso = new Date().toISOString().slice(0, 10);
    const updated = executeTeacherStatusChange(existing, status, reason, actor, todayIso);
    setTeachers((prev) => prev.map((t) => (t.id === teacherId ? updated : t)));
    if (auth.currentUser?.emailVerified) {
      void syncTeacherToFirestore(updated);
    }
    appendAuditLog({
      who: actor,
      role: 'central_admin',
      what:
        status === 'active'
          ? 'শিক্ষক অনুমোদন / পুনর্বহাল'
          : status === 'suspended'
            ? 'শিক্ষক সাময়িক স্থগিত'
            : status === 'rejected'
              ? 'শিক্ষক আবেদন প্রত্যাখ্যান'
              : status === 'deactivated'
                ? 'শিক্ষক নিষ্ক্রিয় / বাতিল'
                : 'শিক্ষকের অবস্থা পরিবর্তন',
      targetName: `${updated.nameBn} (${updated.teacherCode})`,
      schoolId: updated.schoolId,
      teacherId: updated.id,
      requestId: `TSTS-${teacherId}`,
      oldValue: existing.status,
      newValue: status,
      reason,
    });
    dispatchThreeWayTeacherNotifications(
      updated,
      status === 'active'
        ? 'শিক্ষক প্রোফাইল অনুমোদিত ও সক্রিয়'
        : status === 'suspended'
          ? 'শিক্ষক সাময়িক স্থগিত'
          : 'শিক্ষকের অবস্থায় পরিবর্তন',
      `Teacher Status: ${status}`,
      `${updated.nameBn}-এর অবস্থা "${status}" করা হয়েছে। কারণ: ${reason}`,
      `${updated.nameEn} status changed to ${status}. Reason: ${reason}`,
      status === 'active' ? 'success' : status === 'suspended' || status === 'rejected' ? 'warning' : 'alert'
    );
    showToast(b(`${updated.nameBn}-এর অবস্থা ${status} করা হয়েছে।`, `Teacher status updated to ${status}.`, lang));
  };

  const handleSendTeacherNotice = (teacher: TeacherRecord, notice: NoticeItem) => {
    setNotices((prev) => [notice, ...prev]);
    appendAuditLog({
      who: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
      role: 'central_admin',
      what: 'শিক্ষককে নোটিশ প্রেরণ',
      targetName: `${teacher.nameBn} (${teacher.teacherCode})`,
      schoolId: teacher.schoolId,
      teacherId: teacher.id,
      requestId: notice.id,
      oldValue: 'Notice',
      newValue: notice.titleBn,
      reason: notice.bodyBn,
    });
    dispatchThreeWayTeacherNotifications(
      teacher,
      notice.titleBn,
      notice.titleEn,
      notice.bodyBn,
      notice.bodyEn,
      'info'
    );
    showToast(b(`${teacher.nameBn}-কে নোটিশ ও নোটিফিকেশন পাঠানো হয়েছে।`, `Notice sent to ${teacher.nameEn}.`, lang));
  };

  const handleProcessTeacherRequest = (
    reqId: string,
    decision: 'approved' | 'rejected' | 'under_review',
    note: string
  ) => {
    const req = teacherRequests.find((r) => r.id === reqId);
    if (!req) return;
    const actor = `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`;
    const todayIso = new Date().toISOString().slice(0, 10);
    setTeacherRequests((prev) =>
      prev.map((r) =>
        r.id === reqId
          ? {
              ...r,
              status: decision,
              reason: note ? `${r.reason} · [${note}]` : r.reason,
            }
          : r
      )
    );

    const targetTeacher = teachers.find((t) => t.id === req.teacherId);
    if (!targetTeacher) return;

    let updatedTeacher = targetTeacher;
    if (decision === 'approved') {
      if (req.category === 'new_registration' || req.category === 'appointment_approval') {
        updatedTeacher = executeTeacherStatusChange(
          targetTeacher,
          'active',
          note || req.reason,
          actor,
          todayIso
        );
      } else {
        updatedTeacher = applyTeacherWorkflowAction(
          targetTeacher,
          {
            category: req.category,
            targetSchoolId: req.targetSchoolId,
            targetSchoolNameBn: req.targetSchoolNameBn,
            newDesignation: req.newDesignation ?? req.proposedValue,
            newSubjects: req.newSubjects,
            newAssignedClasses: req.newAssignedClasses,
            newJoiningDate: req.newJoiningDate ?? req.proposedValue,
            newBranch: req.newBranch,
            newDuty: req.newDuty,
            leaveRange: req.leaveRange ?? req.proposedValue,
            reason: note || req.reason,
          },
          actor,
          todayIso
        ).updatedTeacher;
      }
    } else if (decision === 'under_review') {
      updatedTeacher = executeTeacherStatusChange(
        targetTeacher,
        'under_review',
        note || 'কেন্দ্রীয় পর্যালোচনা চলছে',
        actor,
        todayIso
      );
    } else if (decision === 'rejected') {
      updatedTeacher = executeTeacherStatusChange(
        targetTeacher,
        targetTeacher.status === 'pending' || targetTeacher.status === 'under_review'
          ? 'rejected'
          : targetTeacher.status,
        note || 'আবেদন প্রত্যাখ্যাত',
        actor,
        todayIso
      );
    }

    setTeachers((prev) => prev.map((t) => (t.id === updatedTeacher.id ? updatedTeacher : t)));

    appendAuditLog({
      who: actor,
      role: 'central_admin',
      what: `${req.titleBn} (${decision})`,
      targetName: `${targetTeacher.nameBn} (${targetTeacher.teacherCode})`,
      schoolId: updatedTeacher.schoolId,
      teacherId: updatedTeacher.id,
      requestId: req.id,
      oldValue: req.currentValue,
      newValue: decision === 'approved' ? req.proposedValue : decision,
      reason: note || req.reason,
    });

    dispatchThreeWayTeacherNotifications(
      updatedTeacher,
      `${req.titleBn}: ${decision === 'approved' ? 'অনুমোদিত' : decision === 'rejected' ? 'প্রত্যাখ্যাত' : 'পর্যালোচনাধীন'}`,
      `${req.titleEn}: ${decision}`,
      `${targetTeacher.nameBn} (${req.id}) — ${req.proposedValue}। নোট: ${note || req.reason}`,
      `${targetTeacher.nameEn} (${req.id}) — ${req.proposedValue}. Note: ${note || req.reason}`,
      decision === 'approved' ? 'success' : decision === 'rejected' ? 'warning' : 'info',
      targetTeacher.schoolId
    );

    showToast(
      b(
        `${req.id} (${targetTeacher.nameBn}) — ${decision} সম্পন্ন হয়েছে।`,
        `${req.id} updated to ${decision}.`,
        lang
      )
    );
  };

  const handleVisitTeacherDashboard = (teacher: TeacherRecord) => {
    appendAuditLog({
      who: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
      role: 'central_admin',
      what: 'শিক্ষক ড্যাশবোর্ড ভিজিট (Admin Visit Mode)',
      targetName: `${teacher.nameBn} (${teacher.teacherCode})`,
      schoolId: teacher.schoolId,
      teacherId: teacher.id,
      requestId: `TVISIT-${teacher.teacherCode}`,
      oldValue: 'Admin Directory',
      newValue: 'Teacher Dashboard Viewed',
    });
  };

  // Governance Permission, Verification (Separate from Approval), ID Re-issue & TC Handlers
  const handleTogglePermission = (targetRole: AdminReviewerRole, key: PermissionKey) => {
    setPermissionMatrix((prev) => toggleRolePermission(prev, targetRole, key));
  };

  const handleVerifySchool = (
    schoolId: string,
    note: string,
    decision: 'verified' | 'flagged' = 'verified'
  ) => {
    const target = schools.find((s) => s.id === schoolId);
    if (!target) return;
    const actor = `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (${activeReviewerRole})`;
    const dateStr = new Date().toISOString().slice(0, 10);
    setSchools((prev) =>
      prev.map((s) =>
        s.id === schoolId
          ? {
              ...s,
              verificationStatus: decision,
              verifiedBy: actor,
              verificationNote: note || (decision === 'verified' ? 'সকল তথ্য ও নথি যাচাইকৃত' : 'সংশোধন প্রয়োজন'),
              addressVerified: decision === 'verified' ? true : s.addressVerified,
              approvalHistory: [
                {
                  id: `APH-${Date.now().toString().slice(-5)}`,
                  date: dateStr,
                  actor,
                  action: decision === 'verified' ? 'Verification Passed' : 'Verification Flagged',
                  fromStatus: s.verificationStatus ?? 'pending',
                  toStatus: decision,
                  note: note || undefined,
                },
                ...(s.approvalHistory ?? []),
              ],
            }
          : s
      )
    );
    appendAuditLog({
      who: actor,
      role: 'central_admin',
      what: decision === 'verified' ? 'বিদ্যালয় তথ্য যাচাই সম্পন্ন (Verification)' : 'বিদ্যালয় তথ্য যাচাইয়ে আপত্তি (Flagged)',
      targetName: `${target.nameBn} (${target.code})`,
      schoolId,
      requestId: `VER-${target.code}`,
      oldValue: target.verificationStatus ?? 'pending',
      newValue: decision,
      reason: note,
    });
    dispatchNotification({
      roleTarget: 'school_admin',
      schoolId,
      type: decision === 'verified' ? 'success' : 'warning',
      titleBn: decision === 'verified' ? 'বিদ্যালয়ের তথ্য যাচাই সম্পন্ন' : 'বিদ্যালয়ের তথ্যে সংশোধন প্রয়োজন',
      titleEn: decision === 'verified' ? 'School Verification Completed' : 'School Verification Flagged',
      messageBn: `${target.nameBn}-এর যাচাই অবস্থা: ${decision}। ${note || ''}`,
      messageEn: `${target.nameEn} verification marked ${decision}. ${note || ''}`,
    });
    showToast(
      decision === 'verified'
        ? b(`${target.nameBn}-এর তথ্য যাচাই সম্পন্ন হয়েছে।`, `${target.nameEn} verified.`, lang)
        : b(`${target.nameBn}-এ যাচাই আপত্তি চিহ্নিত হয়েছে।`, `${target.nameEn} flagged during verification.`, lang)
    );
  };

  const handleVerifyTeacher = (
    teacherId: string,
    note: string,
    decision: 'verified' | 'flagged' = 'verified'
  ) => {
    const target = teachers.find((t) => t.id === teacherId);
    if (!target) return;
    const actor = `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (${activeReviewerRole})`;
    const dateStr = new Date().toISOString().slice(0, 10);
    setTeachers((prev) =>
      prev.map((t) =>
        t.id === teacherId
          ? {
              ...t,
              verificationStatus: decision,
              verifiedBy: actor,
              verificationNote: note || (decision === 'verified' ? 'এনআইডি ও সনদ যাচাইকৃত' : 'তথ্য অসামঞ্জস্য'),
              activityHistory: [
                `${dateStr}: ${decision === 'verified' ? 'তথ্য যাচাই সম্পন্ন' : 'যাচাই আপত্তি'} — ${actor}`,
                ...(t.activityHistory ?? []),
              ],
              approvalHistory: [
                {
                  id: `TAPH-${Date.now().toString().slice(-5)}`,
                  date: dateStr,
                  actor,
                  category: 'verification',
                  actionTitleBn: decision === 'verified' ? 'শিক্ষকের তথ্য ও সনদ যাচাই' : 'তথ্য যাচাইয়ে আপত্তি',
                  actionTitleEn: decision === 'verified' ? 'Teacher Record Verified' : 'Teacher Verification Flagged',
                  fromValue: t.verificationStatus ?? 'pending',
                  toValue: decision,
                  decision: decision === 'verified' ? 'verified' : 'flagged',
                  note: note || undefined,
                },
                ...(t.approvalHistory ?? []),
              ],
            }
          : t
      )
    );
    appendAuditLog({
      who: actor,
      role: 'central_admin',
      what: decision === 'verified' ? 'শিক্ষকের তথ্য যাচাই সম্পন্ন' : 'শিক্ষকের তথ্যে যাচাই আপত্তি',
      targetName: `${target.nameBn} (${target.teacherCode})`,
      schoolId: target.schoolId,
      teacherId: target.id,
      requestId: `TVER-${target.teacherCode}`,
      oldValue: target.verificationStatus ?? 'pending',
      newValue: decision,
      reason: note,
    });
    dispatchThreeWayTeacherNotifications(
      target,
      decision === 'verified' ? 'শিক্ষকের তথ্য যাচাই সম্পন্ন' : 'শিক্ষকের তথ্যে যাচাই আপত্তি',
      decision === 'verified' ? 'Teacher Verification Passed' : 'Teacher Verification Flagged',
      `${target.nameBn} (${target.teacherCode}): ${decision}। ${note || ''}`,
      `${target.nameEn}: ${decision}. ${note || ''}`,
      decision === 'verified' ? 'success' : 'warning'
    );
    showToast(b(`${target.nameBn}-এর যাচাই অবস্থা ${decision} হয়েছে।`, `Teacher verification marked ${decision}.`, lang));
  };

  const handleVerifyStudent = (
    studentId: string,
    note: string,
    decision: 'verified' | 'flagged' = 'verified'
  ) => {
    const target = students.find((s) => s.id === studentId);
    if (!target) return;
    const actor =
      role === 'school_admin'
        ? `${schoolAdminOwnSchool.headTeacher} (School Admin)`
        : `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (${activeReviewerRole})`;
    const dateStr = new Date().toISOString().slice(0, 10);
    const updated: StudentRecord = {
      ...target,
      verificationStatus: decision,
      verifiedBy: actor,
      verificationNote: note || (decision === 'verified' ? 'জন্মনিবন্ধন ও পরিচয়পত্র যাচাইকৃত' : 'নথি পুনঃপরীক্ষা প্রয়োজন'),
      documents:
        decision === 'verified'
          ? (target.documents ?? []).map((d) => ({
              ...d,
              verified: true,
              verifiedBy: actor,
              verifiedAt: dateStr,
            }))
          : target.documents,
      approvalHistory: [
        {
          id: `SAPH-${Date.now().toString().slice(-5)}`,
          date: dateStr,
          actor,
          category: 'document_verification',
          actionTitleBn: decision === 'verified' ? 'শিক্ষার্থীর তথ্য ও নথি যাচাই' : 'তথ্য যাচাইয়ে আপত্তি',
          actionTitleEn: decision === 'verified' ? 'Student Verification Passed' : 'Student Verification Flagged',
          fromValue: target.verificationStatus ?? 'pending',
          toValue: decision,
          decision: decision === 'verified' ? 'verified' : 'flagged',
          note: note || undefined,
        },
        ...(target.approvalHistory ?? []),
      ],
    };
    setStudents((prev) => prev.map((s) => (s.id === studentId ? updated : s)));
    appendAuditLog({
      who: actor,
      role: role === 'school_admin' ? 'school_admin' : 'central_admin',
      what: decision === 'verified' ? 'শিক্ষার্থীর তথ্য ও নথি যাচাই সম্পন্ন' : 'শিক্ষার্থীর তথ্যে যাচাই আপত্তি',
      targetName: `${target.nameBn} (${target.permanentId})`,
      schoolId: target.schoolId,
      studentId: target.id,
      requestId: `SVER-${target.permanentId}`,
      oldValue: target.verificationStatus ?? 'pending',
      newValue: decision,
      reason: note,
    });
    dispatchThreeWayStudentNotifications(
      updated,
      decision === 'verified' ? 'শিক্ষার্থীর তথ্য যাচাই সম্পন্ন' : 'শিক্ষার্থীর নথিতে আপত্তি',
      decision === 'verified' ? 'Student Verification Passed' : 'Student Verification Flagged',
      `${updated.nameBn} (${updated.permanentId}): ${decision}। ${note || ''}`,
      `${updated.nameEn}: ${decision}. ${note || ''}`,
      decision === 'verified' ? 'success' : 'warning'
    );
    showToast(b(`${target.nameBn}-এর যাচাই অবস্থা ${decision} হয়েছে।`, `Student verification marked ${decision}.`, lang));
  };

  const handleVerifyQueueItem = (
    item: VerificationQueueItem,
    decision: 'verified' | 'flagged',
    note: string
  ) => {
    if (item.entityType === 'school') {
      handleVerifySchool(item.entityId, note, decision);
      return;
    }
    if (item.entityType === 'teacher') {
      handleVerifyTeacher(item.entityId, note, decision);
      return;
    }
    if (item.entityType === 'student') {
      handleVerifyStudent(item.entityId, note, decision);
      return;
    }
    // entityType === 'request'
    const actor = `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (${activeReviewerRole})`;
    const targetReq = requests.find((r) => r.id === item.entityId);
    setRequests((prev) =>
      prev.map((r) =>
        r.id === item.entityId
          ? {
              ...r,
              verificationStatus: decision,
              verifiedBy: actor,
              verificationNote: note,
            }
          : r
      )
    );
    if (targetReq?.type === 'school' && targetReq.schoolId) {
      handleVerifySchool(targetReq.schoolId, note, decision);
      return;
    }
    appendAuditLog({
      who: actor,
      role: 'central_admin',
      what: `আবেদন ID যাচাই (${decision})`,
      targetName: item.titleBn,
      schoolId: item.schoolId,
      requestId: item.entityId,
      oldValue: item.verificationStatus,
      newValue: decision,
      reason: note,
    });
    showToast(b(`${item.identifierLabel} যাচাই (${decision}) সম্পন্ন।`, `${item.identifierLabel} marked ${decision}.`, lang));
  };

  const handleReissueTeacherId = (teacherId: string) => {
    const target = teachers.find((t) => t.id === teacherId);
    if (!target) return;
    const actor = `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (${activeReviewerRole})`;
    const dateStr = new Date().toISOString().slice(0, 10);
    const updated = reissueTeacherId(target, actor, dateStr);
    setTeachers((prev) => prev.map((t) => (t.id === teacherId ? updated : t)));
    appendAuditLog({
      who: actor,
      role: 'central_admin',
      what: 'শিক্ষক আইডি কার্ড পুনঃইস্যু (Re-issue ID)',
      targetName: `${target.nameBn} (${target.teacherCode})`,
      schoolId: target.schoolId,
      teacherId: target.id,
      requestId: `TID-${target.teacherCode}-${updated.reissuedIdCount}`,
      oldValue: target.teacherCode,
      newValue: `${target.teacherCode} (Rev #${updated.reissuedIdCount})`,
    });
    dispatchThreeWayTeacherNotifications(
      updated,
      'শিক্ষক আইডি কার্ড পুনঃইস্যু সম্পন্ন',
      'Teacher ID Card Re-issued',
      `${updated.nameBn} (${updated.teacherCode})-এর ডিজিটাল আইডি কার্ড (#${updated.reissuedIdCount}) ইস্যু হয়েছে।`,
      `Teacher ID re-issued for ${updated.nameEn}.`,
      'success'
    );
    showToast(
      b(
        `${updated.nameBn}-এর আইডি কার্ড পুনঃইস্যু (#${updated.reissuedIdCount}) সম্পন্ন হয়েছে।`,
        `Teacher ID re-issued (#${updated.reissuedIdCount}).`,
        lang
      )
    );
  };

  const handleReissueStudentId = (studentId: string): string => {
    const target = students.find((s) => s.id === studentId);
    if (!target) return '';
    const actor =
      role === 'school_admin'
        ? `${schoolAdminOwnSchool.headTeacher} (School Admin)`
        : `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (${activeReviewerRole})`;
    const dateStr = new Date().toISOString().slice(0, 10);
    const updated = reissueStudentDigitalId(target, actor, dateStr);
    setStudents((prev) => prev.map((s) => (s.id === studentId ? updated : s)));
    appendAuditLog({
      who: actor,
      role: role === 'school_admin' ? 'school_admin' : 'central_admin',
      what: 'ডিজিটাল শিক্ষার্থী আইডি কার্ড ইস্যু / পুনঃইস্যু',
      targetName: `${updated.nameBn} (${updated.permanentId})`,
      schoolId: updated.schoolId,
      studentId: updated.id,
      requestId: updated.digitalIdSerial ?? updated.permanentId,
      oldValue: target.digitalIdSerial ?? 'Initial Card',
      newValue: updated.digitalIdSerial ?? 'Issued',
    });
    dispatchThreeWayStudentNotifications(
      updated,
      `ডিজিটাল আইডি কার্ড ইস্যু (${updated.digitalIdSerial})`,
      `Digital ID Card Issued (${updated.digitalIdSerial})`,
      `${updated.nameBn}-এর ডিজিটাল QR আইডি কার্ড (${updated.digitalIdSerial}) ইস্যু হয়েছে।`,
      `Digital QR ID card ${updated.digitalIdSerial} issued for ${updated.nameEn}.`,
      'success'
    );
    showToast(
      b(
        `ডিজিটাল আইডি কার্ড (${updated.digitalIdSerial}) সফলভাবে ইস্যু হয়েছে।`,
        `Digital ID Card (${updated.digitalIdSerial}) issued.`,
        lang
      )
    );
    return updated.digitalIdSerial ?? '';
  };

  const handleIssueTransferLetter = (
    studentId: string,
    targetSchoolName: string,
    reason: string
  ): string => {
    const target = students.find((s) => s.id === studentId);
    if (!target) return '';
    const actor =
      role === 'school_admin'
        ? `${schoolAdminOwnSchool.headTeacher} (School Admin)`
        : `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (${activeReviewerRole})`;
    const dateStr = new Date().toISOString().slice(0, 10);
    const { updatedStudent, tcNumber } = issueStudentTransferLetter(
      target,
      targetSchoolName,
      reason,
      actor,
      dateStr
    );
    setStudents((prev) => prev.map((s) => (s.id === studentId ? updatedStudent : s)));
    appendAuditLog({
      who: actor,
      role: role === 'school_admin' ? 'school_admin' : 'central_admin',
      what: `ছাড়পত্র / ট্রান্সফার লেটার ইস্যু (${tcNumber})`,
      targetName: `${updatedStudent.nameBn} (${updatedStudent.permanentId})`,
      schoolId: updatedStudent.schoolId,
      studentId: updatedStudent.id,
      requestId: tcNumber,
      oldValue: updatedStudent.schoolNameBn,
      newValue: targetSchoolName || 'Open Transfer',
      reason,
    });
    dispatchThreeWayStudentNotifications(
      updatedStudent,
      `ছাড়পত্র (Transfer Letter) ইস্যু: ${tcNumber}`,
      `Transfer Letter Issued: ${tcNumber}`,
      `${updatedStudent.nameBn} (${updatedStudent.permanentId})-এর ছাড়পত্র (${tcNumber}) ইস্যু হয়েছে। গন্তব্য: ${targetSchoolName}`,
      `Transfer certificate ${tcNumber} issued for ${updatedStudent.nameEn}.`,
      'info'
    );
    showToast(
      b(
        `ছাড়পত্র (${tcNumber}) সফলভাবে তৈরি ও সংরক্ষিত হয়েছে।`,
        `Transfer Letter (${tcNumber}) generated & logged.`,
        lang
      )
    );
    return tcNumber;
  };

  // School Admin Handlers
  const handleAddStudent = (newStudent: StudentRecord) => {
    const check = canPerformActionUnderSettings(systemSettings, 'new_student_registration');
    if (!check.allowed) {
      showToast(b(check.reasonBn ?? 'নতুন শিক্ষার্থী নিবন্ধন বন্ধ রয়েছে।', check.reasonEn ?? 'Student registration is paused.', lang));
      return;
    }
    setStudents((prev) => [newStudent, ...prev]);
    if (auth.currentUser?.emailVerified) {
      void syncStudentToFirestore(newStudent);
    }
    if (newStudent.status === 'pending') {
      const sReqId = `SREQ-${Date.now().toString().slice(-4)}`;
      setStudentRequests((prev) => [
        {
          id: sReqId,
          studentId: newStudent.id,
          permanentId: newStudent.permanentId,
          studentNameBn: newStudent.nameBn,
          schoolId: newStudent.schoolId,
          schoolNameBn: newStudent.schoolNameBn,
          category: 'new_registration',
          titleBn: 'নতুন শিক্ষার্থীর নিবন্ধন ও ভর্তি আবেদন',
          titleEn: 'New Student Admission Application',
          requestedBy: `${schoolAdminOwnSchool.headTeacher} (School Intake)`,
          requestedByRole: 'school_admin',
          submittedAt: 'এইমাত্র',
          status: 'pending',
          currentValue: 'New Applicant',
          proposedValue: `${newStudent.className} (${newStudent.section})`,
          reason: 'নথি যাচাই ও স্কুল এডমিন অনুমোদনের জন্য জমাকৃত।',
        },
        ...prev,
      ]);
      if (auth.currentUser?.emailVerified) {
        void submitApplicationToFirestore(
          {
            id: sReqId,
            type: 'student',
            typeLabelBn: 'নতুন শিক্ষার্থীর নিবন্ধন ও ভর্তি আবেদন',
            typeLabelEn: 'New Student Admission Application',
            applicantName: newStudent.nameBn,
            schoolName: newStudent.schoolNameBn,
            schoolId: newStudent.schoolId,
            targetEntityId: newStudent.id,
            submittedAt: 'এইমাত্র',
            status: 'pending',
            priority: 'normal',
            details: `${newStudent.className} (${newStudent.section})`,
          },
          'student'
        );
      }
    }
    appendAuditLog({
      who: `${schoolAdminOwnSchool.headTeacher} (School Admin)`,
      role: 'school_admin',
      what: newStudent.status === 'pending' ? 'নতুন শিক্ষার্থী ভর্তি আবেদন জমা' : 'নতুন শিক্ষার্থী ভর্তি',
      targetName: `${newStudent.nameBn} (${newStudent.permanentId})`,
      schoolId: newStudent.schoolId,
      studentId: newStudent.id,
      requestId: newStudent.permanentId,
      oldValue: 'New',
      newValue: `${newStudent.className} Roll ${newStudent.roll} (${newStudent.status})`,
    });
    showToast(b(`ভর্তি সম্পন্ন! Permanent ID: ${newStudent.permanentId}`, `Admitted! Permanent ID: ${newStudent.permanentId}`, lang));
  };

  const handleUpdateRoutineSlot = (slotId: string, patch: Partial<RoutineSlot>, unlockNext = false) => {
    setRoutineSlots((prev) => {
      const idx = prev.findIndex((s) => s.id === slotId);
      return prev.map((s, i) => {
        if (s.id === slotId) return { ...s, ...patch };
        if (unlockNext && i === idx + 1 && s.status === 'pending') {
          return { ...s, status: 'in_progress' };
        }
        return s;
      });
    });
    if (unlockNext) {
      showToast(b('বাড়ির কাজ সংরক্ষিত হয়েছে এবং পরবর্তী ক্লাস আনলক হয়েছে।', 'Homework saved & next period unlocked.', lang));
    }
  };

  const handleSimulateKioskScan = (studentId: string, isLate: boolean) => {
    const st = students.find((s) => s.id === studentId);
    if (!st) return;
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setKioskScans((prev) => [
      {
        id: `k-${Date.now()}`,
        studentId: st.id,
        studentName: st.nameBn,
        className: st.className,
        roll: st.roll,
        scanTime: nowTime,
        type: 'entry',
        attendanceState: isLate ? 'late' : 'present',
      },
      ...prev,
    ]);
    showToast(b(`${st.nameBn}-এর প্রবেশ রেকর্ড হয়েছে (${nowTime})।`, `Recorded entry for ${st.nameEn}.`, lang));
  };

  const handleToggleExamStatus = (examId: string, status: ExamRecord['status'], reason: string) => {
    setExams((prev) => prev.map((ex) => (ex.id === examId ? { ...ex, status } : ex)));
    appendAuditLog({
      who: `${schoolAdminOwnSchool.headTeacher} (School Admin)`,
      role: 'school_admin',
      what: status === 'published' ? 'পরীক্ষার ফলাফল প্রকাশ' : 'পরীক্ষার ফলাফল স্থগিত',
      targetName: 'তৃতীয় সাময়িক পরীক্ষা ২০২৬',
      schoolId: schoolAdminOwnSchool.id,
      requestId: examId,
      oldValue: status === 'published' ? 'held' : 'published',
      newValue: status,
      reason,
    });
    showToast(
      status === 'published'
        ? b('ফলাফল সফলভাবে প্রকাশিত হয়েছে।', 'Exam results published.', lang)
        : b('ফলাফল স্থগিত করা হয়েছে।', 'Exam results held.', lang)
    );
  };

  const handleUpdateExamMark = (
    examId: string,
    studentId: string,
    subjectEn: string,
    written: number,
    mcq?: number
  ) => {
    const guard = isCentralAdminActionBlocked(role, 'enter_marks');
    if (guard.blocked) {
      showToast(b(guard.reasonBn, guard.reasonEn, lang));
      return;
    }
    setExams((prev) =>
      prev.map((ex) =>
        ex.id === examId
          ? {
              ...ex,
              entries: ex.entries.map((entry) => {
                if (entry.studentId !== studentId || entry.subjectEn !== subjectEn) return entry;
                const maxWritten = ex.isCentralControlled === false ? entry.fullMarks : 80;
                const clampedWritten = Math.max(0, Math.min(maxWritten, Number.isNaN(written) ? 0 : written));
                const clampedMcq =
                  typeof mcq === 'number'
                    ? Math.max(0, Math.min(30, Number.isNaN(mcq) ? 0 : mcq))
                    : undefined;
                return {
                  ...entry,
                  written: clampedWritten,
                  ...(clampedMcq !== undefined ? { mcq: clampedMcq } : {}),
                };
              }),
            }
          : ex
      )
    );
  };

  // Academic Management Handlers
  const handleCreateAcademicYear = (yearLabel: string, startDate: string, endDate: string) => {
    const newId = `ay-${yearLabel.replace(/\s+/g, '')}-${Date.now().toString().slice(-3)}`;
    setAcademicYears((prev) => [
      {
        id: newId,
        yearLabel,
        startDate,
        endDate,
        isCurrent: false,
        isArchived: false,
        passRatePct: 0,
        avgAttendancePct: 0,
        terms: [
          {
            id: `${newId}-t1`,
            nameBn: '১ম সাময়িক / টার্ম',
            nameEn: '1st Term',
            startDate,
            endDate,
            status: 'upcoming',
          },
        ],
      },
      ...prev,
    ]);
    showToast(b(`নতুন শিক্ষাবর্ষ ${yearLabel} তৈরি হয়েছে।`, `Created Academic Year ${yearLabel}.`, lang));
  };

  const handleSelectCurrentAcademicYear = (yearId: string) => {
    setAcademicYears((prev) =>
      prev.map((y) => ({
        ...y,
        isCurrent: y.id === yearId,
        isArchived: y.id !== yearId && y.yearLabel < '2026',
      }))
    );
    showToast(b('বর্তমান শিক্ষাবর্ষ পরিবর্তন করা হয়েছে।', 'Active Academic Year updated.', lang));
  };

  const handleAddTermToYear = (yearId: string, nameBn: string, startDate: string, endDate: string) => {
    setAcademicYears((prev) =>
      prev.map((y) =>
        y.id === yearId
          ? {
              ...y,
              terms: [
                ...y.terms,
                {
                  id: `term-${Date.now().toString().slice(-4)}`,
                  nameBn,
                  nameEn: nameBn,
                  startDate,
                  endDate,
                  status: 'upcoming',
                },
              ],
            }
          : y
      )
    );
    showToast(b(`টার্ম "${nameBn}" যুক্ত হয়েছে।`, `Added term "${nameBn}".`, lang));
  };

  const handleAddCalendarEvent = (ev: Omit<AcademicCalendarEvent, 'id'>) => {
    setCalendarEvents((prev) => [{ ...ev, id: `cal-${Date.now().toString().slice(-4)}` }, ...prev]);
    showToast(b('একাডেমিক ক্যালেন্ডার ইভেন্ট যুক্ত হয়েছে।', 'Calendar event added.', lang));
  };

  const handleAddClassSection = (cfg: Omit<ClassSectionRoomConfig, 'id'>) => {
    const newCls: ClassSectionRoomConfig = { ...cfg, id: `cs-${Date.now().toString().slice(-4)}` };
    setClassSections((prev) => [...prev, newCls]);
    if (auth.currentUser?.emailVerified) {
      void syncClassToFirestore(newCls, schoolAdminOwnSchool.id);
    }
    showToast(b(`শ্রেণি ${cfg.className} (${cfg.section}) যুক্ত হয়েছে।`, `Added ${cfg.className} (${cfg.section}).`, lang));
  };

  const handleAddSubject = (sub: Omit<AcademicSubjectConfig, 'id'>) => {
    const newSub: AcademicSubjectConfig = { ...sub, id: `sub-${Date.now().toString().slice(-4)}` };
    setAcademicSubjects((prev) => [...prev, newSub]);
    if (auth.currentUser?.emailVerified) {
      void syncSubjectToFirestore(newSub, schoolAdminOwnSchool.id);
    }
    showToast(b(`বিষয় "${sub.nameBn}" যুক্ত হয়েছে।`, `Subject "${sub.nameEn}" added.`, lang));
  };

  const handleSaveTeacherAssignment = (item: Omit<TeacherSubjectAssignment, 'id' | 'assignedDate'>) => {
    setTeacherAssignments((prev) => [
      {
        ...item,
        id: `tsa-${Date.now().toString().slice(-4)}`,
        assignedDate: '১৭ নভে ২০২৬',
      },
      ...prev,
    ]);
    appendAuditLog({
      who: `${schoolAdminOwnSchool.headTeacher} (School Admin)`,
      role: 'school_admin',
      what: 'শিক্ষক-বিষয় দায়িত্ব বণ্টন',
      targetName: `${item.teacherName} → ${item.className} ${item.subjectEn}`,
      schoolId: schoolAdminOwnSchool.id,
      requestId: `TSA-${Date.now().toString().slice(-3)}`,
      oldValue: 'Unassigned',
      newValue: `${item.weeklyPeriods} periods/wk`,
    });
    showToast(b('শিক্ষক ও বিষয় অ্যাসাইনমেন্ট সংরক্ষিত হয়েছে।', 'Teacher subject assignment saved.', lang));
  };

  const handleReplaceAssignedTeacher = (assignmentId: string, newTeacherId: string) => {
    const newTeacher = teachers.find((t) => t.id === newTeacherId);
    if (!newTeacher) return;
    setTeacherAssignments((prev) =>
      prev.map((a) =>
        a.id === assignmentId ? { ...a, teacherId: newTeacher.id, teacherName: newTeacher.nameBn } : a
      )
    );
    showToast(b(`শিক্ষক পরিবর্তন করে ${newTeacher.nameBn}-কে দায়িত্ব দেওয়া হয়েছে।`, `Reassigned to ${newTeacher.nameEn}.`, lang));
  };

  const handleCreateRoutineSlot = (slot: Omit<RoutineSlot, 'id'>) => {
    setRoutineSlots((prev) => [...prev, { ...slot, id: `rt-${Date.now().toString().slice(-4)}` }]);
    showToast(b('নতুন রুটিন পিরিয়ড যুক্ত হয়েছে।', 'New routine period created.', lang));
  };

  const handleAssignSubstituteTeacher = (slotId: string, teacherId: string, reason: SubstituteReason) => {
    const subTeacher = teachers.find((t) => t.id === teacherId);
    if (!subTeacher) return;
    const targetSlot = routineSlots.find((s) => s.id === slotId);
    setRoutineSlots((prev) =>
      prev.map((slot) =>
        slot.id === slotId ? assignSubstituteWithReason(slot, subTeacher.id, subTeacher.nameBn, reason) : slot
      )
    );
    appendAuditLog({
      who: `${schoolAdminOwnSchool.headTeacher} (School Admin)`,
      role: 'school_admin',
      what: 'বিকল্প শিক্ষক নির্ধারণ (Substitute)',
      targetName: `${targetSlot?.className ?? ''} ${targetSlot?.subjectEn ?? ''} → ${subTeacher.nameBn}`,
      schoolId: schoolAdminOwnSchool.id,
      requestId: slotId,
      oldValue: targetSlot?.teacherName ?? 'Assigned',
      newValue: `${subTeacher.nameBn} (${reason})`,
      reason,
    });
    showToast(
      b(
        `বিকল্প শিক্ষক ${subTeacher.nameBn} নির্ধারিত (${reason})।`,
        `Assigned substitute ${subTeacher.nameEn} (${reason}).`,
        lang
      )
    );
  };

  const handleTeacherCheckInOut = (
    teacherId: string,
    action: 'present' | 'late' | 'leave' | 'checkout'
  ) => {
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setTeacherAttendance((prev) => {
      const existing = prev.find((l) => l.teacherId === teacherId && l.date === '2026-11-18') ??
        prev.find((l) => l.teacherId === teacherId);
      if (action === 'checkout') {
        if (!existing) {
          return [
            {
              id: `ta-${Date.now()}`,
              teacherId,
              date: '2026-11-18',
              status: 'present',
              checkInTime: '08:45 AM',
              checkOutTime: nowTime,
            },
            ...prev,
          ];
        }
        return prev.map((l) => (l.id === existing.id ? { ...l, checkOutTime: nowTime } : l));
      }
      if (existing) {
        return prev.map((l) =>
          l.id === existing.id
            ? { ...l, status: action, checkInTime: action === 'leave' ? undefined : nowTime }
            : l
        );
      }
      return [
        {
          id: `ta-${Date.now()}`,
          teacherId,
          date: '2026-11-18',
          status: action,
          checkInTime: action === 'leave' ? undefined : nowTime,
        },
        ...prev,
      ];
    });
    showToast(
      action === 'checkout'
        ? b(`Check-Out রেকর্ড হয়েছে (${nowTime})।`, `Checked out at ${nowTime}.`, lang)
        : b(`Check-In (${action}) রেকর্ড হয়েছে (${nowTime})।`, `Checked in (${action}) at ${nowTime}.`, lang)
    );
  };

  const handleStartClassSession = (slotId: string, lessonTopic: string) => {
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const targetSlot = routineSlots.find((s) => s.id === slotId);
    if (!targetSlot) return;
    const classStudents = students.filter(
      (s) => s.schoolId === activeTeacherRecord.schoolId && s.className === targetSlot.className
    );
    const scannedIds = kioskScans
      .filter((k) => k.className === targetSlot.className)
      .map((k) => k.studentId);
    const presentIds =
      scannedIds.length > 0
        ? Array.from(new Set(scannedIds))
        : classStudents.map((s) => s.id);
    const updatedSlot = startClassSessionOnSlot(
      targetSlot,
      presentIds,
      Math.max(classStudents.length, presentIds.length),
      nowTime,
      lessonTopic
    );
    setRoutineSlots((prev) => prev.map((s) => (s.id === slotId ? updatedSlot : s)));
    showToast(
      b(
        `${targetSlot.subjectBn} (${targetSlot.className}) লাইভ ক্লাস শুরু হয়েছে! Kiosk উপস্থিতি সিঙ্ক হয়েছে।`,
        `${targetSlot.subjectEn} Live Class started with auto Kiosk attendance.`,
        lang
      )
    );
  };

  const handleUpdateSessionDetails = (
    slotId: string,
    patch: {
      lessonTopic?: string;
      learningObjective?: string;
      classworkSummary?: string;
      teachingActivity?: string;
      teacherPrivateNotes?: string;
      homeworkSummary?: string;
    }
  ) => {
    setRoutineSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const baseSession = s.session ?? {
          sessionId: `SES-${s.id}`,
          slotId: s.id,
          date: '2026-11-18',
          startedAt: s.startedAt ?? new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          autoAttendanceCount: 0,
          autoAttendanceTotal: 0,
          presentStudentIds: [],
          lessonTopic: s.lessonTopic ?? '',
          learningObjective: '',
          classworkSummary: '',
          teachingActivity: '',
          teacherPrivateNotes: '',
          homeworkSummary: s.homeworkText ?? '',
        };
        return {
          ...s,
          lessonTopic: patch.lessonTopic ?? s.lessonTopic,
          homeworkText: patch.homeworkSummary ?? s.homeworkText,
          session: {
            ...baseSession,
            ...patch,
          },
        };
      })
    );
    showToast(b('ক্লাস সেশনের বিবরণ সংরক্ষিত হয়েছে।', 'Live class session notes saved.', lang));
  };

  const handleCreateClasswork = (cw: Omit<ClassworkItem, 'id'>) => {
    setClassworks((prev) => [{ ...cw, id: `cw-${Date.now().toString().slice(-4)}` }, ...prev]);
    showToast(b(`নতুন Classwork "${cw.titleBn}" যোগ হয়েছে।`, `Classwork "${cw.titleEn}" created.`, lang));
  };

  const handleUpdateClassworkStudentStatus = (
    classworkId: string,
    studentId: string,
    status: 'completed' | 'pending' | 'not_submitted',
    feedback?: string
  ) => {
    const stu = students.find((s) => s.id === studentId);
    setClassworks((prev) =>
      prev.map((cw) => {
        if (cw.id !== classworkId) return cw;
        const exists = cw.studentStatuses.some((st) => st.studentId === studentId);
        const nextStatuses = exists
          ? cw.studentStatuses.map((st) =>
              st.studentId === studentId ? { ...st, status, feedback: feedback ?? st.feedback } : st
            )
          : [
              ...cw.studentStatuses,
              {
                studentId,
                studentName: stu?.nameBn ?? 'শিক্ষার্থী',
                roll: stu?.roll ?? 1,
                status,
                feedback,
              },
            ];
        return { ...cw, studentStatuses: nextStatuses };
      })
    );
  };

  const handleAddLessonPlan = (lp: Omit<LessonPlanItem, 'id'>) => {
    setLessonPlans((prev) => [{ ...lp, id: `lp-${Date.now().toString().slice(-4)}` }, ...prev]);
    showToast(b(`পাঠ পরিকল্পনা "${lp.lessonTopic}" সংরক্ষিত হয়েছে।`, `Lesson plan "${lp.lessonTopic}" added.`, lang));
  };

  const handleUpdateGradingRule = (ruleId: string, patch: Partial<GradingRuleItem>) => {
    setGradingRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)));
    showToast(b('গ্রেডিং নীতিমালা আপডেট হয়েছে।', 'Grading rule updated.', lang));
  };

  // === New Academic Governance, Substitute Permission, Cancel/Restore, Today's Lessons & Result Handlers ===

  const handleToggleFavoriteModule = (moduleId: AcademicModuleId) => {
    setFavoriteModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [moduleId, ...prev]
    );
  };

  const handleRecordRecentModule = (moduleId: AcademicModuleId) => {
    setRecentModules((prev) => [moduleId, ...prev.filter((id) => id !== moduleId)].slice(0, 6));
  };

  const handleGrantSubstitutePermission = (
    slotId: string,
    substituteTeacherId: string,
    date: string,
    reason: string,
    durationDays: number
  ) => {
    const slot = routineSlots.find((s) => s.id === slotId);
    const subTeacher = teachers.find((t) => t.id === substituteTeacherId);
    if (!slot || !subTeacher) return;
    try {
      const permission = grantSubstitutePermission(
        slot,
        activeTeacherRecord,
        subTeacher,
        date,
        reason,
        durationDays
      );
      setSubstitutePermissions((prev) => [permission, ...prev]);
      setRoutineSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? {
                ...s,
                status: 'sub_requested',
                substituteReason: reason,
              }
            : s
        )
      );
      setNotifications((prev) => [
        {
          id: `nt-${Date.now().toString().slice(-5)}`,
          roleTarget: 'school_admin',
          schoolId: activeTeacherRecord.schoolId,
          titleBn: `বিকল্প শিক্ষক অনুমতি অনুরোধ: ${slot.className} · ${slot.subjectBn}`,
          titleEn: `Substitute Permission Request: ${slot.className} · ${slot.subjectEn}`,
          messageBn: `${activeTeacherRecord.nameBn} → ${subTeacher.nameBn} (${date}, ${durationDays} দিন)। কারণ: ${reason}`,
          messageEn: `${activeTeacherRecord.nameEn} → ${subTeacher.nameEn} (${date}, ${durationDays} days). Reason: ${reason}`,
          type: 'info',
          time: 'এইমাত্র',
          read: false,
        },
        ...prev,
      ]);
      showToast(
        b(
          `${subTeacher.nameBn}-কে বিকল্প শিক্ষক হিসেবে অনুমতির অনুরোধ পাঠানো হয়েছে।`,
          `Substitute permission request submitted for ${subTeacher.nameEn}.`,
          lang
        )
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to grant substitute permission');
    }
  };

  const handleReviewSubstitutePermission = (permissionId: string, action: 'approve' | 'revoke') => {
    const perm = substitutePermissions.find((p) => p.id === permissionId);
    if (!perm) return;
    const targetSlot = routineSlots.find((s) => s.id === perm.slotId);
    if (!targetSlot) return;
    const actorName = `${schoolAdminOwnSchool.headTeacher} (School Admin)`;
    const { permission: updatedPerm, slot: updatedSlot } = reviewSubstitutePermission(
      perm,
      targetSlot,
      action,
      actorName
    );
    setSubstitutePermissions((prev) => prev.map((p) => (p.id === permissionId ? updatedPerm : p)));
    setRoutineSlots((prev) => prev.map((s) => (s.id === updatedSlot.id ? updatedSlot : s)));
    appendAuditLog({
      who: actorName,
      role: 'school_admin',
      what: action === 'approve' ? 'বিকল্প শিক্ষক অনুমতি অনুমোদন' : 'বিকল্প শিক্ষক অনুমতি বাতিল (Revoke)',
      targetName: `${perm.className} ${perm.subjectBn} (${perm.substituteTeacherName})`,
      schoolId: perm.schoolId,
      requestId: permissionId,
      oldValue: perm.status,
      newValue: updatedPerm.status,
      reason: perm.reason,
    });
    setNotifications((prev) => [
      {
        id: `nt-${Date.now().toString().slice(-5)}`,
        roleTarget: 'teacher',
        schoolId: perm.schoolId,
        teacherId: perm.ownerTeacherId,
        titleBn:
          action === 'approve'
            ? `বিকল্প অনুমতি অনুমোদিত: ${perm.className} ${perm.subjectBn}`
            : `বিকল্প অনুমতি বাতিল: ${perm.className} ${perm.subjectBn}`,
        titleEn:
          action === 'approve'
            ? `Substitute Approved: ${perm.className} ${perm.subjectEn}`
            : `Substitute Revoked: ${perm.className} ${perm.subjectEn}`,
        messageBn: `${perm.substituteTeacherName} (${perm.date})`,
        messageEn: `${perm.substituteTeacherName} (${perm.date})`,
        type: action === 'approve' ? 'success' : 'warning',
        time: 'এইমাত্র',
        read: false,
      },
      ...prev,
    ]);
    showToast(
      action === 'approve'
        ? b('বিকল্প শিক্ষকের অনুমতি অনুমোদিত হয়েছে।', 'Substitute permission approved.', lang)
        : b('বিকল্প শিক্ষকের অনুমতি বাতিল (Revoke) করা হয়েছে।', 'Substitute permission revoked.', lang)
    );
  };

  const handleCancelClassSlot = (
    slotId: string,
    reason: AcademicCancelClassReason | string,
    remarks?: string,
    isSchoolAdmin = false
  ) => {
    const slot = routineSlots.find((s) => s.id === slotId);
    if (!slot) return;
    try {
      const updated = cancelClassSlotWithReason(
        slot,
        isSchoolAdmin ? null : activeTeacherRecord.id,
        isSchoolAdmin,
        reason,
        remarks
      );
      setRoutineSlots((prev) => prev.map((s) => (s.id === slotId ? updated : s)));
      const actorName = isSchoolAdmin
        ? `${schoolAdminOwnSchool.headTeacher} (School Admin)`
        : activeTeacherRecord.nameBn;
      appendAuditLog({
        who: actorName,
        role: isSchoolAdmin ? 'school_admin' : 'teacher',
        what: 'ক্লাস বাতিল (Class Cancelled)',
        targetName: `${slot.className} · ${slot.subjectBn} (${slot.timeRange})`,
        schoolId: slot.schoolId ?? schoolAdminOwnSchool.id,
        requestId: slotId,
        oldValue: slot.status,
        newValue: 'cancelled',
        reason: remarks ? `${reason}: ${remarks}` : String(reason),
      });
      setNotifications((prev) => [
        {
          id: `nt-${Date.now().toString().slice(-5)}`,
          roleTarget: 'all',
          schoolId: slot.schoolId ?? schoolAdminOwnSchool.id,
          titleBn: `ক্লাস স্থগিত/বাতিল: ${slot.className} · ${slot.subjectBn}`,
          titleEn: `Class Cancelled: ${slot.className} · ${slot.subjectEn}`,
          messageBn: `কারণ: ${reason}${remarks ? ` — ${remarks}` : ''}`,
          messageEn: `Reason: ${reason}${remarks ? ` — ${remarks}` : ''}`,
          type: 'warning',
          time: 'এইমাত্র',
          read: false,
        },
        ...prev,
      ]);
      showToast(
        b(
          `${slot.className} · ${slot.subjectBn} ক্লাস বাতিল করা হয়েছে (${reason})।`,
          `Class cancelled (${reason}).`,
          lang
        )
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to cancel class');
    }
  };

  const handleRestoreClassSlot = (slotId: string) => {
    const slot = routineSlots.find((s) => s.id === slotId);
    if (!slot) return;
    const restored = restoreCancelledClassSlot(slot, true);
    setRoutineSlots((prev) => prev.map((s) => (s.id === slotId ? restored : s)));
    appendAuditLog({
      who: `${schoolAdminOwnSchool.headTeacher} (School Admin)`,
      role: 'school_admin',
      what: 'বাতিল ক্লাস পুনরুদ্ধার (Class Restored)',
      targetName: `${slot.className} · ${slot.subjectBn}`,
      schoolId: slot.schoolId ?? schoolAdminOwnSchool.id,
      requestId: slotId,
      oldValue: 'cancelled',
      newValue: 'pending',
    });
    showToast(b('বাতিল ক্লাস পুনরুদ্ধার (Restore) করা হয়েছে।', 'Cancelled class restored.', lang));
  };

  const handlePublishDailyLesson = (lesson: Omit<DailyLessonHomeworkItem, 'id' | 'studentStates'>) => {
    const targetStudents = students.filter(
      (s) => s.schoolId === lesson.schoolId && s.className === lesson.className
    );
    const studentStates: Record<string, DailyLessonStatus> = {};
    targetStudents.forEach((st) => {
      studentStates[st.id] = 'pending';
    });
    const newItem: DailyLessonHomeworkItem = {
      ...lesson,
      id: `dlh-${Date.now().toString().slice(-5)}`,
      studentStates,
    };
    setDailyLessons((prev) => [newItem, ...prev]);
    setNotifications((prev) => [
      {
        id: `nt-${Date.now().toString().slice(-5)}`,
        roleTarget: 'all',
        schoolId: lesson.schoolId,
        titleBn: `আজকের পড়া প্রকাশিত: ${lesson.className} · ${lesson.subjectBn}`,
        titleEn: `Today's Lesson Published: ${lesson.className} · ${lesson.subjectEn}`,
        messageBn: `${lesson.lessonTitleBn} — Homework: ${lesson.homeworkTextBn}`,
        messageEn: `${lesson.lessonTitleEn} — Homework: ${lesson.homeworkTextEn}`,
        type: 'info',
        time: 'এইমাত্র',
        read: false,
      },
      ...prev,
    ]);
    showToast(
      b(
        `আজকের পড়া ও Homework (${lesson.className} · ${lesson.subjectBn}) প্রকাশিত হয়েছে।`,
        `Today's lesson & homework published.`,
        lang
      )
    );
  };

  const handleToggleStudentLessonStatus = (
    lessonId: string,
    studentId: string,
    status: DailyLessonStatus
  ) => {
    setDailyLessons((prev) =>
      prev.map((item) =>
        item.id === lessonId
          ? {
              ...item,
              studentStates: {
                ...item.studentStates,
                [studentId]: status,
              },
            }
          : item
      )
    );
    showToast(
      status === 'completed'
        ? b('আজকের পড়া Completed হিসেবে চিহ্নিত হয়েছে।', 'Marked as completed.', lang)
        : status === 'submitted'
          ? b('Homework জমা সম্পন্ন হয়েছে।', 'Homework marked as submitted.', lang)
          : b('অবস্থা হালনাগাদ হয়েছে।', 'Lesson status updated.', lang)
    );
  };

  const handleSubmitSubjectMarks = (
    examId: string,
    className: string,
    subjectBn: string,
    subjectEn: string
  ) => {
    const exam = exams.find((e) => e.id === examId);
    if (!exam) return;
    const timestamp = 'এইমাত্র (' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ')';
    try {
      const { submissions: nextSubmissions, auditEntry } = submitSubjectResultMarks(
        subjectSubmissions,
        activeTeacherRecord,
        teacherAssignments,
        exam,
        className,
        subjectBn,
        subjectEn,
        timestamp
      );
      setSubjectSubmissions(nextSubmissions);
      setResultAuditLogs((prev) => [auditEntry, ...prev]);
      setNotifications((prev) => [
        {
          id: `nt-${Date.now().toString().slice(-5)}`,
          roleTarget: 'school_admin',
          schoolId: activeTeacherRecord.schoolId,
          titleBn: `বিষয়ভিত্তিক নম্বর জমা: ${className} · ${subjectBn}`,
          titleEn: `Subject Marks Submitted: ${className} · ${subjectEn}`,
          messageBn: `${activeTeacherRecord.nameBn} চূড়ান্ত নম্বর জমা দিয়েছেন।`,
          messageEn: `${activeTeacherRecord.nameEn} submitted final subject marks.`,
          type: 'success',
          time: 'এইমাত্র',
          read: false,
        },
        ...prev,
      ]);
      showToast(b(`${className} · ${subjectBn} নম্বর সফলভাবে জমা দেওয়া হয়েছে।`, `Marks submitted for ${subjectEn}.`, lang));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to submit marks');
    }
  };

  const handleRequestResultCorrection = (
    examId: string,
    className: string,
    subjectEn: string,
    note: string
  ) => {
    const timestamp = 'এইমাত্র';
    setSubjectSubmissions((prev) =>
      prev.map((s) =>
        s.examId === examId &&
        s.className === className &&
        s.subjectEn.toLowerCase() === subjectEn.toLowerCase()
          ? { ...s, status: 'correction_requested', correctionNote: note }
          : s
      )
    );
    const auditEntry: ResultAuditEntry = {
      id: `raud-${Date.now().toString().slice(-5)}`,
      schoolId: activeTeacherRecord.schoolId,
      examId,
      className,
      subjectEn,
      actorName: activeTeacherRecord.nameBn,
      actorRole: 'teacher',
      action: 'correction_requested',
      timestamp,
      note,
    };
    setResultAuditLogs((prev) => [auditEntry, ...prev]);
    setNotifications((prev) => [
      {
        id: `nt-${Date.now().toString().slice(-5)}`,
        roleTarget: 'school_admin',
        schoolId: activeTeacherRecord.schoolId,
        titleBn: `নম্বর সংশোধন অনুরোধ: ${className} · ${subjectEn}`,
        titleEn: `Marks Correction Request: ${className} · ${subjectEn}`,
        messageBn: `${activeTeacherRecord.nameBn}: ${note}`,
        messageEn: `${activeTeacherRecord.nameEn}: ${note}`,
        type: 'warning',
        time: 'এইমাত্র',
        read: false,
      },
      ...prev,
    ]);
    showToast(b('নম্বর সংশোধনের অনুরোধ প্রধান শিক্ষকের কাছে পাঠানো হয়েছে।', 'Correction request sent to School Admin.', lang));
  };

  const handleSendDelayedTeacherAlert = (
    teacherId: string,
    teacherName: string,
    subjectBn: string,
    channel: 'notice' | 'message'
  ) => {
    setNotifications((prev) => [
      {
        id: `nt-${Date.now().toString().slice(-5)}`,
        roleTarget: 'teacher',
        schoolId: schoolAdminOwnSchool.id,
        teacherId,
        titleBn:
          channel === 'notice'
            ? `জরুরি নোটিশ: ${subjectBn} পরীক্ষার নম্বর জমা দিন`
            : `রিমাইন্ডার বার্তা: ${subjectBn} নম্বর পেন্ডিং`,
        titleEn: `Reminder: Submit ${subjectBn} Marks`,
        messageBn: `${schoolAdminOwnSchool.headTeacher} (${schoolAdminOwnSchool.nameBn}) দ্রুত নম্বর জমা দেওয়ার নির্দেশ দিয়েছেন।`,
        messageEn: `${schoolAdminOwnSchool.headTeacher} requested urgent marks submission for ${subjectBn}.`,
        type: 'alert',
        time: 'এইমাত্র',
        read: false,
      },
      ...prev,
    ]);
    showToast(
      b(
        `${teacherName}-কে ${channel === 'notice' ? 'নোটিশ' : 'বার্তা'} পাঠানো হয়েছে।`,
        `Alert sent to ${teacherName}.`,
        lang
      )
    );
  };

  const handleTogglePublishResult = (examId: string, publish: boolean) => {
    const exam = exams.find((e) => e.id === examId);
    if (!exam) return;
    if (publish) {
      const eligibility = canSchoolPublishResult(schoolAdminOwnSchool, exam, subjectSubmissions);
      if (!eligibility.allowed) {
        showToast(b(eligibility.reasonBn, eligibility.reasonEn, lang));
        return;
      }
    }
    const nextStatus: ExamRecord['status'] = publish ? 'published' : 'held';
    handleToggleExamStatus(
      examId,
      nextStatus,
      publish ? 'School Admin Result Publication Governance' : 'School Admin Hold Result'
    );
    const auditEntry: ResultAuditEntry = {
      id: `raud-${Date.now().toString().slice(-5)}`,
      schoolId: schoolAdminOwnSchool.id,
      examId,
      className: exam.className,
      subjectEn: 'All Subjects',
      actorName: schoolAdminOwnSchool.headTeacher,
      actorRole: 'school_admin',
      action: publish ? 'published' : 'unpublished',
      timestamp: 'এইমাত্র',
      note: publish ? 'ফলাফল আনুষ্ঠানিকভাবে প্রকাশিত।' : 'ফলাফল সাময়িকভাবে স্থগিত।',
    };
    setResultAuditLogs((prev) => [auditEntry, ...prev]);
  };

  const handleToggleSchoolPublishPermission = (schoolId: string, allow: boolean) => {
    setSchools((prev) =>
      prev.map((s) => (s.id === schoolId ? { ...s, resultPublishAllowed: allow } : s))
    );
    const targetSchool = schools.find((s) => s.id === schoolId);
    if (!allow) {
      setExams((prev) =>
        prev.map((e) => (e.schoolId === schoolId && e.status === 'published' ? { ...e, status: 'held' } : e))
      );
    }
    appendAuditLog({
      who: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
      role: 'central_admin',
      what: allow ? 'ফলাফল প্রকাশ অনুমতি সক্রিয় (Publish Unlocked)' : 'ফলাফল প্রকাশ লক (Publish Locked)',
      targetName: targetSchool?.nameBn ?? schoolId,
      schoolId,
      requestId: schoolId,
      oldValue: allow ? 'Locked' : 'Allowed',
      newValue: allow ? 'Allowed' : 'Locked',
    });
    showToast(
      allow
        ? b(`${targetSchool?.nameBn ?? schoolId}-এর ফলাফল প্রকাশ অনুমোদিত হয়েছে।`, 'Result publishing unlocked for school.', lang)
        : b(`${targetSchool?.nameBn ?? schoolId}-এর ফলাফল প্রকাশ লক করা হয়েছে।`, 'Result publishing locked for school.', lang)
    );
  };

  const handlePublishAllEligibleResults = () => {
    const { updatedExams, publishedSchoolIds, skippedSchoolIds } = publishAllEligibleSchoolsResults(
      schools,
      exams,
      subjectSubmissions
    );
    setExams(updatedExams);
    appendAuditLog({
      who: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
      role: 'central_admin',
      what: 'Batch Publish Eligible School Results',
      targetName: `${publishedSchoolIds.length} Schools Published, ${skippedSchoolIds.length} Skipped`,
      requestId: 'BATCH-PUB',
      oldValue: 'Mixed',
      newValue: `${publishedSchoolIds.length} Published`,
    });
    showToast(
      b(
        `${publishedSchoolIds.length}টি যোগ্য স্কুলের ফলাফল প্রকাশিত হয়েছে (${skippedSchoolIds.length}টি স্কুলে নম্বর/অনুমতি পেন্ডিং)।`,
        `Published ${publishedSchoolIds.length} eligible schools (${skippedSchoolIds.length} skipped).`,
        lang
      )
    );
  };

  const handleCollectFee = (feeId: string, method: FeeRecord['method'], ref: string) => {
    setFees((prev) =>
      prev.map((f) =>
        f.id === feeId
          ? {
              ...f,
              paidAmount: f.totalAmount,
              method,
              transactionRef: ref,
              paidDate: '১৭ নভে ২০২৬',
              receiptNo: f.receiptNo.replace('DUE', 'RCP'),
            }
          : f
      )
    );
    showToast(b(`ফি আদায় সম্পন্ন (${method} · Ref: ${ref})`, `Fee collected via ${method}`, lang));
  };

  // Guardian Handlers
  const handleLinkChildByCode = (schoolCode: string, studentIdOrGlc: string): string | null => {
    const found = students.find(
      (s) =>
        s.schoolId.toUpperCase() === schoolCode.trim().toUpperCase() &&
        (s.permanentId.toUpperCase() === studentIdOrGlc.trim().toUpperCase() ||
          s.guardianLinkCode.toUpperCase() === studentIdOrGlc.trim().toUpperCase())
    );
    if (!found) {
      return b('সঠিক স্কুল কোড ও Student ID / GLC পাওয়া যায়নি।', 'No matching student found for that School Code and ID/GLC.', lang);
    }
    if (!linkedChildIds.includes(found.id)) {
      setLinkedChildIds((prev) => [...prev, found.id]);
      setSelectedChildId(found.id);
    }
    return b(`${found.nameBn} সফলভাবে সংযুক্ত হয়েছেন!`, `${found.nameEn} linked to your account!`, lang);
  };

  // Notification Center Handlers
  const handleMarkNotificationRead = (id: string, read: boolean) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read } : n)));
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleTogglePinNotification = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n)));
  };

  const handleNavigateFromNotification = (item: NotificationItem) => {
    handleMarkNotificationRead(item.id, true);
    if (item.targetTab) {
      setActiveTab(item.targetTab);
      setCentralNavVersion((v) => v + 1);
    }
    if (item.targetAcademicModule && (role === 'school_admin' || role === 'central_admin')) {
      setExternalAcademicModule(item.targetAcademicModule);
    }
  };

  const handleResetLastVisitIso = (iso: string) => {
    setLastLoginIso(iso);
    showToast(b('সর্বশেষ ভিজিট সময়সূচি আপডেট হয়েছে।', 'Last visit checkpoint updated.', lang));
  };

  // Notice & Communication Handlers
  const dispatchNotificationsForNotice = (notice: NoticeItem) => {
    if (notice.status !== 'Published' && notice.status !== 'Edited') return;
    const rolesToNotify: Role[] =
      notice.audienceGroup === 'teachers'
        ? ['teacher']
        : notice.audienceGroup === 'students'
          ? ['student', 'guardian']
          : notice.audienceGroup === 'guardians'
            ? ['guardian']
            : notice.audienceGroup === 'class_group'
              ? ['teacher', 'student', 'guardian']
              : ['school_admin', 'teacher', 'student', 'guardian'];

    const nowIso = '2026-11-19T12:15:00';
    const created: NotificationItem[] = rolesToNotify.map((r, idx) => ({
      id: `nt-not-${Date.now()}-${idx}`,
      roleTarget: r,
      schoolId: notice.schoolId,
      category: notice.isEmergency ? 'emergency' : 'notice',
      priority: notice.isEmergency ? 'emergency' : 'important',
      type: notice.isEmergency ? 'alert' : 'info',
      time: 'এইমাত্র',
      createdAtIso: nowIso,
      dateLabel: '2026-11-19',
      read: false,
      targetTab: 'notices',
      titleBn: notice.isEmergency ? `🚨 জরুরি নোটিশ: ${notice.titleBn}` : `📢 নতুন নোটিশ: ${notice.titleBn}`,
      titleEn: notice.isEmergency ? `Emergency Notice: ${notice.titleEn}` : `New Notice: ${notice.titleEn}`,
      messageBn: notice.bodyBn.slice(0, 120),
      messageEn: notice.bodyEn.slice(0, 120),
    }));
    setNotifications((prev) => [...created, ...prev]);
  };

  const handleCreateNoticeStructured = (payload: CreateNoticePayload) => {
    const created = createNoticeRecord(payload);
    setNotices((prev) => [created, ...prev]);
    if (auth.currentUser?.emailVerified) {
      void syncNoticeToFirestore(created);
    }
    dispatchNotificationsForNotice(created);
    appendAuditLog({
      who: payload.author,
      role: payload.authorRole,
      what: `নোটিশ ${created.status}: ${created.titleBn}`,
      targetName: created.audienceGroup ?? 'all',
      schoolId: created.schoolId,
      requestId: created.id,
      oldValue: 'New',
      newValue: created.status ?? 'Published',
    });
    showToast(
      created.status === 'Scheduled'
        ? b('নোটিশ নির্ধারিত সময়ের জন্য শিডিউল হয়েছে।', 'Notice scheduled.', lang)
        : created.status === 'Draft'
          ? b('নোটিশ খসড়া হিসেবে সংরক্ষিত হয়েছে।', 'Notice saved as draft.', lang)
          : b('নোটিশ সফলভাবে প্রকাশিত ও নোটিফিকেশন পাঠানো হয়েছে।', 'Notice published & notifications dispatched.', lang)
    );
  };

  const handleEditNotice = (
    noticeId: string,
    patch: {
      titleBn: string;
      titleEn: string;
      bodyBn: string;
      bodyEn: string;
      validityLabel?: string;
      isEmergency?: boolean;
      allowImageDownload?: boolean;
    }
  ) => {
    const actorName =
      role === 'central_admin'
        ? CENTRAL_ADMIN_CREDENTIALS.displayNameBn
        : role === 'school_admin'
          ? schoolAdminOwnSchool.headTeacher
          : activeTeacherRecord.nameBn;
    setNotices((prev) =>
      prev.map((n) => (n.id === noticeId ? editNoticeRecord(n, patch, actorName) : n))
    );
    showToast(b('নোটিশ সংশোধিত (Edited) এবং ইতিহাস সংরক্ষিত হয়েছে।', 'Notice updated (Edited).', lang));
  };

  const handleUpdateNoticeImages = (
    noticeId: string,
    nextImages: NoticeImageAttachment[],
    actionType: 'Image Added' | 'Image Removed' | 'Image Replaced',
    summary: string
  ) => {
    const actorName =
      role === 'central_admin'
        ? CENTRAL_ADMIN_CREDENTIALS.displayNameBn
        : role === 'school_admin'
          ? schoolAdminOwnSchool.headTeacher
          : activeTeacherRecord.nameBn;
    setNotices((prev) =>
      prev.map((n) =>
        n.id === noticeId
          ? updateNoticeImagesWithHistory(n, nextImages, actionType, actorName, summary)
          : n
      )
    );
    showToast(b(`নোটিশের ছবি আপডেট হয়েছে (${actionType})।`, `Notice images updated (${actionType}).`, lang));
  };

  const handleTransitionNoticeStatus = (noticeId: string, nextStatus: NoticeLifecycleStatus) => {
    const actorName =
      role === 'central_admin'
        ? CENTRAL_ADMIN_CREDENTIALS.displayNameBn
        : role === 'school_admin'
          ? schoolAdminOwnSchool.headTeacher
          : activeTeacherRecord.nameBn;
    const existing = notices.find((n) => n.id === noticeId);
    setNotices((prev) =>
      prev.map((n) => (n.id === noticeId ? transitionNoticeStatus(n, nextStatus, actorName) : n))
    );
    if (existing && nextStatus === 'Published') {
      dispatchNotificationsForNotice({ ...existing, status: 'Published' });
    }
    showToast(b(`নোটিশের অবস্থা "${nextStatus}"-এ পরিবর্তিত হয়েছে।`, `Notice status updated to ${nextStatus}.`, lang));
  };

  const handleMarkNoticeRead = (noticeId: string, userId: string) => {
    setNotices((prev) => prev.map((n) => (n.id === noticeId ? markNoticeReadByUser(n, userId) : n)));
  };

  // Automatic ID Card Attendance Scanner Handlers
  const handleRecordAutoScan = (params: {
    rawCode: string;
    schoolId: string;
    isLate: boolean;
    source: 'auto_camera' | 'manual_teacher' | 'kiosk';
    dateIso: string;
    allowedClasses?: string[];
  }) => {
    const guard = isCentralAdminActionBlocked(role, 'take_attendance');
    if (guard.blocked) {
      showToast(b(guard.reasonBn, guard.reasonEn, lang));
      return {
        status: 'not_found' as const,
        messageBn: guard.reasonBn,
        messageEn: guard.reasonEn,
      };
    }
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const res = processAutoIdCardScan({
      rawCode: params.rawCode,
      schoolId: params.schoolId,
      students,
      existingScans: kioskScans,
      dateIso: params.dateIso,
      scanTime: nowTime,
      isLate: params.isLate,
      source: params.source,
      allowedClasses: params.allowedClasses,
    });
    if (res.status === 'recorded' && res.scanEvent && res.historyEntry && res.guardianNotification) {
      setKioskScans((prev) => [res.scanEvent!, ...prev]);
      setAttendanceHistory((prev) => [res.historyEntry!, ...prev]);
      if (auth.currentUser?.emailVerified) {
        void syncAttendanceToFirestore(res.historyEntry);
      }
      setNotifications((prev) => [
        {
          ...res.guardianNotification!,
          id: `nt-att-${Date.now()}-${Math.floor(Math.random() * 90 + 10)}`,
          time: 'এইমাত্র',
          read: false,
        },
        ...prev,
      ]);
      showToast(b(res.messageBn, res.messageEn, lang));
    } else if (
      res.status === 'duplicate' ||
      res.status === 'wrong_school' ||
      res.status === 'unauthorized_class'
    ) {
      showToast(b(res.messageBn, res.messageEn, lang));
    }
    return {
      status: res.status,
      messageBn: res.messageBn,
      messageEn: res.messageEn,
      student: res.student,
      firstScanTime: res.firstScanTime,
      scanEvent: res.scanEvent,
    };
  };

  const handleManualAttendanceMark = (
    student: StudentRecord,
    status: 'present' | 'late' | 'absent',
    dateIso: string
  ) => {
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const newEntry: StudentAttendanceHistoryEntry = {
      id: `ah-man-${Date.now()}-${student.id}`,
      studentId: student.id,
      schoolId: student.schoolId,
      dateIso,
      status,
      scanTime: status === 'absent' ? undefined : nowTime,
      source: 'manual_teacher',
      guardianNotified: true,
    };
    setAttendanceHistory((prev) => [
      newEntry,
      ...prev.filter((h) => !(h.studentId === student.id && h.dateIso === dateIso)),
    ]);
    if (auth.currentUser?.emailVerified) {
      void syncAttendanceToFirestore(newEntry);
    }

    if (status === 'present' || status === 'late') {
      const alreadyScanned = kioskScans.some(
        (k) => k.studentId === student.id && (!k.dateIso || k.dateIso === dateIso)
      );
      if (!alreadyScanned) {
        setKioskScans((prev) => [
          {
            id: `k-man-${Date.now()}`,
            studentId: student.id,
            studentName: student.nameBn,
            className: student.className,
            roll: student.roll,
            scanTime: nowTime,
            type: 'entry',
            attendanceState: status,
            schoolId: student.schoolId,
            dateIso,
            source: 'manual_teacher',
            guardianNotified: true,
          },
          ...prev,
        ]);
      }
      setNotifications((prev) => [
        {
          id: `nt-man-${Date.now()}-${student.id}`,
          roleTarget: 'guardian',
          schoolId: student.schoolId,
          studentId: student.id,
          category: 'account',
          priority: status === 'late' ? 'important' : 'normal',
          type: status === 'late' ? 'warning' : 'success',
          time: 'এইমাত্র',
          createdAtIso: `${dateIso}T09:30:00`,
          dateLabel: dateIso,
          read: false,
          targetTab: 'attendance',
          titleBn:
            status === 'late'
              ? `বিলম্বে উপস্থিতি: ${student.nameBn}`
              : `নিরাপদ উপস্থিতি: ${student.nameBn} বিদ্যালয়ে পৌঁছেছে`,
          titleEn:
            status === 'late'
              ? `Late Arrival: ${student.nameEn}`
              : `Arrival Confirmed: ${student.nameEn}`,
          messageBn: `শিক্ষক কর্তৃক ${nowTime}-এ উপস্থিতি (${status}) নিশ্চিত হয়েছে।`,
          messageEn: `Attendance marked (${status}) at ${nowTime}.`,
        },
        ...prev,
      ]);
    } else {
      setKioskScans((prev) =>
        prev.filter((k) => !(k.studentId === student.id && (!k.dateIso || k.dateIso === dateIso)))
      );
      setNotifications((prev) => [
        {
          id: `nt-abs-${Date.now()}-${student.id}`,
          roleTarget: 'guardian',
          schoolId: student.schoolId,
          studentId: student.id,
          category: 'account',
          priority: 'important',
          type: 'warning',
          time: 'এইমাত্র',
          createdAtIso: `${dateIso}T10:15:00`,
          dateLabel: dateIso,
          read: false,
          targetTab: 'attendance',
          titleBn: `অনুপস্থিতি বার্তা: ${student.nameBn} আজ বিদ্যালয়ে অনুপস্থিত`,
          titleEn: `Absence Alert: ${student.nameEn} Absent Today`,
          messageBn: `${student.nameBn} (${student.className}) আজ ${dateIso} তারিখে অনুপস্থিত রয়েছে।`,
          messageEn: `${student.nameEn} was marked absent on ${dateIso}.`,
        },
        ...prev,
      ]);
    }
    showToast(b(`${student.nameBn}: ${status} রেকর্ড হয়েছে।`, `${student.nameEn} marked ${status}.`, lang));
  };

  const handleNotifyAllAbsentGuardians = (
    absentStudents: StudentRecord[],
    schoolId: string,
    dateIso: string
  ) => {
    if (absentStudents.length === 0) return;
    const alerts: NotificationItem[] = absentStudents.map((stu, idx) => ({
      id: `nt-abs-bulk-${Date.now()}-${idx}`,
      roleTarget: 'guardian',
      schoolId,
      studentId: stu.id,
      category: 'account',
      priority: 'important',
      type: 'warning',
      time: 'এইমাত্র',
      createdAtIso: `${dateIso}T10:30:00`,
      dateLabel: dateIso,
      read: false,
      targetTab: 'attendance',
      targetStudentId: stu.id,
      titleBn: `অনুপস্থিতি সতর্কতা: ${stu.nameBn} আজ উপস্থিত হয়নি`,
      titleEn: `Absence Alert: ${stu.nameEn} Not Checked In`,
      messageBn: `ID স্ক্যান ও রোল কল শেষে ${stu.nameBn} (${stu.className}, Roll ${stu.roll}) অনুপস্থিত রয়েছে। অনুগ্রহ করে কারণ জানান।`,
      messageEn: `${stu.nameEn} (${stu.className}) did not check in on ${dateIso}.`,
    }));
    const absEntries: StudentAttendanceHistoryEntry[] = absentStudents.map((stu, idx) => ({
      id: `ah-abs-${Date.now()}-${idx}`,
      studentId: stu.id,
      schoolId,
      dateIso,
      status: 'absent',
      source: 'manual_teacher',
      guardianNotified: true,
    }));
    setAttendanceHistory((prev) => [...absEntries, ...prev]);
    setNotifications((prev) => [...alerts, ...prev]);
    appendAuditLog({
      who: role === 'teacher' ? activeTeacherRecord.nameBn : schoolAdminOwnSchool.headTeacher,
      role,
      what: 'অনুপস্থিত শিক্ষার্থীদের অভিভাবকদের সতর্কবার্তা প্রেরণ',
      targetName: `${absentStudents.length} জন অনুপস্থিত শিক্ষার্থী`,
      schoolId,
      requestId: `ATT-${dateIso}`,
      oldValue: 'Pending',
      newValue: `${absentStudents.length} Notified`,
    });
    showToast(
      b(
        `${absentStudents.length} জন অনুপস্থিত শিক্ষার্থীর অভিভাবকদের কাছে তাৎক্ষণিক বার্তা পাঠানো হয়েছে।`,
        `Notified ${absentStudents.length} absent student guardian(s).`,
        lang
      )
    );
  };

  // Examination Governance Handlers
  const handleToggleCentralTermPublish = (examId: string, publish: boolean) => {
    const { updatedExams, targetExam, notificationsToSend } = setCentralTermExamPublished(
      exams,
      examId,
      publish
    );
    setExams(updatedExams);
    if (notificationsToSend.length > 0) {
      setNotifications((prev) => [
        ...notificationsToSend.map((n, idx) => ({
          ...n,
          id: `nt-exm-pub-${Date.now()}-${idx}`,
          time: 'এইমাত্র',
          read: false,
        })),
        ...prev,
      ]);
    }
    if (targetExam) {
      appendAuditLog({
        who: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
        role: 'central_admin',
        what: publish ? 'কেন্দ্রীয় সাময়িক পরীক্ষা ও ফলাফল প্রকাশ' : 'কেন্দ্রীয় সাময়িক পরীক্ষা গোপন/স্থগিত',
        targetName: targetExam.titleBn,
        schoolId: targetExam.schoolId,
        requestId: targetExam.id,
        oldValue: publish ? 'Hidden (Locked)' : 'Published',
        newValue: publish ? 'Published' : 'Hidden (Locked)',
      });
    }
    showToast(
      publish
        ? b('সাময়িক পরীক্ষা প্রকাশিত হয়েছে এবং সকল রোলে নোটিফিকেশন পাঠানো হয়েছে।', 'Term exam published & notifications sent.', lang)
        : b('সাময়িক পরীক্ষা কেন্দ্রীয়ভাবে লক ও অদৃশ্য করা হয়েছে।', 'Term exam locked & hidden from non-central portals.', lang)
    );
  };

  const handleCreateLocalExam = (payload: CreateLocalExamPayload) => {
    const created = createExamWithGovernance(payload);
    setExams((prev) => [created, ...prev]);
    if (auth.currentUser?.emailVerified) {
      void syncExamToFirestore(created);
    }
    const localNotifs: NotificationItem[] = (['school_admin', 'student', 'guardian'] as Role[]).map(
      (r, idx) => ({
        id: `nt-local-exm-${Date.now()}-${idx}`,
        roleTarget: r,
        schoolId: created.schoolId,
        category: 'exam_result',
        priority: 'normal',
        type: 'info',
        time: 'এইমাত্র',
        createdAtIso: '2026-11-19T12:20:00',
        dateLabel: '2026-11-19',
        read: false,
        targetTab: r === 'school_admin' ? 'exams' : r === 'guardian' ? 'exams' : 'assessment',
        titleBn: `নতুন পরীক্ষা ঘোষিত: ${created.titleBn}`,
        titleEn: `New Test Scheduled: ${created.titleEn}`,
        messageBn: `${created.className} · ${created.subjectBn} (${created.fullMarks} নম্বর) — তারিখ: ${created.dateRange}`,
        messageEn: `${created.className} · ${created.subjectEn} (${created.fullMarks} marks) — ${created.dateRange}`,
      })
    );
    setNotifications((prev) => [...localNotifs, ...prev]);
    appendAuditLog({
      who: payload.createdByName,
      role: payload.createdByRole,
      what: `স্থানীয় পরীক্ষা তৈরি (${created.examCategory})`,
      targetName: `${created.titleBn} (${created.className})`,
      schoolId: created.schoolId,
      requestId: created.id,
      oldValue: 'None',
      newValue: `${created.entries.length} Students`,
    });
    showToast(b(`"${created.titleBn}" সফলভাবে তৈরি হয়েছে।`, `"${created.titleEn}" created.`, lang));
  };

  const handleUpdateMasterRoutines = (nextRoutines: MasterRoutineRecord[], toastMessage?: string) => {
    const newlyActivated = nextRoutines.filter((nr) => {
      const prev = masterRoutines.find((pr) => pr.id === nr.id);
      const isNowLive = nr.status === 'Active' || nr.status === 'Published';
      const wasLive = prev && (prev.status === 'Active' || prev.status === 'Published');
      return isNowLive && !wasLive;
    });
    setMasterRoutines(nextRoutines);
    if (newlyActivated.length > 0) {
      const pubNotifs: NotificationItem[] = newlyActivated.flatMap((rt, rIdx) =>
        (['teacher', 'student', 'guardian'] as Role[]).map((targetRole, idx) => ({
          id: `nt-mrout-${Date.now()}-${rIdx}-${idx}`,
          roleTarget: targetRole,
          schoolId: rt.schoolId,
          category: 'academic',
          priority: 'normal',
          type: 'success',
          time: 'এইমাত্র',
          createdAtIso: new Date().toISOString().slice(0, 19),
          dateLabel: new Date().toISOString().slice(0, 10),
          read: false,
          targetTab: targetRole === 'teacher' ? 'my_routine' : 'routine',
          titleBn: `ক্লাস রুটিন প্রকাশিত: ${rt.titleBn}`,
          titleEn: `Class Routine Published: ${rt.titleEn}`,
          messageBn: `${rt.className} (${rt.section}) · ${rt.routineType} রুটিন (v${rt.version}) এখন সকল পোর্টালে দৃশ্যমান।`,
          messageEn: `${rt.className} (${rt.section}) · ${rt.routineType} routine (v${rt.version}) is now live.`,
        }))
      );
      setNotifications((prev) => [...pubNotifs, ...prev]);
      newlyActivated.forEach((rt) => {
        appendAuditLog({
          who: `${schoolAdminOwnSchool.headTeacher} (School Admin)`,
          role: 'school_admin',
          what: `রুটিন প্রকাশ / সক্রিয় (${rt.routineType} v${rt.version})`,
          targetName: `${rt.titleBn} · ${rt.className} (${rt.section})`,
          schoolId: rt.schoolId,
          requestId: rt.id,
          oldValue: 'Draft / Inactive',
          newValue: rt.status,
        });
      });
    }
    if (toastMessage) {
      showToast(toastMessage);
    }
  };

  const settingsCenterElement = (
    <SettingsCenterView
      role={role}
      lang={lang}
      theme={theme}
      settings={systemSettings}
      actorName={
        role === 'central_admin'
          ? activeCentralAdmin?.name ?? CENTRAL_ADMIN_CREDENTIALS.displayNameBn
          : role === 'school_admin'
            ? schoolAdminOwnSchool.headTeacher
            : role === 'teacher'
              ? activeTeacherRecord.nameBn
              : role === 'student'
                ? activeStudentRecord?.nameBn ?? 'Student'
                : guardianProfile.displayName
      }
      actorId={
        role === 'central_admin'
          ? activeCentralAdmin?.username ?? 'main-owner'
          : role === 'school_admin'
            ? schoolAdminOwnSchool.code
            : role === 'teacher'
              ? activeTeacherRecord.teacherCode
              : role === 'student'
                ? activeStudentRecord?.permanentId ?? 'STD'
                : 'GRD-2026-01'
      }
      actorEmail={
        authenticatedSession?.email ||
        (role === 'central_admin'
          ? activeCentralAdmin?.email ?? CENTRAL_ADMIN_CREDENTIALS.email
          : role === 'school_admin'
            ? schoolAdminOwnSchool.email
            : role === 'teacher'
              ? activeTeacherRecord.email
              : guardianProfile.email || systemSettings.accountRecoveryEmail || 'user@psms.gov.bd')
      }
      actorPhone={
        role === 'central_admin'
          ? activeCentralAdmin?.mobile ?? systemSettings.accountRecoveryPhone
          : role === 'school_admin'
            ? schoolAdminOwnSchool.mobile
            : role === 'teacher'
              ? activeTeacherRecord.mobile
              : role === 'student'
                ? activeStudentRecord?.guardianMobile ?? systemSettings.accountRecoveryPhone
                : guardianProfile.phone || systemSettings.accountRecoveryPhone
      }
      actorAvatarUrl={
        role === 'central_admin'
          ? activeCentralAdmin?.photoUrl
          : role === 'school_admin'
            ? schoolAdminOwnSchool.headTeacherPhotoUrl
            : role === 'teacher'
              ? activeTeacherRecord.photoUrl
              : role === 'student'
                ? activeStudentRecord?.photoUrl
                : guardianPhotoUrl
      }
      activeSchool={schoolAdminOwnSchool}
      schools={schools}
      teachers={role === 'central_admin' ? teachers : schoolAdminTeachers}
      students={role === 'central_admin' ? students : schoolAdminStudents}
      auditLogs={auditLogs}
      onUpdateSettings={handleUpdateSystemSettings}
      onChangeTheme={setTheme}
      onChangeLang={setLang}
      onOpenPhotoEditor={() => openProfilePhotoEditorForRole(role)}
      onOpenContactAdmin={() => setContactAdminModalOpen(true)}
      onNavigateTab={(tab) => {
        setActiveTab(tab);
        setCentralNavVersion((v) => v + 1);
      }}
      onToggleTeacherStatus={(teacherId, nextStatus) =>
        handleUpdateTeacherStatus(teacherId, nextStatus, 'Updated via Settings Users & Permissions')
      }
      onToggleStudentStatus={(studentId, nextStatus) =>
        handleUpdateStudentStatus(
          studentId,
          nextStatus,
          'Updated via Settings Users & Permissions',
          role === 'central_admin' ? 'central_admin' : 'school_admin'
        )
      }
      onUpdateSchoolInfo={(schoolId, patch) => {
        if (typeof patch.coverImageUrl === 'string') {
          persistSchoolCoverOverride(schoolId, patch.coverImageUrl);
        }
        setSchools((prev) => prev.map((s) => (s.id === schoolId ? { ...s, ...patch } : s)));
      }}
      onUpdateActorProfile={(patch) => {
        setAuthenticatedSession((prev) => {
          if (!prev) return prev;
          const nextSession: AuthenticatedSession = {
            ...prev,
            displayName: patch.displayName,
            email: patch.email,
          };
          persistPortalSession(nextSession);
          return nextSession;
        });
        if (role === 'central_admin' && activeCentralAdmin) {
          setAdminAccounts((prev) =>
            prev.map((adm) =>
              adm.id === activeCentralAdmin.id
                ? { ...adm, name: patch.displayName, email: patch.email, mobile: patch.phone }
                : adm
            )
          );
        } else if (role === 'school_admin') {
          const updatedSchool: SchoolRecord = {
            ...schoolAdminOwnSchool,
            headTeacher: patch.displayName,
            email: patch.email,
            mobile: patch.phone,
          };
          setSchools((prev) =>
            prev.map((s) => (s.id === schoolAdminOwnSchool.id ? updatedSchool : s))
          );
          if (auth.currentUser?.emailVerified) {
            void syncSchoolToFirestore(updatedSchool);
          }
        } else if (role === 'teacher') {
          const updatedTeacher: TeacherRecord = {
            ...activeTeacherRecord,
            nameBn: patch.displayName,
            nameEn: patch.displayName,
            email: patch.email,
            mobile: patch.phone,
          };
          setTeachers((prev) =>
            prev.map((t) => (t.id === activeTeacherRecord.id ? updatedTeacher : t))
          );
          if (auth.currentUser?.emailVerified) {
            void syncTeacherToFirestore(updatedTeacher);
          }
        } else if (role === 'student' && activeStudentRecord) {
          const updatedStudent: StudentRecord = {
            ...activeStudentRecord,
            nameBn: patch.displayName,
            nameEn: patch.displayName,
            guardianMobile: patch.phone,
          };
          setStudents((prev) =>
            prev.map((st) => (st.id === activeStudentRecord.id ? updatedStudent : st))
          );
          if (auth.currentUser?.emailVerified) {
            void syncStudentToFirestore(updatedStudent);
          }
        } else if (role === 'guardian') {
          setGuardianProfile((prev) => ({
            ...prev,
            displayName: patch.displayName,
            email: patch.email,
            phone: patch.phone,
          }));
        }
        if (auth.currentUser?.emailVerified) {
          void syncOwnFirebaseProfile({
            displayName: patch.displayName,
            phone: patch.phone,
          });
        }
      }}
      onOpenCoverGallery={() => setCoverGalleryOpen(true)}
      onOpenBannerCrop={() => openBannerCropEditor(schoolAdminOwnSchool)}
    />
  );

  const routeDecision = resolveProtectedRouteAccess(
    authStatus,
    authenticatedSession,
    role,
    activeTab
  );
  const protectedRole = routeDecision.effectiveRole;
  const protectedTab = routeDecision.effectiveTab ?? 'dashboard';
  const isProtectedBlocked = shouldBlockProtectedContent(authStatus, routeDecision);

  return (
    <div
      data-device-category={detectedDeviceCategory}
      data-platform={previewPlatform}
      data-environment={isProductionEnvironment ? 'production' : 'development'}
      data-auth-status={authStatus}
      className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
    >
      {routeDecision.screen === 'loading' ? (
        <AuthLoadingScreen lang={lang} />
      ) : !isProtectedBlocked &&
        routeDecision.screen === 'dashboard' &&
        routeDecision.allowProtectedRender &&
        protectedRole ? (
        <>
          {!isProductionEnvironment && showDevPreviewControls && (
            <DevicePreviewBar
              viewMode={effectiveDeviceViewMode}
              onChangeViewMode={setDeviceViewMode}
              orientation={deviceOrientation}
              onChangeOrientation={setDeviceOrientation}
              platform={previewPlatform}
              onChangePlatform={setPreviewPlatform}
              lang={lang}
              theme={theme}
              role={protectedRole}
              activeTab={protectedTab}
            />
          )}

          {!isProductionEnvironment && showDevPreviewControls && effectiveDeviceViewMode !== 'auto' ? (
            <DevicePreviewFrameStage
              viewMode={effectiveDeviceViewMode}
              orientation={deviceOrientation}
              platform={previewPlatform}
              lang={lang}
              theme={theme}
              role={protectedRole}
              activeTab={protectedTab}
              onExitToAuto={() => setDeviceViewMode('auto')}
              onSyncFromEmbed={(patch) => {
                if (patch.role && canAccessRoleDashboard(authenticatedSession, patch.role)) {
                  setRole(patch.role);
                }
                if (typeof patch.tab === 'string' && patch.tab.length > 0) setActiveTab(patch.tab);
                if (patch.lang) setLang(patch.lang);
                if (patch.theme) setTheme(patch.theme);
                if (patch.platform) setPreviewPlatform(patch.platform);
              }}
            />
          ) : (
            <>
              <TopHeader
                role={protectedRole}
                onRoleChange={handleRoleChange}
                roleSwitchLocked={true}
                onLogout={() => void handleLogout()}
                authenticatedUserEmail={authenticatedSession?.email}
                lang={lang}
                onToggleLang={() => setLang((l) => (l === 'bn' ? 'en' : 'bn'))}
                theme={theme}
                onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                notifications={notifications}
                onMarkAllNotificationsRead={() =>
                  setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
                }
                onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
                isOffline={isOffline}
                pendingSyncCount={pendingSyncCount}
                onToggleOffline={handleToggleOffline}
                guardianChildren={guardianChildren}
                selectedChildId={activeGuardianChild?.id ?? ''}
                onSelectChild={(id) => setSelectedChildId(id)}
                activeSchool={schoolAdminOwnSchool}
                activeTeacher={activeTeacherRecord}
                activeStudent={activeStudentRecord}
                pendingTeacherCount={pendingTeacherCount}
                onOpenLoginModal={() => {
                  setLoginPresetMode('teacher');
                  setLoginModalOpen(true);
                }}
                onOpenOnlineSchoolReg={() => setSchoolRegModal({ open: true, mode: 'ONLINE' })}
                onNavigateTab={(tab) => {
                  setActiveTab(tab);
                  setCentralNavVersion((v) => v + 1);
                }}
                globalSearchResults={globalSearchResults}
                onSelectGlobalSearchResult={handleSelectGlobalSearchResult}
                notificationPreferences={notificationPreferences}
                onNavigateFromNotification={handleNavigateFromNotification}
                onMarkNotificationRead={handleMarkNotificationRead}
                onOpenContactAdmin={() => setContactAdminModalOpen(true)}
                onOpenAppDownloadAndShare={() => setAppDownloadShareModalOpen(true)}
                centralAdminPhotoUrl={activeCentralAdmin?.photoUrl}
                guardianPhotoUrl={guardianPhotoUrl}
                centralAdminName={activeCentralAdmin?.name}
                guardianName={guardianProfile.displayName}
                onOpenPhotoEditor={() => openProfilePhotoEditorForRole(protectedRole)}
                isSchoolLoginLocked={Boolean(authenticatedSchoolLockId)}
                onUnlockSchoolLogin={() => {
                  setAuthenticatedSchoolLockId(null);
                  showToast(b('স্কুল লগইন লক আনলক করা হয়েছে।', 'School login isolation lock released.', lang));
                }}
                platform={previewPlatform}
              />

              <div className="flex flex-1 min-h-0">
                <Sidebar
                  role={protectedRole}
                  activeTab={protectedTab}
                  onSelectTab={(tab) => {
                    setActiveTab(tab);
                    setCentralNavVersion((v) => v + 1);
                  }}
                  lang={lang}
                  collapsed={sidebarCollapsed}
                  onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
                  mobileOpen={mobileSidebarOpen}
                  onCloseMobile={() => setMobileSidebarOpen(false)}
                  activeSchool={schoolAdminOwnSchool}
                  activeStudent={activeStudentRecord}
                  activeGuardianChild={activeGuardianChild}
                  activeTeacher={activeTeacherRecord}
                  onOpenContactAdmin={() => setContactAdminModalOpen(true)}
                  onOpenAppDownloadAndShare={() => setAppDownloadShareModalOpen(true)}
                  onOpenPhotoEditor={() => openProfilePhotoEditorForRole(protectedRole)}
                  previewViewMode={effectiveDeviceViewMode}
                />

                <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-7 pb-20 md:pb-8 max-w-[1600px] mx-auto w-full">
                  <PWAInstallBanner lang={lang} />
                  {protectedRole === 'central_admin' && (
                    <CentralAdminViews
                      activeTab={protectedTab}
                      onSelectTab={setActiveTab}
                      navKey={centralNavVersion}
                      lang={lang}
              searchQuery={searchQuery}
              schools={schools}
              teachers={teachers}
              students={students}
              requests={requests}
              teacherRequests={teacherRequests}
              studentRequests={studentRequests}
              routineSlots={routineSlots}
              auditLogs={auditLogs}
              adminAccounts={adminAccounts}
              notices={notices}
              notifications={notifications}
              locationDb={locationDb}
              onOpenConfirm={(cfg) => setConfirmState({ ...cfg, open: true })}
              onOpenSchoolReg={(mode) => setSchoolRegModal({ open: true, mode })}
              onOpenAddAdmin={() => setAddAdminOpen(true)}
              onInspectStudent={(s) => setInspectedStudent(s)}
              onUpdateRequestStatus={handleUpdateRequestStatus}
              onUpdateSchoolStatus={handleUpdateSchoolStatus}
              onChangeSchoolType={handleChangeSchoolType}
              onVerifyManualAddress={handleVerifyManualAddress}
              onDeleteSchool={handleDeleteSchool}
              onUpdateStudentStatus={(stId, status, reason) =>
                handleUpdateStudentStatus(stId, status, reason, 'central_admin')
              }
              onEditStudent={(stId, patch) => handleEditStudentInfo(stId, patch, 'central_admin')}
              onTransferStudent={(stId, targetSchoolId, reason) =>
                handleTransferStudent(stId, targetSchoolId, reason, 'central_admin')
              }
              onSendStudentNotice={(student, notice) =>
                handleSendStudentNotice(student, notice, 'central_admin')
              }
              onVerifyStudentDocument={(stId, docId, verified) =>
                handleVerifyStudentDocument(stId, docId, verified, 'central_admin')
              }
              onProcessStudentRequest={(reqId, decision, note) =>
                handleProcessStudentRequest(reqId, decision, note, 'central_admin')
              }
              onAddNotice={(n) => {
                setNotices((prev) => [n, ...prev]);
                if (auth.currentUser?.emailVerified) {
                  void syncNoticeToFirestore(n);
                }
                showToast(b('কেন্দ্রীয় নোটিশ প্রকাশিত হয়েছে।', 'Central notice published.', lang));
              }}
              onToggleAdminStatus={handleToggleAdminStatus}
              onAddLocationNode={handleAddLocationNode}
              onToggleLocationActive={handleToggleLocationActive}
              onEditSchoolInfo={handleEditSchoolInfo}
              onSuspendSchool={handleSuspendSchool}
              onReactivateSchool={handleReactivateSchool}
              onPermanentDeactivateSchool={handlePermanentDeactivateSchool}
              onSendSchoolNotice={handleSendSchoolNotice}
              onSchoolAdminAction={handleSchoolAdminAction}
              onRecordInspection={handleRecordInspection}
              onReturnForRevision={handleReturnForRevision}
              onAssignSchoolCodes={handleAssignSchoolCodes}
              onRegisterTeacher={handleRegisterTeacher}
              onEditTeacherInfo={handleEditTeacherInfo}
              onTeacherWorkflowAction={handleTeacherWorkflowAction}
              onUpdateTeacherStatus={handleUpdateTeacherStatus}
              onSendTeacherNotice={handleSendTeacherNotice}
              onProcessTeacherRequest={handleProcessTeacherRequest}
              onVisitTeacherDashboard={handleVisitTeacherDashboard}
              permissionMatrix={permissionMatrix}
              activeReviewerRole={activeReviewerRole}
              onChangeReviewerRole={setActiveReviewerRole}
              onTogglePermission={handleTogglePermission}
              onVerifyQueueItem={handleVerifyQueueItem}
              onVerifySchool={(id, note) => handleVerifySchool(id, note, 'verified')}
              onVerifyTeacher={(id, note) => handleVerifyTeacher(id, note, 'verified')}
              onVerifyStudent={(id, note) => handleVerifyStudent(id, note, 'verified')}
              onReissueTeacherId={handleReissueTeacherId}
              onReissueStudentId={(id) => {
                handleReissueStudentId(id);
              }}
              exams={exams}
              assignments={assignments}
              academicYears={academicYears}
              calendarEvents={calendarEvents}
              classSections={classSections}
              subjects={academicSubjects}
              teacherAssignments={teacherAssignments}
              classworks={classworks}
              curriculumUnits={curriculumUnits}
              lessonPlans={lessonPlans}
              studyMaterials={studyMaterials}
              classTests={classTests}
              questionBank={questionBank}
              examSchedules={examSchedules}
              gradingRules={gradingRules}
              extraItems={extraAcademicItems}
              dailyLessons={dailyLessons}
              substitutePermissions={substitutePermissions}
              subjectSubmissions={subjectSubmissions}
              resultAuditLogs={resultAuditLogs}
              onToggleSchoolPublishPermission={handleToggleSchoolPublishPermission}
              onPublishAllEligibleResults={handlePublishAllEligibleResults}
              notificationPreferences={notificationPreferences}
              lastLoginIso={lastLoginIso}
              onUpdateNotificationPreferences={setNotificationPreferences}
              onMarkNotificationRead={handleMarkNotificationRead}
              onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
              onTogglePinNotification={handleTogglePinNotification}
              onNavigateFromNotification={handleNavigateFromNotification}
              onResetLastVisitIso={handleResetLastVisitIso}
              onCreateNoticeStructured={handleCreateNoticeStructured}
              onEditNotice={handleEditNotice}
              onTransitionNoticeStatus={handleTransitionNoticeStatus}
              onMarkNoticeRead={handleMarkNoticeRead}
              onToggleCentralTermPublish={handleToggleCentralTermPublish}
              onCreateLocalExam={handleCreateLocalExam}
              onUpdateExamMark={handleUpdateExamMark}
              masterRoutines={masterRoutines}
              currentAdmin={activeCentralAdmin}
              contactAdminMessages={contactAdminMessages}
              onUpdateContactMessageStatus={handleUpdateContactMessageStatus}
              onUpdateAdminPermissions={handleUpdateAdminPermissions}
              onDeleteAdmin={handleDeleteAdmin}
              onOpenAddStudent={() => {
                setAdmissionActorRole('central_admin');
                setTeacherStudentAdmissionOpen(true);
              }}
              officialDocuments={officialDocuments}
              documentTemplates={documentTemplates}
              onUpdateOfficialDocuments={(next, toast) => {
                setOfficialDocuments(next);
                if (toast) showToast(toast);
              }}
              examRoutines={examRoutines}
              onUpdateExamRoutines={(next, toast) => {
                setExamRoutines(next);
                if (toast) showToast(toast);
              }}
              maxNoticeImages={maxNoticeImages}
              onUpdateMaxNoticeImages={setMaxNoticeImages}
              onUpdateNoticeImages={handleUpdateNoticeImages}
              onOpenAdminPhotoEditor={() => openProfilePhotoEditorForRole('central_admin')}
              onEditStudentPhoto={openStudentPhotoEditor}
              onEditTeacherPhoto={openTeacherPhotoEditor}
              onEditSchoolCover={openBannerCropEditor}
              settingsCenterElement={settingsCenterElement}
            />
          )}

          {protectedRole === 'school_admin' && (
            <SchoolAdminViews
              activeTab={protectedTab}
              onSelectTab={setActiveTab}
              lang={lang}
              searchQuery={searchQuery}
              ownSchool={schoolAdminOwnSchool}
              allSchools={schools}
              onSwitchActiveSchool={(id) => {
                if (authenticatedSchoolLockId) {
                  showToast(
                    b(
                      'লগইনকৃত বিদ্যালয়ে আইসোলেশন লক চালু আছে। অন্য বিদ্যালয়ে সুইচ করতে আনলক করুন।',
                      'Locked to authenticated school. Unlock first to preview other schools.',
                      lang
                    )
                  );
                  return;
                }
                setActiveSchoolAdminSchoolId(id);
              }}
              isSchoolLoginLocked={Boolean(authenticatedSchoolLockId)}
              onOpenCoverGallery={() => setCoverGalleryOpen(true)}
              onOpenBannerCrop={() => openBannerCropEditor(schoolAdminOwnSchool)}
              onOpenPhotoEditor={() => openProfilePhotoEditorForRole('school_admin')}
              onEditStudentPhoto={openStudentPhotoEditor}
              onEditTeacherPhoto={openTeacherPhotoEditor}
              students={schoolAdminStudents}
              teachers={schoolAdminTeachers}
              routineSlots={schoolAdminRoutineSlots}
              kioskScans={kioskScans}
              exams={schoolAdminExams}
              fees={fees}
              notices={notices}
              notifications={notifications}
              auditLogs={schoolAdminAuditLogs}
              onOpenAddStudent={() => {
                setAdmissionActorRole('school_admin');
                setTeacherStudentAdmissionOpen(true);
              }}
              onInspectStudent={(s) => setInspectedStudent(s)}
              studentRequests={schoolAdminStudentRequests}
              onEditStudent={(stId, patch) => handleEditStudentInfo(stId, patch, 'school_admin')}
              onTransferStudent={(stId, targetSchoolId, reason) =>
                handleTransferStudent(stId, targetSchoolId, reason, 'school_admin')
              }
              onUpdateStudentStatus={(stId, status, reason) =>
                handleUpdateStudentStatus(stId, status, reason, 'school_admin')
              }
              onSendStudentNotice={(student, notice) =>
                handleSendStudentNotice(student, notice, 'school_admin')
              }
              onVerifyStudentDocument={(stId, docId, verified) =>
                handleVerifyStudentDocument(stId, docId, verified, 'school_admin')
              }
              onProcessStudentRequest={(reqId, decision, note) =>
                handleProcessStudentRequest(reqId, decision, note, 'school_admin')
              }
              onOpenConfirm={(cfg) => setConfirmState({ ...cfg, open: true })}
              onUpdateRoutineSlot={handleUpdateRoutineSlot}
              onSimulateKioskScan={handleSimulateKioskScan}
              onToggleExamStatus={handleToggleExamStatus}
              onUpdateExamMark={handleUpdateExamMark}
              onCollectFee={handleCollectFee}
              onAddNotice={(n) => {
                setNotices((prev) => [n, ...prev]);
                if (auth.currentUser?.emailVerified) {
                  void syncNoticeToFirestore(n);
                }
                showToast(b('নোটিশ ও SMS পাঠানো হয়েছে।', 'Notice & SMS dispatched.', lang));
              }}
              onPromoteAllEligible={() => {
                showToast(b('যোগ্য শিক্ষার্থীদের শ্রেণি উন্নয়ন সম্পন্ন হয়েছে।', 'Eligible students promoted.', lang));
              }}
              onApproveTeacher={(teacherId) =>
                handleUpdateTeacherStatus(teacherId, 'active', 'স্কুল অ্যাডমিন কর্তৃক যোগদান অনুমোদিত')
              }
              onRequestReactivation={handleRequestReactivation}
              onVerifyStudent={(id, note) => handleVerifyStudent(id, note, 'verified')}
              onReissueStudentId={(id) => {
                handleReissueStudentId(id);
              }}
              assignments={assignments}
              academicYears={academicYears}
              onCreateAcademicYear={handleCreateAcademicYear}
              onSelectCurrentAcademicYear={handleSelectCurrentAcademicYear}
              onAddTermToYear={handleAddTermToYear}
              calendarEvents={calendarEvents}
              onAddCalendarEvent={handleAddCalendarEvent}
              classSections={classSections}
              onAddClassSection={handleAddClassSection}
              subjects={academicSubjects}
              onAddSubject={handleAddSubject}
              teacherAssignments={teacherAssignments}
              onSaveTeacherAssignment={handleSaveTeacherAssignment}
              onReplaceAssignedTeacher={handleReplaceAssignedTeacher}
              onCreateRoutineSlot={handleCreateRoutineSlot}
              onAssignSubstituteTeacher={handleAssignSubstituteTeacher}
              classworks={classworks}
              onCreateClasswork={handleCreateClasswork}
              onUpdateClassworkStudentStatus={handleUpdateClassworkStudentStatus}
              curriculumUnits={curriculumUnits}
              lessonPlans={lessonPlans}
              onAddLessonPlan={handleAddLessonPlan}
              studyMaterials={studyMaterials}
              classTests={classTests}
              questionBank={questionBank}
              examSchedules={examSchedules}
              gradingRules={gradingRules}
              onUpdateGradingRule={handleUpdateGradingRule}
              extraItems={extraAcademicItems}
              dailyLessons={dailyLessons}
              substitutePermissions={substitutePermissions}
              subjectSubmissions={subjectSubmissions}
              resultAuditLogs={resultAuditLogs}
              onReviewSubstitutePermission={handleReviewSubstitutePermission}
              onCancelClassSlot={(slotId, reason, remarks) =>
                handleCancelClassSlot(slotId, reason, remarks, true)
              }
              onRestoreClassSlot={handleRestoreClassSlot}
              onSendDelayedTeacherAlert={handleSendDelayedTeacherAlert}
              onTogglePublishResult={handleTogglePublishResult}
              externalAcademicModule={externalAcademicModule}
              favoriteModules={favoriteModules}
              onToggleFavorite={handleToggleFavoriteModule}
              recentModules={recentModules}
              onRecordRecent={handleRecordRecentModule}
              attendanceHistory={attendanceHistory}
              onRecordAutoScan={handleRecordAutoScan}
              onManualAttendanceMark={handleManualAttendanceMark}
              onNotifyAllAbsentGuardians={handleNotifyAllAbsentGuardians}
              notificationPreferences={notificationPreferences}
              lastLoginIso={lastLoginIso}
              onUpdateNotificationPreferences={setNotificationPreferences}
              onMarkNotificationRead={handleMarkNotificationRead}
              onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
              onTogglePinNotification={handleTogglePinNotification}
              onNavigateFromNotification={handleNavigateFromNotification}
              onResetLastVisitIso={handleResetLastVisitIso}
              onCreateNoticeStructured={handleCreateNoticeStructured}
              onEditNotice={handleEditNotice}
              onTransitionNoticeStatus={handleTransitionNoticeStatus}
              onMarkNoticeRead={handleMarkNoticeRead}
              onCreateLocalExam={handleCreateLocalExam}
              masterRoutines={masterRoutines}
              onUpdateMasterRoutines={handleUpdateMasterRoutines}
              teacherSchoolAssignments={teacherSchoolAssignments}
              onReviewTeacherJoinApplication={handleReviewTeacherJoinApplication}
              onToggleTeacherAssignmentStatus={handleToggleTeacherAssignmentStatus}
              officialDocuments={officialDocuments}
              documentTemplates={documentTemplates}
              onUpdateOfficialDocuments={(next, toast) => {
                setOfficialDocuments(next);
                if (toast) showToast(toast);
              }}
              examRoutines={examRoutines}
              onUpdateExamRoutines={(next, toast) => {
                setExamRoutines(next);
                if (toast) showToast(toast);
              }}
              maxNoticeImages={maxNoticeImages}
              onUpdateMaxNoticeImages={setMaxNoticeImages}
              onUpdateNoticeImages={handleUpdateNoticeImages}
              settingsCenterElement={settingsCenterElement}
            />
          )}

          {protectedRole === 'teacher' && (
            <TeacherAcademicWorkspace
              activeTab={protectedTab}
              onSelectTab={setActiveTab}
              lang={lang}
              teacher={activeTeacherRecord}
              allTeachers={teachers}
              onSwitchTeacher={(id) => {
                setActiveTeacherPortalId(id);
                const firstApproved = teacherSchoolAssignments.find(
                  (a) => a.teacherId === id && a.approvalStatus === 'approved' && a.employmentStatus === 'Active'
                );
                if (firstApproved) setActiveTeacherSchoolId(firstApproved.schoolId);
              }}
              notifications={notifications}
              routineSlots={teacherRoutineSlots}
              students={teacherScopedStudents}
              kioskScans={kioskScans}
              exams={teacherExams}
              assignments={assignments}
              teacherAssignments={teacherAssignments}
              teacherAttendance={teacherAttendance}
              onTeacherCheckInOut={handleTeacherCheckInOut}
              lessonPlans={lessonPlans}
              classworks={classworks}
              onCreateClasswork={handleCreateClasswork}
              onUpdateClassworkStudentStatus={handleUpdateClassworkStudentStatus}
              gradingRules={gradingRules}
              onStartClassSession={handleStartClassSession}
              onUpdateSessionDetails={handleUpdateSessionDetails}
              onCompleteClass={(slotId, lessonTopic, homeworkText) =>
                handleUpdateRoutineSlot(slotId, { status: 'completed', lessonTopic, homeworkText }, true)
              }
              onRequestSubstitute={(slotId, reason) => {
                handleUpdateRoutineSlot(slotId, {
                  status: 'sub_requested',
                  substituteTeacher: `${activeTeacherRecord.nameBn} (${reason})`,
                  substituteReason: reason,
                });
                showToast(b('বিকল্প শিক্ষকের অনুরোধ প্রধান শিক্ষকের কাছে পাঠানো হয়েছে।', 'Substitute request sent.', lang));
              }}
              onUpdateAssignedMark={handleUpdateExamMark}
              dailyLessons={dailyLessons}
              substitutePermissions={substitutePermissions}
              subjectSubmissions={subjectSubmissions}
              onGrantSubstitutePermission={handleGrantSubstitutePermission}
              onRevokeSubstitutePermission={(permissionId) =>
                handleReviewSubstitutePermission(permissionId, 'revoke')
              }
              onCancelClassSlot={(slotId, reason, remarks) =>
                handleCancelClassSlot(slotId, reason, remarks, false)
              }
              onPublishDailyLesson={handlePublishDailyLesson}
              onSubmitSubjectMarks={handleSubmitSubjectMarks}
              onRequestResultCorrection={handleRequestResultCorrection}
              notices={notices}
              attendanceHistory={attendanceHistory}
              onRecordAutoScan={handleRecordAutoScan}
              onManualAttendanceMark={handleManualAttendanceMark}
              onNotifyAllAbsentGuardians={handleNotifyAllAbsentGuardians}
              notificationPreferences={notificationPreferences}
              lastLoginIso={lastLoginIso}
              onUpdateNotificationPreferences={setNotificationPreferences}
              onMarkNotificationRead={handleMarkNotificationRead}
              onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
              onTogglePinNotification={handleTogglePinNotification}
              onNavigateFromNotification={handleNavigateFromNotification}
              onResetLastVisitIso={handleResetLastVisitIso}
              onCreateNoticeStructured={handleCreateNoticeStructured}
              onEditNotice={handleEditNotice}
              onTransitionNoticeStatus={handleTransitionNoticeStatus}
              onMarkNoticeRead={handleMarkNoticeRead}
              onCreateLocalExam={handleCreateLocalExam}
              masterRoutines={masterRoutines}
              schools={schools}
              activeSchool={teacherActiveSchool}
              schoolAssignments={teacherSchoolAssignments}
              activeAssignment={teacherWorkspaceContext.activeAssignment}
              approvedSchoolAssignments={teacherWorkspaceContext.approvedSchools}
              onSwitchSchool={(sid) => {
                setActiveTeacherSchoolId(sid);
                showToast(b('সক্রিয় বিদ্যালয় পরিবর্তন করা হয়েছে।', 'Active school switched.', lang));
              }}
              onApplyJoinSchool={handleApplyJoinSchool}
              onLeaveSchool={(assignmentId) =>
                handleToggleTeacherAssignmentStatus(assignmentId, 'Inactive')
              }
              onUpdatePartB={handleUpdateTeacherPartB}
              onOpenAddStudent6Part={() => {
                setAdmissionActorRole('teacher');
                setTeacherStudentAdmissionOpen(true);
              }}
              officialDocuments={officialDocuments}
              documentTemplates={documentTemplates}
              onUpdateOfficialDocuments={(next, toast) => {
                setOfficialDocuments(next);
                if (toast) showToast(toast);
              }}
              examRoutines={examRoutines}
              maxNoticeImages={maxNoticeImages}
              onUpdateNoticeImages={handleUpdateNoticeImages}
              onOpenPhotoEditor={() => openProfilePhotoEditorForRole('teacher')}
              settingsCenterElement={settingsCenterElement}
            />
          )}

          {protectedRole === 'guardian' && activeGuardianChild && (
            <GuardianViews
              activeTab={protectedTab}
              onSelectTab={setActiveTab}
              lang={lang}
              child={activeGuardianChild}
              allChildren={guardianChildren}
              onSelectChild={(id) => setSelectedChildId(id)}
              assignments={assignments}
              onToggleAssignmentSubmit={(asgId) =>
                setAssignments((prev) =>
                  prev.map((a) =>
                    a.id === asgId
                      ? { ...a, status: a.status === 'submitted' ? 'pending' : 'submitted' }
                      : a
                  )
                )
              }
              routineSlots={guardianRoutineSlots}
              exams={guardianExams}
              fees={fees}
              notices={notices}
              leaveRequests={leaveRequests}
              onSubmitLeaveRequest={(req) => {
                setLeaveRequests((prev) => [
                  { ...req, id: `lv-${Date.now()}`, status: 'pending' },
                  ...prev,
                ]);
                showToast(b('ছুটির আবেদন শ্রেণি শিক্ষকের কাছে পাঠানো হয়েছে।', 'Leave request sent to class teacher.', lang));
              }}
              messages={messages}
              onSendMessage={(text) => {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `msg-${Date.now()}`,
                    studentId: activeGuardianChild.id,
                    sender: 'guardian',
                    senderName: 'মোঃ জামাল উদ্দিন (অভিভাবক)',
                    text,
                    time: 'এইমাত্র',
                  },
                ]);
              }}
              onLinkChildByCode={handleLinkChildByCode}
              school={schools.find((s) => s.id === activeGuardianChild.schoolId) ?? schools[0]}
              classworks={classworks}
              curriculumUnits={curriculumUnits}
              studyMaterials={studyMaterials}
              gradingRules={gradingRules}
              dailyLessons={dailyLessons}
              notifications={notifications}
              notificationPreferences={notificationPreferences}
              lastLoginIso={lastLoginIso}
              attendanceHistory={attendanceHistory}
              onUpdateNotificationPreferences={setNotificationPreferences}
              onMarkNotificationRead={handleMarkNotificationRead}
              onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
              onTogglePinNotification={handleTogglePinNotification}
              onNavigateFromNotification={handleNavigateFromNotification}
              onResetLastVisitIso={handleResetLastVisitIso}
              onMarkNoticeRead={handleMarkNoticeRead}
              masterRoutines={masterRoutines}
              examRoutines={examRoutines}
              officialDocuments={officialDocuments}
              documentTemplates={documentTemplates}
              teachers={teachers}
              guardianPhotoUrl={guardianPhotoUrl ?? DEFAULT_PROFILE_AVATARS.guardian}
              onOpenPhotoEditor={() => openProfilePhotoEditorForRole('guardian')}
              settingsCenterElement={settingsCenterElement}
            />
          )}

          {protectedRole === 'student' && activeStudentRecord && (
            <StudentPortalView
              activeTab={protectedTab}
              onSelectTab={setActiveTab}
              lang={lang}
              student={activeStudentRecord}
              school={schools.find((s) => s.id === activeStudentRecord.schoolId) ?? schools[0]}
              routineSlots={studentRoutineSlots}
              assignments={assignments}
              classworks={classworks}
              studyMaterials={studyMaterials}
              gradingRules={gradingRules}
              exams={studentExams}
              notices={notices}
              notifications={notifications}
              notificationPreferences={notificationPreferences}
              lastLoginIso={lastLoginIso}
              attendanceHistory={attendanceHistory}
              onUpdateNotificationPreferences={setNotificationPreferences}
              onMarkNotificationRead={handleMarkNotificationRead}
              onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
              onTogglePinNotification={handleTogglePinNotification}
              onNavigateFromNotification={handleNavigateFromNotification}
              onResetLastVisitIso={handleResetLastVisitIso}
              onMarkNoticeRead={handleMarkNoticeRead}
              myChangeRequests={activeStudentChangeRequests}
              dailyLessons={dailyLessons}
              onToggleStudentLessonStatus={handleToggleStudentLessonStatus}
              onUpdateAllowedSelfProfile={handleStudentAllowedSelfUpdate}
              onSubmitImportantChangeRequest={handleSubmitImportantStudentChange}
              masterRoutines={masterRoutines}
              examRoutines={examRoutines}
              officialDocuments={officialDocuments}
              documentTemplates={documentTemplates}
              teachers={teachers}
              onOpenPhotoEditor={() => openProfilePhotoEditorForRole('student')}
              settingsCenterElement={settingsCenterElement}
            />
          )}

          {protectedTab === 'dashboard' && (
            <DashboardAppQuickAccessCard
              lang={lang}
              onOpenShareModal={() => setAppDownloadShareModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Role-Scoped Mobile Bottom Navigation (no cross-role switching) */}
      <nav
        aria-label={b('মোবাইল কুইক মেনু', 'Mobile role navigation', lang)}
        data-testid="mobile-role-bottom-nav"
        className={`${
          effectiveDeviceViewMode === 'mobile' ? 'grid' : 'md:hidden grid'
        } fixed bottom-0 inset-x-0 h-12 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 grid-cols-5 z-20 no-print`}
      >
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center text-[10px] font-semibold cursor-pointer ${
            protectedTab === 'dashboard' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>{b('হোম', 'Home', lang)}</span>
        </button>
        <button
          type="button"
          onClick={() =>
            setActiveTab(
              protectedRole === 'teacher'
                ? 'my_routine'
                : protectedRole === 'school_admin'
                  ? 'routine'
                  : protectedRole === 'central_admin'
                    ? 'schools'
                    : 'routine'
            )
          }
          className="flex flex-col items-center justify-center text-[10px] font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
        >
          <CalendarDays className="w-4 h-4" />
          <span>
            {protectedRole === 'central_admin'
              ? b('স্কুল', 'Schools', lang)
              : b('রুটিন', 'Routine', lang)}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`flex flex-col items-center justify-center text-[10px] font-semibold cursor-pointer ${
            protectedTab === 'notifications' ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>{b('বিজ্ঞপ্তি', 'Alerts', lang)}</span>
        </button>
        <button
          type="button"
          onClick={() => setAppDownloadShareModalOpen(true)}
          className="flex flex-col items-center justify-center text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>{b('অ্যাপস', 'Apps', lang)}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center text-[10px] font-semibold cursor-pointer ${
            protectedTab === 'settings' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>{b('সেটিংস', 'Settings', lang)}</span>
        </button>
      </nav>
            </>
          )}
        </>
      ) : (
        <PortalLandingHub
          open={true}
          lang={lang}
          theme={theme}
          schools={schools}
          teachers={teachers}
          students={students}
          requests={requests}
          onToggleLang={() => setLang((l) => (l === 'bn' ? 'en' : 'bn'))}
          onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          onUnifiedLoginSubmit={handleUnifiedLoginSubmit}
          onChangePasswordSubmit={handleChangePasswordSubmit}
          onForgotPasswordSubmit={handleForgotPasswordSubmit}
          onDemoQuickLogin={handleDemoQuickLogin}
          onOpenSchoolRegistration={() => setSchoolRegModal({ open: true, mode: 'ONLINE' })}
          onOpenTeacherRegistration={() => setPublicTeacherRegOpen(true)}
          onOpenStudentRegistration={() => setPublicStudentRegOpen(true)}
          onOpenStatusTracker={() => setStatusTrackerOpen(true)}
          onOpenContactAdmin={() => setContactAdminModalOpen(true)}
          onOpenAppDownloadAndShare={() => setAppDownloadShareModalOpen(true)}
          onGoogleSignIn={handleGoogleSignIn}
          onOpenEmailAuth={(initialTab = 'signin') => {
            setEmailAuthPrefill('');
            setEmailAuthInitialTab(initialTab);
            setEmailAuthModalOpen(true);
          }}
          googleSigningIn={googleSigningIn}
          authNotice={authNotice}
          authError={authError}
        />
      )}

      <FirebaseEmailAuthModal
        open={emailAuthModalOpen}
        lang={lang}
        initialTab={emailAuthInitialTab}
        initialEmail={emailAuthPrefill}
        onClose={() => setEmailAuthModalOpen(false)}
        onAuthSuccess={(session) => {
          persistPortalSession(session);
          applyVerifiedSession(session);
          setAuthError(null);
          setAuthNotice(null);
          void recordFirebaseAuditEvent({
            role: session.role,
            what: 'Firebase Email/Password Auth Verified',
            targetName: session.email || session.displayName,
            schoolId: session.schoolId,
          });
          showToast(
            b(
              'ভেরিফায়েড Firebase অ্যাকাউন্ট দিয়ে নিরাপদ লগইন সম্পন্ন হয়েছে।',
              'Signed in via verified Firebase account.',
              lang
            )
          );
        }}
        onPendingApprovalNotice={(verifiedEmail) => {
          setAuthStatus('unauthenticated');
          setAuthNotice(
            b(
              `${verifiedEmail} ইমেইল যাচাই হয়েছে। অনুমোদিত ড্যাশবোর্ডে প্রবেশ করতে নিচের পোর্টাল আইডি-পাসওয়ার্ড ব্যবহার করুন অথবা অ্যাডমিনের অনুমোদনের জন্য অপেক্ষা করুন।`,
              `${verifiedEmail} verified. Please sign in with your portal credentials below or wait for Central Admin role assignment.`,
              lang
            )
          );
        }}
      />

      {/* Modals */}
      <ActionConfirmModal state={confirmState} lang={lang} onClose={() => setConfirmState(null)} />

      {!isProtectedBlocked && (
        <>
          <StudentProfileModal
            student={activeInspectedStudent}
            actorRole={protectedRole ?? role}
            school={schools.find((s) => s.id === activeInspectedStudent?.schoolId)}
            lang={lang}
            onClose={() => setInspectedStudent(null)}
            onPromoteStudent={(stId) => {
              setStudents((prev) =>
                prev.map((s) =>
                  s.id === stId
                    ? { ...s, admissionHistory: [...s.admissionHistory, '২০২৭: পরবর্তী শ্রেণিতে উন্নীত (Promoted)'] }
                    : s
                )
              );
              setInspectedStudent(null);
              showToast(b('শিক্ষার্থী পরবর্তী শ্রেণিতে উন্নীত হয়েছে।', 'Student promoted.', lang));
            }}
            onIssueTransferLetter={handleIssueTransferLetter}
            onIssueDigitalIdCard={handleReissueStudentId}
            onEditStudentPhoto={openStudentPhotoEditor}
          />

          <AddStudentModal
            open={addStudentOpen}
            lang={lang}
            schoolId={schoolAdminOwnSchool.id}
            schoolNameBn={schoolAdminOwnSchool.nameBn}
            allowedClasses={
              getSchoolTypeConfig(schoolAdminOwnSchool.schoolType, schoolAdminOwnSchool.approvedClasses)
                .defaultClasses
            }
            nextSerial={students.length + 50}
            onClose={() => setAddStudentOpen(false)}
            onAddStudent={handleAddStudent}
          />

          <TeacherStudentAdmissionModal
            open={teacherStudentAdmissionOpen}
            lang={lang}
            school={
              admissionActorRole === 'teacher'
                ? teacherActiveSchool ?? schoolAdminOwnSchool
                : schoolAdminOwnSchool
            }
            students={students}
            admittedByTeacherId={admissionActorRole === 'teacher' ? activeTeacherRecord.id : undefined}
            admittedByTeacherName={
              admissionActorRole === 'teacher'
                ? activeTeacherRecord.nameBn
                : admissionActorRole === 'central_admin'
                  ? sanitizeActorDisplayForRole(CENTRAL_ADMIN_CREDENTIALS.displayNameBn, 'school_admin')
                  : schoolAdminOwnSchool.headTeacher
            }
            autoActivate={admissionActorRole !== 'teacher'}
            onClose={() => setTeacherStudentAdmissionOpen(false)}
            onStudentAdmitted={handleAddStudent}
          />
        </>
      )}

      {publicStudentRegOpen && (
        <TeacherStudentAdmissionModal
          open={publicStudentRegOpen}
          lang={lang}
          school={schools[0]}
          schools={schools}
          allowSchoolSelection={true}
          students={students}
          admittedByTeacherName={b('অনলাইন শিক্ষার্থী আবেদন', 'Online Student Application', lang)}
          autoActivate={false}
          onClose={() => setPublicStudentRegOpen(false)}
          onStudentAdmitted={handleAddStudent}
        />
      )}

      <SchoolRegistrationModal
        open={schoolRegModal.open}
        mode={schoolRegModal.mode}
        lang={lang}
        locationDb={locationDb}
        existingSchools={schools}
        onClose={() => setSchoolRegModal((p) => ({ ...p, open: false }))}
        onRegisterSchool={handleRegisterSchool}
      />

      {!isProtectedBlocked && (
        <AddAdminModal
          open={addAdminOpen}
          lang={lang}
          onClose={() => setAddAdminOpen(false)}
          onAddAdmin={(adm) => {
            const res = createSubordinateAdmin(adminAccounts, activeCentralAdmin, {
              name: adm.name,
              username: adm.username,
              email: adm.email,
              mobile: adm.mobile,
              accessLevel: adm.accessLevel,
              permissions: adm.permissions ?? ['schools', 'verification'],
            });
            if (!res.ok || !res.created) {
              showToast(b(res.errorBn ?? 'অ্যাডমিন যোগ করা যায়নি।', res.errorEn ?? 'Could not add admin.', lang));
              return;
            }
            setAdminAccounts(res.accounts);
            appendAuditLog({
              who: `${CENTRAL_ADMIN_CREDENTIALS.displayNameBn} (Central Admin)`,
              role: 'central_admin',
              what: 'নতুন Sub-Admin যুক্ত',
              targetName: `${res.created.name} (${res.created.username})`,
              requestId: res.created.id,
              oldValue: 'Uninvited',
              newValue: res.created.accessLevel,
            });
            showToast(b('নতুন Sub-Admin আমন্ত্রণ পাঠানো হয়েছে।', 'New Subordinate Admin added.', lang));
          }}
        />
      )}

      <AppDownloadAndShareModal
        open={appDownloadShareModalOpen}
        lang={lang}
        onClose={() => setAppDownloadShareModalOpen(false)}
      />

      <ContactAdminModal
        open={contactAdminModalOpen}
        lang={lang}
        role={landingHubOpen ? 'guest' : role}
        defaultSenderName={
          landingHubOpen
            ? ''
            : role === 'school_admin'
              ? schoolAdminOwnSchool.headTeacher
              : role === 'teacher'
                ? activeTeacherRecord.nameBn
                : role === 'student'
                  ? activeStudentRecord?.nameBn ?? ''
                  : role === 'guardian'
                    ? 'মোঃ জামাল উদ্দিন (অভিভাবক)'
                    : 'Central Support'
        }
        schoolId={
          role === 'school_admin'
            ? schoolAdminOwnSchool.id
            : role === 'teacher'
              ? teacherScopedSchoolId
              : role === 'student'
                ? activeStudentRecord?.schoolId
                : role === 'guardian'
                  ? activeGuardianChild?.schoolId
                  : undefined
        }
        onClose={() => setContactAdminModalOpen(false)}
        onNavigateToNotices={() => {
          if (authStatus === 'authenticated' && authenticatedSession) {
            setActiveTab('notices');
          } else {
            setContactAdminModalOpen(false);
            showToast(b('নোটিশ দেখতে অনুগ্রহ করে লগইন করুন।', 'Please sign in to view notices.', lang));
          }
        }}
        onSubmitMessage={handleSubmitContactAdminMessage}
      />

      <ApplicationStatusTrackerModal
        open={statusTrackerOpen}
        lang={lang}
        schools={schools}
        requests={requests}
        onClose={() => setStatusTrackerOpen(false)}
        onViewSchoolInWorkspace={(schoolId) => {
          if (!canAccessRoleDashboard(authenticatedSession, 'central_admin')) {
            setStatusTrackerOpen(false);
            setLoginPresetMode('super_admin');
            setLoginModalOpen(true);
            showToast(
              b(
                'স্কুল ওয়ার্কস্পেস দেখতে কেন্দ্রীয় অ্যাডমিন হিসেবে লগইন করুন।',
                'Sign in as Central Admin to inspect school workspace.',
                lang
              )
            );
            return;
          }
          setRole('central_admin');
          setActiveTab('schools');
          setActiveSchoolAdminSchoolId(schoolId);
          setCentralNavVersion((v) => v + 1);
        }}
      />

      <NewTeacherRegistrationModal
        open={publicTeacherRegOpen}
        schools={schools}
        existingTeachers={teachers}
        lang={lang}
        onClose={() => setPublicTeacherRegOpen(false)}
        onRegister={(newTeacher) => {
          handleRegisterTeacher(newTeacher);
        }}
      />

      <LoginModal
        open={loginModalOpen}
        lang={lang}
        students={students}
        schools={schools}
        teachers={teachers}
        initialMode={loginPresetMode}
        onClose={() => setLoginModalOpen(false)}
        onOpenTeacherRegistration={() => setPublicTeacherRegOpen(true)}
        onGoogleSignIn={handleGoogleSignIn}
        googleSigningIn={googleSigningIn}
        onSuperAdminFirebaseSignIn={handleSuperAdminFirebaseSignIn}
        onSuperAdminRecheckVerification={handleSuperAdminRecheckVerification}
        onSuperAdminResendVerification={handleSuperAdminResendVerification}
        onOpenFirebaseRecovery={(prefillEmail) => {
          setEmailAuthPrefill(prefillEmail || BOOT_ADMIN_EMAIL);
          setEmailAuthInitialTab('recovery');
          setEmailAuthModalOpen(true);
        }}
        onLoginSuccess={(targetRole, studentId, schoolId, extra) => {
          if (extra?.linkedStudentIds && extra.linkedStudentIds.length > 0) {
            setLinkedChildIds(extra.linkedStudentIds);
          }
          const resolvedStudentId = studentId ?? extra?.linkedStudentIds?.[0];
          const resolvedTeacherId = extra?.teacherId;
          if (resolvedStudentId) {
            if (targetRole === 'guardian') {
              setSelectedChildId(resolvedStudentId);
            } else {
              setActiveStudentPortalId(resolvedStudentId);
            }
          }
          if (targetRole === 'teacher' && resolvedTeacherId) {
            setActiveTeacherPortalId(resolvedTeacherId);
            if (schoolId) setActiveTeacherSchoolId(schoolId);
          }
          if (targetRole === 'school_admin' && schoolId) {
            setActiveSchoolAdminSchoolId(schoolId);
            setAuthenticatedSchoolLockId(schoolId);
          } else if (targetRole === 'central_admin') {
            setAuthenticatedSchoolLockId(null);
          }

          const displayName =
            targetRole === 'central_admin'
              ? CENTRAL_ADMIN_CREDENTIALS.displayNameEn
              : targetRole === 'school_admin'
                ? schools.find((s) => s.id === schoolId)?.headTeacher || 'School Admin'
                : targetRole === 'teacher'
                  ? teachers.find((t) => t.id === resolvedTeacherId)?.nameEn || 'Teacher'
                  : targetRole === 'student'
                    ? students.find((s) => s.id === resolvedStudentId)?.nameEn || 'Student'
                    : 'Guardian';

          const nextSession: AuthenticatedSession = {
            uid:
              resolvedTeacherId ||
              resolvedStudentId ||
              schoolId ||
              extra?.guardianMobile ||
              `portal-${targetRole}`,
            role: targetRole,
            displayName,
            provider: 'institutional_portal',
            schoolId:
              schoolId ||
              (targetRole === 'student'
                ? students.find((s) => s.id === resolvedStudentId)?.schoolId
                : undefined),
            teacherId: resolvedTeacherId,
            studentId: resolvedStudentId,
            guardianMobile: extra?.guardianMobile,
            signedInAtIso: new Date().toISOString(),
          };
          persistPortalSession(nextSession);
          applyVerifiedSession(nextSession);
          showToast(b('পোর্টালে সফলভাবে প্রবেশ করেছেন।', 'Signed in to portal.', lang));
        }}
      />

      {!isProtectedBlocked && (
        <>
          <CoverGalleryModal
            isOpen={coverGalleryOpen}
            currentCoverUrl={schoolAdminOwnSchool.coverImageUrl}
            schoolNameBn={schoolAdminOwnSchool.nameBn}
            onSelectCover={(url) => handleUpdateSchoolCover(schoolAdminOwnSchool.id, url)}
            onOpenCustomCrop={() => {
              setCoverGalleryOpen(false);
              openBannerCropEditor(schoolAdminOwnSchool);
            }}
            onResetDefault={() =>
              handleUpdateSchoolCover(schoolAdminOwnSchool.id, RECOMMENDED_SCHOOL_COVERS[0].url)
            }
            onClose={() => setCoverGalleryOpen(false)}
          />

          {cropModalState && (
            <ImageCropModal
              isOpen={cropModalState.open}
              mode={cropModalState.mode}
              titleBn={cropModalState.titleBn}
              currentImageUrl={cropModalState.currentUrl}
              onSave={handleSaveCroppedImage}
              onRemove={handleRemovePhoto}
              onClose={() => setCropModalState(null)}
            />
          )}
        </>
      )}

      {toastMsg && (
        <div
          role="status"
          className="fixed bottom-16 md:bottom-5 right-4 md:right-5 z-50 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold shadow-lg flex items-center gap-2"
        >
          <GraduationCap className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
      <OfflineIndicator lang={lang} />
    </div>
  );
}
