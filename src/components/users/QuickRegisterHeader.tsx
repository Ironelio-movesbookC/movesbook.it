'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { COUNTRY_SELECT_OPTIONS } from '@/constants/countries.constants';

export default function QuickRegisterHeader() {
  const [countryId, setCountryId] = useState('');

  return (
    <header className="quick-register-top-header">
      <div className="quick-register-header-inner">
        <div className="logo">
          <Link href="/">
            <Image src="/img/logo.png" alt="Movesbook" width={335} height={86} priority />
          </Link>
        </div>
        <div className="selectcountrydiv">
          <div className="seltext">Select your country to calc prices in your currency</div>
          <div className="countrysel">
            <div className="droplist">
              <select
                name="country_id"
                value={countryId}
                onChange={(e) => setCountryId(e.target.value)}
                aria-label="Select country for currency"
              >
                <option value="">Select Country</option>
                {COUNTRY_SELECT_OPTIONS.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="clear" />
      </div>
    </header>
  );
}
