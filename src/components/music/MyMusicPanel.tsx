'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Headphones,
  Settings,
  Share2,
  Home,
  Clock,
  List,
  Disc3,
  Heart,
  Music2,
  Mic2,
  Rss,
  RotateCcw,
  Users,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  Pencil,
  User,
  Trash2,
  Eye,
  EyeOff,
  Link,
  Link2,
  X,
  type LucideIcon,
} from 'lucide-react';
import MusicOGPPanel from '@/components/music/MusicOGPPanel';
import MusicPlayerWindow from '@/components/music/MusicPlayerWindow';
import OgpShareModal from '@/app/news/components/OgpShareModal';
import NewsSettingModal, {
  type OgpVisibilitySettings,
  defaultSettings,
} from '@/app/news/components/NewsSettingModal';
import { useAuth } from '@/hooks/useAuth';
import { getMyMusicShareUrl } from '@/lib/myMusicShareUrl';
import OgpRichDescription from '@/components/shared/OgpRichDescription';
import RichTextEditor from '@/components/settings/RichTextEditor';

type MusicNavKey =
  | 'home'
  | 'recent'
  | 'songs-loaded'
  | 'albums'
  | 'favourites'
  | 'playlist'
  | 'artists'
  | 'subscriptions';

const NAV_ITEMS: { key: MusicNavKey; label: string; icon: LucideIcon }[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'recent', label: 'Recent', icon: Clock },
  { key: 'songs-loaded', label: 'Songs Loaded', icon: Music2 },
  { key: 'albums', label: 'Albums', icon: Disc3 },
  { key: 'favourites', label: 'Favourites', icon: Heart },
  { key: 'playlist', label: 'Playlist', icon: List },
  { key: 'artists', label: 'Artists', icon: Mic2 },
  { key: 'subscriptions', label: 'Subscriptions', icon: Rss },
];

/** Nav keys that filter music_ogp_articles (same rules as Music OGP library nav). */
type MusicFilterNavKey =
  | 'recent'
  | 'playlist'
  | 'albums'
  | 'songs-loaded'
  | 'favourites'
  | 'artists';

const MUSIC_FILTER_NAV_KEYS: readonly MusicFilterNavKey[] = [
  'recent',
  'playlist',
  'albums',
  'songs-loaded',
  'favourites',
  'artists',
];

const REGISTRATION_TYPE_BY_NAV: Partial<Record<MusicFilterNavKey, string>> = {
  playlist: 'Playlist',
  albums: 'Album',
  'songs-loaded': 'Song',
};

function isMusicFilterNavKey(key: MusicNavKey): key is MusicFilterNavKey {
  return (MUSIC_FILTER_NAV_KEYS as readonly string[]).includes(key);
}

type HomeSectionKey =
  | 'suggested'
  | 'mix-to-listen'
  | 'listen-again'
  | 'last-insertion'
  | 'favourite-playlist'
  | 'my-playlist'
  | 'from-the-community';

const HOME_SECTIONS: {
  key: HomeSectionKey;
  label: string;
  icon: LucideIcon;
  tileCount: number;
  /** Gear icon on each tile (Favorite Playlist / My Playlist) */
  tileGear?: boolean;
}[] = [
  { key: 'suggested', label: 'Suggested', icon: Music2, tileCount: 10 },
  { key: 'mix-to-listen', label: 'Mixed to Listen', icon: Headphones, tileCount: 8 },
  { key: 'listen-again', label: 'Listen Again', icon: RotateCcw, tileCount: 8 },
  { key: 'last-insertion', label: 'Last Insertion', icon: Clock, tileCount: 8 },
  { key: 'favourite-playlist', label: 'Favorite Playlist', icon: Heart, tileCount: 8, tileGear: true },
  { key: 'my-playlist', label: 'My Playlist', icon: List, tileCount: 8, tileGear: true },
  { key: 'from-the-community', label: 'From the Community', icon: Users, tileCount: 8 },
];

const TILE_SIZE = 112;
const SUGGESTED_TILE_WIDTH = 128;
const SCROLL_STEP = TILE_SIZE + 12;
const MUSIC_API_BASE = '/api/music';

type MusicOgpItem = {
  id: string;
  userId?: string;
  title: string | null;
  artist: string | null;
  image: string | null;
  url: string;
  siteName: string | null;
  description: string | null;
  customDescription?: string | null;
  topic?: string | null;
  savedAt: string;
  creatorUsername: string | null;
  deletedAt?: string | null;
  expiresAt?: string | null;
  createdByCurrentUser?: boolean;
  createdBySuperAdmin?: boolean;
  /** Song / Album / Playlist from music_ogp_articles.registrationType */
  registrationType?: string | null;
  /** From music_ogp_articles.isFavourite */
  isFavourite?: boolean;
  /** Global play/open count for Suggested ranking */
  viewCount?: number;
  visibility?: OgpVisibilitySettings;
};

function mapMusicOgpFromApi(a: Record<string, unknown>): MusicOgpItem {
  return {
    id: String(a.id),
    userId: typeof a.userId === 'string' ? a.userId : undefined,
    title: (a.title as string | null) ?? null,
    artist: (a.artist as string | null) ?? null,
    image: (a.image as string | null) ?? null,
    url: String(a.url ?? ''),
    siteName: (a.siteName as string | null) ?? null,
    description: (a.description as string | null) ?? null,
    customDescription: (a.customDescription as string | null) ?? null,
    topic: (a.topic as string | null) ?? null,
    savedAt: String(a.savedAt ?? ''),
    creatorUsername: (a.creatorUsername as string | null) ?? null,
    deletedAt: (a.deletedAt as string | null) ?? null,
    expiresAt: (a.expiresAt as string | null) ?? null,
    createdByCurrentUser: a.createdByCurrentUser === true,
    createdBySuperAdmin: a.createdBySuperAdmin === true,
    registrationType: (a.registrationType as string | null) ?? null,
    isFavourite: a.isFavourite === true || a.isFavourite === 1,
    viewCount: typeof a.viewCount === 'number' ? a.viewCount : Number(a.viewCount) || 0,
    visibility: {
      userTypes: Array.isArray(a.visibilityUserTypes) ? (a.visibilityUserTypes as string[]) : [],
      countries: Array.isArray(a.visibilityCountries) ? (a.visibilityCountries as string[]) : [],
      languages: Array.isArray(a.visibilityLanguages) ? (a.visibilityLanguages as string[]) : [],
      sports: Array.isArray(a.visibilitySports) ? (a.visibilitySports as string[]) : [],
      expiresAt: (a.expiresAt as string | null) ?? null,
    },
  };
}

/** Same filter rules as NewsArticlesList Music library nav (Recent = last 30 days). */
function filterMusicByNav(
  articles: MusicOgpItem[],
  filterNav: MusicFilterNavKey,
  currentUserId: string | null,
  opts?: { publicOwnerView?: boolean }
): MusicOgpItem[] {
  if (filterNav === 'artists') {
    // Artists view: only entries with a non-empty artist name.
    return articles.filter((a) => (a.artist ?? '').trim() !== '');
  }
  if (filterNav === 'favourites') {
    // Public shared My Music: all returned rows are the owner's — just isFavourite.
    if (opts?.publicOwnerView) {
      return articles.filter((a) => a.isFavourite === true);
    }
    return articles.filter(
      (a) =>
        a.isFavourite === true &&
        (a.userId === currentUserId || a.createdByCurrentUser === true)
    );
  }
  if (filterNav === 'recent') {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const cutoff = oneMonthAgo.getTime();
    return articles.filter((a) => {
      if (!a.savedAt) return false;
      const t = new Date(a.savedAt).getTime();
      return !Number.isNaN(t) && t >= cutoff;
    });
  }
  const wanted = REGISTRATION_TYPE_BY_NAV[filterNav];
  if (wanted) {
    return articles.filter((a) => (a.registrationType ?? '').trim() === wanted);
  }
  return articles;
}

type LikesMap = Record<string, { count: number; likedByMe: boolean }>;

/** Home carousel sections that are fed from music_ogp_articles (+ likes / listen history). */
type HomeFeedSectionKey =
  | 'suggested'
  | 'mix-to-listen'
  | 'listen-again'
  | 'last-insertion'
  | 'favourite-playlist';

const HOME_FEED_SECTION_KEYS: readonly HomeFeedSectionKey[] = [
  'suggested',
  'mix-to-listen',
  'listen-again',
  'last-insertion',
  'favourite-playlist',
];

function isHomeFeedSectionKey(key: HomeSectionKey): key is HomeFeedSectionKey {
  return (HOME_FEED_SECTION_KEYS as readonly string[]).includes(key);
}

/**
 * Build the ordered list for a Home section.
 * - Suggested: most viewed, then higher "I like"
 * - Mixed to Listen: 1–2 tracks per topic (prefer higher likes)
 * - Listen Again: last listened songs/albums/playlists
 * - Last Insertion: newest savedAt first
 * - Favorite Playlist: registrationType Playlist, higher likes
 */
function buildHomeSectionArticles(
  articles: MusicOgpItem[],
  section: HomeFeedSectionKey,
  likesMap: LikesMap,
  listenOrderIds: string[]
): MusicOgpItem[] {
  switch (section) {
    case 'suggested':
      return [...articles].sort((a, b) => {
        const views = (b.viewCount ?? 0) - (a.viewCount ?? 0);
        if (views !== 0) return views;
        return (likesMap[b.id]?.count ?? 0) - (likesMap[a.id]?.count ?? 0);
      });
    case 'mix-to-listen': {
      const byTopic = new Map<string, MusicOgpItem[]>();
      for (const a of articles) {
        const topic = (a.topic || 'Other').trim() || 'Other';
        const list = byTopic.get(topic);
        if (list) list.push(a);
        else byTopic.set(topic, [a]);
      }
      const picked: MusicOgpItem[] = [];
      for (const list of byTopic.values()) {
        const sorted = [...list].sort(
          (a, b) => (likesMap[b.id]?.count ?? 0) - (likesMap[a.id]?.count ?? 0)
        );
        picked.push(...sorted.slice(0, 2));
      }
      return picked;
    }
    case 'listen-again': {
      if (listenOrderIds.length === 0) return [];
      const byId = new Map(articles.map((a) => [a.id, a]));
      const ordered: MusicOgpItem[] = [];
      for (const id of listenOrderIds) {
        const item = byId.get(id);
        if (item) ordered.push(item);
      }
      return ordered;
    }
    case 'last-insertion':
      return [...articles].sort((a, b) => {
        const ta = a.savedAt ? new Date(a.savedAt).getTime() : 0;
        const tb = b.savedAt ? new Date(b.savedAt).getTime() : 0;
        return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
      });
    case 'favourite-playlist':
      return articles
        .filter((a) => (a.registrationType ?? '').trim() === 'Playlist')
        .sort((a, b) => (likesMap[b.id]?.count ?? 0) - (likesMap[a.id]?.count ?? 0));
    default:
      return articles;
  }
}

/** Tile for Artists nav — picture + artist name only. */
function MusicArtistTile({
  article,
  onOpenPlayer,
}: {
  article: MusicOgpItem;
  onOpenPlayer: (article: MusicOgpItem) => void;
}) {
  const artistName = (article.artist ?? '').trim();
  return (
    <button
      type="button"
      onClick={() => onOpenPlayer(article)}
      className="relative shrink-0 border border-white/20 bg-black text-left focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-inset hover:border-white/40 transition-colors"
      style={{ width: SUGGESTED_TILE_WIDTH }}
      aria-label={`Artist: ${artistName}`}
    >
      <div
        className="relative bg-black overflow-hidden"
        style={{ width: SUGGESTED_TILE_WIDTH, height: SUGGESTED_TILE_WIDTH }}
      >
        {article.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.image}
            alt={artistName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#0d1528]">
            <Mic2 className="w-8 h-8 text-white/30" aria-hidden />
          </div>
        )}
      </div>
      <div className="px-1.5 py-1.5 border-t border-white/10 min-h-[40px] bg-[#152038]">
        <p className="text-[11px] leading-tight text-white line-clamp-2" title={artistName}>
          {artistName}
        </p>
      </div>
    </button>
  );
}

function getAuthToken(adminContext?: boolean): string | null {
  if (typeof window === 'undefined') return null;
  return adminContext ? localStorage.getItem('adminToken') : localStorage.getItem('token');
}

function getAuthHeaders(adminContext?: boolean): HeadersInit {
  const token = getAuthToken(adminContext);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function getAdminUserFromStorage(): { id: string; name?: string; username?: string; userType?: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('adminUser');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string; name?: string; username?: string; userType?: string };
    if (!parsed?.id) return null;
    return { id: parsed.id, name: parsed.name, username: parsed.username, userType: parsed.userType };
  } catch {
    return null;
  }
}

function formatDate(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function isActiveOgp(a: MusicOgpItem): boolean {
  if (a.deletedAt) return false;
  if (a.expiresAt) {
    const exp = new Date(a.expiresAt);
    if (!Number.isNaN(exp.getTime()) && exp < new Date()) return false;
  }
  return true;
}

function MusicOgpSuggestedTile({
  article,
  like,
  onLike,
  onShare,
  onOpenPlayer,
  likeLoading,
  canLike,
  currentUserId,
  canDeleteOgp,
  expanded,
  onToggleExpanded,
  copied,
  onCopyLink,
  onEditTopic,
  onViewCreator,
  onOpenSettings,
  onDelete,
}: {
  article: MusicOgpItem;
  like: { count: number; likedByMe: boolean };
  onLike: (id: string) => void;
  onShare: (article: MusicOgpItem) => void;
  onOpenPlayer: (article: MusicOgpItem) => void;
  likeLoading: boolean;
  canLike: boolean;
  currentUserId: string | null;
  canDeleteOgp: boolean;
  expanded: boolean;
  onToggleExpanded: (id: string) => void;
  copied: boolean;
  onCopyLink: (article: MusicOgpItem) => void;
  onEditTopic: (article: MusicOgpItem) => void;
  onViewCreator: (id: string) => void;
  onOpenSettings: (article: MusicOgpItem) => void;
  onDelete: (article: MusicOgpItem) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const tileRef = useRef<HTMLDivElement>(null);
  const title = article.title || article.url;
  const subtitle = article.artist || article.siteName || article.creatorUsername || '';
  const canEditAsCreator =
    article.userId === currentUserId || article.createdByCurrentUser === true;
  const canManage = canDeleteOgp || canEditAsCreator;
  const description =
    article.customDescription || article.description || article.url || '';

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (tileRef.current && !tileRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <div
      ref={tileRef}
      className="relative shrink-0 border border-white/20 bg-black"
      style={{ width: SUGGESTED_TILE_WIDTH }}
    >
      <button
        type="button"
        onClick={() => onOpenPlayer(article)}
        className="block w-full overflow-hidden text-left focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-inset"
        style={{ width: SUGGESTED_TILE_WIDTH }}
        aria-label={`Open player: ${title}`}
      >
        <div
          className="relative bg-black overflow-hidden"
          style={{ width: SUGGESTED_TILE_WIDTH, height: SUGGESTED_TILE_WIDTH }}
        >
          {article.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.image}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#0d1528]">
              <Music2 className="w-8 h-8 text-white/30" aria-hidden />
            </div>
          )}
        </div>
      </button>
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        className={`block w-full text-left transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-inset ${
          menuOpen ? 'bg-[#1c2d4d]' : 'bg-[#152038] hover:bg-[#1a2844]'
        }`}
        aria-expanded={menuOpen}
        aria-label={`Options for ${title}`}
      >
        <div className="px-1.5 py-1.5 border-t border-white/10 min-h-[44px]">
          <p className="text-[11px] leading-tight text-white line-clamp-2" title={title}>
            {title}
          </p>
          {subtitle ? (
            <p className="text-[10px] text-white/60 truncate mt-0.5" title={subtitle}>
              {subtitle}
            </p>
          ) : null}
        </div>
      </button>

      {menuOpen && (
        <div
          className="absolute left-0 z-30 w-[min(240px,75vw)] rounded-md border border-gray-200 bg-white text-gray-800 shadow-lg p-2.5"
          style={{ top: SUGGESTED_TILE_WIDTH * 0.28, minWidth: SUGGESTED_TILE_WIDTH }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm text-gray-600 mb-2">{formatDate(article.savedAt)}</p>
          {expanded ? (
            <div className="text-xs text-gray-600 mb-2 max-h-28 overflow-y-auto">
              <OgpRichDescription html={description} className="text-xs text-gray-600" />
            </div>
          ) : null}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onLike(article.id);
              }}
              disabled={likeLoading || !canLike}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                like.likedByMe
                  ? 'border-cyan-500 bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-300'
              }`}
              title={like.likedByMe ? 'Unlike' : 'Like'}
              aria-label={like.likedByMe ? 'Unlike' : 'Like'}
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${like.likedByMe ? 'fill-current' : ''}`} />
              <span className="min-w-[1.5rem] text-right tabular-nums">{like.count}</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onShare(article);
              }}
              className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-colors shrink-0"
              title="Share"
              aria-label="Share"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-0.5 min-w-0">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (canEditAsCreator) onEditTopic(article);
              }}
              disabled={!canEditAsCreator}
              className="flex items-center justify-center w-6 h-6 min-w-[24px] rounded border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-50"
              title={
                canEditAsCreator
                  ? 'Change topic (creator only)'
                  : "Only the creator can change this article's topic"
              }
              aria-label="Change topic"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleExpanded(article.id);
              }}
              className="flex items-center justify-center w-6 h-6 min-w-[24px] rounded border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-colors shrink-0"
              title={expanded ? 'Show less (2 rows)' : 'Show full text'}
              aria-label={expanded ? 'Collapse text' : 'Expand to full text'}
            >
              {expanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCopyLink(article);
              }}
              className="flex items-center justify-center w-6 h-6 min-w-[24px] rounded border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-colors shrink-0"
              title={copied ? 'Copied!' : 'Copy OGP URL to clipboard'}
              aria-label={copied ? 'Copied!' : 'Copy link'}
            >
              <Link className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onViewCreator(article.id);
              }}
              className={`flex items-center justify-center w-6 h-6 min-w-[24px] rounded border transition-colors shrink-0 ${
                currentUserId != null && !canEditAsCreator
                  ? 'border-amber-200 bg-amber-200 text-gray-600 hover:bg-amber-400 hover:border-amber-300'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-300'
              }`}
              title="View creator of this article"
              aria-label="View creator"
            >
              <User className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (canManage) onOpenSettings(article);
              }}
              disabled={!canManage}
              className="flex items-center justify-center w-6 h-6 min-w-[24px] rounded border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-50"
              title={
                canManage
                  ? 'Music settings (visibility)'
                  : 'Only creator, admin, or super admin can edit settings'
              }
              aria-label="Music settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            {article.createdBySuperAdmin && !canManage ? (
              <span
                className="flex items-center justify-center w-6 h-6 min-w-[24px] rounded bg-red-600 text-white border border-yellow-300 shrink-0 select-none"
                style={{
                  fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
                  fontSize: 11,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
                title="Posted by Movesbook (Super Admin)"
                aria-label="Posted by Movesbook (Super Admin)"
              >
                MB
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (canManage) onDelete(article);
                }}
                disabled={!canManage}
                className="flex items-center justify-center w-6 h-6 min-w-[24px] rounded border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-300 hover:text-red-600 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-50 disabled:hover:text-gray-600"
                title={
                  canManage
                    ? 'Delete'
                    : 'Only super admin, admin, or creator can delete'
                }
                aria-label="Delete article"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MusicSuggestedSection({
  tileCount,
  adminContext = false,
  filterNav,
  homeSection,
  sectionLabel = 'Suggested',
  sectionIcon: SectionIcon = Music2,
  publicUserKey,
}: {
  tileCount: number;
  adminContext?: boolean;
  /** When set, filter music_ogp_articles instead of showing Suggested (likes sort). */
  filterNav?: MusicFilterNavKey;
  /** Home carousel mode (Suggested / Mixed / Listen Again / …). */
  homeSection?: HomeFeedSectionKey;
  sectionLabel?: string;
  sectionIcon?: LucideIcon;
  /** When set, load that user's music via the public API (no login). */
  publicUserKey?: string;
}) {
  const { user } = useAuth();
  const adminUser = adminContext ? getAdminUserFromStorage() : null;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [articles, setArticles] = useState<MusicOgpItem[]>([]);
  const [likesMap, setLikesMap] = useState<LikesMap>({});
  const [listenOrderIds, setListenOrderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [likesReady, setLikesReady] = useState(false);
  const [listenReady, setListenReady] = useState(homeSection !== 'listen-again');
  const [likeLoadingId, setLikeLoadingId] = useState<string | null>(null);
  const [shareArticle, setShareArticle] = useState<MusicOgpItem | null>(null);
  const [playerTrackId, setPlayerTrackId] = useState<string | null>(null);
  /** Snapshot of the queue when the player opens — must not follow live Suggested re-sorts. */
  const [playerQueue, setPlayerQueue] = useState<MusicOgpItem[] | null>(null);
  const [expandedArticleIds, setExpandedArticleIds] = useState<Set<string>>(new Set());
  const [copiedArticleId, setCopiedArticleId] = useState<string | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [settingsArticleId, setSettingsArticleId] = useState<string | null>(null);
  const [settingsOptions, setSettingsOptions] = useState<{
    userTypes: { value: string; label: string }[];
    countries: string[];
    languages: { value: string; label: string }[];
    sports: { value: string; label: string }[];
  } | null>(null);
  const [creatorModalArticleId, setCreatorModalArticleId] = useState<string | null>(null);
  const [creatorInfo, setCreatorInfo] = useState<{
    name: string | null;
    email: string | null;
    username: string | null;
    gender: string | null;
    country: string | null;
    telegramAccount: string | null;
    image: string | null;
  } | null>(null);
  const [creatorLoading, setCreatorLoading] = useState(false);
  const [creatorError, setCreatorError] = useState<string | null>(null);
  const [removeConfirmArticleId, setRemoveConfirmArticleId] = useState<string | null>(null);
  const [editTopicArticleId, setEditTopicArticleId] = useState<string | null>(null);
  const [editTopicValue, setEditTopicValue] = useState('');
  const [editTopicDescription, setEditTopicDescription] = useState('');

  const isPublicView = Boolean(publicUserKey);
  const currentUserId = adminContext ? (adminUser?.id ?? null) : (user?.id ?? null);
  const canDeleteOgp = !isPublicView && (adminContext || user?.userType === 'ADMIN');
  const canLike = !isPublicView && Boolean(getAuthToken(adminContext));
  const isFilterView = filterNav != null;
  const needsListenHistory = homeSection === 'listen-again' && !isPublicView;

  const load = useCallback(async () => {
    setLoading(true);
    setLikesReady(false);
    try {
      if (publicUserKey) {
        const res = await fetch(`/api/public/music/${encodeURIComponent(publicUserKey)}`);
        if (!res.ok) throw new Error('Failed to load music OGPs');
        const data = await res.json();
        const list: MusicOgpItem[] = (Array.isArray(data.articles) ? data.articles : []).map(
          (a: Record<string, unknown>) => mapMusicOgpFromApi(a)
        );
        setArticles(list.filter(isActiveOgp));
        setLikesReady(true);
      } else {
        const headers = getAuthHeaders(adminContext);
        const res = await fetch(`${MUSIC_API_BASE}/ogp`, { headers });
        if (!res.ok) throw new Error('Failed to load music OGPs');
        const data = await res.json();
        const list: MusicOgpItem[] = (Array.isArray(data) ? data : []).map((a: Record<string, unknown>) =>
          mapMusicOgpFromApi(a)
        );
        setArticles(list.filter(isActiveOgp));
      }
    } catch {
      setArticles([]);
      setLikesReady(true);
    } finally {
      setLoading(false);
    }
  }, [adminContext, publicUserKey]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!needsListenHistory) {
      setListenOrderIds([]);
      setListenReady(true);
      return;
    }
    setListenReady(false);
    const headers = getAuthHeaders(adminContext);
    const controller = new AbortController();
    fetch(`${MUSIC_API_BASE}/ogp/listen-history?limit=24`, {
      headers,
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const items = Array.isArray(data?.items) ? data.items : [];
        setListenOrderIds(
          items
            .map((it: { id?: unknown }) => (typeof it?.id === 'string' ? it.id : null))
            .filter((id: string | null): id is string => !!id)
        );
        setListenReady(true);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setListenOrderIds([]);
        setListenReady(true);
      });
    return () => controller.abort();
  }, [needsListenHistory, adminContext]);

  /** Keep Home carousels in sync when another section records a listen. */
  useEffect(() => {
    if (isPublicView) return;
    const onListen = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string; viewCount?: number }>).detail;
      const id = detail?.id;
      if (typeof id !== 'string' || !id) return;
      if (typeof detail.viewCount === 'number') {
        setArticles((prev) =>
          prev.map((a) => (a.id === id ? { ...a, viewCount: detail.viewCount as number } : a))
        );
      }
      if (homeSection === 'listen-again') {
        setListenOrderIds((prev) => [id, ...prev.filter((x) => x !== id)]);
      }
    };
    window.addEventListener('music-ogp-listen', onListen);
    return () => window.removeEventListener('music-ogp-listen', onListen);
  }, [homeSection, isPublicView]);

  useEffect(() => {
    if (publicUserKey) {
      setTopics([]);
      return;
    }
    const headers = getAuthHeaders(adminContext);
    fetch(`${MUSIC_API_BASE}/topics`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const custom = Array.isArray(data?.customTopics) ? data.customTopics : [];
        const defaults = Array.isArray(data?.defaultTopicNames) ? data.defaultTopicNames : [];
        const names = [
          ...defaults,
          ...custom
            .map((t: unknown) =>
              typeof t === 'string'
                ? t
                : t && typeof t === 'object' && 'name' in t
                  ? String((t as { name: unknown }).name)
                  : null
            )
            .filter((n: string | null): n is string => !!n),
        ];
        setTopics(Array.from(new Set(names)));
      })
      .catch(() => setTopics([]));
  }, [adminContext, publicUserKey]);

  const articleIdsKey = useMemo(() => articles.map((a) => a.id).join(','), [articles]);

  useEffect(() => {
    if (publicUserKey) {
      setLikesMap({});
      if (!loading) setLikesReady(true);
      return;
    }
    if (!articleIdsKey) {
      setLikesMap({});
      if (!loading) setLikesReady(true);
      return;
    }
    setLikesReady(false);
    const headers = getAuthHeaders(adminContext);
    const controller = new AbortController();
    fetch(`${MUSIC_API_BASE}/ogp/likes?ids=${articleIdsKey}`, {
      headers,
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        setLikesMap(data ?? {});
        setLikesReady(true);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setLikesMap({});
        setLikesReady(true);
      });
    return () => controller.abort();
  }, [articleIdsKey, loading, adminContext, publicUserKey]);

  useEffect(() => {
    if (copiedArticleId == null) return;
    const t = setTimeout(() => setCopiedArticleId(null), 1500);
    return () => clearTimeout(t);
  }, [copiedArticleId]);

  useEffect(() => {
    if (
      settingsArticleId != null &&
      (!settingsOptions || !Array.isArray(settingsOptions.sports))
    ) {
      const empty = { userTypes: [], countries: [], languages: [], sports: [] };
      fetch('/api/news/ogp-settings-options', { headers: getAuthHeaders(adminContext) })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) {
            setSettingsOptions(empty);
            return;
          }
          setSettingsOptions({
            userTypes: data.userTypes ?? [],
            countries: data.countries ?? [],
            languages: data.languages ?? [],
            sports: data.sports ?? [],
          });
        })
        .catch(() => setSettingsOptions(empty));
    }
  }, [settingsArticleId, settingsOptions, adminContext]);

  useEffect(() => {
    if (editTopicArticleId != null) {
      const article = articles.find((a) => a.id === editTopicArticleId);
      setEditTopicValue(article?.topic || topics[0] || '');
      setEditTopicDescription(article?.customDescription || '');
    }
  }, [editTopicArticleId, articles, topics]);

  useEffect(() => {
    if (creatorModalArticleId == null) {
      setCreatorInfo(null);
      setCreatorError(null);
      return;
    }
    let cancelled = false;
    setCreatorLoading(true);
    setCreatorError(null);
    setCreatorInfo(null);
    const headers = getAuthHeaders(adminContext);
    fetch(`${MUSIC_API_BASE}/ogp/${creatorModalArticleId}/creator`, { headers })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load creator');
        if (cancelled) return;
        setCreatorInfo({
          name: data.name ?? null,
          email: data.email ?? null,
          username: data.username ?? null,
          gender: data.gender ?? null,
          country: data.country ?? null,
          telegramAccount: data.telegramAccount ?? null,
          image: data.image ?? null,
        });
      })
      .catch((e) => {
        if (!cancelled) setCreatorError(e instanceof Error ? e.message : 'Failed to load creator');
      })
      .finally(() => {
        if (!cancelled) setCreatorLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [creatorModalArticleId, adminContext]);

  /** Suggested / Home sections / filter navs. */
  const displayed = useMemo(() => {
    if (filterNav) {
      return filterMusicByNav(articles, filterNav, currentUserId, {
        publicOwnerView: isPublicView,
      });
    }
    if (homeSection) {
      return buildHomeSectionArticles(articles, homeSection, likesMap, listenOrderIds);
    }
    return buildHomeSectionArticles(articles, 'suggested', likesMap, listenOrderIds);
  }, [articles, likesMap, listenOrderIds, filterNav, homeSection, currentUserId, isPublicView]);

  const recordListen = useCallback(
    async (articleId: string) => {
      if (isPublicView) return;
      const token = getAuthToken(adminContext);
      if (!token) return;
      try {
        const res = await fetch(`${MUSIC_API_BASE}/ogp/${articleId}/listen`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.viewCount === 'number') {
          setArticles((prev) =>
            prev.map((a) => (a.id === articleId ? { ...a, viewCount: data.viewCount } : a))
          );
        }
        setListenOrderIds((prev) => [articleId, ...prev.filter((id) => id !== articleId)]);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('music-ogp-listen', { detail: { id: articleId, viewCount: data.viewCount } })
          );
        }
      } catch {
        // keep previous state
      }
    },
    [adminContext, isPublicView]
  );

  const openPlayer = useCallback(
    (article: MusicOgpItem) => {
      // Freeze the current carousel order. Suggested re-sorts by viewCount after each
      // listen; if the player kept binding to that live list, currentIndex would land
      // on a different track and fire listen in a loop.
      setPlayerQueue(displayed);
      setPlayerTrackId(article.id);
    },
    [displayed]
  );

  const closePlayer = useCallback(() => {
    setPlayerTrackId(null);
    setPlayerQueue(null);
  }, []);

  const handleLike = useCallback(async (articleId: string) => {
    const token = getAuthToken(adminContext);
    if (!token) return;
    setLikeLoadingId(articleId);
    try {
      const res = await fetch(`${MUSIC_API_BASE}/ogp/${articleId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update like');
      setLikesMap((prev) => ({
        ...prev,
        [articleId]: { count: data.count ?? 0, likedByMe: data.liked ?? false },
      }));
    } catch {
      // keep previous state
    } finally {
      setLikeLoadingId(null);
    }
  }, [adminContext]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedArticleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCopyLink = useCallback((article: MusicOgpItem) => {
    if (!article.url) return;
    navigator.clipboard?.writeText(article.url).then(() => setCopiedArticleId(article.id));
  }, []);

  const handleUpdateSettings = useCallback(
    async (id: string, settings: OgpVisibilitySettings) => {
      const headers = { ...getAuthHeaders(adminContext), 'Content-Type': 'application/json' };
      const res = await fetch(`${MUSIC_API_BASE}/ogp/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          visibilityUserTypes: settings.userTypes ?? [],
          visibilityCountries: settings.countries ?? [],
          visibilityLanguages: settings.languages ?? [],
          visibilitySports: settings.sports ?? [],
          expiresAt: settings.expiresAt ?? null,
        }),
      });
      if (!res.ok) throw new Error('Failed to update article settings');
      setArticles((prev) =>
        prev.map((a) => (a.id === id ? { ...a, visibility: settings, expiresAt: settings.expiresAt } : a))
      );
    },
    [adminContext]
  );

  const handleUpdateTopic = useCallback(async (id: string, topic: string, customDescription?: string) => {
    const trimmed = topic.trim();
    if (!trimmed) return;
    const headers = { ...getAuthHeaders(adminContext), 'Content-Type': 'application/json' };
    const payload: { topic: string; customDescription?: string | null } = { topic: trimmed };
    if (customDescription !== undefined) {
      payload.customDescription = customDescription.trim() || null;
    }
    const res = await fetch(`${MUSIC_API_BASE}/ogp/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update article topic');
    setArticles((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              topic: trimmed,
              ...(customDescription !== undefined && {
                customDescription: customDescription.trim() || null,
              }),
            }
          : a
      )
    );
  }, [adminContext]);

  const handleRemove = useCallback(async (id: string) => {
    const headers = getAuthHeaders(adminContext);
    const res = await fetch(`${MUSIC_API_BASE}/ogp/${id}`, { method: 'DELETE', headers });
    if (!res.ok) throw new Error('Failed to remove article');
    setArticles((prev) => prev.filter((a) => a.id !== id));
  }, [adminContext]);

  const scrollBy = (dir: -1 | 1) => {
    scrollerRef.current?.scrollBy({ left: dir * (SUGGESTED_TILE_WIDTH + 12) * 2, behavior: 'smooth' });
  };

  const showLoading =
    loading ||
    (!likesReady && articles.length > 0) ||
    (needsListenHistory && !listenReady);
  const placeholderCount = isFilterView ? 0 : Math.max(0, tileCount - displayed.length);
  const settingsArticle = articles.find((a) => a.id === settingsArticleId);

  const renderTile = (article: MusicOgpItem) =>
    filterNav === 'artists' ? (
      <MusicArtistTile
        key={article.id}
        article={article}
        onOpenPlayer={openPlayer}
      />
    ) : (
      <MusicOgpSuggestedTile
        key={article.id}
        article={article}
        like={likesMap[article.id] ?? { count: 0, likedByMe: false }}
        onLike={handleLike}
        onShare={setShareArticle}
        onOpenPlayer={openPlayer}
        likeLoading={likeLoadingId === article.id}
        canLike={canLike}
        currentUserId={currentUserId}
        canDeleteOgp={canDeleteOgp}
        expanded={expandedArticleIds.has(article.id)}
        onToggleExpanded={toggleExpanded}
        copied={copiedArticleId === article.id}
        onCopyLink={handleCopyLink}
        onEditTopic={(a) => setEditTopicArticleId(a.id)}
        onViewCreator={setCreatorModalArticleId}
        onOpenSettings={(a) => setSettingsArticleId(a.id)}
        onDelete={(a) => setRemoveConfirmArticleId(a.id)}
      />
    );

  return (
    <section className={`border border-white/30 bg-[#1a2744] ${isFilterView ? 'm-3' : ''}`}>
      <div className="flex items-center justify-between gap-2 border-b border-white/30 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          {filterNav === 'artists' ? (
            <Mic2 className="w-4 h-4 shrink-0 text-white" strokeWidth={1.75} aria-hidden />
          ) : (
            <SectionIcon className="w-4 h-4 shrink-0 text-white" strokeWidth={1.75} aria-hidden />
          )}
          <h3 className="text-sm font-semibold text-white truncate">{sectionLabel}</h3>
        </div>
        {!isFilterView ? (
          <button
            type="button"
            className="p-1 text-white/90 hover:text-white transition-colors shrink-0"
            aria-label={`${sectionLabel} settings`}
          >
            <Settings className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden />
          </button>
        ) : (
          <span className="text-xs text-white/50 tabular-nums shrink-0">
            {showLoading ? '…' : `${displayed.length}`}
          </span>
        )}
      </div>

      {isFilterView ? (
        <div className="relative px-3 py-3">
          {showLoading ? (
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={`loading-${i}`}
                  className="shrink-0 bg-black/60 border border-white/10 animate-pulse"
                  style={{ width: SUGGESTED_TILE_WIDTH, height: SUGGESTED_TILE_WIDTH }}
                />
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <p className="text-sm text-white/50 text-center py-12">
              {filterNav === 'artists'
                ? 'No artists found.'
                : 'No music found for this view.'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-3 items-start">{displayed.map(renderTile)}</div>
          )}
        </div>
      ) : (
      <div className="relative px-1 py-3">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          className="absolute left-0 top-1/2 z-10 -translate-y-1/2 p-1 text-amber-400 hover:text-amber-300 transition-colors"
          aria-label={`Scroll ${sectionLabel} left`}
        >
          <ChevronLeft className="w-7 h-7" strokeWidth={2.5} aria-hidden />
        </button>

        <div
          ref={scrollerRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-8 scroll-smooth items-start"
        >
          {showLoading
            ? Array.from({ length: tileCount }).map((_, i) => (
                <div
                  key={`loading-${i}`}
                  className="shrink-0 bg-black/60 border border-white/10 animate-pulse"
                  style={{ width: SUGGESTED_TILE_WIDTH, height: SUGGESTED_TILE_WIDTH }}
                />
              ))
            : null}

          {!showLoading && displayed.map(renderTile)}

          {!showLoading &&
            Array.from({ length: placeholderCount }).map((_, i) => (
              <div
                key={`ph-${i}`}
                className="relative shrink-0 bg-black border border-white/20"
                style={{ width: TILE_SIZE, height: TILE_SIZE }}
              />
            ))}
        </div>

        <button
          type="button"
          onClick={() => scrollBy(1)}
          className="absolute right-0 top-1/2 z-10 -translate-y-1/2 p-1 text-amber-400 hover:text-amber-300 transition-colors"
          aria-label={`Scroll ${sectionLabel} right`}
        >
          <ChevronRight className="w-7 h-7" strokeWidth={2.5} aria-hidden />
        </button>
      </div>
      )}

      <OgpShareModal
        isOpen={shareArticle != null}
        onClose={() => setShareArticle(null)}
        article={shareArticle}
        onCopyLink={() => shareArticle && setCopiedArticleId(shareArticle.id)}
      />

      {settingsArticleId != null && (
        <NewsSettingModal
          isOpen={true}
          onClose={() => setSettingsArticleId(null)}
          initialSettings={settingsArticle?.visibility ?? defaultSettings}
          onSave={(settings) => {
            void handleUpdateSettings(settingsArticleId, settings);
            setSettingsArticleId(null);
          }}
          onDeleteSettings={() => {
            void handleUpdateSettings(settingsArticleId, defaultSettings);
          }}
          options={settingsOptions}
          title="Music Setting"
        />
      )}

      {creatorModalArticleId != null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
          onClick={() => setCreatorModalArticleId(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="suggested-creator-modal-title"
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 id="suggested-creator-modal-title" className="text-lg font-semibold text-gray-900">
                Music creator
              </h2>
              <button
                type="button"
                onClick={() => setCreatorModalArticleId(null)}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              {creatorLoading && <p className="text-sm text-gray-500">Loading creator info…</p>}
              {creatorError && <p className="text-sm text-red-600">{creatorError}</p>}
              {!creatorLoading && !creatorError && creatorInfo && (
                <div className="flex gap-4 items-start">
                  <dl className="space-y-3 text-sm flex-1 min-w-0">
                    {creatorInfo.name ? (
                      <div>
                        <dt className="text-gray-500 font-medium">Name</dt>
                        <dd className="text-gray-900 mt-0.5">{creatorInfo.name}</dd>
                      </div>
                    ) : null}
                    {creatorInfo.username ? (
                      <div>
                        <dt className="text-gray-500 font-medium">Username</dt>
                        <dd className="text-gray-900 mt-0.5">{creatorInfo.username}</dd>
                      </div>
                    ) : null}
                    {creatorInfo.email ? (
                      <div>
                        <dt className="text-gray-500 font-medium">Email</dt>
                        <dd className="text-gray-900 mt-0.5">{creatorInfo.email}</dd>
                      </div>
                    ) : null}
                    {creatorInfo.gender ? (
                      <div>
                        <dt className="text-gray-500 font-medium">Gender</dt>
                        <dd className="text-gray-900 mt-0.5">{creatorInfo.gender}</dd>
                      </div>
                    ) : null}
                    {creatorInfo.country ? (
                      <div>
                        <dt className="text-gray-500 font-medium">Country</dt>
                        <dd className="text-gray-900 mt-0.5">{creatorInfo.country}</dd>
                      </div>
                    ) : null}
                    {creatorInfo.telegramAccount ? (
                      <div>
                        <dt className="text-gray-500 font-medium">Telegram</dt>
                        <dd className="text-gray-900 mt-0.5">{creatorInfo.telegramAccount}</dd>
                      </div>
                    ) : null}
                    {[
                      creatorInfo.name,
                      creatorInfo.username,
                      creatorInfo.email,
                      creatorInfo.gender,
                      creatorInfo.country,
                      creatorInfo.telegramAccount,
                    ].every((v) => v == null || v === '') && (
                      <p className="text-gray-500">No creator details available.</p>
                    )}
                  </dl>
                  <div className="flex-shrink-0 relative w-24 h-24 bg-gray-200 border border-gray-300 overflow-hidden">
                    <Image
                      src={
                        creatorInfo.image && creatorInfo.image.trim() !== ''
                          ? creatorInfo.image
                          : creatorInfo.gender?.toLowerCase() === 'female'
                            ? '/female_default.jpg'
                            : '/male_default.jpg'
                      }
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {removeConfirmArticleId != null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
          onClick={() => setRemoveConfirmArticleId(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="suggested-remove-confirm-modal-title"
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-sm w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="suggested-remove-confirm-modal-title" className="text-lg font-semibold text-gray-900 mb-3">
              Remove OGP
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to remove this article? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setRemoveConfirmArticleId(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleRemove(removeConfirmArticleId);
                  setRemoveConfirmArticleId(null);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {editTopicArticleId != null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
          onClick={() => setEditTopicArticleId(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="suggested-edit-topic-modal-title"
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-sm w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="suggested-edit-topic-modal-title" className="text-lg font-semibold text-gray-900 mb-3">
              Change Music topic
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              Move this article to another topic.
            </p>
            <label htmlFor="suggested-edit-topic-select" className="block text-sm font-medium text-gray-700 mb-1">
              Topic
            </label>
            <select
              id="suggested-edit-topic-select"
              value={editTopicValue}
              onChange={(e) => setEditTopicValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 mb-4"
            >
              {(topics.length > 0 ? topics : editTopicValue ? [editTopicValue] : []).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <label htmlFor="suggested-edit-topic-description" className="block text-sm font-medium text-gray-700 mb-1">
              Type here a brief description...
            </label>
            <div className="mb-4">
              <RichTextEditor
                value={editTopicDescription}
                onChange={setEditTopicDescription}
                placeholder="Brief description..."
                minHeight="80px"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEditTopicArticleId(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleUpdateTopic(editTopicArticleId, editTopicValue, editTopicDescription);
                  setEditTopicArticleId(null);
                }}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {playerTrackId != null && playerQueue != null && playerQueue.length > 0 ? (
        <MusicPlayerWindow
          tracks={playerQueue}
          initialTrackId={playerTrackId}
          onClose={closePlayer}
          onTrackListen={recordListen}
        />
      ) : null}
    </section>
  );
}

function MusicHomeSection({
  label,
  icon: Icon,
  tileCount,
  tileGear = false,
}: {
  label: string;
  icon: LucideIcon;
  tileCount: number;
  tileGear?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: -1 | 1) => {
    scrollerRef.current?.scrollBy({ left: dir * SCROLL_STEP * 2, behavior: 'smooth' });
  };

  return (
    <section className="border border-white/30 bg-[#1a2744]">
      <div className="flex items-center justify-between gap-2 border-b border-white/30 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 shrink-0 text-white" strokeWidth={1.75} aria-hidden />
          <h3 className="text-sm font-semibold text-white truncate">{label}</h3>
        </div>
        <button
          type="button"
          className="p-1 text-white/90 hover:text-white transition-colors shrink-0"
          aria-label={`${label} settings`}
        >
          <Settings className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      <div className="relative px-1 py-3">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          className="absolute left-0 top-1/2 z-10 -translate-y-1/2 p-1 text-amber-400 hover:text-amber-300 transition-colors"
          aria-label={`Scroll ${label} left`}
        >
          <ChevronLeft className="w-7 h-7" strokeWidth={2.5} aria-hidden />
        </button>

        <div
          ref={scrollerRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-8 scroll-smooth"
        >
          {Array.from({ length: tileCount }).map((_, i) => (
            <div
              key={i}
              className="relative shrink-0 bg-black border border-white/20"
              style={{ width: TILE_SIZE, height: TILE_SIZE }}
            >
              {tileGear && (
                <span className="absolute bottom-1.5 left-1.5 text-white" aria-hidden>
                  <Settings className="w-3.5 h-3.5" strokeWidth={1.75} />
                </span>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollBy(1)}
          className="absolute right-0 top-1/2 z-10 -translate-y-1/2 p-1 text-amber-400 hover:text-amber-300 transition-colors"
          aria-label={`Scroll ${label} right`}
        >
          <ChevronRight className="w-7 h-7" strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </section>
  );
}

function MusicHomeContent({
  adminContext = false,
  publicUserKey,
}: {
  adminContext?: boolean;
  publicUserKey?: string;
}) {
  return (
    <div className="flex flex-col gap-3 p-3 bg-[#152038]">
      {HOME_SECTIONS.map((section) =>
        isHomeFeedSectionKey(section.key) ? (
          <MusicSuggestedSection
            key={section.key}
            tileCount={section.tileCount}
            adminContext={adminContext}
            publicUserKey={publicUserKey}
            homeSection={section.key}
            sectionLabel={section.label}
            sectionIcon={section.icon}
          />
        ) : (
          <MusicHomeSection
            key={section.key}
            label={section.label}
            icon={section.icon}
            tileCount={section.tileCount}
            tileGear={section.tileGear}
          />
        )
      )}
    </div>
  );
}

interface MyMusicPanelProps {
  onClose?: () => void;
  embedded?: boolean;
  isExpanded?: boolean;
  onExpandReduce?: () => void;
  /** When true, use adminToken / adminUser (superadmin admin panel). */
  adminContext?: boolean;
  /**
   * Public shared My Music view (no login). Username or user id of the owner.
   * Hides Add/edit; loads music via `/api/public/music/[userKey]`.
   */
  publicUserKey?: string;
}

export default function MyMusicPanel({
  embedded = true,
  isExpanded = false,
  onExpandReduce,
  adminContext = false,
  publicUserKey,
}: MyMusicPanelProps) {
  const { user } = useAuth();
  const adminUser = adminContext ? getAdminUserFromStorage() : null;
  const isPublicView = Boolean(publicUserKey);
  // No tab selected until the user clicks one — Home sections show only after Home is clicked
  const [activeNav, setActiveNav] = useState<MusicNavKey | null>(null);
  const [showMusicEditor, setShowMusicEditor] = useState(false);
  const [sharePanelOpen, setSharePanelOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  /** Public share key (username preferred) — same pattern as OGP News group public links. */
  const shareUserKey = useMemo(() => {
    if (publicUserKey) return publicUserKey.trim();
    if (adminContext) {
      return (adminUser?.username || adminUser?.id || '').trim();
    }
    return (user?.username || user?.id || '').trim();
  }, [publicUserKey, adminContext, adminUser?.username, adminUser?.id, user?.username, user?.id]);

  const publicShareUrl = useMemo(
    () => (shareUserKey ? getMyMusicShareUrl(shareUserKey) : ''),
    [shareUserKey]
  );

  /** Copy the public My Music URL to the clipboard (user pastes it in a new tab). */
  const handleGetLink = useCallback(() => {
    if (!publicShareUrl || typeof navigator?.clipboard?.writeText !== 'function') return;
    void navigator.clipboard.writeText(publicShareUrl).then(() => {
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    });
  }, [publicShareUrl]);

  if (showMusicEditor && !isPublicView) {
    return (
      <MusicOGPPanel
        onClose={() => {
          setShowMusicEditor(false);
          if (isExpanded) onExpandReduce?.();
        }}
        embedded={embedded}
        isExpanded={isExpanded}
        onExpandReduce={onExpandReduce}
        adminContext={adminContext}
      />
    );
  }

  return (
    <div
      className={`flex flex-col overflow-hidden ${
        embedded ? 'flex-1 min-h-0 max-h-[98vh]' : ''
      }`}
    >
      <div className="bg-[#1a2744] text-white flex-shrink-0">
        {/* Header row */}
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Headphones className="w-7 h-7 shrink-0" strokeWidth={1.75} aria-hidden />
            <h2 className="text-xl sm:text-2xl font-bold tracking-wide truncate">My Music</h2>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            {!isPublicView && (
              <button
                type="button"
                onClick={() => setShowMusicEditor(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-white/95 hover:text-white transition-colors"
              >
                <Settings className="w-4 h-4 shrink-0" strokeWidth={1.75} aria-hidden />
                <span className="hidden sm:inline whitespace-nowrap">Add/edit my music</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleGetLink}
              disabled={!publicShareUrl}
              className="flex items-center gap-1.5 text-sm font-medium text-white/95 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={linkCopied ? 'Copied!' : 'Copy My Music URL to clipboard'}
              aria-label={linkCopied ? 'Copied!' : 'Get Link'}
            >
              <Link2 className="w-4 h-4 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="hidden sm:inline whitespace-nowrap">
                {linkCopied ? 'Copied!' : 'Get Link'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSharePanelOpen(true)}
              disabled={!publicShareUrl}
              className="flex items-center gap-1.5 text-sm font-medium text-white/95 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Share"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="hidden sm:inline whitespace-nowrap">Share</span>
            </button>
          </div>
        </div>

        <div className="border-t border-white/25" />

        {/* Sub-navigation row */}
        <nav
          className="flex items-center justify-between gap-1 px-2 sm:px-3 py-2.5 overflow-x-auto scrollbar-hide"
          aria-label="My Music navigation"
        >
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const isActive = activeNav === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveNav(key)}
                className={`flex items-center gap-1.5 px-1.5 sm:px-2 py-1.5 shrink-0 text-[11px] sm:text-xs font-medium whitespace-nowrap transition-colors rounded-sm ${
                  isActive
                    ? 'text-white bg-white/15'
                    : 'text-white/80 hover:text-white hover:bg-white/5'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content — Home sections only when Home is selected */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-[#152038]">
        {activeNav === 'home' ? (
          <MusicHomeContent adminContext={adminContext} publicUserKey={publicUserKey} />
        ) : activeNav && isMusicFilterNavKey(activeNav) ? (
          <MusicSuggestedSection
            tileCount={0}
            adminContext={adminContext}
            filterNav={activeNav}
            sectionLabel={NAV_ITEMS.find((item) => item.key === activeNav)?.label ?? activeNav}
            publicUserKey={publicUserKey}
          />
        ) : activeNav ? (
          <div className="flex items-center justify-center min-h-[280px] px-4">
            <p className="text-sm text-white/50 text-center">
              {NAV_ITEMS.find((item) => item.key === activeNav)?.label ?? activeNav} — coming soon
            </p>
          </div>
        ) : (
          <div className="min-h-[280px]" aria-hidden />
        )}
      </div>

      <OgpShareModal
        isOpen={sharePanelOpen}
        onClose={() => setSharePanelOpen(false)}
        article={{ url: publicShareUrl, title: 'My Music' }}
      />
    </div>
  );
}
