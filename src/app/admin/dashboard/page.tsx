'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, Shield, Activity, TrendingUp } from 'lucide-react';
import AdminSuperAdminOGPNewsContent from '@/components/admin/AdminSuperAdminOGPNewsContent';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  userType: string;
}

function initialsFromSubtitle(subtitle: string): string {
  const words = subtitle.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

function formatRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.floor(hr / 24);
  return `${day} day${day === 1 ? '' : 's'} ago`;
}

function AdminDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const panel = searchParams?.get('panel') ?? null;
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeCoaches: 0,
    teamsAndGroups: 0,
    activeSessions: 0,
  });
  const [recent, setRecent] = useState<
    { id: string; title: string; displayName?: string; subtitle: string; createdAt: string }[]
  >([]);

  useEffect(() => {
    const adminData = localStorage.getItem('adminUser');
    if (!adminData) {
      router.push('/');
      return;
    }

    setAdminUser(JSON.parse(adminData));
    setLoading(false);
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setStatsLoading(false);
        return;
      }
      setStatsLoading(true);
      try {
        const res = await fetch('/api/admin/dashboard-stats', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;
        if (data?.stats) {
          setStats({
            totalUsers: data.stats.totalUsers ?? 0,
            activeCoaches: data.stats.activeCoaches ?? 0,
            teamsAndGroups: data.stats.teamsAndGroups ?? 0,
            activeSessions: data.stats.activeSessions ?? 0,
          });
        }
        if (Array.isArray(data?.recentRegistrations)) {
          setRecent(data.recentRegistrations);
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }
    void loadStats();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !adminUser) {
    return null;
  }

  if (panel === 'music-tracked') {
    return <AdminSuperAdminOGPNewsContent closeHref="/admin/dashboard" />;
  }

  const nf = new Intl.NumberFormat();
  const statCards = [
    { label: 'Total Users', value: nf.format(stats.totalUsers), icon: Users, color: 'bg-blue-500' },
    { label: 'Active Coaches', value: nf.format(stats.activeCoaches), icon: Shield, color: 'bg-green-500' },
    { label: 'Teams & Groups', value: nf.format(stats.teamsAndGroups), icon: Users, color: 'bg-purple-500' },
    { label: 'Active Sessions', value: nf.format(stats.activeSessions), icon: Activity, color: 'bg-orange-500' },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Home</h1>
        <p className="text-gray-600">Welcome back, {adminUser.name}!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? '…' : stat.value}
                </p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {statsLoading && recent.length === 0 ? (
            <p className="text-sm text-gray-500">Loading recent registrations…</p>
          ) : recent.length === 0 ? (
            <p className="text-sm text-gray-500">No recent registrations yet.</p>
          ) : (
            recent.map((item, index) => {
              const palette = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-teal-500'];
              const bg = palette[index % palette.length];
              return (
                <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div
                    className={`w-10 h-10 ${bg} rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}
                  >
                    {initialsFromSubtitle(item.displayName ?? item.subtitle)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-600 truncate">{item.subtitle}</p>
                  </div>
                  <span className="text-sm text-gray-500 whitespace-nowrap shrink-0">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
      <AdminDashboardInner />
    </Suspense>
  );
}
