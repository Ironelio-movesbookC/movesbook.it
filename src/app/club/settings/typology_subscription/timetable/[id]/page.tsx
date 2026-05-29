'use client';

import { useParams } from 'next/navigation';
import ClubCardTimetablePage from '@/components/club/settings/ClubCardTimetablePage';

export default function TypologyTimetableByIdPage() {
  const params = useParams<{ id: string }>();
  const typologyId = String(params?.id ?? '');

  return <ClubCardTimetablePage initialTypologyId={typologyId} />;
}
