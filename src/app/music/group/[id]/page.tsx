'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { ArrowDownAZ, Clock, ExternalLink, Share2, Tag, ThumbsUp, X } from 'lucide-react';
import ModernNavbar from '@/components/ModernNavbar';
import ModernFooter from '@/components/ModernFooter';
import OgpShareModal from '@/app/news/components/OgpShareModal';
import { getOgpGroupShareUrl } from '@/lib/ogpGroupShareUrl';

type PublicMember = {
  id: string;
  title: string | null;
  image: string | null;
  description: string | null;
  url: string;
  customDescription: string | null;
  topic: string;
  savedAt: string;
  creatorUsername: string | null;
  creatorName: string | null;
};

type PublicGroup = {
  id: string;
  name: string;
  topic: string;
  customDescription: string | null;
  savedAt: string;
  memberCount: number;
  creatorUsername: string | null;
  creatorName: string | null;
};

type SortMode = 'alpha-asc' | 'alpha-desc' | 'date-desc' | 'date-asc';

function formatDate(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function PublicOgpMusicGroupPage() {
  const params = useParams();
  const groupId = typeof params?.id === 'string' ? params.id : '';

  const [group, setGroup] = useState<PublicGroup | null>(null);
  const [members, setMembers] = useState<PublicMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('date-desc');
  const [shareOpen, setShareOpen] = useState(false);
  const [previewMemberId, setPreviewMemberId] = useState<string | null>(null);

  const previewMember = useMemo(
    () => (previewMemberId ? members.find((m) => m.id === previewMemberId) ?? null : null),
    [members, previewMemberId]
  );

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/public/music/ogp-groups/${encodeURIComponent(groupId)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Group not found');
        }
        if (cancelled) return;
        setGroup(data.group);
        setMembers(Array.isArray(data.members) ? data.members : []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load group');
          setGroup(null);
          setMembers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const sortedMembers = useMemo(() => {
    const list = [...members];
    const label = (m: PublicMember) => m.title || m.url || '';
    if (sortMode === 'alpha-asc') {
      list.sort((a, b) => label(a).localeCompare(label(b), undefined, { sensitivity: 'base' }));
    } else if (sortMode === 'alpha-desc') {
      list.sort((a, b) => label(b).localeCompare(label(a), undefined, { sensitivity: 'base' }));
    } else if (sortMode === 'date-asc') {
      list.sort((a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime());
    } else {
      list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    }
    return list;
  }, [members, sortMode]);

  const groupShareUrl = groupId ? getOgpGroupShareUrl(groupId, undefined, 'music') : '';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ModernNavbar hideContentNav />
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-6">
        {loading ? (
          <p className="text-sm text-gray-500">Loading group…</p>
        ) : error || !group ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Group not available</h1>
            <p className="text-sm text-gray-600">{error || 'This OGP Music group could not be found.'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-800 text-white px-3 sm:px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="font-semibold inline-flex flex-wrap items-baseline gap-x-1.5 min-w-0">
                <span className="text-white">GROUP of</span>
                <span className="text-lime-300 uppercase tracking-wide truncate max-w-[min(100%,28rem)]">
                  {group.name}
                </span>
              </div>
              <div className="ml-auto flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setSortMode((s) => (s === 'alpha-asc' ? 'alpha-desc' : 'alpha-asc'))
                  }
                  className={`p-2 rounded-lg transition-colors ${
                    sortMode === 'alpha-asc' || sortMode === 'alpha-desc'
                      ? 'bg-amber-500 text-amber-900'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title="Sort alphabetically"
                  aria-label="Sort alphabetically"
                >
                  <ArrowDownAZ className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSortMode((s) => (s === 'date-desc' ? 'date-asc' : 'date-desc'))
                  }
                  className={`p-2 rounded-lg transition-colors ${
                    sortMode === 'date-desc' || sortMode === 'date-asc'
                      ? 'bg-amber-500 text-amber-900'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title="Sort by date"
                  aria-label="Sort by date"
                >
                  <Clock className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                  title="Share this group"
                  aria-label="Share this group"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
              <span>
                Topic:{' '}
                <span className="font-medium text-gray-800">{group.topic}</span>
              </span>
              {(group.creatorUsername || group.creatorName) && (
                <span>
                  by{' '}
                  <span className="font-medium text-blue-700">
                    {group.creatorUsername || group.creatorName}
                  </span>
                </span>
              )}
              <span>
                {group.memberCount} OGP Music
              </span>
            </div>

            <div className="p-4">
              {sortedMembers.length === 0 ? (
                <p className="text-sm text-gray-500">No OGP Music in this group.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {sortedMembers.map((m) => (
                    <article
                      key={m.id}
                      className="border border-gray-200 rounded-lg p-3 flex flex-col min-w-0 bg-white hover:bg-gray-50"
                    >
                      {m.image ? (
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative block w-full h-28 rounded overflow-hidden mb-2"
                        >
                          <Image
                            src={m.image}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 20vw"
                            unoptimized
                          />
                        </a>
                      ) : null}
                      <div className="flex items-center gap-1 mb-1.5 min-w-0">
                        <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 max-w-[70%] min-w-0">
                          <Tag className="w-3 h-3 shrink-0" aria-hidden />
                          <span className="truncate">{m.topic}</span>
                        </span>
                        {(m.creatorUsername || m.creatorName) && (
                          <span className="ml-auto text-[11px] text-blue-600 whitespace-nowrap truncate max-w-[45%]">
                            by {m.creatorUsername || m.creatorName}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="text-left w-full group/text"
                        onClick={() => setPreviewMemberId(m.id)}
                      >
                        <h4 className="font-medium text-sm text-gray-900 line-clamp-2 group-hover/text:underline">
                          {m.title || m.url}
                        </h4>
                        {(m.customDescription || m.description) && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {m.customDescription || m.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{formatDate(m.savedAt)}</p>
                      </button>
                      <div className="mt-auto pt-2 border-t border-gray-100 flex items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-500"
                          title="Likes (sign in on Movesbook to like)"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </span>
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-gray-600 hover:bg-gray-100"
                          title="Open original article"
                          aria-label="Open original article"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <ModernFooter />

      <OgpShareModal
        isOpen={shareOpen && !!group}
        onClose={() => setShareOpen(false)}
        article={
          group
            ? {
                url: groupShareUrl,
                title: group.name,
              }
            : null
        }
      />

      {previewMember && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
          onClick={() => setPreviewMemberId(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ogp-preview-modal-title"
        >
          <div
            className="bg-white rounded-xl shadow-xl border border-gray-300 max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
              <span className="font-semibold" id="ogp-preview-modal-title">
                {previewMember.topic || 'Music'}
              </span>
              <button
                type="button"
                onClick={() => setPreviewMemberId(null)}
                className="p-1 rounded text-gray-300 hover:text-white hover:bg-gray-700"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {previewMember.image && (
                previewMember.url ? (
                  <a
                    href={previewMember.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-inset cursor-pointer"
                    aria-label={`Open article: ${previewMember.title || previewMember.url}`}
                  >
                    <span className="relative block w-full h-64 max-h-64">
                      <Image
                        src={previewMember.image}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 512px) 100vw, 512px"
                        unoptimized
                      />
                    </span>
                  </a>
                ) : (
                  <span className="relative block w-full h-64 max-h-64">
                    <Image
                      src={previewMember.image}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 512px) 100vw, 512px"
                      unoptimized
                    />
                  </span>
                )
              )}
              <div className="p-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {previewMember.title || previewMember.url}
                </h3>
                <div className="text-sm text-gray-500 mt-1 w-full flex items-center justify-between gap-2 flex-nowrap">
                  <span className="flex-shrink-0">{formatDate(previewMember.savedAt)}</span>
                  {(previewMember.creatorUsername || previewMember.creatorName) && (
                    <span className="text-blue-600 flex-shrink-0 ml-auto">
                      by {previewMember.creatorUsername || previewMember.creatorName}
                    </span>
                  )}
                </div>
                <div className="mt-3 text-sm text-gray-700 max-h-60 overflow-y-auto overflow-x-hidden pr-2 border border-gray-200 rounded-lg p-3">
                  {previewMember.customDescription ||
                    previewMember.description ||
                    previewMember.url}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
