'use client';

import Image from 'next/image';
import { mubTextColorCss } from '@/lib/mub/constants';

type MubButtonPreviewProps = {
  button: {
    buttonColor: string;
    textFont: string;
    textColor: string;
    iconPath: string;
    shortText: string;
    extendedText: string;
  };
  compact?: boolean;
};

export default function MubButtonPreview({ button, compact }: MubButtonPreviewProps) {
  return (
    <div className={`flex min-w-0 items-stretch gap-2 ${compact ? 'max-w-xs' : 'flex-1'}`}>
      <div
        className="flex min-w-[8rem] shrink-0 items-center gap-2 rounded px-2 py-1.5"
        style={{ backgroundColor: button.buttonColor, fontFamily: button.textFont }}
      >
        {button.iconPath ? (
          <Image src={button.iconPath} alt="" width={28} height={28} className="h-7 w-7 shrink-0 object-cover" unoptimized />
        ) : null}
        <span className="truncate text-sm font-semibold" style={{ color: mubTextColorCss(button.textColor) }}>
          {button.shortText || 'Button'}
        </span>
      </div>
      {!compact ? (
        <div className="min-w-0 flex-1 rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700">
          {button.extendedText || '\u00A0'}
        </div>
      ) : null}
    </div>
  );
}
