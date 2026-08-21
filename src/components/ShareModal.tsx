'use client';

import React from "react";
import { 
  X, 
  Link as LinkIcon, 
  Send, 
  Facebook, 
  MessageCircle, 
  PenSquare 
} from "lucide-react";

type ShareModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function ShareModal({ open, onClose }: ShareModalProps) {
  if (!open) return null;

  const shareUrl =
    typeof window !== "undefined" ? window.location.href : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard!");
    } catch (err) {
      alert("Failed to copy link");
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white w-[90%] max-w-md p-6 rounded-xl shadow-xl relative">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-black transition"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <h2 className="text-lg font-semibold mb-5">
          Share this page
        </h2>

        {/* Social Share */}
        <div className="grid grid-cols-3 gap-3 mb-5">

          {/* WhatsApp */}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center border rounded-lg py-3 hover:bg-gray-100 transition text-gray-700"
          >
            <MessageCircle size={22} className="text-green-500" />
            <span className="text-sm mt-1">WhatsApp</span>
          </a>

          {/* Telegram */}
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center border rounded-lg py-3 hover:bg-gray-100 transition text-gray-700"
          >
            <Send size={22} className="text-blue-500" />
            <span className="text-sm mt-1">Telegram</span>
          </a>

          {/* Facebook */}
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center border rounded-lg py-3 hover:bg-gray-100 transition text-gray-700"
          >
            <Facebook size={22} className="text-blue-600" />
            <span className="text-sm mt-1">Facebook</span>
          </a>

        </div>

        {/* Get Link */}
        <button
          onClick={handleCopy}
          className="w-full flex items-center gap-2 border rounded-lg px-3 py-2 mb-3 hover:bg-gray-100 transition text-gray-700"
        >
          <LinkIcon size={16} />
          <span>Get link</span>
        </button>

        {/* Post Button */}
        <button
          className="w-full flex items-center gap-2 border rounded-lg px-3 py-2 hover:bg-gray-100 transition text-gray-700"
        >
          <PenSquare size={16} />
          <span>Post on Movesbook</span>
        </button>

      </div>
    </div>
  );
}