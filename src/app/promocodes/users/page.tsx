'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import PromocodesTabs from '@/components/promocodes/PromocodesTabs';
import PromocodesPagination from '@/components/promocodes/PromocodeAppliesTable';
import PromocodeAssetImage from '@/components/promocodes/PromocodeAssetImage';
import {
  PROMOCODE_NO_FLAG_IMAGE,
  promocodeFlagImageUrl,
} from '@/components/promocodes/promocodeImageUrls';
import { promocodesFetch, usePromocodesAdminAuth } from '@/components/promocodes/usePromocodesAdminAuth';
import type { PaginatedResult, PromocodeUserRow } from '@/lib/promocodes/types';
import '@/components/promocodes/promocodes.css';

type DetailTab = 'users' | 'invites' | 'credits' | 'connections';

export default function PromocodeUsersPage() {
  const ready = usePromocodesAdminAuth();
  const [data, setData] = useState<PaginatedResult<PromocodeUserRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('users');
  const [detail, setDetail] = useState<{
    invites: Record<string, unknown>[];
    registrations: Record<string, unknown>[];
    credits: { asSender: Record<string, unknown>[]; asSecondary: Record<string, unknown>[] };
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '15',
      });
      if (appliedSearch.trim()) params.set('search', appliedSearch.trim());
      const res = await promocodesFetch(`/api/admin/promocodes/users?${params}`);
      setData(await res.json());
    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, appliedSearch]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  useEffect(() => {
    if (!ready || !selectedUserId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    promocodesFetch(`/api/admin/promocodes/users/${selectedUserId}`)
      .then(async (res) => {
        const json = await res.json();
        setDetail({
          invites: Array.isArray(json.invites) ? json.invites : [],
          registrations: Array.isArray(json.registrations) ? json.registrations : [],
          credits: json.credits ?? { asSender: [], asSecondary: [] },
        });
      })
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [ready, selectedUserId]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(search);
  };

  if (!ready) return null;

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const selectedUser = data?.items.find((u) => u.legacyUserId === selectedUserId) ?? null;

  return (
    <div className="promocodes-page max-w-[1400px] mx-auto">
      <div className="reddish_row1 mtop10">Users of Promocodes</div>
      <PromocodesTabs active="users" />

      <form className="mt-4 flex flex-wrap items-center gap-3" onSubmit={onSearch}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search username or name"
          className="px-3 py-2 border text-sm min-w-[240px]"
        />
        <button type="submit" className="px-4 py-2 bg-[#7b0a26] text-white text-sm rounded">
          Search
        </button>
      </form>

      <div className="re-tab-bar mt-6">
        <ul>
          {(
            [
              ['users', 'Users'],
              ['invites', 'Invites and Registrations'],
              ['credits', 'Credits earned'],
              ['connections', 'Connections chart'],
            ] as const
          ).map(([key, label]) => (
            <li key={key}>
              <a
                href="#"
                className={detailTab === key ? 'active' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  setDetailTab(key);
                }}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {detailTab === 'users' && (
        <>
          <PromocodesPagination page={page} totalPages={totalPages} onPageChange={setPage} />
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading…</div>
          ) : (
            <div className="overflow-x-auto border border-gray-300 bg-white mt-2">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#3d3d3d] text-white text-left">
                    <th className="p-2">Username</th>
                    <th className="p-2">Name</th>
                    <th className="p-2">Flag</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Version</th>
                    <th className="p-2">First promocode</th>
                    <th className="p-2">PG count</th>
                    <th className="p-2">Credits earned</th>
                    <th className="p-2">Used</th>
                    <th className="p-2">Remain</th>
                    <th className="p-2">Last invite</th>
                    <th className="p-2">Days</th>
                    <th className="p-2">Last registration</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.items ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={13} className="p-6 text-center text-gray-500">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    (data?.items ?? []).map((row) => (
                      <tr
                        key={row.legacyUserId}
                        className={`border-t hover:bg-[#f9f4db] cursor-pointer ${
                          selectedUserId === row.legacyUserId ? 'bg-[#f9f4db]' : ''
                        }`}
                        onClick={() => setSelectedUserId(row.legacyUserId)}
                      >
                        <td className="p-2 font-medium">{row.username}</td>
                        <td className="p-2">{row.wholeName}</td>
                        <td className="p-2">
                          <PromocodeAssetImage
                            src={promocodeFlagImageUrl(row.flagImage, {
                              countryCode: row.countryCode,
                            })}
                            fallbackSrc={PROMOCODE_NO_FLAG_IMAGE}
                            countryCode={row.countryCode}
                            className="h-6"
                          />
                        </td>
                        <td className="p-2">{row.userType}</td>
                        <td className="p-2">{row.version ?? ''}</td>
                        <td className="p-2">{row.firstPromocode ?? ''}</td>
                        <td className="p-2 text-center">{row.promocodesGenerated}</td>
                        <td className="p-2 text-center">{row.creditsEarned.toFixed(2)}</td>
                        <td className="p-2 text-center">{row.creditsUsed.toFixed(2)}</td>
                        <td className="p-2 text-center">{row.creditsRemain.toFixed(2)}</td>
                        <td className="p-2">{row.lastInviteDate?.slice(0, 10) ?? ''}</td>
                        <td className="p-2 text-center">{row.daysSinceLastInvite ?? ''}</td>
                        <td className="p-2">{row.lastRegistrationDate?.slice(0, 10) ?? ''}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          <PromocodesPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {detailTab !== 'users' && (
        <div className="mt-4 border border-gray-300 bg-white p-4">
          {!selectedUserId ? (
            <p className="text-gray-600">Select a user from the Users tab first.</p>
          ) : detailLoading ? (
            <p>Loading detail…</p>
          ) : (
            <>
              <div className="mb-4 font-semibold">
                {selectedUser?.username ?? `User #${selectedUserId}`}
              </div>
              {detailTab === 'invites' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold mb-2">Invites sent ({detail?.invites.length ?? 0})</h3>
                    <pre className="text-xs overflow-auto max-h-64 bg-gray-50 p-2">
                      {JSON.stringify(detail?.invites ?? [], null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h3 className="font-bold mb-2">
                      Registrations ({detail?.registrations.length ?? 0})
                    </h3>
                    <pre className="text-xs overflow-auto max-h-64 bg-gray-50 p-2">
                      {JSON.stringify(detail?.registrations ?? [], null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              {detailTab === 'credits' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold mb-2">As primary sender</h3>
                    <pre className="text-xs overflow-auto max-h-64 bg-gray-50 p-2">
                      {JSON.stringify(detail?.credits.asSender ?? [], null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h3 className="font-bold mb-2">As secondary sender</h3>
                    <pre className="text-xs overflow-auto max-h-64 bg-gray-50 p-2">
                      {JSON.stringify(detail?.credits.asSecondary ?? [], null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              {detailTab === 'connections' && selectedUser && (
                <div className="text-sm space-y-2">
                  <p>
                    Credits earned: <strong>{selectedUser.creditsEarned.toFixed(2)}</strong>
                  </p>
                  <p>
                    Credits used: <strong>{selectedUser.creditsUsed.toFixed(2)}</strong>
                  </p>
                  <p>
                    Credits remain: <strong>{selectedUser.creditsRemain.toFixed(2)}</strong>
                  </p>
                  <p>
                    Promocodes generated: <strong>{selectedUser.promocodesGenerated}</strong>
                  </p>
                  <p>
                    Registrations attributed:{' '}
                    <strong>{detail?.registrations.length ?? 0}</strong>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
