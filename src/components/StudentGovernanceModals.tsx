import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  Bell,
  Edit3,
  FileEdit,
  PauseCircle,
  ShieldAlert,
  X,
} from 'lucide-react';
import type {
  Language,
  NoticeItem,
  SchoolRecord,
  StudentImportantFieldKey,
  StudentRecord,
} from '../types';
import { ALL_CLASSES } from '../data/mockData';
import {
  IMPORTANT_FIELD_LABELS,
  type StudentEditPatch,
} from '../utils/studentLifecycle';
import { b, tr } from '../i18n/translations';

/* 1. Admin Student Edit Modal */
export const StudentEditModal: React.FC<{
  student: StudentRecord | null;
  lang: Language;
  onClose: () => void;
  onSave: (studentId: string, patch: StudentEditPatch) => void;
}> = ({ student, lang, onClose, onSave }) => {
  const [nameBn, setNameBn] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [dob, setDob] = useState('');
  const [birthRegNo, setBirthRegNo] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [guardianMobile, setGuardianMobile] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [address, setAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [className, setClassName] = useState('Class 4');
  const [section, setSection] = useState('ক (A)');
  const [roll, setRoll] = useState(1);
  const [gpa, setGpa] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (student) {
      setNameBn(student.nameBn);
      setNameEn(student.nameEn);
      setGender(student.gender);
      setDob(student.dob);
      setBirthRegNo(student.birthRegNo);
      setFatherName(student.fatherName);
      setMotherName(student.motherName);
      setGuardianMobile(student.guardianMobile);
      setEmergencyContact(student.emergencyContact ?? student.guardianMobile);
      setAddress(student.address ?? '');
      setBloodGroup(student.bloodGroup);
      setClassName(student.className);
      setSection(student.section);
      setRoll(student.roll);
      setGpa(student.gpa ?? '');
      setReason('');
      setError('');
    }
  }, [student]);

  if (!student) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameBn.trim() || !nameEn.trim() || !guardianMobile.trim()) {
      setError(b('শিক্ষার্থীর নাম ও অভিভাবকের মোবাইল নম্বর আবশ্যক।', 'Student name and guardian mobile are required.', lang));
      return;
    }
    onSave(student.id, {
      nameBn,
      nameEn,
      gender,
      dob,
      birthRegNo,
      fatherName,
      motherName,
      guardianMobile,
      emergencyContact,
      address,
      bloodGroup,
      className,
      section,
      roll: Number(roll) || student.roll,
      gpa,
      reason: reason.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {b('শিক্ষার্থীর তথ্য সম্পাদনা (Edit Student)', 'Edit Student Information', lang)}
              </h3>
              <p className="text-xs font-mono text-slate-500">{student.permanentId}</p>
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

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">{b('বাংলা নাম *', 'Name (Bangla) *', lang)}</label>
              <input
                type="text"
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('ইংরেজি নাম *', 'Name (English) *', lang)}</label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('লিঙ্গ', 'Gender', lang)}</label>
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
              <label className="block font-semibold mb-1">{b('জন্মনিবন্ধন নম্বর', 'Birth Reg No.', lang)}</label>
              <input
                type="text"
                value={birthRegNo}
                onChange={(e) => setBirthRegNo(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('পিতার নাম', 'Father Name', lang)}</label>
              <input
                type="text"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('মাতার নাম', 'Mother Name', lang)}</label>
              <input
                type="text"
                value={motherName}
                onChange={(e) => setMotherName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('অভিভাবকের মোবাইল *', 'Guardian Mobile *', lang)}</label>
              <input
                type="tel"
                value={guardianMobile}
                onChange={(e) => setGuardianMobile(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('জরুরি যোগাযোগ', 'Emergency Contact', lang)}</label>
              <input
                type="tel"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('শ্রেণি', 'Class', lang)}</label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              >
                {ALL_CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-semibold mb-1">{b('শাখা', 'Section', lang)}</label>
                <input
                  type="text"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('রোল', 'Roll', lang)}</label>
                <input
                  type="number"
                  min={1}
                  value={roll}
                  onChange={(e) => setRoll(Number(e.target.value))}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 tabular-nums outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('রক্ত', 'Blood', lang)}</label>
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
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('জন্মতারিখ', 'Date of Birth', lang)}</label>
              <input
                type="text"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('ঠিকানা', 'Address', lang)}</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">{b('সম্পাদনার কারণ / মন্তব্য', 'Reason / Audit Note', lang)}</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={b('যেমন: জন্মনিবন্ধন অনুযায়ী তথ্য হালনাগাদ', 'e.g. Updated per Birth Certificate', lang)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
            />
          </div>

          {error && <p className="text-red-600 font-medium">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
            >
              {tr('cancel', lang)}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
            >
              {b('পরিবর্তন সংরক্ষণ করুন', 'Save Student Changes', lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* 2. Student School Transfer Modal */
export const StudentTransferModal: React.FC<{
  student: StudentRecord | null;
  schools: SchoolRecord[];
  lang: Language;
  onClose: () => void;
  onTransfer: (studentId: string, targetSchoolId: string, reason: string) => void;
}> = ({ student, schools, lang, onClose, onTransfer }) => {
  const otherSchools = schools.filter((s) => s.id !== student?.schoolId && s.status !== 'deactivated');
  const [targetSchoolId, setTargetSchoolId] = useState(otherSchools[0]?.id ?? '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (student) {
      const next = schools.find((s) => s.id !== student.schoolId && s.status !== 'deactivated');
      setTargetSchoolId(next?.id ?? '');
      setReason('');
      setError('');
    }
  }, [student, schools]);

  if (!student) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSchoolId) {
      setError(b('নতুন বিদ্যালয় নির্বাচন করুন।', 'Select a destination school.', lang));
      return;
    }
    if (!reason.trim()) {
      setError(b('বিদ্যালয় পরিবর্তনের কারণ লিখুন।', 'Enter a transfer reason.', lang));
      return;
    }
    onTransfer(student.id, targetSchoolId, reason.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {b('শিক্ষার্থী বিদ্যালয় পরিবর্তন (School Transfer)', 'Student School Transfer', lang)}
              </h3>
              <p className="text-xs text-slate-500">
                {student.nameBn} · <span className="font-mono">{student.permanentId}</span>
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

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
            <div className="text-[11px] text-slate-500">{b('বর্তমান বিদ্যালয়', 'Current School', lang)}</div>
            <div className="font-bold text-slate-900 dark:text-white mt-0.5">
              {student.schoolNameBn} ({student.schoolId}) · {student.className}
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">{b('নতুন বিদ্যালয় *', 'New School *', lang)}</label>
            <select
              value={targetSchoolId}
              onChange={(e) => setTargetSchoolId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
            >
              {otherSchools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameBn} ({s.code}) — {s.district}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">{b('পরিবর্তনের কারণ *', 'Reason for Transfer *', lang)}</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              placeholder={b('যেমন: অভিভাবকের কর্মস্থল বদলি / আবাসস্থল পরিবর্তন', 'e.g. Guardian job transfer / relocation', lang)}
              className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
            />
          </div>

          <p className="text-[11px] text-slate-500">
            {b(
              'দ্রষ্টব্য: বিদ্যালয় পরিবর্তন করলেও শিক্ষার্থীর স্থায়ী Permanent ID অপরিবর্তিত থাকবে এবং পূর্বের বিদ্যালয়ের রেকর্ড সংরক্ষিত থাকবে।',
              'Note: Permanent ID remains unchanged and previous school history is preserved.',
              lang
            )}
          </p>

          {error && <p className="text-red-600 font-medium">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
            >
              {tr('cancel', lang)}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-semibold cursor-pointer"
            >
              {b('বিদ্যালয় পরিবর্তন সম্পন্ন করুন', 'Confirm Transfer', lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* 3. Student Notice / Message Modal */
export const StudentNoticeModal: React.FC<{
  student: StudentRecord | null;
  lang: Language;
  senderLabel: string;
  onClose: () => void;
  onSend: (student: StudentRecord, notice: NoticeItem) => void;
}> = ({ student, lang, senderLabel, onClose, onSend }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  if (!student) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError(b('নোটিশের শিরোনাম ও বার্তা লিখুন।', 'Enter notice title and message.', lang));
      return;
    }
    onSend(student, {
      id: `not-stu-${Date.now()}`,
      titleBn: title.trim(),
      titleEn: title.trim(),
      bodyBn: body.trim(),
      bodyEn: body.trim(),
      category: 'general',
      audience: 'students',
      date: '১৭ নভে ২০২৬',
      schoolId: student.schoolId,
      author: senderLabel,
    });
    setTitle('');
    setBody('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-sky-700 dark:text-sky-400" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {b('শিক্ষার্থীকে নোটিশ / বার্তা পাঠান', 'Send Notice / Message to Student', lang)}
              </h3>
              <p className="text-xs text-slate-500">
                {student.nameBn} ({student.permanentId})
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

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">{b('নোটিশের শিরোনাম *', 'Notice Title *', lang)}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError('');
              }}
              placeholder={b('যেমন: উপস্থিতি ও নথি হালনাগাদ নির্দেশনা', 'e.g. Attendance & Document Reminder', lang)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">{b('বিস্তারিত বার্তা *', 'Message *', lang)}</label>
            <textarea
              rows={3}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setError('');
              }}
              placeholder={b('শিক্ষার্থী, স্কুল ও অভিভাবকের জন্য বার্তা লিখুন...', 'Enter notice details...', lang)}
              className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
            />
          </div>
          {error && <p className="text-red-600 font-medium">{error}</p>}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
            >
              {tr('cancel', lang)}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-700 hover:bg-sky-800 text-white font-semibold cursor-pointer"
            >
              {b('নোটিশ পাঠান', 'Send Notice', lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* 4. Suspend vs Permanent Deactivate Modal */
export const StudentSuspensionDeactivationModal: React.FC<{
  state: { student: StudentRecord; mode: 'suspend' | 'deactivate' } | null;
  lang: Language;
  onClose: () => void;
  onConfirm: (studentId: string, nextStatus: 'suspended' | 'deactivated', reason: string) => void;
}> = ({ state, lang, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [docReturned, setDocReturned] = useState(false);
  const [guardianNotified, setGuardianNotified] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setReason('');
    setDocReturned(false);
    setGuardianNotified(false);
    setError('');
  }, [state]);

  if (!state) return null;
  const isDeactivate = state.mode === 'deactivate';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError(b('কারণ উল্লেখ করা বাধ্যতামূলক।', 'Please provide a reason.', lang));
      return;
    }
    if (isDeactivate && (!docReturned || !guardianNotified)) {
      setError(b('স্থায়ীভাবে নিষ্ক্রিয় করার আগে দুটি যাচাই চেকবক্স সম্পন্ন করুন।', 'Complete both verification checkboxes before permanent deactivation.', lang));
      return;
    }
    onConfirm(state.student.id, isDeactivate ? 'deactivated' : 'suspended', reason.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4"
      >
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            {isDeactivate ? (
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
            ) : (
              <PauseCircle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isDeactivate
                  ? b('স্থায়ীভাবে শিক্ষার্থী অ্যাকাউন্ট নিষ্ক্রিয় (Deactivate)', 'Permanently Deactivate Student', lang)
                  : b('সাময়িক অ্যাকাউন্ট স্থগিত (Suspend Student)', 'Temporarily Suspend Student', lang)}
              </h3>
              <p className="text-xs text-slate-500">
                {state.student.nameBn} · {state.student.permanentId}
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

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {isDeactivate && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {b(
                  'সতর্কতা: স্থায়ীভাবে নিষ্ক্রিয় করলে শিক্ষার্থীর সক্রিয় ক্লাস অ্যাক্সেস বন্ধ হবে, তবে ইতিহাস অডিট লগে সংরক্ষিত থাকবে।',
                  'Warning: Permanent deactivation closes active enrollment while preserving audit history.',
                  lang
                )}
              </span>
            </div>
          )}

          <div>
            <label className="block font-semibold mb-1">{b('প্রশাসনিক কারণ *', 'Reason *', lang)}</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              placeholder={
                isDeactivate
                  ? b('যেমন: চূড়ান্ত ছাড়পত্র (TC) গ্রহণ / স্থায়ী স্থানান্তর', 'e.g. Final TC issued / permanent departure', lang)
                  : b('যেমন: দীর্ঘ অনুপস্থিতি / শৃঙ্খলা পর্যালোচনা', 'e.g. Extended absence / disciplinary review', lang)
              }
              className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
            />
          </div>

          {isDeactivate && (
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={docReturned}
                  onChange={(e) => setDocReturned(e.target.checked)}
                />
                <span>{b('বকেয়া/টিসি ও একাডেমিক নথি যাচাই সম্পন্ন হয়েছে', 'Dues, TC & academic documents verified', lang)}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={guardianNotified}
                  onChange={(e) => setGuardianNotified(e.target.checked)}
                />
                <span>{b('অভিভাবক ও স্কুল কর্তৃপক্ষকে অবহিত করা হয়েছে', 'Guardian & school authority notified', lang)}</span>
              </label>
            </div>
          )}

          {error && <p className="text-red-600 font-medium">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
            >
              {tr('cancel', lang)}
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded-lg text-white font-semibold cursor-pointer ${
                isDeactivate
                  ? 'bg-red-700 hover:bg-red-800'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {isDeactivate
                ? b('স্থায়ী নিষ্ক্রিয় নিশ্চিত করুন', 'Confirm Deactivation', lang)
                : b('সাময়িক স্থগিত করুন', 'Suspend Student', lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* 5. Important Profile Change Application Modal (Student / School Level Submit) */
export const StudentProfileChangeRequestModal: React.FC<{
  open: boolean;
  student: StudentRecord;
  lang: Language;
  onClose: () => void;
  onSubmit: (payload: {
    fieldKey: StudentImportantFieldKey;
    currentValue: string;
    proposedValue: string;
    reason: string;
  }) => void;
}> = ({ open, student, lang, onClose, onSubmit }) => {
  const [fieldKey, setFieldKey] = useState<StudentImportantFieldKey>('nameEn');
  const [proposedValue, setProposedValue] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const getCurrentFieldValue = (key: StudentImportantFieldKey): string => {
    const val = student[key];
    return typeof val === 'string' ? val : String(val ?? '');
  };

  const currentValue = getCurrentFieldValue(fieldKey);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposedValue.trim() || !reason.trim()) {
      setError(b('সংশোধিত নতুন তথ্য ও কারণ লিখুন।', 'Enter proposed new value and reason.', lang));
      return;
    }
    onSubmit({
      fieldKey,
      currentValue,
      proposedValue: proposedValue.trim(),
      reason: reason.trim(),
    });
    setProposedValue('');
    setReason('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {b('গুরুত্বপূর্ণ Profile পরিবর্তনের আবেদন', 'Important Profile Change Request', lang)}
              </h3>
              <p className="text-xs text-slate-500">
                {b('School Admin ও Central Admin পর্যালোচনা ও অনুমোদন করবেন', 'Reviewed & approved by School Admin / Central Admin', lang)}
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

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">{b('কোন গুরুত্বপূর্ণ তথ্য পরিবর্তন করতে চান?', 'Important Field to Change', lang)}</label>
            <select
              value={fieldKey}
              onChange={(e) => setFieldKey(e.target.value as StudentImportantFieldKey)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
            >
              {(Object.keys(IMPORTANT_FIELD_LABELS) as StudentImportantFieldKey[]).map((k) => (
                <option key={k} value={k}>
                  {b(IMPORTANT_FIELD_LABELS[k].labelBn, IMPORTANT_FIELD_LABELS[k].labelEn, lang)}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
            <div className="text-[11px] text-slate-500">{b('বর্তমান সংরক্ষিত তথ্য', 'Current Stored Value', lang)}</div>
            <div className="font-semibold text-slate-900 dark:text-white mt-0.5">{currentValue}</div>
          </div>

          <div>
            <label className="block font-semibold mb-1">{b('প্রস্তাবিত নতুন তথ্য *', 'Proposed New Value *', lang)}</label>
            <input
              type="text"
              value={proposedValue}
              onChange={(e) => {
                setProposedValue(e.target.value);
                setError('');
              }}
              placeholder={b('নতুন সঠিক তথ্য লিখুন...', 'Enter corrected value...', lang)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">{b('পরিবর্তনের কারণ ও প্রমাণ নথির তথ্য *', 'Reason & Supporting Evidence *', lang)}</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              placeholder={b('যেমন: ডিজিটাল জন্মনিবন্ধন সনদ অনুযায়ী নামের বানান সংশোধন', 'e.g. Correct spelling as per digital Birth Certificate', lang)}
              className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
            />
          </div>

          {error && <p className="text-red-600 font-medium">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
            >
              {tr('cancel', lang)}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
            >
              {b('পর্যালোচনার জন্য আবেদন জমা দিন', 'Submit Change Request', lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
