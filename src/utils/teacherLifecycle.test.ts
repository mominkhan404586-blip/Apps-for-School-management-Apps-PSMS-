import test from 'node:test';
import assert from 'node:assert/strict';
import type { TeacherRecord } from '../types';
import {
  applyTeacherEdit,
  applyTeacherWorkflowAction,
  computeTeacherSummaryCounts,
  executeTeacherStatusChange,
  filterTeachers,
  TEACHER_APPROVAL_CATEGORIES,
} from './teacherLifecycle';

const SAMPLE_TEACHERS: TeacherRecord[] = [
  {
    id: 't-1',
    teacherCode: 'TCH-GPS1042-01',
    schoolId: 'GPS-1042',
    schoolNameBn: 'মডেল সরকারি প্রাথমিক বিদ্যালয়',
    nameBn: 'মোঃ আব্দুর রহিম',
    nameEn: 'Md. Abdur Rahim',
    designation: 'সহকারী শিক্ষক (গণিত)',
    qualification: 'B.Sc, B.Ed',
    joiningDate: '2020-07-15',
    subjects: ['গণিত', 'বিজ্ঞান'],
    assignedClasses: ['Class 4', 'Class 5'],
    mobile: '01722334455',
    status: 'active',
    performanceScore: 94,
    approvalHistory: [],
  },
  {
    id: 't-2',
    teacherCode: 'TCH-GPS1042-04',
    schoolId: 'GPS-1042',
    schoolNameBn: 'মডেল সরকারি প্রাথমিক বিদ্যালয়',
    nameBn: 'তানজিনা আক্তার',
    nameEn: 'Tanjina Akter',
    designation: 'সহকারী শিক্ষক (বিজ্ঞান)',
    qualification: 'B.Sc',
    joiningDate: '2026-11-01',
    subjects: ['বিজ্ঞান'],
    assignedClasses: ['Class 3'],
    mobile: '01944556677',
    status: 'pending',
    performanceScore: 89,
    approvalHistory: [],
  },
  {
    id: 't-3',
    teacherCode: 'TCH-DHS2019-02',
    schoolId: 'DHS-2019',
    schoolNameBn: 'আদর্শ বালিকা উচ্চ বিদ্যালয়',
    nameBn: 'ফারহানা ইয়াসমিন',
    nameEn: 'Farhana Yasmin',
    designation: 'সিনিয়র শিক্ষক (বাংলা)',
    qualification: 'M.A',
    joiningDate: '2019-02-10',
    subjects: ['বাংলা'],
    assignedClasses: ['Class 9'],
    mobile: '01811223344',
    status: 'under_review',
    performanceScore: 91,
    approvalHistory: [],
  },
  {
    id: 't-4',
    teacherCode: 'TCH-NBD3012-01',
    schoolId: 'NBD-3012',
    schoolNameBn: 'নবদিগন্ত বিদ্যাপীঠ',
    nameBn: 'কামরুল ইসলাম',
    nameEn: 'Kamrul Islam',
    designation: 'সহকারী শিক্ষক',
    qualification: 'B.A',
    joiningDate: '2021-01-01',
    subjects: ['ইংরেজি'],
    assignedClasses: ['Class 6'],
    mobile: '01755001122',
    status: 'suspended',
    performanceScore: 76,
    approvalHistory: [],
  },
];

test('TEACHER_APPROVAL_CATEGORIES covers all 18 requested governance workflows', () => {
  assert.equal(TEACHER_APPROVAL_CATEGORIES.length, 18);
  const ids = new Set(TEACHER_APPROVAL_CATEGORIES.map((c) => c.id));
  assert.equal(ids.size, 18);
  assert.ok(ids.has('new_registration'));
  assert.ok(ids.has('joining_date_correction'));
  assert.ok(ids.has('retirement_approval'));
  assert.ok(ids.has('school_admin_role_change'));
});

test('computeTeacherSummaryCounts and filterTeachers work accurately', () => {
  const counts = computeTeacherSummaryCounts(SAMPLE_TEACHERS);
  assert.deepEqual(counts, {
    total: 4,
    active: 1,
    pending: 1,
    under_review: 1,
    rejected: 0,
    suspended: 1,
    deactivated: 0,
  });

  const byName = filterTeachers(SAMPLE_TEACHERS, { search: 'তানজিনা', schoolId: 'ALL', status: 'ALL' });
  assert.equal(byName.length, 1);
  assert.equal(byName[0].id, 't-2');

  const byCodeAndSchool = filterTeachers(SAMPLE_TEACHERS, {
    search: 'DHS2019',
    schoolId: 'DHS-2019',
    status: 'under_review',
  });
  assert.equal(byCodeAndSchool.length, 1);
  assert.equal(byCodeAndSchool[0].id, 't-3');
});

test('applyTeacherEdit updates teacher fields and appends Approval History entry', () => {
  const { updatedTeacher, changedFields } = applyTeacherEdit(
    SAMPLE_TEACHERS[0],
    {
      nameBn: 'মোঃ আব্দুর রহিম',
      nameEn: 'Md. Abdur Rahim',
      designation: 'সিনিয়র শিক্ষক (গণিত)',
      qualification: 'M.Sc, M.Ed',
      joiningDate: '2020-07-15',
      mobile: '01722334455',
      email: 'rahim@school.bd',
      branchName: 'Morning Shift',
      specialDuty: 'Class 4 শ্রেণি শিক্ষক',
      subjects: ['গণিত', 'আইসিটি'],
      assignedClasses: ['Class 4', 'Class 5'],
      performanceScore: 96,
      reason: 'পদোন্নতি ও বিষয় হালনাগাদ',
    },
    'মোঃ মোমিন খান',
    '2026-11-17'
  );

  assert.equal(updatedTeacher.designation, 'সিনিয়র শিক্ষক (গণিত)');
  assert.deepEqual(updatedTeacher.subjects, ['গণিত', 'আইসিটি']);
  assert.ok(changedFields.includes('Designation'));
  assert.ok(changedFields.includes('Subjects'));
  assert.equal(updatedTeacher.approvalHistory?.length, 1);
  assert.equal(updatedTeacher.approvalHistory?.[0].note, 'পদোন্নতি ও বিষয় হালনাগাদ');
});

test('applyTeacherWorkflowAction handles transfer, promotion, joining date correction, and status transitions', () => {
  // 1. Transfer / School Change
  const transferRes = applyTeacherWorkflowAction(
    SAMPLE_TEACHERS[0],
    {
      category: 'transfer_approval',
      targetSchoolId: 'DHS-2019',
      targetSchoolNameBn: 'আদর্শ বালিকা উচ্চ বিদ্যালয়',
      reason: 'সরকারি বদলি আদেশ নং-২৪৫',
    },
    'মোঃ মোমিন খান',
    '2026-11-17'
  );
  assert.equal(transferRes.updatedTeacher.schoolId, 'DHS-2019');
  assert.equal(transferRes.updatedTeacher.schoolNameBn, 'আদর্শ বালিকা উচ্চ বিদ্যালয়');
  assert.equal(transferRes.updatedTeacher.transferHistory?.length, 1);
  assert.equal(transferRes.updatedTeacher.approvalHistory?.length, 1);

  // 2. Joining Date Correction
  const dateRes = applyTeacherWorkflowAction(
    transferRes.updatedTeacher,
    {
      category: 'joining_date_correction',
      newJoiningDate: '2020-07-01',
      reason: 'মূল যোগদানপত্র অনুযায়ী সংশোধন',
    },
    'মোঃ মোমিন খান',
    '2026-11-17'
  );
  assert.equal(dateRes.updatedTeacher.joiningDate, '2020-07-01');
  assert.equal(dateRes.updatedTeacher.approvalHistory?.length, 2);

  // 3. Status Change (Deactivate / Suspend / Activate)
  const suspended = executeTeacherStatusChange(
    dateRes.updatedTeacher,
    'suspended',
    'তদন্তকালীন স্থগিত',
    'মোঃ মোমিন খান',
    '2026-11-17'
  );
  assert.equal(suspended.status, 'suspended');
  assert.equal(suspended.suspensionReason, 'তদন্তকালীন স্থগিত');

  const reactivated = executeTeacherStatusChange(
    suspended,
    'active',
    'তদন্ত শেষে পুনর্বহাল',
    'মোঃ মোমিন খান',
    '2026-11-18'
  );
  assert.equal(reactivated.status, 'active');
  assert.equal(reactivated.suspensionReason, undefined);
});
