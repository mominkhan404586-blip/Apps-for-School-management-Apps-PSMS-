import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Download,
  Plus,
  Printer,
  Send,
  Trash2,
} from 'lucide-react';
import type {
  ExamRecord,
  ExamRoutineConflict,
  ExamRoutineRecord,
  ExamRoutineSlot,
  Language,
  Role,
  SchoolRecord,
  TeacherRecord,
} from '../types';
import { b } from '../i18n/translations';
import {
  detectExamRoutineConflicts,
  exportExamRoutineCsv,
  getStudentPersonalExamRoutine,
  getTeacherInvigilatorDuties,
  publishExamRoutine,
} from '../utils/examRoutineEngine';

interface ExamRoutineSystemProps {
  lang: Language;
  role: Role;
  school: SchoolRecord;
  actorName: string;
  teacherId?: string;
  studentClass?: string;
  studentSection?: string;
  teachers: TeacherRecord[];
  exams: ExamRecord[];
  examRoutines: ExamRoutineRecord[];
  onUpdateExamRoutines?: (next: ExamRoutineRecord[], toast?: string) => void;
}

export const ExamRoutineSystem: React.FC<ExamRoutineSystemProps> = ({
  lang,
  role,
  school,
  actorName,
  teacherId,
  studentClass,
  studentSection,
  teachers,
  exams,
  examRoutines,
  onUpdateExamRoutines,
}) => {
  const isAdmin = role === 'school_admin' || role === 'central_admin';

  const schoolRoutines = useMemo(
    () => examRoutines.filter((r) => r.schoolId === school.id),
    [examRoutines, school.id]
  );

  const [activeRoutineId, setActiveRoutineId] = useState(schoolRoutines[0]?.id ?? '');
  const activeRoutine =
    schoolRoutines.find((r) => r.id === activeRoutineId) ?? schoolRoutines[0];

  // New routine draft controls
  const [newClass, setNewClass] = useState(school.approvedClasses[0] ?? 'Class 4');
  const [newSection, setNewSection] = useState('ক (A)');
  const [newExamId, setNewExamId] = useState(exams[0]?.id ?? 'exm-2026-t3');

  // New slot form
  const [subjectBn, setSubjectBn] = useState('বিজ্ঞান');
  const [subjectEn, setSubjectEn] = useState('Science');
  const [examDate, setExamDate] = useState('2026-11-28');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [fullMarks, setFullMarks] = useState(100);
  const [room, setRoom] = useState('Hall A · Room 104');
  const [seatAllocation, setSeatAllocation] = useState('Roll 1 – 35');
  const [invigilatorId, setInvigilatorId] = useState(teachers[0]?.id ?? 'tch-2');
  const [examType, setExamType] = useState<ExamRoutineSlot['examType']>('Written');
  const [publishConflicts, setPublishConflicts] = useState<ExamRoutineConflict[]>([]);
  const [publishMessage, setPublishMessage] = useState('');

  const schoolTeachers = useMemo(
    () => teachers.filter((t) => t.schoolId === school.id),
    [teachers, school.id]
  );

  // Student / Guardian view
  if (role === 'student' || role === 'guardian') {
    const personal = getStudentPersonalExamRoutine(
      examRoutines,
      school.id,
      studentClass ?? 'Class 4',
      studentSection
    );
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-700" />
              {b('আমার পরীক্ষার রুটিন (Published Exam Routine)', 'Personal Exam Routine', lang)}
            </h2>
            <p className="text-slate-500">
              {school.nameBn} · {studentClass ?? 'Class 4'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            {b('প্রিন্ট', 'Print', lang)}
          </button>
        </div>
        {personal.length === 0 ? (
          <div className="p-4 text-center text-slate-500">
            {b('এখনো কোনো পরীক্ষার রুটিন প্রকাশিত হয়নি।', 'No published exam routine yet.', lang)}
          </div>
        ) : (
          personal.map((r) => (
            <div key={r.id} className="space-y-2">
              <div className="font-bold text-blue-700 dark:text-blue-400">
                {b(r.examTitleBn, r.examTitleEn, lang)} ({r.className} · {r.section})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <th className="py-2 px-3">{b('তারিখ', 'Date', lang)}</th>
                      <th className="py-2 px-3">{b('সময়', 'Time', lang)}</th>
                      <th className="py-2 px-3">{b('বিষয়', 'Subject', lang)}</th>
                      <th className="py-2 px-3">{b('কক্ষ ও আসন', 'Room & Seat', lang)}</th>
                      <th className="py-2 px-3">{b('ধরন / নম্বর', 'Type / Marks', lang)}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {r.slots.map((s) => (
                      <tr key={s.id}>
                        <td className="py-2 px-3 font-mono font-semibold">{s.examDate}</td>
                        <td className="py-2 px-3 font-mono">{s.startTime} – {s.endTime}</td>
                        <td className="py-2 px-3 font-bold">{b(s.subjectBn, s.subjectEn, lang)}</td>
                        <td className="py-2 px-3">{s.room} ({s.seatAllocation})</td>
                        <td className="py-2 px-3">{s.examType} · {s.fullMarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  // Teacher Invigilator Duty View
  if (role === 'teacher' && teacherId) {
    const duties = getTeacherInvigilatorDuties(examRoutines, school.id, teacherId);
    return (
      <div className="space-y-4 text-xs">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-700" />
                {b('আমার পরীক্ষার পরিদর্শক দায়িত্ব (Invigilator Duty)', 'Exam Routine & Invigilator Duties', lang)}
              </h2>
              <p className="text-slate-500">{school.nameBn} ({school.code})</p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              {b('প্রিন্ট', 'Print', lang)}
            </button>
          </div>

          {duties.length === 0 ? (
            <div className="p-4 text-center text-slate-500">
              {b('এই বিদ্যালয়ে আপনার কোনো প্রকাশিত পরীক্ষার পরিদর্শক দায়িত্ব নেই।', 'No invigilator duties scheduled in this school.', lang)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                    <th className="py-2 px-3">{b('তারিখ ও সময়', 'Date & Time', lang)}</th>
                    <th className="py-2 px-3">{b('পরীক্ষা ও শ্রেণি', 'Exam & Class', lang)}</th>
                    <th className="py-2 px-3">{b('বিষয়', 'Subject', lang)}</th>
                    <th className="py-2 px-3">{b('কক্ষ ও আসন', 'Room & Seats', lang)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {duties.map((d) => (
                    <tr key={d.slot.id}>
                      <td className="py-2 px-3 font-mono font-semibold">
                        {d.slot.examDate} · {d.slot.startTime}–{d.slot.endTime}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-bold">{b(d.examTitleBn, d.examTitleEn, lang)}</div>
                        <div className="text-slate-500">{d.className} ({d.section})</div>
                      </td>
                      <td className="py-2 px-3 font-semibold">{b(d.slot.subjectBn, d.slot.subjectEn, lang)}</td>
                      <td className="py-2 px-3">{d.slot.room} · {d.slot.seatAllocation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // School Admin / Central Admin Management View
  const liveConflicts = activeRoutine
    ? detectExamRoutineConflicts(activeRoutine, schoolRoutines)
    : [];

  const handleCreateRoutine = () => {
    if (!onUpdateExamRoutines) return;
    const examObj = exams.find((e) => e.id === newExamId) ?? exams[0];
    const created: ExamRoutineRecord = {
      id: `exr-${Date.now().toString().slice(-5)}`,
      schoolId: school.id,
      academicYear: '২০২৬',
      examId: examObj?.id ?? 'exm-custom',
      examTitleBn: examObj?.titleBn ?? 'সাময়িক পরীক্ষা ২০২৬',
      examTitleEn: examObj?.titleEn ?? 'Term Exam 2026',
      className: newClass,
      section: newSection,
      status: 'Draft',
      slots: [],
      createdBy: actorName,
      createdAt: '2026-11-19',
      updatedAt: '2026-11-19',
    };
    onUpdateExamRoutines([created, ...examRoutines], `Exam Routine Draft created (${newClass})`);
    setActiveRoutineId(created.id);
    setPublishConflicts([]);
    setPublishMessage('');
  };

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoutine || !onUpdateExamRoutines) return;
    const invig = schoolTeachers.find((t) => t.id === invigilatorId) ?? schoolTeachers[0];
    const slot: ExamRoutineSlot = {
      id: `ers-${Date.now().toString().slice(-5)}`,
      subjectBn: subjectBn.trim(),
      subjectEn: subjectEn.trim() || subjectBn.trim(),
      examDate,
      startTime,
      endTime,
      durationMins: 120,
      fullMarks,
      room: room.trim(),
      seatAllocation: seatAllocation.trim(),
      invigilatorTeacherId: invig?.id ?? 'tch-2',
      invigilatorTeacherName: invig?.nameBn ?? 'শিক্ষক',
      examType,
    };
    const next = examRoutines.map((r) =>
      r.id === activeRoutine.id
        ? { ...r, slots: [...r.slots, slot], updatedAt: '2026-11-19' }
        : r
    );
    onUpdateExamRoutines(next, 'Exam slot added');
    setPublishConflicts([]);
    setPublishMessage('');
  };

  const handleDeleteSlot = (slotId: string) => {
    if (!activeRoutine || !onUpdateExamRoutines) return;
    const next = examRoutines.map((r) =>
      r.id === activeRoutine.id
        ? { ...r, slots: r.slots.filter((s) => s.id !== slotId) }
        : r
    );
    onUpdateExamRoutines(next);
  };

  const handlePublish = () => {
    if (!activeRoutine || !onUpdateExamRoutines) return;
    const res = publishExamRoutine(activeRoutine, schoolRoutines, actorName);
    if (!res.ok || !res.routine) {
      setPublishConflicts(res.conflicts);
      setPublishMessage(b(res.errorBn ?? 'Publish ব্যর্থ', res.errorEn ?? 'Publish blocked', lang));
      return;
    }
    setPublishConflicts([]);
    setPublishMessage(b('পরীক্ষার রুটিন সফলভাবে প্রকাশিত হয়েছে ✓', 'Exam routine published cleanly ✓', lang));
    onUpdateExamRoutines(
      examRoutines.map((r) => (r.id === activeRoutine.id ? res.routine! : r)),
      `Published Exam Routine (${activeRoutine.className})`
    );
  };

  const handleExportCsv = () => {
    if (!activeRoutine) return;
    const csv = exportExamRoutineCsv(activeRoutine);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-routine-${activeRoutine.className}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5 text-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            {b('পরীক্ষার রুটিন ব্যবস্থাপনা (Exam Routine System)', 'Exam Routine Management System', lang)}
          </h2>
          <p className="text-slate-500">
            {b(
              'কক্ষ, সিট প্ল্যান, পরিদর্শক (Invigilator) ও কনফ্লিক্ট যাচাইসহ পরীক্ষার রুটিন তৈরি ও প্রকাশ।',
              'Create, validate conflicts (invigilator/room/class), approve & publish exam routines.',
              lang
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <select
            value={activeRoutine?.id ?? ''}
            onChange={(e) => {
              setActiveRoutineId(e.target.value);
              setPublishConflicts([]);
              setPublishMessage('');
            }}
            className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
          >
            {schoolRoutines.map((r) => (
              <option key={r.id} value={r.id}>
                {r.examTitleBn} · {r.className} ({r.section}) [{r.status}]
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Create New Exam Routine Bar */}
      {isAdmin && (
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-wrap items-end gap-2.5 no-print">
          <div>
            <label className="block text-[11px] font-semibold mb-1">{b('পরীক্ষা', 'Exam', lang)}</label>
            <select
              value={newExamId}
              onChange={(e) => setNewExamId(e.target.value)}
              className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.titleBn}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1">{b('শ্রেণি', 'Class', lang)}</label>
            <select
              value={newClass}
              onChange={(e) => setNewClass(e.target.value)}
              className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              {school.approvedClasses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1">{b('শাখা', 'Section', lang)}</label>
            <input
              type="text"
              value={newSection}
              onChange={(e) => setNewSection(e.target.value)}
              className="w-24 h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>
          <button
            type="button"
            onClick={handleCreateRoutine}
            className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {b('নতুন রুটিন তৈরি', 'New Routine Draft', lang)}
          </button>
        </div>
      )}

      {/* Conflict Alert Banner */}
      {(liveConflicts.length > 0 || publishConflicts.length > 0) && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {b('সময়সূচি / পরিদর্শক / কক্ষ কনফ্লিক্ট শনাক্ত হয়েছে (Publish অবরুদ্ধ):', 'Schedule Conflicts Detected (Publish Blocked):', lang)}
          </div>
          {(publishConflicts.length > 0 ? publishConflicts : liveConflicts).map((c, idx) => (
            <div key={idx} className="pl-5">• {b(c.messageBn, c.messageEn, lang)}</div>
          ))}
        </div>
      )}

      {publishMessage && liveConflicts.length === 0 && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{publishMessage}</span>
        </div>
      )}

      {/* Active Routine Slots Table */}
      {activeRoutine && (
        <>
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                  <th className="py-2.5 px-3">{b('তারিখ ও সময়', 'Date & Time', lang)}</th>
                  <th className="py-2.5 px-3">{b('বিষয়', 'Subject', lang)}</th>
                  <th className="py-2.5 px-3">{b('ধরন / পূর্ণমান', 'Type / Marks', lang)}</th>
                  <th className="py-2.5 px-3">{b('কক্ষ ও আসন বণ্টন', 'Room & Seats', lang)}</th>
                  <th className="py-2.5 px-3">{b('পরিদর্শক শিক্ষক', 'Invigilator', lang)}</th>
                  {isAdmin && <th className="py-2.5 px-3 text-right no-print">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeRoutine.slots.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      {b('নিচ থেকে পরীক্ষার বিষয় ও সময়সূচি যুক্ত করুন।', 'Add exam subjects & invigilators below.', lang)}
                    </td>
                  </tr>
                ) : (
                  activeRoutine.slots.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2.5 px-3 font-mono font-semibold">{s.examDate} · {s.startTime}–{s.endTime}</td>
                      <td className="py-2.5 px-3 font-bold">{b(s.subjectBn, s.subjectEn, lang)}</td>
                      <td className="py-2.5 px-3">{s.examType} · {s.fullMarks}</td>
                      <td className="py-2.5 px-3">{s.room} ({s.seatAllocation})</td>
                      <td className="py-2.5 px-3">{s.invigilatorTeacherName}</td>
                      {isAdmin && (
                        <td className="py-2.5 px-3 text-right no-print">
                          <button
                            type="button"
                            onClick={() => handleDeleteSlot(s.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {isAdmin && (
            <form onSubmit={handleAddSlot} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3 no-print">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                {b('নতুন পরীক্ষার স্লট যুক্ত করুন', 'Add Exam Slot', lang)}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <input type="text" value={subjectBn} onChange={(e) => setSubjectBn(e.target.value)} placeholder="Subject (BN)" className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
                <input type="text" value={subjectEn} onChange={(e) => setSubjectEn(e.target.value)} placeholder="Subject (EN)" className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
                <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono" />
                <div className="flex gap-1">
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="flex-1 h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono" />
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="flex-1 h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono" />
                </div>
                <input type="text" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Room" className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
                <input type="text" value={seatAllocation} onChange={(e) => setSeatAllocation(e.target.value)} placeholder="Seat Allocation" className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
                <select value={invigilatorId} onChange={(e) => setInvigilatorId(e.target.value)} className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  {schoolTeachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.nameBn}</option>
                  ))}
                </select>
                <div className="flex gap-1">
                  <select value={examType} onChange={(e) => setExamType(e.target.value as ExamRoutineSlot['examType'])} className="flex-1 h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <option value="Written">Written</option>
                    <option value="MCQ">MCQ</option>
                    <option value="Oral">Oral</option>
                    <option value="Practical">Practical</option>
                  </select>
                  <input type="number" value={fullMarks} onChange={(e) => setFullMarks(Number(e.target.value))} className="w-16 h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
                </div>
              </div>
              <div className="flex flex-wrap justify-between items-center gap-2">
                <button type="submit" className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg border border-blue-300 text-blue-700 dark:text-blue-300 font-semibold cursor-pointer">
                  <Plus className="w-3.5 h-3.5" />
                  {b('স্লট যুক্ত করুন', 'Add Slot', lang)}
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {b('কনফ্লিক্ট চেক ও Publish করুন', 'Check Conflicts & Publish', lang)}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
};
