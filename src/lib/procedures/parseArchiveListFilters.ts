import type { ListQuery } from '@/lib/procedures/types';

/** Shared query-string → ListQuery filter fields for procedure archive GET routes. */
export function parseArchiveListFilters(searchParams: URLSearchParams): Pick<
  ListQuery,
  'search' | 'fromDate' | 'toDate' | 'orderBy'
> {
  const search = searchParams.get('search')?.trim() || undefined;
  const fromDate = searchParams.get('fromDate') || undefined;
  const toDate = searchParams.get('toDate') || undefined;
  const orderRaw = searchParams.get('orderBy');
  const orderBy = orderRaw === 'old' || orderRaw === 'recent' ? orderRaw : undefined;
  return { search, fromDate, toDate, orderBy };
}
