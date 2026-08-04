'use client';

import { Users, UserCheck, UserPlus } from 'lucide-react';

type MemberStatsProps = {
  maxMembers?: number;
  currentMembers?: number;
};

export default function MemberStats({
  maxMembers = 50,
  currentMembers = 0,
}: MemberStatsProps) {
  const availableMembers = Math.max(0, maxMembers - currentMembers);

  const stats = [
    {
      title: 'Maximum Members',
      value: `${maxMembers}`,
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Current Members',
      value: `${currentMembers}`,
      icon: UserCheck,
      gradient: 'from-green-500 to-green-600',
    },
    {
      title: 'Available Slots',
      value: `${availableMembers}`,
      icon: UserPlus,
      gradient: 'from-purple-500 to-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat, i) => {
        const Icon = stat.icon;

        return (
          <div
            key={i}
            className={`p-6 rounded-xl shadow-md text-white bg-gradient-to-r ${stat.gradient} flex justify-between items-start`}
          >
            <div>
              <p className="text-sm opacity-90">{stat.title}</p>
              <h2 className="text-3xl font-bold mt-2">{stat.value}</h2>
            </div>

            <Icon size={22} className="opacity-80" />
          </div>
        );
      })}
    </div>
  );
}
