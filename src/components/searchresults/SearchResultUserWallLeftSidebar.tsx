'use client';

import Link from 'next/link';
import {
  Ban,
  Calendar,
  ChevronDown,
  FileText,
  Heart,
  Mail,
  MessageSquare,
  Newspaper,
  Plus,
  Search,
  Settings,
  Star,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  displayName: string;
  username: string;
  country: string | null;
  image: string | null;
  sportsLine: string;
  ageLabel: string | null;
};

function WallAccordionBar({
  label,
  icon,
  rounded,
}: {
  label: string;
  icon?: React.ReactNode;
  rounded?: 'top' | 'bottom' | 'none';
}) {
  const roundClass =
    rounded === 'top' ? 'rounded-t' : rounded === 'bottom' ? 'rounded-b' : '';
  return (
    <button
      type="button"
      className={`flex w-full items-center justify-between bg-teal-800 px-3 py-2.5 text-left text-xs font-semibold text-white hover:bg-teal-700 ${roundClass}`}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <ChevronDown className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
    </button>
  );
}

function ActionIconButton({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      className="flex flex-1 flex-col items-center gap-1 px-0.5 py-1 text-[9px] leading-tight text-zinc-300 hover:text-white"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded bg-zinc-700 text-zinc-200 shadow-inner">
        {icon}
      </span>
      <span className="text-center">{label}</span>
    </button>
  );
}

export function SearchResultUserWallLeftSidebar({
  displayName,
  username,
  country,
  image,
  sportsLine,
  ageLabel,
}: Props) {
  const { t } = useLanguage();
  const primarySport = sportsLine.split(',')[0]?.trim() || sportsLine || '—';

  return (
    <aside className="space-y-2 lg:col-span-3">
      <div className="flex flex-col gap-1.5 sm:flex-row lg:flex-col">
        <button
          type="button"
          className="rounded border border-zinc-500 bg-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-100 shadow-sm hover:bg-zinc-600"
        >
          {t('searchresult_users_visited')}
        </button>
        <button
          type="button"
          className="rounded border border-zinc-500 bg-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-100 shadow-sm hover:bg-zinc-600"
        >
          {t('searchresult_back_my_data')}
        </button>
      </div>

      <div className="overflow-hidden rounded border border-zinc-600 bg-[#1c1c1c] text-white shadow-lg">
        {/* Staff message header */}
        <div className="flex items-center justify-between gap-2 border-b border-zinc-700 bg-[#252525] px-3 py-2 text-[11px]">
          <div className="flex min-w-0 items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
            <span className="truncate">
              {t('searchresult_message_staff_prefix')}{' '}
              <span className="font-semibold text-amber-300">{displayName}</span>{' '}
              {t('searchresult_message_staff_by')}
            </span>
          </div>
          <Settings className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
        </div>

        {/* Watch + status */}
        <div className="border-b border-zinc-700 px-3 py-2">
          <label className="flex cursor-pointer items-start gap-2 text-[11px] text-zinc-300">
            <input type="checkbox" className="mt-0.5 rounded border-zinc-500" />
            <span>{t('searchresult_allow_watch')}</span>
          </label>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-400">
            <button
              type="button"
              className="inline-flex items-center gap-1 hover:text-zinc-200"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {t('searchresult_status')}
            </button>
          </div>
        </div>

        {/* Profile block */}
        <div className="border-b border-zinc-700 px-3 py-3">
          <div className="mb-2 flex items-center gap-2">
            <User className="h-4 w-4 text-zinc-400" aria-hidden />
            <p className="text-sm font-bold text-white">{displayName}</p>
          </div>

          <div className="flex gap-3">
            <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded border border-zinc-600 bg-zinc-800">
              {image ? (
                <img src={image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                  —
                </div>
              )}
            </div>
            <dl className="min-w-0 flex-1 space-y-1 text-[11px]">
              <div>
                <dt className="font-semibold text-amber-300">{t('searchresult_username_label')}</dt>
                <dd className="text-white">{username}</dd>
              </div>
              <div>
                <dt className="font-semibold text-amber-300">{t('searchresult_age_label')}</dt>
                <dd className="text-white">{ageLabel ?? '—'}</dd>
              </div>
              <div>
                <dt className="font-semibold text-amber-300">{t('searchresult_country_label')}</dt>
                <dd className="text-white">{country ?? '—'}</dd>
              </div>
              <div>
                <dt className="font-semibold text-amber-300">{t('searchresult_sport_label')}</dt>
                <dd className="text-white">{primarySport}</dd>
              </div>
            </dl>
          </div>

          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
            {t('searchresult_online')}
          </p>
        </div>

        {/* Action icons */}
        <div className="flex border-b border-zinc-700 px-1 py-2">
          <ActionIconButton
            icon={<UserPlus className="h-4 w-4" aria-hidden />}
            label={t('searchresult_action_add_friend')}
          />
          <ActionIconButton
            icon={<Heart className="h-4 w-4 text-red-400" aria-hidden />}
            label={t('searchresult_action_fav')}
          />
          <ActionIconButton
            icon={<Ban className="h-4 w-4" aria-hidden />}
            label={t('searchresult_action_block')}
          />
          <ActionIconButton
            icon={<Users className="h-4 w-4" aria-hidden />}
            label={t('searchresult_follow_him')}
          />
          <ActionIconButton
            icon={<Mail className="h-4 w-4" aria-hidden />}
            label={t('searchresult_action_mail')}
          />
        </div>

        {/* Share */}
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-700 px-3 py-2.5 text-[11px]">
          <span className="font-semibold text-zinc-300">{t('searchresult_share')}</span>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1da1f2] text-white hover:opacity-90"
            aria-label="Twitter"
          >
            <i className="fa-brands fa-x-twitter text-xs" aria-hidden />
          </button>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3b5998] text-white hover:opacity-90"
            aria-label="Facebook"
          >
            <i className="fa-brands fa-facebook-f text-xs" aria-hidden />
          </button>
          <button
            type="button"
            className="rounded bg-zinc-700 px-2 py-1 text-[10px] font-semibold text-zinc-200 hover:bg-zinc-600"
          >
            {t('searchresult_like')}
          </button>
          <button
            type="button"
            className="rounded bg-zinc-700 px-2 py-1 text-[10px] font-semibold text-zinc-200 hover:bg-zinc-600"
          >
            {t('searchresult_m_like')}
          </button>
        </div>

        {/* Profile links */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 py-2.5 text-[11px] font-semibold">
          <Link href="#" className="inline-flex items-center gap-1.5 text-sky-400 hover:text-sky-300">
            <Newspaper className="h-3.5 w-3.5" aria-hidden />
            {t('searchresult_profile_info')}
          </Link>
          <Link href="#" className="inline-flex items-center gap-1.5 text-sky-400 hover:text-sky-300">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            {t('searchresult_biography')}
          </Link>
        </div>
      </div>

      {/* Accordions */}
      <div className="overflow-hidden rounded border border-zinc-600 shadow">
        <WallAccordionBar label={t('searchresult_acc_posts')} rounded="top" />
        <WallAccordionBar label={t('searchresult_acc_other')} />
        <WallAccordionBar
          label={t('searchresult_acc_communities')}
          icon={<Users className="h-3.5 w-3.5" aria-hidden />}
        />
        <WallAccordionBar label={t('searchresult_acc_online_friends')} rounded="bottom" />
      </div>

      {/* Friends search + grid */}
      <div className="overflow-hidden rounded border border-zinc-600 bg-[#1c1c1c] shadow">
        <div className="relative border-b border-zinc-700 bg-white px-2 py-1.5">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <input
            type="search"
            placeholder={t('searchresult_search_friends')}
            className="w-full rounded border border-zinc-300 py-1.5 pl-8 pr-2 text-xs text-zinc-800 placeholder:text-zinc-400"
          />
        </div>
        <div className="grid grid-cols-4 gap-1.5 p-2">
          {Array.from({ length: 16 }, (_, i) => (
            <div
              key={`friend-slot-${i}`}
              className="aspect-square overflow-hidden rounded border border-zinc-700 bg-zinc-800"
            >
              <div className="flex h-full w-full items-center justify-center bg-zinc-700 text-[8px] text-zinc-500">
                <User className="h-4 w-4 opacity-40" aria-hidden />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom menu badges */}
      <div className="overflow-hidden rounded border border-zinc-600 bg-[#1c1c1c] text-white shadow">
        {[
          { icon: <Newspaper className="h-4 w-4" aria-hidden />, label: t('searchresult_news'), count: 11 },
          { icon: <MessageSquare className="h-4 w-4" aria-hidden />, label: t('searchresult_message'), count: 33 },
          { icon: <Star className="h-4 w-4" aria-hidden />, label: t('searchresult_favorite_links'), count: 33 },
        ].map(({ icon, label, count }, idx, arr) => (
          <button
            key={label}
            type="button"
            className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-xs hover:bg-zinc-800 ${
              idx < arr.length - 1 ? 'border-b border-zinc-700' : ''
            }`}
          >
            <span className="flex items-center gap-2.5 font-medium">
              <span className="text-zinc-400">{icon}</span>
              {label}
            </span>
            <span className="min-w-[1.75rem] rounded bg-sky-600 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
              {count}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
