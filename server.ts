import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import type { AuditLogEntry } from './src/types';
import {
  createDefaultSettingsState,
  toggleSystemFeatureSafely,
  type FeatureToggleKey,
  type SystemSettingsState,
} from './src/utils/settingsEngine';
import {
  VERIFIED_GITHUB_REPO_URL,
  VERIFIED_PUBLISHED_WEB_APP_URL,
  VERIFIED_SHARED_API_BASE_URL,
  createDefaultDeploymentLinksRecord,
  createEmptyDeploymentLinksRecord,
  isRetiredDeploymentUrl,
  resolveDeploymentLinksState,
  validateDeploymentUrl,
  type DeploymentLinksRecord,
} from './src/utils/deploymentConfig';
import type { Role } from './src/types';

interface SharedDatabaseSchema {
  schemaVersion: number;
  lastSyncedAt: string;
  settings: SystemSettingsState;
  auditLogs: AuditLogEntry[];
  deploymentLinks?: DeploymentLinksRecord;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'psms-shared-db.json');

function ensureDbFile(): SharedDatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial: SharedDatabaseSchema = {
      schemaVersion: 1,
      lastSyncedAt: new Date().toISOString(),
      settings: createDefaultSettingsState('bn', 'light'),
      auditLogs: [],
      deploymentLinks: createDefaultDeploymentLinksRecord(),
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<SharedDatabaseSchema>;
    const defaults = createDefaultDeploymentLinksRecord();
    const rawLinks = parsed.deploymentLinks ?? defaults;
    const normalizedLinks: DeploymentLinksRecord = {
      webAppUrl:
        rawLinks.webAppUrl && !isRetiredDeploymentUrl(rawLinks.webAppUrl)
          ? rawLinks.webAppUrl
          : VERIFIED_PUBLISHED_WEB_APP_URL,
      androidApkUrl:
        rawLinks.androidApkUrl && !isRetiredDeploymentUrl(rawLinks.androidApkUrl)
          ? rawLinks.androidApkUrl
          : '',
      githubRepoUrl:
        rawLinks.githubRepoUrl && !isRetiredDeploymentUrl(rawLinks.githubRepoUrl)
          ? rawLinks.githubRepoUrl
          : VERIFIED_GITHUB_REPO_URL,
      apiBaseUrl:
        rawLinks.apiBaseUrl && !isRetiredDeploymentUrl(rawLinks.apiBaseUrl)
          ? rawLinks.apiBaseUrl
          : VERIFIED_SHARED_API_BASE_URL,
      updatedAt: rawLinks.updatedAt,
      updatedBy: rawLinks.updatedBy,
    };
    return {
      schemaVersion: parsed.schemaVersion ?? 1,
      lastSyncedAt: parsed.lastSyncedAt ?? new Date().toISOString(),
      settings: parsed.settings ?? createDefaultSettingsState('bn', 'light'),
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
      deploymentLinks: normalizedLinks,
    };
  } catch {
    const fallback: SharedDatabaseSchema = {
      schemaVersion: 1,
      lastSyncedAt: new Date().toISOString(),
      settings: createDefaultSettingsState('bn', 'light'),
      auditLogs: [],
      deploymentLinks: createDefaultDeploymentLinksRecord(),
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(fallback, null, 2), 'utf8');
    return fallback;
  }
}

function saveDbFile(db: SharedDatabaseSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  db.lastSyncedAt = new Date().toISOString();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // CORS support so both Web Browser & Capacitor Android APK (https://localhost / capacitor://localhost) can access the exact same API
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    const db = ensureDbFile();
    res.json({
      status: 'ok',
      platform: 'unified-web-and-android-apk',
      database: 'persistent-json-store',
      lastSyncedAt: db.lastSyncedAt,
      settingsVersion: db.settings.version,
      serverTime: new Date().toISOString(),
    });
  });

  app.get('/api/settings', (_req, res) => {
    const db = ensureDbFile();
    res.json({
      settings: db.settings,
      auditLogs: db.auditLogs,
      lastSyncedAt: db.lastSyncedAt,
    });
  });

  app.patch('/api/settings', (req, res) => {
    const db = ensureDbFile();
    const { settings, featureToggle, auditEntry } = req.body as {
      settings?: Partial<SystemSettingsState>;
      featureToggle?: {
        role: Role;
        actorName: string;
        key: FeatureToggleKey;
        nextValue: boolean;
        reason?: string;
      };
      auditEntry?: AuditLogEntry;
    };

    if (featureToggle) {
      const outcome = toggleSystemFeatureSafely(
        db.settings,
        featureToggle.role,
        featureToggle.actorName,
        featureToggle.key,
        featureToggle.nextValue,
        featureToggle.reason
      );
      if (!outcome.allowed) {
        res.status(403).json({
          error: outcome.errorEn ?? 'Unauthorized role for system feature toggle',
          errorBn: outcome.errorBn,
        });
        return;
      }
      db.settings = outcome.nextState;
      if (outcome.auditEntry) {
        db.auditLogs = [outcome.auditEntry, ...db.auditLogs].slice(0, 250);
      }
    } else if (settings) {
      db.settings = {
        ...db.settings,
        ...settings,
        version: db.settings.version + 1,
        updatedAt: new Date().toISOString(),
      };
    }

    if (auditEntry) {
      db.auditLogs = [auditEntry, ...db.auditLogs].slice(0, 250);
    }

    saveDbFile(db);
    res.json({
      ok: true,
      settings: db.settings,
      auditLogs: db.auditLogs,
      lastSyncedAt: db.lastSyncedAt,
    });
  });

  app.post('/api/audit', (req, res) => {
    const db = ensureDbFile();
    const entry = req.body as AuditLogEntry;
    if (entry && entry.what) {
      db.auditLogs = [entry, ...db.auditLogs].slice(0, 250);
      saveDbFile(db);
    }
    res.json({ ok: true, count: db.auditLogs.length });
  });

  app.get('/api/deployment', (_req, res) => {
    const db = ensureDbFile();
    const resolved = resolveDeploymentLinksState(db.deploymentLinks, {
      webAppUrl: process.env.LIVE_WEB_APP_URL ?? process.env.VITE_LIVE_WEB_APP_URL,
      androidApkUrl: process.env.ANDROID_APK_URL ?? process.env.VITE_ANDROID_APK_URL,
      githubRepoUrl: process.env.GITHUB_REPO_URL ?? process.env.VITE_GITHUB_REPO_URL,
      apiBaseUrl: process.env.API_BASE_URL ?? process.env.VITE_API_BASE_URL,
    });
    res.json({
      deployment: resolved,
      raw: db.deploymentLinks ?? createEmptyDeploymentLinksRecord(),
      lastSyncedAt: db.lastSyncedAt,
    });
  });

  app.patch('/api/deployment', (req, res) => {
    const db = ensureDbFile();
    const body = req.body as {
      role?: Role;
      actorName?: string;
      webAppUrl?: string;
      androidApkUrl?: string;
      githubRepoUrl?: string;
      apiBaseUrl?: string;
    };

    if (body.role !== 'central_admin') {
      res.status(403).json({
        error: 'Only Central Admin can modify published deployment links.',
        errorBn: 'শুধুমাত্র কেন্দ্রীয় অ্যাডমিন ডিপ্লয়মেন্ট লিংক পরিবর্তন করতে পারবেন।',
      });
      return;
    }

    const webCheck = validateDeploymentUrl(body.webAppUrl, 'web');
    const apkCheck = validateDeploymentUrl(body.androidApkUrl, 'apk');
    const ghCheck = validateDeploymentUrl(body.githubRepoUrl, 'github');
    const apiCheck = validateDeploymentUrl(body.apiBaseUrl, 'api');

    const firstInvalid = [webCheck, apkCheck, ghCheck, apiCheck].find((c) => !c.valid);
    if (firstInvalid) {
      res.status(400).json({
        error: firstInvalid.errorEn ?? 'Invalid deployment URL',
        errorBn: firstInvalid.errorBn ?? 'অবৈধ ডিপ্লয়মেন্ট URL',
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const actor = body.actorName?.trim() || 'Super Central Admin';
    db.deploymentLinks = {
      webAppUrl: webCheck.normalized,
      androidApkUrl: apkCheck.normalized,
      githubRepoUrl: ghCheck.normalized,
      apiBaseUrl: apiCheck.normalized,
      updatedAt: nowIso,
      updatedBy: actor,
    };

    const auditEntry: AuditLogEntry = {
      id: `AUD-DEP-${Date.now()}`,
      who: actor,
      role: 'central_admin',
      when: nowIso.replace('T', ' ').slice(0, 16),
      what: 'Updated Unified Web + Android Deployment Links',
      targetName: 'Deployment / App Links',
      requestId: 'DEP-SYNC',
      oldValue: 'Previous config',
      newValue: `${webCheck.normalized ? 'Web Live' : 'Web Unset'} · ${apkCheck.normalized ? 'APK Ready' : 'APK Unset'} · ${ghCheck.normalized ? 'GitHub Connected' : 'GitHub Unset'}`,
    };
    db.auditLogs = [auditEntry, ...db.auditLogs].slice(0, 250);
    saveDbFile(db);

    const resolved = resolveDeploymentLinksState(db.deploymentLinks, {
      webAppUrl: process.env.LIVE_WEB_APP_URL ?? process.env.VITE_LIVE_WEB_APP_URL,
      androidApkUrl: process.env.ANDROID_APK_URL ?? process.env.VITE_ANDROID_APK_URL,
      githubRepoUrl: process.env.GITHUB_REPO_URL ?? process.env.VITE_GITHUB_REPO_URL,
      apiBaseUrl: process.env.API_BASE_URL ?? process.env.VITE_API_BASE_URL,
    });
    res.json({
      ok: true,
      deployment: resolved,
      raw: db.deploymentLinks,
      lastSyncedAt: db.lastSyncedAt,
    });
  });

  app.get('/api/backup/export', (_req, res) => {
    const db = ensureDbFile();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="psms-unified-backup.json"');
    res.send(JSON.stringify(db, null, 2));
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);
  const enableHmr = process.env.ENABLE_HMR === 'true' && process.env.DISABLE_HMR !== 'true';

  if (!isProduction) {
    if (!enableHmr) {
      app.get('/@vite/client', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.send(`
const sheetsMap = new Map();
const linkSheetsMap = new Map();
if ("document" in globalThis) {
  document.querySelectorAll("style[data-vite-dev-id]").forEach((el) => {
    sheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
  document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id]').forEach((el) => {
    linkSheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
}
let lastInsertedStyle;
function updateStyle(id, content) {
  if (linkSheetsMap.has(id)) return;
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.setAttribute("data-vite-dev-id", id);
    style.textContent = content;
    if (!lastInsertedStyle) {
      document.head.appendChild(style);
      setTimeout(() => { lastInsertedStyle = void 0; }, 0);
    } else {
      lastInsertedStyle.insertAdjacentElement("afterend", style);
    }
    lastInsertedStyle = style;
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
function removeStyle(id) {
  if (linkSheetsMap.has(id)) {
    document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id="' + CSS.escape(id) + '"]').forEach((el) => el.remove());
    linkSheetsMap.delete(id);
  }
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
const dataMap = new Map();
function createHotContext(ownerPath) {
  if (!dataMap.has(ownerPath)) dataMap.set(ownerPath, {});
  return {
    get data() { return dataMap.get(ownerPath); },
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
function injectQuery(url, queryToInject) {
  if (url[0] !== "." && url[0] !== "/") return url;
  const pathname = url.replace(/[?#].*$/, "");
  const { search, hash } = new URL(url, "http://vite.dev");
  return pathname + "?" + queryToInject + (search ? "&" + search.slice(1) : "") + (hash || "");
}
class ErrorOverlay {}
export { ErrorOverlay, createHotContext, injectQuery, removeStyle, updateStyle };
`);
      });
    }
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: enableHmr ? { server: httpServer } : false,
        watch: enableHmr ? {} : null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API route not found' });
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`PSMS Unified Server (Web + Android API) running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start PSMS server:', err);
  process.exit(1);
});
