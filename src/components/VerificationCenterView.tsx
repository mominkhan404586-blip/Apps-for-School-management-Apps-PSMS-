import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  CopyCheck,
  FileCheck2,
  Fingerprint,
  GraduationCap,
  MapPin,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type {
  ApprovalRequest,
  Language,
  SchoolRecord,
  StudentChangeRequest,
  StudentRecord,
  TeacherChangeRequest,
  TeacherRecord,
  VerificationCategoryId,
  VerificationStatus,
} from '../types';
import { b } from '../i18n/translations';
import {
  buildVerificationQueue,
  computePipelineStage,
  detectDuplicateRecords,
  VERIFICATION_CATEGORIES,
  type VerificationQueueItem,
} from '../utils/governanceAndVerification';

interface VerificationCenterViewProps {
  lang: Language;
  schools: SchoolRecord[];
  teachers: TeacherRecord[];
  students: StudentRecord[];
  requests: ApprovalRequest[];
  teacherRequests: TeacherChangeRequest[];
  studentRequests: StudentChangeRequest[];
  canVerify: boolean;
  onVerifyItem: (
    item: VerificationQueueItem,
    decision: 'verified' | 'flagged',
    note: string
  ) => void;
  onNavigateApprovalCenter: () => void;
}

export const VerificationCenterView: React.FC<VerificationCenterViewProps> = ({
  lang,
  schools,
  teachers,
  students,
  requests,
  teacherRequests,
  studentRequests,
  canVerify,
  onVerifyItem,
  onNavigateApprovalCenter,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | VerificationCategoryId>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | VerificationStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [duplicateScanRanAt, setDuplicateScanRanAt] = useState<string | null>(null);

  const queue = useMemo(
    () =>
      buildVerificationQueue(
        schools,
        teachers,
        students,
        requests,
        teacherRequests,
        studentRequests
      ),
    [schools, teachers, students, requests, teacherRequests, studentRequests]
  );

  const duplicateSignals = useMemo(
    () => detectDuplicateRecords(schools, teachers, students),
    [schools, teachers, students]
  );

  const categoryIcons: Record<VerificationCategoryId, React.ElementType> = {
    school: Building2,
    teacher: UserCheck,
    student: GraduationCap,
    document: FileCheck2,
    address_location: MapPin,
    id_check: Fingerprint,
    duplicate_check: CopyCheck,
    critical_info: ShieldAlert,
  };

  const filteredQueue = queue.filter((item) => {
    const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchStatus = statusFilter === 'ALL' || item.verificationStatus === statusFilter;
    const q = searchTerm.trim().toLowerCase();
    const matchSearch =
      !q ||
      item.titleBn.toLowerCase().includes(q) ||
      item.titleEn.toLowerCase().includes(q) ||
      item.identifierLabel.toLowerCase().includes(q) ||
      item.schoolName.toLowerCase().includes(q);
    return matchCat && matchStatus && matchSearch;
  });

  const verifiedCount = queue.filter((i) => i.verificationStatus === 'verified').length;
  const pendingCount = queue.filter((i) => i.verificationStatus === 'pending' || i.verificationStatus === 'unverified').length;
  const flaggedCount = queue.filter((i) => i.verificationStatus === 'flagged').length;

  const badgeClass = (st: VerificationStatus) => {
    switch (st) {
      case 'verified':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'flagged':
        return 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
      default:
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header + 4-Stage Pipeline */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
              {b('Central Verification Center (কেন্দ্রীয় তথ্য ও নথি যাচাই কেন্দ্র)', 'Central Verification Center', lang)}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {b(
                'Verification = তথ্য/ডকুমেন্ট সঠিক কি না যাচাই করা। Approval = যাচাই শেষে অনুমোদনের সিদ্ধান্ত দেওয়া। এখানে শুধুমাত্র যাচাই সম্পন্ন হবে; চূড়ান্ত অনুমোদন Approval Center থেকে দেওয়া হবে।',
                'Verification validates record & document accuracy independently before Approval decisions are made.',
                lang
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateApprovalCenter}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 cursor-pointer"
          >
            <span>{b('Approval Center-এ যান', 'Go to Approval Center', lang)}</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>

        {/* 4-Stage Workflow Stepper Banner */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          {[
            { step: '১. Request', titleEn: '1. Request Submitted', descBn: 'আবেদন ও তথ্য দাখিল', active: false },
            { step: '২. Verification', titleEn: '2. Verification (Here)', descBn: 'তথ্য/ডকুমেন্ট/ID/Duplicate যাচাই', active: true },
            { step: '৩. Approval', titleEn: '3. Approval Decision', descBn: 'যাচাই শেষে অনুমোদনের সিদ্ধান্ত', active: false },
            { step: '৪. Final Action', titleEn: '4. Final Action', descBn: 'সক্রিয় / বদলি / স্থগিত কার্যকর', active: false },
          ].map((st) => (
            <div
              key={st.step}
              className={`rounded-xl border p-3 ${
                st.active
                  ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
              }`}
            >
              <div className={`font-bold ${st.active ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-900 dark:text-white'}`}>
                {b(st.step, st.titleEn, lang)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{st.descBn}</div>
            </div>
          ))}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <div className="text-slate-500">{b('মোট যাচাইযোগ্য রেকর্ড', 'Total Verifiable Items', lang)}</div>
            <div className="text-xl font-bold tabular-nums mt-0.5">{queue.length}</div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900">
            <div className="text-emerald-700 dark:text-emerald-400">{b('যাচাই সম্পন্ন (Verified)', 'Verified', lang)}</div>
            <div className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5">{verifiedCount}</div>
          </div>
          <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
            <div className="text-amber-700 dark:text-amber-400">{b('যাচাই অপেক্ষমান (Pending)', 'Pending Verification', lang)}</div>
            <div className="text-xl font-bold tabular-nums text-amber-700 dark:text-amber-400 mt-0.5">{pendingCount}</div>
          </div>
          <div className="p-3 rounded-lg bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
            <div className="text-red-700 dark:text-red-400">{b('অসংগতি / ডুপ্লিকেট (Flagged)', 'Flagged / Duplicates', lang)}</div>
            <div className="text-xl font-bold tabular-nums text-red-700 dark:text-red-400 mt-0.5">
              {flaggedCount + duplicateSignals.length}
            </div>
          </div>
        </div>
      </div>

      {!canVerify && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-4 text-xs text-amber-900 dark:text-amber-200 font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {b(
              'Permission Restriction: বর্তমান অ্যাক্টিভ অ্যাডমিন রোলের জন্য "verification:verify" অনুমতি বন্ধ রয়েছে। Permission System থেকে চালু করুন।',
              'Permission Restriction: Active role lacks "verification:verify" permission. Enable it in Permission System.',
              lang
            )}
          </span>
        </div>
      )}

      {/* 8 Verification Modules Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2.5 text-xs">
        {VERIFICATION_CATEGORIES.map((cat) => {
          const Icon = categoryIcons[cat.id];
          const count =
            cat.id === 'duplicate_check'
              ? duplicateSignals.length
              : queue.filter((i) => i.category === cat.id).length;
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(active ? 'ALL' : cat.id)}
              className={`text-left p-3 rounded-xl border transition-colors cursor-pointer space-y-1.5 ${
                active
                  ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`} />
                <span className="font-mono font-bold tabular-nums text-[11px] text-slate-500">{count}</span>
              </div>
              <div className="font-bold text-slate-900 dark:text-white leading-snug">
                {b(cat.labelBn, cat.labelEn, lang)}
              </div>
            </button>
          );
        })}
      </div>

      {/* Duplicate Screening Special View */}
      {selectedCategory === 'duplicate_check' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('Duplicate যাচাই — EIIN, জন্মনিবন্ধন, NID ও মোবাইল ক্রস-চেক', 'Duplicate Screening Engine', lang)}
              </h2>
              <p className="text-slate-500 mt-0.5">
                {b(
                  `সকল ${schools.length}টি বিদ্যালয়, ${teachers.length}জন শিক্ষক ও ${students.length}জন শিক্ষার্থীর তথ্য স্ক্যান করা হয়েছে।`,
                  `Scanned ${schools.length} schools, ${teachers.length} teachers, and ${students.length} students.`,
                  lang
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDuplicateScanRanAt(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))}
              className="px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
            >
              {b('নতুন Duplicate স্ক্যান চালান', 'Run Live Duplicate Scan', lang)}
            </button>
          </div>
          {duplicateScanRanAt && (
            <div className="text-emerald-700 dark:text-emerald-400 font-semibold">
              ✓ {b(`সর্বশেষ ডুপ্লিকেট স্ক্যান সম্পন্ন (${duplicateScanRanAt})`, `Last scan completed at ${duplicateScanRanAt}`, lang)}
            </div>
          )}
          {duplicateSignals.length === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {b(
                  'কোনো ডুপ্লিকেট EIIN, জন্মনিবন্ধন বা শিক্ষক মোবাইল নম্বর পাওয়া যায়নি। সব রেকর্ড ইউনিক।',
                  'Zero duplicate EIIN, Birth Reg No, or Teacher Mobile records detected.',
                  lang
                )}
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {duplicateSignals.map((sig) => (
                <div key={sig.id} className="p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-950/20 space-y-2">
                  <div className="font-bold text-red-800 dark:text-red-300">
                    {b(sig.fieldLabelBn, sig.fieldLabelEn, lang)}: <span className="font-mono">{sig.duplicateValue}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sig.matchedEntities.map((m) => (
                      <span key={m.id} className="px-2.5 py-1 rounded bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 font-mono">
                        {m.code} — {m.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-3 text-xs">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={b('নাম, ID বা বিদ্যালয় দিয়ে খুঁজুন...', 'Search by name, ID, or school...', lang)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as 'ALL' | VerificationCategoryId)}
              aria-label="Filter by verification category"
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold cursor-pointer"
            >
              <option value="ALL">{b('সকল ৮টি যাচাই মডিউল', 'All 8 Verification Modules', lang)}</option>
              {VERIFICATION_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {b(c.labelBn, c.labelEn, lang)}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | VerificationStatus)}
              aria-label="Filter by verification status"
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold cursor-pointer"
            >
              <option value="ALL">{b('সকল অবস্থা', 'All Verification Status', lang)}</option>
              <option value="pending">{b('অপেক্ষমান (Pending)', 'Pending', lang)}</option>
              <option value="verified">{b('যাচাই সম্পন্ন (Verified)', 'Verified', lang)}</option>
              <option value="flagged">{b('অসংগতি (Flagged)', 'Flagged', lang)}</option>
              <option value="unverified">{b('অযাচাইকৃত (Unverified)', 'Unverified', lang)}</option>
            </select>
          </div>

          {/* Verification Queue Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
            {filteredQueue.length === 0 ? (
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-500">
                {b('নির্বাচিত ফিল্টারে কোনো যাচাইযোগ্য রেকর্ড নেই।', 'No verification items match the selected filters.', lang)}
              </div>
            ) : (
              filteredQueue.map((item) => {
                const catMeta = VERIFICATION_CATEGORIES.find((c) => c.id === item.category)!;
                const stage = computePipelineStage({
                  verificationStatus: item.verificationStatus,
                  approvalStatus: item.approvalStatus,
                  entityStatus: item.entityStatus,
                });
                const noteVal = notesById[item.id] ?? '';

                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">
                            {b(catMeta.labelBn, catMeta.labelEn, lang)}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="font-mono text-slate-500">{item.identifierLabel}</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {b(item.titleBn, item.titleEn, lang)}
                        </h3>
                        <p className="text-slate-500 truncate">
                          {item.subtitle} · {item.schoolName}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold shrink-0 ${badgeClass(item.verificationStatus)}`}>
                        {item.verificationStatus}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="text-slate-700 dark:text-slate-300 font-medium">{item.evidenceSummary}</div>
                      {item.verifiedBy && (
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          {b('যাচাইকারী:', 'Verified by:', lang)} {item.verifiedBy}
                        </div>
                      )}
                      {item.verificationNote && (
                        <div className="text-[11px] text-slate-500">Note: {item.verificationNote}</div>
                      )}
                    </div>

                    {/* 4-Stage Pipeline Indicator */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        Pipeline: {b(stage.labelBn, stage.labelEn, lang)}
                      </span>
                      <span className="text-slate-500">
                        Approval: <span className="font-mono font-semibold">{item.approvalStatus}</span>
                      </span>
                    </div>

                    {canVerify && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <input
                          type="text"
                          value={noteVal}
                          onChange={(e) => setNotesById((p) => ({ ...p, [item.id]: e.target.value }))}
                          placeholder={b('যাচাই মন্তব্য লিখুন (ঐচ্ছিক)...', 'Verification note...', lang)}
                          className="flex-1 min-w-[160px] h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            onVerifyItem(
                              item,
                              'verified',
                              noteVal.trim() || b('তথ্য ও ডকুমেন্ট সঠিক পাওয়া গেছে', 'Information & documents verified accurate', lang)
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold whitespace-nowrap cursor-pointer"
                        >
                          ✓ {b('Verify (তথ্য সঠিক)', 'Verify Info', lang)}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onVerifyItem(
                              item,
                              'flagged',
                              noteVal.trim() || b('নথি বা তথ্যে অসংগতি চিহ্নিত', 'Discrepancy flagged during verification', lang)
                            )
                          }
                          className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 font-semibold whitespace-nowrap cursor-pointer"
                        >
                          {b('Flag Issue', 'Flag Issue', lang)}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};
