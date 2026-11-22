import React from 'react';
import { CheckCircle2, Crop, Image as ImageIcon, RotateCcw, Sparkles, X } from 'lucide-react';
import { RECOMMENDED_SCHOOL_COVERS } from '../data/mockData';

export interface CoverGalleryModalProps {
  isOpen: boolean;
  currentCoverUrl?: string;
  schoolNameBn: string;
  onSelectCover: (url: string) => void;
  onOpenCustomCrop: () => void;
  onResetDefault: () => void;
  onClose: () => void;
}

export const CoverGalleryModal: React.FC<CoverGalleryModalProps> = ({
  isOpen,
  currentCoverUrl,
  schoolNameBn,
  onSelectCover,
  onOpenCustomCrop,
  onResetDefault,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Recommended School Covers"
    >
      <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700/80 shadow-2xl overflow-hidden my-auto">
        <div className="flex items-center justify-between px-5 py-4 bg-[#071526] text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">বিদ্যালয় ড্যাশবোর্ড কভার / ব্যানার নির্বাচন</h3>
              <p className="text-xs text-slate-300">
                {schoolNameBn} — কভার পরিবর্তন করলে বিদ্যালয়ের অ্যাডমিন, শিক্ষক, শিক্ষার্থী ও অভিভাবক ড্যাশবোর্ডে তাৎক্ষণিক আপডেট হবে।
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Recommended School Covers */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                প্রস্তাবিত বিদ্যালয় ক্যাম্পাস কভার গ্যালারি (Recommended School Covers)
              </h4>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ১ ক্লিকে সেট করুন
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {RECOMMENDED_SCHOOL_COVERS.map((preset) => {
                const isSelected = currentCoverUrl === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      onSelectCover(preset.url);
                      onClose();
                    }}
                    className={`group text-left rounded-xl overflow-hidden border transition-all ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-md'
                        : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                    }`}
                  >
                    <div className="relative h-28 w-full overflow-hidden bg-slate-900">
                      <img
                        src={preset.url}
                        alt={preset.titleEn}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
                      {isSelected && (
                        <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          সক্রিয় কভার
                        </span>
                      )}
                      <span className="absolute bottom-2 left-2.5 text-[11px] font-semibold text-emerald-200">
                        {preset.categoryBn}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-slate-800/80">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {preset.titleBn}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {preset.titleEn}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Upload & Crop + Reset */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                নিজস্ব বিদ্যালয় ক্যাম্পাসের ছবি আপলোড করুন
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                গ্যালারি থেকে বিদ্যালয়ের আসল ছবি আপলোড করে ৪:১ ব্যানার ফ্রেমে ক্রপ ও পজিশন ঠিক করুন।
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetDefault();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                ডিফল্টে রিসেট
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCustomCrop();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-colors"
              >
                <Crop className="w-4 h-4" />
                কাস্টম কভার আপলোড ও ক্রপ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
