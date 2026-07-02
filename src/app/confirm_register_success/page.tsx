import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ConfirmRegisterSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; expired?: string }>;
}) {
  const { done, expired } = await searchParams;
  const ok = Boolean(done) && !expired;

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f3f3f3', padding: 24 }}>
      <section style={{ background: '#fff', border: '1px solid #ddd', padding: 28, maxWidth: 520 }}>
        <h1 style={{ margin: '0 0 12px', fontSize: 24, color: '#610d1c' }}>
          {ok ? 'Registration Confirmed' : 'Confirmation Link Expired'}
        </h1>
        <p style={{ margin: '0 0 20px', color: '#333', lineHeight: 1.5 }}>
          {ok
            ? 'Your email address and Movesbook account have been confirmed.'
            : 'This confirmation link is not valid or has expired.'}
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            background: '#111',
            color: '#fff',
            padding: '9px 18px',
            textDecoration: 'none',
          }}
        >
          OK
        </Link>
      </section>
    </main>
  );
}
