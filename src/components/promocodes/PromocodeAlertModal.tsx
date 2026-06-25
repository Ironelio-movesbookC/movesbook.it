'use client';

type PromocodeAlertModalProps = {
  open: boolean;
  title?: string;
  message: string;
  onClose: () => void;
};

export default function PromocodeAlertModal({
  open,
  title = 'Notice',
  message,
  onClose,
}: PromocodeAlertModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="promocode-alert-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md border border-gray-400 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-300 bg-[#7b0a26] px-4 py-3 text-lg font-semibold text-white">
          <h2 id="promocode-alert-title">{title}</h2>
        </div>
        <p className="whitespace-pre-wrap px-4 py-5 text-sm text-gray-800">{message}</p>
        <div className="flex justify-end border-t border-gray-200 bg-gray-50 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[#7b0a26] bg-[#7b0a26] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5c081d]"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
