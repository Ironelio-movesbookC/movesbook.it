'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import ClubWebsiteMemberDisplay from '@/components/club/websiteSettings/ClubWebsiteMemberDisplay';
import ClubWebsiteSettingsPageShell from '@/components/club/websiteSettings/ClubWebsiteSettingsPageShell';

function ClubWebsiteDisplayContent() {
  return (
      <ClubWebsiteSettingsPageShell>
        {(ctx) => (
          <ClubWebsiteMemberDisplay
            clubId={ctx.clubId}
            clubDisplayName={ctx.clubDisplayName}
            adminDisplayName={ctx.adminDisplayName}
            clubType={ctx.clubType}
            adminCountry={ctx.adminCountry}
            adminLocality={ctx.adminLocality}
            logoImageUrl={ctx.logoImageUrl}
          />
        )}
      </ClubWebsiteSettingsPageShell>
  );
}

export default function ClubWebsiteDisplayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
        </div>
      }
    >
      <ClubWebsiteDisplayContent />
    </Suspense>
  );
}
