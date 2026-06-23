'use client';

import type { ReactNode } from 'react';

type Props = {
  title: string;
  titleClassName?: string;
  children: ReactNode;
};

export default function ProcedureFormSection({
  title,
  titleClassName = 'text-red-700',
  children,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <div className="bg-gray-100 px-4 py-2 border-b">
        <h2 className={`font-semibold ${titleClassName}`}>{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function ProcedureFormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">{children}</div>;
}

export function ProcedureFormCell({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm text-gray-600 block mb-1 text-right md:text-right">{label}</span>
      {children}
    </label>
  );
}

export const procedureInputClass =
  'w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white';
export const procedureHighlightInputClass =
  'w-full border border-gray-300 rounded px-3 py-2 text-sm bg-yellow-50';
export const procedureReadonlyInputClass =
  'w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50';
