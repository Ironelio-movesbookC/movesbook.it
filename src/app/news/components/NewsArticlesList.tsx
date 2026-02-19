'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, ArrowDownAZ, Clock, Plus } from 'lucide-react';
import type { OGPData } from './OGPForm';
import type { NewsTopic } from './NewsTopicBar';
import { ALL_TOPICS } from './NewsTopicBar';
import { ALL_LANGUAGES } from '@/constants/language.constants';

export type ArticlePasted = OGPData & {
  customDescription?: string;
  id: string;
  savedAt?: string;
  topic?: NewsTopic;
  languageCode?: string | null;
};
export type ArticleTyped = { id: string; description: string };

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 15, 20];
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
  /** Only admin (and super admin) can delete OGPs; when false, Remove button is hidden */
  canDeleteOgp?: boolean;
  /** Called when the "+" button is clicked to show the OGP input form. Rendered below pagination when provided. */
  onAddClick?: () => void;
  /** When true, the "+" button is disabled (e.g. when "All" is selected) */
  addButtonDisabled?: boolean;
}

export default function NewsArticlesList({
  pasted,
  activeTopic,
  onRemovePasted,
  canDeleteOgp = false,
  onAddClick,
  addButtonDisabled = false,
}: NewsArticlesListProps) {
  const [search, setSearch] = useState('');
  const [highlightMatches, setHighlightMatches] = useState(false);
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortOrder, setSortOrder] = useState<SortOrder>('date-desc');

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
            <option value="">Select Sport</option>
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
        {/* Row 2: Items per page dropdown, Prev, page numbers, Next (pagination strip) */}
        <div className="bg-gray-100 flex flex-wrap items-center gap-2 p-3 border-t border-gray-200">
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1.5 bg-white text-gray-800 rounded text-sm border border-gray-300"
            aria-label="Items per page"
          >
            {ITEMS_PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500 hidden sm:inline">per page</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto">
              {paginated.map((a) => (
                <article
                  key={a.id}
                  className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 group flex flex-col min-w-0 relative"
                >
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 z-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-inset"
                    aria-label={`Open: ${a.title || a.url}`}
                  />
                  <div className="relative z-10 pointer-events-none">
                    {a.image && (
                      <img
                        src={a.image}
                        alt=""
                        className="w-full h-28 object-cover rounded mb-2 flex-shrink-0"
                      />
                    )}
                    <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                      {highlightMatches && search.trim()
                        ? highlightText(a.title || a.url, search)
                        : a.title || a.url}
                    </h4>
                    <p className="text-xs text-gray-600 line-clamp-2 mt-1 flex-1">
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
                  </div>
                  {onRemovePasted && canDeleteOgp && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemovePasted(a.id);
                      }}
                      className="mt-2 text-xs text-red-600 opacity-0 group-hover:opacity-100 transition-opacity relative z-20 pointer-events-auto"
                    >
                      Remove
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
