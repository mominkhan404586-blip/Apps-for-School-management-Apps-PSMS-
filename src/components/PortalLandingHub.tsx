import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Eye,
  EyeOff,
  Globe,
  GraduationCap,
  HelpCircle,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  Mail,
  MessageSquare,
  Moon,
  Search,
  Share2,
  ShieldCheck,
  Sun,
  Target,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type {
  ApprovalRequest,
  Language,
  Role,
  SchoolRecord,
  StudentRecord,
  TeacherRecord,
  Theme,
} from '../types';
import { b } from '../i18n/translations';
import { OfficialAppLogo } from './OfficialAppLogo';
import {
  loadRememberedLoginIdentifier,
  lookupRegistrationApprovalStatus,
  saveRememberedLoginIdentifier,
  validateLoginIdentifierRealtime,
  validatePasswordChangeInput,
  type ApprovalCheckCategory,
} from '../utils/unifiedLoginEngine';

export type UnifiedLoginTab = 'login' | 'register' | 'verify';
export type PasswordToolMode = 'none' | 'change' | 'forgot';
export type DemoRolePreset = 'school_admin' | 'teacher' | 'student' | 'guardian';

interface PortalLandingHubProps {
  open: boolean;
  lang: Language;
  theme: Theme;
  schools: SchoolRecord[];
  teachers: TeacherRecord[];
  students: StudentRecord[];
  requests: ApprovalRequest[];
  onToggleLang: () => void;
  onToggleTheme: () => void;
  onUnifiedLoginSubmit: (
    identifier: string,
    password: string
  ) => Promise<{ ok: boolean; message?: string }>;
  onChangePasswordSubmit: (
    identifier: string,
    currentPassword: string,
    newPassword: string
  ) => Promise<{ ok: boolean; message: string }>;
  onForgotPasswordSubmit: (
    identifier: string
  ) => Promise<{ ok: boolean; message: string }>;
  onDemoQuickLogin: (preset: DemoRolePreset) => void;
  onOpenSchoolRegistration: () => void;
  onOpenTeacherRegistration: () => void;
  onOpenStudentRegistration: () => void;
  onOpenStatusTracker: () => void;
  onOpenContactAdmin?: () => void;
  onOpenAppDownloadAndShare?: () => void;
  onGoogleSignIn?: () => Promise<void> | void;
  onOpenEmailAuth?: (initialTab?: 'signin' | 'signup' | 'recovery') => void;
  googleSigningIn?: boolean;
  authNotice?: string | null;
  authError?: string | null;
}

const GoogleMark: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3.02h3.88c2.27-2.09 3.54-5.17 3.54-8.89Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.07 7.94-2.84l-3.88-3.02c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.96H1.27v3.12A12 12 0 0 0 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.33a7.2 7.2 0 0 1 0-4.66V6.55H1.27a12 12 0 0 0 0 10.9l4.01-3.12Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.71c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.55l4.01 3.12C6.23 6.82 8.88 4.71 12 4.71Z"
    />
  </svg>
);

export const PortalLandingHub: React.FC<PortalLandingHubProps> = ({
  open,
  lang,
  theme,
  schools,
  teachers,
  students,
  requests,
  onToggleLang,
  onToggleTheme,
  onUnifiedLoginSubmit,
  onChangePasswordSubmit,
  onForgotPasswordSubmit,
  onDemoQuickLogin,
  onOpenSchoolRegistration,
  onOpenTeacherRegistration,
  onOpenStudentRegistration,
  onOpenStatusTracker,
  onOpenContactAdmin,
  onOpenAppDownloadAndShare,
  onGoogleSignIn,
  onOpenEmailAuth,
  googleSigningIn = false,
  authNotice,
  authError,
}) => {
  const [activeTab, setActiveTab] = useState<UnifiedLoginTab>('login');

  // Unified Login State
  const [identifier, setIdentifier] = useState(() => loadRememberedLoginIdentifier());
  const [rememberMe, setRememberMe] = useState(() => Boolean(loadRememberedLoginIdentifier()));
  const [identifierTouched, setIdentifierTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const identifierValidation = useMemo(
    () => validateLoginIdentifierRealtime(identifier),
    [identifier]
  );

  // Password Change / Forgot Password Inline Panel
  const [passwordTool, setPasswordTool] = useState<PasswordToolMode>('none');
  const [pwIdentifier, setPwIdentifier] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [pwToolBusy, setPwToolBusy] = useState(false);

  // Approval Status Check Tab State
  const [verifyCategory, setVerifyCategory] = useState<ApprovalCheckCategory>('school');
  const [verifyQuery, setVerifyQuery] = useState('');
  const [submittedVerifyQuery, setSubmittedVerifyQuery] = useState('');

  // Compact Footer Sheets
  const [accountHelpOpen, setAccountHelpOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  const sampleOptions = useMemo(() => {
    if (verifyCategory === 'school') {
      return schools.slice(0, 6).map((s) => ({
        value: s.code,
        label: `${s.code} · ${b(s.nameBn, s.nameEn, lang)}`,
      }));
    }
    if (verifyCategory === 'teacher') {
      return teachers.slice(0, 6).map((t) => ({
        value: t.teacherCode,
        label: `${t.teacherCode} · ${b(t.nameBn, t.nameEn, lang)}`,
      }));
    }
    return students.slice(0, 6).map((st) => ({
      value: st.permanentId,
      label: `${st.permanentId} · ${b(st.nameBn, st.nameEn, lang)}`,
    }));
  }, [verifyCategory, schools, teachers, students, lang]);

  const effectiveVerifyQuery = (submittedVerifyQuery || verifyQuery).trim();

  const verifyResult = useMemo(() => {
    if (!effectiveVerifyQuery) return null;
    return lookupRegistrationApprovalStatus({
      category: verifyCategory,
      query: effectiveVerifyQuery,
      schools,
      requests,
      teachers,
      students,
    });
  }, [verifyCategory, effectiveVerifyQuery, schools, requests, teachers, students]);

  if (!open) return null;

  const handleLoginFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setIdentifierTouched(true);
    if (!identifierValidation.valid) {
      setFormError(b(identifierValidation.messageBn, identifierValidation.messageEn, lang));
      return;
    }
    if (!password) {
      setFormError(
        b(
          'অনুগ্রহ করে পাসওয়ার্ড দিন।',
          'Please enter your password.',
          lang
        )
      );
      return;
    }
    saveRememberedLoginIdentifier(identifier.trim(), rememberMe);
    setLoginBusy(true);
    try {
      const res = await onUnifiedLoginSubmit(identifier.trim(), password);
      if (!res.ok) {
        setFormError(
          res.message ||
            b('লগইন তথ্য সঠিক নয়। অনুগ্রহ করে পুনরায় যাচাই করুন।', 'Invalid credentials.', lang)
        );
      }
    } finally {
      setLoginBusy(false);
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    const targetId = (pwIdentifier || identifier).trim();
    const validation = validatePasswordChangeInput({
      identifier: targetId,
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!validation.ok) {
      setFormError(b(validation.errorBn ?? 'তথ্য সঠিক নয়।', validation.errorEn ?? 'Invalid input.', lang));
      return;
    }
    setPwToolBusy(true);
    try {
      const res = await onChangePasswordSubmit(targetId, currentPassword, newPassword);
      if (res.ok) {
        setFormSuccess(res.message);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordTool('none');
      } else {
        setFormError(res.message);
      }
    } finally {
      setPwToolBusy(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    const targetId = (forgotIdentifier || identifier).trim();
    if (!targetId) {
      setFormError(
        b(
          'পাসওয়ার্ড পুনরুদ্ধারের জন্য ইমেইল, মোবাইল বা ইউজারনেম লিখুন।',
          'Please enter your email, mobile number, or username.',
          lang
        )
      );
      return;
    }
    setPwToolBusy(true);
    try {
      const res = await onForgotPasswordSubmit(targetId);
      if (res.ok) {
        setFormSuccess(res.message);
      } else {
        setFormError(res.message);
      }
    } finally {
      setPwToolBusy(false);
    }
  };

  const displayError = formError || authError;
  const displayNotice = formSuccess || authNotice;

  const verifySteps = [
    { step: 1, labelBn: 'জমা', labelEn: 'Sent' },
    { step: 2, labelBn: 'যাচাই', labelEn: 'Review' },
    { step: 3, labelBn: 'অনুমোদিত', labelEn: 'Approved' },
    { step: 4, labelBn: 'সক্রিয়', labelEn: 'Active' },
  ];

  const demoAccounts: {
    id: DemoRolePreset;
    role: Role;
    titleBn: string;
    titleEn: string;
    idLabel: string;
    accentClass: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'school_admin',
      role: 'school_admin',
      titleBn: 'বিদ্যালয় অ্যাডমিন (মডেল প্রা. বি.)',
      titleEn: 'School Admin (GPS-1042)',
      idLabel: 'SCH-2026-00015',
      accentClass: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40',
      icon: Building2,
    },
    {
      id: 'teacher',
      role: 'teacher',
      titleBn: 'শিক্ষক পোর্টাল (রহিম উদ্দিন)',
      titleEn: 'Teacher (Rahim Uddin)',
      idLabel: 'tch_rahim',
      accentClass: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40',
      icon: BookOpen,
    },
    {
      id: 'student',
      role: 'student',
      titleBn: 'শিক্ষার্থী পোর্টাল',
      titleEn: 'Student Portal',
      idLabel: 'STD-2026-GPS1042-0012',
      accentClass: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40',
      icon: GraduationCap,
    },
    {
      id: 'guardian',
      role: 'guardian',
      titleBn: 'অভিভাবক পোর্টাল',
      titleEn: 'Guardian Portal',
      idLabel: '01712345678',
      accentClass: 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40',
      icon: Users,
    },
  ];

  return (
    <div
      data-testid="login-portal-gate"
      className="fixed inset-0 z-40 overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
    >
      {/* Subtle quiet radial surface wash */}
      <div
        className="pointer-events-none fixed inset-0 opacity-60 dark:opacity-40"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.12), transparent 52%), radial-gradient(circle at 90% 90%, rgba(30, 64, 175, 0.08), transparent 45%)',
        }}
        aria-hidden="true"
      />

      <div className="relative min-h-screen flex flex-col justify-between max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Minimal Single-Row Header */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <OfficialAppLogo sizeClass="w-9 h-9" roundedClass="rounded-lg" paddingClass="p-0.5" />
            <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              <span className="sm:hidden">{b('শিক্ষা পোর্টাল', 'PSMS Portal', lang)}</span>
              <span className="hidden sm:inline">
                {b('প্রাথমিক ও মাধ্যমিক শিক্ষা পোর্টাল', 'PSMS Bangladesh', lang)}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleLang}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap cursor-pointer transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{lang === 'bn' ? 'বাংলা | EN' : 'EN | বাংলা'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={b('থিম পরিবর্তন করুন', 'Toggle theme', lang)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Central Compact Unified Card */}
        <main className="my-5 sm:my-8 flex items-center justify-center">
          <section
            aria-labelledby="unified-login-heading"
            className="w-full max-w-[460px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-900/5 dark:shadow-black/30 overflow-hidden"
          >
            {/* Card Header */}
            <div className="px-5 sm:px-6 pt-6 pb-4 text-center space-y-2 border-b border-slate-100 dark:border-slate-800">
              <OfficialAppLogo
                sizeClass="w-12 h-12"
                roundedClass="rounded-xl"
                className="mx-auto shadow-sm"
                alt={b('স্কুল ম্যানেজমেন্ট অ্যাপ লোগো', 'School Management App Logo', lang)}
              />
              <h1
                id="unified-login-heading"
                className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white"
              >
                {b('স্কুল ম্যানেজমেন্ট অ্যাপ লগইন', 'School Management App Login', lang)}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {b(
                  'School Admin · বিদ্যালয় · শিক্ষক · শিক্ষার্থী — একক নিরাপদ প্রবেশ',
                  'School Admin · Institution · Teacher · Student — Unified Sign In',
                  lang
                )}
              </p>

              {/* 3 Clean Primary Navigation Tabs */}
              <div
                role="tablist"
                aria-label={b('লগইন অপশনসমূহ', 'Login Screen Tabs', lang)}
                className="grid grid-cols-3 gap-1 p-1 mt-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'login'}
                  data-testid="unified-tab-login"
                  onClick={() => {
                    setActiveTab('login');
                    setFormError(null);
                  }}
                  className={`h-9 px-2 rounded-lg font-bold whitespace-nowrap cursor-pointer transition-colors ${
                    activeTab === 'login'
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {b('লগইন করুন', 'Sign In', lang)}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'register'}
                  data-testid="unified-tab-register"
                  onClick={() => {
                    setActiveTab('register');
                    setFormError(null);
                  }}
                  className={`h-9 px-2 rounded-lg font-bold whitespace-nowrap cursor-pointer transition-colors ${
                    activeTab === 'register'
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {b('নতুন অ্যাকাউন্ট', 'Create Account', lang)}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'verify'}
                  data-testid="unified-tab-verify"
                  onClick={() => {
                    setActiveTab('verify');
                    setFormError(null);
                  }}
                  className={`h-9 px-2 rounded-lg font-bold whitespace-nowrap cursor-pointer transition-colors ${
                    activeTab === 'verify'
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {b('অনুমোদন যাচাই', 'Check Status', lang)}
                </button>
              </div>
            </div>

            {/* Tab Content Body */}
            <div className="p-5 sm:p-6 space-y-4">
              {displayError && (
                <div
                  role="alert"
                  data-testid="login-portal-auth-error"
                  className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3.5 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300"
                >
                  {displayError}
                </div>
              )}

              {displayNotice && (
                <div
                  role="status"
                  data-testid="login-portal-auth-notice"
                  className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200"
                >
                  {displayNotice}
                </div>
              )}

              {/* TAB 1: Unified Login */}
              {activeTab === 'login' && (
                <div className="space-y-4">
                  <form onSubmit={(e) => void handleLoginFormSubmit(e)} className="space-y-3.5 text-xs">
                    <div>
                      <label
                        htmlFor="unified-login-identifier"
                        className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                      >
                        {b('ইউজারনেম / মোবাইল নম্বর / ইমেইল', 'Username / Mobile Number / Email', lang)}
                      </label>
                      <input
                        id="unified-login-identifier"
                        data-testid="unified-login-identifier"
                        type="text"
                        autoComplete="username"
                        value={identifier}
                        onBlur={() => setIdentifierTouched(true)}
                        onChange={(e) => {
                          setIdentifier(e.target.value);
                          setIdentifierTouched(true);
                          setFormError(null);
                        }}
                        placeholder={b(
                          'ID, মোবাইল (017...) বা ইমেইল লিখুন',
                          'Enter ID, mobile (017...), or email',
                          lang
                        )}
                        aria-invalid={identifierTouched && !identifierValidation.valid}
                        className={`w-full h-11 px-3.5 rounded-xl border bg-slate-50/70 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:bg-white dark:focus:bg-slate-900 transition-colors ${
                          identifierTouched && identifier.trim().length > 0 && !identifierValidation.valid
                            ? 'border-red-500 focus:border-red-600'
                            : identifier.trim().length > 0 && identifierValidation.valid
                              ? 'border-emerald-500 focus:border-emerald-600'
                              : 'border-slate-300 dark:border-slate-700 focus:border-emerald-600'
                        }`}
                      />
                      {identifier.trim().length > 0 && (
                        <p
                          data-testid="unified-login-identifier-validation"
                          className={`mt-1 text-[11px] font-medium ${
                            identifierValidation.valid
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {b(identifierValidation.messageBn, identifierValidation.messageEn, lang)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="unified-login-password"
                        className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                      >
                        {b('পাসওয়ার্ড', 'Password', lang)}
                      </label>
                      <div className="relative">
                        <input
                          id="unified-login-password"
                          data-testid="unified-login-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setFormError(null);
                          }}
                          placeholder={b('পাসওয়ার্ড লিখুন', 'Enter password', lang)}
                          className="w-full h-11 pl-3.5 pr-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                        />
                        <button
                          type="button"
                          data-testid="unified-login-password-toggle"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={
                            showPassword
                              ? b('পাসওয়ার্ড লুকান', 'Hide password', lang)
                              : b('পাসওয়ার্ড দেখুন', 'Show password', lang)
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          data-testid="unified-remember-me-checkbox"
                          checked={rememberMe}
                          onChange={(e) => {
                            const next = e.target.checked;
                            setRememberMe(next);
                            saveRememberedLoginIdentifier(identifier, next);
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                        />
                        <span>{b('মনে রাখুন (Remember Me)', 'Remember Me', lang)}</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      data-testid="unified-login-submit-btn"
                      disabled={loginBusy || googleSigningIn || (identifier.trim().length > 0 && !identifierValidation.valid)}
                      className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loginBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogIn className="w-4 h-4" />
                      )}
                      <span>{b('লগইন করুন', 'Sign In', lang)}</span>
                    </button>
                  </form>

                  {/* Divider */}
                  {onGoogleSignIn && (
                    <>
                      <div className="relative flex items-center py-0.5">
                        <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                        <span className="px-3 text-[11px] font-medium text-slate-400">
                          {b('অথবা', 'or', lang)}
                        </span>
                        <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                      </div>

                      <button
                        type="button"
                        data-testid="login-portal-google-btn"
                        disabled={googleSigningIn || loginBusy}
                        onClick={() => void onGoogleSignIn()}
                        className="w-full h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 cursor-pointer transition-colors disabled:opacity-60"
                      >
                        {googleSigningIn ? (
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        ) : (
                          <GoogleMark />
                        )}
                        <span>
                          {googleSigningIn
                            ? b('Google দিয়ে যাচাই হচ্ছে...', 'Verifying with Google...', lang)
                            : b('Google দিয়ে সরাসরি লগইন করুন', 'Continue directly with Google', lang)}
                        </span>
                      </button>
                    </>
                  )}

                  {/* Password Actions Row */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      data-testid="unified-change-password-toggle"
                      onClick={() => {
                        setFormError(null);
                        setFormSuccess(null);
                        setPwIdentifier((prev) => prev || identifier);
                        setPasswordTool((m) => (m === 'change' ? 'none' : 'change'));
                      }}
                      className="inline-flex items-center gap-1.5 py-1.5 font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{b('পাসওয়ার্ড পরিবর্তন করুন', 'Change Password', lang)}</span>
                    </button>

                    <button
                      type="button"
                      data-testid="unified-forgot-password-toggle"
                      onClick={() => {
                        setFormError(null);
                        setFormSuccess(null);
                        setForgotIdentifier((prev) => prev || identifier);
                        setPasswordTool((m) => (m === 'forgot' ? 'none' : 'forgot'));
                      }}
                      className="inline-flex items-center gap-1.5 py-1.5 font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>{b('পাসওয়ার্ড ভুলে গেছেন?', 'Forgot Password?', lang)}</span>
                    </button>
                  </div>

                  {/* Inline Password Change Form */}
                  {passwordTool === 'change' && (
                    <form
                      data-testid="inline-change-password-form"
                      onSubmit={(e) => void handlePasswordChangeSubmit(e)}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3.5 space-y-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {b('পাসওয়ার্ড পরিবর্তন করুন', 'Change Account Password', lang)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPasswordTool('none')}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={pwIdentifier}
                        onChange={(e) => setPwIdentifier(e.target.value)}
                        placeholder={b('ইউজারনেম / মোবাইল / ইমেইল', 'Username / Mobile / Email', lang)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-emerald-600"
                      />
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder={b('বর্তমান পাসওয়ার্ড', 'Current Password', lang)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-emerald-600"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder={b('নতুন পাসওয়ার্ড (৬+ অক্ষর)', 'New Password (6+ chars)', lang)}
                          className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-emerald-600"
                        />
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder={b('পুনরায় নতুন পাসওয়ার্ড', 'Confirm Password', lang)}
                          className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-emerald-600"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={pwToolBusy}
                        className="w-full h-9 rounded-lg bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-bold cursor-pointer disabled:opacity-60"
                      >
                        {pwToolBusy
                          ? b('সংরক্ষণ হচ্ছে...', 'Updating...', lang)
                          : b('নতুন পাসওয়ার্ড সংরক্ষণ করুন', 'Save New Password', lang)}
                      </button>
                    </form>
                  )}

                  {/* Inline Forgot Password Form */}
                  {passwordTool === 'forgot' && (
                    <form
                      data-testid="inline-forgot-password-form"
                      onSubmit={(e) => void handleForgotSubmit(e)}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3.5 space-y-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {b('পাসওয়ার্ড পুনরুদ্ধার', 'Reset / Recover Password', lang)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPasswordTool('none')}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {b(
                          'আপনার নিবন্ধিত ইমেইল দিলে Firebase রিসেট লিংক পাঠানো হবে। স্কুল বা শিক্ষক আইডি দিলে প্রধান শিক্ষক/অ্যাডমিন সহায়তার নির্দেশনা পাবেন।',
                          'Enter your registered email for a Firebase reset link, or enter your School/Teacher/Student ID for recovery guidance.',
                          lang
                        )}
                      </p>
                      <input
                        type="text"
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder={b('নিবন্ধিত ইমেইল বা আইডি', 'Registered Email or ID', lang)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-emerald-600"
                      />
                      <button
                        type="submit"
                        disabled={pwToolBusy}
                        className="w-full h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer disabled:opacity-60"
                      >
                        {pwToolBusy
                          ? b('প্রক্রিয়া চলছে...', 'Sending...', lang)
                          : b('রিসেট লিংক / নির্দেশনা পাঠান', 'Send Reset Link / Guidance', lang)}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 2: New Account Creation (3 Clean Options) */}
              {activeTab === 'register' && (
                <div data-testid="unified-register-panel" className="space-y-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      {b('নতুন অ্যাকাউন্ট তৈরি করুন', 'Create New Account', lang)}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {b(
                        'আপনার প্রযোজ্য নিবন্ধন ধরন নির্বাচন করুন',
                        'Choose the registration type you want to submit',
                        lang
                      )}
                    </p>
                  </div>

                  <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <button
                      type="button"
                      data-testid="register-option-school"
                      onClick={onOpenSchoolRegistration}
                      className="w-full p-3.5 bg-white dark:bg-slate-900 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30 flex items-center justify-between gap-3 text-left cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 dark:text-white">
                            {b('বিদ্যালয় নিবন্ধন', 'School Registration', lang)}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {b('নতুন বিদ্যালয় অন্তর্ভুক্তি ও অনুমোদন আবেদন', 'Register a new school for approval', lang)}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>

                    <button
                      type="button"
                      data-testid="register-option-teacher"
                      onClick={onOpenTeacherRegistration}
                      className="w-full p-3.5 bg-white dark:bg-slate-900 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 flex items-center justify-between gap-3 text-left cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <UserPlus className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 dark:text-white">
                            {b('শিক্ষক রেজিস্ট্রেশন', 'Teacher Registration', lang)}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {b('আজীবন Global Teacher ID ও বিদ্যালয়ে যোগদান', 'Get Global Teacher ID & apply to schools', lang)}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>

                    <button
                      type="button"
                      data-testid="register-option-student"
                      onClick={onOpenStudentRegistration}
                      className="w-full p-3.5 bg-white dark:bg-slate-900 hover:bg-amber-50/70 dark:hover:bg-amber-950/30 flex items-center justify-between gap-3 text-left cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 dark:text-white">
                            {b('শিক্ষার্থী রেজিস্ট্রেশন', 'Student Registration', lang)}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {b('অনলাইন ভর্তি আবেদন ও স্বয়ংক্রিয় Student ID', 'Submit student admission & get Student ID', lang)}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: Registration / Approval Status Verification */}
              {activeTab === 'verify' && (
                <div data-testid="unified-verify-panel" className="space-y-3.5 text-xs">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      {b('অনুমোদন যাচাই', 'Approval Status Verification', lang)}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {b(
                        'রেজিস্ট্রেশন আইডি, কোড বা মোবাইল দিয়ে বর্তমান অবস্থা দেখুন',
                        'Check real-time registration & approval status by ID, code, or mobile',
                        lang
                      )}
                    </p>
                  </div>

                  {/* 3 Clean Check Type Buttons */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        {
                          id: 'school',
                          bn: 'বিদ্যালয়ের রেজিস্ট্রেশন চেক',
                          en: 'School Check',
                          shortBn: 'বিদ্যালয় চেক',
                        },
                        {
                          id: 'teacher',
                          bn: 'শিক্ষক রেজিস্ট্রেশন চেক',
                          en: 'Teacher Check',
                          shortBn: 'শিক্ষক চেক',
                        },
                        {
                          id: 'student',
                          bn: 'শিক্ষার্থীর রেজিস্ট্রেশন চেক',
                          en: 'Student Check',
                          shortBn: 'শিক্ষার্থী চেক',
                        },
                      ] as const
                    ).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        data-testid={`verify-category-${cat.id}`}
                        onClick={() => {
                          setVerifyCategory(cat.id);
                          setVerifyQuery('');
                          setSubmittedVerifyQuery('');
                        }}
                        className={`min-h-[40px] px-2 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer transition-colors ${
                          verifyCategory === cat.id
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {b(cat.shortBn, cat.en, lang)}
                      </button>
                    ))}
                  </div>

                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    {verifyCategory === 'school'
                      ? b('বিদ্যালয়ের রেজিস্ট্রেশন চেক', 'School Registration Check', lang)
                      : verifyCategory === 'teacher'
                        ? b('শিক্ষক রেজিস্ট্রেশন চেক', 'Teacher Registration Check', lang)
                        : b('শিক্ষার্থীর রেজিস্ট্রেশন চেক', 'Student Registration Check', lang)}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setSubmittedVerifyQuery(verifyQuery);
                    }}
                    className="flex gap-2"
                  >
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        data-testid="verify-status-input"
                        value={verifyQuery}
                        onChange={(e) => {
                          setVerifyQuery(e.target.value);
                          setSubmittedVerifyQuery(e.target.value);
                        }}
                        placeholder={
                          verifyCategory === 'school'
                            ? b('কোড/আইডি (যেমন: GPS-1042)', 'Code/ID (e.g. GPS-1042)', lang)
                            : verifyCategory === 'teacher'
                              ? b('Teacher ID / মোবাইল (TCH-GPS1042-02)', 'Teacher ID / Mobile', lang)
                              : b('Student ID / মোবাইল (STD-2026-...)', 'Student ID / Mobile', lang)
                        }
                        className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs outline-none focus:border-emerald-600"
                      />
                    </div>
                    <button
                      type="submit"
                      data-testid="verify-status-submit-btn"
                      className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold whitespace-nowrap cursor-pointer"
                    >
                      {b('যাচাই করুন', 'Check', lang)}
                    </button>
                  </form>

                  <select
                    aria-label={b('তালিকা থেকে দ্রুত নির্বাচন', 'Quick select sample record', lang)}
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        setVerifyQuery(e.target.value);
                        setSubmittedVerifyQuery(e.target.value);
                      }
                    }}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
                  >
                    <option value="">
                      {b('-- দ্রুত নমুনা রেকর্ড থেকে নির্বাচন করুন --', '-- Quick pick a record --', lang)}
                    </option>
                    {sampleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {effectiveVerifyQuery ? (
                    verifyResult ? (
                      <div
                        data-testid="verify-status-result"
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-3.5 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {verifyResult.title}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {verifyResult.subtitle}
                            </div>
                          </div>
                          <span
                            className={`text-[11px] font-bold whitespace-nowrap shrink-0 ${
                              verifyResult.isRejected
                                ? 'text-red-600 dark:text-red-400'
                                : verifyResult.stepIndex >= 3
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {b(verifyResult.statusLabelBn, verifyResult.statusLabelEn, lang)}
                          </span>
                        </div>

                        {/* 4-Step Compact Progress Bar */}
                        <div className="grid grid-cols-4 gap-1.5 text-center">
                          {verifySteps.map((st) => {
                            const active = st.step <= verifyResult.stepIndex;
                            return (
                              <div key={st.step} className="space-y-1">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    verifyResult.isRejected && st.step === 2
                                      ? 'bg-red-500'
                                      : active
                                        ? 'bg-emerald-600'
                                        : 'bg-slate-200 dark:bg-slate-700'
                                  }`}
                                />
                                <div
                                  className={`text-[10px] font-semibold ${
                                    active
                                      ? 'text-slate-900 dark:text-white'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {b(st.labelBn, st.labelEn, lang)}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="grid grid-cols-1 gap-1 pt-1 border-t border-slate-200 dark:border-slate-700 text-[11px]">
                          {verifyResult.detailLines.map((line) => (
                            <div key={line.labelEn} className="flex items-center justify-between gap-2">
                              <span className="text-slate-500">{b(line.labelBn, line.labelEn, lang)}</span>
                              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {line.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div
                        data-testid="verify-status-empty"
                        className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-200"
                      >
                        {b(
                          'এই আইডি বা নম্বরের সাথে মিলছে এমন কোনো আবেদন পাওয়া যায়নি।',
                          'No matching registration record found for that ID or mobile.',
                          lang
                        )}
                      </div>
                    )
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-3 text-[11px] text-slate-500 text-center">
                      {b(
                        'যাচাই করতে আইডি/কোড লিখুন অথবা উপরের ড্রপডাউন থেকে নির্বাচন করুন।',
                        'Enter an ID/code above or pick a record from the quick list.',
                        lang
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </main>

        {/* Compact Bottom Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 pt-3.5 pb-1 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="text-[11px]">
            © 2026 {b('PSMS Bangladesh', 'PSMS Bangladesh', lang)}
          </span>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              data-testid="footer-account-help-btn"
              onClick={() => setAccountHelpOpen(true)}
              className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{b('অ্যাকাউন্ট সংক্রান্ত সকল বিষয়', 'All Account Matters', lang)}</span>
            </button>

            <button
              type="button"
              data-testid="footer-demo-account-btn"
              onClick={() => setDemoModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap transition-colors"
            >
              <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{b('Demo Account', 'Demo Account', lang)}</span>
            </button>
          </div>
        </footer>
      </div>

      {/* Compact Account Matters Modal */}
      {accountHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-matters-title"
            data-testid="account-matters-modal"
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 id="account-matters-title" className="text-base font-extrabold text-slate-900 dark:text-white">
                {b('অ্যাকাউন্ট সংক্রান্ত সকল বিষয়', 'All Account Matters & Support', lang)}
              </h3>
              <button
                type="button"
                onClick={() => setAccountHelpOpen(false)}
                aria-label={b('বন্ধ করুন', 'Close', lang)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              {onOpenEmailAuth && (
                <button
                  type="button"
                  onClick={() => {
                    setAccountHelpOpen(false);
                    onOpenEmailAuth('signin');
                  }}
                  className="w-full p-3.5 flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {b('Firebase ইমেইল ভেরিফিকেশন ও রিকভারি', 'Firebase Email Verification & Recovery', lang)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {b('নতুন ইমেইল সাইনআপ, ভেরিফিকেশন লিংক ও পাসওয়ার্ড রিসেট', 'Verify email inbox or reset Firebase password', lang)}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setAccountHelpOpen(false);
                  onOpenStatusTracker();
                }}
                className="w-full p-3.5 flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ClipboardCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {b('বিস্তারিত আবেদন স্ট্যাটাস ট্র্যাকার', 'Full Application Status Tracker', lang)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {b('আবেদন নম্বর দিয়ে প্রিন্টযোগ্য রিপোর্ট দেখুন', 'View printable timeline report by request code', lang)}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {onOpenContactAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setAccountHelpOpen(false);
                    onOpenContactAdmin();
                  }}
                  className="w-full p-3.5 flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4 text-teal-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {b('অ্যাডমিনের সাথে যোগাযোগ করুন', 'Contact Central Admin', lang)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {b('অ্যাকাউন্ট লক, আইডি হারানো বা জরুরি সহায়তা', 'Account lock, lost ID, or administrative help', lang)}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              )}

              {onOpenAppDownloadAndShare && (
                <button
                  type="button"
                  onClick={() => {
                    setAccountHelpOpen(false);
                    onOpenAppDownloadAndShare();
                  }}
                  className="w-full p-3.5 flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Share2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {b('অ্যাপ ডাউনলোড (APK / Web)', 'App Download & Share (APK / Web)', lang)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {b('Android APK ডাউনলোড ও ওয়েব ব্রাউজার লিংক', 'Download Android APK or copy browser link', lang)}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compact Demo Account Picker Modal */}
      {demoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-account-title"
            data-testid="demo-account-modal"
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600" />
                <h3 id="demo-account-title" className="text-base font-extrabold text-slate-900 dark:text-white">
                  {b('Demo Account দিয়ে দেখুন', 'Explore with Demo Account', lang)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDemoModalOpen(false)}
                aria-label={b('বন্ধ করুন', 'Close', lang)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {b(
                'যেকোনো একটি ডেমো রোল বেছে নিয়ে সরাসরি অ্যাপের সম্পূর্ণ কার্যক্রম পরীক্ষা করুন:',
                'Select any demo role below to preview the live application workflow:',
                lang
              )}
            </p>

            <div className="space-y-2">
              {demoAccounts.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`demo-login-${item.id}`}
                    onClick={() => {
                      setDemoModalOpen(false);
                      onDemoQuickLogin(item.id);
                    }}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/60 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between gap-3 text-left cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.accentClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white truncate">
                          {b(item.titleBn, item.titleEn, lang)}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 truncate">
                          ID: {item.idLabel}
                        </div>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
