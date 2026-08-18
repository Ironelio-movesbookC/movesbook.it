'use client';

import Image from 'next/image';
import { User } from 'lucide-react';
import { flagEmojiFromCountryName } from '@/lib/admin/countryFlag';
import {
  entityCompanyLabel,
  gridCardShowsOwnedEntities,
  ownedEntitiesLabel,
  type AdminGridCardGroup,
} from '@/lib/admin/groupRegisteredUserGridCards';
import type { ClubSubscriptionStatusTone } from '@/lib/admin/clubSubscriptionStatus';
import { isClubAccountUserType } from '@/utils/dashboardRouting';

const isDataUrl = (src?: string | null) => typeof src === 'string' && src.startsWith('data:image/');

function clubAdminStatusClassName(tone?: ClubSubscriptionStatusTone): string {
  switch (tone) {
    case 'expiring':
      return 'text-amber-600 font-semibold';
    case 'partial-expired':
      return 'text-orange-600 font-semibold';
    case 'all-expired':
      return 'text-red-600 font-semibold';
    case 'active':
    default:
      return 'text-green-700 font-semibold';
  }
}

type AdminRegisteredUserGridCardProps = {
  group: AdminGridCardGroup;
  isAllSegment: boolean;
  isClubsSegment: boolean;
  onOpenClubPanel?: (userId: string, clubId: string | null) => void;
  onOpenUserProfile: (userId: string, entityId?: string | null) => void;
};

export default function AdminRegisteredUserGridCard({
  group,
  isAllSegment,
  isClubsSegment,
  onOpenClubPanel,
  onOpenUserProfile,
}: AdminRegisteredUserGridCardProps) {
  const { admin, entities } = group;
  const showOwnedList = gridCardShowsOwnedEntities(group);
  const isClubAdmin =
    isClubsSegment || (isAllSegment && isClubAccountUserType(admin.userType));
  const location = admin.location?.trim() || '';
  const dateLine = [admin.dateStart, admin.dateEnd].filter(Boolean).join(' — ');

  const openPanel = () => {
    if (isClubAdmin && onOpenClubPanel) {
      onOpenClubPanel(admin.id, admin.primaryClubId ?? null);
      return;
    }
    onOpenUserProfile(admin.id, admin.primaryClubId);
  };

  return (
    <div className="border border-gray-300 bg-white p-4 rounded shadow-sm text-sm">
      <div className="flex gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="font-semibold text-gray-900">{admin.displayName || '—'}</div>
          <div className="text-gray-700">
            {admin.country || '—'}{' '}
            {flagEmojiFromCountryName(admin.country) && (
              <span className="ml-0.5">{flagEmojiFromCountryName(admin.country)}</span>
            )}
          </div>
          {location ? <div className="text-gray-600">{location}</div> : null}
          {isClubAdmin && onOpenClubPanel ? (
            <button
              type="button"
              onClick={() => onOpenClubPanel(admin.id, admin.primaryClubId ?? null)}
              className="text-blue-800 underline hover:text-blue-950 text-left"
            >
              @{admin.accountUsername ?? admin.username}
            </button>
          ) : (
            <div className="text-gray-600">@{admin.accountUsername ?? admin.username}</div>
          )}
          {dateLine ? <div className="text-gray-600">{dateLine}</div> : null}
          <div className="text-gray-700">{admin.version}</div>
        </div>
        <button
          type="button"
          onClick={openPanel}
          className="w-14 h-14 shrink-0 border-2 border-red-600 bg-gray-50 flex items-center justify-center overflow-hidden"
          title="Open User Panel"
        >
          {admin.imageUrl ? (
            isDataUrl(admin.imageUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={admin.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Image
                src={admin.imageUrl}
                alt=""
                width={56}
                height={56}
                className="h-full w-full object-cover"
                unoptimized
              />
            )
          ) : (
            <User className="w-7 h-7 text-gray-400" />
          )}
        </button>
      </div>

      {showOwnedList ? (
        <>
          <p className="mt-3 text-red-600 font-semibold">
            {ownedEntitiesLabel(admin.userType, entities.length)}
          </p>
          <ul className="mt-2 space-y-2 border-t border-gray-200 pt-2">
            {entities.map((entity) => (
              <li
                key={entity.rowKey}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm"
              >
                <span className="text-gray-800">
                  {entityCompanyLabel(entity.entityKind)}:{' '}
                  <span className="font-medium">{entity.companyName?.trim() || '—'}</span>
                </span>
                {entity.dateEnd ? (
                  <span className="text-red-600 whitespace-nowrap">{entity.dateEnd}</span>
                ) : null}
                <span className={clubAdminStatusClassName(entity.statusTone)}>
                  {entity.status}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    isClubAdmin && entity.entityKind === 'club' && onOpenClubPanel
                      ? onOpenClubPanel(admin.id, (entity.primaryClubId ?? entity.entityId) ?? null)
                      : onOpenUserProfile(admin.id, entity.primaryClubId ?? entity.entityId)
                  }
                  className="text-blue-800 underline hover:text-blue-950"
                >
                  View profile
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <div className={`mt-2 ${clubAdminStatusClassName(admin.statusTone)}`}>{admin.status}</div>
          <button
            type="button"
            onClick={() => onOpenUserProfile(admin.id, admin.primaryClubId)}
            className="mt-2 text-left text-sm text-blue-800 underline hover:text-blue-950"
          >
            View profile (search)
          </button>
        </>
      )}
    </div>
  );
}
