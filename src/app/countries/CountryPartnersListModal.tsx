'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { CountryPartnerRecord } from './countryEditTypes';
import { CountryPartnerFormModal } from './CountryPartnerFormModal';
import { CountrySubModalFrame } from './CountrySubModalFrame';

type Props = {
  countryName: string;
  titlePrefix: 'Distributor' | 'Dealer';
  records: CountryPartnerRecord[];
  onChange: (records: CountryPartnerRecord[]) => void;
  onClose: () => void;
};

export function CountryPartnersListModal({
  countryName,
  titlePrefix,
  records,
  onChange,
  onClose,
}: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CountryPartnerRecord | null>(null);

  const plural = titlePrefix === 'Distributor' ? 'Distributors' : 'Dealers';
  const title =
    titlePrefix === 'Distributor' ? `Distributor of ${countryName}` : `${plural} of ${countryName}`;

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (record: CountryPartnerRecord) => {
    setEditing(record);
    setFormOpen(true);
  };

  const handleSubmit = (record: CountryPartnerRecord) => {
    const exists = records.some((r) => r.id === record.id);
    onChange(exists ? records.map((r) => (r.id === record.id ? record : r)) : [...records, record]);
    setFormOpen(false);
    setEditing(null);
  };

  const removeRecord = (id: string) => {
    onChange(records.filter((r) => r.id !== id));
  };

  return (
    <>
      <CountrySubModalFrame title={title} onClose={onClose} widthClass="max-w-xl">
        <button
          type="button"
          onClick={openAdd}
          className="bg-black text-white text-xs font-bold px-4 py-1.5 rounded-sm hover:bg-gray-900 mb-3"
        >
          Add New
        </button>

        <div className="border border-gray-400 bg-white max-h-[360px] overflow-auto">
          <table className="w-full text-sm">
            <tbody>
              {records.map((record, index) => (
                <tr key={record.id} className={index % 2 === 0 ? 'bg-white' : 'bg-[#f5f5f5]'}>
                  <td className="w-14 px-2 py-1.5 border-r border-gray-200 align-middle">
                    {record.imageDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={record.imageDataUrl}
                        alt=""
                        className="w-10 h-10 object-cover border border-gray-300 bg-gray-100"
                      />
                    ) : (
                      <span className="inline-flex w-10 h-10 items-center justify-center border border-gray-300 bg-gray-100 text-gray-500 text-xs">
                        {index + 1}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 border-r border-gray-200">
                    <button
                      type="button"
                      className="text-[#0066cc] hover:underline"
                      onClick={() => openEdit(record)}
                    >
                      {record.name}
                    </button>
                  </td>
                  <td className="w-16 px-2 py-1.5 border-r border-gray-200 text-center">
                    <button
                      type="button"
                      className="text-[#0066cc] underline text-xs"
                      onClick={() => openEdit(record)}
                    >
                      Edit
                    </button>
                  </td>
                  <td className="w-10 px-2 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeRecord(record.id)}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#888] hover:bg-[#666] text-white"
                      aria-label={`Delete ${record.name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {records.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-500 text-sm">
                    No {plural.toLowerCase()} yet. Click Add New.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CountrySubModalFrame>

      {formOpen ? (
        <CountryPartnerFormModal
          entityLabel={titlePrefix}
          record={editing}
          onSubmit={handleSubmit}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      ) : null}
    </>
  );
}
