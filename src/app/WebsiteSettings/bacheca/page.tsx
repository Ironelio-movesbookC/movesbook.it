'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import ClubBachecaEditor from '@/components/club/websiteSettings/ClubBachecaEditor';
import ClubWebsiteSettingsPageShell from '@/components/club/websiteSettings/ClubWebsiteSettingsPageShell';

export default function ClubWebsiteBachecaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
        </div>
      }
    >
      <ClubWebsiteSettingsPageShell>
        {(ctx) =>
          ctx.clubId ? (
            <ClubBachecaEditor
              clubId={ctx.clubId}
              clubDisplayName={ctx.clubDisplayName}
              adminDisplayName={ctx.adminDisplayName}
              clubType={ctx.clubType}
              adminCountry={ctx.adminCountry}
              adminLocality={ctx.adminLocality}
              logoImageUrl={ctx.logoImageUrl}
            />
          ) : (
            <p className="py-12 text-center text-sm text-zinc-600">
              No club selected. Create or select a club from the dashboard first.
            </p>
          )
        }
      </ClubWebsiteSettingsPageShell>
    </Suspense>
  );
}
