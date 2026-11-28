import React, { useMemo, useState } from 'react';
import { ArrowUpRight, CheckCircle2, GraduationCap, History, ShieldAlert, UserMinus } from 'lucide-react';
import type { Language, PromotionReleaseHistoryEntry, StudentRecord } from '../types';
import { b } from '../i18n/translations';
import {
  executeBulkClassPromotion,
  executeBulkClassRelease,
  getNextClassName,
} from '../utils/promotionReleaseEngine';
import { SETUP_CLASS_RANGE_1_TO_10 } from '../utils/centralSubjectAndStructureEngine';

export interface ClassPromotionReleasePanelProps {
  lang: Language;
  schoolId: string;
  actorName: string;
  students: StudentRecord[];
  history: PromotionReleaseHistoryEntry[];
  onCommitPromotionOrRelease: (
    nextStudents: StudentRecord[],
    historyEntry: PromotionReleaseHistoryEntry
  ) => void;
}

export const ClassPromotionReleasePanel: React.FC<ClassPromotionReleasePanelProps> = ({
  lang,
  schoolId,
  actorName,
  students,
  history,
  onCommitPromotionOrRelease,
}) => {
  const [sourceAcademicYear, setSourceAcademicYear] = useState('২০২৬');
  const [targetAcademicYear, setTargetAcademicYear] = useState('২০২৭');
  const [sourceClassName, setSourceClassName] = useState<string>('Class 4');
  const [targetClassName, setTargetClassName] = useState<string>(getNextClassName('Class 4'));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmMode, setConfirmMode] = useState<'promote' | 'release' | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

  const classStudents = useMemo(
    () =>
      students.filter(
        (s) =>
          (!schoolId || s.schoolId === schoolId) &&
          s.className === sourceClassName &&
          s.enrollmentStatus !== 'released'
      ),
    [students, schoolId, sourceClassName]
  );

  const schoolHistory = history.filter((h) => !schoolId || h.schoolId === schoolId);

  const handleClassFilterChange = (cls: string) => {
    setSourceClassName(cls);
    setTargetClassName(getNextClassName(cls));
    setSelectedIds([]);
  };

  const toggleAll = () => {
    if (selectedIds.length === classStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(classStudents.map((s) => s.id));
    }
  };

  const handleConfirmExecute = () => {
    if (!confirmMode) return;
    if (confirmMode === 'promote') {
      const res = executeBulkClassPromotion({
        students,
        studentIds: selectedIds,
        schoolId,
        sourceAcademicYear,
        targetAcademicYear,
        sourceClassName,
        targetClassName,
        actorName,
        note: actionNote.trim() || undefined,
      });
      if (!res.ok || !res.historyEntry) {
        setBanner({ ok: false, text: (lang === 'bn' ? res.errorBn : res.errorEn) || 'Error' });
        setConfirmMode(null);
        return;
      }
      onCommitPromotionOrRelease(res.students, res.historyEntry);
      setBanner({
        ok: true,
        text: b(
          `${res.promotedCount} জন শিক্ষার্থীকে ${sourceClassName} থেকে ${targetClassName} (${targetAcademicYear})-এ প্রমোশন দেওয়া হয়েছে। পূর্ববর্তী বছরের রেকর্ড সংরক্ষিত আছে।`,
          `Promoted ${res.promotedCount} students from ${sourceClassName} to ${targetClassName} (${targetAcademicYear}) with historical snapshots preserved.`,
          lang
        ),
      });
    } else {
      const res = executeBulkClassRelease({
        students,
        studentIds: selectedIds,
        schoolId,
        sourceAcademicYear,
        sourceClassName,
        actorName,
        note: actionNote.trim() || undefined,
      });
      if (!res.ok || !res.historyEntry) {
        setBanner({ ok: false, text: (lang === 'bn' ? res.errorBn : res.errorEn) || 'Error' });
        setConfirmMode(null);
        return;
      }
      onCommitPromotionOrRelease(res.students, res.historyEntry);
      setBanner({
        ok: true,
        text: b(
          `${res.releasedCount} জন শিক্ষার্থীকে রিলিজ করা হয়েছে। তাদের সকল ফলাফল ও হাজিরা রেকর্ড স্থায়ীভাবে সংরক্ষিত আছে।`,
          `Released ${res.releasedCount} students while preserving all historical attendance and exam records.`,
          lang
        ),
      });
    }
    setSelectedIds([]);
    setActionNote('');
    setConfirmMode(null);
  };

  if (!schoolId) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-500">
        {b(
          'Class Promotion & Release পরিচালনার জন্য অনুগ্রহ করে একটি বিদ্যালয় নির্বাচন করুন।',
          'Please select or register a school to manage Class Promotion & Release.',
          lang
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 text-xs">
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              {b('Class Promotion & Release (শ্রেণি উত্তীর্ণ ও সমাপন)', 'Class Promotion & Release', lang)}
            </h2>
            <p className="text-slate-500 mt-0.5">
              {b(
                'বছর শেষে নির্ধারিত শ্রেণি বা নির্বাচিত শিক্ষার্থীদের পরবর্তী শ্রেণিতে উন্নীত করুন অথবা পূর্ববর্তী রেকর্ড অক্ষুণ্ণ রেখে Release করুন।',
                'Bulk promote students to the next class/year or mark completed students as released without deleting historical data.',
                lang
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {b('বর্তমান শিক্ষাবর্ষ', 'Source Academic Year', lang)}
            </label>
            <input
              type="text"
              value={sourceAcademicYear}
              onChange={(e) => setSourceAcademicYear(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {b('উৎস শ্রেণি', 'Source Class', lang)}
            </label>
            <select
              value={sourceClassName}
              onChange={(e) => handleClassFilterChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              {['Pre-Primary', ...SETUP_CLASS_RANGE_1_TO_10].map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {b('পরবর্তী শিক্ষাবর্ষ', 'Target Academic Year', lang)}
            </label>
            <input
              type="text"
              value={targetAcademicYear}
              onChange={(e) => setTargetAcademicYear(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {b('পরবর্তী শ্রেণি', 'Target Class', lang)}
            </label>
            <input
              type="text"
              value={targetClassName}
              onChange={(e) => setTargetClassName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
        </div>

        {banner && (
          <div
            className={`p-3 rounded-xl border flex items-center gap-2 ${
              banner.ok
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{banner.text}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleAll}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
            >
              {selectedIds.length === classStudents.length && classStudents.length > 0
                ? b('সব অনির্বাচিত করুন', 'Deselect All', lang)
                : b(`সবাইকে নির্বাচন (${classStudents.length})`, `Select All (${classStudents.length})`, lang)}
            </button>
            <span className="font-mono tabular-nums text-slate-500">
              {b('নির্বাচিত:', 'Selected:', lang)} {selectedIds.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="bulk-promote-btn"
              disabled={selectedIds.length === 0}
              onClick={() => setConfirmMode('promote')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              {b('Bulk Promote (উত্তীর্ণ)', 'Bulk Promote', lang)}
            </button>
            <button
              type="button"
              data-testid="bulk-release-btn"
              disabled={selectedIds.length === 0}
              onClick={() => setConfirmMode('release')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold cursor-pointer"
            >
              <UserMinus className="w-4 h-4" />
              {b('Bulk Release (সমাপন/রিলিজ)', 'Bulk Release', lang)}
            </button>
          </div>
        </div>

        {classStudents.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500">
            {b(
              `${sourceClassName}-এ প্রমোশন বা রিলিজ করার মতো কোনো সক্রিয় শিক্ষার্থী নেই।`,
              `No active students found in ${sourceClassName}.`,
              lang
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {classStudents.map((st) => {
              const checked = selectedIds.includes(st.id);
              return (
                <label
                  key={st.id}
                  className="px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedIds((prev) =>
                          checked ? prev.filter((id) => id !== st.id) : [...prev, st.id]
                        )
                      }
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {st.nameBn} ({st.nameEn})
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {st.permanentId} · {st.className} ({st.section}) · Roll #{st.roll}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-slate-500">
                    GPA: {st.gpa} · {st.attendancePct}%
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </section>

      {confirmMode && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              {confirmMode === 'promote'
                ? b('Bulk Promote নিশ্চিতকরণ', 'Confirm Bulk Promotion', lang)
                : b('Bulk Release নিশ্চিতকরণ', 'Confirm Bulk Release', lang)}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {confirmMode === 'promote'
                ? b(
                    `আপনি ${selectedIds.length} জন শিক্ষার্থীকে ${sourceClassName} (${sourceAcademicYear}) থেকে ${targetClassName} (${targetAcademicYear})-এ উন্নীত করতে যাচ্ছেন। পূর্ববর্তী বছরের স্ন্যাপশট সংরক্ষিত থাকবে।`,
                    `You are about to promote ${selectedIds.length} students from ${sourceClassName} (${sourceAcademicYear}) to ${targetClassName} (${targetAcademicYear}). Historical year snapshots will be preserved.`,
                    lang
                  )
                : b(
                    `আপনি ${selectedIds.length} জন শিক্ষার্থীকে ${sourceClassName} থেকে রিলিজ করতে যাচ্ছেন। কোনো রেকর্ড মুছে ফেলা হবে না—পূর্ববর্তী সকল হাজিরা ও ফলাফল সংরক্ষিত থাকবে।`,
                    `You are about to mark ${selectedIds.length} students from ${sourceClassName} as released. All historical records remain preserved.`,
                    lang
                  )}
            </p>
            <input
              type="text"
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder={b('মন্তব্য (ঐচ্ছিক)', 'Optional audit note', lang)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmMode(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
              >
                {b('বাতিল', 'Cancel', lang)}
              </button>
              <button
                type="button"
                data-testid="confirm-promotion-release-btn"
                onClick={handleConfirmExecute}
                className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
              >
                {b('নিশ্চিত করুন', 'Confirm Action', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit History Log */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600" />
          {b('Promotion & Release অডিট হিস্ট্রি', 'Promotion & Release Audit History', lang)}
        </h3>
        {schoolHistory.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500">
            {b('এখনো কোনো প্রমোশন বা রিলিজ সম্পন্ন হয়নি।', 'No promotion or release logs recorded yet.', lang)}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {schoolHistory.map((h) => (
              <div key={h.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {h.actionType === 'promote' ? 'Promoted' : 'Released'} · {h.studentNames.length}{' '}
                    {b('জন শিক্ষার্থী', 'Students', lang)}
                  </span>
                  <div className="text-[11px] text-slate-500">
                    {h.sourceClassName} ({h.sourceAcademicYear})
                    {h.targetClassName ? ` → ${h.targetClassName} (${h.targetAcademicYear})` : ''} ·{' '}
                    {h.actorName}
                  </div>
                </div>
                <span className="font-mono text-[11px] text-slate-500">
                  {h.timestamp.slice(0, 16).replace('T', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
