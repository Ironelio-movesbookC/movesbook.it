'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { ClubWebsiteLanguageCode } from '@/lib/clubWebsiteLanguages';
import {
  filterClubWebsiteTopicsForMembers,
  loadClubWebsiteTopics,
  type ClubWebsiteTopic,
} from '@/lib/clubWebsiteTopics';
import { useClubWebsiteSettingsPage } from '@/hooks/useClubWebsiteSettingsPage';
import { useState, useEffect } from 'react';

function TopicMemberDisplayContent() {
  const searchParams = useSearchParams();
  const topicId = searchParams?.get('id');
  const lang = (searchParams?.get('lang') as ClubWebsiteLanguageCode) || 'en';
  const { clubId, clubDisplayName, loading, clubsLoading } = useClubWebsiteSettingsPage();
  const [topics, setTopics] = useState<ClubWebsiteTopic[]>([]);

  useEffect(() => {
    if (clubId) setTopics(loadClubWebsiteTopics(clubId));
  }, [clubId]);

  const topic = useMemo(() => {
    const visible = filterClubWebsiteTopicsForMembers(topics);
    return visible.find((t) => t.id === topicId) ?? visible[0] ?? null;
  }, [topics, topicId]);

  if (loading || clubsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center text-sm text-zinc-600">
        Topic not found or not visible to members.
      </div>
    );
  }

  const html = topic.contentsByLang[lang] || topic.contentsByLang.en || '';

  return (
    <div className="min-h-screen bg-zinc-100">
      <div
        className="px-4 py-3 text-lg font-semibold"
        style={{ backgroundColor: topic.bannerColor, color: topic.titleColor }}
      >
        {topic.title}
      </div>
      <div className="mx-auto max-w-4xl bg-white p-6 shadow-sm">
        <p className="text-xs text-zinc-500">
          {clubDisplayName} · {topic.sectionName}
          {topic.lastUpdate ? ` · ${topic.lastUpdate}` : ''}
        </p>
        <div
          className="prose prose-sm mt-4 max-w-none text-zinc-800"
          dangerouslySetInnerHTML={{ __html: html || '<p></p>' }}
        />
      </div>
    </div>
  );
}

export default function TopicMemberDisplayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
        </div>
      }
    >
      <TopicMemberDisplayContent />
    </Suspense>
  );
}
