import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  MailCheck,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';
import type { Language } from '../types';
import { b, tr } from '../i18n/translations';
import {
  getActiveFirebaseProjectInfo,
  registerWithFirebaseEmail,
  reloadCurrentFirebaseUser,
  resendFirebaseVerificationEmail,
  resolveAndSyncFirebaseUser,
  sendFirebasePasswordReset,
  signInWithFirebaseEmail,
} from '../firebase';
import { mapFirebaseAuthErrorMessage, type AuthenticatedSession } from '../utils/authGuard';

export type FirebaseEmailAuthTab = 'signin' | 'signup' | 'recovery';

interface FirebaseEmailAuthModalProps {
  open: boolean;
  lang: Language;
  initialTab?: FirebaseEmailAuthTab;
  initialEmail?: string;
  onClose: () => void;
  onAuthSuccess: (session: AuthenticatedSession) => void;
  onPendingApprovalNotice?: (email: string) => void;
}

export const FirebaseEmailAuthModal: React.FC<FirebaseEmailAuthModalProps> = ({
  open,
  lang,
  initialTab = 'signin',
  initialEmail = '',
  onClose,
  onAuthSuccess,
  onPendingApprovalNotice,
}) => {
  const [tab, setTab] = useState<FirebaseEmailAuthTab>(initialTab);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [awaitingVerificationEmail, setAwaitingVerificationEmail] = useState<string | null>(null);

  const projectInfo = getActiveFirebaseProjectInfo();

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      if (initialEmail) {
        setEmail(initialEmail);
      }
      setError(null);
      setSuccessMsg(null);
    }
  }, [open, initialTab, initialEmail]);

  if (!open) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!email.trim() || !password) {
      setError(b('ইমেইল এবং পাসওয়ার্ড লিখুন।', 'Please enter both email and password.', lang));
      return;
    }

    setLoading(true);
    try {
      const user = await signInWithFirebaseEmail(email, password);
      if (!user.emailVerified) {
        setAwaitingVerificationEmail(user.email ?? email.trim());
        setSuccessMsg(
          b(
            'আপনার ইমেইল এখনো ভেরিফাই করা হয়নি। ইনবক্স/স্প্যাম ফোল্ডার থেকে ভেরিফিকেশন লিংকে ক্লিক করুন বা নতুন লিংক পাঠান।',
            'Your email is not verified yet. Please click the verification link in your inbox or resend it below.',
            lang
          )
        );
        return;
      }

      const resolved = await resolveAndSyncFirebaseUser(user);
      if (resolved.blockedReasonBn || resolved.blockedReasonEn) {
        setError(b(resolved.blockedReasonBn ?? 'অ্যাকাউন্ট ব্লক করা হয়েছে।', resolved.blockedReasonEn ?? 'Account is blocked.', lang));
        return;
      }
      if (resolved.session) {
        onAuthSuccess(resolved.session);
        onClose();
      } else if (resolved.pendingRoleSelection) {
        onPendingApprovalNotice?.(user.email ?? email.trim());
        onClose();
      }
    } catch (err) {
      setError(mapFirebaseAuthErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!displayName.trim()) {
      setError(b('আপনার পূর্ণ নাম লিখুন।', 'Please enter your full name.', lang));
      return;
    }
    if (!email.trim()) {
      setError(b('সঠিক ইমেইল ঠিকানা লিখুন।', 'Please enter a valid email address.', lang));
      return;
    }
    if (password.length < 6) {
      setError(b('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।', 'Password must be at least 6 characters.', lang));
      return;
    }
    if (password !== confirmPassword) {
      setError(b('দুটি পাসওয়ার্ড একরকম হয়নি।', 'Passwords do not match.', lang));
      return;
    }

    setLoading(true);
    try {
      const user = await registerWithFirebaseEmail(email, password, displayName);
      setAwaitingVerificationEmail(user.email ?? email.trim());
      setSuccessMsg(
        b(
          `${user.email ?? email.trim()} ঠিকানায় একটি ইমেইল ভেরিফিকেশন লিংক পাঠানো হয়েছে। লিংকে ক্লিক করার পর নিচের "ভেরিফিকেশন সম্পন্ন হয়েছে" বাটনে ক্লিক করুন।`,
          `Verification email sent to ${user.email ?? email.trim()}. Click the link in your inbox, then press "Check Verification" below.`,
          lang
        )
      );
    } catch (err) {
      setError(mapFirebaseAuthErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError(null);
    setLoading(true);
    try {
      await resendFirebaseVerificationEmail();
      setSuccessMsg(
        b(
          'নতুন ভেরিফিকেশন ইমেইল পাঠানো হয়েছে। অনুগ্রহ করে ইনবক্স ও স্প্যাম ফোল্ডার দেখুন।',
          'Verification email resent. Please check your inbox and spam folder.',
          lang
        )
      );
    } catch (err) {
      setError(mapFirebaseAuthErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  const handleRecheckVerification = async () => {
    setError(null);
    setLoading(true);
    try {
      const refreshed = await reloadCurrentFirebaseUser();
      if (!refreshed) {
        setError(b('পুনরায় লগইন করে চেষ্টা করুন।', 'Please sign in again to recheck verification.', lang));
        return;
      }
      if (!refreshed.emailVerified) {
        setError(
          b(
            'ইমেইল এখনো ভেরিফাইড দেখাচ্ছে না। ইমেইলের লিংকে ক্লিক করে কয়েক সেকেন্ড পর আবার চেষ্টা করুন।',
            'Email still shows unverified. Please click the verification link in your inbox first.',
            lang
          )
        );
        return;
      }
      const resolved = await resolveAndSyncFirebaseUser(refreshed);
      if (resolved.session) {
        onAuthSuccess(resolved.session);
        onClose();
      } else {
        onPendingApprovalNotice?.(refreshed.email ?? '');
        onClose();
      }
    } catch (err) {
      setError(mapFirebaseAuthErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!email.trim()) {
      setError(b('আপনার অ্যাকাউন্টের ইমেইল লিখুন।', 'Please enter your account email address.', lang));
      return;
    }

    setLoading(true);
    try {
      await sendFirebasePasswordReset(email);
      setSuccessMsg(
        b(
          `${email.trim()} ঠিকানায় পাসওয়ার্ড রিসেট / অ্যাকাউন্ট পুনরুদ্ধার লিংক পাঠানো হয়েছে। ইমেইল খুলে নতুন পাসওয়ার্ড সেট করুন।`,
          `Password reset link sent to ${email.trim()}. Check your inbox to recover your account.`,
          lang
        )
      );
    } catch (err) {
      setError(mapFirebaseAuthErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="firebase-email-auth-title"
        data-testid="firebase-email-auth-modal"
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto text-slate-900 dark:text-slate-100"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={tr('close', lang)}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1 pr-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Firebase · {projectInfo.projectId}</span>
          </div>
          <h3 id="firebase-email-auth-title" className="text-lg font-extrabold">
            {b('Firebase ইমেইল, ভেরিফিকেশন ও পুনরুদ্ধার', 'Firebase Email, Verification & Recovery', lang)}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {b(
              'নিরাপদ অ্যাকাউন্ট তৈরি, ইমেইল ভেরিফিকেশন এবং পাসওয়ার্ড/অ্যাকাউন্ট রিকভারি পোর্টাল',
              'Verified email authentication, signup verification, and password reset recovery',
              lang
            )}
          </p>
        </div>

        {/* 3 Mode Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
          <button
            type="button"
            data-testid="firebase-tab-signin"
            onClick={() => {
              setTab('signin');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 px-2 rounded-lg cursor-pointer transition-colors ${
              tab === 'signin'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {b('ইমেইল লগইন', 'Sign In', lang)}
          </button>
          <button
            type="button"
            data-testid="firebase-tab-signup"
            onClick={() => {
              setTab('signup');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 px-2 rounded-lg cursor-pointer transition-colors ${
              tab === 'signup'
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {b('নতুন অ্যাকাউন্ট', 'Create Account', lang)}
          </button>
          <button
            type="button"
            data-testid="firebase-tab-recovery"
            onClick={() => {
              setTab('recovery');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 px-2 rounded-lg cursor-pointer transition-colors ${
              tab === 'recovery'
                ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {b('পাসওয়ার্ড রিসেট', 'Recovery', lang)}
          </button>
        </div>

        {awaitingVerificationEmail && (
          <div
            data-testid="firebase-verification-pending-box"
            className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-3.5 space-y-2.5 text-xs"
          >
            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-200">
              <MailCheck className="w-4 h-4 shrink-0" />
              <span>{b('ইমেইল ভেরিফিকেশন অপেক্ষমাণ', 'Email Verification Pending', lang)}</span>
            </div>
            <p className="text-amber-900 dark:text-amber-100 leading-relaxed">
              {b('ইমেইল:', 'Email:', lang)} <span className="font-mono font-bold">{awaitingVerificationEmail}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleRecheckVerification()}
                className="flex-1 h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{b('ভেরিফিকেশন যাচাই করুন', 'Check Verification', lang)}</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleResendVerification()}
                className="h-9 px-3 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{b('পুনরায় পাঠান', 'Resend', lang)}</span>
              </button>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            data-testid="firebase-email-auth-error"
            className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3.5 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            data-testid="firebase-email-auth-success"
            className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200"
          >
            {successMsg}
          </div>
        )}

        {tab === 'signin' && (
          <form onSubmit={(e) => void handleSignIn(e)} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">{b('ইমেইল ঠিকানা *', 'Email Address *', lang)}</label>
              <input
                type="email"
                data-testid="firebase-signin-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('পাসওয়ার্ড *', 'Password *', lang)}</label>
              <input
                type="password"
                data-testid="firebase-signin-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-emerald-600"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              data-testid="firebase-signin-submit-btn"
              className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              <span>{b('Firebase দিয়ে লগইন করুন', 'Sign In with Firebase', lang)}</span>
            </button>
          </form>
        )}

        {tab === 'signup' && (
          <form onSubmit={(e) => void handleSignUp(e)} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">{b('আপনার নাম *', 'Full Name *', lang)}</label>
              <input
                type="text"
                data-testid="firebase-signup-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={b('যেমন: মোঃ মমিনুল ইসলাম', 'e.g., Mominul Islam', lang)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('ইমেইল ঠিকানা *', 'Email Address *', lang)}</label>
              <input
                type="email"
                data-testid="firebase-signup-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-600"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold mb-1">{b('পাসওয়ার্ড (৬+ অক্ষর) *', 'Password (6+ chars) *', lang)}</label>
                <input
                  type="password"
                  data-testid="firebase-signup-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('পুনরায় পাসওয়ার্ড *', 'Confirm Password *', lang)}</label>
                <input
                  type="password"
                  data-testid="firebase-signup-confirm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-600"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              data-testid="firebase-signup-submit-btn"
              className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              <span>{b('অ্যাকাউন্ট তৈরি ও ভেরিফিকেশন ইমেইল পাঠান', 'Create Account & Send Verification', lang)}</span>
            </button>
          </form>
        )}

        {tab === 'recovery' && (
          <form onSubmit={(e) => void handlePasswordReset(e)} className="space-y-3 text-xs">
            <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-amber-900 dark:text-amber-200 leading-relaxed">
              {b(
                'পাসওয়ার্ড ভুলে গেলে নিচে আপনার নিবন্ধিত ইমেইল লিখুন। Firebase আপনার ইমেইলে নিরাপদ পাসওয়ার্ড রিসেট ও অ্যাকাউন্ট পুনরুদ্ধার লিংক পাঠাবে।',
                'Enter your registered email below. Firebase will send a secure password reset and account recovery link to your inbox.',
                lang
              )}
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('নিবন্ধিত ইমেইল *', 'Registered Email *', lang)}</label>
              <input
                type="email"
                data-testid="firebase-recovery-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-amber-600"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              data-testid="firebase-recovery-submit-btn"
              className="w-full h-10 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              <span>{b('অ্যাকাউন্ট পুনরুদ্ধার লিংক পাঠান', 'Send Account Recovery Email', lang)}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
