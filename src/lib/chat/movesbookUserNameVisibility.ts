/**
 * Movesbook-user chat: whether a viewer may see a target user's whole display name.
 * Search by username / Telegram ID still works regardless of this setting.
 */

export const MOVESBOOK_USER_NAME_VISIBILITY_VALUES = ['hidden', 'visible'] as const;

export type MovesbookUserNameVisibility = (typeof MOVESBOOK_USER_NAME_VISIBILITY_VALUES)[number];

export const DEFAULT_MOVESBOOK_USER_NAME_VISIBILITY: MovesbookUserNameVisibility = 'hidden';

export const MOVESBOOK_USER_NAME_VISIBILITY_KEY = 'movesbookUserNameVisibility';

export const MOVESBOOK_USER_NAME_VISIBILITY_OPTIONS: {
  value: MovesbookUserNameVisibility;
  label: string;
}[] = [
  {
    value: 'hidden',
    label: 'Hide my whole name to all',
  },
  {
    value: 'visible',
    label: 'Put my whole name visible to all',
  },
];

export function isMovesbookUserNameVisibility(
  value: unknown
): value is MovesbookUserNameVisibility {
  return value === 'hidden' || value === 'visible';
}

export function parseMovesbookUserNameVisibility(
  value: unknown
): MovesbookUserNameVisibility {
  return isMovesbookUserNameVisibility(value)
    ? value
    : DEFAULT_MOVESBOOK_USER_NAME_VISIBILITY;
}

/** Parse from UserSettings.socialSettings JSON string or object. */
export function movesbookUserNameVisibilityFromSocialSettings(
  socialSettings: string | Record<string, unknown> | null | undefined
): MovesbookUserNameVisibility {
  if (!socialSettings) return DEFAULT_MOVESBOOK_USER_NAME_VISIBILITY;
  try {
    const obj =
      typeof socialSettings === 'string'
        ? (JSON.parse(socialSettings) as Record<string, unknown>)
        : socialSettings;
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      return DEFAULT_MOVESBOOK_USER_NAME_VISIBILITY;
    }
    return parseMovesbookUserNameVisibility(
      obj[MOVESBOOK_USER_NAME_VISIBILITY_KEY]
    );
  } catch {
    return DEFAULT_MOVESBOOK_USER_NAME_VISIBILITY;
  }
}

export function canViewerSeeMovesbookUserName(
  visibility: MovesbookUserNameVisibility,
  viewerId: string,
  targetId: string
): boolean {
  if (viewerId === targetId) return true;
  return visibility === 'visible';
}

/** Public display name when the whole name is hidden. */
export function maskedMovesbookUserDisplayName(user: {
  username?: string | null;
  telegramAccount?: string | null;
}): string {
  const tg = (user.telegramAccount || '').trim();
  if (tg) return tg.startsWith('@') ? tg : `@${tg}`;
  const username = (user.username || '').trim();
  return username || 'User';
}

export function resolveMovesbookUserPublicName(args: {
  viewerId: string;
  target: {
    id: string;
    name: string;
    username?: string | null;
    telegramAccount?: string | null;
  };
  visibility: MovesbookUserNameVisibility;
}): { name: string; nameHidden: boolean } {
  const canSee = canViewerSeeMovesbookUserName(
    args.visibility,
    args.viewerId,
    args.target.id
  );
  if (canSee) {
    return { name: args.target.name, nameHidden: false };
  }
  return {
    name: maskedMovesbookUserDisplayName(args.target),
    nameHidden: true,
  };
}

