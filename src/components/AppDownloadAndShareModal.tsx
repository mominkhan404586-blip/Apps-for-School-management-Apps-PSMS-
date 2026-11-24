import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Mail,
  MessageCircle,
  Send,
  Share2,
  Smartphone,
  X,
} from 'lucide-react';
import type { Language } from '../types';
import { b } from '../i18n/translations';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { InstallInstructions } from './InstallInstructions';
import {
  VERIFIED_GITHUB_APK_RELEASE_URL,
  VERIFIED_PUBLISHED_WEB_APP_URL,
  buildSocialShareUrls,
  resolveAndroidApkDownloadUrl,
  resolveApiUrl,
  resolveLiveWebAppUrl,
} from '../utils/deploymentConfig';

export interface AppDownloadAndShareModalProps {
  open: boolean;
  lang: Language;
  onClose: () => void;
}

export const AppDownloadAndShareModal: React.FC<AppDownloadAndShareModalProps> = ({
  open,
  lang,
  onClose,
}) => {
  const { canInstallNatively, isInstalled, isIOS, isAndroid, promptInstall } = usePWAInstall();
  const [webUrl, setWebUrl] = useState<string>(
    () => resolveLiveWebAppUrl() || VERIFIED_PUBLISHED_WEB_APP_URL
  );
  const [apkUrl, setApkUrl] = useState<string>(
    () => resolveAndroidApkDownloadUrl() || VERIFIED_GITHUB_APK_RELEASE_URL
  );
  const [apkReleaseReady, setApkReleaseReady] = useState<boolean>(true);
  const [apkActionsUrl, setApkActionsUrl] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<'web' | 'apk' | 'invite' | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
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
        // Keep verified default URLs offline
      });
    return () => {
      mounted = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const shareLinks = buildSocialShareUrls(webUrl, apkUrl, lang);
  const supportsWebShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copyToClipboard = async (text: string, key: 'web' | 'apk' | 'invite', feedbackText: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback copy via textarea
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.className = 'fixed -left-[9999px] opacity-0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        // ignore
      }
      document.body.removeChild(ta);
    }
    setCopiedKey(key);
    setShareFeedback(feedbackText);
    window.setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2200);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: b(
            'PSMS Bangladesh — স্কুল ম্যানেজমেন্ট সিস্টেম',
            'PSMS Bangladesh — School Management System',
            lang
          ),
          text: shareLinks.message,
          url: webUrl,
        });
        setShareFeedback(b('শেয়ার সম্পন্ন হয়েছে।', 'Shared successfully.', lang));
        return;
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') {
          return;
        }
      }
    }
    await copyToClipboard(
      shareLinks.message,
      'invite',
      b('মেসেজ ও উভয় লিংক কপি হয়েছে — এখন যেকোনো বন্ধুকে পেস্ট করে পাঠান।', 'Invite message & both links copied — paste anywhere to share.', lang)
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-download-share-title"
      data-testid="app-download-share-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-blue-700 text-white flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="app-download-share-title" className="text-base sm:text-lg font-extrabold leading-tight">
                {b('অ্যাপস ডাউনলোড ও শেয়ার করুন', 'Download Apps & Share with Friends', lang)}
              </h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                {b(
                  'কম্পিউটার ওয়েব ব্রাউজার, অ্যান্ড্রয়েড APK ফাইল ডাউনলোড এবং বন্ধুদের সাথে শেয়ার',
                  'Web browsing link, Android APK file download & quick sharing for every user',
                  lang
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-testid="close-app-download-share-modal"
            className="p-1.5 rounded-lg text-white/85 hover:text-white hover:bg-white/15 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {shareFeedback && (
            <div
              role="status"
              className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>{shareFeedback}</span>
            </div>
          )}

          {/* 1. Web Browsing & APK Download Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Web Browsing Link */}
            <div
              data-testid="modal-web-browsing-card"
              className="rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 flex flex-col justify-between gap-3"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {b('ওয়েব ব্রাউজিং লিংক (Web Link)', 'Web Browsing Link', lang)}
                    </h3>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300">
                      {b('কম্পিউটার, ল্যাপটপ ও যেকোনো ব্রাউজারের জন্য', 'For Computer, Laptop & Mobile Browsers', lang)}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-2 text-[11px] font-mono text-slate-700 dark:text-slate-300 break-all">
                  {webUrl}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <a
                  href={webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="modal-open-web-browsing-btn"
                  className="w-full h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span>{b('ওয়েব ব্রাউজারে খুলুন', 'Open in Web Browser', lang)}</span>
                </a>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="modal-copy-web-link-btn"
                    onClick={() =>
                      copyToClipboard(
                        webUrl,
                        'web',
                        b('ওয়েব ব্রাউজিং লিংক কপি করা হয়েছে।', 'Web browsing link copied.', lang)
                      )
                    }
                    className="flex-1 h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedKey === 'web' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'web' ? b('কপি হয়েছে', 'Copied', lang) : b('ওয়েব লিংক কপি', 'Copy Web Link', lang)}</span>
                  </button>
                  {canInstallNatively && !isInstalled && (
                    <button
                      type="button"
                      onClick={() => promptInstall()}
                      className="h-9 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{b('ইনস্টল', 'Install', lang)}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Android APK Download Link */}
            <div
              data-testid="modal-apk-download-card"
              className="rounded-xl border border-blue-200 dark:border-blue-800/70 bg-blue-50/50 dark:bg-blue-950/20 p-4 flex flex-col justify-between gap-3"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {b('APK ফাইল ডাউনলোড (Android APK)', 'APK File Download Link', lang)}
                    </h3>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300">
                      {b('কম্পিউটার বা অ্যান্ড্রয়েড ফোনে সরাসরি .apk ডাউনলোড', 'Download psms-android.apk on PC or Android', lang)}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-2 text-[11px] font-mono text-slate-700 dark:text-slate-300 break-all">
                  {apkUrl}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {apkReleaseReady ? (
                  <a
                    href={apkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    data-testid="modal-direct-apk-download-btn"
                    className="w-full h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span>{b('APK ফাইল ডাউনলোড করুন', 'Download APK File', lang)}</span>
                  </a>
                ) : (
                  <a
                    href={apkActionsUrl || apkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="modal-pending-apk-actions-btn"
                    className="w-full h-9 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>{b('GitHub Actions-এ APK বিল্ড দেখুন', 'Open APK Build Status', lang)}</span>
                  </a>
                )}

                <button
                  type="button"
                  data-testid="modal-copy-apk-link-btn"
                  onClick={() =>
                    copyToClipboard(
                      apkUrl,
                      'apk',
                      b('APK ফাইল ডাউনলোড লিংক কপি করা হয়েছে।', 'APK download link copied.', lang)
                    )
                  }
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === 'apk' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'apk' ? b('কপি হয়েছে', 'Copied', lang) : b('APK লিংক কপি করুন', 'Copy APK Link', lang)}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. Share with Friends Section */}
          <div
            data-testid="modal-share-friends-section"
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {b('বন্ধুদের কাছে শেয়ার করুন (Share)', 'Share with Friends', lang)}
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {b(
                      'সহকর্মী, শিক্ষক, অভিভাবক ও বন্ধুদের কাছে Web ও APK লিংক একসাথে পাঠান',
                      'Send both Web Browsing Link and Android APK Download Link to friends & colleagues',
                      lang
                    )}
                  </p>
                </div>
              </div>

              {supportsWebShare ? (
                <button
                  type="button"
                  data-testid="modal-native-share-btn"
                  onClick={handleNativeShare}
                  className="h-9 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{b('Share App / শেয়ার করুন', 'Share App', lang)}</span>
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="modal-copy-link-fallback-btn"
                  onClick={() =>
                    copyToClipboard(
                      shareLinks.message,
                      'invite',
                      b('ওয়েব ও APK লিংক কপি করা হয়েছে — বন্ধুদের কাছে পেস্ট করে পাঠান।', 'Links copied to clipboard — paste anywhere to share.', lang)
                    )
                  }
                  className="h-9 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                >
                  {copiedKey === 'invite' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'invite' ? b('কপি হয়েছে ✓', 'Copied ✓', lang) : b('Copy Link (লিংক কপি)', 'Copy Link', lang)}</span>
                </button>
              )}
            </div>

            {/* Social / Quick Share Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <a
                href={shareLinks.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="share-whatsapp-link"
                className="h-9 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                <span>WhatsApp</span>
              </a>

              <a
                href={shareLinks.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="share-telegram-link"
                className="h-9 px-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>Telegram</span>
              </a>

              <a
                href={shareLinks.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="share-facebook-link"
                className="h-9 px-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span>Facebook</span>
              </a>

              <a
                href={shareLinks.emailUrl}
                data-testid="share-email-link"
                className="h-9 px-2.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span>Email</span>
              </a>

              <button
                type="button"
                data-testid="share-copy-invite-btn"
                onClick={() =>
                  copyToClipboard(
                    shareLinks.message,
                    'invite',
                    b('Web + APK শেয়ার মেসেজ কপি করা হয়েছে।', 'Full share message & links copied.', lang)
                  )
                }
                className="col-span-2 sm:col-span-1 h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedKey === 'invite' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'invite' ? b('কপি ✓', 'Copied', lang) : b('সব কপি', 'Copy All', lang)}</span>
              </button>
            </div>
          </div>

          {/* 3. Device-Aware Install Instructions (iOS / Android / Desktop) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden">
            <button
              type="button"
              data-testid="modal-install-instructions-toggle"
              onClick={() => setShowInstallGuide((prev) => !prev)}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
            >
              <span>
                {b('মোবাইল ও কম্পিউটারে অ্যাপ ইনস্টল নির্দেশিকা (iOS / Android / PWA)', 'How to Install App on Phone & PC (iOS / Android / PWA)', lang)}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {showInstallGuide ? b('লুকান', 'Hide', lang) : b('দেখুন', 'Show', lang)}
              </span>
            </button>
            {showInstallGuide && (
              <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800">
                <InstallInstructions
                  lang={lang}
                  isIOS={isIOS}
                  isAndroid={isAndroid}
                  canInstallNatively={canInstallNatively}
                  onTriggerNativeInstall={promptInstall}
                  androidApkUrl={apkUrl}
                  apkReleaseReady={apkReleaseReady}
                  apkActionsUrl={apkActionsUrl}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
