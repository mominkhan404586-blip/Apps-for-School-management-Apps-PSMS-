import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Paperclip,
  Plus,
  X,
} from 'lucide-react';
import type {
  DailyLessonHomeworkItem,
  DailyLessonStatus,
  Language,
  Role,
  StudentRecord,
  TeacherRecord,
  TeacherSubjectAssignment,
} from '../types';
import {
  canTeacherPublishDailyLesson,
  filterDailyLessonsForRole,
} from '../utils/academicEngine';
import { b } from '../i18n/translations';

interface TodaysLessonsPanelProps {
  role: Role;
  lang: Language;
  schoolId: string;
  dailyLessons: DailyLessonHomeworkItem[];
  student?: StudentRecord;
  teacher?: TeacherRecord;
  teacherAssignments?: TeacherSubjectAssignment[];
  students?: StudentRecord[];
  onToggleStudentLessonStatus?: (lessonId: string, studentId: string, status: DailyLessonStatus) => void;
  onPublishDailyLesson?: (lesson: Omit<DailyLessonHomeworkItem, 'id' | 'studentStates'>) => void;
  compactSummaryOnly?: boolean;
  onViewAllClick?: () => void;
}

const STATUS_LABELS: Record<DailyLessonStatus, { bn: string; en: string; cls: string }> = {
  pending: {
    bn: 'বাকি (Pending)',
    en: 'Pending',
    cls: 'text-amber-700 dark:text-amber-400',
  },
  completed: {
    bn: 'সম্পন্ন (Completed)',
    en: 'Completed',
    cls: 'text-emerald-700 dark:text-emerald-400',
  },
  submitted: {
    bn: 'জমা দিয়েছে (Submitted)',
    en: 'Submitted',
    cls: 'text-blue-700 dark:text-blue-400',
  },
  overdue: {
    bn: 'সময় অতিক্রান্ত (Overdue)',
    en: 'Overdue',
    cls: 'text-red-600 dark:text-red-400',
  },
};

export const TodaysLessonsPanel: React.FC<TodaysLessonsPanelProps> = ({
  role,
  lang,
  schoolId,
  dailyLessons,
  student,
  teacher,
  teacherAssignments = [],
  students = [],
  onToggleStudentLessonStatus,
  onPublishDailyLesson,
  compactSummaryOnly = false,
  onViewAllClick,
}) => {
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [classFilter, setClassFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [teacherViewMode, setTeacherViewMode] = useState<'class' | 'subject'>('class');
  const [detailLesson, setDetailLesson] = useState<DailyLessonHomeworkItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Teacher Create Form State (Locked strictly to assigned Class + Subject)
  const myAssignments = useMemo(
    () => (teacher ? teacherAssignments.filter((a) => a.teacherId === teacher.id) : []),
    [teacher, teacherAssignments]
  );
  const [draftAssignmentId, setDraftAssignmentId] = useState(myAssignments[0]?.id ?? '');
  const activeDraftAssignment =
    myAssignments.find((a) => a.id === draftAssignmentId) ?? myAssignments[0];

  const [draftLessonTitle, setDraftLessonTitle] = useState('');
  const [draftHomeworkText, setDraftHomeworkText] = useState('');
  const [draftDueDate, setDraftDueDate] = useState(todayIso);
  const [draftAttachment, setDraftAttachment] = useState('');

  const scopedLessons = useMemo(() => {
    const base = filterDailyLessonsForRole(dailyLessons, {
      role,
      schoolId,
      student,
      teacher,
      date: selectedDate === 'all' ? undefined : selectedDate,
      className: classFilter,
      subjectEn: subjectFilter,
    });
    if (role === 'teacher' && teacher) {
      return base.filter((l) => l.teacherId === teacher.id);
    }
    if (teacherFilter !== 'all') {
      return base.filter((l) => l.teacherId === teacherFilter);
    }
    return base;
  }, [dailyLessons, role, schoolId, student, teacher, selectedDate, classFilter, subjectFilter, teacherFilter]);

  const studentCounts = useMemo(() => {
    const targetId = student?.id ?? '';
    let completed = 0;
    let pending = 0;
    let overdue = 0;
    for (const item of scopedLessons) {
      const st = item.studentStates[targetId] ?? 'pending';
      if (st === 'completed' || st === 'submitted') completed += 1;
      else if (st === 'overdue') overdue += 1;
      else pending += 1;
    }
    return { total: scopedLessons.length, completed, pending, overdue };
  }, [scopedLessons, student]);

  // Compact Dashboard Summary Card (Student / Parent Dashboard)
  if (compactSummaryOnly) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              {b('📚 আজকের পড়া (Today’s Lessons)', 'Today’s Lessons & Homework', lang)}
            </h2>
            <p className="text-slate-500 mt-0.5">
              {student?.className} · {selectedDate}
            </p>
          </div>
          {onViewAllClick && (
            <button
              type="button"
              onClick={onViewAllClick}
              className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer whitespace-nowrap"
            >
              {b('View All →', 'View All →', lang)}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
            <div className="text-slate-500">{b('আজকের মোট পড়া', "Today's Total", lang)}</div>
            <div className="text-lg font-bold tabular-nums mt-0.5">{studentCounts.total} {b('টি বিষয়', 'subjects', lang)}</div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
            <div className="text-emerald-700 dark:text-emerald-400">Completed</div>
            <div className="text-lg font-bold tabular-nums mt-0.5">{studentCounts.completed}</div>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
            <div className="text-amber-700 dark:text-amber-400">Pending</div>
            <div className="text-lg font-bold tabular-nums mt-0.5">{studentCounts.pending}</div>
          </div>
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
            <div className="text-red-600 dark:text-red-400">Overdue</div>
            <div className="text-lg font-bold tabular-nums mt-0.5">{studentCounts.overdue}</div>
          </div>
        </div>
      </div>
    );
  }

  const handleTeacherCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher || !activeDraftAssignment || !onPublishDailyLesson) return;
    const allowed = canTeacherPublishDailyLesson(
      teacher,
      teacherAssignments,
      schoolId,
      activeDraftAssignment.className,
      activeDraftAssignment.subjectBn,
      activeDraftAssignment.subjectEn
    );
    if (!allowed || !draftHomeworkText.trim()) return;

    onPublishDailyLesson({
      schoolId,
      academicYear: String(new Date().getFullYear()),
      date: todayIso,
      className: activeDraftAssignment.className,
      section: activeDraftAssignment.section,
      subjectBn: activeDraftAssignment.subjectBn,
      subjectEn: activeDraftAssignment.subjectEn,
      teacherId: teacher.id,
      teacherName: teacher.nameBn,
      lessonTitleBn: draftLessonTitle.trim() || `${activeDraftAssignment.subjectBn} — আজকের পাঠ`,
      lessonTitleEn: draftLessonTitle.trim() || `${activeDraftAssignment.subjectEn} — Today's Lesson`,
      homeworkTextBn: draftHomeworkText.trim(),
      homeworkTextEn: draftHomeworkText.trim(),
      dueDate: draftDueDate,
      attachmentLabel: draftAttachment.trim() || undefined,
      status: 'published',
    });

    setDraftLessonTitle('');
    setDraftHomeworkText('');
    setDraftAttachment('');
    setCreateOpen(false);
  };

  const uniqueDates = Array.from(new Set(dailyLessons.map((d) => d.date))).sort().reverse();
  const uniqueClasses = Array.from(new Set(dailyLessons.map((d) => d.className)));
  const uniqueSubjects = Array.from(new Set(dailyLessons.map((d) => d.subjectEn)));

  return (
    <div className="space-y-5 text-xs">
      {/* Header + Date History + Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            {role === 'school_admin' || role === 'central_admin'
              ? b('📚 আজকের পড়া মনিটরিং (Today’s Lessons Monitoring)', "Today's Lessons Monitoring", lang)
              : b('📚 আজকের পড়া (Today’s Lessons & Homework)', "Today's Lessons & Homework", lang)}
          </h2>
          <p className="text-slate-500 mt-0.5">
            {role === 'student' || role === 'guardian'
              ? b(
                  `${student?.schoolNameBn} · ${student?.className} (${student?.section}) — সকল বিষয়ের দৈনিক পড়া ও বাড়ির কাজ এক টেবিলে।`,
                  `${student?.className} (${student?.section}) — Unified multi-subject daily homework view.`,
                  lang
                )
              : role === 'teacher'
                ? b(
                    `শুধুমাত্র আপনার নির্ধারিত শ্রেণি ও বিষয়ের আজকের পড়া তৈরি ও শিক্ষার্থীর অবস্থা দেখুন।`,
                    `Create & track Today's Lessons strictly for your assigned classes and subjects.`,
                    lang
                  )
                : b(
                    `শ্রেণি, বিষয়, শিক্ষক ও তারিখ অনুযায়ী বিদ্যালয়ের সকল আজকের পড়া পর্যবেক্ষণ।`,
                    `Monitor all published lessons & homework by class, subject, teacher, and date.`,
                    lang
                  )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              aria-label={b('তারিখ নির্বাচন (Lesson History)', 'Select Lesson History Date', lang)}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-semibold outline-none cursor-pointer"
            >
              {uniqueDates.map((dt) => (
                <option key={dt} value={dt}>
                  {dt === todayIso ? `${dt} (${b('আজ', 'Today', lang)})` : dt}
                </option>
              ))}
              <option value="all">{b('সকল তারিখ (History)', 'All Dates (History)', lang)}</option>
            </select>
          </div>

          {role === 'teacher' && onPublishDailyLesson && myAssignments.length > 0 && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              {b('➕ আজকের পড়া দিন', '+ Add Today’s Lesson', lang)}
            </button>
          )}
        </div>
      </div>

      {/* Teacher Mode: Overview across assigned classes + Class-wise/Subject-wise switch */}
      {role === 'teacher' && teacher && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-slate-900 dark:text-white">
              {b("আজকের Homework ওভারভিউ (আপনার নির্ধারিত শ্রেণিসমূহ)", "Today's Homework Overview (Your Assigned Classes)", lang)}
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setTeacherViewMode('class')}
                className={`px-3 py-1 font-semibold cursor-pointer ${
                  teacherViewMode === 'class' ? 'bg-blue-700 text-white' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {b('শ্রেণিভিত্তিক', 'Class-wise', lang)}
              </button>
              <button
                type="button"
                onClick={() => setTeacherViewMode('subject')}
                className={`px-3 py-1 font-semibold cursor-pointer ${
                  teacherViewMode === 'subject' ? 'bg-blue-700 text-white' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {b('বিষয়ভিত্তিক', 'Subject-wise', lang)}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myAssignments.map((asg) => {
              const published = dailyLessons.some(
                (l) =>
                  l.date === todayIso &&
                  l.className === asg.className &&
                  l.subjectEn.toLowerCase() === asg.subjectEn.toLowerCase() &&
                  l.teacherId === teacher.id
              );
              return (
                <div
                  key={asg.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {teacherViewMode === 'class'
                        ? `${asg.className} (${asg.section}) · ${b(asg.subjectBn, asg.subjectEn, lang)}`
                        : `${b(asg.subjectBn, asg.subjectEn, lang)} · ${asg.className}`}
                    </div>
                    <div className="text-slate-500">Room {asg.room}</div>
                  </div>
                  <span
                    className={`font-semibold whitespace-nowrap ${
                      published ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {published ? b('Published ✅', 'Published ✅', lang) : b('Not Added ⏳', 'Not Added ⏳', lang)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Admin Filters */}
      {(role === 'school_admin' || role === 'central_admin') && (
        <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <select
            aria-label="Filter by Class"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
          >
            <option value="all">{b('সকল শ্রেণি', 'All Classes', lang)}</option>
            {uniqueClasses.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Filter by Subject"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
          >
            <option value="all">{b('সকল বিষয়', 'All Subjects', lang)}</option>
            {uniqueSubjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Filter by Teacher"
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
          >
            <option value="all">{b('সকল শিক্ষক', 'All Teachers', lang)}</option>
            {Array.from(new Map(dailyLessons.map((d) => [d.teacherId, d.teacherName])).entries()).map(
              ([id, name]) => (
                <option key={id} value={id}>{name}</option>
              )
            )}
          </select>
        </div>
      )}

      {/* Unified Multi-Subject আজকের পড়া Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                <th className="py-3 px-4 font-semibold w-12">{b('ক্রম', '#', lang)}</th>
                <th className="py-3 px-3 font-semibold">{b('বিষয়', 'Subject', lang)}</th>
                <th className="py-3 px-3 font-semibold">{b('শিক্ষক', 'Teacher', lang)}</th>
                <th className="py-3 px-3 font-semibold">{b('আজকের পড়া / Homework', "Today's Lesson / Homework", lang)}</th>
                <th className="py-3 px-3 font-semibold whitespace-nowrap">{b('জমা দেওয়ার তারিখ', 'Due Date', lang)}</th>
                <th className="py-3 px-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {scopedLessons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 px-4 text-center text-slate-500">
                    {b('নির্বাচিত তারিখে কোনো পড়া পাওয়া যায়নি।', 'No lessons found for the selected filter.', lang)}
                  </td>
                </tr>
              ) : (
                scopedLessons.map((item, idx) => {
                  const targetStudentId = student?.id ?? '';
                  const st: DailyLessonStatus = targetStudentId ? (item.studentStates[targetStudentId] ?? 'pending') : 'pending';
                  const stMeta = STATUS_LABELS[st];

                  // For Teacher/Admin, show class completion count
                  const classRoster = students.filter(
                    (s) => s.schoolId === item.schoolId && s.className === item.className
                  );
                  const completedStudentsCount = Object.values(item.studentStates).filter(
                    (v) => v === 'completed' || v === 'submitted'
                  ).length;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setDetailLesson(item)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 tabular-nums font-semibold text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {b(item.subjectBn, item.subjectEn, lang)}
                        <div className="text-[11px] font-normal text-slate-500">{item.className}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {item.teacherName}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {b(item.lessonTitleBn, item.lessonTitleEn, lang)}
                        </div>
                        <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                          {b(item.homeworkTextBn, item.homeworkTextEn, lang)}
                        </div>
                        {item.attachmentLabel && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 dark:text-blue-400 mt-1">
                            <Paperclip className="w-3 h-3" /> {item.attachmentLabel}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {item.dueDate}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {role === 'student' || role === 'guardian' ? (
                          <span className={`font-semibold ${stMeta.cls}`}>
                            {b(stMeta.bn, stMeta.en, lang)}
                          </span>
                        ) : (
                          <span className="font-semibold text-blue-700 dark:text-blue-400 tabular-nums">
                            {completedStudentsCount}/{Math.max(classRoster.length, 2)} {b('সম্পন্ন', 'Done', lang)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Homework Details Modal */}
      {detailLesson && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xl space-y-4 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-mono text-blue-700 dark:text-blue-400 font-semibold">
                  {detailLesson.className} · {b(detailLesson.subjectBn, detailLesson.subjectEn, lang)} · {detailLesson.date}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  📝 {b('Homework বিবরণ', 'Homework Details', lang)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailLesson(null)}
                aria-label="Close details modal"
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <div>
                <span className="text-slate-500">{b('পাঠ শিরোনাম:', 'Lesson:', lang)}</span>{' '}
                <span className="font-bold text-slate-900 dark:text-white">
                  {b(detailLesson.lessonTitleBn, detailLesson.lessonTitleEn, lang)}
                </span>
              </div>
              <div>
                <span className="text-slate-500">{b('শিক্ষক:', 'Teacher:', lang)}</span>{' '}
                <span className="font-semibold">{detailLesson.teacherName}</span>
              </div>
              <div>
                <span className="text-slate-500">{b('নির্দেশনা:', 'Instruction:', lang)}</span>{' '}
                <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                  {b(detailLesson.homeworkTextBn, detailLesson.homeworkTextEn, lang)}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1 font-mono text-slate-600 dark:text-slate-300">
                <Clock className="w-3.5 h-3.5" />
                {b('জমা দেওয়ার শেষ তারিখ:', 'Due Date:', lang)} {detailLesson.dueDate}
              </div>
            </div>

            {detailLesson.attachmentLabel && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
                <span className="inline-flex items-center gap-1.5 font-semibold text-blue-800 dark:text-blue-300">
                  <FileText className="w-4 h-4" />
                  {detailLesson.attachmentLabel}
                </span>
                <span className="font-semibold text-blue-700 dark:text-blue-400">
                  📎 {b('সংযুক্তি প্রস্তুত', 'Attachment Ready', lang)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              {role === 'student' && student && onToggleStudentLessonStatus && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleStudentLessonStatus(detailLesson.id, student.id, 'completed');
                    setDetailLesson(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {b('সম্পন্ন হিসেবে চিহ্নিত করুন', 'Mark as Completed', lang)}
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetailLesson(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
              >
                {b('বন্ধ করুন', 'Close', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Create Today's Lesson Modal */}
      {createOpen && role === 'teacher' && teacher && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleTeacherCreateSubmit}
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xl space-y-4 text-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {b('➕ নতুন আজকের পড়া / Homework প্রকাশ করুন', 'Publish New Today’s Lesson', lang)}
                </h3>
                <p className="text-slate-500 mt-0.5">
                  {b(
                    'নিরাপত্তা নীতি: শুধুমাত্র আপনার নির্ধারিত শ্রেণি ও বিষয় নির্বাচন করা যাবে।',
                    'RBAC: Only your assigned Class & Subject allocations are selectable.',
                    lang
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                aria-label="Close publish lesson modal"
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block font-semibold mb-1">{b('নির্ধারিত শ্রেণি ও বিষয়', 'Assigned Class & Subject', lang)}</label>
              <select
                value={activeDraftAssignment?.id ?? ''}
                onChange={(e) => setDraftAssignmentId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              >
                {myAssignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.className} ({a.section}) — {b(a.subjectBn, a.subjectEn, lang)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">{b('আজকের পাঠের শিরোনাম', 'Lesson Topic Title', lang)}</label>
              <input
                type="text"
                required
                value={draftLessonTitle}
                onChange={(e) => setDraftLessonTitle(e.target.value)}
                placeholder={b('যেমন: অধ্যায় ৫ — দশমিক ভগ্নাংশ পরিচিতি', 'e.g. Chapter 5 — Decimal Fractions', lang)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">{b('বাড়ির কাজ (Homework নির্দেশনা)', 'Homework Instructions', lang)}</label>
              <textarea
                required
                rows={3}
                value={draftHomeworkText}
                onChange={(e) => setDraftHomeworkText(e.target.value)}
                placeholder={b('অনুশীলনী ১ থেকে ৫ নং অঙ্ক খাতায় করে আনবে...', 'Solve Exercises 1-5 in notebook...', lang)}
                className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">{b('জমা দেওয়ার তারিখ', 'Submission Date', lang)}</label>
                <input
                  type="date"
                  value={draftDueDate}
                  onChange={(e) => setDraftDueDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('সংযুক্তি (ঐচ্ছিক PDF/Worksheet)', 'Attachment Label (Optional)', lang)}</label>
                <input
                  type="text"
                  value={draftAttachment}
                  onChange={(e) => setDraftAttachment(e.target.value)}
                  placeholder="Practice_Sheet.pdf"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
              >
                {b('বাতিল', 'Cancel', lang)}
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
              >
                {b('প্রকাশ করুন ও নোটিফিকেশন পাঠান', 'Publish & Notify Students', lang)}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
