'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Accessibility,
  AtSign,
  BookOpen,
  ChevronDown,
  CreditCard,
  Landmark,
  type LucideIcon,
  Trophy
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { deskTreeRowInsetStyle } from '@/components/desk/deskTreeDepth';
import { openDeskItemPath, type DeskDisplayMode } from '@/components/desk/deskPathNavigation';

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
  path?: string;
  displayMode?: DeskDisplayMode;
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
    path: node.path?.trim() || undefined,
    displayMode:
      node.displayMode === 'new_label' || node.displayMode === 'central_page'
        ? node.displayMode
        : undefined,
    visible: node.visible,
    children: (node.children ?? []).map(mapApiToDeskUtility)
  };
}

/** Reading/display mode — omit rows hidden in settings (and their descendants). */
function filterVisibleDeskNodes(nodes: DeskUtilityNode[]): DeskUtilityNode[] {
  return nodes
    .filter((node) => node.visible !== false)
    .map((node) => {
      if (!node.children?.length) return node;
      const children = filterVisibleDeskNodes(node.children);
      return children.length > 0 ? { ...node, children } : { ...node, children: undefined };
    });
}

function DeskDisplayRow({
  node,
  depth,
  expanded,
  toggle,
  onPathClick
}: {
  node: DeskUtilityNode;
  depth: number;
  expanded: Record<string, boolean>;
  toggle: (id: string) => void;
  onPathClick: (node: DeskUtilityNode) => void;
}) {
  const { t } = useLanguage();
  const hasChildren = Boolean(node.children?.length);
  const hasPath = Boolean(node.path?.trim());
  const open = expanded[node.id] ?? false;
  const Icon = node.icon ? ICONS[node.icon] : null;
  const faIconClass = node.faIconClass?.trim();
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
    <div style={insetStyle} className="select-none border-b border-black/10 last:border-b-0">
      <div
        className={`flex min-h-[40px] w-full items-center gap-2 px-2 py-2 text-xs font-medium tracking-wide shadow-sm ${node.barClass ?? ''}`}
        style={{
          ...(node.bgColor ? { backgroundColor: node.bgColor } : {}),
          ...(node.titleColor ? { color: node.titleColor } : {})
        }}
      >
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
      {hasChildren && open
        ? node.children!.map((child) => (
            <DeskDisplayRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              onPathClick={onPathClick}
            />
          ))
        : null}
    </div>
  );
}

export default function DeskUtilityList({
  variant = 'live',
  nodes,
  clubId,
  titleKey = 'desk_utility_list_title',
}: {
  /** `live`: load from API. `demo`: static `nodes` or built-in demo. */
  variant?: 'live' | 'demo';
  nodes?: DeskUtilityNode[];
  /** When set, loads Club Desk for this club via `/api/club-desk`. */
  clubId?: string | null;
  titleKey?: string;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [items, setItems] = useState<DeskUtilityNode[]>(
    variant === 'demo' ? (nodes ?? DEMO_DESK_UTILITY_TREE) : []
  );
  const [loading, setLoading] = useState(variant === 'live');

  const fetchItems = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    const url = clubId
      ? `/api/club-desk?clubId=${encodeURIComponent(clubId)}`
      : '/api/my-desk';
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error('Failed to load desk list');
    }
    const data = (await response.json()) as { items?: ApiMyDeskNode[] };
    setItems((data.items ?? []).map(mapApiToDeskUtility));
  }, [clubId]);

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
    if (clubId === null) {
      setItems([]);
      setLoading(false);
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
  }, [variant, fetchItems, clubId]);

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const onPathClick = useCallback(
    (node: DeskUtilityNode) => {
      if (!node.path?.trim()) return;
      openDeskItemPath(node.path, node.displayMode, router);
    },
    [router]
  );

  const displayItems = useMemo(() => filterVisibleDeskNodes(items), [items]);

  return (
    <div className="w-full overflow-hidden rounded border border-zinc-300 bg-white shadow-sm">
      <div className="bg-[#2563eb] px-3 py-2.5 text-sm font-semibold uppercase tracking-wide text-white">
        {t(titleKey)}
      </div>
      {loading ? (
        <div className="px-4 py-6 text-sm text-zinc-500">{t('desk_utility_list_loading')}</div>
      ) : displayItems.length === 0 ? (
        <div className="px-4 py-6 text-sm text-zinc-500">{t('desk_utility_list_empty')}</div>
      ) : (
        displayItems.map((node) => (
          <DeskDisplayRow
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            toggle={toggle}
            onPathClick={onPathClick}
          />
        ))
      )}
    </div>
  );
}
