'use client';

import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';
import type { CountryPartnerRecord } from './countryEditTypes';
import { createPartner } from '@/lib/countries/countrySettingsStorage';

type Props = {
  entityLabel: 'Distributor' | 'Dealer';
  record: CountryPartnerRecord | null;
  onSubmit: (record: CountryPartnerRecord) => void;
  onClose: () => void;
};

function emptyForm(record: CountryPartnerRecord | null): CountryPartnerRecord {
  if (record) return { ...record, extraRows: [...record.extraRows] };
  return createPartner('');
}

export function CountryPartnerFormModal({ entityLabel, record, onSubmit, onClose }: Props) {
  const fileInputId = useId();
  const [form, setForm] = useState<CountryPartnerRecord>(() => emptyForm(record));
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    setForm(emptyForm(record));
    setImagePreview(record?.imageDataUrl ?? null);
  }, [record]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const updateRow = (index: number, value: string) => {
    setForm((prev) => {
      const extraRows = [...prev.extraRows];
      extraRows[index] = value;
      return { ...prev, extraRows };
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      setImagePreview(dataUrl);
      setForm((prev) => ({ ...prev, fileName: file.name, imageDataUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    const name = form.name.trim();
    if (!name) return;
    onSubmit({
      ...form,
      name,
      imageDataUrl: imagePreview ?? form.imageDataUrl,
    });
  };

  const nameLabel = `${entityLabel} Name`;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/45"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#ececec] border border-gray-400 shadow-xl w-full max-w-md rounded-sm">
        <div className="relative">
          <div className="bg-[#bdbdbd] text-gray-900 font-bold text-sm px-3 py-2 border-b border-gray-400">
            {record ? `Edit ${entityLabel}` : `Add ${entityLabel}`}
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

        <div className="p-4 space-y-3 text-sm">
          <label className="flex items-center justify-end gap-2 text-gray-800">
            <span className="font-semibold">Operative</span>
            <input
              type="checkbox"
              checked={form.operative}
              onChange={(e) => setForm((prev) => ({ ...prev, operative: e.target.checked }))}
            />
          </label>

          <div className="flex gap-3 items-start">
            <div className="flex-1 min-w-0">
              <input
                id={fileInputId}
                type="file"
                accept="image/*"
                className="text-xs max-w-full"
                onChange={handleFile}
              />
              {form.fileName ? (
                <p className="text-xs text-gray-600 mt-1">Selected: {form.fileName}</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">No file chosen</p>
              )}
            </div>
            <div
              className="w-24 h-24 shrink-0 border border-gray-400 bg-gray-200 flex items-center justify-center overflow-hidden"
              aria-label="Profile picture preview"
            >
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="" className="max-h-full max-w-full object-contain" />
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
            <label className="font-semibold text-gray-800">{nameLabel}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={nameLabel}
              className="border border-gray-400 bg-white px-2 py-1"
            />
          </div>

          <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
            <label className="font-semibold text-gray-800 pt-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Type here address contacts data"
              rows={4}
              className="border border-gray-400 bg-white px-2 py-1 resize-y min-h-[80px]"
            />
          </div>

          {form.extraRows.map((row, index) => (
            <input
              key={index}
              type="text"
              value={row}
              onChange={(e) => updateRow(index, e.target.value)}
              placeholder={`Row ${index + 1}`}
              className="w-full border border-gray-400 bg-white px-2 py-1"
            />
          ))}

          <div className="flex flex-col items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              className="bg-gradient-to-b from-[#666] to-[#444] text-white px-8 py-1.5 text-sm font-bold rounded-sm border border-black hover:from-[#777] hover:to-[#555] min-w-[120px]"
            >
              submit
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-gradient-to-b from-[#666] to-[#444] text-white px-8 py-1.5 text-sm font-bold rounded-sm border border-black hover:from-[#777] hover:to-[#555] min-w-[120px]"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
