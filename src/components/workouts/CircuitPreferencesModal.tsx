// 2026-01-21 22:00 UTC - Circuit Exercise Selection Preferences Modal
'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface CircuitPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preferences: ExercisePreferences) => void;
}

export interface ExercisePreferences {
  typeOfExercise: string;
  equipments: string;
  sportSuggested: string;
  muscularArea: string;
  libraryOfExercises: string;
  favouritesToUse: string;
}

export default function CircuitPreferencesModal({ isOpen, onClose, onSave }: CircuitPreferencesModalProps) {
  // 2026-01-21 22:00 UTC - Preference state
  const [preferences, setPreferences] = useState<ExercisePreferences>({
    typeOfExercise: '',
    equipments: '',
    sportSuggested: '',
    muscularArea: '',
    libraryOfExercises: '',
    favouritesToUse: ''
  });

  const handleClear = (field: keyof ExercisePreferences) => {
    setPreferences(prev => ({
      ...prev,
      [field]: ''
    }));
  };

  const handleProceed = () => {
    onSave(preferences);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        {/* Title - 2026-01-21 22:00 UTC */}
        <h3 className="text-base font-semibold text-gray-900 mb-6 text-center">
          Select your preferences for the selection of the exercises
        </h3>

        {/* Form Fields - 2026-01-21 22:00 UTC */}
        <div className="space-y-3">
          {/* Type of exercise */}
          <div className="flex items-center gap-2">
            <select
              value={preferences.typeOfExercise}
              onChange={(e) => setPreferences(prev => ({ ...prev, typeOfExercise: e.target.value }))}
              className="flex-1 px-3 py-2 border-2 border-blue-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">Type of exercise</option>
              {/* TODO: Populate from database */}
              <option value="strength">Strength</option>
              <option value="cardio">Cardio</option>
              <option value="flexibility">Flexibility</option>
              <option value="balance">Balance</option>
            </select>
            <button
              onClick={() => handleClear('typeOfExercise')}
              className="p-1.5 hover:bg-gray-100 rounded-full"
              title="Clear"
            >
              <X size={18} className="text-gray-600" />
            </button>
          </div>

          {/* Equipments */}
          <div className="flex items-center gap-2">
            <select
              value={preferences.equipments}
              onChange={(e) => setPreferences(prev => ({ ...prev, equipments: e.target.value }))}
              className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-400"
            >
              <option value="">Equipments</option>
              {/* TODO: Populate from database */}
              <option value="barbell">Barbell</option>
              <option value="dumbbell">Dumbbell</option>
              <option value="machine">Machine</option>
              <option value="bodyweight">Bodyweight</option>
            </select>
            <button
              onClick={() => handleClear('equipments')}
              className="p-1.5 hover:bg-gray-100 rounded-full"
              title="Clear"
            >
              <X size={18} className="text-gray-600" />
            </button>
          </div>

          {/* Sport suggested */}
          <div className="flex items-center gap-2">
            <select
              value={preferences.sportSuggested}
              onChange={(e) => setPreferences(prev => ({ ...prev, sportSuggested: e.target.value }))}
              className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-400"
            >
              <option value="">Sport suggested</option>
              {/* TODO: Populate from database */}
              <option value="bodybuilding">Body Building</option>
              <option value="crossfit">CrossFit</option>
              <option value="calistenic">Calistenic</option>
            </select>
            <button
              onClick={() => handleClear('sportSuggested')}
              className="p-1.5 hover:bg-gray-100 rounded-full"
              title="Clear"
            >
              <X size={18} className="text-gray-600" />
            </button>
          </div>

          {/* Muscular area */}
          <div className="flex items-center gap-2">
            <select
              value={preferences.muscularArea}
              onChange={(e) => setPreferences(prev => ({ ...prev, muscularArea: e.target.value }))}
              className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-400"
            >
              <option value="">Muscular area</option>
              {/* TODO: Populate from database */}
              <option value="chest">Chest</option>
              <option value="back">Back</option>
              <option value="legs">Legs</option>
              <option value="shoulders">Shoulders</option>
              <option value="arms">Arms</option>
            </select>
            <button
              onClick={() => handleClear('muscularArea')}
              className="p-1.5 hover:bg-gray-100 rounded-full"
              title="Clear"
            >
              <X size={18} className="text-gray-600" />
            </button>
          </div>

          {/* Library of exercises */}
          <div className="flex items-center gap-2">
            <select
              value={preferences.libraryOfExercises}
              onChange={(e) => setPreferences(prev => ({ ...prev, libraryOfExercises: e.target.value }))}
              className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-400"
            >
              <option value="">Library of exercises</option>
              {/* TODO: Populate from database */}
              <option value="main">Main Library</option>
              <option value="custom">Custom Library</option>
              <option value="community">Community Library</option>
            </select>
            <button
              onClick={() => handleClear('libraryOfExercises')}
              className="p-1.5 hover:bg-gray-100 rounded-full"
              title="Clear"
            >
              <X size={18} className="text-gray-600" />
            </button>
          </div>

          {/* Favourites to use */}
          <div className="flex items-center gap-2">
            <select
              value={preferences.favouritesToUse}
              onChange={(e) => setPreferences(prev => ({ ...prev, favouritesToUse: e.target.value }))}
              className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-400"
            >
              <option value="">Favourites to use</option>
              {/* TODO: Populate from database */}
              <option value="yes">Use Favourites</option>
              <option value="no">Don't Use Favourites</option>
              <option value="only">Only Favourites</option>
            </select>
            <button
              onClick={() => handleClear('favouritesToUse')}
              className="p-1.5 hover:bg-gray-100 rounded-full"
              title="Clear"
            >
              <X size={18} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Action Buttons - 2026-01-21 22:00 UTC */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={handleProceed}
            className="px-8 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 font-medium text-sm"
          >
            Proceed
          </button>
          <button
            onClick={handleCancel}
            className="px-8 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-medium text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

