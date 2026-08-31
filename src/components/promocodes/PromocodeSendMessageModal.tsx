'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import PromocodeInviteCKEditor4 from '@/components/promocodes/PromocodeInviteCKEditor4';
import { getCke4Window } from '@/lib/ckeditor4Legacy';

const EDITOR_ID = 'promocode_send_message_content';

function isBlankHtml(value: string): boolean {
  const text = value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length === 0;
}

type PromocodeSendMessageModalProps = {
  open: boolean;
  toEmail: string;
  recipientLabel?: string;
  onClose: () => void;
  onSend: (payload: { to: string; subject: string; html: string }) => Promise<void>;
};

export default function PromocodeSendMessageModal({
  open,
  toEmail,
  recipientLabel,
  onClose,
  onSend,
}: PromocodeSendMessageModalProps) {
  const [subject, setSubject] = useState('Message from Movesbook');
  const [bodyHtml, setBodyHtml] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setSubject('Message from Movesbook');
    setBodyHtml('');
    setError(null);
    setSending(false);
  }, [open, toEmail]);

  if (!open || !mounted) return null;

  const handleSend = async () => {
    const latestHtml =
      typeof window !== 'undefined' && getCke4Window().CKEDITOR?.instances[EDITOR_ID]
        ? getCke4Window().CKEDITOR!.instances[EDITOR_ID].getData()
        : bodyHtml;

    if (isBlankHtml(latestHtml)) {
      setError('Please enter a message.');
      return;
    }

    setSending(true);
    setError(null);
    try {
      await onSend({
        to: toEmail,
        subject: subject.trim() || 'Message from Movesbook',
        html: latestHtml,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const modal = (
    <div className="promo-invite-modal-backdrop promo-send-message-backdrop" role="dialog" aria-modal="true">
      <div className="promo-invite-modal promo-send-message-modal">
        <div className="promo-invite-modal-header">
          Send message
          <button type="button" className="promo-invite-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="promo-send-message-body">
          <label className="promo-invite-label">To</label>
          <input type="text" className="promo-invite-input" value={toEmail} readOnly />
          {recipientLabel && recipientLabel !== toEmail ? (
            <p className="promo-send-message-recipient">Recipient: {recipientLabel}</p>
          ) : null}

          <label className="promo-invite-label">Subject</label>
          <input
            type="text"
            className="promo-invite-input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <label className="promo-invite-label">Message</label>
          <div className="promo-send-message-editor">
            <PromocodeInviteCKEditor4
              id={EDITOR_ID}
              value={bodyHtml}
              onChange={setBodyHtml}
              minHeightPx={180}
            />
          </div>

          {error ? <p className="promo-send-message-error">{error}</p> : null}
        </div>

        <div className="promo-send-message-footer">
          <button type="button" className="btn-gray" onClick={handleSend} disabled={sending}>
            {sending ? 'Sending…' : 'Send message'}
          </button>
          <button type="button" className="btn-gray" onClick={onClose} disabled={sending}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
