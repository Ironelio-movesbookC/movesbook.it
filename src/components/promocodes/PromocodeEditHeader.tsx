'use client';

import Link from 'next/link';
import { ArrowLeft, BarChart3, Calendar, Mail, Tag } from 'lucide-react';
import type { PromocodeSettingRow } from '@/lib/promocodes/types';
import { formatPromocodeDisplayDate } from '@/lib/promocodes/formatPromocodeDate';

function statusBadge(validTo: string | null | undefined, enable: string | null | undefined) {
  const today = new Date().toISOString().slice(0, 10);
  const expired = validTo ? validTo < today : false;
  const enabled = enable === 'Enable';

  return (
    <>
      <span className={`promocode-edit-badge ${enabled ? 'is-enabled' : 'is-disabled'}`}>
        {enabled ? 'Enabled' : 'Disabled'}
      </span>
      <span className={`promocode-edit-badge ${expired ? 'is-expired' : 'is-active'}`}>
        {expired ? 'Expired' : 'Current'}
      </span>
    </>
  );
}

export default function PromocodeEditHeader({ setting }: { setting: PromocodeSettingRow }) {
  const created = formatPromocodeDisplayDate(setting.created);
  const validFrom = formatPromocodeDisplayDate(setting.validFrom);
  const validTo = formatPromocodeDisplayDate(setting.validTo);

  return (
    <div className="promocode-edit-header">
      <nav className="promocode-edit-breadcrumb" aria-label="Breadcrumb">
        <Link href="/promocodes/promoList" className="promocode-edit-breadcrumb-link">
          <ArrowLeft size={16} aria-hidden />
          Promo list
        </Link>
        <span className="promocode-edit-breadcrumb-sep">/</span>
        <span>Edit promocode</span>
      </nav>

      <div className="promocode-edit-title-row">
        <div>
          <h1 className="promocode-edit-title">Edit promocode</h1>
          <p className="promocode-edit-subtitle">
            Update settings, invitation details, and club options for this code.
          </p>
        </div>
        <div className="promocode-edit-title-actions">
          <Link href={`/promocodes/promoDetail/${setting.id}`} className="promocode-edit-link-btn">
            <BarChart3 size={16} aria-hidden />
            View usage
          </Link>
        </div>
      </div>

      <div className="promocode-edit-summary">
        <div className="promocode-edit-summary-main">
          <span className="promocode-edit-summary-label">
            <Tag size={14} aria-hidden />
            Code
          </span>
          <span className="promocode-edit-code">{setting.code}</span>
          <div className="promocode-edit-badges">{statusBadge(setting.validTo, setting.enable)}</div>
        </div>

        <dl className="promocode-edit-stats">
          <div className="promocode-edit-stat">
            <dt>
              <Calendar size={14} aria-hidden />
              Created
            </dt>
            <dd>{created || '—'}</dd>
          </div>
          <div className="promocode-edit-stat">
            <dt>
              <Calendar size={14} aria-hidden />
              Valid from
            </dt>
            <dd>{validFrom || '—'}</dd>
          </div>
          <div className="promocode-edit-stat">
            <dt>
              <Calendar size={14} aria-hidden />
              Expires
            </dt>
            <dd>{validTo || '—'}</dd>
          </div>
          <div className="promocode-edit-stat">
            <dt>
              <Mail size={14} aria-hidden />
              Invites sent
            </dt>
            <dd>{setting.inviteCount ?? 0}</dd>
          </div>
          <div className="promocode-edit-stat">
            <dt>Discount</dt>
            <dd>{setting.discount != null && setting.discount !== '' ? `${setting.discount}%` : '—'}</dd>
          </div>
          <div className="promocode-edit-stat">
            <dt>Usable by</dt>
            <dd>{setting.usableBy || '—'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export function PromocodeFormLoading() {
  return (
    <div className="promocode-edit-shell">
      <div className="promocode-edit-loading">
        <div className="promocode-edit-loading-bar" />
        <div className="promocode-edit-loading-card" />
        <div className="promocode-edit-loading-form" />
      </div>
    </div>
  );
}

/** @deprecated Use PromocodeFormLoading */
export const PromocodeEditLoading = PromocodeFormLoading;
