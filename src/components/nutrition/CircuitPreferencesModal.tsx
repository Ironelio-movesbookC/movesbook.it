// 2026-01-21 22:00 UTC - Circuit Exercise Selection Preferences Modal
'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { t } = useLanguage();
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
              <option value="strength">{t('exercise_typology_strength')}</option>
              <option value="isotonic">{t('exercise_typology_isotonic')}</option>
              <option value="aerobic">{t('exercise_typology_aerobic')}</option>
              <option value="stretching">{t('exercise_typology_stretching')}</option>
              <option value="gymnic">{t('exercise_typology_gymnic')}</option>
              <option value="pilates">{t('exercise_typology_pilates')}</option>
              <option value="calistenic">{t('exercise_typology_calistenic')}</option>
              <option value="spartan">{t('exercise_typology_spartan')}</option>
              <option value="crossfit">{t('exercise_typology_crossfit')}</option>
              <option value="technical_moves_for_sports">{t('exercise_typology_technical_moves_for_sports')}</option>
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
              <option value="barbell">{t('equipment_category_barbell')}</option>
              <option value="dumbbells">{t('equipment_category_dumbbells')}</option>
              <option value="cables">{t('equipment_category_cables')}</option>
              <option value="cable_machine">{t('equipment_category_cable_machine')}</option>
              <option value="multi_gym">{t('equipment_category_multi_gym')}</option>
              <option value="free_body">{t('equipment_category_free_body')}</option>
              <option value="lever_machines">{t('equipment_category_lever_machines')}</option>
              <option value="bands">{t('equipment_category_bands')}</option>
              <option value="fitball">{t('equipment_category_fitball')}</option>
              <option value="kettlebell">{t('equipment_category_kettlebell')}</option>
              <option value="bench">{t('equipment_category_bench')}</option>
              <option value="trx">{t('equipment_category_trx')}</option>
              <option value="bar">{t('equipment_category_bar')}</option>
              <option value="medicine_ball">{t('equipment_category_medicine_ball')}</option>
              <option value="aerobic_machine">{t('equipment_category_aerobic_machine')}</option>
              <option value="rope">{t('equipment_category_rope')}</option>
              <option value="bosu">{t('equipment_category_bosu')}</option>
              <option value="power_sled">{t('equipment_category_power_sled')}</option>
              <option value="treadmill">{t('equipment_category_treadmill')}</option>
              <option value="wall_bars">{t('equipment_category_wall_bars')}</option>
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
              <option value="shoulder">{t('muscular_group_shoulder')}</option>
              <option value="trapezius">{t('muscular_group_trapezius')}</option>
              <option value="chest">{t('muscular_group_chest')}</option>
              <option value="biceps">{t('muscular_group_biceps')}</option>
              <option value="triceps">{t('muscular_group_triceps')}</option>
              <option value="forearm">{t('muscular_group_forearm')}</option>
              <option value="abdominals">{t('muscular_group_abdominals')}</option>
              <option value="obliques">{t('muscular_group_obliques')}</option>
              <option value="gluteus">{t('muscular_group_gluteus')}</option>
              <option value="front_leg">{t('muscular_group_front_leg')}</option>
              <option value="rear_leg">{t('muscular_group_rear_leg')}</option>
              <option value="calf">{t('muscular_group_calf')}</option>
              <option value="tibial">{t('muscular_group_tibial')}</option>
              <option value="all_body_superior">{t('muscular_group_all_body_superior')}</option>
              <option value="all_body_inferior">{t('muscular_group_all_body_inferior')}</option>
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

