'use client';

import React, { useEffect, useRef } from 'react';

export type PlanGymWeekWeekAction = 'plan_new' | 'edit_current' | 'delete_plan';

type Props = {
  isOpen: boolean;
  anchorRect: DOMRect | null;
  assignedDayCount: number;
  onClose: () => void;
  onSelect: (action: PlanGymWeekWeekAction) => void;
};

/**
 * SGW — menu when the week already has gym plan slot assignments.
 */
export default function PlanGymWeekWeekActionsMenu({
  isOpen,
  anchorRect,
  assignedDayCount,
  onClose,
  onSelect,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [isOpen, onClose]);

  if (!isOpen || !anchorRect) return null;

  const top = anchorRect.bottom + 4;
  const left = Math.min(anchorRect.left, window.innerWidth - 260);

  return (
    <div
      ref={ref}
      className="fixed z-[100002] min-w-[240px] rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
      style={{ top, left }}
      role="menu"
    >
      <p className="border-b border-gray-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        Gym week on {assignedDayCount} slot(s)
      </p>
      <button
        type="button"
        role="menuitem"
        className="block w-full px-3 py-2.5 text-left text-sm text-gray-900 hover:bg-gray-100"
        onClick={() => {
          onSelect('plan_new');
          onClose();
        }}
      >
        Plan a new gym week
      </button>
      <button
        type="button"
        role="menuitem"
        className="block w-full px-3 py-2.5 text-left text-sm text-gray-900 hover:bg-gray-100"
        onClick={() => {
          onSelect('edit_current');
          onClose();
        }}
      >
        Edit the current gym week
      </button>
      <button
        type="button"
        role="menuitem"
        className="block w-full px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
        onClick={() => {
          onSelect('delete_plan');
          onClose();
        }}
      >
        Delete the gym week plan
      </button>
    </div>
  );
}
