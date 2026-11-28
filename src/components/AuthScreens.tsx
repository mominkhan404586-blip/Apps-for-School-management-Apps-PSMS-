import React from 'react';
import type { Language } from '../types';
import { WelcomeSplash } from './WelcomeSplash';

export const AuthLoadingScreen: React.FC<{ lang?: Language }> = ({ lang = 'bn' }) => {
  return (
    <div data-testid="auth-loading-screen">
      <WelcomeSplash lang={lang} isLoading />
    </div>
  );
};
