'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface NewsTopicSortModalProps {
  isOpen: boolean;
  onClose: () => void;
  topics: string[];
  onSave: (orderedTopics: string[]) => void | Promise<void>;
}

function SortableTopicItem({ id, name }: { id: string; name: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-100 border border-gray-200 hover:bg-gray-200"
    >
      <button
        type="button"
        className="flex items-center justify-center text-gray-500 hover:text-gray-700 cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-5 h-5" />
      </button>
      <span className="font-medium text-gray-800">{name}</span>
    </div>
  );
}

export default function NewsTopicSortModal({
  isOpen,
  onClose,
  topics,
  onSave,
}: NewsTopicSortModalProps) {
  const [ordered, setOrdered] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && topics.length > 0) {
      setOrdered([...topics]);
    }
  }, [isOpen, topics]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrdered((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    await onSave(ordered);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="topic-sort-modal-title"
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          id="topic-sort-modal-title"
          className="bg-red-600 text-white px-4 py-3 text-center font-semibold text-lg"
        >
          Your favorite sorting
        </div>
        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={ordered}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {ordered.map((name) => (
                  <SortableTopicItem key={name} id={name} name={name} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
