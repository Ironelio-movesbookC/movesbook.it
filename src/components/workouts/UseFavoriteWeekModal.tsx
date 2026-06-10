'use client';

import { useEffect, useState } from 'react';
import { X, Calendar } from 'lucide-react';

interface UseFavoriteWeekModalProps {
  planName: string;
  onClose: () => void;
  onConfirm: (targetWeekIds: string[]) => Promise<void>;
}

export default function UseFavoriteWeekModal({
  planName,
  onClose,
  onConfirm,
}: UseFavoriteWeekModalProps) {
  const [weeks, setWeeks] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadYearlyWeeks();
  }, []);

  const loadYearlyWeeks = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in');
        return;
      }

      const response = await fetch(
        `/api/workouts/plan?type=YEARLY_PLAN&_t=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache',
          },
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load yearly plan');
      }

      const data = await response.json();
      const list = Array.isArray(data.plan?.weeks) ? data.plan.weeks : [];
      if (list.length === 0) {
        setError('Yearly plan has no weeks. Create your yearly plan first.');
      }
      setWeeks(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load yearly plan');
    } finally {
      setLoading(false);
    }
  };

  const toggleWeek = (weekId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(weekId)) next.delete(weekId);
      else next.add(weekId);
      return next;
    });
  };

  const handleApply = async () => {
    if (selected.size === 0) {
      alert('Select at least one target week');
      return;
    }
    try {
      setApplying(true);
      await onConfirm(Array.from(selected));
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to apply plan');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100000] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b bg-blue-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Use Plan</h2>
              <p className="text-sm text-gray-600">{planName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-blue-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          {loading && (
            <p className="text-center text-gray-500 py-8">Loading yearly plan weeks…</p>
          )}
          {error && (
            <p className="text-center text-red-600 py-4">{error}</p>
          )}
          {!loading && !error && (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Select one or more weeks in your <strong>Yearly plan</strong>. Existing
                workouts in those weeks will be replaced with this favourite.
              </p>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto border rounded-lg p-2">
                {weeks.map((week) => (
                  <label
                    key={week.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(week.id)}
                      onChange={() => toggleWeek(week.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="font-medium text-gray-900">
                      Week {week.weekNumber}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {week.days?.length ?? 0} days
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-5 border-t flex gap-3 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={applying || loading || !!error || selected.size === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {applying ? 'Applying…' : `Apply to ${selected.size || 0} week(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
