'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, RotateCcw, X, Clock } from 'lucide-react';
import Image from 'next/image';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CircuitStation {
  stationNumber: number;
  sector: string;
  exercise: string;
  reps: string;
  pause: number; // seconds
}

interface Circuit {
  letter: string;
  name: string;
  isActive: boolean;
  stations: CircuitStation[];
}

interface CircuitExecutionSettings {
  numCircuits: number;
  pauseCircuits: number; // seconds
  stationsPerCircuit: number;
  pauseStations: number; // seconds
  seriesMode: 'series' | 'time';
  seriesPerCircuit: number;
  timePerCircuit: number; // seconds
  pauseSeries: number; // seconds
  executionOrder: 'vertical' | 'horizontal';
}

interface CircuitExecutionPlayerProps {
  circuits: Circuit[];
  settings: CircuitExecutionSettings;
  onComplete: () => void;
  onClose: () => void;
}

// ============================================================================
// EXECUTION STATE TYPES
// ============================================================================

type ExecutionPhase = 
  | 'ready'           // Before starting
  | 'working'         // Executing station
  | 'pauseStation'    // Pause between stations
  | 'pauseSeries'     // Pause between series
  | 'pauseCircuit'    // Pause between circuits
  | 'completed';      // All done

interface ExecutionState {
  phase: ExecutionPhase;
  currentCircuitIndex: number;
  currentSeriesNumber: number;
  currentStationNumber: number;
  timeElapsed: number; // deciseconds
  timeRemaining: number; // deciseconds (for time-based mode)
  isPaused: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CircuitExecutionPlayer({
  circuits,
  settings,
  onComplete,
  onClose
}: CircuitExecutionPlayerProps) {
  const [executionState, setExecutionState] = useState<ExecutionState>({
    phase: 'ready',
    currentCircuitIndex: 0,
    currentSeriesNumber: 1,
    currentStationNumber: 1,
    timeElapsed: 0,
    timeRemaining: settings.seriesMode === 'time' ? settings.timePerCircuit * 600 : 0, // Convert minutes to deciseconds
    isPaused: true
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ============================================================================
  // AUDIO NOTIFICATIONS
  // ============================================================================

  const playBeep = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  };

  // ============================================================================
  // TIMER LOGIC
  // ============================================================================

  useEffect(() => {
    if (!executionState.isPaused && executionState.phase !== 'completed') {
      timerRef.current = setInterval(() => {
        setExecutionState(prev => {
          const newState = { ...prev };

          // TIME-BASED MODE: Countdown timer
          if (settings.seriesMode === 'time') {
            if (prev.phase === 'working') {
              newState.timeRemaining = Math.max(0, prev.timeRemaining - 1);
              newState.timeElapsed = prev.timeElapsed + 1;

              // Time expired - move to next phase
              if (newState.timeRemaining === 0) {
                // Check if all series completed
                if (prev.currentSeriesNumber >= settings.seriesPerCircuit) {
                  // Move to next circuit
                  if (prev.currentCircuitIndex < circuits.length - 1) {
                    playBeep();
                    newState.phase = 'pauseCircuit';
                    newState.timeRemaining = settings.pauseCircuits * 10; // Convert to deciseconds
                  } else {
                    // All circuits completed!
                    playBeep();
                    newState.phase = 'completed';
                  }
                } else {
                  // Next series in same circuit (time-based doesn't have pause between series)
                  newState.currentSeriesNumber = prev.currentSeriesNumber + 1;
                  newState.timeRemaining = settings.timePerCircuit * 600; // Reset timer
                  playBeep();
                }
              }
            }
          }
          // SERIES-BASED MODE: Count-up timer
          else {
            if (prev.phase === 'working') {
              newState.timeElapsed = prev.timeElapsed + 1;

              // User must manually advance (or we auto-advance after station completes)
              // For now, we'll auto-advance for demo purposes
            } else if (prev.phase === 'pauseStation') {
              newState.timeRemaining = Math.max(0, prev.timeRemaining - 1);
              
              if (newState.timeRemaining === 0) {
                // Move to next station
                const currentCircuit = circuits[prev.currentCircuitIndex];
                if (prev.currentStationNumber < currentCircuit.stations.length) {
                  newState.phase = 'working';
                  newState.currentStationNumber = prev.currentStationNumber + 1;
                  newState.timeElapsed = 0;
                  playBeep();
                } else {
                  // All stations done in this series - pause between series
                  if (prev.currentSeriesNumber < settings.seriesPerCircuit) {
                    newState.phase = 'pauseSeries';
                    newState.timeRemaining = settings.pauseSeries * 10; // Convert to deciseconds
                    playBeep();
                  } else {
                    // All series done - pause between circuits
                    if (prev.currentCircuitIndex < circuits.length - 1) {
                      newState.phase = 'pauseCircuit';
                      newState.timeRemaining = settings.pauseCircuits * 10;
                      playBeep();
                    } else {
                      // All circuits completed!
                      newState.phase = 'completed';
                      playBeep();
                    }
                  }
                }
              }
            } else if (prev.phase === 'pauseSeries') {
              newState.timeRemaining = Math.max(0, prev.timeRemaining - 1);
              
              if (newState.timeRemaining === 0) {
                // Start next series
                newState.phase = 'working';
                newState.currentSeriesNumber = prev.currentSeriesNumber + 1;
                newState.currentStationNumber = 1;
                newState.timeElapsed = 0;
                playBeep();
              }
            } else if (prev.phase === 'pauseCircuit') {
              newState.timeRemaining = Math.max(0, prev.timeRemaining - 1);
              
              if (newState.timeRemaining === 0) {
                // Start next circuit
                newState.phase = 'working';
                newState.currentCircuitIndex = prev.currentCircuitIndex + 1;
                newState.currentSeriesNumber = 1;
                newState.currentStationNumber = 1;
                newState.timeElapsed = 0;
                playBeep();
              }
            }
          }

          return newState;
        });
      }, 100); // Update every 100ms (1 decisecond)

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [executionState.isPaused, executionState.phase, circuits, settings]);

  // ============================================================================
  // CONTROL FUNCTIONS
  // ============================================================================

  const handleStart = () => {
    setExecutionState(prev => ({
      ...prev,
      phase: 'working',
      isPaused: false,
      timeElapsed: 0,
      timeRemaining: settings.seriesMode === 'time' ? settings.timePerCircuit * 600 : settings.pauseStations * 10
    }));
  };

  const handlePause = () => {
    setExecutionState(prev => ({ ...prev, isPaused: true }));
  };

  const handleResume = () => {
    setExecutionState(prev => ({ ...prev, isPaused: false }));
  };

  const handleSkipStation = () => {
    const currentCircuit = circuits[executionState.currentCircuitIndex];
    
    if (executionState.currentStationNumber < currentCircuit.stations.length) {
      setExecutionState(prev => ({
        ...prev,
        phase: 'pauseStation',
        timeRemaining: settings.pauseStations * 10,
        timeElapsed: 0
      }));
    } else {
      // Last station - move to series pause or next circuit
      if (executionState.currentSeriesNumber < settings.seriesPerCircuit) {
        setExecutionState(prev => ({
          ...prev,
          phase: 'pauseSeries',
          timeRemaining: settings.pauseSeries * 10
        }));
      } else {
        if (executionState.currentCircuitIndex < circuits.length - 1) {
          setExecutionState(prev => ({
            ...prev,
            phase: 'pauseCircuit',
            timeRemaining: settings.pauseCircuits * 10
          }));
        } else {
          setExecutionState(prev => ({ ...prev, phase: 'completed' }));
        }
      }
    }
  };

  const handleReset = () => {
    setExecutionState({
      phase: 'ready',
      currentCircuitIndex: 0,
      currentSeriesNumber: 1,
      currentStationNumber: 1,
      timeElapsed: 0,
      timeRemaining: settings.seriesMode === 'time' ? settings.timePerCircuit * 600 : 0,
      isPaused: true
    });
  };

  // ============================================================================
  // FORMAT TIME HELPERS
  // ============================================================================

  const formatDeciseconds = (deciseconds: number): string => {
    const totalSeconds = Math.floor(deciseconds / 10);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const deci = deciseconds % 10;
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${deci}`;
  };

  // ============================================================================
  // RENDER CURRENT STATE
  // ============================================================================

  const currentCircuit = circuits[executionState.currentCircuitIndex];
  const currentStation = currentCircuit?.stations[executionState.currentStationNumber - 1];

  const getPhaseText = () => {
    switch (executionState.phase) {
      case 'ready':
        return 'Ready to start';
      case 'working':
        return settings.seriesMode === 'time' ? 'Time Circuit' : 'Performing Station';
      case 'pauseStation':
        return 'Pause between Stations';
      case 'pauseSeries':
        return 'Pause between Series';
      case 'pauseCircuit':
        return 'Pause between Circuits';
      case 'completed':
        return 'Workout Complete! 🎉';
      default:
        return '';
    }
  };

  const getPhaseColor = () => {
    switch (executionState.phase) {
      case 'working':
        return 'bg-green-500 border-green-700';
      case 'pauseStation':
      case 'pauseSeries':
      case 'pauseCircuit':
        return 'bg-yellow-400 border-yellow-600';
      case 'completed':
        return 'bg-blue-500 border-blue-700';
      default:
        return 'bg-gray-300 border-gray-500';
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto">
        {/* Hidden audio element for beep sound */}
        <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuC0fPTgjMGHm7A7+OZSA0PVqzo7KhUEw1Jpd/yuWYdBDKJ1PLPfS4FKHzM8N+RQgkTYLnq7KdTEwtFnt/yuWYdBDKJ1PLPfS4FKHzM8N+RQgkTYLnq7KdTEwtFnt/yuWYdBDKJ1PLPfS4FKHzM8N+RQgkTYLnq7KdTEwtFnt/yuWYdBDKJ1PLPfS4FKHzM8N+RQgkTYLnq7KdTEwtFnt/yuWYdBDKJ1PLPfS4FKHzM8N+RQgkTYLnq7KdTEwtFnt/yuWYdBDKJ1PLPfS4FKHzM8N+RQgkTYLnq7KdTEwtFnt/yuWYdBDKJ1PLPfS4FKHzM8N+RQgkTYLnq7KdTEwtFnt/yuWYdBDKJ1PLPfS4FKHzM8N+RQgkTYLnq7KdTEwtFnt/yuWYdBDKJ1PLPfS4FKHzM8N+RQgkTYLnq7KdTEwtFnt/yuWYdBDKJ1PLPfS4FKHzM8N+RQgkTYLnq7A==" />
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Circuit Execution</h2>
            <p className="text-blue-100 text-sm mt-1">{circuits.length} Circuits • {settings.seriesMode === 'series' ? `${settings.seriesPerCircuit} Series` : `${settings.timePerCircuit}min/Circuit`}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 flex items-center justify-center transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Main Display */}
        <div className="p-8">
          {/* Phase Indicator */}
          <div className={`${getPhaseColor()} border-4 rounded-2xl p-6 mb-6 text-center shadow-lg`}>
            <h3 className="text-3xl font-bold text-gray-900 mb-2">{getPhaseText()}</h3>
            <div className="flex items-center justify-center gap-4 text-gray-800">
              <div className="flex items-center gap-2">
                <div className={`w-12 h-12 rounded-full ${getPhaseColor()} border-4 flex items-center justify-center text-xl font-bold shadow-md`}>
                  {currentCircuit?.letter || '—'}
                </div>
                <span className="text-lg font-semibold">Circuit {executionState.currentCircuitIndex + 1}/{circuits.length}</span>
              </div>
              {settings.seriesMode === 'series' && (
                <>
                  <span className="text-2xl">•</span>
                  <span className="text-lg font-semibold">Series {executionState.currentSeriesNumber}/{settings.seriesPerCircuit}</span>
                  <span className="text-2xl">•</span>
                  <span className="text-lg font-semibold">Station {executionState.currentStationNumber}/{currentCircuit?.stations.length || 0}</span>
                </>
              )}
            </div>
          </div>

          {/* Timer Display */}
          <div className="bg-gray-900 text-white rounded-xl p-8 mb-6 text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <Image src="/timer.png" alt="timer" width={48} height={48} className="opacity-80" />
              <Clock className="w-12 h-12 text-blue-400" />
            </div>
            <div className="text-6xl font-mono font-bold mb-2">
              {settings.seriesMode === 'time' && executionState.phase === 'working'
                ? formatDeciseconds(executionState.timeRemaining)
                : formatDeciseconds(executionState.timeElapsed)}
            </div>
            <p className="text-gray-400 text-sm">
              {settings.seriesMode === 'time' && executionState.phase === 'working' ? 'Time Remaining' : 'Time Elapsed'}
            </p>
          </div>

          {/* Current Station Info */}
          {executionState.phase === 'working' && currentStation && (
            <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-500 rounded-xl p-6 mb-6">
              <h4 className="text-xl font-bold text-green-900 mb-3">Current Station</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Sector</p>
                  <p className="text-lg font-bold text-gray-900">{currentStation.sector || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Exercise</p>
                  <p className="text-lg font-bold text-gray-900">{currentStation.exercise || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Reps/Time</p>
                  <p className="text-lg font-bold text-gray-900">{currentStation.reps || '—'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-4">
            {executionState.phase === 'ready' && (
              <button
                onClick={handleStart}
                className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-3 text-lg font-bold shadow-lg"
              >
                <Play className="w-6 h-6" />
                Start Workout
              </button>
            )}

            {executionState.phase !== 'ready' && executionState.phase !== 'completed' && (
              <>
                {executionState.isPaused ? (
                  <button
                    onClick={handleResume}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-bold shadow-md"
                  >
                    <Play className="w-5 h-5" />
                    Resume
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2 font-bold shadow-md"
                  >
                    <Pause className="w-5 h-5" />
                    Pause
                  </button>
                )}

                <button
                  onClick={handleSkipStation}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-bold shadow-md"
                >
                  <SkipForward className="w-5 h-5" />
                  Skip
                </button>

                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 font-bold shadow-md"
                >
                  <RotateCcw className="w-5 h-5" />
                  Reset
                </button>
              </>
            )}

            {executionState.phase === 'completed' && (
              <button
                onClick={onComplete}
                className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-bold shadow-lg"
              >
                Finish & Save
              </button>
            )}
          </div>

          {/* Progress Indicator */}
          <div className="mt-6">
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{
                  width: `${((executionState.currentCircuitIndex * settings.seriesPerCircuit * (currentCircuit?.stations.length || 1) + 
                            (executionState.currentSeriesNumber - 1) * (currentCircuit?.stations.length || 1) + 
                            executionState.currentStationNumber) / 
                           (circuits.length * settings.seriesPerCircuit * (currentCircuit?.stations.length || 1))) * 100}%`
                }}
              />
            </div>
            <p className="text-center text-sm text-gray-600 mt-2">
              Overall Progress
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

