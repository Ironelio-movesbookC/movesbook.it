import { parseAdminSettingsJson } from '@/lib/admin/userProfilePanelSettings';
import { mergePcuSettingsPatch } from '@/lib/admin/userPcuFunctionsSettings';
import type { PcuFunctionsSettings } from '@/lib/admin/userPcuFunctionsSettings';
import {
  createNewsCategoriesState,
  createVipCountriesState,
} from '@/lib/admin/pcuAdminSettingsOptions';

/** Per-entity PCU settings bucket inside `adminSettings.pcu.byEntity`. */
export const PCU_BY_ENTITY_KEY = 'byEntity';

const ENTITY_SCOPED_PCU_KEYS = [
  'extend',
  'assignment',
  'publishing',
  'sponsors',
  'blocks',
  'alert',
  'vip',
  'functions',
  'alertMsg',
  'idCards',
  'deletePosts',
] as const;

function hasEntityScopedPcuContent(settings: Record<string, unknown> | null | undefined): boolean {
  if (!settings) return false;
  return ENTITY_SCOPED_PCU_KEYS.some((key) => settings[key] != null);
}

function readLegacyRootPcuSettings(store: Record<string, unknown>): PcuSettings | null {
  const { [PCU_BY_ENTITY_KEY]: _byEntity, ...root } = store;
  if (!hasEntityScopedPcuContent(root)) return null;
  return root as PcuSettings;
}

export type PcuSettings = {
  extend?: { enabled?: boolean; months?: string };
  assignment?: {
    asOperator?: boolean;
    operatorId?: string;
    asAgent?: boolean;
    agentId?: string;
  };
  publishing?: {
    enableUserComments?: boolean;
    enableFeedback?: boolean;
    enableBlogs?: boolean;
    blogsDate?: string;
    enableReviews?: boolean;
    reviewsDate?: string;
    disableComments?: {
      reviews?: boolean;
      suggestions?: boolean;
      htmlDocsNews?: boolean;
      queries?: boolean;
      bugs?: boolean;
      blogs?: boolean;
    };
    newsCategories?: Record<string, boolean>;
  };
  sponsors?: {
    enableSponsors?: boolean;
    lastPurchase?: string;
    expirationDate?: string;
    numberEnabled?: string;
    costLastPurchase?: string;
    paymentStatus?: string;
  };
  blocks?: {
    blockUserEnabled?: boolean;
    blockUserAfterDate?: string;
    blockAreas?: { social?: boolean; training?: boolean; management?: boolean };
    blockAssignmentsEnabled?: boolean;
    blockAssignmentsAfterDate?: string;
  };
  alert?: { enabled?: boolean; htmlByLang?: Record<string, string> };
  vip?: {
    showInReferenceList?: boolean;
    showInBanner?: boolean;
    usernameEnabled?: boolean;
    youtubeEnabled?: boolean;
    bannerImage?: string | null;
    username?: string;
    youtubeUrl?: string;
    referencesHtmlByLang?: Record<string, string>;
    priorityLevel?: string;
    favourite?: boolean;
    enabled?: boolean;
    types?: Record<string, boolean>;
    visibleToUserTypes?: Record<string, boolean>;
    languagesAllowed?: Record<string, boolean>;
    countriesAllowed?: Record<string, boolean>;
    duration?: string;
    allowVisitors?: {
      profile?: boolean;
      biography?: boolean;
      friendship?: boolean;
      mail?: boolean;
    };
  };
  functions?: PcuFunctionsSettings;
  alertMsg?: {
    activated?: boolean;
    enableFrom?: string;
    enableTo?: string;
    showAt?: { login?: boolean; logout?: boolean };
    htmlByLang?: Record<string, string>;
  };
  idCards?: {
    terms?: { creditCard?: boolean; sendMoneyLaterDays?: string };
    messages?: {
      afterExpeditionNotPaid?: {
        enabled?: boolean;
        days?: string;
        htmlByLang?: Record<string, string>;
      };
      thirdPartyPricelist?: { enabled?: boolean; htmlByLang?: Record<string, string> };
    };
    cardsEnabled?: Record<string, unknown>;
    history?: Record<string, unknown>;
  };
  deletePosts?: Record<string, unknown>;
  updatedAt?: string;
};

function readPcuSettingsStore(adminSettingsRaw: string | null | undefined): Record<string, unknown> {
  const adminSettings = parseAdminSettingsJson(adminSettingsRaw);
  const pcu = adminSettings.pcu;
  if (!pcu || typeof pcu !== 'object') return {};
  return pcu as Record<string, unknown>;
}

/** Resolve entity id from query/body (`entityId` or legacy `clubId`). */
export function resolvePcuEntityId(
  ...candidates: (string | null | undefined)[]
): string | null {
  for (const candidate of candidates) {
    const id = candidate?.trim();
    if (id) return id;
  }
  return null;
}

/**
 * Load PCU tab settings for the active scope.
 * - With `entityId`: settings for that club/team/group/coaching group only.
 * - Without `entityId`: account-level settings (single user / coach account).
 */
export function readPcuSettingsForScope(
  adminSettingsRaw: string | null | undefined,
  entityId?: string | null,
): PcuSettings | null {
  const store = readPcuSettingsStore(adminSettingsRaw);
  const id = entityId?.trim();

  if (id) {
    const byEntity = store[PCU_BY_ENTITY_KEY];
    if (byEntity && typeof byEntity === 'object') {
      const entitySettings = (byEntity as Record<string, unknown>)[id];
      if (
        entitySettings &&
        typeof entitySettings === 'object' &&
        hasEntityScopedPcuContent(entitySettings as Record<string, unknown>)
      ) {
        return entitySettings as PcuSettings;
      }
    }
    // Pre-migration installs kept one shared blob at the root for every owned entity.
    return readLegacyRootPcuSettings(store);
  }

  const { [PCU_BY_ENTITY_KEY]: _byEntity, ...root } = store;
  if (Object.keys(root).length === 0) return null;
  return root as PcuSettings;
}

/** @deprecated Prefer {@link readPcuSettingsForScope} — account-level settings only. */
export function readPcuSettings(adminSettingsRaw: string | null | undefined): PcuSettings | null {
  return readPcuSettingsForScope(adminSettingsRaw, null);
}

/** Merge a PCU PATCH into admin settings for the given entity (or account when no entity). */
export function mergePcuSettingsForScope(
  adminSettingsRaw: string | null | undefined,
  entityId: string | null | undefined,
  patch: Record<string, unknown>,
): string {
  const adminSettings = parseAdminSettingsJson(adminSettingsRaw);
  const prevStore = readPcuSettingsStore(adminSettingsRaw);
  const id = entityId?.trim();
  const updatedAt = new Date().toISOString();

  if (id) {
    const byEntityRaw = prevStore[PCU_BY_ENTITY_KEY];
    const byEntity: Record<string, unknown> =
      byEntityRaw && typeof byEntityRaw === 'object'
        ? { ...(byEntityRaw as Record<string, unknown>) }
        : {};
    const prevEntity =
      byEntity[id] && typeof byEntity[id] === 'object'
        ? (byEntity[id] as Record<string, unknown>)
        : {};
    byEntity[id] = {
      ...mergePcuSettingsPatch(prevEntity, patch),
      updatedAt,
    };
    const nextStore = { ...prevStore, [PCU_BY_ENTITY_KEY]: byEntity, updatedAt };
    return JSON.stringify({ ...adminSettings, pcu: nextStore });
  }

  const { [PCU_BY_ENTITY_KEY]: byEntity, ...prevRoot } = prevStore;
  const mergedRoot = mergePcuSettingsPatch(prevRoot, patch);
  const nextStore = {
    ...mergedRoot,
    ...(byEntity && typeof byEntity === 'object' ? { [PCU_BY_ENTITY_KEY]: byEntity } : {}),
    updatedAt,
  };
  return JSON.stringify({ ...adminSettings, pcu: nextStore });
}

/** Merge saved country / news category maps with full option lists. */
export function mergeVipCountriesAllowed(saved?: Record<string, boolean>): Record<string, boolean> {
  const base = createVipCountriesState();
  if (!saved) return base;
  const next: Record<string, boolean> = { ...base, all: Boolean(saved.all) };
  for (const key of Object.keys(base)) {
    if (key === 'all') continue;
    if (key in saved) next[key] = Boolean(saved[key]);
  }
  return next;
}

export function mergeNewsCategories(saved?: Record<string, boolean>): Record<string, boolean> {
  return createNewsCategoriesState(saved);
}

export function mergeRecordFlags(
  defaults: Record<string, boolean>,
  saved?: Record<string, boolean>,
): Record<string, boolean> {
  if (!saved) return { ...defaults };
  const next = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (key in saved) next[key] = Boolean(saved[key]);
  }
  return next;
}
