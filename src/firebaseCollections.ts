import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { ref as rtdbRef, remove as rtdbRemove, serverTimestamp as rtdbServerTimestamp, update as rtdbUpdate } from 'firebase/database';
import { auth, db, rtdb, type FirestoreUserProfile } from './firebase';
import { deleteStorageFolderPrefix } from './firebaseStorage';
import { callApproveApplicationCloudFunction, callPermanentDeleteCascadeCloudFunction } from './firebaseFunctionsClient';
import { BOOT_ADMIN_EMAIL } from './utils/authGuard';
import {
  buildCascadeDeletePlan,
  buildFirestoreActivityLogPayload,
  buildFirestoreApplicationPayload,
  buildFirestoreAttendancePayload,
  buildFirestoreClassPayload,
  buildFirestoreExamPayload,
  buildFirestoreNoticePayload,
  buildFirestoreResultPayload,
  buildFirestoreSchoolPayload,
  buildFirestoreStudentPayload,
  buildFirestoreSubjectPayload,
  buildFirestoreTeacherPayload,
  resolveApprovalTransition,
  sanitizeFirestoreId,
  type ApprovalDecision,
} from './utils/firebaseDataSync';
import type {
  AcademicSubjectConfig,
  ApprovalRequest,
  ClassSectionRoomConfig,
  ExamMarkEntry,
  ExamRecord,
  NoticeItem,
  Role,
  SchoolRecord,
  StudentAttendanceHistoryEntry,
  StudentRecord,
  TeacherRecord,
} from './types';

export interface FirestoreApplicationRecord {
  applicationId: string;
  applicantUid: string;
  requestedRole: Role;
  applicationType: 'school' | 'teacher' | 'student' | 'academic' | 'tc';
  schoolId: string;
  applicantName: string;
  targetEntityId: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended';
  details: string;
  reviewedByUid?: string;
  reviewNote?: string;
  updatedAtLabel?: string;
}

export interface FirestoreActivityLogRecord {
  id: string;
  actorUid: string;
  actorRole: Role;
  actionType: string;
  targetType: string;
  targetId: string;
  summary: string;
  schoolId?: string;
  createdAtLabel?: string;
}

function isVerifiedBootAdmin(): boolean {
  const user = auth.currentUser;
  return Boolean(
    user &&
      user.emailVerified &&
      (user.email ?? '').trim().toLowerCase() === BOOT_ADMIN_EMAIL.toLowerCase()
  );
}

function formatTs(raw: unknown): string {
  const maybeTs = raw as { toDate?: () => Date } | null | undefined;
  const dt = maybeTs?.toDate ? maybeTs.toDate() : new Date();
  return dt.toISOString().replace('T', ' ').slice(0, 16);
}

async function upsertFirestoreDocStrict(
  collectionName: string,
  docId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const safeId = sanitizeFirestoreId(docId, 'doc');
  const docRef = doc(db, collectionName, safeId);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await updateDoc(docRef, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch {
    // Non-blocking in portal/preview mode so UI remains responsive
  }
}

export async function recordActivityLogInFirestore(input: {
  actorRole: Role;
  actionType: string;
  targetType: 'user' | 'school' | 'teacher' | 'student' | 'notice' | 'exam' | 'application' | 'storage' | 'system';
  targetId: string;
  summary: string;
  schoolId?: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  try {
    const payload = buildFirestoreActivityLogPayload({
      ...input,
      actorUid: user.uid,
    });
    await addDoc(collection(db, 'activityLogs'), {
      ...payload,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Non-blocking in portal preview mode
  }
}

export async function syncSchoolToFirestore(school: SchoolRecord): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const payload = buildFirestoreSchoolPayload(school, user.uid);
  await upsertFirestoreDocStrict('schools', payload.schoolId, payload);
}

export async function syncTeacherToFirestore(teacher: TeacherRecord): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const payload = buildFirestoreTeacherPayload(teacher, user.uid);
  await upsertFirestoreDocStrict('teachers', payload.teacherId, payload);
}

export async function syncStudentToFirestore(student: StudentRecord): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const payload = buildFirestoreStudentPayload(student, user.uid);
  await upsertFirestoreDocStrict('students', payload.studentId, payload);
}

export async function syncClassToFirestore(
  cls: ClassSectionRoomConfig,
  schoolId: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const payload = buildFirestoreClassPayload(cls, schoolId, user.uid);
  await upsertFirestoreDocStrict('classes', payload.classId, payload);
}

export async function syncSubjectToFirestore(
  subject: AcademicSubjectConfig,
  schoolId: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const payload = buildFirestoreSubjectPayload(subject, schoolId, user.uid);
  await upsertFirestoreDocStrict('subjects', payload.subjectId, payload);
}

export async function syncAttendanceToFirestore(
  entry: StudentAttendanceHistoryEntry
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const payload = buildFirestoreAttendancePayload(entry, user.uid);
  await upsertFirestoreDocStrict('attendance', payload.attendanceId, payload);
}

export async function syncExamToFirestore(exam: ExamRecord): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const payload = buildFirestoreExamPayload(exam, user.uid);
  await upsertFirestoreDocStrict('exams', payload.examId, payload);
}

export async function syncResultToFirestore(
  examId: string,
  schoolId: string,
  entry: ExamMarkEntry
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const payload = buildFirestoreResultPayload(examId, schoolId, entry, user.uid);
  await upsertFirestoreDocStrict('results', payload.resultId, payload);
}

export async function syncNoticeToFirestore(notice: NoticeItem): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const payload = buildFirestoreNoticePayload(notice, user.uid);
  await upsertFirestoreDocStrict('notices', payload.noticeId, payload);
}

export async function submitApplicationToFirestore(
  appReq: ApprovalRequest,
  requestedRole: Role = 'teacher'
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const payload = buildFirestoreApplicationPayload(appReq, user.uid, requestedRole);
  await upsertFirestoreDocStrict('applications', payload.applicationId, payload);
}

export async function reviewApplicationAndUserInFirestore(input: {
  targetUid: string;
  applicationId?: string;
  decision: ApprovalDecision;
  role: Role | 'pending';
  schoolId?: string;
  note?: string;
  actorRole: Role;
}): Promise<{ ok: boolean; usedCloudFunction: boolean; message: string }> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    return {
      ok: false,
      usedCloudFunction: false,
      message: 'Verified Firebase Admin session required.',
    };
  }

  // 1. Prefer server-side Cloud Function (also updates custom claims atomically)
  const cfOutcome = await callApproveApplicationCloudFunction({
    targetUid: input.targetUid,
    applicationId: input.applicationId,
    decision: input.decision,
    role: input.role,
    schoolId: input.schoolId,
    note: input.note,
  });

  if (cfOutcome.ok) {
    return {
      ok: true,
      usedCloudFunction: true,
      message: `Cloud Function approved/updated user (${input.targetUid}) with custom claims.`,
    };
  }

  // 2. Direct Firestore + RTDB Admin fallback when Cloud Functions are not yet deployed
  const transition = resolveApprovalTransition({
    decision: input.decision,
    requestedRole: input.role,
    schoolId: input.schoolId,
  });

  const cleanTargetUid = sanitizeFirestoreId(input.targetUid, 'uid');
  const userSnap = await getDoc(doc(db, 'users', cleanTargetUid)).catch(() => null);
  const prevData = userSnap?.exists() ? (userSnap.data() as Record<string, unknown>) : null;

  await setDoc(
    doc(db, 'users', cleanTargetUid),
    {
      uid: cleanTargetUid,
      email: String(prevData?.email ?? 'user@psms.gov.bd'),
      displayName: String(prevData?.displayName ?? 'Portal User'),
      role: transition.assignedRole,
      status: transition.nextUserStatus,
      isActive: transition.nextIsActive,
      ...(transition.assignedSchoolId ? { schoolId: transition.assignedSchoolId } : {}),
      createdAt: prevData?.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await rtdbUpdate(rtdbRef(rtdb, `users/${cleanTargetUid}`), {
    role: transition.assignedRole,
    status: transition.nextUserStatus,
    isActive: transition.nextIsActive,
    ...(transition.assignedSchoolId ? { schoolId: transition.assignedSchoolId } : {}),
    updatedByUid: user.uid,
    updatedAt: rtdbServerTimestamp(),
  }).catch(() => {});

  if (input.applicationId) {
    const cleanAppId = sanitizeFirestoreId(input.applicationId, 'APP');
    await updateDoc(doc(db, 'applications', cleanAppId), {
      status: transition.nextApplicationStatus,
      reviewedByUid: user.uid,
      reviewNote: (input.note || input.decision).slice(0, 300),
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  }

  await recordActivityLogInFirestore({
    actorRole: input.actorRole,
    actionType: `DECISION_${input.decision.toUpperCase()}`,
    targetType: 'user',
    targetId: cleanTargetUid,
    summary: `Decision ${input.decision} applied -> role=${transition.assignedRole}, status=${transition.nextUserStatus}`,
    schoolId: transition.assignedSchoolId,
  });

  return {
    ok: true,
    usedCloudFunction: false,
    message: `Firestore + RTDB direct update completed (${transition.nextUserStatus}).`,
  };
}

export async function executeClientCascadeDelete(input: {
  targetType: 'user' | 'school' | 'teacher' | 'student';
  targetId: string;
  schoolId?: string;
  reason?: string;
  actorRole: Role;
}): Promise<{ ok: boolean; usedCloudFunction: boolean; deletedPaths: string[] }> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    return { ok: false, usedCloudFunction: false, deletedPaths: [] };
  }

  const cfResult = await callPermanentDeleteCascadeCloudFunction({
    targetType: input.targetType,
    targetId: input.targetId,
    schoolId: input.schoolId,
    reason: input.reason,
  });
  if (cfResult.ok) {
    return {
      ok: true,
      usedCloudFunction: true,
      deletedPaths: [`cf:${input.targetType}/${input.targetId}`],
    };
  }

  const plan = buildCascadeDeletePlan(input.targetType, input.targetId, input.schoolId);
  const deletedPaths: string[] = [];

  for (const docPath of plan.firestoreDocPaths) {
    const parts = docPath.split('/');
    try {
      if (parts.length === 2) {
        await deleteDoc(doc(db, parts[0], parts[1]));
        deletedPaths.push(docPath);
      } else if (parts.length === 4) {
        await deleteDoc(doc(db, parts[0], parts[1], parts[2], parts[3]));
        deletedPaths.push(docPath);
      }
    } catch {
      // Continue remaining deletions
    }
  }

  for (const rPath of plan.rtdbPaths) {
    try {
      await rtdbRemove(rtdbRef(rtdb, rPath));
      deletedPaths.push(`rtdb:${rPath}`);
    } catch {
      // Continue
    }
  }

  for (const mScope of plan.mediaAssetScopes) {
    await deleteStorageFolderPrefix(mScope);
    deletedPaths.push(`media_assets:${mScope}`);
  }

  await recordActivityLogInFirestore({
    actorRole: input.actorRole,
    actionType: 'PERMANENT_CASCADE_DELETE',
    targetType: input.targetType,
    targetId: plan.targetId,
    summary: `Cascade deleted ${input.targetType}:${plan.targetId} (${input.reason || 'Admin cleanup'})`,
    schoolId: input.schoolId,
  });

  return {
    ok: true,
    usedCloudFunction: false,
    deletedPaths,
  };
}

// === Live Firestore Subscriptions (Only active when verified Firebase user is signed in) ===

export function subscribeFirestoreUsers(
  onData: (users: FirestoreUserProfile[]) => void,
  onError?: (err: string) => void
): () => void {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return () => {};

  const constraints: QueryConstraint[] = isVerifiedBootAdmin()
    ? [limit(50)]
    : [where('uid', '==', user.uid), limit(1)];

  return onSnapshot(
    query(collection(db, 'users'), ...constraints),
    (snap) => {
      const rows = snap.docs.map((d) => d.data() as FirestoreUserProfile);
      onData(rows);
    },
    (err) => onError?.(err.message)
  );
}

export function subscribeFirestoreApplications(
  onData: (apps: FirestoreApplicationRecord[]) => void,
  onError?: (err: string) => void
): () => void {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return () => {};

  const constraints: QueryConstraint[] = isVerifiedBootAdmin()
    ? [limit(50)]
    : [where('applicantUid', '==', user.uid), limit(25)];

  return onSnapshot(
    query(collection(db, 'applications'), ...constraints),
    (snap) => {
      const rows = snap.docs.map((d) => {
        const raw = d.data() as Record<string, unknown>;
        return {
          applicationId: String(raw.applicationId ?? d.id),
          applicantUid: String(raw.applicantUid ?? ''),
          requestedRole: (raw.requestedRole as Role) ?? 'teacher',
          applicationType: (raw.applicationType as FirestoreApplicationRecord['applicationType']) ?? 'school',
          schoolId: String(raw.schoolId ?? 'global'),
          applicantName: String(raw.applicantName ?? 'Applicant'),
          targetEntityId: String(raw.targetEntityId ?? d.id),
          status: (raw.status as FirestoreApplicationRecord['status']) ?? 'pending',
          details: String(raw.details ?? ''),
          reviewedByUid: typeof raw.reviewedByUid === 'string' ? raw.reviewedByUid : undefined,
          reviewNote: typeof raw.reviewNote === 'string' ? raw.reviewNote : undefined,
          updatedAtLabel: formatTs(raw.updatedAt),
        };
      });
      onData(rows);
    },
    (err) => onError?.(err.message)
  );
}

export function subscribeFirestoreActivityLogs(
  onData: (logs: FirestoreActivityLogRecord[]) => void,
  onError?: (err: string) => void
): () => void {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return () => {};

  const constraints: QueryConstraint[] = isVerifiedBootAdmin()
    ? [limit(30)]
    : [where('actorUid', '==', user.uid), limit(20)];

  return onSnapshot(
    query(collection(db, 'activityLogs'), ...constraints),
    (snap) => {
      const rows = snap.docs.map((d) => {
        const raw = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          actorUid: String(raw.actorUid ?? ''),
          actorRole: (raw.actorRole as Role) ?? 'central_admin',
          actionType: String(raw.actionType ?? 'UPDATE'),
          targetType: String(raw.targetType ?? 'system'),
          targetId: String(raw.targetId ?? ''),
          summary: String(raw.summary ?? ''),
          schoolId: typeof raw.schoolId === 'string' ? raw.schoolId : undefined,
          createdAtLabel: formatTs(raw.createdAt),
        };
      });
      onData(rows);
    },
    (err) => onError?.(err.message)
  );
}

export function subscribeFirestoreSchools(
  onData: (schools: Array<ReturnType<typeof buildFirestoreSchoolPayload>>) => void,
  onError?: (err: string) => void
): () => void {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return () => {};

  const constraints: QueryConstraint[] = isVerifiedBootAdmin()
    ? [limit(50)]
    : [where('ownerUid', '==', user.uid), limit(25)];

  return onSnapshot(
    query(collection(db, 'schools'), ...constraints),
    (snap) => {
      const rows = snap.docs.map(
        (d) => d.data() as ReturnType<typeof buildFirestoreSchoolPayload>
      );
      onData(rows);
    },
    (err) => onError?.(err.message)
  );
}

export function subscribeFirestoreNotices(
  onData: (notices: Array<ReturnType<typeof buildFirestoreNoticePayload>>) => void,
  onError?: (err: string) => void
): () => void {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return () => {};

  const constraints: QueryConstraint[] = isVerifiedBootAdmin()
    ? [limit(30)]
    : [where('audience', '==', 'all'), limit(20)];

  return onSnapshot(
    query(collection(db, 'notices'), ...constraints),
    (snap) => {
      const rows = snap.docs.map(
        (d) => d.data() as ReturnType<typeof buildFirestoreNoticePayload>
      );
      onData(rows);
    },
    (err) => onError?.(err.message)
  );
}

export function subscribeFirestoreTeachers(
  onData: (teachers: Array<ReturnType<typeof buildFirestoreTeacherPayload>>) => void,
  onError?: (err: string) => void
): () => void {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return () => {};

  const constraints: QueryConstraint[] = isVerifiedBootAdmin()
    ? [limit(100)]
    : [where('ownerUid', '==', user.uid), limit(50)];

  return onSnapshot(
    query(collection(db, 'teachers'), ...constraints),
    (snap) => {
      const rows = snap.docs.map(
        (d) => d.data() as ReturnType<typeof buildFirestoreTeacherPayload>
      );
      onData(rows);
    },
    (err) => onError?.(err.message)
  );
}

export function subscribeFirestoreStudents(
  onData: (students: Array<ReturnType<typeof buildFirestoreStudentPayload>>) => void,
  onError?: (err: string) => void
): () => void {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return () => {};

  const constraints: QueryConstraint[] = isVerifiedBootAdmin()
    ? [limit(150)]
    : [where('ownerUid', '==', user.uid), limit(75)];

  return onSnapshot(
    query(collection(db, 'students'), ...constraints),
    (snap) => {
      const rows = snap.docs.map(
        (d) => d.data() as ReturnType<typeof buildFirestoreStudentPayload>
      );
      onData(rows);
    },
    (err) => onError?.(err.message)
  );
}

export interface FirestoreMediaAssetSummary {
  assetId: string;
  ownerUid: string;
  category: 'profile_photos' | 'school_covers' | 'documents' | 'notices';
  scopeId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
}

export function subscribeFirestoreMediaAssets(
  onData: (assets: FirestoreMediaAssetSummary[]) => void,
  onError?: (err: string) => void
): () => void {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return () => {};

  const constraints: QueryConstraint[] = isVerifiedBootAdmin()
    ? [limit(50)]
    : [where('ownerUid', '==', user.uid), limit(30)];

  return onSnapshot(
    query(collection(db, 'media_assets'), ...constraints),
    (snap) => {
      const rows = snap.docs.map((d) => d.data() as FirestoreMediaAssetSummary);
      onData(rows);
    },
    (err) => onError?.(err.message)
  );
}
