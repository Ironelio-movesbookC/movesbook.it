'use client';

import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Edit, Copy, Move, Trash2, Plus, CheckCircle, Circle, Clock, MapPin, Zap, PlusCircle } from 'lucide-react';
import { getSportIcon, isImageIcon } from '@/utils/sportIcons';
import { useSportIconType } from '@/hooks/useSportIconType';
import { formatMoveframeType, getRepsLabelCap, getRepsLabel } from '@/constants/moveframe.constants';

// 2026-01-22 14:45 UTC - Helper to strip circuit metadata tags from content
const stripCircuitTags = (content: string | null | undefined): string => {
  if (!content) return '';
  return content
    .replace(/\[CIRCUIT_DATA\][\s\S]*?\[\/CIRCUIT_DATA\]/g, '')
    .replace(/\[CIRCUIT_META\][\s\S]*?\[\/CIRCUIT_META\]/g, '')
    .trim();
};

interface MoveframeInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  moveframe: any;
  workout: any;
  day: any;
  onEdit?: () => void;
  onCopy?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
  onAddMovelap?: () => void;
  onEditMovelap?: (movelap: any) => void;
  onDeleteMovelap?: (movelap: any) => void;
  onBulkAddMovelaps?: () => void;
}

export default function MoveframeInfoPanel({
  isOpen,
  onClose,
  moveframe,
  workout,
  day,
  onEdit,
  onCopy,
  onMove,
  onDelete,
  onAddMovelap,
  onEditMovelap,
  onDeleteMovelap,
  onBulkAddMovelaps
}: MoveframeInfoPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'movelaps' | 'stats'>('overview');
  const [isMounted, setIsMounted] = useState(false);
  const iconType = useSportIconType();
  const useImageIcons = isImageIcon(iconType);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // Restore body scroll
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen || !isMounted) return null;

  // Calculate totals
  const movelaps = moveframe.movelaps || [];
  const totalMovelaps = movelaps.length;
  const completedMovelaps = movelaps.filter((ml: any) => ml.status === 'COMPLETED').length;
  const totalDistance = movelaps.reduce((sum: number, ml: any) => sum + (parseInt(ml.distance) || 0), 0);
  
  // Parse time in format: HhMM'SS" (e.g., "1h23'45"")
  const totalTime = movelaps.reduce((sum: number, ml: any) => {
    if (ml.time) {
      const timeStr = ml.time.toString();
      let totalSeconds = 0;
      
      // Check for our custom format: 1h23'45"
      if (timeStr.includes('h') || timeStr.includes("'")) {
        const match = timeStr.match(/(\d+)h(\d+)'(\d+)"/);
        if (match) {
          const hours = parseInt(match[1]) || 0;
          const minutes = parseInt(match[2]) || 0;
          const seconds = parseInt(match[3]) || 0;
          totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
        }
      }
      // Check for HH:MM:SS format
      else if (timeStr.includes(':')) {
        const parts = timeStr.split(':');
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseInt(parts[2]) || 0;
        totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
      }
      // Plain number (assume minutes)
      else {
        const mins = parseFloat(timeStr) || 0;
        totalSeconds = mins * 60;
      }
      
      // Return total in minutes for formatTime function
      return sum + (totalSeconds / 60);
    }
    return sum;
  }, 0);
  
  const totalReps = movelaps.reduce((sum: number, ml: any) => sum + (parseInt(ml.reps) || 0), 0);

  // Get section color
  const sectionColor = moveframe.section?.color || '#6366f1';
  const sectionName = moveframe.section?.name || 'Unknown';

  // Format time as HH:MM'SS"
  const formatTime = (minutes: number): string => {
    const totalSeconds = Math.round(minutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}'${secs.toString().padStart(2, '0')}"`;
  };

  // Format distance
  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999999] p-4"
      onMouseDown={(e) => {
        // Only close if clicking on the backdrop itself (not the modal)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onWheel={(e) => e.stopPropagation()}
      style={{ overflow: 'hidden' }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
        onMouseEnter={(e) => e.stopPropagation()}
        onMouseLeave={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onMouseOver={(e) => e.stopPropagation()}
        onMouseOut={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {useImageIcons ? (
                  <img 
                    src={getSportIcon(moveframe.sport, iconType)} 
                    alt={moveframe.sport} 
                    className="w-12 h-12 object-cover rounded" 
                  />
                ) : (
                  <span className="text-4xl">{getSportIcon(moveframe.sport, iconType)}</span>
                )}
                <div>
                  <h2 className="text-2xl font-bold">
                    Moveframe {moveframe.letter}
                  </h2>
                  <p className="text-indigo-200 text-sm">
                    {moveframe.sport?.replace(/_/g, ' ')} • {formatMoveframeType(moveframe.type)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: sectionColor }}
                  />
                  <span>{sectionName}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                  <Clock size={14} />
                  <span>{new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                  <span>Workout #{workout.sessionNumber}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                onEdit?.();
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm"
            >
              <Edit size={16} />
              Edit
            </button>
            <button
              onClick={() => {
                onCopy?.();
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm"
            >
              <Copy size={16} />
              Copy
            </button>
            <button
              onClick={() => {
                onMove?.();
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm"
            >
              <Move size={16} />
              Move
            </button>
            <button
              onClick={() => {
                if (confirm('Delete this moveframe and all its movelaps?')) {
                  onDelete?.();
                  onClose();
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors text-sm ml-auto"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('movelaps')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'movelaps'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Total {getRepsLabel(moveframe.sport)} ({totalMovelaps})
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'stats'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Statistics
            </button>
          </div>
        </div>

        {/* Content */}
        <div 
          className="flex-1 overflow-y-auto p-6"
          onWheel={(e) => e.stopPropagation()}
          style={{ overscrollBehavior: 'contain' }}
        >
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {moveframe.manualMode ? 'Extended Text' : 'Description'}
                </h3>
                <div className={`bg-gray-50 rounded-lg p-4 border border-gray-200 overflow-y-auto ${
                  moveframe.manualMode ? 'max-h-[500px]' : 'max-h-[300px]'
                }`}>
                  {(() => {
                    // For manual mode, use notes (full content) instead of description (truncated)
                    // 2026-01-22 14:45 UTC - Strip circuit tags from all content
                    const rawContent = moveframe.manualMode 
                      ? (moveframe.notes || moveframe.description)
                      : moveframe.description;
                    const content = stripCircuitTags(rawContent);
                    
                    return content ? (
                      <div 
                        className={`text-gray-700 max-w-none ${
                          moveframe.manualMode ? 'prose prose-lg' : 'prose prose-sm'
                        }`}
                        style={moveframe.manualMode ? {
                          fontSize: '16px',
                          lineHeight: '1.8'
                        } : undefined}
                        dangerouslySetInnerHTML={{ __html: content }}
                      />
                    ) : (
                      <p className="text-gray-700">No description provided</p>
                    );
                  })()}
                </div>
              </div>

              {/* Key Metrics */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Metrics</h3>
                <div className={`grid grid-cols-2 ${moveframe.sport !== 'BODY_BUILDING' ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
                  {/* Hide Total Distance for bodybuilding */}
                  {moveframe.sport !== 'BODY_BUILDING' && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="text-blue-600 text-sm font-medium mb-1">Total Distance</div>
                      <div className="text-2xl font-bold text-blue-900">
                        {totalDistance > 0 ? formatDistance(totalDistance) : 'N/A'}
                      </div>
                    </div>
                  )}
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="text-green-600 text-sm font-medium mb-1">Total Time</div>
                    <div className="text-2xl font-bold text-green-900">
                      {totalTime > 0 ? formatTime(totalTime) : 'N/A'}
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="text-purple-600 text-sm font-medium mb-1">Total sets</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {completedMovelaps}/{totalMovelaps}
                    </div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="text-orange-600 text-sm font-medium mb-1">Total {getRepsLabelCap(moveframe.sport)}</div>
                    <div className="text-2xl font-bold text-orange-900">
                      {totalReps > 0 ? totalReps : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress */}
              {totalMovelaps > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Progress</h3>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Completion</span>
                      <span className="text-sm font-medium text-gray-900">
                        {Math.round((completedMovelaps / totalMovelaps) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${(completedMovelaps / totalMovelaps) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Movelaps Tab */}
          {activeTab === 'movelaps' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Total {getRepsLabel(moveframe.sport)} ({totalMovelaps})
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onBulkAddMovelaps?.();
                      onClose();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    <PlusCircle size={16} />
                    Bulk Add
                  </button>
                  <button
                    onClick={() => {
                      onAddMovelap?.();
                      onClose();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                  >
                    <Plus size={16} />
                    Add One
                  </button>
                </div>
              </div>

              {movelaps.length > 0 ? (
                <div className="space-y-2">
                  {movelaps.map((movelap: any, index: number) => (
                    <div
                      key={movelap.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {/* Status Icon */}
                          <div className="mt-1">
                            {movelap.status === 'COMPLETED' ? (
                              <CheckCircle size={20} className="text-green-500" />
                            ) : (
                              <Circle size={20} className="text-gray-400" />
                            )}
                          </div>

                          {/* Movelap Details */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-bold text-gray-700">
                                #{movelap.repetitionNumber || index + 1}
                              </span>
                              {/* For Body Building, show exercise name instead of distance */}
                              {moveframe.sport === 'BODY_BUILDING' ? (
                                movelap.exercise && (
                                  <span className="text-sm text-gray-600 font-medium">
                                    {movelap.exercise}
                                  </span>
                                )
                              ) : (
                                movelap.distance && (
                                  <span className="text-sm text-gray-600">
                                    {movelap.distance}m
                                  </span>
                                )
                              )}
                              {movelap.speed && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                  {movelap.speed}
                                </span>
                              )}
                              {movelap.pause && (
                                <span className="text-xs text-gray-500">
                                  Pause: {movelap.pause}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-600">
                              {movelap.style && (
                                <div>
                                  <span className="font-medium">Style:</span> {movelap.style}
                                </div>
                              )}
                              {movelap.pace && (
                                <div>
                                  <span className="font-medium">Pace:</span> {movelap.pace}
                                </div>
                              )}
                              {movelap.time && (
                                <div>
                                  <span className="font-medium">Time:</span> {movelap.time}
                                </div>
                              )}
                              {movelap.reps && (
                                <div>
                                  <span className="font-medium">{getRepsLabelCap(moveframe.sport)}:</span> {movelap.reps}
                                </div>
                              )}
                            </div>

                            {movelap.notes && (
                              <div className="mt-2 text-xs text-gray-600 italic">
                                "{movelap.notes}"
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => {
                              onEditMovelap?.(movelap);
                              onClose();
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit movelap"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this movelap?')) {
                                onDeleteMovelap?.(movelap);
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete movelap"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Circle size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No movelaps yet</p>
                  <button
                    onClick={() => {
                      onAddMovelap?.();
                      onClose();
                    }}
                    className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                  >
                    Add your first movelap
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Detailed Statistics</h3>

              {/* Completion Stats */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                <h4 className="font-semibold text-green-900 mb-4">Completion Status</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-green-900">{completedMovelaps}</div>
                    <div className="text-sm text-green-700">Completed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-900">{totalMovelaps - completedMovelaps}</div>
                    <div className="text-sm text-orange-700">Pending</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-900">{totalMovelaps}</div>
                    <div className="text-sm text-blue-700">Total</div>
                  </div>
                </div>
              </div>

              {/* Distance Breakdown */}
              {totalDistance > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-4">Distance Analysis</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">Total Distance:</span>
                      <span className="font-bold text-blue-900">{formatDistance(totalDistance)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">Average per Lap:</span>
                      <span className="font-bold text-blue-900">
                        {totalMovelaps > 0 ? formatDistance(totalDistance / totalMovelaps) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Time Breakdown */}
              {totalTime > 0 && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-4">Time Analysis</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-purple-700">Total Time:</span>
                      <span className="font-bold text-purple-900">{formatTime(totalTime)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-purple-700">Average per Lap:</span>
                      <span className="font-bold text-purple-900">
                        {totalMovelaps > 0 ? formatTime(totalTime / totalMovelaps) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Reps/Series Breakdown (for non-aerobic sports) */}
              {totalReps > 0 && (
                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-6 border border-orange-200">
                  <h4 className="font-semibold text-orange-900 mb-4">Repetitions Analysis</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-orange-700">Total {getRepsLabelCap(moveframe.sport)}:</span>
                      <span className="font-bold text-orange-900">{totalReps}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-orange-700">Average per Set:</span>
                      <span className="font-bold text-orange-900">
                        {totalMovelaps > 0 ? Math.round(totalReps / totalMovelaps) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div>
              Moveframe ID: {moveframe.id}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

