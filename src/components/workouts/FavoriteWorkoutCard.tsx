'use client';

import { useState } from 'react';
import { Star, Eye, Calendar, Edit2, Trash2, Dumbbell, Target, Zap, Tag } from 'lucide-react';
import { SPORT_OPTIONS } from '@/constants/workout.constants';
import { WORKOUT_GOALS } from '@/components/workouts/WorkoutInfoModal';

interface FavoriteWorkoutCardProps {
  workout: any;
  onDelete: (id: string) => void;
  onOverview: (workout: any) => void;
  onUseInPlanner: (workout: any) => void;
  onUpdate?: () => void;
}

export default function FavoriteWorkoutCard({ 
  workout, 
  onDelete, 
  onOverview, 
  onUseInPlanner,
  onUpdate
}: FavoriteWorkoutCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Parse the workoutData JSON with error handling
  let workoutData = null;
  try {
    if (workout.workoutData) {
      workoutData = typeof workout.workoutData === 'string' 
        ? JSON.parse(workout.workoutData) 
        : workout.workoutData;
    }
  } catch (error) {
    console.error('Error parsing workoutData:', error);
    workoutData = null;
  }
  
  const workoutInfo = workoutData?.workout || {};
  
  // Get moveframes count
  const moveframesCount = workoutData?.moveframes?.length || 0;
  
  // Get sports list
  const sportsList = workoutData?.sports?.map((s: any) => s.sport).join(', ') || workout.sports || '';
  const sportsArray = sportsList.split(',').filter((s: string) => s.trim());

  // Editable fields state
  const [workoutName, setWorkoutName] = useState(workout.name || workoutInfo.name || '');
  const [workoutCode, setWorkoutCode] = useState(workoutInfo.code || '');
  const [mainSport, setMainSport] = useState(workoutInfo.mainSport || '');
  const [mainGoal, setMainGoal] = useState(workoutInfo.mainGoal || '');
  const [intensity, setIntensity] = useState(workoutInfo.intensity || workout.intensity || 'Medium');
  const [tags, setTags] = useState(workoutInfo.tags || workout.tags || '');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Not authenticated');
        return;
      }

      // Update the workoutData JSON
      const updatedWorkoutData = {
        ...workoutData,
        workout: {
          ...workoutInfo,
          name: workoutName,
          code: workoutCode,
          mainSport,
          mainGoal,
          intensity,
          tags
        }
      };

      const response = await fetch(`/api/workouts/favorites/${workout.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: workoutName,
          workoutData: JSON.stringify(updatedWorkoutData),
          intensity,
          tags
        })
      });

      if (response.ok) {
        alert('✅ Changes saved successfully!');
        setShowEditModal(false);
        if (onUpdate) {
          onUpdate();
        }
      } else {
        alert('Failed to save changes');
      }
    } catch (error) {
      console.error('Error saving workout:', error);
      alert('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Get main sport icon
  const mainSportIcon = SPORT_OPTIONS.find(s => s.value === mainSport)?.icon || '💪';
  
  // Get main goal label
  const mainGoalLabel = WORKOUT_GOALS.find(g => g.value === mainGoal)?.label || mainGoal;

  // Format intensity color
  const getIntensityColor = (int: string) => {
    switch(int?.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'very high': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-blue-300 hover:shadow-lg transition">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            <h3 className="font-bold text-gray-900 line-clamp-1">{workoutName || 'Unnamed Workout'}</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
              title="Edit workout"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (confirm('Delete this workout from favorites?')) {
                  onDelete(workout.id);
                }
              }}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Delete workout"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {workoutCode && (
          <div className="mb-3 text-sm">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-mono">
              {workoutCode}
            </span>
          </div>
        )}
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Moveframes:</span>
            <span className="font-semibold text-gray-900">{moveframesCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Sports:</span>
            <span className="font-semibold text-gray-900">{sportsArray.length > 0 ? sportsArray.length : '-'}</span>
          </div>
          {mainSport && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Main Sport:</span>
              <span className="font-semibold text-gray-900">{mainSportIcon} {SPORT_OPTIONS.find(s => s.value === mainSport)?.label || mainSport}</span>
            </div>
          )}
          {mainGoal && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Goal:</span>
              <span className="font-semibold text-gray-900 line-clamp-1">{mainGoalLabel}</span>
            </div>
          )}
          <div className="flex justify-between text-sm items-center">
            <span className="text-gray-500">Intensity:</span>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getIntensityColor(intensity)}`}>
              {intensity || 'Medium'}
            </span>
          </div>
        </div>
        
        {tags && typeof tags === 'string' && tags.trim() && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {tags.split(',').filter((tag: string) => tag.trim()).map((tag: string, idx: number) => (
                <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                  {tag.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <button
            onClick={() => onUseInPlanner(workout)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
            title="Add to planner"
          >
            <Calendar className="w-4 h-4" />
            Use in my planner
          </button>
          <button
            onClick={() => onOverview(workout)}
            className="px-4 py-2 border-2 border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition"
            title="View overview"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b-2 border-gray-200 px-6 py-4">
              <h2 className="text-2xl font-bold text-gray-900">Edit Workout</h2>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Workout Name</label>
                <input
                  type="text"
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter workout name..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Workout Code</label>
                <input
                  type="text"
                  value={workoutCode}
                  onChange={(e) => setWorkoutCode(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 0101-1 5 Jan"
                />
              </div>

              {/* Main Sport */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" />
                  Main Sport
                </label>
                <select 
                  value={mainSport}
                  onChange={(e) => setMainSport(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select main sport...</option>
                  {SPORT_OPTIONS.map((sport) => (
                    <option key={sport.value} value={sport.value}>
                      {sport.icon} {sport.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Main Goal */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Main Workout Goal
                </label>
                <select
                  value={mainGoal}
                  onChange={(e) => setMainGoal(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select goal...</option>
                  {WORKOUT_GOALS.map((goal) => (
                    <option key={goal.value} value={goal.value}>
                      {goal.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Intensity */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Intensity
                </label>
                <select
                  value={intensity}
                  onChange={(e) => setIntensity(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Very High">Very High</option>
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., swimming, endurance, morning"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
