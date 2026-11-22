import type {
  AdminReviewerRole,
  ApprovalRequest,
  ApprovalStatus,
  GovernanceAction,
  GovernanceEntity,
  PermissionKey,
  RolePermissionMatrix,
  SchoolRecord,
  StudentChangeRequest,
  StudentRecord,
  TeacherChangeRequest,
  TeacherRecord,
  VerificationCategoryId,
  VerificationStatus,
} from '../types';

export interface VerificationCategoryMeta {
  id: VerificationCategoryId;
  labelBn: string;
  labelEn: string;
  descBn: string;
  descEn: string;
}

export const VERIFICATION_CATEGORIES: VerificationCategoryMeta[] = [
  {
    id: 'school',
    labelBn: 'বিদ্যালয় যাচাই',
    labelEn: 'School Verification',
    descBn: 'নিবন্ধিত বিদ্যালয়ের সাধারণ তথ্য, স্তর ও অনুমোদনযোগ্য শ্রেণি যাচাই',
    descEn: 'Verify school registration record, educational level, and approved classes',
  },
  {
    id: 'teacher',
    labelBn: 'শিক্ষক যাচাই',
    labelEn: 'Teacher Verification',
    descBn: 'শিক্ষকের নিয়োগ, শিক্ষাগত যোগ্যতা ও বিদ্যালয় সংযুক্তি যাচাই',
    descEn: 'Verify teacher appointment, qualification, and school posting',
  },
  {
    id: 'student',
    labelBn: 'শিক্ষার্থী যাচাই',
    labelEn: 'Student Verification',
    descBn: 'শিক্ষার্থীর পরিচয়, শ্রেণি, রোল ও অভিভাবকের তথ্য যাচাই',
    descEn: 'Verify student identity, class/roll placement, and guardian info',
  },
  {
    id: 'document',
    labelBn: 'Document যাচাই',
    labelEn: 'Document Verification',
    descBn: 'জন্মনিবন্ধন, EIIN সনদ, নিয়োগপত্র ও ট্রান্সফার সার্টিফিকেট (TC) যাচাই',
    descEn: 'Verify Birth Certificate, EIIN document, appointment & TC papers',
  },
  {
    id: 'address_location',
    labelBn: 'Address/Location যাচাই',
    labelEn: 'Address/Location Verification',
    descBn: 'ম্যানুয়াল ঠিকানা, বিভাগ-উপজেলা-ইউনিয়ন এবং GPS স্থানাঙ্ক যাচাই',
    descEn: 'Verify manual address entry, administrative hierarchy & GPS coordinates',
  },
  {
    id: 'id_check',
    labelBn: 'ID যাচাই',
    labelEn: 'ID Verification',
    descBn: 'School EIIN, Reg ID, Teacher Code, Permanent Student ID ও Birth Reg যাচাই',
    descEn: 'Verify School EIIN, Reg ID, Teacher Code, Permanent Student ID & Birth Reg',
  },
  {
    id: 'duplicate_check',
    labelBn: 'Duplicate যাচাই',
    labelEn: 'Duplicate Verification',
    descBn: 'ডুপ্লিকেট EIIN, জন্মনিবন্ধন, NID বা মোবাইল নম্বর শনাক্তকরণ স্ক্রিনিং',
    descEn: 'Screen and flag duplicate EIIN, Birth Reg No, NID, or mobile numbers',
  },
  {
    id: 'critical_info',
    labelBn: 'গুরুত্বপূর্ণ তথ্য যাচাই',
    labelEn: 'Critical Info Verification',
    descBn: 'নাম, জন্মতারিখ, পিতা-মাতার নাম, পদবি ও বিদ্যালয় পরিবর্তন তথ্য যাচাই',
    descEn: 'Verify critical profile changes: Name, DOB, Parents, Designation, Transfer',
  },
];

export const ALL_GOVERNANCE_ACTIONS: { id: GovernanceAction; labelBn: string; labelEn: string }[] = [
  { id: 'view', labelBn: 'View (দেখুন)', labelEn: 'View' },
  { id: 'create', labelBn: 'Create (তৈরি)', labelEn: 'Create' },
  { id: 'edit', labelBn: 'Edit (সম্পাদনা)', labelEn: 'Edit' },
  { id: 'verify', labelBn: 'Verify (যাচাই)', labelEn: 'Verify' },
  { id: 'approve', labelBn: 'Approve (অনুমোদন)', labelEn: 'Approve' },
  { id: 'transfer', labelBn: 'Transfer (স্থানান্তর)', labelEn: 'Transfer' },
  { id: 'suspend', labelBn: 'Suspend (স্থগিত)', labelEn: 'Suspend' },
  { id: 'deactivate', labelBn: 'Deactivate (নিষ্ক্রিয়)', labelEn: 'Deactivate' },
  { id: 'reissue_id', labelBn: 'Re-issue ID (আইডি পুনঃইস্যু)', labelEn: 'Re-issue ID' },
  { id: 'delete_archive', labelBn: 'Delete/Archive (আর্কাইভ)', labelEn: 'Delete / Archive' },
  { id: 'restore', labelBn: 'Restore (পুনরুদ্ধার)', labelEn: 'Restore' },
  { id: 'notice', labelBn: 'Notice (নোটিশ)', labelEn: 'Notice' },
  { id: 'activity_history', labelBn: 'Activity History', labelEn: 'Activity History' },
  { id: 'reports', labelBn: 'Reports (রিপোর্ট)', labelEn: 'Reports' },
];

export const GOVERNED_ENTITIES: { id: GovernanceEntity; labelBn: string; labelEn: string }[] = [
  { id: 'school', labelBn: 'বিদ্যালয় ব্যবস্থাপনা', labelEn: 'Schools' },
  { id: 'teacher', labelBn: 'শিক্ষক ব্যবস্থাপনা', labelEn: 'Teachers' },
  { id: 'student', labelBn: 'শিক্ষার্থী ব্যবস্থাপনা', labelEn: 'Students' },
  { id: 'verification', labelBn: 'Central Verification', labelEn: 'Verification' },
];

const ENTITIES: GovernanceEntity[] = ['school', 'teacher', 'student', 'verification'];
const ACTIONS: GovernanceAction[] = ALL_GOVERNANCE_ACTIONS.map((a) => a.id);

function buildFullMap(initialValue: boolean): Record<PermissionKey, boolean> {
  const map = {} as Record<PermissionKey, boolean>;
  for (const entity of ENTITIES) {
    for (const action of ACTIONS) {
      map[`${entity}:${action}`] = initialValue;
    }
  }
  return map;
}

export function createDefaultRolePermissionMatrix(): RolePermissionMatrix {
  const superAdmin = buildFullMap(true);

  const verificationOfficer = buildFullMap(false);
  for (const e of ENTITIES) {
    verificationOfficer[`${e}:view`] = true;
    verificationOfficer[`${e}:verify`] = true;
    verificationOfficer[`${e}:activity_history`] = true;
    verificationOfficer[`${e}:reports`] = true;
    verificationOfficer[`${e}:notice`] = true;
  }

  const approvalOfficer = buildFullMap(false);
  for (const e of ['school', 'teacher', 'student'] as GovernanceEntity[]) {
    approvalOfficer[`${e}:view`] = true;
    approvalOfficer[`${e}:approve`] = true;
    approvalOfficer[`${e}:transfer`] = true;
    approvalOfficer[`${e}:suspend`] = true;
    approvalOfficer[`${e}:notice`] = true;
    approvalOfficer[`${e}:restore`] = true;
    approvalOfficer[`${e}:activity_history`] = true;
    approvalOfficer[`${e}:reports`] = true;
  }
  approvalOfficer['verification:view'] = true;
  approvalOfficer['verification:reports'] = true;

  const auditOfficer = buildFullMap(false);
  for (const e of ENTITIES) {
    auditOfficer[`${e}:view`] = true;
    auditOfficer[`${e}:activity_history`] = true;
    auditOfficer[`${e}:reports`] = true;
  }

  return {
    'Super Central Admin': superAdmin,
    'Verification Officer': verificationOfficer,
    'Approval Officer': approvalOfficer,
    'Audit Officer': auditOfficer,
  };
}

export function hasGovernancePermission(
  matrix: RolePermissionMatrix,
  role: AdminReviewerRole,
  key: PermissionKey
): boolean {
  return Boolean(matrix[role]?.[key]);
}

export function toggleRolePermission(
  matrix: RolePermissionMatrix,
  role: AdminReviewerRole,
  key: PermissionKey
): RolePermissionMatrix {
  return {
    ...matrix,
    [role]: {
      ...matrix[role],
      [key]: !matrix[role]?.[key],
    },
  };
}

export function deriveVerificationStatus(record: {
  verificationStatus?: VerificationStatus;
  status?: string;
  addressVerified?: boolean;
  addressSource?: 'AUTOMATIC' | 'MANUAL';
}): VerificationStatus {
  if (record.verificationStatus) return record.verificationStatus;
  if (record.addressSource === 'MANUAL' && record.addressVerified === false) return 'pending';
  if (record.status === 'active' || record.status === 'approved' || record.status === 'verified') {
    return 'verified';
  }
  if (record.status === 'pending' || record.status === 'under_review') {
    return 'pending';
  }
  return 'unverified';
}

export interface PipelineStageInfo {
  step: 1 | 2 | 3 | 4;
  stageKey: 'request' | 'verification' | 'approval' | 'final_action';
  labelBn: string;
  labelEn: string;
  verificationDone: boolean;
  approvalDone: boolean;
  finalActionDone: boolean;
}

export function computePipelineStage(params: {
  verificationStatus?: VerificationStatus;
  approvalStatus?: ApprovalStatus | string;
  entityStatus?: string;
}): PipelineStageInfo {
  const vDone = params.verificationStatus === 'verified';
  const aDone =
    params.approvalStatus === 'approved' ||
    params.entityStatus === 'approved' ||
    params.entityStatus === 'active';
  const fDone =
    params.entityStatus === 'active' ||
    params.entityStatus === 'suspended' ||
    params.entityStatus === 'deactivated' ||
    params.entityStatus === 'archived' ||
    params.entityStatus === 'rejected';

  if (fDone && vDone && aDone) {
    return {
      step: 4,
      stageKey: 'final_action',
      labelBn: '৪. চূড়ান্ত কার্যকর (Final Action)',
      labelEn: '4. Final Action Complete',
      verificationDone: true,
      approvalDone: true,
      finalActionDone: true,
    };
  }
  if (vDone && !aDone) {
    return {
      step: 3,
      stageKey: 'approval',
      labelBn: '৩. অনুমোদনের সিদ্ধান্ত (Approval)',
      labelEn: '3. Ready for Approval',
      verificationDone: true,
      approvalDone: false,
      finalActionDone: false,
    };
  }
  if (!vDone && (params.verificationStatus === 'pending' || params.verificationStatus === 'flagged' || params.entityStatus === 'under_review')) {
    return {
      step: 2,
      stageKey: 'verification',
      labelBn: '২. তথ্য ও নথি যাচাই (Verification)',
      labelEn: '2. In Verification',
      verificationDone: false,
      approvalDone: false,
      finalActionDone: false,
    };
  }
  return {
    step: 1,
    stageKey: 'request',
    labelBn: '১. আবেদন গৃহীত (Request)',
    labelEn: '1. Request Submitted',
    verificationDone: vDone,
    approvalDone: aDone,
    finalActionDone: fDone,
  };
}

export interface DuplicateSignal {
  id: string;
  fieldLabelBn: string;
  fieldLabelEn: string;
  duplicateValue: string;
  entityType: 'school' | 'teacher' | 'student';
  matchedEntities: { id: string; code: string; name: string; schoolId: string }[];
  severity: 'high' | 'warning';
}

export function detectDuplicateRecords(
  schools: SchoolRecord[],
  teachers: TeacherRecord[],
  students: StudentRecord[]
): DuplicateSignal[] {
  const signals: DuplicateSignal[] = [];

  // 1. Check School EIIN duplicates
  const byEiin = new Map<string, SchoolRecord[]>();
  for (const s of schools) {
    const key = s.eiin.trim();
    if (!key) continue;
    byEiin.set(key, [...(byEiin.get(key) ?? []), s]);
  }
  for (const [eiin, list] of byEiin.entries()) {
    if (list.length > 1) {
      signals.push({
        id: `DUP-EIIN-${eiin}`,
        fieldLabelBn: 'বিদ্যালয় EIIN নম্বর মিল পাওয়া গেছে',
        fieldLabelEn: 'Duplicate School EIIN Detected',
        duplicateValue: eiin,
        entityType: 'school',
        matchedEntities: list.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.nameBn,
          schoolId: s.id,
        })),
        severity: 'high',
      });
    }
  }

  // 2. Check Student Birth Registration duplicates
  const byBirthReg = new Map<string, StudentRecord[]>();
  for (const st of students) {
    const key = st.birthRegNo.trim();
    if (!key) continue;
    byBirthReg.set(key, [...(byBirthReg.get(key) ?? []), st]);
  }
  for (const [brc, list] of byBirthReg.entries()) {
    if (list.length > 1) {
      signals.push({
        id: `DUP-BRC-${brc}`,
        fieldLabelBn: 'একই জন্মনিবন্ধন নম্বর একাধিক শিক্ষার্থীতে ব্যবহৃত',
        fieldLabelEn: 'Duplicate Student Birth Registration No.',
        duplicateValue: brc,
        entityType: 'student',
        matchedEntities: list.map((st) => ({
          id: st.id,
          code: st.permanentId,
          name: st.nameBn,
          schoolId: st.schoolId,
        })),
        severity: 'high',
      });
    }
  }

  // 3. Check Teacher NID or Mobile duplicates
  const byTeacherMobile = new Map<string, TeacherRecord[]>();
  for (const t of teachers) {
    const key = t.mobile.trim();
    if (!key) continue;
    byTeacherMobile.set(key, [...(byTeacherMobile.get(key) ?? []), t]);
  }
  for (const [mob, list] of byTeacherMobile.entries()) {
    if (list.length > 1) {
      signals.push({
        id: `DUP-TMOB-${mob}`,
        fieldLabelBn: 'একই মোবাইল নম্বর একাধিক শিক্ষকের প্রোফাইলে',
        fieldLabelEn: 'Duplicate Teacher Mobile Number',
        duplicateValue: mob,
        entityType: 'teacher',
        matchedEntities: list.map((t) => ({
          id: t.id,
          code: t.teacherCode,
          name: t.nameBn,
          schoolId: t.schoolId,
        })),
        severity: 'warning',
      });
    }
  }

  return signals;
}

export interface VerificationQueueItem {
  id: string;
  category: VerificationCategoryId;
  entityType: 'school' | 'teacher' | 'student' | 'request';
  entityId: string;
  titleBn: string;
  titleEn: string;
  subtitle: string;
  schoolId: string;
  schoolName: string;
  identifierLabel: string;
  verificationStatus: VerificationStatus;
  approvalStatus: string;
  entityStatus: string;
  verifiedBy?: string;
  verificationNote?: string;
  evidenceSummary: string;
}

export function buildVerificationQueue(
  schools: SchoolRecord[],
  teachers: TeacherRecord[],
  students: StudentRecord[],
  requests: ApprovalRequest[],
  teacherRequests: TeacherChangeRequest[],
  studentRequests: StudentChangeRequest[]
): VerificationQueueItem[] {
  const items: VerificationQueueItem[] = [];

  for (const sc of schools) {
    const vStatus = deriveVerificationStatus(sc);
    items.push({
      id: `VER-SCH-${sc.id}`,
      category: 'school',
      entityType: 'school',
      entityId: sc.id,
      titleBn: sc.nameBn,
      titleEn: sc.nameEn,
      subtitle: `EIIN: ${sc.eiin} · ${sc.headTeacher}`,
      schoolId: sc.id,
      schoolName: sc.nameBn,
      identifierLabel: sc.code,
      verificationStatus: vStatus,
      approvalStatus: sc.approvalStatus ?? (sc.status === 'active' ? 'approved' : sc.status),
      entityStatus: sc.status,
      verifiedBy: sc.verifiedBy,
      verificationNote: sc.verificationNote,
      evidenceSummary: `${sc.documents.length} টি নথি · ঠিকানা: ${sc.addressSource}`,
    });

    if (sc.addressSource === 'MANUAL' || !sc.addressVerified) {
      items.push({
        id: `VER-ADR-${sc.id}`,
        category: 'address_location',
        entityType: 'school',
        entityId: sc.id,
        titleBn: `${sc.nameBn} — ঠিকানা ও GPS যাচাই`,
        titleEn: `${sc.nameEn} — Address & GPS Verification`,
        subtitle: `${sc.division} → ${sc.district} → ${sc.upazila} (${sc.addressSource})`,
        schoolId: sc.id,
        schoolName: sc.nameBn,
        identifierLabel: `GPS: ${sc.gpsLat ?? 'N/A'}, ${sc.gpsLng ?? 'N/A'}`,
        verificationStatus: sc.addressVerified ? 'verified' : 'pending',
        approvalStatus: sc.approvalStatus ?? sc.status,
        entityStatus: sc.status,
        verifiedBy: sc.verifiedBy,
        verificationNote: sc.verificationNote ?? sc.fullAddress,
        evidenceSummary: sc.fullAddress,
      });
    }
  }

  for (const t of teachers) {
    const vStatus = deriveVerificationStatus(t);
    items.push({
      id: `VER-TCH-${t.id}`,
      category: 'teacher',
      entityType: 'teacher',
      entityId: t.id,
      titleBn: t.nameBn,
      titleEn: t.nameEn,
      subtitle: `${t.designation} · ${t.qualification}`,
      schoolId: t.schoolId,
      schoolName: t.schoolNameBn,
      identifierLabel: t.teacherCode,
      verificationStatus: vStatus,
      approvalStatus: t.approvalStatus ?? (t.status === 'active' ? 'approved' : t.status),
      entityStatus: t.status,
      verifiedBy: t.verifiedBy,
      verificationNote: t.verificationNote,
      evidenceSummary: `NID: ${t.nidNumber ?? 'সংরক্ষিত'} · ${(t.documents ?? []).length} টি সনদ`,
    });
  }

  for (const st of students) {
    const vStatus = deriveVerificationStatus(st);
    items.push({
      id: `VER-STU-${st.id}`,
      category: 'student',
      entityType: 'student',
      entityId: st.id,
      titleBn: st.nameBn,
      titleEn: st.nameEn,
      subtitle: `${st.className} (${st.section}) · Roll #${st.roll}`,
      schoolId: st.schoolId,
      schoolName: st.schoolNameBn,
      identifierLabel: st.permanentId,
      verificationStatus: vStatus,
      approvalStatus: st.approvalStatus ?? (st.status === 'active' ? 'approved' : st.status),
      entityStatus: st.status,
      verifiedBy: st.verifiedBy,
      verificationNote: st.verificationNote,
      evidenceSummary: `Birth Reg: ${st.birthRegNo} · ${(st.documents ?? []).length} টি ডকুমেন্ট`,
    });

    if ((st.documents ?? []).some((d) => !d.verified) || st.status === 'pending') {
      items.push({
        id: `VER-DOC-STU-${st.id}`,
        category: 'document',
        entityType: 'student',
        entityId: st.id,
        titleBn: `${st.nameBn} — জন্মনিবন্ধন ও নথি যাচাই`,
        titleEn: `${st.nameEn} — Student Document Verification`,
        subtitle: `${(st.documents ?? []).map((d) => d.name).join(', ')}`,
        schoolId: st.schoolId,
        schoolName: st.schoolNameBn,
        identifierLabel: st.permanentId,
        verificationStatus: (st.documents ?? []).every((d) => d.verified) ? 'verified' : 'pending',
        approvalStatus: st.approvalStatus ?? st.status,
        entityStatus: st.status,
        verifiedBy: st.verifiedBy,
        evidenceSummary: `${(st.documents ?? []).filter((d) => d.verified).length}/${(st.documents ?? []).length} যাচাইকৃত`,
      });
    }
  }

  // Document & ID checks for pending approval requests
  for (const req of requests) {
    items.push({
      id: `VER-ID-${req.id}`,
      category: 'id_check',
      entityType: 'request',
      entityId: req.id,
      titleBn: `${req.applicantName} — ID ও কোড যাচাই`,
      titleEn: `${req.applicantName} — ID & Code Check`,
      subtitle: `${req.typeLabelBn} · ${req.schoolName}`,
      schoolId: req.schoolId,
      schoolName: req.schoolName,
      identifierLabel: req.id,
      verificationStatus:
        req.verificationStatus ?? (req.status === 'verified' || req.status === 'approved' ? 'verified' : 'pending'),
      approvalStatus: req.status,
      entityStatus: req.status,
      verifiedBy: req.verifiedBy,
      verificationNote: req.verificationNote,
      evidenceSummary: req.details,
    });
  }

  // Critical Info Verification (Student & Teacher critical profile changes)
  for (const sr of studentRequests.filter((r) => r.category !== 'new_registration')) {
    items.push({
      id: `VER-CRIT-${sr.id}`,
      category: 'critical_info',
      entityType: 'student',
      entityId: sr.studentId,
      titleBn: `${sr.studentNameBn}: ${sr.titleBn}`,
      titleEn: `${sr.studentNameBn}: ${sr.titleEn}`,
      subtitle: `${sr.currentValue} → ${sr.proposedValue}`,
      schoolId: sr.schoolId,
      schoolName: sr.schoolNameBn,
      identifierLabel: sr.permanentId,
      verificationStatus: sr.status === 'approved' ? 'verified' : sr.status === 'rejected' ? 'flagged' : 'pending',
      approvalStatus: sr.status,
      entityStatus: sr.status,
      evidenceSummary: sr.reason,
    });
  }

  for (const trReq of teacherRequests) {
    items.push({
      id: `VER-TCRIT-${trReq.id}`,
      category: 'critical_info',
      entityType: 'teacher',
      entityId: trReq.teacherId,
      titleBn: `${trReq.teacherNameBn}: ${trReq.titleBn}`,
      titleEn: `${trReq.teacherNameBn}: ${trReq.titleEn}`,
      subtitle: `${trReq.currentValue} → ${trReq.proposedValue}`,
      schoolId: trReq.schoolId,
      schoolName: trReq.schoolNameBn,
      identifierLabel: trReq.teacherCode,
      verificationStatus: trReq.status === 'approved' ? 'verified' : trReq.status === 'rejected' ? 'flagged' : 'pending',
      approvalStatus: trReq.status,
      entityStatus: trReq.status,
      evidenceSummary: trReq.reason,
    });
  }

  return items;
}

export function reissueStudentDigitalId(
  student: StudentRecord,
  actor: string,
  dateIso: string,
  note = 'ডিজিটাল QR আইডি কার্ড ইস্যু / পুনঃইস্যু সম্পন্ন'
): StudentRecord {
  const nextCount = (student.reissuedIdCount ?? 0) + 1;
  const serial = `DID-${student.schoolId.replace(/[^A-Z0-9]/gi, '')}-${student.roll}-${nextCount
    .toString()
    .padStart(2, '0')}`;
  return {
    ...student,
    digitalIdSerial: serial,
    lastIdIssuedAt: dateIso,
    reissuedIdCount: nextCount,
    approvalHistory: [
      {
        id: `SAPH-${Date.now().toString().slice(-5)}`,
        date: dateIso,
        actor,
        category: 'status_change',
        actionTitleBn: `ডিজিটাল আইডি কার্ড ইস্যু (#${serial})`,
        actionTitleEn: `Digital ID Card Issued (#${serial})`,
        fromValue: student.digitalIdSerial ?? 'Initial Card',
        toValue: serial,
        decision: 'completed',
        note,
      },
      ...(student.approvalHistory ?? []),
    ],
  };
}

export function reissueTeacherId(
  teacher: TeacherRecord,
  actor: string,
  dateIso: string,
  note = 'শিক্ষক আইডি কার্ড পুনঃইস্যু সম্পন্ন'
): TeacherRecord {
  const nextCount = (teacher.reissuedIdCount ?? 0) + 1;
  return {
    ...teacher,
    reissuedIdCount: nextCount,
    lastIdIssuedAt: dateIso,
    activityHistory: [
      `${dateIso}: ডিজিটাল শিক্ষক আইডি (#${nextCount}) পুনঃইস্যু — ${actor}`,
      ...(teacher.activityHistory ?? []),
    ],
    approvalHistory: [
      {
        id: `TAPH-${Date.now().toString().slice(-5)}`,
        date: dateIso,
        actor,
        category: 'status_change',
        actionTitleBn: `শিক্ষক আইডি কার্ড পুনঃইস্যু (#${nextCount})`,
        actionTitleEn: `Teacher ID Card Re-issued (#${nextCount})`,
        fromValue: teacher.teacherCode,
        toValue: `${teacher.teacherCode} (Rev #${nextCount})`,
        decision: 'completed',
        note,
      },
      ...(teacher.approvalHistory ?? []),
    ],
  };
}

export function issueStudentTransferLetter(
  student: StudentRecord,
  targetSchoolName: string,
  reason: string,
  actor: string,
  dateIso: string
): { updatedStudent: StudentRecord; tcNumber: string } {
  const tcNumber = `TC-${dateIso.slice(0, 4)}-${student.schoolId.replace(/[^A-Z0-9]/gi, '')}-${student.roll}`;
  const updatedStudent: StudentRecord = {
    ...student,
    admissionHistory: [
      ...student.admissionHistory,
      `${dateIso}: ছাড়পত্র (TC: ${tcNumber}) ইস্যু — গন্তব্য: ${targetSchoolName || 'সাধারণ স্থানান্তর'}`,
    ],
    approvalHistory: [
      {
        id: `SAPH-${Date.now().toString().slice(-5)}`,
        date: dateIso,
        actor,
        category: 'school_transfer',
        actionTitleBn: `ছাড়পত্র / ট্রান্সফার লেটার ইস্যু (${tcNumber})`,
        actionTitleEn: `Transfer Certificate Issued (${tcNumber})`,
        fromValue: student.schoolNameBn,
        toValue: targetSchoolName || 'Open Transfer',
        decision: 'completed',
        note: reason,
      },
      ...(student.approvalHistory ?? []),
    ],
  };
  return { updatedStudent, tcNumber };
}
