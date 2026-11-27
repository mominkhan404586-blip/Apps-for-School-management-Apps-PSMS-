import type {
  ApprovalRequest,
  Role,
  SchoolRecord,
  StudentRecord,
  TeacherRecord,
} from '../types';
import { authenticateSchoolAccount } from './adminAndTeacherIdentityEngine';
import {
  BOOT_ADMIN_EMAIL,
  authenticateGuardianAccount,
  authenticateTeacherAccount,
} from './authGuard';
import { validateStudentActivationLogin } from './schoolConfigAndAddress';

export type UnifiedLoginOutcome =
  | {
      kind: 'portal_authenticated';
      role: Role;
      displayName: string;
      schoolId?: string;
      teacherId?: string;
      studentId?: string;
      guardianMobile?: string;
      linkedStudentIds?: string[];
    }
  | {
      kind: 'firebase_email';
      email: string;
    }
  | {
      kind: 'error';
      errorBn: string;
      errorEn: string;
    };

export interface ResolveUnifiedLoginParams {
  identifier: string;
  password: string;
  schools: SchoolRecord[];
  teachers: TeacherRecord[];
  students: StudentRecord[];
  passwordOverrides?: Record<string, string>;
}

export function buildPasswordOverrideKey(
  role: 'school_admin' | 'teacher' | 'student' | 'guardian',
  id: string
): string {
  return `${role}:${id.trim().toLowerCase()}`;
}

export function resolveUnifiedPortalLogin(
  params: ResolveUnifiedLoginParams
): UnifiedLoginOutcome {
  const rawId = params.identifier.trim();
  const rawPass = params.password.trim();
  const idLower = rawId.toLowerCase();
  const overrides = params.passwordOverrides ?? {};

  if (!rawId || !rawPass) {
    return {
      kind: 'error',
      errorBn: 'অনুগ্রহ করে ইউজারনেম / মোবাইল নম্বর / ইমেইল এবং পাসওয়ার্ড দিন।',
      errorEn: 'Please enter username / mobile number / email and password.',
    };
  }

  // 1. Super Central Admin always authenticates through Firebase Auth
  if (idLower === BOOT_ADMIN_EMAIL.toLowerCase()) {
    return {
      kind: 'firebase_email',
      email: rawId,
    };
  }

  // 2. School / Institution User (School Admin)
  const matchedSchoolRecord = params.schools.find(
    (s) =>
      (s.schoolPublicId && s.schoolPublicId.toLowerCase() === idLower) ||
      s.code.toLowerCase() === idLower ||
      s.id.toLowerCase() === idLower ||
      (s.registrationId && s.registrationId.toLowerCase() === idLower) ||
      s.adminUsername.toLowerCase() === idLower ||
      s.email.toLowerCase() === idLower
  );

  if (matchedSchoolRecord) {
    const overrideKey = buildPasswordOverrideKey('school_admin', matchedSchoolRecord.id);
    const customPass = overrides[overrideKey];
    if (customPass) {
      if (rawPass === customPass) {
        if (
          matchedSchoolRecord.status === 'deactivated' ||
          matchedSchoolRecord.status === 'archived' ||
          matchedSchoolRecord.status === 'rejected'
        ) {
          return {
            kind: 'error',
            errorBn: `${matchedSchoolRecord.nameBn} বর্তমানে ${matchedSchoolRecord.status} অবস্থায় রয়েছে — লগইন অনুমোদিত নয়।`,
            errorEn: `${matchedSchoolRecord.nameEn} is currently ${matchedSchoolRecord.status}.`,
          };
        }
        return {
          kind: 'portal_authenticated',
          role: 'school_admin',
          displayName: matchedSchoolRecord.headTeacher,
          schoolId: matchedSchoolRecord.id,
        };
      }
      return {
        kind: 'error',
        errorBn: 'বিদ্যালয় অ্যাকাউন্টের পাসওয়ার্ড সঠিক নয়।',
        errorEn: 'Incorrect school account password.',
      };
    }

    const schoolAuth = authenticateSchoolAccount(params.schools, rawId, rawPass);
    if (schoolAuth.ok && schoolAuth.school) {
      return {
        kind: 'portal_authenticated',
        role: 'school_admin',
        displayName: schoolAuth.school.headTeacher,
        schoolId: schoolAuth.school.id,
      };
    }
    return {
      kind: 'error',
      errorBn: schoolAuth.errorBn ?? 'বিদ্যালয় লগইন তথ্য সঠিক নয়।',
      errorEn: schoolAuth.errorEn ?? 'Invalid school login credentials.',
    };
  }

  // 3. Teacher Account
  const matchedTeacherRecord = params.teachers.find((t) => {
    const code = t.teacherCode.toLowerCase();
    const id = t.id.toLowerCase();
    const mobile = t.mobile.toLowerCase();
    const email = (t.email ?? '').toLowerCase();
    const isRahimAlias = (idLower === 'tch_rahim' || idLower === 'teacher') && t.id === 'tch-2';
    const isSumaiyaAlias = idLower === 'tch_sumaiya' && t.id === 'tch-3';
    return (
      code === idLower ||
      id === idLower ||
      mobile === idLower ||
      (email.length > 0 && email === idLower) ||
      isRahimAlias ||
      isSumaiyaAlias
    );
  });

  if (matchedTeacherRecord) {
    const overrideKey = buildPasswordOverrideKey('teacher', matchedTeacherRecord.id);
    const customPass = overrides[overrideKey];
    if (customPass) {
      if (
        matchedTeacherRecord.status === 'deactivated' ||
        matchedTeacherRecord.status === 'archived' ||
        matchedTeacherRecord.status === 'rejected' ||
        matchedTeacherRecord.status === 'suspended'
      ) {
        return {
          kind: 'error',
          errorBn: `${matchedTeacherRecord.nameBn} বর্তমানে ${matchedTeacherRecord.status} অবস্থায় আছেন — লগইন অনুমোদিত নয়।`,
          errorEn: `${matchedTeacherRecord.nameEn} is currently ${matchedTeacherRecord.status}.`,
        };
      }
      if (rawPass === customPass) {
        return {
          kind: 'portal_authenticated',
          role: 'teacher',
          displayName: matchedTeacherRecord.nameEn,
          schoolId: matchedTeacherRecord.schoolId,
          teacherId: matchedTeacherRecord.id,
        };
      }
      return {
        kind: 'error',
        errorBn: 'শিক্ষক অ্যাকাউন্টের পাসওয়ার্ড সঠিক নয়।',
        errorEn: 'Incorrect teacher account password.',
      };
    }

    const teacherAuth = authenticateTeacherAccount(params.teachers, rawId, rawPass);
    if (teacherAuth.ok && teacherAuth.teacher) {
      return {
        kind: 'portal_authenticated',
        role: 'teacher',
        displayName: teacherAuth.teacher.nameEn,
        schoolId: teacherAuth.teacher.schoolId,
        teacherId: teacherAuth.teacher.id,
      };
    }
    return {
      kind: 'error',
      errorBn: teacherAuth.errorBn ?? 'শিক্ষক লগইন তথ্য সঠিক নয়।',
      errorEn: teacherAuth.errorEn ?? 'Invalid teacher login credentials.',
    };
  }

  // 4. Student Account (by Permanent ID / Digital Serial / Guardian Mobile)
  const matchedStudentRecord = params.students.find(
    (s) =>
      s.permanentId.toLowerCase() === idLower ||
      s.id.toLowerCase() === idLower ||
      (s.digitalIdSerial ?? '').toLowerCase() === idLower
  );

  if (matchedStudentRecord) {
    if (
      matchedStudentRecord.status === 'deactivated' ||
      matchedStudentRecord.status === 'archived' ||
      matchedStudentRecord.status === 'rejected' ||
      matchedStudentRecord.status === 'suspended'
    ) {
      return {
        kind: 'error',
        errorBn: `${matchedStudentRecord.nameBn} বর্তমানে ${matchedStudentRecord.status} অবস্থায় রয়েছে — প্রবেশ অনুমোদিত নয়।`,
        errorEn: `${matchedStudentRecord.nameEn} is currently ${matchedStudentRecord.status}.`,
      };
    }

    const overrideKey = buildPasswordOverrideKey('student', matchedStudentRecord.id);
    const customPass = overrides[overrideKey];
    if (customPass) {
      if (rawPass === customPass) {
        return {
          kind: 'portal_authenticated',
          role: 'student',
          displayName: matchedStudentRecord.nameEn,
          schoolId: matchedStudentRecord.schoolId,
          studentId: matchedStudentRecord.id,
        };
      }
      return {
        kind: 'error',
        errorBn: 'শিক্ষার্থী অ্যাকাউন্টের পাসওয়ার্ড সঠিক নয়।',
        errorEn: 'Incorrect student password.',
      };
    }

    const studentByActivation = validateStudentActivationLogin(
      params.students,
      matchedStudentRecord.permanentId,
      rawPass === matchedStudentRecord.guardianMobile ? rawPass : matchedStudentRecord.guardianMobile,
      rawPass === matchedStudentRecord.activationCode ? rawPass : undefined
    );

    const matchesStudentPassword =
      rawPass === matchedStudentRecord.guardianMobile ||
      rawPass.toUpperCase() === matchedStudentRecord.activationCode.toUpperCase() ||
      rawPass === 'student@123';

    if (studentByActivation.ok && matchesStudentPassword) {
      return {
        kind: 'portal_authenticated',
        role: 'student',
        displayName: matchedStudentRecord.nameEn,
        schoolId: matchedStudentRecord.schoolId,
        studentId: matchedStudentRecord.id,
      };
    }

    return {
      kind: 'error',
      errorBn: 'শিক্ষার্থী পাসওয়ার্ড সঠিক নয় (নিবন্ধিত মোবাইল, অ্যাক্টিভেশন কোড বা student@123 ব্যবহার করুন)।',
      errorEn: 'Incorrect student password (use registered mobile, activation code, or student@123).',
    };
  }

  // 5. Guardian / Mobile-based Student or Guardian Account
  const guardianLinked = params.students.filter(
    (s) =>
      s.guardianMobile.toLowerCase() === idLower ||
      s.guardianLinkCode.toLowerCase() === idLower ||
      idLower === 'guardian' ||
      idLower === 'guardian_jamal'
  );

  if (guardianLinked.length > 0) {
    const primaryMobile = guardianLinked[0].guardianMobile;
    const guardianOverride = overrides[buildPasswordOverrideKey('guardian', primaryMobile)];
    if (guardianOverride) {
      if (rawPass === guardianOverride) {
        return {
          kind: 'portal_authenticated',
          role: 'guardian',
          displayName: 'Guardian',
          schoolId: guardianLinked[0].schoolId,
          studentId: guardianLinked[0].id,
          guardianMobile: primaryMobile,
          linkedStudentIds: guardianLinked.map((s) => s.id),
        };
      }
      return {
        kind: 'error',
        errorBn: 'অভিভাবক অ্যাকাউন্টের পাসওয়ার্ড সঠিক নয়।',
        errorEn: 'Incorrect guardian password.',
      };
    }

    if (rawPass === 'student@123') {
      const stu = guardianLinked[0];
      return {
        kind: 'portal_authenticated',
        role: 'student',
        displayName: stu.nameEn,
        schoolId: stu.schoolId,
        studentId: stu.id,
      };
    }

    const guardianAuth = authenticateGuardianAccount(params.students, rawId, rawPass);
    if (guardianAuth.ok) {
      return {
        kind: 'portal_authenticated',
        role: 'guardian',
        displayName: 'Guardian',
        schoolId: guardianLinked[0].schoolId,
        studentId: guardianAuth.linkedStudentIds?.[0],
        guardianMobile: guardianAuth.guardianMobile,
        linkedStudentIds: guardianAuth.linkedStudentIds,
      };
    }

    return {
      kind: 'error',
      errorBn: guardianAuth.errorBn ?? 'পাসওয়ার্ড সঠিক নয়।',
      errorEn: guardianAuth.errorEn ?? 'Incorrect password.',
    };
  }

  // 6. Any email address not matched locally routes to Firebase Email/Password Sign-In
  if (rawId.includes('@') && rawId.includes('.')) {
    return {
      kind: 'firebase_email',
      email: rawId,
    };
  }

  return {
    kind: 'error',
    errorBn: 'প্রদত্ত ইউজারনেম, মোবাইল নম্বর বা ইমেইলের কোনো অ্যাকাউন্ট পাওয়া যায়নি।',
    errorEn: 'No matching School, Teacher, Student, or Guardian account found.',
  };
}

export interface PasswordChangeValidationResult {
  ok: boolean;
  errorBn?: string;
  errorEn?: string;
}

export function validatePasswordChangeInput(params: {
  identifier: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): PasswordChangeValidationResult {
  if (!params.identifier.trim()) {
    return {
      ok: false,
      errorBn: 'আপনার ইউজারনেম / মোবাইল নম্বর / ইমেইল লিখুন।',
      errorEn: 'Please enter your username / mobile / email.',
    };
  }
  if (!params.currentPassword.trim()) {
    return {
      ok: false,
      errorBn: 'বর্তমান পাসওয়ার্ড লিখুন।',
      errorEn: 'Please enter your current password.',
    };
  }
  if (params.newPassword.trim().length < 6) {
    return {
      ok: false,
      errorBn: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।',
      errorEn: 'New password must be at least 6 characters.',
    };
  }
  if (params.newPassword.trim() === params.currentPassword.trim()) {
    return {
      ok: false,
      errorBn: 'নতুন পাসওয়ার্ডটি বর্তমান পাসওয়ার্ডের চেয়ে ভিন্ন হতে হবে।',
      errorEn: 'New password must differ from the current password.',
    };
  }
  if (params.newPassword.trim() !== params.confirmPassword.trim()) {
    return {
      ok: false,
      errorBn: 'নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মেলেনি।',
      errorEn: 'New password and confirm password do not match.',
    };
  }
  return { ok: true };
}

export const REMEMBERED_LOGIN_IDENTIFIER_KEY = 'psms_remembered_login_identifier_v1';

export function loadRememberedLoginIdentifier(): string {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return '';
    return window.localStorage.getItem(REMEMBERED_LOGIN_IDENTIFIER_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveRememberedLoginIdentifier(identifier: string, remember: boolean): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const clean = identifier.trim();
    if (remember && clean) {
      window.localStorage.setItem(REMEMBERED_LOGIN_IDENTIFIER_KEY, clean);
    } else {
      window.localStorage.removeItem(REMEMBERED_LOGIN_IDENTIFIER_KEY);
    }
  } catch {
    // Ignore storage quota / privacy mode issues
  }
}

export interface LoginIdentifierValidationResult {
  valid: boolean;
  kind:
    | 'empty'
    | 'email'
    | 'phone'
    | 'code_or_username'
    | 'invalid_email'
    | 'invalid_phone'
    | 'too_short';
  messageBn: string;
  messageEn: string;
}

export function validateLoginIdentifierRealtime(
  rawIdentifier: string
): LoginIdentifierValidationResult {
  const val = rawIdentifier.trim();
  if (!val) {
    return {
      valid: false,
      kind: 'empty',
      messageBn: 'ইউজারনেম, ১১ ডিজিটের মোবাইল নম্বর বা ইমেইল লিখুন।',
      messageEn: 'Enter a username, 11-digit mobile number, or email address.',
    };
  }

  if (val.includes('@')) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailPattern.test(val)) {
      return {
        valid: false,
        kind: 'invalid_email',
        messageBn: 'সঠিক ইমেইল ফরম্যাট দিন (যেমন: name@domain.com)।',
        messageEn: 'Enter a valid email address (e.g. name@domain.com).',
      };
    }
    return {
      valid: true,
      kind: 'email',
      messageBn: 'সঠিক ইমেইল ফরম্যাট',
      messageEn: 'Valid email format',
    };
  }

  if (/^[+\d\s\-()]+$/.test(val)) {
    const digits = val.replace(/\D/g, '');
    const validBd = digits.startsWith('01')
      ? /^01[3-9]\d{8}$/.test(digits)
      : digits.length >= 10 && digits.length <= 15;
    if (!validBd) {
      return {
        valid: false,
        kind: 'invalid_phone',
        messageBn: 'সঠিক মোবাইল নম্বর দিন (যেমন: 01712345678, ১১ ডিজিট)।',
        messageEn: 'Enter a valid mobile number (e.g. 01712345678, 11 digits).',
      };
    }
    return {
      valid: true,
      kind: 'phone',
      messageBn: 'সঠিক মোবাইল নম্বর',
      messageEn: 'Valid mobile number',
    };
  }

  if (val.length < 3 || /\s/.test(val)) {
    return {
      valid: false,
      kind: 'too_short',
      messageBn: 'আইডি বা ইউজারনেম কমপক্ষে ৩ অক্ষরের হতে হবে (ফাঁকা স্থান ছাড়া)।',
      messageEn: 'Username or ID must be at least 3 characters with no spaces.',
    };
  }

  return {
    valid: true,
    kind: 'code_or_username',
    messageBn: 'সঠিক আইডি / ইউজারনেম ফরম্যাট',
    messageEn: 'Valid ID / username format',
  };
}

export type ApprovalCheckCategory = 'school' | 'teacher' | 'student';

export interface RegistrationApprovalStatusResult {
  found: boolean;
  category: ApprovalCheckCategory;
  title: string;
  subtitle: string;
  codeOrId: string;
  status: string;
  statusLabelBn: string;
  statusLabelEn: string;
  stepIndex: 1 | 2 | 3 | 4;
  isRejected: boolean;
  submittedDate: string;
  updatedDate: string;
  detailLines: { labelBn: string; labelEn: string; value: string }[];
}

function mapStatusToStep(status: string): {
  stepIndex: 1 | 2 | 3 | 4;
  isRejected: boolean;
  labelBn: string;
  labelEn: string;
} {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'verified') {
    return { stepIndex: 4, isRejected: false, labelBn: 'অনুমোদিত ও সক্রিয়', labelEn: 'Approved & Active' };
  }
  if (s === 'approved') {
    return { stepIndex: 3, isRejected: false, labelBn: 'অনুমোদিত', labelEn: 'Approved' };
  }
  if (s === 'under_review' || s === 'revision_requested') {
    return { stepIndex: 2, isRejected: false, labelBn: 'পর্যালোচনাধীন', labelEn: 'Under Review' };
  }
  if (s === 'rejected' || s === 'suspended' || s === 'deactivated' || s === 'archived') {
    return { stepIndex: 2, isRejected: true, labelBn: 'স্থগিত / বাতিল', labelEn: 'Rejected / Suspended' };
  }
  return { stepIndex: 1, isRejected: false, labelBn: 'আবেদন জমা হয়েছে', labelEn: 'Pending Review' };
}

export function lookupRegistrationApprovalStatus(params: {
  category: ApprovalCheckCategory;
  query: string;
  schools: SchoolRecord[];
  requests: ApprovalRequest[];
  teachers: TeacherRecord[];
  students: StudentRecord[];
}): RegistrationApprovalStatusResult | null {
  const q = params.query.trim().toLowerCase();
  if (!q) return null;

  if (params.category === 'school') {
    const reqMatch = params.requests.find(
      (r) =>
        r.id.toLowerCase() === q ||
        r.schoolId.toLowerCase() === q ||
        r.schoolName.toLowerCase().includes(q)
    );
    const schoolMatch =
      params.schools.find(
        (s) =>
          s.code.toLowerCase() === q ||
          (s.schoolPublicId ?? '').toLowerCase() === q ||
          (s.registrationId ?? '').toLowerCase() === q ||
          s.id.toLowerCase() === q ||
          s.mobile.toLowerCase() === q ||
          s.email.toLowerCase() === q ||
          s.nameBn.toLowerCase().includes(q) ||
          s.nameEn.toLowerCase().includes(q)
      ) ?? (reqMatch ? params.schools.find((s) => s.id === reqMatch.schoolId) : undefined);

    if (!schoolMatch && !reqMatch) return null;

    const status = schoolMatch?.status ?? reqMatch?.status ?? 'pending';
    const mapped = mapStatusToStep(status);
    return {
      found: true,
      category: 'school',
      title: schoolMatch?.nameBn ?? reqMatch?.schoolName ?? 'School Application',
      subtitle: schoolMatch ? `${schoolMatch.district}, ${schoolMatch.upazila}` : reqMatch?.applicantName ?? '',
      codeOrId: schoolMatch?.schoolPublicId ?? schoolMatch?.code ?? reqMatch?.id ?? '-',
      status,
      statusLabelBn: mapped.labelBn,
      statusLabelEn: mapped.labelEn,
      stepIndex: mapped.stepIndex,
      isRejected: mapped.isRejected,
      submittedDate: schoolMatch?.registrationDate ?? reqMatch?.submittedAt ?? '-',
      updatedDate: schoolMatch?.verifiedDate ?? schoolMatch?.registrationDate ?? '-',
      detailLines: [
        { labelBn: 'স্কুল কোড', labelEn: 'School Code', value: schoolMatch?.code ?? '-' },
        { labelBn: 'প্রধান শিক্ষক', labelEn: 'Head Teacher', value: schoolMatch?.headTeacher ?? '-' },
        { labelBn: 'মোবাইল', labelEn: 'Mobile', value: schoolMatch?.mobile ?? '-' },
      ],
    };
  }

  if (params.category === 'teacher') {
    const teacher = params.teachers.find(
      (t) =>
        t.teacherCode.toLowerCase() === q ||
        t.id.toLowerCase() === q ||
        t.mobile.toLowerCase() === q ||
        (t.email ?? '').toLowerCase() === q ||
        t.nameBn.toLowerCase().includes(q) ||
        t.nameEn.toLowerCase().includes(q)
    );
    if (!teacher) return null;

    const school = params.schools.find((s) => s.id === teacher.schoolId);
    const mapped = mapStatusToStep(teacher.status);
    return {
      found: true,
      category: 'teacher',
      title: teacher.nameBn,
      subtitle: `${teacher.designation} · ${school?.nameBn ?? teacher.schoolId}`,
      codeOrId: teacher.teacherCode,
      status: teacher.status,
      statusLabelBn: mapped.labelBn,
      statusLabelEn: mapped.labelEn,
      stepIndex: mapped.stepIndex,
      isRejected: mapped.isRejected,
      submittedDate: teacher.joiningDate || '-',
      updatedDate: teacher.approvalHistory?.[0]?.date ?? teacher.joiningDate ?? '-',
      detailLines: [
        { labelBn: 'Teacher ID', labelEn: 'Teacher ID', value: teacher.teacherCode },
        { labelBn: 'বিদ্যালয়', labelEn: 'School', value: school?.nameBn ?? teacher.schoolId },
        { labelBn: 'মোবাইল', labelEn: 'Mobile', value: teacher.mobile },
      ],
    };
  }

  const student = params.students.find(
    (st) =>
      st.permanentId.toLowerCase() === q ||
      st.id.toLowerCase() === q ||
      (st.digitalIdSerial ?? '').toLowerCase() === q ||
      st.guardianMobile.toLowerCase() === q ||
      (st.birthRegNo ?? '').toLowerCase() === q ||
      st.nameBn.toLowerCase().includes(q) ||
      st.nameEn.toLowerCase().includes(q)
  );
  if (!student) return null;

  const school = params.schools.find((s) => s.id === student.schoolId);
  const mapped = mapStatusToStep(student.status);
  return {
    found: true,
    category: 'student',
    title: student.nameBn,
    subtitle: `${student.className} (${student.section}) · ${school?.nameBn ?? student.schoolId}`,
    codeOrId: student.permanentId,
    status: student.status,
    statusLabelBn: mapped.labelBn,
    statusLabelEn: mapped.labelEn,
    stepIndex: mapped.stepIndex,
    isRejected: mapped.isRejected,
    submittedDate: student.admissionDate || '-',
    updatedDate: student.admissionDate || '-',
    detailLines: [
      { labelBn: 'Student ID', labelEn: 'Student ID', value: student.permanentId },
      { labelBn: 'বিদ্যালয়', labelEn: 'School', value: school?.nameBn ?? student.schoolId },
      { labelBn: 'অভিভাবক মোবাইল', labelEn: 'Guardian Mobile', value: student.guardianMobile },
    ],
  };
}
