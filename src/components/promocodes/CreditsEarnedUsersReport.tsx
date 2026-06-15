'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import type { CreditsEarnedRow } from '@/lib/promocodes/creditsEarnedService';
import { promocodeFlagImageUrl } from '@/components/promocodes/promocodeImageUrls';
import { promocodesFetch, usePromocodesAdminAuth } from '@/components/promocodes/usePromocodesAdminAuth';
import '@/components/promocodes/promocodes.css';

function formatCredits(value: number): string {
  return value.toFixed(2);
}

export default function CreditsEarnedUsersReport() {
  const ready = usePromocodesAdminAuth();
  const [rows, setRows] = useState<CreditsEarnedRow[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [secondaryModalOpen, setSecondaryModalOpen] = useState(false);
  const [secondaryUsers, setSecondaryUsers] = useState<string[]>([]);

  const load = useCallback(async (search = searchUsername) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search_username', search.trim());
      const res = await promocodesFetch(`/api/admin/promocodes/credits-earned?${params}`);
      const json = await res.json();
      setRows(Array.isArray(json.rows) ? json.rows : []);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [searchUsername]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void load(searchUsername);
  };

  const openSecondaryList = (users: string[]) => {
    setSecondaryUsers(users);
    setSecondaryModalOpen(true);
  };

  if (!ready) return null;

  return (
    <div className="promocodes-page credits-earned-page max-w-[1400px] mx-auto">
      <div className="reddish_row1 mtop10">Credits earned</div>
      <div className="clear m_top_twenty" aria-hidden="true" />

      <div className="earned-wrap">
        <form className="earned-search" onSubmit={onSubmit}>
          <input
            type="text"
            name="search_username"
            placeholder="Search username"
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.target.value)}
          />
          <input type="submit" className="btnRed" value="Search" />
        </form>

        <div className="gub_row mt-10 hide-table">
          {loading ? (
            <div className="credits-earned-loading">Loading…</div>
          ) : (
            <table
              id="print-table"
              className="print-table"
              cellSpacing={0}
              cellPadding={0}
              width="100%"
            >
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Type of user</th>
                  <th>Flag</th>
                  <th>Country</th>
                  <th>Credits</th>
                  <th>Used</th>
                  <th>Available</th>
                  <th>Primary username (1)</th>
                  <th>Secondary username</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 20 }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`paginng_item${highlightedIndex === idx ? ' highlighted' : ''}`}
                      onClick={() => setHighlightedIndex(idx)}
                    >
                      <td>{row.username}</td>
                      <td>{row.typeOfUser}</td>
                      <td>
                        {row.flagImg ? (
                          <img src={promocodeFlagImageUrl(row.flagImg) ?? ''} alt="" />
                        ) : null}
                      </td>
                      <td>{row.country}</td>
                      <td>{formatCredits(row.creditsTotal)}</td>
                      <td>{formatCredits(row.used)}</td>
                      <td>{formatCredits(row.available)}</td>
                      <td>{row.primaryUsername}</td>
                      <td>
                        {row.secondaryCount > 0 ? (
                          <a
                            href="#"
                            className="secondary-link js-open-secondary"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openSecondaryList(row.secondaryUsernames);
                            }}
                          >
                            {row.secondaryCount}
                          </a>
                        ) : (
                          '0'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {secondaryModalOpen && (
        <div className="fixed-center" id="secondaryUsersModal">
          <div className="fixed-center-pop">
            <div style={{ textAlign: 'right' }}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setSecondaryModalOpen(false);
                }}
                style={{ fontSize: 20, textDecoration: 'none' }}
              >
                &times;
              </a>
            </div>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Secondary usernames</div>
            {secondaryUsers.length === 0 ? (
              <p>No secondary users.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {secondaryUsers.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
