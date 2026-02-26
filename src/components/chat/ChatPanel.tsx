'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, Send, Search, Menu, Users, X, Trash2, Settings, ChevronDown, Reply, Copy, Forward } from 'lucide-react';
import ChatSettingsModal, {
  loadChatTheme,
  saveChatTheme,
  type ChatTheme,
} from './ChatSettingsModal';

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

/** Parse "> SenderName: excerpt\n\nbody" reply prefix. Returns null if not a reply. */
function parseReplyQuote(content: string): { replyLine: string; senderName: string; excerpt: string; body: string } | null {
  if (!content.startsWith('> ') || !content.includes('\n\n')) return null;
  const firstLine = content.split('\n')[0];
  const colonIdx = firstLine.indexOf(': ', 2); // skip "> "
  if (colonIdx === -1) return null;
  const senderName = firstLine.slice(2, colonIdx).trim();
  const excerpt = firstLine.slice(colonIdx + 2).trim();
  const body = content.slice(firstLine.length + 2).trimStart(); // after \n\n
  return { replyLine: firstLine, senderName, excerpt, body };
}

function findRepliedMessageId(messages: MessageItem[], senderName: string, excerpt: string): string | null {
  const norm = excerpt.trim().slice(0, 80);
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.senderName !== senderName) continue;
    if (norm === '[Image]' && isImageContent(m.content)) return m.id;
    const firstLine = m.content.split('\n')[0].trim();
    if (!firstLine) continue;
    if (firstLine === norm || firstLine.startsWith(norm) || norm.startsWith(firstLine)) return m.id;
    if (m.content.startsWith(norm) || norm.startsWith(m.content.slice(0, 80))) return m.id;
  }
  return null;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: MessageItem } | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<MessageItem | null>(null);
  const [forwarding, setForwarding] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatTheme, setChatTheme] = useState<ChatTheme>({
    textColor: '#111827',
    backgroundType: 'color',
    backgroundColor: '#ffffff',
    backgroundImage: null,
    watermark: null,
  });

  useEffect(() => {
    setChatTheme(loadChatTheme());
  }, []);

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

  const loadUsers = useCallback(async (search?: string) => {
    try {
      const url = search != null && search.trim() !== ''
        ? `/api/chat/users?search=${encodeURIComponent(search.trim())}`
        : '/api/chat/users';
      const res = await fetch(url, { headers: getAuthHeaders() });
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

  // Debounced search when user list is visible (Telegram-style: by telegramAccount or name)
  useEffect(() => {
    if (!showUserList) return;
    const t = setTimeout(() => {
      loadUsers(searchQuery);
    }, 300);
    return () => clearTimeout(t);
  }, [showUserList, searchQuery, loadUsers]);

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
    setReplyingTo(null);
    setContextMenu(null);
    setForwardingMessage(null);
  }, [selectedConversationId, loadMessages]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [contextMenu]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = messagesScrollRef.current;
    if (el) {
      const target = el.scrollHeight - el.clientHeight;
      if (behavior === 'smooth') {
        el.scrollTo({ top: target, behavior: 'smooth' });
      } else {
        el.scrollTop = target;
      }
    }
    setShowScrollToBottom(false);
  }, []);

  const scrollToMessage = useCallback((messageId: string) => {
    const el = messagesScrollRef.current?.querySelector(`[data-message-id="${messageId}"]`);
    (el as HTMLElement)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleMessagesScroll = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const threshold = 80;
    const atBottom = scrollHeight - scrollTop - clientHeight < threshold;
    setShowScrollToBottom(!atBottom);
  }, []);

  useEffect(() => {
    if (!selectedConversationId || !messages.length) return;
    scrollToBottom('auto');
  }, [selectedConversationId, messages.length, scrollToBottom]);

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

  const buildContentWithReply = useCallback(
    (content: string) => {
      if (!replyingTo) return content;
      const excerpt = isImageContent(replyingTo.content)
        ? '[Image]'
        : replyingTo.content.split('\n')[0].slice(0, 80);
      return `> ${replyingTo.senderName}: ${excerpt}\n\n${content}`;
    },
    [replyingTo]
  );

  const handleSendMessage = async () => {
    const textContent = message.trim();
    if (pendingImage) {
      setSending(true);
      try {
        const contentToSend = buildContentWithReply(pendingImage);
        await sendContent(contentToSend);
        setPendingImage(null);
        setReplyingTo(null);
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
      const contentToSend = buildContentWithReply(textContent);
      await sendContent(contentToSend);
      setMessage('');
      setReplyingTo(null);
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

  const handleMessageContextMenu = (e: React.MouseEvent, msg: MessageItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, message: msg });
  };

  const handleReply = () => {
    if (contextMenu) {
      setReplyingTo(contextMenu.message);
      setContextMenu(null);
    }
  };

  const handleCopy = async () => {
    if (!contextMenu) return;
    const msg = contextMenu.message;
    setContextMenu(null);
    try {
      if (isImageContent(msg.content)) {
        const res = await fetch(msg.content);
        const blob = await res.blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      } else {
        await navigator.clipboard.writeText(msg.content);
      }
    } catch {
      await navigator.clipboard.writeText(msg.content);
    }
  };

  const handleForwardClick = () => {
    if (contextMenu) {
      setForwardingMessage(contextMenu.message);
      setContextMenu(null);
    }
  };

  const handleForwardToConversation = async (targetConversationId: string) => {
    if (!forwardingMessage || forwarding) return;
    setForwarding(true);
    try {
      const isImage = isImageContent(forwardingMessage.content);
      const content = isImage
        ? forwardingMessage.content
        : `Forwarded from ${forwardingMessage.senderName}: ${forwardingMessage.content}`;
      const res = await fetch(`/api/chat/conversations/${targetConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setForwardingMessage(null);
        if (targetConversationId === selectedConversationId) {
          const data = await res.json();
          setMessages((prev) => [...prev, data]);
        }
        loadConversations();
      }
    } catch (e) {
      console.error('Forward message:', e);
    } finally {
      setForwarding(false);
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowUserList(!showUserList)}
              className="flex-1 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
            >
              <Users className="w-4 h-4" />
              {showUserList ? 'Hide users' : 'Start chat with user'}
            </button>
            <button
              type="button"
              onClick={() => setShowChatSettings(true)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              title="Chat appearance settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
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

      <div
        className="flex-1 flex flex-col min-h-0 bg-white relative"
        style={{
          color: chatTheme.textColor,
          backgroundColor:
            chatTheme.backgroundType === 'color' ? chatTheme.backgroundColor : undefined,
          backgroundImage:
            chatTheme.backgroundType === 'image' && chatTheme.backgroundImage
              ? `url(${chatTheme.backgroundImage})`
              : undefined,
          backgroundSize: chatTheme.backgroundType === 'image' ? 'cover' : undefined,
          backgroundPosition: 'center',
        }}
      >
        {chatTheme.watermark && (
          <div
            className="absolute inset-0 pointer-events-none opacity-20 bg-center bg-no-repeat bg-contain z-0"
            style={{ backgroundImage: `url(${chatTheme.watermark})` }}
          />
        )}
        <div className="relative z-10 flex flex-col flex-1 min-h-0">
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

            <div className="flex-1 min-h-0 relative">
              <div
                ref={messagesScrollRef}
                className="absolute inset-0 overflow-y-auto overflow-x-hidden p-4 space-y-4"
                onScroll={handleMessagesScroll}
              >
                {loadingMessages ? (
                  <div className="text-center text-gray-500 text-sm">Loading messages…</div>
                ) : (
                  <>
                    {messages.map((msg) => {
                      const isSelected = selectedMessageIds.has(msg.id);
                      const isImage = isImageContent(msg.content);
                      const replyQuote = !isImage ? parseReplyQuote(msg.content) : null;
                      const linkedMessageId = replyQuote ? findRepliedMessageId(messages, replyQuote.senderName, replyQuote.excerpt) : null;
                      return (
                        <div
                          key={msg.id}
                          data-message-id={msg.id}
                          className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            role={msg.isOwn ? 'button' : undefined}
                            tabIndex={msg.isOwn ? 0 : undefined}
                            onContextMenu={(e) => handleMessageContextMenu(e, msg)}
                            onDoubleClick={() => msg.isOwn && toggleMessageSelection(msg.id, true)}
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
                              <img
                                src={msg.content}
                                alt="Shared"
                                className="max-w-full max-h-48 rounded object-contain"
                              />
                            ) : (
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {replyQuote ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (linkedMessageId) scrollToMessage(linkedMessageId);
                                      }}
                                      className={`text-left w-full rounded px-1 -mx-1 py-0.5 border-l-2 ${
                                        msg.isOwn
                                          ? 'border-blue-300 text-blue-100 hover:bg-blue-600'
                                          : 'border-gray-400 text-gray-600 hover:bg-gray-300'
                                      } ${linkedMessageId ? 'cursor-pointer' : 'cursor-default'}`}
                                      title={linkedMessageId ? 'Jump to linked message' : undefined}
                                    >
                                      {replyQuote.replyLine}
                                    </button>
                                    {replyQuote.body ? (
                                      <>
                                        {'\n\n'}
                                        {linkify(replyQuote.body, msg.isOwn).map((part, i) => (
                                          <span key={i}>{part}</span>
                                        ))}
                                      </>
                                    ) : null}
                                  </>
                                ) : (
                                  linkify(msg.content, msg.isOwn).map((part, i) => (
                                    <span key={i}>{part}</span>
                                  ))
                                )}
                              </p>
                            )}
                            <p className={`text-xs mt-1 ${msg.isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                              {formatTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
              {showScrollToBottom && !loadingMessages && messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => scrollToBottom('smooth')}
                  className="absolute bottom-4 right-4 w-11 h-11 rounded-full bg-gray-700 hover:bg-gray-800 text-white shadow-lg flex items-center justify-center z-20 transition-opacity"
                  title="Jump to latest messages"
                >
                  <ChevronDown className="w-6 h-6" />
                </button>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              {replyingTo && (
                <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200/80 text-gray-700 text-sm">
                  <Reply className="w-4 h-4 flex-shrink-0 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800">Replying to {replyingTo.senderName}</p>
                    <p className="truncate text-gray-600">
                      {isImageContent(replyingTo.content) ? '[Image]' : replyingTo.content.split('\n')[0].slice(0, 60)}
                      {replyingTo.content.length > 60 ? '…' : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="p-1 rounded hover:bg-gray-300 text-gray-500 hover:text-gray-700"
                    aria-label="Cancel reply"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {pendingImage && (
                <div className="mb-2 flex items-center gap-2">
                  <img
                    src={pendingImage}
                    alt="Paste preview"
                    className="h-16 w-16 object-cover rounded border border-gray-300"
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

      {contextMenu && (
        <div
          className="fixed z-50 min-w-[180px] py-1 rounded-xl bg-gray-800 text-white shadow-xl border border-gray-700"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleReply}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-700 transition-colors"
          >
            <Reply className="w-4 h-4 flex-shrink-0" />
            Reply
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-700 transition-colors"
          >
            <Copy className="w-4 h-4 flex-shrink-0" />
            Copy
          </button>
          <button
            type="button"
            onClick={handleForwardClick}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-700 transition-colors"
          >
            <Forward className="w-4 h-4 flex-shrink-0" />
            Forward
          </button>
        </div>
      )}

      {forwardingMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !forwarding && setForwardingMessage(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-sm w-full max-h-[70vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Forward to</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {isImageContent(forwardingMessage.content) ? 'Image' : forwardingMessage.content.slice(0, 40)}
                {forwardingMessage.content.length > 40 ? '…' : ''}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {conversations
                .filter((c) => c.id !== selectedConversationId)
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleForwardToConversation(c.id)}
                    disabled={forwarding}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-semibold flex-shrink-0">
                      {c.otherUser.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900 truncate">{c.otherUser.name}</span>
                  </button>
                ))}
              {conversations.filter((c) => c.id !== selectedConversationId).length === 0 && (
                <p className="text-sm text-gray-500 p-4 text-center">No other conversations. Start a chat first.</p>
              )}
            </div>
            <div className="p-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setForwardingMessage(null)}
                className="w-full py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ChatSettingsModal
        open={showChatSettings}
        onClose={() => setShowChatSettings(false)}
        initialTheme={chatTheme}
        onSave={(theme) => {
          setChatTheme(theme);
          saveChatTheme(theme);
        }}
      />
    </div>
  );
}
