'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Building2, Loader2, UserCircle } from 'lucide-react';
import UserProfile from '@/components/UserProfile';
import {
  getClubProfileDisplayRows,
  formatMyClubsSidebarLabel,
} from '@/lib/club/clubSidebarLabel';
import { useEffect, useState } from 'react';

type ClubSummary = {
  id: string;
  name: string;
  description?: string | null;
  location?: string | null;
};

function ClubProfileSummary({ clubId }: { clubId: string }) {
  const [club, setClub] = useState<ClubSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/clubs/${clubId}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load club');
        const data = await res.json();
        if (!cancelled) setClub(data.club ?? null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load club');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading club…
      </div>
    );
  }

  if (error || !club) {
    return <p className="text-sm text-red-600">{error || 'Club not found'}</p>;
  }

  const rows = getClubProfileDisplayRows(club);

  return (
    <div className="space-y-4">
      <dl className="grid gap-3 sm:grid-cols-2 text-sm">
        {rows.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-gray-500 font-medium">{label}</dt>
            <dd className="text-gray-900 mt-0.5">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-gray-600">
        Sidebar label:{' '}
        <span className="font-medium text-gray-800">{formatMyClubsSidebarLabel(club)}</span>
      </p>
      <div className="flex flex-wrap gap-4">
        <Link
          href={`/my-club/edit?clubId=${encodeURIComponent(clubId)}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-800"
        >
          Edit club profile
        </Link>
        <Link
          href={`/my-club?clubId=${encodeURIComponent(clubId)}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          <Building2 className="w-4 h-4" />
          Open full Club profile
        </Link>
      </div>
    </div>
  );
}

function ClubSettingsContent() {
  const searchParams = useSearchParams();
  const clubId = searchParams?.get('clubId');

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Club settings</h1>
        <p className="text-gray-600 mt-1 text-sm">
          Manage the club administrator account and the club profile in one place.
        </p>
      </div>

      <section id="admin-profile" className="scroll-mt-6">
        <div className="flex items-center gap-2 mb-4">
          <UserCircle className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Admin profile</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Club administrator account — view and edit your personal details.
        </p>
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <UserProfile embedded />
        </div>
      </section>

      <section id="club-profile" className="scroll-mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Club profile</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Official club information registered for this club.
        </p>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          {clubId ? (
            <ClubProfileSummary clubId={clubId} />
          ) : (
            <p className="text-sm text-gray-600">
              Select a club from the{' '}
              <Link href="/club/dashboard" className="text-blue-600 hover:underline">
                club dashboard
              </Link>{' '}
              first, then open Club settings again.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export default function ClubSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <ClubSettingsContent />
    </Suspense>
  );
}
