import React from 'react';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Laptop,
  MoreVertical,
  Share,
  Smartphone,
  X,
} from 'lucide-react';
import type { Language } from '../types';
import { b } from '../i18n/translations';
import {
  VERIFIED_GITHUB_APK_RELEASE_URL,
  VERIFIED_PUBLISHED_WEB_APP_URL,
  resolveAndroidApkDownloadUrl,
  resolveLiveWebAppUrl,
} from '../utils/deploymentConfig';

export interface InstallInstructionsProps {
  lang?: Language;
  isIOS: boolean;
  isAndroid: boolean;
  canInstallNatively?: boolean;
  onTriggerNativeInstall?: () => Promise<boolean> | void;
  androidApkUrl?: string;
  apkReleaseReady?: boolean;
  apkActionsUrl?: string;
  className?: string;
}

export const InstallInstructions: React.FC<InstallInstructionsProps> = ({
  lang = 'bn',
  isIOS,
  isAndroid,
  canInstallNatively = false,
  onTriggerNativeInstall,
  androidApkUrl,
  apkReleaseReady = true,
  apkActionsUrl = '',
  className = '',
}) => {
  const resolvedApkUrl = androidApkUrl || resolveAndroidApkDownloadUrl() || VERIFIED_GITHUB_APK_RELEASE_URL;
  const resolvedWebUrl = resolveLiveWebAppUrl() || VERIFIED_PUBLISHED_WEB_APP_URL;

  return (
    <div
      data-testid="install-instructions-panel"
      className={`space-y-4 text-xs ${className}`}
    >
      {/* Detected Platform Badge */}
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/30 p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
          {isIOS || isAndroid ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-slate-900 dark:text-white">
            {isIOS
              ? b('iPhone / iPad (iOS Safari) শনাক্ত হয়েছে', 'iPhone / iPad (iOS Safari) Detected', lang)
              : isAndroid
                ? b('Android ডিভাইস শনাক্ত হয়েছে', 'Android Device Detected', lang)
                : b('Computer / Desktop ব্রাউজার শনাক্ত হয়েছে', 'Desktop Browser Detected', lang)}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-300">
            {b(
              'নিচের ধাপ অনুসরণ করে হোম স্ক্রিনে অ্যাপের মতো ইনস্টল করুন',
              'Follow these quick steps to install PSMS as a standalone app',
              lang
            )}
          </div>
        </div>
      </div>

      {/* Native 1-Click Prompt if browser fired beforeinstallprompt */}
      {canInstallNatively && onTriggerNativeInstall && (
        <button
          type="button"
          data-testid="install-instructions-native-btn"
          onClick={() => void onTriggerNativeInstall()}
          className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>{b('এখনই অ্যাপ ইনস্টল করুন (১-ক্লিক PWA)', 'Install App Now (One-Click)', lang)}</span>
        </button>
      )}

      {/* Platform-Specific Step-by-Step Guidance */}
      {isIOS ? (
        <div
          data-testid="install-instructions-ios"
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3.5 space-y-2.5"
        >
          <div className="font-bold text-slate-900 dark:text-white">
            {b('iOS Safari — Add to Home Screen নির্দেশিকা:', 'iOS Safari — Add to Home Screen Guide:', lang)}
          </div>
          <ol className="space-y-2 text-slate-700 dark:text-slate-300 list-decimal pl-4">
            <li>
              {b('Safari ব্রাউজারের নিচে বা উপরে Share আইকনে ট্যাপ করুন', 'Tap the Share icon in Safari toolbar', lang)}{' '}
              <Share className="w-3.5 h-3.5 inline text-blue-600 dark:text-blue-400" />
            </li>
            <li>
              {b('মেনুতে নিচে স্ক্রল করে "Add to Home Screen" নির্বাচন করুন', 'Scroll down and tap "Add to Home Screen"', lang)}
            </li>
            <li>
              {b('ডানদিকের উপরে "Add" বাটনে ট্যাপ করলে হোম স্ক্রিনে অ্যাপটি যুক্ত হবে', 'Tap "Add" in the top-right corner to finish', lang)}
            </li>
          </ol>
        </div>
      ) : isAndroid ? (
        <div
          data-testid="install-instructions-android"
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3.5 space-y-2.5"
        >
          <div className="font-bold text-slate-900 dark:text-white">
            {b('Android ব্রাউজার — Add to Home Screen / Install:', 'Android Browser — Install App Guide:', lang)}
          </div>
          <ol className="space-y-2 text-slate-700 dark:text-slate-300 list-decimal pl-4">
            <li>
              {b('Chrome / Brave ব্রাউজারের ডান-উপরে মেনু আইকনে ট্যাপ করুন', 'Tap the browser menu icon at top-right', lang)}{' '}
              <MoreVertical className="w-3.5 h-3.5 inline text-emerald-600 dark:text-emerald-400" />
            </li>
            <li>
              {b('"Install app" অথবা "Add to Home screen" অপশনে ট্যাপ করুন', 'Tap "Install app" or "Add to Home screen"', lang)}
            </li>
            <li>
              {b('কনফার্ম করলে ফোনের অ্যাপ ড্রয়ারে PSMS BD যুক্ত হয়ে যাবে — অথবা নিচ থেকে সরাসরি APK ডাউনলোড করুন', 'Confirm to add PSMS BD icon — or download the Android APK directly below', lang)}
            </li>
          </ol>
        </div>
      ) : (
        <div
          data-testid="install-instructions-desktop"
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3.5 space-y-2.5"
        >
          <div className="font-bold text-slate-900 dark:text-white">
            {b('Desktop / Laptop (Chrome / Edge / Brave):', 'Desktop / Laptop (Chrome / Edge / Brave):', lang)}
          </div>
          <ol className="space-y-2 text-slate-700 dark:text-slate-300 list-decimal pl-4">
            <li>
              {b('অ্যাড্রেস বারের ডানপাশে থাকা Install (⊕ / কম্পিউটার) আইকনে ক্লিক করুন', 'Click the Install icon in the right side of the address bar', lang)}
            </li>
            <li>
              {b('অথবা ব্রাউজার মেনু (⋮) থেকে "Install PSMS BD..." নির্বাচন করুন', 'Or open browser menu (⋮) and choose "Install PSMS BD..."', lang)}
            </li>
            <li>
              {b('মোবাইলের জন্য নিচের বাটন থেকে সরাসরি Android APK ডাউনলোড করতে পারবেন', 'You can also download the Android APK file for phones below', lang)}
            </li>
          </ol>
        </div>
      )}

      {/* Dual Web + APK Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {apkReleaseReady ? (
          <a
            href={resolvedApkUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            data-testid="install-guide-apk-download-btn"
            className="h-10 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>{b('Android APK ডাউনলোড', 'Download Android APK', lang)}</span>
          </a>
        ) : (
          <a
            href={apkActionsUrl || resolvedApkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            <span>{b('APK বিল্ড দেখুন', 'Open APK Build', lang)}</span>
          </a>
        )}

        <a
          href={resolvedWebUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="install-guide-web-open-btn"
          className="h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
        >
          <ExternalLink className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{b('ওয়েব ব্রাউজারে খুলুন', 'Open Web Browser', lang)}</span>
        </a>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>
          {b(
            'Web App ও Android APK একই অ্যাকাউন্ট, নিরাপদ লগইন ও রিয়েল-টাইম ডাটা ব্যবহার করে।',
            'Web App and Android APK share the same accounts, secure login & real-time data.',
            lang
          )}
        </span>
      </div>
    </div>
  );
};

export interface InstallInstructionsModalProps extends InstallInstructionsProps {
  open: boolean;
  onClose: () => void;
}

export const InstallInstructionsModal: React.FC<InstallInstructionsModalProps> = ({
  open,
  onClose,
  lang = 'bn',
  ...rest
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-guide-title"
      data-testid="install-instructions-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 id="pwa-install-guide-title" className="text-base font-bold text-slate-900 dark:text-white">
                {b('PSMS অ্যাপ ইনস্টল নির্দেশিকা (Get App)', 'Install PSMS App (Get App)', lang)}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {b('Web App (PWA) এবং Android APK গাইড', 'Native Web App (PWA) & Android APK Guide', lang)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <InstallInstructions lang={lang} {...rest} />

        <button
          type="button"
          onClick={onClose}
          className="w-full h-10 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold cursor-pointer hover:opacity-90"
        >
          {b('বুঝেছি (Close)', 'Got it', lang)}
        </button>
      </div>
    </div>
  );
};
