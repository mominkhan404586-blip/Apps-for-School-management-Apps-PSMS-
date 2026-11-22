import React from 'react';
import { BookOpen, Clock, Radio } from 'lucide-react';
import type { ClassworkItem, CurriculumUnit, Language, RoutineSlot, StudentRecord } from '../types';
import { b } from '../i18n/translations';

export const StudentLiveClassBanner: React.FC<{
  lang: Language;
  student: StudentRecord;
  routineSlots: RoutineSlot[];
}> = ({ lang, student, routineSlots }) => {
  const liveSlot = routineSlots.find(
    (s) => s.status === 'in_progress' && s.className === student.className
  );
  const nextSlot = routineSlots.find(
    (s) => s.status === 'pending' && s.className === student.className
  );
  const completedCount = routineSlots.filter(
    (s) => s.status === 'completed' && s.className === student.className
  ).length;
  const remainingCount = routineSlots.filter(
    (s) => s.status === 'pending' && s.className === student.className
  ).length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
          <Radio className={`w-4 h-4 ${liveSlot ? 'text-red-600' : 'text-slate-400'}`} />
          <span>
            {liveSlot
              ? b('🔴 LIVE NOW — আপনার চলমান ক্লাস', 'LIVE NOW — Current Class Status', lang)
              : b('আজকের ক্লাস স্টেটাস', "Today's Class Status", lang)}
          </span>
        </div>
        <div className="text-slate-500 tabular-nums">
          {b('সম্পন্ন:', 'Completed:', lang)} {completedCount} · {b('বাকি:', 'Remaining:', lang)} {remainingCount}
        </div>
      </div>

      {liveSlot ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3.5">
          <div>
            <div className="text-slate-500">{b('শ্রেণি ও বিষয়', 'Class & Subject', lang)}</div>
            <div className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
              {liveSlot.className} ({liveSlot.section}) · {b(liveSlot.subjectBn, liveSlot.subjectEn, lang)}
            </div>
          </div>
          <div>
            <div className="text-slate-500">{b('শিক্ষক', 'Teacher', lang)}</div>
            <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
              {liveSlot.substituteTeacher ?? liveSlot.teacherName}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Room</div>
            <div className="font-mono font-bold text-blue-700 dark:text-blue-400 mt-0.5">
              Room {liveSlot.room}
            </div>
          </div>
          <div>
            <div className="text-slate-500">{b('সময়সূচি', 'Session Time', lang)}</div>
            <div className="font-mono font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
              Started: {liveSlot.startedAt ?? liveSlot.timeRange.split('–')[0]?.trim()} · {liveSlot.timeRange}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-slate-500 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {nextSlot
            ? b(
                `পরবর্তী ক্লাস: ${nextSlot.subjectBn} (${nextSlot.timeRange}) — Room ${nextSlot.room}`,
                `Next Class: ${nextSlot.subjectEn} (${nextSlot.timeRange}) — Room ${nextSlot.room}`,
                lang
              )
            : b('আজকের সকল নির্ধারিত ক্লাস সম্পন্ন হয়েছে।', 'All classes for today have completed.', lang)}
        </div>
      )}
    </div>
  );
};

export const ParentLiveClassAndDailyStudyWidget: React.FC<{
  lang: Language;
  child: StudentRecord;
  routineSlots: RoutineSlot[];
  classworks: ClassworkItem[];
  curriculumUnits: CurriculumUnit[];
}> = ({ lang, child, routineSlots, classworks, curriculumUnits }) => {
  const childSlots = routineSlots.filter((s) => s.className === child.className);
  const liveSlot = childSlots.find((s) => s.status === 'in_progress');
  const nextSlot = childSlots.find((s) => s.status === 'pending');

  // Privacy-safe Daily Study items derived from status, homework & completed curriculum (no teacher private notes!)
  const dailyStudyRows = [
    ...childSlots.slice(0, 3).map((slot) => ({
      id: slot.id,
      subject: b(slot.subjectBn, slot.subjectEn, lang),
      summary:
        slot.homeworkText
          ? b(`Homework Assigned — ${slot.homeworkText}`, `Homework Assigned — ${slot.homeworkText}`, lang)
          : slot.status === 'completed'
            ? b(`পাঠ সম্পন্ন: ${slot.lessonTopic ?? 'অধ্যায় সম্পন্ন'}`, `Completed: ${slot.lessonTopic ?? 'Lesson Completed'}`, lang)
            : slot.status === 'in_progress'
              ? b('ক্লাস চলছে (Classwork চলমান)', 'Live Class in Progress', lang)
              : b('আজকের ক্লাস নির্ধারিত', 'Scheduled Today', lang),
    })),
    ...classworks
      .filter((cw) => cw.className === child.className)
      .slice(0, 2)
      .map((cw) => ({
        id: cw.id,
        subject: b(cw.subjectBn, cw.subjectEn, lang),
        summary: b(`Classwork — ${cw.titleBn}`, `Classwork — ${cw.titleEn}`, lang),
      })),
    ...curriculumUnits.slice(0, 1).map((cu) => ({
      id: cu.id,
      subject: b(cu.subjectBn, cu.subjectEn, lang),
      summary: b(`অধ্যায় ${cu.completedChapters}/${cu.totalChapters} সম্পন্ন`, `Chapter ${cu.completedChapters}/${cu.totalChapters} Completed`, lang),
    })),
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
      {/* Parent Live Status (Privacy-Safe Status Only) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Radio className={`w-4 h-4 ${liveSlot ? 'text-emerald-600' : 'text-slate-400'}`} />
            {liveSlot
              ? b("🟢 আপনার সন্তানের ক্লাস এখন চলছে", "Your Child's Class is Running Now", lang)
              : b("আজকের ক্লাস অবস্থা (Today → Next → Completed)", "Child's Class Status Today", lang)}
          </h2>
          <span className="text-[11px] text-slate-400">{b('শুধুমাত্র স্ট্যাটাস', 'Status Only', lang)}</span>
        </div>

        {liveSlot ? (
          <div className="p-3.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              Class: {liveSlot.className} ({liveSlot.section}) · Subject: {b(liveSlot.subjectBn, liveSlot.subjectEn, lang)}
            </div>
            <div className="text-slate-700 dark:text-slate-300">
              {b('শিক্ষক:', 'Teacher:', lang)} {liveSlot.substituteTeacher ?? liveSlot.teacherName} · Room {liveSlot.room}
            </div>
            <div className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
              Time: {liveSlot.timeRange}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
            {nextSlot
              ? b(
                  `পরবর্তী ক্লাস: ${nextSlot.subjectBn} (${nextSlot.timeRange}) · শিক্ষক: ${nextSlot.teacherName}`,
                  `Next Class: ${nextSlot.subjectEn} (${nextSlot.timeRange}) · Teacher: ${nextSlot.teacherName}`,
                  lang
                )
              : b('আজকের সকল ক্লাস সম্পন্ন হয়েছে।', 'All classes completed for today.', lang)}
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span>{b('সম্পন্ন:', 'Completed:', lang)} {childSlots.filter((s) => s.status === 'completed').length}</span>
          <span>{b('চলমান:', 'Live:', lang)} {liveSlot ? 1 : 0}</span>
          <span>{b('বাকি:', 'Remaining:', lang)} {childSlots.filter((s) => s.status === 'pending').length}</span>
        </div>
      </div>

      {/* Parent Daily Study Summary */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
            <span>{b('আজ আপনার সন্তানের পড়াশোনা (Parent Daily Study)', "Today's Child Study Summary", lang)}</span>
          </h2>
          <span className="text-[11px] text-slate-500 whitespace-nowrap shrink-0">{child.className}</span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {dailyStudyRows.slice(0, 4).map((row) => (
            <div key={row.id} className="py-2 flex items-start justify-between gap-2">
              <span className="font-bold text-slate-900 dark:text-white shrink-0">{row.subject}</span>
              <span className="text-slate-600 dark:text-slate-300 text-right">{row.summary}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
