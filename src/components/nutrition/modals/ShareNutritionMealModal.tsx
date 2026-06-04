'use client';

import React, { useState } from 'react';
import { X, Share2, Mail, MessageCircle, Send, Facebook } from 'lucide-react';

interface ShareMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: any;
  day: any;
}

export default function ShareMealModal({
  isOpen,
  onClose,
  workout,
  day
}: ShareMealModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<'whatsapp' | 'telegram' | 'facebook' | 'email' | ''>('');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');

  if (!isOpen || !workout) return null;

  // Generate shareable link (this should be a public URL to the workout overview)
  const nutritionMealId = workout.id;
  const shareableLink = `${window.location.origin}/shared/nutrition/${nutritionMealId}`;
  
  const workoutTitle = workout.name || `Workout ${workout.sessionNumber || ''}`;
  const dayDate = day?.date ? new Date(day.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }) : '';

  const defaultMessage = `Check out this workout: ${workoutTitle}${dayDate ? ` on ${dayDate}` : ''}\n\n${shareableLink}`;

  const handleShare = () => {
    if (!selectedPlatform) {
      alert('Please select a platform');
      return;
    }

    const messageText = message || defaultMessage;
    const encodedMessage = encodeURIComponent(messageText);
    const encodedLink = encodeURIComponent(shareableLink);

    let shareUrl = '';

    switch (selectedPlatform) {
      case 'whatsapp':
        if (recipient) {
          // Share to specific phone number
          shareUrl = `https://wa.me/${recipient.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;
        } else {
          // Share via WhatsApp (will open contact selector)
          shareUrl = `https://wa.me/?text=${encodedMessage}`;
        }
        break;

      case 'telegram':
        if (recipient) {
          // Share to specific username
          shareUrl = `https://t.me/${recipient}?text=${encodedMessage}`;
        } else {
          // Share via Telegram (will open contact selector)
          shareUrl = `https://t.me/share/url?url=${encodedLink}&text=${encodeURIComponent(workoutTitle)}`;
        }
        break;

      case 'facebook':
        // Share to Facebook
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}&quote=${encodeURIComponent(messageText)}`;
        break;

      case 'email':
        // Share via email
        const subject = encodeURIComponent(`Workout: ${workoutTitle}`);
        const body = encodeURIComponent(messageText);
        shareUrl = `mailto:${recipient}?subject=${subject}&body=${body}`;
        break;

      default:
        alert('Invalid platform selected');
        return;
    }

    // Open the share URL
    window.open(shareUrl, '_blank');
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
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black bg-opacity-50 p-4">
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
          {/* NutritionMeal Info */}
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <p className="text-sm font-semibold text-gray-900">{workoutTitle}</p>
            {dayDate && <p className="text-xs text-gray-600 mt-1">{dayDate}</p>}
            {workout.nutritionFoods && (
              <p className="text-xs text-gray-500 mt-1">
                {workout.nutritionFoods.length} nutritionFood(s)
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
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={
                  selectedPlatform === 'whatsapp'
                    ? 'Phone number (e.g., +1234567890)'
                    : selectedPlatform === 'telegram'
                    ? 'Username (e.g., @username)'
                    : selectedPlatform === 'email'
                    ? 'Email address (required)'
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
              {selectedPlatform === 'telegram' && !recipient && (
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to open Telegram share dialog
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
                placeholder={defaultMessage}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to use default message
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
            onClick={handleShare}
            disabled={!selectedPlatform || (selectedPlatform === 'email' && !recipient)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Share via {selectedPlatform ? selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1) : 'Platform'}
          </button>
        </div>
      </div>
    </div>
  );
}

