'use client';

import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';

type Props = {
  title: string;
  description?: string;
};

export default function PlaceholderArchivePage({
  title,
  description = 'This archive is wired in the sidebar. Backend integration for legacy PHP data can be added when the corresponding tables are available.',
}: Props) {
  return (
    <div className="p-4">
      <ProcedureArchiveShell title={title} activeTab="" tabs={[]}>
        <p className="text-sm text-gray-600 p-4">{description}</p>
      </ProcedureArchiveShell>
    </div>
  );
}
