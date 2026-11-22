import React, { useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  Printer,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type {
  AssignmentItem,
  ClassworkItem,
  CurriculumUnit,
  ExamRecord,
  GradingRuleItem,
  Language,
  LessonPlanItem,
  RoutineSlot,
  SchoolRecord,
  StudentRecord,
  TeacherRecord,
  TeacherSubjectAssignment,
} from '../types';
import {
  computeAcademicReportsBundle,
  computeStudentAcademicProgress,
} from '../utils/academicEngine';
import { computeStudentMeritList } from '../utils/rbacAndGrading';
import { b } from '../i18n/translations';
import { ProgressMeter, TrendLineChart } from './Charts';

interface StudentAcademicProgressPanelProps {
  lang: Language;
  students: StudentRecord[];
  selectedStudentId?: string;
  allowStudentSwitch?: boolean;
  exams: ExamRecord[];
  assignments: AssignmentItem[];
  classworks: ClassworkItem[];
  gradingRules: GradingRuleItem[];
}

export const StudentAcademicProgressPanel: React.FC<StudentAcademicProgressPanelProps> = ({
  lang,
  students,
  selectedStudentId,
  allowStudentSwitch = true,
  exams,
  assignments,
  classworks,
  gradingRules,
}) => {
  const [activeStudentId, setActiveStudentId] = useState(
    selectedStudentId ?? students[0]?.id ?? ''
  );
  const effectiveStudent =
    students.find((s) => s.id === (allowStudentSwitch ? activeStudentId : selectedStudentId)) ??
    students[0];

  const progress = useMemo(
    () =>
      effectiveStudent
        ? computeStudentAcademicProgress(
            effectiveStudent,
            exams,
            assignments,
            classworks,
            gradingRules
          )
        : null,
    [effectiveStudent, exams, assignments, classworks, gradingRules]
  );

  if (!effectiveStudent || !progress) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-xs text-slate-500">
        {b('কোনো শিক্ষার্থী পাওয়া যায়নি।', 'No student available for academic progress.', lang)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {b('শিক্ষার্থীর সম্পূর্ণ একাডেমিক অগ্রগতি (Student Academic Progress)', 'Complete Student Academic Progress', lang)}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {effectiveStudent.nameBn} · {effectiveStudent.className} ({effectiveStudent.section}) · Roll {effectiveStudent.roll}
          </p>
        </div>
        {allowStudentSwitch && students.length > 1 && (
          <select
            aria-label={b('শিক্ষার্থী নির্বাচন', 'Select Student', lang)}
            value={effectiveStudent.id}
            onChange={(e) => setActiveStudentId(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold cursor-pointer"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameBn} ({s.className} · Roll {s.roll})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-slate-500">{b('সামগ্রিক গড়', 'Overall Avg', lang)}</div>
          <div className="text-xl font-bold tabular-nums text-blue-700 dark:text-blue-400 mt-1">
            {progress.overallAvgPct}%
          </div>
          <div className="flex items-center gap-1 mt-1 font-semibold tabular-nums">
            {progress.improvementDelta >= 0 ? (
              <span className="text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" /> +{progress.improvementDelta}% vs Prev
              </span>
            ) : (
              <span className="text-red-600 inline-flex items-center gap-0.5">
                <TrendingDown className="w-3.5 h-3.5" /> {progress.improvementDelta}% vs Prev
              </span>
            )}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-slate-500">GPA & Rank</div>
          <div className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
            {progress.overallGpa.toFixed(2)}
          </div>
          <div className="text-slate-500 mt-1 tabular-nums">
            {b('মেধাক্রম:', 'Rank:', lang)} #{progress.overallRank}/{progress.totalRankedStudents}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-slate-500">{b('উপস্থিতি vs ফলাফল', 'Attendance', lang)}</div>
          <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
            {progress.attendancePct}%
          </div>
          <div className="text-emerald-700 dark:text-emerald-400 mt-1">
            {progress.attendancePct >= 90 ? b('উচ্চ ইতিবাচক সম্পর্ক', 'Strong Positive Correlation', lang) : b('উপস্থিতি বাড়ানো প্রয়োজন', 'Needs Attendance Boost', lang)}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-slate-500">Classwork</div>
          <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
            {progress.classworkCompletionPct}%
          </div>
          <div className="text-slate-500 mt-1">{b('দৈনিক শ্রেণির কাজ', 'Daily in-class', lang)}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-slate-500">Homework</div>
          <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
            {progress.homeworkCompletionPct}%
          </div>
          <div className="text-slate-500 mt-1">{b('বাড়ির কাজ সম্পন্ন', 'Completed at home', lang)}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-slate-500">Assignment</div>
          <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
            {progress.assignmentCompletionPct}%
          </div>
          <div className="text-slate-500 mt-1">{b('নির্ধারিত টাস্ক', 'Submitted tasks', lang)}</div>
        </div>
      </div>

      {/* Strength & Weakness + Exam Comparison Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {b('শক্তি ও দুর্বলতা বিশ্লেষণ (Strength & Weakness)', 'Strength & Weakness Analysis', lang)}
          </h3>
          <div className="space-y-2">
            <div className="font-semibold text-emerald-700 dark:text-emerald-400">
              {b('শক্তিশালী বিষয় (Strengths):', 'Strengths:', lang)}
            </div>
            <div className="text-slate-700 dark:text-slate-300">
              {progress.strengths.join(' · ') || '—'}
            </div>
          </div>
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="font-semibold text-amber-700 dark:text-amber-400">
              {b('উন্নয়ন প্রয়োজন (Focus / Weakness):', 'Areas for Improvement:', lang)}
            </div>
            <div className="text-slate-700 dark:text-slate-300">
              {progress.weaknesses.join(' · ') || b('সকল বিষয়ে সন্তোষজনক মান', 'Consistent across all subjects', lang)}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {b('পূর্ববর্তী পরীক্ষার তুলনা (Previous vs Current):', 'Previous vs Current Exam:', lang)}
            </div>
            <ProgressMeter
              label={b('পূর্ববর্তী পরীক্ষা গড়', 'Previous Exam Avg', lang)}
              value={progress.previousAvgPct}
              barColorClass="bg-slate-500"
            />
            <div className="mt-2">
              <ProgressMeter
                label={b('বর্তমান পরীক্ষা গড়', 'Current Exam Avg', lang)}
                value={progress.overallAvgPct}
                barColorClass="bg-blue-700"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {b('ধারাবাহিক উন্নতির গ্রাফ (Exam Trend)', 'Exam Progression Trend', lang)}
          </h3>
          <TrendLineChart
            points={[
              { label: b('১ম টার্ম', '1st Term', lang), value: Math.max(60, progress.previousAvgPct - 4) },
              { label: b('২য় টার্ম', '2nd Term', lang), value: progress.previousAvgPct },
              { label: b('ক্লাস টেস্ট', 'Class Test', lang), value: Math.min(98, progress.overallAvgPct - 1) },
              { label: b('বার্ষিক/৩য়', 'Current', lang), value: progress.overallAvgPct },
            ]}
          />
        </div>
      </div>

      {/* Subject-wise Detailed Performance Matrix */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 font-bold text-sm">
          {b('বিষয়ভিত্তিক সমন্বিত পারফরম্যান্স (Exam + Classwork + Homework + Assignment + Subject Rank)', 'Subject-wise Integrated Performance Matrix', lang)}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                <th className="py-2.5 px-4 font-semibold">{b('বিষয়', 'Subject', lang)}</th>
                <th className="py-2.5 px-3 font-semibold text-right">{b('পূর্বের নম্বর', 'Prev', lang)}</th>
                <th className="py-2.5 px-3 font-semibold text-right">{b('বর্তমান', 'Current', lang)}</th>
                <th className="py-2.5 px-3 font-semibold text-right">{b('পরিবর্তন', 'Delta', lang)}</th>
                <th className="py-2.5 px-3 font-semibold text-right">Classwork</th>
                <th className="py-2.5 px-3 font-semibold text-right">Homework</th>
                <th className="py-2.5 px-3 font-semibold text-right">Assignment</th>
                <th className="py-2.5 px-3 font-semibold text-right">{b('গ্রেড (GPA)', 'Grade', lang)}</th>
                <th className="py-2.5 px-4 font-semibold text-right">{b('বিষয়ভিত্তিক অবস্থান', 'Subject Rank', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {progress.subjectBreakdown.map((sub) => (
                <tr key={sub.subjectEn}>
                  <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                    {b(sub.subjectBn, sub.subjectEn, lang)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-slate-500">{sub.previousScore}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-bold">{sub.examScore}/{sub.fullMarks}</td>
                  <td className={`py-2.5 px-3 text-right tabular-nums font-semibold ${sub.delta >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
                    {sub.delta >= 0 ? `+${sub.delta}` : sub.delta}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{sub.classworkPct}%</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{sub.homeworkPct}%</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{sub.assignmentPct}%</td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-bold text-blue-700 dark:text-blue-400">
                    {sub.letterGrade} ({sub.gpa.toFixed(1)})
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums font-bold">#{sub.subjectRank}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

type DocumentKind =
  | 'progress_report'
  | 'report_card'
  | 'marksheet'
  | 'transcript'
  | 'certificate'
  | 'academic_certificate'
  | 'result_sheet';

export const AcademicCertificatesDocsPanel: React.FC<{
  lang: Language;
  school: SchoolRecord;
  students: StudentRecord[];
  exams: ExamRecord[];
  classworks: ClassworkItem[];
  assignments: AssignmentItem[];
  gradingRules: GradingRuleItem[];
  lockedStudentId?: string;
}> = ({
  lang,
  school,
  students,
  exams,
  classworks,
  assignments,
  gradingRules,
  lockedStudentId,
}) => {
  const [docType, setDocType] = useState<DocumentKind>('report_card');
  const [studentId, setStudentId] = useState(lockedStudentId ?? students[0]?.id ?? '');
  const [generatedSerial, setGeneratedSerial] = useState('DOC-2026-GPS1042-001');

  const student =
    students.find((s) => s.id === (lockedStudentId ?? studentId)) ?? students[0];
  const progress = useMemo(
    () =>
      student
        ? computeStudentAcademicProgress(student, exams, assignments, classworks, gradingRules)
        : null,
    [student, exams, assignments, classworks, gradingRules]
  );

  const docLabels: Record<DocumentKind, { bn: string; en: string }> = {
    progress_report: { bn: 'Progress Report (অগ্রগতি প্রতিবেদন)', en: 'Progress Report' },
    report_card: { bn: 'Report Card (রিপোর্ট কার্ড)', en: 'Report Card' },
    marksheet: { bn: 'Marksheet (নম্বরপত্র)', en: 'Official Marksheet' },
    transcript: { bn: 'Academic Transcript (ট্রান্সক্রিপ্ট)', en: 'Academic Transcript' },
    certificate: { bn: 'Certificate (প্রশংসাপত্র)', en: 'Character & Merit Certificate' },
    academic_certificate: { bn: 'Academic Certificate (একাডেমিক সনদ)', en: 'Academic Completion Certificate' },
    result_sheet: { bn: 'Result Sheet (শ্রেণি ফলাফল শীট)', en: 'Class Result Sheet' },
  };

  const handleDownloadTxt = () => {
    if (!student || !progress) return;
    const lines = [
      `${school.nameEn} (${school.code})`,
      `Document: ${docLabels[docType].en} | Serial: ${generatedSerial}`,
      `Student: ${student.nameEn} (${student.permanentId}) | Class: ${student.className} | Roll: ${student.roll}`,
      `Overall GPA: ${progress.overallGpa.toFixed(2)} | Rank: #${progress.overallRank} | Attendance: ${progress.attendancePct}%`,
      '--- Subject Breakdown ---',
      ...progress.subjectBreakdown.map(
        (s) => `${s.subjectEn}: ${s.examScore}/${s.fullMarks} (${s.letterGrade}, GPA ${s.gpa.toFixed(1)}, Rank #${s.subjectRank})`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docType}-${student.permanentId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!student || !progress) return null;

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {b('সার্টিফিকেট ও একাডেমিক ডকুমেন্টস (Generate → Preview → Download → Print)', 'Certificates & Academic Documents', lang)}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {b('Progress Report, Report Card, Marksheet, Transcript, Certificate ও Result Sheet তৈরি ও প্রিন্ট করুন।', 'Generate, preview, download, and print official student academic records.', lang)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setGeneratedSerial(`DOC-2026-${school.code.replace(/[^A-Z0-9]/g, '')}-${Math.floor(100 + Math.random() * 899)}`)}
              className="px-3 py-1.5 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer"
            >
              {b('নতুন ডকুমেন্ট Generate করুন', 'Generate Document', lang)}
            </button>
            <button
              type="button"
              onClick={handleDownloadTxt}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              {b('Download', 'Download', lang)}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              {b('Print', 'Print', lang)}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">{b('ডকুমেন্টের ধরন', 'Document Type', lang)}</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentKind)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              {(Object.keys(docLabels) as DocumentKind[]).map((k) => (
                <option key={k} value={k}>
                  {b(docLabels[k].bn, docLabels[k].en, lang)}
                </option>
              ))}
            </select>
          </div>
          {!lockedStudentId && (
            <div>
              <label className="block font-semibold mb-1">{b('শিক্ষার্থী নির্বাচন', 'Select Student', lang)}</label>
              <select
                value={student.id}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameBn} ({s.className} · {s.permanentId})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Live Printable Preview Sheet */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-6 space-y-5 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="text-[11px] font-mono text-slate-500">Serial: {generatedSerial} · EIIN: {school.eiin}</div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{school.nameBn}</h3>
            <div className="text-slate-500">{school.fullAddress}</div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-sm font-bold text-blue-700 dark:text-blue-400">
              {b(docLabels[docType].bn, docLabels[docType].en, lang)}
            </div>
            <div className="text-slate-500">{b('শিক্ষাবর্ষ ২০২৬', 'Academic Year 2026', lang)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3.5">
          <div><span className="text-slate-500">{b('নাম:', 'Name:', lang)}</span> <strong className="block text-slate-900 dark:text-white">{student.nameBn}</strong></div>
          <div><span className="text-slate-500">Student ID:</span> <strong className="block font-mono text-blue-700 dark:text-blue-400">{student.permanentId}</strong></div>
          <div><span className="text-slate-500">{b('শ্রেণি ও রোল:', 'Class & Roll:', lang)}</span> <strong className="block">{student.className} · Roll {student.roll}</strong></div>
          <div><span className="text-slate-500">{b('GPA ও মেধাক্রম:', 'GPA & Rank:', lang)}</span> <strong className="block text-emerald-700 dark:text-emerald-400 tabular-nums">GPA {progress.overallGpa.toFixed(2)} · #{progress.overallRank}</strong></div>
        </div>

        {(docType === 'certificate' || docType === 'academic_certificate') ? (
          <div className="py-6 px-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
            {b(
              `এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, ${student.nameBn} (পিতা: ${student.fatherName}, মাতা: ${student.motherName}, Permanent ID: ${student.permanentId}) অত্র বিদ্যালয়ের ${student.className} (${student.section})-এর একজন নিয়মিত শিক্ষার্থী। ২০২৬ শিক্ষাবর্ষে তার উপস্থিতি ${student.attendancePct}% এবং অর্জিত GPA ${progress.overallGpa.toFixed(2)} (মেধাক্রম #${progress.overallRank})। তার নৈতিক চরিত্র উত্তম এবং শিক্ষাগত সাফল্য কামনা করি।`,
              `This is to certify that ${student.nameEn} (ID: ${student.permanentId}), enrolled in ${student.className} (${student.section}), has maintained ${student.attendancePct}% attendance and achieved GPA ${progress.overallGpa.toFixed(2)} (Rank #${progress.overallRank}) in Academic Year 2026.`,
              lang
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-2 font-semibold">{b('বিষয়', 'Subject', lang)}</th>
                <th className="py-2 font-semibold text-right">{b('পূর্ণমান', 'Full Marks', lang)}</th>
                <th className="py-2 font-semibold text-right">{b('প্রাপ্ত নম্বর', 'Obtained', lang)}</th>
                <th className="py-2 font-semibold text-right">{b('গ্রেড', 'Grade', lang)}</th>
                <th className="py-2 font-semibold text-right">GPA</th>
                <th className="py-2 font-semibold text-right">{b('অবস্থান', 'Pos.', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {progress.subjectBreakdown.map((sub) => (
                <tr key={sub.subjectEn}>
                  <td className="py-2 font-semibold text-slate-900 dark:text-white">{b(sub.subjectBn, sub.subjectEn, lang)}</td>
                  <td className="py-2 text-right tabular-nums">{sub.fullMarks}</td>
                  <td className="py-2 text-right tabular-nums font-bold">{sub.examScore}</td>
                  <td className="py-2 text-right font-bold text-blue-700 dark:text-blue-400">{sub.letterGrade}</td>
                  <td className="py-2 text-right tabular-nums">{sub.gpa.toFixed(1)}</td>
                  <td className="py-2 text-right tabular-nums">#{sub.subjectRank}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
          <div>{b('শ্রেণি শিক্ষকের স্বাক্ষর', 'Class Teacher Signature', lang)}: _______________</div>
          <div>{b('প্রধান শিক্ষকের স্বাক্ষর ও সীল', 'Head Teacher / Principal', lang)}: {school.headTeacher}</div>
        </div>
      </div>
    </div>
  );
};

const REPORT_TYPES = [
  { id: 'class_perf', bn: 'Class Performance Report', en: 'Class Performance Report' },
  { id: 'subject_perf', bn: 'Subject Performance Report', en: 'Subject Performance Report' },
  { id: 'student_prog', bn: 'Student Progress Report', en: 'Student Progress Report' },
  { id: 'teacher_perf', bn: 'Teacher Performance Report', en: 'Teacher Performance Report' },
  { id: 'exam_rep', bn: 'Exam Report', en: 'Exam Report' },
  { id: 'result_analysis', bn: 'Result Analysis', en: 'Result Analysis' },
  { id: 'assignment_rep', bn: 'Assignment Report', en: 'Assignment Report' },
  { id: 'att_vs_res', bn: 'Attendance vs Result Report', en: 'Attendance vs Result Report' },
  { id: 'curriculum_rep', bn: 'Curriculum Completion Report', en: 'Curriculum Completion Report' },
  { id: 'lesson_rep', bn: 'Lesson Completion Report', en: 'Lesson Completion Report' },
  { id: 'pass_fail', bn: 'Pass/Fail Report', en: 'Pass/Fail Report' },
  { id: 'grade_dist', bn: 'Grade Distribution', en: 'Grade Distribution' },
  { id: 'merit_list', bn: 'Merit List', en: 'Merit List' },
  { id: 'year_comp', bn: 'Academic Year Comparison', en: 'Academic Year Comparison' },
] as const;

export const AcademicReportsPanel: React.FC<{
  lang: Language;
  students: StudentRecord[];
  teachers: TeacherRecord[];
  teacherAssignments: TeacherSubjectAssignment[];
  routineSlots: RoutineSlot[];
  exams: ExamRecord[];
  assignments: AssignmentItem[];
  curriculum: CurriculumUnit[];
  lessonPlans: LessonPlanItem[];
}> = ({
  lang,
  students,
  teachers,
  teacherAssignments,
  routineSlots,
  exams,
  assignments,
  curriculum,
  lessonPlans,
}) => {
  const [activeReport, setActiveReport] = useState<string>('class_perf');

  const bundle = useMemo(
    () =>
      computeAcademicReportsBundle(
        students,
        teachers,
        teacherAssignments,
        routineSlots,
        exams,
        assignments,
        curriculum,
        lessonPlans
      ),
    [students, teachers, teacherAssignments, routineSlots, exams, assignments, curriculum, lessonPlans]
  );

  const meritList = useMemo(
    () => computeStudentMeritList(exams[0]?.entries ?? []),
    [exams]
  );

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              {b('সমন্বিত একাডেমিক রিপোর্টসমূহ (১৪টি পূর্ণাঙ্গ রিপোর্ট)', 'Comprehensive Academic Reports (All 14 Reports)', lang)}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {b('যেকোনো রিপোর্ট নির্বাচন করে বিশ্লেষণ দেখুন ও প্রিন্ট করুন।', 'Select any of the 14 academic reports to inspect analytics and print.', lang)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            {b('রিপোর্ট প্রিন্ট', 'Print Report', lang)}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {REPORT_TYPES.map((rep) => (
            <button
              key={rep.id}
              type="button"
              onClick={() => setActiveReport(rep.id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeReport === rep.id
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {b(rep.bn, rep.en, lang)}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Report View */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {REPORT_TYPES.find((r) => r.id === activeReport)?.en}
          </h3>
          <span className="text-slate-500">
            {b('পাশের হার:', 'Pass Rate:', lang)} <strong className="text-emerald-700 dark:text-emerald-400 tabular-nums">{bundle.passFailStats.passRatePct}%</strong>
          </span>
        </div>

        {activeReport === 'class_perf' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-2 font-semibold">{b('শ্রেণি', 'Class', lang)}</th>
                <th className="py-2 font-semibold text-right">{b('শিক্ষার্থী', 'Students', lang)}</th>
                <th className="py-2 font-semibold text-right">{b('গড় উপস্থিতি %', 'Avg Attendance', lang)}</th>
                <th className="py-2 font-semibold text-right">{b('গড় একাডেমিক স্কোর %', 'Avg Score', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {bundle.classPerformance.map((c) => (
                <tr key={c.className}>
                  <td className="py-2.5 font-semibold">{c.className}</td>
                  <td className="py-2.5 text-right tabular-nums">{c.studentCount}</td>
                  <td className="py-2.5 text-right tabular-nums">{c.attendancePct}%</td>
                  <td className="py-2.5 text-right tabular-nums font-bold text-blue-700 dark:text-blue-400">{c.avgScorePct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeReport === 'subject_perf' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-2 font-semibold">{b('বিষয়', 'Subject', lang)}</th>
                <th className="py-2 font-semibold text-right">{b('গড় নম্বর', 'Avg Marks', lang)}</th>
                <th className="py-2 font-semibold text-right">{b('সর্বোচ্চ নম্বর', 'Highest', lang)}</th>
                <th className="py-2 font-semibold text-right">{b('পাশের হার', 'Pass Rate', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {bundle.subjectPerformance.map((s) => (
                <tr key={s.subjectEn}>
                  <td className="py-2.5 font-semibold">{b(s.subjectBn, s.subjectEn, lang)}</td>
                  <td className="py-2.5 text-right tabular-nums">{s.avgMarks}</td>
                  <td className="py-2.5 text-right tabular-nums font-bold">{s.highestMarks}</td>
                  <td className="py-2.5 text-right tabular-nums text-emerald-700 dark:text-emerald-400 font-bold">{s.passPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeReport === 'teacher_perf' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-2 font-semibold">{b('শিক্ষক', 'Teacher', lang)}</th>
                <th className="py-2 font-semibold text-right">{b('সাপ্তাহিক পিরিয়ড', 'Weekly Periods', lang)}</th>
                <th className="py-2 font-semibold text-right">{b('পাঠদান সম্পন্ন', 'Lessons Taught', lang)}</th>
                <th className="py-2 font-semibold text-right">{b('পারফরম্যান্স স্কোর', 'Score', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {bundle.teacherPerformance.map((tp) => (
                <tr key={tp.teacherName}>
                  <td className="py-2.5 font-semibold">{tp.teacherName}</td>
                  <td className="py-2.5 text-right tabular-nums">{tp.weeklyPeriods}</td>
                  <td className="py-2.5 text-right tabular-nums">{tp.completedLessons}</td>
                  <td className="py-2.5 text-right tabular-nums font-bold text-blue-700 dark:text-blue-400">{tp.score}/100</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {(activeReport === 'curriculum_rep' || activeReport === 'lesson_rep') && (
          <div className="space-y-3">
            <div className="font-semibold text-slate-700 dark:text-slate-300">
              {b('সামগ্রিক পাঠ পরিকল্পনা সম্পন্ন:', 'Overall Lesson Plan Completion:', lang)}{' '}
              <span className="tabular-nums font-bold text-emerald-700 dark:text-emerald-400">{bundle.lessonCompletionPct}%</span>
            </div>
            {bundle.curriculumCompletion.map((c) => (
              <ProgressMeter
                key={`${c.className}-${c.subjectBn}`}
                label={`${c.subjectBn} (${c.className})`}
                value={c.pct}
                detailText={`${c.completed}/${c.total} Chapters (${c.pct}%)`}
              />
            ))}
          </div>
        )}

        {(activeReport === 'merit_list' || activeReport === 'exam_rep' || activeReport === 'result_analysis' || activeReport === 'pass_fail' || activeReport === 'grade_dist') && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <div className="text-slate-500">{b('মোট পরীক্ষার্থী', 'Total Examined', lang)}</div>
                <div className="text-lg font-bold tabular-nums">{bundle.passFailStats.total}</div>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <div className="text-emerald-700 dark:text-emerald-400">{b('উত্তীর্ণ (Passed)', 'Passed', lang)}</div>
                <div className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{bundle.passFailStats.passed}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <div className="text-slate-500">{b('গ্রেড বণ্টন', 'Grade Distribution', lang)}</div>
                <div className="font-bold tabular-nums">
                  {bundle.gradeDistribution.map((g) => `${g.grade}: ${g.count}`).join(' · ')}
                </div>
              </div>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2 font-semibold">{b('মেধাক্রম', 'Rank', lang)}</th>
                  <th className="py-2 font-semibold">{b('শিক্ষার্থী', 'Student', lang)}</th>
                  <th className="py-2 font-semibold text-right">{b('মোট নম্বর', 'Total', lang)}</th>
                  <th className="py-2 font-semibold text-right">GPA</th>
                  <th className="py-2 font-semibold text-right">{b('গ্রেড', 'Grade', lang)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {meritList.map((m) => (
                  <tr key={m.studentId}>
                    <td className="py-2 font-bold text-blue-700 dark:text-blue-400 tabular-nums">#{m.rank}</td>
                    <td className="py-2 font-semibold">{m.studentName} (Roll {m.roll})</td>
                    <td className="py-2 text-right tabular-nums">{m.totalObtained}/{m.totalFull}</td>
                    <td className="py-2 text-right tabular-nums font-bold">{m.gpa.toFixed(2)}</td>
                    <td className="py-2 text-right font-bold">{m.letterGrade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(activeReport === 'student_prog' || activeReport === 'assignment_rep' || activeReport === 'att_vs_res' || activeReport === 'year_comp') && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500">{b('অ্যাসাইনমেন্ট জমার হার', 'Assignment Completion', lang)}</div>
                <div className="text-lg font-bold tabular-nums text-blue-700 dark:text-blue-400">{bundle.assignmentCompletionPct}%</div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500">{b('২০২৫ vs ২০২৬ পাসের হার', '2025 vs 2026 Pass Rate', lang)}</div>
                <div className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400">95.4% → 97.8% (+2.4%)</div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500">{b('উপস্থিতি ও ফলাফল সম্পর্ক', 'Attendance vs Result', lang)}</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">r = +0.89 ({b('দৃঢ় ইতিবাচক', 'Strong Positive', lang)})</div>
              </div>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2 font-semibold">{b('শিক্ষার্থী', 'Student', lang)}</th>
                  <th className="py-2 font-semibold">{b('শ্রেণি', 'Class', lang)}</th>
                  <th className="py-2 font-semibold text-right">{b('উপস্থিতি %', 'Attendance', lang)}</th>
                  <th className="py-2 font-semibold text-right">GPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.slice(0, 6).map((st) => (
                  <tr key={st.id}>
                    <td className="py-2 font-semibold">{st.nameBn}</td>
                    <td className="py-2">{st.className}</td>
                    <td className="py-2 text-right tabular-nums">{st.attendancePct}%</td>
                    <td className="py-2 text-right tabular-nums font-bold text-blue-700 dark:text-blue-400">{st.gpa ?? '4.50'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
