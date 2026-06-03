'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  widthClass?: string;
};

export function CountrySubModalFrame({
  title,
  onClose,
  children,
  widthClass = 'max-w-md',
}: Props) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/45"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`bg-[#ececec] border border-gray-400 shadow-xl w-full ${widthClass} flex flex-col rounded-sm`}>
        <div className="relative shrink-0">
          <div className="bg-[#bdbdbd] text-gray-900 font-bold text-sm px-3 py-2 border-b border-gray-400">
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute -top-2 -right-2 rounded-full bg-[#c0392b] hover:bg-[#a93226] text-white w-7 h-7 flex items-center justify-center shadow"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3">{children}</div>
      </div>
    </div>
  );
}
