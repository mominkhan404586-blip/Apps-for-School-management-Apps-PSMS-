import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSchoolTypeConfig,
  validateAddressHierarchy,
  getNextWorkflowStatuses,
  validateStudentActivationLogin,
} from './schoolConfigAndAddress';
import { INITIAL_BD_LOCATIONS } from '../data/bdLocations';

test('School Type Configuration enforces strict class isolation by school_type', () => {
  const primary = getSchoolTypeConfig('PRIMARY');
  assert.deepEqual(primary.defaultClasses, [
    'Pre-Primary',
    'Class 1',
    'Class 2',
    'Class 3',
    'Class 4',
    'Class 5',
  ]);
  assert.equal(primary.defaultClasses.includes('Class 6'), false);
  assert.equal(primary.defaultClasses.includes('Class 10'), false);

  const secondary = getSchoolTypeConfig('SECONDARY');
  assert.deepEqual(secondary.defaultClasses, ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10']);
  assert.equal(secondary.defaultClasses.includes('Pre-Primary'), false);
  assert.equal(secondary.defaultClasses.includes('Class 1'), false);

  const both = getSchoolTypeConfig('PRIMARY_SECONDARY');
  assert.equal(both.sectionsStructure.length, 2);
  assert.equal(both.defaultClasses.includes('Pre-Primary'), true);
  assert.equal(both.defaultClasses.includes('Class 10'), true);

  const madrasa = getSchoolTypeConfig('MADRASA');
  assert.equal(madrasa.defaultClasses.some((c) => c.includes('ইবতেদায়ী')), true);
  assert.equal(madrasa.defaultClasses.some((c) => c.includes('দাখিল')), true);
});

test('validateAddressHierarchy verifies parent-child location chain and allows MANUAL fallback', () => {
  const validAuto = validateAddressHierarchy(
    {
      addressSource: 'AUTOMATIC',
      divisionId: 'div-dhk',
      districtId: 'dist-dhk',
      upazilaId: 'upz-mirpur',
      unionId: 'uni-pallabi',
      villageId: 'vil-mirpur10',
      divisionName: 'ঢাকা',
      districtName: 'ঢাকা',
      upazilaName: 'মিরপুর',
      unionName: 'পল্লবী',
      villageName: 'মিরপুর সেকশন ১০',
      fullAddress: 'সেকশন ১০, মিরপুর',
    },
    INITIAL_BD_LOCATIONS
  );
  assert.equal(validAuto.valid, true);

  // Mismatched district (Chattogram district under Dhaka division)
  const invalidMismatch = validateAddressHierarchy(
    {
      addressSource: 'AUTOMATIC',
      divisionId: 'div-dhk',
      districtId: 'dist-ctg',
      upazilaId: 'upz-kotwali',
      unionId: '',
      villageId: '',
      divisionName: 'ঢাকা',
      districtName: 'চট্টগ্রাম',
      upazilaName: 'কোতোয়ালী',
      unionName: '',
      villageName: '',
      fullAddress: '',
    },
    INITIAL_BD_LOCATIONS
  );
  assert.equal(invalidMismatch.valid, false);

  // Manual entry never blocked by database mismatches
  const validManual = validateAddressHierarchy(
    {
      addressSource: 'MANUAL',
      divisionId: '',
      districtId: '',
      upazilaId: '',
      unionId: '',
      villageId: '',
      divisionName: 'ঢাকা',
      districtName: 'নরসিংদী',
      upazilaName: 'রায়পুরা',
      unionName: 'চানপুর',
      villageName: 'নতুন গ্রাম',
      fullAddress: 'বাড়ি ১২, বাজার রোড',
    },
    INITIAL_BD_LOCATIONS
  );
  assert.equal(validManual.valid, true);
});

test('School approval workflow transitions and Student activation login behave accurately', () => {
  assert.deepEqual(getNextWorkflowStatuses('pending'), ['under_review', 'rejected']);
  assert.deepEqual(getNextWorkflowStatuses('under_review'), ['approved', 'rejected']);
  assert.deepEqual(getNextWorkflowStatuses('approved'), ['active']);

  const mockStudents = [
    {
      id: 'stu-rahim',
      permanentId: 'STD-2026-GPS1042-0012',
      activationCode: 'ACT-0012-74',
      guardianLinkCode: 'GLC-GPS1042-0012',
      schoolId: 'GPS-1042',
      schoolNameBn: 'মডেল সরকারি প্রাথমিক বিদ্যালয়',
      nameBn: 'মোঃ রাহিম উদ্দিন',
      nameEn: 'Md. Rahim Uddin',
      gender: 'Male' as const,
      dob: '2016-05-14',
      birthRegNo: '123',
      fatherName: 'Jamal',
      motherName: 'Rahela',
      guardianMobile: '01712345678',
      bloodGroup: 'B+',
      className: 'Class 4',
      section: 'A',
      roll: 12,
      status: 'active' as const,
      attendancePct: 96,
      heightCm: 136,
      weightKg: 31,
      stipendStatus: 'approved' as const,
      admissionHistory: [],
    },
  ];

  const okRes = validateStudentActivationLogin(mockStudents, 'STD-2026-GPS1042-0012', '01712345678', 'ACT-0012-74');
  assert.equal(okRes.ok, true);

  const badCode = validateStudentActivationLogin(mockStudents, 'STD-2026-GPS1042-0012', '01712345678', 'WRONG');
  assert.equal(badCode.ok, false);
});
