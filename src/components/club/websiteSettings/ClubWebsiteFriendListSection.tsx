'use client';

import { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  ChevronDown,
  FileText,
  Settings,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  FRIEND_LIST_ROWS,
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
  onReorder,
  onSettings,
  showDelete = true,
  showStatusToggle = false,
  compact = false,
}: {
  variant: 'root' | 'sub';
  status: SidebarTopicStatus;
  onToggleStatus: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onReorder: () => void;
  onSettings: () => void;
  showDelete?: boolean;
  /** Show green/red square at end of toolbar (parent rows on hover). */
  showStatusToggle?: boolean;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const iconBtn = compact
    ? 'flex h-5 w-5 shrink-0 items-center justify-center text-white/95 hover:bg-white/15'
    : 'flex h-6 w-6 shrink-0 items-center justify-center text-white/95 hover:bg-white/15';
  const iconSize = compact ? 'h-3 w-3' : 'h-3.5 w-3.5';
  const reorderClass = variant === 'sub' ? `${iconSize} text-amber-400` : iconSize;

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
      <button type="button" className={iconBtn} onClick={onReorder} aria-label={t('club_friends_reorder_aria')}>
        <ArrowUpDown className={reorderClass} />
      </button>
      <button type="button" className={iconBtn} onClick={onEdit} aria-label={t('club_friends_edit_content_aria')}>
        <FileText className={iconSize} />
      </button>
      <button
        type="button"
        className={iconBtn}
        onClick={onSettings}
        aria-label={t('sidebar_options')}
      >
        <Settings className={iconSize} />
      </button>
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
}: {
  selectedTopicId: string;
  onSelectTopic: (id: string, label: string) => void;
}) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<FriendListRow[]>(() => [...FRIEND_LIST_ROWS]);
  const [statuses, setStatuses] = useState<Record<string, SidebarTopicStatus>>(() =>
    Object.fromEntries(FRIEND_LIST_ROWS.map((r) => [r.id, r.status]))
  );
  const [childrenOpen, setChildrenOpen] = useState(true);
  const [segmentOpen, setSegmentOpen] = useState<Record<string, boolean>>(() =>
    initialSegmentOpen(FRIEND_LIST_ROWS)
  );
  const [activeToolbarRowId, setActiveToolbarRowId] = useState<string | null>(null);

  const layout = useMemo(() => buildFriendListLayout(rows), [rows]);

  const toggleSegmentOpen = (peerId: string) => {
    setSegmentOpen((prev) => ({ ...prev, [peerId]: !(prev[peerId] ?? true) }));
  };

  const rowsWithStatus = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        status: statuses[row.id] ?? row.status,
      })),
    [rows, statuses]
  );

  const rowById = useMemo(
    () => Object.fromEntries(rowsWithStatus.map((r) => [r.id, r])),
    [rowsWithStatus]
  );

  const activateToolbar = (rowId: string) => setActiveToolbarRowId(rowId);

  const toggleStatus = (id: string) => {
    setStatuses((prev) => ({
      ...prev,
      [id]: prev[id] === 'on' ? 'off' : 'on',
    }));
  };

  const deleteRow = (id: string) => {
    if (id === 'friends-root') return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    setStatuses((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (selectedTopicId === id) {
      onSelectTopic('friends-root', t('club_website_list_of_friends'));
    }
  };

  const selectRowContent = (row: FriendListRow) => {
    if (!row.label.trim()) {
      onSelectTopic('friends-root', t('club_website_list_of_friends'));
      return;
    }
    onSelectTopic(row.id, row.label);
  };

  const renderStatusOrToolbar = (
    row: FriendListRow & { status: SidebarTopicStatus },
    variant: 'root' | 'sub',
    compact = false,
    options?: { showStatusToggle?: boolean }
  ) => {
    const isActive = activeToolbarRowId === row.id;
    if (isActive) {
      return (
        <FriendListActionToolbar
          variant={variant}
          status={row.status}
          compact={compact}
          showDelete={variant === 'sub'}
          showStatusToggle={options?.showStatusToggle ?? variant === 'root'}
          onToggleStatus={() => toggleStatus(row.id)}
          onDelete={() => deleteRow(row.id)}
          onEdit={() => selectRowContent(row)}
          onReorder={() => undefined}
          onSettings={() => undefined}
        />
      );
    }
    return (
      <button
        type="button"
        className={`flex items-center justify-center ${compact ? 'h-5 w-5' : 'h-7 w-7'}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleStatus(row.id);
        }}
        aria-label={t('club_website_toggle_visibility')}
      >
        <StatusSquare status={row.status} compact={compact} />
      </button>
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
        onClick={() => onSelectTopic('friends-root', t('club_website_list_of_friends'))}
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
          {root ? renderStatusOrToolbar(root, 'root', false, { showStatusToggle: true }) : null}
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
    </div>
  );
}
