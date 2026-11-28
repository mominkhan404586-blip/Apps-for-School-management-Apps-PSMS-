import type {
  AdminAccount,
  ParentAccountRecord,
  SchoolRecord,
  StudentRecord,
  TeacherRecord,
} from '../types';
import {
  checkUsernameAndUniqueIdUniqueness,
  getSuggestedAvatarsByGender,
} from './userAccountProfileEngine';

export interface RegisterParentInput {
  name: string;
  username: string;
  uniqueIdCode: string;
  mobile: string;
  email?: string;
  gender: 'Male' | 'Female';
  password: string;
  photoUrl?: string;
  initialSchoolQuery?: string;
  initialStudentQuery?: string;
  existingParents: ParentAccountRecord[];
  schools: SchoolRecord[];
  teachers: TeacherRecord[];
  admins: AdminAccount[];
  students: StudentRecord[];
}

export interface RegisterParentResult {
  ok: boolean;
  parent?: ParentAccountRecord;
  updatedStudents?: StudentRecord[];
  linkedChild?: StudentRecord;
  errorBn?: string;
  errorEn?: string;
}

export function registerParentAccount(input: RegisterParentInput): RegisterParentResult {
  const name = input.name.trim();
  const username = input.username.trim();
  const uniqueIdCode = input.uniqueIdCode.trim();
  const mobile = input.mobile.trim();
  const password = input.password.trim();

  if (!name || !mobile || password.length < 6) {
    return {
      ok: false,
      errorBn: 'নাম, মোবাইল নম্বর এবং কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড প্রয়োজন।',
      errorEn: 'Name, mobile number, and password (min 6 characters) are required.',
    };
  }

  const mobileTaken = input.existingParents.some(
    (p) => p.mobile.trim().toLowerCase() === mobile.toLowerCase()
  );
  if (mobileTaken) {
    return {
      ok: false,
      errorBn: 'এই মোবাইল নম্বর দিয়ে ইতোমধ্যে একটি Parent অ্যাকাউন্ট নিবন্ধিত রয়েছে।',
      errorEn: 'A Parent account is already registered with this mobile number.',
    };
  }

  const uniq = checkUsernameAndUniqueIdUniqueness({
    candidateUsername: username,
    candidateUniqueIdCode: uniqueIdCode,
    currentEntityId: `par-new-${Date.now()}`,
    admins: input.admins,
    schools: input.schools,
    teachers: input.teachers,
    parents: input.existingParents,
    students: input.students,
  });

  if (!uniq.ok) {
    return { ok: false, errorBn: uniq.errorBn, errorEn: uniq.errorEn };
  }

  const defaultAvatar = getSuggestedAvatarsByGender(input.gender)[0]?.dataUrl;
  let parent: ParentAccountRecord = {
    id: `par-${Date.now()}`,
    name,
    username,
    uniqueIdCode,
    email: input.email?.trim() || undefined,
    mobile,
    gender: input.gender,
    photoUrl: input.photoUrl || defaultAvatar,
    password,
    linkedChildIds: [],
    verificationStatus: 'pending',
    createdAt: new Date().toISOString().slice(0, 10),
  };

  let updatedStudents = [...input.students];
  let linkedChild: StudentRecord | undefined;

  if (input.initialSchoolQuery?.trim() && input.initialStudentQuery?.trim()) {
    const linkRes = linkChildToParentAccount({
      parentAccount: parent,
      schoolQuery: input.initialSchoolQuery,
      studentQuery: input.initialStudentQuery,
      schools: input.schools,
      students: updatedStudents,
    });
    if (!linkRes.ok) {
      return { ok: false, errorBn: linkRes.errorBn, errorEn: linkRes.errorEn };
    }
    parent = linkRes.parent!;
    updatedStudents = linkRes.students!;
    linkedChild = linkRes.linkedStudent;
  }

  return { ok: true, parent, updatedStudents, linkedChild };
}

export interface LinkChildToParentInput {
  parentAccount: ParentAccountRecord;
  schoolQuery: string;
  studentQuery: string;
  schools: SchoolRecord[];
  students: StudentRecord[];
}

export interface LinkChildToParentResult {
  ok: boolean;
  code?: 'linked' | 'already_linked' | 'school_not_found' | 'student_not_found' | 'invalid_input';
  parent?: ParentAccountRecord;
  students?: StudentRecord[];
  linkedStudent?: StudentRecord;
  school?: SchoolRecord;
  errorBn?: string;
  errorEn?: string;
  successBn?: string;
  successEn?: string;
}

export function matchSchoolByQuery(schools: SchoolRecord[], query: string): SchoolRecord | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return schools.find(
    (s) =>
      s.id.toLowerCase() === q ||
      s.code.toLowerCase() === q ||
      (s.schoolPublicId ?? '').toLowerCase() === q ||
      (s.registrationId ?? '').toLowerCase() === q ||
      s.adminUsername.toLowerCase() === q ||
      (s.uniqueIdCode ?? '').toLowerCase() === q
  );
}

export function matchStudentInSchoolByQuery(
  students: StudentRecord[],
  schoolId: string,
  studentQuery: string
): StudentRecord | undefined {
  const q = studentQuery.trim().toLowerCase();
  if (!q) return undefined;
  return students.find(
    (st) =>
      st.schoolId === schoolId &&
      (st.permanentId.toLowerCase() === q ||
        st.id.toLowerCase() === q ||
        (st.username ?? '').toLowerCase() === q ||
        (st.uniqueIdCode ?? '').toLowerCase() === q ||
        (st.digitalIdSerial ?? '').toLowerCase() === q ||
        st.guardianLinkCode.toLowerCase() === q)
  );
}

export function linkChildToParentAccount(
  input: LinkChildToParentInput
): LinkChildToParentResult {
  const sQuery = input.schoolQuery.trim();
  const stQuery = input.studentQuery.trim();
  if (!sQuery || !stQuery) {
    return {
      ok: false,
      code: 'invalid_input',
      errorBn: 'বিদ্যালয়ের ID/কোড এবং শিক্ষার্থীর Student ID বা Username লিখুন।',
      errorEn: 'Please provide both School ID/Code and Student ID or Username.',
    };
  }

  const matchedSchool = matchSchoolByQuery(input.schools, sQuery);
  if (!matchedSchool) {
    return {
      ok: false,
      code: 'school_not_found',
      errorBn: 'প্রদত্ত School ID বা কোডের কোনো বিদ্যালয় পাওয়া যায়নি।',
      errorEn: 'No school found matching that School ID, Code, or Username.',
    };
  }

  const matchedStudent = matchStudentInSchoolByQuery(input.students, matchedSchool.id, stQuery);
  if (!matchedStudent) {
    return {
      ok: false,
      code: 'student_not_found',
      errorBn: `${matchedSchool.nameBn}-এ "${stQuery}" আইডি বা ইউজারনেমের কোনো শিক্ষার্থী পাওয়া যায়নি।`,
      errorEn: `No student matching "${stQuery}" was found in ${matchedSchool.nameEn}.`,
    };
  }

  if (input.parentAccount.linkedChildIds.includes(matchedStudent.id)) {
    return {
      ok: false,
      code: 'already_linked',
      errorBn: `${matchedStudent.nameBn} ইতোমধ্যেই আপনার Parent অ্যাকাউন্টে যুক্ত আছে।`,
      errorEn: `${matchedStudent.nameEn} is already linked to your Parent account.`,
    };
  }

  const nextParent: ParentAccountRecord = {
    ...input.parentAccount,
    linkedChildIds: [...input.parentAccount.linkedChildIds, matchedStudent.id],
    updatedAt: new Date().toISOString(),
  };

  const nextStudents = input.students.map((st) =>
    st.id === matchedStudent.id
      ? {
          ...st,
          guardianUserId: nextParent.id,
          guardianMobile: st.guardianMobile || nextParent.mobile,
        }
      : st
  );

  return {
    ok: true,
    code: 'linked',
    parent: nextParent,
    students: nextStudents,
    linkedStudent: matchedStudent,
    school: matchedSchool,
    successBn: `${matchedStudent.nameBn} (${matchedSchool.nameBn}) সফলভাবে আপনার সন্তানের তালিকায় যুক্ত হয়েছে।`,
    successEn: `${matchedStudent.nameEn} (${matchedSchool.nameEn}) linked to your Parent account.`,
  };
}

export interface ParentAuthMatchResult {
  ok: boolean;
  parent?: ParentAccountRecord;
  linkedStudentIds: string[];
  errorBn?: string;
  errorEn?: string;
}

export function authenticateRegisteredParent(
  parents: ParentAccountRecord[],
  students: StudentRecord[],
  identifier: string,
  password: string,
  passwordOverrides: Record<string, string> = {}
): ParentAuthMatchResult {
  const idLower = identifier.trim().toLowerCase();
  const pass = password.trim();
  if (!idLower || !pass) {
    return {
      ok: false,
      linkedStudentIds: [],
      errorBn: 'Parent ইউজারনেম / মোবাইল এবং পাসওয়ার্ড দিন।',
      errorEn: 'Parent username / mobile and password are required.',
    };
  }

  const matchedParent = parents.find(
    (p) =>
      p.id.toLowerCase() === idLower ||
      p.username.toLowerCase() === idLower ||
      p.uniqueIdCode.toLowerCase() === idLower ||
      p.mobile.toLowerCase() === idLower ||
      (p.email ?? '').toLowerCase() === idLower
  );

  if (matchedParent) {
    const customPass =
      passwordOverrides[`guardian:${matchedParent.id.toLowerCase()}`] ||
      passwordOverrides[`guardian:${matchedParent.mobile.toLowerCase()}`];
    const expectedPass = customPass || matchedParent.password;
    if (pass !== expectedPass) {
      return {
        ok: false,
        linkedStudentIds: [],
        errorBn: 'Parent অ্যাকাউন্টের পাসওয়ার্ড সঠিক নয়।',
        errorEn: 'Incorrect Parent account password.',
      };
    }

    const linkedIds = Array.from(
      new Set([
        ...matchedParent.linkedChildIds,
        ...students
          .filter(
            (st) =>
              st.guardianUserId === matchedParent.id ||
              (st.guardianMobile &&
                st.guardianMobile.toLowerCase() === matchedParent.mobile.toLowerCase())
          )
          .map((st) => st.id),
      ])
    );

    return {
      ok: true,
      parent: matchedParent,
      linkedStudentIds: linkedIds,
    };
  }

  return {
    ok: false,
    linkedStudentIds: [],
    errorBn: 'প্রদত্ত তথ্যের সাথে মিলছে এমন কোনো Parent অ্যাকাউন্ট পাওয়া যায়নি।',
    errorEn: 'No Parent account found matching those credentials.',
  };
}
