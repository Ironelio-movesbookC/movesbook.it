import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Minus } from 'lucide-react';

interface BulkAddNutritionComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  nutritionFood: any;
  workout: any;
  day: any;
  onSave: (nutritionComponents: any[]) => void;
}

type VariationType = 'none' | 'linear' | 'pyramid' | 'alternating';

function BulkAddNutritionComponentModal({
  isOpen,
  onClose,
  nutritionFood,
  workout,
  day,
  onSave
}: BulkAddNutritionComponentModalProps) {
  const [count, setCount] = useState(5);
  const [baseDistance, setBaseDistance] = useState(400);
  const [baseSpeed, setBaseSpeed] = useState('A2');
  const [basePause, setBasePause] = useState('1:30');
  const [baseReps, setBaseReps] = useState(12);
  const [variation, setVariation] = useState<VariationType>('none');
  const [variationAmount, setVariationAmount] = useState(50);
  const [preview, setPreview] = useState<any[]>([]);

  const sport = nutritionFood?.sport || 'RUN';
  const isBodyBuilding = sport === 'BODY_BUILDING';

  const generateNutritionComponents = useCallback(() => {
    const nutritionComponents: any[] = [];
    const startRep = (nutritionFood.nutritionComponents?.length || 0) + 1;

    for (let i = 0; i < count; i++) {
      let distance = baseDistance;
      let reps = baseReps;

      if (variation === 'linear') {
        if (isBodyBuilding) {
          reps = baseReps + Math.floor(i * variationAmount / 100);
        } else {
          distance = baseDistance + (i * variationAmount);
        }
      } else if (variation === 'pyramid') {
        const midPoint = Math.floor(count / 2);
        const offset = i <= midPoint ? i : (count - 1 - i);
        if (isBodyBuilding) {
          reps = baseReps + Math.floor(offset * variationAmount / 100);
        } else {
          distance = baseDistance + (offset * variationAmount);
        }
      } else if (variation === 'alternating') {
        const isEven = i % 2 === 0;
        if (isBodyBuilding) {
          reps = isEven ? baseReps : baseReps + Math.floor(variationAmount / 100);
        } else {
          distance = isEven ? baseDistance : baseDistance + variationAmount;
        }
      }

      nutritionComponents.push({
        repetitionNumber: startRep + i,
        distance: isBodyBuilding ? null : Math.round(distance),
        speed: baseSpeed,
        pause: basePause,
        reps: isBodyBuilding ? Math.round(reps) : null,
        status: 'PENDING',
        style: null,
        pace: null,
        time: null,
        restType: null,
        alarm: null,
        sound: null,
        notes: '',
        isSkipped: false,
        isDisabled: false
      });
    }

    setPreview(nutritionComponents);
  }, [baseDistance, basePause, baseReps, baseSpeed, count, isBodyBuilding, nutritionFood.nutritionComponents, variation, variationAmount]);

  useEffect(() => {
    if (isOpen) {
      generateNutritionComponents();
    }
  }, [generateNutritionComponents, isOpen]);

  const handleSave = () => {
    onSave(preview);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 border-b border-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Plus size={28} />
                Bulk Add NutritionComponents
              </h2>
              <p className="text-green-200 text-sm mt-1">
                Generate multiple nutrition_components at once
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Configuration</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of NutritionComponents
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCount(Math.max(1, count - 1))}
                    className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
                  >
                    <Minus size={20} />
                  </button>
                  <input
                    type="number"
                    value={count}
                    onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    max="50"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-center text-xl font-bold"
                  />
                  <button
                    onClick={() => setCount(Math.min(50, count + 1))}
                    className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                <h4 className="font-semibold text-blue-900">Base Values</h4>
                
                {isBodyBuilding ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Repetitions
                    </label>
                    <input
                      type="number"
                      value={baseReps}
                      onChange={(e) => setBaseReps(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Distance (meters)
                    </label>
                    <input
                      type="number"
                      value={baseDistance}
                      onChange={(e) => setBaseDistance(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Speed Code
                  </label>
                  <input
                    type="text"
                    value={baseSpeed}
                    onChange={(e) => setBaseSpeed(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pause
                  </label>
                  <input
                    type="text"
                    value={basePause}
                    onChange={(e) => setBasePause(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-purple-900">Variation Pattern</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="none"
                      checked={variation === 'none'}
                      onChange={(e) => setVariation(e.target.value as VariationType)}
                    />
                    <span>None - All Same</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="linear"
                      checked={variation === 'linear'}
                      onChange={(e) => setVariation(e.target.value as VariationType)}
                    />
                    <span>Linear - Progressive</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="pyramid"
                      checked={variation === 'pyramid'}
                      onChange={(e) => setVariation(e.target.value as VariationType)}
                    />
                    <span>Pyramid - Up then Down</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="alternating"
                      checked={variation === 'alternating'}
                      onChange={(e) => setVariation(e.target.value as VariationType)}
                    />
                    <span>Alternating - Two Values</span>
                  </label>
                </div>

                {variation !== 'none' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Variation Amount
                    </label>
                    <input
                      type="number"
                      value={variationAmount}
                      onChange={(e) => setVariationAmount(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Preview ({preview.length} nutritionComponents)
              </h3>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-[500px] overflow-y-auto space-y-2">
                {preview.map((nutritionComponent, index) => (
                  <div
                    key={index}
                    className="bg-white border border-gray-200 rounded-lg p-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold">#{nutritionComponent.repetitionNumber}</span>
                      {isBodyBuilding ? (
                        <span>{nutritionComponent.reps} reps</span>
                      ) : (
                        <span>{nutritionComponent.distance}m</span>
                      )}
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                        {nutritionComponent.speed}
                      </span>
                      <span className="text-gray-500 text-xs">P{nutritionComponent.pause}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">Summary</h4>
                <div className="text-sm">
                  <div>Total: {preview.length} nutrition_components</div>
                  {!isBodyBuilding && (
                    <div>Distance: {preview.reduce((sum, ml) => sum + (ml.distance || 0), 0)}m</div>
                  )}
                  {isBodyBuilding && (
                    <div>Reps: {preview.reduce((sum, ml) => sum + (ml.reps || 0), 0)}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Will create {preview.length} nutrition_components
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
              >
                <Plus size={18} />
                Add {preview.length} NutritionComponents
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BulkAddNutritionComponentModal;
