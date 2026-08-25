'use client';
import Image from 'next/image';

import { useState } from 'react';
import { X } from 'lucide-react';

type Props = {
  displayName: string;
  image: string | null;
  t: (key: string) => string;
};

/** Static demo notifications until API wiring exists. */
const DEMO_NOTIFICATIONS = {
  memberConfirmed: true,
  inviteSent: true,
} as const;

export function SearchResultUserWallNotifications({ displayName, image, t }: Props) {
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState(true);

  const memberVisible =
    DEMO_NOTIFICATIONS.memberConfirmed && !dismissed.memberConfirmed && showAll;
  const inviteVisible = DEMO_NOTIFICATIONS.inviteSent && !dismissed.inviteSent && showAll;

  if (!memberVisible && !inviteVisible) {
    return null;
  }

  return (
    <div className="space-y-3">
      {memberVisible ? (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-emerald-800 shadow-sm">
          {t('searchresult_member_confirmed')}
        </div>
      ) : null}

      {(memberVisible || inviteVisible) && (
        <label className="flex cursor-pointer items-center justify-end gap-2 text-xs text-zinc-700">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
            className="rounded border-zinc-400"
          />
          {t('searchresult_show_all_notifications')}
        </label>
      )}

      {inviteVisible ? (
        <div className="relative overflow-hidden rounded border-2 border-red-400 bg-sky-100 shadow-sm">
          <button
            type="button"
            onClick={() => setDismissed((prev) => ({ ...prev, inviteSent: true }))}
            className="absolute left-2 top-2 z-10 text-red-600 hover:text-red-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>

          <div className="flex gap-3 p-3 pt-8 sm:pt-3 sm:pl-10">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="rounded bg-blue-600 px-3 py-1.5 text-center text-sm font-semibold text-white">
                {displayName}
              </div>
              <p className="text-sm font-medium text-red-700">
                {t('searchresult_invite_notice_body')}
              </p>
            </div>
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded border border-zinc-300 bg-white shadow">
              {image ? (
                <Image src={image} alt="" className="h-full w-full object-cover" width={40} height={40} unoptimized />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                  —
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
