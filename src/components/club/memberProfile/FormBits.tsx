'use client';

import type { ReactNode } from 'react';

export function SectionCard({
  title,
  children,
  tone = 'slate',
}: {
  title: string;
  children: ReactNode;
  tone?: 'slate' | 'red' | 'blue' | 'purple';
}) {
  const bar =
    tone === 'red'
      ? 'bg-red-700'
      : tone === 'blue'
        ? 'bg-[#2f6fb5]'
        : tone === 'purple'
          ? 'bg-[#6b4c9a]'
          : 'bg-gray-700';
  return (
    <section className="mb-4 overflow-hidden rounded border border-gray-300 bg-white">
      <div className={`${bar} px-3 py-2 text-sm font-semibold text-white`}>{title}</div>
      <div className="space-y-3 p-3 md:p-4">{children}</div>
    </section>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-gray-800">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-gray-500">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded border border-gray-400 bg-[#fffde7] px-2 py-1.5 text-sm text-gray-900 disabled:bg-gray-100 ${props.className || ''}`}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded border border-gray-400 bg-[#fffde7] px-2 py-1.5 text-sm text-gray-900 disabled:bg-gray-100 ${props.className || ''}`}
    />
  );
}

export function TextSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded border border-gray-400 bg-[#fffde7] px-2 py-1.5 text-sm text-gray-900 disabled:bg-gray-100 ${props.className || ''}`}
    />
  );
}

export function CheckRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-gray-800">
      <input
        type="checkbox"
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function Row2({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>;
}
