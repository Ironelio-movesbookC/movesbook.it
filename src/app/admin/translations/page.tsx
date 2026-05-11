'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Save, Download, Upload, RefreshCw, Globe, Filter } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { getAuthHeaders, getJsonAuthHeaders } from '@/utils/auth.utils';

interface Language {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
}

interface Translation {
  id: string;
  key: string;
  category: string;
  descriptionEn: string;
  values: Record<string, string>; // languageCode => value
}

export default function TranslationsAdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [filteredTranslations, setFilteredTranslations] = useState<Translation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{key: string, langCode: string} | null>(null);
  const [editValue, setEditValue] = useState('');

  // Auth check
  useEffect(() => {
    if (!loading && (!user || user.userType !== 'ADMIN')) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Fetch data
  useEffect(() => {
    if (user?.userType === 'ADMIN') {
      fetchLanguages();
      fetchTranslations();
    }
  }, [user]);

  // Filter translations
  useEffect(() => {
    let filtered = translations;

    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.descriptionEn.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    setFilteredTranslations(filtered);
  }, [translations, searchQuery, selectedCategory]);

  const fetchLanguages = async () => {
    try {
      const res = await fetch('/api/admin/translations/languages', {
        headers: { ...getAuthHeaders() },
      });
      const data = await res.json();
      setLanguages(data.languages);
    } catch (error) {
      console.error('Error fetching languages:', error);
    }
  };

  const fetchTranslations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/translations', {
        headers: { ...getAuthHeaders() },
      });
      const data = await res.json();
      setTranslations(data.translations);
      setCategories(data.categories);
    } catch (error) {
      console.error('Error fetching translations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCellClick = (key: string, langCode: string, currentValue: string) => {
    setEditingCell({ key, langCode });
    setEditValue(currentValue);
  };

  const handleSaveCell = async () => {
    if (!editingCell) return;

    try {
      const res = await fetch('/api/admin/translations/update', {
        method: 'POST',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({
          key: editingCell.key,
          languageCode: editingCell.langCode,
          value: editValue,
        }),
      });

      if (!res.ok) {
        let msg = `Save failed (${res.status})`;
        try {
          const j = (await res.json()) as { error?: string };
          if (j?.error) msg = j.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }

      // Update local state
      setTranslations(prev => prev.map(t => {
        if (t.key === editingCell.key) {
          return {
            ...t,
            values: {
              ...t.values,
              [editingCell.langCode]: editValue,
            },
          };
        }
        return t;
      }));

      setEditingCell(null);
    } catch (error) {
      console.error('Error saving translation:', error);
      alert('Failed to save translation');
    }
  };

  const handleExportToFiles = async () => {
    if (!confirm('Export all translations to static files? This will overwrite the current i18n files.')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/translations/export', {
        method: 'POST',
        headers: { ...getAuthHeaders() },
      });
      const data = await res.json();
      
      if (data.success) {
        alert('✅ Translations exported to files successfully!');
      }
    } catch (error) {
      console.error('Error exporting translations:', error);
      alert('Failed to export translations');
    }
  };

  const handleSyncFromFiles = async () => {
    if (!confirm('Sync translations from static files to database? This may overwrite database changes.')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/translations/sync', {
        method: 'POST',
        headers: { ...getAuthHeaders() },
      });
      const data = await res.json();
      
      if (data.success) {
        alert('✅ Translations synced from files successfully!');
        fetchTranslations();
      }
    } catch (error) {
      console.error('Error syncing translations:', error);
      alert('Failed to sync translations');
    }
  };

  if (loading || !user || user.userType !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-full bg-gray-50">
      
      <div className="max-w-[1800px] mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Globe className="w-8 h-8 text-blue-600" />
                Translation Management
              </h1>
              <p className="text-gray-600 mt-1">Manage all translations across {languages.length} languages</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSyncFromFiles}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                <Upload className="w-4 h-4" />
                Import from Files
              </button>
              <button
                onClick={handleExportToFiles}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <Download className="w-4 h-4" />
                Export to Files
              </button>
              <button
                onClick={fetchTranslations}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by key or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Translations Grid */}
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading translations...</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase sticky left-0 bg-gray-50 z-10 w-64">
                      Key
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase w-32">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase w-64">
                      Description
                    </th>
                    {languages.filter(l => l.isActive).map(lang => (
                      <th key={lang.code} className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase w-64">
                        {lang.name}
                        {lang.isDefault && <span className="ml-1 text-blue-600">★</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTranslations.map(translation => (
                    <tr key={translation.key} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-900 sticky left-0 bg-white">
                        {translation.key}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {translation.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {translation.descriptionEn || '-'}
                      </td>
                      {languages.filter(l => l.isActive).map(lang => {
                        const isEditing = editingCell?.key === translation.key && editingCell?.langCode === lang.code;
                        const value = translation.values[lang.code] || '';

                        return (
                          <td
                            key={lang.code}
                            className="px-4 py-3 text-sm"
                            onClick={() => !isEditing && handleCellClick(translation.key, lang.code, value)}
                          >
                            {isEditing ? (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleSaveCell}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveCell();
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  className="flex-1 px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <div className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded min-h-[24px]">
                                {value || <span className="text-gray-400 italic">empty</span>}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredTranslations.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No translations found</p>
              </div>
            )}
          </div>
        )}

        {/* Stats Footer */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Showing <span className="font-semibold text-gray-900">{filteredTranslations.length}</span> of{' '}
              <span className="font-semibold text-gray-900">{translations.length}</span> translation keys
            </div>
            <div>
              Total translations: <span className="font-semibold text-gray-900">
                {translations.length * languages.filter(l => l.isActive).length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

