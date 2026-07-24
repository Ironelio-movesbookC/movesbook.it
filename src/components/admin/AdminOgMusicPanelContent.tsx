'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import MyMusicPanel from '@/components/music/MyMusicPanel';

export interface AdminOgMusicPanelContentProps {
  /** Target for the header close (X) link — default returns to admin home */
  closeHref?: string;
}

/**
 * Superadmin "OG Music panel" — same My Music UI as the athlete/user dashboard.
 * Embedded on /admin/dashboard when opened from Music → OG Music panel.
 */
export default function AdminOgMusicPanelContent({
  closeHref = '/admin/dashboard',
}: AdminOgMusicPanelContentProps) {
  return (
    <div className="p-4 md:p-6 max-w-[1920px] mx-auto">
      <div className="rounded-xl shadow-md border border-gray-200 overflow-hidden bg-[#152038]">
        <div className="flex items-center justify-end px-3 py-2 border-b border-white/20 bg-[#1a2744]">
          <Link
            href={closeHref}
            className="p-1.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </Link>
        </div>
        <div className="flex flex-col min-h-[70vh] max-h-[calc(100vh-8rem)]">
          <MyMusicPanel embedded adminContext />
        </div>
      </div>
    </div>
  );
}
