'use client';

export type MubDisplayMode = 1 | 2;
export type MubButtonSize = 1 | 2 | 3; // SMALL | MEDIUM | LARGE

/** Buttons per page (A) or per row (B). */
export const MUB_SIZE_COUNTS: Record<MubButtonSize, number> = {
  1: 8,
  2: 6,
  3: 4,
};

export const MUB_SIZE_LABELS: Record<MubButtonSize, string> = {
  1: 'SMALL',
  2: 'MEDIUM',
  3: 'LARGE',
};

type MubPreviewModeToggleProps = {
  value: MubDisplayMode;
  onChange: (mode: MubDisplayMode) => void;
  size: MubButtonSize;
  onSizeChange: (size: MubButtonSize) => void;
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

export default function MubPreviewModeToggle({
  value,
  onChange,
  size,
  onSizeChange,
  disabled,
}: MubPreviewModeToggleProps) {
  const base =
    'inline-flex h-8 w-9 items-center justify-center rounded border bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';
  const active = 'border-orange-500 ring-1 ring-orange-400';
  const inactive = 'border-gray-400';
  const sizeBase =
    'inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded border px-1.5 text-[10px] font-bold transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-gray-800">Select the preview</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(1)}
        className={`${base} ${value === 1 ? active : inactive}`}
        aria-label="Preview mode A — list with description"
        aria-pressed={value === 1}
        title="A: button + description"
      >
        <PreviewListIcon />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(2)}
        className={`${base} ${value === 2 ? active : inactive}`}
        aria-label="Preview mode B — buttons only (hover for description)"
        aria-pressed={value === 2}
        title="B: buttons only"
      >
        <PreviewGridIcon />
      </button>
      <span className="ml-1 text-[10px] text-gray-600">Size</span>
      {([1, 2, 3] as MubButtonSize[]).map((s) => (
        <button
          key={s}
          type="button"
          disabled={disabled}
          onClick={() => onSizeChange(s)}
          className={`${sizeBase} ${size === s ? active : inactive}`}
          aria-label={`Display buttons ${MUB_SIZE_LABELS[s]}`}
          aria-pressed={size === s}
          title={`${MUB_SIZE_LABELS[s]} (${MUB_SIZE_COUNTS[s]} ${value === 1 ? 'per page' : 'per row'})`}
        >
          {s === 1 ? 'S' : s === 2 ? 'M' : 'L'}
        </button>
      ))}
    </div>
  );
}

export function normalizeMubDisplayMode(raw: number | null | undefined): MubDisplayMode {
  return raw === 2 ? 2 : 1;
}

export function normalizeMubButtonSize(raw: number | null | undefined): MubButtonSize {
  if (raw === 1 || raw === 3) return raw;
  return 2;
}
