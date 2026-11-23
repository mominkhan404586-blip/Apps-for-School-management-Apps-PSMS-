import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANDROID_APP_PACKAGE_ID,
  VERIFIED_GITHUB_REPO_URL,
  VERIFIED_PUBLISHED_WEB_APP_URL,
  WEB_HOSTING_PROJECT_SLUG,
  createDefaultDeploymentLinksRecord,
  createEmptyDeploymentLinksRecord,
  isPlaceholderOrFakeUrl,
  isRetiredDeploymentUrl,
  resolveApiUrl,
  resolveDeploymentLinksState,
  validateDeploymentUrl,
} from './deploymentConfig';

test('unconfigured deployment state shows exact Not Published / Not Available / Not Connected statuses with zero fake URLs', () => {
  const empty = createEmptyDeploymentLinksRecord();
  const state = resolveDeploymentLinksState(empty, {});

  assert.equal(state.projectSlug, WEB_HOSTING_PROJECT_SLUG);
  assert.equal(state.packageId, ANDROID_APP_PACKAGE_ID);

  assert.equal(state.webApp.published, false);
  assert.equal(state.webApp.url, '');
  assert.equal(state.webApp.statusEn, 'Web App Not Published');

  assert.equal(state.androidApk.available, false);
  assert.equal(state.androidApk.url, '');
  assert.equal(state.androidApk.statusEn, 'APK Not Available');

  assert.equal(state.githubRepo.connected, false);
  assert.equal(state.githubRepo.url, '');
  assert.equal(state.githubRepo.statusEn, 'GitHub Repository Not Connected');
});

test('placeholder, fake, or retired URLs are rejected and never treated as active', () => {
  assert.equal(isPlaceholderOrFakeUrl(''), true);
  assert.equal(isPlaceholderOrFakeUrl('MY_APP_URL'), true);
  assert.equal(isPlaceholderOrFakeUrl('https://example.com/app.apk'), true);

  assert.equal(isRetiredDeploymentUrl('https://school-management-nexus-bd.pages.dev'), true);
  assert.equal(isRetiredDeploymentUrl('https://github.com/mominkhan404586-blip/School-Management-System'), true);
  assert.equal(isRetiredDeploymentUrl(VERIFIED_GITHUB_REPO_URL), false);
  assert.equal(isRetiredDeploymentUrl(VERIFIED_PUBLISHED_WEB_APP_URL), false);

  const webInvalid = validateDeploymentUrl('https://example.com', 'web');
  assert.equal(webInvalid.valid, false);

  const jsInvalid = validateDeploymentUrl('javascript:alert(1)', 'web');
  assert.equal(jsInvalid.valid, false);

  const ghInvalid = validateDeploymentUrl('https://gitlab.com/org/repo', 'github');
  assert.equal(ghInvalid.valid, false);

  const state = resolveDeploymentLinksState(
    {
      webAppUrl: 'https://school-management-nexus-bd.pages.dev',
      androidApkUrl: 'https://example.com/psms.apk',
      githubRepoUrl: 'https://github.com/mominkhan404586-blip/School-Management-System',
    },
    {
      webAppUrl: VERIFIED_PUBLISHED_WEB_APP_URL,
      githubRepoUrl: VERIFIED_GITHUB_REPO_URL,
    }
  );
  assert.equal(state.webApp.url, VERIFIED_PUBLISHED_WEB_APP_URL);
  assert.equal(state.androidApk.available, false);
  assert.equal(state.githubRepo.url, VERIFIED_GITHUB_REPO_URL);
});

test('real https deployment URLs resolve cleanly and enable published/available/connected statuses', () => {
  const state = resolveDeploymentLinksState(
    {
      webAppUrl: `${VERIFIED_PUBLISHED_WEB_APP_URL}/`,
      androidApkUrl: `${VERIFIED_GITHUB_REPO_URL}/releases/download/v2026.1.0/psms-release.apk`,
      githubRepoUrl: `${VERIFIED_GITHUB_REPO_URL}/`,
      apiBaseUrl: `${VERIFIED_PUBLISHED_WEB_APP_URL}/`,
    },
    {}
  );

  assert.equal(state.webApp.published, true);
  assert.equal(state.webApp.url, VERIFIED_PUBLISHED_WEB_APP_URL);
  assert.equal(state.webApp.statusEn, 'Live / Published');

  assert.equal(state.androidApk.available, true);
  assert.equal(
    state.androidApk.url,
    `${VERIFIED_GITHUB_REPO_URL}/releases/download/v2026.1.0/psms-release.apk`
  );
  assert.equal(state.androidApk.statusEn, 'APK Available');

  assert.equal(state.githubRepo.connected, true);
  assert.equal(state.githubRepo.url, VERIFIED_GITHUB_REPO_URL);
  assert.equal(state.githubRepo.statusEn, 'Connected');

  assert.equal(state.apiBaseUrl, VERIFIED_PUBLISHED_WEB_APP_URL);
});

test('resolveApiUrl keeps relative /api paths for same-origin web and prefixes configured backend origin for Android APK', () => {
  assert.equal(resolveApiUrl('/api/health', ''), '/api/health');
  assert.equal(resolveApiUrl('api/settings', ''), '/api/settings');
  assert.equal(
    resolveApiUrl('/api/settings', `${VERIFIED_PUBLISHED_WEB_APP_URL}/`),
    `${VERIFIED_PUBLISHED_WEB_APP_URL}/api/settings`
  );
});

test('createDefaultDeploymentLinksRecord exposes verified Cloud Run Web App + new GitHub repo and keeps APK unset until released', () => {
  const defaults = createDefaultDeploymentLinksRecord();
  const state = resolveDeploymentLinksState(defaults, {});

  assert.equal(state.webApp.published, true);
  assert.equal(state.webApp.url, VERIFIED_PUBLISHED_WEB_APP_URL);
  assert.equal(state.webApp.statusEn, 'Live / Published');
  assert.equal(state.apiBaseUrl, VERIFIED_PUBLISHED_WEB_APP_URL);

  assert.equal(state.androidApk.available, false);
  assert.equal(state.androidApk.statusEn, 'APK Not Available');

  assert.equal(state.githubRepo.connected, true);
  assert.equal(state.githubRepo.url, VERIFIED_GITHUB_REPO_URL);
  assert.equal(state.githubRepo.statusEn, 'Connected');
});
