import {
  parseClubDescriptionMeta,
  type ClubDescriptionMeta,
} from '@/lib/club/clubSidebarLabel';
import { defaultClubSubscriptionEndDate } from '@/lib/admin/clubSubscriptionStatus';

export type ClubProfileFormPayload = {
  username: string;
  category: string;
  country: string;
  region: string;
  location: string;
  zipCode: string;
  address: string;
  geo: string;
  mail: string;
  directAccess: string;
  officialName: string;
  directRegistrationCode: string;
  /** Empty when not changing password (edit mode). */
  clubPassword: string;
  /** Club-specific references (separate from the club admin account). */
  referencesHtml: string;
  referencesLevel: string;
};

export type ClubProfileSavePayload = ClubProfileFormPayload & {
  logoFile?: File | null;
  removeLogo?: boolean;
};

export function clubProfilePayloadForApi(
  payload: ClubProfileSavePayload,
): ClubProfileFormPayload {
  const { logoFile: _logoFile, removeLogo: _removeLogo, ...rest } = payload;
  return rest;
}

export function clubToFormPayload(club: {
  name: string;
  description?: string | null;
  location?: string | null;
}): ClubProfileFormPayload {
  const meta = parseClubDescriptionMeta(club.description);
  return {
    username: meta.username?.trim() ?? '',
    category: meta.category?.trim() ?? 'Gym',
    country: meta.country?.trim() ?? 'Italy',
    region: meta.region?.trim() ?? '',
    location: club.location?.trim() ?? '',
    zipCode: meta.zipCode?.trim() ?? '',
    address: meta.address?.trim() ?? '',
    geo: meta.geo?.trim() ?? '',
    mail: meta.mail?.trim() ?? '',
    directAccess: meta.directAccess?.trim() ?? '',
    officialName: club.name?.trim() ?? '',
    directRegistrationCode: meta.directRegistrationCode?.trim() ?? '',
    clubPassword: '',
    referencesHtml: meta.referencesHtml?.trim() ?? '',
    referencesLevel: meta.referencesLevel?.trim() || '1',
  };
}

export function mergeClubSubscriptionDates(
  existingDescription: string | null | undefined,
  subscriptionStart: string,
  subscriptionEnd: string,
): string {
  const prev = parseClubDescriptionMeta(existingDescription);
  const meta: ClubDescriptionMeta = {
    ...prev,
    subscriptionStart: subscriptionStart.trim().slice(0, 10) || undefined,
    subscriptionEnd: subscriptionEnd.trim().slice(0, 10) || undefined,
  };
  return JSON.stringify(meta);
}

export function mergeClubDescriptionForSave(
  existingDescription: string | null | undefined,
  payload: ClubProfileFormPayload,
  options?: { clubPasswordHash?: string; isCreate?: boolean },
): string {
  const prev = parseClubDescriptionMeta(existingDescription);
  const meta: ClubDescriptionMeta = {
    createdViaForm: true,
    subscriptionStart: prev.subscriptionStart?.trim() || undefined,
    subscriptionEnd:
      prev.subscriptionEnd?.trim() ||
      (options?.isCreate ? defaultClubSubscriptionEndDate() : undefined),
    username: payload.username.trim() || undefined,
    category: payload.category.trim() || undefined,
    country: payload.country.trim() || undefined,
    region: payload.region.trim() || undefined,
    zipCode: payload.zipCode.trim() || undefined,
    address: payload.address.trim() || undefined,
    geo: payload.geo.trim() || undefined,
    mail: payload.mail.trim() || undefined,
    directAccess: payload.directAccess.trim() || undefined,
    directRegistrationCode: payload.directRegistrationCode.trim() || undefined,
    clubPasswordHash: options?.clubPasswordHash ?? prev.clubPasswordHash,
    referencesHtml: payload.referencesHtml.trim() || undefined,
    referencesLevel: payload.referencesLevel.trim() || undefined,
    logoUrl: prev.logoUrl?.trim() || undefined,
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
