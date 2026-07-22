'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { stripInternalWorkoutTags } from '@/utils/sanitizeWorkoutHtml';

function stripCircuitTags(content: string | null | undefined): string {
  if (!content) return '';
  return stripInternalWorkoutTags(content).trim();
}

export type CalendarMoveframePopupProps = {
  moveframe: any;
  position: { x: number; y: number };
  onClose: () => void;
};

/** Narrow calendar — moveframe detail card on symbol click. */
export default function CalendarMoveframePopup({
  moveframe,
  position,
  onClose,
}: CalendarMoveframePopupProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sportLabel = (moveframe.sport || 'Unknown').replace(/_/g, ' ');
  const movelapCount = moveframe.movelaps?.length ?? 0;
  const repetitions =
    moveframe.repetitions ??
    (moveframe.manualMode ? movelapCount : movelapCount) ??
    0;
  const macroFinal = moveframe.macroFinal ?? "0'";
  const alarm =
    moveframe.alarm !== undefined && moveframe.alarm !== null && moveframe.alarm !== ''
      ? moveframe.alarm
      : '—';

  const descriptionHtml = moveframe.description || moveframe.notes || '';

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[99999] w-72 max-w-[90vw] rounded-lg border-2 border-blue-500 bg-white p-3 shadow-2xl animate-fadeIn"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, 8px)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 pb-2 border-b border-gray-200 mb-2">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ backgroundColor: moveframe.section?.color || '#3B82F6' }}
        >
          {moveframe.letter || 'A'}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-sm text-gray-900 truncate">{sportLabel}</div>
          <div className="text-xs text-gray-500 truncate">
            {moveframe.section?.name || 'Section'}
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded p-2 mb-3 max-h-28 overflow-y-auto">
        {descriptionHtml ? (
          <div
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            className="prose prose-sm max-w-none"
          />
        ) : (
          <span className="text-gray-400 italic">No description</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
        <div>
          <div className="text-gray-500">Repetitions</div>
          <div className="font-bold text-blue-600">{repetitions}</div>
        </div>
        <div>
          <div className="text-gray-500">Movelaps</div>
          <div className="font-bold text-purple-600">{movelapCount}</div>
        </div>
        <div>
          <div className="text-gray-500">Macro Final</div>
          <div className="font-bold text-green-600">{macroFinal}</div>
        </div>
        <div>
          <div className="text-gray-500">Alarm</div>
          <div className="font-bold text-red-600">{alarm}</div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-2">
        <div className="text-[10px] font-semibold text-gray-600 mb-1">Notes</div>
        <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 min-h-[2.5rem]">
          {moveframe.notes && !moveframe.manualMode
            ? stripCircuitTags(moveframe.notes)
            : ''}
        </div>
      </div>
    </div>,
    document.body,
  );
}
