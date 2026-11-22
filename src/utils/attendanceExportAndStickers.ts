import type {
  KioskScanEvent,
  SchoolRecord,
  StudentAttendanceHistoryEntry,
  StudentRecord,
} from '../types';

export type AttendanceExportStatus = 'present' | 'late' | 'absent' | 'leave';

export interface AttendanceExportRow {
  dateIso: string;
  schoolId: string;
  schoolNameBn: string;
  studentId: string;
  permanentId: string;
  digitalIdSerial: string;
  studentNameBn: string;
  studentNameEn: string;
  className: string;
  section: string;
  roll: number;
  status: AttendanceExportStatus;
  statusLabelBn: string;
  statusLabelEn: string;
  scanTime: string;
  source: string;
  guardianNotified: boolean;
}

export interface StudentQrStickerData {
  studentId: string;
  permanentId: string;
  digitalIdSerial: string;
  nameBn: string;
  nameEn: string;
  className: string;
  section: string;
  roll: number;
  bloodGroup: string;
  schoolId: string;
  schoolPublicId: string;
  schoolCode: string;
  eiin: string;
  schoolNameBn: string;
  schoolNameEn: string;
  qrPayload: string;
}

export type StickerSheetLayout = '3x8' | '2x5' | 'compact';

export interface StickerLayoutSpec {
  id: StickerSheetLayout;
  titleBn: string;
  titleEn: string;
  columns: number;
  perPage: number;
  widthMm: number;
  heightMm: number;
}

export const STICKER_LAYOUT_SPECS: Record<StickerSheetLayout, StickerLayoutSpec> = {
  '3x8': {
    id: '3x8',
    titleBn: 'A4 স্টিকার শীট (৩×৮ = ২৪টি লেবেল)',
    titleEn: 'A4 Adhesive Sheet (3×8 · 24 labels)',
    columns: 3,
    perPage: 24,
    widthMm: 63.5,
    heightMm: 33.9,
  },
  '2x5': {
    id: '2x5',
    titleBn: 'বড় ID কার্ড স্টিকার (২×৫ = ১০টি লেবেল)',
    titleEn: 'Large Card Label (2×5 · 10 labels)',
    columns: 2,
    perPage: 10,
    widthMm: 99,
    heightMm: 57,
  },
  compact: {
    id: 'compact',
    titleBn: 'কম্প্যাক্ট ব্যাজ স্ট্রিপ (৪×৮ = ৩২টি)',
    titleEn: 'Compact Strip (4×8 · 32 labels)',
    columns: 4,
    perPage: 32,
    widthMm: 45,
    heightMm: 28,
  },
};

export function getStickerLayoutSpec(layout: StickerSheetLayout): StickerLayoutSpec {
  return STICKER_LAYOUT_SPECS[layout] ?? STICKER_LAYOUT_SPECS['3x8'];
}

export function enumerateDateRangeIso(
  startDateIso: string,
  endDateIso: string,
  maxDays = 62
): string[] {
  const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoPattern.test(startDateIso) || !isoPattern.test(endDateIso)) {
    return isoPattern.test(startDateIso)
      ? [startDateIso]
      : isoPattern.test(endDateIso)
        ? [endDateIso]
        : ['2026-11-19'];
  }
  const [sy, sm, sd] = startDateIso.split('-').map(Number);
  const [ey, em, ed] = endDateIso.split('-').map(Number);
  let start = Date.UTC(sy, sm - 1, sd);
  let end = Date.UTC(ey, em - 1, ed);
  if (start > end) {
    const tmp = start;
    start = end;
    end = tmp;
  }
  const dates: string[] = [];
  const oneDayMs = 86_400_000;
  for (let ts = start; ts <= end && dates.length < maxDays; ts += oneDayMs) {
    const d = new Date(ts);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

const STATUS_META: Record<AttendanceExportStatus, { bn: string; en: string }> = {
  present: { bn: 'উপস্থিত', en: 'Present' },
  late: { bn: 'বিলম্বিত', en: 'Late' },
  absent: { bn: 'অনুপস্থিত', en: 'Absent' },
  leave: { bn: 'ছুটি', en: 'Leave' },
};

export function buildAttendanceExportRows(params: {
  schoolId: string;
  schoolNameBn: string;
  students: StudentRecord[];
  kioskScans: KioskScanEvent[];
  attendanceHistory: StudentAttendanceHistoryEntry[];
  classFilter?: string;
  startDateIso: string;
  endDateIso: string;
  todayIso: string;
  manualOverrides?: Record<string, 'present' | 'late' | 'absent'>;
}): AttendanceExportRow[] {
  const {
    schoolId,
    schoolNameBn,
    students,
    kioskScans,
    attendanceHistory,
    classFilter = 'All',
    startDateIso,
    endDateIso,
    todayIso,
    manualOverrides = {},
  } = params;

  const dates = enumerateDateRangeIso(startDateIso, endDateIso);
  const scopedStudents = students
    .filter((s) => s.schoolId === schoolId)
    .filter((s) => classFilter === 'All' || s.className === classFilter)
    .slice()
    .sort((a, b) => {
      const clsCmp = a.className.localeCompare(b.className);
      return clsCmp !== 0 ? clsCmp : a.roll - b.roll;
    });

  const rows: AttendanceExportRow[] = [];

  for (const dateIso of dates) {
    for (const stu of scopedStudents) {
      const matchingScan = kioskScans.find(
        (k) => k.studentId === stu.id && (k.dateIso ? k.dateIso === dateIso : dateIso === todayIso)
      );
      const matchingHistory = attendanceHistory.find(
        (h) => h.studentId === stu.id && h.dateIso === dateIso && h.schoolId === schoolId
      );

      let status: AttendanceExportStatus = 'absent';
      let scanTime = '—';
      let source = '—';
      let guardianNotified = false;

      if (dateIso === todayIso && manualOverrides[stu.id]) {
        status = manualOverrides[stu.id];
        scanTime =
          status === 'absent'
            ? '—'
            : matchingScan?.scanTime ?? matchingHistory?.scanTime ?? 'Manual';
        source = 'manual_teacher';
        guardianNotified = Boolean(matchingHistory?.guardianNotified);
      } else if (matchingScan) {
        status = matchingScan.attendanceState;
        scanTime = matchingScan.scanTime;
        source = matchingScan.source ?? 'auto_camera';
        guardianNotified = Boolean(matchingHistory?.guardianNotified);
      } else if (matchingHistory) {
        status = matchingHistory.status;
        scanTime = matchingHistory.scanTime ?? '—';
        source = matchingHistory.source ?? 'auto_camera';
        guardianNotified = Boolean(matchingHistory.guardianNotified);
      }

      const meta = STATUS_META[status];
      rows.push({
        dateIso,
        schoolId,
        schoolNameBn,
        studentId: stu.id,
        permanentId: stu.permanentId,
        digitalIdSerial: stu.digitalIdSerial ?? stu.permanentId,
        studentNameBn: stu.nameBn,
        studentNameEn: stu.nameEn,
        className: stu.className,
        section: stu.section,
        roll: stu.roll,
        status,
        statusLabelBn: meta.bn,
        statusLabelEn: meta.en,
        scanTime,
        source,
        guardianNotified,
      });
    }
  }

  return rows;
}

export function sanitizeCsvCell(value: string | number | boolean): string {
  const str = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function generateAttendanceCsvContent(rows: AttendanceExportRow[]): string {
  const headers = [
    'Date',
    'School ID',
    'School Name',
    'Permanent Student ID',
    'Digital ID Serial',
    'Student Name (BN)',
    'Student Name (EN)',
    'Class',
    'Section',
    'Roll',
    'Status',
    'Status (BN)',
    'Scan Time',
    'Capture Source',
    'Guardian Notified',
  ];

  const lines = [
    headers.map(sanitizeCsvCell).join(','),
    ...rows.map((r) =>
      [
        r.dateIso,
        r.schoolId,
        r.schoolNameBn,
        r.permanentId,
        r.digitalIdSerial,
        r.studentNameBn,
        r.studentNameEn,
        r.className,
        r.section,
        r.roll,
        r.statusLabelEn,
        r.statusLabelBn,
        r.scanTime,
        r.source,
        r.guardianNotified ? 'Yes' : 'No',
      ]
        .map(sanitizeCsvCell)
        .join(',')
    ),
  ];

  return `\uFEFF${lines.join('\r\n')}`;
}

export function escapeHtml(raw: string | number | boolean | undefined): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateAttendanceExcelHtml(params: {
  schoolNameBn: string;
  schoolId: string;
  classFilter: string;
  startDateIso: string;
  endDateIso: string;
  rows: AttendanceExportRow[];
}): string {
  const { schoolNameBn, schoolId, classFilter, startDateIso, endDateIso, rows } = params;
  const presentCount = rows.filter((r) => r.status === 'present').length;
  const lateCount = rows.filter((r) => r.status === 'late').length;
  const absentCount = rows.filter((r) => r.status === 'absent').length;

  const bodyRows = rows
    .map((r) => {
      const statusBg =
        r.status === 'present'
          ? '#dcfce7'
          : r.status === 'late'
            ? '#fef3c7'
            : r.status === 'leave'
              ? '#e0e7ff'
              : '#fee2e2';
      const statusColor =
        r.status === 'present'
          ? '#166534'
          : r.status === 'late'
            ? '#92400e'
            : r.status === 'leave'
              ? '#3730a3'
              : '#991b1b';

      return `<tr>
        <td>${escapeHtml(r.dateIso)}</td>
        <td>${escapeHtml(r.permanentId)}</td>
        <td>${escapeHtml(r.digitalIdSerial)}</td>
        <td>${escapeHtml(r.studentNameBn)}</td>
        <td>${escapeHtml(r.studentNameEn)}</td>
        <td>${escapeHtml(r.className)}</td>
        <td>${escapeHtml(r.section)}</td>
        <td style="text-align:center;">${escapeHtml(r.roll)}</td>
        <td style="background:${statusBg};color:${statusColor};font-weight:bold;text-align:center;">${escapeHtml(r.statusLabelEn)} (${escapeHtml(r.statusLabelBn)})</td>
        <td style="text-align:center;">${escapeHtml(r.scanTime)}</td>
        <td>${escapeHtml(r.source)}</td>
        <td style="text-align:center;">${r.guardianNotified ? 'Yes' : 'No'}</td>
      </tr>`;
    })
    .join('\n');

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8" />
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Daily Attendance</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10pt; }
  th { background: #0f1f3d; color: #ffffff; font-weight: bold; text-align: left; }
</style>
</head>
<body>
  <table>
    <tr><td colspan="12" style="font-size:14pt;font-weight:bold;background:#ecfdf5;color:#065f46;">${escapeHtml(schoolNameBn)} (${escapeHtml(schoolId)}) — Attendance Report</td></tr>
    <tr><td colspan="12">Class Filter: ${escapeHtml(classFilter)} | Date Range: ${escapeHtml(startDateIso)} to ${escapeHtml(endDateIso)} | Rows: ${rows.length} | Present: ${presentCount} | Late: ${lateCount} | Absent: ${absentCount}</td></tr>
    <tr>
      <th>Date</th>
      <th>Permanent Student ID</th>
      <th>Digital ID Serial</th>
      <th>Student Name (BN)</th>
      <th>Student Name (EN)</th>
      <th>Class</th>
      <th>Section</th>
      <th>Roll</th>
      <th>Status</th>
      <th>Scan Time</th>
      <th>Source</th>
      <th>Guardian Notified</th>
    </tr>
    ${bodyRows}
  </table>
</body>
</html>`;
}

export function buildStudentQrPayload(student: StudentRecord, school?: SchoolRecord): string {
  if (student.qrPayload && student.qrPayload.trim()) {
    return student.qrPayload.trim();
  }
  const schoolCode = school?.schoolPublicId ?? school?.code ?? student.schoolId;
  const serial = student.digitalIdSerial ?? student.permanentId;
  return `PSMS-QR|${student.permanentId}|${schoolCode}|${serial}`;
}

export function buildStudentQrStickerList(
  students: StudentRecord[],
  schoolMeta?: Partial<Pick<SchoolRecord, 'id' | 'code' | 'schoolPublicId' | 'eiin' | 'nameBn' | 'nameEn'>>
): StudentQrStickerData[] {
  return students
    .slice()
    .sort((a, b) => {
      const clsCmp = a.className.localeCompare(b.className);
      return clsCmp !== 0 ? clsCmp : a.roll - b.roll;
    })
    .map((stu) => {
      const schoolPublicId = schoolMeta?.schoolPublicId ?? schoolMeta?.code ?? stu.schoolId;
      const schoolCode = schoolMeta?.code ?? stu.schoolId;
      const digitalSerial = stu.digitalIdSerial ?? stu.permanentId;
      return {
        studentId: stu.id,
        permanentId: stu.permanentId,
        digitalIdSerial: digitalSerial,
        nameBn: stu.nameBn,
        nameEn: stu.nameEn,
        className: stu.className,
        section: stu.section,
        roll: stu.roll,
        bloodGroup: stu.bloodGroup,
        schoolId: schoolMeta?.id ?? stu.schoolId,
        schoolPublicId,
        schoolCode,
        eiin: schoolMeta?.eiin ?? '—',
        schoolNameBn: schoolMeta?.nameBn ?? stu.schoolNameBn,
        schoolNameEn: schoolMeta?.nameEn ?? stu.schoolNameBn,
        qrPayload:
          stu.qrPayload?.trim() || `PSMS-QR|${stu.permanentId}|${schoolCode}|${digitalSerial}`,
      };
    });
}

export function generatePrintableStickersHtml(
  stickers: Array<StudentQrStickerData & { qrDataUrl: string }>,
  layout: StickerSheetLayout,
  options: { showSchoolMeta?: boolean; showDigitalSerial?: boolean } = {}
): string {
  const spec = getStickerLayoutSpec(layout);
  const showSchoolMeta = options.showSchoolMeta !== false;
  const showDigitalSerial = options.showDigitalSerial !== false;

  const cards = stickers
    .map(
      (st) => `<div class="sticker">
        <div class="qr-box">
          <img src="${escapeHtml(st.qrDataUrl)}" alt="QR ${escapeHtml(st.permanentId)}" />
        </div>
        <div class="meta">
          ${showSchoolMeta ? `<div class="school">${escapeHtml(st.schoolNameBn)} (${escapeHtml(st.schoolPublicId)} · EIIN ${escapeHtml(st.eiin)})</div>` : ''}
          <div class="name">${escapeHtml(st.nameBn)}</div>
          <div class="sub">${escapeHtml(st.className)} (${escapeHtml(st.section)}) · Roll #${escapeHtml(st.roll)} · ${escapeHtml(st.bloodGroup)}</div>
          <div class="pid">${escapeHtml(st.permanentId)}</div>
          ${showDigitalSerial ? `<div class="serial">${escapeHtml(st.digitalIdSerial)}</div>` : ''}
        </div>
      </div>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8" />
<title>Student QR Adhesive Stickers</title>
<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, 'Hind Siliguri', sans-serif; background: #fff; color: #0f172a; padding: 6mm; }
  .sheet {
    display: grid;
    grid-template-columns: repeat(${spec.columns}, ${spec.widthMm}mm);
    gap: 3mm;
    justify-content: center;
  }
  .sticker {
    width: ${spec.widthMm}mm;
    height: ${spec.heightMm}mm;
    border: 1px dashed #94a3b8;
    border-radius: 3mm;
    padding: 2mm;
    display: flex;
    align-items: center;
    gap: 2mm;
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .qr-box { width: ${Math.max(18, Math.round(spec.heightMm * 0.72))}mm; height: ${Math.max(18, Math.round(spec.heightMm * 0.72))}mm; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .qr-box img { width: 100%; height: 100%; object-fit: contain; }
  .meta { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 0.6mm; }
  .school { font-size: 6.5pt; font-weight: 700; color: #047857; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .name { font-size: 8.5pt; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sub { font-size: 7pt; color: #334155; }
  .pid { font-family: monospace; font-size: 7pt; font-weight: 700; color: #1d4ed8; }
  .serial { font-family: monospace; font-size: 6pt; color: #64748b; }
  @media print {
    body { padding: 0; }
    .no-print-bar { display: none !important; }
  }
</style>
</head>
<body>
  <div class="no-print-bar" style="margin-bottom:10px;text-align:center;font-size:12px;color:#475569;">
    Ready for Adhesive ID Card Labels (${escapeHtml(spec.titleEn)}) · Press Ctrl/Cmd + P to print
  </div>
  <div class="sheet">${cards}</div>
</body>
</html>`;
}
