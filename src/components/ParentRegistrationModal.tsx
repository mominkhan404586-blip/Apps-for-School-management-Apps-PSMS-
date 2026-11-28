import React, { useMemo, useState } from 'react';
import { CheckCircle2, UserPlus, Users, X } from 'lucide-react';
import type {
  AdminAccount,
  Language,
  ParentAccountRecord,
  SchoolRecord,
  StudentRecord,
  TeacherRecord,
} from '../types';
import { b } from '../i18n/translations';
import { registerParentAccount } from '../utils/parentLinkingEngine';
import { getSuggestedAvatarsByGender } from '../utils/userAccountProfileEngine';

export interface ParentRegistrationModalProps {
  open: boolean;
  onClose: () => void;
  lang: Language;
  schools: SchoolRecord[];
  teachers: TeacherRecord[];
  admins: AdminAccount[];
  students: StudentRecord[];
  existingParents: ParentAccountRecord[];
  onRegistered: (
    parent: ParentAccountRecord,
    updatedStudents: StudentRecord[],
    autoLogin?: boolean
  ) => void;
}

export const ParentRegistrationModal: React.FC<ParentRegistrationModalProps> = ({
  open,
  onClose,
  lang,
  schools,
  teachers,
  admins,
  students,
  existingParents,
  onRegistered,
}) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [uniqueIdCode, setUniqueIdCode] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [password, setPassword] = useState('');
  const [initialSchoolQuery, setInitialSchoolQuery] = useState('');
  const [initialStudentQuery, setInitialStudentQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const avatarPreview = useMemo(() => getSuggestedAvatarsByGender(gender)[0]?.dataUrl, [gender]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const res = registerParentAccount({
      name,
      username,
      uniqueIdCode,
      mobile,
      email: email.trim() || undefined,
      gender,
      password,
      photoUrl: avatarPreview,
      initialSchoolQuery: initialSchoolQuery.trim() || undefined,
      initialStudentQuery: initialStudentQuery.trim() || undefined,
      existingParents,
      schools,
      teachers,
      admins,
      students,
    });

    if (!res.ok || !res.parent) {
      setErrorMsg((lang === 'bn' ? res.errorBn : res.errorEn) || 'Registration failed.');
      return;
    }

    onRegistered(res.parent, res.updatedStudents ?? students, true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        data-testid="parent-registration-modal"
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('নতুন অভিভাবক (Parent) নিবন্ধন', 'New Parent Account Registration', lang)}
              </h2>
              <p className="text-[11px] text-slate-500">
                {b(
                  'Parent অ্যাকাউন্ট তৈরি করুন এবং বিদ্যালয়ের ও সন্তানের আইডি দিয়ে একাধিক সন্তান যুক্ত করুন।',
                  'Create a Parent account and link one or more children using School ID & Student ID.',
                  lang
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={b('বন্ধ করুন', 'Close', lang)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <img
              src={avatarPreview}
              alt="Parent avatar"
              className="w-12 h-12 rounded-full border border-slate-300 dark:border-slate-700"
            />
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">
                {b('লিঙ্গ অনুযায়ী প্রোফাইল অ্যাভাটার', 'Gender-matched Profile Avatar', lang)}
              </div>
              <div className="text-[11px] text-slate-500">
                {b('লগইনের পর প্রোফাইল সেটিংস থেকে নিজস্ব ছবি আপলোড করা যাবে।', 'You can upload a custom photo later in Profile Settings.', lang)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">{b('পূর্ণ নাম *', 'Full Name *', lang)}</label>
              <input
                type="text"
                required
                data-testid="parent-reg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">{b('লিঙ্গ *', 'Gender *', lang)}</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'Male' | 'Female')}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="Male">{b('পুরুষ (Male)', 'Male', lang)}</option>
                <option value="Female">{b('নারী (Female)', 'Female', lang)}</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">{b('ইউনিক ইউজারনেম *', 'Unique Username *', lang)}</label>
              <input
                type="text"
                required
                data-testid="parent-reg-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={b('যেমন: parent_karim', 'e.g. parent_karim', lang)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">{b('ইউনিক আইডি কোড *', 'Unique ID Code *', lang)}</label>
              <input
                type="text"
                required
                data-testid="parent-reg-uniqueid"
                value={uniqueIdCode}
                onChange={(e) => setUniqueIdCode(e.target.value)}
                placeholder={b('যেমন: PAR-2026-001', 'e.g. PAR-2026-001', lang)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">{b('মোবাইল নম্বর *', 'Mobile Number *', lang)}</label>
              <input
                type="text"
                required
                data-testid="parent-reg-mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">{b('পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর) *', 'Password (min 6 chars) *', lang)}</label>
              <input
                type="password"
                required
                minLength={6}
                data-testid="parent-reg-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">{b('ইমেইল (ঐচ্ছিক)', 'Email (Optional)', lang)}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 space-y-2.5">
            <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              {b('ঐচ্ছিক: নিবন্ধনের সাথে সাথে সন্তান যুক্ত করুন', 'Optional: Link Child Immediately', lang)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                value={initialSchoolQuery}
                onChange={(e) => setInitialSchoolQuery(e.target.value)}
                placeholder={b('School ID / Code / Username', 'School ID / Code / Username', lang)}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <input
                type="text"
                value={initialStudentQuery}
                onChange={(e) => setInitialStudentQuery(e.target.value)}
                placeholder={b('Student ID / Username', 'Student ID / Username', lang)}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
            >
              {b('বাতিল', 'Cancel', lang)}
            </button>
            <button
              type="submit"
              data-testid="parent-reg-submit-btn"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              {b('Parent অ্যাকাউন্ট তৈরি করুন', 'Create Parent Account', lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
