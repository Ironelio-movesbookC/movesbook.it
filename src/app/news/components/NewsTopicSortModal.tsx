'use client';

import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
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

interface AutoDeleteConfig {
  olderThanDays: number;
  delayDays: number;
  lastDeletion?: string;
  nextDeletion?: string;
}

interface NewsTopicSortModalProps {
  isOpen: boolean;
  onClose: () => void;
  topics: string[];
  onSave: (orderedTopics: string[]) => void | Promise<void>;
  isSuperAdmin?: boolean;
  /** Called after OGPs are deleted so parent can refresh the list. */
  onAfterDeleteOgNews?: () => void | Promise<void>;
}

function SortableTopicItem({
  id,
  name,
  showCheckbox,
  checked,
  onToggle,
}: {
  id: string;
  name: string;
  showCheckbox?: boolean;
  checked?: boolean;
  onToggle?: () => void;
}) {
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
      {showCheckbox && (
        <input
          type="checkbox"
          checked={!!checked}
          onChange={onToggle}
          className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
          aria-label={`Select topic ${name}`}
        />
      )}
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
  isSuperAdmin = false,
  onAfterDeleteOgNews,
}: NewsTopicSortModalProps) {
  const [ordered, setOrdered] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [deleteWarning, setDeleteWarning] = useState('');
  const [isDeletingOg, setIsDeletingOg] = useState(false);
  const [showAutoDeleteModal, setShowAutoDeleteModal] = useState(false);
  const [olderThanDays, setOlderThanDays] = useState('180');
  const [delayDays, setDelayDays] = useState('30');
  const [lastDeletion, setLastDeletion] = useState('');
  const [nextDeletion, setNextDeletion] = useState('');
  const [autoDeleteConfig, setAutoDeleteConfig] = useState<AutoDeleteConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && topics.length > 0) {
      setOrdered([...topics]);
      setSelectedTopics([]);
      setDeleteWarning('');
    }
  }, [isOpen, topics]);

  const toggleSelected = (topic: string) => {
    setDeleteWarning('');
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

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

  const parseYmd = (value: string): Date | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parts = trimmed.split('-').map((p) => Number(p));
    if (parts.length !== 3) return null;
    const [y, m, d] = parts;
    if (!y || !m || !d) return null;
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    return dt;
  };

  const addDays = (date: Date, days: number): Date => {
    const dt = new Date(date.getTime());
    dt.setDate(dt.getDate() + days);
    return dt;
  };

  const formatYmd = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const runAutomaticOgpDeletion = async (config: AutoDeleteConfig): Promise<boolean> => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (config.lastDeletion || config.nextDeletion) {
        const baseStr = config.nextDeletion || config.lastDeletion!;
        const baseDate = parseYmd(baseStr) ?? today;
        const triggerDate = addDays(baseDate, config.delayDays);
        if (today < triggerDate) {
          // Not yet time to run the automatic deletion – treat as success with no-op
          return true;
        }
      }

      const cutoffDate = addDays(today, -config.olderThanDays);
      const toDate = formatYmd(cutoffDate);

      const token =
        typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const body: { topics: string[]; toDate: string } = {
        topics,
        toDate,
      };

      const res = await fetch('/api/news/ogp/delete-by-topics', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteWarning(data.error || 'Failed to run automatic OGP deletion.');
        return false;
      }

      await onAfterDeleteOgNews?.();
      return true;
    } catch {
      setDeleteWarning('Failed to run automatic OGP deletion.');
      return false;
    }
  };

  const handleSave = async () => {
    setDeleteWarning('');
    setIsSaving(true);
    try {
      await onSave(ordered);
      let autoOk = true;
      if (isSuperAdmin && autoDeleteConfig) {
        autoOk = await runAutomaticOgpDeletion(autoDeleteConfig);
      }
      if (autoOk) {
        onClose();
      }
    } catch {
      setDeleteWarning('Failed to save topic order.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOgNewsSelected = async () => {
    setDeleteWarning('');
    if (selectedTopics.length === 0) {
      setDeleteWarning('Please select at least one topic.');
      return;
    }
    setIsDeletingOg(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const body: { topics: string[]; fromDate?: string; toDate?: string } = { topics: selectedTopics };
      if (fromDate.trim()) body.fromDate = fromDate.trim();
      if (toDate.trim()) body.toDate = toDate.trim();
      const res = await fetch('/api/news/ogp/delete-by-topics', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteWarning(data.error || 'Failed to delete OGPs.');
        return;
      }
      setSelectedTopics([]);
      setFromDate('');
      setToDate('');
      await onAfterDeleteOgNews?.();
    } catch {
      setDeleteWarning('Failed to delete OGPs.');
    } finally {
      setIsDeletingOg(false);
    }
  };

  const handleApplyAutoDelete = () => {
    const older = Number(olderThanDays);
    const delay = Number(delayDays);

    if (!Number.isFinite(older) || older <= 0 || !Number.isFinite(delay) || delay < 0) {
      setDeleteWarning('Please enter valid automatic deletion values.');
      return;
    }

    setAutoDeleteConfig({
      olderThanDays: Math.round(older),
      delayDays: Math.round(delay),
      lastDeletion: lastDeletion.trim() || undefined,
      nextDeletion: nextDeletion.trim() || undefined,
    });

    setShowAutoDeleteModal(false);
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
        className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
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
                  <SortableTopicItem
                    key={name}
                    id={name}
                    name={name}
                    showCheckbox={isSuperAdmin}
                    checked={isSuperAdmin ? selectedTopics.includes(name) : undefined}
                    onToggle={isSuperAdmin ? () => toggleSelected(name) : undefined}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
        {isSuperAdmin ? (
          <div className="border-t border-gray-200 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
              <button
                type="button"
                className="h-9 w-9 flex items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:bg-gray-50"
                aria-label="Settings"
                onClick={() => setShowAutoDeleteModal(true)}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  From date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  To date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>
              <button
                type="button"
                onClick={handleDeleteOgNewsSelected}
                disabled={isDeletingOg}
                className="px-2 py-2 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeletingOg ? 'Deleting…' : 'Delete OG News selected'}
              </button>
            </div>
            {deleteWarning && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2" role="alert">
                {deleteWarning}
              </p>
            )}
          </div>
        ) : (
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
        )}

        {isSuperAdmin && showAutoDeleteModal && (
          <div
            className="absolute inset-0 bg-black/40 flex items-center justify-center z-20"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auto-delete-modal-title"
            onClick={() => setShowAutoDeleteModal(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-lg w-full p-4 text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                id="auto-delete-modal-title"
                className="text-base font-semibold text-red-600 mb-3 text-center"
              >
                Automatic deletion of OGPs
              </h3>
              <p className="mb-4 text-gray-800">
                <div>
                  Remove all the OGPs posted from more than{' '}
                  <select
                    value={olderThanDays}
                    onChange={(e) => setOlderThanDays(e.target.value)}
                    className="mx-1 w-24 px-1 py-0.5 border border-gray-300 rounded text-sm bg-white"
                  >
                    <option value="30">30</option>
                    <option value="60">60</option>
                    <option value="90">90</option>
                    <option value="180">180</option>
                    <option value="360">360</option>
                  </select>{' '}days
                </div>
                <div>
                  after{' '}
                  <select
                    value={delayDays}
                    onChange={(e) => setDelayDays(e.target.value)}
                    className="mx-1 w-24 px-1 py-0.5 border border-gray-300 rounded text-sm bg-white"
                  >
                    <option value="30">30</option>
                    <option value="60">60</option>
                    <option value="90">90</option>
                    <option value="180">180</option>
                    <option value="360">360</option>
                  </select>{' '}
                  days from the last deletion
                </div>
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-28 text-gray-700">Last deletion</span>
                  <input
                    type="date"
                    value={lastDeletion}
                    onChange={(e) => setLastDeletion(e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm min-w-0"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-28 text-gray-700">Next deletion</span>
                  <input
                    type="date"
                    value={nextDeletion}
                    onChange={(e) => setNextDeletion(e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm min-w-0"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm hover:bg-red-700"
                  onClick={handleApplyAutoDelete}
                >
                  Apply
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowAutoDeleteModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
