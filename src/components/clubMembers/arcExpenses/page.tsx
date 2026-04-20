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
    image: "https://randomuser.me/api/portraits/men/31.jpg",
    name: "John Carter",
    typology: "Premium",
    course: "Fitness Pro",
    casual: "No",
    dateStart: "2024-01-10",
    cost: 200,
    paid: 150,
    rest: 50,
    operator: "Admin",
  },
  {
    image: "https://randomuser.me/api/portraits/women/32.jpg",
    name: "Emma Watson",
    typology: "Standard",
    course: "Yoga Basics",
    casual: "Yes",
    dateStart: "2024-02-05",
    cost: 180,
    paid: 100,
    rest: 80,
    operator: "Manager",
  },
  {
    image: "https://randomuser.me/api/portraits/men/33.jpg",
    name: "Michael Lee",
    typology: "Basic",
    course: "Cardio Blast",
    casual: "No",
    dateStart: "2023-11-15",
    cost: 120,
    paid: 120,
    rest: 0,
    operator: "Admin",
  },
  {
    image: "https://randomuser.me/api/portraits/women/34.jpg",
    name: "Sophia Brown",
    typology: "Premium",
    course: "CrossFit",
    casual: "Yes",
    dateStart: "2024-03-01",
    cost: 250,
    paid: 200,
    rest: 50,
    operator: "Coach",
  },
  {
    image: "https://randomuser.me/api/portraits/men/35.jpg",
    name: "David Wilson",
    typology: "Standard",
    course: "Strength Training",
    casual: "No",
    dateStart: "2024-01-20",
    cost: 160,
    paid: 60,
    rest: 100,
    operator: "Manager",
  },
  {
    image: "https://randomuser.me/api/portraits/women/36.jpg",
    name: "Olivia Davis",
    typology: "Basic",
    course: "Pilates",
    casual: "Yes",
    dateStart: "2023-10-10",
    cost: 140,
    paid: 140,
    rest: 0,
    operator: "Admin",
  },
  {
    image: "https://randomuser.me/api/portraits/men/37.jpg",
    name: "James Anderson",
    typology: "Premium",
    course: "Advanced Gym",
    casual: "No",
    dateStart: "2024-02-18",
    cost: 300,
    paid: 180,
    rest: 120,
    operator: "Coach",
  },
  {
    image: "https://randomuser.me/api/portraits/women/38.jpg",
    name: "Isabella Moore",
    typology: "Standard",
    course: "Zumba",
    casual: "Yes",
    dateStart: "2024-01-30",
    cost: 220,
    paid: 200,
    rest: 20,
    operator: "Manager",
  },
    {
    image: "https://randomuser.me/api/portraits/men/33.jpg",
    name: "Michael Lee",
    typology: "Basic",
    course: "Cardio Blast",
    casual: "No",
    dateStart: "2023-11-15",
    cost: 120,
    paid: 120,
    rest: 0,
    operator: "Admin",
  },
  {
    image: "https://randomuser.me/api/portraits/women/34.jpg",
    name: "Sophia Brown",
    typology: "Premium",
    course: "CrossFit",
    casual: "Yes",
    dateStart: "2024-03-01",
    cost: 250,
    paid: 200,
    rest: 50,
    operator: "Coach",
  },
  {
    image: "https://randomuser.me/api/portraits/men/35.jpg",
    name: "David Wilson",
    typology: "Standard",
    course: "Strength Training",
    casual: "No",
    dateStart: "2024-01-20",
    cost: 160,
    paid: 60,
    rest: 100,
    operator: "Manager",
  },
  {
    image: "https://randomuser.me/api/portraits/women/36.jpg",
    name: "Olivia Davis",
    typology: "Basic",
    course: "Pilates",
    casual: "Yes",
    dateStart: "2023-10-10",
    cost: 140,
    paid: 140,
    rest: 0,
    operator: "Admin",
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
    key: "casual",
    header: "Section/Course",
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
    key: "rest",
    header: "Rest",
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