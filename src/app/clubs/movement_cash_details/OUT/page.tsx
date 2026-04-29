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
    paid: 200,
    casual: "No",
    operator: "Admin",
    category: "beauty",
    typology: "Premium",
  },
  {
    image: "https://randomuser.me/api/portraits/women/21.jpg",
    name: "Emily Stone",
    insertDate: "2024-01-12",
    paid: 180,
    casual: "Yes",
    operator: "Coach",
    category: "beauty",
    typology: "Standard",
  },
  {
    image: "https://randomuser.me/api/portraits/men/22.jpg",
    name: "Michael Brown",
    insertDate: "2024-01-15",
    paid: 150,
    casual: "No",
    operator: "Manager",
    category: "beauty",
    typology: "Basic",
  },
  {
    image: "https://randomuser.me/api/portraits/women/23.jpg",
    name: "Sophia Lee",
    insertDate: "2024-01-18",
    paid: 300,
    casual: "No",
    operator: "Admin",
    category: "beauty",
    typology: "Premium",
  },
  {
    image: "https://randomuser.me/api/portraits/men/24.jpg",
    name: "David Wilson",
    insertDate: "2024-01-20",
    paid: 220,
    casual: "Yes",
    operator: "Coach",
    category: "beauty",
    typology: "Standard",
  },
  {
    image: "https://randomuser.me/api/portraits/women/25.jpg",
    name: "Olivia Martin",
    insertDate: "2024-01-22",
    paid: 250,
    casual: "No",
    operator: "Manager",
    category: "beauty",
    typology: "Basic",
  },
  {
    image: "https://randomuser.me/api/portraits/men/26.jpg",
    name: "James Anderson",
    insertDate: "2024-01-25",
    paid: 400,
    casual: "No",
    operator: "Admin",
    category: "beauty",
    typology: "Premium",
  },
  {
    image: "https://randomuser.me/api/portraits/women/27.jpg",
    name: "Isabella Clark",
    insertDate: "2024-01-27",
    paid: 210,
    casual: "Yes",
    operator: "Coach",
    category: "beauty",
    typology: "Standard",
  },
  {
    image: "https://randomuser.me/api/portraits/men/28.jpg",
    name: "Daniel Harris",
    insertDate: "2024-01-28",
    paid: 350,
    casual: "No",
    operator: "Manager",
    category: "beauty",
    typology: "Premium",
  },
  {
    image: "https://randomuser.me/api/portraits/women/29.jpg",
    name: "Mia Thompson",
    insertDate: "2024-01-29",
    paid: 275,
    casual: "No",
    operator: "Admin",
    category: "beauty",
    typology: "Premium",
  },
  {
    image: "https://randomuser.me/api/portraits/men/30.jpg",
    name: "Alexander Moore",
    insertDate: "2024-01-30",
    paid: 190,
    casual: "Yes",
    operator: "Coach",
    category: "beauty",
    typology: "Standard",
  },
  {
    image: "https://randomuser.me/api/portraits/women/31.jpg",
    name: "Ava Taylor",
    insertDate: "2024-01-31",
    paid: 320,
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
    key: "paid",
    header: "Value Out",
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