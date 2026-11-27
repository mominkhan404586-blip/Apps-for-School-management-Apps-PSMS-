import type { Role, StudentRecord, TeacherRecord } from '../types';

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

export type AuthProviderKind =
  | 'firebase_google'
  | 'firebase_email'
  | 'institutional_portal';

export interface AuthenticatedSession {
  uid: string;
  role: Role;
  displayName: string;
  email?: string;
  phone?: string;
  provider: AuthProviderKind;
  schoolId?: string;
  teacherId?: string;
  studentId?: string;
  guardianMobile?: string;
  signedInAtIso: string;
}

export interface ProtectedRouteDecision {
  screen: 'loading' | 'login_portal' | 'dashboard';
  allowProtectedRender: boolean;
  effectiveRole: Role | null;
  effectiveTab: string | null;
  accessDenied: boolean;
}

export const VALID_APP_ROLES: readonly Role[] = [
  'central_admin',
  'school_admin',
  'teacher',
  'guardian',
  'student',
] as const;

export const BOOT_ADMIN_EMAIL = 'mominkhan404586@gmail.com';
export const PORTAL_SESSION_STORAGE_KEY = 'psms_verified_auth_session_v1';

const ROLE_ALLOWED_TABS: Record<Role, readonly string[]> = {
  central_admin: [
    'dashboard',
    'schools',
    'locations',
    'teachers',
    'students',
    'academics',
    'exams',
    'documents',
    'notices',
    'reports',
    'security',
    'realtime_db',
    'permissions',
    'architecture',
    'archive',
    'audit',
    'approval',
    'verification',
    'notifications',
    'settings',
  ],
  school_admin: [
    'dashboard',
    'performance',
    'academics',
    'students',
    'teachers',
    'school',
    'classes',
    'routine',
    'subjects',
    'lessons',
    'exams',
    'results',
    'attendance',
    'finance',
    'health',
    'notices',
    'notifications',
    'events',
    'documents',
    'ai_insights',
    'reports',
    'security',
    'audit',
    'support',
    'settings',
  ],
  teacher: [
    'dashboard',
    'my_work',
    'my_classes',
    'my_students',
    'teaching',
    'attendance',
    'assessment',
    'exam_routine',
    'progress',
    'my_routine',
    'live_classes',
    'my_documents',
    'join_schools',
    'notices',
    'notifications',
    'reports',
    'settings',
  ],
  student: [
    'dashboard',
    'todays_lessons',
    'classes',
    'routine',
    'lessons',
    'classwork',
    'homework',
    'assignment',
    'assessment',
    'results',
    'progress',
    'ranking',
    'documents',
    'notices',
    'notifications',
    'profile',
    'settings',
  ],
  guardian: [
    'dashboard',
    'child',
    'todays_lessons',
    'routine',
    'attendance',
    'homework',
    'assignments',
    'exams',
    'results',
    'progress',
    'fees',
    'documents',
    'notices',
    'notifications',
    'messages',
    'school_info',
    'profile',
    'support',
    'settings',
  ],
};

export function isValidAppRole(value: unknown): value is Role {
  return typeof value === 'string' && VALID_APP_ROLES.includes(value as Role);
}

export function sanitizeTabForRole(role: Role, requestedTab: string | null | undefined): string {
  const clean = (requestedTab ?? '').trim();
  if (!clean) return 'dashboard';
  return ROLE_ALLOWED_TABS[role].includes(clean) ? clean : 'dashboard';
}

export function canAccessRoleDashboard(
  session: AuthenticatedSession | null | undefined,
  targetRole: Role
): boolean {
  if (!session || !isValidAppRole(session.role)) {
    return false;
  }
  return session.role === targetRole;
}

export function resolveProtectedRouteAccess(
  authStatus: AuthStatus,
  session: AuthenticatedSession | null | undefined,
  requestedRole: Role | null | undefined,
  requestedTab: string | null | undefined
): ProtectedRouteDecision {
  if (authStatus === 'loading') {
    return {
      screen: 'loading',
      allowProtectedRender: false,
      effectiveRole: null,
      effectiveTab: null,
      accessDenied: false,
    };
  }

  if (authStatus !== 'authenticated' || !session || !isValidAppRole(session.role)) {
    return {
      screen: 'login_portal',
      allowProtectedRender: false,
      effectiveRole: null,
      effectiveTab: null,
      accessDenied: Boolean(requestedRole),
    };
  }

  const denied = Boolean(requestedRole && requestedRole !== session.role);
  return {
    screen: 'dashboard',
    allowProtectedRender: true,
    effectiveRole: session.role,
    effectiveTab: sanitizeTabForRole(session.role, requestedTab),
    accessDenied: denied,
  };
}

export function sanitizeBootstrapNavigation(
  search: string,
  session: AuthenticatedSession | null | undefined
): { role: Role | null; tab: string } {
  if (!session || !isValidAppRole(session.role)) {
    return { role: null, tab: 'dashboard' };
  }
  const params = new URLSearchParams(search || '');
  const requestedTab = params.get('tab');
  return {
    role: session.role,
    tab: sanitizeTabForRole(session.role, requestedTab),
  };
}

export function resolveGoogleUserRole(
  email: string | null | undefined,
  emailVerified: boolean,
  firestoreRole?: string | null,
  hasAdminRegistryDoc = false
): Role | null {
  const cleanEmail = (email ?? '').trim().toLowerCase();
  if (emailVerified && (cleanEmail === BOOT_ADMIN_EMAIL.toLowerCase() || hasAdminRegistryDoc)) {
    return 'central_admin';
  }
  if (isValidAppRole(firestoreRole)) {
    return firestoreRole;
  }
  return null;
}

export function isAuthorizedSuperAdminSession(
  session: AuthenticatedSession | null | undefined
): boolean {
  if (!session || session.role !== 'central_admin') return false;
  return session.provider === 'firebase_google' || session.provider === 'firebase_email';
}

export interface FirebaseAuthSnapshot {
  uid: string;
  email?: string | null;
  emailVerified: boolean;
}

/**
 * Reconciles a stored local session against live Firebase Auth state so stale or unverified
 * Firebase sessions in storage can never bypass Firebase verification on reload/reopen.
 */
export function reconcileAuthSessionWithFirebase(
  firebaseUser: FirebaseAuthSnapshot | null | undefined,
  storedSession: AuthenticatedSession | null | undefined
): {
  status: 'authenticated' | 'unauthenticated';
  session: AuthenticatedSession | null;
  clearStored: boolean;
} {
  if (!storedSession || !isValidAppRole(storedSession.role)) {
    return { status: 'unauthenticated', session: null, clearStored: Boolean(storedSession) };
  }

  if (storedSession.provider === 'firebase_google' || storedSession.provider === 'firebase_email') {
    if (!firebaseUser || !firebaseUser.emailVerified || firebaseUser.uid !== storedSession.uid) {
      return { status: 'unauthenticated', session: null, clearStored: true };
    }
    return { status: 'authenticated', session: storedSession, clearStored: false };
  }

  return { status: 'authenticated', session: storedSession, clearStored: false };
}

export function shouldBlockProtectedContent(
  authStatus: AuthStatus,
  decision: ProtectedRouteDecision
): boolean {
  return (
    authStatus !== 'authenticated' ||
    decision.screen !== 'dashboard' ||
    !decision.allowProtectedRender ||
    !decision.effectiveRole
  );
}


export function validateStoredSessionPayload(raw: unknown): AuthenticatedSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<AuthenticatedSession>;
  if (
    typeof candidate.uid !== 'string' ||
    candidate.uid.trim().length === 0 ||
    !isValidAppRole(candidate.role) ||
    typeof candidate.displayName !== 'string' ||
    candidate.displayName.trim().length === 0 ||
    typeof candidate.signedInAtIso !== 'string' ||
    candidate.signedInAtIso.trim().length === 0 ||
    (candidate.provider !== 'firebase_google' &&
      candidate.provider !== 'firebase_email' &&
      candidate.provider !== 'institutional_portal')
  ) {
    return null;
  }

  return {
    uid: candidate.uid.trim(),
    role: candidate.role,
    displayName: candidate.displayName.trim(),
    email: typeof candidate.email === 'string' ? candidate.email.trim() : undefined,
    phone: typeof candidate.phone === 'string' ? candidate.phone.trim() : undefined,
    provider: candidate.provider,
    schoolId: typeof candidate.schoolId === 'string' ? candidate.schoolId.trim() : undefined,
    teacherId: typeof candidate.teacherId === 'string' ? candidate.teacherId.trim() : undefined,
    studentId: typeof candidate.studentId === 'string' ? candidate.studentId.trim() : undefined,
    guardianMobile:
      typeof candidate.guardianMobile === 'string' ? candidate.guardianMobile.trim() : undefined,
    signedInAtIso: candidate.signedInAtIso.trim(),
  };
}

export function readStoredPortalSession(
  storage?: Pick<Storage, 'getItem'> | null
): AuthenticatedSession | null {
  const store =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined'
        ? window.localStorage
        : null;
  if (!store) return null;
  try {
    const raw = store.getItem(PORTAL_SESSION_STORAGE_KEY);
    if (!raw) return null;
    return validateStoredSessionPayload(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function persistPortalSession(
  session: AuthenticatedSession,
  storage?: Pick<Storage, 'setItem'> | null
): void {
  const store =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined'
        ? window.localStorage
        : null;
  if (!store) return;
  try {
    store.setItem(PORTAL_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore storage quota failures
  }
}

export function clearStoredPortalSession(
  storage?: Pick<Storage, 'removeItem'> | null
): void {
  const store =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined'
        ? window.localStorage
        : null;
  if (!store) return;
  try {
    store.removeItem(PORTAL_SESSION_STORAGE_KEY);
  } catch {
    // ignore storage removal errors
  }
}

export interface TeacherAuthResult {
  ok: boolean;
  teacher?: TeacherRecord;
  errorBn?: string;
  errorEn?: string;
}

export function authenticateTeacherAccount(
  teachers: TeacherRecord[],
  identifier: string,
  password: string
): TeacherAuthResult {
  const idClean = identifier.trim().toLowerCase();
  const passClean = password.trim();
  if (!idClean || !passClean) {
    return {
      ok: false,
      errorBn: 'Teacher ID / মোবাইল এবং পাসওয়ার্ড দিন।',
      errorEn: 'Teacher ID / Mobile and Password are required.',
    };
  }

  const matched = teachers.find((t) => {
    const code = t.teacherCode.toLowerCase();
    const id = t.id.toLowerCase();
    const mobile = t.mobile.toLowerCase();
    const email = (t.email ?? '').toLowerCase();
    const isRahimAlias =
      (idClean === 'tch_rahim' || idClean === 'teacher') && t.id === 'tch-2';
    const isSumaiyaAlias = idClean === 'tch_sumaiya' && t.id === 'tch-3';
    return (
      code === idClean ||
      id === idClean ||
      mobile === idClean ||
      (email.length > 0 && email === idClean) ||
      isRahimAlias ||
      isSumaiyaAlias
    );
  });

  if (!matched) {
    return {
      ok: false,
      errorBn: 'প্রদত্ত Teacher ID বা মোবাইলের কোনো শিক্ষক খুঁজে পাওয়া যায়নি।',
      errorEn: 'No registered teacher found matching that Teacher ID or mobile.',
    };
  }

  if (
    matched.status === 'deactivated' ||
    matched.status === 'archived' ||
    matched.status === 'rejected' ||
    matched.status === 'suspended'
  ) {
    return {
      ok: false,
      errorBn: `${matched.nameBn} বর্তমানে ${matched.status} অবস্থায় আছেন — লগইন অনুমোদিত নয়।`,
      errorEn: `${matched.nameEn} is currently ${matched.status} and cannot sign in.`,
    };
  }

  if (passClean !== 'teacher@123') {
    return {
      ok: false,
      errorBn: 'শিক্ষক পাসওয়ার্ড সঠিক নয় (ডেমো: teacher@123)।',
      errorEn: 'Incorrect teacher password (demo default: teacher@123).',
    };
  }

  return { ok: true, teacher: matched };
}

export interface GuardianAuthResult {
  ok: boolean;
  guardianMobile?: string;
  linkedStudentIds?: string[];
  errorBn?: string;
  errorEn?: string;
}

export function authenticateGuardianAccount(
  students: StudentRecord[],
  identifier: string,
  password: string
): GuardianAuthResult {
  const idClean = identifier.trim().toLowerCase();
  const passClean = password.trim();
  if (!idClean || !passClean) {
    return {
      ok: false,
      errorBn: 'অভিভাবকের মোবাইল নম্বর / লিংক কোড এবং পাসওয়ার্ড দিন।',
      errorEn: 'Guardian mobile / link code and password are required.',
    };
  }

  const normalizedMobile =
    idClean === 'guardian' || idClean === 'guardian_jamal' ? '01712345678' : idClean;

  const linkedStudents = students.filter(
    (st) =>
      st.guardianMobile.toLowerCase() === normalizedMobile ||
      st.guardianLinkCode.toLowerCase() === idClean
  );

  if (linkedStudents.length === 0) {
    return {
      ok: false,
      errorBn: 'এই মোবাইল বা Guardian Link Code-এর সাথে কোনো শিক্ষার্থী যুক্ত নেই।',
      errorEn: 'No student linked to that guardian mobile or link code.',
    };
  }

  const matchesLinkCode = linkedStudents.some(
    (st) => st.guardianLinkCode.toLowerCase() === passClean.toLowerCase()
  );

  if (passClean !== 'parent@123' && !matchesLinkCode) {
    return {
      ok: false,
      errorBn: 'অভিভাবক পাসওয়ার্ড সঠিক নয় (ডেমো: parent@123)।',
      errorEn: 'Incorrect guardian password (demo default: parent@123).',
    };
  }

  return {
    ok: true,
    guardianMobile: linkedStudents[0].guardianMobile,
    linkedStudentIds: linkedStudents.map((s) => s.id),
  };
}

export function mapFirebaseAuthErrorMessage(error: unknown, lang: 'bn' | 'en'): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';
  const rawMessage = error instanceof Error ? error.message : String(error ?? '');
  const haystack = `${code} ${rawMessage}`.toLowerCase();

  if (haystack.includes('auth/invalid-credential') || haystack.includes('auth/wrong-password')) {
    return lang === 'bn'
      ? 'ইমেইল বা পাসওয়ার্ড সঠিক নয়। ভুলে গেলে Account Recovery ট্যাব থেকে পাসওয়ার্ড রিসেট করুন।'
      : 'Incorrect email or password. Use Account Recovery to reset your password.';
  }
  if (haystack.includes('auth/user-not-found')) {
    return lang === 'bn'
      ? 'এই ইমেইলে কোনো Firebase অ্যাকাউন্ট পাওয়া যায়নি। নতুন অ্যাকাউন্ট তৈরি করুন।'
      : 'No Firebase account found for this email. Please create a new account first.';
  }
  if (haystack.includes('auth/email-already-in-use')) {
    return lang === 'bn'
      ? 'এই ইমেইল দিয়ে ইতিমধ্যেই অ্যাকাউন্ট তৈরি করা আছে। লগইন বা পাসওয়ার্ড রিসেট ব্যবহার করুন।'
      : 'An account already exists with this email. Sign in or use Password Reset.';
  }
  if (haystack.includes('auth/weak-password')) {
    return lang === 'bn'
      ? 'পাসওয়ার্ডটি অত্যন্ত দুর্বল — কমপক্ষে ৬ অক্ষরের শক্তিশালী পাসওয়ার্ড দিন।'
      : 'Password is too weak. Please enter at least 6 characters.';
  }
  if (haystack.includes('auth/invalid-email')) {
    return lang === 'bn'
      ? 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা লিখুন।'
      : 'Please enter a valid email address.';
  }
  if (haystack.includes('auth/operation-not-allowed')) {
    return lang === 'bn'
      ? 'Firebase Console -> Authentication -> Sign-in method এ গিয়ে Email/Password বা Google চালু (Enable) করুন।'
      : 'Enable Email/Password or Google sign-in in Firebase Console -> Authentication -> Sign-in method.';
  }
  if (haystack.includes('auth/unauthorized-domain')) {
    return lang === 'bn'
      ? 'এই ওয়েব ডোমেইনটি Firebase Console -> Authentication -> Authorized domains এ যোগ করা নেই।'
      : 'This web domain is not listed under Firebase Console -> Authentication -> Authorized domains.';
  }
  if (haystack.includes('auth/too-many-requests')) {
    return lang === 'bn'
      ? 'অতিরিক্ত প্রচেষ্টার কারণে সাময়িকভাবে ব্লক করা হয়েছে। কয়েক মিনিট পর আবার চেষ্টা করুন।'
      : 'Too many attempts detected. Please wait a few minutes and try again.';
  }
  if (haystack.includes('auth/popup-blocked') || haystack.includes('auth/popup-closed-by-user')) {
    return lang === 'bn'
      ? 'লগইন পপ-আপ বন্ধ বা ব্লক হয়েছে। ব্রাউজার পপ-আপ অনুমোদন দিন অথবা Email/Password দিয়ে লগইন করুন।'
      : 'Sign-in popup was closed or blocked. Allow popups or use Email/Password sign-in.';
  }
  if (haystack.includes('auth/network-request-failed')) {
    return lang === 'bn'
      ? 'ইন্টারনেট বা Firebase সার্ভারের সাথে সংযোগ পাওয়া যাচ্ছে না।'
      : 'Network error communicating with Firebase Authentication.';
  }
  return lang === 'bn'
    ? `Firebase যাচাইকরণ ত্রুটি: ${rawMessage || 'অনুগ্রহ করে পুনরায় চেষ্টা করুন।'}`
    : `Firebase authentication error: ${rawMessage || 'Please try again.'}`;
}

export interface CloudBackupSnapshotInput {
  ownerUid: string;
  email: string;
  role: Role | 'pending';
  displayName: string;
  language: 'bn' | 'en';
  themePreference: 'light' | 'dark' | 'system';
  schoolCount: number;
  teacherCount: number;
  studentCount: number;
  settingsVersion: number;
  note?: string;
  backupSettings: {
    appearance: {
      themePreference: 'light' | 'dark' | 'system';
      fontSize: string;
      layoutDensity: string;
    };
    regional: {
      country: string;
      timeZone: string;
      currency: string;
      numberFormat: 'bn' | 'en';
    };
    security: {
      twoFactorEnabled: boolean;
      otpVerificationRequired: boolean;
      loginAlerts: boolean;
      autoLogoutMinutes: number;
    };
    notifications: Record<string, boolean>;
  };
}

export function buildCloudBackupPayload(input: CloudBackupSnapshotInput): CloudBackupSnapshotInput {
  const safeUid = input.ownerUid.trim().replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 128) || 'uid';
  const safeEmail = input.email.trim().slice(0, 254);
  const safeName = (input.displayName.trim() || 'PSMS User').slice(0, 120);
  const clampInt = (n: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Number.isFinite(n) ? Math.trunc(n) : min));

  return {
    ownerUid: safeUid,
    email: safeEmail,
    role: input.role,
    displayName: safeName,
    language: input.language === 'en' ? 'en' : 'bn',
    themePreference:
      input.themePreference === 'dark' || input.themePreference === 'system'
        ? input.themePreference
        : 'light',
    schoolCount: clampInt(input.schoolCount, 0, 100000),
    teacherCount: clampInt(input.teacherCount, 0, 1000000),
    studentCount: clampInt(input.studentCount, 0, 10000000),
    settingsVersion: clampInt(input.settingsVersion, 1, 1000000),
    ...(input.note?.trim() ? { note: input.note.trim().slice(0, 240) } : {}),
    backupSettings: {
      appearance: {
        themePreference: input.backupSettings.appearance.themePreference,
        fontSize: String(input.backupSettings.appearance.fontSize || 'medium').slice(0, 32),
        layoutDensity: String(input.backupSettings.appearance.layoutDensity || 'comfortable').slice(0, 32),
      },
      regional: {
        country: String(input.backupSettings.regional.country || 'Bangladesh').slice(0, 64),
        timeZone: String(input.backupSettings.regional.timeZone || 'Asia/Dhaka (UTC+6)').slice(0, 64),
        currency: String(input.backupSettings.regional.currency || 'BDT (৳)').slice(0, 32),
        numberFormat: input.backupSettings.regional.numberFormat === 'en' ? 'en' : 'bn',
      },
      security: {
        twoFactorEnabled: Boolean(input.backupSettings.security.twoFactorEnabled),
        otpVerificationRequired: Boolean(input.backupSettings.security.otpVerificationRequired),
        loginAlerts: Boolean(input.backupSettings.security.loginAlerts),
        autoLogoutMinutes: clampInt(input.backupSettings.security.autoLogoutMinutes, 5, 240),
      },
      notifications: Object.fromEntries(
        Object.entries(input.backupSettings.notifications || {})
          .slice(0, 20)
          .map(([k, v]) => [k.slice(0, 40), Boolean(v)])
      ),
    },
  };
}

