export const WEB_HOSTING_PROJECT_SLUG = 'school-management-system-sms';
export const ANDROID_APP_PACKAGE_ID = 'bd.gov.dpe.psms';
export const ANDROID_APP_VERSION = '2026.1.0';
export const VERIFIED_PUBLISHED_WEB_APP_URL =
  'https://school-management-system-sms-798667902569.asia-southeast1.run.app';
export const VERIFIED_SHARED_API_BASE_URL =
  'https://school-management-system-sms-798667902569.asia-southeast1.run.app';
export const VERIFIED_GITHUB_REPO_URL =
  'https://github.com/mominkhan404586-blip/Apps-for-School-management-Apps-PSMS-';
export const VERIFIED_GITHUB_APK_RELEASE_URL =
  'https://github.com/mominkhan404586-blip/Apps-for-School-management-Apps-PSMS-/releases/latest/download/psms-android.apk';

export type RuntimeEnvironmentMode = 'production' | 'development';

export interface EnvironmentDetectionInput {
  isProdBuild?: boolean;
  isDevBuild?: boolean;
  buildMode?: string;
  hostname?: string;
  isCapacitorNative?: boolean;
}

export interface DeploymentEnvironmentProfile {
  mode: RuntimeEnvironmentMode;
  isProduction: boolean;
  isDevelopment: boolean;
  showDevicePreviewControls: boolean;
  envOverrides: DeploymentLinksEnvOverrides;
}

export interface DeploymentLinksRecord {
  webAppUrl: string;
  androidApkUrl: string;
  githubRepoUrl: string;
  apiBaseUrl: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface DeploymentLinksEnvOverrides {
  webAppUrl?: string;
  androidApkUrl?: string;
  githubRepoUrl?: string;
  apiBaseUrl?: string;
}

export interface ResolvedDeploymentLinksState {
  projectSlug: string;
  packageId: string;
  versionName: string;
  apiBaseUrl: string;
  webApp: {
    url: string;
    published: boolean;
    statusEn: 'Live / Published' | 'Web App Not Published';
    statusBn: string;
  };
  androidApk: {
    url: string;
    available: boolean;
    statusEn: 'APK Available' | 'APK Not Available';
    statusBn: string;
  };
  githubRepo: {
    url: string;
    connected: boolean;
    statusEn: 'Connected' | 'GitHub Repository Not Connected';
    statusBn: string;
  };
  updatedAt?: string;
  updatedBy?: string;
}

export type DeploymentUrlKind = 'web' | 'apk' | 'github' | 'api';

const PLACEHOLDER_PATTERNS = [
  'MY_APP_URL',
  'MY_GEMINI_API_KEY',
  'example.com',
  'example.org',
  'your-app',
  'placeholder',
  'changeme',
];

const RETIRED_DEPLOYMENT_PATTERNS = [
  'school-management-nexus-bd.pages.dev',
  'mominkhan404586-blip/school-management-system',
];

export function isPlaceholderOrFakeUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((pat) => lower.includes(pat.toLowerCase()));
}

export function isRetiredDeploymentUrl(raw: string | undefined | null): boolean {
  const trimmed = (raw ?? '').trim().toLowerCase().replace(/\/+$/, '');
  if (!trimmed) return false;
  return RETIRED_DEPLOYMENT_PATTERNS.some((pat) => trimmed.includes(pat));
}

export function validateDeploymentUrl(
  raw: string | undefined | null,
  kind: DeploymentUrlKind
): { valid: boolean; normalized: string; errorEn?: string; errorBn?: string } {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return { valid: true, normalized: '' };
  }
  if (isPlaceholderOrFakeUrl(trimmed)) {
    return {
      valid: false,
      normalized: '',
      errorEn: 'Placeholder or fake URLs cannot be saved. Enter a real published URL.',
      errorBn: 'নকল বা প্লেসহোল্ডার URL গ্রহণযোগ্য নয়। প্রকৃত প্রকাশিত URL দিন।',
    };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      normalized: '',
      errorEn: 'Must be a valid URL starting with https://',
      errorBn: 'সঠিক URL দিন (https:// দিয়ে শুরু হতে হবে)।',
    };
  }

  const isLocalHost =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '10.0.2.2';

  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLocalHost)) {
    return {
      valid: false,
      normalized: '',
      errorEn: 'Only secure https:// URLs are allowed for published deployments.',
      errorBn: 'প্রকাশিত ডিপ্লয়মেন্টের জন্য শুধুমাত্র নিরাপদ https:// URL ব্যবহারযোগ্য।',
    };
  }

  if (kind === 'github') {
    const ghHost = parsed.hostname.toLowerCase();
    const parts = parsed.pathname.split('/').filter(Boolean);
    if ((ghHost !== 'github.com' && ghHost !== 'www.github.com') || parts.length < 2) {
      return {
        valid: false,
        normalized: '',
        errorEn: 'GitHub Repository URL must follow https://github.com/<owner>/<repo>.',
        errorBn: 'GitHub Repository URL অবশ্যই https://github.com/<owner>/<repo> হতে হবে।',
      };
    }
  }

  const normalized = parsed.toString().replace(/\/+$/, '');
  return { valid: true, normalized };
}

export function createEmptyDeploymentLinksRecord(): DeploymentLinksRecord {
  return {
    webAppUrl: '',
    androidApkUrl: '',
    githubRepoUrl: '',
    apiBaseUrl: '',
  };
}

export function createDefaultDeploymentLinksRecord(): DeploymentLinksRecord {
  return {
    webAppUrl: VERIFIED_PUBLISHED_WEB_APP_URL,
    androidApkUrl: VERIFIED_GITHUB_APK_RELEASE_URL,
    githubRepoUrl: VERIFIED_GITHUB_REPO_URL,
    apiBaseUrl: VERIFIED_SHARED_API_BASE_URL,
  };
}

export function readViteEnvDeploymentOverrides(): DeploymentLinksEnvOverrides {
  const envObj =
    (import.meta as unknown as { env?: Record<string, string | undefined> })?.env ?? {};
  return {
    webAppUrl: envObj.VITE_LIVE_WEB_APP_URL ?? '',
    androidApkUrl: envObj.VITE_ANDROID_APK_URL ?? '',
    githubRepoUrl: envObj.VITE_GITHUB_REPO_URL ?? '',
    apiBaseUrl: envObj.VITE_API_BASE_URL ?? '',
  };
}

export function detectRuntimeEnvironment(
  input: EnvironmentDetectionInput = {}
): RuntimeEnvironmentMode {
  if (input.isCapacitorNative) {
    return 'production';
  }

  const normalizedBuildMode = (input.buildMode ?? '').trim().toLowerCase();
  if (
    input.isProdBuild === true ||
    normalizedBuildMode === 'production' ||
    input.isDevBuild === false
  ) {
    return 'production';
  }

  const host = (input.hostname ?? '').trim().toLowerCase();
  if (host) {
    if (host.startsWith('ais-pre-')) {
      return 'production';
    }
    if (
      host.endsWith('.pages.dev') ||
      host.endsWith('.web.app') ||
      host.endsWith('.firebaseapp.com')
    ) {
      return 'production';
    }
    if (host.endsWith('.run.app') && !host.startsWith('ais-dev-')) {
      return 'production';
    }
    const isDevHost =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '[::1]' ||
      host.startsWith('ais-dev-');
    if (!isDevHost) {
      return 'production';
    }
  }

  if (input.isDevBuild === true || normalizedBuildMode === 'development') {
    return 'development';
  }

  const metaEnv = (
    import.meta as unknown as { env?: { DEV?: boolean; PROD?: boolean; MODE?: string } }
  )?.env;
  if (metaEnv?.PROD || metaEnv?.MODE === 'production') {
    return 'production';
  }
  if (metaEnv?.DEV || metaEnv?.MODE === 'development') {
    return 'development';
  }

  return 'production';
}

export function detectDeploymentEnvironment(
  input: EnvironmentDetectionInput = {},
  envOverrides: DeploymentLinksEnvOverrides = readViteEnvDeploymentOverrides()
): DeploymentEnvironmentProfile {
  const mode = detectRuntimeEnvironment(input);
  const isProduction = mode === 'production';
  return {
    mode,
    isProduction,
    isDevelopment: !isProduction,
    showDevicePreviewControls: !isProduction && !input.isCapacitorNative,
    envOverrides,
  };
}

function pickVerifiedUrl(
  primary: string | undefined,
  fallback: string | undefined,
  kind: DeploymentUrlKind
): string {
  const p = validateDeploymentUrl(primary, kind);
  if (p.valid && p.normalized && !isRetiredDeploymentUrl(p.normalized)) {
    return p.normalized;
  }
  const f = validateDeploymentUrl(fallback, kind);
  if (f.valid && f.normalized && !isRetiredDeploymentUrl(f.normalized)) {
    return f.normalized;
  }
  return '';
}

export function resolveAndroidApkDownloadUrl(
  storedUrl?: string,
  envOverrides: DeploymentLinksEnvOverrides = readViteEnvDeploymentOverrides()
): string {
  return (
    pickVerifiedUrl(storedUrl, envOverrides.androidApkUrl, 'apk') ||
    VERIFIED_GITHUB_APK_RELEASE_URL
  );
}

export function resolveLiveWebAppUrl(
  storedUrl?: string,
  envOverrides: DeploymentLinksEnvOverrides = readViteEnvDeploymentOverrides()
): string {
  return (
    pickVerifiedUrl(storedUrl, envOverrides.webAppUrl, 'web') ||
    VERIFIED_PUBLISHED_WEB_APP_URL
  );
}

export function buildAppShareMessage(
  webUrl: string,
  apkUrl: string,
  lang: 'bn' | 'en' = 'bn'
): string {
  const safeWeb = webUrl.trim() || VERIFIED_PUBLISHED_WEB_APP_URL;
  const safeApk = apkUrl.trim() || VERIFIED_GITHUB_APK_RELEASE_URL;
  if (lang === 'bn') {
    return [
      'প্রাথমিক বিদ্যালয় ব্যবস্থাপনা পদ্ধতি (PSMS Bangladesh)',
      'কম্পিউটার ব্রাউজার ও অ্যান্ড্রয়েড মোবাইল অ্যাপ — একসাথে সব সেবা:',
      '',
      `🌐 ওয়েব ব্রাউজার লিংক (Web App): ${safeWeb}`,
      `📱 Android APK ডাউনলোড লিংক: ${safeApk}`,
    ].join('\n');
  }
  return [
    'Primary School Management System (PSMS Bangladesh)',
    'Access via Computer Web Browser or Android Mobile App:',
    '',
    `🌐 Web Browsing Link: ${safeWeb}`,
    `📱 Android APK Download: ${safeApk}`,
  ].join('\n');
}

export interface AppSocialShareLinks {
  message: string;
  whatsappUrl: string;
  telegramUrl: string;
  facebookUrl: string;
  emailUrl: string;
}

export function buildSocialShareUrls(
  webUrl: string,
  apkUrl: string,
  lang: 'bn' | 'en' = 'bn'
): AppSocialShareLinks {
  const safeWeb = webUrl.trim() || VERIFIED_PUBLISHED_WEB_APP_URL;
  const safeApk = apkUrl.trim() || VERIFIED_GITHUB_APK_RELEASE_URL;
  const message = buildAppShareMessage(safeWeb, safeApk, lang);
  const subject =
    lang === 'bn'
      ? 'PSMS Bangladesh — Web ও Android APK ডাউনলোড লিংক'
      : 'PSMS Bangladesh — Web App & Android APK Download';

  return {
    message,
    whatsappUrl: `https://wa.me/?text=${encodeURIComponent(message)}`,
    telegramUrl: `https://t.me/share/url?url=${encodeURIComponent(safeWeb)}&text=${encodeURIComponent(message)}`,
    facebookUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(safeWeb)}`,
    emailUrl: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`,
  };
}

export function resolveDeploymentLinksState(
  stored?: Partial<DeploymentLinksRecord> | null,
  envOverrides?: DeploymentLinksEnvOverrides
): ResolvedDeploymentLinksState {
  const webUrl = pickVerifiedUrl(stored?.webAppUrl, envOverrides?.webAppUrl, 'web');
  const apkUrl = pickVerifiedUrl(stored?.androidApkUrl, envOverrides?.androidApkUrl, 'apk');
  const ghUrl = pickVerifiedUrl(stored?.githubRepoUrl, envOverrides?.githubRepoUrl, 'github');
  const apiUrl = pickVerifiedUrl(stored?.apiBaseUrl, envOverrides?.apiBaseUrl, 'api');

  const webPublished = webUrl.length > 0;
  const apkAvailable = apkUrl.length > 0;
  const ghConnected = ghUrl.length > 0;

  return {
    projectSlug: WEB_HOSTING_PROJECT_SLUG,
    packageId: ANDROID_APP_PACKAGE_ID,
    versionName: ANDROID_APP_VERSION,
    apiBaseUrl: apiUrl,
    webApp: {
      url: webUrl,
      published: webPublished,
      statusEn: webPublished ? 'Live / Published' : 'Web App Not Published',
      statusBn: webPublished ? 'লাইভ প্রকাশিত (Live)' : 'Web App Not Published',
    },
    androidApk: {
      url: apkUrl,
      available: apkAvailable,
      statusEn: apkAvailable ? 'APK Available' : 'APK Not Available',
      statusBn: apkAvailable ? 'APK ডাউনলোডের জন্য প্রস্তুত' : 'APK Not Available',
    },
    githubRepo: {
      url: ghUrl,
      connected: ghConnected,
      statusEn: ghConnected ? 'Connected' : 'GitHub Repository Not Connected',
      statusBn: ghConnected ? 'সংযুক্ত (Connected)' : 'GitHub Repository Not Connected',
    },
    updatedAt: stored?.updatedAt,
    updatedBy: stored?.updatedBy,
  };
}

export function resolveApiUrl(apiPath: string, configuredBaseUrl?: string): string {
  const normalizedPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  if (configuredBaseUrl !== undefined) {
    const check = validateDeploymentUrl(configuredBaseUrl, 'api');
    if (check.valid && check.normalized) {
      return `${check.normalized}${normalizedPath}`;
    }
    return normalizedPath;
  }

  const isCapacitorNative =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
    );
  const isNativeProtocol =
    typeof window !== 'undefined' &&
    (window.location.protocol === 'capacitor:' || window.location.protocol === 'file:');

  if (!isCapacitorNative && !isNativeProtocol) {
    // Web browsers (localhost, AI Studio preview, Cloud Run) always call same-origin /api/*
    return normalizedPath;
  }

  const candidate =
    readViteEnvDeploymentOverrides().apiBaseUrl || VERIFIED_SHARED_API_BASE_URL;
  const check = validateDeploymentUrl(candidate, 'api');
  if (check.valid && check.normalized) {
    return `${check.normalized}${normalizedPath}`;
  }
  return normalizedPath;
}
