import assert from 'node:assert/strict';
import test from 'node:test';
import {
  INITIAL_KIOSK_SCANS,
  INITIAL_SCHOOLS,
  INITIAL_STUDENTS,
} from '../data/mockData';
import {
  authenticateSchoolAccount,
  filterByActiveSchool,
  generateStandardSchoolId,
  isCentralAdminActionBlocked,
} from './adminAndTeacherIdentityEngine';
import {
  extractStudentCodeFromQrPayload,
  processAutoIdCardScan,
} from './attendanceScannerEngine';

test('Standard School ID generation (SCH-2026-XXXXX) and School Login Authentication', () => {
  const nextId = generateStandardSchoolId(INITIAL_SCHOOLS);
  assert.match(nextId, /^SCH-2026-\d{5}$/);
  assert.ok(!INITIAL_SCHOOLS.some((s) => s.schoolPublicId === nextId));

  // Authenticate using standardized SCH-2026-00015
  const byPublicId = authenticateSchoolAccount(INITIAL_SCHOOLS, 'SCH-2026-00015', 'school@123');
  assert.equal(byPublicId.ok, true);
  assert.equal(byPublicId.school?.id, 'GPS-1042');

  // Authenticate using school code GPS-1042 or email
  const byCode = authenticateSchoolAccount(INITIAL_SCHOOLS, 'GPS-1042', 'school@123');
  assert.equal(byCode.ok, true);
  assert.equal(byCode.school?.schoolPublicId, 'SCH-2026-00015');

  const byEmail = authenticateSchoolAccount(INITIAL_SCHOOLS, 'adarsha.dhs2019@gmail.com', 'school@123');
  assert.equal(byEmail.ok, true);
  assert.equal(byEmail.school?.id, 'DHS-2019');

  // Wrong password fails cleanly
  const badPass = authenticateSchoolAccount(INITIAL_SCHOOLS, 'SCH-2026-00015', 'wrongpass');
  assert.equal(badPass.ok, false);

  // Unknown school fails cleanly
  const unknown = authenticateSchoolAccount(INITIAL_SCHOOLS, 'SCH-2026-99999', 'school@123');
  assert.equal(unknown.ok, false);
});

test('Strict Multi-School Isolation Filter & Central Admin Role Boundary Guard', () => {
  const gpsStudents = filterByActiveSchool(INITIAL_STUDENTS, 'GPS-1042');
  assert.ok(gpsStudents.length > 0);
  assert.ok(gpsStudents.every((s) => s.schoolId === 'GPS-1042'));

  const dhsStudents = filterByActiveSchool(INITIAL_STUDENTS, 'DHS-2019');
  assert.ok(dhsStudents.every((s) => s.schoolId === 'DHS-2019'));

  // Central Admin blocked from classroom/student operational actions
  assert.equal(isCentralAdminActionBlocked('central_admin', 'take_attendance').blocked, true);
  assert.equal(isCentralAdminActionBlocked('central_admin', 'enter_marks').blocked, true);
  assert.equal(isCentralAdminActionBlocked('central_admin', 'admit_student').blocked, true);

  // School Admin and Teacher are allowed
  assert.equal(isCentralAdminActionBlocked('school_admin', 'take_attendance').blocked, false);
  assert.equal(isCentralAdminActionBlocked('school_admin', 'teach_class').blocked, false);
  assert.equal(isCentralAdminActionBlocked('teacher', 'enter_marks').blocked, false);
});

test('QR Payload Multi-Format Extraction, Duplicate First-Scan Timestamp & Teacher Class Scope', () => {
  const rahim = INITIAL_STUDENTS.find((s) => s.id === 'stu-rahim')!;
  const sadia = INITIAL_STUDENTS.find((s) => s.id === 'stu-sadia')!;

  // Extracts from JSON, Pipe-delimited, URL, and direct codes
  assert.equal(
    extractStudentCodeFromQrPayload(JSON.stringify({ permanentId: rahim.permanentId, schoolId: 'GPS-1042' })),
    rahim.permanentId
  );
  assert.equal(
    extractStudentCodeFromQrPayload(`PSMS-QR|${sadia.permanentId}|GPS-1042|VERIFIED`),
    sadia.permanentId
  );
  assert.equal(
    extractStudentCodeFromQrPayload(`https://psms.edu.bd/verify?id=${sadia.permanentId}`),
    sadia.permanentId
  );
  assert.equal(
    extractStudentCodeFromQrPayload('STU-2026-00458'),
    'STU-2026-00458'
  );

  // Duplicate scan returns firstScanTime from existing INITIAL_KIOSK_SCANS
  const dupRes = processAutoIdCardScan({
    rawCode: `PSMS-QR|${rahim.permanentId}|GPS-1042|VERIFIED`,
    schoolId: 'GPS-1042',
    students: INITIAL_STUDENTS,
    existingScans: INITIAL_KIOSK_SCANS,
    dateIso: '2026-11-19',
    scanTime: '10:05 AM',
  });
  assert.equal(dupRes.status, 'duplicate');
  assert.ok(dupRes.firstScanTime && dupRes.firstScanTime.length > 0);
  assert.ok(dupRes.messageEn.includes('Already Marked'));

  // Invalid QR code returns not_found
  const invalidRes = processAutoIdCardScan({
    rawCode: 'INVALID-RANDOM-QR-999',
    schoolId: 'GPS-1042',
    students: INITIAL_STUDENTS,
    existingScans: INITIAL_KIOSK_SCANS,
    dateIso: '2026-11-19',
    scanTime: '10:05 AM',
  });
  assert.equal(invalidRes.status, 'not_found');

  // Teacher with assignedClasses=['Class 3'] cannot scan sadia if sadia is in another class
  const otherClass = sadia.className === 'Class 3' ? 'Class 5' : 'Class 3';
  const unauthClassRes = processAutoIdCardScan({
    rawCode: sadia.permanentId,
    schoolId: 'GPS-1042',
    students: INITIAL_STUDENTS,
    existingScans: INITIAL_KIOSK_SCANS,
    dateIso: '2026-11-19',
    scanTime: '10:06 AM',
    allowedClasses: [otherClass],
  });
  assert.equal(unauthClassRes.status, 'unauthorized_class');
});
