'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminChatExperience from '@/components/chat/AdminChatExperience';
import TelegramJoinModal from '@/components/chat/TelegramJoinModal';

/**
 * Club Channel broadcast UI (same as superadmin Movesbook Channel,
 * scoped to the current club's members).
 * Requires club admin Telegram account before opening chat.
 */
export default function ClubChatPanel({
  clubId,
  onCancelTelegram,
}: {
  clubId: string;
  /** Leave chat panel when user cancels the Telegram join modal. */
  onCancelTelegram?: () => void;
}) {
  const [checkingTelegram, setCheckingTelegram] = useState(true);
  const [needsTelegram, setNeedsTelegram] = useState(false);
  const [telegramAccount, setTelegramAccount] = useState('');
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = localStorage.getItem('token');
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const checkTelegram = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        if (!cancelled) {
          setNeedsTelegram(true);
          setCheckingTelegram(false);
        }
        return;
      }

      try {
        const response = await fetch('/api/user/telegram-account', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          if (!cancelled) {
            setNeedsTelegram(true);
            setCheckingTelegram(false);
          }
          return;
        }
        const data = await response.json();
        const hasTelegram = Boolean(
          typeof data.telegramAccount === 'string' && data.telegramAccount.trim()
        );
        if (!cancelled) {
          setNeedsTelegram(!hasTelegram);
          setCheckingTelegram(false);
        }
      } catch (error) {
        console.error('Error checking club admin Telegram account:', error);
        if (!cancelled) {
          setNeedsTelegram(true);
          setCheckingTelegram(false);
        }
      }
    };

    void checkTelegram();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCancelTelegram = () => {
    setTelegramAccount('');
    onCancelTelegram?.();
  };

  const handleJoinChat = async () => {
    if (!telegramAccount.trim()) {
      alert('Please enter your Telegram account');
      return;
    }

    const formattedAccount = telegramAccount.startsWith('@')
      ? telegramAccount.trim()
      : `@${telegramAccount.trim()}`;

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Session not found. Please log in again.');
      return;
    }

    setIsSavingTelegram(true);
    try {
      const response = await fetch('/api/user/telegram-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ telegramAccount: formattedAccount }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        alert(data.error || 'Failed to save Telegram account');
        return;
      }

      setTelegramAccount('');
      setNeedsTelegram(false);
    } catch (error) {
      console.error('Error saving Telegram account:', error);
      alert('Error saving Telegram account. Please try again.');
    } finally {
      setIsSavingTelegram(false);
    }
  };

  if (checkingTelegram) {
    return (
      <div className="flex h-[calc(100dvh-13.5rem)] w-full min-h-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-500">
        Loading chat…
      </div>
    );
  }

  if (needsTelegram) {
    return (
      <TelegramJoinModal
        telegramAccount={telegramAccount}
        isLoading={isSavingTelegram}
        onTelegramAccountChange={setTelegramAccount}
        onCancel={handleCancelTelegram}
        onConfirm={handleJoinChat}
      />
    );
  }

  return (
    <div className="flex h-[calc(100dvh-13.5rem)] w-full min-h-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-[#0e1621]">
      <AdminChatExperience getAuthHeaders={getAuthHeaders} clubId={clubId} />
    </div>
  );
}
