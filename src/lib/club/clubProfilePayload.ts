import {
  parseClubDescriptionMeta,
  type ClubDescriptionMeta,
} from '@/lib/club/clubSidebarLabel';
import { defaultClubSubscriptionEndDate } from '@/lib/admin/clubSubscriptionStatus';

import { DEFAULT_ENTITY_SPORT } from '@/lib/sport/entitySportOptions';

export type ClubProfileFormPayload = {
  username: string;
  category: string;
  /** Multicheck sports; category stays the primary (first) sport. */
  sports: string[];
  country: string;
  region: string;
  province: string;
  location: string;
  zipCode: string;
  address: string;
  geo: string;
  mail: string;
  phone: string;
  website: string;
  logoUrl: string;
  directAccess: string;
  officialName: string;
  directRegistrationCode: string;
  /** Empty when not changing password (edit mode). */
  clubPassword: string;
  /** Club-specific references (separate from the club admin account). */
  referencesHtml: string;
  referencesLevel: string;
};

export function clubToFormPayload(club: {
  name: string;
  description?: string | null;
  location?: string | null;
}): ClubProfileFormPayload {
  const meta = parseClubDescriptionMeta(club.description);
  const sports =
    Array.isArray(meta.sports) && meta.sports.length > 0
      ? meta.sports.map(String).filter(Boolean)
      : meta.category?.trim()
        ? [meta.category.trim()]
        : [DEFAULT_ENTITY_SPORT];
  return {
    username: meta.username?.trim() ?? '',
    category: sports[0] || meta.category?.trim() || DEFAULT_ENTITY_SPORT,
    sports,
    country: meta.country?.trim() ?? 'Italy',
    region: meta.region?.trim() ?? '',
    province: meta.province?.trim() ?? '',
    location: club.location?.trim() ?? '',
    zipCode: meta.zipCode?.trim() ?? '',
    address: meta.address?.trim() ?? '',
    geo: meta.geo?.trim() ?? '',
    mail: meta.mail?.trim() ?? '',
    phone: meta.phone?.trim() ?? '',
    website: meta.website?.trim() ?? '',
    logoUrl: meta.logoUrl?.trim() ?? '',
    directAccess: meta.directAccess?.trim() ?? '',
    officialName: club.name?.trim() ?? '',
    directRegistrationCode: meta.directRegistrationCode?.trim() ?? '',
    clubPassword: '',
    referencesHtml: meta.referencesHtml?.trim() ?? '',
    referencesLevel: meta.referencesLevel?.trim() || '1',
  };
}

export function mergeClubDescriptionForSave(
  existingDescription: string | null | undefined,
  payload: ClubProfileFormPayload,
  options?: { clubPasswordHash?: string; isCreate?: boolean },
): string {
  const prev = parseClubDescriptionMeta(existingDescription);
  const sports =
    Array.isArray(payload.sports) && payload.sports.length > 0
      ? payload.sports.map((s) => s.trim()).filter(Boolean)
      : payload.category.trim()
        ? [payload.category.trim()]
        : [];
  const meta: ClubDescriptionMeta = {
    ...prev,
    createdViaForm: true,
    subscriptionEnd:
      prev.subscriptionEnd?.trim() ||
      (options?.isCreate ? defaultClubSubscriptionEndDate() : undefined),
    username: payload.username.trim() || undefined,
    category: (sports[0] || payload.category.trim()) || undefined,
    sports: sports.length ? sports : undefined,
    country: payload.country.trim() || undefined,
    region: payload.region.trim() || undefined,
    province: payload.province.trim() || undefined,
    zipCode: payload.zipCode.trim() || undefined,
    address: payload.address.trim() || undefined,
    geo: payload.geo.trim() || undefined,
    mail: payload.mail.trim() || undefined,
    phone: payload.phone.trim() || undefined,
    website: payload.website.trim() || undefined,
    logoUrl: payload.logoUrl.trim() || undefined,
    directAccess: payload.directAccess.trim() || undefined,
    directRegistrationCode: payload.directRegistrationCode.trim() || undefined,
    clubPasswordHash: options?.clubPasswordHash ?? prev.clubPasswordHash,
    referencesHtml: payload.referencesHtml.trim() || undefined,
    referencesLevel: payload.referencesLevel.trim() || undefined,
    legalDocuments: prev.legalDocuments,
    defaultPaymentMethods: prev.defaultPaymentMethods,
    customQuestions: prev.customQuestions,
    teamProfile: prev.teamProfile,
  };
  const hasMeta = Object.values(meta).some((v) => v !== undefined && v !== '');
  return hasMeta ? JSON.stringify(meta) : JSON.stringify({ createdViaForm: true });
}

/** Update only club references inside `clubs_new.description` JSON. */
export function mergeClubReferencesForSave(
  existingDescription: string | null | undefined,
  references: { referencesHtml: string; referencesLevel: string },
): string {
  const prev = parseClubDescriptionMeta(existingDescription);
  const meta: ClubDescriptionMeta = {
    ...prev,
    createdViaForm: prev.createdViaForm ?? true,
    referencesHtml: references.referencesHtml.trim() || undefined,
    referencesLevel: references.referencesLevel.trim() || '1',
  };
  return JSON.stringify(meta);
}
