'use client';

import { useEffect, useState, useCallback, type FormEvent } from 'react';
import Link from 'next/link';
import { User, Mail, Calendar, Users, Award, Trophy, Settings as SettingsIcon } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@/constants/tools.constants';
import { ALL_COUNTRIES } from '@/constants/countries.constants';
import ModernNavbar from '@/components/ModernNavbar';
import ChangeProfilePhotoModal from '@/components/athlete/ChangeProfilePhotoModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { resolvePublicImageUrl } from '@/lib/profileImageUrl';
import { getDashboardPathForUserType } from '@/utils/dashboardRouting';

interface UserProfileData {
  id: string;
  email: string;
  username: string;
  name: string;
  firstName?: string | null;
  surname?: string | null;
  country?: string | null;
  gender?: string | null;
  birthdate?: string | null;
  image?: string | null;
  userType: string;
  createdAt: string;
  settings: { language?: string } | null;
  periods: Array<{ id: string; name: string; color: string; description: string }>;
  sections: Array<{ id: string; name: string; color: string; description: string }>;
  clubMemberships: Array<{
    club: { id: string; name: string; description: string };
  }>;
  coaches: Array<{
    coach: { id: string; name: string; email: string };
  }>;
  athletes: Array<{
    athlete: { id: string; name: string; email: string };
  }>;
  _count: {
    workoutPlans: number;
    workoutTemplates: number;
    clubMemberships: number;
  };
}

type ProfileFormState = {
  name: string;
  firstName: string;
  surname: string;
  country: string;
  gender: string;
  birthdate: string;
  preferredLanguage: string;
};

function readProfileHash(): 'member-info' | 'member-profile' | null {
  if (typeof window === 'undefined') return null;
  const id = window.location.hash.replace(/^#/, '');
  if (id === 'member-info' || id === 'member-profile') return id;
  return null;
}

function scrollToHash(hash: string) {
  if (!hash) return;
  const id = hash.replace(/^#/, '');
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function formatBirthdateInput(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function UserProfile({ embedded = false }: { embedded?: boolean }) {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [profileHash, setProfileHash] = useState<'member-info' | 'member-profile' | null>(null);
  const [form, setForm] = useState<ProfileFormState>({
    name: '',
    firstName: '',
    surname: '',
    country: '',
    gender: '',
    birthdate: '',
    preferredLanguage: 'en',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [avatarOverride, setAvatarOverride] = useState<string | null | undefined>(undefined);

  const applyProfileToForm = useCallback((data: UserProfileData) => {
    setForm({
      name: data.name ?? '',
      firstName: data.firstName ?? '',
      surname: data.surname ?? '',
      country: data.country ?? '',
      gender: data.gender ?? '',
      birthdate: formatBirthdateInput(data.birthdate),
      preferredLanguage: data?.settings?.language || 'en',
    });
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/user/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = (await response.json()) as UserProfileData;
        setProfile(data);
        applyProfileToForm(data);
      } else {
        setError('Failed to load profile');
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Error loading profile');
    } finally {
      setLoading(false);
    }
  }, [applyProfileToForm]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const syncHash = () => {
      const hash = readProfileHash();
      setProfileHash(hash);
      scrollToHash(window.location.hash);
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, [loading, profile]);

  const saveProfile = async (e?: FormEvent) => {
    e?.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setSaveMessage('Please sign in to save your profile.');
        return;
      }

      const displayName = form.name.trim();
      if (!displayName) {
        setSaveMessage('Display name is required.');
        return;
      }

      setSaving(true);
      setSaveMessage(null);

      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: displayName,
          firstName: form.firstName.trim() || null,
          surname: form.surname.trim() || null,
          country: form.country.trim() || null,
          gender: form.gender.trim() || null,
          birthdate: form.birthdate.trim() || null,
          language: form.preferredLanguage,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save profile');
      }

      await loadProfile();

      localStorage.setItem('language', form.preferredLanguage);
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser) as Record<string, unknown>;
          parsed.language = form.preferredLanguage;
          parsed.name = displayName;
          if (form.country.trim()) parsed.country = form.country.trim();
          localStorage.setItem('user', JSON.stringify(parsed));
        } catch (err) {
          console.error('Failed to update local user cache:', err);
        }
      }

      setSaveMessage('Profile saved successfully.');
    } catch (err) {
      console.error('Error saving profile:', err);
      setSaveMessage(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={embedded ? 'bg-gray-50' : 'min-h-screen bg-gray-50'}>
        {!embedded && <ModernNavbar />}
        <div className={`flex items-center justify-center ${embedded ? 'py-12' : 'min-h-[60vh]'}`}>
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={embedded ? 'bg-gray-50' : 'min-h-screen bg-gray-50'}>
        {!embedded && <ModernNavbar />}
        <div className={`flex items-center justify-center ${embedded ? 'py-12' : 'min-h-[60vh]'}`}>
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Failed to load profile'}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                loadProfile();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayName =
    [form.firstName, form.surname].filter(Boolean).join(' ').trim() || form.name || profile.name;
  const editProfileMode = profileHash === 'member-profile';
  const avatarSrc = resolvePublicImageUrl(avatarOverride ?? profile.image);
  const dashboardHref = getDashboardPathForUserType(profile.userType);

  return (
    <div className={embedded ? 'bg-gray-50' : 'min-h-screen bg-gray-50'}>
      {!embedded && <ModernNavbar />}
      <ChangeProfilePhotoModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onSaved={(patch) => {
          if (patch.image !== undefined) {
            setAvatarOverride(patch.image);
            setProfile((prev) => (prev ? { ...prev, image: patch.image } : prev));
          }
        }}
        currentImagePath={avatarOverride ?? profile.image}
        t={t}
      />
      <div className={`max-w-6xl mx-auto ${embedded ? 'p-4' : 'p-4 md:p-8'}`}>
        {!embedded && (
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <Link href={dashboardHref} className="text-blue-600 hover:text-blue-800 font-medium">
              ← Back to dashboard
            </Link>
            <span className="text-gray-300">|</span>
            <a href="#member-info" className="text-gray-600 hover:text-gray-900">
              Member info
            </a>
            <a href="#member-profile" className="text-gray-600 hover:text-gray-900 font-medium">
              Member profile
            </a>
          </div>
        )}
        {/* Header */}
        {!embedded && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-800">{displayName}</h1>
                <p className="text-gray-600 flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4" />
                  {profile.email}
                </p>
                <p className="text-gray-600 flex items-center gap-2 mt-1">
                  <User className="w-4 h-4" />@{profile.username}
                </p>
                <div className="mt-2">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                    {profile.userType.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Member Since
                </p>
                <p className="font-semibold">{new Date(profile.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Member info — read-only summary */}
        {!embedded && !editProfileMode && (
        <section
          id="member-info"
          className="scroll-mt-24 bg-white rounded-lg shadow-lg p-6 mb-6"
        >
          <h2 className="text-xl font-bold text-gray-800 mb-4">Member info</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500 font-medium">Display name</dt>
              <dd className="text-gray-900 mt-0.5">{displayName}</dd>
            </div>
            <div>
              <dt className="text-gray-500 font-medium">Username</dt>
              <dd className="text-gray-900 mt-0.5">@{profile.username}</dd>
            </div>
            <div>
              <dt className="text-gray-500 font-medium">Email</dt>
              <dd className="text-gray-900 mt-0.5">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-gray-500 font-medium">Account type</dt>
              <dd className="text-gray-900 mt-0.5">{profile.userType.replace('_', ' ')}</dd>
            </div>
            <div>
              <dt className="text-gray-500 font-medium">Country</dt>
              <dd className="text-gray-900 mt-0.5">{form.country || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 font-medium">Preferred language</dt>
              <dd className="text-gray-900 mt-0.5">{form.preferredLanguage.toUpperCase()}</dd>
            </div>
          </dl>
        </section>
        )}

        {/* Member profile — editable */}
        <section
          id="member-profile"
          className={`scroll-mt-24 bg-white rounded-lg shadow-lg p-6 mb-6 ${
            editProfileMode ? 'ring-2 ring-blue-500/40' : ''
          }`}
        >
          <h2 className="text-xl font-bold text-gray-800 mb-1">Member profile</h2>
          <p className="text-sm text-gray-600 mb-4">
            Edit your details below, then click Save profile to update your account.
          </p>

          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden shrink-0">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowPhotoModal(true)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2"
            >
              Change profile photo
            </button>
          </div>

          <form onSubmit={saveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 mb-1">
                Display name
              </label>
              <input
                id="profile-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="profile-username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="profile-username"
                type="text"
                value={profile.username}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label htmlFor="profile-first" className="block text-sm font-medium text-gray-700 mb-1">
                First name
              </label>
              <input
                id="profile-first"
                type="text"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="profile-surname" className="block text-sm font-medium text-gray-700 mb-1">
                Surname
              </label>
              <input
                id="profile-surname"
                type="text"
                value={form.surname}
                onChange={(e) => setForm((f) => ({ ...f, surname: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="profile-country" className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <select
                id="profile-country"
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Select country —</option>
                {ALL_COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="profile-lang" className="block text-sm font-medium text-gray-700 mb-1">
                Preferred language
              </label>
              <select
                id="profile-lang"
                value={form.preferredLanguage}
                onChange={(e) => setForm((f) => ({ ...f, preferredLanguage: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.code.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="profile-gender" className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                id="profile-gender"
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Select —</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="profile-birthdate" className="block text-sm font-medium text-gray-700 mb-1">
                Birthdate
              </label>
              <input
                id="profile-birthdate"
                type="date"
                value={form.birthdate}
                onChange={(e) => setForm((f) => ({ ...f, birthdate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="profile-email"
                type="email"
                value={profile.email}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
            <div className="md:col-span-2 mt-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {saving ? 'Saving...' : 'Save profile'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => profile && applyProfileToForm(profile)}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium"
              >
                Reset
              </button>
              {saveMessage ? (
                <p
                  role="status"
                  className={`text-sm ${saveMessage.includes('success') ? 'text-green-700' : 'text-red-600'}`}
                >
                  {saveMessage}
                </p>
              ) : null}
            </div>
          </form>
        </section>

        {/* Statistics */}
        {!embedded && !editProfileMode && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-800">{profile._count.workoutPlans}</p>
            <p className="text-sm text-gray-600">Workout Plans</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <SettingsIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-800">{profile._count.workoutTemplates}</p>
            <p className="text-sm text-gray-600">Templates</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <Users className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-800">{profile._count.clubMemberships}</p>
            <p className="text-sm text-gray-600">Club Memberships</p>
          </div>
        </div>
        )}

        {!embedded && !editProfileMode && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {profile.periods && profile.periods.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Training Periods
              </h2>
              <div className="space-y-3">
                {profile.periods.map((period) => (
                  <div
                    key={period.id}
                    className="p-4 rounded-lg border-2 hover:shadow-md transition-shadow"
                    style={{ borderColor: period.color }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex-shrink-0"
                        style={{ backgroundColor: period.color }}
                      />
                      <div className="flex-1">
                        <span className="font-semibold text-lg">{period.name}</span>
                        {period.description && (
                          <p className="text-sm text-gray-600 mt-1">{period.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {profile.sections && profile.sections.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                Workout Sections
              </h2>
              <div className="space-y-3">
                {profile.sections.map((section) => (
                  <div
                    key={section.id}
                    className="p-4 rounded-lg border-2 hover:shadow-md transition-shadow"
                    style={{ borderColor: section.color }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex-shrink-0"
                        style={{ backgroundColor: section.color }}
                      />
                      <div className="flex-1">
                        <span className="font-semibold text-lg">{section.name}</span>
                        {section.description && (
                          <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        )}

        {!embedded && !editProfileMode && profile.clubMemberships && profile.clubMemberships.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              My Clubs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.clubMemberships.map((membership) => (
                <div
                  key={membership.club.id}
                  className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 hover:shadow-lg transition-all border border-blue-200"
                >
                  <h3 className="font-semibold text-lg text-gray-800">{membership.club.name}</h3>
                  {membership.club.description && (
                    <p className="text-sm text-gray-600 mt-2">{membership.club.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!embedded && !editProfileMode && profile.coaches && profile.coaches.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5" />
              My Coaches
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.coaches.map((relationship) => (
                <div
                  key={relationship.coach.id}
                  className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-teal-50 hover:shadow-lg transition-all border border-green-200"
                >
                  <h3 className="font-semibold text-lg text-gray-800">{relationship.coach.name}</h3>
                  <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4" />
                    {relationship.coach.email}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!embedded && !editProfileMode && profile.athletes && profile.athletes.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              My Athletes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.athletes.map((relationship) => (
                <div
                  key={relationship.athlete.id}
                  className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-yellow-50 hover:shadow-lg transition-all border border-orange-200"
                >
                  <h3 className="font-semibold text-lg text-gray-800">{relationship.athlete.name}</h3>
                  <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4" />
                    {relationship.athlete.email}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
