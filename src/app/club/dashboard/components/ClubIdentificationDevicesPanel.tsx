'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FolderOpen, Info, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  fetchIdentificationDevicesInfoText,
  IDENTIFICATION_DEVICES_INFO_DEFAULT_EN,
  parseIdentificationDevicesInfoSections
} from '@/constants/identificationDevicesInfoLongText';
import type { CardReaderListItem, CardReaderOption } from '@/types/clubCardReaders';
import ClubCardReaderFormModal from './ClubCardReaderFormModal';
import ClubCardReaderDeleteConfirmModal from './ClubCardReaderDeleteConfirmModal';
import ClubCardReaderAssignActivityModal from './ClubCardReaderAssignActivityModal';
import ClubCardReaderAdvancedSettingsPanel from './ClubCardReaderAdvancedSettingsPanel';

type ClubIdentificationDevicesPanelProps = {
  clubId?: string | null;
};

function readerLabel(row: CardReaderListItem): string {
  const desc = row.description || row.readerName || `Reader ${row.id}`;
  const parts = [desc, row.controlMode, row.readerType, row.readerPort].filter(Boolean);
  return `${parts.join(' - ')}`;
}

export default function ClubIdentificationDevicesPanel({ clubId }: ClubIdentificationDevicesPanelProps) {
  const { currentLanguage } = useLanguage();
  const [items, setItems] = useState<CardReaderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpBody, setHelpBody] = useState(IDENTIFICATION_DEVICES_INFO_DEFAULT_EN);
  const [helpLoading, setHelpLoading] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assignActivityOpen, setAssignActivityOpen] = useState(false);
  const [advancedReaderId, setAdvancedReaderId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [readerTypes, setReaderTypes] = useState<CardReaderOption[]>([]);
  const [controlModes, setControlModes] = useState<CardReaderOption[]>([]);

  const selected = items.find((row) => row.id === selectedId) ?? null;
  const showAssignActivity =
    selected != null && (selected.controlModeId === 1 || selected.controlModeId === 2);
  const showAssignService = selected != null && selected.controlModeId === 6;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const qs = clubId ? `?clubId=${encodeURIComponent(clubId)}` : '';
      const response = await fetch(`/api/club/settings/card-readers${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Unable to load identification devices.');
      }
      const data = await response.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setReaderTypes(Array.isArray(data.readerTypes) ? data.readerTypes : []);
      setControlModes(Array.isArray(data.controlModes) ? data.controlModes : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load identification devices.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (!helpOpen) return;

    let cancelled = false;
    setHelpLoading(true);

    void fetchIdentificationDevicesInfoText(currentLanguage)
      .then((text) => {
        if (!cancelled) setHelpBody(text);
      })
      .finally(() => {
        if (!cancelled) setHelpLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [helpOpen, currentLanguage]);

  const helpSections = useMemo(() => parseIdentificationDevicesInfoSections(helpBody), [helpBody]);

  async function handleDeleteConfirm() {
    if (!selectedId) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const qs = clubId ? `?clubId=${encodeURIComponent(clubId)}` : '';
      const response = await fetch(`/api/club/settings/card-readers/${selectedId}${qs}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete reader.');
      }
      setDeleteModalOpen(false);
      setSelectedId(null);
      setSuccessMessage('Reader deleted successfully.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete reader.');
      setDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedId(null);
  }

  const btnClass =
    'px-3 py-2 text-sm font-semibold rounded border border-gray-300 bg-gray-100 text-gray-950 hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400';

  const showAdvancedSettings =
    selected != null &&
    [1, 2, 3, 4, 5, 6].includes(selected.controlModeId);

  function openAdvancedSettings() {
    if (!selectedId) return;
    setAdvancedReaderId(selectedId);
  }

  if (advancedReaderId) {
    return (
      <ClubCardReaderAdvancedSettingsPanel
        readerId={advancedReaderId}
        clubId={clubId}
        onBack={() => setAdvancedReaderId(null)}
        onSaved={() => void load()}
      />
    );
  }

  return (
    <div className="space-y-4">
      {successMessage && (
        <div
          className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
          role="status"
        >
          {successMessage}
        </div>
      )}

      <div className="border border-blue-200 bg-blue-700 px-4 py-2 text-base font-semibold text-white">
        Setting of devices
      </div>

      <div className="flex flex-wrap gap-3 border border-gray-200 bg-gray-50 p-3">
        <img src="/img/kde-reader.jpg" alt="" className="h-16 w-auto rounded border border-gray-200 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <img src="/img/lettore-Rfid%202.jpg" alt="" className="h-16 w-auto rounded border border-gray-200 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <img src="/img/lettore-rfid.jpg" alt="" className="h-16 w-auto rounded border border-gray-200 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      </div>

      <div className="border border-blue-200 bg-blue-700 px-4 py-2 text-base font-semibold text-white">
        Reader
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnClass} onClick={() => setAddModalOpen(true)}>
            New reader
          </button>
          <button
            type="button"
            className={btnClass}
            disabled={!selectedId}
            onClick={() => setEditModalOpen(true)}
          >
            Edit
          </button>
          <button
            type="button"
            className={btnClass}
            disabled={!selectedId || !showAssignActivity}
            onClick={() => setAssignActivityOpen(true)}
          >
            Assign Activity
          </button>
          <button
            type="button"
            className={btnClass}
            disabled={!selectedId || !showAdvancedSettings}
            onClick={openAdvancedSettings}
          >
            Advance Settings
          </button>
        </div>
        <button
          type="button"
          className={btnClass}
          disabled={!selectedId}
          onClick={() => setDeleteModalOpen(true)}
        >
          Delete
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnClass} onClick={clearSelection} disabled={!selectedId}>
          Remove Selection
        </button>
        <button type="button" className={btnClass} disabled={!selectedId} title="Coming soon">
          Reset all
        </button>
        {showAssignService && (
          <button type="button" className={btnClass} disabled title="Coming soon">
            Assign Service
          </button>
        )}
        <button
          type="button"
          className={btnClass}
          onClick={() => setHelpOpen((v) => !v)}
          aria-expanded={helpOpen}
        >
          <Info className="inline h-4 w-4" />
        </button>
      </div>

      {helpOpen && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-gray-800">
          {helpLoading ? (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading help…
            </div>
          ) : helpSections.html ? (
            <div
              className="prose prose-sm max-w-none text-gray-800 [&_p:first-child]:font-semibold [&_p:first-child]:text-red-700"
              dangerouslySetInnerHTML={{ __html: helpSections.html }}
            />
          ) : (
            <>
              {helpSections.title ? (
                <p className="font-semibold text-red-700 whitespace-pre-wrap">{helpSections.title}</p>
              ) : null}
              {helpSections.paragraphs.map((paragraph, index) => (
                <p key={index} className={`${index === 0 && !helpSections.title ? '' : 'mt-2'} whitespace-pre-wrap`}>
                  {paragraph}
                </p>
              ))}
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading readers…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : (
        <div className="rounded-lg border border-gray-300 bg-white">
          <div className="border-b border-gray-200 bg-gray-100 px-4 py-2 font-semibold text-gray-900">
            Reader
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-500">No readers configured yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {items.map((row) => {
                const isSelected = selectedId === row.id;
                const isExpanded = expandedIds.has(row.id);
                const childItems = row.controlModeId === 6 ? row.services : row.activities;

                return (
                  <li key={row.id} className={isSelected ? 'bg-blue-50' : ''}>
                    <div className="flex items-start gap-2 px-3 py-2">
                      <input
                        type="radio"
                        name="card-reader"
                        checked={isSelected}
                        onChange={() => setSelectedId(row.id)}
                        className="mt-1 rounded border-gray-500"
                        aria-label={`Select ${readerLabel(row)}`}
                      />
                      <button
                        type="button"
                        onClick={() => toggleExpanded(row.id)}
                        className="mt-0.5 text-gray-500 hover:text-gray-800"
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(row.id);
                          if (childItems.length > 0) toggleExpanded(row.id);
                        }}
                        className={`flex-1 text-left text-sm ${
                          isSelected ? 'font-semibold text-gray-950' : 'text-gray-800'
                        }`}
                      >
                        {readerLabel(row)}
                        {!row.enabled && (
                          <span className="ml-2 text-xs font-normal text-gray-500">(disabled)</span>
                        )}
                      </button>
                    </div>
                    {isExpanded && childItems.length > 0 && (
                      <ul className="border-t border-gray-100 bg-gray-50 py-1 pl-12 pr-3">
                        {childItems.map((child) => (
                          <li key={child.id} className="py-1 text-sm text-gray-700">
                            {child.label}
                          </li>
                        ))}
                      </ul>
                    )}
                    {isExpanded && childItems.length === 0 && (
                      <p className="border-t border-gray-100 bg-gray-50 py-2 pl-12 text-xs text-gray-500">
                        No activities or services assigned.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <ClubCardReaderFormModal
        mode="add"
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        clubId={clubId}
        readerTypes={readerTypes}
        controlModes={controlModes}
        onSaved={() => void load()}
      />

      <ClubCardReaderFormModal
        mode="edit"
        readerId={selectedId}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        clubId={clubId}
        readerTypes={readerTypes}
        controlModes={controlModes}
        onSaved={() => void load()}
      />

      <ClubCardReaderDeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => void handleDeleteConfirm()}
        deleting={deleting}
      />

      <ClubCardReaderAssignActivityModal
        isOpen={assignActivityOpen}
        readerId={selectedId}
        clubId={clubId}
        onClose={() => setAssignActivityOpen(false)}
        onSaved={() => {
          setSuccessMessage('Activities update successfully.');
          void load();
        }}
      />
    </div>
  );
}
