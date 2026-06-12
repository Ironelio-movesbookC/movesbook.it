'use client';

import { Plus } from 'lucide-react';

type PromocodeListSubTabsProps = {
  onRecipientsSelected: () => void;
  onAllRecipients: () => void;
  onSendInvite: () => void;
};

export default function PromocodeListSubTabs({
  onRecipientsSelected,
  onAllRecipients,
  onSendInvite,
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
        <li>
          <button type="button" className="re-tab-action" onClick={onAllRecipients}>
            All recipients
          </button>
        </li>
      </ul>
      <div className="btn-div">
        <button type="button" className="btn-black" onClick={onSendInvite}>
          <Plus size={14} aria-hidden />
          Send invite by promocode
        </button>
      </div>
    </div>
  );
}
