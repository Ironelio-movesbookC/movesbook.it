'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface SwimSequence {
  meters: number;
  speed: string;
  style: string;
  repetitions: number;
  pause: string;
  endPause?: string;
}

interface SwimFormData {
  sequences: SwimSequence[];
  pace100?: string;
  time?: string;
  note?: string;
  alarm?: number | null;
  sound?: string;
}

interface SwimNutritionFoodFormProps {
  onSubmit: (data: SwimFormData) => void;
  onCancel: () => void;
}

const METERS_OPTIONS = [20, 50, 75, 100, 150, 200, 400, 500, 800, 1000, 1200, 1500];
const SPEED_OPTIONS = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2'];
const STYLE_OPTIONS = ['Freestyle', 'Dolphin', 'Backstroke', 'Breaststroke', 'Sliding', 'Apnea'];
const PAUSE_OPTIONS = ['0"', '5"', '10"', '15"', '20"', '25"', '30"', '35"', '40"', '45"', '50"', "1'", "1'10\"", "1'15\"", "1'30\"", "2'", "2'30\"", "3'", "5'", "10'"];
const ALARM_OPTIONS = [-1, -2, -3, -4, -5, -6, -7, -8, -9, -10];
const SOUND_OPTIONS = ['Beep', 'Bell'];

export default function SwimNutritionFoodForm({ onSubmit, onCancel }: SwimNutritionFoodFormProps) {
  // Initialize with one sequence
  const [sequences, setSequences] = useState<SwimSequence[]>([
    {
      meters: 100,
      speed: 'A2',
      style: 'Freestyle',
      repetitions: 1,
      pause: "1'",
      endPause: ''
    }
  ]);

  // Optional global fields
  const [pace100, setPace100] = useState('');
  const [time, setTime] = useState('');
  const [alarm, setAlarm] = useState<number | null>(null);
  const [sound, setSound] = useState('Beep');
  const [note, setNote] = useState('');

  const handleAddSequence = () => {
    setSequences([
      ...sequences,
      {
        meters: 100,
        speed: 'A2',
        style: 'Freestyle',
        repetitions: 1,
        pause: "1'",
        endPause: ''
      }
    ]);
  };

  const handleRemoveSequence = (index: number) => {
    if (sequences.length > 1) {
      setSequences(sequences.filter((_, i) => i !== index));
    }
  };

  const handleSequenceChange = (index: number, field: keyof SwimSequence, value: any) => {
    const updated = [...sequences];
    updated[index] = { ...updated[index], [field]: value };
    setSequences(updated);
  };

  const getTotalReps = () => {
    return sequences.reduce((sum, seq) => sum + seq.repetitions, 0);
  };

  const handleSubmit = () => {
    onSubmit({
      sequences,
      pace100: pace100 || undefined,
      time: time || undefined,
      note: note || undefined,
      alarm: alarm,
      sound
    });
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <div className="sticky top-0 bg-white z-10 pb-2 border-b">
        <h3 className="text-lg font-bold text-blue-600">🏊 SWIM NutritionFood</h3>
        <p className="text-sm text-gray-600">
          Add one or more sequences. Each sequence will generate individual nutritionComponents.
        </p>
      </div>

      {/* Sequences */}
      {sequences.map((sequence, index) => (
        <div key={index} className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-blue-700">
              Sequence {index + 1} ({sequence.repetitions} reps)
            </h4>
            {sequences.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveSequence(index)}
                className="text-red-500 hover:text-red-700 transition-colors"
                title="Remove sequence"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Meters */}
            <div>
              <label className="block text-sm font-medium mb-1">Meters *</label>
              <select
                value={sequence.meters}
                onChange={(e) => handleSequenceChange(index, 'meters', Number(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {METERS_OPTIONS.map(m => (
                  <option key={m} value={m}>{m}m</option>
                ))}
              </select>
            </div>

            {/* Repetitions */}
            <div>
              <label className="block text-sm font-medium mb-1">Repetitions *</label>
              <input
                type="number"
                min="1"
                max="50"
                value={sequence.repetitions}
                onChange={(e) => handleSequenceChange(index, 'repetitions', Number(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Speed */}
            <div>
              <label className="block text-sm font-medium mb-1">Speed *</label>
              <select
                value={sequence.speed}
                onChange={(e) => handleSequenceChange(index, 'speed', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {SPEED_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Style */}
            <div>
              <label className="block text-sm font-medium mb-1">Style *</label>
              <select
                value={sequence.style}
                onChange={(e) => handleSequenceChange(index, 'style', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {STYLE_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Pause */}
            <div>
              <label className="block text-sm font-medium mb-1">Pause (between reps) *</label>
              <select
                value={sequence.pause}
                onChange={(e) => handleSequenceChange(index, 'pause', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {PAUSE_OPTIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* End Pause (transition) */}
            <div>
              <label className="block text-sm font-medium mb-1">
                End Pause (after sequence)
                {index < sequences.length - 1 && <span className="text-blue-600"> *</span>}
              </label>
              <select
                value={sequence.endPause || ''}
                onChange={(e) => handleSequenceChange(index, 'endPause', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Same as pause</option>
                {PAUSE_OPTIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ))}

      {/* Add Sequence Button */}
      <button
        type="button"
        onClick={handleAddSequence}
        className="w-full py-2 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={18} />
        Add Another Sequence
      </button>

      {/* Optional Global Fields */}
      <div className="border-t-2 pt-4">
        <h4 className="font-semibold mb-3 text-gray-700">Optional Fields (apply to all sequences)</h4>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Pace\100 */}
          <div>
            <label className="block text-sm font-medium mb-1">Pace\100</label>
            <input
              type="text"
              placeholder="e.g., 1:30/100"
              value={pace100}
              onChange={(e) => setPace100(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-medium mb-1">Time</label>
            <input
              type="text"
              placeholder="e.g., 5:00"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Alarm */}
          <div>
            <label className="block text-sm font-medium mb-1">Alarm</label>
            <select
              value={alarm || ''}
              onChange={(e) => setAlarm(e.target.value ? Number(e.target.value) : null)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">None</option>
              {ALARM_OPTIONS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Sound */}
          <div>
            <label className="block text-sm font-medium mb-1">Sound</label>
            <select
              value={sound}
              onChange={(e) => setSound(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {SOUND_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Note */}
        <div className="mt-3">
          <label className="block text-sm font-medium mb-1">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={2}
            placeholder="Additional notes..."
          />
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-blue-900">Total NutritionComponents:</span>
          <span className="text-2xl font-bold text-blue-600">{getTotalReps()}</span>
        </div>
        <p className="text-xs text-blue-700 mt-1">
          {sequences.length} sequence{sequences.length > 1 ? 's' : ''} 
          {sequences.length > 1 && ` (${sequences.map(s => s.repetitions).join(' + ')})`}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-2 border-t sticky bottom-0 bg-white pb-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Create NutritionFood
        </button>
      </div>
    </div>
  );
}

