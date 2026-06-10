'use client';

import React from 'react';
import {
  columnsForLayout,
  getMoveframePrintLayout,
  movelapRowCells,
  moveframeDescriptionHtml,
  moveframeHeaderTitle,
  moveframeNotesHtml,
} from '@/lib/workoutPrintHelpers';
import { sanitizeWorkoutHtml } from '@/utils/sanitizeWorkoutHtml';

interface WorkoutPrintContentProps {
  workout: any;
  day?: any | null;
  activeSection?: 'A' | 'B' | 'C' | 'D';
  /** Optional prefix for workout title (e.g. "Workout 1") */
  workoutLabel?: string;
  className?: string;
}

export default function WorkoutPrintContent({
  workout,
  day,
  activeSection = 'A',
  workoutLabel,
  className = 'wps-root',
}: WorkoutPrintContentProps) {
  if (!workout) return null;

  const workoutNotesHtml = sanitizeWorkoutHtml(workout.notes);
  const dayDate =
    day?.date && activeSection !== 'A'
      ? new Date(day.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '';

  const moveframes = [...(workout.moveframes || [])].sort(
    (a: any, b: any) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0)
  );

  const title =
    workoutLabel ||
    workout.name ||
    `Workout ${workout.sessionNumber ?? ''}`.trim();

  return (
    <div className={className}>
      <header className="wps-header">
        <h1 className="wps-title">🏋️ {title}</h1>
        <div className="wps-meta">
          {workout.code && <div className="wps-code">Code: {workout.code}</div>}
          {dayDate && (
            <div>
              {day.weekNumber ? `Week ${day.weekNumber} · ` : ''}
              {dayDate}
            </div>
          )}
          {workout.sports?.length > 0 && (
            <div>Sports: {workout.sports.map((s: any) => s.sport || s).join(', ')}</div>
          )}
        </div>
      </header>

      {workoutNotesHtml && (
        <div className="wps-note">
          <strong>Workout instructions:</strong>{' '}
          <span dangerouslySetInnerHTML={{ __html: workoutNotesHtml }} />
        </div>
      )}

      {moveframes.length === 0 ? (
        <p className="wps-empty">No exercises in this workout.</p>
      ) : (
        moveframes.map((mf: any, mfIdx: number) => {
          const layout = getMoveframePrintLayout(mf);
          const sport = mf.sport || 'SWIM';
          const columns = columnsForLayout(layout, sport);
          const movelaps = [...(mf.movelaps || [])].sort(
            (a: any, b: any) =>
              (a.repetitionNumber ?? a.sequenceOrder ?? 0) -
              (b.repetitionNumber ?? b.sequenceOrder ?? 0)
          );
          const headColor = mf.section?.color || '#2563eb';
          const descHtml = moveframeDescriptionHtml(mf);
          const mfNotesHtml = moveframeNotesHtml(mf);

          return (
            <section
              key={mf.id || mfIdx}
              className="wps-mf-block"
              style={{ pageBreakInside: 'avoid' }}
            >
              <div className="wps-mf-head" style={{ backgroundColor: headColor }}>
                {moveframeHeaderTitle(mf, mfIdx)}
                {mf.manualMode && ' · MANUAL'}
                {mf.isCircuitBased && ' · CIRCUIT'}
              </div>

              {(descHtml || mfNotesHtml) && (
                <div className="wps-mf-desc">
                  {descHtml && (
                    <div
                      className="mb-1"
                      dangerouslySetInnerHTML={{ __html: descHtml }}
                    />
                  )}
                  {mfNotesHtml && (
                    <div>
                      <strong>Block note:</strong>{' '}
                      <span dangerouslySetInnerHTML={{ __html: mfNotesHtml }} />
                    </div>
                  )}
                </div>
              )}

              {movelaps.length === 0 ? (
                <p className="wps-empty" style={{ margin: 0, padding: '10pt' }}>
                  No sets / laps defined — add movelaps in the app.
                </p>
              ) : (
                <table className="wps-exec-table">
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col.key}
                          className={col.align === 'left' ? 'text-left' : ''}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {movelaps.map((ml: any, mlIdx: number) => {
                      const cells = movelapRowCells(layout, ml, mf, mlIdx);
                      return (
                        <tr key={ml.id || mlIdx} className="step-row">
                          {columns.map((col) => (
                            <td
                              key={col.key}
                              className={col.align === 'left' ? 'left' : 'center'}
                            >
                              {cells[col.key] ?? '—'}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>
          );
        })
      )}

      <footer className="wps-footer">Generated by MovesBook — follow sets in order</footer>
    </div>
  );
}
