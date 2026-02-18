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
import NewsTopicBar, { type NewsTopic, NEWS_TOPICS } from './components/NewsTopicBar';
import NewTopicModal from './components/NewTopicModal';
import OGPForm from './components/OGPForm';
import NewsArticlesList, {
  type ArticlePasted,
  type ArticleTyped,
} from './components/NewsArticlesList';
import NewsRightSidebar from './components/NewsRightSidebar';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function NewsPage() {
  const { user } = useAuth();
  const [showAdBanner, setShowAdBanner] = useState(true);
  const [showPersonalBanner, setShowPersonalBanner] = useState(true);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [showToolbar, setShowToolbar] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOgpForm, setShowOgpForm] = useState(false);
  const [topics, setTopics] = useState<string[]>(() => [...NEWS_TOPICS]);
  const [activeTopic, setActiveTopic] = useState<NewsTopic | null>('News');
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [topicModalEditing, setTopicModalEditing] = useState<string | null>(null);
  const [pastedArticles, setPastedArticles] = useState<ArticlePasted[]>([]);
  const [typedArticles, setTypedArticles] = useState<ArticleTyped[]>([]);

  const handleOpenTopicModal = useCallback(() => {
    setTopicModalEditing(activeTopic ?? null);
    setShowNewTopicModal(true);
  }, [activeTopic]);

  const handleOpenAddTopicModal = useCallback(() => {
    setTopicModalEditing(null);
    setShowNewTopicModal(true);
  }, []);

  const handleSaveTopic = useCallback((name: string) => {
    if (topicModalEditing != null) {
      setTopics((prev) =>
        prev.map((t) => (t === topicModalEditing ? name : t))
      );
      if (activeTopic === topicModalEditing) setActiveTopic(name);
    } else {
      setTopics((prev) => [...prev, name]);
      setActiveTopic(name);
    }
    setTopicModalEditing(null);
    setShowNewTopicModal(false);
  }, [topicModalEditing, activeTopic]);

  const handleDeleteTopic = useCallback(() => {
    if (topicModalEditing == null) return;
    setTopics((prev) => {
      const next = prev.filter((t) => t !== topicModalEditing);
      if (activeTopic === topicModalEditing) setActiveTopic(next[0] ?? null);
      return next;
    });
    setTopicModalEditing(null);
    setShowNewTopicModal(false);
  }, [topicModalEditing, activeTopic]);

  const handlePastedArticle = useCallback(
    (data: Parameters<Parameters<typeof OGPForm>[0]['onPastedArticle']>[0]) => {
      setPastedArticles((prev) => [
        ...prev,
        {
          ...data,
          id: generateId(),
          savedAt: new Date().toISOString(),
          topic: activeTopic ?? 'News',
        },
      ]);
      setShowOgpForm(false);
    },
    [activeTopic]
  );

  const handleSaveTyped = useCallback((description: string) => {
    setTypedArticles((prev) => [
      ...prev,
      { id: generateId(), description },
    ]);
    setShowOgpForm(false);
  }, []);

  const handleRemovePasted = useCallback((id: string) => {
    setPastedArticles((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleRemoveTyped = useCallback((id: string) => {
    setTypedArticles((prev) => prev.filter((a) => a.id !== id));
  }, []);

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
          <NewsTopicBar
            topics={topics}
            activeTopic={activeTopic}
            onTopicSelect={setActiveTopic}
            onAddNewTopic={handleOpenTopicModal}
            onAddTopic={handleOpenAddTopicModal}
            onAddClick={() => setShowOgpForm((prev) => !prev)}
            isExpanded={isExpanded}
            onExpandReduce={() => setIsExpanded((e) => !e)}
          />

          <NewTopicModal
            isOpen={showNewTopicModal}
            onClose={() => {
              setShowNewTopicModal(false);
              setTopicModalEditing(null);
            }}
            onSave={handleSaveTopic}
            editingTopic={topicModalEditing}
            onDelete={topicModalEditing != null ? handleDeleteTopic : undefined}
            existingTopics={topics}
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
