'use client';

import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Settings,
  Trash2,
} from 'lucide-react';
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
import ClubWebsiteTopicSettingsFormModal from '@/components/club/websiteSettings/ClubWebsiteTopicSettingsFormModal';
import {
  buildFriendListLayout,
  LEGACY_SIDEBAR_ROW,
  LEGACY_SIDEBAR_ROW_NESTED,
  LEGACY_STATUS_OFF,
  LEGACY_STATUS_ON,
  type FriendListRow,
  type SidebarTopicStatus,
} from '@/components/club/websiteSettings/clubWebsiteSettingsSidebarData';

function StatusSquare({
  status,
  compact = false,
}: {
  status: SidebarTopicStatus;
  compact?: boolean;
}) {
  const size = compact ? 9 : 11;
  return (
    <span
      className="inline-block shrink-0 rounded-none border border-zinc-300/90"
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        backgroundColor: status === 'on' ? LEGACY_STATUS_ON : LEGACY_STATUS_OFF,
      }}
      aria-hidden
    />
  );
}

/** Nested sub-lists: narrower width, flush to the right edge (legacy MY DESK style). */
function FriendListNestedGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="friends-list-nested ml-auto mr-0 w-[90%] min-w-0 space-y-0">{children}</div>
  );
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
  const { segments } = buildFriendListLayout(rows);
  return Object.fromEntries(
    segments.filter((s) => s.nested.length > 0).map((s) => [s.peer.id, true])
  );
}

function FriendListRowShell({
  children,
  className = '',
  size = 'default',
  active = false,
  onClick,
  onMouseEnter,
}: {
  children: React.ReactNode;
  className?: string;
  /** Nested sub-rows are shorter and sit in a narrower inset block. */
  size?: 'default' | 'nested';
  active?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
}) {
  const nested = size === 'nested';
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
      className={`flex w-full items-center border border-zinc-400/90 text-white ${nested ? 'min-h-[20px] px-1.5 py-0.5 text-[10px] leading-tight' : 'min-h-[28px] px-2 py-1 text-xs'} ${active ? 'brightness-125 ring-1 ring-inset ring-white/25' : ''} ${onClick ? 'cursor-pointer hover:brightness-110' : ''} ${className}`}
      style={{ backgroundColor: nested ? LEGACY_SIDEBAR_ROW_NESTED : LEGACY_SIDEBAR_ROW }}
    >
      {children}
    </div>
  );
}

function FriendListActionToolbar({
  variant,
  status,
  onToggleStatus,
  onDelete,
  onEdit,
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  onSettings,
  showDelete = true,
  showReorder = true,
  showDocument = true,
  showSettings = true,
  showStatusToggle = false,
  compact = false,
}: {
  variant: 'root' | 'sub';
  status: SidebarTopicStatus;
  onToggleStatus: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onSettings: () => void;
  showDelete?: boolean;
  showReorder?: boolean;
  showDocument?: boolean;
  showSettings?: boolean;
  /** Show green/red square at end of toolbar (parent rows on hover). */
  showStatusToggle?: boolean;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const iconBtn = compact
    ? 'flex h-5 w-5 shrink-0 items-center justify-center text-white/95 hover:bg-white/15'
    : 'flex h-6 w-6 shrink-0 items-center justify-center text-white/95 hover:bg-white/15';
  const iconSize = compact ? 'h-3 w-3' : 'h-3.5 w-3.5';
  const chevronSize = compact ? 'h-2 w-2' : 'h-2.5 w-2.5';
  const reorderBtn = compact
    ? 'flex h-2.5 w-5 shrink-0 items-center justify-center text-amber-400 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30'
    : 'flex h-3 w-6 shrink-0 items-center justify-center text-amber-400 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30';

  return (
    <div
      className="flex shrink-0 items-center gap-px"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="toolbar"
      aria-label={t('club_friends_list_toolbar_aria')}
    >
      {showDelete ? (
        <button type="button" className={iconBtn} onClick={onDelete} aria-label={t('btn_delete')}>
          <Trash2 className={iconSize} />
        </button>
      ) : null}
      {showReorder ? (
        <div
          className="flex shrink-0 flex-col items-center justify-center"
          role="group"
          aria-label={t('club_friends_reorder_aria')}
        >
          <button
            type="button"
            className={reorderBtn}
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label={t('club_friends_move_up_aria')}
          >
            <ChevronUp className={chevronSize} strokeWidth={3} />
          </button>
          <button
            type="button"
            className={reorderBtn}
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label={t('club_friends_move_down_aria')}
          >
            <ChevronDown className={chevronSize} strokeWidth={3} />
          </button>
        </div>
      ) : null}
      {showDocument ? (
        <button type="button" className={iconBtn} onClick={onEdit} aria-label={t('club_friends_edit_content_aria')}>
          <FileText className={iconSize} />
        </button>
      ) : null}
      {showSettings ? (
        <button
          type="button"
          className={iconBtn}
          onClick={onSettings}
          aria-label={t('sidebar_options')}
        >
          <Settings className={iconSize} />
        </button>
      ) : null}
      {variant === 'root' || showStatusToggle ? (
        <button
          type="button"
          className={`ml-0.5 flex shrink-0 items-center justify-center ${compact ? 'h-5 w-5' : 'h-6 w-6'}`}
          onClick={onToggleStatus}
          aria-label={t('club_website_toggle_visibility')}
        >
          <StatusSquare status={status} compact={compact} />
        </button>
      ) : null}
    </div>
  );
}

function FriendRowStatusZone({
  rowId,
  onActivate,
  compact = false,
  expanded = false,
  children,
}: {
  rowId: string;
  onActivate: (rowId: string) => void;
  compact?: boolean;
  /** Wider hit area when chevron + toolbar are visible. */
  expanded?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-end gap-0.5 py-0.5 pl-1 ${
        expanded ? 'min-w-[10.5rem]' : compact ? 'min-w-[4.25rem]' : 'min-w-[5.5rem]'
      }`}
      onMouseEnter={() => onActivate(rowId)}
      onFocus={() => onActivate(rowId)}
    >
      {children}
    </div>
  );
}

export default function ClubWebsiteFriendListSection({
  selectedTopicId,
  onSelectTopic,
  items,
  adminMode = true,
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

  const layout = useMemo(() => buildFriendListLayout(rows), [rows]);

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
    options?: { showStatusToggle?: boolean; showDelete?: boolean; showDocument?: boolean }
  ) => {
    const isActive = adminMode && activeToolbarRowId === row.id;
    if (isActive) {
      const moveAvailability = getFriendItemMoveAvailability(items, row.id);
      return (
        <FriendListActionToolbar
          variant={variant}
          status={row.status}
          compact={compact}
          showDelete={options?.showDelete ?? row.id !== 'friends-root'}
          showReorder={variant === 'sub'}
          showDocument={options?.showDocument ?? (variant === 'sub' || row.id === 'friends-root')}
          showSettings
          showStatusToggle={options?.showStatusToggle ?? variant === 'root'}
          canMoveUp={moveAvailability.up}
          canMoveDown={moveAvailability.down}
          onToggleStatus={() => onToggleActivated(row.id)}
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
          className={`flex items-center justify-center ${compact ? 'h-5 w-5' : 'h-7 w-7'}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleActivated(row.id);
          }}
          aria-label={t('club_website_toggle_visibility')}
        >
          <StatusSquare status={row.status} compact={compact} />
        </button>
      ) : (
        <span className={`flex items-center justify-center ${compact ? 'h-5 w-5' : 'h-7 w-7'}`}>
          <StatusSquare status={row.status} compact={compact} />
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
        className={`justify-between gap-0.5 ${!row.label && !nested ? 'min-h-[24px]' : ''}`}
        onClick={() => row.label.trim() && onSelectTopic(row.id, row.label)}
      >
        <span
          className={`min-w-0 flex-1 ${nested ? 'leading-tight' : 'leading-snug'} ${
            selectedTopicId === row.id && row.label ? 'font-semibold underline' : ''
          }`}
        >
          {row.label || '\u00A0'}
        </span>
        <FriendRowStatusZone
          rowId={row.id}
          onActivate={activateToolbar}
          compact={nested}
          expanded={isActive}
        >
          {expandControl && isActive ? (
            <FriendListExpandChevron
              open={expandControl.open}
              onToggle={expandControl.onToggle}
              compact={nested}
            />
          ) : null}
          {renderStatusOrToolbar(withStatus, variant, nested, {
            showStatusToggle: Boolean(expandControl),
          })}
        </FriendRowStatusZone>
      </FriendListRowShell>
    );
  };

  const root = rowById['friends-root'];

  return (
    <div
      className="friends-list-block flex w-full flex-col items-end"
      onMouseLeave={() => setActiveToolbarRowId(null)}
    >
      <FriendListRowShell
        className="w-full justify-between gap-0.5 font-semibold"
        active={activeToolbarRowId === 'friends-root'}
        onClick={() => {
          onSelectTopic('friends-root', t('club_website_list_of_friends'));
          if (adminMode) {
            onEditContent('friends-root', t('club_website_list_of_friends'));
          }
        }}
      >
        <span className={`min-w-0 flex-1 ${selectedTopicId === 'friends-root' ? 'underline' : ''}`}>
          {t('club_website_list_of_friends')}
        </span>
        <FriendRowStatusZone
          rowId="friends-root"
          onActivate={activateToolbar}
          expanded={activeToolbarRowId === 'friends-root'}
        >
          {layout.rootNested.length > 0 && activeToolbarRowId === 'friends-root' ? (
            <FriendListExpandChevron
              open={childrenOpen}
              onToggle={() => setChildrenOpen((v) => !v)}
            />
          ) : null}
          {root ? renderStatusOrToolbar(root, 'root', false, { showStatusToggle: true, showDelete: false, showDocument: true }) : null}
        </FriendRowStatusZone>
      </FriendListRowShell>

      {childrenOpen && layout.rootNested.length > 0 ? (
        <FriendListNestedGroup>
          {layout.rootNested.map((row) => renderFriendRow(row, 'sub'))}
        </FriendListNestedGroup>
      ) : null}

      {layout.segments.map(({ peer, nested }) => {
        const hasNested = nested.length > 0;
        const peerOpen = segmentOpen[peer.id] ?? true;
        return (
          <div key={peer.id} className="friends-list-segment flex w-full flex-col items-end">
            <div className="w-full">
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
            </div>
            {hasNested && peerOpen ? (
              <FriendListNestedGroup>{nested.map((row) => renderFriendRow(row, 'sub'))}</FriendListNestedGroup>
            ) : null}
          </div>
        );
      })}
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
          onDeleteContent={
            getFriendItemSettingsVariant(settingsItem) === 'subtopic'
              ? () => {
                  if (window.confirm(t('club_subtopic_delete_content_confirm'))) {
                    onUpdateItem(settingsItem.id, clearClubWebsiteFriendItemContent());
                  }
                }
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
