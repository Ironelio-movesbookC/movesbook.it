import type { ListQuery, PaginatedResult } from './types';

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export function parsePagination(query: ListQuery): { page: number; pageSize: number; skip: number } {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(query.pageSize) || DEFAULT_PAGE_SIZE));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function paginated<T>(items: T[], total: number, page: number, pageSize: number): PaginatedResult<T> {
  return { items, total, page, pageSize };
}
