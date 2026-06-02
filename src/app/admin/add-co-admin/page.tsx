'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { COUNTRIES } from '@/lib/news/countries';

type CoAdminFormState = {
  username: string;
  password: string;
  retypePassword: string;
  name: string;
  surname: string;
  email: string;
  alternateEmail: string;
  country: string;
  phonePrefix: string;
  phoneNumber: string;
  cellularPrefix: string;
  cellularNumber: string;
  facebook: string;
  twitter: string;
  website: string;
  blogsite: string;
  otherSite: string;
  otherInfos: string;
};

const initialState: CoAdminFormState = {
  username: '',
  password: '',
  retypePassword: '',
  name: '',
  surname: '',
  email: '',
  alternateEmail: '',
  country: '',
  phonePrefix: '',
  phoneNumber: '',
  cellularPrefix: '',
  cellularNumber: '',
  facebook: '',
  twitter: '',
  website: '',
  blogsite: '',
  otherSite: '',
  otherInfos: ''
};

/** Label column: fixed width, left-aligned text (match add-operator layout) */
const LABEL_COL = 'w-[10.5rem] min-w-[10.5rem] shrink-0 text-left text-sm font-semibold text-gray-800 pr-2';

function inputBaseClass(hasError: boolean) {
  return [
    'w-full',
    'h-9',
    'px-3',
    'border',
    'rounded',
    'bg-white',
    'text-sm',
    'text-gray-900',
    'placeholder:text-gray-400',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-blue-500',
    hasError ? 'border-red-400' : 'border-gray-300'
  ].join(' ');
}

export default function AddCoAdminPage() {
  const [form, setForm] = useState<CoAdminFormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const requiredErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!form.username.trim()) errs.username = 'Username is required';
    if (!form.password) errs.password = 'Password is required';
    if (!form.retypePassword) errs.retypePassword = 'Retype password is required';
    if (form.password && form.retypePassword && form.password !== form.retypePassword) {
      errs.retypePassword = 'Passwords do not match';
    }
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.surname.trim()) errs.surname = 'SurName is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    if (!form.country) errs.country = 'Country is required';
    return errs;
  }, [form]);

  const onChange = (key: keyof CoAdminFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const errs = requiredErrors;
    if (Object.keys(errs).length > 0) {
      setError('Please fix the highlighted fields.');
      return;
    }

    setSubmitting(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
      if (!token) {
        setError('Admin session not found. Please login again.');
        return;
      }

      const res = await fetch('/api/admin/co-admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          name: form.name,
          surname: form.surname,
          email: form.email,
          alternateEmail: form.alternateEmail,
          country: form.country,
          phonePrefix: form.phonePrefix,
          phoneNumber: form.phoneNumber,
          cellularPrefix: form.cellularPrefix,
          cellularNumber: form.cellularNumber,
          facebook: form.facebook,
          twitter: form.twitter,
          website: form.website,
          blogsite: form.blogsite,
          otherSite: form.otherSite,
          otherInfos: form.otherInfos,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create co-admin');
      }

      setSuccess('Co-admin created successfully.');
      setForm(initialState);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Add a co-admin</h1>
            <p className="text-sm text-gray-600 mt-1">Creates a co-admin in the database.</p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {(error || success) && (
              <div className={`rounded border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
                {error || success}
              </div>
            )}

            {/* Account & identity — match add-operator layout */}
            <div className="space-y-3">
              {/* Username: single row */}
              <div className="flex flex-col gap-1 md:flex-row md:items-center">
                <label className={LABEL_COL}>Username</label>
                <div className="flex-1 md:max-w-md">
                  <input
                    value={form.username}
                    onChange={onChange('username')}
                    className={inputBaseClass(Boolean(requiredErrors.username))}
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password + Retype: same row on md */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-x-8">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                  <label className={LABEL_COL}>Password</label>
                  <div className="min-w-0 flex-1">
                    <input
                      type="password"
                      value={form.password}
                      onChange={onChange('password')}
                      className={inputBaseClass(Boolean(requiredErrors.password))}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                  <label className={LABEL_COL}>Retype Password</label>
                  <div className="min-w-0 flex-1">
                    <input
                      type="password"
                      value={form.retypePassword}
                      onChange={onChange('retypePassword')}
                      className={inputBaseClass(Boolean(requiredErrors.retypePassword))}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-x-8">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                  <label className={LABEL_COL}>Name</label>
                  <div className="min-w-0 flex-1">
                    <input value={form.name} onChange={onChange('name')} className={inputBaseClass(Boolean(requiredErrors.name))} />
                  </div>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                  <label className={LABEL_COL}>SurName</label>
                  <div className="min-w-0 flex-1">
                    <input value={form.surname} onChange={onChange('surname')} className={inputBaseClass(Boolean(requiredErrors.surname))} />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm font-semibold text-gray-800">Email</label>
                  <div className="flex-1">
                    <input type="email" value={form.email} onChange={onChange('email')} className={inputBaseClass(Boolean(requiredErrors.email))} autoComplete="email" />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm font-semibold text-gray-800">Alternate Email</label>
                  <div className="flex-1">
                    <input type="email" value={form.alternateEmail} onChange={onChange('alternateEmail')} className={inputBaseClass(false)} />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm font-semibold text-gray-800">Country</label>
                  <div className="flex-1">
                    <select value={form.country} onChange={onChange('country')} className={inputBaseClass(Boolean(requiredErrors.country))}>
                      <option value="">Select country</option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm font-semibold text-gray-800">Phone</label>
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <input value={form.phonePrefix} onChange={onChange('phonePrefix')} className={inputBaseClass(false)} placeholder="+1" />
                    <input value={form.phoneNumber} onChange={onChange('phoneNumber')} className={`${inputBaseClass(false)} col-span-2`} />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm font-semibold text-gray-800">Cellular</label>
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <input value={form.cellularPrefix} onChange={onChange('cellularPrefix')} className={inputBaseClass(false)} placeholder="+1" />
                    <input value={form.cellularNumber} onChange={onChange('cellularNumber')} className={`${inputBaseClass(false)} col-span-2`} />
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <div className="text-sm font-semibold text-gray-800 mb-2">Social Sites</div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm font-semibold text-gray-800">Facebook</label>
                  <div className="flex-1">
                    <input value={form.facebook} onChange={onChange('facebook')} className={inputBaseClass(false)} />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm font-semibold text-gray-800">Twiter</label>
                  <div className="flex-1">
                    <input value={form.twitter} onChange={onChange('twitter')} className={inputBaseClass(false)} />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm font-semibold text-gray-800">My Website</label>
                  <div className="flex-1">
                    <input value={form.website} onChange={onChange('website')} className={inputBaseClass(false)} />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm font-semibold text-gray-800">My Blogsite</label>
                  <div className="flex-1">
                    <input value={form.blogsite} onChange={onChange('blogsite')} className={inputBaseClass(false)} />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm font-semibold text-gray-800">Other Site</label>
                  <div className="flex-1">
                    <input value={form.otherSite} onChange={onChange('otherSite')} className={inputBaseClass(false)} />
                  </div>
                </div>

                <div className="flex items-center gap-4 md:col-span-2">
                  <label className="w-40 text-sm font-semibold text-gray-800">Other Infos</label>
                  <div className="flex-1">
                    <textarea value={form.otherInfos} onChange={onChange('otherInfos')} className={`${inputBaseClass(false)} h-20 py-2 resize-y`} />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-center gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-10 py-2 rounded bg-gradient-to-b from-red-500 to-red-700 text-white font-semibold shadow disabled:opacity-60"
              >
                {submitting ? 'Saving...' : 'Save'}
              </button>
              <Link
                href="/operators/usersAssignedStaff"
                className="px-10 py-2 rounded bg-gradient-to-b from-gray-800 to-gray-900 text-white font-semibold shadow"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

