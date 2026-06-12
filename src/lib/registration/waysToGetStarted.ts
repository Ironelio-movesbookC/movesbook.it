import {
  PACKAGE_TYPE_CONFIGS,
  getGlobalPackages,
  getTiersForUserType,
} from '@/lib/admin/packageSettingsMock';
import { getPackageDisplayTitle } from '@/lib/admin/packageSettingsLang';
import type { PackageItem, PackageTypeId } from '@/types/adminPackageSettings';
import type { SubscriptionUserType } from '@/types/adminSubscriptionSettings';
import { getSubscriptionRowsByUserType } from '@/lib/admin/subscriptionSettingsMock';

export type RegistrationUserType = 'athlete' | 'coach' | 'team' | 'club' | 'group';

export const REGISTRATION_USER_TYPE_TABS: {
  key: RegistrationUserType;
  label: string;
  subscriptionType: SubscriptionUserType;
  packageTypeId: PackageTypeId;
}[] = [
  { key: 'athlete', label: 'Single User', subscriptionType: 'athlete', packageTypeId: 5 },
  { key: 'coach', label: 'Coach', subscriptionType: 'coach', packageTypeId: 6 },
  { key: 'team', label: 'Team', subscriptionType: 'team', packageTypeId: 7 },
  { key: 'club', label: 'Club', subscriptionType: 'club', packageTypeId: 8 },
  { key: 'group', label: 'Group', subscriptionType: 'group', packageTypeId: 9 },
];

export type RegistrationSubscriptionVersion = {
  id: number;
  listOrder: number;
  name: string;
  price: number;
  durationDays: number;
  isDefault?: boolean;
};

export function getRegistrationVersions(
  userType: RegistrationUserType,
): RegistrationSubscriptionVersion[] {
  const tab = REGISTRATION_USER_TYPE_TABS.find((t) => t.key === userType);
  if (!tab) return [];

  return getSubscriptionRowsByUserType(tab.subscriptionType)
    .filter((row) => !row.isTemplate && row.name)
    .map((row) => ({
      id: row.id,
      listOrder: row.listOrder,
      name: row.name,
      price: row.price1,
      durationDays: row.days1,
      isDefault: row.isDefault,
    }));
}

export function getDefaultVersionId(userType: RegistrationUserType): number | null {
  const versions = getRegistrationVersions(userType);
  return versions.find((v) => v.isDefault)?.id ?? versions[0]?.id ?? null;
}

export function getPackageTypeIdForUserType(userType: RegistrationUserType): PackageTypeId {
  return REGISTRATION_USER_TYPE_TABS.find((t) => t.key === userType)?.packageTypeId ?? 5;
}

export function formatRegistrationPrice(price: number): string {
  if (price === 0) return 'Free';
  return `€ ${Number.isInteger(price) ? price : price.toFixed(2)}`;
}

export type RegistrationVersionColumn = {
  key: string;
  label: string;
  price: number;
};

export type RegistrationPackageReviewRow = {
  id: number;
  title: string;
  description: string;
  tiers: Record<string, boolean>;
};

export function getUserTypeReviewLabel(userType: RegistrationUserType): string {
  const tab = REGISTRATION_USER_TYPE_TABS.find((t) => t.key === userType);
  return tab?.label ?? 'Single User';
}

export function getVersionColumnsForUserType(
  userType: RegistrationUserType,
): RegistrationVersionColumn[] {
  const tab = REGISTRATION_USER_TYPE_TABS.find((t) => t.key === userType);
  if (!tab) return [];

  const config = PACKAGE_TYPE_CONFIGS.find((c) => c.id === tab.packageTypeId);
  const subscriptionRows = getSubscriptionRowsByUserType(tab.subscriptionType).filter(
    (row) => !row.isTemplate && row.name,
  );
  if (!config) return [];

  return config.tiers.map((tier, index) => ({
    key: tier.key,
    label: tier.label,
    price: subscriptionRows[index]?.price1 ?? 0,
  }));
}

export function getPackageReviewRows(
  userType: RegistrationUserType,
  lang: string,
): RegistrationPackageReviewRow[] {
  const userTypeId = getPackageTypeIdForUserType(userType);

  return getGlobalPackages()
    .filter((pkg) => pkg.published)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((pkg) => packageToReviewRow(pkg, userTypeId, lang));
}

function packageToReviewRow(
  pkg: PackageItem,
  userTypeId: PackageTypeId,
  lang: string,
): RegistrationPackageReviewRow {
  const description =
    pkg.descriptionsByLang[lang] ||
    pkg.descriptionsByLang.en ||
    Object.values(pkg.descriptionsByLang).find(Boolean) ||
    '';

  return {
    id: pkg.id,
    title: getPackageDisplayTitle(pkg.titlesByLang, lang).toUpperCase(),
    description,
    tiers: getTiersForUserType(pkg, userTypeId),
  };
}
