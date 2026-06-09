'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { CountryRegionItem } from './countryEditTypes';
import { CountrySubModalFrame } from './CountrySubModalFrame';

type Props = {
  countryName: string;
  regions: CountryRegionItem[];
  onChange: (regions: CountryRegionItem[]) => void;
  onClose: () => void;
};

export function CountryRegionsModal({ countryName, regions, onChange, onClose }: Props) {
  const [draftName, setDraftName] = useState('');

  const addRegion = () => {
    const name = draftName.trim();
    if (!name) return;
    if (regions.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      setDraftName('');
      return;
    }
    onChange([...regions, { id: `${Date.now()}-${Math.random()}`, name }]);
    setDraftName('');
  };

  const removeRegion = (id: string) => {
    onChange(regions.filter((r) => r.id !== id));
  };

  return (
    <CountrySubModalFrame title={`Regions of ${countryName}`} onClose={onClose} widthClass="max-w-lg">
      <input
        type="text"
        value={draftName}
        onChange={(e) => setDraftName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addRegion();
          }
        }}
        placeholder="Type name and press enter to add a region"
        className="w-full border border-gray-400 bg-white px-2 py-1.5 text-sm mb-3"
      />

      <div className="border border-gray-400 bg-white max-h-[360px] overflow-auto">
        <table className="w-full text-sm">
          <tbody>
            {regions.map((region, index) => (
              <tr key={region.id} className={index % 2 === 0 ? 'bg-white' : 'bg-[#f5f5f5]'}>
                <td className="w-10 px-2 py-1.5 border-r border-gray-200 text-gray-700">{index + 1}</td>
                <td className="px-2 py-1.5 border-r border-gray-200">
                  <button
                    type="button"
                    className="text-[#0066cc] hover:underline text-left"
                    onClick={() => {
                      const next = window.prompt('Edit region name', region.name);
                      if (!next?.trim()) return;
                      onChange(
                        regions.map((r) => (r.id === region.id ? { ...r, name: next.trim() } : r)),
                      );
                    }}
                  >
                    {region.name}
                  </button>
                </td>
                <td className="w-10 px-2 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => removeRegion(region.id)}
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#888] hover:bg-[#666] text-white"
                    aria-label={`Delete ${region.name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {regions.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-gray-500 text-sm">
                  No regions yet. Type a name above and press Enter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </CountrySubModalFrame>
  );
}
