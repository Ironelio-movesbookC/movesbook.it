import type {
  ManagementFeatureEditData,
  ManagementFeatureGlobalSettings,
  ManagementFeatureLocalizedSettings,
  ManagementFeatureRow,
  ManagementSettingsData,
} from '@/types/adminFunctionSettings';
import { SUBSCRIPTION_LANGUAGES } from '@/lib/admin/subscriptionSettingsMock';

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
const globalSettingsCache = new Map<number, ManagementFeatureGlobalSettings>();
const localizedEditCache = new Map<string, ManagementFeatureLocalizedSettings>();

function buildDefault(lang: string): ManagementSettingsData {
  return {
    lang,
    features: DEFAULT_FEATURES.map((feature, index) => ({
      id: index + 1,
      ...feature,
    })),
  };
}

function ensureGlobalSettings(featureId: number, row?: ManagementFeatureRow): ManagementFeatureGlobalSettings {
  if (!globalSettingsCache.has(featureId)) {
    const source =
      row ??
      getManagementSettingsData('en').features.find((f) => f.id === featureId) ??
      DEFAULT_FEATURES[featureId - 1];
    if (!source) {
      throw new Error(`Unknown management feature id ${featureId}`);
    }
    globalSettingsCache.set(featureId, {
      id: featureId,
      clubVersions: {
        basic: source.basic,
        premium: source.premium,
        pro: source.pro,
      },
      optionalSubscription: source.optionalEnabled,
      priceOneYear: source.priceOneYear || 29,
      priceNoLimit: source.priceNoLimit || 290,
    });
  }
  return globalSettingsCache.get(featureId)!;
}

function localizedCacheKey(lang: string, id: number): string {
  return `${lang}-${id}`;
}

function buildLocalizedFromRow(lang: string, row: ManagementFeatureRow): ManagementFeatureLocalizedSettings {
  return {
    id: row.id,
    lang,
    functionName: row.name,
    linkedPackageFeature: '',
    description: lang === 'it' && row.id === 1 ? 'Registrazione utente in Italiano' : '',
    status: 'unpublish',
  };
}

function syncGlobalToAllLangLists(global: ManagementFeatureGlobalSettings): void {
  for (const { code } of SUBSCRIPTION_LANGUAGES) {
    const listData = getManagementSettingsData(code);
    const updatedFeatures = listData.features.map((row) =>
      row.id === global.id
        ? {
            ...row,
            basic: global.clubVersions.basic,
            premium: global.clubVersions.premium,
            pro: global.clubVersions.pro,
            optionalEnabled: global.optionalSubscription,
            priceOneYear: global.priceOneYear,
            priceNoLimit: global.priceNoLimit,
          }
        : row,
    );
    saveManagementSettingsData({ lang: code, features: updatedFeatures });
  }
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

export function getManagementFeatureGlobalSettings(
  featureId: number,
): ManagementFeatureGlobalSettings {
  const row = getManagementSettingsData('en').features.find((f) => f.id === featureId);
  return ensureGlobalSettings(featureId, row);
}

export function saveManagementFeatureGlobalSettings(
  global: ManagementFeatureGlobalSettings,
): void {
  globalSettingsCache.set(global.id, global);
  syncGlobalToAllLangLists(global);
}

function getManagementFeatureLocalizedSettings(
  lang: string,
  featureId: number,
): ManagementFeatureLocalizedSettings {
  const key = localizedCacheKey(lang, featureId);
  if (!localizedEditCache.has(key)) {
    const listData = getManagementSettingsData(lang);
    const row = listData.features.find((f) => f.id === featureId);
    if (!row) {
      throw new Error(`Unknown management feature id ${featureId}`);
    }
    localizedEditCache.set(key, buildLocalizedFromRow(lang, row));
  }
  return localizedEditCache.get(key)!;
}

function saveManagementFeatureLocalizedSettings(
  localized: ManagementFeatureLocalizedSettings,
): void {
  const key = localizedCacheKey(localized.lang, localized.id);
  localizedEditCache.set(key, localized);

  const listData = getManagementSettingsData(localized.lang);
  const updatedFeatures = listData.features.map((row) =>
    row.id === localized.id ? { ...row, name: localized.functionName } : row,
  );
  saveManagementSettingsData({ lang: localized.lang, features: updatedFeatures });
}

export function getManagementFeatureEditData(
  lang: string,
  featureId: number,
): ManagementFeatureEditData | null {
  const listData = getManagementSettingsData(lang);
  const row = listData.features.find((f) => f.id === featureId);
  if (!row) return null;

  const global = getManagementFeatureGlobalSettings(featureId);
  const localized = getManagementFeatureLocalizedSettings(lang, featureId);

  return {
    ...global,
    ...localized,
    lang,
  };
}

export function saveManagementFeatureEditData(editData: ManagementFeatureEditData): void {
  const global: ManagementFeatureGlobalSettings = {
    id: editData.id,
    clubVersions: editData.clubVersions,
    optionalSubscription: editData.optionalSubscription,
    priceOneYear: editData.priceOneYear,
    priceNoLimit: editData.priceNoLimit,
  };
  saveManagementFeatureGlobalSettings(global);

  const localized: ManagementFeatureLocalizedSettings = {
    id: editData.id,
    lang: editData.lang,
    functionName: editData.functionName,
    linkedPackageFeature: editData.linkedPackageFeature,
    description: editData.description,
    status: editData.status,
  };
  saveManagementFeatureLocalizedSettings(localized);
}

export function getManagementFeatureEditHref(lang: string, featureId: number): string {
  return `/subscriptions/function_settings_mang/edit/${featureId}/${lang}`;
}

export function getEnglishFunctionName(featureId: number): string {
  const localized = getManagementFeatureLocalizedSettings('en', featureId);
  return localized.functionName;
}
