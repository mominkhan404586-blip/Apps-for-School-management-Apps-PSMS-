import React, { useEffect, useState } from 'react';
import { Download, ExternalLink, Smartphone, UploadCloud, Wifi, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import type { Language } from '../types';
import { b } from '../i18n/translations';
import {
  VERIFIED_GITHUB_APK_RELEASE_URL,
  resolveAndroidApkDownloadUrl,
  resolveApiUrl,
} from '../utils/deploymentConfig';
import { InstallInstructionsModal } from './InstallInstructions';

function useDeploymentApkStatus() {
  const [androidApkUrl, setAndroidApkUrl] = useState<string>(
    () => resolveAndroidApkDownloadUrl() || VERIFIED_GITHUB_APK_RELEASE_URL
  );
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

  return { androidApkUrl, apkReleaseReady, apkActionsUrl, isCapacitorNative };
}

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
  const { androidApkUrl, apkReleaseReady, apkActionsUrl, isCapacitorNative } =
    useDeploymentApkStatus();

  const showApkDownload = Boolean(androidApkUrl) && apkReleaseReady && !isCapacitorNative;
  const showPendingActionsLink =
    Boolean(androidApkUrl) && !apkReleaseReady && Boolean(apkActionsUrl) && !isCapacitorNative;

  if ((isInstalled || isCapacitorNative) && variant === 'compact') {
    return null;
  }

  const handleClick = async () => {
    if (canInstallNatively) {
      const accepted = await promptInstall();
      if (accepted) return;
    }
    setShowGuideModal(true);
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
                  : b(
                      'একই অ্যাকাউন্ট, একই ডাটাবেস ও অফলাইন সাপোর্ট সহ সরাসরি ফোনে বা ডেস্কটপে ইনস্টল করুন।',
                      'Install with identical accounts, real-time server sync & offline access.',
                      lang
                    )}
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
                onClick={() => void handleClick()}
                data-testid="pwa-card-install-btn"
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer shrink-0 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{b('অ্যাপ ইনস্টল করুন (Install App)', 'Install App', lang)}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1 shrink-0">
          {showApkDownload && (
            <a
              href={androidApkUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              data-testid="header-android-apk-download-btn"
              title={b('সরাসরি Android APK ডাউনলোড করুন', 'Download Android APK directly', lang)}
              className="inline-flex items-center gap-1 h-9 px-2 2xl:px-2.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap shrink-0 transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden 2xl:inline">{b('APK ডাউনলোড', 'Android APK', lang)}</span>
              <span className="2xl:hidden">APK</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => void handleClick()}
            data-testid="header-get-app-btn"
            aria-label={b('Get App — অ্যাপ ইনস্টল করুন', 'Get App', lang)}
            title={b('Get App — হোম স্ক্রিন বা ডেস্কটপে অ্যাপ ইনস্টল করুন', 'Get App — Install Web App & Guide', lang)}
            className="inline-flex items-center gap-1 h-9 px-2 sm:px-2.5 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{b('Get App', 'Get App', lang)}</span>
          </button>
        </div>
      )}

      <InstallInstructionsModal
        open={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        lang={lang}
        isIOS={isIOS}
        isAndroid={isAndroid}
        canInstallNatively={canInstallNatively}
        onTriggerNativeInstall={promptInstall}
        androidApkUrl={androidApkUrl}
        apkReleaseReady={apkReleaseReady}
        apkActionsUrl={apkActionsUrl}
      />
    </>
  );
};

export const PWAInstallBanner: React.FC<{ lang?: Language }> = ({ lang = 'bn' }) => {
  const { canInstallNatively, isInstalled, isIOS, isAndroid, promptInstall } = usePWAInstall();
  const { androidApkUrl, apkReleaseReady, apkActionsUrl, isCapacitorNative } =
    useDeploymentApkStatus();
  const [dismissed, setDismissed] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled || isCapacitorNative || dismissed) {
    return null;
  }

  const handleInstallAction = async () => {
    if (canInstallNatively) {
      const accepted = await promptInstall();
      if (accepted) return;
    }
    setShowGuideModal(true);
  };

  return (
    <>
      <div
        role="region"
        aria-label={b('PWA অ্যাপ ইনস্টল ব্যানার', 'Install PSMS Web App', lang)}
        data-testid="pwa-persistent-install-banner"
        className="mb-4 rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-gradient-to-r from-emerald-50 via-teal-50/80 to-sky-50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-sky-950/30 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-2xs no-print"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {b('PSMS BD অ্যাপ হিসেবে ইনস্টল করুন', 'Install PSMS BD App', lang)}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
              {canInstallNatively
                ? b('১ ক্লিকে সরাসরি ব্রাউজার থেকে অ্যাপ ইনস্টল করুন', 'One-click install directly from your browser', lang)
                : isIOS
                  ? b('iPhone/iPad: Share > Add to Home Screen নির্দেশিকা দেখুন', 'iPhone/iPad: Tap Share > Add to Home Screen', lang)
                  : b('হোম স্ক্রিন বা ডেস্কটপ শর্টকাট ও Android APK ডাউনলোড', 'Add to Home Screen & Android APK access', lang)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            data-testid="pwa-banner-install-app-btn"
            onClick={() => void handleInstallAction()}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{b('Install App', 'Install App', lang)}</span>
          </button>
          <button
            type="button"
            data-testid="pwa-banner-instructions-btn"
            onClick={() => setShowGuideModal(true)}
            className="hidden sm:inline-flex items-center h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold cursor-pointer whitespace-nowrap"
          >
            {b('নির্দেশিকা', 'How to Install', lang)}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label={b('বন্ধ করুন', 'Dismiss', lang)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <InstallInstructionsModal
        open={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        lang={lang}
        isIOS={isIOS}
        isAndroid={isAndroid}
        canInstallNatively={canInstallNatively}
        onTriggerNativeInstall={promptInstall}
        androidApkUrl={androidApkUrl}
        apkReleaseReady={apkReleaseReady}
        apkActionsUrl={apkActionsUrl}
      />
    </>
  );
};

export interface OfflineIndicatorProps {
  lang?: Language;
  variant?: 'floating' | 'header';
  isOffline?: boolean;
  pendingUploadsCount?: number;
  onClickSync?: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  lang = 'bn',
  variant = 'floating',
  isOffline = false,
  pendingUploadsCount = 0,
  onClickSync,
}) => {
  const browserOnline = useOnlineStatus();
  const effectiveOffline = isOffline || !browserOnline;

  if (variant === 'header') {
    const hasPending = pendingUploadsCount > 0;
    return (
      <button
        type="button"
        onClick={onClickSync}
        data-testid="offline-indicator-header"
        title={
          effectiveOffline
            ? b(
                `অফলাইন মোড — ${pendingUploadsCount} pending uploads অপেক্ষমাণ`,
                `Offline Mode — ${pendingUploadsCount} pending uploads queued`,
                lang
              )
            : hasPending
              ? b(
                  `${pendingUploadsCount}টি পরিবর্তন ক্লাউডে আপলোডের অপেক্ষায় — সিঙ্ক করতে ক্লিক করুন`,
                  `${pendingUploadsCount} pending uploads waiting to sync — click to sync`,
                  lang
                )
              : b('অনলাইন সিঙ্ক সক্রিয় (অফলাইন টেস্ট করতে ক্লিক করুন)', 'Online Mode (click to toggle offline queue)', lang)
        }
        className={`inline-flex items-center gap-1.5 h-8 sm:h-9 px-2 lg:px-2.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          effectiveOffline
            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
            : hasPending
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        }`}
      >
        {effectiveOffline ? (
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <Wifi className="w-3.5 h-3.5 shrink-0" />
        )}
        <span className="hidden lg:inline">
          {effectiveOffline
            ? b('অফলাইন', 'Offline', lang)
            : b('অনলাইন', 'Online', lang)}
        </span>
        {(hasPending || effectiveOffline) && (
          <span
            data-testid="header-pending-uploads-badge"
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${
              hasPending
                ? 'bg-amber-600 text-white'
                : 'bg-amber-200/80 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200'
            }`}
          >
            <UploadCloud className="w-3 h-3 shrink-0" />
            <span>{pendingUploadsCount} pending uploads</span>
          </span>
        )}
      </button>
    );
  }

  if (!effectiveOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-indicator-floating"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-amber-900 text-amber-100 text-xs font-semibold shadow-lg border border-amber-500/40"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>
        {b('আপনি অফলাইনে আছেন — সংরক্ষিত ডাটা দেখা যাচ্ছে', 'You are offline — cached workspace active', lang)}
      </span>
      {pendingUploadsCount > 0 && (
        <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[11px] font-bold tabular-nums">
          {pendingUploadsCount} pending uploads
        </span>
      )}
    </div>
  );
};
