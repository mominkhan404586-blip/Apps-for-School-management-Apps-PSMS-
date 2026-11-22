import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBDGradeAndGPA,
  computeStudentMeritList,
  calculateBMI,
  canAccessSchoolData,
  canAccessStudentData,
  generateStudentCodes,
} from './rbacAndGrading';

test('calculateBDGradeAndGPA computes standard NCTB grades accurately', () => {
  const aPlus = calculateBDGradeAndGPA(86, 100, 33);
  assert.equal(aPlus.letterGrade, 'A+');
  assert.equal(aPlus.gpa, 5.0);
  assert.equal(aPlus.passed, true);

  const aMinus = calculateBDGradeAndGPA(64, 100, 33);
  assert.equal(aMinus.letterGrade, 'A-');
  assert.equal(aMinus.gpa, 3.5);

  const failed = calculateBDGradeAndGPA(29, 100, 33);
  assert.equal(failed.letterGrade, 'F');
  assert.equal(failed.gpa, 0.0);
  assert.equal(failed.passed, false);
});

test('computeStudentMeritList ranks students by pass status, GPA, and total marks', () => {
  const merit = computeStudentMeritList([
    {
      studentId: 's1',
      studentName: 'রাহিম',
      roll: 12,
      subjectBn: 'বাংলা',
      subjectEn: 'Bangla',
      written: 68,
      oral: 10,
      continuous: 9,
      fullMarks: 100,
      passMarks: 33,
    },
    {
      studentId: 's2',
      studentName: 'তাসনিম',
      roll: 3,
      subjectBn: 'বাংলা',
      subjectEn: 'Bangla',
      written: 74,
      oral: 10,
      continuous: 10,
      fullMarks: 100,
      passMarks: 33,
    },
    {
      studentId: 's3',
      studentName: 'রাকিব',
      roll: 5,
      subjectBn: 'বাংলা',
      subjectEn: 'Bangla',
      written: 15,
      oral: 5,
      continuous: 5,
      fullMarks: 100,
      passMarks: 33,
    },
  ]);

  assert.equal(merit[0].studentId, 's2');
  assert.equal(merit[0].rank, 1);
  assert.equal(merit[1].studentId, 's1');
  assert.equal(merit[1].rank, 2);
  assert.equal(merit[2].studentId, 's3');
  assert.equal(merit[2].passed, false);
  assert.equal(merit[2].rank, 3);
});

test('RBAC blocks School Admin from accessing other schools and Guardian from other children', () => {
  assert.equal(canAccessSchoolData('central_admin', null, 'GPS-1042'), true);
  assert.equal(canAccessSchoolData('central_admin', null, 'DHS-2019'), true);

  assert.equal(canAccessSchoolData('school_admin', 'GPS-1042', 'GPS-1042'), true);
  assert.equal(canAccessSchoolData('school_admin', 'GPS-1042', 'DHS-2019'), false);
  assert.equal(canAccessSchoolData('guardian', null, 'GPS-1042'), false);

  assert.equal(
    canAccessStudentData('guardian', null, ['stu-rahim', 'stu-karim'], 'stu-rahim', 'GPS-1042'),
    true
  );
  assert.equal(
    canAccessStudentData('guardian', null, ['stu-rahim', 'stu-karim'], 'stu-other', 'GPS-1042'),
    false
  );
  assert.equal(
    canAccessStudentData('school_admin', 'GPS-1042', [], 'stu-other', 'DHS-2019'),
    false
  );
});

test('calculateBMI and generateStudentCodes produce valid outputs', () => {
  const healthy = calculateBMI(135, 31);
  assert.equal(healthy.categoryEn, 'Healthy');
  assert.ok(healthy.bmi > 16 && healthy.bmi < 18);

  const codes = generateStudentCodes(42, 'GPS-1042', 2026);
  assert.equal(codes.permanentId, 'STD-2026-GPS1042-0042');
  assert.ok(codes.guardianLinkCode.startsWith('GLC-GPS1042-0042'));
});
