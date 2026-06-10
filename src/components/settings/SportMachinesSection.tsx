'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutGrid,
  Tag,
  Trash2,
  Pencil,
  Plus,
  Upload,
  Dumbbell,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  parseJsonRecord,
  parseStringArrayJson,
  parseMachineRichSections,
  type MachineRichSections,
} from '@/lib/sportMachineHelpers';
import { resolvePublicMediaUrl } from '@/lib/publicMediaUrl';
import {
  SUPPORTED_LANGUAGES,
  supportedLanguagesPeriodAdminOrder,
} from '@/constants/tools.constants';
import { SECTION_EXERCISE_MUSCLE_GROUPS } from '@/constants/sectionExercise.constants';
import MachineRichTextPanel, {
  type MachineRichTabId,
  MACHINE_RICH_TABS,
} from '@/components/settings/MachineRichTextPanel';
import { getAuthToken, getAuthHeaders, getJsonAuthHeaders } from '@/utils/auth.utils';

function MachineMediaImage({
  src,
  alt,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const resolved = resolvePublicMediaUrl(src);
  if (!resolved) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolved} alt={alt} className={className} />
  );
}

function getLangText(
  rec: Record<string, string> | undefined,
  lang: string,
  fallbackEn?: string
): string {
  const v = (rec?.[lang] || '').trim();
  if (v) return v;
  if (lang !== 'en' && fallbackEn) return fallbackEn;
  return (rec?.en || '').trim();
}

function stripHtmlForPreview(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function machinePrimaryPictures(m: MachineRow): string[] {
  return [m.pictureAUrl, m.pictureBUrl].filter(
    (u): u is string => typeof u === 'string' && u.trim().length > 0
  );
}

function machineCatalogPictures(m: MachineRow): string[] {
  return parseStringArrayJson(m.otherPicturesJson);
}

function getMachineSectionText(
  m: MachineRow,
  section: MachineRichTabId,
  lang: string
): string {
  if (section === 'description') {
    return getLangText(parseJsonRecord(m.descriptionByLanguage), lang);
  }
  const sections = parseMachineRichSections(m.richSectionsJson);
  return getLangText(sections[section], lang);
}

function resolveMachineVideoEmbed(
  url: string | null | undefined
): { kind: 'iframe' | 'video'; src: string } | null {
  const u = (url || '').trim();
  if (!u) return null;
  const yt = u.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i
  );
  if (yt?.[1]) {
    return { kind: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}` };
  }
  if (u.startsWith('data:') || u.startsWith('http')) {
    return { kind: 'video', src: u };
  }
  return null;
}

function MachinePictureLightbox({
  urls,
  startIndex,
  labels,
  onClose,
}: {
  urls: string[];
  startIndex: number;
  labels: string[];
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(
    Math.min(Math.max(0, startIndex), Math.max(0, urls.length - 1))
  );

  useEffect(() => {
    if (urls.length <= 1) return;
    const timer = window.setInterval(() => {
      setIdx((i) => (i + 1) % urls.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [urls.length]);

  if (urls.length === 0) return null;
  const cur = urls[idx];
  const label = labels[idx] || `Picture ${idx + 1}`;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-xl bg-white p-4 shadow-2xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{label}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative flex h-[min(70vh,520px)] w-full items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
          <MachineMediaImage
            src={cur}
            alt={label}
            className="max-h-full max-w-full object-contain"
          />
          {urls.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous picture"
                onClick={() => setIdx((i) => (i - 1 + urls.length) % urls.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next picture"
                onClick={() => setIdx((i) => (i + 1) % urls.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
        {urls.length > 1 && (
          <p className="mt-2 text-center text-xs text-gray-500">
            {idx + 1} / {urls.length} · auto-advance every 3s
          </p>
        )}
      </div>
    </div>
  );
}

function MachineVideoModal({
  machine,
  onClose,
}: {
  machine: MachineRow;
  onClose: () => void;
}) {
  const embed = resolveMachineVideoEmbed(machine.videoUrl);
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-xl bg-black p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-white truncate">
            {machine.nameEnglish || machine.originalName}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {embed ? (
          embed.kind === 'iframe' ? (
            <iframe
              src={embed.src}
              title="Machine video"
              className="aspect-video w-full rounded-lg bg-black"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              src={embed.src}
              controls
              className="max-h-[70vh] w-full rounded-lg bg-black"
              playsInline
            >
              <track kind="captions" />
            </video>
          )
        ) : (
          <p className="py-12 text-center text-white">No video URL for this machine.</p>
        )}
      </div>
    </div>
  );
}

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
  richSectionsJson: string | null;
  sportMachineCompanyId: string | null;
};

function emptyRichSections(): MachineRichSections {
  return {
    machineTypes: {},
    musclesPositioning: {},
    correctExecution: {},
    criticalMistakes: {},
  };
}

function PictureField({
  label,
  value,
  onChange,
  onUpload,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  onUpload: (file: File) => Promise<void>;
}) {
  const [urlDraft, setUrlDraft] = useState(value || '');

  useEffect(() => {
    setUrlDraft(value || '');
  }, [value]);

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="flex flex-wrap items-start gap-2">
        <label className="inline-flex items-center gap-1 px-2 py-1 border rounded cursor-pointer text-sm shrink-0">
          <Upload className="w-4 h-4" />
          Upload
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              await onUpload(f);
              e.target.value = '';
            }}
          />
        </label>
        <input
          type="url"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          placeholder="Or paste image URL"
          className="flex-1 min-w-[160px] border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:text-white"
        />
        <button
          type="button"
          onClick={() => onChange(urlDraft.trim() || null)}
          className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-sm shrink-0"
        >
          Apply URL
        </button>
        {value && (
          <div className="h-16 w-16 rounded border overflow-hidden shrink-0">
            <MachineMediaImage
              src={value}
              alt={`${label} preview`}
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function SportMachinesSection() {
  const { currentLanguage } = useLanguage();
  const [machines, setMachines] = useState<MachineRow[]>([]);
  const [companies, setCompanies] = useState<CompanyOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayMode, setDisplayMode] = useState<'grid' | 'label'>('grid');
  const [showMachineForm, setShowMachineForm] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [detailLang, setDetailLang] = useState(currentLanguage || 'en');
  const [detailSectionTab, setDetailSectionTab] = useState<MachineRichTabId>('description');
  const [pictureLightbox, setPictureLightbox] = useState<{
    urls: string[];
    labels: string[];
    startIndex: number;
  } | null>(null);
  const [videoMachine, setVideoMachine] = useState<MachineRow | null>(null);

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
  const [secondaryAreas, setSecondaryAreas] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [pictureAUrl, setPictureAUrl] = useState<string | null>(null);
  const [pictureBUrl, setPictureBUrl] = useState<string | null>(null);
  const [otherUrls, setOtherUrls] = useState<string[]>([]);
  const [newCatalogUrl, setNewCatalogUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [descByLang, setDescByLang] = useState<Record<string, string>>({});
  const [richSections, setRichSections] = useState<MachineRichSections>(() =>
    emptyRichSections()
  );
  const [richTab, setRichTab] = useState<MachineRichTabId>('machineTypes');

  const nameLanguages = useMemo(() => supportedLanguagesPeriodAdminOrder(), []);

  const loadCompanies = useCallback(async () => {
    const res = await fetch('/api/workouts/machine-companies-catalog', {
      headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
      headers: getAuthHeaders(),
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
    setSecondaryAreas([]);
    setCode('');
    setPictureAUrl(null);
    setPictureBUrl(null);
    setOtherUrls([]);
    setNewCatalogUrl('');
    setVideoUrl('');
    setDescByLang({});
    setRichSections(emptyRichSections());
    setRichTab('machineTypes');
  };

  const toggleSecondaryArea = (area: string) => {
    setSecondaryAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const getRichMapForTab = (tab: MachineRichTabId): Record<string, string> => {
    if (tab === 'description') return descByLang;
    return richSections[tab] || {};
  };

  const setRichMapForTab = (
    tab: MachineRichTabId,
    lang: string,
    html: string
  ) => {
    if (tab === 'description') {
      setDescByLang((p) => ({ ...p, [lang]: html }));
      return;
    }
    setRichSections((prev) => ({
      ...prev,
      [tab]: { ...(prev[tab] || {}), [lang]: html },
    }));
  };

  const startEdit = (m: MachineRow) => {
    setShowMachineForm(true);
    setEditingId(m.id);
    setCompanyId(m.sportMachineCompanyId || '');
    setCompanyName(m.companyName);
    setOriginalName(m.originalName);
    setNamesByLang(parseJsonRecord(m.nameByLanguage));
    setMainArea(m.mainArea);
    setSecondaryAreas(parseStringArrayJson(m.secondaryAreasJson));
    setCode(m.code);
    setPictureAUrl(m.pictureAUrl);
    setPictureBUrl(m.pictureBUrl);
    setOtherUrls(parseStringArrayJson(m.otherPicturesJson));
    setVideoUrl(m.videoUrl || '');
    setDescByLang(parseJsonRecord(m.descriptionByLanguage));
    const parsed = parseMachineRichSections(m.richSectionsJson);
    setRichSections({
      ...emptyRichSections(),
      ...parsed,
    });
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
    if (!getAuthToken()) {
      alert(
        'Cannot save: you are not authenticated.\n\n' +
          'Sign in as a normal user (token saved) or as Super Admin (admin token saved), then try again.\n\n' +
          'The Machines API requires a Bearer token in the request.'
      );
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
        secondaryAreas,
        code: code.trim(),
        pictureAUrl,
        pictureBUrl,
        otherPictures: otherUrls,
        videoUrl: videoUrl.trim() || null,
        descriptionByLanguage: descByLang,
        richSectionsJson: richSections,
      };
      if (editingId) {
        const res = await fetch(`/api/workouts/sport-machines/${editingId}`, {
          method: 'PATCH',
          headers: getJsonAuthHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const msg = typeof err.error === 'string' ? err.error : `Update failed (${res.status})`;
          if (res.status === 401 && msg === 'Unauthorized') {
            alert(
              'Unauthorized: the request had no valid login token.\n\n' +
                'Sign in again, or open Super Admin login so adminToken is stored. Expired sessions also return 401 (try signing in again).'
            );
            return;
          }
          alert(msg);
          return;
        }
      } else {
        const res = await fetch('/api/workouts/sport-machines', {
          method: 'POST',
          headers: getJsonAuthHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const msg = typeof err.error === 'string' ? err.error : `Create failed (${res.status})`;
          if (res.status === 401 && msg === 'Unauthorized') {
            alert(
              'Unauthorized: the request had no valid login token.\n\n' +
                'Sign in again, or open Super Admin login so adminToken is stored. Expired sessions also return 401 (try signing in again).'
            );
            return;
          }
          alert(msg);
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
      headers: getAuthHeaders(),
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
      headers: getJsonAuthHeaders(),
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

  const detailMachine = useMemo(
    () => machines.find((m) => m.id === selectedMachineId) || null,
    [machines, selectedMachineId]
  );

  const openPrimaryPictures = (m: MachineRow, startIndex: number) => {
    const urls = machinePrimaryPictures(m);
    if (urls.length === 0) return;
    const labels: string[] = [];
    if (m.pictureAUrl) labels.push('Picture A');
    if (m.pictureBUrl) labels.push('Picture B');
    setPictureLightbox({
      urls,
      labels,
      startIndex: Math.min(startIndex, urls.length - 1),
    });
  };

  const openMachineVideo = (m: MachineRow) => {
    if (!m.videoUrl?.trim()) {
      alert('No video URL linked to this machine.');
      return;
    }
    setVideoMachine(m);
  };

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
      </div>
    ),
    [sortBy, sortDir]
  );

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-indigo-600" />
            Sport instruments — Machines
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Catalog machines with company, multilingual names and descriptions, areas, codes,
            photos, and video. Companies list comes from Super Admin catalog when available.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowMachineForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-100 shrink-0"
        >
          {showMachineForm ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Hide input section
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show input section
            </>
          )}
        </button>
      </div>

      {showMachineForm && (
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 p-6 space-y-6 bg-white dark:bg-gray-800 dark:border-gray-700"
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
            {companies.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">
                No factories in catalog yet — add them under Equipment factories (Super Admin).
              </p>
            )}
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
          <div className="md:col-span-2 rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wide text-indigo-900">
              Names by language
            </label>
            <div className="flex flex-wrap gap-2">
              {nameLanguages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLangTab(lang.code)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition ${
                    langTab === lang.code
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200'
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
            <label className="block text-xs font-medium text-gray-600">
              Name ({nameLanguages.find((l) => l.code === langTab)?.name || langTab})
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
            <select
              value={mainArea}
              onChange={(e) => {
                const next = e.target.value;
                setMainArea(next);
                if (next) {
                  setSecondaryAreas((prev) => prev.filter((a) => a !== next));
                }
              }}
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              required
            >
              <option value="">— Select main area —</option>
              {mainArea &&
                !(SECTION_EXERCISE_MUSCLE_GROUPS as readonly string[]).includes(mainArea) && (
                  <option value={mainArea}>{mainArea} (legacy)</option>
                )}
              {SECTION_EXERCISE_MUSCLE_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Other areas
            </label>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600 p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
              {SECTION_EXERCISE_MUSCLE_GROUPS.filter((g) => g !== mainArea).map((g) => (
                <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={secondaryAreas.includes(g)}
                    onChange={() => toggleSecondaryArea(g)}
                    className="rounded border-gray-300"
                  />
                  <span>{g}</span>
                </label>
              ))}
            </div>
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

          <PictureField
            label="Picture A"
            value={pictureAUrl}
            onChange={setPictureAUrl}
            onUpload={async (f) => {
              const p = await uploadAsset(f, 'picture-a');
              if (p) setPictureAUrl(p);
            }}
          />
          <PictureField
            label="Picture B"
            value={pictureBUrl}
            onChange={setPictureBUrl}
            onUpload={async (f) => {
              const p = await uploadAsset(f, 'picture-b');
              if (p) setPictureBUrl(p);
            }}
          />

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
                    e.target.value = '';
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
            {otherUrls.length > 0 && (
              <div className="overflow-x-auto pb-2 -mx-1 px-1">
                <ul className="flex gap-3 flex-nowrap min-w-min">
                  {otherUrls.map((u, i) => (
                    <li
                      key={`${u}-${i}`}
                      className="relative shrink-0 w-24 flex flex-col items-center gap-1"
                    >
                      <div className="h-20 w-20 rounded-lg border overflow-hidden bg-gray-50">
                        <MachineMediaImage
                          src={u}
                          alt={`Catalog ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        className="text-xs text-red-600 font-medium"
                        onClick={() =>
                          setOtherUrls((o) => o.filter((_, j) => j !== i))
                        }
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <MachineRichTextPanel
          activeTab={richTab}
          onTabChange={setRichTab}
          getValue={(code) => getRichMapForTab(richTab)[code] || ''}
          setValue={(code, html) => setRichMapForTab(richTab, code, html)}
        />

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
      )}

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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 overflow-x-auto border rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700">
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
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {machines.map((m) => {
                  const isRowSelected = selectedMachineId === m.id;
                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMachineId(m.id)}
                      className={`border-b dark:border-gray-700 align-top cursor-pointer transition ${
                        isRowSelected
                          ? 'bg-indigo-50/90 ring-1 ring-inset ring-indigo-300 dark:bg-indigo-950/30'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900/40'
                      }`}
                    >
                      <td className="p-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(m.id)}
                          onChange={() => toggleSel(m.id)}
                        />
                      </td>
                      <td className="p-2 font-medium">{m.companyName}</td>
                      <td className="p-2">{m.originalName}</td>
                      <td className="p-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMachineId(m.id);
                            openMachineVideo(m);
                          }}
                          className={`text-left font-medium hover:underline ${
                            m.videoUrl?.trim()
                              ? 'text-blue-700 dark:text-blue-400'
                              : 'text-gray-900 dark:text-gray-100 cursor-default hover:no-underline'
                          }`}
                          title={
                            m.videoUrl?.trim()
                              ? 'Open linked video'
                              : 'No video URL'
                          }
                        >
                          {m.nameEnglish || m.originalName}
                        </button>
                      </td>
                      <td className="p-2">{m.mainArea}</td>
                      <td className="p-2 font-mono text-xs">{m.code}</td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          {m.pictureAUrl ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMachineId(m.id);
                                openPrimaryPictures(m, 0);
                              }}
                              className="w-12 h-12 rounded border overflow-hidden hover:ring-2 hover:ring-indigo-400"
                              title="Picture A — enlarge"
                            >
                              <MachineMediaImage
                                src={m.pictureAUrl}
                                alt="A"
                                className="h-full w-full object-cover"
                              />
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                          {m.pictureBUrl ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMachineId(m.id);
                                openPrimaryPictures(m, m.pictureAUrl ? 1 : 0);
                              }}
                              className="w-12 h-12 rounded border overflow-hidden hover:ring-2 hover:ring-indigo-400"
                              title="Picture B — enlarge"
                            >
                              <MachineMediaImage
                                src={m.pictureBUrl}
                                alt="B"
                                className="h-full w-full object-cover"
                              />
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td
                        className="p-2 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
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
                  );
                })}
              </tbody>
            </table>
            {machines.length === 0 && (
              <div className="p-12 text-center text-gray-500">No machines yet.</div>
            )}
          </div>

          <aside className="w-full shrink-0 rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40 lg:w-[380px] xl:w-[420px]">
            <div className="border-b bg-white px-3 py-2 dark:bg-gray-800 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Details machine selected
              </h3>
              <label className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                Detail language
                <select
                  value={detailLang}
                  onChange={(e) => setDetailLang(e.target.value)}
                  className="rounded border px-2 py-1 text-xs dark:bg-gray-700 dark:text-white"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name} ({l.code.toUpperCase()})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="max-h-[min(70vh,560px)] space-y-4 overflow-y-auto p-3 text-sm">
              {!detailMachine ? (
                <p className="text-gray-500">
                  Select a row. Description and catalog pictures appear here; click picture A/B
                  in the grid for a larger carousel view, or the machine name to play the video.
                </p>
              ) : (
                <>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {getLangText(parseJsonRecord(detailMachine.nameByLanguage), detailLang) ||
                      detailMachine.nameEnglish ||
                      detailMachine.originalName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {detailMachine.companyName} · {detailMachine.code}
                  </p>

                  <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-2 dark:border-gray-600">
                    {MACHINE_RICH_TABS.map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setDetailSectionTab(id)}
                        className={`rounded-lg px-2 py-1 text-[10px] font-semibold sm:text-xs ${
                          detailSectionTab === id
                            ? 'bg-gray-900 text-white dark:bg-indigo-600'
                            : 'bg-gray-100 text-gray-800 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <section>
                    <h4 className="text-xs font-bold uppercase text-indigo-800 dark:text-indigo-300">
                      {MACHINE_RICH_TABS.find((t) => t.id === detailSectionTab)?.label}
                    </h4>
                    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded border bg-white p-2 text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600">
                      {stripHtmlForPreview(
                        getMachineSectionText(detailMachine, detailSectionTab, detailLang)
                      ) || '—'}
                    </pre>
                  </section>

                  <section className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                      Video
                    </h4>
                    <div className="mt-2">
                      {detailMachine.videoUrl?.trim() ? (
                        <button
                          type="button"
                          onClick={() => openMachineVideo(detailMachine)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                        >
                          <Play className="h-3.5 w-3.5" aria-hidden />
                          Play video
                        </button>
                      ) : (
                        <p className="text-xs text-gray-500">No video URL on this machine.</p>
                      )}
                    </div>
                  </section>

                  <section className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                      Catalog pictures
                    </h4>
                    {(() => {
                      const catalog = machineCatalogPictures(detailMachine);
                      if (catalog.length === 0) {
                        return (
                          <p className="mt-2 text-xs text-gray-500">
                            No extra catalog images. Add them in the form under &quot;Other
                            pictures&quot;.
                          </p>
                        );
                      }
                      return (
                        <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
                          {catalog.map((url, i) => (
                            <button
                              key={`${url}-${i}`}
                              type="button"
                              onClick={() =>
                                setPictureLightbox({
                                  urls: catalog,
                                  labels: catalog.map((_, j) => `Catalog ${j + 1}`),
                                  startIndex: i,
                                })
                              }
                              className="flex w-full items-center gap-2 rounded-lg border border-gray-200 p-1 hover:ring-2 hover:ring-indigo-300 dark:border-gray-600"
                            >
                              <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-gray-100">
                                <MachineMediaImage
                                  src={url}
                                  alt={`Catalog ${i + 1}`}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <span className="truncate text-[10px] text-gray-500">{url}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </section>
                </>
              )}
            </div>
          </aside>

          {pictureLightbox && (
            <MachinePictureLightbox
              urls={pictureLightbox.urls}
              labels={pictureLightbox.labels}
              startIndex={pictureLightbox.startIndex}
              onClose={() => setPictureLightbox(null)}
            />
          )}
          {videoMachine && (
            <MachineVideoModal machine={videoMachine} onClose={() => setVideoMachine(null)} />
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
                  <div className="w-20 h-20 rounded border overflow-hidden">
                    <MachineMediaImage
                      src={m.pictureAUrl}
                      alt="A"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}
                {m.pictureBUrl ? (
                  <div className="w-20 h-20 rounded border overflow-hidden">
                    <MachineMediaImage
                      src={m.pictureBUrl}
                      alt="B"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-gray-600 pt-2 mt-auto">
                {stripHtmlForPreview(
                  getMachineSectionText(m, 'description', detailLang)
                ) || '—'}
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
