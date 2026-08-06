'use client';

import { ExternalLink } from 'lucide-react';
import {
  openThreadPathInNewTab,
  pickThreadPath,
} from '@/lib/messages/threadPathLink';

type Props = {
  pathStaff?: string | null;
  realPath?: string | null;
  /** Visible path label prefix, e.g. "Path". */
  pathLabel?: string;
  /** Button label, e.g. "Open link". */
  openLabel?: string;
  className?: string;
};

/** Shows stored path text + Open link (new tab) when the user inserted a path. */
export default function ThreadPathOpenLink({
  pathStaff,
  realPath,
  pathLabel = 'Path',
  openLabel = 'Open link',
  className = '',
}: Props) {
  const display = pickThreadPath(pathStaff, realPath);
  if (!display) return null;

  return (
    <div className={`mt-2 flex flex-wrap items-center gap-2 ${className}`}>
      <p className="text-xs text-slate-600 break-all min-w-0 flex-1">
        <span className="font-medium text-slate-700">{pathLabel}:</span> {display}
      </p>
      <button
        type="button"
        onClick={() => openThreadPathInNewTab(pathStaff, realPath)}
        className="inline-flex items-center gap-1 shrink-0 rounded px-2.5 py-1 text-xs font-semibold bg-[#058592] text-white hover:bg-[#04707a]"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        {openLabel}
      </button>
    </div>
  );
}
