'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Menu, Settings } from 'lucide-react';
import MubPreviewModeToggle, { normalizeMubDisplayMode, type MubDisplayMode } from '@/components/mub/MubPreviewModeToggle';
import MubButtonEditorForm, { emptyMubButtonForm, type MubButtonFormState } from '@/components/mub/MubButtonEditorForm';
import MubButtonPreview from '@/components/mub/MubButtonPreview';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import {
  MUB_BACKGROUND_OPTIONS,
  MUB_CATEGORIES,
  MUB_STAFF_ROLE_TEMPLATES,
  mubBackgroundCss,
  roleTemplateFromUserType,
} from '@/lib/mub/constants';
import type { MubButtonDto, MubCategory, MubPageDto, MubRoleTemplate } from '@/lib/mub/types';
import { mubPageUrl } from '@/lib/mub/routes';

type MubPageMode = 'view' | 'edit' | 'staff';

type MubPageClientProps = {
  mode: MubPageMode;
  staffRoleTemplate?: MubRoleTemplate;
  /** Active sub-panel — null = view-only landing (PHP pic #1). */
  initialPanel?: 'user' | 'background' | null;
  initialCategory?: MubCategory;
  /** True when URL includes /club|workout|social segment. */
  hasCategoryInPath?: boolean;
};

function apiQuery(
  mode: MubPageMode,
  category: MubCategory,
  userId: string | undefined,
  staffRoleTemplate?: MubRoleTemplate,
) {
  const params = new URLSearchParams({ category });
  if (mode === 'staff') {
    params.set('scope', 'STAFF');
    if (staffRoleTemplate) params.set('roleTemplate', staffRoleTemplate);
  } else {
    params.set('scope', 'USER');
    if (userId) params.set('ownerId', userId);
  }
  return params.toString();
}

export default function MubPageClient({
  mode,
  staffRoleTemplate = 'SINGLE_USER',
  initialPanel = null,
  initialCategory = 'CLUB_MANAGEMENT',
  hasCategoryInPath = false,
}: MubPageClientProps) {
  const router = useRouter();
  const { t, currentLanguage: language } = useLanguage();
  const { user } = useAuth();
  const [editUnlocked, setEditUnlocked] = useState(mode === 'staff');
  const [passwordOpen, setPasswordOpen] = useState(mode === 'edit');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'user' | 'background' | null>(initialPanel);
  const [category, setCategory] = useState<MubCategory>(initialCategory);
  const [page, setPage] = useState<MubPageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<MubButtonFormState>(() => emptyMubButtonForm('en'));
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [selectedBg, setSelectedBg] = useState('white');
  const [message, setMessage] = useState<string | null>(null);
  /** Client-only preview layout — toggles instantly, no save (PHP: "Select the preview"). */
  const [previewMode, setPreviewMode] = useState<MubDisplayMode>(1);
  /** Client answer #4 — personal password gate for Reset / Remove MUB default. */
  const [confirmAction, setConfirmAction] = useState<'reset' | 'remove_default' | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmSaving, setConfirmSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const isViewLanding = mode === 'view' && activePanel === null && !hasCategoryInPath;
  const isUserSettingsHub = activePanel === 'user' && !hasCategoryInPath;
  const canEdit = mode === 'staff' || mode === 'view' || (mode === 'edit' && editUnlocked);
  const showCategoryTabs = (activePanel === 'user' && canEdit) || mode === 'staff';
  const showCrud = canEdit && activePanel === 'user' && hasCategoryInPath;
  const showBackgroundPanel = canEdit && activePanel === 'background';
  const pageTitle =
    mode === 'staff'
      ? `Setting page of the 'Most used buttons' by Movesbook staff`
      : isViewLanding
        ? `'Most used buttons of..'`
        : `Setting page of the 'Most used buttons'`;

  const queryString = useMemo(
    () => apiQuery(mode === 'staff' ? 'staff' : 'edit', category, user?.id, staffRoleTemplate),
    [mode, category, user?.id, staffRoleTemplate],
  );

  useEffect(() => {
    setActivePanel(initialPanel);
  }, [initialPanel]);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  const goUserSettings = () => router.push(mubPageUrl({ setting: true }));
  const goBackgroundSetting = () => router.push(mubPageUrl({ panel: 'background' }));
  const goCategory = (cat: MubCategory) => router.push(mubPageUrl({ category: cat, setting: true }));
  const goViewLanding = () => router.push(mubPageUrl());

  const loadPage = useCallback(async () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      const res = await fetch(`/api/mub/page?${queryString}&lang=${encodeURIComponent(language)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = (await res.json()) as { page?: MubPageDto };
      if (data.page) {
        setPage(data.page);
        setSelectedBg(data.page.backgroundColor);
        setPreviewMode(normalizeMubDisplayMode(data.page.displayMode));
      }
    } finally {
      setLoading(false);
    }
  }, [queryString, language]);

  useEffect(() => {
    if (mode === 'staff' || hasCategoryInPath) {
      void loadPage();
    } else {
      setLoading(false);
    }
  }, [loadPage, mode, hasCategoryInPath]);

  const postAction = async (body: Record<string, unknown>) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/mub/actions?${queryString}&lang=${encodeURIComponent(language)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'action_failed');
    if (data.page) setPage(data.page);
    return data;
  };

  const saveButton = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/mub/buttons?${queryString}&lang=${encodeURIComponent(language)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          button: {
            id: form.id,
            buttonColor: form.buttonColor,
            textFont: form.textFont,
            textColor: form.textColor,
            iconPath: form.iconPath || null,
            iconSource: form.iconSource,
            urlToOpen: form.urlToOpen || null,
            pageToOpen: form.pageToOpen,
            translations: form.translations,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'save_failed');
      setPage(data.page);
      setFormOpen(false);
      setForm(emptyMubButtonForm(language));
      setMessage(null);
    } catch {
      setMessage('Could not save button. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (btn: MubButtonDto) => {
    setForm({
      id: btn.id,
      buttonColor: btn.buttonColor,
      textFont: btn.textFont,
      textColor: btn.textColor,
      iconPath: btn.iconPath ?? '',
      iconFileName: btn.iconPath?.split('/').pop() ?? '',
      iconSource: btn.iconSource,
      urlToOpen: btn.urlToOpen ?? '',
      pageToOpen: btn.pageToOpen,
      editLang: language,
      translations:
        Object.keys(btn.translations).length > 0
          ? { ...btn.translations }
          : { [language]: { shortText: btn.shortText, extendedText: btn.extendedText } },
    });
    setFormOpen(true);
  };

  const uploadIcon = async (file: File) => {
    setUploadingIcon(true);
    try {
      const token = localStorage.getItem('token');
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/mub/icon-upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'upload_failed');
      setForm((f) => ({ ...f, iconPath: data.path, iconFileName: data.fileName ?? file.name }));
    } catch {
      setMessage('Could not upload icon.');
    } finally {
      setUploadingIcon(false);
    }
  };

  const deleteButton = async (id: string) => {
    if (!window.confirm('Delete this button?')) return;
    const token = localStorage.getItem('token');
    const res = await fetch(
      `/api/mub/buttons?${queryString}&lang=${encodeURIComponent(language)}&id=${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    const data = await res.json();
    if (data.page) setPage(data.page);
  };

  const verifyPassword = async () => {
    setPasswordError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/mub/verify-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { access?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'verify_failed');

      if (data.access === 'staff') {
        const template = roleTemplateFromUserType(user?.userType ?? 'ATHLETE');
        router.push(`/users/mub_staff_page?role=${template}`);
        return;
      }
      if (data.access === 'club') {
        setEditUnlocked(true);
        setPasswordOpen(false);
        setPassword('');
        router.push(mubPageUrl({ setting: true }));
        return;
      }
      setPasswordError(data.error || 'Invalid password.');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Invalid password.');
    }
  };

  const handleImport = async () => {
    const template = roleTemplateFromUserType(user?.userType ?? 'ATHLETE');
    try {
      const data = await postAction({ action: 'import', roleTemplate: template });
      setMessage(
        `${data.importedCount ?? 0} button(s) imported for language "${language}" and added to your page.`,
      );
    } catch {
      setMessage('Could not import Movesbook MUB template.');
    }
  };

  const reorderButtons = async (orderedIds: string[]) => {
    if (!page) return;
    const previous = page;
    setPage({
      ...page,
      buttons: orderedIds
        .map((id) => page.buttons.find((b) => b.id === id))
        .filter((b): b is MubButtonDto => Boolean(b)),
    });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/mub/buttons?${queryString}&lang=${encodeURIComponent(language)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ orderedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'reorder_failed');
      if (data.page) setPage(data.page);
    } catch {
      setPage(previous);
      setMessage('Could not reorder buttons.');
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !page || active.id === over.id) return;
    const ids = page.buttons.map((b) => b.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    void reorderButtons(arrayMove(ids, oldIndex, newIndex));
  };

  const runProtectedAction = async () => {
    if (!confirmAction) return;
    setConfirmSaving(true);
    setConfirmError(null);
    try {
      await postAction({ action: confirmAction, password: confirmPassword });
      setMessage(
        confirmAction === 'reset'
          ? 'All buttons on this page were removed.'
          : 'Imported (default) buttons were removed.',
      );
      setConfirmAction(null);
      setConfirmPassword('');
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setConfirmSaving(false);
    }
  };

  const saveBackground = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/mub/page?${queryString}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ backgroundColor: selectedBg }),
    });
    const data = await res.json();
    if (data.page) {
      setPage(data.page);
      setActivePanel(null);
    }
  };

  if (passwordOpen && !editUnlocked) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-gray-300 bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Enter admin password</h2>
        <p className="mb-4 text-sm text-gray-600">
          Super Admin password opens staff templates. Club Admin password (or your personal password) unlocks MUB settings.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2"
          placeholder="Password"
        />
        {passwordError ? <p className="mb-2 text-sm text-red-600">{passwordError}</p> : null}
        <div className="flex gap-2">
          <button type="button" onClick={verifyPassword} className="rounded bg-red-700 px-4 py-2 text-white hover:bg-red-800">
            Continue
          </button>
          <Link href={mubPageUrl()} className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-800">
            Back to MUB page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="overflow-hidden rounded border border-gray-400 bg-[#ececec] shadow">
        {/* Top bar — User settings | Background Setting (PHP: movesbook.net/users/mub_page) */}
        <div className="flex items-center justify-between border-b border-gray-400 bg-[#d9d9d9] px-3 py-2">
          <div className="flex items-center gap-4">
            <Menu className="h-4 w-4 shrink-0 text-gray-700" />
            {mode !== 'staff' ? (
              <>
                <button
                  type="button"
                  onClick={goUserSettings}
                  className={`inline-flex items-center gap-1 text-sm font-semibold ${
                    activePanel === 'user' ? 'text-red-700 underline' : 'text-red-700 hover:underline'
                  }`}
                >
                  <Settings className="h-3.5 w-3.5" />
                  User settings
                </button>
                <button
                  type="button"
                  onClick={goBackgroundSetting}
                  className={`inline-flex items-center gap-1 text-sm font-semibold ${
                    activePanel === 'background' ? 'text-red-700 underline' : 'text-red-700 hover:underline'
                  }`}
                >
                  <Settings className="h-3.5 w-3.5" />
                  Background Setting
                </button>
              </>
            ) : (
              <span className="text-sm font-semibold text-red-700">Background Setting</span>
            )}
          </div>
          <Menu className="h-4 w-4 shrink-0 text-gray-700" />
        </div>

        <div className="flex items-center justify-between border-b border-gray-400 bg-[#bdbdbd] px-3 py-2 text-sm text-red-700">
          <span>{pageTitle}</span>
          <MubPreviewModeToggle
            value={previewMode}
            onChange={setPreviewMode}
            disabled={loading}
          />
        </div>

        {mode === 'staff' ? (
          <div className="flex flex-wrap gap-2 border-b border-gray-300 bg-white px-3 py-2">
            {MUB_STAFF_ROLE_TEMPLATES.map((role) => (
              <Link
                key={role.id}
                href={`/users/mub_staff_page?role=${role.id}`}
                className={`rounded px-3 py-1 text-xs font-semibold ${
                  staffRoleTemplate === role.id ? 'bg-red-700 text-white' : 'bg-gray-800 text-white'
                }`}
              >
                {role.label}
              </Link>
            ))}
          </div>
        ) : null}

        {showCategoryTabs ? (
        <div className="flex items-center justify-between border-b border-amber-200 bg-[#fff6bf] px-2 py-2">
          <div className="flex flex-wrap gap-2">
            {MUB_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => goCategory(cat.id)}
                className={`rounded px-4 py-1.5 text-sm font-semibold ${
                  hasCategoryInPath && category === cat.id ? 'bg-red-700 text-white' : 'bg-gray-900 text-white'
                }`}
              >
                {cat.legacyLabel}
              </button>
            ))}
          </div>
        </div>
        ) : null}

        {showCrud ? (
          <div className="flex items-center justify-between border-b border-gray-300 bg-[#dbeafe] px-3 py-2">
            <button
              type="button"
              onClick={() => {
                setForm(emptyMubButtonForm(language));
                setFormOpen(true);
              }}
              className="rounded bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Add a button
            </button>
            <div className="flex flex-wrap gap-2">
              {mode !== 'staff' ? (
                <>
                  <button
                    type="button"
                    onClick={() => void handleImport()}
                    className="rounded bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Import Movesbook MUB
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmError(null);
                      setConfirmPassword('');
                      setConfirmAction('remove_default');
                    }}
                    className="rounded bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Remove MUB default
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setConfirmError(null);
                  setConfirmPassword('');
                  setConfirmAction('reset');
                }}
                className="rounded bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Reset page
              </button>
            </div>
          </div>
        ) : null}

        {message ? (
          <div className="border-b border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">{message}</div>
        ) : null}

        {showBackgroundPanel ? (
          <div className="border-b border-red-700 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-red-700">Fill background</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
              {MUB_BACKGROUND_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`cursor-pointer rounded border p-2 text-center text-xs ${
                    selectedBg === opt.id ? 'border-black ring-2 ring-black' : 'border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="mub-bg"
                    className="mb-1"
                    checked={selectedBg === opt.id}
                    onChange={() => setSelectedBg(opt.id)}
                  />
                  <div className="mx-auto mb-1 h-8 w-full rounded border" style={{ backgroundColor: opt.css }} />
                  {opt.label}
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={goViewLanding} className="rounded border px-4 py-1.5">
                Cancel
              </button>
              <button type="button" onClick={() => void saveBackground()} className="rounded bg-green-700 px-4 py-1.5 text-white">
                OK
              </button>
            </div>
          </div>
        ) : null}

        {formOpen && canEdit ? (
          <MubButtonEditorForm
            form={form}
            setForm={setForm}
            saving={saving}
            uploadingIcon={uploadingIcon}
            onSave={() => void saveButton()}
            onCancel={() => setFormOpen(false)}
            onIconUpload={(file) => void uploadIcon(file)}
          />
        ) : null}

        <div
          className="min-h-[12rem] p-3"
          style={{ backgroundColor: mubBackgroundCss(page?.backgroundColor ?? 'white') }}
        >
          {loading ? (
            <p className="text-sm text-gray-600">Loading…</p>
          ) : isViewLanding || isUserSettingsHub ? (
            <div className="flex min-h-[8rem] items-start">
              <button
                type="button"
                disabled
                className="rounded bg-gray-800 px-6 py-2 text-sm font-semibold text-white opacity-90"
              >
                Mub to Load
              </button>
            </div>
          ) : !page?.buttons.length ? (
            <p className="text-sm text-gray-600">No buttons configured yet.</p>
          ) : previewMode === 2 ? (
            <div className="flex flex-wrap items-stretch gap-3">
              {page.buttons.map((btn) => (
                <MubButtonLink key={btn.id} button={btn} compact />
              ))}
            </div>
          ) : showCrud ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={page.buttons.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {page.buttons.map((btn) => (
                    <SortableMubButtonRow
                      key={btn.id}
                      button={btn}
                      onEdit={() => openEdit(btn)}
                      onDelete={() => void deleteButton(btn.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="space-y-2">
              {page.buttons.map((btn) => (
                <div key={btn.id} className="flex items-stretch gap-2 rounded border border-gray-300/80 bg-white/40 p-2">
                  <MubButtonLink button={btn} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {confirmAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded border border-gray-400 bg-white p-5 shadow-xl">
            <h3 className="mb-2 text-base font-semibold text-gray-900">
              {confirmAction === 'reset' ? 'Reset page' : 'Remove MUB default'}
            </h3>
            <p className="mb-3 text-sm text-gray-600">
              {confirmAction === 'reset'
                ? 'This removes ALL buttons on this category page (yours and imported). Enter your personal password to continue.'
                : 'This removes only buttons imported from Movesbook MUB. Your manually created buttons stay. Enter your personal password to continue.'}
            </p>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mb-2 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder="Personal password"
              autoFocus
            />
            {confirmError ? <p className="mb-2 text-sm text-red-600">{confirmError}</p> : null}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmAction(null);
                  setConfirmPassword('');
                  setConfirmError(null);
                }}
                className="rounded border border-gray-400 px-4 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmSaving || !confirmPassword.trim()}
                onClick={() => void runProtectedAction()}
                className="rounded bg-red-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
              >
                {confirmSaving ? 'Working…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SortableMubButtonRow({
  button,
  onEdit,
  onDelete,
}: {
  button: MubButtonDto;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: button.id,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-stretch gap-2 rounded border border-gray-300/80 bg-white/40 p-2"
    >
      <button
        type="button"
        className="mt-2 shrink-0 cursor-grab text-gray-500 active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <MubButtonLink button={button} />
      <div className="flex shrink-0 flex-col gap-1">
        <button type="button" onClick={onEdit} className="rounded bg-gray-500 px-3 py-1 text-xs text-white">
          Edit
        </button>
        <button type="button" onClick={onDelete} className="rounded bg-amber-400 px-3 py-1 text-xs text-gray-900">
          Delete
        </button>
      </div>
    </div>
  );
}

function MubButtonLink({ button, compact }: { button: MubButtonDto; compact?: boolean }) {
  const href = button.urlToOpen || '#';
  const inner = (
    <MubButtonPreview
      button={{
        buttonColor: button.buttonColor,
        textFont: button.textFont,
        textColor: button.textColor,
        iconPath: button.iconPath ?? '',
        shortText: button.shortText,
        extendedText: compact ? '' : button.extendedText,
      }}
      compact={compact}
    />
  );
  if (!button.urlToOpen) return inner;

  if (button.pageToOpen === 'popup') {
    return (
      <a
        href={href}
        className="block min-w-0"
        onClick={(e) => {
          e.preventDefault();
          window.open(href, '_blank', 'noopener,noreferrer,width=1024,height=768');
        }}
      >
        {inner}
      </a>
    );
  }

  if (button.pageToOpen === 'new_tab') {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block min-w-0">
        {inner}
      </a>
    );
  }

  // same_label — open in the central frame of the same tab
  return (
    <a href={href} className="block min-w-0">
      {inner}
    </a>
  );
}
