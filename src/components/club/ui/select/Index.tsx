import React, { useState } from "react";
import { Check, ChevronDown } from 'lucide-react'
interface Option {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export default function Select({
  label,
  options,
  value,
  onChange,
  placeholder = "Select..."
}: SelectProps) {
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative w-56">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {/* Trigger */}
        <button
          onClick={() => setOpen(!open)}
          className="
        w-full flex items-center justify-between
        border border-gray-300 rounded-lg
        px-3 py-2 bg-white
        text-sm
        hover:bg-gray-50
        focus:outline-none focus:ring-2 focus:ring-blue-500
        "
        >
          {selected?.label || placeholder}
          <ChevronDown
            size={16}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <div
            className="
          absolute mt-2 w-full
          bg-white border border-gray-200
          rounded-lg shadow-lg
          overflow-hidden z-50
          "
          >
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onChange?.(option.value);
                  setOpen(false);
                }}
                className="
              px-3 py-2 text-sm
              cursor-pointer
              hover:bg-gray-100
              flex justify-between items-center
              "
              >
                {option.label}

                {value === option.value && (
                  <Check size={16} className="text-blue-500" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
