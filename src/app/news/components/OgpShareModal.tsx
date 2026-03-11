'use client';

import { useState, useEffect } from 'react';
import { X, Link2, MessageCircle, Send } from 'lucide-react';

export interface OgpShareArticle {
  url: string;
  title?: string | null;
}

interface OgpShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: OgpShareArticle | null;
  onCopyLink?: () => void;
}

function buildWhatsAppShareUrl(url: string, title?: string | null): string {
  const text = [title, url].filter(Boolean).join(' ');
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function buildTelegramShareUrl(url: string, title?: string | null): string {
  const params = new URLSearchParams();
  params.set('url', url);
  if (title) params.set('text', title);
  return `https://t.me/share/url?${params.toString()}`;
}

function buildFacebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export default function OgpShareModal({ isOpen, onClose, article, onCopyLink }: OgpShareModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      return;
    }
    setCopied(false);
  }, [isOpen, article?.url]);

  if (!isOpen) return null;

  const url = article?.url ?? '';
  const title = article?.title ?? null;

  const handleShare = (shareUrl: string) => {
    if (typeof window !== 'undefined') {
      window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=500');
    }
  };

  const handleCopyLink = () => {
    if (url && typeof navigator?.clipboard?.writeText === 'function') {
      navigator.clipboard.writeText(url);
      setCopied(true);
      onCopyLink?.();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ogp-share-modal-title"
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 id="ogp-share-modal-title" className="text-lg font-semibold text-gray-900">
            Share this OGP
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleShare(buildWhatsAppShareUrl(url, title))}
              disabled={!url}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50/50 py-6 px-4 hover:bg-green-50 hover:border-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Share on WhatsApp"
            >
              <MessageCircle className="w-10 h-10 text-green-600" strokeWidth={1.5} />
              <span className="text-sm font-medium text-gray-800">WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => handleShare(buildTelegramShareUrl(url, title))}
              disabled={!url}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50/50 py-6 px-4 hover:bg-sky-50 hover:border-sky-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Share on Telegram"
            >
              <Send className="w-10 h-10 text-sky-500" strokeWidth={1.5} />
              <span className="text-sm font-medium text-gray-800">Telegram</span>
            </button>
            <button
              type="button"
              onClick={() => handleShare(buildFacebookShareUrl(url))}
              disabled={!url}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50/50 py-6 px-4 hover:bg-blue-50 hover:border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Share on Facebook"
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1877f2] text-white text-xl font-bold font-sans">
                f
              </span>
              <span className="text-sm font-medium text-gray-800">Facebook</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            disabled={!url}
            className="mt-4 flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 hover:bg-gray-100 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Copy link"
          >
            <Link2 className="w-5 h-5 text-gray-500 shrink-0" />
            <span className="text-sm font-medium text-gray-800">
              {copied ? 'Link copied!' : 'Get link'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
