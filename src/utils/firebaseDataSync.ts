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
} from '../types';

export type AccountLifecycleStatus =
  | 'active'
  | 'pending'
  | 'suspended'
  | 'rejected'
  | 'deactivated';

export interface UserAccountStatusCheck {
  blocked: boolean;
  reasonBn?: string;
  reasonEn?: string;
}

export function sanitizeFirestoreId(raw: string, fallback = 'doc'): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 128);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function clampBoundedText(raw: unknown, maxLen: number, fallback = ''): string {
  const text = typeof raw === 'string' ? raw.trim() : fallback;
  return text.slice(0, maxLen);
}

export function isAccountLoginBlocked(profile: {
  status?: string | null;
  isActive?: boolean | null;
}): UserAccountStatusCheck {
  if (profile.isActive === false || profile.status === 'deactivated') {
    return {
      blocked: true,
      reasonBn: 'আপনার অ্যাকাউন্টটি স্থায়ীভাবে নিষ্ক্রিয় (Deactivated) করা হয়েছে। সহায়তার জন্য কেন্দ্রীয় অ্যাডমিনের সাথে যোগাযোগ করুন।',
      reasonEn: 'Your account has been deactivated. Contact Central Admin for assistance.',
    };
  }
  if (profile.status === 'suspended') {
    return {
      blocked: true,
      reasonBn: 'আপনার অ্যাকাউন্টটি সাময়িকভাবে স্থগিত (Suspended) করা হয়েছে।',
      reasonEn: 'Your account has been temporarily suspended by an administrator.',
    };
  }
  if (profile.status === 'rejected') {
    return {
      blocked: true,
      reasonBn: 'আপনার আবেদনটি প্রত্যাখ্যান (Rejected) করা হয়েছে। প্রয়োজনে তথ্য সংশোধন করে পুনরায় আবেদন করুন।',
      reasonEn: 'Your application was rejected. Please review feedback or contact Central Admin.',
    };
  }
  return { blocked: false };
}

export type ApprovalDecision = 'approve' | 'reject' | 'suspend' | 'deactivate' | 'reactivate';

export interface ApprovalTransitionResult {
  nextUserStatus: AccountLifecycleStatus;
  nextApplicationStatus: 'approved' | 'rejected' | 'suspended' | 'pending';
  nextIsActive: boolean;
  assignedRole: Role | 'pending';
  assignedSchoolId?: string;
}

export function resolveApprovalTransition(input: {
  decision: ApprovalDecision;
  requestedRole: Role | 'pending';
  schoolId?: string;
}): ApprovalTransitionResult {
  const cleanSchoolId = input.schoolId?.trim()
    ? sanitizeFirestoreId(input.schoolId, '').slice(0, 64)
    : undefined;

  if (input.decision === 'approve' || input.decision === 'reactivate') {
    const effectiveRole: Role =
      input.requestedRole === 'pending' ? 'teacher' : input.requestedRole;
    return {
      nextUserStatus: 'active',
      nextApplicationStatus: 'approved',
      nextIsActive: true,
      assignedRole: effectiveRole,
      ...(cleanSchoolId ? { assignedSchoolId: cleanSchoolId } : {}),
    };
  }
  if (input.decision === 'reject') {
    return {
      nextUserStatus: 'rejected',
      nextApplicationStatus: 'rejected',
      nextIsActive: false,
      assignedRole: 'pending',
      ...(cleanSchoolId ? { assignedSchoolId: cleanSchoolId } : {}),
    };
  }
  if (input.decision === 'suspend') {
    return {
      nextUserStatus: 'suspended',
      nextApplicationStatus: 'suspended',
      nextIsActive: false,
      assignedRole: input.requestedRole,
      ...(cleanSchoolId ? { assignedSchoolId: cleanSchoolId } : {}),
    };
  }
  return {
    nextUserStatus: 'deactivated',
    nextApplicationStatus: 'rejected',
    nextIsActive: false,
    assignedRole: input.requestedRole,
    ...(cleanSchoolId ? { assignedSchoolId: cleanSchoolId } : {}),
  };
}

export function buildFirestoreSchoolPayload(school: SchoolRecord, ownerUid: string) {
  const schoolId = sanitizeFirestoreId(school.id, 'SCH');
  const status =
    school.status === 'active' ||
    school.status === 'pending' ||
    school.status === 'under_review' ||
    school.status === 'suspended' ||
    school.status === 'deactivated'
      ? school.status
      : school.status === 'approved' || school.status === 'verified'
        ? 'active'
        : 'pending';

  return {
    schoolId,
    ownerUid: sanitizeFirestoreId(ownerUid, 'uid'),
    nameBn: clampBoundedText(school.nameBn, 200, 'PSMS School'),
    nameEn: clampBoundedText(school.nameEn, 200, 'PSMS School'),
    eiin: clampBoundedText(school.eiin, 32, 'N/A'),
    status,
  };
}

export function buildFirestoreTeacherPayload(teacher: TeacherRecord, ownerUid: string) {
  const teacherId = sanitizeFirestoreId(teacher.id, 'TCH');
  const schoolId = sanitizeFirestoreId(teacher.schoolId, 'SCH').slice(0, 64);
  const status =
    teacher.status === 'active' ||
    teacher.status === 'pending' ||
    teacher.status === 'suspended' ||
    teacher.status === 'rejected' ||
    teacher.status === 'deactivated'
      ? teacher.status
      : 'pending';

  return {
    teacherId,
    schoolId,
    ownerUid: sanitizeFirestoreId(ownerUid, 'uid'),
    teacherCode: clampBoundedText(teacher.teacherCode, 64, teacherId),
    nameBn: clampBoundedText(teacher.nameBn, 120, 'Teacher'),
    nameEn: clampBoundedText(teacher.nameEn, 120, 'Teacher'),
    designation: clampBoundedText(teacher.designation, 80, 'Assistant Teacher'),
    mobile: clampBoundedText(teacher.mobile, 24, ''),
    ...(teacher.email?.trim() ? { email: clampBoundedText(teacher.email, 254) } : {}),
    status,
    isActive: status === 'active',
  };
}

export function buildFirestoreStudentPayload(student: StudentRecord, ownerUid: string) {
  const studentId = sanitizeFirestoreId(student.id, 'STU');
  const schoolId = sanitizeFirestoreId(student.schoolId, 'SCH').slice(0, 64);
  const status =
    student.status === 'active' ||
    student.status === 'pending' ||
    student.status === 'suspended' ||
    student.status === 'rejected' ||
    student.status === 'deactivated'
      ? student.status
      : 'pending';

  return {
    studentId,
    schoolId,
    ownerUid: sanitizeFirestoreId(ownerUid, 'uid'),
    ...(student.guardianUserId?.trim()
      ? { guardianUid: sanitizeFirestoreId(student.guardianUserId, 'uid') }
      : {}),
    permanentId: clampBoundedText(student.permanentId, 64, studentId),
    nameBn: clampBoundedText(student.nameBn, 120, 'Student'),
    nameEn: clampBoundedText(student.nameEn, 120, 'Student'),
    className: clampBoundedText(student.className, 64, 'Class 1'),
    section: clampBoundedText(student.section, 32, 'A'),
    roll: Math.min(99999, Math.max(1, Math.trunc(Number(student.roll) || 1))),
    guardianMobile: clampBoundedText(student.guardianMobile, 24, ''),
    status,
    isActive: status === 'active',
  };
}

export function buildFirestoreClassPayload(
  cls: ClassSectionRoomConfig,
  schoolId: string,
  ownerUid: string
) {
  const classId = sanitizeFirestoreId(cls.id, 'CLS').slice(0, 64);
  return {
    classId,
    schoolId: sanitizeFirestoreId(schoolId, 'SCH').slice(0, 64),
    ownerUid: sanitizeFirestoreId(ownerUid, 'uid'),
    className: clampBoundedText(cls.className, 64, 'Class 1'),
    section: clampBoundedText(cls.section, 32, 'A'),
    roomNo: clampBoundedText(cls.roomNo, 32, '101'),
    capacity: Math.min(500, Math.max(1, Math.trunc(Number(cls.capacity) || 40))),
    enrolledCount: Math.min(500, Math.max(0, Math.trunc(Number(cls.enrolledCount) || 0))),
    classTeacherId: clampBoundedText(cls.classTeacherId, 64, ''),
  };
}

export function buildFirestoreSubjectPayload(
  subject: AcademicSubjectConfig,
  schoolId: string,
  ownerUid: string
) {
  const subjectId = sanitizeFirestoreId(subject.id, 'SUBJ').slice(0, 64);
  return {
    subjectId,
    schoolId: sanitizeFirestoreId(schoolId, 'SCH').slice(0, 64),
    ownerUid: sanitizeFirestoreId(ownerUid, 'uid'),
    code: clampBoundedText(subject.code, 32, subjectId),
    nameBn: clampBoundedText(subject.nameBn, 120, 'Subject'),
    nameEn: clampBoundedText(subject.nameEn, 120, 'Subject'),
    classRange: clampBoundedText(subject.classRange, 64, 'Class 1 - Class 5'),
    fullMarks: Math.min(1000, Math.max(1, Math.trunc(Number(subject.fullMarks) || 100))),
    passMarks: Math.min(1000, Math.max(0, Math.trunc(Number(subject.passMarks) || 33))),
  };
}

export function buildFirestoreAttendancePayload(
  entry: StudentAttendanceHistoryEntry,
  recordedByUid: string
) {
  const attendanceId = sanitizeFirestoreId(entry.id, 'ATT').slice(0, 64);
  const status =
    entry.status === 'present' || entry.status === 'late' || entry.status === 'absent'
      ? entry.status
      : 'present';
  const source =
    entry.source === 'auto_camera' ||
    entry.source === 'manual_teacher' ||
    entry.source === 'kiosk'
      ? entry.source
      : 'manual_teacher';

  return {
    attendanceId,
    schoolId: sanitizeFirestoreId(entry.schoolId, 'SCH').slice(0, 64),
    studentId: sanitizeFirestoreId(entry.studentId, 'STU').slice(0, 64),
    recordedByUid: sanitizeFirestoreId(recordedByUid, 'uid'),
    dateIso: clampBoundedText(entry.dateIso, 20, new Date().toISOString().slice(0, 10)),
    status,
    source,
    guardianNotified: Boolean(entry.guardianNotified),
  };
}

export function buildFirestoreExamPayload(exam: ExamRecord, createdByUid: string) {
  const examId = sanitizeFirestoreId(exam.id, 'EXM').slice(0, 64);
  const status =
    exam.status === 'scheduled' ||
    exam.status === 'marks_entry' ||
    exam.status === 'published' ||
    exam.status === 'held'
      ? exam.status
      : 'scheduled';

  return {
    examId,
    schoolId: sanitizeFirestoreId(exam.schoolId || 'global', 'global').slice(0, 64),
    createdByUid: sanitizeFirestoreId(createdByUid, 'uid'),
    titleBn: clampBoundedText(exam.titleBn, 200, 'Exam'),
    titleEn: clampBoundedText(exam.titleEn, 200, 'Exam'),
    className: clampBoundedText(exam.className, 64, 'All'),
    dateRange: clampBoundedText(exam.dateRange, 100, new Date().toISOString().slice(0, 10)),
    status,
    centralPublished: Boolean(exam.centralPublished),
    fullMarks: Math.min(1000, Math.max(1, Math.trunc(Number(exam.fullMarks) || 100))),
  };
}

export function buildFirestoreResultPayload(
  examId: string,
  schoolId: string,
  entry: ExamMarkEntry,
  publishedByUid: string
) {
  const cleanExamId = sanitizeFirestoreId(examId, 'EXM').slice(0, 64);
  const cleanStudentId = sanitizeFirestoreId(entry.studentId, 'STU').slice(0, 64);
  const cleanSubjectKey = sanitizeFirestoreId(entry.subjectEn || 'SUBJ', 'SUBJ').slice(0, 24);
  const resultId = sanitizeFirestoreId(`${cleanExamId}_${cleanStudentId}_${cleanSubjectKey}`, 'RES').slice(
    0,
    64
  );

  const written = Math.min(500, Math.max(0, Math.trunc(Number(entry.written) || 0)));
  const mcq = Math.min(500, Math.max(0, Math.trunc(Number(entry.mcq) || 0)));
  const oral = Math.min(500, Math.max(0, Math.trunc(Number(entry.oral) || 0)));
  const continuous = Math.min(500, Math.max(0, Math.trunc(Number(entry.continuous) || 0)));
  const fullMarks = Math.min(1000, Math.max(1, Math.trunc(Number(entry.fullMarks) || 100)));
  const totalMarks = Math.min(1000, written + mcq + oral + continuous);

  return {
    resultId,
    examId: cleanExamId,
    schoolId: sanitizeFirestoreId(schoolId, 'SCH').slice(0, 64),
    studentId: cleanStudentId,
    publishedByUid: sanitizeFirestoreId(publishedByUid, 'uid'),
    subjectEn: clampBoundedText(entry.subjectEn, 80, 'General'),
    totalMarks,
    fullMarks,
    passed: totalMarks >= Math.max(0, Math.trunc(Number(entry.passMarks) || 33)),
  };
}

export function buildFirestoreNoticePayload(notice: NoticeItem, createdByUid: string) {
  const noticeId = sanitizeFirestoreId(notice.id, 'NTC').slice(0, 64);
  const audience =
    notice.audience === 'all' ||
    notice.audience === 'teachers' ||
    notice.audience === 'students' ||
    notice.audience === 'guardians'
      ? notice.audience
      : 'school';
  const priority = notice.isEmergency ? 'urgent' : 'normal';
  const status = notice.status === 'Expired' || notice.status === 'Cancelled' ? 'archived' : 'published';

  return {
    noticeId,
    createdByUid: sanitizeFirestoreId(createdByUid, 'uid'),
    ...(notice.schoolId?.trim()
      ? { schoolId: sanitizeFirestoreId(notice.schoolId, 'SCH').slice(0, 64) }
      : {}),
    title: clampBoundedText(notice.titleBn || notice.titleEn, 200, 'Notice'),
    body: clampBoundedText(notice.bodyBn || notice.bodyEn, 2000, 'Details'),
    audience,
    priority,
    status,
  };
}

export function buildFirestoreApplicationPayload(
  app: ApprovalRequest,
  applicantUid: string,
  requestedRole: Role = 'teacher'
) {
  const applicationId = sanitizeFirestoreId(app.id, 'APP').slice(0, 64);
  const status =
    app.status === 'approved' || app.status === 'verified'
      ? 'approved'
      : app.status === 'rejected'
        ? 'rejected'
        : app.status === 'suspended'
          ? 'suspended'
          : app.status === 'under_review'
            ? 'under_review'
            : 'pending';

  return {
    applicationId,
    applicantUid: sanitizeFirestoreId(applicantUid, 'uid'),
    requestedRole,
    applicationType: app.type,
    schoolId: sanitizeFirestoreId(app.schoolId || 'global', 'global').slice(0, 64),
    applicantName: clampBoundedText(app.applicantName, 120, 'Applicant'),
    targetEntityId: sanitizeFirestoreId(app.targetEntityId || app.id, applicationId).slice(0, 64),
    status,
    details: clampBoundedText(app.details, 600, 'Submitted'),
  };
}

export function buildFirestoreActivityLogPayload(input: {
  actorUid: string;
  actorRole: Role;
  actionType: string;
  targetType: 'user' | 'school' | 'teacher' | 'student' | 'notice' | 'exam' | 'application' | 'storage' | 'system';
  targetId: string;
  summary: string;
  schoolId?: string;
}) {
  return {
    actorUid: sanitizeFirestoreId(input.actorUid, 'uid'),
    actorRole: input.actorRole,
    actionType: clampBoundedText(input.actionType, 80, 'UPDATE'),
    targetType: input.targetType,
    targetId: sanitizeFirestoreId(input.targetId, 'target').slice(0, 128),
    summary: clampBoundedText(input.summary, 300, 'System action'),
    ...(input.schoolId?.trim()
      ? { schoolId: sanitizeFirestoreId(input.schoolId, 'SCH').slice(0, 64) }
      : {}),
  };
}

// === Free Spark Plan Firestore Media Vault & Validators ===

export type StorageAssetCategory = 'profile_photos' | 'school_covers' | 'documents' | 'notices';

export const MAX_SPARK_INLINE_BYTES = 450 * 1024;
export const MAX_SPARK_IMAGE_PICK_BYTES = 10 * 1024 * 1024;
export const MAX_SPARK_DATAURL_CHARS = 700_000;

export const ALLOWED_STORAGE_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const ALLOWED_STORAGE_DOC_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export interface StorageValidationOutcome {
  valid: boolean;
  errorBn?: string;
  errorEn?: string;
  maxBytes: number;
}

export function validateStorageUploadCandidate(
  mimeType: string,
  sizeBytes: number,
  category: StorageAssetCategory
): StorageValidationOutcome {
  const isDoc = category === 'documents';
  const cleanMime = (mimeType || '').trim().toLowerCase();
  const isPdf = cleanMime === 'application/pdf';
  const maxBytes = isPdf ? MAX_SPARK_INLINE_BYTES : MAX_SPARK_IMAGE_PICK_BYTES;
  const allowedList: readonly string[] = isDoc
    ? ALLOWED_STORAGE_DOC_MIMES
    : ALLOWED_STORAGE_IMAGE_MIMES;

  if (!allowedList.includes(cleanMime)) {
    return {
      valid: false,
      maxBytes,
      errorBn: isDoc
        ? 'শুধুমাত্র PDF, JPG, PNG বা WEBP ডকুমেন্ট আপলোড করা যাবে।'
        : 'শুধুমাত্র JPG, PNG বা WEBP ছবি আপলোড করা যাবে।',
      errorEn: isDoc
        ? 'Only PDF, JPG, PNG, or WEBP documents are allowed.'
        : 'Only JPG, PNG, or WEBP images are allowed.',
    };
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > maxBytes) {
    if (isPdf) {
      return {
        valid: false,
        maxBytes,
        errorBn: 'PDF ফাইলের আকার সর্বোচ্চ ৪৫০ KB হতে পারবে।',
        errorEn: 'PDF documents must be 450 KB or smaller.',
      };
    }
    return {
      valid: false,
      maxBytes,
      errorBn: 'ছবির আকার ১ বাইট থেকে ১০ MB-এর মধ্যে হতে হবে (স্বয়ংক্রিয়ভাবে কম্প্রেস হবে)।',
      errorEn: 'Image file must be between 1 byte and 10 MB (auto-compressed automatically).',
    };
  }
  return { valid: true, maxBytes };
}

export function buildStorageObjectPath(
  category: StorageAssetCategory,
  scopeId: string,
  fileName: string
): string {
  const safeScope = sanitizeFirestoreId(scopeId, 'shared').slice(0, 64);
  const rawName = (fileName || 'file.bin').trim();
  const extMatch = rawName.toLowerCase().match(/\.(jpe?g|png|webp|pdf)$/);
  const ext = extMatch ? extMatch[1] : category === 'documents' ? 'pdf' : 'jpg';
  const baseName = rawName
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 48) || 'asset';
  const stamp = Date.now().toString(36);
  return `${category}/${safeScope}/${baseName}_${stamp}.${ext}`;
}

export function buildFirestoreMediaAssetPayload(input: {
  assetId: string;
  ownerUid: string;
  category: StorageAssetCategory;
  scopeId: string;
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
  sizeBytes: number;
  dataUrl: string;
}) {
  const assetId = sanitizeFirestoreId(input.assetId, 'asset').slice(0, 128);
  const ownerUid = sanitizeFirestoreId(input.ownerUid, 'uid').slice(0, 128);
  const scopeId = sanitizeFirestoreId(input.scopeId, ownerUid).slice(0, 64);
  const safeBytes = Math.min(500_000, Math.max(1, Math.trunc(Number(input.sizeBytes) || 1)));
  return {
    assetId,
    ownerUid,
    category: input.category,
    scopeId,
    fileName: clampBoundedText(input.fileName, 160, `${input.category}.jpg`),
    mimeType: input.mimeType,
    sizeBytes: safeBytes,
    dataUrl: String(input.dataUrl || '').slice(0, MAX_SPARK_DATAURL_CHARS),
  };
}

// === Firebase App Check Evaluation ===

export interface AppCheckConfigEvaluation {
  configured: boolean;
  mode: 'recaptcha_v3' | 'debug_token' | 'unconfigured';
  siteKeyMasked: string;
}

export function evaluateAppCheckConfig(
  recaptchaSiteKey?: string | null,
  debugToken?: string | null
): AppCheckConfigEvaluation {
  const cleanKey = (recaptchaSiteKey ?? '').trim();
  const cleanDebug = (debugToken ?? '').trim();
  if (cleanKey.length >= 10) {
    return {
      configured: true,
      mode: 'recaptcha_v3',
      siteKeyMasked: `${cleanKey.slice(0, 6)}...${cleanKey.slice(-4)}`,
    };
  }
  if (cleanDebug.length > 0) {
    return {
      configured: true,
      mode: 'debug_token',
      siteKeyMasked: 'debug-token-active',
    };
  }
  return {
    configured: false,
    mode: 'unconfigured',
    siteKeyMasked: 'not-set',
  };
}

// === Permanent Cascade Delete Plan Builder (100% Free Spark Plan: Firestore + RTDB) ===

export interface CascadeDeletePlan {
  targetType: 'user' | 'school' | 'teacher' | 'student';
  targetId: string;
  firestoreDocPaths: string[];
  rtdbPaths: string[];
  mediaAssetScopes: string[];
}

export function buildCascadeDeletePlan(
  targetType: 'user' | 'school' | 'teacher' | 'student',
  targetId: string,
  schoolId?: string
): CascadeDeletePlan {
  const cleanId = sanitizeFirestoreId(targetId, 'target');
  const cleanSchool = schoolId?.trim() ? sanitizeFirestoreId(schoolId, 'SCH') : undefined;

  if (targetType === 'user') {
    return {
      targetType,
      targetId: cleanId,
      firestoreDocPaths: [
        `users/${cleanId}`,
        `users/${cleanId}/private/preferences`,
        `cloud_backups/${cleanId}`,
        `admins/${cleanId}`,
      ],
      rtdbPaths: [
        `users/${cleanId}`,
        `account_snapshots/${cleanId}`,
        `user_change_logs/${cleanId}`,
        `rtdb_sync_tests/${cleanId}`,
        `presence/${cleanId}`,
      ],
      mediaAssetScopes: [cleanId],
    };
  }

  if (targetType === 'school') {
    return {
      targetType,
      targetId: cleanId,
      firestoreDocPaths: [`schools/${cleanId}`],
      rtdbPaths: [`schools/${cleanId}`],
      mediaAssetScopes: [cleanId],
    };
  }

  if (targetType === 'teacher') {
    return {
      targetType,
      targetId: cleanId,
      firestoreDocPaths: [`teachers/${cleanId}`],
      rtdbPaths: cleanSchool ? [`schools/${cleanSchool}/teachers/${cleanId}`] : [],
      mediaAssetScopes: [cleanId],
    };
  }

  return {
    targetType: 'student',
    targetId: cleanId,
    firestoreDocPaths: [`students/${cleanId}`],
    rtdbPaths: cleanSchool ? [`schools/${cleanSchool}/students/${cleanId}`] : [],
    mediaAssetScopes: [cleanId],
  };
}
