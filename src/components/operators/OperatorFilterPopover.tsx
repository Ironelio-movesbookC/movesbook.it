'use client';

import { useEffect, useRef } from 'react';
import { Filter, ChevronDown } from 'lucide-react';
import { COUNTRIES } from '@/lib/news/countries';

export type OperatorLoginFilter = 'all' | 'on' | 'off';

export const OPERATOR_FILTER_ROLE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Coadmin', label: 'Coadmin' },
  { value: 'Movesbook staff', label: 'Movesbook staff' },
  { value: 'Agent', label: 'Agent' },
  { value: 'Sub Agent', label: 'Sub Agent' },
  { value: 'Translator', label: 'Translator' },
  { value: 'Inspector', label: 'Inspector' },
] as const;

const LOGIN_OPTIONS: { value: OperatorLoginFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'on', label: 'Log on' },
  { value: 'off', label: 'Log off' },
];

export function matchesOperatorRoleFilter(
  role: string | null | undefined,
  filter: string,
  accountKind?: 'OPERATOR' | 'CO_ADMIN' | null,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'Coadmin') {
    if (accountKind === 'CO_ADMIN') return true;
    if (accountKind === 'OPERATOR') return false;
    const r = (role || '').trim().toLowerCase();
    return r.includes('co-admin') || r.includes('coadmin') || r.includes('co admin');
  }
  const r = (role || '').trim().toLowerCase();
  switch (filter) {
    case 'Movesbook staff':
      return r.includes('staff');
    case 'Agent':
      return r.includes('agent') && !r.includes('sub');
    case 'Sub Agent':
      return r.includes('sub') && r.includes('agent');
    case 'Translator':
      return r.includes('translator');
    case 'Inspector':
      return r.includes('inspector');
    default:
      return r === filter.toLowerCase();
  }
}

export function matchesOperatorLoginFilter(
  lastLogin: string | null | undefined,
  filter: OperatorLoginFilter,
): boolean {
  if (filter === 'all') return true;
  const hasLogin = lastLogin != null && String(lastLogin).trim() !== '';
  return filter === 'on' ? hasLogin : !hasLogin;
}

/** Open session = log on; closed session = log off (login log tables). */
export function matchesLoginLogSessionFilter(
  logoutAt: string | null | undefined,
  filter: OperatorLoginFilter,
): boolean {
  if (filter === 'all') return true;
  const isOpen = logoutAt == null;
  return filter === 'on' ? isOpen : !isOpen;
}

type OperatorFilterPopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  country: string;
  onCountryChange: (value: string) => void;
  role: string;
  onRoleChange: (value: string) => void;
  login: OperatorLoginFilter;
  onLoginChange: (value: OperatorLoginFilter) => void;
  onClear: () => void;
  /** When false, hides the Role row (e.g. Movesbook users login list). */
  showRole?: boolean;
};

const selectClass =
  'min-w-[160px] max-w-[200px] flex-1 px-2 py-1.5 border border-gray-400 rounded-sm bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export function OperatorFilterPopover({
  open,
  onOpenChange,
  country,
  onCountryChange,
  role,
  onRoleChange,
  login,
  onLoginChange,
  onClear,
  showRole = true,
}: OperatorFilterPopoverProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) {
        onOpenChange(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open, onOpenChange]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex items-center gap-2 px-4 py-2.5 bg-[#2a2a2a] hover:bg-[#1a1a1a] text-white border border-gray-600 rounded transition"
      >
        <Filter className="w-4 h-4" />
        <span>Filter</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-[320px] rounded border border-gray-800 bg-[#fff8dc] px-4 py-3 shadow-lg"
          role="dialog"
          aria-label="Filter operators"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 justify-between">
              <span className="text-sm font-medium text-gray-900 shrink-0">Country</span>
              <select
                className={selectClass}
                value={country}
                onChange={(e) => onCountryChange(e.target.value)}
              >
                <option value="all">All</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {showRole ? (
              <div className="flex items-center gap-3 justify-between">
                <span className="text-sm font-medium text-gray-900 shrink-0">Role</span>
                <select
                  className={selectClass}
                  value={role}
                  onChange={(e) => onRoleChange(e.target.value)}
                >
                  {OPERATOR_FILTER_ROLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="flex items-center gap-3 justify-between">
              <span className="text-sm font-medium text-gray-900 shrink-0">Login</span>
              <select
                className={selectClass}
                value={login}
                onChange={(e) => onLoginChange(e.target.value as OperatorLoginFilter)}
              >
                {LOGIN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-amber-900/20">
            <button
              type="button"
              onClick={onClear}
              className="w-full py-2 px-3 text-sm font-medium rounded bg-gray-400 hover:bg-gray-500 text-gray-900 border border-gray-500 transition"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
