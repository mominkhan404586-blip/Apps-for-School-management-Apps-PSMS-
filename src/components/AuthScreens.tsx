import React from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import type { Language } from '../types';
import { b } from '../i18n/translations';
import { OfficialAppLogo } from './OfficialAppLogo';

export const AuthLoadingScreen: React.FC<{ lang?: Language }> = ({ lang = 'bn' }) => {
  return (
    <div
      data-testid="auth-loading-screen"
      role="status"
      aria-live="polite"
      className="min-h-screen bg-gradient-to-b from-[#071526] via-[#0a1d2e] to-[#061320] text-slate-100 flex items-center justify-center p-6"
    >
      <div className="max-w-sm w-full rounded-2xl bg-[#0d2238]/90 border border-emerald-500/30 p-7 text-center space-y-5 shadow-2xl">
        <OfficialAppLogo
          sizeClass="w-16 h-16"
          roundedClass="rounded-2xl"
          paddingClass="p-1.5"
          className="mx-auto shadow-lg ring-1 ring-white/20"
        />
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[11px] font-semibold text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{b('নিরাপত্তা ও সেশন যাচাই', 'Security & Session Check', lang)}</span>
          </div>
          <h1 className="text-lg font-extrabold text-white pt-1">
            {b('PSMS Bangladesh', 'PSMS Bangladesh', lang)}
          </h1>
          <p className="text-xs text-slate-300">
            {b(
              'আপনার লগইন সেশন ও রোল অনুমতি যাচাই করা হচ্ছে...',
              'Verifying your authentication session and role access...',
              lang
            )}
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-semibold">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{b('অপেক্ষা করুন...', 'Loading...', lang)}</span>
        </div>
      </div>
    </div>
  );
};
