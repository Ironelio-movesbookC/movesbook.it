'use client';

import type { PcuAlertDisplayPayload } from '@/lib/admin/userPcuAlertMsg';

type UserPcuAlertModalProps = {
  open: boolean;
  alert: PcuAlertDisplayPayload | null;
  onClose: () => void;
};

export default function UserPcuAlertModal({ open, alert, onClose }: UserPcuAlertModalProps) {
  if (!open || !alert) return null;

  const hasBody = Boolean(alert.bodyHtml?.trim());
  const hasTitle = Boolean(alert.title?.trim());

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pcu-alert-title"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-md border border-[#c8c8c8] bg-[#e4e4e4] shadow-xl">
        <div className="px-5 py-5">
          {hasTitle ? (
            <h2
              id="pcu-alert-title"
              className="text-center text-red-600 font-bold text-base sm:text-lg leading-snug mb-2"
            >
              {alert.title}
            </h2>
          ) : null}

          <p className="text-center text-sm text-gray-800 font-medium mb-4">Message to read</p>

          {hasBody ? (
            <div
              className="text-sm text-gray-900 max-w-none ck-content [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:font-bold [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-blue-700 [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: alert.bodyHtml }}
            />
          ) : (
            <p className="text-sm text-gray-600 text-center italic py-4">No message content.</p>
          )}

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-2 bg-[#5b7a9d] hover:bg-[#4a6889] text-white font-semibold text-sm rounded"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
