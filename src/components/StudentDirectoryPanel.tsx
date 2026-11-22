import React, { useEffect, useState } from 'react';
import {
  ArrowRightLeft,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Download,
  Edit3,
  Eye,
  FileBarChart2,
  FileCheck2,
  History,
  Info,
  MapPin,
  MoreVertical,
  PauseCircle,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import type {
  AuditLogEntry,
  Language,
  NoticeItem,
  NotificationItem,
  PermissionKey,
  SchoolRecord,
  StudentChangeRequest,
  StudentRecord,
  StudentStatus,
} from '../types';
import { ALL_CLASSES, AVATARS } from '../data/mockData';
import { studentsToCsv } from '../utils/rbacAndGrading';
import { deriveVerificationStatus } from '../utils/governanceAndVerification';
import {
  computeClassBreakdown,
  computeGeoStudentBreakdown,
  computeSchoolStudentBreakdown,
  computeStudentSummaryCounts,
  filterAdminStudents,
  type StudentEditPatch,
} from '../utils/studentLifecycle';
import { b, tr } from '../i18n/translations';
import { StudentProfileView, type StudentProfileSubTab } from './StudentProfileView';
import {
  StudentEditModal,
  StudentNoticeModal,
  StudentSuspensionDeactivationModal,
  StudentTransferModal,
} from './StudentGovernanceModals';
import { EntityReportAndActivityModal, type EntityModalTarget } from './EntityReportAndActivityModal';
import { QrStickerPrintModal } from './QrStickerPrintModal';

interface StudentDirectoryPanelProps {
  actorRole: 'central_admin' | 'school_admin';
  lang: Language;
  globalSearch: string;
  students: StudentRecord[];
  schools: SchoolRecord[];
  ownSchool?: SchoolRecord;
  studentRequests: StudentChangeRequest[];
  auditLogs: AuditLogEntry[];
  notifications: NotificationItem[];
  navKey?: number;
  senderLabel: string;
  hasPermission?: (key: PermissionKey) => boolean;
  onOpenAddStudent?: () => void;
  onEditStudent: (studentId: string, patch: StudentEditPatch) => void;
  onTransferStudent: (studentId: string, targetSchoolId: string, reason: string) => void;
  onUpdateStudentStatus: (studentId: string, status: StudentStatus, reason: string) => void;
  onSendStudentNotice: (student: StudentRecord, notice: NoticeItem) => void;
  onVerifyStudentDocument: (studentId: string, docId: string, verified: boolean) => void;
  onProcessStudentRequest: (
    reqId: string,
    decision: 'approved' | 'rejected' | 'under_review' | 'pending',
    note: string
  ) => void;
  onVerifyStudent?: (studentId: string, note: string) => void;
  onReissueStudentId?: (studentId: string) => void;
  onInspectStudent?: (student: StudentRecord) => void;
  onEditStudentPhoto?: (student: StudentRecord) => void;
}

export const StudentDirectoryPanel: React.FC<StudentDirectoryPanelProps> = ({
  actorRole,
  lang,
  globalSearch,
  students,
  schools,
  ownSchool,
  studentRequests,
  auditLogs,
  notifications,
  navKey = 0,
  senderLabel,
  hasPermission,
  onOpenAddStudent,
  onEditStudent,
  onTransferStudent,
  onUpdateStudentStatus,
  onSendStudentNotice,
  onVerifyStudentDocument,
  onProcessStudentRequest,
  onVerifyStudent,
  onReissueStudentId,
  onInspectStudent,
  onEditStudentPhoto,
}) => {
  const [subView, setSubView] = useState<'directory' | 'statistics' | 'requests'>('directory');
  const [visitingStudentId, setVisitingStudentId] = useState<string | null>(null);
  const [profileInitialTab, setProfileInitialTab] = useState<StudentProfileSubTab>('overview');
  const [openMoreId, setOpenMoreId] = useState<string | null>(null);

  // Filters
  const [localSearch, setLocalSearch] = useState('');
  const [divFilter, setDivFilter] = useState('ALL');
  const [distFilter, setDistFilter] = useState('ALL');
  const [upzFilter, setUpzFilter] = useState('ALL');
  const [schoolFilter, setSchoolFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [transferStudent, setTransferStudent] = useState<StudentRecord | null>(null);
  const [noticeStudent, setNoticeStudent] = useState<StudentRecord | null>(null);
  const [entityModal, setEntityModal] = useState<EntityModalTarget | null>(null);
  const [statusModalState, setStatusModalState] = useState<{
    student: StudentRecord;
    mode: 'suspend' | 'deactivate';
  } | null>(null);
  const [qrStickersOpen, setQrStickersOpen] = useState(false);

  const can = (k: PermissionKey) => (hasPermission ? hasPermission(k) : true);

  useEffect(() => {
    setVisitingStudentId(null);
    setOpenMoreId(null);
  }, [navKey]);

  const openProfile = (studentId: string, tab: StudentProfileSubTab = 'overview') => {
    setProfileInitialTab(tab);
    setVisitingStudentId(studentId);
    setOpenMoreId(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const visitingStudent = visitingStudentId
    ? students.find((s) => s.id === visitingStudentId) ?? null
    : null;

  if (visitingStudent) {
    const sch = schools.find((s) => s.id === visitingStudent.schoolId);
    return (
      <>
        <StudentProfileView
          student={visitingStudent}
          school={sch}
          actorRole={actorRole}
          lang={lang}
          initialSubTab={profileInitialTab}
          studentRequests={studentRequests}
          auditLogs={auditLogs}
          notifications={notifications}
          hasPermission={hasPermission}
          onBack={() => setVisitingStudentId(null)}
          onOpenEdit={() => setEditingStudent(visitingStudent)}
          onOpenTransfer={() => setTransferStudent(visitingStudent)}
          onOpenNotice={() => setNoticeStudent(visitingStudent)}
          onOpenSuspendDeactivate={(mode) =>
            setStatusModalState({ student: visitingStudent, mode })
          }
          onUpdateStatus={onUpdateStudentStatus}
          onVerifyDocument={onVerifyStudentDocument}
          onProcessRequest={onProcessStudentRequest}
          onVerifyStudent={onVerifyStudent}
          onReissueStudentId={onReissueStudentId}
          onOpenStudentReport={(st) => setEntityModal({ kind: 'student', mode: 'report', entity: st })}
          onInspectStudent={onInspectStudent}
          onEditStudentPhoto={onEditStudentPhoto}
        />

        <StudentEditModal
          student={editingStudent}
          lang={lang}
          onClose={() => setEditingStudent(null)}
          onSave={onEditStudent}
        />
        <StudentTransferModal
          student={transferStudent}
          schools={schools}
          lang={lang}
          onClose={() => setTransferStudent(null)}
          onTransfer={onTransferStudent}
        />
        <StudentNoticeModal
          student={noticeStudent}
          lang={lang}
          senderLabel={senderLabel}
          onClose={() => setNoticeStudent(null)}
          onSend={onSendStudentNotice}
        />
        <StudentSuspensionDeactivationModal
          state={statusModalState}
          lang={lang}
          onClose={() => setStatusModalState(null)}
          onConfirm={onUpdateStudentStatus}
        />
        <EntityReportAndActivityModal
          target={entityModal}
          lang={lang}
          auditLogs={auditLogs}
          onClose={() => setEntityModal(null)}
        />
      </>
    );
  }

  const summary = computeStudentSummaryCounts(students, studentRequests);
  const effectiveSearch = localSearch.trim() ? localSearch : globalSearch;

  const divisions = Array.from(new Set(schools.map((s) => s.division)));
  const districts = Array.from(
    new Set(
      schools
        .filter((s) => divFilter === 'ALL' || s.division === divFilter)
        .map((s) => s.district)
    )
  );
  const upazilas = Array.from(
    new Set(
      schools
        .filter(
          (s) =>
            (divFilter === 'ALL' || s.division === divFilter) &&
            (distFilter === 'ALL' || s.district === distFilter)
        )
        .map((s) => s.upazila)
    )
  );

  const visibleStudents = filterAdminStudents(students, schools, {
    search: effectiveSearch,
    division: actorRole === 'central_admin' ? divFilter : 'ALL',
    district: actorRole === 'central_admin' ? distFilter : 'ALL',
    upazila: actorRole === 'central_admin' ? upzFilter : 'ALL',
    schoolId: actorRole === 'central_admin' ? schoolFilter : 'ALL',
    className: classFilter,
    gender: genderFilter,
    status: statusFilter,
  });

  const classBreakdown = computeClassBreakdown(students, schools, {
    division: actorRole === 'central_admin' ? divFilter : 'ALL',
    district: actorRole === 'central_admin' ? distFilter : 'ALL',
    upazila: actorRole === 'central_admin' ? upzFilter : 'ALL',
    schoolId: actorRole === 'central_admin' ? schoolFilter : ownSchool?.id ?? 'ALL',
  });
  const classTotals = classBreakdown.reduce(
    (acc, r) => ({
      boys: acc.boys + r.boys,
      girls: acc.girls + r.girls,
      total: acc.total + r.total,
    }),
    { boys: 0, girls: 0, total: 0 }
  );

  const schoolBreakdown = computeSchoolStudentBreakdown(
    students,
    actorRole === 'central_admin' ? schools : ownSchool ? [ownSchool] : schools
  );
  const geoBreakdown = computeGeoStudentBreakdown(students, schools);

  const resetFilters = () => {
    setLocalSearch('');
    setDivFilter('ALL');
    setDistFilter('ALL');
    setUpzFilter('ALL');
    setSchoolFilter('ALL');
    setClassFilter('ALL');
    setGenderFilter('ALL');
    setStatusFilter('ALL');
  };

  const downloadCsv = () => {
    const csv = studentsToCsv(visibleStudents);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students-${ownSchool?.code ?? 'central'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusTone = (status: string) => {
    if (status === 'active') {
      return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    }
    if (status === 'pending' || status === 'under_review') {
      return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    }
    return 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {actorRole === 'central_admin'
              ? b('শিক্ষার্থী ব্যবস্থাপনা ও কেন্দ্রীয় পরিসংখ্যান', 'Student Governance & Central Statistics', lang)
              : b(`শিক্ষার্থী ব্যবস্থাপনা ও ভর্তি অনুমোদন (${ownSchool?.code ?? ''})`, `Student Management & Admission (${ownSchool?.code ?? ''})`, lang)}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {actorRole === 'central_admin'
              ? b(
                  'সকল বিদ্যালয় ও শ্রেণিভিত্তিক (Pre-Primary–Class 10) পরিসংখ্যান, গুরুত্বপূর্ণ প্রোফাইল পরিবর্তন, বিদ্যালয় বদলি ও স্থগিতাদেশ',
                  'Cross-school statistics (Pre-Primary–Class 10), important profile change review, school transfers & status governance',
                  lang
                )
              : b(
                  'নতুন শিক্ষার্থী ভর্তি, নিবন্ধন ও নথি যাচাই অনুমোদন, শ্রেণিভিত্তিক হিসাব এবং প্রোফাইল ব্যবস্থাপনা',
                  'New student admission, registration & document approval, class breakdown & profile governance',
                  lang
                )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="directory-qr-stickers-btn"
            onClick={() => setQrStickersOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-emerald-600/40 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 whitespace-nowrap cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            {b('QR স্টিকার প্রিন্ট', 'QR Stickers', lang)}
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            {tr('exportCsv', lang)}
          </button>
          {actorRole === 'school_admin' && onOpenAddStudent && (
            <button
              type="button"
              onClick={onOpenAddStudent}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {b('নতুন শিক্ষার্থী ভর্তি', 'Admit Student', lang)}
            </button>
          )}
        </div>
      </div>

      {/* Central Admin vs School Admin Admission Boundary Banner */}
      {actorRole === 'central_admin' && (
        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-700 dark:text-blue-400" />
          <div>
            <span className="font-bold">
              {b('প্রশাসনিক নীতি (Admission Boundary): ', 'Governance Rule: ', lang)}
            </span>
            {b(
              'Central Admin নিজে নতুন শিক্ষার্থী ভর্তি করে না; বিদ্যালয়ে থাকায় সংশ্লিষ্ট School Admin নতুন শিক্ষার্থীর ভর্তি আবেদন ও নথি যাচাই/অনুমোদন করবেন। Central Admin সকল পরিসংখ্যান, গুরুত্বপূর্ণ প্রোফাইল পরিবর্তন, বিদ্যালয় বদলি, নোটিশ এবং স্থগিত/নিষ্ক্রিয় কার্যক্রম পরিচালনা করেন।',
              'Central Admin does not admit new students directly; the School Admin verifies and approves admissions at the school level. Central Admin oversees statistics, important profile changes, school transfers, notices, and suspension/deactivation.',
              lang
            )}
          </div>
        </div>
      )}

      {/* Overall Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={() => {
            setGenderFilter('ALL');
            setStatusFilter('ALL');
            setSubView('directory');
          }}
          className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 rounded-xl p-3.5 cursor-pointer"
        >
          <div className="text-[11px] text-slate-500">{b('👥 সকল শিক্ষার্থী', 'Total Students', lang)}</div>
          <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">{summary.total}</div>
        </button>
        <button
          type="button"
          onClick={() => {
            setGenderFilter('Male');
            setSubView('directory');
          }}
          className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 rounded-xl p-3.5 cursor-pointer"
        >
          <div className="text-[11px] text-slate-500">{b('👦 সকল ছাত্র', 'Total Boys', lang)}</div>
          <div className="text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-400 mt-1">{summary.boys}</div>
        </button>
        <button
          type="button"
          onClick={() => {
            setGenderFilter('Female');
            setSubView('directory');
          }}
          className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 rounded-xl p-3.5 cursor-pointer"
        >
          <div className="text-[11px] text-slate-500">{b('👧 সকল ছাত্রী', 'Total Girls', lang)}</div>
          <div className="text-2xl font-bold tabular-nums text-rose-700 dark:text-rose-400 mt-1">{summary.girls}</div>
        </button>
        <button
          type="button"
          onClick={() => {
            setStatusFilter('active');
            setSubView('directory');
          }}
          className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 rounded-xl p-3.5 cursor-pointer"
        >
          <div className="text-[11px] text-slate-500">{b('✅ সক্রিয় শিক্ষার্থী', 'Active', lang)}</div>
          <div className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">{summary.active}</div>
        </button>
        <button
          type="button"
          onClick={() => setSubView('requests')}
          className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 rounded-xl p-3.5 cursor-pointer"
        >
          <div className="text-[11px] text-slate-500">{b('⏳ অনুমোদন / আবেদন', 'Pending Queue', lang)}</div>
          <div className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400 mt-1">
            {summary.pendingRequestsCount}
          </div>
        </button>
        <button
          type="button"
          onClick={() => {
            setStatusFilter('suspended');
            setSubView('directory');
          }}
          className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-red-400 rounded-xl p-3.5 cursor-pointer"
        >
          <div className="text-[11px] text-slate-500">{b('⏸️ স্থগিত / নিষ্ক্রিয়', 'Suspended / Inactive', lang)}</div>
          <div className="text-2xl font-bold tabular-nums text-red-700 dark:text-red-400 mt-1">
            {summary.suspended + summary.deactivated}
          </div>
        </button>
      </div>

      {/* Sub-Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setSubView('directory')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer ${
            subView === 'directory'
              ? 'bg-blue-700 text-white'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{b('সকল শিক্ষার্থী ডিরেক্টরি', 'Student Directory', lang)} ({visibleStudents.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubView('statistics')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer ${
            subView === 'statistics'
              ? 'bg-blue-700 text-white'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>{b('শ্রেণি, বিদ্যালয় ও অঞ্চল পরিসংখ্যান', 'Class, School & Geo Statistics', lang)}</span>
        </button>
        <button
          type="button"
          onClick={() => setSubView('requests')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer ${
            subView === 'requests'
              ? 'bg-blue-700 text-white'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>
            {b('অনুমোদন, প্রোফাইল পরিবর্তন ও বদলি', 'Approvals, Profile Changes & Transfers', lang)} ({summary.pendingRequestsCount})
          </span>
        </button>
      </div>

      {/* VIEW 1: Directory & Action Bar */}
      {subView === 'directory' && (
        <>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="relative lg:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  placeholder={b('নাম / Permanent ID / জন্মনিবন্ধন / মোবাইল দিয়ে খুঁজুন...', 'Search Name / Permanent ID / Birth Reg / Mobile...', lang)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                />
              </div>

              {actorRole === 'central_admin' && (
                <>
                  <select
                    value={divFilter}
                    onChange={(e) => {
                      setDivFilter(e.target.value);
                      setDistFilter('ALL');
                      setUpzFilter('ALL');
                    }}
                    className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none cursor-pointer"
                  >
                    <option value="ALL">{b('সকল বিভাগ (Division)', 'All Divisions', lang)}</option>
                    {divisions.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <select
                    value={distFilter}
                    onChange={(e) => {
                      setDistFilter(e.target.value);
                      setUpzFilter('ALL');
                    }}
                    className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none cursor-pointer"
                  >
                    <option value="ALL">{b('সকল জেলা (District)', 'All Districts', lang)}</option>
                    {districts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <select
                    value={upzFilter}
                    onChange={(e) => setUpzFilter(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none cursor-pointer"
                  >
                    <option value="ALL">{b('সকল উপজেলা (Upazila)', 'All Upazilas', lang)}</option>
                    {upazilas.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <select
                    value={schoolFilter}
                    onChange={(e) => setSchoolFilter(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none cursor-pointer"
                  >
                    <option value="ALL">{b('সকল বিদ্যালয়', 'All Schools', lang)}</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>{s.nameBn} ({s.code})</option>
                    ))}
                  </select>
                </>
              )}

              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">{b('সকল শ্রেণি (Pre-Primary–Class 10)', 'All Classes (Pre-Primary–Class 10)', lang)}</option>
                {ALL_CLASSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="flex-1 h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none cursor-pointer"
                >
                  <option value="ALL">{b('ছাত্র ও ছাত্রী', 'Boys & Girls', lang)}</option>
                  <option value="Male">{b('ছাত্র (Boys)', 'Boys', lang)}</option>
                  <option value="Female">{b('ছাত্রী (Girls)', 'Girls', lang)}</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex-1 h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none cursor-pointer"
                >
                  <option value="ALL">{b('সকল অবস্থা', 'All Status', lang)}</option>
                  <option value="active">{b('Active', 'Active', lang)}</option>
                  <option value="pending">{b('Pending', 'Pending', lang)}</option>
                  <option value="under_review">{b('Under Review', 'Under Review', lang)}</option>
                  <option value="suspended">{b('Suspended', 'Suspended', lang)}</option>
                  <option value="deactivated">{b('Deactivated', 'Deactivated', lang)}</option>
                  <option value="archived">{b('Archived', 'Archived', lang)}</option>
                  <option value="rejected">{b('Rejected', 'Rejected', lang)}</option>
                </select>
                <button
                  type="button"
                  onClick={resetFilters}
                  title={b('ফিল্টার রিসেট', 'Reset Filters', lang)}
                  className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold whitespace-nowrap hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {b('রিসেট', 'Reset', lang)}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="overflow-x-auto min-h-[320px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                    <th className="py-3 px-4 font-semibold">Student ID</th>
                    <th className="py-3 px-3 font-semibold">{b('ছবি ও নাম', 'Photo & Name', lang)}</th>
                    <th className="py-3 px-3 font-semibold">{b('বিদ্যালয়', 'School', lang)}</th>
                    <th className="py-3 px-3 font-semibold">{b('শ্রেণি / শাখা / রোল', 'Class / Section / Roll', lang)}</th>
                    <th className="py-3 px-3 font-semibold">{b('ফলাফল', 'Exam Result', lang)}</th>
                    <th className="py-3 px-3 font-semibold">{b('উপস্থিতি', 'Attendance', lang)}</th>
                    <th className="py-3 px-3 font-semibold">{b('অবস্থা ও যাচাই', 'Status & Verify', lang)}</th>
                    <th className="py-3 px-4 font-semibold text-right">{b('কার্যক্রম (Action Bar)', 'Actions', lang)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        {b('ফিল্টারের সাথে মিল থাকা কোনো শিক্ষার্থী পাওয়া যায়নি।', 'No students match current filters.', lang)}
                      </td>
                    </tr>
                  ) : (
                    visibleStudents.map((st, idx) => {
                      const openUpward = idx >= 2 && idx >= visibleStudents.length - 2;
                      const verStatus = deriveVerificationStatus(st);
                      const isCentralPendingAdmission =
                        actorRole === 'central_admin' && (st.status === 'pending' || st.status === 'under_review');
                      return (
                        <tr key={st.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => (onInspectStudent ? onInspectStudent(st) : openProfile(st.id, 'overview'))}
                              title={b('Quick Modal (TC ও QR ID) খুলুন', 'Open Quick Profile Modal (TC & ID)', lang)}
                              className="font-mono font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer text-left"
                            >
                              {st.permanentId}
                            </button>
                            <div className="font-mono text-[10px] text-slate-400">GLC: {st.guardianLinkCode}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={st.photoUrl ?? AVATARS.studentRahim}
                                alt={st.nameEn}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                              />
                              <div>
                                <div className="font-semibold text-slate-900 dark:text-white">{st.nameBn}</div>
                                <div className="text-[11px] text-slate-500">
                                  {st.gender === 'Male' ? b('ছাত্র', 'Boy', lang) : b('ছাত্রী', 'Girl', lang)} · {st.guardianMobile}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                            <div className="font-medium">{st.schoolNameBn}</div>
                            <div className="font-mono text-[10px] text-slate-400">{st.schoolId}</div>
                          </td>
                          <td className="py-3 px-3 tabular-nums whitespace-nowrap">
                            <div className="font-semibold text-slate-900 dark:text-white">{st.className}</div>
                            <div className="text-[11px] text-slate-500">
                              {b('শাখা', 'Sec', lang)}: {st.section} · {b('রোল', 'Roll', lang)} #{st.roll}
                            </div>
                          </td>
                          <td className="py-3 px-3 tabular-nums font-semibold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                            {st.examResultLabel ?? st.gpa ?? '4.80 (A)'}
                          </td>
                          <td className="py-3 px-3 tabular-nums font-semibold">
                            <span className={st.attendancePct < 75 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}>
                              {st.attendancePct}%
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold ${statusTone(st.status)}`}>
                              {st.status}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Verify:{' '}
                              <span className={verStatus === 'verified' ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-amber-700 dark:text-amber-400 font-semibold'}>
                                {verStatus}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1 relative">
                              {can('student:view') && (
                                <button
                                  type="button"
                                  onClick={() => openProfile(st.id, 'overview')}
                                  title={b('সম্পূর্ণ শিক্ষার্থী প্রোফাইল দেখুন', 'View Student Profile', lang)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 shrink-0" />
                                  <span>{b('View', 'View', lang)}</span>
                                </button>
                              )}
                              {can('student:edit') && (
                                <button
                                  type="button"
                                  onClick={() => setEditingStudent(st)}
                                  title={b('শিক্ষার্থীর তথ্য সম্পাদনা', 'Edit Student Info', lang)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                                  <span>{b('Edit', 'Edit', lang)}</span>
                                </button>
                              )}
                              {can('student:create') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (actorRole === 'school_admin' && onOpenAddStudent) {
                                      onOpenAddStudent();
                                    } else {
                                      setSubView('requests');
                                    }
                                  }}
                                  title={
                                    actorRole === 'school_admin'
                                      ? b('নতুন শিক্ষার্থী ভর্তি', 'Admit New Student', lang)
                                      : b('আবেদন/বদলি সারি দেখুন (ভর্তি শুধু School Admin)', 'View Requests (Admissions by School Admin)', lang)
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5 shrink-0" />
                                  <span>{b('Create', 'Create', lang)}</span>
                                </button>
                              )}
                              {can('student:notice') && (
                                <button
                                  type="button"
                                  onClick={() => setNoticeStudent(st)}
                                  title={b('শিক্ষার্থীকে নোটিশ/বার্তা পাঠান', 'Send Notice/Message', lang)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                                >
                                  <Bell className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400 shrink-0" />
                                  <span>{b('Notice', 'Notice', lang)}</span>
                                </button>
                              )}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setOpenMoreId(openMoreId === st.id ? null : st.id)}
                                  aria-label={`More actions for ${st.permanentId}`}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                  <MoreVertical className="w-3.5 h-3.5 shrink-0" />
                                </button>
                                {openMoreId === st.id && (
                                  <div
                                    className={`absolute right-0 ${openUpward ? 'bottom-8' : 'top-8'} w-72 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl z-30 p-1.5 text-left space-y-0.5 text-xs`}
                                  >
                                    {onInspectStudent && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onInspectStudent(st);
                                          setOpenMoreId(null);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 font-semibold cursor-pointer text-blue-700 dark:text-blue-400"
                                      >
                                        <CreditCard className="w-3.5 h-3.5 shrink-0" />
                                        <span>{b('Quick Modal (TC ও QR ID কার্ড)', 'Quick Modal (TC & Digital ID)', lang)}</span>
                                      </button>
                                    )}
                                    {can('student:verify') && onVerifyStudent && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onVerifyStudent(st.id, b('শিক্ষার্থীর তথ্য ও জন্মনিবন্ধন যাচাইকৃত', 'Student info verified', lang));
                                          setOpenMoreId(null);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-medium cursor-pointer text-emerald-700 dark:text-emerald-400"
                                      >
                                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                        <span>{b('Verify — তথ্য ও জন্মনিবন্ধন যাচাই', 'Verify — Verify Info', lang)}</span>
                                      </button>
                                    )}
                                    {can('student:approve') && (st.status === 'pending' || st.status === 'under_review') && (
                                      isCentralPendingAdmission ? (
                                        <div className="px-2.5 py-1.5 text-[11px] rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">
                                          {b('Approve (সীমাবদ্ধ): নতুন ভর্তি অনুমোদন শুধু School Admin করবেন', 'Approve: New admission handled by School Admin', lang)}
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onUpdateStudentStatus(st.id, 'active', b('স্কুল এডমিন কর্তৃক অনুমোদিত', 'Approved by School Admin', lang));
                                            setOpenMoreId(null);
                                          }}
                                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-medium cursor-pointer text-emerald-700 dark:text-emerald-400"
                                        >
                                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                          <span>{b('Approve — ভর্তি অনুমোদন', 'Approve Admission', lang)}</span>
                                        </button>
                                      )
                                    )}
                                    {can('student:transfer') && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setTransferStudent(st);
                                          setOpenMoreId(null);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer text-slate-700 dark:text-slate-200"
                                      >
                                        <ArrowRightLeft className="w-3.5 h-3.5 shrink-0 text-indigo-700 dark:text-indigo-400" />
                                        <span>{b('Transfer — বিদ্যালয় পরিবর্তন', 'Transfer School', lang)}</span>
                                      </button>
                                    )}
                                    {can('student:reissue_id') && onReissueStudentId && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onReissueStudentId(st.id);
                                          setOpenMoreId(null);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer text-slate-700 dark:text-slate-200"
                                      >
                                        <CreditCard className="w-3.5 h-3.5 shrink-0 text-indigo-700 dark:text-indigo-400" />
                                        <span>{b('Re-issue ID — ডিজিটাল আইডি পুনঃইস্যু', 'Re-issue Digital ID', lang)}</span>
                                      </button>
                                    )}
                                    {can('student:activity_history') && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEntityModal({ kind: 'student', mode: 'history', entity: st });
                                          setOpenMoreId(null);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer text-slate-700 dark:text-slate-200"
                                      >
                                        <History className="w-3.5 h-3.5 shrink-0 text-blue-700 dark:text-blue-400" />
                                        <span>{b('Activity History — অডিট ও ইতিহাস', 'Activity History', lang)}</span>
                                      </button>
                                    )}
                                    {can('student:reports') && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEntityModal({ kind: 'student', mode: 'report', entity: st });
                                          setOpenMoreId(null);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer text-slate-700 dark:text-slate-200"
                                      >
                                        <FileBarChart2 className="w-3.5 h-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                                        <span>{b('Reports — শিক্ষার্থী রিপোর্ট', 'Reports', lang)}</span>
                                      </button>
                                    )}
                                    <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                                    {(st.status === 'suspended' || st.status === 'deactivated' || st.status === 'archived') &&
                                    (can('student:restore') || can('student:approve')) ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onUpdateStudentStatus(st.id, 'active', b('পুনরায় সক্রিয় / Restore', 'Restored to active', lang));
                                          setOpenMoreId(null);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-medium cursor-pointer"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                                        <span>{b('Restore — পুনরায় সক্রিয় করুন', 'Restore Student', lang)}</span>
                                      </button>
                                    ) : (
                                      can('student:suspend') && st.status !== 'deactivated' && st.status !== 'archived' && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setStatusModalState({ student: st, mode: 'suspend' });
                                            setOpenMoreId(null);
                                          }}
                                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-medium cursor-pointer"
                                        >
                                          <PauseCircle className="w-3.5 h-3.5 shrink-0" />
                                          <span>{b('Suspend — সাময়িকভাবে স্থগিত', 'Suspend — Temporary Suspend', lang)}</span>
                                        </button>
                                      )
                                    )}
                                    {can('student:deactivate') && st.status !== 'deactivated' && st.status !== 'archived' && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setStatusModalState({ student: st, mode: 'deactivate' });
                                          setOpenMoreId(null);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-700 dark:text-red-400 font-medium cursor-pointer"
                                      >
                                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                        <span>{b('Deactivate — স্থায়ীভাবে নিষ্ক্রিয়', 'Deactivate — Permanent Deactivate', lang)}</span>
                                      </button>
                                    )}
                                    {can('student:delete_archive') && st.status !== 'archived' && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onUpdateStudentStatus(st.id, 'archived', b('আর্কাইভ / অপসারণকৃত (Restore-যোগ্য)', 'Archived (recoverable)', lang));
                                          setOpenMoreId(null);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-700 dark:text-red-400 font-medium cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                        <span>{b('Delete / Archive — আর্কাইভ করুন', 'Delete / Archive', lang)}</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* VIEW 2: Statistics (Class 1-10 & Pre-Primary Boys/Girls, School-wise, Geo) */}
      {subView === 'statistics' && (
        <div className="space-y-5">
          {/* Class-wise Boys/Girls/Total Table (Pre-Primary to Class 10) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {b('📊 শ্রেণিভিত্তিক ছাত্র ও ছাত্রী পরিসংখ্যান (প্রাক-প্রাথমিক – ১০ম শ্রেণি)', 'Class-wise Boys & Girls Breakdown (Pre-Primary – Class 10)', lang)}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {b('এক নজরে প্রতিটি শ্রেণির ছাত্র, ছাত্রী ও মোট শিক্ষার্থীর সংখ্যা', 'At-a-glance Boys, Girls & Total enrollment across every class level', lang)}
                </p>
              </div>
              {actorRole === 'central_admin' && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <select
                    value={schoolFilter}
                    onChange={(e) => setSchoolFilter(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none cursor-pointer"
                  >
                    <option value="ALL">{b('সকল বিদ্যালয় (একত্রে)', 'All Schools Combined', lang)}</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>{s.nameBn} ({s.code})</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{b('রিসেট', 'Reset', lang)}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                    <th className="py-2.5 px-4 font-semibold">{b('শ্রেণি (Class)', 'Class', lang)}</th>
                    <th className="py-2.5 px-4 font-semibold text-right text-blue-700 dark:text-blue-400">{b('👦 ছাত্র (Boys)', 'Boys', lang)}</th>
                    <th className="py-2.5 px-4 font-semibold text-right text-rose-700 dark:text-rose-400">{b('👧 ছাত্রী (Girls)', 'Girls', lang)}</th>
                    <th className="py-2.5 px-4 font-semibold text-right">{b('👥 মোট শিক্ষার্থী (Total)', 'Total Students', lang)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {classBreakdown.map((row) => (
                    <tr key={row.className} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">{row.className}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-blue-700 dark:text-blue-400 font-semibold">{row.boys}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-rose-700 dark:text-rose-400 font-semibold">{row.girls}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums font-bold text-slate-900 dark:text-white">{row.total}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 dark:bg-slate-800/60 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                    <td className="py-2.5 px-4">{b('সর্বমোট (Pre-Primary – Class 10)', 'Grand Total', lang)}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-blue-700 dark:text-blue-400">{classTotals.boys}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-rose-700 dark:text-rose-400">{classTotals.girls}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{classTotals.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* School-wise & Division/District/Upazila Breakdowns */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                {b('🏫 বিদ্যালয়ভিত্তিক শিক্ষার্থী পরিসংখ্যান (বিদ্যালয় → ছাত্র → ছাত্রী → মোট)', 'School-wise Breakdown', lang)}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <th className="py-2.5 px-3 font-semibold">{b('বিদ্যালয়', 'School', lang)}</th>
                      <th className="py-2.5 px-2 font-semibold text-right">{b('ছাত্র', 'Boys', lang)}</th>
                      <th className="py-2.5 px-2 font-semibold text-right">{b('ছাত্রী', 'Girls', lang)}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{b('মোট', 'Total', lang)}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {schoolBreakdown.map((r) => (
                      <tr key={r.schoolId}>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">{r.schoolNameBn}</div>
                          <div className="text-[11px] text-slate-500">{r.schoolCode} · {r.upazila}, {r.district}</div>
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums font-semibold text-blue-700 dark:text-blue-400">{r.boys}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums font-semibold text-rose-700 dark:text-rose-400">{r.girls}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-bold">{r.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {actorRole === 'central_admin' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  {b('📍 বিভাগ / জেলা / উপজেলাভিত্তিক শিক্ষার্থী সংখ্যা', 'Division / District / Upazila Breakdown', lang)}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                        <th className="py-2.5 px-3 font-semibold">{b('বিভাগ › জেলা › উপজেলা', 'Division › District › Upazila', lang)}</th>
                        <th className="py-2.5 px-2 font-semibold text-right">{b('স্কুল', 'Schools', lang)}</th>
                        <th className="py-2.5 px-2 font-semibold text-right">{b('ছাত্র', 'Boys', lang)}</th>
                        <th className="py-2.5 px-2 font-semibold text-right">{b('ছাত্রী', 'Girls', lang)}</th>
                        <th className="py-2.5 px-3 font-semibold text-right">{b('মোট', 'Total', lang)}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {geoBreakdown.map((g) => (
                        <tr key={`${g.division}-${g.district}-${g.upazila}`}>
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                            {g.division} › {g.district} › <span className="text-blue-700 dark:text-blue-400">{g.upazila}</span>
                          </td>
                          <td className="py-2.5 px-2 text-right tabular-nums">{g.schoolCount}</td>
                          <td className="py-2.5 px-2 text-right tabular-nums text-blue-700 dark:text-blue-400 font-semibold">{g.boys}</td>
                          <td className="py-2.5 px-2 text-right tabular-nums text-rose-700 dark:text-rose-400 font-semibold">{g.girls}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-bold">{g.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: Student Registration Approval (School Admin), Important Profile Change & School Transfer Queue */}
      {subView === 'requests' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                {b('শিক্ষার্থী অনুমোদন, গুরুত্বপূর্ণ প্রোফাইল পরিবর্তন ও বিদ্যালয় বদলি অনুরোধ সারি', 'Student Registrations, Important Profile Changes & School Transfers', lang)}
              </h2>
              <span className="text-xs text-slate-500">
                {actorRole === 'central_admin'
                  ? b('গুরুত্বপূর্ণ পরিবর্তন ও বদলি পর্যালোচনা করুন (নতুন ভর্তি School Admin অনুমোদন করবেন)', 'Review important profile changes & transfers (admissions handled by School Admin)', lang)
                  : b('নতুন নিবন্ধন, ডকুমেন্ট যাচাই, প্রোফাইল পরিবর্তন ও বদলি পরিচালনা করুন', 'Verify registrations, documents, profile changes & transfers', lang)}
              </span>
            </div>

            {studentRequests.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">{b('কোনো অপেক্ষমান অনুরোধ নেই।', 'No requests in queue.', lang)}</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {studentRequests.map((req) => {
                  const isCentralBlockedOnReg =
                    req.category === 'new_registration' && actorRole === 'central_admin';
                  return (
                    <div key={req.id} className="py-3.5 flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{req.id}</span>
                          <span className="font-bold text-blue-700 dark:text-blue-400">
                            {b(req.titleBn, req.titleEn, lang)}
                          </span>
                          <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${statusTone(req.status)}`}>
                            {req.status}
                          </span>
                        </div>
                        <div className="text-slate-700 dark:text-slate-300">
                          <span className="font-semibold">{req.studentNameBn}</span> ({req.permanentId}) · {req.schoolNameBn}
                        </div>
                        <div className="text-slate-500">
                          {req.currentValue} → <span className="font-semibold text-indigo-700 dark:text-indigo-300">{req.proposedValue}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {b('আবেদনকারী:', 'Requested by:', lang)} {req.requestedBy} · {req.submittedAt} · {req.reason}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            openProfile(
                              req.studentId,
                              req.category === 'new_registration'
                                ? 'documents'
                                : req.category === 'school_transfer'
                                  ? 'school_info'
                                  : 'approval_history'
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{b('প্রোফাইল / ডকুমেন্ট দেখুন', 'Inspect Profile / Docs', lang)}</span>
                        </button>

                        {(req.status === 'pending' || req.status === 'under_review') &&
                          (isCentralBlockedOnReg ? (
                            <span className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                              {b('স্কুল এডমিন দ্বারা অনুমোদনযোগ্য', 'School Admin Approval Only', lang)}
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  onProcessStudentRequest(
                                    req.id,
                                    'approved',
                                    b('তথ্য যাচাই শেষে অনুমোদিত', 'Verified & approved', lang)
                                  )
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                              >
                                {b('Approve', 'Approve', lang)}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onProcessStudentRequest(
                                    req.id,
                                    'under_review',
                                    b('অধিকতর যাচাইয়ের জন্য পর্যালোচনাধীন', 'Moved to under review', lang)
                                  )
                                }
                                className="px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold cursor-pointer"
                              >
                                {b('Pending / Review', 'Review', lang)}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onProcessStudentRequest(
                                    req.id,
                                    'rejected',
                                    b('তথ্য অসংগতির কারণে প্রত্যাখ্যাত', 'Rejected due to discrepancy', lang)
                                  )
                                }
                                className="px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 font-semibold cursor-pointer"
                              >
                                {b('Reject', 'Reject', lang)}
                              </button>
                            </>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Governance Modals */}
      <StudentEditModal
        student={editingStudent}
        lang={lang}
        onClose={() => setEditingStudent(null)}
        onSave={onEditStudent}
      />
      <StudentTransferModal
        student={transferStudent}
        schools={schools}
        lang={lang}
        onClose={() => setTransferStudent(null)}
        onTransfer={onTransferStudent}
      />
      <StudentNoticeModal
        student={noticeStudent}
        lang={lang}
        senderLabel={senderLabel}
        onClose={() => setNoticeStudent(null)}
        onSend={onSendStudentNotice}
      />
      <StudentSuspensionDeactivationModal
        state={statusModalState}
        lang={lang}
        onClose={() => setStatusModalState(null)}
        onConfirm={onUpdateStudentStatus}
      />
      <EntityReportAndActivityModal
        target={entityModal}
        lang={lang}
        auditLogs={auditLogs}
        onClose={() => setEntityModal(null)}
      />
      <QrStickerPrintModal
        isOpen={qrStickersOpen}
        lang={lang}
        school={ownSchool ?? schools.find((sc) => sc.id === (visibleStudents[0]?.schoolId ?? schools[0]?.id))}
        schoolId={ownSchool?.id ?? visibleStudents[0]?.schoolId ?? schools[0]?.id ?? 'SCH-001'}
        schoolNameBn={ownSchool?.nameBn ?? schools[0]?.nameBn ?? 'বিদ্যালয়'}
        students={visibleStudents}
        initialClassFilter={classFilter === 'ALL' ? 'All' : classFilter}
        onClose={() => setQrStickersOpen(false)}
      />
    </div>
  );
};
