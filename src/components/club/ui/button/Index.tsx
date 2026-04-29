import React from "react";

interface BasicButtonProps {
  onClick?: () => void;
  label?: string;
  className?: string;
}

interface IconButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  label?: string;
  className?: string;
}

export function BasicButton({
  onClick,
  label,
  className = "",
}: BasicButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex items-center justify-center 
      w-10 h-10 rounded-full 
      bg-gray-100 hover:bg-gray-200 
      transition shadow-sm ${className}`}
    >
    </button>
  );
}

export function IconButton({
  icon,
  onClick,
  label,
  className = "",
}: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex items-center gap-2 justify-center
      px-3 h-10 rounded-full 
      transition shadow-sm ${className}`}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}

