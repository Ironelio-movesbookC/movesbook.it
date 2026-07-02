'use client';

import React from 'react';
import Image from 'next/image';
import { Archive, CheckSquare, Square, User } from 'lucide-react';
import type { ArchiveOfficialColumnId } from '@/components/workouts/archive/archiveOfficialColumns';
import { recordTypeLabel, sportLabel } from '@/lib/globalWorkoutArchiveMapper';
import { archiveTrainingCategoryLabel } from '@/lib/archiveTrainingCategory';
import {
  formatArchiveExpDate,
  formatArchiveGridDate,
  formatArchiveLanguage,
} from '@/lib/workoutArchiveOfficialShared';
import { formatArchiveDuration } from '@/lib/workoutArchiveMetrics';
import type { WorkoutArchiveGridRecord } from '@/types/workoutArchiveGrid';

function DurationCell({ record }: { record: WorkoutArchiveGridRecord }) {
  const meters =
    record.totalMeters != null && record.totalMeters > 0 ? `${record.totalMeters} m` : null;
  const time =
    record.totalTimeSeconds != null && record.totalTimeSeconds > 0
      ? formatArchiveDuration(record.totalTimeSeconds)
      : null;
  const series =
    record.totalSeries != null && record.totalSeries > 0 ? `${record.totalSeries} series` : null;

  if (!meters && !time && !series) return <>—</>;

  return (
    <div className="leading-snug space-y-0.5 text-[11px] min-w-[5.5rem]">
      {meters ? <div>{meters}</div> : null}
      {time ? <div>{time}</div> : null}
      {series ? <div>{series}</div> : null}
    </div>
  );
}

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
    case 'picture':
      return (
        <div className="h-11 w-11 shrink-0 rounded border border-gray-200 bg-gray-100 overflow-hidden flex items-center justify-center">
          {record.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={record.thumbnailUrl}
              alt=""
              className="object-cover h-full w-full"
            />
          ) : record.authorAvatarUrl ? (
            <Image
              src={record.authorAvatarUrl}
              alt=""
              width={44}
              height={44}
              className="object-cover h-full w-full"
            />
          ) : (
            <Archive className="h-5 w-5 text-gray-400" />
          )}
        </div>
      );
    case 'trainingType':
      return record.trainingCategory
        ? archiveTrainingCategoryLabel(record.trainingCategory)
        : '—';
    case 'recordClass':
      return recordTypeLabel(record.recordType);
    case 'workoutCount':
      return (
        <span className="tabular-nums font-medium">
          {record.workoutCount ?? (record.recordType === 'WORKOUT' ? 1 : '—')}
        </span>
      );
    case 'duration':
      return <DurationCell record={record} />;
    case 'mainSport':
      return sportLabel(record.mainSport);
    case 'goal':
      return <span className="max-w-[8rem] truncate block">{record.mainGoal || '—'}</span>;
    case 'level':
      return record.trainingLevel || '—';
    case 'period':
      return <span className="max-w-[8rem] truncate block">{record.period || '—'}</span>;
    case 'title':
      return (
        <div className="min-w-[9rem] max-w-[14rem]">
          {record.code ? (
            <span className="block text-[10px] font-bold text-gray-500 uppercase truncate">
              {record.code}
            </span>
          ) : null}
          <span className="font-medium truncate block" title={record.title}>
            {record.title}
          </span>
        </div>
      );
    case 'createdAt':
      return formatArchiveGridDate(record.createdAt);
    case 'sharedAt':
      return formatArchiveGridDate(record.sharedAt);
    case 'expDate':
      return formatArchiveExpDate(record.expirationDate);
    case 'language':
      return (
        <span className="max-w-[7rem] truncate block" title={record.originalLanguages ?? ''}>
          {formatArchiveLanguage(record.originalLanguages)}
        </span>
      );
    case 'shortDescription':
      return (
        <span
          className="max-w-[12rem] truncate block text-gray-700"
          title={record.shortDescription ?? ''}
        >
          {record.shortDescription?.trim() || '—'}
        </span>
      );
    case 'author':
      return (
        <div className={`flex items-center gap-1.5 min-w-[6rem] ${opts.authorClassName ?? ''}`}>
          {record.authorAvatarUrl ? (
            <Image
              src={record.authorAvatarUrl}
              alt=""
              width={22}
              height={22}
              className="rounded-full object-cover shrink-0"
            />
          ) : (
            <User className="h-4 w-4 text-gray-400 shrink-0" />
          )}
          <span className="truncate max-w-[7rem]" title={opts.authorLabel}>
            {opts.authorLabel}
            {record.authorCountryFlag ? (
              <span className="ml-0.5">{record.authorCountryFlag}</span>
            ) : null}
          </span>
        </div>
      );
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
          className={`p-2 align-top ${
            colId === 'workoutCount' ? 'text-center' : ''
          } ${colId === 'actions' ? 'whitespace-nowrap' : ''}`}
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
