import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  Eye,
  FilePlus2,
  History,
  LayoutGrid,
  Play,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Table2,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import type {
  AcademicSubjectConfig,
  Language,
  MasterRoutineRecord,
  MasterSubjectFrameworkItem,
  Role,
  RoutineCellSchedule,
  RoutineDayConfig,
  RoutinePeriodConfig,
  RoutineStatus,
  RoutineType,
  SchoolRecord,
  SchoolSubjectRecord,
  TeacherRecord,
  TeacherSubjectAssignment,
} from '../types';
import { b } from '../i18n/translations';
import { ALL_CLASSES } from '../data/mockData';
import { getActiveSubjectsForDropdown } from '../utils/centralSubjectAndStructureEngine';
import {
  buildStudentPublishedRoutineView,
  buildTeacherPersonalRoutineView,
  checkAndExpireTemporaryRoutines,
  computeDurationMinutes,
  createNewMasterRoutine,
  detectRoutineCellConflicts,
  exportRoutineToCsv,
  extendTemporaryRoutine,
  formatTimeDisplay,
  getAssignedTeachersForClassSubject,
  publishOrActivateRoutine,
  reactivateRoutine,
  restoreRoutineVersion,
  saveRoutineWithVersioning,
  upsertRoutineCell,
  validateEntireRoutine,
} from '../utils/routineManagementEngine';

interface RoutineManagementSystemProps {
  lang: Language;
  role: Role;
  school?: SchoolRecord;
  actorName: string;
  routines: MasterRoutineRecord[];
  teachers: TeacherRecord[];
  subjects?: AcademicSubjectConfig[];
  schoolSubjects?: SchoolSubjectRecord[];
  masterFramework?: MasterSubjectFrameworkItem[];
  academicYear?: string;
  teacherAssignments: TeacherSubjectAssignment[];
  teacherRecord?: TeacherRecord;
  studentClass?: string;
  studentSection?: string;
  studentName?: string;
  readOnlyOversight?: boolean;
  onUpdateRoutines: (nextRoutines: MasterRoutineRecord[], toastMsg?: string) => void;
}

const STATUS_STYLE: Record<RoutineStatus, string> = {
  Draft: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  Published: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  Active: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  Expired: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  Archived: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

function triggerDownloadCsv(filename: string, csvText: string) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const RoutineManagementSystem: React.FC<RoutineManagementSystemProps> = ({
  lang,
  role,
  school,
  actorName,
  routines,
  teachers,
  subjects = [],
  schoolSubjects = [],
  masterFramework = [],
  academicYear,
  teacherAssignments,
  teacherRecord,
  studentClass = '',
  studentSection = 'ক (A)',
  studentName,
  readOnlyOversight = false,
  onUpdateRoutines,
}) => {
  const schoolId = school?.id ?? '';
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const schoolRoutines = useMemo(
    () => routines.filter((r) => r.schoolId === schoolId),
    [routines, schoolId]
  );

  // Student & Parent View
  const [studentViewMode, setStudentViewMode] = useState<'table' | 'cards'>('table');
  const [simTodayIso, setSimTodayIso] = useState(todayIso);

  // Admin All-School Filters
  const [filterClass, setFilterClass] = useState('all');
  const [filterSection, setFilterSection] = useState('all');
  const [filterTeacherId, setFilterTeacherId] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterDayId, setFilterDayId] = useState('all');
  const [filterPeriodId, setFilterPeriodId] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | RoutineStatus>('all');

  const [selectedRoutineId, setSelectedRoutineId] = useState<string>(
    schoolRoutines[0]?.id ?? ''
  );
  const [previewStudentMode, setPreviewStudentMode] = useState(false);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [showDayPeriodPanel, setShowDayPeriodPanel] = useState(false);
  const [showVersionsPanel, setShowVersionsPanel] = useState(false);
  const [showTempConfigPanel, setShowTempConfigPanel] = useState(false);
  const [extendDateInput, setExtendDateInput] = useState(todayIso);

  // Create Routine Form State
  const resolvedYear = academicYear ?? school?.academicYear ?? String(new Date().getFullYear());
  const [newTitleBn, setNewTitleBn] = useState('');
  const [newType, setNewType] = useState<RoutineType>('weekly');
  const [newYear, setNewYear] = useState(resolvedYear);
  const [newMonth, setNewMonth] = useState('');
  const [newClass, setNewClass] = useState(school?.approvedClasses[0] ?? 'Class 1');
  const [newSection, setNewSection] = useState('ক (A)');
  const [newIsTemp, setNewIsTemp] = useState(false);
  const [newStartDate, setNewStartDate] = useState(todayIso);
  const [newEndDate, setNewEndDate] = useState(todayIso);

  // Cell Editor State
  const [editingCellTarget, setEditingCellTarget] = useState<{
    dayId: string;
    periodId: string;
    existing?: RoutineCellSchedule;
  } | null>(null);
  const [cellSubjectEn, setCellSubjectEn] = useState('');
  const [cellTeacherId, setCellTeacherId] = useState('');
  const [cellRoom, setCellRoom] = useState('204');
  const [cellStartTime, setCellStartTime] = useState('09:30');
  const [cellEndTime, setCellEndTime] = useState('10:15');
  const [cellNote, setCellNote] = useState('');

  // Day Management Form
  const [dayNameBn, setDayNameBn] = useState('');
  const [dayNameEn, setDayNameEn] = useState('');
  const [editingDayId, setEditingDayId] = useState<string | null>(null);

  // Period Management Form
  const [periodNum, setPeriodNum] = useState(6);
  const [periodNameBn, setPeriodNameBn] = useState('৬ষ্ঠ পিরিয়ড');
  const [periodStart, setPeriodStart] = useState('14:05');
  const [periodEnd, setPeriodEnd] = useState('14:50');
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);

  // Publish Validation Error Banner
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const subjectCatalog = useMemo(() => {
    const activeFromRegistry = getActiveSubjectsForDropdown(
      schoolSubjects.filter((s) => !schoolId || s.schoolId === schoolId),
      resolvedYear,
      newClass
    );
    if (activeFromRegistry.length > 0) {
      return activeFromRegistry.map((s) => ({ nameBn: s.nameBn, nameEn: s.nameEn }));
    }
    if (subjects.length > 0) {
      return subjects.map((s) => ({ nameBn: s.nameBn, nameEn: s.nameEn }));
    }
    return masterFramework.map((s) => ({ nameBn: s.nameBn, nameEn: s.nameEn }));
  }, [schoolSubjects, schoolId, resolvedYear, newClass, subjects, masterFramework]);

  // === STUDENT & GUARDIAN PORTAL VIEW ===
  if (role === 'student' || role === 'guardian') {
    const activeStudentRoutine = buildStudentPublishedRoutineView(
      routines,
      schoolId,
      studentClass,
      studentSection,
      simTodayIso
    );

    return (
      <div className="space-y-5 text-xs">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          {/* Printable Routine Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-700 text-white font-bold flex items-center justify-center text-sm shrink-0">
                {school?.code.slice(0, 3) ?? 'SCH'}
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                  {school ? b(school.nameBn, school.nameEn, lang) : schoolId} —{' '}
                  {b('ক্লাস রুটিন', 'Class Routine', lang)}
                </h1>
                <div className="text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                  <span>
                    {studentName ? `${studentName} · ` : ''}
                    {studentClass} ({studentSection})
                  </span>
                  {activeStudentRoutine && (
                    <>
                      <span>·</span>
                      <span className="font-semibold text-blue-700 dark:text-blue-400">
                        {activeStudentRoutine.routineType.toUpperCase()} · {activeStudentRoutine.academicYear}
                        {activeStudentRoutine.month ? ` (${activeStudentRoutine.month})` : ''}
                      </span>
                      <span className="px-2 py-0.5 rounded border text-[11px] font-bold bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                        {activeStudentRoutine.status}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 no-print">
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setStudentViewMode('table')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md font-semibold cursor-pointer ${
                    studentViewMode === 'table'
                      ? 'bg-blue-700 text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Table2 className="w-3.5 h-3.5" />
                  {b('Table View', 'Table View', lang)}
                </button>
                <button
                  type="button"
                  onClick={() => setStudentViewMode('cards')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md font-semibold cursor-pointer ${
                    studentViewMode === 'cards'
                      ? 'bg-blue-700 text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  {b('Card View', 'Card View', lang)}
                </button>
              </div>
              {activeStudentRoutine && (
                <>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    {b('প্রিন্ট', 'Print', lang)}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      triggerDownloadCsv(
                        `routine-${studentClass}-${studentSection}.csv`,
                        exportRoutineToCsv(activeStudentRoutine, school)
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 text-white font-semibold hover:bg-blue-800 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {b('ডাউনলোড', 'Download CSV', lang)}
                  </button>
                </>
              )}
            </div>
          </div>

          {!activeStudentRoutine ? (
            <div className="p-6 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
              {b(
                'আপনার শ্রেণির জন্য কোনো প্রকাশিত (Published/Active) রুটিন বর্তমানে সক্রিয় নেই। খসড়া রুটিন শিক্ষার্থীদের জন্য গোপন থাকে।',
                'No Published or Active routine is currently available for your Class & Section.',
                lang
              )}
            </div>
          ) : studentViewMode === 'table' ? (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full min-w-[780px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200 w-36">
                      {b('বার / দিন', 'Day', lang)}
                    </th>
                    {activeStudentRoutine.periods.map((prd) => (
                      <th key={prd.id} className="py-3 px-3 font-bold text-slate-700 dark:text-slate-200">
                        <div>{b(prd.nameBn, prd.nameEn, lang)}</div>
                        <div className="text-[11px] font-mono font-normal text-slate-500">
                          {formatTimeDisplay(prd.startTime)} – {formatTimeDisplay(prd.endTime)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activeStudentRoutine.days.map((day) => (
                    <tr key={day.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/30">
                        <div>{b(day.nameBn, day.nameEn, lang)}</div>
                        <div className="text-[11px] font-mono text-slate-400">{day.shortCode}</div>
                      </td>
                      {activeStudentRoutine.periods.map((prd) => {
                        const cell = activeStudentRoutine.schedules.find(
                          (s) => s.dayId === day.id && s.periodId === prd.id
                        );
                        return (
                          <td key={prd.id} className="py-2.5 px-3 align-top border-l border-slate-100 dark:border-slate-800">
                            {cell ? (
                              <div className="space-y-0.5">
                                <div className="font-bold text-blue-800 dark:text-blue-300">
                                  {b(cell.subjectBn, cell.subjectEn, lang)}
                                </div>
                                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                                  {cell.teacherName}
                                </div>
                                <div className="text-[11px] font-mono text-slate-500">
                                  Room {cell.room} · {formatTimeDisplay(cell.startTime)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeStudentRoutine.days.map((day) => {
                const daySlots = activeStudentRoutine.schedules.filter((s) => s.dayId === day.id);
                return (
                  <div
                    key={day.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2"
                  >
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      {b(day.nameBn, day.nameEn, lang)}
                    </div>
                    {daySlots.length === 0 ? (
                      <div className="text-slate-400">{b('কোনো ক্লাস নেই', 'No classes', lang)}</div>
                    ) : (
                      daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        >
                          <div className="font-bold text-blue-700 dark:text-blue-400">
                            {b(slot.subjectBn, slot.subjectEn, lang)}
                          </div>
                          <div className="text-slate-500">
                            {formatTimeDisplay(slot.startTime)} – {formatTimeDisplay(slot.endTime)} · Room {slot.room}
                          </div>
                          <div className="text-slate-700 dark:text-slate-300">{slot.teacherName}</div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // === TEACHER PERSONAL ROUTINE VIEW ===
  if (role === 'teacher' && teacherRecord) {
    const teacherSchedule = buildTeacherPersonalRoutineView(
      routines,
      teacherRecord.schoolId,
      teacherRecord.id,
      simTodayIso
    );

    return (
      <div className="space-y-5 text-xs">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                {b('আমার সম্পূর্ণ পাঠদান রুটিন (My Routine)', 'My Complete Teaching Routine', lang)}
              </h1>
              <p className="text-slate-500 mt-0.5">
                {teacherRecord.nameBn} · {teacherSchedule.slots.length}{' '}
                {b('টি নির্ধারিত ক্লাস স্লট (প্রকাশিত ও সক্রিয় রুটিন)', 'assigned slots across active routines', lang)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer no-print"
            >
              <Printer className="w-3.5 h-3.5" />
              {b('প্রিন্ট করুন', 'Print My Routine', lang)}
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full min-w-[760px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4 font-bold">{b('বার / দিন', 'Day', lang)}</th>
                  {teacherSchedule.periods.map((prd) => (
                    <th key={prd.id} className="py-3 px-3 font-bold">
                      <div>{b(prd.nameBn, prd.nameEn, lang)}</div>
                      <div className="text-[11px] font-mono font-normal text-slate-500">
                        {formatTimeDisplay(prd.startTime)} – {formatTimeDisplay(prd.endTime)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {teacherSchedule.days.map((day) => (
                  <tr key={day.id}>
                    <td className="py-3 px-4 font-bold bg-slate-50/50 dark:bg-slate-800/30">
                      {b(day.nameBn, day.nameEn, lang)}
                    </td>
                    {teacherSchedule.periods.map((prd) => {
                      const matched = teacherSchedule.slots.filter(
                        (s) => s.dayId === day.id && s.periodId === prd.id
                      );
                      return (
                        <td key={prd.id} className="py-2.5 px-3 align-top border-l border-slate-100 dark:border-slate-800">
                          {matched.length === 0 ? (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          ) : (
                            <div className="space-y-1.5">
                              {matched.map((slot) => (
                                <div
                                  key={slot.id}
                                  className="p-2 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
                                >
                                  <div className="font-bold text-blue-800 dark:text-blue-300">
                                    {slot.className} ({slot.section})
                                  </div>
                                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                                    {b(slot.subjectBn, slot.subjectEn, lang)}
                                  </div>
                                  <div className="text-[11px] font-mono text-slate-500">
                                    Room {slot.room} · {formatTimeDisplay(slot.startTime)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // === SCHOOL ADMIN / CENTRAL OVERSIGHT MASTER ROUTINE MANAGEMENT ===
  const filteredRoutines = useMemo(() => {
    return schoolRoutines.filter((r) => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterClass !== 'all' && r.className !== filterClass) return false;
      if (filterSection !== 'all' && r.section !== filterSection) return false;
      if (
        filterTeacherId !== 'all' &&
        !r.schedules.some((s) => s.teacherId === filterTeacherId)
      ) {
        return false;
      }
      if (
        filterSubject !== 'all' &&
        !r.schedules.some(
          (s) => s.subjectEn === filterSubject || s.subjectBn === filterSubject
        )
      ) {
        return false;
      }
      return true;
    });
  }, [schoolRoutines, filterStatus, filterClass, filterSection, filterTeacherId, filterSubject]);

  const currentRoutine =
    filteredRoutines.find((r) => r.id === selectedRoutineId) ??
    schoolRoutines.find((r) => r.id === selectedRoutineId) ??
    filteredRoutines[0] ??
    schoolRoutines[0];

  const visibleDays = useMemo(() => {
    if (!currentRoutine) return [];
    const sorted = [...currentRoutine.days].sort((a, b) => a.order - b.order);
    return filterDayId === 'all' ? sorted : sorted.filter((d) => d.id === filterDayId);
  }, [currentRoutine, filterDayId]);

  const visiblePeriods = useMemo(() => {
    if (!currentRoutine) return [];
    const sorted = [...currentRoutine.periods].sort(
      (a, b) => a.periodNumber - b.periodNumber
    );
    return filterPeriodId === 'all'
      ? sorted
      : sorted.filter((p) => p.id === filterPeriodId);
  }, [currentRoutine, filterPeriodId]);

  const cellTeacherOptions = useMemo(() => {
    if (!currentRoutine) return { assigned: [], otherSchoolTeachers: [] };
    return getAssignedTeachersForClassSubject(
      teacherAssignments,
      teachers,
      schoolId,
      currentRoutine.className,
      currentRoutine.section,
      cellSubjectEn
    );
  }, [teacherAssignments, teachers, schoolId, currentRoutine, cellSubjectEn]);

  const liveCellConflicts = useMemo(() => {
    if (!editingCellTarget || !currentRoutine) return [];
    const selectedTeacher = teachers.find((t) => t.id === cellTeacherId);
    const subMeta = subjectCatalog.find(
      (s) => s.nameEn === cellSubjectEn || s.nameBn === cellSubjectEn
    );
    return detectRoutineCellConflicts(
      {
        id: editingCellTarget.existing?.id,
        dayId: editingCellTarget.dayId,
        periodId: editingCellTarget.periodId,
        className: currentRoutine.className,
        section: currentRoutine.section,
        subjectBn: subMeta?.nameBn ?? cellSubjectEn,
        subjectEn: subMeta?.nameEn ?? cellSubjectEn,
        teacherId: cellTeacherId,
        teacherName: selectedTeacher?.nameBn ?? '',
        room: cellRoom,
        startTime: cellStartTime,
        endTime: cellEndTime,
      },
      currentRoutine,
      routines
    );
  }, [
    editingCellTarget,
    currentRoutine,
    teachers,
    cellTeacherId,
    subjectCatalog,
    cellSubjectEn,
    cellRoom,
    cellStartTime,
    cellEndTime,
    routines,
  ]);

  const routineWideConflicts = useMemo(() => {
    if (!currentRoutine) return [];
    return validateEntireRoutine(currentRoutine, routines);
  }, [currentRoutine, routines]);

  const openCellEditor = (day: RoutineDayConfig, period: RoutinePeriodConfig) => {
    if (!currentRoutine || readOnlyOversight) return;
    const existing = currentRoutine.schedules.find(
      (s) => s.dayId === day.id && s.periodId === period.id
    );
    const defaultSub = existing?.subjectEn ?? subjectCatalog[0]?.nameEn ?? 'Mathematics';
    const matchingAssign = teacherAssignments.find(
      (ta) =>
        ta.className === currentRoutine.className &&
        ta.section === currentRoutine.section &&
        ta.subjectEn === defaultSub
    );
    setCellSubjectEn(defaultSub);
    setCellTeacherId(existing?.teacherId ?? matchingAssign?.teacherId ?? '');
    setCellRoom(existing?.room ?? matchingAssign?.room ?? '204');
    setCellStartTime(existing?.startTime ?? period.startTime);
    setCellEndTime(existing?.endTime ?? period.endTime);
    setCellNote(existing?.note ?? '');
    setEditingCellTarget({ dayId: day.id, periodId: period.id, existing });
  };

  const handleCellSubjectChange = (nextSubEn: string) => {
    setCellSubjectEn(nextSubEn);
    if (!currentRoutine) return;
    const matchingAssign = teacherAssignments.find(
      (ta) =>
        ta.className === currentRoutine.className &&
        ta.section === currentRoutine.section &&
        (ta.subjectEn === nextSubEn || ta.subjectBn === nextSubEn)
    );
    if (matchingAssign) {
      setCellTeacherId(matchingAssign.teacherId);
      setCellRoom(matchingAssign.room);
    }
  };

  const handleSaveCell = () => {
    if (!currentRoutine || !editingCellTarget) return;
    if (liveCellConflicts.length > 0) return;

    const selectedTeacher = teachers.find((t) => t.id === cellTeacherId);
    const subMeta = subjectCatalog.find(
      (s) => s.nameEn === cellSubjectEn || s.nameBn === cellSubjectEn
    );
    const updatedRoutine = upsertRoutineCell(currentRoutine, {
      id: editingCellTarget.existing?.id,
      dayId: editingCellTarget.dayId,
      periodId: editingCellTarget.periodId,
      className: currentRoutine.className,
      section: currentRoutine.section,
      subjectBn: subMeta?.nameBn ?? cellSubjectEn,
      subjectEn: subMeta?.nameEn ?? cellSubjectEn,
      teacherId: cellTeacherId,
      teacherName: selectedTeacher?.nameBn ?? '',
      room: cellRoom.trim(),
      startTime: cellStartTime,
      endTime: cellEndTime,
      note: cellNote.trim() || undefined,
    });
    const res = saveRoutineWithVersioning(
      routines,
      updatedRoutine,
      actorName,
      `Updated ${subMeta?.nameBn ?? cellSubjectEn} schedule`
    );
    onUpdateRoutines(
      res.routines,
      b('রুটিন স্লট সফলভাবে সংরক্ষিত হয়েছে।', 'Schedule cell saved.', lang)
    );
    setEditingCellTarget(null);
    setValidationErrors([]);
  };

  const handleClearCell = () => {
    if (!currentRoutine || !editingCellTarget?.existing) return;
    const updatedRoutine: MasterRoutineRecord = {
      ...currentRoutine,
      schedules: currentRoutine.schedules.filter(
        (s) => s.id !== editingCellTarget.existing?.id
      ),
    };
    const res = saveRoutineWithVersioning(
      routines,
      updatedRoutine,
      actorName,
      `Removed ${editingCellTarget.existing.subjectBn} cell`
    );
    onUpdateRoutines(res.routines, b('স্লট মুছে ফেলা হয়েছে।', 'Schedule cleared.', lang));
    setEditingCellTarget(null);
  };

  const handleCreateRoutineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitleBn.trim()) return;
    const created = createNewMasterRoutine({
      schoolId,
      titleBn: newTitleBn,
      titleEn: newTitleBn,
      routineType: newType,
      academicYear: newYear,
      month: newType === 'monthly' ? newMonth : undefined,
      className: newClass,
      section: newSection,
      createdBy: actorName,
      isTemporary: newIsTemp,
      startDate: newIsTemp ? newStartDate : undefined,
      endDate: newIsTemp ? newEndDate : undefined,
    });
    onUpdateRoutines(
      [created, ...routines],
      b(`নতুন রুটিন "${created.titleBn}" (Draft) তৈরি হয়েছে।`, `Routine "${created.titleEn}" created as Draft.`, lang)
    );
    setSelectedRoutineId(created.id);
    setNewTitleBn('');
    setShowCreatePanel(false);
    setPreviewStudentMode(false);
  };

  const handleSaveDraft = () => {
    if (!currentRoutine) return;
    const next = { ...currentRoutine, status: 'Draft' as RoutineStatus };
    const res = saveRoutineWithVersioning(routines, next, actorName, 'Saved as Draft');
    onUpdateRoutines(
      res.routines,
      b('খসড়া (Draft) সংরক্ষিত হয়েছে — শিক্ষার্থীদের কাছে অপ্রকাশিত।', 'Saved as Draft (hidden from students).', lang)
    );
  };

  const handlePublishRoutine = () => {
    if (!currentRoutine) return;
    const res = publishOrActivateRoutine(routines, currentRoutine.id, {
      actorName,
      isTemporary: currentRoutine.isTemporary,
      startDate: currentRoutine.startDate,
      endDate: currentRoutine.endDate,
    });
    if (!res.ok) {
      setValidationErrors(
        res.conflicts.map((c) => b(c.messageBn, c.messageEn, lang))
      );
      return;
    }
    setValidationErrors([]);
    onUpdateRoutines(
      res.routines,
      b(
        `"${currentRoutine.titleBn}" প্রকাশিত ও সক্রিয় (Active) হয়েছে! শিক্ষক ও শিক্ষার্থীরা এখন দেখতে পারবেন।`,
        `Routine "${currentRoutine.titleEn}" published & activated!`,
        lang
      )
    );
    setPreviewStudentMode(false);
  };

  const handleSaveDay = () => {
    if (!currentRoutine || !dayNameBn.trim()) return;
    const nextDays: RoutineDayConfig[] = editingDayId
      ? currentRoutine.days.map((d) =>
          d.id === editingDayId
            ? {
                ...d,
                nameBn: dayNameBn.trim(),
                nameEn: dayNameEn.trim() || dayNameBn.trim(),
                shortCode: (dayNameEn.trim() || dayNameBn.trim()).slice(0, 3).toUpperCase(),
              }
            : d
        )
      : [
          ...currentRoutine.days,
          {
            id: `day-${Date.now().toString().slice(-4)}`,
            nameBn: dayNameBn.trim(),
            nameEn: dayNameEn.trim() || dayNameBn.trim(),
            shortCode: (dayNameEn.trim() || dayNameBn.trim()).slice(0, 3).toUpperCase(),
            order: currentRoutine.days.length + 1,
            isActive: true,
          },
        ];
    const res = saveRoutineWithVersioning(
      routines,
      { ...currentRoutine, days: nextDays },
      actorName,
      editingDayId ? `Edited day ${dayNameBn}` : `Added day ${dayNameBn}`
    );
    onUpdateRoutines(res.routines, b('দিন হালনাগাদ হয়েছে।', 'Day list updated.', lang));
    setDayNameBn('');
    setDayNameEn('');
    setEditingDayId(null);
  };

  const handleDeleteDay = (dayId: string) => {
    if (!currentRoutine) return;
    const nextDays = currentRoutine.days.filter((d) => d.id !== dayId);
    const nextSchedules = currentRoutine.schedules.filter((s) => s.dayId !== dayId);
    const res = saveRoutineWithVersioning(
      routines,
      { ...currentRoutine, days: nextDays, schedules: nextSchedules },
      actorName,
      'Deleted a day'
    );
    onUpdateRoutines(res.routines, b('দিন অপসারিত হয়েছে।', 'Day removed.', lang));
  };

  const handleSavePeriod = () => {
    if (!currentRoutine || !periodNameBn.trim()) return;
    const dur = computeDurationMinutes(periodStart, periodEnd);
    if (dur <= 0) return;
    const nextPeriods: RoutinePeriodConfig[] = editingPeriodId
      ? currentRoutine.periods.map((p) =>
          p.id === editingPeriodId
            ? {
                ...p,
                periodNumber: periodNum,
                nameBn: periodNameBn.trim(),
                nameEn: `Period ${periodNum}`,
                startTime: periodStart,
                endTime: periodEnd,
                durationMins: dur,
              }
            : p
        )
      : [
          ...currentRoutine.periods,
          {
            id: `prd-${Date.now().toString().slice(-4)}`,
            periodNumber: periodNum,
            nameBn: periodNameBn.trim(),
            nameEn: `Period ${periodNum}`,
            startTime: periodStart,
            endTime: periodEnd,
            durationMins: dur,
          },
        ];
    const res = saveRoutineWithVersioning(
      routines,
      { ...currentRoutine, periods: nextPeriods },
      actorName,
      editingPeriodId ? `Edited period ${periodNum}` : `Added period ${periodNum}`
    );
    onUpdateRoutines(res.routines, b('পিরিয়ড সংরক্ষিত হয়েছে।', 'Period saved.', lang));
    setEditingPeriodId(null);
    setPeriodNum(nextPeriods.length + 1);
    setPeriodNameBn(`পিরিয়ড ${nextPeriods.length + 1}`);
  };

  const handleDeletePeriod = (periodId: string) => {
    if (!currentRoutine) return;
    const nextPeriods = currentRoutine.periods.filter((p) => p.id !== periodId);
    const nextSchedules = currentRoutine.schedules.filter((s) => s.periodId !== periodId);
    const res = saveRoutineWithVersioning(
      routines,
      { ...currentRoutine, periods: nextPeriods, schedules: nextSchedules },
      actorName,
      'Deleted a period'
    );
    onUpdateRoutines(res.routines, b('পিরিয়ড মুছে ফেলা হয়েছে।', 'Period deleted.', lang));
  };

  const counts = useMemo(
    () => ({
      total: schoolRoutines.length,
      Active: schoolRoutines.filter((r) => r.status === 'Active').length,
      Published: schoolRoutines.filter((r) => r.status === 'Published').length,
      Draft: schoolRoutines.filter((r) => r.status === 'Draft').length,
      Expired: schoolRoutines.filter((r) => r.status === 'Expired').length,
    }),
    [schoolRoutines]
  );

  return (
    <div className="space-y-5 text-xs">
      {/* 1. Routine Management Dashboard Header & Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              {b('ক্লাস রুটিন ও সময়সূচি ব্যবস্থাপনা কেন্দ্র', 'Master Routine Management System', lang)}
            </h1>
            <p className="text-slate-500 mt-0.5">
              {b(
                'Teaching Assignment-সংযুক্ত রুটিন তৈরি, Conflict যাচাই, Draft/Preview/Publish, সাময়িক রুটিন ও Version সংরক্ষণ।',
                'Create Weekly/Monthly/Annual routines with Teaching Assignments, conflict detection, temporary schedules & version control.',
                lang
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!readOnlyOversight && (
              <button
                type="button"
                onClick={() => setShowCreatePanel((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
              >
                <FilePlus2 className="w-4 h-4" />
                {b('Create Routine', 'Create Routine', lang)}
              </button>
            )}
            <button
              type="button"
              onClick={() => setPreviewStudentMode((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border font-semibold cursor-pointer ${
                previewStudentMode
                  ? 'bg-indigo-700 text-white border-indigo-700'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              {previewStudentMode ? b('Edit View-এ ফিরুন', 'Back to Editor', lang) : b('Preview (Student View)', 'Preview', lang)}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              {b('Print / PDF', 'Print / PDF', lang)}
            </button>
            {currentRoutine && (
              <button
                type="button"
                onClick={() =>
                  triggerDownloadCsv(
                    `${currentRoutine.className}-${currentRoutine.section}-routine.csv`,
                    exportRoutineToCsv(currentRoutine, school)
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                {b('Export CSV', 'Download / Export', lang)}
              </button>
            )}
          </div>
        </div>

        {/* Summary Counters + Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'Active', 'Published', 'Draft', 'Expired', 'Archived'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  filterStatus === st
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {st === 'all' ? `${b('সকল', 'All', lang)} (${counts.total})` : st}
                {st !== 'all' && st in counts ? ` (${counts[st as keyof typeof counts]})` : ''}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-slate-500 flex items-center gap-1">
              <span>{b('তারিখ:', 'Check Date:', lang)}</span>
              <input
                type="date"
                value={simTodayIso}
                onChange={(e) => setSimTodayIso(e.target.value)}
                className="h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                const res = checkAndExpireTemporaryRoutines(routines, simTodayIso);
                onUpdateRoutines(
                  res.routines,
                  res.expiredCount > 0
                    ? b(`${res.expiredCount} টি সাময়িক রুটিন মেয়াদোত্তীর্ণ (Expired) হয়েছে এবং পূর্বের রুটিন সচল হয়েছে।`, `${res.expiredCount} temporary routine(s) expired.`, lang)
                    : b('কোনো সাময়িক রুটিনের মেয়াদ শেষ হয়নি।', 'No temporary routines expired for selected date.', lang)
                );
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              {b('মেয়াদ যাচাই (Expire Check)', 'Check Expiry', lang)}
            </button>
          </div>
        </div>

        {/* All-School Multi-Filter Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
          <select
            aria-label="Filter by Class"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
          >
            <option value="all">{b('সকল শ্রেণি', 'All Classes', lang)}</option>
            {(school?.approvedClasses ?? ALL_CLASSES).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Filter by Section"
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
          >
            <option value="all">{b('সকল শাখা', 'All Sections', lang)}</option>
            {['ক (A)', 'খ (B)', 'শাপলা'].map((sec) => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>
          <select
            aria-label="Filter by Teacher"
            value={filterTeacherId}
            onChange={(e) => setFilterTeacherId(e.target.value)}
            className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
          >
            <option value="all">{b('সকল শিক্ষক', 'All Teachers', lang)}</option>
            {teachers
              .filter((t) => t.schoolId === schoolId)
              .map((t) => (
                <option key={t.id} value={t.id}>{t.nameBn}</option>
              ))}
          </select>
          <select
            aria-label="Filter by Subject"
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
          >
            <option value="all">{b('সকল বিষয়', 'All Subjects', lang)}</option>
            {subjectCatalog.map((s) => (
              <option key={s.nameEn} value={s.nameEn}>{b(s.nameBn, s.nameEn, lang)}</option>
            ))}
          </select>
          <select
            aria-label="Filter by Day"
            value={filterDayId}
            onChange={(e) => setFilterDayId(e.target.value)}
            className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
          >
            <option value="all">{b('সকল দিন', 'All Days', lang)}</option>
            {(currentRoutine?.days ?? []).map((d) => (
              <option key={d.id} value={d.id}>{b(d.nameBn, d.nameEn, lang)}</option>
            ))}
          </select>
          <select
            aria-label="Filter by Period"
            value={filterPeriodId}
            onChange={(e) => setFilterPeriodId(e.target.value)}
            className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
          >
            <option value="all">{b('সকল পিরিয়ড', 'All Periods', lang)}</option>
            {(currentRoutine?.periods ?? []).map((p) => (
              <option key={p.id} value={p.id}>{b(p.nameBn, p.nameEn, lang)}</option>
            ))}
          </select>
        </div>

        {/* Draft & Published Routine Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {filteredRoutines.map((r) => {
            const isSel = currentRoutine?.id === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSelectedRoutineId(r.id);
                  setValidationErrors([]);
                }}
                className={`text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                  isSel
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-500'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] uppercase text-slate-500">
                    {r.routineType} · v{r.version}
                  </span>
                  <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${STATUS_STYLE[r.status]}`}>
                    {r.status}
                  </span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white mt-1 truncate">
                  {b(r.titleBn, r.titleEn, lang)}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {r.className} ({r.section}) · {r.schedules.length} slots
                  {r.isTemporary && r.endDate ? ` · Ends ${r.endDate}` : ''}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Create Routine Form */}
      {showCreatePanel && !readOnlyOversight && (
        <form
          onSubmit={handleCreateRoutineSubmit}
          className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl p-5 space-y-4 no-print"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {b('নতুন রুটিন তৈরি করুন (Weekly / Monthly / Annual)', 'Create New Routine', lang)}
            </h2>
            <button
              type="button"
              onClick={() => setShowCreatePanel(false)}
              className="text-slate-500 hover:text-slate-800 cursor-pointer"
              aria-label="Close Create Routine"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block font-semibold mb-1">{b('রুটিনের নাম *', 'Routine Title *', lang)}</label>
              <input
                type="text"
                required
                value={newTitleBn}
                onChange={(e) => setNewTitleBn(e.target.value)}
                placeholder={b('যেমন: সাপ্তাহিক ক্লাস রুটিন — Class 3 (ক)', 'e.g. Weekly Routine Class 3 (A)', lang)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('রুটিনের ধরন', 'Routine Type', lang)}</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as RoutineType)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="weekly">{b('Weekly Routine (সাপ্তাহিক)', 'Weekly Routine', lang)}</option>
                <option value="monthly">{b('Monthly Routine (মাসিক)', 'Monthly Routine', lang)}</option>
                <option value="annual">{b('Annual Routine (বার্ষিক)', 'Annual Routine', lang)}</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('শিক্ষাবর্ষ', 'Academic Year', lang)}</label>
              <input
                type="text"
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            {newType === 'monthly' && (
              <div>
                <label className="block font-semibold mb-1">{b('মাস', 'Month', lang)}</label>
                <input
                  type="text"
                  value={newMonth}
                  onChange={(e) => setNewMonth(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            )}
            <div>
              <label className="block font-semibold mb-1">{b('শ্রেণি', 'Class', lang)}</label>
              <select
                value={newClass}
                onChange={(e) => setNewClass(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                {(school?.approvedClasses ?? ALL_CLASSES).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">{b('শাখা (Section)', 'Section', lang)}</label>
              <select
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="ক (A)">ক (A)</option>
                <option value="খ (B)">খ (B)</option>
                <option value="শাপলা">শাপলা</option>
              </select>
            </div>
            <div className="flex items-end pb-1.5">
              <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIsTemp}
                  onChange={(e) => setNewIsTemp(e.target.checked)}
                />
                {b('সাময়িক রুটিন (Temporary)', 'Temporary Routine', lang)}
              </label>
            </div>
            {newIsTemp && (
              <>
                <div>
                  <label className="block font-semibold mb-1">{b('শুরুর তারিখ', 'Start Date', lang)}</label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('শেষ তারিখ', 'End Date', lang)}</label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreatePanel(false)}
              className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
            >
              {b('বাতিল', 'Cancel', lang)}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
            >
              {b('Draft হিসেবে তৈরি করুন', 'Create Routine Draft', lang)}
            </button>
          </div>
        </form>
      )}

      {/* 3. Active Selected Routine Workspace */}
      {currentRoutine && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          {/* Preview Banner */}
          {previewStudentMode && (
            <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-wrap items-center justify-between gap-2 no-print">
              <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-semibold">
                <Eye className="w-4 h-4" />
                {b(
                  'Student Preview মোড — Publish করার পর শিক্ষার্থীরা ঠিক এভাবে সম্পূর্ণ টেবিল দেখতে পাবে।',
                  'Student View Preview — Students will see this exact table once published.',
                  lang
                )}
              </div>
              {!readOnlyOversight && (
                <button
                  type="button"
                  onClick={handlePublishRoutine}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                >
                  {b('এখনই Publish করুন', 'Publish Now', lang)}
                </button>
              )}
            </div>
          )}

          {/* Printable School + Routine Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-700 text-white font-bold flex items-center justify-center text-sm shrink-0">
                {school?.code.slice(0, 3) ?? 'SCH'}
              </div>
              <div>
                <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                  {school ? `${b(school.nameBn, school.nameEn, lang)} (${school.code})` : schoolId} ·{' '}
                  {currentRoutine.academicYear}
                  {currentRoutine.month ? ` · ${currentRoutine.month}` : ''}
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                  <span>{b(currentRoutine.titleBn, currentRoutine.titleEn, lang)}</span>
                  <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${STATUS_STYLE[currentRoutine.status]}`}>
                    {currentRoutine.status}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">v{currentRoutine.version}</span>
                </h2>
                <div className="text-slate-500 mt-0.5 flex flex-wrap items-center gap-3">
                  <span>
                    {b('শ্রেণি:', 'Class:', lang)} <strong>{currentRoutine.className} ({currentRoutine.section})</strong>
                  </span>
                  <span>
                    {b('ধরন:', 'Type:', lang)} <strong className="uppercase">{currentRoutine.routineType}</strong>
                  </span>
                  {currentRoutine.isTemporary && (
                    <span className="text-rose-700 dark:text-rose-400 font-semibold">
                      Temporary: {currentRoutine.startDate} → {currentRoutine.endDate}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!readOnlyOversight && !previewStudentMode && (
              <div className="flex flex-wrap items-center gap-2 no-print">
                <button
                  type="button"
                  onClick={() => setShowDayPeriodPanel((v) => !v)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {b('Day & Period ব্যবস্থাপনা', 'Days & Periods', lang)}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTempConfigPanel((v) => !v)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {b('Temporary / Extend', 'Temporary / Extend', lang)}
                </button>
                <button
                  type="button"
                  onClick={() => setShowVersionsPanel((v) => !v)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                >
                  <History className="w-3.5 h-3.5" />
                  {b(`Versions (${currentRoutine.versions.length})`, `Versions (${currentRoutine.versions.length})`, lang)}
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-300 text-amber-800 dark:text-amber-300 font-semibold cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {b('Save Draft', 'Save Draft', lang)}
                </button>
                {currentRoutine.status === 'Expired' || currentRoutine.status === 'Archived' ? (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateRoutines(
                        reactivateRoutine(routines, currentRoutine.id, actorName),
                        b('রুটিন পুনরায় সক্রিয় (Reactivated) হয়েছে।', 'Routine reactivated.', lang)
                      )
                    }
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {b('Reactivate', 'Reactivate', lang)}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePublishRoutine}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {b('Publish & Activate', 'Publish & Activate', lang)}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Validation & Conflict Banner */}
          {(validationErrors.length > 0 || routineWideConflicts.length > 0) && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 space-y-1 no-print">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                {b('Automatic Conflict Detection সতর্কতা:', 'Automatic Conflict Detection Alert:', lang)}
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {(validationErrors.length > 0
                  ? validationErrors
                  : routineWideConflicts.map((c) => b(c.messageBn, c.messageEn, lang))
                ).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Temporary Routine Activation / Extend / Restore Panel */}
          {showTempConfigPanel && !readOnlyOversight && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 no-print">
              <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>{b('সাময়িক রুটিন নিয়ন্ত্রণ (Start/End Date, Extend, Reactivate ও Restore)', 'Temporary Routine Controls', lang)}</span>
                <button type="button" onClick={() => setShowTempConfigPanel(false)} className="cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block font-semibold mb-1">{b('নতুন শেষ তারিখ (Extend End Date)', 'Extend End Date', lang)}</label>
                  <input
                    type="date"
                    value={extendDateInput}
                    onChange={(e) => setExtendDateInput(e.target.value)}
                    className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateRoutines(
                      extendTemporaryRoutine(routines, currentRoutine.id, extendDateInput, actorName),
                      b(`সাময়িক রুটিনের মেয়াদ ${extendDateInput} পর্যন্ত বাড়ানো হয়েছে।`, `Temporary routine extended to ${extendDateInput}.`, lang)
                    )
                  }
                  className="h-9 px-3.5 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer"
                >
                  {b('Extend & Activate', 'Extend & Activate', lang)}
                </button>
                {currentRoutine.previousActiveRoutineId && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateRoutines(
                        reactivateRoutine(routines, currentRoutine.previousActiveRoutineId!, actorName),
                        b('পূর্ববর্তী মূল রুটিন পুনরায় চালু করা হয়েছে।', 'Previous routine restored as Active.', lang)
                      )
                    }
                    className="h-9 px-3.5 rounded-lg border border-emerald-300 text-emerald-800 dark:text-emerald-300 font-semibold cursor-pointer"
                  >
                    {b('আগের রুটিন চালু করুন', 'Restore Previous Routine', lang)}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Day & Period Management Drawer */}
          {showDayPeriodPanel && !readOnlyOversight && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 no-print">
              {/* Day Management */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {b('Day Management (দিন যোগ / পরিবর্তন / মুছুন)', 'Day Management (Add / Edit / Delete)', lang)}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={dayNameBn}
                    onChange={(e) => setDayNameBn(e.target.value)}
                    placeholder={b('বাংলা নাম (যেমন: শনিবার)', 'Day Name (e.g. Saturday)', lang)}
                    className="h-8 px-2.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-1 min-w-[130px]"
                  />
                  <input
                    type="text"
                    value={dayNameEn}
                    onChange={(e) => setDayNameEn(e.target.value)}
                    placeholder="English Name"
                    className="h-8 px-2.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-1 min-w-[110px]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveDay}
                    className="h-8 px-3 rounded bg-blue-700 text-white font-semibold cursor-pointer"
                  >
                    {editingDayId ? b('Update Day', 'Update Day', lang) : b('+ Add Day', '+ Add Day', lang)}
                  </button>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                  {currentRoutine.days.map((d) => (
                    <div key={d.id} className="px-3 py-2 flex items-center justify-between gap-2">
                      <span className="font-semibold">{d.nameBn} ({d.nameEn})</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label={`Edit day ${d.nameEn}`}
                          onClick={() => {
                            setEditingDayId(d.id);
                            setDayNameBn(d.nameBn);
                            setDayNameEn(d.nameEn);
                          }}
                          className="p-1 text-blue-700 dark:text-blue-400 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete day ${d.nameEn}`}
                          onClick={() => handleDeleteDay(d.id)}
                          className="p-1 text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Period Management */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {b('Period Management (পিরিয়ড নম্বর, সময় ও সময়সীমা)', 'Period Management (Add / Edit / Delete)', lang)}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={periodNum}
                    onChange={(e) => setPeriodNum(Number(e.target.value))}
                    className="h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    title="Period Number"
                  />
                  <input
                    type="text"
                    value={periodNameBn}
                    onChange={(e) => setPeriodNameBn(e.target.value)}
                    placeholder={b('পিরিয়ডের নাম', 'Period Name', lang)}
                    className="h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sm:col-span-2"
                  />
                  <input
                    type="time"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                  <input
                    type="time"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-mono">
                    Duration: {computeDurationMinutes(periodStart, periodEnd)} mins
                  </span>
                  <button
                    type="button"
                    onClick={handleSavePeriod}
                    className="h-8 px-3 rounded bg-blue-700 text-white font-semibold cursor-pointer"
                  >
                    {editingPeriodId ? b('Update Period', 'Update Period', lang) : b('+ Add Period', '+ Add Period', lang)}
                  </button>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 max-h-44 overflow-y-auto">
                  {currentRoutine.periods.map((p) => (
                    <div key={p.id} className="px-3 py-2 flex items-center justify-between gap-2">
                      <span>
                        <strong>#{p.periodNumber} {p.nameBn}</strong> · {formatTimeDisplay(p.startTime)}–{formatTimeDisplay(p.endTime)} ({p.durationMins}m)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label={`Edit period ${p.periodNumber}`}
                          onClick={() => {
                            setEditingPeriodId(p.id);
                            setPeriodNum(p.periodNumber);
                            setPeriodNameBn(p.nameBn);
                            setPeriodStart(p.startTime);
                            setPeriodEnd(p.endTime);
                          }}
                          className="p-1 text-blue-700 dark:text-blue-400 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete period ${p.periodNumber}`}
                          onClick={() => handleDeletePeriod(p.id)}
                          className="p-1 text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Version History Drawer */}
          {showVersionsPanel && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5 no-print">
              <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>{b('রুটিন পরিবর্তন ও Version ইতিহাস (Version History & Restore)', 'Routine Version History & Restore', lang)}</span>
                <button type="button" onClick={() => setShowVersionsPanel(false)} className="cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                {currentRoutine.versions.map((ver) => (
                  <div key={`${ver.versionNumber}-${ver.savedAt}`} className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        v{ver.versionNumber} · {ver.status} · {ver.summaryNote}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {ver.savedBy} · {ver.savedAt} · {ver.schedules.length} slots
                      </div>
                    </div>
                    {!readOnlyOversight && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateRoutines(
                            restoreRoutineVersion(routines, currentRoutine.id, ver.versionNumber, actorName),
                            b(`রুটিন v${ver.versionNumber}-এ পুনরুদ্ধার (Restored) হয়েছে।`, `Restored routine to v${ver.versionNumber}.`, lang)
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-blue-300 text-blue-700 dark:text-blue-300 font-semibold cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        {b(`Restore v${ver.versionNumber}`, `Restore v${ver.versionNumber}`, lang)}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Master Day × Period Interactive Routine Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full min-w-[820px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200 w-36">
                    {b('দিন / বার', 'Day', lang)}
                  </th>
                  {visiblePeriods.map((prd) => (
                    <th key={prd.id} className="py-3 px-3 font-bold text-slate-700 dark:text-slate-200">
                      <div>{b(prd.nameBn, prd.nameEn, lang)}</div>
                      <div className="text-[11px] font-mono font-normal text-slate-500">
                        {formatTimeDisplay(prd.startTime)} – {formatTimeDisplay(prd.endTime)} ({prd.durationMins}m)
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visibleDays.map((day) => (
                  <tr key={day.id}>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/30">
                      <div>{b(day.nameBn, day.nameEn, lang)}</div>
                      <div className="text-[11px] font-mono text-slate-400">{day.shortCode}</div>
                    </td>
                    {visiblePeriods.map((prd) => {
                      const cell = currentRoutine.schedules.find(
                        (s) => s.dayId === day.id && s.periodId === prd.id
                      );
                      const matchesFilter =
                        !cell ||
                        ((filterTeacherId === 'all' || cell.teacherId === filterTeacherId) &&
                          (filterSubject === 'all' ||
                            cell.subjectEn === filterSubject ||
                            cell.subjectBn === filterSubject));

                      return (
                        <td
                          key={prd.id}
                          className="p-2 align-top border-l border-slate-100 dark:border-slate-800"
                        >
                          <button
                            type="button"
                            disabled={readOnlyOversight || previewStudentMode}
                            aria-label={
                              cell
                                ? `${day.nameEn} ${prd.nameEn}: ${cell.subjectEn}`
                                : `Add schedule ${day.nameEn} ${prd.nameEn}`
                            }
                            onClick={() => openCellEditor(day, prd)}
                            className={`w-full text-left p-2.5 rounded-lg border transition-colors min-h-[78px] ${
                              cell && matchesFilter
                                ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 hover:border-blue-500'
                                : 'bg-slate-50/50 dark:bg-slate-800/20 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400'
                            } ${readOnlyOversight || previewStudentMode ? 'cursor-default' : 'cursor-pointer'}`}
                          >
                            {cell && matchesFilter ? (
                              <div className="space-y-0.5">
                                <div className="font-bold text-blue-800 dark:text-blue-300">
                                  {b(cell.subjectBn, cell.subjectEn, lang)}
                                </div>
                                <div className="text-[11px] text-slate-700 dark:text-slate-300 truncate">
                                  {cell.teacherName}
                                </div>
                                <div className="text-[11px] font-mono text-slate-500">
                                  Rm {cell.room} · {formatTimeDisplay(cell.startTime)}
                                </div>
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-slate-400 text-[11px]">
                                {previewStudentMode || readOnlyOversight
                                  ? '—'
                                  : b('+ ক্লাস যোগ করুন', '+ Add Class', lang)}
                              </div>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Cell Schedule Editor Modal (Connected to Teaching Assignments & Live Conflict Check) */}
      {editingCellTarget && currentRoutine && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 no-print"
          role="dialog"
          aria-modal="true"
          aria-label="Edit Routine Schedule Cell"
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {b('ক্লাস রুটিন সেল নির্ধারণ / পরিবর্তন', 'Add / Edit Schedule Slot', lang)}
              </h3>
              <button
                type="button"
                aria-label="Close cell editor"
                onClick={() => setEditingCellTarget(null)}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 flex flex-wrap gap-3">
              <span>
                <strong>{b('শ্রেণি:', 'Class:', lang)}</strong> {currentRoutine.className} ({currentRoutine.section})
              </span>
              <span>
                <strong>{b('দিন:', 'Day:', lang)}</strong>{' '}
                {currentRoutine.days.find((d) => d.id === editingCellTarget.dayId)?.nameBn}
              </span>
              <span>
                <strong>{b('পিরিয়ড:', 'Period:', lang)}</strong>{' '}
                {currentRoutine.periods.find((p) => p.id === editingCellTarget.periodId)?.nameBn}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">{b('বিষয় (Subject) *', 'Subject *', lang)}</label>
                <select
                  value={cellSubjectEn}
                  onChange={(e) => handleCellSubjectChange(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {subjectCatalog.map((s) => (
                    <option key={s.nameEn} value={s.nameEn}>
                      {b(s.nameBn, s.nameEn, lang)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  {b('শিক্ষক (Teaching Assignment থেকে)', 'Teacher (Connected to Assignment)', lang)} *
                </label>
                <select
                  value={cellTeacherId}
                  onChange={(e) => setCellTeacherId(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="">{b('-- শিক্ষক নির্বাচন করুন --', '-- Select Teacher --', lang)}</option>
                  {cellTeacherOptions.assigned.length > 0 && (
                    <optgroup label={b('Assigned Teachers ✓', 'Assigned Teachers ✓', lang)}>
                      {cellTeacherOptions.assigned.map((t) => (
                        <option key={t.id} value={t.id}>
                          ✓ {t.nameBn}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {cellTeacherOptions.otherSchoolTeachers.length > 0 && (
                    <optgroup label={b('অন্যান্য শিক্ষক (Unassigned)', 'Other School Teachers', lang)}>
                      {cellTeacherOptions.otherSchoolTeachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nameBn}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">{b('শুরুর সময় (Start Time)', 'Start Time', lang)}</label>
                <input
                  type="time"
                  value={cellStartTime}
                  onChange={(e) => setCellStartTime(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">{b('শেষ সময় (End Time)', 'End Time', lang)}</label>
                <input
                  type="time"
                  value={cellEndTime}
                  onChange={(e) => setCellEndTime(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">{b('কক্ষ নম্বর (Room)', 'Room Number', lang)}</label>
                <input
                  type="text"
                  value={cellRoom}
                  onChange={(e) => setCellRoom(e.target.value)}
                  placeholder="204"
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">{b('নোট (ঐচ্ছিক)', 'Note (Optional)', lang)}</label>
                <input
                  type="text"
                  value={cellNote}
                  onChange={(e) => setCellNote(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            {cellTeacherOptions.assigned.length === 0 && (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                {b(
                  `${currentRoutine.className}-এর ${cellSubjectEn} বিষয়ে কোনো নির্ধারিত শিক্ষক Teaching Assignment-এ পাওয়া যায়নি।`,
                  `No pre-assigned teacher found in Teaching Assignments for ${currentRoutine.className} ${cellSubjectEn}.`,
                  lang
                )}
              </div>
            )}

            {/* Real-time Conflict Detection Feedback */}
            {liveCellConflicts.length > 0 ? (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  {b('Conflict পাওয়া গেছে — সংরক্ষণ করা যাবে না:', 'Conflict Detected — Cannot Save:', lang)}
                </div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {liveCellConflicts.map((c, idx) => (
                    <li key={idx}>{b(c.messageBn, c.messageEn, lang)}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                {b('কোনো Teacher / Class / Room Conflict নেই — সংরক্ষণযোগ্য ✓', 'Zero Conflicts Detected — Ready to Save ✓', lang)}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              {editingCellTarget.existing ? (
                <button
                  type="button"
                  onClick={handleClearCell}
                  className="px-3 py-2 rounded-lg border border-red-200 text-red-700 dark:text-red-300 font-semibold cursor-pointer"
                >
                  {b('স্লট মুছুন', 'Clear Slot', lang)}
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCellTarget(null)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                >
                  {b('বাতিল', 'Cancel', lang)}
                </button>
                <button
                  type="button"
                  disabled={liveCellConflicts.length > 0}
                  onClick={handleSaveCell}
                  className={`px-4 py-2 rounded-lg font-semibold text-white ${
                    liveCellConflicts.length > 0
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-blue-700 hover:bg-blue-800 cursor-pointer'
                  }`}
                >
                  {b('স্লট সংরক্ষণ করুন', 'Save Schedule Slot', lang)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
