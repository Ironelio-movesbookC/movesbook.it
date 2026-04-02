import { useState, useEffect } from 'react';

interface User {
  userType: string;
}

export function useMyPageData(user: User | null) {
  const [clubs, setClubs] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [coachingGroups, setCoachingGroups] = useState<any[]>([]);
  const [myCoaches, setMyCoaches] = useState<any[]>([]);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [myClubs, setMyClubs] = useState<any[]>([]);
  const [myGroups, setMyGroups] = useState<any[]>([]);

  const loadClubs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/clubs/my-clubs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setClubs(data.clubs || []);
      }
    } catch (error) {
      console.error('Error loading clubs:', error);
    }
  };

  const loadGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/groups/my-groups', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadTeams = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/teams/my-teams', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const loadCoachingGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/coaching-groups/my-coaching-groups', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCoachingGroups(data.coachingGroups || []);
      }
    } catch (error) {
      console.error('Error loading coaching groups:', error);
    }
  };

  const loadMyCoaches = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/athletes/my-coaching-groups', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMyCoaches(data.coachingGroups || []);
      }
    } catch (error) {
      console.error('Error loading my coaches:', error);
    }
  };

  const loadMyTeams = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/athletes/my-teams', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMyTeams(data.teams || []);
      }
    } catch (error) {
      console.error('Error loading my teams:', error);
    }
  };

  const loadMyClubs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/athletes/my-clubs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMyClubs(data.clubs || []);
      }
    } catch (error) {
      console.error('Error loading my clubs:', error);
    }
  };

  const loadMyGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/athletes/my-groups', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMyGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error loading my groups:', error);
    }
  };

  useEffect(() => {
    if (user) {
      if (user.userType === 'CLUB_TRAINER' || user.userType === 'CLUB') {
        loadClubs();
      } else if (user.userType === 'GROUP_ADMIN') {
        loadGroups();
      } else if (user.userType === 'TEAM_MANAGER') {
        loadTeams();
      } else if (user.userType === 'COACH') {
        loadCoachingGroups();
      } else if (user.userType === 'ATHLETE') {
        loadMyCoaches();
        loadMyTeams();
        loadMyClubs();
        loadMyGroups();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return {
    clubs,
    groups,
    teams,
    coachingGroups,
    myCoaches,
    myTeams,
    myClubs,
    myGroups
  };
}

