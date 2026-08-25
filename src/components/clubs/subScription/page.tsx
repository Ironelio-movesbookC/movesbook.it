'use client';
import Image from 'next/image';

import { useState } from 'react';
import MembersTable from '@/components/club/ui/table';
import { Member, Column } from '@/types/clubTable';
import { Edit } from 'lucide-react';

/* ------------------ ICON HELPER ------------------ */
const icons = (...Icons: React.ElementType[]) => {
  return (
    <div className="flex gap-2 justify-center">
      {Icons.map((Icon, i) => (
        <Icon
          key={i}
          className="w-4 h-4 cursor-pointer hover:text-blue-500"
        />
      ))}
    </div>
  );
};

/* ------------------ HELPERS ------------------ */
const formatDate = (value: any) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
};

/* ------------------ INITIAL DATA ------------------ */
const initialData: Member[] = [
  {
    image: "https://randomuser.me/api/portraits/men/10.jpg",
    name: "John Carter",
    typology: "Premium",
    course: "Fitness Pro",
    dateStart: "2024-01-10",
    dateEnd: "2024-06-10",
    debt: 150,
    payed: 100,
    rest: 50,
    description: "Partial payment", // ✅ FIXED
    operator: "Admin",
    options: icons(Edit),

    // ✅ required safe defaults
    residual: 50,
    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/women/11.jpg",
    name: "Emma Watson",
    typology: "Standard",
    course: "Yoga Basics",
    dateStart: "2024-02-01",
    dateEnd: "2024-07-01",
    debt: 120,
    payed: 60,
    rest: 60,
    description: "Pending",
    operator: "Manager",
    options: icons(Edit),

    residual: 60,
    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/men/12.jpg",
    name: "Michael Lee",
    typology: "Basic",
    course: "Cardio Blast",
    dateStart: "2023-09-15",
    dateEnd: "2024-02-15",
    debt: 80,
    payed: 80,
    rest: 0,
    description: "Paid",
    operator: "Admin",
    options: icons(Edit),

    residual: 0,
    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/men/10.jpg",
    name: "John Carter",
    typology: "Premium",
    course: "Fitness Pro",
    dateStart: "2024-01-10",
    dateEnd: "2024-06-10",
    debt: 150,
    payed: 100,
    rest: 50,
    description: "Partial payment", // ✅ FIXED
    operator: "Admin",
    options: icons(Edit),

    // ✅ required safe defaults
    residual: 50,
    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/women/11.jpg",
    name: "Emma Watson",
    typology: "Standard",
    course: "Yoga Basics",
    dateStart: "2024-02-01",
    dateEnd: "2024-07-01",
    debt: 120,
    payed: 60,
    rest: 60,
    description: "Pending",
    operator: "Manager",
    options: icons(Edit),

    residual: 60,
    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/men/12.jpg",
    name: "Michael Lee",
    typology: "Basic",
    course: "Cardio Blast",
    dateStart: "2023-09-15",
    dateEnd: "2024-02-15",
    debt: 80,
    payed: 80,
    rest: 0,
    description: "Paid",
    operator: "Admin",
    options: icons(Edit),

    residual: 0,
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

  { key: "name", header: "Full Name" },

  { key: "typology", header: "Typology" },

  { key: "course", header: "Section / Course" },

  {
    key: "dateStart",
    header: "Date Start",
    render: (value) => formatDate(value),
  },

  {
    key: "dateEnd",
    header: "Date End",
    render: (value) => formatDate(value),
  },

  {
    key: "debt",
    header: "Debt",
    render: (value) => `$${value ?? 0}`,
  },

  {
    key: "payed",
    header: "Paid", // ✅ FIXED label
    render: (value) => `$${value ?? 0}`,
  },

  {
    key: "rest",
    header: "Rest",
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
    key: "description",
    header: "Description",
    render: (value) => value || "-", // ✅ FIXED
  },

  {
    key: "operator",
    header: "Operator", // ✅ FIXED typo
  },

  {
    key: "options",
    header: "Edit",
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