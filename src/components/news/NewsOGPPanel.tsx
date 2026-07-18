'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import NewsTopicBar, { type NewsTopic, ALL_TOPICS } from '@/app/news/components/NewsTopicBar';
import NewTopicModal from '@/app/news/components/NewTopicModal';
import NewsTopicSortModal from '@/app/news/components/NewsTopicSortModal';
import OGPForm from '@/app/news/components/OGPForm';
import NewsArticlesList from '@/app/news/components/NewsArticlesList';
import { useAuth } from '@/hooks/useAuth';
import { useNewsData } from '@/hooks/useNewsData';

interface NewsOGPPanelProps {
  onClose: () => void;
  embedded?: boolean;
  isExpanded?: boolean;
  onExpandReduce?: () => void;
}

export default function NewsOGPPanel({ onClose, embedded = true, isExpanded = false, onExpandReduce }: NewsOGPPanelProps) {
  const {
    topics,
    customTopics,
    topicNamesCreatedBySuperAdmin,
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
    updatePastedArticleSettings,
    updatePastedArticleTopic,
    addTypedArticle,
    removeTypedArticle,
  } = useNewsData();
  const { user } = useAuth();

  const [activeTopic, setActiveTopic] = useState<NewsTopic | null>(null);
  const prevLoading = useRef(true);
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [showTopicSortModal, setShowTopicSortModal] = useState(false);
  const [topicModalEditing, setTopicModalEditing] = useState<string | null>(null);
  const [topicModalEditingId, setTopicModalEditingId] = useState<string | null>(null);
  const [showOgpForm, setShowOgpForm] = useState(false);

  // On reload: select the first topic from the user's sorted list so the OGP area shows its OGPs.
  useEffect(() => {
    if (prevLoading.current && !loading && topics.length > 0) {
      setActiveTopic(topics[0]);
    }
    prevLoading.current = loading;
  }, [loading, topics]);

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
        throw e;
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
      throw e;
    }
  }, [topicModalEditingId, topicModalEditing, activeTopic, topics, deleteTopic]);

  const handlePastedArticle = useCallback(
    async (data: Parameters<Parameters<typeof OGPForm>[0]['onPastedArticle']>[0]) => {
      try {
        await addPastedArticle(data, activeTopic ?? 'News');
        setShowOgpForm(false);
      } catch (e) {
        console.error(e);
        throw e;
      }
    },
    [activeTopic, addPastedArticle]
  );

  const handleUpdatePastedSettings = useCallback(
    async (id: string, settings: { userTypes: string[]; countries: string[]; languages: string[]; sports: string[]; expiresAt: string | null }) => {
      try {
        await updatePastedArticleSettings(id, settings);
      } catch (e) {
        console.error(e);
      }
    },
    [updatePastedArticleSettings]
  );

  const handleUpdatePastedTopic = useCallback(
    async (id: string, topic: string, customDescription?: string) => {
      try {
        await updatePastedArticleTopic(id, topic, customDescription);
      } catch (e) {
        console.error(e);
      }
    },
    [updatePastedArticleTopic]
  );

  const handleSaveTyped = useCallback(
    async (description: string) => {
      try {
        await addTypedArticle(description);
        setShowOgpForm(false);
      } catch (e) {
        console.error(e);
        throw e;
      }
    },
    [addTypedArticle]
  );

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

  return (
    <div
      className={`flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden ${
        embedded ? 'flex-1 min-h-0 max-h-[158vh]' : ''
      }`}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900">News</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 p-4">
        {loading && (
          <p className="text-sm text-gray-500 mb-4">Loading news...</p>
        )}
        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}
        <NewsTopicBar
          topics={topics}
          activeTopic={activeTopic}
          onTopicSelect={setActiveTopic}
          onAddNewTopic={handleOpenTopicModal}
          onAddTopic={handleOpenAddTopicModal}
          isExpanded={isExpanded}
          onExpandReduce={onExpandReduce ?? (() => {})}
          onOpenTopicSort={() => setShowTopicSortModal(true)}
          topicNamesCreatedBySuperAdmin={topicNamesCreatedBySuperAdmin}
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
              className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.key === 'Escape' && setShowOgpForm(false)}
            >
              <div className="flex justify-between items-center mb-4">
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
              <OGPForm
                onPastedArticle={handlePastedArticle}
                onSaveTyped={handleSaveTyped}
                onCancel={() => setShowOgpForm(false)}
              />
            </div>
          </div>
        )}

        <NewsArticlesList
          pasted={pastedArticles}
          typed={typedArticles}
          activeTopic={activeTopic}
          topics={topics}
          onRemovePasted={handleRemovePasted}
          onRemoveTyped={handleRemoveTyped}
          canDeleteOgp={user?.userType === 'ADMIN'}
          currentUserId={user?.id ?? null}
          currentUserCountry={user?.country ?? null}
          onUpdatePastedSettings={handleUpdatePastedSettings}
          onUpdatePastedTopic={handleUpdatePastedTopic}
          onAddClick={() => setShowOgpForm((prev) => !prev)}
          addButtonDisabled={activeTopic === ALL_TOPICS}
        />
      </div>
    </div>
  );
}
