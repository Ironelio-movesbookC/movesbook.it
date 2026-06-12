'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import ClubWebsiteMemberDisplay from '@/components/club/websiteSettings/ClubWebsiteMemberDisplay';
import ClubWebsiteDisplayPageShell from '@/components/club/websiteSettings/ClubWebsiteDisplayPageShell';

function ClubWebsiteDisplayContent() {
  const searchParams = useSearchParams();
  const queryClubId = searchParams?.get('clubId');

  return (
    <ClubWebsiteDisplayPageShell>
      {(ctx) => (
        <ClubWebsiteMemberDisplay
          clubId={queryClubId ?? ctx.clubId}
          clubDisplayName={ctx.clubDisplayName}
          adminDisplayName={ctx.adminDisplayName}
          clubType={ctx.clubType}
          adminCountry={ctx.adminCountry}
          adminLocality={ctx.adminLocality}
          logoImageUrl={ctx.logoImageUrl}
        />
      )}
    </ClubWebsiteDisplayPageShell>
  );
}

export default function ClubWebsiteDisplayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#ececec]">
          <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
        </div>
      }
    >
      <ClubWebsiteDisplayContent />
    </Suspense>
  );
}
