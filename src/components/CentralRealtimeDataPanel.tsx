import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Ban,
  Check,
  CheckCircle2,
  Cloud,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileUp,
  Flame,
  HardDrive,
  History,
  Lock,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  Wifi,
  WifiOff,
  XCircle,
  Zap,
} from 'lucide-react';
import type { Language, Role, SchoolRecord, StudentRecord, TeacherRecord } from '../types';
import { b } from '../i18n/translations';
import {
  auth,
  getActiveFirebaseProjectInfo,
  getFirebaseAppCheckStatus,
  sendRealtimeSyncTestProbe,
  subscribeRealtimeAllUsers,
  subscribeRealtimeSyncTestProbe,
  subscribeRtdbConnectionStatus,
  updateRealtimeUserAccount,
  type FirestoreUserProfile,
} from '../firebase';
import {
  executeClientCascadeDelete,
  reviewApplicationAndUserInFirestore,
  subscribeFirestoreActivityLogs,
  subscribeFirestoreApplications,
  subscribeFirestoreUsers,
  type FirestoreActivityLogRecord,
  type FirestoreApplicationRecord,
} from '../firebaseCollections';
import { deleteStorageObject, uploadFileToStorage } from '../firebaseStorage';
import type { ApprovalDecision, StorageAssetCategory } from '../utils/firebaseDataSync';
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
  teachers?: TeacherRecord[];
  students?: StudentRecord[];
  onDeleteSchool?: (schoolId: string, reason: string) => void;
  onRefreshAudit?: (what: string, targetName: string, oldValue: string, newValue: string) => void;
  onRtdbUserUpdated?: (record: RealtimeUserAccountRecord) => void;
}

export const CentralRealtimeDataPanel: React.FC<CentralRealtimeDataPanelProps> = ({
  lang,
  schools,
  teachers = [],
  students = [],
  onDeleteSchool,
  onRefreshAudit,
  onRtdbUserUpdated,
}) => {
  const projectInfo = getActiveFirebaseProjectInfo();
  const appCheckStatus = getFirebaseAppCheckStatus();
  const firebaseUser = auth.currentUser;

  const [rtdbConnected, setRtdbConnected] = useState(false);
  const [liveUsers, setLiveUsers] = useState<RealtimeUserAccountRecord[]>([]);
  const [firestoreUsers, setFirestoreUsers] = useState<FirestoreUserProfile[]>([]);
  const [firestoreApps, setFirestoreApps] = useState<FirestoreApplicationRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<FirestoreActivityLogRecord[]>([]);

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

  // Approval Queue & Cascade Delete state
  const [approvalSchoolOverride, setApprovalSchoolOverride] = useState<Record<string, string>>({});
  const [approvalRoleOverride, setApprovalRoleOverride] = useState<Record<string, Role>>({});
  const [queueBusyId, setQueueBusyId] = useState<string | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    targetType: 'user' | 'school' | 'teacher' | 'student';
    targetId: string;
    label: string;
    schoolId?: string;
  } | null>(null);

  // Firebase Storage Upload Tester state
  const storageFileInputRef = useRef<HTMLInputElement | null>(null);
  const [storageCategory, setStorageCategory] = useState<StorageAssetCategory>('documents');
  const [storageScopeId, setStorageScopeId] = useState<string>('');
  const [storageBusy, setStorageBusy] = useState(false);
  const [uploadedAsset, setUploadedAsset] = useState<{
    url: string;
    path: string;
    assetId?: string;
    contentType?: string;
    sizeBytes?: number;
  } | null>(null);

  const [showRules, setShowRules] = useState<boolean>(false);
  const [copiedRules, setCopiedRules] = useState<boolean>(false);

  useEffect(() => {
    const unsubConn = subscribeRtdbConnectionStatus(setRtdbConnected);
    return () => unsubConn();
  }, []);

  useEffect(() => {
    if (!firebaseUser?.uid || !firebaseUser.emailVerified) {
      setLiveUsers([]);
      setFirestoreUsers([]);
      setFirestoreApps([]);
      setActivityLogs([]);
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

    const unsubFsUsers = subscribeFirestoreUsers(setFirestoreUsers);
    const unsubFsApps = subscribeFirestoreApplications(setFirestoreApps);
    const unsubActivity = subscribeFirestoreActivityLogs(setActivityLogs);

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
      unsubFsUsers();
      unsubFsApps();
      unsubActivity();
      unsubProbe();
    };
  }, [firebaseUser?.uid, firebaseUser?.emailVerified]);

  const selectedCurrentRecord: Partial<RealtimeUserAccountRecord> = useMemo(() => {
    const match = liveUsers.find((u) => u.uid === selectedUid);
    if (match) return match;
    const fsMatch = firestoreUsers.find((u) => u.uid === selectedUid);
    if (fsMatch) {
      return {
        uid: fsMatch.uid,
        displayName: fsMatch.displayName,
        email: fsMatch.email,
        phone: fsMatch.phone ?? '',
        role: fsMatch.role,
        status: fsMatch.status,
        schoolId: fsMatch.schoolId ?? '',
        teacherId: fsMatch.teacherId,
        studentId: fsMatch.studentId,
      };
    }
    return {
      uid: selectedUid || firebaseUser?.uid || 'test-uid',
      displayName: firebaseUser?.displayName || 'Super Central Admin',
      email: firebaseUser?.email || 'mominkhan404586@gmail.com',
      phone: '',
      role: 'central_admin',
      status: 'active',
      schoolId: '',
    };
  }, [liveUsers, firestoreUsers, selectedUid, firebaseUser]);

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
        onRtdbUserUpdated?.({
          uid: targetUid,
          displayName: editValidation.normalized.displayName,
          email: editValidation.normalized.email,
          phone: editValidation.normalized.phone,
          recoveryEmail: editValidation.normalized.recoveryEmail,
          recoveryPhone: editValidation.normalized.recoveryPhone,
          role: editValidation.normalized.role,
          status: editValidation.normalized.status,
          isActive: editValidation.normalized.status === 'active',
          schoolId: editSchoolId.trim() || selectedCurrentRecord.schoolId,
          teacherId: selectedCurrentRecord.teacherId,
          studentId: selectedCurrentRecord.studentId,
          updatedAt: Date.now(),
        });
        setStatusFeedback({
          type: 'success',
          text: b(
            `ইউজার (${editValidation.normalized.displayName}) RTDB, Firestore ও ডিসপ্লেতে সাথে সাথে আপডেট হয়েছে!`,
            `User (${editValidation.normalized.displayName}) updated live across RTDB, Firestore, and UI display!`,
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
        if (res.errorCode === 'PERMISSION_DENIED') {
          setShowRules(true);
        }
        setStatusFeedback({
          type: 'error',
          text:
            res.errorCode === 'PERMISSION_DENIED'
              ? b(
                  'PERMISSION_DENIED: নিচের আপডেটেড database.rules.json কপি করে Firebase Console > Realtime Database > Rules-এ Publish করুন।',
                  'PERMISSION_DENIED: Copy and publish the updated database.rules.json below in Firebase Console > Realtime Database > Rules.',
                  lang
                )
              : res.errorMessage || 'RTDB update failed.',
        });
      }
    } finally {
      setEditBusy(false);
    }
  };

  const handleApprovalDecision = async (params: {
    targetUid: string;
    applicationId?: string;
    decision: ApprovalDecision;
    role: Role | 'pending';
    schoolId?: string;
  }) => {
    setQueueBusyId(params.targetUid + (params.applicationId ?? ''));
    setStatusFeedback(null);
    try {
      const res = await reviewApplicationAndUserInFirestore({
        targetUid: params.targetUid,
        applicationId: params.applicationId,
        decision: params.decision,
        role: params.role,
        schoolId: params.schoolId,
        actorRole: 'central_admin',
      });
      setStatusFeedback({
        type: res.ok ? 'success' : 'error',
        text: res.message,
      });
      if (res.ok) {
        onRefreshAudit?.(
          `Cloud Approval (${params.decision})`,
          params.targetUid,
          String(params.role),
          `${params.decision}${res.usedCloudFunction ? ' · Cloud Function' : ' · Firestore+RTDB'}`
        );
      }
    } catch (err) {
      setStatusFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setQueueBusyId(null);
    }
  };

  const handleConfirmCascadeDelete = async () => {
    if (!deleteConfirmTarget) return;
    setQueueBusyId(deleteConfirmTarget.targetId);
    setStatusFeedback(null);
    try {
      const outcome = await executeClientCascadeDelete({
        targetType: deleteConfirmTarget.targetType,
        targetId: deleteConfirmTarget.targetId,
        schoolId: deleteConfirmTarget.schoolId,
        reason: 'Super Central Admin permanent cascade cleanup',
        actorRole: 'central_admin',
      });
      if (deleteConfirmTarget.targetType === 'school') {
        onDeleteSchool?.(deleteConfirmTarget.targetId, 'Cascade deleted from Cloud Management Panel');
      }
      setStatusFeedback({
        type: outcome.ok ? 'success' : 'error',
        text: outcome.ok
          ? b(
              `স্থায়ী ক্যাসকেড ডিলিট সম্পন্ন: ${deleteConfirmTarget.label} (${outcome.deletedPaths.length} পাথ)`,
              `Permanent cascade delete completed for ${deleteConfirmTarget.label} (${outcome.deletedPaths.length} paths cleaned).`,
              lang
            )
          : b('ক্যাসকেড ডিলিটের জন্য ভেরিফায়েড অ্যাডমিন সেশন প্রয়োজন।', 'Verified Firebase Admin session required.', lang),
      });
    } finally {
      setDeleteConfirmTarget(null);
      setQueueBusyId(null);
    }
  };

  const handleStorageUploadFile = async (file: File) => {
    setStorageBusy(true);
    setStatusFeedback(null);
    try {
      const scope =
        storageScopeId.trim() ||
        (storageCategory === 'school_covers' ? schools[0]?.id : firebaseUser?.uid) ||
        'shared';
      const result = await uploadFileToStorage({
        file,
        category: storageCategory,
        scopeId: scope,
      });
      if (result.ok && result.url && result.path) {
        setUploadedAsset({
          url: result.url,
          path: result.path,
          assetId: result.assetId,
          contentType: result.contentType,
          sizeBytes: result.sizeBytes,
        });
        setStatusFeedback({
          type: 'success',
          text: b(
            `ফ্রি Firestore মিডিয়া ভল্টে সংরক্ষিত হয়েছে: ${result.path}`,
            `Saved to Free Firestore Media Vault: ${result.path}`,
            lang
          ),
        });
        onRefreshAudit?.('Firestore Media Vault Upload', result.path, 'Local File', 'Spark Media Asset');
      } else {
        setStatusFeedback({
          type: 'error',
          text: b(
            result.errorBn ?? 'মিডিয়া সংরক্ষণ ব্যর্থ হয়েছে।',
            result.errorEn ?? 'Media save failed.',
            lang
          ),
        });
      }
    } finally {
      setStorageBusy(false);
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

  const handleDownloadRules = () => {
    const blob = new Blob([REALTIME_DATABASE_RULES_JSON + '\n'], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'database.rules.json';
    a.click();
    URL.revokeObjectURL(url);
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
                'Firebase ফ্রি Spark প্ল্যান ও লাইভ সিঙ্ক কন্ট্রোল প্যানেল',
                'Firebase Free Spark Plan & Live Sync Control Panel',
                lang
              )}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {b(
              '১০০% ফ্রি Spark প্ল্যান (কোনো পেমেন্ট বা Blaze ছাড়াই): Auth, Firestore (১৮ কালেকশন), Realtime DB, ফ্রি মিডিয়া ভল্ট ও App Check পরিচালনা করুন।',
              '100% Free Spark Plan ($0 / No Billing): Manage Auth, Firestore (18 collections), Realtime DB, Free Media Vault & App Check.',
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

      {/* 6-Service Firebase Health Grid */}
      <div
        data-testid="firebase-six-service-health-grid"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs"
      >
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              Firebase Authentication
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                firebaseUser?.emailVerified
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
              }`}
            >
              {firebaseUser?.emailVerified ? 'Verified ✓' : 'Portal Preview'}
            </span>
          </div>
          <div className="font-mono font-bold text-slate-900 dark:text-white truncate">
            {firebaseUser?.email || projectInfo.projectId}
          </div>
          <div className="text-[11px] text-slate-500 truncate">
            {firebaseUser?.uid ? `UID: ${firebaseUser.uid}` : b('লগইন: ডেমো / পোর্টাল মোড', 'Session: Portal Demo Mode', lang)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              Cloud Firestore
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              18 Collections · Free
            </span>
          </div>
          <div className="font-mono font-bold text-slate-900 dark:text-white truncate">
            {projectInfo.databaseId}
          </div>
          <div className="text-[11px] text-slate-500">
            {b(
              `স্কুল: ${schools.length} · শিক্ষক: ${teachers.length} · শিক্ষার্থী: ${students.length}`,
              `Schools: ${schools.length} · Teachers: ${teachers.length} · Students: ${students.length}`,
              lang
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              Realtime Database
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                rtdbConnected
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {rtdbConnected ? 'Live WebSocket' : 'Standby'}
            </span>
          </div>
          <div className="font-mono font-bold text-emerald-700 dark:text-emerald-300 truncate">
            {projectInfo.databaseURL.replace('https://', '')}
          </div>
          <div className="text-[11px] text-slate-500">
            {b(`লাইভ ইউজার: ${liveUsers.length}`, `Live RTDB Users: ${liveUsers.length}`, lang)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
              Firestore Media Vault
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              Free Spark $0
            </span>
          </div>
          <div className="font-mono font-bold text-slate-900 dark:text-white truncate">
            {projectInfo.mediaCollection}
          </div>
          <div className="text-[11px] text-slate-500">
            {b('কম্প্রেসড ছবি ও PDF (বিনা খরচে সংরক্ষণ)', 'Auto-compressed Images & <=450KB PDFs ($0)', lang)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              Firebase App Check
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                appCheckStatus.configured
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {appCheckStatus.configured ? appCheckStatus.mode : 'Free Optional'}
            </span>
          </div>
          <div className="font-mono font-bold text-slate-900 dark:text-white truncate">
            {appCheckStatus.siteKeyMasked}
          </div>
          <div className="text-[11px] text-slate-500">
            {appCheckStatus.configured
              ? b('reCAPTCHA v3 / Debug Token সক্রিয়', 'App Check protection enabled', lang)
              : b('ঐচ্ছিক: ফ্রি reCAPTCHA v3 কী যোগ করুন', 'Optional: add free reCAPTCHA v3 site key', lang)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500 flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-emerald-600" />
              Spark Direct Sync Rules
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              Active ($0)
            </span>
          </div>
          <div className="font-mono font-bold text-slate-900 dark:text-white truncate">
            {projectInfo.billingPlan}
          </div>
          <div className="text-[11px] text-slate-500">
            {b('কোনো পেইড Cloud Function ছাড়াই সরাসরি অনুমোদন ও ডিলিট', 'Direct RBAC approval & delete without Blaze billing', lang)}
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

      {/* Permanent Cascade Delete Confirmation Banner */}
      {deleteConfirmTarget && (
        <div
          data-testid="cascade-delete-confirm-box"
          className="rounded-2xl border-2 border-red-400 dark:border-red-700 bg-red-50 dark:bg-red-950/40 p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
        >
          <div className="space-y-0.5">
            <div className="font-extrabold text-red-800 dark:text-red-200">
              {b(
                `সতর্কতা: স্থায়ী ক্যাসকেড ডিলিট নিশ্চিত করুন (${deleteConfirmTarget.label})`,
                `Confirm Permanent Cascade Delete (${deleteConfirmTarget.label})`,
                lang
              )}
            </div>
            <p className="text-red-700 dark:text-red-300">
              {b(
                'এটি Firestore, Realtime Database এবং ফ্রি মিডিয়া ভল্ট থেকে সংশ্লিষ্ট সমস্ত রেকর্ড স্থায়ীভাবে মুছে ফেলবে।',
                'This permanently removes linked records across Firestore, Realtime Database, and Firestore Media Vault.',
                lang
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmTarget(null)}
              className="h-9 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
            >
              {b('বাতিল', 'Cancel', lang)}
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmCascadeDelete()}
              className="h-9 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer"
            >
              {b('স্থায়ীভাবে মুছুন', 'Confirm Permanent Delete', lang)}
            </button>
          </div>
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

      {/* Firestore Users & Applications Approval Queue */}
      <div
        data-testid="firebase-approval-queue-card"
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
      >
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>
              {b(
                'Firestore ক্লাউড ইউজার ও আবেদন অনুমোদন কিউ (Approve / Suspend / Cascade Delete)',
                'Live Firestore Users & Applications Approval Queue',
                lang
              )}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {b(
              `Users: ${firestoreUsers.length} · Apps: ${firestoreApps.length}`,
              `Users: ${firestoreUsers.length} · Apps: ${firestoreApps.length}`,
              lang
            )}
          </span>
        </div>

        {firestoreUsers.length === 0 && firestoreApps.length === 0 ? (
          <div className="p-5 text-xs text-slate-500 dark:text-slate-400">
            {firebaseUser?.emailVerified
              ? b(
                  'এখনো কোনো অপেক্ষমাণ Firestore ইউজার বা আবেদন পাওয়া যায়নি। নতুন ইউজার সাইন-আপ করলে এখানে রিয়েল-টাইম দেখা যাবে।',
                  'No Firestore users or applications queued yet. New sign-ups and applications appear here in real time.',
                  lang
                )
              : b(
                  'Verified Firebase (Super Central Admin) লগইনে Firestore `users` এবং `applications` অনুমোদন ও ক্যাসকেড ডিলিট সক্রিয় হয়।',
                  'Sign in as verified Firebase Super Central Admin to approve, suspend, or cascade-delete live Firestore user records.',
                  lang
                )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
            {firestoreApps.map((appRow) => {
              const assignedRole = approvalRoleOverride[appRow.applicationId] ?? appRow.requestedRole;
              const assignedSchool = approvalSchoolOverride[appRow.applicationId] ?? appRow.schoolId;
              const rowBusy = queueBusyId === appRow.applicantUid + appRow.applicationId;
              return (
                <div
                  key={`app-${appRow.applicationId}`}
                  className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {appRow.applicantName}{' '}
                      <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                        ({appRow.applicationType} · {appRow.applicationId})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{appRow.details}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Assign Role"
                      value={assignedRole}
                      onChange={(e) =>
                        setApprovalRoleOverride((prev) => ({
                          ...prev,
                          [appRow.applicationId]: e.target.value as Role,
                        }))
                      }
                      className="h-8 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]"
                    >
                      <option value="school_admin">school_admin</option>
                      <option value="teacher">teacher</option>
                      <option value="student">student</option>
                      <option value="guardian">guardian</option>
                    </select>
                    <select
                      aria-label="Assign School"
                      value={assignedSchool}
                      onChange={(e) =>
                        setApprovalSchoolOverride((prev) => ({
                          ...prev,
                          [appRow.applicationId]: e.target.value,
                        }))
                      }
                      className="h-8 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]"
                    >
                      <option value="global">global</option>
                      {schools.map((sc) => (
                        <option key={sc.id} value={sc.id}>
                          {sc.code}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={rowBusy}
                      onClick={() =>
                        void handleApprovalDecision({
                          targetUid: appRow.applicantUid,
                          applicationId: appRow.applicationId,
                          decision: 'approve',
                          role: assignedRole,
                          schoolId: assignedSchool,
                        })
                      }
                      className="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer disabled:opacity-60"
                    >
                      {b('অনুমোদন', 'Approve', lang)}
                    </button>
                    <button
                      type="button"
                      disabled={rowBusy}
                      onClick={() =>
                        void handleApprovalDecision({
                          targetUid: appRow.applicantUid,
                          applicationId: appRow.applicationId,
                          decision: 'reject',
                          role: assignedRole,
                          schoolId: assignedSchool,
                        })
                      }
                      className="h-8 px-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer disabled:opacity-60"
                    >
                      {b('প্রত্যাখ্যান', 'Reject', lang)}
                    </button>
                  </div>
                </div>
              );
            })}

            {firestoreUsers.map((u) => {
              const rowBusy = queueBusyId === u.uid;
              const isSuspendedOrInactive =
                u.status === 'suspended' || u.status === 'deactivated' || u.isActive === false;
              return (
                <div
                  key={`fs-user-${u.uid}`}
                  className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-1.5">
                      <span>{u.displayName}</span>
                      <span className="font-mono text-[11px] text-slate-500">({u.role})</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          u.status === 'active' && u.isActive !== false
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {u.status}
                        {u.isActive === false ? ' · inactive' : ''}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {u.email} · UID: {u.uid} {u.schoolId ? `· School: ${u.schoolId}` : ''}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={rowBusy}
                      onClick={() =>
                        handleSelectUserForEdit({
                          uid: u.uid,
                          displayName: u.displayName,
                          email: u.email,
                          phone: u.phone ?? '',
                          role: u.role,
                          status: u.status,
                          isActive: u.isActive,
                          schoolId: u.schoolId,
                          teacherId: u.teacherId,
                          studentId: u.studentId,
                          updatedAt: Date.now(),
                        })
                      }
                      className="h-8 px-2.5 rounded-lg border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-bold cursor-pointer disabled:opacity-60"
                    >
                      {b('RTDB এডিট / সিঙ্ক', 'Edit in RTDB', lang)}
                    </button>
                    {isSuspendedOrInactive ? (
                      <button
                        type="button"
                        disabled={rowBusy}
                        onClick={() =>
                          void handleApprovalDecision({
                            targetUid: u.uid,
                            decision: 'reactivate',
                            role: u.role === 'pending' ? 'teacher' : u.role,
                            schoolId: u.schoolId,
                          })
                        }
                        className="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer disabled:opacity-60"
                      >
                        {b('সক্রিয় করুন', 'Activate', lang)}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={rowBusy}
                        onClick={() =>
                          void handleApprovalDecision({
                            targetUid: u.uid,
                            decision: 'suspend',
                            role: u.role,
                            schoolId: u.schoolId,
                          })
                        }
                        className="h-8 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-60"
                      >
                        <Ban className="w-3 h-3" />
                        <span>{b('স্থগিত', 'Suspend', lang)}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={rowBusy}
                      onClick={() =>
                        setDeleteConfirmTarget({
                          targetType: 'user',
                          targetId: u.uid,
                          label: u.email || u.displayName,
                          schoolId: u.schoolId,
                        })
                      }
                      className="h-8 px-2.5 rounded-lg border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-60"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{b('স্থায়ী ডিলিট', 'Delete', lang)}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Free Spark Media & Document Upload Tester */}
      <div
        data-testid="firebase-storage-tester-card"
        className="rounded-2xl border border-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-950/20 p-5 space-y-3 text-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-indigo-600" />
            <span>{b('ফ্রি Spark মিডিয়া ও ডকুমেন্ট ভল্ট (Firestore)', 'Free Spark Media & Document Vault (Firestore)', lang)}</span>
          </div>
          <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">
            {projectInfo.mediaCollection} · $0
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {b('ক্যাটাগরি (কোনো পেইড Storage ছাড়া)', 'Asset Category (Spark Free)', lang)}
            </label>
            <select
              value={storageCategory}
              onChange={(e) => setStorageCategory(e.target.value as StorageAssetCategory)}
              className="w-full h-10 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="documents">documents/ (PDF &lt;= 450KB / Image)</option>
              <option value="profile_photos">profile_photos/ (Auto-compressed)</option>
              <option value="school_covers">school_covers/ (Auto-compressed)</option>
              <option value="notices">notices/ (Auto-compressed)</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {b('স্কোপ আইডি (School/User ID)', 'Scope ID (Optional)', lang)}
            </label>
            <input
              type="text"
              value={storageScopeId}
              onChange={(e) => setStorageScopeId(e.target.value)}
              placeholder={firebaseUser?.uid || schools[0]?.id || 'GPS-1042'}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>
          <div className="flex items-end">
            <input
              ref={storageFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void handleStorageUploadFile(file);
                }
                e.target.value = '';
              }}
            />
            <button
              type="button"
              data-testid="storage-upload-test-btn"
              disabled={storageBusy}
              onClick={() => storageFileInputRef.current?.click()}
              className="w-full h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <FileUp className="w-4 h-4" />
              <span>
                {storageBusy
                  ? b('আপলোড হচ্ছে...', 'Uploading...', lang)
                  : b('ফাইল নির্বাচন ও আপলোড', 'Select & Upload File', lang)}
              </span>
            </button>
          </div>
        </div>

        {uploadedAsset && (
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-mono font-bold text-slate-900 dark:text-white truncate">
                {uploadedAsset.path}
              </div>
              <div className="text-[11px] text-slate-500">
                {uploadedAsset.contentType} · {Math.round((uploadedAsset.sizeBytes ?? 0) / 1024)} KB
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={uploadedAsset.url}
                target="_blank"
                rel="noreferrer"
                className="h-8 px-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold inline-flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{b('দেখুন', 'Open URL', lang)}</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  void deleteStorageObject(uploadedAsset.assetId || uploadedAsset.path).then((ok) => {
                    if (ok) {
                      setUploadedAsset(null);
                      setStatusFeedback({
                        type: 'success',
                        text: b('মিডিয়া ভল্ট থেকে ফাইলটি মুছে ফেলা হয়েছে।', 'Deleted media asset from Firestore vault.', lang),
                      });
                    }
                  });
                }}
                className="h-8 px-2.5 rounded-lg border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 font-semibold cursor-pointer"
              >
                {b('মুছুন', 'Delete', lang)}
              </button>
            </div>
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
                <option value="rejected">rejected</option>
                <option value="deactivated">deactivated</option>
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

      {/* Live Firestore activityLogs Stream */}
      <div
        data-testid="firebase-activity-logs-stream"
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
      >
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <History className="w-4 h-4 text-purple-600" />
            <span>{b('Firestore অপরিবর্তনীয় অ্যাক্টিভিটি লগ স্ট্রিম (activityLogs)', 'Immutable Firestore Activity Logs Stream', lang)}</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">{activityLogs.length}</span>
        </div>
        {activityLogs.length === 0 ? (
          <div className="p-4 text-xs text-slate-500">
            {b(
              'Verified Firebase সেশনে করা সকল স্কুল/শিক্ষক/শিক্ষার্থী/Storage পরিবর্তন এখানে অডিটযোগ্যভাবে সংরক্ষিত হয়।',
              'Immutable activity logs written by clients and Cloud Functions appear here in real time.',
              lang
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
            {activityLogs.map((item) => (
              <div key={item.id} className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                    {item.actionType}
                  </span>{' '}
                  <span className="text-slate-700 dark:text-slate-200">{item.summary}</span>
                </div>
                <span className="font-mono text-[11px] text-slate-500">
                  {item.actorRole} · {item.targetType}:{item.targetId} · {item.createdAtLabel}
                </span>
              </div>
            ))}
          </div>
        )}
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-300">database.rules.json</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-emerald-300 border border-slate-700">
                  {(REALTIME_DATABASE_RULES_JSON.length / 1024).toFixed(1)} KB
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="central-rtdb-download-rules-btn"
                  onClick={handleDownloadRules}
                  className="h-7 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>{b('ডাউনলোড database.rules.json', 'Download database.rules.json', lang)}</span>
                </button>
                <button
                  type="button"
                  data-testid="central-rtdb-copy-rules-btn"
                  onClick={() => void handleCopyRules()}
                  className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  {copiedRules ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedRules ? b('কপি হয়েছে!', 'Copied!', lang) : b('Rules কপি করুন', 'Copy Rules', lang)}</span>
                </button>
              </div>
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
