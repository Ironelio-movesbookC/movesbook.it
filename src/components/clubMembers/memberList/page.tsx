'use client';

import { useState } from 'react';
import MemberStats from './components/status';
import MembersTable from '@/components/club/ui/table';
import { Member, Column } from '@/types/clubTable';
import { View, Edit, CalendarClock, Trash2 } from 'lucide-react';

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
    surname: "Doe",
    name: "John",
    gender: "Male",
    dateOfBirth: "1990-01-01",
    memberType: "Premium", // ✅ FIXED
    Localcity: "New York",
    phone: "123-456-7890",
    insertDate: "2023-01-01",
    options: icons(View, Edit, CalendarClock, Trash2),
    operator: "Manager",

    // ✅ required safe defaults
    residual: 0,
    payMod: "",
    casual: "",
  },
  {
    surname: "Smith",
    name: "Jane",
    gender: "Female",
    dateOfBirth: "1992-02-01",
    memberType: "Gold",
    Localcity: "Los Angeles",
    phone: "987-654-3210",
    insertDate: "2023-02-01",
    options: icons(View, Edit, CalendarClock, Trash2),
    operator: "Admin",
    residual: 0,
    payMod: "",
    casual: "",
  },
  {
    surname: "Johnson",
    name: "Alice",
    gender: "Female",
    dateOfBirth: "1985-03-01",
    memberType: "Standard",
    Localcity: "Chicago",
    phone: "555-123-4567",
    insertDate: "2023-03-01",
    options: icons(View, Edit, CalendarClock, Trash2),
    operator: "Coach",
    residual: 0,
    payMod: "",
    casual: "",
  },
  {
    surname: "Brown",
    name: "Bob",
    gender: "Male",
    dateOfBirth: "1988-04-01",
    memberType: "Premium",
    Localcity: "Houston",
    phone: "111-222-3333",
    insertDate: "2023-04-01",
    options: icons(View, Edit, CalendarClock, Trash2),
    operator: "Admin",
    residual: 0,
    payMod: "",
    casual: "",
  },
  {
    surname: "Smith",
    name: "Jane",
    gender: "Female",
    dateOfBirth: "1992-02-01",
    memberType: "Gold",
    Localcity: "Los Angeles",
    phone: "987-654-3210",
    insertDate: "2023-02-01",
    options: icons(View, Edit, CalendarClock, Trash2),
    operator: "Manager",
    residual: 0,
    payMod: "",
    casual: "",
  },
  {
    surname: "Johnson",
    name: "Alice",
    gender: "Female",
    dateOfBirth: "1985-03-01",
    memberType: "Standard",
    Localcity: "Chicago",
    phone: "555-123-4567",
    insertDate: "2023-03-01",
    options: icons(View, Edit, CalendarClock, Trash2),
    operator: "Coach",
    residual: 0,
    payMod: "",
    casual: "",
  },
  {
    surname: "Brown",
    name: "Bob",
    gender: "Male",
    dateOfBirth: "1988-04-01",
    memberType: "Premium",
    Localcity: "Houston",
    phone: "111-222-3333",
    insertDate: "2023-04-01",
    options: icons(View, Edit, CalendarClock, Trash2),
    operator: "Admin",
    residual: 0,
    payMod: "",
    casual: "",
  },
];

/* ------------------ COLUMNS ------------------ */
const columns: Column[] = [
  { key: "surname", header: "Surname" },
  { key: "name", header: "Name" },
  { key: "gender", header: "Gender" },

  {
    key: "dateOfBirth",
    header: "Date of Birth",
    render: (value) => formatDate(value),
  },
  {
    key: "operator",
    header: "Operator"
  },

  {
    key: "memberType", // ✅ FIXED
    header: "Member Type",
    render: (value) => {
      const styles: Record<string, string> = {
        Premium: "bg-purple-100 text-purple-700",
        Gold: "bg-yellow-100 text-yellow-700",
        Standard: "bg-gray-100 text-gray-700",
      };

      return (
        <span
          className={`px-2 py-1 rounded text-xs ${
            styles[value] || "bg-gray-100 text-gray-700"
          }`}
        >
          {value || "-"}
        </span>
      );
    },
  },

  { key: "Localcity", header: "Local City" },
  { key: "phone", header: "Phone" },

  {
    key: "insertDate",
    header: "Insert Date",
    render: (value) => formatDate(value),
  },

  { key: "options", header: "Options" },
];

/* ------------------ COMPONENT ------------------ */
export default function ClubDashboard() {
  const [data] = useState<Member[]>(initialData);

  return (
    <div className="w-full h-full text-white flex flex-col p-4 gap-4">
      <MemberStats />
      <MembersTable columns={columns} tableData={data} />
    </div>
  );
}