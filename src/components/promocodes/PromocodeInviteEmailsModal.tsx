'use client';

import type { PromocodeInviteEntry } from '@/lib/promocodes/types';

type PromocodeInviteEmailsModalProps = {
  open: boolean;
  entries: PromocodeInviteEntry[];
  onClose: () => void;
};

export default function PromocodeInviteEmailsModal({
  open,
  entries,
  onClose,
}: PromocodeInviteEmailsModalProps) {
  if (!open) return null;

  return (
    <div className="promo-invite-emails-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="promo-invite-emails-modal" onClick={(e) => e.stopPropagation()}>
        <div className="promo-invite-emails-header">Invite emails</div>
        <div className="promo-invite-emails-body">
          {entries.length === 0 ? (
            <p className="promo-invite-emails-empty">No invites sent.</p>
          ) : (
            entries.map((entry, index) => (
              <div key={`${entry.email}-${index}`} className="promo-invite-emails-row">
                <span className="promo-invite-emails-address">{entry.email}</span>
                {entry.registered ? (
                  <span className="promo-invite-emails-registration">
                    registered
                    {entry.registrationDate ? ` ${entry.registrationDate}` : ''}
                    {entry.subscriptionName ? ` ${entry.subscriptionName}` : ''}
                  </span>
                ) : null}
              </div>
            ))
          )}
        </div>
        <div className="promo-invite-emails-footer">
          <button type="button" className="btn-gray" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
