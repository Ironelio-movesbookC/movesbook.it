import { parseAdminSettingsJson } from '@/lib/admin/userProfilePanelSettings';
import type { PcuFunctionsSettings } from '@/lib/admin/userPcuFunctionsSettings';
import {
  createNewsCategoriesState,
  createVipCountriesState,
} from '@/lib/admin/pcuAdminSettingsOptions';

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

export function readPcuSettings(adminSettingsRaw: string | null | undefined): PcuSettings | null {
  const adminSettings = parseAdminSettingsJson(adminSettingsRaw);
  const pcu = adminSettings.pcu;
  if (!pcu || typeof pcu !== 'object') return null;
  return pcu as PcuSettings;
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
