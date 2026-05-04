'use client';

import { useState } from 'react';
import MembersTable from '@/components/club/ui/table';
import { Member, Column } from '@/types/clubTable';
import { View, Edit, CalendarClock, Trash2 } from 'lucide-react';

/* ------------------ HELPERS ------------------ */
const formatDate = (value: any) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
};
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
    image: "https://randomuser.me/api/portraits/men/1.jpg",
    name: "John Carter",
    insertDate: "2024-01-10",
    cost: 200,
    casual: "No",
    operator: "Admin",
    typology: "Premium",
    payMod: "Cash",
    paid: 200,
    options: icons(Trash2),
  },
  {
    image: "https://randomuser.me/api/portraits/women/2.jpg",
    name: "Emily Johnson",
    insertDate: "2024-01-15",
    cost: 320,
    casual: "Yes",
    operator: "Coach",
    typology: "Standard",
    payMod: "Card",
    paid: 300,
    options: icons(Trash2),
  },
  {
    image: "https://randomuser.me/api/portraits/men/3.jpg",
    name: "Michael Brown",
    insertDate: "2024-02-01",
    cost: 150,
    casual: "No",
    operator: "Manager",
    typology: "Basic",
    payMod: "Cash",
    paid: 100,
    options: icons(Trash2),
  },
  {
    image: "https://randomuser.me/api/portraits/women/4.jpg",
    name: "Sophia Lee",
    insertDate: "2024-02-10",
    cost: 400,
    casual: "No",
    operator: "Admin",
    typology: "Premium",
    payMod: "Card",
    paid: 400,
    options: icons(Trash2),
  },
  {
    image: "https://randomuser.me/api/portraits/men/5.jpg",
    name: "David Wilson",
    insertDate: "2024-02-20",
    cost: 180,
    casual: "Yes",
    operator: "Coach",
    typology: "Standard",
    payMod: "Cash",
    paid: 150,
    options: icons(Trash2),
  },
  {
    image: "https://randomuser.me/api/portraits/women/6.jpg",
    name: "Olivia Martin",
    insertDate: "2024-03-01",
    cost: 250,
    casual: "No",
    operator: "Manager",
    typology: "Basic",
    payMod: "Card",
    paid: 200,
    options: icons(Trash2),
  },
  {
    image: "https://randomuser.me/api/portraits/men/7.jpg",
    name: "James Anderson",
    insertDate: "2024-03-05",
    cost: 500,
    casual: "No",
    operator: "Admin",
    typology: "Premium",
    payMod: "Cash",
    paid: 500,
    options: icons(Trash2),
  },
  {
    image: "https://randomuser.me/api/portraits/women/8.jpg",
    name: "Isabella Clark",
    insertDate: "2024-03-10",
    cost: 220,
    casual: "Yes",
    operator: "Coach",
    typology: "Standard",
    payMod: "Card",
    paid: 180,
    options: icons(Trash2),
  },
  {
    image: "https://randomuser.me/api/portraits/men/9.jpg",
    name: "Daniel Harris",
    insertDate: "2024-03-15",
    cost: 300,
    casual: "No",
    operator: "Manager",
    typology: "Basic",
    payMod: "Cash",
    paid: 200,
    options: icons(Trash2),
  },
  {
    image: "https://randomuser.me/api/portraits/women/10.jpg",
    name: "Mia Thompson",
    insertDate: "2024-03-20",
    cost: 450,
    casual: "No",
    operator: "Admin",
    typology: "Premium",
    payMod: "Card",
    paid: 400,
    options: icons(Trash2),
  },
  {
    image: "https://randomuser.me/api/portraits/men/11.jpg",
    name: "Alexander Moore",
    insertDate: "2024-03-25",
    cost: 280,
    casual: "Yes",
    operator: "Coach",
    typology: "Standard",
    payMod: "Cash",
    paid: 250,
    options: icons(Trash2),
  },
  {
    image: "https://randomuser.me/api/portraits/women/12.jpg",
    name: "Ava Taylor",
    insertDate: "2024-03-30",
    cost: 350,
    casual: "No",
    operator: "Manager",
    typology: "Premium",
    payMod: "Card",
    paid: 300,
    options: icons(Trash2),
  },
];

/* ------------------ COLUMNS ------------------ */
const columns: Column[] = [
  {
    key: "image",
    header: "Image",
    render: (value) => (
      <img
        src={value}
        alt="profile"
        className="w-10 h-10 rounded-full mx-auto object-cover"
      />
    ),
  },

  {
    key: "name",
    header: "Full Name",
  },

  {
    key: "insertDate",
    header: "Date Payment",
    render: (value) => formatDate(value),
  },

  {
    key: "cost",
    header: "Value In",
    render: (value) => `$${value ?? 0}`,
  },

  {
    key: "payed", // ✅ FIXED
    header: "Value Out",
  },
  {
    key: "payMod",
    header: "Pay Mode"
  },
  {
    key: "typology",
    header: "Typlogy"
  },

  {
    key: "course",
    header: "Course/Section",
  },

  {
    key: "operator",
    header: "Operator",
  },
  {
    key: "paid",
    header: "Casual Payment",
    render: (value) => `$${value ?? 0}`,
  },
  {
    key: "options",
    header:"Delete"
  }
];

/* ------------------ COMPONENT ------------------ */
export default function ClubDashboard() {
  const [data] = useState<Member[]>(initialData);

  return (
    <div className="w-full h-full text-white flex flex-col p-4 gap-4">
      <MembersTable columns={columns} tableData={data} />
    </div>
  );
}