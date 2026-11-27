import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
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
  paddingClass = 'p-0',
  roundedClass = 'rounded-xl',
  alt = 'School Management System Official Logo',
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`${sizeClass} ${roundedClass} bg-gradient-to-tr from-blue-700 via-sky-500 to-cyan-400 text-white flex items-center justify-center shrink-0 shadow-xs ${className}`}
        aria-label={alt}
      >
        <BookOpen className="w-5 h-5" />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} ${roundedClass} ${paddingClass} bg-sky-600/10 border border-sky-200/80 dark:border-sky-800/70 shadow-xs flex items-center justify-center overflow-hidden shrink-0 ${className}`}
    >
      <img
        src={OFFICIAL_APP_ICON_URL}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
};
