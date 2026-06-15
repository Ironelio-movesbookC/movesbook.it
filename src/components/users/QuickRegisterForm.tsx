'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { COUNTRY_SELECT_OPTIONS } from '@/constants/countries.constants';
import type { RegistrationStatus } from '@/lib/users/quickRegisterService';

type VersionOption = { id: string; name: string };
type SelectOption = { id: string; name: string };

function fmtYmd(d: Date): string {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${d.getFullYear()}-${m < 10 ? '0' : ''}${m}-${day < 10 ? '0' : ''}${day}`;
}

export default function QuickRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const originEmail = searchParams?.get('user_email')?.split(',')[0]?.trim() ?? '';
  const initialPromocode = searchParams?.get('promocode')?.trim() ?? '';
  const inviteByMovesbook = searchParams?.get('invite_by') === 'movesbook';
  const inviterFromUrl = searchParams?.get('inviter')?.trim() ?? '';

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(originEmail);
  const [reEmail, setReEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState('');
  const [userType, setUserType] = useState('');
  const [versionId, setVersionId] = useState('');
  const [gender, setGender] = useState('');
  const [sport, setSport] = useState('');
  const [promocode, setPromocode] = useState(initialPromocode);
  const [inviterUsername, setInviterUsername] = useState(inviterFromUrl);
  const [confirmInviterUsername, setConfirmInviterUsername] = useState(inviterFromUrl);
  const [movesbookOfficialEmail, setMovesbookOfficialEmail] = useState('admin@movesbook.com');

  const [sports, setSports] = useState<SelectOption[]>([]);
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [promocodeVersionIds, setPromocodeVersionIds] = useState('');
  const [inviterReadonly, setInviterReadonly] = useState(inviteByMovesbook || Boolean(inviterFromUrl));

  const [registrationType, setRegistrationType] = useState<'new' | 'renewal'>('new');
  const [registrationDetail, setRegistrationDetail] = useState<string>('new');
  const [existingUsername, setExistingUsername] = useState('');
  const [subscriptionEndDate, setSubscriptionEndDate] = useState('');
  const [versionDurationDays, setVersionDurationDays] = useState('');

  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountHidden, setDiscountHidden] = useState('');
  const [credit, setCredit] = useState('');
  const [credit2, setCredit2] = useState('');
  const [membersNumber, setMembersNumber] = useState('');
  const [totalPayment, setTotalPayment] = useState('');

  const [promoFeedback, setPromoFeedback] = useState<{ text: string; kind: 'success' | 'error' | '' }>({
    text: '',
    kind: '',
  });
  const [emailStatus, setEmailStatus] = useState('');
  const [registrationStatusMessage, setRegistrationStatusMessage] = useState('');
  const [usernameStatus, setUsernameStatus] = useState('');
  const [usernameStatusColor, setUsernameStatusColor] = useState('#116611');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const initDone = useRef(false);

  const clearSubscriptionDetails = useCallback(() => {
    setCredit('');
    setCredit2('');
    setPrice('');
    setDiscount('');
    setDiscountHidden('');
    setMembersNumber('');
    setTotalPayment('');
    setVersionDurationDays('');
  }, []);

  const applyRegistrationStatus = useCallback(
    (status: RegistrationStatus, opts?: { showEmailStatus?: boolean }) => {
      setRegistrationType(status.type);
      setRegistrationDetail(status.detail);
      setSubscriptionEndDate(status.subscription_end_date ?? '');
      setExistingUsername(status.existing_username ?? '');

      if (opts?.showEmailStatus !== false) {
        if (status.type === 'renewal') {
          setEmailStatus('Renew');
        } else {
          setEmailStatus('New');
        }
      }

      if (status.detail === 'renewal_active') {
        setRegistrationStatusMessage(
          'Your subscription is still active. Renewal will start the day after your current subscription ends.'
        );
      } else if (status.detail === 'renewal_expired') {
        setRegistrationStatusMessage(
          'Your previous subscription has ended. A new subscription period will start from today when you complete registration.'
        );
      } else {
        setRegistrationStatusMessage('');
      }
    },
    []
  );

  const loadSubscriptionData = useCallback(
    async (opts?: { userTypeVal?: string; versionVal?: string; promo?: string; regType?: string }) => {
      const ut = opts?.userTypeVal ?? userType;
      const vid = opts?.versionVal ?? versionId;
      if (!ut || !vid) {
        clearSubscriptionDetails();
        return;
      }

      try {
        const res = await fetch('/api/users/quick-register/subscription-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userType: ut,
            version_id: vid,
            promocode: opts?.promo ?? promocode,
          }),
        });
        const data = await res.json();
        if (!data || typeof data !== 'object') {
          clearSubscriptionDetails();
          return;
        }

        const rec = data;
        const priceVal = rec.price != null && rec.price !== '' ? String(rec.price) : '';
        const discountVal =
          rec.discount_with_promocode != null && rec.discount_with_promocode !== ''
            ? String(rec.discount_with_promocode)
            : '';

        setCredit(rec.credit2 != null ? String(rec.credit2) : '');
        setCredit2(rec.credit != null ? String(rec.credit) : '');

        const duration =
          rec.days_duration != null && rec.days_duration !== '' ? parseInt(String(rec.days_duration), 10) : NaN;
        setVersionDurationDays(Number.isFinite(duration) ? String(duration) : '');

        const regType = opts?.regType ?? registrationType;
        let membersVal = '';
        if (String(ut) === '8') {
          membersVal = rec.members_number1 != null ? String(rec.members_number1) : '';
        } else if (regType === 'renewal') {
          membersVal = rec.members_number2 != null ? String(rec.members_number2) : '';
        } else {
          membersVal = rec.members_number1 != null ? String(rec.members_number1) : '';
        }
        setMembersNumber(membersVal);

        setPrice(priceVal);
        setDiscount(discountVal);
        setDiscountHidden(discountVal);

        const priceNum = parseFloat(priceVal);
        const discNum = parseFloat(discountVal);
        if (Number.isFinite(priceNum) && Number.isFinite(discNum)) {
          setTotalPayment((priceNum * (1 - discNum / 100)).toFixed(2));
        } else if (Number.isFinite(priceNum)) {
          setTotalPayment(priceNum.toFixed(2));
        } else {
          setTotalPayment('');
        }
      } catch {
        clearSubscriptionDetails();
      }
    },
    [userType, versionId, promocode, registrationType, clearSubscriptionDetails]
  );

  const validatePromocode = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) {
        setPromoFeedback({ text: '', kind: '' });
        setDiscount('');
        return { success: false };
      }

      const params = new URLSearchParams({ promocode: trimmed });
      if (inviteByMovesbook) {
        params.set('invite_email', movesbookOfficialEmail.trim().toLowerCase());
      } else if (inviterUsername.trim()) {
        params.set('inviter_username', inviterUsername.trim());
      } else {
        const inviteEmail = originEmail || email.trim().toLowerCase();
        if (inviteEmail) params.set('invite_email', inviteEmail);
      }

      try {
        const res = await fetch(`/api/users/quick-register/validate-promocode?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          setPromoFeedback({ text: data.message, kind: 'success' });
          if (data.data?.version_id) {
            setPromocodeVersionIds(String(data.data.version_id));
          }
          if (userType && versionId) {
            void loadSubscriptionData({ promo: trimmed });
          }
          return data;
        }
        setPromoFeedback({ text: data.message || 'Invalid promocode', kind: 'error' });
        setDiscount('');
        return data;
      } catch {
        setPromoFeedback({ text: 'Could not validate promocode.', kind: 'error' });
        return { success: false };
      }
    },
    [
      inviteByMovesbook,
      movesbookOfficialEmail,
      inviterUsername,
      originEmail,
      email,
      userType,
      versionId,
      loadSubscriptionData,
    ]
  );

  const loadVersions = useCallback(
    async (userTypeVal: string, versionIds: string) => {
      if (!userTypeVal) {
        setVersions([]);
        setVersionId('');
        clearSubscriptionDetails();
        return;
      }
      setLoadingVersions(true);
      try {
        const res = await fetch('/api/users/quick-register/versions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userType: userTypeVal, promocodeVersionIds: versionIds }),
        });
        const data = await res.json();
        const list: VersionOption[] = Object.entries(data ?? {}).map(([id, name]) => ({
          id,
          name: String(name),
        }));
        setVersions(list);
        setVersionId('');
        clearSubscriptionDetails();
      } catch {
        setVersions([]);
      } finally {
        setLoadingVersions(false);
      }
    },
    [clearSubscriptionDetails]
  );

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const params = new URLSearchParams();
    if (originEmail) params.set('user_email', originEmail);
    if (initialPromocode) params.set('promocode', initialPromocode);
    if (inviteByMovesbook) params.set('invite_by', 'movesbook');
    if (inviterFromUrl) params.set('inviter', inviterFromUrl);

    void fetch(`/api/users/quick-register/init?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.movesbookOfficialEmail) setMovesbookOfficialEmail(data.movesbookOfficialEmail);
        if (data.inviterUsername) {
          setInviterUsername(data.inviterUsername);
          setConfirmInviterUsername(data.inviterUsername);
        }
        if (typeof data.inviterReadonly === 'boolean') setInviterReadonly(data.inviterReadonly);
        if (data.promocodeAllowedVersionIds) setPromocodeVersionIds(data.promocodeAllowedVersionIds);
        if (Array.isArray(data.sports) && data.sports.length > 0) {
          setSports(data.sports);
        }
      })
      .catch(() => undefined);

    if (originEmail) {
      void fetch(
        `/api/users/quick-register/detect-registration-status?email=${encodeURIComponent(originEmail)}`
      )
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.status) {
            applyRegistrationStatus(data.status, { showEmailStatus: false });
          }
        })
        .catch(() => undefined);
    }

    if (initialPromocode) {
      void validatePromocode(initialPromocode);
    }
  }, [originEmail, initialPromocode, inviteByMovesbook, inviterFromUrl, applyRegistrationStatus, validatePromocode]);

  const handleEmailChange = async () => {
    const val = email.trim();
    if (!val) {
      setEmailStatus('');
      setRegistrationStatusMessage('');
      setRegistrationType('new');
      setRegistrationDetail('new');
      return;
    }

    try {
      const res = await fetch(
        `/api/users/quick-register/detect-registration-status?email=${encodeURIComponent(val)}`
      );
      const data = await res.json();
      if (data.success && data.status) {
        applyRegistrationStatus(data.status);
        if (userType && versionId) {
          void loadSubscriptionData({ regType: data.status.type });
        }
      }
    } catch {
      setEmailStatus('');
    }
    void handleUsernameBlur();
  };

  const handleUsernameBlur = async () => {
    const u = username.trim();
    setUsernameStatus('');
    if (u.length < 5) return;

    if (registrationType === 'renewal' && existingUsername && u.toLowerCase() === existingUsername.toLowerCase()) {
      setUsernameStatus('Username matches your existing account.');
      setUsernameStatusColor('#0d47a1');
      return;
    }
    if (registrationType === 'renewal') return;

    try {
      const params = new URLSearchParams({ username: u, email: email.trim().toLowerCase() });
      const res = await fetch(`/api/users/quick-register/check-username?${params.toString()}`);
      const data = await res.json();
      if (data.available) {
        setUsernameStatus('This username is available.');
        setUsernameStatusColor('#116611');
      } else {
        setUsernameStatus(data.message || 'This username is already taken.');
        setUsernameStatusColor('#a61b1b');
      }
    } catch {
      setUsernameStatus('');
    }
  };

  const handleUserTypeChange = (value: string) => {
    setUserType(value);
    void loadVersions(value, promocodeVersionIds);
  };

  const handleVersionChange = (value: string) => {
    setVersionId(value);
    if (value) {
      void loadSubscriptionData({ versionVal: value, userTypeVal: userType });
    } else {
      clearSubscriptionDetails();
    }
  };

  const confirmRenewal = (): boolean => {
    if (registrationType !== 'renewal') return true;

    const dur = parseInt(versionDurationDays, 10);
    const durationValid = Number.isFinite(dur) && dur > 0 ? dur : null;

    if (registrationDetail === 'renewal_expired') {
      if (
        !window.confirm(
          'You already have an account with this email. Your previous subscription has ended. A new subscription will start from today. Do you want to continue?'
        )
      ) {
        return false;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let newEndExpired = '';
      if (durationValid) {
        const de = new Date(today.getTime());
        de.setDate(de.getDate() + durationValid);
        newEndExpired = fmtYmd(de);
      }
      let msg2 =
        'Your new subscription will run from today' + (newEndExpired ? ` until ${newEndExpired}` : '');
      msg2 += '. Duration, price and discount for the selected version will apply. Do you want to proceed?';
      return window.confirm(msg2);
    }

    if (
      !window.confirm(
        'You already have an account with this username and email. If you proceed, your current subscription will be extended. Do you want to continue?'
      )
    ) {
      return false;
    }

    let newEndDateStr = '';
    if (subscriptionEndDate && durationValid) {
      const d = new Date(subscriptionEndDate);
      if (!Number.isNaN(d.getTime())) {
        d.setDate(d.getDate() + 1 + durationValid);
        newEndDateStr = fmtYmd(d);
      }
    }
    let msg2 = 'The current subscription will be extended from the day after your current period ends';
    if (newEndDateStr) msg2 += ` until ${newEndDateStr}`;
    msg2 += '. Duration, price and discount of the renewal will be applied. Do you want to proceed?';
    return window.confirm(msg2);
  };

  const handleRegister = async () => {
    setError('');

    if (registrationType === 'renewal' && existingUsername) {
      if (username.trim().toLowerCase() !== existingUsername.toLowerCase()) {
        setError(
          `You already have an account with this email address. Please use your existing username: ${existingUsername}`
        );
        return;
      }
    }

    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }
    if (username.trim().length < 5) {
      setError('Your username must be at least 5 characters long');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!reEmail.trim()) {
      setError('Please Retype your email');
      return;
    }
    if (email.trim().toLowerCase() !== reEmail.trim().toLowerCase()) {
      setError('Please Retype same email');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }
    if (password.length < 5) {
      setError('Your password must be at least 5 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setError('Please enter the same password as above');
      return;
    }
    if (!country) {
      setError('Please select your country');
      return;
    }
    if (!userType) {
      setError('Please select your user type');
      return;
    }
    if (!versionId) {
      setError('Please select a subscription version');
      return;
    }
    if (!gender) {
      setError('Please select gender');
      return;
    }
    if (!sport) {
      setError('Please select your sport');
      return;
    }

    const code = promocode.trim();
    if (code) {
      const promoResult = await validatePromocode(code);
      if (!promoResult.success) {
        setError(
          (promoResult as { message?: string }).message || 'This promocode is invalid or has expired.'
        );
        return;
      }
    }

    if (registrationType === 'new') {
      try {
        const params = new URLSearchParams({
          username: username.trim(),
          email: email.trim().toLowerCase(),
        });
        const res = await fetch(`/api/users/quick-register/check-username?${params.toString()}`);
        const data = await res.json();
        if (!data.available) {
          setError(data.message || 'This username is already taken. Please choose another.');
          return;
        }
      } catch {
        setError('Could not verify username. Please try again.');
        return;
      }
    }

    if (!confirmRenewal()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/users/quick-register/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          re_email: reEmail.trim(),
          password,
          confim_password: confirmPassword,
          country,
          usertype: userType,
          version_id: versionId,
          gender,
          sport,
          promocode: code,
          inviter_username: inviterUsername.trim() || undefined,
          confirm_inviter_username: confirmInviterUsername.trim() || undefined,
          invite_by_movesbook: inviteByMovesbook,
          origin_email: originEmail || undefined,
          disccount_hidden: discountHidden,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Registration failed');
      }
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quickregistration" style={{ marginTop: 20 }}>
      <div className="quickregi-title">Register yourself</div>
      <div className="quickregi-subtitle">
        Have you already an account Movesbook?{' '}
        <Link href="/" target="_blank">
          Log in
        </Link>
      </div>

      <form id="quick-register-form" onSubmit={(e) => e.preventDefault()} noValidate>
        {inviteByMovesbook ? <input type="hidden" name="invite_by_movesbook" value="1" /> : null}
        <input type="hidden" name="origin_email" id="origin_email" value={originEmail} />
        <input type="hidden" id="registration_type" value={registrationType} />
        <input type="hidden" id="registration_detail" value={registrationDetail} />
        <input type="hidden" id="subscription_end_date" value={subscriptionEndDate} />
        <input type="hidden" id="existing_username" value={existingUsername} />
        <input type="hidden" id="version_duration_days" value={versionDurationDays} />

        <div className="quickregi-form">
          <div className="quickregi-left" style={{ border: 'none', paddingRight: 0 }}>
            {error ? <div className="red">{error}</div> : null}

            <div className="div-row">
              <span className="span-label-title">Type here your username</span>
              <input
                style={{ border: '2px solid #7f7f7f !important' }}
                type="text"
                placeholder="Username"
                name="username"
                id="textUsername"
                value={username}
                autoComplete="off"
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => void handleUsernameBlur()}
              />
              {usernameStatus ? (
                <div
                  id="username-status"
                  style={{ marginTop: 6, fontWeight: 'bold', color: usernameStatusColor }}
                >
                  {usernameStatus}
                </div>
              ) : null}
            </div>

            <div className="div-line" />

            <div className="div-row">
              <span className="span-label-title">Your mail to register</span>
              <input
                style={{ border: '2px solid #7f7f7f !important' }}
                type="email"
                className="input-highlight"
                placeholder="mail address"
                name="email"
                id="textEmail"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                onBlur={() => void handleEmailChange()}
              />
              <div
                id="email-status"
                style={{
                  marginTop: 6,
                  fontWeight: 'bold',
                  color:
                    emailStatus === 'Renew'
                      ? '#610d1c'
                      : emailStatus === 'New'
                        ? '#116611'
                        : '#6e1a27',
                }}
              >
                {emailStatus}
              </div>
            </div>

            <div
              id="registration-status-message"
              className={`registration-status-message${
                registrationDetail === 'renewal_active'
                  ? ' status-renewal-active'
                  : registrationDetail === 'renewal_expired'
                    ? ' status-renewal'
                    : ''
              }`}
              style={{ display: registrationStatusMessage ? 'block' : 'none' }}
            >
              {registrationStatusMessage}
            </div>

            <div className="div-row">
              <input
                style={{ border: '2px solid #7f7f7f !important' }}
                type="email"
                className="input-highlight"
                placeholder="Retype your email"
                name="re_email"
                id="textReEmail"
                value={reEmail}
                onChange={(e) => setReEmail(e.target.value)}
              />
            </div>

            <div className="div-line" />

            <div className="div-row">
              <span className="span-label-title">Your password</span>
              <input
                style={{ border: '2px solid #7f7f7f !important' }}
                type="password"
                className="password-highlight"
                placeholder="Password*"
                name="password"
                id="textPassword"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="div-row">
              <input
                style={{ border: '2px solid #7f7f7f !important' }}
                type="password"
                className="password-highlight"
                placeholder="Retype your password"
                name="confim_password"
                id="textRePassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="div-line" />

            <div className="div-row">
              <span className="span-label-title">Type here your data</span>
            </div>

            <div className="quickfield-row">
              <span className="span-title">Country*</span>
              <div className="span-content">
                <div className="custom-select">
                  <select id="sltCountry" name="country" value={country} onChange={(e) => setCountry(e.target.value)}>
                    <option value="">Select country</option>
                    {COUNTRY_SELECT_OPTIONS.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="quickfield-row">
              <div className="col-45">
                <span className="span-title">User type*</span>
                <div className="span-content" style={{ width: 241, marginLeft: 91 }}>
                  <div className="custom-select select-highlight" style={{ marginLeft: -10 }}>
                    <select
                      id="sltUsertype"
                      name="usertype"
                      value={userType}
                      onChange={(e) => handleUserTypeChange(e.target.value)}
                    >
                      <option value="">Select user type</option>
                      <option value="5">Single User</option>
                      <option value="8">Club</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="col-25">
                <div className="custom-select select-highlight" style={{ minWidth: 160 }}>
                  <select
                    id="version"
                    name="version_id"
                    value={versionId}
                    onChange={(e) => handleVersionChange(e.target.value)}
                    disabled={loadingVersions || !userType}
                    style={{ minWidth: 150 }}
                  >
                    <option value="">
                      {loadingVersions ? 'Loading...' : 'Select version'}
                    </option>
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                {!loadingVersions && userType && versions.length === 0 ? (
                  <span style={{ display: 'block', fontSize: 12, color: '#a61b1b', marginTop: 4 }}>
                    No versions available for this user type.
                  </span>
                ) : null}
              </div>
              <div className="col-25" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div>
                  <span>Cost</span>
                </div>
                <div style={{ border: '1px solid', marginLeft: 10, height: 32 }}>
                  <input
                    type="text"
                    className="price"
                    id="price"
                    readOnly
                    value={price}
                    style={{ border: 'none', height: 30 }}
                  />
                </div>
              </div>
              <div className="clear" />
            </div>

            <div className="quickfield-row">
              <div className="col-45">
                <span className="span-title">Gender*</span>
                <div className="span-content">
                  <div className="custom-select">
                    <select id="sltGender" name="gender" value={gender} onChange={(e) => setGender(e.target.value)}>
                      <option value="">Select gender</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="col-55">
                <span style={{ fontWeight: 'bold', color: '#6e1a27', fontSize: 13 }}>
                  User type will affect the versions available and the version chosed will affect the cost ( together to
                  the countyr selected )
                </span>
              </div>
              <div className="clear" />
            </div>

            <div className="quickfield-row">
              <span className="span-title">Sport*</span>
              <div className="span-content">
                <div className="custom-select">
                  <select id="sltSport" name="sport" value={sport} onChange={(e) => setSport(e.target.value)}>
                    <option value="">Select sport</option>
                    {(sports.length > 0
                      ? sports
                      : [
                          { id: '1', name: 'Swimming' },
                          { id: '2', name: 'Cycling' },
                          { id: '3', name: 'Running' },
                        ]
                    ).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="div-row">
              <p style={{ fontWeight: 'bold', color: '#6e1a27', fontSize: 18 }}>
                Have you a promocode ? If yes type it here to have a discount and some benefits for you
              </p>
              <p style={{ fontWeight: 'bold', color: '#610d1c', fontSize: 18 }}>
                You earn and benefit when you register yourself and when also will do it someone who received your
                invite to register
              </p>

              <div>
                <div style={{ color: '#fff', background: '#7291bd', fontSize: 20, padding: 10 }}>
                  Discount, number of members assigned, and credits earned using your promocode
                </div>
                <div style={{ display: 'flex', gap: 5, marginTop: 10, justifyContent: 'space-around' }}>
                  <div className="left-div" style={{ width: '100%' }}>
                    <span style={{ fontWeight: 'bold', color: '#610d1c', fontSize: 18 }}>
                      Discount with promocode
                    </span>
                    <input
                      type="text"
                      style={{ marginLeft: 20, width: '8%', border: '1px solid', color: '#000', fontWeight: 'bold' }}
                      id="discount_with_promocode"
                      value={discount}
                      readOnly
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 5,
                    justifyContent: 'space-around',
                    marginTop: 10,
                    background: '#effafc',
                    border: '1px solid grey',
                    flexWrap: 'wrap',
                    padding: 10,
                  }}
                >
                  <div
                    className="col-10"
                    style={{
                      marginLeft: 20,
                      fontSize: 30,
                      color: '#610d1c',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    Credits
                  </div>
                  <div
                    className="left-div col-30"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <p style={{ fontWeight: 'bold', color: 'red', fontSize: 18 }}>
                      For the club that receive the invitation and decides to register itself
                    </p>
                    <input
                      type="text"
                      style={{ border: '1px solid', color: '#000', fontWeight: 'bold', width: '20%' }}
                      className="credit"
                      id="credit"
                      readOnly
                      value={credit}
                    />
                  </div>
                  <div
                    className="right-div col-30"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <p style={{ fontWeight: 'bold', color: 'red', fontSize: 18 }}>
                      For the sender club each time a club suggested will register itself
                    </p>
                    <input
                      type="text"
                      style={{ border: '1px solid', color: '#000', fontWeight: 'bold', width: '20%' }}
                      className="credit2"
                      id="credit2"
                      readOnly
                      value={credit2}
                    />
                  </div>
                  <div className="right-div col-30" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontWeight: 'bold', color: 'red', fontSize: 18 }}>
                      Number of members available or that will be added to the existing ones
                    </p>
                    <input
                      type="text"
                      style={{ width: '30%', border: '1px solid', color: '#000', fontWeight: 'bold' }}
                      id="members_number"
                      readOnly
                      value={membersNumber}
                    />
                  </div>
                  <div className="clear" />
                </div>

                <div style={{ marginLeft: 200, color: 'black' }}>
                  <div className="inline-row">
                    {inviteByMovesbook ? (
                      <>
                        <span style={{ fontWeight: 'bold', fontSize: 18 }}>Official invitation email (Movesbook)</span>
                        <input
                          type="text"
                          className="inline-input input-highlight"
                          style={{ border: '1px solid', color: '#000', background: '#eee' }}
                          value={movesbookOfficialEmail}
                          id="sender_email"
                          readOnly
                        />
                        <span style={{ fontWeight: 'bold', fontSize: 18 }}>Retype here</span>
                        <input
                          type="text"
                          className="inline-input input-highlight"
                          style={{ border: '1px solid', background: '#eee' }}
                          value={movesbookOfficialEmail}
                          id="confirm_sender_email"
                          readOnly
                        />
                        <span style={{ fontWeight: 'bold', color: '#0d47a1', fontSize: 14 }}>
                          (Invitation from Movesbook – official address)
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontWeight: 'bold', fontSize: 18 }}>Username of who invited you *</span>
                        <input
                          type="text"
                          name="inviter_username"
                          className="inline-input input-highlight"
                          style={{
                            border: '1px solid',
                            color: '#000',
                            background: inviterReadonly ? '#eee' : undefined,
                          }}
                          value={inviterUsername}
                          id="inviter_username"
                          readOnly={inviterReadonly}
                          onChange={(e) => setInviterUsername(e.target.value)}
                        />
                        <span style={{ fontWeight: 'bold', fontSize: 18 }}>Retype username *</span>
                        <input
                          type="text"
                          name="confirm_inviter_username"
                          className="inline-input input-highlight"
                          style={{
                            border: '1px solid',
                            background: inviterReadonly ? '#eee' : undefined,
                          }}
                          value={confirmInviterUsername}
                          id="confirm_inviter_username"
                          readOnly={inviterReadonly}
                          onChange={(e) => setConfirmInviterUsername(e.target.value)}
                        />
                        {inviterReadonly ? (
                          <span style={{ fontWeight: 'bold', color: '#0d47a1', fontSize: 14 }}>
                            (Filled from your invite link — cannot be edited)
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>

                  <div className="inline-row">
                    <span style={{ fontWeight: 'bold', fontSize: 18 }}>Type or paste here the promocode received</span>
                    <input
                      type="text"
                      className="inline-input input-highlight-promocode"
                      style={{ marginTop: 10, border: '1px solid', color: '#000' }}
                      name="promocode"
                      value={promocode}
                      id="promocode"
                      onChange={(e) => setPromocode(e.target.value)}
                      onBlur={() => void validatePromocode(promocode)}
                    />
                  </div>
                  {promoFeedback.text ? (
                    <div
                      id="promocode-feedback"
                      className={`promocode-feedback ${promoFeedback.kind === 'success' ? 'promo-success' : 'promo-error'}`}
                      style={{ display: 'block' }}
                    >
                      {promoFeedback.text}
                    </div>
                  ) : null}
                  <div className="clear" />
                </div>

                <div className="clear" />
                <div className="div-row" id="total-payment-row">
                  <div className="payment-row-item">
                    <span style={{ fontWeight: 'bold', fontSize: 18 }}>Total payment</span>
                    <input
                      type="text"
                      className="payment-total-input"
                      id="total_payment"
                      value={totalPayment}
                      readOnly
                    />
                  </div>
                  <div className="payment-row-item payment-logos">
                    <Image src="/img/payment_logo/logo_visa.svg" alt="Visa" width={45} height={28} />
                    <Image src="/img/payment_logo/logo_mc.svg" alt="Mastercard" width={45} height={28} />
                    <Image src="/img/payment_logo/logo_discover.svg" alt="Discover" width={45} height={28} />
                    <Image src="/img/payment_logo/logo_paypal.svg" alt="PayPal" width={45} height={28} />
                    <Image src="/img/payment_logo/logo_amex.svg" alt="Amex" width={45} height={28} />
                  </div>
                  <div className="payment-row-item">
                    <input
                      className="btnRed"
                      type="button"
                      value={loading ? 'Registering…' : 'Register'}
                      disabled={loading}
                      onClick={() => void handleRegister()}
                    />
                    <input
                      className="button-black-promocode"
                      style={{ marginLeft: 10, padding: 8 }}
                      type="button"
                      value="Cancel"
                      onClick={() => router.push('/')}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
