import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getApp as getAdminApp, getApps as getAdminApps, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import type { AuditLogEntry } from './src/types';
import {
  createDefaultSettingsState,
  toggleSystemFeatureSafely,
  type FeatureToggleKey,
  type SystemSettingsState,
} from './src/utils/settingsEngine';
import {
  VERIFIED_GITHUB_APK_RELEASE_URL,
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
import {
  maskPhoneNumber,
  normalizeBangladeshMobile,
  sanitizeSmsBody,
  validateCustomSmsGatewayUrl,
  type BulkSmsCategory,
  type BulkSmsDeliveryReceipt,
  type BulkSmsLogEntry,
  type BulkSmsRecipient,
  type SmsGatewayProvider,
} from './src/utils/bulkSmsEngine';

interface SharedDatabaseSchema {
  schemaVersion: number;
  lastSyncedAt: string;
  settings: SystemSettingsState;
  auditLogs: AuditLogEntry[];
  deploymentLinks?: DeploymentLinksRecord;
  smsLogs?: BulkSmsLogEntry[];
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
      smsLogs: [],
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
          : VERIFIED_GITHUB_APK_RELEASE_URL,
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
      smsLogs: Array.isArray(parsed.smsLogs) ? parsed.smsLogs : [],
    };
  } catch {
    const fallback: SharedDatabaseSchema = {
      schemaVersion: 1,
      lastSyncedAt: new Date().toISOString(),
      settings: createDefaultSettingsState('bn', 'light'),
      auditLogs: [],
      deploymentLinks: createDefaultDeploymentLinksRecord(),
      smsLogs: [],
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

  const firebaseConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  let configuredFirebaseProjectId = '';
  try {
    const cfgRaw = fs.readFileSync(firebaseConfigPath, 'utf8');
    const cfgParsed = JSON.parse(cfgRaw) as { projectId?: string };
    configuredFirebaseProjectId = (cfgParsed.projectId ?? '').trim();
  } catch {
    configuredFirebaseProjectId = '';
  }

  const adminApp =
    configuredFirebaseProjectId && configuredFirebaseProjectId !== 'remixed-project-id'
      ? getAdminApps().length
        ? getAdminApp()
        : initializeAdminApp({ projectId: configuredFirebaseProjectId })
      : null;

  app.post('/api/auth/verify-session', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const tokenFromBody = typeof req.body?.idToken === 'string' ? req.body.idToken.trim() : '';
    const token = bearerToken || tokenFromBody;

    if (!adminApp) {
      res.status(503).json({
        verified: false,
        error: 'Firebase projectId is not configured on backend.',
      });
      return;
    }
    if (!token) {
      res.status(401).json({
        verified: false,
        error: 'Missing Firebase ID token.',
      });
      return;
    }
    try {
      const decoded = await getAdminAuth(adminApp).verifyIdToken(token);
      res.json({
        verified: true,
        uid: decoded.uid,
        email: decoded.email ?? null,
        emailVerified: Boolean(decoded.email_verified),
        projectId: configuredFirebaseProjectId,
      });
    } catch (err) {
      res.status(401).json({
        verified: false,
        error: err instanceof Error ? err.message : 'Invalid Firebase ID token.',
      });
    }
  });

  app.get('/api/health', (_req, res) => {
    const db = ensureDbFile();
    res.json({
      status: 'ok',
      platform: 'unified-web-and-android-apk',
      database: 'persistent-json-store',
      firebaseProjectId: configuredFirebaseProjectId || null,
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

  const apkReleaseCache = new Map<string, { checkedAt: number; ready: boolean; actionsUrl: string }>();

  async function inspectApkReleaseAvailability(
    apkUrl: string,
    githubRepoUrl: string
  ): Promise<{ releaseReady: boolean; actionsUrl: string }> {
    const cleanRepo = (githubRepoUrl || '').replace(/\/+$/, '');
    const defaultActionsUrl = cleanRepo ? `${cleanRepo}/actions` : '';
    const match = apkUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/(?:latest\/download|download\/[^/]+)\/([^/?#]+)/i);
    if (!match) {
      return { releaseReady: Boolean(apkUrl), actionsUrl: defaultActionsUrl };
    }
    const [, owner, repo, assetName] = match;
    const actionsUrl = `https://github.com/${owner}/${repo}/actions`;
    const cacheKey = `${owner}/${repo}/${assetName}`;
    const cached = apkReleaseCache.get(cacheKey);
    if (cached && Date.now() - cached.checkedAt < 60_000) {
      return { releaseReady: cached.ready, actionsUrl: cached.actionsUrl };
    }
    try {
      const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
        headers: { 'User-Agent': 'PSMS-Bangladesh-Server' },
        signal: AbortSignal.timeout(2500),
      });
      if (resp.status === 404) {
        apkReleaseCache.set(cacheKey, { checkedAt: Date.now(), ready: false, actionsUrl });
        return { releaseReady: false, actionsUrl };
      }
      if (resp.ok) {
        const data = (await resp.json()) as { assets?: Array<{ name?: string }> };
        const hasAsset = Array.isArray(data.assets)
          ? data.assets.some((a) => (a.name || '').toLowerCase() === assetName.toLowerCase())
          : true;
        apkReleaseCache.set(cacheKey, { checkedAt: Date.now(), ready: hasAsset, actionsUrl });
        return { releaseReady: hasAsset, actionsUrl };
      }
    } catch {
      // Network offline or timeout: assume configured URL is usable rather than blocking offline users
    }
    return { releaseReady: true, actionsUrl };
  }

  app.get('/api/deployment', async (_req, res) => {
    const db = ensureDbFile();
    const resolved = resolveDeploymentLinksState(db.deploymentLinks, {
      webAppUrl: process.env.LIVE_WEB_APP_URL ?? process.env.VITE_LIVE_WEB_APP_URL,
      androidApkUrl: process.env.ANDROID_APK_URL ?? process.env.VITE_ANDROID_APK_URL,
      githubRepoUrl: process.env.GITHUB_REPO_URL ?? process.env.VITE_GITHUB_REPO_URL,
      apiBaseUrl: process.env.API_BASE_URL ?? process.env.VITE_API_BASE_URL,
    });
    const releaseCheck = resolved.androidApk.available
      ? await inspectApkReleaseAvailability(resolved.androidApk.url, resolved.githubRepo.url)
      : { releaseReady: false, actionsUrl: resolved.githubRepo.url ? `${resolved.githubRepo.url}/actions` : '' };
    res.json({
      deployment: resolved,
      androidApkReleaseReady: releaseCheck.releaseReady,
      androidApkActionsUrl: releaseCheck.actionsUrl,
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

  function resolveActiveSmsProvider(): SmsGatewayProvider {
    const requested = (process.env.SMS_PROVIDER || 'auto').trim().toLowerCase();
    const hasTwilio = Boolean(
      process.env.TWILIO_ACCOUNT_SID?.trim() &&
        process.env.TWILIO_AUTH_TOKEN?.trim() &&
        process.env.TWILIO_FROM_NUMBER?.trim()
    );
    const hasBdGateway = Boolean(
      process.env.BD_SMS_API_URL?.trim() &&
        validateCustomSmsGatewayUrl(process.env.BD_SMS_API_URL) &&
        process.env.BD_SMS_API_KEY?.trim()
    );
    if (requested === 'twilio' && hasTwilio) return 'twilio';
    if (requested === 'bd_sms_gateway' && hasBdGateway) return 'bd_sms_gateway';
    if (requested === 'preview_sandbox') return 'preview_sandbox';
    if (hasTwilio) return 'twilio';
    if (hasBdGateway) return 'bd_sms_gateway';
    return 'preview_sandbox';
  }

  app.get('/api/sms/config-status', (_req, res) => {
    const activeProvider = resolveActiveSmsProvider();
    res.json({
      provider: activeProvider,
      twilioConfigured: Boolean(
        process.env.TWILIO_ACCOUNT_SID?.trim() &&
          process.env.TWILIO_AUTH_TOKEN?.trim() &&
          process.env.TWILIO_FROM_NUMBER?.trim()
      ),
      bdGatewayConfigured: Boolean(
        process.env.BD_SMS_API_URL?.trim() &&
          validateCustomSmsGatewayUrl(process.env.BD_SMS_API_URL) &&
          process.env.BD_SMS_API_KEY?.trim()
      ),
      fromLabel:
        process.env.BD_SMS_SENDER_ID?.trim() ||
        process.env.TWILIO_FROM_NUMBER?.trim() ||
        'PSMS-BD',
    });
  });

  app.get('/api/sms/history', (req, res) => {
    const db = ensureDbFile();
    const schoolId = typeof req.query.schoolId === 'string' ? req.query.schoolId.trim() : '';
    const logs = (db.smsLogs ?? []).filter((l) => !schoolId || l.schoolId === schoolId);
    res.json({ logs: logs.slice(0, 50) });
  });

  app.post('/api/sms/send-bulk', async (req, res) => {
    const body = req.body as {
      schoolId?: string;
      category?: BulkSmsCategory;
      sentByRole?: Role;
      sentByName?: string;
      message?: string;
      targetsSummary?: string;
      recipients?: BulkSmsRecipient[];
    };

    if (
      body.sentByRole !== 'central_admin' &&
      body.sentByRole !== 'school_admin' &&
      body.sentByRole !== 'teacher'
    ) {
      res.status(403).json({ error: 'Only authorized School Admin, Teacher, or Central Admin can dispatch bulk SMS.' });
      return;
    }

    const schoolId = (body.schoolId || '').trim().slice(0, 64);
    if (!schoolId) {
      res.status(400).json({ error: 'schoolId is required.' });
      return;
    }

    const msgCheck = sanitizeSmsBody(body.message || '');
    if (!msgCheck.ok) {
      res.status(400).json({ error: msgCheck.error || 'Invalid SMS message body.' });
      return;
    }

    const rawRecipients = Array.isArray(body.recipients) ? body.recipients.slice(0, 500) : [];
    const normalizedRecipients: Array<{ name: string; phone: string }> = [];
    const seen = new Set<string>();
    for (const r of rawRecipients) {
      const normalizedPhone = normalizeBangladeshMobile(r?.phone);
      if (!normalizedPhone || seen.has(normalizedPhone)) continue;
      seen.add(normalizedPhone);
      normalizedRecipients.push({
        name: String(r?.name || 'Guardian').trim().slice(0, 80) || 'Guardian',
        phone: normalizedPhone,
      });
    }

    if (normalizedRecipients.length === 0) {
      res.status(400).json({ error: 'At least one valid Bangladesh/E.164 recipient mobile number is required.' });
      return;
    }

    const provider = resolveActiveSmsProvider();
    const receipts: BulkSmsDeliveryReceipt[] = [];

    if (provider === 'twilio') {
      const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
      const token = process.env.TWILIO_AUTH_TOKEN!.trim();
      const from = process.env.TWILIO_FROM_NUMBER!.trim();
      const authHeader = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64');

      for (const rcpt of normalizedRecipients) {
        try {
          const form = new URLSearchParams({ To: rcpt.phone, From: from, Body: msgCheck.text });
          const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: form.toString(),
            signal: AbortSignal.timeout(8000),
          });
          if (resp.ok) {
            const data = (await resp.json()) as { sid?: string; status?: string };
            receipts.push({
              name: rcpt.name,
              phoneMasked: maskPhoneNumber(rcpt.phone),
              status: data.status === 'queued' ? 'queued' : 'sent',
              sidOrRef: data.sid,
            });
          } else {
            const errText = await resp.text();
            receipts.push({
              name: rcpt.name,
              phoneMasked: maskPhoneNumber(rcpt.phone),
              status: 'failed',
              error: errText.slice(0, 120),
            });
          }
        } catch (err) {
          receipts.push({
            name: rcpt.name,
            phoneMasked: maskPhoneNumber(rcpt.phone),
            status: 'failed',
            error: err instanceof Error ? err.message : 'Twilio request failed',
          });
        }
      }
    } else if (provider === 'bd_sms_gateway') {
      const apiUrl = process.env.BD_SMS_API_URL!.trim();
      const apiKey = process.env.BD_SMS_API_KEY!.trim();
      const senderId = (process.env.BD_SMS_SENDER_ID || 'PSMS-BD').trim();
      for (const rcpt of normalizedRecipients) {
        try {
          const resp = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: apiKey,
              senderid: senderId,
              number: rcpt.phone.replace(/^\+/, ''),
              message: msgCheck.text,
            }),
            signal: AbortSignal.timeout(8000),
          });
          receipts.push({
            name: rcpt.name,
            phoneMasked: maskPhoneNumber(rcpt.phone),
            status: resp.ok ? 'sent' : 'failed',
            sidOrRef: resp.ok ? `BD-${Date.now().toString().slice(-6)}` : undefined,
          });
        } catch (err) {
          receipts.push({
            name: rcpt.name,
            phoneMasked: maskPhoneNumber(rcpt.phone),
            status: 'failed',
            error: err instanceof Error ? err.message : 'Gateway error',
          });
        }
      }
    } else {
      // Sandbox / preview mode when no external SMS gateway secret is configured yet
      for (let i = 0; i < normalizedRecipients.length; i++) {
        const rcpt = normalizedRecipients[i];
        receipts.push({
          name: rcpt.name,
          phoneMasked: maskPhoneNumber(rcpt.phone),
          status: 'preview',
          sidOrRef: `SBX-${Date.now().toString().slice(-5)}-${i + 1}`,
        });
      }
    }

    const failedCount = receipts.filter((r) => r.status === 'failed').length;
    const deliveredCount = receipts.length - failedCount;
    const nowIso = new Date().toISOString();
    const category: BulkSmsCategory =
      body.category === 'absence_alert' || body.category === 'emergency_notice'
        ? body.category
        : 'general_notice';

    const logEntry: BulkSmsLogEntry = {
      id: `SMS-${Date.now()}-${Math.floor(Math.random() * 90 + 10)}`,
      category,
      schoolId,
      sentByRole: body.sentByRole,
      sentByName: String(body.sentByName || 'School Admin').trim().slice(0, 100),
      message: msgCheck.text,
      recipientCount: receipts.length,
      deliveredCount,
      failedCount,
      provider,
      targetsSummary:
        String(body.targetsSummary || '').trim().slice(0, 120) ||
        `${receipts.length} recipients`,
      recipientsMasked: receipts.slice(0, 50),
      createdAtIso: nowIso,
    };

    const db = ensureDbFile();
    db.smsLogs = [logEntry, ...(db.smsLogs ?? [])].slice(0, 150);
    const auditEntry: AuditLogEntry = {
      id: `AUD-SMS-${Date.now()}`,
      who: logEntry.sentByName,
      role: body.sentByRole,
      when: nowIso.replace('T', ' ').slice(0, 16),
      what: `Bulk SMS Dispatch (${category} via ${provider})`,
      targetName: `${logEntry.targetsSummary} (${deliveredCount}/${receipts.length})`,
      schoolId,
      requestId: logEntry.id,
      oldValue: 'Queued',
      newValue: `${deliveredCount} Dispatched`,
    };
    db.auditLogs = [auditEntry, ...db.auditLogs].slice(0, 250);
    saveDbFile(db);

    res.json({
      ok: true,
      log: logEntry,
      provider,
      segmentCount: msgCheck.segmentCount,
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
    const noCachePaths = new Set([
      '/',
      '/index.html',
      '/sw.js',
      '/registerSW.js',
      '/manifest.webmanifest',
    ]);
    const applyNoStoreHeaders = (res: express.Response) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    };

    app.use((req, res, next) => {
      if (noCachePaths.has(req.path) || /^\/workbox-[^/]+\.js$/i.test(req.path)) {
        applyNoStoreHeaders(res);
      }
      next();
    });

    app.use(
      express.static(distDir, {
        index: false,
        setHeaders: (res, filePath) => {
          const base = path.basename(filePath);
          if (
            base === 'index.html' ||
            base === 'sw.js' ||
            base === 'registerSW.js' ||
            base === 'manifest.webmanifest' ||
            /^workbox-.*\.js$/i.test(base)
          ) {
            applyNoStoreHeaders(res);
          } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );

    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API route not found' });
        return;
      }
      applyNoStoreHeaders(res);
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
