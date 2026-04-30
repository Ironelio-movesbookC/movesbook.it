import ModernNavbar from '@/components/ModernNavbar';
import { NetworkSearchListClient } from '@/components/search/NetworkSearchListClient';

export default function UserSearchListPage({
  params,
  searchParams,
}: {
  params: { query: string; slug: string };
  searchParams: { source?: string };
}) {
  const raw = params.query ?? '';
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }

  const source: 'mypage' | 'myclub' =
    searchParams.source === 'myclub' ? 'myclub' : 'mypage';

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100">
      <ModernNavbar />
      <NetworkSearchListClient initialQuery={decoded} initialSource={source} />
    </div>
  );
}
