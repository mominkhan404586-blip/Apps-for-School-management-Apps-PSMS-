import type { Role, StudentRecord, ExamMarkEntry } from '../types';

export interface GradeResult {
  totalObtained: number;
  percentage: number;
  letterGrade: 'A+' | 'A' | 'A-' | 'B' | 'C' | 'D' | 'F';
  gpa: number;
  passed: boolean;
}

/**
 * Computes Bangladesh NCTB standard Letter Grade and GPA from obtained marks.
 */
export function calculateBDGradeAndGPA(
  obtainedMarks: number,
  fullMarks = 100,
  passMarks = 33
): GradeResult {
  const safeFull = fullMarks > 0 ? fullMarks : 100;
  const clamped = Math.max(0, Math.min(obtainedMarks, safeFull));
  const percentage = Number(((clamped / safeFull) * 100).toFixed(2));
  const passPercent = (passMarks / safeFull) * 100;

  if (percentage < passPercent) {
    return { totalObtained: clamped, percentage, letterGrade: 'F', gpa: 0.0, passed: false };
  }
  if (percentage >= 80) return { totalObtained: clamped, percentage, letterGrade: 'A+', gpa: 5.0, passed: true };
  if (percentage >= 70) return { totalObtained: clamped, percentage, letterGrade: 'A', gpa: 4.0, passed: true };
  if (percentage >= 60) return { totalObtained: clamped, percentage, letterGrade: 'A-', gpa: 3.5, passed: true };
  if (percentage >= 50) return { totalObtained: clamped, percentage, letterGrade: 'B', gpa: 3.0, passed: true };
  if (percentage >= 40) return { totalObtained: clamped, percentage, letterGrade: 'C', gpa: 2.0, passed: true };
  return { totalObtained: clamped, percentage, letterGrade: 'D', gpa: 1.0, passed: true };
}

export interface StudentMeritSummary {
  studentId: string;
  studentName: string;
  roll: number;
  totalObtained: number;
  totalFull: number;
  gpa: number;
  letterGrade: string;
  passed: boolean;
  rank: number;
}

export function computeStudentMeritList(entries: ExamMarkEntry[]): StudentMeritSummary[] {
  const grouped = new Map<string, { name: string; roll: number; items: ExamMarkEntry[] }>();

  for (const entry of entries) {
    const existing = grouped.get(entry.studentId);
    if (existing) {
      existing.items.push(entry);
    } else {
      grouped.set(entry.studentId, { name: entry.studentName, roll: entry.roll, items: [entry] });
    }
  }

  const summaries: Omit<StudentMeritSummary, 'rank'>[] = [];
  for (const [studentId, group] of grouped.entries()) {
    let totalObtained = 0;
    let totalFull = 0;
    let gpaSum = 0;
    let anyFailed = false;

    for (const item of group.items) {
      const sum = item.written + item.oral + item.continuous;
      const grade = calculateBDGradeAndGPA(sum, item.fullMarks, item.passMarks);
      totalObtained += grade.totalObtained;
      totalFull += item.fullMarks;
      gpaSum += grade.gpa;
      if (!grade.passed) anyFailed = true;
    }

    const avgGpa = anyFailed ? 0.0 : Number((gpaSum / group.items.length).toFixed(2));
    const overallPct = totalFull > 0 ? (totalObtained / totalFull) * 100 : 0;
    const overallGrade = anyFailed ? 'F' : calculateBDGradeAndGPA(overallPct, 100, 33).letterGrade;

    summaries.push({
      studentId,
      studentName: group.name,
      roll: group.roll,
      totalObtained,
      totalFull,
      gpa: avgGpa,
      letterGrade: overallGrade,
      passed: !anyFailed,
    });
  }

  summaries.sort((a, b) => {
    if (a.passed !== b.passed) return a.passed ? -1 : 1;
    if (b.gpa !== a.gpa) return b.gpa - a.gpa;
    if (b.totalObtained !== a.totalObtained) return b.totalObtained - a.totalObtained;
    return a.roll - b.roll;
  });

  return summaries.map((s, idx) => ({ ...s, rank: idx + 1 }));
}

export interface BmiResult {
  bmi: number;
  categoryBn: string;
  categoryEn: string;
}

export function calculateBMI(heightCm: number, weightKg: number): BmiResult {
  if (heightCm <= 0 || weightKg <= 0) {
    return { bmi: 0, categoryBn: 'তথ্য নেই', categoryEn: 'No Data' };
  }
  const meters = heightCm / 100;
  const bmi = Number((weightKg / (meters * meters)).toFixed(1));
  if (bmi < 14.5) return { bmi, categoryBn: 'কম ওজন (পুষ্টি পর্যবেক্ষণ)', categoryEn: 'Underweight' };
  if (bmi <= 21.5) return { bmi, categoryBn: 'স্বাভাবিক ওজন', categoryEn: 'Healthy' };
  return { bmi, categoryBn: 'অতিরিক্ত ওজন', categoryEn: 'Overweight' };
}

/**
 * Strict RBAC: Enforces Central Admin full access, School Admin own-school isolation,
 * and blocks Guardian from School/System management records.
 */
export function canAccessSchoolData(
  actorRole: Role,
  actorSchoolId: string | null,
  targetSchoolId: string
): boolean {
  if (actorRole === 'central_admin') return true;
  if (actorRole === 'school_admin') {
    return Boolean(actorSchoolId) && actorSchoolId === targetSchoolId;
  }
  return false;
}

/**
 * Strict RBAC: Enforces Central Admin full student access, School Admin own-school students only,
 * and Guardian own linked child(ren) only.
 */
export function canAccessStudentData(
  actorRole: Role,
  actorSchoolId: string | null,
  actorChildIds: string[],
  targetStudentId: string,
  targetStudentSchoolId: string
): boolean {
  if (actorRole === 'central_admin') return true;
  if (actorRole === 'school_admin') {
    return Boolean(actorSchoolId) && actorSchoolId === targetStudentSchoolId;
  }
  if (actorRole === 'guardian') {
    return actorChildIds.includes(targetStudentId);
  }
  return false;
}

export function generateStudentCodes(
  serialNumber: number,
  schoolCode: string,
  admissionYear = 2026
): { permanentId: string; activationCode: string; guardianLinkCode: string } {
  const padded = String(Math.max(1, serialNumber)).padStart(4, '0');
  const cleanCode = schoolCode.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8) || 'SCH';
  return {
    permanentId: `STD-${admissionYear}-${cleanCode}-${padded}`,
    activationCode: `ACT-${padded}-${(serialNumber * 73 + 19) % 90 + 10}`,
    guardianLinkCode: `GLC-${cleanCode}-${padded}`,
  };
}

export function filterStudents(
  students: StudentRecord[],
  query: string,
  classFilter = 'all'
): StudentRecord[] {
  const q = query.trim().toLowerCase();
  return students.filter((s) => {
    const matchesClass = classFilter === 'all' || s.className === classFilter;
    if (!matchesClass) return false;
    if (!q) return true;
    return (
      s.nameBn.toLowerCase().includes(q) ||
      s.nameEn.toLowerCase().includes(q) ||
      s.permanentId.toLowerCase().includes(q) ||
      s.guardianMobile.includes(q) ||
      String(s.roll).includes(q)
    );
  });
}

export function studentsToCsv(students: StudentRecord[]): string {
  const headers = ['Permanent ID', 'Name (BN)', 'Name (EN)', 'Class', 'Section', 'Roll', 'Guardian Mobile', 'Blood Group', 'Attendance %', 'Status'];
  const rows = students.map((s) => [
    s.permanentId,
    `"${s.nameBn}"`,
    `"${s.nameEn}"`,
    `"${s.className}"`,
    s.section,
    s.roll,
    s.guardianMobile,
    s.bloodGroup,
    s.attendancePct,
    s.status,
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
