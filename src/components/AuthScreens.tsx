import React from 'react';
import { CheckCircle2, LockKeyhole, Loader2, ShieldCheck } from 'lucide-react';
import type { Language } from '../types';
import { b } from '../i18n/translations';
import { OfficialAppLogo } from './OfficialAppLogo';

export const AuthLoadingScreen: React.FC<{ lang?: Language }> = ({ lang = 'bn' }) => {
  const steps = [
    {
      id: 'session',
      labelBn: 'Firebase Authentication সেশন যাচাই',
      labelEn: 'Verifying Firebase Authentication session',
      active: true,
    },
    {
      id: 'role',
      labelBn: 'রোল-ভিত্তিক অনুমতি ও ড্যাশবোর্ড লক',
      labelEn: 'Resolving strict RBAC role & route lock',
      active: false,
    },
    {
      id: 'workspace',
      labelBn: 'সুরক্ষিত ওয়ার্কস্পেস প্রস্তুত করা হচ্ছে',
      labelEn: 'Preparing isolated institutional workspace',
      active: false,
    },
  ];

  return (
    <div
      data-testid="auth-loading-screen"
      role="status"
      aria-live="polite"
      className="min-h-screen bg-[#071526] text-slate-100 flex items-center justify-center p-6 relative overflow-hidden"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            'radial-gradient(circle at 50% 18%, rgba(16,185,129,0.20), transparent 52%), radial-gradient(circle at 80% 82%, rgba(37,99,235,0.16), transparent 46%)',
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-md w-full rounded-2xl bg-[#0d2238] border border-slate-700/80 p-7 space-y-6 shadow-2xl">
        <div className="flex items-center gap-4 border-b border-slate-700/70 pb-5">
          <OfficialAppLogo
            sizeClass="w-14 h-14"
            roundedClass="rounded-xl"
            paddingClass="p-1.5"
            className="shrink-0 ring-1 ring-white/20 shadow-md"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>{b('নিরাপদ প্রবেশ যাচাই', 'Protected Access Gate', lang)}</span>
            </div>
            <h1 className="text-lg font-extrabold text-white tracking-tight mt-0.5 truncate">
              PSMS Bangladesh
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              {b(
                'অনুগ্রহ করে অপেক্ষা করুন — আপনার সেশন যাচাই হচ্ছে।',
                'Authenticating session before unlocking any portal view.',
                lang
              )}
            </p>
          </div>
        </div>

        <ol className="space-y-3 text-xs">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border ${
                step.active
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-100'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-mono text-[11px] font-bold text-slate-400 tabular-nums">
                  0{index + 1}
                </span>
                <span className="font-semibold truncate">{b(step.labelBn, step.labelEn, lang)}</span>
              </div>
              {step.active ? (
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-slate-600 shrink-0" />
              )}
            </li>
          ))}
        </ol>

        <div className="flex items-center justify-between pt-2 border-t border-slate-700/70 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <LockKeyhole className="w-3.5 h-3.5 text-emerald-400" />
            {b('যাচাই সম্পন্ন না হওয়া পর্যন্ত ড্যাশবোর্ড লক করা আছে', 'Protected routes locked during verification', lang)}
          </span>
          <span className="font-mono text-emerald-300 font-semibold">
            {b('যাচাই চলছে', 'Checking', lang)}
          </span>
        </div>
      </div>
    </div>
  );
};
