'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

type TabKey = 'index' | 'promoAll' | 'promoList' | 'creditsEarned';

const TABS: { key: TabKey; href: string; label: string }[] = [
  { key: 'index', href: '/promocodes', label: 'Registrations with promo codes' },
  { key: 'promoAll', href: '/promocodes/promoAll', label: 'All invites (list)' },
  { key: 'promoList', href: '/promocodes/promoList', label: 'Promo codes' },
];

export default function PromocodesTabs({
  active,
  showCreditsLink = false,
}: {
  active: TabKey;
  showCreditsLink?: boolean;
}) {
  return (
    <div className="re-tab-bar mt-10">
      <ul>
        {TABS.map((tab) => (
          <li key={tab.key}>
            <Link href={tab.href} className={active === tab.key ? 'active' : undefined}>
              {tab.label}
            </Link>
          </li>
        ))}
        {showCreditsLink && (
          <li>
            <Link
              href="/users/credits_earned_users"
              className={active === 'creditsEarned' ? 'active' : undefined}
            >
              Credits earned
            </Link>
          </li>
        )}
        <li className="tab-add-btn">
          <Link href="/promocodes/add" target="_blank" className="btn-black">
            <Plus size={14} aria-hidden style={{ display: 'inline', verticalAlign: 'middle' }} />
            {' '}
            Add new promo code
          </Link>
        </li>
      </ul>
    </div>
  );
}
