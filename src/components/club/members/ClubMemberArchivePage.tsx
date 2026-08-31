'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Star, Trash2, Users } from 'lucide-react';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
import { fetchClubArchive, type ArchiveFetchParams } from '@/lib/club/archives/clubArchiveClient';
import { clubApiFetch, getAuthHeaders, withSelectedClubId } from '@/lib/club/servicePurchasesClient';
import type { Column, Member } from '@/types/clubTable';

type ViewMode = 'all' | 'groups' | 'favourites' | 'group-members';

type MemberGroupSummary = {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
};

type Props = {
  columns: Column[];
  pageSize?: number;
  footerHint?: string;
  refreshKey?: number;
  addMemberAction?: ReactNode;
};

function memberTypeBadge(value: unknown) {
  const label = String(value ?? 'Standard').trim() || 'Standard';
  const lower = label.toLowerCase();
  const className =
    lower.includes('premium') || lower.includes('gold')
      ? 'bg-violet-100 text-violet-800'
      : lower.includes('vip')
        ? 'bg-amber-100 text-amber-800'
        : 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

function formatGroupDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function ClubMemberArchivePage({
  columns,
  pageSize = 25,
  footerHint,
  refreshKey = 0,
  addMemberAction,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroupName, setSelectedGroupName] = useState('');
  const [groups, setGroups] = useState<MemberGroupSummary[]>([]);
  const [data, setData] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [orderBy, setOrderBy] = useState<'recent' | 'old'>('recent');
  const [sportFilter, setSportFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [appliedFilters, setAppliedFilters] = useState<ArchiveFetchParams>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewSelectedOnly, setViewSelectedOnly] = useState(false);
  const [showGroupNameModal, setShowGroupNameModal] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [saving, setSaving] = useState(false);

  const tableColumns = useMemo(
    () => columns.filter((col) => col.key !== 'checked'),
    [columns]
  );

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    setError('');
    try {
      const res = await clubApiFetch<{ groups: MemberGroupSummary[] }>('/api/club/member-groups');
      setGroups(res.groups);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load groups');
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let res: { items: Member[]; total: number };

      if (viewMode === 'favourites') {
        const url = withSelectedClubId(
          `/api/club/member-favourites?page=${page}&pageSize=${pageSize}` +
            (appliedFilters.search ? `&search=${encodeURIComponent(appliedFilters.search)}` : '') +
            (appliedFilters.fromDate ? `&fromDate=${appliedFilters.fromDate}` : '') +
            (appliedFilters.toDate ? `&toDate=${appliedFilters.toDate}` : '') +
            (appliedFilters.orderBy ? `&orderBy=${appliedFilters.orderBy}` : '')
        );
        const fetchRes = await fetch(url, { headers: getAuthHeaders() });
        const payload = await fetchRes.json().catch(() => ({}));
        if (!fetchRes.ok) {
          throw new Error(typeof payload.error === 'string' ? payload.error : 'Failed to load favourites');
        }
        res = { items: payload.items as Member[], total: payload.total as number };
      } else if (viewMode === 'group-members' && selectedGroupId) {
        const url = withSelectedClubId(
          `/api/club/member-groups/${encodeURIComponent(selectedGroupId)}?page=${page}&pageSize=${pageSize}` +
            (appliedFilters.search ? `&search=${encodeURIComponent(appliedFilters.search)}` : '') +
            (appliedFilters.fromDate ? `&fromDate=${appliedFilters.fromDate}` : '') +
            (appliedFilters.toDate ? `&toDate=${appliedFilters.toDate}` : '') +
            (appliedFilters.orderBy ? `&orderBy=${appliedFilters.orderBy}` : '')
        );
        const fetchRes = await fetch(url, { headers: getAuthHeaders() });
        const payload = await fetchRes.json().catch(() => ({}));
        if (!fetchRes.ok) {
          throw new Error(typeof payload.error === 'string' ? payload.error : 'Failed to load group members');
        }
        if (payload.group?.name) setSelectedGroupName(payload.group.name);
        res = { items: payload.items as Member[], total: payload.total as number };
      } else {
        const archiveRes = await fetchClubArchive('members', {
          page,
          pageSize,
          ...appliedFilters,
        });
        res = { items: archiveRes.items as Member[], total: archiveRes.total };
      }

      setTotal(res.total);
      setData(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load members');
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
    void refreshKey; // parent bump forces reload
  }, [appliedFilters, page, pageSize, selectedGroupId, viewMode, refreshKey]);

  useEffect(() => {
    if (viewMode === 'groups') {
      loadGroups();
    } else {
      loadMembers();
    }
  }, [viewMode, loadGroups, loadMembers]);

  useEffect(() => {
    setSelectedIds(new Set());
    setViewSelectedOnly(false);
    setPage(1);
  }, [viewMode, selectedGroupId]);

  const displayedRows = useMemo(() => {
    if (!viewSelectedOnly) return data;
    return data.filter((row) => row.id && selectedIds.has(row.id));
  }, [data, selectedIds, viewSelectedOnly]);

  function applyFilterForm(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setAppliedFilters({
      search: search.trim() || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      orderBy,
      sport: sportFilter !== 'all' ? sportFilter : undefined,
      groupTrained: groupFilter !== 'all' ? groupFilter : undefined,
    });
  }

  function clearFilters() {
    setSearch('');
    setFromDate('');
    setToDate('');
    setOrderBy('recent');
    setSportFilter('all');
    setGroupFilter('all');
    setPage(1);
    setAppliedFilters({});
    setViewSelectedOnly(false);
  }

  function toggleSelect(row: Member) {
    if (!row.id) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(row.id!)) next.delete(row.id!);
      else next.add(row.id!);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    const ids = displayedRows.map((r) => r.id).filter(Boolean) as string[];
    setSelectedIds(new Set(ids));
  }

  function switchView(mode: ViewMode) {
    setViewMode(mode);
    setSelectedGroupId(null);
    setSelectedGroupName('');
    setActionMessage('');
  }

  function openGroupMembers(group: MemberGroupSummary) {
    setSelectedGroupId(group.id);
    setSelectedGroupName(group.name);
    setViewMode('group-members');
    setPage(1);
    setAppliedFilters({});
  }

  async function handleDeleteGroup(groupId: string) {
    if (!window.confirm('Delete this group? Members are not removed from the club.')) return;
    setError('');
    try {
      const url = withSelectedClubId(`/api/club/member-groups/${encodeURIComponent(groupId)}`);
      const res = await fetch(url, { method: 'DELETE', headers: getAuthHeaders() });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof payload.error === 'string' ? payload.error : 'Failed to delete group');
      }
      setActionMessage('Group deleted.');
      await loadGroups();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete group');
    }
  }

  async function handleSaveAsGroup() {
    if (selectedIds.size === 0) {
      setError('Select at least one member.');
      return;
    }
    setGroupNameInput('');
    setShowGroupNameModal(true);
  }

  async function confirmSaveAsGroup() {
    const name = groupNameInput.trim();
    if (!name) {
      setError('Enter a group name.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await clubApiFetch('/api/club/member-groups', {
        method: 'POST',
        body: JSON.stringify({
          name,
          memberIds: Array.from(selectedIds),
        }),
      });
      setShowGroupNameModal(false);
      setGroupNameInput('');
      setActionMessage(`Group "${name}" saved.`);
      setSelectedIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save group');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAsFavourites() {
    if (selectedIds.size === 0) {
      setError('Select at least one member.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await clubApiFetch<{ added: number }>('/api/club/member-favourites', {
        method: 'POST',
        body: JSON.stringify({ memberIds: Array.from(selectedIds) }),
      });
      setActionMessage(
        res.added === 1 ? '1 member saved as favourite.' : `${res.added} members saved as favourites.`
      );
      setSelectedIds(new Set());
      if (viewMode === 'favourites') loadMembers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save favourites');
    } finally {
      setSaving(false);
    }
  }

  const title =
    viewMode === 'groups'
      ? 'Archive — Members — Groups'
      : viewMode === 'favourites'
        ? 'Archive — Members — Favourites'
        : viewMode === 'group-members' && selectedGroupName
          ? `Archive — Members — ${selectedGroupName}`
          : 'Archive — Members';

  const showMemberFilters = viewMode === 'all' || viewMode === 'favourites' || viewMode === 'group-members';
  const showBulkActions = viewMode === 'all';

  return (
    <>
      <ProcedureArchiveShell
        title={title}
        activeTab=""
        tabs={[]}
        headerAction={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => switchView(viewMode === 'groups' ? 'all' : 'groups')}
              className={`rounded px-3 py-1.5 text-sm font-semibold ${
                viewMode === 'groups' || viewMode === 'group-members'
                  ? 'bg-white text-teal-800'
                  : 'bg-teal-700 text-white hover:bg-teal-600'
              }`}
            >
              Groups
            </button>
            <button
              type="button"
              onClick={() => switchView(viewMode === 'favourites' ? 'all' : 'favourites')}
              className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm font-semibold ${
                viewMode === 'favourites'
                  ? 'bg-white text-teal-800'
                  : 'bg-teal-700 text-white hover:bg-teal-600'
              }`}
            >
              <Star className="h-4 w-4" />
              Favourites
            </button>
            {addMemberAction}
          </div>
        }
        error={error || undefined}
        footerHint={footerHint}
        pagination={
          viewMode !== 'groups' && total > pageSize ? (
            <ProcedurePagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          ) : undefined
        }
      >
        {actionMessage ? (
          <p className="mb-2 text-sm text-teal-700">{actionMessage}</p>
        ) : null}

        {viewMode === 'group-members' ? (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => switchView('groups')}
              className="text-sm text-teal-700 hover:text-teal-900 underline"
            >
              ← Back to groups
            </button>
          </div>
        ) : viewMode === 'groups' || viewMode === 'favourites' ? (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => switchView('all')}
              className="text-sm text-teal-700 hover:text-teal-900 underline"
            >
              ← Back to Archive-Members
            </button>
          </div>
        ) : null}

        {showMemberFilters && (
          <form
            onSubmit={applyFilterForm}
            className="flex flex-nowrap items-end gap-2 overflow-x-auto border-b border-gray-200 bg-gray-50 p-3 text-sm"
          >
            <label className="shrink-0">
              <span className="text-xs text-gray-600">Search</span>
              <input
                type="text"
                className="mt-1 block w-36 rounded border border-gray-300 px-2 py-1.5"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, code, notes..."
              />
            </label>
            <label className="shrink-0">
              <span className="text-xs text-gray-600">From</span>
              <input
                type="date"
                className="mt-1 block rounded border border-gray-300 px-2 py-1.5"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>
            <label className="shrink-0">
              <span className="text-xs text-gray-600">To</span>
              <input
                type="date"
                className="mt-1 block rounded border border-gray-300 px-2 py-1.5"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>
            <label className="shrink-0">
              <span className="text-xs text-gray-600">Order</span>
              <select
                className="mt-1 block rounded border border-gray-300 px-2 py-1.5"
                value={orderBy}
                onChange={(e) => setOrderBy(e.target.value as 'recent' | 'old')}
              >
                <option value="recent">Most recent</option>
                <option value="old">Oldest first</option>
              </select>
            </label>
            <label className="shrink-0">
              <span className="text-xs text-gray-600">Sport</span>
              <select
                className="mt-1 block min-w-[8rem] rounded border border-gray-300 px-2 py-1.5"
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
              >
                <option value="all">All</option>
                {Array.from(
                  new Set(
                    data
                      .map((row) => String(row.sport ?? '').trim())
                      .filter((v) => v && v !== '-'),
                  ),
                )
                  .sort((a, b) => a.localeCompare(b))
                  .map((sport) => (
                    <option key={sport} value={sport}>
                      {sport}
                    </option>
                  ))}
              </select>
            </label>
            <label className="shrink-0">
              <span className="text-xs text-gray-600">Group of training</span>
              <select
                className="mt-1 block min-w-[9rem] rounded border border-gray-300 px-2 py-1.5"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
              >
                <option value="all">All</option>
                {Array.from(
                  new Set(
                    data
                      .map((row) => String(row.groupTrained ?? '').trim())
                      .filter((v) => v && v !== '-'),
                  ),
                )
                  .sort((a, b) => a.localeCompare(b))
                  .map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="submit"
              className="shrink-0 rounded bg-teal-700 px-3 py-1.5 text-white hover:bg-teal-800"
            >
              Filter
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="shrink-0 rounded bg-gray-200 px-3 py-1.5 text-gray-800 hover:bg-gray-300"
            >
              Clear
            </button>
            {showBulkActions && selectedIds.size > 0 ? (
              <label className="mb-0.5 flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap text-sm text-gray-800">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={viewSelectedOnly}
                  onChange={(e) => setViewSelectedOnly(e.target.checked)}
                />
                View selected
              </label>
            ) : null}
            {showBulkActions ? (
              <>
                <button
                  type="button"
                  disabled={saving || selectedIds.size === 0}
                  onClick={handleSaveAsGroup}
                  className="shrink-0 whitespace-nowrap rounded border border-teal-700 px-3 py-1.5 text-teal-800 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save as a group
                </button>
                <button
                  type="button"
                  disabled={saving || selectedIds.size === 0}
                  onClick={handleSaveAsFavourites}
                  className="shrink-0 whitespace-nowrap rounded border border-amber-600 px-3 py-1.5 text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save as favourites
                </button>
              </>
            ) : null}
          </form>
        )}

        {viewMode === 'groups' ? (
          groupsLoading ? (
            <div className="p-4 text-gray-500">Loading groups...</div>
          ) : groups.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <Users className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p>No groups yet. Select members and use &quot;Save as a group&quot;.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className="bg-teal-800 text-white">
                  <tr>
                    <th className="px-3 py-2 text-left">Group name</th>
                    <th className="px-3 py-2 text-left">Members</th>
                    <th className="px-3 py-2 text-left">Created</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <tr key={group.id} className="border-t bg-white hover:bg-teal-50">
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => openGroupMembers(group)}
                          className="font-medium text-teal-800 hover:underline"
                        >
                          {group.name}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-gray-700">{group.memberCount}</td>
                      <td className="px-3 py-2 text-gray-700">{formatGroupDate(group.createdAt)}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(group.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete group"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : loading ? (
          <div className="p-4 text-gray-500">Loading...</div>
        ) : (
          <ProcedureArchiveTable
            columns={tableColumns}
            rows={displayedRows}
            emptyMessage={
              viewMode === 'favourites'
                ? 'No favourite members yet. Select members and use "Save as favourites".'
                : 'No records found.'
            }
            selectable={showBulkActions}
            selectableAll
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
          />
        )}
      </ProcedureArchiveShell>

      {showGroupNameModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Save as a group</h2>
            <p className="mt-1 text-sm text-gray-600">
              {selectedIds.size} member{selectedIds.size === 1 ? '' : 's'} selected
            </p>
            <label className="mt-4 block">
              <span className="text-sm text-gray-700">Group name</span>
              <input
                type="text"
                autoFocus
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void confirmSaveAsGroup();
                  }
                }}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                placeholder="Enter group name..."
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowGroupNameModal(false);
                  setGroupNameInput('');
                }}
                className="rounded bg-gray-200 px-4 py-2 text-sm text-gray-800 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void confirmSaveAsGroup()}
                className="rounded bg-teal-700 px-4 py-2 text-sm text-white hover:bg-teal-800 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export { memberTypeBadge };
