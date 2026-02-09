'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Download, User, Users, Building2 } from 'lucide-react';

interface ImportWorkoutsModalProps {
  targetSection: 'A' | 'B';
  onClose: () => void;
  onImport: (source: string, sourceId: string, workouts: any[]) => void;
}

export default function ImportWorkoutsModal({ targetSection, onClose, onImport }: ImportWorkoutsModalProps) {
  const [sourceType, setSourceType] = useState<'coach' | 'team' | 'club'>('coach');
  const [sources, setSources] = useState<any[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [availableWorkouts, setAvailableWorkouts] = useState<any[]>([]);
  const [selectedWorkouts, setSelectedWorkouts] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const loadSources = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const endpoints = {
        'coach': '/api/athletes/my-coaches',
        'team': '/api/athletes/my-teams',
        'club': '/api/athletes/my-clubs'
      };
      
      const response = await fetch(endpoints[sourceType], {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSources(data[sourceType + 's'] || []);
      }
    } catch (error) {
      console.error('Error loading sources:', error);
    }
    setIsLoading(false);
  }, [sourceType]);

  const loadAvailableWorkouts = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/workouts/shared?sourceType=${sourceType}&sourceId=${selectedSource}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        setAvailableWorkouts(data.workouts || []);
      }
    } catch (error) {
      console.error('Error loading workouts:', error);
    }
    setIsLoading(false);
  }, [sourceType, selectedSource]);

  useEffect(() => {
    loadSources();
  }, [sourceType, loadSources]);

  useEffect(() => {
    if (selectedSource) {
      loadAvailableWorkouts();
    }
  }, [selectedSource, loadAvailableWorkouts]);

  const toggleWorkoutSelection = (workoutId: string) => {
    const newSelected = new Set(selectedWorkouts);
    if (newSelected.has(workoutId)) {
      newSelected.delete(workoutId);
    } else {
      newSelected.add(workoutId);
    }
    setSelectedWorkouts(newSelected);
  };

  const handleImport = () => {
    const workoutsToImport = availableWorkouts.filter(w => selectedWorkouts.has(w.id));
    onImport(sourceType, selectedSource!, workoutsToImport);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Import Workouts to Section {targetSection}</h2>
            <p className="text-sm text-gray-600 mt-1">Select workouts from your coach, team, or club</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Source Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Import from:
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => {
                  setSourceType('coach');
                  setSelectedSource(null);
                  setSelectedWorkouts(new Set());
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                  sourceType === 'coach'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <User className="w-5 h-5" />
                <span className="font-medium">My Coach</span>
              </button>
              
              <button
                onClick={() => {
                  setSourceType('team');
                  setSelectedSource(null);
                  setSelectedWorkouts(new Set());
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                  sourceType === 'team'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="font-medium">My Team</span>
              </button>
              
              <button
                onClick={() => {
                  setSourceType('club');
                  setSelectedSource(null);
                  setSelectedWorkouts(new Set());
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                  sourceType === 'club'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span className="font-medium">My Club</span>
              </button>
            </div>
          </div>

          {/* Select specific source */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select {sourceType}:
            </label>
            {isLoading && !selectedSource ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : sources.length > 0 ? (
              <select
                value={selectedSource || ''}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select {sourceType} --</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name || source.officialName || source.username}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-gray-500 text-sm">No {sourceType}s found</p>
            )}
          </div>

          {/* Available Workouts */}
          {selectedSource && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Available Workouts:
              </label>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : availableWorkouts.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                  {availableWorkouts.map((workout) => (
                    <label
                      key={workout.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedWorkouts.has(workout.id)
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-gray-50 border-2 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedWorkouts.has(workout.id)}
                        onChange={() => toggleWorkoutSelection(workout.id)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{workout.name}</div>
                        <div className="text-xs text-gray-500">{workout.code} - {new Date(workout.date).toLocaleDateString()}</div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">No workouts available to import</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={selectedWorkouts.size === 0}
            className={`flex-1 px-6 py-3 rounded-lg transition-colors font-medium ${
              selectedWorkouts.size > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Download className="w-4 h-4 inline mr-2" />
            Import {selectedWorkouts.size} Workout{selectedWorkouts.size !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

