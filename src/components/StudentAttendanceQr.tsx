import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  CheckCircle2,
  DoorClosed,
  DoorOpen,
  QrCode,
  ShieldAlert,
  Square,
  Upload,
  UserCheck,
} from 'lucide-react';
import type { Language, SchoolRecord, StudentAttendanceHistoryEntry, StudentRecord } from '../types';
import { b } from '../i18n/translations';
import { parseAndValidateStudentQrPayload } from '../utils/studentQrGenerator';

export interface StudentAttendanceQrProps {
  lang: Language;
  schoolId: string;
  school?: SchoolRecord;
  students: StudentRecord[];
  attendanceHistory: StudentAttendanceHistoryEntry[];
  allowedClasses?: string[];
  onRecordEntryExitScan: (params: {
    rawCode: string;
    schoolId: string;
    mode: 'entry' | 'exit';
    dateIso: string;
    timeText: string;
    allowedClasses?: string[];
  }) => {
    ok: boolean;
    status: 'recorded' | 'duplicate' | 'not_found' | 'wrong_school' | 'unauthorized_class' | 'invalid_qr';
    messageBn: string;
    messageEn: string;
    student?: StudentRecord;
    parentNotified?: boolean;
  };
}

export const StudentAttendanceQr: React.FC<StudentAttendanceQrProps> = ({
  lang,
  schoolId,
  school,
  students,
  attendanceHistory,
  allowedClasses,
  onRecordEntryExitScan,
}) => {
  const [scanMode, setScanMode] = useState<'entry' | 'exit'>('entry');
  const [manualInput, setManualInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [lastResult, setLastResult] = useState<{
    ok: boolean;
    message: string;
    student?: StudentRecord;
    parentNotified?: boolean;
    mode: 'entry' | 'exit';
    timeText: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDecodedRef = useRef<{ code: string; ts: number }>({ code: '', ts: 0 });

  const todayIso = new Date().toISOString().slice(0, 10);

  const formatNowTimeText = () =>
    new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  const handleDecodedPayload = (rawPayload: string) => {
    const clean = rawPayload.trim();
    if (!clean) return;
    const parsed = parseAndValidateStudentQrPayload(clean, schoolId || undefined);
    const timeText = formatNowTimeText();
    if (!parsed.valid || !parsed.permanentId) {
      setLastResult({
        ok: false,
        message: b(
          `অকার্যকর QR কোড (${parsed.reason ?? 'মেলেনি'})`,
          `Invalid QR code (${parsed.reason ?? 'Unrecognized'})`,
          lang
        ),
        mode: scanMode,
        timeText,
      });
      return;
    }

    const res = onRecordEntryExitScan({
      rawCode: parsed.permanentId,
      schoolId,
      mode: scanMode,
      dateIso: todayIso,
      timeText,
      allowedClasses,
    });

    setLastResult({
      ok: res.ok,
      message: lang === 'bn' ? res.messageBn : res.messageEn,
      student: res.student,
      parentNotified: res.parentNotified,
      mode: scanMode,
      timeText,
    });
  };

  const stopCamera = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        b(
          'এই ব্রাউজারে ক্যামেরা অ্যাক্সেস সমর্থিত নয়। ছবি আপলোড বা ম্যানুয়াল কোড ব্যবহার করুন।',
          'Camera access is unavailable in this browser. Use QR Image Upload or Manual ID input.',
          lang
        )
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const tick = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas && video.readyState >= 2) {
          canvas.width = video.videoWidth || 480;
          canvas.height = video.videoHeight || 360;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const decoded = jsQR(imgData.data, imgData.width, imgData.height);
            if (decoded?.data) {
              const now = Date.now();
              if (
                decoded.data !== lastDecodedRef.current.code ||
                now - lastDecodedRef.current.ts > 3500
              ) {
                lastDecodedRef.current = { code: decoded.data, ts: now };
                handleDecodedPayload(decoded.data);
              }
            }
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setCameraError(
        b(
          'ক্যামেরা চালু করা যায়নি বা অনুমতি প্রত্যাখ্যাত হয়েছে। QR ছবি আপলোড ব্যবহার করুন।',
          'Could not start camera or permission was denied. Please use QR image upload.',
          lang
        )
      );
      stopCamera();
    }
  };

  const handleUploadQrImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current ?? document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = jsQR(imageData.data, imageData.width, imageData.height);
        if (decoded?.data) {
          handleDecodedPayload(decoded.data);
        } else {
          setLastResult({
            ok: false,
            message: b(
              'আপলোড করা ছবিতে বৈধ QR কোড শনাক্ত করা যায়নি।',
              'No valid QR code was detected in the uploaded image.',
              lang
            ),
            mode: scanMode,
            timeText: formatNowTimeText(),
          });
        }
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const schoolStudents = students.filter((s) => !schoolId || s.schoolId === schoolId);
  const todayRecords = attendanceHistory.filter(
    (h) => (!schoolId || h.schoolId === schoolId) && h.dateIso === todayIso
  );

  return (
    <section
      data-testid="student-attendance-qr-panel"
      className="space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            {b('Student Attendance QR স্ক্যানার', 'Student Attendance QR Scanner', lang)}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {school?.nameBn || b('নির্বাচিত বিদ্যালয়', 'Selected School', lang)} ·{' '}
            {b(
              'শিক্ষার্থীর ডিজিটাল QR আইডি স্ক্যান করে তাৎক্ষণিক প্রবেশ/প্রস্থান হাজিরা এবং Parent নোটিফিকেশন সিঙ্ক করুন।',
              'Scan Student Digital QR ID for instant Entry/Exit attendance and deduplicated Parent alerts.',
              lang
            )}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            data-testid="qr-mode-entry-btn"
            onClick={() => setScanMode('entry')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              scanMode === 'entry'
                ? 'bg-emerald-700 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <DoorOpen className="w-3.5 h-3.5" />
            {b('প্রবেশ হাজিরা (Entry)', 'Entry Check-In', lang)}
          </button>
          <button
            type="button"
            data-testid="qr-mode-exit-btn"
            onClick={() => setScanMode('exit')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              scanMode === 'exit'
                ? 'bg-blue-700 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <DoorClosed className="w-3.5 h-3.5" />
            {b('স্কুল ত্যাগ (Exit)', 'Exit Check-Out', lang)}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {b('১. ক্যামেরা বা QR ছবি স্ক্যান', '1. Camera or QR Image Scan', lang)}
              </span>
              <div className="flex items-center gap-2">
                {!cameraActive ? (
                  <button
                    type="button"
                    onClick={() => void startCamera()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {b('ক্যামেরা চালু', 'Start Camera', lang)}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5" />
                    {b('ক্যামেরা বন্ধ', 'Stop Camera', lang)}
                  </button>
                )}

                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-50 text-xs font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  {b('QR ছবি আপলোড', 'Upload QR Image', lang)}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadQrImage}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {cameraError && (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
                {cameraError}
              </div>
            )}

            <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                muted
                playsInline
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />
              {!cameraActive && (
                <div className="text-center p-4 text-slate-300 text-xs space-y-1.5">
                  <QrCode className="w-8 h-8 mx-auto text-emerald-400 opacity-80" />
                  <div>
                    {b(
                      'লাইভ স্ক্যানের জন্য ক্যামেরা চালু করুন অথবা QR PNG আপলোড করুন।',
                      'Start camera for live QR scan or upload a Student Digital ID QR image.',
                      lang
                    )}
                  </div>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleDecodedPayload(manualInput);
              setManualInput('');
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2.5"
          >
            <label
              htmlFor="qr-manual-scanner-input"
              className="block text-xs font-bold text-slate-800 dark:text-slate-100"
            >
              {b(
                '২. বারকোড স্ক্যানার / Student ID বা QR টোকেন ইনপুট',
                '2. Scanner Gun / Student ID or QR Token Input',
                lang
              )}
            </label>
            <div className="flex gap-2">
              <input
                id="qr-manual-scanner-input"
                data-testid="qr-manual-scanner-input"
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder={b(
                  'STD-... অথবা PSMS-QR|... স্ক্যান/লিখুন',
                  'Scan or enter STD-... or PSMS-QR|...',
                  lang
                )}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                data-testid="qr-manual-submit-btn"
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-emerald-700 text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              >
                {scanMode === 'entry'
                  ? b('প্রবেশ রেকর্ড', 'Record Entry', lang)
                  : b('প্রস্থান রেকর্ড', 'Record Exit', lang)}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          {lastResult ? (
            <div
              data-testid="qr-scan-result-card"
              className={`rounded-xl border p-4 space-y-2 ${
                lastResult.ok
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50/80 dark:bg-rose-950/25 border-rose-200 dark:border-rose-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold">
                  {lastResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0" />
                  )}
                  <span className="text-slate-900 dark:text-white">{lastResult.message}</span>
                </div>
                <span className="font-mono text-[11px] tabular-nums text-slate-500">
                  {lastResult.timeText}
                </span>
              </div>
              {lastResult.student && (
                <div className="text-xs text-slate-700 dark:text-slate-200 pl-6 space-y-0.5">
                  <div className="font-semibold">
                    {lastResult.student.nameBn} ({lastResult.student.permanentId})
                  </div>
                  <div className="text-slate-500">
                    {lastResult.student.className} · {lastResult.student.section} · Roll #
                    {lastResult.student.roll}
                  </div>
                  {lastResult.parentNotified && (
                    <div className="text-emerald-700 dark:text-emerald-400 font-medium">
                      {b(
                        'Parent পোর্টালে তাৎক্ষণিক নোটিফিকেশন পাঠানো হয়েছে।',
                        'Instant Parent notification dispatched.',
                        lang
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-5 text-center text-xs text-slate-500">
              {b(
                'এখনো কোনো QR স্ক্যান করা হয়নি। স্ক্যান করলে এখানে ফলাফল দেখাবে।',
                'No QR code scanned yet. Scan results will appear here immediately.',
                lang
              )}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-700" />
                {b('আজকের QR হাজিরা লগ', "Today's QR Attendance Log", lang)} ({todayIso})
              </span>
              <span className="font-mono tabular-nums text-slate-500">
                {todayRecords.length}/{schoolStudents.length}
              </span>
            </div>
            {todayRecords.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                {b('আজ কোনো শিক্ষার্থী স্ক্যান রেকর্ড নেই।', 'No attendance records logged today.', lang)}
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {todayRecords.slice(0, 15).map((rec) => {
                  const st = students.find((s) => s.id === rec.studentId);
                  return (
                    <div
                      key={rec.id}
                      className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {st?.nameBn || rec.studentId}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {st ? `${st.className} · Roll #${st.roll}` : rec.studentId}
                        </div>
                      </div>
                      <div className="text-right font-mono text-[11px] tabular-nums shrink-0 text-slate-600 dark:text-slate-300">
                        <div>IN: {rec.checkInTime || '—'}</div>
                        <div>OUT: {rec.exitTime || '—'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
