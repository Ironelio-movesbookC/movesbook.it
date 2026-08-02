import { prisma } from '@/lib/prisma';
import {
  fetchLegacyUserByEmail,
  fetchLegacyUsersByIds,
  resolveLegacyUserForPromocodeSession,
} from '@/lib/promocodes/legacyDb';
import {
  type MemberRegistrationInfoPayload,
  prismaUserTypeToRegistrationUserType,
  resolveMemberRegistrationInfo,
} from './memberRegistrationInfo';

export type MemberRegistrationInfoResponse = MemberRegistrationInfoPayload & {
  language: string;
};

async function resolveLegacySubscriptionForUser(userId: string): Promise<{
  subscriptionSettingId: number | null;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      username: true,
      name: true,
      userType: true,
      settings: { select: { language: true } },
    },
  });

  if (!user) {
    return {
      subscriptionSettingId: null,
      subscriptionStartDate: null,
      subscriptionEndDate: null,
    };
  }

  const legacySession = await resolveLegacyUserForPromocodeSession({
    modernUserId: userId,
    email: user.email,
    username: user.username,
    name: user.name,
    userType: user.userType,
  });

  if (legacySession?.legacyUserId) {
    const legacyMap = await fetchLegacyUsersByIds([legacySession.legacyUserId]);
    const legacyUser = legacyMap.get(legacySession.legacyUserId);
    if (legacyUser?.subscriptionSettingId) {
      return {
        subscriptionSettingId: legacyUser.subscriptionSettingId,
        subscriptionStartDate: legacyUser.subscriptionStartDate,
        subscriptionEndDate: legacyUser.subscriptionEndDate,
      };
    }
  }

  const legacyByEmail = await fetchLegacyUserByEmail(user.email);
  if (legacyByEmail?.subscriptionSettingId) {
    return {
      subscriptionSettingId: legacyByEmail.subscriptionSettingId,
      subscriptionStartDate: legacyByEmail.subscriptionStartDate,
      subscriptionEndDate: legacyByEmail.subscriptionEndDate,
    };
  }

  return {
    subscriptionSettingId: null,
    subscriptionStartDate: null,
    subscriptionEndDate: null,
  };
}

export async function getMemberRegistrationInfoForUser(
  userId: string,
): Promise<MemberRegistrationInfoResponse | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      userType: true,
      settings: { select: { language: true } },
    },
  });

  if (!user) return null;

  const registrationUserType = prismaUserTypeToRegistrationUserType(user.userType);
  if (!registrationUserType) return null;

  const legacySubscription = await resolveLegacySubscriptionForUser(userId);
  const info = resolveMemberRegistrationInfo({
    subscriptionSettingId: legacySubscription.subscriptionSettingId,
    registrationUserType,
    subscriptionStartDate: legacySubscription.subscriptionStartDate,
    subscriptionEndDate: legacySubscription.subscriptionEndDate,
  });

  if (!info) return null;

  return {
    ...info,
    language: user.settings?.language?.trim() || 'en',
  };
}
