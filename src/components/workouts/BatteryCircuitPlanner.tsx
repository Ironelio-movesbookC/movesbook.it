'use client';

import React, { useState } from 'react';
import { AlertCircle, RefreshCw, Settings } from 'lucide-react';

interface CircuitExercise {
  letter: string;
  name: string;
  color: string;
}

interface CircuitRow {
  circuit: string;
  series: number;
  station: number;
  sector: string;
  exercise: string;
  rip: string;
  pause: string;
}

interface BatteryCircuitPlannerProps {
  sectionId: string;
  sport: string;
  workout: any;
  day: any;
  onCreateCircuit: (data: any) => void;
  onCancel: () => void;
}

export default function BatteryCircuitPlanner({
  sectionId,
  sport,
  workout,
  day,
  onCreateCircuit,
  onCancel
}: BatteryCircuitPlannerProps) {
  const [plannerMode, setPlannerMode] = useState<'circuits' | 'fast' | 'ai'>('circuits');
  const [description, setDescription] = useState('');
  
  // Circuit settings
  const [exercises, setExercises] = useState<CircuitExercise[]>([
    { letter: 'A', name: '', color: '#FFD700' },
    { letter: 'B', name: '', color: '#FFD700' },
    { letter: 'C', name: '', color: '#FFD700' }
  ]);
  const [numCircuits, setNumCircuits] = useState(3);
  const [pauseCircuits, setPauseCircuits] = useState('4\'');
  
  // Station settings
  const [stationsPerCircuit, setStationsPerCircuit] = useState(6);
  const [pauseStations, setPauseStations] = useState('10"');
  
  // Series settings
  const [seriesMode, setSeriesMode] = useState<'series' | 'time'>('series');
  const [seriesPerCircuit, setSeriesPerCircuit] = useState(2);
  const [timePerCircuit, setTimePerCircuit] = useState('5\'00"');
  const [pauseSeries, setPauseSeries] = useState('2\'');
  
  // Execution settings
  const [executionOrder, setExecutionOrder] = useState<'vertical' | 'horizontal'>('vertical');
  const [executionPauseStations, setExecutionPauseStations] = useState('');
  
  // Template state
  const [showTemplate, setShowTemplate] = useState(false);
  const [circuitRows, setCircuitRows] = useState<CircuitRow[]>([]);
  
  // Add circuit modal state
  const [showAddCircuitModal, setShowAddCircuitModal] = useState(false);
  const [newCircuitCount, setNewCircuitCount] = useState(1);
  const [newCircuitStations, setNewCircuitStations] = useState(6);
  const [newCircuitSeries, setNewCircuitSeries] = useState(2);
  const [insertAfterCircuit, setInsertAfterCircuit] = useState('');
  
  const handleExerciseNameChange = (index: number, name: string) => {
    const newExercises = [...exercises];
    newExercises[index].name = name;
    setExercises(newExercises);
  };
  
  const generateCircuitTemplate = () => {
    if (!sectionId) {
      alert('Please select a workout section');
      return;
    }
    
    const rows: CircuitRow[] = [];
    for (let c = 0; c < exercises.length; c++) {
      const circuit = exercises[c];
      for (let s = 1; s <= seriesPerCircuit; s++) {
        for (let st = 1; st <= stationsPerCircuit; st++) {
          rows.push({
            circuit: circuit.letter,
            series: s,
            station: st,
            sector: '',
            exercise: '',
            rip: '',
            pause: ''
          });
        }
      }
    }
    
    setCircuitRows(rows);
    setShowTemplate(true);
  };
  
  const handleAddCircuit = () => {
    // Set default insert position to last circuit
    setInsertAfterCircuit(exercises.length > 0 ? exercises[exercises.length - 1].letter : '');
    // Initialize modal values with current settings
    setNewCircuitCount(1);
    setNewCircuitStations(stationsPerCircuit);
    setNewCircuitSeries(seriesPerCircuit);
    setShowAddCircuitModal(true);
  };
  
  const handleConfirmAddCircuit = () => {
    // Find insert position
    const insertIndex = insertAfterCircuit ? exercises.findIndex(ex => ex.letter === insertAfterCircuit) + 1 : exercises.length;
    
    // Generate new circuit letters
    const newCircuits: CircuitExercise[] = [];
    for (let i = 0; i < newCircuitCount; i++) {
      const nextLetter = String.fromCharCode(65 + exercises.length + i);
      newCircuits.push({ letter: nextLetter, name: '', color: '#FFD700' });
    }
    
    // Insert new circuits at the specified position
    const updatedExercises = [...exercises];
    updatedExercises.splice(insertIndex, 0, ...newCircuits);
    
    // Reassign letters to maintain alphabetical order
    const reorderedExercises = updatedExercises.map((ex, idx) => ({
      ...ex,
      letter: String.fromCharCode(65 + idx)
    }));
    
    setExercises(reorderedExercises);
    
    // If template is shown, regenerate circuit rows with new circuits
    if (showTemplate) {
      const newRows: CircuitRow[] = [];
      
      // Generate rows for all circuits (existing + new)
      for (let c = 0; c < reorderedExercises.length; c++) {
        const circuit = reorderedExercises[c];
        const isNewCircuit = c >= insertIndex && c < insertIndex + newCircuitCount;
        
        // Use modal values for new circuits, existing values for old circuits
        const seriesCount = isNewCircuit ? newCircuitSeries : seriesPerCircuit;
        const stationsCount = isNewCircuit ? newCircuitStations : stationsPerCircuit;
        
        for (let s = 1; s <= seriesCount; s++) {
          for (let st = 1; st <= stationsCount; st++) {
            newRows.push({
              circuit: circuit.letter,
              series: s,
              station: st,
              sector: '',
              exercise: '',
              rip: '',
              pause: isNewCircuit ? pauseStations : pauseStations
            });
          }
        }
      }
      
      setCircuitRows(newRows);
    }
    
    setShowAddCircuitModal(false);
  };
  
  const handleBackToSettings = () => {
    setShowTemplate(false);
  };
  
  const handleSaveCircuit = () => {
    onCreateCircuit({
      exercises,
      rows: circuitRows,
      description,
      // Circuit settings
      numCircuits: exercises.length,
      pauseCircuits,
      // Station settings
      stationsPerCircuit,
      pauseStations,
      // Series settings
      seriesMode,
      seriesPerCircuit,
      timePerCircuit,
      pauseSeries,
      // Execution settings
      executionOrder,
      executionPauseStations
    });
  };
  
  // Generate preview text
  const getPreviewText = () => {
    const orderText = executionOrder === 'vertical' ? 'vertically' : 'horizontally';
    const seriesAddedInfo = '1 serie added to the circuit B';
    return `${exercises.length} circuits of ${seriesPerCircuit} series each , with ${stationsPerCircuit} stations a circuit
Pause\\circ ${pauseCircuits} - Pause\\stations ${pauseStations} - Pause\\series ${pauseSeries} - execute serie ${orderText}
${seriesAddedInfo}`;
  };
  
  // Render Add Circuit Modal
  const renderAddCircuitModal = () => (
    showAddCircuitModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-cyan-600 rounded-lg shadow-xl w-[95%] max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b border-cyan-700">
            <h3 className="text-xl font-bold text-white">Add a circuit</h3>
            <button
              type="button"
              onClick={() => setShowAddCircuitModal(false)}
              className="text-white hover:text-gray-200 text-2xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
          
          {/* Modal Body */}
          <div className="p-6 bg-white">
            <div className="grid grid-cols-2 gap-6">
              {/* Row 1: Stations and Pause\stations */}
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-gray-900">A</div>
                  <div className="p-3 bg-gray-50 border-2 border-gray-300 rounded">
                    <div className="flex flex-col gap-1">
                      {[...Array(Math.min(newCircuitStations, 6))].map((_, i) => (
                        <div key={i} className="w-24 h-4 bg-yellow-400 border border-yellow-600 rounded" />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-900">Station\circuit</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={newCircuitStations}
                      onChange={(e) => setNewCircuitStations(parseInt(e.target.value) || 1)}
                      className="w-24 px-3 py-2 border-2 border-blue-500 rounded-lg text-center focus:ring-2 focus:ring-blue-500 font-semibold"
                    />
                    <button type="button" className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-xl">×</button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-gray-900">A</div>
                  <div className="p-3 bg-gray-50 border-2 border-gray-300 rounded">
                    <div className="flex flex-col gap-1">
                      {[...Array(Math.min(newCircuitStations, 6))].map((_, i) => (
                        <div key={i} className="w-24 h-4 bg-gray-300 border border-gray-500 rounded relative">
                          <div className="absolute right-0 top-0 bottom-0 w-5 bg-yellow-400 border-l border-yellow-600 rounded-r flex items-center justify-center">
                            <div className="w-3 h-3 bg-yellow-300 border border-yellow-700 rounded-full"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-900">Pause\stations</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={pauseStations}
                      onChange={(e) => setPauseStations(e.target.value)}
                      className="w-24 px-3 py-2 border-2 border-blue-500 rounded-lg text-center focus:ring-2 focus:ring-blue-500 font-semibold"
                      placeholder='10"'
                    />
                    <button type="button" className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-xl">×</button>
                  </div>
                </div>
              </div>
              
              {/* Row 2: Series settings */}
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-gray-900">A</div>
                  <div className="p-3 bg-gray-50 border-2 border-gray-300 rounded relative">
                    <div className="flex flex-col gap-1">
                      {[...Array(Math.min(newCircuitStations, 6))].map((_, i) => (
                        <div key={i} className="w-24 h-4 bg-gray-300 border border-gray-500 rounded" />
                      ))}
                    </div>
                    {/* Vertical indicator */}
                    <div className="absolute -right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                      <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-red-700 flex items-center justify-center text-white text-xs">↓</div>
                      <div className="w-5 h-5 rounded-full bg-yellow-400 border-2 border-yellow-600 flex items-center justify-center text-xs font-bold">!</div>
                      <div className="w-5 h-5 rounded-full bg-yellow-400 border-2 border-yellow-600 flex items-center justify-center text-xs font-bold">!</div>
                      <div className="w-5 h-5 rounded-full bg-green-500 border-2 border-green-700 flex items-center justify-center text-white text-xs">🔔</div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 ml-8">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="add-series-mode"
                      checked={seriesMode === 'series'}
                      onChange={() => setSeriesMode('series')}
                      className="w-4 h-4"
                    />
                    <label htmlFor="add-series-mode" className="text-sm font-medium text-gray-900 cursor-pointer">Set series\circuit</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="add-time-mode"
                      checked={seriesMode === 'time'}
                      onChange={() => setSeriesMode('time')}
                      className="w-4 h-4"
                    />
                    <label htmlFor="add-time-mode" className="text-sm font-medium text-gray-900 cursor-pointer">Set time\circuit</label>
                  </div>
                  {seriesMode === 'series' ? (
                    <div className="flex flex-col gap-2 mt-2">
                      <label className="text-sm font-medium text-gray-900">Series\circuit</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={newCircuitSeries}
                          onChange={(e) => setNewCircuitSeries(parseInt(e.target.value) || 1)}
                          className="w-20 px-3 py-2 border-2 border-blue-500 rounded-lg text-center focus:ring-2 focus:ring-blue-500 font-semibold"
                        />
                        <button type="button" className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-xl">×</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center mt-2">
                      <input
                        type="text"
                        value={timePerCircuit}
                        onChange={(e) => setTimePerCircuit(e.target.value)}
                        className="w-28 px-3 py-3 border-2 border-green-500 rounded-lg text-center focus:ring-2 focus:ring-green-500 font-mono text-lg font-bold"
                        placeholder="5'00&quot;"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-gray-900">A</div>
                  <div className="p-3 bg-gray-50 border-2 border-gray-300 rounded relative">
                    <div className="flex flex-col gap-1">
                      {[...Array(Math.min(newCircuitStations, 6))].map((_, i) => (
                        <div key={i} className="w-24 h-4 bg-gray-300 border border-gray-500 rounded" />
                      ))}
                    </div>
                    {/* Red indicator */}
                    <div className="absolute -right-6 top-2">
                      <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-red-700 flex items-center justify-center text-white text-xs">↓</div>
                    </div>
                    <div className="absolute -right-6 bottom-2">
                      <div className="w-5 h-5 rounded-full bg-yellow-400 border-2 border-yellow-600 flex items-center justify-center text-xs font-bold">!</div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 ml-8">
                  <label className="text-sm font-medium text-gray-900">Pause among series</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={pauseSeries}
                      onChange={(e) => setPauseSeries(e.target.value)}
                      className="w-24 px-3 py-2 border-2 border-blue-500 rounded-lg text-center focus:ring-2 focus:ring-blue-500 font-semibold"
                      placeholder="2'"
                    />
                    <button type="button" className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-xl">×</button>
                  </div>
                </div>
              </div>
              
              {/* Row 3: Execution settings */}
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-gray-900">A</div>
                  <div className="p-3 bg-gray-50 border-2 border-gray-300 rounded relative">
                    <div className="flex flex-col gap-1">
                      {[...Array(Math.min(newCircuitStations, 6))].map((_, i) => (
                        <div key={i} className="w-24 h-4 bg-gray-300 border border-gray-500 rounded" />
                      ))}
                    </div>
                    {/* Left indicator */}
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2">
                      <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-red-700 flex items-center justify-center text-white text-xs">←</div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 ml-8">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="add-exec-vertical"
                      checked={executionOrder === 'vertical'}
                      onChange={() => setExecutionOrder('vertical')}
                      className="w-4 h-4"
                    />
                    <label htmlFor="add-exec-vertical" className="text-sm font-medium text-gray-900 cursor-pointer">Execution vertically</label>
                    <span className="text-xs text-gray-500">(1 serie for station)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="add-exec-horizontal"
                      checked={executionOrder === 'horizontal'}
                      onChange={() => setExecutionOrder('horizontal')}
                      className="w-4 h-4"
                    />
                    <label htmlFor="add-exec-horizontal" className="text-sm font-medium text-gray-900 cursor-pointer">Execution horizontally</label>
                    <span className="text-xs text-gray-500">(all series for station)</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-gray-900">A</div>
                  <div className="p-3 bg-gray-50 border-2 border-gray-300 rounded relative">
                    <div className="flex flex-col gap-1">
                      {[...Array(Math.min(newCircuitStations, 4))].map((_, i) => (
                        <div key={i} className="w-24 h-5 bg-gray-300 border border-gray-500 rounded flex items-center justify-center gap-1 px-1">
                          <span className="text-[10px] font-bold text-gray-700">→</span>
                          <span className="text-[10px] font-bold text-gray-700">→</span>
                          <div className="w-6 h-4 bg-pink-200 border border-pink-400 rounded"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 ml-8">
                  <label className="text-sm font-medium text-gray-900">Pause\stations</label>
                  <input
                    type="text"
                    value={executionPauseStations}
                    onChange={(e) => setExecutionPauseStations(e.target.value)}
                    className="w-24 px-3 py-2 border-2 border-blue-500 rounded-lg text-center focus:ring-2 focus:ring-blue-500 font-semibold"
                    placeholder='10"'
                  />
                </div>
              </div>
            </div>
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Insert after which circuit</label>
              <select
                value={insertAfterCircuit}
                onChange={(e) => setInsertAfterCircuit(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
              >
                <option value="START">Before Circuit A</option>
                {exercises.map(ex => (
                  <option key={ex.letter} value={ex.letter}>After Circuit {ex.letter}</option>
                ))}
                <option value="">At End</option>
              </select>
            </div>
          </div>
          
          {/* Modal Footer */}
          <div className="flex items-center justify-between p-4 bg-white border-t border-gray-300">
            <button
              type="button"
              onClick={() => setShowAddCircuitModal(false)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-medium flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Preferences
              </button>
              <button
                type="button"
                onClick={handleConfirmAddCircuit}
                className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 font-medium"
              >
                Create circuit
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );
  
  if (showTemplate) {
    const templateContent = (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-3">
          <h3 className="font-semibold text-sm text-gray-900 mb-2">PREVIEW:</h3>
          <pre className="text-sm text-gray-800 whitespace-pre-wrap">{getPreviewText()}</pre>
        </div>
        
        <div className="flex gap-2">
          <button type="button" onClick={handleAddCircuit} className="px-4 py-2 bg-gray-700 text-white rounded text-sm font-medium hover:bg-gray-800">Add a circuit</button>
          <button type="button" className="px-4 py-2 bg-gray-700 text-white rounded text-sm font-medium hover:bg-gray-800">Add a station</button>
          <button type="button" className="px-4 py-2 bg-gray-700 text-white rounded text-sm font-medium hover:bg-gray-800">Add serie to a circuit</button>
          <button type="button" className="px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700">Remove</button>
        </div>
        
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr className="bg-gray-100">
                  <th className="px-2 py-2 text-center border-r border-gray-300 w-8 bg-gray-100"></th>
                  <th className="px-2 py-2 text-center border-r border-gray-300 font-semibold bg-gray-100" colSpan={3}>Parameters of work</th>
                  <th className="px-2 py-2 text-center border-r border-gray-300 font-semibold bg-gray-100" colSpan={2}>Exercises</th>
                  <th className="px-2 py-2 text-center font-semibold bg-gray-100" colSpan={2}>Load of work</th>
                </tr>
                <tr className="border-t border-gray-300 bg-gray-100">
                  <th className="px-2 py-2 text-center border-r border-gray-300 w-8 bg-gray-100"><button className="w-6 h-6 rounded-full bg-red-500 text-white hover:bg-red-600">×</button></th>
                  <th className="px-2 py-2 text-center border-r border-gray-300 bg-gray-50">Circ</th>
                  <th className="px-2 py-2 text-center border-r border-gray-300 bg-gray-50">Series</th>
                  <th className="px-2 py-2 text-center border-r border-gray-300 bg-gray-50">Stations</th>
                  <th className="px-2 py-2 text-center border-r border-gray-300 bg-gray-50">Sectors</th>
                  <th className="px-2 py-2 text-center border-r border-gray-300 bg-gray-50">Exercise</th>
                  <th className="px-2 py-2 text-center border-r border-gray-300 bg-gray-50">Rip</th>
                  <th className="px-2 py-2 text-center bg-gray-50">Pause</th>
                </tr>
              </thead>
              <tbody>
                {circuitRows.map((row, index) => (
                  <tr key={index} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="px-2 py-2 text-center border-r border-gray-200">
                      {row.series === 1 && row.station === 1 && (<button className="w-6 h-6 rounded-full bg-red-500 text-white hover:bg-red-600 text-xs">×</button>)}
                    </td>
                    <td className="px-2 py-2 text-center border-r border-gray-200 font-semibold">{row.circuit}</td>
                    <td className="px-2 py-2 text-center border-r border-gray-200">{row.series}</td>
                    <td className="px-2 py-2 text-center border-r border-gray-200">{row.station}</td>
                    <td className="px-2 py-2 border-r border-gray-200">
                      <input type="text" value={row.sector} onChange={(e) => {
                        const newRows = [...circuitRows];
                        newRows[index].sector = e.target.value;
                        setCircuitRows(newRows);
                      }} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                    </td>
                    <td className="px-2 py-2 border-r border-gray-200">
                      <input type="text" value={row.exercise} onChange={(e) => {
                        const newRows = [...circuitRows];
                        newRows[index].exercise = e.target.value;
                        setCircuitRows(newRows);
                      }} className="w-full px-2 py-1 bg-green-100 border border-green-300 rounded text-sm" placeholder="Exercise..." />
                    </td>
                    <td className="px-2 py-2 border-r border-gray-200">
                      <select value={row.rip} onChange={(e) => {
                        const newRows = [...circuitRows];
                        newRows[index].rip = e.target.value;
                        setCircuitRows(newRows);
                      }} className="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                        <option value=""></option>
                        <option value="reps">Reps</option>
                        <option value="time">Time</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <select value={row.pause} onChange={(e) => {
                        const newRows = [...circuitRows];
                        newRows[index].pause = e.target.value;
                        setCircuitRows(newRows);
                      }} className="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                        <option value=""></option>
                        <option value="set">Set time</option>
                        <option value="restart">Restart time</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t">
          <button type="button" onClick={handleBackToSettings} className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold">Back</button>
          <div className="flex gap-3">
            <button type="button" onClick={handleSaveCircuit} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">Add Moveframe</button>
            <button type="button" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"><RefreshCw className="w-4 h-4" />Reload exercises</button>
            <button type="button" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"><Settings className="w-4 h-4" />Preferences</button>
          </div>
        </div>
      </div>
    );
    
    return (
      <>
        {templateContent}
        {renderAddCircuitModal()}
      </>
    );
  }
  
  const settingsContent = (
    <div className="space-y-4">
      {/* Planner Mode Selection */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setPlannerMode('circuits')} className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${plannerMode === 'circuits' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'}`}>Circuits planner</button>
        <button type="button" onClick={() => setPlannerMode('fast')} className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${plannerMode === 'fast' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'}`}>Fast planner of Moveframes</button>
        <button type="button" onClick={() => setPlannerMode('ai')} className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${plannerMode === 'ai' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'}`}>Plan of Moveframes with AI</button>
      </div>
      
      {plannerMode === 'circuits' && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">⚠️ Here you can create sequences of exercises to be performed in circuits to be repeated</p>
        </div>
      )}
      
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Descriptions & instructions</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-green-50" rows={2} placeholder="Add circuit description and instructions..." />
      </div>
      
      {plannerMode === 'circuits' && (
        <div className="space-y-4">
          {/* Row 1: Circuits */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              {exercises.map((exercise) => (
                <div key={exercise.letter} className="flex items-center gap-2">
                  <div className="w-16 h-8 rounded flex items-center justify-center font-bold text-gray-900 border border-gray-400" style={{ backgroundColor: exercise.color }}>{exercise.letter}</div>
                  <input type="text" value={exercise.name} onChange={(e) => handleExerciseNameChange(exercises.findIndex(ex => ex.letter === exercise.letter), e.target.value)} className="flex-1 px-2 py-1 bg-yellow-100 border border-yellow-400 rounded focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Exercise name..." />
                </div>
              ))}
            </div>
            
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                {exercises.map((exercise, idx) => (
                  <div key={exercise.letter} className="flex items-center gap-2">
                    <div className="w-16 h-8 rounded flex items-center justify-center font-bold text-gray-700 bg-gray-200 border border-gray-400">{exercise.letter}</div>
                    <div className="flex-1 h-8"></div>
                    {idx === 0 && (
                      <div className="absolute right-0 flex items-center gap-2 bg-yellow-400 rounded-full px-2 py-1">
                        <span className="text-xs font-medium">!</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">No. Circuits</label>
                  <input type="number" value={numCircuits} onChange={(e) => setNumCircuits(parseInt(e.target.value) || 0)} min="1" className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 text-sm" />
                  <button type="button" className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-lg">×</button>
                </div>
                <div className="flex items-center gap-2 mt-auto">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Pause\circuits</label>
                  <input type="text" value={pauseCircuits} onChange={(e) => setPauseCircuits(e.target.value)} className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 text-sm" placeholder="4'" />
                  <button type="button" className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-lg">×</button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Row 2: Stations */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 border border-gray-300 rounded">
              <div className="flex items-center gap-1 mb-3">
                <div className="w-10 h-10 rounded flex items-center justify-center font-bold bg-red-100 border border-red-300 text-sm">A</div>
                {[...Array(Math.min(stationsPerCircuit, 6))].map((_, i) => (
                  <div key={i} className="flex-1 h-4 bg-yellow-200 border border-yellow-400 rounded" />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Station\circuit</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={stationsPerCircuit} onChange={(e) => setStationsPerCircuit(parseInt(e.target.value) || 0)} min="1" className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 text-sm" />
                  <button type="button" className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-lg">×</button>
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 border border-gray-300 rounded">
              <div className="flex items-center gap-1 mb-3">
                <div className="w-10 h-10 rounded flex items-center justify-center font-bold bg-gray-200 border border-gray-400 text-sm">A</div>
                {[...Array(Math.min(stationsPerCircuit, 6))].map((_, i) => (
                  <div key={i} className="relative flex-1 h-4 bg-gray-300 border border-gray-400 rounded">
                    {i < 4 && <div className="absolute -right-1 top-0 bottom-0 flex items-center"><div className="w-2 h-2 rounded-full bg-yellow-400 border border-yellow-600"></div></div>}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2">
                <label className="text-sm font-medium text-gray-700">Pause\stations</label>
                <input type="text" value={pauseStations} onChange={(e) => setPauseStations(e.target.value)} className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 text-sm" placeholder='10"' />
                <button type="button" className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-lg">×</button>
              </div>
            </div>
          </div>
          
          {/* Row 3: Series */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 border border-gray-300 rounded">
              <div className="flex items-start gap-2 mb-3">
                <div className="w-8 h-8 rounded flex items-center justify-center font-bold bg-red-100 border border-red-300 text-xs">A</div>
                <div className="flex flex-col gap-1">
                  {[...Array(Math.min(seriesPerCircuit, 6))].map((_, i) => (
                    <div key={i} className="w-20 h-3 bg-gray-300 border border-gray-400 rounded" />
                  ))}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="w-5 h-5 rounded-full bg-red-500 border border-red-700 flex items-center justify-center text-white text-xs">↓</div>
                  <div className="w-5 h-5 rounded-full bg-yellow-400 border border-yellow-600 flex items-center justify-center text-xs">!</div>
                  <div className="w-5 h-5 rounded-full bg-yellow-400 border border-yellow-600 flex items-center justify-center text-xs">!</div>
                  <div className="w-5 h-5 rounded-full bg-green-500 border border-green-700 flex items-center justify-center text-white text-xs">🔔</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={seriesMode === 'series'} onChange={() => setSeriesMode('series')} className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Set series\circuit</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={seriesMode === 'time'} onChange={() => setSeriesMode('time')} className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Set time\circuit</span>
                  </label>
                </div>
                {seriesMode === 'series' ? (
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Series\circuit</label>
                    <div className="flex items-center gap-2">
                      <input type="number" value={seriesPerCircuit} onChange={(e) => setSeriesPerCircuit(parseInt(e.target.value) || 0)} min="1" className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 text-sm" />
                      <button type="button" className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-lg">×</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <input type="text" value={timePerCircuit} onChange={(e) => setTimePerCircuit(e.target.value)} className="w-24 px-2 py-2 border-2 border-blue-500 rounded text-center focus:ring-2 focus:ring-blue-500 font-mono text-lg" placeholder="5'00&quot;" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 border border-gray-300 rounded flex flex-col justify-end">
              <div className="flex items-center justify-end gap-2">
                <label className="text-sm font-medium text-gray-700">Pause among series</label>
                <input type="text" value={pauseSeries} onChange={(e) => setPauseSeries(e.target.value)} disabled={seriesMode === 'time'} className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 disabled:text-gray-400 text-sm" placeholder="2'" />
                <button type="button" className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-lg">×</button>
              </div>
              {seriesMode === 'time' && <p className="text-xs text-gray-500 italic mt-1">Disabled when selected Time\circuit</p>}
            </div>
          </div>
          
          {/* Row 4: Execution */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 border border-gray-300 rounded">
              <div className="flex items-start gap-2 mb-3">
                <div className="w-8 h-8 rounded flex items-center justify-center font-bold bg-red-100 border border-red-300 text-xs">A</div>
                <div className="flex flex-col gap-1">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <div className="w-20 h-3 bg-gray-300 border border-gray-400 rounded" />
                      <span className="text-xs text-orange-600">➤</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-red-500 border border-red-700" />
                  <div className="w-0.5 h-16 bg-red-400" />
                  <div className="w-4 h-4 rounded-full bg-green-500 border border-green-700" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={executionOrder === 'vertical'} onChange={() => setExecutionOrder('vertical')} className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Execution vertically</span>
                </label>
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input type="radio" checked={executionOrder === 'horizontal'} onChange={() => setExecutionOrder('horizontal')} className="w-4 h-4 text-blue-600" />
                   <span className="text-sm font-medium text-gray-700">Execution horizontally</span>
                 </label>
                {executionOrder === 'horizontal' && <p className="text-xs text-gray-500 italic">(all series for station 1)</p>}
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 border border-gray-300 rounded">
              <div className="mb-3">
                {['A', 'B', 'C'].slice(0, 3).map((letter) => (
                  <div key={letter} className="flex items-center gap-1 mb-1">
                    <div className="w-6 h-6 rounded flex items-center justify-center font-bold bg-red-100 border border-red-300 text-xs">{letter}</div>
                    {[...Array(3)].map((_, j) => (
                      <React.Fragment key={j}>
                        <div className="w-12 h-3 bg-gray-300 border border-gray-400 rounded relative">
                          <span className="absolute right-1 text-xs text-orange-600">➤</span>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2">
                <label className="text-sm font-medium text-gray-700">Pause\stations</label>
                <input type="text" value={executionPauseStations} onChange={(e) => setExecutionPauseStations(e.target.value)} className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 text-sm" />
                <button type="button" className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-lg">×</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {plannerMode === 'fast' && (
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
          <p className="text-sm text-blue-800">Fast planner of Moveframes - Coming soon</p>
        </div>
      )}
      
      {plannerMode === 'ai' && (
        <div className="bg-purple-50 border border-purple-300 rounded-lg p-4">
          <p className="text-sm text-purple-800">Plan of Moveframes with AI - Coming soon</p>
        </div>
      )}
      
      <div className="flex items-center justify-between pt-4 border-t">
        <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
        <div className="flex gap-3">
          <button type="button" className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"><Settings className="w-4 h-4" />Preferences</button>
          <button type="button" onClick={generateCircuitTemplate} disabled={!sectionId || plannerMode !== 'circuits'} className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold">Create circuit</button>
        </div>
      </div>
    </div>
  );
  
  return (
    <>
      {settingsContent}
      {renderAddCircuitModal()}
    </>
  );
}
