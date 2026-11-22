import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  CreditCard,
  Crop,
  Image as ImageIcon,
  Database,
  Download,
  ExternalLink,
  FileText,
  GitBranch,
  Globe,
  HelpCircle,
  History,
  Info,
  KeyRound,
  Lock,
  LogOut,
  Monitor,
  Moon,
  Palette,
  RefreshCw,
  Rocket,
  RotateCcw,
  Save,
  Search,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sun,
  Trash2,
  Upload,
  User,
  Users,
} from 'lucide-react';
import type {
  AuditLogEntry,
  Language,
  Role,
  SchoolRecord,
  StudentRecord,
  TeacherRecord,
  Theme,
} from '../types';
import { b } from '../i18n/translations';
import {
  FEATURE_TOGGLE_DEFINITIONS,
  getEditableFeatureTogglesForRole,
  getVisibleSettingsSectionsForRole,
  isCriticalFeatureToggle,
  toggleSystemFeatureSafely,
  type ExtendedNotificationChannels,
  type FeatureToggleDefinition,
  type FeatureToggleKey,
  type SettingsCategoryId,
  type SystemSettingsState,
  type ThemePreference,
} from '../utils/settingsEngine';
import {
  createDefaultDeploymentLinksRecord,
  readViteEnvDeploymentOverrides,
  resolveApiUrl,
  resolveDeploymentLinksState,
  validateDeploymentUrl,
  type DeploymentLinksRecord,
  type ResolvedDeploymentLinksState,
} from '../utils/deploymentConfig';
import { PWAInstallButton } from './PWAInstallBanner';

export interface SettingsCenterViewProps {
  role: Role;
  lang: Language;
  theme: Theme;
  settings: SystemSettingsState;
  actorName: string;
  actorId: string;
  actorEmail?: string;
  actorPhone?: string;
  actorAvatarUrl?: string;
  activeSchool?: SchoolRecord;
  schools?: SchoolRecord[];
  teachers?: TeacherRecord[];
  students?: StudentRecord[];
  auditLogs?: AuditLogEntry[];
  onUpdateSettings: (next: SystemSettingsState, auditEntry?: AuditLogEntry) => void;
  onChangeTheme: (theme: Theme) => void;
  onChangeLang: (lang: Language) => void;
  onOpenPhotoEditor?: () => void;
  onOpenContactAdmin?: () => void;
  onNavigateTab?: (tab: string) => void;
  onToggleTeacherStatus?: (teacherId: string, nextStatus: 'active' | 'suspended') => void;
  onToggleStudentStatus?: (studentId: string, nextStatus: 'active' | 'suspended') => void;
  onUpdateSchoolInfo?: (schoolId: string, patch: Partial<SchoolRecord>) => void;
  onOpenCoverGallery?: () => void;
  onOpenBannerCrop?: () => void;
}

const FEATURE_GROUP_LABELS: Record<
  FeatureToggleDefinition['group'],
  { bn: string; en: string }
> = {
  system: { bn: '১. সিস্টেম কন্ট্রোল (System Control)', en: '1. System Control' },
  registration: { bn: '২. নিবন্ধন ও ভর্তি কন্ট্রোল (Registration Control)', en: '2. Registration Control' },
  academic: { bn: '৩. একাডেমিক ফিচার কন্ট্রোল (Academic Features)', en: '3. Academic Feature Control' },
  routine: { bn: '৪. রুটিন কন্ট্রোল (Routine Control)', en: '4. Routine Control' },
  attendance: { bn: '৫. উপস্থিতি ও হাজিরা কন্ট্রোল (Attendance Control)', en: '5. Attendance Control' },
  exam_result: { bn: '৬. পরীক্ষা ও ফলাফল কন্ট্রোল (Exam & Result Control)', en: '6. Exam & Result Control' },
  fee_payment: { bn: '৭. ফি ও পেমেন্ট কন্ট্রোল (Fee & Payment Control)', en: '7. Fee & Payment Control' },
  communication: { bn: '৮. যোগাযোগ ও বার্তা কন্ট্রোল (Communication Control)', en: '8. Communication Control' },
  document: { bn: '৯. ডকুমেন্ট ও সনদ কন্ট্রোল (Document Control)', en: '9. Document Control' },
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  user: User,
  shield: Shield,
  bell: Bell,
  palette: Palette,
  sliders: Sliders,
  building: Building2,
  key: KeyRound,
  database: Database,
  file: FileText,
  globe: Globe,
  credit_card: CreditCard,
  help: HelpCircle,
  rocket: Rocket,
  info: Info,
};

export const SettingsCenterView: React.FC<SettingsCenterViewProps> = ({
  role,
  lang,
  theme,
  settings,
  actorName,
  actorId,
  actorEmail = 'user@psms.gov.bd',
  actorPhone = '01700-000000',
  actorAvatarUrl,
  activeSchool,
  schools = [],
  teachers = [],
  students = [],
  auditLogs = [],
  onUpdateSettings,
  onChangeTheme,
  onChangeLang,
  onOpenPhotoEditor,
  onOpenContactAdmin,
  onNavigateTab,
  onToggleTeacherStatus,
  onToggleStudentStatus,
  onUpdateSchoolInfo,
  onOpenCoverGallery,
  onOpenBannerCrop,
}) => {
  const visibleCategories = useMemo(() => getVisibleSettingsSectionsForRole(role), [role]);
  const [activeCategory, setActiveCategory] = useState<SettingsCategoryId>('account_profile');
  const [mobileOpenCategory, setMobileOpenCategory] = useState<SettingsCategoryId | null>('account_profile');
  const [searchTerm, setSearchTerm] = useState('');
  const [featureSearch, setFeatureSearch] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Account & Security local form states
  const [profileName, setProfileName] = useState(actorName);
  const [profileEmail, setProfileEmail] = useState(actorEmail);
  const [profilePhone, setProfilePhone] = useState(actorPhone);
  const [recoveryEmail, setRecoveryEmail] = useState(settings.accountRecoveryEmail);
  const [recoveryPhone, setRecoveryPhone] = useState(settings.accountRecoveryPhone);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [otpTestCode, setOtpTestCode] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');

  // School settings local form state
  const [schoolNameBnEdit, setSchoolNameBnEdit] = useState(activeSchool?.nameBn ?? '');
  const [schoolAddressEdit, setSchoolAddressEdit] = useState(activeSchool?.fullAddress ?? '');
  const [schoolMobileEdit, setSchoolMobileEdit] = useState(activeSchool?.mobile ?? '');
  const [coverConfirmAction, setCoverConfirmAction] = useState<'change' | 'remove' | null>(null);
  const [coverEditUnlocked, setCoverEditUnlocked] = useState(false);
  const [pendingCoverPreview, setPendingCoverPreview] = useState<string | null>(null);
  const coverFileInputRef = React.useRef<HTMLInputElement>(null);
  const canManageSchoolCover = role === 'school_admin' || role === 'central_admin';

  useEffect(() => {
    setSchoolNameBnEdit(activeSchool?.nameBn ?? '');
    setSchoolAddressEdit(activeSchool?.fullAddress ?? '');
    setSchoolMobileEdit(activeSchool?.mobile ?? '');
    setPendingCoverPreview(null);
    setCoverEditUnlocked(false);
  }, [activeSchool?.id]);

  // Support / Feedback form state
  const [ticketType, setTicketType] = useState<'support' | 'bug' | 'feedback' | 'feature_request'>('feedback');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');

  // Confirmation Modal for Critical Toggles
  const [pendingToggle, setPendingToggle] = useState<{
    key: FeatureToggleKey;
    nextValue: boolean;
    labelBn: string;
    labelEn: string;
    noteBn: string;
    noteEn: string;
  } | null>(null);
  const [toggleReason, setToggleReason] = useState('');

  // Server Sync Health + Deployment / App Links state
  const [backendStatus, setBackendStatus] = useState<{
    ok: boolean;
    lastSyncedAt?: string;
    platform?: string;
  } | null>(null);
  const [deploymentState, setDeploymentState] = useState<ResolvedDeploymentLinksState>(() =>
    resolveDeploymentLinksState(createDefaultDeploymentLinksRecord(), readViteEnvDeploymentOverrides())
  );
  const [deploymentDraft, setDeploymentDraft] = useState<DeploymentLinksRecord>(() =>
    createDefaultDeploymentLinksRecord()
  );
  const [deploymentEditorOpen, setDeploymentEditorOpen] = useState(false);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [savingDeployment, setSavingDeployment] = useState(false);

  useEffect(() => {
    setProfileName(actorName);
  }, [actorName]);

  useEffect(() => {
    if (!visibleCategories.some((c) => c.id === activeCategory)) {
      setActiveCategory(visibleCategories[0]?.id ?? 'account_profile');
    }
  }, [visibleCategories, activeCategory]);

  useEffect(() => {
    let mounted = true;
    fetch(resolveApiUrl('/api/health'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted && data) {
          setBackendStatus({
            ok: true,
            lastSyncedAt: data.lastSyncedAt,
            platform: data.platform,
          });
        }
      })
      .catch(() => {
        if (mounted) setBackendStatus({ ok: false });
      });

    fetch(resolveApiUrl('/api/deployment'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { deployment?: ResolvedDeploymentLinksState; raw?: DeploymentLinksRecord } | null) => {
        if (mounted && data?.deployment) {
          setDeploymentState(data.deployment);
          if (data.raw) {
            setDeploymentDraft(data.raw);
          }
        }
      })
      .catch(() => {
        // Keep safe empty / env-resolved defaults without fake URLs
      });
    return () => {
      mounted = false;
    };
  }, []);

  const showToast = (msgBn: string, msgEn: string) => {
    setToastMsg(b(msgBn, msgEn, lang));
    setTimeout(() => setToastMsg(null), 3500);
  };

  const filteredCategories = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return visibleCategories;
    return visibleCategories.filter(
      (cat) =>
        cat.labelBn.toLowerCase().includes(q) ||
        cat.labelEn.toLowerCase().includes(q) ||
        cat.descBn.toLowerCase().includes(q) ||
        cat.descEn.toLowerCase().includes(q)
    );
  }, [visibleCategories, searchTerm]);

  const editableFeatures = useMemo(() => getEditableFeatureTogglesForRole(role), [role]);

  const executeToggle = (key: FeatureToggleKey, nextValue: boolean, reason?: string) => {
    const res = toggleSystemFeatureSafely(settings, role, actorName, key, nextValue, reason);
    if (!res.allowed) {
      showToast(res.errorBn ?? 'অনুমতি নেই', res.errorEn ?? 'Permission denied');
      return;
    }
    onUpdateSettings(res.nextState, res.auditEntry);
    showToast(
      nextValue ? 'ফিচারটি সফলভাবে চালু (ON) করা হয়েছে।' : 'ফিচারটি নিরাপদভাবে বন্ধ (OFF) করা হয়েছে। পূর্বের সকল ডাটা অক্ষত আছে।',
      nextValue ? 'Feature turned ON successfully.' : 'Feature safely turned OFF. Existing records remain intact.'
    );
  };

  const handleRequestToggle = (def: FeatureToggleDefinition) => {
    const nextValue = !settings.features[def.key];
    if (isCriticalFeatureToggle(def.key) || !nextValue) {
      setPendingToggle({
        key: def.key,
        nextValue,
        labelBn: def.labelBn,
        labelEn: def.labelEn,
        noteBn: def.nonDestructiveNoteBn,
        noteEn: def.nonDestructiveNoteEn,
      });
      setToggleReason('');
    } else {
      executeToggle(def.key, nextValue);
    }
  };

  const handleSaveProfileAndRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    const audit: AuditLogEntry = {
      id: `AUD-PROF-${Date.now()}`,
      who: actorName,
      role,
      when: new Date().toISOString().replace('T', ' ').slice(0, 16),
      what: 'Profile & Recovery Info Updated',
      targetName: profileName,
      requestId: `PROF-${actorId}`,
      oldValue: settings.accountRecoveryPhone,
      newValue: `${profilePhone} | ${recoveryEmail}`,
    };
    onUpdateSettings(
      {
        ...settings,
        accountRecoveryEmail: recoveryEmail,
        accountRecoveryPhone: recoveryPhone,
        updatedAt: new Date().toISOString(),
        updatedBy: actorName,
      },
      audit
    );
    showToast('প্রোফাইল ও অ্যাকাউন্ট রিকভারি তথ্য সংরক্ষিত হয়েছে।', 'Profile & recovery settings saved.');
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.current || passwordForm.next.length < 6) {
      setPasswordNotice(b('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।', 'New password must be at least 6 characters.', lang));
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordNotice(b('নতুন পাসওয়ার্ড দুটি মিলছে না।', 'Passwords do not match.', lang));
      return;
    }
    const audit: AuditLogEntry = {
      id: `AUD-PWD-${Date.now()}`,
      who: actorName,
      role,
      when: new Date().toISOString().replace('T', ' ').slice(0, 16),
      what: 'Password Changed',
      targetName: actorId,
      requestId: `PWD-${actorId}`,
      oldValue: '********',
      newValue: 'Updated securely',
    };
    onUpdateSettings(
      {
        ...settings,
        updatedAt: new Date().toISOString(),
        updatedBy: actorName,
      },
      audit
    );
    setPasswordForm({ current: '', next: '', confirm: '' });
    setPasswordNotice(null);
    showToast('পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে।', 'Password updated successfully.');
  };

  const handleThemeSelect = (pref: ThemePreference) => {
    onUpdateSettings({
      ...settings,
      appearance: { ...settings.appearance, themePreference: pref },
    });
    if (pref === 'system') {
      const prefersDark =
        typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      onChangeTheme(prefersDark ? 'dark' : 'light');
    } else {
      onChangeTheme(pref);
    }
  };

  const handleNotificationToggle = (key: keyof ExtendedNotificationChannels) => {
    onUpdateSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key],
      },
    });
  };

  const handleDownloadJsonBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      exportedBy: actorName,
      role,
      settings,
      schoolsCount: schools.length,
      teachersCount: teachers.length,
      studentsCount: students.length,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `psms-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onUpdateSettings({
      ...settings,
      dataGovernance: {
        ...settings.dataGovernance,
        lastBackupAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      },
    });
    showToast('সম্পূর্ণ সিস্টেম ব্যাকআপ JSON ফাইল ডাউনলোড হয়েছে।', 'System JSON backup downloaded.');
  };

  const handleRestoreJsonBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as { settings?: SystemSettingsState };
        if (!parsed.settings || !parsed.settings.features) {
          showToast('সঠিক PSMS ব্যাকআপ ফাইল নির্বাচন করুন।', 'Invalid PSMS backup format.');
          return;
        }
        onUpdateSettings(parsed.settings);
        showToast('ব্যাকআপ থেকে সেটিংস সফলভাবে রিস্টোর করা হয়েছে।', 'Settings restored from backup.');
      } catch {
        showToast('ফাইলটি পাঠযোগ্য নয়।', 'Could not parse backup file.');
      }
    };
    reader.readAsText(file);
  };

  const handleSubmitSupportTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;
    const newTicket = {
      id: `TKT-${Date.now()}`,
      type: ticketType,
      subject: ticketSubject.trim(),
      message: ticketMessage.trim(),
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'Submitted' as const,
    };
    onUpdateSettings({
      ...settings,
      supportTickets: [newTicket, ...settings.supportTickets],
    });
    setTicketSubject('');
    setTicketMessage('');
    showToast('আপনার বার্তা/মতামত সফলভাবে জমা দেওয়া হয়েছে।', 'Your support ticket / feedback has been submitted.');
  };

  const renderSectionContent = (catId: SettingsCategoryId) => {
    switch (catId) {
      case 'account_profile':
        return (
          <div className="space-y-5">
            {/* Profile Hero */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  {actorAvatarUrl ? (
                    <img
                      src={actorAvatarUrl}
                      alt={actorName}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl">
                      {actorName.slice(0, 2)}
                    </div>
                  )}
                  {onOpenPhotoEditor && (
                    <button
                      type="button"
                      onClick={onOpenPhotoEditor}
                      aria-label={b('প্রোফাইল ছবি পরিবর্তন', 'Change Profile Photo', lang)}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center border-2 border-white dark:border-slate-900 shadow cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{actorName}</h3>
                  <div className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-0.5">
                    {b('ইউজার / অ্যাকাউন্ট আইডি:', 'User / Account ID:', lang)} {actorId}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px]">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold">
                      {b('অ্যাকাউন্ট স্ট্যাটাস: সক্রিয় (Active)', 'Account Status: Active', lang)}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium uppercase">
                      {role.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {onOpenPhotoEditor && (
                <button
                  type="button"
                  onClick={onOpenPhotoEditor}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>{b('প্রোফাইল ছবি পরিবর্তন ও ক্রপ', 'Change Profile Photo', lang)}</span>
                </button>
              )}
            </div>

            {/* Edit Profile + Recovery */}
            <form onSubmit={handleSaveProfileAndRecovery} className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="md:col-span-2 flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {b('প্রোফাইল ও অ্যাকাউন্ট পুনরুদ্ধার তথ্য', 'Edit Profile & Account Recovery', lang)}
                </h4>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {b('প্রদর্শিত নাম (Display Name)', 'Display Name', lang)}
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {b('লগইন ইউজারনেম / আইডি', 'Login Credential ID', lang)}
                </label>
                <input
                  type="text"
                  readOnly
                  value={actorId}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/70 text-sm font-mono text-slate-600 dark:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {b('ইমেইল ও রিকভারি ইমেইল', 'Email & Recovery Email', lang)}
                </label>
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => {
                    setProfileEmail(e.target.value);
                    setRecoveryEmail(e.target.value);
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {b('মোবাইল ও রিকভারি নম্বর', 'Phone & Recovery Phone', lang)}
                </label>
                <input
                  type="text"
                  value={recoveryPhone}
                  onChange={(e) => {
                    setProfilePhone(e.target.value);
                    setRecoveryPhone(e.target.value);
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{b('প্রোফাইল সংরক্ষণ করুন', 'Save Profile Changes', lang)}</span>
                </button>
              </div>
            </form>

            {/* Password & Reset */}
            <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {b('পাসওয়ার্ড পরিবর্তন / রিসেট (Change & Reset Password)', 'Change / Reset Password', lang)}
                </h4>
                <button
                  type="button"
                  onClick={() =>
                    showToast(
                      `পাসওয়ার্ড রিসেট লিংক/OTP পাঠানো হয়েছে: ${recoveryPhone}`,
                      `Reset verification link/OTP prepared for ${recoveryPhone}`
                    )
                  }
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {b('Forgot Password / OTP রিসেট অনুরোধ →', 'Forgot Password / Request Reset →', lang)}
                </button>
              </div>
              <input
                type="password"
                placeholder={b('বর্তমান পাসওয়ার্ড', 'Current Password', lang)}
                value={passwordForm.current}
                onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))}
                className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
              />
              <input
                type="password"
                placeholder={b('নতুন পাসওয়ার্ড (৬+ অক্ষর)', 'New Password (6+ chars)', lang)}
                value={passwordForm.next}
                onChange={(e) => setPasswordForm((p) => ({ ...p, next: e.target.value }))}
                className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
              />
              <input
                type="password"
                placeholder={b('নতুন পাসওয়ার্ড নিশ্চিত করুন', 'Confirm Password', lang)}
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
                className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
              />
              {passwordNotice && (
                <div className="md:col-span-3 text-xs font-medium text-amber-600 dark:text-amber-400">{passwordNotice}</div>
              )}
              <div className="md:col-span-3 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{b('পাসওয়ার্ড আপডেট করুন', 'Update Password', lang)}</span>
                </button>
              </div>
            </form>
          </div>
        );

      case 'security_privacy':
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  key: 'twoFactorEnabled' as const,
                  labelBn: 'টু-ফ্যাক্টর প্রমাণীকরণ (2FA)',
                  labelEn: 'Two-Factor Authentication (2FA)',
                  descBn: 'নতুন ডিভাইস থেকে প্রবেশের সময় অতিরিক্ত নিরাপত্তা স্তর',
                  descEn: 'Extra security verification on unrecognized logins',
                },
                {
                  key: 'otpVerificationRequired' as const,
                  labelBn: 'OTP যাচাইকরণ (SMS / ইমেইল OTP)',
                  labelEn: 'OTP Verification',
                  descBn: 'পাসওয়ার্ড রিসেট ও গুরুত্বপূর্ণ পরিবর্তনে OTP নিশ্চিতকরণ',
                  descEn: 'Require OTP on sensitive security changes',
                },
                {
                  key: 'loginAlerts' as const,
                  labelBn: 'নিরাপত্তা ও লগইন সতর্কতা (Security Alerts)',
                  labelEn: 'Security & Login Alerts',
                  descBn: 'অপরিচিত ডিভাইস থেকে লগইনের সাথে সাথে নোটিফিকেশন',
                  descEn: 'Instant notification on new sign-ins',
                },
              ].map((item) => {
                const enabled = settings.security[item.key];
                return (
                  <div
                    key={item.key}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {b(item.labelBn, item.labelEn, lang)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {b(item.descBn, item.descEn, lang)}
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      onClick={() =>
                        onUpdateSettings({
                          ...settings,
                          security: { ...settings.security, [item.key]: !enabled },
                        })
                      }
                      className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
                        enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}

              {/* Auto Logout Session Timeout */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {b('অটো-লগআউট সময়সীমা (Session Timeout)', 'Auto Logout / Session Timeout', lang)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {b('নিষ্ক্রিয় অবস্থায় কত মিনিট পর স্বয়ংক্রিয় লগআউট হবে', 'Auto sign-out after inactivity', lang)}
                  </div>
                </div>
                <select
                  value={settings.security.autoLogoutMinutes}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        autoLogoutMinutes: Number(e.target.value) as 15 | 30 | 60 | 120,
                      },
                    })
                  }
                  className="h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value={15}>15 {b('মিনিট', 'mins', lang)}</option>
                  <option value={30}>30 {b('মিনিট', 'mins', lang)}</option>
                  <option value={60}>60 {b('মিনিট', 'mins', lang)}</option>
                  <option value={120}>120 {b('মিনিট', 'mins', lang)}</option>
                </select>
              </div>
            </div>

            {/* OTP Live Verification Tester */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-800/30">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {b('দ্রুত OTP যাচাই পরীক্ষা (2FA / OTP Test)', 'Quick OTP Verification Check', lang)}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {otpTestCode
                    ? b(`ডেমো OTP কোড: ${otpTestCode}`, `Verification OTP: ${otpTestCode}`, lang)
                    : b('আপনার সক্রিয় মোবাইল/ইমেইলে নিরাপত্তামূলক OTP যাচাই করুন', 'Verify active security channel with an instant OTP', lang)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {otpTestCode && (
                  <input
                    type="text"
                    placeholder="OTP"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    className="w-24 h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (!otpTestCode) {
                      setOtpTestCode('482910');
                    } else if (otpInput === otpTestCode) {
                      setOtpTestCode(null);
                      setOtpInput('');
                      showToast('OTP সফলভাবে যাচাই সম্পন্ন হয়েছে!', 'OTP verified successfully!');
                    } else {
                      showToast('সঠিক OTP লিখুন (482910)।', 'Enter matching OTP (482910).');
                    }
                  }}
                  className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  {otpTestCode ? b('OTP নিশ্চিত করুন', 'Verify OTP', lang) : b('OTP পাঠান', 'Send Test OTP', lang)}
                </button>
              </div>
            </div>

            {/* Active & Trusted Devices + Logout All */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {b('সক্রিয় ও বিশ্বস্ত ডিভাইসসমূহ (Active & Trusted Devices)', 'Active & Trusted Devices', lang)}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {b('Android অ্যাপ ও Web ব্রাউজার সেশন একসাথে প্রদর্শিত হচ্ছে', 'Both Web Browser and Android App sessions synced', lang)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        devices: settings.security.devices.filter((d) => d.isCurrent),
                      },
                    });
                    showToast('অন্যান্য সকল ডিভাইস থেকে সফলভাবে লগআউট করা হয়েছে।', 'Logged out from all other devices.');
                  }}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-bold cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{b('সকল ডিভাইস থেকে লগআউট', 'Logout from All Devices', lang)}</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {settings.security.devices.map((dev) => (
                  <div key={dev.id} className="py-2.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200">
                        {dev.platform === 'Android App' ? <Smartphone className="w-4 h-4 text-emerald-600" /> : <Monitor className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {dev.deviceName}{' '}
                          {dev.isCurrent && (
                            <span className="ml-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              ({b('বর্তমান ডিভাইস', 'Current', lang)})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {dev.location} · IP {dev.ipMasked} · {dev.lastActive}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateSettings({
                          ...settings,
                          security: {
                            ...settings.security,
                            devices: settings.security.devices.map((d) =>
                              d.id === dev.id ? { ...d, trusted: !d.trusted } : d
                            ),
                          },
                        })
                      }
                      className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                        dev.trusted
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {dev.trusted ? b('Trusted ✓', 'Trusted ✓', lang) : b('Trust Device', 'Trust Device', lang)}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Login History */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                {b('লগইন ইতিহাস ও গোপনীয়তা (Login History)', 'Login History', lang)}
              </h4>
              <div className="space-y-1.5">
                {settings.security.loginHistory.map((h) => (
                  <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 text-xs py-1.5 border-b last:border-b-0 border-slate-100 dark:border-slate-800">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{h.device}</span>
                    <span className="font-mono text-slate-500">{h.ipMasked} · {h.timestamp}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{h.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'notifications': {
        const channels: {
          key: keyof ExtendedNotificationChannels;
          labelBn: string;
          labelEn: string;
        }[] = [
          { key: 'push', labelBn: 'পুশ নোটিফিকেশন (Push Notifications)', labelEn: 'Push Notifications' },
          { key: 'email', labelBn: 'ইমেইল নোটিফিকেশন (Email Notifications)', labelEn: 'Email Notifications' },
          { key: 'sms', labelBn: 'SMS নোটিফিকেশন (SMS Alerts)', labelEn: 'SMS Notifications' },
          { key: 'notice', labelBn: 'নোটিশ অ্যালার্ট (Notice Alerts)', labelEn: 'Notice Alerts' },
          { key: 'attendance', labelBn: 'উপস্থিতি অ্যালার্ট (Attendance Alerts)', labelEn: 'Attendance Alerts' },
          { key: 'exam', labelBn: 'পরীক্ষা অ্যালার্ট (Exam Alerts)', labelEn: 'Exam Alerts' },
          { key: 'result', labelBn: 'ফলাফল অ্যালার্ট (Result Alerts)', labelEn: 'Result Alerts' },
          { key: 'assignment', labelBn: 'অ্যাসাইনমেন্ট ও পড়া অ্যালার্ট (Assignment Alerts)', labelEn: 'Assignment Alerts' },
          { key: 'routine', labelBn: 'রুটিন পরিবর্তন অ্যালার্ট (Routine Alerts)', labelEn: 'Routine Alerts' },
          { key: 'feePayment', labelBn: 'ফি ও পেমেন্ট অ্যালার্ট (Fee & Payment Alerts)', labelEn: 'Fee & Payment Alerts' },
          { key: 'emergency', labelBn: 'জরুরি সতর্কবার্তা (Emergency Alerts)', labelEn: 'Emergency Alerts' },
        ];
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {b(
                  'কোন কোন চ্যানেল ও বিষয়ে আপনি নোটিফিকেশন পেতে চান তা নিচ থেকে অন/অফ করুন।',
                  'Control which channels and school activity categories notify your account.',
                  lang
                )}
              </p>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    ...settings,
                    notifications: {
                      push: true,
                      email: true,
                      sms: true,
                      notice: true,
                      attendance: true,
                      exam: true,
                      result: true,
                      assignment: true,
                      routine: true,
                      feePayment: true,
                      emergency: true,
                    },
                  })
                }
                className="h-8 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold cursor-pointer"
              >
                {b('সবগুলো চালু করুন', 'Enable All', lang)}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {channels.map((ch) => {
                const on = settings.notifications[ch.key];
                return (
                  <div
                    key={ch.key}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 flex items-center justify-between gap-3"
                  >
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {b(ch.labelBn, ch.labelEn, lang)}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      onClick={() => handleNotificationToggle(ch.key)}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 cursor-pointer ${
                        on ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          on ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'appearance_language':
        return (
          <div className="space-y-5">
            {/* Theme Selector */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('থিম মোড (Theme Preference)', 'Theme Mode', lang)}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'light' as const, labelBn: 'লাইট মোড (Light Mode)', labelEn: 'Light Mode', icon: Sun },
                  { id: 'dark' as const, labelBn: 'ডার্ক মোড (Dark Mode)', labelEn: 'Dark Mode', icon: Moon },
                  { id: 'system' as const, labelBn: 'সিস্টেম ডিফল্ট (System)', labelEn: 'System Default', icon: Monitor },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const active = settings.appearance.themePreference === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleThemeSelect(opt.id)}
                      className={`h-12 px-4 rounded-xl border flex items-center gap-2.5 text-xs font-bold cursor-pointer transition-colors ${
                        active
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{b(opt.labelBn, opt.labelEn, lang)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language + Font + Density + Formats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  {b('ভাষা নির্বাচন (Language)', 'Display Language', lang)}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['bn', 'en'] as const).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        onChangeLang(code);
                        onUpdateSettings({
                          ...settings,
                          appearance: { ...settings.appearance, language: code },
                          regional: { ...settings.regional, language: code },
                        });
                      }}
                      className={`h-10 rounded-lg border text-xs font-bold cursor-pointer ${
                        lang === code
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {code === 'bn' ? 'বাংলা (Bangla)' : 'English (US)'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  {b('ফন্ট সাইজ (Font Size)', 'Font Size', lang)}
                </label>
                <select
                  value={settings.appearance.fontSize}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      appearance: {
                        ...settings.appearance,
                        fontSize: e.target.value as 'small' | 'normal' | 'large',
                      },
                    })
                  }
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  <option value="small">{b('ছোট (Small)', 'Small', lang)}</option>
                  <option value="normal">{b('স্বাভাবিক (Normal)', 'Normal', lang)}</option>
                  <option value="large">{b('বড় (Large)', 'Large', lang)}</option>
                </select>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  {b('ড্যাশবোর্ড লেআউট ও ঘনত্ব (Dashboard & View)', 'Dashboard Density & View', lang)}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        ...settings,
                        appearance: { ...settings.appearance, density: 'comfortable' },
                      })
                    }
                    className={`h-10 rounded-lg border text-xs font-semibold cursor-pointer ${
                      settings.appearance.density === 'comfortable'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {b('আরামদায়ক (Comfortable)', 'Comfortable View', lang)}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        ...settings,
                        appearance: { ...settings.appearance, density: 'compact' },
                      })
                    }
                    className={`h-10 rounded-lg border text-xs font-semibold cursor-pointer ${
                      settings.appearance.density === 'compact'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {b('কম্প্যাক্ট (Compact)', 'Compact View', lang)}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  {b('তারিখ ও সময় বিন্যাস (Date & Time Format)', 'Date & Time Format', lang)}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={settings.appearance.dateFormat}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        appearance: {
                          ...settings.appearance,
                          dateFormat: e.target.value as 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'DD MMM, YYYY',
                        },
                      })
                    }
                    className="h-10 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  >
                    <option value="DD MMM, YYYY">21 Nov, 2026</option>
                    <option value="DD/MM/YYYY">21/11/2026</option>
                    <option value="YYYY-MM-DD">2026-11-21</option>
                  </select>
                  <select
                    value={settings.appearance.timeFormat}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        appearance: {
                          ...settings.appearance,
                          timeFormat: e.target.value as '12h' | '24h',
                        },
                      })
                    }
                    className="h-10 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  >
                    <option value="12h">12-Hour (AM/PM)</option>
                    <option value="24h">24-Hour (14:30)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'system_feature_control': {
        if (role !== 'central_admin' && role !== 'school_admin') {
          return null;
        }
        const q = featureSearch.trim().toLowerCase();
        const groupsOrder: FeatureToggleDefinition['group'][] = [
          'system',
          'registration',
          'academic',
          'routine',
          'attendance',
          'exam_result',
          'fee_payment',
          'communication',
          'document',
        ];
        const visibleGroups = groupsOrder.filter((g) =>
          editableFeatures.some(
            (def) =>
              def.group === g &&
              (!q ||
                def.labelBn.toLowerCase().includes(q) ||
                def.labelEn.toLowerCase().includes(q) ||
                def.key.toLowerCase().includes(q))
          )
        );
        const recentSettingsAudits = auditLogs.filter((a) => a.requestId?.startsWith('SET-')).slice(0, 6);

        return (
          <div className="space-y-5">
            {/* Non-Destructive Guarantee Banner */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-800 dark:text-slate-200 space-y-1">
                <div className="font-bold text-emerald-800 dark:text-emerald-300">
                  {b(
                    'নিরাপদ ও অ-ধ্বংসাত্মক নিয়ন্ত্রণ নীতি (Non-Destructive Guarantee)',
                    'Non-Destructive Feature Toggle Policy',
                    lang
                  )}
                </div>
                <p>
                  {b(
                    'কোনো ফিচার বা রেজিস্ট্রেশন (যেমন: Student Registration) OFF করলে শুধুমাত্র নতুন নিবন্ধন বা কার্যক্রম বন্ধ হবে। পূর্বের কোনো ইউজার অ্যাকাউন্ট, প্রোফাইল, হাজিরা, রুটিন বা রেজাল্ট মুছে যাবে না বা নিষ্ক্রিয় হবে না এবং অন্য কোনো ফিচার স্বয়ংক্রিয়ভাবে বন্ধ হবে না।',
                    'Turning any feature OFF (e.g., Student Registration) ONLY stops new creations/requests. Existing users keep full login, routine, attendance & result access, and other modules remain untouched.',
                    lang
                  )}
                </p>
              </div>
            </div>

            {/* Feature Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={featureSearch}
                onChange={(e) => setFeatureSearch(e.target.value)}
                placeholder={b('ফিচার বা সুইচ খুঁজুন (যেমন: Student Registration, Attendance, Result)...', 'Search feature toggles...', lang)}
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>

            {visibleGroups.map((groupKey) => {
              const items = editableFeatures.filter(
                (def) =>
                  def.group === groupKey &&
                  (!q ||
                    def.labelBn.toLowerCase().includes(q) ||
                    def.labelEn.toLowerCase().includes(q) ||
                    def.key.toLowerCase().includes(q))
              );
              const meta = FEATURE_GROUP_LABELS[groupKey];
              return (
                <div key={groupKey} className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {b(meta.bn, meta.en, lang)}
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500">
                      {items.filter((i) => settings.features[i.key]).length}/{items.length} ON
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((def) => {
                      const isOn = Boolean(settings.features[def.key]);
                      return (
                        <div key={def.key} className="px-4 py-3 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {b(def.labelBn, def.labelEn, lang)}
                              </span>
                              {def.critical && (
                                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">
                                  {b('সতর্কীকরণযুক্ত', 'Critical', lang)}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {b(def.nonDestructiveNoteBn, def.nonDestructiveNoteEn, lang)}
                            </p>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isOn}
                            data-testid={`feature-toggle-${def.key}`}
                            onClick={() => handleRequestToggle(def)}
                            className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
                              isOn ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                isOn ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Settings Audit Log Section */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  {b('সেটিংস পরিবর্তনের অডিট লগ (Settings Audit Trail)', 'Settings Change Audit Log', lang)}
                </h4>
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('audit')}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {b('সম্পূর্ণ অডিট লগ →', 'View Full Audit Log →', lang)}
                  </button>
                )}
              </div>
              {recentSettingsAudits.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {b('এখনো কোনো ফিচার টগল পরিবর্তনের রেকর্ড তৈরি হয়নি।', 'No settings toggle audit entries recorded yet.', lang)}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {recentSettingsAudits.map((entry) => (
                    <div key={entry.id} className="text-xs flex flex-wrap items-center justify-between gap-2 py-1.5 border-b last:border-b-0 border-slate-100 dark:border-slate-800">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{entry.targetName}</span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {entry.oldValue} → <strong className="text-emerald-600 dark:text-emerald-400">{entry.newValue}</strong>
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {entry.who} · {entry.when}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'school_settings':
        return (
          <div className="space-y-4">
            {/* School Profile -> School Cover Photo Management (Moved cleanly out of Dashboard) */}
            {activeSchool && (
              <div
                data-testid="settings-school-cover-section"
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-emerald-600" />
                      {b('School Profile · School Cover Photo', 'School Profile · School Cover Photo', lang)}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {b(
                        'School Admin / অনুমোদিত অ্যাডমিন এখান থেকে নিরাপদ Confirmation সহ বিদ্যালয়ের Cover Photo পরিবর্তন বা সরাতে পারবেন।',
                        'Only authorized School Admins can change or remove the School Cover Photo with confirmation.',
                        lang
                      )}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {activeSchool.schoolPublicId ?? activeSchool.code}
                  </span>
                </div>

                {/* Current School Cover Photo Preview */}
                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 h-36 sm:h-44 bg-gradient-to-br from-[#071526] via-[#0f1f3d] to-[#0A2463] flex items-end">
                  {(pendingCoverPreview ?? activeSchool.coverImageUrl) ? (
                    <img
                      src={pendingCoverPreview ?? activeSchool.coverImageUrl}
                      alt={activeSchool.nameEn}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-300">
                      {b('কভার ফটো সরানো হয়েছে (ডিফল্ট গাঢ় ব্যাকগ্রাউন্ড সক্রিয়)', 'Cover photo removed (using default dark header backdrop)', lang)}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent" />
                  <div className="relative z-10 w-full p-3.5 flex flex-wrap items-center justify-between gap-2 text-white">
                    <div>
                      <div className="text-xs font-bold">
                        {pendingCoverPreview
                          ? b('নতুন কভার ফটো প্রিভিউ (সংরক্ষণ বাকি)', 'New Cover Photo Preview (Pending Save)', lang)
                          : b('বর্তমান School Cover Photo', 'Current School Cover Photo', lang)}
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {b(activeSchool.nameBn, activeSchool.nameEn, lang)}
                      </div>
                    </div>
                    {canManageSchoolCover && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          data-testid="settings-change-cover-btn"
                          onClick={() => setCoverConfirmAction('change')}
                          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{b('Change Cover Photo', 'Change Cover Photo', lang)}</span>
                        </button>
                        {activeSchool.coverImageUrl !== '' && (
                          <button
                            type="button"
                            data-testid="settings-remove-cover-btn"
                            onClick={() => setCoverConfirmAction('remove')}
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-slate-900/80 hover:bg-red-700 border border-white/25 text-white text-xs font-semibold cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{b('Remove Cover Photo', 'Remove Cover Photo', lang)}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Hidden Device File Input */}
                <input
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/*"
                  data-testid="settings-cover-file-input"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === 'string') {
                        setPendingCoverPreview(reader.result);
                      }
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />

                {/* Unlocked Cover Photo Upload / Crop / Gallery + Save/Confirm Controls */}
                {canManageSchoolCover && coverEditUnlocked && (
                  <div
                    data-testid="settings-cover-editor-controls"
                    className="rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3.5 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        {b(
                          'ডিভাইস থেকে নতুন Cover Photo নির্বাচন করুন অথবা গ্যালারি/ক্রপ ব্যবহার করুন:',
                          'Select a new Cover Photo from your device or open Crop / Gallery:',
                          lang
                        )}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          data-testid="settings-cover-upload-device-btn"
                          onClick={() => coverFileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-xs font-bold text-emerald-800 dark:text-emerald-200 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{b('ডিভাইস থেকে ছবি নির্বাচন', 'Choose From Device', lang)}</span>
                        </button>
                        {onOpenBannerCrop && (
                          <button
                            type="button"
                            onClick={onOpenBannerCrop}
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                          >
                            <Crop className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{b('ক্রপ ও সমন্বয় এডিটর', 'Crop & Adjust', lang)}</span>
                          </button>
                        )}
                        {onOpenCoverGallery && (
                          <button
                            type="button"
                            onClick={onOpenCoverGallery}
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                            <span>{b('প্রস্তাবিত কভার গ্যালারি', 'Cover Gallery', lang)}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {pendingCoverPreview && onUpdateSchoolInfo && (
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-emerald-200/70 dark:border-emerald-800/60">
                        <button
                          type="button"
                          onClick={() => setPendingCoverPreview(null)}
                          className="h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                        >
                          {b('বাতিল', 'Cancel', lang)}
                        </button>
                        <button
                          type="button"
                          data-testid="settings-save-cover-btn"
                          onClick={() => {
                            onUpdateSchoolInfo(activeSchool.id, { coverImageUrl: pendingCoverPreview });
                            setPendingCoverPreview(null);
                            setCoverEditUnlocked(false);
                            showToast(
                              'School Cover Photo সফলভাবে সংরক্ষণ করা হয়েছে ও ড্যাশবোর্ডে আপডেট হয়েছে।',
                              'School Cover Photo saved and updated on Dashboard.'
                            );
                          }}
                          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{b('Save / Confirm Cover Photo', 'Save / Confirm', lang)}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeSchool && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {b('বিদ্যালয়ের প্রোফাইল, লোগো ও ঠিকানা', 'School Profile, Logo & Address', lang)}
                  </h4>
                  {onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('dashboard')}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {b('ড্যাশবোর্ড কভারে দেখুন →', 'View on School Dashboard →', lang)}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      {b('বিদ্যালয়ের নাম', 'School Name', lang)}
                    </label>
                    <input
                      type="text"
                      value={schoolNameBnEdit}
                      onChange={(e) => setSchoolNameBnEdit(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      {b('যোগাযোগ নম্বর', 'Contact Phone', lang)}
                    </label>
                    <input
                      type="text"
                      value={schoolMobileEdit}
                      onChange={(e) => setSchoolMobileEdit(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      {b('পূর্ণ ঠিকানা', 'School Address', lang)}
                    </label>
                    <input
                      type="text"
                      value={schoolAddressEdit}
                      onChange={(e) => setSchoolAddressEdit(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>
                {onUpdateSchoolInfo && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateSchoolInfo(activeSchool.id, {
                          nameBn: schoolNameBnEdit || activeSchool.nameBn,
                          mobile: schoolMobileEdit || activeSchool.mobile,
                          fullAddress: schoolAddressEdit || activeSchool.fullAddress,
                        });
                        showToast('বিদ্যালয়ের তথ্য হালনাগাদ হয়েছে।', 'School details updated.');
                      }}
                      className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                    >
                      {b('বিদ্যালয় তথ্য সংরক্ষণ', 'Save School Info', lang)}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {b('স্কুল শুরুর সময় ও ছুটির সময় (School Time)', 'School Hours', lang)}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={settings.schoolConfig.schoolStartTime}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        schoolConfig: { ...settings.schoolConfig, schoolStartTime: e.target.value },
                      })
                    }
                    className="h-10 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                  <input
                    type="time"
                    value={settings.schoolConfig.schoolEndTime}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        schoolConfig: { ...settings.schoolConfig, schoolEndTime: e.target.value },
                      })
                    }
                    className="h-10 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {b('গ্রেডিং সিস্টেম ও পাস নম্বর (%)', 'Grading System & Pass %', lang)}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={settings.schoolConfig.gradingScaleMode}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        schoolConfig: {
                          ...settings.schoolConfig,
                          gradingScaleMode: e.target.value as 'NCTB Primary (A+ to F)' | 'Percentage Standard',
                        },
                      })
                    }
                    className="col-span-2 h-10 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  >
                    <option value="NCTB Primary (A+ to F)">NCTB Primary (A+ to F)</option>
                    <option value="Percentage Standard">Percentage Standard</option>
                  </select>
                  <input
                    type="number"
                    min={20}
                    max={60}
                    value={settings.schoolConfig.passMarkPct}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        schoolConfig: { ...settings.schoolConfig, passMarkPct: Number(e.target.value) || 33 },
                      })
                    }
                    className="h-10 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {b('হাজিরা গ্রেস সময় (মিনিট) ও ন্যূনতম উপস্থিতি সতর্কতা (%)', 'Late Grace (mins) & Attendance Alert %', lang)}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={0}
                    max={45}
                    value={settings.schoolConfig.lateGraceMinutes}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        schoolConfig: { ...settings.schoolConfig, lateGraceMinutes: Number(e.target.value) || 15 },
                      })
                    }
                    className="h-10 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                  <input
                    type="number"
                    min={50}
                    max={95}
                    value={settings.schoolConfig.minAttendanceAlertPct}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        schoolConfig: { ...settings.schoolConfig, minAttendanceAlertPct: Number(e.target.value) || 75 },
                      })
                    }
                    className="h-10 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {b('ক্লাস, সেকশন ও রুম/শ্রেণিকক্ষ কনফিগারেশন', 'Classes, Sections & Classrooms', lang)}
                </label>
                <input
                  type="text"
                  value={settings.schoolConfig.roomsList}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      schoolConfig: { ...settings.schoolConfig, roomsList: e.target.value },
                    })
                  }
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {b('কর্মদিবস:', 'Working Days:', lang)} {settings.schoolConfig.workingDays.join(', ')} ·{' '}
                  {settings.schoolConfig.holidayCalendarSummary}
                </span>
                <button
                  type="button"
                  onClick={() => showToast('স্কুল সেটিংস সফলভাবে সংরক্ষিত হয়েছে।', 'School settings saved.')}
                  className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  {b('স্কুল নীতিমালা সংরক্ষণ', 'Save Rules', lang)}
                </button>
              </div>
            </div>
          </div>
        );

      case 'users_permissions':
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {b('ব্যবহারকারী, রোল ও মডিউল পারমিশন নিয়ন্ত্রণ', 'User Accounts, Roles & Permission Access', lang)}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {b(
                    'শিক্ষক ও শিক্ষার্থীর অ্যাকাউন্ট সক্রিয়/সাময়িক ব্লক (Suspend) করুন বা বিস্তারিত পারমিশন প্যানেলে যান।',
                    'Activate or temporarily suspend teacher/student accounts without deleting their academic records.',
                    lang
                  )}
                </p>
              </div>
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab(role === 'central_admin' ? 'permissions' : 'teachers')}
                  className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{b('বিস্তারিত পারমিশন ম্যানেজমেন্ট →', 'Open Full Permissions →', lang)}</span>
                </button>
              )}
            </div>

            {/* Teachers Quick Control */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>{b('শিক্ষক ও অ্যাডমিন অ্যাকাউন্ট স্ট্যাটাস', 'Teacher & Staff Account Status', lang)} ({teachers.length})</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
                {teachers.slice(0, 8).map((t) => {
                  const isActive = t.status === 'active';
                  return (
                    <div key={t.id} className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {b(t.nameBn, t.nameEn, lang)} <span className="font-mono text-[11px] text-slate-500">({t.teacherCode})</span>
                        </div>
                        <div className="text-[11px] text-slate-500">{t.designation} · {t.schoolNameBn}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${isActive ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'}`}>
                          {t.status}
                        </span>
                        {onToggleTeacherStatus && (
                          <button
                            type="button"
                            onClick={() => {
                              onToggleTeacherStatus(t.id, isActive ? 'suspended' : 'active');
                              showToast(
                                isActive ? 'শিক্ষক অ্যাকাউন্ট সাময়িক ব্লক করা হয়েছে।' : 'শিক্ষক অ্যাকাউন্ট পুনরায় সক্রিয় করা হয়েছে।',
                                isActive ? 'Teacher account suspended.' : 'Teacher account activated.'
                              );
                            }}
                            className="h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            {isActive ? b('ব্লক / নিষ্ক্রিয়', 'Block / Disable', lang) : b('সক্রিয় করুন', 'Activate', lang)}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Students Quick Control */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white">
                {b('শিক্ষার্থী অ্যাকাউন্ট স্ট্যাটাস', 'Student Account Status', lang)} ({students.length})
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                {students.slice(0, 6).map((s) => {
                  const isActive = s.status === 'active';
                  return (
                    <div key={s.id} className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {b(s.nameBn, s.nameEn, lang)} <span className="font-mono text-[11px] text-slate-500">({s.permanentId})</span>
                        </div>
                        <div className="text-[11px] text-slate-500">{s.className} · {b('রোল:', 'Roll:', lang)} {s.roll}</div>
                      </div>
                      {onToggleStudentStatus && (
                        <button
                          type="button"
                          onClick={() => {
                            onToggleStudentStatus(s.id, isActive ? 'suspended' : 'active');
                            showToast(
                              isActive ? 'শিক্ষার্থী অ্যাকাউন্ট সাময়িক স্থগিত করা হয়েছে।' : 'শিক্ষার্থী অ্যাকাউন্ট পুনরায় সক্রিয় হয়েছে।',
                              isActive ? 'Student account blocked.' : 'Student account activated.'
                            );
                          }}
                          className="h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          {isActive ? b('ব্লক করুন', 'Block', lang) : b('সক্রিয় করুন', 'Activate', lang)}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'data_backup':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDownloadJsonBackup}
                className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 text-left flex items-center justify-between gap-3 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/50 cursor-pointer"
              >
                <div>
                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    {b('সম্পূর্ণ সিস্টেম ব্যাকআপ (Backup & Export JSON)', 'Download Full System Backup', lang)}
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {b('সর্বশেষ ব্যাকআপ:', 'Last backup:', lang)} {settings.dataGovernance.lastBackupAt}
                  </div>
                </div>
                <Download className="w-5 h-5 text-emerald-600 shrink-0" />
              </button>

              <label className="p-4 rounded-xl border border-blue-500/30 bg-blue-50 dark:bg-blue-950/30 text-left flex items-center justify-between gap-3 hover:bg-blue-100/70 dark:hover:bg-blue-950/50 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-blue-900 dark:text-blue-200">
                    {b('ব্যাকআপ থেকে রিস্টোর / ইম্পোর্ট (Restore & Import)', 'Restore / Import JSON Backup', lang)}
                  </div>
                  <div className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">
                    {b('সুরক্ষিত JSON ব্যাকআপ ফাইল আপলোড করুন', 'Upload a valid PSMS backup JSON file', lang)}
                  </div>
                </div>
                <Upload className="w-5 h-5 text-blue-600 shrink-0" />
                <input type="file" accept=".json,application/json" onChange={handleRestoreJsonBackup} className="hidden" />
              </label>
            </div>

            {/* Retention & Trash Recovery */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-amber-600" />
                  {b('মুছে ফেলা তথ্য পুনরুদ্ধার ও আর্কাইভ (Trash & Recovery)', 'Deleted Data & Trash Recovery', lang)}
                </h4>
                <select
                  value={settings.dataGovernance.retentionDays}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      dataGovernance: {
                        ...settings.dataGovernance,
                        retentionDays: Number(e.target.value) as 90 | 180 | 365,
                      },
                    })
                  }
                  className="h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  <option value={90}>{b('ডাটা সংরক্ষণ: ৯০ দিন', 'Retention: 90 Days', lang)}</option>
                  <option value={180}>{b('ডাটা সংরক্ষণ: ১৮০ দিন', 'Retention: 180 Days', lang)}</option>
                  <option value={365}>{b('ডাটা সংরক্ষণ: ৩৬৫ দিন', 'Retention: 365 Days', lang)}</option>
                </select>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {settings.dataGovernance.trashItems.map((item) => (
                  <div key={item.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {b(item.titleBn, item.titleEn, lang)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {item.entityType} · {item.deletedAt} · {item.deletedBy}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={item.restored}
                      onClick={() => {
                        onUpdateSettings({
                          ...settings,
                          dataGovernance: {
                            ...settings.dataGovernance,
                            trashItems: settings.dataGovernance.trashItems.map((t) =>
                              t.id === item.id ? { ...t, restored: true } : t
                            ),
                          },
                        });
                        showToast('তথ্যটি সফলভাবে পুনরুদ্ধার করা হয়েছে।', 'Record restored from trash.');
                      }}
                      className={`h-8 px-3 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                        item.restored
                          ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 cursor-default'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{item.restored ? b('পুনরুদ্ধার সম্পন্ন', 'Restored ✓', lang) : b('রিস্টোর করুন', 'Restore', lang)}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'templates_documents':
        return (
          <div className="space-y-3">
            {settings.templates.map((tpl) => (
              <div key={tpl.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {b(tpl.titleBn, tpl.titleEn, lang)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {tpl.headerStyle} · {tpl.footerNote}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={tpl.enabled}
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      templates: settings.templates.map((item) =>
                        item.id === tpl.id ? { ...item, enabled: !item.enabled } : item
                      ),
                    })
                  }
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                    tpl.enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      tpl.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        );

      case 'regional_settings':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {b('দেশ (Country)', 'Country', lang)}
              </label>
              <input
                type="text"
                value={settings.regional.country}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    regional: { ...settings.regional, country: e.target.value },
                  })
                }
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              />
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {b('টাইম জোন (Time Zone)', 'Time Zone', lang)}
              </label>
              <select
                value={settings.regional.timeZone}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    regional: { ...settings.regional, timeZone: e.target.value },
                  })
                }
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="Asia/Dhaka (UTC+6)">Asia/Dhaka (UTC+6)</option>
                <option value="UTC (GMT+0)">UTC (GMT+0)</option>
              </select>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {b('মুদ্রা (Currency)', 'Currency', lang)}
              </label>
              <select
                value={settings.regional.currency}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    regional: { ...settings.regional, currency: e.target.value },
                  })
                }
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="BDT (৳)">BDT (৳ — বাংলাদেশী টাকা)</option>
                <option value="USD ($)">USD ($)</option>
              </select>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {b('সংখ্যা বিন্যাস (Number Format)', 'Number Format', lang)}
              </label>
              <select
                value={settings.regional.numberFormat}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    regional: { ...settings.regional, numberFormat: e.target.value as 'bn' | 'en' },
                  })
                }
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="bn">বাংলা সংখ্যা (০১২৩৪৫)</option>
                <option value="en">International Digits (012345)</option>
              </select>
            </div>
          </div>
        );

      case 'subscription_billing':
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {b('বর্তমান সক্রিয় প্ল্যান (Current Plan)', 'Current Active Plan', lang)}
                </div>
                <div className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {settings.subscription.planName}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  {b('নবায়ন তারিখ:', 'Renewal Date:', lang)} {settings.subscription.renewalDate} · {settings.subscription.maxSchools}
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold">
                {settings.subscription.status}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                {b('পেমেন্ট ও লাইসেন্স ইতিহাস (Payment History)', 'Billing & License History', lang)}
              </h4>
              {settings.subscription.paymentHistory.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between text-xs py-2 border-b last:border-b-0 border-slate-100 dark:border-slate-800">
                  <span className="font-mono">{p.invoiceNo}</span>
                  <span>{p.date}</span>
                  <span className="font-bold">{p.amount}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{p.status}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'help_support':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {b('সচরাচর জিজ্ঞাসিত প্রশ্ন (FAQ & User Guide)', 'FAQ & User Guide', lang)}
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
                  <li>{b('কোনো ফিচার বন্ধ করলে পূর্বের কোনো ছাত্র বা শিক্ষকের ডেটা ডিলিট হয় না।', 'Disabling a feature never deletes existing student or teacher records.', lang)}</li>
                  <li>{b('Web ও Android অ্যাপ একই অ্যাকাউন্ট ও একই ব্যাকএন্ড সার্ভার ব্যবহার করে।', 'Web and Android App share identical accounts and backend API sync.', lang)}</li>
                  <li>{b('অফলাইনে থাকলেও পূর্বের রুটিন ও নোটিশ দেখা যাবে।', 'Cached schedules and notices remain accessible offline.', lang)}</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {b('কেন্দ্রীয় অ্যাডমিন / সাপোর্ট যোগাযোগ', 'Direct Support & Central Admin Contact', lang)}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {b('জরুরি সহায়তার জন্য সরাসরি মেইন অ্যাডমিনের কাছে বার্তা পাঠান।', 'Send an encrypted support message directly to the System Owner.', lang)}
                  </p>
                </div>
                {onOpenContactAdmin && (
                  <button
                    type="button"
                    onClick={onOpenContactAdmin}
                    className="h-10 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{b('সাপোর্ট / Admin-কে বার্তা দিন', 'Contact Support / Admin', lang)}</span>
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmitSupportTicket} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('সমস্যা রিপোর্ট, মতামত বা নতুন ফিচার অনুরোধ', 'Report a Problem, Feedback or Feature Request', lang)}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={ticketType}
                  onChange={(e) => setTicketType(e.target.value as 'support' | 'bug' | 'feedback' | 'feature_request')}
                  className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  <option value="feedback">{b('মতামত পাঠান (Feedback)', 'Send Feedback', lang)}</option>
                  <option value="bug">{b('সমস্যা রিপোর্ট (Report a Problem)', 'Report a Problem', lang)}</option>
                  <option value="feature_request">{b('ফিচার অনুরোধ (Request a Feature)', 'Request a Feature', lang)}</option>
                  <option value="support">{b('সাপোর্ট টিকেট (Support)', 'Support Ticket', lang)}</option>
                </select>
                <input
                  type="text"
                  placeholder={b('বিষয় লিখুন...', 'Subject...', lang)}
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="md:col-span-2 h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <textarea
                rows={3}
                placeholder={b('বিস্তারিত বর্ণনা লিখুন...', 'Describe in detail...', lang)}
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  {b('জমা দিন', 'Submit Ticket', lang)}
                </button>
              </div>
            </form>
          </div>
        );

      case 'deployment_links': {
        const handleCopyDeploymentLink = async (url: string, labelBn: string, labelEn: string) => {
          if (!url) return;
          try {
            if (navigator.clipboard?.writeText) {
              await navigator.clipboard.writeText(url);
            }
            showToast(`${labelBn} লিংক কপি করা হয়েছে।`, `${labelEn} link copied to clipboard.`);
          } catch {
            showToast('ক্লিপবোর্ডে কপি করা যায়নি।', 'Unable to copy to clipboard.');
          }
        };

        const handleSaveDeploymentLinks = async (e: React.FormEvent) => {
          e.preventDefault();
          setDeploymentError(null);
          const checks = [
            validateDeploymentUrl(deploymentDraft.webAppUrl, 'web'),
            validateDeploymentUrl(deploymentDraft.androidApkUrl, 'apk'),
            validateDeploymentUrl(deploymentDraft.githubRepoUrl, 'github'),
            validateDeploymentUrl(deploymentDraft.apiBaseUrl, 'api'),
          ];
          const bad = checks.find((c) => !c.valid);
          if (bad) {
            setDeploymentError(b(bad.errorBn ?? 'অবৈধ লিংক', bad.errorEn ?? 'Invalid URL', lang));
            return;
          }
          setSavingDeployment(true);
          try {
            const res = await fetch(resolveApiUrl('/api/deployment'), {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                role,
                actorName,
                webAppUrl: checks[0].normalized,
                androidApkUrl: checks[1].normalized,
                githubRepoUrl: checks[2].normalized,
                apiBaseUrl: checks[3].normalized,
              }),
            });
            const data = (await res.json()) as {
              ok?: boolean;
              deployment?: ResolvedDeploymentLinksState;
              raw?: DeploymentLinksRecord;
              error?: string;
              errorBn?: string;
            };
            if (!res.ok || !data.deployment) {
              setDeploymentError(b(data.errorBn ?? 'সংরক্ষণ ব্যর্থ হয়েছে', data.error ?? 'Failed to save', lang));
              return;
            }
            setDeploymentState(data.deployment);
            if (data.raw) setDeploymentDraft(data.raw);
            setDeploymentEditorOpen(false);
            showToast('ডিপ্লয়মেন্ট ও অ্যাপ লিংক সংরক্ষিত হয়েছে।', 'Deployment & App Links saved.');
          } catch {
            setDeploymentError(b('সার্ভারের সাথে সংযোগ করা যায়নি।', 'Unable to connect to shared backend.', lang));
          } finally {
            setSavingDeployment(false);
          }
        };

        return (
          <div className="space-y-4" data-testid="deployment-app-links-section">
            {/* Unified Web + Android Architecture Banner */}
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
                  {b(
                    'একই সিস্টেম — Web App (Browser) + Android APK (Mobile)',
                    'Unified Platform — Live Web App + Android APK',
                    lang
                  )}
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                  {b(
                    'দুই প্ল্যাটফর্মেই একই Backend, Database, Authentication, User Account, School, Teacher, Student, Notice, Routine, Exam Routine, Profile ও Settings ব্যবহৃত হয়।',
                    'Both Web App and Android APK share the exact same Backend, Database, Auth, Accounts, School/Teacher/Student data, Routine, Notice, Profile & Settings.',
                    lang
                  )}
                </p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shrink-0 ${
                  backendStatus?.ok
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                }`}
              >
                <RefreshCw className="w-3 h-3" />
                {backendStatus?.ok
                  ? b('Shared Backend সংযুক্ত', 'Shared Backend Connected', lang)
                  : b('অফলাইন / লোকাল মোড', 'Offline Sync Fallback', lang)}
              </span>
            </div>

            {/* 3 Primary App Link Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Live Web App */}
              <div
                data-testid="deployment-card-web"
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg" aria-hidden="true">🌐</span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Live Web App</h4>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {b('কম্পিউটার, ল্যাপটপ, ট্যাবলেট ও মোবাইল ব্রাউজার', 'Computer, Laptop, Tablet & Mobile Browser', lang)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800/70 p-2.5 space-y-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Web App Status
                    </div>
                    <div
                      data-testid="web-app-status-label"
                      className={`text-xs font-bold ${
                        deploymentState.webApp.published
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {deploymentState.webApp.statusEn}
                    </div>
                    {deploymentState.webApp.published ? (
                      <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300 break-all">
                        {deploymentState.webApp.url}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {b(
                          `টার্গেট প্রজেক্ট: ${deploymentState.projectSlug} (প্রকৃত ডিপ্লয়মেন্টের পর লাইভ URL সক্রিয় হবে)`,
                          `Target project: ${deploymentState.projectSlug} (activates after live publish)`,
                          lang
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {deploymentState.webApp.published ? (
                    <a
                      href={deploymentState.webApp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="open-web-app-btn"
                      className="w-full h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span>Open Web App</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      data-testid="open-web-app-btn"
                      className="w-full h-9 px-3 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-500 text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-not-allowed"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span>Open Web App</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={!deploymentState.webApp.published}
                    data-testid="copy-web-link-btn"
                    onClick={() => handleCopyDeploymentLink(deploymentState.webApp.url, 'Live Web App', 'Live Web App')}
                    className={`w-full h-9 px-3 rounded-lg border text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      deploymentState.webApp.published
                        ? 'border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                        : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5 shrink-0" />
                    <span>Copy Web Link</span>
                  </button>
                </div>
              </div>

              {/* 2. Android APK */}
              <div
                data-testid="deployment-card-apk"
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg" aria-hidden="true">📱</span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Android APK</h4>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {deploymentState.packageId} · v{deploymentState.versionName}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800/70 p-2.5 space-y-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      APK Status
                    </div>
                    <div
                      data-testid="apk-status-label"
                      className={`text-xs font-bold ${
                        deploymentState.androidApk.available
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {deploymentState.androidApk.statusEn}
                    </div>
                    {deploymentState.androidApk.available ? (
                      <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300 break-all">
                        {deploymentState.androidApk.url}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {b(
                          'রিলিজ APK ডাউনলোড URL যুক্ত না হওয়া পর্যন্ত ডাউনলোড বন্ধ থাকবে।',
                          'Download stays disabled until a verified APK release URL is configured.',
                          lang
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {deploymentState.androidApk.available ? (
                    <a
                      href={deploymentState.androidApk.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      data-testid="download-apk-btn"
                      className="w-full h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span>Download APK</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      data-testid="download-apk-btn"
                      className="w-full h-9 px-3 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-500 text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-not-allowed"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span>Download APK</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={!deploymentState.androidApk.available}
                    data-testid="copy-apk-link-btn"
                    onClick={() => handleCopyDeploymentLink(deploymentState.androidApk.url, 'Android APK', 'Android APK')}
                    className={`w-full h-9 px-3 rounded-lg border text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      deploymentState.androidApk.available
                        ? 'border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                        : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5 shrink-0" />
                    <span>Copy APK Link</span>
                  </button>
                </div>
              </div>

              {/* 3. GitHub Repository */}
              <div
                data-testid="deployment-card-github"
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg" aria-hidden="true">🐙</span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">GitHub Repository</h4>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {b('সোর্স কোড ও স্বয়ংক্রিয় CI/CD বিল্ড', 'Source code & Web/APK CI/CD workflow', lang)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800/70 p-2.5 space-y-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Repository Status
                    </div>
                    <div
                      data-testid="github-status-label"
                      className={`text-xs font-bold ${
                        deploymentState.githubRepo.connected
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {deploymentState.githubRepo.statusEn}
                    </div>
                    {deploymentState.githubRepo.connected ? (
                      <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300 break-all">
                        {deploymentState.githubRepo.url}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {b(
                          'প্রকৃত GitHub রিপোজিটরি সংযুক্ত হলে সোর্স ও বিল্ড লিংক সক্রিয় হবে।',
                          'Connect a real GitHub repository URL to enable direct links.',
                          lang
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {deploymentState.githubRepo.connected ? (
                    <a
                      href={deploymentState.githubRepo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="open-github-repo-btn"
                      className="w-full h-9 px-3 rounded-lg bg-slate-900 dark:bg-slate-100 hover:opacity-90 text-white dark:text-slate-900 text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-opacity"
                    >
                      <GitBranch className="w-3.5 h-3.5 shrink-0" />
                      <span>Open GitHub Repository</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      data-testid="open-github-repo-btn"
                      className="w-full h-9 px-3 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-500 text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-not-allowed"
                    >
                      <GitBranch className="w-3.5 h-3.5 shrink-0" />
                      <span>Open GitHub Repository</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={!deploymentState.githubRepo.connected}
                    data-testid="copy-github-link-btn"
                    onClick={() => handleCopyDeploymentLink(deploymentState.githubRepo.url, 'GitHub Repository', 'GitHub Repository')}
                    className={`w-full h-9 px-3 rounded-lg border text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      deploymentState.githubRepo.connected
                        ? 'border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                        : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5 shrink-0" />
                    <span>Copy Repository Link</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Central Admin Only: Configure Verified Deployment URLs */}
            {role === 'central_admin' && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {b('প্রকৃত Deployment ও App Links কনফিগারেশন (Central Admin)', 'Configure Verified Deployment Links (Central Admin Only)', lang)}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {b(
                        'প্রকৃত ডিপ্লয়মেন্ট সম্পন্ন হলে প্রকাশিত https:// লিংক এখানে যুক্ত করুন (নকল লিংক গ্রহণযোগ্য নয়)।',
                        'Add real published https:// URLs only after actual deployment succeeds (placeholders are rejected).',
                        lang
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="toggle-deployment-editor-btn"
                    onClick={() => {
                      setDeploymentError(null);
                      setDeploymentEditorOpen((prev) => !prev);
                    }}
                    className="h-8 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {deploymentEditorOpen
                      ? b('বন্ধ করুন', 'Close Editor', lang)
                      : b('লিংক কনফিগার করুন', 'Configure Real URLs', lang)}
                  </button>
                </div>

                {deploymentEditorOpen && (
                  <form onSubmit={handleSaveDeploymentLinks} className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {deploymentError && (
                      <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300">
                        {deploymentError}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Live Web App URL (https://)
                        </label>
                        <input
                          type="url"
                          data-testid="input-live-web-url"
                          placeholder="https://..."
                          value={deploymentDraft.webAppUrl}
                          onChange={(e) => setDeploymentDraft((p) => ({ ...p, webAppUrl: e.target.value }))}
                          className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Android APK Download URL (https://)
                        </label>
                        <input
                          type="url"
                          data-testid="input-android-apk-url"
                          placeholder="https://.../*.apk"
                          value={deploymentDraft.androidApkUrl}
                          onChange={(e) => setDeploymentDraft((p) => ({ ...p, androidApkUrl: e.target.value }))}
                          className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          GitHub Repository URL
                        </label>
                        <input
                          type="url"
                          data-testid="input-github-repo-url"
                          placeholder="https://github.com/<owner>/<repo>"
                          value={deploymentDraft.githubRepoUrl}
                          onChange={(e) => setDeploymentDraft((p) => ({ ...p, githubRepoUrl: e.target.value }))}
                          className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Shared Backend API Origin (Optional for External APK)
                        </label>
                        <input
                          type="url"
                          data-testid="input-api-base-url"
                          placeholder="https://..."
                          value={deploymentDraft.apiBaseUrl}
                          onChange={(e) => setDeploymentDraft((p) => ({ ...p, apiBaseUrl: e.target.value }))}
                          className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="submit"
                        disabled={savingDeployment}
                        data-testid="save-deployment-links-btn"
                        className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingDeployment ? b('সংরক্ষণ হচ্ছে...', 'Saving...', lang) : b('সংরক্ষণ করুন', 'Save Links', lang)}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        );
      }

      case 'about':
        return (
          <div className="space-y-4">
            <PWAInstallButton lang={lang} variant="card" />

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {b('প্রাথমিক বিদ্যালয় ব্যবস্থাপনা পদ্ধতি (PSMS Bangladesh)', 'Primary School Management System (PSMS Bangladesh)', lang)}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {b('সংস্করণ 2026.1.0 · Unified Web Browser + Android Mobile App (APK & WebAPK)', 'Version 2026.1.0 · Unified Web Browser + Android Mobile App', lang)}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
                    backendStatus?.ok
                      ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  <RefreshCw className="w-3 h-3" />
                  {backendStatus?.ok
                    ? b('সার্ভার ও ডাটাবেস সিঙ্ক সক্রিয়', 'Shared Backend & DB Synced', lang)
                    : b('লোকাল অফলাইন মোড', 'Local Offline Sync Mode', lang)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {b('নীতিমালা ও গোপনীয়তা (Terms & Privacy Policy)', 'Terms & Privacy Policy', lang)}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    {b('বাংলাদেশ প্রাথমিক শিক্ষা অধিদপ্তরের ডিজিটাল নিরাপত্তা ও ছাত্র/শিক্ষক গোপনীয়তা নীতিমালা অনুসৃত।', 'Complies with educational RBAC, role isolation, and institutional data protection rules.', lang)}
                  </p>
                </div>
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {b('অ্যান্ড্রয়েড APK বিল্ড তথ্য', 'Android Native APK & Web Sync', lang)}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    {b('ডিবাগ ও রিলিজ APK বিল্ড (bd.gov.dpe.psms) — একই ইউজার লগইন ও ডাটাবেস শেয়ার করে।', 'Package ID: bd.gov.dpe.psms (Debug + Release APK ready) sharing identical API & DB.', lang)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-5" data-testid="settings-center-view">
      {/* Header Bar */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {b('সিস্টেম ও অ্যাকাউন্ট সেটিংস (Settings)', 'Settings & Control Center', lang)}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {b(
                `রোল-ভিত্তিক ও পারমিশন-নিয়ন্ত্রিত সেটিংস (${visibleCategories.length}টি অনুমোদিত বিভাগ)`,
                `Role-based & permission-protected settings (${visibleCategories.length} authorized categories)`,
                lang
              )}
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={b('সেটিংস খুঁজুন (যেমন: নিরাপত্তা, থিম, ব্যাকআপ)...', 'Search settings...', lang)}
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {toastMsg && (
        <div
          role="status"
          className="rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold flex items-center gap-2 shadow-md"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Desktop View: Left Menu + Right Panel */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-5 items-start">
        <aside className="col-span-4 xl:col-span-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 space-y-1 sticky top-20">
          {filteredCategories.map((cat) => {
            const Icon = ICON_MAP[cat.iconKey] ?? Settings;
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                data-testid={`settings-nav-${cat.id}`}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer ${
                  active
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">{b(cat.labelBn, cat.labelEn, lang)}</div>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
              </button>
            );
          })}
        </aside>

        <section className="col-span-8 xl:col-span-9 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
          {(() => {
            const currentMeta = visibleCategories.find((c) => c.id === activeCategory);
            if (!currentMeta) return null;
            const Icon = ICON_MAP[currentMeta.iconKey] ?? Settings;
            return (
              <>
                <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {b(currentMeta.labelBn, currentMeta.labelEn, lang)}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {b(currentMeta.descBn, currentMeta.descEn, lang)}
                    </p>
                  </div>
                </div>
                {renderSectionContent(activeCategory)}
              </>
            );
          })()}
        </section>
      </div>

      {/* Mobile / Tablet Accordion View (< lg) */}
      <div className="lg:hidden space-y-2.5" data-testid="settings-mobile-accordion">
        {filteredCategories.map((cat) => {
          const Icon = ICON_MAP[cat.iconKey] ?? Settings;
          const isOpen = mobileOpenCategory === cat.id;
          return (
            <div
              key={cat.id}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <button
                type="button"
                data-testid={`settings-mobile-cat-${cat.id}`}
                onClick={() => setMobileOpenCategory((prev) => (prev === cat.id ? null : cat.id))}
                className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isOpen
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {b(cat.labelBn, cat.labelEn, lang)}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {b(cat.descBn, cat.descEn, lang)}
                    </div>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {renderSectionContent(cat.id)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog Before Critical Feature Changes */}
      {pendingToggle && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-feature-toggle-title"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 id="confirm-feature-toggle-title" className="text-sm font-bold text-slate-900 dark:text-white">
                  {b('গুরুত্বপূর্ণ সিস্টেম পরিবর্তন নিশ্চিত করুন', 'Confirm System Feature Change', lang)}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  <strong>{b(pendingToggle.labelBn, pendingToggle.labelEn, lang)}</strong>{' '}
                  <ArrowRight className="w-3 h-3 inline mx-1" />{' '}
                  <span className={pendingToggle.nextValue ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                    {pendingToggle.nextValue ? 'ON (সক্রিয়)' : 'OFF (বন্ধ)'}
                  </span>
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 text-xs text-emerald-900 dark:text-emerald-200">
              {b(pendingToggle.noteBn, pendingToggle.noteEn, lang)}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {b('কারণ / নোট (অডিট লগের জন্য ঐচ্ছিক)', 'Reason / Note (Optional for Audit Log)', lang)}
              </label>
              <input
                type="text"
                value={toggleReason}
                onChange={(e) => setToggleReason(e.target.value)}
                placeholder={b('যেমন: ভর্তি সময়সীমা শেষ...', 'e.g., Admission window closed...', lang)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingToggle(null)}
                className="h-10 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                {b('বাতিল', 'Cancel', lang)}
              </button>
              <button
                type="button"
                data-testid="confirm-feature-toggle-btn"
                onClick={() => {
                  executeToggle(pendingToggle.key, pendingToggle.nextValue, toggleReason);
                  setPendingToggle(null);
                }}
                className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{b('নিশ্চিত ও সংরক্ষণ', 'Confirm & Save', lang)}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Confirmation Dialog for School Cover Photo Change / Remove */}
      {coverConfirmAction && activeSchool && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-cover-photo-title"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                coverConfirmAction === 'remove'
                  ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
              }`}>
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 id="confirm-cover-photo-title" className="text-sm font-bold text-slate-900 dark:text-white">
                  {coverConfirmAction === 'remove'
                    ? b('আপনি কি School Cover Photo মুছে ফেলতে চান?', 'Remove School Cover Photo?', lang)
                    : b('আপনি কি School Cover Photo পরিবর্তন করতে চান?', 'Do you want to change the School Cover Photo?', lang)}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  {coverConfirmAction === 'remove'
                    ? b(
                        'কভার ফটো মুছে ফেললে বিদ্যালয়ের ড্যাশবোর্ডে সাধারণ ব্যাকগ্রাউন্ড প্রদর্শিত হবে। পরবর্তীতে যেকোনো সময় নতুন ছবি যুক্ত করা যাবে।',
                        'Removing the cover photo restores the clean dark header backdrop on the School Dashboard.',
                        lang
                      )
                    : b(
                        'নিশ্চিত করলে আপনি ডিভাইস থেকে নতুন ছবি আপলোড বা কভার গ্যালারি থেকে ছবি নির্বাচন করতে পারবেন।',
                        'Once confirmed, you can upload an image from your device or choose from the School Cover Gallery.',
                        lang
                      )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                data-testid="cancel-cover-confirm-btn"
                onClick={() => setCoverConfirmAction(null)}
                className="h-10 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                {b('Cancel', 'Cancel', lang)}
              </button>
              {coverConfirmAction === 'remove' ? (
                <button
                  type="button"
                  data-testid="confirm-remove-cover-btn"
                  onClick={() => {
                    onUpdateSchoolInfo?.(activeSchool.id, { coverImageUrl: '' });
                    setPendingCoverPreview(null);
                    setCoverEditUnlocked(false);
                    setCoverConfirmAction(null);
                    showToast('School Cover Photo মুছে ফেলা হয়েছে।', 'School Cover Photo removed.');
                  }}
                  className="h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                >
                  {b('Remove Photo', 'Remove Photo', lang)}
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="confirm-change-cover-btn"
                  onClick={() => {
                    setCoverConfirmAction(null);
                    setCoverEditUnlocked(true);
                  }}
                  className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  {b('Change Photo', 'Change Photo', lang)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
