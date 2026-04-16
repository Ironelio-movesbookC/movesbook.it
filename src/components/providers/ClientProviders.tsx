import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { getCurrentTheme } from '@/lib/theme';
export async function ClientProviders({ children }: { children: React.ReactNode }) {
  const theme = await getCurrentTheme();
  return (
    <ThemeProvider mode={theme}>
      <LanguageProvider>
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
