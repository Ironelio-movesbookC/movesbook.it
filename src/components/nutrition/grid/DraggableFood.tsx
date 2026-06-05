'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, ChevronDown, GripVertical } from 'lucide-react';

interface DraggableNutritionFoodProps {
  nutritionFood: any;
  workout: any;
  day: any;
  isExpanded: boolean;
  colors: any;
  onToggle: () => void;
  children: React.ReactNode;
  nutritionFoodContent: React.ReactNode;
}

export function DraggableNutritionFood({
  nutritionFood,
  workout,
  day,
  isExpanded,
  colors,
  onToggle,
  children,
  nutritionFoodContent
}: DraggableNutritionFoodProps) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging, transform } = useDraggable({
    id: `nutritionFood-grid-${nutritionFood.id}`,
    data: {
      type: 'nutritionFood',
      nutritionFood,
      workout,
      day,
    },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `nutritionFood-grid-drop-${nutritionFood.id}`,
    data: {
      type: 'nutritionFood',
      nutritionFood,
      workout,
      day,
    },
  });

  return (
    <div 
      ref={setDropRef}
      className={`border rounded-lg relative ${
        isDragging ? 'opacity-50' : ''
      } ${
        isOver ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''
      }`}
      style={{
        borderColor: colors.moveframeHeaderText,
        overflow: 'visible',
        transform: CSS.Transform.toString(transform)
      }}
    >
      {/* NutritionFood Row */}
      <div 
        ref={setDragRef}
        className="p-2 bg-white hover:bg-yellow-50 cursor-pointer flex items-center gap-2"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        {/* Drag Handle */}
        <span
          {...attributes}
          {...listeners}
          className="cursor-move text-gray-600 hover:text-gray-800 transition-colors"
          onClick={(e) => e.stopPropagation()}
          title="Drag to move nutritionFood"
        >
          <GripVertical size={14} />
        </span>
        
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        
        {nutritionFoodContent}
        
        {isOver && <span className="ml-auto text-yellow-600 text-xs font-semibold">📥 Drop Here</span>}
      </div>

      {/* Expanded Content */}
      {children}
    </div>
  );
}

