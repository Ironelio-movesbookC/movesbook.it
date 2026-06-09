'use client';

import React from 'react';

interface WorkoutLeftSidebarProps {
  activeSection: 'A' | 'B' | 'C' | 'D';
  onSectionChange: (section: 'A' | 'B' | 'C' | 'D') => void;
  onAddNewDay?: () => void;
  onAddWorkout?: () => void;
  onAddNutritionFood?: () => void;
  onOpenSettings?: () => void;
  onOpenHierarchyGuide?: () => void;
}

export default function WorkoutLeftSidebar({
  activeSection,
  onSectionChange,
  onAddNewDay,
  onAddWorkout,
  onAddNutritionFood,
  onOpenSettings,
  onOpenHierarchyGuide
}: WorkoutLeftSidebarProps) {
  
  const sections = [
    { id: 'A' as const, title: 'Create template plans', subtitle: 'Plans A, B, C', icon: '📝' },
    { id: 'B' as const, title: 'Yearly plan of my nutrition', subtitle: '52 Weeks', icon: '📅' },
    { id: 'C' as const, title: 'Meals taken', subtitle: 'Log & track', icon: '✅' },
    { id: 'D' as const, title: 'Archive of weekly plans', subtitle: 'History', icon: '📦' },
  ];
  
  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold">Nutrition Menu</h2>
      </div>
      
      {/* NutritionMeal Sections */}
      <div className="p-3 space-y-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
          Workouts
        </h3>
        
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
              activeSection === section.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{section.icon}</span>
              <div className="flex-1">
                <div className="font-semibold text-sm">{section.title}</div>
                <div className="text-xs opacity-75">{section.subtitle}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {/* Quick Actions */}
      <div className="p-3 border-t border-gray-700">
        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
          Quick Actions
        </h3>
        <div className="space-y-2">
          <button
            onClick={onAddNewDay}
            className="w-full text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm flex items-center gap-2"
          >
            <span className="text-lg">➕</span>
            <span>Add new day</span>
          </button>
          
          <button
            onClick={onAddWorkout}
            className="w-full text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm flex items-center gap-2"
          >
            <span className="text-lg">🏋️</span>
            <span>Add a workout</span>
          </button>
          
          <button
            onClick={onAddNutritionFood}
            className="w-full text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm flex items-center gap-2"
          >
            <span className="text-lg">📋</span>
            <span>Add a nutritionFood</span>
          </button>
          
          <button
            onClick={onOpenSettings}
            className="w-full text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm flex items-center gap-2"
          >
            <span className="text-lg">⚙️</span>
            <span>Settings / Colors</span>
          </button>
        </div>
      </div>
      
      {/* View Options */}
      <div className="p-3 border-t border-gray-700">
        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
          View Options
        </h3>
        <div className="space-y-1 text-sm">
          <button className="w-full text-left px-3 py-2 hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2">
            <span>📋</span>
            <span>Table View</span>
          </button>
          <button className="w-full text-left px-3 py-2 hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2">
            <span>📅</span>
            <span>Calendar View</span>
          </button>
        </div>
      </div>
      
      {/* Help Section */}
      <div className="p-3 border-t border-gray-700 mt-auto">
        <button
          onClick={onOpenHierarchyGuide}
          className="w-full px-3 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          <span className="text-lg">💡</span>
          <span>Workout Structure Guide</span>
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">
          Learn about Day → NutritionMeal → NutritionFood → NutritionComponent
        </p>
      </div>
      
    </aside>
  );
}

