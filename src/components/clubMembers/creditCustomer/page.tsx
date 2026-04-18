'use client';

import { useState } from 'react';
import MembersTable from '@/components/club/ui/table';
import { Member, Column } from '@/types/clubTable';

/* ------------------ HELPERS ------------------ */
const formatDate = (value: any) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
};

/* ------------------ INITIAL DATA ------------------ */
const initialData: Member[] = [
  {
    image: "https://randomuser.me/api/portraits/men/21.jpg",
    name: "John Carter",
    cost: 200,
    residual: 50,
    dateStart: "2024-01-10",
    description: "Partial payment",

    // ✅ required safe defaults
    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/women/22.jpg",
    name: "Emma Watson",
    cost: 180,
    residual: 80,
    dateStart: "2024-02-05",
    description: "Pending",

    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/men/23.jpg",
    name: "Michael Lee",
    cost: 120,
    residual: 0,
    dateStart: "2023-11-15",
    description: "Paid",

    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/women/24.jpg",
    name: "Sophia Brown",
    cost: 250,
    residual: 70,
    dateStart: "2024-03-01",
    description: "Partial",

    payMod: "",
    casual: "",
  },
   {
    image: "https://randomuser.me/api/portraits/men/21.jpg",
    name: "John Carter",
    cost: 200,
    residual: 50,
    dateStart: "2024-01-10",
    description: "Partial payment",

    // ✅ required safe defaults
    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/women/22.jpg",
    name: "Emma Watson",
    cost: 180,
    residual: 80,
    dateStart: "2024-02-05",
    description: "Pending",

    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/men/23.jpg",
    name: "Michael Lee",
    cost: 120,
    residual: 0,
    dateStart: "2023-11-15",
    description: "Paid",

    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/women/24.jpg",
    name: "Sophia Brown",
    cost: 250,
    residual: 70,
    dateStart: "2024-03-01",
    description: "Partial",

    payMod: "",
    casual: "",
  },
   {
    image: "https://randomuser.me/api/portraits/men/21.jpg",
    name: "John Carter",
    cost: 200,
    residual: 50,
    dateStart: "2024-01-10",
    description: "Partial payment",

    // ✅ required safe defaults
    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/women/22.jpg",
    name: "Emma Watson",
    cost: 180,
    residual: 80,
    dateStart: "2024-02-05",
    description: "Pending",

    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/men/23.jpg",
    name: "Michael Lee",
    cost: 120,
    residual: 0,
    dateStart: "2023-11-15",
    description: "Paid",

    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/women/24.jpg",
    name: "Sophia Brown",
    cost: 250,
    residual: 70,
    dateStart: "2024-03-01",
    description: "Partial",

    payMod: "",
    casual: "",
  },
];

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

  {
    key: "cost",
    header: "Value In",
    render: (value) => `$${value ?? 0}`, // ✅ better UI
  },

  {
    key: "residual",
    header: "Residual",
    render: (value) => (
      <span
        className={`px-2 py-1 rounded text-xs ${
          value === 0
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        ${value ?? 0}
      </span>
    ),
  },

  {
    key: "dateStart",
    header: "Date Start",
    render: (value) => formatDate(value),
  },

  {
    key: "description",
    header: "Description",
    render: (value) => value || "-", // ✅ FIXED
  },
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