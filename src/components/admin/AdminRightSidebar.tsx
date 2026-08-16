'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, AlignJustify, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { getAdminBearerToken } from '@/lib/admin/clientAdminAuth';
import type { CurrentUsersByCountryPayload } from '@/lib/admin/buildCurrentUsersByCountry';
import type {
  ConnectedUserRow,
  UsersConnectedPayload,
} from '@/lib/admin/buildUsersConnected';
import type { NewestUsersPayload } from '@/lib/admin/buildNewestUsers';
import type {
  LastLoggedDatePreset,
  LastLoggedPayload,
} from '@/lib/admin/lastLoggedShared';
import { LAST_LOGGED_DATE_OPTIONS } from '@/lib/admin/lastLoggedShared';
import {
  STATS_KIND_LABELS,
  STATS_USER_KINDS,
  type StatsUserKind,
} from '@/lib/admin/statisticsKinds';

const CURRENT_USERS_TYPE_OPTIONS: Array<{ value: StatsUserKind | 'all'; label: string }> = [
  { value: 'all', label: 'All Users' },
  { value: 'single', label: 'Athletes' },
  { value: 'coaches', label: 'Coaches' },
  { value: 'teams', label: 'Teams' },
  { value: 'clubs', label: 'Clubs' },
  { value: 'groups', label: 'Groups' },
];

const CONNECTED_TYPE_OPTIONS: Array<{ value: StatsUserKind | 'all'; label: string }> = [
  { value: 'all', label: 'All users' },
  ...STATS_USER_KINDS.map((k) => ({ value: k, label: STATS_KIND_LABELS[k] })),
];

function countryStatsHref(country: string): string {
  return `/admin/statistics/users-distribution?country=${encodeURIComponent(country)}`;
}

function ConnectedAvatar({
  user,
}: {
  user: {
    username: string;
    imageUrl: string | null;
    gender: string | null;
    presence?: 'online' | 'today' | null;
  };
}) {
  const online = user.presence === 'online';
  const today = user.presence === 'today';
  const accent = online
    ? 'text-green-700'
    : today
      ? 'text-orange-600'
      : 'text-[#333]';
  if (user.imageUrl) {
    return (
      <div className="relative h-10 w-10 shrink-0 overflow-hidden border border-[#ccc] bg-white">
        <Image
          src={user.imageUrl}
          alt={user.username}
          fill
          sizes="40px"
          className="object-cover"
          unoptimized
        />
      </div>
    );
  }
  const symbol = user.gender === 'male' ? '♂' : user.gender === 'female' ? '♀' : null;
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center border border-[#ccc] bg-white text-lg font-bold ${accent}`}
    >
      {symbol ?? <User className={`h-5 w-5 ${accent}`} />}
    </div>
  );
}

const SidebarBlock = ({ 
  title, 
  viewAllLink, 
  children, 
  onMoveUp, 
  onMoveDown, 
  isFirst, 
  isLast 
}: { 
  title: string, 
  viewAllLink: string, 
  children: React.ReactNode,
  onMoveUp?: () => void,
  onMoveDown?: () => void,
  isFirst?: boolean,
  isLast?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mb-3 border border-[#dcdcdc] bg-white shadow-sm">
      <div className="bg-[#333] bg-gradient-to-b from-[#444] to-[#222] text-white px-2 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <AlignJustify className="w-4 h-4 text-gray-400" />
          <span className="font-bold text-xs uppercase">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-0.5">
              {/* Arrows removed as per request */}
          </div>
          <Link href={viewAllLink} className="text-[10px] text-white hover:underline ml-1">
            View All
          </Link>
        </div>
      </div>
      {isOpen && (
        <div className="p-2">
          {children}
        </div>
      )}
    </div>
  );
};

interface AdminRightSidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function AdminRightSidebar({ isOpen, onToggle }: AdminRightSidebarProps) {
  const [activeTab, setActiveTab] = useState<'country' | 'list'>('country');
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  const [sectionsOrder, setSectionsOrder] = useState(['current_users', 'users_connected', 'newest_users', 'last_logged']);
  const [currentUsersType, setCurrentUsersType] = useState<StatsUserKind | 'all'>('all');
  const [currentUsers, setCurrentUsers] = useState<CurrentUsersByCountryPayload | null>(null);
  const [currentUsersLoading, setCurrentUsersLoading] = useState(false);

  const [connectedType, setConnectedType] = useState<StatsUserKind | 'all'>('all');
  const [connectedCountry, setConnectedCountry] = useState('');
  const [connected, setConnected] = useState<UsersConnectedPayload | null>(null);
  const [connectedLoading, setConnectedLoading] = useState(false);

  const [newestType, setNewestType] = useState<StatsUserKind | 'all'>('all');
  const [newestCountry, setNewestCountry] = useState('');
  const [newest, setNewest] = useState<NewestUsersPayload | null>(null);
  const [newestLoading, setNewestLoading] = useState(false);

  const [lastLoggedDate, setLastLoggedDate] = useState<LastLoggedDatePreset>('today');
  const [lastLoggedType, setLastLoggedType] = useState<StatsUserKind | 'all'>('all');
  const [lastLoggedCountry, setLastLoggedCountry] = useState('');
  const [lastLogged, setLastLogged] = useState<LastLoggedPayload | null>(null);
  const [lastLoggedLoading, setLastLoggedLoading] = useState(false);

  const [msgOpen, setMsgOpen] = useState(false);
  const [msgUser, setMsgUser] = useState<{ id: string; username: string } | null>(null);
  const [msgSubject, setMsgSubject] = useState('Message from Movesbook Admin');
  const [msgDraft, setMsgDraft] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgError, setMsgError] = useState('');

  const isSidebarOpen = isOpen !== undefined ? isOpen : internalIsOpen;

  const handleToggle = () => {
    if (onToggle) onToggle();
    else setInternalIsOpen(!internalIsOpen);
  };

  useEffect(() => {
    if (!isSidebarOpen) return;
    let cancelled = false;
    const load = async () => {
      const token = getAdminBearerToken();
      if (!token) return;
      setCurrentUsersLoading(true);
      try {
        const qs =
          currentUsersType === 'all' ? '' : `?userType=${encodeURIComponent(currentUsersType)}`;
        const res = await fetch(`/api/admin/current-users-by-country${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed');
        const payload = (await res.json()) as CurrentUsersByCountryPayload;
        if (!cancelled) setCurrentUsers(payload);
      } catch {
        if (!cancelled) setCurrentUsers(null);
      } finally {
        if (!cancelled) setCurrentUsersLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isSidebarOpen, currentUsersType]);

  useEffect(() => {
    if (!isSidebarOpen) return;
    let cancelled = false;
    const load = async () => {
      const token = getAdminBearerToken();
      if (!token) return;
      setConnectedLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.set('limit', '30');
        if (connectedType !== 'all') qs.set('userType', connectedType);
        if (connectedCountry) qs.set('country', connectedCountry);
        const res = await fetch(`/api/admin/users-connected?${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed');
        const payload = (await res.json()) as UsersConnectedPayload;
        if (!cancelled) setConnected(payload);
      } catch {
        if (!cancelled) setConnected(null);
      } finally {
        if (!cancelled) setConnectedLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isSidebarOpen, connectedType, connectedCountry]);

  useEffect(() => {
    if (!isSidebarOpen) return;
    let cancelled = false;
    const load = async () => {
      const token = getAdminBearerToken();
      if (!token) return;
      setNewestLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.set('limit', '30');
        if (newestType !== 'all') qs.set('userType', newestType);
        if (newestCountry) qs.set('country', newestCountry);
        const res = await fetch(`/api/admin/newest-users?${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed');
        const payload = (await res.json()) as NewestUsersPayload;
        if (!cancelled) setNewest(payload);
      } catch {
        if (!cancelled) setNewest(null);
      } finally {
        if (!cancelled) setNewestLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isSidebarOpen, newestType, newestCountry]);

  useEffect(() => {
    if (!isSidebarOpen) return;
    let cancelled = false;
    const load = async () => {
      const token = getAdminBearerToken();
      if (!token) return;
      setLastLoggedLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.set('limit', '30');
        qs.set('date', lastLoggedDate);
        if (lastLoggedType !== 'all') qs.set('userType', lastLoggedType);
        if (lastLoggedCountry) qs.set('country', lastLoggedCountry);
        const res = await fetch(`/api/admin/last-logged?${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed');
        const payload = (await res.json()) as LastLoggedPayload;
        if (!cancelled) setLastLogged(payload);
      } catch {
        if (!cancelled) setLastLogged(null);
      } finally {
        if (!cancelled) setLastLoggedLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isSidebarOpen, lastLoggedDate, lastLoggedType, lastLoggedCountry]);

  const lastLoggedViewAllHref = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set('date', lastLoggedDate);
    if (lastLoggedType !== 'all') qs.set('userType', lastLoggedType);
    if (lastLoggedCountry) qs.set('country', lastLoggedCountry);
    return `/admin/users/logged_users?${qs.toString()}`;
  }, [lastLoggedCountry, lastLoggedDate, lastLoggedType]);

  const sendConnectedMessage = useCallback(async () => {
    if (!msgUser) return;
    const message = msgDraft.trim();
    if (!message) {
      setMsgError('Please enter a message.');
      return;
    }
    const token = getAdminBearerToken();
    if (!token) {
      setMsgError('Admin session not found.');
      return;
    }
    setMsgSending(true);
    setMsgError('');
    try {
      const res = await fetch('/api/admin/registered-users/actions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          segment: 'all',
          userIds: [msgUser.id],
          message,
          subject: msgSubject.trim() || 'Message from Movesbook Admin',
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to send message');
      setMsgOpen(false);
      window.alert('Message sent.');
    } catch (e) {
      setMsgError(e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setMsgSending(false);
    }
  }, [msgUser, msgDraft, msgSubject]);

  const countries = currentUsers?.countries ?? [];
  const totalOnline = currentUsers?.totalOnline ?? 0;
  const totalAll = currentUsers?.totalAll ?? 0;

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...sectionsOrder];
    if (direction === 'up' && index > 0) {
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    setSectionsOrder(newOrder);
  };

  const renderSection = (sectionId: string, index: number) => {
    const isFirst = index === 0;
    const isLast = index === sectionsOrder.length - 1;
    const commonProps = {
        onMoveUp: () => moveSection(index, 'up'),
        onMoveDown: () => moveSection(index, 'down'),
        isFirst,
        isLast
    };

    switch (sectionId) {
        case 'current_users':
            return (
                <SidebarBlock key="current_users" title="Current Users" viewAllLink="/admin/users/current_users" {...commonProps}>
                    <div>
                    {/* Tabs */}
                    <div className="flex gap-2 mb-2 justify-center">
                        <button
                        onClick={() => setActiveTab('country')}
                        className={`py-1 px-3 text-center text-[11px] font-bold rounded-sm border shadow-sm transition-colors ${
                            activeTab === 'country' 
                            ? 'bg-[#222] text-white border-black' 
                            : 'bg-[#f0f0f0] text-[#333] border-[#ccc]'
                        }`}
                        >
                        ..for country
                        </button>
                        <button
                        onClick={() => setActiveTab('list')}
                        className={`py-1 px-3 text-center text-[11px] font-bold rounded-sm border shadow-sm transition-colors ${
                            activeTab === 'list' 
                            ? 'bg-[#222] text-white border-black' 
                            : 'bg-[#f0f0f0] text-[#333] border-[#ccc]'
                        }`}
                        >
                        List of users
                        </button>
                    </div>

                    {activeTab === 'country' && (
                        <>
                        {/* Dropdown */}
                        <div className="flex items-center justify-between mb-2 text-[11px]">
                            <span className="text-[#333]">Select type of users</span>
                            <select
                              className="border border-[#ccc] bg-white rounded-sm px-1 py-0.5 w-[100px] outline-none"
                              value={currentUsersType}
                              onChange={(e) =>
                                setCurrentUsersType(e.target.value as StatsUserKind | 'all')
                              }
                            >
                              {CURRENT_USERS_TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                        </div>

                        {/* Table */}
                        <div className="border border-[#aeaeae] bg-white text-[11px]">
                            {/* Header */}
                            <div className="grid grid-cols-[1fr_40px_35px] bg-[#d1d1e0] text-[#333] border-b border-[#aeaeae]">
                            <div className="px-2 py-1">Country</div>
                            <div className="px-1 py-1 text-center border-l border-[#bfbfcf] bg-[#c2c2d6]">Online</div>
                            <div className="px-1 py-1 text-center border-l border-[#bfbfcf] bg-[#c2c2d6]">All</div>
                            </div>

                            {/* Total Row */}
                            <div className="grid grid-cols-[1fr_40px_35px] bg-[#004d40] text-white font-bold border-b border-[#aeaeae]">
                            <div className="px-2 py-1 text-[#ffff00]">Total</div>
                            <div className="px-1 py-1 text-center border-l border-[#00332a] text-[#ffff00]">{totalOnline}</div>
                            <div className="px-1 py-1 text-center border-l border-[#00332a] text-[#ffff00]">{totalAll}</div>
                            </div>

                            {/* Country List - Enlarged */}
                            <div className="max-h-[500px] overflow-y-auto">
                            {currentUsersLoading ? (
                              <div className="px-2 py-3 text-[#666]">Loading…</div>
                            ) : countries.length === 0 ? (
                              <div className="px-2 py-3 text-[#666]">No active users</div>
                            ) : (
                              countries.map((country) => (
                                <div key={country.name} className="grid grid-cols-[1fr_40px_35px] border-b border-[#eee] hover:bg-[#f5f5f5]">
                                <div className="px-2 py-1 truncate">
                                  <Link
                                    href={countryStatsHref(country.name)}
                                    className="text-[#058592] font-semibold hover:underline"
                                    title={`Open stats for ${country.name}`}
                                  >
                                    {country.name}
                                  </Link>
                                </div>
                                <div className="px-1 py-1 text-center border-l border-[#eee] text-[#333]">{country.online}</div>
                                <div className="px-1 py-1 text-center border-l border-[#eee] text-[#333]">{country.all}</div>
                                </div>
                              ))
                            )}
                            </div>
                            
                            <div className="text-right p-1 bg-[#f9f9f9] border-t border-[#eee]">
                            <Link href="/admin/users/current_users" className="text-[10px] text-[#333] hover:underline">View all</Link>
                            </div>
                        </div>
                        </>
                    )}

                    {activeTab === 'list' && (
                      <div className="text-[11px] text-[#555] px-1 py-2">
                        <Link href="/admin/users/current_users" className="text-[#058592] font-semibold hover:underline">
                          Open full current users list
                        </Link>
                      </div>
                    )}
                    </div>
                </SidebarBlock>
            );
        case 'users_connected':
            return (
                <SidebarBlock key="users_connected" title="USERS CONNECTED" viewAllLink="/admin/users/connected" {...commonProps}>
                    <div className="space-y-2 mb-2">
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-[#333]">Type of user</span>
                            <select
                              className="border border-[#ccc] bg-white rounded-sm px-1 py-0.5 w-[120px] outline-none"
                              value={connectedType}
                              onChange={(e) =>
                                setConnectedType(e.target.value as StatsUserKind | 'all')
                              }
                            >
                              {CONNECTED_TYPE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-[#333]">Country</span>
                            <select
                              className="border border-[#ccc] bg-white rounded-sm px-1 py-0.5 w-[120px] outline-none"
                              value={connectedCountry}
                              onChange={(e) => setConnectedCountry(e.target.value)}
                            >
                                <option value="">All country</option>
                                {(connected?.countries ?? []).map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-between text-[10px] font-semibold px-0.5">
                          <span className="text-green-700">Online {connected?.onlineCount ?? 0}</span>
                          <span className="text-orange-600">Today {connected?.todayOfflineCount ?? 0}</span>
                        </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                    {connectedLoading ? (
                      <div className="py-3 text-[11px] text-[#666]">Loading…</div>
                    ) : !(connected?.users.length) ? (
                      <div className="py-3 text-[11px] text-[#888]">No users connected today</div>
                    ) : (
                      connected.users.map((user) => {
                        const online = user.presence === 'online';
                        const nameClass = online
                          ? 'text-green-700'
                          : 'text-orange-600';
                        return (
                          <div
                            key={user.id}
                            className="flex gap-2 items-start border-b border-[#eee] py-2 last:border-0"
                          >
                            <ConnectedAvatar user={user} />
                            <div className="flex flex-col text-[11px] leading-tight min-w-0">
                              <Link
                                href={`/admin/all?openUser=${encodeURIComponent(user.id)}`}
                                className={`font-bold hover:underline mb-0.5 truncate ${nameClass}`}
                                title="Open user panel"
                              >
                                {user.username}
                              </Link>
                              {user.location ? (
                                <span className="text-[#333] mb-0.5 truncate">{user.location}</span>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => {
                                  setMsgUser(user);
                                  setMsgSubject('Message from Movesbook Admin');
                                  setMsgDraft('');
                                  setMsgError('');
                                  setMsgOpen(true);
                                }}
                                className="flex items-center gap-1 text-[#333] hover:underline mt-0.5 text-left"
                              >
                                <Mail className="w-3 h-3" />
                                <span>Send Message</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                    </div>
                </SidebarBlock>
            );
        case 'newest_users':
            return (
                <SidebarBlock key="newest_users" title="Newest Users" viewAllLink="/admin/users/newest_members" {...commonProps}>
                    <div className="space-y-2 mb-2">
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-[#333]">Type of user</span>
                            <select
                              className="border border-[#ccc] bg-white rounded-sm px-1 py-0.5 w-[120px] outline-none"
                              value={newestType}
                              onChange={(e) =>
                                setNewestType(e.target.value as StatsUserKind | 'all')
                              }
                            >
                              {CONNECTED_TYPE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-[#333]">Country</span>
                            <select
                              className="border border-[#ccc] bg-white rounded-sm px-1 py-0.5 w-[120px] outline-none"
                              value={newestCountry}
                              onChange={(e) => setNewestCountry(e.target.value)}
                            >
                                <option value="">All Countries</option>
                                {(newest?.countries ?? []).map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                    {newestLoading ? (
                      <div className="py-3 text-[11px] text-[#666]">Loading…</div>
                    ) : !(newest?.users.length) ? (
                      <div className="py-3 text-[11px] text-[#888]">No newest users (60 days)</div>
                    ) : (
                      newest.users.map((user) => {
                        const online = user.presence === 'online';
                        const today = user.presence === 'today';
                        const nameClass = online
                          ? 'text-green-700'
                          : today
                            ? 'text-orange-600'
                            : 'text-[#333]';
                        return (
                          <div
                            key={user.id}
                            className="flex gap-2 items-start border-b border-[#eee] py-2 last:border-0"
                          >
                            <ConnectedAvatar user={user} />
                            <div className="flex flex-col text-[11px] leading-tight min-w-0">
                              <Link
                                href={`/admin/all?openUser=${encodeURIComponent(user.id)}`}
                                className={`font-bold hover:underline mb-0.5 truncate ${nameClass}`}
                                title="Open user panel"
                              >
                                {user.username}
                              </Link>
                              <span className="font-bold text-[#0088cc] mb-0.5 truncate">
                                {user.roleLabel}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setMsgUser({ id: user.id, username: user.username });
                                  setMsgSubject('Message from Movesbook Admin');
                                  setMsgDraft('');
                                  setMsgError('');
                                  setMsgOpen(true);
                                }}
                                className="flex items-center gap-1 text-[#333] hover:underline mt-0.5 text-left"
                              >
                                <Mail className="w-3 h-3" />
                                <span>Send Message</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                    </div>
                </SidebarBlock>
            );
        case 'last_logged':
            return (
                <SidebarBlock key="last_logged" title="Last Logged" viewAllLink={lastLoggedViewAllHref} {...commonProps}>
                    <div className="space-y-1 mb-2">
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-[#333]">Date login</span>
                            <select
                              className="border border-[#ccc] bg-white rounded-sm px-1 py-0.5 w-[120px] outline-none"
                              value={lastLoggedDate}
                              onChange={(e) =>
                                setLastLoggedDate(e.target.value as LastLoggedDatePreset)
                              }
                            >
                              {LAST_LOGGED_DATE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-[#333]">Type of user</span>
                            <select
                              className="border border-[#ccc] bg-white rounded-sm px-1 py-0.5 w-[120px] outline-none"
                              value={lastLoggedType}
                              onChange={(e) =>
                                setLastLoggedType(e.target.value as StatsUserKind | 'all')
                              }
                            >
                              {CONNECTED_TYPE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-[#333]">Country</span>
                            <select
                              className="border border-[#ccc] bg-white rounded-sm px-1 py-0.5 w-[120px] outline-none"
                              value={lastLoggedCountry}
                              onChange={(e) => setLastLoggedCountry(e.target.value)}
                            >
                                <option value="">All Countries</option>
                                {(lastLogged?.countries ?? []).map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                    {lastLoggedLoading ? (
                      <div className="py-3 text-[11px] text-[#666]">Loading…</div>
                    ) : !(lastLogged?.users.length) ? (
                      <div className="py-3 text-[11px] text-[#888]">No logins for this date</div>
                    ) : (
                      lastLogged.users.map((user) => (
                          <div
                            key={user.id}
                            className="flex gap-2 items-start border-b border-[#eee] py-2 last:border-0"
                          >
                            <ConnectedAvatar user={user} />
                            <div className="flex flex-col text-[11px] leading-tight min-w-0">
                              <Link
                                href={`/admin/all?openUser=${encodeURIComponent(user.id)}`}
                                className="font-bold text-[#333] hover:underline mb-0.5 truncate"
                                title="Open user panel"
                              >
                                {user.username}
                              </Link>
                              {user.location ? (
                                <span className="text-[#333] mb-0.5 truncate">{user.location}</span>
                              ) : null}
                              <span className="font-bold text-[#0088cc] mb-0.5 truncate">
                                {user.roleLabel}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setMsgUser({ id: user.id, username: user.username });
                                  setMsgSubject('Message from Movesbook Admin');
                                  setMsgDraft('');
                                  setMsgError('');
                                  setMsgOpen(true);
                                }}
                                className="flex items-center gap-1 text-[#333] hover:underline mt-0.5 text-left"
                              >
                                <Mail className="w-3 h-3" />
                                <span>Send Message</span>
                              </button>
                            </div>
                          </div>
                      ))
                    )}
                    </div>
                </SidebarBlock>
            );
        default:
            return null;
    }
  };

  return (
    <div className={`relative h-full flex-shrink-0 transition-all duration-300 ${isSidebarOpen ? 'w-[280px]' : 'w-0'}`}>
        <button 
            onClick={handleToggle}
            className="absolute -left-5 top-20 z-50 bg-white text-black rounded-l-md shadow-md border-y border-l border-gray-300 hover:bg-gray-100 flex items-center justify-center w-5 h-12"
            title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
            {isSidebarOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={`w-[280px] bg-[#f2f2f2] border-l border-[#dcdcdc] flex flex-col h-full flex-shrink-0 text-sm p-2 overflow-y-auto font-sans ${!isSidebarOpen && 'hidden'}`}>
            {sectionsOrder.map((sectionId, index) => renderSection(sectionId, index))}
        </div>

        {msgOpen && msgUser ? (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
            <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h2 className="mb-1 text-lg font-semibold text-gray-900">Send message</h2>
              <p className="mb-4 text-sm text-gray-600">To {msgUser.username}</p>
              <label className="mb-2 block text-sm font-medium text-gray-700">Subject</label>
              <input
                type="text"
                value={msgSubject}
                onChange={(e) => setMsgSubject(e.target.value)}
                className="mb-3 w-full rounded border border-gray-400 px-3 py-2 text-sm"
              />
              <label className="mb-2 block text-sm font-medium text-gray-700">Message</label>
              <textarea
                value={msgDraft}
                onChange={(e) => setMsgDraft(e.target.value)}
                rows={5}
                className="mb-3 w-full resize-none rounded border border-gray-400 px-3 py-2 text-sm"
              />
              {msgError ? <p className="mb-2 text-sm text-red-600">{msgError}</p> : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMsgOpen(false)}
                  className="rounded border border-gray-400 px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={msgSending}
                  onClick={() => void sendConnectedMessage()}
                  className="rounded bg-[#058592] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {msgSending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
    </div>
  );
}
