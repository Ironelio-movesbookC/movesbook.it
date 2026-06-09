'use client';

import { useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Users,
  Calendar,
  TrendingUp,
  Trophy,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react';
import UserProfile from '@/components/UserProfile';
import ClubAdminInfoForm from '@/components/profile/ClubAdminInfoForm';
import ClubReferencesDisplay from '@/components/club/ClubReferencesDisplay';
import ManagedEntitySidebarAvatar from '@/components/entity/ManagedEntitySidebarAvatar';
import {
  getClubProfileDisplayRows,
  parseClubDescriptionMeta,
} from '@/lib/club/clubSidebarLabel';

export type ClubOverviewTabId =
  | 'admin-profile'
  | 'club-profile'
  | 'club-activities'
  | 'contact-info'
  | 'sharings'
  | 'direct-access'
  | 'notifications'
  | 'privacy'
  | 'permissions';

const OVERVIEW_TABS: { id: ClubOverviewTabId; label: string }[] = [
  { id: 'admin-profile', label: 'Admin Profile' },
  { id: 'club-profile', label: 'Club Profile' },
  { id: 'club-activities', label: 'Club Activities' },
  { id: 'contact-info', label: 'Contact Info' },
  { id: 'sharings', label: 'Sharings' },
  { id: 'direct-access', label: 'Direct Access' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'permissions', label: 'Permissions' },
];

interface ClubMember {
  id: string;
  member: {
    id: string;
    name: string;
    username: string;
    email: string;
    userType: string;
  };
  role: string | null;
  joinedAt: Date;
}

interface Club {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  imageUrl?: string | null;
}

type ClubOverviewPanelProps = {
  club: Club | null;
  members: ClubMember[];
  clubProfileEditHref: string;
  onAddMembers?: () => void;
};

function MemberSilhouetteCard({ member }: { member?: ClubMember }) {
  if (member) {
    const initial = member.member.name.charAt(0).toUpperCase();
    return (
      <div className="flex-shrink-0 w-[140px] rounded-xl border-2 border-gray-200 bg-white p-3 shadow-sm">
        <div className="mx-auto mb-2 flex h-24 w-full items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200">
          <span className="text-3xl font-bold text-slate-500">{initial}</span>
        </div>
        <p className="truncate text-center text-xs font-semibold text-gray-900">
          {member.member.name}
        </p>
        <p className="truncate text-center text-[10px] text-gray-500">
          @{member.member.username}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 w-[140px] rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-3">
      <div className="mx-auto mb-2 flex h-24 w-full items-center justify-center rounded-lg bg-gray-200/80">
        <User className="h-12 w-12 text-gray-400" strokeWidth={1.2} />
      </div>
      <div className="h-3 rounded bg-gray-200/80" />
    </div>
  );
}

function HorizontalMemberCarousel({
  members,
  slotCount = 5,
}: {
  members: ClubMember[];
  slotCount?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  const slots: (ClubMember | undefined)[] =
    members.length > 0
      ? members
      : Array.from({ length: slotCount }, () => undefined);

  return (
    <div className="flex w-full min-w-0 max-w-full items-center gap-2">
      <button
        type="button"
        onClick={() => scroll('left')}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white shadow hover:bg-orange-600"
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <div
        ref={scrollRef}
        className="flex min-w-0 flex-1 gap-3 overflow-x-auto pb-2 overscroll-x-contain scrollbar-thin scrollbar-thumb-gray-300"
      >
        {slots.map((m, i) => (
          <MemberSilhouetteCard key={m?.id ?? `empty-${i}`} member={m} />
        ))}
      </div>
      <button
        type="button"
        onClick={() => scroll('right')}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white shadow hover:bg-orange-600"
        aria-label="Scroll right"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </div>
  );
}

function OverviewTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: ClubOverviewTabId;
  onTabChange: (id: ClubOverviewTabId) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectTab = (id: ClubOverviewTabId) => {
    onTabChange(id);
    requestAnimationFrame(() => {
      const btn = scrollRef.current?.querySelector<HTMLButtonElement>(
        `[data-overview-tab="${id}"]`,
      );
      btn?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    });
  };

  return (
    <div
      ref={scrollRef}
      className="flex w-full min-w-0 max-w-full items-stretch gap-0 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth scrollbar-thin"
      role="tablist"
      aria-label="Club overview sections"
    >
      {OVERVIEW_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            data-overview-tab={tab.id}
            aria-selected={isActive}
            onClick={() => selectTab(tab.id)}
            className={`shrink-0 whitespace-nowrap px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold transition-colors ${
              isActive
                ? 'border-b-2 border-blue-600 text-blue-600 -mb-px'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
      <span className="shrink-0 w-4" aria-hidden />
    </div>
  );
}

function TabPlaceholder({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
      <h4 className="text-lg font-semibold text-gray-800 mb-2">{title}</h4>
      {children ?? (
        <p className="text-sm text-gray-500">This section will be available soon.</p>
      )}
    </div>
  );
}

export default function ClubOverviewPanel({
  club,
  members,
  clubProfileEditHref,
  onAddMembers,
}: ClubOverviewPanelProps) {
  const [activeTab, setActiveTab] = useState<ClubOverviewTabId>('admin-profile');

  const profileRows = club ? getClubProfileDisplayRows(club) : [];
  const meta = club ? parseClubDescriptionMeta(club.description) : {};

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 md:p-8 flex-1 flex flex-col min-h-0 min-w-0 w-full max-w-full overflow-hidden">
      {/* 1. Header */}
      <header className="flex items-center justify-between mb-6 shrink-0">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Club Overview</h2>
        <Link
          href={clubProfileEditHref}
          className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
        >
          Manage Club
        </Link>
      </header>

      {/* 2. Statistics cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 shrink-0" aria-label="Club statistics">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold opacity-90">Total Members</h3>
            <Users className="w-5 h-5 opacity-90" />
          </div>
          <p className="text-3xl md:text-4xl font-bold mt-3">{members.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-5 rounded-2xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold opacity-90">Active Today</h3>
            <TrendingUp className="w-5 h-5 opacity-90" />
          </div>
          <p className="text-3xl md:text-4xl font-bold mt-3">8</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-2xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold opacity-90">This Week</h3>
            <Calendar className="w-5 h-5 opacity-90" />
          </div>
          <p className="text-3xl md:text-4xl font-bold mt-3">42</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-5 rounded-2xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold opacity-90">Completion Rate</h3>
            <Trophy className="w-5 h-5 opacity-90" />
          </div>
          <p className="text-3xl md:text-4xl font-bold mt-3">78%</p>
        </div>
      </section>

      {/* 3. Recent Members carousel (always visible) */}
      <section className="mb-8 shrink-0" aria-label="Recent members">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Recent Members</h3>
        <HorizontalMemberCarousel
          members={members.length > 0 ? members.slice(0, 20) : []}
          slotCount={5}
        />
      </section>

      {/* 4. Tab navigation — horizontally scrollable */}
      <nav className="shrink-0 w-full min-w-0 max-w-full border-b border-gray-200 bg-white">
        <OverviewTabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </nav>

      {/* 5. Tab content */}
      <div className="flex-1 min-h-[280px] bg-white pt-6" role="tabpanel">
        {activeTab === 'admin-profile' && (
          <div className="space-y-4 p-6">
            <p className="text-sm text-gray-600">
              Club administrator account — personal details for the owner of this club.
            </p>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <UserProfile embedded embeddedVariant="admin-profile" />
            </div>
            {club ? (
              <ClubReferencesDisplay
                referencesHtml={meta.referencesHtml}
                referencesLevel={meta.referencesLevel}
                editHref={clubProfileEditHref}
              />
            ) : null}
          </div>
        )}

        {activeTab === 'club-profile' && (
          <div className="space-y-4 p-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-1">Club Profile</h3>
              <p className="text-sm text-gray-600 mb-4">Personal details for the club account.</p>
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                <ManagedEntitySidebarAvatar
                  description={club?.description}
                  imageUrl={club?.imageUrl}
                  alt={club?.name ?? 'Club logo'}
                  className="w-20 h-20 rounded-2xl"
                />
                <Link
                  href={clubProfileEditHref}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2"
                >
                  Change profile photo
                </Link>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-gray-600">Official club information registered for this club.</p>
              <Link
                href={clubProfileEditHref}
                className="shrink-0 text-sm font-semibold text-red-600 hover:text-red-800"
              >
                Edit club profile
              </Link>
            </div>
            {profileRows.length > 0 ? (
              <dl className="grid gap-3 sm:grid-cols-2">
                {profileRows.map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                    <dt className="text-xs font-medium text-gray-500">{label}</dt>
                    <dd className="text-sm text-gray-900 mt-0.5 break-words">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-gray-500">No club profile details yet.</p>
            )}
          </div>
        )}

        {activeTab === 'contact-info' && (
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Club administrator contact details. Fields marked &quot;Show in Club admin info&quot; can
              be shared on the club overview for members.
            </p>
            <ClubAdminInfoForm />
          </div>
        )}

        {activeTab === 'direct-access' && (
          <dl className="grid gap-4 max-w-xl p-6">
            <div>
              <dt className="text-xs font-medium text-gray-500">Direct access</dt>
              <dd className="text-sm font-mono text-gray-900 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-1">
                {meta.directAccess?.trim() || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Club username</dt>
              <dd className="text-sm text-gray-900">{meta.username?.trim() || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Direct registration code</dt>
              <dd className="text-sm text-gray-900">
                {meta.directRegistrationCode?.trim() || '—'}
              </dd>
            </div>
          </dl>
        )}

        {activeTab === 'club-activities' && (
          <div className="p-6">
          <TabPlaceholder title="Club Activities">
            <div className="space-y-2 text-sm text-gray-600 text-left max-w-md mx-auto">
              <p>🏊‍♂️ John Doe completed advanced swim workout</p>
              <p>👋 Sarah Wilson joined the club as new member</p>
              <p>🏃‍♀️ Group running session scheduled for Saturday</p>
            </div>
          </TabPlaceholder>
          </div>
        )}

        {['sharings', 'notifications', 'privacy', 'permissions'].includes(activeTab) && (
            <div className="p-6">
              <TabPlaceholder title={OVERVIEW_TABS.find((t) => t.id === activeTab)?.label ?? ''} />
            </div>
          )}
      </div>
    </div>
  );
}
