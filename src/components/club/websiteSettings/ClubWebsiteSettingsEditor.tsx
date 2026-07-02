'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/contexts/LanguageContext';
import { CLUB_WEBSITE_LANGUAGE_TABS } from '@/lib/clubWebsiteLanguages';
import { getFriendItemDeleteConfirmKey } from '@/lib/clubWebsiteFriendList';
import ClubWebsiteLastUpdatePicker, {
  LEGACY_FIELD_CLASS,
} from '@/components/club/websiteSettings/ClubWebsiteLastUpdatePicker';
import ClubWebsiteFriendItemEditor from '@/components/club/websiteSettings/ClubWebsiteFriendItemEditor';
import ClubWebsiteSettingsSidebar from '@/components/club/websiteSettings/ClubWebsiteSettingsSidebar';
import { useClubWebsiteSettingsSidebar } from '@/components/club/websiteSettings/ClubWebsiteSettingsSidebarContext';

const CKEditorComponent = dynamic(() => import('@/components/news/CKEditor'), { ssr: false });

export default function ClubWebsiteSettingsEditor({
  clubId,
  clubDisplayName,
  adminDisplayName,
  clubType,
  adminCountry,
  adminLocality,
  logoImageUrl,
}: {
  clubId?: string;
  clubDisplayName: string;
  adminDisplayName: string;
  clubType?: string | null;
  adminCountry?: string | null;
  adminLocality?: string | null;
  logoImageUrl?: string | null;
}) {
  const { t } = useLanguage();
  const { friends } = useClubWebsiteSettingsSidebar();
  const {
    items: friendItems,
    updateItem,
    removeItem: removeFriendItem,
    addSubtopicUnder,
  } = friends;

  const [activeLang, setActiveLang] = useState<(typeof CLUB_WEBSITE_LANGUAGE_TABS)[number]['code']>('en');
  const [title, setTitle] = useState('');
  const [section, setSection] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');
  const [searchKeywords, setSearchKeywords] = useState('');
  const [contents, setContents] = useState<Record<string, string>>({});
  const [selectedTopicId, setSelectedTopicId] = useState('friends-root');
  const [selectedTopicLabel, setSelectedTopicLabel] = useState('');
  const [contentFocusToken, setContentFocusToken] = useState(0);

  const selectedFriend = friendItems.find((i) => i.id === selectedTopicId) ?? null;
  const contentValue = contents[activeLang] ?? '';

  const handleFriendDelete = (id: string) => {
    removeFriendItem(id);
    if (id === selectedTopicId) {
      setSelectedTopicId('friends-root');
      setSelectedTopicLabel(t('club_website_list_of_friends'));
    }
  };

  const handleFriendDeleted = (removedIds: string[]) => {
    if (removedIds.includes(selectedTopicId)) {
      setSelectedTopicId('friends-root');
      setSelectedTopicLabel(t('club_website_list_of_friends'));
    }
  };

  return (
    <div className="flex min-h-0 w-full flex-1 gap-0 border border-zinc-400 bg-zinc-200 shadow-sm">
      <ClubWebsiteSettingsSidebar
        adminDisplayName={adminDisplayName}
        clubDisplayName={clubDisplayName}
        clubType={clubType}
        adminCountry={adminCountry}
        adminLocality={adminLocality}
        logoImageUrl={logoImageUrl}
        selectedTopicId={selectedTopicId}
        onFriendEditContent={(id, label) => {
          setSelectedTopicId(id);
          setSelectedTopicLabel(label);
          setContentFocusToken((n) => n + 1);
        }}
        onFriendDeleted={handleFriendDeleted}
        onSelectTopic={(id, label) => {
          setSelectedTopicId(id);
          setSelectedTopicLabel(label);
        }}
      />

      <div className="min-w-0 flex-1 flex flex-col overflow-y-auto bg-[#ececec]">
        {selectedFriend ? (
          <ClubWebsiteFriendItemEditor
            item={selectedFriend}
            focusContentToken={contentFocusToken}
            onUpdate={(patch) => updateItem(selectedFriend.id, patch)}
            deleteConfirmKey={getFriendItemDeleteConfirmKey(friendItems, selectedFriend.id)}
            onDelete={
              selectedFriend.id !== 'friends-root'
                ? () => handleFriendDelete(selectedFriend.id)
                : undefined
            }
            onAddSubtopic={addSubtopicUnder}
          />
        ) : (
          <>
            <div className="border-b border-[#3d6d9e] bg-[#5b9bd5] px-3 py-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('club_website_title_placeholder')}
                className="w-full border-0 bg-transparent text-sm font-semibold text-white placeholder:text-white/80 outline-none"
                aria-label={t('club_website_title_placeholder')}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-400 bg-[#e4e4e4] px-3 py-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm text-zinc-800">{t('club_website_section_label')} :</span>
                <input
                  type="text"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder={t('club_website_section_placeholder')}
                  className={`${LEGACY_FIELD_CLASS} w-40`}
                />
              </div>
              <ClubWebsiteLastUpdatePicker value={lastUpdate} onChange={setLastUpdate} />
            </div>

            <div className="border-b border-zinc-400 bg-[#e8e8e8] px-2 pt-1">
              <div className="flex flex-wrap">
                {CLUB_WEBSITE_LANGUAGE_TABS.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setActiveLang(lang.code)}
                    className={`min-w-[2.25rem] border border-zinc-400 border-b-0 px-2.5 py-1 text-xs font-medium ${
                      activeLang === lang.code
                        ? 'border-red-600 bg-white text-zinc-900 ring-1 ring-red-600'
                        : 'bg-[#f5f5f5] text-zinc-600 hover:bg-white'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-[320px] flex-1 bg-[#ececec] p-2">
              <p className="mb-1 px-1 text-[11px] text-zinc-600">
                {selectedTopicLabel
                  ? `${t('club_website_editing_topic')}: ${selectedTopicLabel}`
                  : null}
              </p>
              <div className="club-website-ckeditor h-full min-h-[300px] rounded-sm border border-zinc-400 bg-white shadow-sm">
                <CKEditorComponent
                  value={contentValue}
                  onChange={(data) => setContents((prev) => ({ ...prev, [activeLang]: data }))}
                  placeholder={t('club_website_editor_placeholder')}
                  id={`club-website-editor-${activeLang}`}
                />
              </div>
            </div>

            <div className="border-t border-zinc-400 bg-[#ececec] px-3 py-3">
              <label className="mb-1 block text-sm text-zinc-800">
                {t('club_website_search_keywords')} :
              </label>
              <input
                type="text"
                value={searchKeywords}
                onChange={(e) => setSearchKeywords(e.target.value)}
                className={`${LEGACY_FIELD_CLASS} w-full`}
                placeholder={t('club_website_search_keywords_placeholder')}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
