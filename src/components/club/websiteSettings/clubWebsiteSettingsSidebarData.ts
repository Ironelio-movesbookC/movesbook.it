export type SidebarTopicStatus = 'on' | 'off';

export type FriendListRow = {
  id: string;
  label: string;
  indent: boolean;
  status: SidebarTopicStatus;
};

/** Legacy layout: nested block under root, then peer rows each with optional nested children. */
export type FriendListLayout = {
  root: FriendListRow;
  rootNested: FriendListRow[];
  segments: { peer: FriendListRow; nested: FriendListRow[] }[];
};

export function buildFriendListLayout(rows: FriendListRow[]): FriendListLayout {
  const root = rows.find((r) => r.id === 'friends-root') ?? FRIEND_LIST_ROWS[0];
  const rest = rows.filter((r) => r.id !== 'friends-root');
  const rootNested: FriendListRow[] = [];
  const segments: FriendListLayout['segments'] = [];

  let i = 0;
  while (i < rest.length && rest[i].indent) {
    rootNested.push(rest[i]);
    i += 1;
  }
  while (i < rest.length) {
    const peer = rest[i];
    i += 1;
    const nested: FriendListRow[] = [];
    while (i < rest.length && rest[i].indent) {
      nested.push(rest[i]);
      i += 1;
    }
    segments.push({ peer, nested });
  }

  return { root, rootNested, segments };
}

/** Legacy “List of friends” tree (reference UI). */
export const FRIEND_LIST_ROWS: FriendListRow[] = [
  { id: 'friends-root', label: 'List of friends', indent: false, status: 'on' },
  { id: 'no-my-club-1', label: 'No in My Club', indent: true, status: 'off' },
  { id: 'elio', label: 'Elio Buonocore', indent: true, status: 'off' },
  { id: 'no-eng-ita', label: 'No in My Club ENG ITA', indent: false, status: 'on' },
  { id: 'yes-url-no-ita', label: 'YES in My Club URL NO ITA', indent: false, status: 'on' },
  { id: 'yes-no-ita', label: 'YES in My Club NO ITA', indent: false, status: 'on' },
  { id: 'yes-my-club', label: 'YES in My Club', indent: true, status: 'off' },
];

export type MovebookTopicRow = {
  id: string;
  label: string;
  showStatus: boolean;
  defaultStatus?: SidebarTopicStatus;
};

/** Legacy “Social sites” submenu when expanded. */
export const SOCIAL_SITE_ROWS = [
  { id: 'social-twitter', label: 'Twitter', defaultStatus: 'on' as SidebarTopicStatus },
  { id: 'social-instagram', label: 'Instagram', defaultStatus: 'on' as SidebarTopicStatus },
  { id: 'social-youtube', label: 'YouTube', defaultStatus: 'on' as SidebarTopicStatus },
  { id: 'social-linkedin', label: 'LinkedIn', defaultStatus: 'on' as SidebarTopicStatus },
  { id: 'social-telegram', label: 'Telegram', defaultStatus: 'on' as SidebarTopicStatus },
  { id: 'social-whatsapp', label: 'Whatsapp channel', defaultStatus: 'on' as SidebarTopicStatus },
  { id: 'social-blog', label: 'Blog site', defaultStatus: 'on' as SidebarTopicStatus },
] as const;

export const MOVEBOOK_TOPIC_ROWS: MovebookTopicRow[] = [
  { id: 'member-list', label: 'Member list', showStatus: true, defaultStatus: 'on' },
  { id: 'member-posts', label: "Member's posts", showStatus: true, defaultStatus: 'on' },
  { id: 'blog', label: 'Blog', showStatus: true, defaultStatus: 'on' },
  { id: 'news', label: 'News', showStatus: true, defaultStatus: 'on' },
  { id: 'gallery', label: 'Image gallery', showStatus: true, defaultStatus: 'on' },
  { id: 'videos', label: 'Videos', showStatus: true, defaultStatus: 'on' },
  { id: 'stores', label: 'Stores', showStatus: true, defaultStatus: 'on' },
  { id: 'workouts', label: 'Workouts', showStatus: true, defaultStatus: 'on' },
  { id: 'notebook', label: 'Note book for members', showStatus: true, defaultStatus: 'on' },
];

export const LEGACY_SIDEBAR_BLUE = '#6d8cb5';
export const LEGACY_SIDEBAR_ROW = '#444444';
/** Slightly lighter nested sub-rows (narrower block under a parent). */
export const LEGACY_SIDEBAR_ROW_NESTED = '#4d4d4d';
export const LEGACY_SIDEBAR_PANEL = '#2b2b2b';
export const LEGACY_STATUS_ON = '#88bb55';
export const LEGACY_STATUS_OFF = '#cc4444';
