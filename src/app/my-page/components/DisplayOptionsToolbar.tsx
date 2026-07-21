"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Eye,
  EyeOff,
  Settings,
} from "lucide-react";
import ProfileDropdownMenu from "./ProfileDropdownMenu";

interface DisplayOptionsToolbarProps {
  showAdBanner: boolean;
  showPersonalBanner: boolean;
  showLeftSidebar: boolean;
  showRightSidebar: boolean;
  onToggleAdBanner: (value: boolean) => void;
  onTogglePersonalBanner: (value: boolean) => void;
  onToggleLeftSidebar: (value: boolean) => void;
  onToggleRightSidebar: (value: boolean) => void;
  onLogout?: () => void;
}

export default function DisplayOptionsToolbar({
  showAdBanner,
  showPersonalBanner,
  showLeftSidebar,
  showRightSidebar,
  onToggleAdBanner,
  onTogglePersonalBanner,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  onLogout,
}: DisplayOptionsToolbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="relative z-30 shrink-0 border-b bg-white px-4 py-2 md:px-12">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-4 overflow-x-hidden flex-wrap">
          <ToggleOption
            checked={showAdBanner}
            label="Advertising Banner"
            onChange={onToggleAdBanner}
          />

          <ToggleOption
            checked={showPersonalBanner}
            label="Personal Banner & Picture"
            onChange={onTogglePersonalBanner}
          />

          <ToggleOption
            checked={showLeftSidebar}
            label="Left Sidebar"
            onChange={onToggleLeftSidebar}
          />

          <ToggleOption
            checked={showRightSidebar}
            label="Right Sidebar"
            onChange={onToggleRightSidebar}
          />
        </div>

        <div
          ref={dropdownRef}
          className="relative shrink-0"
        >
          <motion.button
            type="button"
            onClick={() => setDropdownOpen((current) => !current)}
            aria-haspopup="menu"
            aria-expanded={dropdownOpen}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${
              dropdownOpen
                ? "border-[#7092BE] bg-[#7092BE]/10 text-[#7092BE]  lg:mr-[115px] ring-2 ring-[#7092BE]/20"
                : "border-gray-300 bg-white text-gray-700 hover:bg-[#8b8e9b3b]  lg:mr-[115px]"
            }`}
          >
            <Settings className="h-4 w-4" />

            <span className="hidden sm:inline">
              Profile Menu
            </span>

            <motion.div
              animate={{ rotate: dropdownOpen ? 180 : 0 }}
              transition={{ 
                type: "spring",
                stiffness: 350,
                damping: 18,
                mass: 0.6,
              }}
            >
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ 
                  type: "spring",
                  stiffness: 250,
                  damping: 20,
                  mass: 0.8,
                }}
                className="absolute right-0 top-full z-50 mt-2 w-[320px] max-w-[calc(100vw-2rem)]"
              >
                <ProfileDropdownMenu
                  onClose={() => setDropdownOpen(false)}
                  onLogout={onLogout}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

interface ToggleOptionProps {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}

function ToggleOption({
  checked,
  label,
  onChange,
}: ToggleOptionProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-[#7092BE] focus:ring-[#7092BE]"
      />

      <span className="flex items-center gap-1.5">
        {checked ? (
          <Eye className="h-4 w-4 text-[#7092BE]" />
        ) : (
          <EyeOff className="h-4 w-4 text-gray-400" />
        )}

        {label}
      </span>
    </label>
  );
}