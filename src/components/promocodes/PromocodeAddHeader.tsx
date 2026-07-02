'use client';

import Link from 'next/link';
import { ArrowLeft, Mail, Percent, RefreshCw, Sparkles } from 'lucide-react';

export { PromocodeFormLoading } from '@/components/promocodes/PromocodeEditHeader';

export default function PromocodeAddHeader() {
  return (
    <div className="promocode-edit-header">
      <nav className="promocode-edit-breadcrumb" aria-label="Breadcrumb">
        <Link href="/promocodes/promoList" className="promocode-edit-breadcrumb-link">
          <ArrowLeft size={16} aria-hidden />
          Promo list
        </Link>
        <span className="promocode-edit-breadcrumb-sep">/</span>
        <span>Create promocode</span>
      </nav>

      <div className="promocode-edit-title-row">
        <div>
          <h1 className="promocode-edit-title">Create promocode</h1>
          <p className="promocode-edit-subtitle">
            Configure a new promocode with subscription versions, discount, and invitation email settings.
          </p>
        </div>
      </div>

      <div className="promocode-edit-summary promocode-add-summary">
        <div className="promocode-add-tips">
          <div className="promocode-add-tip">
            <span className="promocode-add-tip-icon">
              <RefreshCw size={18} aria-hidden />
            </span>
            <div>
              <strong>Auto-generated code</strong>
              <p>Use the refresh control next to the code field to generate a new one before saving.</p>
            </div>
          </div>
          <div className="promocode-add-tip">
            <span className="promocode-add-tip-icon">
              <Percent size={18} aria-hidden />
            </span>
            <div>
              <strong>Versions &amp; discount</strong>
              <p>Select which subscription versions apply and set the discount percentage.</p>
            </div>
          </div>
          <div className="promocode-add-tip">
            <span className="promocode-add-tip-icon">
              <Mail size={18} aria-hidden />
            </span>
            <div>
              <strong>Invitation email</strong>
              <p>Add recipient email, expedition name, HTML attachment, and language for invites.</p>
            </div>
          </div>
          <div className="promocode-add-tip">
            <span className="promocode-add-tip-icon is-accent">
              <Sparkles size={18} aria-hidden />
            </span>
            <div>
              <strong>Enable when ready</strong>
              <p>Check Enable so the promocode can be used after you save it.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
