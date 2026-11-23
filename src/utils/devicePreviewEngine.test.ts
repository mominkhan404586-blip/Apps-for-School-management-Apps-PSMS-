import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEVICE_VIEW_SPECS,
  OFFICIAL_APP_ICON_URL,
  OFFICIAL_FAVICON_URL,
  OFFICIAL_MASKABLE_ICON_URL,
  buildEmbeddedPreviewUrl,
  computePreviewFrameScale,
  detectAutomaticDeviceCategory,
  detectRuntimePlatform,
  formatCurrentViewLabel,
  formatPlatformIndicator,
  parseDeviceOrientation,
  parseDeviceViewMode,
  resolveEffectiveDimensions,
  resolveEffectiveViewMode,
  resolveInitialPreviewState,
  shouldShowDeveloperDevicePreviewControls,
  supportsOrientationToggle,
} from './devicePreviewEngine';

test('device view specs cover all 4 requested modes: auto, mobile, tablet, desktop', () => {
  assert.deepEqual(Object.keys(DEVICE_VIEW_SPECS), ['auto', 'mobile', 'tablet', 'desktop']);
  assert.equal(supportsOrientationToggle('mobile'), true);
  assert.equal(supportsOrientationToggle('tablet'), true);
  assert.equal(supportsOrientationToggle('desktop'), false);
  assert.equal(supportsOrientationToggle('auto'), false);
});

test('resolveEffectiveDimensions honors portrait/landscape ratios for mobile & tablet and wide desktop', () => {
  assert.deepEqual(resolveEffectiveDimensions('mobile', 'portrait', 1440, 900), {
    width: 390,
    height: 844,
  });
  assert.deepEqual(resolveEffectiveDimensions('mobile', 'landscape', 1440, 900), {
    width: 844,
    height: 390,
  });
  assert.deepEqual(resolveEffectiveDimensions('tablet', 'portrait', 1440, 900), {
    width: 768,
    height: 1024,
  });
  assert.deepEqual(resolveEffectiveDimensions('tablet', 'landscape', 1440, 900), {
    width: 1024,
    height: 768,
  });
  assert.deepEqual(resolveEffectiveDimensions('desktop', 'portrait', 1440, 900), {
    width: 1440,
    height: 900,
  });
  assert.deepEqual(resolveEffectiveDimensions('auto', 'portrait', 1366, 768), {
    width: 1366,
    height: 768,
  });
});

test('computePreviewFrameScale scales wide previews smoothly into narrower host containers without clipping', () => {
  assert.equal(computePreviewFrameScale(1440, 900, 390, 844, 48), 1);
  const tabletScale = computePreviewFrameScale(1440, 820, 768, 1024, 40);
  assert.ok(tabletScale > 0.7 && tabletScale < 0.85);
  const desktopOnLaptop = computePreviewFrameScale(1280, 720, 1440, 900, 32);
  assert.ok(desktopOnLaptop > 0.7 && desktopOnLaptop < 0.9);
});

test('platform detection and indicators accurately distinguish Web and Android App', () => {
  assert.equal(detectRuntimePlatform('Mozilla/5.0 (Windows NT 10.0)', false), 'web');
  assert.equal(detectRuntimePlatform('Mozilla/5.0 (Linux; Android 14)', true), 'android');
  assert.equal(formatCurrentViewLabel('mobile', 'bn'), 'Current View: Mobile');
  assert.equal(formatCurrentViewLabel('auto', 'en'), 'Current View: Auto');
  assert.equal(formatPlatformIndicator('android', 'en'), 'Platform: Android');
  assert.equal(formatPlatformIndicator('web', 'en'), 'Platform: Web');
});

test('session state parsing and restoration preserve selected device mode and orientation across views', () => {
  assert.equal(parseDeviceViewMode('tablet'), 'tablet');
  assert.equal(parseDeviceViewMode('invalid'), 'auto');
  assert.equal(parseDeviceOrientation('landscape'), 'landscape');
  assert.equal(parseDeviceOrientation(null), 'portrait');

  assert.deepEqual(resolveInitialPreviewState('', 'mobile', 'landscape'), {
    viewMode: 'mobile',
    orientation: 'landscape',
  });
  assert.deepEqual(resolveInitialPreviewState('', null, null), {
    viewMode: 'auto',
    orientation: 'portrait',
  });
  assert.deepEqual(
    resolveInitialPreviewState('?previewEmbed=1&viewMode=tablet&orientation=landscape', 'desktop', 'portrait'),
    {
      viewMode: 'tablet',
      orientation: 'landscape',
    }
  );
});

test('buildEmbeddedPreviewUrl produces clean same-origin URLs preserving platform, role, tab, lang, theme & viewMode', () => {
  const url = buildEmbeddedPreviewUrl('http://localhost:3000/', {
    platform: 'android',
    role: 'school_admin',
    tab: 'settings',
    lang: 'bn',
    theme: 'dark',
    viewMode: 'mobile',
  });
  assert.equal(
    url,
    'http://localhost:3000/?previewEmbed=1&platform=android&role=school_admin&tab=settings&lang=bn&theme=dark&viewMode=mobile'
  );
  assert.equal(OFFICIAL_APP_ICON_URL, '/official-app-icon.png');
  assert.equal(OFFICIAL_MASKABLE_ICON_URL, '/pwa-maskable-512x512.png');
  assert.equal(OFFICIAL_FAVICON_URL, '/favicon.png');
});

test('detectAutomaticDeviceCategory classifies Mobile, Tablet, Desktop, and unknown screens accurately', () => {
  assert.equal(detectAutomaticDeviceCategory(390), 'mobile');
  assert.equal(detectAutomaticDeviceCategory(767), 'mobile');
  assert.equal(detectAutomaticDeviceCategory(768), 'tablet');
  assert.equal(detectAutomaticDeviceCategory(1023), 'tablet');
  assert.equal(detectAutomaticDeviceCategory(1024), 'desktop');
  assert.equal(detectAutomaticDeviceCategory(1440), 'desktop');
  assert.equal(detectAutomaticDeviceCategory(0), 'auto');
  assert.equal(detectAutomaticDeviceCategory(Number.NaN), 'auto');
});

test('shouldShowDeveloperDevicePreviewControls shows bar ONLY in Developer/Preview/Testing and hides it for End Users in Production/Published/APK', () => {
  // Visible in AI Studio Dev / Editor & local dev
  assert.equal(
    shouldShowDeveloperDevicePreviewControls({
      isDevBuild: true,
      hostname: 'ais-dev-4w57xuvknnfzbbvhv73pty-549117009752.asia-east1.run.app',
      search: '',
      isCapacitorNative: false,
      isEmbeddedPreview: false,
    }),
    true
  );
  assert.equal(
    shouldShowDeveloperDevicePreviewControls({
      isDevBuild: true,
      hostname: 'localhost',
      search: '',
      isCapacitorNative: false,
      isEmbeddedPreview: false,
    }),
    true
  );

  // Hidden on Published Cloud Run URL, Shared Preview URL, Cloudflare Pages, Production build, and Android APK
  assert.equal(
    shouldShowDeveloperDevicePreviewControls({
      isDevBuild: false,
      hostname: 'school-management-system-sms-798667902569.asia-southeast1.run.app',
      search: '',
      isCapacitorNative: false,
      isEmbeddedPreview: false,
    }),
    false
  );
  assert.equal(
    shouldShowDeveloperDevicePreviewControls({
      isDevBuild: true,
      hostname: 'ais-pre-4w57xuvknnfzbbvhv73pty-549117009752.asia-east1.run.app',
      search: '',
      isCapacitorNative: false,
      isEmbeddedPreview: false,
    }),
    false
  );
  assert.equal(
    shouldShowDeveloperDevicePreviewControls({
      isDevBuild: false,
      hostname: 'school-portal-demo.pages.dev',
      search: '',
      isCapacitorNative: false,
      isEmbeddedPreview: false,
    }),
    false
  );
  assert.equal(
    shouldShowDeveloperDevicePreviewControls({
      isDevBuild: true,
      hostname: 'localhost',
      search: '',
      isCapacitorNative: true,
      isEmbeddedPreview: false,
    }),
    false
  );
  assert.equal(
    shouldShowDeveloperDevicePreviewControls({
      isDevBuild: true,
      hostname: 'localhost',
      search: '?endUserPreview=1',
      isCapacitorNative: false,
      isEmbeddedPreview: false,
    }),
    false
  );

  // End-user mode forces effective view mode to automatic responsive layout
  assert.equal(resolveEffectiveViewMode('mobile', false, false), 'auto');
  assert.equal(resolveEffectiveViewMode('mobile', true, false), 'mobile');
  assert.equal(resolveEffectiveViewMode('tablet', false, true), 'tablet');
});
