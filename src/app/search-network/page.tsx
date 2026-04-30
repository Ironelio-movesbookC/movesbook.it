import Link from 'next/link';
import ModernNavbar from '@/components/ModernNavbar';

const SCOPE_LABELS: Record<string, string> = {
  single_user: 'Single User',
  coach: 'Coach',
  team: 'Team',
  club: 'Club'
};

export default function SearchNetworkPage({
  searchParams
}: {
  searchParams: { q?: string; scope?: string };
}) {
  const q = searchParams.q?.trim() ?? '';
  const scope = searchParams.scope ?? 'single_user';

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <ModernNavbar />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-6 py-10">
        <h1 className="text-xl font-semibold text-zinc-900">Network search</h1>
        <p className="text-sm text-zinc-600">
          <span className="font-medium text-zinc-800">Query:</span> {q || '—'}
        </p>
        <p className="text-sm text-zinc-600">
          <span className="font-medium text-zinc-800">Type:</span> {SCOPE_LABELS[scope] ?? scope}
        </p>
        <p className="text-xs text-zinc-500">
          URL parameters: <code className="rounded bg-zinc-200 px-1">q</code>,{' '}
          <code className="rounded bg-zinc-200 px-1">scope</code>.
        </p>
        <Link href="/" className="text-sm font-semibold text-cyan-700 hover:text-cyan-900">
          ← Back to home
        </Link>
      </main>
    </div>
  );
}
