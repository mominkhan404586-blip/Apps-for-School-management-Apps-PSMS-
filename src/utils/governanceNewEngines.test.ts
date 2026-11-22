import assert from 'node:assert/strict';
import test from 'node:test';
import {
  INITIAL_ADMIN_ACCOUNTS,
  INITIAL_DOCUMENT_TEMPLATES,
  INITIAL_EXAMS,
  INITIAL_EXAM_ROUTINES,
  INITIAL_OFFICIAL_DOCUMENTS,
  INITIAL_SCHOOLS,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  INITIAL_TEACHER_SCHOOL_ASSIGNMENTS,
} from '../data/mockData';
import {
  CONTACT_ADMIN_CHANNELS,
  admitStudent6Part,
  checkDuplicateStudent,
  createSubordinateAdmin,
  createTeacherJoinApplication,
  deleteSubordinateAdmin,
  filterTeacherWorkspaceBySchoolAssignment,
  isMainCentralAdmin,
  leaveOrSuspendSchoolAssignment,
  registerTeacherPartA,
  reviewTeacherJoinApplication,
  sanitizeActorDisplayForRole,
  toggleSubordinateAdminStatus,
  updateTeacherPartBProfessional,
} from './adminAndTeacherIdentityEngine';
import {
  STUDENT_OFFICIAL_DOC_TYPES,
  TEACHER_OFFICIAL_DOC_TYPES,
  generateOfficialDocument,
  reissueOfficialDocument,
  validateTemplateManualEdit,
  verifyDocumentByQrOrNumber,
} from './officialDocumentEngine';
import {
  detectExamRoutineConflicts,
  exportExamRoutineCsv,
  getStudentPersonalExamRoutine,
  getTeacherInvigilatorDuties,
  publishExamRoutine,
} from './examRoutineEngine';
import {
  createNoticeRecord,
  generateNoticeImageId,
  updateNoticeImagesWithHistory,
  validateNoticeImageFile,
} from './notificationAndNoticeEngine';

test('Main Central Admin Governance: identity privacy, Main Owner protection & exact 5 Contact channels', () => {
  assert.equal(CONTACT_ADMIN_CHANNELS.mobileNumber, '01331712797');
  assert.equal(CONTACT_ADMIN_CHANNELS.whatsappNumber, '01331712797');
  assert.equal(CONTACT_ADMIN_CHANNELS.facebookUrl, 'https://www.facebook.com/share/1CLQtaRmzP/');

  // Privacy masking for non-central roles
  assert.equal(sanitizeActorDisplayForRole('মোঃ মোমিন খান (Central Admin)', 'central_admin'), 'মোঃ মোমিন খান (Central Admin)');
  assert.ok(!sanitizeActorDisplayForRole('মোঃ মোমিন খান (Central Admin)', 'school_admin').includes('মোমিন'));
  assert.ok(!sanitizeActorDisplayForRole('mominkhan404586@gmail.com', 'teacher').includes('mominkhan'));
  assert.ok(!sanitizeActorDisplayForRole('Md. Momin Khan', 'student').includes('Momin'));

  const mainOwner = INITIAL_ADMIN_ACCOUNTS.find((a) => isMainCentralAdmin(a))!;
  const subAdmin = INITIAL_ADMIN_ACCOUNTS.find((a) => !isMainCentralAdmin(a))!;

  // Subordinate admin CANNOT create, suspend, or delete Main Owner
  const unauthCreate = createSubordinateAdmin(INITIAL_ADMIN_ACCOUNTS, subAdmin, {
    name: 'Test',
    username: 'test_adm',
    email: 'test@edu.bd',
    mobile: '01700001122',
    accessLevel: 'Regional Reviewer',
    permissions: ['schools'],
  });
  assert.equal(unauthCreate.ok, false);

  const suspendOwnerAttempt = toggleSubordinateAdminStatus(INITIAL_ADMIN_ACCOUNTS, mainOwner, mainOwner.id);
  assert.equal(suspendOwnerAttempt.ok, false);
  const deleteOwnerAttempt = deleteSubordinateAdmin(INITIAL_ADMIN_ACCOUNTS, mainOwner, mainOwner.id);
  assert.equal(deleteOwnerAttempt.ok, false);

  // Main Owner CAN create and manage subordinate admins
  const createdRes = createSubordinateAdmin(INITIAL_ADMIN_ACCOUNTS, mainOwner, {
    name: 'নতুন রিভিউয়ার',
    username: 'rev_dhaka',
    email: 'rev.dhaka@edu.bd',
    mobile: '01755667788',
    accessLevel: 'Regional Reviewer',
    permissions: ['schools', 'verification'],
  });
  assert.equal(createdRes.ok, true);
  assert.equal(createdRes.accounts.length, INITIAL_ADMIN_ACCOUNTS.length + 1);

  const deletedSub = deleteSubordinateAdmin(createdRes.accounts, mainOwner, createdRes.created!.id);
  assert.equal(deletedSub.ok, true);
  assert.equal(deletedSub.accounts.length, INITIAL_ADMIN_ACCOUNTS.length);
});

test('Teacher Global Account (TCH-2026-XXXXXX), Part A/B split & multi-school workspace isolation', () => {
  // Part A Registration only (no school assignment pre-approval)
  const reg = registerTeacherPartA(INITIAL_TEACHERS, {
    nameBn: 'মোঃ তানভীর আহমেদ',
    nameEn: 'Md. Tanvir Ahmed',
    dob: '1994-05-12',
    gender: 'Male',
    nationality: 'Bangladeshi',
    nidNumber: '1994269012345',
    mobile: '01799887766',
    email: 'tanvir.teach@gmail.com',
    presentAddress: 'মিরপুর ১২, ঢাকা',
    permanentAddress: 'সদর, বগুড়া',
    documents: ['NID.pdf', 'Academic_Cert.pdf'],
  });
  assert.equal(reg.ok, true);
  assert.match(reg.teacher!.teacherCode, /^TCH-2026-\d{6}$/);
  assert.equal(reg.teacher!.schoolId, 'UNASSIGNED');
  assert.equal(reg.teacher!.partBCompleted, false);

  // Unverified teacher blocked from joining school
  const gps = INITIAL_SCHOOLS.find((s) => s.id === 'GPS-1042')!;
  const unverifiedJoin = createTeacherJoinApplication(INITIAL_TEACHER_SCHOOL_ASSIGNMENTS, reg.teacher!, gps);
  assert.equal(unverifiedJoin.ok, false);

  // Post-login Part B Professional Info update
  const verifiedTeacher = { ...reg.teacher!, globalVerificationStatus: 'verified' as const, status: 'active' as const };
  const withPartB = updateTeacherPartBProfessional(verifiedTeacher, {
    qualification: 'M.Sc, B.Ed',
    academicDegree: 'M.Sc in Physics',
    subjectMajor: 'Physics',
    training: 'NCTB Pedagogy Training',
    experienceYears: 4,
    previousInstitution: 'Bogra Zilla School',
    employmentStatus: 'Active',
    teacherType: 'Permanent',
  });
  assert.equal(withPartB.partBCompleted, true);
  assert.equal(withPartB.subjectMajor, 'Physics');

  // Verified teacher joins GPS-1042 -> pending -> School Admin approves
  const joinApp = createTeacherJoinApplication(INITIAL_TEACHER_SCHOOL_ASSIGNMENTS, withPartB, gps, 'সহকারী শিক্ষক', ['বিজ্ঞান']);
  assert.equal(joinApp.ok, true);
  assert.equal(joinApp.assignment!.approvalStatus, 'pending');

  const updatedAssignments = reviewTeacherJoinApplication(
    [...INITIAL_TEACHER_SCHOOL_ASSIGNMENTS, joinApp.assignment!],
    joinApp.assignment!.id,
    'approved',
    'বেগম ফাতেমা খাতুন',
    { assignedClasses: ['Class 4', 'Class 5'], assignedSubjects: ['বিজ্ঞান'], permissions: { addStudent: true } }
  );

  // Existing teacher tch-2 has 2 approved schools (GPS-1042 & DHS-2019). Leaving School A keeps School B intact!
  const beforeLeave = filterTeacherWorkspaceBySchoolAssignment('tch-2', updatedAssignments, 'DHS-2019');
  assert.equal(beforeLeave.approvedSchools.length, 2);
  assert.equal(beforeLeave.scopedSchoolId, 'DHS-2019');

  const afterLeaveGps = leaveOrSuspendSchoolAssignment(updatedAssignments, 'tsa-1', 'Resigned');
  const workspaceAfterLeave = filterTeacherWorkspaceBySchoolAssignment('tch-2', afterLeaveGps, 'GPS-1042');
  assert.equal(workspaceAfterLeave.approvedSchools.length, 1);
  assert.equal(workspaceAfterLeave.scopedSchoolId, 'DHS-2019');
});

test('Teacher-Led 6-Part Student Admission: approved class check, duplicate blocking & Auto ID STU-2026-XXXXXX', () => {
  const gps = INITIAL_SCHOOLS.find((s) => s.id === 'GPS-1042')!;
  const existingRahim = INITIAL_STUDENTS.find((s) => s.id === 'stu-rahim')!;

  // Duplicate birthRegNo triggers warning
  const dupBirth = checkDuplicateStudent(INITIAL_STUDENTS, {
    schoolId: gps.id,
    className: 'Class 4',
    section: 'ক (A)',
    roll: 99,
    birthRegNo: existingRahim.birthRegNo,
  });
  assert.equal(dupBirth.isDuplicate, true);
  assert.ok(dupBirth.warningEn?.includes('already exist'));

  // Class outside school's approvedClasses blocked (GPS-1042 is Primary, does not teach Class 9)
  const badClass = admitStudent6Part(INITIAL_STUDENTS, gps, {
    nameBn: 'নতুন শিক্ষার্থী',
    nameEn: 'New Student',
    dob: '2016-04-10',
    gender: 'Male',
    bloodGroup: 'B+',
    birthRegNo: '20169988776655',
    academicYear: '২০২৬',
    schoolId: gps.id,
    schoolNameBn: gps.nameBn,
    className: 'Class 9',
    section: 'ক (A)',
    roll: 1,
    admissionDate: '2026-11-19',
    fatherName: 'পিতার নাম',
    motherName: 'মাতার নাম',
    guardianRelation: 'Father',
    guardianMobile: '01711009988',
    emergencyContact: '01711009988',
    presentAddress: {
      addressSource: 'MANUAL',
      divisionId: '',
      districtId: '',
      upazilaId: '',
      unionId: '',
      villageId: '',
      divisionName: 'ঢাকা',
      districtName: 'ঢাকা',
      upazilaName: 'মিরপুর',
      unionName: 'পল্লবী',
      villageName: 'ব্লক এ',
      fullAddress: 'মিরপুর ১০, ঢাকা',
    },
    permanentAddress: {
      addressSource: 'MANUAL',
      divisionId: '',
      districtId: '',
      upazilaId: '',
      unionId: '',
      villageId: '',
      divisionName: 'ঢাকা',
      districtName: 'ঢাকা',
      upazilaName: 'মিরপুর',
      unionName: 'পল্লবী',
      villageName: 'ব্লক এ',
      fullAddress: 'মিরপুর ১০, ঢাকা',
    },
    previousSchoolInfo: { notApplicable: true },
    documents: ['Birth_Cert.pdf', 'Student_Photo.jpg'],
    admittedByTeacherId: 'tch-2',
    admittedByTeacherName: 'মোঃ আব্দুর রহিম',
  });
  assert.equal(badClass.ok, false);

  // Valid 6-part Admission generates STU-2026-XXXXXX & QR payload
  const validAdm = admitStudent6Part(INITIAL_STUDENTS, gps, {
    nameBn: 'মোঃ সাকিব আল হাসান',
    nameEn: 'Md. Sakib Al Hasan',
    dob: '2016-04-10',
    gender: 'Male',
    bloodGroup: 'O+',
    birthRegNo: '20169988776655',
    academicYear: '২০২৬',
    schoolId: gps.id,
    schoolNameBn: gps.nameBn,
    className: 'Class 4',
    section: 'খ (B)',
    roll: 41,
    admissionDate: '2026-11-19',
    fatherName: 'মোঃ সাইফুল ইসলাম',
    motherName: 'নাসিমা বেগম',
    guardianRelation: 'Father',
    guardianMobile: '01711009988',
    emergencyContact: '01711009988',
    presentAddress: {
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
      villageName: 'সেকশন ১০',
      fullAddress: 'সেকশন ১০, মিরপুর, ঢাকা',
    },
    permanentAddress: {
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
      villageName: 'সেকশন ১০',
      fullAddress: 'সেকশন ১০, মিরপুর, ঢাকা',
    },
    previousSchoolInfo: { notApplicable: true },
    documents: ['Birth_Cert.pdf', 'Guardian_NID.pdf'],
    admittedByTeacherId: 'tch-2',
    admittedByTeacherName: 'মোঃ আব্দুর রহিম',
  });
  assert.equal(validAdm.ok, true);
  assert.match(validAdm.student!.permanentId, /^STU-2026-\d{6}$/);
  assert.equal(validAdm.credentials!.initialPassword, '01711009988');
  assert.ok(validAdm.student!.qrPayload?.includes(validAdm.student!.permanentId));
});

test('Official Document Engine: 15 Student + 8 Teacher types, incomplete marksheet block, tamper lock, reissue -R01 & QR verify', () => {
  assert.equal(STUDENT_OFFICIAL_DOC_TYPES.length, 15);
  assert.equal(TEACHER_OFFICIAL_DOC_TYPES.length, 8);

  const gps = INITIAL_SCHOOLS.find((s) => s.id === 'GPS-1042')!;
  const rahim = INITIAL_STUDENTS.find((s) => s.id === 'stu-rahim')!;
  const noMarksStudent = { ...rahim, id: 'stu-nomarks-999' };

  // Marksheet auto-generation blocked if student has incomplete/missing exam entries
  const blockedMarksheet = generateOfficialDocument({
    category: 'student',
    docType: 'marksheet',
    mode: 'auto',
    school: gps,
    student: noMarksStudent,
    exams: INITIAL_EXAMS,
    existingDocs: INITIAL_OFFICIAL_DOCUMENTS,
    templates: INITIAL_DOCUMENT_TEMPLATES,
    actorName: 'বেগম ফাতেমা খাতুন',
  });
  assert.equal(blockedMarksheet.ok, false);

  // Tamper lock rejects manual edit that deletes locked system fields
  const tamperCheck = validateTemplateManualEdit('Custom text without student info', {
    student_name: rahim.nameBn,
    student_id: rahim.permanentId,
    school_name: gps.nameBn,
    document_number: 'CERT-2026-001',
  });
  assert.equal(tamperCheck.ok, false);
  assert.ok(tamperCheck.warningEn?.includes('System Information Cannot Be Manually Changed'));

  // Reissue produces -R01
  const existing = INITIAL_OFFICIAL_DOCUMENTS[0];
  const reissued = reissueOfficialDocument(existing, INITIAL_OFFICIAL_DOCUMENTS, 'বেগম ফাতেমা খাতুন', 'Lost original');
  assert.equal(reissued.cancelledOriginal.status, 'Reissued');
  assert.ok(reissued.reissuedDoc.documentNumber.endsWith('-R01'));

  // QR Verification: Issued vs Cancelled
  const verified = verifyDocumentByQrOrNumber(INITIAL_OFFICIAL_DOCUMENTS, 'CERT-2026-GPS1042-001');
  assert.equal(verified.state, 'verified');
  assert.ok(verified.publicSummary!.recipientIdMasked.includes('••••'));

  const cancelled = verifyDocumentByQrOrNumber(INITIAL_OFFICIAL_DOCUMENTS, 'QR-VERIFY-TC-2026-002');
  assert.equal(cancelled.state, 'cancelled');
  assert.ok(cancelled.bannerEn.includes('Cancelled Document'));
});

test('Exam Routine Engine: invigilator/room/class conflict detection blocks Publish + student/teacher personal views', () => {
  const base = INITIAL_EXAM_ROUTINES[0];
  const conflictingRoutine = {
    ...base,
    id: 'exr-conflict-test',
    className: 'Class 5',
    status: 'Draft' as const,
    slots: [
      {
        ...base.slots[0],
        id: 'ers-c1',
        // Same date & time as base.slots[0] (2026-11-22 10:00-12:00), same room & same invigilator tch-3!
      },
    ],
  };

  const conflicts = detectExamRoutineConflicts(conflictingRoutine, INITIAL_EXAM_ROUTINES);
  assert.ok(conflicts.length >= 2); // invigilator_conflict + room_conflict
  const pubBlocked = publishExamRoutine(conflictingRoutine, INITIAL_EXAM_ROUTINES, 'বেগম ফাতেমা খাতুন');
  assert.equal(pubBlocked.ok, false);

  const cleanRoutine = {
    ...conflictingRoutine,
    slots: [
      {
        ...conflictingRoutine.slots[0],
        room: 'Hall B · Room 105',
        invigilatorTeacherId: 'tch-2',
        invigilatorTeacherName: 'মোঃ আব্দুর রহিম',
      },
    ],
  };
  const pubOk = publishExamRoutine(cleanRoutine, INITIAL_EXAM_ROUTINES, 'বেগম ফাতেমা খাতুন');
  assert.equal(pubOk.ok, true);
  assert.equal(pubOk.routine!.status, 'Published');

  const studentRoutine = getStudentPersonalExamRoutine(INITIAL_EXAM_ROUTINES, 'GPS-1042', 'Class 4', 'ক (A)');
  assert.equal(studentRoutine.length, 1);

  const duties = getTeacherInvigilatorDuties(INITIAL_EXAM_ROUTINES, 'GPS-1042', 'tch-3');
  assert.equal(duties.length, 2);

  const csv = exportExamRoutineCsv(base);
  assert.ok(csv.includes('Subject') && csv.includes('Bangla') && csv.includes('Invigilator'));
});

test('Notice Image System: MIME, 5MB limit, School Admin max image count & image audit history', () => {
  const badMime = validateNoticeImageFile({ fileName: 'script.pdf', mimeType: 'application/pdf', sizeBytes: 1000 }, 0, 5);
  assert.equal(badMime.ok, false);

  const tooBig = validateNoticeImageFile({ fileName: 'huge.png', mimeType: 'image/png', sizeBytes: 7 * 1024 * 1024 }, 0, 5);
  assert.equal(tooBig.ok, false);

  const overLimit = validateNoticeImageFile({ fileName: 'ok.jpg', mimeType: 'image/jpeg', sizeBytes: 250000 }, 3, 3);
  assert.equal(overLimit.ok, false);

  const valid = validateNoticeImageFile({ fileName: 'circular.webp', mimeType: 'image/webp', sizeBytes: 400000 }, 1, 5);
  assert.equal(valid.ok, true);

  const imgId = generateNoticeImageId();
  assert.match(imgId, /^IMG-NOTICE-/);

  const notice = createNoticeRecord({
    titleBn: 'ছবিযুক্ত পরীক্ষা নোটিশ',
    titleEn: 'Exam Circular With Image',
    bodyBn: 'বিস্তারিত ছবির নোটিশ সংযুক্ত।',
    bodyEn: 'Notice image attached.',
    noticeType: 'school',
    category: 'exam',
    audienceGroup: 'specific_section',
    targetClassNames: ['Class 4'],
    targetSections: ['ক (A)'],
    status: 'Published',
    schoolId: 'GPS-1042',
    author: 'বেগম ফাতেমা খাতুন',
    authorRole: 'school_admin',
    authorId: 'adm-gps-1',
    images: [],
  });
  const updated = updateNoticeImagesWithHistory(
    notice,
    [
      {
        id: imgId,
        dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
        fileName: 'circular.png',
        mimeType: 'image/png',
        sizeBytes: 1024,
        uploadedAt: '19 Nov 2026',
        uploadedBy: 'বেগম ফাতেমা খাতুন',
      },
    ],
    'Image Added',
    'বেগম ফাতেমা খাতুন',
    'Added circular.png'
  );
  assert.equal(updated.images?.length, 1);
  assert.equal(updated.history?.[0].action, 'Image Added');
});
