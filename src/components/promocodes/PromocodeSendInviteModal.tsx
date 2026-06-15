'use client';

type PromocodeSendInviteModalProps = {
  open: boolean;
  email: string;
  onEmailChange: (value: string) => void;
  onClose: () => void;
  onSend: () => void;
};

export default function PromocodeSendInviteModal({
  open,
  email,
  onEmailChange,
  onClose,
  onSend,
}: PromocodeSendInviteModalProps) {
  if (!open) return null;

  return (
    <div className="promo-invite-modal-backdrop" role="dialog" aria-modal="true">
      <div className="promo-invite-modal">
        <div className="promo-invite-modal-header">
          Invite to become member
          <button type="button" className="promo-invite-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="promo-invite-modal-body">
          <label className="promo-invite-label">Put here the mail address to which send the code</label>
          <input
            type="text"
            className="promo-invite-input"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
          />
          <div className="promo-invite-actions">
            <button type="button" className="btn-gray" onClick={onSend}>
              Send an invite
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
