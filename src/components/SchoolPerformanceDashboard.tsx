import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, Award, BarChart3, CalendarDays, GraduationCap, TrendingUp, Users } from 'lucide-react';
import type {
  ExamRecord,
  KioskScanEvent,
  Language,
  SchoolRecord,
  StudentAttendanceHistoryEntry,
  StudentRecord,
  SubjectResultSubmission,
} from '../types';
import { b } from '../i18n/translations';
import {
  buildAtRiskStudentAlerts,
  buildAttendanceTrendSeries,
  buildClassAttendanceSummary,
  buildExamPerformanceSeries,
  buildTermExamTrendComparison,
} from '../utils/performanceAnalytics';

interface SchoolPerformanceDashboardProps {
  lang: Language;
  school: SchoolRecord;
  students: StudentRecord[];
  exams: ExamRecord[];
  subjectSubmissions?: SubjectResultSubmission[];
  kioskScans: KioskScanEvent[];
  attendanceHistory: StudentAttendanceHistoryEntry[];
  onNavigateTab?: (tab: string) => void;
}

export const SchoolPerformanceDashboard: React.FC<SchoolPerformanceDashboardProps> = ({
  lang,
  school,
  students,
  exams,
  subjectSubmissions = [],
  kioskScans,
  attendanceHistory,
  onNavigateTab,
}) => {
  const [daysWindow, setDaysWindow] = useState<7 | 14 | 30>(14);
  const [classFilter, setClassFilter] = useState<string>('all');
  const [examFilter, setExamFilter] = useState<string>('all');

  const classOptions = useMemo(() => {
    const names = Array.from(
      new Set(
        students
          .filter((s) => s.schoolId === school.id && s.status !== 'deactivated')
          .map((s) => s.className)
      )
    );
    return names;
  }, [students, school.id]);

  const schoolExams = useMemo(
    () =>
      exams.filter(
        (e) =>
          e.schoolId === school.id &&
          (classFilter === 'all' || e.className === classFilter)
      ),
    [exams, school.id, classFilter]
  );

  const attendanceSeries = useMemo(
    () =>
      buildAttendanceTrendSeries({
        schoolId: school.id,
        students,
        attendanceHistory,
        kioskScans,
        classFilter,
        days: daysWindow,
      }),
    [school.id, students, attendanceHistory, kioskScans, classFilter, daysWindow]
  );

  const classSummary = useMemo(
    () =>
      buildClassAttendanceSummary({
        schoolId: school.id,
        students,
        attendanceHistory,
        kioskScans,
        exams,
      }),
    [school.id, students, attendanceHistory, kioskScans, exams]
  );

  const subjectPerf = useMemo(
    () =>
      buildExamPerformanceSeries({
        schoolId: school.id,
        exams,
        subjectSubmissions,
        classFilter,
        examIdFilter: examFilter,
      }),
    [school.id, exams, subjectSubmissions, classFilter, examFilter]
  );

  const termTrends = useMemo(
    () =>
      buildTermExamTrendComparison({
        schoolId: school.id,
        exams,
        classFilter,
      }),
    [school.id, exams, classFilter]
  );

  const atRiskStudents = useMemo(
    () =>
      buildAtRiskStudentAlerts({
        schoolId: school.id,
        students,
        exams,
      }),
    [school.id, students, exams]
  );

  const avgAttendancePct = useMemo(() => {
    if (attendanceSeries.length === 0) return 0;
    return Math.round(
      attendanceSeries.reduce((acc, p) => acc + p.attendanceRatePct, 0) / attendanceSeries.length
    );
  }, [attendanceSeries]);

  const avgExamScorePct = useMemo(() => {
    if (subjectPerf.length === 0) return 0;
    return Math.round(
      subjectPerf.reduce((acc, s) => acc + s.averagePct, 0) / subjectPerf.length
    );
  }, [subjectPerf]);

  const overallPassRatePct = useMemo(() => {
    if (subjectPerf.length === 0) return 0;
    return Math.round(
      subjectPerf.reduce((acc, s) => acc + s.passRatePct, 0) / subjectPerf.length
    );
  }, [subjectPerf]);

  return (
    <div data-testid="school-performance-dashboard" className="space-y-6 text-xs">
      {/* Header & Interactive Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{b('বিদ্যালয় কর্মক্ষমতা বিশ্লেষণ', 'School Performance Analytics', lang)}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {b('উপস্থিতি ও পরীক্ষার ফলাফল ড্যাশবোর্ড', 'Performance Dashboard — Attendance & Exam Trends', lang)}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {school.nameBn} ({school.schoolPublicId ?? school.code}) · {b('শ্রেণি ও পরীক্ষা অনুযায়ী রিয়েল-টাইম প্রবণতা', 'Real-time attendance rates, subject averages, and at-risk tracking', lang)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label={b('সময়সীমা', 'Timeframe Window', lang)}
            data-testid="perf-days-select"
            value={daysWindow}
            onChange={(e) => setDaysWindow(Number(e.target.value) as 7 | 14 | 30)}
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
          >
            <option value={7}>{b('শেষ ৭ দিন', 'Last 7 Days', lang)}</option>
            <option value={14}>{b('শেষ ১৪ দিন', 'Last 14 Days', lang)}</option>
            <option value={30}>{b('শেষ ৩০ দিন', 'Last 30 Days', lang)}</option>
          </select>

          <select
            aria-label={b('শ্রেণি ফিল্টার', 'Class Filter', lang)}
            data-testid="perf-class-select"
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setExamFilter('all');
            }}
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
          >
            <option value="all">{b('সকল শ্রেণি', 'All Classes', lang)}</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            aria-label={b('পরীক্ষা ফিল্টার', 'Exam Filter', lang)}
            data-testid="perf-exam-select"
            value={examFilter}
            onChange={(e) => setExamFilter(e.target.value)}
            className="h-9 max-w-[230px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
          >
            <option value="all">{b('সকল পরীক্ষা', 'All Exams', lang)}</option>
            {schoolExams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {b(ex.titleBn, ex.titleEn, lang)} ({ex.className})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4 KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-slate-500 dark:text-slate-400">{b(`গড় উপস্থিতি (${daysWindow} দিন)`, `Avg Attendance (${daysWindow}d)`, lang)}</div>
            <div className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1" data-testid="perf-kpi-attendance">
              {avgAttendancePct}%
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{b('লক্ষ্যমাত্রা: ≥ ৮৫%', 'Target benchmark: ≥ 85%', lang)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-slate-500 dark:text-slate-400">{b('পরীক্ষার গড় নম্বর', 'Mean Exam Score', lang)}</div>
            <div className="text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-400 mt-1" data-testid="perf-kpi-exam-avg">
              {avgExamScorePct}%
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{subjectPerf.length} {b('টি বিষয় মূল্যায়িত', 'subjects evaluated', lang)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-slate-500 dark:text-slate-400">{b('সার্বিক পাশের হার', 'Exam Pass Rate', lang)}</div>
            <div className="text-2xl font-bold tabular-nums text-indigo-700 dark:text-indigo-400 mt-1">
              {overallPassRatePct}%
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{b('সকল শ্রেণির গড়', 'Across filtered cohorts', lang)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-slate-500 dark:text-slate-400">{b('মনোযোগ প্রয়োজন (At-Risk)', 'Students Flagged', lang)}</div>
            <div className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400 mt-1">
              {atRiskStudents.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{b('কম উপস্থিতি বা নম্বর', 'Attendance < 82% or Score < 60%', lang)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Chart 1: Daily Attendance Rate Trend */}
        <section
          aria-label="Attendance Rate Trend"
          data-testid="perf-attendance-chart-card"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                {b('দৈনিক উপস্থিতি হারের প্রবণতা (%)', 'Daily Attendance Rate Trend (%)', lang)}
              </h2>
              <p className="text-[11px] text-slate-500">
                {b('QR স্ক্যান ও ম্যানুয়াল হাজিরা অনুযায়ী উপস্থিত ও বিলম্বিত হার', 'Percentage of present + late check-ins over selected window', lang)}
              </p>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('attendance')}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                {b('হাজিরা খুলুন', 'Open Scanner', lang)}
              </button>
            )}
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceSeries} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="attRateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.22} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis yAxisId="pct" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  yAxisId="count"
                  orientation="right"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#2563eb' }}
                  width={32}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '10px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area
                  yAxisId="pct"
                  type="monotone"
                  dataKey="attendanceRatePct"
                  name={b('উপস্থিতি হার (%)', 'Attendance Rate (%)', lang)}
                  stroke="#059669"
                  strokeWidth={2.5}
                  fill="url(#attRateGrad)"
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="presentCount"
                  name={b('উপস্থিত শিক্ষার্থী (জন)', 'Present Students', lang)}
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Chart 2: Exam Subject Performance & Pass Rate */}
        <section
          aria-label="Exam Subject Performance"
          data-testid="perf-exam-chart-card"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                {b('বিষয়ভিত্তিক পরীক্ষার গড় ও পাশের হার', 'Subject-wise Exam Score & Pass Rate', lang)}
              </h2>
              <p className="text-[11px] text-slate-500">
                {b('গড় নম্বর (%), সর্বোচ্চ নম্বর (%) এবং পাশের হার (%)', 'Mean %, Highest %, and Pass Rate % across subjects', lang)}
              </p>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('exams')}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                {b('পরীক্ষা প্যানেল', 'Manage Exams', lang)}
              </button>
            )}
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={subjectPerf} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.22} />
                <XAxis dataKey={lang === 'bn' ? 'subjectBn' : 'subjectEn'} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '10px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar
                  dataKey="averagePct"
                  name={b('গড় নম্বর (%)', 'Average Score (%)', lang)}
                  fill="#2563eb"
                  radius={[6, 6, 0, 0]}
                  barSize={24}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="highestPct"
                  name={b('সর্বোচ্চ নম্বর (%)', 'Highest Score (%)', lang)}
                  fill="#6366f1"
                  radius={[6, 6, 0, 0]}
                  barSize={24}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="passRatePct"
                  name={b('পাশের হার (%)', 'Pass Rate (%)', lang)}
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Second Row: Class Breakdown Chart & At-Risk Table */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {b('শ্রেণিভিত্তিক উপস্থিতি বনাম পরীক্ষার গড় (%)', 'Class-by-Class Attendance vs Exam Mean (%)', lang)}
            </h2>
            <p className="text-[11px] text-slate-500">
              {b('প্রতিটি শ্রেণির উপস্থিতি এবং একাডেমিক ফলাফলের তুলনামূলক চিত্র', 'Comparing daily attendance rate against average exam achievement per class', lang)}
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classSummary} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.22} />
                <XAxis dataKey="className" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '10px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar
                  dataKey="attendanceRatePct"
                  name={b('উপস্থিতি হার (%)', 'Attendance Rate (%)', lang)}
                  fill="#059669"
                  radius={[5, 5, 0, 0]}
                  barSize={22}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="averageScorePct"
                  name={b('পরীক্ষার গড় (%)', 'Exam Mean (%)', lang)}
                  fill="#0284c7"
                  radius={[5, 5, 0, 0]}
                  barSize={22}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {termTrends.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
              <div className="font-bold text-slate-700 dark:text-slate-200 mb-2">
                {b('পরীক্ষা অনুযায়ী GPA ও ফলাফল সারসংক্ষেপ', 'Exam Cohort GPA & Pass Summary', lang)}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {termTrends.slice(0, 4).map((t) => (
                  <div
                    key={t.examId}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {b(t.examTitleBn, t.examTitleEn, lang)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {t.shortLabel} · {t.studentCount} {b('জন', 'students', lang)}
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono tabular-nums">
                      <div className="font-bold text-blue-700 dark:text-blue-400">GPA {t.avgGpa.toFixed(2)}</div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400">{t.passRatePct}% pass</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* At-Risk Student Intervention Table */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                {b('অগ্রাধিকারমূলক সহায়তা তালিকা (At-Risk Students)', 'Early Intervention Roster (At-Risk)', lang)}
              </h2>
              <p className="text-[11px] text-slate-500">
                {b('উপস্থিতি < ৮২% অথবা পরীক্ষার গড় নম্বর < ৬০% এমন শিক্ষার্থী', 'Students below 82% attendance or 60% average exam score', lang)}
              </p>
            </div>
            <span className="font-mono font-bold text-amber-700 dark:text-amber-400 tabular-nums">
              {atRiskStudents.length} {b('জন', 'flagged', lang)}
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            {atRiskStudents.length === 0 ? (
              <div className="p-8 text-center text-emerald-700 dark:text-emerald-400 font-semibold">
                {b(
                  'সকল শিক্ষার্থীর উপস্থিতি ও পরীক্ষার ফলাফল নিরাপদ মানদণ্ডের উপরে রয়েছে।',
                  'All active students are above attendance and academic risk thresholds.',
                  lang
                )}
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                    <th className="py-2.5 px-4 font-semibold">{b('শিক্ষার্থী', 'Student', lang)}</th>
                    <th className="py-2.5 px-3 font-semibold">{b('শ্রেণি', 'Class', lang)}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{b('উপস্থিতি', 'Attendance', lang)}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{b('পরীক্ষা গড়', 'Exam Avg', lang)}</th>
                    <th className="py-2.5 px-4 font-semibold text-right">{b('সতর্কতা', 'Flag', lang)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {atRiskStudents.map((stu) => (
                    <tr key={stu.studentId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{stu.nameBn}</div>
                        <div className="font-mono text-[11px] text-slate-500">{stu.permanentId}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {stu.className} · #{stu.roll}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-amber-700 dark:text-amber-400">
                        {stu.attendancePct}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-slate-800 dark:text-slate-200">
                        {stu.averageScorePct !== null ? `${stu.averageScorePct}%` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-rose-700 dark:text-rose-400">
                        {stu.riskReasons
                          .map((r) =>
                            r === 'low_attendance'
                              ? b('কম উপস্থিতি', 'Low Attendance', lang)
                              : b('কম নম্বর', 'Low Score', lang)
                          )
                          .join(' · ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
