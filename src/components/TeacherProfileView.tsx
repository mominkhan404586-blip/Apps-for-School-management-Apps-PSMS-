import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Bell,
  BookOpen,
  Briefcase,
  Camera,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Edit3,
  FileBarChart2,
  FileText,
  History,
  LayoutDashboard,
  PauseCircle,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import type {
  AuditLogEntry,
  Language,
  NotificationItem,
  PermissionKey,
  RoutineSlot,
  StudentRecord,
  TeacherApprovalCategory,
  TeacherRecord,
  TeacherStatus,
} from '../types';
import { b } from '../i18n/translations';
import {
  deriveTeacherApprovalStatus,
  TEACHER_APPROVAL_CATEGORIES,
} from '../utils/teacherLifecycle';
import { deriveVerificationStatus } from '../utils/governanceAndVerification';
import type { ConfirmDialogState } from './Modals';

export type TeacherProfileSubTab =
  | 'overview'
  | 'approval_history'
  | 'workflows'
  | 'dashboard_visit'
  | 'activity';

interface TeacherProfileViewProps {
  teacher: TeacherRecord;
  initialSubTab?: TeacherProfileSubTab;
  lang: Language;
  routineSlots: RoutineSlot[];
  students: StudentRecord[];
  notifications: NotificationItem[];
  auditLogs: AuditLogEntry[];
  hasPermission?: (key: PermissionKey) => boolean;
  onBack: () => void;
  onOpenConfirm: (cfg: Omit<ConfirmDialogState, 'open'>) => void;
  onOpenEditModal: (teacher: TeacherRecord) => void;
  onOpenNoticeModal: (teacher: TeacherRecord) => void;
  onOpenWorkflowModal: (teacher: TeacherRecord, category?: TeacherApprovalCategory) => void;
  onUpdateTeacherStatus: (teacherId: string, status: TeacherStatus, reason: string) => void;
  onVerifyTeacher?: (teacherId: string, note: string) => void;
  onReissueTeacherId?: (teacherId: string) => void;
  onOpenTeacherReport?: (teacher: TeacherRecord) => void;
  onEditTeacherPhoto?: (teacher: TeacherRecord) => void;
}

export const TeacherProfileView: React.FC<TeacherProfileViewProps> = ({
  teacher,
  initialSubTab = 'overview',
  lang,
  routineSlots,
  students,
  notifications,
  auditLogs,
  hasPermission,
  onBack,
  onOpenConfirm,
  onOpenEditModal,
  onOpenNoticeModal,
  onOpenWorkflowModal,
  onUpdateTeacherStatus,
  onVerifyTeacher,
  onReissueTeacherId,
  onOpenTeacherReport,
  onEditTeacherPhoto,
}) => {
  const [subTab, setSubTab] = useState<TeacherProfileSubTab>(initialSubTab);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab, teacher.id]);

  const can = (k: PermissionKey) => (hasPermission ? hasPermission(k) : true);
  const approvalStatus = deriveTeacherApprovalStatus(teacher);
  const verificationStatus = deriveVerificationStatus(teacher);
  const teacherRoutine = routineSlots.filter(
    (r) => r.teacherId === teacher.id || teacher.schoolId === 'GPS-1042' && r.subjectBn === teacher.subjects[0]
  );
  const schoolStudents = students.filter((s) => s.schoolId === teacher.schoolId);
  const teacherNotifications = notifications.filter(
    (n) =>
      (n.roleTarget === 'teacher' || n.roleTarget === 'all') &&
      (n.teacherId === teacher.id || (!n.teacherId && (!n.schoolId || n.schoolId === teacher.schoolId)))
  );
  const teacherAuditLogs = auditLogs.filter(
    (l) => l.teacherId === teacher.id || l.targetName.includes(teacher.teacherCode) || l.targetName.includes(teacher.nameBn)
  );

  const statusTone = (st: string) => {
    switch (st) {
      case 'active':
      case 'approved':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'under_review':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'pending':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'rejected':
      case 'suspended':
      case 'deactivated':
        return 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const tabs: { id: TeacherProfileSubTab; labelBn: string; labelEn: string }[] = [
    { id: 'overview', labelBn: 'তথ্য ও সংক্ষিপ্ত বিবরণ', labelEn: 'Overview & Info' },
    { id: 'approval_history', labelBn: 'Approval History', labelEn: 'Approval History' },
    { id: 'workflows', labelBn: '১৮টি অনুমোদন কার্যক্রম', labelEn: '18 Workflow Actions' },
    { id: 'dashboard_visit', labelBn: 'শিক্ষক ড্যাশবোর্ড (Visit)', labelEn: 'Teacher Dashboard (Visit)' },
    { id: 'activity', labelBn: 'Activity & Audit', labelEn: 'Activity & Audit' },
  ];

  const groupTitle = (g: string) => {
    switch (g) {
      case 'onboarding':
        return b('১. নিবন্ধন ও নিয়োগ অনুমোদন', '1. Onboarding & Appointment', lang);
      case 'movement':
        return b('২. বিদ্যালয়, বদলি ও কর্মস্থল পরিবর্তন', '2. School, Transfer & Branch Movement', lang);
      case 'academic_info':
        return b('৩. পদ, বিষয়, শ্রেণি ও তথ্য সংশোধন', '3. Designation, Subject, Class & Info Updates', lang);
      default:
        return b('৪. ছুটি, স্থগিত, সক্রিয়করণ, অবসর ও স্কুল এডমিন', '4. Leave, Suspend, Reactivate, Retirement & Admin', lang);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Quick Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {b('সকল শিক্ষকের তালিকায় ফিরুন', 'Back to All Teachers', lang)}
            </button>
            <div className="flex items-start gap-3.5">
              <div className="relative shrink-0">
                {teacher.photoUrl ? (
                  <img
                    src={teacher.photoUrl}
                    alt={teacher.nameEn}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold text-lg text-blue-700 dark:text-blue-300 shrink-0">
                    {teacher.nameEn.slice(0, 2).toUpperCase()}
                  </div>
                )}
                {onEditTeacherPhoto && (
                  <button
                    type="button"
                    onClick={() => onEditTeacherPhoto(teacher)}
                    title={b('ছবি পরিবর্তন / ক্রপ', 'Edit / Crop Photo', lang)}
                    className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-blue-700 hover:bg-blue-800 text-white border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-sm cursor-pointer"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    {teacher.nameBn} ({teacher.teacherCode})
                  </h1>
                  <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${statusTone(teacher.status)}`}>
                    Status: {teacher.status}
                  </span>
                  <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${statusTone(verificationStatus === 'verified' ? 'active' : verificationStatus)}`}>
                    Verify: {verificationStatus}
                  </span>
                  <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${statusTone(approvalStatus)}`}>
                    Approval: {approvalStatus}
                  </span>
                  {teacher.isSchoolAdmin && (
                    <span className="px-2 py-0.5 rounded border text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                      School Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {teacher.nameEn} · {teacher.designation} · {teacher.schoolNameBn} ({teacher.schoolId}) · {teacher.mobile}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {can('teacher:edit') && (
              <button
                type="button"
                onClick={() => onOpenEditModal(teacher)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                {b('তথ্য পরিবর্তন', 'Edit Info', lang)}
              </button>
            )}
            {can('teacher:verify') && onVerifyTeacher && verificationStatus !== 'verified' && (
              <button
                type="button"
                onClick={() => onVerifyTeacher(teacher.id, b('শিক্ষকের তথ্য ও সনদ যাচাইকৃত', 'Teacher credentials verified', lang))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white whitespace-nowrap cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                {b('যাচাই (Verify)', 'Verify', lang)}
              </button>
            )}
            {can('teacher:transfer') && (
              <button
                type="button"
                onClick={() => onOpenWorkflowModal(teacher)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white whitespace-nowrap cursor-pointer"
              >
                <Briefcase className="w-3.5 h-3.5 shrink-0" />
                {b('অনুমোদন ও পরিবর্তন', 'Workflow Action', lang)}
              </button>
            )}
            {can('teacher:notice') && (
              <button
                type="button"
                onClick={() => onOpenNoticeModal(teacher)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400 shrink-0" />
                {b('নোটিশ পাঠান', 'Send Notice', lang)}
              </button>
            )}
            {can('teacher:reissue_id') && onReissueTeacherId && (
              <button
                type="button"
                onClick={() => onReissueTeacherId(teacher.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 whitespace-nowrap cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5 shrink-0" />
                {b('Re-issue ID', 'Re-issue ID', lang)}
              </button>
            )}
            {can('teacher:reports') && onOpenTeacherReport && (
              <button
                type="button"
                onClick={() => onOpenTeacherReport(teacher)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
              >
                <FileBarChart2 className="w-3.5 h-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                {b('Reports', 'Reports', lang)}
              </button>
            )}
            {teacher.status !== 'active' && (can('teacher:restore') || can('teacher:approve')) && (
              <button
                type="button"
                onClick={() =>
                  onOpenConfirm({
                    title: b('শিক্ষক সক্রিয় / পুনরুদ্ধার করুন', 'Activate / Restore Teacher', lang),
                    message: b(`"${teacher.nameBn}"-কে পুনরায় Active করতে চান?`, `Restore / activate "${teacher.nameEn}"?`, lang),
                    confirmLabel: b('সক্রিয় / Restore', 'Restore', lang),
                    requireReason: true,
                    onConfirm: (reason) => onUpdateTeacherStatus(teacher.id, 'active', reason),
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white whitespace-nowrap cursor-pointer"
              >
                {teacher.status === 'archived' || teacher.status === 'deactivated' ? (
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Play className="w-3.5 h-3.5 shrink-0" />
                )}
                {teacher.status === 'archived' || teacher.status === 'deactivated'
                  ? b('Restore', 'Restore', lang)
                  : b('সক্রিয় করুন', 'Activate', lang)}
              </button>
            )}
            {can('teacher:suspend') && teacher.status !== 'suspended' && teacher.status !== 'deactivated' && teacher.status !== 'archived' && (
              <button
                type="button"
                onClick={() =>
                  onOpenConfirm({
                    title: b('শিক্ষক সাময়িক স্থগিত করুন', 'Suspend Teacher', lang),
                    message: b(`"${teacher.nameBn}"-কে সাময়িক স্থগিত করার কারণ লিখুন:`, `Provide reason to suspend "${teacher.nameEn}":`, lang),
                    confirmLabel: b('স্থগিত করুন', 'Suspend', lang),
                    danger: true,
                    requireReason: true,
                    onConfirm: (reason) => onUpdateTeacherStatus(teacher.id, 'suspended', reason),
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 whitespace-nowrap cursor-pointer"
              >
                <PauseCircle className="w-3.5 h-3.5 shrink-0" />
                {b('স্থগিত', 'Suspend', lang)}
              </button>
            )}
            {can('teacher:delete_archive') && teacher.status !== 'archived' && (
              <button
                type="button"
                onClick={() =>
                  onOpenConfirm({
                    title: b('শিক্ষক আর্কাইভ / অপসারণ করুন', 'Archive / Delete Teacher', lang),
                    message: b(`"${teacher.nameBn}"-কে আর্কাইভ করতে চান? অডিট ও অনুমোদন হিস্ট্রি সংরক্ষিত থাকবে এবং Restore করা যাবে।`, `Archive "${teacher.nameEn}"? Audit history is preserved and record can be restored.`, lang),
                    confirmLabel: b('Delete / Archive', 'Archive', lang),
                    danger: true,
                    requireReason: true,
                    onConfirm: (reason) => onUpdateTeacherStatus(teacher.id, 'archived', reason),
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 whitespace-nowrap cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                {b('Delete/Archive', 'Delete/Archive', lang)}
              </button>
            )}
          </div>
        </div>

        {/* Approval Action Strip ONLY for pending / under_review teachers */}
        {(teacher.status === 'pending' || teacher.status === 'under_review') && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="font-medium text-slate-600 dark:text-slate-300">
              {b('শিক্ষক অনুমোদন ও যাচাই কার্যক্রম:', 'Pending Teacher Verification Actions:', lang)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onOpenConfirm({
                    title: b('শিক্ষক অনুমোদন ও সক্রিয় করুন', 'Approve & Activate Teacher', lang),
                    message: b(`"${teacher.nameBn}"-কে অনুমোদন ও সক্রিয় করতে চান?`, `Approve and activate "${teacher.nameEn}"?`, lang),
                    confirmLabel: b('অনুমোদন করুন', 'Approve', lang),
                    onConfirm: (reason) => onUpdateTeacherStatus(teacher.id, 'active', reason),
                  })
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold whitespace-nowrap cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {b('অনুমোদন প্রদান', 'Approve Teacher', lang)}
              </button>
              {teacher.status === 'pending' && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenConfirm({
                      title: b('পর্যালোচনায় (Under Review) নিন', 'Move to Under Review', lang),
                      message: b(`"${teacher.nameBn}"-এর সনদপত্র পর্যালোচনায় নিতে চান?`, `Move "${teacher.nameEn}" to Under Review?`, lang),
                      confirmLabel: b('Under Review করুন', 'Start Review', lang),
                      onConfirm: (reason) => onUpdateTeacherStatus(teacher.id, 'under_review', reason),
                    })
                  }
                  className="px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold whitespace-nowrap cursor-pointer"
                >
                  {b('পর্যালোচনায় নিন', 'Under Review', lang)}
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  onOpenConfirm({
                    title: b('শিক্ষকের আবেদন প্রত্যাখ্যান করুন', 'Reject Teacher Application', lang),
                    message: b(`"${teacher.nameBn}"-এর আবেদন প্রত্যাখ্যান করার কারণ লিখুন:`, `Provide reason to reject "${teacher.nameEn}":`, lang),
                    confirmLabel: b('প্রত্যাখ্যান করুন', 'Reject', lang),
                    danger: true,
                    requireReason: true,
                    onConfirm: (reason) => onUpdateTeacherStatus(teacher.id, 'rejected', reason),
                  })
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 font-semibold whitespace-nowrap cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                {b('প্রত্যাখ্যান', 'Reject', lang)}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sub-Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 text-xs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap cursor-pointer ${
              subTab === t.id
                ? 'bg-blue-700 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {b(t.labelBn, t.labelEn, lang)}
          </button>
        ))}
      </div>

      {/* SUB-TAB 1: OVERVIEW & INFO */}
      {subTab === 'overview' && (
        <div className="space-y-5">
          {teacher.status === 'suspended' && teacher.suspensionReason && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <PauseCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">{b('সাময়িক স্থগিতের কারণ:', 'Suspension Reason:', lang)} </span>
                {teacher.suspensionReason}
              </div>
            </div>
          )}
          {teacher.status === 'deactivated' && teacher.deactivationReason && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-xl p-4 text-xs text-red-900 dark:text-red-200 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">{b('নিষ্ক্রিয় / অবসর তথ্য:', 'Deactivation / Retirement Record:', lang)} </span>
                {teacher.deactivationReason}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500">{b('পারফরম্যান্স স্কোর', 'Performance Score', lang)}</div>
              <div className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
                {teacher.performanceScore}/100
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500">{b('বরাদ্দকৃত শ্রেণি', 'Assigned Classes', lang)}</div>
              <div className="text-2xl font-bold tabular-nums mt-1">{teacher.assignedClasses.length}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500">{b('পাঠদানের বিষয়', 'Assigned Subjects', lang)}</div>
              <div className="text-2xl font-bold tabular-nums mt-1">{teacher.subjects.length}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500">{b('যোগদানের তারিখ', 'Joining Date', lang)}</div>
              <div className="text-base font-bold font-mono tabular-nums mt-1.5">{teacher.joiningDate}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-700" />
                {b('১. শিক্ষকের প্রোফাইল ও পরিচিতি তথ্য (Profile)', '1. Teacher Profile Information', lang)}
              </h2>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-slate-600 dark:text-slate-300">
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('বাংলা নাম:', 'Name (BN):', lang)}</span> {teacher.nameBn}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('ইংরেজি নাম:', 'Name (EN):', lang)}</span> {teacher.nameEn}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">Teacher ID:</span> <span className="font-mono">{teacher.teacherCode}</span></div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('মোবাইল:', 'Mobile:', lang)}</span> <span className="font-mono">{teacher.mobile}</span></div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('ইমেইল:', 'Email:', lang)}</span> {teacher.email ?? '-'}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('NID নম্বর:', 'NID:', lang)}</span> <span className="font-mono">{teacher.nidNumber ?? 'Verified on file'}</span></div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('যাচাই অবস্থা:', 'Verification:', lang)}</span> {verificationStatus}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('আইডি পুনঃইস্যু:', 'Re-issued IDs:', lang)}</span> {teacher.reissuedIdCount ?? 0}</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-700" />
                {b('২. একাডেমিক ও পেশাগত তথ্য (Academic / Professional Info)', '2. Academic & Professional Information', lang)}
              </h2>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-slate-600 dark:text-slate-300">
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('পদবি:', 'Designation:', lang)}</span> {teacher.designation}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('শিক্ষাগত যোগ্যতা:', 'Qualification:', lang)}</span> {teacher.qualification}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('বিদ্যালয়:', 'School:', lang)}</span> {teacher.schoolNameBn}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('কর্মস্থল / শাখা:', 'Branch:', lang)}</span> {teacher.branchName ?? 'Main Campus'}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('যোগদানের তথ্য:', 'Joining Date:', lang)}</span> <span className="font-mono">{teacher.joiningDate}</span></div>
                <div><span className="font-semibold text-slate-900 dark:text-white">{b('বিশেষ দায়িত্ব:', 'Special Duty:', lang)}</span> {teacher.specialDuty ?? '-'}</div>
                <div className="col-span-2"><span className="font-semibold text-slate-900 dark:text-white">{b('পাঠদানের বিষয়সমূহ:', 'Subjects:', lang)}</span> {teacher.subjects.join(', ')}</div>
                <div className="col-span-2"><span className="font-semibold text-slate-900 dark:text-white">{b('শ্রেণি বরাদ্দ:', 'Assigned Classes:', lang)}</span> {teacher.assignedClasses.join(', ')}</div>
              </div>
              {teacher.leaveStatus && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-amber-700 dark:text-amber-300 font-semibold">
                  {b('ছুটি অবস্থা:', 'Leave Status:', lang)} {teacher.leaveStatus}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-blue-700" />
                {b('নথিপত্র ও বদলির ইতিহাস', 'Documents & Transfer History', lang)}
              </h2>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {(teacher.documents ?? ['নিয়োগপত্র.pdf', 'শিক্ষাগত_সনদ.pdf']).map((doc) => (
                  <li key={doc} className="py-2 flex items-center justify-between">
                    <span className="font-mono text-slate-800 dark:text-slate-200">{doc}</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                      {verificationStatus === 'verified' ? 'Verified' : 'Pending Verification'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="font-bold text-slate-900 dark:text-white mb-1.5">
                {b('৩. শিক্ষকের কার্যক্রম ও বদলির ইতিহাস (Activity & Posting History)', '3. Teacher Activity & Transfer History', lang)}
              </div>
              <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                {(teacher.activityHistory ?? []).map((item, i) => (
                  <li key={`act-${i}`}>• {item}</li>
                ))}
                {(teacher.transferHistory ?? []).map((item, i) => (
                  <li key={`tr-${i}`}>• {item}</li>
                ))}
                {(teacher.activityHistory ?? []).length === 0 && (teacher.transferHistory ?? []).length === 0 && (
                  <li className="text-slate-500">{b('বর্তমান বিদ্যালয়েই স্থায়ী কর্মস্থল।', 'No transfers or extra events logged yet.', lang)}</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: APPROVAL HISTORY */}
      {subTab === 'approval_history' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-blue-700" />
              {b('Teacher Profile → অনুমোদন ইতিহাস (Approval History)', 'Teacher Profile → Approval History', lang)}
            </h2>
            <span className="text-slate-500 tabular-nums">
              {(teacher.approvalHistory ?? []).length} {b('টি রেকর্ড', 'entries', lang)}
            </span>
          </div>
          {(!teacher.approvalHistory || teacher.approvalHistory.length === 0) ? (
            <p className="text-slate-500 py-4">{b('এখনো কোনো অনুমোদন ইতিহাস সংরক্ষিত হয়নি।', 'No approval history entries yet.', lang)}</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {teacher.approvalHistory.map((h) => (
                <div key={h.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {b(h.actionTitleBn, h.actionTitleEn, lang)}
                    </div>
                    <div className="text-slate-500">
                      {h.actor} · <span className="tabular-nums">{h.date}</span>
                    </div>
                    {h.note && <div className="text-slate-600 dark:text-slate-300">{h.note}</div>}
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <div className="font-mono font-semibold text-blue-700 dark:text-blue-400">
                      {h.fromValue} → {h.toValue}
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold ${statusTone(h.decision === 'completed' ? 'active' : h.decision)}`}>
                      {h.decision}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: ALL 18 WORKFLOW ACTIONS */}
      {subTab === 'workflows' && (
        <div className="space-y-4 text-xs">
          {(['onboarding', 'movement', 'academic_info', 'status_admin'] as const).map((grp) => {
            const items = TEACHER_APPROVAL_CATEGORIES.filter((c) => c.group === grp);
            return (
              <div key={grp} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{groupTitle(grp)}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((cat) => (
                    <div
                      key={cat.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-2.5"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{b(cat.labelBn, cat.labelEn, lang)}</div>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">{b(cat.howItWorksBn, cat.howItWorksEn, lang)}</p>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => onOpenWorkflowModal(teacher, cat.id)}
                          className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
                        >
                          {b('কার্যক্রম চালু / অনুমোদন করুন', 'Execute / Approve', lang)}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUB-TAB 4: VISIT TEACHER DASHBOARD */}
      {subTab === 'dashboard_visit' && (
        <div className="space-y-5 text-xs">
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-semibold">
              <LayoutDashboard className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <span>
                {b(
                  `Admin Visit Mode: আপনি এখন "${teacher.nameBn}"-এর শিক্ষক ড্যাশবোর্ড পরিদর্শন করছেন (Read-Only পর্যবেক্ষণ)।`,
                  `Admin Visit Mode: Viewing live Teacher Dashboard for "${teacher.nameEn}".`,
                  lang
                )}
              </span>
            </div>
            <span className="font-mono text-blue-700 dark:text-blue-300 font-semibold">
              {teacher.teacherCode} · {teacher.schoolId}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-700" />
                {b('আজকের শ্রেণি রুটিন ও পাঠদান অবস্থা', "Teacher's Routine & Class Sessions", lang)}
              </h3>
              {teacherRoutine.length === 0 ? (
                <p className="text-slate-500">{b('আজকের জন্য নির্ধারিত স্লট পাওয়া যায়নি।', 'No routine slots scheduled today.', lang)}</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {teacherRoutine.map((slot) => (
                    <li key={slot.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          Period {slot.period} · {b(slot.subjectBn, slot.subjectEn, lang)} ({slot.className})
                        </div>
                        <div className="text-slate-500">{slot.timeRange} · Room {slot.room}</div>
                      </div>
                      <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">{slot.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-sky-700" />
                {b('শিক্ষকের প্রাপ্ত নোটিফিকেশন ইনবক্স', "Teacher's In-App Notifications", lang)}
              </h3>
              {teacherNotifications.length === 0 ? (
                <p className="text-slate-500">{b('কোনো নোটিফিকেশন নেই।', 'No notifications yet.', lang)}</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {teacherNotifications.slice(0, 5).map((n) => (
                    <li key={n.id} className="py-2.5 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">{b(n.titleBn, n.titleEn, lang)}</span>
                        <span className="text-slate-400 shrink-0">{n.time}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">{b(n.messageBn, n.messageEn, lang)}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-500">
                {b('বিদ্যালয়ের মোট নমুনা শিক্ষার্থী:', 'School Students in Scope:', lang)}{' '}
                <span className="font-bold tabular-nums text-slate-900 dark:text-white">{schoolStudents.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: AUDIT HISTORY */}
      {subTab === 'activity' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 text-xs">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-700" />
            {b('শিক্ষক-সম্পর্কিত অপরিবর্তনীয় অডিট লগ', 'Immutable Teacher Audit History', lang)}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                  <th className="py-2 px-3 font-semibold">Who</th>
                  <th className="py-2 px-3 font-semibold">When</th>
                  <th className="py-2 px-3 font-semibold">What</th>
                  <th className="py-2 px-3 font-semibold">Old → New</th>
                  <th className="py-2 px-3 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {teacherAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      {b('এই শিক্ষকের জন্য কোনো অডিট রেকর্ড নেই।', 'No audit logs found for this teacher.', lang)}
                    </td>
                  </tr>
                ) : (
                  teacherAuditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{log.who}</td>
                      <td className="py-2.5 px-3 tabular-nums text-slate-500 whitespace-nowrap">{log.when}</td>
                      <td className="py-2.5 px-3">{log.what}</td>
                      <td className="py-2.5 px-3 font-mono">{log.oldValue} → <span className="text-blue-700 dark:text-blue-400 font-semibold">{log.newValue}</span></td>
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
