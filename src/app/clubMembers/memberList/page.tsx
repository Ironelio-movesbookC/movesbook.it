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
  image: "https://randomuser.me/api/portraits/men/7.jpg",
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
    image: "https://randomuser.me/api/portraits/women/12.jpg",
    surname: "Johnson",
    name: "Emily",
    gender: "Female",
    dateOfBirth: "1992-09-15",
    memberType: "Standard",
    Localcity: "Seattle",
    phone: "444-555-6666",
    insertDate: "2024-01-10",
    options: icons(View, Edit, CalendarClock, Trash2),
    operator: "Manager",
    residual: 120,
    payMod: "Monthly",
    casual: "Active",
  },
  {
    image: "https://randomuser.me/api/portraits/men/21.jpg",
    surname: "Smith",
    name: "John",
    gender: "Male",
    dateOfBirth: "1990-06-22",
    memberType: "Basic",
    Localcity: "Chicago",
    phone: "222-333-4444",
    insertDate: "2022-11-05",
    options: icons(View, Edit, CalendarClock, Trash2),
    operator: "Admin",
    residual: 50,
    payMod: "Cash",
    casual: "Inactive",
  },
  {
    image: "https://randomuser.me/api/portraits/women/22.jpg",
    surname: "Davis",
    name: "Sophia",
    gender: "Female",
    dateOfBirth: "1995-03-18",
    memberType: "Premium",
    Localcity: "Los Angeles",
    phone: "333-444-5555",
    insertDate: "2023-08-14",
    options: icons(View, Edit, CalendarClock, Trash2),
    operator: "Staff",
    residual: 200,
    payMod: "Monthly",
    casual: "Active",
  },
  {
    image: "https://randomuser.me/api/portraits/men/32.jpg",
    surname: "Miller",
    name: "David",
    gender: "Male",
    dateOfBirth: "1987-12-02",
    memberType: "Standard",
    Localcity: "Miami",
    phone: "555-666-7777",
    insertDate: "2024-02-20",
    options: icons(View, Edit, CalendarClock, Trash2),
    operator: "Admin",
    residual: 75,
    payMod: "Card",
    casual: "Active",
  },
  {
    image: "https://randomuser.me/api/portraits/women/45.jpg",
    surname: "Wilson",
    name: "Olivia",
    gender: "Female",
    dateOfBirth: "1998-07-11",
    memberType: "Basic",
    Localcity: "Austin",
    phone: "666-777-8888",
    insertDate: "2023-05-30",
    options: icons(View, Edit, CalendarClock, Trash2),
    operator: "Manager",
    residual: 10,
    payMod: "Cash",
    casual: "Active",
  },
  {
    image: "https://randomuser.me/api/portraits/men/54.jpg",
    surname: "Taylor",
    name: "Michael",
    gender: "Male",
    dateOfBirth: "1993-01-09",
    memberType: "Premium",
    Localcity: "Denver",
    phone: "777-888-9999",
    insertDate: "2022-09-17",
    options: icons(View, Edit, CalendarClock, Trash2),
    operator: "Staff",
    residual: 300,
    payMod: "Monthly",
    casual: "Inactive",
  },
  {
    image: "https://randomuser.me/api/portraits/women/33.jpg",
    surname: "Anderson",
    name: "Ava",
    gender: "Female",
    dateOfBirth: "1991-11-25",
    memberType: "Standard",
    Localcity: "Boston",
    phone: "888-999-0000",
    insertDate: "2023-03-12",
    options: icons(View, Edit, CalendarClock, Trash2),
    operator: "Admin",
    residual: 90,
    payMod: "Card",
    casual: "Active",
  },
  {
    image: "https://randomuser.me/api/portraits/men/61.jpg",
    surname: "Thomas",
    name: "James",
    gender: "Male",
    dateOfBirth: "1986-05-19",
    memberType: "Basic",
    Localcity: "Phoenix",
    phone: "999-000-1111",
    insertDate: "2024-06-01",
    options: icons(View, Edit, CalendarClock, Trash2),
    operator: "Manager",
    residual: 0,
    payMod: "Cash",
    casual: "Active",
  },
  {
    image: "https://randomuser.me/api/portraits/women/68.jpg",
    surname: "Martinez",
    name: "Isabella",
    gender: "Female",
    dateOfBirth: "1996-10-03",
    memberType: "Premium",
    Localcity: "San Diego",
    phone: "121-212-1212",
    insertDate: "2023-12-25",
    options: icons(View, Edit, CalendarClock, Trash2),
    operator: "Staff",
    residual: 150,
    payMod: "Monthly",
    casual: "Active",
  },
  {
  image: "https://randomuser.me/api/portraits/men/11.jpg",
  surname: "Garcia",
  name: "Carlos",
  gender: "Male",
  dateOfBirth: "1994-02-14",
  memberType: "Standard",
  Localcity: "Dallas",
  phone: "202-333-1010",
  insertDate: "2023-07-21",
  options: icons(View, Edit, CalendarClock, Trash2),
  operator: "Admin",
  residual: 45,
  payMod: "Card",
  casual: "Active",
},
{
  image: "https://randomuser.me/api/portraits/women/17.jpg",
  surname: "Lee",
  name: "Hannah",
  gender: "Female",
  dateOfBirth: "1997-08-09",
  memberType: "Premium",
  Localcity: "San Francisco",
  phone: "303-444-2020",
  insertDate: "2024-03-18",
  options: icons(View, Edit, CalendarClock, Trash2),
  operator: "Manager",
  residual: 220,
  payMod: "Monthly",
  casual: "Active",
},
{
  image: "https://randomuser.me/api/portraits/men/18.jpg",
  surname: "Walker",
  name: "Ethan",
  gender: "Male",
  dateOfBirth: "1989-11-30",
  memberType: "Basic",
  Localcity: "Portland",
  phone: "404-555-3030",
  insertDate: "2022-10-10",
  options: icons(View, Edit, CalendarClock, Trash2),
  operator: "Staff",
  residual: 0,
  payMod: "Cash",
  casual: "Inactive",
},
{
  image: "https://randomuser.me/api/portraits/women/19.jpg",
  surname: "Harris",
  name: "Mia",
  gender: "Female",
  dateOfBirth: "1993-05-27",
  memberType: "Standard",
  Localcity: "New York",
  phone: "505-666-4040",
  insertDate: "2023-09-14",
  options: icons(View, Edit, CalendarClock, Trash2),
  operator: "Admin",
  residual: 80,
  payMod: "Card",
  casual: "Active",
},
{
  image: "https://randomuser.me/api/portraits/men/25.jpg",
  surname: "Clark",
  name: "Noah",
  gender: "Male",
  dateOfBirth: "1991-01-07",
  memberType: "Premium",
  Localcity: "Las Vegas",
  phone: "606-777-5050",
  insertDate: "2024-02-02",
  options: icons(View, Edit, CalendarClock, Trash2),
  operator: "Manager",
  residual: 310,
  payMod: "Monthly",
  casual: "Active",
},
{
  image: "https://randomuser.me/api/portraits/women/26.jpg",
  surname: "Lewis",
  name: "Charlotte",
  gender: "Female",
  dateOfBirth: "1996-12-12",
  memberType: "Basic",
  Localcity: "Atlanta",
  phone: "707-888-6060",
  insertDate: "2023-06-06",
  options: icons(View, Edit, CalendarClock, Trash2),
  operator: "Staff",
  residual: 25,
  payMod: "Cash",
  casual: "Active",
},
{
  image: "https://randomuser.me/api/portraits/men/27.jpg",
  surname: "Young",
  name: "Benjamin",
  gender: "Male",
  dateOfBirth: "1988-09-21",
  memberType: "Standard",
  Localcity: "Houston",
  phone: "808-999-7070",
  insertDate: "2022-12-30",
  options: icons(View, Edit, CalendarClock, Trash2),
  operator: "Admin",
  residual: 60,
  payMod: "Card",
  casual: "Inactive",
},
{
  image: "https://randomuser.me/api/portraits/women/28.jpg",
  surname: "King",
  name: "Amelia",
  gender: "Female",
  dateOfBirth: "1999-04-05",
  memberType: "Premium",
  Localcity: "Chicago",
  phone: "909-111-8080",
  insertDate: "2024-04-01",
  options: icons(View, Edit, CalendarClock, Trash2),
  operator: "Manager",
  residual: 180,
  payMod: "Monthly",
  casual: "Active",
},
{
  image: "https://randomuser.me/api/portraits/men/29.jpg",
  surname: "Scott",
  name: "Lucas",
  gender: "Male",
  dateOfBirth: "1990-06-16",
  memberType: "Basic",
  Localcity: "Seattle",
  phone: "111-222-9090",
  insertDate: "2023-01-19",
  options: icons(View, Edit, CalendarClock, Trash2),
  operator: "Staff",
  residual: 0,
  payMod: "Cash",
  casual: "Inactive",
},
{
  image: "https://randomuser.me/api/portraits/women/30.jpg",
  surname: "Adams",
  name: "Ella",
  gender: "Female",
  dateOfBirth: "1995-10-10",
  memberType: "Standard",
  Localcity: "Denver",
  phone: "222-333-0101",
  insertDate: "2023-11-11",
  options: icons(View, Edit, CalendarClock, Trash2),
  operator: "Admin",
  residual: 95,
  payMod: "Card",
  casual: "Active",
}
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