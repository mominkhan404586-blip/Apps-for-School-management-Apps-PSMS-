import React, { useMemo, useState } from 'react';
import { AlertTriangle, BadgeCheck, CheckCircle2, Upload, UserCog, X } from 'lucide-react';
import type {
  AdminAccount,
  Language,
  ParentAccountRecord,
  Role,
  SchoolRecord,
  StudentRecord,
  TeacherRecord,
  UserProfileRecord,
} from '../types';
import { b } from '../i18n/translations';
import {
  applyUserProfileUpdate,
  checkUsernameAndUniqueIdUniqueness,
  getSuggestedAvatarsByGender,
  verifyUserProfile,
} from '../utils/userAccountProfileEngine';

export interface UserProfileManagerModalProps {
  open: boolean;
  onClose: () => void;
  lang: Language;
  currentRole: Role;
  currentProfile: UserProfileRecord;
  admins: AdminAccount[];
  schools: SchoolRecord[];
  teachers: TeacherRecord[];
  parents: ParentAccountRecord[];
  students: StudentRecord[];
  extraProfiles: UserProfileRecord[];
  onSaveProfile: (updated: UserProfileRecord) => void;
}

export const UserProfileManagerModal: React.FC<UserProfileManagerModalProps> = ({
  open,
  onClose,
  lang,
  currentRole,
  currentProfile,
  admins,
  schools,
  teachers,
  parents,
  students,
  extraProfiles,
  onSaveProfile,
}) => {
  const [displayName, setDisplayName] = useState(currentProfile.displayName);
  const [username, setUsername] = useState(currentProfile.username);
  const [uniqueIdCode, setUniqueIdCode] = useState(currentProfile.uniqueIdCode);
  const [gender, setGender] = useState<'Male' | 'Female'>(currentProfile.gender);
  const [email, setEmail] = useState(currentProfile.email);
  const [mobile, setMobile] = useState(currentProfile.mobile);
  const [photoUrl, setPhotoUrl] = useState(currentProfile.photoUrl ?? '');
  const [avatarPresetId, setAvatarPresetId] = useState(currentProfile.avatarPresetId ?? '');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const genderPresets = useMemo(() => getSuggestedAvatarsByGender(gender), [gender]);

  const liveUniqueness = useMemo(
    () =>
      checkUsernameAndUniqueIdUniqueness({
        candidateUsername: username,
        candidateUniqueIdCode: uniqueIdCode,
        currentEntityId: currentProfile.entityId,
        admins,
        schools,
        teachers,
        parents,
        students,
        extraProfiles,
      }),
    [username, uniqueIdCode, currentProfile.entityId, admins, schools, teachers, parents, students, extraProfiles]
  );

  if (!open) return null;

  const roleTitle =
    currentRole === 'central_admin'
      ? 'Super Central Admin'
      : currentRole === 'school_admin'
        ? 'School Admin'
        : currentRole === 'teacher'
          ? 'Teacher'
          : 'Parent';

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoUrl(reader.result);
        setAvatarPresetId('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const res = applyUserProfileUpdate(
      currentProfile,
      {
        displayName,
        username,
        uniqueIdCode,
        gender,
        email,
        mobile,
        photoUrl: photoUrl || undefined,
        avatarPresetId: avatarPresetId || undefined,
      },
      { admins, schools, teachers, parents, students, extraProfiles }
    );
    if (!res.ok || !res.profile) {
      setFeedback({
        ok: false,
        text: (lang === 'bn' ? res.errorBn : res.errorEn) || 'Validation error',
      });
      return;
    }
    onSaveProfile(res.profile);
    setFeedback({
      ok: true,
      text: res.requiresReverification
        ? b(
            'প্রোফাইল আপডেট হয়েছে। গুরুত্বপূর্ণ তথ্য পরিবর্তনের কারণে Re-Verification প্রয়োজন।',
            'Profile updated. Critical fields changed — re-verification is now required.',
            lang
          )
        : b('প্রোফাইল সফলভাবে হালনাগাদ হয়েছে।', 'Profile updated successfully.', lang),
    });
  };

  const handleVerifyProfile = () => {
    const verified = verifyUserProfile({
      ...currentProfile,
      displayName,
      username,
      uniqueIdCode,
      gender,
      email,
      mobile,
      photoUrl: photoUrl || undefined,
      avatarPresetId: avatarPresetId || undefined,
    });
    onSaveProfile(verified);
    setFeedback({
      ok: true,
      text: b('প্রোফাইল সফলভাবে পুনরায় যাচাই (Verified) হয়েছে।', 'Profile verified successfully.', lang),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        data-testid="user-profile-manager-modal"
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <UserCog className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('অ্যাকাউন্ট প্রোফাইল ও ইউনিক আইডি ব্যবস্থাপনা', 'Account Profile & Unique ID Settings', lang)}
              </h2>
              <p className="text-[11px] text-slate-500">
                {roleTitle} ·{' '}
                {currentProfile.verificationStatus === 'verified'
                  ? b('যাচাইকৃত (Verified)', 'Verified', lang)
                  : currentProfile.verificationStatus === 'reverification_required'
                    ? b('পুনঃযাচাই প্রয়োজন (Re-Verification Required)', 'Re-Verification Required', lang)
                    : b('যাচাই অপেক্ষমান (Pending)', 'Pending Verification', lang)}
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

        <form onSubmit={handleSubmitUpdate} className="p-5 space-y-4 text-xs">
          {currentProfile.verificationStatus === 'reverification_required' && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {currentProfile.reverificationReason ||
                    b(
                      'গুরুত্বপূর্ণ তথ্য পরিবর্তিত হয়েছে — অনুগ্রহ করে Verify Profile চাপুন।',
                      'Critical identity details changed — please click Verify Profile.',
                      lang
                    )}
                </span>
              </div>
              <button
                type="button"
                data-testid="verify-profile-btn"
                onClick={handleVerifyProfile}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              >
                <BadgeCheck className="w-3.5 h-3.5" />
                {b('Verify Profile', 'Verify Profile', lang)}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 items-center p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <img
              src={photoUrl || genderPresets[0]?.dataUrl}
              alt={displayName}
              className="w-16 h-16 rounded-full object-cover border border-slate-300 dark:border-slate-700 mx-auto"
            />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  {b('ছবি আপলোড করুন', 'Upload Photo', lang)}
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="sr-only" />
                </label>
                <span className="text-[11px] text-slate-500">
                  {b('অথবা লিঙ্গ অনুযায়ী অ্যাভাটার নির্বাচন করুন:', 'Or select gender-matched avatar:', lang)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {genderPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setPhotoUrl(preset.dataUrl);
                      setAvatarPresetId(preset.id);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] cursor-pointer ${
                      avatarPresetId === preset.id || photoUrl === preset.dataUrl
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <img src={preset.dataUrl} alt={preset.labelEn} className="w-5 h-5 rounded-full" />
                    {lang === 'bn' ? preset.labelBn : preset.labelEn}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                {b('পূর্ণ নাম', 'Full Name', lang)}
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                {b('লিঙ্গ (Gender)', 'Gender', lang)}
              </label>
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
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                {b('ইউনিক ইউজারনেম (System-Wide Unique)', 'Unique Username', lang)}
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-800 font-mono ${
                  liveUniqueness.usernameConflict
                    ? 'border-rose-500'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                {b('ইউনিক আইডি কোড (Unique ID Code)', 'Unique ID Code', lang)}
              </label>
              <input
                type="text"
                required
                value={uniqueIdCode}
                onChange={(e) => setUniqueIdCode(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-800 font-mono ${
                  liveUniqueness.uniqueIdConflict
                    ? 'border-rose-500'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                {b('ইমেইল', 'Email Address', lang)}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                {b('মোবাইল নম্বর', 'Mobile Number', lang)}
              </label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
          </div>

          {!liveUniqueness.ok && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
              {lang === 'bn' ? liveUniqueness.errorBn : liveUniqueness.errorEn}
            </div>
          )}

          {feedback && (
            <div
              className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                feedback.ok
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 text-rose-800 dark:text-rose-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback.text}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleVerifyProfile}
              className="px-3.5 py-2 rounded-lg border border-emerald-600 text-emerald-700 dark:text-emerald-300 font-semibold cursor-pointer"
            >
              {b('Verify Profile', 'Verify Profile', lang)}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
            >
              {b('বাতিল', 'Cancel', lang)}
            </button>
            <button
              type="submit"
              data-testid="update-profile-submit-btn"
              disabled={!liveUniqueness.ok}
              className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold cursor-pointer"
            >
              {b('Update Profile', 'Update Profile', lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
