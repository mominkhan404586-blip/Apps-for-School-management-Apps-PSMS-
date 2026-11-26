import type { Role } from '../types';
import { BOOT_ADMIN_EMAIL, VALID_APP_ROLES, type AuthenticatedSession } from './authGuard';

export const RTDB_DATABASE_URL =
  'https://school-management-apk-default-rtdb.asia-southeast1.firebasedatabase.app';

export type RealtimeUserRole = Role | 'pending';
export type RealtimeUserStatus = 'active' | 'pending' | 'suspended' | 'rejected' | 'deactivated';

export interface RealtimeUserAccountRecord {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  recoveryEmail?: string;
  recoveryPhone?: string;
  role: RealtimeUserRole;
  status: RealtimeUserStatus;
  isActive?: boolean;
  schoolId?: string;
  teacherId?: string;
  studentId?: string;
  updatedByUid?: string;
  createdAt?: number | string;
  updatedAt: number | string;
}

export interface RealtimeUserAccountInput {
  displayName: string;
  email: string;
  phone?: string;
  recoveryEmail?: string;
  recoveryPhone?: string;
  role?: RealtimeUserRole;
  status?: RealtimeUserStatus;
  isActive?: boolean;
  schoolId?: string;
  teacherId?: string;
  studentId?: string;
}

export interface RealtimeFieldDiffItem {
  field: 'displayName' | 'email' | 'phone' | 'role' | 'status';
  labelBn: string;
  labelEn: string;
  oldValue: string;
  newValue: string;
  changed: boolean;
  valid: boolean;
  statusLabelBn: string;
  statusLabelEn: string;
  messageBn: string;
  messageEn: string;
}

export interface RealtimeValidationResult {
  valid: boolean;
  errors: Record<string, { bn: string; en: string }>;
  fieldDiffs: RealtimeFieldDiffItem[];
  validCount: number;
  invalidCount: number;
  changedCount: number;
  normalized: {
    displayName: string;
    email: string;
    phone: string;
    recoveryEmail: string;
    recoveryPhone: string;
    role: RealtimeUserRole;
    status: RealtimeUserStatus;
  };
}

export interface RealtimeUserChangeLog {
  id: string;
  uid: string;
  changedByUid: string;
  field: string;
  oldValue: string;
  newValue: string;
  validationStatus: 'valid' | 'invalid';
  updatedAt: number | string;
}

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_CHARS_REGEX = /^[+0-9\-\s]{6,24}$/;
const BD_MOBILE_DIGITS_REGEX = /^(?:\+?88)?01[3-9]\d{8}$/;

export function isValidEmailAddress(email: string): boolean {
  const clean = email.trim();
  return clean.length >= 3 && clean.length <= 254 && EMAIL_REGEX.test(clean);
}

export function isValidPhoneNumber(phone: string): boolean {
  const clean = phone.trim();
  if (!clean) return true; // optional when empty
  if (!PHONE_CHARS_REGEX.test(clean)) return false;
  const digits = clean.replace(/[\s-]/g, '');
  if (digits.startsWith('01') || digits.startsWith('+8801') || digits.startsWith('8801')) {
    return BD_MOBILE_DIGITS_REGEX.test(digits);
  }
  return /^\+?\d{7,15}$/.test(digits);
}

export function isValidRealtimeRole(role: string): role is RealtimeUserRole {
  return role === 'pending' || (VALID_APP_ROLES as readonly string[]).includes(role);
}

export function isValidRealtimeStatus(status: string): status is RealtimeUserStatus {
  return (
    status === 'active' ||
    status === 'pending' ||
    status === 'suspended' ||
    status === 'rejected' ||
    status === 'deactivated'
  );
}

export function validateRealtimeUserAccountUpdate(
  current: Partial<RealtimeUserAccountRecord>,
  next: RealtimeUserAccountInput
): RealtimeValidationResult {
  const errors: Record<string, { bn: string; en: string }> = {};

  const prevDisplayName = (current.displayName ?? '').trim();
  const nextDisplayName = (next.displayName ?? '').trim();

  const prevEmail = (current.email ?? '').trim();
  const nextEmail = (next.email ?? '').trim();

  const prevPhone = (current.phone ?? current.recoveryPhone ?? '').trim();
  const nextPhone = (next.phone ?? next.recoveryPhone ?? '').trim();

  const prevRecoveryEmail = (current.recoveryEmail ?? current.email ?? '').trim();
  const nextRecoveryEmail = (next.recoveryEmail ?? nextEmail).trim();

  const prevRole: RealtimeUserRole = isValidRealtimeRole(String(current.role ?? ''))
    ? (current.role as RealtimeUserRole)
    : 'pending';
  const rawNextRole = String(next.role ?? prevRole);
  const nextRole: RealtimeUserRole = isValidRealtimeRole(rawNextRole) ? rawNextRole : prevRole;

  const prevStatus: RealtimeUserStatus = isValidRealtimeStatus(String(current.status ?? ''))
    ? (current.status as RealtimeUserStatus)
    : 'active';
  const rawNextStatus = String(next.status ?? prevStatus);
  const nextStatus: RealtimeUserStatus = isValidRealtimeStatus(rawNextStatus)
    ? rawNextStatus
    : prevStatus;

  const nameValid = nextDisplayName.length >= 2 && nextDisplayName.length <= 120;
  if (!nameValid) {
    errors.displayName = {
      bn: 'নাম অবশ্যই ২ থেকে ১২০ অক্ষরের মধ্যে হতে হবে।',
      en: 'Display name must be between 2 and 120 characters.',
    };
  }

  const emailValid = isValidEmailAddress(nextEmail);
  if (!emailValid) {
    errors.email = {
      bn: 'সঠিক ইমেইল ফরম্যাট দিন (যেমন: name@gmail.com)।',
      en: 'Enter a valid email address (e.g., name@gmail.com).',
    };
  }

  if (nextRecoveryEmail && !isValidEmailAddress(nextRecoveryEmail)) {
    errors.recoveryEmail = {
      bn: 'রিকভারি ইমেইল ফরম্যাট সঠিক নয়।',
      en: 'Recovery email format is invalid.',
    };
  }

  const phoneValid = isValidPhoneNumber(nextPhone);
  if (!phoneValid) {
    errors.phone = {
      bn: 'সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন (যেমন: 01712345678)।',
      en: 'Enter a valid 11-digit BD mobile number (e.g., 01712345678).',
    };
  }

  const roleValid = isValidRealtimeRole(rawNextRole);
  if (!roleValid) {
    errors.role = {
      bn: 'অবৈধ রোল নির্বাচন করা হয়েছে।',
      en: 'Invalid role selected.',
    };
  }

  const statusValid = isValidRealtimeStatus(rawNextStatus);
  if (!statusValid) {
    errors.status = {
      bn: 'অবৈধ অ্যাকাউন্ট স্ট্যাটাস দেওয়া হয়েছে।',
      en: 'Invalid account status provided.',
    };
  }

  const fieldDiffs: RealtimeFieldDiffItem[] = [
    {
      field: 'displayName',
      labelBn: 'প্রদর্শিত নাম',
      labelEn: 'Display Name',
      oldValue: prevDisplayName || '—',
      newValue: nextDisplayName || '—',
      changed: prevDisplayName !== nextDisplayName,
      valid: nameValid,
      statusLabelBn: nameValid ? '✓ সঠিক' : '✗ ভুল',
      statusLabelEn: nameValid ? '✓ Valid' : '✗ Invalid',
      messageBn: nameValid
        ? prevDisplayName !== nextDisplayName
          ? 'নাম পরিবর্তনের জন্য সঠিক এবং প্রস্তুত'
          : 'সঠিক আছে (অপরিবর্তিত)'
        : errors.displayName.bn,
      messageEn: nameValid
        ? prevDisplayName !== nextDisplayName
          ? 'Valid and ready to update'
          : 'Valid (unchanged)'
        : errors.displayName.en,
    },
    {
      field: 'email',
      labelBn: 'ইমেইল ঠিকানা',
      labelEn: 'Email Address',
      oldValue: prevEmail || '—',
      newValue: nextEmail || '—',
      changed: prevEmail.toLowerCase() !== nextEmail.toLowerCase(),
      valid: emailValid,
      statusLabelBn: emailValid ? '✓ সঠিক' : '✗ ভুল',
      statusLabelEn: emailValid ? '✓ Valid' : '✗ Invalid',
      messageBn: emailValid
        ? prevEmail.toLowerCase() !== nextEmail.toLowerCase()
          ? 'ইমেইল ফরম্যাট সঠিক — পরিবর্তন হবে'
          : 'সঠিক আছে (অপরিবর্তিত)'
        : errors.email.bn,
      messageEn: emailValid
        ? prevEmail.toLowerCase() !== nextEmail.toLowerCase()
          ? 'Valid email format — will update'
          : 'Valid (unchanged)'
        : errors.email.en,
    },
    {
      field: 'phone',
      labelBn: 'মোবাইল নম্বর',
      labelEn: 'Mobile Number',
      oldValue: prevPhone || '—',
      newValue: nextPhone || '—',
      changed: prevPhone !== nextPhone,
      valid: phoneValid,
      statusLabelBn: phoneValid ? '✓ সঠিক' : '✗ ভুল',
      statusLabelEn: phoneValid ? '✓ Valid' : '✗ Invalid',
      messageBn: phoneValid
        ? prevPhone !== nextPhone
          ? 'মোবাইল নম্বর সঠিক — সাথে সাথে আপডেট হবে'
          : 'সঠিক আছে (অপরিবর্তিত)'
        : errors.phone.bn,
      messageEn: phoneValid
        ? prevPhone !== nextPhone
          ? 'Valid phone number — will sync immediately'
          : 'Valid (unchanged)'
        : errors.phone.en,
    },
    {
      field: 'role',
      labelBn: 'অ্যাকাউন্ট রোল',
      labelEn: 'Account Role',
      oldValue: prevRole,
      newValue: rawNextRole,
      changed: prevRole !== rawNextRole,
      valid: roleValid,
      statusLabelBn: roleValid ? '✓ সঠিক' : '✗ ভুল',
      statusLabelEn: roleValid ? '✓ Valid' : '✗ Invalid',
      messageBn: roleValid
        ? prevRole !== rawNextRole
          ? 'রোল পরিবর্তনের জন্য বৈধ'
          : 'সঠিক আছে (অপরিবর্তিত)'
        : errors.role.bn,
      messageEn: roleValid
        ? prevRole !== rawNextRole
          ? 'Valid role change'
          : 'Valid (unchanged)'
        : errors.role.en,
    },
    {
      field: 'status',
      labelBn: 'অ্যাকাউন্ট স্ট্যাটাস',
      labelEn: 'Account Status',
      oldValue: prevStatus,
      newValue: rawNextStatus,
      changed: prevStatus !== rawNextStatus,
      valid: statusValid,
      statusLabelBn: statusValid ? '✓ সঠিক' : '✗ ভুল',
      statusLabelEn: statusValid ? '✓ Valid' : '✗ Invalid',
      messageBn: statusValid
        ? prevStatus !== rawNextStatus
          ? 'স্ট্যাটাস তাৎক্ষণিক কার্যকর হবে'
          : 'সঠিক আছে (অপরিবর্তিত)'
        : errors.status.bn,
      messageEn: statusValid
        ? prevStatus !== rawNextStatus
          ? 'Status will apply immediately'
          : 'Valid (unchanged)'
        : errors.status.en,
    },
  ];

  const validCount = fieldDiffs.filter((d) => d.valid).length;
  const invalidCount = fieldDiffs.filter((d) => !d.valid).length;
  const changedCount = fieldDiffs.filter((d) => d.changed).length;

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    fieldDiffs,
    validCount,
    invalidCount,
    changedCount,
    normalized: {
      displayName: nextDisplayName,
      email: nextEmail,
      phone: nextPhone,
      recoveryEmail: nextRecoveryEmail,
      recoveryPhone: nextPhone,
      role: nextRole,
      status: nextStatus,
    },
  };
}

export function normalizeRtdbUserRecord(
  uid: string,
  raw: Record<string, unknown> | null | undefined
): RealtimeUserAccountRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const displayName = typeof raw.displayName === 'string' && raw.displayName.trim()
    ? raw.displayName.trim()
    : 'PSMS User';
  const email = typeof raw.email === 'string' ? raw.email.trim() : '';
  const roleStr = typeof raw.role === 'string' ? raw.role : 'pending';
  const statusStr = typeof raw.status === 'string' ? raw.status : 'pending';

  return {
    uid,
    email,
    displayName,
    phone: typeof raw.phone === 'string' ? raw.phone : undefined,
    recoveryEmail: typeof raw.recoveryEmail === 'string' ? raw.recoveryEmail : undefined,
    recoveryPhone: typeof raw.recoveryPhone === 'string' ? raw.recoveryPhone : undefined,
    role: isValidRealtimeRole(roleStr) ? roleStr : 'pending',
    status: isValidRealtimeStatus(statusStr) ? statusStr : 'pending',
    isActive: typeof raw.isActive === 'boolean' ? raw.isActive : statusStr === 'active',
    schoolId: typeof raw.schoolId === 'string' ? raw.schoolId : undefined,
    teacherId: typeof raw.teacherId === 'string' ? raw.teacherId : undefined,
    studentId: typeof raw.studentId === 'string' ? raw.studentId : undefined,
    updatedByUid: typeof raw.updatedByUid === 'string' ? raw.updatedByUid : undefined,
    createdAt: typeof raw.createdAt === 'number' || typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
    updatedAt:
      typeof raw.updatedAt === 'number' || typeof raw.updatedAt === 'string'
        ? raw.updatedAt
        : new Date().toISOString(),
  };
}

export interface RealtimeSyncTestProbe {
  probeId: string;
  actorUid: string;
  actorEmail: string;
  message: string;
  clientSentAtMs: number;
  serverAckAt?: number | string;
}

export interface RealtimeSessionSyncOutcome {
  changed: boolean;
  suspended: boolean;
  nextSession: AuthenticatedSession | null;
}

export function applyRealtimeUserToSession(
  currentSession: AuthenticatedSession | null,
  rtdbUser: RealtimeUserAccountRecord | null
): RealtimeSessionSyncOutcome {
  if (!currentSession || !rtdbUser) {
    return { changed: false, suspended: false, nextSession: currentSession };
  }
  if (rtdbUser.uid !== currentSession.uid) {
    return { changed: false, suspended: false, nextSession: currentSession };
  }
  if (
    rtdbUser.status === 'suspended' ||
    rtdbUser.status === 'rejected' ||
    rtdbUser.status === 'deactivated' ||
    rtdbUser.isActive === false
  ) {
    return { changed: true, suspended: true, nextSession: null };
  }

  const nextRole: Role = rtdbUser.role !== 'pending' ? rtdbUser.role : currentSession.role;
  const nextDisplayName = rtdbUser.displayName || currentSession.displayName;
  const nextEmail = rtdbUser.email || currentSession.email;
  const nextSchoolId = rtdbUser.schoolId ?? currentSession.schoolId;
  const nextTeacherId = rtdbUser.teacherId ?? currentSession.teacherId;
  const nextStudentId = rtdbUser.studentId ?? currentSession.studentId;
  const nextGuardianMobile =
    nextRole === 'guardian'
      ? rtdbUser.phone || rtdbUser.recoveryPhone || currentSession.guardianMobile
      : currentSession.guardianMobile;

  const changed =
    currentSession.displayName !== nextDisplayName ||
    currentSession.email !== nextEmail ||
    currentSession.role !== nextRole ||
    currentSession.schoolId !== nextSchoolId ||
    currentSession.teacherId !== nextTeacherId ||
    currentSession.studentId !== nextStudentId ||
    currentSession.guardianMobile !== nextGuardianMobile;

  if (!changed) {
    return { changed: false, suspended: false, nextSession: currentSession };
  }

  return {
    changed: true,
    suspended: false,
    nextSession: {
      ...currentSession,
      displayName: nextDisplayName,
      email: nextEmail,
      role: nextRole,
      ...(nextSchoolId ? { schoolId: nextSchoolId } : {}),
      ...(nextTeacherId ? { teacherId: nextTeacherId } : {}),
      ...(nextStudentId ? { studentId: nextStudentId } : {}),
      ...(nextGuardianMobile ? { guardianMobile: nextGuardianMobile } : {}),
    },
  };
}

const IS_VERIFIED_AUTH = 'auth != null && auth.token.email_verified == true';
const IS_SUPER_ADMIN = `(${IS_VERIFIED_AUTH} && (auth.token.email == '${BOOT_ADMIN_EMAIL}' || root.child('admins').child(auth.uid).child('accessLevel').val() == 'Super Central Admin'))`;
const IS_ACTIVE_REVIEW_ADMIN = `(${IS_VERIFIED_AUTH} && root.child('admins').child(auth.uid).exists())`;
const USER_NODE = `root.child('users').child(auth.uid)`;
const IS_ACTIVE_USER = `(${IS_VERIFIED_AUTH} && ${USER_NODE}.child('status').val() == 'active' && ${USER_NODE}.child('isActive').val() != false)`;
const IS_SCHOOL_ADMIN_OF = `(${IS_ACTIVE_USER} && ${USER_NODE}.child('role').val() == 'school_admin' && ${USER_NODE}.child('schoolId').val() == $schoolId)`;
const IS_TEACHER_OF = `(${IS_ACTIVE_USER} && ${USER_NODE}.child('role').val() == 'teacher' && ${USER_NODE}.child('schoolId').val() == $schoolId)`;
const IS_STUDENT_OF = `(${IS_ACTIVE_USER} && ${USER_NODE}.child('role').val() == 'student' && ${USER_NODE}.child('schoolId').val() == $schoolId)`;
const IS_GUARDIAN_OF = `(${IS_ACTIVE_USER} && ${USER_NODE}.child('role').val() == 'guardian' && ${USER_NODE}.child('schoolId').val() == $schoolId)`;
const BELONGS_TO_SCHOOL = `(${IS_ACTIVE_USER} && ${USER_NODE}.child('schoolId').val() == $schoolId)`;

export const REALTIME_DATABASE_RULES_OBJECT = {
  rules: {
    '.read': false,
    '.write': false,
    admins: {
      '.read': IS_SUPER_ADMIN,
      $uid: {
        '.read': `${IS_SUPER_ADMIN} || (${IS_VERIFIED_AUTH} && auth.uid == $uid)`,
        '.write': IS_SUPER_ADMIN,
        '.validate': "newData.hasChildren(['uid', 'email', 'displayName', 'accessLevel', 'updatedAt'])",
        uid: { '.validate': 'newData.isString() && newData.val() == $uid' },
        email: {
          '.validate':
            'newData.isString() && newData.val().length >= 3 && newData.val().length <= 254 && newData.val().matches(/^[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}$/)',
        },
        displayName: { '.validate': 'newData.isString() && newData.val().length >= 2 && newData.val().length <= 120' },
        accessLevel: {
          '.validate':
            "newData.isString() && (newData.val() == 'Super Central Admin' || newData.val() == 'Audit Officer' || newData.val() == 'Regional Reviewer')",
        },
        createdAt: { '.validate': 'newData.isNumber() || newData.isString()' },
        updatedAt: { '.validate': 'newData.isNumber() || newData.isString()' },
        $other: { '.validate': false },
      },
    },
    users: {
      '.indexOn': ['role', 'status', 'schoolId', 'email'],
      '.read': `${IS_SUPER_ADMIN} || ${IS_ACTIVE_REVIEW_ADMIN}`,
      $uid: {
        '.read': `${IS_SUPER_ADMIN} || ${IS_ACTIVE_REVIEW_ADMIN} || (${IS_VERIFIED_AUTH} && auth.uid == $uid) || (${IS_ACTIVE_USER} && ${USER_NODE}.child('role').val() == 'school_admin' && data.child('schoolId').val() == ${USER_NODE}.child('schoolId').val())`,
        '.write': `${IS_SUPER_ADMIN} || (${IS_ACTIVE_USER} && ${USER_NODE}.child('role').val() == 'school_admin' && newData.exists() && newData.child('schoolId').val() == ${USER_NODE}.child('schoolId').val() && (newData.child('role').val() == 'teacher' || newData.child('role').val() == 'student' || newData.child('role').val() == 'guardian')) || (${IS_VERIFIED_AUTH} && auth.uid == $uid && newData.exists() && ((!data.exists() && newData.child('role').val() == 'pending' && newData.child('status').val() == 'pending') || (data.exists() && newData.child('role').val() == data.child('role').val() && newData.child('status').val() == data.child('status').val() && newData.child('schoolId').val() == data.child('schoolId').val())))`,
        '.validate': "newData.hasChildren(['uid', 'email', 'displayName', 'role', 'status', 'updatedAt'])",
        uid: { '.validate': 'newData.isString() && newData.val() == $uid' },
        email: {
          '.validate':
            'newData.isString() && newData.val().length >= 3 && newData.val().length <= 254 && newData.val().matches(/^[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}$/)',
        },
        displayName: { '.validate': 'newData.isString() && newData.val().length >= 2 && newData.val().length <= 120' },
        phone: {
          '.validate':
            'newData.isString() && (newData.val().length == 0 || (newData.val().length >= 6 && newData.val().length <= 24 && newData.val().matches(/^[+0-9\\-\\s]{6,24}$/)))',
        },
        recoveryEmail: {
          '.validate':
            'newData.isString() && (newData.val().length == 0 || (newData.val().length >= 3 && newData.val().length <= 254 && newData.val().matches(/^[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}$/)))',
        },
        recoveryPhone: {
          '.validate':
            'newData.isString() && (newData.val().length == 0 || (newData.val().length >= 6 && newData.val().length <= 24 && newData.val().matches(/^[+0-9\\-\\s]{6,24}$/)))',
        },
        role: {
          '.validate':
            "newData.isString() && (newData.val() == 'central_admin' || newData.val() == 'school_admin' || newData.val() == 'teacher' || newData.val() == 'guardian' || newData.val() == 'student' || newData.val() == 'pending')",
        },
        status: {
          '.validate':
            "newData.isString() && (newData.val() == 'active' || newData.val() == 'pending' || newData.val() == 'suspended' || newData.val() == 'rejected' || newData.val() == 'deactivated')",
        },
        isActive: { '.validate': 'newData.isBoolean()' },
        schoolId: { '.validate': 'newData.isString() && newData.val().length <= 64' },
        teacherId: { '.validate': 'newData.isString() && newData.val().length <= 64' },
        studentId: { '.validate': 'newData.isString() && newData.val().length <= 64' },
        updatedByUid: { '.validate': 'newData.isString() && newData.val().length >= 1 && newData.val().length <= 128' },
        createdAt: { '.validate': 'newData.isNumber() || newData.isString()' },
        updatedAt: { '.validate': 'newData.isNumber() || newData.isString()' },
        $other: { '.validate': false },
      },
    },
    schools: {
      '.read': `${IS_SUPER_ADMIN} || ${IS_ACTIVE_REVIEW_ADMIN}`,
      $schoolId: {
        profile: {
          '.read': `${IS_SUPER_ADMIN} || ${IS_ACTIVE_REVIEW_ADMIN} || ${BELONGS_TO_SCHOOL}`,
          '.write': `${IS_SUPER_ADMIN} || ${IS_SCHOOL_ADMIN_OF}`,
          '.validate': "newData.hasChildren(['schoolId', 'nameBn', 'status', 'updatedAt'])",
          schoolId: { '.validate': 'newData.isString() && newData.val() == $schoolId' },
          nameBn: { '.validate': 'newData.isString() && newData.val().length >= 2 && newData.val().length <= 200' },
          nameEn: { '.validate': 'newData.isString() && newData.val().length <= 200' },
          status: {
            '.validate':
              "newData.isString() && (newData.val() == 'active' || newData.val() == 'pending' || newData.val() == 'under_review' || newData.val() == 'suspended' || newData.val() == 'deactivated')",
          },
          updatedByUid: { '.validate': 'newData.isString() && newData.val().length <= 128' },
          updatedAt: { '.validate': 'newData.isNumber() || newData.isString()' },
          $other: { '.validate': false },
        },
        teachers: {
          '.read': `${IS_SUPER_ADMIN} || ${IS_SCHOOL_ADMIN_OF} || ${IS_TEACHER_OF}`,
          $teacherId: {
            '.read': `${IS_SUPER_ADMIN} || ${BELONGS_TO_SCHOOL}`,
            '.write': `${IS_SUPER_ADMIN} || ${IS_SCHOOL_ADMIN_OF} || (${IS_TEACHER_OF} && ${USER_NODE}.child('teacherId').val() == $teacherId)`,
            '.validate': "newData.hasChildren(['teacherId', 'schoolId', 'nameBn', 'status', 'updatedAt'])",
            teacherId: { '.validate': 'newData.isString() && newData.val() == $teacherId' },
            schoolId: { '.validate': 'newData.isString() && newData.val() == $schoolId' },
            nameBn: { '.validate': 'newData.isString() && newData.val().length >= 2 && newData.val().length <= 120' },
            mobile: { '.validate': 'newData.isString() && newData.val().length <= 24' },
            status: {
              '.validate': "newData.isString() && (newData.val() == 'active' || newData.val() == 'pending' || newData.val() == 'suspended')",
            },
            updatedAt: { '.validate': 'newData.isNumber() || newData.isString()' },
            $other: { '.validate': false },
          },
        },
        students: {
          '.read': `${IS_SUPER_ADMIN} || ${IS_SCHOOL_ADMIN_OF} || ${IS_TEACHER_OF}`,
          $studentId: {
            '.read': `${IS_SUPER_ADMIN} || ${IS_SCHOOL_ADMIN_OF} || ${IS_TEACHER_OF} || ((${IS_STUDENT_OF} || ${IS_GUARDIAN_OF}) && ${USER_NODE}.child('studentId').val() == $studentId)`,
            '.write': `${IS_SUPER_ADMIN} || ${IS_SCHOOL_ADMIN_OF} || ${IS_TEACHER_OF} || ((${IS_STUDENT_OF} || ${IS_GUARDIAN_OF}) && ${USER_NODE}.child('studentId').val() == $studentId && data.exists() && newData.child('status').val() == data.child('status').val() && newData.child('schoolId').val() == data.child('schoolId').val())`,
            '.validate': "newData.hasChildren(['studentId', 'schoolId', 'nameBn', 'status', 'updatedAt'])",
            studentId: { '.validate': 'newData.isString() && newData.val() == $studentId' },
            schoolId: { '.validate': 'newData.isString() && newData.val() == $schoolId' },
            nameBn: { '.validate': 'newData.isString() && newData.val().length >= 2 && newData.val().length <= 120' },
            guardianMobile: { '.validate': 'newData.isString() && newData.val().length <= 24' },
            status: {
              '.validate': "newData.isString() && (newData.val() == 'active' || newData.val() == 'pending' || newData.val() == 'suspended')",
            },
            updatedAt: { '.validate': 'newData.isNumber() || newData.isString()' },
            $other: { '.validate': false },
          },
        },
        attendance: {
          '.read': `${IS_SUPER_ADMIN} || ${IS_SCHOOL_ADMIN_OF} || ${IS_TEACHER_OF}`,
          $recordId: {
            '.read': `${IS_SUPER_ADMIN} || ${IS_SCHOOL_ADMIN_OF} || ${IS_TEACHER_OF} || ((${IS_STUDENT_OF} || ${IS_GUARDIAN_OF}) && data.child('studentId').val() == ${USER_NODE}.child('studentId').val())`,
            '.write': `${IS_SUPER_ADMIN} || ${IS_SCHOOL_ADMIN_OF} || ${IS_TEACHER_OF}`,
          },
        },
        notices: {
          '.read': `${IS_SUPER_ADMIN} || ${BELONGS_TO_SCHOOL}`,
          '.write': `${IS_SUPER_ADMIN} || ${IS_SCHOOL_ADMIN_OF}`,
        },
        results: {
          '.read': `${IS_SUPER_ADMIN} || ${IS_SCHOOL_ADMIN_OF} || ${IS_TEACHER_OF}`,
          $recordId: {
            '.read': `${IS_SUPER_ADMIN} || ${IS_SCHOOL_ADMIN_OF} || ${IS_TEACHER_OF} || ((${IS_STUDENT_OF} || ${IS_GUARDIAN_OF}) && data.child('studentId').val() == ${USER_NODE}.child('studentId').val())`,
            '.write': `${IS_SUPER_ADMIN} || ${IS_SCHOOL_ADMIN_OF} || ${IS_TEACHER_OF}`,
          },
        },
      },
    },
    account_snapshots: {
      $uid: {
        '.read': `${IS_SUPER_ADMIN} || (${IS_VERIFIED_AUTH} && auth.uid == $uid)`,
        '.write': `${IS_SUPER_ADMIN} || (${IS_VERIFIED_AUTH} && auth.uid == $uid && newData.exists())`,
        '.validate': "newData.hasChildren(['uid', 'role', 'displayName', 'updatedAt'])",
        uid: { '.validate': 'newData.isString() && newData.val() == $uid' },
        role: { '.validate': 'newData.isString() && newData.val().length <= 32' },
        displayName: { '.validate': 'newData.isString() && newData.val().length >= 1 && newData.val().length <= 120' },
        email: { '.validate': 'newData.isString() && newData.val().length <= 254' },
        schoolId: { '.validate': 'newData.isString() && newData.val().length <= 64' },
        language: { '.validate': "newData.isString() && (newData.val() == 'bn' || newData.val() == 'en')" },
        themePreference: { '.validate': "newData.isString() && (newData.val() == 'light' || newData.val() == 'dark' || newData.val() == 'system')" },
        settingsJson: { '.validate': 'newData.isString() && newData.val().length <= 20000' },
        updatedAt: { '.validate': 'newData.isNumber() || newData.isString()' },
        $other: { '.validate': false },
      },
    },
    user_change_logs: {
      $uid: {
        '.indexOn': ['updatedAt'],
        '.read': `${IS_SUPER_ADMIN} || ${IS_ACTIVE_REVIEW_ADMIN} || (${IS_VERIFIED_AUTH} && auth.uid == $uid)`,
        $logId: {
          '.write': `${IS_SUPER_ADMIN} || (${IS_VERIFIED_AUTH} && auth.uid == $uid && newData.exists() && newData.child('changedByUid').val() == auth.uid)`,
          '.validate':
            "newData.hasChildren(['uid', 'changedByUid', 'field', 'oldValue', 'newValue', 'validationStatus', 'updatedAt'])",
          uid: { '.validate': 'newData.isString() && newData.val() == $uid' },
          changedByUid: { '.validate': 'newData.isString() && newData.val().length >= 1 && newData.val().length <= 128' },
          field: { '.validate': 'newData.isString() && newData.val().length >= 1 && newData.val().length <= 64' },
          oldValue: { '.validate': 'newData.isString() && newData.val().length <= 300' },
          newValue: { '.validate': 'newData.isString() && newData.val().length <= 300' },
          validationStatus: {
            '.validate': "newData.isString() && (newData.val() == 'valid' || newData.val() == 'invalid')",
          },
          updatedAt: { '.validate': 'newData.isNumber() || newData.isString()' },
          $other: { '.validate': false },
        },
      },
    },
    rtdb_sync_tests: {
      '.read': IS_SUPER_ADMIN,
      $uid: {
        '.read': `${IS_SUPER_ADMIN} || (${IS_VERIFIED_AUTH} && auth.uid == $uid)`,
        '.write': `${IS_SUPER_ADMIN} || (${IS_VERIFIED_AUTH} && auth.uid == $uid && newData.exists())`,
        '.validate': "newData.hasChildren(['probeId', 'actorUid', 'message', 'clientSentAtMs', 'serverAckAt'])",
        probeId: { '.validate': 'newData.isString() && newData.val().length >= 3 && newData.val().length <= 64' },
        actorUid: { '.validate': 'newData.isString() && newData.val() == $uid' },
        actorEmail: { '.validate': 'newData.isString() && newData.val().length <= 254' },
        message: { '.validate': 'newData.isString() && newData.val().length >= 1 && newData.val().length <= 240' },
        clientSentAtMs: { '.validate': 'newData.isNumber()' },
        serverAckAt: { '.validate': 'newData.isNumber() || newData.isString()' },
        $other: { '.validate': false },
      },
    },
    presence: {
      $uid: {
        '.read': `${IS_SUPER_ADMIN} || ${IS_ACTIVE_REVIEW_ADMIN} || (${IS_VERIFIED_AUTH} && auth.uid == $uid)`,
        '.write': `${IS_SUPER_ADMIN} || (${IS_VERIFIED_AUTH} && auth.uid == $uid)`,
        '.validate': "newData.hasChildren(['online', 'lastSeen'])",
        online: { '.validate': 'newData.isBoolean()' },
        lastSeen: { '.validate': 'newData.isNumber() || newData.isString()' },
        role: { '.validate': 'newData.isString() && newData.val().length <= 32' },
        $other: { '.validate': false },
      },
    },
  },
};

export const REALTIME_DATABASE_RULES_JSON = JSON.stringify(REALTIME_DATABASE_RULES_OBJECT, null, 2);
