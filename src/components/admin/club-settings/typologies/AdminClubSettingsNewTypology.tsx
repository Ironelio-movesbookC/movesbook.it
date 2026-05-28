'use client';

export default function AdminClubSettingsNewTypology({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-sm font-semibold rounded border transition border-gray-300 bg-gray-100 text-gray-950 hover:bg-gray-200"
        >
          Back
        </button>
      </div>

      <div className="rounded-lg border border-gray-300 bg-white p-4 text-sm text-gray-900">
        New Typology
      </div>
    </div>
  );
}

