'use client';

import { ChevronDown, ChevronUp, FileText, Settings, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LEGACY_STATUS_OFF,
  LEGACY_STATUS_ON,
  type SidebarTopicStatus,
} from '@/components/club/websiteSettings/clubWebsiteSettingsSidebarData';

export function FriendListStatusSquare({ status }: { status: SidebarTopicStatus }) {
  return (
    <span
      className="inline-block shrink-0 rounded-none border border-zinc-300/90"
      style={{
        width: 11,
        height: 11,
        minWidth: 11,
        minHeight: 11,
        backgroundColor: status === 'on' ? LEGACY_STATUS_ON : LEGACY_STATUS_OFF,
      }}
      aria-hidden
    />
  );
}

export function FriendRowStatusZone({
  rowId,
  onActivate,
  children,
  className = '',
}: {
  rowId: string;
  onActivate: (rowId: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-end gap-0.5 ${className}`}
      onMouseEnter={() => onActivate(rowId)}
      onFocus={() => onActivate(rowId)}
    >
      {children}
    </div>
  );
}

export function FriendListActionToolbar({
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
  compact = false,
}: {
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
    </div>
  );
}
