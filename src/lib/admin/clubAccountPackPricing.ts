import type { ClubPurchaseAccountPack } from '@/types/clubPurchaseAccounts';
import { getClubPurchaseAccountsSettings } from '@/lib/admin/clubPurchaseAccountsMock';

/** Display row for club account pack pricing (registration + super-admin UI). */
export type ClubAccountPackDisplayRow = {
  versionKey: 'base' | 'premium' | 'pro';
  versionLabel: string;
  headerColor: string;
  packSizes: number[];
  packEnabled: boolean[];
  unitPrices: number[];
  totalPrices: number[];
  standardPrice: number;
  resellingSuggestion: number;
  durationDays: number;
};

export function packToDisplayRow(pack: ClubPurchaseAccountPack): ClubAccountPackDisplayRow {
  return {
    versionKey: pack.versionKey,
    versionLabel: pack.versionLabel,
    headerColor: pack.headerColor,
    packSizes: pack.packSizes,
    packEnabled: pack.packEnabled,
    unitPrices: pack.unitPrices,
    totalPrices: pack.totalPrices,
    standardPrice: pack.standardPrice,
    resellingSuggestion: pack.resellingSuggestion,
    durationDays: pack.durationDays,
  };
}

/** List prices configured in Super Admin → Purchase new accounts (version settings). */
export function getClubAccountPackDisplayRows(): ClubAccountPackDisplayRow[] {
  return getClubPurchaseAccountsSettings().accountPacks.map(packToDisplayRow);
}

/** Account purchase is allowed only while registering / creating the club profile. */
export const CLUB_ACCOUNT_PURCHASE_REGISTRATION_ONLY = true;

export type ClubAccountPurchaseSelection = {
  versionKey: 'base' | 'premium' | 'pro';
  packSizeIndex: number;
  packSize: number;
  totalPrice: number;
};
