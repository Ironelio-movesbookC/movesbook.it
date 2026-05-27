import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardPathForUserType, isTeamAccountUserType } from '@/utils/dashboardRouting';

export function useTeamDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my-page' | 'my-entity'>('my-page');

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Load selected team from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedTeam');
      if (saved) setSelectedTeamId(saved);
    }
  }, []);

  // Redirect if not team manager
  useEffect(() => {
    if (user && !isTeamAccountUserType(user.userType)) {
      router.replace(getDashboardPathForUserType(user.userType));
    }
  }, [user, router]);

  // Load teams
  useEffect(() => {
    if (user && isTeamAccountUserType(user.userType)) {
      loadTeams();
    }
  }, [user]);

  const loadTeams = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/teams/my-teams', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const handleTeamSelect = (teamId: string) => {
    localStorage.setItem('selectedTeam', teamId);
    window.location.href = `/my-team?teamId=${teamId}`;
  };

  return {
    user,
    loading,
    teams,
    selectedTeamId,
    activeTab,
    setActiveTab,
    handleTeamSelect
  };
}

