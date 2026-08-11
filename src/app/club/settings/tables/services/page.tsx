'use client';

import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X
} from 'lucide-react';
import TablesTabs from '@/components/club-settings/TablesTabs';

type SectorOption = {
  id: string;
  name: string;
};

type ServiceItem = {
  id: string;
  sectorId: string;
  sectorName: string;
  serviceName: string;
  cost: string;
  actualCost: string;
  currencyCode: string;
  imageUrl: string | null;
  howMany: string;
  available: boolean;
  created: string | null;
  modified: string | null;
};

type ServiceDraft = {
  id?: string;
  sectorId: string;
  serviceName: string;
  cost: string;
  howMany: string;
  available: boolean;
  currentImageUrl: string | null;
  imageFile: File | null;
  imagePreview: string | null;
  removeImage: boolean;
};

type FieldErrors = Partial<Record<'sectorId' | 'serviceName' | 'cost' | 'howMany' | 'image', string>>;
type PageItem = number | 'ellipsis-left' | 'ellipsis-right';
type SortKey = 'sector' | 'service' | 'cost' | 'modified';
type SortDirection = 'asc' | 'desc';

const API_PATH = '/api/club/settings/tables/services';
const PAGE_SIZE_OPTIONS = [5, 10, 15, 20] as const;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']);

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

function formatCost(value: string, currencyCode: string): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return `- ${currencyCode}`;
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(numericValue)} ${currencyCode}`;
}

function isAllowedImage(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.has(file.type) || /\.(png|jpe?g|gif|webp)$/i.test(file.name);
}

function validateDraft(draft: ServiceDraft): FieldErrors {
  const errors: FieldErrors = {};

  if (!draft.sectorId) {
    errors.sectorId = 'Please select a sector.';
  }

  if (!draft.serviceName.trim()) {
    errors.serviceName = 'Please enter service name.';
  }

  if (!draft.cost.trim()) {
    errors.cost = 'Please enter cost.';
  } else if (!Number.isFinite(Number(draft.cost)) || Number(draft.cost) < 0) {
    errors.cost = 'Cost must be a number greater than or equal to 0.';
  }

  if (draft.howMany.trim() && (!Number.isFinite(Number(draft.howMany)) || Number(draft.howMany) < 0)) {
    errors.howMany = 'How many must be a number greater than or equal to 0.';
  }

  if (draft.imageFile) {
    if (draft.imageFile.size > MAX_IMAGE_BYTES) {
      errors.image = 'Service image must be 5MB or smaller.';
    } else if (!isAllowedImage(draft.imageFile)) {
      errors.image = 'Only PNG, JPG, GIF, or WEBP images are allowed.';
    }
  }

  return errors;
}

function makeEmptyDraft(): ServiceDraft {
  return {
    sectorId: '',
    serviceName: '',
    cost: '',
    howMany: '',
    available: true,
    currentImageUrl: null,
    imageFile: null,
    imagePreview: null,
    removeImage: false
  };
}

export default function ClubTablesServicesPage() {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [sectors, setSectors] = useState<SectorOption[]>([]);
  const [currencyCode, setCurrencyCode] = useState('EUR');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('modified');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [draft, setDraft] = useState<ServiceDraft | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null);

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
        throw new Error(data?.error || 'Unable to load services.');
      }

      setItems(Array.isArray(data.items) ? data.items : []);
      setSectors(Array.isArray(data.sectors) ? data.sectors : []);
      setCurrencyCode(data?.currency?.code || 'EUR');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Unable to load services.');
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
    const filtered = items.filter((item) => {
      const matchesSearch = term
        ? [
          item.sectorName,
          item.serviceName,
          item.cost,
          item.currencyCode
        ].some((value) => value.toLowerCase().includes(term))
        : true;

      const matchesSector = sectorFilter === 'all' || item.sectorId === sectorFilter;
      return matchesSearch && matchesSector;
    });

    return [...filtered].sort((a, b) => {
      if (sortKey === 'sector') {
        const result = a.sectorName.localeCompare(b.sectorName, undefined, { sensitivity: 'base' });
        return sortDirection === 'asc' ? result : -result;
      }

      if (sortKey === 'service') {
        const result = a.serviceName.localeCompare(b.serviceName, undefined, { sensitivity: 'base' });
        return sortDirection === 'asc' ? result : -result;
      }

      if (sortKey === 'cost') {
        const result = Number(a.cost || 0) - Number(b.cost || 0);
        return sortDirection === 'asc' ? result : -result;
      }

      const aTime = new Date(a.modified || a.created || 0).getTime();
      const bTime = new Date(b.modified || b.created || 0).getTime();
      const result = aTime - bTime;
      return sortDirection === 'asc' ? result : -result;
    });
  }, [items, search, sectorFilter, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const visibleStart = filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const visibleEnd = Math.min(currentPage * pageSize, filteredItems.length);

  useEffect(() => {
    setPage(1);
  }, [pageSize, search, sectorFilter]);

  const updateSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortKey(key);
    setSortDirection(key === 'modified' ? 'desc' : 'asc');
  };

  const openAddModal = () => {
    setDraft(makeEmptyDraft());
    setFieldErrors({});
    setError(null);
    setSuccess(null);
  };

  const openEditModal = (item: ServiceItem) => {
    setDraft({
      id: item.id,
      sectorId: item.sectorId,
      serviceName: item.serviceName,
      cost: item.cost,
      howMany: item.howMany,
      available: item.available,
      currentImageUrl: item.imageUrl,
      imageFile: null,
      imagePreview: null,
      removeImage: false
    });
    setFieldErrors({});
    setError(null);
    setSuccess(null);
  };

  const closeModal = () => {
    if (draft?.imagePreview) {
      URL.revokeObjectURL(draft.imagePreview);
    }
    setDraft(null);
    setFieldErrors({});
  };

  const updateDraft = (patch: Partial<ServiceDraft>) => {
    if (!draft) return;
    setDraft({ ...draft, ...patch });
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!draft) return;

    const file = event.target.files?.[0] ?? null;
    if (draft.imagePreview) {
      URL.revokeObjectURL(draft.imagePreview);
    }

    setDraft({
      ...draft,
      imageFile: file,
      imagePreview: file ? URL.createObjectURL(file) : null,
      removeImage: false
    });
    setFieldErrors((current) => ({ ...current, image: undefined }));
  };

  const clearSelectedImage = () => {
    if (!draft) return;
    if (draft.imagePreview) {
      URL.revokeObjectURL(draft.imagePreview);
    }

    setDraft({
      ...draft,
      imageFile: null,
      imagePreview: null
    });
    setFieldErrors((current) => ({ ...current, image: undefined }));
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

      const formData = new FormData();
      if (draft.id) formData.append('id', draft.id);
      formData.append('sectorId', draft.sectorId);
      formData.append('serviceName', draft.serviceName.trim());
      formData.append('cost', String(Number(draft.cost)));
      formData.append('howMany', draft.howMany.trim());
      formData.append('available', draft.available ? '1' : '0');
      formData.append('removeImage', draft.removeImage ? '1' : '0');
      if (draft.imageFile) {
        formData.append('image', draft.imageFile);
      }

      const token = localStorage.getItem('token');
      const response = await fetch(API_PATH, {
        method: draft.id ? 'PUT' : 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
          setFieldErrors(data.fieldErrors);
          return;
        }
        throw new Error(data?.error || 'Unable to save service.');
      }

      await loadItems();
      closeModal();
      setSuccess(draft.id ? 'Service updated successfully.' : 'Service added successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save service.');
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
        throw new Error(data?.error || 'Unable to delete service.');
      }

      setItems((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      setSuccess('Service deleted successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete service.');
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
              <p className="mt-1 text-sm text-gray-500">Club's management / General settings / Services</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sectorFilter}
                onChange={(event) => setSectorFilter(event.target.value)}
                className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800 outline-none focus:border-gray-500"
              >
                <option value="all">All sectors</option>
                {sectors.map((sector) => (
                  <option key={sector.id} value={sector.id}>{sector.name}</option>
                ))}
              </select>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search services"
                  className="h-9 w-56 rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-500"
                />
              </div>
              <ToolbarButton icon={Plus} label="Add service" onClick={openAddModal} variant="dark" />
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

        <TablesTabs active="services" />

        <div className="min-h-[360px] overflow-x-auto">
          {loading ? (
            <div className="flex h-72 items-center justify-center text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading services
            </div>
          ) : error && items.length === 0 ? (
            <div className="flex h-72 items-center justify-center px-4 text-center text-sm text-red-600">
              {error}
            </div>
          ) : (
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100 text-left text-xs uppercase tracking-wide text-gray-600">
                  <th className="w-52 px-4 py-3">
                    <SortHeader label="Sector" active={sortKey === 'sector'} direction={sortDirection} onClick={() => updateSort('sector')} />
                  </th>
                  <th className="w-28 px-4 py-3">Image</th>
                  <th className="px-4 py-3">
                    <SortHeader label="Service" active={sortKey === 'service'} direction={sortDirection} onClick={() => updateSort('service')} />
                  </th>
                  <th className="w-36 px-4 py-3">
                    <SortHeader label="Cost" active={sortKey === 'cost'} direction={sortDirection} onClick={() => updateSort('cost')} />
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
                    <td colSpan={6} className="px-4 py-16 text-center text-gray-500">
                      No services found.
                    </td>
                  </tr>
                ) : (
                  pageItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 bg-white transition hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                          {item.sectorName}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="h-14 w-20 rounded-md border border-gray-200 bg-gray-50 object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-20 items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-[11px] font-medium text-gray-400">
                            No image
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-950">{item.serviceName}</div>
                      </td>
                      <td className="px-4 py-4 font-semibold text-gray-800">{formatCost(item.cost, item.currencyCode || currencyCode)}</td>
                      <td className="px-4 py-4 text-gray-600">{formatDate(item.modified || item.created)}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <IconButton label="Edit service" onClick={() => openEditModal(item)} icon={<Pencil className="h-4 w-4" />} />
                          <IconButton label="Delete service" onClick={() => setDeleteTarget(item)} icon={<Trash2 className="h-4 w-4" />} danger />
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
          <form onSubmit={saveDraft} className="w-full max-w-2xl rounded-md bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-950">{draft.id ? 'Edit service' : 'Add service'}</h2>
              <button type="button" onClick={closeModal} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Sector</span>
                <select
                  value={draft.sectorId}
                  onChange={(event) => {
                    updateDraft({ sectorId: event.target.value });
                    setFieldErrors((current) => ({ ...current, sectorId: undefined }));
                  }}
                  className={`h-10 w-full rounded-md border bg-white px-3 text-sm text-gray-900 outline-none transition ${
                    fieldErrors.sectorId ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-gray-500'
                  }`}
                >
                  <option value="">Select type</option>
                  {sectors.map((sector) => (
                    <option key={sector.id} value={sector.id}>{sector.name}</option>
                  ))}
                </select>
                {fieldErrors.sectorId && <span className="mt-1 block text-xs font-medium text-red-600">{fieldErrors.sectorId}</span>}
              </label>

              <Field
                label="Service name"
                value={draft.serviceName}
                error={fieldErrors.serviceName}
                onChange={(value) => {
                  updateDraft({ serviceName: value });
                  setFieldErrors((current) => ({ ...current, serviceName: undefined }));
                }}
              />

              <Field
                label={`Cost (${currencyCode})`}
                value={draft.cost}
                error={fieldErrors.cost}
                type="number"
                min={0}
                step="0.01"
                onChange={(value) => {
                  updateDraft({ cost: value });
                  setFieldErrors((current) => ({ ...current, cost: undefined }));
                }}
              />

              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 md:row-span-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <ImagePlus className="h-4 w-4" />
                  Service image
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex h-28 w-full items-center justify-center rounded-md border border-dashed border-gray-300 bg-white sm:w-40">
                    {draft.imagePreview || (draft.currentImageUrl && !draft.removeImage) ? (
                      <img
                        src={draft.imagePreview || draft.currentImageUrl || ''}
                        alt=""
                        className="h-full w-full rounded-md object-cover"
                      />
                    ) : (
                      <span className="text-xs font-medium text-gray-400">No image</span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-center gap-2">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/gif,image/webp"
                      onChange={handleImageChange}
                      className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-gray-800"
                    />
                    <div className="flex flex-wrap gap-2">
                      {draft.imageFile && (
                        <button
                          type="button"
                          onClick={clearSelectedImage}
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white"
                        >
                          Clear selected image
                        </button>
                      )}
                      {draft.currentImageUrl && !draft.imageFile && !draft.removeImage && (
                        <button
                          type="button"
                          onClick={() => updateDraft({ removeImage: true })}
                          className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Remove image
                        </button>
                      )}
                      {draft.currentImageUrl && draft.removeImage && (
                        <button
                          type="button"
                          onClick={() => updateDraft({ removeImage: false })}
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white"
                        >
                          Keep current image
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {fieldErrors.image && <span className="mt-2 block text-xs font-medium text-red-600">{fieldErrors.image}</span>}
              </div>

              <Field
                label="How many"
                value={draft.howMany}
                error={fieldErrors.howMany}
                type="number"
                min={0}
                step="1"
                onChange={(value) => {
                  updateDraft({ howMany: value });
                  setFieldErrors((current) => ({ ...current, howMany: undefined }));
                }}
              />

              <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <input
                  type="checkbox"
                  checked={draft.available}
                  onChange={(event) => updateDraft({ available: event.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Available
              </label>
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
              <h2 className="text-lg font-semibold text-gray-950">Delete service</h2>
            </div>
            <div className="space-y-3 px-5 py-5 text-sm text-gray-700">
              <p className="font-medium text-gray-950">{deleteTarget.serviceName}</p>
              <p>This service will be removed from the club services table.</p>
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
  error,
  type = 'text',
  min,
  step
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: 'text' | 'number';
  min?: number;
  step?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">{label}</span>
      <input
        type={type}
        min={min}
        step={step}
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
    <nav className="flex flex-wrap items-center gap-1" aria-label="Services pagination">
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
