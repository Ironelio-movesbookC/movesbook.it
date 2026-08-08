export type PromocodeApplyRow = {
  id: number;
  promocodeId: number | null;
  created: string | null;
  receiverEmail: string | null;
  receiverId: number | null;
  senderId: number | null;
  senderEmail: string | null;
  registrationDate: string | null;
  isRegistered: string | number | null;
  senderCredit: string | null;
  receiverCredit: string | null;
  receiverVersion: string | null;
  secondarySenderUsername: string | null;
  secondarySenderCredit: string | null;
  newReceiver: string | null;
  sender: LegacyUserSnippet | null;
  receiver: LegacyUserSnippet | null;
  secondarySender: LegacyUserSnippet | null;
  existReceiverMatch: boolean;
  promocodeCode?: string | null;
  promocodeValidTo?: string | null;
  flagImage?: string | null;
  receiverCountryCode?: string | null;
};

export type LegacyUserSnippet = {
  id: number;
  username: string | null;
  email: string | null;
  created: string | null;
  countryId: number | null;
  image: string | null;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  subscriptionSettingId: number | null;
  firstname: string | null;
};

export type PromocodeSettingRow = {
  id: number;
  code: string | null;
  createrId: number | null;
  validFrom: string | null;
  validTo: string | null;
  enable: string | null;
  usableBy: string | null;
  versionId: string | null;
  discount: string | null;
  enableExtension: string | null;
  subscriptionExtends: string | null;
  managementSection: string | null;
  socialOptions: string | null;
  enableFreeAccounts: string | null;
  basicVersion: string | null;
  premiumVersion: string | null;
  professionalVersion: string | null;
  languageId: number | null;
  helpHtmlPagesId: number | null;
  email: string | null;
  recipient: string | null;
  used: number | null;
  created: string | null;
  inviteCount: number;
  inviteEmails: string[];
  inviteEntries: PromocodeInviteEntry[];
  creator: LegacyUserSnippet | null;
  creatorFlagImage: string | null;
  creatorCountryCode: string | null;
  inviteFlagImage?: string | null;
  inviteCountryCode?: string | null;
  versionCount: number;
};

export type PromocodeInviteEntry = {
  email: string;
  registered: boolean;
  registrationDate: string | null;
  subscriptionName: string | null;
};

export type PromocodeSettingFormData = {
  code: string;
  enable: boolean;
  toDay: string;
  toMonth: string;
  toYear: string;
  versionIds: number[];
  discount: string;
  usableBy: string;
  enableExtension: boolean;
  subscriptionExtends: string;
  managementSection: string;
  socialOptions: string[] | Record<string, unknown>;
  enableFreeAccounts: boolean;
  basicVersion: string;
  premiumVersion: string;
  professionalVersion: string;
  helpHtmlPagesId: number | null;
  languageId: number | null;
  email: string;
  recipient: string;
};

export type PromocodeListFilters = {
  search?: string;
  orderBy?: string;
  registeredOnly?: boolean;
  promocodeId?: number;
  usableBy?: string;
  versionId?: number;
  available?: 'current' | 'expired';
  page?: number;
  pageSize?: number;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type PromocodeMeta = {
  subscriptions: { id: number; name: string }[];
  helpHtmlPages: { id: number; title: string }[];
  languages: { id: number; name: string }[];
};
