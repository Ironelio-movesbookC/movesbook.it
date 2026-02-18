'use client';

import { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import NewsTopicBar, { type NewsTopic, NEWS_TOPICS } from '@/app/news/components/NewsTopicBar';
import NewTopicModal from '@/app/news/components/NewTopicModal';
import OGPForm from '@/app/news/components/OGPForm';
import NewsArticlesList, {
  type ArticlePasted,
  type ArticleTyped,
} from '@/app/news/components/NewsArticlesList';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface NewsOGPPanelProps {
  onClose: () => void;
  embedded?: boolean;
  /** When provided (e.g. on dashboard), Expand/Reduce button toggles this; parent should hide/show sidebars when true */
  isExpanded?: boolean;
  onExpandReduce?: () => void;
}

export default function NewsOGPPanel({ onClose, embedded = true, isExpanded = false, onExpandReduce }: NewsOGPPanelProps) {
  const [topics, setTopics] = useState<string[]>(() => [...NEWS_TOPICS]);
  const [activeTopic, setActiveTopic] = useState<NewsTopic | null>('News');
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [topicModalEditing, setTopicModalEditing] = useState<string | null>(null);
  const [showOgpForm, setShowOgpForm] = useState(false);
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
    setTypedArticles((prev) => [...prev, { id: generateId(), description }]);
    setShowOgpForm(false);
  }, []);

  const handleRemovePasted = useCallback((id: string) => {
    setPastedArticles((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleRemoveTyped = useCallback((id: string) => {
    setTypedArticles((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return (
    <div
      className={`flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden ${
        embedded ? 'flex-1 min-h-0 max-h-[95vh]' : ''
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

      <div className="flex-1 overflow-y-auto p-4">
        <NewsTopicBar
          topics={topics}
          activeTopic={activeTopic}
          onTopicSelect={setActiveTopic}
          onAddNewTopic={handleOpenTopicModal}
          onAddTopic={handleOpenAddTopicModal}
          onAddClick={() => setShowOgpForm((prev) => !prev)}
          isExpanded={isExpanded}
          onExpandReduce={onExpandReduce ?? (() => {})}
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
          onRemovePasted={handleRemovePasted}
          onRemoveTyped={handleRemoveTyped}
        />
      </div>
    </div>
  );
}
