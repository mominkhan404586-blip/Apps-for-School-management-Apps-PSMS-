import React from 'react';
import { Building2, Camera, Crop, MapPin, ShieldCheck, Users } from 'lucide-react';
import type { Language, SchoolRecord } from '../types';
import { RECOMMENDED_SCHOOL_COVERS } from '../data/mockData';
import { b } from '../i18n/translations';

export interface SchoolCoverBannerProps {
  school: SchoolRecord | undefined;
  lang?: Language;
  canEditCover: boolean;
  onOpenCoverGallery?: () => void;
  onOpenCustomBannerCrop?: () => void;
  badgeText?: string;
  subtitle?: string;
  subtitleBn?: string;
  subtitleEn?: string;
  rightSlot?: React.ReactNode;
}

export const SchoolCoverBanner: React.FC<SchoolCoverBannerProps> = ({
  school,
  lang = 'bn',
  canEditCover,
  onOpenCoverGallery,
  onOpenCustomBannerCrop,
  badgeText,
  subtitle,
  subtitleBn,
  subtitleEn,
  rightSlot,
}) => {
  const hasRemovedCover = school?.coverImageUrl === '';
  const coverUrl = hasRemovedCover ? '' : school?.coverImageUrl || RECOMMENDED_SCHOOL_COVERS[0].url;
  const schoolCodeLabel = school?.schoolPublicId
    ? `${school.schoolPublicId} · ${school.code}`
    : school?.code ?? '—';
  const resolvedSubtitle =
    subtitle ?? (subtitleBn || subtitleEn ? b(subtitleBn ?? '', subtitleEn ?? subtitleBn ?? '', lang) : undefined);

  return (
    <div
      data-testid="school-cover-banner"
      className="relative rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-700/80 shadow-md min-h-[175px] sm:min-h-[195px] flex items-end bg-gradient-to-br from-[#071526] via-[#0f1f3d] to-[#0A2463]"
    >
      {/* Dynamic School Campus Cover Image */}
      {coverUrl && (
        <img
          src={coverUrl}
          alt={school?.nameEn ?? 'School Cover Banner'}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      )}
      {/* Accessible Dark Navy Scrim for Crisp Text Contrast */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#071526]/92 via-[#0f1f3d]/78 to-[#071526]/55" />

      {/* Top Badge Row (Cover editing moved strictly to Settings -> School Profile) */}
      <div className="absolute top-3.5 left-4 right-4 flex items-center justify-between gap-2 z-10">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/35 text-emerald-200 text-[11px] font-bold backdrop-blur-sm">
          <ShieldCheck className="w-3.5 h-3.5" />
          {badgeText ?? b('নিবন্ধিত ও যাচাইকৃত বিদ্যালয়', 'Registered & Verified School', lang)}
        </span>
      </div>

      {/* Bottom School Identity Content */}
      <div className="relative z-10 w-full p-4 sm:p-5 pt-14 flex flex-col lg:flex-row lg:items-end justify-between gap-3 text-white">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight leading-snug text-white drop-shadow-sm">
              {b(school?.nameBn ?? 'নিবন্ধিত বিদ্যালয়', school?.nameEn ?? 'Registered School', lang)}
            </h2>
            <span className="px-2.5 py-0.5 rounded-lg bg-white/15 border border-white/20 text-[11px] font-mono font-semibold text-emerald-200 backdrop-blur-sm">
              {schoolCodeLabel}
            </span>
          </div>
          {resolvedSubtitle ? (
            <p className="text-xs sm:text-sm text-slate-200 max-w-2xl">{resolvedSubtitle}</p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-200">
              <span className="inline-flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-300" />
                EIIN: {school?.eiin ?? '—'} · {school?.classRange ?? '—'}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                {school?.upazila || school?.district ? `${school?.upazila ?? '—'}, ${school?.district ?? '—'}` : '—'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-300" />
                {b('শিক্ষার্থী:', 'Students:', lang)} {school?.studentCount ?? 0} · {b('শিক্ষক:', 'Teachers:', lang)} {school?.teacherCount ?? 0}
              </span>
            </div>
          )}
        </div>

        {rightSlot && <div className="flex-shrink-0">{rightSlot}</div>}
      </div>
    </div>
  );
};
