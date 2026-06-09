'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getSportIcon } from '@/utils/sportIcons';

export default function SharedWorkoutPage() {
  const params = useParams();
  const nutritionMealId = params?.id as string;
  
  const [workout, setWorkout] = useState<any>(null);
  const [day, setDay] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!nutritionMealId) return;

    const fetchWorkout = async () => {
      try {
        const response = await fetch(`/api/nutrition/sessions/${nutritionMealId}/shared`);
        
        if (!response.ok) {
          throw new Error('Workout not found or not accessible');
        }

        const data = await response.json();
        setWorkout(data.workout);
        setDay(data.day);
      } catch (err: any) {
        setError(err.message || 'Failed to load workout');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkout();
  }, [nutritionMealId]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workout...</p>
        </div>
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-4">😞</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Workout Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This workout may have been removed or is no longer shared.'}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  const dayDate = day?.date ? new Date(day.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                🏋️ {workout.name || `Workout ${workout.sessionNumber || ''}`}
              </h1>
              {dayDate && (
                <p className="text-blue-100 text-sm mt-1">{dayDate}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-100">Shared Workout</p>
              <p className="text-xs text-blue-200">Read-Only View</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* NutritionMeal Info Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workout.code && (
              <div>
                <span className="text-sm font-semibold text-gray-600">Code:</span>
                <p className="text-gray-900">{workout.code}</p>
              </div>
            )}
            {workout.sessionNumber && (
              <div>
                <span className="text-sm font-semibold text-gray-600">Session:</span>
                <p className="text-gray-900">{workout.sessionNumber}</p>
              </div>
            )}
            {workout.location && (
              <div>
                <span className="text-sm font-semibold text-gray-600">Location:</span>
                <p className="text-gray-900">{workout.location}</p>
              </div>
            )}
            {workout.weather && (
              <div>
                <span className="text-sm font-semibold text-gray-600">Weather:</span>
                <p className="text-gray-900">{workout.weather}</p>
              </div>
            )}
            {workout.surface && (
              <div>
                <span className="text-sm font-semibold text-gray-600">Surface:</span>
                <p className="text-gray-900">{workout.surface}</p>
              </div>
            )}
          </div>
          
          {workout.notes && (
            <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
              <p className="text-sm font-semibold text-gray-700 mb-1">Notes:</p>
              <div
                className="text-gray-800 text-sm"
                dangerouslySetInnerHTML={{ __html: workout.notes }}
              />
            </div>
          )}
        </div>

        {/* NutritionFoods Table */}
        {workout.nutrition_foods && workout.nutrition_foods.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 border">MF</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 border">Sport</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 border">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 border">Description</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 border">Laps</th>
                </tr>
              </thead>
              <tbody>
                {workout.nutrition_foods.map((mf: any, mfIdx: number) => (
                  <tr key={mf.id} className={mfIdx % 2 === 0 ? 'bg-blue-50' : 'bg-white'}>
                    <td className="px-4 py-3 border font-semibold text-center">
                      {mf.letter || String.fromCharCode(65 + mfIdx)}
                    </td>
                    <td className="px-4 py-3 border">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getSportIcon(mf.sport)}</span>
                        <span>{mf.sport}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 border text-sm">{mf.type || 'STANDARD'}</td>
                    <td className="px-4 py-3 border text-sm">
                      {mf.description ? (
                        <div dangerouslySetInnerHTML={{ __html: mf.description }} />
                      ) : (
                        '-'
                      )}
                      {mf.notes && (
                        <div className="mt-2 p-2 bg-yellow-100 border-l-2 border-yellow-500 text-xs">
                          <strong>Note:</strong>{' '}
                          <span dangerouslySetInnerHTML={{ __html: mf.notes }} />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 border text-center">
                      {mf.nutrition_components?.length || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500 italic">No nutrition_foods in this workout</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>✨ Powered by MovesBook</p>
          <p className="mt-1">This is a shared workout view (read-only)</p>
        </div>
      </main>
    </div>
  );
}

