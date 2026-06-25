'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Mail } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ClubDashboardFriendTopicEntry } from '@/lib/clubWebsiteFriendList';
import {
  canFriendItemHaveSubtopics,
  clearClubWebsiteFriendItemContent,
  friendItemToSettingsFormItem,
  getFriendItemDeleteConfirmKey,
  getFriendItemIdsForRemoval,
  getFriendItemMoveAvailability,
  getFriendItemSettingsVariant,
  type ClubWebsiteFriendItem,
} from '@/lib/clubWebsiteFriendList';
import {
  clearClubWebsiteTopicContent,
  topicToSettingsFormItem,
  type ClubWebsiteTopic,
} from '@/lib/clubWebsiteTopics';
import {
  clubWebsiteDisplayTopicUrl,
  clubWebsiteFriendEditorUrl,
  clubWebsiteTopicEditorUrl,
} from '@/lib/clubWebsiteSettingsPaths';
import ClubWebsiteTopicSettingsFormModal from '@/components/club/websiteSettings/ClubWebsiteTopicSettingsFormModal';
import {
  FriendListActionToolbar,
  FriendListStatusSquare,
  FriendRowStatusZone,
} from '@/components/club/websiteSettings/ClubWebsiteFriendListToolbar';

function ExpandChevron({
  open,
  onToggle,
  ariaLabel,
  compact = false,
}: {
  open: boolean;
  onToggle: () => void;
  ariaLabel: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={`flex shrink-0 items-center justify-center text-white/90 hover:bg-white/10 ${
        compact ? 'h-5 w-5' : 'h-7 w-7'
      }`}
      aria-expanded={open}
      aria-label={ariaLabel}
    >
      <ChevronDown
        className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} transition-transform ${open ? 'rotate-180' : ''}`}
      />
    </button>
  );
}

type TopicRowProps = {
  rowId: string;
  name: string;
  href: string;
  nested?: boolean;
  activated: boolean;
  showLink: boolean;
  adminMode?: boolean;
  activeToolbarRowId: string | null;
  onActivateToolbar: (rowId: string) => void;
  trailing: React.ReactNode;
  expandControl?: { open: boolean; onToggle: () => void; ariaLabel: string };
};

function TopicRow({
  rowId,
  name,
  href,
  nested = false,
  showLink,
  adminMode,
  activeToolbarRowId,
  onActivateToolbar,
  trailing,
  expandControl,
}: TopicRowProps) {
  const isActive = adminMode && activeToolbarRowId === rowId;
  const rowClass = `flex min-h-[40px] w-full items-center gap-2 border-b border-black/25 py-2 text-left text-white transition-colors hover:bg-zinc-700/90 ${
    nested ? 'pl-8 pr-3 text-[13px]' : 'px-3'
  } ${isActive ? 'brightness-125 ring-1 ring-inset ring-white/20' : ''}`;

  const label = (
    <>
      <Mail className={`shrink-0 opacity-90 ${nested ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
      <span className={`min-w-0 flex-1 truncate ${nested ? '' : 'font-medium'}`}>{name}</span>
    </>
  );

  const labelClass = 'flex min-w-0 flex-1 items-center gap-2';

  return (
    <div className={`${rowClass} ${showLink ? '' : 'text-white/90'}`}>
      {showLink ? (
        <Link href={href} className={`${labelClass} text-white no-underline hover:underline`}>
          {label}
        </Link>
      ) : (
        <div className={labelClass}>{label}</div>
      )}
      <FriendRowStatusZone rowId={rowId} onActivate={onActivateToolbar}>
        {expandControl ? (
          <ExpandChevron
            open={expandControl.open}
            onToggle={expandControl.onToggle}
            ariaLabel={expandControl.ariaLabel}
            compact={nested}
          />
        ) : null}
        {trailing}
      </FriendRowStatusZone>
    </div>
  );
}

export default function ClubDashboardTopicsList({
  clubId,
  friendTopics,
  customTopics,
  friendItems = [],
  adminMode = false,
  topicHrefBuilder,
  friendEditorHrefBuilder,
  onToggleFriendActivated,
  onDeleteFriend,
  onMoveFriend,
  onUpdateFriendItem,
  onAddFriendSubtopic,
  onToggleCustomTopicActivated,
  onDeleteCustomTopic,
  onUpdateCustomTopic,
}: {
  clubId?: string;
  friendTopics: ClubDashboardFriendTopicEntry[];
  customTopics: ClubWebsiteTopic[];
  friendItems?: ClubWebsiteFriendItem[];
  adminMode?: boolean;
  /** Override link target (e.g. personal My Topics display URLs). */
  topicHrefBuilder?: (topicId: string) => string;
  friendEditorHrefBuilder?: (friendId: string) => string;
  onToggleFriendActivated?: (id: string) => void;
  onDeleteFriend?: (id: string) => void;
  onMoveFriend?: (id: string, direction: 'up' | 'down') => void;
  onUpdateFriendItem?: (id: string, patch: Partial<ClubWebsiteFriendItem>) => void;
  onAddFriendSubtopic?: (parentId: string, name: string) => void;
  onToggleCustomTopicActivated?: (id: string) => void;
  onDeleteCustomTopic?: (id: string) => void;
  onUpdateCustomTopic?: (id: string, patch: Partial<ClubWebsiteTopic>) => void;
}) {
  const { t } = useLanguage();
  const [segmentOpen, setSegmentOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(friendTopics.map((topic) => [topic.id, true]))
  );
  const [activeToolbarRowId, setActiveToolbarRowId] = useState<string | null>(null);
  const [settingsFriendId, setSettingsFriendId] = useState<string | null>(null);
  const [settingsCustomTopicId, setSettingsCustomTopicId] = useState<string | null>(null);

  if (friendTopics.length === 0 && customTopics.length === 0) return null;

  const topicHref = (id: string) =>
    topicHrefBuilder ? topicHrefBuilder(id) : clubWebsiteDisplayTopicUrl(clubId, id);
  const itemById = Object.fromEntries(friendItems.map((item) => [item.id, item]));

  const toggleSegment = (topicId: string) => {
    setSegmentOpen((prev) => ({ ...prev, [topicId]: !(prev[topicId] ?? true) }));
  };

  const activateToolbar = (rowId: string) => {
    if (adminMode) setActiveToolbarRowId(rowId);
  };

  const settingsFriend = settingsFriendId ? itemById[settingsFriendId] : null;

  const renderFriendStatusOrToolbar = (
    item: ClubWebsiteFriendItem,
    variant: 'root' | 'sub',
    options?: { showDelete?: boolean; showDocument?: boolean; showReorder?: boolean }
  ) => {
    const isActive = adminMode && activeToolbarRowId === item.id;
    if (isActive) {
      const moveAvailability = getFriendItemMoveAvailability(friendItems, item.id);
      return (
        <FriendListActionToolbar
          compact={variant === 'sub'}
          showDelete={options?.showDelete ?? item.id !== 'friends-root'}
          showReorder={options?.showReorder ?? variant === 'sub'}
          showDocument={options?.showDocument ?? (variant === 'sub' || item.id === 'friends-root')}
          showSettings
          canMoveUp={moveAvailability.up}
          canMoveDown={moveAvailability.down}
          onDelete={() => {
            if (item.id === 'friends-root') return;
            const confirmKey = getFriendItemDeleteConfirmKey(friendItems, item.id);
            if (!window.confirm(t(confirmKey))) return;
            const removedIds = getFriendItemIdsForRemoval(friendItems, item.id);
            onDeleteFriend?.(item.id);
            if (settingsFriendId && removedIds.includes(settingsFriendId)) {
              setSettingsFriendId(null);
            }
            setActiveToolbarRowId(null);
          }}
          onEdit={() => {
            setActiveToolbarRowId(null);
            window.open(
              friendEditorHrefBuilder
                ? friendEditorHrefBuilder(item.id)
                : clubWebsiteFriendEditorUrl(item.id),
              '_blank',
              'noopener,noreferrer',
            );
          }}
          onMoveUp={() => onMoveFriend?.(item.id, 'up')}
          onMoveDown={() => onMoveFriend?.(item.id, 'down')}
          onSettings={() => setSettingsFriendId(item.id)}
        />
      );
    }

    return adminMode ? (
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFriendActivated?.(item.id);
        }}
        aria-label={t('club_website_toggle_visibility')}
      >
        <FriendListStatusSquare status={item.activated ? 'on' : 'off'} />
      </button>
    ) : (
      <span className="flex h-7 w-7 items-center justify-center">
        <FriendListStatusSquare status={item.activated ? 'on' : 'off'} />
      </span>
    );
  };

  const renderCustomTopicStatusOrToolbar = (topic: ClubWebsiteTopic) => {
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
            window.open(clubWebsiteTopicEditorUrl(topic.id), '_blank', 'noopener,noreferrer');
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
        <FriendListStatusSquare status={topic.activated ? 'on' : 'off'} />
      </button>
    ) : (
      <span className="flex h-7 w-7 items-center justify-center">
        <FriendListStatusSquare status={topic.activated ? 'on' : 'off'} />
      </span>
    );
  };

  const renderFriendTopicRow = (
    entry: ClubDashboardFriendTopicEntry,
    variant: 'root' | 'sub',
    options?: {
      expandControl?: { open: boolean; onToggle: () => void };
      toolbarOptions?: { showDelete?: boolean; showDocument?: boolean; showReorder?: boolean };
    }
  ) => {
    const hasNested = entry.subtopics.length > 0;
    const open = segmentOpen[entry.id] ?? true;
    const expandControl =
      options?.expandControl ??
      (hasNested
        ? { open, onToggle: () => toggleSegment(entry.id) }
        : undefined);

    return (
      <TopicRow
        key={entry.id}
        rowId={entry.id}
        name={entry.name}
        href={topicHref(entry.id)}
        nested={variant === 'sub' && entry.id !== 'friends-root'}
        activated={entry.item.activated}
        showLink={entry.item.showInClubDashboardTopics}
        adminMode={adminMode}
        activeToolbarRowId={activeToolbarRowId}
        onActivateToolbar={activateToolbar}
        trailing={renderFriendStatusOrToolbar(entry.item, variant, options?.toolbarOptions)}
        expandControl={
          expandControl
            ? {
                open: expandControl.open,
                onToggle: expandControl.onToggle,
                ariaLabel: open ? t('collapse') : t('expand'),
              }
            : undefined
        }
      />
    );
  };

  return (
    <div
      className="border-t border-black/25 bg-[#252525]"
      onMouseLeave={() => setActiveToolbarRowId(null)}
    >
      {friendTopics.map((topic) => {
        const hasNested = topic.subtopics.length > 0;
        const open = segmentOpen[topic.id] ?? true;
        const isRoot = topic.id === 'friends-root';

        return (
          <div key={topic.id}>
            {renderFriendTopicRow(topic, isRoot ? 'root' : 'sub', {
              expandControl: hasNested ? { open, onToggle: () => toggleSegment(topic.id) } : undefined,
              toolbarOptions: isRoot
                ? { showDelete: false, showDocument: true, showReorder: false }
                : undefined,
            })}
            {hasNested && open
              ? topic.subtopics.map((sub) => renderFriendTopicRow(sub, 'sub'))
              : null}
          </div>
        );
      })}
      {customTopics.map((topic) => (
        <TopicRow
          key={topic.id}
          rowId={topic.id}
          name={topic.name}
          href={topicHref(topic.id)}
          activated={topic.activated}
          showLink={topic.showInClubDashboardTopics}
          adminMode={adminMode}
          activeToolbarRowId={activeToolbarRowId}
          onActivateToolbar={activateToolbar}
          trailing={renderCustomTopicStatusOrToolbar(topic)}
        />
      ))}
      {settingsFriend ? (
        <ClubWebsiteTopicSettingsFormModal
          item={friendItemToSettingsFormItem(settingsFriend)}
          open
          variant={getFriendItemSettingsVariant(settingsFriend)}
          onClose={() => setSettingsFriendId(null)}
          onSave={(patch) => onUpdateFriendItem?.(settingsFriend.id, patch)}
          showAddSubtopic={Boolean(onAddFriendSubtopic) && canFriendItemHaveSubtopics(settingsFriend)}
          onAddSubtopic={() => {
            const subName = window.prompt(t('club_topic_subtopic_prompt'));
            if (!subName?.trim()) return;
            onAddFriendSubtopic?.(settingsFriend.id, subName.trim());
          }}
          onDeleteContent={() => {
            const confirmKey =
              getFriendItemSettingsVariant(settingsFriend) === 'subtopic'
                ? 'club_subtopic_delete_content_confirm'
                : 'club_topic_delete_content_confirm';
            if (window.confirm(t(confirmKey))) {
              onUpdateFriendItem?.(settingsFriend.id, clearClubWebsiteFriendItemContent());
              setSettingsFriendId(null);
            }
          }}
        />
      ) : null}
      {settingsCustomTopicId && customTopics.some((tpc) => tpc.id === settingsCustomTopicId) ? (
        <ClubWebsiteTopicSettingsFormModal
          item={topicToSettingsFormItem(
            customTopics.find((tpc) => tpc.id === settingsCustomTopicId)!
          )}
          open
          variant="topic"
          onClose={() => setSettingsCustomTopicId(null)}
          onSave={(patch) => onUpdateCustomTopic?.(settingsCustomTopicId, patch)}
          onDeleteContent={() => {
            if (!window.confirm(t('club_topic_delete_content_confirm'))) return;
            onUpdateCustomTopic?.(settingsCustomTopicId, clearClubWebsiteTopicContent());
            setSettingsCustomTopicId(null);
          }}
        />
      ) : null}
    </div>
  );
}
