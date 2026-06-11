'use client';

import { useEffect } from 'react';
import { useWorkoutData } from '@/hooks/useWorkoutData';
import ArchiveWorkoutLibrary from '@/components/workouts/ArchiveWorkoutLibrary';

export default function WorkoutsSection() {
  const { workoutPlan, isLoading, loadWorkoutData } = useWorkoutData({ initialSection: 'D' });

  useEffect(() => {
    void loadWorkoutData('D');
  }, [loadWorkoutData]);

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        ) : (
          <ArchiveWorkoutLibrary
            workoutPlan={workoutPlan}
            reloadWorkouts={async () => {
              await loadWorkoutData('D');
            }}
            compact
          />
        )}
      </div>
    </div>
  );
}
