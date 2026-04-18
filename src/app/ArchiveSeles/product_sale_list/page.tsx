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
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
    name: "Wireless Headphones",
    insertDate: "2024-01-12",
    typology: "Sellings",
    value: 200,
    status: "Not paid",
  },
  {
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9",
    name: "Smart Watch",
    insertDate: "2024-02-05",
    typology: "Sellings",
    value: 320,
    status: "Paid",
  },
  {
    image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f",
    name: "Mechanical Keyboard",
    insertDate: "2024-02-14",
    typology: "Sellings",
    value: 120,
    status: "Not paid",
  },
  {
    image: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e",
    name: "Backpack",
    insertDate: "2024-03-02",
    typology: "Sellings",
    value: 90,
    status: "Paid",
  },
  {
    image: "https://images.unsplash.com/photo-1598300056393-4aac492f4344",
    name: "Bluetooth Speaker",
    insertDate: "2024-01-30",
    typology: "Sellings",
    value: 110,
    status: "Not paid",
  },
  {
    image: "https://images.unsplash.com/photo-1526178613552-2b45c6c302f0",
    name: "Smartphone",
    insertDate: "2024-04-01",
    typology: "Sellings",
    value: 700,
    status: "Paid",
  },
  {
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
    name: "Gaming Headset",
    insertDate: "2024-03-10",
    typology: "Sellings",
    value: 140,
    status: "Paid",
  },
  {
  image: "https://images.unsplash.com/photo-1524678606370-a47ad25cb82a",
  name: "Tablet Device",
  insertDate: "2024-04-05",
  typology: "Sellings",
  value: 450,
  status: "Not paid",
},
{
  image: "https://images.unsplash.com/photo-1503602642458-232111445657",
  name: "Leather Wallet",
  insertDate: "2024-03-22",
  typology: "Sellings",
  value: 75,
  status: "Paid",
},
{
  image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f",
  name: "Office Monitor",
  insertDate: "2024-02-28",
  typology: "Sellings",
  value: 260,
  status: "Not paid",
}
];;

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
  { key: "number", header: "N" },
  {
    key: "insertDate",
    header: "Date Start",
    render: (value) =>
      value ? new Date(value).toLocaleDateString() : "-",
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
    key: "casual",
    header: "Casual/Section"
  },

   {
    key: "value",
    header: "Value"
  },
  {
    key: "status",
    header: "status"
  }
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