'use client';

import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type MubSidebarBarProps = {
  variant?: 'compact' | 'gradient';
  className?: string;
};

/**
 * Red MUB bar — two separate targets (PHP father app):
 * - Label area → view mode (/users/mub_page)
 * - Gear area   → settings mode (/users/mub_page?edit=1, password gate)
 */
export default function MubSidebarBar({ variant = 'compact', className = '' }: MubSidebarBarProps) {
  const router = useRouter();
  const { t } = useLanguage();

  const goView = () => router.push('/users/mub_page');
  const goSettings = () => router.push('/users/mub_page?edit=1');

  const shell =
    variant === 'gradient'
      ? 'mb-3 flex w-full items-stretch overflow-hidden border-y border-red-900/40 bg-gradient-to-b from-[#ff6a6a] to-[#c81414] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
      : 'mb-2 flex w-full items-stretch overflow-hidden rounded bg-red-600';

  const labelBtn =
    variant === 'gradient'
      ? 'flex flex-1 items-center justify-center py-2.5 text-center text-xs font-bold text-white/95 transition-colors hover:from-[#ff7474] hover:to-[#b80f0f]'
      : 'flex flex-1 items-center px-2 py-1.5 text-left text-xs text-white transition-colors hover:bg-red-700';

  const gearBtn =
    variant === 'gradient'
      ? 'flex w-10 shrink-0 items-center justify-center border-l border-white/25 text-slate-300 transition-colors hover:bg-black/10 hover:text-white'
      : 'flex w-8 shrink-0 items-center justify-center border-l border-red-500/80 text-white/90 transition-colors hover:bg-red-700';

  return (
    <div className={`${shell} ${className}`}>
      <button type="button" onClick={goView} className={labelBtn}>
        {t('sidebar_most_used_buttons')}
      </button>
      <button
        type="button"
        onClick={goSettings}
        className={gearBtn}
        aria-label={t('sidebar_options')}
        title={t('sidebar_options')}
      >
        <Settings className={variant === 'gradient' ? 'h-4 w-4' : 'h-3 w-3'} />
      </button>
    </div>
  );
}
