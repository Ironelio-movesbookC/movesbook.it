'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import type { MyDeskNode } from '@/components/desk/MyDeskSettingsTree';
import FontAwesomeIconPicker from '@/components/desk/FontAwesomeIconPicker';

type ApiMyDeskNode = {
  id: string;
  title: string;
  path: string | null;
  faIconClass: string | null;
  bgColor: string | null;
  titleColor: string | null;
  displayMode: string | null;
  visible: boolean;
  children?: ApiMyDeskNode[];
};

function flattenForSectionSelect(
  nodes: MyDeskNode[],
  depth = 0
): { id: string; label: string }[] {
  const rows: { id: string; label: string }[] = [];
  const pad = depth > 0 ? `${'\u2014'.repeat(depth)} ` : '';
  for (const n of nodes) {
    rows.push({ id: n.id, label: `${pad}${n.label}` });
    if (n.children?.length) {
      rows.push(...flattenForSectionSelect(n.children, depth + 1));
    }
  }
  return rows;
}

export default function AddNewMyDeskForm({
  sectionTree = []
}: {
  sectionTree?: MyDeskNode[];
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [dbSectionTree, setDbSectionTree] = useState<MyDeskNode[]>(sectionTree);
  const sectionOptions = useMemo(() => flattenForSectionSelect(dbSectionTree), [dbSectionTree]);

  const [icon, setIcon] = useState('fas fa-address-book');
  const [bgColor, setBgColor] = useState('#22c55e');
  const [titleColor, setTitleColor] = useState('#171717');
  const [title, setTitle] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [path, setPath] = useState('');
  const [displayMode, setDisplayMode] = useState<'new_label' | 'central_page'>('new_label');

  useEffect(() => {
    const fetchSections = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;
      const response = await fetch('/api/my-desk', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      if (!response.ok) return;
      const data = (await response.json()) as { items?: ApiMyDeskNode[] };
      const mapNode = (node: ApiMyDeskNode): MyDeskNode => ({
        id: node.id,
        label: node.title,
        faIconClass: node.faIconClass ?? undefined,
        bgColor: node.bgColor ?? undefined,
        titleColor: node.titleColor ?? undefined,
        path: node.path ?? undefined,
        displayMode:
          node.displayMode === 'new_label' || node.displayMode === 'central_page'
            ? node.displayMode
            : undefined,
        visible: node.visible,
        children: (node.children ?? []).map(mapNode)
      });
      setDbSectionTree((data.items ?? []).map(mapNode));
    };
    void fetchSections();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    const titleText = title.trim() || path.trim() || t('desk_new_item_label');
    const response = await fetch('/api/my-desk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        parentId: sectionId || null,
        title: titleText,
        path: path.trim() || null,
        faIconClass: icon || null,
        bgColor: bgColor || null,
        titleColor: titleColor || null,
        displayMode
      })
    });
    if (!response.ok) {
      throw new Error('Failed to create path');
    }
    router.push('/users/my_desk');
  };

  return (
    <div className="mx-auto w-full max-w-xl rounded border border-zinc-300 bg-white shadow-sm">
      <div className="border-b border-zinc-200 bg-amber-100 px-4 py-3 text-sm font-bold text-amber-950">
        {t('add_new_mydesk_title')}
      </div>
      <form onSubmit={submit} className="space-y-4 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700">{t('add_new_mydesk_icon')}</label>
          <FontAwesomeIconPicker value={icon} onChange={setIcon} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              {t('add_new_mydesk_bg_color')}
            </label>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="h-10 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0.5"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              {t('add_new_mydesk_title_color')}
            </label>
            <input
              type="color"
              value={titleColor}
              onChange={(e) => setTitleColor(e.target.value)}
              className="h-10 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0.5"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700">{t('add_new_mydesk_title_field')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border border-zinc-300 px-2 py-2 text-sm text-zinc-900"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700">{t('add_new_mydesk_section')}</label>
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="w-full rounded border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900"
          >
            <option value="">{t('add_new_mydesk_section_placeholder')}</option>
            {sectionOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700">{t('add_new_mydesk_path')}</label>
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className="w-full rounded border border-zinc-300 px-2 py-2 text-sm text-zinc-900"
            placeholder="/example/path"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700">
            {t('add_new_mydesk_display_mode')}
          </label>
          <select
            value={displayMode}
            onChange={(e) => setDisplayMode(e.target.value as 'new_label' | 'central_page')}
            className="w-full rounded border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900"
          >
            <option value="new_label">{t('display_mode_new_label')}</option>
            <option value="central_page">{t('display_mode_central_page')}</option>
          </select>
        </div>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            {t('add_new_mydesk_submit')}
          </button>
          <button
            type="button"
            onClick={() => router.push('/users/my_desk')}
            className="rounded bg-zinc-800 px-6 py-2 text-sm font-semibold text-white hover:bg-zinc-900"
          >
            {t('add_new_mydesk_cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
