'use client';

import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import {
  EXERCISE_LIBRARY_CORE_KEYS,
  getExerciseLibrarySportLabel,
  type ExerciseLibrarySportKey,
} from '@/constants/exerciseLibrarySports';
import { getSportIcon, isImageIcon } from '@/utils/sportIcons';
import { useSportIconType } from '@/hooks/useSportIconType';
import { getSportDisplayName } from '@/constants/moveframe.constants';

type PersonalArchiveSportFilterProps = {
  favoriteSports: string[];
  activeSport: string;
  onSportChange: (sportKey: string) => void;
  loading?: boolean;
};

function normalizeSportKey(sport: string): string {
  return sport.trim().toUpperCase().replace(/\s+/g, '_');
}

export default function PersonalArchiveSportFilter({
  favoriteSports,
  activeSport,
  onSportChange,
  loading = false,
}: PersonalArchiveSportFilterProps) {
  const iconType = useSportIconType();
  const showImage = iconType === 'icon' && isImageIcon(iconType);

  const displayFavorites = favoriteSports.slice(0, 5);
  const dropdownSports = EXERCISE_LIBRARY_CORE_KEYS.filter(
    (k) => !displayFavorites.includes(k)
  );

  const renderTile = (sportKey: string, label?: string) => {
    const isActive = activeSport !== 'all' && activeSport === sportKey;
    const displayLabel = label ?? getExerciseLibrarySportLabel(sportKey as ExerciseLibrarySportKey) ?? getSportDisplayName(sportKey);
    const icon = getSportIcon(sportKey, iconType);

    return (
      <button
        key={sportKey}
        type="button"
        title={isActive ? `Clear filter (${displayLabel})` : `Filter by ${displayLabel}`}
        onClick={() => onSportChange(isActive ? 'all' : sportKey)}
        className={`flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center gap-0.5 rounded-lg border-2 p-1 transition ${
          isActive
            ? 'border-sky-600 bg-sky-100 shadow-md ring-2 ring-sky-300'
            : 'border-gray-300 bg-white hover:border-amber-400 hover:bg-amber-50'
        }`}
      >
        {showImage ? (
          <Image src={icon} alt="" width={32} height={32} className="h-8 w-8 object-contain" />
        ) : (
          <span className="text-2xl leading-none" aria-hidden>
            {icon}
          </span>
        )}
        <span className="line-clamp-2 text-center text-[9px] font-semibold leading-tight text-gray-800">
          {displayLabel}
        </span>
      </button>
    );
  };

  const dropdownValue =
    activeSport !== 'all' &&
    !displayFavorites.includes(activeSport) &&
    (EXERCISE_LIBRARY_CORE_KEYS as readonly string[]).includes(activeSport)
      ? activeSport
      : '';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-700">
          Sport selection
        </span>
        <span className="text-[11px] text-gray-500">
          {loading
            ? 'Loading favourites…'
            : displayFavorites.length > 0
              ? 'Your 5 favourite sports — or pick another below'
              : 'Set favourite sports in settings, or pick from the list'}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onSportChange('all')}
          className={`rounded-lg px-3 py-2 text-xs font-semibold border-2 transition ${
            activeSport === 'all'
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
          }`}
        >
          All sports
        </button>
        {displayFavorites.map((sport) =>
          renderTile(normalizeSportKey(sport), getSportDisplayName(sport))
        )}
        <label className="relative flex items-center gap-1 text-sm ml-auto">
          <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">Other sport</span>
          <div className="relative">
            <select
              value={dropdownValue}
              onChange={(e) => onSportChange(e.target.value || 'all')}
              className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm min-w-[9rem]"
            >
              <option value="">Select…</option>
              {dropdownSports.map((key) => (
                <option key={key} value={key}>
                  {getExerciseLibrarySportLabel(key)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          </div>
        </label>
      </div>
    </div>
  );
}
