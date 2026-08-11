'use client';

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities';

import { GripVertical } from 'lucide-react';
import { useState } from 'react';

const DEFAULT_ITEMS = [
  { id: 'devices', label: 'Devices', enabled: true, until: '2026-12-31' },
  { id: 'recent', label: 'Recent Access Days', enabled: true, until: '2026-12-31' },
  { id: 'html', label: 'HTML documents display', enabled: true, until: '2026-12-31' },
  { id: 'registration', label: 'Registration frame', enabled: true, until: '2026-12-31' },
  { id: 'sponsors', label: 'Sponsors', enabled: true, until: '2026-12-31' },
  { id: 'vip', label: 'Vip section', enabled: true, until: '2026-12-31' },
  { id: 'info', label: 'Info frame', enabled: true, until: '2026-12-31' },
  { id: 'testimonial', label: 'Testimonial', enabled: true, until: '2026-12-31' },
  { id: 'banner', label: 'Frame Banner of links', enabled: true, until: '2026-12-31' },
  {
    id: 'banner-html',
    label: 'HTML linked to the frame banner of links',
    enabled: true,
    until: '2026-12-31',
  },
];

function SortableRow({
  item,
  onChange,
}: {
  item: any;
  onChange: (value: any) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b bg-white hover:bg-gray-50"
    >
      <td className="w-12 px-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab text-gray-500"
        >
          <GripVertical size={18} />
        </div>
      </td>

      <td className="w-12 text-center">
        <input
          type="checkbox"
          checked={item.enabled}
          onChange={(e) =>
            onChange({
              ...item,
              enabled: e.target.checked,
            })
          }
        />
      </td>

      <td className="font-semibold py-3">
        {item.label}
      </td>

      <td className="w-64 p-2">
        <input
          type="date"
          value={item.until}
          onChange={(e) =>
            onChange({
              ...item,
              until: e.target.value,
            })
          }
          className="w-full border px-2 py-1"
        />
      </td>
    </tr>
  );
}

export default function HomepageDisplayPanel() {
  const [items, setItems] = useState(DEFAULT_ITEMS);

  const sensors = useSensors(
    useSensor(PointerSensor)
  );

  function handleDragEnd(event: any) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);

    setItems(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <div className="flex-1 bg-white p-6">

      <h2 className="text-xl mb-3">
        HTML Homepage Link Display
      </h2>

      <div className="mb-4">
        <select className="border p-2 w-40">
          <option>English</option>
          <option>Italian</option>
        </select>
      </div>

      <div className="border">

        <div className="bg-yellow-400 border-b px-4 py-2 font-bold">
          Choose the document in which to view
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items}
            strategy={verticalListSortingStrategy}
          >
            <table className="w-full">

              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="w-12"></th>
                  <th className="w-12"></th>
                  <th className="text-left py-2"></th>
                  <th className="text-left py-2 text-purple-500">
                    until date
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <SortableRow
                    key={item.id}
                    item={item}
                    onChange={(updated) =>
                      setItems((prev) =>
                        prev.map((i) =>
                          i.id === updated.id ? updated : i
                        )
                      )
                    }
                  />
                ))}
              </tbody>

            </table>
          </SortableContext>
        </DndContext>

        <div className="bg-yellow-50 border-t p-4">

          <label className="block mb-2">
            Recent users who logged from:
          </label>

          <select className="w-full border p-2">
            <option>5 days</option>
            <option>10 days</option>
            <option>30 days</option>
          </select>

        </div>

      </div>
    </div>
  );
}