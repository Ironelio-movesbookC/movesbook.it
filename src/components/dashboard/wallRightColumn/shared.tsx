'use client';

import { CalendarRange, Filter, Mail, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function WallAvatarPlaceholder({ size = 'w-10 h-10' }: { size?: string }) {
  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded bg-gradient-to-br from-blue-400 to-blue-600 text-white`}
    >
      <User size={size.includes('12') ? 24 : 20} aria-hidden />
    </div>
  );
}

const DEMO_EVENTS = ['Triathlon of Rome July 20', 'Ironman at Elba'];

const DEMO_MEMBERS = ['Freiwildplayer', 'Freewildplayer', 'lemonWonderland'];

export function WallNextEventSection() {
  const { t } = useLanguage();
  const groups = [
    t('sidebar_events_my_sports'),
    t('sidebar_my_friends_events'),
    t('sidebar_event_other_sport'),
  ];

  return (
    <div>
      <div className="flex items-center justify-between bg-gray-900 px-3 py-2 text-white">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4" aria-hidden />
          <h4 className="text-[11px] font-bold uppercase tracking-wide">{t('sidebar_next_event')}</h4>
        </div>
        <button type="button" className="text-[10px] font-semibold text-red-400 hover:text-red-300">
          {t('sidebar_see_all')}
        </button>
      </div>
      <div className="space-y-0 bg-white">
        {groups.map((title) => (
          <div key={title} className="border-b border-gray-300 last:border-b-0">
            <div className="flex items-center justify-between bg-gray-200 px-3 py-1.5">
              <span className="text-[11px] font-semibold text-red-600">{title}</span>
              <button type="button" className="text-[10px] font-semibold text-red-600 hover:underline">
                {t('sidebar_see_all')}
              </button>
            </div>
            <ul className="space-y-1 px-3 py-2">
              {DEMO_EVENTS.map((event) => (
                <li key={`${title}-${event}`} className="text-[11px] text-gray-700">
                  {event}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WallMembersLastLoggedSection() {
  const { t } = useLanguage();

  return (
    <div>
      <div className="flex items-center justify-between bg-gray-900 px-3 py-2 text-white">
        <h4 className="text-[11px] font-bold uppercase tracking-wide">
          {t('sidebar_members_last_logged')}
        </h4>
        <button type="button" className="text-[10px] font-semibold text-gray-300 hover:text-white">
          {t('sidebar_see_all')}
        </button>
      </div>
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 bg-teal-600 py-2 px-3 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
      >
        <Filter className="h-4 w-4" aria-hidden />
        {t('sidebar_filter_option')}
      </button>
      <div className="divide-y divide-gray-200 bg-white">
        {DEMO_MEMBERS.map((name, idx) => (
          <div key={`${name}-${idx}`} className="flex items-start gap-3 px-3 py-2">
            <WallAvatarPlaceholder size="w-12 h-12" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{name}</p>
              <button
                type="button"
                className="mt-1 flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800"
              >
                <Mail className="h-3 w-3" aria-hidden />
                {t('sidebar_send_message')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
