'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar';
import AdminLeftSidebar from '@/components/admin/AdminLeftSidebar';
import AdminRightSidebar from '@/components/admin/AdminRightSidebar';
import { Users, Shield, Activity, TrendingUp } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  userType: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if admin is logged in
    const adminData = localStorage.getItem('adminUser');
    if (!adminData) {
      router.push('/');
      return;
    }
    
    setAdminUser(JSON.parse(adminData));
    setLoading(false);
  }, [router]);

  if (loading || !adminUser) {
    return null;
  }

  const stats = [
    { label: 'Total Users', value: '1,234', icon: Users, color: 'bg-blue-500' },
    { label: 'Active Coaches', value: '156', icon: Shield, color: 'bg-green-500' },
    { label: 'Teams & Groups', value: '89', icon: Users, color: 'bg-purple-500' },
    { label: 'Active Sessions', value: '45', icon: Activity, color: 'bg-orange-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminNavbar />
      
      <div className="flex flex-1 max-w-[1920px] mx-auto w-full overflow-hidden h-[calc(100vh-64px)]">
        {/* Left Sidebar */}
        <AdminLeftSidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Home</h1>
            <p className="text-gray-600">Welcome back, {adminUser.name}!</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => {
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
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  JD
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">New user registered</p>
                  <p className="text-sm text-gray-600">John Doe joined as an Athlete</p>
                </div>
                <span className="text-sm text-gray-500">2 min ago</span>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                  MT
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Team created</p>
                  <p className="text-sm text-gray-600">Milan Tigers was created by Coach Smith</p>
                </div>
                <span className="text-sm text-gray-500">15 min ago</span>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                  S
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Subscription renewed</p>
                  <p className="text-sm text-gray-600">Sarah Jones renewed Premium Plan</p>
                </div>
                <span className="text-sm text-gray-500">1 hour ago</span>
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar */}
        <AdminRightSidebar />
      </div>
    </div>
  );
}
