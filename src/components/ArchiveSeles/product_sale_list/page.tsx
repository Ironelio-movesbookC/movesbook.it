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
const initialData: Member[] = 
[
  {
    image: "https://randomuser.me/api/portraits/men/51.jpg",
    name: "John Carter",
    typology: "Premium",
    value: 250,
    status: "Active",
  },
  {
    image: "https://randomuser.me/api/portraits/women/52.jpg",
    name: "Emma Watson",
    typology: "Standard",
    value: 180,
    status: "Pending",
  },
  {
    image: "https://randomuser.me/api/portraits/men/53.jpg",
    name: "Michael Lee",
    typology: "Basic",
    value: 120,
    status: "Blocked",
  },
  {
    image: "https://randomuser.me/api/portraits/women/54.jpg",
    name: "Sophia Brown",
    typology: "Premium",
    value: 300,
    status: "Active",
  },
  {
    image: "https://randomuser.me/api/portraits/men/55.jpg",
    name: "David Wilson",
    typology: "Standard",
    value: 200,
    status: "Pending",
  },
  {
    image: "https://randomuser.me/api/portraits/women/56.jpg",
    name: "Olivia Davis",
    typology: "Basic",
    value: 90,
    status: "Active",
  },
  {
    image: "https://randomuser.me/api/portraits/men/57.jpg",
    name: "James Anderson",
    typology: "Premium",
    value: 400,
    status: "Blocked",
  },
  {
    image: "https://randomuser.me/api/portraits/women/58.jpg",
    name: "Isabella Moore",
    typology: "Standard",
    value: 220,
    status: "Active",
  },
  {
    image: "https://randomuser.me/api/portraits/women/54.jpg",
    name: "Sophia Brown",
    typology: "Premium",
    value: 300,
    status: "Active",
  },
  {
    image: "https://randomuser.me/api/portraits/men/55.jpg",
    name: "David Wilson",
    typology: "Standard",
    value: 200,
    status: "Pending",
  },
  {
    image: "https://randomuser.me/api/portraits/women/56.jpg",
    name: "Olivia Davis",
    typology: "Basic",
    value: 90,
    status: "Active",
  },
  {
    image: "https://randomuser.me/api/portraits/men/57.jpg",
    name: "James Anderson",
    typology: "Premium",
    value: 400,
    status: "Blocked",
  },
  {
    image: "https://randomuser.me/api/portraits/women/58.jpg",
    name: "Isabella Moore",
    typology: "Standard",
    value: 220,
    status: "Active",
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
      key: "typology",
    header: "Typology",
  },
  {
    key: "value",
    header: "Value"
  },
  {
    key: "status",
    header: "Status"
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