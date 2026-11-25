import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, MessageSquareText, Radio, Send, Users } from 'lucide-react';
import type { Language, Role, SchoolRecord, StudentRecord, TeacherRecord } from '../types';
import { b } from '../i18n/translations';
import { resolveApiUrl } from '../utils/deploymentConfig';
import {
  buildAudienceSmsRecipients,
  sanitizeSmsBody,
  type BulkSmsCategory,
  type BulkSmsLogEntry,
  type SmsGatewayProvider,
} from '../utils/bulkSmsEngine';

interface BulkSmsDispatchPanelProps {
  lang: Language;
  role: Role;
  actorName: string;
  school: SchoolRecord;
  students: StudentRecord[];
  teachers: TeacherRecord[];
  absentStudentIds?: string[];
  onSmsDispatched?: (log: BulkSmsLogEntry) => void;
}

export const BulkSmsDispatchPanel: React.FC<BulkSmsDispatchPanelProps> = ({
  lang,
  role,
  actorName,
  school,
  students,
  teachers,
  absentStudentIds = [],
  onSmsDispatched,
}) => {
  const [audience, setAudience] = useState<'all_guardians' | 'absent_guardians' | 'class_guardians' | 'all_teachers'>(
    'all_guardians'
  );
  const [classFilter, setClassFilter] = useState('all');
  const [category, setCategory] = useState<BulkSmsCategory>('emergency_notice');
  const [message, setMessage] = useState(
    b(
      `[${school.nameBn}] জরুরি নোটিশ: আগামীকাল বিদ্যালয়ের কার্যক্রম যথাসময়ে চলবে।`,
      `[${school.nameEn}] Urgent Notice: School activities will proceed as scheduled tomorrow.`,
      lang
    )
  );
  const [sending, setSending] = useState(false);
  const [providerStatus, setProviderStatus] = useState<{
    provider: SmsGatewayProvider;
    twilioConfigured: boolean;
    bdGatewayConfigured: boolean;
    fromLabel: string;
  }>({
    provider: 'preview_sandbox',
    twilioConfigured: false,
    bdGatewayConfigured: false,
    fromLabel: 'PSMS-BD',
  });
  const [smsLogs, setSmsLogs] = useState<BulkSmsLogEntry[]>([]);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);

  const classOptions = useMemo(
    () =>
      Array.from(
        new Set(
          students
            .filter((s) => s.schoolId === school.id && s.status !== 'deactivated')
            .map((s) => s.className)
        )
      ),
    [students, school.id]
  );

  const recipients = useMemo(
    () =>
      buildAudienceSmsRecipients({
        schoolId: school.id,
        audience,
        classFilter,
        students,
        teachers,
        absentStudentIds,
      }),
    [school.id, audience, classFilter, students, teachers, absentStudentIds]
  );

  const bodyCheck = useMemo(() => sanitizeSmsBody(message), [message]);

  useEffect(() => {
    let active = true;
    fetch(resolveApiUrl('/api/sms/config-status'))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data?.provider) {
          setProviderStatus(data);
        }
      })
      .catch(() => {});

    fetch(resolveApiUrl(`/api/sms/history?schoolId=${encodeURIComponent(school.id)}`))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && Array.isArray(data?.logs)) {
          setSmsLogs(data.logs);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [school.id]);

  const handleSendBulkSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispatchError(null);
    setDispatchSuccess(null);

    if (!bodyCheck.ok) {
      setDispatchError(bodyCheck.error || b('SMS বার্তা লিখুন।', 'Enter a valid SMS body.', lang));
      return;
    }
    if (recipients.length === 0) {
      setDispatchError(
        b(
          'নির্বাচিত গ্রুপে কোনো বৈধ মোবাইল নম্বর পাওয়া যায়নি।',
          'No valid recipient mobile numbers found for this target audience.',
          lang
        )
      );
      return;
    }

    setSending(true);
    try {
      const targetLabel =
        audience === 'all_guardians'
          ? b(`সকল অভিভাবক (${recipients.length} জন)`, `All Guardians (${recipients.length})`, lang)
          : audience === 'absent_guardians'
            ? b(`অনুপস্থিত অভিভাবক (${recipients.length} জন)`, `Absent Guardians (${recipients.length})`, lang)
            : audience === 'all_teachers'
              ? b(`সকল শিক্ষক (${recipients.length} জন)`, `All Teachers (${recipients.length})`, lang)
              : b(`${classFilter} অভিভাবক (${recipients.length} জন)`, `${classFilter} Guardians (${recipients.length})`, lang);

      const resp = await fetch(resolveApiUrl('/api/sms/send-bulk'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          category,
          sentByRole: role,
          sentByName: actorName,
          message: bodyCheck.text,
          targetsSummary: targetLabel,
          recipients,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.ok) {
        setDispatchError(data?.error || b('SMS পাঠানো ব্যর্থ হয়েছে।', 'Failed to dispatch bulk SMS.', lang));
        return;
      }

      if (data.log) {
        setSmsLogs((prev) => [data.log, ...prev]);
        onSmsDispatched?.(data.log);
      }
      setDispatchSuccess(
        b(
          `${data.log.deliveredCount}/${data.log.recipientCount} নম্বরে Bulk SMS (${data.provider}) সফলভাবে প্রসেস হয়েছে।`,
          `Bulk SMS dispatched to ${data.log.deliveredCount}/${data.log.recipientCount} recipients via ${data.provider}.`,
          lang
        )
      );
    } catch {
      setDispatchError(
        b(
          'সার্ভারের সাথে সংযোগ পাওয়া যায়নি — নেটওয়ার্ক পরীক্ষা করে পুনরায় চেষ্টা করুন।',
          'Could not reach Bulk SMS endpoint. Please verify server connectivity.',
          lang
        )
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div data-testid="bulk-sms-dispatch-panel" className="space-y-5 text-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquareText className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              {b('Bulk SMS সতর্কতা ও জরুরি বিজ্ঞপ্তি গেটওয়ে', 'Bulk SMS Emergency & Absence Gateway', lang)}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {b(
                'Twilio অথবা স্থানীয় বাংলাদেশি SMS API দিয়ে অভিভাবক ও শিক্ষকদের তাৎক্ষণিক SMS পাঠান।',
                'Dispatch parent absence alerts and school emergency broadcasts via Twilio or BD SMS API.',
                lang
              )}
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
            <Radio className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {providerStatus.provider === 'twilio'
                ? `Twilio Live (${providerStatus.fromLabel})`
                : providerStatus.provider === 'bd_sms_gateway'
                  ? `BD SMS Gateway (${providerStatus.fromLabel})`
                  : b('Sandbox Preview (Env Key দিয়ে লাইভ করুন)', 'Sandbox Mode (Add TWILIO_* / BD_SMS_* env)', lang)}
            </span>
          </div>
        </div>

        <form onSubmit={(e) => void handleSendBulkSms(e)} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                {b('প্রাপক গ্রুপ (Audience)', 'Recipient Group', lang)}
              </label>
              <select
                data-testid="bulk-sms-audience-select"
                value={audience}
                onChange={(e) =>
                  setAudience(
                    e.target.value as 'all_guardians' | 'absent_guardians' | 'class_guardians' | 'all_teachers'
                  )
                }
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold outline-none"
              >
                <option value="all_guardians">{b('সকল অভিভাবক', 'All School Guardians', lang)}</option>
                <option value="absent_guardians">{b('আজকের অনুপস্থিত অভিভাবক', 'Absent Student Guardians', lang)}</option>
                <option value="class_guardians">{b('নির্দিষ্ট শ্রেণির অভিভাবক', 'Specific Class Guardians', lang)}</option>
                <option value="all_teachers">{b('সকল শিক্ষক', 'All School Teachers', lang)}</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                {b('বার্তার ধরন (Category)', 'Alert Category', lang)}
              </label>
              <select
                data-testid="bulk-sms-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as BulkSmsCategory)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold outline-none"
              >
                <option value="emergency_notice">{b('জরুরি বিজ্ঞপ্তি (Emergency)', 'Emergency Notice', lang)}</option>
                <option value="absence_alert">{b('অনুপস্থিতি সতর্কতা (Absence)', 'Student Absence Alert', lang)}</option>
                <option value="general_notice">{b('সাধারণ বিদ্যালয় তথ্য', 'General Notice', lang)}</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                {audience === 'class_guardians'
                  ? b('শ্রেণি নির্বাচন', 'Filter Class', lang)
                  : b('বৈধ প্রাপক সংখ্যা', 'Resolved Recipients', lang)}
              </label>
              {audience === 'class_guardians' ? (
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold outline-none"
                >
                  <option value="all">{b('সকল শ্রেণি', 'All Classes', lang)}</option>
                  {classOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between font-mono font-bold tabular-nums">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    {recipients.length}
                  </span>
                  <span className="text-[11px] text-slate-500">{b('ভেরিফাইড নম্বর', 'valid numbers', lang)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Templates */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">
              {b('কুইক টেমপ্লেট:', 'Quick Templates:', lang)}
            </span>
            <button
              type="button"
              onClick={() => {
                setCategory('emergency_notice');
                setMessage(
                  b(
                    `[${school.nameBn}] জরুরি ঘোষণা: প্রাকৃতিক দুর্যোগের কারণে আগামীকাল বিদ্যালয় বন্ধ থাকবে।`,
                    `[${school.nameEn}] EMERGENCY: School remains closed tomorrow due to severe weather alert.`,
                    lang
                  )
                );
              }}
              className="px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-900 bg-red-50/70 dark:bg-red-950/30 text-red-700 dark:text-red-300 font-semibold cursor-pointer"
            >
              {b('জরুরি ছুটি / আবহাওয়া', 'Emergency Closure', lang)}
            </button>
            <button
              type="button"
              onClick={() => {
                setCategory('absence_alert');
                setMessage(
                  b(
                    `[${school.nameBn}] উপস্থিতি বার্তা: আপনার সন্তান আজ বিদ্যালয়ে অনুপস্থিত রয়েছে। অনুগ্রহ করে কারণ জানান।`,
                    `[${school.nameEn}] Absence Alert: Your child is absent today. Please notify the class teacher.`,
                    lang
                  )
                );
              }}
              className="px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 font-semibold cursor-pointer"
            >
              {b('অনুপস্থিতি বার্তা', 'Absence Alert', lang)}
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700 dark:text-slate-200">
                {b('SMS বার্তা (বাংলা বা ইংরেজি)', 'SMS Message Body', lang)}
              </label>
              <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                {message.length}/480 · {bodyCheck.segmentCount} {b('সেগমেন্ট', 'SMS seg', lang)}
              </span>
            </div>
            <textarea
              data-testid="bulk-sms-message-input"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600"
            />
          </div>

          {dispatchError && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{dispatchError}</span>
            </div>
          )}

          {dispatchSuccess && (
            <div role="status" data-testid="bulk-sms-success-banner" className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{dispatchSuccess}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-slate-500">
              {b(
                `মোট ${recipients.length} টি যাচাইকৃত মোবাইল নম্বরে পাঠানো হবে`,
                `Will dispatch to ${recipients.length} deduplicated verified mobile number(s)`,
                lang
              )}
            </span>
            <button
              type="submit"
              data-testid="bulk-sms-send-btn"
              disabled={sending || recipients.length === 0 || !bodyCheck.ok}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold cursor-pointer"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending
                ? b('পাঠানো হচ্ছে...', 'Sending SMS...', lang)
                : b(`Bulk SMS পাঠান (${recipients.length})`, `Send Bulk SMS (${recipients.length})`, lang)}
            </button>
          </div>
        </form>
      </div>

      {/* Persistent SMS Delivery Log */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {b('লাইভ SMS ও নোটিফিকেশন ডেলিভারি হিস্ট্রি', 'Live Bulk SMS Delivery History', lang)}
          </h3>
          <span className="font-mono text-[11px] text-slate-500 tabular-nums">
            {smsLogs.length} {b('টি লগ', 'dispatches', lang)}
          </span>
        </div>

        {smsLogs.length === 0 ? (
          <p className="text-slate-500 py-3">
            {b(
              'এখনও কোনো Bulk SMS পাঠানো হয়নি। উপরের ফরম থেকে প্রথম সতর্কবার্তা পাঠান।',
              'No bulk SMS broadcasts recorded yet. Send an alert above to log delivery receipts.',
              lang
            )}
          </p>
        ) : (
          <div data-testid="bulk-sms-history-list" className="divide-y divide-slate-100 dark:divide-slate-800">
            {smsLogs.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <div className="font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                    <span>{log.targetsSummary}</span>
                    <span className="font-mono text-[11px] text-blue-700 dark:text-blue-400">
                      [{log.provider}]
                    </span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">{log.message}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {log.sentByName} · {log.createdAtIso.replace('T', ' ').slice(0, 16)}
                  </div>
                </div>
                <div className="text-right shrink-0 font-mono tabular-nums">
                  <div className="font-bold text-emerald-700 dark:text-emerald-400">
                    {log.deliveredCount}/{log.recipientCount} Delivered
                  </div>
                  {log.failedCount > 0 && (
                    <div className="text-rose-600 dark:text-rose-400 font-semibold">
                      {log.failedCount} Failed
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
