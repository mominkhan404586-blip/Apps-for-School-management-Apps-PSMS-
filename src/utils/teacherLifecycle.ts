import type {
  ApprovalStatus,
  TeacherApprovalCategory,
  TeacherApprovalHistoryItem,
  TeacherRecord,
  TeacherStatus,
} from '../types';

export interface TeacherCategoryMeta {
  id: TeacherApprovalCategory;
  labelBn: string;
  labelEn: string;
  group: 'onboarding' | 'movement' | 'academic_info' | 'status_admin';
  howItWorksBn: string;
  howItWorksEn: string;
}

export const TEACHER_APPROVAL_CATEGORIES: TeacherCategoryMeta[] = [
  {
    id: 'new_registration',
    labelBn: 'নতুন শিক্ষক নিবন্ধন / অনুমোদন',
    labelEn: 'New Teacher Registration / Approval',
    group: 'onboarding',
    howItWorksBn: '১. আবেদন ও সনদপত্র যাচাই → ২. Under Review / অনুমোদন → ৩. শিক্ষক সক্রিয় ও আইডি চালু + নোটিফিকেশন প্রেরণ।',
    howItWorksEn: '1. Verify application & certificates → 2. Review/Approve → 3. Activate teacher account & send notifications.',
  },
  {
    id: 'appointment_approval',
    labelBn: 'শিক্ষক নিয়োগ অনুমোদন',
    labelEn: 'Teacher Appointment Approval',
    group: 'onboarding',
    howItWorksBn: 'নিয়োগপত্র, যোগ্যতা ও বিদ্যালয়ের শূন্যপদ যাচাই করে আনুষ্ঠানিক নিয়োগ অনুমোদন ও Teacher Profile-এ সংরক্ষণ।',
    howItWorksEn: 'Verify appointment letter, qualifications & vacancy, then approve onboarding into Teacher Profile.',
  },
  {
    id: 'school_change',
    labelBn: 'শিক্ষক বিদ্যালয় পরিবর্তন',
    labelEn: 'Teacher School Change',
    group: 'movement',
    howItWorksBn: 'বর্তমান বিদ্যালয় থেকে ছাড়পত্র যাচাই করে নতুন বিদ্যালয়ে সংযুক্তি ও ট্রান্সফার হিস্ট্রি আপডেট করা হয়।',
    howItWorksEn: 'Verify clearance from current school, attach teacher to target school & log transfer history.',
  },
  {
    id: 'transfer_approval',
    labelBn: 'শিক্ষকের বদলি অনুমোদন',
    labelEn: 'Teacher Transfer Approval',
    group: 'movement',
    howItWorksBn: 'বদলির আবেদন ও কারণ পর্যালোচনা করে অনুমোদন দিলে শিক্ষক স্বয়ংক্রিয়ভাবে নতুন বিদ্যালয়ের রোস্টারে যুক্ত হবেন।',
    howItWorksEn: 'Review transfer request & reason; approval moves teacher to destination school roster with full history.',
  },
  {
    id: 'other_school_joining',
    labelBn: 'অন্য বিদ্যালয়ে যোগদান অনুমোদন',
    labelEn: 'Other School Joining Approval',
    group: 'movement',
    howItWorksBn: 'বদলি বা নতুন নিয়োগের পর অন্য বিদ্যালয়ে যোগদানের তারিখ ও রিপোর্ট অনুমোদন করে প্রোফাইল সক্রিয় করা হয়।',
    howItWorksEn: 'Approve joining report at another school after transfer or fresh posting and activate profile.',
  },
  {
    id: 'workplace_branch_change',
    labelBn: 'শিক্ষকের কর্মস্থল / শাখা পরিবর্তন',
    labelEn: 'Workplace / Branch Change',
    group: 'movement',
    howItWorksBn: 'একই বিদ্যালয়ের প্রভাতি/দিবা শিফট বা ক্যাম্পাস শাখা পরিবর্তন করে রুটিন ও হাজিরা সিঙ্ক করা হয়।',
    howItWorksEn: 'Update campus branch or shift assignment and sync routine & attendance scope.',
  },
  {
    id: 'designation_change',
    labelBn: 'শিক্ষক পদ পরিবর্তন',
    labelEn: 'Teacher Designation Change',
    group: 'academic_info',
    howItWorksBn: 'প্রধান/সিনিয়র/সহকারী শিক্ষক পদ পরিবর্তন যাচাই করে নতুন পদবি ও Approval History আপডেট করা হয়।',
    howItWorksEn: 'Validate new designation (Head/Senior/Assistant Teacher) and record in Approval History.',
  },
  {
    id: 'promotion_approval',
    labelBn: 'শিক্ষকের পদোন্নতি অনুমোদন',
    labelEn: 'Teacher Promotion Approval',
    group: 'academic_info',
    howItWorksBn: 'অভিজ্ঞতা, পারফরম্যান্স স্কোর ও সুপারিশ যাচাই করে পদোন্নতি অনুমোদন ও উচ্চতর পদবি নির্ধারণ।',
    howItWorksEn: 'Verify seniority, performance score & recommendation to approve promotion and update rank.',
  },
  {
    id: 'subject_change',
    labelBn: 'শিক্ষক বিষয় পরিবর্তন',
    labelEn: 'Teacher Subject Change',
    group: 'academic_info',
    howItWorksBn: 'শিক্ষকের মূল পাঠদানের বিষয় পরিবর্তন করে মার্কস এন্ট্রি ও রুটিন অনুমতি আপডেট করা হয়।',
    howItWorksEn: 'Update primary teaching subjects and adjust RBAC marks-entry & routine scope.',
  },
  {
    id: 'class_subject_allocation',
    labelBn: 'শিক্ষকের শ্রেণি / বিষয় বরাদ্দ পরিবর্তন',
    labelEn: 'Class & Subject Allocation Change',
    group: 'academic_info',
    howItWorksBn: 'নির্ধারিত শ্রেণি (Pre-Primary – Class 10) ও বিষয় তালিকা একসাথে বরাদ্দ ও অনুমোদন করা হয়।',
    howItWorksEn: 'Assign and approve updated class levels (Pre-Primary–Class 10) and subject list.',
  },
  {
    id: 'important_info_change',
    labelBn: 'শিক্ষকের গুরুত্বপূর্ণ তথ্য পরিবর্তন',
    labelEn: 'Important Teacher Info Change',
    group: 'academic_info',
    howItWorksBn: 'নাম, মোবাইল, ইমেইল, এনআইডি ও শিক্ষাগত যোগ্যতার মতো গুরুত্বপূর্ণ তথ্য যাচাইপূর্বক সংশোধন।',
    howItWorksEn: 'Audit and update sensitive details such as Name, Mobile, Email, NID, and Qualification.',
  },
  {
    id: 'joining_date_correction',
    labelBn: 'শিক্ষকের যোগদানের তারিখ সংশোধন',
    labelEn: 'Joining Date Correction',
    group: 'academic_info',
    howItWorksBn: 'নিয়োগের মূল নথির সাথে মিলিয়ে যোগদানের তারিখ সংশোধন করে পুরনো ও নতুন তারিখ অডিট লগে সংরক্ষণ।',
    howItWorksEn: 'Correct joining date against original appointment record with old→new audit trail.',
  },
  {
    id: 'duty_change',
    labelBn: 'শিক্ষকের দায়িত্ব / অতিরিক্ত দায়িত্ব পরিবর্তন',
    labelEn: 'Duty / Additional Responsibility Change',
    group: 'academic_info',
    howItWorksBn: 'শ্রেণি শিক্ষক, পরীক্ষা নিয়ন্ত্রক বা সহ-শিক্ষা দায়িত্ব পরিবর্তন ও অনুমোদন।',
    howItWorksEn: 'Update class teacher, exam coordinator, or co-curricular special duty assignments.',
  },
  {
    id: 'leave_absence_approval',
    labelBn: 'শিক্ষকের ছুটি / দীর্ঘমেয়াদি অনুপস্থিতি অনুমোদন',
    labelEn: 'Leave / Long-Term Absence Approval',
    group: 'status_admin',
    howItWorksBn: 'মেডিকেল, মাতৃত্বকালীন বা দীর্ঘমেয়াদি ছুটি অনুমোদন ও বিকল্প শিক্ষকের প্রয়োজনীয়তা চিহ্নিতকরণ।',
    howItWorksEn: 'Approve medical, maternity, or long-term leave and flag substitute teacher need.',
  },
  {
    id: 'suspend_or_reinstate',
    labelBn: 'শিক্ষকের সাময়িক স্থগিতকরণ / পুনর্বহাল',
    labelEn: 'Teacher Suspend / Reinstate',
    group: 'status_admin',
    howItWorksBn: 'শৃঙ্খলা বা তদন্তজনিত সাময়িক স্থগিত অথবা তদন্ত শেষে পুনরায় সক্রিয় (Reinstate) অনুমোদন।',
    howItWorksEn: 'Temporarily suspend account with reason or reinstate teacher back to Active status.',
  },
  {
    id: 'profile_reactivation',
    labelBn: 'শিক্ষকের প্রোফাইল পুনরায় সক্রিয়করণ',
    labelEn: 'Teacher Profile Reactivation',
    group: 'status_admin',
    howItWorksBn: 'স্থগিত বা নিষ্ক্রিয়কৃত শিক্ষকের প্রোফাইল যাচাই শেষে পুনরায় Active অবস্থায় ফিরিয়ে আনা।',
    howItWorksEn: 'Restore a suspended or deactivated teacher profile back to Active status after verification.',
  },
  {
    id: 'retirement_approval',
    labelBn: 'শিক্ষকের অবসর অনুমোদন',
    labelEn: 'Teacher Retirement Approval',
    group: 'status_admin',
    howItWorksBn: 'চাকরিকাল পূর্ণ হওয়ায় অবসর অনুমোদন, অবসর তারিখ নথিভুক্তকরণ এবং অডিট ইতিহাস সংরক্ষণ।',
    howItWorksEn: 'Approve retirement with effective date while preserving complete teaching & audit history.',
  },
  {
    id: 'school_admin_role_change',
    labelBn: 'স্কুল এডমিন পরিবর্তন',
    labelEn: 'School Admin Change',
    group: 'status_admin',
    howItWorksBn: 'সংশ্লিষ্ট বিদ্যালয়ের School Admin দায়িত্ব এই শিক্ষকের হাতে ন্যস্ত বা পরিবর্তন করা (পূর্বের হিস্ট্রি সংরক্ষিত)।',
    howItWorksEn: 'Assign or transfer School Admin privilege to this teacher while retaining prior admin audit records.',
  },
];

export function getTeacherCategoryMeta(category: TeacherApprovalCategory): TeacherCategoryMeta {
  return (
    TEACHER_APPROVAL_CATEGORIES.find((c) => c.id === category) ?? TEACHER_APPROVAL_CATEGORIES[0]
  );
}

export function deriveTeacherApprovalStatus(teacher: TeacherRecord): ApprovalStatus {
  if (teacher.approvalStatus) return teacher.approvalStatus;
  switch (teacher.status) {
    case 'active':
    case 'transferred':
    case 'suspended':
    case 'deactivated':
      return 'approved';
    case 'under_review':
      return 'under_review';
    case 'rejected':
      return 'rejected';
    default:
      return 'pending';
  }
}

export interface TeacherSummaryCounts {
  total: number;
  active: number;
  pending: number;
  under_review: number;
  rejected: number;
  suspended: number;
  deactivated: number;
}

export function computeTeacherSummaryCounts(teachers: TeacherRecord[]): TeacherSummaryCounts {
  return {
    total: teachers.length,
    active: teachers.filter((t) => t.status === 'active' || t.status === 'transferred').length,
    pending: teachers.filter((t) => t.status === 'pending').length,
    under_review: teachers.filter((t) => t.status === 'under_review').length,
    rejected: teachers.filter((t) => t.status === 'rejected').length,
    suspended: teachers.filter((t) => t.status === 'suspended').length,
    deactivated: teachers.filter((t) => t.status === 'deactivated').length,
  };
}

export interface TeacherFilterCriteria {
  search: string;
  schoolId: string;
  status: string;
}

export function filterTeachers(
  teachers: TeacherRecord[],
  criteria: TeacherFilterCriteria
): TeacherRecord[] {
  const q = criteria.search.trim().toLowerCase();
  return teachers.filter((t) => {
    if (criteria.schoolId !== 'ALL' && t.schoolId !== criteria.schoolId) return false;
    if (criteria.status !== 'ALL') {
      if (criteria.status === 'active') {
        if (t.status !== 'active' && t.status !== 'transferred') return false;
      } else if (t.status !== criteria.status) {
        return false;
      }
    }
    if (q) {
      const hay = `${t.nameBn} ${t.nameEn} ${t.teacherCode} ${t.schoolNameBn} ${t.designation} ${t.mobile} ${t.subjects.join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export interface TeacherEditPatch {
  nameBn: string;
  nameEn: string;
  designation: string;
  qualification: string;
  joiningDate: string;
  mobile: string;
  email: string;
  branchName: string;
  specialDuty: string;
  subjects: string[];
  assignedClasses: string[];
  performanceScore: number;
  reason?: string;
}

export function applyTeacherEdit(
  teacher: TeacherRecord,
  patch: TeacherEditPatch,
  actor: string,
  dateIso: string
): { updatedTeacher: TeacherRecord; changedFields: string[] } {
  const changedFields: string[] = [];
  if (patch.nameBn !== teacher.nameBn || patch.nameEn !== teacher.nameEn) changedFields.push('Name');
  if (patch.designation !== teacher.designation) changedFields.push('Designation');
  if (patch.qualification !== teacher.qualification) changedFields.push('Qualification');
  if (patch.joiningDate !== teacher.joiningDate) changedFields.push('Joining Date');
  if (patch.mobile !== teacher.mobile || patch.email !== (teacher.email ?? '')) changedFields.push('Contact');
  if (patch.branchName !== (teacher.branchName ?? '')) changedFields.push('Branch');
  if (patch.specialDuty !== (teacher.specialDuty ?? '')) changedFields.push('Duty');
  if (patch.subjects.join(',') !== teacher.subjects.join(',')) changedFields.push('Subjects');
  if (patch.assignedClasses.join(',') !== teacher.assignedClasses.join(',')) changedFields.push('Classes');

  const historyItem: TeacherApprovalHistoryItem = {
    id: `TAPH-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 90 + 10)}`,
    date: dateIso,
    actor,
    category: 'important_info_change',
    actionTitleBn: 'শিক্ষকের তথ্য সম্পাদনা',
    actionTitleEn: 'Teacher Information Updated',
    fromValue: `${teacher.designation} · ${teacher.subjects.join(', ')}`,
    toValue: `${patch.designation} · ${patch.subjects.join(', ')}`,
    decision: 'approved',
    note:
      patch.reason?.trim() ||
      (changedFields.length > 0 ? `Updated: ${changedFields.join(', ')}` : 'Profile saved'),
  };

  const updatedTeacher: TeacherRecord = {
    ...teacher,
    nameBn: patch.nameBn.trim() || teacher.nameBn,
    nameEn: patch.nameEn.trim() || teacher.nameEn,
    designation: patch.designation.trim() || teacher.designation,
    qualification: patch.qualification.trim() || teacher.qualification,
    joiningDate: patch.joiningDate.trim() || teacher.joiningDate,
    mobile: patch.mobile.trim() || teacher.mobile,
    email: patch.email.trim(),
    branchName: patch.branchName.trim(),
    specialDuty: patch.specialDuty.trim(),
    subjects: patch.subjects.length > 0 ? patch.subjects : teacher.subjects,
    assignedClasses: patch.assignedClasses.length > 0 ? patch.assignedClasses : teacher.assignedClasses,
    performanceScore: Math.max(0, Math.min(100, patch.performanceScore)),
    approvalHistory: [historyItem, ...(teacher.approvalHistory ?? [])],
  };

  return { updatedTeacher, changedFields };
}

export interface TeacherWorkflowActionPayload {
  category: TeacherApprovalCategory;
  targetSchoolId?: string;
  targetSchoolNameBn?: string;
  newDesignation?: string;
  newSubjects?: string[];
  newAssignedClasses?: string[];
  newJoiningDate?: string;
  newBranch?: string;
  newDuty?: string;
  leaveRange?: string;
  retirementDate?: string;
  newMobile?: string;
  newEmail?: string;
  newQualification?: string;
  reason: string;
}

export function applyTeacherWorkflowAction(
  teacher: TeacherRecord,
  payload: TeacherWorkflowActionPayload,
  actor: string,
  dateIso: string
): {
  updatedTeacher: TeacherRecord;
  fromValue: string;
  toValue: string;
  categoryMeta: TeacherCategoryMeta;
} {
  const categoryMeta = getTeacherCategoryMeta(payload.category);
  let next: TeacherRecord = { ...teacher };
  let fromValue: string = teacher.status;
  let toValue: string = teacher.status;

  switch (payload.category) {
    case 'new_registration':
    case 'appointment_approval':
    case 'profile_reactivation': {
      fromValue = teacher.status;
      toValue = 'active';
      next = {
        ...next,
        status: 'active',
        approvalStatus: 'approved',
        suspensionReason: undefined,
        deactivationReason: undefined,
      };
      break;
    }
    case 'school_change':
    case 'transfer_approval':
    case 'other_school_joining': {
      const targetSchoolName = payload.targetSchoolNameBn?.trim() || teacher.schoolNameBn;
      const targetSchoolId = payload.targetSchoolId || teacher.schoolId;
      fromValue = `${teacher.schoolNameBn} (${teacher.schoolId})`;
      toValue = `${targetSchoolName} (${targetSchoolId})`;
      next = {
        ...next,
        schoolId: targetSchoolId,
        schoolNameBn: targetSchoolName,
        status: 'active',
        approvalStatus: 'approved',
        transferHistory: [
          `${dateIso}: ${teacher.schoolNameBn} → ${targetSchoolName} (${payload.reason})`,
          ...(teacher.transferHistory ?? []),
        ],
      };
      break;
    }
    case 'designation_change':
    case 'promotion_approval': {
      const nextDes = payload.newDesignation?.trim() || teacher.designation;
      fromValue = teacher.designation;
      toValue = nextDes;
      next = {
        ...next,
        designation: nextDes,
        approvalStatus: 'approved',
      };
      break;
    }
    case 'subject_change': {
      const nextSubj = payload.newSubjects && payload.newSubjects.length > 0 ? payload.newSubjects : teacher.subjects;
      fromValue = teacher.subjects.join(', ');
      toValue = nextSubj.join(', ');
      next = {
        ...next,
        subjects: nextSubj,
      };
      break;
    }
    case 'class_subject_allocation': {
      const nextSubj = payload.newSubjects && payload.newSubjects.length > 0 ? payload.newSubjects : teacher.subjects;
      const nextCls = payload.newAssignedClasses && payload.newAssignedClasses.length > 0 ? payload.newAssignedClasses : teacher.assignedClasses;
      fromValue = `${teacher.assignedClasses.join(', ')} | ${teacher.subjects.join(', ')}`;
      toValue = `${nextCls.join(', ')} | ${nextSubj.join(', ')}`;
      next = {
        ...next,
        subjects: nextSubj,
        assignedClasses: nextCls,
      };
      break;
    }
    case 'important_info_change': {
      fromValue = `${teacher.mobile} / ${teacher.qualification}`;
      const nextMob = payload.newMobile?.trim() || teacher.mobile;
      const nextQual = payload.newQualification?.trim() || teacher.qualification;
      const nextEmail = payload.newEmail?.trim() ?? teacher.email;
      toValue = `${nextMob} / ${nextQual}`;
      next = {
        ...next,
        mobile: nextMob,
        qualification: nextQual,
        email: nextEmail,
      };
      break;
    }
    case 'leave_absence_approval': {
      const range = payload.leaveRange?.trim() || `${dateIso} (অনুমোদিত ছুটি)`;
      fromValue = teacher.leaveStatus ?? 'Regular Duty';
      toValue = `On Leave: ${range}`;
      next = {
        ...next,
        leaveStatus: range,
      };
      break;
    }
    case 'duty_change': {
      const nextDuty = payload.newDuty?.trim() || teacher.specialDuty || 'বিশেষ দায়িত্ব';
      fromValue = teacher.specialDuty ?? 'None';
      toValue = nextDuty;
      next = {
        ...next,
        specialDuty: nextDuty,
      };
      break;
    }
    case 'workplace_branch_change': {
      const nextBranch = payload.newBranch?.trim() || 'Main Campus';
      fromValue = teacher.branchName ?? 'Primary Campus';
      toValue = nextBranch;
      next = {
        ...next,
        branchName: nextBranch,
      };
      break;
    }
    case 'joining_date_correction': {
      const nextDate = payload.newJoiningDate?.trim() || teacher.joiningDate;
      fromValue = teacher.joiningDate;
      toValue = nextDate;
      next = {
        ...next,
        joiningDate: nextDate,
      };
      break;
    }
    case 'suspend_or_reinstate': {
      const isCurrentlySuspended = teacher.status === 'suspended';
      fromValue = teacher.status;
      toValue = isCurrentlySuspended ? 'active' : 'suspended';
      next = {
        ...next,
        status: isCurrentlySuspended ? 'active' : 'suspended',
        suspensionReason: isCurrentlySuspended ? undefined : payload.reason,
      };
      break;
    }
    case 'retirement_approval': {
      const retDate = payload.retirementDate?.trim() || dateIso;
      fromValue = teacher.status;
      toValue = `deactivated (Retired ${retDate})`;
      next = {
        ...next,
        status: 'deactivated',
        retirementDate: retDate,
        deactivationReason: `অবসর অনুমোদন (${retDate}): ${payload.reason}`,
      };
      break;
    }
    case 'school_admin_role_change': {
      fromValue = teacher.isSchoolAdmin ? 'School Admin' : 'Teacher';
      toValue = teacher.isSchoolAdmin ? 'Teacher (Admin Handover)' : 'School Admin Assigned';
      next = {
        ...next,
        isSchoolAdmin: !teacher.isSchoolAdmin,
        specialDuty: !teacher.isSchoolAdmin
          ? 'School Admin (কেন্দ্রীয় অনুমোদিত)'
          : 'সহকারী শিক্ষক (দায়িত্ব হস্তান্তরিত)',
      };
      break;
    }
  }

  const historyItem: TeacherApprovalHistoryItem = {
    id: `TAPH-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 90 + 10)}`,
    date: dateIso,
    actor,
    category: payload.category,
    actionTitleBn: categoryMeta.labelBn,
    actionTitleEn: categoryMeta.labelEn,
    fromValue,
    toValue,
    decision: 'approved',
    note: payload.reason,
  };

  next = {
    ...next,
    approvalHistory: [historyItem, ...(teacher.approvalHistory ?? [])],
  };

  return {
    updatedTeacher: next,
    fromValue,
    toValue,
    categoryMeta,
  };
}

export function executeTeacherStatusChange(
  teacher: TeacherRecord,
  newStatus: TeacherStatus,
  reason: string,
  actor: string,
  dateIso: string
): TeacherRecord {
  const nextAppStatus: ApprovalStatus =
    newStatus === 'active' || newStatus === 'transferred' || newStatus === 'suspended' || newStatus === 'deactivated'
      ? 'approved'
      : newStatus === 'under_review'
        ? 'under_review'
        : newStatus === 'rejected'
          ? 'rejected'
          : 'pending';

  const historyItem: TeacherApprovalHistoryItem = {
    id: `TAPH-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 90 + 10)}`,
    date: dateIso,
    actor,
    category: 'status_change',
    actionTitleBn: `অবস্থা পরিবর্তন (${newStatus})`,
    actionTitleEn: `Status Changed (${newStatus})`,
    fromValue: teacher.status,
    toValue: newStatus,
    decision: newStatus === 'rejected' ? 'rejected' : newStatus === 'under_review' ? 'under_review' : 'approved',
    note: reason || undefined,
  };

  return {
    ...teacher,
    status: newStatus,
    approvalStatus: nextAppStatus,
    suspensionReason: newStatus === 'suspended' ? reason : newStatus === 'active' ? undefined : teacher.suspensionReason,
    deactivationReason: newStatus === 'deactivated' ? reason : newStatus === 'active' ? undefined : teacher.deactivationReason,
    approvalHistory: [historyItem, ...(teacher.approvalHistory ?? [])],
  };
}
