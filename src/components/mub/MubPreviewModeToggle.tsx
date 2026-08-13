'use client';

type MubPreviewModeToggleProps = {
  value: 1 | 2;
  onChange: (mode: 1 | 2) => void;
  disabled?: boolean;
};

/** Mode #1 — thumbnail + description lines (PHP list preview icon). */
function PreviewListIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 22 14" className={className} width={22} height={14} aria-hidden>
      <rect x="0.5" y="1" width="7" height="7" rx="0.5" fill="currentColor" />
      <rect x="10" y="1.5" width="11" height="2.5" rx="0.5" fill="currentColor" />
      <rect x="10" y="6" width="11" height="2.5" rx="0.5" fill="currentColor" />
    </svg>
  );
}

/** Mode #2 — compact tile grid (PHP grid preview icon). */
function PreviewGridIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} width={16} height={16} aria-hidden>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect
          key={i}
          x={(i % 2) * 8 + 1}
          y={Math.floor(i / 2) * 5 + 1}
          width="6"
          height="3.5"
          rx="0.5"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

export default function MubPreviewModeToggle({ value, onChange, disabled }: MubPreviewModeToggleProps) {
  const base =
    'inline-flex h-8 w-9 items-center justify-center rounded border bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';
  const active = 'border-orange-500 ring-1 ring-orange-400';
  const inactive = 'border-gray-400';

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-800">Select the preview</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(1)}
        className={`${base} ${value === 1 ? active : inactive}`}
        aria-label="Preview mode 1 — list with description"
        aria-pressed={value === 1}
        title="Preview mode 1"
      >
        <PreviewListIcon />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(2)}
        className={`${base} ${value === 2 ? active : inactive}`}
        aria-label="Preview mode 2 — compact tiles"
        aria-pressed={value === 2}
        title="Preview mode 2"
      >
        <PreviewGridIcon />
      </button>
    </div>
  );
}

export type MubDisplayMode = 1 | 2;

export function normalizeMubDisplayMode(raw: number | null | undefined): MubDisplayMode {
  return raw === 2 ? 2 : 1;
}
