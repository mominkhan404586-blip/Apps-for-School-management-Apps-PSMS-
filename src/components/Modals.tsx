import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Camera,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  KeyRound,
  Loader2,
  MailCheck,
  Printer,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  X,
  Lock,
} from 'lucide-react';
import type { AdminAccount, Language, Role, SchoolRecord, StudentRecord, TeacherRecord } from '../types';
import {
  loadRememberedLoginIdentifier,
  saveRememberedLoginIdentifier,
  validateLoginIdentifierRealtime,
} from '../utils/unifiedLoginEngine';
import { calculateBMI, generateStudentCodes } from '../utils/rbacAndGrading';
import { validateStudentActivationLogin } from '../utils/schoolConfigAndAddress';
import {
  authenticateSchoolAccount,
  sanitizeActorDisplayForRole,
} from '../utils/adminAndTeacherIdentityEngine';
import {
  authenticateGuardianAccount,
  authenticateTeacherAccount,
} from '../utils/authGuard';
import { ALL_CLASSES, AVATARS, CENTRAL_ADMIN_CREDENTIALS } from '../data/mockData';
import { b, tr } from '../i18n/translations';
import { TrendLineChart } from './Charts';
import { OfficialAppLogo } from './OfficialAppLogo';

export interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  requireReason?: boolean;
  onConfirm: (reason: string) => void;
}

export const ActionConfirmModal: React.FC<{
  state: ConfirmDialogState | null;
  lang: Language;
  onClose: () => void;
}> = ({ state, lang, onClose }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!state?.open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.requireReason && !reason.trim()) {
      setError(b('দয়া করে কারণ বা মন্তব্য লিখুন।', 'Please provide a reason or note.', lang));
      return;
    }
    state.onConfirm(reason.trim() || b('নিয়মিত প্রশাসনিক কার্যক্রম', 'Standard administrative action', lang));
    setReason('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                state.danger
                  ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400'
                  : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="confirm-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                {state.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {b('অডিট লগে এই কার্যক্রম সংরক্ষিত হবে', 'This action will be recorded in the Audit Log', lang)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tr('close', lang)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{state.message}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label
              htmlFor="action-reason-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              {b('কারণ / প্রশাসনিক নোট (Audit Note)', 'Reason / Administrative Note', lang)}
              {state.requireReason && <span className="text-red-600"> *</span>}
            </label>
            <textarea
              id="action-reason-input"
              rows={2}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              placeholder={b('কারণ লিখুন...', 'Enter action note...', lang)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600"
            />
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {tr('cancel', lang)}
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-xs font-semibold rounded-lg text-white cursor-pointer ${
                state.danger
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-700 hover:bg-blue-800'
              }`}
            >
              {state.confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const StudentProfileModal: React.FC<{
  student: StudentRecord | null;
  school?: SchoolRecord;
  actorRole?: Role;
  lang: Language;
  onClose: () => void;
  onPromoteStudent?: (studentId: string) => void;
  onIssueTransferLetter?: (studentId: string, targetSchoolName: string, reason: string) => string;
  onIssueDigitalIdCard?: (studentId: string) => string;
  onEditStudentPhoto?: (student: StudentRecord) => void;
}> = ({
  student,
  school,
  actorRole = 'school_admin',
  lang,
  onClose,
  onPromoteStudent,
  onIssueTransferLetter,
  onIssueDigitalIdCard,
  onEditStudentPhoto,
}) => {
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [activeSheet, setActiveSheet] = useState<'profile' | 'transfer_letter' | 'digital_id'>('profile');
  const [tcTargetSchool, setTcTargetSchool] = useState('');
  const [tcReason, setTcReason] = useState('অভিভাবকের কর্মস্থল পরিবর্তন / পারিবারিক স্থানান্তর');
  const [issuedTcNumber, setIssuedTcNumber] = useState<string | null>(null);
  const [issuedDigitalSerial, setIssuedDigitalSerial] = useState<string | null>(null);

  if (!student) return null;
  const bmi = calculateBMI(student.heightCm, student.weightKg);
  const todayIso = new Date().toISOString().slice(0, 10);
  const activeDigitalSerial =
    issuedDigitalSerial ??
    student.digitalIdSerial ??
    `DID-${student.schoolId.replace(/[^A-Z0-9]/gi, '')}-${student.roll}-01`;

  const handleClose = () => {
    setQuickMenuOpen(false);
    setActiveSheet('profile');
    setIssuedTcNumber(null);
    setIssuedDigitalSerial(null);
    onClose();
  };

  const handleGenerateTc = (e: React.FormEvent) => {
    e.preventDefault();
    const tcNo = onIssueTransferLetter
      ? onIssueTransferLetter(
          student.id,
          tcTargetSchool.trim() || b('যেকোনো অনুমোদিত বিদ্যালয়', 'Any Recognized School', lang),
          tcReason.trim() || b('নিয়মিত স্থানান্তর', 'Standard transfer', lang)
        )
      : `TC-${todayIso.slice(0, 4)}-${student.schoolId}-${student.roll}`;
    setIssuedTcNumber(tcNo);
  };

  const handleIssueIdCard = () => {
    const serial = onIssueDigitalIdCard
      ? onIssueDigitalIdCard(student.id)
      : `DID-${student.schoolId.replace(/[^A-Z0-9]/gi, '')}-${student.roll}-NEW`;
    setIssuedDigitalSerial(serial);
    setActiveSheet('digital_id');
    setQuickMenuOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-profile-title"
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-6"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={student.photoUrl ?? AVATARS.studentRahim}
                alt={student.nameEn}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
              />
              {onEditStudentPhoto && (
                <button
                  type="button"
                  onClick={() => onEditStudentPhoto(student)}
                  title={b('শিক্ষার্থীর ছবি পরিবর্তন ও ক্রপ করুন', 'Change / Crop Photo', lang)}
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-white dark:border-slate-900 flex items-center justify-center shadow cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 id="student-profile-title" className="text-lg font-bold text-slate-900 dark:text-white">
                  {student.nameBn}
                </h3>
                <span className="px-2 py-0.5 rounded border text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                  {student.verificationStatus ?? 'verified'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {student.nameEn} · {student.className} ({student.section}) · Roll {student.roll}
              </p>
              <p className="text-xs font-mono text-blue-700 dark:text-blue-400 mt-1">
                ID: {student.permanentId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeSheet !== 'profile' && (
              <button
                type="button"
                onClick={() => setActiveSheet('profile')}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                {b('প্রোফাইলে ফিরুন', 'Back to Profile', lang)}
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              {b('প্রিন্ট', 'Print', lang)}
            </button>
            <button
              type="button"
              onClick={handleClose}
              aria-label={tr('close', lang)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sheet 1: Standard Profile View */}
        {activeSheet === 'profile' && (
          <>
            {/* Digital QR ID Card + Codes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {b('ডিজিটাল QR আইডি কার্ড', 'Digital QR Identity Card', lang)}
                  </span>
                  <QrCode className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                    <QrCode className="w-14 h-14 text-slate-900 dark:text-white" />
                  </div>
                  <div className="text-xs space-y-1 min-w-0">
                    <div>
                      <span className="text-slate-500">{b('বিদ্যালয়:', 'School:', lang)}</span>{' '}
                      <span className="font-semibold text-slate-900 dark:text-white">{student.schoolNameBn}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Digital ID Serial:</span>{' '}
                      <span className="font-mono font-semibold text-indigo-700 dark:text-indigo-400">
                        {activeDigitalSerial}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Activation Code:</span>{' '}
                      <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                        {student.activationCode}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Guardian Link (GLC):</span>{' '}
                      <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">
                        {student.guardianLinkCode}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-xs">
                <div className="font-bold text-slate-900 dark:text-white mb-1">
                  {b('ব্যক্তিগত ও স্বাস্থ্য তথ্য', 'Personal & Health Record', lang)}
                </div>
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-2">
                  <span className="text-slate-500">{b('পিতা:', 'Father:', lang)}</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{student.fatherName}</span>
                  <span className="text-slate-500">{b('মাতা:', 'Mother:', lang)}</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{student.motherName}</span>
                  <span className="text-slate-500">{b('জন্ম নিবন্ধন:', 'Birth Reg:', lang)}</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">{student.birthRegNo}</span>
                  <span className="text-slate-500">{b('রক্তের গ্রুপ:', 'Blood Group:', lang)}</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">{student.bloodGroup}</span>
                  <span className="text-slate-500">{b('উপস্থিতি / GPA:', 'Attendance / GPA:', lang)}</span>
                  <span className="tabular-nums font-medium text-slate-900 dark:text-slate-100">
                    {student.attendancePct}% · {student.gpa ?? 'N/A'}
                  </span>
                  <span className="text-slate-500">{b('উচ্চতা / ওজন / BMI:', 'Height/Weight/BMI:', lang)}</span>
                  <span className="tabular-nums font-medium text-slate-900 dark:text-slate-100">
                    {student.heightCm} cm · {student.weightKg} kg · BMI {bmi.bmi} ({b(bmi.categoryBn, bmi.categoryEn, lang)})
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Trend & History */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">
                  {b('একাডেমিক পারফরম্যান্স চার্ট', 'Academic Performance Trend', lang)}
                </h4>
                <TrendLineChart
                  points={[
                    { label: '১ম সাময়িক', value: 78 },
                    { label: '২য় সাময়িক', value: 82 },
                    { label: 'অর্ধ-বার্ষিক', value: 85 },
                    { label: '৩য় সাময়িক', value: 88 },
                  ]}
                />
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {b('ভর্তি ও শ্রেণি উন্নয়ন ইতিহাস', 'Admission & Promotion History', lang)}
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {student.admissionHistory.map((h, i) => (
                    <li key={`${h}-${i}`} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
                {onPromoteStudent && (
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => onPromoteStudent(student.id)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                    >
                      {b('পরবর্তী শ্রেণিতে উন্নীত করুন (Promote)', 'Promote to Next Class', lang)}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Sheet 2: Printable Transfer Letter (TC / ছাড়পত্র) Generator */}
        {activeSheet === 'transfer_letter' && (
          <div className="space-y-4 pb-14 text-xs">
            <div className="rounded-xl border-2 border-slate-300 dark:border-slate-700 p-6 bg-slate-50/70 dark:bg-slate-800/40 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-300 dark:border-slate-700 pb-3">
                <div>
                  <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                    {b('সরকারি ও বোর্ড অনুমোদিত বিদ্যালয় ছাড়পত্র', 'Official School Transfer Certificate (TC)', lang)}
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {student.schoolNameBn}
                  </h4>
                  <p className="text-slate-500">
                    School ID: {student.schoolId} {school ? `· EIIN: ${school.eiin} · ${school.fullAddress}` : ''}
                  </p>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-slate-900 dark:text-white">
                    {issuedTcNumber ? `TC No: ${issuedTcNumber}` : b('খসড়া ছাড়পত্র', 'Draft TC', lang)}
                  </div>
                  <div className="text-slate-500">{b('তারিখ:', 'Date:', lang)} {todayIso}</div>
                </div>
              </div>

              <p className="leading-relaxed text-slate-800 dark:text-slate-200 text-[13px]">
                {b(
                  `এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, শিক্ষার্থী ${student.nameBn} (${student.nameEn}), পিতা: ${student.fatherName}, মাতা: ${student.motherName}, স্থায়ী শিক্ষার্থী আইডি: ${student.permanentId}, জন্মনিবন্ধন নম্বর: ${student.birthRegNo}, অত্র বিদ্যালয়ের ${student.className} (${student.section}, রোল #${student.roll})-এ নিয়মিত অধ্যয়নরত ছিল। তার নৈতিক চরিত্র ও উপস্থিতি (${student.attendancePct}%) সন্তোষজনক।`,
                  `This is to certify that ${student.nameEn} (${student.nameBn}), Child of ${student.fatherName} & ${student.motherName}, Permanent Student ID ${student.permanentId}, Birth Reg ${student.birthRegNo}, studied in ${student.className} (${student.section}, Roll #${student.roll}) at this institution with ${student.attendancePct}% attendance and satisfactory conduct.`,
                  lang
                )}
              </p>

              <form onSubmit={handleGenerateTc} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 no-print">
                <div>
                  <label className="block font-semibold mb-1">
                    {b('গন্তব্য বিদ্যালয়ের নাম (ঐচ্ছিক)', 'Destination School (Optional)', lang)}
                  </label>
                  <input
                    type="text"
                    value={tcTargetSchool}
                    onChange={(e) => setTcTargetSchool(e.target.value)}
                    placeholder={b('যেমন: আদর্শ বালিকা উচ্চ বিদ্যালয়', 'e.g. Adarsha Girls High School', lang)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">
                    {b('ছাড়পত্র প্রদানের কারণ *', 'Reason for Transfer Letter *', lang)}
                  </label>
                  <input
                    type="text"
                    required
                    value={tcReason}
                    onChange={(e) => setTcReason(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                  />
                </div>
                <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="text-slate-500">
                    {b('স্বাক্ষরকারী কর্তৃপক্ষ:', 'Issuing Authority:', lang)}{' '}
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {sanitizeActorDisplayForRole(
                        school?.headTeacher ?? b('প্রধান শিক্ষক / School Admin', 'Head Teacher / School Admin', lang),
                        actorRole
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-semibold cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      {issuedTcNumber
                        ? b('ছাড়পত্র পুনঃইস্যু করুন', 'Re-issue Transfer Letter', lang)
                        : b('ছাড়পত্র ইস্যু ও সংরক্ষণ করুন', 'Confirm & Issue Transfer Letter', lang)}
                    </button>
                    {issuedTcNumber && (
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 font-semibold cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 shrink-0" />
                        {b('প্রিন্ট TC', 'Print TC', lang)}
                      </button>
                    )}
                  </div>
                </div>
              </form>

              {issuedTcNumber && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    {b(
                      `ছাড়পত্র (${issuedTcNumber}) সফলভাবে ইস্যু হয়েছে এবং শিক্ষার্থীর ভর্তি ও অডিট রেকর্ডে সংরক্ষিত হয়েছে।`,
                      `Transfer Letter (${issuedTcNumber}) issued and logged to student history.`,
                      lang
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sheet 3: Issued Digital QR ID Card Preview & Print */}
        {activeSheet === 'digital_id' && (
          <div className="space-y-4 pb-14 text-xs">
            <div className="max-w-md mx-auto rounded-2xl border-2 border-blue-700 dark:border-blue-500 bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-900 dark:to-blue-950/30 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-blue-200 dark:border-blue-800 pb-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                    {b('ডিজিটাল শিক্ষার্থী পরিচয়পত্র', 'Official Digital Student ID Card', lang)}
                  </div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                    {student.schoolNameBn}
                  </div>
                </div>
                <BadgeCheck className="w-6 h-6 text-emerald-600 shrink-0" />
              </div>

              <div className="flex items-center gap-4">
                <img
                  src={student.photoUrl ?? AVATARS.studentRahim}
                  alt={student.nameEn}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-xl object-cover border-2 border-white dark:border-slate-700 shadow-xs shrink-0"
                />
                <div className="space-y-1 min-w-0">
                  <div className="text-base font-bold text-slate-900 dark:text-white truncate">{student.nameBn}</div>
                  <div className="text-slate-600 dark:text-slate-300 truncate">{student.nameEn}</div>
                  <div className="font-semibold text-blue-700 dark:text-blue-400">
                    {student.className} ({student.section}) · Roll #{student.roll}
                  </div>
                  <div className="font-semibold text-red-600 dark:text-red-400">
                    {b('রক্তের গ্রুপ:', 'Blood:', lang)} {student.bloodGroup}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                <div className="col-span-2 space-y-1 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400">Perm ID: </span>
                    <span className="font-bold text-slate-900 dark:text-white">{student.permanentId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Card Serial: </span>
                    <span className="font-bold text-indigo-700 dark:text-indigo-400">{activeDigitalSerial}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Issued: </span>
                    <span className="text-slate-700 dark:text-slate-300">{student.lastIdIssuedAt ?? todayIso}</span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <QrCode className="w-14 h-14 text-slate-900 dark:text-white" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  {b('ডিজিটাল কার্ড সক্রিয় ও ইস্যুকৃত', 'Active & Verified Digital ID', lang)}
                </span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 shrink-0" />
                  {b('আইডি কার্ড প্রিন্ট', 'Print ID Card', lang)}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Quick Actions Menu (School Admin & Authorized Reviewers) */}
        <div className="sticky bottom-3 flex justify-end pointer-events-none z-20 no-print">
          <div className="relative pointer-events-auto flex flex-col items-end gap-2">
            {quickMenuOpen && (
              <div
                role="menu"
                aria-label="Student Profile Quick Actions"
                className="w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-2 space-y-1 text-xs"
              >
                <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  {actorRole === 'school_admin'
                    ? b('School Admin দ্রুত কার্যক্রম', 'School Admin Quick Actions', lang)
                    : b('দ্রুত কার্যক্রম (Quick Actions)', 'Quick Actions', lang)}
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActiveSheet('transfer_letter');
                    setQuickMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold text-left cursor-pointer"
                >
                  <ArrowRightLeft className="w-4 h-4 shrink-0" />
                  <span>{b('ছাড়পত্র / Transfer Letter তৈরি', 'Generate Transfer Letter (TC)', lang)}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleIssueIdCard}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold text-left cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 shrink-0" />
                  <span>{b('ডিজিটাল আইডি কার্ড ইস্যু', 'Issue Digital ID Card', lang)}</span>
                </button>
                {onPromoteStudent && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setQuickMenuOpen(false);
                      onPromoteStudent(student.id);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-semibold text-left cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{b('পরবর্তী শ্রেণিতে উন্নীত (Promote)', 'Promote Student', lang)}</span>
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setQuickMenuOpen((prev) => !prev)}
              aria-expanded={quickMenuOpen}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-lg cursor-pointer"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{b('Quick Actions (দ্রুত কাজ)', 'Quick Actions', lang)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AddStudentModal: React.FC<{
  open: boolean;
  lang: Language;
  schoolId: string;
  schoolNameBn: string;
  allowedClasses?: string[];
  nextSerial: number;
  onClose: () => void;
  onAddStudent: (student: StudentRecord) => void;
}> = ({ open, lang, schoolId, schoolNameBn, allowedClasses, nextSerial, onClose, onAddStudent }) => {
  const classOptions = allowedClasses?.length ? allowedClasses : ALL_CLASSES;
  const [nameBn, setNameBn] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [mobile, setMobile] = useState('');
  const [birthReg, setBirthReg] = useState('');
  const [className, setClassName] = useState(classOptions[0] ?? 'Class 4');
  const [section, setSection] = useState('ক (A)');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [submitAsPending, setSubmitAsPending] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameBn.trim() || !nameEn.trim() || !mobile.trim()) {
      setError(b('শিক্ষার্থীর নাম ও অভিভাবকের মোবাইল নম্বর আবশ্যক।', 'Student name and guardian mobile are required.', lang));
      return;
    }
    const codes = generateStudentCodes(nextSerial, schoolId, 2026);
    const todayIso = new Date().toISOString().slice(0, 10);
    const newStudent: StudentRecord = {
      id: `stu-${Date.now()}`,
      ...codes,
      schoolId,
      schoolNameBn,
      previousSchools: [],
      nameBn: nameBn.trim(),
      nameEn: nameEn.trim(),
      dob: '২০১৭-০৪-১২',
      birthRegNo: birthReg.trim() || '20172614908199001',
      gender,
      fatherName: fatherName.trim() || 'মোঃ আব্দুল হক',
      motherName: motherName.trim() || 'আয়েশা সিদ্দিকা',
      guardianMobile: mobile.trim(),
      emergencyContact: mobile.trim(),
      bloodGroup,
      className,
      section,
      roll: nextSerial,
      status: submitAsPending ? 'pending' : 'active',
      approvalStatus: submitAsPending ? 'pending' : 'approved',
      attendancePct: submitAsPending ? 0 : 100,
      heightCm: 130,
      weightKg: 28,
      gpa: submitAsPending ? 'অপেক্ষমান' : 'প্রযোজ্য',
      stipendStatus: 'pending',
      admissionHistory: [`২০২৬: ${className} নতুন ভর্তি (${schoolNameBn})`],
      documents: [
        {
          id: `doc-adm-${Date.now()}`,
          name: 'ডিজিটাল জন্মনিবন্ধন সনদ.pdf',
          type: 'birth_cert',
          verified: !submitAsPending,
          verifiedAt: submitAsPending ? undefined : todayIso,
          docRef: birthReg.trim() || '20172614908199001',
        },
      ],
      approvalHistory: [
        {
          id: `SAPH-${Date.now().toString().slice(-4)}`,
          date: todayIso,
          actor: 'স্কুল অ্যাডমিন (School Admin)',
          category: 'new_registration',
          actionTitleBn: submitAsPending ? 'ভর্তি আবেদন যাচাইয়ের জন্য জমা' : 'নতুন শিক্ষার্থী ভর্তি ও অনুমোদন সম্পন্ন',
          actionTitleEn: submitAsPending ? 'Submitted for School Verification' : 'New Admission Approved',
          fromValue: 'Applicant',
          toValue: submitAsPending ? 'pending' : `${className} (active)`,
          decision: submitAsPending ? 'pending' : 'approved',
        },
      ],
    };
    onAddStudent(newStudent);
    setNameBn('');
    setNameEn('');
    setFatherName('');
    setMotherName('');
    setMobile('');
    setBirthReg('');
    setGender('Male');
    setSubmitAsPending(false);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-student-title"
        className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <h3 id="add-student-title" className="text-base font-bold text-slate-900 dark:text-white">
              {b('নতুন শিক্ষার্থী ভর্তি ফরম (স্কুল পর্যায়)', 'New Student Admission Form (School Level)', lang)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tr('close', lang)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">{b('বাংলা নাম *', 'Name (Bangla) *', lang)}</label>
              <input
                type="text"
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                placeholder="যেমন: তানভীর আহমেদ"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{b('ইংরেজি নাম *', 'Name (English) *', lang)}</label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Tanvir Ahmed"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{b('লিঙ্গ (ছাত্র / ছাত্রী)', 'Gender (Boy / Girl)', lang)}</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'Male' | 'Female')}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              >
                <option value="Male">{b('ছাত্র (Male)', 'Boy (Male)', lang)}</option>
                <option value="Female">{b('ছাত্রী (Female)', 'Girl (Female)', lang)}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{b('রক্তের গ্রুপ', 'Blood Group', lang)}</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              >
                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{b('পিতার নাম', 'Father Name', lang)}</label>
              <input
                type="text"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{b('মাতার নাম', 'Mother Name', lang)}</label>
              <input
                type="text"
                value={motherName}
                onChange={(e) => setMotherName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{b('অভিভাবকের মোবাইল *', 'Guardian Mobile *', lang)}</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{b('জন্মনিবন্ধন নম্বর', 'Birth Reg No.', lang)}</label>
              <input
                type="text"
                value={birthReg}
                onChange={(e) => setBirthReg(e.target.value)}
                placeholder="17-digit Birth ID"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{b('শ্রেণি', 'Class', lang)}</label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              >
                {classOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{b('শাখা', 'Section', lang)}</label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={submitAsPending}
              onChange={(e) => setSubmitAsPending(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span>
              {b(
                'নথি যাচাইয়ের জন্য আবেদন হিসেবে জমা দিন (Pending Approval Queue)',
                'Submit as Pending Application for Document Verification Queue',
                lang
              )}
            </span>
          </label>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              {tr('cancel', lang)}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white cursor-pointer"
            >
              {b('ভর্তি সম্পন্ন ও ID তৈরি করুন', 'Complete Admission & Generate ID', lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SUBORDINATE_PERMISSION_OPTIONS = [
  { id: 'schools', labelBn: 'বিদ্যালয় ব্যবস্থাপনা', labelEn: 'Schools' },
  { id: 'verification', labelBn: 'যাচাইকরণ কেন্দ্র', labelEn: 'Verification' },
  { id: 'teachers', labelBn: 'শিক্ষক অনুমোদন', labelEn: 'Teachers' },
  { id: 'students', labelBn: 'শিক্ষার্থী ও পরিসংখ্যান', labelEn: 'Students' },
  { id: 'academics', labelBn: 'একাডেমিক তদারকি', labelEn: 'Academics' },
  { id: 'exams', labelBn: 'পরীক্ষা নিয়ন্ত্রণ', labelEn: 'Exams' },
  { id: 'notices', labelBn: 'নোটিশ ও যোগাযোগ', labelEn: 'Notices' },
  { id: 'messages', labelBn: 'Admin ইনবক্স', labelEn: 'Inbox' },
  { id: 'audit', labelBn: 'অডিট লগ', labelEn: 'Audit Log' },
];

export const AddAdminModal: React.FC<{
  open: boolean;
  lang: Language;
  onClose: () => void;
  onAddAdmin: (admin: AdminAccount) => void;
}> = ({ open, lang, onClose, onAddAdmin }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [accessLevel, setAccessLevel] = useState<AdminAccount['accessLevel']>('Regional Reviewer');
  const [permissions, setPermissions] = useState<string[]>(['schools', 'verification', 'notices']);
  const [error, setError] = useState('');

  if (!open) return null;

  const togglePerm = (permId: string) => {
    setPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !email.trim()) {
      setError(b('নাম, ইউজারনেম ও ইমেইল প্রয়োজন।', 'Name, username, and email are required.', lang));
      return;
    }
    onAddAdmin({
      id: `adm-${Date.now()}`,
      name: name.trim(),
      username: username.trim(),
      email: email.trim(),
      mobile: mobile.trim() || '01700000000',
      accessLevel,
      isMainOwner: false,
      permissions: permissions.length > 0 ? permissions : ['schools', 'verification'],
      status: 'active',
      lastLogin: 'Invited (Pending First Login)',
      twoFactorEnabled: true,
    });
    setName('');
    setUsername('');
    setEmail('');
    setMobile('');
    setPermissions(['schools', 'verification', 'notices']);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {b('নতুন Sub-Admin তৈরি (শুধুমাত্র Main Admin)', 'Create Subordinate Admin (Main Owner Only)', lang)}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400">
          {b(
            'পাবলিক রেজিস্ট্রেশন স্থায়ীভাবে বন্ধ। শুধুমাত্র মূল Main System Admin অনুমোদনের মাধ্যমে সীমিত অধিকারসম্পন্ন Sub-Admin যুক্ত করতে পারবেন।',
            'Public admin signup is permanently disabled. Only the Main System Owner can create subordinate admins with scoped permissions.',
            lang
          )}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-semibold mb-1">{b('পূর্ণ নাম *', 'Full Name *', lang)}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">{b('ইউজারনেম *', 'Username *', lang)}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{b('মোবাইল', 'Mobile', lang)}</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">{b('ইমেইল / Gmail *', 'Email / Gmail *', lang)}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">{b('Access Level', 'Access Level', lang)}</label>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value as AdminAccount['accessLevel'])}
              className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
            >
              <option value="Regional Reviewer">Regional Reviewer</option>
              <option value="Audit Officer">Audit Officer</option>
              <option value="Super Central Admin">Subordinate Central Admin</option>
            </select>
          </div>
          <div>
            <div className="text-xs font-semibold mb-1.5">
              {b('অনুমোদিত মডিউলসমূহ (Scoped Permissions)', 'Scoped Permissions', lang)}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SUBORDINATE_PERMISSION_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-[11px] font-medium cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={permissions.includes(opt.id)}
                    onChange={() => togglePerm(opt.id)}
                  />
                  <span>{b(opt.labelBn, opt.labelEn, lang)}</span>
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
              {tr('cancel', lang)}
            </button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 text-white cursor-pointer">
              {b('Sub-Admin যুক্ত করুন', 'Create Sub-Admin', lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export type LoginModalPresetMode =
  | 'teacher'
  | 'student'
  | 'super_admin'
  | 'school'
  | 'guardian'
  | 'portal';

export const LoginModal: React.FC<{
  open: boolean;
  lang: Language;
  students?: StudentRecord[];
  schools?: SchoolRecord[];
  teachers?: TeacherRecord[];
  initialMode?: LoginModalPresetMode;
  onClose: () => void;
  onLoginSuccess: (
    role: Role,
    studentId?: string,
    schoolId?: string,
    extra?: { teacherId?: string; guardianMobile?: string; linkedStudentIds?: string[] }
  ) => void;
  onOpenTeacherRegistration?: () => void;
  onGoogleSignIn?: () => Promise<void> | void;
  googleSigningIn?: boolean;
  onSuperAdminFirebaseSignIn?: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; unverifiedEmail?: boolean; message?: string }>;
  onSuperAdminRecheckVerification?: () => Promise<{ ok: boolean; message?: string }>;
  onSuperAdminResendVerification?: () => Promise<{ ok: boolean; message?: string }>;
  onOpenFirebaseRecovery?: (email?: string) => void;
}> = ({
  open,
  lang,
  students = [],
  schools = [],
  teachers = [],
  initialMode = 'teacher',
  onClose,
  onLoginSuccess,
  onOpenTeacherRegistration,
  onGoogleSignIn,
  googleSigningIn = false,
  onSuperAdminFirebaseSignIn,
  onSuperAdminRecheckVerification,
  onSuperAdminResendVerification,
  onOpenFirebaseRecovery,
}) => {
  const [viewMode, setViewMode] = useState<LoginModalPresetMode>(initialMode);
  const [studentSubTab, setStudentSubTab] = useState<'code_id' | 'username'>('code_id');
  const [showActivationInput, setShowActivationInput] = useState(false);
  const [showForgotHelp, setShowForgotHelp] = useState(false);

  const [identifier, setIdentifier] = useState('tch_rahim');
  const [password, setPassword] = useState('teacher@123');
  const [adminIdentifier, setAdminIdentifier] = useState(CENTRAL_ADMIN_CREDENTIALS.email);
  const [adminPassword, setAdminPassword] = useState('');
  const [superAdminLoading, setSuperAdminLoading] = useState(false);
  const [superAdminUnverified, setSuperAdminUnverified] = useState(false);
  const [superAdminStatusMsg, setSuperAdminStatusMsg] = useState<string | null>(null);
  const [schoolAuthIdentifier, setSchoolAuthIdentifier] = useState('SCH-2026-00015');
  const [schoolAuthPassword, setSchoolAuthPassword] = useState('school@123');
  const [guardianIdentifier, setGuardianIdentifier] = useState('01712345678');
  const [guardianPassword, setGuardianPassword] = useState('parent@123');

  const [schoolCodeInput, setSchoolCodeInput] = useState('GPS-1042');
  const [studentIdInput, setStudentIdInput] = useState('STD-2026-GPS1042-0012');
  const [studentMobileInput, setStudentMobileInput] = useState('01712345678');
  const [activationCodeInput, setActivationCodeInput] = useState('ACT-0012-74');
  const [rememberMe, setRememberMe] = useState(() => Boolean(loadRememberedLoginIdentifier()));
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      const remembered = loadRememberedLoginIdentifier();
      setRememberMe(Boolean(remembered));
      setShowPassword(false);
      setViewMode(initialMode);
      setError('');
      setShowForgotHelp(false);
      setSuperAdminUnverified(false);
      setSuperAdminStatusMsg(null);
      if (initialMode === 'super_admin') {
        setAdminIdentifier(remembered && remembered.includes('@') ? remembered : CENTRAL_ADMIN_CREDENTIALS.email);
        setAdminPassword('');
      } else if (initialMode === 'teacher') {
        setIdentifier(remembered || 'tch_rahim');
        setPassword('teacher@123');
      } else if (initialMode === 'school') {
        setSchoolAuthIdentifier(remembered || 'SCH-2026-00015');
        setSchoolAuthPassword('school@123');
      } else if (initialMode === 'guardian') {
        setGuardianIdentifier(remembered || '01712345678');
        setGuardianPassword('parent@123');
      } else if (remembered) {
        setIdentifier(remembered);
      }
    }
  }, [open, initialMode]);

  const activeIdentifierValue =
    viewMode === 'super_admin'
      ? adminIdentifier
      : viewMode === 'school'
        ? schoolAuthIdentifier
        : viewMode === 'guardian'
          ? guardianIdentifier
          : viewMode === 'student'
            ? studentIdInput
            : identifier;
  const activeIdentifierValidation = validateLoginIdentifierRealtime(activeIdentifierValue);

  if (!open) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (viewMode === 'super_admin') {
      const cleanEmail = adminIdentifier.trim();
      const emailCheck = validateLoginIdentifierRealtime(cleanEmail);
      if (!emailCheck.valid || emailCheck.kind !== 'email' || !adminPassword) {
        setError(
          b(
            emailCheck.valid
              ? 'অনুগ্রহ করে Super Central Admin Gmail এবং Firebase পাসওয়ার্ড লিখুন।'
              : emailCheck.messageBn,
            emailCheck.valid
              ? 'Please enter your Super Central Admin Gmail and Firebase password.'
              : emailCheck.messageEn,
            lang
          )
        );
        return;
      }
      if (!onSuperAdminFirebaseSignIn) {
        setError(
          b(
            'Firebase Authentication হ্যান্ডলার প্রস্তুত নয়। অনুগ্রহ করে পেজ রিলোড করুন।',
            'Firebase Authentication handler is unavailable.',
            lang
          )
        );
        return;
      }
      setError('');
      setSuperAdminStatusMsg(null);
      setSuperAdminLoading(true);
      try {
        const res = await onSuperAdminFirebaseSignIn(cleanEmail, adminPassword);
        if (res.ok) {
          saveRememberedLoginIdentifier(cleanEmail, rememberMe);
          setAdminPassword('');
          onClose();
          return;
        }
        if (res.unverifiedEmail) {
          setSuperAdminUnverified(true);
          setSuperAdminStatusMsg(
            res.message ??
              b(
                'আপনার ইমেইল ভেরিফিকেশন অপেক্ষমাণ। ইনবক্সে পাঠানো লিংকে ক্লিক করে যাচাই করুন অথবা Google দিয়ে লগইন করুন।',
                'Email verification pending. Click the link in your inbox or sign in with Google.',
                lang
              )
          );
        } else {
          setError(
            res.message ??
              b(
                'সুপার অ্যাডমিন Firebase ইমেইল বা পাসওয়ার্ড সঠিক নয়।',
                'Invalid Super Admin Firebase email or password.',
                lang
              )
          );
        }
      } finally {
        setSuperAdminLoading(false);
      }
      return;
    }

    if (viewMode === 'school') {
      const schoolCheck = validateLoginIdentifierRealtime(schoolAuthIdentifier);
      if (!schoolCheck.valid) {
        setError(b(schoolCheck.messageBn, schoolCheck.messageEn, lang));
        return;
      }
      const auth = authenticateSchoolAccount(schools, schoolAuthIdentifier, schoolAuthPassword);
      if (!auth.ok || !auth.school) {
        setError(b(auth.errorBn ?? 'বিদ্যালয় লগইন সঠিক নয়।', auth.errorEn ?? 'Invalid school login.', lang));
        return;
      }
      saveRememberedLoginIdentifier(schoolAuthIdentifier, rememberMe);
      setError('');
      onLoginSuccess('school_admin', undefined, auth.school.id);
      onClose();
      return;
    }

    if (viewMode === 'guardian') {
      const guardianCheck = validateLoginIdentifierRealtime(guardianIdentifier);
      if (!guardianCheck.valid) {
        setError(b(guardianCheck.messageBn, guardianCheck.messageEn, lang));
        return;
      }
      const guardianAuth = authenticateGuardianAccount(students, guardianIdentifier, guardianPassword);
      if (!guardianAuth.ok) {
        setError(
          b(
            guardianAuth.errorBn ?? 'অভিভাবক লগইন তথ্য সঠিক নয়।',
            guardianAuth.errorEn ?? 'Invalid guardian credentials.',
            lang
          )
        );
        return;
      }
      saveRememberedLoginIdentifier(guardianIdentifier, rememberMe);
      setError('');
      onLoginSuccess('guardian', guardianAuth.linkedStudentIds?.[0], undefined, {
        guardianMobile: guardianAuth.guardianMobile,
        linkedStudentIds: guardianAuth.linkedStudentIds,
      });
      onClose();
      return;
    }

    if (viewMode === 'student') {
      const res = validateStudentActivationLogin(
        students,
        studentIdInput,
        studentMobileInput,
        showActivationInput ? activationCodeInput : 'ACT-0012-74'
      );
      if (!res.ok || !res.student) {
        setError(b(res.errorBn ?? 'তথ্য সঠিক নয়।', res.errorEn ?? 'Invalid student login.', lang));
        return;
      }
      saveRememberedLoginIdentifier(studentIdInput, rememberMe);
      setError('');
      onLoginSuccess('student', res.student.id, res.student.schoolId);
      onClose();
      return;
    }

    const rawId = identifier;
    const rawPass = password;
    const idCheck = validateLoginIdentifierRealtime(rawId);

    if (!idCheck.valid || !rawPass.trim()) {
      setError(
        idCheck.valid
          ? b('লগইন আইডি ও পাসওয়ার্ড দিন।', 'Please enter login identifier and password.', lang)
          : b(idCheck.messageBn, idCheck.messageEn, lang)
      );
      return;
    }

    const matchedSchool = authenticateSchoolAccount(schools, rawId, rawPass);
    if (matchedSchool.ok && matchedSchool.school) {
      saveRememberedLoginIdentifier(rawId, rememberMe);
      setError('');
      onLoginSuccess('school_admin', undefined, matchedSchool.school.id);
      onClose();
      return;
    }

    const matchedTeacher = authenticateTeacherAccount(teachers, rawId, rawPass);
    if (matchedTeacher.ok && matchedTeacher.teacher) {
      saveRememberedLoginIdentifier(rawId, rememberMe);
      setError('');
      onLoginSuccess('teacher', undefined, matchedTeacher.teacher.schoolId, {
        teacherId: matchedTeacher.teacher.id,
      });
      onClose();
      return;
    }

    const matchedGuardian = authenticateGuardianAccount(students, rawId, rawPass);
    if (matchedGuardian.ok) {
      saveRememberedLoginIdentifier(rawId, rememberMe);
      setError('');
      onLoginSuccess('guardian', matchedGuardian.linkedStudentIds?.[0], undefined, {
        guardianMobile: matchedGuardian.guardianMobile,
        linkedStudentIds: matchedGuardian.linkedStudentIds,
      });
      onClose();
      return;
    }

    setError(
      b(
        'লগইন তথ্য বা পাসওয়ার্ড সঠিক নয়। নিচের রোল প্রিসেট অথবা সঠিক পাসওয়ার্ড ব্যবহার করুন।',
        'Invalid credentials or password. Try one of the quick role presets below.',
        lang
      )
    );
  };

  // Super Admin Dark Purple Secure Access View — strictly authenticated via Firebase Auth
  if (viewMode === 'super_admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050814]/85 backdrop-blur-sm">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="super-admin-modal-title"
          data-testid="super-admin-auth-modal"
          className="relative w-full max-w-md rounded-2xl bg-[#0d1324] border border-violet-500/35 shadow-2xl shadow-violet-950/50 p-6 sm:p-7 space-y-5 text-slate-100 max-h-[92vh] overflow-y-auto"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={tr('close', lang)}
            className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="text-center space-y-2.5 pt-1">
            <OfficialAppLogo
              sizeClass="w-14 h-14"
              roundedClass="rounded-xl"
              paddingClass="p-1"
              className="mx-auto shadow-md"
            />
            <div className="inline-block px-3 py-0.5 rounded-full bg-violet-950/70 border border-violet-500/40 text-[11px] font-semibold text-violet-300">
              {b('Firebase Auth · সংরক্ষিত কেন্দ্রীয় পোর্টাল', 'Firebase Auth · Protected Central Portal', lang)}
            </div>
            <h3 id="super-admin-modal-title" className="text-xl font-extrabold text-white">
              {b('সুপার অ্যাডমিন সিকিউর অ্যাক্সেস', 'Super Admin Secure Access', lang)}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {b(
                'শুধুমাত্র অনুমোদিত Super Central Admin Gmail এবং Firebase Authentication পাসওয়ার্ড অথবা Google Sign-In দিয়ে প্রবেশ করুন।',
                'Sign in using your authorized Super Central Admin Gmail and Firebase password or verified Google account.',
                lang
              )}
            </p>
          </div>

          <form onSubmit={(e) => void handleLogin(e)} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                {b('Super Central Admin Gmail / ইমেইল *', 'Super Central Admin Gmail *', lang)}
              </label>
              <input
                type="email"
                data-testid="super-admin-email-input"
                value={adminIdentifier}
                onChange={(e) => {
                  setAdminIdentifier(e.target.value);
                  setError('');
                  setSuperAdminUnverified(false);
                }}
                placeholder={CENTRAL_ADMIN_CREDENTIALS.email}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-700 bg-slate-900/90 text-white placeholder:text-slate-500 outline-none focus:border-violet-500"
              />
              {adminIdentifier.trim().length > 0 && (
                <p
                  data-testid="login-modal-identifier-validation"
                  className={`mt-1 text-[11px] font-medium ${
                    activeIdentifierValidation.valid && activeIdentifierValidation.kind === 'email'
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  }`}
                >
                  {b(activeIdentifierValidation.messageBn, activeIdentifierValidation.messageEn, lang)}
                </p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-300">
                  {b('Firebase অ্যাকাউন্ট পাসওয়ার্ড *', 'Firebase Account Password *', lang)}
                </label>
                {onOpenFirebaseRecovery && (
                  <button
                    type="button"
                    data-testid="super-admin-forgot-password-btn"
                    onClick={() => {
                      onClose();
                      onOpenFirebaseRecovery(adminIdentifier.trim() || CENTRAL_ADMIN_CREDENTIALS.email);
                    }}
                    className="text-[11px] font-semibold text-violet-300 hover:underline cursor-pointer"
                  >
                    {b('পাসওয়ার্ড ভুলে গেছেন?', 'Forgot / Reset Password?', lang)}
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  data-testid="super-admin-password-input"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    setError('');
                  }}
                  placeholder={b('Firebase-এ সেট করা পাসওয়ার্ড লিখুন', 'Enter your Firebase Auth password', lang)}
                  className="w-full h-10 pl-3.5 pr-10 rounded-xl border border-slate-700 bg-slate-900/90 text-white placeholder:text-slate-500 outline-none focus:border-violet-500"
                />
                <button
                  type="button"
                  data-testid="login-modal-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? b('পাসওয়ার্ড লুকান', 'Hide password', lang) : b('পাসওয়ার্ড দেখুন', 'Show password', lang)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <label className="inline-flex items-center gap-2 mt-2.5 text-[11px] font-medium text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  data-testid="login-modal-remember-me"
                  checked={rememberMe}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setRememberMe(next);
                    saveRememberedLoginIdentifier(adminIdentifier, next);
                  }}
                  className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-violet-500 cursor-pointer"
                />
                <span>{b('মনে রাখুন (Remember Me)', 'Remember Me', lang)}</span>
              </label>
            </div>

            {superAdminUnverified && (
              <div
                data-testid="super-admin-verification-box"
                className="rounded-xl bg-amber-950/50 border border-amber-500/40 p-3.5 space-y-2.5 text-xs"
              >
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <MailCheck className="w-4 h-4 shrink-0" />
                  <span>{b('ইমেইল ভেরিফিকেশন প্রয়োজন', 'Email Verification Required', lang)}</span>
                </div>
                {superAdminStatusMsg && (
                  <p className="text-[11px] text-amber-100 leading-relaxed">{superAdminStatusMsg}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {onSuperAdminRecheckVerification && (
                    <button
                      type="button"
                      disabled={superAdminLoading}
                      onClick={async () => {
                        setSuperAdminLoading(true);
                        setError('');
                        try {
                          const res = await onSuperAdminRecheckVerification();
                          if (res.ok) {
                            setAdminPassword('');
                            onClose();
                          } else if (res.message) {
                            setError(res.message);
                          }
                        } finally {
                          setSuperAdminLoading(false);
                        }
                      }}
                      className="flex-1 h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{b('ভেরিফিকেশন যাচাই করুন', 'Verify & Enter', lang)}</span>
                    </button>
                  )}
                  {onSuperAdminResendVerification && (
                    <button
                      type="button"
                      disabled={superAdminLoading}
                      onClick={async () => {
                        setSuperAdminLoading(true);
                        setError('');
                        try {
                          const res = await onSuperAdminResendVerification();
                          if (res.message) setSuperAdminStatusMsg(res.message);
                        } finally {
                          setSuperAdminLoading(false);
                        }
                      }}
                      className="h-9 px-3 rounded-lg border border-amber-400/40 bg-slate-900 hover:bg-slate-800 text-amber-200 font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{b('পুনরায় লিংক পাঠান', 'Resend Link', lang)}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-xl bg-slate-900/70 border border-slate-700/80 p-3.5 space-y-1 text-[11px] text-slate-400">
              <div className="font-semibold text-violet-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                {b('নিরাপত্তা নীতি ও Firebase যাচাইকরণ:', 'Firebase Zero-Trust Security Notice:', lang)}
              </div>
              <p className="leading-relaxed">
                {b(
                  'পুরানো স্ট্যাটিক অ্যাডমিন পাসওয়ার্ড বাতিল করা হয়েছে। শুধুমাত্র Firebase Authentication-এ নিবন্ধিত নির্ধারিত Super Central Admin Gmail ও পাসওয়ার্ড দিয়েই প্রবেশ করা যাবে।',
                  'Legacy static admin credentials have been permanently removed. Access requires verified Firebase Authentication.',
                  lang
                )}
              </p>
            </div>

            {error && (
              <p role="alert" data-testid="super-admin-login-error" className="text-xs font-semibold text-red-400">
                {error}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-3 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {b('পাবলিক পোর্টালে ফেরত', 'Back to Portal', lang)}
              </button>
              <button
                type="submit"
                disabled={superAdminLoading}
                data-testid="super-admin-login-submit-btn"
                className="h-10 px-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-violet-950/60 cursor-pointer disabled:opacity-60"
              >
                {superAdminLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {b('Firebase নিরাপদ প্রবেশ', 'Firebase Secure Enter', lang)}
              </button>
            </div>

            {onGoogleSignIn && (
              <button
                type="button"
                disabled={googleSigningIn || superAdminLoading}
                data-testid="super-admin-google-btn"
                onClick={() => void onGoogleSignIn()}
                className="w-full h-10 rounded-xl bg-white text-slate-900 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-100 cursor-pointer disabled:opacity-60"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>{b('Google দিয়ে লগইন (Firebase)', 'Continue with Google (Firebase)', lang)}</span>
              </button>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              <button type="button" onClick={() => setViewMode('teacher')} className="hover:text-blue-300 cursor-pointer">
                {b('শিক্ষক লগইন', 'Teacher Login', lang)}
              </button>
              <button type="button" onClick={() => setViewMode('student')} className="hover:text-amber-300 cursor-pointer">
                {b('শিক্ষার্থী লগইন', 'Student Login', lang)}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const isStudentMode = viewMode === 'student';
  const isSchoolMode = viewMode === 'school';
  const isGuardianMode = viewMode === 'guardian';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        data-testid="login-modal-dialog"
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={tr('close', lang)}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Modal Mode Switcher Pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 pr-6 text-[11px]">
          <button
            type="button"
            onClick={() => {
              setViewMode('school');
              setError('');
            }}
            className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
              isSchoolMode
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {b('🏫 বিদ্যালয় লগইন', '🏫 School', lang)}
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('teacher');
              setError('');
            }}
            className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
              !isStudentMode && !isSchoolMode && !isGuardianMode
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {b('শিক্ষক / স্টাফ', 'Teacher', lang)}
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('guardian');
              setError('');
            }}
            className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
              isGuardianMode
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {b('অভিভাবক', 'Guardian', lang)}
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('student');
              setError('');
            }}
            className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
              isStudentMode
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {b('শিক্ষার্থী', 'Student', lang)}
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('super_admin');
              setError('');
            }}
            className="px-2.5 py-1 rounded-lg font-semibold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 cursor-pointer"
          >
            {b('সুপার অ্যাডমিন', 'Super Admin', lang)}
          </button>
        </div>

        {isGuardianMode ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 id="login-modal-title" className="text-base font-extrabold text-slate-900 dark:text-white">
                  {b('অভিভাবক পোর্টাল লগইন (Guardian)', 'Guardian Portal Login', lang)}
                </h3>
                <p className="text-xs text-slate-500">
                  {b('নিবন্ধিত মোবাইল নম্বর / Guardian Link Code এবং পাসওয়ার্ড দিয়ে প্রবেশ করুন', 'Sign in with registered guardian mobile or link code', lang)}
                </p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {b('অভিভাবকের মোবাইল / Link Code *', 'Guardian Mobile / Link Code *', lang)}
                </label>
                <input
                  data-testid="guardian-login-identifier"
                  type="text"
                  value={guardianIdentifier}
                  onChange={(e) => {
                    setGuardianIdentifier(e.target.value);
                    setError('');
                  }}
                  placeholder="01712345678"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono outline-none focus:border-sky-600"
                />
                {guardianIdentifier.trim().length > 0 && (
                  <p
                    data-testid="login-modal-identifier-validation"
                    className={`mt-1 text-[11px] font-medium ${
                      activeIdentifierValidation.valid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'
                    }`}
                  >
                    {b(activeIdentifierValidation.messageBn, activeIdentifierValidation.messageEn, lang)}
                  </p>
                )}
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {b('পাসওয়ার্ড *', 'Password *', lang)}
                </label>
                <div className="relative">
                  <input
                    data-testid="guardian-login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={guardianPassword}
                    onChange={(e) => {
                      setGuardianPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="••••••••"
                    className="w-full h-10 pl-3 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-sky-600"
                  />
                  <button
                    type="button"
                    data-testid="login-modal-password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? b('পাসওয়ার্ড লুকান', 'Hide password', lang) : b('পাসওয়ার্ড দেখুন', 'Show password', lang)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  data-testid="login-modal-remember-me"
                  checked={rememberMe}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setRememberMe(next);
                    saveRememberedLoginIdentifier(guardianIdentifier, next);
                  }}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-sky-600 cursor-pointer"
                />
                <span>{b('মনে রাখুন (Remember Me)', 'Remember Me', lang)}</span>
              </label>

              {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}

              <div className="rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 p-3 flex items-center justify-between gap-2">
                <span className="text-sky-900 dark:text-sky-200 font-medium">
                  {b('নমুনা অভিভাবক:', 'Demo Guardian:', lang)} <span className="font-mono">01712345678</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setGuardianIdentifier('01712345678');
                    setGuardianPassword('parent@123');
                    setError('');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-200 font-semibold cursor-pointer"
                >
                  {b('ফিল করুন', 'Fill', lang)}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                >
                  {tr('cancel', lang)}
                </button>
                <button
                  type="submit"
                  data-testid="guardian-login-submit-btn"
                  className="h-10 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold cursor-pointer"
                >
                  {b('অভিভাবক প্রবেশ', 'Sign In', lang)}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {!isGuardianMode && isSchoolMode ? (
          /* School Portal Isolation Login Card */
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <OfficialAppLogo
                sizeClass="w-14 h-14"
                roundedClass="rounded-xl"
                paddingClass="p-1"
                className="mx-auto shadow-sm"
              />
              <h3 id="login-modal-title" className="text-lg font-extrabold text-slate-900 dark:text-white">
                {b('🏫 বিদ্যালয় পোর্টাল লগইন (School Login)', '🏫 School Portal Login', lang)}
              </h3>
              <p className="text-xs text-slate-500">
                {b(
                  'School ID (SCH-2026-XXXXX) / স্কুল কোড / ইমেইল এবং পাসওয়ার্ড দিয়ে প্রবেশ করুন',
                  'Sign in using School ID (SCH-2026-XXXXX), school code, or official email',
                  lang
                )}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {b('School ID / স্কুল কোড / ইমেইল *', 'School ID / Code / Email *', lang)}
                </label>
                <input
                  data-testid="school-login-identifier"
                  type="text"
                  value={schoolAuthIdentifier}
                  onChange={(e) => {
                    setSchoolAuthIdentifier(e.target.value);
                    setError('');
                  }}
                  placeholder="SCH-2026-00015 বা GPS-1042"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono outline-none focus:border-emerald-600"
                />
                {schoolAuthIdentifier.trim().length > 0 && (
                  <p
                    data-testid="login-modal-identifier-validation"
                    className={`mt-1 text-[11px] font-medium ${
                      activeIdentifierValidation.valid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'
                    }`}
                  >
                    {b(activeIdentifierValidation.messageBn, activeIdentifierValidation.messageEn, lang)}
                  </p>
                )}
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {b('পাসওয়ার্ড *', 'Password *', lang)}
                </label>
                <div className="relative">
                  <input
                    data-testid="school-login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={schoolAuthPassword}
                    onChange={(e) => {
                      setSchoolAuthPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="••••••••"
                    className="w-full h-10 pl-3 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-emerald-600"
                  />
                  <button
                    type="button"
                    data-testid="login-modal-password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? b('পাসওয়ার্ড লুকান', 'Hide password', lang) : b('পাসওয়ার্ড দেখুন', 'Show password', lang)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  data-testid="login-modal-remember-me"
                  checked={rememberMe}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setRememberMe(next);
                    saveRememberedLoginIdentifier(schoolAuthIdentifier, next);
                  }}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 cursor-pointer"
                />
                <span>{b('মনে রাখুন (Remember Me)', 'Remember Me', lang)}</span>
              </label>

              {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}

              <div className="rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 space-y-2">
                <div className="font-semibold text-emerald-900 dark:text-emerald-200">
                  {b('নমুনা বিদ্যালয় অ্যাকাউন্ট (আইসোলেশন টেস্ট):', 'Quick School Login Presets:', lang)}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSchoolAuthIdentifier('SCH-2026-00015');
                      setSchoolAuthPassword('school@123');
                      setError('');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-medium cursor-pointer"
                  >
                    মডেল সরকারি প্রা. বি. (SCH-2026-00015)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSchoolAuthIdentifier('SCH-2026-00016');
                      setSchoolAuthPassword('school@123');
                      setError('');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200 font-medium cursor-pointer"
                  >
                    আদর্শ বালিকা উচ্চ বি. (SCH-2026-00016)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                >
                  {tr('cancel', lang)}
                </button>
                <button
                  type="submit"
                  data-testid="school-login-submit-btn"
                  className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  {b('বিদ্যালয়ে প্রবেশ করুন', 'Sign In to School', lang)}
                </button>
              </div>
            </form>
          </div>
        ) : !isGuardianMode && isStudentMode ? (
          /* Student Portal Modal Layout (matches student_login_modal_8a914aa8.png) */
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <OfficialAppLogo sizeClass="w-12 h-12" roundedClass="rounded-xl" paddingClass="p-1" />
              <div>
                <h3 id="login-modal-title" className="text-base font-extrabold text-slate-900 dark:text-white">
                  {b('শিক্ষার্থী পোর্টাল (Student Portal)', 'Student Portal', lang)}
                </h3>
                <p className="text-xs text-slate-500">
                  {b('হাজিরা বিবরণী, ক্লাস রুটিন, বাড়ির কাজ ও পরীক্ষার মার্কশিট দর্শন', 'Attendance, class routine, homework & exam marksheets', lang)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setStudentSubTab('code_id')}
                className={`py-1.5 rounded-lg font-semibold cursor-pointer ${
                  studentSubTab === 'code_id'
                    ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {b('স্কুল কোড ও শিক্ষার্থী আইডি', 'School Code & ID', lang)}
              </button>
              <button
                type="button"
                onClick={() => setStudentSubTab('username')}
                className={`py-1.5 rounded-lg font-semibold cursor-pointer ${
                  studentSubTab === 'username'
                    ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {b('ব্যবহারকারী নাম (Username)', 'Username', lang)}
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-3 text-xs">
              {studentSubTab === 'code_id' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {b('স্কুল কোড (School Code - ঐচ্ছিক)', 'School Code (Optional)', lang)}
                  </label>
                  <input
                    type="text"
                    value={schoolCodeInput}
                    onChange={(e) => setSchoolCodeInput(e.target.value)}
                    placeholder="e.g. GPS-1042"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono outline-none focus:border-amber-500"
                  />
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {b('শিক্ষার্থী আইডি (Student ID) *', 'Student ID *', lang)}
                </label>
                <input
                  data-testid="student-login-id"
                  type="text"
                  value={studentIdInput}
                  onChange={(e) => {
                    setStudentIdInput(e.target.value);
                    setError('');
                  }}
                  placeholder="STD-2026-GPS1042-0012"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono outline-none focus:border-amber-500"
                />
                {studentIdInput.trim().length > 0 && (
                  <p
                    data-testid="login-modal-identifier-validation"
                    className={`mt-1 text-[11px] font-medium ${
                      activeIdentifierValidation.valid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'
                    }`}
                  >
                    {b(activeIdentifierValidation.messageBn, activeIdentifierValidation.messageEn, lang)}
                  </p>
                )}
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {b('নিবন্ধিত মোবাইল / পাসওয়ার্ড *', 'Registered Mobile / Password *', lang)}
                </label>
                <div className="relative">
                  <input
                    data-testid="student-login-mobile"
                    type={showPassword ? 'text' : 'tel'}
                    value={studentMobileInput}
                    onChange={(e) => {
                      setStudentMobileInput(e.target.value);
                      setError('');
                    }}
                    placeholder="01712345678"
                    className="w-full h-10 pl-3 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    data-testid="login-modal-password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? b('লুকান', 'Hide', lang) : b('দেখুন', 'Show', lang)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  data-testid="login-modal-remember-me"
                  checked={rememberMe}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setRememberMe(next);
                    saveRememberedLoginIdentifier(studentIdInput, next);
                  }}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-amber-600 cursor-pointer"
                />
                <span>{b('মনে রাখুন (Remember Me)', 'Remember Me', lang)}</span>
              </label>
              {showActivationInput && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {b('এককালীন অ্যাক্টিভেশন কোড (One-Time Activation Code)', 'One-Time Activation Code', lang)}
                  </label>
                  <input
                    type="text"
                    value={activationCodeInput}
                    onChange={(e) => {
                      setActivationCodeInput(e.target.value);
                      setError('');
                    }}
                    placeholder="ACT-0012-74"
                    className="w-full h-10 px-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-slate-800 font-mono outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}

              <button
                type="submit"
                data-testid="student-login-submit-btn"
                className="w-full h-10 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer transition-colors"
              >
                {b('শিক্ষার্থী ড্যাশবোর্ডে প্রবেশ করুন', 'Sign In to Student Portal', lang)}
              </button>

              <button
                type="button"
                onClick={() => setShowActivationInput((s) => !s)}
                className="w-full h-10 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {b('প্রথমবার প্রবেশ করছেন? এককালীন কোড দিয়ে সক্রিয় করুন', 'First time? Activate with One-Time Code', lang)}
              </button>
            </form>
          </div>
        ) : !isGuardianMode ? (
          /* Teacher / Staff / Portal Login Card (matches teacher_login_modal_d73d5b0d.png) */
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <OfficialAppLogo
                sizeClass="w-14 h-14"
                roundedClass="rounded-xl"
                paddingClass="p-1"
                className="mx-auto shadow-sm"
              />
              <h3 id="login-modal-title" className="text-lg font-extrabold text-slate-900 dark:text-white">
                {b('শিক্ষক ও পোর্টাল লগইন', 'Teacher & Portal Login', lang)}
              </h3>
              <p className="text-xs text-slate-500">
                {b('Teacher ID অথবা ইউজারনেম ও পাসওয়ার্ড দিয়ে প্রবেশ করুন', 'Sign in with Teacher ID, username, or quick role preset', lang)}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {b('Teacher ID বা ব্যবহারকারী নাম *', 'Teacher ID / Username *', lang)}
                </label>
                <input
                  data-testid="teacher-login-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError('');
                  }}
                  placeholder="e.g. TCH-GPS1042-02 বা tch_rahim"
                  className={`w-full h-10 px-3 rounded-xl border bg-slate-50 dark:bg-slate-800 outline-none ${
                    identifier.trim().length > 0 && !activeIdentifierValidation.valid
                      ? 'border-red-500 focus:border-red-600'
                      : 'border-slate-200 dark:border-slate-700 focus:border-blue-600'
                  }`}
                />
                {identifier.trim().length > 0 && (
                  <p
                    data-testid="login-modal-identifier-validation"
                    className={`mt-1 text-[11px] font-medium ${
                      activeIdentifierValidation.valid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'
                    }`}
                  >
                    {b(activeIdentifierValidation.messageBn, activeIdentifierValidation.messageEn, lang)}
                  </p>
                )}
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {b('পাসওয়ার্ড *', 'Password *', lang)}
                </label>
                <div className="relative">
                  <input
                    data-testid="teacher-login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="••••••••"
                    className="w-full h-10 pl-3 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    data-testid="login-modal-password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? b('পাসওয়ার্ড লুকান', 'Hide password', lang) : b('পাসওয়ার্ড দেখুন', 'Show password', lang)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    data-testid="login-modal-remember-me"
                    checked={rememberMe}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setRememberMe(next);
                      saveRememberedLoginIdentifier(identifier, next);
                    }}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 cursor-pointer"
                  />
                  <span>{b('মনে রাখুন (Remember Me)', 'Remember Me', lang)}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotHelp((v) => !v)}
                  className="text-blue-700 dark:text-blue-400 hover:underline font-medium cursor-pointer flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" />
                  {b('পাসওয়ার্ড ভুলে গেছেন?', 'Forgot password?', lang)}
                </button>
              </div>

              {showForgotHelp && (
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200">
                  {b(
                    'পাসওয়ার্ড রিসেটের জন্য আপনার বিদ্যালয়ের প্রধান শিক্ষক অথবা কেন্দ্রীয় প্রশাসনের সাথে যোগাযোগ করুন।',
                    'Contact your Head Teacher / School Admin or Central Admin to reset credentials.',
                    lang
                  )}
                </div>
              )}

              {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}

              {/* Quick Role Presets */}
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                <div className="font-semibold text-slate-700 dark:text-slate-200">
                  {b('দ্রুত রোল টেস্ট প্রিসেট:', 'Quick Role Presets:', lang)}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIdentifier('tch_rahim');
                      setPassword('teacher@123');
                      setError('');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 font-medium cursor-pointer"
                  >
                    Teacher (TCH-02)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIdentifier('head_gps1042');
                      setPassword('school@123');
                      setError('');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-medium cursor-pointer"
                  >
                    School Admin (GPS-1042)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIdentifier('01712345678');
                      setPassword('parent@123');
                      setError('');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-200 font-medium cursor-pointer"
                  >
                    Guardian (01712345678)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setViewMode('super_admin');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-200 font-medium cursor-pointer"
                  >
                    Super Admin (Firebase Auth)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                >
                  {tr('cancel', lang)}
                </button>
                <button
                  type="submit"
                  data-testid="teacher-login-submit-btn"
                  className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  {b('লগইন করুন', 'Sign In', lang)}
                </button>
              </div>

              {onGoogleSignIn && (
                <button
                  type="button"
                  disabled={googleSigningIn}
                  onClick={() => void onGoogleSignIn()}
                  className="w-full h-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>{b('Google দিয়ে লগইন (Firebase Auth)', 'Continue with Google (Firebase Auth)', lang)}</span>
                </button>
              )}

              {onOpenTeacherRegistration && (
                <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenTeacherRegistration();
                    }}
                    className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {b('নতুন শিক্ষক? এখানে ক্লিক করে নিবন্ধন আবেদন করুন', 'New teacher? Click here to apply for registration', lang)}
                  </button>
                </div>
              )}
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
};
