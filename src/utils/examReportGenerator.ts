import type {
  ExamMarkEntry,
  ExamRecord,
  GradingRuleItem,
  SchoolRecord,
  StudentRecord,
} from '../types';
import {
  DEFAULT_NCTB_GRADING_RULES,
  calculateCustomGradeAndGPA,
  computeEntryTotalMarks,
} from './academicEngine';

export interface PrintableSubjectMarkRow {
  subjectBn: string;
  subjectEn: string;
  written: number;
  mcq: number;
  oralAndCa: number;
  obtained: number;
  fullMarks: number;
  passMarks: number;
  percentage: number;
  letterGrade: string;
  gpa: number;
  passed: boolean;
}

export interface PrintableStudentReportRow {
  studentId: string;
  studentName: string;
  roll: number;
  className: string;
  section?: string;
  subjects: PrintableSubjectMarkRow[];
  totalObtained: number;
  totalFullMarks: number;
  percentage: number;
  gpa: number;
  letterGrade: string;
  passed: boolean;
  rank: number;
}

export interface PrintableExamPdfReport {
  examId: string;
  examTitleBn: string;
  examTitleEn: string;
  className: string;
  dateRange: string;
  schoolNameBn: string;
  schoolNameEn: string;
  schoolCode: string;
  schoolEiin: string;
  headTeacher: string;
  generatedAtLabel: string;
  totalStudents: number;
  passedCount: number;
  failedCount: number;
  passRatePct: number;
  highestMarks: number;
  averagePct: number;
  rows: PrintableStudentReportRow[];
}

export function buildExamPdfReportData(params: {
  exam: ExamRecord;
  school?: SchoolRecord;
  students?: StudentRecord[];
  gradingRules?: GradingRuleItem[];
  selectedStudentId?: string;
  nowIso?: string;
}): PrintableExamPdfReport {
  const {
    exam,
    school,
    students = [],
    gradingRules = DEFAULT_NCTB_GRADING_RULES,
    selectedStudentId,
    nowIso,
  } = params;

  const byStudent = new Map<
    string,
    {
      studentId: string;
      studentName: string;
      roll: number;
      className: string;
      section?: string;
      entries: ExamMarkEntry[];
    }
  >();

  for (const entry of exam.entries) {
    const matchedStudent = students.find((s) => s.id === entry.studentId);
    const existing = byStudent.get(entry.studentId);
    if (existing) {
      existing.entries.push(entry);
    } else {
      byStudent.set(entry.studentId, {
        studentId: entry.studentId,
        studentName: matchedStudent?.nameBn || entry.studentName,
        roll: matchedStudent?.roll ?? entry.roll,
        className: matchedStudent?.className || entry.className || exam.className,
        section: matchedStudent?.section || exam.section,
        entries: [entry],
      });
    }
  }

  const allStudentRows: PrintableStudentReportRow[] = Array.from(byStudent.values()).map(
    (bucket) => {
      const subjects: PrintableSubjectMarkRow[] = bucket.entries.map((entry) => {
        const obtained = computeEntryTotalMarks(entry);
        const fullMarks = entry.fullMarks > 0 ? entry.fullMarks : 100;
        const passMarks = entry.passMarks > 0 ? entry.passMarks : Math.round(fullMarks * 0.33);
        const grade = calculateCustomGradeAndGPA(obtained, fullMarks, passMarks, gradingRules);
        return {
          subjectBn: entry.subjectBn,
          subjectEn: entry.subjectEn,
          written: entry.written,
          mcq: entry.mcq ?? 0,
          oralAndCa: entry.oral + entry.continuous,
          obtained,
          fullMarks,
          passMarks,
          percentage: grade.percentage,
          letterGrade: grade.letterGrade,
          gpa: grade.gpa,
          passed: grade.passed,
        };
      });

      const totalObtained = subjects.reduce((sum, s) => sum + s.obtained, 0);
      const totalFullMarks = subjects.reduce((sum, s) => sum + s.fullMarks, 0);
      const anyFailed = subjects.some((s) => !s.passed);
      const avgGpa =
        subjects.length > 0
          ? Number(
              (
                subjects.reduce((sum, s) => sum + s.gpa, 0) / subjects.length
              ).toFixed(2)
            )
          : 0;
      const overallPct =
        totalFullMarks > 0
          ? Number(((totalObtained / totalFullMarks) * 100).toFixed(2))
          : 0;

      const overallGrade = anyFailed
        ? 'F'
        : calculateCustomGradeAndGPA(
            totalObtained,
            totalFullMarks || 100,
            Math.round((totalFullMarks || 100) * 0.33),
            gradingRules
          ).letterGrade;

      return {
        studentId: bucket.studentId,
        studentName: bucket.studentName,
        roll: bucket.roll,
        className: bucket.className,
        section: bucket.section,
        subjects,
        totalObtained,
        totalFullMarks,
        percentage: overallPct,
        gpa: anyFailed ? 0 : avgGpa,
        letterGrade: overallGrade,
        passed: !anyFailed && subjects.length > 0,
        rank: 1,
      };
    }
  );

  allStudentRows.sort((a, b) => {
    if (a.passed !== b.passed) return a.passed ? -1 : 1;
    if (b.totalObtained !== a.totalObtained) return b.totalObtained - a.totalObtained;
    return a.roll - b.roll;
  });

  allStudentRows.forEach((row, index) => {
    row.rank = index + 1;
  });

  const filteredRows = selectedStudentId
    ? allStudentRows.filter((r) => r.studentId === selectedStudentId)
    : allStudentRows;

  const passedCount = allStudentRows.filter((r) => r.passed).length;
  const totalStudents = allStudentRows.length;
  const failedCount = Math.max(0, totalStudents - passedCount);
  const passRatePct =
    totalStudents > 0 ? Math.round((passedCount / totalStudents) * 100) : 0;
  const highestMarks =
    allStudentRows.length > 0
      ? Math.max(...allStudentRows.map((r) => r.totalObtained))
      : 0;
  const averagePct =
    allStudentRows.length > 0
      ? Number(
          (
            allStudentRows.reduce((sum, r) => sum + r.percentage, 0) /
            allStudentRows.length
          ).toFixed(1)
        )
      : 0;

  const generatedAtLabel = (nowIso ?? new Date().toISOString())
    .replace('T', ' ')
    .slice(0, 16);

  return {
    examId: exam.id,
    examTitleBn: exam.titleBn,
    examTitleEn: exam.titleEn,
    className: exam.className,
    dateRange: exam.dateRange,
    schoolNameBn: school?.nameBn || 'প্রাথমিক ও মাধ্যমিক বিদ্যালয় (PSMS Bangladesh)',
    schoolNameEn: school?.nameEn || 'Primary & Secondary School (PSMS Bangladesh)',
    schoolCode: school?.code || exam.schoolId || 'PSMS-BD',
    schoolEiin: school?.eiin || '—',
    headTeacher: school?.headTeacher || 'Head Teacher',
    generatedAtLabel,
    totalStudents,
    passedCount,
    failedCount,
    passRatePct,
    highestMarks,
    averagePct,
    rows: filteredRows,
  };
}
