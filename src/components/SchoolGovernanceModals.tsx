import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  PauseCircle,
  ShieldAlert,
  UserCog,
  X,
} from 'lucide-react';
import type {
  Language,
  NoticeItem,
  SchoolAdminMember,
  SchoolCategory,
  SchoolDeactivationRecord,
  SchoolInspectionRecord,
  SchoolRecord,
  SchoolSuspensionDetails,
  SchoolTypeCode,
} from '../types';
import { b } from '../i18n/translations';
import { SCHOOL_TYPE_OPTIONS } from '../utils/schoolConfigAndAddress';
import {
  isDeactivationChecklistValid,
  type AdminManagementMode,
  type AdminManagementPayload,
  type SchoolEditPatch,
} from '../utils/schoolLifecycle';

const CATEGORY_OPTIONS: SchoolCategory[] = [
  'Government',
  'Private',
  'MPO',
  'Kindergarten',
  'Madrasa',
  'NGO',
];

const PERMISSION_OPTIONS = [
  { id: 'students', labelBn: 'শিক্ষার্থী ব্যবস্থাপনা', labelEn: 'Students' },
  { id: 'teachers', labelBn: 'শিক্ষক ব্যবস্থাপনা', labelEn: 'Teachers' },
  { id: 'attendance', labelBn: 'হাজিরা ও Kiosk', labelEn: 'Attendance' },
  { id: 'exams', labelBn: 'পরীক্ষা পরিচালনা', labelEn: 'Exams' },
  { id: 'results', labelBn: 'ফলাফল প্রকাশ', labelEn: 'Results' },
  { id: 'fees', labelBn: 'ফি ও হিসাব', labelEn: 'Fees' },
  { id: 'notices', labelBn: 'নোটিশ ও SMS', labelEn: 'Notices' },
];

// 1. Edit School Information Modal
export const EditSchoolModal: React.FC<{
  school: SchoolRecord | null;
  lang: Language;
  onClose: () => void;
  onSave: (schoolId: string, patch: SchoolEditPatch) => void;
}> = ({ school, lang, onClose, onSave }) => {
  const [form, setForm] = useState<SchoolEditPatch>({
    nameBn: '',
    nameEn: '',
    registrationId: '',
    code: '',
    eiin: '',
    mobile: '',
    email: '',
    cluster: '',
    division: '',
    district: '',
    upazila: '',
    union: '',
    village: '',
    fullAddress: '',
    gpsLat: '',
    gpsLng: '',
    schoolType: 'PRIMARY',
    customSchoolType: '',
    educationLevel: '',
    category: 'Government',
    establishedYear: '',
    headTeacher: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (school) {
      setForm({
        nameBn: school.nameBn,
        nameEn: school.nameEn,
        registrationId: school.registrationId ?? `REG-2026-${school.code}`,
        code: school.code,
        eiin: school.eiin,
        mobile: school.mobile,
        email: school.email,
        cluster: school.cluster,
        division: school.division,
        district: school.district,
        upazila: school.upazila,
        union: school.union,
        village: school.village,
        fullAddress: school.fullAddress,
        gpsLat: school.gpsLat ?? '',
        gpsLng: school.gpsLng ?? '',
        schoolType: school.schoolType,
        customSchoolType: school.customSchoolType ?? '',
        educationLevel: school.educationLevel ?? school.classRange,
        category: school.category ?? 'Government',
        establishedYear: school.establishedYear ?? '2000',
        headTeacher: school.headTeacher,
      });
      setError('');
    }
  }, [school]);

  if (!school) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nameBn.trim() || !form.code.trim() || !form.mobile.trim()) {
      setError(b('বিদ্যালয়ের নাম, কোড এবং মোবাইল নম্বর আবশ্যক।', 'School name, code, and mobile are required.', lang));
      return;
    }
    onSave(school.id, form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-school-modal-title"
        className="w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl"
      >
        <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <div>
              <h3 id="edit-school-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                {b('বিদ্যালয়ের তথ্য পরিবর্তন (Edit School Information)', 'Edit School Information', lang)}
              </h3>
              <p className="text-xs text-slate-500">{school.nameBn} ({school.code})</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 text-xs">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-medium">
                {error}
              </div>
            )}

            {/* Names & Codes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">{b('বিদ্যালয়ের নাম (বাংলা) *', 'School Name (Bangla) *', lang)}</label>
                <input
                  type="text"
                  value={form.nameBn}
                  onChange={(e) => setForm((p) => ({ ...p, nameBn: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('বিদ্যালয়ের নাম (ইংরেজি)', 'School Name (English)', lang)}</label>
                <input
                  type="text"
                  value={form.nameEn}
                  onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('Registration ID', 'Registration ID', lang)}</label>
                <input
                  type="text"
                  value={form.registrationId}
                  onChange={(e) => setForm((p) => ({ ...p, registrationId: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">School Code *</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">EIIN</label>
                  <input
                    type="text"
                    value={form.eiin}
                    onChange={(e) => setForm((p) => ({ ...p, eiin: e.target.value }))}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Type, Education Level, Category, Head */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block font-semibold mb-1">{b('বিদ্যালয়ের ধরন', 'School Type', lang)}</label>
                <select
                  value={form.schoolType}
                  onChange={(e) => setForm((p) => ({ ...p, schoolType: e.target.value as SchoolTypeCode }))}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {SCHOOL_TYPE_OPTIONS.map((o) => (
                    <option key={o.code} value={o.code}>
                      {b(o.labelBn, o.labelEn, lang)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('শ্রেণি / ক্যাটাগরি', 'Institution Category', lang)}</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as SchoolCategory }))}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('শিক্ষা স্তর', 'Education Level', lang)}</label>
                <input
                  type="text"
                  value={form.educationLevel}
                  onChange={(e) => setForm((p) => ({ ...p, educationLevel: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('স্থাপিত সাল', 'Established Year', lang)}</label>
                <input
                  type="text"
                  value={form.establishedYear}
                  onChange={(e) => setForm((p) => ({ ...p, establishedYear: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
            </div>

            {form.schoolType !== school.schoolType && (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {b(
                    `School Type পরিবর্তন করলে (${school.schoolType} → ${form.schoolType}) বিদ্যালয়ের শ্রেণি ও একাডেমিক মডিউল স্বয়ংক্রিয়ভাবে আপডেট হবে।`,
                    `Changing School Type (${school.schoolType} → ${form.schoolType}) will reconfigure classes and academic modules.`,
                    lang
                  )}
                </span>
              </div>
            )}

            {/* Contact & Head Teacher */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block font-semibold mb-1">{b('প্রধান / School Admin নাম', 'Head / School Admin', lang)}</label>
                <input
                  type="text"
                  value={form.headTeacher}
                  onChange={(e) => setForm((p) => ({ ...p, headTeacher: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('মোবাইল নম্বর *', 'Contact Mobile *', lang)}</label>
                <input
                  type="text"
                  value={form.mobile}
                  onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('ইমেইল', 'Email', lang)}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            {/* Address & GPS */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                {b('ঠিকানা ও অবস্থান (Address & GPS Coordinates)', 'Address & GPS Coordinates', lang)}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  value={form.division}
                  onChange={(e) => setForm((p) => ({ ...p, division: e.target.value }))}
                  placeholder={b('বিভাগ', 'Division', lang)}
                  className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={form.district}
                  onChange={(e) => setForm((p) => ({ ...p, district: e.target.value }))}
                  placeholder={b('জেলা', 'District', lang)}
                  className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={form.upazila}
                  onChange={(e) => setForm((p) => ({ ...p, upazila: e.target.value }))}
                  placeholder={b('উপজেলা / থানা', 'Upazila', lang)}
                  className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={form.union}
                  onChange={(e) => setForm((p) => ({ ...p, union: e.target.value }))}
                  placeholder={b('ইউনিয়ন / ওয়ার্ড', 'Union / Ward', lang)}
                  className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={form.village}
                  onChange={(e) => setForm((p) => ({ ...p, village: e.target.value }))}
                  placeholder={b('গ্রাম / মহল্লা', 'Village / Area', lang)}
                  className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={form.cluster}
                  onChange={(e) => setForm((p) => ({ ...p, cluster: e.target.value }))}
                  placeholder={b('ক্লাস্টার / জোন', 'Cluster', lang)}
                  className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="block font-semibold mb-1">{b('বিস্তারিত ঠিকানা', 'Full Street Address', lang)}</label>
                  <input
                    type="text"
                    value={form.fullAddress}
                    onChange={(e) => setForm((p) => ({ ...p, fullAddress: e.target.value }))}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">GPS Latitude</label>
                  <input
                    type="text"
                    value={form.gpsLat}
                    onChange={(e) => setForm((p) => ({ ...p, gpsLat: e.target.value }))}
                    placeholder="23.8069"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">GPS Longitude</label>
                  <input
                    type="text"
                    value={form.gpsLng}
                    onChange={(e) => setForm((p) => ({ ...p, gpsLng: e.target.value }))}
                    placeholder="90.3687"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer">
              {b('বাতিল', 'Cancel', lang)}
            </button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white cursor-pointer">
              {b('তথ্য সংরক্ষণ করুন', 'Save School Changes', lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 2. Temporary Suspend / Permanent Deactivate Modal
export const SchoolDeactivationModal: React.FC<{
  school: SchoolRecord | null;
  initialMode: 'suspend' | 'deactivate';
  lang: Language;
  onClose: () => void;
  onSuspend: (schoolId: string, details: SchoolSuspensionDetails) => void;
  onPermanentDeactivate: (schoolId: string, record: SchoolDeactivationRecord) => void;
}> = ({ school, initialMode, lang, onClose, onSuspend, onPermanentDeactivate }) => {
  const [mode, setMode] = useState<'suspend' | 'deactivate'>(initialMode);
  const [suspReason, setSuspReason] = useState('');
  const [startDate, setStartDate] = useState('2026-11-18');
  const [resumeDate, setResumeDate] = useState('2026-12-15');

  const [deactReason, setDeactReason] = useState('');
  const [evidenceDoc, setEvidenceDoc] = useState('closure_resolution_letter.pdf');
  const [inspectionRef, setInspectionRef] = useState('INSP-CLOSURE-2026');
  const [studentTransferDone, setStudentTransferDone] = useState(false);
  const [staffAdjustmentDone, setStaffAdjustmentDone] = useState(false);
  const [assetDisposalDone, setAssetDisposalDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMode(initialMode);
    setSuspReason('');
    setDeactReason('');
    setStudentTransferDone(false);
    setStaffAdjustmentDone(false);
    setAssetDisposalDone(false);
    setError('');
  }, [school, initialMode]);

  if (!school) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'suspend') {
      if (!suspReason.trim() || !startDate || !resumeDate) {
        setError(b('স্থগিতের কারণ, শুরুর তারিখ ও সম্ভাব্য চালুর তারিখ আবশ্যক।', 'Reason, start date, and expected resume date are required.', lang));
        return;
      }
      onSuspend(school.id, {
        reason: suspReason.trim(),
        startDate,
        expectedResumeDate: resumeDate,
        reactivationRequested: false,
      });
      onClose();
      return;
    }

    const payload: Omit<SchoolDeactivationRecord, 'finalApprovalDate'> = {
      reason: deactReason.trim(),
      evidenceDoc: evidenceDoc.trim(),
      inspectionReportRef: inspectionRef.trim(),
      studentTransferDone,
      staffAdjustmentDone,
      assetDisposalDone,
      finalApprovalBy: 'মোঃ মোমিন খান (Super Central Admin)',
    };
    const check = isDeactivationChecklistValid(payload);
    if (!check.valid) {
      setError(check.error ?? 'Checklist incomplete');
      return;
    }
    onPermanentDeactivate(school.id, {
      ...payload,
      finalApprovalDate: '2026-11-17',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl"
      >
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {mode === 'suspend' ? <PauseCircle className="w-5 h-5 text-amber-600" /> : <Ban className="w-5 h-5 text-red-600" />}
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {b('বিদ্যালয় নিষ্ক্রিয় / বাতিল ব্যবস্থাপনা', 'School Suspension & Deactivation', lang)}
              </h3>
              <p className="text-xs text-slate-500">{school.nameBn} ({school.code})</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => { setMode('suspend'); setError(''); }}
                className={`py-2 px-3 rounded-md font-semibold cursor-pointer ${
                  mode === 'suspend'
                    ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                ⏸️ {b('সাময়িক নিষ্ক্রিয় (Suspend)', 'Temporary Suspend', lang)}
              </button>
              <button
                type="button"
                onClick={() => { setMode('deactivate'); setError(''); }}
                className={`py-2 px-3 rounded-md font-semibold cursor-pointer ${
                  mode === 'deactivate'
                    ? 'bg-white dark:bg-slate-900 text-red-700 dark:text-red-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                ❌ {b('স্থায়ী বাতিল (Permanent Deactivate)', 'Permanent Closure', lang)}
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-medium">
                {error}
              </div>
            )}

            {mode === 'suspend' ? (
              <div className="space-y-3">
                <p className="text-slate-600 dark:text-slate-300">
                  {b(
                    'সাময়িকভাবে বিদ্যালয়ের কার্যক্রম বন্ধ থাকবে। স্কুল অ্যাডমিন পরবর্তীতে পুনরায় সক্রিয় করার আবেদন করতে পারবেন।',
                    'School operations will be paused temporarily. School Admin can submit a reactivation request later.',
                    lang
                  )}
                </p>
                <div>
                  <label className="block font-semibold mb-1">{b('সাময়িক নিষ্ক্রিয়ের কারণ *', 'Suspension Reason *', lang)}</label>
                  <textarea
                    rows={3}
                    value={suspReason}
                    onChange={(e) => setSuspReason(e.target.value)}
                    placeholder={b('যেমন: অবকাঠামোগত সংস্কার বা অডিট যাচাই', 'e.g. Audit compliance review or facility renovation', lang)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">{b('শুরুর তারিখ *', 'Start Date *', lang)}</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">{b('সম্ভাব্য পুনরায় চালুর তারিখ *', 'Expected Resume Date *', lang)}</label>
                    <input
                      type="date"
                      value={resumeDate}
                      onChange={(e) => setResumeDate(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {b(
                      'স্থায়ী বাতিলের আগে শিক্ষার্থী স্থানান্তর, শিক্ষক/কর্মচারী সমন্বয় ও সম্পদ নিষ্পত্তি নিশ্চিত করতে হবে। পূর্বের সকল অডিট রেকর্ড স্থায়ীভাবে সংরক্ষিত থাকবে।',
                      'Permanent closure requires verifying student transfers, staff adjustments, and asset disposal. Audit history remains preserved.',
                      lang
                    )}
                  </span>
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('বিদ্যালয় বাতিলের কারণ *', 'Permanent Closure Reason *', lang)}</label>
                  <textarea
                    rows={2}
                    value={deactReason}
                    onChange={(e) => setDeactReason(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">{b('প্রমাণপত্র / রেজোলিউশন নথি *', 'Evidence Document *', lang)}</label>
                    <input
                      type="text"
                      value={evidenceDoc}
                      onChange={(e) => setEvidenceDoc(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">{b('পরিদর্শন রিপোর্ট রেফারেন্স *', 'Inspection Report Ref *', lang)}</label>
                    <input
                      type="text"
                      value={inspectionRef}
                      onChange={(e) => setInspectionRef(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                  <div className="font-bold text-slate-900 dark:text-white">
                    {b('বাধ্যতামূলক চূড়ান্ত অনুমোদন চেকলিস্ট:', 'Mandatory Final Approval Checklist:', lang)}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={studentTransferDone} onChange={(e) => setStudentTransferDone(e.target.checked)} />
                    <span>{b('সকল শিক্ষার্থীর নিকটস্থ বিদ্যালয়ে স্থানান্তর (TC) সম্পন্ন হয়েছে', 'Student transfer completed for all enrolled students', lang)}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={staffAdjustmentDone} onChange={(e) => setStaffAdjustmentDone(e.target.checked)} />
                    <span>{b('শিক্ষক ও কর্মচারী সমন্বয় / পদায়ন সম্পন্ন হয়েছে', 'Teacher & staff adjustment completed', lang)}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={assetDisposalDone} onChange={(e) => setAssetDisposalDone(e.target.checked)} />
                    <span>{b('বিদ্যালয়ের সম্পদ ও নথিপত্র নিষ্পত্তি / হস্তান্তর সম্পন্ন হয়েছে', 'School asset disposal & archive handover completed', lang)}</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 flex justify-end gap-2 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
              {b('বাতিল', 'Cancel', lang)}
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-xs font-semibold rounded-lg text-white cursor-pointer ${
                mode === 'suspend' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-700 hover:bg-red-800'
              }`}
            >
              {mode === 'suspend'
                ? b('সাময়িক নিষ্ক্রিয় নিশ্চিত করুন', 'Confirm Temporary Suspend', lang)
                : b('চূড়ান্ত অনুমোদন ও স্থায়ী বাতিল', 'Confirm Permanent Deactivation', lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 3. Targeted School Notice Modal
export const SchoolNoticeModal: React.FC<{
  school: SchoolRecord | null;
  lang: Language;
  onClose: () => void;
  onSendNotice: (school: SchoolRecord, notice: NoticeItem) => void;
}> = ({ school, lang, onClose, onSendNotice }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<NoticeItem['category']>('central');

  if (!school) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    onSendNotice(school, {
      id: `not-${Date.now()}`,
      titleBn: title.trim(),
      titleEn: title.trim(),
      bodyBn: body.trim(),
      bodyEn: body.trim(),
      category,
      audience: 'all',
      date: '১৭ নভে ২০২৬',
      schoolId: school.id,
      author: 'কেন্দ্রীয় প্রশাসন (Central Admin)',
    });
    setTitle('');
    setBody('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div role="dialog" aria-modal="true" className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {b('বিদ্যালয়ে নির্দিষ্ট নোটিশ / সতর্কবার্তা পাঠান', 'Send Targeted School Notice', lang)}
              </h3>
              <p className="text-xs text-slate-500">{school.nameBn} ({school.code}) → School Admin Dashboard</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">{b('ধরন', 'Notice Category', lang)}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as NoticeItem['category'])}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="central">Central Directive / জরুরি নির্দেশনা</option>
                <option value="general">General Notice / সাধারণ বিজ্ঞপ্তি</option>
                <option value="meeting">Inspection / Meeting / পরিদর্শন ও সভা</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('শিরোনাম *', 'Title *', lang)}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={b('যেমন: EIIN ও নথিপত্র হালনাগাদ নির্দেশনা', 'e.g. EIIN & compliance update notice', lang)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('বার্তা *', 'Message *', lang)}</label>
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>
          <div className="shrink-0 flex justify-end gap-2 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
              {b('বাতিল', 'Cancel', lang)}
            </button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white cursor-pointer">
              {b('নোটিশ ও অ্যালার্ট পাঠান', 'Send Notice & Notify Admin', lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 4. School Admin Handover & Permissions Modal
export const SchoolAdminHandoverModal: React.FC<{
  open: boolean;
  school: SchoolRecord;
  initialMode: AdminManagementMode;
  targetAdmin?: SchoolAdminMember;
  lang: Language;
  onClose: () => void;
  onSubmit: (schoolId: string, payload: AdminManagementPayload) => void;
}> = ({ open, school, initialMode, targetAdmin, lang, onClose, onSubmit }) => {
  const [mode, setMode] = useState<AdminManagementMode>(initialMode);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [permissions, setPermissions] = useState<string[]>([
    'students',
    'teachers',
    'attendance',
    'exams',
    'results',
    'fees',
    'notices',
  ]);
  const [sendInvitation, setSendInvitation] = useState(true);
  const [handoverNote, setHandoverNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      if (targetAdmin && (initialMode === 'update_permissions' || initialMode === 'remove')) {
        setName(targetAdmin.name);
        setUsername(targetAdmin.username);
        setEmail(targetAdmin.email);
        setMobile(targetAdmin.mobile);
        setPermissions(targetAdmin.permissions);
      } else {
        setName('');
        setUsername('');
        setEmail('');
        setMobile('');
        setPermissions(['students', 'teachers', 'attendance', 'exams', 'results', 'fees', 'notices']);
      }
      setHandoverNote('');
      setError('');
    }
  }, [open, initialMode, targetAdmin]);

  if (!open) return null;

  const togglePerm = (id: string) => {
    setPermissions((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode !== 'remove' && mode !== 'update_permissions' && (!name.trim() || !email.trim())) {
      setError(b('নতুন School Admin-এর নাম এবং ইমেইল আবশ্যক।', 'New Admin name and email are required.', lang));
      return;
    }
    onSubmit(school.id, {
      mode,
      targetAdminId: targetAdmin?.id,
      name,
      username: username || `adm_${Date.now().toString().slice(-4)}`,
      email,
      mobile,
      permissions,
      handoverNote,
      sendInvitation,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div role="dialog" aria-modal="true" className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {b('School Admin পরিবর্তন ও দায়িত্ব হস্তান্তর', 'School Admin Change & Handover', lang)}
              </h3>
              <p className="text-xs text-slate-500">{school.nameBn} ({school.code})</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-xs">
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {b(
                  'গুরুত্বপূর্ণ: দায়িত্ব হস্তান্তর বা Admin অপসারণ করা হলেও পূর্বের School Admin-এর সকল Activity History ও Audit Log অপরিবর্তিত থাকবে।',
                  'Policy: Previous School Admin activity logs and audit history are permanently preserved upon replacement or removal.',
                  lang
                )}
              </span>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block font-semibold mb-1">{b('কার্যক্রম নির্বাচন করুন', 'Management Action', lang)}</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as AdminManagementMode)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              >
                <option value="replace_current">🔄 বর্তমান School Admin পরিবর্তন / প্রতিস্থাপন (Replace Current)</option>
                <option value="appoint_new">➕ নতুন School Admin নিয়োগ (Appoint New Primary Admin)</option>
                <option value="assign_acting">⏱️ ভারপ্রাপ্ত / অস্থায়ী Admin নিয়োগ (Assign Acting Admin)</option>
                {targetAdmin && <option value="update_permissions">🛡️ Admin ভূমিকা ও অনুমতি পরিবর্তন (Edit Permissions)</option>}
                {targetAdmin && <option value="remove">🚫 Admin অপসারণ (Remove Admin — Keep History)</option>}
              </select>
            </div>

            {mode !== 'remove' && mode !== 'update_permissions' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{b('নতুন Admin-এর নাম *', 'Admin Full Name *', lang)}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={b('যেমন: মোঃ কামরুল হাসান', 'e.g. Md. Kamrul Hasan', lang)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('Username', 'Username', lang)}</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="head_kamrul"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('ইমেইল (আমন্ত্রণ পাঠানোর জন্য) *', 'Email (For Invitation) *', lang)}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@school.edu.bd"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('মোবাইল নম্বর', 'Mobile Number', lang)}</label>
                  <input
                    type="text"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
            )}

            {mode !== 'remove' && (
              <div className="space-y-2">
                <div className="font-semibold">{b('অনুমতি ও মডিউল অ্যাক্সেস (Permissions)', 'Role Permissions', lang)}</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PERMISSION_OPTIONS.map((p) => (
                    <label key={p.id} className="flex items-center gap-1.5 p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                      <input type="checkbox" checked={permissions.includes(p.id)} onChange={() => togglePerm(p.id)} />
                      <span>{b(p.labelBn, p.labelEn, lang)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {mode !== 'remove' && mode !== 'update_permissions' && (
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input type="checkbox" checked={sendInvitation} onChange={(e) => setSendInvitation(e.target.checked)} />
                <span>{b('ইমেইল আমন্ত্রণ (Email Invitation) এবং অ্যাক্টিভেশন লিংক পাঠান', 'Send Email Invitation & activation link', lang)}</span>
              </label>
            )}

            <div>
              <label className="block font-semibold mb-1">{b('দায়িত্ব হস্তান্তর নোট (Handover Record Note)', 'Handover Note', lang)}</label>
              <textarea
                rows={2}
                value={handoverNote}
                onChange={(e) => setHandoverNote(e.target.value)}
                placeholder={b('যেমন: বদলি / অবসরজনিত কারণে দায়িত্ব হস্তান্তর সম্পন্ন।', 'e.g. Official transfer order handover completed.', lang)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="shrink-0 flex justify-end gap-2 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
              {b('বাতিল', 'Cancel', lang)}
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-xs font-semibold rounded-lg text-white cursor-pointer ${
                mode === 'remove' ? 'bg-red-700 hover:bg-red-800' : 'bg-blue-700 hover:bg-blue-800'
              }`}
            >
              {b('নিশ্চিত ও রেকর্ড করুন', 'Confirm & Save Handover', lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 5. School Inspection Modal
export const SchoolInspectionModal: React.FC<{
  open: boolean;
  school: SchoolRecord;
  lang: Language;
  onClose: () => void;
  onSubmit: (schoolId: string, inspection: SchoolInspectionRecord) => void;
}> = ({ open, school, lang, onClose, onSubmit }) => {
  const [inspectorName, setInspectorName] = useState('ড. শফিকুল ইসলাম (Audit & Inspection Officer)');
  const [date, setDate] = useState('2026-11-17');
  const [reportRef, setReportRef] = useState(`INSP-${school.code}-2026`);
  const [findings, setFindings] = useState('');
  const [recommendation, setRecommendation] = useState<SchoolInspectionRecord['recommendation']>('recommend_approval');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectorName.trim() || !findings.trim()) return;
    onSubmit(school.id, {
      id: `INSP-${Date.now().toString().slice(-5)}`,
      date,
      inspectorName: inspectorName.trim(),
      findings: findings.trim(),
      recommendation,
      reportRef: reportRef.trim(),
    });
    setFindings('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div role="dialog" aria-modal="true" className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {b('বিদ্যালয় পরিদর্শন রিপোর্ট যুক্ত করুন', 'Record School Inspection', lang)}
              </h3>
              <p className="text-xs text-slate-500">{school.nameBn} ({school.code})</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">{b('পরিদর্শকের নাম *', 'Inspector Name *', lang)}</label>
              <input
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">{b('পরিদর্শনের তারিখ', 'Inspection Date', lang)}</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('রিপোর্ট রেফারেন্স', 'Report Ref', lang)}</label>
                <input
                  type="text"
                  value={reportRef}
                  onChange={(e) => setReportRef(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('সুপারিশ (Recommendation)', 'Recommendation', lang)}</label>
              <select
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value as SchoolInspectionRecord['recommendation'])}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="recommend_approval">✅ অনুমোদনের জন্য সুপারিশ (Recommend Approval)</option>
                <option value="revision_needed">🔄 সংশোধন প্রয়োজন (Revision Needed)</option>
                <option value="flag_issue">⚠️ ত্রুটি / সতর্কতা চিহ্নিত (Flag Issue)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('পরিদর্শন পর্যবেক্ষণ *', 'Inspection Findings *', lang)}</label>
              <textarea
                rows={4}
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                placeholder={b('শ্রেণিকক্ষ, শিক্ষক উপস্থিতি, নিরাপত্তা ও নথিপত্র যাচাইয়ের বিস্তারিত লিখুন...', 'Document classrooms, safety, teachers, and records...', lang)}
                className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>
          <div className="shrink-0 flex justify-end gap-2 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
              {b('বাতিল', 'Cancel', lang)}
            </button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer">
              {b('পরিদর্শন রিপোর্ট সংরক্ষণ করুন', 'Save Inspection Report', lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
