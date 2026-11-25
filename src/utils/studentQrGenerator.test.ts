import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_STUDENTS } from '../data/mockData';
import { matchStudentByIdCardCode } from './attendanceScannerEngine';
import { buildStudentQrPayload, parseAndValidateStudentQrPayload } from './studentQrGenerator';

test('buildStudentQrPayload and parseAndValidateStudentQrPayload round-trip cleanly with attendance matcher', () => {
  const student = INITIAL_STUDENTS[0];
  const payload = buildStudentQrPayload(student);

  assert.equal(payload, `PSMS-QR|${student.permanentId}|${student.schoolId}|VERIFIED`);

  const parsed = parseAndValidateStudentQrPayload(payload, student.schoolId);
  assert.equal(parsed.valid, true);
  assert.equal(parsed.format, 'psms_qr');
  assert.equal(parsed.permanentId, student.permanentId);
  assert.equal(parsed.schoolId, student.schoolId);

  const mismatch = parseAndValidateStudentQrPayload(payload, 'OTHER-SCHOOL-99');
  assert.equal(mismatch.valid, false);
  assert.ok(mismatch.reason?.includes('mismatch'));

  const matched = matchStudentByIdCardCode(payload, student.schoolId, INITIAL_STUDENTS);
  assert.equal(matched.student?.id, student.id);
});
