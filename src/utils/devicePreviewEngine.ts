import { detectRuntimeEnvironment } from './deploymentConfig';

export type DeviceViewMode = 'auto' | 'mobile' | 'tablet' | 'desktop';
export type DeviceOrientation = 'portrait' | 'landscape';
export type PlatformTarget = 'web' | 'android';

export const OFFICIAL_APP_ICON_URL = '/official-app-icon.png';
export const OFFICIAL_MASKABLE_ICON_URL = '/pwa-maskable-512x512.png';
export const OFFICIAL_FAVICON_URL = '/favicon.png';

export interface DeviceViewportSpec {
  mode: DeviceViewMode;
  labelBn: string;
  labelEn: string;
  baseWidth: number;
  baseHeight: number;
  supportsOrientation: boolean;
  layoutSummaryBn: string;
  layoutSummaryEn: string;
}

export const DEVICE_VIEW_SPECS: Record<DeviceViewMode, DeviceViewportSpec> = {
  auto: {
    mode: 'auto',
    labelBn: 'অটো (Auto)',
    labelEn: 'Auto',
    baseWidth: 0,
    baseHeight: 0,
    supportsOrientation: false,
    layoutSummaryBn: 'ডিভাইসের স্ক্রিন অনুযায়ী স্বয়ংক্রিয় রেসপন্সিভ লেআউট',
    layoutSummaryEn: 'Automatically adapts to current host screen dimensions',
  },
  mobile: {
    mode: 'mobile',
    labelBn: 'মোবাইল (Mobile)',
    labelEn: 'Mobile',
    baseWidth: 390,
    baseHeight: 844,
    supportsOrientation: true,
    layoutSummaryBn: 'অ্যান্ড্রয়েড স্মার্টফোন লেআউট · বটম নেভিগেশন · টাচ কার্ড',
    layoutSummaryEn: 'Android Phone layout · Bottom Navigation · Single-column touch cards',
  },
  tablet: {
    mode: 'tablet',
    labelBn: 'ট্যাবলেট (Tablet)',
    labelEn: 'Tablet',
    baseWidth: 768,
    baseHeight: 1024,
    supportsOrientation: true,
    layoutSummaryBn: 'ট্যাবলেট লেআউট · ২-কলাম গ্রিড · স্লাইড ড্রয়ার ও রোল বার',
    layoutSummaryEn: 'Tablet layout · 2-column grids · Slide drawer & top role bar',
  },
  desktop: {
    mode: 'desktop',
    labelBn: 'ডেস্কটপ (Desktop)',
    labelEn: 'Desktop',
    baseWidth: 1440,
    baseHeight: 900,
    supportsOrientation: false,
    layoutSummaryBn: 'কম্পিউটার/ল্যাপটপ প্রশস্ত লেআউট · পূর্ণাঙ্গ সাইডবার ও টেবিল',
    layoutSummaryEn: 'Wide desktop workspace · Persistent Sidebar · Multi-column grids',
  },
};

export function supportsOrientationToggle(mode: DeviceViewMode): boolean {
  return mode === 'mobile' || mode === 'tablet';
}

export function resolveEffectiveDimensions(
  mode: DeviceViewMode,
  orientation: DeviceOrientation,
  hostWidth: number,
  hostHeight: number
): { width: number; height: number } {
  if (mode === 'auto') {
    return {
      width: Math.max(320, Math.round(hostWidth || 1440)),
      height: Math.max(480, Math.round(hostHeight || 900)),
    };
  }
  const spec = DEVICE_VIEW_SPECS[mode];
  if (mode === 'desktop') {
    return { width: spec.baseWidth, height: spec.baseHeight };
  }
  if (orientation === 'landscape') {
    return { width: spec.baseHeight, height: spec.baseWidth };
  }
  return { width: spec.baseWidth, height: spec.baseHeight };
}

export function computePreviewFrameScale(
  containerWidth: number,
  containerHeight: number,
  targetWidth: number,
  targetHeight: number,
  paddingPx = 32
): number {
  if (targetWidth <= 0 || targetHeight <= 0) return 1;
  const availW = Math.max(240, containerWidth - paddingPx);
  const availH = Math.max(240, containerHeight - paddingPx);
  const scaleW = availW / targetWidth;
  const scaleH = availH / targetHeight;
  const scale = Math.min(1, scaleW, scaleH);
  return Math.max(0.25, Math.round(scale * 1000) / 1000);
}

export function detectRuntimePlatform(
  userAgent: string,
  isCapacitorNative: boolean
): PlatformTarget {
  if (isCapacitorNative) return 'android';
  if (/android/i.test(userAgent)) return 'android';
  return 'web';
}

export function formatCurrentViewLabel(mode: DeviceViewMode, lang: 'bn' | 'en'): string {
  const modeEnglish: Record<DeviceViewMode, string> = {
    auto: 'Auto',
    mobile: 'Mobile',
    tablet: 'Tablet',
    desktop: 'Desktop',
  };
  return lang === 'bn'
    ? `Current View: ${modeEnglish[mode]}`
    : `Current View: ${modeEnglish[mode]}`;
}

export function formatPlatformIndicator(platform: PlatformTarget, lang: 'bn' | 'en'): string {
  if (platform === 'android') {
    return lang === 'bn' ? 'Platform: Android App' : 'Platform: Android';
  }
  return lang === 'bn' ? 'Platform: Web Browser' : 'Platform: Web';
}

export const PREVIEW_VIEW_MODE_STORAGE_KEY = 'psms_device_preview_mode_v1';
export const PREVIEW_ORIENTATION_STORAGE_KEY = 'psms_device_preview_orientation_v1';

export function parseDeviceViewMode(value: string | null | undefined): DeviceViewMode {
  if (value === 'mobile' || value === 'tablet' || value === 'desktop' || value === 'auto') {
    return value;
  }
  return 'auto';
}

export function parseDeviceOrientation(value: string | null | undefined): DeviceOrientation {
  return value === 'landscape' ? 'landscape' : 'portrait';
}

export function resolveInitialPreviewState(
  search: string,
  savedMode: string | null | undefined,
  savedOrientation: string | null | undefined
): { viewMode: DeviceViewMode; orientation: DeviceOrientation } {
  const params = new URLSearchParams(search || '');
  const isEmbedded = params.get('previewEmbed') === '1';
  if (isEmbedded) {
    return {
      viewMode: parseDeviceViewMode(params.get('viewMode')),
      orientation: parseDeviceOrientation(params.get('orientation')),
    };
  }
  return {
    viewMode: parseDeviceViewMode(savedMode),
    orientation: parseDeviceOrientation(savedOrientation),
  };
}

export interface EmbeddedPreviewUrlParams {
  platform: PlatformTarget;
  role: string;
  tab: string;
  lang: 'bn' | 'en';
  theme: 'light' | 'dark';
  viewMode?: DeviceViewMode;
}

export function buildEmbeddedPreviewUrl(
  originAndPath: string,
  params: EmbeddedPreviewUrlParams
): string {
  const cleanBase = originAndPath.split('?')[0] || '/';
  const search = new URLSearchParams();
  search.set('previewEmbed', '1');
  search.set('platform', params.platform);
  search.set('role', params.role);
  search.set('tab', params.tab);
  search.set('lang', params.lang);
  search.set('theme', params.theme);
  if (params.viewMode) {
    search.set('viewMode', params.viewMode);
  }
  return `${cleanBase}?${search.toString()}`;
}

export type DetectedDeviceCategory = 'mobile' | 'tablet' | 'desktop' | 'auto';

export function detectAutomaticDeviceCategory(viewportWidth: number): DetectedDeviceCategory {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) {
    return 'auto';
  }
  if (viewportWidth < 768) {
    return 'mobile';
  }
  if (viewportWidth < 1024) {
    return 'tablet';
  }
  return 'desktop';
}

export interface DeveloperPreviewVisibilityInput {
  isDevBuild: boolean;
  isProdBuild?: boolean;
  buildMode?: string;
  hostname: string;
  search: string;
  isCapacitorNative: boolean;
  isEmbeddedPreview: boolean;
}

export function shouldShowDeveloperDevicePreviewControls(
  input: DeveloperPreviewVisibilityInput
): boolean {
  if (input.isEmbeddedPreview) return false;
  if (input.isCapacitorNative) return false;

  const params = new URLSearchParams(input.search || '');
  if (params.get('endUserPreview') === '1' || params.get('publishedPreview') === '1') {
    return false;
  }

  return (
    detectRuntimeEnvironment({
      isDevBuild: input.isDevBuild,
      isProdBuild: input.isProdBuild,
      buildMode: input.buildMode,
      hostname: input.hostname,
      isCapacitorNative: input.isCapacitorNative,
    }) === 'development'
  );
}

export function resolveEffectiveViewMode(
  requestedMode: DeviceViewMode,
  showDeveloperControls: boolean,
  isEmbeddedPreview: boolean
): DeviceViewMode {
  if (isEmbeddedPreview || showDeveloperControls) {
    return requestedMode;
  }
  return 'auto';
}
