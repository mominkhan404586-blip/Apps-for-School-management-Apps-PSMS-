import React, { useState } from 'react';
import {
  Bell,
  Building2,
  ChevronDown,
  Globe,
  GraduationCap,
  Home,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  User,
  UserCheck,
  CheckCheck,
  MessageSquare,
  Camera,
  CheckCircle2,
  Lock,
  RefreshCw,
  Settings,
  Smartphone,
} from 'lucide-react';
import { OfficialAppLogo } from './OfficialAppLogo';
import { OfflineIndicator } from './PWAInstallBanner';
import type { PlatformTarget } from '../utils/devicePreviewEngine';
import type {
  GlobalAcademicSearchResult,
  Language,
  NotificationItem,
  NotificationPreferences,
  Role,
  SchoolRecord,
  StudentRecord,
  TeacherRecord,
  Theme,
} from '../types';
import { AVATARS, CENTRAL_ADMIN_CREDENTIALS } from '../data/mockData';
import { b, tr } from '../i18n/translations';
import {
  NOTIFICATION_CATEGORY_META,
  filterNotifications,
  inferNotificationCategory,
} from '../utils/notificationAndNoticeEngine';

interface TopHeaderProps {
  role: Role;
  onRoleChange: (role: Role) => void;
  lang: Language;
  onToggleLang: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  notifications: NotificationItem[];
  onMarkAllNotificationsRead: () => void;
  onOpenMobileSidebar: () => void;
  isOffline: boolean;
  pendingSyncCount: number;
  onToggleOffline: () => void;
  guardianChildren: StudentRecord[];
  selectedChildId: string;
  onSelectChild: (childId: string) => void;
  activeSchool?: SchoolRecord;
  activeTeacher?: TeacherRecord;
  activeStudent?: StudentRecord;
  pendingTeacherCount?: number;
  onOpenLoginModal: () => void;
  onOpenOnlineSchoolReg: () => void;
  onOpenPortalHub?: () => void;
  onOpenContactAdmin?: () => void;
  onOpenAppDownloadAndShare?: () => void;
  onNavigateTab: (tab: string) => void;
  globalSearchResults?: GlobalAcademicSearchResult[];
  onSelectGlobalSearchResult?: (item: GlobalAcademicSearchResult) => void;
  notificationPreferences?: NotificationPreferences;
  onNavigateFromNotification?: (item: NotificationItem) => void;
  onMarkNotificationRead?: (id: string, read: boolean) => void;
  centralAdminPhotoUrl?: string;
  guardianPhotoUrl?: string;
  onOpenPhotoEditor?: () => void;
  isSchoolLoginLocked?: boolean;
  onUnlockSchoolLogin?: () => void;
  platform?: PlatformTarget;
  onLogout?: () => void;
  roleSwitchLocked?: boolean;
  authenticatedUserEmail?: string;
  centralAdminName?: string;
  guardianName?: string;
  rtdbSyncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  onOpenUserProfileManager?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  role,
  onRoleChange,
  lang,
  onToggleLang,
  theme,
  onToggleTheme,
  searchQuery,
  onSearchChange,
  notifications,
  onMarkAllNotificationsRead,
  onOpenMobileSidebar,
  isOffline,
  pendingSyncCount,
  onToggleOffline,
  guardianChildren,
  selectedChildId,
  onSelectChild,
  activeSchool,
  activeTeacher,
  activeStudent,
  pendingTeacherCount = 0,
  onOpenLoginModal,
  onOpenOnlineSchoolReg,
  onOpenPortalHub,
  onOpenContactAdmin,
  onOpenAppDownloadAndShare,
  onNavigateTab,
  globalSearchResults = [],
  onSelectGlobalSearchResult,
  notificationPreferences,
  onNavigateFromNotification,
  onMarkNotificationRead,
  centralAdminPhotoUrl,
  guardianPhotoUrl,
  onOpenPhotoEditor,
  isSchoolLoginLocked,
  onUnlockSchoolLogin,
  platform: _platform = 'web',
  onLogout,
  roleSwitchLocked = true,
  authenticatedUserEmail,
  centralAdminName,
  guardianName,
  rtdbSyncStatus = 'synced',
  onOpenUserProfileManager,
}) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const roleNotifications = filterNotifications(
    notifications,
    {
      role,
      schoolId: activeSchool?.id,
      teacherId: activeTeacher?.id,
      studentId: activeStudent?.id ?? (role === 'guardian' ? selectedChildId : undefined),
    },
    {
      tab: 'all',
      category: 'all',
      priority: 'all',
      preferences: notificationPreferences,
    }
  );
  const unreadCount = roleNotifications.filter((n) => !n.read).length;

  const brandTitle =
    role === 'central_admin'
      ? tr('centralTitle', lang)
      : role === 'school_admin'
        ? activeSchool
          ? b(activeSchool.nameBn, activeSchool.nameEn, lang)
          : tr('schoolTitle', lang)
        : role === 'teacher'
          ? b('শিক্ষক পোর্টাল', 'Teacher Portal', lang)
          : tr('guardianTitle', lang);

  const brandSubtitle =
    role === 'central_admin'
      ? tr('centralSubtitle', lang)
      : role === 'school_admin'
        ? activeSchool
          ? `${activeSchool.code} · ${activeSchool.schoolType}`
          : tr('schoolSubtitle', lang)
        : role === 'teacher'
          ? activeTeacher
            ? `${activeTeacher.teacherCode} · ${activeTeacher.assignedClasses[0] ?? activeTeacher.schoolId}`
            : b('স্বয়ংক্রিয় শিক্ষক আইডি', 'Verified Teacher Account', lang)
          : tr('guardianSubtitle', lang);

  const profileInfo =
    role === 'central_admin'
      ? {
          name: centralAdminName?.trim() || b(CENTRAL_ADMIN_CREDENTIALS.displayNameBn, CENTRAL_ADMIN_CREDENTIALS.displayNameEn, lang),
          roleLabel: 'Super Central Admin',
          avatar: centralAdminPhotoUrl || AVATARS.centralAdmin,
        }
      : role === 'school_admin'
        ? {
            name: activeSchool?.headTeacher || b('বিদ্যালয় অ্যাডমিন', 'School Admin', lang),
            roleLabel: b('প্রধান শিক্ষক / School Admin', 'Head Teacher / School Admin', lang),
            avatar: activeSchool?.headTeacherPhotoUrl || AVATARS.headTeacher,
          }
        : role === 'teacher'
          ? {
              name: activeTeacher ? b(activeTeacher.nameBn, activeTeacher.nameEn, lang) : b('শিক্ষক অ্যাকাউন্ট', 'Teacher Account', lang),
              roleLabel: activeTeacher?.designation || b('শিক্ষক (Teacher)', 'Teacher', lang),
              avatar: activeTeacher?.photoUrl || AVATARS.headTeacher,
            }
          : {
              name: guardianName?.trim() || b('অভিভাবক অ্যাকাউন্ট', 'Parent Account', lang),
              roleLabel: b('অভিভাবক (Parent)', 'Parent', lang),
              avatar: guardianPhotoUrl || AVATARS.headTeacher,
            };

  const roleOptions: { id: Role; label: string }[] = [
    { id: 'central_admin', label: 'Central' },
    { id: 'school_admin', label: 'School' },
    { id: 'teacher', label: 'Teacher' },
    { id: 'guardian', label: 'Parent' },
  ];

  return (
    <header className="sticky top-0 z-30 h-14 lg:h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-3 lg:px-5 flex items-center justify-between gap-2 no-print">
      {/* Left Zone: Mobile Menu + Logo + Role Title */}
      <div className="flex items-center gap-2 flex-1 lg:flex-initial min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation menu"
          className="lg:hidden shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="shrink-0">
            <OfficialAppLogo
              sizeClass="w-9 h-9"
              roundedClass="rounded-lg"
              alt={b('অফিশিয়াল অ্যাপ লোগো', 'Official School Management System Logo', lang)}
            />
          </div>
          <div className="min-w-0 hidden sm:block">
            <div className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[155px] sm:max-w-[180px] md:max-w-[150px] lg:max-w-[195px] xl:max-w-[235px]">
              {brandTitle}
            </div>
            <div className="hidden lg:block text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px] xl:max-w-[225px]">
              {brandSubtitle}
            </div>
          </div>
        </div>
      </div>

      {/* Center Zone: Global Search (Desktop lg+) */}
      <div className="hidden lg:flex flex-1 min-w-[90px] max-w-[185px] mx-1">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setSearchFocused(true);
            }}
            placeholder={
              role === 'guardian'
                ? b('ক্লাস, ফলাফল বা পাঠ খুঁজুন...', 'Search classes, results...', lang)
                : b('খুঁজুন: ID, স্কুল বা শিক্ষক...', 'Search ID, school, teacher...', lang)
            }
            aria-label={tr('searchPlaceholder', lang)}
            className="w-full h-9 pl-9 pr-3 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 outline-none transition-colors"
          />
          {searchFocused && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 mt-1.5 w-[380px] max-w-[90vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-50 max-h-80 overflow-y-auto">
              <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span>{b('দ্রুত একাডেমিক অনুসন্ধান', 'Global Academic Jump', lang)}</span>
                <span className="tabular-nums">{globalSearchResults.length}</span>
              </div>
              {globalSearchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  {b('কোনো শিক্ষার্থী, রুটিন, পাঠ বা ফলাফল পাওয়া যায়নি', 'No matching academic record found', lang)}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {globalSearchResults.map((item) => {
                    const catLabel: Record<GlobalAcademicSearchResult['category'], string> = {
                      student: b('শিক্ষার্থী', 'Student', lang),
                      result: b('ফলাফল', 'Result', lang),
                      assignment: b('অ্যাসাইনমেন্ট', 'Assignment', lang),
                      routine: b('রুটিন', 'Routine', lang),
                      lesson: b('আজকের পড়া', 'Lesson', lang),
                      teacher_assignment: b('শিক্ষক-বিষয়', 'Assignment', lang),
                      report: b('রিপোর্ট', 'Report', lang),
                    };
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onSelectGlobalSearchResult?.(item);
                          setSearchFocused(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 transition-colors flex items-start justify-between gap-2 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {item.subtitle}
                          </div>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                          {catLabel[item.category]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Zone: Role Switcher, Online Reg, Guardian Child Switcher, Status, Bell, Lang, Theme, Profile */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Active Role Badge or Dev Switcher */}
        {roleSwitchLocked ? (
          <div
            data-testid="header-locked-role-badge"
            className="hidden md:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold whitespace-nowrap shrink-0"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{roleOptions.find((r) => r.id === role)?.label ?? role}</span>
          </div>
        ) : (
          <div
            role="group"
            aria-label={tr('switchRole', lang)}
            className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700"
          >
            {roleOptions.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onRoleChange(r.id)}
                className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  role === r.id
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        {/* Teacher Approval Top Navigation Control (Admin) */}
        {(role === 'central_admin' || role === 'school_admin') && (
          <button
            type="button"
            onClick={() => onNavigateTab('teachers')}
            className="hidden lg:inline-flex items-center gap-1 h-9 px-2 rounded-lg text-[11px] font-semibold border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>
              {b('শিক্ষক অনুমোদন', 'Teacher Approval', lang)}
              {pendingTeacherCount > 0 ? ` (${pendingTeacherCount})` : ''}
            </span>
          </button>
        )}

        {/* Portal Hub Quick Trigger (only when role switcher unlocked) */}
        {!roleSwitchLocked && onOpenPortalHub && (
          <button
            type="button"
            onClick={onOpenPortalHub}
            title={b('পোর্টাল হোম', 'Portal Hub', lang)}
            aria-label={b('পোর্টাল হোম', 'Portal Hub', lang)}
            className="hidden xl:inline-flex items-center gap-1 h-9 px-2 rounded-lg text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden 2xl:inline">{b('পোর্টাল হোম', 'Portal Hub', lang)}</span>
          </button>
        )}

        {/* Online School Registration Quick Trigger */}
        <button
          type="button"
          onClick={onOpenOnlineSchoolReg}
          className="hidden 2xl:inline-flex items-center gap-1 h-9 px-2 rounded-lg text-[11px] font-semibold border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/60 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>{b('স্কুল আবেদন', 'Apply School', lang)}</span>
        </button>

        {/* Contact Admin Trigger (for all portals) */}
        {onOpenContactAdmin && (
          <button
            type="button"
            onClick={onOpenContactAdmin}
            title={b('Admin-এর সাথে যোগাযোগ করুন', 'Contact Admin', lang)}
            aria-label={b('Admin যোগাযোগ', 'Contact Admin', lang)}
            className="hidden lg:inline-flex items-center gap-1 h-9 px-2 rounded-lg text-[11px] font-semibold border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-900/60 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden 2xl:inline">{b('Admin যোগাযোগ', 'Contact Admin', lang)}</span>
          </button>
        )}

        {/* Parent Child Selector */}
        {role === 'guardian' && guardianChildren.length > 0 && (
          <div className="hidden sm:flex items-center">
            <label htmlFor="guardian-child-select" className="sr-only">
              {tr('selectChild', lang)}
            </label>
            <select
              id="guardian-child-select"
              value={selectedChildId}
              onChange={(e) => onSelectChild(e.target.value)}
              className="h-9 px-2.5 text-xs font-semibold rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 border border-sky-200 dark:border-sky-800 outline-none cursor-pointer"
            >
              {guardianChildren.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.nameBn.split(' ').slice(-2).join(' ')} — {child.className}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Realtime Database Sync Indicator ('Syncing...' / 'Queued' / 'Synced') */}
        {(() => {
          const hasOfflineQueue = isOffline || pendingSyncCount > 0;
          const badgeTone =
            rtdbSyncStatus === 'syncing'
              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
              : rtdbSyncStatus === 'error'
                ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                : hasOfflineQueue
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
          const badgeLabel =
            rtdbSyncStatus === 'syncing'
              ? 'Syncing...'
              : rtdbSyncStatus === 'error'
                ? 'Sync Error'
                : pendingSyncCount > 0
                  ? `Queued (${pendingSyncCount})`
                  : isOffline
                    ? 'Offline'
                    : 'Synced';
          return (
            <span
              data-testid="header-rtdb-sync-indicator"
              role="status"
              aria-live="polite"
              title={
                rtdbSyncStatus === 'syncing'
                  ? b('লাইভ ক্লাউড সিঙ্ক হচ্ছে...', 'Syncing live updates...', lang)
                  : rtdbSyncStatus === 'error'
                    ? b('সিঙ্ক ত্রুটি — পুনরায় চেষ্টা করা হচ্ছে', 'Sync error — retrying...', lang)
                    : hasOfflineQueue
                      ? b('অফলাইন কিউ সক্রিয় — অনলাইনে ফিরলে সিঙ্ক হবে', 'Offline queue active — will sync when online', lang)
                      : b('তাৎক্ষণিক ক্লাউড সিঙ্ক সক্রিয়', 'Live updates synced', lang)
              }
              className={`inline-flex items-center gap-1.5 h-8 sm:h-9 px-2 lg:px-2.5 rounded-lg text-[11px] font-bold border whitespace-nowrap shrink-0 transition-colors ${badgeTone}`}
            >
              {rtdbSyncStatus === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : hasOfflineQueue ? (
                <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="tabular-nums">{badgeLabel}</span>
            </span>
          );
        })()}

        {/* Header OfflineIndicator + Pending Uploads Count Badge */}
        <OfflineIndicator
          variant="header"
          lang={lang}
          isOffline={isOffline}
          pendingUploadsCount={pendingSyncCount}
          onClickSync={onToggleOffline}
        />

        {/* Language Toggle */}
        <button
          type="button"
          onClick={onToggleLang}
          aria-label="Toggle language Bangla or English"
          className="hidden sm:inline-flex items-center gap-1 h-9 px-2 lg:px-2.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
          <span className="hidden lg:inline">{lang === 'bn' ? 'বাংলা | EN' : 'EN | বাংলা'}</span>
          <span className="lg:hidden">{lang === 'bn' ? 'বাং' : 'EN'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifOpen((prev) => !prev);
              setProfileOpen(false);
            }}
            aria-label={tr('notifications', lang)}
            className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {tr('notifications', lang)} ({unreadCount})
                </span>
                <button
                  type="button"
                  onClick={onMarkAllNotificationsRead}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {tr('markAllRead', lang)}
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {roleNotifications.slice(0, 8).map((n) => {
                  const catMeta = NOTIFICATION_CATEGORY_META[inferNotificationCategory(n)];
                  return (
                    <div
                      key={n.id}
                      className={`px-4 py-3 text-sm transition-colors ${
                        n.read
                          ? 'bg-white dark:bg-slate-900 opacity-80'
                          : 'bg-blue-50/50 dark:bg-blue-950/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span className="font-semibold text-blue-700 dark:text-blue-400">
                          {b(catMeta.labelBn, catMeta.labelEn, lang)}
                        </span>
                        <span className="font-mono">{n.time}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onMarkNotificationRead?.(n.id, true);
                          if (onNavigateFromNotification) {
                            onNavigateFromNotification(n);
                          } else {
                            onNavigateTab(n.targetTab ?? 'notifications');
                          }
                          setNotifOpen(false);
                        }}
                        className="w-full text-left mt-0.5 cursor-pointer group"
                      >
                        <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400">
                          {b(n.titleBn, n.titleEn, lang)}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          {b(n.messageBn, n.messageEn, lang)}
                        </p>
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab('notifications');
                    setNotifOpen(false);
                  }}
                  className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {b('সকল নোটিফিকেশন সেন্টার দেখুন →', 'Open Notification Center →', lang)}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileOpen((prev) => !prev);
              setNotifOpen(false);
            }}
            aria-label="Open user profile menu"
            className="flex items-center gap-2 h-9 pl-1.5 pr-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <img
              src={profileInfo.avatar}
              alt={profileInfo.name}
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
            />
            <div className="hidden lg:block text-left leading-tight">
              <div className="text-xs font-semibold text-slate-900 dark:text-white max-w-[120px] truncate">
                {profileInfo.name}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[120px] truncate">
                {profileInfo.roleLabel}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg z-50 p-2 space-y-1">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {profileInfo.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {profileInfo.roleLabel}
                </div>
                {authenticatedUserEmail && (
                  <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 truncate mt-0.5">
                    {authenticatedUserEmail}
                  </div>
                )}
              </div>

              {!roleSwitchLocked && (
                <div className="md:hidden px-2 py-1.5 space-y-1 border-b border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-medium text-slate-500 px-1">{tr('switchRole', lang)}</div>
                  <div className="grid grid-cols-3 gap-1">
                    {roleOptions.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          onRoleChange(r.id);
                          setProfileOpen(false);
                        }}
                        className={`px-1.5 py-1 text-[11px] rounded font-medium cursor-pointer ${
                          role === r.id
                            ? 'bg-blue-700 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(role === 'central_admin' || role === 'school_admin') && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab('teachers');
                    setProfileOpen(false);
                  }}
                  className="lg:hidden w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  {b('শিক্ষক অনুমোদন', 'Teacher Approval', lang)}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onOpenOnlineSchoolReg();
                  setProfileOpen(false);
                }}
                className="xl:hidden w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer"
              >
                <Building2 className="w-4 h-4" />
                {b('অনলাইন স্কুল রেজিস্ট্রেশন', 'Online School Registration', lang)}
              </button>

              <button
                type="button"
                onClick={() => {
                  onToggleLang();
                  setProfileOpen(false);
                }}
                className="sm:hidden w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Globe className="w-4 h-4" />
                {lang === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'}
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigateTab(role === 'guardian' ? 'profile' : role === 'central_admin' || role === 'school_admin' ? 'security' : 'dashboard');
                  setProfileOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <User className="w-4 h-4" />
                {tr('profile', lang)}
              </button>

              {onOpenUserProfileManager && (
                <button
                  type="button"
                  data-testid="header-user-profile-manager-btn"
                  onClick={() => {
                    onOpenUserProfileManager();
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {b('অ্যাকাউন্ট প্রোফাইল ও ইউনিক আইডি', 'Account Profile & Unique ID', lang)}
                </button>
              )}

              <button
                type="button"
                data-testid="header-settings-btn"
                onClick={() => {
                  onNavigateTab('settings');
                  setProfileOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Settings className="w-4 h-4 text-emerald-600" />
                {b('সেটিংস (Settings)', 'Settings', lang)}
              </button>

              {onOpenPhotoEditor && (
                <button
                  type="button"
                  data-testid="header-change-photo-btn"
                  onClick={() => {
                    onOpenPhotoEditor();
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  {b('প্রোফাইল ছবি পরিবর্তন ও ক্রপ', 'Change / Crop Profile Photo', lang)}
                </button>
              )}

              {isSchoolLoginLocked && onUnlockSchoolLogin && (
                <button
                  type="button"
                  onClick={() => {
                    onUnlockSchoolLogin();
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  {b('স্কুল লক আনলক করুন', 'Switch / Unlock School', lang)}
                </button>
              )}

              {onOpenAppDownloadAndShare && (
                <button
                  type="button"
                  data-testid="profile-apps-download-share-btn"
                  onClick={() => {
                    onOpenAppDownloadAndShare();
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <span>{b('App Tools (APK / Share / Web)', 'App Tools (APK / Share / Web)', lang)}</span>
                </button>
              )}

              {onOpenContactAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenContactAdmin();
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/30 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  {b('Admin-এর সাথে যোগাযোগ করুন', 'Contact Admin', lang)}
                </button>
              )}

              {!roleSwitchLocked && onOpenPortalHub && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenPortalHub();
                    setProfileOpen(false);
                  }}
                  className="xl:hidden w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  {b('পোর্টাল হোম / ল্যান্ডিং', 'Portal Landing Hub', lang)}
                </button>
              )}

              {!roleSwitchLocked && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenLoginModal();
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  {tr('loginPortal', lang)}
                </button>
              )}

              <button
                type="button"
                data-testid="header-logout-btn"
                onClick={() => {
                  if (onLogout) {
                    onLogout();
                  } else if (onOpenPortalHub) {
                    onOpenPortalHub();
                  } else {
                    onOpenLoginModal();
                  }
                  setProfileOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                {tr('logout', lang)}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
