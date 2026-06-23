'use client';

import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatMyClubsSidebarLabel } from '@/lib/club/clubSidebarLabel';

type ClubOption = {
  id: string;
  name: string;
  description?: string | null;
};

export default function SelectClubForTopicsModal({
  isOpen,
  onClose,
  clubs,
  onSelectClub,
}: {
  isOpen: boolean;
  onClose: () => void;
  clubs: ClubOption[];
  onSelectClub: (clubId: string) => void;
}) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="select-club-topics-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded border border-zinc-600 bg-zinc-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 bg-teal-800 px-4 py-3 text-sm font-semibold text-white">
          <span id="select-club-topics-modal-title" className="min-w-0 flex-1">
            {t('modal_select_club_for_topics_title')}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1 text-white/90 hover:bg-white/10"
            aria-label={t('btn_close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[min(60vh,400px)] overflow-y-auto bg-[#2d2d2d] p-3">
          {clubs.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-white/70">
              {t('modal_select_club_for_topics_empty')}
            </p>
          ) : (
            <ul className="space-y-1">
              {clubs.map((club) => {
                const label = formatMyClubsSidebarLabel(club);
                return (
                  <li key={club.id}>
                    <button
                      type="button"
                      onClick={() => onSelectClub(club.id)}
                      className="flex w-full items-center gap-2 rounded px-2 py-2.5 text-left text-sm text-white transition-colors hover:bg-zinc-700/90"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full bg-lime-400 shadow-[0_0_6px_rgba(163,230,53,0.8)]"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate leading-snug">{label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
