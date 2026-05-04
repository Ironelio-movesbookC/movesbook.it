'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/contexts/LanguageContext';

/** Solid (free) icons for the desk path picker — full class strings for Font Awesome 6. */
const FA_SOLID_ICON_CLASSES: string[] = [
  'fas fa-address-book',
  'fas fa-house',
  'fas fa-user',
  'fas fa-users',
  'fas fa-user-group',
  'fas fa-envelope',
  'fas fa-phone',
  'fas fa-location-dot',
  'fas fa-map',
  'fas fa-calendar-days',
  'fas fa-clock',
  'fas fa-folder',
  'fas fa-folder-open',
  'fas fa-file',
  'fas fa-file-lines',
  'fas fa-magnifying-glass',
  'fas fa-bell',
  'fas fa-gear',
  'fas fa-gears',
  'fas fa-star',
  'fas fa-heart',
  'fas fa-book',
  'fas fa-bookmark',
  'fas fa-camera',
  'fas fa-image',
  'fas fa-music',
  'fas fa-video',
  'fas fa-wrench',
  'fas fa-screwdriver-wrench',
  'fas fa-shield-halved',
  'fas fa-lock',
  'fas fa-key',
  'fas fa-chart-line',
  'fas fa-chart-bar',
  'fas fa-list',
  'fas fa-table',
  'fas fa-clipboard',
  'fas fa-clipboard-list',
  'fas fa-check',
  'fas fa-xmark',
  'fas fa-plus',
  'fas fa-minus',
  'fas fa-pen',
  'fas fa-trash',
  'fas fa-download',
  'fas fa-upload',
  'fas fa-link',
  'fas fa-up-right-from-square',
  'fas fa-flag',
  'fas fa-tag',
  'fas fa-tags',
  'fas fa-trophy',
  'fas fa-medal',
  'fas fa-dumbbell',
  'fas fa-bicycle',
  'fas fa-person-running',
  'fas fa-wheelchair',
  'fas fa-hospital',
  'fas fa-building',
  'fas fa-landmark',
  'fas fa-school',
  'fas fa-cart-shopping',
  'fas fa-credit-card',
  'fas fa-money-bill',
  'fas fa-circle-info',
  'fas fa-circle-question',
  'fas fa-fire',
  'fas fa-bolt',
  'fas fa-leaf',
  'fas fa-globe',
  'fas fa-at'
];

export function normalizeFaIconClass(raw: string): string {
  const s = raw.trim().replace(/\s+/g, ' ');
  if (!s) {
    return '';
  }
  if (s.includes('fa-')) {
    return s;
  }
  const slug = s.replace(/^fa-/, '').replace(/^-+/, '');
  return slug ? `fas fa-${slug}` : '';
}

function getFaIconName(raw: string): string {
  const normalized = normalizeFaIconClass(raw);
  if (!normalized) {
    return '';
  }
  const iconToken = normalized
    .split(' ')
    .find((token) => token.startsWith('fa-') && token !== 'fas' && token !== 'fa-solid');
  return iconToken ?? normalized;
}

type Props = {
  value: string;
  onChange: (next: string) => void;
};

export default function FontAwesomeIconPicker({ value, onChange }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (open) {
      setDraft(value);
      setFilter('');
    }
  }, [open, value]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase().replace(/\s+/g, '-');
    if (!q) {
      return FA_SOLID_ICON_CLASSES;
    }
    return FA_SOLID_ICON_CLASSES.filter((c) => c.toLowerCase().includes(q));
  }, [filter]);

  const displayClass = normalizeFaIconClass(value) || 'fas fa-address-book';
  const displayName = getFaIconName(value) || 'fa-address-book';

  const close = useCallback(() => setOpen(false), []);

  const onBackdropKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    },
    [close]
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    window.addEventListener('keydown', onBackdropKey);
    return () => window.removeEventListener('keydown', onBackdropKey);
  }, [open, onBackdropKey]);

  const applySubmit = () => {
    const next = normalizeFaIconClass(draft) || draft.trim();
    onChange(next);
    close();
  };

  const picker =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 p-4"
            role="presentation"
            onClick={close}
            onKeyDown={(e) => e.key === 'Escape' && close()}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="fa-icon-picker-title"
              className="w-full max-w-md overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-zinc-200 px-3 py-2">
                <h2 id="fa-icon-picker-title" className="sr-only">
                  {t('desk_icon_picker_title')}
                </h2>
                <input
                  type="search"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder={t('desk_icon_picker_filter_placeholder')}
                  className="w-full rounded border border-zinc-300 px-2 py-2 text-sm text-zinc-900"
                  autoComplete="off"
                />
              </div>
              <div className="max-h-[min(320px,50vh)] overflow-y-auto p-2">
                <div className="grid grid-cols-5 gap-1">
                  {filtered.map((cls) => {
                    const selected = normalizeFaIconClass(draft) === cls || draft.trim() === cls;
                    return (
                      <button
                        key={cls}
                        type="button"
                        title={cls}
                        onClick={() => setDraft(cls)}
                        className={`flex h-11 w-full items-center justify-center rounded border text-lg transition-colors ${
                          selected
                            ? 'border-black bg-black text-white'
                            : 'border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-zinc-100'
                        }`}
                      >
                        <i className={cls} aria-hidden />
                      </button>
                    );
                  })}
                </div>
                {filtered.length === 0 ? (
                  <p className="py-6 text-center text-sm text-zinc-500">{t('desk_icon_picker_empty')}</p>
                ) : null}
              </div>
              <div className="flex justify-center gap-3 border-t border-zinc-200 px-3 py-3">
                <button
                  type="button"
                  onClick={applySubmit}
                  className="rounded bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  {t('desk_icon_picker_submit')}
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="rounded bg-zinc-800 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-900"
                >
                  {t('desk_icon_picker_cancel')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-w-0 flex-1 items-center gap-2 rounded border border-zinc-300 bg-white px-2 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-50"
        aria-label={t('desk_icon_picker_open_aria')}
      >
        <i className={`${displayClass} text-base text-zinc-700`} aria-hidden />
        <span className="truncate font-mono">{displayName}</span>
      </button>
      {picker}
    </div>
  );
}
