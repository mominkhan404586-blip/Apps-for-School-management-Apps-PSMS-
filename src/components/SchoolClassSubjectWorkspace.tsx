import React, { useMemo, useState } from 'react';
import {
  Archive,
  BookOpen,
  CheckCircle2,
  Copy,
  Download,
  Layers,
  Lock,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Unlock,
} from 'lucide-react';
import type {
  ClassSectionDivisionConfig,
  ClassStreamGroup,
  ClassSubjectDraftItem,
  ExamRecord,
  ExamRoutineRecord,
  Language,
  MasterRoutineRecord,
  MasterSubjectFrameworkItem,
  Role,
  RoutineSlot,
  SchoolSetupConfig,
  SchoolSetupType,
  SchoolSubjectRecord,
  SubjectYearLockConfig,
  TeacherSubjectAssignment,
  TeacherSubjectPermissionConfig,
} from '../types';
import { b } from '../i18n/translations';
import {
  addInstitutionSubject,
  bulkApplySubjectsToClasses,
  CLASS_STREAM_GROUPS,
  copySubjectsFromPreviousYear,
  createEmptySchoolSetupConfig,
  importSubjectsFromMasterFramework,
  isUpperSecondaryClass,
  isYearOrClassLocked,
  previewMasterFrameworkImport,
  removeOrArchiveSchoolSubject,
  saveClassGroupsAndSubjectsStep,
  saveClassSectionsStep,
  saveClassSubjectsStep,
  saveSchoolTypePermanently,
  saveSelectedClassesStep,
  SCHOOL_SETUP_TYPE_OPTIONS,
  SETUP_CLASS_RANGE_1_TO_10,
} from '../utils/centralSubjectAndStructureEngine';

export interface SchoolClassSubjectWorkspaceProps {
  lang: Language;
  role: Role;
  schoolId: string;
  actorName: string;
  initialMode?: 'setup' | 'subjects';
  schoolSetup?: SchoolSetupConfig;
  masterFramework: MasterSubjectFrameworkItem[];
  schoolSubjects: SchoolSubjectRecord[];
  lockConfigs: SubjectYearLockConfig[];
  teacherPermission?: TeacherSubjectPermissionConfig;
  masterRoutines: MasterRoutineRecord[];
  routineSlots: RoutineSlot[];
  examRoutines: ExamRoutineRecord[];
  teacherAssignments: TeacherSubjectAssignment[];
  exams: ExamRecord[];
  onSaveSchoolSetup: (next: SchoolSetupConfig) => void;
  onChangeSchoolSubjects: (next: SchoolSubjectRecord[]) => void;
  onChangeLockConfigs: (next: SubjectYearLockConfig[]) => void;
  onChangeTeacherPermission: (next: TeacherSubjectPermissionConfig) => void;
}

export const SchoolClassSubjectWorkspace: React.FC<SchoolClassSubjectWorkspaceProps> = ({
  lang,
  role,
  schoolId,
  actorName,
  initialMode = 'setup',
  schoolSetup,
  masterFramework,
  schoolSubjects,
  lockConfigs,
  teacherPermission,
  masterRoutines,
  routineSlots,
  examRoutines,
  teacherAssignments,
  exams,
  onSaveSchoolSetup,
  onChangeSchoolSubjects,
  onChangeLockConfigs,
  onChangeTeacherPermission,
}) => {
  const [workspaceTab, setWorkspaceTab] = useState<'setup' | 'subjects'>(initialMode);
  const setup = schoolSetup ?? createEmptySchoolSetupConfig(schoolId);

  const [pendingType, setPendingType] = useState<SchoolSetupType>(
    setup.schoolType ?? 'PRIMARY_SECONDARY'
  );
  const [selectedClassSet, setSelectedClassSet] = useState<string[]>(setup.selectedClasses);
  const [activeClassTab, setActiveClassTab] = useState<string>(
    setup.selectedClasses[0] || 'Class 1'
  );
  const [classNotice, setClassNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // Per-class incremental editing buffers
  const activeClassConfig = setup.classConfigs[activeClassTab];
  const [subDraftNameBn, setSubDraftNameBn] = useState('');
  const [subDraftNameEn, setSubDraftNameEn] = useState('');
  const [subDraftCode, setSubDraftCode] = useState('');
  const [activeStreamGroup, setActiveStreamGroup] = useState<ClassStreamGroup>('science');
  const [sectionDrafts, setSectionDrafts] = useState<ClassSectionDivisionConfig[]>(
    activeClassConfig?.sections ?? [
      { id: `sec-${activeClassTab}-a`, divisionNameBn: 'বিভাগ ক', divisionNameEn: 'Section A', includedGroups: [] },
      { id: `sec-${activeClassTab}-b`, divisionNameBn: 'বিভাগ খ', divisionNameEn: 'Section B', includedGroups: [] },
    ]
  );

  // Centralized Subject Registry state
  const [academicYear, setAcademicYear] = useState('২০২৬');
  const [copySourceYear, setCopySourceYear] = useState('২০২৫');
  const [registryClassFilter, setRegistryClassFilter] = useState<string>('Class 4');
  const [registryGroupFilter, setRegistryGroupFilter] = useState<ClassStreamGroup | ''>('');
  const [showImportPreview, setShowImportPreview] = useState(false);

  const [newSubCode, setNewSubCode] = useState('');
  const [newSubBn, setNewSubBn] = useState('');
  const [newSubEn, setNewSubEn] = useState('');
  const [newSubPeriods, setNewSubPeriods] = useState(5);
  const [newSubFullMarks, setNewSubFullMarks] = useState(100);
  const [newSubType, setNewSubType] = useState<SchoolSubjectRecord['type']>('Compulsory');
  const [bulkTargetClasses, setBulkTargetClasses] = useState<string[]>([]);
  const [registryBanner, setRegistryBanner] = useState<{ ok: boolean; text: string } | null>(null);

  const isSchoolAdmin = role === 'school_admin' || role === 'central_admin';
  const teacherCanEdit =
    isSchoolAdmin ||
    (role === 'teacher' && (teacherPermission?.allowTeachersToManageSubjects ?? false));

  const targetImportClasses = useMemo(
    () =>
      setup.selectedClasses.length > 0
        ? setup.selectedClasses
        : [...SETUP_CLASS_RANGE_1_TO_10],
    [setup.selectedClasses]
  );

  const importPreview = useMemo(
    () =>
      previewMasterFrameworkImport({
        frameworkItems: masterFramework,
        existingSchoolSubjects: schoolSubjects,
        schoolId,
        academicYear,
        targetClasses: targetImportClasses,
      }),
    [masterFramework, schoolSubjects, schoolId, academicYear, targetImportClasses]
  );

  const filteredSchoolSubjects = useMemo(
    () =>
      schoolSubjects.filter(
        (s) =>
          s.schoolId === schoolId &&
          s.academicYear === academicYear &&
          (!registryClassFilter || s.className === registryClassFilter) &&
          (!registryGroupFilter || s.groupName === registryGroupFilter)
      ),
    [schoolSubjects, schoolId, academicYear, registryClassFilter, registryGroupFilter]
  );

  const yearLocked = isYearOrClassLocked(lockConfigs, schoolId, academicYear);
  const classLocked = isYearOrClassLocked(lockConfigs, schoolId, academicYear, registryClassFilter);

  if (!schoolId) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-500">
        {b(
          'শ্রেণি ও বিষয় সেটআপ করার জন্য অনুগ্রহ করে একটি বিদ্যালয় নিবন্ধন বা নির্বাচন করুন।',
          'Please register or select a school to configure classes and subjects.',
          lang
        )}
      </div>
    );
  }

  const switchActiveClass = (cls: string) => {
    setActiveClassTab(cls);
    const existing = setup.classConfigs[cls];
    setSectionDrafts(
      existing?.sections?.length
        ? existing.sections
        : [
            { id: `sec-${cls}-a`, divisionNameBn: 'বিভাগ ক', divisionNameEn: 'Section A', includedGroups: [] },
            { id: `sec-${cls}-b`, divisionNameBn: 'বিভাগ খ', divisionNameEn: 'Section B', includedGroups: [] },
          ]
    );
  };

  const toggleClassInSetup = (cls: string) => {
    setSelectedClassSet((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
    );
  };

  const handleSavePermanentSchoolType = () => {
    const next = saveSchoolTypePermanently(setup, pendingType);
    onSaveSchoolSetup(next);
    setClassNotice({
      ok: true,
      text: b('বিদ্যালয়ের ধরন স্থায়ীভাবে সংরক্ষিত হয়েছে।', 'School Type permanently saved.', lang),
    });
  };

  const handleSaveClassSelection = () => {
    const res = saveSelectedClassesStep(setup, selectedClassSet);
    if (!res.ok || !res.config) {
      setClassNotice({
        ok: false,
        text: (lang === 'bn' ? res.errorBn : res.errorEn) || 'Error',
      });
      return;
    }
    onSaveSchoolSetup(res.config);
    if (res.config.selectedClasses.length > 0) {
      switchActiveClass(res.config.selectedClasses[0]);
    }
    setClassNotice({
      ok: true,
      text: b(
        `${res.config.selectedClasses.length}টি শ্রেণি সংরক্ষিত হয়েছে। এখন ডানদিকের প্রতিটি শ্রেণি মেনুতে বিষয় ও ২টি বিভাগ সেভ করুন।`,
        `${res.config.selectedClasses.length} classes saved. Save subjects and 2 sections in each class tab.`,
        lang
      ),
    });
  };

  const handleAddSubjectToClassTab = () => {
    if (!subDraftNameBn.trim()) return;
    const draft: ClassSubjectDraftItem = {
      id: `csd-${Date.now()}`,
      code: subDraftCode.trim() || `SUB-${Math.floor(100 + Math.random() * 900)}`,
      nameBn: subDraftNameBn.trim(),
      nameEn: subDraftNameEn.trim() || subDraftNameBn.trim(),
      weeklyPeriods: 5,
      fullMarks: 100,
      passMarks: 33,
      type: 'Compulsory',
    };

    if (isUpperSecondaryClass(activeClassTab)) {
      const currGroups = activeClassConfig?.selectedGroups?.length
        ? activeClassConfig.selectedGroups
        : [activeStreamGroup];
      const groupsWithActive = currGroups.includes(activeStreamGroup)
        ? currGroups
        : [...currGroups, activeStreamGroup];
      const nextGroupSubs = {
        ...(activeClassConfig?.groupSubjects ?? {}),
        [activeStreamGroup]: [
          ...(activeClassConfig?.groupSubjects?.[activeStreamGroup] ?? []),
          draft,
        ],
      };
      onSaveSchoolSetup(
        saveClassGroupsAndSubjectsStep(setup, activeClassTab, groupsWithActive, nextGroupSubs)
      );
    } else {
      const nextSubs = [...(activeClassConfig?.subjects ?? []), draft];
      onSaveSchoolSetup(saveClassSubjectsStep(setup, activeClassTab, nextSubs));
    }
    setSubDraftNameBn('');
    setSubDraftNameEn('');
    setSubDraftCode('');
    setClassNotice({
      ok: true,
      text: b(`${activeClassTab}-এ বিষয় সংরক্ষিত হয়েছে।`, `Subject saved in ${activeClassTab}.`, lang),
    });
  };

  const handleToggleYearLock = () => {
    const existing = lockConfigs.find(
      (l) => l.schoolId === schoolId && l.academicYear === academicYear
    );
    if (existing) {
      onChangeLockConfigs(
        lockConfigs.map((l) =>
          l.schoolId === schoolId && l.academicYear === academicYear
            ? { ...l, yearLocked: !l.yearLocked, updatedAt: new Date().toISOString() }
            : l
        )
      );
    } else {
      onChangeLockConfigs([
        ...lockConfigs,
        {
          schoolId,
          academicYear,
          yearLocked: true,
          lockedClasses: [],
          updatedAt: new Date().toISOString(),
        },
      ]);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            {workspaceTab === 'setup'
              ? b('বিদ্যালয় কার্যক্রম — ধাপে ধাপে স্থায়ী সেটআপ', 'School Setup — Permanent Class & Division Wizard', lang)
              : b('শ্রেণীভিত্তিক বিষয় ব্যবস্থাপনা', 'Centralized Class-Wise Subject Registry', lang)}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {b(
              'ধাপ-ভিত্তিক শ্রেণি ও গ্রুপ কনফিগারেশন এবং সরকারি কাঠামো থেকে বর্ষভিত্তিক বিষয় সিঙ্ক।',
              'Incremental class & group setup plus academic-year scoped subject governance.',
              lang
            )}
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            data-testid="tab-school-setup-wizard"
            onClick={() => setWorkspaceTab('setup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
              workspaceTab === 'setup'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {b('বিদ্যালয় কার্যক্রম (Setup)', 'School Setup Wizard', lang)}
          </button>
          <button
            type="button"
            data-testid="tab-subject-registry"
            onClick={() => setWorkspaceTab('subjects')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
              workspaceTab === 'subjects'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {b('শ্রেণীভিত্তিক বিষয় ব্যবস্থাপনা', 'Subject Registry', lang)}
          </button>
        </div>
      </div>

      {workspaceTab === 'setup' ? (
        <div className="space-y-4 text-xs">
          {/* Step 1: Permanent School Type */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('ধাপ ১: বিদ্যালয়ের ধরন (একবার সেভ করলে স্থায়ী)', 'Step 1: Permanent School Type', lang)}
              </h3>
              {setup.schoolTypeLocked && (
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                  <Lock className="w-3.5 h-3.5" />
                  {b('স্থায়ীভাবে সংরক্ষিত', 'Locked Permanently', lang)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {SCHOOL_SETUP_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={setup.schoolTypeLocked}
                  onClick={() => setPendingType(opt.id)}
                  className={`px-3.5 py-2 rounded-xl border font-semibold cursor-pointer disabled:opacity-65 ${
                    (setup.schoolTypeLocked ? setup.schoolType : pendingType) === opt.id
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {lang === 'bn' ? opt.labelBn : opt.labelEn}
                </button>
              ))}
            </div>

            {!setup.schoolTypeLocked && isSchoolAdmin && (
              <button
                type="button"
                data-testid="save-school-type-permanent-btn"
                onClick={handleSavePermanentSchoolType}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {b('ধরন স্থায়ীভাবে সংরক্ষণ করুন', 'Save School Type Permanently', lang)}
              </button>
            )}
          </section>

          {/* Step 2: Select 5-10 Classes */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('ধাপ ২: শ্রেণি নির্বাচন (সর্বনিম্ন ৫টি, সর্বোচ্চ ১০টি)', 'Step 2: Select 5–10 Classes (Class 1 – Class 10)', lang)}
              </h3>
              <span className="font-mono tabular-nums text-slate-500">
                {b('নির্বাচিত', 'Selected', lang)}: {selectedClassSet.length}/10
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {SETUP_CLASS_RANGE_1_TO_10.map((cls) => {
                const checked = selectedClassSet.includes(cls);
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => toggleClassInSetup(cls)}
                    className={`px-3 py-2 rounded-xl border font-semibold text-left cursor-pointer ${
                      checked
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {cls}
                  </button>
                );
              })}
            </div>

            {isSchoolAdmin && (
              <button
                type="button"
                data-testid="save-selected-classes-btn"
                onClick={handleSaveClassSelection}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {b('নির্বাচিত শ্রেণিসমূহ সংরক্ষণ করুন', 'Save Selected Classes', lang)}
              </button>
            )}
          </section>

          {classNotice && (
            <div
              className={`p-3 rounded-xl border ${
                classNotice.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
              }`}
            >
              {classNotice.text}
            </div>
          )}

          {/* Step 3: Dynamic Class Menu Board */}
          {setup.selectedClasses.length > 0 && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-3">
                {setup.selectedClasses.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => switchActiveClass(cls)}
                    className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                      activeClassTab === cls
                        ? 'bg-slate-900 dark:bg-emerald-700 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Left: Class Subjects or Class 9-10 Groups + Subjects */}
                <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    {isUpperSecondaryClass(activeClassTab)
                      ? b(`${activeClassTab}: বিভাগ/গ্রুপ ও বিষয়সমূহ (বিজ্ঞান / মানবিক / ব্যবসায় / ভোকেশনাল)`, `${activeClassTab}: Stream Groups & Subjects`, lang)
                      : b(`${activeClassTab}: শ্রেণির বিষয়সমূহ (ধাপে ধাপে সেভ)`, `${activeClassTab}: Class Subjects (Incremental Save)`, lang)}
                  </h4>

                  {isUpperSecondaryClass(activeClassTab) && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {CLASS_STREAM_GROUPS.map((g) => {
                          const enabled = activeClassConfig?.selectedGroups?.includes(g.id);
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => setActiveStreamGroup(g.id)}
                              className={`px-2.5 py-1.5 rounded-lg border font-semibold cursor-pointer ${
                                activeStreamGroup === g.id
                                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300'
                                  : enabled
                                    ? 'border-emerald-300 text-emerald-700'
                                    : 'border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {lang === 'bn' ? g.labelBn : g.labelEn}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={subDraftCode}
                      onChange={(e) => setSubDraftCode(e.target.value)}
                      placeholder="Code"
                      className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                    <input
                      type="text"
                      value={subDraftNameBn}
                      onChange={(e) => setSubDraftNameBn(e.target.value)}
                      placeholder={b('বিষয়ের নাম (বাংলা)', 'Subject Name (Bn)', lang)}
                      className="flex-1 min-w-32 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      value={subDraftNameEn}
                      onChange={(e) => setSubDraftNameEn(e.target.value)}
                      placeholder="Subject (En)"
                      className="flex-1 min-w-32 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <button
                      type="button"
                      onClick={handleAddSubjectToClassTab}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 inline mr-1" />
                      {b('যুক্ত ও সেভ', 'Add & Save', lang)}
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                    {(isUpperSecondaryClass(activeClassTab)
                      ? activeClassConfig?.groupSubjects?.[activeStreamGroup] ?? []
                      : activeClassConfig?.subjects ?? []
                    ).map((s) => (
                      <div key={s.id} className="py-2 flex items-center justify-between">
                        <span>
                          <span className="font-mono text-slate-500 mr-2">{s.code}</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{s.nameBn}</span>
                        </span>
                        <span className="text-[11px] text-slate-500">{s.weeklyPeriods}p / {s.fullMarks}m</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: 2 Sections (বিভাগ ক ও বিভাগ খ) */}
                <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    {b(`${activeClassTab}: ২টি বিভাগ / শাখা (বিভাগ ক ও বিভাগ খ)`, `${activeClassTab}: 2 Sections / Divisions`, lang)}
                  </h4>
                  <div className="space-y-3">
                    {sectionDrafts.map((sec, idx) => (
                      <div key={sec.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={sec.divisionNameBn}
                            onChange={(e) =>
                              setSectionDrafts((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, divisionNameBn: e.target.value } : item
                                )
                              )
                            }
                            className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                          <input
                            type="text"
                            value={sec.divisionNameEn}
                            onChange={(e) =>
                              setSectionDrafts((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, divisionNameEn: e.target.value } : item
                                )
                              )
                            }
                            className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                        {isUpperSecondaryClass(activeClassTab) && (
                          <div className="flex flex-wrap gap-1.5">
                            {CLASS_STREAM_GROUPS.map((g) => {
                              const included = sec.includedGroups.includes(g.id);
                              return (
                                <button
                                  key={g.id}
                                  type="button"
                                  onClick={() =>
                                    setSectionDrafts((prev) =>
                                      prev.map((item, i) =>
                                        i === idx
                                          ? {
                                              ...item,
                                              includedGroups: included
                                                ? item.includedGroups.filter((x) => x !== g.id)
                                                : [...item.includedGroups, g.id],
                                            }
                                          : item
                                      )
                                    )
                                  }
                                  className={`px-2 py-1 rounded border text-[11px] cursor-pointer ${
                                    included
                                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-semibold'
                                      : 'border-slate-300 text-slate-600'
                                  }`}
                                >
                                  {lang === 'bn' ? g.labelBn : g.labelEn}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSaveSchoolSetup(saveClassSectionsStep(setup, activeClassTab, sectionDrafts));
                      setClassNotice({
                        ok: true,
                        text: b(
                          `${activeClassTab}-এর ২টি বিভাগ সংরক্ষিত হয়েছে।`,
                          `Sections saved for ${activeClassTab}.`,
                          lang
                        ),
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-blue-700 text-white font-semibold cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {b('বিভাগসমূহ সংরক্ষণ করুন', 'Save Sections', lang)}
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      ) : (
        /* Centralized Year-Scoped Subject Registry */
        <div className="space-y-4 text-xs">
          {/* Academic Year, Lock, Copy & Gov Framework Import */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="font-semibold text-slate-700 dark:text-slate-200">
                  {b('শিক্ষাবর্ষ:', 'Academic Year:', lang)}
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                >
                  <option value="২০২৫">২০২৫</option>
                  <option value="২০২৬">২০২৬</option>
                  <option value="২০২৭">২০২৭</option>
                </select>

                <label className="font-semibold text-slate-700 dark:text-slate-200 ml-2">
                  {b('শ্রেণি:', 'Class:', lang)}
                </label>
                <select
                  value={registryClassFilter}
                  onChange={(e) => setRegistryClassFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                >
                  {SETUP_CLASS_RANGE_1_TO_10.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>

                {isUpperSecondaryClass(registryClassFilter) && (
                  <select
                    value={registryGroupFilter}
                    onChange={(e) => setRegistryGroupFilter(e.target.value as ClassStreamGroup | '')}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="">{b('সকল গ্রুপ', 'All Groups', lang)}</option>
                    {CLASS_STREAM_GROUPS.map((g) => (
                      <option key={g.id} value={g.id}>
                        {lang === 'bn' ? g.labelBn : g.labelEn}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isSchoolAdmin && (
                  <>
                    <button
                      type="button"
                      data-testid="toggle-import-preview-btn"
                      onClick={() => setShowImportPreview((p) => !p)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {b('সরকারি ফ্রেমওয়ার্ক ইম্পোর্ট', 'Import Gov Framework', lang)} ({importPreview.toCreateCount})
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleYearLock}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold cursor-pointer ${
                        yearLocked
                          ? 'border-amber-500 bg-amber-50 text-amber-800'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {yearLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      {yearLocked ? b('শিক্ষাবর্ষ আনলক', 'Unlock Year', lang) : b('শিক্ষাবর্ষ লক', 'Lock Year', lang)}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Teacher Permission + Previous Year Copy Row */}
            {isSchoolAdmin && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={teacherPermission?.allowTeachersToManageSubjects ?? false}
                    onChange={(e) =>
                      onChangeTeacherPermission({
                        schoolId,
                        allowTeachersToManageSubjects: e.target.checked,
                        updatedBy: actorName,
                        updatedAt: new Date().toISOString(),
                      })
                    }
                  />
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>
                    {b(
                      'শিক্ষকদের বিষয় যোগ/সম্পাদনার অনুমতি দিন',
                      'Allow Teachers to Manage Subjects',
                      lang
                    )}
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <select
                    value={copySourceYear}
                    onChange={(e) => setCopySourceYear(e.target.value)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="২০২৫">২০২৫</option>
                    <option value="২০২৬">২০২৬</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const res = copySubjectsFromPreviousYear({
                        existingSchoolSubjects: schoolSubjects,
                        schoolId,
                        fromYear: copySourceYear,
                        toYear: academicYear,
                        actorName,
                      });
                      onChangeSchoolSubjects(res.nextSubjects);
                      setRegistryBanner({
                        ok: true,
                        text: b(
                          `${copySourceYear} থেকে ${res.copiedCount}টি বিষয় ${academicYear}-এ কপি হয়েছে।`,
                          `Copied ${res.copiedCount} subjects from ${copySourceYear} to ${academicYear}.`,
                          lang
                        ),
                      });
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {b('পূর্ববর্তী বছর থেকে কপি', 'Copy Prev Year', lang)}
                  </button>
                </div>
              </div>
            )}

            {showImportPreview && (
              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-blue-900 dark:text-blue-200">
                    {b(
                      `প্রিভিউ: ${importPreview.toCreateCount}টি নতুন সরকারি বিষয় যোগ হবে (${importPreview.skippedDuplicatesCount}টি ডুপ্লিকেট বাদ দেওয়া হয়েছে)`,
                      `Preview: ${importPreview.toCreateCount} subjects will be imported (${importPreview.skippedDuplicatesCount} duplicates skipped)`,
                      lang
                    )}
                  </div>
                  <button
                    type="button"
                    data-testid="confirm-import-gov-subjects-btn"
                    onClick={() => {
                      const res = importSubjectsFromMasterFramework({
                        frameworkItems: masterFramework,
                        existingSchoolSubjects: schoolSubjects,
                        schoolId,
                        academicYear,
                        targetClasses: targetImportClasses,
                        actorName,
                        lockConfigs,
                      });
                      onChangeSchoolSubjects(res.nextSubjects);
                      setShowImportPreview(false);
                      setRegistryBanner({
                        ok: true,
                        text: b(
                          `${res.addedCount}টি সরকারি বিষয় ${academicYear} শিক্ষাবর্ষে ইম্পোর্ট হয়েছে।`,
                          `Imported ${res.addedCount} government subjects for ${academicYear}.`,
                          lang
                        ),
                      });
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold cursor-pointer"
                  >
                    {b('নিশ্চিত ইম্পোর্ট করুন', 'Confirm Import', lang)}
                  </button>
                </div>
              </div>
            )}
          </section>

          {registryBanner && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 ${
                registryBanner.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{registryBanner.text}</span>
            </div>
          )}

          {/* Add Institution Subject + Bulk Apply */}
          {teacherCanEdit && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {b('প্রতিষ্ঠানের নিজস্ব বিষয় যোগ (Institution Custom Subject)', 'Add Institution Subject', lang)}
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const res = addInstitutionSubject({
                    existingSchoolSubjects: schoolSubjects,
                    schoolId,
                    academicYear,
                    className: registryClassFilter,
                    groupName: registryGroupFilter || undefined,
                    code: newSubCode,
                    nameBn: newSubBn,
                    nameEn: newSubEn || newSubBn,
                    weeklyPeriods: newSubPeriods,
                    fullMarks: newSubFullMarks,
                    passMarks: Math.round(newSubFullMarks * 0.33),
                    type: newSubType,
                    actorName,
                    lockConfigs,
                  });
                  if (!res.ok) {
                    setRegistryBanner({
                      ok: false,
                      text: (lang === 'bn' ? res.errorBn : res.errorEn) || 'Error',
                    });
                    return;
                  }
                  onChangeSchoolSubjects(res.nextSubjects);
                  setNewSubCode('');
                  setNewSubBn('');
                  setNewSubEn('');
                  setRegistryBanner({
                    ok: true,
                    text: b(`${registryClassFilter}-এ নতুন বিষয় যুক্ত হয়েছে।`, `Subject added to ${registryClassFilter}.`, lang),
                  });
                }}
                className="grid grid-cols-1 sm:grid-cols-6 gap-2.5 items-end"
              >
                <input
                  type="text"
                  required
                  value={newSubCode}
                  onChange={(e) => setNewSubCode(e.target.value)}
                  placeholder="Code (e.g. SCH-401)"
                  className="px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
                <input
                  type="text"
                  required
                  value={newSubBn}
                  onChange={(e) => setNewSubBn(e.target.value)}
                  placeholder={b('নাম (বাংলা)', 'Name (Bn)', lang)}
                  className="px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={newSubEn}
                  onChange={(e) => setNewSubEn(e.target.value)}
                  placeholder="Name (English)"
                  className="px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={newSubPeriods}
                  onChange={(e) => setNewSubPeriods(Number(e.target.value))}
                  placeholder="Periods"
                  className="px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
                <select
                  value={newSubType}
                  onChange={(e) => setNewSubType(e.target.value as SchoolSubjectRecord['type'])}
                  className="px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="Compulsory">Compulsory</option>
                  <option value="Elective">Elective</option>
                  <option value="Optional">Optional</option>
                </select>
                <button
                  type="submit"
                  disabled={classLocked}
                  className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold cursor-pointer"
                >
                  {b('যোগ করুন', 'Add Subject', lang)}
                </button>
              </form>

              {filteredSchoolSubjects.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-600">
                    {b('অন্য শ্রেণিতে Bulk Apply:', 'Bulk Apply to Classes:', lang)}
                  </span>
                  {SETUP_CLASS_RANGE_1_TO_10.filter((c) => c !== registryClassFilter).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setBulkTargetClasses((prev) =>
                          prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
                        )
                      }
                      className={`px-2 py-1 rounded border text-[11px] cursor-pointer ${
                        bulkTargetClasses.includes(c)
                          ? 'border-blue-600 bg-blue-50 text-blue-800 font-semibold'
                          : 'border-slate-300 text-slate-600'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={bulkTargetClasses.length === 0}
                    onClick={() => {
                      const res = bulkApplySubjectsToClasses({
                        sourceSubjects: filteredSchoolSubjects.filter((s) => s.status === 'active'),
                        existingSchoolSubjects: schoolSubjects,
                        schoolId,
                        academicYear,
                        targetClasses: bulkTargetClasses,
                        actorName,
                        lockConfigs,
                      });
                      onChangeSchoolSubjects(res.nextSubjects);
                      setBulkTargetClasses([]);
                      setRegistryBanner({
                        ok: true,
                        text: b(
                          `${res.appliedCount}টি বিষয় নির্বাচিত শ্রেণিসমূহে যুক্ত হয়েছে।`,
                          `Bulk applied ${res.appliedCount} subjects across selected classes.`,
                          lang
                        ),
                      });
                    }}
                    className="px-3 py-1 rounded-lg bg-slate-900 dark:bg-blue-700 disabled:opacity-50 text-white font-semibold cursor-pointer"
                  >
                    {b('Bulk Apply করুন', 'Bulk Apply', lang)}
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Subject List Table */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-700" />
                {registryClassFilter} ({academicYear}) — {filteredSchoolSubjects.length}{' '}
                {b('টি বিষয়', 'Subjects', lang)}
              </span>
              {classLocked && (
                <span className="text-amber-700 font-semibold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Locked
                </span>
              )}
            </div>
            {filteredSchoolSubjects.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                {b(
                  'এই শ্রেণি ও শিক্ষাবর্ষে এখনো কোনো বিষয় নেই। সরকারি ফ্রেমওয়ার্ক ইম্পোর্ট করুন অথবা নতুন বিষয় যোগ করুন।',
                  'No subjects configured for this class & year yet. Import from Government Framework or add an Institution Subject.',
                  lang
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                      <th className="px-4 py-2.5">Code</th>
                      <th className="px-4 py-2.5">{b('বিষয়', 'Subject', lang)}</th>
                      <th className="px-4 py-2.5">{b('উৎস', 'Origin', lang)}</th>
                      <th className="px-4 py-2.5">{b('পিরিয়ড/নম্বর', 'Periods / Marks', lang)}</th>
                      <th className="px-4 py-2.5">{b('অবস্থা', 'Status', lang)}</th>
                      {teacherCanEdit && <th className="px-4 py-2.5 text-right">{b('অ্যাকশন', 'Action', lang)}</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredSchoolSubjects.map((sub) => (
                      <tr key={sub.id}>
                        <td className="px-4 py-2.5 font-mono text-slate-600">{sub.code}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">
                          {sub.nameBn} ({sub.nameEn})
                          {sub.groupName ? ` · ${sub.groupName}` : ''}
                        </td>
                        <td className="px-4 py-2.5">
                          {sub.origin === 'government'
                            ? b('সরকারি (NCTB)', 'Government', lang)
                            : b('প্রতিষ্ঠান (Custom)', 'Institution', lang)}
                        </td>
                        <td className="px-4 py-2.5 font-mono tabular-nums">
                          {sub.weeklyPeriods}p / {sub.fullMarks}m
                        </td>
                        <td className="px-4 py-2.5">{sub.status}</td>
                        {teacherCanEdit && (
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                const res = removeOrArchiveSchoolSubject({
                                  subjectId: sub.id,
                                  existingSchoolSubjects: schoolSubjects,
                                  lockConfigs,
                                  masterRoutines,
                                  routineSlots,
                                  examRoutines,
                                  teacherAssignments,
                                  exams,
                                  preferArchiveIfUsed: true,
                                });
                                onChangeSchoolSubjects(res.nextSubjects);
                                setRegistryBanner({
                                  ok: res.action === 'deleted' || res.action === 'archived',
                                  text:
                                    res.action === 'deleted'
                                      ? b('বিষয়টি মুছে ফেলা হয়েছে।', 'Subject deleted.', lang)
                                      : res.action === 'archived'
                                        ? b(
                                            `বিষয়টি ${res.usedIn?.join(', ')}-এ ব্যবহৃত থাকায় Delete-এর পরিবর্তে Archive করা হয়েছে।`,
                                            `Subject archived safely because it is referenced in ${res.usedIn?.join(', ')}.`,
                                            lang
                                          )
                                        : b('লক করা বিষয় পরিবর্তন করা যায়নি।', 'Locked subject cannot be removed.', lang),
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                            >
                              {sub.status === 'archived' ? <Archive className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                              {sub.status === 'archived' ? 'Archived' : b('মুছুন / আর্কাইভ', 'Delete / Archive', lang)}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
