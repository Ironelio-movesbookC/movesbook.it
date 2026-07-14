'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftRight,
  Bug,
  ChevronDown,
  FileText,
  HelpCircle,
  MessageCircle,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  COMMUNITY_CONTRIBUTION_LINKS,
  MY_CONTRIBUTION_LINKS,
  legacyCommunityContributionLinks,
  legacyMyContributionLinks,
} from '@/lib/messages/feedbackRoutes';
import { useAuth } from '@/hooks/useAuth';

function iconFor(kind: string) {
  switch (kind) {
    case 'file':
      return FileText;
    case 'question':
      return HelpCircle;
    case 'suggestion':
      return MessageCircle;
    case 'bug':
      return Bug;
    default:
      return ArrowLeftRight;
  }
}

export default function MyPageFastMenu() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [communityOpen, setCommunityOpen] = useState(false);
  const [myOpen, setMyOpen] = useState(false);

  const communityLinks = user?.id
    ? legacyCommunityContributionLinks(String(user.id))
    : COMMUNITY_CONTRIBUTION_LINKS;

  const myLinks = user?.id
    ? legacyMyContributionLinks(String(user.id))
    : MY_CONTRIBUTION_LINKS;

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setCommunityOpen((v) => !v);
            setMyOpen(false);
          }}
          className="bg-[#058592] hover:bg-[#046c76] text-white text-xs font-bold px-3 py-2 rounded flex items-center gap-2"
        >
          {t('fast_menu_community_contributions')}
          <ChevronDown className={`w-3 h-3 transition-transform ${communityOpen ? 'rotate-180' : ''}`} />
        </button>
        {communityOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-white border border-slate-200 rounded shadow-xl py-1 text-sm">
            {communityLinks.map((item) => {
              const Icon = iconFor(item.icon);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 px-3 py-2 text-slate-800 hover:bg-slate-50"
                  onClick={() => setCommunityOpen(false)}
                >
                  <Icon className="w-4 h-4 text-slate-600 shrink-0" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setMyOpen((v) => !v);
            setCommunityOpen(false);
          }}
          className="bg-[#058592] hover:bg-[#046c76] text-white text-xs font-bold px-3 py-2 rounded flex items-center gap-2"
        >
          {t('fast_menu_my_contributions')}
          <ChevronDown className={`w-3 h-3 transition-transform ${myOpen ? 'rotate-180' : ''}`} />
        </button>
        {myOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-white border border-slate-200 rounded shadow-xl py-1 text-sm">
            {myLinks.map((item) => {
              const Icon = iconFor(item.icon);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 px-3 py-2 text-slate-800 hover:bg-slate-50"
                  onClick={() => setMyOpen(false)}
                >
                  <Icon className="w-4 h-4 text-slate-600 shrink-0" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
