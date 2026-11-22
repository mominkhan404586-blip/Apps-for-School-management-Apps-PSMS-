import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  History,
  Image as ImageIcon,
  Megaphone,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type {
  Language,
  NoticeAudienceGroup,
  NoticeImageAttachment,
  NoticeItem,
  NoticeLifecycleStatus,
  NoticeTypeCategory,
  Role,
  StudentRecord,
  TeacherRecord,
} from '../types';
import { b } from '../i18n/translations';
import { ALL_CLASSES } from '../data/mockData';
import {
  filterNoticesForRecipient,
  generateNoticeImageId,
  isNoticeReadByUser,
  validateNoticeImageFile,
  type CreateNoticePayload,
} from '../utils/notificationAndNoticeEngine';
import { sanitizeActorDisplayForRole } from '../utils/adminAndTeacherIdentityEngine';

interface NoticeCommunicationCenterProps {
  lang: Language;
  role: Role;
  userId: string;
  actorName: string;
  schoolId?: string;
  studentClass?: string;
  notices: NoticeItem[];
  teachers?: TeacherRecord[];
  students?: StudentRecord[];
  canCreateOverride?: boolean;
  maxNoticeImages?: number;
  onUpdateMaxNoticeImages?: (n: number) => void;
  onUpdateNoticeImages?: (
    noticeId: string,
    nextImages: NoticeImageAttachment[],
    actionType: 'Image Added' | 'Image Removed' | 'Image Replaced',
    summary: string
  ) => void;
  onCreateNotice: (payload: CreateNoticePayload) => void;
  onEditNotice: (
    noticeId: string,
    patch: {
      titleBn: string;
      titleEn: string;
      bodyBn: string;
      bodyEn: string;
      validityLabel?: string;
      isEmergency?: boolean;
      allowImageDownload?: boolean;
    }
  ) => void;
  onTransitionNoticeStatus: (noticeId: string, nextStatus: NoticeLifecycleStatus) => void;
  onMarkNoticeRead: (noticeId: string, userId: string) => void;
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

const readImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth || 800, height: img.naturalHeight || 600 });
    img.onerror = () => resolve({ width: 800, height: 600 });
    img.src = dataUrl;
  });

export const NoticeCommunicationCenter: React.FC<NoticeCommunicationCenterProps> = ({
  lang,
  role,
  userId,
  actorName,
  schoolId,
  studentClass,
  notices,
  teachers = [],
  students = [],
  canCreateOverride,
  maxNoticeImages = 5,
  onUpdateMaxNoticeImages,
  onUpdateNoticeImages,
  onCreateNotice,
  onEditNotice,
  onTransitionNoticeStatus,
  onMarkNoticeRead,
}) => {
  const canCompose =
    role === 'central_admin' ||
    role === 'school_admin' ||
    (role === 'teacher' && (canCreateOverride ?? true));

  const [typeFilter, setTypeFilter] = useState<
    'all' | NoticeTypeCategory | 'scheduled' | 'published' | 'history'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [previewConfirmOpen, setPreviewConfirmOpen] = useState(false);

  // Composer form state
  const [titleBn, setTitleBn] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [bodyBn, setBodyBn] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [noticeType, setNoticeType] = useState<NoticeTypeCategory>(
    role === 'central_admin' ? 'central' : role === 'teacher' ? 'teacher' : 'school'
  );
  const [audienceGroup, setAudienceGroup] = useState<NoticeAudienceGroup>('all');
  const [selectedClasses, setSelectedClasses] = useState<string[]>(['Class 4']);
  const [sectionsDraft, setSectionsDraft] = useState('ক (A), খ (B)');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [validityLabel, setValidityLabel] = useState('7 Days');
  const [expiresAt, setExpiresAt] = useState('2026-11-26');
  const [publishMode, setPublishMode] = useState<'Published' | 'Scheduled' | 'Draft'>('Published');
  const [scheduledAt, setScheduledAt] = useState('2026-11-21T09:00');
  const [isEmergency, setIsEmergency] = useState(false);

  // Image attachment state (composer)
  const [draftImages, setDraftImages] = useState<NoticeImageAttachment[]>([]);
  const [allowImageDownload, setAllowImageDownload] = useState(true);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [replaceTargetIndex, setReplaceTargetIndex] = useState<number | null>(null);

  // Edit & History Modal State
  const [editingNotice, setEditingNotice] = useState<NoticeItem | null>(null);
  const [editTitleBn, setEditTitleBn] = useState('');
  const [editBodyBn, setEditBodyBn] = useState('');
  const [editAllowDownload, setEditAllowDownload] = useState(true);
  const [editImageError, setEditImageError] = useState<string | null>(null);
  const editAddImageRef = useRef<HTMLInputElement | null>(null);
  const editReplaceImageRef = useRef<HTMLInputElement | null>(null);
  const [editReplaceIndex, setEditReplaceIndex] = useState<number | null>(null);
  const [historyNoticeId, setHistoryNoticeId] = useState<string | null>(null);

  // Full-Screen Zoomable Image Lightbox State
  const [lightboxState, setLightboxState] = useState<{
    notice: NoticeItem;
    images: NoticeImageAttachment[];
    index: number;
  } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const selectableRecipients = useMemo(() => {
    const tList = teachers
      .filter((t) => !schoolId || t.schoolId === schoolId)
      .filter((t) => audienceGroup !== 'specific_student')
      .map((t) => ({ id: t.id, label: `${t.nameBn} (Teacher · ${t.schoolId})` }));
    const sList = students
      .filter((s) => !schoolId || s.schoolId === schoolId)
      .filter((s) => audienceGroup !== 'specific_teacher')
      .map((s) => ({ id: s.id, label: `${s.nameBn} (${s.className} · Roll ${s.roll})` }));
    return [...tList, ...sList];
  }, [teachers, students, schoolId, audienceGroup]);

  const scopedNotices = useMemo(
    () =>
      filterNoticesForRecipient(notices, {
        role,
        userId,
        schoolId,
        className: studentClass,
        includeManagementStatuses: canCompose,
      }),
    [notices, role, userId, schoolId, studentClass, canCompose]
  );

  const visibleNotices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedNotices.filter((n) => {
      const st = n.status ?? 'Published';
      const nType = n.noticeType ?? (n.category === 'central' ? 'central' : 'school');

      if (typeFilter === 'scheduled' && st !== 'Scheduled') return false;
      if (typeFilter === 'published' && st !== 'Published' && st !== 'Edited') return false;
      if (typeFilter === 'emergency' && !n.isEmergency && nType !== 'emergency') return false;
      if (
        (typeFilter === 'central' || typeFilter === 'school' || typeFilter === 'teacher' || typeFilter === 'student') &&
        nType !== typeFilter
      ) {
        return false;
      }

      if (q) {
        const displayAuthor = sanitizeActorDisplayForRole(n.author, role);
        const hay = `${n.titleBn} ${n.titleEn} ${n.bodyBn} ${n.bodyEn} ${displayAuthor}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [scopedNotices, typeFilter, searchQuery, role]);

  const unreadCount = useMemo(
    () => scopedNotices.filter((n) => !isNoticeReadByUser(n, userId)).length,
    [scopedNotices, userId]
  );

  const handleDraftImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setImageError(null);
    let currentCount = draftImages.length;
    const added: NoticeImageAttachment[] = [];

    for (const file of Array.from(files)) {
      const check = validateNoticeImageFile(
        { fileName: file.name, mimeType: file.type, sizeBytes: file.size },
        currentCount,
        maxNoticeImages
      );
      if (!check.ok) {
        setImageError(b(check.errorBn ?? 'Invalid file', check.errorEn ?? 'Invalid file', lang));
        break;
      }
      const dataUrl = await readFileAsDataUrl(file);
      const dims = await readImageDimensions(dataUrl);
      added.push({
        id: generateNoticeImageId(),
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        width: dims.width,
        height: dims.height,
        dataUrl,
        uploadedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        uploadedBy: actorName,
      });
      currentCount += 1;
    }

    if (added.length > 0) {
      setDraftImages((prev) => [...prev, ...added]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReplaceDraftImage = async (files: FileList | null) => {
    if (!files || files.length === 0 || replaceTargetIndex === null) return;
    const file = files[0];
    setImageError(null);
    const check = validateNoticeImageFile(
      { fileName: file.name, mimeType: file.type, sizeBytes: file.size },
      Math.max(0, draftImages.length - 1),
      maxNoticeImages
    );
    if (!check.ok) {
      setImageError(b(check.errorBn ?? 'Invalid file', check.errorEn ?? 'Invalid file', lang));
      setReplaceTargetIndex(null);
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    const dims = await readImageDimensions(dataUrl);
    const replacement: NoticeImageAttachment = {
      id: generateNoticeImageId(),
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      width: dims.width,
      height: dims.height,
      dataUrl,
      uploadedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      uploadedBy: actorName,
    };
    setDraftImages((prev) => prev.map((img, idx) => (idx === replaceTargetIndex ? replacement : img)));
    setReplaceTargetIndex(null);
    if (replaceInputRef.current) replaceInputRef.current.value = '';
  };

  const handleEditNoticeImageAdd = async (files: FileList | null) => {
    if (!files || files.length === 0 || !editingNotice || !onUpdateNoticeImages) return;
    setEditImageError(null);
    const currentImages = editingNotice.images ?? [];
    const file = files[0];
    const check = validateNoticeImageFile(
      { fileName: file.name, mimeType: file.type, sizeBytes: file.size },
      currentImages.length,
      maxNoticeImages
    );
    if (!check.ok) {
      setEditImageError(b(check.errorBn ?? 'Invalid file', check.errorEn ?? 'Invalid file', lang));
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    const dims = await readImageDimensions(dataUrl);
    const nextImg: NoticeImageAttachment = {
      id: generateNoticeImageId(),
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      width: dims.width,
      height: dims.height,
      dataUrl,
      uploadedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      uploadedBy: actorName,
    };
    const nextList = [...currentImages, nextImg];
    onUpdateNoticeImages(editingNotice.id, nextList, 'Image Added', `Attached ${file.name}`);
    setEditingNotice({ ...editingNotice, images: nextList });
    if (editAddImageRef.current) editAddImageRef.current.value = '';
  };

  const handleEditNoticeImageReplace = async (files: FileList | null) => {
    if (!files || files.length === 0 || !editingNotice || !onUpdateNoticeImages || editReplaceIndex === null) return;
    setEditImageError(null);
    const currentImages = editingNotice.images ?? [];
    const file = files[0];
    const check = validateNoticeImageFile(
      { fileName: file.name, mimeType: file.type, sizeBytes: file.size },
      Math.max(0, currentImages.length - 1),
      maxNoticeImages
    );
    if (!check.ok) {
      setEditImageError(b(check.errorBn ?? 'Invalid file', check.errorEn ?? 'Invalid file', lang));
      setEditReplaceIndex(null);
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    const dims = await readImageDimensions(dataUrl);
    const nextImg: NoticeImageAttachment = {
      id: generateNoticeImageId(),
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      width: dims.width,
      height: dims.height,
      dataUrl,
      uploadedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      uploadedBy: actorName,
    };
    const nextList = currentImages.map((img, i) => (i === editReplaceIndex ? nextImg : img));
    onUpdateNoticeImages(editingNotice.id, nextList, 'Image Replaced', `Replaced image #${editReplaceIndex + 1} with ${file.name}`);
    setEditingNotice({ ...editingNotice, images: nextList });
    setEditReplaceIndex(null);
    if (editReplaceImageRef.current) editReplaceImageRef.current.value = '';
  };

  const buildPendingPayload = (): CreateNoticePayload => {
    const selectedNames = selectableRecipients
      .filter((r) => selectedUserIds.includes(r.id))
      .map((r) => r.label);
    const parsedSections = sectionsDraft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const needsClasses =
      audienceGroup === 'class_group' ||
      audienceGroup === 'specific_section' ||
      audienceGroup === 'selected_groups';
    const needsUsers =
      audienceGroup === 'specific_users' ||
      audienceGroup === 'specific_teacher' ||
      audienceGroup === 'specific_student' ||
      audienceGroup === 'selected_groups';

    return {
      titleBn: titleBn.trim(),
      titleEn: titleEn.trim() || titleBn.trim(),
      bodyBn: bodyBn.trim(),
      bodyEn: bodyEn.trim() || bodyBn.trim(),
      noticeType: isEmergency ? 'emergency' : noticeType,
      category: isEmergency ? 'general' : noticeType === 'central' ? 'central' : 'event',
      audienceGroup,
      targetClassNames: needsClasses ? selectedClasses : undefined,
      targetSections: audienceGroup === 'specific_section' ? parsedSections : undefined,
      targetUserIds: needsUsers ? selectedUserIds : undefined,
      targetUserNames: needsUsers ? selectedNames : undefined,
      images: draftImages,
      allowImageDownload,
      status: publishMode,
      scheduledAt: publishMode === 'Scheduled' ? scheduledAt : undefined,
      expiresAt,
      validityLabel,
      isEmergency,
      schoolId: role === 'central_admin' && noticeType === 'central' ? undefined : schoolId,
      author: actorName,
      authorRole: role,
      authorId: userId,
    };
  };

  const handleConfirmSend = () => {
    const payload = buildPendingPayload();
    if (!payload.titleBn || !payload.bodyBn) return;
    onCreateNotice(payload);
    setPreviewConfirmOpen(false);
    setComposerOpen(false);
    setTitleBn('');
    setTitleEn('');
    setBodyBn('');
    setBodyEn('');
    setDraftImages([]);
    setImageError(null);
    setAllowImageDownload(true);
    setIsEmergency(false);
  };

  const openLightbox = (notice: NoticeItem, images: NoticeImageAttachment[], index: number) => {
    setZoomLevel(1);
    setLightboxState({ notice, images, index });
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            {b('নোটিশ ও কমিউনিকেশন কেন্দ্র', 'Notice & Communication Center', lang)}
          </h1>
          <p className="text-slate-500 mt-0.5">
            {b(
              `মোট দৃশ্যমান নোটিশ: ${scopedNotices.length} · অপঠিত: ${unreadCount}`,
              `Visible Notices: ${scopedNotices.length} · Unread: ${unreadCount}`,
              lang
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(role === 'central_admin' || role === 'school_admin') && onUpdateMaxNoticeImages && (
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold">
              <span>{b('ছবি সীমা:', 'Max Images/Notice:', lang)}</span>
              <select
                value={maxNoticeImages}
                onChange={(e) => onUpdateMaxNoticeImages(Number(e.target.value))}
                className="bg-transparent font-bold text-blue-700 dark:text-blue-400 outline-none cursor-pointer"
              >
                {[1, 2, 3, 5, 8, 10].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </label>
          )}

          {role === 'teacher' && canCreateOverride === false && (
            <span className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-semibold">
              {b('নোটিশ প্রকাশের অনুমতি স্কুল এডমিন কর্তৃক সীমিত', 'Notice creation disabled by School Admin', lang)}
            </span>
          )}

          {canCompose && (
            <button
              type="button"
              onClick={() => setComposerOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {composerOpen
                ? b('ফর্ম বন্ধ করুন', 'Close Composer', lang)
                : b('নতুন নোটিশ তৈরি করুন', 'Create Notice', lang)}
            </button>
          )}
        </div>
      </div>

      {/* Notice Composer (Central Admin, School Admin, Authorized Teacher) */}
      {canCompose && composerOpen && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {b('নোটিশ রচনা ও টার্গেট অডিয়েন্স নির্ধারণ', 'Compose Notice & Target Audience', lang)}
            </h2>
            <label className="inline-flex items-center gap-1.5 font-bold text-red-600 dark:text-red-400 cursor-pointer">
              <input
                type="checkbox"
                checked={isEmergency}
                onChange={(e) => setIsEmergency(e.target.checked)}
                className="accent-red-600"
              />
              {b('জরুরি নোটিশ হিসেবে চিহ্নিত করুন (Emergency)', 'Mark as Emergency Notice', lang)}
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">{b('নোটিশের বিষয় (বাংলা) *', 'Subject (BN) *', lang)}</label>
              <input
                type="text"
                value={titleBn}
                onChange={(e) => setTitleBn(e.target.value)}
                placeholder={b('যেমন: বিশেষ অভিভাবক সভা ও রুটিন আপডেট', 'e.g. Special PTM & Routine Update', lang)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('Subject (English)', 'Subject (English)', lang)}</label>
              <input
                type="text"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="Notice Subject in English"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">{b('বিস্তারিত বার্তা *', 'Notice Details *', lang)}</label>
            <textarea
              rows={3}
              value={bodyBn}
              onChange={(e) => setBodyBn(e.target.value)}
              placeholder={b('নোটিশের সম্পূর্ণ বিবরণ লিখুন...', 'Write full notice details...', lang)}
              className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold mb-1">{b('নোটিশের ধরন', 'Notice Category', lang)}</label>
              <select
                value={noticeType}
                onChange={(e) => setNoticeType(e.target.value as NoticeTypeCategory)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer"
              >
                {role === 'central_admin' && <option value="central">Central Notice</option>}
                <option value="school">School Notice</option>
                <option value="teacher">Teacher Notice</option>
                <option value="student">Student Notice</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">{b('প্রাপক (Target Audience)', 'Target Audience', lang)}</label>
              <select
                value={audienceGroup}
                onChange={(e) => setAudienceGroup(e.target.value as NoticeAudienceGroup)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer"
              >
                <option value="all">{b('সকল ব্যবহারকারী (All Users)', 'All Users', lang)}</option>
                <option value="teachers">{b('সকল শিক্ষক (Teachers)', 'Teachers', lang)}</option>
                <option value="students">{b('সকল শিক্ষার্থী (Students)', 'Students', lang)}</option>
                <option value="guardians">{b('সকল অভিভাবক (Guardians)', 'Guardians', lang)}</option>
                <option value="school_staff">{b('সকল স্কুল স্টাফ (Staff)', 'School Staff', lang)}</option>
                <option value="class_group">{b('নির্দিষ্ট শ্রেণি (Class/Group)', 'Specific Class / Group', lang)}</option>
                <option value="specific_section">{b('নির্দিষ্ট শাখা (Specific Section)', 'Specific Section', lang)}</option>
                <option value="specific_teacher">{b('নির্দিষ্ট শিক্ষক (Specific Teacher)', 'Specific Teacher(s)', lang)}</option>
                <option value="specific_student">{b('নির্দিষ্ট শিক্ষার্থী (Specific Student)', 'Specific Student(s)', lang)}</option>
                <option value="selected_groups">{b('একাধিক গ্রুপ (Selected Groups)', 'Selected Groups', lang)}</option>
                <option value="specific_users">{b('নির্দিষ্ট ব্যক্তি (Specific Users)', 'Specific User(s)', lang)}</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">{b('মেয়াদকাল (Validity)', 'Validity Duration', lang)}</label>
              <select
                value={validityLabel}
                onChange={(e) => setValidityLabel(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer"
              >
                <option value="24 Hours">24 Hours</option>
                <option value="48 Hours">48 Hours</option>
                <option value="7 Days">7 Days</option>
                <option value="15 Days">15 Days</option>
                <option value="30 Days">30 Days</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">{b('প্রকাশের ধরন', 'Publish Action', lang)}</label>
              <select
                value={publishMode}
                onChange={(e) => setPublishMode(e.target.value as 'Published' | 'Scheduled' | 'Draft')}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer"
              >
                <option value="Published">{b('এখনই প্রকাশ করুন (Publish Now)', 'Publish Now', lang)}</option>
                <option value="Scheduled">{b('সময় নির্ধারণ করুন (Schedule)', 'Schedule Later', lang)}</option>
                <option value="Draft">{b('খসড়া সংরক্ষণ (Save Draft)', 'Save as Draft', lang)}</option>
              </select>
            </div>
          </div>

          {(audienceGroup === 'class_group' ||
            audienceGroup === 'specific_section' ||
            audienceGroup === 'selected_groups') && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-2">
              <div className="font-semibold">{b('লক্ষ্য শ্রেণি নির্বাচন করুন:', 'Select Target Class(es):', lang)}</div>
              <div className="flex flex-wrap gap-2">
                {ALL_CLASSES.slice(0, 7).map((cls) => {
                  const checked = selectedClasses.includes(cls);
                  return (
                    <label key={cls} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setSelectedClasses((prev) =>
                            e.target.checked ? [...prev, cls] : prev.filter((x) => x !== cls)
                          )
                        }
                      />
                      <span>{cls}</span>
                    </label>
                  );
                })}
              </div>
              {audienceGroup === 'specific_section' && (
                <div>
                  <label className="block font-semibold mb-1">{b('শাখা (কমা দিয়ে পৃথক করুন):', 'Target Section(s) comma-separated:', lang)}</label>
                  <input
                    type="text"
                    value={sectionsDraft}
                    onChange={(e) => setSectionsDraft(e.target.value)}
                    placeholder="ক (A), খ (B)"
                    className="w-full sm:w-80 h-8 px-2.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              )}
            </div>
          )}

          {(audienceGroup === 'specific_users' ||
            audienceGroup === 'specific_teacher' ||
            audienceGroup === 'specific_student' ||
            audienceGroup === 'selected_groups') && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-2">
              <div className="font-semibold">{b('নির্দিষ্ট প্রাপক নির্বাচন করুন:', 'Select Specific Recipient(s):', lang)}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-36 overflow-y-auto">
                {selectableRecipients.map((u) => {
                  const checked = selectedUserIds.includes(u.id);
                  return (
                    <label key={u.id} className="inline-flex items-center gap-1.5 p-1.5 rounded border border-slate-200 dark:border-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setSelectedUserIds((prev) =>
                            e.target.checked ? [...prev, u.id] : prev.filter((x) => x !== u.id)
                          )
                        }
                      />
                      <span className="truncate">{u.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {publishMode === 'Scheduled' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">{b('নির্ধারিত প্রকাশের সময়', 'Scheduled Publish Time', lang)}</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('মেয়াদ শেষ তারিখ', 'Expiry Date', lang)}</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
            </div>
          )}

          {/* Image Attachment Block */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => void handleDraftImageUpload(e.target.files)}
                />
                <input
                  ref={replaceInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => void handleReplaceDraftImage(e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4" />
                  🖼️ {b('ছবি যুক্ত করুন', 'Add Image', lang)} ({draftImages.length}/{maxNoticeImages})
                </button>
                <span className="text-[11px] text-slate-500">
                  PNG, JPG, WEBP, GIF · max 5MB
                </span>
              </div>

              <label className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowImageDownload}
                  onChange={(e) => setAllowImageDownload(e.target.checked)}
                />
                {b('প্রাপক ছবি ডাউনলোড করতে পারবেন', 'Allow recipients to download images', lang)}
              </label>
            </div>

            {imageError && (
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-semibold">
                {imageError}
              </div>
            )}

            {draftImages.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {draftImages.map((img, idx) => (
                  <div
                    key={img.id}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center gap-2.5"
                  >
                    <img
                      src={img.dataUrl}
                      alt={img.fileName}
                      className="w-14 h-14 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">{img.fileName}</div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {Math.round(img.sizeBytes / 1024)} KB · {img.width}×{img.height}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setReplaceTargetIndex(idx);
                            replaceInputRef.current?.click();
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          {b('বদলান', 'Replace', lang)}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDraftImages((prev) => prev.filter((_, i) => i !== idx))}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-[11px] font-semibold cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          {b('মুছুন', 'Remove', lang)}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setComposerOpen(false)}
              className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
            >
              {b('বাতিল', 'Cancel', lang)}
            </button>
            <button
              type="button"
              disabled={!titleBn.trim() || !bodyBn.trim()}
              onClick={() => setPreviewConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              {b('প্রিভিউ ও নিশ্চিত করুন', 'Preview Notice', lang)}
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs + Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', bn: 'সকল নোটিশ', en: 'All Notices' },
                { id: 'central', bn: 'Central Notice', en: 'Central' },
                { id: 'school', bn: 'School Notice', en: 'School' },
                { id: 'teacher', bn: 'Teacher Notice', en: 'Teacher' },
                { id: 'student', bn: 'Student Notice', en: 'Student' },
                { id: 'emergency', bn: 'জরুরি (Emergency)', en: 'Emergency' },
                { id: 'scheduled', bn: 'Scheduled', en: 'Scheduled' },
                { id: 'published', bn: 'Published', en: 'Published' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeFilter(t.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  typeFilter === t.id
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {b(t.bn, t.en, lang)}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={b('নোটিশ খুঁজুন...', 'Search notices...', lang)}
            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none md:w-64"
          />
        </div>

        {/* Notice Cards */}
        {visibleNotices.length === 0 ? (
          <div className="py-8 text-center text-slate-500">
            {b('এই বিভাগে কোনো নোটিশ পাওয়া যায়নি।', 'No notices found for this filter.', lang)}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleNotices.map((n) => {
              const st = n.status ?? 'Published';
              const isRead = isNoticeReadByUser(n, userId);
              const canManageItem =
                role === 'central_admin' ||
                (role === 'school_admin' && (!n.schoolId || n.schoolId === schoolId) && n.noticeType !== 'central') ||
                (n.authorId && n.authorId === userId);
              const noticeImages = n.images ?? [];
              const safeAuthor = sanitizeActorDisplayForRole(n.author, role);

              return (
                <div
                  key={n.id}
                  className={`p-4 rounded-xl border space-y-2.5 ${
                    n.isEmergency || n.noticeType === 'emergency'
                      ? 'border-red-300 dark:border-red-800 bg-red-50/40 dark:bg-red-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span
                          className={`font-bold ${
                            n.isEmergency ? 'text-red-600 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'
                          }`}
                        >
                          {(n.noticeType ?? n.category).toUpperCase()}
                        </span>
                        <span>·</span>
                        <span
                          className={`font-semibold ${
                            st === 'Published' || st === 'Edited'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : st === 'Scheduled'
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-slate-500'
                          }`}
                        >
                          {st}
                        </span>
                        <span>·</span>
                        <span>{b('প্রাপক:', 'Audience:', lang)} {n.audienceGroup ?? n.audience}</span>
                        {n.validityLabel && (
                          <>
                            <span>·</span>
                            <span>{b('মেয়াদ:', 'Valid:', lang)} {n.validityLabel}</span>
                          </>
                        )}
                        {noticeImages.length > 0 && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-400">
                              <ImageIcon className="w-3 h-3" />
                              {noticeImages.length}
                            </span>
                          </>
                        )}
                        <span>·</span>
                        <span className="font-mono">{n.date}</span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {n.isEmergency && <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
                        {b(n.titleBn, n.titleEn, lang)}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onMarkNoticeRead(n.id, userId)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold cursor-pointer ${
                          isRead
                            ? 'border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                            : 'border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isRead ? b('পঠিত (Read)', 'Read ✓', lang) : b('পঠিত চিহ্নিত করুন', 'Mark Read', lang)}
                      </button>

                      {canManageItem && st !== 'Cancelled' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNotice(n);
                              setEditTitleBn(n.titleBn);
                              setEditBodyBn(n.bodyBn);
                              setEditAllowDownload(n.allowImageDownload !== false);
                              setEditImageError(null);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            {b('সম্পাদনা', 'Edit', lang)}
                          </button>
                          {(st === 'Draft' || st === 'Scheduled') && (
                            <button
                              type="button"
                              onClick={() => onTransitionNoticeStatus(n.id, 'Published')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              {b('এখনই প্রকাশ', 'Publish', lang)}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onTransitionNoticeStatus(n.id, 'Cancelled')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            {b('বাতিল', 'Cancel', lang)}
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => setHistoryNoticeId((prev) => (prev === n.id ? null : n.id))}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5" />
                        {b('ইতিহাস', 'History', lang)} ({(n.history ?? []).length})
                      </button>
                    </div>
                  </div>

                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {b(n.bodyBn, n.bodyEn, lang)}
                  </p>

                  {/* Notice Attached Image Thumbnails (Click to open Full-Screen Zoomable Lightbox) */}
                  {noticeImages.length > 0 && (
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {noticeImages.map((img, idx) => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => openLightbox(n, noticeImages, idx)}
                          className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 text-left cursor-pointer hover:border-blue-500 transition-colors"
                          title={b('বড় করে দেখতে ক্লিক করুন', 'Click to view full-screen', lang)}
                        >
                          <img
                            src={img.dataUrl}
                            alt={img.fileName}
                            className="w-28 h-20 object-cover rounded-lg"
                          />
                          <div className="mt-1 px-1 flex items-center justify-between gap-1 text-[10px] text-slate-500">
                            <span className="truncate max-w-20 font-medium">{img.fileName}</span>
                            <ZoomIn className="w-3 h-3 text-blue-600 shrink-0" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                    <span>{b('প্রেরক:', 'Author:', lang)} {safeAuthor}</span>
                    {n.scheduledAt && (
                      <span className="inline-flex items-center gap-1 font-mono text-amber-700 dark:text-amber-400">
                        <CalendarClock className="w-3.5 h-3.5" />
                        {b('Scheduled:', 'Scheduled:', lang)} {n.scheduledAt}
                      </span>
                    )}
                  </div>

                  {historyNoticeId === n.id && (n.history ?? []).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                      <div className="font-bold text-slate-700 dark:text-slate-300">
                        {b('নোটিশ অডিট ও পরিবর্তন ইতিহাস:', 'Notice Lifecycle History:', lang)}
                      </div>
                      {(n.history ?? []).map((h) => (
                        <div key={h.id} className="flex items-center justify-between text-[11px] text-slate-500 gap-2">
                          <span>
                            <strong className="text-slate-800 dark:text-slate-200">{h.action}</strong> · {h.summary} ({sanitizeActorDisplayForRole(h.actorName, role)})
                          </span>
                          <span className="font-mono shrink-0">{h.timestamp}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mandatory Preview & Confirmation Warning Modal */}
      {previewConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                {b('প্রেরণের পূর্বে প্রিভিউ ও সতর্কতা নিশ্চিতকরণ', 'Preview & Confirmation Warning', lang)}
              </div>
              <button type="button" onClick={() => setPreviewConfirmOpen(false)} className="cursor-pointer">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-semibold">
              {b(
                'সতর্কতা: প্রকাশ করার পর নির্ধারিত সকল প্রাপকের নোটিফিকেশন বেল ও ড্যাশবোর্ডে এই নোটিশ তাৎক্ষণিকভাবে পৌঁছে যাবে।',
                'Warning: Once submitted, this notice will immediately trigger notifications for the selected audience.',
                lang
              )}
            </div>

            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-2.5">
              <div className="text-[11px] font-mono text-slate-500">
                Type: {isEmergency ? 'EMERGENCY' : noticeType.toUpperCase()} · Audience: {audienceGroup} · Mode: {publishMode}
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">{titleBn}</div>
              <p className="text-slate-600 dark:text-slate-300">{bodyBn}</p>
              {draftImages.length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-500">
                    {b('সংযুক্ত ছবি:', 'Attached Images:', lang)} ({draftImages.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {draftImages.map((img) => (
                      <img
                        key={img.id}
                        src={img.dataUrl}
                        alt={img.fileName}
                        className="w-24 h-18 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewConfirmOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
              >
                {b('সংশোধন করুন', 'Back to Edit', lang)}
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
              >
                <Send className="w-4 h-4" />
                {b('নিশ্চিত ও প্রেরণ করুন', 'Confirm & Submit Notice', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Send Edit Modal (Text + Post-Publish Image Management with Audit History) */}
      {editingNotice && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {b('নোটিশ সম্পাদনা (স্ট্যাটাস "Edited" হবে)', 'Edit Notice (Transitions to Edited)', lang)}
              </h3>
              <button type="button" onClick={() => setEditingNotice(null)} className="cursor-pointer">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">{b('বিষয়', 'Subject', lang)}</label>
                <input
                  type="text"
                  value={editTitleBn}
                  onChange={(e) => setEditTitleBn(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('বিস্তারিত', 'Details', lang)}</label>
                <textarea
                  rows={3}
                  value={editBodyBn}
                  onChange={(e) => setEditBodyBn(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                />
              </div>

              <label className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editAllowDownload}
                  onChange={(e) => setEditAllowDownload(e.target.checked)}
                />
                {b('প্রাপক ছবি ডাউনলোড করতে পারবেন', 'Allow recipients to download images', lang)}
              </label>

              {onUpdateNoticeImages && (
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {b('সংযুক্ত ছবি ব্যবস্থাপনা', 'Manage Attached Images', lang)} ({(editingNotice.images ?? []).length}/{maxNoticeImages})
                    </span>
                    <input
                      ref={editAddImageRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => void handleEditNoticeImageAdd(e.target.files)}
                    />
                    <input
                      ref={editReplaceImageRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => void handleEditNoticeImageReplace(e.target.files)}
                    />
                    <button
                      type="button"
                      onClick={() => editAddImageRef.current?.click()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      {b('নতুন ছবি যোগ করুন', 'Add Image', lang)}
                    </button>
                  </div>
                  {editImageError && (
                    <div className="p-2 rounded bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 font-semibold">
                      {editImageError}
                    </div>
                  )}
                  {(editingNotice.images ?? []).length > 0 && (
                    <div className="space-y-1.5">
                      {(editingNotice.images ?? []).map((img, idx) => (
                        <div key={img.id} className="flex items-center justify-between gap-2 p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2 min-w-0">
                            <img src={img.dataUrl} alt={img.fileName} className="w-10 h-10 rounded object-cover shrink-0" />
                            <span className="truncate font-medium">{img.fileName}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditReplaceIndex(idx);
                                editReplaceImageRef.current?.click();
                              }}
                              className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                            >
                              {b('বদলান', 'Replace', lang)}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = (editingNotice.images ?? []).filter((_, i) => i !== idx);
                                onUpdateNoticeImages(
                                  editingNotice.id,
                                  next,
                                  'Image Removed',
                                  `Removed image ${img.fileName}`
                                );
                                setEditingNotice({ ...editingNotice, images: next });
                              }}
                              className="px-2 py-0.5 rounded border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-semibold cursor-pointer"
                            >
                              {b('মুছুন', 'Remove', lang)}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingNotice(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
              >
                {b('বাতিল', 'Cancel', lang)}
              </button>
              <button
                type="button"
                onClick={() => {
                  onEditNotice(editingNotice.id, {
                    titleBn: editTitleBn,
                    titleEn: editingNotice.titleEn,
                    bodyBn: editBodyBn,
                    bodyEn: editingNotice.bodyEn,
                    allowImageDownload: editAllowDownload,
                  });
                  setEditingNotice(null);
                }}
                className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
              >
                {b('হালনাগাদ সংরক্ষণ করুন', 'Save Changes', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Zoomable Image Lightbox Modal */}
      {lightboxState && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex flex-col justify-between p-4 text-white"
          role="dialog"
          aria-modal="true"
        >
          {/* Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="min-w-0">
              <div className="font-bold text-sm truncate">
                {b(lightboxState.notice.titleBn, lightboxState.notice.titleEn, lang)}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {lightboxState.images[lightboxState.index]?.fileName} ·{' '}
                {lightboxState.images[lightboxState.index]?.width}×{lightboxState.images[lightboxState.index]?.height} ·{' '}
                {lightboxState.index + 1}/{lightboxState.images.length}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs px-1.5">{Math.round(zoomLevel * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold cursor-pointer"
              >
                100%
              </button>
              {lightboxState.notice.allowImageDownload !== false && lightboxState.images[lightboxState.index] && (
                <a
                  href={lightboxState.images[lightboxState.index].dataUrl}
                  download={lightboxState.images[lightboxState.index].fileName}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold"
                >
                  <Download className="w-4 h-4" />
                  {b('ডাউনলোড', 'Download', lang)}
                </a>
              )}
              <button
                type="button"
                onClick={() => setLightboxState(null)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 font-semibold cursor-pointer"
              >
                <X className="w-4 h-4" />
                {b('বন্ধ করুন', 'Close', lang)}
              </button>
            </div>
          </div>

          {/* Image Stage */}
          <div className="flex-1 overflow-auto flex items-center justify-center relative my-2">
            {lightboxState.images.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setZoomLevel(1);
                  setLightboxState((prev) =>
                    prev
                      ? {
                          ...prev,
                          index: (prev.index - 1 + prev.images.length) % prev.images.length,
                        }
                      : null
                  );
                }}
                className="absolute left-2 z-10 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 cursor-pointer"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {lightboxState.images[lightboxState.index] && (
              <img
                src={lightboxState.images[lightboxState.index].dataUrl}
                alt={lightboxState.images[lightboxState.index].fileName}
                style={{ transform: `scale(${zoomLevel})` }}
                className="max-h-[75vh] max-w-full object-contain rounded-lg transition-transform duration-150"
              />
            )}

            {lightboxState.images.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setZoomLevel(1);
                  setLightboxState((prev) =>
                    prev
                      ? {
                          ...prev,
                          index: (prev.index + 1) % prev.images.length,
                        }
                      : null
                  );
                }}
                className="absolute right-2 z-10 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 cursor-pointer"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Footer Meta */}
          <div className="text-center text-[11px] text-slate-400">
            {b('প্রেরক:', 'Uploaded by:', lang)}{' '}
            {sanitizeActorDisplayForRole(
              lightboxState.images[lightboxState.index]?.uploadedBy ?? lightboxState.notice.author,
              role
            )}{' '}
            · {lightboxState.images[lightboxState.index]?.uploadedAt ?? lightboxState.notice.date}
          </div>
        </div>
      )}
    </div>
  );
};
