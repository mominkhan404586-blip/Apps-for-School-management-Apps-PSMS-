import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_ATTENDANCE_HISTORY, INITIAL_KIOSK_SCANS, INITIAL_SCHOOLS, INITIAL_STUDENTS } from './testFixtures';
import {
  buildAttendanceExportRows,
  buildStudentQrStickerList,
  enumerateDateRangeIso,
  generateAttendanceCsvContent,
  generateAttendanceExcelHtml,
  generatePrintableStickersHtml,
  getStickerLayoutSpec,
  sanitizeCsvCell,
} from './attendanceExportAndStickers';

test('enumerateDateRangeIso enumerates inclusive dates and clamps reversed bounds', () => {
  assert.deepEqual(enumerateDateRangeIso('2026-11-17', '2026-11-19'), [
    '2026-11-17',
    '2026-11-18',
    '2026-11-19',
  ]);
  assert.deepEqual(enumerateDateRangeIso('2026-11-19', '2026-11-17'), [
    '2026-11-17',
    '2026-11-18',
    '2026-11-19',
  ]);
});

test('buildAttendanceExportRows filters by class and multi-day date range with scan times & statuses', () => {
  const rows = buildAttendanceExportRows({
    schoolId: 'GPS-1042',
    schoolNameBn: 'মডেল সরকারি প্রাথমিক বিদ্যালয়',
    students: INITIAL_STUDENTS,
    kioskScans: INITIAL_KIOSK_SCANS,
    attendanceHistory: INITIAL_ATTENDANCE_HISTORY,
    classFilter: 'Class 4',
    startDateIso: '2026-11-18',
    endDateIso: '2026-11-19',
    todayIso: '2026-11-19',
  });

  const class4Students = INITIAL_STUDENTS.filter(
    (s) => s.schoolId === 'GPS-1042' && s.className === 'Class 4'
  );
  assert.equal(rows.length, class4Students.length * 2);
  assert.ok(rows.every((r) => r.className === 'Class 4'));

  const rahimToday = rows.find((r) => r.dateIso === '2026-11-19' && r.studentId === 'stu-rahim');
  assert.ok(rahimToday);
  assert.equal(rahimToday.status, 'present');
  assert.equal(rahimToday.scanTime, '09:08 AM');
});

test('generateAttendanceCsvContent includes UTF-8 BOM and prevents CSV formula injection', () => {
  assert.equal(sanitizeCsvCell('=cmd()'), "'=cmd()");
  assert.equal(sanitizeCsvCell('Hello, World'), '"Hello, World"');

  const rows = buildAttendanceExportRows({
    schoolId: 'GPS-1042',
    schoolNameBn: 'মডেল সরকারি প্রাথমিক বিদ্যালয়',
    students: INITIAL_STUDENTS,
    kioskScans: INITIAL_KIOSK_SCANS,
    attendanceHistory: INITIAL_ATTENDANCE_HISTORY,
    classFilter: 'All',
    startDateIso: '2026-11-19',
    endDateIso: '2026-11-19',
    todayIso: '2026-11-19',
  });

  const csv = generateAttendanceCsvContent(rows);
  assert.ok(csv.startsWith('\uFEFFDate,School ID,School Name'));
  assert.ok(csv.includes('STD-2026-GPS1042-0012'));
  assert.ok(csv.includes('09:08 AM'));
});

test('generateAttendanceExcelHtml generates valid spreadsheet markup with school metadata & totals', () => {
  const rows = buildAttendanceExportRows({
    schoolId: 'GPS-1042',
    schoolNameBn: 'মডেল সরকারি প্রাথমিক বিদ্যালয়',
    students: INITIAL_STUDENTS,
    kioskScans: INITIAL_KIOSK_SCANS,
    attendanceHistory: INITIAL_ATTENDANCE_HISTORY,
    classFilter: 'All',
    startDateIso: '2026-11-19',
    endDateIso: '2026-11-19',
    todayIso: '2026-11-19',
  });

  const html = generateAttendanceExcelHtml({
    schoolNameBn: 'মডেল সরকারি প্রাথমিক বিদ্যালয়',
    schoolId: 'GPS-1042',
    classFilter: 'All',
    startDateIso: '2026-11-19',
    endDateIso: '2026-11-19',
    rows,
  });

  assert.ok(html.includes('<x:ExcelWorkbook>'));
  assert.ok(html.includes('GPS-1042'));
  assert.ok(html.includes('STD-2026-GPS1042-0012'));
  assert.ok(html.includes('Present'));
});

test('buildStudentQrStickerList & generatePrintableStickersHtml format adhesive QR stickers with student ID & school metadata', () => {
  const school = INITIAL_SCHOOLS[0];
  const schoolStudents = INITIAL_STUDENTS.filter((s) => s.schoolId === school.id);
  const stickers = buildStudentQrStickerList(schoolStudents, school);

  assert.equal(stickers.length, schoolStudents.length);
  assert.ok(stickers.every((st) => st.schoolPublicId === school.schoolPublicId));
  assert.ok(stickers.every((st) => st.eiin === school.eiin));
  assert.ok(stickers.every((st) => st.qrPayload.includes(st.permanentId)));

  const spec = getStickerLayoutSpec('3x8');
  assert.equal(spec.columns, 3);
  assert.equal(spec.perPage, 24);

  const printableHtml = generatePrintableStickersHtml(
    stickers.map((s) => ({ ...s, qrDataUrl: 'data:image/png;base64,TESTQR' })),
    '3x8'
  );
  assert.ok(printableHtml.includes('grid-template-columns: repeat(3, 63.5mm)'));
  assert.ok(printableHtml.includes(school.schoolPublicId!));
  assert.ok(printableHtml.includes('data:image/png;base64,TESTQR'));
});
