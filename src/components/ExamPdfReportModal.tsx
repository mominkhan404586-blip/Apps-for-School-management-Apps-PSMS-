import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileDown, Printer, X } from 'lucide-react';
import type { ExamRecord, GradingRuleItem, Language, SchoolRecord, StudentRecord } from '../types';
import { b } from '../i18n/translations';
import { buildExamPdfReportData } from '../utils/examReportGenerator';

interface ExamPdfReportModalProps {
  open: boolean;
  onClose: () => void;
  lang: Language;
  exam: ExamRecord | null;
  school?: SchoolRecord;
  students: StudentRecord[];
  gradingRules?: GradingRuleItem[];
  lockedStudentId?: string;
}

export const ExamPdfReportModal: React.FC<ExamPdfReportModalProps> = ({
  open,
  onClose,
  lang,
  exam,
  school,
  students,
  gradingRules,
  lockedStudentId,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(lockedStudentId ?? 'all');

  useEffect(() => {
    setSelectedStudentId(lockedStudentId ?? 'all');
  }, [lockedStudentId, exam?.id, open]);

  useEffect(() => {
    if (!open) return;
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-exam-pdf-report');
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('printing-exam-pdf-report');
    };
  }, [open]);

  const studentChoices = useMemo(() => {
    if (!exam) return [];
    const seen = new Map<string, { id: string; name: string; roll: number }>();
    for (const entry of exam.entries) {
      if (!seen.has(entry.studentId)) {
        const matched = students.find((s) => s.id === entry.studentId);
        seen.set(entry.studentId, {
          id: entry.studentId,
          name: matched?.nameBn || entry.studentName,
          roll: matched?.roll ?? entry.roll,
        });
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.roll - b.roll);
  }, [exam, students]);

  const report = useMemo(() => {
    if (!exam) return null;
    return buildExamPdfReportData({
      exam,
      school,
      students,
      gradingRules,
      selectedStudentId:
        lockedStudentId || (selectedStudentId !== 'all' ? selectedStudentId : undefined),
    });
  }, [exam, school, students, gradingRules, lockedStudentId, selectedStudentId]);

  if (!open || !exam || !report) return null;

  const handlePrintPdf = () => {
    document.body.classList.add('printing-exam-pdf-report');
    window.print();
    window.setTimeout(() => {
      document.body.classList.remove('printing-exam-pdf-report');
    }, 1000);
  };

  const printableBody = (
    <div className="space-y-5 text-slate-900 bg-white">
      {/* Official School & Exam Header */}
      <div className="border-b-2 border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
            {b('প্রাথমিক ও মাধ্যমিক বিদ্যালয় ফলাফল প্রতিবেদন', 'Official Examination & Marksheet PDF Report', lang)}
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">
            {lang === 'bn' ? report.schoolNameBn : report.schoolNameEn}
          </h2>
          <div className="text-xs text-slate-600 mt-0.5">
            {b('পরীক্ষা:', 'Exam:', lang)}{' '}
            <span className="font-bold text-slate-900">
              {b(report.examTitleBn, report.examTitleEn, lang)}
            </span>{' '}
            · {report.className} · {report.dateRange}
          </div>
        </div>
        <div className="text-left sm:text-right text-[11px] text-slate-600 font-mono">
          <div>School Code: {report.schoolCode}</div>
          <div>EIIN: {report.schoolEiin}</div>
          <div>Generated: {report.generatedAtLabel}</div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
        <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
          <div className="text-[11px] text-slate-500">{b('মোট পরীক্ষার্থী', 'Students', lang)}</div>
          <div className="text-base font-bold tabular-nums">{report.totalStudents}</div>
        </div>
        <div className="border border-emerald-200 rounded-lg p-2.5 bg-emerald-50/70">
          <div className="text-[11px] text-emerald-700">{b('উত্তীর্ণ (Passed)', 'Passed', lang)}</div>
          <div className="text-base font-bold tabular-nums text-emerald-800">{report.passedCount}</div>
        </div>
        <div className="border border-rose-200 rounded-lg p-2.5 bg-rose-50/70">
          <div className="text-[11px] text-rose-700">{b('অনুত্তীর্ণ (Failed)', 'Failed', lang)}</div>
          <div className="text-base font-bold tabular-nums text-rose-800">{report.failedCount}</div>
        </div>
        <div className="border border-blue-200 rounded-lg p-2.5 bg-blue-50/70">
          <div className="text-[11px] text-blue-700">{b('পাসের হার', 'Pass Rate', lang)}</div>
          <div className="text-base font-bold tabular-nums text-blue-800">{report.passRatePct}%</div>
        </div>
        <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
          <div className="text-[11px] text-slate-500">{b('সর্বোচ্চ নম্বর', 'Highest Marks', lang)}</div>
          <div className="text-base font-bold tabular-nums">{report.highestMarks}</div>
        </div>
      </div>

      {/* Student Marksheets */}
      {report.rows.length === 0 ? (
        <div className="p-4 rounded-lg border border-slate-200 text-xs text-slate-500">
          {b('এই পরীক্ষায় এখনো কোনো নম্বর এন্ট্রি পাওয়া যায়নি।', 'No exam marksheet entries found for this selection.', lang)}
        </div>
      ) : (
        <div className="space-y-4">
          {report.rows.map((stu) => (
            <div
              key={stu.studentId}
              className="border border-slate-300 rounded-xl overflow-hidden break-inside-avoid"
            >
              <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-bold text-sm text-slate-900">{stu.studentName}</span>{' '}
                  <span className="font-mono text-slate-600">
                    (Roll {String(stu.roll).padStart(2, '0')} · {stu.className}
                    {stu.section ? ` · ${stu.section}` : ''})
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 font-mono font-bold">
                  <span className="text-blue-800">
                    Total: {stu.totalObtained}/{stu.totalFullMarks} ({stu.percentage}%)
                  </span>
                  <span className="text-emerald-800">
                    GPA {stu.gpa.toFixed(2)} ({stu.letterGrade})
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-800">
                    Rank #{stu.rank}
                  </span>
                </div>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2 px-3 font-semibold">{b('বিষয়', 'Subject', lang)}</th>
                    <th className="py-2 px-2 font-semibold text-right">Written</th>
                    <th className="py-2 px-2 font-semibold text-right">MCQ</th>
                    <th className="py-2 px-2 font-semibold text-right">Oral/CA</th>
                    <th className="py-2 px-2 font-semibold text-right">Total</th>
                    <th className="py-2 px-2 font-semibold text-right">Grade</th>
                    <th className="py-2 px-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stu.subjects.map((sub, idx) => (
                    <tr key={`${stu.studentId}-${sub.subjectEn}-${idx}`}>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {b(sub.subjectBn, sub.subjectEn, lang)}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">{sub.written}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{sub.mcq}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{sub.oralAndCa}</td>
                      <td className="py-2 px-2 text-right tabular-nums font-bold">
                        {sub.obtained}/{sub.fullMarks}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums font-semibold text-blue-800">
                        {sub.letterGrade} ({sub.gpa.toFixed(1)})
                      </td>
                      <td className="py-2 px-3 text-right font-semibold">
                        <span className={sub.passed ? 'text-emerald-700' : 'text-rose-700'}>
                          {sub.passed ? 'Pass' : 'Fail'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Official Signature Footer */}
      <div className="pt-6 grid grid-cols-2 gap-8 text-xs text-slate-700 border-t border-slate-200">
        <div>
          <div className="h-8" />
          <div className="border-t border-slate-400 pt-1 font-semibold">
            {b('শ্রেণি শিক্ষকের স্বাক্ষর', 'Class Teacher Signature', lang)}
          </div>
        </div>
        <div className="text-right">
          <div className="h-8" />
          <div className="border-t border-slate-400 pt-1 font-semibold inline-block min-w-44 text-center">
            {report.headTeacher} — {b('প্রধান শিক্ষক', 'Head Teacher', lang)}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={b('PDF পরীক্ষার ফলাফল ও মার্কশিট রিপোর্ট', 'Printable Exam PDF Report', lang)}
        data-testid="exam-pdf-report-modal"
        className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 no-print"
      >
        <div className="w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden text-slate-900">
          {/* Toolbar */}
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileDown className="w-5 h-5 text-blue-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {b('পরীক্ষার PDF রিপোর্ট ও মার্কশিট প্রিভিউ', 'Printable Exam Marksheet & PDF Report', lang)}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {b('প্রিন্ট ডায়ালগ থেকে "Save as PDF" নির্বাচন করে PDF হিসেবে সংরক্ষণ করুন।', 'Use Print or "Save as PDF" to export clean A4 marksheets.', lang)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!lockedStudentId && studentChoices.length > 0 && (
                <select
                  aria-label={b('শিক্ষার্থী নির্বাচন', 'Filter student marksheet', lang)}
                  data-testid="pdf-report-student-select"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="all">
                    {b(`সকল শিক্ষার্থী (${studentChoices.length})`, `All Students (${studentChoices.length})`, lang)}
                  </option>
                  {studentChoices.map((st) => (
                    <option key={st.id} value={st.id}>
                      Roll {st.roll} · {st.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                data-testid="pdf-report-print-btn"
                onClick={handlePrintPdf}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                {b('প্রিন্ট / PDF সংরক্ষণ', 'Print / Save PDF', lang)}
              </button>
              <button
                type="button"
                data-testid="pdf-report-close-btn"
                onClick={onClose}
                aria-label="Close PDF report preview"
                className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Printable A4 Sheet Preview */}
          <div className="p-5 sm:p-7 overflow-y-auto bg-white">
            {printableBody}
          </div>
        </div>
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
          <div className="hidden exam-pdf-print-portal">{printableBody}</div>,
          document.body
        )}
    </>
  );
};
