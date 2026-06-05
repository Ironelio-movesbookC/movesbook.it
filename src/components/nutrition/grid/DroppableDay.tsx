'use client';

import { useDroppable } from '@dnd-kit/core';

interface DroppableDayProps {
  day: any;
  children: React.ReactNode;
}

export function DroppableDay({ day, children }: DroppableDayProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-grid-drop-${day.id}`,
    data: {
      type: 'day',
      day,
    },
  });

  return (
    <div 
      ref={setNodeRef}
      className={`border border-gray-200 rounded-lg bg-white relative ${
        isOver ? 'ring-4 ring-yellow-400 ring-inset' : ''
      }`}
      style={{ overflow: 'visible' }}
    >
      {children}
      {isOver && (
        <div className="absolute inset-0 bg-yellow-100/30 pointer-events-none flex items-center justify-center">
          <span className="text-yellow-800 font-bold text-lg">📥 Drop NutritionMeal Here</span>
        </div>
      )}
    </div>
  );
}

