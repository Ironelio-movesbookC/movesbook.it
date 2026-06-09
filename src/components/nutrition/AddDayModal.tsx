'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface AddDayModalProps {
  nutritionPlanId: string;
  onClose: () => void;
  onSave: () => void;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AddDayModal({ nutritionPlanId, onClose, onSave }: AddDayModalProps) {
  const [dayData, setDayData] = useState({
    weekNumber: 1,
    dayOfWeek: 1, // Monday
    date: new Date().toISOString().split('T')[0],
    periodId: '',
    weather: '',
    feeling: 5,
    notes: ''
  });
  
  const [periods, setPeriods] = useState<any[]>([]);
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(true);
  
  // Fetch periods on mount
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/nutrition/periods', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setPeriods(data.periods || []);
          // Auto-select first period if available
          if (data.periods && data.periods.length > 0) {
            setDayData(prev => ({ ...prev, periodId: data.periods[0].id }));
          }
        }
      } catch (error) {
        console.error('Error fetching periods:', error);
      } finally {
        setIsLoadingPeriods(false);
      }
    };
    
    fetchPeriods();
  }, []);

  const handleSave = async () => {
    try {
      // Validate period selection
      if (!dayData.periodId) {
        console.error('❌ Please select a Period for this day.');
        return;
      }
      
      const token = localStorage.getItem('token');
      
      // Check if week already has 7 days (with cache-busting timestamp)
      const timestamp = Date.now();
      const checkResponse = await fetch(`/api/nutrition/plan?type=YEARLY_PLAN&_t=${timestamp}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (checkResponse.ok) {
        const data = await checkResponse.json();
        const week = data.plan?.weeks?.find((w: any) => w.weekNumber === dayData.weekNumber);
        
        if (week && week.days && week.days.length >= 7) {
          console.error(`❌ Week ${dayData.weekNumber} already has 7 days. A week cannot have more than 7 days.`);
          return;
        }
      }
      
      const response = await fetch('/api/nutrition/days', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nutritionPlanId,
          weekNumber: dayData.weekNumber,
          date: dayData.date,
          periodId: dayData.periodId,
          weather: dayData.weather,
          feelingStatus: dayData.feeling.toString(),
          notes: dayData.notes
        })
      });

      if (response.ok) {
        onSave();
      } else {
        const error = await response.json();
        console.error('❌ Failed to add day:', error.error || 'Unknown error');
      }
    } catch (error) {
      console.error('❌ Error adding day:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Add New Day
            </h2>
            <p className="text-sm text-gray-600 mt-1">Configure this training day</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Week Number
              </label>
              <input
                type="number"
                min="1"
                value={dayData.weekNumber}
                onChange={(e) => setDayData({ ...dayData, weekNumber: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Day of Week
              </label>
              <select
                value={dayData.dayOfWeek}
                onChange={(e) => setDayData({ ...dayData, dayOfWeek: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {DAY_NAMES.map((name, index) => (
                  <option key={index} value={index + 1}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={dayData.date}
              onChange={(e) => setDayData({ ...dayData, date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Period *
            </label>
            {isLoadingPeriods ? (
              <div className="text-sm text-gray-500 px-4 py-2">Loading periods...</div>
            ) : periods.length === 0 ? (
              <div className="text-sm text-orange-600 px-4 py-2">
                No periods found. Please create periods in Settings → Period Settings.
              </div>
            ) : (
              <select
                value={dayData.periodId}
                onChange={(e) => setDayData({ ...dayData, periodId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name} {period.description && `- ${period.description}`}
                  </option>
                ))}
              </select>
            )}
            {dayData.periodId && periods.length > 0 && (
              <div className="mt-2 flex items-center gap-2 px-2">
                <div
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: periods.find(p => p.id === dayData.periodId)?.color || '#9CA3AF' }}
                />
                <span className="text-sm text-gray-600">
                  Period Color: {periods.find(p => p.id === dayData.periodId)?.name}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Weather
            </label>
            <input
              type="text"
              value={dayData.weather}
              onChange={(e) => setDayData({ ...dayData, weather: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Sunny, Rainy, Indoor..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Feeling (1-10)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="10"
                value={dayData.feeling}
                onChange={(e) => setDayData({ ...dayData, feeling: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className="text-lg font-bold text-blue-600 w-12 text-center">
                {dayData.feeling}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={dayData.notes}
              onChange={(e) => setDayData({ ...dayData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Any notes for this day..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Add Day
          </button>
        </div>
      </div>
    </div>
  );
}

