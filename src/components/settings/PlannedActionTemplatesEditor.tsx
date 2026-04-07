'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type Template = {
  id: string;
  name: string;
  color: string;
  icon: string;
  displayOrder: number;
  nameByLanguage: string | null;
  descriptionByLanguage: string | null;
};

const LANGS = ['en', 'it', 'de', 'fr', 'es'];

function authHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function parseJson(s: string | null): Record<string, string> {
  if (!s) return {};
  try {
    const o = JSON.parse(s);
    return typeof o === 'object' && o ? o : {};
  } catch {
    return {};
  }
}

export default function PlannedActionTemplatesEditor() {
  const { currentLanguage } = useLanguage();
  const [list, setList] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📌');
  const [color, setColor] = useState('#6366f1');
  const [namesByLang, setNamesByLang] = useState<Record<string, string>>({});
  const [descByLang, setDescByLang] = useState<Record<string, string>>({});
  const [activeLang, setActiveLang] = useState(currentLanguage || 'en');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workouts/planned-action-templates', {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok) setList(data.templates || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setName('');
    setIcon('📌');
    setColor('#6366f1');
    setNamesByLang({});
    setDescByLang({});
    setActiveLang(currentLanguage || 'en');
    setShowForm(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setName(t.name);
    setIcon(t.icon);
    setColor(t.color);
    setNamesByLang(parseJson(t.nameByLanguage));
    setDescByLang(parseJson(t.descriptionByLanguage));
    setActiveLang(currentLanguage || 'en');
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const nameByLanguage = { ...namesByLang, [activeLang]: name };
    const body = {
      name: name.trim(),
      nameByLanguage,
      descriptionByLanguage: descByLang,
      color,
      icon,
      displayOrder: editing?.displayOrder ?? list.length,
    };
    try {
      if (editing) {
        const res = await fetch(
          `/api/workouts/planned-action-templates/${editing.id}`,
          {
            method: 'PATCH',
            headers: { ...authHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        );
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || 'Save failed');
          return;
        }
      } else {
        const res = await fetch('/api/workouts/planned-action-templates', {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || 'Save failed');
          return;
        }
      }
      setShowForm(false);
      await load();
    } catch {
      alert('Request failed');
    }
  };

  const remove = async (t: Template) => {
    if (!confirm(`Delete “${t.name}”?`)) return;
    const res = await fetch(`/api/workouts/planned-action-templates/${t.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Delete failed');
      return;
    }
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Define action types (color, icon, descriptions per language) used when inserting
          actions on yearly / done plan days.
        </p>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add action type
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <ul className="space-y-2">
          {list.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl shrink-0">{t.icon}</span>
                <span
                  className="w-4 h-4 rounded-full border border-gray-300 shrink-0"
                  style={{ backgroundColor: t.color }}
                />
                <span className="font-medium text-gray-900 dark:text-white truncate">
                  {t.name}
                </span>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(t)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(t)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={save}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-gray-200 dark:border-gray-600"
          >
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
              {editing ? 'Edit action type' : 'New action type'}
            </h3>
            <div className="flex gap-2 flex-wrap">
              {LANGS.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setActiveLang(code)}
                  className={`px-2 py-1 text-xs rounded border ${
                    activeLang === code
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Name ({activeLang})
              </label>
              <input
                value={name}
                onChange={(e) => {
                  const v = e.target.value;
                  setName(v);
                  setNamesByLang((prev) => ({ ...prev, [activeLang]: v }));
                }}
                className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Description ({activeLang})
              </label>
              <textarea
                value={descByLang[activeLang] || ''}
                onChange={(e) =>
                  setDescByLang((prev) => ({
                    ...prev,
                    [activeLang]: e.target.value,
                  }))
                }
                rows={3}
                className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Icon (emoji)
                </label>
                <input
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="w-20 border rounded px-2 py-1 text-2xl text-center"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-16 border rounded cursor-pointer"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
