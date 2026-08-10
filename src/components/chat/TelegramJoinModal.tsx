'use client';

import { ExternalLink } from 'lucide-react';

type TelegramJoinModalProps = {
  telegramAccount: string;
  isLoading: boolean;
  onTelegramAccountChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Modal to collect a Telegram @username before opening Movesbook chat.
 * Matches the athlete dashboard "I've joined" confirmation UI.
 */
export default function TelegramJoinModal({
  telegramAccount,
  isLoading,
  onTelegramAccountChange,
  onCancel,
  onConfirm,
}: TelegramJoinModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="p-6">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">
            Provide &apos;I&apos;ve joined&apos; confirmation button
          </h2>

          <div className="mb-6">
            <p className="mb-4 text-sm text-gray-600">
              Let them confirm inside Movesbook chat page UI
            </p>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Telegram Account
              </label>
              <input
                type="text"
                value={telegramAccount}
                onChange={(e) => onTelegramAccountChange(e.target.value)}
                placeholder="@username"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter your Telegram username (e.g., @username)
              </p>
            </div>

            {!telegramAccount && (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="mb-2 text-sm text-gray-700">Don&apos;t have a Telegram account?</p>
                <a
                  href="https://telegram.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Create a Telegram account
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading || !telegramAccount.trim()}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : "I've joined"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
