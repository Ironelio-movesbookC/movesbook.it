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
    image: "https://randomuser.me/api/portraits/men/71.jpg",
    name: "John Carter",
    typology: "Premium",
    dateStart: "2024-01-10",
    cost: 200,
    paid: 150,
    casual: "No",
    operator: "Admin",
  },
  {
    image: "https://randomuser.me/api/portraits/women/72.jpg",
    name: "Emma Watson",
    typology: "Standard",
    dateStart: "2024-02-05",
    cost: 180,
    paid: 100,
    casual: "Yes",
    operator: "Manager",
  },
  {
    image: "https://randomuser.me/api/portraits/men/73.jpg",
    name: "Michael Lee",
    typology: "Basic",
    dateStart: "2023-11-15",
    cost: 120,
    paid: 120,
    casual: "No",
    operator: "Admin",
  },
  {
    image: "https://randomuser.me/api/portraits/women/74.jpg",
    name: "Sophia Brown",
    typology: "Premium",
    dateStart: "2024-03-01",
    cost: 250,
    paid: 200,
    casual: "Yes",
    operator: "Coach",
  },
  {
    image: "https://randomuser.me/api/portraits/men/75.jpg",
    name: "David Wilson",
    typology: "Standard",
    dateStart: "2024-01-20",
    cost: 160,
    paid: 60,
    casual: "No",
    operator: "Manager",
  },
  {
    image: "https://randomuser.me/api/portraits/women/76.jpg",
    name: "Olivia Davis",
    typology: "Basic",
    dateStart: "2023-10-10",
    cost: 140,
    paid: 140,
    casual: "Yes",
    operator: "Admin",
  },
  {
    image: "https://randomuser.me/api/portraits/men/77.jpg",
    name: "James Anderson",
    typology: "Premium",
    dateStart: "2024-02-18",
    cost: 300,
    paid: 180,
    casual: "No",
    operator: "Coach",
  },
  {
    image: "https://randomuser.me/api/portraits/women/78.jpg",
    name: "Isabella Moore",
    typology: "Standard",
    dateStart: "2024-01-30",
    cost: 220,
    paid: 200,
    casual: "Yes",
    operator: "Manager",
  },
   {
    image: "https://randomuser.me/api/portraits/women/76.jpg",
    name: "Olivia Davis",
    typology: "Basic",
    dateStart: "2023-10-10",
    cost: 140,
    paid: 140,
    casual: "Yes",
    operator: "Admin",
  },
  {
    image: "https://randomuser.me/api/portraits/men/77.jpg",
    name: "James Anderson",
    typology: "Premium",
    dateStart: "2024-02-18",
    cost: 300,
    paid: 180,
    casual: "No",
    operator: "Coach",
  },
  {
    image: "https://randomuser.me/api/portraits/women/78.jpg",
    name: "Isabella Moore",
    typology: "Standard",
    dateStart: "2024-01-30",
    cost: 220,
    paid: 200,
    casual: "Yes",
    operator: "Manager",
  },
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

  {
    key: "name",
    header: "Full Name",
  },
  {
      key: "typology",
    header: "Typology",
  },
  {
    key: "dateStart",
    header: "Date Start",
    render: (value) =>
      value ? new Date(value).toLocaleDateString() : "-",
  },
  {
    key: "cost",
    header: "Cost",
  },
  {
    key: "paid",
    header: "Paid"
  },
  {
    key: "casual",
    header: "Casual"
  },
  {
    key: "operator",
    header: "Operator"
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