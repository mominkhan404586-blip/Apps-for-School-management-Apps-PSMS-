import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpenCheck, GraduationCap, Loader2, Sparkles } from 'lucide-react';
import type { Language } from '../types';
import { b } from '../i18n/translations';
import { OfficialAppLogo } from './OfficialAppLogo';

export interface WelcomeSplashProps {
  lang?: Language;
  isLoading?: boolean;
  onContinue?: () => void;
  autoAdvanceMs?: number;
}

export const WelcomeSplash: React.FC<WelcomeSplashProps> = ({
  lang = 'bn',
  isLoading = false,
  onContinue,
  autoAdvanceMs = 1200,
}) => {
  const [entered, setEntered] = useState(false);
  const [progress, setProgress] = useState(isLoading ? 68 : 25);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      setEntered(true);
    });
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const t1 = window.setTimeout(() => setProgress(100), 120);
    const t2 = window.setTimeout(() => {
      onContinue?.();
    }, autoAdvanceMs);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [isLoading, onContinue, autoAdvanceMs]);

  const highlights = [
    {
      id: 'welcome',
      labelBn: 'শিক্ষা প্রতিষ্ঠানের সকল কার্যক্রম প্রস্তুত করা হচ্ছে',
      labelEn: 'Preparing your school learning workspace',
      active: true,
    },
    {
      id: 'classroom',
      labelBn: 'শ্রেণি, হাজিরা, পাঠ ও পরীক্ষার তথ্য লোড হচ্ছে',
      labelEn: 'Classes, attendance, lessons & exam tools',
      active: false,
    },
    {
      id: 'portal',
      labelBn: 'শিক্ষক, শিক্ষার্থী ও অভিভাবক ড্যাশবোর্ড',
      labelEn: 'Teacher, Student & Guardian experience',
      active: false,
    },
  ];

  return (
    <div
      data-testid="welcome-splash"
      role="status"
      aria-live="polite"
      className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-sky-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-6 relative overflow-hidden"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-75"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(14,165,233,0.16), transparent 45%), radial-gradient(circle at 80% 80%, rgba(37,99,235,0.14), transparent 48%)',
        }}
        aria-hidden="true"
      />

      <div
        className={`relative max-w-md w-full rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-sky-100 dark:border-slate-800 p-7 space-y-6 shadow-xl shadow-sky-900/10 transition-all duration-500 ease-out ${
          entered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'
        }`}
      >
        <div className="flex flex-col items-center text-center space-y-3 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div
            className={`relative transition-transform duration-500 ease-out ${
              entered ? 'scale-100 rotate-0' : 'scale-90 -rotate-3'
            }`}
          >
            <div
              className="absolute -inset-2 rounded-3xl bg-sky-400/20 blur-md animate-pulse pointer-events-none"
              aria-hidden="true"
            />
            <OfficialAppLogo
              sizeClass="w-20 h-20"
              roundedClass="rounded-2xl"
              paddingClass="p-1.5"
              className="relative ring-2 ring-sky-200 dark:ring-sky-800 shadow-lg"
            />
            <span
              className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md"
              aria-hidden="true"
            >
              <GraduationCap className="w-4 h-4" />
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-[11px] font-bold text-sky-700 dark:text-sky-300">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{b('স্বাগতম · স্মার্ট শিক্ষা পোর্টাল', 'Welcome · Smart Education Portal', lang)}</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {b('প্রাথমিক ও মাধ্যমিক স্কুল ম্যানেজমেন্ট', 'PSMS Bangladesh', lang)}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {b(
                'জ্ঞান, শৃঙ্খলা ও ডিজিটাল শিক্ষার সমন্বয়ে আপনার বিদ্যালয় পোর্টাল চালু হচ্ছে।',
                'Opening your unified school portal for smart teaching, attendance, and learning.',
                lang
              )}
            </p>
          </div>
        </div>

        <ol className="space-y-2.5 text-xs">
          {highlights.map((item, idx) => (
            <li
              key={item.id}
              style={{ transitionDelay: `${idx * 75}ms` }}
              className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border transition-all duration-300 ease-out ${
                entered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
              } ${
                item.active
                  ? 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-950 dark:text-sky-100'
                  : 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <BookOpenCheck
                  className={`w-4 h-4 shrink-0 ${
                    item.active ? 'text-blue-600 dark:text-sky-400' : 'text-slate-400'
                  }`}
                />
                <span className="font-semibold truncate">{b(item.labelBn, item.labelEn, lang)}</span>
              </div>
              {item.active && (
                <Loader2 className="w-4 h-4 text-blue-600 dark:text-sky-400 animate-spin shrink-0" />
              )}
            </li>
          ))}
        </ol>

        <div className="space-y-3 pt-1">
          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>{b('ডিজিটাল শিক্ষা ব্যবস্থাপনা', 'Digital Education Platform', lang)}</span>
            {onContinue ? (
              <button
                type="button"
                data-testid="welcome-splash-continue-btn"
                onClick={onContinue}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                <span>{b('প্রবেশ করুন', 'Enter Portal', lang)}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="font-semibold text-blue-600 dark:text-sky-400">
                {b('প্রস্তুত হচ্ছে...', 'Loading...', lang)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
