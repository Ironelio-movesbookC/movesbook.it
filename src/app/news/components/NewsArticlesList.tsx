'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search } from 'lucide-react';
import type { OGPData } from './OGPForm';
import type { NewsTopic } from './NewsTopicBar';

export type ArticlePasted = OGPData & {
  customDescription?: string;
  id: string;
  savedAt?: string;
  topic?: NewsTopic;
};
export type ArticleTyped = { id: string; description: string };

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 15, 20];
const MAX_PAGE_BUTTONS = 9;

function formatDate(iso?: string) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}

interface NewsArticlesListProps {
  pasted: ArticlePasted[];
  typed?: ArticleTyped[];
  activeTopic: NewsTopic | null;
  onRemovePasted?: (id: string) => void;
  onRemoveTyped?: (id: string) => void;
}

export default function NewsArticlesList({
  pasted,
  activeTopic,
  onRemovePasted,
}: NewsArticlesListProps) {
  const [search, setSearch] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTopic]);

  const byTopic = useMemo(() => {
    if (!activeTopic) return pasted;
    return pasted.filter((a) => (a.topic ?? 'News') === activeTopic);
  }, [pasted, activeTopic]);

  const filtered = useMemo(() => {
    if (!search.trim()) return byTopic;
    const q = search.toLowerCase();
    return byTopic.filter(
      (a) =>
        (a.title || '').toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q) ||
        (a.url || '').toLowerCase().includes(q) ||
        (a.customDescription || '').toLowerCase().includes(q)
    );
  }, [byTopic, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const start = (currentPage - 1) * itemsPerPage;
  const paginated = useMemo(
    () => filtered.slice(start, start + itemsPerPage),
    [filtered, start, itemsPerPage]
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
              placeholder="Search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-white placeholder-gray-400 px-2 py-1.5 text-sm w-full outline-none"
            />
          </div>
          <button
            type="button"
            className="px-3 py-1.5 bg-white text-gray-800 rounded text-sm font-medium hover:bg-gray-100"
          >
            Highlight
          </button>
          <button
            type="button"
            className="px-3 py-1.5 bg-white text-gray-800 rounded text-sm font-medium hover:bg-gray-100"
          >
            next
          </button>
          <button
            type="button"
            className="px-3 py-1.5 bg-white text-gray-800 rounded text-sm font-medium hover:bg-gray-100"
          >
            prev
          </button>
          <select
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
            className="px-3 py-1.5 bg-white text-gray-800 rounded text-sm border border-gray-300"
          >
            <option value="">Select Sport</option>
            <option value="running">Running</option>
            <option value="cycling">Cycling</option>
            <option value="swimming">Swimming</option>
          </select>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-3 py-1.5 bg-white text-gray-800 rounded text-sm border border-gray-300"
          >
            <option value="">Language</option>
            <option value="en">English</option>
            <option value="de">German</option>
            <option value="fr">French</option>
          </select>
          <button
            type="button"
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium"
          >
            Show
          </button>
        </div>
        {/* Row 2: Items per page, Prev, page numbers, Next */}
        <div className="bg-white flex flex-wrap items-center gap-2 p-3 border-t border-gray-200">
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1.5 bg-white text-gray-800 rounded text-sm border border-gray-300"
          >
            {ITEMS_PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 bg-amber-100 text-amber-900 rounded text-sm font-medium hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 bg-amber-100 text-amber-900 rounded text-sm font-medium hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {/* Pasted - OGP cards in a grid (multiple per row) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden max-h-[100vh]">
        <div className="bg-gray-800 text-white px-4 py-2 font-semibold">
          {activeTopic ? `${activeTopic}` : ''}
        </div>
        <div className="p-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500">
              {activeTopic
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
                    <h4 className="font-medium text-gray-900 text-sm line-clamp-2">{a.title || a.url}</h4>
                    <p className="text-xs text-gray-600 line-clamp-2 mt-1 flex-1">
                      {a.customDescription || a.description || a.url}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      {formatDate(a.savedAt ?? new Date().toISOString())}
                    </p>
                  </div>
                  {onRemovePasted && (
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
