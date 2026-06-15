'use client';

import { useState } from 'react';
import MembersTable from '@/components/club/ui/table';
import { Member, Column } from '@/types/clubTable';
import { Edit } from 'lucide-react';

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
    payed: 150,
    casual: "No",
    operator: "Admin",
    typology: "Premium",
    residual: 50,
    payMod: "",
    options: icons(Edit),
  },
  {
    image: "https://randomuser.me/api/portraits/women/12.jpg",
    name: "Emily Stone",
    dateStart: "2024-02-15",
    cost: 300,
    payed: 300,
    casual: "Yes",
    operator: "Coach",
    typology: "Standard",
    residual: 0,
    payMod: "",
    options: icons(Edit),
  },
  {
    image: "https://randomuser.me/api/portraits/men/22.jpg",
    name: "Michael Brown",
    dateStart: "2023-11-05",
    cost: 150,
    payed: 100,
    casual: "No",
    operator: "Manager",
    typology: "Basic",
    residual: 50,
    payMod: "",
    options: icons(Edit),
  },
  {
    image: "https://randomuser.me/api/portraits/women/33.jpg",
    name: "Sarah Johnson",
    dateStart: "2024-03-01",
    cost: 250,
    payed: 250,
    casual: "Yes",
    operator: "Admin",
    typology: "Premium",
    residual: 0,
    payMod: "",
    options: icons(Edit),
  },
  {
    image: "https://randomuser.me/api/portraits/men/44.jpg",
    name: "David Wilson",
    dateStart: "2024-01-20",
    cost: 400,
    payed: 200,
    casual: "No",
    operator: "Coach",
    typology: "Standard",
    residual: 200,
    payMod: "",
    options: icons(Edit),
  },
  {
    image: "https://randomuser.me/api/portraits/women/45.jpg",
    name: "Olivia Martin",
    dateStart: "2023-12-12",
    cost: 180,
    payed: 180,
    casual: "Yes",
    operator: "Manager",
    typology: "Basic",
    residual: 0,
    payMod: "",
    options: icons(Edit),
  },
  {
    image: "https://randomuser.me/api/portraits/men/52.jpg",
    name: "James Anderson",
    dateStart: "2024-02-02",
    cost: 220,
    payed: 120,
    casual: "No",
    operator: "Admin",
    typology: "Premium",
    residual: 100,
    payMod: "",
    options: icons(Edit),
  },
  {
    image: "https://randomuser.me/api/portraits/women/53.jpg",
    name: "Sophia Lee",
    dateStart: "2024-01-28",
    cost: 350,
    payed: 300,
    casual: "No",
    operator: "Coach",
    typology: "Standard",
    residual: 50,
    payMod: "",
    options: icons(Edit),
  },
  {
    image: "https://randomuser.me/api/portraits/men/64.jpg",
    name: "Daniel Harris",
    dateStart: "2023-10-10",
    cost: 500,
    payed: 250,
    casual: "No",
    operator: "Manager",
    typology: "Premium",
    residual: 250,
    payMod: "",
    options: icons(Edit),
  },
  {
    image: "https://randomuser.me/api/portraits/women/65.jpg",
    name: "Isabella Clark",
    dateStart: "2024-03-18",
    cost: 275,
    payed: 275,
    casual: "Yes",
    operator: "Admin",
    typology: "Basic",
    residual: 0,
    payMod: "",
    options: icons(Edit),
  },
];

/* ------------------ HELPERS ------------------ */
const formatDate = (value: any) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
};

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
  { key: "typology", header: "Typology" },
  { key: "course", header: "Course/Section" },
  {
    key: "dateStart",
    header: "Date Start",
    render: (value) => formatDate(value),
  },
  { key: "debt", header: "Debt" },

  {
    key: "payed", // ✅ FIXED KEY
    header: "Payed",
    render: (value) => `$${value ?? 0}`,
  },
  { key: "rest", header: "Rest" },
  { key: "description", header: "Description" },
  {
    key: "operator",
    header: "Operator",
  },  
  {
    key: "options",
    header: "Edit",
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