import React, { useMemo, useState } from 'react';
import {
  Award,
  Bell,
  CheckCircle2,
  FileDown,
  Globe,
  History,
  Lock,
  Printer,
  Send,
  ShieldCheck,
  Unlock,
  X,
} from 'lucide-react';
import { ExamPdfReportModal } from './ExamPdfReportModal';
import type {
  ExamRecord,
  GradingRuleItem,
  Language,
  ResultAuditEntry,
  SchoolRecord,
  StudentRecord,
  SubjectResultSubmission,
  TeacherRecord,
  TeacherSubjectAssignment,
} from '../types';
import {
  canSchoolPublishResult,
  canTeacherEnterSubjectMarks,
  computeEntryTotalMarks,
  computeResultCompletionProgress,
  computeSubjectAndOverallPositions,
  calculateCustomGradeAndGPA,
  validateMarksEntrySubmission,
} from '../utils/academicEngine';
import { b } from '../i18n/translations';
import { pickPrimaryTermOrPublishedExam } from '../utils/examGovernanceEngine';
import { ProgressMeter } from './Charts';

/* ============================================================================
 * 1. TEACHER MARKS SUBMISSION PANEL (Roll-Wise Table + Confirmation + RBAC)
 * ============================================================================ */

interface TeacherMarksSubmissionPanelProps {
  lang: Language;
  teacher: TeacherRecord;
  allTeachers: TeacherRecord[];
  onSwitchTeacher: (teacherId: string) => void;
  teacherAssignments: TeacherSubjectAssignment[];
  exams: ExamRecord[];
  students: StudentRecord[];
  gradingRules: GradingRuleItem[];
  subjectSubmissions: SubjectResultSubmission[];
  onUpdateAssignedMark: (examId: string, studentId: string, subjectEn: string, written: number, mcq?: number) => void;
  onSubmitSubjectMarks: (examId: string, className: string, subjectBn: string, subjectEn: string) => void;
  onRequestResultCorrection: (examId: string, className: string, subjectEn: string, note: string) => void;
}

export const TeacherMarksSubmissionPanel: React.FC<TeacherMarksSubmissionPanelProps> = ({
  lang,
  teacher,
  allTeachers,
  onSwitchTeacher,
  teacherAssignments,
  exams,
  students,
  gradingRules,
  subjectSubmissions,
  onUpdateAssignedMark,
  onSubmitSubjectMarks,
  onRequestResultCorrection,
}) => {
  const schoolExams = useMemo(
    () => exams.filter((ex) => !ex.schoolId || ex.schoolId === teacher.schoolId),
    [exams, teacher.schoolId]
  );
  const exam =
    pickPrimaryTermOrPublishedExam(schoolExams) ?? pickPrimaryTermOrPublishedExam(exams);

  const myAssignments = useMemo(
    () => teacherAssignments.filter((a) => a.teacherId === teacher.id),
    [teacher.id, teacherAssignments]
  );

  // Allow switching between assigned subjects (plus show a read-only indicator of unassigned subjects)
  const allExamSubjects = useMemo(() => {
    const map = new Map<string, { subjectBn: string; subjectEn: string; className: string }>();
    for (const e of exam?.entries ?? []) {
      const key = `${e.className ?? exam?.className ?? ''}-${e.subjectEn}`;
      if (!map.has(key)) {
        map.set(key, {
          subjectBn: e.subjectBn,
          subjectEn: e.subjectEn,
          className: e.className ?? exam?.className ?? '',
        });
      }
    }
    for (const a of myAssignments) {
      const key = `${a.className}-${a.subjectEn}`;
      if (!map.has(key)) {
        map.set(key, { subjectBn: a.subjectBn, subjectEn: a.subjectEn, className: a.className });
      }
    }
    return Array.from(map.values());
  }, [exam, myAssignments]);

  const defaultAssigned =
    allExamSubjects.find((s) =>
      canTeacherEnterSubjectMarks(teacher, teacherAssignments, s.className, s.subjectBn, s.subjectEn)
    ) ?? allExamSubjects[0];

  const [selectedSubjectKey, setSelectedSubjectKey] = useState(
    defaultAssigned ? `${defaultAssigned.className}-${defaultAssigned.subjectEn}` : ''
  );
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionNote, setCorrectionNote] = useState('');

  const activeSelection =
    allExamSubjects.find((s) => `${s.className}-${s.subjectEn}` === selectedSubjectKey) ??
    defaultAssigned;

  const isAssigned = activeSelection
    ? canTeacherEnterSubjectMarks(
        teacher,
        teacherAssignments,
        activeSelection.className,
        activeSelection.subjectBn,
        activeSelection.subjectEn
      )
    : false;

  const classStudents = useMemo(
    () =>
      activeSelection
        ? students
            .filter((s) => s.schoolId === teacher.schoolId && s.className === activeSelection.className)
            .sort((a, b) => a.roll - b.roll)
        : [],
    [students, teacher.schoolId, activeSelection]
  );

  const submissionRecord =
    activeSelection && exam
      ? subjectSubmissions.find(
          (sub) =>
            sub.schoolId === teacher.schoolId &&
            sub.examId === exam.id &&
            sub.className === activeSelection.className &&
            sub.subjectEn.toLowerCase() === activeSelection.subjectEn.toLowerCase()
        )
      : undefined;

  const validation = useMemo(
    () =>
      activeSelection && exam
        ? validateMarksEntrySubmission(
            teacher,
            teacherAssignments,
            exam,
            activeSelection.className,
            activeSelection.subjectBn,
            activeSelection.subjectEn,
            classStudents
          )
        : { isValid: false, errors: [], missingCount: 0, totalStudents: 0 },
    [teacher, teacherAssignments, exam, activeSelection, classStudents]
  );

  if (!exam) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-xs text-slate-500">
        {b(
          'এই মুহূর্তে কোনো প্রকাশিত সাময়িক পরীক্ষা নেই। কেন্দ্রীয় প্রশাসন পরীক্ষা প্রকাশ করলে এখানে নম্বর এন্ট্রি চালু হবে।',
          'No centrally published term examination is currently available for formal marks submission.',
          lang
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 text-xs">
      {/* Header & Teacher / Subject Selection */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              {b('📝 পরীক্ষার নম্বর জমা দিন (Roll-wise Marks Submission)', 'Exam Marks Entry & Submission', lang)}
            </h1>
            <p className="text-slate-500 mt-0.5">
              {b(
                `নিরাপত্তা নীতি: ${teacher.nameBn} শুধুমাত্র নির্ধারিত শ্রেণি ও বিষয়ের নম্বর জমা দিতে পারবেন। অন্য বিষয়সমূহ 🔒 Not Assigned হিসেবে লক করা।`,
                `RBAC: ${teacher.nameEn} can ONLY enter and submit marks for assigned Class + Subject allocations.`,
                lang
              )}
            </p>
          </div>
          <select
            aria-label={b('শিক্ষক পরিবর্তন', 'Switch Teacher', lang)}
            value={teacher.id}
            onChange={(e) => onSwitchTeacher(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold cursor-pointer"
          >
            {allTeachers
              .filter((t) => t.schoolId === teacher.schoolId)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nameBn} ({t.subjects.join(', ')})
                </option>
              ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {b('পরীক্ষা (Exam)', 'Select Exam', lang)}
            </label>
            <div className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center font-semibold">
              {b(exam.titleBn, exam.titleEn, lang)}
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {b('শ্রেণি ও বিষয় নির্বাচন', 'Class & Subject', lang)}
            </label>
            <select
              aria-label={b('শ্রেণি ও বিষয় নির্বাচন', 'Select Class and Subject', lang)}
              value={activeSelection ? `${activeSelection.className}-${activeSelection.subjectEn}` : ''}
              onChange={(e) => setSelectedSubjectKey(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold cursor-pointer"
            >
              {allExamSubjects.map((s) => {
                const ok = canTeacherEnterSubjectMarks(teacher, teacherAssignments, s.className, s.subjectBn, s.subjectEn);
                return (
                  <option key={`${s.className}-${s.subjectEn}`} value={`${s.className}-${s.subjectEn}`}>
                    {s.className} · {b(s.subjectBn, s.subjectEn, lang)} {ok ? '✅' : '🔒 Not Assigned'}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {b('জমা দেওয়ার অবস্থা', 'Submission Status', lang)}
            </label>
            <div className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between font-bold">
              {!isAssigned ? (
                <span className="text-red-600 dark:text-red-400">🔒 Not Assigned</span>
              ) : submissionRecord?.status === 'submitted' || submissionRecord?.status === 'verified' ? (
                <span className="text-emerald-700 dark:text-emerald-400">
                  🟢 Submitted ({submissionRecord.submittedAt ?? 'Verified'})
                </span>
              ) : (
                <span className="text-amber-700 dark:text-amber-400">🟡 Pending Submission</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Roll-Wise Student List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="font-bold text-sm text-slate-900 dark:text-white">
            {activeSelection
              ? `${activeSelection.className} · ${b(activeSelection.subjectBn, activeSelection.subjectEn, lang)} — ${b('রোল অনুযায়ী শিক্ষার্থী তালিকা', 'Roll-wise Student List', lang)}`
              : ''}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {submissionRecord?.status === 'submitted' && isAssigned && (
              <button
                type="button"
                onClick={() => setCorrectionOpen(true)}
                className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-800 dark:text-amber-300 font-semibold cursor-pointer"
              >
                ✏️ {b('সংশোধন অনুরোধ (Correction)', 'Edit Result Correction', lang)}
              </button>
            )}
            <button
              type="button"
              disabled={!isAssigned || !validation.isValid}
              onClick={() => setConfirmSubmitOpen(true)}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-semibold whitespace-nowrap ${
                isAssigned && validation.isValid
                  ? 'bg-blue-700 hover:bg-blue-800 text-white cursor-pointer'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              {b('📤 নম্বর জমা দিন', 'Submit Marks', lang)}
            </button>
          </div>
        </div>

        {!isAssigned && (
          <div className="px-5 py-3 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" />
            {b(
              'আপনি এই শ্রেণি বা বিষয়ে নিয়োজিত নন। শুধুমাত্র নির্ধারিত শিক্ষক নম্বর এন্ট্রি ও জমা দিতে পারবেন।',
              'You are not assigned to this subject. Editing and submission are locked.',
              lang
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                <th className="py-3 px-4 font-semibold w-16">Roll</th>
                <th className="py-3 px-3 font-semibold">{b('শিক্ষার্থীর নাম', 'Student Name', lang)}</th>
                <th className="py-3 px-3 font-semibold text-right">Written (80)</th>
                <th className="py-3 px-3 font-semibold text-right">Oral/CA</th>
                <th className="py-3 px-4 font-semibold text-right">{b('মোট ও গ্রেড', 'Total & Grade', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {classStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 px-4 text-center text-slate-500">
                    {b('এই শ্রেণিতে কোনো সক্রিয় শিক্ষার্থী নেই।', 'No enrolled students in this class.', lang)}
                  </td>
                </tr>
              ) : (
                classStudents.map((stu) => {
                  const entry = exam.entries.find(
                    (e) =>
                      e.studentId === stu.id &&
                      activeSelection &&
                      (e.subjectEn.toLowerCase() === activeSelection.subjectEn.toLowerCase() ||
                        e.subjectBn === activeSelection.subjectBn)
                  );
                  const written = entry?.written ?? 0;
                  const oralCa = (entry?.oral ?? 0) + (entry?.continuous ?? 0);
                  const total = entry ? computeEntryTotalMarks(entry) : 0;
                  const grade = calculateCustomGradeAndGPA(
                    total,
                    entry?.fullMarks ?? 100,
                    entry?.passMarks ?? 33,
                    gradingRules
                  );

                  return (
                    <tr key={stu.id}>
                      <td className="py-3 px-4 font-mono font-bold tabular-nums">
                        {String(stu.roll).padStart(2, '0')}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                        {stu.nameBn}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <input
                          type="number"
                          min={0}
                          max={80}
                          disabled={!isAssigned}
                          aria-label={`${stu.nameBn} written marks`}
                          value={written}
                          onChange={(e) =>
                            activeSelection &&
                            onUpdateAssignedMark(
                              exam.id,
                              stu.id,
                              activeSelection.subjectEn,
                              Math.max(0, Math.min(80, Number(e.target.value))),
                              entry?.mcq
                            )
                          }
                          className={`w-20 h-8 px-2 text-right tabular-nums rounded-lg border ${
                            isAssigned
                              ? 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-400 cursor-not-allowed'
                          }`}
                        />
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-slate-500">
                        {oralCa}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-bold">
                        {total}/100 · <span className="text-blue-700 dark:text-blue-400">{grade.letterGrade}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog before Final Marks Submission */}
      {confirmSubmitOpen && activeSelection && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {b('নম্বর জমা নিশ্চিতকরণ', 'Confirm Result Marks Submission', lang)}
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              {b(
                `আপনি কি ${activeSelection.className} শ্রেণির ${activeSelection.subjectBn} বিষয়ের ${classStudents.length} জন শিক্ষার্থীর নম্বর চূড়ান্তভাবে জমা দিতে চান?`,
                `Are you sure you want to finalize and submit ${activeSelection.className} · ${activeSelection.subjectEn} marks for ${classStudents.length} students?`,
                lang
              )}
            </p>
            {validation.missingCount > 0 && (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 font-semibold">
                {b(
                  `সতর্কতা: ${validation.missingCount} জন শিক্ষার্থীর নম্বর এখনো এন্ট্রি হয়নি।`,
                  `Notice: ${validation.missingCount} student(s) currently have default/missing marks.`,
                  lang
                )}
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmSubmitOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
              >
                {b('বাতিল', 'Cancel', lang)}
              </button>
              <button
                type="button"
                onClick={() => {
                  onSubmitSubjectMarks(
                    exam.id,
                    activeSelection.className,
                    activeSelection.subjectBn,
                    activeSelection.subjectEn
                  );
                  setConfirmSubmitOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
              >
                {b('Confirm & Submit', 'Confirm & Submit', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Correction Request Modal */}
      {correctionOpen && activeSelection && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {b('ফলাফল সংশোধন অনুরোধ (Correction Request)', 'Request Marks Correction', lang)}
            </h3>
            <textarea
              rows={3}
              value={correctionNote}
              onChange={(e) => setCorrectionNote(e.target.value)}
              placeholder={b('কোন শিক্ষার্থীর কোন নম্বর সংশোধন প্রয়োজন তা লিখুন...', 'Explain which roll/marks need correction...', lang)}
              className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCorrectionOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
              >
                {b('বাতিল', 'Cancel', lang)}
              </button>
              <button
                type="button"
                disabled={!correctionNote.trim()}
                onClick={() => {
                  onRequestResultCorrection(exam.id, activeSelection.className, activeSelection.subjectEn, correctionNote.trim());
                  setCorrectionNote('');
                  setCorrectionOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold cursor-pointer"
              >
                {b('অনুরোধ পাঠান', 'Submit Request', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 2. SCHOOL ADMIN RESULT MANAGEMENT PANEL (Completion Tracker + Alerts + Publish Gate)
 * ============================================================================ */

interface SchoolAdminResultManagementPanelProps {
  lang: Language;
  school: SchoolRecord;
  exams: ExamRecord[];
  students?: StudentRecord[];
  subjectSubmissions: SubjectResultSubmission[];
  resultAuditLogs: ResultAuditEntry[];
  readOnlyOversight?: boolean;
  onSendDelayedTeacherAlert: (teacherId: string, teacherName: string, subjectBn: string, channel: 'notice' | 'message') => void;
  onTogglePublishResult: (examId: string, publish: boolean) => void;
}

export const SchoolAdminResultManagementPanel: React.FC<SchoolAdminResultManagementPanelProps> = ({
  lang,
  school,
  exams,
  students = [],
  subjectSubmissions,
  resultAuditLogs,
  readOnlyOversight = false,
  onSendDelayedTeacherAlert,
  onTogglePublishResult,
}) => {
  const [pdfReportOpen, setPdfReportOpen] = useState(false);
  const schoolExams = exams.filter((e) => !e.schoolId || e.schoolId === school.id);
  const exam =
    pickPrimaryTermOrPublishedExam(schoolExams) ?? pickPrimaryTermOrPublishedExam(exams);
  if (!exam) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-xs text-slate-500">
        {b(
          'কোনো প্রকাশিত সাময়িক পরীক্ষা এখনো যুক্ত হয়নি।',
          'No published term examination is active for this school yet.',
          lang
        )}
      </div>
    );
  }
  const scopedSubmissions = subjectSubmissions.filter(
    (s) => s.schoolId === school.id && s.examId === exam.id
  );
  const progress = computeResultCompletionProgress(subjectSubmissions, school.id, exam.id);
  const publishCheck = canSchoolPublishResult(school, exam, subjectSubmissions);
  const scopedAudits = resultAuditLogs.filter((a) => a.schoolId === school.id).slice(0, 6);

  return (
    <div className="space-y-5 text-xs">
      {/* Summary & Publish Gate Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              {b('📊 ফলাফল ব্যবস্থাপনা ও প্রকাশ নিয়ন্ত্রণ', 'Result Management & Publication Control', lang)}
            </h2>
            <p className="text-slate-500 mt-0.5">
              {school.nameBn} ({school.code}) · {b(exam.titleBn, exam.titleEn, lang)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1.5 rounded-lg font-semibold border ${
                school.resultPublishAllowed !== false
                  ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                  : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
              }`}
            >
              {school.resultPublishAllowed !== false
                ? b('Central Permission: Publish Allowed ✅', 'Central Permission: Allowed ✅', lang)
                : b('Central Permission: Publish Locked 🔒', 'Central Permission: Locked 🔒', lang)}
            </span>
            <button
              type="button"
              data-testid="results-generate-pdf-report-btn"
              onClick={() => setPdfReportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-semibold cursor-pointer whitespace-nowrap"
            >
              <FileDown className="w-4 h-4" />
              {b('Generate PDF Report', 'Generate PDF Report', lang)}
            </button>
            {!readOnlyOversight && (
              exam.status === 'published' ? (
                <button
                  type="button"
                  onClick={() => onTogglePublishResult(exam.id, false)}
                  className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold cursor-pointer whitespace-nowrap"
                >
                  🔴 {b('Unpublish Result', 'Unpublish Result', lang)}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!publishCheck.allowed}
                  onClick={() => onTogglePublishResult(exam.id, true)}
                  className={`px-3.5 py-2 rounded-lg font-semibold whitespace-nowrap ${
                    publishCheck.allowed
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  🟢 {b('Publish Result', 'Publish Result', lang)}
                </button>
              )
            )}
          </div>
        </div>

        <ProgressMeter
          label={b(
            `বিষয়ভিত্তিক নম্বর জমা সম্পন্ন: ${progress.completedCount} / ${progress.totalCount}`,
            `Subjects Completed: ${progress.completedCount} / ${progress.totalCount}`,
            lang
          )}
          value={progress.percentage}
          barColorClass={progress.allCompleted ? 'bg-emerald-600' : 'bg-amber-600'}
        />

        {!publishCheck.allowed && exam.status !== 'published' && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-semibold">
            {b(publishCheck.reasonBn, publishCheck.reasonEn, lang)}
          </div>
        )}
      </div>

      {/* Subject Completion Tracker + Delayed Teacher Alerts */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 font-bold text-sm">
          {b('বিষয়ভিত্তিক শিক্ষক নম্বর জমার অবস্থা', 'Subject Submission & Delayed Teacher Alerts', lang)}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                <th className="py-3 px-4 font-semibold">{b('বিষয়', 'Subject', lang)}</th>
                <th className="py-3 px-3 font-semibold">{b('নির্ধারিত শিক্ষক', 'Assigned Teacher', lang)}</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold">{b('জমার সময়', 'Submitted At', lang)}</th>
                <th className="py-3 px-4 font-semibold text-right">{b('পদক্ষেপ', 'Action', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {scopedSubmissions.map((sub) => (
                <tr key={sub.id}>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    {b(sub.subjectBn, sub.subjectEn, lang)} ({sub.className})
                  </td>
                  <td className="py-3 px-3">{sub.teacherName}</td>
                  <td className="py-3 px-3 font-semibold">
                    {sub.status === 'submitted' || sub.status === 'verified' ? (
                      <span className="text-emerald-700 dark:text-emerald-400">🟢 Submitted</span>
                    ) : sub.status === 'correction_requested' ? (
                      <span className="text-blue-700 dark:text-blue-400">🔄 Correction Requested</span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-400">🟡 Pending</span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500">{sub.submittedAt ?? '—'}</td>
                  <td className="py-3 px-4 text-right">
                    {sub.status === 'pending' && !readOnlyOversight ? (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSendDelayedTeacherAlert(sub.teacherId, sub.teacherName, sub.subjectBn, 'notice')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-amber-300 text-amber-800 dark:text-amber-300 font-semibold cursor-pointer whitespace-nowrap"
                        >
                          <Bell className="w-3 h-3" /> {b('Send Notice', 'Send Notice', lang)}
                        </button>
                        <button
                          type="button"
                          onClick={() => onSendDelayedTeacherAlert(sub.teacherId, sub.teacherName, sub.subjectBn, 'message')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-blue-300 text-blue-700 dark:text-blue-300 font-semibold cursor-pointer whitespace-nowrap"
                        >
                          💬 {b('Message', 'Message', lang)}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Result Audit Trail */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <History className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          {b('ফলাফল অডিট ট্রেইল (Result Audit Trail)', 'Result Audit Trail', lang)}
        </h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {scopedAudits.map((log) => (
            <div key={log.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-900 dark:text-white">{log.actorName}</span>{' '}
                <span className="text-slate-500">({log.actorRole})</span> ·{' '}
                <span className="font-semibold text-blue-700 dark:text-blue-400">{log.action}</span> · {log.subjectEn}
                {log.note && <div className="text-slate-500">{log.note}</div>}
              </div>
              <span className="font-mono text-slate-400">{log.timestamp}</span>
            </div>
          ))}
        </div>
      </div>

      <ExamPdfReportModal
        open={pdfReportOpen}
        onClose={() => setPdfReportOpen(false)}
        lang={lang}
        exam={exam}
        school={school}
        students={students}
      />
    </div>
  );
};

/* ============================================================================
 * 3. CENTRAL ADMIN RESULT CONTROL PANEL (Per-School Lock + Publish All Eligible)
 * ============================================================================ */

interface CentralAdminResultControlPanelProps {
  lang: Language;
  schools: SchoolRecord[];
  exams: ExamRecord[];
  subjectSubmissions: SubjectResultSubmission[];
  onToggleSchoolPublishPermission: (schoolId: string, allow: boolean) => void;
  onPublishAllEligibleResults: () => void;
}

export const CentralAdminResultControlPanel: React.FC<CentralAdminResultControlPanelProps> = ({
  lang,
  schools,
  exams,
  subjectSubmissions,
  onToggleSchoolPublishPermission,
  onPublishAllEligibleResults,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            {b('কেন্দ্রীয় ফলাফল নিয়ন্ত্রণ কেন্দ্র (Central Result Control)', 'Central Result Control & Global Publishing', lang)}
          </h2>
          <p className="text-slate-500 mt-0.5">
            {b(
              'প্রতিটি বিদ্যালয়ের ফলাফল প্রকাশের অনুমতি নিয়ন্ত্রণ করুন এবং প্রস্তুত বিদ্যালয়গুলোর ফলাফল একসাথে প্রকাশ করুন।',
              'Enable or lock result publishing per school, or batch-publish all eligible schools.',
              lang
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onPublishAllEligibleResults}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer whitespace-nowrap"
        >
          <Globe className="w-4 h-4" />
          {b('🌐 Publish Results for All Schools', 'Publish Results for All Schools', lang)}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
              <th className="py-2.5 px-4 font-semibold">{b('বিদ্যালয়', 'School', lang)}</th>
              <th className="py-2.5 px-3 font-semibold">{b('নম্বর জমা অগ্রগতি', 'Marks Progress', lang)}</th>
              <th className="py-2.5 px-3 font-semibold">{b('পরীক্ষার অবস্থা', 'Exam Status', lang)}</th>
              <th className="py-2.5 px-3 font-semibold">{b('কেন্দ্রীয় অনুমতি', 'Central Permission', lang)}</th>
              <th className="py-2.5 px-4 font-semibold text-right">{b('নিয়ন্ত্রণ', 'Control', lang)}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {schools
              .filter((s) => s.status === 'active')
              .map((sch) => {
                const schExam = exams.find((e) => e.schoolId === sch.id);
                const prog = schExam
                  ? computeResultCompletionProgress(subjectSubmissions, sch.id, schExam.id)
                  : { completedCount: 0, totalCount: 0, percentage: 0 };
                const allowed = sch.resultPublishAllowed !== false;
                return (
                  <tr key={sch.id}>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{sch.nameBn}</div>
                      <div className="font-mono text-[11px] text-slate-500">{sch.code} · EIIN {sch.eiin}</div>
                    </td>
                    <td className="py-3 px-3 tabular-nums">
                      {prog.totalCount > 0 ? `${prog.completedCount}/${prog.totalCount} (${prog.percentage}%)` : b('প্রযোজ্য নয়', 'No Active Exam', lang)}
                    </td>
                    <td className="py-3 px-3 font-semibold">
                      {schExam ? (
                        schExam.status === 'published' ? (
                          <span className="text-emerald-700 dark:text-emerald-400">🟢 Published</span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400">🟡 {schExam.status}</span>
                        )
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-semibold">
                      {allowed ? (
                        <span className="text-emerald-700 dark:text-emerald-400">Publish Allowed ✅</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">Publish Locked 🔒</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onToggleSchoolPublishPermission(sch.id, !allowed)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold cursor-pointer whitespace-nowrap ${
                          allowed
                            ? 'border border-red-300 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30'
                            : 'bg-blue-700 hover:bg-blue-800 text-white'
                        }`}
                      >
                        {allowed ? (
                          <>
                            <Lock className="w-3.5 h-3.5" /> {b('Lock Publish', 'Lock', lang)}
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3.5 h-3.5" /> {b('Allow Publish', 'Allow', lang)}
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ============================================================================
 * 4. STUDENT & PARENT MARKSHEET MODAL (Subject Position + Overall Position)
 * ============================================================================ */

export const StudentMarksheetModal: React.FC<{
  open: boolean;
  onClose: () => void;
  lang: Language;
  student: StudentRecord;
  school?: SchoolRecord;
  exam: ExamRecord;
  gradingRules: GradingRuleItem[];
}> = ({ open, onClose, lang, student, school, exam, gradingRules }) => {
  if (!open) return null;
  const sheet = computeSubjectAndOverallPositions(exam, student, gradingRules);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <div className="font-mono text-blue-700 dark:text-blue-400 font-semibold">
              {school?.nameBn ?? student.schoolNameBn} · {b(exam.titleBn, exam.titleEn, lang)}
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              📄 {b('অফিসিয়াল নম্বরপত্র (Official Marksheet)', 'Official Academic Marksheet', lang)}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close marksheet modal"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!sheet || !sheet.isPublished ? (
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-semibold">
            {b(
              'এই পরীক্ষার ফলাফল এখনো প্রকাশিত হয়নি। প্রকাশিত হলে এখানে বিষয়ভিত্তিক নম্বর ও মেধাক্রম দেখতে পারবেন।',
              'Results for this exam have not been published yet.',
              lang
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-lg">
              <div>
                <div className="text-slate-500">{b('শিক্ষার্থীর নাম', 'Student', lang)}</div>
                <div className="font-bold text-slate-900 dark:text-white">{sheet.studentName}</div>
                <div className="font-mono text-slate-500">{student.className} · Roll {sheet.roll}</div>
              </div>
              <div>
                <div className="text-slate-500">{b('মোট প্রাপ্ত নম্বর', 'Total Marks', lang)}</div>
                <div className="text-base font-bold tabular-nums text-blue-700 dark:text-blue-400">
                  {sheet.totalMarksObtained} / {sheet.totalFullMarks}
                </div>
              </div>
              <div>
                <div className="text-slate-500">GPA & Grade</div>
                <div className="text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {sheet.overallGpa.toFixed(2)} ({sheet.overallGrade})
                </div>
              </div>
              <div>
                <div className="text-slate-500">{b('শ্রেণিতে মেধাক্রম', 'Overall Class Position', lang)}</div>
                <div className="text-base font-bold tabular-nums text-slate-900 dark:text-white">
                  #{sheet.overallPosition} / {sheet.totalClassStudents}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                    <th className="py-2.5 px-3 font-semibold">{b('বিষয়', 'Subject', lang)}</th>
                    <th className="py-2.5 px-2 font-semibold text-right">Written</th>
                    <th className="py-2.5 px-2 font-semibold text-right">Oral/CA</th>
                    <th className="py-2.5 px-2 font-semibold text-right">Total</th>
                    <th className="py-2.5 px-2 font-semibold text-right">Grade (GPA)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{b('বিষয়ভিত্তিক অবস্থান', 'Subject Position', lang)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sheet.subjects.map((sub) => (
                    <tr key={sub.subjectEn}>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {b(sub.subjectBn, sub.subjectEn, lang)}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums">{sub.written}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums">{sub.oral + sub.continuous}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums font-bold">{sub.total}/{sub.fullMarks}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums font-semibold text-blue-700 dark:text-blue-400">
                        {sub.letterGrade} ({sub.gpa.toFixed(1)})
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                        #{sub.subjectPosition}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
