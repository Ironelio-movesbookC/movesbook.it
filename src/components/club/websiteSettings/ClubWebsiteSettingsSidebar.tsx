'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, Globe, Home, Settings, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CLUB_WEBSITE_BACHECA_PATH } from '@/lib/clubWebsiteSettingsPaths';
import type { ClubWebsiteTopic } from '@/lib/clubWebsiteTopics';
import type { ClubWebsiteFriendItem } from '@/lib/clubWebsiteFriendList';
import ClubWebsiteFriendListSection from '@/components/club/websiteSettings/ClubWebsiteFriendListSection';
import {
  LEGACY_SIDEBAR_BLUE,
  LEGACY_SIDEBAR_PANEL,
  LEGACY_SIDEBAR_ROW,
  LEGACY_STATUS_OFF,
  LEGACY_STATUS_ON,
  MOVEBOOK_TOPIC_ROWS,
  SOCIAL_SITE_ROWS,
  type SidebarTopicStatus,
} from '@/components/club/websiteSettings/clubWebsiteSettingsSidebarData';

/** Legacy visibility toggle — equal sides (regular quadrilateral / square). */
function StatusSquare({ status }: { status: SidebarTopicStatus }) {
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

function StatusToggleButton({
  status,
  onToggle,
  ariaLabel,
}: {
  status: SidebarTopicStatus;
  onToggle: () => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex w-7 shrink-0 items-center justify-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="flex h-7 w-7 items-center justify-center"
        aria-label={ariaLabel}
      >
        <StatusSquare status={status} />
      </button>
    </div>
  );
}

function MenuRowStatusCell({ children }: { children?: ReactNode }) {
  return <div className="flex w-7 shrink-0 items-center justify-center">{children}</div>;
}

function MenuRow({
  children,
  className = '',
  style,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
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
      className={`flex min-h-[28px] items-center border border-zinc-400/90 px-2 py-1 text-xs text-white ${onClick ? 'cursor-pointer hover:brightness-110' : ''} ${className}`}
      style={{ backgroundColor: LEGACY_SIDEBAR_ROW, ...style }}
    >
      {children}
    </div>
  );
}

export default function ClubWebsiteSettingsSidebar({
  adminDisplayName,
  clubDisplayName,
  clubType,
  adminCountry,
  adminLocality,
  logoImageUrl,
  selectedTopicId,
  onSelectTopic,
  highlightBacheca = false,
  highlightTopicsSection = false,
  /** Read-only member view — no admin controls. */
  displayMode = false,
  customTopics = [],
  onAddTopic,
  onSelectCustomTopic,
  onToggleCustomTopicActivated,
  friendListItems = [],
  friendListAdminMode = true,
  onFriendToggleActivated,
  onFriendDelete,
  onFriendMove,
  onFriendUpdateItem,
  onFriendEditContent,
  onFriendAddSubtopic,
}: {
  adminDisplayName: string;
  clubDisplayName: string;
  clubType?: string | null;
  adminCountry?: string | null;
  adminLocality?: string | null;
  logoImageUrl?: string | null;
  selectedTopicId: string;
  onSelectTopic: (id: string, label: string) => void;
  highlightBacheca?: boolean;
  highlightTopicsSection?: boolean;
  displayMode?: boolean;
  customTopics?: ClubWebsiteTopic[];
  onAddTopic?: () => void;
  onSelectCustomTopic?: (id: string) => void;
  onToggleCustomTopicActivated?: (id: string) => void;
  friendListItems?: ClubWebsiteFriendItem[];
  friendListAdminMode?: boolean;
  onFriendToggleActivated?: (id: string) => void;
  onFriendDelete?: (id: string) => void;
  onFriendMove?: (id: string, direction: 'up' | 'down') => void;
  onFriendUpdateItem?: (id: string, patch: Partial<ClubWebsiteFriendItem>) => void;
  onFriendEditContent?: (id: string, label: string) => void;
  onFriendAddSubtopic?: (parentId: string, name: string) => void;
}) {
  const { t } = useLanguage();
  const [socialSitesOpen, setSocialSitesOpen] = useState(false);
  const [topicStatuses, setTopicStatuses] = useState<Record<string, SidebarTopicStatus>>(() =>
    Object.fromEntries(
      MOVEBOOK_TOPIC_ROWS.filter((r) => r.showStatus).map((r) => [
        r.id,
        r.defaultStatus ?? 'on',
      ])
    )
  );

  const toggleTopicStatus = (id: string) => {
    setTopicStatuses((prev) => ({
      ...prev,
      [id]: prev[id] === 'on' ? 'off' : 'on',
    }));
  };

  return (
    <aside
      className="w-[min(100%,300px)] shrink-0 border-r border-zinc-500 text-xs text-white"
      style={{ backgroundColor: '#1a1a1a' }}
    >
      {/* Club Website tab */}
      <div
        className="border-b border-zinc-500 px-3 py-2 text-sm font-semibold"
        style={{ backgroundColor: '#3d3d3d' }}
      >
        {t('club_website_tab_title')}
      </div>

      {/* Profile card — admin editor only */}
      {!displayMode ? (
      <div className="border-b border-zinc-500 p-2" style={{ backgroundColor: LEGACY_SIDEBAR_PANEL }}>
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            className="rounded border border-zinc-400 bg-zinc-600 px-2 py-0.5 text-[11px] text-white hover:bg-zinc-500"
          >
            {t('club_website_like')}
          </button>
        </div>

        <div className="mb-2 flex items-center gap-1.5 font-semibold">
          <User className="h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 truncate">{adminDisplayName}</span>
        </div>

        <div className="flex gap-2">
          <div className="shrink-0">
            <div className="h-14 w-14 overflow-hidden border border-zinc-400 bg-zinc-700">
              {logoImageUrl ? (
                <img src={logoImageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
                  —
                </div>
              )}
            </div>
            <button type="button" className="mt-1 text-[11px] text-white underline hover:text-zinc-200">
              {t('club_website_change_logo')}
            </button>
          </div>
          <dl className="min-w-0 flex-1 space-y-1">
            <div>
              <dt className="text-[#e8d44d]">{t('searchresult_club_type')}</dt>
              <dd className="text-white">{clubType?.trim() || '—'}</dd>
            </div>
            <div>
              <dt className="text-[#e8d44d]">{t('searchresult_country_label')}</dt>
              <dd className="text-white">{adminCountry?.trim() || '—'}</dd>
            </div>
            <div>
              <dt className="text-[#e8d44d]">{t('searchresult_locality')}</dt>
              <dd className="text-white">{adminLocality?.trim() || '—'}</dd>
            </div>
          </dl>
        </div>
        <p className="mt-2 truncate text-[10px] text-zinc-400">{clubDisplayName}</p>
      </div>
      ) : null}

      {/* Most used buttons — admin editor only (display page uses top toolbar) */}
      {!displayMode ? (
      <div className="flex items-stretch border-b border-zinc-500 bg-gradient-to-r from-[#a31919] to-[#8b0000]">
        <div className="flex flex-1 items-center justify-center py-2.5 text-sm font-semibold tracking-wide text-white/95">
          {t('sidebar_most_used_buttons')}
        </div>
        <button
          type="button"
          className="flex w-10 shrink-0 items-center justify-center border-l border-white/20 text-white/90 hover:bg-black/20"
          aria-label={t('sidebar_options')}
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
      ) : null}

      {/* Website editor block */}
      <div className="border-b border-white/90">
        <div className="flex items-center gap-2 border-b border-zinc-500 bg-black px-3 py-2 text-sm font-semibold">
          <Home className="h-4 w-4 shrink-0" aria-hidden />
          <span>{t('club_website_editor_sidebar_title')}</span>
        </div>

        <MenuRow style={{ backgroundColor: LEGACY_SIDEBAR_BLUE }} className="justify-center font-semibold">
          {t('club_website_info_for_members')}
        </MenuRow>

        <MenuRow
          className={`justify-between ${highlightBacheca ? 'ring-2 ring-inset ring-amber-400' : ''}`}
          onClick={displayMode ? () => onSelectTopic('bacheca', t('club_website_bacheca')) : undefined}
        >
          <span
            className={`${highlightBacheca || selectedTopicId === 'bacheca' ? 'font-bold underline' : ''}`}
          >
            {t('club_website_bacheca')}
          </span>
          {!displayMode ? (
            <a
              href={CLUB_WEBSITE_BACHECA_PATH}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white no-underline hover:text-zinc-200"
              aria-label={t('club_bacheca_open_editor_aria')}
              onClick={(e) => e.stopPropagation()}
            >
              <Settings className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </MenuRow>

        <MenuRow
          style={{ backgroundColor: LEGACY_SIDEBAR_BLUE }}
          className={`justify-between font-medium ${highlightTopicsSection ? 'ring-2 ring-inset ring-amber-400' : ''}`}
        >
          <span>{t('club_website_topics_available')}</span>
          {!displayMode ? (
            <button
              type="button"
              onClick={() => onAddTopic?.()}
              className="text-white hover:underline"
            >
              + {t('club_website_add_topic')}
            </button>
          ) : null}
        </MenuRow>

        {customTopics.map((topic) => (
          <MenuRow
            key={topic.id}
            className="justify-between font-medium"
            onClick={() =>
              displayMode
                ? onSelectTopic(topic.id, topic.name)
                : onSelectCustomTopic?.(topic.id)
            }
          >
            <span
              className={`min-w-0 truncate ${selectedTopicId === topic.id ? 'font-bold underline' : ''}`}
            >
              {topic.name}
            </span>
            {displayMode ? (
              <MenuRowStatusCell>
                <StatusSquare status={topic.activated ? 'on' : 'off'} />
              </MenuRowStatusCell>
            ) : (
              <StatusToggleButton
                status={topic.activated ? 'on' : 'off'}
                onToggle={() => onToggleCustomTopicActivated?.(topic.id)}
                ariaLabel={t('club_website_toggle_visibility')}
              />
            )}
          </MenuRow>
        ))}

        <ClubWebsiteFriendListSection
          selectedTopicId={selectedTopicId}
          onSelectTopic={onSelectTopic}
          items={friendListItems}
          adminMode={displayMode ? false : friendListAdminMode}
          onToggleActivated={(id) => onFriendToggleActivated?.(id)}
          onDelete={(id) => onFriendDelete?.(id)}
          onMove={(id, dir) => onFriendMove?.(id, dir)}
          onUpdateItem={(id, patch) => onFriendUpdateItem?.(id, patch)}
          onEditContent={(id, label) => onFriendEditContent?.(id, label)}
          onAddSubtopic={(parentId, name) => onFriendAddSubtopic?.(parentId, name)}
        />

        <MenuRow
          style={{ backgroundColor: LEGACY_SIDEBAR_BLUE }}
          className="justify-between font-semibold"
          onClick={() => setSocialSitesOpen((v) => !v)}
        >
          <span className="flex-1 text-center">{t('sidebar_club_social_sites')}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 transition-transform ${socialSitesOpen ? 'rotate-180' : ''}`}
          />
        </MenuRow>
        {socialSitesOpen ? (
          <div className="ml-auto mr-0 w-[90%] min-w-0 space-y-0">
            {SOCIAL_SITE_ROWS.map((row) => (
              <MenuRow
                key={row.id}
                className="gap-2 font-semibold"
                onClick={() => onSelectTopic(row.id, row.label)}
              >
                <Globe className="h-3.5 w-3.5 shrink-0 stroke-[1.5] opacity-95" aria-hidden />
                <span className={selectedTopicId === row.id ? 'underline' : ''}>{row.label}</span>
              </MenuRow>
            ))}
          </div>
        ) : null}

        <MenuRow
          style={{ backgroundColor: LEGACY_SIDEBAR_BLUE }}
          className="justify-center font-semibold"
        >
          {t('club_website_movebook_topics')}
        </MenuRow>

        {MOVEBOOK_TOPIC_ROWS.map((row) => (
          <MenuRow
            key={row.id}
            className="justify-between"
            onClick={() => onSelectTopic(row.id, row.label)}
          >
            <span className={selectedTopicId === row.id ? 'font-semibold underline' : ''}>
              {row.label}
            </span>
            {row.showStatus ? (
              displayMode ? (
                <MenuRowStatusCell>
                  <StatusSquare status={topicStatuses[row.id] ?? 'on'} />
                </MenuRowStatusCell>
              ) : (
                <StatusToggleButton
                  status={topicStatuses[row.id] ?? 'on'}
                  onToggle={() => toggleTopicStatus(row.id)}
                  ariaLabel={t('club_website_toggle_visibility')}
                />
              )
            ) : (
              <MenuRowStatusCell />
            )}
          </MenuRow>
        ))}
      </div>
    </aside>
  );
}
