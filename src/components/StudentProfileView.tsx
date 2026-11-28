import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ArrowRightLeft,
  Award,
  Bell,
  Building2,
  Camera,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit3,
  FileBarChart2,
  FileCheck2,
  FileText,
  History,
  Info,
  PauseCircle,
  Printer,
  QrCode,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
} from 'lucide-react';
import type {
  AuditLogEntry,
  Language,
  NotificationItem,
  PermissionKey,
  Role,
  SchoolRecord,
  StudentAttendanceHistoryEntry,
  StudentChangeRequest,
  StudentRecord,
  StudentStatus,
} from '../types';
import { AVATARS } from '../data/mockData';
import { calculateBMI } from '../utils/rbacAndGrading';
import { deriveVerificationStatus } from '../utils/governanceAndVerification';
import { sanitizeActorDisplayForRole } from '../utils/adminAndTeacherIdentityEngine';
import { b } from '../i18n/translations';
import { TrendLineChart } from './Charts';
import { StudentQrIdCardPanel } from './StudentQrIdCardPanel';

export type StudentProfileSubTab =
  | 'overview'
  | 'academic'
  | 'school_info'
  | 'documents'
  | 'approval_history'
  | 'activity_notices';

interface StudentProfileViewProps {
  student: StudentRecord;
  school?: SchoolRecord;
  actorRole: Role;
  lang: Language;
  initialSubTab?: StudentProfileSubTab;
  studentRequests: StudentChangeRequest[];
  auditLogs: AuditLogEntry[];
  notifications: NotificationItem[];
  hasPermission?: (key: PermissionKey) => boolean;
  onBack: () => void;
  onOpenEdit: () => void;
  onOpenTransfer: () => void;
  onOpenNotice: () => void;
  onOpenSuspendDeactivate: (mode: 'suspend' | 'deactivate') => void;
  onUpdateStatus: (studentId: string, status: StudentStatus, reason: string) => void;
  onVerifyDocument: (studentId: string, docId: string, verified: boolean) => void;
  onProcessRequest: (
    reqId: string,
    decision: 'approved' | 'rejected' | 'under_review' | 'pending',
    note: string
  ) => void;
  onVerifyStudent?: (studentId: string, note: string) => void;
  onReissueStudentId?: (studentId: string) => void;
  onOpenStudentReport?: (student: StudentRecord) => void;
  onInspectStudent?: (student: StudentRecord) => void;
  onEditStudentPhoto?: (student: StudentRecord) => void;
  attendanceHistory?: StudentAttendanceHistoryEntry[];
}

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({
  student,
  school,
  actorRole,
  lang,
  initialSubTab = 'overview',
  studentRequests,
  auditLogs,
  notifications,
  hasPermission,
  onBack,
  onOpenEdit,
  onOpenTransfer,
  onOpenNotice,
  onOpenSuspendDeactivate,
  onUpdateStatus,
  onVerifyDocument,
  onProcessRequest,
  onVerifyStudent,
  onReissueStudentId,
  onOpenStudentReport,
  onInspectStudent,
  onEditStudentPhoto,
  attendanceHistory = [],
}) => {
  const [subTab, setSubTab] = useState<StudentProfileSubTab>(initialSubTab);
  const bmi = calculateBMI(student.heightCm, student.weightKg);
  const studentAttendanceLogs = attendanceHistory.filter((h) => h.studentId === student.id);

  useEffect(() => {
    const cleanup = () => {
      document.body.classList.remove('printing-attendance-report');
    };
    window.addEventListener('afterprint', cleanup);
    return () => {
      window.removeEventListener('afterprint', cleanup);
      cleanup();
    };
  }, []);

  const handlePrintAttendanceReport = () => {
    document.body.classList.remove('printing-student-id-card', 'printing-qr-stickers', 'printing-exam-pdf-report');
    document.body.classList.add('printing-attendance-report');
    setTimeout(() => {
      window.print();
    }, 60);
  };

  const can = (k: PermissionKey) => (hasPermission ? hasPermission(k) : true);
  const verificationStatus = deriveVerificationStatus(student);
  const canApproveRegistration = actorRole === 'school_admin' && can('student:approve');
  const myRequests = studentRequests.filter((r) => r.studentId === student.id);
  const myAuditLogs = auditLogs.filter(
    (l) => l.studentId === student.id || l.targetName.includes(student.permanentId)
  );
  const myNotifications = notifications.filter((n) => n.studentId === student.id);

  const tabs: { id: StudentProfileSubTab; labelBn: string; labelEn: string }[] = [
    { id: 'overview', labelBn: 'সম্পূর্ণ প্রোফাইল (৮টি বিভাগ)', labelEn: 'Complete Profile (8 Sections)' },
    { id: 'academic', labelBn: 'একাডেমিক ও শ্রেণি তথ্য', labelEn: 'Academic & Class Info' },
    { id: 'school_info', labelBn: 'বিদ্যালয় ও বদলির ইতিহাস', labelEn: 'School & Transfer History' },
    { id: 'documents', labelBn: 'ডকুমেন্ট ও যাচাই', labelEn: 'Documents & Verify' },
    { id: 'approval_history', labelBn: 'অনুমোদন ও পরিবর্তনের ইতিহাস', labelEn: 'Approval & Change History' },
    { id: 'activity_notices', labelBn: 'অ্যাক্টিভিটি ও নোটিশ', labelEn: 'Activity & Notices' },
  ];

  const statusTone =
    student.status === 'active'
      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
      : student.status === 'pending' || student.status === 'under_review'
        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
        : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';

  const verifyTone =
    verificationStatus === 'verified'
      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
      : verificationStatus === 'flagged'
        ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';

  return (
    <div className="space-y-5">
      {/* Top Action Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={onBack}
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              {b('তালিকায় ফিরুন', 'Back', lang)}
            </button>
            <div className="relative shrink-0">
              <img
                src={student.photoUrl ?? AVATARS.studentRahim}
                alt={student.nameEn}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              />
              {onEditStudentPhoto && (
                <button
                  type="button"
                  onClick={() => onEditStudentPhoto(student)}
                  title={b('ছবি পরিবর্তন / ক্রপ', 'Edit / Crop Photo', lang)}
                  className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-blue-700 hover:bg-blue-800 text-white border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-sm cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                </button>
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">{student.nameBn}</h1>
                <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${statusTone}`}>
                  Status: {student.status}
                </span>
                <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${verifyTone}`}>
                  Verify: {verificationStatus}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {student.nameEn} · {student.gender === 'Male' ? b('ছাত্র', 'Boy', lang) : b('ছাত্রী', 'Girl', lang)} · {student.className} ({student.section}) · Roll {student.roll}
              </div>
              <div className="text-xs font-mono text-blue-700 dark:text-blue-400 mt-0.5">
                ID: {student.permanentId} · {student.schoolNameBn} ({student.schoolId})
                {student.digitalIdSerial ? ` · Card: ${student.digitalIdSerial}` : ''}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onInspectStudent && (
              <button
                type="button"
                onClick={() => onInspectStudent(student)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white whitespace-nowrap cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 shrink-0" />
                {b('Quick Modal (TC ও QR ID)', 'Quick Actions Modal (TC / ID)', lang)}
              </button>
            )}
            {can('student:edit') && (
              <button
                type="button"
                onClick={onOpenEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                {b('সম্পাদনা (Edit)', 'Edit', lang)}
              </button>
            )}
            {can('student:verify') && onVerifyStudent && verificationStatus !== 'verified' && (
              <button
                type="button"
                onClick={() => onVerifyStudent(student.id, b('শিক্ষার্থীর তথ্য ও জন্মনিবন্ধন যাচাইকৃত', 'Student identity & birth reg verified', lang))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white whitespace-nowrap cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                {b('যাচাই (Verify)', 'Verify', lang)}
              </button>
            )}
            {can('student:transfer') && (
              <button
                type="button"
                onClick={onOpenTransfer}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 whitespace-nowrap cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
                {b('বিদ্যালয় পরিবর্তন', 'Transfer', lang)}
              </button>
            )}
            {can('student:notice') && (
              <button
                type="button"
                onClick={onOpenNotice}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/30 whitespace-nowrap cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 shrink-0" />
                {b('নোটিশ', 'Notice', lang)}
              </button>
            )}
            {can('student:reissue_id') && onReissueStudentId && (
              <button
                type="button"
                onClick={() => onReissueStudentId(student.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 whitespace-nowrap cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5 shrink-0" />
                {b('Re-issue ID', 'Re-issue ID', lang)}
              </button>
            )}
            {can('student:reports') && onOpenStudentReport && (
              <button
                type="button"
                onClick={() => onOpenStudentReport(student)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
              >
                <FileBarChart2 className="w-3.5 h-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                {b('Reports', 'Reports', lang)}
              </button>
            )}
            {(student.status === 'suspended' || student.status === 'deactivated' || student.status === 'archived') &&
            (can('student:restore') || can('student:approve')) ? (
              <button
                type="button"
                onClick={() => onUpdateStatus(student.id, 'active', b('সক্রিয় পুনর্বহাল / Restore', 'Restored to active', lang))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                {b('Restore / সক্রিয়', 'Restore', lang)}
              </button>
            ) : (
              <>
                {can('student:suspend') && student.status !== 'deactivated' && student.status !== 'archived' && (
                  <button
                    type="button"
                    onClick={() => onOpenSuspendDeactivate('suspend')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 whitespace-nowrap cursor-pointer"
                  >
                    <PauseCircle className="w-3.5 h-3.5 shrink-0" />
                    {b('Suspend', 'Suspend', lang)}
                  </button>
                )}
                {can('student:deactivate') && student.status !== 'deactivated' && student.status !== 'archived' && (
                  <button
                    type="button"
                    onClick={() => onOpenSuspendDeactivate('deactivate')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 whitespace-nowrap cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    {b('Deactivate', 'Deactivate', lang)}
                  </button>
                )}
              </>
            )}
            {can('student:delete_archive') && student.status !== 'archived' && (
              <button
                type="button"
                onClick={() =>
                  onUpdateStatus(
                    student.id,
                    'archived',
                    b('শিক্ষার্থী প্রোফাইল আর্কাইভ করা হয়েছে (Restore-যোগ্য)', 'Student profile archived (recoverable)', lang)
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 whitespace-nowrap cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                {b('Delete/Archive', 'Delete/Archive', lang)}
              </button>
            )}
            <button
              type="button"
              data-testid="print-student-attendance-report-btn"
              onClick={handlePrintAttendanceReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              {b('হাজিরা রিপোর্ট প্রিন্ট (A4)', 'Print Attendance (A4)', lang)}
            </button>
          </div>
        </div>

        {/* School Admin vs Central Admin Admission Boundary Banner */}
        {(student.status === 'pending' || student.status === 'under_review') && (
          <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
              <Info className="w-4 h-4 shrink-0" />
              <span>
                {actorRole === 'school_admin'
                  ? b(
                      'নতুন শিক্ষার্থী নিবন্ধন আবেদন: ডকুমেন্ট যাচাই করে Approve / Pending / Reject সিদ্ধান্ত দিন।',
                      'New Student Registration Application: Verify documents and Approve, Hold Pending, or Reject.',
                      lang
                    )
                  : b(
                      'ভর্তি অনুমোদন নিয়ম: নতুন শিক্ষার্থী ভর্তি যাচাই ও অনুমোদন সংশ্লিষ্ট School Admin সম্পন্ন করবেন (Central Admin সরাসরি ভর্তি অনুমোদন করে না)।',
                      'Admission Governance Rule: Initial student registration verification & approval is performed by the School Admin.',
                      lang
                    )}
              </span>
            </div>
            {canApproveRegistration && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onUpdateStatus(student.id, 'active', b('স্কুল এডমিন কর্তৃক ভর্তি অনুমোদিত', 'Admission approved by School Admin', lang))}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold whitespace-nowrap cursor-pointer"
                >
                  {b('Approve (অনুমোদন)', 'Approve', lang)}
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStatus(student.id, 'under_review', b('নথি পর্যালোচনায় রাখা হয়েছে', 'Moved to under review', lang))}
                  className="px-3 py-1.5 rounded-lg border border-blue-300 text-blue-800 dark:text-blue-200 font-semibold whitespace-nowrap cursor-pointer"
                >
                  {b('Pending / Review', 'Pending / Review', lang)}
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStatus(student.id, 'rejected', b('অসম্পূর্ণ বা ভুল তথ্যের কারণে প্রত্যাখ্যাত', 'Rejected due to incomplete documents', lang))}
                  className="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 dark:text-red-400 font-semibold whitespace-nowrap cursor-pointer"
                >
                  {b('Reject (প্রত্যাখ্যান)', 'Reject', lang)}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Sub-tab Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200 dark:border-slate-800 pt-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                subTab === t.id
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {b(t.labelBn, t.labelEn, lang)}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-tab 1: All 8 Required Student Profile Sections + Printable Digital QR ID */}
      {subTab === 'overview' && (
        <div className="space-y-5 text-xs">
          <StudentQrIdCardPanel lang={lang} student={student} school={school} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 1. Personal Information */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('১. ব্যক্তিগত তথ্য (Personal Information)', '1. Personal Information', lang)}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-slate-500">{b('বাংলা ও ইংরেজি নাম', 'Full Name (BN / EN)', lang)}</div>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">{student.nameBn}</div>
                  <div className="text-slate-600 dark:text-slate-300">{student.nameEn}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-slate-500">{b('জন্মতারিখ ও জন্মনিবন্ধন', 'DOB & Birth Registration No.', lang)}</div>
                  <div className="font-semibold text-slate-900 dark:text-white mt-0.5">{student.dob}</div>
                  <div className="font-mono text-slate-600 dark:text-slate-300">{student.birthRegNo}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-slate-500">{b('লিঙ্গ ও রক্তের গ্রুপ', 'Gender & Blood Group', lang)}</div>
                  <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                    {student.gender === 'Male' ? b('ছাত্র (Male)', 'Boy (Male)', lang) : b('ছাত্রী (Female)', 'Girl (Female)', lang)} · <span className="text-red-600 dark:text-red-400">{student.bloodGroup}</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-slate-500">{b('ঠিকানা', 'Address', lang)}</div>
                  <div className="font-medium text-slate-900 dark:text-white mt-0.5">
                    {student.address ?? school?.fullAddress ?? '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Digital QR ID & Health Summary */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {b('ডিজিটাল QR আইডি ও স্বাস্থ্য', 'Digital QR ID & Health', lang)}
                </h2>
                <QrCode className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <QrCode className="w-14 h-14 text-slate-900 dark:text-white shrink-0" />
                <div className="text-xs space-y-1 min-w-0">
                  <div className="font-mono font-bold text-blue-700 dark:text-blue-400 truncate">{student.permanentId}</div>
                  <div className="font-mono text-slate-500 truncate">GLC: {student.guardianLinkCode}</div>
                  <div className="font-mono text-emerald-700 dark:text-emerald-400 truncate">ACT: {student.activationCode}</div>
                  {student.digitalIdSerial && (
                    <div className="font-mono text-indigo-700 dark:text-indigo-400 truncate">Card: {student.digitalIdSerial}</div>
                  )}
                </div>
              </div>
              <div className="text-xs space-y-1.5 border-t border-slate-200 dark:border-slate-800 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">{b('উচ্চতা / ওজন:', 'Height / Weight:', lang)}</span>
                  <span className="tabular-nums font-medium">{student.heightCm} cm · {student.weightKg} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">BMI:</span>
                  <span className="tabular-nums font-medium">{bmi.bmi} ({b(bmi.categoryBn, bmi.categoryEn, lang)})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{b('উপবৃত্তি:', 'Stipend:', lang)}</span>
                  <span className="font-semibold">{student.stipendStatus}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 2. Academic Information */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('২. একাডেমিক তথ্য (Academic Info)', '2. Academic Information', lang)}
              </h3>
              <div className="space-y-1 text-slate-600 dark:text-slate-300">
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('ফলাফল:', 'Exam Result:', lang)}</span> {student.examResultLabel ?? student.gpa ?? '4.80 (A)'}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('উপস্থিতি:', 'Attendance:', lang)}</span> <span className="tabular-nums font-bold text-emerald-700 dark:text-emerald-400">{student.attendancePct}%</span></div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('যাচাই:', 'Verification:', lang)}</span> {verificationStatus}</div>
              </div>
            </div>

            {/* 3. Guardian Information */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('৩. অভিভাবকের তথ্য (Guardian Info)', '3. Guardian Information', lang)}
              </h3>
              <div className="space-y-1 text-slate-600 dark:text-slate-300">
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('পিতা:', 'Father:', lang)}</span> {student.fatherName}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('মাতা:', 'Mother:', lang)}</span> {student.motherName}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('মোবাইল:', 'Mobile:', lang)}</span> <span className="font-mono">{student.guardianMobile}</span></div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('জরুরি:', 'Emergency:', lang)}</span> <span className="font-mono">{student.emergencyContact ?? student.guardianMobile}</span></div>
              </div>
            </div>

            {/* 4. School Information */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('৪. বিদ্যালয় তথ্য (School Info)', '4. School Information', lang)}
              </h3>
              <div className="space-y-1 text-slate-600 dark:text-slate-300">
                <div className="font-semibold text-slate-900 dark:text-white">{student.schoolNameBn}</div>
                <div className="font-mono">Code: {student.schoolId} {school ? `· EIIN: ${school.eiin}` : ''}</div>
                {school && <div>{school.upazila}, {school.district}</div>}
              </div>
            </div>

            {/* 5. Class Information */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('৫. শ্রেণি তথ্য (Class Info)', '5. Class Information', lang)}
              </h3>
              <div className="space-y-1 text-slate-600 dark:text-slate-300">
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('শ্রেণি:', 'Class:', lang)}</span> {student.className}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('শাখা (Section):', 'Section:', lang)}</span> {student.section}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('রোল নম্বর:', 'Roll:', lang)}</span> <span className="tabular-nums font-bold">#{student.roll}</span></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 6. Academic History */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('৬. একাডেমিক ইতিহাস (Academic History)', '6. Academic History', lang)}
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                {student.academicSummary ?? b('নিয়মিত শ্রেণি উন্নয়ন ও মূল্যায়ন রেকর্ড সক্রিয়।', 'Consistent class progression & evaluation record.', lang)}
              </p>
              <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                {student.admissionHistory.slice(0, 3).map((item, idx) => (
                  <li key={idx}>• {item}</li>
                ))}
              </ul>
            </div>

            {/* 7. Transfer History */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('৭. বদলি ইতিহাস (Transfer History)', '7. Transfer History', lang)}
              </h3>
              {(student.previousSchools ?? []).length === 0 ? (
                <p className="text-slate-500">{b('পূর্ববর্তী কোনো বিদ্যালয় বদলির রেকর্ড নেই।', 'No previous school transfers logged.', lang)}</p>
              ) : (
                <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                  {student.previousSchools!.map((ps, idx) => (
                    <li key={idx}>• {ps}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* 8. Activity History */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('৮. অ্যাক্টিভিটি ইতিহাস (Activity History)', '8. Activity History', lang)}
              </h3>
              {(student.approvalHistory ?? []).length === 0 && myAuditLogs.length === 0 ? (
                <p className="text-slate-500">{b('সাম্প্রতিক কোনো অ্যাক্টিভিটি এন্ট্রি নেই।', 'No recent activity entries.', lang)}</p>
              ) : (
                <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                  {(student.approvalHistory ?? []).slice(0, 3).map((h) => (
                    <li key={h.id}>
                      • {b(h.actionTitleBn, h.actionTitleEn, lang)} ({h.date})
                    </li>
                  ))}
                  {myAuditLogs.slice(0, 2).map((l) => (
                    <li key={l.id}>
                      • {l.what} — {l.when}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Academic Info */}
      {subTab === 'academic' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 text-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              {b('একাডেমিক তথ্য ও ফলাফল', 'Academic Information & Results', lang)}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <div className="text-slate-500">{b('শ্রেণি (Class)', 'Class', lang)}</div>
                <div className="text-base font-bold mt-0.5">{student.className}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <div className="text-slate-500">{b('শাখা ও রোল (Section / Roll)', 'Section & Roll', lang)}</div>
                <div className="text-base font-bold tabular-nums mt-0.5">{student.section} · #{student.roll}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <div className="text-slate-500">{b('সর্বশেষ GPA / গ্রেড', 'Latest GPA / Grade', lang)}</div>
                <div className="text-base font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{student.gpa ?? '4.80 (A)'}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <div className="text-slate-500">{b('উপস্থিতির হার', 'Attendance Rate', lang)}</div>
                <div className="text-base font-bold tabular-nums mt-0.5">{student.attendancePct}%</div>
              </div>
            </div>
            {student.academicSummary && (
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                {student.academicSummary}
              </div>
            )}
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              {b('ধারাবাহিক পরীক্ষার অগ্রগতি', 'Exam Progress Trend', lang)}
            </h2>
            <TrendLineChart
              points={[
                { label: '১ম সাময়িক', value: 78 },
                { label: '২য় সাময়িক', value: 84 },
                { label: 'অর্ধ-বার্ষিক', value: 87 },
                { label: '৩য় সাময়িক', value: 90 },
              ]}
            />
          </div>
        </div>
      )}

      {/* Sub-tab 3: School Info & Transfer History */}
      {subTab === 'school_info' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              {b('বর্তমান ও পূর্বের বিদ্যালয়ের তথ্য (School Info)', 'Current & Previous School Info', lang)}
            </h2>
            <button
              type="button"
              onClick={onOpenTransfer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-semibold cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              {b('বিদ্যালয় পরিবর্তন করুন', 'Transfer School', lang)}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-1.5">
              <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                {b('বর্তমান অধ্যয়নরত বিদ্যালয়', 'Current School', lang)}
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">{student.schoolNameBn}</div>
              <div className="font-mono text-slate-500">Code: {student.schoolId} {school ? `· EIIN: ${school.eiin}` : ''}</div>
              {school && (
                <div className="text-slate-600 dark:text-slate-300">
                  {school.division} › {school.district} › {school.upazila} · {school.fullAddress}
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-[11px] font-semibold text-slate-500">
                {b('পূর্বের বিদ্যালয়ের তথ্য (Previous Schools)', 'Previous Schools', lang)}
              </div>
              {(student.previousSchools ?? []).length === 0 ? (
                <p className="text-slate-500">{b('পূর্বের কোনো বিদ্যালয়ের রেকর্ড নেই।', 'No previous school records.', lang)}</p>
              ) : (
                <ul className="space-y-1.5">
                  {student.previousSchools!.map((ps, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{ps}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
            <div className="font-bold text-slate-900 dark:text-white mb-2">
              {b('ভর্তি ও স্থানান্তরের ধারাবাহিক ইতিহাস', 'Admission & Transfer History', lang)}
            </div>
            <ul className="space-y-1.5">
              {student.admissionHistory.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Sub-tab 4: Documents & Verification */}
      {subTab === 'documents' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              {b('শিক্ষার্থীর ডকুমেন্ট ও যাচাই (Documents & Verification)', 'Student Documents & Verification', lang)}
            </h2>
            <span className="text-slate-500">
              {b('মোট নথি:', 'Documents:', lang)} {(student.documents ?? []).length}
            </span>
          </div>

          {(student.documents ?? []).length === 0 ? (
            <p className="text-slate-500 py-4">{b('কোনো নথি সংযুক্ত নেই।', 'No documents uploaded.', lang)}</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(student.documents ?? []).map((doc) => (
                <div key={doc.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{doc.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {doc.docRef ? `Ref: ${doc.docRef} · ` : ''}
                        {doc.verified
                          ? b(
                              `যাচাইকৃত: ${sanitizeActorDisplayForRole(doc.verifiedBy ?? 'Admin', actorRole)} (${doc.verifiedAt ?? ''})`,
                              `Verified by ${sanitizeActorDisplayForRole(doc.verifiedBy ?? 'Admin', actorRole)}`,
                              lang
                            )
                          : b('যাচাই অপেক্ষমান (Unverified)', 'Pending Verification', lang)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${
                        doc.verified
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {doc.verified ? b('Verified', 'Verified', lang) : b('Pending', 'Pending', lang)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onVerifyDocument(student.id, doc.id, !doc.verified)}
                      className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {doc.verified ? b('যাচাই বাতিল', 'Unverify', lang) : b('নথি যাচাই করুন', 'Verify Doc', lang)}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 5: Approval History & Profile Change Requests */}
      {subTab === 'approval_history' && (
        <div className="space-y-4 text-xs">
          {myRequests.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                {b('চলমান আবেদন ও গুরুত্বপূর্ণ প্রোফাইল পরিবর্তন অনুরোধ', 'Pending Applications & Important Change Requests', lang)}
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {myRequests.map((req) => {
                  const isAdmissionGateBlocked =
                    req.category === 'new_registration' && actorRole === 'central_admin';
                  return (
                    <div key={req.id} className="py-3 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {b(req.titleBn, req.titleEn, lang)} ({req.id})
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {req.currentValue} → <span className="font-semibold text-blue-700 dark:text-blue-400">{req.proposedValue}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{req.reason} · {req.submittedAt}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-semibold">
                          {req.status}
                        </span>
                        {(req.status === 'pending' || req.status === 'under_review') && !isAdmissionGateBlocked && (
                          <>
                            <button
                              type="button"
                              onClick={() => onProcessRequest(req.id, 'approved', b('তথ্য যাচাই করে অনুমোদিত', 'Verified & approved', lang))}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                            >
                              {b('Approve', 'Approve', lang)}
                            </button>
                            <button
                              type="button"
                              onClick={() => onProcessRequest(req.id, 'rejected', b('যাচাইয়ে অসংগতি থাকায় প্রত্যাখ্যাত', 'Rejected after review', lang))}
                              className="px-2.5 py-1 rounded-lg border border-red-200 text-red-700 dark:text-red-400 font-semibold cursor-pointer"
                            >
                              {b('Reject', 'Reject', lang)}
                            </button>
                          </>
                        )}
                        {isAdmissionGateBlocked && (
                          <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                            {b('School Admin অনুমোদন করবেন', 'School Admin handles admission', lang)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              {b('অনুমোদন ও প্রোফাইল পরিবর্তনের ইতিহাস (Approval History)', 'Immutable Approval & Change History', lang)}
            </h2>
            {(student.approvalHistory ?? []).length === 0 ? (
              <p className="text-slate-500">{b('কোনো অনুমোদন ইতিহাস নেই।', 'No approval history recorded yet.', lang)}</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {(student.approvalHistory ?? []).map((item) => (
                  <div key={item.id} className="py-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {b(item.actionTitleBn, item.actionTitleEn, lang)}
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        {item.fromValue} → <span className="font-semibold">{item.toValue}</span>
                      </div>
                      {item.note && <div className="text-[11px] text-slate-500 mt-0.5">{item.note}</div>}
                    </div>
                    <div className="text-right text-[11px] text-slate-500 shrink-0">
                      <div className="font-semibold text-slate-700 dark:text-slate-300">
                        {sanitizeActorDisplayForRole(item.actor, actorRole)}
                      </div>
                      <div className="font-mono">{item.date} · {item.decision}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-tab 6: Activity, Audit Log & Notices */}
      {subTab === 'activity_notices' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-sky-700 dark:text-sky-400" />
                {b('শিক্ষার্থীর প্রাপ্ত নোটিশ ও সতর্কতা', 'Student Notices & Alerts', lang)}
              </h2>
              <button
                type="button"
                onClick={onOpenNotice}
                className="px-2.5 py-1 rounded-lg bg-sky-700 hover:bg-sky-800 text-white font-semibold cursor-pointer"
              >
                {b('নতুন নোটিশ', 'Send Notice', lang)}
              </button>
            </div>
            {myNotifications.length === 0 ? (
              <p className="text-slate-500">{b('এই শিক্ষার্থীর জন্য নির্দিষ্ট কোনো নোটিশ নেই।', 'No student-specific alerts.', lang)}</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {myNotifications.map((n) => (
                  <div key={n.id} className="py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white">{b(n.titleBn, n.titleEn, lang)}</span>
                      <span className="text-[11px] text-slate-400">{n.time}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">{b(n.messageBn, n.messageEn, lang)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              {b('শিক্ষার্থীর প্রশাসনিক অ্যাক্টিভিটি / অডিট লগ', 'Student Activity & Audit Log', lang)}
            </h2>
            {myAuditLogs.length === 0 ? (
              <p className="text-slate-500">{b('এই শিক্ষার্থীর কোনো অডিট এন্ট্রি নেই।', 'No audit entries yet.', lang)}</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {myAuditLogs.map((log) => (
                  <div key={log.id} className="py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white">{log.what}</span>
                      <span className="text-[11px] font-mono text-slate-400">{log.when}</span>
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      {log.oldValue} → {log.newValue} ({sanitizeActorDisplayForRole(log.who, actorRole)})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {typeof document !== 'undefined' &&
        createPortal(
          <div className="hidden attendance-report-print-portal">
            <div className="p-6 bg-white text-slate-900 space-y-5 text-xs">
              <div className="border-b border-slate-300 pb-3 flex items-start justify-between">
                <div>
                  <h1 className="text-lg font-bold">{school?.nameBn ?? student.schoolNameBn}</h1>
                  <div className="text-slate-600">{school?.nameEn ?? student.schoolNameEn ?? ''}</div>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">School Code: {school?.code ?? student.schoolId}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm">STUDENT ATTENDANCE REPORT (A4)</div>
                  <div className="font-mono text-[11px] text-slate-600">Printed: {new Date().toISOString().slice(0, 10)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border border-slate-300 rounded-lg p-3">
                <div><span className="text-slate-500">Student Name:</span> <strong className="block">{student.nameBn}</strong></div>
                <div><span className="text-slate-500">Unique ID:</span> <strong className="block font-mono">{student.permanentId}</strong></div>
                <div><span className="text-slate-500">Class / Section:</span> <strong className="block">{student.className} ({student.section}) · Roll #{student.roll}</strong></div>
                <div><span className="text-slate-500">Attendance Rate:</span> <strong className="block text-emerald-700">{student.attendancePct}%</strong></div>
              </div>

              <table className="w-full border-collapse border border-slate-300 text-left">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 px-3 py-2">Date</th>
                    <th className="border border-slate-300 px-3 py-2">Status</th>
                    <th className="border border-slate-300 px-3 py-2">Scan Time</th>
                    <th className="border border-slate-300 px-3 py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {studentAttendanceLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="border border-slate-300 px-3 py-4 text-center text-slate-500">
                        No scan history recorded yet. Overall recorded attendance: {student.attendancePct}%.
                      </td>
                    </tr>
                  ) : (
                    studentAttendanceLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="border border-slate-300 px-3 py-1.5 font-mono">{log.dateIso}</td>
                        <td className="border border-slate-300 px-3 py-1.5 font-semibold uppercase">{log.status}</td>
                        <td className="border border-slate-300 px-3 py-1.5 font-mono">{log.scanTime ?? '—'}</td>
                        <td className="border border-slate-300 px-3 py-1.5">{log.source}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
