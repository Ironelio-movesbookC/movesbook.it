'use client';

import { useEffect } from 'react';
import AdminNavbar from '@/components/AdminNavbar';
import AdvertisementCarousel from '@/components/AdvertisementCarousel';
import './send-invite-page.css';

type SendInvitePageChromeProps = {
  children: React.ReactNode;
};

/** Next.js promocode send-invite popup shell (AdminNavbar + ad banner — not PHP club chrome). */
export default function SendInvitePageChrome({ children }: SendInvitePageChromeProps) {
  useEffect(() => {
    document.documentElement.classList.add('send-invite-popup-active');
    document.body.classList.add('send-invite-popup-active');
    return () => {
      document.documentElement.classList.remove('send-invite-popup-active');
      document.body.classList.remove('send-invite-popup-active');
    };
  }, []);

  return (
    <div className="send-invite-page fixed inset-0 z-50 flex flex-col overflow-hidden bg-gray-50">
      <AdminNavbar />

      <div className="send-invite-page-banner flex-shrink-0 px-4 py-3">
        <AdvertisementCarousel />
      </div>

      <main className="send-invite-page-main flex-1 min-h-0 overflow-y-auto bg-[#ececec] p-4 md:p-6">
        <div className="send-invite-page-card mx-auto max-w-5xl rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="send-invite-page-heading border-b border-gray-200 px-6 py-4">
            <h1 className="text-xl font-semibold text-gray-900">Send promocode invitation</h1>
            <p className="mt-1 text-sm text-gray-600">
              Review the email content below, then send the invitation to the recipient.
            </p>
          </div>
          <div className="send-invite-content px-6 py-4">{children}</div>
        </div>
      </main>
    </div>
  );
}
