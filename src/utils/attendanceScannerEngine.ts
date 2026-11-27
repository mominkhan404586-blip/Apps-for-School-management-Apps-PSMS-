import type {
  KioskScanEvent,
  NotificationItem,
  StudentAttendanceHistoryEntry,
  StudentRecord,
} from '../types';

export interface AutoIdScanResult {
  status: 'recorded' | 'duplicate' | 'not_found' | 'wrong_school' | 'unauthorized_class';
  student?: StudentRecord;
  scanEvent?: KioskScanEvent;
  existingScan?: KioskScanEvent;
  firstScanTime?: string;
  historyEntry?: StudentAttendanceHistoryEntry;
  guardianNotification?: Omit<NotificationItem, 'id' | 'time' | 'read'>;
  messageBn: string;
  messageEn: string;
}

export function extractStudentCodeFromQrPayload(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return '';

  // 1. JSON QR payload e.g. {"studentId":"STU-2026-00015"} or {"permanentId":"STU-..."}
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const candidate =
        parsed.permanentId ?? parsed.studentId ?? parsed.id ?? parsed.code ?? parsed.qrCode;
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    } catch {
      // Fall through to regex/string extractors
    }
  }

  // 2. Pipe-delimited QR format e.g. PSMS-QR|STU-2026-100101|GPS-1042|VERIFIED
  if (trimmed.includes('|')) {
    const parts = trimmed
      .split('|')
      .map((p) => p.trim())
      .filter(Boolean);
    const idPart = parts.find((p) => /^(STU|STD|GLC|ID|stu)-/i.test(p));
    if (idPart) return idPart;
    if (parts.length >= 2 && parts[0].toUpperCase().startsWith('PSMS')) {
      return parts[1];
    }
  }

  // 3. URL query string e.g. https://psms.edu.bd/verify?id=STU-2026-100101
  if (trimmed.includes('?') || /^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://psms.local/${trimmed}`);
      const qId =
        url.searchParams.get('studentId') ??
        url.searchParams.get('permanentId') ??
        url.searchParams.get('id') ??
        url.searchParams.get('code');
      if (qId && qId.trim()) return qId.trim();
    } catch {
      // Ignore malformed URL
    }
  }

  // 4. Embedded standard ID token in arbitrary text
  const embeddedMatch = trimmed.match(/\b((?:STU|STD)-\d{4}-\d{4,6}|GLC-[A-Z0-9-]+|ID-\d{4}-[A-Z0-9-]+)\b/i);
  if (embeddedMatch?.[1]) {
    return embeddedMatch[1].trim();
  }

  return trimmed;
}

export function matchStudentByIdCardCode(
  rawCode: string,
  schoolId: string,
  students: StudentRecord[]
): { student?: StudentRecord; wrongSchoolStudent?: StudentRecord; extractedCode: string } {
  const extractedCode = extractStudentCodeFromQrPayload(rawCode);
  const code = extractedCode.trim().toLowerCase();
  const rawLower = rawCode.trim().toLowerCase();
  if (!code && !rawLower) return { extractedCode: '' };

  const exactMatch = students.find(
    (s) =>
      s.id.toLowerCase() === code ||
      s.permanentId.toLowerCase() === code ||
      (s.digitalIdSerial && s.digitalIdSerial.toLowerCase() === code) ||
      s.guardianLinkCode.toLowerCase() === code ||
      s.activationCode.toLowerCase() === code ||
      (s.qrPayload && s.qrPayload.toLowerCase() === rawLower) ||
      (s.qrPayload && s.qrPayload.toLowerCase() === code)
  );

  if (!exactMatch) return { extractedCode };
  if (exactMatch.schoolId !== schoolId) {
    return { wrongSchoolStudent: exactMatch, extractedCode };
  }
  return { student: exactMatch, extractedCode };
}

export function isStudentAlreadyScannedToday(
  studentId: string,
  existingScans: KioskScanEvent[],
  dateIso: string
): boolean {
  return existingScans.some(
    (s) => s.studentId === studentId && (!s.dateIso || s.dateIso === dateIso)
  );
}

export function processAutoIdCardScan(params: {
  rawCode: string;
  schoolId: string;
  students: StudentRecord[];
  existingScans: KioskScanEvent[];
  dateIso: string;
  scanTime: string;
  isLate?: boolean;
  source?: 'auto_camera' | 'manual_teacher' | 'kiosk';
  allowedClasses?: string[];
}): AutoIdScanResult {
  const { student, wrongSchoolStudent, extractedCode } = matchStudentByIdCardCode(
    params.rawCode,
    params.schoolId,
    params.students
  );

  if (wrongSchoolStudent) {
    return {
      status: 'wrong_school',
      messageBn: `অবৈধ / অন্য বিদ্যালয়ের QR: আইডি (${wrongSchoolStudent.permanentId}) অন্য বিদ্যালয়ের শিক্ষার্থীর।`,
      messageEn: `Invalid Student QR Code for this school: ID (${wrongSchoolStudent.permanentId}) belongs to another school.`,
    };
  }

  if (!student) {
    return {
      status: 'not_found',
      messageBn: `অবৈধ শিক্ষার্থী QR কোড: "${extractedCode || params.rawCode}" শনাক্ত করা যায়নি।`,
      messageEn: `Invalid Student QR Code: "${extractedCode || params.rawCode}" not recognized.`,
    };
  }

  if (
    params.allowedClasses &&
    params.allowedClasses.length > 0 &&
    !params.allowedClasses.includes(student.className)
  ) {
    return {
      status: 'unauthorized_class',
      student,
      messageBn: `${student.nameBn} (${student.className}) আপনার নির্ধারিত শ্রেণির অন্তর্ভুক্ত নন।`,
      messageEn: `${student.nameEn} (${student.className}) is outside your assigned classes.`,
    };
  }

  const existingScan = params.existingScans.find(
    (s) => s.studentId === student.id && (!s.dateIso || s.dateIso === params.dateIso)
  );
  if (existingScan) {
    return {
      status: 'duplicate',
      student,
      existingScan,
      firstScanTime: existingScan.scanTime,
      messageBn: `✓ Already Marked — ${student.nameBn} আজ সকাল ${existingScan.scanTime}-এ ইতিমধ্যেই উপস্থিত হয়েছেন।`,
      messageEn: `✓ Already Marked — ${student.nameEn} was first scanned at ${existingScan.scanTime}.`,
    };
  }

  const attendanceState: 'present' | 'late' = params.isLate ? 'late' : 'present';
  const source = params.source ?? 'auto_camera';

  const scanEvent: KioskScanEvent = {
    id: `k-${Date.now()}-${Math.floor(Math.random() * 90 + 10)}`,
    studentId: student.id,
    studentName: student.nameBn,
    className: student.className,
    roll: student.roll,
    scanTime: params.scanTime,
    type: 'entry',
    attendanceState,
    schoolId: params.schoolId,
    dateIso: params.dateIso,
    source,
    guardianNotified: true,
  };

  const historyEntry: StudentAttendanceHistoryEntry = {
    id: `ah-${Date.now()}-${student.id}`,
    studentId: student.id,
    schoolId: params.schoolId,
    dateIso: params.dateIso,
    status: attendanceState,
    scanTime: params.scanTime,
    source,
    guardianNotified: true,
  };

  const guardianNotification: Omit<NotificationItem, 'id' | 'time' | 'read'> =
    attendanceState === 'late'
      ? {
          roleTarget: 'guardian',
          schoolId: params.schoolId,
          studentId: student.id,
          category: 'account',
          priority: 'important',
          type: 'warning',
          dateLabel: params.dateIso,
          createdAtIso: `${params.dateIso}T09:40:00`,
          targetTab: 'attendance',
          targetStudentId: student.id,
          titleBn: `বিলম্বে উপস্থিতি: ${student.nameBn} বিদ্যালয়ে পৌঁছেছে`,
          titleEn: `Late Arrival: ${student.nameEn} Checked In`,
          messageBn: `${student.nameBn} (${student.className}) আজ সকাল ${params.scanTime}-এ বিলম্বে বিদ্যালয়ে প্রবেশ করেছে।`,
          messageEn: `${student.nameEn} arrived late at school at ${params.scanTime}.`,
        }
      : {
          roleTarget: 'guardian',
          schoolId: params.schoolId,
          studentId: student.id,
          category: 'account',
          priority: 'normal',
          type: 'success',
          dateLabel: params.dateIso,
          createdAtIso: `${params.dateIso}T09:10:00`,
          targetTab: 'attendance',
          targetStudentId: student.id,
          titleBn: `নিরাপদ উপস্থিতি: ${student.nameBn} বিদ্যালয়ে পৌঁছেছে`,
          titleEn: `Arrival Alert: ${student.nameEn} Reached School`,
          messageBn: `ID Card স্ক্যানের মাধ্যমে সকাল ${params.scanTime}-এ ${student.nameBn}-এর উপস্থিতি নিশ্চিত হয়েছে।`,
          messageEn: `${student.nameEn}'s ID card scan confirmed arrival at ${params.scanTime}.`,
        };

  return {
    status: 'recorded',
    student,
    scanEvent,
    historyEntry,
    guardianNotification,
    messageBn: `${student.nameBn} (Roll ${student.roll}) — ${attendanceState === 'late' ? 'বিলম্বিত (Late)' : 'উপস্থিত (Present)'} রেকর্ড সম্পন্ন ও অভিভাবক নোটিফাইড।`,
    messageEn: `${student.nameEn} marked ${attendanceState} and guardian notified.`,
  };
}

export interface AttendanceSessionStats {
  total: number;
  present: number;
  late: number;
  absent: number;
  scannedCount: number;
  attendancePct: number;
  presentStudents: StudentRecord[];
  lateStudents: StudentRecord[];
  absentStudents: StudentRecord[];
}

export function computeAttendanceSessionStats(
  targetStudents: StudentRecord[],
  scans: KioskScanEvent[],
  dateIso: string,
  manualOverrides: Record<string, 'present' | 'late' | 'absent'> = {}
): AttendanceSessionStats {
  const presentStudents: StudentRecord[] = [];
  const lateStudents: StudentRecord[] = [];
  const absentStudents: StudentRecord[] = [];
  let scannedCount = 0;

  for (const stu of targetStudents) {
    const todayScan = scans.find(
      (s) => s.studentId === stu.id && (!s.dateIso || s.dateIso === dateIso)
    );
    if (todayScan) scannedCount += 1;

    const override = manualOverrides[stu.id];
    const effectiveStatus =
      override ?? (todayScan ? todayScan.attendanceState : 'absent');

    if (effectiveStatus === 'present') presentStudents.push(stu);
    else if (effectiveStatus === 'late') lateStudents.push(stu);
    else absentStudents.push(stu);
  }

  const total = targetStudents.length;
  const attended = presentStudents.length + lateStudents.length;
  const attendancePct = total > 0 ? Math.round((attended / total) * 100) : 0;

  return {
    total,
    present: presentStudents.length,
    late: lateStudents.length,
    absent: absentStudents.length,
    scannedCount,
    attendancePct,
    presentStudents,
    lateStudents,
    absentStudents,
  };
}

export function buildAbsentGuardianNotifications(
  absentStudents: StudentRecord[],
  schoolId: string,
  dateIso: string
): Omit<NotificationItem, 'id' | 'time' | 'read'>[] {
  return absentStudents.map((stu) => ({
    roleTarget: 'guardian' as const,
    schoolId,
    studentId: stu.id,
    category: 'emergency' as const,
    priority: 'important' as const,
    type: 'alert' as const,
    dateLabel: dateIso,
    createdAtIso: `${dateIso}T10:30:00`,
    targetTab: 'attendance',
    targetStudentId: stu.id,
    titleBn: `অনুপস্থিতি বার্তা: ${stu.nameBn} আজ অনুপস্থিত`,
    titleEn: `Absent Alert: ${stu.nameEn} Absent Today`,
    messageBn: `${stu.nameBn} (${stu.className}, রোল ${stu.roll}) আজ (${dateIso}) বিদ্যালয়ে উপস্থিত হয়নি। অনুগ্রহ করে কারণ জানান।`,
    messageEn: `${stu.nameEn} (${stu.className}, Roll ${stu.roll}) was marked absent on ${dateIso}.`,
  }));
}

export interface TimedAttendanceQrSession {
  token: string;
  schoolId: string;
  teacherId?: string;
  teacherName?: string;
  className: string;
  section: string;
  issuedAtMs: number;
  expiresAtMs: number;
  ttlMinutes: number;
  nonce: string;
}

export interface TimedAttendanceQrValidation {
  isTimedAttendanceQr: boolean;
  valid: boolean;
  expired?: boolean;
  wrongSchool?: boolean;
  revoked?: boolean;
  tampered?: boolean;
  remainingSeconds: number;
  payload?: {
    schoolId: string;
    className: string;
    section: string;
    expiresAtMs: number;
    nonce: string;
  };
  messageBn: string;
  messageEn: string;
}

function sanitizePipeField(raw: string, fallback: string): string {
  const cleaned = String(raw || '')
    .replace(/\|/g, '-')
    .trim();
  return cleaned || fallback;
}

function computeTimedQrChecksum(coreString: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < coreString.length; i += 1) {
    hash ^= coreString.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

export function generateTimedAttendanceQrSession(params: {
  schoolId: string;
  teacherId?: string;
  teacherName?: string;
  className: string;
  section?: string;
  ttlMinutes?: number;
  nowMs?: number;
  nonce?: string;
}): TimedAttendanceQrSession {
  const issuedAtMs = typeof params.nowMs === 'number' && Number.isFinite(params.nowMs)
    ? Math.floor(params.nowMs)
    : Date.now();
  const ttlMinutes = Math.max(1, Math.min(60, Math.round(params.ttlMinutes ?? 5)));
  const expiresAtMs = issuedAtMs + ttlMinutes * 60_000;
  const schoolId = sanitizePipeField(params.schoolId, 'sch-1');
  const className = sanitizePipeField(params.className || 'All', 'All');
  const section = sanitizePipeField(params.section || 'All', 'All');
  const nonce = sanitizePipeField(
    params.nonce || Math.random().toString(36).slice(2, 8).toUpperCase(),
    'ATT001'
  );

  const core = `PSMS-ATT-QR|v1|${schoolId}|${className}|${section}|${expiresAtMs}|${nonce}`;
  const checksum = computeTimedQrChecksum(core);

  return {
    token: `${core}|${checksum}`,
    schoolId,
    teacherId: params.teacherId,
    teacherName: params.teacherName,
    className,
    section,
    issuedAtMs,
    expiresAtMs,
    ttlMinutes,
    nonce,
  };
}

export function validateTimedAttendanceQrToken(
  rawCode: string,
  ctx: {
    expectedSchoolId: string;
    nowMs?: number;
    revokedNonces?: string[];
  }
): TimedAttendanceQrValidation {
  const trimmed = rawCode.trim();
  if (!trimmed.toUpperCase().startsWith('PSMS-ATT-QR|')) {
    return {
      isTimedAttendanceQr: false,
      valid: false,
      remainingSeconds: 0,
      messageBn: '',
      messageEn: '',
    };
  }

  const parts = trimmed.split('|');
  if (parts.length !== 8 || parts[1] !== 'v1') {
    return {
      isTimedAttendanceQr: true,
      valid: false,
      tampered: true,
      remainingSeconds: 0,
      messageBn: 'অবৈধ সময়সীমিত উপস্থিতি QR ফরম্যাট।',
      messageEn: 'Invalid time-limited attendance QR format.',
    };
  }

  const [, , schoolId, className, section, expiresRaw, nonce, checksum] = parts;
  const core = parts.slice(0, 7).join('|');
  if (computeTimedQrChecksum(core) !== checksum.toUpperCase()) {
    return {
      isTimedAttendanceQr: true,
      valid: false,
      tampered: true,
      remainingSeconds: 0,
      messageBn: 'QR কোডটি পরিবর্তিত বা ত্রুটিপূর্ণ (Invalid signature)।',
      messageEn: 'Attendance QR signature mismatch or tampered code.',
    };
  }

  if (ctx.revokedNonces?.includes(nonce)) {
    return {
      isTimedAttendanceQr: true,
      valid: false,
      revoked: true,
      remainingSeconds: 0,
      payload: { schoolId, className, section, expiresAtMs: Number(expiresRaw) || 0, nonce },
      messageBn: 'শিক্ষক কর্তৃক এই উপস্থিতি QR কোডটি বাতিল (Revoked) করা হয়েছে।',
      messageEn: 'This attendance QR code has been revoked by the teacher.',
    };
  }

  if (ctx.expectedSchoolId && schoolId !== ctx.expectedSchoolId) {
    return {
      isTimedAttendanceQr: true,
      valid: false,
      wrongSchool: true,
      remainingSeconds: 0,
      payload: { schoolId, className, section, expiresAtMs: Number(expiresRaw) || 0, nonce },
      messageBn: `অন্য বিদ্যালয়ের (${schoolId}) উপস্থিতি QR কোড গ্রহণযোগ্য নয়।`,
      messageEn: `Attendance QR belongs to another school (${schoolId}).`,
    };
  }

  const expiresAtMs = Number(expiresRaw);
  const nowMs = typeof ctx.nowMs === 'number' && Number.isFinite(ctx.nowMs) ? ctx.nowMs : Date.now();
  const remainingSeconds = Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));

  if (!Number.isFinite(expiresAtMs) || nowMs > expiresAtMs) {
    return {
      isTimedAttendanceQr: true,
      valid: false,
      expired: true,
      remainingSeconds: 0,
      payload: { schoolId, className, section, expiresAtMs: expiresAtMs || 0, nonce },
      messageBn: 'সময়সীমিত উপস্থিতি QR কোডের মেয়াদ শেষ হয়ে গেছে। নতুন QR তৈরি করুন।',
      messageEn: 'Time-limited attendance QR code has expired. Generate a fresh QR.',
    };
  }

  return {
    isTimedAttendanceQr: true,
    valid: true,
    remainingSeconds,
    payload: { schoolId, className, section, expiresAtMs, nonce },
    messageBn: `সময়সীমিত উপস্থিতি QR যাচাই সম্পন্ন (${className}) — বাকি ${formatRemainingDurationMmSs(remainingSeconds)}।`,
    messageEn: `Time-limited attendance QR verified (${className}) — ${formatRemainingDurationMmSs(remainingSeconds)} remaining.`,
  };
}

export function formatRemainingDurationMmSs(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

