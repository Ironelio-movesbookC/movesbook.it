'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import type { ArticlePasted, ArticleTyped } from '@/app/news/components/NewsArticlesList';
import type { OGPData, OgpVisibilitySettingsExport } from '@/app/news/components/OGPForm';
import { NEWS_TOPICS } from '@/app/news/components/NewsTopicBar';

function getAuthHeaders(adminContext?: boolean): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = adminContext ? localStorage.getItem('adminToken') : localStorage.getItem('token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export interface CustomTopic {
  id: string;
  name: string;
}

export interface UserInsertedTopic {
  name: string;
  creatorUsername: string | null;
}

export interface UseNewsDataResult {
  topics: string[];
  customTopics: CustomTopic[];
  /** Topic names created by super admin (normal users cannot edit these); empty when admin/super-admin. */
  topicNamesCreatedBySuperAdmin: string[];
  /** Topic names created by normal users (super admin sees these in dropdown only); empty when not super-admin. */
  topicNamesCreatedByNormalUsers: string[];
  /** Super admin: user-inserted topics with creator username (for labels). */
  userInsertedTopics: UserInsertedTopic[];
  pastedArticles: ArticlePasted[];
  typedArticles: ArticleTyped[];
  /** Set when loading OGP with viewAsUsername (super admin “see as user”). */
  viewAsUserId: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveTopicOrder: (order: string[]) => Promise<void>;
  addTopic: (name: string) => Promise<void>;
  updateTopic: (id: string, name: string) => Promise<void>;
  deleteTopic: (id: string) => Promise<void>;
  addPastedArticle: (data: OGPData & { customDescription?: string; visibility?: OgpVisibilitySettingsExport; languageCode?: string | null }, topic: string) => Promise<void>;
  removePastedArticle: (id: string) => Promise<void>;
  updatePastedArticleSettings: (id: string, settings: OgpVisibilitySettingsExport) => Promise<void>;
  updatePastedArticleTopic: (id: string, topic: string, customDescription?: string) => Promise<void>;
  addTypedArticle: (description: string) => Promise<void>;
  removeTypedArticle: (id: string) => Promise<void>;
}

export interface UseNewsDataOptions {
  /** When true, use adminToken and adminUser from localStorage (super admin in admin panel). */
  adminContext?: boolean;
  /** Super admin: load OGPs visible to this username (all topics). */
  viewAsUsername?: string | null;
}

export function useNewsData(options?: UseNewsDataOptions): UseNewsDataResult {
  const { user } = useAuth();
  const adminContext = options?.adminContext === true;
  const viewAsUsername = options?.viewAsUsername ?? null;
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [viewAsUserId, setViewAsUserId] = useState<string | null>(null);
  const [topics, setTopics] = useState<string[]>(() => [...NEWS_TOPICS]);
  const [customTopics, setCustomTopics] = useState<CustomTopic[]>([]);
  const [topicNamesCreatedBySuperAdmin, setTopicNamesCreatedBySuperAdmin] = useState<string[]>([]);
  const [topicNamesCreatedByNormalUsers, setTopicNamesCreatedByNormalUsers] = useState<string[]>([]);
  const [userInsertedTopics, setUserInsertedTopics] = useState<UserInsertedTopic[]>([]);
  const [pastedArticles, setPastedArticles] = useState<ArticlePasted[]>([]);
  const [typedArticles, setTypedArticles] = useState<ArticleTyped[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (adminContext && typeof window !== 'undefined') {
      const raw = localStorage.getItem('adminUser');
      const u = raw ? JSON.parse(raw) : null;
      setAdminUserId(u?.id ?? null);
    } else {
      setAdminUserId(null);
    }
  }, [adminContext]);

  const effectiveUserId = adminContext ? adminUserId : user?.id;
  const getHeaders = useCallback(
    () => getAuthHeaders(adminContext),
    [adminContext]
  );

  const fetchAll = useCallback(async () => {
    if (!effectiveUserId) {
      setTopics([...NEWS_TOPICS]);
      setCustomTopics([]);
      setTopicNamesCreatedBySuperAdmin([]);
      setTopicNamesCreatedByNormalUsers([]);
      setUserInsertedTopics([]);
      setPastedArticles([]);
      setTypedArticles([]);
      setViewAsUserId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const headers = getHeaders();
    try {
      const ogpUrl =
        viewAsUsername != null && viewAsUsername.trim() !== ''
          ? `/api/news/ogp?${new URLSearchParams({ viewAsUsername: viewAsUsername.trim() })}`
          : '/api/news/ogp';
      const [topicsRes, ogpRes, typedRes, orderRes] = await Promise.all([
        fetch('/api/news/topics', { headers }),
        fetch(ogpUrl, { headers }),
        fetch('/api/news/typed', { headers }),
        fetch('/api/news/topic-order', { headers }),
      ]);

      if (!topicsRes.ok || !ogpRes.ok || !typedRes.ok) {
        throw new Error('Failed to load news data');
      }

      const [topicsData, ogpJson, typedData, orderData] = await Promise.all([
        topicsRes.json(),
        ogpRes.json(),
        typedRes.json(),
        orderRes.ok ? orderRes.json() : Promise.resolve({ order: [] }),
      ]);

      const ogpData = Array.isArray(ogpJson)
        ? ogpJson
        : Array.isArray(ogpJson?.articles)
          ? ogpJson.articles
          : [];
      if (viewAsUsername != null && viewAsUsername.trim() !== '' && ogpJson && typeof ogpJson === 'object' && !Array.isArray(ogpJson)) {
        setViewAsUserId(typeof ogpJson.viewAsUserId === 'string' ? ogpJson.viewAsUserId : null);
      } else {
        setViewAsUserId(null);
      }

      const custom = topicsData.customTopics ?? [];
      setCustomTopics(custom);
      setTopicNamesCreatedBySuperAdmin(topicsData.topicNamesCreatedBySuperAdmin ?? []);
      const inserted = (topicsData.userInsertedTopics ?? []) as UserInsertedTopic[];
      setUserInsertedTopics(inserted);
      setTopicNamesCreatedByNormalUsers(
        inserted.length > 0 ? inserted.map((x) => x.name) : (topicsData.topicNamesCreatedByNormalUsers ?? [])
      );
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
        (ogpData as any[] ?? []).map((a: any) => ({
          id: a.id,
          userId: a.userId,
          creatorUsername: a.creatorUsername ?? null,
          createdByCurrentUser: a.createdByCurrentUser === true,
          createdBySuperAdmin: a.createdBySuperAdmin === true,
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
          deletedAt: a.deletedAt,
          deletedByUserId: a.deletedByUserId,
          deletedByName: a.deletedByName,
          visibility: {
            userTypes: a.visibilityUserTypes ?? [],
            countries: a.visibilityCountries ?? [],
            languages: a.visibilityLanguages ?? [],
            sports: a.visibilitySports ?? [],
            expiresAt: a.expiresAt ?? null,
          },
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
      setTopicNamesCreatedBySuperAdmin([]);
      setTopicNamesCreatedByNormalUsers([]);
      setUserInsertedTopics([]);
      setPastedArticles([]);
      setTypedArticles([]);
      setViewAsUserId(null);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, getHeaders, viewAsUsername]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveTopicOrder = useCallback(
    async (order: string[]) => {
      if (!effectiveUserId) return;
      const headers = { ...getHeaders(), 'Content-Type': 'application/json' };
      const res = await fetch('/api/news/topic-order', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ order }),
      });
      if (!res.ok) throw new Error('Failed to save topic order');
      await fetchAll();
    },
    [effectiveUserId, fetchAll, getHeaders]
  );

  const addTopic = useCallback(
    async (name: string) => {
      if (!effectiveUserId) return;
      const headers = { ...getHeaders(), 'Content-Type': 'application/json' };
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
    [effectiveUserId, getHeaders]
  );

  const updateTopic = useCallback(
    async (id: string, name: string) => {
      if (!effectiveUserId) return;
      const oldName = customTopics.find((c) => c.id === id)?.name ?? '';
      const headers = { ...getHeaders(), 'Content-Type': 'application/json' };
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
      setTopics((prev) => prev.map((t) => (t === oldName ? updated.name : t)));
      setPastedArticles((prev) =>
        prev.map((a) => (a.topic === oldName ? { ...a, topic: updated.name } : a))
      );
    },
    [effectiveUserId, customTopics, getHeaders]
  );

  const deleteTopic = useCallback(
    async (id: string) => {
      if (!effectiveUserId) return;
      const headers = getHeaders();
      const res = await fetch(`/api/news/topics/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Failed to delete topic');
      const name = customTopics.find((c) => c.id === id)?.name;
      setCustomTopics((prev) => prev.filter((t) => t.id !== id));
      if (name) setTopics((prev) => prev.filter((t) => t !== name));
    },
    [effectiveUserId, customTopics, getHeaders]
  );

  const addPastedArticle = useCallback(
    async (data: OGPData & { customDescription?: string; visibility?: OgpVisibilitySettingsExport; languageCode?: string | null }, topic: string) => {
      if (!effectiveUserId) return;
      const headers = { ...getHeaders(), 'Content-Type': 'application/json' };
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
          userId: effectiveUserId ?? undefined,
          createdByCurrentUser: true,
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
          visibility: {
            userTypes: vis?.userTypes ?? [],
            countries: vis?.countries ?? [],
            languages: vis?.languages ?? [],
            sports: vis?.sports ?? [],
            expiresAt: vis?.expiresAt ?? null,
          },
        },
      ]);
    },
    [effectiveUserId, getHeaders]
  );

  const removePastedArticle = useCallback(
    async (id: string) => {
      if (!effectiveUserId) return;
      const headers = getHeaders();
      const res = await fetch(`/api/news/ogp/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Failed to remove article');
      setPastedArticles((prev) => prev.filter((a) => a.id !== id));
    },
    [effectiveUserId, getHeaders]
  );

  const updatePastedArticleSettings = useCallback(
    async (id: string, settings: OgpVisibilitySettingsExport) => {
      if (!effectiveUserId) return;
      const headers = { ...getHeaders(), 'Content-Type': 'application/json' };
      const res = await fetch(`/api/news/ogp/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          visibilityUserTypes: settings.userTypes ?? [],
          visibilityCountries: settings.countries ?? [],
          visibilityLanguages: settings.languages ?? [],
          visibilitySports: settings.sports ?? [],
          expiresAt: settings.expiresAt ?? null,
        }),
      });
      if (!res.ok) throw new Error('Failed to update article settings');
      setPastedArticles((prev) =>
        prev.map((a) =>
          a.id !== id
            ? a
            : {
                ...a,
                visibility: {
                  userTypes: settings.userTypes ?? [],
                  countries: settings.countries ?? [],
                  languages: settings.languages ?? [],
                  sports: settings.sports ?? [],
                  expiresAt: settings.expiresAt ?? null,
                },
              }
        )
      );
    },
    [effectiveUserId, getHeaders]
  );

  const updatePastedArticleTopic = useCallback(
    async (id: string, topic: string, customDescription?: string) => {
      if (!effectiveUserId) return;
      const trimmed = topic.trim();
      if (!trimmed) return;
      const headers = { ...getHeaders(), 'Content-Type': 'application/json' };
      const payload: { topic: string; customDescription?: string | null } = { topic: trimmed };
      if (customDescription !== undefined) {
        payload.customDescription = customDescription.trim() || null;
      }
      const res = await fetch(`/api/news/ogp/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update article topic');
      setPastedArticles((prev) =>
        prev.map((a) =>
          a.id !== id
            ? a
            : {
                ...a,
                topic: trimmed,
                ...(customDescription !== undefined && { customDescription: customDescription.trim() || undefined }),
              }
        )
      );
    },
    [effectiveUserId, getHeaders]
  );

  const addTypedArticle = useCallback(
    async (description: string) => {
      if (!effectiveUserId) return;
      const headers = { ...getHeaders(), 'Content-Type': 'application/json' };
      const res = await fetch('/api/news/typed', {
        method: 'POST',
        headers,
        body: JSON.stringify({ description: description.trim() }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const created = await res.json();
      setTypedArticles((prev) => [...prev, { id: created.id, description: created.description }]);
    },
    [effectiveUserId, getHeaders]
  );

  const removeTypedArticle = useCallback(
    async (id: string) => {
      if (!effectiveUserId) return;
      const headers = getHeaders();
      const res = await fetch(`/api/news/typed/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Failed to remove');
      setTypedArticles((prev) => prev.filter((a) => a.id !== id));
    },
    [effectiveUserId, getHeaders]
  );

  return {
    topics,
    customTopics,
    topicNamesCreatedBySuperAdmin,
    topicNamesCreatedByNormalUsers,
    userInsertedTopics,
    pastedArticles,
    typedArticles,
    viewAsUserId,
    loading,
    error,
    refresh: fetchAll,
    saveTopicOrder,
    addTopic,
    updateTopic,
    deleteTopic,
    addPastedArticle,
    removePastedArticle,
    updatePastedArticleSettings,
    updatePastedArticleTopic,
    addTypedArticle,
    removeTypedArticle,
  };
}
