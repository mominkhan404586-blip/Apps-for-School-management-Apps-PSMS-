import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatRemainingDurationMmSs,
  generateTimedAttendanceQrSession,
  validateTimedAttendanceQrToken,
} from './attendanceScannerEngine';

test('generateTimedAttendanceQrSession creates signed time-limited QR token that validates within TTL', () => {
  const baseMs = 1_760_000_000_000;
  const session = generateTimedAttendanceQrSession({
    schoolId: 'sch-1',
    teacherId: 'tch-1',
    teacherName: 'মোঃ রহিম উদ্দিন',
    className: 'Class 4',
    section: 'ক (A)',
    ttlMinutes: 5,
    nowMs: baseMs,
    nonce: 'QR991A',
  });

  assert.equal(session.expiresAtMs, baseMs + 300_000);
  assert.ok(session.token.startsWith('PSMS-ATT-QR|v1|sch-1|Class 4|'));

  const checkValid = validateTimedAttendanceQrToken(session.token, {
    expectedSchoolId: 'sch-1',
    nowMs: baseMs + 60_000,
  });
  assert.equal(checkValid.isTimedAttendanceQr, true);
  assert.equal(checkValid.valid, true);
  assert.equal(checkValid.remainingSeconds, 240);
  assert.equal(formatRemainingDurationMmSs(checkValid.remainingSeconds), '04:00');
});

test('validateTimedAttendanceQrToken rejects expired, wrong-school, tampered, and revoked QR tokens', () => {
  const baseMs = 1_760_000_000_000;
  const session = generateTimedAttendanceQrSession({
    schoolId: 'sch-1',
    className: 'Class 5',
    ttlMinutes: 2,
    nowMs: baseMs,
    nonce: 'TEST02',
  });

  // Expired
  const expired = validateTimedAttendanceQrToken(session.token, {
    expectedSchoolId: 'sch-1',
    nowMs: baseMs + 125_000,
  });
  assert.equal(expired.isTimedAttendanceQr, true);
  assert.equal(expired.valid, false);
  assert.equal(expired.expired, true);

  // Wrong school
  const wrongSchool = validateTimedAttendanceQrToken(session.token, {
    expectedSchoolId: 'sch-999',
    nowMs: baseMs + 10_000,
  });
  assert.equal(wrongSchool.valid, false);
  assert.equal(wrongSchool.wrongSchool, true);

  // Revoked
  const revoked = validateTimedAttendanceQrToken(session.token, {
    expectedSchoolId: 'sch-1',
    nowMs: baseMs + 10_000,
    revokedNonces: ['TEST02'],
  });
  assert.equal(revoked.valid, false);
  assert.equal(revoked.revoked, true);

  // Tampered checksum
  const tampered = validateTimedAttendanceQrToken(session.token.replace('TEST02', 'HACK99'), {
    expectedSchoolId: 'sch-1',
    nowMs: baseMs + 10_000,
  });
  assert.equal(tampered.valid, false);
  assert.equal(tampered.tampered, true);

  // Regular student QR should pass through with isTimedAttendanceQr: false
  const regular = validateTimedAttendanceQrToken('STD-2026-0001', {
    expectedSchoolId: 'sch-1',
    nowMs: baseMs,
  });
  assert.equal(regular.isTimedAttendanceQr, false);
});
