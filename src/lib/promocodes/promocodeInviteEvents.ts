export const PROMOCODE_INVITE_SENT_MESSAGE = 'promocodes-invite-sent';

export type PromocodeInviteSentMessage = {
  type: typeof PROMOCODE_INVITE_SENT_MESSAGE;
};

export function isPromocodeInviteSentMessage(data: unknown): data is PromocodeInviteSentMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as PromocodeInviteSentMessage).type === PROMOCODE_INVITE_SENT_MESSAGE
  );
}

/** Tell the promoList opener window to reload promocode rows (Users count, etc.). */
export function notifyPromocodeInviteSentOpener(): void {
  if (typeof window === 'undefined') return;
  const opener = window.opener;
  if (!opener || opener.closed) return;

  try {
    opener.postMessage(
      { type: PROMOCODE_INVITE_SENT_MESSAGE } satisfies PromocodeInviteSentMessage,
      window.location.origin
    );
  } catch {
    /* cross-origin or detached opener */
  }
}
