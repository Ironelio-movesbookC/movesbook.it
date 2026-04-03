'use client';

import { useEffect, useState } from 'react';
import { User, Mail, Calendar, Users, Award, Trophy, Settings as SettingsIcon } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@/constants/tools.constants';

interface UserProfile {
  id: string;
  email: string;
  username: string;
  name: string;
  userType: string;
  createdAt: string;
  settings: any;
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

export default function UserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [savingLanguage, setSavingLanguage] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setPreferredLanguage(data?.settings?.language || 'en');
      } else {
        setError('Failed to load profile');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Error loading profile');
    } finally {
      setLoading(false);
    }
  };

  const savePreferredLanguage = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      setSavingLanguage(true);
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ language: preferredLanguage })
      });
      if (!response.ok) {
        throw new Error('Failed to save language');
      }
      localStorage.setItem('language', preferredLanguage);
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          localStorage.setItem('user', JSON.stringify({ ...parsed, language: preferredLanguage }));
        } catch (e) {
          console.error('Failed to update local user language cache:', e);
        }
      }
      window.location.reload();
    } catch (e) {
      console.error('Error saving preferred language:', e);
      alert('Failed to save language preference');
    } finally {
      setSavingLanguage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Failed to load profile'}</p>
          <button
            onClick={loadProfile}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-800">{profile.name}</h1>
            <p className="text-gray-600 flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4" />
              {profile.email}
            </p>
            <p className="text-gray-600 flex items-center gap-2 mt-1">
              <User className="w-4 h-4" />
              @{profile.username}
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
            <p className="font-semibold">
              {new Date(profile.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics */}
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

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Profile Language</h2>
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-2">Preferred language for Movesbook terms</label>
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className="w-full md:max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.code.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={savePreferredLanguage}
            disabled={savingLanguage}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {savingLanguage ? 'Saving...' : 'Save Language'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Training Periods (Migrated Data!) */}
        {profile.periods && profile.periods.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Training Periods
            </h2>
            <div className="space-y-3">
              {profile.periods.map(period => (
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

        {/* Workout Sections (Migrated Data!) */}
        {profile.sections && profile.sections.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              Workout Sections
            </h2>
            <div className="space-y-3">
              {profile.sections.map(section => (
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

      {/* Clubs (If Migrated) */}
      {profile.clubMemberships && profile.clubMemberships.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            My Clubs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.clubMemberships.map(membership => (
              <div
                key={membership.club.id}
                className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 hover:shadow-lg transition-all border border-blue-200"
              >
                <h3 className="font-semibold text-lg text-gray-800">{membership.club.name}</h3>
                {membership.club.description && (
                  <p className="text-sm text-gray-600 mt-2">
                    {membership.club.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coaches (If Migrated) */}
      {profile.coaches && profile.coaches.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" />
            My Coaches
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.coaches.map(relationship => (
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

      {/* Athletes (If user is a coach) */}
      {profile.athletes && profile.athletes.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            My Athletes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.athletes.map(relationship => (
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
  );
}

