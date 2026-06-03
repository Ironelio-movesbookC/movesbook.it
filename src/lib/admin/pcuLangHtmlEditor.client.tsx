'use client';

import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import { flushSync } from 'react-dom';

/** Keep per-language HTML in React state when switching tabs (no server save until explicit Save). */
export function useLangHtmlEditor<T extends string>(
  activeLang: T,
  setActiveLang: (lang: T) => void,
  htmlByLang: Record<string, string>,
  setHtmlByLang: Dispatch<SetStateAction<Record<string, string>>>,
) {
  const getDataRef = useRef<(() => string) | null>(null);
  const activeLangRef = useRef(activeLang);
  activeLangRef.current = activeLang;

  const registerGetData = useCallback((getData: () => string) => {
    getDataRef.current = getData;
  }, []);

  const flushActiveLangToState = useCallback(
    (lang: T) => {
      if (!getDataRef.current) return;
      const html = getDataRef.current();
      flushSync(() => {
        setHtmlByLang((prev) => ({ ...prev, [lang]: html }));
      });
    },
    [setHtmlByLang],
  );

  const switchLang = useCallback(
    (next: T) => {
      if (next === activeLang) return;
      flushActiveLangToState(activeLang);
      setActiveLang(next);
    },
    [activeLang, flushActiveLangToState, setActiveLang],
  );

  const onEditorChange = useCallback(
    (html: string) => {
      setHtmlByLang((prev) => ({ ...prev, [activeLangRef.current]: html }));
    },
    [setHtmlByLang],
  );

  /** Merge in-memory per-language HTML with the active editor document (for explicit Save). */
  const getHtmlByLangForSave = useCallback((): Record<string, string> => {
    const lang = activeLangRef.current;
    const html = getDataRef.current?.() ?? htmlByLang[lang] ?? '';
    return { ...htmlByLang, [lang]: html };
  }, [htmlByLang]);

  return {
    activeLang,
    switchLang,
    registerGetData,
    onEditorChange,
    editorValue: htmlByLang[activeLang] ?? '',
    localeKey: activeLang,
    flushActiveLang: () => flushActiveLangToState(activeLang),
    getHtmlByLangForSave,
  };
}

/** Flush several CKEditor instances that share one language selector. */
export function flushSharedLangEditors(
  activeLang: string,
  entries: Array<{
    getData: (() => string) | null | undefined;
    setHtmlByLang: Dispatch<SetStateAction<Record<string, string>>>;
  }>,
) {
  flushSync(() => {
    for (const { getData, setHtmlByLang } of entries) {
      if (!getData) continue;
      const html = getData();
      setHtmlByLang((prev) => ({ ...prev, [activeLang]: html }));
    }
  });
}
