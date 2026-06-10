'use client';

import { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';

interface UseInPlannerModalProps {
  workout: any;
  onClose: () => void;
  onConfirm: (weekId: string, dayId: string) => void;
}

export default function UseInPlannerModal({ workout, onClose, onConfirm }: UseInPlannerModalProps) {
  const [plan, setPlan] = useState<any>(null);
  const [weeks, setWeeks] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [days, setDays] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Load yearly plan on mount
  useEffect(() => {
    loadYearlyPlan();
  }, []);

  // Update days when week is selected
  useEffect(() => {
    if (selectedWeek && weeks.length > 0) {
      const week = weeks.find(w => w.id === selectedWeek);
      if (week && week.days) {
        const sortedDays = [...week.days].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
        setDays(sortedDays);
        if (sortedDays.length > 0) {
          setSelectedDay(sortedDays[0].id);
        }
      }
    }
  }, [selectedWeek, weeks]);

  const loadYearlyPlan = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in');
        setLoading(false);
        return;
      }

      // Try to load the YEARLY_PLAN first
      const timestamp = Date.now();
      let response = await fetch(`/api/nutrition/plan?type=YEARLY_PLAN&_t=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      // If YEARLY_PLAN fails or returns empty, try TEMPLATE_WEEKS (Section A) as fallback
      if (!response.ok) {
        console.log('⚠️ YEARLY_PLAN not available, trying TEMPLATE_WEEKS as fallback...');
        response = await fetch(`/api/nutrition/plan?type=CURRENT_WEEKS&section=A&_t=${timestamp}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load planner');
        }
      }

      const data = await response.json();
      console.log('📅 RAW API RESPONSE:', data);
      console.log('   Response keys:', Object.keys(data || {}));
      
      // The API returns { plan: {...} }
      const planData = data.plan;
      
      console.log('📅 Loaded yearly plan:');
      console.log('   Plan ID:', planData?.id);
      console.log('   Plan type:', planData?.type);
      console.log('   Plan storageZone:', planData?.storageZone);
      console.log('   Total weeks:', planData?.weeks?.length);
      
      if (!planData) {
        setError('No yearly plan found. Please create one first.');
        setLoading(false);
        return;
      }

      if (!planData.weeks || planData.weeks.length === 0) {
        setError(`Yearly plan exists but has no weeks. Plan ID: ${planData.id}, Type: ${planData.type}`);
        setLoading(false);
        return;
      }

      setPlan(planData);
      const weeksArray = Array.isArray(planData.weeks) ? planData.weeks : [];
      
      console.log('   ✅ Weeks loaded:', weeksArray.length, 'weeks');
      console.log('   First week:', {
        id: weeksArray[0]?.id,
        weekNumber: weeksArray[0]?.weekNumber,
        daysCount: weeksArray[0]?.days?.length || 0
      });
      
      setWeeks(weeksArray);

      // Select the first week by default
      if (weeksArray.length > 0) {
        setSelectedWeek(weeksArray[0].id);
      } else {
        setError('Yearly plan has no weeks. Please recreate your yearly plan.');
      }
    } catch (error: any) {
      console.error('Error loading yearly plan:', error);
      setError(error.message || 'Failed to load yearly plan');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedWeek || !selectedDay) {
      alert('Please select a week and day');
      return;
    }
    onConfirm(selectedWeek, selectedDay);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading yearly planner...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Error Loading Planner</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Use in My Planner</h2>
              <p className="text-sm text-gray-600 mt-1">
                Select where to add: <span className="font-semibold">{workout.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Plan Info */}
          {plan && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-4">
              <h3 className="font-semibold text-indigo-900 mb-1">📅 Yearly Planner</h3>
              <p className="text-sm text-indigo-700">
                Total: {weeks.length} weeks • {plan.totalDays || 0} days
              </p>
            </div>
          )}

          {/* Week Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              1. Select Week
            </label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              disabled={weeks.length === 0}
            >
              {weeks.length === 0 ? (
                <option>No weeks available</option>
              ) : (
                weeks.map((week) => {
                  const firstDay = week.days?.[0];
                  const lastDay = week.days?.[week.days.length - 1];
                  const dateRange = firstDay && lastDay 
                    ? `${new Date(firstDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(lastDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : '';
                  
                  return (
                    <option key={week.id} value={week.id}>
                      Week {week.weekNumber} {dateRange ? `(${dateRange})` : ''}
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {/* Day Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              2. Select Day
            </label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              disabled={!selectedWeek || days.length === 0}
            >
              {days.length === 0 ? (
                <option>No days available</option>
              ) : (
                days.map((day) => {
                  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                  const dayName = dayNames[day.dayOfWeek] || `Day ${day.dayOfWeek + 1}`;
                  const date = new Date(day.date);
                  const workoutsCount = day.meals?.length || 0;
                  
                  return (
                    <option key={day.id} value={day.id}>
                      {dayName}, {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} 
                      {workoutsCount > 0 ? ` (${workoutsCount} workout${workoutsCount !== 1 ? 's' : ''})` : ' (empty)'}
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <div className="text-2xl">ℹ️</div>
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">What happens next?</h4>
                <p className="text-sm text-blue-800">
                  This workout will be added to the selected day in your yearly planner. 
                  All nutritionFoods and settings will be copied to create a new workout instance.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedDay}
            className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Calendar className="w-5 h-5" />
            Add to Planner
          </button>
        </div>
      </div>
    </div>
  );
}

