export type ClubPurchaseAccountPack = {
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

export type ClubPurchaseAccountsSettings = {
  paymentWithoutCreditCard: boolean;
  sendMoneyLaterDays: number;
  activationMessageEnabled: boolean;
  activationDaysAfterAssignment: number;
  activationMessageByLang: Record<string, string>;
  accountPacks: ClubPurchaseAccountPack[];
};
