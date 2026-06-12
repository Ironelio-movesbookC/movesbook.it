'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Share2, Mail, MessageCircle, Send, Facebook } from 'lucide-react';
import { isValidShareEmail } from '@/lib/shareEmail';
import { sharedWorkoutPublicUrl } from '@/lib/siteUrl';
import {
  buildTelegramShareUrl,
  buildWhatsAppShareUrl,
  ensureShareLinkInMessage,
  FACEBOOK_SHARE_NOTICE,
  openExternalShareUrl,
  shareViaFacebook,
} from '@/utils/socialShareUrls';

interface ShareWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: any;
  day: any;
}

export default function ShareWorkoutModal({
  isOpen,
  onClose,
  workout,
  day
}: ShareWorkoutModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<'whatsapp' | 'telegram' | 'facebook' | 'email' | ''>('');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const shareableLink = useMemo(() => {
    if (!workout?.id) return '';
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/shared/workout/${workout.id}`;
    }
    return sharedWorkoutPublicUrl(workout.id);
  }, [workout?.id]);

  const workoutTitle = workout?.name || `Workout ${workout?.sessionNumber || ''}`;
  const dayDate = day?.date
    ? new Date(day.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const defaultMessage = useMemo(
    () =>
      shareableLink
        ? `Check out this workout: ${workoutTitle}${dayDate ? ` on ${dayDate}` : ''}\n\n${shareableLink}`
        : '',
    [shareableLink, workoutTitle, dayDate]
  );

  useEffect(() => {
    if (!isOpen) {
      setSelectedPlatform('');
      setRecipient('');
      setMessage('');
      return;
    }
    if (defaultMessage) setMessage(defaultMessage);
  }, [isOpen, defaultMessage]);

  if (!isOpen || !workout) return null;

  const handleShare = async () => {
    if (!selectedPlatform) {
      alert('Please select a platform');
      return;
    }
    if (!shareableLink) {
      alert('Share link is not ready. Please try again.');
      return;
    }

    const messageText = ensureShareLinkInMessage(
      message.trim() || defaultMessage,
      shareableLink
    );

    let shareUrl = '';

    switch (selectedPlatform) {
      case 'whatsapp':
        shareUrl = buildWhatsAppShareUrl(recipient, messageText);
        break;
      case 'telegram': {
        const telegram = buildTelegramShareUrl(recipient, shareableLink, messageText);
        shareUrl = telegram.url;
        if (telegram.notice) {
          alert(telegram.notice);
        }
        break;
      }
      case 'facebook': {
        const fb = await shareViaFacebook(shareableLink, messageText);
        if (fb.copiedToClipboard) {
          alert(FACEBOOK_SHARE_NOTICE);
        } else {
          alert(
            `${FACEBOOK_SHARE_NOTICE}\n\n(Could not copy automatically — select and copy the message box above.)`
          );
        }
        onClose();
        return;
      }
      case 'email': {
        const to = recipient.trim();
        if (!to) {
          alert('Email address is required');
          return;
        }
        if (!isValidShareEmail(to)) {
          alert('Please enter a valid email address (e.g. name@example.com).');
          return;
        }

        setIsSending(true);
        try {
          const token = localStorage.getItem('token');
          const response = await fetch('/api/workouts/share/email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              to,
              subject: `Workout: ${workoutTitle} — Movesbook`,
              message: messageText,
              shareLink: shareableLink,
            }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data.error || 'Failed to send email');
          }
          alert(`Email sent to ${to}`);
          onClose();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to send email';
          alert(msg);
        } finally {
          setIsSending(false);
        }
        return;
      }
      default:
        alert('Invalid platform selected');
        return;
    }

    openExternalShareUrl(shareUrl);
    onClose();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink).then(() => {
      alert('Link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy link:', err);
      alert('Failed to copy link');
    });
  };

  return (
    <div className="fixed inset-0 z-[10000000] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="bg-blue-500 text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <Share2 size={20} />
            <h2 className="text-lg font-bold">Share Workout</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Workout Info */}
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <p className="text-sm font-semibold text-gray-900">{workoutTitle}</p>
            {dayDate && <p className="text-xs text-gray-600 mt-1">{dayDate}</p>}
            {workout.moveframes && (
              <p className="text-xs text-gray-500 mt-1">
                {workout.moveframes.length} moveframe(s)
              </p>
            )}
          </div>

          {/* Shareable Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shareable Link:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareableLink}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded bg-gray-50 text-sm"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Recipients will see the workout in Overview mode (read-only)
            </p>
          </div>

          {/* Select Platform */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Platform: <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedPlatform('whatsapp')}
                className={`flex items-center gap-2 px-4 py-3 border-2 rounded-lg transition-all ${
                  selectedPlatform === 'whatsapp'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-green-300'
                }`}
              >
                <MessageCircle size={20} className="text-green-600" />
                <span className="font-medium text-sm">WhatsApp</span>
              </button>

              <button
                onClick={() => setSelectedPlatform('telegram')}
                className={`flex items-center gap-2 px-4 py-3 border-2 rounded-lg transition-all ${
                  selectedPlatform === 'telegram'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-300'
                }`}
              >
                <Send size={20} className="text-blue-600" />
                <span className="font-medium text-sm">Telegram</span>
              </button>

              <button
                onClick={() => setSelectedPlatform('facebook')}
                className={`flex items-center gap-2 px-4 py-3 border-2 rounded-lg transition-all ${
                  selectedPlatform === 'facebook'
                    ? 'border-blue-700 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-300'
                }`}
              >
                <Facebook size={20} className="text-blue-700" />
                <span className="font-medium text-sm">Facebook</span>
              </button>

              <button
                onClick={() => setSelectedPlatform('email')}
                className={`flex items-center gap-2 px-4 py-3 border-2 rounded-lg transition-all ${
                  selectedPlatform === 'email'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 hover:border-red-300'
                }`}
              >
                <Mail size={20} className="text-red-600" />
                <span className="font-medium text-sm">Email</span>
              </button>
            </div>
          </div>

          {/* Recipient (Optional for some platforms) */}
          {selectedPlatform && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient {selectedPlatform === 'email' && <span className="text-red-500">*</span>}
                {selectedPlatform !== 'email' && <span className="text-gray-500">(Optional)</span>}
              </label>
              <input
                type={selectedPlatform === 'email' ? 'email' : 'text'}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={
                  selectedPlatform === 'whatsapp'
                    ? 'Phone number (e.g., +1234567890)'
                    : selectedPlatform === 'telegram'
                    ? 'Telegram @username (e.g., johndoe)'
                    : selectedPlatform === 'email'
                    ? 'name@example.com'
                    : 'Not required for Facebook'
                }
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                disabled={selectedPlatform === 'facebook'}
              />
              {selectedPlatform === 'whatsapp' && !recipient && (
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to open WhatsApp contact selector
                </p>
              )}
              {selectedPlatform === 'telegram' && (
                <p className="text-xs text-gray-500 mt-1">
                  {recipient.trim()
                    ? 'Opens a chat with that @username and your message (including the link).'
                    : 'Opens Telegram so you can choose who to send the link to.'}
                </p>
              )}
              {selectedPlatform === 'email' && (
                <p className="text-xs text-gray-500 mt-1">
                  Movesbook sends the email directly to this address (not your local mail app).
                </p>
              )}
            </div>
          )}

          {/* Custom Message */}
          {selectedPlatform && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                The link is always sent with your message, even if you edit the text above.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={
              isSending ||
              !selectedPlatform ||
              (selectedPlatform === 'email' && !recipient.trim())
            }
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSending
              ? 'Sending…'
              : `Share via ${
                  selectedPlatform
                    ? selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)
                    : 'Platform'
                }`}
          </button>
        </div>
      </div>
    </div>
  );
}

