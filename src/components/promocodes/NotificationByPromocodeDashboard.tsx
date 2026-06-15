'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { NotificationByPromocodeDashboard } from '@/lib/promocodes/notificationByPromocodeService';
import {
  promocodeFlagImageUrl,
  promocodeProfileImageUrl,
} from '@/components/promocodes/promocodeImageUrls';
import { formatChartCredits } from '@/lib/promocodes/formatPromocodeCredits';
import '@/components/promocodes/notification-by-promocode.css';

type TabId = 'suggest' | 'invitations' | 'registered' | 'credits' | 'connections';

async function userPromocodeFetch(path: string, init?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(path, { ...init, headers });
}

function formatRoleName(roleName: string, roleId?: number | null): string {
  if (roleId === 5) return 'Single User';
  if (!roleName) return '';
  return roleName.charAt(0).toUpperCase() + roleName.slice(1);
}

export default function NotificationByPromocodeDashboardView() {
  const [data, setData] = useState<NotificationByPromocodeDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('suggest');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [promocodeId, setPromocodeId] = useState('');
  const [validEndDate, setValidEndDate] = useState('');
  const [sending, setSending] = useState(false);
  const [highlightedPromoId, setHighlightedPromoId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await userPromocodeFetch('/api/users/notification-by-promocode');
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load dashboard');
        return;
      }
      const dashboard = json as NotificationByPromocodeDashboard;
      setData(dashboard);
      setActiveTab(dashboard.defaultTab === 'invitations' ? 'invitations' : 'suggest');
      if (dashboard.promocode.id) {
        setPromocodeId(String(dashboard.promocode.id));
        setValidEndDate(dashboard.promocode.validTo);
      } else if (dashboard.promocodesList[0]) {
        setPromocodeId(String(dashboard.promocodesList[0].id));
        setValidEndDate(dashboard.promocodesList[0].validTo);
      }
    } catch {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const promocodeOptions = useMemo(() => data?.promocodesList ?? [], [data]);

  const onPromocodeChange = (value: string) => {
    setPromocodeId(value);
    const selected = promocodeOptions.find((p) => String(p.id) === value);
    setValidEndDate(selected?.validTo ?? '');
  };

  const sendInvite = async () => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!receiverEmail.trim()) {
      window.alert('Please enter the mail address for recipient.');
      return;
    }
    if (!emailPattern.test(receiverEmail.trim())) {
      window.alert('Please enter valid mail address.');
      return;
    }
    if (!promocodeId) {
      window.alert('Please select a promocode to use for the invite.');
      return;
    }

    setSending(true);
    try {
      const res = await userPromocodeFetch('/api/users/notification-by-promocode/send-invite', {
        method: 'POST',
        body: JSON.stringify({
          receiverEmail: receiverEmail.trim(),
          promocodeId: Number(promocodeId),
        }),
      });
      const json = await res.json();
      window.alert(json.message || (json.status === 'success' ? 'Your invitation was sent successfully.' : 'Requesting member failed.'));
      if (json.status === 'success') {
        setReceiverEmail('');
        void load();
      }
    } catch {
      window.alert('An error occurred while sending the invitation. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const onSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
  };

  if (loading) {
    return <div className="notification-promocode-page p-6">Loading…</div>;
  }

  if (error || !data) {
    return <div className="notification-promocode-page p-6 text-red-700">{error || 'Unable to load page.'}</div>;
  }

  const tabs: { id: TabId; label: string; show: boolean }[] = [
    { id: 'suggest', label: 'Suggest Movesbook', show: data.showSuggestTab },
    { id: 'invitations', label: 'List of invitations sent', show: true },
    { id: 'registered', label: 'User who registered', show: true },
    { id: 'credits', label: 'Credits earned', show: true },
    { id: 'connections', label: 'Connections chart', show: true },
  ];

  return (
    <div className="notification-promocode-page">
      <div className="re-tab-bar top-bar-nav mtop20">
        <ul>
          {tabs.filter((t) => t.show).map((tab) => (
            <li key={tab.id}>
              <a
                href="#"
                className={`top-bar-list ${activeTab === tab.id ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab(tab.id);
                }}
              >
                {tab.label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {data.showSuggestTab && activeTab === 'suggest' && (
        <div style={{ padding: 20 }}>
          <div className="invite-row">
            <span>Mail to which you start the invite</span>
            <input
              type="text"
              value={receiverEmail}
              onChange={(e) => setReceiverEmail(e.target.value)}
              style={{ width: '30%', minWidth: 200 }}
            />
            <button type="button" className="button-black-promocode" disabled={sending} onClick={() => void sendInvite()}>
              Send Invite
            </button>
          </div>

          <div className="invite-row mtop20" style={{ marginTop: 16 }}>
            <span>Select promocode to use for the invite</span>
            <select
              value={promocodeId}
              onChange={(e) => onPromocodeChange(e.target.value)}
              style={{ width: '25%', minWidth: 180 }}
            >
              {promocodeOptions.length === 0 ? (
                <option value="">— No promocode —</option>
              ) : (
                promocodeOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code}
                  </option>
                ))
              )}
            </select>
            <span>is valid until</span>
            <input
              type="text"
              readOnly
              value={validEndDate}
              style={{ width: 120, background: '#eee', cursor: 'not-allowed' }}
            />
          </div>

          <div className="stats-grid" style={{ padding: '0 40px' }}>
            <div>
              <div className="stat-box"><span>Invitations sent until now</span><span>{data.totalInviteCount}</span></div>
              <div className="stat-box" style={{ marginTop: 8 }}><span>Registrations of single users</span><span>{data.regCount['5'] ?? 0}</span></div>
              <div className="stat-box" style={{ marginTop: 8 }}><span>Registrations of coaches</span><span>{data.regCount['6'] ?? 0}</span></div>
              <div className="stat-box" style={{ marginTop: 8 }}><span>Registrations of clubs</span><span>{data.regCount['8'] ?? 0}</span></div>
              <div className="stat-box" style={{ marginTop: 8 }}><span>Registrations of teams</span><span>{data.regCount['7'] ?? 0}</span></div>
            </div>
            <div>
              <div style={{ marginBottom: 16 }}>
                last mail of invites sent on
                <input type="text" readOnly value={data.lastEmailSentDate} style={{ width: 85, marginLeft: 16, height: 35 }} />
              </div>
              <div className="return-index">
                <p style={{ fontWeight: 100 }}>% return index</p>
                <div className="return-index-value">{data.returnIndex}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'invitations' && (
        <div style={{ padding: 20 }}>
          <div className="sub-tab-bar">
            <ul>
              <li><a href="#" className="active" onClick={(e) => e.preventDefault()}>Promocode generated</a></li>
              <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (highlightedPromoId) {
                      window.open(`/promocodes/promoDetail/${highlightedPromoId}`, '_blank');
                    }
                  }}
                >
                  Recipients record selected
                </a>
              </li>
            </ul>
          </div>
          <table className="print-table">
            <thead>
              <tr>
                <th>&nbsp;</th>
                <th>Promocode</th>
                <th>Flag</th>
                <th>Photo</th>
                <th>Sender</th>
                <th>Version</th>
                <th>Usage</th>
                <th>Users</th>
                <th>Expedition name</th>
                <th>Created</th>
                <th>Status</th>
                <th>Enable</th>
              </tr>
            </thead>
            <tbody>
              {data.invitationsData.length === 0 ? (
                <tr><td colSpan={12} style={{ padding: 20 }}>No invitations received yet.</td></tr>
              ) : (
                data.invitationsData.map((row) => (
                  <tr
                    key={row.applyId}
                    className={highlightedPromoId === row.promocodeId ? 'highlighted' : ''}
                    onClick={() => setHighlightedPromoId(row.promocodeId)}
                  >
                    <td><input type="checkbox" readOnly checked={highlightedPromoId === row.promocodeId} /></td>
                    <td>{row.promocodeCode}</td>
                    <td>
                      {row.senderFlagImg ? (
                        <img src={promocodeFlagImageUrl(row.senderFlagImg) ?? ''} alt="" style={{ height: 23 }} />
                      ) : null}
                    </td>
                    <td>
                      <img src={promocodeProfileImageUrl(row.senderImage)} alt="" style={{ height: 55 }} />
                    </td>
                    <td>{row.senderUsername}<br />{row.countryCode}</td>
                    <td>{row.version}</td>
                    <td>{row.usableBy}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary-link"
                        style={{ background: 'none', border: 'none' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (row.emailList) window.alert(row.emailList);
                        }}
                      >
                        {row.emailCount}
                      </button>
                    </td>
                    <td>{row.recipient}</td>
                    <td>{row.created}</td>
                    <td>{row.status}</td>
                    <td>{row.enable}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'registered' && (
        <div style={{ padding: 20 }}>
          <table className="print-table">
            <thead>
              <tr>
                <th>Sender</th>
                <th>Receiver</th>
                <th>Data Start</th>
                <th>Data end</th>
                <th>Version</th>
                <th>Promocode</th>
                <th>Date of Mail</th>
                <th>Status</th>
                <th>Credit</th>
              </tr>
            </thead>
            <tbody>
              {data.registeredUsers.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 20 }}>No users have registered using your received promocodes yet.</td></tr>
              ) : (
                data.registeredUsers.map((row, idx) => (
                  <tr key={`${row.username}-${idx}`}>
                    <td>{row.senderUsername || 'N/A'}</td>
                    <td>{row.username || '--'}</td>
                    <td>{row.subscriptionStartDate || '--'}</td>
                    <td>{row.subscriptionEndDate || '--'}</td>
                    <td>
                      {row.subscriptionSettingId && data.subscriptionsData[row.subscriptionSettingId]
                        ? data.subscriptionsData[row.subscriptionSettingId]
                        : '--'}
                    </td>
                    <td>{row.promocodeCode || '--'}</td>
                    <td>{row.mailDate || '--'}</td>
                    <td>{row.status}</td>
                    <td>{row.credits || '--'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'credits' && (
        <div style={{ padding: 20 }}>
          <div className="credits-summary">
            <div><span style={{ fontWeight: 'bold' }}>Total credits</span> <span style={{ fontWeight: 'bold', fontSize: 30, marginLeft: 10 }}>{data.totalCredits}</span></div>
            <div><span style={{ fontWeight: 'bold' }}>Used credits</span> <span style={{ fontWeight: 'bold', fontSize: 30, color: 'red', marginLeft: 10 }}>{data.usedCredits}</span></div>
            <div><span style={{ fontWeight: 'bold' }}>Available credits</span> <span style={{ fontWeight: 'bold', fontSize: 30, color: 'green', marginLeft: 10 }}>{data.availableCredits}</span></div>
          </div>
          <table className="print-table">
            <thead>
              <tr>
                <th>Sender</th>
                <th>Credits thanks to</th>
                <th>Username</th>
                <th>Data Start</th>
                <th>Data end</th>
                <th>Version</th>
                <th>Credits</th>
              </tr>
            </thead>
            <tbody>
              {data.creditRecords.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 20 }}>No credits earned yet.</td></tr>
              ) : (
                data.creditRecords.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.senderUsername}</td>
                    <td>
                      {row.secondarySenderFlagImg ? (
                        <img src={promocodeFlagImageUrl(row.secondarySenderFlagImg) ?? ''} alt="" style={{ height: 23, marginRight: 5 }} />
                      ) : null}
                      {row.secondarySenderUsername || row.creditsThanksTo}
                    </td>
                    <td>{row.receiverUsername || '--'}</td>
                    <td>{row.subscriptionStartDate || '--'}</td>
                    <td>{row.subscriptionEndDate || '--'}</td>
                    <td>{row.versionName || '--'}</td>
                    <td>{row.credits.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'connections' && (
        <div style={{ border: '1px solid #cac8c9', marginTop: 20 }}>
          <div className="connection-header">
            {data.connectionChart.currentUserUsername || 'User'}
            <span style={{ float: 'right' }}>
              Current credits {formatChartCredits(data.connectionChart.totalCredits)}{' '}
              Used <span style={{ color: 'red' }}>{formatChartCredits(data.connectionChart.usedCredits)}</span>{' '}
              Available <span style={{ color: 'green' }}>{formatChartCredits(data.connectionChart.availableCredits)}</span>
            </span>
          </div>

          {data.connectionChart.allowsCurrentUserToEarn && (
            <div className="connection-earn-banner">
              {data.connectionChart.currentUserUsername}{' '}
              <span style={{ color: 'red' }}>
                allows to user{' '}
                <strong>
                  {data.connectionChart.allowsCurrentUserToEarn.username}
                  {data.connectionChart.allowsCurrentUserToEarn.roleName
                    ? ` (${formatRoleName(data.connectionChart.allowsCurrentUserToEarn.roleName, data.connectionChart.allowsCurrentUserToEarn.roleId)})`
                    : ''}
                </strong>{' '}
                to earn credits
              </span>
            </div>
          )}

          <div style={{ fontSize: 20, padding: 10 }}>
            Users that allow to <span style={{ color: '#70020b' }}>{data.connectionChart.currentUserUsername || 'User'}</span> to earn other credits
          </div>

          <div style={{ fontWeight: 'bold', padding: 10 }}>Direct recipients who registered</div>
          <div className="connection-list">
            {data.connectionChart.directRecipients.length === 0 ? (
              <p style={{ padding: 10 }}>No direct recipients registered yet.</p>
            ) : (
              <div className="connection-columns">
                <div>
                  {data.connectionChart.directRecipients.map((d, i) => (
                    <p key={i}>{d.username}{d.roleName ? ` (${formatRoleName(d.roleName)})` : ''}</p>
                  ))}
                </div>
                <div>
                  {data.connectionChart.directRecipients.map((d, i) => (
                    <p key={i}>{formatChartCredits(d.credits)}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ fontWeight: 'bold', padding: 10 }}>Indirect secondary recipients who registered</div>
          <div className="connection-list">
            {data.connectionChart.indirectRecipients.length === 0 ? (
              <p style={{ padding: 10 }}>No indirect secondary recipients registered yet.</p>
            ) : (
              <div className="connection-columns three">
                <div>
                  {data.connectionChart.indirectRecipients.map((d, i) => (
                    <p key={i}>{d.username}{d.roleName ? ` (${formatRoleName(d.roleName)})` : ''}</p>
                  ))}
                </div>
                <div>
                  {data.connectionChart.indirectRecipients.map((d, i) => (
                    <p key={i}>{formatChartCredits(d.credits)}</p>
                  ))}
                </div>
                <div style={{ color: '#a7a8a4' }}>
                  {data.connectionChart.indirectRecipients.map((d, i) => (
                    <p key={i}>
                      by {d.senderUsername}
                      {d.senderRoleName ? ` (${formatRoleName(d.senderRoleName)})` : ''}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={onSearchSubmit} style={{ display: 'none' }} aria-hidden />
    </div>
  );
}
