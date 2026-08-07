'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  Bell,
  Link2,
  Paperclip,
  QrCode,
  Settings,
  UserPlus,
  User,
  Users,
  VolumeX,
  Search,
  Trash2,
  ChevronRight,
  Send,
  Camera,
  Shield,
  SlidersHorizontal,
  X,
  Check,
  ArrowLeft,
  ShieldPlus,
} from 'lucide-react';
import ChatSettingsUsersModal, {
  defaultChatUserFilterSettings,
  type ChatUserFilterSettings,
} from './ChatSettingsUsersModal';
import ChatPanel from './ChatPanel';

type BroadcastMode = 'all' | 'group' | 'subscribers' | 'favourites';

type BroadcastMessage = { id: string; content: string; createdAt: string; mode: BroadcastMode };

type ChannelSubscriber = {
  id: number | string;
  name: string;
  image: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
};

type OptionsPayload = {
  sports: { value: string; label: string }[];
  userTypes: { value: string; label: string }[];
  countries: string[];
};

const SETTINGS_KEY = 'adminChatUserSettings';
const HISTORY_KEY = 'adminChatBroadcastHistory';
const MUTE_KEY = 'adminChatMute';
const PHOTO_KEY = 'adminChatChannelPhoto';
const SIGN_MESSAGES_KEY = 'adminChatSignMessages';
const SHOW_AUTHORS_KEY = 'adminChatShowAuthorsProfiles';

const MODE_LABELS: Record<BroadcastMode, string> = {
  all: 'Start chat with all users',
  group: 'Start chat with group selected',
  subscribers: 'Start chat with subscribers',
  favourites: 'Start chat with favourites',
};

const AVATAR_COLORS = [
  '#e17076',
  '#efa5bb',
  '#a695e7',
  '#7bc862',
  '#6ec9cb',
  '#65aadd',
  '#ee7aae',
  '#e4b562',
];

function subscriberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function subscriberAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

type AdminChatExperienceProps = {
  getAuthHeaders: () => Record<string, string>;
};

export default function AdminChatExperience({ getAuthHeaders }: AdminChatExperienceProps) {
  const [mode, setMode] = useState<BroadcastMode>('all');
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<BroadcastMessage[]>([]);
  const [chatUsersCount, setChatUsersCount] = useState(0);

  const [showSettingsUsers, setShowSettingsUsers] = useState(false);
  const [userSettings, setUserSettings] = useState<ChatUserFilterSettings>(defaultChatUserFilterSettings);
  const [options, setOptions] = useState<OptionsPayload | null>(null);

  const [showComposerMenu, setShowComposerMenu] = useState(false);
  const [showMuteSubmenu, setShowMuteSubmenu] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  /** Toolbar section: Broadcast chat vs Chat users (1:1). Null = neither open yet. */
  const [mainView, setMainView] = useState<'broadcast' | 'chatUsers' | null>(null);
  const [showBroadcastPanel, setShowBroadcastPanel] = useState(false);
  const [broadcastPanelView, setBroadcastPanelView] = useState<
    'invite' | 'edit' | 'subscribers' | 'administrators'
  >('invite');
  const [channelPhoto, setChannelPhoto] = useState<string | null>(null);
  const [channelName, setChannelName] = useState('movesbook');
  const [channelDescription, setChannelDescription] = useState('');
  const [subscribers, setSubscribers] = useState<ChannelSubscriber[]>([]);
  const [subscriberSearchOpen, setSubscriberSearchOpen] = useState(false);
  const [subscriberSearch, setSubscriberSearch] = useState('');
  const [ownerName, setOwnerName] = useState('Admin');
  const [signMessages, setSignMessages] = useState(false);
  const [showAuthorsProfiles, setShowAuthorsProfiles] = useState(false);

  const composerMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const inviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/register?invite=movesbook-admin`
      : 'https://movesbook.app/register?invite=movesbook-admin';
  const publicInviteDisplay = 't.me/movesbook';

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) setUserSettings(JSON.parse(saved));
      const hist = localStorage.getItem(HISTORY_KEY);
      if (hist) setHistory(JSON.parse(hist));
      setMuted(localStorage.getItem(MUTE_KEY) === '1');
      const photo = localStorage.getItem(PHOTO_KEY);
      if (photo) setChannelPhoto(photo);
      setSignMessages(localStorage.getItem(SIGN_MESSAGES_KEY) === '1');
      setShowAuthorsProfiles(localStorage.getItem(SHOW_AUTHORS_KEY) === '1');
      const adminData = localStorage.getItem('adminUser');
      if (adminData) {
        const parsed = JSON.parse(adminData) as { name?: string; username?: string };
        setOwnerName(parsed.name || parsed.username || 'Admin');
      }
    } catch {
      /* ignore */
    }
  }, []);

  const pingPresence = useCallback(async () => {
    try {
      await fetch('/api/chat/presence', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      });
    } catch {
      /* ignore */
    }
  }, [getAuthHeaders]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/admin-stats', { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setChatUsersCount(data.chatUsersCount ?? 0);
      if (Array.isArray(data.subscribers)) {
        setSubscribers(
          data.subscribers.map((s: ChannelSubscriber) => ({
            id: s.id,
            name: s.name,
            image: s.image ?? null,
            isOnline: Boolean(s.isOnline),
            lastSeenAt: s.lastSeenAt ?? null,
          }))
        );
      }
    } catch {
      /* ignore */
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    pingPresence();
    loadStats();
    const presenceTimer = setInterval(pingPresence, 30_000);
    const statsTimer = setInterval(loadStats, 60_000);
    return () => {
      clearInterval(presenceTimer);
      clearInterval(statsTimer);
    };
  }, [pingPresence, loadStats]);

  useEffect(() => {
    fetch('/api/news/ogp-settings-options', { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setOptions({
            sports: data.sports ?? [],
            userTypes: data.userTypes ?? [],
            countries: data.countries ?? [],
          });
        }
      })
      .catch(() => {});
  }, [getAuthHeaders]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (composerMenuRef.current && !composerMenuRef.current.contains(e.target as Node)) {
        setShowComposerMenu(false);
        setShowMuteSubmenu(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const saveUserSettings = (settings: ChatUserFilterSettings) => {
    setUserSettings(settings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  };

  const deleteUserSettings = () => {
    setUserSettings(defaultChatUserFilterSettings);
    localStorage.removeItem(SETTINGS_KEY);
  };

  const setMute = (value: boolean) => {
    setMuted(value);
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
    setShowComposerMenu(false);
    setShowMuteSubmenu(false);
  };

  const openBroadcastView = () => {
    if (mainView === 'broadcast') {
      setMainView(null);
      setShowBroadcastPanel(false);
      setBroadcastPanelView('invite');
      setSubscriberSearchOpen(false);
      setSubscriberSearch('');
      return;
    }
    setMainView('broadcast');
  };

  const openChatUsersView = () => {
    setMainView(mainView === 'chatUsers' ? null : 'chatUsers');
    setShowBroadcastPanel(false);
    setBroadcastPanelView('invite');
    setSubscriberSearchOpen(false);
    setSubscriberSearch('');
  };

  const openBroadcastPanel = () => {
    setMainView('broadcast');
    setBroadcastPanelView('invite');
    setSubscriberSearchOpen(false);
    setSubscriberSearch('');
    setShowBroadcastPanel(true);
  };

  const closeBroadcastPanel = () => {
    setShowBroadcastPanel(false);
    setBroadcastPanelView('invite');
    setSubscriberSearchOpen(false);
    setSubscriberSearch('');
  };

  const onChannelPhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setChannelPhoto(reader.result);
        try {
          localStorage.setItem(PHOTO_KEY, reader.result);
        } catch {
          /* ignore quota */
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const filteredSubscribers =
    subscriberSearch.trim().length > 0
      ? subscribers.filter((s) => s.name.toLowerCase().includes(subscriberSearch.trim().toLowerCase()))
      : subscribers;

  const sendBroadcast = () => {
    const content = message.trim();
    if (!content) return;
    const entry: BroadcastMessage = {
      id: `${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      mode,
    };
    const next = [...history, entry];
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    setMessage('');
  };

  const filteredHistory =
    searchOpen && searchQuery.trim()
      ? history.filter((m) => m.content.toLowerCase().includes(searchQuery.trim().toLowerCase()))
      : history;

  const toolbarBtn =
    'inline-flex items-center gap-1.5 px-2 py-1.5 text-[12px] text-[#7ec8e3] hover:bg-white/10 rounded transition';

  return (
    <div className="flex h-full w-full min-h-0 min-w-0 flex-1 flex-col bg-[#e8e8e8] px-4 py-2 sm:px-5 lg:px-6">
      {/* Chat section — inset from sidebars on both sides */}
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden border border-[#bdbdbd] bg-white shadow-sm">
        {/* Dark toolbar */}
        <div className="flex w-full shrink-0 flex-wrap items-center gap-1 bg-[#1e2329] px-2 py-1.5 text-[#7ec8e3]">
          <button
            type="button"
            onClick={() => (showBroadcastPanel ? closeBroadcastPanel() : openBroadcastPanel())}
            className={`mr-1 flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[#8b1a1a] text-[10px] font-bold text-white transition ring-offset-1 ring-offset-[#1e2329] hover:brightness-110 ${
              showBroadcastPanel ? 'ring-2 ring-[#7ec8e3]' : ''
            }`}
            title="Broadcast profile"
            aria-pressed={showBroadcastPanel}
          >
            {channelPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={channelPhoto} alt="Broadcast" className="h-full w-full object-cover" />
            ) : (
              'MB'
            )}
          </button>
          <button type="button" className={toolbarBtn} onClick={() => setShowQrModal(true)}>
            <QrCode className="h-4 w-4" />
            Invite by QR Code
          </button>
          <button type="button" className={toolbarBtn} onClick={() => setMute(!muted)} title={muted ? 'Unmute' : 'Mute'}>
            {muted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Bell className="h-4 w-4" />}
            Mute
          </button>
          <button type="button" className={toolbarBtn} title="Add subscribers">
            <UserPlus className="h-4 w-4" />
            Add subscribers
          </button>
          <button type="button" className={toolbarBtn} onClick={() => setShowInviteLink(true)}>
            <Link2 className="h-4 w-4" />
            Invite via Link
          </button>
          <button
            type="button"
            onClick={openBroadcastView}
            className={`mx-2 rounded px-1.5 py-1 text-[12px] transition hover:bg-white/10 ${
              mainView === 'broadcast'
                ? 'font-bold text-white'
                : 'font-medium text-[#7ec8e3]'
            }`}
            aria-pressed={mainView === 'broadcast'}
          >
            Broadcast
          </button>
          <button
            type="button"
            onClick={openChatUsersView}
            className={`rounded px-1.5 py-1 text-[12px] transition hover:bg-white/10 ${
              mainView === 'chatUsers'
                ? 'font-bold text-white'
                : 'font-medium text-[#7ec8e3]'
            }`}
            aria-pressed={mainView === 'chatUsers'}
          >
            Chat users ({chatUsersCount})
          </button>
          <div className="ml-auto">
            <button type="button" className="rounded p-1.5 text-[#7ec8e3] hover:bg-white/10" title="Notifications">
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 w-full flex-1">
          {mainView === 'chatUsers' ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <ChatPanel embedded getAuthHeaders={getAuthHeaders} />
            </div>
          ) : mainView === 'broadcast' ? (
            <>
          {/* Broadcast invite / settings panel (MB button) — left */}
          {showBroadcastPanel && (
            <aside className="flex w-[300px] shrink-0 flex-col overflow-hidden border-r border-[#15202b] bg-[#1c242f] text-white">
              {broadcastPanelView === 'edit' ? (
                <>
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <button
                      type="button"
                      className="rounded p-1 text-[#8ab4d9] hover:bg-white/10"
                      onClick={() => setBroadcastPanelView('invite')}
                      title="Back"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="text-[16px] font-medium">Edit</span>
                    <button
                      type="button"
                      className="rounded p-1 text-[#8ab4d9] hover:bg-white/10"
                      onClick={() => setBroadcastPanelView('invite')}
                      title="Done"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                    <div className="flex flex-col items-center gap-3">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="relative h-24 w-24 overflow-hidden rounded-full bg-[#2b3645]"
                      >
                        {channelPhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={channelPhoto} alt="Channel" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                            MB
                          </span>
                        )}
                        <span className="absolute inset-x-0 bottom-0 bg-black/45 py-1 text-center text-[10px] text-white">
                          Edit
                        </span>
                      </button>
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-[12px] text-[#8ab4d9]">Channel name</span>
                      <input
                        value={channelName}
                        onChange={(e) => setChannelName(e.target.value)}
                        className="w-full rounded-lg border-0 bg-[#2b3645] px-3 py-2.5 text-sm text-white outline-none ring-1 ring-transparent focus:ring-[#50a2e9]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[12px] text-[#8ab4d9]">Description</span>
                      <textarea
                        value={channelDescription}
                        onChange={(e) => setChannelDescription(e.target.value)}
                        rows={4}
                        placeholder="Describe your channel"
                        className="w-full resize-none rounded-lg border-0 bg-[#2b3645] px-3 py-2.5 text-sm text-white outline-none ring-1 ring-transparent placeholder:text-white/30 focus:ring-[#50a2e9]"
                      />
                    </label>
                  </div>
                </>
              ) : broadcastPanelView === 'subscribers' ? (
                <>
                  <div className="flex shrink-0 items-center gap-1 px-2 py-2.5">
                    <button
                      type="button"
                      className="rounded p-1.5 text-white hover:bg-white/10"
                      onClick={() => {
                        setBroadcastPanelView('invite');
                        setSubscriberSearchOpen(false);
                        setSubscriberSearch('');
                      }}
                      title="Back"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    {subscriberSearchOpen ? (
                      <input
                        value={subscriberSearch}
                        onChange={(e) => setSubscriberSearch(e.target.value)}
                        placeholder="Search"
                        autoFocus
                        className="min-w-0 flex-1 border-0 bg-transparent px-1 text-[16px] text-white outline-none placeholder:text-white/40"
                      />
                    ) : (
                      <span className="flex-1 text-[17px] font-medium text-white">Subscribers</span>
                    )}
                    <button
                      type="button"
                      className="rounded p-1.5 text-white hover:bg-white/10"
                      onClick={() => {
                        if (subscriberSearchOpen) {
                          setSubscriberSearchOpen(false);
                          setSubscriberSearch('');
                        } else {
                          setSubscriberSearchOpen(true);
                        }
                      }}
                      title={subscriberSearchOpen ? 'Close search' : 'Search'}
                    >
                      {subscriberSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
                    </button>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                    <button
                      type="button"
                      className="flex w-full items-center gap-4 px-4 py-3.5 text-left hover:bg-white/5"
                      onClick={() => {
                        /* add subscribers */
                      }}
                    >
                      <UserPlus className="h-5 w-5 shrink-0 text-[#64b5f6]" />
                      <span className="text-[16px] text-[#64b5f6]">Add subscribers</span>
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-4 px-4 py-3.5 text-left hover:bg-white/5"
                      onClick={() => setShowInviteLink(true)}
                    >
                      <Link2 className="h-5 w-5 shrink-0 text-[#64b5f6]" />
                      <span className="text-[16px] text-[#64b5f6]">Invite via Link</span>
                    </button>

                    <div className="mx-4 border-t border-white/10" />

                    <p className="px-4 pb-2 pt-3 text-[13px] text-[#8a94a0]">Contacts in this channel</p>

                    {filteredSubscribers.length === 0 ? (
                      <p className="px-4 py-6 text-center text-[13px] text-[#8a94a0]">No subscribers found</p>
                    ) : (
                      filteredSubscribers.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5"
                        >
                          {s.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={s.image}
                              alt=""
                              className="h-11 w-11 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <span
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold text-white"
                              style={{ backgroundColor: subscriberAvatarColor(s.name) }}
                            >
                              {subscriberInitials(s.name)}
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[16px] text-white">{s.name}</span>
                            <span
                              className={`block text-[13px] ${
                                s.isOnline ? 'text-[#64b5f6]' : 'text-[#8a94a0]'
                              }`}
                            >
                              {s.isOnline ? 'online' : 'last seen recently'}
                            </span>
                          </span>
                        </button>
                      ))
                    )}

                    <p className="px-4 py-4 text-center text-[12px] leading-snug text-[#6b7580]">
                      Only channel admins can see this list.
                    </p>
                  </div>
                </>
              ) : broadcastPanelView === 'administrators' ? (
                <>
                  <div className="flex shrink-0 items-center gap-1 px-2 py-2.5">
                    <button
                      type="button"
                      className="rounded p-1.5 text-white hover:bg-white/10"
                      onClick={() => setBroadcastPanelView('invite')}
                      title="Back"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="flex-1 text-[17px] font-medium text-white">Administrators</span>
                    <button
                      type="button"
                      className="rounded p-1.5 text-white hover:bg-white/10"
                      onClick={() => setBroadcastPanelView('invite')}
                      title="Done"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#17212b]">
                    <div className="bg-[#1c2733]">
                      <button
                        type="button"
                        className="flex w-full items-center gap-4 px-4 py-3.5 text-left hover:bg-white/5"
                      >
                        <span className="relative flex h-6 w-6 shrink-0 items-center justify-center text-[#64b5f6]">
                          <ShieldPlus className="h-6 w-6" strokeWidth={1.75} />
                        </span>
                        <span className="text-[16px] text-[#64b5f6]">Add Admin</span>
                      </button>

                      <div className="mx-4 border-t border-white/10" />

                      <div className="flex w-full items-center gap-3 px-4 py-2.5">
                        <span
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold text-white"
                          style={{ backgroundColor: subscriberAvatarColor(ownerName) }}
                        >
                          {subscriberInitials(ownerName)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[16px] text-white">{ownerName}</span>
                          <span className="block text-[13px] text-[#8a94a0]">Owner</span>
                        </span>
                      </div>
                    </div>

                    <p className="px-4 py-3 text-[13px] leading-snug text-[#708499]">
                      You can add admins to help you manage your channel. Press and hold to remove admins.
                    </p>

                    <div className="bg-[#1c2733]">
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-white/5"
                        onClick={() => {
                          setSignMessages((v) => {
                            const next = !v;
                            localStorage.setItem(SIGN_MESSAGES_KEY, next ? '1' : '0');
                            return next;
                          });
                        }}
                      >
                        <span className="flex-1 text-[16px] text-white">Sign Messages</span>
                        <span
                          className={`relative inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-full transition-colors ${
                            signMessages ? 'bg-[#64b5f6]' : 'bg-[#4a5560]'
                          }`}
                          role="switch"
                          aria-checked={signMessages}
                        >
                          <span
                            className={`inline-block h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${
                              signMessages ? 'translate-x-[20px]' : 'translate-x-[2px]'
                            }`}
                          />
                        </span>
                      </button>

                      {signMessages && (
                        <>
                          <div className="mx-4 border-t border-white/10" />
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-white/5"
                            onClick={() => {
                              setShowAuthorsProfiles((v) => {
                                const next = !v;
                                localStorage.setItem(SHOW_AUTHORS_KEY, next ? '1' : '0');
                                return next;
                              });
                            }}
                          >
                            <span className="flex-1 text-[16px] text-white">Show Authors&apos; Profiles</span>
                            <span
                              className={`relative inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-full transition-colors ${
                                showAuthorsProfiles ? 'bg-[#64b5f6]' : 'bg-[#4a5560]'
                              }`}
                              role="switch"
                              aria-checked={showAuthorsProfiles}
                            >
                              <span
                                className={`inline-block h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${
                                  showAuthorsProfiles ? 'translate-x-[20px]' : 'translate-x-[2px]'
                                }`}
                              />
                            </span>
                          </button>
                        </>
                      )}
                    </div>

                    <p className="px-4 py-3 text-[13px] leading-snug text-[#708499]">
                      {signMessages
                        ? "Allow admins to post as their channel or personal account, linking to their profile."
                        : 'Add the names of admins to messages they post.'}
                    </p>
                  </div>
                </>
              ) : (
                <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-4">
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded p-1 text-[#8ab4d9]/80 hover:bg-white/10 hover:text-[#8ab4d9]"
                    onClick={closeBroadcastPanel}
                    title="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* Photo + Set New Photo */}
                  <div className="mb-5 flex items-center gap-3 rounded border border-[#4a7ab0]/70 bg-transparent p-2">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded bg-[#2b3645]"
                    >
                      {channelPhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={channelPhoto} alt="Channel" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-7 w-7 text-white/85" strokeWidth={1.25} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="inline-flex items-center gap-2 text-[14px] font-medium text-[#50a2e9] hover:text-[#7ec8e3]"
                    >
                      <span className="relative inline-flex">
                        <Camera className="h-5 w-5" />
                        <span className="absolute -bottom-0.5 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-[#50a2e9] text-[9px] leading-none font-bold text-[#1c242f]">
                          +
                        </span>
                      </span>
                      Set New Photo
                    </button>
                  </div>

                  <p className="mb-3 text-center text-[14px] text-[#b8c0c8]">Invite by QR Code</p>

                  <div className="mx-auto mb-3 flex h-[190px] w-[190px] items-center justify-center bg-white p-2.5">
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(inviteUrl)}`}
                        alt="Invite QR code"
                        width={170}
                        height={170}
                        className="block"
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2AABEE] shadow">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden>
                            <path d="M9.78 14.25l-.3 4.2c.43 0 .62-.18.85-.4l2.04-1.96 4.23 3.11c.78.43 1.33.2 1.54-.72l2.8-13.17h.01c.25-1.16-.42-1.62-1.18-1.34L3.3 10.1c-1.13.44-1.11 1.07-.19 1.35l4.6 1.44 10.68-6.73c.5-.33.96-.15.58.21" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mb-5 px-1 text-center text-[12px] leading-snug text-[#8a94a0]">
                    Everyone on Telegram can scan this code to write to your channel.
                  </p>

                  <div className="mb-5">
                    <p className="mb-0.5 text-[13px] text-[#8a94a0]">Scan QR code</p>
                    <p className="text-[16px] font-semibold tracking-tight text-white">{publicInviteDisplay}</p>
                    <button
                      type="button"
                      className="mt-0.5 text-[14px] font-medium text-[#50a2e9] hover:underline"
                      onClick={() => {
                        void navigator.clipboard?.writeText(inviteUrl);
                      }}
                    >
                      Invite Link
                    </button>
                  </div>

                  <div className="mt-auto overflow-hidden rounded-xl bg-[#232d3b]">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3.5 py-3 text-left hover:bg-white/5"
                      onClick={() => {
                        setSubscriberSearchOpen(false);
                        setSubscriberSearch('');
                        setBroadcastPanelView('subscribers');
                        void loadStats();
                      }}
                    >
                      <Users className="h-[18px] w-[18px] shrink-0 text-[#8ab4d9]" />
                      <span className="flex-1 text-[15px] text-white">Subscribers</span>
                      <span className="text-[15px] text-[#50a2e9]">{chatUsersCount || subscribers.length}</span>
                    </button>
                    <div className="mx-3.5 border-t border-white/10" />
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3.5 py-3 text-left hover:bg-white/5"
                      onClick={() => setBroadcastPanelView('administrators')}
                    >
                      <Shield className="h-[18px] w-[18px] shrink-0 text-[#8ab4d9]" />
                      <span className="flex-1 text-[15px] text-white">Administrators</span>
                      <span className="text-[15px] text-[#50a2e9]">1</span>
                    </button>
                    <div className="mx-3.5 border-t border-white/10" />
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3.5 py-3 text-left hover:bg-white/5"
                      onClick={() => setBroadcastPanelView('edit')}
                    >
                      <SlidersHorizontal className="h-[18px] w-[18px] shrink-0 text-[#8ab4d9]" />
                      <span className="flex-1 text-[15px] text-white">Channel Settings</span>
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={photoInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={onChannelPhotoChange}
              />
            </aside>
          )}

          {/* Left start-chat column */}
          <aside className="flex w-[260px] shrink-0 flex-col border-r border-[#e0e0e0] bg-white">
            {(Object.keys(MODE_LABELS) as BroadcastMode[]).map((key) => (
              <div
                key={key}
                className={`flex items-center gap-1 border-b border-[#f0f0f0] ${
                  mode === key ? 'bg-[#eef6ff]' : 'hover:bg-[#f7f7f7]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setMode(key)}
                  className="flex flex-1 items-center gap-2 px-3 py-2.5 text-left text-[12px] font-medium text-[#2a6db0] hover:underline"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#c5d8ea] bg-[#e8f4fc] text-[#2a6db0]">
                    <User className="h-3.5 w-3.5" />
                  </span>
                  {MODE_LABELS[key]}
                </button>
                {key === 'group' && (
                  <button
                    type="button"
                    onClick={() => setShowSettingsUsers(true)}
                    className="mr-2 rounded p-1 text-[#666] hover:bg-[#e8e8e8]"
                    title="Settings users"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {(userSettings.sports.length > 0 ||
              userSettings.userTypes.length > 0 ||
              userSettings.countries.length > 0) && (
              <div className="m-2 rounded border border-[#dde] bg-[#f8f8fc] p-2 text-[10px] text-[#555]">
                <div className="mb-1 font-semibold text-[#333]">Group filters active</div>
                {userSettings.sports.length > 0 && <div>Sports: {userSettings.sports.length}</div>}
                {userSettings.userTypes.length > 0 && <div>Types: {userSettings.userTypes.length}</div>}
                {userSettings.countries.length > 0 && <div>Countries: {userSettings.countries.length}</div>}
              </div>
            )}
          </aside>

          {/* Main broadcast pane */}
          <section className="flex min-w-0 flex-1 flex-col bg-[#f7f7f7]">
            {searchOpen && (
              <div className="flex shrink-0 items-center gap-2 border-b border-[#ddd] bg-white px-3 py-2">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search broadcast history…"
                  className="flex-1 border-0 bg-transparent text-sm outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  className="text-xs text-gray-500 hover:underline"
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                >
                  Close
                </button>
              </div>
            )}

            <div className="relative min-h-0 flex-1 overflow-y-auto">
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.09]">
                <div className="relative text-[#9a9a9a]">
                  <svg width="240" height="240" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.7">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
                  </svg>
                  <div className="absolute bottom-8 right-1 rounded-full bg-[#b0b0b0] p-1.5 text-white">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex h-full flex-col gap-2 p-4">
                {filteredHistory.length === 0 ? null : (
                  filteredHistory.map((m) => (
                    <div
                      key={m.id}
                      className="ml-auto max-w-[85%] rounded-lg bg-[#dcf8c6] px-3 py-2 text-sm text-[#222] shadow-sm"
                    >
                      <div className="mb-0.5 text-[10px] font-semibold uppercase text-[#5a7a3a]">
                        {MODE_LABELS[m.mode]}
                      </div>
                      <div className="whitespace-pre-wrap break-words">{m.content}</div>
                      <div className="mt-1 text-right text-[10px] text-gray-500">
                        {new Date(m.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Broadcast composer */}
            <div className="relative shrink-0 border-t border-[#cfcfcf] bg-white px-2 py-2" ref={composerMenuRef}>
              {showComposerMenu && (
                <div className="absolute bottom-full left-2 z-20 mb-1 min-w-[180px] rounded border border-[#ccc] bg-white py-1 shadow-lg">
                  {!showMuteSubmenu ? (
                    <>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-100"
                        onClick={() => setShowMuteSubmenu(true)}
                      >
                        Mute
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100"
                        onClick={() => {
                          setSearchOpen(true);
                          setShowComposerMenu(false);
                        }}
                      >
                        <Search className="h-3.5 w-3.5" />
                        Search
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        onClick={clearHistory}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Clear History
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100"
                        onClick={() => setShowMuteSubmenu(false)}
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                        onClick={() => {
                          setMute(true);
                          setShowComposerMenu(false);
                          setShowMuteSubmenu(false);
                        }}
                      >
                        Disable sound
                      </button>
                      <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100">
                        Mute for…
                      </button>
                      <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100">
                        Customize
                      </button>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setMute(true);
                          setShowComposerMenu(false);
                          setShowMuteSubmenu(false);
                        }}
                      >
                        Mute Forever
                      </button>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 rounded border border-[#cfcfcf] bg-white px-2 py-1.5">
                <button
                  type="button"
                  className="rounded p-1.5 text-[#555] hover:bg-[#e8e8e8]"
                  onClick={() => {
                    setShowComposerMenu((v) => !v);
                    setShowMuteSubmenu(false);
                  }}
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendBroadcast();
                    }
                  }}
                  placeholder="Broadcast"
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
                />
                <button type="button" className="rounded p-1.5 text-[#555] hover:bg-[#e8e8e8]" title="Notifications">
                  <Bell className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded p-1.5 text-[#555] hover:bg-[#e8e8e8]"
                  title="Attach"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={sendBroadcast}
                  disabled={!message.trim()}
                  className="rounded bg-[#8b1a1a] p-1.5 text-white hover:bg-[#6e1414] disabled:opacity-40"
                  title="Send broadcast"
                >
                  <Send className="h-4 w-4" />
                </button>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" />
              </div>
            </div>
          </section>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center bg-[#f7f7f7] text-sm text-gray-500">
              Click <span className="mx-1 font-semibold text-[#2a6db0]">Broadcast</span> or{' '}
              <span className="mx-1 font-semibold text-[#2a6db0]">Chat users</span> to open
            </div>
          )}
        </div>
      </div>

      <ChatSettingsUsersModal
        isOpen={showSettingsUsers}
        onClose={() => setShowSettingsUsers(false)}
        initialSettings={userSettings}
        onSave={saveUserSettings}
        onDeleteSettings={deleteUserSettings}
        options={options}
      />

      {showInviteLink && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"
          onClick={() => setShowInviteLink(false)}
        >
          <div
            className="w-full max-w-md rounded-md border border-[#ccc] bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-base font-semibold">Invite via Link</h3>
            <input
              readOnly
              value={inviteUrl}
              className="mb-3 w-full rounded border border-[#ccc] px-3 py-2 text-sm"
              onFocus={(e) => e.target.select()}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded bg-[#8b1a1a] px-3 py-1.5 text-sm text-white hover:bg-[#6e1414]"
                onClick={() => {
                  void navigator.clipboard?.writeText(inviteUrl);
                }}
              >
                Copy link
              </button>
              <button
                type="button"
                className="rounded border border-[#ccc] px-3 py-1.5 text-sm hover:bg-gray-50"
                onClick={() => setShowInviteLink(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showQrModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-md border border-[#ccc] bg-white p-4 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-base font-semibold">Invite by QR Code</h3>
            <div className="mx-auto mb-3 flex h-48 w-48 items-center justify-center border border-[#ddd] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(inviteUrl)}`}
                alt="Invite QR code"
                width={180}
                height={180}
              />
            </div>
            <p className="mb-3 break-all text-[11px] text-gray-500">{inviteUrl}</p>
            <button
              type="button"
              className="rounded border border-[#ccc] px-4 py-1.5 text-sm hover:bg-gray-50"
              onClick={() => setShowQrModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
