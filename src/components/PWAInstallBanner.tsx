import React, { useEffect, useState } from 'react';
import { Download, ExternalLink, Share, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import type { Language } from '../types';
import { b } from '../i18n/translations';
import { resolveAndroidApkDownloadUrl, resolveApiUrl } from '../utils/deploymentConfig';

interface PWAInstallButtonProps {
  lang?: Language;
  variant?: 'compact' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  lang = 'bn',
  variant = 'compact',
}) => {
  const { canInstallNatively, isInstalled, isIOS, isAndroid, promptInstall } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [androidApkUrl, setAndroidApkUrl] = useState<string>(() => resolveAndroidApkDownloadUrl());
  const [apkReleaseReady, setApkReleaseReady] = useState<boolean>(true);
  const [apkActionsUrl, setApkActionsUrl] = useState<string>('');

  const isCapacitorNative =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
    );

  useEffect(() => {
    let mounted = true;
    fetch(resolveApiUrl('/api/deployment'))
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            deployment?: { androidApk?: { available?: boolean; url?: string } };
            androidApkReleaseReady?: boolean;
            androidApkActionsUrl?: string;
          } | null
        ) => {
          if (!mounted) return;
          const serverUrl = data?.deployment?.androidApk?.url;
          const resolved = resolveAndroidApkDownloadUrl(serverUrl);
          if (resolved) {
            setAndroidApkUrl(resolved);
          }
          if (typeof data?.androidApkReleaseReady === 'boolean') {
            setApkReleaseReady(data.androidApkReleaseReady);
          }
          if (typeof data?.androidApkActionsUrl === 'string') {
            setApkActionsUrl(data.androidApkActionsUrl);
          }
        }
      )
      .catch(() => {
        // Keep env-resolved APK release URL if offline
      });
    return () => {
      mounted = false;
    };
  }, []);

  const showApkDownload = Boolean(androidApkUrl) && apkReleaseReady && !isCapacitorNative;
  const showPendingActionsLink = Boolean(androidApkUrl) && !apkReleaseReady && Boolean(apkActionsUrl) && !isCapacitorNative;

  if (isInstalled && variant === 'compact') {
    return null;
  }

  const handleClick = async () => {
    if (canInstallNatively) {
      await promptInstall();
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'card' ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {b('Android ও Web অ্যাপ হিসেবে ইনস্টল করুন', 'Install Mobile App (Android + Desktop)', lang)}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300">
                {isInstalled
                  ? b('অ্যাপটি ইতোমধ্যে ইনস্টল করা অবস্থায় চলছে।', 'Running in standalone app mode.', lang)
                  : b('একই অ্যাকাউন্ট, একই ডাটাবেস ও অফলাইন সাপোর্ট সহ সরাসরি ফোনে ইনস্টল করুন।', 'Install with identical accounts, real-time server sync & offline access.', lang)}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {showApkDownload && (
              <a
                href={androidApkUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                data-testid="pwa-android-apk-download-btn"
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold whitespace-nowrap transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{b('Android APK ডাউনলোড', 'Download Android APK', lang)}</span>
              </a>
            )}
            {showPendingActionsLink && (
              <a
                href={apkActionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="pwa-android-apk-pending-btn"
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold whitespace-nowrap transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>{b('APK বিল্ড স্ট্যাটাস দেখুন', 'Check APK Build', lang)}</span>
              </a>
            )}
            {!isInstalled && (
              <button
                type="button"
                onClick={handleClick}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer shrink-0 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{b('অ্যাপ ইনস্টল করুন', 'Install App', lang)}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          data-testid="pwa-install-btn"
          title={b('Android / Desktop অ্যাপ ইনস্টল করুন', 'Install Android / Web App', lang)}
          className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-xs font-semibold border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden 2xl:inline">{b('অ্যাপ ইনস্টল', 'Install App', lang)}</span>
        </button>
      )}

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-guide-title"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 id="pwa-install-guide-title" className="text-base font-bold text-slate-900 dark:text-white">
                  {b('PSMS মোবাইল অ্যাপ ইনস্টলেশন গাইড', 'Install PSMS Mobile App', lang)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 list-decimal pl-4">
                <li>
                  {b('Safari ব্রাউজারের নিচে Share আইকনে ট্যাপ করুন', 'Tap the Share button in Safari', lang)}{' '}
                  <Share className="w-3.5 h-3.5 inline text-blue-600" />
                </li>
                <li>{b('স্ক্রল করে "Add to Home Screen" নির্বাচন করুন', 'Scroll down and choose "Add to Home Screen"', lang)}</li>
                <li>{b('উপরে "Add" বাটনে ট্যাপ করুন', 'Tap "Add" in the top-right corner', lang)}</li>
              </ol>
            ) : isAndroid ? (
              <ol className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 list-decimal pl-4">
                <li>{b('Chrome মেনু (⋮) আইকনে ট্যাপ করুন', 'Tap the Chrome browser menu (⋮)', lang)}</li>
                <li>{b('"Install app" অথবা "Add to Home screen" নির্বাচন করুন', 'Tap "Install app" or "Add to Home screen"', lang)}</li>
                <li>{b('অথবা নিচের বাটন থেকে সরাসরি Android APK ডাউনলোড করে ইনস্টল করুন', 'Or download the native Android APK directly below', lang)}</li>
              </ol>
            ) : (
              <ol className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 list-decimal pl-4">
                <li>{b('ব্রাউজার অ্যাড্রেস বারের ডানদিকে Install আইকন ক্লিক করুন অথবা মেনু থেকে "Install PSMS BD" নির্বাচন করুন।', 'Click the Install icon in the browser address bar or choose "Install PSMS BD" from the menu.', lang)}</li>
                <li>{b('অ্যান্ড্রয়েড ফোনের জন্য নিচের বাটন থেকে সরাসরি Android APK ডাউনলোড করতে পারবেন।', 'For Android phones, you can download the Android APK directly using the button below.', lang)}</li>
              </ol>
            )}

            {showApkDownload && (
              <a
                href={androidApkUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                data-testid="pwa-modal-apk-download-btn"
                className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{b('Android APK ডাউনলোড করুন', 'Download Android APK', lang)}</span>
              </a>
            )}

            {showPendingActionsLink && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 p-3 space-y-2">
                <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
                  {b(
                    'প্রথম Android APK রিলিজ ফাইলটি এখনো GitHub Actions থেকে তৈরি হয়নি। আপডেট পুশ করার পর Actions সবুজ হলে এখান থেকেই সরাসরি APK ডাউনলোড চালু হয়ে যাবে।',
                    'The first Android APK release file has not been published on GitHub yet. Once you push and Actions completes, direct APK download activates automatically.',
                    lang
                  )}
                </p>
                <a
                  href={apkActionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="pwa-modal-apk-pending-btn"
                  className="w-full h-9 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{b('GitHub Actions-এ APK বিল্ড দেখুন', 'Open GitHub Actions Build', lang)}</span>
                </a>
              </div>
            )}

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-3 text-[11px] text-slate-600 dark:text-slate-300">
              {b(
                'Web Browser ও Android App একই সার্ভার, একই অ্যাকাউন্ট ও একই ডাটাবেস ব্যবহার করে।',
                'Both Web Browser and Android App share the exact same backend server, accounts, and persistent database.',
                lang
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
            >
              {b('বুঝেছি', 'Got it', lang)}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC<{ lang?: Language }> = ({ lang = 'bn' }) => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-amber-900 text-amber-100 text-xs font-semibold shadow-lg border border-amber-500/40"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>{b('আপনি অফলাইনে আছেন — সংরক্ষিত ডাটা দেখা যাচ্ছে', 'You are offline — cached workspace active', lang)}</span>
    </div>
  );
};
