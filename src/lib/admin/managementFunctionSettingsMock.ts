import type {
  ManagementFeatureEditData,
  ManagementFeatureRow,
  ManagementSettingsData,
} from '@/types/adminFunctionSettings';

export const PACKAGE_FEATURES = [
  { value: '', label: 'Select package feature' },
  { value: 'members_registry', label: 'Members registry' },
  { value: 'staff_management', label: 'Staff management' },
  { value: 'access_control', label: 'Access control' },
  { value: 'financial_reports', label: 'Financial reports' },
  { value: 'booking_calendar', label: 'Booking calendar' },
  { value: 'document_archive', label: 'Document archive' },
  { value: 'audit_logs', label: 'Audit logs' },
];

const DEFAULT_FEATURES: Omit<ManagementFeatureRow, 'id'>[] = [
  { name: 'Members registry', basic: true, premium: true, pro: true, optionalEnabled: true, priceOneYear: 10, priceNoLimit: 100 },
  { name: 'Staff management', basic: false, premium: true, pro: true, optionalEnabled: false, priceOneYear: 20, priceNoLimit: 200 },
  { name: 'Access control', basic: true, premium: true, pro: true, optionalEnabled: true, priceOneYear: 50, priceNoLimit: 350 },
  { name: 'Financial reports', basic: false, premium: false, pro: true, optionalEnabled: true, priceOneYear: 60, priceNoLimit: 600 },
  { name: 'Inventory tracking', basic: true, premium: false, pro: false, optionalEnabled: false, priceOneYear: 0, priceNoLimit: 0 },
  { name: 'Booking calendar', basic: true, premium: true, pro: true, optionalEnabled: true, priceOneYear: 30, priceNoLimit: 300 },
  { name: 'Document archive', basic: false, premium: true, pro: true, optionalEnabled: true, priceOneYear: 40, priceNoLimit: 400 },
  { name: 'Contract management', basic: false, premium: false, pro: true, optionalEnabled: false, priceOneYear: 0, priceNoLimit: 0 },
  { name: 'Attendance monitoring', basic: true, premium: true, pro: true, optionalEnabled: true, priceOneYear: 10, priceNoLimit: 100 },
  { name: 'Payment reminders', basic: false, premium: true, pro: true, optionalEnabled: true, priceOneYear: 20, priceNoLimit: 200 },
  { name: 'Multi-site management', basic: false, premium: false, pro: true, optionalEnabled: true, priceOneYear: 50, priceNoLimit: 350 },
  { name: 'Role permissions', basic: true, premium: true, pro: true, optionalEnabled: false, priceOneYear: 0, priceNoLimit: 0 },
  { name: 'Audit logs', basic: false, premium: true, pro: true, optionalEnabled: true, priceOneYear: 30, priceNoLimit: 300 },
  { name: 'Export to accounting', basic: false, premium: false, pro: true, optionalEnabled: true, priceOneYear: 60, priceNoLimit: 600 },
  { name: 'Custom dashboards', basic: false, premium: true, pro: true, optionalEnabled: true, priceOneYear: 40, priceNoLimit: 400 },
  { name: 'API integrations', basic: false, premium: false, pro: true, optionalEnabled: false, priceOneYear: 0, priceNoLimit: 0 },
  { name: 'Automated notifications', basic: true, premium: true, pro: true, optionalEnabled: true, priceOneYear: 10, priceNoLimit: 100 },
  { name: 'Help desk module', basic: false, premium: true, pro: true, optionalEnabled: true, priceOneYear: 20, priceNoLimit: 200 },
];

const settingsCache = new Map<string, ManagementSettingsData>();

function buildDefault(lang: string): ManagementSettingsData {
  return {
    lang,
    features: DEFAULT_FEATURES.map((feature, index) => ({
      id: index + 1,
      ...feature,
    })),
  };
}

export function getManagementSettingsData(lang: string): ManagementSettingsData {
  const key = lang || 'en';
  if (!settingsCache.has(key)) {
    settingsCache.set(key, buildDefault(key));
  }
  return settingsCache.get(key)!;
}

export function saveManagementSettingsData(data: ManagementSettingsData): void {
  settingsCache.set(data.lang, data);
}

const editCache = new Map<string, ManagementFeatureEditData>();

function editCacheKey(lang: string, id: number): string {
  return `${lang}-${id}`;
}

function buildEditDataFromRow(lang: string, row: ManagementFeatureRow): ManagementFeatureEditData {
  return {
    id: row.id,
    lang,
    functionName: row.name,
    linkedPackageFeature: '',
    description: '',
    status: 'unpublish',
    clubVersions: {
      basic: row.basic,
      premium: row.premium,
      pro: row.pro,
    },
    optionalSubscription: row.optionalEnabled,
    priceOneYear: row.priceOneYear || 29,
    priceNoLimit: row.priceNoLimit || 290,
  };
}

export function getManagementFeatureEditData(
  lang: string,
  featureId: number,
): ManagementFeatureEditData | null {
  const listData = getManagementSettingsData(lang);
  const row = listData.features.find((f) => f.id === featureId);
  if (!row) return null;

  const key = editCacheKey(lang, featureId);
  if (!editCache.has(key)) {
    editCache.set(key, buildEditDataFromRow(lang, row));
  }
  return editCache.get(key)!;
}

export function saveManagementFeatureEditData(editData: ManagementFeatureEditData): void {
  const key = editCacheKey(editData.lang, editData.id);
  editCache.set(key, editData);

  const listData = getManagementSettingsData(editData.lang);
  const updatedFeatures = listData.features.map((row) =>
    row.id === editData.id
      ? {
          ...row,
          name: editData.functionName,
          basic: editData.clubVersions.basic,
          premium: editData.clubVersions.premium,
          pro: editData.clubVersions.pro,
          optionalEnabled: editData.optionalSubscription,
          priceOneYear: editData.priceOneYear,
          priceNoLimit: editData.priceNoLimit,
        }
      : row,
  );
  saveManagementSettingsData({ lang: editData.lang, features: updatedFeatures });
}

export function getManagementFeatureEditHref(lang: string, featureId: number): string {
  return `/subscriptions/function_settings_mang/edit/${featureId}/${lang}`;
}
