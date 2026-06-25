'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ClubWebsiteFriendItem } from '@/lib/clubWebsiteFriendList';
import {
  canFriendItemHaveSubtopics,
  clearClubWebsiteFriendItemContent,
  filterClubWebsiteFriendItemsForMembers,
  friendItemToSettingsFormItem,
  friendItemsToRows,
  getFriendItemDeleteConfirmKey,
  getFriendItemIdsForRemoval,
  getFriendItemMoveAvailability,
  getFriendItemSettingsVariant,
} from '@/lib/clubWebsiteFriendList';
import {
  clearClubWebsiteTopicContent,
  topicToSettingsFormItem,
  type ClubWebsiteTopic,
} from '@/lib/clubWebsiteTopics';
import ClubWebsiteTopicSettingsFormModal from '@/components/club/websiteSettings/ClubWebsiteTopicSettingsFormModal';
import {
  buildFriendListLayout,
  LEGACY_SIDEBAR_ROW,
  type FriendListRow,
  type SidebarTopicStatus,
} from '@/components/club/websiteSettings/clubWebsiteSettingsSidebarData';
import {
  FriendListActionToolbar,
  FriendListStatusSquare,
  FriendRowStatusZone,
} from '@/components/club/websiteSettings/ClubWebsiteFriendListToolbar';

function StatusSquare({ status }: { status: SidebarTopicStatus }) {
  return <FriendListStatusSquare status={status} />;
}

/** Groups nested rows; full width so status buttons stay on the same right rail. */
function FriendListNestedGroup({ children }: { children: React.ReactNode }) {
  return <div className="friends-list-nested w-full space-y-0">{children}</div>;
}

function FriendListExpandChevron({
  open,
  onToggle,
  compact = false,
}: {
  open: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      className={`flex shrink-0 items-center justify-center text-white/95 hover:bg-white/15 ${compact ? 'h-5 w-5' : 'h-7 w-7'}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-expanded={open}
      aria-label={open ? t('collapse') : t('expand')}
    >
      <ChevronDown
        className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} transition-transform ${open ? 'rotate-180' : ''}`}
      />
    </button>
  );
}

function initialSegmentOpen(rows: FriendListRow[]): Record<string, boolean> {
  if (!rows.some((row) => row.id === 'friends-root')) return {};
  const { segments } = buildFriendListLayout(rows);
  return Object.fromEntries(
    segments.filter((s) => s.nested.length > 0).map((s) => [s.peer.id, true])
  );
}

function FriendListRowShell({
  label,
  trailing,
  className = '',
  size = 'default',
  active = false,
  onClick,
  onMouseEnter,
}: {
  label: React.ReactNode;
  trailing: React.ReactNode;
  className?: string;
  /** Nested sub-rows are shorter with an inset label block (legacy MY DESK style). */
  size?: 'default' | 'nested';
  active?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
}) {
  const nested = size === 'nested';
  const labelClass = nested
    ? 'min-h-[20px] px-2 py-0.5 text-[10px] leading-tight'
    : 'min-h-[28px] px-2 py-1 text-xs leading-snug';

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`flex w-full items-stretch border border-zinc-400/90 text-white ${active ? 'brightness-125 ring-1 ring-inset ring-white/25' : ''} ${onClick ? 'cursor-pointer hover:brightness-110' : ''} ${className}`}
      style={{ backgroundColor: LEGACY_SIDEBAR_ROW }}
    >
      <div className="flex min-w-0 flex-1 items-stretch">
        {nested ? <div className="w-[10%] shrink-0" aria-hidden /> : null}
        <div className={`flex min-w-0 flex-1 items-center text-left text-white ${labelClass}`}>
          {label}
        </div>
      </div>
      <div className="flex shrink-0 items-center pr-2">{trailing}</div>
    </div>
  );
}

export default function ClubWebsiteFriendListSection({
  selectedTopicId,
  onSelectTopic,
  items,
  adminMode = true,
  customTopics = [],
  onSelectCustomTopic,
  onToggleCustomTopicActivated,
  onDeleteCustomTopic,
  onUpdateCustomTopic,
  onCustomTopicEditContent,
  onToggleActivated,
  onDelete,
  onMove,
  onUpdateItem,
  onEditContent,
  onAddSubtopic,
}: {
  selectedTopicId: string;
  onSelectTopic: (id: string, label: string) => void;
  items: ClubWebsiteFriendItem[];
  /** Admin/staff only — hover toolbars hidden for members. */
  adminMode?: boolean;
  customTopics?: ClubWebsiteTopic[];
  onSelectCustomTopic?: (id: string) => void;
  onToggleCustomTopicActivated?: (id: string) => void;
  onDeleteCustomTopic?: (id: string) => void;
  onUpdateCustomTopic?: (id: string, patch: Partial<ClubWebsiteTopic>) => void;
  onCustomTopicEditContent?: (id: string) => void;
  onToggleActivated: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onUpdateItem: (id: string, patch: Partial<ClubWebsiteFriendItem>) => void;
  onEditContent: (id: string, label: string) => void;
  onAddSubtopic?: (parentId: string, name: string) => void;
}) {
  const { t } = useLanguage();
  const allRows = useMemo(() => friendItemsToRows(items), [items]);
  const rows = useMemo(() => {
    if (adminMode) return allRows;
    const visibleIds = new Set(filterClubWebsiteFriendItemsForMembers(items).map((i) => i.id));
    return allRows.filter((row) => visibleIds.has(row.id));
  }, [allRows, items, adminMode]);
  const [childrenOpen, setChildrenOpen] = useState(true);
  const [segmentOpen, setSegmentOpen] = useState<Record<string, boolean>>(() =>
    initialSegmentOpen(rows)
  );
  const [activeToolbarRowId, setActiveToolbarRowId] = useState<string | null>(null);
  const [settingsItemId, setSettingsItemId] = useState<string | null>(null);
  const [settingsCustomTopicId, setSettingsCustomTopicId] = useState<string | null>(null);

  const hasFriendListRoot = rows.some((row) => row.id === 'friends-root');
  const layout = useMemo(
    () => (hasFriendListRoot ? buildFriendListLayout(rows) : null),
    [hasFriendListRoot, rows]
  );

  const itemById = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);

  const toggleSegmentOpen = (peerId: string) => {
    setSegmentOpen((prev) => ({ ...prev, [peerId]: !(prev[peerId] ?? true) }));
  };

  const rowsWithStatus = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        status: (itemById[row.id]?.activated ? 'on' : 'off') as SidebarTopicStatus,
      })),
    [rows, itemById]
  );

  const rowById = useMemo(
    () => Object.fromEntries(rowsWithStatus.map((r) => [r.id, r])),
    [rowsWithStatus]
  );

  const activateToolbar = (rowId: string) => {
    if (adminMode) setActiveToolbarRowId(rowId);
  };

  const settingsItem = settingsItemId ? itemById[settingsItemId] : null;
  const settingsCustomTopic = settingsCustomTopicId
    ? customTopics.find((topic) => topic.id === settingsCustomTopicId)
    : null;

  const renderCustomTopicStatusOrToolbar = (topic: ClubWebsiteTopic) => {
    const status: SidebarTopicStatus = topic.activated ? 'on' : 'off';
    const isActive = adminMode && activeToolbarRowId === topic.id;

    if (isActive) {
      return (
        <FriendListActionToolbar
          showDelete
          showReorder={false}
          showDocument
          showSettings
          onDelete={() => {
            if (!window.confirm(t('club_topic_delete_confirm'))) return;
            onDeleteCustomTopic?.(topic.id);
            if (settingsCustomTopicId === topic.id) setSettingsCustomTopicId(null);
            setActiveToolbarRowId(null);
          }}
          onEdit={() => {
            setActiveToolbarRowId(null);
            onCustomTopicEditContent?.(topic.id);
          }}
          onMoveUp={() => {}}
          onMoveDown={() => {}}
          onSettings={() => setSettingsCustomTopicId(topic.id)}
        />
      );
    }

    return adminMode ? (
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center"
        onClick={(e) => {
          e.stopPropagation();
          onToggleCustomTopicActivated?.(topic.id);
        }}
        aria-label={t('club_website_toggle_visibility')}
      >
        <StatusSquare status={status} />
      </button>
    ) : (
      <span className="flex h-7 w-7 items-center justify-center">
        <StatusSquare status={status} />
      </span>
    );
  };

  const selectRowContent = (row: FriendListRow) => {
    const label = row.id === 'friends-root' ? t('club_website_list_of_friends') : row.label;
    if (!row.label.trim() && row.id !== 'friends-root') return;
    const item = itemById[row.id];
    if (item?.contentDisplayMode === 'link') {
      onUpdateItem(row.id, { contentDisplayMode: 'editor' });
    }
    setActiveToolbarRowId(null);
    onEditContent(row.id, label);
    onSelectTopic(row.id, label);
  };

  const renderStatusOrToolbar = (
    row: FriendListRow & { status: SidebarTopicStatus },
    variant: 'root' | 'sub',
    compact = false,
    options?: { showDelete?: boolean; showDocument?: boolean }
  ) => {
    const isActive = adminMode && activeToolbarRowId === row.id;
    if (isActive) {
      const moveAvailability = getFriendItemMoveAvailability(items, row.id);
      return (
        <FriendListActionToolbar
          compact={compact}
          showDelete={options?.showDelete ?? row.id !== 'friends-root'}
          showReorder={variant === 'sub'}
          showDocument={options?.showDocument ?? (variant === 'sub' || row.id === 'friends-root')}
          showSettings
          canMoveUp={moveAvailability.up}
          canMoveDown={moveAvailability.down}
          onDelete={() => {
            if (row.id === 'friends-root') return;
            const confirmKey = getFriendItemDeleteConfirmKey(items, row.id);
            if (!window.confirm(t(confirmKey))) return;
            const removedIds = getFriendItemIdsForRemoval(items, row.id);
            onDelete(row.id);
            if (settingsItemId && removedIds.includes(settingsItemId)) {
              setSettingsItemId(null);
            }
          }}
          onEdit={() => selectRowContent(row)}
          onMoveUp={() => onMove(row.id, 'up')}
          onMoveDown={() => onMove(row.id, 'down')}
          onSettings={() => setSettingsItemId(row.id)}
        />
      );
    }
    return (
      adminMode ? (
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            onToggleActivated(row.id);
          }}
          aria-label={t('club_website_toggle_visibility')}
        >
          <StatusSquare status={row.status} />
        </button>
      ) : (
        <span className="flex h-7 w-7 items-center justify-center">
          <StatusSquare status={row.status} />
        </span>
      )
    );
  };

  const renderFriendRow = (
    row: FriendListRow,
    variant: 'root' | 'sub',
    options?: { expandControl?: { open: boolean; onToggle: () => void } }
  ) => {
    const withStatus = rowById[row.id];
    if (!withStatus) return null;
    const isActive = activeToolbarRowId === row.id;
    const nested = row.indent;
    const expandControl = options?.expandControl;

    return (
      <FriendListRowShell
        key={row.id}
        size={nested ? 'nested' : 'default'}
        active={isActive}
        className={!row.label && !nested ? '[&>div:first-child>div:last-child]:min-h-[24px]' : ''}
        onClick={() => row.label.trim() && onSelectTopic(row.id, row.label)}
        label={
          <span
            className={`block min-w-0 truncate ${nested ? 'leading-tight' : 'leading-snug'} ${
              selectedTopicId === row.id && row.label ? 'font-semibold underline' : ''
            }`}
          >
            {row.label || '\u00A0'}
          </span>
        }
        trailing={
          <FriendRowStatusZone rowId={row.id} onActivate={activateToolbar} className="w-[10.5rem] py-0.5">
            {expandControl && isActive ? (
              <FriendListExpandChevron
                open={expandControl.open}
                onToggle={expandControl.onToggle}
                compact={nested}
              />
            ) : null}
            {renderStatusOrToolbar(withStatus, variant, nested)}
          </FriendRowStatusZone>
        }
      />
    );
  };

  const root = rowById['friends-root'];
  const hasTopics = customTopics.length > 0 || (hasFriendListRoot && layout);

  if (!hasTopics) return null;

  return (
    <div
      className="friends-list-block flex w-full flex-col"
      onMouseLeave={() => setActiveToolbarRowId(null)}
    >
      {customTopics.map((topic) => (
        <FriendListRowShell
          key={topic.id}
          className="font-medium"
          active={activeToolbarRowId === topic.id}
          onClick={() => onSelectCustomTopic?.(topic.id)}
          label={
            <span
              className={`block min-w-0 truncate ${selectedTopicId === topic.id ? 'font-bold underline' : ''}`}
            >
              {topic.name}
            </span>
          }
          trailing={
            <FriendRowStatusZone rowId={topic.id} onActivate={activateToolbar} className="w-[10.5rem] py-0.5">
              {renderCustomTopicStatusOrToolbar(topic)}
            </FriendRowStatusZone>
          }
        />
      ))}

      {hasFriendListRoot && layout ? (
        <>
      <FriendListRowShell
        className="font-semibold"
        active={activeToolbarRowId === 'friends-root'}
        onClick={() => {
          onSelectTopic('friends-root', t('club_website_list_of_friends'));
          if (adminMode) {
            onEditContent('friends-root', t('club_website_list_of_friends'));
          }
        }}
        label={
          <span className={`block min-w-0 truncate ${selectedTopicId === 'friends-root' ? 'underline' : ''}`}>
            {t('club_website_list_of_friends')}
          </span>
        }
        trailing={
          <FriendRowStatusZone rowId="friends-root" onActivate={activateToolbar} className="w-[10.5rem] py-0.5">
            {layout.rootNested.length > 0 && activeToolbarRowId === 'friends-root' ? (
              <FriendListExpandChevron
                open={childrenOpen}
                onToggle={() => setChildrenOpen((v) => !v)}
              />
            ) : null}
            {root
              ? renderStatusOrToolbar(root, 'root', false, {
                  showDelete: false,
                  showDocument: true,
                })
              : null}
          </FriendRowStatusZone>
        }
      />

      {childrenOpen && layout.rootNested.length > 0 ? (
        <FriendListNestedGroup>
          {layout.rootNested.map((row) => renderFriendRow(row, 'sub'))}
        </FriendListNestedGroup>
      ) : null}

      {layout.segments.map(({ peer, nested }) => {
        const hasNested = nested.length > 0;
        const peerOpen = segmentOpen[peer.id] ?? true;
        return (
          <div key={peer.id} className="friends-list-segment w-full">
            {renderFriendRow(
                peer,
                'sub',
                hasNested
                  ? {
                      expandControl: {
                        open: peerOpen,
                        onToggle: () => toggleSegmentOpen(peer.id),
                      },
                    }
                  : undefined
            )}
            {hasNested && peerOpen ? (
              <FriendListNestedGroup>{nested.map((row) => renderFriendRow(row, 'sub'))}</FriendListNestedGroup>
            ) : null}
          </div>
        );
      })}
        </>
      ) : null}
      {settingsItem ? (
        <ClubWebsiteTopicSettingsFormModal
          item={friendItemToSettingsFormItem(settingsItem)}
          open
          variant={getFriendItemSettingsVariant(settingsItem)}
          onClose={() => setSettingsItemId(null)}
          onSave={(patch) => onUpdateItem(settingsItem.id, patch)}
          showAddSubtopic={Boolean(onAddSubtopic) && canFriendItemHaveSubtopics(settingsItem)}
          onAddSubtopic={() => {
            const subName = window.prompt(t('club_topic_subtopic_prompt'));
            if (!subName?.trim()) return;
            onAddSubtopic?.(settingsItem.id, subName.trim());
          }}
          onDeleteContent={() => {
            const confirmKey =
              getFriendItemSettingsVariant(settingsItem) === 'subtopic'
                ? 'club_subtopic_delete_content_confirm'
                : 'club_topic_delete_content_confirm';
            if (window.confirm(t(confirmKey))) {
              onUpdateItem(settingsItem.id, clearClubWebsiteFriendItemContent());
              setSettingsItemId(null);
            }
          }}
        />
      ) : null}
      {settingsCustomTopic ? (
        <ClubWebsiteTopicSettingsFormModal
          item={topicToSettingsFormItem(settingsCustomTopic)}
          open
          variant="topic"
          onClose={() => setSettingsCustomTopicId(null)}
          onSave={(patch) => onUpdateCustomTopic?.(settingsCustomTopic.id, patch)}
          onDeleteContent={() => {
            if (!window.confirm(t('club_topic_delete_content_confirm'))) return;
            onUpdateCustomTopic?.(settingsCustomTopic.id, clearClubWebsiteTopicContent());
            setSettingsCustomTopicId(null);
          }}
        />
      ) : null}
    </div>
  );
}
