import type { StudentRecord } from '../types';
import { extractStudentCodeFromQrPayload } from './attendanceScannerEngine';

export interface ParsedStudentQrPayload {
  valid: boolean;
  permanentId?: string;
  schoolId?: string;
  signature?: string;
  format: 'psms_qr' | 'json' | 'url' | 'direct_id' | 'invalid';
  reason?: string;
}

export function buildStudentQrPayload(
  student: Pick<StudentRecord, 'permanentId' | 'schoolId'>
): string {
  const cleanPermanentId = student.permanentId.trim();
  const cleanSchoolId = student.schoolId.trim();
  return `PSMS-QR|${cleanPermanentId}|${cleanSchoolId}|VERIFIED`;
}

export function parseAndValidateStudentQrPayload(
  rawInput: string,
  expectedSchoolId?: string
): ParsedStudentQrPayload {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { valid: false, format: 'invalid', reason: 'Empty QR payload.' };
  }

  // Canonical PSMS-QR|<permanentId>|<schoolId>|VERIFIED
  if (trimmed.toUpperCase().startsWith('PSMS-QR|')) {
    const parts = trimmed.split('|').map((p) => p.trim());
    if (parts.length < 3 || !parts[1] || !parts[2]) {
      return { valid: false, format: 'invalid', reason: 'Malformed PSMS-QR token.' };
    }
    const permanentId = parts[1];
    const schoolId = parts[2];
    const signature = parts[3] || 'VERIFIED';
    if (expectedSchoolId && schoolId.toLowerCase() !== expectedSchoolId.trim().toLowerCase()) {
      return {
        valid: false,
        permanentId,
        schoolId,
        signature,
        format: 'psms_qr',
        reason: `School mismatch (${schoolId} != ${expectedSchoolId}).`,
      };
    }
    return {
      valid: true,
      permanentId,
      schoolId,
      signature,
      format: 'psms_qr',
    };
  }

  const extracted = extractStudentCodeFromQrPayload(trimmed);
  if (!extracted) {
    return { valid: false, format: 'invalid', reason: 'Could not extract student ID.' };
  }

  const format: ParsedStudentQrPayload['format'] = trimmed.startsWith('{')
    ? 'json'
    : trimmed.includes('?') || /^https?:\/\//i.test(trimmed)
      ? 'url'
      : 'direct_id';

  return {
    valid: true,
    permanentId: extracted,
    format,
  };
}
