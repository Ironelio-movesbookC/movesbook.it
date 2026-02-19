'use client';

import { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import ModernNavbar from '@/components/ModernNavbar';
import AdvertisementCarousel from '@/components/AdvertisementCarousel';
import DisplayOptionsToolbar from '@/app/my-page/components/DisplayOptionsToolbar';
import DarkSidebar from '@/components/DarkSidebar';
import PersonalBanner from '@/app/my-page/components/PersonalBanner';
import SimpleFooter from '@/components/SimpleFooter';
import { useAuth } from '@/hooks/useAuth';
import { useNewsData } from '@/hooks/useNewsData';
import NewsTopicBar, { type NewsTopic, ALL_TOPICS } from './components/NewsTopicBar';
import NewTopicModal from './components/NewTopicModal';
import NewsTopicSortModal from './components/NewsTopicSortModal';
import OGPForm from './components/OGPForm';
import NewsArticlesList from './components/NewsArticlesList';
import NewsRightSidebar from './components/NewsRightSidebar';

export default function NewsPage() {
  const { user } = useAuth();
  const {
    topics,
    customTopics,
    pastedArticles,
    typedArticles,
    loading,
    error,
    addTopic,
    updateTopic,
    deleteTopic,
    saveTopicOrder,
    addPastedArticle,
    removePastedArticle,
    addTypedArticle,
    removeTypedArticle,
  } = useNewsData();

  const [showAdBanner, setShowAdBanner] = useState(true);
  const [showPersonalBanner, setShowPersonalBanner] = useState(true);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [showToolbar, setShowToolbar] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOgpForm, setShowOgpForm] = useState(false);
  const [activeTopic, setActiveTopic] = useState<NewsTopic | null>('News');
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [showTopicSortModal, setShowTopicSortModal] = useState(false);
  const [topicModalEditing, setTopicModalEditing] = useState<string | null>(null);
  const [topicModalEditingId, setTopicModalEditingId] = useState<string | null>(null);

  const handleOpenTopicModal = useCallback(() => {
    setTopicModalEditing(activeTopic ?? null);
    setTopicModalEditingId(customTopics.find((c) => c.name === (activeTopic ?? ''))?.id ?? null);
    setShowNewTopicModal(true);
  }, [activeTopic, customTopics]);

  const handleOpenAddTopicModal = useCallback(() => {
    setTopicModalEditing(null);
    setTopicModalEditingId(null);
    setShowNewTopicModal(true);
  }, []);

  const handleSaveTopic = useCallback(
    async (name: string) => {
      try {
        if (topicModalEditingId) {
          await updateTopic(topicModalEditingId, name);
          if (activeTopic === topicModalEditing) setActiveTopic(name);
        } else {
          await addTopic(name);
          setActiveTopic(name);
        }
        setTopicModalEditing(null);
        setTopicModalEditingId(null);
        setShowNewTopicModal(false);
      } catch (e) {
        console.error(e);
      }
    },
    [topicModalEditingId, topicModalEditing, activeTopic, updateTopic, addTopic]
  );

  const handleDeleteTopic = useCallback(async () => {
    if (!topicModalEditingId) return;
    try {
      await deleteTopic(topicModalEditingId);
      if (activeTopic === topicModalEditing) {
        const remaining = topics.filter((t) => t !== topicModalEditing);
        setActiveTopic(remaining[0] ?? null);
      }
      setTopicModalEditing(null);
      setTopicModalEditingId(null);
      setShowNewTopicModal(false);
    } catch (e) {
      console.error(e);
    }
  }, [topicModalEditingId, topicModalEditing, activeTopic, topics, deleteTopic]);

  const handleRemovePasted = useCallback(
    async (id: string) => {
      try {
        await removePastedArticle(id);
      } catch (e) {
        console.error(e);
      }
    },
    [removePastedArticle]
  );

  const handleRemoveTyped = useCallback(
    async (id: string) => {
      try {
        await removeTypedArticle(id);
      } catch (e) {
        console.error(e);
      }
    },
    [removeTypedArticle]
  );

  const handlePastedArticle = useCallback(
    async (data: Parameters<Parameters<typeof OGPForm>[0]['onPastedArticle']>[0]) => {
      try {
        await addPastedArticle(data, activeTopic === ALL_TOPICS ? 'News' : (activeTopic ?? 'News'));
        setShowOgpForm(false);
      } catch (e) {
        console.error(e);
      }
    },
    [activeTopic, addPastedArticle]
  );

  const handleSaveTyped = useCallback(
    async (description: string) => {
      try {
        await addTypedArticle(description);
        setShowOgpForm(false);
      } catch (e) {
        console.error(e);
      }
    },
    [addTypedArticle]
  );

  const showLeft = showLeftSidebar && !isExpanded && user;
  const showRight = showRightSidebar && !isExpanded;

  return (
    <div className="bg-gray-50 flex flex-col min-h-screen">
      <ModernNavbar />

      <DisplayOptionsToolbar
        showAdBanner={showAdBanner}
        showPersonalBanner={showPersonalBanner}
        showLeftSidebar={showLeftSidebar}
        showRightSidebar={showRightSidebar}
        showToolbar={showToolbar}
        onToggleAdBanner={setShowAdBanner}
        onTogglePersonalBanner={setShowPersonalBanner}
        onToggleLeftSidebar={setShowLeftSidebar}
        onToggleRightSidebar={setShowRightSidebar}
        onToggleToolbar={setShowToolbar}
      />

      {showAdBanner && (
        <div className="mb-4 px-4 flex-shrink-0">
          <AdvertisementCarousel />
        </div>
      )}

      {showPersonalBanner && user && (
        <div className="mb-4 flex-shrink-0">
          <PersonalBanner user={user} />
        </div>
      )}

      <div className="flex-1 flex gap-0 py-4">
        {showLeft && (
          <div className="w-80 flex-shrink-0 sticky top-0 self-start pl-4">
            <DarkSidebar
              userType={user?.userType || ''}
              entities={[]}
              selectedEntityId={null}
              activeTab="my-page"
            />
          </div>
        )}

        <div className="flex-1 min-w-0 px-4">
          {loading && <p className="text-sm text-gray-500 mb-2">Loading news...</p>}
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          <NewsTopicBar
            topics={topics}
            activeTopic={activeTopic}
            onTopicSelect={setActiveTopic}
            onAddNewTopic={handleOpenTopicModal}
            onAddTopic={handleOpenAddTopicModal}
            isExpanded={isExpanded}
            onExpandReduce={() => setIsExpanded((e) => !e)}
            onOpenTopicSort={() => setShowTopicSortModal(true)}
          />

          <NewTopicModal
            isOpen={showNewTopicModal}
            onClose={() => {
              setShowNewTopicModal(false);
              setTopicModalEditing(null);
              setTopicModalEditingId(null);
            }}
            onSave={handleSaveTopic}
            editingTopic={topicModalEditing}
            onDelete={topicModalEditingId ? handleDeleteTopic : undefined}
            existingTopics={topics}
          />

          <NewsTopicSortModal
            isOpen={showTopicSortModal}
            onClose={() => setShowTopicSortModal(false)}
            topics={topics}
            onSave={async (ordered) => {
              await saveTopicOrder(ordered);
            }}
          />

          {showOgpForm && (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowOgpForm(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="ogp-modal-title"
            >
              <div
                className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.key === 'Escape' && setShowOgpForm(false)}
              >
                <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
                  <h2 id="ogp-modal-title" className="text-lg font-semibold text-gray-900">
                    Add article
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowOgpForm(false)}
                    className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6">
                  <OGPForm
                    onPastedArticle={handlePastedArticle}
                    onSaveTyped={handleSaveTyped}
                    onCancel={() => setShowOgpForm(false)}
                  />
                </div>
              </div>
            </div>
          )}

          <NewsArticlesList
            pasted={pastedArticles}
            typed={typedArticles}
            activeTopic={activeTopic}
            onRemovePasted={handleRemovePasted}
            onRemoveTyped={handleRemoveTyped}
            canDeleteOgp={user?.userType === 'ADMIN'}
            onAddClick={() => setShowOgpForm((prev) => !prev)}
            addButtonDisabled={activeTopic === ALL_TOPICS}
          />
        </div>

        {showRight && (
          <div className="pr-4">
            <NewsRightSidebar />
          </div>
        )}
      </div>

      <SimpleFooter />
    </div>
  );
}
