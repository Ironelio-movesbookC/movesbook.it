import type { Column, Member } from '@/types/clubTable';

export const archiveImageColumn: Column = {
  key: 'image',
  header: 'Image',
  render: (value) =>
    value ? (
      <img src={String(value)} alt="" className="w-10 h-10 rounded-full mx-auto object-cover" />
    ) : (
      <span className="text-gray-400">-</span>
    ),
};

export function statusBadgeColumn(key: keyof Member = 'status'): Column {
  return {
    key,
    header: 'Status',
    render: (value) => {
      const styles: Record<string, string> = {
        Active: 'bg-green-100 text-green-700',
        Pending: 'bg-yellow-100 text-yellow-700',
        Expired: 'bg-red-100 text-red-700',
        Paid: 'bg-green-100 text-green-700',
        'Not paid': 'bg-red-100 text-red-700',
      };
      const label = String(value ?? '-');
      return (
        <span className={`px-2 py-1 rounded text-xs ${styles[label] || 'bg-gray-100 text-gray-700'}`}>
          {label}
        </span>
      );
    },
  };
}

export function formatArchiveDate(value: unknown): string {
  if (!value || value === '-') return '-';
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}
