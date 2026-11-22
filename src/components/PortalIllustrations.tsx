import React, { useMemo, useState } from 'react';
import {
  Check,
  Eye,
  Printer,
  RefreshCw,
  Rocket,
  Search,
  X,
  FileText,
} from 'lucide-react';
import type { ApprovalRequest, Language, SchoolRecord } from '../types';
import { b } from '../i18n/translations';

/** Architectural School Campus SVG for School Admin Hero Banner */
export const SchoolCampusIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 260 130"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Sky / Clouds */}
    <ellipse cx="52" cy="24" rx="20" ry="8" fill="white" fillOpacity="0.22" />
    <ellipse cx="215" cy="28" rx="22" ry="9" fill="white" fillOpacity="0.18" />
    {/* Ground & Lawn */}
    <path d="M0 112 C60 100 190 100 260 114 L260 130 L0 130 Z" fill="#10B981" fillOpacity="0.35" />
    <rect x="0" y="114" width="260" height="16" fill="#047857" fillOpacity="0.45" />
    {/* Left & Right Trees */}
    <rect x="26" y="88" width="5" height="26" rx="2" fill="#78350F" fillOpacity="0.7" />
    <circle cx="28.5" cy="78" r="15" fill="#34D399" fillOpacity="0.85" />
    <circle cx="20" cy="84" r="10" fill="#10B981" fillOpacity="0.85" />
    <rect x="228" y="86" width="5" height="28" rx="2" fill="#78350F" fillOpacity="0.7" />
    <circle cx="230.5" cy="76" r="16" fill="#34D399" fillOpacity="0.85" />
    {/* School Side Wings */}
    <rect x="52" y="64" width="44" height="50" rx="3" fill="#F8FAFC" fillOpacity="0.95" />
    <rect x="164" y="64" width="44" height="50" rx="3" fill="#F8FAFC" fillOpacity="0.95" />
    <path d="M48 64 L74 48 L100 64 Z" fill="#1D4ED8" />
    <path d="M160 64 L186 48 L212 64 Z" fill="#1D4ED8" />
    {/* Side Windows */}
    <rect x="61" y="73" width="10" height="11" rx="1.5" fill="#93C5FD" />
    <rect x="77" y="73" width="10" height="11" rx="1.5" fill="#93C5FD" />
    <rect x="61" y="90" width="10" height="11" rx="1.5" fill="#93C5FD" />
    <rect x="77" y="90" width="10" height="11" rx="1.5" fill="#93C5FD" />
    <rect x="173" y="73" width="10" height="11" rx="1.5" fill="#93C5FD" />
    <rect x="189" y="73" width="10" height="11" rx="1.5" fill="#93C5FD" />
    <rect x="173" y="90" width="10" height="11" rx="1.5" fill="#93C5FD" />
    <rect x="189" y="90" width="10" height="11" rx="1.5" fill="#93C5FD" />
    {/* Center Main Building */}
    <rect x="92" y="46" width="76" height="68" rx="3" fill="#FFFFFF" />
    <path d="M86 46 L130 22 L174 46 Z" fill="#1E40AF" />
    {/* Clock & Flagpole */}
    <circle cx="130" cy="36" r="6" fill="#EFF6FF" stroke="#1D4ED8" strokeWidth="1.5" />
    <line x1="130" y1="36" x2="130" y2="33" stroke="#1E3A8A" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="130" y1="36" x2="133" y2="36" stroke="#1E3A8A" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="130" y1="8" x2="130" y2="22" stroke="#E2E8F0" strokeWidth="2" />
    <rect x="130" y="9" width="18" height="11" rx="1" fill="#006A4E" />
    <circle cx="138" cy="14.5" r="3.2" fill="#F42A41" />
    {/* Center Windows & Door */}
    <rect x="103" y="56" width="12" height="13" rx="1.5" fill="#60A5FA" />
    <rect x="124" y="56" width="12" height="13" rx="1.5" fill="#60A5FA" />
    <rect x="145" y="56" width="12" height="13" rx="1.5" fill="#60A5FA" />
    <rect x="119" y="84" width="22" height="30" rx="2" fill="#1E3A8A" />
    <rect x="123" y="88" width="6" height="26" rx="1" fill="#3B82F6" />
    <rect x="131" y="88" width="6" height="26" rx="1" fill="#3B82F6" />
  </svg>
);

/** Graduation Cap + Stacked Books SVG for Student & Guardian Welcome Banner */
export const StudentBooksIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 240 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Rolling Campus Hills */}
    <path d="M0 104 C55 82 140 86 240 100 L240 120 L0 120 Z" fill="#10B981" fillOpacity="0.4" />
    <path d="M90 108 C145 88 200 92 240 104 L240 120 L90 120 Z" fill="#059669" fillOpacity="0.55" />
    {/* Book Stack */}
    <rect x="52" y="84" width="112" height="16" rx="3" fill="#2563EB" />
    <rect x="56" y="87" width="96" height="10" rx="1.5" fill="#DBEAFE" />
    <rect x="62" y="67" width="102" height="16" rx="3" fill="#0EA5E9" />
    <rect x="66" y="70" width="88" height="10" rx="1.5" fill="#E0F2FE" />
    <rect x="70" y="51" width="94" height="15" rx="3" fill="#10B981" />
    <rect x="74" y="54" width="78" height="9" rx="1.5" fill="#ECFDF5" />
    {/* Graduation Cap on Top */}
    <polygon points="118,16 170,32 118,48 66,32" fill="#1E293B" />
    <path d="M88 38 L88 50 C88 54 148 54 148 50 L148 38 Z" fill="#334155" />
    <line x1="164" y1="33" x2="164" y2="52" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="164" cy="54" r="3.5" fill="#F59E0B" />
    {/* Decorative Sparkles */}
    <circle cx="38" cy="40" r="3" fill="white" fillOpacity="0.45" />
    <circle cx="204" cy="36" r="4" fill="white" fillOpacity="0.35" />
  </svg>
);

/** Trophy Spotlight Illustration for Exam & Results Cards */
export const AchievementTrophyIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 120 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path d="M10 86 C40 74 80 74 110 88 L110 100 L10 100 Z" fill="#10B981" fillOpacity="0.22" />
    {/* Cup Handles */}
    <path d="M36 26 C24 26 24 46 38 48" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" />
    <path d="M84 26 C96 26 96 46 82 48" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" />
    {/* Trophy Body */}
    <path d="M36 18 H84 V42 C84 56 73 65 60 65 C47 65 36 56 36 42 V18 Z" fill="#FBBF24" />
    <path d="M44 22 H56 V44 C56 50 54 55 50 58 C46 53 44 48 44 42 V22 Z" fill="#FEF3C7" fillOpacity="0.65" />
    {/* Stem & Pedestal */}
    <rect x="55" y="64" width="10" height="14" fill="#D97706" />
    <rect x="40" y="78" width="40" height="8" rx="2" fill="#B45309" />
    <rect x="34" y="86" width="52" height="6" rx="2" fill="#92400E" />
    {/* Star */}
    <polygon points="60,27 63,34 70,34 64,39 66,46 60,42 54,46 56,39 50,34 57,34" fill="#FFFFFF" />
  </svg>
);

interface ApplicationStatusTrackerModalProps {
  open: boolean;
  lang: Language;
  schools: SchoolRecord[];
  requests: ApprovalRequest[];
  initialQuery?: string;
  onClose: () => void;
  onViewSchoolInWorkspace?: (schoolId: string) => void;
}

/** Application Status Tracker matching the reference Status Pipeline Card */
export const ApplicationStatusTrackerModal: React.FC<ApplicationStatusTrackerModalProps> = ({
  open,
  lang,
  schools,
  requests,
  initialQuery = '',
  onClose,
  onViewSchoolInWorkspace,
}) => {
  const [query, setQuery] = useState(initialQuery || (requests[0]?.id ?? schools[0]?.code ?? ''));
  const [refreshTick, setRefreshTick] = useState(0);
  const [showFullNotes, setShowFullNotes] = useState(false);

  const matched = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchedReq =
      requests.find(
        (r) =>
          r.id.toLowerCase() === q ||
          r.schoolId.toLowerCase() === q ||
          r.schoolName.toLowerCase().includes(q)
      ) ?? requests[0];
    const matchedSchool =
      schools.find(
        (s) =>
          s.code.toLowerCase() === q ||
          (s.registrationId ?? '').toLowerCase() === q ||
          s.id.toLowerCase() === q ||
          s.nameBn.toLowerCase().includes(q) ||
          s.nameEn.toLowerCase().includes(q) ||
          (matchedReq && s.id === matchedReq.schoolId)
      ) ?? schools[0];
    return { req: matchedReq, school: matchedSchool };
  }, [query, requests, schools, refreshTick]);

  if (!open) return null;

  const status = matched.school?.status ?? matched.req?.status ?? 'under_review';
  const currentStep =
    status === 'verified' || status === 'approved' || status === 'active'
      ? 4
      : status === 'under_review' || status === 'revision_requested'
        ? 2
        : 1;

  const steps = [
    {
      num: 1,
      labelBn: 'অনুরোধ প্রেরিত',
      labelEn: 'Request Sent',
      date: matched.school?.registrationDate ?? '2026-11-17',
      icon: Check,
    },
    {
      num: 2,
      labelBn: 'পর্যালোচনাধীন',
      labelEn: 'Under Review',
      date: matched.req?.submittedAt ?? matched.school?.registrationDate ?? '2026-11-17',
      icon: Search,
    },
    {
      num: 3,
      labelBn: 'অনুমোদিত',
      labelEn: 'Approved',
      date: currentStep >= 3 ? matched.school?.verifiedDate ?? '2026-11-18' : '',
      icon: Check,
    },
    {
      num: 4,
      labelBn: 'অ্যাকটিভ',
      labelEn: 'Active',
      date: currentStep >= 4 ? matched.school?.verifiedDate ?? '2026-11-18' : '',
      icon: Rocket,
    },
  ];

  const statusHeadline =
    currentStep >= 4
      ? b('আপনার আবেদনটি অনুমোদিত ও বর্তমানে সক্রিয় রয়েছে।', 'Your application is approved and currently active.', lang)
      : status === 'revision_requested'
        ? b('সংশোধনের জন্য ফেরত পাঠানো হয়েছে — দয়া করে তথ্য হালনাগাদ করুন।', 'Returned for revision — please update application details.', lang)
        : currentStep === 2
          ? b('আপনার অনুরোধটি বর্তমানে পর্যালোচনাধীন রয়েছে।', 'Your request is currently under review.', lang)
          : b('আপনার আবেদনটি সফলভাবে জমা হয়েছে এবং যাচাইয়ের অপেক্ষায় রয়েছে।', 'Your application has been submitted and awaits verification.', lang);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-status-tracker-title"
        className="w-full max-w-2xl rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
      >
        {/* Royal Blue Gradient Header */}
        <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 id="app-status-tracker-title" className="text-base sm:text-lg font-bold">
                {b('আপনার অনুরোধের বর্তমান অবস্থা', 'Current Application Status', lang)}
              </h3>
              <p className="text-[11px] text-blue-100">
                {b('অনলাইন স্কুল ও শিক্ষক নিবন্ধন ট্র্যাকার', 'Online School & Registration Tracker', lang)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={b('বন্ধ করুন', 'Close', lang)}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto text-xs">
          {/* Quick Search Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={b('Request ID বা School Code লিখুন (যেমন: GPS-1042, REQ-901)', 'Enter Request ID or School Code (e.g. GPS-1042)', lang)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-600"
              />
            </div>
            <select
              aria-label={b('দ্রুত বিদ্যালয় নির্বাচন', 'Quick select school', lang)}
              value={matched.school?.code ?? ''}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold outline-none cursor-pointer"
            >
              {schools.map((sc) => (
                <option key={sc.id} value={sc.code}>
                  {sc.code} · {sc.nameBn}
                </option>
              ))}
            </select>
          </div>

          {/* 4-Step Pipeline */}
          <div className="grid grid-cols-4 gap-2 pt-2 pb-1 relative">
            {steps.map((st, idx) => {
              const Icon = st.icon;
              const isDone = st.num <= currentStep;
              const isCurrent = st.num === currentStep;
              return (
                <div key={st.num} className="relative flex flex-col items-center text-center">
                  {idx < steps.length - 1 && (
                    <div
                      className={`hidden sm:block absolute top-5 left-[55%] w-[90%] h-0.5 ${
                        st.num < currentStep
                          ? 'bg-blue-600'
                          : 'border-t-2 border-dashed border-slate-300 dark:border-slate-700 bg-transparent'
                      }`}
                    />
                  )}
                  <div
                    className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isDone
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400'
                    } ${isCurrent ? 'ring-4 ring-blue-100 dark:ring-blue-950/60' : ''}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div
                    className={`mt-2 font-bold text-xs ${
                      isDone ? 'text-blue-800 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {b(st.labelBn, st.labelEn, lang)}
                  </div>
                  {st.date && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                      {st.date}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Status Notice Box */}
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800 px-4 py-3 flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                {statusHeadline}
              </div>
              <p className="text-emerald-800 dark:text-emerald-300 mt-0.5">
                {b(
                  'অনুগ্রহ করে হালনাগাদ তথ্যের জন্য অনুরোধ নম্বর সংরক্ষণ করুন।',
                  'Please keep your request reference number for status updates.',
                  lang
                )}
              </p>
            </div>
          </div>

          {/* Request Details Box */}
          {matched.school && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="bg-blue-50/80 dark:bg-blue-950/30 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
                <FileText className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                {b('অনুরোধের বিস্তারিত তথ্য', 'Application Details', lang)}
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 bg-white dark:bg-slate-900">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">{b('অনুরোধ / কোড নম্বর', 'Request / Code', lang)}</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {matched.req?.id ?? matched.school.registrationId} · {matched.school.code}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">{b('ইমেইল', 'Email', lang)}</span>
                  <span className="font-medium text-slate-900 dark:text-white">{matched.school.email}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">{b('স্কুলের নাম', 'School Name', lang)}</span>
                  <span className="font-semibold text-slate-900 dark:text-white text-right">
                    {b(matched.school.nameBn, matched.school.nameEn, lang)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">{b('মোবাইল', 'Mobile', lang)}</span>
                  <span className="font-mono text-slate-900 dark:text-white">{matched.school.mobile}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">{b('স্কুলের ধরন', 'School Type', lang)}</span>
                  <span className="text-slate-900 dark:text-white">{matched.school.schoolType}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">{b('আবেদনের তারিখ', 'Submitted Date', lang)}</span>
                  <span className="tabular-nums text-slate-900 dark:text-white">
                    {matched.school.registrationDate}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">{b('জেলা / উপজেলা', 'District / Upazila', lang)}</span>
                  <span className="text-slate-900 dark:text-white">
                    {matched.school.district}, {matched.school.upazila}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">{b('সর্বশেষ আপডেট', 'Last Updated', lang)}</span>
                  <span className="tabular-nums text-slate-900 dark:text-white">
                    {matched.school.verifiedDate || matched.school.registrationDate}
                  </span>
                </div>
              </div>
              {showFullNotes && (
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {b('প্রধান শিক্ষক ও নথিপত্র:', 'Head Teacher & Submitted Documents:', lang)}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    {matched.school.headTeacher} · {matched.school.documents.join(', ')}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                if (onViewSchoolInWorkspace && matched.school) {
                  onViewSchoolInWorkspace(matched.school.id);
                  onClose();
                } else {
                  setShowFullNotes((v) => !v);
                }
              }}
              className="h-10 px-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 font-semibold flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              {b('অনুরোধ দেখুন', 'View Request', lang)}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              {b('প্রিন্ট করুন', 'Print Status', lang)}
            </button>
            <button
              type="button"
              onClick={() => setRefreshTick((t) => t + 1)}
              className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              {b('অবস্থা আপডেট করুন', 'Refresh Status', lang)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
