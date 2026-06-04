'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import ClubWebsiteTopicsEditor from '@/components/club/websiteSettings/ClubWebsiteTopicsEditor';
import ClubWebsiteSettingsPageShell from '@/components/club/websiteSettings/ClubWebsiteSettingsPageShell';

function ClubWebsiteTopicsContent() {
  const searchParams = useSearchParams();
  const topicId = searchParams.get('id');

  return (
    <ClubWebsiteSettingsPageShell>
      {(ctx) =>
        ctx.clubId ? (
          <ClubWebsiteTopicsEditor
            clubId={ctx.clubId}
            clubDisplayName={ctx.clubDisplayName}
            adminDisplayName={ctx.adminDisplayName}
            clubType={ctx.clubType}
            adminCountry={ctx.adminCountry}
            adminLocality={ctx.adminLocality}
            logoImageUrl={ctx.logoImageUrl}
            initialTopicId={topicId}
          />
        ) : (
          <p className="py-12 text-center text-sm text-zinc-600">
            No club selected. Create or select a club from the dashboard first.
          </p>
        )
      }
    </ClubWebsiteSettingsPageShell>
  );
}

export default function ClubWebsiteTopicsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
        </div>
      }
    >
      <ClubWebsiteTopicsContent />
    </Suspense>
  );
}
