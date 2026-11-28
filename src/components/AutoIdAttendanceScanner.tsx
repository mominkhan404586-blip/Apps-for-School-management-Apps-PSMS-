import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  BellRing,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  FileSpreadsheet,
  History,
  Pause,
  Play,
  Printer,
  QrCode,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Square,
  Timer,
  Upload,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import type {
  KioskScanEvent,
  Language,
  SchoolRecord,
  StudentAttendanceHistoryEntry,
  StudentRecord,
} from '../types';
import { b } from '../i18n/translations';
import {
  computeAttendanceSessionStats,
  formatRemainingDurationMmSs,
  generateTimedAttendanceQrSession,
  validateTimedAttendanceQrToken,
  type TimedAttendanceQrSession,
} from '../utils/attendanceScannerEngine';
import {
  buildAttendanceExportRows,
  generateAttendanceCsvContent,
  generateAttendanceExcelHtml,
} from '../utils/attendanceExportAndStickers';
import { buildAbsentStudentsSmsPayload } from '../utils/bulkSmsEngine';
import { resolveApiUrl } from '../utils/deploymentConfig';
import { AVATARS } from '../data/mockData';
import { QrStickerPrintModal } from './QrStickerPrintModal';

const maskMobile = (raw?: string): string => {
  if (!raw) return '—';
  const trimmed = raw.trim();
  if (trimmed.length <= 6) return '***';
  return trimmed.replace(/^(\d{3})\d+(\d{3,4})$/, '$1****$2');
};

export type ScannerRunState = 'stopped' | 'scanning' | 'paused';

export interface AutoIdAttendanceScannerProps {
  lang: Language;
  school?: SchoolRecord;
  schoolId: string;
  schoolNameBn: string;
  students: StudentRecord[];
  kioskScans: KioskScanEvent[];
  attendanceHistory: StudentAttendanceHistoryEntry[];
  canTakeAttendance?: boolean;
  allowedClasses?: string[];
  leaveCount?: number;
  onRecordAutoScan: (params: {
    rawCode: string;
    schoolId: string;
    isLate: boolean;
    source: 'auto_camera' | 'manual_teacher' | 'kiosk';
    dateIso: string;
    allowedClasses?: string[];
  }) => {
    status: 'recorded' | 'duplicate' | 'not_found' | 'wrong_school' | 'unauthorized_class';
    messageBn: string;
    messageEn: string;
    student?: StudentRecord;
    firstScanTime?: string;
    scanEvent?: KioskScanEvent;
  };
  onManualAttendanceMark: (
    student: StudentRecord,
    status: 'present' | 'late' | 'absent',
    dateIso: string
  ) => void;
  onNotifyAllAbsentGuardians: (
    absentStudents: StudentRecord[],
    schoolId: string,
    dateIso: string
  ) => void;
}

interface VerifiedScanCardState {
  status: 'recorded' | 'duplicate' | 'not_found' | 'wrong_school' | 'unauthorized_class';
  message: string;
  student?: StudentRecord;
  scanTime: string;
  firstScanTime?: string;
  attendanceState?: 'present' | 'late';
  rawCode: string;
}

export const AutoIdAttendanceScanner: React.FC<AutoIdAttendanceScannerProps> = ({
  lang,
  school,
  schoolId,
  schoolNameBn,
  students,
  kioskScans,
  attendanceHistory,
  canTakeAttendance = true,
  allowedClasses,
  leaveCount = 0,
  onRecordAutoScan,
  onManualAttendanceMark,
  onNotifyAllAbsentGuardians,
}) => {
  const todayIso = '2026-11-19';
  const [scannerState, setScannerState] = useState<ScannerRunState>('stopped');
  const [cameraStreamActive, setCameraStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanCodeInput, setScanCodeInput] = useState('');
  const [markAsLateMode, setMarkAsLateMode] = useState(false);
  const [autoQueueRunning, setAutoQueueRunning] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [attendanceCompleted, setAttendanceCompleted] = useState(false);
  const [absentNotifiedDone, setAbsentNotifiedDone] = useState(false);
  const [manualOverrides, setManualOverrides] = useState<Record<string, 'present' | 'late' | 'absent'>>({});
  const [lastVerifiedScan, setLastVerifiedScan] = useState<VerifiedScanCardState | null>(null);
  const [liveSessionScans, setLiveSessionScans] = useState<
    Array<{ id: string; nameBn: string; className: string; time: string; state: 'present' | 'late' }>
  >([]);
  const [sessionCounters, setSessionCounters] = useState({
    totalScans: 0,
    duplicateScans: 0,
    invalidScans: 0,
  });
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);
  const [exportClassFilter, setExportClassFilter] = useState<string>('All');
  const [exportStartDate, setExportStartDate] = useState<string>('2026-11-17');
  const [exportEndDate, setExportEndDate] = useState<string>(todayIso);
  const [qrStickersModalOpen, setQrStickersModalOpen] = useState(false);
  const [qrImageError, setQrImageError] = useState<string | null>(null);
  const [smsSendingAbsent, setSmsSendingAbsent] = useState(false);
  const [smsAbsentFeedback, setSmsAbsentFeedback] = useState<string | null>(null);

  // Time-limited Attendance QR Generator state
  const [timedQrPanelOpen, setTimedQrPanelOpen] = useState(false);
  const [timedQrClass, setTimedQrClass] = useState<string>(
    () => allowedClasses?.[0] ?? students.find((s) => s.schoolId === schoolId)?.className ?? 'Class 4'
  );
  const [timedQrTtlMinutes, setTimedQrTtlMinutes] = useState<number>(5);
  const [activeTimedQr, setActiveTimedQr] = useState<TimedAttendanceQrSession | null>(null);
  const [timedQrDataUrl, setTimedQrDataUrl] = useState<string>('');
  const [timedQrRemainingSec, setTimedQrRemainingSec] = useState<number>(0);
  const [revokedNonces, setRevokedNonces] = useState<string[]>([]);
  const [timedCheckInStudentId, setTimedCheckInStudentId] = useState<string>('');
  const [timedQrFeedback, setTimedQrFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const decodeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);
  const recentCodesRef = useRef<Record<string, number>>({});

  const scannerOpen = scannerState !== 'stopped';
  const isActivelyDecoding = scannerState === 'scanning';

  const schoolStudents = useMemo(() => {
    const base = students.filter((s) => s.schoolId === schoolId && s.status !== 'deactivated');
    if (allowedClasses && allowedClasses.length > 0) {
      return base.filter((s) => allowedClasses.includes(s.className));
    }
    return base;
  }, [students, schoolId, allowedClasses]);

  const classOptions = useMemo(() => {
    const set = new Set<string>(schoolStudents.map((s) => s.className));
    return ['All', ...Array.from(set)];
  }, [schoolStudents]);

  const filteredStudents = useMemo(
    () =>
      selectedClass === 'All'
        ? schoolStudents
        : schoolStudents.filter((s) => s.className === selectedClass),
    [schoolStudents, selectedClass]
  );

  const schoolScans = useMemo(
    () =>
      kioskScans.filter(
        (k) => (!k.schoolId || k.schoolId === schoolId) && (!k.dateIso || k.dateIso === todayIso)
      ),
    [kioskScans, schoolId, todayIso]
  );

  const stats = useMemo(
    () => computeAttendanceSessionStats(filteredStudents, schoolScans, todayIso, manualOverrides),
    [filteredStudents, schoolScans, todayIso, manualOverrides]
  );

  const combinedLiveList = useMemo(() => {
    if (liveSessionScans.length > 0) return liveSessionScans;
    return schoolScans.slice(0, 10).map((sc) => ({
      id: sc.id,
      nameBn: sc.studentName,
      className: sc.className,
      time: sc.scanTime,
      state: sc.attendanceState,
    }));
  }, [liveSessionScans, schoolScans]);

  const stopCameraTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraStreamActive(false);
  }, []);

  const handleStopScanning = useCallback(() => {
    stopCameraTracks();
    setAutoQueueRunning(false);
    setScannerState('stopped');
  }, [stopCameraTracks]);

  useEffect(() => {
    return () => {
      stopCameraTracks();
    };
  }, [stopCameraTracks]);

  const handleGenerateTimedQr = useCallback(
    (overrideTtl?: number, overrideClass?: string) => {
      if (!canTakeAttendance) return;
      const ttl = overrideTtl ?? timedQrTtlMinutes;
      const cls = overrideClass ?? timedQrClass;
      const session = generateTimedAttendanceQrSession({
        schoolId,
        teacherName: school?.headTeacher,
        className: cls,
        section: 'All',
        ttlMinutes: ttl,
      });
      setActiveTimedQr(session);
      setTimedQrRemainingSec(Math.max(0, Math.ceil((session.expiresAtMs - Date.now()) / 1000)));
      setTimedQrFeedback(null);
      setTimedQrPanelOpen(true);
    },
    [canTakeAttendance, school?.headTeacher, schoolId, timedQrClass, timedQrTtlMinutes]
  );

  useEffect(() => {
    if (!activeTimedQr) {
      setTimedQrDataUrl('');
      setTimedQrRemainingSec(0);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(activeTimedQr.token, {
      width: 240,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setTimedQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setTimedQrDataUrl('');
      });

    const updateRemaining = () => {
      const rem = Math.max(0, Math.ceil((activeTimedQr.expiresAtMs - Date.now()) / 1000));
      setTimedQrRemainingSec(rem);
    };
    updateRemaining();
    const id = window.setInterval(updateRemaining, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [activeTimedQr]);

  const handleStartScanning = async () => {
    if (!canTakeAttendance) return;
    setScannerState('scanning');
    setCameraError(null);
    setTimeout(() => inputRef.current?.focus(), 60);

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        streamRef.current = stream;
        setCameraStreamActive(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            void videoRef.current.play();
          }
        }, 40);
      } catch {
        setCameraStreamActive(false);
        setCameraError(
          b(
            'লাইভ ক্যামেরা পাওয়া যায়নি — তবে USB/QR বারকোড স্ক্যানার ইনপুট ও ধারাবাহিক কুইক কার্ড স্ক্যান চালু আছে।',
            'Camera unavailable — continuous QR input & card scanner remain active.',
            lang
          )
        );
      }
    }
  };

  const handlePauseResume = () => {
    if (scannerState === 'scanning') {
      setScannerState('paused');
      setAutoQueueRunning(false);
    } else if (scannerState === 'paused') {
      setScannerState('scanning');
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  };

  const triggerScanWithCode = useCallback(
    (code: string, source: 'auto_camera' | 'kiosk' = 'auto_camera') => {
      const trimmed = code.trim();
      if (!trimmed || !isActivelyDecoding) return;

      const nowTime = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const timedCheck = validateTimedAttendanceQrToken(trimmed, {
        expectedSchoolId: schoolId,
        revokedNonces,
      });

      if (timedCheck.isTimedAttendanceQr) {
        if (!timedCheck.valid) {
          setSessionCounters((prev) => ({
            ...prev,
            totalScans: prev.totalScans + 1,
            invalidScans: prev.invalidScans + 1,
          }));
          setLastVerifiedScan({
            status: timedCheck.wrongSchool ? 'wrong_school' : 'not_found',
            message: b(timedCheck.messageBn, timedCheck.messageEn, lang),
            scanTime: nowTime,
            rawCode: trimmed,
          });
          setScanCodeInput('');
          inputRef.current?.focus();
          return;
        }

        const targetStudent =
          schoolStudents.find((s) => s.id === timedCheckInStudentId) ??
          schoolStudents.find(
            (s) =>
              (!timedCheck.payload?.className ||
                timedCheck.payload.className === 'All' ||
                s.className === timedCheck.payload.className) &&
              !schoolScans.some((sc) => sc.studentId === s.id)
          ) ??
          schoolStudents[0];

        if (targetStudent) {
          const studentScanRes = onRecordAutoScan({
            rawCode: targetStudent.qrPayload || targetStudent.permanentId,
            schoolId,
            isLate: markAsLateMode,
            source,
            dateIso: todayIso,
            allowedClasses,
          });
          setSessionCounters((prev) => ({
            totalScans: prev.totalScans + 1,
            duplicateScans:
              studentScanRes.status === 'duplicate'
                ? prev.duplicateScans + 1
                : prev.duplicateScans,
            invalidScans:
              studentScanRes.status === 'not_found' ||
              studentScanRes.status === 'wrong_school' ||
              studentScanRes.status === 'unauthorized_class'
                ? prev.invalidScans + 1
                : prev.invalidScans,
          }));
          setLastVerifiedScan({
            status: studentScanRes.status,
            message: b(studentScanRes.messageBn, studentScanRes.messageEn, lang),
            student: studentScanRes.student,
            scanTime: studentScanRes.scanEvent?.scanTime ?? nowTime,
            firstScanTime: studentScanRes.firstScanTime,
            attendanceState: studentScanRes.scanEvent?.attendanceState,
            rawCode: trimmed,
          });
          if (studentScanRes.status === 'recorded' && studentScanRes.student) {
            setLiveSessionScans((prev) => [
              {
                id: studentScanRes.scanEvent?.id ?? `live-${Date.now()}`,
                nameBn: studentScanRes.student!.nameBn,
                className: studentScanRes.student!.className,
                time: studentScanRes.scanEvent?.scanTime ?? nowTime,
                state:
                  studentScanRes.scanEvent?.attendanceState ??
                  (markAsLateMode ? 'late' : 'present'),
              },
              ...prev,
            ]);
          }
          setTimedQrFeedback({
            ok: studentScanRes.status === 'recorded',
            text: `${b(timedCheck.messageBn, timedCheck.messageEn, lang)} · ${b(studentScanRes.messageBn, studentScanRes.messageEn, lang)}`,
          });
        }
        setScanCodeInput('');
        inputRef.current?.focus();
        return;
      }

      const res = onRecordAutoScan({
        rawCode: trimmed,
        schoolId,
        isLate: markAsLateMode,
        source,
        dateIso: todayIso,
        allowedClasses,
      });

      setSessionCounters((prev) => ({
        totalScans: prev.totalScans + 1,
        duplicateScans: res.status === 'duplicate' ? prev.duplicateScans + 1 : prev.duplicateScans,
        invalidScans:
          res.status === 'not_found' || res.status === 'wrong_school' || res.status === 'unauthorized_class'
            ? prev.invalidScans + 1
            : prev.invalidScans,
      }));

      setLastVerifiedScan({
        status: res.status,
        message: b(res.messageBn, res.messageEn, lang),
        student: res.student,
        scanTime: res.scanEvent?.scanTime ?? nowTime,
        firstScanTime: res.firstScanTime,
        attendanceState: res.scanEvent?.attendanceState,
        rawCode: trimmed,
      });

      if (res.status === 'recorded' && res.student) {
        setLiveSessionScans((prev) => [
          {
            id: res.scanEvent?.id ?? `live-${Date.now()}`,
            nameBn: res.student!.nameBn,
            className: res.student!.className,
            time: res.scanEvent?.scanTime ?? nowTime,
            state: res.scanEvent?.attendanceState ?? (markAsLateMode ? 'late' : 'present'),
          },
          ...prev,
        ]);
      }

      setScanCodeInput('');
      inputRef.current?.focus();
    },
    [
      allowedClasses,
      isActivelyDecoding,
      lang,
      markAsLateMode,
      onRecordAutoScan,
      revokedNonces,
      schoolId,
      schoolScans,
      schoolStudents,
      timedCheckInStudentId,
      todayIso,
    ]
  );

  // Real continuous QR code decoding loop over camera frames via jsQR + BarcodeDetector
  useEffect(() => {
    if (!isActivelyDecoding || !cameraStreamActive) return;

    let cancelled = false;
    let barcodeDetector: { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>> } | null = null;
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const BD = (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => typeof barcodeDetector }).BarcodeDetector;
        barcodeDetector = new BD({ formats: ['qr_code', 'code_128', 'code_39'] });
      } catch {
        barcodeDetector = null;
      }
    }

    const tickInterval = window.setInterval(async () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;

      let canvas = decodeCanvasRef.current;
      if (!canvas) {
        canvas = document.createElement('canvas');
        decodeCanvasRef.current = canvas;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      let decodedValue = '';
      if (barcodeDetector) {
        try {
          const hits = await barcodeDetector.detect(canvas);
          if (hits.length > 0 && hits[0].rawValue) {
            decodedValue = hits[0].rawValue;
          }
        } catch {
          // Fall back to jsQR below
        }
      }

      if (!decodedValue) {
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrResult = jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: 'dontInvert',
          });
          if (qrResult?.data) {
            decodedValue = qrResult.data;
          }
        } catch {
          // Ignore canvas frame decode failure
        }
      }

      if (decodedValue) {
        const now = Date.now();
        const lastSeen = recentCodesRef.current[decodedValue] ?? 0;
        if (now - lastSeen > 1500) {
          recentCodesRef.current[decodedValue] = now;
          triggerScanWithCode(decodedValue, 'auto_camera');
        }
      }
    }, 240);

    return () => {
      cancelled = true;
      window.clearInterval(tickInterval);
    };
  }, [isActivelyDecoding, cameraStreamActive, triggerScanWithCode]);

  // USB Barcode/QR wedge scanner auto-submit when ID pattern completes
  const handleBarcodeInputChange = (val: string) => {
    setScanCodeInput(val);
    if (!isActivelyDecoding) return;
    const trimmed = val.trim();
    const looksComplete =
      schoolStudents.some(
        (s) =>
          s.permanentId.toLowerCase() === trimmed.toLowerCase() ||
          s.guardianLinkCode.toLowerCase() === trimmed.toLowerCase() ||
          (s.qrPayload && s.qrPayload.toLowerCase() === trimmed.toLowerCase())
      ) || /^PSMS-QR\|[^|]+\|[^|]+\|/i.test(trimmed);

    if (looksComplete) {
      triggerScanWithCode(trimmed, 'auto_camera');
    }
  };

  const handleDecodeQrImageFile = async (files: FileList | null) => {
    if (!files || files.length === 0 || !isActivelyDecoding) return;
    setQrImageError(null);
    const file = files[0];
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(file);
      });
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new window.Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Invalid image file'));
        el.src = dataUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 320;
      canvas.height = img.naturalHeight || 320;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });
      if (!decoded?.data) {
        setQrImageError(
          b(
            'ছবিতে কোনো বৈধ QR কোড শনাক্ত করা যায়নি। স্পষ্ট QR PNG আপলোড করুন।',
            'Could not detect a valid QR code in this image. Please upload a clear student QR PNG.',
            lang
          )
        );
        return;
      }
      triggerScanWithCode(decoded.data, 'auto_camera');
    } catch {
      setQrImageError(b('QR ছবি ডিকোড করতে সমস্যা হয়েছে।', 'Failed to decode uploaded QR image.', lang));
    } finally {
      if (qrFileInputRef.current) qrFileInputRef.current.value = '';
    }
  };

  const handleSendAbsentBulkSms = async () => {
    if (stats.absentStudents.length === 0 || smsSendingAbsent) return;
    setSmsSendingAbsent(true);
    setSmsAbsentFeedback(null);
    try {
      const { recipients, defaultMessage } = buildAbsentStudentsSmsPayload({
        absentStudents: stats.absentStudents,
        schoolName: schoolNameBn,
        dateIso: todayIso,
        lang,
      });
      const resp = await fetch(resolveApiUrl('/api/sms/send-bulk'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          category: 'absence_alert',
          sentByRole: 'teacher',
          sentByName: school?.headTeacher ?? 'Class Teacher',
          message: defaultMessage,
          targetsSummary: `${stats.absentStudents.length} Absent Student Guardians (${todayIso})`,
          recipients,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data?.ok) {
        onNotifyAllAbsentGuardians(stats.absentStudents, schoolId, todayIso);
        setAbsentNotifiedDone(true);
        setSmsAbsentFeedback(
          b(
            `${data.log.deliveredCount}/${data.log.recipientCount} জন অভিভাবকের মোবাইলে Bulk SMS (${data.provider}) পাঠানো হয়েছে।`,
            `Sent absence Bulk SMS to ${data.log.deliveredCount}/${data.log.recipientCount} guardian(s) via ${data.provider}.`,
            lang
          )
        );
      } else {
        setSmsAbsentFeedback(data?.error || b('Bulk SMS পাঠানো যায়নি।', 'Bulk SMS failed.', lang));
      }
    } catch {
      setSmsAbsentFeedback(b('SMS সার্ভারের সাথে সংযোগ পাওয়া যায়নি।', 'SMS endpoint unreachable.', lang));
    } finally {
      setSmsSendingAbsent(false);
    }
  };

  // Continuous Auto-Queue Demo
  useEffect(() => {
    if (!isActivelyDecoding || !autoQueueRunning) return;
    const timer = window.setInterval(() => {
      const nextUnscanned = filteredStudents.find(
        (stu) => !schoolScans.some((sc) => sc.studentId === stu.id)
      );
      if (!nextUnscanned) {
        setAutoQueueRunning(false);
        return;
      }
      triggerScanWithCode(nextUnscanned.qrPayload || nextUnscanned.permanentId, 'auto_camera');
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isActivelyDecoding, autoQueueRunning, filteredStudents, schoolScans, triggerScanWithCode]);

  const handleManualMark = (student: StudentRecord, status: 'present' | 'late' | 'absent') => {
    setManualOverrides((prev) => ({ ...prev, [student.id]: status }));
    onManualAttendanceMark(student, status, todayIso);
  };

  const selectedHistoryStudent = schoolStudents.find((s) => s.id === historyStudentId);
  const selectedStudentHistory = useMemo(
    () =>
      attendanceHistory
        .filter((h) => h.studentId === historyStudentId)
        .sort((a, b) => (a.dateIso < b.dateIso ? 1 : -1)),
    [attendanceHistory, historyStudentId]
  );

  const exportRows = useMemo(
    () =>
      buildAttendanceExportRows({
        schoolId,
        schoolNameBn,
        students: schoolStudents,
        kioskScans,
        attendanceHistory,
        classFilter: exportClassFilter,
        startDateIso: exportStartDate,
        endDateIso: exportEndDate,
        todayIso,
        manualOverrides,
      }),
    [
      schoolId,
      schoolNameBn,
      schoolStudents,
      kioskScans,
      attendanceHistory,
      exportClassFilter,
      exportStartDate,
      exportEndDate,
      todayIso,
      manualOverrides,
    ]
  );

  const handleExportAttendanceCsv = () => {
    const csv = generateAttendanceCsvContent(exportRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${schoolId}-${exportClassFilter === 'All' ? 'all' : exportClassFilter.replace(/\s+/g, '_')}-${exportStartDate}_to_${exportEndDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAttendanceExcel = () => {
    const xlsHtml = generateAttendanceExcelHtml({
      schoolNameBn,
      schoolId,
      classFilter: exportClassFilter,
      startDateIso: exportStartDate,
      endDateIso: exportEndDate,
      rows: exportRows,
    });
    const blob = new Blob([xlsHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${schoolId}-${exportClassFilter === 'All' ? 'all' : exportClassFilter.replace(/\s+/g, '_')}-${exportStartDate}_to_${exportEndDate}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Header + Breadcrumb + Continuous Lifecycle Buttons */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            <span>Attendance</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Daily Attendance</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-bold">QR Scanner</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            {b('ধারাবাহিক QR Code উপস্থিতি স্ক্যানার', 'Continuous QR Code Attendance Scanner', lang)}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {schoolNameBn} · {b('তারিখ:', 'Date:', lang)} <span className="font-mono font-semibold">{todayIso}</span>
            {allowedClasses && allowedClasses.length > 0 && (
              <span className="ml-2 text-blue-700 dark:text-blue-400 font-semibold">
                · নির্ধারিত শ্রেণি: {allowedClasses.join(', ')}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label={b('শ্রেণি নির্বাচন', 'Filter class', lang)}
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setAttendanceCompleted(false);
              setAbsentNotifiedDone(false);
            }}
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold cursor-pointer"
          >
            {classOptions.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? b('সকল শ্রেণি', 'All Classes', lang) : c}
              </option>
            ))}
          </select>

          <button
            type="button"
            data-testid="generate-attendance-qr-btn"
            disabled={!canTakeAttendance}
            onClick={() => {
              if (!timedQrPanelOpen) {
                if (!activeTimedQr) {
                  handleGenerateTimedQr();
                } else {
                  setTimedQrPanelOpen(true);
                }
              } else {
                setTimedQrPanelOpen(false);
              }
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-blue-600/40 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 text-blue-800 dark:text-blue-200 font-bold cursor-pointer transition-colors"
          >
            <Timer className="w-3.5 h-3.5" />
            {b('Generate QR for Attendance', 'Generate QR for Attendance', lang)}
          </button>

          <button
            type="button"
            data-testid="open-qr-stickers-btn"
            onClick={() => setQrStickersModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-emerald-600/40 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-bold cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            {b('QR স্টিকার প্রিন্ট', 'Print QR Stickers', lang)}
          </button>

          {!scannerOpen ? (
            <button
              type="button"
              data-testid="qr-start-scanning-btn"
              disabled={!canTakeAttendance}
              onClick={handleStartScanning}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 disabled:cursor-not-allowed shadow-sm cursor-pointer transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Scanning
            </button>
          ) : (
            <>
              <button
                type="button"
                data-testid="qr-pause-scanning-btn"
                onClick={handlePauseResume}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-white shadow-sm cursor-pointer transition-colors ${
                  scannerState === 'paused'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {scannerState === 'paused' ? (
                  <>
                    <Play className="w-4 h-4" />
                    Resume Scanning
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4" />
                    Pause Scanning
                  </>
                )}
              </button>
              <button
                type="button"
                data-testid="qr-stop-scanning-btn"
                onClick={handleStopScanning}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm cursor-pointer transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop Scanning
              </button>
            </>
          )}
        </div>
      </div>

      {!canTakeAttendance && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {b(
              'এই বিদ্যালয়ে আপনার হাজিরা গ্রহণের অনুমতি বর্তমানে সীমিত করা হয়েছে।',
              'Attendance taking permission is currently restricted for your account at this school.',
              lang
            )}
          </span>
        </div>
      )}

      {/* Time-Limited Teacher Attendance QR Generator Card */}
      {timedQrPanelOpen && (
        <div
          data-testid="timed-attendance-qr-panel"
          className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-2xl p-5 space-y-4 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Timer className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                {b('সময়সীমিত ক্লাস উপস্থিতি QR কোড (Time-Limited Attendance QR)', 'Time-Limited Attendance QR Generator', lang)}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {b(
                  'শিক্ষার্থীরা নির্ধারিত সময়ের মধ্যে এই QR স্ক্যান করে উপস্থিতি নিশ্চিত করতে পারবে। মেয়াদ শেষে কোডটি স্বয়ংক্রিয়ভাবে অকার্যকর হবে।',
                  'Students scan this time-limited QR before expiry to verify attendance through the scanner engine.',
                  lang
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTimedQrPanelOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
            >
              {b('বন্ধ করুন', 'Close', lang)}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5 items-start">
            {/* QR Visual + Live Countdown */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 flex flex-col items-center text-center space-y-2.5">
              {timedQrDataUrl ? (
                <img
                  src={timedQrDataUrl}
                  alt="Time-Limited Attendance QR Code"
                  data-testid="generated-attendance-qr-img"
                  className={`w-48 h-48 rounded-lg bg-white p-2 border border-slate-200 ${
                    timedQrRemainingSec === 0 || (activeTimedQr && revokedNonces.includes(activeTimedQr.nonce))
                      ? 'opacity-35 grayscale'
                      : ''
                  }`}
                />
              ) : (
                <div className="w-48 h-48 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                  QR...
                </div>
              )}

              {activeTimedQr && (
                <div
                  data-testid="timed-qr-countdown"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold ${
                    revokedNonces.includes(activeTimedQr.nonce)
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      : timedQrRemainingSec > 0
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {revokedNonces.includes(activeTimedQr.nonce)
                    ? b('বাতিলকৃত (REVOKED)', 'REVOKED', lang)
                    : timedQrRemainingSec > 0
                      ? `${b('সক্রিয়:', 'Expires in', lang)} ${formatRemainingDurationMmSs(timedQrRemainingSec)}`
                      : b('মেয়াদোত্তীর্ণ (EXPIRED)', 'EXPIRED', lang)}
                </div>
              )}
            </div>

            {/* Configuration + Scanner Check-In Integration */}
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {b('শ্রেণি নির্বাচন', 'Class', lang)}
                  </label>
                  <select
                    aria-label={b('QR শ্রেণি', 'QR Class', lang)}
                    value={timedQrClass}
                    onChange={(e) => {
                      const cls = e.target.value;
                      setTimedQrClass(cls);
                      handleGenerateTimedQr(timedQrTtlMinutes, cls);
                    }}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold cursor-pointer"
                  >
                    {classOptions.map((c) => (
                      <option key={c} value={c}>
                        {c === 'All' ? b('সকল শ্রেণি', 'All Classes', lang) : c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {b('মেয়াদ (Expiry TTL)', 'Valid Duration', lang)}
                  </label>
                  <select
                    aria-label={b('QR মেয়াদ', 'QR Duration', lang)}
                    data-testid="timed-qr-ttl-select"
                    value={timedQrTtlMinutes}
                    onChange={(e) => {
                      const nextTtl = Number(e.target.value);
                      setTimedQrTtlMinutes(nextTtl);
                      handleGenerateTimedQr(nextTtl, timedQrClass);
                    }}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold cursor-pointer"
                  >
                    <option value={2}>2 {b('মিনিট', 'Minutes', lang)}</option>
                    <option value={5}>5 {b('মিনিট', 'Minutes', lang)}</option>
                    <option value={10}>10 {b('মিনিট', 'Minutes', lang)}</option>
                    <option value={15}>15 {b('মিনিট', 'Minutes', lang)}</option>
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    data-testid="refresh-timed-qr-btn"
                    onClick={() => handleGenerateTimedQr()}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {b('নতুন QR', 'Refresh QR', lang)}
                  </button>
                  {activeTimedQr && !revokedNonces.includes(activeTimedQr.nonce) && (
                    <button
                      type="button"
                      data-testid="revoke-timed-qr-btn"
                      onClick={() => setRevokedNonces((prev) => [...prev, activeTimedQr.nonce])}
                      className="inline-flex items-center justify-center gap-1 h-9 px-3 rounded-lg border border-rose-300 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      {b('বাতিল', 'Revoke', lang)}
                    </button>
                  )}
                </div>
              </div>

              {activeTimedQr && (
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 font-mono text-[11px] break-all text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-slate-900 dark:text-white">Token: </span>
                  <span data-testid="timed-qr-token-text">{activeTimedQr.token}</span>
                </div>
              )}

              {/* Direct Student Check-In Verification via Active Time-Limited QR */}
              <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  {b('শিক্ষার্থী QR চেক-ইন যাচাই (Scanner Engine Integration)', 'Verify Student Check-In Against Active QR', lang)}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label={b('শিক্ষার্থী নির্বাচন', 'Select student for timed QR check-in', lang)}
                    value={timedCheckInStudentId || schoolStudents[0]?.id || ''}
                    onChange={(e) => setTimedCheckInStudentId(e.target.value)}
                    className="flex-1 min-w-[180px] h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    {schoolStudents
                      .filter((s) => timedQrClass === 'All' || s.className === timedQrClass)
                      .map((stu) => (
                        <option key={stu.id} value={stu.id}>
                          Roll {stu.roll} · {stu.nameBn} ({stu.className})
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    data-testid="verify-timed-qr-checkin-btn"
                    disabled={!activeTimedQr}
                    onClick={() => {
                      if (!activeTimedQr) return;
                      const check = validateTimedAttendanceQrToken(activeTimedQr.token, {
                        expectedSchoolId: schoolId,
                        revokedNonces,
                      });
                      if (!check.valid) {
                        setSessionCounters((prev) => ({
                          ...prev,
                          totalScans: prev.totalScans + 1,
                          invalidScans: prev.invalidScans + 1,
                        }));
                        setTimedQrFeedback({
                          ok: false,
                          text: b(check.messageBn, check.messageEn, lang),
                        });
                        return;
                      }
                      const scopedPool = schoolStudents.filter(
                        (s) => timedQrClass === 'All' || s.className === timedQrClass
                      );
                      const chosen =
                        scopedPool.find((s) => s.id === timedCheckInStudentId) ?? scopedPool[0];
                      if (!chosen) return;
                      const res = onRecordAutoScan({
                        rawCode: chosen.qrPayload || chosen.permanentId,
                        schoolId,
                        isLate: markAsLateMode,
                        source: 'auto_camera',
                        dateIso: todayIso,
                        allowedClasses,
                      });
                      setSessionCounters((prev) => ({
                        totalScans: prev.totalScans + 1,
                        duplicateScans:
                          res.status === 'duplicate' ? prev.duplicateScans + 1 : prev.duplicateScans,
                        invalidScans:
                          res.status === 'not_found' ||
                          res.status === 'wrong_school' ||
                          res.status === 'unauthorized_class'
                            ? prev.invalidScans + 1
                            : prev.invalidScans,
                      }));
                      setTimedQrFeedback({
                        ok: res.status === 'recorded',
                        text: `${b(check.messageBn, check.messageEn, lang)} · ${b(res.messageBn, res.messageEn, lang)}`,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    {b('উপস্থিতি রেকর্ড করুন', 'Verify & Mark Present', lang)}
                  </button>
                </div>
                {timedQrFeedback && (
                  <p
                    data-testid="timed-qr-feedback"
                    className={`text-[11px] font-semibold ${
                      timedQrFeedback.ok
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {timedQrFeedback.text}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Summary Panel (8 Required Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-500">Total Students</div>
          <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">{stats.total}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-500">Present</div>
          <div className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5" data-testid="qr-stat-present">
            {stats.present}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-500">Late</div>
          <div className="text-xl font-bold tabular-nums text-amber-600 mt-0.5">{stats.late}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-500">Absent</div>
          <div className="text-xl font-bold tabular-nums text-red-600 dark:text-red-400 mt-0.5">{stats.absent}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-500">Leave</div>
          <div className="text-xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400 mt-0.5">{leaveCount}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-500">Total Scans</div>
          <div className="text-xl font-bold tabular-nums text-blue-700 dark:text-blue-400 mt-0.5" data-testid="qr-stat-total-scans">
            {sessionCounters.totalScans || stats.scannedCount}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-500">Duplicate Scans</div>
          <div className="text-xl font-bold tabular-nums text-amber-700 dark:text-amber-400 mt-0.5" data-testid="qr-stat-duplicate-scans">
            {sessionCounters.duplicateScans}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-500">Invalid Scans</div>
          <div className="text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400 mt-0.5" data-testid="qr-stat-invalid-scans">
            {sessionCounters.invalidScans}
          </div>
        </div>
      </div>

      {/* Active Continuous Scanner Console */}
      {scannerOpen && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-4">
          {/* Left: Live Camera / Frame Decoder + Fallback Input + Verification Card */}
          <div className="bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Camera Preview */}
              <div className="sm:w-64 shrink-0 rounded-xl bg-slate-950 text-white overflow-hidden border border-slate-800 flex flex-col items-center justify-center min-h-44 relative p-3 text-center">
                {cameraStreamActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-44 object-cover rounded-lg ${scannerState === 'paused' ? 'opacity-45 grayscale' : ''}`}
                  />
                ) : (
                  <div className="space-y-2">
                    <Camera className={`w-8 h-8 mx-auto ${scannerState === 'paused' ? 'text-amber-400' : 'text-emerald-400'}`} />
                    <div className="font-bold text-emerald-300">
                      {scannerState === 'paused' ? 'Scanner Paused' : 'Continuous QR Ready'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {cameraError || b('ক্যামেরা/QR স্ক্যানার সংযুক্ত', 'QR scanner active', lang)}
                    </div>
                  </div>
                )}
                <span
                  className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    scannerState === 'paused' ? 'bg-amber-600' : 'bg-emerald-600'
                  }`}
                >
                  {scannerState === 'paused' ? 'PAUSED' : 'LIVE QR SCAN'}
                </span>
              </div>

              {/* Continuous Input + Options */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {b('স্বয়ংক্রিয় ধারাবাহিক QR / আইডি স্ক্যান', 'Continuous QR / USB Wedge Scanner', lang)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={markAsLateMode}
                        onChange={(e) => setMarkAsLateMode(e.target.checked)}
                        className="accent-amber-600"
                      />
                      {b('Late Arrival', 'Late Arrival', lang)}
                    </label>
                    <button
                      type="button"
                      disabled={scannerState === 'paused'}
                      onClick={() => setAutoQueueRunning((prev) => !prev)}
                      className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer disabled:opacity-50 ${
                        autoQueueRunning
                          ? 'bg-amber-600 text-white'
                          : 'bg-blue-700 hover:bg-blue-800 text-white'
                      }`}
                    >
                      {autoQueueRunning ? 'অটো-কিউ থামান' : 'অটো-কিউ চালু'}
                    </button>
                  </div>
                </div>

                {/* Fallback USB / Manual ID Entry */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    triggerScanWithCode(scanCodeInput, 'auto_camera');
                  }}
                  className="flex flex-wrap items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    data-testid="qr-scanner-code-input"
                    type="text"
                    disabled={scannerState === 'paused'}
                    value={scanCodeInput}
                    onChange={(e) => handleBarcodeInputChange(e.target.value)}
                    placeholder={b(
                      'QR কোড / Student ID লিখুন (STD-2026-...)',
                      'Scan QR / Student ID (STD-2026-...)',
                      lang
                    )}
                    className="flex-1 min-w-[170px] w-full sm:w-auto h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono outline-none disabled:opacity-50"
                  />
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="submit"
                      data-testid="qr-scanner-submit-btn"
                      disabled={scannerState === 'paused'}
                      className="px-4 h-10 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      {b('স্ক্যান রেকর্ড', 'Record Scan', lang)}
                    </button>
                    <input
                      ref={qrFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      data-testid="qr-image-upload-input"
                      className="hidden"
                      onChange={(e) => void handleDecodeQrImageFile(e.target.files)}
                    />
                    <button
                      type="button"
                      data-testid="qr-image-upload-btn"
                      disabled={scannerState === 'paused'}
                      onClick={() => qrFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3.5 h-10 rounded-xl border border-blue-600/40 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-300 font-semibold cursor-pointer shrink-0 whitespace-nowrap disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {b('QR ছবি আপলোড', 'Scan QR Image', lang)}
                    </button>
                  </div>
                </form>
                {qrImageError && (
                  <p role="alert" className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                    {qrImageError}
                  </p>
                )}

                {/* Quick Card Tap (1-click student QR card scan) */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-500">
                    {b('কুইক স্টুডেন্ট QR কার্ড (ট্যাপ করলে ধারাবাহিকভাবে স্ক্যান হবে):', 'Quick Student QR Cards (Tap continuously):', lang)}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {filteredStudents.slice(0, 6).map((stu) => {
                      const scanned = schoolScans.some((k) => k.studentId === stu.id);
                      return (
                        <button
                          key={stu.id}
                          type="button"
                          disabled={scannerState === 'paused'}
                          data-testid={`quick-qr-tap-${stu.id}`}
                          onClick={() => triggerScanWithCode(stu.qrPayload || stu.permanentId, 'auto_camera')}
                          className={`px-2.5 py-1.5 rounded-lg border text-left cursor-pointer transition-colors disabled:opacity-50 ${
                            scanned
                              ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                          }`}
                        >
                          <div className="font-bold">{stu.nameBn}</div>
                          <div className="font-mono text-[10px] opacity-75">
                            {stu.permanentId} · Roll {stu.roll} {scanned ? '✓' : ''}
                          </div>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      disabled={scannerState === 'paused'}
                      data-testid="quick-qr-tap-invalid"
                      onClick={() => triggerScanWithCode('INVALID-FAKE-QR-404', 'auto_camera')}
                      className="px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-semibold text-left cursor-pointer disabled:opacity-50"
                    >
                      অবৈধ QR টেস্ট
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Last Scanned Student Verification Card */}
            {lastVerifiedScan && (
              <div
                data-testid="last-scanned-verification-card"
                className={`rounded-xl border p-4 transition-all ${
                  lastVerifiedScan.status === 'recorded'
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700'
                    : lastVerifiedScan.status === 'duplicate'
                      ? 'bg-amber-50/85 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700'
                      : 'bg-rose-50/85 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    {lastVerifiedScan.status === 'recorded' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : lastVerifiedScan.status === 'duplicate' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                    )}
                    Last Scanned Verification Card
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      lastVerifiedScan.status === 'recorded'
                        ? 'bg-emerald-600 text-white'
                        : lastVerifiedScan.status === 'duplicate'
                          ? 'bg-amber-600 text-white'
                          : 'bg-rose-600 text-white'
                    }`}
                  >
                    {lastVerifiedScan.status === 'recorded'
                      ? lastVerifiedScan.attendanceState === 'late'
                        ? 'Late Arrival'
                        : '✓ Present'
                      : lastVerifiedScan.status === 'duplicate'
                        ? `✓ Already Marked (${lastVerifiedScan.firstScanTime ?? 'Earlier'})`
                        : lastVerifiedScan.status === 'unauthorized_class'
                          ? 'Unauthorized Class'
                          : 'Invalid Student QR Code'}
                  </span>
                </div>

                {lastVerifiedScan.student ? (
                  <div className="flex items-center gap-3.5">
                    <img
                      src={lastVerifiedScan.student.photoUrl || AVATARS.studentRahim}
                      alt={lastVerifiedScan.student.nameEn}
                      className="w-14 h-14 rounded-xl object-cover border-2 border-white dark:border-slate-700 shadow-sm shrink-0"
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 flex-1">
                      <div className="col-span-2">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {lastVerifiedScan.student.nameBn}
                        </div>
                        <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          ID: {lastVerifiedScan.student.permanentId}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">শ্রেণি / শাখা / রোল</div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {lastVerifiedScan.student.className} ({lastVerifiedScan.student.section}) · #{lastVerifiedScan.student.roll}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">তারিখ ও স্ক্যান সময়</div>
                        <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {todayIso} · {lastVerifiedScan.scanTime}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                    {lastVerifiedScan.message}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Live Scanned List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Live Scanned List
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                {combinedLiveList.length} টি রেকর্ড
              </span>
            </div>
            <div data-testid="live-scanned-list" className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
              {combinedLiveList.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  এখনও কোনো QR কার্ড স্ক্যান করা হয়নি।
                </div>
              ) : (
                combinedLiveList.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60"
                  >
                    <div className="font-semibold text-slate-800 dark:text-slate-100">
                      <span className="text-emerald-600 mr-1">✓</span>
                      {entry.nameBn} — <span className="text-slate-500 dark:text-slate-400">{entry.className}</span> —{' '}
                      <span className="font-mono text-slate-600 dark:text-slate-300">{entry.time}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        entry.state === 'late'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      }`}
                    >
                      {entry.state === 'late' ? 'Late' : 'Present'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attendance Roster + Manual Override Fallback */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              {b('দৈনিক হাজিরা তালিকা ও ম্যানুয়াল ব্যাকআপ (Fallback)', 'Daily Roster & Manual Attendance Fallback', lang)}
            </h2>
            <p className="text-[11px] text-slate-500">
              {b(
                'কোনো শিক্ষার্থী আইডি কার্ড আনতে ভুলে গেলে এখান থেকে সরাসরি Present / Late / Absent নির্ধারণ করুন।',
                'Fallback for students without an ID card: mark Present, Late, or Absent manually.',
                lang
              )}
            </p>
          </div>
          <button
            type="button"
            disabled={!canTakeAttendance}
            onClick={() => {
              if (!canTakeAttendance) return;
              setAttendanceCompleted(true);
              setAbsentNotifiedDone(false);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold cursor-pointer"
          >
            <ClipboardCheck className="w-4 h-4" />
            {b('উপস্থিতি সম্পন্ন করুন (Complete Attendance)', 'Complete Attendance', lang)}
          </button>
        </div>

        {/* Bulk CSV / Excel Attendance Export Bar */}
        <div
          data-testid="daily-attendance-export-bar"
          className="px-5 py-3 bg-slate-50/90 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {b('রিপোর্ট এক্সপোর্ট:', 'Export Report:', lang)}
            </span>
            <select
              aria-label={b('এক্সপোর্ট শ্রেণি', 'Export Class Filter', lang)}
              data-testid="export-class-select"
              value={exportClassFilter}
              onChange={(e) => setExportClassFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold cursor-pointer"
            >
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? b('সকল শ্রেণি (All)', 'All Classes', lang) : c}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <span>{b('শুরু:', 'From:', lang)}</span>
              <input
                type="date"
                aria-label={b('শুরুর তারিখ', 'Start Date', lang)}
                data-testid="export-start-date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[11px]"
              />
            </label>
            <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <span>{b('পর্যন্ত:', 'To:', lang)}</span>
              <input
                type="date"
                aria-label={b('শেষ তারিখ', 'End Date', lang)}
                data-testid="export-end-date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[11px]"
              />
            </label>
            <span
              data-testid="export-row-count"
              className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-mono text-[11px] font-bold"
            >
              {exportRows.length} {b('সারি', 'rows', lang)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="export-attendance-csv-btn"
              disabled={exportRows.length === 0}
              onClick={handleExportAttendanceCsv}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-slate-800 dark:text-slate-100 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              {b('CSV ডাউনলোড', 'Export CSV', lang)}
            </button>
            <button
              type="button"
              data-testid="export-attendance-excel-btn"
              disabled={exportRows.length === 0}
              onClick={handleExportAttendanceExcel}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {b('Excel (.xls)', 'Export Excel', lang)}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                <th className="py-3 px-4 font-semibold">{b('রোল ও শিক্ষার্থী', 'Roll & Student', lang)}</th>
                <th className="py-3 px-3 font-semibold">{b('স্থায়ী আইডি', 'Permanent ID', lang)}</th>
                <th className="py-3 px-3 font-semibold">{b('স্ক্যান সময় / মাধ্যম', 'Time / Source', lang)}</th>
                <th className="py-3 px-3 font-semibold">{b('অবস্থা', 'Status', lang)}</th>
                <th className="py-3 px-4 font-semibold text-right">{b('ম্যানুয়াল / ইতিহাস', 'Manual / History', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.map((stu) => {
                const scan = schoolScans.find((k) => k.studentId === stu.id);
                const effective = manualOverrides[stu.id] ?? (scan ? scan.attendanceState : 'absent');
                return (
                  <tr key={stu.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        Roll {stu.roll} · {stu.nameBn}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {stu.className} ({stu.section}) · {stu.attendancePct}% overall
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                      {stu.permanentId}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">
                      {scan ? `${scan.scanTime} (${scan.source ?? 'auto'})` : '—'}
                    </td>
                    <td className="py-3 px-3 font-bold">
                      {effective === 'present' ? (
                        <span className="text-emerald-700 dark:text-emerald-400">{b('উপস্থিত', 'Present', lang)}</span>
                      ) : effective === 'late' ? (
                        <span className="text-amber-600 dark:text-amber-400">{b('বিলম্বিত', 'Late', lang)}</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">{b('অনুপস্থিত', 'Absent', lang)}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1">
                        <button
                          type="button"
                          disabled={!canTakeAttendance}
                          onClick={() => handleManualMark(stu, 'present')}
                          className={`px-2 py-1 rounded border font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
                            effective === 'present'
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer'
                          }`}
                        >
                          P
                        </button>
                        <button
                          type="button"
                          disabled={!canTakeAttendance}
                          onClick={() => handleManualMark(stu, 'late')}
                          className={`px-2 py-1 rounded border font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
                            effective === 'late'
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer'
                          }`}
                        >
                          L
                        </button>
                        <button
                          type="button"
                          disabled={!canTakeAttendance}
                          onClick={() => handleManualMark(stu, 'absent')}
                          className={`px-2 py-1 rounded border font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
                            effective === 'absent'
                              ? 'bg-red-600 text-white border-red-600'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer'
                          }`}
                        >
                          A
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setHistoryStudentId((prev) => (prev === stu.id ? null : stu.id))
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <History className="w-3 h-3" />
                          {b('ইতিহাস', 'History', lang)}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complete Attendance & Absent Students Guardian Notification Panel */}
      {attendanceCompleted && (
        <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-2xl p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-600" />
                {b(
                  `হাজিরা সম্পন্ন: অনুপস্থিত শিক্ষার্থী তালিকা (${stats.absentStudents.length} জন)`,
                  `Attendance Completed: Absent Students List (${stats.absentStudents.length})`,
                  lang
                )}
              </h2>
              <p className="text-slate-500 mt-0.5">
                {b(
                  'এক ক্লিকে অনুপস্থিত সকল শিক্ষার্থীর অভিভাবকদের নিকট অনুপস্থিতি নোটিফিকেশন পাঠান।',
                  'Send instant absent alerts to all guardians of absent students in one click.',
                  lang
                )}
              </p>
            </div>
            {stats.absentStudents.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={absentNotifiedDone}
                  onClick={() => {
                    onNotifyAllAbsentGuardians(stats.absentStudents, schoolId, todayIso);
                    setAbsentNotifiedDone(true);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold ${
                    absentNotifiedDone
                      ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 cursor-default'
                      : 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                  }`}
                >
                  <BellRing className="w-4 h-4" />
                  {absentNotifiedDone
                    ? b('সকল অভিভাবককে জানানো হয়েছে ✓', 'All Guardians Notified ✓', lang)
                    : b('অ্যাপ নোটিফাই', 'In-App Notify', lang)}
                </button>
                <button
                  type="button"
                  data-testid="send-absent-bulk-sms-btn"
                  disabled={smsSendingAbsent}
                  onClick={() => void handleSendAbsentBulkSms()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {smsSendingAbsent
                    ? b('SMS পাঠানো হচ্ছে...', 'Sending SMS...', lang)
                    : b(`Bulk SMS পাঠান (${stats.absentStudents.length})`, `Send Bulk SMS (${stats.absentStudents.length})`, lang)}
                </button>
              </div>
            )}
          </div>
          {smsAbsentFeedback && (
            <div data-testid="absent-bulk-sms-feedback" className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 font-semibold">
              {smsAbsentFeedback}
            </div>
          )}

          {stats.absentStudents.length === 0 ? (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-semibold">
              {b('আজ শতভাগ শিক্ষার্থী উপস্থিত! কোনো অনুপস্থিত শিক্ষার্থী নেই।', '100% attendance today! No absent students.', lang)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {stats.absentStudents.map((stu) => (
                <div
                  key={stu.id}
                  className="p-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/20 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {stu.nameBn} (Roll {stu.roll})
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {stu.className} · Guardian: {maskMobile(stu.guardianMobile)}
                    </div>
                  </div>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {absentNotifiedDone ? b('Notified ✓', 'Notified ✓', lang) : b('Absent', 'Absent', lang)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Student Attendance History Drawer */}
      {selectedHistoryStudent && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              {selectedHistoryStudent.nameBn} — {b('উপস্থিতির ইতিহাস ও %', 'Attendance History', lang)} ({selectedHistoryStudent.attendancePct}%)
            </h3>
            <button
              type="button"
              onClick={() => setHistoryStudentId(null)}
              className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-semibold cursor-pointer"
            >
              {b('বন্ধ করুন', 'Close', lang)}
            </button>
          </div>
          {selectedStudentHistory.length === 0 ? (
            <p className="text-slate-500">{b('এই শিক্ষার্থীর সাম্প্রতিক হাজিরা রেকর্ড নেই।', 'No recent history entries.', lang)}</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {selectedStudentHistory.map((h) => (
                <div key={h.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="font-mono text-slate-700 dark:text-slate-300">
                    {h.dateIso} · {h.scanTime} · {h.source}
                  </div>
                  <div className="flex items-center gap-2">
                    {h.guardianNotified && (
                      <span className="text-slate-500">{b('Guardian Notified', 'Guardian Notified', lang)}</span>
                    )}
                    <span
                      className={`font-bold ${
                        h.status === 'present'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : h.status === 'late'
                            ? 'text-amber-600'
                            : 'text-red-600'
                      }`}
                    >
                      {h.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <QrStickerPrintModal
        isOpen={qrStickersModalOpen}
        lang={lang}
        school={school}
        schoolId={schoolId}
        schoolNameBn={schoolNameBn}
        students={schoolStudents}
        initialClassFilter={selectedClass}
        onClose={() => setQrStickersModalOpen(false)}
      />
    </div>
  );
};
