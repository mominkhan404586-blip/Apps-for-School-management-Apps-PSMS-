import React from 'react';
import { ClipboardList, FileBarChart2, Printer, X } from 'lucide-react';
import type { AuditLogEntry, Language, SchoolRecord, StudentRecord, TeacherRecord } from '../types';
import { b } from '../i18n/translations';

export type EntityModalTarget =
  | { kind: 'school'; mode: 'history' | 'report'; entity: SchoolRecord }
  | { kind: 'teacher'; mode: 'history' | 'report'; entity: TeacherRecord }
  | { kind: 'student'; mode: 'history' | 'report'; entity: StudentRecord };

interface EntityReportAndActivityModalProps {
  target: EntityModalTarget | null;
  lang: Language;
  auditLogs: AuditLogEntry[];
  onClose: () => void;
}

export const EntityReportAndActivityModal: React.FC<EntityReportAndActivityModalProps> = ({
  target,
  lang,
  auditLogs,
  onClose,
}) => {
  if (!target) return null;

  const matchingLogs = auditLogs.filter((log) => {
    if (target.kind === 'school') {
      return log.schoolId === target.entity.id || log.targetName.includes(target.entity.code);
    }
    if (target.kind === 'teacher') {
      return (
        log.teacherId === target.entity.id ||
        log.targetName.includes(target.entity.teacherCode) ||
        log.targetName.includes(target.entity.nameBn)
      );
    }
    return (
      log.studentId === target.entity.id || log.targetName.includes(target.entity.permanentId)
    );
  });

  const titleBn =
    target.mode === 'history'
      ? `${target.entity.nameBn} — Activity & Audit History`
      : `${target.entity.nameBn} — সারসংক্ষেপ রিপোর্ট (Governance Report)`;

  const titleEn =
    target.mode === 'history'
      ? `${target.entity.nameEn} — Activity History`
      : `${target.entity.nameEn} — Governance Summary Report`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-5 text-xs"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            {target.mode === 'history' ? (
              <ClipboardList className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0" />
            ) : (
              <FileBarChart2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
            )}
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {b(titleBn, titleEn, lang)}
              </h3>
              <p className="text-slate-500">
                {target.kind === 'school'
                  ? `School ID: ${target.entity.code} · EIIN: ${target.entity.eiin}`
                  : target.kind === 'teacher'
                    ? `Teacher ID: ${target.entity.teacherCode} · ${target.entity.schoolNameBn}`
                    : `Student ID: ${target.entity.permanentId} · ${target.entity.schoolNameBn}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span>{b('প্রিন্ট', 'Print', lang)}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {target.mode === 'history' ? (
          <div className="space-y-4">
            {target.kind === 'teacher' && (target.entity.activityHistory ?? []).length > 0 && (
              <div className="space-y-2">
                <div className="font-bold text-slate-900 dark:text-white">
                  {b('শিক্ষকের কার্যক্রম লগ (Activity Feed)', 'Teacher Activity Feed', lang)}
                </div>
                <ul className="space-y-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                  {target.entity.activityHistory!.map((act, idx) => (
                    <li key={idx} className="text-slate-700 dark:text-slate-300">
                      • {act}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {target.kind === 'student' && (
              <div className="space-y-2">
                <div className="font-bold text-slate-900 dark:text-white">
                  {b('ভর্তি ও স্থানান্তর ইতিহাস', 'Admission & Transfer History', lang)}
                </div>
                <ul className="space-y-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                  {target.entity.admissionHistory.map((act, idx) => (
                    <li key={idx} className="text-slate-700 dark:text-slate-300">
                      • {act}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <div className="font-bold text-slate-900 dark:text-white">
                {b('অপরিবর্তনীয় প্রশাসনিক অডিট লগ', 'Immutable Audit Trail', lang)} ({matchingLogs.length})
              </div>
              {matchingLogs.length === 0 ? (
                <p className="text-slate-500 py-3">
                  {b('কোনো অতিরিক্ত অডিট রেকর্ড পাওয়া যায়নি।', 'No audit log entries found.', lang)}
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
                  {matchingLogs.map((log) => (
                    <div key={log.id} className="p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{log.what}</span>
                        <span className="font-mono text-slate-400">{log.when}</span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-300">
                        {log.who} · <span className="font-mono">{log.oldValue} → {log.newValue}</span>
                      </div>
                      {log.reason && <div className="text-slate-500">Note: {log.reason}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {target.kind === 'school' && (
                <>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-slate-500">School Status</div>
                    <div className="font-bold text-sm mt-0.5">{target.entity.status}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-slate-500">Verification / Approval</div>
                    <div className="font-bold text-sm mt-0.5">
                      {target.entity.verificationStatus ?? 'verified'} / {target.entity.approvalStatus ?? 'approved'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-slate-500">{b('উপস্থিতির হার', 'Attendance Rate', lang)}</div>
                    <div className="font-bold text-sm tabular-nums mt-0.5">{target.entity.attendanceRate}%</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-slate-500">{b('মোট শিক্ষার্থী / শিক্ষক', 'Students / Teachers', lang)}</div>
                    <div className="font-bold text-sm tabular-nums mt-0.5">
                      {target.entity.studentCount} / {target.entity.teacherCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-slate-500">{b('স্থাপিত সন', 'Established Year', lang)}</div>
                    <div className="font-bold text-sm mt-0.5">{target.entity.establishedYear ?? '—'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-slate-500">School Admin</div>
                    <div className="font-bold text-sm mt-0.5">{target.entity.headTeacher}</div>
                  </div>
                </>
              )}
              {target.kind === 'teacher' && (
                <>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-slate-500">Status / Verification</div>
                    <div className="font-bold text-sm mt-0.5">
                      {target.entity.status} / {target.entity.verificationStatus ?? 'verified'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-slate-500">Designation</div>
                    <div className="font-bold text-sm mt-0.5">{target.entity.designation}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-slate-500">Performance Score</div>
                    <div className="font-bold text-sm tabular-nums text-emerald-700 mt-0.5">
                      {target.entity.performanceScore}/100
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-slate-500">Subjects</div>
                    <div className="font-bold text-sm mt-0.5">{target.entity.subjects.join(', ')}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-slate-500">Re-issued ID Count</div>
                    <div className="font-bold text-sm tabular-nums mt-0.5">{target.entity.reissuedIdCount ?? 0}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-slate-500">Contact</div>
                    <div className="font-mono font-bold text-sm mt-0.5">{target.entity.mobile}</div>
                  </div>
                </>
              )}
              {target.kind === 'student' && (
                <>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-slate-500">Class / Section / Roll</div>
                    <div className="font-bold text-sm mt-0.5">
                      {target.entity.className} ({target.entity.section}) · #{target.entity.roll}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-slate-500">Exam Result / GPA</div>
                    <div className="font-bold text-sm text-emerald-700 mt-0.5">
                      {target.entity.examResultLabel ?? target.entity.gpa ?? 'N/A'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-slate-500">Attendance</div>
                    <div className="font-bold text-sm tabular-nums mt-0.5">{target.entity.attendancePct}%</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-slate-500">Status / Verification</div>
                    <div className="font-bold text-sm mt-0.5">
                      {target.entity.status} / {target.entity.verificationStatus ?? 'verified'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-slate-500">Digital ID Serial</div>
                    <div className="font-mono font-bold text-sm mt-0.5">
                      {target.entity.digitalIdSerial ?? 'Standard QR'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-slate-500">Guardian Contact</div>
                    <div className="font-mono font-bold text-sm mt-0.5">{target.entity.guardianMobile}</div>
                  </div>
                </>
              )}
            </div>
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
              {b(
                `অডিট ট্রেইল সারাংশ: মোট ${matchingLogs.length}টি প্রশাসনিক কার্যক্রম ও যাচাই রেকর্ড এই প্রোফাইলের সাথে সংযুক্ত রয়েছে।`,
                `Audit Summary: ${matchingLogs.length} verified administrative & audit records linked to this profile.`,
                lang
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
