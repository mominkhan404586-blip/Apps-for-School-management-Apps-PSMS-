import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  Clock,
  Filter,
  Pin,
  PinOff,
  RefreshCw,
  Search,
  Settings2,
} from 'lucide-react';
import type {
  Language,
  NotificationCategory,
  NotificationItem,
  NotificationPreferences,
  NotificationPriority,
  Role,
} from '../types';
import { b } from '../i18n/translations';
import {
  NOTIFICATION_CATEGORY_META,
  computeSinceLastVisitSummary,
  filterNotifications,
  getScopedNotificationsForRole,
  inferNotificationCategory,
  inferNotificationPriority,
} from '../utils/notificationAndNoticeEngine';

interface NotificationCenterPanelProps {
  lang: Language;
  role: Role;
  schoolId?: string;
  teacherId?: string;
  studentId?: string;
  notifications: NotificationItem[];
  preferences: NotificationPreferences;
  lastLoginIso: string;
  onUpdatePreferences: (next: NotificationPreferences) => void;
  onMarkRead: (id: string, read: boolean) => void;
  onMarkAllRead: () => void;
  onTogglePin: (id: string) => void;
  onNavigateFromNotification: (item: NotificationItem) => void;
  onResetLastVisitIso: (iso: string) => void;
}

export const NotificationCenterPanel: React.FC<NotificationCenterPanelProps> = ({
  lang,
  role,
  schoolId,
  teacherId,
  studentId,
  notifications,
  preferences,
  lastLoginIso,
  onUpdatePreferences,
  onMarkRead,
  onMarkAllRead,
  onTogglePin,
  onNavigateFromNotification,
  onResetLastVisitIso,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'all' | 'unread' | 'important' | 'emergency' | 'since_last_visit'
  >('all');
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<NotificationPriority | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const scopeCtx = useMemo(
    () => ({ role, schoolId, teacherId, studentId }),
    [role, schoolId, teacherId, studentId]
  );

  const scopedAll = useMemo(
    () => getScopedNotificationsForRole(notifications, scopeCtx),
    [notifications, scopeCtx]
  );

  const sinceSummary = useMemo(
    () => computeSinceLastVisitSummary(notifications, scopeCtx, lastLoginIso),
    [notifications, scopeCtx, lastLoginIso]
  );

  const visibleNotifications = useMemo(
    () =>
      filterNotifications(notifications, scopeCtx, {
        tab: activeSubTab,
        category: categoryFilter,
        priority: priorityFilter,
        dateFilter: dateFilter || undefined,
        searchQuery,
        lastLoginIso,
        preferences,
      }),
    [
      notifications,
      scopeCtx,
      activeSubTab,
      categoryFilter,
      priorityFilter,
      dateFilter,
      searchQuery,
      lastLoginIso,
      preferences,
    ]
  );

  const uniqueDates = useMemo(() => {
    const set = new Set<string>();
    for (const n of scopedAll) {
      if (n.dateLabel) set.add(n.dateLabel);
    }
    return Array.from(set).sort().reverse();
  }, [scopedAll]);

  const emergencyItems = useMemo(
    () =>
      scopedAll.filter(
        (n) => !n.read && (inferNotificationPriority(n) === 'emergency' || inferNotificationCategory(n) === 'emergency')
      ),
    [scopedAll]
  );

  return (
    <div className="space-y-5 text-xs">
      {/* Header + Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            {b('নোটিফিকেশন ও অ্যাক্টিভিটি সেন্টার', 'Notification & Activity Center', lang)}
          </h1>
          <p className="text-slate-500 mt-0.5">
            {b(
              'নোটিশ, একাডেমিক আপডেট, পরীক্ষা ও ফলাফল, রুটিন, বার্তা ও জরুরি সতর্কবার্তা এক জায়গায় দেখুন।',
              'Centralized notices, academic updates, exams & results, routines, messages, and emergency alerts.',
              lang
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onResetLastVisitIso('2026-11-19T09:00:00')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
            title={b('শেষ ভিজিট টাইমস্ট্যাম্প রিসেট', 'Simulate previous login window', lang)}
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            {b('শেষ ভিজিট: আজ ০৯:০০ AM', 'Since 09:00 AM', lang)}
          </button>
          <button
            type="button"
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
            {b('সব পঠিত চিহ্নিত করুন', 'Mark All Read', lang)}
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold cursor-pointer ${
              settingsOpen
                ? 'bg-blue-700 text-white'
                : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            {b('সেটিংস', 'Settings', lang)}
          </button>
        </div>
      </div>

      {/* Notification Preferences Panel (Collapsible) */}
      {settingsOpen && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {b('নোটিফিকেশন পছন্দ ও মিউট সেটিংস', 'Notification Preferences', lang)}
            </h2>
            <span className="text-[11px] text-slate-500">
              {b('জরুরি সতর্কবার্তা (Emergency) কখনো মিউট হবে না', 'Emergency alerts always bypass mute', lang)}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(Object.keys(NOTIFICATION_CATEGORY_META) as NotificationCategory[]).map((cat) => {
              const locked = cat === 'emergency';
              const enabled = locked ? true : preferences[cat];
              return (
                <label
                  key={cat}
                  className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 ${
                    locked ? 'opacity-80 cursor-not-allowed bg-red-50/40 dark:bg-red-950/20' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {b(NOTIFICATION_CATEGORY_META[cat].labelBn, NOTIFICATION_CATEGORY_META[cat].labelEn, lang)}
                  </span>
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={locked}
                    onChange={(e) =>
                      onUpdatePreferences({
                        ...preferences,
                        [cat]: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-blue-700"
                  />
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Emergency Priority Callout */}
      {emergencyItems.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-red-900 dark:text-red-200">
                {b(emergencyItems[0].titleBn, emergencyItems[0].titleEn, lang)}
              </div>
              <p className="text-red-800 dark:text-red-300 mt-0.5">
                {b(emergencyItems[0].messageBn, emergencyItems[0].messageEn, lang)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateFromNotification(emergencyItems[0])}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold shrink-0 cursor-pointer"
          >
            {b('বিস্তারিত দেখুন', 'Open Alert', lang)}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Since Last Visit + Activity Summary Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            {b('শেষ ভিজিটের পরের সারসংক্ষেপ (Since Last Visit)', 'Activity Summary Since Last Visit', lang)}
          </h2>
          <span className="font-mono text-slate-500">
            {b('বেসলাইন:', 'Since:', lang)} {lastLoginIso.replace('T', ' ')}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
            <div className="text-slate-500">{b('নতুন আপডেট', 'New Updates', lang)}</div>
            <div className="text-lg font-bold tabular-nums text-blue-700 dark:text-blue-400 mt-0.5">
              {sinceSummary.totalNew}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
            <div className="text-slate-500">{b('অপঠিত', 'Unread', lang)}</div>
            <div className="text-lg font-bold tabular-nums text-amber-600 mt-0.5">
              {sinceSummary.unreadCount}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
            <div className="text-slate-500">{b('নোটিশ', 'Notices', lang)}</div>
            <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">
              {sinceSummary.noticeCount}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
            <div className="text-slate-500">{b('পরীক্ষা ও ফলাফল', 'Exams & Results', lang)}</div>
            <div className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5">
              {sinceSummary.examResultCount}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
            <div className="text-slate-500">{b('একাডেমিক ও রুটিন', 'Academic/Routine', lang)}</div>
            <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">
              {sinceSummary.academicCount + sinceSummary.routineCount}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
            <div className="text-slate-500">{b('জরুরি সতর্কতা', 'Emergency', lang)}</div>
            <div className="text-lg font-bold tabular-nums text-red-600 dark:text-red-400 mt-0.5">
              {sinceSummary.emergencyCount}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + Search & Multi-Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-3">
          {(
            [
              { id: 'all', labelBn: 'সকল নোটিফিকেশন', labelEn: 'All', count: scopedAll.length },
              { id: 'unread', labelBn: 'অপঠিত', labelEn: 'Unread', count: sinceSummary.unreadCount },
              {
                id: 'since_last_visit',
                labelBn: 'শেষ ভিজিটের পর',
                labelEn: 'Since Last Visit',
                count: sinceSummary.totalNew,
              },
              {
                id: 'important',
                labelBn: 'গুরুত্বপূর্ণ / পিন করা',
                labelEn: 'Important / Pinned',
                count: scopedAll.filter((n) => n.isPinned || inferNotificationPriority(n) !== 'normal').length,
              },
              {
                id: 'emergency',
                labelBn: 'জরুরি',
                labelEn: 'Emergency',
                count: scopedAll.filter((n) => inferNotificationPriority(n) === 'emergency' || inferNotificationCategory(n) === 'emergency').length,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer inline-flex items-center gap-1.5 ${
                activeSubTab === tab.id
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{b(tab.labelBn, tab.labelEn, lang)}</span>
              <span className="tabular-nums opacity-80">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={b('নোটিফিকেশন খুঁজুন...', 'Search notifications...', lang)}
              className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              aria-label={b('ক্যাটাগরি ফিল্টার', 'Filter by category', lang)}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as NotificationCategory | 'all')}
              className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none cursor-pointer"
            >
              <option value="all">{b('সকল ক্যাটাগরি', 'All Categories', lang)}</option>
              {(Object.keys(NOTIFICATION_CATEGORY_META) as NotificationCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {b(NOTIFICATION_CATEGORY_META[cat].labelBn, NOTIFICATION_CATEGORY_META[cat].labelEn, lang)}
                </option>
              ))}
            </select>
          </div>

          <select
            aria-label={b('গুরুত্ব ফিল্টার', 'Filter by priority', lang)}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as NotificationPriority | 'all')}
            className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none cursor-pointer"
          >
            <option value="all">{b('সকল গুরুত্ব (Priority)', 'All Priorities', lang)}</option>
            <option value="emergency">{b('জরুরি (Emergency)', 'Emergency', lang)}</option>
            <option value="important">{b('গুরুত্বপূর্ণ (Important)', 'Important', lang)}</option>
            <option value="normal">{b('সাধারণ (Normal)', 'Normal', lang)}</option>
          </select>

          <select
            aria-label={b('তারিখ ফিল্টার', 'Filter by date', lang)}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none cursor-pointer"
          >
            <option value="">{b('সকল তারিখ (History)', 'All Dates', lang)}</option>
            {uniqueDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Notification Feed */}
        {visibleNotifications.length === 0 ? (
          <div className="py-10 text-center text-slate-500">
            {b('নির্বাচিত ফিল্টারে কোনো নোটিফিকেশন পাওয়া যায়নি।', 'No notifications match your filters.', lang)}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {visibleNotifications.map((item) => {
              const cat = inferNotificationCategory(item);
              const prio = inferNotificationPriority(item);
              const catMeta = NOTIFICATION_CATEGORY_META[cat];
              return (
                <div
                  key={item.id}
                  className={`py-3.5 px-2 rounded-lg transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    !item.read ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span
                        className={`font-semibold ${
                          prio === 'emergency'
                            ? 'text-red-600 dark:text-red-400'
                            : prio === 'important'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-blue-700 dark:text-blue-400'
                        }`}
                      >
                        {b(catMeta.labelBn, catMeta.labelEn, lang)}
                      </span>
                      <span>·</span>
                      <span className="font-mono">{item.time}</span>
                      {item.dateLabel && (
                        <>
                          <span>·</span>
                          <span className="font-mono">{item.dateLabel}</span>
                        </>
                      )}
                      {item.isPinned && (
                        <>
                          <span>·</span>
                          <span className="font-semibold text-amber-700 dark:text-amber-400">
                            {b('Pinned', 'Pinned', lang)}
                          </span>
                        </>
                      )}
                      {!item.read && (
                        <>
                          <span>·</span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            {b('নতুন (Unread)', 'Unread', lang)}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {b(item.titleBn, item.titleEn, lang)}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">
                      {b(item.messageBn, item.messageEn, lang)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onTogglePin(item.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                    >
                      {item.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      {item.isPinned ? b('Unpin', 'Unpin', lang) : b('Pin', 'Pin', lang)}
                    </button>
                    <button
                      type="button"
                      onClick={() => onMarkRead(item.id, !item.read)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {item.read ? b('Unread করুন', 'Mark Unread', lang) : b('পঠিত (Read)', 'Mark Read', lang)}
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateFromNotification(item)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
                    >
                      {b('প্রাসঙ্গিক অংশে যান', 'Open', lang)}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

interface DashboardNotificationPreviewProps {
  lang: Language;
  role: Role;
  schoolId?: string;
  teacherId?: string;
  studentId?: string;
  notifications: NotificationItem[];
  preferences?: NotificationPreferences;
  lastLoginIso: string;
  onOpenNotificationCenter: () => void;
  onNavigateFromNotification: (item: NotificationItem) => void;
}

export const DashboardNotificationPreview: React.FC<DashboardNotificationPreviewProps> = ({
  lang,
  role,
  schoolId,
  teacherId,
  studentId,
  notifications,
  preferences,
  lastLoginIso,
  onOpenNotificationCenter,
  onNavigateFromNotification,
}) => {
  const ctx = useMemo(
    () => ({ role, schoolId, teacherId, studentId }),
    [role, schoolId, teacherId, studentId]
  );

  const summary = useMemo(
    () => computeSinceLastVisitSummary(notifications, ctx, lastLoginIso),
    [notifications, ctx, lastLoginIso]
  );

  const topItems = useMemo(() => {
    const filtered = preferences
      ? filterNotifications(notifications, ctx, {
          tab: 'all',
          category: 'all',
          priority: 'all',
          preferences,
        })
      : getScopedNotificationsForRole(notifications, ctx);
    return filtered.slice(0, 3);
  }, [notifications, ctx, preferences]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {b('ড্যাশবোর্ড নোটিফিকেশন প্রিভিউ', 'Notification Preview', lang)}
          </h2>
          <span className="text-slate-500 font-mono tabular-nums">
            · {summary.unreadCount} {b('অপঠিত', 'Unread', lang)} · {summary.totalNew} {b('নতুন', 'Since Last Visit', lang)}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenNotificationCenter}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-blue-700 dark:text-blue-400 cursor-pointer"
        >
          {b('Notification Center', 'Notification Center', lang)}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {topItems.length === 0 ? (
        <p className="text-slate-500">{b('নতুন কোনো নোটিফিকেশন নেই।', 'No notifications available.', lang)}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {topItems.map((item) => {
            const cat = inferNotificationCategory(item);
            const prio = inferNotificationPriority(item);
            const meta = NOTIFICATION_CATEGORY_META[cat];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigateFromNotification(item)}
                className={`text-left p-3 rounded-lg border transition-colors cursor-pointer space-y-1 ${
                  prio === 'emergency'
                    ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500">
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                    {b(meta.labelBn, meta.labelEn, lang)}
                  </span>
                  <span className="font-mono">{item.time}</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                  {b(item.titleBn, item.titleEn, lang)}
                </div>
                <div className="text-slate-600 dark:text-slate-300 line-clamp-2">
                  {b(item.messageBn, item.messageEn, lang)}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
