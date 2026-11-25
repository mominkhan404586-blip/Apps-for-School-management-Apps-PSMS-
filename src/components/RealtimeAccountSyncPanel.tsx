import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Database,
  History,
  RefreshCw,
  ShieldCheck,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';
import type { Language, Role } from '../types';
import { b } from '../i18n/translations';
import {
  auth,
  getActiveFirebaseProjectInfo,
  subscribeRealtimeAllUsers,
  subscribeRealtimeUserAccount,
  subscribeRealtimeUserChangeLogs,
  subscribeRtdbConnectionStatus,
  updateRealtimeUserAccount,
} from '../firebase';
import {
  REALTIME_DATABASE_RULES_JSON,
  validateRealtimeUserAccountUpdate,
  type RealtimeUserAccountRecord,
  type RealtimeUserChangeLog,
  type RealtimeUserRole,
  type RealtimeUserStatus,
} from '../utils/realtimeDatabaseSync';

export interface RealtimeAccountSyncPanelProps {
  lang: Language;
  role: Role;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorPhone: string;
  draftName: string;
  draftEmail: string;
  draftPhone: string;
  onSyncLocalProfile?: (patch: { displayName: string; email: string; phone: string }) => void;
  showRulesBoxByDefault?: boolean;
}

export const RealtimeAccountSyncPanel: React.FC<RealtimeAccountSyncPanelProps> = ({
  lang,
  role,
  actorId,
  actorName,
  actorEmail,
  actorPhone,
  draftName,
  draftEmail,
  draftPhone,
  onSyncLocalProfile,
  showRulesBoxByDefault = false,
}) => {
  const projectInfo = getActiveFirebaseProjectInfo();
  const firebaseUser = auth.currentUser;
  const activeUid = firebaseUser?.uid || actorId;

  const [rtdbConnected, setRtdbConnected] = useState<boolean>(false);
  const [liveSelfUser, setLiveSelfUser] = useState<RealtimeUserAccountRecord | null>(null);
  const [liveAllUsers, setLiveAllUsers] = useState<RealtimeUserAccountRecord[]>([]);
  const [changeLogs, setChangeLogs] = useState<RealtimeUserChangeLog[]>([]);
  const [rtdbError, setRtdbError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState<boolean>(false);
  const [rulesVisible, setRulesVisible] = useState<boolean>(showRulesBoxByDefault);
  const [copiedRules, setCopiedRules] = useState<boolean>(false);

  useEffect(() => {
    const unsubConn = subscribeRtdbConnectionStatus((connected) => {
      setRtdbConnected(connected);
    });
    return () => unsubConn();
  }, []);

  useEffect(() => {
    if (!firebaseUser?.uid || !firebaseUser.emailVerified) {
      setLiveSelfUser(null);
      setChangeLogs([]);
      return;
    }

    const unsubUser = subscribeRealtimeUserAccount(
      firebaseUser.uid,
      (record) => {
        setLiveSelfUser(record);
        setRtdbError(null);
      },
      (err) => {
        setRtdbError(err);
      }
    );

    const unsubLogs = subscribeRealtimeUserChangeLogs(
      firebaseUser.uid,
      (logs) => setChangeLogs(logs),
      () => {}
    );

    return () => {
      unsubUser();
      unsubLogs();
    };
  }, [firebaseUser?.uid, firebaseUser?.emailVerified]);

  useEffect(() => {
    if (role !== 'central_admin' || !firebaseUser?.uid || !firebaseUser.emailVerified) {
      setLiveAllUsers([]);
      return;
    }
    const unsubAll = subscribeRealtimeAllUsers(
      (users) => {
        setLiveAllUsers(users);
      },
      (err) => {
        setRtdbError((prev) => prev || err);
      }
    );
    return () => unsubAll();
  }, [role, firebaseUser?.uid, firebaseUser?.emailVerified]);

  const currentSnapshot: Partial<RealtimeUserAccountRecord> = useMemo(
    () =>
      liveSelfUser ?? {
        uid: activeUid,
        displayName: actorName,
        email: actorEmail,
        phone: actorPhone,
        role,
        status: 'active',
      },
    [liveSelfUser, activeUid, actorName, actorEmail, actorPhone, role]
  );

  const liveValidation = useMemo(
    () =>
      validateRealtimeUserAccountUpdate(currentSnapshot, {
        displayName: draftName,
        email: draftEmail,
        phone: draftPhone,
        role: currentSnapshot.role ?? role,
        status: currentSnapshot.status ?? 'active',
      }),
    [currentSnapshot, draftName, draftEmail, draftPhone, role]
  );

  const handleCopyRules = async () => {
    try {
      await navigator.clipboard.writeText(REALTIME_DATABASE_RULES_JSON);
      setCopiedRules(true);
      setTimeout(() => setCopiedRules(false), 2500);
    } catch {
      setCopiedRules(false);
    }
  };

  const handlePushSelfUpdate = async () => {
    setSyncMessage(null);
    setRtdbError(null);

    if (!liveValidation.valid) {
      setRtdbError(
        b(
          `সঠিক ও ভুল যাচাইয়ে ${liveValidation.invalidCount}টি ভুল পাওয়া গেছে। লাল চিহ্নিত ঘরগুলো ঠিক করে আবার চেষ্টা করুন।`,
          `${liveValidation.invalidCount} invalid field(s) detected. Fix the red highlighted fields first.`,
          lang
        )
      );
      return;
    }

    if (!firebaseUser || !firebaseUser.emailVerified) {
      onSyncLocalProfile?.({
        displayName: liveValidation.normalized.displayName,
        email: liveValidation.normalized.email,
        phone: liveValidation.normalized.phone,
      });
      setRtdbError(
        b(
          'সকল তথ্য ফরম্যাট সঠিক আছে (লোকাল প্রোফাইল আপডেট হয়েছে)। Realtime Database-এ সরাসরি পুশ করতে Verified Google বা Firebase Email অ্যাকাউন্ট দিয়ে লগইন করুন।',
          'All fields are valid (local profile updated). Sign in with verified Firebase Auth to push live to Realtime Database.',
          lang
        )
      );
      return;
    }

    setSyncBusy(true);
    try {
      const res = await updateRealtimeUserAccount(firebaseUser.uid, currentSnapshot, {
        displayName: liveValidation.normalized.displayName,
        email: liveValidation.normalized.email,
        phone: liveValidation.normalized.phone,
        role: currentSnapshot.role ?? role,
        status: currentSnapshot.status ?? 'active',
      });

      if (res.ok) {
        onSyncLocalProfile?.({
          displayName: res.validation.normalized.displayName,
          email: res.validation.normalized.email,
          phone: res.validation.normalized.phone,
        });
        setSyncMessage(
          b(
            'Firebase Realtime Database-এ অ্যাকাউন্ট সাথে সাথে আপডেট ও সিঙ্ক হয়েছে!',
            'Account updated and synced live to Firebase Realtime Database!',
            lang
          )
        );
      } else if (res.errorCode === 'PERMISSION_DENIED') {
        setRtdbError(
          b(
            'Realtime Database Rules এখনো অনুমোদন দেয়নি (PERMISSION_DENIED)। নিচের Rules কপি করে Firebase Console > Realtime Database > Rules-এ Publish করুন।',
            'Realtime Database rejected the write (PERMISSION_DENIED). Publish the Rules below in Firebase Console > Realtime Database > Rules.',
            lang
          )
        );
      } else {
        setRtdbError(res.errorMessage || b('আপডেট ব্যর্থ হয়েছে।', 'Update failed.', lang));
      }
    } finally {
      setSyncBusy(false);
    }
  };

  const handleAdminUpdateUser = async (
    targetUser: RealtimeUserAccountRecord,
    patch: { role?: RealtimeUserRole; status?: RealtimeUserStatus }
  ) => {
    setSyncMessage(null);
    setRtdbError(null);
    setSyncBusy(true);
    try {
      const res = await updateRealtimeUserAccount(targetUser.uid, targetUser, {
        displayName: targetUser.displayName,
        email: targetUser.email,
        phone: targetUser.phone ?? '',
        role: patch.role ?? targetUser.role,
        status: patch.status ?? targetUser.status,
      });
      if (res.ok) {
        setSyncMessage(
          b(
            `${targetUser.displayName}-এর অ্যাকাউন্ট RTDB-তে তাৎক্ষণিক আপডেট হয়েছে।`,
            `${targetUser.displayName} updated live in RTDB.`,
            lang
          )
        );
      } else {
        setRtdbError(
          res.errorCode === 'PERMISSION_DENIED'
            ? b(
                'PERMISSION_DENIED: অনুগ্রহ করে নিচের database.rules.json Firebase Console-এ Publish করুন।',
                'PERMISSION_DENIED: Please publish database.rules.json in Firebase Console.',
                lang
              )
            : res.errorMessage || 'Update failed'
        );
      }
    } finally {
      setSyncBusy(false);
    }
  };

  return (
    <div
      data-testid="rtdb-live-sync-panel"
      className="rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-4"
    >
      {/* Header & Live Connection Status */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
            <Database className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {b(
                'Firebase Realtime Database লাইভ অ্যাকাউন্ট সিঙ্ক',
                'Firebase Realtime Database Live Account Sync',
                lang
              )}
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 break-all mt-0.5">
            {projectInfo.databaseURL}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            data-testid="rtdb-connection-badge"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
              rtdbConnected
                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
            }`}
          >
            {rtdbConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>
              {rtdbConnected
                ? b('RTDB সংযুক্ত (Live)', 'RTDB Connected (Live)', lang)
                : b('RTDB সংযোগ অপেক্ষমাণ', 'RTDB Connecting', lang)}
            </span>
          </span>
        </div>
      </div>

      {/* Right vs Wrong Live Field Validation & Diff Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              {b(
                'সঠিক ও ভুলের পার্থক্য এবং তাৎক্ষণিক পরিবর্তন যাচাই',
                'Right vs Wrong Validation & Live Change Diff',
                lang
              )}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span
              data-testid="rtdb-valid-count"
              className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300"
            >
              {b(`সঠিক: ${liveValidation.validCount}`, `Valid: ${liveValidation.validCount}`, lang)}
            </span>
            <span
              data-testid="rtdb-invalid-count"
              className={`px-2 py-0.5 rounded ${
                liveValidation.invalidCount > 0
                  ? 'bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {b(`ভুল: ${liveValidation.invalidCount}`, `Invalid: ${liveValidation.invalidCount}`, lang)}
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300">
              {b(`পরিবর্তিত: ${liveValidation.changedCount}`, `Changed: ${liveValidation.changedCount}`, lang)}
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {liveValidation.fieldDiffs.map((diff) => (
            <div
              key={diff.field}
              data-testid={`rtdb-diff-${diff.field}`}
              className={`px-3.5 py-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs ${
                !diff.valid
                  ? 'bg-red-50/70 dark:bg-red-950/25'
                  : diff.changed
                    ? 'bg-blue-50/50 dark:bg-blue-950/20'
                    : ''
              }`}
            >
              <div className="sm:col-span-3 font-bold text-slate-800 dark:text-slate-200">
                {b(diff.labelBn, diff.labelEn, lang)}
              </div>
              <div className="sm:col-span-5 text-[11px] font-mono break-all">
                <span className="text-slate-500 line-through mr-1.5">
                  {diff.changed ? diff.oldValue : ''}
                </span>
                <span className={diff.changed ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-600 dark:text-slate-400'}>
                  {diff.changed ? `→ ${diff.newValue}` : diff.newValue}
                </span>
              </div>
              <div className="sm:col-span-4 flex items-center justify-between sm:justify-end gap-2">
                <span className="text-[11px] text-slate-600 dark:text-slate-300">
                  {b(diff.messageBn, diff.messageEn, lang)}
                </span>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                    diff.valid
                      ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300'
                  }`}
                >
                  {diff.valid ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  <span>{b(diff.statusLabelBn, diff.statusLabelEn, lang)}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          data-testid="rtdb-push-update-btn"
          disabled={syncBusy}
          onClick={() => void handlePushSelfUpdate()}
          className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncBusy ? 'animate-spin' : ''}`} />
          <span>
            {b(
              'সাথে সাথে Realtime Database-এ আপডেট করুন',
              'Update Live to Realtime Database',
              lang
            )}
          </span>
        </button>

        <button
          type="button"
          data-testid="rtdb-toggle-rules-btn"
          onClick={() => setRulesVisible((v) => !v)}
          className="h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {rulesVisible
            ? b('RTDB Rules লুকান', 'Hide RTDB Rules', lang)
            : b('Realtime Database Rules দেখুন / কপি করুন', 'View / Copy Realtime Database Rules', lang)}
        </button>
      </div>

      {syncMessage && (
        <div
          data-testid="rtdb-sync-success"
          className="rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-100/80 dark:bg-emerald-950/50 px-3 py-2 text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {rtdbError && (
        <div
          data-testid="rtdb-sync-error"
          className="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{rtdbError}</span>
        </div>
      )}

      {/* Super Central Admin: Live RTDB User Stream */}
      {role === 'central_admin' && liveAllUsers.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white">
            {b('RTDB লাইভ ইউজার তালিকা (সাথে সাথে পরিবর্তন)', 'RTDB Live Users (Instant Updates)', lang)} ({liveAllUsers.length})
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
            {liveAllUsers.map((u) => {
              const isActive = u.status === 'active';
              return (
                <div key={u.uid} className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {u.displayName} <span className="font-mono text-[11px] text-slate-500">({u.role})</span>
                    </div>
                    <div className="text-[11px] text-slate-500">{u.email} {u.phone ? `· ${u.phone}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        isActive
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                      }`}
                    >
                      {u.status}
                    </span>
                    <button
                      type="button"
                      disabled={syncBusy}
                      onClick={() =>
                        void handleAdminUpdateUser(u, { status: isActive ? 'suspended' : 'active' })
                      }
                      className="h-7 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {isActive ? b('ব্লক করুন', 'Suspend', lang) : b('সক্রিয় করুন', 'Activate', lang)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Change Logs */}
      {changeLogs.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-blue-600" />
            <span>{b('RTDB তাৎক্ষণিক পরিবর্তনের লগ', 'RTDB Live Change History', lang)}</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-40 overflow-y-auto">
            {changeLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="px-3.5 py-2 text-[11px] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{log.field}:</span>{' '}
                  <span className="text-slate-500 line-through">{log.oldValue}</span> →{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">{log.newValue}</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                  {log.validationStatus === 'valid' ? '✓ সঠিক' : '✗ ভুল'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Copyable Realtime Database Rules */}
      {rulesVisible && (
        <div
          data-testid="rtdb-rules-viewer"
          className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-900 text-slate-100 p-3 space-y-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold text-emerald-300">
              {b(
                'Firebase Console > Realtime Database > Rules-এ পেস্ট করুন (database.rules.json)',
                'Paste into Firebase Console > Realtime Database > Rules (database.rules.json)',
                lang
              )}
            </div>
            <button
              type="button"
              data-testid="rtdb-copy-rules-btn"
              onClick={() => void handleCopyRules()}
              className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              {copiedRules ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copiedRules ? b('কপি হয়েছে!', 'Copied!', lang) : b('Rules কপি করুন', 'Copy Rules', lang)}</span>
            </button>
          </div>
          <pre className="text-[11px] font-mono overflow-x-auto max-h-60 text-slate-200 leading-relaxed">
            {REALTIME_DATABASE_RULES_JSON}
          </pre>
        </div>
      )}
    </div>
  );
};
