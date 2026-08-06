'use client';

import { MessagesSquare } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * MY PAGE shortcut — pick club/team/group, then open that entity's topics DISPLAY
 * (not website settings).
 */
export default function MyPageTopicsEntryRow({
  onOpenClubPicker,
}: {
  onOpenClubPicker: () => void;
}) {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={onOpenClubPicker}
      className="flex min-h-[44px] w-full items-center gap-2 border-b border-black/25 px-4 py-2.5 text-left text-white transition-colors hover:bg-zinc-700/90"
    >
      <MessagesSquare className="h-4 w-4 shrink-0 opacity-90" />
      <span className="truncate">{t('sidebar_my_topics')}</span>
    </button>
  );
}
