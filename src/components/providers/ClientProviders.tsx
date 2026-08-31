'use client';

import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { getCurrentTheme } from '@/lib/theme';
import MemberNotePopupHost from '@/components/club/memberProfile/MemberNotePopupHost';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const theme = getCurrentTheme();
  return (
    <ThemeProvider mode={theme}>
      <LanguageProvider>
        <SettingsProvider>
          {children}
          <MemberNotePopupHost />
        </SettingsProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
