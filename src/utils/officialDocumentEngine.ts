import type {
  ExamRecord,
  OfficialDocumentCategory,
  OfficialDocumentMode,
  OfficialDocumentRecord,
  OfficialDocumentStatus,
  OfficialDocumentTemplate,
  OfficialDocumentType,
  SchoolRecord,
  StudentOfficialDocType,
  StudentRecord,
  TeacherOfficialDocType,
  TeacherRecord,
} from '../types';

export interface DocTypeMeta {
  type: OfficialDocumentType;
  category: OfficialDocumentCategory;
  nameBn: string;
  nameEn: string;
  prefixCode: string;
}

export const STUDENT_OFFICIAL_DOC_TYPES: DocTypeMeta[] = [
  { type: 'prottoyon_patro', category: 'student', nameBn: 'প্রত্যয়ন পত্র', nameEn: 'Prottoyon Patro', prefixCode: 'CERT' },
  { type: 'transfer_certificate', category: 'student', nameBn: 'ছাড়পত্র / Transfer Certificate', nameEn: 'Transfer Certificate (TC)', prefixCode: 'TC' },
  { type: 'testimonial', category: 'student', nameBn: 'প্রশংসা পত্র', nameEn: 'Testimonial', prefixCode: 'TEST' },
  { type: 'character_certificate', category: 'student', nameBn: 'চারিত্রিক সনদ', nameEn: 'Character Certificate', prefixCode: 'CHAR' },
  { type: 'studentship_certificate', category: 'student', nameBn: 'অধ্যয়নরত সনদ', nameEn: 'Studentship Certificate', prefixCode: 'STDY' },
  { type: 'student_id_card', category: 'student', nameBn: 'Student ID Card', nameEn: 'Student ID Card', prefixCode: 'ID' },
  { type: 'marksheet', category: 'student', nameBn: 'Marksheet', nameEn: 'Academic Marksheet', prefixCode: 'MARK' },
  { type: 'progress_report', category: 'student', nameBn: 'Progress Report', nameEn: 'Progress Report', prefixCode: 'PROG' },
  { type: 'result_certificate', category: 'student', nameBn: 'Result Certificate', nameEn: 'Result Certificate', prefixCode: 'RSLT' },
  { type: 'admission_certificate', category: 'student', nameBn: 'Admission Certificate', nameEn: 'Admission Certificate', prefixCode: 'ADMT' },
  { type: 'scholarship_certificate', category: 'student', nameBn: 'Scholarship Certificate', nameEn: 'Scholarship Certificate', prefixCode: 'SCHL' },
  { type: 'participation_certificate', category: 'student', nameBn: 'Participation Certificate', nameEn: 'Participation Certificate', prefixCode: 'PART' },
  { type: 'achievement_certificate', category: 'student', nameBn: 'Achievement Certificate', nameEn: 'Achievement Certificate', prefixCode: 'ACHV' },
  { type: 'study_completion_certificate', category: 'student', nameBn: 'Study Completion Certificate', nameEn: 'Study Completion Certificate', prefixCode: 'COMP' },
  { type: 'other_student_certificate', category: 'student', nameBn: 'অন্যান্য অনুমোদিত Certificate', nameEn: 'Other Approved Certificate', prefixCode: 'CERT' },
];

export const TEACHER_OFFICIAL_DOC_TYPES: DocTypeMeta[] = [
  { type: 'teacher_id_card', category: 'teacher', nameBn: 'Teacher ID Card', nameEn: 'Teacher ID Card', prefixCode: 'TID' },
  { type: 'employment_certificate', category: 'teacher', nameBn: 'Employment Certificate', nameEn: 'Employment Certificate', prefixCode: 'EMP' },
  { type: 'working_certificate', category: 'teacher', nameBn: 'Working Certificate', nameEn: 'Working Certificate', prefixCode: 'WORK' },
  { type: 'experience_certificate', category: 'teacher', nameBn: 'Experience Certificate', nameEn: 'Experience Certificate', prefixCode: 'EXPR' },
  { type: 'teacher_testimonial', category: 'teacher', nameBn: 'প্রশংসা পত্র', nameEn: 'Teacher Testimonial', prefixCode: 'TTST' },
  { type: 'release_certificate', category: 'teacher', nameBn: 'Release Certificate', nameEn: 'Release Certificate', prefixCode: 'REL' },
  { type: 'training_certificate', category: 'teacher', nameBn: 'Training Certificate', nameEn: 'Training Certificate', prefixCode: 'TRN' },
  { type: 'other_teacher_document', category: 'teacher', nameBn: 'অন্যান্য অনুমোদিত Official Document', nameEn: 'Other Official Document', prefixCode: 'TDOC' },
];

export const ALL_OFFICIAL_DOC_TYPES: DocTypeMeta[] = [
  ...STUDENT_OFFICIAL_DOC_TYPES,
  ...TEACHER_OFFICIAL_DOC_TYPES,
];

export function getDocTypeMeta(docType: OfficialDocumentType): DocTypeMeta {
  return ALL_OFFICIAL_DOC_TYPES.find((d) => d.type === docType) ?? STUDENT_OFFICIAL_DOC_TYPES[0];
}

export function generateUniqueDocNumber(
  docType: OfficialDocumentType,
  schoolCode: string,
  existingDocs: OfficialDocumentRecord[],
  year = 2026
): string {
  const meta = getDocTypeMeta(docType);
  const cleanCode = schoolCode.replace(/[^A-Za-z0-9]/g, '');
  const seq = String(existingDocs.length + 1).padStart(3, '0');
  let candidate = `${meta.prefixCode}-${year}-${cleanCode}-${seq}`;
  let counter = existingDocs.length + 1;
  while (existingDocs.some((d) => d.documentNumber === candidate)) {
    counter += 1;
    candidate = `${meta.prefixCode}-${year}-${cleanCode}-${String(counter).padStart(3, '0')}`;
  }
  return candidate;
}

export function buildLockedSnapshotForStudent(
  student: StudentRecord,
  school: SchoolRecord,
  docNumber: string,
  issueDate: string
): Record<string, string> {
  return {
    student_name: student.nameBn,
    student_id: student.permanentId,
    father_name: student.fatherName,
    class: student.className,
    section: student.section,
    roll: String(student.roll),
    session: student.academicYear ?? school.academicYear ?? '২০২৬',
    school_name: school.nameBn,
    issue_date: issueDate,
    document_number: docNumber,
  };
}

export function buildLockedSnapshotForTeacher(
  teacher: TeacherRecord,
  school: SchoolRecord,
  docNumber: string,
  issueDate: string
): Record<string, string> {
  return {
    teacher_name: teacher.nameBn,
    teacher_id: teacher.teacherCode,
    designation: teacher.designation,
    school_name: school.nameBn,
    issue_date: issueDate,
    document_number: docNumber,
  };
}

export function renderDocumentTemplate(
  templateBody: string,
  snapshot: Record<string, string>
): string {
  let out = templateBody;
  for (const [key, val] of Object.entries(snapshot)) {
    out = out.replaceAll(`{{${key}}}`, val);
  }
  return out;
}

export function validateTemplateManualEdit(
  editedBody: string,
  lockedSnapshot: Record<string, string>
): { ok: boolean; missingKeys: string[]; warningBn?: string; warningEn?: string } {
  const missingKeys: string[] = [];
  for (const [key, val] of Object.entries(lockedSnapshot)) {
    if (!val.trim()) continue;
    // Key fields that must not be manually altered or deleted once locked
    if (
      ['student_name', 'student_id', 'school_name', 'document_number', 'teacher_name'].includes(key) &&
      !editedBody.includes(val)
    ) {
      missingKeys.push(key);
    }
  }
  if (missingKeys.length > 0) {
    return {
      ok: false,
      missingKeys,
      warningBn: '⚠️ System Information Cannot Be Manually Changed — সিস্টেমের নির্ধারিত নাম, আইডি, বিদ্যালয় বা ডকুমেন্ট নম্বর পরিবর্তন করা যাবে না।',
      warningEn: `⚠️ System Information Cannot Be Manually Changed (${missingKeys.join(', ')})`,
    };
  }
  return { ok: true, missingKeys: [] };
}

export function generateOfficialDocument(params: {
  category: OfficialDocumentCategory;
  docType: OfficialDocumentType;
  mode: OfficialDocumentMode;
  school: SchoolRecord;
  student?: StudentRecord;
  teacher?: TeacherRecord;
  exams?: ExamRecord[];
  existingDocs: OfficialDocumentRecord[];
  templates: OfficialDocumentTemplate[];
  customBody?: string;
  customRemarks?: string;
  actorName: string;
  issueDate?: string;
  initialStatus?: OfficialDocumentStatus;
}): { ok: boolean; doc?: OfficialDocumentRecord; errorBn?: string; errorEn?: string } {
  const issueDate = params.issueDate ?? new Date().toISOString().slice(0, 10);
  const meta = getDocTypeMeta(params.docType);

  if (params.category === 'student') {
    const stu = params.student;
    if (!stu) {
      return { ok: false, errorBn: 'শিক্ষার্থী নির্বাচন করুন।', errorEn: 'Select a student.' };
    }

    // Result completeness check before auto-generating marksheet
    if (
      params.mode === 'auto' &&
      (params.docType === 'marksheet' || params.docType === 'result_certificate')
    ) {
      const stuEntries = (params.exams ?? [])
        .filter((e) => !e.schoolId || e.schoolId === params.school.id)
        .flatMap((e) => e.entries)
        .filter((entry) => entry.studentId === stu.id);
      if (stuEntries.length === 0) {
        return {
          ok: false,
          errorBn: `⚠️ ${stu.nameBn}-এর কোনো প্রকাশিত পরীক্ষার নম্বরপত্র অসম্পূর্ণ বা পাওয়া যায়নি। Marksheet Auto Generate করা সম্ভব নয়।`,
          errorEn: `Incomplete examination results for ${stu.nameEn}. Cannot auto-generate marksheet.`,
        };
      }
    }

    const docNumber = generateUniqueDocNumber(params.docType, params.school.code, params.existingDocs);
    const snapshot = buildLockedSnapshotForStudent(stu, params.school, docNumber, issueDate);
    const tpl =
      params.templates.find((t) => t.docType === params.docType) ??
      params.templates.find((t) => t.category === 'student');
    const defaultBody = tpl
      ? renderDocumentTemplate(tpl.bodyTemplate, snapshot)
      : `${meta.nameBn} (${docNumber}) — ${stu.nameBn} (${stu.permanentId}), পিতা: ${stu.fatherName}, ${params.school.nameBn}, ${stu.className} (${stu.section}), Roll #${stu.roll}. Issued: ${issueDate}.`;

    let renderedBody = defaultBody;
    if (params.mode === 'manual' && params.customBody?.trim()) {
      const guard = validateTemplateManualEdit(params.customBody, snapshot);
      if (!guard.ok) {
        return { ok: false, errorBn: guard.warningBn, errorEn: guard.warningEn };
      }
      renderedBody = params.customBody.trim();
    }

    const status: OfficialDocumentStatus = params.initialStatus ?? 'Generated';
    const doc: OfficialDocumentRecord = {
      id: `doc-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 90 + 10)}`,
      documentNumber: docNumber,
      qrVerifyCode: `QR-VERIFY-${docNumber}`,
      category: 'student',
      docType: params.docType as StudentOfficialDocType,
      docTitleBn: meta.nameBn,
      docTitleEn: meta.nameEn,
      mode: params.mode,
      status,
      schoolId: params.school.id,
      schoolNameBn: params.school.nameBn,
      targetEntityId: stu.id,
      targetPermanentId: stu.permanentId,
      targetNameBn: stu.nameBn,
      targetNameEn: stu.nameEn,
      targetMetaSummary: `${stu.className} · ${stu.section} · Roll #${stu.roll}`,
      renderedBody,
      customRemarks: params.customRemarks?.trim(),
      lockedSystemSnapshot: snapshot,
      issueDate,
      issuedBy: params.actorName,
      auditHistory: [
        {
          id: `da-${Date.now().toString().slice(-5)}`,
          timestamp: `${issueDate} (Live)`,
          actorName: params.actorName,
          action: `${params.mode.toUpperCase()} Created`,
          status,
          note: `${meta.nameEn} generated (${docNumber}).`,
        },
      ],
    };
    return { ok: true, doc };
  }

  // Teacher Document Generation
  const tch = params.teacher;
  if (!tch) {
    return { ok: false, errorBn: 'শিক্ষক নির্বাচন করুন।', errorEn: 'Select a teacher.' };
  }
  const docNumber = generateUniqueDocNumber(params.docType, params.school.code, params.existingDocs);
  const snapshot = buildLockedSnapshotForTeacher(tch, params.school, docNumber, issueDate);
  const tpl = params.templates.find((t) => t.docType === params.docType);
  const defaultBody = tpl
    ? renderDocumentTemplate(tpl.bodyTemplate, snapshot)
    : `${meta.nameBn} (${docNumber}) — ${tch.nameBn} (${tch.teacherCode}), পদবি: ${tch.designation}, ${params.school.nameBn}. তারিখ: ${issueDate}।`;

  let renderedBody = defaultBody;
  if (params.mode === 'manual' && params.customBody?.trim()) {
    const guard = validateTemplateManualEdit(params.customBody, snapshot);
    if (!guard.ok) {
      return { ok: false, errorBn: guard.warningBn, errorEn: guard.warningEn };
    }
    renderedBody = params.customBody.trim();
  }

  const status: OfficialDocumentStatus = params.initialStatus ?? 'Generated';
  const doc: OfficialDocumentRecord = {
    id: `doc-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 90 + 10)}`,
    documentNumber: docNumber,
    qrVerifyCode: `QR-VERIFY-${docNumber}`,
    category: 'teacher',
    docType: params.docType as TeacherOfficialDocType,
    docTitleBn: meta.nameBn,
    docTitleEn: meta.nameEn,
    mode: params.mode,
    status,
    schoolId: params.school.id,
    schoolNameBn: params.school.nameBn,
    targetEntityId: tch.id,
    targetPermanentId: tch.teacherCode,
    targetNameBn: tch.nameBn,
    targetNameEn: tch.nameEn,
    targetMetaSummary: `${tch.designation} · ${tch.teacherCode}`,
    renderedBody,
    customRemarks: params.customRemarks?.trim(),
    lockedSystemSnapshot: snapshot,
    issueDate,
    issuedBy: params.actorName,
    auditHistory: [
      {
        id: `da-${Date.now().toString().slice(-5)}`,
        timestamp: `${issueDate} (Live)`,
        actorName: params.actorName,
        action: `${params.mode.toUpperCase()} Created`,
        status,
        note: `${meta.nameEn} generated (${docNumber}).`,
      },
    ],
  };
  return { ok: true, doc };
}

export function transitionOfficialDocumentStatus(
  doc: OfficialDocumentRecord,
  nextStatus: OfficialDocumentStatus,
  actorName: string,
  note?: string
): OfficialDocumentRecord {
  return {
    ...doc,
    status: nextStatus,
    approvedBy: nextStatus === 'Approved' || nextStatus === 'Issued' ? actorName : doc.approvedBy,
    cancelReason: nextStatus === 'Cancelled' ? note || 'Cancelled by administration' : doc.cancelReason,
    auditHistory: [
      {
        id: `da-${Date.now().toString().slice(-5)}`,
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        actorName,
        action: nextStatus,
        status: nextStatus,
        note: note || `Status changed to ${nextStatus}`,
      },
      ...doc.auditHistory,
    ],
  };
}

export function reissueOfficialDocument(
  originalDoc: OfficialDocumentRecord,
  existingDocs: OfficialDocumentRecord[],
  actorName: string,
  reason = 'Reissued on verified request'
): { cancelledOriginal: OfficialDocumentRecord; reissuedDoc: OfficialDocumentRecord } {
  const baseNumber = originalDoc.documentNumber.replace(/-R\d+$/, '');
  const nextCount = (originalDoc.reissueCount ?? 0) + 1;
  let newDocNum = `${baseNumber}-R${String(nextCount).padStart(2, '0')}`;
  let idx = nextCount;
  while (existingDocs.some((d) => d.documentNumber === newDocNum)) {
    idx += 1;
    newDocNum = `${baseNumber}-R${String(idx).padStart(2, '0')}`;
  }

  const cancelledOriginal = transitionOfficialDocumentStatus(
    originalDoc,
    'Reissued',
    actorName,
    `Superseded by reissue ${newDocNum}: ${reason}`
  );

  const today = new Date().toISOString().slice(0, 10);
  const reissuedDoc: OfficialDocumentRecord = {
    ...originalDoc,
    id: `doc-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 90 + 10)}`,
    documentNumber: newDocNum,
    qrVerifyCode: `QR-VERIFY-${newDocNum}`,
    status: 'Issued',
    issueDate: today,
    reissueOfDocNumber: originalDoc.documentNumber,
    reissueCount: idx,
    lockedSystemSnapshot: {
      ...originalDoc.lockedSystemSnapshot,
      document_number: newDocNum,
      issue_date: today,
    },
    auditHistory: [
      {
        id: `da-re-${Date.now().toString().slice(-5)}`,
        timestamp: today,
        actorName,
        action: 'Reissued',
        status: 'Issued',
        note: `Reissued from ${originalDoc.documentNumber}: ${reason}`,
      },
    ],
  };

  return { cancelledOriginal, reissuedDoc };
}

export interface DocumentQrVerificationResult {
  state: 'verified' | 'cancelled' | 'not_found';
  bannerBn: string;
  bannerEn: string;
  publicSummary?: {
    documentNumber: string;
    docTitleBn: string;
    docTitleEn: string;
    recipientNameBn: string;
    recipientIdMasked: string;
    schoolNameBn: string;
    issueDate: string;
    status: OfficialDocumentStatus;
  };
}

export function verifyDocumentByQrOrNumber(
  docs: OfficialDocumentRecord[],
  query: string
): DocumentQrVerificationResult {
  const q = query.trim().toLowerCase();
  if (!q) {
    return {
      state: 'not_found',
      bannerBn: 'যাচাই করতে ডকুমেন্ট নম্বর বা QR কোড লিখুন।',
      bannerEn: 'Enter a document number or QR code to verify.',
    };
  }
  const found = docs.find(
    (d) =>
      d.documentNumber.toLowerCase() === q ||
      d.qrVerifyCode.toLowerCase() === q ||
      d.qrVerifyCode.toLowerCase().includes(q)
  );
  if (!found) {
    return {
      state: 'not_found',
      bannerBn: '❌ কোনো বৈধ অফিশিয়াল ডকুমেন্ট পাওয়া যায়নি।',
      bannerEn: '❌ No official document matched this code.',
    };
  }

  const maskedId =
    found.targetPermanentId.length > 6
      ? `${found.targetPermanentId.slice(0, 4)}••••${found.targetPermanentId.slice(-4)}`
      : found.targetPermanentId;

  const publicSummary = {
    documentNumber: found.documentNumber,
    docTitleBn: found.docTitleBn,
    docTitleEn: found.docTitleEn,
    recipientNameBn: found.targetNameBn,
    recipientIdMasked: maskedId,
    schoolNameBn: found.schoolNameBn,
    issueDate: found.issueDate,
    status: found.status,
  };

  if (found.status === 'Cancelled' || found.status === 'Rejected') {
    return {
      state: 'cancelled',
      bannerBn: '❌ Cancelled Document — এই ডকুমেন্টটি বাতিল/অকার্যকর ঘোষণা করা হয়েছে।',
      bannerEn: '❌ Cancelled Document — This certificate has been cancelled.',
      publicSummary,
    };
  }

  return {
    state: 'verified',
    bannerBn: '✓ Verified Official Document — সিস্টেম কর্তৃক যাচাইকৃত বৈধ সনদ/নথি।',
    bannerEn: '✓ Verified Official Document — Authentic record confirmed.',
    publicSummary,
  };
}
