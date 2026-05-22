'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X
} from 'lucide-react';
import TablesTabs from '@/components/club-settings/TablesTabs';

type ContactItem = {
  id: string;
  name: string;
  created: string | null;
  modified: string | null;
};

type ContactDraft = {
  id?: string;
  name: string;
};

type FieldErrors = Partial<Record<keyof ContactDraft, string>>;
type PageItem = number | 'ellipsis-left' | 'ellipsis-right';
type SortKey = 'name' | 'modified';
type SortDirection = 'asc' | 'desc';

const API_PATH = '/api/club/settings/tables/contacts';
const PAGE_SIZE_OPTIONS = [5, 10, 15, 20] as const;

const EMPTY_DRAFT: ContactDraft = {
  name: ''
};

function getSmartPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-right', totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, 'ellipsis-left', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'ellipsis-left', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-right', totalPages];
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(date);
}

function validateDraft(draft: ContactDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.name.trim()) {
    errors.name = 'Please enter contact.';
  } else if (draft.name.trim().length > 250) {
    errors.name = 'Contact must be 250 characters or fewer.';
  }
  return errors;
}

export default function ClubTablesContactsPage() {
  const [items, setItems] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('modified');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [draft, setDraft] = useState<ContactDraft | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [deleteTarget, setDeleteTarget] = useState<ContactItem | null>(null);

  const loadItems = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_PATH, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to load contacts.');
      }

      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Unable to load contacts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadItems(controller.signal);
    return () => controller.abort();
  }, []);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? items.filter((item) => item.name.toLowerCase().includes(term))
      : items;

    return [...filtered].sort((a, b) => {
      if (sortKey === 'name') {
        const result = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        return sortDirection === 'asc' ? result : -result;
      }

      const aTime = new Date(a.modified || a.created || 0).getTime();
      const bTime = new Date(b.modified || b.created || 0).getTime();
      const result = aTime - bTime;
      return sortDirection === 'asc' ? result : -result;
    });
  }, [items, search, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const visibleStart = filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const visibleEnd = Math.min(currentPage * pageSize, filteredItems.length);

  useEffect(() => {
    setPage(1);
  }, [pageSize, search]);

  const updateSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortKey(key);
    setSortDirection(key === 'name' ? 'asc' : 'desc');
  };

  const openAddModal = () => {
    setDraft(EMPTY_DRAFT);
    setFieldErrors({});
    setError(null);
    setSuccess(null);
  };

  const openEditModal = (item: ContactItem) => {
    setDraft({
      id: item.id,
      name: item.name
    });
    setFieldErrors({});
    setError(null);
    setSuccess(null);
  };

  const closeModal = () => {
    setDraft(null);
    setFieldErrors({});
  };

  const saveDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) return;

    const nextErrors = validateDraft(draft);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('token');
      const response = await fetch(API_PATH, {
        method: draft.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ...draft,
          name: draft.name.trim()
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
          setFieldErrors(data.fieldErrors);
          return;
        }
        throw new Error(data?.error || 'Unable to save contact.');
      }

      await loadItems();
      closeModal();
      setSuccess(draft.id ? 'Contact edited successfully.' : 'Contacts added successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save contact.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_PATH}?id=${encodeURIComponent(deleteTarget.id)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to delete contact.');
      }

      setItems((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      setSuccess('Contact deleted successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete contact.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-50 p-6">
      <section className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-950">Tables</h1>
              <p className="mt-1 text-sm text-gray-500">Club&apos;s management / General settings / Contacts</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search contacts"
                  className="h-9 w-60 rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-500"
                />
              </div>
              <ToolbarButton icon={Plus} label="Add contact" onClick={openAddModal} variant="dark" />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-500"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span>per page</span>
              <span className="ml-1 text-gray-400">|</span>
              <span>
                Showing <strong className="font-semibold text-gray-900">{visibleStart}-{visibleEnd}</strong> of{' '}
                <strong className="font-semibold text-gray-900">{filteredItems.length}</strong>
              </span>
            </div>
            <SmartPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </div>

          {(error || success) && (
            <div className={`mt-4 rounded-md border px-3 py-2 text-sm ${
              error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}>
              {error || success}
            </div>
          )}
        </div>

        <TablesTabs active="contacts" />

        <div className="min-h-[360px] overflow-x-auto">
          {loading ? (
            <div className="flex h-72 items-center justify-center text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading contacts
            </div>
          ) : error && items.length === 0 ? (
            <div className="flex h-72 items-center justify-center px-4 text-center text-sm text-red-600">
              {error}
            </div>
          ) : (
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100 text-left text-xs uppercase tracking-wide text-gray-600">
                  <th className="px-4 py-3">
                    <SortHeader label="Contact" active={sortKey === 'name'} direction={sortDirection} onClick={() => updateSort('name')} />
                  </th>
                  <th className="w-36 px-4 py-3">
                    <SortHeader label="Modified" active={sortKey === 'modified'} direction={sortDirection} onClick={() => updateSort('modified')} />
                  </th>
                  <th className="w-28 px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-16 text-center text-gray-500">
                      No contacts found.
                    </td>
                  </tr>
                ) : (
                  pageItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 bg-white transition hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-950">{item.name}</div>
                      </td>
                      <td className="px-4 py-4 text-gray-600">{formatDate(item.modified || item.created)}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <IconButton label="Edit contact" onClick={() => openEditModal(item)} icon={<Pencil className="h-4 w-4" />} />
                          <IconButton label="Delete contact" onClick={() => setDeleteTarget(item)} icon={<Trash2 className="h-4 w-4" />} danger />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/45 px-4 py-6" role="dialog" aria-modal="true">
          <form onSubmit={saveDraft} className="w-full max-w-xl rounded-md bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-950">{draft.id ? 'Edit contact' : 'Add contact'}</h2>
              <button type="button" onClick={closeModal} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-5">
              <Field
                label="Contact"
                value={draft.name}
                error={fieldErrors.name}
                onChange={(value) => {
                  setDraft({ ...draft, name: value });
                  setFieldErrors((current) => ({ ...current, name: undefined }));
                }}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
              <button type="button" onClick={closeModal} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/45 px-4 py-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-md bg-white shadow-xl">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-950">Delete contact</h2>
            </div>
            <div className="space-y-3 px-5 py-5 text-sm text-gray-700">
              <p className="font-medium text-gray-950">{deleteTarget.name}</p>
              <p>This contact will be removed from the club contacts table.</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="button" onClick={confirmDelete} disabled={deleting} className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  variant = 'default'
}: {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'dark';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition ${
        variant === 'dark'
          ? 'border-gray-800 bg-gray-900 text-white hover:bg-gray-800'
          : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function IconButton({
  label,
  icon,
  onClick,
  danger = false
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition ${
        danger
          ? 'border-red-200 text-red-600 hover:bg-red-50'
          : 'border-gray-300 text-gray-700 hover:bg-gray-100'
      }`}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  );
}

function SortHeader({
  label,
  active,
  direction,
  onClick
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide text-gray-600 transition hover:text-gray-950"
    >
      <span>{label}</span>
      <span className={`text-[10px] ${active ? 'text-gray-950' : 'text-gray-300'}`}>
        {active ? direction === 'asc' ? '▲' : '▼' : '↕'}
      </span>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  error
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-10 w-full rounded-md border bg-white px-3 text-sm text-gray-900 outline-none transition ${
          error ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-gray-500'
        }`}
      />
      {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

function SmartPagination({
  currentPage,
  totalPages,
  onPageChange
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const pageItems = getSmartPageItems(currentPage, totalPages);
  const canGoBack = currentPage > 1;
  const canGoForward = currentPage < totalPages;

  const goToPage = (nextPage: number) => {
    onPageChange(Math.min(Math.max(nextPage, 1), totalPages));
  };

  return (
    <nav className="flex flex-wrap items-center gap-1" aria-label="Contacts pagination">
      <PaginationIconButton label="First page" disabled={!canGoBack} onClick={() => goToPage(1)} icon={<ChevronsLeft className="h-4 w-4" />} />
      <PaginationIconButton label="Previous page" disabled={!canGoBack} onClick={() => goToPage(currentPage - 1)} icon={<ChevronLeft className="h-4 w-4" />} />
      {pageItems.map((item) => {
        if (typeof item !== 'number') {
          return (
            <span key={item} className="flex h-9 w-9 items-center justify-center text-gray-400">
              ...
            </span>
          );
        }

        return (
          <button
            key={item}
            type="button"
            onClick={() => goToPage(item)}
            className={`h-9 min-w-9 rounded-md border px-3 text-sm font-semibold ${
              item === currentPage
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {item}
          </button>
        );
      })}
      <PaginationIconButton label="Next page" disabled={!canGoForward} onClick={() => goToPage(currentPage + 1)} icon={<ChevronRight className="h-4 w-4" />} />
      <PaginationIconButton label="Last page" disabled={!canGoForward} onClick={() => goToPage(totalPages)} icon={<ChevronsRight className="h-4 w-4" />} />
    </nav>
  );
}

function PaginationIconButton({
  label,
  icon,
  onClick,
  disabled
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {icon}
    </button>
  );
}
