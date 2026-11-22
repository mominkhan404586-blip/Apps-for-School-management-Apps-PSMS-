import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Eye,
  FileCheck2,
  FileText,
  History,
  Lock,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type {
  ExamRecord,
  Language,
  OfficialDocumentCategory,
  OfficialDocumentMode,
  OfficialDocumentRecord,
  OfficialDocumentStatus,
  OfficialDocumentTemplate,
  OfficialDocumentType,
  Role,
  SchoolRecord,
  StudentRecord,
  TeacherRecord,
} from '../types';
import { b } from '../i18n/translations';
import {
  STUDENT_OFFICIAL_DOC_TYPES,
  TEACHER_OFFICIAL_DOC_TYPES,
  buildLockedSnapshotForStudent,
  buildLockedSnapshotForTeacher,
  generateOfficialDocument,
  reissueOfficialDocument,
  renderDocumentTemplate,
  transitionOfficialDocumentStatus,
  verifyDocumentByQrOrNumber,
} from '../utils/officialDocumentEngine';

interface OfficialDocumentSystemProps {
  lang: Language;
  role: Role;
  school: SchoolRecord;
  actorName: string;
  students: StudentRecord[];
  teachers: TeacherRecord[];
  exams: ExamRecord[];
  documents: OfficialDocumentRecord[];
  templates: OfficialDocumentTemplate[];
  onUpdateDocuments: (next: OfficialDocumentRecord[], toast?: string) => void;
  canGenerate?: boolean;
}

export const OfficialDocumentSystem: React.FC<OfficialDocumentSystemProps> = ({
  lang,
  role,
  school,
  actorName,
  students,
  teachers,
  exams,
  documents,
  templates,
  onUpdateDocuments,
  canGenerate = true,
}) => {
  const [subTab, setSubTab] = useState<'generate' | 'registry' | 'verify'>('generate');
  const [category, setCategory] = useState<OfficialDocumentCategory>('student');
  const [docType, setDocType] = useState<OfficialDocumentType>('prottoyon_patro');
  const [mode, setMode] = useState<OfficialDocumentMode>('auto');
  const [selectedStudentId, setSelectedStudentId] = useState(
    students.find((s) => s.schoolId === school.id)?.id ?? students[0]?.id ?? ''
  );
  const [selectedTeacherId, setSelectedTeacherId] = useState(
    teachers.find((t) => t.schoolId === school.id)?.id ?? teachers[0]?.id ?? ''
  );
  const [customBody, setCustomBody] = useState('');
  const [customRemarks, setCustomRemarks] = useState('');
  const [formError, setFormError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [verifyQuery, setVerifyQuery] = useState('CERT-2026-GPS1042-001');
  const [previewDoc, setPreviewDoc] = useState<OfficialDocumentRecord | null>(null);
  const [historyDocId, setHistoryDocId] = useState<string | null>(null);

  const schoolStudents = useMemo(
    () => students.filter((s) => s.schoolId === school.id),
    [students, school.id]
  );
  const schoolTeachers = useMemo(
    () => teachers.filter((t) => t.schoolId === school.id || t.schoolId === 'UNASSIGNED'),
    [teachers, school.id]
  );

  const selectedStudent = schoolStudents.find((s) => s.id === selectedStudentId) ?? schoolStudents[0];
  const selectedTeacher = schoolTeachers.find((t) => t.id === selectedTeacherId) ?? schoolTeachers[0];

  const docTypeOptions = category === 'student' ? STUDENT_OFFICIAL_DOC_TYPES : TEACHER_OFFICIAL_DOC_TYPES;

  const liveSnapshot = useMemo(() => {
    const today = '2026-11-19';
    if (category === 'student' && selectedStudent) {
      return buildLockedSnapshotForStudent(selectedStudent, school, 'PREVIEW-2026', today);
    }
    if (category === 'teacher' && selectedTeacher) {
      return buildLockedSnapshotForTeacher(selectedTeacher, school, 'PREVIEW-2026', today);
    }
    return {};
  }, [category, selectedStudent, selectedTeacher, school]);

  const activeTemplate = useMemo(
    () =>
      templates.find((t) => t.docType === docType) ??
      templates.find((t) => t.category === category),
    [templates, docType, category]
  );

  const templateRenderedPreview = useMemo(() => {
    if (!activeTemplate) return '';
    return renderDocumentTemplate(activeTemplate.bodyTemplate, liveSnapshot);
  }, [activeTemplate, liveSnapshot]);

  const schoolDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return documents.filter((d) => {
      if (role !== 'central_admin' && d.schoolId !== school.id) return false;
      if (!q) return true;
      return `${d.documentNumber} ${d.targetNameBn} ${d.targetPermanentId} ${d.docTitleBn} ${d.docTitleEn}`
        .toLowerCase()
        .includes(q);
    });
  }, [documents, role, school.id, searchQuery]);

  const verificationResult = useMemo(
    () => verifyDocumentByQrOrNumber(documents, verifyQuery),
    [documents, verifyQuery]
  );

  const handleGenerate = (saveAsStatus: OfficialDocumentStatus) => {
    setFormError('');
    const res = generateOfficialDocument({
      category,
      docType,
      mode,
      school,
      student: selectedStudent,
      teacher: selectedTeacher,
      exams,
      existingDocs: documents,
      templates,
      customBody: mode === 'manual' ? customBody : undefined,
      customRemarks,
      actorName,
      initialStatus: saveAsStatus,
    });
    if (!res.ok || !res.doc) {
      setFormError(b(res.errorBn ?? 'তৈরি করা যায়নি।', res.errorEn ?? 'Generation failed.', lang));
      return;
    }
    onUpdateDocuments(
      [res.doc, ...documents],
      `${res.doc.docTitleEn} (${res.doc.documentNumber}) · ${res.doc.status}`
    );
    setPreviewDoc(res.doc);
    setSubTab('registry');
  };

  const handleStatusChange = (docId: string, nextStatus: OfficialDocumentStatus, note?: string) => {
    const next = documents.map((d) =>
      d.id === docId ? transitionOfficialDocumentStatus(d, nextStatus, actorName, note) : d
    );
    onUpdateDocuments(next, `${nextStatus}: ${docId}`);
  };

  const handleReissue = (doc: OfficialDocumentRecord) => {
    const { cancelledOriginal, reissuedDoc } = reissueOfficialDocument(doc, documents, actorName);
    const next = [
      reissuedDoc,
      ...documents.map((d) => (d.id === doc.id ? cancelledOriginal : d)),
    ];
    onUpdateDocuments(next, `Reissued as ${reissuedDoc.documentNumber}`);
    setPreviewDoc(reissuedDoc);
  };

  const isSchoolAdminOrCentral = role === 'school_admin' || role === 'central_admin';

  return (
    <div className="space-y-5 text-xs">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            {b(
              'অফিশিয়াল ডকুমেন্ট, সনদপত্র ও আইডি কার্ড সিস্টেম',
              'Official Documents, Certificates, Marksheets & ID Cards',
              lang
            )}
          </h1>
          <p className="text-slate-500 mt-0.5">
            {school.nameBn} ({school.code}) ·{' '}
            {b(
              '১৫টি শিক্ষার্থী ও ৮টি শিক্ষক ডকুমেন্ট · Auto / Template / Manual · QR যাচাই',
              '15 Student + 8 Teacher Document Types · Auto / Template / Manual · QR Verification',
              lang
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: 'generate', bn: 'নতুন ডকুমেন্ট তৈরি', en: 'Generate Document', icon: FileText },
              { id: 'registry', bn: `সকল ডকুমেন্ট (${schoolDocs.length})`, en: `Registry (${schoolDocs.length})`, icon: FileCheck2 },
              { id: 'verify', bn: 'QR ডকুমেন্ট যাচাই', en: 'Verify QR / Number', icon: QrCode },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold cursor-pointer ${
                  subTab === t.id
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {b(t.bn, t.en, lang)}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: GENERATOR */}
      {subTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 no-print">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            {!canGenerate && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-semibold">
                {b(
                  'এই বিদ্যালয়ে ডকুমেন্ট তৈরির অনুমতি বর্তমানে স্কুল অ্যাডমিন কর্তৃক সীমাবদ্ধ।',
                  'Document generation permission is restricted by School Admin for this assignment.',
                  lang
                )}
              </div>
            )}

            {/* Target Category + Doc Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">{b('প্রাপকের ধরন', 'Recipient Category', lang)}</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCategory('student');
                      setDocType('prottoyon_patro');
                    }}
                    className={`h-9 rounded-lg font-bold border cursor-pointer ${
                      category === 'student'
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {b('শিক্ষার্থী (১৫টি)', 'Student (15)', lang)}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCategory('teacher');
                      setDocType('employment_certificate');
                    }}
                    className={`h-9 rounded-lg font-bold border cursor-pointer ${
                      category === 'teacher'
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {b('শিক্ষক (৮টি)', 'Teacher (8)', lang)}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">{b('ডকুমেন্ট নির্বাচন করুন', 'Document Type', lang)}</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as OfficialDocumentType)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {docTypeOptions.map((d) => (
                    <option key={d.type} value={d.type}>
                      {b(d.nameBn, d.nameEn, lang)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recipient Select + 3 Modes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">
                  {category === 'student' ? b('শিক্ষার্থী নির্বাচন করুন', 'Select Student', lang) : b('শিক্ষক নির্বাচন করুন', 'Select Teacher', lang)}
                </label>
                {category === 'student' ? (
                  <select
                    value={selectedStudent?.id ?? ''}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    {schoolStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nameBn} ({s.permanentId} · {s.className})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedTeacher?.id ?? ''}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    {schoolTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nameBn} ({t.teacherCode})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-semibold mb-1">{b('তৈরির পদ্ধতি (Generation Mode)', 'Generation Mode', lang)}</label>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { id: 'auto', label: '🤖 Auto Generate' },
                      { id: 'template', label: '👁 View Template' },
                      { id: 'manual', label: '✍️ Manual / Custom' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setMode(m.id);
                        if (m.id === 'manual' && !customBody) {
                          setCustomBody(templateRenderedPreview);
                        }
                      }}
                      className={`h-9 px-1.5 rounded-lg border font-semibold text-[11px] cursor-pointer ${
                        mode === m.id
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {mode === 'template' && activeTemplate && (
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  {b('ডাইনামিক টেমপ্লেট প্লেসহোল্ডার (System Locked Fields)', 'Dynamic Template Placeholders', lang)}
                </div>
                <p className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                  {activeTemplate.bodyTemplate}
                </p>
                <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                  ⚠️ System Information Cannot Be Manually Changed
                </div>
              </div>
            )}

            {mode === 'manual' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold">
                    {b('কাস্টম / অতিরিক্ত বিবরণ (সিস্টেম তথ্য অপরিবর্তনীয়)', 'Manual / Custom Text (System Fields Locked)', lang)}
                  </label>
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                    🔒 Name / ID / School / Doc# Locked
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold mb-1">{b('মন্তব্য / বিশেষ কৃতিত্ব (ঐচ্ছিক)', 'Custom Remarks (Optional)', lang)}</label>
              <input
                type="text"
                value={customRemarks}
                onChange={(e) => setCustomRemarks(e.target.value)}
                placeholder={b('যেমন: বার্ষিক ক্রীড়া ও সাংস্কৃতিক প্রতিযোগিতায় ১ম স্থান', 'e.g. Excellent academic standing & conduct', lang)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-semibold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={!canGenerate}
                onClick={() => handleGenerate('Draft')}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold disabled:opacity-50 cursor-pointer"
              >
                {b('খসড়া (Save Draft)', 'Save Draft', lang)}
              </button>
              <button
                type="button"
                disabled={!canGenerate}
                onClick={() => handleGenerate(isSchoolAdminOrCentral ? 'Issued' : 'Pending Approval')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4" />
                {isSchoolAdminOrCentral
                  ? b('তৈরি ও ইস্যু করুন (Generate & Issue)', 'Generate & Issue', lang)
                  : b('অনুমোদনের জন্য প্রেরণ করুন', 'Submit for Approval', lang)}
              </button>
            </div>
          </div>

          {/* Live Locked Snapshot & Seal Preview */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-blue-700" />
              {b('লাইভ অফিশিয়াল প্রিভিউ', 'Live Official Preview', lang)}
            </div>
            <div className="p-4 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
              <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-2">
                <div className="font-bold text-slate-900 dark:text-white">{school.nameBn}</div>
                <div className="text-[11px] text-slate-500">{school.code} · {school.upazila}, {school.district}</div>
              </div>
              <p className="leading-relaxed text-slate-700 dark:text-slate-200">
                {mode === 'manual' && customBody ? customBody : templateRenderedPreview}
              </p>
              {customRemarks && (
                <div className="text-[11px] italic text-blue-700 dark:text-blue-400">
                  Remarks: {customRemarks}
                </div>
              )}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[10px] text-slate-500">
                <span>SEAL · {school.code}</span>
                <span>{school.headTeacher} (Head Teacher)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REGISTRY */}
      {subTab === 'registry' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden no-print">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="font-bold text-sm">{b('জারিকৃত ও অপেক্ষমাণ ডকুমেন্ট তালিকা', 'Official Document Registry & History', lang)}</div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={b('নথি নং / নাম / আইডি দিয়ে খুঁজুন...', 'Search Doc#, Name, ID...', lang)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {schoolDocs.map((doc) => (
              <div key={doc.id} className="p-4 space-y-2 hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-blue-700 dark:text-blue-400">{doc.documentNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          doc.status === 'Issued' || doc.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : doc.status === 'Cancelled' || doc.status === 'Rejected'
                              ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}
                      >
                        {doc.status}
                      </span>
                      <span className="text-[11px] text-slate-500">{doc.mode.toUpperCase()}</span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {b(doc.docTitleBn, doc.docTitleEn, lang)} — {doc.targetNameBn} ({doc.targetPermanentId})
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {doc.targetMetaSummary} · Issued: {doc.issueDate}
                      {doc.reissueOfDocNumber && ` · Reissued from ${doc.reissueOfDocNumber}`}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      {b('প্রিভিউ / প্রিন্ট', 'Preview / Print', lang)}
                    </button>
                    {isSchoolAdminOrCentral && (doc.status === 'Draft' || doc.status === 'Pending Approval' || doc.status === 'Generated') && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(doc.id, 'Issued', 'Approved & Officially Issued')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {b('Approve & Issue', 'Approve & Issue', lang)}
                      </button>
                    )}
                    {isSchoolAdminOrCentral && doc.status !== 'Cancelled' && doc.status !== 'Reissued' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleReissue(doc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-700 dark:text-blue-400 font-semibold cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          {b('Reissue (-R01)', 'Reissue', lang)}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(doc.id, 'Cancelled', 'Cancelled by administrator')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 font-semibold cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          {b('বাতিল', 'Cancel', lang)}
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setHistoryDocId((prev) => (prev === doc.id ? null : doc.id))}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5" />
                      {b('ইতিহাস', 'Audit', lang)}
                    </button>
                  </div>
                </div>

                {historyDocId === doc.id && (
                  <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700 space-y-1 text-[11px] text-slate-500">
                    {doc.auditHistory.map((h) => (
                      <div key={h.id} className="flex justify-between">
                        <span><strong>{h.action}</strong> · {h.note} ({h.actorName})</span>
                        <span className="font-mono">{h.timestamp}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: QR VERIFICATION LOOKUP */}
      {subTab === 'verify' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 no-print">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              {b('QR ও ডকুমেন্ট নম্বর যাচাই (Public Verification)', 'QR & Document Number Verification', lang)}
            </h2>
            <p className="text-slate-500 mt-0.5">
              {b(
                'গোপনীয় তথ্য আড়াল রেখে সনদপত্র বা আইডি কার্ডের বৈধতা তাৎক্ষণিক যাচাই করুন।',
                'Instantly verify certificate authenticity while masking private contact information.',
                lang
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={verifyQuery}
              onChange={(e) => setVerifyQuery(e.target.value)}
              placeholder="CERT-2026-GPS1042-001 or QR-VERIFY-..."
              className="flex-1 h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono outline-none"
            />
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setVerifyQuery('CERT-2026-GPS1042-001')}
                className="px-3 h-10 rounded-lg border border-emerald-200 text-emerald-700 font-semibold cursor-pointer"
              >
                Sample Valid
              </button>
              <button
                type="button"
                onClick={() => setVerifyQuery('TC-2026-GPS1042-002')}
                className="px-3 h-10 rounded-lg border border-red-200 text-red-600 font-semibold cursor-pointer"
              >
                Sample Cancelled
              </button>
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border space-y-2 ${
              verificationResult.state === 'verified'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
            }`}
          >
            <div className="text-sm font-bold">{b(verificationResult.bannerBn, verificationResult.bannerEn, lang)}</div>
            {verificationResult.publicSummary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                <div><strong>Document #:</strong> <span className="font-mono">{verificationResult.publicSummary.documentNumber}</span></div>
                <div><strong>Type:</strong> {b(verificationResult.publicSummary.docTitleBn, verificationResult.publicSummary.docTitleEn, lang)}</div>
                <div><strong>Recipient:</strong> {verificationResult.publicSummary.recipientNameBn}</div>
                <div><strong>Protected ID:</strong> <span className="font-mono">{verificationResult.publicSummary.recipientIdMasked}</span></div>
                <div><strong>School:</strong> {verificationResult.publicSummary.schoolNameBn}</div>
                <div><strong>Issue Date:</strong> {verificationResult.publicSummary.issueDate} ({verificationResult.publicSummary.status})</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printable Official Certificate Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between no-print">
              <span className="font-bold text-sm">{previewDoc.documentNumber}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {b('প্রিন্ট / PDF সংরক্ষণ', 'Print / Save PDF', lang)}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                >
                  {b('বন্ধ করুন', 'Close', lang)}
                </button>
              </div>
            </div>

            <div className="p-8 bg-white text-slate-900 space-y-5">
              <div className="border-4 border-double border-blue-900 p-6 space-y-4">
                <div className="text-center border-b border-slate-300 pb-3">
                  <div className="text-lg font-extrabold text-blue-900">{previewDoc.schoolNameBn}</div>
                  <div className="text-xs text-slate-600">{school.fullAddress} · Code: {school.code}</div>
                  <div className="mt-2 inline-block px-4 py-1 rounded bg-blue-900 text-white font-bold text-sm">
                    {b(previewDoc.docTitleBn, previewDoc.docTitleEn, lang)}
                  </div>
                </div>

                <div className="flex justify-between text-xs font-mono text-slate-600">
                  <span>Doc No: {previewDoc.documentNumber}</span>
                  <span>Issue Date: {previewDoc.issueDate}</span>
                </div>

                <p className="text-sm leading-loose text-slate-800">{previewDoc.renderedBody}</p>
                {previewDoc.customRemarks && (
                  <p className="text-xs italic text-slate-600">Note: {previewDoc.customRemarks}</p>
                )}

                <div className="pt-8 flex items-end justify-between text-xs">
                  <div className="text-center">
                    <div className="px-2 py-1 border border-slate-400 font-mono text-[10px] mb-1">
                      {previewDoc.qrVerifyCode}
                    </div>
                    <div className="text-[10px] text-slate-500">QR Verification Code</div>
                  </div>
                  <div className="w-20 h-20 rounded-full border-2 border-blue-900 flex items-center justify-center text-[10px] font-bold text-blue-900 text-center p-1">
                    OFFICIAL SCHOOL SEAL · {school.code}
                  </div>
                  <div className="text-center">
                    <div className="border-t border-slate-800 pt-1 font-bold">{school.headTeacher}</div>
                    <div className="text-[11px] text-slate-600">Head Teacher / School Admin</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
