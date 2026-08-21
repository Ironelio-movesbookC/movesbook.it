export type CreatableCompaniesQuota = {
  limit: number;
  created: number;
  remaining: number | null;
  canCreate: boolean;
  unlimited: boolean;
};

export function formatCreatableCompaniesSidebarLabel(quota: CreatableCompaniesQuota): string {
  if (quota.unlimited) {
    return `Unlimited available created ${quota.created}`;
  }
  const available = quota.remaining ?? Math.max(0, quota.limit - quota.created);
  return `${available} available created ${quota.created}`;
}
