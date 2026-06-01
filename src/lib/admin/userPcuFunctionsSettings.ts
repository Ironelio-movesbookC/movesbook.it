import { mergeProcedureSaved } from '@/lib/admin/userPcuProcedureDefaults';

export type HtmlByLang = Record<string, string>;

export type VersionColumn4 = 'trial' | 'base' | 'premium' | 'pro';
export type VersionColumn3 = 'base' | 'premium' | 'pro';

export type FreeAccountsVersionMatrix = {
  athletesLoaded: Record<VersionColumn4, string>;
  assigned: Record<VersionColumn4, string>;
  remaining: Record<VersionColumn4, string>;
  daysDuration: Record<VersionColumn4, string>;
};

export type BuyedAccountsVersionMatrix = {
  assigned: Record<VersionColumn3, string>;
  remaining: Record<VersionColumn3, string>;
  daysDuration: Record<VersionColumn3, string>;
};

export type ProcedureRowSettings = {
  id: string;
  label: string;
  status: 'enabled' | 'disabled' | 'optional_off' | 'optional_on';
  on: boolean;
};

export type PcuFunctionsSettings = {
  members?: { maxMembers?: string; currentMembers?: string };
  licenses?: {
    newLicenseRequests?: string;
    authorizationNo?: string;
    priceEuro?: string;
    costToPay?: string;
    amountPaid?: string;
    maxDevicesCanEnable?: string;
    currentDeviceEnabled?: string;
    requestCodePending?: string;
    deviceDisable?: string;
    availableEnquiries?: string;
    subscriptionExpiration?: string;
    blockCodeGeneration?: boolean;
  };
  messageAfterActivation?: {
    enabled?: boolean;
    daysRange?: string;
    htmlByLang?: Record<string, string>;
  };
  freeAccounts?: {
    durationDays?: string;
    versionMatrix?: FreeAccountsVersionMatrix;
  };
  terms?: {
    creditCard?: boolean;
    sendMoneyLater?: boolean;
    sendMoneyLaterDays?: string;
  };
  sharing?: {
    coaches?: boolean;
    teams?: boolean;
    groups?: boolean;
    otherClubs?: boolean;
  };
  expirationNotify?: {
    enabled?: boolean;
    beforeDays?: string;
    afterDays?: string;
    everyDay?: boolean;
    mail?: boolean;
    networkPage?: boolean;
    cellular?: boolean;
    facebook?: boolean;
  };
  stock?: { accounts?: string; version?: string; price?: string; payment?: string };
  buyedAccountsMatrix?: BuyedAccountsVersionMatrix;
  procedure?: {
    tab?: 'social' | 'training' | 'management';
    rows?: ProcedureRowSettings[];
    rowsByTab?: Partial<
      Record<'social' | 'training' | 'management', ProcedureRowSettings[]>
    >;
  };
  expirationFlow?: {
    extend?: { enabled?: boolean; days?: string; actual?: string; extendedTo?: string };
    modes?: {
      sharingSharedUsersMode?: ExpirationFeatureMode | '';
      socialItemsMode?: ExpirationFeatureMode | '';
      socialClubPages?: boolean;
      socialMemberPages?: boolean;
      trainingItemsMode?: ExpirationFeatureMode | '';
      trainingClubPages?: boolean;
      trainingMemberPages?: boolean;
      endUsersInteractiveMode?: ExpirationEndUserMode | '';
      managementItemsMode?: ExpirationEndUserMode | '';
      insertOptionsManagementMode?: ExpirationEndUserMode | '';
    };
    messageHtmlByLang?: Record<string, string>;
  };
  newMembers?: {
    expiryMode?: NewMembersExpiryMode | '';
    afterDays?: string;
  };
  newVersion?: {
    mode?: NewVersionAssignMode | '';
  };
};

export type ExpirationFeatureMode = 'stop' | 'view' | 'extend';
export type ExpirationEndUserMode = 'stop' | 'extend';
export type NewMembersExpiryMode = 'own' | 'after_end' | 'after_invite';
export type NewVersionAssignMode =
  | 'same'
  | 'trial_to_base'
  | 'stay_current_subscription'
  | 'next_assigned'
  | 'professional';

export const LANG_KEYS = ['en', 'fr', 'de', 'it', 'es', 'por', 'rus', 'ind', 'chin', 'arab'] as const;

export function emptyHtmlByLang(): Record<string, string> {
  return Object.fromEntries(LANG_KEYS.map((k) => [k, '']));
}

/** Merge saved per-language HTML with the full PCU language key set. */
export function mergeHtmlByLang(saved?: HtmlByLang | null): HtmlByLang {
  return { ...emptyHtmlByLang(), ...(saved ?? {}) };
}

export function mergeHtmlByLangKeys<T extends string>(
  keys: readonly T[],
  saved?: Partial<Record<T, string>> | null,
): Record<T, string> {
  const base = Object.fromEntries(keys.map((k) => [k, ''])) as Record<T, string>;
  if (!saved) return base;
  return { ...base, ...saved };
}

function strOrEmpty(v: unknown): string {
  return v != null ? String(v) : '';
}

function modeOrEmpty<T extends string>(v: unknown, allowed: readonly T[]): T | '' {
  const s = String(v ?? '').trim() as T;
  return allowed.includes(s) ? s : '';
}

/** Apply saved expiration slice onto React setters (only non-empty saved fields). */
export type ExpirationFormApplyHandlers = {
  setNotifyAtExpiration: (v: boolean) => void;
  setNotifyBeforeDays: (v: string) => void;
  setNotifyAfterDays: (v: string) => void;
  setNotifyEveryDay: (v: boolean) => void;
  setNotifyByMail: (v: boolean) => void;
  setNotifyOnNetworkPage: (v: boolean) => void;
  setNotifyCellular: (v: boolean) => void;
  setNotifyPostFacebook: (v: boolean) => void;
  setExpireExtendEnabled: (v: boolean) => void;
  setExpireExtendDays: (v: string) => void;
  setExpireExtendedTo: (v: string) => void;
  setSharingSharedUsersMode: (v: ExpirationFeatureMode | '') => void;
  setSocialItemsMode: (v: ExpirationFeatureMode | '') => void;
  setTrainingItemsMode: (v: ExpirationFeatureMode | '') => void;
  setEndUsersInteractiveMode: (v: ExpirationEndUserMode | '') => void;
  setManagementItemsMode: (v: ExpirationEndUserMode | '') => void;
  setInsertOptionsManagementMode: (v: ExpirationEndUserMode | '') => void;
  setSocialClubPages: (v: boolean) => void;
  setSocialMemberPages: (v: boolean) => void;
  setTrainingClubPages: (v: boolean) => void;
  setTrainingMemberPages: (v: boolean) => void;
  setExpirationMsgHtmlByLang: (
    v: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>),
  ) => void;
  setNewMembersExpiryMode: (v: NewMembersExpiryMode | '') => void;
  setNewMembersAfterDays: (v: string) => void;
  setNewVersionMode: (v: NewVersionAssignMode | '') => void;
};

export function buildExpirationFunctionsSlice(state: {
  notifyAtExpiration: boolean;
  notifyBeforeDays: string;
  notifyAfterDays: string;
  notifyEveryDay: boolean;
  notifyByMail: boolean;
  notifyOnNetworkPage: boolean;
  notifyCellular: boolean;
  notifyPostFacebook: boolean;
  expireExtendEnabled: boolean;
  expireExtendDays: string;
  expireActual: string;
  expireExtendedTo: string;
  sharingSharedUsersMode: ExpirationFeatureMode | '';
  socialItemsMode: ExpirationFeatureMode | '';
  trainingItemsMode: ExpirationFeatureMode | '';
  endUsersInteractiveMode: ExpirationEndUserMode | '';
  managementItemsMode: ExpirationEndUserMode | '';
  insertOptionsManagementMode: ExpirationEndUserMode | '';
  socialClubPages: boolean;
  socialMemberPages: boolean;
  trainingClubPages: boolean;
  trainingMemberPages: boolean;
  expirationMsgHtmlByLang: Record<string, string>;
  newMembersExpiryMode: NewMembersExpiryMode | '';
  newMembersAfterDays: string;
  newVersionMode: NewVersionAssignMode | '';
}): Pick<PcuFunctionsSettings, 'expirationNotify' | 'expirationFlow' | 'newMembers' | 'newVersion'> {
  return {
    expirationNotify: {
      enabled: state.notifyAtExpiration,
      beforeDays: state.notifyBeforeDays,
      afterDays: state.notifyAfterDays,
      everyDay: state.notifyEveryDay,
      mail: state.notifyByMail,
      networkPage: state.notifyOnNetworkPage,
      cellular: state.notifyCellular,
      facebook: state.notifyPostFacebook,
    },
    expirationFlow: {
      extend: {
        enabled: state.expireExtendEnabled,
        days: state.expireExtendDays,
        actual: state.expireActual,
        extendedTo: state.expireExtendedTo,
      },
      modes: {
        sharingSharedUsersMode: state.sharingSharedUsersMode,
        socialItemsMode: state.socialItemsMode,
        socialClubPages: state.socialClubPages,
        socialMemberPages: state.socialMemberPages,
        trainingItemsMode: state.trainingItemsMode,
        trainingClubPages: state.trainingClubPages,
        trainingMemberPages: state.trainingMemberPages,
        endUsersInteractiveMode: state.endUsersInteractiveMode,
        managementItemsMode: state.managementItemsMode,
        insertOptionsManagementMode: state.insertOptionsManagementMode,
      },
      messageHtmlByLang: state.expirationMsgHtmlByLang,
    },
    newMembers: {
      expiryMode: state.newMembersExpiryMode,
      afterDays: state.newMembersAfterDays,
    },
    newVersion: { mode: state.newVersionMode },
  };
}

const FEATURE_MODES: ExpirationFeatureMode[] = ['stop', 'view', 'extend'];
const END_USER_MODES: ExpirationEndUserMode[] = ['stop', 'extend'];
const NEW_MEMBER_MODES: NewMembersExpiryMode[] = ['own', 'after_end', 'after_invite'];
const NEW_VERSION_MODES: NewVersionAssignMode[] = [
  'same',
  'trial_to_base',
  'stay_current_subscription',
  'next_assigned',
  'professional',
];

export function applyExpirationFunctionsSlice(
  fn: PcuFunctionsSettings,
  handlers: ExpirationFormApplyHandlers,
): void {
  if (fn.expirationNotify) {
    const n = fn.expirationNotify;
    if (n.enabled != null) handlers.setNotifyAtExpiration(Boolean(n.enabled));
    if (n.beforeDays != null) handlers.setNotifyBeforeDays(strOrEmpty(n.beforeDays));
    if (n.afterDays != null) handlers.setNotifyAfterDays(strOrEmpty(n.afterDays));
    if (n.everyDay != null) handlers.setNotifyEveryDay(Boolean(n.everyDay));
    if (n.mail != null) handlers.setNotifyByMail(Boolean(n.mail));
    if (n.networkPage != null) handlers.setNotifyOnNetworkPage(Boolean(n.networkPage));
    if (n.cellular != null) handlers.setNotifyCellular(Boolean(n.cellular));
    if (n.facebook != null) handlers.setNotifyPostFacebook(Boolean(n.facebook));
  }
  if (fn.expirationFlow) {
    const flow = fn.expirationFlow;
    if (flow.extend) {
      if (flow.extend.enabled != null) handlers.setExpireExtendEnabled(Boolean(flow.extend.enabled));
      if (flow.extend.days != null) handlers.setExpireExtendDays(strOrEmpty(flow.extend.days));
      if (flow.extend.extendedTo != null) handlers.setExpireExtendedTo(strOrEmpty(flow.extend.extendedTo));
    }
    if (flow.modes) {
      const m = flow.modes;
      if (m.sharingSharedUsersMode != null) {
        handlers.setSharingSharedUsersMode(modeOrEmpty(m.sharingSharedUsersMode, FEATURE_MODES));
      }
      if (m.socialItemsMode != null) {
        handlers.setSocialItemsMode(modeOrEmpty(m.socialItemsMode, FEATURE_MODES));
      }
      if (m.trainingItemsMode != null) {
        handlers.setTrainingItemsMode(modeOrEmpty(m.trainingItemsMode, FEATURE_MODES));
      }
      if (m.endUsersInteractiveMode != null) {
        handlers.setEndUsersInteractiveMode(modeOrEmpty(m.endUsersInteractiveMode, END_USER_MODES));
      }
      if (m.managementItemsMode != null) {
        handlers.setManagementItemsMode(modeOrEmpty(m.managementItemsMode, END_USER_MODES));
      }
      if (m.insertOptionsManagementMode != null) {
        handlers.setInsertOptionsManagementMode(
          modeOrEmpty(m.insertOptionsManagementMode, END_USER_MODES),
        );
      }
      if (m.socialClubPages != null) handlers.setSocialClubPages(Boolean(m.socialClubPages));
      if (m.socialMemberPages != null) handlers.setSocialMemberPages(Boolean(m.socialMemberPages));
      if (m.trainingClubPages != null) handlers.setTrainingClubPages(Boolean(m.trainingClubPages));
      if (m.trainingMemberPages != null) handlers.setTrainingMemberPages(Boolean(m.trainingMemberPages));
    }
    if (flow.messageHtmlByLang) {
      handlers.setExpirationMsgHtmlByLang(() => mergeHtmlByLang(flow.messageHtmlByLang));
    }
  }
  if (fn.newMembers) {
    if (fn.newMembers.expiryMode != null) {
      handlers.setNewMembersExpiryMode(modeOrEmpty(fn.newMembers.expiryMode, NEW_MEMBER_MODES));
    }
    if (fn.newMembers.afterDays != null) handlers.setNewMembersAfterDays(strOrEmpty(fn.newMembers.afterDays));
  }
  if (fn.newVersion?.mode != null) {
    handlers.setNewVersionMode(modeOrEmpty(fn.newVersion.mode, NEW_VERSION_MODES));
  }
}

const EMPTY_VERSION4: Record<VersionColumn4, string> = {
  trial: '',
  base: '',
  premium: '',
  pro: '',
};

const EMPTY_VERSION3: Record<VersionColumn3, string> = {
  base: '',
  premium: '',
  pro: '',
};

/** Blank until per-version account settings are implemented. */
export const DEFAULT_FREE_ACCOUNTS_MATRIX: FreeAccountsVersionMatrix = {
  athletesLoaded: { ...EMPTY_VERSION4 },
  assigned: { ...EMPTY_VERSION4 },
  remaining: { ...EMPTY_VERSION4 },
  daysDuration: { ...EMPTY_VERSION4 },
};

/** Blank until per-version account settings are implemented. */
export const DEFAULT_BUYED_ACCOUNTS_MATRIX: BuyedAccountsVersionMatrix = {
  assigned: { ...EMPTY_VERSION3 },
  remaining: { ...EMPTY_VERSION3 },
  daysDuration: { ...EMPTY_VERSION3 },
};

function mergeVersion4(
  defaults: Record<VersionColumn4, string>,
  saved?: Partial<Record<VersionColumn4, string>>,
): Record<VersionColumn4, string> {
  const cols: VersionColumn4[] = ['trial', 'base', 'premium', 'pro'];
  const next = { ...defaults };
  if (!saved) return next;
  for (const col of cols) {
    if (saved[col] != null) next[col] = String(saved[col]);
  }
  return next;
}

function mergeVersion3(
  defaults: Record<VersionColumn3, string>,
  saved?: Partial<Record<VersionColumn3, string>>,
): Record<VersionColumn3, string> {
  const cols: VersionColumn3[] = ['base', 'premium', 'pro'];
  const next = { ...defaults };
  if (!saved) return next;
  for (const col of cols) {
    if (saved[col] != null) next[col] = String(saved[col]);
  }
  return next;
}

export function mergeFreeAccountsMatrix(
  saved?: Partial<FreeAccountsVersionMatrix>,
): FreeAccountsVersionMatrix {
  if (!saved) return { ...DEFAULT_FREE_ACCOUNTS_MATRIX };
  return {
    athletesLoaded: mergeVersion4(DEFAULT_FREE_ACCOUNTS_MATRIX.athletesLoaded, saved.athletesLoaded),
    assigned: mergeVersion4(DEFAULT_FREE_ACCOUNTS_MATRIX.assigned, saved.assigned),
    remaining: mergeVersion4(DEFAULT_FREE_ACCOUNTS_MATRIX.remaining, saved.remaining),
    daysDuration: mergeVersion4(DEFAULT_FREE_ACCOUNTS_MATRIX.daysDuration, saved.daysDuration),
  };
}

export function mergeBuyedAccountsMatrix(
  saved?: Partial<BuyedAccountsVersionMatrix>,
): BuyedAccountsVersionMatrix {
  if (!saved) return { ...DEFAULT_BUYED_ACCOUNTS_MATRIX };
  return {
    assigned: mergeVersion3(DEFAULT_BUYED_ACCOUNTS_MATRIX.assigned, saved.assigned),
    remaining: mergeVersion3(DEFAULT_BUYED_ACCOUNTS_MATRIX.remaining, saved.remaining),
    daysDuration: mergeVersion3(DEFAULT_BUYED_ACCOUNTS_MATRIX.daysDuration, saved.daysDuration),
  };
}

export function readFunctionsFromPcu(pcu: { functions?: unknown } | null | undefined): PcuFunctionsSettings | null {
  if (!pcu?.functions || typeof pcu.functions !== 'object') return null;
  return pcu.functions as PcuFunctionsSettings;
}

/** Deep-merge a PCU PATCH body onto previous `pcu` (preserves functions + procedure per tab). */
export function mergePcuSettingsPatch(
  prevPcu: Record<string, unknown> | null | undefined,
  body: Record<string, unknown>,
): Record<string, unknown> {
  const prev = prevPcu && typeof prevPcu === 'object' ? prevPcu : {};
  const next: Record<string, unknown> = { ...prev, ...body };

  if (body.functions && typeof body.functions === 'object') {
    const prevFn = readFunctionsFromPcu(prev) ?? {};
    const incoming = body.functions as PcuFunctionsSettings;
    const merged: PcuFunctionsSettings = { ...prevFn, ...incoming };
    if (incoming.procedure || prevFn.procedure) {
      merged.procedure = mergeProcedureSaved(prevFn.procedure, incoming.procedure);
    }
    if (incoming.expirationFlow || prevFn.expirationFlow) {
      const prevFlow = prevFn.expirationFlow ?? {};
      const incFlow = incoming.expirationFlow ?? {};
      merged.expirationFlow = {
        ...prevFlow,
        ...incFlow,
        extend: { ...prevFlow.extend, ...incFlow.extend },
        modes: { ...prevFlow.modes, ...incFlow.modes },
        messageHtmlByLang: {
          ...prevFlow.messageHtmlByLang,
          ...incFlow.messageHtmlByLang,
        },
      };
    }
    if (incoming.messageAfterActivation || prevFn.messageAfterActivation) {
      const prevMa = prevFn.messageAfterActivation ?? {};
      const incMa = incoming.messageAfterActivation ?? {};
      merged.messageAfterActivation = {
        ...prevMa,
        ...incMa,
        htmlByLang: { ...prevMa.htmlByLang, ...incMa.htmlByLang },
      };
    }
    next.functions = merged;
  }

  if (body.vip && typeof body.vip === 'object') {
    const prevVip =
      prev.vip && typeof prev.vip === 'object' ? (prev.vip as Record<string, unknown>) : {};
    next.vip = { ...prevVip, ...(body.vip as Record<string, unknown>) };
  }

  if (body.alertMsg && typeof body.alertMsg === 'object') {
    const prevAm =
      prev.alertMsg && typeof prev.alertMsg === 'object' ? (prev.alertMsg as Record<string, unknown>) : {};
    const inc = body.alertMsg as Record<string, unknown>;
    const prevHtml =
      prevAm.htmlByLang && typeof prevAm.htmlByLang === 'object'
        ? (prevAm.htmlByLang as Record<string, string>)
        : {};
    const incHtml =
      inc.htmlByLang && typeof inc.htmlByLang === 'object'
        ? (inc.htmlByLang as Record<string, string>)
        : {};
    next.alertMsg = {
      ...prevAm,
      ...inc,
      showAt: {
        ...((prevAm.showAt as object) ?? {}),
        ...((inc.showAt as object) ?? {}),
      },
      htmlByLang: { ...prevHtml, ...incHtml },
    };
  }

  if (body.idCards && typeof body.idCards === 'object') {
    const prevIc =
      prev.idCards && typeof prev.idCards === 'object' ? (prev.idCards as Record<string, unknown>) : {};
    const inc = body.idCards as Record<string, unknown>;
    const prevMsg =
      prevIc.messages && typeof prevIc.messages === 'object'
        ? (prevIc.messages as Record<string, unknown>)
        : {};
    const incMsg =
      inc.messages && typeof inc.messages === 'object'
        ? (inc.messages as Record<string, unknown>)
        : {};
    const mergeMsgBlock = (key: string) => {
      const p = prevMsg[key] && typeof prevMsg[key] === 'object' ? (prevMsg[key] as Record<string, unknown>) : {};
      const i = incMsg[key] && typeof incMsg[key] === 'object' ? (incMsg[key] as Record<string, unknown>) : {};
      const pHtml =
        p.htmlByLang && typeof p.htmlByLang === 'object' ? (p.htmlByLang as Record<string, string>) : {};
      const iHtml =
        i.htmlByLang && typeof i.htmlByLang === 'object' ? (i.htmlByLang as Record<string, string>) : {};
      return { ...p, ...i, htmlByLang: { ...pHtml, ...iHtml } };
    };
    next.idCards = {
      ...prevIc,
      ...inc,
      terms: { ...((prevIc.terms as object) ?? {}), ...((inc.terms as object) ?? {}) },
      messages: {
        ...prevMsg,
        ...incMsg,
        afterExpeditionNotPaid: mergeMsgBlock('afterExpeditionNotPaid'),
        thirdPartyPricelist: mergeMsgBlock('thirdPartyPricelist'),
      },
    };
  }

  if (body.alert && typeof body.alert === 'object') {
    const prevAl =
      prev.alert && typeof prev.alert === 'object' ? (prev.alert as Record<string, unknown>) : {};
    const inc = body.alert as Record<string, unknown>;
    const prevHtml =
      prevAl.htmlByLang && typeof prevAl.htmlByLang === 'object'
        ? (prevAl.htmlByLang as Record<string, string>)
        : {};
    const incHtml =
      inc.htmlByLang && typeof inc.htmlByLang === 'object'
        ? (inc.htmlByLang as Record<string, string>)
        : {};
    next.alert = { ...prevAl, ...inc, htmlByLang: { ...prevHtml, ...incHtml } };
  }

  return next;
}
