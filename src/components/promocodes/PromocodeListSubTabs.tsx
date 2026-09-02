'use client';

import { Plus } from 'lucide-react';

type PromocodeListSubTabsProps = {
  onRecipientsSelected: () => void;
  onSendInvite: () => void;
  onAddNew?: () => void;
};

export default function PromocodeListSubTabs({
  onRecipientsSelected,
  onSendInvite,
  onAddNew,
}: PromocodeListSubTabsProps) {
  return (
    <div className="re-tab-bar re-tab-bar-split mtop20">
      <ul>
        <li>
          <a className="active" href="/promocodes/promoList">
            Promocode generated
          </a>
        </li>
        <li>
          <button type="button" className="re-tab-action" onClick={onRecipientsSelected}>
            Recipients record selected
          </button>
        </li>
      </ul>
      <div className="btn-div">
        {onAddNew ? (
          <button type="button" className="btn-black" onClick={onAddNew}>
            <Plus size={14} aria-hidden />
            Add new
          </button>
        ) : null}
        <button type="button" className="btn-black" onClick={onSendInvite}>
          <Plus size={14} aria-hidden />
          Send invite by promocode
        </button>
      </div>
    </div>
  );
}
