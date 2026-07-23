'use client';

import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Accessibility,
  AlignJustify,
  AtSign,
  BookOpen,
  ChevronDown,
  CreditCard,
  Eye,
  EyeOff,
  Landmark,
  type LucideIcon,
  Pencil,
  Plus,
  Trophy,
  XCircle
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import FontAwesomeIconPicker, { normalizeFaIconClass } from '@/components/desk/FontAwesomeIconPicker';
import { deskTreeRowInsetStyle } from '@/components/desk/deskTreeDepth';
import { openDeskItemPath } from '@/components/desk/deskPathNavigation';

type DeskIconKey = 'at' | 'book' | 'id' | 'trophy' | 'wheelchair' | 'landmark';

const ICONS: Record<DeskIconKey, LucideIcon> = {
  at: AtSign,
  book: BookOpen,
  id: CreditCard,
  trophy: Trophy,
  wheelchair: Accessibility,
  landmark: Landmark
};

export type MyDeskNode = {
  id: string;
  label: string;
  barClass?: string;
  icon?: DeskIconKey;
  faIconClass?: string;
  bgColor?: string;
  titleColor?: string;
  path?: string;
  displayMode?: 'new_label' | 'central_page';
  /** When false, row is dimmed (preview “hidden” until persisted). */
  visible?: boolean;
  children?: MyDeskNode[];
};

function reorderAmongSiblings(
  items: MyDeskNode[],
  activeId: string,
  overId: string
): MyDeskNode[] | null {
  const activeIndex = items.findIndex((i) => i.id === activeId);
  const overIndex = items.findIndex((i) => i.id === overId);
  if (activeIndex === -1 || overIndex === -1) {
    return null;
  }
  return arrayMove(items, activeIndex, overIndex);
}

function reorderInTree(
  items: MyDeskNode[],
  activeId: string,
  overId: string
): MyDeskNode[] | null {
  const atLevel = reorderAmongSiblings(items, activeId, overId);
  if (atLevel !== null) {
    return atLevel;
  }
  let changed = false;
  const next = items.map((item) => {
    if (!item.children?.length) {
      return item;
    }
    const reordered = reorderInTree(item.children, activeId, overId);
    if (reordered !== null) {
      changed = true;
      return { ...item, children: reordered };
    }
    return item;
  });
  return changed ? next : null;
}

function findNodeById(nodes: MyDeskNode[], id: string): MyDeskNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children?.length) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function findSiblingsContext(
  nodes: MyDeskNode[],
  targetId: string,
  parentId: string | null = null
): { parentId: string | null; siblingIds: string[] } | null {
  if (nodes.some((n) => n.id === targetId)) {
    return { parentId, siblingIds: nodes.map((n) => n.id) };
  }
  for (const node of nodes) {
    if (!node.children?.length) continue;
    const result = findSiblingsContext(node.children, targetId, node.id);
    if (result) return result;
  }
  return null;
}

type ApiMyDeskNode = {
  id: string;
  title: string;
  path: string | null;
  faIconClass: string | null;
  bgColor: string | null;
  titleColor: string | null;
  displayMode: string | null;
  visible: boolean;
  children?: ApiMyDeskNode[];
};

function mapApiNodeToTree(node: ApiMyDeskNode): MyDeskNode {
  return {
    id: node.id,
    label: node.title,
    barClass: 'border border-zinc-300',
    faIconClass: node.faIconClass ?? undefined,
    bgColor: node.bgColor ?? undefined,
    titleColor: node.titleColor ?? undefined,
    path: node.path?.trim() || undefined,
    displayMode: (node.displayMode as 'new_label' | 'central_page' | null) ?? undefined,
    visible: node.visible,
    children: (node.children ?? []).map(mapApiNodeToTree)
  };
}

function SortableMyDeskRow({
  node,
  depth,
  expanded,
  toggle,
  onPathClick,
  onAddChild,
  onEdit,
  onDelete,
  onToggleVisible
}: {
  node: MyDeskNode;
  depth: number;
  expanded: Record<string, boolean>;
  toggle: (id: string) => void;
  onPathClick: (node: MyDeskNode) => void;
  onAddChild: (parentId: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleVisible: (id: string) => void;
}) {
  const { t } = useLanguage();
  const hasChildren = Boolean(node.children?.length);
  const hasPath = Boolean(node.path?.trim());
  const open = expanded[node.id] ?? false;
  const Icon = node.icon ? ICONS[node.icon] : null;
  const faIconClass = node.faIconClass?.trim();
  const dimmed = node.visible === false;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : dimmed ? 0.45 : undefined
  };

  const childIds = node.children?.map((c) => c.id) ?? [];
  const insetStyle = deskTreeRowInsetStyle(depth);

  const onTitleClick = () => {
    if (hasPath) {
      onPathClick(node);
      return;
    }
    if (hasChildren) {
      toggle(node.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...insetStyle }}
      className="select-none border-b border-zinc-200 last:border-b-0"
    >
      <div
        className={`flex min-h-[42px] w-full items-center gap-1.5 px-2 py-2 text-xs font-medium tracking-wide ${node.barClass ?? ''}`}
        style={{
          ...(node.bgColor ? { backgroundColor: node.bgColor } : {}),
          ...(node.titleColor ? { color: node.titleColor } : {})
        }}
      >
        <button
          type="button"
          className="touch-none inline-flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded opacity-80 hover:opacity-100 active:cursor-grabbing"
          aria-label={t('desk_drag_handle_aria')}
          title={t('desk_drag_handle_aria')}
          {...attributes}
          {...listeners}
        >
          <AlignJustify className="h-4 w-4 pointer-events-none" aria-hidden />
        </button>
        {faIconClass ? (
          <span
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center leading-none text-[0.875rem] opacity-90"
            aria-hidden
          >
            <i className={`${faIconClass} leading-none`} aria-hidden />
          </span>
        ) : null}
        {!faIconClass && Icon ? (
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center opacity-90" aria-hidden>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        ) : null}
        {hasPath || hasChildren ? (
          <button
            type="button"
            className={`min-w-0 flex-1 truncate text-left uppercase transition-opacity hover:opacity-95 ${hasPath ? 'cursor-pointer underline-offset-2 hover:underline' : ''}`}
            onClick={onTitleClick}
            aria-expanded={hasChildren ? open : undefined}
          >
            {node.label}
          </button>
        ) : (
          <span className="min-w-0 flex-1 truncate uppercase">{node.label}</span>
        )}
        <div className="flex shrink-0 items-center gap-0.5">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggle(node.id)}
              className="inline-flex h-7 w-7 items-center justify-center text-current opacity-85 hover:opacity-100"
              aria-label={open ? t('collapse') : t('expand')}
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onEdit(node.id)}
            className="inline-flex h-7 w-7 items-center justify-center text-current opacity-85 hover:opacity-100"
            aria-label={t('desk_edit_item_aria')}
            title={t('desk_edit_item_aria')}
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onAddChild(node.id)}
            className="inline-flex h-7 w-7 items-center justify-center text-current opacity-85 hover:opacity-100"
            aria-label={t('desk_add_sub_item_aria')}
            title={t('desk_add_sub_item_aria')}
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onToggleVisible(node.id)}
            className="inline-flex h-7 w-7 items-center justify-center text-current opacity-85 hover:opacity-100"
            aria-label={t('desk_toggle_visibility_aria')}
            title={t('desk_toggle_visibility_aria')}
          >
            {dimmed ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
          <button
            type="button"
            onClick={() => onDelete(node.id)}
            className="inline-flex h-7 w-7 items-center justify-center text-red-600 opacity-90 hover:opacity-100"
            aria-label={t('desk_delete_item_aria')}
            title={t('desk_delete_item_aria')}
          >
            <XCircle className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      {hasChildren && open ? (
        <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
          {node.children!.map((child) => (
            <SortableMyDeskRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              onPathClick={onPathClick}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleVisible={onToggleVisible}
            />
          ))}
        </SortableContext>
      ) : null}
    </div>
  );
}

type DeskFormModal =
  | { mode: 'add'; parentId: string }
  | { mode: 'edit'; itemId: string };

export default function MyDeskSettingsTree({
  clubId,
  headingKey = 'dashboard_my_desk',
}: {
  /** When set, manages Club Desk for this club via `/api/club-desk`. */
  clubId?: string | null;
  headingKey?: string;
}) {
  const { t } = useLanguage();
  const isClubDesk = Boolean(clubId);
  const listUrl = isClubDesk
    ? `/api/club-desk?clubId=${encodeURIComponent(clubId!)}`
    : '/api/my-desk';
  const itemUrl = (id: string) =>
    isClubDesk ? `/api/club-desk/${id}` : `/api/my-desk/${id}`;
  const reorderUrl = isClubDesk ? '/api/club-desk/reorder' : '/api/my-desk/reorder';
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [items, setItems] = useState<MyDeskNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [formModal, setFormModal] = useState<DeskFormModal | null>(null);
  const [newIcon, setNewIcon] = useState('fas fa-address-book');
  const [newBgColor, setNewBgColor] = useState('#ffffff');
  const [newTitleColor, setNewTitleColor] = useState('#000000');
  const [newTitle, setNewTitle] = useState('');
  const [newPath, setNewPath] = useState('');
  const [newDisplayMode, setNewDisplayMode] = useState<'new_label' | 'central_page'>('new_label');

  const resetFormDefaults = useCallback(() => {
    setNewIcon('fas fa-address-book');
    setNewBgColor('#ffffff');
    setNewTitleColor('#000000');
    setNewTitle('');
    setNewPath('');
    setNewDisplayMode('new_label');
  }, []);

  const fetchItems = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    if (clubId === null) {
      setItems([]);
      return;
    }

    const response = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error('Failed to load desk data');
    }
    const data = (await response.json()) as {
      items: Array<{
        id: string;
        title: string;
        path: string | null;
        faIconClass: string | null;
        bgColor: string | null;
        titleColor: string | null;
        displayMode: string | null;
        visible: boolean;
        children?: ApiMyDeskNode[];
      }>;
    };
    setItems((data.items ?? []).map(mapApiNodeToTree));
  }, [listUrl, clubId]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await fetchItems();
      } catch (error) {
        console.error('Error loading my desk items:', error);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [fetchItems]);

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const onAddChild = useCallback(
    (parentId: string) => {
      resetFormDefaults();
      setFormModal({ mode: 'add', parentId });
    },
    [resetFormDefaults]
  );

  const onEdit = useCallback(
    (itemId: string) => {
      const node = findNodeById(items, itemId);
      if (!node) return;
      setNewIcon(node.faIconClass ?? 'fas fa-address-book');
      setNewBgColor(node.bgColor ?? '#ffffff');
      setNewTitleColor(node.titleColor ?? '#000000');
      setNewTitle(node.label);
      setNewPath(node.path ?? '');
      setNewDisplayMode(node.displayMode ?? 'new_label');
      setFormModal({ mode: 'edit', itemId });
    },
    [items]
  );

  const closeFormModal = useCallback(() => {
    setFormModal(null);
  }, []);

  const submitFormModal = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!formModal) {
        return;
      }
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;

      const title = newTitle.trim() || newPath.trim() || t('desk_new_item_label');
      const payload = {
        title,
        path: newPath.trim() || null,
        faIconClass: normalizeFaIconClass(newIcon) || null,
        bgColor: newBgColor,
        titleColor: newTitleColor,
        displayMode: newDisplayMode
      };

      if (formModal.mode === 'add') {
        const response = await fetch(isClubDesk ? '/api/club-desk' : '/api/my-desk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            ...payload,
            ...(isClubDesk ? { clubId } : {}),
            parentId: formModal.parentId || null,
            visible: true
          })
        });
        if (!response.ok) {
          throw new Error('Failed to add child item');
        }
        setExpanded((prev) =>
          formModal.parentId ? { ...prev, [formModal.parentId]: true } : prev
        );
      } else {
        const response = await fetch(itemUrl(formModal.itemId), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          throw new Error('Failed to update item');
        }
      }

      closeFormModal();
      await fetchItems();
    },
    [
      closeFormModal,
      clubId,
      fetchItems,
      formModal,
      isClubDesk,
      itemUrl,
      newBgColor,
      newDisplayMode,
      newIcon,
      newPath,
      newTitle,
      newTitleColor,
      t
    ]
  );

  const router = useRouter();

  const onPathClick = useCallback(
    (node: MyDeskNode) => {
      if (!node.path?.trim()) return;
      openDeskItemPath(node.path, node.displayMode, router);
    },
    [router]
  );

  const onDelete = useCallback(async (id: string) => {
    if (!window.confirm(t('desk_delete_confirm'))) {
      return;
    }
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    const response = await fetch(itemUrl(id), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      throw new Error('Failed to delete item');
    }
    await fetchItems();
  }, [fetchItems, itemUrl, t]);

  const onToggleVisible = useCallback(async (id: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    const current = findNodeById(items, id);
    if (!current) return;

    const response = await fetch(itemUrl(id), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ visible: current.visible === false ? true : false })
    });
    if (!response.ok) {
      throw new Error('Failed to toggle visibility');
    }
    await fetchItems();
  }, [fetchItems, itemUrl, items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const rootIds = items.map((n) => n.id);

  const onDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeCtx = findSiblingsContext(items, activeId);
    const overCtx = findSiblingsContext(items, overId);
    if (!activeCtx || !overCtx || activeCtx.parentId !== overCtx.parentId) {
      return;
    }

    const nextSiblingIds = arrayMove(
      activeCtx.siblingIds,
      activeCtx.siblingIds.indexOf(activeId),
      activeCtx.siblingIds.indexOf(overId)
    );

    setItems((prev) => reorderInTree(prev, activeId, overId) ?? prev);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    const response = await fetch(reorderUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        ...(isClubDesk ? { clubId } : {}),
        parentId: activeCtx.parentId,
        orderedIds: nextSiblingIds
      })
    });
    if (!response.ok) {
      await fetchItems();
    }
  }, [clubId, fetchItems, isClubDesk, items, reorderUrl]);

  return (
    <>
      <div className="w-full overflow-hidden rounded border border-zinc-300 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 bg-[#2563eb] px-3 py-2.5 text-white">
          <h1 className="text-sm font-semibold uppercase tracking-wide">{t(headingKey)}</h1>
          <button
            type="button"
            onClick={() => {
              if (isClubDesk) {
                resetFormDefaults();
                setFormModal({ mode: 'add', parentId: '' });
                return;
              }
              router.push('/users/add_new_mydesk');
            }}
            className="rounded bg-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-white/25"
          >
            {t('desk_add_new')}
          </button>
        </div>
        {loading ? (
          <div className="px-4 py-6 text-sm text-zinc-500">Loading...</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={rootIds} strategy={verticalListSortingStrategy}>
              {items.map((node) => (
                <SortableMyDeskRow
                  key={node.id}
                  node={node}
                  depth={0}
                  expanded={expanded}
                  toggle={toggle}
                  onPathClick={onPathClick}
                  onAddChild={onAddChild}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleVisible={onToggleVisible}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {formModal ? (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={closeFormModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-xl rounded-xl border border-zinc-300 bg-zinc-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={submitFormModal} className="space-y-4 p-6">
              <button
                type="button"
                onClick={closeFormModal}
                className="absolute right-4 top-4 rounded-full border border-zinc-300 bg-white px-2 py-1 text-zinc-600 hover:text-zinc-900"
                aria-label={t('add_new_mydesk_cancel')}
              >
                x
              </button>

              <div className="pr-10">
                <label className="mb-1 block text-sm font-bold text-zinc-900">
                  {formModal.mode === 'add' ? t('add_new_mydesk_title') : t('edit_mydesk_title')}
                </label>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-800">{t('add_new_mydesk_icon')}</label>
                <FontAwesomeIconPicker value={newIcon} onChange={setNewIcon} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-800">{t('add_new_mydesk_bg_color')}</label>
                  <input
                    type="color"
                    value={newBgColor}
                    onChange={(e) => setNewBgColor(e.target.value)}
                    className="h-10 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0.5"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-800">
                    {t('add_new_mydesk_title_color')}
                  </label>
                  <input
                    type="color"
                    value={newTitleColor}
                    onChange={(e) => setNewTitleColor(e.target.value)}
                    className="h-10 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0.5"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-800">{t('add_new_mydesk_title_field')}</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded border border-zinc-300 px-2 py-2 text-sm text-zinc-900"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-800">{t('add_new_mydesk_path')}</label>
                <input
                  type="text"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  className="w-full rounded border border-zinc-300 px-2 py-2 text-sm text-zinc-900"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-800">
                  {t('add_new_mydesk_display_mode')}
                </label>
                <select
                  value={newDisplayMode}
                  onChange={(e) => setNewDisplayMode(e.target.value as 'new_label' | 'central_page')}
                  className="w-full rounded border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900"
                >
                  <option value="new_label">{t('display_mode_new_label')}</option>
                  <option value="central_page">{t('display_mode_central_page')}</option>
                </select>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="submit"
                  className="rounded bg-red-600 px-7 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  {t('add_new_mydesk_submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
