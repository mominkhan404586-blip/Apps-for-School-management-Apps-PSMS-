import type {
  Role,
  SchoolRecord,
  StudentApprovalHistoryItem,
  StudentChangeRequest,
  StudentImportantFieldKey,
  StudentRecord,
  StudentStatus,
} from '../types';

export const STANDARD_CLASSES = [
  'Pre-Primary',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
] as const;

export const IMPORTANT_FIELD_LABELS: Record<
  StudentImportantFieldKey,
  { labelBn: string; labelEn: string }
> = {
  nameBn: { labelBn: 'শিক্ষার্থীর বাংলা নাম', labelEn: 'Student Name (Bangla)' },
  nameEn: { labelBn: 'শিক্ষার্থীর ইংরেজি নাম', labelEn: 'Student Name (English)' },
  dob: { labelBn: 'জন্মতারিখ', labelEn: 'Date of Birth' },
  birthRegNo: { labelBn: 'জন্মনিবন্ধন নম্বর', labelEn: 'Birth Registration No.' },
  fatherName: { labelBn: 'পিতার নাম', labelEn: 'Father Name' },
  motherName: { labelBn: 'মাতার নাম', labelEn: 'Mother Name' },
  className: { labelBn: 'শ্রেণি', labelEn: 'Class' },
  guardianMobile: { labelBn: 'অভিভাবকের মোবাইল নম্বর', labelEn: 'Guardian Mobile' },
  bloodGroup: { labelBn: 'রক্তের গ্রুপ', labelEn: 'Blood Group' },
};

export interface StudentSummaryCounts {
  total: number;
  boys: number;
  girls: number;
  active: number;
  pending: number;
  under_review: number;
  rejected: number;
  suspended: number;
  deactivated: number;
  pendingRequestsCount: number;
}

export function computeStudentSummaryCounts(
  students: StudentRecord[],
  requests: StudentChangeRequest[] = []
): StudentSummaryCounts {
  return {
    total: students.length,
    boys: students.filter((s) => s.gender === 'Male').length,
    girls: students.filter((s) => s.gender === 'Female').length,
    active: students.filter((s) => s.status === 'active').length,
    pending: students.filter((s) => s.status === 'pending').length,
    under_review: students.filter((s) => s.status === 'under_review').length,
    rejected: students.filter((s) => s.status === 'rejected').length,
    suspended: students.filter((s) => s.status === 'suspended').length,
    deactivated: students.filter((s) => s.status === 'deactivated').length,
    pendingRequestsCount: requests.filter(
      (r) => r.status === 'pending' || r.status === 'under_review'
    ).length,
  };
}

export interface ClassGenderBreakdownRow {
  className: string;
  boys: number;
  girls: number;
  total: number;
}

export interface SchoolGenderBreakdownRow {
  schoolId: string;
  schoolCode: string;
  schoolNameBn: string;
  division: string;
  district: string;
  upazila: string;
  boys: number;
  girls: number;
  total: number;
  pendingCount: number;
}

export interface GeoGenderBreakdownRow {
  division: string;
  district: string;
  upazila: string;
  schoolCount: number;
  boys: number;
  girls: number;
  total: number;
}

export interface StudentFilterCriteria {
  search?: string;
  division?: string;
  district?: string;
  upazila?: string;
  schoolId?: string;
  className?: string;
  gender?: string;
  status?: string;
}

export function filterAdminStudents(
  students: StudentRecord[],
  schools: SchoolRecord[],
  filters: StudentFilterCriteria
): StudentRecord[] {
  const schoolById = new Map(schools.map((s) => [s.id, s]));
  const q = (filters.search ?? '').trim().toLowerCase();

  return students.filter((st) => {
    const school = schoolById.get(st.schoolId);
    if (filters.division && filters.division !== 'ALL' && school?.division !== filters.division) {
      return false;
    }
    if (filters.district && filters.district !== 'ALL' && school?.district !== filters.district) {
      return false;
    }
    if (filters.upazila && filters.upazila !== 'ALL' && school?.upazila !== filters.upazila) {
      return false;
    }
    if (filters.schoolId && filters.schoolId !== 'ALL' && st.schoolId !== filters.schoolId) {
      return false;
    }
    if (filters.className && filters.className !== 'ALL' && st.className !== filters.className) {
      return false;
    }
    if (filters.gender && filters.gender !== 'ALL' && st.gender !== filters.gender) {
      return false;
    }
    if (filters.status && filters.status !== 'ALL' && st.status !== filters.status) {
      return false;
    }
    if (q) {
      const hay = `${st.permanentId} ${st.nameBn} ${st.nameEn} ${st.schoolNameBn} ${st.birthRegNo} ${st.guardianMobile} ${st.className}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function computeClassBreakdown(
  students: StudentRecord[],
  schools: SchoolRecord[],
  filters: Pick<StudentFilterCriteria, 'division' | 'district' | 'upazila' | 'schoolId'> = {}
): ClassGenderBreakdownRow[] {
  const scoped = filterAdminStudents(students, schools, filters).filter(
    (s) => s.status !== 'deactivated' && s.status !== 'rejected'
  );

  return STANDARD_CLASSES.map((cls) => {
    const inClass = scoped.filter((s) => s.className === cls);
    const boys = inClass.filter((s) => s.gender === 'Male').length;
    const girls = inClass.filter((s) => s.gender === 'Female').length;
    return {
      className: cls,
      boys,
      girls,
      total: inClass.length,
    };
  });
}

export function computeSchoolStudentBreakdown(
  students: StudentRecord[],
  schools: SchoolRecord[]
): SchoolGenderBreakdownRow[] {
  return schools.map((sch) => {
    const inSchool = students.filter(
      (st) => st.schoolId === sch.id && st.status !== 'deactivated' && st.status !== 'rejected'
    );
    const pendingCount = students.filter(
      (st) => st.schoolId === sch.id && (st.status === 'pending' || st.status === 'under_review')
    ).length;
    return {
      schoolId: sch.id,
      schoolCode: sch.code,
      schoolNameBn: sch.nameBn,
      division: sch.division,
      district: sch.district,
      upazila: sch.upazila,
      boys: inSchool.filter((s) => s.gender === 'Male').length,
      girls: inSchool.filter((s) => s.gender === 'Female').length,
      total: inSchool.length,
      pendingCount,
    };
  });
}

export function computeGeoStudentBreakdown(
  students: StudentRecord[],
  schools: SchoolRecord[]
): GeoGenderBreakdownRow[] {
  const map = new Map<string, GeoGenderBreakdownRow & { schoolIds: Set<string> }>();
  const schoolById = new Map(schools.map((s) => [s.id, s]));

  for (const sch of schools) {
    const key = `${sch.division}::${sch.district}::${sch.upazila}`;
    if (!map.has(key)) {
      map.set(key, {
        division: sch.division,
        district: sch.district,
        upazila: sch.upazila,
        schoolCount: 0,
        boys: 0,
        girls: 0,
        total: 0,
        schoolIds: new Set<string>(),
      });
    }
    const bucket = map.get(key)!;
    bucket.schoolIds.add(sch.id);
    bucket.schoolCount = bucket.schoolIds.size;
  }

  for (const st of students) {
    if (st.status === 'deactivated' || st.status === 'rejected') continue;
    const sch = schoolById.get(st.schoolId);
    if (!sch) continue;
    const key = `${sch.division}::${sch.district}::${sch.upazila}`;
    const bucket = map.get(key);
    if (!bucket) continue;
    if (st.gender === 'Male') bucket.boys += 1;
    else bucket.girls += 1;
    bucket.total += 1;
  }

  return Array.from(map.values()).map(({ schoolIds: _unused, ...row }) => row);
}

export interface StudentEditPatch {
  nameBn: string;
  nameEn: string;
  gender: 'Male' | 'Female';
  dob: string;
  birthRegNo: string;
  fatherName: string;
  motherName: string;
  guardianMobile: string;
  emergencyContact?: string;
  address?: string;
  bloodGroup: string;
  className: string;
  section: string;
  roll: number;
  gpa?: string;
  reason?: string;
}

export function applyStudentEdit(
  student: StudentRecord,
  patch: StudentEditPatch,
  actor: string,
  dateStr: string
): { updatedStudent: StudentRecord; changedFields: string[] } {
  const changedFields: string[] = [];
  if (patch.nameBn !== student.nameBn) changedFields.push('নাম (বাংলা)');
  if (patch.nameEn !== student.nameEn) changedFields.push('Name (EN)');
  if (patch.className !== student.className || patch.roll !== student.roll) {
    changedFields.push('শ্রেণি/রোল');
  }
  if (patch.guardianMobile !== student.guardianMobile) changedFields.push('অভিভাবকের মোবাইল');
  if (patch.birthRegNo !== student.birthRegNo) changedFields.push('জন্মনিবন্ধন');

  const historyEntry: StudentApprovalHistoryItem = {
    id: `SAPH-${Date.now().toString().slice(-5)}`,
    date: dateStr,
    actor,
    category: 'profile_edit',
    actionTitleBn: 'শিক্ষার্থীর প্রোফাইল তথ্য সম্পাদনা',
    actionTitleEn: 'Student Profile Edited',
    fromValue: `${student.nameBn} (${student.className}, Roll ${student.roll})`,
    toValue: `${patch.nameBn} (${patch.className}, Roll ${patch.roll})`,
    decision: 'completed',
    note: patch.reason || changedFields.join(', ') || 'Profile updated',
  };

  return {
    changedFields,
    updatedStudent: {
      ...student,
      nameBn: patch.nameBn.trim(),
      nameEn: patch.nameEn.trim(),
      gender: patch.gender,
      dob: patch.dob.trim(),
      birthRegNo: patch.birthRegNo.trim(),
      fatherName: patch.fatherName.trim(),
      motherName: patch.motherName.trim(),
      guardianMobile: patch.guardianMobile.trim(),
      emergencyContact: patch.emergencyContact?.trim() || patch.guardianMobile.trim(),
      address: patch.address?.trim() || student.address,
      bloodGroup: patch.bloodGroup,
      className: patch.className,
      section: patch.section.trim(),
      roll: patch.roll,
      gpa: patch.gpa ?? student.gpa,
      approvalHistory: [historyEntry, ...(student.approvalHistory ?? [])],
    },
  };
}

export function applyStudentTransfer(
  student: StudentRecord,
  targetSchool: SchoolRecord,
  reason: string,
  actor: string,
  dateStr: string
): { updatedStudent: StudentRecord; previousSchoolNameBn: string } {
  const previousSchoolNameBn = student.schoolNameBn;
  const previousSchools = [
    ...(student.previousSchools ?? []),
    `${previousSchoolNameBn} (${student.schoolId}) · ${student.className}`,
  ];

  const historyItem: StudentApprovalHistoryItem = {
    id: `SAPH-${Date.now().toString().slice(-5)}`,
    date: dateStr,
    actor,
    category: 'school_transfer',
    actionTitleBn: 'শিক্ষার্থী বিদ্যালয় পরিবর্তন (School Transfer)',
    actionTitleEn: 'Student School Transfer Executed',
    fromValue: `${previousSchoolNameBn} (${student.schoolId})`,
    toValue: `${targetSchool.nameBn} (${targetSchool.id})`,
    decision: 'approved',
    note: reason,
  };

  return {
    previousSchoolNameBn,
    updatedStudent: {
      ...student,
      schoolId: targetSchool.id,
      schoolNameBn: targetSchool.nameBn,
      previousSchools,
      admissionHistory: [
        ...student.admissionHistory,
        `${dateStr}: ${previousSchoolNameBn} → ${targetSchool.nameBn} (${reason})`,
      ],
      approvalHistory: [historyItem, ...(student.approvalHistory ?? [])],
    },
  };
}

export function executeStudentStatusChange(
  student: StudentRecord,
  nextStatus: StudentStatus,
  reason: string,
  actor: string,
  dateStr: string
): StudentRecord {
  const titleMap: Record<StudentStatus, { bn: string; en: string }> = {
    active: { bn: 'শিক্ষার্থী অনুমোদিত / সক্রিয়', en: 'Student Approved / Activated' },
    pending: { bn: 'অপেক্ষমান (Pending) হিসেবে চিহ্নিত', en: 'Marked Pending' },
    under_review: { bn: 'তথ্য ও নথি পর্যালোচনাধীন', en: 'Under Review' },
    rejected: { bn: 'ভর্তি আবেদন প্রত্যাখ্যাত', en: 'Application Rejected' },
    suspended: { bn: 'সাময়িকভাবে অ্যাকাউন্ট স্থগিত (Suspended)', en: 'Account Temporarily Suspended' },
    deactivated: { bn: 'স্থায়ীভাবে নিষ্ক্রিয় (Deactivated)', en: 'Permanently Deactivated' },
    archived: { bn: 'আর্কাইভকৃত (Archived)', en: 'Archived' },
    withdrawn: { bn: 'প্রত্যাহারকৃত (Withdrawn)', en: 'Withdrawn' },
    repeated: { bn: 'পুনরায় একই শ্রেণি', en: 'Repeated Class' },
  };

  const title = titleMap[nextStatus];
  const approvalStatus =
    nextStatus === 'active'
      ? 'approved'
      : nextStatus === 'rejected'
        ? 'rejected'
        : nextStatus === 'under_review'
          ? 'under_review'
          : nextStatus === 'pending'
            ? 'pending'
            : student.approvalStatus ?? 'approved';

  const historyItem: StudentApprovalHistoryItem = {
    id: `SAPH-${Date.now().toString().slice(-5)}`,
    date: dateStr,
    actor,
    category: nextStatus === 'active' || nextStatus === 'rejected' || nextStatus === 'pending' ? 'new_registration' : 'status_change',
    actionTitleBn: title.bn,
    actionTitleEn: title.en,
    fromValue: student.status,
    toValue: nextStatus,
    decision:
      nextStatus === 'active'
        ? 'approved'
        : nextStatus === 'rejected'
          ? 'rejected'
          : nextStatus === 'pending'
            ? 'pending'
            : nextStatus === 'under_review'
              ? 'under_review'
              : 'completed',
    note: reason,
  };

  return {
    ...student,
    status: nextStatus,
    approvalStatus,
    suspensionReason: nextStatus === 'suspended' ? reason : nextStatus === 'active' ? undefined : student.suspensionReason,
    deactivationReason: nextStatus === 'deactivated' ? reason : student.deactivationReason,
    approvalHistory: [historyItem, ...(student.approvalHistory ?? [])],
  };
}

export function verifyStudentDocument(
  student: StudentRecord,
  docId: string,
  verified: boolean,
  actor: string,
  dateStr: string
): StudentRecord {
  const docs = (student.documents ?? []).map((d) =>
    d.id === docId
      ? {
          ...d,
          verified,
          verifiedBy: verified ? actor : undefined,
          verifiedAt: verified ? dateStr : undefined,
        }
      : d
  );
  const targetDoc = (student.documents ?? []).find((d) => d.id === docId);

  const historyItem: StudentApprovalHistoryItem = {
    id: `SAPH-${Date.now().toString().slice(-5)}`,
    date: dateStr,
    actor,
    category: 'document_verification',
    actionTitleBn: verified ? 'নথি যাচাই সম্পন্ন (Verified)' : 'নথি যাচাই বাতিল / পুনঃযাচাই',
    actionTitleEn: verified ? 'Document Verified' : 'Document Verification Reset',
    fromValue: targetDoc?.name ?? docId,
    toValue: verified ? 'Verified' : 'Unverified',
    decision: verified ? 'approved' : 'pending',
  };

  return {
    ...student,
    documents: docs,
    approvalHistory: [historyItem, ...(student.approvalHistory ?? [])],
  };
}

export function processStudentChangeRequest(
  req: StudentChangeRequest,
  student: StudentRecord,
  schools: SchoolRecord[],
  decision: 'approved' | 'rejected' | 'under_review' | 'pending',
  note: string,
  actor: string,
  actorRole: Role,
  dateStr: string
): { allowed: boolean; errorBn?: string; updatedRequest: StudentChangeRequest; updatedStudent: StudentRecord } {
  // CRITICAL DOMAIN BOUNDARY:
  // Central Admin does NOT admit/approve new student registrations; School Admin handles registration approvals.
  if (req.category === 'new_registration' && actorRole === 'central_admin') {
    return {
      allowed: false,
      errorBn: 'নতুন শিক্ষার্থী ভর্তি অনুমোদন/প্রত্যাখ্যান শুধুমাত্র সংশ্লিষ্ট School Admin-এর এখতিয়ারভুক্ত।',
      updatedRequest: req,
      updatedStudent: student,
    };
  }

  const updatedRequest: StudentChangeRequest = {
    ...req,
    status: decision === 'pending' ? 'pending' : decision,
    reason: note ? `${req.reason} · [${note}]` : req.reason,
  };

  let updatedStudent = student;

  if (req.category === 'new_registration') {
    const nextStatus: StudentStatus =
      decision === 'approved'
        ? 'active'
        : decision === 'rejected'
          ? 'rejected'
          : decision === 'under_review'
            ? 'under_review'
            : 'pending';
    updatedStudent = executeStudentStatusChange(student, nextStatus, note || req.reason, actor, dateStr);
  } else if (req.category === 'important_profile_change') {
    if (decision === 'approved' && req.fieldKey) {
      const key = req.fieldKey;
      const historyItem: StudentApprovalHistoryItem = {
        id: `SAPH-${Date.now().toString().slice(-5)}`,
        date: dateStr,
        actor,
        category: 'important_profile_change',
        actionTitleBn: `গুরুত্বপূর্ণ প্রোফাইল পরিবর্তন অনুমোদিত (${IMPORTANT_FIELD_LABELS[key].labelBn})`,
        actionTitleEn: `Important Profile Change Approved (${IMPORTANT_FIELD_LABELS[key].labelEn})`,
        fromValue: req.currentValue,
        toValue: req.proposedValue,
        decision: 'approved',
        note: note || req.reason,
      };
      updatedStudent = {
        ...student,
        [key]: req.proposedValue,
        approvalHistory: [historyItem, ...(student.approvalHistory ?? [])],
      };
    } else {
      const historyItem: StudentApprovalHistoryItem = {
        id: `SAPH-${Date.now().toString().slice(-5)}`,
        date: dateStr,
        actor,
        category: 'important_profile_change',
        actionTitleBn: `গুরুত্বপূর্ণ প্রোফাইল পরিবর্তন ${decision === 'rejected' ? 'প্রত্যাখ্যাত' : 'পর্যালোচনাধীন'}`,
        actionTitleEn: `Important Profile Change ${decision}`,
        fromValue: req.currentValue,
        toValue: req.proposedValue,
        decision: decision === 'pending' ? 'pending' : decision,
        note: note || req.reason,
      };
      updatedStudent = {
        ...student,
        approvalHistory: [historyItem, ...(student.approvalHistory ?? [])],
      };
    }
  } else if (req.category === 'school_transfer') {
    if (decision === 'approved' && req.targetSchoolId) {
      const targetSchool = schools.find((s) => s.id === req.targetSchoolId);
      if (targetSchool) {
        updatedStudent = applyStudentTransfer(
          student,
          targetSchool,
          note || req.reason,
          actor,
          dateStr
        ).updatedStudent;
      }
    } else {
      const historyItem: StudentApprovalHistoryItem = {
        id: `SAPH-${Date.now().toString().slice(-5)}`,
        date: dateStr,
        actor,
        category: 'school_transfer',
        actionTitleBn: `বিদ্যালয় পরিবর্তন আবেদন ${decision === 'rejected' ? 'প্রত্যাখ্যাত' : 'পর্যালোচনাধীন'}`,
        actionTitleEn: `School Transfer Request ${decision}`,
        fromValue: req.currentValue,
        toValue: req.proposedValue,
        decision: decision === 'pending' ? 'pending' : decision,
        note: note || req.reason,
      };
      updatedStudent = {
        ...student,
        approvalHistory: [historyItem, ...(student.approvalHistory ?? [])],
      };
    }
  }

  return {
    allowed: true,
    updatedRequest,
    updatedStudent,
  };
}

// ============================================================
// STRICT ROLE-BASED ACCESS CONTROL (RBAC) HELPERS
// ============================================================

export type StudentPermissionAction =
  | 'admit_student'
  | 'approve_registration'
  | 'view_student'
  | 'edit_student_admin'
  | 'self_update_allowed'
  | 'request_important_change'
  | 'review_important_change'
  | 'transfer_student'
  | 'suspend_student'
  | 'deactivate_student'
  | 'view_audit_history'
  | 'send_notice';

export function canRolePerformStudentAction(
  role: Role,
  action: StudentPermissionAction,
  targetStudentId?: string,
  ownStudentId?: string,
  targetSchoolId?: string,
  ownSchoolId?: string
): boolean {
  if (role === 'student') {
    const isSelf = Boolean(ownStudentId && targetStudentId && ownStudentId === targetStudentId);
    switch (action) {
      case 'view_student':
      case 'self_update_allowed':
      case 'request_important_change':
        return isSelf;
      default:
        // Strictly forbidden for Student: create, approve, edit others, view others,
        // transfer, suspend, deactivate, view admin audit history, send notice
        return false;
    }
  }

  if (role === 'central_admin') {
    // Central Admin inspects, edits, transfers, reviews important changes, notices, suspends, deactivates
    // Central Admin does NOT directly admit/register new students or take over School Admin admission gate
    return action !== 'admit_student' && action !== 'approve_registration' && action !== 'self_update_allowed';
  }

  if (role === 'school_admin') {
    const sameSchool =
      !targetSchoolId || !ownSchoolId || targetSchoolId === ownSchoolId;
    if (!sameSchool) return false;
    return action !== 'self_update_allowed';
  }

  if (role === 'teacher') {
    const sameSchool = !targetSchoolId || !ownSchoolId || targetSchoolId === ownSchoolId;
    return sameSchool && (action === 'view_student' || action === 'request_important_change');
  }

  return false;
}

export function getVisibleStudentsForRole(
  students: StudentRecord[],
  role: Role,
  ownSchoolId?: string | null,
  ownStudentId?: string | null
): StudentRecord[] {
  if (role === 'central_admin') return students;
  if (role === 'school_admin' || role === 'teacher') {
    return ownSchoolId ? students.filter((s) => s.schoolId === ownSchoolId) : [];
  }
  if (role === 'student') {
    return ownStudentId ? students.filter((s) => s.id === ownStudentId) : [];
  }
  return [];
}

export interface StudentAllowedSelfPatch {
  guardianMobile?: string;
  emergencyContact?: string;
  address?: string;
}

export function applyStudentAllowedSelfPatch(
  student: StudentRecord,
  patch: StudentAllowedSelfPatch | Record<string, unknown>
): StudentRecord {
  const safePatch = patch as Record<string, unknown>;
  // Explicitly whitelist ONLY safe contact/address fields; strip any restricted identity/academic fields
  return {
    ...student,
    guardianMobile:
      typeof safePatch.guardianMobile === 'string' && safePatch.guardianMobile.trim()
        ? safePatch.guardianMobile.trim()
        : student.guardianMobile,
    emergencyContact:
      typeof safePatch.emergencyContact === 'string' && safePatch.emergencyContact.trim()
        ? safePatch.emergencyContact.trim()
        : student.emergencyContact,
    address:
      typeof safePatch.address === 'string'
        ? safePatch.address.trim()
        : student.address,
  };
}
