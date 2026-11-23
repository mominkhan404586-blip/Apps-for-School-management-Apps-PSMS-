export const WEB_HOSTING_PROJECT_SLUG = 'school-management-system-sms';
export const ANDROID_APP_PACKAGE_ID = 'bd.gov.dpe.psms';
export const ANDROID_APP_VERSION = '2026.1.0';
export const VERIFIED_PUBLISHED_WEB_APP_URL =
  'https://school-management-system-sms-798667902569.asia-southeast1.run.app';
export const VERIFIED_SHARED_API_BASE_URL =
  'https://school-management-system-sms-798667902569.asia-southeast1.run.app';
export const VERIFIED_GITHUB_REPO_URL =
  'https://github.com/mominkhan404586-blip/Apps-for-School-management-Apps-PSMS-';

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
    androidApkUrl: '',
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
  const isCapacitorNative =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
    );
  const candidate =
    configuredBaseUrl !== undefined
      ? configuredBaseUrl
      : readViteEnvDeploymentOverrides().apiBaseUrl ||
        (isCapacitorNative ? VERIFIED_SHARED_API_BASE_URL : '');
  const check = validateDeploymentUrl(candidate, 'api');
  if (check.valid && check.normalized) {
    return `${check.normalized}${normalizedPath}`;
  }
  return normalizedPath;
}
