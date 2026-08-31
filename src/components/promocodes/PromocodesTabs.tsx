'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

export type PromocodeMainTab = 'promoList' | 'promoAll' | 'index' | 'users' | 'statistics';

const TABS: { key: PromocodeMainTab; href: string; label: string }[] = [
  { key: 'promoList', href: '/promocodes/promoList', label: 'Promocodes' },
  { key: 'promoAll', href: '/promocodes/promoAll', label: 'Invites sent' },
  { key: 'index', href: '/promocodes', label: 'Registrations' },
  { key: 'users', href: '/promocodes/users', label: 'Users of Promocodes' },
  { key: 'statistics', href: '/promocodes/statistics', label: 'Statistics' },
];

export default function PromocodesTabs({
  active,
  onAddPromocode,
}: {
  active: PromocodeMainTab;
  onAddPromocode?: () => void;
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
        {active === 'promoList' && (
          <li className="tab-add-btn">
            {onAddPromocode ? (
              <button type="button" className="btn-black" onClick={onAddPromocode}>
                <Plus size={14} aria-hidden style={{ display: 'inline', verticalAlign: 'middle' }} />
                {' '}
                Add new
              </button>
            ) : (
              <Link href="/promocodes/add" target="_blank" className="btn-black">
                <Plus size={14} aria-hidden style={{ display: 'inline', verticalAlign: 'middle' }} />
                {' '}
                Add new
              </Link>
            )}
          </li>
        )}
      </ul>
    </div>
  );
}
