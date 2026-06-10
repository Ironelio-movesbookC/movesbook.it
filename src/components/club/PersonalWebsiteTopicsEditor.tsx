'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePersonalWebsiteFriendList } from '@/hooks/usePersonalWebsiteFriendList';
import {
  getFriendItemDeleteConfirmKey,
  getFriendItemIdsForRemoval,
} from '@/lib/clubWebsiteFriendList';
import ClubWebsiteFriendItemEditor from '@/components/club/websiteSettings/ClubWebsiteFriendItemEditor';
import ClubWebsiteFriendListSection from '@/components/club/websiteSettings/ClubWebsiteFriendListSection';
import { personalWebsiteTopicDisplayUrl } from '@/lib/personalWebsiteSettingsPaths';

export default function PersonalWebsiteTopicsEditor({ userId }: { userId: string }) {
  const { t } = useLanguage();
  const {
    items,
    updateItem,
    toggleActivated,
    removeItem,
    addSubtopicUnder,
    moveItem,
  } = usePersonalWebsiteFriendList(userId);

  const [selectedTopicId, setSelectedTopicId] = useState('friends-root');
  const [contentFocusToken, setContentFocusToken] = useState(0);

  const selected = items.find((i) => i.id === selectedTopicId) ?? null;

  const handleDelete = (id: string) => {
    const removedIds = getFriendItemIdsForRemoval(items, id);
    removeItem(id);
    if (removedIds.includes(selectedTopicId)) {
      setSelectedTopicId('friends-root');
    }
  };

  return (
    <div className="flex min-h-0 w-full flex-1 gap-0 border border-zinc-400 bg-zinc-200 shadow-sm">
      <aside className="w-72 shrink-0 overflow-y-auto border-r border-zinc-500 bg-[#2b2b2b] p-2">
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          {t('sidebar_my_topics')}
        </p>
        <ClubWebsiteFriendListSection
          selectedTopicId={selectedTopicId}
          onSelectTopic={(id) => setSelectedTopicId(id)}
          items={items}
          adminMode
          onToggleActivated={toggleActivated}
          onDelete={handleDelete}
          onMove={moveItem}
          onUpdateItem={updateItem}
          onEditContent={(id) => {
            setSelectedTopicId(id);
            setContentFocusToken((n) => n + 1);
          }}
          onAddSubtopic={addSubtopicUnder}
        />
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto bg-[#ececec]">
        {selected ? (
          <ClubWebsiteFriendItemEditor
            item={selected}
            focusContentToken={contentFocusToken}
            onUpdate={(patch) => updateItem(selected.id, patch)}
            deleteConfirmKey={getFriendItemDeleteConfirmKey(items, selected.id)}
            onDelete={
              selected.id !== 'friends-root' ? () => handleDelete(selected.id) : undefined
            }
            onAddSubtopic={addSubtopicUnder}
            displayUrlForItem={(item, lang) => personalWebsiteTopicDisplayUrl(item.id, lang)}
          />
        ) : null}
      </div>
    </div>
  );
}
