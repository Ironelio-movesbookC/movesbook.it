'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import Image from 'next/image';
import { Lightbulb, Trash2, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import RichTextEditor from '@/components/settings/RichTextEditor';
import {
  ALL_LANGUAGES,
  getFlagImageSrc,
} from '@/constants/language.constants';
import {
  fetchLongTextTranslations,
  hasRichTextContent,
  plainTextToRichHtml,
  richTextToPlainText,
} from '@/utils/richTextTranslation';
import { langIdFromCode } from '@/lib/messages/versionHistoryLang';
import { getAdminBearerToken } from '@/lib/admin/clientAdminAuth';

function getAdminAuthHeaders(includeJsonContentType = true): HeadersInit {
  const headers: Record<string, string> = {};
  if (includeJsonContentType) headers['Content-Type'] = 'application/json';
  const token = getAdminBearerToken() || localStorage.getItem('token');
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function getAdminUsernameHint(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('adminUser');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      username?: string;
      email?: string;
      name?: string;
    };
    return parsed.username || parsed.email || null;
  } catch {
    return null;
  }
}

export type VersionHistoryPanelHandle = {
  promptUnlock: () => void;
};

type Article = {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  langId: string;
  languageCode: string;
  languageName: string;
  createdAt: string;
  articleGroup: string | null;
};

type LangOption = { id: string; name: string; code: string };

type Props = {
  currentLanguage: string;
};

function toEditorHtml(text: string): string {
  if (!text?.trim()) return '';
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return plainTextToRichHtml(text);
}

const VersionHistoryPanel = forwardRef<VersionHistoryPanelHandle, Props>(function VersionHistoryPanel(
  { currentLanguage },
  ref,
) {
  const { t } = useLanguage();
  const [articles, setArticles] = useState<Article[]>([]);
  const [languages, setLanguages] = useState<LangOption[]>([]);
  const [filterLangId, setFilterLangId] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [editUnlocked, setEditUnlocked] = useState(false);
  const [passwordModal, setPasswordModal] = useState<'unlock' | 'delete' | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  /** After unlock: open Post new editor or continue editing an article. */
  const [pendingUnlockAction, setPendingUnlockAction] = useState<'post' | 'edit' | null>(null);
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [sourceLangCode, setSourceLangCode] = useState('en');
  const [articleGroup, setArticleGroup] = useState<string | null>(null);
  const [editArticleId, setEditArticleId] = useState<string | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>(() =>
    Object.fromEntries(ALL_LANGUAGES.map((l) => [l.code, ''])),
  );
  const [bodies, setBodies] = useState<Record<string, string>>(() =>
    Object.fromEntries(ALL_LANGUAGES.map((l) => [l.code, ''])),
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationRevision, setTranslationRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [verifiedPassword, setVerifiedPassword] = useState('');

  const sourceMeta = ALL_LANGUAGES.find((l) => l.code === sourceLangCode) ?? ALL_LANGUAGES[0];

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(searchQ), 350);
    return () => window.clearTimeout(t);
  }, [searchQ]);

  const loadArticles = useCallback(async (overrideLangId?: string | null) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      const effectiveLangId =
        overrideLangId !== undefined ? overrideLangId ?? '' : filterLangId;
      if (effectiveLangId) qs.set('langId', effectiveLangId);
      if (debouncedQ.trim()) qs.set('q', debouncedQ.trim());
      qs.set('lang', currentLanguage);
      const res = await fetch(`/api/messages/version-history?${qs}`, {
        headers: getAdminAuthHeaders(false),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('load_failed');
      const data = await res.json();
      setArticles(data.articles || []);
      setLanguages(data.languages || []);
      if (!filterLangId && !overrideLangId && data.languages?.length) {
        const defaultId = langIdFromCode(currentLanguage);
        const has = data.languages.some((l: LangOption) => l.id === defaultId);
        if (has) setFilterLangId(defaultId);
      }
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [currentLanguage, debouncedQ, filterLangId]);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  const verifyPassword = useCallback(async (password: string): Promise<boolean> => {
    const username = getAdminUsernameHint();
    const res = await fetch('/api/admin/super-admin/verify', {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify({ password, ...(username ? { username } : {}) }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.valid || data.success);
  }, []);

  const openPasswordModal = useCallback((mode: 'unlock' | 'delete', deleteId?: string) => {
    setPasswordModal(mode);
    setPasswordInput('');
    setPasswordError(null);
    if (deleteId) setPendingDeleteId(deleteId);
  }, []);

  useImperativeHandle(ref, () => ({
    promptUnlock: () => {
      setPendingUnlockAction(null);
      setPendingEditId(null);
      openPasswordModal('unlock');
    },
  }));

  const resetEditor = useCallback((langCode?: string) => {
    const code = langCode ?? sourceLangCode;
    setSourceLangCode(code);
    setArticleGroup(null);
    setEditArticleId(null);
    setTitles(Object.fromEntries(ALL_LANGUAGES.map((l) => [l.code, ''])));
    setBodies(Object.fromEntries(ALL_LANGUAGES.map((l) => [l.code, ''])));
    setSaveError(null);
  }, [sourceLangCode]);

  const loadArticleIntoEditor = useCallback(async (id: string) => {
    setLoading(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/messages/version-history?id=${encodeURIComponent(id)}`, {
        headers: getAdminAuthHeaders(false),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('load_article');
      const data = await res.json();
      setArticleGroup(data.articleGroup ?? null);
      setEditArticleId(data.id);
      setSourceLangCode(data.languageCode || 'en');
      const nextTitles: Record<string, string> = Object.fromEntries(
        ALL_LANGUAGES.map((l) => [l.code, '']),
      );
      const nextBodies: Record<string, string> = Object.fromEntries(
        ALL_LANGUAGES.map((l) => [l.code, '']),
      );
      for (const [code, val] of Object.entries(data.translations || {})) {
        const row = val as { title?: string; content?: string };
        nextTitles[code] = row.title ?? '';
        nextBodies[code] = toEditorHtml(row.content ?? '');
      }
      setTitles(nextTitles);
      setBodies(nextBodies);
      setTranslationRevision((r) => r + 1);
      setEditorOpen(true);
    } catch {
      setSaveError(t('version_history_load_article_failed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handlePasswordSubmit = async () => {
    setPasswordError(null);
    const ok = await verifyPassword(passwordInput);
    if (!ok) {
      setPasswordError(t('version_history_password_invalid'));
      return;
    }
    setVerifiedPassword(passwordInput);
    if (passwordModal === 'unlock') {
      setEditUnlocked(true);
      setPasswordModal(null);
      const action = pendingUnlockAction;
      const editId = pendingEditId;
      setPendingUnlockAction(null);
      setPendingEditId(null);
      if (action === 'post') {
        resetEditor(sourceLangCode);
        setEditorOpen(true);
      } else if (action === 'edit' && editId) {
        await loadArticleIntoEditor(editId);
      }
      return;
    }
    if (passwordModal === 'delete' && pendingDeleteId) {
      const res = await fetch(`/api/messages/version-history/${pendingDeleteId}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({ password: passwordInput }),
      });
      if (!res.ok) {
        setPasswordError(t('version_history_delete_failed'));
        return;
      }
      setPendingDeleteId(null);
      setPasswordModal(null);
      await loadArticles();
    }
  };

  const handlePostNew = () => {
    if (!editUnlocked) {
      setPendingUnlockAction('post');
      setPendingEditId(null);
      openPasswordModal('unlock');
      return;
    }
    resetEditor(sourceLangCode);
    setEditorOpen(true);
  };

  const openEdit = async (id: string) => {
    if (!editUnlocked) {
      setPendingUnlockAction('edit');
      setPendingEditId(id);
      openPasswordModal('unlock');
      return;
    }
    await loadArticleIntoEditor(id);
  };

  const handleTranslate = async () => {
    const titleSource = titles[sourceLangCode]?.trim() ?? '';
    const bodyHtml = bodies[sourceLangCode] ?? '';
    const bodyPlain = richTextToPlainText(bodyHtml);
    if (!titleSource && !bodyPlain.trim()) {
      setSaveError(t('version_history_enter_source'));
      return;
    }
    setIsTranslating(true);
    setSaveError(null);
    try {
      const targets = ALL_LANGUAGES.filter((l) => l.code !== sourceLangCode).map((l) => l.code);
      const failed = new Set<string>();

      // Titles first so other-language title fields fill even if body translation is slow/fails.
      if (titleSource) {
        const { translations: trans, failedLanguages } = await fetchLongTextTranslations(
          titleSource,
          targets,
        );
        failedLanguages.forEach((code) => failed.add(code));
        setTitles((prev) => {
          const next = { ...prev, [sourceLangCode]: titleSource };
          for (const code of targets) {
            const translated = trans[code]?.trim();
            if (translated) next[code] = translated;
          }
          return next;
        });
      }

      if (bodyPlain.trim()) {
        const { translations: trans, failedLanguages } = await fetchLongTextTranslations(
          bodyPlain,
          targets,
        );
        failedLanguages.forEach((code) => failed.add(code));
        setBodies((prev) => {
          const next = { ...prev };
          for (const code of targets) {
            if (trans[code]?.trim()) next[code] = plainTextToRichHtml(trans[code]);
          }
          return next;
        });
        setTranslationRevision((r) => r + 1);
      } else if (titleSource) {
        setTranslationRevision((r) => r + 1);
      }

      if (failed.size > 0) {
        setSaveError(
          `${t('version_history_translate_failed')} (${[...failed].join(', ')})`,
        );
      }
    } catch {
      setSaveError(t('version_history_translate_failed'));
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = async () => {
    const password = verifiedPassword;
    if (!password) {
      openPasswordModal('unlock');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const translations = Object.fromEntries(
        ALL_LANGUAGES.map((l) => [
          l.code,
          { title: titles[l.code] || '', content: bodies[l.code] || '' },
        ]),
      );
      const res = await fetch('/api/messages/version-history', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({
          password,
          sourceLangCode,
          articleGroup,
          editArticleId,
          translations,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg =
          typeof err.hint === 'string'
            ? err.hint
            : err.error === 'invalid_password'
              ? t('version_history_password_invalid')
              : t('version_history_save_failed');
        throw new Error(msg);
      }
      const data = await res.json();
      const savedLangId = langIdFromCode(sourceLangCode);
      setArticleGroup(data.articleGroup ?? articleGroup);
      setEditorOpen(false);
      resetEditor();
      setFilterLangId(savedLangId);
      await loadArticles(savedLangId);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t('version_history_save_failed'));
    } finally {
      setSaving(false);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filterOptions = useMemo(() => {
    if (languages.length >= ALL_LANGUAGES.length) return languages;
    // Prefer full catalog with display names when API returns a partial/legacy list
    return ALL_LANGUAGES.map((l) => ({ id: l.id, name: l.name, code: l.code }));
  }, [languages]);

  const fieldClass =
    'w-full border border-slate-300 rounded px-2 py-2 text-sm bg-white !text-black placeholder:!text-slate-600';

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-slate-50">
      <div className="px-4 py-3 border-b border-slate-200 bg-white shrink-0 flex flex-wrap gap-2 items-center">
        <label className="text-xs font-medium text-slate-700 shrink-0">{t('version_history_search')}</label>
        <input
          type="search"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder={t('version_history_search_placeholder')}
          className={`${fieldClass} flex-1 min-w-[140px] max-w-md`}
        />
        <label className="text-xs font-medium text-slate-700 shrink-0">{t('version_history_language')}</label>
        <select
          value={filterLangId}
          onChange={(e) => setFilterLangId(e.target.value)}
          className={`${fieldClass} max-w-[180px]`}
        >
          <option value="">{t('staff_all_languages')}</option>
          {filterOptions.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handlePostNew}
          className="ml-auto shrink-0 text-xs flex items-center gap-1 text-amber-800 font-semibold border border-amber-300 rounded px-2 py-1.5 bg-amber-50 hover:bg-amber-100"
        >
          <Lightbulb className="w-4 h-4" />
          {t('staff_post_new')}
        </button>
      </div>

      {editUnlocked && (
        <div className="px-4 py-1 text-xs text-emerald-800 bg-emerald-50 border-b border-emerald-100 shrink-0">
          {t('version_history_edit_unlocked')}
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden flex-col lg:flex-row">
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${editorOpen ? 'lg:max-w-[50%]' : ''}`}>
          {loading ? (
            <p className="text-slate-500 text-sm">{t('messages_panel_loading')}</p>
          ) : articles.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">{t('version_history_empty')}</p>
          ) : (
            articles.map((article) => {
              const expanded = expandedIds.has(article.id);
              const plainBody = richTextToPlainText(article.content);
              const lineCount = plainBody.split('\n').filter((l) => l.trim()).length;
              const needsMore = lineCount > 5 || plainBody.length > 320;
              const displayText = expanded ? plainBody : article.excerpt || plainBody;
              return (
                <article
                  key={article.id}
                  className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 text-sm">{article.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(article.createdAt).toLocaleString()} · {article.languageName}
                      </div>
                    </div>
                    {editUnlocked && (
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => void openEdit(article.id)}
                          className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50"
                        >
                          {t('version_history_edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => openPasswordModal('delete', article.id)}
                          className="p-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50"
                          aria-label={t('version_history_delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div
                    className={`text-sm text-slate-700 whitespace-pre-wrap break-words ${
                      expanded ? 'max-h-[30rem] overflow-y-auto pr-1' : 'line-clamp-5'
                    }`}
                  >
                    {displayText}
                  </div>
                  {needsMore ? (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(article.id)}
                      className="mt-2 text-xs font-semibold text-[#9b1d3d]"
                    >
                      {expanded ? t('version_history_show_less') : t('version_history_show_more')}
                    </button>
                  ) : null}
                </article>
              );
            })
          )}
        </div>

        {editorOpen && editUnlocked && (
          <div className="flex-1 min-h-0 overflow-y-auto border-t lg:border-t-0 lg:border-l border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">{t('version_history_editor_title')}</h3>
              <button
                type="button"
                onClick={() => {
                  setEditorOpen(false);
                  resetEditor();
                }}
                className="p-1 rounded hover:bg-slate-100"
                aria-label={t('messages_panel_close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t('version_history_source_language')}
              </label>
              <select
                value={sourceLangCode}
                onChange={(e) => setSourceLangCode(e.target.value)}
                className={fieldClass}
              >
                {ALL_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded overflow-hidden relative">
                  <Image
                    src={getFlagImageSrc(sourceMeta.code)}
                    alt=""
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="font-bold text-slate-900">{sourceMeta.name} ({t('version_history_source')})</div>
                  <p className="text-xs text-slate-600">{t('version_history_source_hint')}</p>
                </div>
              </div>
              <label className="block text-xs font-medium text-slate-700 mb-1">{t('version_history_title')}</label>
              <input
                type="text"
                value={titles[sourceLangCode] || ''}
                onChange={(e) =>
                  setTitles((prev) => ({ ...prev, [sourceLangCode]: e.target.value }))
                }
                className={`${fieldClass} mb-3`}
              />
              <RichTextEditor
                value={bodies[sourceLangCode] || ''}
                onChange={(v) => setBodies((prev) => ({ ...prev, [sourceLangCode]: v }))}
                minHeight="160px"
                language={sourceMeta.name}
                revision={translationRevision}
              />
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => void handleTranslate()}
                  disabled={
                    isTranslating ||
                    (!titles[sourceLangCode]?.trim() && !hasRichTextContent(bodies[sourceLangCode] || ''))
                  }
                  className="px-4 py-2 text-sm font-semibold border border-slate-300 rounded bg-white disabled:opacity-50"
                >
                  {isTranslating ? t('version_history_translating') : t('version_history_translate')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold rounded bg-[#c43c54] text-white disabled:opacity-50"
                >
                  {saving ? t('messages_panel_loading') : t('version_history_save')}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase text-slate-600">{t('version_history_other_languages')}</h4>
              {ALL_LANGUAGES.filter((l) => l.code !== sourceLangCode).map((lang) => (
                <div key={lang.code} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-3 py-2 flex items-center gap-2 text-sm font-semibold">
                    <div className="w-6 h-6 rounded overflow-hidden relative">
                      <Image src={getFlagImageSrc(lang.code)} alt="" fill sizes="24px" className="object-cover" />
                    </div>
                    {lang.name}
                  </div>
                  <div className="p-3 space-y-2">
                    <input
                      type="text"
                      value={titles[lang.code] || ''}
                      onChange={(e) => setTitles((prev) => ({ ...prev, [lang.code]: e.target.value }))}
                      placeholder={t('version_history_title')}
                      className={fieldClass}
                    />
                    <RichTextEditor
                      value={bodies[lang.code] || ''}
                      onChange={(v) => setBodies((prev) => ({ ...prev, [lang.code]: v }))}
                      minHeight="120px"
                      language={lang.name}
                      revision={translationRevision}
                    />
                  </div>
                </div>
              ))}
            </div>
            {saveError && <p className="mt-3 text-sm text-red-600">{saveError}</p>}
          </div>
        )}
      </div>

      {passwordModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <h3 className="font-semibold text-slate-900 mb-2">{t('version_history_password_title')}</h3>
            <p className="text-sm text-slate-600 mb-3">{t('version_history_password_hint')}</p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handlePasswordSubmit();
              }}
              className={fieldClass}
              autoFocus
            />
            {passwordError && <p className="text-sm text-red-600 mt-2">{passwordError}</p>}
            <div className="flex gap-2 mt-4 justify-end">
              <button
                type="button"
                onClick={() => {
                  setPasswordModal(null);
                  setPendingDeleteId(null);
                  setPendingUnlockAction(null);
                  setPendingEditId(null);
                }}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded"
              >
                {t('version_history_cancel')}
              </button>
              <button
                type="button"
                onClick={() => void handlePasswordSubmit()}
                className="px-3 py-1.5 text-sm rounded bg-[#c43c54] text-white font-semibold"
              >
                {t('version_history_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default VersionHistoryPanel;
