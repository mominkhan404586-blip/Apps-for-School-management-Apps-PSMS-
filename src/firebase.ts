import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from 'firebase/app-check';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  doc as firestoreDoc,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  get as rtdbGet,
  getDatabase,
  onValue,
  push,
  ref as rtdbRef,
  serverTimestamp as rtdbServerTimestamp,
  set as rtdbSet,
  update as rtdbUpdate,
} from 'firebase/database';
import firebaseConfig from '../firebase-applet-config.json';
import {
  BOOT_ADMIN_EMAIL,
  buildCloudBackupPayload,
  resolveGoogleUserRole,
  type AuthenticatedSession,
  type CloudBackupSnapshotInput,
} from './utils/authGuard';
import {
  evaluateAppCheckConfig,
  isAccountLoginBlocked,
  type AppCheckConfigEvaluation,
} from './utils/firebaseDataSync';
import {
  RTDB_DATABASE_URL,
  applyRealtimeUserToSession,
  normalizeRtdbUserRecord,
  validateRealtimeUserAccountUpdate,
  type RealtimeSessionSyncOutcome,
  type RealtimeSyncTestProbe,
  type RealtimeUserAccountInput,
  type RealtimeUserAccountRecord,
  type RealtimeUserChangeLog,
  type RealtimeValidationResult,
} from './utils/realtimeDatabaseSync';
import type { Role } from './types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const configuredDbId =
  typeof firebaseConfig.firestoreDatabaseId === 'string'
    ? firebaseConfig.firestoreDatabaseId.trim()
    : '';

const configuredRtdbUrl =
  typeof (firebaseConfig as { databaseURL?: string }).databaseURL === 'string' &&
  (firebaseConfig as { databaseURL?: string }).databaseURL?.trim()
    ? (firebaseConfig as { databaseURL?: string }).databaseURL!.trim()
    : RTDB_DATABASE_URL;

export const db =
  configuredDbId && configuredDbId !== '(default)'
    ? getFirestore(app, configuredDbId)
    : getFirestore(app);

export const rtdb = getDatabase(app, configuredRtdbUrl);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const envRecord = (
  import.meta as unknown as { env?: Record<string, string | undefined> }
).env;
const configuredRecaptchaSiteKey =
  envRecord?.VITE_FIREBASE_APP_CHECK_SITE_KEY?.trim() ||
  (typeof (firebaseConfig as { recaptchaSiteKey?: string }).recaptchaSiteKey === 'string'
    ? (firebaseConfig as { recaptchaSiteKey?: string }).recaptchaSiteKey!.trim()
    : '');
const configuredDebugToken = envRecord?.VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN?.trim() || '';

let appCheckInstance: AppCheck | null = null;
if (typeof window !== 'undefined') {
  if (configuredDebugToken) {
    (window as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN =
      configuredDebugToken === 'true' ? true : configuredDebugToken;
  }
  if (configuredRecaptchaSiteKey.length >= 10) {
    try {
      appCheckInstance = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(configuredRecaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch {
      // Non-blocking in local/preview environments
    }
  }
}

export function getFirebaseAppCheckStatus(): AppCheckConfigEvaluation & { initialized: boolean } {
  const evalResult = evaluateAppCheckConfig(configuredRecaptchaSiteKey, configuredDebugToken);
  return {
    ...evalResult,
    initialized: Boolean(appCheckInstance),
  };
}

export function getActiveFirebaseProjectInfo(): {
  projectId: string;
  databaseId: string;
  databaseURL: string;
  mediaCollection: string;
  billingPlan: string;
  appCheckConfigured: boolean;
} {
  return {
    projectId: firebaseConfig.projectId,
    databaseId: configuredDbId || '(default)',
    databaseURL: configuredRtdbUrl,
    mediaCollection: 'media_assets (Firestore Free Tier)',
    billingPlan: 'Spark Free Plan ($0 / No Card)',
    appCheckConfigured: evaluateAppCheckConfig(configuredRecaptchaSiteKey, configuredDebugToken).configured,
  };
}

if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    // Fallback to default persistence in restricted storage environments
  });
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export interface FirestoreUserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  role: Role | 'pending';
  schoolId?: string;
  teacherId?: string;
  studentId?: string;
  status: 'active' | 'pending' | 'suspended' | 'rejected' | 'deactivated';
  isActive?: boolean;
}

export async function signInWithFirebaseGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signInWithFirebaseEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  return result.user;
}

export async function registerWithFirebaseEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName.trim()) {
    await updateProfile(result.user, { displayName: displayName.trim().slice(0, 120) });
  }
  await sendEmailVerification(result.user);
  return result.user;
}

export async function resendFirebaseVerificationEmail(): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('No active Firebase user to verify.');
  }
  await sendEmailVerification(auth.currentUser);
}

export async function reloadCurrentFirebaseUser(): Promise<User | null> {
  if (!auth.currentUser) return null;
  await auth.currentUser.reload();
  return auth.currentUser;
}

export async function sendFirebasePasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function changeFirebaseUserPassword(
  email: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const cleanEmail = email.trim();
  const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, currentPassword);
  const credential = EmailAuthProvider.credential(cleanEmail, currentPassword);
  await reauthenticateWithCredential(userCredential.user, credential);
  await updatePassword(userCredential.user, newPassword);
  await signOut(auth);
}

export async function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  if (!auth.currentUser) return null;
  return auth.currentUser.getIdToken(forceRefresh);
}

export async function signOutFirebase(): Promise<void> {
  if (auth.currentUser) {
    await signOut(auth);
  }
}

export async function resolveAndSyncFirebaseUser(
  firebaseUser: User
): Promise<{
  session: AuthenticatedSession | null;
  pendingRoleSelection: boolean;
  unverifiedEmail?: boolean;
  blockedReasonBn?: string;
  blockedReasonEn?: string;
}> {
  if (!firebaseUser.emailVerified) {
    return {
      session: null,
      pendingRoleSelection: false,
      unverifiedEmail: true,
    };
  }

  const userPath = `users/${firebaseUser.uid}`;
  let existingData: FirestoreUserProfile | null = null;
  let hasAdminDoc = false;

  try {
    const [userSnap, adminSnap] = await Promise.all([
      getDoc(doc(db, 'users', firebaseUser.uid)),
      getDoc(doc(db, 'admins', firebaseUser.uid)).catch(() => null),
    ]);
    if (userSnap.exists()) {
      existingData = userSnap.data() as FirestoreUserProfile;
    }
    if (adminSnap && adminSnap.exists()) {
      hasAdminDoc = true;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.toLowerCase().includes('offline') && !msg.toLowerCase().includes('permission')) {
      handleFirestoreError(error, OperationType.GET, userPath);
    }
  }

  const isAdminEmail =
    firebaseUser.emailVerified &&
    (firebaseUser.email ?? '').trim().toLowerCase() === BOOT_ADMIN_EMAIL.toLowerCase();

  if (!isAdminEmail && existingData) {
    const blockCheck = isAccountLoginBlocked(existingData);
    if (blockCheck.blocked) {
      return {
        session: null,
        pendingRoleSelection: false,
        blockedReasonBn: blockCheck.reasonBn,
        blockedReasonEn: blockCheck.reasonEn,
      };
    }
  }

  const resolvedRole = resolveGoogleUserRole(
    firebaseUser.email,
    firebaseUser.emailVerified,
    existingData?.role ?? null,
    hasAdminDoc
  );

  if (isAdminEmail) {
    const safeEmail = firebaseUser.email ?? BOOT_ADMIN_EMAIL;
    const displayName = firebaseUser.displayName?.trim() || 'Super Central Admin';

    if (!hasAdminDoc) {
      try {
        await setDoc(doc(db, 'admins', firebaseUser.uid), {
          uid: firebaseUser.uid,
          email: safeEmail,
          displayName,
          accessLevel: 'Super Central Admin',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (!msg.toLowerCase().includes('offline')) {
          handleFirestoreError(error, OperationType.WRITE, `admins/${firebaseUser.uid}`);
        }
      }
    }

    if (!existingData) {
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          uid: firebaseUser.uid,
          email: safeEmail,
          displayName,
          role: 'central_admin',
          status: 'active',
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (!msg.toLowerCase().includes('offline')) {
          handleFirestoreError(error, OperationType.WRITE, userPath);
        }
      }
    } else if (
      existingData.role !== 'central_admin' ||
      existingData.status !== 'active' ||
      existingData.isActive !== true
    ) {
      try {
        await setDoc(
          doc(db, 'users', firebaseUser.uid),
          {
            ...existingData,
            role: 'central_admin',
            status: 'active',
            isActive: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (!msg.toLowerCase().includes('offline')) {
          handleFirestoreError(error, OperationType.UPDATE, userPath);
        }
      }
    }
  } else if (!existingData && firebaseUser.emailVerified && firebaseUser.email) {
    try {
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName?.trim() || 'Portal User',
        role: hasAdminDoc ? 'central_admin' : 'pending',
        status: hasAdminDoc ? 'active' : 'pending',
        isActive: hasAdminDoc,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (!msg.toLowerCase().includes('offline') && !msg.toLowerCase().includes('permission')) {
        handleFirestoreError(error, OperationType.WRITE, userPath);
      }
    }
  }

  if (isAdminEmail && firebaseUser.email) {
    try {
      await rtdbUpdate(rtdbRef(rtdb, `admins/${firebaseUser.uid}`), {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName?.trim() || 'Super Central Admin',
        accessLevel: 'Super Central Admin',
        createdAt: rtdbServerTimestamp(),
        updatedAt: rtdbServerTimestamp(),
      });
    } catch {
      // Realtime Database rules may not yet be applied in Firebase Console; non-blocking on sign-in
    }
  }

  if (resolvedRole && existingData?.status !== 'suspended' && firebaseUser.email) {
    try {
      await rtdbUpdate(rtdbRef(rtdb, `users/${firebaseUser.uid}`), {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: existingData?.displayName || firebaseUser.displayName?.trim() || 'PSMS User',
        role: resolvedRole,
        status: existingData?.status ?? 'active',
        isActive: existingData ? existingData.isActive !== false && existingData.status === 'active' : true,
        ...(existingData?.schoolId ? { schoolId: existingData.schoolId } : {}),
        ...(existingData?.teacherId ? { teacherId: existingData.teacherId } : {}),
        ...(existingData?.studentId ? { studentId: existingData.studentId } : {}),
        updatedByUid: firebaseUser.uid,
        updatedAt: rtdbServerTimestamp(),
      });
    } catch {
      // Non-blocking if RTDB rules are not yet pasted in Firebase Console
    }
  }

  if (!resolvedRole || (existingData && existingData.status !== 'active' && !isAdminEmail)) {
    return { session: null, pendingRoleSelection: true };
  }

  const isGoogle = firebaseUser.providerData?.some((p) => p.providerId === 'google.com');

  return {
    pendingRoleSelection: false,
    session: {
      uid: firebaseUser.uid,
      role: resolvedRole,
      displayName: existingData?.displayName || firebaseUser.displayName || 'PSMS User',
      email: firebaseUser.email ?? existingData?.email,
      provider: isGoogle ? 'firebase_google' : 'firebase_email',
      schoolId: existingData?.schoolId,
      teacherId: existingData?.teacherId,
      studentId: existingData?.studentId,
      signedInAtIso: new Date().toISOString(),
    },
  };
}

export async function recordFirebaseAuditEvent(payload: {
  role: Role;
  what: string;
  targetName: string;
  schoolId?: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const path = 'audit_logs';
  try {
    await addDoc(collection(db, path), {
      createdByUid: user.uid,
      role: payload.role,
      what: payload.what.slice(0, 240),
      targetName: payload.targetName.slice(0, 240),
      ...(payload.schoolId ? { schoolId: payload.schoolId.slice(0, 64) } : {}),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.toLowerCase().includes('offline')) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
}

export async function saveCloudAppBackup(
  input: Omit<CloudBackupSnapshotInput, 'ownerUid' | 'email' | 'displayName'>
): Promise<{ ok: boolean; savedAtIso: string; path: string }> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified || !user.email) {
    throw new Error('Firebase verified account sign-in is required to save Cloud Backup.');
  }
  const path = `cloud_backups/${user.uid}`;
  const safePayload = buildCloudBackupPayload({
    ...input,
    ownerUid: user.uid,
    email: user.email,
    displayName: user.displayName || 'PSMS User',
  });

  try {
    const existingSnap = await getDoc(doc(db, 'cloud_backups', user.uid));
    const existingData = existingSnap.exists() ? existingSnap.data() : null;
    await setDoc(doc(db, 'cloud_backups', user.uid), {
      ...safePayload,
      createdAt: existingData?.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return {
      ok: true,
      savedAtIso: new Date().toISOString(),
      path,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadCloudAppBackup(): Promise<(CloudBackupSnapshotInput & { updatedAtLabel: string }) | null> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    throw new Error('Firebase verified account sign-in is required to restore Cloud Backup.');
  }
  const path = `cloud_backups/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'cloud_backups', user.uid));
    if (!snap.exists()) return null;
    const raw = snap.data() as CloudBackupSnapshotInput & {
      updatedAt?: { toDate?: () => Date };
    };
    const updatedDate = raw.updatedAt?.toDate ? raw.updatedAt.toDate() : new Date();
    return {
      ...raw,
      updatedAtLabel: updatedDate.toISOString().replace('T', ' ').slice(0, 16),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeRtdbConnectionStatus(
  onStatus: (connected: boolean) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const connRef = rtdbRef(rtdb, '.info/connected');
  return onValue(
    connRef,
    (snapshot) => {
      onStatus(Boolean(snapshot.val()));
    },
    () => {
      onStatus(false);
    }
  );
}

export function subscribeRealtimeUserAccount(
  uid: string,
  onData: (
    record: RealtimeUserAccountRecord | null,
    meta?: { changedFields: string[]; receivedAtIso: string }
  ) => void,
  onError?: (errMsg: string) => void
): () => void {
  const cleanUid = uid.trim();
  if (!cleanUid) return () => {};
  const userRef = rtdbRef(rtdb, `users/${cleanUid}`);
  let prevRecord: RealtimeUserAccountRecord | null = null;
  return onValue(
    userRef,
    (snapshot) => {
      const val = snapshot.val() as Record<string, unknown> | null;
      const next = normalizeRtdbUserRecord(cleanUid, val);
      const changedFields: string[] = [];
      if (next && prevRecord) {
        (['displayName', 'email', 'phone', 'role', 'status', 'schoolId', 'teacherId', 'studentId'] as const).forEach(
          (k) => {
            if (prevRecord?.[k] !== next[k]) {
              changedFields.push(k);
            }
          }
        );
      }
      prevRecord = next;
      onData(next, { changedFields, receivedAtIso: new Date().toISOString() });
    },
    (error) => {
      onError?.(error instanceof Error ? error.message : String(error));
    }
  );
}

export { applyRealtimeUserToSession, type RealtimeSessionSyncOutcome };

export function subscribeRealtimeAllUsers(
  onData: (records: RealtimeUserAccountRecord[]) => void,
  onError?: (errMsg: string) => void
): () => void {
  const usersRef = rtdbRef(rtdb, 'users');
  return onValue(
    usersRef,
    (snapshot) => {
      const raw = snapshot.val() as Record<string, Record<string, unknown>> | null;
      if (!raw || typeof raw !== 'object') {
        onData([]);
        return;
      }
      const list = Object.entries(raw)
        .map(([uid, item]) => normalizeRtdbUserRecord(uid, item))
        .filter((item): item is RealtimeUserAccountRecord => item !== null)
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      onData(list);
    },
    (error) => {
      onError?.(error instanceof Error ? error.message : String(error));
    }
  );
}

export function subscribeRealtimeUserChangeLogs(
  uid: string,
  onData: (logs: RealtimeUserChangeLog[]) => void,
  onError?: (errMsg: string) => void
): () => void {
  if (!uid.trim()) return () => {};
  const logsRef = rtdbRef(rtdb, `user_change_logs/${uid.trim()}`);
  return onValue(
    logsRef,
    (snapshot) => {
      const raw = snapshot.val() as Record<string, Record<string, unknown>> | null;
      if (!raw || typeof raw !== 'object') {
        onData([]);
        return;
      }
      const list: RealtimeUserChangeLog[] = Object.entries(raw)
        .map(([id, item]) => ({
          id,
          uid: typeof item.uid === 'string' ? item.uid : uid,
          changedByUid: typeof item.changedByUid === 'string' ? item.changedByUid : uid,
          field: typeof item.field === 'string' ? item.field : 'profile',
          oldValue: typeof item.oldValue === 'string' ? item.oldValue : '',
          newValue: typeof item.newValue === 'string' ? item.newValue : '',
          validationStatus: item.validationStatus === 'invalid' ? ('invalid' as const) : ('valid' as const),
          updatedAt:
            typeof item.updatedAt === 'number' || typeof item.updatedAt === 'string'
              ? item.updatedAt
              : Date.now(),
        }))
        .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
        .slice(0, 20);
      onData(list);
    },
    (error) => {
      onError?.(error instanceof Error ? error.message : String(error));
    }
  );
}

export interface UpdateRealtimeUserAccountResult {
  ok: boolean;
  validation: RealtimeValidationResult;
  errorCode?: 'VALIDATION_ERROR' | 'AUTH_REQUIRED' | 'PERMISSION_DENIED' | 'WRITE_FAILED';
  errorMessage?: string;
}

export async function getRealtimeUserAccount(
  uid: string
): Promise<RealtimeUserAccountRecord | null> {
  const cleanUid = uid.trim();
  if (!cleanUid) return null;
  try {
    const snap = await rtdbGet(rtdbRef(rtdb, `users/${cleanUid}`));
    if (!snap.exists()) return null;
    return normalizeRtdbUserRecord(cleanUid, snap.val() as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function updateRealtimeUserAccount(
  targetUid: string,
  current: Partial<RealtimeUserAccountRecord>,
  next: RealtimeUserAccountInput
): Promise<UpdateRealtimeUserAccountResult> {
  const currentUser = auth.currentUser;
  const cleanTargetUid = targetUid.trim() || currentUser?.uid || '';

  let existingRtdb: RealtimeUserAccountRecord | null = null;
  if (cleanTargetUid && currentUser?.emailVerified) {
    existingRtdb = await getRealtimeUserAccount(cleanTargetUid);
  }

  const effectiveCurrent: Partial<RealtimeUserAccountRecord> = {
    ...existingRtdb,
    ...current,
    ...(existingRtdb?.schoolId !== undefined && current.schoolId === undefined
      ? { schoolId: existingRtdb.schoolId }
      : {}),
    ...(existingRtdb?.teacherId !== undefined && current.teacherId === undefined
      ? { teacherId: existingRtdb.teacherId }
      : {}),
    ...(existingRtdb?.studentId !== undefined && current.studentId === undefined
      ? { studentId: existingRtdb.studentId }
      : {}),
  };

  const validation = validateRealtimeUserAccountUpdate(effectiveCurrent, next);
  if (!validation.valid) {
    return {
      ok: false,
      validation,
      errorCode: 'VALIDATION_ERROR',
      errorMessage: 'Validation failed: one or more fields contain invalid values.',
    };
  }

  if (!currentUser || !currentUser.emailVerified) {
    return {
      ok: false,
      validation,
      errorCode: 'AUTH_REQUIRED',
      errorMessage: 'Verified Firebase Authentication sign-in is required to sync Realtime Database.',
    };
  }

  const { normalized } = validation;
  const resolvedSchoolId =
    next.schoolId !== undefined ? next.schoolId.trim().slice(0, 64) : (effectiveCurrent.schoolId ?? '').slice(0, 64);
  const resolvedTeacherId =
    next.teacherId !== undefined ? next.teacherId.trim().slice(0, 64) : (effectiveCurrent.teacherId ?? '').slice(0, 64);
  const resolvedStudentId =
    next.studentId !== undefined ? next.studentId.trim().slice(0, 64) : (effectiveCurrent.studentId ?? '').slice(0, 64);

  const rtdbPayload: Record<string, unknown> = {
    uid: cleanTargetUid,
    email: normalized.email,
    displayName: normalized.displayName,
    phone: normalized.phone,
    recoveryEmail: normalized.recoveryEmail,
    recoveryPhone: normalized.recoveryPhone,
    role: normalized.role,
    status: normalized.status,
    isActive: normalized.status === 'active',
    updatedByUid: currentUser.uid,
    updatedAt: rtdbServerTimestamp(),
  };
  if (resolvedSchoolId || existingRtdb?.schoolId !== undefined) {
    rtdbPayload.schoolId = resolvedSchoolId;
  }
  if (resolvedTeacherId || existingRtdb?.teacherId !== undefined) {
    rtdbPayload.teacherId = resolvedTeacherId;
  }
  if (resolvedStudentId || existingRtdb?.studentId !== undefined) {
    rtdbPayload.studentId = resolvedStudentId;
  }

  try {
    await rtdbUpdate(rtdbRef(rtdb, `users/${cleanTargetUid}`), rtdbPayload);

    const changedDiffs = validation.fieldDiffs.filter((d) => d.changed);
    for (const diff of changedDiffs) {
      const logNode = push(rtdbRef(rtdb, `user_change_logs/${cleanTargetUid}`));
      await rtdbSet(logNode, {
        uid: cleanTargetUid,
        changedByUid: currentUser.uid,
        field: diff.field,
        oldValue: diff.oldValue.slice(0, 300),
        newValue: diff.newValue.slice(0, 300),
        validationStatus: diff.valid ? 'valid' : 'invalid',
        updatedAt: rtdbServerTimestamp(),
      });
    }

    if (cleanTargetUid === currentUser.uid && normalized.displayName !== (currentUser.displayName ?? '')) {
      await updateProfile(currentUser, { displayName: normalized.displayName }).catch(() => {});
    }

    const isBootAdmin =
      (currentUser.email ?? '').trim().toLowerCase() === BOOT_ADMIN_EMAIL.toLowerCase();

    if (cleanTargetUid === currentUser.uid && !isBootAdmin) {
      await updateDoc(firestoreDoc(db, 'users', cleanTargetUid), {
        displayName: normalized.displayName,
        phone: normalized.phone,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    } else {
      await setDoc(
        doc(db, 'users', cleanTargetUid),
        {
          uid: cleanTargetUid,
          email: normalized.email,
          displayName: normalized.displayName,
          ...(normalized.phone ? { phone: normalized.phone } : {}),
          role: normalized.role,
          status: normalized.status,
          isActive: normalized.status === 'active',
          ...(resolvedSchoolId ? { schoolId: resolvedSchoolId } : {}),
          ...(resolvedTeacherId ? { teacherId: resolvedTeacherId } : {}),
          ...(resolvedStudentId ? { studentId: resolvedStudentId } : {}),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ).catch(() => {});
    }

    return { ok: true, validation };
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const isPermDenied = rawMsg.toLowerCase().includes('permission_denied') || rawMsg.toLowerCase().includes('permission denied');
    return {
      ok: false,
      validation,
      errorCode: isPermDenied ? 'PERMISSION_DENIED' : 'WRITE_FAILED',
      errorMessage: rawMsg,
    };
  }
}

export async function sendRealtimeSyncTestProbe(message: string): Promise<{
  ok: boolean;
  probe?: RealtimeSyncTestProbe;
  errorCode?: 'AUTH_REQUIRED' | 'PERMISSION_DENIED' | 'WRITE_FAILED';
  errorMessage?: string;
}> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    return {
      ok: false,
      errorCode: 'AUTH_REQUIRED',
      errorMessage: 'Verified Firebase Auth sign-in is required to write live RTDB sync test probes.',
    };
  }

  const probeId = `PROBE-${Date.now().toString(36).toUpperCase()}`;
  const cleanMessage = (message || 'Live RTDB Sync Check').trim().slice(0, 240);
  const clientSentAtMs = Date.now();
  const payload: RealtimeSyncTestProbe = {
    probeId,
    actorUid: user.uid,
    actorEmail: user.email || '',
    message: cleanMessage,
    clientSentAtMs,
  };

  try {
    await rtdbSet(rtdbRef(rtdb, `rtdb_sync_tests/${user.uid}`), {
      ...payload,
      serverAckAt: rtdbServerTimestamp(),
    });
    return { ok: true, probe: payload };
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const isPermDenied =
      rawMsg.toLowerCase().includes('permission_denied') ||
      rawMsg.toLowerCase().includes('permission denied');
    return {
      ok: false,
      errorCode: isPermDenied ? 'PERMISSION_DENIED' : 'WRITE_FAILED',
      errorMessage: rawMsg,
    };
  }
}

export function subscribeRealtimeSyncTestProbe(
  uid: string,
  onProbe: (probe: RealtimeSyncTestProbe | null) => void,
  onError?: (errMsg: string) => void
): () => void {
  const cleanUid = uid.trim();
  if (!cleanUid) return () => {};
  return onValue(
    rtdbRef(rtdb, `rtdb_sync_tests/${cleanUid}`),
    (snapshot) => {
      const raw = snapshot.val() as Record<string, unknown> | null;
      if (!raw || typeof raw !== 'object' || typeof raw.probeId !== 'string') {
        onProbe(null);
        return;
      }
      onProbe({
        probeId: raw.probeId,
        actorUid: typeof raw.actorUid === 'string' ? raw.actorUid : cleanUid,
        actorEmail: typeof raw.actorEmail === 'string' ? raw.actorEmail : '',
        message: typeof raw.message === 'string' ? raw.message : '',
        clientSentAtMs: typeof raw.clientSentAtMs === 'number' ? raw.clientSentAtMs : Date.now(),
        serverAckAt:
          typeof raw.serverAckAt === 'number' || typeof raw.serverAckAt === 'string'
            ? raw.serverAckAt
            : undefined,
      });
    },
    (error) => {
      onError?.(error instanceof Error ? error.message : String(error));
    }
  );
}

export interface RtdbAccountSnapshotRecord {
  uid: string;
  role: string;
  displayName: string;
  email: string;
  schoolId?: string;
  language: 'bn' | 'en';
  themePreference: 'light' | 'dark' | 'system';
  settingsJson?: string;
  updatedAt: number | string;
}

export async function saveRtdbAccountSnapshot(input: {
  role: Role;
  displayName: string;
  email?: string;
  schoolId?: string;
  language: 'bn' | 'en';
  themePreference: 'light' | 'dark' | 'system';
  settingsJson?: string;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    return { ok: false, errorMessage: 'Verified Firebase sign-in required.' };
  }
  try {
    await rtdbSet(rtdbRef(rtdb, `account_snapshots/${user.uid}`), {
      uid: user.uid,
      role: input.role,
      displayName: (input.displayName || user.displayName || 'PSMS User').slice(0, 120),
      email: (input.email || user.email || '').slice(0, 254),
      ...(input.schoolId ? { schoolId: input.schoolId.slice(0, 64) } : {}),
      language: input.language,
      themePreference: input.themePreference,
      ...(input.settingsJson ? { settingsJson: input.settingsJson.slice(0, 19500) } : {}),
      updatedAt: rtdbServerTimestamp(),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : String(err) };
  }
}

export async function loadRtdbAccountSnapshot(uid?: string): Promise<RtdbAccountSnapshotRecord | null> {
  const targetUid = uid?.trim() || auth.currentUser?.uid;
  if (!targetUid) return null;
  try {
    const snap = await rtdbGet(rtdbRef(rtdb, `account_snapshots/${targetUid}`));
    if (!snap.exists()) return null;
    const raw = snap.val() as Record<string, unknown>;
    return {
      uid: targetUid,
      role: typeof raw.role === 'string' ? raw.role : 'pending',
      displayName: typeof raw.displayName === 'string' ? raw.displayName : 'PSMS User',
      email: typeof raw.email === 'string' ? raw.email : '',
      schoolId: typeof raw.schoolId === 'string' ? raw.schoolId : undefined,
      language: raw.language === 'en' ? 'en' : 'bn',
      themePreference:
        raw.themePreference === 'dark' || raw.themePreference === 'system'
          ? raw.themePreference
          : 'light',
      settingsJson: typeof raw.settingsJson === 'string' ? raw.settingsJson : undefined,
      updatedAt:
        typeof raw.updatedAt === 'number' || typeof raw.updatedAt === 'string'
          ? raw.updatedAt
          : Date.now(),
    };
  } catch {
    return null;
  }
}

export async function syncOwnFirebaseProfile(patch: {
  displayName: string;
  phone?: string;
}): Promise<{ ok: boolean; syncedCloud: boolean; rtdbOk: boolean; errorCode?: 'PERMISSION_DENIED' | 'WRITE_FAILED' }> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    return { ok: false, syncedCloud: false, rtdbOk: false };
  }
  const cleanName = patch.displayName.trim().slice(0, 120);
  const cleanPhone = (patch.phone ?? '').trim().slice(0, 24);
  if (!cleanName) {
    return { ok: false, syncedCloud: false, rtdbOk: false };
  }

  await updateProfile(user, { displayName: cleanName }).catch(() => {});

  const fsOk = await updateDoc(doc(db, 'users', user.uid), {
    displayName: cleanName,
    phone: cleanPhone,
    updatedAt: serverTimestamp(),
  })
    .then(() => true)
    .catch(() => false);

  const existingRtdb = await getRealtimeUserAccount(user.uid);
  let errorCode: 'PERMISSION_DENIED' | 'WRITE_FAILED' | undefined;
  const rtdbOk = await rtdbUpdate(rtdbRef(rtdb, `users/${user.uid}`), {
    uid: user.uid,
    email: existingRtdb?.email || user.email || '',
    displayName: cleanName,
    phone: cleanPhone,
    recoveryPhone: cleanPhone,
    role: existingRtdb?.role || 'pending',
    status: existingRtdb?.status || 'pending',
    isActive: existingRtdb?.isActive ?? false,
    updatedByUid: user.uid,
    updatedAt: rtdbServerTimestamp(),
  })
    .then(() => true)
    .catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      errorCode = msg.toLowerCase().includes('permission') ? 'PERMISSION_DENIED' : 'WRITE_FAILED';
      return false;
    });

  return { ok: fsOk || rtdbOk, syncedCloud: fsOk || rtdbOk, rtdbOk, errorCode };
}

export interface RtdbSchoolProfilePatch {
  schoolId: string;
  nameBn?: string;
  nameEn?: string;
  headTeacher?: string;
  email?: string;
  mobile?: string;
  eiin?: string;
  fullAddress?: string;
  status?: string;
}

export interface RtdbTeacherPatch {
  teacherId: string;
  schoolId: string;
  nameBn?: string;
  nameEn?: string;
  email?: string;
  mobile?: string;
  designation?: string;
  status?: string;
}

export interface RtdbStudentPatch {
  studentId: string;
  schoolId: string;
  nameBn?: string;
  nameEn?: string;
  className?: string;
  section?: string;
  roll?: number | string;
  guardianMobile?: string;
  status?: string;
}

export function subscribeRtdbSchoolScope(
  schoolId: string,
  callbacks: {
    onProfile?: (patch: RtdbSchoolProfilePatch) => void;
    onTeachers?: (list: RtdbTeacherPatch[]) => void;
    onStudents?: (list: RtdbStudentPatch[]) => void;
    onError?: (err: string) => void;
  }
): () => void {
  const cleanSchoolId = schoolId.trim();
  if (!cleanSchoolId) return () => {};

  const unsubProfile = onValue(
    rtdbRef(rtdb, `schools/${cleanSchoolId}/profile`),
    (snapshot) => {
      const raw = snapshot.val() as Record<string, unknown> | null;
      if (!raw || typeof raw !== 'object') return;
      callbacks.onProfile?.({
        schoolId: cleanSchoolId,
        nameBn: typeof raw.nameBn === 'string' ? raw.nameBn : undefined,
        nameEn: typeof raw.nameEn === 'string' ? raw.nameEn : undefined,
        headTeacher: typeof raw.headTeacher === 'string' ? raw.headTeacher : undefined,
        email: typeof raw.email === 'string' ? raw.email : undefined,
        mobile: typeof raw.mobile === 'string' ? raw.mobile : undefined,
        eiin: typeof raw.eiin === 'string' ? raw.eiin : undefined,
        fullAddress: typeof raw.fullAddress === 'string' ? raw.fullAddress : undefined,
        status: typeof raw.status === 'string' ? raw.status : undefined,
      });
    },
    (err) => callbacks.onError?.(err instanceof Error ? err.message : String(err))
  );

  const unsubTeachers = onValue(
    rtdbRef(rtdb, `schools/${cleanSchoolId}/teachers`),
    (snapshot) => {
      const raw = snapshot.val() as Record<string, Record<string, unknown>> | null;
      if (!raw || typeof raw !== 'object') return;
      const list: RtdbTeacherPatch[] = Object.entries(raw).map(([tid, item]) => ({
        teacherId: typeof item.teacherId === 'string' ? item.teacherId : tid,
        schoolId: cleanSchoolId,
        nameBn: typeof item.nameBn === 'string' ? item.nameBn : undefined,
        nameEn: typeof item.nameEn === 'string' ? item.nameEn : undefined,
        email: typeof item.email === 'string' ? item.email : undefined,
        mobile: typeof item.mobile === 'string' ? item.mobile : undefined,
        designation: typeof item.designation === 'string' ? item.designation : undefined,
        status: typeof item.status === 'string' ? item.status : undefined,
      }));
      callbacks.onTeachers?.(list);
    },
    () => {}
  );

  const unsubStudents = onValue(
    rtdbRef(rtdb, `schools/${cleanSchoolId}/students`),
    (snapshot) => {
      const raw = snapshot.val() as Record<string, Record<string, unknown>> | null;
      if (!raw || typeof raw !== 'object') return;
      const list: RtdbStudentPatch[] = Object.entries(raw).map(([sid, item]) => ({
        studentId: typeof item.studentId === 'string' ? item.studentId : sid,
        schoolId: cleanSchoolId,
        nameBn: typeof item.nameBn === 'string' ? item.nameBn : undefined,
        nameEn: typeof item.nameEn === 'string' ? item.nameEn : undefined,
        className: typeof item.className === 'string' ? item.className : undefined,
        section: typeof item.section === 'string' ? item.section : undefined,
        roll: typeof item.roll === 'number' || typeof item.roll === 'string' ? item.roll : undefined,
        guardianMobile: typeof item.guardianMobile === 'string' ? item.guardianMobile : undefined,
        status: typeof item.status === 'string' ? item.status : undefined,
      }));
      callbacks.onStudents?.(list);
    },
    () => {}
  );

  return () => {
    unsubProfile();
    unsubTeachers();
    unsubStudents();
  };
}

