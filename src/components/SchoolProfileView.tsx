import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Bell,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  FileText,
  History,
  KeyRound,
  Mail,
  MapPin,
  PauseCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  FileBarChart2,
  Trash2,
  UserCog,
  UserPlus,
} from 'lucide-react';
import type {
  AuditLogEntry,
  Language,
  PermissionKey,
  SchoolAdminMember,
  SchoolInspectionRecord,
  SchoolRecord,
  SchoolTypeCode,
  StudentRecord,
  TeacherRecord,
} from '../types';
import { b } from '../i18n/translations';
import {
  getSchoolTypeConfig,
  SCHOOL_TYPE_OPTIONS,
} from '../utils/schoolConfigAndAddress';
import { deriveApprovalStatus, type AdminManagementMode } from '../utils/schoolLifecycle';
import { deriveVerificationStatus } from '../utils/governanceAndVerification';
import type { ConfirmDialogState } from './Modals';

export type SchoolProfileSubTab =
  | 'overview'
  | 'admins'
  | 'approval_history'
  | 'documents'
  | 'inspections'
  | 'activity';

interface SchoolProfileViewProps {
  school: SchoolRecord;
  initialSubTab?: SchoolProfileSubTab;
  lang: Language;
  students: StudentRecord[];
  teachers: TeacherRecord[];
  auditLogs: AuditLogEntry[];
  onBack: () => void;
  hasPermission?: (key: PermissionKey) => boolean;
  onInspectStudent: (student: StudentRecord) => void;
  onOpenConfirm: (cfg: Omit<ConfirmDialogState, 'open'>) => void;
  onUpdateSchoolStatus: (schoolId: string, status: SchoolRecord['status'], reason: string) => void;
  onReturnForRevision: (schoolId: string, note: string) => void;
  onAssignSchoolCodes: (schoolId: string, registrationId: string, code: string, eiin: string) => void;
  onChangeSchoolType: (schoolId: string, newType: SchoolTypeCode, customSchoolType: string | undefined, reason: string) => void;
  onVerifyManualAddress: (schoolId: string, reason: string) => void;
  onOpenEditModal: (school: SchoolRecord) => void;
  onOpenNoticeModal: (school: SchoolRecord) => void;
  onOpenDeactivateModal: (school: SchoolRecord, mode: 'suspend' | 'deactivate') => void;
  onReactivateSchool: (schoolId: string, reason: string) => void;
  onOpenAdminHandover: (mode: AdminManagementMode, targetAdmin?: SchoolAdminMember) => void;
  onOpenInspectionModal: () => void;
  onVerifySchool?: (schoolId: string, note: string) => void;
  onOpenSchoolReport?: (school: SchoolRecord) => void;
  onArchiveSchool?: (schoolId: string, reason: string) => void;
  onEditSchoolCover?: (school: SchoolRecord) => void;
}

export const SchoolProfileView: React.FC<SchoolProfileViewProps> = ({
  school,
  initialSubTab = 'overview',
  lang,
  students,
  teachers,
  auditLogs,
  hasPermission,
  onBack,
  onInspectStudent,
  onOpenConfirm,
  onUpdateSchoolStatus,
  onReturnForRevision,
  onAssignSchoolCodes,
  onChangeSchoolType,
  onVerifyManualAddress,
  onOpenEditModal,
  onOpenNoticeModal,
  onOpenDeactivateModal,
  onReactivateSchool,
  onOpenAdminHandover,
  onOpenInspectionModal,
  onVerifySchool,
  onOpenSchoolReport,
  onArchiveSchool,
  onEditSchoolCover,
}) => {
  const [subTab, setSubTab] = useState<SchoolProfileSubTab>(initialSubTab);
  const [regIdInput, setRegIdInput] = useState(school.registrationId ?? `REG-2026-${school.code}`);
  const [codeInput, setCodeInput] = useState(school.code);
  const [eiinInput, setEiinInput] = useState(school.eiin);
  const [pendingNewType, setPendingNewType] = useState<SchoolTypeCode>(school.schoolType);
  const [pendingCustomType, setPendingCustomType] = useState(school.customSchoolType ?? '');

  const can = (k: PermissionKey) => (hasPermission ? hasPermission(k) : true);
  const schoolStudents = students.filter((s) => s.schoolId === school.id);
  const schoolTeachers = teachers.filter((t) => t.schoolId === school.id);
  const schoolAuditLogs = auditLogs.filter(
    (l) => l.schoolId === school.id || l.targetName.includes(school.code)
  );
  const typeCfg = getSchoolTypeConfig(school.schoolType, school.approvedClasses);
  const approvalStatus = deriveApprovalStatus(school);
  const verificationStatus = deriveVerificationStatus(school);

  const adminsList: SchoolAdminMember[] =
    school.schoolAdmins && school.schoolAdmins.length > 0
      ? school.schoolAdmins
      : [
          {
            id: `adm-${school.id}`,
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

  const statusTone = (st: string) => {
    switch (st) {
      case 'active':
      case 'approved':
      case 'verified':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'under_review':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'pending':
      case 'revision_requested':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'suspended':
      case 'rejected':
      case 'deactivated':
        return 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const tabs: { id: SchoolProfileSubTab; labelBn: string; labelEn: string }[] = [
    { id: 'overview', labelBn: 'তথ্য ও সংক্ষিপ্ত বিবরণ', labelEn: 'Overview & Info' },
    { id: 'admins', labelBn: 'School Admin ও হস্তান্তর', labelEn: 'Admin & Handover' },
    { id: 'approval_history', labelBn: 'Approval History', labelEn: 'Approval History' },
    { id: 'documents', labelBn: 'নথিপত্র ও পূর্বের আবেদন', labelEn: 'Docs & Applications' },
    { id: 'inspections', labelBn: 'পরিদর্শন রিপোর্ট', labelEn: 'Inspection History' },
    { id: 'activity', labelBn: 'Activity History (Audit)', labelEn: 'Activity History' },
  ];

  return (
    <div className="space-y-5">
      {/* Top School Profile Header & Action Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {b('সকল বিদ্যালয়ের তালিকায় ফিরুন', 'Back to All Schools', lang)}
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {school.nameBn} ({school.code})
              </h1>
              <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${statusTone(school.status)}`}>
                Status: {school.status}
              </span>
              <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${statusTone(verificationStatus)}`}>
                Verify: {verificationStatus}
              </span>
              <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${statusTone(approvalStatus)}`}>
                Approval: {approvalStatus}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {school.nameEn} · School ID: <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">{school.schoolPublicId ?? school.code}</span> · Reg ID: <span className="font-mono font-semibold">{school.registrationId ?? `REG-${school.code}`}</span> · EIIN:{' '}
              <span className="font-mono font-semibold">{school.eiin}</span> · {school.division} → {school.district} → {school.upazila}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onEditSchoolCover && (
              <button
                type="button"
                onClick={() => onEditSchoolCover(school)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                {b('কভার ব্যানার', 'Cover Banner', lang)}
              </button>
            )}
            {can('school:edit') && (
              <button
                type="button"
                onClick={() => onOpenEditModal(school)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                {b('তথ্য পরিবর্তন', 'Edit Info', lang)}
              </button>
            )}
            {can('school:notice') && (
              <button
                type="button"
                onClick={() => onOpenNoticeModal(school)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400 shrink-0" />
                {b('নোটিশ পাঠান', 'Send Notice', lang)}
              </button>
            )}
            {can('school:verify') && onVerifySchool && verificationStatus !== 'verified' && (
              <button
                type="button"
                onClick={() =>
                  onOpenConfirm({
                    title: b('বিদ্যালয় তথ্য যাচাই নিশ্চিত করুন', 'Verify School Record', lang),
                    message: b(
                      `"${school.nameBn}"-এর নথি, EIIN ও অবস্থান তথ্য যাচাইকৃত হিসেবে চিহ্নিত করতে চান? (অনুমোদন আলাদাভাবে Approval ধাপে সম্পন্ন হবে)`,
                      `Mark "${school.nameEn}" documents and registration details as Verified?`,
                      lang
                    ),
                    confirmLabel: b('যাচাই সম্পন্ন', 'Mark Verified', lang),
                    onConfirm: (note) => onVerifySchool(school.id, note),
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white whitespace-nowrap cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                {b('তথ্য যাচাই (Verify)', 'Verify Info', lang)}
              </button>
            )}
            {(can('school:verify') || can('school:view')) && (
              <button
                type="button"
                onClick={onOpenInspectionModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 whitespace-nowrap cursor-pointer"
              >
                <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
                {b('পরিদর্শন রেকর্ড', 'Inspect', lang)}
              </button>
            )}
            {can('school:reports') && onOpenSchoolReport && (
              <button
                type="button"
                onClick={() => onOpenSchoolReport(school)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
              >
                <FileBarChart2 className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400 shrink-0" />
                {b('রিপোর্ট', 'Reports', lang)}
              </button>
            )}
            {(school.status === 'suspended' || school.status === 'deactivated' || school.status === 'archived') ? (
              can('school:restore') && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenConfirm({
                      title: b('বিদ্যালয় পুনরায় সক্রিয় করুন', 'Restore / Reactivate School', lang),
                      message: b(`"${school.nameBn}"-কে পুনরায় সক্রিয় (Active) করতে চান?`, `Restore "${school.nameEn}" to active status?`, lang),
                      confirmLabel: b('সক্রিয় করুন', 'Restore / Activate', lang),
                      requireReason: true,
                      onConfirm: (reason) => onReactivateSchool(school.id, reason),
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white whitespace-nowrap cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 shrink-0" />
                  {b('পুনরুদ্ধার / সক্রিয়', 'Restore / Activate', lang)}
                </button>
              )
            ) : (
              <>
                {can('school:suspend') && (
                  <button
                    type="button"
                    onClick={() => onOpenDeactivateModal(school, 'suspend')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 whitespace-nowrap cursor-pointer"
                  >
                    <PauseCircle className="w-3.5 h-3.5 shrink-0" />
                    {b('সাময়িক নিষ্ক্রিয়', 'Suspend', lang)}
                  </button>
                )}
                {can('school:deactivate') && (
                  <button
                    type="button"
                    onClick={() => onOpenDeactivateModal(school, 'deactivate')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 whitespace-nowrap cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5 shrink-0" />
                    {b('স্থায়ী বাতিল', 'Deactivate', lang)}
                  </button>
                )}
                {can('school:delete_archive') && onArchiveSchool && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenConfirm({
                        title: b('বিদ্যালয় আর্কাইভ / অপসারণ', 'Archive / Delete School', lang),
                        message: b(
                          `"${school.nameBn}"-কে আর্কাইভ করলে পূর্বের অডিট লগ ও ইতিহাস অক্ষত থাকবে এবং প্রয়োজনে পুনরুদ্ধার করা যাবে।`,
                          `Archiving "${school.nameEn}" preserves audit logs and allows later restoration.`,
                          lang
                        ),
                        confirmLabel: b('আর্কাইভ করুন', 'Archive School', lang),
                        danger: true,
                        requireReason: true,
                        onConfirm: (reason) => onArchiveSchool(school.id, reason),
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 whitespace-nowrap cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    {b('আর্কাইভ', 'Archive', lang)}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Approval Workflow Action Strip */}
        {can('school:approve') && (school.status === 'pending' || school.status === 'under_review' || school.status === 'revision_requested') && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="text-slate-600 dark:text-slate-300 font-medium">
              {b('অনুমোদন ও যাচাই কার্যক্রম:', 'Registration & Approval Actions:', lang)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onOpenConfirm({
                    title: b('বিদ্যালয় অনুমোদন ও সক্রিয় করুন', 'Approve & Activate School', lang),
                    message: b(`"${school.nameBn}"-কে অনুমোদন ও সক্রিয় করতে চান?`, `Approve and activate "${school.nameEn}"?`, lang),
                    confirmLabel: b('অনুমোদন করুন', 'Approve & Activate', lang),
                    onConfirm: (reason) => onUpdateSchoolStatus(school.id, 'active', reason),
                  })
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold whitespace-nowrap cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {b('অনুমোদন প্রদান', 'Approve School', lang)}
              </button>
              {(school.status === 'pending' || school.status === 'under_review') && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenConfirm({
                      title: b('সংশোধনের জন্য আবেদন ফেরত পাঠান', 'Return Application for Revision', lang),
                      message: b(`"${school.nameBn}"-কে কোন কোন তথ্য বা নথি সংশোধন করতে হবে তা লিখুন:`, `Specify required corrections for "${school.nameEn}":`, lang),
                      confirmLabel: b('সংশোধনের জন্য ফেরত দিন', 'Return for Revision', lang),
                      requireReason: true,
                      onConfirm: (note) => onReturnForRevision(school.id, note),
                    })
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold whitespace-nowrap cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {b('সংশোধনের জন্য ফেরত', 'Return for Revision', lang)}
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  onOpenConfirm({
                    title: b('আবেদন প্রত্যাখ্যান করুন', 'Reject Application', lang),
                    message: b(`"${school.nameBn}"-এর আবেদন প্রত্যাখ্যান করতে চান?`, `Reject "${school.nameEn}" application?`, lang),
                    confirmLabel: b('প্রত্যাখ্যান করুন', 'Reject', lang),
                    danger: true,
                    requireReason: true,
                    onConfirm: (reason) => onUpdateSchoolStatus(school.id, 'rejected', reason),
                  })
                }
                className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 font-semibold whitespace-nowrap cursor-pointer"
              >
                {b('প্রত্যাখ্যান', 'Reject', lang)}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex flex-wrap gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 text-xs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              subTab === tab.id
                ? 'bg-blue-700 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {b(tab.labelBn, tab.labelEn, lang)}
          </button>
        ))}
      </div>

      {/* Manual Address Warning */}
      {school.addressSource === 'MANUAL' && !school.addressVerified && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-900 dark:text-amber-200">
                Address Entered Manually — Verification Required
              </div>
              <div className="text-amber-800 dark:text-amber-300 mt-0.5">
                {school.division}, {school.district}, {school.upazila}, {school.union}, {school.village} ({school.fullAddress})
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onOpenConfirm({
                title: b('ম্যানুয়াল ঠিকানা যাচাই', 'Verify Manual Address', lang),
                message: b(`"${school.nameBn}"-এর ঠিকানা যাচাইকৃত হিসেবে চিহ্নিত করতে চান?`, `Verify manual address for "${school.nameEn}"?`, lang),
                confirmLabel: b('যাচাই নিশ্চিত করুন', 'Mark Verified', lang),
                onConfirm: (reason) => onVerifyManualAddress(school.id, reason),
              })
            }
            className="px-3.5 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold cursor-pointer"
          >
            {b('ঠিকানা যাচাই করুন', 'Verify Address', lang)}
          </button>
        </div>
      )}

      {/* SUB-TAB 1: OVERVIEW & INFO */}
      {subTab === 'overview' && (
        <div className="space-y-5">
          {/* Temporary Suspension / Permanent Deactivation Banner if applicable */}
          {school.status === 'suspended' && school.suspensionDetails && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-4 text-xs space-y-1.5">
              <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <PauseCircle className="w-4 h-4" />
                {b('সাময়িক নিষ্ক্রিয় তথ্য (Temporary Suspension Details)', 'Temporary Suspension Details', lang)}
              </div>
              <div><span className="font-semibold">{b('কারণ:', 'Reason:', lang)}</span> {school.suspensionDetails.reason}</div>
              <div className="flex flex-wrap gap-4 tabular-nums">
                <span><span className="font-semibold">{b('শুরুর তারিখ:', 'Start:', lang)}</span> {school.suspensionDetails.startDate}</span>
                <span><span className="font-semibold">{b('সম্ভাব্য পুনরায় চালু:', 'Expected Resume:', lang)}</span> {school.suspensionDetails.expectedResumeDate}</span>
                {school.suspensionDetails.reactivationRequested && (
                  <span className="font-bold text-blue-700 dark:text-blue-400">
                    {b('পুনরায় সক্রিয় করার আবেদন জমা হয়েছে!', 'Reactivation Requested by School Admin!', lang)}
                  </span>
                )}
              </div>
            </div>
          )}

          {school.status === 'deactivated' && school.deactivationDetails && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-xl p-4 text-xs space-y-1.5">
              <div className="font-bold text-red-900 dark:text-red-200 flex items-center gap-2">
                <Ban className="w-4 h-4" />
                {b('স্থায়ী বাতিল রেকর্ড (Permanent Deactivation Record)', 'Permanent Closure Record', lang)}
              </div>
              <div><span className="font-semibold">{b('কারণ:', 'Reason:', lang)}</span> {school.deactivationDetails.reason}</div>
              <div className="flex flex-wrap gap-4">
                <span>{b('প্রমাণপত্র:', 'Evidence:', lang)} <span className="font-mono">{school.deactivationDetails.evidenceDoc}</span></span>
                <span>{b('পরিদর্শন রিপোর্ট:', 'Inspection Ref:', lang)} <span className="font-mono">{school.deactivationDetails.inspectionReportRef}</span></span>
                <span>{b('চূড়ান্ত অনুমোদন:', 'Final Approval:', lang)} {school.deactivationDetails.finalApprovalBy} ({school.deactivationDetails.finalApprovalDate})</span>
              </div>
              <div className="text-emerald-800 dark:text-emerald-300 font-semibold">
                ✓ {b('শিক্ষার্থী স্থানান্তর, শিক্ষক/কর্মচারী সমন্বয় ও সম্পদ নিষ্পত্তি যাচাইকৃত।', 'Student transfer, staff adjustment & asset disposal verified.', lang)}
              </div>
            </div>
          )}

          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500">{b('মোট শিক্ষার্থী', 'Student Count', lang)}</div>
              <div className="text-2xl font-bold tabular-nums mt-1">{school.studentCount}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500">{b('মোট শিক্ষক', 'Teacher Count', lang)}</div>
              <div className="text-2xl font-bold tabular-nums mt-1">{school.teacherCount}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500">{b('গড় উপস্থিতি', 'Attendance Rate', lang)}</div>
              <div className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">{school.attendanceRate}%</div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500">{b('প্রতিষ্ঠার সাল ও ক্যাটাগরি', 'Established & Category', lang)}</div>
              <div className="text-base font-bold mt-1.5">{school.establishedYear ?? 'N/A'} · {school.category ?? 'General'}</div>
            </div>
          </div>

          {/* Complete Profile Details Grid + Reg ID/EIIN Assignment */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2.5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-700" />
                {b('প্রতিষ্ঠানের পূর্ণাঙ্গ প্রোফাইল তথ্য', 'Institution Profile & GPS Details', lang)}
              </h2>
              <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-slate-600 dark:text-slate-300">
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('বাংলা নাম:', 'Name (BN):', lang)}</span> {school.nameBn}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('ইংরেজি নাম:', 'Name (EN):', lang)}</span> {school.nameEn}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">Registration ID:</span> <span className="font-mono">{school.registrationId ?? `REG-${school.code}`}</span></div>
                <div><span className="font-semibold text-slate-900 dark:text-white">Code / EIIN:</span> <span className="font-mono">{school.code} / {school.eiin}</span></div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('ধরন:', 'School Type:', lang)}</span> {b(typeCfg.labelBn, typeCfg.labelEn, lang)}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('শিক্ষা স্তর:', 'Education Level:', lang)}</span> {school.educationLevel ?? school.classRange}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('প্রধান / Admin:', 'School Admin:', lang)}</span> {school.headTeacher}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('যোগাযোগ:', 'Contact:', lang)}</span> {school.mobile} · {school.email}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('নিবন্ধন তারিখ:', 'Reg Date:', lang)}</span> <span className="tabular-nums">{school.registrationDate ?? school.verifiedDate}</span></div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('অনুমোদন তথ্য:', 'Verified Date:', lang)}</span> {school.verifiedDate}</div>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  {school.fullAddress} ({school.division} → {school.district} → {school.upazila})
                </div>
                <div className="font-mono text-slate-500">
                  GPS: {school.gpsLat && school.gpsLng ? `${school.gpsLat}, ${school.gpsLng}` : 'Not recorded'} · Source: {school.addressSource}
                </div>
              </div>
            </div>

            {/* Reg ID / EIIN / School Code Assignment + Change Type */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-blue-700" />
                  {b('School Registration ID / EIIN / Code প্রদান', 'Assign Registration ID / EIIN / School Code', lang)}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold mb-1">Reg ID</label>
                    <input
                      type="text"
                      value={regIdInput}
                      onChange={(e) => setRegIdInput(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">School Code</label>
                    <input
                      type="text"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">EIIN</label>
                    <input
                      type="text"
                      value={eiinInput}
                      onChange={(e) => setEiinInput(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onAssignSchoolCodes(school.id, regIdInput, codeInput, eiinInput)}
                  className="px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
                >
                  {b('কোড ও EIIN সংরক্ষণ করুন', 'Save & Assign Codes', lang)}
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2.5">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {b('School Type পরিবর্তন (সতর্কতামূলক)', 'Change School Type', lang)}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={pendingNewType}
                    onChange={(e) => setPendingNewType(e.target.value as SchoolTypeCode)}
                    className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    {SCHOOL_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.code} value={opt.code}>{opt.labelBn} ({opt.code})</option>
                    ))}
                  </select>
                  {pendingNewType === 'OTHER' && (
                    <input
                      type="text"
                      value={pendingCustomType}
                      onChange={(e) => setPendingCustomType(e.target.value)}
                      placeholder="Custom type..."
                      className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      onOpenConfirm({
                        title: b('সতর্কতা: School Type পরিবর্তন', 'Warning: Change School Type', lang),
                        message: b(
                          `"${school.nameBn}"-এর School Type (${school.schoolType} → ${pendingNewType}) পরিবর্তন করলে শ্রেণি ও মডিউল পুনর্গঠিত হবে।`,
                          `Changing School Type (${school.schoolType} → ${pendingNewType}) will reconfigure classes and modules.`,
                          lang
                        ),
                        confirmLabel: b('নিশ্চিত করুন', 'Confirm Change', lang),
                        danger: true,
                        requireReason: true,
                        onConfirm: (reason) =>
                          onChangeSchoolType(school.id, pendingNewType, pendingNewType === 'OTHER' ? pendingCustomType : undefined, reason),
                      })
                    }
                    className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
                  >
                    {b('ধরন পরিবর্তন', 'Update Type', lang)}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Teachers & Students */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold mb-3">{b('নিবন্ধিত শিক্ষক তালিকা', 'Registered Teachers', lang)}</h3>
              {schoolTeachers.length === 0 ? (
                <p className="text-xs text-slate-500">{b('কোনো শিক্ষক পাওয়া যায়নি।', 'No sample teachers found.', lang)}</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {schoolTeachers.map((t) => (
                    <li key={t.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{t.nameBn}</div>
                        <div className="text-slate-500">{t.designation} · {t.subjects.join(', ')}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${statusTone(t.status)}`}>{t.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold mb-3">{b('শিক্ষার্থী প্রোফাইল পরিদর্শন', 'Student Profiles', lang)}</h3>
              {schoolStudents.length === 0 ? (
                <p className="text-xs text-slate-500">{b('কোনো নমুনা শিক্ষার্থী নেই।', 'No sample students listed.', lang)}</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {schoolStudents.map((s) => (
                    <li key={s.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{s.nameBn}</div>
                        <div className="text-slate-500 font-mono">{s.permanentId} · {s.className}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onInspectStudent(s)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                      >
                        {b('প্রোফাইল', 'Inspect', lang)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SCHOOL ADMIN & HANDOVER */}
      {subTab === 'admins' && (
        <div className="space-y-5 text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-blue-700" />
                  {b('School Admin ব্যবস্থাপনা ও পরিবর্তন', 'School Admin Management & Handover', lang)}
                </h2>
                <p className="text-slate-500 mt-0.5">
                  {b(
                    'নতুন School Admin নিয়োগ, প্রতিস্থাপন, ভারপ্রাপ্ত Admin, ইমেইল আমন্ত্রণ ও অনুমতি নিয়ন্ত্রণ। পুরনো Admin-এর অডিট হিস্ট্রি কখনো মুছে যায় না।',
                    'Appoint, replace, assign acting admin, manage permissions & email invites. Prior admins audit logs are always preserved.',
                    lang
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenAdminHandover('appoint_new')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {b('নতুন Admin নিয়োগ', 'Appoint Admin', lang)}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAdminHandover('replace_current')}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {b('বর্তমান Admin প্রতিস্থাপন', 'Replace Current', lang)}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAdminHandover('assign_acting')}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {b('ভারপ্রাপ্ত Admin', 'Assign Acting', lang)}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                    <th className="py-2.5 px-3 font-semibold">{b('নাম ও ইউজারনেম', 'Name / Username', lang)}</th>
                    <th className="py-2.5 px-3 font-semibold">{b('ভূমিকা ও আমন্ত্রণ', 'Role & Invite', lang)}</th>
                    <th className="py-2.5 px-3 font-semibold">{b('অনুমতি (Permissions)', 'Permissions', lang)}</th>
                    <th className="py-2.5 px-3 font-semibold">{b('অবস্থা', 'Status', lang)}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {adminsList.map((adm) => (
                    <tr key={adm.id}>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{adm.name}</div>
                        <div className="font-mono text-slate-500">{adm.username} · {adm.mobile}</div>
                        <div className="text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {adm.email}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-blue-700 dark:text-blue-400">{adm.roleType}</div>
                        <div className="text-slate-500">Invite: {adm.invitationStatus} · {adm.assignedAt}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {adm.permissions.join(', ')}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${statusTone(adm.status === 'active' ? 'active' : 'rejected')}`}>
                          {adm.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {adm.status === 'active' && (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenAdminHandover('update_permissions', adm)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                            >
                              {b('অনুমতি', 'Permissions', lang)}
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenAdminHandover('remove', adm)}
                              className="px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 font-semibold cursor-pointer"
                            >
                              {b('অপসারণ', 'Remove', lang)}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Handover Record */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" />
              {b('দায়িত্ব হস্তান্তর রেকর্ড (Handover Record)', 'Official Admin Handover Record', lang)}
            </h3>
            {(!school.handoverHistory || school.handoverHistory.length === 0) ? (
              <p className="text-slate-500">{b('এখনো কোনো দায়িত্ব হস্তান্তর রেকর্ড নেই।', 'No handover events recorded yet.', lang)}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <th className="py-2 px-3 font-semibold">{b('তারিখ', 'Date', lang)}</th>
                      <th className="py-2 px-3 font-semibold">{b('ধরন', 'Action', lang)}</th>
                      <th className="py-2 px-3 font-semibold">{b('পূর্ববর্তী → নতুন Admin', 'From → To', lang)}</th>
                      <th className="py-2 px-3 font-semibold">{b('হস্তান্তর নোট', 'Handover Note', lang)}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {school.handoverHistory.map((h) => (
                      <tr key={h.id}>
                        <td className="py-2.5 px-3 tabular-nums text-slate-500">{h.date}</td>
                        <td className="py-2.5 px-3 font-semibold text-blue-700 dark:text-blue-400">{h.actionType}</td>
                        <td className="py-2.5 px-3 font-medium">{h.previousAdminName} → <span className="font-bold">{h.newAdminName}</span></td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{h.handoverNote}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: APPROVAL HISTORY */}
      {subTab === 'approval_history' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            {b('School Profile → Approval History (অনুমোদন ও পরিবর্তন ইতিহাস)', 'School Profile → Approval History', lang)}
          </h2>
          {(!school.approvalHistory || school.approvalHistory.length === 0) ? (
            <p className="text-slate-500">{b('কোনো অনুমোদন ইতিহাস নেই।', 'No approval history records yet.', lang)}</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {school.approvalHistory.map((item) => (
                <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900 dark:text-white">{item.action}</div>
                    <div className="text-slate-500">{item.actor} · <span className="tabular-nums">{item.date}</span></div>
                    {item.note && <div className="text-slate-700 dark:text-slate-300">{item.note}</div>}
                  </div>
                  <div className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 shrink-0">
                    {item.fromStatus} → {item.toStatus}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: DOCUMENTS & PREVIOUS APPLICATIONS */}
      {subTab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-700" />
              {b('জমাকৃত নথিপত্র (Documents)', 'Submitted Documents', lang)}
            </h2>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {school.documents.map((doc) => (
                <li key={doc} className="py-2.5 flex items-center justify-between">
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{doc}</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Verified File</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {b('পূর্ববর্তী আবেদনসমূহ (Previous Applications)', 'Previous Applications', lang)}
            </h2>
            {(!school.previousApplications || school.previousApplications.length === 0) ? (
              <p className="text-slate-500">{b('প্রাথমিক নিবন্ধন ছাড়া কোনো পূর্ববর্তী আবেদন নেই।', 'Initial onboarding application only.', lang)}</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {school.previousApplications.map((app) => (
                  <li key={app.id} className="py-2.5 space-y-0.5">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-slate-900 dark:text-white">{app.type}</span>
                      <span className="text-emerald-700 dark:text-emerald-400">{app.status}</span>
                    </div>
                    <div className="text-slate-500 tabular-nums">{app.id} · {app.submittedDate}</div>
                    <div className="text-slate-600 dark:text-slate-300">{app.summary}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: INSPECTION HISTORY */}
      {subTab === 'inspections' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-emerald-700" />
              {b('বিদ্যালয় পরিদর্শন ইতিহাস (Inspection History)', 'School Inspection History', lang)}
            </h2>
            <button
              type="button"
              onClick={onOpenInspectionModal}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
            >
              + {b('নতুন পরিদর্শন রিপোর্ট', 'Record Inspection', lang)}
            </button>
          </div>
          {(!school.inspectionHistory || school.inspectionHistory.length === 0) ? (
            <p className="text-slate-500">{b('এখনো কোনো পরিদর্শন রিপোর্ট যুক্ত হয়নি।', 'No inspection reports logged yet.', lang)}</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {school.inspectionHistory.map((insp) => (
                <div key={insp.id} className="py-3 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{insp.inspectorName}</span>
                    <span className="font-mono text-slate-500">{insp.reportRef ?? insp.id} · {insp.date}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">{insp.findings}</p>
                  <div className="font-semibold text-blue-700 dark:text-blue-400">
                    Recommendation: {insp.recommendation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 6: IMMUTABLE ACTIVITY HISTORY (AUDIT LOGS) */}
      {subTab === 'activity' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 text-xs">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {b('বিদ্যালয়ের অপরিবর্তনীয় Activity History ও Audit Log', 'Immutable School Activity History & Audit Log', lang)}
            </h2>
            <p className="text-slate-500 mt-0.5">
              {b(
                'দায়িত্ব হস্তান্তর বা পুরনো School Admin অপসারণ হলেও পূর্বের সকল কার্যক্রম এখানে স্থায়ীভাবে সংরক্ষিত থাকে।',
                'All past and current admin activities remain permanently preserved here even after admin replacement or removal.',
                lang
              )}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                  <th className="py-2 px-3 font-semibold">Who</th>
                  <th className="py-2 px-3 font-semibold">When</th>
                  <th className="py-2 px-3 font-semibold">Action</th>
                  <th className="py-2 px-3 font-semibold">Old → New</th>
                  <th className="py-2 px-3 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {schoolAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-500">
                      {b('কোনো অডিট লগ পাওয়া যায়নি।', 'No audit logs found for this school.', lang)}
                    </td>
                  </tr>
                ) : (
                  schoolAuditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{log.who}</td>
                      <td className="py-2.5 px-3 tabular-nums text-slate-500 whitespace-nowrap">{log.when}</td>
                      <td className="py-2.5 px-3 font-medium">{log.what}</td>
                      <td className="py-2.5 px-3 tabular-nums">{log.oldValue} → <span className="font-semibold text-blue-700 dark:text-blue-400">{log.newValue}</span></td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{log.reason ?? '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
