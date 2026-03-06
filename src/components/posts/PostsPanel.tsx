'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import ArticlesList from './ArticlesList';
import SharedPostsList from './SharedPostsList';

type PostsTab = 'my-posts' | 'friends-posts' | 'my-articles' | 'friends-articles' | 'deletions';

const TABS: { key: PostsTab; label: string }[] = [
  { key: 'my-posts', label: 'Posts Published by Me' },
  { key: 'friends-posts', label: 'Posts of My Friends' },
  { key: 'my-articles', label: 'Articles Posted by Me' },
  { key: 'friends-articles', label: 'Articles Posted by My Friends' },
  { key: 'deletions', label: 'Deletions' },
];

interface PostsPanelProps {
  onClose: () => void;
  embedded?: boolean;
}

export default function PostsPanel({ onClose, embedded = true }: PostsPanelProps) {
  const [activeTab, setActiveTab] = useState<PostsTab>('my-posts');

  return (
    <div
      className={`flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden ${
        embedded ? 'flex-1 min-h-0 max-h-[98vh]' : ''
      }`}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900">Posts</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 p-3 border-b border-gray-200 flex-shrink-0 justify-center">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === key
                ? 'bg-yellow-400 text-white'
                : 'bg-gray-300 text-gray-700 hover:bg-gray-200 hover:text-gray-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'my-posts' && (
          <SharedPostsList mode="mine" />
        )}
        {activeTab === 'friends-posts' && (
          <SharedPostsList mode="friends" />
        )}
        {activeTab === 'my-articles' && (
          <ArticlesList mode="mine" />
        )}
        {activeTab === 'friends-articles' && (
          <ArticlesList mode="friends" />
        )}
        {activeTab === 'deletions' && (
          <p className="text-sm text-gray-400">Deletions — coming soon</p>
        )}
      </div>
    </div>
  );
}
