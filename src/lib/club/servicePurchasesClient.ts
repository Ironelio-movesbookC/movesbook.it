'use client';

export function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

/** Append sidebar-selected club so APIs resolve the same club as the UI. */
export function withSelectedClubId(url: string): string {
  if (typeof window === 'undefined') return url;
  if (url.includes('clubId=')) return url;

  const clubId = localStorage.getItem('selectedClub');
  if (!clubId) return url;

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}clubId=${encodeURIComponent(clubId)}`;
}

export async function clubApiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(withSelectedClubId(url), {
    ...init,
    headers: { ...getAuthHeaders(), ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function formatEuro(value: number | undefined | null): string {
  return `€${Number(value ?? 0).toFixed(2)}`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}
