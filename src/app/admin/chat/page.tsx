'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminChatExperience from '@/components/chat/AdminChatExperience';
import TelegramJoinModal from '@/components/chat/TelegramJoinModal';

export default function AdminChatPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [checkingTelegram, setCheckingTelegram] = useState(true);
  const [needsTelegram, setNeedsTelegram] = useState(false);
  const [telegramAccount, setTelegramAccount] = useState('');
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);

  useEffect(() => {
    const adminData = localStorage.getItem('adminUser');
    const adminToken = localStorage.getItem('adminToken');
    if (!adminData || !adminToken) {
      router.push('/');
      return;
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    const checkSuperAdminTelegram = async () => {
      const isSuperAdmin = Boolean(localStorage.getItem('superAdminUser'));
      if (!isSuperAdmin) {
        if (!cancelled) {
          setNeedsTelegram(false);
          setCheckingTelegram(false);
        }
        return;
      }

      const token = localStorage.getItem('adminToken');
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
        console.error('Error checking superadmin Telegram account:', error);
        if (!cancelled) {
          setNeedsTelegram(true);
          setCheckingTelegram(false);
        }
      }
    };

    void checkSuperAdminTelegram();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = localStorage.getItem('adminToken');
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }, []);

  const handleCancelTelegram = () => {
    setTelegramAccount('');
    router.push('/admin/dashboard');
  };

  const handleJoinChat = async () => {
    if (!telegramAccount.trim()) {
      alert('Please enter your Telegram account');
      return;
    }

    const formattedAccount = telegramAccount.startsWith('@')
      ? telegramAccount.trim()
      : `@${telegramAccount.trim()}`;

    const token = localStorage.getItem('adminToken');
    if (!token) {
      alert('Admin session not found. Please log in again.');
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

  if (!ready) return null;

  if (checkingTelegram) {
    return (
      <div className="flex h-full min-h-0 w-full flex-1 items-center justify-center text-sm text-gray-500">
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
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">
      <AdminChatExperience getAuthHeaders={getAuthHeaders} />
    </div>
  );
}
