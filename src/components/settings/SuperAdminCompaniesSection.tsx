'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Building2,
  Globe,
  ImageIcon,
  LayoutGrid,
  Link2,
  Pencil,
  Plus,
  Tag,
  Trash2,
  Upload,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@/constants/tools.constants';

export type SportMachineCompanyRow = {
  id: string;
  name: string;
  logoUrl: string | null;
  iconUrl: string | null;
  country: string | null;
  description: string | null;
  url: string | null;
  createdAt: string;
  updatedAt: string;
};

type DisplayMode = 'grid' | 'label';

type Props = {
  onNotify: (msg: { type: 'success' | 'error'; text: string }) => void;
};

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * Normalize stored asset paths for browser <img>.
 * Handles missing leading slash, Windows backslashes, and absolute filesystem-style paths that still contain `/uploads/`.
 */
function mediaSrc(path: string | null | undefined): string | null {
  if (!path?.trim()) return null;
  let s = path.trim().replace(/\\/g, '/');
  const lower = s.toLowerCase();
  const uploadsMarker = '/uploads/';
  const uIdx = lower.indexOf(uploadsMarker);
  if (uIdx !== -1 && !/^https?:\/\//i.test(s)) {
    s = s.slice(uIdx);
  }
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('blob:') || s.startsWith('data:')) {
    return s;
  }
  return s.startsWith('/') ? s : `/${s}`;
}

/** Absolute URL in the browser so Label/Grid images are not broken by next/image constraints. */
function companyImageSrc(path: string | null | undefined): string {
  const n = mediaSrc(path);
  if (!n) return '';
  if (/^(https?:|blob:|data:)/i.test(n)) return n;
  if (typeof window !== 'undefined') {
    try {
      return new URL(n.startsWith('/') ? n : `/${n}`, window.location.origin).href;
    } catch {
      return n;
    }
  }
  return n;
}

const DESC_LANG_KEYS = ['en', 'fr', 'it', 'de', 'es', 'ru'] as const;

function emptyDescMap(): Record<string, string> {
  return Object.fromEntries(DESC_LANG_KEYS.map((k) => [k, '']));
}

function parseCompanyDescription(raw: string | null): Record<string, string> {
  const blank = emptyDescMap();
  if (!raw?.trim()) return { ...blank };
  const t = raw.trim();
  if (t.startsWith('{')) {
    try {
      const j = JSON.parse(t) as Record<string, unknown>;
      if (j && typeof j === 'object') {
        const out = { ...blank };
        for (const k of DESC_LANG_KEYS) {
          const v = j[k];
          if (typeof v === 'string') out[k] = v;
        }
        return out;
      }
    } catch {
      /* plain text */
    }
  }
  return { ...blank, en: t };
}

function serializeCompanyDescription(map: Record<string, string>): string | null {
  const trimmed = Object.fromEntries(
    Object.entries(map).map(([k, v]) => [k, (v || '').trim()])
  );
  const nonEmpty = Object.entries(trimmed).filter(([, v]) => v.length > 0);
  if (nonEmpty.length === 0) return null;
  if (nonEmpty.length === 1 && nonEmpty[0][0] === 'en') return nonEmpty[0][1];
  return JSON.stringify(Object.fromEntries(nonEmpty));
}

function descriptionPreview(raw: string | null): string {
  const m = parseCompanyDescription(raw);
  const en = (m.en || '').trim();
  if (en) return en;
  for (const k of DESC_LANG_KEYS) {
    const v = (m[k] || '').trim();
    if (v) return v;
  }
  return '';
}

export default function SuperAdminCompaniesSection({ onNotify }: Props) {
  const [companies, setCompanies] = useState<SportMachineCompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid');
  const [showCompanyForm, setShowCompanyForm] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [url, setUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [logoBlobUrl, setLogoBlobUrl] = useState<string | null>(null);
  const [iconBlobUrl, setIconBlobUrl] = useState<string | null>(null);
  const [descByLang, setDescByLang] = useState<Record<string, string>>(() => emptyDescMap());
  const [activeDescLang, setActiveDescLang] = useState('en');

  const descLanguages = useMemo(
    () =>
      SUPPORTED_LANGUAGES.filter((l: { code: string }) =>
        (DESC_LANG_KEYS as readonly string[]).includes(l.code)
      ),
    []
  );

  useEffect(() => {
    if (!logoFile) {
      setLogoBlobUrl(null);
      return;
    }
    const u = URL.createObjectURL(logoFile);
    setLogoBlobUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [logoFile]);

  useEffect(() => {
    if (!iconFile) {
      setIconBlobUrl(null);
      return;
    }
    const u = URL.createObjectURL(iconFile);
    setIconBlobUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [iconFile]);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/sport-machine-companies', {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify({
          type: 'error',
          text: data.error || 'Could not load companies',
        });
        return;
      }
      setCompanies(data.companies || []);
    } catch {
      onNotify({ type: 'error', text: 'Could not load companies' });
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCountry('');
    setDescByLang(emptyDescMap());
    setActiveDescLang('en');
    setUrl('');
    setLogoUrl(null);
    setIconUrl(null);
    setLogoFile(null);
    setIconFile(null);
  };

  const uploadAsset = async (file: File, type: 'logo' | 'icon'): Promise<string | null> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    const res = await fetch('/api/admin/sport-machine-companies/upload', {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    });
    const data = await res.json();
    if (!res.ok || !data.path) {
      onNotify({
        type: 'error',
        text: data.error || `Upload failed (${type})`,
      });
      return null;
    }
    return data.path as string;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onNotify({ type: 'error', text: 'Company name is required' });
      return;
    }

    setSaving(true);
    try {
      let nextLogo = logoUrl;
      let nextIcon = iconUrl;
      if (logoFile) {
        const p = await uploadAsset(logoFile, 'logo');
        if (!p) {
          setSaving(false);
          return;
        }
        nextLogo = p;
      }
      if (iconFile) {
        const p = await uploadAsset(iconFile, 'icon');
        if (!p) {
          setSaving(false);
          return;
        }
        nextIcon = p;
      }

      const payload = {
        name: name.trim(),
        country: country.trim() || null,
        description: serializeCompanyDescription(descByLang),
        url: url.trim() || null,
        logoUrl: nextLogo,
        iconUrl: nextIcon,
      };

      if (editingId) {
        const res = await fetch(`/api/admin/sport-machine-companies/${editingId}`, {
          method: 'PATCH',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          onNotify({
            type: 'error',
            text: data.error || 'Update failed',
          });
          return;
        }
        onNotify({ type: 'success', text: 'Company updated' });
      } else {
        const res = await fetch('/api/admin/sport-machine-companies', {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          onNotify({
            type: 'error',
            text: data.error || 'Create failed',
          });
          return;
        }
        onNotify({ type: 'success', text: 'Company added' });
      }

      resetForm();
      await loadCompanies();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c: SportMachineCompanyRow) => {
    setEditingId(c.id);
    setName(c.name);
    setCountry(c.country || '');
    setDescByLang(parseCompanyDescription(c.description));
    setActiveDescLang('en');
    setUrl(c.url || '');
    setLogoUrl(c.logoUrl);
    setIconUrl(c.iconUrl);
    setLogoFile(null);
    setIconFile(null);
  };

  const handleDelete = async (id: string, companyName: string) => {
    if (!window.confirm(`Delete “${companyName}”? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/sport-machine-companies/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        onNotify({ type: 'error', text: data.error || 'Delete failed' });
        return;
      }
      if (editingId === id) resetForm();
      onNotify({ type: 'success', text: 'Company deleted' });
      await loadCompanies();
    } catch {
      onNotify({ type: 'error', text: 'Delete failed' });
    }
  };

  const logoPreviewResolved = mediaSrc(logoBlobUrl || logoUrl || undefined);
  const iconPreviewResolved = mediaSrc(iconBlobUrl || iconUrl || undefined);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Companies
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Sport and fitness machine manufacturers — logo (square), icon, country, and website.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => setShowCompanyForm((v) => !v)}
            className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {showCompanyForm ? 'Hide add/edit form' : 'Show add/edit form'}
          </button>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
          <button
            type="button"
            onClick={() => setDisplayMode('grid')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${
              displayMode === 'grid'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Grid
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('label')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition border-l border-gray-200 dark:border-gray-600 ${
              displayMode === 'label'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Tag className="w-4 h-4" />
            Label
          </button>
        </div>
        </div>
      </div>

      {showCompanyForm && (
      <form
        onSubmit={handleSubmit}
        className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4"
      >
        <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {editingId ? 'Edit company' : 'Add company'}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Company name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
              placeholder="e.g. Technogym"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Logo (square image)
            </label>
            <div className="flex flex-wrap items-start gap-3">
              <label className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                <Upload className="w-4 h-4" />
                Choose file
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                />
              </label>
              {logoPreviewResolved && (
                <div className="relative h-16 w-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-white shrink-0">
                  <Image
                    src={companyImageSrc(logoPreviewResolved) ?? ''}
                    alt="Logo preview"
                    fill
                    className="object-cover"
                    sizes="64px"
                    unoptimized
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Icon (company icon)
            </label>
            <div className="flex flex-wrap items-start gap-3">
              <label className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                <ImageIcon className="w-4 h-4" />
                Choose file
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => setIconFile(e.target.files?.[0] || null)}
                />
              </label>
              {iconPreviewResolved && (
                <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-white shrink-0">
                  <Image
                    src={companyImageSrc(iconPreviewResolved) ?? ''}
                    alt="Icon preview"
                    fill
                    className="object-contain p-1"
                    sizes="48px"
                    unoptimized
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Country
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
              placeholder="e.g. Italy"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
              <Link2 className="w-3.5 h-3.5" />
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
              placeholder="https://"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Short description
            </label>
            <div className="flex flex-wrap gap-1 mb-2">
              {descLanguages.map((lang: { code: string; name: string }) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setActiveDescLang(lang.code)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition ${
                    activeDescLang === lang.code
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
            <textarea
              value={descByLang[activeDescLang] ?? ''}
              onChange={(e) =>
                setDescByLang((prev) => ({
                  ...prev,
                  [activeDescLang]: e.target.value
                }))
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white resize-y min-h-[4rem]"
              placeholder="One or two lines about the brand"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add company'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>
      )}

      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading…</div>
        ) : companies.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No companies yet. Use the form above to add the first one.
          </div>
        ) : displayMode === 'grid' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">
                    Company name
                  </th>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-white w-24">
                    Logo
                  </th>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">
                    Country
                  </th>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">
                    URL
                  </th>
                  <th className="text-right p-3 font-semibold text-gray-900 dark:text-white w-36">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-gray-100 dark:border-gray-700/80 hover:bg-gray-50/80 dark:hover:bg-gray-900/30"
                  >
                    <td className="p-3 font-medium text-gray-900 dark:text-white">{c.name}</td>
                    <td className="p-3">
                      {c.logoUrl ? (
                        <div className="relative h-12 w-12 rounded-md overflow-hidden border border-gray-200 dark:border-gray-600">
                          <Image
                            src={companyImageSrc(c.logoUrl) ?? ''}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="48px"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">
                      {c.country || '—'}
                    </td>
                    <td className="p-3 max-w-[200px] truncate">
                      {c.url ? (
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Globe className="w-3.5 h-3.5 shrink-0" />
                          {c.url}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded mr-1"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id, c.name)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {companies.map((c) => {
              const descPreview = descriptionPreview(c.description);
              return (
              <li
                key={c.id}
                className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-3 bg-gray-50/50 dark:bg-gray-900/20"
              >
                <div className="flex items-start gap-3">
                  {c.iconUrl ? (
                    <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-white">
                      <Image
                        src={companyImageSrc(c.iconUrl) ?? ''}
                        alt=""
                        fill
                        className="object-contain p-0.5"
                        sizes="40px"
                        unoptimized
                      />
                    </div>
                  ) : c.logoUrl ? (
                    <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                      <Image
                        src={companyImageSrc(c.logoUrl) ?? ''}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="40px"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {c.name}
                    </p>
                    {c.country && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{c.country}</p>
                    )}
                  </div>
                </div>
                {c.logoUrl && (
                  <div className="relative mx-auto h-32 w-full max-w-[10rem] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40">
                    <Image
                      src={companyImageSrc(c.logoUrl) ?? ''}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="160px"
                      unoptimized
                    />
                  </div>
                )}
                {c.url && (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline truncate"
                  >
                    {c.url}
                  </a>
                )}
                {descPreview ? (
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                    {descPreview}
                  </p>
                ) : null}
                <div className="flex gap-2 mt-auto pt-2">
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id, c.name)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
