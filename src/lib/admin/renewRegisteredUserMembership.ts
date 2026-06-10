import {
  inferMembershipEndDateYmd,
  parseClubSubscriptionEndDate,
  parseClubSubscriptionStartDate,
} from '@/lib/admin/clubSubscriptionStatus';
import {
  applyMembershipRenewalToAdminSettings,
  computeRenewalEndDate,
  computeRenewalStartDate,
  shouldSyncPcuAccessOnRenewal,
  type MembershipRenewalInput,
} from '@/lib/admin/networkSubscriptionHistory';
import { mergeClubSubscriptionDates } from '@/lib/club/clubProfilePayload';
import {
  mergePcuAccessIntoAdminSettings,
  readPcuAccessSettings,
} from '@/lib/admin/userPcuAccessSettings';
import {
  pickPrimaryMembershipEntityId,
  type MembershipEntityKind,
} from '@/lib/admin/membershipEntity';

export type { MembershipEntityKind };

export type MembershipRenewalTarget = {
  userId: string;
  entityId: string;
  entityKind: MembershipEntityKind;
  dateStart: string;
  dateEnd: string | null;
  version?: string;
  companyName?: string;
  username?: string;
};

type DescribedEntity = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
};

export type RenewalUserRecord = {
  id: string;
  username: string;
  createdAt: Date;
  ownedClubs: DescribedEntity[];
  ownedTeams: DescribedEntity[];
  ownedGroups: DescribedEntity[];
  ownedCoachingGroups: DescribedEntity[];
};

function subscriptionWindowFromEntity(entity: DescribedEntity): {
  dateStart: string;
  dateEnd: string | null;
} {
  const dateStart =
    parseClubSubscriptionStartDate(entity.description, entity.createdAt) ||
    entity.createdAt.toISOString().slice(0, 10);
  const parsedEnd = parseClubSubscriptionEndDate(entity.description, entity.createdAt);
  const dateEnd =
    inferMembershipEndDateYmd(
      dateStart,
      parsedEnd?.toISOString().slice(0, 10) ?? null,
    ) ?? null;
  return { dateStart, dateEnd };
}

function subscriptionWindowFromAccount(
  user: RenewalUserRecord,
  adminSettingsRaw: string | null | undefined,
): { dateStart: string; dateEnd: string | null } {
  const defaultStart = user.createdAt.toISOString().slice(0, 10);
  const defaultEnd = inferMembershipEndDateYmd(defaultStart, null) ?? '';
  const pcu = readPcuAccessSettings(adminSettingsRaw, {
    accessStartIso: defaultStart,
    accessEndIso: defaultEnd,
  });
  const dateStart = pcu.accessStartIso.trim().slice(0, 10) || defaultStart;
  const dateEnd =
    inferMembershipEndDateYmd(dateStart, pcu.accessEndIso.trim().slice(0, 10) || null) ?? null;
  return { dateStart, dateEnd };
}

export type RenewMembershipResult = {
  userId: string;
  entityId: string;
  entityKind: MembershipEntityKind;
  dateStart: string;
  dateEnd: string;
  adminSettings: string;
};

export async function renewMembershipForTarget(
  user: RenewalUserRecord,
  target: MembershipRenewalTarget,
  adminSettingsRaw: string,
  updateEntityDescription: (
    kind: MembershipEntityKind,
    entityId: string,
    description: string,
  ) => Promise<void>,
): Promise<RenewMembershipResult> {
  let previousStart: string;
  let previousEnd: string | null;
  let previousMeta: Pick<
    MembershipRenewalInput,
    'version' | 'entityId' | 'companyName' | 'username'
  >;

  if (target.entityKind === 'account' || target.entityId === user.id) {
    const accountWindow = subscriptionWindowFromAccount(user, adminSettingsRaw);
    previousStart = accountWindow.dateStart;
    previousEnd = accountWindow.dateEnd;
    previousMeta = {
      entityId: null,
      companyName: target.companyName,
      username: target.username || user.username,
      version: target.version,
    };
  } else {
    const entity =
      target.entityKind === 'club'
        ? user.ownedClubs.find((c) => c.id === target.entityId)
        : target.entityKind === 'team'
          ? user.ownedTeams.find((t) => t.id === target.entityId)
          : target.entityKind === 'group'
            ? user.ownedGroups.find((g) => g.id === target.entityId)
            : user.ownedCoachingGroups.find((g) => g.id === target.entityId);

    if (!entity) {
      throw new Error(
        `${target.entityKind} ${target.entityId} not owned by user ${target.userId}`,
      );
    }

    const window = subscriptionWindowFromEntity(entity);
    previousStart = window.dateStart;
    previousEnd = window.dateEnd;
    previousMeta = {
      entityId: entity.id,
      companyName: target.companyName ?? entity.name?.trim(),
      username: target.username,
      version: target.version,
    };
  }

  const previous: MembershipRenewalInput = {
    dateStart: previousStart,
    dateEnd: previousEnd,
    ...previousMeta,
  };

  const nextStart = computeRenewalStartDate(previousEnd);
  const nextEnd = computeRenewalEndDate(nextStart);

  let nextAdminSettings = applyMembershipRenewalToAdminSettings(
    adminSettingsRaw,
    previous,
    nextStart,
    nextEnd,
  );

  const pcuDefaults = {
    accessStartIso: previousStart,
    accessEndIso: previousEnd ?? '',
  };
  const pcuAccess = readPcuAccessSettings(nextAdminSettings, pcuDefaults);
  const primaryEntityId = pickPrimaryMembershipEntityId(user);

  if (
    shouldSyncPcuAccessOnRenewal(
      target.entityKind === 'account' ? null : target.entityId,
      primaryEntityId,
      previous,
      pcuAccess,
    )
  ) {
    nextAdminSettings = mergePcuAccessIntoAdminSettings(nextAdminSettings, {
      accessStartIso: nextStart,
      accessEndIso: nextEnd,
    });
  }

  if (target.entityKind !== 'account' && target.entityId !== user.id) {
    const entity =
      target.entityKind === 'club'
        ? user.ownedClubs.find((c) => c.id === target.entityId)
        : target.entityKind === 'team'
          ? user.ownedTeams.find((t) => t.id === target.entityId)
          : target.entityKind === 'group'
            ? user.ownedGroups.find((g) => g.id === target.entityId)
            : user.ownedCoachingGroups.find((g) => g.id === target.entityId);

    if (entity) {
      const nextDescription = mergeClubSubscriptionDates(
        entity.description,
        nextStart,
        nextEnd,
      );
      await updateEntityDescription(target.entityKind, entity.id, nextDescription);
      entity.description = nextDescription;
    }
  }

  return {
    userId: user.id,
    entityId: target.entityId,
    entityKind: target.entityKind,
    dateStart: nextStart,
    dateEnd: nextEnd,
    adminSettings: nextAdminSettings,
  };
}
