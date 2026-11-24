import React, { useEffect, useState } from 'react';
import { Download, ExternalLink, Globe, Share2, Smartphone, Sparkles } from 'lucide-react';
import type { Language } from '../types';
import { b } from '../i18n/translations';
import {
  ANDROID_APP_PACKAGE_ID,
  ANDROID_APP_VERSION,
  VERIFIED_GITHUB_APK_RELEASE_URL,
  VERIFIED_PUBLISHED_WEB_APP_URL,
  resolveAndroidApkDownloadUrl,
  resolveApiUrl,
  resolveLiveWebAppUrl,
} from '../utils/deploymentConfig';

export interface DashboardAppQuickAccessCardProps {
  lang: Language;
  onOpenShareModal: () => void;
}

export const DashboardAppQuickAccessCard: React.FC<DashboardAppQuickAccessCardProps> = ({
  lang,
  onOpenShareModal,
}) => {
  const [webUrl, setWebUrl] = useState<string>(
    () => resolveLiveWebAppUrl() || VERIFIED_PUBLISHED_WEB_APP_URL
  );
  const [apkUrl, setApkUrl] = useState<string>(
    () => resolveAndroidApkDownloadUrl() || VERIFIED_GITHUB_APK_RELEASE_URL
  );
  const [apkReleaseReady, setApkReleaseReady] = useState<boolean>(true);
  const [apkActionsUrl, setApkActionsUrl] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    fetch(resolveApiUrl('/api/deployment'))
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            deployment?: {
              webApp?: { url?: string };
              androidApk?: { url?: string };
            };
            androidApkReleaseReady?: boolean;
            androidApkActionsUrl?: string;
          } | null
        ) => {
          if (!mounted || !data) return;
          const nextWeb = resolveLiveWebAppUrl(data.deployment?.webApp?.url);
          if (nextWeb) setWebUrl(nextWeb);
          const nextApk = resolveAndroidApkDownloadUrl(data.deployment?.androidApk?.url);
          if (nextApk) setApkUrl(nextApk);
          if (typeof data.androidApkReleaseReady === 'boolean') {
            setApkReleaseReady(data.androidApkReleaseReady);
          }
          if (typeof data.androidApkActionsUrl === 'string') {
            setApkActionsUrl(data.androidApkActionsUrl);
          }
        }
      )
      .catch(() => {
        // Keep env/default fallback links offline
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section
      aria-label={b('Quick Access — App & Web Download', 'Quick Access — App & Web Download', lang)}
      data-testid="dashboard-quick-access-card"
      className="mt-6 rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-slate-900 via-emerald-950 to-blue-950 text-white p-4 sm:p-5 shadow-md"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-[11px] font-bold text-emerald-200">
                <Sparkles className="w-3 h-3" />
                <span>Quick Access</span>
              </span>
              <span
                data-testid="dashboard-apk-version-badge"
                className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/30 text-[11px] font-mono font-bold text-blue-200"
              >
                APK v{ANDROID_APP_VERSION} · {ANDROID_APP_PACKAGE_ID}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-extrabold text-white">
              {b(
                'অ্যাপস ডাউনলোড, ওয়েব ব্রাউজিং ও বন্ধুদের শেয়ার করুন',
                'App & Web Quick Access — Download APK or Open Web App',
                lang
              )}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {b(
                'কম্পিউটার ব্রাউজার বা Android মোবাইল অ্যাপে একই ডাটাবেসে কাজ করুন এবং বন্ধুদের সাথে শেয়ার করুন।',
                'Download the Android APK file for mobile/PC transfer, open the live Web App, or share with friends.',
                lang
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {apkReleaseReady ? (
            <a
              href={apkUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              data-testid="dashboard-download-apk-btn"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold whitespace-nowrap transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>{b(`Download APK (v${ANDROID_APP_VERSION})`, `Download APK (v${ANDROID_APP_VERSION})`, lang)}</span>
            </a>
          ) : (
            <a
              href={apkActionsUrl || apkUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="dashboard-apk-actions-btn"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold whitespace-nowrap transition-colors shadow-sm"
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span>{b('GitHub Actions-এ APK দেখুন', 'Check APK Build', lang)}</span>
            </a>
          )}

          <a
            href={webUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="dashboard-open-web-app-btn"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold whitespace-nowrap transition-colors shadow-sm"
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span>{b('Web App খুলুন', 'Open Web App', lang)}</span>
          </a>

          <button
            type="button"
            onClick={onOpenShareModal}
            data-testid="dashboard-share-app-btn"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs font-bold whitespace-nowrap cursor-pointer transition-colors"
          >
            <Share2 className="w-4 h-4 shrink-0" />
            <span>{b('Share App / শেয়ার', 'Share App', lang)}</span>
          </button>
        </div>
      </div>
    </section>
  );
};
