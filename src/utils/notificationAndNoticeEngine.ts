import type {
  NoticeAudienceGroup,
  NoticeImageAttachment,
  NoticeItem,
  NoticeLifecycleStatus,
  NoticeTypeCategory,
  NotificationCategory,
  NotificationItem,
  NotificationPreferences,
  NotificationPriority,
  Role,
} from '../types';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  notice: true,
  academic: true,
  exam_result: true,
  routine: true,
  message: true,
  account: true,
  system: true,
  emergency: true,
};

export const NOTIFICATION_CATEGORY_META: Record<
  NotificationCategory,
  { labelBn: string; labelEn: string }
> = {
  notice: { labelBn: 'নোটিশ', labelEn: 'Notice' },
  academic: { labelBn: 'একাডেমিক', labelEn: 'Academic' },
  exam_result: { labelBn: 'পরীক্ষা ও ফলাফল', labelEn: 'Exam & Result' },
  routine: { labelBn: 'রুটিন', labelEn: 'Routine' },
  message: { labelBn: 'মেসেজ', labelEn: 'Message' },
  account: { labelBn: 'অ্যাকাউন্ট ও নিরাপত্তা', labelEn: 'Account & Security' },
  system: { labelBn: 'সিস্টেম', labelEn: 'System' },
  emergency: { labelBn: 'জরুরি', labelEn: 'Emergency' },
};

export interface NotificationScopeContext {
  role: Role;
  schoolId?: string;
  teacherId?: string;
  studentId?: string;
}

export function inferNotificationCategory(n: NotificationItem): NotificationCategory {
  if (n.category) return n.category;
  const text = `${n.titleBn} ${n.titleEn} ${n.messageBn} ${n.messageEn}`.toLowerCase();
  if (n.priority === 'emergency' || text.includes('জরুরি') || text.includes('emergency')) return 'emergency';
  if (text.includes('পরীক্ষা') || text.includes('ফলাফল') || text.includes('exam') || text.includes('result') || text.includes('marks')) {
    return 'exam_result';
  }
  if (text.includes('রুটিন') || text.includes('বিকল্প') || text.includes('routine') || text.includes('substitute') || text.includes('ক্লাস')) {
    return 'routine';
  }
  if (text.includes('নোটিশ') || text.includes('notice')) return 'notice';
  if (text.includes('বার্তা') || text.includes('message') || text.includes('reply')) return 'message';
  if (text.includes('পড়া') || text.includes('homework') || text.includes('assignment') || text.includes('syllabus') || text.includes('lesson')) {
    return 'academic';
  }
  if (text.includes('login') || text.includes('verify') || text.includes('security') || text.includes('যাচাই') || text.includes('প্রোফাইল')) {
    return 'account';
  }
  return 'system';
}

export function inferNotificationPriority(n: NotificationItem): NotificationPriority {
  if (n.priority) return n.priority;
  if (n.type === 'alert') return 'emergency';
  if (n.type === 'warning' || n.isPinned) return 'important';
  return 'normal';
}

export function getScopedNotificationsForRole(
  notifications: NotificationItem[],
  ctx: NotificationScopeContext
): NotificationItem[] {
  return notifications.filter((n) => {
    const roleMatch = n.roleTarget === ctx.role || n.roleTarget === 'all';
    if (!roleMatch) return false;
    if (ctx.role === 'school_admin' && n.schoolId && ctx.schoolId && n.schoolId !== ctx.schoolId) {
      return false;
    }
    if (ctx.role === 'teacher') {
      if (n.schoolId && ctx.schoolId && n.schoolId !== ctx.schoolId) return false;
      if (n.teacherId && ctx.teacherId && n.teacherId !== ctx.teacherId) return false;
    }
    if (ctx.role === 'student') {
      if (n.schoolId && ctx.schoolId && n.schoolId !== ctx.schoolId) return false;
      if (n.studentId && ctx.studentId && n.studentId !== ctx.studentId) return false;
    }
    if (ctx.role === 'guardian') {
      if (n.studentId && ctx.studentId && n.studentId !== ctx.studentId) return false;
    }
    return true;
  });
}

export interface NotificationFilterOptions {
  tab: 'all' | 'unread' | 'important' | 'emergency' | 'since_last_visit';
  category: NotificationCategory | 'all';
  priority: NotificationPriority | 'all';
  dateFilter?: string;
  searchQuery?: string;
  lastLoginIso?: string;
  preferences?: NotificationPreferences;
}

export function filterNotifications(
  notifications: NotificationItem[],
  ctx: NotificationScopeContext,
  opts: NotificationFilterOptions
): NotificationItem[] {
  const scoped = getScopedNotificationsForRole(notifications, ctx);
  const q = (opts.searchQuery ?? '').trim().toLowerCase();

  return scoped.filter((n) => {
    const cat = inferNotificationCategory(n);
    const prio = inferNotificationPriority(n);

    // Preferences filter (emergency alerts always bypass mute)
    if (opts.preferences && cat !== 'emergency' && prio !== 'emergency') {
      if (opts.preferences[cat] === false) return false;
    }

    if (opts.tab === 'unread' && n.read) return false;
    if (opts.tab === 'important' && !n.isPinned && prio === 'normal') return false;
    if (opts.tab === 'emergency' && prio !== 'emergency' && cat !== 'emergency') return false;
    if (opts.tab === 'since_last_visit') {
      if (!opts.lastLoginIso) return !n.read;
      const itemIso = n.createdAtIso ?? '';
      if (!itemIso || itemIso <= opts.lastLoginIso) return false;
    }

    if (opts.category !== 'all' && cat !== opts.category) return false;
    if (opts.priority !== 'all' && prio !== opts.priority) return false;
    if (opts.dateFilter && n.dateLabel && n.dateLabel !== opts.dateFilter) return false;

    if (q) {
      const hay = `${n.titleBn} ${n.titleEn} ${n.messageBn} ${n.messageEn} ${cat}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });
}

export interface SinceLastVisitSummary {
  totalNew: number;
  unreadCount: number;
  noticeCount: number;
  academicCount: number;
  examResultCount: number;
  routineCount: number;
  messageCount: number;
  accountCount: number;
  systemCount: number;
  emergencyCount: number;
  items: NotificationItem[];
}

export function computeSinceLastVisitSummary(
  notifications: NotificationItem[],
  ctx: NotificationScopeContext,
  lastLoginIso: string
): SinceLastVisitSummary {
  const scoped = getScopedNotificationsForRole(notifications, ctx);
  const sinceItems = scoped.filter((n) => {
    if (n.createdAtIso) return n.createdAtIso > lastLoginIso;
    return !n.read;
  });

  const summary: SinceLastVisitSummary = {
    totalNew: sinceItems.length,
    unreadCount: scoped.filter((n) => !n.read).length,
    noticeCount: 0,
    academicCount: 0,
    examResultCount: 0,
    routineCount: 0,
    messageCount: 0,
    accountCount: 0,
    systemCount: 0,
    emergencyCount: 0,
    items: sinceItems,
  };

  for (const item of sinceItems) {
    const cat = inferNotificationCategory(item);
    const prio = inferNotificationPriority(item);
    if (prio === 'emergency' || cat === 'emergency') summary.emergencyCount += 1;
    if (cat === 'notice') summary.noticeCount += 1;
    else if (cat === 'academic') summary.academicCount += 1;
    else if (cat === 'exam_result') summary.examResultCount += 1;
    else if (cat === 'routine') summary.routineCount += 1;
    else if (cat === 'message') summary.messageCount += 1;
    else if (cat === 'account') summary.accountCount += 1;
    else if (cat === 'system') summary.systemCount += 1;
  }

  return summary;
}

/* ============================================================================
 * NOTICE & COMMUNICATION ENGINE
 * ============================================================================ */

export const ALLOWED_NOTICE_IMAGE_MIMES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
] as const;

export const MAX_NOTICE_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateNoticeImageFile(
  file: { fileName: string; mimeType: string; sizeBytes: number },
  existingCount: number,
  maxImagesLimit = 5
): { ok: boolean; errorBn?: string; errorEn?: string } {
  if (existingCount >= maxImagesLimit) {
    return {
      ok: false,
      errorBn: `সর্বোচ্চ ${maxImagesLimit}টি ছবি যুক্ত করা যাবে (School Admin সীমা)।`,
      errorEn: `Maximum ${maxImagesLimit} image(s) allowed per notice.`,
    };
  }
  const mimeLower = file.mimeType.toLowerCase();
  if (!ALLOWED_NOTICE_IMAGE_MIMES.includes(mimeLower as (typeof ALLOWED_NOTICE_IMAGE_MIMES)[number])) {
    return {
      ok: false,
      errorBn: `অসমর্থিত ফাইল ফরম্যাট (${file.fileName})। শুধুমাত্র PNG, JPG, JPEG, WEBP বা GIF অনুমোদিত।`,
      errorEn: `Unsupported image type (${file.fileName}). Only PNG, JPG, JPEG, WEBP, GIF allowed.`,
    };
  }
  if (file.sizeBytes > MAX_NOTICE_IMAGE_BYTES) {
    return {
      ok: false,
      errorBn: `${file.fileName} ফাইলটি 5MB সীমার বেশি। অনুগ্রহ করে ছোট আকারের ছবি দিন।`,
      errorEn: `${file.fileName} exceeds the 5MB size limit.`,
    };
  }
  return { ok: true };
}

export function generateNoticeImageId(): string {
  return `IMG-NOTICE-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`;
}

export interface CreateNoticePayload {
  titleBn: string;
  titleEn: string;
  bodyBn: string;
  bodyEn: string;
  noticeType: NoticeTypeCategory;
  category: NoticeItem['category'];
  audienceGroup: NoticeAudienceGroup;
  targetClassNames?: string[];
  targetSections?: string[];
  targetUserIds?: string[];
  targetUserNames?: string[];
  images?: NoticeImageAttachment[];
  allowImageDownload?: boolean;
  status: NoticeLifecycleStatus;
  scheduledAt?: string;
  expiresAt?: string;
  validityLabel?: string;
  isEmergency?: boolean;
  schoolId?: string;
  author: string;
  authorRole: Role;
  authorId?: string;
  nowLabel?: string;
}

export function createNoticeRecord(payload: CreateNoticePayload): NoticeItem {
  const nowStr = payload.nowLabel ?? '১৯ নভে ২০২৬';
  const legacyAudience: NoticeItem['audience'] =
    payload.audienceGroup === 'teachers' || payload.audienceGroup === 'specific_teacher'
      ? 'teachers'
      : payload.audienceGroup === 'students' || payload.audienceGroup === 'specific_student'
        ? 'students'
        : payload.audienceGroup === 'guardians'
          ? 'guardians'
          : 'all';

  return {
    id: `not-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 90 + 10)}`,
    titleBn: payload.titleBn.trim(),
    titleEn: payload.titleEn.trim() || payload.titleBn.trim(),
    bodyBn: payload.bodyBn.trim(),
    bodyEn: payload.bodyEn.trim() || payload.bodyBn.trim(),
    category: payload.isEmergency ? 'general' : payload.category,
    audience: legacyAudience,
    date: nowStr,
    schoolId: payload.schoolId,
    author: payload.author,
    authorRole: payload.authorRole,
    authorId: payload.authorId,
    noticeType: payload.isEmergency ? 'emergency' : payload.noticeType,
    status: payload.status,
    audienceGroup: payload.audienceGroup,
    targetClassNames: payload.targetClassNames,
    targetSections: payload.targetSections,
    targetUserIds: payload.targetUserIds,
    targetUserNames: payload.targetUserNames,
    images: payload.images ?? [],
    allowImageDownload: payload.allowImageDownload ?? true,
    scheduledAt: payload.scheduledAt,
    expiresAt: payload.expiresAt,
    validityLabel: payload.validityLabel ?? '7 Days',
    isEmergency: Boolean(payload.isEmergency),
    readByUserIds: [],
    history: [
      {
        id: `nh-${Date.now().toString().slice(-5)}`,
        timestamp: nowStr,
        actorName: payload.author,
        action:
          payload.status === 'Scheduled'
            ? 'Scheduled'
            : payload.status === 'Draft'
              ? 'Created'
              : 'Published',
        summary:
          payload.status === 'Scheduled'
            ? `Scheduled for ${payload.scheduledAt ?? 'future release'}`
            : payload.status === 'Draft'
              ? 'Saved as draft'
              : `Published to ${payload.audienceGroup}${(payload.images?.length ?? 0) > 0 ? ` with ${payload.images?.length} image(s)` : ''}`,
      },
    ],
  };
}

export function editNoticeRecord(
  notice: NoticeItem,
  patch: {
    titleBn?: string;
    titleEn?: string;
    bodyBn?: string;
    bodyEn?: string;
    expiresAt?: string;
    validityLabel?: string;
    scheduledAt?: string;
    isEmergency?: boolean;
    images?: NoticeImageAttachment[];
    allowImageDownload?: boolean;
  },
  actorName: string,
  timestamp = '১৯ নভে ২০২৬'
): NoticeItem {
  const nextStatus: NoticeLifecycleStatus =
    notice.status === 'Published' || notice.status === 'Edited'
      ? 'Edited'
      : notice.status ?? 'Edited';
  return {
    ...notice,
    ...patch,
    status: nextStatus,
    history: [
      {
        id: `nh-${Date.now().toString().slice(-5)}`,
        timestamp,
        actorName,
        action: 'Edited',
        summary: `Updated content/schedule (${nextStatus})`,
      },
      ...(notice.history ?? []),
    ],
  };
}

export function updateNoticeImagesWithHistory(
  notice: NoticeItem,
  nextImages: NoticeImageAttachment[],
  actionType: 'Image Added' | 'Image Removed' | 'Image Replaced',
  actorName: string,
  summary: string,
  timestamp = '১৯ নভে ২০২৬'
): NoticeItem {
  return {
    ...notice,
    images: nextImages,
    status: notice.status === 'Published' ? 'Edited' : notice.status,
    history: [
      {
        id: `nh-${Date.now().toString().slice(-5)}`,
        timestamp,
        actorName,
        action: actionType,
        summary,
      },
      ...(notice.history ?? []),
    ],
  };
}

export function transitionNoticeStatus(
  notice: NoticeItem,
  nextStatus: NoticeLifecycleStatus,
  actorName: string,
  note?: string,
  timestamp = '১৯ নভে ২০২৬'
): NoticeItem {
  const actionMap: Record<NoticeLifecycleStatus, 'Created' | 'Scheduled' | 'Published' | 'Edited' | 'Expired' | 'Cancelled'> = {
    Draft: 'Created',
    Scheduled: 'Scheduled',
    Published: 'Published',
    Edited: 'Edited',
    Expired: 'Expired',
    Cancelled: 'Cancelled',
  };
  return {
    ...notice,
    status: nextStatus,
    history: [
      {
        id: `nh-${Date.now().toString().slice(-5)}`,
        timestamp,
        actorName,
        action: actionMap[nextStatus],
        summary: note || `Status changed to ${nextStatus}`,
      },
      ...(notice.history ?? []),
    ],
  };
}

export function markNoticeReadByUser(notice: NoticeItem, userId: string): NoticeItem {
  const current = notice.readByUserIds ?? [];
  if (current.includes(userId)) return notice;
  return { ...notice, readByUserIds: [...current, userId] };
}

export function isNoticeReadByUser(notice: NoticeItem, userId: string): boolean {
  return (notice.readByUserIds ?? []).includes(userId);
}

export interface NoticeRecipientContext {
  role: Role;
  userId: string;
  schoolId?: string;
  className?: string;
  section?: string;
  includeManagementStatuses?: boolean;
}

export function filterNoticesForRecipient(
  notices: NoticeItem[],
  ctx: NoticeRecipientContext
): NoticeItem[] {
  return notices.filter((n) => {
    const status = n.status ?? 'Published';

    // Central Admin sees all notices across schools and statuses
    if (ctx.role === 'central_admin') return true;

    // School scope: central notices (no schoolId) or matching schoolId
    if (n.schoolId && ctx.schoolId && n.schoolId !== ctx.schoolId) {
      return false;
    }

    // Management view for school_admin or teacher who authored the notice can see Draft/Scheduled/Cancelled/Expired
    const isAuthor = n.authorId && n.authorId === ctx.userId;
    if (ctx.includeManagementStatuses && (ctx.role === 'school_admin' || isAuthor)) {
      return true;
    }

    // Recipients only see Published or Edited notices
    if (status !== 'Published' && status !== 'Edited') {
      return false;
    }

    if (ctx.role === 'school_admin') return true;

    const group =
      n.audienceGroup ??
      (n.audience === 'teachers'
        ? 'teachers'
        : n.audience === 'students'
          ? 'students'
          : n.audience === 'guardians'
            ? 'guardians'
            : 'all');

    if (group === 'all' || group === 'selected_groups') return true;
    if (group === 'teachers' || group === 'school_staff') return ctx.role === 'teacher';
    if (group === 'students') return ctx.role === 'student' || ctx.role === 'guardian';
    if (group === 'guardians') return ctx.role === 'guardian';
    if (group === 'class_group') {
      if (ctx.role === 'teacher') return true;
      return Boolean(ctx.className && (n.targetClassNames ?? []).includes(ctx.className));
    }
    if (group === 'specific_section') {
      if (ctx.role === 'teacher') return true;
      const clsMatch = !n.targetClassNames?.length || (ctx.className && n.targetClassNames.includes(ctx.className));
      const secMatch = !n.targetSections?.length || (ctx.section && n.targetSections.includes(ctx.section));
      return Boolean(clsMatch && secMatch);
    }
    if (group === 'specific_users' || group === 'specific_teacher' || group === 'specific_student') {
      return (n.targetUserIds ?? []).includes(ctx.userId);
    }

    return true;
  });
}
