'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export type TeamGroupWallPayload = {
  kind: 'team' | 'group';
  name: string;
  subtitle: string | null;
};

export function SearchResultTeamGroupWallClient({ data }: { data: TeamGroupWallPayload }) {
  const { t } = useLanguage();
  const label =
    data.kind === 'team' ? t('searchresult_entity_team_title') : t('searchresult_entity_group_title');

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-lg border border-zinc-300 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">{data.name}</h1>
        {data.subtitle ? <p className="mt-2 text-sm text-zinc-600">{data.subtitle}</p> : null}
        <p className="mt-6 text-sm text-zinc-500">{t('searchresult_entity_placeholder')}</p>
      </div>
    </div>
  );
}
