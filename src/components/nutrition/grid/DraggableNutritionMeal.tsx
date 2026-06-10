'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, ChevronDown, GripVertical } from 'lucide-react';

interface DraggableWorkoutProps {
  workout: any;
  day: any;
  index: number;
  isExpanded: boolean;
  colors: any;
  onToggle: () => void;
  onSelect: (id: string) => void;
  children: React.ReactNode;
  workoutHeader: React.ReactNode;
}

export function DraggableWorkout({
  workout,
  day,
  index,
  isExpanded,
  colors,
  onToggle,
  onSelect,
  children,
  workoutHeader
}: DraggableWorkoutProps) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging, transform } = useDraggable({
    id: `workout-grid-${workout.id}`,
    data: {
      type: 'workout',
      workout,
      day,
    },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `workout-grid-drop-${workout.id}`,
    data: {
      type: 'workout',
      workout,
      day,
    },
  });

  return (
    <div 
      ref={setDropRef}
      className={`border border-green-200 rounded-lg relative ${
        isDragging ? 'opacity-50' : ''
      } ${
        isOver ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''
      }`}
      style={{ 
        overflow: 'visible',
        transform: CSS.Transform.toString(transform)
      }}
    >
      {/* NutritionMeal Row */}
      <div 
        ref={setDragRef}
        className="p-3 hover:opacity-90 cursor-pointer transition-colors flex items-center gap-3"
        style={{ backgroundColor: colors.workoutHeader, color: colors.workoutHeaderText }}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
          onSelect(workout.id);
        }}
      >
        {/* Drag Handle */}
        <span
          {...attributes}
          {...listeners}
          className="cursor-move text-gray-600 hover:text-gray-800 transition-colors"
          onClick={(e) => e.stopPropagation()}
          title="Drag to move workout"
        >
          <GripVertical size={16} />
        </span>
        
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        
        {workoutHeader}
        
        {isOver && <span className="ml-auto text-yellow-600 text-xs font-semibold">📥 Drop Here</span>}
      </div>

      {/* Expanded Content */}
      {children}
    </div>
  );
}

