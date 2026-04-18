'use client';

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
    description: "Partial payment",
    operator: "Admin",
    options: icons(Edit),
    residual: 50,
    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/women/11.jpg",
    name: "Emily Johnson",
    typology: "Standard",
    course: "Yoga Basics",
    dateStart: "2024-02-01",
    dateEnd: "2024-07-01",
    debt: 200,
    payed: 200,
    rest: 0,
    description: "Fully paid",
    operator: "Coach",
    options: icons(Edit),
    residual: 0,
    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/men/12.jpg",
    name: "Michael Brown",
    typology: "Basic",
    course: "Strength Training",
    dateStart: "2023-11-15",
    dateEnd: "2024-05-15",
    debt: 180,
    payed: 120,
    rest: 60,
    description: "Partial payment",
    operator: "Manager",
    options: icons(Edit),
    residual: 60,
    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/women/13.jpg",
    name: "Sophia Lee",
    typology: "Premium",
    course: "Pilates Advanced",
    dateStart: "2024-03-05",
    dateEnd: "2024-09-05",
    debt: 300,
    payed: 150,
    rest: 150,
    description: "Half paid",
    operator: "Admin",
    options: icons(Edit),
    residual: 150,
    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/men/14.jpg",
    name: "David Wilson",
    typology: "Standard",
    course: "Crossfit",
    dateStart: "2024-01-20",
    dateEnd: "2024-06-20",
    debt: 250,
    payed: 200,
    rest: 50,
    description: "Partial payment",
    operator: "Coach",
    options: icons(Edit),
    residual: 50,
    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/women/15.jpg",
    name: "Olivia Martin",
    typology: "Basic",
    course: "Cardio Blast",
    dateStart: "2023-12-10",
    dateEnd: "2024-05-10",
    debt: 120,
    payed: 120,
    rest: 0,
    description: "Fully paid",
    operator: "Manager",
    options: icons(Edit),
    residual: 0,
    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/men/16.jpg",
    name: "James Anderson",
    typology: "Premium",
    course: "Bodybuilding Pro",
    dateStart: "2024-02-10",
    dateEnd: "2024-08-10",
    debt: 400,
    payed: 250,
    rest: 150,
    description: "Partial payment",
    operator: "Admin",
    options: icons(Edit),
    residual: 150,
    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/women/17.jpg",
    name: "Isabella Clark",
    typology: "Standard",
    course: "Dance Fitness",
    dateStart: "2024-01-05",
    dateEnd: "2024-06-05",
    debt: 220,
    payed: 220,
    rest: 0,
    description: "Fully paid",
    operator: "Coach",
    options: icons(Edit),
    residual: 0,
    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/men/18.jpg",
    name: "Daniel Harris",
    typology: "Basic",
    course: "HIIT Training",
    dateStart: "2023-10-01",
    dateEnd: "2024-03-01",
    debt: 300,
    payed: 150,
    rest: 150,
    description: "Half paid",
    operator: "Manager",
    options: icons(Edit),
    residual: 150,
    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/women/19.jpg",
    name: "Mia Thompson",
    typology: "Premium",
    course: "Personal Training",
    dateStart: "2024-04-01",
    dateEnd: "2024-10-01",
    debt: 500,
    payed: 300,
    rest: 200,
    description: "Partial payment",
    operator: "Admin",
    options: icons(Edit),
    residual: 200,
    payMod: "",
    casual: "",
  },
  {
    image: "https://randomuser.me/api/portraits/men/20.jpg",
    name: "Alexander Moore",
    typology: "Standard",
    course: "Functional Training",
    dateStart: "2024-03-10",
    dateEnd: "2024-09-10",
    debt: 280,
    payed: 180,
    rest: 100,
    description: "Partial payment",
    operator: "Coach",
    options: icons(Edit),
    residual: 100,
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

  { key: "name", header: "Full Name" },
  { key: "typology", header: "Typology" },
  { key: "area", header: "Area" },
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
  { key: "value", header: "Value" },
  { key: "installment", header: "Installment" },
  { key: "contract", header: "Contract" },
  { key: "vendor", header: "Vendor" },
    {
    key: "status",
    header: "Status",
    render: (value) => {
      const styles: Record<string, string> = {
        Active: "bg-green-100 text-green-700",
        Pending: "bg-yellow-100 text-yellow-700",
        Expired: "bg-red-100 text-red-700",
      };

      return (
        <span
          className={`px-2 py-1 rounded text-xs ${
            styles[value] || "bg-gray-100 text-gray-700"
          }`}
        >
          {value}
        </span>
      );
    },
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