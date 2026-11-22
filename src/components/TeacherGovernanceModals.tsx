import React, { useEffect, useState } from 'react';
import {
  Bell,
  Briefcase,
  CheckCircle2,
  Edit3,
  Info,
  Send,
  UserPlus,
  X,
} from 'lucide-react';
import type {
  Language,
  NoticeItem,
  SchoolRecord,
  TeacherApprovalCategory,
  TeacherRecord,
} from '../types';
import { ALL_CLASSES } from '../data/mockData';
import { b } from '../i18n/translations';
import {
  getTeacherCategoryMeta,
  TEACHER_APPROVAL_CATEGORIES,
  type TeacherEditPatch,
  type TeacherWorkflowActionPayload,
} from '../utils/teacherLifecycle';

// 1. Edit Teacher Information Modal
export const TeacherEditModal: React.FC<{
  teacher: TeacherRecord | null;
  lang: Language;
  onClose: () => void;
  onSave: (teacherId: string, patch: TeacherEditPatch) => void;
}> = ({ teacher, lang, onClose, onSave }) => {
  const [nameBn, setNameBn] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [designation, setDesignation] = useState('');
  const [qualification, setQualification] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [branchName, setBranchName] = useState('');
  const [specialDuty, setSpecialDuty] = useState('');
  const [subjectsText, setSubjectsText] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [performanceScore, setPerformanceScore] = useState(90);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!teacher) return;
    setNameBn(teacher.nameBn);
    setNameEn(teacher.nameEn);
    setDesignation(teacher.designation);
    setQualification(teacher.qualification);
    setJoiningDate(teacher.joiningDate);
    setMobile(teacher.mobile);
    setEmail(teacher.email ?? '');
    setBranchName(teacher.branchName ?? '');
    setSpecialDuty(teacher.specialDuty ?? '');
    setSubjectsText(teacher.subjects.join(', '));
    setSelectedClasses(teacher.assignedClasses);
    setPerformanceScore(teacher.performanceScore);
    setReason('');
    setError('');
  }, [teacher]);

  if (!teacher) return null;

  const toggleClass = (cls: string) => {
    setSelectedClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameBn.trim() || !designation.trim() || !mobile.trim()) {
      setError(
        b(
          'শিক্ষকের নাম, পদবি এবং মোবাইল নম্বর আবশ্যক।',
          'Teacher name, designation, and mobile number are required.',
          lang
        )
      );
      return;
    }
    const subjects = subjectsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    onSave(teacher.id, {
      nameBn,
      nameEn,
      designation,
      qualification,
      joiningDate,
      mobile,
      email,
      branchName,
      specialDuty,
      subjects: subjects.length > 0 ? subjects : teacher.subjects,
      assignedClasses: selectedClasses.length > 0 ? selectedClasses : teacher.assignedClasses,
      performanceScore,
      reason,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl"
      >
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {b('শিক্ষকের তথ্য সম্পাদনা (Edit Teacher Information)', 'Edit Teacher Information', lang)}
              </h3>
              <p className="text-xs text-slate-500">
                {teacher.nameBn} ({teacher.teacherCode}) · {teacher.schoolNameBn}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">{b('নাম (বাংলা) *', 'Name (Bangla) *', lang)}</label>
                <input
                  type="text"
                  value={nameBn}
                  onChange={(e) => setNameBn(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('নাম (ইংরেজি)', 'Name (English)', lang)}</label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('পদবি *', 'Designation *', lang)}</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('শিক্ষাগত যোগ্যতা', 'Qualification', lang)}</label>
                <input
                  type="text"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('মোবাইল নম্বর *', 'Mobile Number *', lang)}</label>
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('ইমেইল', 'Email', lang)}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('যোগদানের তারিখ', 'Joining Date', lang)}</label>
                <input
                  type="text"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('কর্মস্থল / শাখা', 'Workplace / Branch', lang)}</label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">{b('নির্ধারিত বিষয়সমূহ (কমা দিয়ে)', 'Subjects (comma-separated)', lang)}</label>
                <input
                  type="text"
                  value={subjectsText}
                  onChange={(e) => setSubjectsText(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('বিশেষ / অতিরিক্ত দায়িত্ব', 'Special Duty', lang)}</label>
                <input
                  type="text"
                  value={specialDuty}
                  onChange={(e) => setSpecialDuty(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1.5">{b('শ্রেণি বরাদ্দ (Assigned Classes)', 'Assigned Classes', lang)}</label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_CLASSES.map((cls) => {
                  const checked = selectedClasses.includes(cls);
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => toggleClass(cls)}
                      className={`px-2.5 py-1 rounded-md border font-semibold cursor-pointer ${
                        checked
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {cls}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1">{b('পারফরম্যান্স স্কোর (০-১০০)', 'Performance Score', lang)}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={performanceScore}
                  onChange={(e) => setPerformanceScore(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 tabular-nums"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">{b('সংশোধনের কারণ / অডিট নোট', 'Edit Reason / Audit Note', lang)}</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={b('যেমন: বার্ষিক রুটিন ও বিষয় হালনাগাদ', 'e.g. Updated subject allocation & profile details', lang)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="shrink-0 flex justify-end gap-2 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
              {b('বাতিল', 'Cancel', lang)}
            </button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white cursor-pointer">
              {b('তথ্য সংরক্ষণ করুন', 'Save Teacher Info', lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 2. Unified 18-Category Teacher Approval & Change Workflow Modal
export const TeacherWorkflowActionModal: React.FC<{
  teacher: TeacherRecord | null;
  initialCategory?: TeacherApprovalCategory;
  schools: SchoolRecord[];
  lang: Language;
  onClose: () => void;
  onSubmit: (teacherId: string, payload: TeacherWorkflowActionPayload) => void;
}> = ({ teacher, initialCategory = 'promotion_approval', schools, lang, onClose, onSubmit }) => {
  const [category, setCategory] = useState<TeacherApprovalCategory>(initialCategory);
  const [targetSchoolId, setTargetSchoolId] = useState('');
  const [newDesignation, setNewDesignation] = useState('');
  const [subjectsText, setSubjectsText] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [newJoiningDate, setNewJoiningDate] = useState('');
  const [newBranch, setNewBranch] = useState('');
  const [newDuty, setNewDuty] = useState('');
  const [leaveRange, setLeaveRange] = useState('2026-11-20 → 2026-12-05 (১৫ দিন)');
  const [retirementDate, setRetirementDate] = useState('2026-12-31');
  const [newMobile, setNewMobile] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newQualification, setNewQualification] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!teacher) return;
    setCategory(initialCategory);
    setTargetSchoolId(schools.find((s) => s.id !== teacher.schoolId)?.id ?? teacher.schoolId);
    setNewDesignation(teacher.designation);
    setSubjectsText(teacher.subjects.join(', '));
    setSelectedClasses(teacher.assignedClasses);
    setNewJoiningDate(teacher.joiningDate);
    setNewBranch(teacher.branchName ?? 'মূল ক্যাম্পাস');
    setNewDuty(teacher.specialDuty ?? '');
    setNewMobile(teacher.mobile);
    setNewEmail(teacher.email ?? '');
    setNewQualification(teacher.qualification);
    setReason('');
    setError('');
  }, [teacher, initialCategory, schools]);

  if (!teacher) return null;

  const meta = getTeacherCategoryMeta(category);
  const needsSchoolPicker =
    category === 'school_change' || category === 'transfer_approval' || category === 'other_school_joining';
  const needsDesignation = category === 'designation_change' || category === 'promotion_approval';
  const needsSubjects = category === 'subject_change' || category === 'class_subject_allocation';
  const needsClasses = category === 'class_subject_allocation';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError(b('অনুমোদন / পরিবর্তনের কারণ ও অডিট নোট লিখুন।', 'Please provide an approval reason / audit note.', lang));
      return;
    }
    const targetSchool = schools.find((s) => s.id === targetSchoolId);
    onSubmit(teacher.id, {
      category,
      targetSchoolId: needsSchoolPicker ? targetSchoolId : undefined,
      targetSchoolNameBn: needsSchoolPicker ? targetSchool?.nameBn : undefined,
      newDesignation: needsDesignation ? newDesignation : undefined,
      newSubjects: needsSubjects
        ? subjectsText.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
      newAssignedClasses: needsClasses ? selectedClasses : undefined,
      newJoiningDate: category === 'joining_date_correction' ? newJoiningDate : undefined,
      newBranch: category === 'workplace_branch_change' ? newBranch : undefined,
      newDuty: category === 'duty_change' ? newDuty : undefined,
      leaveRange: category === 'leave_absence_approval' ? leaveRange : undefined,
      retirementDate: category === 'retirement_approval' ? retirementDate : undefined,
      newMobile: category === 'important_info_change' ? newMobile : undefined,
      newEmail: category === 'important_info_change' ? newEmail : undefined,
      newQualification: category === 'important_info_change' ? newQualification : undefined,
      reason: reason.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl"
      >
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {b('শিক্ষক অনুমোদন ও পরিবর্তন কার্যক্রম (১৮টি ধাপ)', 'Teacher Approval & Governance Workflow', lang)}
              </h3>
              <p className="text-xs text-slate-500">
                {teacher.nameBn} ({teacher.teacherCode}) · {teacher.schoolNameBn}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block font-semibold mb-1">{b('কার্যক্রমের ধরন নির্বাচন করুন (১৮টি ক্যাটাগরি)', 'Select Approval / Change Category', lang)}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TeacherApprovalCategory)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              >
                {TEACHER_APPROVAL_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {b(c.labelBn, c.labelEn, lang)}
                  </option>
                ))}
              </select>
            </div>

            {/* How It Works Instruction Box */}
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-700 dark:text-blue-400" />
              <div>
                <div className="font-bold">{b('কিভাবে কাজ করবে (Workflow Instruction):', 'How This Step Works:', lang)}</div>
                <p className="mt-0.5">{b(meta.howItWorksBn, meta.howItWorksEn, lang)}</p>
              </div>
            </div>

            {needsSchoolPicker && (
              <div>
                <label className="block font-semibold mb-1">{b('গন্তব্য / নতুন বিদ্যালয় নির্বাচন করুন', 'Target / Destination School', lang)}</label>
                <select
                  value={targetSchoolId}
                  onChange={(e) => setTargetSchoolId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameBn} ({s.code} · {s.district})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {needsDesignation && (
              <div>
                <label className="block font-semibold mb-1">{b('নতুন পদবি / পদোন্নতি পদ', 'New Designation', lang)}</label>
                <input
                  type="text"
                  value={newDesignation}
                  onChange={(e) => setNewDesignation(e.target.value)}
                  placeholder={b('যেমন: সিনিয়র শিক্ষক (গণিত) বা সহকারী প্রধান শিক্ষক', 'e.g. Senior Teacher (Math)', lang)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            )}

            {needsSubjects && (
              <div>
                <label className="block font-semibold mb-1">{b('নতুন বিষয়সমূহ (কমা দিয়ে)', 'Subjects (comma-separated)', lang)}</label>
                <input
                  type="text"
                  value={subjectsText}
                  onChange={(e) => setSubjectsText(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            )}

            {needsClasses && (
              <div>
                <label className="block font-semibold mb-1.5">{b('শ্রেণি বরাদ্দ', 'Assigned Classes', lang)}</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_CLASSES.map((cls) => {
                    const active = selectedClasses.includes(cls);
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() =>
                          setSelectedClasses((prev) =>
                            prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
                          )
                        }
                        className={`px-2.5 py-1 rounded-md border font-semibold cursor-pointer ${
                          active
                            ? 'bg-blue-700 text-white border-blue-700'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {cls}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {category === 'joining_date_correction' && (
              <div>
                <label className="block font-semibold mb-1">{b('সংশোধিত যোগদানের তারিখ', 'Corrected Joining Date', lang)}</label>
                <input
                  type="date"
                  value={newJoiningDate}
                  onChange={(e) => setNewJoiningDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
            )}

            {category === 'workplace_branch_change' && (
              <div>
                <label className="block font-semibold mb-1">{b('নতুন কর্মস্থল / শাখা', 'New Branch / Shift', lang)}</label>
                <input
                  type="text"
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            )}

            {category === 'duty_change' && (
              <div>
                <label className="block font-semibold mb-1">{b('নতুন দায়িত্ব / অতিরিক্ত দায়িত্ব', 'New Duty / Responsibility', lang)}</label>
                <input
                  type="text"
                  value={newDuty}
                  onChange={(e) => setNewDuty(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            )}

            {category === 'leave_absence_approval' && (
              <div>
                <label className="block font-semibold mb-1">{b('ছুটি / অনুপস্থিতির সময়কাল', 'Leave / Absence Period', lang)}</label>
                <input
                  type="text"
                  value={leaveRange}
                  onChange={(e) => setLeaveRange(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            )}

            {category === 'retirement_approval' && (
              <div>
                <label className="block font-semibold mb-1">{b('অবসরের কার্যকর তারিখ', 'Effective Retirement Date', lang)}</label>
                <input
                  type="date"
                  value={retirementDate}
                  onChange={(e) => setRetirementDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
            )}

            {category === 'important_info_change' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{b('নতুন মোবাইল', 'Mobile', lang)}</label>
                  <input
                    type="text"
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('নতুন ইমেইল', 'Email', lang)}</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('সংশোধিত যোগ্যতা', 'Qualification', lang)}</label>
                  <input
                    type="text"
                    value={newQualification}
                    onChange={(e) => setNewQualification(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-semibold mb-1">{b('অনুমোদন / পরিবর্তনের কারণ ও নির্দেশনা *', 'Reason & Official Order Reference *', lang)}</label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={b('যেমন: অফিস আদেশ নং, যাচাইকৃত কারণ বা মন্তব্য লিখুন...', 'Enter official order ref, verified reason, or note...', lang)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="shrink-0 flex justify-end gap-2 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
              {b('বাতিল', 'Cancel', lang)}
            </button>
            <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {b('অনুমোদন ও সংরক্ষণ করুন', 'Approve & Apply Action', lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 3. Send Teacher Notice Modal
export const TeacherNoticeModal: React.FC<{
  teacher: TeacherRecord | null;
  lang: Language;
  onClose: () => void;
  onSend: (teacher: TeacherRecord, notice: NoticeItem) => void;
}> = ({ teacher, lang, onClose, onSend }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  if (!teacher) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    onSend(teacher, {
      id: `not-tch-${Date.now()}`,
      titleBn: title.trim(),
      titleEn: title.trim(),
      bodyBn: body.trim(),
      bodyEn: body.trim(),
      category: 'central',
      audience: 'teachers',
      date: 'এইমাত্র',
      schoolId: teacher.schoolId,
      author: 'কেন্দ্রীয় প্রশাসন (Central Admin)',
    });
    setTitle('');
    setBody('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div role="dialog" aria-modal="true" className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-sky-700 dark:text-sky-400" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {b('শিক্ষককে নোটিশ ও সতর্কবার্তা পাঠান', 'Send Notice to Teacher', lang)}
              </h3>
              <p className="text-xs text-slate-500">{teacher.nameBn} ({teacher.teacherCode}) · {teacher.schoolNameBn}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">{b('নোটিশের শিরোনাম *', 'Notice Subject *', lang)}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={b('যেমন: প্রশিক্ষণ কর্মশালায় উপস্থিতি বা সনদ যাচাই', 'e.g. Training workshop attendance or verification', lang)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('বিস্তারিত বার্তা *', 'Notice Message *', lang)}</label>
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={b('শিক্ষক ও সংশ্লিষ্ট স্কুল অ্যাডমিনের জন্য বার্তা লিখুন...', 'Message will notify Teacher and School Admin...', lang)}
                className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>
          <div className="shrink-0 flex justify-end gap-2 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
              {b('বাতিল', 'Cancel', lang)}
            </button>
            <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white cursor-pointer">
              <Send className="w-3.5 h-3.5" />
              {b('নোটিশ পাঠান', 'Send Notice', lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 4. New Teacher Registration Modal (Part A Personal Info & Documents Only -> Global Teacher ID)
import { registerTeacherPartA } from '../utils/adminAndTeacherIdentityEngine';

export const NewTeacherRegistrationModal: React.FC<{
  open: boolean;
  schools?: SchoolRecord[];
  existingTeachers?: TeacherRecord[];
  lang: Language;
  onClose: () => void;
  onRegister: (teacher: TeacherRecord) => void;
}> = ({ open, existingTeachers = [], lang, onClose, onRegister }) => {
  const [nameBn, setNameBn] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [dob, setDob] = useState('1994-03-15');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [nationality, setNationality] = useState('Bangladeshi');
  const [nidNumber, setNidNumber] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [presentAddress, setPresentAddress] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [docNid, setDocNid] = useState(true);
  const [docCert, setDocCert] = useState(true);
  const [docPhoto, setDocPhoto] = useState(true);
  const [error, setError] = useState('');
  const [createdTeacher, setCreatedTeacher] = useState<TeacherRecord | null>(null);

  if (!open) return null;

  const resetAndClose = () => {
    setCreatedTeacher(null);
    setNameBn('');
    setNameEn('');
    setNidNumber('');
    setMobile('');
    setEmail('');
    setPresentAddress('');
    setPermanentAddress('');
    setError('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const docs: string[] = [];
    if (docNid) docs.push('জাতীয়_পরিচয়পত্র_(NID).pdf');
    if (docCert) docs.push('শিক্ষাগত_সনদপত্র.pdf');
    if (docPhoto) docs.push('শিক্ষকের_ছবি.jpg');

    const result = registerTeacherPartA(existingTeachers, {
      nameBn,
      nameEn,
      dob,
      gender,
      nationality,
      nidNumber,
      mobile,
      email,
      presentAddress,
      permanentAddress,
      documents: docs,
    });

    if (!result.ok || !result.teacher) {
      setError(b(result.errorBn ?? 'তথ্য সঠিক নয়', result.errorEn ?? 'Invalid input', lang));
      return;
    }

    onRegister(result.teacher);
    setCreatedTeacher(result.teacher);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl"
      >
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {b('গ্লোবাল শিক্ষক নিবন্ধন (অংশ-ক: ব্যক্তিগত তথ্য ও ডকুমেন্ট)', 'Global Teacher Registration (Part A: Personal Info & Docs)', lang)}
              </h3>
              <p className="text-[11px] text-slate-500">
                {b(
                  'প্রাথমিক নিবন্ধনে কোনো বিদ্যালয় নির্বাচন নেই — আজীবন কার্যকর TCH-2026-XXXXXX আইডি পাবেন।',
                  'No school selection during Part A — generates your permanent Global Teacher ID (TCH-2026-XXXXXX).',
                  lang
                )}
              </p>
            </div>
          </div>
          <button type="button" onClick={resetAndClose} className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {createdTeacher ? (
          <div className="p-6 space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
              <div className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                ✅ {b('অংশ-ক নিবন্ধন সম্পন্ন ও গ্লোবাল টিচার আইডি তৈরি হয়েছে!', 'Part A Registration Complete — Global Teacher ID Generated!', lang)}
              </div>
              <div className="text-base font-mono font-bold text-slate-900 dark:text-white">
                Global Teacher ID: {createdTeacher.teacherCode}
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                {b(
                  'এখন লগইন করে Settings থেকে অংশ-খ (শিক্ষাগত যোগ্যতা ও অভিজ্ঞতা) পূরণ করুন এবং "বিদ্যালয়ে যোগদান" মেনু থেকে যেকোনো সক্রিয় বিদ্যালয়ে আবেদন করুন।',
                  'Next: Log in to complete Part B Professional Profile in Settings, then apply to join any active school.',
                  lang
                )}
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={resetAndClose}
                className="px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer"
              >
                {b('ঠিক আছে', 'Done', lang)}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 text-xs">
              {error && (
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{b('পূর্ণ নাম (বাংলা) *', 'Full Name (Bangla) *', lang)}</label>
                  <input
                    type="text"
                    required
                    value={nameBn}
                    onChange={(e) => setNameBn(e.target.value)}
                    placeholder={b('যেমন: মোঃ কামরুল ইসলাম', 'e.g. Md. Kamrul Islam', lang)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('পূর্ণ নাম (ইংরেজি)', 'Full Name (English)', lang)}</label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('জন্ম তারিখ *', 'Date of Birth *', lang)}</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('লিঙ্গ (Gender)', 'Gender', lang)}</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | 'Other')}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="Male">{b('পুরুষ (Male)', 'Male', lang)}</option>
                    <option value="Female">{b('নারী (Female)', 'Female', lang)}</option>
                    <option value="Other">{b('অন্যান্য (Other)', 'Other', lang)}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('জাতীয়তা (Nationality)', 'Nationality', lang)}</label>
                  <input
                    type="text"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('জাতীয় পরিচয়পত্র (NID) নম্বর *', 'NID Number *', lang)}</label>
                  <input
                    type="text"
                    required
                    value={nidNumber}
                    onChange={(e) => setNidNumber(e.target.value)}
                    placeholder="1994XXXXXXXXX"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('মোবাইল নম্বর *', 'Mobile Number *', lang)}</label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('ইমেইল', 'Email', lang)}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('বর্তমান ঠিকানা', 'Present Address', lang)}</label>
                  <input
                    type="text"
                    value={presentAddress}
                    onChange={(e) => setPresentAddress(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('স্থায়ী ঠিকানা', 'Permanent Address', lang)}</label>
                  <input
                    type="text"
                    value={permanentAddress}
                    onChange={(e) => setPermanentAddress(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="font-semibold mb-1.5">
                  {b('সংযুক্ত ডকুমেন্টসমূহ (Part A Documents)', 'Supporting Documents (Part A)', lang)}
                </div>
                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={docNid} onChange={(e) => setDocNid(e.target.checked)} />
                    <span>{b('জাতীয় পরিচয়পত্র (NID)', 'National ID (NID)', lang)}</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={docCert} onChange={(e) => setDocCert(e.target.checked)} />
                    <span>{b('শিক্ষাগত সনদপত্র', 'Academic Certificate', lang)}</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={docPhoto} onChange={(e) => setDocPhoto(e.target.checked)} />
                    <span>{b('পাসপোর্ট সাইজ ছবি', 'Passport Photo', lang)}</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="shrink-0 flex justify-end gap-2 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <button type="button" onClick={resetAndClose} className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                {b('বাতিল', 'Cancel', lang)}
              </button>
              <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white cursor-pointer">
                {b('নিবন্ধন জমা ও ID তৈরি করুন', 'Submit Part A & Generate Teacher ID', lang)}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
