export const PROMOCODE_INVITE_SENT_MESSAGE = 'promocodes-invite-sent';
export const PROMOCODE_SAVED_MESSAGE = 'promocodes-saved';
export const PROMOCODE_LIST_REFRESH_STORAGE_KEY = 'promocodes:list:refresh';

export type PromocodeInviteSentMessage = {
  type: typeof PROMOCODE_INVITE_SENT_MESSAGE;
};

export type PromocodeSavedMessage = {
  type: typeof PROMOCODE_SAVED_MESSAGE;
  createdId?: number;
};

export type PromocodeListRefreshSignal = {
  at: number;
  createdId?: number;
};

export function isPromocodeInviteSentMessage(data: unknown): data is PromocodeInviteSentMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as PromocodeInviteSentMessage).type === PROMOCODE_INVITE_SENT_MESSAGE
  );
}

export function isPromocodeSavedMessage(data: unknown): data is PromocodeSavedMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as PromocodeSavedMessage).type === PROMOCODE_SAVED_MESSAGE
  );
}

function postMessageToOpener(message: PromocodeInviteSentMessage | PromocodeSavedMessage): void {
  if (typeof window === 'undefined') return;
  const opener = window.opener;
  if (!opener || opener.closed) return;

  try {
    opener.postMessage(message, window.location.origin);
  } catch {
    /* cross-origin or detached opener */
  }
}

/** Persist a refresh signal for promoList (survives popup close before postMessage is handled). */
export function markPromocodeListForRefresh(createdId?: number): void {
  if (typeof window === 'undefined') return;

  const signal: PromocodeListRefreshSignal = {
    at: Date.now(),
    ...(createdId != null && Number.isFinite(createdId) ? { createdId } : {}),
  };

  try {
    localStorage.setItem(PROMOCODE_LIST_REFRESH_STORAGE_KEY, JSON.stringify(signal));
  } catch {
    /* private mode / quota */
  }

  postMessageToOpener({ type: PROMOCODE_SAVED_MESSAGE, createdId });
}

/** Read and clear a pending promoList refresh signal (same tab or after popup close). */
export function consumePromocodeListRefreshSignal(): PromocodeListRefreshSignal | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(PROMOCODE_LIST_REFRESH_STORAGE_KEY);
    if (!raw) return null;
    localStorage.removeItem(PROMOCODE_LIST_REFRESH_STORAGE_KEY);
    const parsed = JSON.parse(raw) as PromocodeListRefreshSignal;
    if (typeof parsed?.at !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Tell the promoList opener window to reload promocode rows (Users count, etc.). */
export function notifyPromocodeInviteSentOpener(): void {
  postMessageToOpener({ type: PROMOCODE_INVITE_SENT_MESSAGE });
}

/** @deprecated Use markPromocodeListForRefresh */
export function notifyPromocodeSavedOpener(): void {
  markPromocodeListForRefresh();
}
