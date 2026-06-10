'use client';

import DayOverviewModal from '@/components/workouts/DayOverviewModal';
import type { SharedWorkoutDayPayload } from '@/lib/fetchSharedWorkoutDay';

interface SharedDayViewProps {
  day: SharedWorkoutDayPayload;
}

/** Read-only public view for /shared/day/[id] */
export default function SharedDayView({ day }: SharedDayViewProps) {
  return (
    <DayOverviewModal
      day={day}
      mode="page"
      onClose={() => {
        window.location.href = '/';
      }}
    />
  );
}
