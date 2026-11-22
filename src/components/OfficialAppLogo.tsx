import React, { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { OFFICIAL_APP_ICON_URL } from '../utils/devicePreviewEngine';

interface OfficialAppLogoProps {
  sizeClass?: string;
  paddingClass?: string;
  roundedClass?: string;
  alt?: string;
  className?: string;
}

export const OfficialAppLogo: React.FC<OfficialAppLogoProps> = ({
  sizeClass = 'w-9 h-9',
  paddingClass = 'p-0.5',
  roundedClass = 'rounded-lg',
  alt = 'School Management System Official Logo',
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`${sizeClass} ${roundedClass} bg-blue-900 text-white flex items-center justify-center shrink-0 ${className}`}
        aria-label={alt}
      >
        <GraduationCap className="w-5 h-5" />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} ${roundedClass} ${paddingClass} bg-white border border-slate-200/90 dark:border-slate-700 shadow-xs flex items-center justify-center overflow-hidden shrink-0 ${className}`}
    >
      <img
        src={OFFICIAL_APP_ICON_URL}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-full h-full object-contain"
      />
    </div>
  );
};
