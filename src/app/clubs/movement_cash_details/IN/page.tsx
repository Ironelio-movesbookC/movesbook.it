'use client';

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
    image: "https://randomuser.me/api/portraits/men/61.jpg",
    name: "John Carter",
    insertDate: "2024-01-10",
    cost: 200,
    casual: "No",
    operator: "Admin",
    category: "beauty",
    typology: "Premium",
  },
  {
    image: "https://randomuser.me/api/portraits/women/41.jpg",
    name: "Emily Johnson",
    insertDate: "2024-01-12",
    cost: 180,
    casual: "Yes",
    operator: "Coach",
    category: "beauty",
    typology: "Standard",
  },
  {
    image: "https://randomuser.me/api/portraits/men/42.jpg",
    name: "Michael Brown",
    insertDate: "2024-01-14",
    cost: 150,
    casual: "No",
    operator: "Manager",
    category: "beauty",
    typology: "Basic",
  },
  {
    image: "https://randomuser.me/api/portraits/women/43.jpg",
    name: "Sophia Lee",
    insertDate: "2024-01-16",
    cost: 320,
    casual: "No",
    operator: "Admin",
    category: "beauty",
    typology: "Premium",
  },
  {
    image: "https://randomuser.me/api/portraits/men/44.jpg",
    name: "David Wilson",
    insertDate: "2024-01-18",
    cost: 210,
    casual: "Yes",
    operator: "Coach",
    category: "beauty",
    typology: "Standard",
  },
  {
    image: "https://randomuser.me/api/portraits/women/45.jpg",
    name: "Olivia Martin",
    insertDate: "2024-01-20",
    cost: 260,
    casual: "No",
    operator: "Manager",
    category: "beauty",
    typology: "Basic",
  },
  {
    image: "https://randomuser.me/api/portraits/men/46.jpg",
    name: "James Anderson",
    insertDate: "2024-01-22",
    cost: 400,
    casual: "No",
    operator: "Admin",
    category: "beauty",
    typology: "Premium",
  },
  {
    image: "https://randomuser.me/api/portraits/women/47.jpg",
    name: "Isabella Clark",
    insertDate: "2024-01-24",
    cost: 230,
    casual: "Yes",
    operator: "Coach",
    category: "beauty",
    typology: "Standard",
  },
  {
    image: "https://randomuser.me/api/portraits/men/48.jpg",
    name: "Daniel Harris",
    insertDate: "2024-01-26",
    cost: 310,
    casual: "No",
    operator: "Manager",
    category: "beauty",
    typology: "Premium",
  },
  {
    image: "https://randomuser.me/api/portraits/women/49.jpg",
    name: "Mia Thompson",
    insertDate: "2024-01-28",
    cost: 275,
    casual: "No",
    operator: "Admin",
    category: "beauty",
    typology: "Premium",
  },
  {
    image: "https://randomuser.me/api/portraits/men/50.jpg",
    name: "Alexander Moore",
    insertDate: "2024-01-30",
    cost: 190,
    casual: "Yes",
    operator: "Coach",
    category: "beauty",
    typology: "Standard",
  },
  {
    image: "https://randomuser.me/api/portraits/women/51.jpg",
    name: "Ava Taylor",
    insertDate: "2024-02-01",
    cost: 350,
    casual: "No",
    operator: "Manager",
    category: "beauty",
    typology: "Premium",
  },
];

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
    key: "cost",
    header: "Value In",
    render: (value) => `$${value ?? 0}`,
  },
  {
    key: "insertDate",
    header: "Date",
    render: (value) =>
      value ? new Date(value).toLocaleDateString() : "-",
  },
  
  {
    key: "category",
    header: "Category"
  },
  { key: "vendor", header: "Vendor" },
  {
    key: "operator",
    header: "Operator"
  },
  {
    key: "paid",
    header: "Description",
    render: (value) => `Pay $${value ?? 0}`,
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