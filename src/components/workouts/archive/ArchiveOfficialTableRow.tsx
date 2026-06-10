'use client';

import React from 'react';
import Image from 'next/image';
import { Archive, CheckSquare, Square } from 'lucide-react';
import type { ArchiveOfficialColumnId } from '@/components/workouts/archive/archiveOfficialColumns';
import { recordTypeLabel, sportLabel } from '@/lib/globalWorkoutArchiveMapper';
import { formatArchiveExpDate } from '@/lib/workoutArchiveOfficialShared';
import type { WorkoutArchiveGridRecord } from '@/types/workoutArchiveGrid';

export function renderArchiveOfficialCell(
  colId: ArchiveOfficialColumnId,
  record: WorkoutArchiveGridRecord,
  opts: {
    authorLabel: string;
    authorClassName?: string;
    renderActions?: React.ReactNode;
  }
): React.ReactNode {
  switch (colId) {
    case 'codeTitle':
      return (
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-9 w-9 shrink-0 rounded border border-gray-200 bg-gray-100 overflow-hidden flex items-center justify-center">
            {record.thumbnailUrl ? (
              <Image
                src={record.thumbnailUrl}
                alt=""
                width={36}
                height={36}
                className="object-cover h-full w-full"
              />
            ) : (
              <Archive className="h-4 w-4 text-gray-400" />
            )}
          </div>
          <div className="min-w-0">
            {record.code && (
              <span className="block text-[10px] font-bold text-gray-500 uppercase truncate">
                {record.code}
              </span>
            )}
            <span className="font-medium truncate block">{record.title}</span>
          </div>
        </div>
      );
    case 'nw':
      return <span className="tabular-nums">{record.numWeeks ?? '—'}</span>;
    case 'type':
      return recordTypeLabel(record.recordType);
    case 'author':
      return <span className={opts.authorClassName}>{opts.authorLabel}</span>;
    case 'mainSport':
      return sportLabel(record.mainSport);
    case 'goal':
      return <span className="max-w-[7rem] truncate block">{record.mainGoal || '—'}</span>;
    case 'level':
      return record.trainingLevel || '—';
    case 'period':
      return <span className="max-w-[7rem] truncate block">{record.period || '—'}</span>;
    case 'language':
      return <span className="max-w-[6rem] truncate block">{record.originalLanguages || '—'}</span>;
    case 'country':
      return (
        <span className="max-w-[6rem] truncate block">
          {record.authorCountryName ?? record.authorCountry ?? '—'}
        </span>
      );
    case 'expDate':
      return formatArchiveExpDate(record.expirationDate);
    case 'actions':
      return opts.renderActions ?? null;
    default:
      return '—';
  }
}

export function ArchiveOfficialTableRow({
  record,
  columnOrder,
  rowIdx,
  isSelected,
  isChecked,
  authorLabel,
  authorClassName,
  onSelect,
  onToggleCheck,
  renderActions,
  stopActionsPropagation = true,
}: {
  record: WorkoutArchiveGridRecord;
  columnOrder: ArchiveOfficialColumnId[];
  rowIdx: number;
  isSelected: boolean;
  isChecked: boolean;
  authorLabel: string;
  authorClassName?: string;
  onSelect: () => void;
  onToggleCheck: () => void;
  renderActions?: React.ReactNode;
  stopActionsPropagation?: boolean;
}) {
  const zebra = rowIdx % 2 === 1 ? 'bg-amber-50/70' : 'bg-white';

  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer border-b border-gray-100 hover:bg-sky-50/80 ${
        isSelected ? 'bg-sky-100 ring-1 ring-inset ring-sky-300' : record.disabled ? 'opacity-50' : zebra
      }`}
    >
      <td className="p-2" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onToggleCheck} aria-label="Select row">
          {isChecked ? (
            <CheckSquare className="h-4 w-4 text-sky-600" />
          ) : (
            <Square className="h-4 w-4 text-gray-400" />
          )}
        </button>
      </td>
      {columnOrder.map((colId) => (
        <td
          key={colId}
          className={`p-2 ${colId === 'nw' ? 'text-center' : ''} ${colId === 'actions' ? 'whitespace-nowrap' : ''}`}
          onClick={colId === 'actions' && stopActionsPropagation ? (e) => e.stopPropagation() : undefined}
        >
          {renderArchiveOfficialCell(colId, record, {
            authorLabel,
            authorClassName,
            renderActions,
          })}
        </td>
      ))}
    </tr>
  );
}
