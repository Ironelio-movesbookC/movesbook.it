'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
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
  AtSign,
  BookOpen,
  ChevronDown,
  CreditCard,
  GripVertical,
  Landmark,
  type LucideIcon,
  Trophy
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type DeskIconKey = 'at' | 'book' | 'id' | 'trophy' | 'wheelchair' | 'landmark';

const ICONS: Record<DeskIconKey, LucideIcon> = {
  at: AtSign,
  book: BookOpen,
  id: CreditCard,
  trophy: Trophy,
  wheelchair: Accessibility,
  landmark: Landmark
};

export type DeskUtilityNode = {
  id: string;
  label: string;
  /** Tailwind background classes when not using DB hex colors */
  barClass?: string;
  icon?: DeskIconKey;
  faIconClass?: string;
  bgColor?: string;
  titleColor?: string;
  visible?: boolean;
  children?: DeskUtilityNode[];
};

/** Demo tree for `variant="demo"` only. */
export const DEMO_DESK_UTILITY_TREE: DeskUtilityNode[] = [
  {
    id: 'club-desk',
    label: 'TEST CLUB DESK',
    barClass: 'bg-teal-200 text-teal-950',
    icon: 'landmark'
  },
  {
    id: 'color',
    label: 'TESTCOLOR',
    barClass: 'bg-lime-400 text-black',
    icon: 'trophy'
  },
  {
    id: 'personal-race',
    label: 'PERSONAL RACE RESULTS ELIO',
    barClass: 'bg-emerald-200 text-emerald-950',
    icon: 'at',
    children: [
      {
        id: 'risultati',
        label: 'RISULTATI NAZIONALI',
        barClass: 'bg-amber-100 text-amber-950',
        icon: 'book'
      }
    ]
  },
  {
    id: 'test',
    label: 'TEST',
    barClass: 'bg-red-600 text-white',
    icon: 'id',
    children: [
      {
        id: 'tsstt',
        label: 'TSSTT',
        barClass: 'bg-lime-400 text-black',
        icon: 'wheelchair',
        children: [
          {
            id: 'subtest',
            label: 'SUBTEST',
            barClass: 'bg-zinc-400 text-zinc-900',
            icon: 'book'
          }
        ]
      }
    ]
  },
  {
    id: 'newtest',
    label: 'NEWTEST',
    barClass: 'bg-pink-300 text-pink-950',
    icon: 'trophy',
    children: [
      {
        id: 'club-admin-david',
        label: 'CLUB ADMIN TO DAVID BOWIE',
        barClass: 'bg-emerald-800 text-white',
        icon: 'landmark',
        children: [
          {
            id: 'subtest-2',
            label: 'SUBTEST',
            barClass: 'bg-lime-400 text-black',
            icon: 'at'
          }
        ]
      }
    ]
  },
  {
    id: 'march-green',
    label: 'TEST 20 MARCH - NEW LABEL GREEN',
    barClass: 'bg-black text-white',
    icon: 'id'
  },
  {
    id: 'march-same-1',
    label: 'TEST 20 MARCH - SAME LABEL',
    barClass: 'bg-white text-zinc-900 border border-zinc-300',
    icon: 'book'
  },
  {
    id: 'march-same-2',
    label: 'TEST 20 MARCH - SAME LABEL',
    barClass: 'bg-white text-zinc-900 border border-zinc-300',
    icon: 'id'
  }
];

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

function mapApiToDeskUtility(node: ApiMyDeskNode): DeskUtilityNode {
  return {
    id: node.id,
    label: node.title,
    barClass: 'border border-zinc-300',
    faIconClass: node.faIconClass ?? undefined,
    bgColor: node.bgColor ?? undefined,
    titleColor: node.titleColor ?? undefined,
    visible: node.visible,
    children: (node.children ?? []).map(mapApiToDeskUtility)
  };
}

function findSiblingsContext(
  nodes: DeskUtilityNode[],
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

function reorderAmongSiblings(
  items: DeskUtilityNode[],
  activeId: string,
  overId: string
): DeskUtilityNode[] | null {
  const activeIndex = items.findIndex((i) => i.id === activeId);
  const overIndex = items.findIndex((i) => i.id === overId);
  if (activeIndex === -1 || overIndex === -1) {
    return null;
  }
  return arrayMove(items, activeIndex, overIndex);
}

function reorderInTree(
  items: DeskUtilityNode[],
  activeId: string,
  overId: string
): DeskUtilityNode[] | null {
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

function SortableDeskRow({
  node,
  depth,
  expanded,
  toggle
}: {
  node: DeskUtilityNode;
  depth: number;
  expanded: Record<string, boolean>;
  toggle: (id: string) => void;
}) {
  const { t } = useLanguage();
  const hasChildren = Boolean(node.children?.length);
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

  return (
    <div ref={setNodeRef} style={style} className="select-none border-b border-black/10 last:border-b-0">
      <div
        className={`flex w-full min-h-[40px] items-center gap-2 px-2 py-2 text-xs font-medium tracking-wide shadow-sm ${node.barClass ?? ''} ${
          depth > 0 ? 'ml-2 border-l-2 border-zinc-300 pl-2' : ''
        }`}
        style={{
          paddingLeft: `${8 + depth * 14}px`,
          ...(node.bgColor ? { backgroundColor: node.bgColor } : {}),
          ...(node.titleColor ? { color: node.titleColor } : {})
        }}
      >
        <button
          type="button"
          className="touch-none inline-flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded opacity-70 hover:opacity-100 active:cursor-grabbing"
          aria-label={t('desk_drag_handle_aria')}
          title={t('desk_drag_handle_aria')}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 pointer-events-none" aria-hidden />
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
        {hasChildren ? (
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left uppercase transition-opacity hover:opacity-95"
            onClick={() => toggle(node.id)}
            aria-expanded={open}
          >
            {node.label}
          </button>
        ) : (
          <span className="min-w-0 flex-1 truncate uppercase">{node.label}</span>
        )}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggle(node.id);
            }}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-current opacity-80 hover:opacity-100"
            aria-label={open ? t('collapse') : t('expand')}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
        ) : null}
      </div>
      {hasChildren && open ? (
        <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
          {node.children!.map((child) => (
            <SortableDeskRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
            />
          ))}
        </SortableContext>
      ) : null}
    </div>
  );
}

export default function DeskUtilityList({
  variant = 'live',
  nodes
}: {
  /** `live`: load from `/api/my-desk`, persist reorder. `demo`: static `nodes` or built-in demo. */
  variant?: 'live' | 'demo';
  nodes?: DeskUtilityNode[];
}) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [items, setItems] = useState<DeskUtilityNode[]>(
    variant === 'demo' ? (nodes ?? DEMO_DESK_UTILITY_TREE) : []
  );
  const [loading, setLoading] = useState(variant === 'live');

  const fetchItems = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    const response = await fetch('/api/my-desk', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error('Failed to load desk list');
    }
    const data = (await response.json()) as { items?: ApiMyDeskNode[] };
    setItems((data.items ?? []).map(mapApiToDeskUtility));
  }, []);

  useEffect(() => {
    if (variant !== 'demo') {
      return;
    }
    setItems(nodes ?? DEMO_DESK_UTILITY_TREE);
    setLoading(false);
  }, [variant, nodes]);

  useEffect(() => {
    if (variant !== 'live') {
      return;
    }
    const run = async () => {
      try {
        setLoading(true);
        await fetchItems();
      } catch (e) {
        console.error('DeskUtilityList load failed:', e);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [variant, fetchItems]);

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const rootIds = items.map((n) => n.id);

  const onDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) {
        return;
      }
      const activeId = String(active.id);
      const overId = String(over.id);

      if (variant !== 'live') {
        setItems((prev) => {
          const next = reorderInTree(prev, activeId, overId);
          return next ?? prev;
        });
        return;
      }

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
      const response = await fetch('/api/my-desk/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          parentId: activeCtx.parentId,
          orderedIds: nextSiblingIds
        })
      });
      if (!response.ok) {
        await fetchItems();
      }
    },
    [fetchItems, items, variant]
  );

  return (
    <div className="w-full overflow-hidden rounded border border-zinc-300 bg-white shadow-sm">
      <div className="bg-[#2563eb] px-3 py-2.5 text-sm font-semibold uppercase tracking-wide text-white">
        {t('desk_utility_list_title')}
      </div>
      {loading ? (
        <div className="px-4 py-6 text-sm text-zinc-500">{t('desk_utility_list_loading')}</div>
      ) : items.length === 0 ? (
        <div className="px-4 py-6 text-sm text-zinc-500">{t('desk_utility_list_empty')}</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={rootIds} strategy={verticalListSortingStrategy}>
            {items.map((node) => (
              <SortableDeskRow key={node.id} node={node} depth={0} expanded={expanded} toggle={toggle} />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
