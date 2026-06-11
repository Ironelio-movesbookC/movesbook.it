'use client';

import React, { useEffect, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { GripVertical } from 'lucide-react';
import {
  type ArchiveOfficialColumnId,
  ARCHIVE_OFFICIAL_COLUMN_LABELS,
  DEFAULT_ARCHIVE_COLUMN_ORDER,
  loadArchiveColumnOrder,
  reorderArchiveColumns,
  saveArchiveColumnOrder,
} from '@/components/workouts/archive/archiveOfficialColumns';

function SortableHeaderCell({
  id,
  label,
  draggable,
}: {
  id: ArchiveOfficialColumnId;
  label: string;
  draggable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !draggable,
  });

  return (
    <th
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.85 : 1,
      }}
      className="p-2 text-left font-semibold whitespace-nowrap"
    >
      <span className="inline-flex items-center gap-1">
        {draggable ? (
          <button
            type="button"
            className="cursor-grab touch-none rounded p-0.5 hover:bg-sky-700/40"
            aria-label={`Reorder ${label}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5 opacity-80" />
          </button>
        ) : null}
        {label}
      </span>
    </th>
  );
}

export function useArchiveOfficialColumnOrder(storageKey: string) {
  const [columnOrder, setColumnOrder] = useState<ArchiveOfficialColumnId[]>(() =>
    loadArchiveColumnOrder(storageKey)
  );

  useEffect(() => {
    saveArchiveColumnOrder(storageKey, columnOrder);
  }, [storageKey, columnOrder]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const a = active.id as ArchiveOfficialColumnId;
    const b = over.id as ArchiveOfficialColumnId;
    setColumnOrder((order) => reorderArchiveColumns(order, a, b));
  };

  return { columnOrder, setColumnOrder, sensors, handleDragEnd };
}

export function ArchiveOfficialSortableHeader({
  columnOrder,
  sensors,
  onDragEnd,
  selectAllChecked,
  selectAllIndeterminate,
  onSelectAllChange,
}: {
  columnOrder: ArchiveOfficialColumnId[];
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (event: DragEndEvent) => void;
  selectAllChecked?: boolean;
  selectAllIndeterminate?: boolean;
  onSelectAllChange?: () => void;
}) {
  const sortableIds = columnOrder.filter((c) => c !== 'actions');

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
        <thead className="bg-sky-900 text-white sticky top-0 z-10">
          <tr>
            <th className="w-8 p-2" aria-label="Select">
              {onSelectAllChange ? (
                <input
                  type="checkbox"
                  checked={selectAllChecked ?? false}
                  ref={(el) => {
                    if (el) el.indeterminate = Boolean(selectAllIndeterminate);
                  }}
                  onChange={onSelectAllChange}
                  className="h-4 w-4 rounded border-gray-300"
                  aria-label="Select all on page"
                />
              ) : null}
            </th>
            {columnOrder.map((colId) => (
              <SortableHeaderCell
                key={colId}
                id={colId}
                label={ARCHIVE_OFFICIAL_COLUMN_LABELS[colId]}
                draggable={colId !== 'actions'}
              />
            ))}
          </tr>
        </thead>
      </SortableContext>
    </DndContext>
  );
}

export function resetArchiveColumnOrderToDefault(storageKey: string): ArchiveOfficialColumnId[] {
  saveArchiveColumnOrder(storageKey, DEFAULT_ARCHIVE_COLUMN_ORDER);
  return [...DEFAULT_ARCHIVE_COLUMN_ORDER];
}
