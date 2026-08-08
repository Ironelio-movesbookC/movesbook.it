'use client';

import { ExternalLink } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LEGACY_FIELD_CLASS } from '@/components/club/websiteSettings/ClubWebsiteLastUpdatePicker';

/** Shows whether a topic/subtopic direct link is active, plus Preview in a new tab. */
export default function ClubWebsiteTopicLinkActivated({
  activated,
  url,
}: {
  activated: boolean;
  url: string;
}) {
  const { t } = useLanguage();
  const href = url.trim();

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <span className="whitespace-nowrap text-sm text-zinc-800">
        {t('club_topic_link_activated_label')} :
      </span>
      <span
        className={`rounded-sm border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
          activated
            ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
            : 'border-zinc-400 bg-zinc-100 text-zinc-600'
        }`}
      >
        {activated ? t('club_topic_link_activated_yes') : t('club_topic_link_activated_no')}
      </span>
      {activated && href ? (
        <>
          <input
            type="text"
            readOnly
            value={href}
            title={href}
            className={`${LEGACY_FIELD_CLASS} min-w-[10rem] max-w-[18rem] flex-1 truncate`}
            aria-label={t('club_topic_link_activated_url_aria')}
          />
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-none border border-sky-800 bg-sky-700 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white hover:bg-sky-800"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            {t('club_topic_link_preview')}
          </a>
        </>
      ) : null}
    </div>
  );
}

export function topicDirectLinkActivated(
  contentDisplayMode: string,
  externalUrl: string
): boolean {
  return contentDisplayMode === 'link' && externalUrl.trim().length > 0;
}
