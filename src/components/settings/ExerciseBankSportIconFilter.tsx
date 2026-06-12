'use client';

import Image from 'next/image';
import {
  EXERCISE_LIBRARY_ROW_1,
  EXERCISE_LIBRARY_ROW_2,
  getExerciseLibrarySportLabel,
  isExerciseLibrarySportKey,
  type ExerciseLibrarySportKey,
} from '@/constants/exerciseLibrarySports';
import { getSportIcon, isImageIcon } from '@/utils/sportIcons';
import { useSportIconType } from '@/hooks/useSportIconType';

type ExerciseBankSportIconFilterProps = {
  activeLibraryFilter: string;
  onLibraryFilterChange: (sportKey: string) => void;
};

export default function ExerciseBankSportIconFilter({
  activeLibraryFilter,
  onLibraryFilterChange,
}: ExerciseBankSportIconFilterProps) {
  const iconType = useSportIconType();

  const rows: ExerciseLibrarySportKey[][] = [
    [...EXERCISE_LIBRARY_ROW_1],
    [...EXERCISE_LIBRARY_ROW_2],
  ];

  const renderTile = (sportKey: ExerciseLibrarySportKey) => {
    const isActive =
      activeLibraryFilter !== 'all' && activeLibraryFilter === sportKey;
    const label = getExerciseLibrarySportLabel(sportKey);
    const icon = getSportIcon(sportKey, iconType);
    const showImage = iconType === 'icon' && isImageIcon(iconType);
    const isCatchall = sportKey === 'FREE_MOVES' || sportKey === 'TECHNICAL_MOVES';

    return (
      <button
        key={sportKey}
        type="button"
        title={
          isCatchall
            ? isActive
              ? `Clear filter (${label})`
              : `Show exercises in ${label} (non-listed sports)`
            : isActive
              ? `Clear filter (${label})`
              : `Filter by ${label}`
        }
        onClick={() => {
          onLibraryFilterChange(isActive ? 'all' : sportKey);
        }}
        className={`flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center gap-0.5 rounded-lg border-2 p-1 transition ${
          isActive
            ? 'border-sky-600 bg-sky-100 shadow-md ring-2 ring-sky-300'
            : isCatchall
              ? 'border-amber-300 bg-amber-50 hover:border-amber-500 hover:bg-amber-100'
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
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-700">Libraries</span>
        <span className="text-[11px] text-gray-500">
          Click a library to filter the grid below. Click again to show all. Use the three catalog buttons above for
          Movesbook / shared scope (clears library filter).
        </span>
      </div>
      {rows.map((row, idx) => (
        <div key={idx} className="flex flex-wrap gap-2">
          {row.map((sportKey) =>
            isExerciseLibrarySportKey(sportKey) ? renderTile(sportKey) : null
          )}
        </div>
      ))}
    </div>
  );
}
