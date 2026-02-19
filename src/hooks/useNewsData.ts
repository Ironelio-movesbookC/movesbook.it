'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import type { ArticlePasted, ArticleTyped } from '@/app/news/components/NewsArticlesList';
import type { OGPData, OgpVisibilitySettingsExport } from '@/app/news/components/OGPForm';
import { NEWS_TOPICS } from '@/app/news/components/NewsTopicBar';

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export interface CustomTopic {
  id: string;
  name: string;
}

export interface UseNewsDataResult {
  topics: string[];
  customTopics: CustomTopic[];
  pastedArticles: ArticlePasted[];
  typedArticles: ArticleTyped[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveTopicOrder: (order: string[]) => Promise<void>;
  addTopic: (name: string) => Promise<void>;
  updateTopic: (id: string, name: string) => Promise<void>;
  deleteTopic: (id: string) => Promise<void>;
  addPastedArticle: (data: OGPData & { customDescription?: string; visibility?: OgpVisibilitySettingsExport; languageCode?: string | null }, topic: string) => Promise<void>;
  removePastedArticle: (id: string) => Promise<void>;
  addTypedArticle: (description: string) => Promise<void>;
  removeTypedArticle: (id: string) => Promise<void>;
}

export function useNewsData(): UseNewsDataResult {
  const { user } = useAuth();
  const [topics, setTopics] = useState<string[]>(() => [...NEWS_TOPICS]);
  const [customTopics, setCustomTopics] = useState<CustomTopic[]>([]);
  const [pastedArticles, setPastedArticles] = useState<ArticlePasted[]>([]);
  const [typedArticles, setTypedArticles] = useState<ArticleTyped[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user?.id) {
      setTopics([...NEWS_TOPICS]);
      setCustomTopics([]);
      setPastedArticles([]);
      setTypedArticles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const headers = getAuthHeaders();
    try {
      const [topicsRes, ogpRes, typedRes, orderRes] = await Promise.all([
        fetch('/api/news/topics', { headers }),
        fetch('/api/news/ogp', { headers }),
        fetch('/api/news/typed', { headers }),
        fetch('/api/news/topic-order', { headers }),
      ]);

      if (!topicsRes.ok || !ogpRes.ok || !typedRes.ok) {
        throw new Error('Failed to load news data');
      }

      const [topicsData, ogpData, typedData, orderData] = await Promise.all([
        topicsRes.json(),
        ogpRes.json(),
        typedRes.json(),
        orderRes.ok ? orderRes.json() : Promise.resolve({ order: [] }),
      ]);

      const custom = topicsData.customTopics ?? [];
      setCustomTopics(custom);
      const rawTopics = [...(topicsData.defaultTopicNames ?? NEWS_TOPICS), ...custom.map((t: CustomTopic) => t.name)];
      const order: string[] = orderData?.order ?? [];
      const sorted =
        order.length > 0
          ? [
              ...order.filter((t: string) => rawTopics.includes(t)),
              ...rawTopics.filter((t: string) => !order.includes(t)),
            ]
          : rawTopics;
      setTopics(sorted);

      setPastedArticles(
        (ogpData ?? []).map((a: any) => ({
          id: a.id,
          title: a.title,
          image: a.image,
          description: a.description,
          url: a.url,
          siteName: a.siteName,
          type: a.type,
          customDescription: a.customDescription,
          topic: a.topic,
          languageCode: a.languageCode ?? undefined,
          savedAt: a.savedAt,
        }))
      );

      setTypedArticles(
        (typedData ?? []).map((a: any) => ({
          id: a.id,
          description: a.description,
        }))
      );
    } catch (e) {
      console.error('useNewsData fetch', e);
      setError(e instanceof Error ? e.message : 'Failed to load');
      setTopics([...NEWS_TOPICS]);
      setCustomTopics([]);
      setPastedArticles([]);
      setTypedArticles([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveTopicOrder = useCallback(
    async (order: string[]) => {
      if (!user?.id) return;
      const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
      const res = await fetch('/api/news/topic-order', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ order }),
      });
      if (!res.ok) throw new Error('Failed to save topic order');
      await fetchAll();
    },
    [user?.id, fetchAll]
  );

  const addTopic = useCallback(
    async (name: string) => {
      if (!user?.id) return;
      const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
      const res = await fetch('/api/news/topics', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to add topic');
      }
      const created = await res.json();
      setCustomTopics((prev) => [...prev, { id: created.id, name: created.name }]);
      setTopics((prev) => [...prev, created.name]);
    },
    [user?.id]
  );

  const updateTopic = useCallback(
    async (id: string, name: string) => {
      if (!user?.id) return;
      const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
      const res = await fetch(`/api/news/topics/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update topic');
      }
      const updated = await res.json();
      setCustomTopics((prev) => prev.map((t) => (t.id === id ? { id, name: updated.name } : t)));
      setTopics((prev) => prev.map((t) => (t === (customTopics.find((c) => c.id === id)?.name ?? '') ? updated.name : t)));
    },
    [user?.id, customTopics]
  );

  const deleteTopic = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      const headers = getAuthHeaders();
      const res = await fetch(`/api/news/topics/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Failed to delete topic');
      const name = customTopics.find((c) => c.id === id)?.name;
      setCustomTopics((prev) => prev.filter((t) => t.id !== id));
      if (name) setTopics((prev) => prev.filter((t) => t !== name));
    },
    [user?.id, customTopics]
  );

  const addPastedArticle = useCallback(
    async (data: OGPData & { customDescription?: string; visibility?: OgpVisibilitySettingsExport; languageCode?: string | null }, topic: string) => {
      if (!user?.id) return;
      const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
      const vis = data.visibility;
      const res = await fetch('/api/news/ogp', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: data.title,
          image: data.image,
          description: data.description,
          url: data.url,
          siteName: data.siteName,
          type: data.type,
          customDescription: data.customDescription,
          topic: topic || 'News',
          languageCode: data.languageCode ?? null,
          expiresAt: vis?.expiresAt ?? null,
          visibilityUserTypes: vis?.userTypes ?? [],
          visibilityCountries: vis?.countries ?? [],
          visibilityLanguages: vis?.languages ?? [],
          visibilitySports: vis?.sports ?? [],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save article');
      }
      const created = await res.json();
      setPastedArticles((prev) => [
        ...prev,
        {
          id: created.id,
          title: created.title,
          image: created.image,
          description: created.description,
          url: created.url,
          siteName: created.siteName,
          type: created.type,
          customDescription: created.customDescription,
          topic: created.topic,
          languageCode: created.languageCode ?? undefined,
          savedAt: created.savedAt,
        },
      ]);
    },
    [user?.id]
  );

  const removePastedArticle = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      const headers = getAuthHeaders();
      const res = await fetch(`/api/news/ogp/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Failed to remove article');
      setPastedArticles((prev) => prev.filter((a) => a.id !== id));
    },
    [user?.id]
  );

  const addTypedArticle = useCallback(
    async (description: string) => {
      if (!user?.id) return;
      const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
      const res = await fetch('/api/news/typed', {
        method: 'POST',
        headers,
        body: JSON.stringify({ description: description.trim() }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const created = await res.json();
      setTypedArticles((prev) => [...prev, { id: created.id, description: created.description }]);
    },
    [user?.id]
  );

  const removeTypedArticle = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      const headers = getAuthHeaders();
      const res = await fetch(`/api/news/typed/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Failed to remove');
      setTypedArticles((prev) => prev.filter((a) => a.id !== id));
    },
    [user?.id]
  );

  return {
    topics,
    customTopics,
    pastedArticles,
    typedArticles,
    loading,
    error,
    refresh: fetchAll,
    saveTopicOrder,
    addTopic,
    updateTopic,
    deleteTopic,
    addPastedArticle,
    removePastedArticle,
    addTypedArticle,
    removeTypedArticle,
  };
}
