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
    dateStart: "2024-01-10",
    cost: 200,
    casual: "No",
    operator: "Admin",
    typology: "Premium",
  },
  {
    image: "https://randomuser.me/api/portraits/women/62.jpg",
    name: "Emma Watson",
    dateStart: "2024-02-05",
    cost: 180,
    casual: "Yes",
    operator: "Manager",
    typology: "Standard",
  },
  {
    image: "https://randomuser.me/api/portraits/men/63.jpg",
    name: "Michael Lee",
    dateStart: "2023-11-15",
    cost: 120,
    casual: "No",
    operator: "Admin",
    typology: "Basic",
  },
  {
    image: "https://randomuser.me/api/portraits/women/64.jpg",
    name: "Sophia Brown",
    dateStart: "2024-03-01",
    cost: 250,
    casual: "Yes",
    operator: "Coach",
    typology: "Premium",
  },
  {
    image: "https://randomuser.me/api/portraits/men/65.jpg",
    name: "David Wilson",
    dateStart: "2024-01-20",
    cost: 160,
    casual: "No",
    operator: "Manager",
    typology: "Standard",
  },
  {
    image: "https://randomuser.me/api/portraits/women/66.jpg",
    name: "Olivia Davis",
    dateStart: "2023-10-10",
    cost: 140,
    casual: "Yes",
    operator: "Admin",
    typology: "Basic",
  },
  {
    image: "https://randomuser.me/api/portraits/men/67.jpg",
    name: "James Anderson",
    dateStart: "2024-02-18",
    cost: 300,
    casual: "No",
    operator: "Coach",
    typology: "Premium",
  },
  {
    image: "https://randomuser.me/api/portraits/women/68.jpg",
    name: "Isabella Moore",
    dateStart: "2024-01-30",
    cost: 220,
    casual: "Yes",
    operator: "Manager",
    typology: "Standard",
  },
  {
    image: "https://randomuser.me/api/portraits/men/61.jpg",
    name: "John Carter",
    dateStart: "2024-01-10",
    cost: 200,
    casual: "No",
    operator: "Admin",
    typology: "Premium",
  },
  {
    image: "https://randomuser.me/api/portraits/women/62.jpg",
    name: "Emma Watson",
    dateStart: "2024-02-05",
    cost: 180,
    casual: "Yes",
    operator: "Manager",
    typology: "Standard",
  },
  {
    image: "https://randomuser.me/api/portraits/men/63.jpg",
    name: "Michael Lee",
    dateStart: "2023-11-15",
    cost: 120,
    casual: "No",
    operator: "Admin",
    typology: "Basic",
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
    key: "dateStart",
    header: "Date Start",
    render: (value) =>
      value ? new Date(value).toLocaleDateString() : "-",
  },
  {
    key: "cost",
    header: "Value In",
  },

  {
    key: "casual",
    header: "Casual"
  },
  {
    key: "operator",
    header: "Operator"
  },
  {
      key: "typology",
    header: "Typology",
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