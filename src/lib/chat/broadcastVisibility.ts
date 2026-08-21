const TARGETED_BROADCAST_MODES = new Set(['group', 'subscribers', 'favourites', 'repliers']);

export function parseRecipientUserIds(recipientIds: string | null): string[] | null {
  if (!recipientIds) return null;
  try {
    const parsed = JSON.parse(recipientIds) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.map(String).filter(Boolean);
  } catch {
    return null;
  }
}

export function parseReplyMeta(recipientIds: string | null): {
  parentId: string | null;
  senderUserId: string | null;
} {
  if (!recipientIds) return { parentId: null, senderUserId: null };
  try {
    const meta = JSON.parse(recipientIds) as { parentId?: string; senderUserId?: string };
    return {
      parentId: typeof meta.parentId === 'string' ? meta.parentId : null,
      senderUserId: typeof meta.senderUserId === 'string' ? meta.senderUserId : null,
    };
  } catch {
    return { parentId: null, senderUserId: null };
  }
}

type BroadcastRow = {
  id: string;
  recipientIds: string | null;
  mode: string;
};

/** Whether a non-admin viewer may see this broadcast row. */
export function userCanSeeBroadcastRow(
  row: BroadcastRow,
  myId: string,
  rowById: Map<string, BroadcastRow>
): boolean {
  if (row.mode === 'all') return true;

  if (row.mode === 'reply') {
    const meta = parseReplyMeta(row.recipientIds);
    if (meta.senderUserId === myId) return true;
    if (!meta.parentId) return false;
    const parent = rowById.get(meta.parentId);
    if (!parent) return false;
    return userCanSeeBroadcastRow(parent, myId, rowById);
  }

  if (TARGETED_BROADCAST_MODES.has(row.mode)) {
    const ids = parseRecipientUserIds(row.recipientIds);
    if (!ids || ids.length === 0) return false;
    return ids.includes(myId);
  }

  return true;
}

export function userCanSeeBroadcastParent(
  parent: BroadcastRow,
  myId: string,
  rowById: Map<string, BroadcastRow>
): boolean {
  return userCanSeeBroadcastRow(parent, myId, rowById);
}
