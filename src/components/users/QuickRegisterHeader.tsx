'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function QuickRegisterHeader() {
  return (
    <header className="quick-register-top-header">
      <div className="quick-register-header-inner">
        <div className="logo">
          <Link href="/">
            <Image src="/img/logo.png" alt="Movesbook" width={335} height={86} priority />
          </Link>
        </div>
        <div className="clear" />
      </div>
    </header>
  );
}
