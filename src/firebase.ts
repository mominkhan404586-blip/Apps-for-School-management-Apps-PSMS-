import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  BOOT_ADMIN_EMAIL,
  buildCloudBackupPayload,
  resolveGoogleUserRole,
  type AuthenticatedSession,
  type CloudBackupSnapshotInput,
} from './utils/authGuard';
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

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const configuredDbId =
  typeof firebaseConfig.firestoreDatabaseId === 'string'
    ? firebaseConfig.firestoreDatabaseId.trim()
    : '';

export const db =
  configuredDbId && configuredDbId !== '(default)'
    ? getFirestore(app, configuredDbId)
    : getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function getActiveFirebaseProjectInfo(): { projectId: string; databaseId: string } {
  return {
    projectId: firebaseConfig.projectId,
    databaseId: configuredDbId || '(default)',
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
  role: Role | 'pending';
  schoolId?: string;
  teacherId?: string;
  studentId?: string;
  status: 'active' | 'pending' | 'suspended';
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
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (!msg.toLowerCase().includes('offline')) {
          handleFirestoreError(error, OperationType.WRITE, userPath);
        }
      }
    } else if (existingData.role !== 'central_admin' || existingData.status !== 'active') {
      try {
        await setDoc(
          doc(db, 'users', firebaseUser.uid),
          {
            ...existingData,
            role: 'central_admin',
            status: 'active',
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

  if (!resolvedRole || existingData?.status === 'suspended') {
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
