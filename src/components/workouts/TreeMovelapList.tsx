'use client';

import React from 'react';
import { isDistanceBasedSport } from '@/constants/moveframe.constants';
import { movelapPauseFieldLabel } from '@/utils/restTypeDb';

type MovelapColors = {
  headerBg: string;
  headerText: string;
  rowBg: string;
  rowAltBg: string;
  rowText: string;
  rowAltText: string;
  border?: string;
};

interface TreeMovelapListProps {
  moveframe: any;
  colors: MovelapColors;
}

import { formatCircuitMovelapLabel } from '@/utils/circuitMovelapLabel';

function movelapIndexLabel(movelap: any, index: number): string {
  const circuitLabel = formatCircuitMovelapLabel(movelap);
  if (circuitLabel) return circuitLabel;
  return String(movelap.repetitionNumber ?? index + 1);
}

function formatCell(value: unknown): string {
  if (value == null || value === '') return '—';
  return String(value);
}

export default function TreeMovelapList({ moveframe, colors }: TreeMovelapListProps) {
  const movelaps = moveframe.movelaps ?? [];
  if (movelaps.length === 0) return null;

  const sport = moveframe.sport || '';
  const isAerobic = isDistanceBasedSport(sport);
  const isCircuit = Boolean(moveframe.isCircuitBased);
  const pauseLabel = movelapPauseFieldLabel(moveframe.movelaps?.[0]?.restType);

  const thClass =
    'px-2 py-1.5 text-left font-semibold text-[10px] uppercase tracking-wide whitespace-nowrap border-b border-gray-300';
  const tdClass = 'px-2 py-1.5 align-middle border-b border-gray-200/80 whitespace-nowrap';

  return (
    <div
      className="border-t border-gray-200/60"
      style={{ marginLeft: '5rem', backgroundColor: colors.rowBg }}
    >
      <div className="px-2 py-1 text-[10px] font-medium text-gray-500 border-b border-gray-200/60">
        {movelaps.length} movelap{movelaps.length !== 1 ? 's' : ''}
      </div>
      <div className="overflow-x-auto max-h-[min(28rem,55vh)] overflow-y-auto">
        <table className="w-full border-collapse text-xs min-w-[32rem]">
          <thead
            className="sticky top-0 z-[1] shadow-sm"
            style={{ backgroundColor: colors.headerBg, color: colors.headerText }}
          >
            <tr>
              <th className={thClass}>#</th>
              {!isAerobic && (
                <>
                  {isCircuit && <th className={thClass}>Circuit</th>}
                  <th className={thClass}>Muscular sector</th>
                  <th className={thClass}>Exercise</th>
                  <th className={thClass}>Reps</th>
                  <th className={thClass}>Weight</th>
                  <th className={thClass}>Tempo</th>
                </>
              )}
              {isAerobic && (
                <>
                  <th className={thClass}>Distance</th>
                  <th className={thClass}>Time</th>
                  <th className={thClass}>Pace / Speed</th>
                  {sport === 'SWIM' && <th className={thClass}>Technique</th>}
                </>
              )}
              <th className={thClass}>{pauseLabel}</th>
              <th className={thClass}>Tools</th>
              <th className={`${thClass} max-w-[12rem]`}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {movelaps.map((movelap: any, index: number) => {
              const isEven = index % 2 === 0;
              const bg = isEven ? colors.rowBg : colors.rowAltBg;
              const fg = isEven ? colors.rowText : colors.rowAltText;
              const sector = movelap.muscularSector || movelap.sector || '';
              const paceOrSpeed = movelap.pace || movelap.speed || '';

              return (
                <tr
                  key={movelap.id ?? `lap-${index}`}
                  style={{ backgroundColor: bg, color: fg }}
                >
                  <td className={`${tdClass} font-semibold text-gray-600 w-10 text-center`}>
                    {movelapIndexLabel(movelap, index)}
                  </td>
                  {!isAerobic && (
                    <>
                      {isCircuit && (
                        <td className={tdClass}>
                          {movelap.circuitLetter
                            ? `C${movelap.circuitLetter} · S${movelap.stationNumber ?? '—'}`
                            : '—'}
                        </td>
                      )}
                      <td className={`${tdClass} text-violet-800 font-medium`}>
                        {formatCell(sector)}
                      </td>
                      <td className={`${tdClass} font-medium max-w-[10rem] truncate`} title={movelap.exercise}>
                        {formatCell(movelap.exercise)}
                      </td>
                      <td className={`${tdClass} text-center font-semibold`}>
                        {formatCell(movelap.reps)}
                      </td>
                      <td className={`${tdClass} text-center`}>
                        {movelap.weight ? `${movelap.weight}` : '—'}
                      </td>
                      <td className={`${tdClass} text-center`}>
                        {formatCell(movelap.tempo ?? movelap.r1)}
                      </td>
                    </>
                  )}
                  {isAerobic && (
                    <>
                      <td className={`${tdClass} text-center font-medium`}>
                        {movelap.distance != null && movelap.distance !== ''
                          ? `${movelap.distance}m`
                          : '—'}
                      </td>
                      <td className={`${tdClass} text-center`}>{formatCell(movelap.time)}</td>
                      <td className={`${tdClass} text-center`}>{formatCell(paceOrSpeed)}</td>
                      {sport === 'SWIM' && (
                        <td className={tdClass}>{formatCell(movelap.style)}</td>
                      )}
                    </>
                  )}
                  <td className={tdClass}>{formatCell(movelap.pause)}</td>
                  <td className={tdClass}>{formatCell(movelap.tools)}</td>
                  <td
                    className={`${tdClass} max-w-[12rem] truncate text-gray-600`}
                    title={movelap.notes || undefined}
                  >
                    {formatCell(movelap.notes)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
