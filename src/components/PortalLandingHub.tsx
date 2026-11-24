import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  ClipboardCheck,
  Globe,
  GraduationCap,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Moon,
  Share2,
  ShieldCheck,
  Sun,
  UserPlus,
  Users,
} from 'lucide-react';
import type { Language, SchoolRecord, Theme } from '../types';
import { b } from '../i18n/translations';
import { PWAInstallBanner, PWAInstallButton } from './PWAInstallBanner';
import { OfficialAppLogo } from './OfficialAppLogo';

interface PortalLandingHubProps {
  open: boolean;
  lang: Language;
  theme: Theme;
  schools: SchoolRecord[];
  onToggleLang: () => void;
  onToggleTheme: () => void;
  onOpenLoginPreset: (preset: 'teacher' | 'student' | 'super_admin' | 'guardian' | 'school') => void;
  onOpenSchoolRegistration: () => void;
  onOpenStatusTracker: () => void;
  onOpenTeacherRegistration: () => void;
  onOpenContactAdmin?: () => void;
  onOpenAppDownloadAndShare?: () => void;
  onGoogleSignIn?: () => Promise<void> | void;
  onOpenEmailAuth?: (initialTab?: 'signin' | 'signup' | 'recovery') => void;
  googleSigningIn?: boolean;
  authNotice?: string | null;
  authError?: string | null;
}

/**
 * Full-Viewport Dark Emerald-Navy Mandatory Login Portal Gate
 * Unauthenticated users land here and must authenticate before entering any role workspace.
 */
export const PortalLandingHub: React.FC<PortalLandingHubProps> = ({
  open,
  lang,
  theme,
  schools,
  onToggleLang,
  onToggleTheme,
  onOpenLoginPreset,
  onOpenSchoolRegistration,
  onOpenStatusTracker,
  onOpenTeacherRegistration,
  onOpenContactAdmin,
  onOpenAppDownloadAndShare,
  onGoogleSignIn,
  onOpenEmailAuth,
  googleSigningIn = false,
  authNotice,
  authError,
}) => {
  const [quickInfoTip, setQuickInfoTip] = useState<'none' | 'help'>('none');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-gradient-to-b from-[#071526] via-[#0a1d2e] to-[#061320] text-slate-100">
      {/* Subtle ambient background glow */}
      <div
        className="pointer-events-none fixed inset-0 opacity-35"
        style={{
          background:
            'radial-gradient(circle at 50% 10%, rgba(16,185,129,0.22), transparent 55%), radial-gradient(circle at 20% 70%, rgba(37,99,235,0.16), transparent 45%)',
        }}
        aria-hidden="true"
      />

      <div className="relative min-h-screen flex flex-col justify-between max-w-6xl mx-auto px-4 sm:px-6 py-5">
        {/* Top Utility Strip */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-xs font-bold text-emerald-200 whitespace-nowrap">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{b('নিরাপদ লগইন পোর্টাল · PSMS BD', 'Secure Login Portal · PSMS BD', lang)}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenContactAdmin && (
              <button
                type="button"
                onClick={onOpenContactAdmin}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/30 text-xs font-semibold text-teal-200 whitespace-nowrap cursor-pointer transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-teal-300" />
                <span>{b('Admin-এর সাথে যোগাযোগ করুন', 'Contact Admin', lang)}</span>
              </button>
            )}

            <button
              type="button"
              data-testid="portal-super-admin-btn"
              onClick={() => onOpenLoginPreset('super_admin')}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-400/30 text-xs font-semibold text-violet-200 whitespace-nowrap cursor-pointer transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-violet-300" />
              <span>{b('সুপার অ্যাডমিন প্রবেশ', 'Super Admin Access', lang)}</span>
            </button>

            <button
              type="button"
              onClick={onToggleLang}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-slate-200 whitespace-nowrap cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>{lang === 'bn' ? 'বাংলা | EN' : 'EN | বাংলা'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label="Toggle theme"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 cursor-pointer"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Hero Emblem & Title */}
        <main data-testid="login-portal-gate" className="my-6 space-y-8">
          <div className="max-w-4xl mx-auto">
            <PWAInstallBanner lang={lang} />
          </div>

          <div className="text-center max-w-3xl mx-auto space-y-4">
            <OfficialAppLogo
              sizeClass="w-20 h-20"
              roundedClass="rounded-2xl"
              paddingClass="p-1.5"
              className="mx-auto shadow-xl ring-1 ring-white/25"
            />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              {b('প্রাথমিক বিদ্যালয় ব্যবস্থাপনা পদ্ধতি', 'Primary School Management System', lang)}{' '}
              <span className="text-emerald-400">(PSMS)</span>
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-2xl mx-auto">
              {b(
                'ড্যাশবোর্ডে প্রবেশ করতে অনুগ্রহ করে নিচের আপনার নির্ধারিত পোর্টাল অথবা Google অ্যাকাউন্ট দিয়ে নিরাপদে লগইন করুন।',
                'Please sign in through your designated portal or verified Google account below to access your dashboard.',
                lang
              )}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
              <span>{schools.length}+ {b('সক্রিয় বিদ্যালয়', 'Active Schools', lang)}</span>
              <span>·</span>
              <span>{b('রোল-ভিত্তিক নিরাপত্তা', 'Strict Auth & RBAC Protected', lang)}</span>
              <span>·</span>
              <button
                type="button"
                onClick={() => setQuickInfoTip((p) => (p === 'help' ? 'none' : 'help'))}
                className="text-emerald-300 hover:underline cursor-pointer"
              >
                {b('পোর্টাল নির্দেশিকা', 'Portal Guide', lang)}
              </button>
            </div>

            {(onGoogleSignIn || onOpenEmailAuth) && (
              <div className="pt-2 flex flex-col items-center gap-2.5">
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  {onGoogleSignIn && (
                    <button
                      type="button"
                      data-testid="login-portal-google-btn"
                      disabled={googleSigningIn}
                      onClick={() => void onGoogleSignIn()}
                      className="inline-flex items-center justify-center gap-2.5 h-11 px-5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-sm font-bold shadow-lg cursor-pointer transition-colors disabled:opacity-60"
                    >
                      {googleSigningIn ? (
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      )}
                      <span>
                        {googleSigningIn
                          ? b('Google দিয়ে যাচাই হচ্ছে...', 'Verifying with Google...', lang)
                          : b('Google দিয়ে লগইন (Firebase Auth)', 'Continue with Google (Firebase Auth)', lang)}
                      </span>
                    </button>
                  )}

                  {onOpenEmailAuth && (
                    <button
                      type="button"
                      data-testid="login-portal-email-auth-btn"
                      onClick={() => onOpenEmailAuth('signin')}
                      className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-100 text-sm font-bold shadow-lg cursor-pointer transition-colors"
                    >
                      <Mail className="w-4 h-4 text-emerald-300" />
                      <span>
                        {b('ইমেইল লগইন, ভেরিফিকেশন ও রিকভারি', 'Email Sign In, Verify & Recovery', lang)}
                      </span>
                    </button>
                  )}
                </div>
                {authError && (
                  <div
                    role="alert"
                    data-testid="login-portal-auth-error"
                    className="max-w-lg rounded-xl bg-red-950/70 border border-red-500/40 px-4 py-2.5 text-xs text-red-200"
                  >
                    {authError}
                  </div>
                )}
                {authNotice && (
                  <div
                    role="status"
                    data-testid="login-portal-auth-notice"
                    className="max-w-lg rounded-xl bg-amber-950/70 border border-amber-500/40 px-4 py-2.5 text-xs text-amber-200"
                  >
                    {authNotice}
                  </div>
                )}
              </div>
            )}

            {quickInfoTip === 'help' && (
              <div className="max-w-xl mx-auto rounded-xl bg-white/5 border border-emerald-500/30 p-3.5 text-xs text-slate-200 text-left">
                {b(
                  'স্কুল, শিক্ষক, শিক্ষার্থী ও অভিভাবক লগইন কার্ড থেকে আপনার আইডি ও পাসওয়ার্ড দিয়ে প্রবেশ করুন। লগইন ছাড়া কোনো ড্যাশবোর্ড বা ব্যক্তিগত তথ্য প্রদর্শিত হবে না।',
                  'Sign in using your verified School, Teacher, Student, Guardian, or Super Admin credentials. Protected dashboards remain locked until authentication succeeds.',
                  lang
                )}
              </div>
            )}
          </div>

          {/* Primary Login Cards: School Admin Login, Teacher Login & Student/Guardian Login */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {/* 1. School Login Card */}
            <div className="rounded-2xl bg-[#0d2238]/90 border border-emerald-500/30 p-6 flex flex-col justify-between gap-5 shadow-xl hover:border-emerald-400/60 transition-colors">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-300">
                    {b('🏫 বিদ্যালয় পোর্টাল', '🏫 School Portal', lang)}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {b('🏫 বিদ্যালয় লগইন (School Login)', '🏫 School Login', lang)}
                  </h2>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    {b(
                      'School ID (SCH-2026-XXXXX) বা স্কুল কোড ও পাসওয়ার্ড দিয়ে নিজস্ব বিদ্যালয়ের সম্পূর্ণ প্রশাসন ও পাঠদান ড্যাশবোর্ডে প্রবেশ করুন।',
                      'Sign in with School ID (SCH-2026-XXXXX), code, or email to manage your isolated school workspace.',
                      lang
                    )}
                  </p>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {b('একক বিদ্যালয় ডেটা আইসোলেশন ও কভার কাস্টমাইজেশন', 'Strict school data isolation & cover customization', lang)}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {b('অ্যাডমিন পরিচালনা + শিক্ষক হিসেবে ক্লাস ও হাজিরা', 'School Admin control + Teaching mode', lang)}
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  data-testid="portal-school-login-btn"
                  onClick={() => onOpenLoginPreset('school')}
                  className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  <span>{b('🏫 বিদ্যালয় লগইন করুন', '🏫 School Sign In', lang)}</span>
                </button>
              </div>
            </div>

            {/* 2. Teacher Login Card */}
            <div className="rounded-2xl bg-[#0d2238]/90 border border-blue-500/25 p-6 flex flex-col justify-between gap-5 shadow-xl hover:border-blue-400/50 transition-colors">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-blue-300">
                    {b('শিক্ষক পোর্টাল', 'Teacher Portal', lang)}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {b('১. শিক্ষক লগইন', '1. Teacher Login', lang)}
                  </h2>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    {b(
                      'Teacher ID ও পাসওয়ার্ড দিয়ে আপনার বিদ্যালয়ের শ্রেণি কার্যক্রম, আজকের পড়া, হাজিরা ও নম্বর প্রদান পরিচালনা করুন।',
                      'Sign in with your permanent Teacher ID to manage assigned classes, daily lessons, attendance, and marks.',
                      lang
                    )}
                  </p>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    {b('স্বয়ংক্রিয় ID হাজিরা ও আজকের পাঠ প্রকাশ', 'Auto ID attendance & daily lesson publishing', lang)}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    {b('প্রধান শিক্ষক ও সহকারী শিক্ষকদের RBAC ড্যাশবোর্ড', 'RBAC protected marks & routine workspace', lang)}
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  data-testid="portal-teacher-login-btn"
                  onClick={() => onOpenLoginPreset('teacher')}
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  <span>{b('শিক্ষক লগইন করুন', 'Teacher Sign In', lang)}</span>
                </button>
              </div>
            </div>

            {/* 2. Student & Guardian Login Card */}
            <div className="rounded-2xl bg-[#0d2238]/90 border border-amber-500/25 p-6 flex flex-col justify-between gap-5 shadow-xl hover:border-amber-400/50 transition-colors">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-amber-300">
                    {b('শিক্ষার্থী ও অভিভাবক', 'Student & Guardian', lang)}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {b('২. শিক্ষার্থী ও অভিভাবক লগইন', '2. Student & Guardian Login', lang)}
                  </h2>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    {b(
                      'স্কুল কোড ও স্থায়ী Student ID দিয়ে হাজিরা, ক্লাস রুটিন, বাড়ির কাজ, নোটিশ এবং পরীক্ষার মার্কশিট দেখুন।',
                      'Use School Code & Student ID to track attendance, class routine, homework, notices, and exam marksheets.',
                      lang
                    )}
                  </p>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    {b('এককালীন অ্যাক্টিভেশন কোডের মাধ্যমে প্রথমবার প্রবেশ', 'First-time portal activation via One-Time Code', lang)}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    {b('অভিভাবকের মাধ্যমে একাধিক সন্তানের অগ্রগতি পর্যবেক্ষণ', 'Multi-child academic monitoring for guardians', lang)}
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  data-testid="portal-student-login-btn"
                  onClick={() => onOpenLoginPreset('student')}
                  className="h-11 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  <span>{b('শিক্ষার্থী প্রবেশ', 'Student Login', lang)}</span>
                </button>
                <button
                  type="button"
                  data-testid="portal-guardian-login-btn"
                  onClick={() => onOpenLoginPreset('guardian')}
                  className="h-11 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span>{b('অভিভাবক লগইন', 'Guardian Login', lang)}</span>
                </button>
              </div>
            </div>
          </div>

          {/* School & Teacher Applications Section */}
          <section className="max-w-4xl mx-auto rounded-2xl bg-[#0a1a2b]/90 border border-slate-700/60 p-6 space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-white">
                {b('বিদ্যালয় ও শিক্ষক আবেদন', 'School & Teacher Applications', lang)}
              </h2>
              <p className="text-xs text-slate-400">
                {b(
                  'নতুন প্রতিষ্ঠান অন্তর্ভুক্তি, আবেদনের বর্তমান অবস্থা যাচাই এবং অনলাইন শিক্ষক নিবন্ধন',
                  'New school onboarding, live status tracking, and online teacher registration',
                  lang
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* New School Application + Status Tracker */}
              <div className="rounded-xl bg-[#10253a] border border-emerald-500/25 p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {b('নতুন বিদ্যালয় আবেদন', 'New School Application', lang)}
                      </h3>
                      <p className="text-[11px] text-emerald-300">New School Application</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {b(
                      'সরকারি, বেসরকারি, কিন্ডারগার্টেন বা মাদ্রাসা নিবন্ধনের আবেদন করুন এবং আবেদনের বর্তমান অবস্থা দেখুন।',
                      'Submit an online registration application for your institution or track approval milestones.',
                      lang
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onOpenSchoolRegistration}
                    className="flex-1 h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span>{b('বিদ্যালয় নিবন্ধন করুন', 'Apply School', lang)}</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={onOpenStatusTracker}
                    className="h-10 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-100 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <ClipboardCheck className="w-4 h-4 text-sky-300" />
                    <span>{b('স্ট্যাটাস', 'Status', lang)}</span>
                  </button>
                </div>
              </div>

              {/* Teacher Registration Application */}
              <div className="rounded-xl bg-[#10253a] border border-indigo-500/25 p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {b('শিক্ষক নিবন্ধন আবেদন', 'Teacher Registration Application', lang)}
                      </h3>
                      <p className="text-[11px] text-indigo-300">Teacher Registration & Unique ID</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {b(
                      'ব্যক্তিগত তথ্য ও ডকুমেন্ট দিয়ে নিবন্ধন সম্পন্ন করে আজীবন কার্যকর Global Teacher ID পান এবং পরে বিদ্যালয়ে আবেদন করুন।',
                      'Register with Part A personal info & documents to receive a lifetime Global Teacher ID, then apply to schools.',
                      lang
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onOpenTeacherRegistration}
                  className="w-full h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <KeyRound className="w-4 h-4 shrink-0" />
                  <span>{b('শিক্ষক নিবন্ধন আবেদন করুন', 'Apply for Teacher ID', lang)}</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>
            </div>
          </section>

          {/* Install PSMS Android / Web App Card */}
          <div className="max-w-4xl mx-auto space-y-3">
            <PWAInstallButton lang={lang} variant="card" />
            {onOpenAppDownloadAndShare && (
              <div className="flex justify-center">
                <button
                  type="button"
                  data-testid="landing-apps-download-share-btn"
                  onClick={onOpenAppDownloadAndShare}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{b('ওয়েব লিংক, APK ডাউনলোড ও বন্ধুদের শেয়ার করুন', 'Web Link, APK Download & Share with Friends', lang)}</span>
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Clean Portal Footer */}
        <footer className="border-t border-white/10 pt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
          <span>
            © 2026 {b('প্রাথমিক বিদ্যালয় ব্যবস্থাপনা পদ্ধতি (PSMS Bangladesh)', 'Primary School Management System (PSMS Bangladesh)', lang)}
          </span>
          <div className="flex items-center gap-4">
            {onOpenContactAdmin && (
              <button
                type="button"
                onClick={onOpenContactAdmin}
                className="hover:text-teal-300 cursor-pointer"
              >
                {b('Admin-এর সাথে যোগাযোগ করুন', 'Contact Admin', lang)}
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenLoginPreset('super_admin')}
              className="hover:text-violet-300 cursor-pointer"
            >
              {b('কেন্দ্রীয় অ্যাডমিন প্রবেশ', 'Central Admin Portal', lang)}
            </button>
            <button
              type="button"
              onClick={onOpenStatusTracker}
              className="hover:text-emerald-300 cursor-pointer"
            >
              {b('আবেদন ট্র্যাকার', 'Status Tracker', lang)}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
