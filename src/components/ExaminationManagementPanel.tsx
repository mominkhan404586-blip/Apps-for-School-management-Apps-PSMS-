import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardEdit,
  FileDown,
  Globe,
  Lock,
  Plus,
  ShieldCheck,
  Unlock,
} from 'lucide-react';
import { ExamPdfReportModal } from './ExamPdfReportModal';
import type {
  AcademicSubjectConfig,
  ExamCategoryType,
  ExamRecord,
  Language,
  MasterSubjectFrameworkItem,
  Role,
  SchoolRecord,
  SchoolSubjectRecord,
  StudentRecord,
  TeacherRecord,
  TeacherSubjectAssignment,
} from '../types';
import { b } from '../i18n/translations';
import { ALL_CLASSES } from '../data/mockData';
import { getActiveSubjectsForDropdown } from '../utils/centralSubjectAndStructureEngine';
import {
  EXAM_CATEGORY_LABELS,
  canActorEditExamMarks,
  getVisibleExamsForRole,
  isCentralControlledExamCategory,
  isExamCentralPublished,
  type CreateLocalExamPayload,
} from '../utils/examGovernanceEngine';
import { calculateBDGradeAndGPA } from '../utils/rbacAndGrading';

interface ExaminationManagementPanelProps {
  lang: Language;
  role: Role;
  schoolId?: string;
  actorName: string;
  teacher?: TeacherRecord;
  studentClass?: string;
  studentId?: string;
  schools: SchoolRecord[];
  students: StudentRecord[];
  exams: ExamRecord[];
  subjects?: AcademicSubjectConfig[];
  schoolSubjects?: SchoolSubjectRecord[];
  masterFramework?: MasterSubjectFrameworkItem[];
  academicYear?: string;
  teacherAssignments?: TeacherSubjectAssignment[];
  onCreateLocalExam: (payload: CreateLocalExamPayload) => void;
  onToggleCentralTermPublish: (examId: string, publish: boolean) => void;
  onUpdateExamMark: (
    examId: string,
    studentId: string,
    subjectEn: string,
    written: number,
    mcq?: number
  ) => void;
}

export const ExaminationManagementPanel: React.FC<ExaminationManagementPanelProps> = ({
  lang,
  role,
  schoolId,
  actorName,
  teacher,
  studentClass,
  studentId,
  schools,
  students,
  exams,
  subjects = [],
  schoolSubjects = [],
  masterFramework = [],
  academicYear,
  teacherAssignments = [],
  onCreateLocalExam,
  onToggleCentralTermPublish,
  onUpdateExamMark,
}) => {
  const canCreateLocalExam = role === 'school_admin' || role === 'teacher';
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeExamForMarksId, setActiveExamForMarksId] = useState<string | null>(null);
  const [pdfReportExamId, setPdfReportExamId] = useState<string | null>(null);
  const [schoolFilter, setSchoolFilter] = useState<string>('all');

  // Create Local Exam form state
  const [titleBn, setTitleBn] = useState('');
  const [examCategory, setExamCategory] = useState<ExamCategoryType>('class_test');
  const [className, setClassName] = useState(
    teacher?.assignedClasses[0] ?? 'Class 1'
  );
  const [section, setSection] = useState('ক (A)');
  const availableSubjects = useMemo(() => {
    const resolvedYear = academicYear ?? String(new Date().getFullYear());
    const fromRegistry = getActiveSubjectsForDropdown(
      schoolSubjects.filter((s) => !schoolId || s.schoolId === schoolId),
      resolvedYear,
      className
    );
    if (fromRegistry.length > 0) {
      return fromRegistry.map((s) => ({ code: s.subjectCode, nameBn: s.nameBn, nameEn: s.nameEn }));
    }
    if (subjects.length > 0) {
      return subjects.map((s) => ({ code: s.code, nameBn: s.nameBn, nameEn: s.nameEn }));
    }
    return masterFramework.map((s) => ({ code: s.subjectCode, nameBn: s.nameBn, nameEn: s.nameEn }));
  }, [schoolSubjects, schoolId, academicYear, className, subjects, masterFramework]);

  const [subjectEn, setSubjectEn] = useState('');
  const effectiveSubjectEn = subjectEn || availableSubjects[0]?.nameEn || '';
  const [examDate, setExamDate] = useState(todayIso);
  const [startTime, setStartTime] = useState('10:30 AM');
  const [durationMins, setDurationMins] = useState(40);
  const [fullMarks, setFullMarks] = useState(25);
  const [instructionsBn, setInstructionsBn] = useState(
    'পাঠ্যবইয়ের নির্ধারিত অধ্যায় অনুশীলন করে পরীক্ষায় অংশগ্রহণ করতে হবে।'
  );

  const visibleExams = useMemo(() => {
    const base = getVisibleExamsForRole(exams, {
      role,
      schoolId: role === 'central_admin' ? (schoolFilter === 'all' ? undefined : schoolFilter) : schoolId,
      studentClass,
    });
    return base;
  }, [exams, role, schoolId, schoolFilter, studentClass]);

  const termExams = useMemo(
    () =>
      visibleExams.filter(
        (ex) => ex.isCentralControlled ?? isCentralControlledExamCategory(ex.examCategory)
      ),
    [visibleExams]
  );

  const localExams = useMemo(
    () =>
      visibleExams.filter(
        (ex) => !(ex.isCentralControlled ?? isCentralControlledExamCategory(ex.examCategory))
      ),
    [visibleExams]
  );

  const activeExamForMarks = visibleExams.find((e) => e.id === activeExamForMarksId);
  const primaryExamForPdf =
    visibleExams.find((e) => e.id === pdfReportExamId) ??
    visibleExams.find((e) => e.status === 'published') ??
    visibleExams[0] ??
    null;
  const pdfReportExam = pdfReportExamId ? visibleExams.find((e) => e.id === pdfReportExamId) ?? primaryExamForPdf : null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleBn.trim() || !schoolId || !effectiveSubjectEn) return;
    const subMeta = availableSubjects.find((s) => s.nameEn === effectiveSubjectEn);
    onCreateLocalExam({
      schoolId,
      titleBn: titleBn.trim(),
      titleEn: titleBn.trim(),
      examCategory,
      className,
      section,
      subjectBn: subMeta?.nameBn ?? effectiveSubjectEn,
      subjectEn: effectiveSubjectEn,
      examDate,
      startTime,
      durationMins,
      fullMarks,
      instructionsBn,
      createdByRole: role,
      createdByName: actorName,
      createdByTeacherId: teacher?.id,
      students,
    });
    setTitleBn('');
    setCreateOpen(false);
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            {role === 'central_admin'
              ? b('কেন্দ্রীয় পরীক্ষা ও সাময়িক নিয়ন্ত্রণ কেন্দ্র', 'Central Examination & Term Control', lang)
              : b('পরীক্ষা ব্যবস্থাপনা ও মূল্যায়ন', 'Examination Management', lang)}
          </h1>
          <p className="text-slate-500 mt-0.5">
            {role === 'central_admin'
              ? b(
                  '১ম সাময়িক, ২য় সাময়িক ও বার্ষিক (৩য় প্রান্তিক) পরীক্ষা Central Admin প্রকাশ না করা পর্যন্ত স্কুল/শিক্ষক/অভিভাবকের কাছে অদৃশ্য ও লক থাকবে।',
                  '1st, 2nd & 3rd Term exams stay completely hidden and locked across all schools until Central Admin publishes them.',
                  lang
                )
              : role === 'guardian' || role === 'student'
                ? b(
                    'অভিভাবক (Parent) পোর্টালে সন্তানের Central-অনুমোদিত সাময়িক পরীক্ষা ও শ্রেণি পরীক্ষার সময়সূচি এবং প্রাপ্ত নম্বর দেখুন।',
                    'View your child’s centrally published Term exams and local school/class test schedules & marks.',
                    lang
                  )
                : b(
                    'Central-অনুমোদিত সাময়িক পরীক্ষার পাশাপাশি নিজস্ব Class Test, Model Test, Weekly ও Monthly Test তৈরি ও নম্বর আপডেট করুন।',
                    'View centrally published Term exams and autonomously create local Class Tests, Model Tests, Weekly & Monthly exams.',
                    lang
                  )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {role === 'central_admin' && (
            <select
              aria-label={b('বিদ্যালয় ফিল্টার', 'Filter by school', lang)}
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold cursor-pointer"
            >
              <option value="all">{b('সকল বিদ্যালয়', 'All Schools', lang)}</option>
              {schools
                .filter((s) => s.status === 'active')
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameBn} ({s.code})
                  </option>
                ))}
            </select>
          )}

          {visibleExams.length > 0 && (
            <button
              type="button"
              data-testid="generate-pdf-report-btn"
              onClick={() => setPdfReportExamId(primaryExamForPdf?.id ?? visibleExams[0]?.id ?? null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-semibold cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              {b('Generate PDF Report', 'Generate PDF Report', lang)}
            </button>
          )}

          {canCreateLocalExam && (
            <button
              type="button"
              onClick={() => setCreateOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {createOpen
                ? b('ফর্ম বন্ধ করুন', 'Close Form', lang)
                : b('নতুন ক্লাস/মডেল টেস্ট তৈরি করুন', 'Create School / Class Exam', lang)}
            </button>
          )}
        </div>
      </div>

      {/* School Admin / Teacher Local Exam Creator */}
      {canCreateLocalExam && createOpen && (
        <form
          onSubmit={handleCreateSubmit}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {b(
                'স্বাধীন পরীক্ষা তৈরি (কেন্দ্রীয় অনুমতির প্রয়োজন নেই)',
                'Create Local Exam (No Central Admin Approval Required)',
                lang
              )}
            </h2>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
              {b('Instant School Availability ✓', 'Instant School Availability ✓', lang)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">{b('পরীক্ষার নাম *', 'Exam Name *', lang)}</label>
              <input
                type="text"
                required
                value={titleBn}
                onChange={(e) => setTitleBn(e.target.value)}
                placeholder={b('যেমন: Weekly Math Model Test 05', 'e.g. Weekly Math Quiz 05', lang)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">{b('পরীক্ষার ধরন', 'Exam Type', lang)}</label>
              <select
                value={examCategory}
                onChange={(e) => setExamCategory(e.target.value as ExamCategoryType)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer"
              >
                <option value="class_test">{EXAM_CATEGORY_LABELS.class_test.labelBn}</option>
                <option value="model_test">{EXAM_CATEGORY_LABELS.model_test.labelBn}</option>
                <option value="weekly_test">{EXAM_CATEGORY_LABELS.weekly_test.labelBn}</option>
                <option value="monthly_test">{EXAM_CATEGORY_LABELS.monthly_test.labelBn}</option>
                <option value="custom">{EXAM_CATEGORY_LABELS.custom.labelBn}</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">{b('বিষয় (Subject)', 'Subject', lang)}</label>
              <select
                value={effectiveSubjectEn}
                onChange={(e) => setSubjectEn(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer"
              >
                {availableSubjects.length === 0 ? (
                  <option value="">{b('প্রথমে শ্রেণিভিত্তিক বিষয় নিবন্ধন করুন', 'Register subjects first', lang)}</option>
                ) : (
                  availableSubjects.map((s) => (
                    <option key={s.code + s.nameEn} value={s.nameEn}>
                      {s.nameBn} ({s.nameEn})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block font-semibold mb-1">{b('শ্রেণি', 'Class', lang)}</label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer"
              >
                {ALL_CLASSES.slice(0, 10).map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">{b('শাখা', 'Section', lang)}</label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer"
              >
                <option value="ক (A)">ক (A)</option>
                <option value="খ (B)">খ (B)</option>
                <option value="All">All Sections</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">{b('তারিখ', 'Date', lang)}</label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">{b('সময় (Time)', 'Start Time', lang)}</label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">{b('পূর্ণমান / সময়সীমা', 'Full Marks / Mins', lang)}</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min={5}
                  max={200}
                  value={fullMarks}
                  onChange={(e) => setFullMarks(Number(e.target.value))}
                  className="w-1/2 h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  title="Full Marks"
                />
                <input
                  type="number"
                  min={10}
                  max={240}
                  value={durationMins}
                  onChange={(e) => setDurationMins(Number(e.target.value))}
                  className="w-1/2 h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  title="Duration Mins"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">{b('নির্দেশনা (Instructions)', 'Exam Instructions', lang)}</label>
            <textarea
              rows={2}
              value={instructionsBn}
              onChange={(e) => setInstructionsBn(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
            >
              {b('বাতিল', 'Cancel', lang)}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
            >
              {b('পরীক্ষা তৈরি ও প্রকাশ করুন', 'Create & Publish Local Exam', lang)}
            </button>
          </div>
        </form>
      )}

      {/* Section 1: Central-Controlled Term Exams (1st, 2nd, 3rd Term) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            {b('কেন্দ্রীয় নিয়ন্ত্রিত সাময়িক পরীক্ষা (১ম, ২য় ও বার্ষিক)', 'Central Term Exams (1st, 2nd & Annual)', lang)}
          </h2>
          <span className="text-slate-500">
            {termExams.length} {b('টি দৃশ্যমান', 'visible', lang)}
          </span>
        </div>

        {termExams.length === 0 ? (
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-500">
            {b(
              'এই মুহূর্তে কোনো কেন্দ্রীয় সাময়িক পরীক্ষা প্রকাশিত হয়নি। Central Admin প্রকাশ করার পর এখানে দেখা যাবে।',
              'No Term 1/2/3 exams are centrally published for your school yet.',
              lang
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {termExams.map((ex) => {
              const published = isExamCentralPublished(ex);
              const catMeta = EXAM_CATEGORY_LABELS[ex.examCategory ?? 'term_3_annual'];
              const canEdit = canActorEditExamMarks(ex, role, teacher, teacherAssignments);
              const myEntry = studentId ? ex.entries.find((en) => en.studentId === studentId) : undefined;
              const sch = schools.find((s) => s.id === ex.schoolId);

              return (
                <div
                  key={ex.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                        {b(catMeta.labelBn, catMeta.labelEn, lang)} · {sch?.nameBn ?? ex.schoolId}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {b(ex.titleBn, ex.titleEn, lang)}
                      </h3>
                    </div>
                    <span
                      className={`font-bold shrink-0 ${
                        published ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {published ? b('Published ✓', 'Published ✓', lang) : b('Locked 🔒', 'Locked 🔒', lang)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono">
                    <span>{ex.className} {ex.section ? `(${ex.section})` : ''}</span>
                    <span>·</span>
                    <span>{ex.dateRange}</span>
                    {ex.fullMarks && (
                      <>
                        <span>·</span>
                        <span>Full: {ex.fullMarks}</span>
                      </>
                    )}
                  </div>

                  {ex.instructionsBn && (
                    <p className="text-slate-600 dark:text-slate-300">{ex.instructionsBn}</p>
                  )}

                  {myEntry && (
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <span className="font-semibold">
                        {b(myEntry.subjectBn, myEntry.subjectEn, lang)}
                      </span>
                      <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                        {myEntry.written + (myEntry.mcq ?? 0) + myEntry.oral + myEntry.continuous} / {myEntry.fullMarks}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {role === 'central_admin' && (
                      <button
                        type="button"
                        onClick={() => onToggleCentralTermPublish(ex.id, !published)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                          published
                            ? 'border border-red-300 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30'
                            : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        }`}
                      >
                        {published ? (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            {b('লক / আনপাবলিশ করুন', 'Hold / Unpublish', lang)}
                          </>
                        ) : (
                          <>
                            <Globe className="w-3.5 h-3.5" />
                            {b('অনুমোদন ও প্রকাশ করুন', 'Approve & Publish to All', lang)}
                          </>
                        )}
                      </button>
                    )}

                    <div className="flex flex-wrap items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => setPdfReportExamId(ex.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-semibold cursor-pointer"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        {b('PDF রিপোর্ট', 'PDF Report', lang)}
                      </button>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveExamForMarksId((prev) => (prev === ex.id ? null : ex.id))
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                        >
                          <ClipboardEdit className="w-3.5 h-3.5" />
                          {b('নম্বর দেখুন / আপডেট', 'Marks & Results', lang)}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: School & Teacher Local Exams (Class Test, Model Test, Weekly/Monthly) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            {b('ক্লাস টেস্ট, মডেল টেস্ট, সাপ্তাহিক ও মাসিক পরীক্ষা', 'Class Tests, Model Tests, Weekly & Monthly Exams', lang)}
          </h2>
          <span className="text-slate-500">
            {localExams.length} {b('টি পরীক্ষা', 'exams', lang)}
          </span>
        </div>

        {localExams.length === 0 ? (
          <p className="text-slate-500">
            {b('এখনো কোনো স্থানীয় ক্লাস/মডেল টেস্ট তৈরি করা হয়নি।', 'No school/teacher exams created yet.', lang)}
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {localExams.map((ex) => {
              const catMeta = EXAM_CATEGORY_LABELS[ex.examCategory ?? 'class_test'];
              const canEdit = canActorEditExamMarks(ex, role, teacher, teacherAssignments);
              const myEntry = studentId ? ex.entries.find((en) => en.studentId === studentId) : undefined;
              const myGrade = myEntry
                ? calculateBDGradeAndGPA(
                    myEntry.written + (myEntry.mcq ?? 0) + myEntry.oral + myEntry.continuous,
                    myEntry.fullMarks,
                    myEntry.passMarks
                  )
                : null;

              return (
                <div
                  key={ex.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        {b(catMeta.labelBn, catMeta.labelEn, lang)} · {b(ex.subjectBn ?? '', ex.subjectEn ?? '', lang)}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {b(ex.titleBn, ex.titleEn, lang)}
                      </h3>
                    </div>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                      <Unlock className="w-3.5 h-3.5" />
                      {b('School Autonomous', 'School Autonomous', lang)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {ex.examDate ?? ex.dateRange} {ex.startTime ?? ''}
                    </span>
                    <span>·</span>
                    <span>{ex.className} {ex.section ? `(${ex.section})` : ''}</span>
                    <span>·</span>
                    <span>{ex.durationMins ?? 30} mins · Full {ex.fullMarks ?? 25}</span>
                  </div>

                  {ex.instructionsBn && (
                    <p className="text-slate-600 dark:text-slate-300">{ex.instructionsBn}</p>
                  )}

                  {myEntry && myGrade && (
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {b('প্রাপ্ত নম্বর:', 'My Score:', lang)}
                      </span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {myGrade.totalObtained} / {myEntry.fullMarks} ({myGrade.letterGrade})
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
                    <span>{b('তৈরি করেছেন:', 'Created by:', lang)} {ex.createdByName ?? 'Teacher'}</span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() =>
                          setActiveExamForMarksId((prev) => (prev === ex.id ? null : ex.id))
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
                      >
                        <ClipboardEdit className="w-3.5 h-3.5" />
                        {b('নম্বর এন্ট্রি / আপডেট', 'Enter / Edit Marks', lang)}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inline Marks Entry Table for Selected Exam */}
      {activeExamForMarks && (
        <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {b(activeExamForMarks.titleBn, activeExamForMarks.titleEn, lang)} — {b('নম্বর এন্ট্রি তালিকা', 'Marks Entry Sheet', lang)}
            </h3>
            <button
              type="button"
              onClick={() => setActiveExamForMarksId(null)}
              className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-semibold cursor-pointer"
            >
              {b('বন্ধ করুন', 'Close', lang)}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                  <th className="py-2.5 px-3 font-semibold">{b('রোল ও শিক্ষার্থী', 'Roll & Student', lang)}</th>
                  <th className="py-2.5 px-3 font-semibold">{b('বিষয়', 'Subject', lang)}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{b('নম্বর (Written)', 'Marks', lang)}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{b('পূর্ণমান ও গ্রেড', 'Full & Grade', lang)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeExamForMarks.entries.map((entry) => {
                  const total = entry.written + (entry.mcq ?? 0) + entry.oral + entry.continuous;
                  const g = calculateBDGradeAndGPA(total, entry.fullMarks, entry.passMarks);
                  return (
                    <tr key={`${entry.studentId}-${entry.subjectEn}`}>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        Roll {entry.roll} · {entry.studentName}
                      </td>
                      <td className="py-2.5 px-3">{b(entry.subjectBn, entry.subjectEn, lang)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          min={0}
                          max={entry.fullMarks}
                          value={entry.written}
                          onChange={(e) =>
                            onUpdateExamMark(
                              activeExamForMarks.id,
                              entry.studentId,
                              entry.subjectEn,
                              Number(e.target.value)
                            )
                          }
                          className="w-20 h-8 px-2 text-right font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700 dark:text-blue-400">
                        {g.totalObtained}/{entry.fullMarks} · {g.letterGrade}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ExamPdfReportModal
        open={Boolean(pdfReportExam)}
        onClose={() => setPdfReportExamId(null)}
        lang={lang}
        exam={pdfReportExam}
        school={schools.find((s) => s.id === (pdfReportExam?.schoolId ?? schoolId))}
        students={students}
        lockedStudentId={role === 'student' || role === 'guardian' ? studentId : undefined}
      />
    </div>
  );
};
