/**
 * EditMoveframeModal Component
 * Modal for editing moveframe details
 */

'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { SPORTS } from '@/config/workout.constants';
import { moveframeApi } from '@/utils/api.utils';
import type { Moveframe, Workout, WorkoutDay } from '@/types/workout.types';

// 2026-01-22 14:45 UTC - Helper to strip circuit metadata tags from content
const stripCircuitTags = (content: string | null | undefined): string => {
  if (!content) return '';
  return content
    .replace(/\[CIRCUIT_DATA\][\s\S]*?\[\/CIRCUIT_DATA\]/g, '')
    .replace(/\[CIRCUIT_META\][\s\S]*?\[\/CIRCUIT_META\]/g, '')
    .trim();
};

interface EditMoveframeModalProps {
  moveframe: Moveframe;
  workout: Workout;
  day: WorkoutDay;
  onClose: () => void;
  onSave: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export default function EditMoveframeModal({
  moveframe,
  workout,
  day,
  onClose,
  onSave,
  onError,
  onSuccess
}: EditMoveframeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 2026-01-30 - Extract and preserve circuit tags
  const [circuitTags] = useState(() => {
    const content = moveframe.notes || moveframe.description || '';
    const match = content.match(/(\[CIRCUIT_DATA\][\s\S]*?\[\/CIRCUIT_DATA\])/);
    return match ? match[1] : '';
  });

  // 2026-01-22 14:45 UTC - Strip circuit tags from initial content
  const [editorContent, setEditorContent] = useState(stripCircuitTags(moveframe.notes || moveframe.description || ''));
  const [distance, setDistance] = useState('0');
  
  const isManualMode = moveframe.manualMode === true;
  
  // Rich text editor commands
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      // 2026-01-30 - Re-append circuit tags if they exist
      const description = isManualMode ? editorContent : (formData.get('description') as string);
      const finalDescription = circuitTags && !description.includes('[CIRCUIT_DATA]') 
        ? `${description}\n\n${circuitTags}` 
        : description;

      const updateData: any = {
        sport: formData.get('sport'),
        description: finalDescription,
        sectionName: formData.get('sectionName'),
        macroRest: formData.get('macroRest')
      };
      
      // For manual mode, save content to notes field and description
      if (isManualMode) {
        updateData.notes = finalDescription;
        updateData.description = finalDescription;
      }
      
      const response = await moveframeApi.update(moveframe.id, updateData);

      if (response.success) {
        onSuccess(`Moveframe ${moveframe.code} updated successfully!`);
        onSave();
        onClose();
      } else {
        onError(response.error || 'Failed to update moveframe');
      }
    } catch (error) {
      console.error('Error updating moveframe:', error);
      onError('Error updating moveframe');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999999]">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Edit Moveframe {moveframe.code}
            </h2>
            <p className="text-sm text-gray-500">
              Workout #{workout.sessionNumber} • {moveframe.sport}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isManualMode ? (
            /* Manual Mode Form */
            <>
              {/* Distance for Metrics */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Distance (for metrics/statistics)
                </label>
                <input
                  type="number"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 mt-1">Enter distance in meters for statistics calculation</p>
              </div>

              {/* Rich Text Editor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Moveframe Content *
                </label>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  {/* Toolbar */}
                  <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1 items-center">
                    <select 
                      onChange={(e) => execCommand('fontName', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                      disabled={isSubmitting}
                    >
                      <option value="Arial">Arial</option>
                      <option value="Times New Roman">Times</option>
                      <option value="Courier New">Courier</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Verdana">Verdana</option>
                    </select>
                    <select 
                      onChange={(e) => execCommand('fontSize', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                      disabled={isSubmitting}
                    >
                      <option value="3">Normal</option>
                      <option value="1">Very Small</option>
                      <option value="2">Small</option>
                      <option value="4">Large</option>
                      <option value="5">Very Large</option>
                      <option value="6">Huge</option>
                    </select>
                    <div className="h-4 w-px bg-gray-300 mx-1"></div>
                    <button 
                      type="button"
                      onClick={() => execCommand('bold')}
                      className="px-2 py-1 hover:bg-gray-200 rounded font-bold text-sm"
                      title="Bold"
                      disabled={isSubmitting}
                    >
                      B
                    </button>
                    <button 
                      type="button"
                      onClick={() => execCommand('italic')}
                      className="px-2 py-1 hover:bg-gray-200 rounded italic text-sm"
                      title="Italic"
                      disabled={isSubmitting}
                    >
                      I
                    </button>
                    <button 
                      type="button"
                      onClick={() => execCommand('underline')}
                      className="px-2 py-1 hover:bg-gray-200 rounded underline text-sm"
                      title="Underline"
                      disabled={isSubmitting}
                    >
                      U
                    </button>
                    <div className="h-4 w-px bg-gray-300 mx-1"></div>
                    <button 
                      type="button"
                      onClick={() => execCommand('justifyLeft')}
                      className="px-2 py-1 hover:bg-gray-200 rounded text-sm"
                      title="Align Left"
                      disabled={isSubmitting}
                    >
                      ≡
                    </button>
                    <button 
                      type="button"
                      onClick={() => execCommand('justifyCenter')}
                      className="px-2 py-1 hover:bg-gray-200 rounded text-sm"
                      title="Center"
                      disabled={isSubmitting}
                    >
                      ≡
                    </button>
                    <button 
                      type="button"
                      onClick={() => execCommand('insertUnorderedList')}
                      className="px-2 py-1 hover:bg-gray-200 rounded text-sm"
                      title="Bullet List"
                      disabled={isSubmitting}
                    >
                      •
                    </button>
                    <button 
                      type="button"
                      onClick={() => execCommand('insertOrderedList')}
                      className="px-2 py-1 hover:bg-gray-200 rounded text-sm"
                      title="Numbered List"
                      disabled={isSubmitting}
                    >
                      1.
                    </button>
                    <input 
                      type="color"
                      onChange={(e) => execCommand('foreColor', e.target.value)}
                      className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                      title="Text Color"
                      disabled={isSubmitting}
                    />
                  </div>
                  {/* Editor */}
                  <div 
                    contentEditable={!isSubmitting}
                    onInput={(e) => setEditorContent(e.currentTarget.innerHTML)}
                    onPaste={(e) => {
                      // Allow default paste behavior to preserve formatting
                      console.log('📋 Paste event in EditMoveframeModal - allowing formatted paste');
                      // The contentEditable will handle the paste automatically with formatting
                      setTimeout(() => {
                        const target = e.currentTarget as HTMLDivElement;
                        if (target) {
                          setEditorContent(target.innerHTML);
                        }
                      }, 0);
                    }}
                    dangerouslySetInnerHTML={{ __html: editorContent }}
                    className="w-full min-h-[200px] max-h-[400px] px-3 py-2 focus:outline-none overflow-y-auto bg-white"
                    style={{
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word'
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Type or paste content with formatting (fonts, sizes, images, etc.)
                </p>
              </div>
            </>
          ) : (
            /* Standard Form */
            <>
              {/* Sport */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sport *
                </label>
                <select
                  name="sport"
                  defaultValue={moveframe.sport}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                >
                  {Object.values(SPORTS).map((sport) => (
                    <option key={sport} value={sport}>
                      {sport}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  defaultValue={stripCircuitTags(moveframe.description) || ''}
                  placeholder="e.g., 100 FR x 10 A2 R20"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                  disabled={isSubmitting}
                />
              </div>

              {/* Section Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section Name
                </label>
                <input
                  type="text"
                  name="sectionName"
                  defaultValue={moveframe.sectionName || ''}
                  placeholder="e.g., Warm-up, Main Set, Cool-down"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>

              {/* Macro Rest */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Macro Rest
                </label>
                <input
                  type="text"
                  name="macroRest"
                  defaultValue={moveframe.macroRest || ''}
                  placeholder="e.g., 5:00 rest"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>

              {/* Read-only Info */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <h3 className="text-sm font-medium text-gray-700">Moveframe Info</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Code:</span>
                    <span className="ml-2 font-medium">{moveframe.code}</span>
                  </div>
                  {/* Hide Total Distance for bodybuilding */}
                  {moveframe.sport !== 'BODY_BUILDING' && (
                    <div>
                      <span className="text-gray-500">Total Distance:</span>
                      <span className="ml-2 font-medium">{moveframe.totalDistance || 0}m</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Total Reps:</span>
                    <span className="ml-2 font-medium">{moveframe.totalReps || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Movelaps:</span>
                    <span className="ml-2 font-medium">{moveframe.movelaps?.length || 0}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

