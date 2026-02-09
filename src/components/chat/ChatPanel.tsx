'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { MessageSquare, Send, Search, Menu, Users, X, Trash2 } from 'lucide-react';

/** Turn URLs in text into clickable links (http/https only). Returns array of React nodes. */
function linkify(text: string, isOwn: boolean): (string | React.ReactNode)[] {
  const urlRegex = /(https?:\/\/[^\s<>]+)/g;
  const parts: (string | React.ReactNode)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const url = match[0];
    const href = url.replace(/[.,;:!?)]+$/, ''); // trim trailing punctuation from link
    parts.push(
      <a
        key={key++}
        href={href.startsWith('http') ? href : `https://${href}`}
        target="_blank"
        rel="noopener noreferrer"
        className={isOwn ? 'underline text-blue-100' : 'underline text-blue-600'}
      >
        {url}
      </a>
    );
    lastIndex = match.index + url.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
}

function isImageContent(content: string): boolean {
  return content.startsWith('data:image/');
}

export type ConversationItem = {
  id: string;
  otherUser: {
    id: string;
    name: string;
    telegramAccount: string | null;
    lastSeenAt: string | null;
    isOnline: boolean;
  };
  lastMessage: { content: string; createdAt: string; isOwn: boolean } | null;
  updatedAt: string;
  unreadCount: number;
};

export type ChatUser = {
  id: string;
  name: string;
  username: string;
  telegramAccount: string | null;
  lastSeenAt: string | null;
  isOnline: boolean;
};

type MessageItem = {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  isOwn: boolean;
};

type ChatPanelProps = {
  /** When true, panel is embedded (e.g. in dashboard); uses flexible height and can show close button */
  embedded?: boolean;
  /** Called when user clicks close (only relevant when embedded) */
  onClose?: () => void;
  /** Auth token provider - if not given, uses localStorage token */
  getAuthHeaders?: () => Record<string, string>;
};

const defaultGetAuthHeaders = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

export default function ChatPanel({ embedded, onClose, getAuthHeaders: getAuthHeadersProp }: ChatPanelProps) {
  const getAuthHeaders = getAuthHeadersProp ?? defaultGetAuthHeaders;

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedOtherUser, setSelectedOtherUser] = useState<{ id: string; name: string } | null>(null);
  const [message, setMessage] = useState('');
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const res = await fetch('/api/chat/conversations', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (e) {
      console.error('Load conversations:', e);
    } finally {
      setLoadingConversations(false);
    }
  }, [getAuthHeaders]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/users', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error('Load users:', e);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadConversations();
    loadUsers();
  }, [loadConversations, loadUsers]);

  useEffect(() => {
    const ping = () => {
      fetch('/api/chat/presence', { method: 'POST', headers: getAuthHeaders() }).catch(() => {});
    };
    ping();
    const interval = setInterval(ping, 30 * 1000);
    return () => clearInterval(interval);
  }, [getAuthHeaders]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      setLoadingMessages(true);
      try {
        const res = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
          loadConversations();
        } else {
          setMessages([]);
        }
      } catch (e) {
        console.error('Load messages:', e);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    },
    [getAuthHeaders, loadConversations]
  );

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
    } else {
      setMessages([]);
    }
    setSelectedMessageIds(new Set());
  }, [selectedConversationId, loadMessages]);

  const handleStartChat = async (otherUser: ChatUser) => {
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ participantId: otherUser.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedConversationId(data.id);
        setSelectedOtherUser({ id: data.otherUser.id, name: data.otherUser.name });
        setShowUserList(false);
        loadConversations();
      }
    } catch (e) {
      console.error('Start chat:', e);
    }
  };

  const sendContent = useCallback(
    async (content: string) => {
      if (!selectedConversationId || sending) return false;
      const res = await fetch(`/api/chat/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data]);
        loadConversations();
        return true;
      }
      return false;
    },
    [selectedConversationId, sending, getAuthHeaders, loadConversations]
  );

  const handleSendMessage = async () => {
    const textContent = message.trim();
    if (pendingImage) {
      setSending(true);
      try {
        await sendContent(pendingImage);
        setPendingImage(null);
      } catch (e) {
        console.error('Send image:', e);
      } finally {
        setSending(false);
      }
      return;
    }
    if (!textContent || !selectedConversationId || sending) return;

    setSending(true);
    try {
      await sendContent(textContent);
      setMessage('');
    } catch (e) {
      console.error('Send message:', e);
    } finally {
      setSending(false);
    }
  };

  const toggleMessageSelection = (messageId: string, isOwn: boolean) => {
    if (!isOwn) return;
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedMessageIds.size === 0 || !selectedConversationId) return;
    setDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedMessageIds).map((messageId) =>
          fetch(
            `/api/chat/conversations/${selectedConversationId}/messages/${messageId}`,
            { method: 'DELETE', headers: getAuthHeaders() }
          )
        )
      );
      setSelectedMessageIds(new Set());
      loadMessages(selectedConversationId);
      loadConversations();
    } catch (e) {
      console.error('Delete messages:', e);
    } finally {
      setDeleting(false);
    }
  };

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            if (selectedConversationId && !sending) {
              setSending(true);
              sendContent(dataUrl)
                .finally(() => setSending(false))
                .catch((err) => console.error('Send pasted image:', err));
            } else {
              setPendingImage(dataUrl);
            }
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    },
    [selectedConversationId, sending, sendContent]
  );

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatConversationTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const currentConversation = conversations.find((c) => c.id === selectedConversationId);
  const displayName = selectedOtherUser?.name ?? currentConversation?.otherUser.name ?? 'Chat';

  const containerClass = embedded
    ? 'flex-1 flex min-h-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm'
    : 'flex-1 flex min-h-0 overflow-hidden';

  return (
    <div className={containerClass}>
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col min-h-0 flex-shrink-0">
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Menu className="w-5 h-5 text-gray-400 cursor-pointer" />
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowUserList(!showUserList)}
            className="mt-2 w-full flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
          >
            <Users className="w-4 h-4" />
            {showUserList ? 'Hide users' : 'Start chat with user'}
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          {showUserList ? (
            <div className="p-2">
              {users.length === 0 ? (
                <p className="text-sm text-gray-500 p-2">No users with Telegram yet.</p>
              ) : (
                users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleStartChat(u)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-semibold">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                          u.isOnline ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                        title={u.isOnline ? 'Online' : 'Offline'}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{u.name}</p>
                      <p className="text-xs text-gray-500 truncate">{u.telegramAccount || u.username}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              {loadingConversations ? (
                <div className="p-4 text-center text-gray-500 text-sm">Loading…</div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No conversations yet. Start a chat with a user above.</div>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedConversationId(c.id);
                      setSelectedOtherUser({ id: c.otherUser.id, name: c.otherUser.name });
                    }}
                    className={`w-full p-4 border-b border-gray-100 text-left hover:bg-gray-50 transition-colors ${
                      selectedConversationId === c.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center font-semibold">
                          {c.otherUser.name.charAt(0).toUpperCase()}
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            c.otherUser.isOnline ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                          title={c.otherUser.isOnline ? 'Online' : 'Offline'}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3
                            className={`font-medium truncate ${c.unreadCount > 0 ? 'text-gray-900 font-semibold' : 'text-gray-900'}`}
                          >
                            {c.otherUser.name}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {c.lastMessage && (
                              <span className="text-xs text-gray-400">
                                {formatConversationTime(c.lastMessage.createdAt)}
                              </span>
                            )}
                            {c.unreadCount > 0 && (
                              <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-[#8774e1] text-white text-xs font-medium flex items-center justify-center">
                                {c.unreadCount > 99 ? '99+' : c.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                        {c.lastMessage && (
                          <p
                            className={`text-sm truncate mt-0.5 ${
                              c.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'
                            }`}
                          >
                            {isImageContent(c.lastMessage.content) ? '[Image]' : c.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-white">
        {selectedConversationId ? (
          <>
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{displayName}</h2>
              {embedded && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
                  title="Close chat"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {selectedMessageIds.size > 0 && (
              <div className="px-4 py-2 border-b border-gray-200 bg-gray-100 flex items-center gap-2 flex-shrink-0">
                <span className="text-sm text-gray-700">
                  {selectedMessageIds.size} message{selectedMessageIds.size !== 1 ? 's' : ''} selected
                </span>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={deleting}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMessageIds(new Set())}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 rounded"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-4">
              {loadingMessages ? (
                <div className="text-center text-gray-500 text-sm">Loading messages…</div>
              ) : (
                messages.map((msg) => {
                  const isSelected = selectedMessageIds.has(msg.id);
                  const isImage = isImageContent(msg.content);
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        role={msg.isOwn ? 'button' : undefined}
                        tabIndex={msg.isOwn ? 0 : undefined}
                        onClick={() => msg.isOwn && toggleMessageSelection(msg.id, true)}
                        onKeyDown={(e) =>
                          msg.isOwn && (e.key === 'Enter' || e.key === ' ') && toggleMessageSelection(msg.id, true)
                        }
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          msg.isOwn ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'
                        } ${msg.isOwn ? 'cursor-pointer select-none' : ''} ${
                          isSelected ? 'ring-2 ring-offset-2 ring-blue-700' : ''
                        }`}
                      >
                        {isImage ? (
                          <Image
                            src={msg.content}
                            alt="Shared"
                            width={320}
                            height={192}
                            className="max-w-full max-h-48 rounded object-contain"
                            unoptimized
                          />
                        ) : (
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {linkify(msg.content, msg.isOwn).map((part, i) => (
                              <span key={i}>{part}</span>
                            ))}
                          </p>
                        )}
                        <p className={`text-xs mt-1 ${msg.isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              {pendingImage && (
                <div className="mb-2 flex items-center gap-2">
                  <Image
                    src={pendingImage}
                    alt="Paste preview"
                    width={64}
                    height={64}
                    className="h-16 w-16 object-cover rounded border border-gray-300"
                    unoptimized
                  />
                  <span className="text-sm text-gray-600">Pasted image — click Send or paste again to replace</span>
                  <button
                    type="button"
                    onClick={() => setPendingImage(null)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Remove
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  onPaste={handlePaste}
                  placeholder="Message (paste image to send)"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={sending || (!message.trim() && !pendingImage)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 min-h-0 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg">Select a chat or start a new one with a user</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
