import type {
  ApprovalStatus,
  SchoolAdminHandoverRecord,
  SchoolAdminMember,
  SchoolCategory,
  SchoolDeactivationRecord,
  SchoolRecord,
  SchoolTypeCode,
} from '../types';
import { getSchoolTypeConfig } from './schoolConfigAndAddress';

export interface SchoolSummaryCounts {
  total: number;
  approvedActive: number;
  pending: number;
  underReview: number;
  revisionRequested: number;
  rejected: number;
  suspended: number;
  deactivated: number;
}

export interface SchoolFilterCriteria {
  search: string;
  division: string;
  district: string;
  upazila: string;
  schoolType: 'ALL' | SchoolTypeCode;
  status: string;
  approvalStatus: string;
  registrationDate: string;
}

export function deriveApprovalStatus(school: SchoolRecord): ApprovalStatus {
  if (school.approvalStatus) return school.approvalStatus;
  if (school.status === 'active' || school.status === 'approved' || school.status === 'verified') {
    return 'approved';
  }
  if (school.status === 'under_review') return 'under_review';
  if (school.status === 'revision_requested') return 'revision_requested';
  if (school.status === 'rejected') return 'rejected';
  return 'pending';
}

export function computeSchoolSummaryCounts(schools: SchoolRecord[]): SchoolSummaryCounts {
  const counts: SchoolSummaryCounts = {
    total: schools.length,
    approvedActive: 0,
    pending: 0,
    underReview: 0,
    revisionRequested: 0,
    rejected: 0,
    suspended: 0,
    deactivated: 0,
  };

  for (const s of schools) {
    const appSt = deriveApprovalStatus(s);
    if (s.status === 'active' || s.status === 'approved' || s.status === 'verified') {
      counts.approvedActive += 1;
    } else if (s.status === 'suspended') {
      counts.suspended += 1;
    } else if (s.status === 'deactivated' || s.status === 'archived' || s.status === 'disabled') {
      counts.deactivated += 1;
    } else if (s.status === 'rejected' || appSt === 'rejected') {
      counts.rejected += 1;
    } else if (s.status === 'under_review' || appSt === 'under_review') {
      counts.underReview += 1;
    } else if (s.status === 'revision_requested' || appSt === 'revision_requested') {
      counts.revisionRequested += 1;
    } else {
      counts.pending += 1;
    }
  }
  return counts;
}

export function filterSchools(
  schools: SchoolRecord[],
  criteria: SchoolFilterCriteria
): SchoolRecord[] {
  const q = criteria.search.trim().toLowerCase();
  return schools.filter((s) => {
    const matchesSearch =
      !q ||
      s.nameBn.toLowerCase().includes(q) ||
      s.nameEn.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (s.registrationId ?? '').toLowerCase().includes(q) ||
      s.eiin.toLowerCase().includes(q) ||
      s.headTeacher.toLowerCase().includes(q) ||
      s.adminUsername.toLowerCase().includes(q) ||
      s.district.toLowerCase().includes(q);

    const matchesDiv = criteria.division === 'ALL' || s.division === criteria.division;
    const matchesDist = criteria.district === 'ALL' || s.district === criteria.district;
    const matchesUpz = criteria.upazila === 'ALL' || s.upazila === criteria.upazila;
    const matchesType = criteria.schoolType === 'ALL' || s.schoolType === criteria.schoolType;

    const matchesStatus =
      criteria.status === 'ALL' ||
      (criteria.status === 'approved_active'
        ? s.status === 'active' || s.status === 'approved' || s.status === 'verified'
        : criteria.status === 'deactivated'
          ? s.status === 'deactivated' || s.status === 'archived' || s.status === 'disabled'
          : s.status === criteria.status);

    const appStatus = deriveApprovalStatus(s);
    const matchesApproval =
      criteria.approvalStatus === 'ALL' || appStatus === criteria.approvalStatus;

    const matchesDate =
      !criteria.registrationDate.trim() ||
      (s.registrationDate ?? s.verifiedDate ?? '').includes(criteria.registrationDate.trim());

    return (
      matchesSearch &&
      matchesDiv &&
      matchesDist &&
      matchesUpz &&
      matchesType &&
      matchesStatus &&
      matchesApproval &&
      matchesDate
    );
  });
}

export interface SchoolEditPatch {
  nameBn: string;
  nameEn: string;
  registrationId: string;
  code: string;
  eiin: string;
  mobile: string;
  email: string;
  cluster: string;
  division: string;
  district: string;
  upazila: string;
  union: string;
  village: string;
  fullAddress: string;
  gpsLat: string;
  gpsLng: string;
  schoolType: SchoolTypeCode;
  customSchoolType?: string;
  educationLevel: string;
  category: SchoolCategory;
  establishedYear: string;
  headTeacher: string;
}

export function applySchoolInfoEdit(
  school: SchoolRecord,
  patch: SchoolEditPatch,
  actor: string,
  dateStr: string
): { updatedSchool: SchoolRecord; changedFields: string[] } {
  const changedFields: string[] = [];
  if (school.nameBn !== patch.nameBn || school.nameEn !== patch.nameEn) changedFields.push('School Name');
  if (school.code !== patch.code || school.eiin !== patch.eiin || (school.registrationId ?? '') !== patch.registrationId) {
    changedFields.push('Reg ID / EIIN / Code');
  }
  if (
    school.division !== patch.division ||
    school.district !== patch.district ||
    school.upazila !== patch.upazila ||
    school.fullAddress !== patch.fullAddress
  ) {
    changedFields.push('Address');
  }
  if (school.mobile !== patch.mobile || school.email !== patch.email) changedFields.push('Contact');
  if ((school.gpsLat ?? '') !== patch.gpsLat || (school.gpsLng ?? '') !== patch.gpsLng) {
    changedFields.push('GPS Coordinates');
  }
  if (school.schoolType !== patch.schoolType) changedFields.push(`School Type (${school.schoolType} → ${patch.schoolType})`);
  if ((school.educationLevel ?? '') !== patch.educationLevel) changedFields.push('Education Level');
  if ((school.category ?? '') !== patch.category) changedFields.push('Category');
  if (school.headTeacher !== patch.headTeacher) changedFields.push('School Admin / Head');

  const cfg = getSchoolTypeConfig(patch.schoolType);
  const typeChanged = school.schoolType !== patch.schoolType;
  const nextClasses = typeChanged ? cfg.defaultClasses : school.approvedClasses;
  const nextRange = typeChanged
    ? `${cfg.defaultClasses[0]} – ${cfg.defaultClasses[cfg.defaultClasses.length - 1]}`
    : patch.educationLevel || school.classRange;

  const historyEntry = {
    id: `APH-${Date.now().toString().slice(-5)}`,
    date: dateStr,
    actor,
    action: 'School Information Updated',
    fromStatus: school.status,
    toStatus: school.status,
    note: changedFields.length > 0 ? `Updated: ${changedFields.join(', ')}` : 'General profile review',
  };

  const updatedSchool: SchoolRecord = {
    ...school,
    nameBn: patch.nameBn.trim(),
    nameEn: patch.nameEn.trim(),
    registrationId: patch.registrationId.trim(),
    code: patch.code.trim(),
    eiin: patch.eiin.trim(),
    mobile: patch.mobile.trim(),
    email: patch.email.trim(),
    cluster: patch.cluster.trim(),
    division: patch.division.trim(),
    district: patch.district.trim(),
    upazila: patch.upazila.trim(),
    union: patch.union.trim(),
    village: patch.village.trim(),
    fullAddress: patch.fullAddress.trim(),
    gpsLat: patch.gpsLat.trim(),
    gpsLng: patch.gpsLng.trim(),
    schoolType: patch.schoolType,
    customSchoolType: patch.schoolType === 'OTHER' ? patch.customSchoolType?.trim() : undefined,
    educationLevel: patch.educationLevel.trim(),
    category: patch.category,
    establishedYear: patch.establishedYear.trim(),
    headTeacher: patch.headTeacher.trim(),
    approvedClasses: nextClasses,
    classRange: nextRange,
    approvalHistory: [historyEntry, ...(school.approvalHistory ?? [])],
  };

  return { updatedSchool, changedFields };
}

export type AdminManagementMode =
  | 'appoint_new'
  | 'replace_current'
  | 'assign_acting'
  | 'remove'
  | 'update_permissions';

export interface AdminManagementPayload {
  mode: AdminManagementMode;
  targetAdminId?: string;
  name: string;
  username: string;
  email: string;
  mobile: string;
  permissions: string[];
  handoverNote: string;
  sendInvitation: boolean;
}

export function executeSchoolAdminAction(
  school: SchoolRecord,
  payload: AdminManagementPayload,
  actor: string,
  dateStr: string
): {
  updatedSchool: SchoolRecord;
  previousAdminName: string;
  newAdminName: string;
  actionSummary: string;
} {
  const existingAdmins: SchoolAdminMember[] =
    school.schoolAdmins && school.schoolAdmins.length > 0
      ? school.schoolAdmins
      : [
          {
            id: `adm-${school.id}-1`,
            name: school.headTeacher,
            username: school.adminUsername,
            email: school.email,
            mobile: school.headTeacherMobile ?? school.mobile,
            roleType: 'Primary Admin',
            invitationStatus: 'Accepted',
            permissions: ['students', 'teachers', 'attendance', 'exams', 'results', 'fees', 'notices'],
            status: 'active',
            assignedAt: school.verifiedDate,
          },
        ];

  const currentPrimary = existingAdmins.find((a) => a.status === 'active' && a.roleType === 'Primary Admin');
  const previousAdminName = currentPrimary?.name ?? school.headTeacher;
  let nextAdmins = [...existingAdmins];
  let nextHeadTeacher = school.headTeacher;
  let nextAdminUsername = school.adminUsername;
  let newAdminName = payload.name.trim() || previousAdminName;
  let handoverAction: SchoolAdminHandoverRecord['actionType'] = 'Appointed';
  let actionSummary = '';

  if (payload.mode === 'appoint_new' || payload.mode === 'replace_current') {
    if (payload.mode === 'replace_current') {
      nextAdmins = nextAdmins.map((a) =>
        a.roleType === 'Primary Admin' && a.status === 'active' ? { ...a, status: 'removed' } : a
      );
      handoverAction = 'Replaced';
      actionSummary = `Primary School Admin replaced: ${previousAdminName} → ${newAdminName}`;
    } else {
      handoverAction = 'Appointed';
      actionSummary = `New Primary School Admin appointed: ${newAdminName}`;
    }
    const member: SchoolAdminMember = {
      id: `adm-${Date.now().toString().slice(-5)}`,
      name: newAdminName,
      username: payload.username.trim(),
      email: payload.email.trim(),
      mobile: payload.mobile.trim(),
      roleType: 'Primary Admin',
      invitationStatus: payload.sendInvitation ? 'Invited' : 'Accepted',
      permissions: payload.permissions,
      status: 'active',
      assignedAt: dateStr,
    };
    nextAdmins = [member, ...nextAdmins];
    nextHeadTeacher = newAdminName;
    nextAdminUsername = payload.username.trim() || school.adminUsername;
  } else if (payload.mode === 'assign_acting') {
    handoverAction = 'Acting Assigned';
    actionSummary = `Acting / Temporary Admin assigned: ${newAdminName}`;
    const member: SchoolAdminMember = {
      id: `adm-${Date.now().toString().slice(-5)}`,
      name: newAdminName,
      username: payload.username.trim(),
      email: payload.email.trim(),
      mobile: payload.mobile.trim(),
      roleType: 'Acting / Temporary Admin',
      invitationStatus: payload.sendInvitation ? 'Invited' : 'Accepted',
      permissions: payload.permissions,
      status: 'active',
      assignedAt: dateStr,
    };
    nextAdmins = [member, ...nextAdmins];
  } else if (payload.mode === 'remove' && payload.targetAdminId) {
    const target = nextAdmins.find((a) => a.id === payload.targetAdminId);
    handoverAction = 'Removed';
    newAdminName = target ? `${target.name} (Removed)` : 'Removed';
    actionSummary = `School Admin removed: ${target?.name ?? payload.targetAdminId} (Activity history preserved)`;
    nextAdmins = nextAdmins.map((a) =>
      a.id === payload.targetAdminId ? { ...a, status: 'removed' } : a
    );
  } else if (payload.mode === 'update_permissions' && payload.targetAdminId) {
    const target = nextAdmins.find((a) => a.id === payload.targetAdminId);
    handoverAction = 'Permissions Updated';
    newAdminName = target?.name ?? previousAdminName;
    actionSummary = `Permissions updated for ${newAdminName}: ${payload.permissions.join(', ')}`;
    nextAdmins = nextAdmins.map((a) =>
      a.id === payload.targetAdminId ? { ...a, permissions: payload.permissions } : a
    );
  }

  const handoverEntry: SchoolAdminHandoverRecord = {
    id: `HND-${Date.now().toString().slice(-5)}`,
    date: dateStr,
    previousAdminName,
    newAdminName,
    actionType: handoverAction,
    handoverNote: payload.handoverNote.trim() || actionSummary,
    recordedBy: actor,
  };

  const approvalEntry = {
    id: `APH-${Date.now().toString().slice(-5)}`,
    date: dateStr,
    actor,
    action: `Admin ${handoverAction}`,
    fromStatus: previousAdminName,
    toStatus: newAdminName,
    note: payload.handoverNote.trim() || actionSummary,
  };

  return {
    updatedSchool: {
      ...school,
      headTeacher: nextHeadTeacher,
      adminUsername: nextAdminUsername,
      schoolAdmins: nextAdmins,
      handoverHistory: [handoverEntry, ...(school.handoverHistory ?? [])],
      approvalHistory: [approvalEntry, ...(school.approvalHistory ?? [])],
    },
    previousAdminName,
    newAdminName,
    actionSummary,
  };
}

export function isDeactivationChecklistValid(d: Omit<SchoolDeactivationRecord, 'finalApprovalDate'>): {
  valid: boolean;
  error?: string;
} {
  if (!d.reason.trim()) return { valid: false, error: 'বাতিলের কারণ উল্লেখ করুন / Reason is required.' };
  if (!d.evidenceDoc.trim()) return { valid: false, error: 'প্রমাণপত্র সংযুক্তি দিন / Evidence document is required.' };
  if (!d.inspectionReportRef.trim()) return { valid: false, error: 'পরিদর্শন রিপোর্ট রেফারেন্স দিন / Inspection report ref is required.' };
  if (!d.studentTransferDone || !d.staffAdjustmentDone || !d.assetDisposalDone) {
    return {
      valid: false,
      error: 'শিক্ষার্থী স্থানান্তর, শিক্ষক সমন্বয় এবং সম্পদ নিষ্পত্তি সবগুলো যাচাই করুন / All 3 closure checks must be confirmed.',
    };
  }
  return { valid: true };
}
