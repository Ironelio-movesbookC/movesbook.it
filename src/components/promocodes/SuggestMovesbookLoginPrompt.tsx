'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

const STORAGE_KEY = 'suggest_mb_intro_seen';

const DEFAULT_INTRO =
  'Suggest Movesbook to friends and earn credits when they register with your promocode. Invite by email, WhatsApp or Telegram — and when allowed, create your own child promocodes to grow your network.';

export default function SuggestMovesbookLoginPrompt() {
  const { isAuthenticated, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setOpen(false);
      return;
    }
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') {
        setOpen(false);
        return;
      }
      setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [isAuthenticated, user]);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Suggest Movesbook"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#fff',
          maxWidth: 520,
          width: '100%',
          borderRadius: 8,
          padding: 24,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        <h2 style={{ margin: '0 0 12px', color: '#7b0a26', fontSize: 22 }}>Suggest Movesbook</h2>
        <p style={{ margin: '0 0 16px', lineHeight: 1.5, fontSize: 15 }}>{DEFAULT_INTRO}</p>
        {!imgFailed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/images/suggest-movesbook-guide.png"
            alt=""
            onError={() => setImgFailed(true)}
            style={{ width: '100%', maxHeight: 220, objectFit: 'contain', marginBottom: 16 }}
          />
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <a
            href="/users/notification_by_promocode"
            onClick={dismiss}
            style={{
              padding: '8px 14px',
              background: '#7b0a26',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: 4,
              fontSize: 14,
            }}
          >
            Open Suggest Movesbook
          </a>
          <button
            type="button"
            onClick={dismiss}
            style={{
              padding: '8px 14px',
              border: '1px solid #ccc',
              borderRadius: 4,
              background: '#f5f5f5',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
