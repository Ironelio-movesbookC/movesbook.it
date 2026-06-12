import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shared workout day — Movesbook',
  description: 'View-only shared workout day plan on Movesbook',
};

export default function SharedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
