import { prisma } from '@/lib/prisma';
import { isClubCreatedFromForm } from '@/lib/club/clubSidebarLabel';
import {
  canCreateAnotherCompany,
  getCreatableCompaniesLimit,
  isCreatableCompaniesUnlimited,
  remainingCreatableCompanies,
} from '@/lib/admin/subscriptionManageableUsers';
import { resolveLegacySubscriptionForUser } from '@/lib/registration/memberRegistrationInfoService';
import type { CreatableCompaniesQuota } from '@/lib/club/creatableCompaniesQuota.shared';

export type { CreatableCompaniesQuota } from '@/lib/club/creatableCompaniesQuota.shared';
export { formatCreatableCompaniesSidebarLabel } from '@/lib/club/creatableCompaniesQuota.shared';

function isClubAdminUserType(userType: string): boolean {
  return userType === 'CLUB' || userType === 'CLUB_TRAINER';
}

export async function countFormCreatedClubsForAdmin(userId: string): Promise<number> {
  const clubs = await prisma.club.findMany({
    where: { adminId: userId },
    select: { description: true },
  });
  return clubs.filter((club) => isClubCreatedFromForm(club)).length;
}

export async function getClubCreatableCompaniesQuota(
  userId: string,
  userType: string,
): Promise<CreatableCompaniesQuota | null> {
  if (!isClubAdminUserType(userType)) return null;

  const legacySubscription = await resolveLegacySubscriptionForUser(userId);
  const limit = getCreatableCompaniesLimit(legacySubscription.subscriptionSettingId);
  if (limit == null) return null;

  const created = await countFormCreatedClubsForAdmin(userId);
  const unlimited = isCreatableCompaniesUnlimited(limit);

  return {
    limit,
    created,
    remaining: remainingCreatableCompanies(limit, created),
    canCreate: canCreateAnotherCompany(limit, created),
    unlimited,
  };
}
