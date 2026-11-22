import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVerificationQueue,
  computePipelineStage,
  createDefaultRolePermissionMatrix,
  detectDuplicateRecords,
  hasGovernancePermission,
  issueStudentTransferLetter,
  reissueStudentDigitalId,
  reissueTeacherId,
  toggleRolePermission,
  VERIFICATION_CATEGORIES,
} from './governanceAndVerification.ts';
import type { SchoolRecord, StudentRecord, TeacherRecord } from '../types.ts';

const sampleSchools: SchoolRecord[] = [
  {
    id: 'GPS-1042',
    code: 'GPS-1042',
    eiin: '108241',
    nameBn: 'মডেল সরকারি প্রাথমিক বিদ্যালয়',
    nameEn: 'Model GPS',
    schoolType: 'PRIMARY',
    establishedYear: '1984',
    mobile: '01711001122',
    email: 'a@b.com',
    cluster: 'C1',
    division: 'ঢাকা',
    district: 'ঢাকা',
    upazila: 'মিরপুর',
    union: 'পল্লবী',
    village: 'সেকশন ১০',
    fullAddress: 'Mirpur 10',
    addressSource: 'AUTOMATIC',
    addressVerified: true,
    headTeacher: 'ফাতেমা',
    adminUsername: 'head_1',
    studentCount: 248,
    teacherCount: 18,
    classRange: 'Pre-Primary – Class 5',
    approvedClasses: ['Pre-Primary', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5'],
    academicYear: '2026',
    status: 'active',
    verificationStatus: 'verified',
    approvalStatus: 'approved',
    registrationMethod: 'ONLINE',
    documents: ['eiin.pdf'],
    verifiedDate: '2026-01-12',
    attendanceRate: 93.5,
  },
  {
    id: 'DUP-2',
    code: 'DUP-2',
    eiin: '108241',
    nameBn: 'ডুপ্লিকেট টেস্ট স্কুল',
    nameEn: 'Dup School',
    schoolType: 'PRIMARY',
    establishedYear: '2020',
    mobile: '01711009999',
    email: 'd@b.com',
    cluster: 'C1',
    division: 'ঢাকা',
    district: 'ঢাকা',
    upazila: 'মিরপুর',
    union: 'পল্লবী',
    village: 'সেকশন ১০',
    fullAddress: 'Mirpur',
    addressSource: 'MANUAL',
    addressVerified: false,
    headTeacher: 'টেস্ট',
    adminUsername: 'head_2',
    studentCount: 50,
    teacherCount: 5,
    classRange: 'Pre-Primary – Class 5',
    approvedClasses: ['Pre-Primary', 'Class 1'],
    academicYear: '2026',
    status: 'pending',
    verificationStatus: 'pending',
    approvalStatus: 'pending',
    registrationMethod: 'ONLINE',
    documents: ['doc.pdf'],
    verifiedDate: 'Pending',
    attendanceRate: 80,
  },
];

const sampleTeacher: TeacherRecord = {
  id: 'tch-1',
  teacherCode: 'TCH-GPS1042-01',
  schoolId: 'GPS-1042',
  schoolNameBn: 'মডেল সরকারি প্রাথমিক বিদ্যালয়',
  nameBn: 'বেগম ফাতেমা খাতুন',
  nameEn: 'Begum Fatema Khatun',
  designation: 'প্রধান শিক্ষক',
  qualification: 'M.Ed',
  joiningDate: '2018-03-01',
  subjects: ['বাংলা'],
  assignedClasses: ['Class 5'],
  mobile: '01711001122',
  status: 'active',
  verificationStatus: 'verified',
  approvalStatus: 'approved',
  performanceScore: 98,
};

const sampleStudent: StudentRecord = {
  id: 'stu-rahim',
  permanentId: 'STD-2026-GPS1042-0012',
  activationCode: 'ACT-0012-74',
  guardianLinkCode: 'GLC-GPS1042-0012',
  schoolId: 'GPS-1042',
  schoolNameBn: 'মডেল সরকারি প্রাথমিক বিদ্যালয়',
  nameBn: 'মোঃ রাহিম উদ্দিন',
  nameEn: 'Md. Rahim Uddin',
  dob: '2016-05-14',
  birthRegNo: '20162614908112345',
  gender: 'Male',
  fatherName: 'জামাল',
  motherName: 'রাহেলা',
  guardianMobile: '01712345678',
  bloodGroup: 'B+',
  className: 'Class 4',
  section: 'ক (A)',
  roll: 12,
  status: 'active',
  verificationStatus: 'verified',
  approvalStatus: 'approved',
  attendancePct: 96,
  heightCm: 136,
  weightKg: 31,
  stipendStatus: 'approved',
  admissionHistory: ['2026: Class 4'],
};

test('Verification Officer vs Approval Officer strictly separates Verify and Approve permissions', () => {
  const matrix = createDefaultRolePermissionMatrix();

  assert.equal(hasGovernancePermission(matrix, 'Super Central Admin', 'school:approve'), true);
  assert.equal(hasGovernancePermission(matrix, 'Super Central Admin', 'school:verify'), true);

  assert.equal(hasGovernancePermission(matrix, 'Verification Officer', 'school:verify'), true);
  assert.equal(hasGovernancePermission(matrix, 'Verification Officer', 'school:approve'), false);

  assert.equal(hasGovernancePermission(matrix, 'Approval Officer', 'school:approve'), true);
  assert.equal(hasGovernancePermission(matrix, 'Approval Officer', 'school:verify'), false);

  const toggled = toggleRolePermission(matrix, 'Super Central Admin', 'school:suspend');
  assert.equal(hasGovernancePermission(toggled, 'Super Central Admin', 'school:suspend'), false);
});

test('4-Stage Verification Pipeline separates Request -> Verification -> Approval -> Final Action', () => {
  const stage1 = computePipelineStage({
    verificationStatus: 'unverified',
    approvalStatus: 'pending',
    entityStatus: 'pending',
  });
  assert.equal(stage1.step, 1);

  const stage2 = computePipelineStage({
    verificationStatus: 'pending',
    approvalStatus: 'pending',
    entityStatus: 'under_review',
  });
  assert.equal(stage2.step, 2);

  const stage3 = computePipelineStage({
    verificationStatus: 'verified',
    approvalStatus: 'pending',
    entityStatus: 'pending',
  });
  assert.equal(stage3.step, 3);
  assert.equal(stage3.verificationDone, true);
  assert.equal(stage3.approvalDone, false);

  const stage4 = computePipelineStage({
    verificationStatus: 'verified',
    approvalStatus: 'approved',
    entityStatus: 'active',
  });
  assert.equal(stage4.step, 4);
  assert.equal(stage4.finalActionDone, true);
});

test('Central Verification supports all 8 categories and detects duplicate EIIN/BirthReg/Mobile', () => {
  assert.equal(VERIFICATION_CATEGORIES.length, 8);
  const duplicates = detectDuplicateRecords(sampleSchools, [sampleTeacher], [sampleStudent]);
  assert.equal(duplicates.length, 1);
  assert.equal(duplicates[0].duplicateValue, '108241');

  const queue = buildVerificationQueue(sampleSchools, [sampleTeacher], [sampleStudent], [], [], []);
  assert.ok(queue.some((q) => q.category === 'school'));
  assert.ok(queue.some((q) => q.category === 'address_location'));
  assert.ok(queue.some((q) => q.category === 'teacher'));
  assert.ok(queue.some((q) => q.category === 'student'));
});

test('Re-issue ID and Issue Transfer Letter preserve history and generate official serials', () => {
  const reissuedStu = reissueStudentDigitalId(sampleStudent, 'School Admin', '2026-11-18');
  assert.equal(reissuedStu.reissuedIdCount, 1);
  assert.ok(reissuedStu.digitalIdSerial?.startsWith('DID-GPS1042-12-01'));
  assert.equal(reissuedStu.approvalHistory?.[0].category, 'status_change');

  const reissuedTch = reissueTeacherId(sampleTeacher, 'Central Admin', '2026-11-18');
  assert.equal(reissuedTch.reissuedIdCount, 1);
  assert.equal(reissuedTch.activityHistory?.length, 1);

  const tcResult = issueStudentTransferLetter(
    sampleStudent,
    'আদর্শ বালিকা উচ্চ বিদ্যালয়',
    'অভিভাবকের বদলি',
    'School Admin',
    '2026-11-18'
  );
  assert.equal(tcResult.tcNumber, 'TC-2026-GPS1042-12');
  assert.ok(tcResult.updatedStudent.admissionHistory.some((h) => h.includes('TC-2026-GPS1042-12')));
});
