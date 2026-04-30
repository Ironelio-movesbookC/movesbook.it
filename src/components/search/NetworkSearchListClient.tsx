'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bike, Star, UserPlus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type LegendKey =
  | 'single_user'
  | 'coach'
  | 'group'
  | 'team'
  | 'club'
  | 'public_figure';

type ListRow = {
  legendKey: LegendKey;
  resultType: 'user' | 'group' | 'team' | 'club';
  id: string;
  title: string;
  username: string | null;
  image: string | null;
  country: string | null;
  roleLine: string;
  mutualLine: string | null;
};

const ALL_LEGEND_KEYS: LegendKey[] = [
  'single_user',
  'coach',
  'group',
  'team',
  'club',
  'public_figure',
];

const SWATCH: Record<LegendKey, string> = {
  single_user: 'bg-blue-600',
  coach: 'bg-green-600',
  group: 'bg-purple-600',
  team: 'bg-rose-950',
  club: 'bg-red-600',
  public_figure: 'bg-orange-500',
};

function countryBadge(country: string | null): string {
  if (!country?.trim()) return '—';
  const t = country.trim();
  if (t.length <= 3) return t.toUpperCase();
  return t.slice(0, 2).toUpperCase();
}

function demoMemberVariant(id: string): 'member' | 'invite' {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % 2;
  return h === 0 ? 'member' : 'invite';
}

type Props = {
  initialQuery: string;
  initialSource: 'mypage' | 'myclub';
};

export function NetworkSearchListClient({ initialQuery, initialSource }: Props) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enabledKinds, setEnabledKinds] = useState<Set<LegendKey>>(() => {
    if (initialSource === 'myclub') return new Set<LegendKey>(['club']);
    return new Set(ALL_LEGEND_KEYS);
  });

  const load = useCallback(async () => {
    const q = initialQuery.trim();
    if (!q) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/network-search-list?q=${encodeURIComponent(q)}&source=${encodeURIComponent(initialSource)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : t('searchlist_error'));
        setRows([]);
        return;
      }
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setError(t('searchlist_error'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [initialQuery, initialSource, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(
    () => rows.filter((r) => enabledKinds.has(r.legendKey)),
    [rows, enabledKinds]
  );

  const toggleKind = (kind: LegendKey) => {
    setEnabledKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      if (next.size === 0) return new Set(ALL_LEGEND_KEYS);
      return next;
    });
  };

  const resetLegend = () => setEnabledKinds(new Set(ALL_LEGEND_KEYS));

  const legendItems: { key: LegendKey; label: string }[] = [
    { key: 'single_user', label: t('searchlist_legend_single_user') },
    { key: 'coach', label: t('searchlist_legend_coach') },
    { key: 'group', label: t('searchlist_legend_group') },
    { key: 'team', label: t('searchlist_legend_team') },
    { key: 'club', label: t('searchlist_legend_club') },
    { key: 'public_figure', label: t('searchlist_legend_public_figure') },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-6 sm:px-4 lg:px-6">
      <h1 className="mb-1 text-lg font-semibold text-zinc-900 sm:text-xl">
        {t('searchlist_title')}
      </h1>
      <p className="mb-4 text-sm text-zinc-600">
        {t('searchlist_query_heading')}
        <span className="font-medium text-zinc-800">&ldquo;{initialQuery}&rdquo;</span>
        <span className="text-zinc-400"> · </span>
        <span className="text-xs uppercase tracking-wide text-zinc-500">
          {initialSource === 'myclub' ? 'myclub' : 'mypage'}
        </span>
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-xs text-zinc-700 shadow-sm sm:text-sm">
        {legendItems.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleKind(key)}
            className={`inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors hover:bg-zinc-100 ${
              enabledKinds.has(key) ? 'opacity-100' : 'opacity-40 line-through'
            }`}
          >
            <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${SWATCH[key]}`} aria-hidden />
            <span>{label}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={resetLegend}
          className="ml-auto text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline sm:text-sm"
        >
          {t('searchlist_reset_all')}
        </button>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-zinc-500">{t('searchlist_loading')}</p>
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-600">{error}</p>
      ) : filteredRows.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-500">{t('searchlist_empty')}</p>
      ) : (
        <ul className="space-y-4">
          {filteredRows.map((row) => (
            <SearchResultCard key={`${row.resultType}-${row.id}`} row={row} t={t} />
          ))}
        </ul>
      )}
    </main>
  );
}

function SearchResultCard({
  row,
  t,
}: {
  row: ListRow;
  t: (key: string) => string;
}) {
  const variant = demoMemberVariant(row.id);
  const isUser = row.resultType === 'user';
  const memberLabel =
    variant === 'member' ? t('searchlist_btn_member') : t('searchlist_btn_invite');
  const secondaryCta =
    variant === 'member' ? t('searchlist_btn_member') : t('searchlist_btn_send_register');

  return (
    <li className="rounded-lg border border-zinc-300 bg-white shadow-sm">
      <div className="grid gap-4 p-4 sm:grid-cols-12 sm:items-start">
        <div className="flex flex-col gap-2 sm:col-span-3 lg:col-span-2">
          <div className="flex gap-2">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded border border-zinc-200 bg-zinc-100">
              {row.image ? (
                <img src={row.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-zinc-400">
                  —
                </div>
              )}
            </div>
            <div className="relative flex h-20 w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded border border-dashed border-zinc-300 bg-zinc-50 text-[8px] font-semibold uppercase leading-tight text-zinc-400">
              {t('searchlist_no_image')}
            </div>
          </div>
          <button
            type="button"
            className={`w-full rounded px-2 py-1.5 text-center text-[11px] font-semibold text-white shadow-sm sm:text-xs ${
              variant === 'member' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {memberLabel}
          </button>
        </div>

        <div className="min-w-0 sm:col-span-6 lg:col-span-7">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className="flex h-8 w-10 items-center justify-center rounded border border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-700"
              title={row.country ?? ''}
            >
              {countryBadge(row.country)}
            </span>
            <Bike className="h-5 w-5 text-zinc-500" aria-hidden />
            <Star className="h-5 w-5 fill-amber-400 text-amber-500" aria-hidden />
            <span
              className={`inline-block h-2.5 w-2.5 rounded-sm ${SWATCH[row.legendKey]}`}
              aria-hidden
            />
          </div>
          <p className="text-base font-semibold text-blue-700">
            {row.title}
            {isUser && row.username ? (
              <span className="block text-sm font-normal text-zinc-600 sm:inline sm:pl-2">
                ({row.username})
              </span>
            ) : null}
          </p>
          {row.country ? (
            <p className="text-sm text-zinc-700">{row.country}</p>
          ) : (
            <p className="text-sm text-zinc-400">—</p>
          )}
          <p className="mt-1 text-sm text-zinc-600">{row.roleLine}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {row.mutualLine ?? t('searchlist_mutuals_placeholder')}
          </p>
          <button
            type="button"
            className={`mt-3 hidden w-full max-w-xs rounded px-3 py-2 text-center text-xs font-semibold text-white shadow-sm sm:block ${
              variant === 'member' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {secondaryCta}
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:col-span-3">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 sm:text-sm"
          >
            <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
            {t('searchlist_btn_request_friend')}
          </button>
          <Link
            href={`/searchresults/search/${encodeURIComponent(
              isUser ? (row.username || '').trim() || row.id : row.title
            )}`}
            className="inline-flex items-center justify-center rounded bg-zinc-700 px-3 py-2 text-center text-xs font-semibold text-white shadow-sm hover:bg-zinc-800 sm:text-sm"
          >
            {isUser
              ? t('searchlist_btn_visit_user')
              : row.resultType === 'club'
                ? t('searchlist_btn_visit_club')
                : t('searchlist_btn_visit_entity')}
          </Link>
        </div>
      </div>
    </li>
  );
}
