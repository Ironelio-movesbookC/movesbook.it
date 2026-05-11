'use client';

import { useEffect, useId, type CSSProperties, type ReactNode } from 'react';

export type CountriesFilterState = {
  continent: string;
  officialLanguage: string;
  primaryLanguage: string;
  secondaryLanguage: string;
  settingCompleted: 'all' | 'yes' | 'no';
};

export const DEFAULT_COUNTRIES_FILTER: CountriesFilterState = {
  continent: 'All',
  officialLanguage: '',
  primaryLanguage: 'All',
  secondaryLanguage: 'All',
  settingCompleted: 'all',
};

type Props = {
  open: boolean;
  draft: CountriesFilterState;
  onDraftChange: (next: CountriesFilterState) => void;
  continentOptions: string[];
  primaryLanguageOptions: string[];
  secondaryLanguageOptions: string[];
  onOk: () => void;
  onExit: () => void;
};

export function CountriesFilterModal({
  open,
  draft,
  onDraftChange,
  continentOptions,
  primaryLanguageOptions,
  secondaryLanguageOptions,
  onOk,
  onExit,
}: Props) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onExit]);

  if (!open) return null;

  const row = (label: ReactNode, control: ReactNode) => (
    <div className="grid grid-cols-[minmax(0,100px)_1fr] gap-x-2 gap-y-0.5 items-center py-2 border-b border-[#d4c9a8] text-black text-sm">
      <div className="font-normal leading-tight">{label}</div>
      <div className="min-w-0">{control}</div>
    </div>
  );

  const selectCls =
    'w-full border border-gray-500 bg-white px-1.5 py-1 text-sm text-black appearance-none bg-[length:10px] bg-[right_6px_center] bg-no-repeat pr-7';
  const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M3 4.5L6 8l3-3.5'/%3E%3C/svg%3E")`,
  } as CSSProperties;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/30"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onExit();
      }}
    >
      <div
        className="w-full max-w-[340px] border border-gray-500 shadow-lg"
        style={{ backgroundColor: '#f5efd4' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="sr-only">
          Filter countries
        </h2>
        <div className="px-3 pt-3 pb-1">
          {row(
            (
              <>
                Continent
              </>
            ),
            <select
              className={selectCls}
              style={selectStyle}
              value={draft.continent}
              onChange={(e) => onDraftChange({ ...draft, continent: e.target.value })}
            >
              <option value="All">All</option>
              {continentOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>,
          )}
          {row(
            (
              <>
                Official
                <br />
                Language
              </>
            ),
            <input
              type="text"
              value={draft.officialLanguage}
              onChange={(e) => onDraftChange({ ...draft, officialLanguage: e.target.value })}
              className="w-full border border-gray-500 bg-white px-1.5 py-1 text-sm"
            />,
          )}
          {row(
            (
              <>
                Primary
                <br />
                Language
              </>
            ),
            <select
              className={selectCls}
              style={selectStyle}
              value={draft.primaryLanguage}
              onChange={(e) => onDraftChange({ ...draft, primaryLanguage: e.target.value })}
            >
              <option value="All">All</option>
              {primaryLanguageOptions.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>,
          )}
          {row(
            (
              <>
                Secondary
                <br />
                Language
              </>
            ),
            <select
              className={selectCls}
              style={selectStyle}
              value={draft.secondaryLanguage}
              onChange={(e) => onDraftChange({ ...draft, secondaryLanguage: e.target.value })}
            >
              <option value="All">All</option>
              {secondaryLanguageOptions.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>,
          )}
          {row(
            (
              <>
                Setting
                <br />
                completed
              </>
            ),
            <select
              className={selectCls}
              style={selectStyle}
              value={draft.settingCompleted}
              onChange={(e) =>
                onDraftChange({
                  ...draft,
                  settingCompleted: e.target.value as CountriesFilterState['settingCompleted'],
                })
              }
            >
              <option value="all">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>,
          )}
        </div>
        <div className="flex justify-center gap-3 px-3 py-4 border-t border-[#d4c9a8]">
          <button
            type="button"
            onClick={onOk}
            className="min-w-[72px] bg-[#bdbdbd] border border-gray-600 px-4 py-1.5 text-sm font-bold text-black hover:bg-[#aeaeae]"
          >
            OK
          </button>
          <button
            type="button"
            onClick={onExit}
            className="min-w-[72px] bg-[#bdbdbd] border border-gray-600 px-4 py-1.5 text-sm font-bold text-black hover:bg-[#aeaeae]"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}
