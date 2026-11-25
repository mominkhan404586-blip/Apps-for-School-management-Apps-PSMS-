import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_ATTENDANCE_HISTORY, INITIAL_EXAMS, INITIAL_KIOSK_SCANS, INITIAL_STUDENTS } from '../data/mockData';
import {
  buildAtRiskStudentAlerts,
  buildAttendanceTrendSeries,
  buildClassAttendanceSummary,
  buildExamPerformanceSeries,
  buildTermExamTrendComparison,
} from './performanceAnalytics';

test('buildAttendanceTrendSeries generates multi-day attendance metrics for a school', () => {
  const series = buildAttendanceTrendSeries({
    schoolId: 'GPS-1042',
    students: INITIAL_STUDENTS,
    attendanceHistory: INITIAL_ATTENDANCE_HISTORY,
    kioskScans: INITIAL_KIOSK_SCANS,
    days: 7,
    anchorDateIso: '2026-11-19',
  });

  assert.equal(series.length, 7);
  for (const pt of series) {
    assert.ok(pt.attendanceRatePct >= 0 && pt.attendanceRatePct <= 100);
    assert.equal(pt.presentCount + pt.lateCount + pt.absentCount, pt.totalCount);
  }
});

test('buildClassAttendanceSummary computes class-wise attendance and exam averages', () => {
  const rows = buildClassAttendanceSummary({
    schoolId: 'GPS-1042',
    students: INITIAL_STUDENTS,
    attendanceHistory: INITIAL_ATTENDANCE_HISTORY,
    kioskScans: INITIAL_KIOSK_SCANS,
    exams: INITIAL_EXAMS,
  });

  assert.ok(rows.length > 0);
  for (const row of rows) {
    assert.ok(row.studentCount > 0);
    assert.equal(row.presentCount + row.lateCount + row.absentCount, row.studentCount);
    assert.ok(row.attendanceRatePct >= 0 && row.attendanceRatePct <= 100);
  }
});

test('buildExamPerformanceSeries and buildTermExamTrendComparison aggregate exam scores and GPA', () => {
  const subjects = buildExamPerformanceSeries({
    schoolId: 'GPS-1042',
    exams: INITIAL_EXAMS,
  });
  assert.ok(subjects.length > 0);
  for (const sub of subjects) {
    assert.ok(sub.averagePct >= 0 && sub.averagePct <= 100);
    assert.ok(sub.avgGpa >= 0 && sub.avgGpa <= 5);
    assert.ok(sub.evaluatedCount > 0);
  }

  const terms = buildTermExamTrendComparison({
    schoolId: 'GPS-1042',
    exams: INITIAL_EXAMS,
  });
  assert.ok(terms.length > 0);
  assert.ok(terms.every((t) => t.averagePct >= 0 && t.passRatePct <= 100));
});

test('buildAtRiskStudentAlerts flags students below thresholds', () => {
  const alerts = buildAtRiskStudentAlerts({
    schoolId: 'GPS-1042',
    students: INITIAL_STUDENTS,
    exams: INITIAL_EXAMS,
    attendanceThreshold: 99,
    scoreThreshold: 95,
  });
  assert.ok(alerts.length > 0);
  assert.ok(alerts.every((a) => a.riskReasons.length > 0));
});
