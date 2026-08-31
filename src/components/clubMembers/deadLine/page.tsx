'use client';
import Image from 'next/image';

import { useState } from 'react';
import MembersTable from '@/components/club/ui/table';
import { Member, Column } from '@/types/clubTable';

/* ------------------ INITIAL DATA ------------------ */
const initialData: Member[] = [
  {
    image: "https://randomuser.me/api/portraits/men/61.jpg",
    name: "John Carter",
    dateStart: "2024-01-10",
    cost: 200,
    payed: 150, // ✅ FIXED
    casual: "No",
    operator: "Admin",
    typology: "Premium",
    residual: 0,
    payMod: "",
  },
  {
    image: "https://randomuser.me/api/portraits/women/62.jpg",
    name: "Emma Watson",
    dateStart: "2024-02-05",
    cost: 180,
    payed: 100,
    casual: "Yes",
    operator: "Manager",
    typology: "Standard",
    residual: 0,
    payMod: "",
  },
  {
    image: "https://randomuser.me/api/portraits/men/63.jpg",
    name: "Michael Lee",
    dateStart: "2023-11-15",
    cost: 120,
    payed: 120,
    casual: "No",
    operator: "Admin",
    typology: "Basic",
    residual: 0,
    payMod: "",
  },
  {
    image: "https://randomuser.me/api/portraits/women/64.jpg",
    name: "Sophia Brown",
    dateStart: "2024-03-01",
    cost: 250,
    payed: 200,
    casual: "Yes",
    operator: "Coach",
    typology: "Premium",
    residual: 0,
    payMod: "",
  },
  {
    image: "https://randomuser.me/api/portraits/men/61.jpg",
    name: "John Carter",
    dateStart: "2024-01-10",
    cost: 200,
    payed: 150, // ✅ FIXED
    casual: "No",
    operator: "Admin",
    typology: "Premium",
    residual: 0,
    payMod: "",
  },
  {
    image: "https://randomuser.me/api/portraits/women/62.jpg",
    name: "Emma Watson",
    dateStart: "2024-02-05",
    cost: 180,
    payed: 100,
    casual: "Yes",
    operator: "Manager",
    typology: "Standard",
    residual: 0,
    payMod: "",
  },
  {
    image: "https://randomuser.me/api/portraits/men/63.jpg",
    name: "Michael Lee",
    dateStart: "2023-11-15",
    cost: 120,
    payed: 120,
    casual: "No",
    operator: "Admin",
    typology: "Basic",
    residual: 0,
    payMod: "",
  },
  {
    image: "https://randomuser.me/api/portraits/women/64.jpg",
    name: "Sophia Brown",
    dateStart: "2024-03-01",
    cost: 250,
    payed: 200,
    casual: "Yes",
    operator: "Coach",
    typology: "Premium",
    residual: 0,
    payMod: "",
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
    key: "dateStart",
    header: "Date Start",
    render: (value) => formatDate(value),
  },

  {
    key: "cost",
    header: "Value In",
    render: (value) => `$${value ?? 0}`, // ✅ better UI
  },

  {
    key: "payed", // ✅ FIXED KEY
    header: "Payed",
    render: (value) => `$${value ?? 0}`,
  },

  {
    key: "casual",
    header: "Casual",
  },

  {
    key: "operator",
    header: "Operator",
  },

  {
    key: "typology",
    header: "Typology",
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