import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExamPdfReportData } from './examReportGenerator';
import type { ExamRecord, SchoolRecord, StudentRecord } from '../types';

const sampleSchool: SchoolRecord = {
  id: 'sch-1',
  code: 'GPS-101',
  eiin: '104210',
  nameBn: 'আদর্শ সরকারি প্রাথমিক বিদ্যালয়',
  nameEn: 'Adarsha Govt Primary School',
  schoolType: 'PRIMARY',
  mobile: '01711000000',
  email: 'head@adarsha.edu.bd',
  cluster: 'Mirpur-1',
  division: 'Dhaka',
  district: 'Dhaka',
  upazila: 'Mirpur',
  union: 'Ward-10',
  village: 'Mirpur',
  fullAddress: 'Mirpur, Dhaka',
  addressSource: 'MANUAL',
  headTeacher: 'মো. আনোয়ার হোসেন',
  adminUsername: 'gps101',
  studentCount: 2,
  teacherCount: 2,
  classRange: 'Class 1 - Class 5',
  approvedClasses: ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5'],
  academicYear: '2026',
  status: 'active',
  registrationMethod: 'ONLINE',
  documents: [],
  verifiedDate: '2026-01-15',
  attendanceRate: 94,
};

const sampleStudents: StudentRecord[] = [
  {
    id: 'stu-1',
    permanentId: 'STU-2026-001',
    activationCode: 'ACT-001',
    guardianLinkCode: 'GLC-001',
    schoolId: 'sch-1',
    schoolNameBn: sampleSchool.nameBn,
    nameBn: 'তানজিম আহমেদ',
    nameEn: 'Tanzim Ahmed',
    dob: '2015-04-12',
    birthRegNo: '20152610000000001',
    gender: 'Male',
    fatherName: 'করিম আহমেদ',
    motherName: 'সালমা বেগম',
    guardianMobile: '01711111111',
    bloodGroup: 'A+',
    className: 'Class 5',
    section: 'ক (A)',
    roll: 1,
    status: 'active',
    attendancePct: 95,
    heightCm: 138,
    weightKg: 32,
    gpa: '5.00',
    stipendStatus: 'approved',
    admissionHistory: ['2026 Class 5'],
  },
  {
    id: 'stu-2',
    permanentId: 'STU-2026-002',
    activationCode: 'ACT-002',
    guardianLinkCode: 'GLC-002',
    schoolId: 'sch-1',
    schoolNameBn: sampleSchool.nameBn,
    nameBn: 'নাফিসা ইসলাম',
    nameEn: 'Nafisa Islam',
    dob: '2015-08-19',
    birthRegNo: '20152610000000002',
    gender: 'Female',
    fatherName: 'রফিকুল ইসলাম',
    motherName: 'নাসরিন ইসলাম',
    guardianMobile: '01722222222',
    bloodGroup: 'B+',
    className: 'Class 5',
    section: 'ক (A)',
    roll: 2,
    status: 'active',
    attendancePct: 88,
    heightCm: 135,
    weightKg: 30,
    gpa: '0.00',
    stipendStatus: 'pending',
    admissionHistory: ['2026 Class 5'],
  },
];

const sampleExam: ExamRecord = {
  id: 'exm-term1',
  schoolId: 'sch-1',
  titleBn: 'বার্ষিক মূল্যায়ন ২০২৬',
  titleEn: 'Annual Assessment 2026',
  className: 'Class 5',
  dateRange: '2026-11-10 - 2026-11-20',
  status: 'published',
  entries: [
    {
      studentId: 'stu-1',
      studentName: 'তানজিম আহমেদ',
      roll: 1,
      className: 'Class 5',
      subjectBn: 'গণিত',
      subjectEn: 'Mathematics',
      written: 72,
      oral: 10,
      continuous: 8,
      fullMarks: 100,
      passMarks: 33,
    },
    {
      studentId: 'stu-1',
      studentName: 'তানজিম আহমেদ',
      roll: 1,
      className: 'Class 5',
      subjectBn: 'বাংলা',
      subjectEn: 'Bangla',
      written: 68,
      oral: 9,
      continuous: 7,
      fullMarks: 100,
      passMarks: 33,
    },
    {
      studentId: 'stu-2',
      studentName: 'নাফিসা ইসলাম',
      roll: 2,
      className: 'Class 5',
      subjectBn: 'গণিত',
      subjectEn: 'Mathematics',
      written: 18,
      oral: 5,
      continuous: 4,
      fullMarks: 100,
      passMarks: 33,
    },
    {
      studentId: 'stu-2',
      studentName: 'নাফিসা ইসলাম',
      roll: 2,
      className: 'Class 5',
      subjectBn: 'বাংলা',
      subjectEn: 'Bangla',
      written: 62,
      oral: 8,
      continuous: 7,
      fullMarks: 100,
      passMarks: 33,
    },
  ],
};

test('buildExamPdfReportData computes accurate student totals, GPA, pass/fail, and rank ordering', () => {
  const report = buildExamPdfReportData({
    exam: sampleExam,
    school: sampleSchool,
    students: sampleStudents,
    nowIso: '2026-11-27T09:30:00Z',
  });

  assert.equal(report.schoolCode, 'GPS-101');
  assert.equal(report.generatedAtLabel, '2026-11-27 09:30');
  assert.equal(report.totalStudents, 2);
  assert.equal(report.passedCount, 1);
  assert.equal(report.failedCount, 1);
  assert.equal(report.passRatePct, 50);
  assert.equal(report.highestMarks, 174);
  assert.equal(report.rows.length, 2);

  const first = report.rows[0];
  assert.equal(first.studentId, 'stu-1');
  assert.equal(first.rank, 1);
  assert.equal(first.totalObtained, 174);
  assert.equal(first.totalFullMarks, 200);
  assert.equal(first.passed, true);
  assert.equal(first.gpa, 5);
  assert.equal(first.letterGrade, 'A+');

  const second = report.rows[1];
  assert.equal(second.studentId, 'stu-2');
  assert.equal(second.rank, 2);
  assert.equal(second.passed, false);
  assert.equal(second.gpa, 0);
  assert.equal(second.letterGrade, 'F');
});

test('buildExamPdfReportData filters to a single student marksheet while preserving class summary stats', () => {
  const report = buildExamPdfReportData({
    exam: sampleExam,
    school: sampleSchool,
    students: sampleStudents,
    selectedStudentId: 'stu-2',
  });

  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0].studentId, 'stu-2');
  assert.equal(report.rows[0].subjects.length, 2);
  assert.equal(report.totalStudents, 2);
  assert.equal(report.passedCount, 1);
});
