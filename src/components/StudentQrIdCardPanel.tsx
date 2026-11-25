import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { BadgeCheck, Check, Copy, Download, Printer, QrCode, ShieldCheck } from 'lucide-react';
import type { Language, SchoolRecord, StudentRecord } from '../types';
import { b } from '../i18n/translations';
import { buildStudentQrPayload } from '../utils/studentQrGenerator';
import { DEFAULT_PROFILE_AVATARS } from '../data/mockData';

interface StudentQrIdCardPanelProps {
  lang: Language;
  student: StudentRecord;
  school?: SchoolRecord;
}

export const StudentQrIdCardPanel: React.FC<StudentQrIdCardPanelProps> = ({
  lang,
  student,
  school,
}) => {
  const payload = useMemo(() => buildStudentQrPayload(student), [student]);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(payload, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [payload]);

  const handleCopyPayload = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored in restricted clipboard contexts
    }
  };

  const handleDownloadQrPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${student.permanentId}-qr-id.png`;
    a.click();
  };

  return (
    <section
      data-testid="student-qr-id-card-panel"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 text-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <QrCode className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            {b('আমার ডিজিটাল QR শিক্ষার্থী পরিচয়পত্র', 'My Scannable Digital QR Student ID', lang)}
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {b(
              'শিক্ষকের উপস্থিতি স্ক্যানারের মাধ্যমে তাৎক্ষণিক হাজিরার জন্য এই QR কোড ব্যবহার করুন বা PNG ডাউনলোড করুন।',
              'Show this QR code to your teacher attendance scanner or download the PNG for offline ID verification.',
              lang
            )}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
          <BadgeCheck className="w-4 h-4" />
          {b('যাচাইকৃত আইডি', 'Verified ID', lang)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-center">
        {/* Generated QR Code Canvas Image */}
        <div className="mx-auto md:mx-0 p-3 rounded-2xl bg-white border-2 border-slate-200 dark:border-slate-700 flex flex-col items-center gap-2 shadow-xs">
          {qrDataUrl ? (
            <img
              data-testid="student-qr-code-image"
              src={qrDataUrl}
              alt={`QR ID ${student.permanentId}`}
              className="w-44 h-44 object-contain"
            />
          ) : (
            <div className="w-44 h-44 bg-slate-100 flex items-center justify-center text-slate-400">
              Generating QR...
            </div>
          )}
          <span className="font-mono text-[10px] font-bold text-slate-700 tracking-wider">
            {student.permanentId}
          </span>
        </div>

        {/* Identity Metadata + Actions */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <img
              src={student.photoUrl ?? DEFAULT_PROFILE_AVATARS.student}
              alt={student.nameEn}
              className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
            />
            <div className="min-w-0">
              <div className="text-base font-bold text-slate-900 dark:text-white truncate">
                {student.nameBn}
              </div>
              <div className="text-slate-600 dark:text-slate-300 truncate">{student.nameEn}</div>
              <div className="font-semibold text-blue-700 dark:text-blue-400">
                {school?.nameBn ?? student.schoolNameBn} · {student.className} ({student.section}) · Roll #{student.roll}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              {b('এনকোডেড ভেরিফিকেশন টোকেন', 'Encoded Verification Payload', lang)}
            </div>
            <div data-testid="student-qr-payload-text" className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 break-all">
              {payload}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              data-testid="download-student-qr-btn"
              disabled={!qrDataUrl}
              onClick={handleDownloadQrPng}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              {b('QR PNG ডাউনলোড', 'Download QR PNG', lang)}
            </button>
            <button
              type="button"
              data-testid="copy-student-qr-btn"
              onClick={() => void handleCopyPayload()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? b('কপি হয়েছে ✓', 'Copied ✓', lang) : b('QR কোড কপি', 'Copy Payload', lang)}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              {b('কার্ড প্রিন্ট', 'Print Card', lang)}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
