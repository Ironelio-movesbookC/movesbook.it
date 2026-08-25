'use client';
import Image from 'next/image';

import { useState } from 'react';
import MembersTable from '@/components/club/ui/table';
import { Member, Column } from '@/types/clubTable';
import { View, Edit, CalendarClock, Trash2 } from 'lucide-react';

/* ------------------ ICON HELPER ------------------ */
const icons = (...Icons: any[]) => {
  return (
    <div className="flex gap-2 justify-center">
      {Icons.map((Icon, i) => (
        <Icon key={i} className="w-4 h-4 cursor-pointer hover:text-blue-500" />
      ))}
    </div>
  );
};

/* ------------------ INITIAL DATA ------------------ */
const initialData: Member[] = [
  {
    image: "https://randomuser.me/api/portraits/men/8.jpg",
    name: "Smith Carter",
    typology: "Premium",
    course: "Fitness Pro",
    dateStart: "2024-01-10",
    dateEnd: "2024-06-10",
    membershipEndDate: "2024-06-15",
    installments: 3,
    value: 150,
    status: "Active",

    // ✅ required defaults
    residual: 0,
    payMod: "",
    casual: "",

    options: icons(Edit),
  },
  {
    image: "https://randomuser.me/api/portraits/women/2.jpg",
    name: "Emma Helen",
    typology: "Standard",
    course: "Yoga Basics",
    dateStart: "2024-02-01",
    dateEnd: "2024-07-01",
    membershipEndDate: "2024-07-05",
    installments: 2,
    value: 100,
    status: "Pending",

    residual: 0,
    payMod: "",
    casual: "",

    options: icons(Edit),
  },
    {
    image: "https://randomuser.me/api/portraits/women/3.jpg",
    name: "Long Botom",
    typology: "Standard",
    course: "Yoga Basics",
    dateStart: "2024-04-03",
    dateEnd: "2024-06-01",
    membershipEndDate: "2024-07-05",
    installments: 4,
    value: 110,
    status: "Pending",

    residual: 0,
    payMod: "",
    casual: "",

    options: icons(Edit),
  },
];

const formatDate = (value: any) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
};

const columns: Column[] = [
  {
    key: "image",
    header: "Image",
    render: (value) => (
      <Image
        src={value}
        alt="profile"
        className="w-10 h-10 rounded-full mx-auto object-cover"
        width={40}
        height={40}
        unoptimized
      />
    ),
  },
  {
    key: "name",
    header: "Full Name",
  },
  {
    key: "typology",
    header: "Typology",
  },
  {
    key: "course",
    header: "Section / Course",
  },
  {
    key: "dateStart",
    header: "Date Start",
    render: (value) => formatDate(value),
  },
  {
    key: "dateEnd",
    header: "Date End",
    render: (value) => formatDate(value),
  },
  {
    key: "membershipEndDate",
    header: "Membership End Date",
    render: (value) => formatDate(value),
  },
  {
    key: "installments",
    header: "Installments",
  },
  {
    key: "value",
    header: "Value",
    render: (value) => `$${value ?? 0}`,
  },
  {
    key: "status",
    header: "Status",
    render: (value) => {
      const styles: Record<string, string> = {
        Active: "bg-green-100 text-green-700",
        Pending: "bg-yellow-100 text-yellow-700",
        Expired: "bg-red-100 text-red-700",
      };

      return (
        <span
          className={`px-2 py-1 rounded text-xs ${
            styles[value] || "bg-gray-100 text-gray-700"
          }`}
        >
          {value}
        </span>
      );
    },
  },
  {
    key: "options",
    header: "Edit",
  },
];
/* ------------------ COMPONENT ------------------ */
export default function ClubDashboard() {
  const [data, setData] = useState<Member[]>(initialData);
  return (
    <div className="w-full h-full text-white flex flex-col p-4 gap-4">
      <MembersTable columns={columns} tableData={data} />
    </div>
  );
}