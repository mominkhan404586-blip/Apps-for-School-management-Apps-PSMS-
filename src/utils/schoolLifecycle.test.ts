import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_SCHOOLS } from '../data/mockData';
import {
  applySchoolInfoEdit,
  computeSchoolSummaryCounts,
  executeSchoolAdminAction,
  filterSchools,
  isDeactivationChecklistValid,
} from './schoolLifecycle';

test('computeSchoolSummaryCounts tallies active, pending, under_review, and suspended schools', () => {
  const counts = computeSchoolSummaryCounts(INITIAL_SCHOOLS);
  assert.equal(counts.total, INITIAL_SCHOOLS.length);
  assert.equal(counts.approvedActive, 3); // GPS-1042, DHS-2019, DAR-4011
  assert.equal(counts.underReview, 1); // SBC-1104
  assert.equal(counts.pending, 1); // KDG-1090
  assert.equal(counts.suspended, 1); // NBD-3012
});

test('filterSchools searches by EIIN/ID/Admin and filters by Division & School Type', () => {
  const byEiin = filterSchools(INITIAL_SCHOOLS, {
    search: '104512',
    division: 'ALL',
    district: 'ALL',
    upazila: 'ALL',
    schoolType: 'ALL',
    status: 'ALL',
    approvalStatus: 'ALL',
    registrationDate: '',
  });
  assert.equal(byEiin.length, 1);
  assert.equal(byEiin[0].code, 'DHS-2019');

  const byDivType = filterSchools(INITIAL_SCHOOLS, {
    search: '',
    division: 'ঢাকা',
    district: 'ALL',
    upazila: 'ALL',
    schoolType: 'KINDERGARTEN',
    status: 'ALL',
    approvalStatus: 'ALL',
    registrationDate: '',
  });
  assert.equal(byDivType.length, 1);
  assert.equal(byDivType[0].code, 'KDG-1090');
});

test('applySchoolInfoEdit updates GPS, category, and reconfigures classes on schoolType change with history', () => {
  const target = INITIAL_SCHOOLS[0];
  const { updatedSchool, changedFields } = applySchoolInfoEdit(
    target,
    {
      nameBn: target.nameBn,
      nameEn: target.nameEn,
      registrationId: 'REG-2026-1042',
      code: target.code,
      eiin: '108241',
      mobile: '01799887766',
      email: target.email,
      cluster: target.cluster,
      division: target.division,
      district: target.district,
      upazila: target.upazila,
      union: target.union,
      village: target.village,
      fullAddress: target.fullAddress,
      gpsLat: '23.8069',
      gpsLng: '90.3687',
      schoolType: 'SECONDARY',
      educationLevel: 'Class 6 – Class 10',
      category: 'Government',
      establishedYear: '1984',
      headTeacher: target.headTeacher,
    },
    'মোঃ মোমিন খান',
    '১৭ নভে ২০২৬'
  );
  assert.equal(updatedSchool.gpsLat, '23.8069');
  assert.ok(updatedSchool.approvedClasses.includes('Class 10'));
  assert.ok(!updatedSchool.approvedClasses.includes('Class 1'));
  assert.ok(changedFields.some((c) => c.includes('School Type')));
  assert.ok((updatedSchool.approvalHistory?.length ?? 0) >= 1);
});

test('executeSchoolAdminAction preserves previous admin in handoverHistory when replacing Primary Admin', () => {
  const target = INITIAL_SCHOOLS[0];
  const { updatedSchool, previousAdminName, newAdminName } = executeSchoolAdminAction(
    target,
    {
      mode: 'replace_current',
      name: 'ড. কামরুল আহসান',
      username: 'head_kamrul',
      email: 'kamrul.gps1042@gmail.com',
      mobile: '01755667788',
      permissions: ['students', 'teachers', 'attendance', 'exams'],
      handoverNote: 'বার্ষিক দায়িত্ব হস্তান্তর সম্পন্ন',
      sendInvitation: true,
    },
    'মোঃ মোমিন খান',
    '১৭ নভে ২০২৬'
  );
  assert.equal(previousAdminName, 'বেগম ফাতেমা খাতুন');
  assert.equal(newAdminName, 'ড. কামরুল আহসান');
  assert.equal(updatedSchool.headTeacher, 'ড. কামরুল আহসান');
  assert.equal(updatedSchool.handoverHistory?.[0].previousAdminName, 'বেগম ফাতেমা খাতুন');
  assert.equal(updatedSchool.schoolAdmins?.some((a) => a.name === 'বেগম ফাতেমা খাতুন' && a.status === 'removed'), true);
});

test('isDeactivationChecklistValid enforces all permanent closure safety checks', () => {
  const incomplete = isDeactivationChecklistValid({
    reason: 'Merged with nearby school',
    evidenceDoc: 'closure_order.pdf',
    inspectionReportRef: 'INSP-2026-09',
    studentTransferDone: true,
    staffAdjustmentDone: false,
    assetDisposalDone: true,
    finalApprovalBy: 'Central Admin',
  });
  assert.equal(incomplete.valid, false);

  const complete = isDeactivationChecklistValid({
    reason: 'Merged with nearby school',
    evidenceDoc: 'closure_order.pdf',
    inspectionReportRef: 'INSP-2026-09',
    studentTransferDone: true,
    staffAdjustmentDone: true,
    assetDisposalDone: true,
    finalApprovalBy: 'Central Admin',
  });
  assert.equal(complete.valid, true);
});
