import type { Language, Role, StudentRecord, TeacherRecord } from '../types';

export type SmsGatewayProvider = 'twilio' | 'bd_sms_gateway' | 'preview_sandbox';
export type BulkSmsCategory = 'absence_alert' | 'emergency_notice' | 'general_notice';

export interface BulkSmsRecipient {
  name: string;
  phone: string;
  studentId?: string;
  studentName?: string;
  className?: string;
}

export interface BulkSmsDeliveryReceipt {
  name: string;
  phoneMasked: string;
  status: 'sent' | 'queued' | 'preview' | 'failed';
  sidOrRef?: string;
  error?: string;
}

export interface BulkSmsLogEntry {
  id: string;
  category: BulkSmsCategory;
  schoolId: string;
  sentByRole: Role;
  sentByName: string;
  message: string;
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  provider: SmsGatewayProvider;
  targetsSummary: string;
  recipientsMasked: BulkSmsDeliveryReceipt[];
  createdAtIso: string;
}

export function normalizeBangladeshMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[\s\-().]/g, '').trim();
  if (!cleaned) return null;

  if (/^\+8801[3-9]\d{8}$/.test(cleaned)) {
    return cleaned;
  }
  if (/^8801[3-9]\d{8}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  if (/^01[3-9]\d{8}$/.test(cleaned)) {
    return `+88${cleaned}`;
  }
  if (/^\+[1-9]\d{7,14}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

export function maskPhoneNumber(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.length <= 6) return '***';
  if (trimmed.startsWith('+880') && trimmed.length >= 13) {
    return `${trimmed.slice(0, 6)}****${trimmed.slice(-4)}`;
  }
  return `${trimmed.slice(0, 3)}****${trimmed.slice(-4)}`;
}

export function sanitizeSmsBody(raw: string): {
  ok: boolean;
  text: string;
  segmentCount: number;
  hasUnicode: boolean;
  error?: string;
} {
  const text = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (!text) {
    return {
      ok: false,
      text: '',
      segmentCount: 0,
      hasUnicode: false,
      error: 'SMS message body cannot be empty.',
    };
  }
  if (text.length > 480) {
    return {
      ok: false,
      text: text.slice(0, 480),
      segmentCount: 0,
      hasUnicode: false,
      error: 'SMS message body exceeds 480 character limit.',
    };
  }
  const hasUnicode = /[^\u0000-\u007F]/.test(text);
  const perSegment = hasUnicode ? 70 : 160;
  const segmentCount = Math.max(1, Math.ceil(text.length / perSegment));
  return { ok: true, text, segmentCount, hasUnicode };
}

export function validateCustomSmsGatewayUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function buildAudienceSmsRecipients(params: {
  schoolId: string;
  audience: 'all_guardians' | 'absent_guardians' | 'all_teachers' | 'class_guardians';
  classFilter?: string;
  students: StudentRecord[];
  teachers?: TeacherRecord[];
  absentStudentIds?: string[];
}): BulkSmsRecipient[] {
  const { schoolId, audience, classFilter, students, teachers = [], absentStudentIds = [] } = params;
  const seenPhones = new Set<string>();
  const list: BulkSmsRecipient[] = [];

  if (audience === 'all_teachers') {
    for (const t of teachers) {
      if (t.schoolId !== schoolId || t.status === 'deactivated' || t.status === 'archived') continue;
      const phone = normalizeBangladeshMobile(t.mobile);
      if (!phone || seenPhones.has(phone)) continue;
      seenPhones.add(phone);
      list.push({ name: t.nameBn, phone });
    }
    return list;
  }

  const absentSet = new Set(absentStudentIds);
  for (const s of students) {
    if (s.schoolId !== schoolId || s.status === 'deactivated') continue;
    if (audience === 'absent_guardians' && !absentSet.has(s.id)) continue;
    if (audience === 'class_guardians' && classFilter && classFilter !== 'all' && s.className !== classFilter) {
      continue;
    }
    const phone = normalizeBangladeshMobile(s.guardianMobile || s.emergencyContact);
    if (!phone || seenPhones.has(phone)) continue;
    seenPhones.add(phone);
    list.push({
      name: `${s.nameBn} (Guardian)`,
      phone,
      studentId: s.id,
      studentName: s.nameBn,
      className: s.className,
    });
  }

  return list;
}

export function buildAbsentStudentsSmsPayload(params: {
  absentStudents: StudentRecord[];
  schoolName: string;
  dateIso: string;
  lang: Language;
}): { recipients: BulkSmsRecipient[]; defaultMessage: string } {
  const { absentStudents, schoolName, dateIso, lang } = params;
  const seenPhones = new Set<string>();
  const recipients: BulkSmsRecipient[] = [];

  for (const stu of absentStudents) {
    const phone = normalizeBangladeshMobile(stu.guardianMobile || stu.emergencyContact);
    if (!phone || seenPhones.has(phone)) continue;
    seenPhones.add(phone);
    recipients.push({
      name: `${stu.nameBn} (${stu.className})`,
      phone,
      studentId: stu.id,
      studentName: stu.nameBn,
      className: stu.className,
    });
  }

  const defaultMessage =
    lang === 'bn'
      ? `[${schoolName}] জরুরি উপস্থিতি বার্তা: আপনার সন্তান আজ (${dateIso}) বিদ্যালয়ে অনুপস্থিত রয়েছে। অনুগ্রহ করে শ্রেণি শিক্ষকের সাথে যোগাযোগ করুন।`
      : `[${schoolName}] Absence Alert: Your child is marked absent today (${dateIso}). Please contact the class teacher.`;

  return { recipients, defaultMessage };
}
