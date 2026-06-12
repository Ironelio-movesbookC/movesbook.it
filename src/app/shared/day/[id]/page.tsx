import { notFound } from 'next/navigation';
import { fetchSharedWorkoutDay } from '@/lib/fetchSharedWorkoutDay';
import SharedDayView from '@/components/workouts/SharedDayView';
import { templateDaySlotLabel } from '@/lib/workoutDayCopy';
import { sharedDayPublicUrl } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';

type PageProps = { params: { id: string } };

function buildSharedDayDescription(day: NonNullable<Awaited<ReturnType<typeof fetchSharedWorkoutDay>>>) {
  const workoutCount = day.workouts.length;
  const moveframeCount = day.workouts.reduce((n, w) => n + w.moveframes.length, 0);
  const period = day.period?.name ? ` · ${day.period.name}` : '';
  return `Shared workout day on Movesbook — ${workoutCount} workout(s), ${moveframeCount} exercise(s)${period}. Open to view the full plan (read-only).`;
}

export async function generateMetadata({ params }: PageProps) {
  const day = await fetchSharedWorkoutDay(params.id);
  if (!day) {
    return { title: 'Day not found — Movesbook' };
  }
  const label =
    day.dayOfWeek != null
      ? templateDaySlotLabel(day)
      : new Date(day.date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
  const week = day.weekNumber ? ` · Week ${day.weekNumber}` : '';
  const title = `${label}${week}`;
  const description = buildSharedDayDescription(day);
  const pageUrl = sharedDayPublicUrl(params.id);

  return {
    title: `${title} — Movesbook`,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: 'Movesbook',
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    alternates: {
      canonical: pageUrl,
    },
  };
}

export default async function SharedDayPage({ params }: PageProps) {
  const day = await fetchSharedWorkoutDay(params.id);
  if (!day) {
    notFound();
  }

  return <SharedDayView day={day} />;
}
