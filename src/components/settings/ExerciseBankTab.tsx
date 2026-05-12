'use client';

// Exercise bank grid — column order, filters, bulk actions: cross-check with `src/constants/exerciseEditorLayoutReference.ts` wireframe list view.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit2,
  GripVertical,
  Heart,
  LayoutGrid,
  Library,
  Play,
  Plus,
  AlignJustify,
  Trash2,
  X,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Exercise, ExercisePathologyCatalogItem, Sport } from '@/constants/tools.constants';
import {
  SUPPORTED_LANGUAGES,
  mergeExerciseWithDefaults,
  finalizeExerciseForStorage,
  normalizeMuscleAreaPercentTags,
  normalizeExerciseFaqs,
  exerciseFaqEntryHasContent,
  resolveExerciseOfficialVideoSrc,
  exerciseHasAnyOfficialVideo,
} from '@/constants/tools.constants';
import {
  SECTION_EXERCISE_EQUIPMENT_TYPES,
  SECTION_EXERCISE_MUSCLE_GROUPS,
  SECTION_EXERCISE_SHARED_BY,
  SECTION_EXERCISE_TYPOLOGY_OPTIONS,
} from '@/constants/sectionExercise.constants';

const LS_COLUMNS = 'movesbook-exercise-bank-column-order';
const LS_FAV_IDS = 'movesbook-exercise-favourite-ids';
const LS_FAV_GROUPS = 'movesbook-exercise-favourite-groups';

export const EXERCISE_BANK_COLUMN_IDS = [
  'select',
  'typology',
  'sports',
  'pathologies',
  'equipment',
  'name',
  'pictures',
  'mainMuscle',
  'secondaryMuscles',
  'options',
] as const;
export type ExerciseBankColumnId = (typeof EXERCISE_BANK_COLUMN_IDS)[number];

const DEFAULT_COLUMN_ORDER: ExerciseBankColumnId[] = [...EXERCISE_BANK_COLUMN_IDS];

const COL_TEMPLATE: Record<ExerciseBankColumnId, string> = {
  select: '44px',
  typology: 'minmax(96px,1fr)',
  sports: 'minmax(88px, 1fr)',
  pathologies: 'minmax(88px, 1fr)',
  equipment: 'minmax(100px,1.1fr)',
  name: 'minmax(140px,1.4fr)',
  pictures: 'minmax(120px,1.2fr)',
  mainMuscle: 'minmax(100px,1fr)',
  secondaryMuscles: '84px',
  options: 'minmax(150px,1fr)',
};

const COLUMN_LABEL: Record<ExerciseBankColumnId, string> = {
  select: '',
  typology: 'Typology',
  sports: 'Sports',
  pathologies: 'Pathologies',
  equipment: 'Equipments',
  name: 'Original name',
  pictures: 'Pictures',
  mainMuscle: 'Main area',
  secondaryMuscles: 'Other areas',
  options: 'Actions',
};

function loadColumnOrder(): ExerciseBankColumnId[] {
  if (typeof window === 'undefined') return DEFAULT_COLUMN_ORDER;
  try {
    const raw = localStorage.getItem(LS_COLUMNS);
    if (!raw) return DEFAULT_COLUMN_ORDER;
    const parsed = JSON.parse(raw) as string[];
    const valid = new Set(EXERCISE_BANK_COLUMN_IDS);
    const next = parsed.filter((x): x is ExerciseBankColumnId => valid.has(x as ExerciseBankColumnId));
    if (next.length !== EXERCISE_BANK_COLUMN_IDS.length) return DEFAULT_COLUMN_ORDER;
    const rest = next.filter((c) => c !== 'select');
    return ['select', ...rest] as ExerciseBankColumnId[];
  } catch {
    return DEFAULT_COLUMN_ORDER;
  }
}

function loadFavouriteIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(LS_FAV_IDS);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveFavouriteIds(ids: Set<string>) {
  localStorage.setItem(LS_FAV_IDS, JSON.stringify(Array.from(ids)));
}

type FavouriteGroup = { id: string; name: string; exerciseIds: string[] };

function loadFavouriteGroups(): FavouriteGroup[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_FAV_GROUPS);
    if (!raw) return [];
    const arr = JSON.parse(raw) as FavouriteGroup[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveFavouriteGroups(groups: FavouriteGroup[]) {
  localStorage.setItem(LS_FAV_GROUPS, JSON.stringify(groups));
}

function getExerciseNameForLang(ex: Exercise, lang: string): string {
  const m = mergeExerciseWithDefaults(ex);
  if (lang === 'en') return (m.name || '').trim();
  return ((m.nameByLanguage || {})[lang] || '').trim() || (m.name || '').trim();
}

function getTypology(ex: Exercise): string {
  const m = mergeExerciseWithDefaults(ex);
  return (m.typology || m.category || '').trim() || '—';
}

function getMainMuscle(ex: Exercise): string {
  const m = mergeExerciseWithDefaults(ex);
  const tags = normalizeMuscleAreaPercentTags(m.muscleAreaPercentTags || []);
  const main = tags.find((t) => t.isMain && (t.area || '').trim());
  if (main?.area) return main.area.trim();
  return (m.mainMuscleGroup || m.muscleGroups?.[0] || '').trim() || '—';
}

function getSecondaryMuscles(ex: Exercise): string[] {
  const m = mergeExerciseWithDefaults(ex);
  const tags = normalizeMuscleAreaPercentTags(m.muscleAreaPercentTags || []);
  const main = getMainMuscle(ex);
  const fromTags = tags
    .filter((t) => (t.area || '').trim() && t.area.trim() !== main)
    .map((t) => t.area.trim());
  if (fromTags.length) return fromTags;
  const sec = (m.secondaryMuscleGroups || []).filter((s) => s && s !== main);
  if (sec.length) return sec;
  const mg = (m.muscleGroups || []).filter((s) => s && s !== main);
  return mg;
}

function pathologyLabelsForExercise(ex: Exercise, catalog: ExercisePathologyCatalogItem[]): string[] {
  const m = mergeExerciseWithDefaults(ex);
  const byId = new Map(catalog.map((p) => [p.id, (p.name || '').trim() || p.id]));
  return (m.contraindicatedPathologyIds || []).map((id) => byId.get(id) || id);
}

function getLangText(rec: Record<string, string> | undefined, lang: string, fallbackEn?: string): string {
  const v = (rec?.[lang] || '').trim();
  if (v) return v;
  if (lang !== 'en' && fallbackEn) return fallbackEn;
  return (rec?.en || '').trim();
}

/** Preview rich-text fields in the bank without rendering HTML. */
function stripHtmlForPreview(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

type CatalogScope = 'official_and_shared' | 'movesbook_official' | 'authorized_shared';

const AUTHORIZED_SHARED_VALUES = new Set(['COACH', 'TEAM_TRAINER', 'CLUB_TRAINER', 'SINGLE_USER']);

function matchesCatalogScope(ex: Exercise, scope: CatalogScope): boolean {
  const sb = (mergeExerciseWithDefaults(ex).sharedBy || '').trim();
  if (scope === 'movesbook_official') return sb === 'MOVESBOOK';
  if (scope === 'authorized_shared') return AUTHORIZED_SHARED_VALUES.has(sb);
  /** Official & shared: full catalog (no scope filter). */
  return true;
}

type GridCatalogTab = 'catalog' | 'execution' | 'suggestions' | 'breathing' | 'mistakes' | 'faqs';

function collectExercisePictureUrls(ex: Exercise): string[] {
  const m = mergeExerciseWithDefaults(ex);
  return [m.pictureAMale, m.pictureAFemale, m.pictureBMale, m.pictureBFemale].filter(
    (u): u is string => typeof u === 'string' && u.trim().length > 0
  );
}

function ExecThumb({ url, label, mini }: { url?: string; label: string; mini: boolean }) {
  const [err, setErr] = useState(false);
  const h = mini ? 'h-8 w-11' : 'h-12 w-16';
  if (!url?.trim() || err) {
    return (
      <div
        className={`${h} flex shrink-0 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-100 text-[8px] font-medium text-gray-500`}
      >
        {label}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className={`${h} shrink-0 rounded border border-gray-200 object-cover`}
      onError={() => setErr(true)}
    />
  );
}

function SortableColumnHeader({
  id,
  label,
  onSelectAll,
  selectAllChecked,
  selectAllIndeterminate,
}: {
  id: ExerciseBankColumnId;
  label: string;
  onSelectAll?: () => void;
  selectAllChecked?: boolean;
  selectAllIndeterminate?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: id === 'select',
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };
  if (id === 'select') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center justify-center border-b border-gray-200 bg-gray-50 px-1 py-2"
      >
        <input
          type="checkbox"
          checked={!!selectAllChecked}
          ref={(el) => {
            if (el) el.indeterminate = !!selectAllIndeterminate;
          }}
          onChange={onSelectAll}
          aria-label="Select all on page"
        />
      </div>
    );
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-gray-600"
    >
      <button
        type="button"
        className="touch-none rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
        aria-label={`Move column ${label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}

function PopoverList({
  title,
  items,
  onClose,
}: {
  title: string;
  items: string[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="max-h-[70vh] w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h4 className="text-sm font-bold text-gray-900">{title}</h4>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-gray-100" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="max-h-56 list-disc space-y-1 overflow-y-auto px-6 py-3 text-sm text-gray-800">
          {items.length === 0 ? <li className="list-none text-gray-500">None</li> : items.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>
    </div>
  );
}

function ExerciseQuickViewModal({
  exercise,
  lang,
  onClose,
  onEdit,
  onPlayOfficialVideo,
}: {
  exercise: Exercise;
  lang: string;
  onClose: () => void;
  onEdit: () => void;
  onPlayOfficialVideo?: (exercise: Exercise, sex: 'male' | 'female') => void;
}) {
  const ex = mergeExerciseWithDefaults(exercise);
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const picA = sex === 'male' ? ex.pictureAMale : ex.pictureAFemale;
  const picB = sex === 'male' ? ex.pictureBMale : ex.pictureBFemale;

  const maleVideoSrc =
    (ex.officialVideoDataUrl || '').trim() || (ex.officialVideoUrl || '').trim();
  const femaleVideoSrc =
    (ex.officialVideoDataUrlFemale || '').trim() || (ex.officialVideoUrlFemale || '').trim();

  const exec = getLangText(ex.executionByLanguage, lang, ex.description);
  const expert = getLangText(ex.expertSuggestionsByLanguage, lang, '');
  const breath = getLangText(ex.breathingByLanguage, lang, '');
  const mistakes = getLangText(ex.mistakesByLanguage, lang, '');
  const faqs = normalizeExerciseFaqs(ex.exerciseFaqs).filter(exerciseFaqEntryHasContent);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92vh,880px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{getExerciseNameForLang(ex, lang)}</h3>
            <p className="text-xs text-gray-500">Label details · {lang.toUpperCase()}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Edit exercise
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold hover:bg-gray-50">
              Close
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4">
          <div className="flex flex-wrap gap-2 border-b pb-3">
            <span className="text-xs font-semibold text-gray-600">Pictures</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSex('male')}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${sex === 'male' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
              >
                Male
              </button>
              <button
                type="button"
                onClick={() => setSex('female')}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${sex === 'female' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
              >
                Female
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-bold text-blue-700">Picture A</p>
              <div className="flex justify-center rounded-lg border bg-gray-50 p-2">
                <ExecThumb url={picA} label="A" mini={false} />
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-bold text-blue-700">Picture B</p>
              <div className="flex justify-center rounded-lg border bg-gray-50 p-2">
                <ExecThumb url={picB} label="B" mini={false} />
              </div>
            </div>
          </div>

          {onPlayOfficialVideo && exerciseHasAnyOfficialVideo(ex) ? (
            <div className="flex flex-wrap items-center gap-2 border-b pb-3">
              <span className="text-xs font-semibold text-gray-600">Official video</span>
              <button
                type="button"
                disabled={!maleVideoSrc}
                title={!maleVideoSrc ? 'No male video URL or file set' : undefined}
                onClick={() => onPlayOfficialVideo(ex, 'male')}
                className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Play (male)
              </button>
              <button
                type="button"
                disabled={!femaleVideoSrc}
                title={
                  !femaleVideoSrc
                    ? 'No female video — set URL or file under Official pictures & video (female column)'
                    : undefined
                }
                onClick={() => onPlayOfficialVideo(ex, 'female')}
                className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Play (female)
              </button>
              {!femaleVideoSrc && maleVideoSrc ? (
                <span className="text-[11px] text-gray-500">
                  Female demo optional — uses male only when female is unset.
                </span>
              ) : null}
            </div>
          ) : null}

          <section>
            <h4 className="text-sm font-bold uppercase text-blue-700">2 — How to execute</h4>
            <pre className="mt-1 whitespace-pre-wrap rounded-lg border bg-gray-50 p-3 text-sm text-gray-800">{exec || '—'}</pre>
          </section>
          <section>
            <h4 className="text-sm font-bold uppercase text-blue-700">3 — Expert suggestions</h4>
            <pre className="mt-1 whitespace-pre-wrap rounded-lg border bg-gray-50 p-3 text-sm text-gray-800">{expert || '—'}</pre>
          </section>
          <section>
            <h4 className="text-sm font-bold uppercase text-blue-700">4 — Breathing</h4>
            <pre className="mt-1 whitespace-pre-wrap rounded-lg border bg-gray-50 p-3 text-sm text-gray-800">{breath || '—'}</pre>
          </section>
          <section>
            <h4 className="text-sm font-bold uppercase text-blue-700">5 — Common mistakes</h4>
            <pre className="mt-1 whitespace-pre-wrap rounded-lg border bg-gray-50 p-3 text-sm text-gray-800">{mistakes || '—'}</pre>
          </section>
          <section>
            <h4 className="text-sm font-bold uppercase text-violet-800">6 — FAQs</h4>
            {faqs.length === 0 ? (
              <p className="mt-1 text-sm text-gray-500">No FAQs for this exercise.</p>
            ) : (
              <ol className="mt-2 list-decimal space-y-4 pl-5 text-sm">
                {faqs.map((f) => (
                  <li key={f.id} className="pl-1">
                    <p className="font-semibold text-gray-900">
                      {(f.questionByLanguage?.[lang] || f.questionByLanguage?.en || '').trim() || '—'}
                    </p>
                    <pre className="mt-1 whitespace-pre-wrap text-gray-700">
                      {(f.answerByLanguage?.[lang] || f.answerByLanguage?.en || '').trim() || '—'}
                    </pre>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ExerciseVideoModal({
  exercise,
  sex,
  onClose,
}: {
  exercise: Exercise;
  sex: 'male' | 'female';
  onClose: () => void;
}) {
  const ex = mergeExerciseWithDefaults(exercise);
  const src = resolveExerciseOfficialVideoSrc(ex, sex);
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      onClick={onClose}
    >
      <div className="w-full max-w-3xl rounded-xl bg-black p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex justify-end">
          <button type="button" onClick={onClose} className="rounded bg-white/10 p-2 text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>
        {src ? (
          src.startsWith('data:') || src.startsWith('http') ? (
            <video src={src} controls className="max-h-[70vh] w-full rounded-lg bg-black" playsInline>
              <track kind="captions" />
            </video>
          ) : (
            <p className="text-white">Invalid video URL.</p>
          )
        ) : (
          <p className="text-center text-white">No official video for this exercise.</p>
        )}
      </div>
    </div>
  );
}

type PopoverState =
  | null
  | { kind: 'sports'; exercise: Exercise }
  | { kind: 'pathologies'; exercise: Exercise; labels: string[] }
  | { kind: 'names'; exercise: Exercise }
  | { kind: 'secondaries'; exercise: Exercise };

export type ExerciseBankTabProps = {
  exercises: Exercise[];
  setExercises: React.Dispatch<React.SetStateAction<Exercise[]>>;
  sports: Sport[];
  pathologyCatalog?: ExercisePathologyCatalogItem[];
  onAddExercise: () => void;
  onEditExercise: (exercise: Exercise) => void;
};

export default function ExerciseBankTab({
  exercises,
  setExercises,
  sports,
  pathologyCatalog = [],
  onAddExercise,
  onEditExercise,
}: ExerciseBankTabProps) {
  const { currentLanguage } = useLanguage();
  const [columnOrder, setColumnOrder] = useState<ExerciseBankColumnId[]>(DEFAULT_COLUMN_ORDER);
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(() => new Set());
  const [filterTypology, setFilterTypology] = useState<string>('all');
  const [filterEquipment, setFilterEquipment] = useState<string>('all');
  const [filterSport, setFilterSport] = useState<string>('all');
  const [filterMainArea, setFilterMainArea] = useState<string>('all');
  const [filterSharedBy, setFilterSharedBy] = useState<string>('all');
  const [filterUsername, setFilterUsername] = useState<string>('all');
  const [showDisabled, setShowDisabled] = useState(false);
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [sortMode, setSortMode] = useState<'name' | 'nameArea' | 'nameEquipment'>('name');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showMiniatures, setShowMiniatures] = useState(true);
  const [gridLang, setGridLang] = useState('en');
  const [detailLang, setDetailLang] = useState('en');
  const [catalogScope, setCatalogScope] = useState<CatalogScope>('official_and_shared');
  const [searchDraft, setSearchDraft] = useState('');
  const [bulkOptionsOpen, setBulkOptionsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'label'>('grid');
  const [gridCatalogTab, setGridCatalogTab] = useState<GridCatalogTab>('catalog');
  const [pictureCarouselIdx, setPictureCarouselIdx] = useState(0);
  const bulkMenuRef = useRef<HTMLDivElement | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [popover, setPopover] = useState<PopoverState>(null);
  const [quickView, setQuickView] = useState<Exercise | null>(null);
  const [videoExercise, setVideoExercise] = useState<{
    exercise: Exercise;
    sex: 'male' | 'female';
  } | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setColumnOrder(loadColumnOrder());
    setFavouriteIds(loadFavouriteIds());
  }, []);

  useEffect(() => {
    setSearchDraft(searchName);
  }, [searchName]);

  useEffect(() => {
    setPictureCarouselIdx(0);
  }, [selectedExerciseId]);

  useEffect(() => {
    if (!bulkOptionsOpen) return;
    const close = (ev: MouseEvent) => {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(ev.target as Node)) {
        setBulkOptionsOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [bulkOptionsOpen]);

  /** Align with Settings language (same idea as Sport instruments — Machines). */
  useEffect(() => {
    const raw = (currentLanguage || 'en').toLowerCase().split('-')[0];
    if (SUPPORTED_LANGUAGES.some((l) => l.code === raw)) {
      setGridLang(raw);
      setDetailLang(raw);
    }
  }, [currentLanguage]);

  useEffect(() => {
    localStorage.setItem(LS_COLUMNS, JSON.stringify(columnOrder));
  }, [columnOrder]);

  const usernames = useMemo(() => {
    const s = new Set<string>();
    exercises.forEach((e) => {
      const u = (mergeExerciseWithDefaults(e).sharedByUsername || '').trim();
      if (u) s.add(u);
    });
    return ['all', ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [exercises]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const a = active.id as ExerciseBankColumnId;
    const b = over.id as ExerciseBankColumnId;
    if (a === 'select' || b === 'select') return;
    setColumnOrder((order) => {
      const rest = order.filter((c) => c !== 'select');
      const oldIndex = rest.indexOf(a);
      const newIndex = rest.indexOf(b);
      if (oldIndex < 0 || newIndex < 0) return order;
      const moved = arrayMove(rest, oldIndex, newIndex);
      return ['select', ...moved];
    });
  };

  const filtered = useMemo(() => {
    const q = searchName.trim().toLowerCase();
    return exercises.filter((raw) => {
      const ex = mergeExerciseWithDefaults(raw);
      if (!showDisabled && ex.enabled === false) return false;
      if (favouritesOnly && !favouriteIds.has(ex.id)) return false;
      if (filterTypology !== 'all' && getTypology(ex) !== filterTypology) return false;
      if (filterEquipment !== 'all' && (ex.equipmentType || '') !== filterEquipment) return false;
      if (filterSport !== 'all' && !(ex.sportsIndicated || []).includes(filterSport)) return false;
      if (filterMainArea !== 'all' && getMainMuscle(ex) !== filterMainArea) return false;
      if (filterSharedBy !== 'all' && (ex.sharedBy || '') !== filterSharedBy) return false;
      if (filterUsername !== 'all' && (ex.sharedByUsername || '').trim() !== filterUsername) return false;
      if (!matchesCatalogScope(ex, catalogScope)) return false;
      if (q) {
        const name = getExerciseNameForLang(ex, gridLang).toLowerCase();
        const nameEn = (ex.name || '').toLowerCase();
        if (!name.includes(q) && !nameEn.includes(q)) return false;
      }
      return true;
    });
  }, [
    exercises,
    showDisabled,
    favouritesOnly,
    favouriteIds,
    filterTypology,
    filterEquipment,
    filterSport,
    filterMainArea,
    filterSharedBy,
    filterUsername,
    searchName,
    gridLang,
    catalogScope,
  ]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    const key = (ex: Exercise) => {
      const m = mergeExerciseWithDefaults(ex);
      const name = getExerciseNameForLang(m, gridLang).toLowerCase();
      if (sortMode === 'name') return name;
      if (sortMode === 'nameArea') return `${name} ${getMainMuscle(m).toLowerCase()}`;
      const eq = (m.equipmentType || m.equipment?.[0] || '').toLowerCase();
      return `${name} ${eq}`;
    };
    copy.sort((a, b) => key(a).localeCompare(key(b)));
    return copy;
  }, [filtered, sortMode, gridLang]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageSafe = Math.min(page, pageCount);
  const pageRows = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, pageSafe, pageSize]);

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(1, Math.ceil(sorted.length / pageSize) || 1)));
  }, [sorted.length, pageSize]);

  const selectedExercise = useMemo(() => {
    if (!selectedExerciseId) return null;
    return exercises.find((e) => e.id === selectedExerciseId) ?? null;
  }, [exercises, selectedExerciseId]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllOnPage = () => {
    const ids = pageRows.map((e) => e.id);
    const allOn = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOn) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const tryDeleteExercise = (ex: Exercise) => {
    const m = mergeExerciseWithDefaults(ex);
    const guard = (m.deleteGuardPassword || '').trim();
    if (guard) {
      const p = window.prompt('Enter the creator delete password for this exercise:');
      if (p == null) return;
      if (p !== guard) {
        window.alert('Password does not match.');
        return;
      }
    } else if (!window.confirm(`Delete exercise "${m.name}"?`)) return;
    setExercises((prev) => prev.filter((e) => e.id !== ex.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(ex.id);
      return next;
    });
    setSelectedExerciseId((cur) => (cur === ex.id ? null : cur));
  };

  const duplicateAndEdit = (ex: Exercise) => {
    const m = mergeExerciseWithDefaults(ex);
    const copy = finalizeExerciseForStorage({
      ...m,
      id: `${Date.now()}`,
      name: `${m.name || 'Exercise'} (copy)`,
      deleteGuardPassword: undefined,
    });
    setExercises((prev) => [...prev, copy]);
    onEditExercise(copy);
  };

  const openVideo = (ex: Exercise, sex?: 'male' | 'female') => {
    const m = mergeExerciseWithDefaults(ex);
    const maleSrc = (m.officialVideoDataUrl || '').trim() || (m.officialVideoUrl || '').trim();
    const femaleSrc =
      (m.officialVideoDataUrlFemale || '').trim() || (m.officialVideoUrlFemale || '').trim();
    const resolvedSex =
      sex ?? (maleSrc ? 'male' : femaleSrc ? 'female' : 'male');
    setVideoExercise({ exercise: m, sex: resolvedSex });
  };

  const scheduleRowClick = (ex: Exercise) => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      setSelectedExerciseId(ex.id);
      setQuickView(ex);
    }, 280);
  };

  const onRowDoubleClick = (ex: Exercise) => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    setSelectedExerciseId(ex.id);
    openVideo(ex);
  };

  const gridTemplate = columnOrder.map((id) => COL_TEMPLATE[id]).join(' ');

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((row) => selectedIds.has(mergeExerciseWithDefaults(row).id));
  const somePageSelected = pageRows.some((row) => selectedIds.has(mergeExerciseWithDefaults(row).id));

  const renderCell = (ex: Exercise, colId: ExerciseBankColumnId) => {
    const m = mergeExerciseWithDefaults(ex);
    const disabled = m.enabled === false;
    const fav = favouriteIds.has(m.id);
    switch (colId) {
      case 'select':
        return (
          <div className="flex items-center justify-center py-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={selectedIds.has(m.id)}
              onChange={() => toggleSelect(m.id)}
              className="h-4 w-4 rounded border-gray-300"
              aria-label={`Select ${m.name}`}
            />
          </div>
        );
      case 'typology':
        return (
          <div className={`truncate py-2 text-sm ${disabled ? 'text-red-700' : 'text-gray-800'}`}>{getTypology(m)}</div>
        );
      case 'sports': {
        const n = (m.sportsIndicated || []).length;
        const label = n === 0 ? '—' : `${n} sport${n === 1 ? '' : 's'}`;
        return (
          <button
            type="button"
            className="w-full py-2 text-center text-sm font-semibold text-blue-700 underline-offset-2 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              setPopover({ kind: 'sports', exercise: m });
            }}
          >
            {label}
          </button>
        );
      }
      case 'pathologies': {
        const labels = pathologyLabelsForExercise(m, pathologyCatalog);
        const n = labels.length;
        const label = n === 0 ? '—' : `${n} patholog${n === 1 ? 'y' : 'ies'}`;
        return (
          <button
            type="button"
            className="w-full py-2 text-center text-sm font-semibold text-rose-800 underline-offset-2 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              setPopover({ kind: 'pathologies', exercise: m, labels });
            }}
          >
            {label}
          </button>
        );
      }
      case 'equipment':
        return (
          <div className={`truncate py-2 text-sm ${disabled ? 'text-red-700' : 'text-gray-700'}`}>
            {m.equipmentType || m.equipment?.join(', ') || '—'}
          </div>
        );
      case 'name':
        return (
          <div className={`flex items-start gap-2 py-1 ${viewMode === 'label' ? 'text-xs' : ''}`}>
            {showMiniatures ? (
              <div className="flex shrink-0 gap-0.5" onClick={(e) => e.stopPropagation()} aria-hidden>
                <ExecThumb url={m.pictureAMale || m.pictureAFemale} label="Pic A" mini />
                <ExecThumb url={m.pictureBMale || m.pictureBFemale} label="Pic B" mini />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <button
                type="button"
                className="text-left font-semibold text-gray-900 hover:text-blue-700"
                onClick={(e) => {
                  e.stopPropagation();
                  setPopover({ kind: 'names', exercise: m });
                }}
              >
                {getExerciseNameForLang(m, gridLang)}
              </button>
              {gridLang !== 'en' && (m.name || '').trim() ? (
                <div className="text-[10px] text-gray-500">EN: {m.name}</div>
              ) : null}
            </div>
          </div>
        );
      case 'pictures':
        if (showMiniatures) {
          return (
            <div className="py-2 text-[10px] font-medium text-gray-500" onClick={(e) => e.stopPropagation()}>
              See name column
            </div>
          );
        }
        return (
          <div className="flex flex-wrap items-center justify-center gap-1 py-1" onClick={(e) => e.stopPropagation()}>
            <ExecThumb url={m.pictureAMale} label="A♂" mini />
            <ExecThumb url={m.pictureAFemale} label="A♀" mini />
            <ExecThumb url={m.pictureBMale} label="B♂" mini />
            <ExecThumb url={m.pictureBFemale} label="B♀" mini />
          </div>
        );
      case 'mainMuscle':
        return <div className="truncate py-2 text-sm text-gray-800">{getMainMuscle(m)}</div>;
      case 'secondaryMuscles': {
        const sec = getSecondaryMuscles(m);
        return (
          <button
            type="button"
            className="w-full py-2 text-center text-sm font-semibold text-blue-700 underline-offset-2 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              setPopover({ kind: 'secondaries', exercise: m });
            }}
          >
            {sec.length}
          </button>
        );
      }
      case 'options':
        return (
          <div className="flex flex-wrap items-center justify-end gap-1 py-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              title="Edit"
              className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
              onClick={() => onEditExercise(m)}
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Duplicate and edit"
              className="rounded p-1.5 text-indigo-600 hover:bg-indigo-50"
              onClick={() => duplicateAndEdit(m)}
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Delete"
              className="rounded p-1.5 text-red-600 hover:bg-red-50"
              onClick={() => tryDeleteExercise(m)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Player"
              className="rounded p-1.5 text-emerald-700 hover:bg-emerald-50"
              onClick={() => openVideo(m)}
            >
              <Play className="h-4 w-4" />
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  const bulkDelete = () => {
    if (selectedIds.size === 0) return;
    const selectedList = exercises.filter((e) => selectedIds.has(e.id));
    const guarded = selectedList.filter((e) => (mergeExerciseWithDefaults(e).deleteGuardPassword || '').trim());
    if (guarded.length > 0) {
      const p = window.prompt('One or more selected exercises require the creator delete password. Enter it:');
      if (p == null) return;
      const wrong = guarded.filter((e) => (e.deleteGuardPassword || '').trim() !== p);
      if (wrong.length) {
        window.alert('Password does not match all guarded exercises.');
        return;
      }
    } else if (!window.confirm(`Delete ${selectedIds.size} selected exercise(s)?`)) return;
    setExercises((prev) => prev.filter((e) => !selectedIds.has(e.id)));
    setSelectedIds(new Set());
    setSelectedExerciseId(null);
  };

  const saveSelectionAsFavourite = () => {
    if (selectedIds.size === 0) return;
    const name = window.prompt('Name for this favourite list:');
    if (!name?.trim()) return;
    const groups = loadFavouriteGroups();
    groups.push({ id: `fg-${Date.now()}`, name: name.trim(), exerciseIds: Array.from(selectedIds) });
    saveFavouriteGroups(groups);
    setFavouriteIds((prev) => {
      const next = new Set(prev);
      Array.from(selectedIds).forEach((id) => next.add(id));
      saveFavouriteIds(next);
      return next;
    });
    window.alert(`Saved “${name.trim()}” with ${selectedIds.size} exercise(s). Rows marked as favourites appear in blue.`);
  };

  const detailEx = selectedExercise ? mergeExerciseWithDefaults(selectedExercise) : null;

  return (
    <div className="space-y-4">
      {/* General catalog of exercises — archive + grid (mockup: catalog header + scope + display language). */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-sky-50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Library className="h-7 w-7 shrink-0 text-sky-600" aria-hidden />
              Catalog exercises
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-gray-600">
              Multilingual names, typology, sports, equipment, muscle areas, pictures, video, long-text labels, and FAQs.
              Favourites tint <span className="font-medium text-sky-800">blue</span>; disabled rows can show in{' '}
              <span className="font-medium text-red-700">red</span> when enabled below.
            </p>
          </div>
          <label className="flex shrink-0 flex-col gap-1 text-sm text-gray-700 sm:items-end">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Display language</span>
            <select
              value={gridLang}
              onChange={(e) => {
                const v = e.target.value;
                setGridLang(v);
                setDetailLang(v);
              }}
              className="min-w-[12rem] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.code.toUpperCase()})
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ['movesbook_official', 'Official catalog by Movesbook'],
              ['official_and_shared', 'Official & shared exercises'],
              ['authorized_shared', 'Only shared by authorized users'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCatalogScope(key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                catalogScope === key
                  ? 'bg-gray-900 text-white shadow'
                  : 'bg-white text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onAddExercise}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Exercise
        </button>
        <span className="text-sm text-gray-600">{sorted.length} exercises (filtered)</span>
      </div>

      {/* Row 1 — filters */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-3">
        <select
          value={filterTypology}
          onChange={(e) => setFilterTypology(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="all">Typology — all</option>
          {SECTION_EXERCISE_TYPOLOGY_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={filterEquipment}
          onChange={(e) => setFilterEquipment(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="all">Equipment — all</option>
          {SECTION_EXERCISE_EQUIPMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={filterSport}
          onChange={(e) => setFilterSport(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="all">Sport indicated — all</option>
          {sports.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={filterMainArea}
          onChange={(e) => setFilterMainArea(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="all">Main area — all</option>
          {SECTION_EXERCISE_MUSCLE_GROUPS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={filterSharedBy}
          onChange={(e) => setFilterSharedBy(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="all">Shared by — all</option>
          {SECTION_EXERCISE_SHARED_BY.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={filterUsername}
          onChange={(e) => setFilterUsername(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          {usernames.map((u) => (
            <option key={u} value={u}>
              {u === 'all' ? 'Username — all' : u}
            </option>
          ))}
        </select>
      </div>

      {/* Row 2 — filters + filter name + Apply + sort + options on selected */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={showDisabled} onChange={(e) => setShowDisabled(e.target.checked)} />
          Display disabled
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={favouritesOnly} onChange={(e) => setFavouritesOnly(e.target.checked)} />
          <Heart className="h-3.5 w-3.5 text-rose-500" aria-hidden />
          Display favourites
        </label>
        <div className="flex min-w-[12rem] flex-1 flex-wrap items-center gap-2">
          <input
            type="search"
            placeholder="Filter name…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setSearchName(searchDraft.trim());
                setPage(1);
              }
            }}
            className="min-w-[8rem] flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              setSearchName(searchDraft.trim());
              setPage(1);
            }}
            className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Apply
          </button>
        </div>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="name">Sort: Name A–Z</option>
          <option value="nameArea">Sort: Name + main area</option>
          <option value="nameEquipment">Sort: Name + equipment</option>
        </select>
        <div className="relative" ref={bulkMenuRef}>
          <button
            type="button"
            disabled={selectedIds.size === 0}
            onClick={() => setBulkOptionsOpen((o) => !o)}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Options on selected ({selectedIds.size})
          </button>
          {bulkOptionsOpen && selectedIds.size > 0 ? (
            <div className="absolute right-0 z-40 mt-1 min-w-[14rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                onClick={() => {
                  setSelectedIds(new Set());
                  setBulkOptionsOpen(false);
                }}
              >
                Cancel the selection
              </button>
              <button
                type="button"
                className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                onClick={() => {
                  setBulkOptionsOpen(false);
                  saveSelectionAsFavourite();
                }}
              >
                Save in favourites…
              </button>
              <button
                type="button"
                className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                onClick={() => {
                  setBulkOptionsOpen(false);
                  window.alert('Share flow for selected exercises is not wired yet.');
                }}
              >
                Share these exercises…
              </button>
              <button
                type="button"
                className="block w-full px-4 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                onClick={() => {
                  setBulkOptionsOpen(false);
                  bulkDelete();
                }}
              >
                Delete from archives…
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Row 3 */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
        <span className="text-xs font-semibold text-gray-600">Page</span>
        <button
          type="button"
          disabled={pageSafe <= 1}
          className="rounded border px-2 py-1 text-sm disabled:opacity-40"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Prev
        </button>
        <span className="text-sm text-gray-700">
          {pageSafe} / {pageCount}
        </span>
        <button
          type="button"
          disabled={pageSafe >= pageCount}
          className="rounded border px-2 py-1 text-sm disabled:opacity-40"
          onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
        >
          Next
        </button>
        <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded border px-2 py-1 text-sm">
          <option value={5}>5 / page</option>
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">View</span>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold ${
              viewMode === 'grid' ? 'border-sky-600 bg-sky-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
            title="Grid view"
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            Grid
          </button>
          <button
            type="button"
            onClick={() => setViewMode('label')}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold ${
              viewMode === 'label' ? 'border-sky-600 bg-sky-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
            title="Label view (denser text)"
          >
            <AlignJustify className="h-3.5 w-3.5" aria-hidden />
            Label
          </button>
          <label className="ml-2 flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={showMiniatures} onChange={(e) => setShowMiniatures(e.target.checked)} />
            Miniatures
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-slate-50 px-2 py-2">
            {(
              [
                ['catalog', 'Catalog exercises'],
                ['execution', 'Execution exercise'],
                ['suggestions', 'Suggestions'],
                ['breathing', 'Breathing'],
                ['mistakes', 'Common mistakes'],
                ['faqs', 'FAQs'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setGridCatalogTab(id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  gridCatalogTab === id
                    ? 'bg-gray-900 text-white shadow'
                    : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
              <div
                className="grid min-w-[1020px] border-b border-gray-200"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                {columnOrder.map((colId) => (
                  <SortableColumnHeader
                    key={colId}
                    id={colId}
                    label={COLUMN_LABEL[colId]}
                    onSelectAll={colId === 'select' ? selectAllOnPage : undefined}
                    selectAllChecked={colId === 'select' ? allPageSelected : undefined}
                    selectAllIndeterminate={colId === 'select' ? somePageSelected && !allPageSelected : undefined}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {pageRows.map((raw, rowIdx) => {
            const ex = mergeExerciseWithDefaults(raw);
            const disabled = ex.enabled === false;
            const fav = favouriteIds.has(ex.id);
            const selected = selectedExerciseId === ex.id;
            const zebra = rowIdx % 2 === 1 ? 'bg-emerald-50/45' : 'bg-white';
            return (
              <div
                key={ex.id}
                role="button"
                tabIndex={0}
                onClick={() => scheduleRowClick(raw)}
                onDoubleClick={() => onRowDoubleClick(raw)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    scheduleRowClick(raw);
                  }
                }}
                className={`grid min-w-[1020px] cursor-pointer border-b border-gray-100 transition hover:bg-gray-50/80 ${
                  selected
                    ? 'ring-1 ring-inset ring-amber-400 bg-amber-100/90'
                    : disabled && showDisabled
                      ? 'bg-red-50/80 text-red-900'
                      : fav
                        ? 'bg-sky-50/90 ring-1 ring-inset ring-sky-200'
                        : zebra
                }`}
                style={{ gridTemplateColumns: gridTemplate }}
              >
                {columnOrder.map((colId) => (
                  <div key={`${ex.id}-${colId}`} className="min-w-0 border-r border-gray-100 px-2 last:border-r-0">
                    {renderCell(raw, colId)}
                  </div>
                ))}
              </div>
            );
          })}
          {pageRows.length === 0 && <div className="p-8 text-center text-gray-500">No exercises match the filters.</div>}
        </div>

        {/* Details exercise selected — tab-driven primary + Pictures / Video / Equipment (mockup). */}
        <div className="w-full shrink-0 rounded-xl border border-gray-200 bg-gray-50 lg:w-[380px] xl:w-[420px]">
          <div className="border-b bg-white px-3 py-2">
            <h3 className="text-sm font-bold text-gray-900">Details exercise selected</h3>
            <label className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-700">
              Detail language
              <select
                value={detailLang}
                onChange={(e) => setDetailLang(e.target.value)}
                className="rounded border px-2 py-1 text-xs"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.code}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="max-h-[min(70vh,560px)] space-y-4 overflow-y-auto p-3 text-sm">
            {!detailEx ? (
              <p className="text-gray-500">
                Select a row. The tabs above the grid match what is highlighted here; pictures and video stay below.
              </p>
            ) : (
              <>
                <p className="font-semibold text-gray-900">{getExerciseNameForLang(detailEx, detailLang)}</p>
                {gridCatalogTab === 'catalog' ? (
                  <section className="rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-700">
                    <p>
                      <span className="font-semibold text-gray-800">Typology:</span> {getTypology(detailEx)}
                    </p>
                    <p className="mt-1">
                      <span className="font-semibold text-gray-800">Sports:</span>{' '}
                      {(detailEx.sportsIndicated || []).length ? (detailEx.sportsIndicated || []).join(', ') : '—'}
                    </p>
                    <p className="mt-1">
                      <span className="font-semibold text-gray-800">Pathologies (not suggested):</span>{' '}
                      {(mergeExerciseWithDefaults(detailEx).contraindicatedPathologyIds || []).length
                        ? pathologyLabelsForExercise(detailEx, pathologyCatalog).join(', ')
                        : '—'}
                    </p>
                    <p className="mt-1">
                      <span className="font-semibold text-gray-800">Equipment:</span>{' '}
                      {detailEx.equipmentType || detailEx.equipment?.join(', ') || '—'}
                    </p>
                  </section>
                ) : null}
                {gridCatalogTab === 'execution' ? (
                  <section>
                    <h4 className="text-xs font-bold uppercase text-blue-700">Execution</h4>
                    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded border bg-white p-2 text-xs text-gray-800">
                      {stripHtmlForPreview(
                        getLangText(detailEx.executionByLanguage, detailLang, detailEx.description) || ''
                      ) || '—'}
                    </pre>
                  </section>
                ) : null}
                {gridCatalogTab === 'suggestions' ? (
                  <section>
                    <h4 className="text-xs font-bold uppercase text-blue-700">Suggestions</h4>
                    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded border bg-white p-2 text-xs text-gray-800">
                      {stripHtmlForPreview(getLangText(detailEx.expertSuggestionsByLanguage, detailLang, '') || '') || '—'}
                    </pre>
                  </section>
                ) : null}
                {gridCatalogTab === 'breathing' ? (
                  <section>
                    <h4 className="text-xs font-bold uppercase text-blue-700">Breathing</h4>
                    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded border bg-white p-2 text-xs text-gray-800">
                      {stripHtmlForPreview(getLangText(detailEx.breathingByLanguage, detailLang, '') || '') || '—'}
                    </pre>
                  </section>
                ) : null}
                {gridCatalogTab === 'mistakes' ? (
                  <section>
                    <h4 className="text-xs font-bold uppercase text-blue-700">Common mistakes</h4>
                    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded border bg-white p-2 text-xs text-gray-800">
                      {stripHtmlForPreview(getLangText(detailEx.mistakesByLanguage, detailLang, '') || '') || '—'}
                    </pre>
                  </section>
                ) : null}
                {gridCatalogTab === 'faqs' ? (
                  <section>
                    <h4 className="text-xs font-bold uppercase text-violet-800">FAQs</h4>
                    <div className="mt-1 space-y-2">
                      {normalizeExerciseFaqs(detailEx.exerciseFaqs)
                        .filter(exerciseFaqEntryHasContent)
                        .map((f, i) => (
                          <div key={f.id} className="rounded border bg-white p-2 text-xs">
                            <p className="font-semibold text-gray-900">
                              {i + 1}.{' '}
                              {(f.questionByLanguage?.[detailLang] || f.questionByLanguage?.en || '').trim() || '—'}
                            </p>
                            <pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap text-gray-700">
                              {stripHtmlForPreview(
                                (f.answerByLanguage?.[detailLang] || f.answerByLanguage?.en || '').trim() || ''
                              ) || '—'}
                            </pre>
                          </div>
                        ))}
                      {normalizeExerciseFaqs(detailEx.exerciseFaqs).filter(exerciseFaqEntryHasContent).length === 0 ? (
                        <p className="text-gray-500">No FAQs.</p>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                <section className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-gray-600">Pictures</h4>
                  {(() => {
                    const urls = collectExercisePictureUrls(detailEx);
                    const n = urls.length;
                    const idx = n ? Math.min(Math.max(0, pictureCarouselIdx), n - 1) : 0;
                    const cur = urls[idx];
                    return (
                      <div className="mt-2">
                        {n === 0 ? (
                          <div className="flex h-32 items-center justify-center rounded border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-500">
                            No pictures
                          </div>
                        ) : (
                          <div className="relative flex flex-col items-center gap-2">
                            <div className="flex h-40 w-full max-w-[280px] items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={cur} alt="" className="max-h-full max-w-full object-contain" />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                aria-label="Previous picture"
                                disabled={n <= 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPictureCarouselIdx((i) => (i - 1 + n) % n);
                                }}
                                className="rounded border border-gray-300 p-1 hover:bg-gray-50 disabled:opacity-40"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <span className="text-[10px] text-gray-500">
                                {idx + 1} / {n}
                              </span>
                              <button
                                type="button"
                                aria-label="Next picture"
                                disabled={n <= 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPictureCarouselIdx((i) => (i + 1) % n);
                                }}
                                className="rounded border border-gray-300 p-1 hover:bg-gray-50 disabled:opacity-40"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </section>

                <section className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-gray-600">Video</h4>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {exerciseHasAnyOfficialVideo(detailEx) ? (
                      <>
                        {(() => {
                          const maleSrc =
                            (detailEx.officialVideoDataUrl || '').trim() ||
                            (detailEx.officialVideoUrl || '').trim();
                          const femaleSrc =
                            (detailEx.officialVideoDataUrlFemale || '').trim() ||
                            (detailEx.officialVideoUrlFemale || '').trim();
                          return (
                            <>
                              {maleSrc ? (
                                <button
                                  type="button"
                                  onClick={() => openVideo(detailEx, 'male')}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                                >
                                  <Play className="h-3.5 w-3.5" aria-hidden />
                                  Male
                                </button>
                              ) : null}
                              {femaleSrc ? (
                                <button
                                  type="button"
                                  onClick={() => openVideo(detailEx, 'female')}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                                >
                                  <Play className="h-3.5 w-3.5" aria-hidden />
                                  Female
                                </button>
                              ) : null}
                              <span className="break-all text-[10px] text-gray-500">
                                {maleSrc && (detailEx.officialVideoDataUrl || '').trim()
                                  ? 'Male: inline'
                                  : maleSrc
                                    ? `Male: ${(detailEx.officialVideoUrl || '').trim()}`
                                    : null}
                                {maleSrc && femaleSrc ? ' · ' : ''}
                                {femaleSrc && (detailEx.officialVideoDataUrlFemale || '').trim()
                                  ? 'Female: inline'
                                  : femaleSrc
                                    ? `Female: ${(detailEx.officialVideoUrlFemale || '').trim()}`
                                    : null}
                              </span>
                            </>
                          );
                        })()}
                      </>
                    ) : (
                      <p className="text-xs text-gray-500">No video URL on this exercise.</p>
                    )}
                  </div>
                </section>

                <section className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-gray-600">Sport equipment</h4>
                  <p className="mt-1 text-xs text-gray-700">
                    Machines usually used:{' '}
                    <span className="font-semibold">{(detailEx.usualSportMachineIds || []).length}</span> selected in the
                    edit form.
                  </p>
                  <button
                    type="button"
                    onClick={() => onEditExercise(detailEx)}
                    className="mt-2 text-xs font-semibold text-blue-700 underline hover:text-blue-900"
                  >
                    Edit exercise…
                  </button>
                </section>
              </>
            )}
          </div>
        </div>
      </div>

      {popover?.kind === 'sports' && (
        <PopoverList
          title="Sports indicated"
          items={popover.exercise.sportsIndicated || []}
          onClose={() => setPopover(null)}
        />
      )}
      {popover?.kind === 'pathologies' && (
        <PopoverList
          title="Pathologies (not suggested)"
          items={popover.labels.length ? popover.labels : ['— none tagged —']}
          onClose={() => setPopover(null)}
        />
      )}
      {popover?.kind === 'names' && (
        <PopoverList
          title="Name by language"
          items={SUPPORTED_LANGUAGES.map(
            (l) => `${l.code.toUpperCase()}: ${getExerciseNameForLang(popover.exercise, l.code) || '—'}`
          )}
          onClose={() => setPopover(null)}
        />
      )}
      {popover?.kind === 'secondaries' && (
        <PopoverList title="Secondary muscular groups" items={getSecondaryMuscles(popover.exercise)} onClose={() => setPopover(null)} />
      )}
      {quickView && (
        <ExerciseQuickViewModal
          exercise={quickView}
          lang={detailLang}
          onClose={() => setQuickView(null)}
          onEdit={() => {
            setQuickView(null);
            onEditExercise(mergeExerciseWithDefaults(quickView));
          }}
          onPlayOfficialVideo={(exercise, sex) => {
            openVideo(exercise, sex);
          }}
        />
      )}
      {videoExercise && (
        <ExerciseVideoModal
          exercise={videoExercise.exercise}
          sex={videoExercise.sex}
          onClose={() => setVideoExercise(null)}
        />
      )}

      <p className="text-xs text-gray-500">
        Drag ⋮ on column headers (except the checkbox column) to reorder. Single-click a row opens the picture + label
        quick view; double-click opens the video player.
      </p>
    </div>
  );
}
