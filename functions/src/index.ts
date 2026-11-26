import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as functionsV1 from 'firebase-functions/v1';

const PROJECT_ID = 'school-management-apk';
const FIRESTORE_DATABASE_ID = 'ai-studio-schoolmanagement-5d63cd27-f6ca-432e-badb-c7d2f2e7d66d';
const RTDB_URL = 'https://school-management-apk-default-rtdb.asia-southeast1.firebasedatabase.app';
const STORAGE_BUCKET = 'school-management-apk.firebasestorage.app';
const BOOT_ADMIN_EMAIL = 'mominkhan404586@gmail.com';

const app = getApps().length ? getApps()[0] : initializeApp({
  projectId: PROJECT_ID,
  databaseURL: RTDB_URL,
  storageBucket: STORAGE_BUCKET,
});

const adminAuth = getAuth(app);
const adminDb = getFirestore(app, FIRESTORE_DATABASE_ID);
const adminRtdb = getDatabase(app);
const adminStorage = getStorage(app);

async function assertSuperAdminOrSchoolAdmin(
  callerUid: string | undefined,
  callerEmail: string | undefined,
  emailVerified: boolean | undefined,
  requiredSchoolId?: string,
  allowSchoolAdmin = false
): Promise<{ actorRole: 'central_admin' | 'school_admin'; schoolId?: string }> {
  if (!callerUid || !emailVerified) {
    throw new HttpsError('unauthenticated', 'Verified Firebase Authentication is required.');
  }

  if ((callerEmail ?? '').trim().toLowerCase() === BOOT_ADMIN_EMAIL.toLowerCase()) {
    return { actorRole: 'central_admin' };
  }

  const adminSnap = await adminDb.doc(`admins/${callerUid}`).get();
  if (adminSnap.exists && adminSnap.data()?.accessLevel === 'Super Central Admin') {
    return { actorRole: 'central_admin' };
  }

  if (allowSchoolAdmin && requiredSchoolId) {
    const userSnap = await adminDb.doc(`users/${callerUid}`).get();
    const u = userSnap.data();
    if (
      u &&
      u.role === 'school_admin' &&
      u.status === 'active' &&
      u.isActive !== false &&
      u.schoolId === requiredSchoolId
    ) {
      return { actorRole: 'school_admin', schoolId: requiredSchoolId };
    }
  }

  throw new HttpsError('permission-denied', 'Insufficient privileges for this operation.');
}

/**
 * Approves, rejects, suspends, or deactivates a user/application and syncs custom claims + RTDB + activityLogs.
 */
export const approveOrUpdateUserApplication = onCall({ region: 'asia-southeast1' }, async (request) => {
  const data = (request.data ?? {}) as {
    targetUid?: string;
    applicationId?: string;
    decision?: 'approve' | 'reject' | 'suspend' | 'deactivate' | 'reactivate';
    role?: 'central_admin' | 'school_admin' | 'teacher' | 'guardian' | 'student' | 'pending';
    schoolId?: string;
    note?: string;
  };

  const targetUid = String(data.targetUid ?? '').trim();
  const decision = data.decision ?? 'approve';
  const requestedRole = data.role ?? 'teacher';
  const schoolId = String(data.schoolId ?? '').trim();

  if (!targetUid) {
    throw new HttpsError('invalid-argument', 'targetUid is required.');
  }

  const caller = await assertSuperAdminOrSchoolAdmin(
    request.auth?.uid,
    request.auth?.token?.email,
    request.auth?.token?.email_verified,
    schoolId,
    requestedRole === 'teacher' || requestedRole === 'student' || requestedRole === 'guardian'
  );

  const isApprove = decision === 'approve' || decision === 'reactivate';
  const nextStatus =
    isApprove
      ? 'active'
      : decision === 'reject'
        ? 'rejected'
        : decision === 'suspend'
          ? 'suspended'
          : 'deactivated';
  const nextIsActive = isApprove;
  const effectiveRole = isApprove ? (requestedRole === 'pending' ? 'teacher' : requestedRole) : requestedRole;

  const userPatch: Record<string, unknown> = {
    role: effectiveRole,
    status: nextStatus,
    isActive: nextIsActive,
    ...(schoolId ? { schoolId } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await adminDb.doc(`users/${targetUid}`).set(userPatch, { merge: true });

  await adminAuth.setCustomUserClaims(targetUid, {
    role: effectiveRole,
    isActive: nextIsActive,
    ...(schoolId ? { schoolId } : {}),
  });

  await adminRtdb.ref(`users/${targetUid}`).update({
    role: effectiveRole,
    status: nextStatus,
    isActive: nextIsActive,
    ...(schoolId ? { schoolId } : {}),
    updatedByUid: request.auth?.uid ?? 'system',
    updatedAt: Date.now(),
  });

  if (data.applicationId) {
    await adminDb.doc(`applications/${String(data.applicationId).trim()}`).set(
      {
        status: isApprove ? 'approved' : decision === 'suspend' ? 'suspended' : 'rejected',
        reviewedByUid: request.auth?.uid ?? 'system',
        reviewNote: String(data.note ?? decision).slice(0, 300),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  await adminDb.collection('activityLogs').add({
    actorUid: request.auth?.uid ?? 'system',
    actorRole: caller.actorRole,
    actionType: `DECISION_${decision.toUpperCase()}`,
    targetType: 'user',
    targetId: targetUid,
    summary: `${decision} applied -> role=${effectiveRole}, status=${nextStatus}`,
    ...(schoolId ? { schoolId } : {}),
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    ok: true,
    targetUid,
    role: effectiveRole,
    status: nextStatus,
    isActive: nextIsActive,
  };
});

/**
 * Permanently deletes an entity (user, school, teacher, student) across Auth, Firestore, RTDB, and Storage.
 */
export const permanentDeleteAccountCascade = onCall({ region: 'asia-southeast1' }, async (request) => {
  await assertSuperAdminOrSchoolAdmin(
    request.auth?.uid,
    request.auth?.token?.email,
    request.auth?.token?.email_verified
  );

  const data = (request.data ?? {}) as {
    targetType?: 'user' | 'school' | 'teacher' | 'student';
    targetId?: string;
    schoolId?: string;
    reason?: string;
  };

  const targetType = data.targetType ?? 'user';
  const targetId = String(data.targetId ?? '').trim();
  const schoolId = String(data.schoolId ?? '').trim();
  if (!targetId) {
    throw new HttpsError('invalid-argument', 'targetId is required.');
  }

  const bucket = adminStorage.bucket();

  if (targetType === 'user') {
    await Promise.allSettled([
      adminDb.doc(`users/${targetId}/private/preferences`).delete(),
      adminDb.doc(`users/${targetId}`).delete(),
      adminDb.doc(`cloud_backups/${targetId}`).delete(),
      adminDb.doc(`admins/${targetId}`).delete(),
      adminRtdb.ref(`users/${targetId}`).remove(),
      adminRtdb.ref(`account_snapshots/${targetId}`).remove(),
      adminRtdb.ref(`user_change_logs/${targetId}`).remove(),
      adminRtdb.ref(`rtdb_sync_tests/${targetId}`).remove(),
      adminRtdb.ref(`presence/${targetId}`).remove(),
      bucket.deleteFiles({ prefix: `profile_photos/${targetId}/` }),
      bucket.deleteFiles({ prefix: `documents/${targetId}/` }),
      adminAuth.deleteUser(targetId),
    ]);
  } else if (targetType === 'school') {
    await Promise.allSettled([
      adminDb.doc(`schools/${targetId}`).delete(),
      adminRtdb.ref(`schools/${targetId}`).remove(),
      bucket.deleteFiles({ prefix: `school_covers/${targetId}/` }),
      bucket.deleteFiles({ prefix: `documents/${targetId}/` }),
    ]);
  } else if (targetType === 'teacher') {
    await Promise.allSettled([
      adminDb.doc(`teachers/${targetId}`).delete(),
      ...(schoolId ? [adminRtdb.ref(`schools/${schoolId}/teachers/${targetId}`).remove()] : []),
      bucket.deleteFiles({ prefix: `profile_photos/${targetId}/` }),
    ]);
  } else if (targetType === 'student') {
    await Promise.allSettled([
      adminDb.doc(`students/${targetId}`).delete(),
      ...(schoolId ? [adminRtdb.ref(`schools/${schoolId}/students/${targetId}`).remove()] : []),
      bucket.deleteFiles({ prefix: `profile_photos/${targetId}/` }),
    ]);
  }

  await adminDb.collection('activityLogs').add({
    actorUid: request.auth?.uid ?? 'system',
    actorRole: 'central_admin',
    actionType: 'PERMANENT_CASCADE_DELETE',
    targetType,
    targetId,
    summary: `Permanent delete (${targetType}:${targetId}): ${String(data.reason ?? 'Admin cleanup').slice(0, 180)}`,
    ...(schoolId ? { schoolId } : {}),
    createdAt: FieldValue.serverTimestamp(),
  });

  return { ok: true, targetType, targetId };
});

/**
 * Firestore trigger: records immutable activity log whenever a new registration application is submitted.
 */
export const onApplicationCreated = onDocumentCreated(
  {
    document: 'applications/{applicationId}',
    database: FIRESTORE_DATABASE_ID,
    region: 'asia-southeast1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const appData = snap.data();
    await adminDb.collection('activityLogs').add({
      actorUid: String(appData.applicantUid ?? 'system'),
      actorRole: String(appData.requestedRole ?? 'teacher'),
      actionType: 'APPLICATION_SUBMITTED',
      targetType: 'application',
      targetId: event.params.applicationId,
      summary: `Application submitted by ${String(appData.applicantName ?? 'Applicant')} (${String(appData.applicationType ?? 'general')})`,
      ...(appData.schoolId ? { schoolId: String(appData.schoolId) } : {}),
      createdAt: FieldValue.serverTimestamp(),
    });
  }
);

/**
 * Firestore trigger: mirrors notice lifecycle updates into activityLogs.
 */
export const onNoticeWritten = onDocumentWritten(
  {
    document: 'notices/{noticeId}',
    database: FIRESTORE_DATABASE_ID,
    region: 'asia-southeast1',
  },
  async (event) => {
    const afterData = event.data?.after?.data();
    if (!afterData) return;
    await adminDb.collection('activityLogs').add({
      actorUid: String(afterData.createdByUid ?? 'system'),
      actorRole: 'central_admin',
      actionType: event.data?.before?.exists ? 'NOTICE_UPDATED' : 'NOTICE_PUBLISHED',
      targetType: 'notice',
      targetId: event.params.noticeId,
      summary: `Notice: ${String(afterData.title ?? 'Announcement').slice(0, 180)}`,
      ...(afterData.schoolId ? { schoolId: String(afterData.schoolId) } : {}),
      createdAt: FieldValue.serverTimestamp(),
    });
  }
);

/**
 * Auth deletion cleanup trigger: removes orphaned user documents when a Firebase Auth user is deleted.
 */
export const onAuthUserDeletedCleanup = functionsV1.auth.user().onDelete(async (user) => {
  const uid = user.uid;
  const bucket = adminStorage.bucket();
  await Promise.allSettled([
    adminDb.doc(`users/${uid}/private/preferences`).delete(),
    adminDb.doc(`users/${uid}`).delete(),
    adminDb.doc(`cloud_backups/${uid}`).delete(),
    adminDb.doc(`admins/${uid}`).delete(),
    adminRtdb.ref(`users/${uid}`).remove(),
    adminRtdb.ref(`account_snapshots/${uid}`).remove(),
    adminRtdb.ref(`presence/${uid}`).remove(),
    bucket.deleteFiles({ prefix: `profile_photos/${uid}/` }),
  ]);
});
