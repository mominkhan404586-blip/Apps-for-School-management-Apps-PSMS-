import React, { useEffect, useRef, useState } from 'react';
import {
  BatteryCharging,
  Database,
  Globe,
  Layers,
  Monitor,
  RotateCw,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import type { Language, Role, Theme } from '../types';
import { b } from '../i18n/translations';
import {
  DEVICE_VIEW_SPECS,
  OFFICIAL_APP_ICON_URL,
  OFFICIAL_FAVICON_URL,
  OFFICIAL_MASKABLE_ICON_URL,
  buildEmbeddedPreviewUrl,
  computePreviewFrameScale,
  formatCurrentViewLabel,
  formatPlatformIndicator,
  resolveEffectiveDimensions,
  supportsOrientationToggle,
  type DeviceOrientation,
  type DeviceViewMode,
  type PlatformTarget,
} from '../utils/devicePreviewEngine';
import { OfficialAppLogo } from './OfficialAppLogo';
import { PWAInstallButton } from './PWAInstallBanner';

interface DevicePreviewControllerProps {
  viewMode: DeviceViewMode;
  onChangeViewMode: (mode: DeviceViewMode) => void;
  orientation: DeviceOrientation;
  onChangeOrientation: (orientation: DeviceOrientation) => void;
  platform: PlatformTarget;
  onChangePlatform: (platform: PlatformTarget) => void;
  lang: Language;
  theme: Theme;
  role: Role;
  activeTab: string;
}

export const DevicePreviewBar: React.FC<DevicePreviewControllerProps> = ({
  viewMode,
  onChangeViewMode,
  orientation,
  onChangeOrientation,
  platform,
  onChangePlatform,
  lang,
  theme,
  role,
  activeTab,
}) => {
  const [archModalOpen, setArchModalOpen] = useState(false);
  const [showSplashPreview, setShowSplashPreview] = useState(false);
  const [hostSize, setHostSize] = useState<{ w: number; h: number }>({
    w: typeof window !== 'undefined' ? window.innerWidth : 1440,
    h: typeof window !== 'undefined' ? window.innerHeight : 900,
  });

  useEffect(() => {
    const onResize = () => {
      setHostSize({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const effDims = resolveEffectiveDimensions(viewMode, orientation, hostSize.w, hostSize.h);
  const canRotate = supportsOrientationToggle(viewMode);
  const modes: {
    id: DeviceViewMode;
    labelBn: string;
    labelEn: string;
    icon: React.ReactNode;
  }[] = [
    { id: 'auto', labelBn: 'Auto', labelEn: 'Auto', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'mobile', labelBn: 'Mobile', labelEn: 'Mobile', icon: <Smartphone className="w-3.5 h-3.5" /> },
    { id: 'tablet', labelBn: 'Tablet', labelEn: 'Tablet', icon: <Tablet className="w-3.5 h-3.5" /> },
    { id: 'desktop', labelBn: 'Desktop', labelEn: 'Desktop', icon: <Monitor className="w-3.5 h-3.5" /> },
  ];

  return (
    <>
      <div
        role="region"
        aria-label={b('মাল্টি-প্ল্যাটফর্ম ও ডিভাইস প্রিভিউ নিয়ন্ত্রণ', 'Multi-Platform & Responsive Device Preview Controls', lang)}
        data-testid="device-preview-bar"
        className="md:sticky md:top-0 z-40 bg-slate-900 text-slate-100 border-b border-slate-800 px-3 lg:px-5 py-1.5 no-print"
      >
        <div className="max-w-[1680px] mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Left: Official App Logo + Current View Indicator */}
          <div className="flex items-center gap-2.5 min-w-0">
            <OfficialAppLogo sizeClass="w-7 h-7" roundedClass="rounded-md" />
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                data-testid="floating-platform-view-status"
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-100 whitespace-nowrap"
              >
                <span className={platform === 'android' ? 'text-emerald-400' : 'text-sky-400'}>
                  {platform === 'android' ? 'Platform: Android' : 'Platform: Web'}
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-emerald-300" data-testid="current-view-indicator">
                  View: {DEVICE_VIEW_SPECS[viewMode].labelEn}
                </span>
              </span>
              <span
                data-testid="current-platform-indicator"
                className="hidden sm:inline font-mono text-[11px] text-slate-300 tabular-nums"
              >
                {effDims.width}×{effDims.height}
                {canRotate ? (orientation === 'portrait' ? ' Portrait' : ' Landscape') : ''}
              </span>
            </div>
          </div>

          {/* Center: 4 View Mode Buttons + Orientation */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div
              role="group"
              aria-label={b('ভিউ মোড নির্বাচন', 'Select Preview View Mode', lang)}
              className="inline-flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700"
            >
              {modes.map((m) => {
                const active = viewMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    data-testid={`preview-mode-${m.id}`}
                    aria-pressed={active}
                    onClick={() => onChangeViewMode(m.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      active
                        ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-400/50'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/70'
                    }`}
                  >
                    {m.icon}
                    <span>{lang === 'bn' ? m.labelBn : m.labelEn}</span>
                  </button>
                );
              })}
            </div>

            {canRotate && (
              <div
                role="group"
                aria-label={b('স্ক্রিন ওরিয়েন্টেশন', 'Screen Orientation', lang)}
                className="inline-flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700"
              >
                <button
                  type="button"
                  data-testid="preview-orientation-portrait"
                  aria-pressed={orientation === 'portrait'}
                  onClick={() => onChangeOrientation('portrait')}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    orientation === 'portrait'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Portrait
                </button>
                <button
                  type="button"
                  data-testid="preview-orientation-landscape"
                  aria-pressed={orientation === 'landscape'}
                  onClick={() => onChangeOrientation('landscape')}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    orientation === 'landscape'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <RotateCw className="w-3 h-3" />
                  Landscape
                </button>
              </div>
            )}
          </div>

          {/* Right: Platform Switcher (Web vs Android App) + Architecture & Splash */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div
              role="group"
              aria-label={b('প্ল্যাটফর্ম নির্বাচন', 'Select Platform', lang)}
              className="inline-flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700"
            >
              <button
                type="button"
                data-testid="platform-toggle-web"
                aria-pressed={platform === 'web'}
                onClick={() => onChangePlatform('web')}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  platform === 'web'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Web App</span>
              </button>
              <button
                type="button"
                data-testid="platform-toggle-android"
                aria-pressed={platform === 'android'}
                onClick={() => onChangePlatform('android')}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  platform === 'android'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android App</span>
              </button>
            </div>

            <button
              type="button"
              data-testid="open-platform-modal-btn"
              onClick={() => setArchModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-200 whitespace-nowrap cursor-pointer transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">
                {b('অ্যাপ আইকন ও আর্কিটেকচার', 'App Icon & Platform', lang)}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Platform Architecture & Official App Icon Showcase Modal */}
      {archModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="platform-arch-modal-title"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <OfficialAppLogo sizeClass="w-10 h-10" roundedClass="rounded-xl" />
                <div>
                  <h3 id="platform-arch-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                    {b('অফিশিয়াল অ্যাপ আইকন ও একীভূত প্ল্যাটফর্ম সিস্টেম', 'Official App Icon & Unified Multi-Platform System', lang)}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {b('Android Mobile App + Web Browser Application — অভিন্ন Backend, Database ও Auth', 'Android Mobile App + Web Browser Application — Identical Backend, Database & Auth', lang)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setArchModalOpen(false)}
                aria-label="Close"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Official Icon Asset Showcase */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {b('অফিশিয়াল অ্যাপ আইকন ও লঞ্চার প্রিভিউ (অপরিবর্তিত মূল ডিজাইন)', 'Official App Icon & Launcher Preview (Original Design Preserved)', lang)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSplashPreview((s) => !s)}
                    className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
                  >
                    {showSplashPreview
                      ? b('আইকন গ্রিড দেখুন', 'Show Icon Grid', lang)
                      : b('Android Splash Screen দেখুন', 'Preview Android Splash', lang)}
                  </button>
                </div>

                {showSplashPreview ? (
                  <div className="rounded-2xl bg-white border border-slate-200 py-10 px-6 flex flex-col items-center justify-center gap-4 shadow-inner">
                    <img
                      src={OFFICIAL_APP_ICON_URL}
                      alt="Android Splash Screen Official Logo"
                      className="w-28 h-28 rounded-3xl object-contain shadow-lg"
                    />
                    <div className="text-center">
                      <div className="text-base font-extrabold text-[#0A2463]">School Management System</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">PSMS Bangladesh · Android App Launch Splash</div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-3 flex flex-col items-center gap-2 text-center">
                      <img src={OFFICIAL_APP_ICON_URL} alt="Android Launcher" className="w-14 h-14 rounded-2xl object-contain bg-white shadow-sm" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Android Launcher</span>
                      <span className="text-[10px] text-slate-500 font-mono">mdpi–xxxhdpi</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-3 flex flex-col items-center gap-2 text-center">
                      <img src={OFFICIAL_MASKABLE_ICON_URL} alt="Android Adaptive Circle" className="w-14 h-14 rounded-full object-cover bg-white border border-slate-200 shadow-sm" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Round / Adaptive</span>
                      <span className="text-[10px] text-slate-500 font-mono">Safe-Zone 512px</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-3 flex flex-col items-center gap-2 text-center">
                      <img src="/apple-touch-icon.png" alt="Web App Icon" className="w-14 h-14 rounded-xl object-contain bg-white shadow-sm" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Web App Icon</span>
                      <span className="text-[10px] text-slate-500 font-mono">192px & 512px</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-3 flex flex-col items-center gap-2 text-center">
                      <div className="h-14 flex items-center justify-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xs">
                          <img src={OFFICIAL_FAVICON_URL} alt="Browser Favicon" className="w-5 h-5 object-contain" />
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">PSMS</span>
                        </div>
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Browser Favicon</span>
                      <span className="text-[10px] text-slate-500 font-mono">32px / 64px PNG</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Unified Shared Architecture Diagram */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {b('একই সিস্টেম আর্কিটেকচার (Android App + Web App)', 'Unified System Architecture (Android App + Web App)', lang)}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={`rounded-xl border p-3.5 space-y-1.5 ${platform === 'android' ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-700'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-emerald-600" />
                        Android Mobile App
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300">APK / AAB / WebAPK</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      {b('ফোন স্ক্রিন, বটম নেভিগেশন ও Capacitor নেটিভ Gradle প্রজেক্ট সহ বিল্ডের জন্য প্রস্তুত।', 'Touch-native Android interface with Gradle project (`npm run apk:debug` / `release`).', lang)}
                    </p>
                  </div>
                  <div className={`rounded-xl border p-3.5 space-y-1.5 ${platform === 'web' ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/30' : 'border-slate-200 dark:border-slate-700'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-sky-600" />
                        Web Browser Application
                      </span>
                      <span className="text-[10px] font-mono text-sky-700 dark:text-sky-300">Chrome / Edge / Firefox</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      {b('ডেস্কটপ, ট্যাবলেট ও মোবাইল ব্রাউজারে পূর্ণাঙ্গ রেসপন্সিভ PWA সাপোর্ট।', 'Responsive web workspace across Chrome, Edge, Firefox & Safari with PWA offline support.', lang)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-center">
                    <Server className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                    <div className="font-bold text-slate-800 dark:text-slate-200">Same Backend</div>
                    <div className="text-[10px] text-slate-500 font-mono">Express API :3000</div>
                  </div>
                  <div className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-center">
                    <Database className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                    <div className="font-bold text-slate-800 dark:text-slate-200">Same Database</div>
                    <div className="text-[10px] text-slate-500 font-mono">psms-shared-db.json</div>
                  </div>
                  <div className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-center">
                    <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-violet-600" />
                    <div className="font-bold text-slate-800 dark:text-slate-200">Same Auth</div>
                    <div className="text-[10px] text-slate-500 font-mono">5 Role RBAC</div>
                  </div>
                  <div className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-center">
                    <Users className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                    <div className="font-bold text-slate-800 dark:text-slate-200">Same Data</div>
                    <div className="text-[10px] text-slate-500 font-mono">{role} · {activeTab}</div>
                  </div>
                </div>
              </div>

              <PWAInstallButton lang={lang} variant="card" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface DevicePreviewFrameStageProps {
  viewMode: DeviceViewMode;
  orientation: DeviceOrientation;
  platform: PlatformTarget;
  lang: Language;
  theme: Theme;
  role: Role;
  activeTab: string;
  onExitToAuto: () => void;
  onSyncFromEmbed?: (patch: {
    role?: Role;
    tab?: string;
    lang?: Language;
    theme?: Theme;
    platform?: PlatformTarget;
  }) => void;
}

export const DevicePreviewFrameStage: React.FC<DevicePreviewFrameStageProps> = ({
  viewMode,
  orientation,
  platform,
  lang,
  theme,
  role,
  activeTab,
  onExitToAuto,
  onSyncFromEmbed,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastFromEmbedSigRef = useRef<string>('');
  const onSyncFromEmbedRef = useRef(onSyncFromEmbed);
  onSyncFromEmbedRef.current = onSyncFromEmbed;
  const [boxSize, setBoxSize] = useState<{ w: number; h: number }>({ w: 1280, h: 780 });

  // Capture initial embed params so switching portrait/landscape/mode doesn't reload needlessly,
  // while role/tab/platform/theme updates also postMessage cleanly.
  const [initialSrc] = useState(() =>
    buildEmbeddedPreviewUrl(
      typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '/',
      { platform, role, tab: activeTab, lang, theme, viewMode }
    )
  );

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setBoxSize({ w: rect.width, h: Math.max(520, window.innerHeight - rect.top - 24) });
      } else {
        setBoxSize({ w: window.innerWidth - 32, h: Math.max(520, window.innerHeight - 120) });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [viewMode, orientation]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (iframeRef.current?.contentWindow && event.source !== iframeRef.current.contentWindow) {
        return;
      }
      const data = event.data as {
        type?: string;
        role?: Role;
        tab?: string;
        lang?: Language;
        theme?: Theme;
        platform?: PlatformTarget;
      } | null;
      if (!data || data.type !== 'PSMS_EMBED_STATE_CHANGE') return;
      lastFromEmbedSigRef.current = JSON.stringify({
        platform: data.platform,
        lang: data.lang,
        theme: data.theme,
        role: data.role,
        tab: data.tab,
      });
      onSyncFromEmbedRef.current?.({
        role: data.role,
        tab: data.tab,
        lang: data.lang,
        theme: data.theme,
        platform: data.platform,
      });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    const sig = JSON.stringify({ platform, lang, theme, role, tab: activeTab });
    if (lastFromEmbedSigRef.current === sig) {
      lastFromEmbedSigRef.current = '';
      // Still ensure viewMode updates reach the iframe if viewMode toggled
    }
    if (iframeRef.current?.contentWindow && typeof window !== 'undefined') {
      iframeRef.current.contentWindow.postMessage(
        { type: 'PSMS_PREVIEW_SYNC', platform, lang, theme, role, tab: activeTab, viewMode },
        window.location.origin
      );
    }
  }, [platform, lang, theme, role, activeTab, viewMode]);

  const dims = resolveEffectiveDimensions(viewMode, orientation, boxSize.w, boxSize.h);
  const scale = computePreviewFrameScale(boxSize.w, boxSize.h - 40, dims.width, dims.height, 28);
  const spec = DEVICE_VIEW_SPECS[viewMode];

  const outerBezelW = Math.round(dims.width * scale);
  const outerBezelH = Math.round(dims.height * scale);
  const isDesktopFrame = viewMode === 'desktop';

  return (
    <div
      ref={containerRef}
      data-testid="device-preview-stage"
      className="flex-1 bg-slate-100/90 dark:bg-slate-950 py-3 px-3 flex flex-col items-center justify-start gap-2.5 overflow-x-hidden"
    >
      {/* Compact View Context Strip Above Preview Canvas */}
      <div className="w-full max-w-5xl rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-900 dark:text-white">
            {formatPlatformIndicator(platform, lang)}
          </span>
          <span className="text-slate-400">·</span>
          <span className="font-bold text-emerald-700 dark:text-emerald-400">
            {formatCurrentViewLabel(viewMode, lang)}
          </span>
          <span className="text-slate-400">·</span>
          <span className="font-mono text-slate-600 dark:text-slate-300 tabular-nums">
            {dims.width}×{dims.height}px ({Math.round(scale * 100)}%)
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-slate-500 dark:text-slate-400 hidden md:inline">
            {b(spec.layoutSummaryBn, spec.layoutSummaryEn, lang)}
          </span>
          <button
            type="button"
            onClick={onExitToAuto}
            className="px-2.5 py-1 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold cursor-pointer hover:opacity-90 transition-opacity"
          >
            {b('Auto (স্বাভাবিক)', 'Auto (Full)', lang)}
          </button>
        </div>
      </div>

      {/* Viewport Frame: Clean Standard Container for Desktop, Subtle Slim Frame for Mobile/Tablet */}
      <div className="flex items-center justify-center w-full">
        <div
          data-testid={`device-frame-${viewMode}`}
          className={
            isDesktopFrame
              ? 'rounded-lg border border-slate-300 dark:border-slate-700 shadow-lg overflow-hidden bg-white dark:bg-slate-950'
              : `rounded-2xl border-2 shadow-xl overflow-hidden bg-white dark:bg-slate-950 ${
                  platform === 'android'
                    ? 'border-slate-400 dark:border-slate-600 ring-1 ring-emerald-500/20'
                    : 'border-slate-300 dark:border-slate-700 ring-1 ring-sky-500/20'
                }`
          }
        >
          {/* Subtle Slim Platform Strip (Hidden on Clean Desktop Web Preview) */}
          {!isDesktopFrame && platform === 'android' && (
            <div className="h-6 px-3.5 bg-slate-900 text-slate-200 flex items-center justify-between text-[10px] font-medium select-none">
              <div className="flex items-center gap-1.5">
                <img src={OFFICIAL_APP_ICON_URL} alt="" className="w-3.5 h-3.5 rounded-xs object-contain bg-white" />
                <span className="font-semibold">PSMS Android</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Wifi className="w-3 h-3" />
                <BatteryCharging className="w-3 h-3 text-emerald-400" />
              </div>
            </div>
          )}
          {!isDesktopFrame && platform !== 'android' && (
            <div className="h-6 px-3 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2 text-[10px] select-none">
              <div className="flex items-center gap-1 shrink-0">
                <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <img src={OFFICIAL_FAVICON_URL} alt="" className="w-3 h-3 object-contain shrink-0" />
                <span className="truncate font-mono text-[10px]">psms.gov.bd</span>
              </div>
              <span className="text-[9px] text-slate-400 shrink-0">{viewMode}</span>
            </div>
          )}

          {/* Real Responsive Viewport Canvas (Exact CSS Pixel Width inside iframe) */}
          <div
            style={{
              width: `${outerBezelW}px`,
              height: `${outerBezelH}px`,
              overflow: 'hidden',
              position: 'relative',
            }}
            className="bg-white dark:bg-slate-950"
          >
            <iframe
              ref={iframeRef}
              src={initialSrc}
              title={`PSMS ${viewMode} ${orientation} preview`}
              data-testid="device-preview-iframe"
              style={{
                width: `${dims.width}px`,
                height: `${dims.height}px`,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                border: 0,
              }}
            />
          </div>

          {viewMode === 'mobile' && platform === 'android' && (
            <div className="h-3 bg-slate-900 flex items-center justify-center">
              <div className="w-16 h-0.5 rounded-full bg-slate-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ResponsivePreviewPanel = DevicePreviewBar;
export const DevicePreviewManager = DevicePreviewFrameStage;
