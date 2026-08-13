'use client';

import { MessageSquare, X } from 'lucide-react';
import {
  CHAT_AUDIENCE_OPTIONS,
  type ChatAudience,
} from '@/lib/chat/chatAudience';

type ChatAudienceSelectModalProps = {
  onSelect: (audience: ChatAudience) => void;
  onCancel: () => void;
};

/**
 * Lets the user choose who they want to 1:1 chat with before opening the Chat panel.
 * Phase 1: only Movesbook Staff and Movesbook User are selectable.
 */
export default function ChatAudienceSelectModal({
  onSelect,
  onCancel,
}: ChatAudienceSelectModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl"
        role="dialog"
        aria-labelledby="chat-audience-title"
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 id="chat-audience-title" className="text-lg font-bold text-gray-900">
                Who do you want to chat with?
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Choose a chat type before opening the panel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 p-4">
          {CHAT_AUDIENCE_OPTIONS.filter((o) => o.enabled).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className="flex w-full flex-col items-start rounded-lg border border-gray-200 px-4 py-3 text-left transition-colors hover:border-blue-400 hover:bg-blue-50"
            >
              <span className="text-sm font-semibold text-gray-900">{option.label}</span>
              <span className="mt-0.5 text-xs text-gray-500">{option.description}</span>
            </button>
          ))}
        </div>

        <div className="border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
