'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import ClubWebsiteSettingsEditor from '@/components/club/websiteSettings/ClubWebsiteSettingsEditor';
import ClubWebsiteSettingsPageShell from '@/components/club/websiteSettings/ClubWebsiteSettingsPageShell';

export default function ClubWebsiteSettingsIndexPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
        </div>
      }
    >
      <ClubWebsiteSettingsPageShell>
        {(ctx) => (
          <ClubWebsiteSettingsEditor
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
    </Suspense>
  );
}
