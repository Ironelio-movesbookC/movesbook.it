'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type ChatTheme = {
  textColor: string;
  backgroundType: 'color' | 'image';
  backgroundColor: string;
  backgroundImage: string | null;
  watermark: string | null;
};

const STORAGE_KEY = 'chat-appearance';

const FILL_COLORS: { value: string; label: string }[] = [
  { value: '#ffffff', label: 'White' },
  { value: '#ffffe0', label: 'Pale yellow' },
  { value: '#add8e6', label: 'Light blue' },
  { value: '#d3d3d3', label: 'Light grey' },
  { value: '#e4d96f', label: 'Straw yellow' },
  { value: '#e6e6fa', label: 'Light violet' },
  { value: '#ee82ee', label: 'Violet' },
  { value: '#7393b3', label: 'Blue grey' },
];

const WATERMARKS = [
  { value: '', label: 'None' },
  { value: '/background-theme/Bio_watermark_1.png', label: 'Movesbook 3D' },
  { value: '/background-theme/Bio_watermark_2.png', label: 'Movesbook 2D' },
  { value: '/background-theme/Bio_watermark_3.png', label: 'Movesbook title' },
  { value: '/background-theme/Bio_watermark_4.png', label: 'ID logo' },
];

const BACKGROUND_IMAGES = [
  '/background-theme/Sfondo_filigranato_1a.png',
  '/background-theme/Sfondo_filigranato_1a_200.png',
  '/background-theme/Sfondo_filigranato_1b.png',
  '/background-theme/Sfondo_filigranato_1b_200.png',
  '/background-theme/Sfondo_filigranato_1c.png',
  '/background-theme/Sfondo_filigranato_1c_200.png',
  '/background-theme/Sfondo_filigranato_1d.png',
  '/background-theme/Sfondo_filigranato_1d_200.png',
  '/background-theme/Sfondo_filigranato_1e.png',
  '/background-theme/Sfondo_filigranato_1e_200.png',
];

const defaultTheme: ChatTheme = {
  textColor: '#111827',
  backgroundType: 'color',
  backgroundColor: '#ffffff',
  backgroundImage: null,
  watermark: null,
};

export function loadChatTheme(): ChatTheme {
  if (typeof window === 'undefined') return defaultTheme;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultTheme;
    const parsed = JSON.parse(raw) as Partial<ChatTheme>;
    // Text color setting removed from UI: always use default text color
    return { ...defaultTheme, ...parsed, textColor: defaultTheme.textColor };
  } catch {
    return defaultTheme;
  }
}

export function saveChatTheme(theme: ChatTheme): void {
  if (typeof window === 'undefined') return;
  try {
    // Text color setting removed from UI: always persist default text color
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...theme, textColor: defaultTheme.textColor })
    );
  } catch {}
}

type ChatSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  initialTheme: ChatTheme;
  onSave: (theme: ChatTheme) => void;
};

export default function ChatSettingsModal({
  open,
  onClose,
  initialTheme,
  onSave,
}: ChatSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'textures' | 'image'>('textures');
  const [theme, setTheme] = useState<ChatTheme>(initialTheme);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setTheme(initialTheme);
      const idx = initialTheme.backgroundImage
        ? BACKGROUND_IMAGES.indexOf(initialTheme.backgroundImage)
        : 0;
      setImageIndex(idx >= 0 ? idx : 0);
    }
  }, [open, initialTheme]);

  if (!open) return null;

  const handleOk = () => {
    onSave(theme);
    onClose();
  };

  const currentBgImage = theme.backgroundType === 'image' && theme.backgroundImage
    ? theme.backgroundImage
    : BACKGROUND_IMAGES[imageIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('textures')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'textures'
                ? 'bg-gray-200 text-gray-900 border-b-2 border-gray-800'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Textures Background
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'image'
                ? 'bg-gray-200 text-gray-900 border-b-2 border-gray-800'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Background Image
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {activeTab === 'textures' && (
            <>
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Fill background</h3>
                <div className="grid grid-cols-4 gap-2">
                  {FILL_COLORS.map(({ value, label }) => (
                    <label
                      key={value}
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${
                        theme.backgroundType === 'color' && theme.backgroundColor === value
                          ? 'border-blue-600 ring-1 ring-blue-600'
                          : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="fill"
                        checked={theme.backgroundType === 'color' && theme.backgroundColor === value}
                        onChange={() =>
                          setTheme((t) => ({
                            ...t,
                            backgroundType: 'color',
                            backgroundColor: value,
                            backgroundImage: null,
                          }))
                        }
                        className="sr-only"
                      />
                      <span
                        className="w-6 h-6 rounded border border-gray-300 flex-shrink-0"
                        style={{ backgroundColor: value }}
                      />
                      <span className="text-xs text-gray-700 truncate">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Water marks</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {WATERMARKS.map(({ value, label }) => (
                    <label
                      key={value || 'none'}
                      className={`flex flex-col items-center gap-1 p-2 rounded border cursor-pointer ${
                        theme.watermark === value ? 'border-blue-600 ring-1 ring-blue-600' : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="watermark"
                        checked={theme.watermark === value}
                        onChange={() => setTheme((t) => ({ ...t, watermark: value || null }))}
                        className="sr-only"
                      />
                      {value ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={value}
                          alt={label}
                          className="w-12 h-12 object-contain bg-gray-50 rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                          None
                        </div>
                      )}
                      <span className="text-xs text-gray-700 text-center">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'image' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Background Image</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImageIndex((i) => (i - 1 + BACKGROUND_IMAGES.length) % BACKGROUND_IMAGES.length)}
                  className="p-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-h-[200px] bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={BACKGROUND_IMAGES[imageIndex]}
                    alt="Background preview"
                    className="max-w-full max-h-[200px] object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setImageIndex((i) => (i + 1) % BACKGROUND_IMAGES.length)}
                  className="p-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Image {imageIndex + 1} of {BACKGROUND_IMAGES.length}. Click OK to apply.
              </p>
              <button
                type="button"
                onClick={() =>
                  setTheme((t) => ({
                    ...t,
                    backgroundType: 'image',
                    backgroundImage: BACKGROUND_IMAGES[imageIndex],
                    backgroundColor: defaultTheme.backgroundColor,
                  }))
                }
                className="mt-2 w-full py-2 bg-gray-800 text-white text-sm font-medium rounded hover:bg-gray-700"
              >
                Use this image as background
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleOk}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
