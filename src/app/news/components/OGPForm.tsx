'use client';

import { useState, useCallback, useEffect } from 'react';
import { Settings } from 'lucide-react';
import NewsSettingModal, {
  type OgpVisibilitySettings,
  defaultSettings,
} from './NewsSettingModal';

export interface OGPData {
  title: string | null;
  image: string | null;
  description: string | null;
  url: string;
  siteName?: string | null;
  type?: string | null;
}

export type OgpVisibilitySettingsExport = OgpVisibilitySettings;

interface OGPFormProps {
  onPastedArticle: (data: OGPData & { customDescription?: string; visibility?: OgpVisibilitySettings }) => void;
  onSaveTyped?: (description: string) => void;
  onCancel?: () => void;
}

export default function OGPForm({
  onPastedArticle,
  onSaveTyped,
  onCancel,
}: OGPFormProps) {
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedOg, setFetchedOg] = useState<OGPData | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [visibility, setVisibility] = useState<OgpVisibilitySettings>(defaultSettings);
  const [settingsOptions, setSettingsOptions] = useState<{
    userTypes: { value: string; label: string }[];
    countries: string[];
    languages: { value: string; label: string }[];
    sports: { value: string; label: string }[];
  } | null>(null);

  useEffect(() => {
    if (showSettingsModal && !settingsOptions) {
      fetch('/api/news/ogp-settings-options')
        .then((r) => r.json())
        .then((data) => setSettingsOptions(data))
        .catch(() => setSettingsOptions({ userTypes: [], countries: [], languages: [], sports: [] }));
    }
  }, [showSettingsModal, settingsOptions]);

  const fetchOGP = useCallback(async (urlToFetch: string) => {
    if (!urlToFetch.trim()) return;
    setLoading(true);
    setError(null);
    setFetchedOg(null);
    try {
      const res = await fetch(`/api/ogp?url=${encodeURIComponent(urlToFetch.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to fetch link preview');
        return;
      }
      setFetchedOg({
        title: data.title,
        image: data.image,
        description: data.description,
        url: data.url || urlToFetch,
        siteName: data.siteName,
        type: data.type,
      });
    } catch (e) {
      setError('Failed to fetch link preview');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUrlBlur = () => {
    if (url.trim()) fetchOGP(url);
  };

  const handleSave = () => {
    if (fetchedOg) {
      onPastedArticle({
        ...fetchedOg,
        customDescription: description.trim() || undefined,
        visibility,
      });
      setUrl('');
      setDescription('');
      setFetchedOg(null);
      setError(null);
      setVisibility(defaultSettings);
    } else if (description.trim() && onSaveTyped) {
      onSaveTyped(description.trim());
      setDescription('');
    }
  };

  const handleCancel = () => {
    setUrl('');
    setDescription('');
    setFetchedOg(null);
    setError(null);
    onCancel?.();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <p className="text-xs text-gray-500 mb-4">
        Once pasted, the Open Graph protocol will show the URL with title, image, and short
        description in the list of articles (column &quot;Pasted&quot;). All other entries will
        appear in the column &quot;Typed&quot;.
      </p>

      {/* URL input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Paste here your URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={handleUrlBlur}
          placeholder="https://..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
        />
        {loading && (
          <p className="mt-1 text-sm text-gray-500">Fetching link preview...</p>
        )}
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        {fetchedOg && !error && (
          <div className="mt-2 p-4 bg-white rounded-lg border-2 border-gray-200">
            {fetchedOg.title && (
              <p className="font-bold text-gray-900 text-base mb-3">{fetchedOg.title}</p>
            )}
            <div className="flex gap-3 items-start">
              {fetchedOg.image && (
                <img
                  src={fetchedOg.image}
                  alt=""
                  className="flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 object-cover rounded border border-gray-200"
                />
              )}
              {fetchedOg.description && (
                <p className="text-sm text-gray-600 flex-1 min-w-0 line-clamp-4">
                  {fetchedOg.description}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Type here a brief description...
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 placeholder-gray-400 resize-none"
        />
      </div>

      {/* Actions: Save, Cancel, Set — centered with even spacing */}
      <div className="flex gap-6 mt-6 justify-center items-center">
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition-colors"
        >
          Save
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => setShowSettingsModal(true)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          title="News visibility and expiration settings"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <NewsSettingModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        initialSettings={visibility}
        onSave={(s) => setVisibility(s)}
        onDeleteSettings={() => setVisibility(defaultSettings)}
        options={settingsOptions}
      />
    </div>
  );
}
