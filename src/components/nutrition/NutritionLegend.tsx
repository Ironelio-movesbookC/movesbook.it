'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

interface NutritionLegendProps {
  showWideMode?: boolean;
  className?: string;
}

export default function NutritionLegend({ showWideMode = false, className = '' }: NutritionLegendProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  return (
    <div className={`mt-4 border border-blue-200 rounded-lg bg-blue-50 ${className}`}>
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-blue-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-gray-900">Legend: Meal Symbols, Status Colors & Day Status</h3>
        </div>
        <button className="text-blue-600 hover:text-blue-800 transition-colors">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-blue-200">
          <div className="flex flex-wrap gap-6 text-sm">
        <div className="space-y-1">
          <div className="font-semibold text-gray-700 mb-2">Meal Symbols:</div>
          <div className="flex items-center gap-2">
            <span className="text-blue-600 font-bold text-lg">○</span>
            <span>Breakfast</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-600 font-bold text-lg">□</span>
            <span>Lunch</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-600 font-bold text-lg">△</span>
            <span>Breakfast 2</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-600 font-bold text-lg">▽</span>
            <span>Dinner</span>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="font-semibold text-gray-700 mb-2">Meal Status Colors:</div>
          <div className="flex items-center gap-2">
            <span className="text-gray-300 font-bold text-lg">○</span>
            <span className="text-xs">White = Not planned</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 font-bold text-lg">○</span>
            <span className="text-xs">Yellow = Planned in future</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-orange-500 font-bold text-lg">○</span>
            <span className="text-xs">Orange = Next week</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-500 font-bold text-lg">○</span>
            <span className="text-xs">Red = This week</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-500 font-bold text-lg">○</span>
            <span className="text-xs">Blue = Done differently</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-300 font-bold text-lg">○</span>
            <span className="text-xs">Light Green = Done &lt;75%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-600 font-bold text-lg">○</span>
            <span className="text-xs">Green = Done &gt;75%</span>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="font-semibold text-gray-700 mb-2">Day Status:</div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
            <span>Has Meals</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border border-gray-200 rounded"></div>
            <span>No Meals</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 ring-2 ring-green-500 rounded"></div>
            <span>Today</span>
          </div>
        </div>
        
        {showWideMode && (
          <div className="space-y-1">
            <div className="font-semibold text-gray-700 mb-2">Wide Mode Details:</div>
            <div className="text-xs text-gray-600">
              • Meal totals shown per column<br />
              • Grams / oz / lb for food amounts<br />
              • Up to 4 meals per day
            </div>
          </div>
        )}
      </div>
        </div>
      )}
    </div>
  );
}
