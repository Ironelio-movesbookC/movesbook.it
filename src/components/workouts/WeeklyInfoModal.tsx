'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import RichTextEditor from '@/components/shared/RichTextEditor';

interface WeeklyInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekNumber: number;
  weekId?: string;
  initialPeriodId?: string;
  initialNotes?: string;
  onSave: (data: { periodId: string; notes: string }) => void;
}

export default function WeeklyInfoModal({
  isOpen,
  onClose,
  initialPeriodId = '',
  initialNotes = '',
  onSave
}: WeeklyInfoModalProps) {
  const [periodId, setPeriodId] = useState(initialPeriodId);
  const [periods, setPeriods] = useState<any[]>([]);
  const [notes, setNotes] = useState(initialNotes);

  useEffect(() => {
    const loadPeriods = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/workouts/periods', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setPeriods(data.periods || []);
        }
      } catch (error) {
        console.error('Error loading periods:', error);
      }
    };

    if (isOpen) {
      loadPeriods();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setPeriodId(initialPeriodId);
      setNotes(initialNotes || '');
    }
  }, [isOpen, initialNotes, initialPeriodId]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ periodId, notes });
    onClose();
  };

  const selectedPeriod = periods.find((p) => p.id === periodId);

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-pink-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📝</span>
            <h2 className="text-xl font-bold text-pink-700">Week planning notes</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
              - Name of the Period
            </label>
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-100 border border-gray-300 rounded text-sm">
              {selectedPeriod ? (
                <>
                  <div
                    className="w-5 h-5 rounded border border-gray-400 flex-shrink-0"
                    style={{ backgroundColor: selectedPeriod.color }}
                  />
                  <span className="font-medium text-gray-900">{selectedPeriod.name}</span>
                  <span className="text-gray-500 text-xs ml-auto">(Set in Personal Settings)</span>
                </>
              ) : (
                <span className="text-gray-500 italic">No period assigned</span>
              )}
            </div>
          </div>

          <RichTextEditor value={notes} onChange={setNotes} />
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
