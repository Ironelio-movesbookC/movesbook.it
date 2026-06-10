'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import ClubWebsiteFriendItemEditor from '@/components/club/websiteSettings/ClubWebsiteFriendItemEditor';
import ClubWebsiteSettingsPageShell from '@/components/club/websiteSettings/ClubWebsiteSettingsPageShell';
import { useClubWebsiteFriendList } from '@/hooks/useClubWebsiteFriendList';
import { getFriendItemDeleteConfirmKey } from '@/lib/clubWebsiteFriendList';
import { useLanguage } from '@/contexts/LanguageContext';

function ClubWebsiteFriendsContent({ clubId, initialFriendId }: { clubId: string; initialFriendId?: string | null }) {
  const { t } = useLanguage();
  const { items, hydrated, updateItem, removeItem } = useClubWebsiteFriendList(clubId);
  const selected = items.find((i) => i.id === initialFriendId) ?? items[0] ?? null;

  useEffect(() => {
    if (!initialFriendId || !selected) return;
    if (selected.contentDisplayMode === 'link') {
      updateItem(selected.id, { contentDisplayMode: 'editor' });
    }
  }, [initialFriendId, selected, updateItem]);

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
      </div>
    );
  }

  if (!selected) {
    return (
      <p className="py-12 text-center text-sm text-zinc-600">{t('club_friend_empty_state')}</p>
    );
  }

  return (
    <ClubWebsiteFriendItemEditor
      item={selected}
      focusContentToken={initialFriendId ? 1 : 0}
      onUpdate={(patch) => updateItem(selected.id, patch)}
      deleteConfirmKey={getFriendItemDeleteConfirmKey(items, selected.id)}
      onDelete={selected.id !== 'friends-root' ? () => removeItem(selected.id) : undefined}
    />
  );
}

function ClubWebsiteFriendsPageInner() {
  const searchParams = useSearchParams();
  const friendId = searchParams?.get('id') ?? null;

  return (
    <ClubWebsiteSettingsPageShell>
      {(ctx) =>
        ctx.clubId ? (
          <div className="flex min-h-0 w-full flex-1 border border-zinc-400 bg-[#ececec]">
            <ClubWebsiteFriendsContent clubId={ctx.clubId} initialFriendId={friendId} />
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-zinc-600">
            No club selected. Create or select a club from the dashboard first.
          </p>
        )
      }
    </ClubWebsiteSettingsPageShell>
  );
}

export default function ClubWebsiteFriendsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
        </div>
      }
    >
      <ClubWebsiteFriendsPageInner />
    </Suspense>
  );
}
