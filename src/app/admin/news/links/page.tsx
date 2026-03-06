'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useNewsData } from '@/hooks/useNewsData';
import NewsTopicBar, { type NewsTopic, ALL_TOPICS, ALL_USER_SECTORS } from '@/app/news/components/NewsTopicBar';
import NewTopicModal from '@/app/news/components/NewTopicModal';
import NewsTopicSortModal from '@/app/news/components/NewsTopicSortModal';
import OGPForm from '@/app/news/components/OGPForm';
import NewsArticlesList from '@/app/news/components/NewsArticlesList';

export default function AdminNewsLinksPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<{ id: string; name?: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const {
    topics,
    customTopics,
    topicNamesCreatedByNormalUsers,
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
  } = useNewsData({ adminContext: true });

  const prevLoading = useRef(true);

  // On reload (and whenever data finishes loading): select the first topic so the OGP area shows its OGPs.
  useEffect(() => {
    if (prevLoading.current && !loading && topics.length > 0) {
      setActiveTopic(topics[0]);
    }
    prevLoading.current = loading;
  }, [loading, topics]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem('adminUser');
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setAdminUser(u?.id ? { id: u.id, name: u.name } : null);
        if (!u?.id) router.replace('/admin/dashboard');
      } catch {
        router.replace('/admin/dashboard');
      }
    } else {
      const superRaw = localStorage.getItem('superAdminUser');
      if (superRaw) {
        try {
          const su = JSON.parse(superRaw);
          if (su?.id) {
            const u = { id: su.id, name: su.name ?? su.username };
            localStorage.setItem('adminUser', JSON.stringify(u));
            setAdminUser(u);
          } else {
            router.replace('/admin/dashboard');
          }
        } catch {
          router.replace('/admin/dashboard');
        }
      } else {
        router.replace('/admin/dashboard');
      }
    }
    setAuthChecked(true);
  }, [router]);

  const [showOgpForm, setShowOgpForm] = useState(false);
  const [activeTopic, setActiveTopic] = useState<NewsTopic | null>(null);
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [showTopicSortModal, setShowTopicSortModal] = useState(false);
  const [topicModalEditing, setTopicModalEditing] = useState<string | null>(null);
  const [topicModalEditingId, setTopicModalEditingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

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

  if (!authChecked || !adminUser) {
    return null;
  }

  return (
    <div className="p-4 md:p-6 max-w-[1920px] mx-auto">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h1 className="text-lg font-semibold text-gray-900">News</h1>
          <a
            href="/admin/dashboard"
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </a>
        </div>

        <div className="p-4">
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
            topicNamesCreatedByNormalUsers={topicNamesCreatedByNormalUsers}
            allTopicLabel="All defaults"
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
            topics={topics}
            onRemovePasted={handleRemovePasted}
            onRemoveTyped={handleRemoveTyped}
            canDeleteOgp={true}
            currentUserId={adminUser.id}
            onUpdatePastedSettings={handleUpdatePastedSettings}
            onUpdatePastedTopic={handleUpdatePastedTopic}
            onAddClick={() => setShowOgpForm((prev) => !prev)}
            addButtonDisabled={activeTopic === ALL_TOPICS || activeTopic === ALL_USER_SECTORS}
            adminContext={true}
            topicNamesCreatedByNormalUsers={topicNamesCreatedByNormalUsers}
          />
        </div>
      </div>
    </div>
  );
}
