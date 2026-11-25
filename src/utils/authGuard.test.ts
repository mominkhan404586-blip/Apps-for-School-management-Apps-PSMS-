import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_STUDENTS, INITIAL_TEACHERS } from '../data/mockData';
import {
  BOOT_ADMIN_EMAIL,
  authenticateGuardianAccount,
  authenticateTeacherAccount,
  buildCloudBackupPayload,
  canAccessRoleDashboard,
  clearStoredPortalSession,
  mapFirebaseAuthErrorMessage,
  persistPortalSession,
  readStoredPortalSession,
  resolveGoogleUserRole,
  resolveProtectedRouteAccess,
  sanitizeBootstrapNavigation,
  sanitizeTabForRole,
  type AuthenticatedSession,
} from './authGuard';

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
}

test('Unauthenticated and loading states strictly block all dashboards and protected tabs', () => {
  const loading = resolveProtectedRouteAccess('loading', null, 'central_admin', 'schools');
  assert.equal(loading.screen, 'loading');
  assert.equal(loading.allowProtectedRender, false);
  assert.equal(loading.effectiveRole, null);

  const unauth = resolveProtectedRouteAccess('unauthenticated', null, 'central_admin', 'schools');
  assert.equal(unauth.screen, 'login_portal');
  assert.equal(unauth.allowProtectedRender, false);
  assert.equal(unauth.effectiveRole, null);
  assert.equal(unauth.accessDenied, true);

  assert.equal(canAccessRoleDashboard(null, 'central_admin'), false);
  assert.equal(canAccessRoleDashboard(null, 'student'), false);

  const navUnauth = sanitizeBootstrapNavigation('?role=central_admin&tab=schools&previewEmbed=1', null);
  assert.equal(navUnauth.role, null);
});

test('Strict RBAC locks each authenticated user strictly to their own role dashboard', () => {
  const teacherSession: AuthenticatedSession = {
    uid: 'tch-2',
    role: 'teacher',
    displayName: 'Md. Abdur Rahim',
    provider: 'institutional_portal',
    teacherId: 'tch-2',
    schoolId: 'GPS-1042',
    signedInAtIso: '2026-11-24T01:00:00.000Z',
  };

  assert.equal(canAccessRoleDashboard(teacherSession, 'teacher'), true);
  assert.equal(canAccessRoleDashboard(teacherSession, 'central_admin'), false);
  assert.equal(canAccessRoleDashboard(teacherSession, 'school_admin'), false);
  assert.equal(canAccessRoleDashboard(teacherSession, 'guardian'), false);
  assert.equal(canAccessRoleDashboard(teacherSession, 'student'), false);

  // Attempting to route to central_admin URL/role while logged in as teacher stays locked on teacher
  const decision = resolveProtectedRouteAccess('authenticated', teacherSession, 'central_admin', 'schools');
  assert.equal(decision.screen, 'dashboard');
  assert.equal(decision.allowProtectedRender, true);
  assert.equal(decision.effectiveRole, 'teacher');
  assert.equal(decision.effectiveTab, 'dashboard'); // 'schools' is invalid for teacher -> falls back to 'dashboard'
  assert.equal(decision.accessDenied, true);

  // Valid tab for teacher is preserved
  assert.equal(sanitizeTabForRole('teacher', 'my_work'), 'my_work');

  // Deep link sanitization never allows switching to another role
  const nav = sanitizeBootstrapNavigation('?role=central_admin&tab=my_routine', teacherSession);
  assert.equal(nav.role, 'teacher');
  assert.equal(nav.tab, 'my_routine');
});

test('Google Firebase Auth email mapping grants central_admin ONLY when verified admin email or Firestore role exists', () => {
  assert.equal(resolveGoogleUserRole(BOOT_ADMIN_EMAIL, true, null), 'central_admin');
  // Spoofed/unverified email must NOT gain admin access
  assert.equal(resolveGoogleUserRole(BOOT_ADMIN_EMAIL, false, null), null);
  // Random Google user without Firestore role assignment does NOT gain admin access
  assert.equal(resolveGoogleUserRole('someone@gmail.com', true, null), null);
  // Google user with explicit Firestore role gets that exact role
  assert.equal(resolveGoogleUserRole('teacher@school.edu.bd', true, 'teacher'), 'teacher');
});

test('Teacher and Guardian institutional login validators enforce password verification', () => {
  const okTeacher = authenticateTeacherAccount(INITIAL_TEACHERS, 'tch_rahim', 'teacher@123');
  assert.equal(okTeacher.ok, true);
  assert.equal(okTeacher.teacher?.id, 'tch-2');

  const okTeacherCode = authenticateTeacherAccount(INITIAL_TEACHERS, 'TCH-GPS1042-02', 'teacher@123');
  assert.equal(okTeacherCode.ok, true);

  const badTeacherPass = authenticateTeacherAccount(INITIAL_TEACHERS, 'tch_rahim', 'wrong');
  assert.equal(badTeacherPass.ok, false);

  const okGuardian = authenticateGuardianAccount(INITIAL_STUDENTS, '01712345678', 'parent@123');
  assert.equal(okGuardian.ok, true);
  assert.ok((okGuardian.linkedStudentIds?.length ?? 0) > 0);

  const badGuardianPass = authenticateGuardianAccount(INITIAL_STUDENTS, '01712345678', 'wrong');
  assert.equal(badGuardianPass.ok, false);
});

test('Session persistence restores verified user on reload and clears completely on logout', () => {
  const storage = createMemoryStorage();
  assert.equal(readStoredPortalSession(storage), null);

  const studentSession: AuthenticatedSession = {
    uid: 'stu-rahim',
    role: 'student',
    displayName: 'Md. Rahim Uddin',
    provider: 'institutional_portal',
    studentId: 'stu-rahim',
    schoolId: 'GPS-1042',
    signedInAtIso: '2026-11-24T01:05:00.000Z',
  };

  persistPortalSession(studentSession, storage);
  const restored = readStoredPortalSession(storage);
  assert.ok(restored);
  assert.equal(restored?.role, 'student');
  assert.equal(restored?.studentId, 'stu-rahim');

  // Corrupt payload fails closed
  storage.setItem('psms_verified_auth_session_v1', '{"role":"central_admin"}');
  assert.equal(readStoredPortalSession(storage), null);

  // Logout clears storage completely
  persistPortalSession(studentSession, storage);
  clearStoredPortalSession(storage);
  assert.equal(readStoredPortalSession(storage), null);
});

test('Firebase error mapper and firebase_email session validation work safely', () => {
  const storage = createMemoryStorage();
  const emailSession: AuthenticatedSession = {
    uid: 'fb-email-1',
    role: 'central_admin',
    displayName: 'Mominul Admin',
    email: 'admin@school.bd',
    provider: 'firebase_email',
    signedInAtIso: '2026-11-24T03:00:00.000Z',
  };
  persistPortalSession(emailSession, storage);
  assert.equal(readStoredPortalSession(storage)?.provider, 'firebase_email');

  const notAllowedBn = mapFirebaseAuthErrorMessage({ code: 'auth/operation-not-allowed' }, 'bn');
  assert.ok(notAllowedBn.includes('Email/Password'));
  const wrongPassEn = mapFirebaseAuthErrorMessage({ code: 'auth/invalid-credential' }, 'en');
  assert.ok(wrongPassEn.includes('Account Recovery'));
});

test('buildCloudBackupPayload enforces safe bounds and omits JSON strings', () => {
  const payload = buildCloudBackupPayload({
    ownerUid: 'uid-123!@#',
    email: '  admin@school.bd  ',
    role: 'central_admin',
    displayName: '',
    language: 'bn',
    themePreference: 'dark',
    schoolCount: -5,
    teacherCount: 42,
    studentCount: 999,
    settingsVersion: 3,
    note: 'Daily cloud snapshot',
    backupSettings: {
      appearance: {
        themePreference: 'dark',
        fontSize: 'medium',
        layoutDensity: 'comfortable',
      },
      regional: {
        country: 'Bangladesh',
        timeZone: 'Asia/Dhaka (UTC+6)',
        currency: 'BDT (৳)',
        numberFormat: 'bn',
      },
      security: {
        twoFactorEnabled: true,
        otpVerificationRequired: false,
        loginAlerts: true,
        autoLogoutMinutes: 30,
      },
      notifications: {
        push: true,
        email: false,
      },
    },
  });

  assert.equal(payload.ownerUid, 'uid-123');
  assert.equal(payload.email, 'admin@school.bd');
  assert.equal(payload.displayName, 'PSMS User');
  assert.equal(payload.schoolCount, 0);
  assert.equal(payload.teacherCount, 42);
  assert.equal(payload.backupSettings.security.twoFactorEnabled, true);
});

test('Super Central Admin requires Firebase Auth (mominkhan404586@gmail.com or Firestore admin doc) and legacy static password is removed', async () => {
  const { CENTRAL_ADMIN_CREDENTIALS, INITIAL_ADMIN_ACCOUNTS } = await import('../data/mockData');
  const { isAuthorizedSuperAdminSession } = await import('./authGuard');

  // Legacy hardcoded password must NOT exist on CENTRAL_ADMIN_CREDENTIALS
  assert.equal('password' in CENTRAL_ADMIN_CREDENTIALS, false);
  assert.equal(CENTRAL_ADMIN_CREDENTIALS.email, 'mominkhan404586@gmail.com');
  assert.equal(BOOT_ADMIN_EMAIL, 'mominkhan404586@gmail.com');

  const mainAdmin = INITIAL_ADMIN_ACCOUNTS.find((a) => a.isMainOwner);
  assert.ok(mainAdmin);
  assert.equal(mainAdmin?.email, 'mominkhan404586@gmail.com');
  assert.equal(mainAdmin?.accessLevel, 'Super Central Admin');

  // Firestore admins/{uid} doc also resolves to central_admin when verified
  assert.equal(resolveGoogleUserRole('delegate-admin@gmail.com', true, null, true), 'central_admin');
  assert.equal(resolveGoogleUserRole('delegate-admin@gmail.com', false, null, true), null);

  // Only Firebase-authenticated sessions qualify as authorized Super Central Admin sessions
  assert.equal(
    isAuthorizedSuperAdminSession({
      uid: 'uid-admin-1',
      role: 'central_admin',
      displayName: 'Md. Momin Khan',
      email: 'mominkhan404586@gmail.com',
      provider: 'firebase_email',
      signedInAtIso: '2026-11-24T04:00:00.000Z',
    }),
    true
  );
  assert.equal(
    isAuthorizedSuperAdminSession({
      uid: 'portal-central_admin',
      role: 'central_admin',
      displayName: 'Legacy',
      provider: 'institutional_portal',
      signedInAtIso: '2026-11-24T04:00:00.000Z',
    }),
    false
  );
});

test('reconcileAuthSessionWithFirebase rejects stale Firebase sessions when Firebase user is missing or unverified', async () => {
  const { reconcileAuthSessionWithFirebase, shouldBlockProtectedContent } = await import('./authGuard');

  const storedFirebaseSession: AuthenticatedSession = {
    uid: 'fb-uid-1',
    role: 'central_admin',
    displayName: 'Super Central Admin',
    email: BOOT_ADMIN_EMAIL,
    provider: 'firebase_email',
    signedInAtIso: '2026-11-25T00:00:00.000Z',
  };

  // Signed out or missing Firebase user -> must clear storage and reject
  const signedOut = reconcileAuthSessionWithFirebase(null, storedFirebaseSession);
  assert.equal(signedOut.status, 'unauthenticated');
  assert.equal(signedOut.session, null);
  assert.equal(signedOut.clearStored, true);

  // Unverified Firebase user -> must reject
  const unverified = reconcileAuthSessionWithFirebase(
    { uid: 'fb-uid-1', email: BOOT_ADMIN_EMAIL, emailVerified: false },
    storedFirebaseSession
  );
  assert.equal(unverified.status, 'unauthenticated');
  assert.equal(unverified.clearStored, true);

  // Matching verified Firebase user -> succeeds
  const verified = reconcileAuthSessionWithFirebase(
    { uid: 'fb-uid-1', email: BOOT_ADMIN_EMAIL, emailVerified: true },
    storedFirebaseSession
  );
  assert.equal(verified.status, 'authenticated');
  assert.equal(verified.session?.uid, 'fb-uid-1');
  assert.equal(verified.clearStored, false);

  // Loading & unauthenticated states must strictly block protected content
  assert.equal(
    shouldBlockProtectedContent('loading', resolveProtectedRouteAccess('loading', null, 'school_admin', 'performance')),
    true
  );
  assert.equal(
    shouldBlockProtectedContent('unauthenticated', resolveProtectedRouteAccess('unauthenticated', null, 'school_admin', 'performance')),
    true
  );

  // school_admin can access 'performance' tab
  assert.equal(sanitizeTabForRole('school_admin', 'performance'), 'performance');
});

