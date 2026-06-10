'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Share2, Mail, MessageCircle, Send, Facebook } from 'lucide-react';
import { templateDaySlotLabel } from '@/lib/workoutDayCopy';
import { sharedDayPublicUrl } from '@/lib/siteUrl';
import { isValidShareEmail } from '@/lib/shareEmail';
import {
  buildTelegramShareUrl,
  buildWhatsAppShareUrl,
  ensureShareLinkInMessage,
  FACEBOOK_SHARE_NOTICE,
  openExternalShareUrl,
  shareViaFacebook,
} from '@/utils/socialShareUrls';

interface ShareDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: any;
}

function buildDefaultDayMessage(day: any, shareableLink: string): string {
  const workoutCount = day.workouts?.length || 0;
  const moveframeCount =
    day.workouts?.reduce(
      (count: number, workout: any) => count + (workout.moveframes?.length || 0),
      0
    ) || 0;

  let dayLabel: string;
  if (day?.dayOfWeek) {
    const weekPart = day.weekNumber ? ` (Week ${day.weekNumber})` : '';
    dayLabel = `${templateDaySlotLabel(day)}${weekPart}`;
  } else if (day?.date) {
    dayLabel = new Date(day.date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } else {
    dayLabel = 'this day';
  }

  const periodPart = day.period?.name ? `\nPeriod: ${day.period.name}` : '';
  return `Check out my workout plan for ${dayLabel}!${periodPart}\n\n${workoutCount} workout(s), ${moveframeCount} exercise(s)\n\n${shareableLink}`;
}

export default function ShareDayModal({ isOpen, onClose, day }: ShareDayModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<
    'whatsapp' | 'telegram' | 'facebook' | 'email' | ''
  >('');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const shareableLink = useMemo(() => {
    if (!day?.id) return '';
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/shared/day/${day.id}`;
    }
    return sharedDayPublicUrl(day.id);
  }, [day?.id]);

  const defaultMessage = useMemo(
    () => (day && shareableLink ? buildDefaultDayMessage(day, shareableLink) : ''),
    [day, shareableLink]
  );

  useEffect(() => {
    if (!isOpen) {
      setSelectedPlatform('');
      setRecipient('');
      setMessage('');
      return;
    }
    if (defaultMessage) {
      setMessage(defaultMessage);
    }
  }, [isOpen, defaultMessage]);

  if (!isOpen || !day) return null;

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
              subject: 'Workout day plan — Movesbook',
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
    if (!shareableLink) return;
    navigator.clipboard.writeText(shareableLink).then(() => {
      alert('Link copied to clipboard!');
    });
  };

  const dayDate =
    day?.date && !day?.dayOfWeek
      ? new Date(day.date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : null;

  return (
    <div className="fixed inset-0 z-[10000000] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
        <div className="bg-blue-500 text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <Share2 size={20} />
            <h2 className="text-lg font-bold">Share Day Plan</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            {day.dayOfWeek ? (
              <p className="text-sm font-semibold text-gray-900">
                {templateDaySlotLabel(day)}
                {day.weekNumber ? ` · Week ${day.weekNumber}` : ''}
              </p>
            ) : (
              dayDate && <p className="text-sm font-semibold text-gray-900">{dayDate}</p>
            )}
            {day.period?.name && (
              <p className="text-xs text-gray-600 mt-1">Period: {day.period.name}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {day.workouts?.length || 0} workout(s),{' '}
              {day.workouts?.reduce(
                (c: number, w: any) => c + (w.moveframes?.length || 0),
                0
              ) || 0}{' '}
              exercise(s)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Shareable Link:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareableLink}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded bg-gray-50 text-sm"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!shareableLink}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium disabled:opacity-50"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Recipients will see the day plan in Overview mode (read-only)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Platform: <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ['whatsapp', MessageCircle, 'text-green-600', 'border-green-500', 'bg-green-50'],
                  ['telegram', Send, 'text-blue-600', 'border-blue-500', 'bg-blue-50'],
                  ['facebook', Facebook, 'text-blue-700', 'border-blue-700', 'bg-blue-50'],
                  ['email', Mail, 'text-red-600', 'border-red-500', 'bg-red-50'],
                ] as const
              ).map(([platform, Icon, iconCls, activeBorder, activeBg]) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => setSelectedPlatform(platform)}
                  className={`flex items-center gap-2 px-4 py-3 border-2 rounded-lg transition-all ${
                    selectedPlatform === platform
                      ? `${activeBorder} ${activeBg}`
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Icon size={20} className={iconCls} />
                  <span className="font-medium text-sm capitalize">{platform}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedPlatform && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient {selectedPlatform === 'email' && <span className="text-red-500">*</span>}
                {selectedPlatform !== 'email' && (
                  <span className="text-gray-500"> (Optional)</span>
                )}
              </label>
              <input
                type="email"
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
              {selectedPlatform === 'facebook' && (
                <p className="text-xs text-amber-700 mt-1 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                  Facebook cannot pre-fill the post text. Your message will be copied to the clipboard — paste it
                  into the post. The link preview requires the shared day page to be live on Movesbook.
                </p>
              )}
              {selectedPlatform === 'email' && (
                <p className="text-xs text-gray-500 mt-1">
                  Movesbook sends the email directly to this address (not your local mail app).
                </p>
              )}
            </div>
          )}

          {selectedPlatform && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message (includes share link)
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

        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 rounded-b-lg">
          <button
            type="button"
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
