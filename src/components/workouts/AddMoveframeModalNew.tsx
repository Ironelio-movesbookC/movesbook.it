'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import SwimMoveframeForm from './forms/SwimMoveframeForm';
import { generateMovelaps, generateMoveframeDescription } from '@/utils/movelapGenerator';

interface AddMoveframeModalNewProps {
  workoutId: string;
  dayData?: any;
  currentWorkoutData?: any;
  onClose: () => void;
  onSave: (moveframeData: any) => void;
}

const SPORTS = [
  'SWIM', 'BIKE', 'RUN', 'BODY_BUILDING', 'ROWING', 
  'SKATE', 'GYMNASTIC', 'STRETCHING', 'PILATES', 
  'SKI', 'TECHNICAL_MOVES', 'FREE_MOVES'
];

type MainTab = 'edit' | 'manual' | 'favourites';
type EditSubTab = 'standard' | 'battery' | 'annotation';

export default function AddMoveframeModalNew({
  workoutId,
  dayData,
  currentWorkoutData,
  onClose,
  onSave
}: AddMoveframeModalNewProps) {
  const [selectedSport, setSelectedSport] = useState('SWIM');
  const [mainTab, setMainTab] = useState<MainTab>('edit');
  const [editSubTab, setEditSubTab] = useState<EditSubTab>('standard');
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [isLoadingSections, setIsLoadingSections] = useState(true);
  
  // Standard form fields
  const [standardData, setStandardData] = useState({
    distance: '',
    repetitions: '1',
    speedPace: '',
    restPause: '',
    description: ''
  });

  // Annotation form fields
  const [annotationData, setAnnotationData] = useState({
    text: '',
    headerBgColor: '#5168c2',
    textBgColor: '#ffffff'
  });

  // Manual form fields
  const [manualData, setManualData] = useState({
    htmlContent: '',
    isPriority: false
  });

  // Fetch sections
  useEffect(() => {
    const fetchSections = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/workouts/sections', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSections(data.sections || []);
          if (data.sections && data.sections.length > 0) {
            setSelectedSectionId(data.sections[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching sections:', error);
      } finally {
        setIsLoadingSections(false);
      }
    };

    fetchSections();
  }, []);

  // Get next letter for moveframe
  const getNextLetter = (): string => {
    if (!currentWorkoutData || !currentWorkoutData.moveframes) return 'A';
    
    const existingLetters = currentWorkoutData.moveframes.map((mf: any) => mf.letter);
    
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i);
      if (!existingLetters.includes(letter)) {
        return letter;
      }
    }
    
    return 'A';
  };

  const handleSaveStandard = async () => {
    try {
      if (!selectedSectionId) {
        alert('Please select a section');
        return;
      }

      const letter = getNextLetter();
      const description = `${standardData.distance}m x ${standardData.repetitions} ${standardData.speedPace} ${standardData.restPause}`;

      const token = localStorage.getItem('token');
      const response = await fetch('/api/workouts/moveframes/create-with-movelaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          workoutSessionId: workoutId,
          sectionId: selectedSectionId,
          letter,
          sport: selectedSport,
          type: 'STANDARD',
          description,
          movelaps: []
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to create moveframe');
      }

      const result = await response.json();
      onSave(result);
      
    } catch (error) {
      console.error('Error creating moveframe:', error);
      alert('Error creating moveframe: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleSaveAnnotation = async () => {
    try {
      if (!selectedSectionId) {
        alert('Please select a section');
        return;
      }

      const letter = getNextLetter();

      const token = localStorage.getItem('token');
      const response = await fetch('/api/workouts/moveframes/create-with-movelaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          workoutSessionId: workoutId,
          sectionId: selectedSectionId,
          letter,
          sport: selectedSport,
          type: 'ANNOTATION',
          description: annotationData.text,
          notes: JSON.stringify({
            headerBgColor: annotationData.headerBgColor,
            textBgColor: annotationData.textBgColor
          }),
          movelaps: []
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to create annotation');
      }

      const result = await response.json();
      onSave(result);
      
    } catch (error) {
      console.error('Error creating annotation:', error);
      alert('Error creating annotation: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleSaveManual = async () => {
    try {
      if (!selectedSectionId) {
        alert('Please select a section');
        return;
      }

      const letter = getNextLetter();

      const token = localStorage.getItem('token');
      const response = await fetch('/api/workouts/moveframes/create-with-movelaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          workoutSessionId: workoutId,
          sectionId: selectedSectionId,
          letter,
          sport: selectedSport,
          type: 'MANUAL',
          description: manualData.htmlContent,
          notes: manualData.htmlContent,
          manualMode: true,
          manualPriority: manualData.isPriority,
          movelaps: []
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to create manual moveframe');
      }

      const result = await response.json();
      onSave(result);
      
    } catch (error) {
      console.error('Error creating manual moveframe:', error);
      alert('Error creating manual moveframe: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto scrollbar-hide">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl my-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-purple-600 bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900">
          <h2 className="text-xl font-bold text-white">Add Moveframe</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-4">
          {/* Sport Selector */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Sport <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SPORTS.map(sport => (
                <option key={sport} value={sport}>{sport}</option>
              ))}
            </select>
          </div>

          {/* Main Tabs */}
          <div className="flex gap-0">
            <button
              onClick={() => setMainTab('edit')}
              className={`px-6 py-2 font-semibold transition-colors ${
                mainTab === 'edit'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-400 text-white hover:bg-gray-500'
              }`}
            >
              Edit Moveframe
            </button>
            <button
              onClick={() => setMainTab('manual')}
              className={`px-6 py-2 font-semibold transition-colors ${
                mainTab === 'manual'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-400 text-white hover:bg-gray-500'
              }`}
            >
              Moveframe Info (manual input)
            </button>
            <button
              onClick={() => setMainTab('favourites')}
              className={`px-6 py-2 font-semibold transition-colors ${
                mainTab === 'favourites'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-400 text-white hover:bg-gray-500'
              }`}
            >
              Load from Favourites moveframes
            </button>
          </div>

          {/* Edit Moveframe Tab Content */}
          {mainTab === 'edit' && (
            <div className="space-y-4">
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-semibold mb-2">Type</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditSubTab('standard')}
                    className={`flex-1 px-6 py-3 text-sm font-medium rounded-lg border-2 transition-colors ${
                      editSubTab === 'standard'
                        ? 'bg-white text-gray-900 border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    Standard Mode
                  </button>
                  <button
                    onClick={() => setEditSubTab('battery')}
                    className={`flex-1 px-6 py-3 text-sm font-medium rounded-lg border-2 transition-colors ${
                      editSubTab === 'battery'
                        ? 'bg-white text-gray-900 border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    Battery
                  </button>
                  <button
                    onClick={() => setEditSubTab('annotation')}
                    className={`flex-1 px-6 py-3 text-sm font-medium rounded-lg border-2 transition-colors ${
                      editSubTab === 'annotation'
                        ? 'bg-white text-gray-900 border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    Annotation
                  </button>
                </div>
              </div>

              {/* Standard Form */}
              {editSubTab === 'standard' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Distance (m)</label>
                      <input
                        type="text"
                        value={standardData.distance}
                        onChange={(e) => setStandardData({...standardData, distance: e.target.value})}
                        placeholder="100"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Repetitions</label>
                      <input
                        type="text"
                        value={standardData.repetitions}
                        onChange={(e) => setStandardData({...standardData, repetitions: e.target.value})}
                        placeholder="1"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Speed/Pace</label>
                      <input
                        type="text"
                        value={standardData.speedPace}
                        onChange={(e) => setStandardData({...standardData, speedPace: e.target.value})}
                        placeholder="A2, Easy, 1:30/100m"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rest/Pause</label>
                      <input
                        type="text"
                        value={standardData.restPause}
                        onChange={(e) => setStandardData({...standardData, restPause: e.target.value})}
                        placeholder="20s, 1:00"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={standardData.description}
                      onChange={(e) => setStandardData({...standardData, description: e.target.value})}
                      placeholder="Exercise details..."
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Battery Form */}
              {editSubTab === 'battery' && (
                <div className="py-8">
                  <p className="text-sm text-gray-500 text-center">
                    Battery mode will be explained subsequently.
                  </p>
                </div>
              )}

              {/* Annotation Form */}
              {editSubTab === 'annotation' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Annotation in the row</label>
                    <input
                      type="text"
                      value={annotationData.text}
                      onChange={(e) => setAnnotationData({...annotationData, text: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Annotation header background</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={annotationData.headerBgColor}
                        onChange={(e) => setAnnotationData({...annotationData, headerBgColor: e.target.value})}
                        className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={annotationData.headerBgColor}
                        onChange={(e) => setAnnotationData({...annotationData, headerBgColor: e.target.value})}
                        className="px-3 py-2 text-sm border border-gray-300 rounded w-32"
                        placeholder="#5168c2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Annotation text background</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={annotationData.textBgColor}
                        onChange={(e) => setAnnotationData({...annotationData, textBgColor: e.target.value})}
                        className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={annotationData.textBgColor}
                        onChange={(e) => setAnnotationData({...annotationData, textBgColor: e.target.value})}
                        className="px-3 py-2 text-sm border border-gray-300 rounded w-32"
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual Input Tab Content */}
          {mainTab === 'manual' && (
            <div className="bg-blue-100 border-2 border-blue-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="moveframe-manual"
                    checked={true}
                    readOnly
                    className="w-4 h-4 accent-blue-600"
                  />
                  <label htmlFor="moveframe-manual" className="text-sm font-medium text-gray-800">
                    Moveframe edited manually
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="priority-manual"
                    checked={manualData.isPriority}
                    onChange={(e) => setManualData({...manualData, isPriority: e.target.checked})}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <label htmlFor="priority-manual" className="text-sm font-medium text-gray-800">
                    Priority 'manual' in the display
                  </label>
                </div>
              </div>

              {/* Rich Text Editor */}
              <div className="bg-white border border-gray-300 rounded p-3 space-y-3">
                {/* Toolbar */}
                <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-gray-200">
                  <select className="px-2 py-1 text-xs border border-gray-300 rounded bg-white">
                    <option>Arial</option>
                    <option>Times New Roman</option>
                    <option>Courier</option>
                  </select>
                  <select className="px-2 py-1 text-xs border border-gray-300 rounded bg-white">
                    <option>Normal</option>
                    <option>Heading 1</option>
                    <option>Heading 2</option>
                  </select>
                  <div className="flex gap-1 border-l border-gray-300 pl-2 ml-1">
                    <button className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded font-bold text-sm">B</button>
                    <button className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded italic text-sm">I</button>
                    <button className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded underline text-sm">U</button>
                    <button className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded line-through text-sm">S</button>
                  </div>
                  <div className="flex gap-2 border-l border-gray-300 pl-2 ml-1">
                    <button className="w-7 h-7 bg-black rounded border border-gray-300" title="Text color"></button>
                    <button className="w-7 h-7 bg-white rounded border border-gray-300" title="Background color"></button>
                  </div>
                  <button className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 ml-auto">
                    Clear
                  </button>
                </div>
                
                {/* Text Area */}
                <textarea
                  value={manualData.htmlContent}
                  onChange={(e) => setManualData({...manualData, htmlContent: e.target.value})}
                  placeholder="Here you can edit freely your moveframe that will be showed in the moveframe section"
                  rows={10}
                  className="w-full px-3 py-2 text-sm border-0 focus:outline-none resize-none"
                />
              </div>

              {/* Internal Save/Cancel buttons */}
              <div className="flex gap-2">
                <button 
                  onClick={handleSaveManual}
                  className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Save
                </button>
                <button 
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Favourites Tab Content */}
          {mainTab === 'favourites' && (
            <div className="py-8">
              <p className="text-sm text-gray-500 text-center">
                Load from Favourites moveframes functionality will be explained subsequently.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (mainTab === 'edit' && editSubTab === 'standard') {
                handleSaveStandard();
              } else if (mainTab === 'edit' && editSubTab === 'annotation') {
                handleSaveAnnotation();
              } else if (mainTab === 'manual') {
                handleSaveManual();
              }
            }}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Moveframe
          </button>
        </div>
      </div>
    </div>
  );
}

