'use client';

import { useParams } from 'next/navigation';
import ModernNavbar from '@/components/ModernNavbar';
import ModernFooter from '@/components/ModernFooter';
import MyMusicPanel from '@/components/music/MyMusicPanel';

/**
 * Public My Music share page — same panel UI as the athlete dashboard My Music
 * (Home / Recent / Songs Loaded / …). No login required.
 */
export default function PublicMyMusicPage() {
  const params = useParams();
  const userKey = typeof params?.userKey === 'string' ? params.userKey : '';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ModernNavbar hideContentNav />
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-6 flex flex-col min-h-0">
        {userKey ? (
          <div className="flex-1 min-h-[70vh] max-h-[calc(100vh-8rem)] flex flex-col rounded-sm overflow-hidden border border-gray-300 shadow-sm bg-[#152038]">
            <MyMusicPanel embedded publicUserKey={userKey} />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Music not available</h1>
            <p className="text-sm text-gray-600">This My Music page could not be found.</p>
          </div>
        )}
      </main>
      <ModernFooter />
    </div>
  );
}
