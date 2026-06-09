'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface ForceRecreatePlanButtonProps {
  activeSection: 'A' | 'B' | 'C' | 'D';
  onRecreated: () => void;
}

export default function ForceRecreatePlanButton({ activeSection, onRecreated }: ForceRecreatePlanButtonProps) {
  const [isRecreating, setIsRecreating] = useState(false);

  const handleForceRecreate = async () => {
    if (!confirm('This will delete and recreate your workout plan to start on Monday. All existing workouts will be preserved. Continue?')) {
      return;
    }

    setIsRecreating(true);
    
    try {
      const token = localStorage.getItem('token');
      const planTypeMap = {
        'A': 'CURRENT_WEEKS',
        'B': 'YEARLY_PLAN',
        'C': 'MEALS_DONE',
        'D': 'YEARLY_PLAN'
      };
      
      // Call the API with forceRecreate=true
      const response = await fetch(`/api/nutrition/plan?type=${planTypeMap[activeSection]}&forceRecreate=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        alert('✅ Plan recreated successfully! It now starts on Monday.');
        onRecreated();
      } else {
        const error = await response.json();
        alert(`Failed to recreate plan: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error recreating plan:', error);
      alert('Error recreating plan. Check console for details.');
    } finally {
      setIsRecreating(false);
    }
  };

  return (
    <button
      onClick={handleForceRecreate}
      disabled={isRecreating}
      className="px-3 py-1.5 bg-orange-600 text-white hover:bg-orange-700 rounded text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="Force recreate plan to start on Monday"
    >
      <RefreshCw className={`w-4 h-4 ${isRecreating ? 'animate-spin' : ''}`} />
      {isRecreating ? 'Recreating...' : 'Fix Monday Start'}
    </button>
  );
}

