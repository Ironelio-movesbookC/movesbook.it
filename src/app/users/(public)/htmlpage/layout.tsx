import Link from 'next/link';
import './htmlpage.css';

export default function HtmlPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="htmlpage-shell">
      <header className="htmlpage-header">
        <Link href="/" className="htmlpage-logo">
          <img src="/sidelogo.png" alt="Movesbook" width={200} height={52} />
        </Link>
        <div className="htmlpage-header-actions">
          <Link href="/" className="htmlpage-btn">
            Login
          </Link>
          <Link href="/users/home" className="htmlpage-btn">
            Register
          </Link>
        </div>
      </header>
      <main className="htmlpage-main">{children}</main>
    </div>
  );
}
