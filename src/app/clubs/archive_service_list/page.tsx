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
    image: "https://randomuser.me/api/portraits/men/1.jpg",
    name: "John Carter",
    insertDate: "2024-01-12",
    course: "Beauty",
    service: "bathroom",
    value: 200,
    typology: "Service",
    options: icons(Trash2)
  },
  {
    image: "https://randomuser.me/api/portraits/men/2.jpg",
    name: "Jony Parter",
    insertDate: "2024-07-10",
    service: "bathroom",
    course: "Beauty",
    value: 213,
    typology: "Service",
  },
  {
    image: "https://randomuser.me/api/portraits/men/3.jpg",
    name: "Alex Pin",
    insertDate: "2021-01-10",
    course: "Beauty",
    service: "bathroom",
    value: 170,
    typology: "Service",
    options: icons(Trash2)
  },
  {
    image: "https://randomuser.me/api/portraits/men/4.jpg",
    name: "Kyle Best",
    insertDate: "2024-09-10",
    service: "Kholo 1",
    course: "Beauty",
    value: 123,
    typology: "Service",
    options: icons(Trash2)
  },
  {
    image: "https://randomuser.me/api/portraits/men/5.jpg",
    name: "Tom Smith",
    insertDate: "2023-05-10",
    service: "bathroom",
    course: "Beauty",
    value: 431,
    typology: "Service",
    options: icons(Trash2)
  },
  {
    image: "https://randomuser.me/api/portraits/men/6.jpg",
    name: "Tim Cres",
    insertDate: "2024-01-20",
    service: "bathroom",
    course: "Beauty",
    value: 24,
    typology: "Service",
    options: icons(Trash2)
  },
  {
    image: "https://randomuser.me/api/portraits/women/7.jpg",
    name: "Helen Ana",
    insertDate: "2024-01-10",
    service: "bathroom",
    course: "Beauty",
    value: 16,
    typology: "Service",
    options: icons(Trash2)
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
    header: "Typology"
  },
  {
    key: "service",
    header: "Service",
  },
  {
    key: "casual",
    header: "Casual/Section"
  },

   {
    key: "value",
    header: "Cost",
    render: (value) => `$${value ?? 0}`,
  },
  {
    key: "casual",
    header: "Casual"
  },
  {
    key: "options",
    header: "Delete"
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