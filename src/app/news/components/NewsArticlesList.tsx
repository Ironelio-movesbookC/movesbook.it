'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, ArrowDownAZ, Clock, Plus, Pencil, Eye, EyeOff, Link, User, Settings, Trash2, X } from 'lucide-react';
import type { OGPData } from './OGPForm';
import type { NewsTopic } from './NewsTopicBar';
import { ALL_TOPICS } from './NewsTopicBar';
import { ALL_LANGUAGES } from '@/constants/language.constants';
import NewsSettingModal, { type OgpVisibilitySettings, defaultSettings } from './NewsSettingModal';

export type ArticlePasted = OGPData & {
  customDescription?: string;
  id: string;
  userId?: string;
  savedAt?: string;
  topic?: NewsTopic;
  languageCode?: string | null;
  /** Set when soft-deleted by creator; admin/super_admin see these. */
  deletedAt?: string;
  deletedByUserId?: string;
  deletedByName?: string;
  /** Visibility settings for News Setting modal (creator / admin / super admin only). */
  visibility?: OgpVisibilitySettings;
};
export type ArticleTyped = { id: string; description: string };

/** Number of OGP cards per row (each row = 6 OGPs). */
const OGPS_PER_ROW = 6;
/** Dropdown options: number of rows to display per page. Items per page = rows × OGPS_PER_ROW. */
const ROWS_PER_PAGE_OPTIONS = [3, 5, 10, 15, 20];
const MAX_PAGE_BUTTONS = 9;

export type SortOrder = 'date-desc' | 'date-asc' | 'alpha-asc' | 'alpha-desc';

function formatDate(iso?: string) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}

/** Wraps case-insensitive matches of `query` in `text` with <mark>. */
function highlightText(text: string, query: string): React.ReactNode {
  if (!text) return '';
  if (!query || !query.trim()) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(re);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="bg-amber-200 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

interface NewsArticlesListProps {
  pasted: ArticlePasted[];
  typed?: ArticleTyped[];
  activeTopic: NewsTopic | null;
  onRemovePasted?: (id: string) => void;
  onRemoveTyped?: (id: string) => void;
  /** When true, current user is admin or super admin (can delete any OGP). Creator can always delete their own. */
  canDeleteOgp?: boolean;
  /** Current user id – used to allow creator to delete their own OGP. */
  currentUserId?: string | null;
  /** Called when the "+" button is clicked to show the OGP input form. Rendered below pagination when provided. */
  onAddClick?: () => void;
  /** When true, the "+" button is disabled (e.g. when "All" is selected) */
  addButtonDisabled?: boolean;
  /** Called when saving visibility settings from the gear modal (creator / admin / super admin only). */
  onUpdatePastedSettings?: (id: string, settings: OgpVisibilitySettings) => void | Promise<void>;
  /** Topic names for the change-topic modal (Events, Nutrition, Sport, etc.). */
  topics?: string[];
  /** Called when creator changes an OGP's topic and/or description (Pencil button). */
  onUpdatePastedTopic?: (id: string, topic: string, customDescription?: string) => void | Promise<void>;
  /** When true, use adminToken for API calls (e.g. creator fetch) so super admin can use User button. */
  adminContext?: boolean;
}

export default function NewsArticlesList({
  pasted,
  activeTopic,
  onRemovePasted,
  canDeleteOgp = false,
  currentUserId = null,
  onAddClick,
  addButtonDisabled = false,
  onUpdatePastedSettings,
  topics: topicsProp = [],
  onUpdatePastedTopic,
  adminContext = false,
}: NewsArticlesListProps) {
  const topicsList = topicsProp.length > 0 ? topicsProp : ['News', 'Sport', 'Events', 'Nutrition', 'Training', 'Medicine', 'Equipments', 'Lounge music'];
  const [search, setSearch] = useState('');
  const [highlightMatches, setHighlightMatches] = useState(false);
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const itemsPerPage = rowsPerPage * OGPS_PER_ROW;
  const [sortOrder, setSortOrder] = useState<SortOrder>('date-desc');
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
  } | null>(null);
  const [creatorLoading, setCreatorLoading] = useState(false);
  const [creatorError, setCreatorError] = useState<string | null>(null);
  const [copiedArticleId, setCopiedArticleId] = useState<string | null>(null);
  const [editTopicArticleId, setEditTopicArticleId] = useState<string | null>(null);
  const [editTopicValue, setEditTopicValue] = useState<string>('News');
  const [editTopicDescription, setEditTopicDescription] = useState<string>('');
  const [expandedArticleIds, setExpandedArticleIds] = useState<Set<string>>(new Set());
  const [removeConfirmArticleId, setRemoveConfirmArticleId] = useState<string | null>(null);

  const toggleArticleExpanded = useCallback((articleId: string) => {
    setExpandedArticleIds((prev) => {
      const next = new Set(prev);
      if (next.has(articleId)) next.delete(articleId);
      else next.add(articleId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (editTopicArticleId != null) {
      const article = pasted.find((a) => a.id === editTopicArticleId);
      setEditTopicValue(article?.topic ?? 'News');
      setEditTopicDescription(article?.customDescription ?? '');
    }
  }, [editTopicArticleId, pasted]);

  useEffect(() => {
    if (copiedArticleId == null) return;
    const t = setTimeout(() => setCopiedArticleId(null), 1500);
    return () => clearTimeout(t);
  }, [copiedArticleId]);

  const fetchCreator = useCallback(async (articleId: string) => {
    setCreatorLoading(true);
    setCreatorError(null);
    setCreatorInfo(null);
    try {
      const token = typeof window !== 'undefined'
        ? (adminContext ? localStorage.getItem('adminToken') : localStorage.getItem('token'))
        : null;
      const headers: HeadersInit = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const res = await fetch(`/api/news/ogp/${articleId}/creator`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load creator');
      setCreatorInfo({
        name: data.name ?? null,
        email: data.email ?? null,
        username: data.username ?? null,
        gender: data.gender ?? null,
        country: data.country ?? null,
        telegramAccount: data.telegramAccount ?? null,
      });
    } catch (e) {
      setCreatorError(e instanceof Error ? e.message : 'Failed to load creator');
    } finally {
      setCreatorLoading(false);
    }
  }, [adminContext]);

  useEffect(() => {
    if (creatorModalArticleId != null) {
      fetchCreator(creatorModalArticleId);
    }
  }, [creatorModalArticleId, fetchCreator]);

  useEffect(() => {
    if (settingsArticleId != null && !settingsOptions) {
      fetch('/api/news/ogp-settings-options')
        .then((r) => r.json())
        .then((data) => setSettingsOptions(data))
        .catch(() => setSettingsOptions({ userTypes: [], countries: [], languages: [], sports: [] }));
    }
  }, [settingsArticleId, settingsOptions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTopic]);

  const byTopic = useMemo(() => {
    if (!activeTopic || activeTopic === ALL_TOPICS) return pasted;
    return pasted.filter((a) => (a.topic ?? 'News') === activeTopic);
  }, [pasted, activeTopic]);

  const filtered = useMemo(() => {
    let list = byTopic;
    if (selectedSport) {
      list = list.filter((a) => (a.topic ?? '').toLowerCase() === selectedSport.toLowerCase());
    }
    if (selectedLanguage) {
      list = list.filter((a) => (a.languageCode ?? '') === selectedLanguage);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (a) =>
        (a.title || '').toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q) ||
        (a.url || '').toLowerCase().includes(q) ||
        (a.customDescription || '').toLowerCase().includes(q)
    );
  }, [byTopic, search, selectedSport, selectedLanguage]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortOrder === 'date-desc') {
      list.sort((a, b) => new Date(b.savedAt ?? 0).getTime() - new Date(a.savedAt ?? 0).getTime());
    } else if (sortOrder === 'date-asc') {
      list.sort((a, b) => new Date(a.savedAt ?? 0).getTime() - new Date(b.savedAt ?? 0).getTime());
    } else if (sortOrder === 'alpha-asc') {
      list.sort((a, b) => (a.title || a.url || '').localeCompare(b.title || b.url || '', undefined, { sensitivity: 'base' }));
    } else {
      list.sort((a, b) => (b.title || b.url || '').localeCompare(a.title || a.url || '', undefined, { sensitivity: 'base' }));
    }
    return list;
  }, [filtered, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
  const start = (currentPage - 1) * itemsPerPage;

  // Clamp current page when total pages shrinks (e.g. after filter or items-per-page change)
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const paginated = useMemo(
    () => sorted.slice(start, start + itemsPerPage),
    [sorted, start, itemsPerPage]
  );

  const pageNumbers = useMemo(() => {
    let from = Math.max(1, currentPage - Math.floor(MAX_PAGE_BUTTONS / 2));
    let to = Math.min(totalPages, from + MAX_PAGE_BUTTONS - 1);
    if (to - from + 1 < MAX_PAGE_BUTTONS) from = Math.max(1, to - MAX_PAGE_BUTTONS + 1);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [currentPage, totalPages]);

  return (
    <div className="mt-6">
      {/* Toolbar - Search, Filter, Pagination (red area from second picture) */}
      <div className="rounded-xl border border-gray-200 overflow-hidden mb-4">
        {/* Row 1: Search, Highlight, next, prev, Select Sport, Language, Show */}
        <div className="bg-red-800 flex flex-wrap items-center gap-2 p-3">
          <div className="flex items-center bg-gray-700 rounded border border-gray-600 flex-1 min-w-[140px] max-w-[200px]">
            <Search className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
            <input
              type="text"
              placeholder="Q Search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              onKeyDown={(e) => e.key === 'Enter' && setCurrentPage(1)}
              className="bg-transparent text-white placeholder-gray-400 px-2 py-1.5 text-sm w-full outline-none"
              aria-label="Search OGP articles"
            />
          </div>
          <button
            type="button"
            onClick={() => setHighlightMatches((m) => !m)}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              highlightMatches
                ? 'bg-amber-400 text-amber-900 hover:bg-amber-500'
                : 'bg-white text-gray-800 hover:bg-gray-100'
            }`}
            title={highlightMatches ? 'Hide highlights' : 'Highlight search matches in results'}
            aria-pressed={highlightMatches}
          >
            Highlight
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 bg-white text-gray-800 rounded text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            next
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 bg-white text-gray-800 rounded text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            prev
          </button>
          <select
            value={selectedSport}
            onChange={(e) => {
              setSelectedSport(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 bg-white text-gray-800 rounded text-sm border border-gray-300"
            aria-label="Filter by topic (sport)"
          >
            <option value="">Select</option>
            <option value="Sport">Sport</option>
            <option value="Training">Training</option>
            <option value="Events">Events</option>
            <option value="Nutrition">Nutrition</option>
            <option value="Medicine">Medicine</option>
            <option value="News">News</option>
            <option value="Equipments">Equipments</option>
            <option value="Lounge music">Lounge music</option>
          </select>
          <select
            value={selectedLanguage}
            onChange={(e) => {
              setSelectedLanguage(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 bg-white text-gray-800 rounded text-sm border border-gray-300"
            aria-label="Filter by article language"
          >
            <option value="">Language</option>
            {ALL_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setCurrentPage(1)}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium"
            title="Apply filters and go to first page"
          >
            Show
          </button>
        </div>
        {/* Row 2: Rows per page dropdown (each row = 6 OGPs), Prev, page numbers, Next */}
        <div className="bg-gray-100 flex flex-wrap items-center gap-2 p-3 border-t border-gray-200">
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1.5 bg-white text-gray-800 rounded text-sm border border-gray-300"
            aria-label="Rows per page"
          >
            {ROWS_PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500 hidden sm:inline">rows</span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 bg-amber-100 text-amber-900 rounded text-sm font-medium hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            Prev
          </button>
          {pageNumbers.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCurrentPage(n)}
              className={`min-w-[32px] px-2 py-1.5 rounded text-sm font-medium ${
                currentPage === n
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100'
              }`}
              aria-label={currentPage === n ? `Page ${n} (current)` : `Page ${n}`}
              aria-current={currentPage === n ? 'page' : undefined}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 bg-amber-100 text-amber-900 rounded text-sm font-medium hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            Next
          </button>
          {/* Add article "+" at right end of pagination row */}
          {onAddClick != null && (
            <button
              type="button"
              onClick={onAddClick}
              disabled={addButtonDisabled}
              className={`ml-auto flex items-center justify-center w-10 h-10 rounded-lg border transition-colors flex-shrink-0 ${
                addButtonDisabled
                  ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
              }`}
              title={addButtonDisabled ? 'Select a topic to add an article' : 'Add article'}
              aria-label="Add article"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Pasted - OGP cards in a grid (multiple per row) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden max-h-[100vh]">
        <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between gap-2">
          <span className="font-semibold">
            {activeTopic === ALL_TOPICS ? 'All' : activeTopic ?? ''}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSortOrder((s) => (s === 'alpha-asc' ? 'alpha-desc' : 'alpha-asc'))}
              className={`p-2 rounded-lg transition-colors ${
                sortOrder === 'alpha-asc' || sortOrder === 'alpha-desc'
                  ? 'bg-amber-500 text-amber-900'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title={sortOrder === 'alpha-asc' ? 'Sort A–Z (click for Z–A)' : sortOrder === 'alpha-desc' ? 'Sort Z–A (click for A–Z)' : 'Sort by title'}
              aria-label="Sort alphabetically"
            >
              <ArrowDownAZ className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setSortOrder((s) => (s === 'date-desc' ? 'date-asc' : 'date-desc'))}
              className={`p-2 rounded-lg transition-colors ${
                sortOrder === 'date-desc' || sortOrder === 'date-asc'
                  ? 'bg-amber-500 text-amber-900'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title={sortOrder === 'date-desc' ? 'Newest first (click for oldest)' : 'Oldest first (click for newest)'}
              aria-label="Sort by date"
            >
              <Clock className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500">
              {activeTopic === ALL_TOPICS
                ? 'No articles yet. Select a topic and add one.'
                : activeTopic
                  ? `No articles for ${activeTopic} yet. Paste a URL or switch topic.`
                  : 'Articles from pasted URLs will appear here.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-h-[500px] overflow-y-auto">
              {paginated.map((a) => (
                <article
                  key={a.id}
                  className={`border rounded-lg p-3 group flex flex-col min-w-0 relative h-full min-h-0 ${
                    a.deletedAt
                      ? 'border-amber-200 bg-amber-50/50 hover:bg-amber-50/70'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 z-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-inset"
                    aria-label={`Open: ${a.title || a.url}`}
                  />
                  <div className="relative z-10 pointer-events-none flex-1 min-h-0 flex flex-col">
                    {a.image && (
                      <img
                        src={a.image}
                        alt=""
                        className={`w-full h-28 object-cover rounded mb-2 flex-shrink-0 ${a.deletedAt ? 'opacity-75' : ''}`}
                      />
                    )}
                    <h4 className={`font-medium text-sm line-clamp-2 ${a.deletedAt ? 'text-gray-600' : 'text-gray-900'}`}>
                      {highlightMatches && search.trim()
                        ? highlightText(a.title || a.url, search)
                        : a.title || a.url}
                    </h4>
                    <p
                      className={`text-xs text-gray-600 mt-1 flex-1 ${
                        expandedArticleIds.has(a.id)
                          ? 'max-h-28 overflow-y-auto overflow-x-hidden'
                          : 'line-clamp-2'
                      }`}
                    >
                      {highlightMatches && search.trim()
                        ? highlightText(
                            a.customDescription || a.description || a.url,
                            search
                          )
                        : a.customDescription || a.description || a.url}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      {formatDate(a.savedAt ?? new Date().toISOString())}
                    </p>
                    {a.deletedAt && (
                      <p className="text-xs text-amber-800 mt-1 font-medium">
                        Deleted on {formatDate(a.deletedAt)}
                        {a.deletedByName ? ` by ${a.deletedByName}` : ' by creator'}
                      </p>
                    )}
                  </div>
                  {/* Action icons row below each OGP - compact so 6 fit within narrow cards */}
                  <div className="relative z-20 pointer-events-auto mt-auto pt-2 border-t border-gray-100 flex items-center justify-between gap-0.5 min-w-0 flex-shrink-0">
                    <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (a.userId === currentUserId) setEditTopicArticleId(a.id);
                        }}
                        disabled={!onUpdatePastedTopic || a.userId !== currentUserId}
                        className="flex items-center justify-center w-6 h-6 min-w-[24px] rounded border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-50"
                        title={a.userId === currentUserId ? 'Change topic (creator only)' : 'Only the creator can change this article\'s topic'}
                        aria-label="Change topic"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleArticleExpanded(a.id);
                        }}
                        className="flex items-center justify-center w-6 h-6 min-w-[24px] rounded border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-colors shrink-0"
                        title={expandedArticleIds.has(a.id) ? 'Show less (2 rows)' : 'Show full text'}
                        aria-label={expandedArticleIds.has(a.id) ? 'Collapse text' : 'Expand to full text'}
                      >
                        {expandedArticleIds.has(a.id) ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (a.url) {
                            navigator.clipboard?.writeText(a.url).then(() => setCopiedArticleId(a.id));
                          }
                        }}
                        className="flex items-center justify-center w-6 h-6 min-w-[24px] rounded border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-colors shrink-0"
                        title={copiedArticleId === a.id ? 'Copied!' : 'Copy OGP URL to clipboard'}
                        aria-label={copiedArticleId === a.id ? 'Copied!' : 'Copy link'}
                      >
                        <Link className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCreatorModalArticleId(a.id);
                        }}
                        className="flex items-center justify-center w-6 h-6 min-w-[24px] rounded border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-colors shrink-0"
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
                          if (canDeleteOgp || a.userId === currentUserId) setSettingsArticleId(a.id);
                        }}
                        disabled={!onUpdatePastedSettings || (!canDeleteOgp && a.userId !== currentUserId)}
                        className="flex items-center justify-center w-6 h-6 min-w-[24px] rounded border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-50"
                        title={canDeleteOgp || a.userId === currentUserId ? 'News settings (visibility)' : 'Only creator, admin, or super admin can edit settings'}
                        aria-label="News settings"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (canDeleteOgp || a.userId === currentUserId) setRemoveConfirmArticleId(a.id);
                      }}
                      disabled={!onRemovePasted || (!canDeleteOgp && a.userId !== currentUserId)}
                      className="flex items-center justify-center w-6 h-6 min-w-[24px] rounded border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-300 hover:text-red-600 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-50 disabled:hover:text-gray-600"
                      title={canDeleteOgp || a.userId === currentUserId ? 'Delete' : 'Only super admin, admin, or creator can delete'}
                      aria-label="Delete article"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {settingsArticleId != null && (
        <NewsSettingModal
          isOpen={true}
          onClose={() => setSettingsArticleId(null)}
          initialSettings={
            pasted.find((a) => a.id === settingsArticleId)?.visibility ?? defaultSettings
          }
          onSave={(settings) => {
            onUpdatePastedSettings?.(settingsArticleId, settings);
            setSettingsArticleId(null);
          }}
          onDeleteSettings={() => {
            onUpdatePastedSettings?.(settingsArticleId, defaultSettings);
          }}
          options={settingsOptions}
        />
      )}

      {creatorModalArticleId != null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
          onClick={() => setCreatorModalArticleId(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="creator-modal-title"
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 id="creator-modal-title" className="text-lg font-semibold text-gray-900">
                OGP creator
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
              {creatorLoading && (
                <p className="text-sm text-gray-500">Loading creator info…</p>
              )}
              {creatorError && (
                <p className="text-sm text-red-600">{creatorError}</p>
              )}
              {!creatorLoading && !creatorError && creatorInfo && (
                <dl className="space-y-3 text-sm">
                  {creatorInfo.name != null && creatorInfo.name !== '' && (
                    <div>
                      <dt className="text-gray-500 font-medium">Name</dt>
                      <dd className="text-gray-900 mt-0.5">{creatorInfo.name}</dd>
                    </div>
                  )}
                  {creatorInfo.username != null && creatorInfo.username !== '' && (
                    <div>
                      <dt className="text-gray-500 font-medium">Username</dt>
                      <dd className="text-gray-900 mt-0.5">{creatorInfo.username}</dd>
                    </div>
                  )}
                  {creatorInfo.email != null && creatorInfo.email !== '' && (
                    <div>
                      <dt className="text-gray-500 font-medium">Email</dt>
                      <dd className="text-gray-900 mt-0.5">{creatorInfo.email}</dd>
                    </div>
                  )}
                  {creatorInfo.gender != null && creatorInfo.gender !== '' && (
                    <div>
                      <dt className="text-gray-500 font-medium">Gender</dt>
                      <dd className="text-gray-900 mt-0.5">{creatorInfo.gender}</dd>
                    </div>
                  )}
                  {creatorInfo.country != null && creatorInfo.country !== '' && (
                    <div>
                      <dt className="text-gray-500 font-medium">Country</dt>
                      <dd className="text-gray-900 mt-0.5">{creatorInfo.country}</dd>
                    </div>
                  )}
                  {creatorInfo.telegramAccount != null && creatorInfo.telegramAccount !== '' && (
                    <div>
                      <dt className="text-gray-500 font-medium">Telegram</dt>
                      <dd className="text-gray-900 mt-0.5">{creatorInfo.telegramAccount}</dd>
                    </div>
                  )}
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
          aria-labelledby="remove-confirm-modal-title"
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-sm w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="remove-confirm-modal-title" className="text-lg font-semibold text-gray-900 mb-3">
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
                  onRemovePasted?.(removeConfirmArticleId);
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
          aria-labelledby="edit-topic-modal-title"
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-sm w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="edit-topic-modal-title" className="text-lg font-semibold text-gray-900 mb-3">
              Change OGP topic
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              Move this article to another topic (e.g. Events, Nutrition, Sport).
            </p>
            <label htmlFor="edit-topic-select" className="block text-sm font-medium text-gray-700 mb-1">
              Topic
            </label>
            <select
              id="edit-topic-select"
              value={editTopicValue}
              onChange={(e) => setEditTopicValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 mb-4"
            >
              {topicsList.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <label htmlFor="edit-topic-description" className="block text-sm font-medium text-gray-700 mb-1">
              Type here a brief description...
            </label>
            <textarea
              id="edit-topic-description"
              value={editTopicDescription}
              onChange={(e) => setEditTopicDescription(e.target.value)}
              placeholder="Brief description..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 resize-y min-h-[80px] mb-4 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
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
                  onUpdatePastedTopic?.(editTopicArticleId, editTopicValue, editTopicDescription);
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
    </div>
  );
}
