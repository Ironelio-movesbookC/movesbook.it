'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Send, Search, Menu, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ModernNavbar from '@/components/ModernNavbar';
import SimpleFooter from '@/components/SimpleFooter';

type ConversationItem = {
  id: string;
  otherUser: { id: string; name: string; telegramAccount: string | null };
  lastMessage: { content: string; createdAt: string; isOwn: boolean } | null;
  updatedAt: string;
};

type ChatUser = { id: string; name: string; username: string; telegramAccount: string | null };

type MessageItem = {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  isOwn: boolean;
};

export default function ChatPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
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

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
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
    if (user) {
      loadConversations();
      loadUsers();
    }
  }, [user, loadConversations, loadUsers]);

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
    [getAuthHeaders]
  );

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
    } else {
      setMessages([]);
    }
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

  const handleSendMessage = async () => {
    const content = message.trim();
    if (!content || !selectedConversationId || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/chat/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data]);
        setMessage('');
        loadConversations();
      }
    } catch (e) {
      console.error('Send message:', e);
    } finally {
      setSending(false);
    }
  };

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

  const currentConversation = conversations.find((c) => c.id === selectedConversationId);
  const displayName = selectedOtherUser?.name ?? currentConversation?.otherUser.name ?? 'Chat';

  if (loading || !user) {
    return null;
  }

  return (
    <div className="bg-gray-50 flex flex-col" style={{ minHeight: '100vh' }}>
      <div className="print:hidden">
        <ModernNavbar />
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
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

          <div className="flex-1 overflow-y-auto">
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
                      <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-semibold">
                        {u.name.charAt(0).toUpperCase()}
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
                        <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center font-semibold flex-shrink-0">
                          {c.otherUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{c.otherUser.name}</h3>
                          {c.lastMessage && (
                            <p className="text-sm text-gray-600 truncate">{c.lastMessage.content}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {c.lastMessage ? formatTime(c.lastMessage.createdAt) : ''}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-white">
          {selectedConversationId ? (
            <>
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">{displayName}</h2>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingMessages ? (
                  <div className="text-center text-gray-500 text-sm">Loading messages…</div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          msg.isOwn ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Message"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={sending || !message.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg">Select a chat or start a new one with a user</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="print:hidden">
        <SimpleFooter />
      </div>
    </div>
  );
}
