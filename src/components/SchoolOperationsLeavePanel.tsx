import React, { useMemo, useState } from 'react';
import {
  CalendarOff,
  CheckCircle2,
  ClipboardList,
  Clock,
  Play,
  PowerOff,
  RotateCcw,
  UserCheck,
  XCircle,
} from 'lucide-react';
import type {
  ExamRoutineRecord,
  HolidayPlanRecord,
  Language,
  Role,
  SchoolDailyOperationsState,
  SchoolRecord,
  TeacherLeaveRecord,
  TeacherRecord,
} from '../types';
import { b } from '../i18n/translations';
import {
  createTeacherLeaveRequest,
  decideTeacherEarlyReturn,
  decideTeacherLeave,
  endTodaysClassesEarly,
  requestTeacherEarlyReturn,
  resolveSchoolLiveTeachingStatus,
  startSchoolDay,
} from '../utils/schoolOperationsAndScheduleEngine';

export interface SchoolOperationsLeavePanelProps {
  lang: Language;
  role: Role;
  schoolId: string;
  school?: SchoolRecord;
  actorName: string;
  currentTeacher?: TeacherRecord;
  dailyOps: SchoolDailyOperationsState[];
  holidays: HolidayPlanRecord[];
  teacherLeaves: TeacherLeaveRecord[];
  examRoutines: ExamRoutineRecord[];
  onChangeDailyOps: (next: SchoolDailyOperationsState[]) => void;
  onChangeHolidays: (next: HolidayPlanRecord[]) => void;
  onChangeTeacherLeaves: (next: TeacherLeaveRecord[]) => void;
}

export const SchoolOperationsLeavePanel: React.FC<SchoolOperationsLeavePanelProps> = ({
  lang,
  role,
  schoolId,
  school,
  actorName,
  currentTeacher,
  dailyOps,
  holidays,
  teacherLeaves,
  examRoutines,
  onChangeDailyOps,
  onChangeHolidays,
  onChangeTeacherLeaves,
}) => {
  const nowIso = new Date().toISOString();
  const todayIso = nowIso.slice(0, 10);
  const currentTimeText = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const [holidayNameBn, setHolidayNameBn] = useState('');
  const [holidayStart, setHolidayStart] = useState(`${todayIso}T00:00`);
  const [holidayEnd, setHolidayEnd] = useState(`${todayIso}T23:59`);
  const [holidayNote, setHolidayNote] = useState('');

  const [leaveStart, setLeaveStart] = useState(`${todayIso}T09:00`);
  const [leaveEnd, setLeaveEnd] = useState(`${todayIso}T16:00`);
  const [leaveReason, setLeaveReason] = useState('');
  const [earlyReturnReasonMap, setEarlyReturnReasonMap] = useState<Record<string, string>>({});

  const liveStatus = useMemo(
    () =>
      resolveSchoolLiveTeachingStatus({
        schoolId,
        nowIso,
        dailyOps,
        holidays,
        examRoutines,
      }),
    [schoolId, nowIso, dailyOps, holidays, examRoutines]
  );

  const schoolHolidays = holidays.filter((h) => h.schoolId === schoolId);
  const schoolLeaves = teacherLeaves.filter((lv) => lv.schoolId === schoolId);
  const examDuties = examRoutines
    .filter((r) => r.schoolId === schoolId)
    .flatMap((r) =>
      r.slots.map((sl) => ({
        id: `${r.id}-${sl.id}`,
        examTitleBn: r.examTitleBn,
        className: r.className,
        subjectBn: sl.subjectBn,
        examDate: sl.examDate,
        startTime: sl.startTime,
        endTime: sl.endTime,
        room: sl.room,
        invigilator: sl.invigilatorTeacherName || b('নির্ধারিত নয়', 'Unassigned', lang),
      }))
    );

  const isSchoolAdmin = role === 'school_admin' || role === 'central_admin';

  if (!schoolId) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-500">
        {b(
          'দৈনিক স্কুল কার্যক্রম ও ছুটি ব্যবস্থাপনার জন্য অনুগ্রহ করে একটি নিবন্ধিত বিদ্যালয় নির্বাচন বা নিবন্ধন করুন।',
          'Please register or select a school to manage daily operations and leave workflows.',
          lang
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Live Operations & Head Teacher Control */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              {b('বিদ্যালয় শুরু, ছুটি ও লাইভ অবস্থা', 'School Daily Operations & Live Status', lang)}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {school?.nameBn} ·{' '}
              {b(
                'জরুরি ছুটি বা ক্লাস শেষেও নোটিশ, মেসেজ ও প্রশাসনিক ফিচার সচল থাকবে।',
                'Notices, messaging, and admin tools remain active even when classes end early or during holidays.',
                lang
              )}
            </p>
          </div>

          <div
            data-testid="school-live-status-banner"
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold ${
              liveStatus.status === 'running'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
                : liveStatus.status === 'exam_running'
                  ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300'
                  : liveStatus.status === 'holiday' || liveStatus.status === 'ended_early'
                    ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300'
                    : 'bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'
            }`}
          >
            {lang === 'bn' ? liveStatus.labelBn : liveStatus.labelEn}
          </div>
        </div>

        {isSchoolAdmin && (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              data-testid="start-school-day-btn"
              onClick={() =>
                onChangeDailyOps(
                  startSchoolDay(dailyOps, schoolId, todayIso, actorName, currentTimeText)
                )
              }
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
            >
              <Play className="w-4 h-4" />
              {b('স্কুল শুরু করুন', 'Start School Day', lang)}
            </button>
            <button
              type="button"
              data-testid="end-classes-early-btn"
              onClick={() =>
                onChangeDailyOps(
                  endTodaysClassesEarly(dailyOps, schoolId, todayIso, actorName, currentTimeText)
                )
              }
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
            >
              <PowerOff className="w-4 h-4" />
              {b('আজকের ক্লাস ছুটি দিন', "End Today's Classes", lang)}
            </button>
          </div>
        )}
      </section>

      {/* Long-Term Holiday Planner */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarOff className="w-4 h-4 text-rose-600" />
            {b('দীর্ঘমেয়াদি ছুটি পরিকল্পনা (স্বয়ংক্রিয় পুনরায় চালু)', 'Long-Term Holiday Planner (Auto-Resume)', lang)}
          </h3>
        </div>

        {isSchoolAdmin && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!holidayNameBn.trim() || !holidayStart || !holidayEnd) return;
              const rec: HolidayPlanRecord = {
                id: `hol-${Date.now()}`,
                schoolId,
                nameBn: holidayNameBn.trim(),
                startDateTime: holidayStart,
                endDateTime: holidayEnd,
                note: holidayNote.trim() || undefined,
                autoResume: true,
                createdBy: actorName,
                createdAt: nowIso,
              };
              onChangeHolidays([rec, ...holidays]);
              setHolidayNameBn('');
              setHolidayNote('');
            }}
            className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
          >
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {b('ছুটির নাম', 'Holiday Title', lang)}
              </label>
              <input
                type="text"
                required
                value={holidayNameBn}
                onChange={(e) => setHolidayNameBn(e.target.value)}
                placeholder={b('যেমন: ঈদ / শীতকালীন ছুটি', 'e.g. Winter Vacation', lang)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {b('শুরু (তারিখ ও সময়)', 'Start Date & Time', lang)}
              </label>
              <input
                type="datetime-local"
                required
                value={holidayStart}
                onChange={(e) => setHolidayStart(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {b('শেষ (স্বয়ংক্রিয় চালু হবে)', 'End Date & Time (Auto-Resume)', lang)}
              </label>
              <input
                type="datetime-local"
                required
                value={holidayEnd}
                onChange={(e) => setHolidayEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-emerald-700 text-white font-semibold cursor-pointer"
            >
              {b('ছুটি সংরক্ষণ করুন', 'Schedule Holiday', lang)}
            </button>
          </form>
        )}

        {schoolHolidays.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500">
            {b('কোনো দীর্ঘমেয়াদি ছুটি নির্ধারিত নেই।', 'No long-term holidays scheduled.', lang)}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
            {schoolHolidays.map((h) => (
              <div key={h.id} className="p-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{h.nameBn}</div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {h.startDateTime.replace('T', ' ')} → {h.endDateTime.replace('T', ' ')} ·{' '}
                    {h.manualOverrideInactive
                      ? b('ম্যানুয়ালি সমাপ্ত', 'Ended Early', lang)
                      : b('সময় শেষে স্বয়ংক্রিয় ক্লাস চালু', 'Auto-Resume Enabled', lang)}
                  </div>
                </div>
                {isSchoolAdmin && (
                  <button
                    type="button"
                    onClick={() =>
                      onChangeHolidays(
                        holidays.map((item) =>
                          item.id === h.id
                            ? { ...item, manualOverrideInactive: !item.manualOverrideInactive }
                            : item
                        )
                      )
                    }
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
                  >
                    {h.manualOverrideInactive
                      ? b('পুনরায় সক্রিয়', 'Re-enable', lang)
                      : b('ছুটি সমাপ্ত করুন', 'End Holiday Now', lang)}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Teacher Leave & Early Return Approval */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-blue-600" />
          {b('শিক্ষকের ছুটি ও আগাম যোগদান (Early Return) অনুমোদন', 'Teacher Leave & Early Return Workflow', lang)}
        </h3>

        {role === 'teacher' && currentTeacher && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!leaveReason.trim()) return;
              const rec = createTeacherLeaveRequest({
                schoolId,
                teacherId: currentTeacher.id,
                teacherName: currentTeacher.nameBn,
                startDateTime: leaveStart,
                endDateTime: leaveEnd,
                reason: leaveReason,
              });
              onChangeTeacherLeaves([rec, ...teacherLeaves]);
              setLeaveReason('');
            }}
            className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800"
          >
            <div>
              <label className="block font-semibold mb-1">{b('ছুটি শুরু', 'Start', lang)}</label>
              <input
                type="datetime-local"
                value={leaveStart}
                onChange={(e) => setLeaveStart(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('ছুটি শেষ', 'End', lang)}</label>
              <input
                type="datetime-local"
                value={leaveEnd}
                onChange={(e) => setLeaveEnd(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('কারণ', 'Reason', lang)}</label>
              <input
                type="text"
                required
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder={b('ছুটির কারণ লিখুন', 'Enter leave reason', lang)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
            >
              {b('ছুটির আবেদন পাঠান', 'Submit Leave Request', lang)}
            </button>
          </form>
        )}

        {schoolLeaves.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500">
            {b('কোনো শিক্ষক ছুটির আবেদন নেই।', 'No teacher leave requests recorded.', lang)}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
            {schoolLeaves.map((lv) => (
              <div key={lv.id} className="p-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{lv.teacherName}</span>
                    <span className="text-slate-500"> · {lv.reason}</span>
                    <div className="text-[11px] font-mono text-slate-500">
                      {lv.startDateTime.replace('T', ' ')} → {lv.endDateTime.replace('T', ' ')} · Status: {lv.status}
                      {lv.earlyReturnRequested ? ` · Early Return: ${lv.earlyReturnStatus}` : ''}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isSchoolAdmin && lv.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            onChangeTeacherLeaves(decideTeacherLeave(teacherLeaves, lv.id, 'approved', actorName))
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {b('অনুমোদন', 'Approve', lang)}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onChangeTeacherLeaves(decideTeacherLeave(teacherLeaves, lv.id, 'rejected', actorName))
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          {b('প্রত্যাখ্যান', 'Reject', lang)}
                        </button>
                      </>
                    )}
                    {isSchoolAdmin && lv.earlyReturnRequested && lv.earlyReturnStatus === 'pending' && (
                      <button
                        type="button"
                        onClick={() =>
                          onChangeTeacherLeaves(decideTeacherEarlyReturn(teacherLeaves, lv.id, 'approved', actorName))
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {b('আগাম যোগদান অনুমোদন', 'Approve Early Return', lang)}
                      </button>
                    )}
                  </div>
                </div>

                {role === 'teacher' &&
                  currentTeacher?.id === lv.teacherId &&
                  lv.status === 'approved' &&
                  !lv.earlyReturnRequested && (
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={earlyReturnReasonMap[lv.id] ?? ''}
                        onChange={(e) =>
                          setEarlyReturnReasonMap((prev) => ({ ...prev, [lv.id]: e.target.value }))
                        }
                        placeholder={b('নির্ধারিত সময়ের আগে কাজে ফেরার কারণ', 'Reason for early return', lang)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          onChangeTeacherLeaves(
                            requestTeacherEarlyReturn(
                              teacherLeaves,
                              lv.id,
                              earlyReturnReasonMap[lv.id] || 'Early availability'
                            )
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-700 text-white font-semibold cursor-pointer"
                      >
                        {b('Early Return অনুরোধ', 'Request Early Return', lang)}
                      </button>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Unified Exam Duty Schedule */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 text-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-emerald-700" />
          {b('পরীক্ষার ডিউটি ও অটো ক্লাস বিরতি তালিকা', 'Exam Invigilation Duty & Auto Class Pause Schedule', lang)}
        </h3>
        {examDuties.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500">
            {b(
              'কোনো প্রকাশিত পরীক্ষার রুটিন নেই। পরীক্ষার রুটিন প্রকাশ করলে এখানে ডিউটি ও স্বয়ংক্রিয় ক্লাস বিরতির সময় দেখাবে।',
              'No published exam routines yet. Exam invigilation duties and auto-pause slots appear here once scheduled.',
              lang
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2 pr-3">{b('পরীক্ষা ও শ্রেণি', 'Exam & Class', lang)}</th>
                  <th className="py-2 pr-3">{b('বিষয়', 'Subject', lang)}</th>
                  <th className="py-2 pr-3">{b('তারিখ ও সময়', 'Date & Time', lang)}</th>
                  <th className="py-2 pr-3">{b('হল/রুম', 'Room', lang)}</th>
                  <th className="py-2">{b('পরিদর্শক (Invigilator)', 'Invigilator', lang)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {examDuties.map((d) => (
                  <tr key={d.id}>
                    <td className="py-2 pr-3 font-semibold text-slate-900 dark:text-white">
                      {d.examTitleBn} · {d.className}
                    </td>
                    <td className="py-2 pr-3">{d.subjectBn}</td>
                    <td className="py-2 pr-3 font-mono tabular-nums">
                      {d.examDate} ({d.startTime}–{d.endTime})
                    </td>
                    <td className="py-2 pr-3">{d.room || '—'}</td>
                    <td className="py-2 font-medium text-emerald-700 dark:text-emerald-400">{d.invigilator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
