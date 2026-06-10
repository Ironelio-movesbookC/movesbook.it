'use client';

import { useState, useRef, useEffect } from "react";
import { PaginationBar } from "../pagination/Index";
import { LucideLayoutList, Grid2X2, ArrowUp, ArrowDown } from "lucide-react";
import { IconButton } from "../button/Index";
import { Member, Column } from "@/types/clubTable";
import Toolbar from '@/components/club/Toolbar';
import { match } from "assert";



type MembersMovesBookTableProps = {     
  
  columns: Column[];
  tableData: Member[];
};

type SortConfig = {
  key: string;
  direction: "asc" | "desc";
} | null;

/* ------------------ GENERATE HTML ------------------ */
const generateHTMLTable = (rows: Member[], columns: Column[]) => {
  if (rows.length === 0) return "";

  const filteredCols = columns.filter(
    col => col.key !== "options" && col.key !== "image" && col.key !== "checked"
  );

  const header = `
    <thead>
      <tr>
        ${filteredCols.map(col => `<th>${col.header}</th>`).join("")}
      </tr>
    </thead>
  `;

  const body = `
    <tbody>
      ${rows.map(row => `
        <tr>
          ${filteredCols.map(col => `<td>${row[col.key] ?? ""}</td>`).join("")}
        </tr>
      `).join("")}
    </tbody>
  `;

  return `
    <table border="1" cellspacing="0" cellpadding="8">
      ${header}
      ${body}
    </table>
  `;
};


export default function MembersMovesBookTable({
  tableData,
  columns,
}: MembersMovesBookTableProps) {
  const [ageRange, setAgeRange] = useState<string>("");
  const [operator, setOperator] = useState<string>("");
  const [typology, setTypology] = useState<string>("");
  const [casual, setCasual] = useState<string>("");

  const [data, setData] = useState<Member[]>(
    tableData.map(row => ({ ...row, checked: false }))
  );

  const [sendData, setSendData] = useState('');
  const [page, setPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const tableRef = useRef<HTMLTableElement | null>(null);

  const perPage = 8;

  /* ------------------ SEARCH ------------------ */
  const getAge = (dateOfBirth: string | Date | undefined) => {
      if (!dateOfBirth) return 0;
      const today = new Date();
      const birth = new Date(dateOfBirth);

      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();

      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

      return age;
  };
const [dateRange, setDateRange] = useState({
  startDate: "",
  endDate: "",
});

  const filteredData = data.filter((row) => {

    
    const search = searchTerm.toLowerCase();
    

    const matchSearch = (
      String(row.surname ?? "").toLowerCase().includes(search) ||
      String(row.name ?? "").toLowerCase().includes(search) ||
      String(row.gender ?? "").toLowerCase().includes(search) ||
      String(row.memberType ?? "").toLowerCase().includes(search) ||
      String(row.Localcity ?? "").toLowerCase().includes(search) ||
      String(row.phone ?? "").toLowerCase().includes(search) ||
      String(row.course ?? "").toLowerCase().includes(search) ||
      String(row.status ?? "").toLowerCase().includes(search) ||
      String(row.contract ?? "").toLowerCase().includes(search) ||
      String(row.vendor ?? "").toLowerCase().includes(search) ||
      String(row.description ?? "").toLowerCase().includes(search) ||
      String(row.operator ?? "").toLowerCase().includes(search) ||
      String(row.payMod ?? "").toLowerCase().includes(search) ||
      String(row.casual ?? "").toLowerCase().includes(search) ||

      String(row.installments ?? "").includes(search) ||
      String(row.installment ?? "").includes(search) ||
      String(row.value ?? "").includes(search) ||
      String(row.debt ?? "").includes(search) ||
      String(row.rest ?? "").includes(search) ||
      String(row.payed ?? "").includes(search) ||
      String(row.cost ?? "").includes(search) ||
      String(row.residual ?? "").includes(search) ||
      String(row.installments ?? "").includes(search) ||
      String(row.area ?? "").includes(search) ||


      String(row.dateOfBirth ?? "").toLowerCase().includes(search) ||
      String(row.insertDate ?? "").toLowerCase().includes(search) ||
      String(row.membershipEndDate ?? "").toLowerCase().includes(search) ||
      String(row.dateStart ?? "").toLowerCase().includes(search) ||
      String(row.dateEnd ?? "").toLowerCase().includes(search) ||
      String(row.membershipEnd ?? "").toLowerCase().includes(search)
    );
    const matchAge = (() => {
      if (!ageRange) return true;

      const age = getAge( row.dateOfBirth ?? "");
      if (ageRange === "all") return age > 0 && age <= 150;
      if (ageRange === "15-20") return age >= 15 && age <= 20;
      if (ageRange === "20-50") return age > 20 && age <= 50;
      if (ageRange === "50+") return age > 50;

      return true;
    })();
    
     const matchOperator = (() => {
  if (!operator || operator === "all") return true;
  if (operator === "Admin") return row.operator === "Admin";
  if (operator === "Coach") return row.operator === "Coach";
  if (operator === "Manager") return row.operator === "Manager";
  return true;
})();

const matchTypology = (() => {
  if (!typology || typology === "all") return true;
  if (typology === "Premium") return row.typology === "Premium";
  if (typology === "Standard") return row.typology === "Standard";
  if (typology === "Basic") return row.typology === "Basic";
  return true;
})();

const matchCasual = (() => {
  if (!casual || casual === "all") return true;
  if (casual === "Yes") return row.casual === "Yes";
  if (casual === "No") return row.casual === "No";
  return true;
})();

const matchDate = (() => {
  if (!dateRange.startDate || !dateRange.endDate) return true;

  const insertDate = new Date(row.insertDate?? "");
  const start = new Date(dateRange.startDate);
  const end = new Date(dateRange.endDate);

  // Normalize time (important)
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return insertDate >= start && insertDate <= end;
})();
   

      return matchSearch && matchAge && matchOperator && matchTypology && matchCasual && matchDate;
  });

  /* ------------------ SORT ------------------ */
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;

    const aValue = a[sortConfig.key as keyof Member];
    const bValue = b[sortConfig.key as keyof Member];

    if (aValue instanceof Date && bValue instanceof Date) {
      return sortConfig.direction === "asc"
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    }

    const aStr = String(aValue ?? "").toLowerCase();
    const bStr = String(bValue ?? "").toLowerCase();

    if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
    if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (key: string) => {
    if (key === "checked" || key === "options" || key === "image") return;

    setPage(1);

    setSortConfig((prev) => {
      if (prev?.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  };

  /* ------------------ PAGINATION ------------------ */
  const totalPages = Math.ceil(sortedData.length / perPage);

  const rows = sortedData.slice(
    (page - 1) * perPage,
    page * perPage
  );

  /* ------------------ CHECKBOX FIX ------------------ */

  
  const toggleOne = (rowItem: Member) => {
    const updated = data.map((row) =>
      row === rowItem ? { ...row, checked: !row.checked } : row
    );
    setData(updated);
  };

  const allSelected = rows.length > 0 && rows.every((row) => row.checked);

  const toggleAll = () => {
    const updated = data.map((row) => {
      const isVisible = rows.includes(row);

      return isVisible
        ? { ...row, checked: !allSelected }
        : row;
    });

    setData(updated);
  };

  /* ------------------ PRINT ------------------ */
  const handlePrint = () => {
    window.print();
  };

  /* ------------------ SEND TO EDITOR ------------------ */
  useEffect(() => {
    const selectedRows = data.filter(row => row.checked);
    const htmlTable = generateHTMLTable(selectedRows, columns);
    setSendData(htmlTable);
  }, [data]);

  return (
    <div className="py-6">

      <div className="no-print">
        <Toolbar
          onPrint={handlePrint}
          data={sendData}
          onSearch={(value) => {
            setSearchTerm(value);
            setPage(1);
          }}
          onAgeChange={(value) => {
            setAgeRange(value);
            setPage(1);
          }}
          onOperatorChange={(value) => {
            setOperator(value);
            setPage(1);
            }}
          onTypologyChange={(value) => {
            setTypology(value);
            setPage(1);
            }}
          onCasualChange={(value) => {
            setCasual(value);
            setPage(1);
            }}
          onDateRangeChange={(range) => {
            setDateRange(range);
            setPage(1);
          }}
        />

        <div className="pt-6 flex justify-between">
          <PaginationBar
            pageCount={totalPages}
            onPageChange={(p: number) => setPage(p)}
          />

          <div className="flex">
            <IconButton icon={<LucideLayoutList />} />
            <IconButton icon={<Grid2X2 />} />
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto print-area">

        <table ref={tableRef} className="min-w-full text-sm">

          <thead className="bg-gray-800 text-white">
            <tr>

              <th className="p-4 text-center no-print">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                />
              </th>

              {columns.map((col) => {
                const isNotSortable =
                  col.key === "options" ||
                  col.key === "image" ||
                  col.key === "checked";

                const isActive = sortConfig?.key === col.key;

                return (
                    <th
                      key={col.key}
                      onClick={() => !isNotSortable && handleSort(col.key)}
                      className={`p-4 text-center ${
                        isNotSortable ? "" : "cursor-pointer"
                      } ${col.key === "image" ? "print:hidden" : ""} ${
                          col.key === "options" ? "print:hidden" : ""
                      }`}
                    >
                    <div className="flex items-center justify-center gap-2">
                      <span>{col.header}</span>

                      {!isNotSortable && isActive && (
                        sortConfig.direction === "asc"
                          ? <ArrowUp size={16} />
                          : <ArrowDown size={16} />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t text-gray-700">

                <td className="p-4 text-center no-print">
                  <input
                    type="checkbox"
                    checked={row.checked || false}
                    onChange={() => toggleOne(row)}
                  />
                </td>

                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`p-4 text-center ${
                      col.key === "options" ? "no-print" : ""
                    } ${col.key === "image" ? "print:hidden" : ""}`}
                  >
                    {col.render
                      ? col.render(row[col.key], row)
                      : (row[col.key] as React.ReactNode)}
                  </td>
                ))}

              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </div>
  );
}