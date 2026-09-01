'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Database,
  Grid2X2,
  LayoutList,
  MessageCircle,
  Printer,
  Share2,
  X,
} from 'lucide-react';
import ShareModal from '@/components/ShareModal';
import { getAuthHeaders } from '@/lib/club/servicePurchasesClient';
import type { Column, Member } from '@/types/clubTable';

type MembersMovesBookTableProps = {
  columns: Column[];
  tableData: Member[];
};

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

const AGE_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: '15 - 20', value: '15-20' },
  { label: '20 - 50', value: '20-50' },
  { label: '50+', value: '50+' },
];

const OPERATOR_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Admin', value: 'Admin' },
  { label: 'Coach', value: 'Coach' },
  { label: 'Manager', value: 'Manager' },
  { label: 'Member', value: 'Member' },
];

const TYPOLOGY_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Premium', value: 'Premium' },
  { label: 'Standard', value: 'Standard' },
  { label: 'Basic', value: 'Basic' },
];

const CASUAL_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Yes', value: 'Yes' },
  { label: 'No', value: 'No' },
];

function getAge(dateOfBirth: string | Date | undefined) {
  if (!dateOfBirth) return 0;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return 0;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function generateHTMLTable(rows: Member[], columns: Column[]) {
  if (rows.length === 0) return '';
  const filteredCols = columns.filter(
    (col) => col.key !== 'options' && col.key !== 'image' && col.key !== 'checked',
  );
  const header = `<thead><tr>${filteredCols
    .map((col) => `<th>${String(col.header ?? '')}</th>`)
    .join('')}</tr></thead>`;
  const body = `<tbody>${rows
    .map(
      (row) =>
        `<tr>${filteredCols
          .map((col) => `<td>${String(row[col.key] ?? '')}</td>`)
          .join('')}</tr>`,
    )
    .join('')}</tbody>`;
  return `<table border="1" cellspacing="0" cellpadding="8">${header}${body}</table>`;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm min-w-[9rem]">
      <span className="mb-1 block font-medium text-gray-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function MembersMovesBookTable({
  tableData,
  columns,
}: MembersMovesBookTableProps) {
  const [ageRange, setAgeRange] = useState('all');
  const [operator, setOperator] = useState('all');
  const [typology, setTypology] = useState('all');
  const [casual, setCasual] = useState('all');
  const [sportFilter, setSportFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [data, setData] = useState<Member[]>(() =>
    tableData.map((row) => ({ ...row, checked: false })),
  );
  const [showMsgDropdown, setShowMsgDropdown] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTarget, setEmailTarget] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const perPage = 8;

  useEffect(() => {
    setData(tableData.map((row) => ({ ...row, checked: false })));
    setPage(1);
  }, [tableData]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowMsgDropdown(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const sportOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        data
          .map((row) => String(row.sport ?? '').trim())
          .filter((v) => v && v !== '-'),
      ),
    ).sort((a, b) => a.localeCompare(b));
    return [{ label: 'All', value: 'all' }, ...values.map((v) => ({ label: v, value: v }))];
  }, [data]);

  const groupOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        data
          .map((row) => String(row.groupTrained ?? '').trim())
          .filter((v) => v && v !== '-'),
      ),
    ).sort((a, b) => a.localeCompare(b));
    return [{ label: 'All', value: 'all' }, ...values.map((v) => ({ label: v, value: v }))];
  }, [data]);

  const filteredData = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    return data.filter((row) => {
      const matchSearch =
        !search ||
        [
          row.surname,
          row.name,
          row.username,
          row.email,
          row.gender,
          row.memberType,
          row.Localcity,
          row.localCity,
          row.phone,
          row.operator,
          row.sport,
          row.groupTrained,
        ].some((v) => String(v ?? '').toLowerCase().includes(search));

      const age = getAge(row.dateOfBirth);
      const matchAge =
        ageRange === 'all'
          ? true
          : ageRange === '15-20'
            ? age >= 15 && age <= 20
            : ageRange === '20-50'
              ? age > 20 && age <= 50
              : ageRange === '50+'
                ? age > 50
                : true;

      const matchOperator =
        operator === 'all' ||
        String(row.operator ?? '').toLowerCase() === operator.toLowerCase();

      const typeValue = String(row.typology ?? row.memberType ?? '').toLowerCase();
      const matchTypology =
        typology === 'all' || typeValue.includes(typology.toLowerCase());

      const matchCasual =
        casual === 'all' ||
        String(row.casual ?? 'No').toLowerCase() === casual.toLowerCase();

      const matchSport =
        sportFilter === 'all' ||
        String(row.sport ?? '').toLowerCase() === sportFilter.toLowerCase();

      const matchGroup =
        groupFilter === 'all' ||
        String(row.groupTrained ?? '').toLowerCase() === groupFilter.toLowerCase();

      let matchDate = true;
      if (dateRange.startDate && dateRange.endDate && row.insertDate) {
        const insertDate = new Date(row.insertDate);
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        matchDate = insertDate >= start && insertDate <= end;
      }

      return (
        matchSearch &&
        matchAge &&
        matchOperator &&
        matchTypology &&
        matchCasual &&
        matchSport &&
        matchGroup &&
        matchDate
      );
    });
  }, [
    data,
    searchTerm,
    ageRange,
    operator,
    typology,
    casual,
    sportFilter,
    groupFilter,
    dateRange,
  ]);

  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;
    const copy = [...filteredData];
    copy.sort((a, b) => {
      const aValue = a[sortConfig.key as keyof Member];
      const bValue = b[sortConfig.key as keyof Member];
      const aStr = String(aValue ?? '').toLowerCase();
      const bStr = String(bValue ?? '').toLowerCase();
      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filteredData, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / perPage));
  const safePage = Math.min(page, totalPages);
  const rows = sortedData.slice((safePage - 1) * perPage, safePage * perPage);
  const allSelected = rows.length > 0 && rows.every((row) => row.checked);
  const selectedRows = data.filter((row) => row.checked);

  const handleSort = (key: string) => {
    if (key === 'checked' || key === 'options' || key === 'image') return;
    setPage(1);
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const toggleOne = (rowItem: Member) => {
    setData((prev) =>
      prev.map((row) =>
        row === rowItem ||
        (row.memberId && rowItem.memberId && row.memberId === rowItem.memberId) ||
        (row.id && rowItem.id && row.id === rowItem.id)
          ? { ...row, checked: !row.checked }
          : row,
      ),
    );
  };

  const toggleAll = () => {
    const visibleIds = new Set(
      rows.map((r) => r.memberId || r.id || `${r.surname}-${r.name}`),
    );
    setData((prev) =>
      prev.map((row) => {
        const key = row.memberId || row.id || `${row.surname}-${row.name}`;
        return visibleIds.has(key) ? { ...row, checked: !allSelected } : row;
      }),
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    const to = emailTarget.trim();
    const message = emailMessage.trim();
    if (!to || !message) {
      window.alert('Enter email and message.');
      return;
    }
    setEmailSending(true);
    try {
      const tableHtml = generateHTMLTable(
        selectedRows.length > 0 ? selectedRows : rows,
        columns,
      );
      const res = await fetch('/api/send-email', {
        headers: getAuthHeaders(),
        method: 'POST',
        body: JSON.stringify({
          email: to,
          message,
          tableHtml,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || result.success === false) {
        throw new Error(result.error || 'Failed to send email');
      }
      window.alert('Email sent successfully.');
      setShowEmailModal(false);
      setEmailTarget('');
      setEmailMessage('');
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : 'Error sending email');
    } finally {
      setEmailSending(false);
    }
  };

  const handleSendData = () => {
    const html = generateHTMLTable(
      selectedRows.length > 0 ? selectedRows : rows,
      columns,
    );
    if (!html) {
      window.alert('No rows to send.');
      return;
    }
    setEmailTarget('');
    setEmailMessage('Archive of Members table attached below.');
    setShowEmailModal(true);
  };

  return (
    <div className="py-4 text-gray-900">
      <div className="no-print mb-4 space-y-3 rounded-lg bg-white p-4 shadow">
        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect
            label="Age"
            value={ageRange}
            options={AGE_OPTIONS}
            onChange={(v) => {
              setAgeRange(v);
              setPage(1);
            }}
          />
          <FilterSelect
            label="Operator"
            value={operator}
            options={OPERATOR_OPTIONS}
            onChange={(v) => {
              setOperator(v);
              setPage(1);
            }}
          />
          <FilterSelect
            label="Typology"
            value={typology}
            options={TYPOLOGY_OPTIONS}
            onChange={(v) => {
              setTypology(v);
              setPage(1);
            }}
          />
          <FilterSelect
            label="Casual"
            value={casual}
            options={CASUAL_OPTIONS}
            onChange={(v) => {
              setCasual(v);
              setPage(1);
            }}
          />
          <FilterSelect
            label="Sport"
            value={sportFilter}
            options={sportOptions}
            onChange={(v) => {
              setSportFilter(v);
              setPage(1);
            }}
          />
          <FilterSelect
            label="Group of training"
            value={groupFilter}
            options={groupOptions}
            onChange={(v) => {
              setGroupFilter(v);
              setPage(1);
            }}
          />
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">From</span>
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-2 py-1.5">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => {
                  setDateRange((prev) => ({ ...prev, startDate: e.target.value }));
                  setPage(1);
                }}
                className="bg-transparent text-sm outline-none"
              />
              <Calendar size={16} className="text-gray-500" />
            </div>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">To</span>
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-2 py-1.5">
              <input
                type="date"
                value={dateRange.endDate}
                min={dateRange.startDate || undefined}
                onChange={(e) => {
                  setDateRange((prev) => ({ ...prev, endDate: e.target.value }));
                  setPage(1);
                }}
                className="bg-transparent text-sm outline-none"
              />
              <Calendar size={16} className="text-gray-500" />
            </div>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search…"
            className="min-w-[16rem] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-green-50"
            >
              <Printer size={16} />
              Print
            </button>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowMsgDropdown((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-green-50"
              >
                <MessageCircle size={16} />
                Send Msg
              </button>
              {showMsgDropdown ? (
                <div className="absolute right-0 z-50 mt-2 w-44 rounded-lg border bg-white shadow-lg">
                  <button
                    type="button"
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                    onClick={() => {
                      const first = selectedRows[0];
                      setEmailTarget(String(first?.email || ''));
                      setEmailMessage('');
                      setShowEmailModal(true);
                      setShowMsgDropdown(false);
                    }}
                  >
                    To Email
                  </button>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleSendData}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-green-50"
            >
              <Database size={16} />
              Send Data
            </button>
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-green-50"
            >
              <Share2 size={16} />
              Share
            </button>
          </div>
        </div>
      </div>

      <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border border-gray-300 px-3 py-1.5 disabled:opacity-40"
          >
            Prev
          </button>
          <span>
            Page {safePage} / {totalPages} · {sortedData.length} member
            {sortedData.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded border border-gray-300 px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
        <div className="flex gap-1 text-gray-500">
          <span className="rounded border border-gray-200 p-2">
            <LayoutList size={18} />
          </span>
          <span className="rounded border border-gray-200 p-2">
            <Grid2X2 size={18} />
          </span>
        </div>
      </div>

      <div className="print-area overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="p-4 text-center no-print">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              {columns.map((col) => {
                const isNotSortable =
                  col.key === 'options' || col.key === 'image' || col.key === 'checked';
                const isActive = sortConfig?.key === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => !isNotSortable && handleSort(col.key)}
                    className={`p-4 text-center ${isNotSortable ? '' : 'cursor-pointer'} ${
                      col.key === 'image' || col.key === 'options' ? 'print:hidden' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>{col.header}</span>
                      {!isNotSortable && isActive ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp size={16} />
                        ) : (
                          <ArrowDown size={16} />
                        )
                      ) : null}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="p-8 text-center text-gray-500"
                >
                  No members found.
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr
                  key={row.memberId || row.id || rowIndex}
                  className="border-t text-gray-700"
                >
                  <td className="p-4 text-center no-print">
                    <input
                      type="checkbox"
                      checked={Boolean(row.checked)}
                      onChange={() => toggleOne(row)}
                    />
                  </td>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`p-4 text-center ${
                        col.key === 'options' || col.key === 'image' ? 'no-print' : ''
                      }`}
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : (row[col.key] as ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showEmailModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <button
              type="button"
              className="absolute right-3 top-3 text-gray-400 hover:text-black"
              onClick={() => setShowEmailModal(false)}
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <h2 className="mb-4 text-lg font-semibold">Send mail</h2>
            <input
              type="email"
              placeholder="Email address"
              value={emailTarget}
              onChange={(e) => setEmailTarget(e.target.value)}
              className="mb-3 w-full rounded-lg border p-3 text-sm"
            />
            <textarea
              placeholder="Message"
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              className="mb-4 h-28 w-full resize-none rounded-lg border p-3 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={emailSending}
                onClick={() => void handleSendEmail()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {emailSending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ShareModal open={showShareModal} onClose={() => setShowShareModal(false)} />
    </div>
  );
}
