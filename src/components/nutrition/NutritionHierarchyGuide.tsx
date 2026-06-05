'use client';

import React, { useState } from 'react';
import { X, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface NutritionHierarchyGuideProps {
  onClose?: () => void;
}

export default function NutritionHierarchyGuide({ onClose }: NutritionHierarchyGuideProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('workout');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Info className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Nutrition Planner Structure Guide</h2>
              <p className="text-sm text-blue-100">Understanding the hierarchy: Day → Meal → Dietframe → Dietlap</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          
          {/* Day Section */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-50 to-green-100 p-4 cursor-pointer hover:bg-green-100 transition-colors flex items-center justify-between"
              onClick={() => toggleSection('day')}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">📅</span>
                <div>
                  <h3 className="text-xl font-bold text-green-900">DAY</h3>
                  <p className="text-sm text-green-700">One calendar date in your nutrition plan</p>
                </div>
              </div>
              {expandedSection === 'day' ? <ChevronUp className="w-5 h-5 text-green-700" /> : <ChevronDown className="w-5 h-5 text-green-700" />}
            </div>
            {expandedSection === 'day' && (
              <div className="p-4 bg-white border-t border-green-200">
                <div className="space-y-3 text-sm">
                  <p className="font-medium text-gray-700">A Day represents one calendar date in your nutrition plan.</p>
                  <div className="bg-green-50 p-3 rounded">
                    <p className="font-semibold text-green-900 mb-2">✔ Key Facts:</p>
                    <ul className="space-y-1 text-green-800">
                      <li>• Can contain <strong>max 4 meals</strong> (Breakfast ○, Lunch □, Breakfast 2 △, Dinner ▽)</li>
                      <li>• Each meal is independent and can be enabled or disabled</li>
                      <li>• Days are organized by weeks in your plan</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* NutritionMeal Section */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 cursor-pointer hover:bg-blue-100 transition-colors flex items-center justify-between"
              onClick={() => toggleSection('workout')}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">🏋️</span>
                <div>
                  <h3 className="text-xl font-bold text-blue-900">MEAL</h3>
                  <p className="text-sm text-blue-700">Breakfast, Lunch, Breakfast 2, or Dinner</p>
                </div>
              </div>
              {expandedSection === 'workout' ? <ChevronUp className="w-5 h-5 text-blue-700" /> : <ChevronDown className="w-5 h-5 text-blue-700" />}
            </div>
            {expandedSection === 'workout' && (
              <div className="p-4 bg-white border-t border-blue-200">
                <div className="space-y-3 text-sm">
                  <p className="font-medium text-gray-700">A Meal is one eating occasion in the day (e.g. Breakfast). It summarizes nutrients and holds the foods you plan to eat.</p>
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="font-semibold text-blue-900 mb-2">✔ Key Facts:</p>
                    <ul className="space-y-1 text-blue-800">
                      <li>• A day can have <strong>max 4 meals</strong>: Breakfast ○, Lunch □, Breakfast 2 △, Dinner ▽</li>
                      <li>• Each meal can contain many <strong>dietframes</strong> (foods selected)</li>
                      <li>• Meals can be enabled or disabled for day totals</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-semibold text-gray-900 mb-2">📋 Examples:</p>
                    <ul className="space-y-1 text-gray-700">
                      <li>• <strong>Breakfast</strong> → Oats, fruit, coffee</li>
                      <li>• <strong>Lunch</strong> → Pasta, salad, protein</li>
                      <li>• <strong>Dinner</strong> → Fish, vegetables, bread</li>
                    </ul>
                  </div>
                  <p className="italic text-gray-600">💡 Click a meal to see its dietframes (foods selected).</p>
                </div>
              </div>
            )}
          </div>

          {/* NutritionFood Section */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 cursor-pointer hover:bg-purple-100 transition-colors flex items-center justify-between"
              onClick={() => toggleSection('nutritionFood')}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">📋</span>
                <div>
                  <h3 className="text-xl font-bold text-purple-900">DIETFRAME</h3>
                  <p className="text-sm text-purple-700">One food selected in a meal (A, B, C…)</p>
                </div>
              </div>
              {expandedSection === 'nutritionFood' ? <ChevronUp className="w-5 h-5 text-purple-700" /> : <ChevronDown className="w-5 h-5 text-purple-700" />}
            </div>
            {expandedSection === 'nutritionFood' && (
              <div className="p-4 bg-white border-t border-purple-200">
                <div className="space-y-3 text-sm">
                  <p className="font-medium text-gray-700">A Dietframe is one food entry in a meal — the food selected plus its amount (grams, oz, lb) and nutrients.</p>
                  <div className="bg-purple-50 p-3 rounded">
                    <p className="font-semibold text-purple-900 mb-2">✔ Dietframe Rules:</p>
                    <ul className="space-y-1 text-purple-800">
                      <li>• Each dietframe has a letter: <strong>A, B, C…</strong></li>
                      <li>• A meal can have many dietframes</li>
                      <li>• Dietframes list <strong>food selected</strong>, grams, calories, macros</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-semibold text-gray-900 mb-2">📋 Examples (Breakfast):</p>
                    <ul className="space-y-1 text-gray-700">
                      <li><strong>Dietframe A:</strong> Oats — 80 g</li>
                      <li><strong>Dietframe B:</strong> Banana — 120 g</li>
                      <li><strong>Dietframe C:</strong> Coffee — 200 ml</li>
                    </ul>
                  </div>
                  <p className="italic text-gray-600">💡 Click a dietframe letter to see its dietlaps (recipe components).</p>
                </div>
              </div>
            )}
          </div>

          {/* Dietlap Section */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div
              className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 cursor-pointer hover:bg-orange-100 transition-colors flex items-center justify-between"
              onClick={() => toggleSection('nutritionComponent')}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">🔄</span>
                <div>
                  <h3 className="text-xl font-bold text-orange-900">DIETLAP</h3>
                  <p className="text-sm text-orange-700">One component of a food (used for recipes)</p>
                </div>
              </div>
              {expandedSection === 'nutritionComponent' ? <ChevronUp className="w-5 h-5 text-orange-700" /> : <ChevronDown className="w-5 h-5 text-orange-700" />}
            </div>
            {expandedSection === 'nutritionComponent' && (
              <div className="p-4 bg-white border-t border-orange-200">
                <div className="space-y-3 text-sm">
                  <p className="font-medium text-gray-700">A Dietlap is one ingredient or component of a dietframe food — used when a food is a recipe made of several parts.</p>
                  <div className="bg-orange-50 p-3 rounded">
                    <p className="font-semibold text-orange-900 mb-2">✔ Dietlap Rules:</p>
                    <ul className="space-y-1 text-orange-800">
                      <li>• Each dietlap belongs to one dietframe (same letter A, B, …)</li>
                      <li>• Lists <strong>component of the food</strong>, grams, and nutrients</li>
                      <li>• Dietlaps can be added, edited, reordered, or removed</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-semibold text-gray-900 mb-2">📋 Example (recipe):</p>
                    <div className="space-y-2 text-gray-700">
                      <p><strong>Dietframe A:</strong> Homemade smoothie</p>
                      <p><strong>Dietlaps:</strong></p>
                      <ul className="ml-4 list-disc">
                        <li>Milk — 200 ml</li>
                        <li>Banana — 100 g</li>
                        <li>Protein powder — 30 g</li>
                      </ul>
                    </div>
                  </div>
                  <p className="italic text-gray-600">💡 Simple foods may have one dietlap; recipes have several.</p>
                </div>
              </div>
            )}
          </div>

          {/* Complete Example */}
          <div className="border-2 border-indigo-300 rounded-lg overflow-hidden bg-gradient-to-br from-indigo-50 to-purple-50">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span>🧱</span>
                <span>Complete Example: Putting It All Together</span>
              </h3>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="bg-white p-3 rounded-lg border border-indigo-200">
                <p className="font-bold text-indigo-900 mb-2">📅 DAY: Monday</p>
                
                <div className="ml-4 space-y-3">
                  <div className="border-l-4 border-blue-400 pl-3">
                    <p className="font-semibold text-blue-900">○ Breakfast</p>
                    <div className="ml-4 mt-2 space-y-2">
                      <div className="border-l-4 border-purple-400 pl-3">
                        <p className="font-semibold text-purple-900">📋 Dietframe A: Oats — 80 g</p>
                        <div className="ml-4 mt-1 text-xs text-gray-600">
                          <p>🔄 Dietlap: Oats — 80 g</p>
                        </div>
                      </div>
                      <div className="border-l-4 border-purple-400 pl-3">
                        <p className="font-semibold text-purple-900">📋 Dietframe B: Smoothie (recipe)</p>
                        <div className="ml-4 mt-1 text-xs text-gray-600">
                          <p>🔄 Dietlap 1: Milk — 200 ml</p>
                          <p>🔄 Dietlap 2: Banana — 100 g</p>
                          <p>🔄 Dietlap 3: Protein powder — 30 g</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-l-4 border-blue-400 pl-3">
                    <p className="font-semibold text-blue-900">□ Lunch</p>
                    <div className="ml-4 mt-2">
                      <div className="border-l-4 border-purple-400 pl-3">
                        <p className="font-semibold text-purple-900">📋 Dietframe A: Pasta with sauce — 350 g</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-l-4 border-blue-400 pl-3">
                    <p className="font-semibold text-blue-900">▽ Dinner</p>
                    <div className="ml-4 mt-2">
                      <div className="border-l-4 border-purple-400 pl-3">
                        <p className="font-semibold text-purple-900">📋 Dietframe A: Grilled fish — 200 g</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex justify-end">
          {onClose && (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Got it!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

