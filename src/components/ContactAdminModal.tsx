import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Mail,
  Megaphone,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { Language, Role } from '../types';
import { b } from '../i18n/translations';
import { CONTACT_ADMIN_CHANNELS } from '../utils/adminAndTeacherIdentityEngine';

interface ContactAdminModalProps {
  open: boolean;
  lang: Language;
  role: Role | 'guest';
  defaultSenderName?: string;
  defaultContact?: string;
  schoolId?: string;
  onClose: () => void;
  onNavigateToNotices: () => void;
  onSubmitMessage: (payload: {
    senderName: string;
    senderRole: Role | 'guest';
    senderSchoolId?: string;
    senderContact: string;
    subject: string;
    message: string;
  }) => void;
}

export const ContactAdminModal: React.FC<ContactAdminModalProps> = ({
  open,
  lang,
  role,
  defaultSenderName = '',
  defaultContact = '',
  schoolId,
  onClose,
  onNavigateToNotices,
  onSubmitMessage,
}) => {
  const [messageOpen, setMessageOpen] = useState(false);
  const [senderName, setSenderName] = useState(defaultSenderName);
  const [senderContact, setSenderContact] = useState(defaultContact);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const copyText = (key: string, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    onSubmitMessage({
      senderName: senderName.trim() || (role === 'guest' ? 'Portal Visitor' : role),
      senderRole: role,
      senderSchoolId: schoolId,
      senderContact: senderContact.trim() || 'Not provided',
      subject: subject.trim(),
      message: message.trim(),
    });
    setSubmitted(true);
    setSubject('');
    setMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-admin-modal-title"
        className="w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
      >
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-900 to-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 id="contact-admin-modal-title" className="text-base font-bold">
                {b('Admin-এর সাথে যোগাযোগ করুন', 'Contact System Admin', lang)}
              </h2>
              <p className="text-[11px] text-slate-300">
                {b('কেন্দ্রীয় প্রশাসন সহায়তা চ্যানেল (গোপনীয়তা সংরক্ষিত)', 'Central Administration Support Channels (Identity Protected)', lang)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={b('বন্ধ করুন', 'Close', lang)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 text-xs">
          {/* Channel 1: Notice */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigateToNotices();
            }}
            className="w-full p-3.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/30 hover:bg-blue-100/70 dark:hover:bg-blue-950/50 flex items-center justify-between gap-3 text-left cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">
                  1. {b('নোটিশ (Notice Board)', 'Notice', lang)}
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  {b('সকল অফিশিয়াল কেন্দ্রীয় নোটিশ ও নির্দেশনা দেখুন', 'Read official central notices & announcements', lang)}
                </div>
              </div>
            </div>
            <span className="font-semibold text-blue-700 dark:text-blue-300 shrink-0">
              {b('খুলুন →', 'Open →', lang)}
            </span>
          </button>

          {/* Channel 2: Facebook Address */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 font-extrabold text-sm">
                f
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-900 dark:text-white">
                  2. Facebook Address
                </div>
                <div className="text-slate-500 font-mono truncate">
                  {CONTACT_ADMIN_CHANNELS.facebookUrl}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => copyText('fb', CONTACT_ADMIN_CHANNELS.facebookUrl)}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title="Copy Facebook URL"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <a
                href={CONTACT_ADMIN_CHANNELS.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold"
              >
                <span>{b('ভিজিট', 'Visit', lang)}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Channel 3: Mobile Number */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">
                  3. {b('মোবাইল নম্বর (Mobile Number)', 'Mobile Number', lang)}
                </div>
                <div className="text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {CONTACT_ADMIN_CHANNELS.mobileNumber}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => copyText('mob', CONTACT_ADMIN_CHANNELS.mobileNumber)}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title="Copy Mobile Number"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <a
                href={`tel:${CONTACT_ADMIN_CHANNELS.mobileNumber}`}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
              >
                {b('কল করুন', 'Call', lang)}
              </a>
            </div>
          </div>

          {/* Channel 4: WhatsApp */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-600 text-white flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">
                  4. WhatsApp
                </div>
                <div className="text-sm font-mono font-bold text-green-700 dark:text-green-400">
                  {CONTACT_ADMIN_CHANNELS.whatsappNumber}
                </div>
              </div>
            </div>
            <a
              href={CONTACT_ADMIN_CHANNELS.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold shrink-0"
            >
              <span>WhatsApp</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Channel 5: Contact Admin Direct Message Form */}
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setMessageOpen((p) => !p);
                setSubmitted(false);
              }}
              className="w-full p-3.5 flex items-center justify-between gap-3 text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-700 text-white flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    5. {b('Contact Admin (সরাসরি বার্তা পাঠান)', 'Contact Admin (Direct Message)', lang)}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    {b('সিস্টেম সংক্রান্ত প্রশ্ন বা অনুমোদনের বার্তা পাঠান', 'Send a direct support or verification request message', lang)}
                  </div>
                </div>
              </div>
              <span className="font-semibold text-indigo-700 dark:text-indigo-300 shrink-0">
                {messageOpen ? b('বন্ধ করুন', 'Hide', lang) : b('বার্তা লিখুন', 'Write', lang)}
              </span>
            </button>

            {messageOpen && (
              <form onSubmit={handleSend} className="px-4 pb-4 space-y-2.5 border-t border-indigo-200 dark:border-indigo-800 pt-3">
                {submitted ? (
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      {b(
                        'আপনার বার্তা সফলভাবে কেন্দ্রীয় প্রশাসনের ইনবক্সে পাঠানো হয়েছে।',
                        'Your message has been delivered to the Main System Admin inbox.',
                        lang
                      )}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder={b('আপনার নাম', 'Your Name', lang)}
                        className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                      />
                      <input
                        type="text"
                        value={senderContact}
                        onChange={(e) => setSenderContact(e.target.value)}
                        placeholder={b('মোবাইল / ইমেইল', 'Mobile / Email', lang)}
                        className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder={b('বিষয় * (যেমন: স্কুল অনুমোদন / আইডি সমস্যা)', 'Subject *', lang)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                    />
                    <textarea
                      required
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={b('বিস্তারিত বার্তা লিখুন *', 'Write your message *', lang)}
                      className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-semibold cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {b('বার্তা প্রেরণ করুন', 'Send Message', lang)}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>

          {copiedKey && (
            <div className="text-center text-emerald-700 dark:text-emerald-400 font-semibold">
              {b('ক্লিপবোর্ডে কপি করা হয়েছে ✓', 'Copied to clipboard ✓', lang)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
