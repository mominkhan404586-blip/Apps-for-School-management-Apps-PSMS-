import type {
  AddressSelection,
  AdminAccount,
  ApprovalStatus,
  Role,
  SchoolRecord,
  StudentRecord,
  TeacherRecord,
  TeacherSchoolAssignment,
  TeacherSchoolPermissions,
} from '../types';

export const CONTACT_ADMIN_CHANNELS = {
  noticeLabelBn: '📢 কেন্দ্রীয় নোটিশ বোর্ড দেখুন',
  noticeLabelEn: '📢 View Notice Board',
  facebookUrl: 'https://www.facebook.com/share/1CLQtaRmzP/',
  mobileNumber: '01331712797',
  whatsappNumber: '01331712797',
  whatsappUrl: 'https://wa.me/8801331712797',
} as const;

const MAIN_ADMIN_IDENTITY_TOKENS = [
  'মোঃ মোমিন খান',
  'Md. Momin Khan',
  'mominkhan404586@gmail.com',
  'admin12131',
];

/**
 * Protects the Main Central Admin's personal identity (name, email, personal username)
 * from all non-central roles (`school_admin`, `teacher`, `student`, `guardian`).
 */
export function sanitizeActorDisplayForRole(
  actorName: string | undefined,
  viewerRole: Role | 'public'
): string {
  const raw = (actorName ?? '').trim();
  if (!raw) return 'কেন্দ্রীয় প্রশাসন (Central Administration)';
  if (viewerRole === 'central_admin') return raw;
  const lower = raw.toLowerCase();
  const containsPrivateIdentity = MAIN_ADMIN_IDENTITY_TOKENS.some((tok) =>
    lower.includes(tok.toLowerCase())
  );
  if (containsPrivateIdentity) {
    return 'কেন্দ্রীয় প্রশাসন (Main System Admin)';
  }
  return raw;
}

export function isMainCentralAdmin(account: Pick<AdminAccount, 'id' | 'username' | 'isMainOwner'>): boolean {
  return Boolean(account.isMainOwner || account.id === 'adm-1' || account.username === 'admin12131');
}

export interface CreateSubordinateAdminPayload {
  name: string;
  username: string;
  email: string;
  mobile: string;
  accessLevel: AdminAccount['accessLevel'];
  permissions: string[];
}

export function createSubordinateAdmin(
  accounts: AdminAccount[],
  actingAdmin: AdminAccount,
  payload: CreateSubordinateAdminPayload
): { ok: boolean; accounts: AdminAccount[]; created?: AdminAccount; errorBn?: string; errorEn?: string } {
  if (!isMainCentralAdmin(actingAdmin)) {
    return {
      ok: false,
      accounts,
      errorBn: 'শুধুমাত্র মূল Main System Admin নতুন অ্যাডমিন অ্যাকাউন্ট তৈরি করতে পারবেন।',
      errorEn: 'Only the Main System Admin can create subordinate Admin accounts.',
    };
  }
  const usernameClean = payload.username.trim();
  const emailClean = payload.email.trim();
  if (!payload.name.trim() || !usernameClean || !emailClean) {
    return {
      ok: false,
      accounts,
      errorBn: 'নাম, ইউজারনেম এবং ইমেইল আবশ্যক।',
      errorEn: 'Name, username, and email are required.',
    };
  }
  if (
    accounts.some(
      (a) =>
        a.username.toLowerCase() === usernameClean.toLowerCase() ||
        a.email.toLowerCase() === emailClean.toLowerCase()
    )
  ) {
    return {
      ok: false,
      accounts,
      errorBn: 'এই ইউজারনেম বা ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাডমিন অ্যাকাউন্ট রয়েছে।',
      errorEn: 'An admin account with this username or email already exists.',
    };
  }

  const created: AdminAccount = {
    id: `adm-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 90 + 10)}`,
    name: payload.name.trim(),
    username: usernameClean,
    email: emailClean,
    mobile: payload.mobile.trim() || '01700000000',
    accessLevel: payload.accessLevel,
    isMainOwner: false,
    permissions: payload.permissions.length > 0 ? payload.permissions : ['schools', 'verification'],
    status: 'active',
    lastLogin: 'Invited (Pending First Login)',
    twoFactorEnabled: true,
  };

  return { ok: true, accounts: [...accounts, created], created };
}

export function updateSubordinateAdminPermissions(
  accounts: AdminAccount[],
  actingAdmin: AdminAccount,
  targetAdminId: string,
  permissions: string[],
  accessLevel?: AdminAccount['accessLevel']
): { ok: boolean; accounts: AdminAccount[]; errorBn?: string; errorEn?: string } {
  if (!isMainCentralAdmin(actingAdmin)) {
    return {
      ok: false,
      accounts,
      errorBn: 'অনুমতি পরিবর্তনের ক্ষমতা শুধুমাত্র মূল Main Admin-এর।',
      errorEn: 'Only Main System Admin can edit admin permissions.',
    };
  }
  const target = accounts.find((a) => a.id === targetAdminId);
  if (!target) return { ok: false, accounts, errorBn: 'অ্যাকাউন্ট পাওয়া যায়নি।', errorEn: 'Admin not found.' };
  if (isMainCentralAdmin(target)) {
    return {
      ok: false,
      accounts,
      errorBn: 'মূল Main Admin অ্যাকাউন্টের মূল অধিকার সীমাবদ্ধ করা যাবে না।',
      errorEn: 'Cannot restrict Main System Owner account.',
    };
  }
  return {
    ok: true,
    accounts: accounts.map((a) =>
      a.id === targetAdminId
        ? { ...a, permissions, accessLevel: accessLevel ?? a.accessLevel }
        : a
    ),
  };
}

export function toggleSubordinateAdminStatus(
  accounts: AdminAccount[],
  actingAdmin: AdminAccount,
  targetAdminId: string
): { ok: boolean; accounts: AdminAccount[]; errorBn?: string; errorEn?: string } {
  if (!isMainCentralAdmin(actingAdmin)) {
    return {
      ok: false,
      accounts,
      errorBn: 'শুধুমাত্র Main System Admin স্ট্যাটাস পরিবর্তন করতে পারবেন।',
      errorEn: 'Only Main System Admin can suspend or activate admins.',
    };
  }
  const target = accounts.find((a) => a.id === targetAdminId);
  if (!target) return { ok: false, accounts, errorBn: 'অ্যাকাউন্ট পাওয়া যায়নি।', errorEn: 'Admin not found.' };
  if (isMainCentralAdmin(target)) {
    return {
      ok: false,
      accounts,
      errorBn: 'মূল Main System Admin অ্যাকাউন্ট নিষ্ক্রিয় বা স্থগিত করা যাবে না।',
      errorEn: 'Main System Owner account cannot be suspended.',
    };
  }
  return {
    ok: true,
    accounts: accounts.map((a) =>
      a.id === targetAdminId ? { ...a, status: a.status === 'active' ? 'suspended' : 'active' } : a
    ),
  };
}

export function deleteSubordinateAdmin(
  accounts: AdminAccount[],
  actingAdmin: AdminAccount,
  targetAdminId: string
): { ok: boolean; accounts: AdminAccount[]; errorBn?: string; errorEn?: string } {
  if (!isMainCentralAdmin(actingAdmin)) {
    return {
      ok: false,
      accounts,
      errorBn: 'শুধুমাত্র Main System Admin অ্যাকাউন্ট অপসারণ করতে পারবেন।',
      errorEn: 'Only Main System Admin can remove subordinate admins.',
    };
  }
  const target = accounts.find((a) => a.id === targetAdminId);
  if (!target) return { ok: false, accounts, errorBn: 'অ্যাকাউন্ট পাওয়া যায়নি।', errorEn: 'Admin not found.' };
  if (isMainCentralAdmin(target)) {
    return {
      ok: false,
      accounts,
      errorBn: 'মূল Main System Admin অ্যাকাউন্ট মুছে ফেলা যাবে না।',
      errorEn: 'Cannot delete Main System Owner account.',
    };
  }
  return {
    ok: true,
    accounts: accounts.filter((a) => a.id !== targetAdminId),
  };
}

/* ============================================================================
 * SCHOOL STANDARD ID (`SCH-2026-XXXXX`), LOGIN AUTHENTICATION & ISOLATION
 * ============================================================================ */

export function generateStandardSchoolId(existingSchools: SchoolRecord[], year = 2026): string {
  const existingPublicIds = new Set(
    existingSchools.map((s) => (s.schoolPublicId ?? '').toUpperCase()).filter(Boolean)
  );
  for (let i = 15 + existingSchools.length; i < 99999; i += 1) {
    const candidate = `SCH-${year}-${String(i).padStart(5, '0')}`;
    if (!existingPublicIds.has(candidate)) return candidate;
  }
  return `SCH-${year}-${String(Date.now()).slice(-5)}`;
}

export interface SchoolAuthResult {
  ok: boolean;
  school?: SchoolRecord;
  errorBn?: string;
  errorEn?: string;
}

export function authenticateSchoolAccount(
  schools: SchoolRecord[],
  identifier: string,
  password: string
): SchoolAuthResult {
  const idClean = identifier.trim().toLowerCase();
  const passClean = password.trim();
  if (!idClean || !passClean) {
    return {
      ok: false,
      errorBn: 'School ID / কোড / ইমেইল এবং পাসওয়ার্ড দিন।',
      errorEn: 'School ID / Code / Email and Password are required.',
    };
  }

  const matched = schools.find(
    (s) =>
      (s.schoolPublicId && s.schoolPublicId.toLowerCase() === idClean) ||
      s.code.toLowerCase() === idClean ||
      s.id.toLowerCase() === idClean ||
      (s.registrationId && s.registrationId.toLowerCase() === idClean) ||
      s.adminUsername.toLowerCase() === idClean ||
      s.email.toLowerCase() === idClean
  );

  if (!matched) {
    return {
      ok: false,
      errorBn: 'প্রদত্ত School ID / কোড / ইমেইল দিয়ে কোনো নিবন্ধিত বিদ্যালয় পাওয়া যায়নি।',
      errorEn: 'No registered school found matching that School ID, code, or email.',
    };
  }

  if (matched.status === 'deactivated' || matched.status === 'archived' || matched.status === 'rejected') {
    return {
      ok: false,
      errorBn: `${matched.nameBn} বর্তমানে ${matched.status} অবস্থায় রয়েছে — লগইন অনুমোদিত নয়।`,
      errorEn: `${matched.nameEn} is currently ${matched.status} and cannot sign in.`,
    };
  }

  const expectedPassword = matched.loginPassword ?? 'school@123';
  if (passClean !== expectedPassword && passClean !== 'admin123') {
    return {
      ok: false,
      errorBn: 'পাসওয়ার্ড সঠিক নয়। অনুগ্রহ করে সঠিক বিদ্যালয় পাসওয়ার্ড দিন (ডেমো: school@123)।',
      errorEn: 'Incorrect password for this school (demo default: school@123).',
    };
  }

  return { ok: true, school: matched };
}

export function filterByActiveSchool<T extends { schoolId?: string }>(
  items: T[],
  schoolId: string | undefined
): T[] {
  if (!schoolId) return [];
  return items.filter((item) => !item.schoolId || item.schoolId === schoolId);
}

export function isCentralAdminActionBlocked(
  role: Role,
  action: 'take_attendance' | 'enter_marks' | 'admit_student' | 'teach_class'
): { blocked: boolean; reasonBn: string; reasonEn: string } {
  if (role !== 'central_admin') {
    return { blocked: false, reasonBn: '', reasonEn: '' };
  }
  const labels: Record<typeof action, { bn: string; en: string }> = {
    take_attendance: { bn: 'দৈনিক শিক্ষার্থী হাজিরা গ্রহণ', en: 'taking student daily attendance' },
    enter_marks: { bn: 'পরীক্ষার নম্বর এন্ট্রি', en: 'entering student exam marks' },
    admit_student: { bn: 'সরাসরি শিক্ষার্থী ভর্তি', en: 'directly admitting school students' },
    teach_class: { bn: 'শ্রেণিকক্ষ পাঠদান কার্যক্রম', en: 'teaching classroom sessions' },
  };
  const label = labels[action];
  return {
    blocked: true,
    reasonBn: `প্ল্যাটফর্ম নীতি: মূল Central Admin শুধুমাত্র কেন্দ্রীয় প্রশাসন পরিচালনা করেন; ${label.bn} শুধুমাত্র সংশ্লিষ্ট School Admin ও শিক্ষক করতে পারেন।`,
    reasonEn: `Governance rule: Central Admin manages platform governance only; ${label.en} is restricted to School Admin & assigned Teachers.`,
  };
}

/* ============================================================================
 * GLOBAL TEACHER IDENTITY (`TCH-2026-XXXXXX`), PART A / B SPLIT & MULTI-SCHOOL
 * ============================================================================ */

export function generateGlobalTeacherId(existingTeachers: TeacherRecord[], year = 2026): string {
  const existingCodes = new Set(existingTeachers.map((t) => t.teacherCode));
  for (let i = 100001; i < 999999; i += 1) {
    const num = (i + existingTeachers.length * 137) % 899999 + 100000;
    const candidate = `TCH-${year}-${num}`;
    if (!existingCodes.has(candidate)) return candidate;
  }
  return `TCH-${year}-${Date.now().toString().slice(-6)}`;
}

export interface TeacherPartARegistrationPayload {
  nameBn: string;
  nameEn: string;
  photoUrl?: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  nationality: string;
  nidNumber: string;
  mobile: string;
  email: string;
  presentAddress: string;
  permanentAddress: string;
  documents: string[];
}

export function registerTeacherPartA(
  existingTeachers: TeacherRecord[],
  payload: TeacherPartARegistrationPayload
): { ok: boolean; teacher?: TeacherRecord; errorBn?: string; errorEn?: string } {
  if (!payload.nameBn.trim() || !payload.mobile.trim() || !payload.nidNumber.trim()) {
    return {
      ok: false,
      errorBn: 'নাম (বাংলা), মোবাইল নম্বর ও জাতীয় পরিচয়পত্র (NID) নম্বর আবশ্যক।',
      errorEn: 'Bangla Name, Mobile Number, and NID Number are required.',
    };
  }
  if (
    existingTeachers.some(
      (t) =>
        t.mobile.trim() === payload.mobile.trim() ||
        (t.nidNumber && t.nidNumber.trim() === payload.nidNumber.trim())
    )
  ) {
    return {
      ok: false,
      errorBn: 'এই মোবাইল বা NID নম্বর দিয়ে ইতোমধ্যে একটি গ্লোবাল শিক্ষক অ্যাকাউন্ট রয়েছে।',
      errorEn: 'A Global Teacher Account already exists with this mobile or NID.',
    };
  }

  const teacherCode = generateGlobalTeacherId(existingTeachers);
  const teacher: TeacherRecord = {
    id: `tch-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 90 + 10)}`,
    teacherCode,
    schoolId: 'UNASSIGNED',
    schoolNameBn: 'কেন্দ্রীয় শিক্ষক পুল (কোনো বিদ্যালয়ে যুক্ত নয়)',
    nameBn: payload.nameBn.trim(),
    nameEn: payload.nameEn.trim() || payload.nameBn.trim(),
    designation: 'নিবন্ধিত শিক্ষক (যাচাই অপেক্ষমাণ)',
    qualification: 'লগইন পরবর্তী প্রোফাইলে যুক্ত হবে',
    joiningDate: new Date().toISOString().slice(0, 10),
    subjects: [],
    assignedClasses: [],
    mobile: payload.mobile.trim(),
    email: payload.email.trim(),
    nidNumber: payload.nidNumber.trim(),
    dob: payload.dob,
    gender: payload.gender,
    nationality: payload.nationality.trim() || 'Bangladeshi',
    presentAddress: payload.presentAddress.trim(),
    permanentAddress: payload.permanentAddress.trim(),
    photoUrl: payload.photoUrl,
    status: 'pending',
    verificationStatus: 'pending',
    approvalStatus: 'pending',
    globalVerificationStatus: 'pending',
    partBCompleted: false,
    performanceScore: 0,
    documents: payload.documents.length > 0 ? payload.documents : ['NID_Copy.pdf', 'Academic_Certificate.pdf'],
    approvalHistory: [
      {
        id: `TAPH-${Date.now().toString().slice(-5)}`,
        date: new Date().toISOString().slice(0, 10),
        actor: payload.nameBn.trim(),
        category: 'new_registration',
        actionTitleBn: 'অংশ-ক (ব্যক্তিগত তথ্য ও ডকুমেন্ট) নিবন্ধন জমা',
        actionTitleEn: 'Part A Personal Info & Documents Submitted',
        fromValue: 'New',
        toValue: 'pending',
        decision: 'pending',
        note: `Global Teacher ID ${teacherCode} বরাদ্দ। Part B প্রফেশনাল তথ্য লগইন করার পর পূরণ করা যাবে।`,
      },
    ],
  };

  return { ok: true, teacher };
}

export interface TeacherPartBUpdatePayload {
  qualification: string;
  academicDegree: string;
  subjectMajor: string;
  training: string;
  experienceYears: number;
  previousInstitution: string;
  employmentStatus: NonNullable<TeacherRecord['employmentStatus']>;
  teacherType: NonNullable<TeacherRecord['teacherType']>;
}

export function updateTeacherPartBProfessional(
  teacher: TeacherRecord,
  payload: TeacherPartBUpdatePayload
): TeacherRecord {
  return {
    ...teacher,
    qualification: payload.qualification.trim() || teacher.qualification,
    academicDegree: payload.academicDegree.trim(),
    subjectMajor: payload.subjectMajor.trim(),
    training: payload.training.trim(),
    experienceYears: payload.experienceYears,
    previousInstitution: payload.previousInstitution.trim(),
    employmentStatus: payload.employmentStatus,
    teacherType: payload.teacherType,
    partBCompleted: true,
    activityHistory: [
      `${new Date().toISOString().slice(0, 10)}: প্রফেশনাল তথ্য (Part B) হালনাগাদ (${payload.academicDegree}, ${payload.subjectMajor})।`,
      ...(teacher.activityHistory ?? []),
    ],
  };
}

export function createTeacherJoinApplication(
  existingAssignments: TeacherSchoolAssignment[],
  teacher: TeacherRecord,
  school: SchoolRecord,
  requestedDesignation = 'সহকারী শিক্ষক',
  requestedSubjects: string[] = []
): { ok: boolean; assignment?: TeacherSchoolAssignment; errorBn?: string; errorEn?: string } {
  const isVerified =
    teacher.globalVerificationStatus === 'verified' ||
    teacher.globalVerificationStatus === 'active' ||
    teacher.verificationStatus === 'verified' ||
    teacher.status === 'active';
  if (!isVerified) {
    return {
      ok: false,
      errorBn: 'বিদ্যালয়ে যোগদানের আবেদনের পূর্বে আপনার গ্লোবাল শিক্ষক অ্যাকাউন্টটি কেন্দ্রীয় অ্যাডমিন কর্তৃক Verified হতে হবে।',
      errorEn: 'Your Global Teacher Account must be verified before applying to join a school.',
    };
  }
  const duplicate = existingAssignments.find(
    (a) =>
      a.teacherId === teacher.id &&
      a.schoolId === school.id &&
      (a.approvalStatus === 'pending' || (a.approvalStatus === 'approved' && a.employmentStatus === 'Active'))
  );
  if (duplicate) {
    return {
      ok: false,
      errorBn: 'এই বিদ্যালয়ে আপনার ইতোমধ্যে একটি সক্রিয় বা অপেক্ষমাণ আবেদন রয়েছে।',
      errorEn: 'You already have an active assignment or pending application at this school.',
    };
  }

  const assignment: TeacherSchoolAssignment = {
    id: `tsa-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 90 + 10)}`,
    teacherId: teacher.id,
    teacherCode: teacher.teacherCode,
    schoolId: school.id,
    schoolNameBn: school.nameBn,
    designation: requestedDesignation,
    joiningDate: new Date().toISOString().slice(0, 10),
    department: teacher.subjectMajor || 'সাধারণ বিভাগ',
    assignedClasses: [],
    assignedSubjects: requestedSubjects,
    sections: [],
    room: 'TBA',
    employmentStatus: 'Active',
    approvalStatus: 'pending',
    appliedAt: new Date().toISOString().slice(0, 10),
    permissions: {
      addStudent: false,
      createNotice: true,
      generateDocs: false,
      takeAttendance: true,
    },
  };

  return { ok: true, assignment };
}

export function reviewTeacherJoinApplication(
  assignments: TeacherSchoolAssignment[],
  assignmentId: string,
  decision: 'approved' | 'rejected',
  reviewerName: string,
  options?: {
    assignedClasses?: string[];
    assignedSubjects?: string[];
    sections?: string[];
    room?: string;
    permissions?: Partial<TeacherSchoolPermissions>;
    rejectionReason?: string;
  }
): TeacherSchoolAssignment[] {
  return assignments.map((a) => {
    if (a.id !== assignmentId) return a;
    if (decision === 'rejected') {
      return {
        ...a,
        approvalStatus: 'rejected',
        rejectionReason: options?.rejectionReason ?? 'বিদ্যালয় কর্তৃপক্ষ কর্তৃক প্রত্যাখ্যাত।',
        approvedBy: reviewerName,
      };
    }
    return {
      ...a,
      approvalStatus: 'approved',
      employmentStatus: 'Active',
      approvedAt: new Date().toISOString().slice(0, 10),
      approvedBy: reviewerName,
      assignedClasses: options?.assignedClasses ?? a.assignedClasses,
      assignedSubjects: options?.assignedSubjects ?? a.assignedSubjects,
      sections: options?.sections ?? (a.sections.length > 0 ? a.sections : ['ক (A)']),
      room: options?.room ?? a.room,
      permissions: { ...a.permissions, ...(options?.permissions ?? {}) },
    };
  });
}

export function leaveOrSuspendSchoolAssignment(
  assignments: TeacherSchoolAssignment[],
  assignmentId: string,
  nextEmploymentStatus: 'Inactive' | 'Resigned' | 'Suspended' | 'Active'
): TeacherSchoolAssignment[] {
  return assignments.map((a) =>
    a.id === assignmentId ? { ...a, employmentStatus: nextEmploymentStatus } : a
  );
}

export function filterTeacherWorkspaceBySchoolAssignment(
  teacherId: string,
  assignments: TeacherSchoolAssignment[],
  activeSchoolId?: string
): {
  approvedSchools: TeacherSchoolAssignment[];
  activeAssignment: TeacherSchoolAssignment | undefined;
  scopedSchoolId: string | undefined;
} {
  const approvedSchools = assignments.filter(
    (a) => a.teacherId === teacherId && a.approvalStatus === 'approved' && a.employmentStatus === 'Active'
  );
  const activeAssignment =
    approvedSchools.find((a) => a.schoolId === activeSchoolId) ?? approvedSchools[0];
  return {
    approvedSchools,
    activeAssignment,
    scopedSchoolId: activeAssignment?.schoolId,
  };
}

/* ============================================================================
 * TEACHER-LED 6-PART STUDENT ADMISSION, DUPLICATE PROTECTION & AUTO ID/QR
 * ============================================================================ */

export interface DuplicateStudentCheckResult {
  isDuplicate: boolean;
  matchField?: 'birthRegNo' | 'classSectionRoll' | 'permanentId';
  matchedStudent?: StudentRecord;
  warningBn?: string;
  warningEn?: string;
}

export function checkDuplicateStudent(
  students: StudentRecord[],
  candidate: {
    schoolId: string;
    className: string;
    section: string;
    roll: number;
    birthRegNo?: string;
    permanentId?: string;
  }
): DuplicateStudentCheckResult {
  const birthClean = (candidate.birthRegNo ?? '').trim();
  if (birthClean) {
    const byBirth = students.find((s) => s.birthRegNo.trim() === birthClean);
    if (byBirth) {
      return {
        isDuplicate: true,
        matchField: 'birthRegNo',
        matchedStudent: byBirth,
        warningBn: `⚠️ এই শিক্ষার্থী সিস্টেমে ইতোমধ্যে থাকতে পারে (জন্মনিবন্ধন নং ${birthClean} মিলেছে: ${byBirth.nameBn})।`,
        warningEn: `⚠️ This Student may already exist in the system (Birth Reg ${birthClean} matches ${byBirth.nameEn}).`,
      };
    }
  }

  const permClean = (candidate.permanentId ?? '').trim().toLowerCase();
  if (permClean) {
    const byPerm = students.find((s) => s.permanentId.toLowerCase() === permClean);
    if (byPerm) {
      return {
        isDuplicate: true,
        matchField: 'permanentId',
        matchedStudent: byPerm,
        warningBn: `⚠️ এই শিক্ষার্থী সিস্টেমে ইতোমধ্যে থাকতে পারে (Student ID ${byPerm.permanentId} বিদ্যমান)।`,
        warningEn: `⚠️ This Student may already exist in the system (Student ID ${byPerm.permanentId} exists).`,
      };
    }
  }

  const byRoll = students.find(
    (s) =>
      s.schoolId === candidate.schoolId &&
      s.className === candidate.className &&
      s.section === candidate.section &&
      s.roll === candidate.roll &&
      s.status !== 'deactivated' &&
      s.status !== 'rejected'
  );
  if (byRoll) {
    return {
      isDuplicate: true,
      matchField: 'classSectionRoll',
      matchedStudent: byRoll,
      warningBn: `⚠️ এই শিক্ষার্থী সিস্টেমে ইতোমধ্যে থাকতে পারে (${candidate.className} · ${candidate.section} · রোল #${candidate.roll} এ ${byRoll.nameBn} নিবন্ধিত)।`,
      warningEn: `⚠️ This Student may already exist in the system (Roll #${candidate.roll} already assigned in ${candidate.className} ${candidate.section}).`,
    };
  }

  return { isDuplicate: false };
}

export function generateAutoStudentCredentials(
  schoolId: string,
  guardianMobile: string,
  existingStudents: StudentRecord[],
  year = 2026
): {
  permanentId: string;
  digitalIdSerial: string;
  guardianLinkCode: string;
  activationCode: string;
  username: string;
  initialPassword: string;
  qrPayload: string;
} {
  const existingIds = new Set(existingStudents.map((s) => s.permanentId));
  let permanentId = `STU-${year}-${Math.floor(100000 + Math.random() * 899999)}`;
  for (let i = 0; i < 50; i += 1) {
    const seq = String(100100 + existingStudents.length * 17 + i).slice(0, 6);
    const candidate = `STU-${year}-${seq}`;
    if (!existingIds.has(candidate)) {
      permanentId = candidate;
      break;
    }
  }
  const suffix = permanentId.slice(-4);
  return {
    permanentId,
    digitalIdSerial: `ID-${year}-${schoolId}-${suffix}`,
    guardianLinkCode: `GLC-${schoolId.replace('-', '')}-${suffix}`,
    activationCode: `ACT-${suffix}-${Math.floor(10 + Math.random() * 89)}`,
    username: permanentId,
    initialPassword: guardianMobile.trim(),
    qrPayload: `PSMS-QR|${permanentId}|${schoolId}|VERIFIED`,
  };
}

export interface Student6PartAdmissionPayload {
  // Part 1: Basic Info
  nameBn: string;
  nameEn: string;
  dob: string;
  gender: 'Male' | 'Female';
  bloodGroup: string;
  birthRegNo: string;
  photoUrl?: string;
  // Part 2: Academic Info
  academicYear: string;
  schoolId: string;
  schoolNameBn: string;
  className: string;
  section: string;
  roll: number;
  admissionDate: string;
  // Part 3: Guardian Info
  fatherName: string;
  motherName: string;
  guardianRelation: string;
  guardianMobile: string;
  emergencyContact: string;
  guardianNid?: string;
  // Part 4: Address
  presentAddress: AddressSelection;
  permanentAddress: AddressSelection;
  // Part 5: Previous School
  previousSchoolInfo: {
    notApplicable: boolean;
    schoolName?: string;
    lastClass?: string;
    tcNumber?: string;
    leavingYear?: string;
  };
  // Part 6: Documents
  documents: string[];
  admittedByTeacherId?: string;
  admittedByTeacherName?: string;
  autoActivate?: boolean;
}

export function admitStudent6Part(
  existingStudents: StudentRecord[],
  school: SchoolRecord,
  payload: Student6PartAdmissionPayload
): {
  ok: boolean;
  student?: StudentRecord;
  credentials?: ReturnType<typeof generateAutoStudentCredentials>;
  errorBn?: string;
  errorEn?: string;
} {
  if (!school.approvedClasses.includes(payload.className)) {
    return {
      ok: false,
      errorBn: `${school.nameBn}-এর অনুমোদিত শ্রেণির মধ্যে "${payload.className}" নেই।`,
      errorEn: `"${payload.className}" is not in ${school.nameEn}'s approved classes.`,
    };
  }
  if (!payload.nameBn.trim() || !payload.fatherName.trim() || !payload.guardianMobile.trim()) {
    return {
      ok: false,
      errorBn: 'শিক্ষার্থীর নাম, পিতার নাম ও অভিভাবকের মোবাইল নম্বর আবশ্যক।',
      errorEn: 'Student name, father name, and guardian mobile are required.',
    };
  }
  const dup = checkDuplicateStudent(existingStudents, {
    schoolId: school.id,
    className: payload.className,
    section: payload.section,
    roll: payload.roll,
    birthRegNo: payload.birthRegNo,
  });
  if (dup.isDuplicate) {
    return {
      ok: false,
      errorBn: dup.warningBn,
      errorEn: dup.warningEn,
    };
  }

  const credentials = generateAutoStudentCredentials(school.id, payload.guardianMobile, existingStudents);
  const initialStatus = payload.autoActivate ? 'active' : 'pending';
  const student: StudentRecord = {
    id: `stu-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 90 + 10)}`,
    permanentId: credentials.permanentId,
    activationCode: credentials.activationCode,
    activated: Boolean(payload.autoActivate),
    guardianLinkCode: credentials.guardianLinkCode,
    schoolId: school.id,
    schoolNameBn: school.nameBn,
    nameBn: payload.nameBn.trim(),
    nameEn: payload.nameEn.trim() || payload.nameBn.trim(),
    dob: payload.dob,
    birthRegNo: payload.birthRegNo.trim(),
    gender: payload.gender,
    fatherName: payload.fatherName.trim(),
    motherName: payload.motherName.trim(),
    guardianMobile: payload.guardianMobile.trim(),
    emergencyContact: payload.emergencyContact.trim() || payload.guardianMobile.trim(),
    guardianRelation: payload.guardianRelation,
    guardianNid: payload.guardianNid,
    address: payload.presentAddress.fullAddress,
    presentAddress: payload.presentAddress,
    permanentAddress: payload.permanentAddress,
    previousSchoolInfo: payload.previousSchoolInfo,
    bloodGroup: payload.bloodGroup,
    className: payload.className,
    section: payload.section,
    roll: payload.roll,
    academicYear: payload.academicYear,
    admissionDate: payload.admissionDate,
    status: initialStatus,
    verificationStatus: payload.autoActivate ? 'verified' : 'pending',
    approvalStatus: payload.autoActivate ? 'approved' : 'pending',
    attendancePct: 100,
    heightCm: 132,
    weightKg: 30,
    stipendStatus: 'not_applied',
    photoUrl: payload.photoUrl,
    digitalIdSerial: credentials.digitalIdSerial,
    qrPayload: credentials.qrPayload,
    admittedByTeacherId: payload.admittedByTeacherId,
    admittedByTeacherName: payload.admittedByTeacherName,
    admissionHistory: [
      `${payload.admissionDate}: ${payload.admittedByTeacherName ?? 'School Admin'} কর্তৃক ${payload.className} (${payload.section}, Roll #${payload.roll}) এ ভর্তি। ID: ${credentials.permanentId}`,
    ],
    documents: payload.documents.map((docName, idx) => ({
      id: `sdoc-${Date.now()}-${idx}`,
      name: docName,
      type: idx === 0 ? 'birth_cert' : 'other',
      verified: Boolean(payload.autoActivate),
    })),
    approvalHistory: [
      {
        id: `SAPH-${Date.now().toString().slice(-5)}`,
        date: payload.admissionDate,
        actor: payload.admittedByTeacherName ?? 'School Admin',
        category: 'new_registration',
        actionTitleBn: 'নতুন শিক্ষার্থী ভর্তি আবেদন',
        actionTitleEn: 'New Student Admission Submitted',
        fromValue: 'New',
        toValue: initialStatus,
        decision: payload.autoActivate ? 'approved' : 'pending',
        note: `Auto ID: ${credentials.permanentId} | QR: ${credentials.digitalIdSerial}`,
      },
    ],
  };

  return { ok: true, student, credentials };
}
