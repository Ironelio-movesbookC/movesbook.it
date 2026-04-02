// Store selected entity in session for persistence
export const storeSelectedEntity = (entityType: string, entityId: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`selected${entityType}`, entityId);
  }
};

// Get entity type string for API calls
export const getEntityType = (userType: string | undefined): 'club' | 'team' | 'group' | 'coaching-group' | undefined => {
  if (userType === 'CLUB_TRAINER' || userType === 'CLUB') return 'club';
  if (userType === 'TEAM_MANAGER') return 'team';
  if (userType === 'GROUP_ADMIN') return 'group';
  if (userType === 'COACH') return 'coaching-group';
  return undefined;
};

