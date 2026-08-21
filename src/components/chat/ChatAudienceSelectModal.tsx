'use client';

import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { MessageSquare, Settings, X } from 'lucide-react';
import {
  CHAT_AUDIENCE_OPTIONS,
  type ChatAudience,
} from '@/lib/chat/chatAudience';
import { isClubAccountUserType } from '@/utils/dashboardRouting';
import {
  CLUB_MEMBER_NAME_VISIBILITY_OPTIONS,
  DEFAULT_CLUB_MEMBER_NAME_VISIBILITY,
  type ClubMemberNameVisibility,
} from '@/lib/chat/clubMemberNameVisibility';
import {
  DEFAULT_MOVESBOOK_USER_NAME_VISIBILITY,
  MOVESBOOK_USER_NAME_VISIBILITY_OPTIONS,
  type MovesbookUserNameVisibility,
} from '@/lib/chat/movesbookUserNameVisibility';

type ChatAudienceSelectModalProps = {
  onSelect: (audience: ChatAudience) => void;
  onCancel: () => void;
  /**
   * When set to a club owner account (CLUB / CLUB_TRAINER), hides "Chatting with Club Admin"
   * and phrases staff/member options around clubs you own.
   */
  userType?: string | null;
};

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Lets the user choose who they want to 1:1 chat with before opening the Chat panel.
 */
export default function ChatAudienceSelectModal({
  onSelect,
  onCancel,
  userType = null,
}: ChatAudienceSelectModalProps) {
  const isClubOwnerAccount = isClubAccountUserType(String(userType ?? ''));

  const audienceOptions = CHAT_AUDIENCE_OPTIONS.filter((o) => {
    if (!o.enabled) return false;
    // Club owner accounts chat with their own staff/members — not other club admins
    if (isClubOwnerAccount && o.value === 'club-admin') return false;
    return true;
  }).map((o) => {
    if (!isClubOwnerAccount) return o;
    if (o.value === 'club-staff') {
      return {
        ...o,
        description:
          '1:1 chat with staff of clubs you own — pick a club first (Telegram required)',
      };
    }
    if (o.value === 'club-member') {
      return {
        ...o,
        description:
          '1:1 chat with members of clubs you own — pick a club first (Telegram required; staff excluded)',
      };
    }
    return o;
  });
  const [nameVisibilityOpen, setNameVisibilityOpen] = useState(false);
  const [visibility, setVisibility] = useState<ClubMemberNameVisibility>(
    DEFAULT_CLUB_MEMBER_NAME_VISIBILITY
  );
  const [draftVisibility, setDraftVisibility] = useState<ClubMemberNameVisibility>(
    DEFAULT_CLUB_MEMBER_NAME_VISIBILITY
  );
  const [loadingVisibility, setLoadingVisibility] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);

  const [movesbookNameVisibilityOpen, setMovesbookNameVisibilityOpen] = useState(false);
  const [movesbookVisibility, setMovesbookVisibility] = useState<MovesbookUserNameVisibility>(
    DEFAULT_MOVESBOOK_USER_NAME_VISIBILITY
  );
  const [draftMovesbookVisibility, setDraftMovesbookVisibility] = useState<MovesbookUserNameVisibility>(
    DEFAULT_MOVESBOOK_USER_NAME_VISIBILITY
  );
  const [loadingMovesbookVisibility, setLoadingMovesbookVisibility] = useState(false);
  const [savingMovesbookVisibility, setSavingMovesbookVisibility] = useState(false);
  const [movesbookVisibilityError, setMovesbookVisibilityError] = useState<string | null>(null);

  const loadVisibility = useCallback(async () => {
    setLoadingVisibility(true);
    setVisibilityError(null);
    try {
      const res = await fetch('/api/chat/club-member-name-visibility', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const v =
          (data.visibility as ClubMemberNameVisibility) ||
          DEFAULT_CLUB_MEMBER_NAME_VISIBILITY;
        setVisibility(v);
        setDraftVisibility(v);
      }
    } catch {
      setVisibilityError('Could not load name visibility setting.');
    } finally {
      setLoadingVisibility(false);
    }
  }, []);

  useEffect(() => {
    if (!nameVisibilityOpen) return;
    void loadVisibility();
  }, [nameVisibilityOpen, loadVisibility]);

  const openNameVisibility = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMovesbookNameVisibilityOpen(false);
    setDraftVisibility(visibility);
    setNameVisibilityOpen(true);
  };

  const saveNameVisibility = async () => {
    setSavingVisibility(true);
    setVisibilityError(null);
    try {
      const res = await fetch('/api/chat/club-member-name-visibility', {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ visibility: draftVisibility }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setVisibilityError(data?.error || 'Could not save setting.');
        return;
      }
      setVisibility(draftVisibility);
      setNameVisibilityOpen(false);
    } catch {
      setVisibilityError('Could not save setting.');
    } finally {
      setSavingVisibility(false);
    }
  };

  const loadMovesbookVisibility = useCallback(async () => {
    setLoadingMovesbookVisibility(true);
    setMovesbookVisibilityError(null);
    try {
      const res = await fetch('/api/chat/movesbook-user-name-visibility', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const v =
          (data.visibility as MovesbookUserNameVisibility) ||
          DEFAULT_MOVESBOOK_USER_NAME_VISIBILITY;
        setMovesbookVisibility(v);
        setDraftMovesbookVisibility(v);
      }
    } catch {
      setMovesbookVisibilityError('Could not load name visibility setting.');
    } finally {
      setLoadingMovesbookVisibility(false);
    }
  }, []);

  useEffect(() => {
    if (!movesbookNameVisibilityOpen) return;
    void loadMovesbookVisibility();
  }, [movesbookNameVisibilityOpen, loadMovesbookVisibility]);

  const openMovesbookUserNameVisibility = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setNameVisibilityOpen(false);
    setDraftMovesbookVisibility(movesbookVisibility);
    setMovesbookNameVisibilityOpen(true);
  };

  const saveMovesbookUserNameVisibility = async () => {
    setSavingMovesbookVisibility(true);
    setMovesbookVisibilityError(null);
    try {
      const res = await fetch('/api/chat/movesbook-user-name-visibility', {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ visibility: draftMovesbookVisibility }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setMovesbookVisibilityError(data?.error || 'Could not save setting.');
        return;
      }
      setMovesbookVisibility(draftMovesbookVisibility);
      setMovesbookNameVisibilityOpen(false);
    } catch {
      setMovesbookVisibilityError('Could not save setting.');
    } finally {
      setSavingMovesbookVisibility(false);
    }
  };

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
          {audienceOptions.map((option) => (
            <div
              key={option.value}
              className="flex items-stretch gap-1 rounded-lg border border-gray-200 transition-colors hover:border-blue-400 hover:bg-blue-50"
            >
              <button
                type="button"
                onClick={() => onSelect(option.value)}
                className="flex min-w-0 flex-1 flex-col items-start px-4 py-3 text-left"
              >
                <span className="text-sm font-semibold text-gray-900">{option.label}</span>
                <span className="mt-0.5 text-xs text-gray-500">{option.description}</span>
              </button>
              {option.value === 'club-member' && (
                <button
                  type="button"
                  onClick={openNameVisibility}
                  className="flex shrink-0 items-center justify-center rounded-r-lg px-3 text-gray-500 transition-colors hover:bg-blue-100 hover:text-gray-800"
                  title="Name visibility settings"
                  aria-label="Club member name visibility settings"
                >
                  <Settings className="h-5 w-5" />
                </button>
              )}
              {option.value === 'movesbook-user' && (
                <button
                  type="button"
                  onClick={openMovesbookUserNameVisibility}
                  className="flex shrink-0 items-center justify-center rounded-r-lg px-3 text-gray-500 transition-colors hover:bg-blue-100 hover:text-gray-800"
                  title="Name visibility settings"
                  aria-label="Movesbook user name visibility settings"
                >
                  <Settings className="h-5 w-5" />
                </button>
              )}
            </div>
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

      {nameVisibilityOpen && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-sm rounded-lg bg-white shadow-xl"
            role="dialog"
            aria-labelledby="club-member-name-visibility-title"
          >
            <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h3
                  id="club-member-name-visibility-title"
                  className="text-base font-semibold text-gray-900"
                >
                  Club member name visibility
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Others can still find you by username or Telegram ID in Search.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNameVisibilityOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4">
              {loadingVisibility ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : (
                CLUB_MEMBER_NAME_VISIBILITY_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="club-member-name-visibility"
                      className="mt-1"
                      checked={draftVisibility === opt.value}
                      onChange={() => setDraftVisibility(opt.value)}
                    />
                    <span className="text-sm text-gray-800">
                      {opt.label}
                      {opt.value === DEFAULT_CLUB_MEMBER_NAME_VISIBILITY && (
                        <span className="ml-1 text-xs text-gray-400">(default)</span>
                      )}
                    </span>
                  </label>
                ))
              )}
              {visibilityError && (
                <p className="text-sm text-red-600">{visibilityError}</p>
              )}
            </div>

            <div className="flex gap-2 border-t border-gray-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setNameVisibilityOpen(false)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveNameVisibility()}
                disabled={savingVisibility || loadingVisibility}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingVisibility ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {movesbookNameVisibilityOpen && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-sm rounded-lg bg-white shadow-xl"
            role="dialog"
            aria-labelledby="movesbook-user-name-visibility-title"
          >
            <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h3
                  id="movesbook-user-name-visibility-title"
                  className="text-base font-semibold text-gray-900"
                >
                  Movesbook user name visibility
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Others can still find you by username or Telegram ID in Search.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMovesbookNameVisibilityOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4">
              {loadingMovesbookVisibility ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : (
                MOVESBOOK_USER_NAME_VISIBILITY_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="movesbook-user-name-visibility"
                      className="mt-1"
                      checked={draftMovesbookVisibility === opt.value}
                      onChange={() => setDraftMovesbookVisibility(opt.value)}
                    />
                    <span className="text-sm text-gray-800">
                      {opt.label}
                      {opt.value === DEFAULT_MOVESBOOK_USER_NAME_VISIBILITY && (
                        <span className="ml-1 text-xs text-gray-400">(default)</span>
                      )}
                    </span>
                  </label>
                ))
              )}
              {movesbookVisibilityError && (
                <p className="text-sm text-red-600">{movesbookVisibilityError}</p>
              )}
            </div>

            <div className="flex gap-2 border-t border-gray-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setMovesbookNameVisibilityOpen(false)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveMovesbookUserNameVisibility()}
                disabled={savingMovesbookVisibility || loadingMovesbookVisibility}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingMovesbookVisibility ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
