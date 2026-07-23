'use client';

import { useState, useCallback, useEffect } from 'react';
import { Settings } from 'lucide-react';
import NewsSettingModal, {
  type OgpVisibilitySettings,
  defaultSettings,
} from './NewsSettingModal';
import { ALL_LANGUAGES } from '@/constants/language.constants';
import {
  MUSICAL_GENRES,
  MUSIC_REGISTRATION_TYPES,
} from '@/constants/musicGenres.constants';

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
  onPastedArticle: (
    data: OGPData & {
      customDescription?: string;
      visibility?: OgpVisibilitySettings;
      languageCode?: string | null;
      musicalGenre?: string | null;
    }
  ) => void;
  onSaveTyped?: (description: string, musicalGenre?: string | null) => void;
  onCancel?: () => void;
  /** Music modal: Artist / Title / Genre / Registration fields and “Who will see the music”. */
  variant?: 'news' | 'music';
}

export default function OGPForm({
  onPastedArticle,
  onSaveTyped,
  onCancel,
  variant = 'news',
}: OGPFormProps) {
  const isMusic = variant === 'music';
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [languageCode, setLanguageCode] = useState<string>('');
  const [artist, setArtist] = useState('');
  const [musicTitle, setMusicTitle] = useState('');
  const [musicalGenre, setMusicalGenre] = useState('');
  const [registrationType, setRegistrationType] = useState('');
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

  const resetMusicFields = () => {
    setArtist('');
    setMusicTitle('');
    setMusicalGenre('');
    setRegistrationType('');
  };

  const handleSave = () => {
    const genreToSave = isMusic && musicalGenre.trim() ? musicalGenre.trim() : null;
    if (fetchedOg) {
      onPastedArticle({
        ...fetchedOg,
        customDescription: description.trim() || undefined,
        visibility,
        languageCode: languageCode || undefined,
        musicalGenre: genreToSave,
      });
      setUrl('');
      setDescription('');
      setLanguageCode('');
      setFetchedOg(null);
      setError(null);
      setVisibility(defaultSettings);
      if (isMusic) resetMusicFields();
    } else if (description.trim() && onSaveTyped) {
      onSaveTyped(description.trim(), genreToSave);
      setDescription('');
      if (isMusic) resetMusicFields();
    }
  };

  const handleCancel = () => {
    setUrl('');
    setDescription('');
    setFetchedOg(null);
    setError(null);
    if (isMusic) resetMusicFields();
    onCancel?.();
  };

  const visibilityLabel = isMusic ? 'Who will see the music' : 'Who will see the article';

  const fieldSelectClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500';

  return (
    <div
      className={
        isMusic
          ? 'bg-white'
          : 'bg-white rounded-xl border border-gray-200 shadow-sm p-6'
      }
    >
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
                // eslint-disable-next-line @next/next/no-img-element
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

      {isMusic && (
        <>
          {/* Artist / Title — behaviour wired later */}
          <div className="mb-4 rounded-xl bg-gray-100 border border-gray-200 p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <label htmlFor="music-artist" className="w-16 shrink-0 text-sm font-medium text-gray-700">
                  Artist
                </label>
                <select
                  id="music-artist"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className={fieldSelectClass}
                  aria-label="Artist"
                >
                  <option value=""></option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="music-title" className="w-16 shrink-0 text-sm font-medium text-gray-700">
                  Title
                </label>
                <select
                  id="music-title"
                  value={musicTitle}
                  onChange={(e) => setMusicTitle(e.target.value)}
                  className={fieldSelectClass}
                  aria-label="Title"
                >
                  <option value=""></option>
                </select>
              </div>
            </div>
          </div>

          {/* Musical genre / Type of registration — behaviour wired later */}
          <div className="mb-4 rounded-xl bg-gray-100 border border-gray-200 p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <label
                  htmlFor="music-genre"
                  className="w-[7.5rem] shrink-0 text-sm font-medium text-gray-700"
                >
                  Musical genre
                </label>
                <select
                  id="music-genre"
                  value={musicalGenre}
                  onChange={(e) => setMusicalGenre(e.target.value)}
                  className={fieldSelectClass}
                  aria-label="Musical genre"
                >
                  <option value=""></option>
                  {MUSICAL_GENRES.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="music-registration-type"
                  className="w-[7.5rem] shrink-0 text-sm font-medium text-gray-700"
                >
                  Type of registration
                </label>
                <select
                  id="music-registration-type"
                  value={registrationType}
                  onChange={(e) => setRegistrationType(e.target.value)}
                  className={fieldSelectClass}
                  aria-label="Type of registration"
                >
                  <option value="">Song - Album - Playlist</option>
                  {MUSIC_REGISTRATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Description */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Type here a brief description...
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description..."
          rows={6}
          className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 placeholder-gray-400 resize-y"
        />
      </div>

      {/* Language + Visibility */}
      <div className="mb-6 rounded-xl bg-gray-50 border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Language used</label>
            <select
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value)}
              className="w-full min-w-[160px] max-w-sm px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-shadow"
              aria-label="Language used in the article"
            >
              <option value="">Select language</option>
              {ALL_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
          </div>
          <div className="shrink-0 pt-0.5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:sr-only">Visibility</label>
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors font-medium text-sm"
              title={visibilityLabel}
              aria-label={visibilityLabel}
            >
              <Settings className="w-5 h-5 text-gray-500" />
              <span>{visibilityLabel}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Actions: Save, Cancel */}
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
