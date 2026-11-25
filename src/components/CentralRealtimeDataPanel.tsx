import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Database,
  RefreshCw,
  Send,
  ShieldCheck,
  Users,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';
import type { Language, SchoolRecord } from '../types';
import { b } from '../i18n/translations';
import {
  auth,
  getActiveFirebaseProjectInfo,
  sendRealtimeSyncTestProbe,
  subscribeRealtimeAllUsers,
  subscribeRealtimeSyncTestProbe,
  subscribeRtdbConnectionStatus,
  updateRealtimeUserAccount,
} from '../firebase';
import {
  REALTIME_DATABASE_RULES_JSON,
  validateRealtimeUserAccountUpdate,
  type RealtimeSyncTestProbe,
  type RealtimeUserAccountRecord,
  type RealtimeUserRole,
  type RealtimeUserStatus,
} from '../utils/realtimeDatabaseSync';

export interface CentralRealtimeDataPanelProps {
  lang: Language;
  schools: SchoolRecord[];
  onRefreshAudit?: (what: string, targetName: string, oldValue: string, newValue: string) => void;
}

export const CentralRealtimeDataPanel: React.FC<CentralRealtimeDataPanelProps> = ({
  lang,
  schools,
  onRefreshAudit,
}) => {
  const projectInfo = getActiveFirebaseProjectInfo();
  const firebaseUser = auth.currentUser;

  const [rtdbConnected, setRtdbConnected] = useState(false);
  const [liveUsers, setLiveUsers] = useState<RealtimeUserAccountRecord[]>([]);
  const [probeMessage, setProbeMessage] = useState('PSMS Live Sync Verification');
  const [probeBusy, setProbeBusy] = useState(false);
  const [latestProbe, setLatestProbe] = useState<RealtimeSyncTestProbe | null>(null);
  const [probeReceivedAtMs, setProbeReceivedAtMs] = useState<number | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Live edit form for testing/updating any user in RTDB
  const [selectedUid, setSelectedUid] = useState<string>('');
  const [editName, setEditName] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editRole, setEditRole] = useState<RealtimeUserRole>('teacher');
  const [editStatus, setEditStatus] = useState<RealtimeUserStatus>('active');
  const [editSchoolId, setEditSchoolId] = useState<string>('');
  const [editBusy, setEditBusy] = useState<boolean>(false);

  const [showRules, setShowRules] = useState<boolean>(false);
  const [copiedRules, setCopiedRules] = useState<boolean>(false);

  useEffect(() => {
    const unsubConn = subscribeRtdbConnectionStatus(setRtdbConnected);
    return () => unsubConn();
  }, []);

  useEffect(() => {
    if (!firebaseUser?.uid || !firebaseUser.emailVerified) {
      setLiveUsers([]);
      setLatestProbe(null);
      return;
    }

    const unsubUsers = subscribeRealtimeAllUsers(
      (users) => {
        setLiveUsers(users);
        if (!selectedUid && users.length > 0) {
          const first = users[0];
          setSelectedUid(first.uid);
          setEditName(first.displayName);
          setEditEmail(first.email);
          setEditPhone(first.phone ?? '');
          setEditRole(first.role);
          setEditStatus(first.status);
          setEditSchoolId(first.schoolId ?? '');
        }
      },
      (err) => {
        setStatusFeedback({ type: 'error', text: err });
      }
    );

    const unsubProbe = subscribeRealtimeSyncTestProbe(
      firebaseUser.uid,
      (probe) => {
        if (probe) {
          setLatestProbe(probe);
          setProbeReceivedAtMs(Date.now());
        }
      },
      () => {}
    );

    return () => {
      unsubUsers();
      unsubProbe();
    };
  }, [firebaseUser?.uid, firebaseUser?.emailVerified]);

  const selectedCurrentRecord: Partial<RealtimeUserAccountRecord> = useMemo(() => {
    const match = liveUsers.find((u) => u.uid === selectedUid);
    if (match) return match;
    return {
      uid: selectedUid || firebaseUser?.uid || 'test-uid',
      displayName: firebaseUser?.displayName || 'Super Central Admin',
      email: firebaseUser?.email || 'mominkhan404586@gmail.com',
      phone: '',
      role: 'central_admin',
      status: 'active',
      schoolId: '',
    };
  }, [liveUsers, selectedUid, firebaseUser]);

  const editValidation = useMemo(
    () =>
      validateRealtimeUserAccountUpdate(selectedCurrentRecord, {
        displayName: editName || selectedCurrentRecord.displayName || '',
        email: editEmail || selectedCurrentRecord.email || '',
        phone: editPhone,
        role: editRole,
        status: editStatus,
        schoolId: editSchoolId,
      }),
    [selectedCurrentRecord, editName, editEmail, editPhone, editRole, editStatus, editSchoolId]
  );

  const handleSelectUserForEdit = (u: RealtimeUserAccountRecord) => {
    setSelectedUid(u.uid);
    setEditName(u.displayName);
    setEditEmail(u.email);
    setEditPhone(u.phone ?? '');
    setEditRole(u.role);
    setEditStatus(u.status);
    setEditSchoolId(u.schoolId ?? '');
    setStatusFeedback(null);
  };

  const handleSendTestPing = async () => {
    setStatusFeedback(null);
    setProbeBusy(true);
    try {
      const res = await sendRealtimeSyncTestProbe(probeMessage);
      if (res.ok && res.probe) {
        setStatusFeedback({
          type: 'success',
          text: b(
            `লাইভ টেস্ট পিং (${res.probe.probeId}) Realtime Database-এ পাঠানো হয়েছে। নিচের Live Probe-এ তাৎক্ষণিক ফলাফল দেখুন।`,
            `Live test ping (${res.probe.probeId}) sent to Realtime Database. Watch Live Probe feedback below.`,
            lang
          ),
        });
        onRefreshAudit?.(
          'RTDB Live Sync Probe',
          projectInfo.databaseURL,
          'Idle',
          `${res.probe.probeId} · ${res.probe.message}`
        );
      } else if (res.errorCode === 'AUTH_REQUIRED') {
        setStatusFeedback({
          type: 'error',
          text: b(
            'লাইভ RTDB রাইট টেস্ট চালাতে Verified Firebase Google বা Email অ্যাকাউন্টে লগইন থাকা প্রয়োজন।',
            'Please sign in with a verified Firebase Google or Email account to run live RTDB write probes.',
            lang
          ),
        });
      } else if (res.errorCode === 'PERMISSION_DENIED') {
        setStatusFeedback({
          type: 'error',
          text: b(
            'PERMISSION_DENIED: Firebase Console → Realtime Database → Rules-এ database.rules.json Publish করুন।',
            'PERMISSION_DENIED: Publish database.rules.json in Firebase Console → Realtime Database → Rules.',
            lang
          ),
        });
      } else {
        setStatusFeedback({
          type: 'error',
          text: res.errorMessage || b('টেস্ট পিং পাঠানো যায়নি।', 'Failed to send sync probe.', lang),
        });
      }
    } finally {
      setProbeBusy(false);
    }
  };

  const handlePushUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusFeedback(null);
    const targetUid = selectedUid || firebaseUser?.uid || '';
    if (!targetUid) {
      setStatusFeedback({
        type: 'error',
        text: b(
          'কোনো Verified Firebase ইউজার নির্বাচিত নেই।',
          'No verified Firebase user selected.',
          lang
        ),
      });
      return;
    }

    if (!editValidation.valid) {
      setStatusFeedback({
        type: 'error',
        text: b(
          `${editValidation.invalidCount}টি ইনপুট ভুল রয়েছে। লাল চিহ্নিত ঘরগুলো ঠিক করুন।`,
          `${editValidation.invalidCount} field(s) are invalid. Fix the highlighted errors.`,
          lang
        ),
      });
      return;
    }

    setEditBusy(true);
    try {
      const res = await updateRealtimeUserAccount(targetUid, selectedCurrentRecord, {
        displayName: editValidation.normalized.displayName,
        email: editValidation.normalized.email,
        phone: editValidation.normalized.phone,
        role: editValidation.normalized.role,
        status: editValidation.normalized.status,
        schoolId: editSchoolId.trim(),
      });
      if (res.ok) {
        setStatusFeedback({
          type: 'success',
          text: b(
            `ইউজার (${editValidation.normalized.displayName}) RTDB ও সেশনে সাথে সাথে আপডেট হয়েছে!`,
            `User (${editValidation.normalized.displayName}) updated live in RTDB and session!`,
            lang
          ),
        });
        onRefreshAudit?.(
          'RTDB Admin Live Profile Update',
          editValidation.normalized.email,
          String(selectedCurrentRecord.role ?? 'pending'),
          `${editValidation.normalized.role} (${editValidation.normalized.status})`
        );
      } else {
        setStatusFeedback({
          type: 'error',
          text:
            res.errorCode === 'PERMISSION_DENIED'
              ? b(
                  'PERMISSION_DENIED: Firebase Console-এ database.rules.json Publish করুন।',
                  'PERMISSION_DENIED: Publish database.rules.json in Firebase Console.',
                  lang
                )
              : res.errorMessage || 'RTDB update failed.',
        });
      }
    } finally {
      setEditBusy(false);
    }
  };

  const handleCopyRules = async () => {
    try {
      await navigator.clipboard.writeText(REALTIME_DATABASE_RULES_JSON);
      setCopiedRules(true);
      setTimeout(() => setCopiedRules(false), 2500);
    } catch {
      setCopiedRules(false);
    }
  };

  const latencyMs =
    latestProbe && probeReceivedAtMs
      ? Math.max(1, probeReceivedAtMs - latestProbe.clientSentAtMs)
      : null;

  return (
    <div data-testid="central-rtdb-data-panel" className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            <span>
              {b(
                'Firebase ডেটা ও Realtime Database লাইভ সিঙ্ক প্যানেল',
                'Firebase Data Management & Live RTDB Sync Panel',
                lang
              )}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {b(
              'রিয়েল-টাইম ডাটাবেজ সংযোগ পরীক্ষা, তাৎক্ষণিক প্রোফাইল সিঙ্ক এবং রোল/স্কুল-ভিত্তিক নিরাপত্তা নিয়ম পরিচালনা করুন।',
              'Test live Firebase Realtime Database sync, manage user profiles/roles in real time, and review role-scoped rules.',
              lang
            )}
          </p>
        </div>

        <span
          data-testid="central-rtdb-conn-badge"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
            rtdbConnected
              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
          }`}
        >
          {rtdbConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span>
            {rtdbConnected
              ? b('RTDB সংযুক্ত (Live)', 'RTDB Connected (Live)', lang)
              : b('RTDB সংযোগ অপেক্ষমাণ', 'RTDB Connecting', lang)}
          </span>
        </span>
      </div>

      {/* Endpoint Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-[11px] font-semibold text-slate-500">Firebase Project</div>
          <div className="font-mono font-bold text-slate-900 dark:text-white mt-1">
            {projectInfo.projectId}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-[11px] font-semibold text-slate-500">Cloud Firestore Database</div>
          <div className="font-mono font-bold text-slate-900 dark:text-white mt-1 break-all">
            {projectInfo.databaseId}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-[11px] font-semibold text-slate-500">Realtime Database URL</div>
          <div className="font-mono font-bold text-emerald-700 dark:text-emerald-300 mt-1 break-all">
            {projectInfo.databaseURL}
          </div>
        </div>
      </div>

      {statusFeedback && (
        <div
          data-testid="central-rtdb-feedback"
          className={`rounded-xl border px-4 py-3 text-xs font-semibold flex items-center gap-2 ${
            statusFeedback.type === 'success'
              ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200'
              : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
          }`}
        >
          {statusFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusFeedback.text}</span>
        </div>
      )}

      {/* Live Sync Test Probe Card */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>{b('লাইভ RTDB সিঙ্ক টেস্ট (Round-Trip Sync Test)', 'Live RTDB Sync Probe Test', lang)}</span>
          </div>
          {latestProbe && (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold">
              {b('সর্বশেষ পিং সিঙ্ক সম্পন্ন ✓', 'Last Probe Synced ✓', lang)}
              {latencyMs !== null ? ` (${latencyMs}ms)` : ''}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5">
          <input
            type="text"
            data-testid="central-rtdb-probe-input"
            value={probeMessage}
            onChange={(e) => setProbeMessage(e.target.value)}
            placeholder={b('টেস্ট বার্তা লিখুন...', 'Enter live sync test message...', lang)}
            className="flex-1 min-w-[220px] h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
          />
          <button
            type="button"
            data-testid="central-rtdb-send-probe-btn"
            disabled={probeBusy}
            onClick={() => void handleSendTestPing()}
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{b('লাইভ টেস্ট পিং পাঠান', 'Send Live Test Ping', lang)}</span>
          </button>
        </div>

        {latestProbe ? (
          <div
            data-testid="central-rtdb-probe-result"
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 text-xs grid grid-cols-1 sm:grid-cols-3 gap-2"
          >
            <div>
              <span className="text-slate-500">Probe ID:</span>{' '}
              <span className="font-mono font-bold text-slate-900 dark:text-white">{latestProbe.probeId}</span>
            </div>
            <div>
              <span className="text-slate-500">Message:</span>{' '}
              <span className="font-semibold text-slate-900 dark:text-white">{latestProbe.message}</span>
            </div>
            <div>
              <span className="text-slate-500">Actor:</span>{' '}
              <span className="font-mono text-slate-700 dark:text-slate-300">{latestProbe.actorEmail || latestProbe.actorUid}</span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {firebaseUser?.emailVerified
              ? b(
                  'লাইভ সিঙ্ক যাচাই করতে "লাইভ টেস্ট পিং পাঠান" বাটনে ক্লিক করুন।',
                  'Click "Send Live Test Ping" to verify live RTDB write + onValue listener sync.',
                  lang
                )
              : b(
                  'ডেমো অ্যাডমিন মোডে আছেন। রিয়েল-টাইম ডাটাবেজে লাইভ পিং লিখতে Verified Firebase (mominkhan404586@gmail.com) দিয়ে সাইন-ইন করুন।',
                  'Running in portal preview mode. Sign in with verified Firebase Auth (mominkhan404586@gmail.com) to execute live RTDB writes.',
                  lang
                )}
          </div>
        )}
      </div>

      {/* Live Users Table + Live Profile Editor */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              <span>{b('RTDB লাইভ ইউজার তালিকা', 'Live RTDB Users Directory', lang)} ({liveUsers.length})</span>
            </div>
          </div>
          {liveUsers.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              {b(
                'Verified Firebase Auth সেশন সক্রিয় হলে এখানে রিয়েল-টাইম ইউজার তালিকা দেখা যাবে।',
                'Live RTDB user records appear here when signed in with verified Firebase Auth.',
                lang
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
              {liveUsers.map((u) => (
                <div
                  key={u.uid}
                  className={`px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs ${
                    selectedUid === u.uid ? 'bg-blue-50/70 dark:bg-blue-950/25' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {u.displayName}{' '}
                      <span className="font-mono text-[11px] text-slate-500">({u.role})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {u.email} {u.schoolId ? `· School: ${u.schoolId}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        u.status === 'active'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                      }`}
                    >
                      {u.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectUserForEdit(u)}
                      className="h-7 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {b('সম্পাদনা / টেস্ট', 'Edit / Sync', lang)}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Account Update Form + Validation Diff */}
        <form
          onSubmit={(e) => void handlePushUserEdit(e)}
          className="xl:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{b('তাৎক্ষণিক ইউজার আপডেট ও সঠিক/ভুল যাচাই', 'Live User Update & Validation Check', lang)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold">
              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                {b(`সঠিক: ${editValidation.validCount}`, `Valid: ${editValidation.validCount}`, lang)}
              </span>
              <span
                className={`px-2 py-0.5 rounded ${
                  editValidation.invalidCount > 0
                    ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {b(`ভুল: ${editValidation.invalidCount}`, `Invalid: ${editValidation.invalidCount}`, lang)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {b('প্রদর্শিত নাম', 'Display Name', lang)}
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={String(selectedCurrentRecord.displayName ?? '')}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {b('ইমেইল', 'Email', lang)}
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder={String(selectedCurrentRecord.email ?? '')}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {b('মোবাইল নম্বর', 'Mobile Phone', lang)}
              </label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {b('নির্ধারিত বিদ্যালয় (School ID)', 'Assigned School ID', lang)}
              </label>
              <select
                value={editSchoolId}
                onChange={(e) => setEditSchoolId(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="">{b('সকল / কেন্দ্রীয় (Global)', 'Global / Unassigned', lang)}</option>
                {schools.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.code} — {b(sc.nameBn, sc.nameEn, lang)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {b('রোল (Role)', 'Role', lang)}
              </label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as RealtimeUserRole)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="central_admin">central_admin</option>
                <option value="school_admin">school_admin</option>
                <option value="teacher">teacher</option>
                <option value="student">student</option>
                <option value="guardian">guardian</option>
                <option value="pending">pending</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {b('স্ট্যাটাস (Status)', 'Status', lang)}
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as RealtimeUserStatus)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="active">active</option>
                <option value="pending">pending</option>
                <option value="suspended">suspended</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {editValidation.fieldDiffs.map((d) => (
              <span
                key={d.field}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                  d.valid
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300'
                }`}
              >
                {d.valid ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {b(d.labelBn, d.labelEn, lang)}
              </span>
            ))}
          </div>

          <button
            type="submit"
            disabled={editBusy}
            className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${editBusy ? 'animate-spin' : ''}`} />
            <span>
              {b(
                'RTDB-তে আপডেট পুশ করুন (সাথে সাথে সেশন আপডেট হবে)',
                'Push Live Update to RTDB & Session',
                lang
              )}
            </span>
          </button>
        </form>
      </div>

      {/* Role + School/Profile-ID Security Rules Matrix + JSON Viewer */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {b(
                'রোল ও স্কুল/প্রোফাইল আইডি ভিত্তিক Realtime Database Rules',
                'Role & School/Profile-ID Scoped Realtime Database Rules',
                lang
              )}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {b(
                'Admin, Teacher, Student এবং Guardian শুধুমাত্র নিজস্ব নির্ধারিত বিদ্যালয় (schoolId) ও প্রোফাইল আইডি (uid/teacherId/studentId)-এর ডেটা অ্যাক্সেস করতে পারবে।',
                'Admin, Teacher, Student, and Guardian can only read/write data scoped to their assigned schoolId and profile ID.',
                lang
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="central-rtdb-toggle-rules-btn"
              onClick={() => setShowRules((v) => !v)}
              className="h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {showRules
                ? b('Rules JSON লুকান', 'Hide Rules JSON', lang)
                : b('Rules JSON দেখুন / কপি করুন', 'View / Copy Rules JSON', lang)}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
          {[
            {
              role: 'Central / School Admin',
              scopeBn: 'Super Admin: সকল স্কুল; School Admin: শুধু নিজ schoolId-এর শিক্ষক/শিক্ষার্থী/হাজিরা/ফলাফল।',
              scopeEn: 'Super Admin: global; School Admin: strictly assigned schoolId scope.',
            },
            {
              role: 'Teacher',
              scopeBn: 'নিজ schoolId-এর শ্রেণি/হাজিরা/ফলাফল ও শুধু নিজ teacherId প্রোফাইল।',
              scopeEn: 'Assigned schoolId attendance/results & own teacherId profile only.',
            },
            {
              role: 'Student',
              scopeBn: 'শুধু নিজ schoolId ও নিজ studentId-এর প্রোফাইল, হাজিরা, ফলাফল ও নোটিশ।',
              scopeEn: 'Strictly own studentId profile, attendance, results & school notices.',
            },
            {
              role: 'Guardian',
              scopeBn: 'শুধু নিজ সংযুক্ত সন্তানের studentId ও নির্ধারিত schoolId-এর তথ্য।',
              scopeEn: 'Strictly linked child studentId & assigned schoolId records.',
            },
          ].map((item) => (
            <div
              key={item.role}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3"
            >
              <div className="font-bold text-slate-900 dark:text-white">{item.role}</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                {b(item.scopeBn, item.scopeEn, lang)}
              </div>
            </div>
          ))}
        </div>

        {showRules && (
          <div className="rounded-xl bg-slate-900 text-slate-100 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-emerald-300">database.rules.json</span>
              <button
                type="button"
                onClick={() => void handleCopyRules()}
                className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedRules ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedRules ? b('কপি হয়েছে!', 'Copied!', lang) : b('Rules কপি করুন', 'Copy Rules', lang)}</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono overflow-x-auto max-h-72 text-slate-200 leading-relaxed">
              {REALTIME_DATABASE_RULES_JSON}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
