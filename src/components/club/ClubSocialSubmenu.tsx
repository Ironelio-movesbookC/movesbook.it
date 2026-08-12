'use client';

import { useState } from 'react';
import {
  Bell,
  ChevronDown,
  MessageCircle,
  MessageSquare,
  PenSquare,
} from 'lucide-react';

type SocialSubmenuItem = {
  key: string;
  label: string;
  icon: typeof MessageCircle;
};

const SOCIAL_ITEMS: SocialSubmenuItem[] = [
  { key: 'chat', label: 'Chat', icon: MessageCircle },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
  { key: 'posts', label: 'Posts', icon: PenSquare },
];

/**
 * My Club sidebar — expandable SOCIAL section with Chat / Messages / Posts.
 */
export default function ClubSocialSubmenu({
  onChatClick,
}: {
  onChatClick?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-teal-700">
      <div className="flex w-full items-stretch bg-[#7a0d1c] text-white">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pl-3 pr-2 text-left transition-colors hover:bg-[#8f1022]"
        >
          <Bell className="h-5 w-5 shrink-0" />
          <span className="font-bold tracking-wide text-sm">SOCIAL</span>
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Collapse' : 'Expand'}
          className="flex shrink-0 items-center px-3 transition-colors hover:bg-[#8f1022]"
        >
          <ChevronDown
            className={`h-4 w-4 opacity-90 transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>
      {open && (
        <div className="border-t border-teal-900/40 bg-[#2d2d2d] text-sm text-white">
          {SOCIAL_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  if (item.key === 'chat') onChatClick?.();
                }}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-zinc-700/90 ${
                  idx > 0 ? 'border-t border-black/25' : ''
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
