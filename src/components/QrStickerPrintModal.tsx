import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import {
  CheckSquare,
  Download,
  Printer,
  QrCode,
  Search,
  Square,
  X,
} from 'lucide-react';
import type { Language, SchoolRecord, StudentRecord } from '../types';
import { b } from '../i18n/translations';
import {
  buildStudentQrStickerList,
  generatePrintableStickersHtml,
  getStickerLayoutSpec,
  STICKER_LAYOUT_SPECS,
  type StickerSheetLayout,
  type StudentQrStickerData,
} from '../utils/attendanceExportAndStickers';

export interface QrStickerPrintModalProps {
  isOpen: boolean;
  lang: Language;
  school?: Partial<SchoolRecord>;
  schoolId: string;
  schoolNameBn: string;
  students: StudentRecord[];
  initialClassFilter?: string;
  initialSelectedIds?: string[];
  onClose: () => void;
}

export const QrStickerPrintModal: React.FC<QrStickerPrintModalProps> = ({
  isOpen,
  lang,
  school,
  schoolId,
  schoolNameBn,
  students,
  initialClassFilter = 'All',
  initialSelectedIds,
  onClose,
}) => {
  const [classFilter, setClassFilter] = useState<string>(initialClassFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [layout, setLayout] = useState<StickerSheetLayout>('3x8');
  const [showSchoolMeta, setShowSchoolMeta] = useState(true);
  const [showDigitalSerial, setShowDigitalSerial] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [qrMap, setQrMap] = useState<Record<string, string>>({});

  const scopedStudents = useMemo(
    () => students.filter((s) => s.schoolId === schoolId && s.status !== 'deactivated'),
    [students, schoolId]
  );

  const classOptions = useMemo(() => {
    const classes = Array.from(new Set(scopedStudents.map((s) => s.className)));
    return ['All', ...classes];
  }, [scopedStudents]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedStudents.filter((s) => {
      if (classFilter !== 'All' && s.className !== classFilter) return false;
      if (!q) return true;
      return (
        s.nameBn.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        s.permanentId.toLowerCase().includes(q) ||
        (s.digitalIdSerial ?? '').toLowerCase().includes(q) ||
        String(s.roll).includes(q)
      );
    });
  }, [scopedStudents, classFilter, searchQuery]);

  // Reset class & default selection when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setClassFilter(initialClassFilter || 'All');
    setSearchQuery('');
    const initialList =
      initialSelectedIds && initialSelectedIds.length > 0
        ? initialSelectedIds
        : scopedStudents
            .filter((s) => (initialClassFilter && initialClassFilter !== 'All' ? s.className === initialClassFilter : true))
            .map((s) => s.id);
    setSelectedIds(new Set(initialList));
  }, [isOpen, initialClassFilter, initialSelectedIds, scopedStudents]);

  const stickerDataList = useMemo<StudentQrStickerData[]>(() => {
    const chosen = filteredStudents.filter((s) => selectedIds.has(s.id));
    return buildStudentQrStickerList(chosen, {
      id: school?.id ?? schoolId,
      code: school?.code ?? schoolId,
      schoolPublicId: school?.schoolPublicId ?? school?.code ?? schoolId,
      eiin: school?.eiin ?? '—',
      nameBn: school?.nameBn ?? schoolNameBn,
      nameEn: school?.nameEn ?? schoolNameBn,
    });
  }, [filteredStudents, selectedIds, school, schoolId, schoolNameBn]);

  const previewStickers = useMemo<StudentQrStickerData[]>(() => {
    if (stickerDataList.length > 0) return stickerDataList;
    return buildStudentQrStickerList(filteredStudents, {
      id: school?.id ?? schoolId,
      code: school?.code ?? schoolId,
      schoolPublicId: school?.schoolPublicId ?? school?.code ?? schoolId,
      eiin: school?.eiin ?? '—',
      nameBn: school?.nameBn ?? schoolNameBn,
      nameEn: school?.nameEn ?? schoolNameBn,
    });
  }, [stickerDataList, filteredStudents, school, schoolId, schoolNameBn]);

  // Generate scannable QR PNG data URLs for all visible stickers
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const generateAll = async () => {
      const entries = await Promise.all(
        previewStickers.map(async (st) => {
          if (qrMap[st.qrPayload]) {
            return [st.qrPayload, qrMap[st.qrPayload]] as const;
          }
          try {
            const url = await QRCode.toDataURL(st.qrPayload, {
              width: 240,
              margin: 1,
              color: { dark: '#0f172a', light: '#ffffff' },
            });
            return [st.qrPayload, url] as const;
          } catch {
            return [st.qrPayload, ''] as const;
          }
        })
      );
      if (cancelled) return;
      setQrMap((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [k, v] of entries) {
          if (v && next[k] !== v) {
            next[k] = v;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    };

    void generateAll();
    return () => {
      cancelled = true;
    };
  }, [isOpen, previewStickers, qrMap]);

  if (!isOpen) return null;

  const layoutSpec = getStickerLayoutSpec(layout);
  const allFilteredSelected =
    filteredStudents.length > 0 && filteredStudents.every((s) => selectedIds.has(s.id));

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredStudents.forEach((s) => next.delete(s.id));
      } else {
        filteredStudents.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  const activeStickers = stickerDataList.length > 0 ? stickerDataList : previewStickers;

  const handlePrintStickers = () => {
    if (activeStickers.length === 0) return;
    document.body.classList.add('printing-qr-stickers');
    const cleanup = () => {
      document.body.classList.remove('printing-qr-stickers');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.setTimeout(() => {
      window.print();
    }, 60);
    window.setTimeout(cleanup, 3000);
  };

  const handleDownloadPrintableHtml = () => {
    if (activeStickers.length === 0) return;
    const html = generatePrintableStickersHtml(
      activeStickers.map((st) => ({
        ...st,
        qrDataUrl: qrMap[st.qrPayload] ?? '',
      })),
      layout,
      { showSchoolMeta, showDigitalSerial }
    );
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-stickers-${school?.schoolPublicId ?? schoolId}-${classFilter === 'All' ? 'all' : classFilter.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPortal =
    typeof document !== 'undefined'
      ? createPortal(
          <div className="qr-sticker-print-portal hidden" aria-hidden="true">
            <div
              className="qr-sticker-sheet-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${layoutSpec.columns}, ${layoutSpec.widthMm}mm)`,
                gap: '3mm',
                justifyContent: 'center',
              }}
            >
              {activeStickers.map((st) => (
                <div
                  key={`print-${st.studentId}`}
                  style={{
                    width: `${layoutSpec.widthMm}mm`,
                    height: `${layoutSpec.heightMm}mm`,
                    border: '1px dashed #94a3b8',
                    borderRadius: '3mm',
                    padding: '2mm',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2mm',
                    overflow: 'hidden',
                    backgroundColor: '#ffffff',
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(18, Math.round(layoutSpec.heightMm * 0.72))}mm`,
                      height: `${Math.max(18, Math.round(layoutSpec.heightMm * 0.72))}mm`,
                      flexShrink: 0,
                    }}
                  >
                    {qrMap[st.qrPayload] && (
                      <img
                        src={qrMap[st.qrPayload]}
                        alt={`QR ${st.permanentId}`}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5mm' }}>
                    {showSchoolMeta && (
                      <div style={{ fontSize: '6.5pt', fontWeight: 700, color: '#047857', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {st.schoolNameBn} ({st.schoolPublicId} · EIIN {st.eiin})
                      </div>
                    )}
                    <div style={{ fontSize: '8.5pt', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {st.nameBn}
                    </div>
                    <div style={{ fontSize: '7pt', color: '#334155' }}>
                      {st.className} ({st.section}) · Roll #{st.roll} · {st.bloodGroup}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '7pt', fontWeight: 700, color: '#1d4ed8' }}>
                      {st.permanentId}
                    </div>
                    {showDigitalSerial && (
                      <div style={{ fontFamily: 'monospace', fontSize: '6pt', color: '#64748b' }}>
                        {st.digitalIdSerial}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {printPortal}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={b('প্রিন্টযোগ্য QR কোড স্টিকার', 'Printable QR Code Stickers', lang)}
        data-testid="qr-sticker-modal"
        className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 no-print"
      >
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-xs">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-emerald-50 to-blue-50/60 dark:from-slate-900 dark:to-slate-900">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {b('প্রিন্টযোগ্য স্টিকার QR কোড শীট (Adhesive QR Stickers)', 'Printable Student QR Adhesive Stickers', lang)}
                </h2>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {school?.nameBn ?? schoolNameBn} · School ID:{' '}
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {school?.schoolPublicId ?? school?.code ?? schoolId}
                  </span>{' '}
                  · EIIN: <span className="font-mono font-semibold">{school?.eiin ?? '—'}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="download-qr-stickers-html-btn"
                disabled={activeStickers.length === 0}
                onClick={handleDownloadPrintableHtml}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-slate-800 dark:text-slate-100 disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                {b('প্রিন্ট শীট ডাউনলোড (.html)', 'Download Sheet (.html)', lang)}
              </button>
              <button
                type="button"
                data-testid="print-qr-stickers-btn"
                disabled={activeStickers.length === 0}
                onClick={handlePrintStickers}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold disabled:opacity-50 shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                {b(`স্টিকার প্রিন্ট করুন (${activeStickers.length}টি)`, `Print Stickers (${activeStickers.length})`, lang)}
              </button>
              <button
                type="button"
                aria-label={b('বন্ধ করুন', 'Close', lang)}
                onClick={onClose}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-wrap items-center gap-2.5">
            <select
              aria-label={b('শ্রেণি নির্বাচন', 'Class filter', lang)}
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold cursor-pointer"
            >
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? b('সকল শ্রেণি', 'All Classes', lang) : c}
                </option>
              ))}
            </select>

            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={b('নাম, রোল বা Student ID খুঁজুন...', 'Search name, roll or Student ID...', lang)}
                className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-emerald-600"
              />
            </div>

            <select
              aria-label={b('স্টিকার লেআউট', 'Sticker Sheet Layout', lang)}
              data-testid="sticker-layout-select"
              value={layout}
              onChange={(e) => setLayout(e.target.value as StickerSheetLayout)}
              className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold cursor-pointer"
            >
              {(Object.keys(STICKER_LAYOUT_SPECS) as StickerSheetLayout[]).map((key) => {
                const sp = STICKER_LAYOUT_SPECS[key];
                return (
                  <option key={key} value={key}>
                    {b(sp.titleBn, sp.titleEn, lang)}
                  </option>
                );
              })}
            </select>

            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={showSchoolMeta}
                onChange={(e) => setShowSchoolMeta(e.target.checked)}
                className="accent-emerald-700"
              />
              {b('বিদ্যালয় তথ্য', 'School Meta', lang)}
            </label>

            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={showDigitalSerial}
                onChange={(e) => setShowDigitalSerial(e.target.checked)}
                className="accent-emerald-700"
              />
              {b('ডিজিটাল সিরিয়াল', 'Digital Serial', lang)}
            </label>

            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold cursor-pointer ml-auto"
            >
              {allFilteredSelected ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-700" />
                  {b('সব বাতিল করুন', 'Deselect All', lang)}
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-500" />
                  {b(`সব নির্বাচন (${filteredStudents.length})`, `Select All (${filteredStudents.length})`, lang)}
                </>
              )}
            </button>
          </div>

          {/* Body: Left student selector checklist + Right adhesive sheet preview */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* Student Checklist */}
            <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-3 space-y-1.5 max-h-56 lg:max-h-none bg-white dark:bg-slate-900">
              <div className="px-1.5 py-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>{b('শিক্ষার্থী নির্বাচন', 'Select Students', lang)}</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400">
                  {selectedIds.size}/{scopedStudents.length}
                </span>
              </div>
              {filteredStudents.map((stu) => {
                const checked = selectedIds.has(stu.id);
                return (
                  <label
                    key={stu.id}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition-colors ${
                      checked
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStudent(stu.id)}
                      className="accent-emerald-700 w-4 h-4 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {stu.nameBn}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate font-mono">
                        {stu.className} ({stu.section}) · Roll {stu.roll} · {stu.permanentId}
                      </div>
                    </div>
                  </label>
                );
              })}
              {filteredStudents.length === 0 && (
                <div className="py-8 text-center text-slate-400">
                  {b('কোনো শিক্ষার্থী পাওয়া যায়নি।', 'No matching students.', lang)}
                </div>
              )}
            </div>

            {/* Adhesive Sticker Sheet Preview */}
            <div className="lg:col-span-8 overflow-y-auto p-4 sm:p-5 bg-slate-100/80 dark:bg-slate-950/60 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                <span>
                  {b('প্রিন্ট প্রিভিউ:', 'Print Preview:', lang)}{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {b(layoutSpec.titleBn, layoutSpec.titleEn, lang)}
                  </strong>{' '}
                  ({layoutSpec.widthMm}mm × {layoutSpec.heightMm}mm)
                </span>
                <span className="font-mono">
                  {activeStickers.length} {b('টি স্টিকার প্রস্তুত', 'stickers ready', lang)}
                </span>
              </div>

              <div
                data-testid="qr-sticker-preview-grid"
                className={`grid gap-3 ${
                  layout === 'compact'
                    ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
                    : 'grid-cols-1 sm:grid-cols-2'
                }`}
              >
                {activeStickers.map((st) => {
                  const qrImg = qrMap[st.qrPayload];
                  return (
                    <div
                      key={st.studentId}
                      data-testid={`qr-sticker-card-${st.permanentId}`}
                      className="bg-white text-slate-900 border-2 border-dashed border-slate-300 rounded-xl p-2.5 flex items-center gap-2.5 shadow-xs"
                    >
                      <div className="w-20 h-20 shrink-0 rounded-lg border border-slate-200 bg-white p-1 flex items-center justify-center">
                        {qrImg ? (
                          <img
                            src={qrImg}
                            alt={`QR ${st.permanentId}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <QrCode className="w-8 h-8 text-slate-400 animate-pulse" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        {showSchoolMeta && (
                          <div className="text-[10px] font-bold text-emerald-700 truncate">
                            {st.schoolNameBn} · {st.schoolPublicId} (EIIN {st.eiin})
                          </div>
                        )}
                        <div className="text-sm font-extrabold text-slate-900 truncate">
                          {st.nameBn}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-600">
                          {st.className} ({st.section}) · Roll #{st.roll} · {st.bloodGroup}
                        </div>
                        <div className="font-mono text-[10px] font-bold text-blue-700 break-all leading-tight">
                          ID: {st.permanentId}
                        </div>
                        {showDigitalSerial && (
                          <div className="font-mono text-[9.5px] text-slate-500 break-all leading-tight">
                            {st.digitalIdSerial}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
