'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  LayoutGrid,
  Tag,
  Trash2,
  Pencil,
  Plus,
  Upload,
  Dumbbell,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  parseJsonRecord,
  parseStringArrayJson,
} from '@/lib/sportMachineHelpers';

type CompanyOpt = { id: string; name: string; country: string | null; logoUrl: string | null };

type MachineRow = {
  id: string;
  companyName: string;
  originalName: string;
  nameEnglish: string;
  nameByLanguage: string | null;
  mainArea: string;
  secondaryAreasJson: string | null;
  code: string;
  pictureAUrl: string | null;
  pictureBUrl: string | null;
  otherPicturesJson: string | null;
  videoUrl: string | null;
  descriptionByLanguage: string | null;
  sportMachineCompanyId: string | null;
};

const LANG_CODES = ['en', 'it', 'de', 'fr', 'es'];

function authHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export default function SportMachinesSection() {
  const { currentLanguage } = useLanguage();
  const [machines, setMachines] = useState<MachineRow[]>([]);
  const [companies, setCompanies] = useState<CompanyOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayMode, setDisplayMode] = useState<'grid' | 'label'>('grid');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [descLang, setDescLang] = useState(currentLanguage || 'en');

  const [sortBy, setSortBy] = useState<'name' | 'company'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterName, setFilterName] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [appliedName, setAppliedName] = useState('');
  const [appliedCompany, setAppliedCompany] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [namesByLang, setNamesByLang] = useState<Record<string, string>>({});
  const [langTab, setLangTab] = useState(currentLanguage || 'en');
  const [mainArea, setMainArea] = useState('');
  const [secondaryCsv, setSecondaryCsv] = useState('');
  const [code, setCode] = useState('');
  const [pictureAUrl, setPictureAUrl] = useState<string | null>(null);
  const [pictureBUrl, setPictureBUrl] = useState<string | null>(null);
  const [otherUrls, setOtherUrls] = useState<string[]>([]);
  const [newCatalogUrl, setNewCatalogUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [descByLang, setDescByLang] = useState<Record<string, string>>({});

  const loadCompanies = useCallback(async () => {
    const res = await fetch('/api/workouts/machine-companies-catalog', {
      headers: authHeaders(),
    });
    const data = await res.json();
    if (res.ok) setCompanies(data.companies || []);
  }, []);

  const loadMachines = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        sortBy,
        sortDir,
        filterName: appliedName,
        filterCompany: appliedCompany,
      });
      const res = await fetch(`/api/workouts/sport-machines?${q}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok) setMachines(data.machines || []);
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortDir, appliedName, appliedCompany]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

  const applyFilters = () => {
    setAppliedName(filterName.trim());
    setAppliedCompany(filterCompany.trim());
  };

  const uploadAsset = async (file: File, type: 'picture-a' | 'picture-b' | 'catalog') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    const res = await fetch('/api/workouts/sport-machines/upload', {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    });
    const data = await res.json();
    if (!res.ok || !data.path) {
      alert(data.error || 'Upload failed');
      return null;
    }
    return data.path as string;
  };

  const resetForm = () => {
    setEditingId(null);
    setCompanyId('');
    setCompanyName('');
    setOriginalName('');
    setNamesByLang({});
    setMainArea('');
    setSecondaryCsv('');
    setCode('');
    setPictureAUrl(null);
    setPictureBUrl(null);
    setOtherUrls([]);
    setNewCatalogUrl('');
    setVideoUrl('');
    setDescByLang({});
  };

  const startEdit = (m: MachineRow) => {
    setEditingId(m.id);
    setCompanyId(m.sportMachineCompanyId || '');
    setCompanyName(m.companyName);
    setOriginalName(m.originalName);
    setNamesByLang(parseJsonRecord(m.nameByLanguage));
    setMainArea(m.mainArea);
    const sec = parseStringArrayJson(m.secondaryAreasJson);
    setSecondaryCsv(sec.join(', '));
    setCode(m.code);
    setPictureAUrl(m.pictureAUrl);
    setPictureBUrl(m.pictureBUrl);
    setOtherUrls(parseStringArrayJson(m.otherPicturesJson));
    setVideoUrl(m.videoUrl || '');
    setDescByLang(parseJsonRecord(m.descriptionByLanguage));
  };

  const handleCompanyPick = (id: string) => {
    setCompanyId(id);
    if (!id) return;
    const c = companies.find((x) => x.id === id);
    if (c) setCompanyName(c.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !originalName.trim() || !mainArea.trim() || !code.trim()) {
      alert('Company, original name, main area, and code are required.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        sportMachineCompanyId: companyId || null,
        companyName: companyName.trim(),
        originalName: originalName.trim(),
        nameByLanguage: namesByLang,
        mainArea: mainArea.trim(),
        secondaryAreas: secondaryCsv,
        code: code.trim(),
        pictureAUrl,
        pictureBUrl,
        otherPictures: otherUrls,
        videoUrl: videoUrl.trim() || null,
        descriptionByLanguage: descByLang,
      };
      if (editingId) {
        const res = await fetch(`/api/workouts/sport-machines/${editingId}`, {
          method: 'PATCH',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || 'Update failed');
          return;
        }
      } else {
        const res = await fetch('/api/workouts/sport-machines', {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || 'Create failed');
          return;
        }
      }
      resetForm();
      await loadMachines();
    } finally {
      setSaving(false);
    }
  };

  const deleteOne = async (id: string) => {
    if (!confirm('Delete this machine?')) return;
    const res = await fetch(`/api/workouts/sport-machines/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) {
      if (editingId === id) resetForm();
      await loadMachines();
    }
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} machine(s)?`)) return;
    const res = await fetch('/api/workouts/sport-machines/bulk-delete', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });
    if (res.ok) {
      setSelected(new Set());
      resetForm();
      await loadMachines();
    }
  };

  const toggleSel = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const descriptionFor = useCallback(
    (m: MachineRow) => {
      const d = parseJsonRecord(m.descriptionByLanguage);
      return d[descLang]?.trim() || d.en?.trim() || '';
    },
    [descLang]
  );

  const sortControl = useMemo(
    () => (
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-sm text-gray-600">Sort</label>
        <select
          value={`${sortBy}-${sortDir}`}
          onChange={(e) => {
            const [a, b] = e.target.value.split('-') as [
              'name' | 'company',
              'asc' | 'desc',
            ];
            setSortBy(a);
            setSortDir(b);
          }}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="company-asc">Company A–Z</option>
          <option value="company-desc">Company Z–A</option>
        </select>
        <label className="text-sm text-gray-600 ml-2">Description lang</label>
        <select
          value={descLang}
          onChange={(e) => setDescLang(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          {LANG_CODES.map((c) => (
            <option key={c} value={c}>
              {c.toUpperCase()}
            </option>
          ))}
        </select>
      </div>
    ),
    [sortBy, sortDir, descLang]
  );

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Dumbbell className="w-6 h-6 text-indigo-600" />
          Sport instruments — Machines
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Catalog machines with company, multilingual names and descriptions, areas, codes,
          photos, and video. Companies list comes from Super Admin catalog when available.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 p-6 space-y-4 bg-white dark:bg-gray-800 dark:border-gray-700"
      >
        <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {editingId ? 'Edit machine' : 'Add machine'}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Company (from catalog)
            </label>
            <select
              value={companyId}
              onChange={(e) => handleCompanyPick(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
            >
              <option value="">— Manual name below —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.country ? ` (${c.country})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Company name *
            </label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Original name *
            </label>
            <input
              value={originalName}
              onChange={(e) => setOriginalName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
          <div className="md:col-span-2">
            <div className="flex flex-wrap gap-2 mb-2">
              {LANG_CODES.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLangTab(code)}
                  className={`px-2 py-1 text-xs rounded border ${
                    langTab === code
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Name ({langTab})
            </label>
            <input
              value={namesByLang[langTab] || ''}
              onChange={(e) =>
                setNamesByLang((p) => ({ ...p, [langTab]: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              placeholder="Leave empty to fall back to original / English"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Main area *
            </label>
            <input
              value={mainArea}
              onChange={(e) => setMainArea(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Other areas (comma-separated)
            </label>
            <input
              value={secondaryCsv}
              onChange={(e) => setSecondaryCsv(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              placeholder="e.g. Upper body, Accessories"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Code *
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Video URL
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              placeholder="https://"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Picture A
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="inline-flex items-center gap-1 px-2 py-1 border rounded cursor-pointer text-sm">
                <Upload className="w-4 h-4" />
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const p = await uploadAsset(f, 'picture-a');
                    if (p) setPictureAUrl(p);
                  }}
                />
              </label>
              {pictureAUrl && (
                <span className="text-xs text-gray-500 truncate max-w-[180px]">
                  {pictureAUrl}
                </span>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Picture B
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="inline-flex items-center gap-1 px-2 py-1 border rounded cursor-pointer text-sm">
                <Upload className="w-4 h-4" />
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const p = await uploadAsset(f, 'picture-b');
                    if (p) setPictureBUrl(p);
                  }}
                />
              </label>
              {pictureBUrl && (
                <span className="text-xs text-gray-500 truncate max-w-[180px]">
                  {pictureBUrl}
                </span>
              )}
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="block text-xs font-medium text-gray-600">
              Other pictures (catalog)
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              <label className="inline-flex items-center gap-1 px-2 py-1 border rounded cursor-pointer text-sm">
                <Upload className="w-4 h-4" />
                Add image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const p = await uploadAsset(f, 'catalog');
                    if (p) setOtherUrls((o) => [...o, p]);
                  }}
                />
              </label>
              <input
                type="url"
                value={newCatalogUrl}
                onChange={(e) => setNewCatalogUrl(e.target.value)}
                placeholder="Or paste image URL"
                className="flex-1 min-w-[200px] border rounded px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  if (newCatalogUrl.trim()) {
                    setOtherUrls((o) => [...o, newCatalogUrl.trim()]);
                    setNewCatalogUrl('');
                  }
                }}
                className="px-2 py-1 bg-gray-200 rounded text-sm"
              >
                Add URL
              </button>
            </div>
            <ul className="flex flex-wrap gap-2">
              {otherUrls.map((u, i) => (
                <li
                  key={`${u}-${i}`}
                  className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 rounded px-2 py-1"
                >
                  <span className="truncate max-w-[120px]">{u}</span>
                  <button
                    type="button"
                    className="text-red-600"
                    onClick={() =>
                      setOtherUrls((o) => o.filter((_, j) => j !== i))
                    }
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Short description ({langTab})
            </label>
            <textarea
              value={descByLang[langTab] || ''}
              onChange={(e) =>
                setDescByLang((p) => ({ ...p, [langTab]: e.target.value }))
              }
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add machine'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border rounded-lg text-sm"
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-xs text-gray-600">Filter English name</label>
            <input
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="border rounded px-2 py-1 text-sm w-44"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Filter company</label>
            <input
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="border rounded px-2 py-1 text-sm w-44"
            />
          </div>
          <button
            type="button"
            onClick={applyFilters}
            className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-sm"
          >
            Apply
          </button>
        </div>
        {sortControl}
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            type="button"
            onClick={() => setDisplayMode('grid')}
            className={`px-3 py-1.5 text-sm flex items-center gap-1 ${
              displayMode === 'grid'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Grid
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('label')}
            className={`px-3 py-1.5 text-sm flex items-center gap-1 border-l border-gray-300 ${
              displayMode === 'label'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700'
            }`}
          >
            <Tag className="w-4 h-4" />
            Label
          </button>
        </div>
        <button
          type="button"
          onClick={deleteSelected}
          disabled={selected.size === 0}
          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg disabled:opacity-40"
        >
          Delete selected ({selected.size})
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-center py-12">Loading…</p>
      ) : displayMode === 'grid' ? (
        <div className="overflow-x-auto border rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-900 border-b dark:border-gray-700">
                <th className="p-2 w-10" />
                <th className="p-2 text-left">Company</th>
                <th className="p-2 text-left">Original</th>
                <th className="p-2 text-left">English</th>
                <th className="p-2 text-left">Main area</th>
                <th className="p-2 text-left">Code</th>
                <th className="p-2 text-left">Pictures</th>
                <th className="p-2 text-left min-w-[200px]">
                  Description ({descLang.toUpperCase()})
                </th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {machines.map((m) => (
                <tr
                  key={m.id}
                  className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/40 align-top"
                >
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selected.has(m.id)}
                      onChange={() => toggleSel(m.id)}
                    />
                  </td>
                  <td className="p-2 font-medium">{m.companyName}</td>
                  <td className="p-2">{m.originalName}</td>
                  <td className="p-2">{m.nameEnglish}</td>
                  <td className="p-2">{m.mainArea}</td>
                  <td className="p-2 font-mono text-xs">{m.code}</td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      {m.pictureAUrl ? (
                        <div className="relative w-12 h-12 rounded border overflow-hidden">
                          <Image
                            src={m.pictureAUrl}
                            alt="A"
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                      {m.pictureBUrl ? (
                        <div className="relative w-12 h-12 rounded border overflow-hidden">
                          <Image
                            src={m.pictureBUrl}
                            alt="B"
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-2 text-xs text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-gray-600">
                    {descriptionFor(m) || '—'}
                  </td>
                  <td className="p-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => startEdit(m)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Pencil className="w-4 h-4 inline" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteOne(m.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {machines.length === 0 && (
            <div className="p-12 text-center text-gray-500">No machines yet.</div>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {machines.map((m) => (
            <li
              key={m.id}
              className="border rounded-xl p-4 bg-white dark:bg-gray-800 dark:border-gray-700 flex flex-col gap-2"
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selected.has(m.id)}
                  onChange={() => toggleSel(m.id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {m.nameEnglish || m.originalName}
                  </p>
                  <p className="text-xs text-gray-500">{m.companyName}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {m.originalName} · {m.mainArea} ·{' '}
                    <span className="font-mono">{m.code}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {m.pictureAUrl ? (
                  <div className="relative w-20 h-20 rounded border overflow-hidden">
                    <Image
                      src={m.pictureAUrl}
                      alt="A"
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : null}
                {m.pictureBUrl ? (
                  <div className="relative w-20 h-20 rounded border overflow-hidden">
                    <Image
                      src={m.pictureBUrl}
                      alt="B"
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : null}
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-gray-600 pt-2 mt-auto">
                {descriptionFor(m) || '—'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(m)}
                  className="flex-1 py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded-lg"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteOne(m.id)}
                  className="flex-1 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
