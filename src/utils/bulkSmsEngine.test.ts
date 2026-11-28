import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_STUDENTS, INITIAL_TEACHERS } from './testFixtures';
import {
  buildAbsentStudentsSmsPayload,
  buildAudienceSmsRecipients,
  maskPhoneNumber,
  normalizeBangladeshMobile,
  sanitizeSmsBody,
  validateCustomSmsGatewayUrl,
} from './bulkSmsEngine';

test('normalizeBangladeshMobile and maskPhoneNumber handle BD mobile formats safely', () => {
  assert.equal(normalizeBangladeshMobile('01712345678'), '+8801712345678');
  assert.equal(normalizeBangladeshMobile('8801812345678'), '+8801812345678');
  assert.equal(normalizeBangladeshMobile('+880 1912-345678'), '+8801912345678');
  assert.equal(normalizeBangladeshMobile('invalid-phone'), null);
  assert.equal(normalizeBangladeshMobile('01234567890'), null);

  assert.equal(maskPhoneNumber('+8801712345678'), '+88017****5678');
});

test('sanitizeSmsBody validates length and calculates GSM/Unicode segments', () => {
  const empty = sanitizeSmsBody('   ');
  assert.equal(empty.ok, false);

  const english = sanitizeSmsBody('School closed tomorrow due to heavy rain.');
  assert.equal(english.ok, true);
  assert.equal(english.hasUnicode, false);
  assert.equal(english.segmentCount, 1);

  const bangla = sanitizeSmsBody('আগামীকাল জরুরি কারণে বিদ্যালয় বন্ধ থাকবে।');
  assert.equal(bangla.ok, true);
  assert.equal(bangla.hasUnicode, true);
  assert.equal(bangla.segmentCount, 1);

  const tooLong = sanitizeSmsBody('a'.repeat(500));
  assert.equal(tooLong.ok, false);
});

test('buildAudienceSmsRecipients deduplicates numbers and scopes by school and role', () => {
  const guardianRecipients = buildAudienceSmsRecipients({
    schoolId: 'GPS-1042',
    audience: 'all_guardians',
    students: INITIAL_STUDENTS,
    teachers: INITIAL_TEACHERS,
  });
  assert.ok(guardianRecipients.length > 0);
  const phones = guardianRecipients.map((r) => r.phone);
  assert.equal(new Set(phones).size, phones.length);

  const teacherRecipients = buildAudienceSmsRecipients({
    schoolId: 'GPS-1042',
    audience: 'all_teachers',
    students: INITIAL_STUDENTS,
    teachers: INITIAL_TEACHERS,
  });
  assert.ok(teacherRecipients.length > 0);

  const absent = INITIAL_STUDENTS.filter((s) => s.schoolId === 'GPS-1042').slice(0, 2);
  const payload = buildAbsentStudentsSmsPayload({
    absentStudents: absent,
    schoolName: 'Govt Primary School',
    dateIso: '2026-11-19',
    lang: 'en',
  });
  assert.ok(payload.recipients.length >= 1);
  assert.ok(payload.defaultMessage.includes('2026-11-19'));
});

test('validateCustomSmsGatewayUrl enforces HTTPS and blocks local/private SSRF targets', () => {
  assert.equal(validateCustomSmsGatewayUrl('https://bulksmsbd.net/api/smsapi'), true);
  assert.equal(validateCustomSmsGatewayUrl('http://bulksmsbd.net/api/smsapi'), false);
  assert.equal(validateCustomSmsGatewayUrl('https://localhost:8080/sms'), false);
  assert.equal(validateCustomSmsGatewayUrl('https://127.0.0.1/sms'), false);
  assert.equal(validateCustomSmsGatewayUrl('https://169.254.169.254/latest'), false);
  assert.equal(validateCustomSmsGatewayUrl('https://192.168.1.50/sms'), false);
});
