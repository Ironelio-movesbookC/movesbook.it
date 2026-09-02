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
    image: "https://randomuser.me/api/portraits/men/63.jpg",
    name: "Michael Lee",
    insertDate: "2023-11-15",
    paid: 120,
    casual: "No",
    operator: "Admin",
    category: "beauty",
    typology: "Basic",
  },
  {
    image: "https://randomuser.me/api/portraits/women/64.jpg",
    name: "Sophia Brown",
    insertDate: "2024-03-01",
    paid: 250,
    casual: "Yes",
    operator: "Coach",
    category: "beauty",
    typology: "Premium",
  },
  {
    image: "https://randomuser.me/api/portraits/men/65.jpg",
    name: "David Wilson",
    insertDate: "2024-01-20",
    paid: 160,
    casual: "No",
    operator: "Manager",
    category: "beauty",
    typology: "Standard",
  },
  {
    image: "https://randomuser.me/api/portraits/women/66.jpg",
    name: "Olivia Davis",
    insertDate: "2023-10-10",
    paid: 140,
    casual: "Yes",
    operator: "Admin",
    category: "beauty",
    typology: "Basic",
  },
  {
    image: "https://randomuser.me/api/portraits/men/67.jpg",
    name: "James Anderson",
    insertDate: "2024-02-18",
    paid: 300,
    casual: "No",
    category: "beauty",
    operator: "Coach",
    typology: "Premium",
  },
  {
    image: "https://randomuser.me/api/portraits/women/68.jpg",
    name: "Isabella Moore",
    insertDate: "2024-01-30",
    paid: 220,
    casual: "Yes",
    operator: "Manager",
    category: "beauty",
    typology: "Standard",
  },
  {
    image: "https://randomuser.me/api/portraits/men/61.jpg",
    name: "John Carter",
    insertDate: "2024-01-10",
    paid: 200,
    casual: "No",
    operator: "Admin",
    typology: "Premium",
    category: "beauty",

  },
  {
    image: "https://randomuser.me/api/portraits/women/62.jpg",
    name: "Emma Watson",
    insertDate: "2024-02-05",
    paid: 180,
    category: "beauty",
    operator: "Manager",
    typology: "Standard",
  },
  {
    image: "https://randomuser.me/api/portraits/men/63.jpg",
    name: "Michael Lee",
    insertDate: "2023-11-15",
    paid: 120,
    casual: "No",
    operator: "Admin",
    category: "beauty",
    typology: "Basic",
  },
];

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