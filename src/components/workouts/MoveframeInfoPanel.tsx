'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import ReactDOM from 'react-dom';
import { X, Edit, Copy, Move, Trash2, Plus, CheckCircle, Circle, Clock, MapPin, Zap, PlusCircle } from 'lucide-react';
import { getSportIcon, isImageIcon } from '@/utils/sportIcons';
import { useSportIconType } from '@/hooks/useSportIconType';
import { formatMoveframeType, getRepsLabelCap, getRepsLabel, isDistanceBasedSport } from '@/constants/moveframe.constants';
import { stripInternalWorkoutTags } from '@/utils/sanitizeWorkoutHtml';
import { movelapPauseFieldLabel } from '@/utils/restTypeDb';

const stripCircuitTags = (content: string | null | undefined): string => {
  if (!content) return '';
  return stripInternalWorkoutTags(content).trim();
};

/** Build "distances only" line (e.g. 100\\A2+50\\A1+200\\B1) from movelaps; second return is typed description from notes. */
function getDistancesAndTypedDescription(moveframe: any): { distancesLine: string; typedDescription: string } {
  const movelaps = moveframe.movelaps || [];
  const distancesLine = movelaps.length > 0
    ? movelaps
        .map((lap: any) => {
          const val = lap.distance ?? lap.reps ?? lap.weight ?? '';
          const sp = lap.speed ?? lap.pace ?? '';
          const v = val !== '' && val != null ? String(val) : '?';
          const s = sp !== '' && sp != null ? String(sp) : '?';
          return `${v}\\${s}`;
        })
        .join('+')
    : '';
  const typedDescription = typeof moveframe.notes === 'string'
    ? stripCircuitTags(moveframe.notes)
    : '';
  return { distancesLine, typedDescription };
}

const extractCircuitDataFromNotes = (notes: unknown) => {
  if (typeof notes !== 'string') return null;
  const match = notes.match(/\[CIRCUIT_DATA\]([\s\S]*?)\[\/CIRCUIT_DATA\]/);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
};

const extractCircuitMetaFromNotes = (notes: unknown) => {
  if (typeof notes !== 'string') return null;
  const match = notes.match(/\[CIRCUIT_META\]([\s\S]*?)\[\/CIRCUIT_META\]/);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
};

const extractFastPlannerDataFromNotes = (notes: unknown): any | null => {
  if (typeof notes !== 'string') return null;
  const match = notes.match(/\[FAST_PLANNER_DATA\]([\s\S]*?)\[\/FAST_PLANNER_DATA\]/);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
};

const parsePauseToSeconds = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value !== 'string') return 0;
  const s = value.trim();
  if (!s) return 0;
  if (/^\d+$/.test(s)) return Math.max(0, parseInt(s, 10));
  if (s.includes("'")) {
    const parts = s.split("'");
    const mStr = (parts[0] ?? '').replace(/\D/g, '');
    const secStr = parts.slice(1).join("'").replace(/\D/g, '');
    const m = mStr ? parseInt(mStr, 10) : 0;
    const sec = secStr ? parseInt(secStr.slice(0, 2), 10) : 0;
    return Math.max(0, m * 60 + sec);
  }
  const secOnly = s.match(/^(\d+)\s*"?$/);
  if (secOnly) return Math.max(0, parseInt(secOnly[1], 10));
  return 0;
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
  const fastPlannerPayloadFromNotes = extractFastPlannerDataFromNotes(moveframe?.notes);
  const fastPlannerPayload = moveframe?.fastPlannerData ?? fastPlannerPayloadFromNotes ?? null;
  let fallbackTotalMovelaps = 0;
  let fallbackTotalDistance = 0;
  let fallbackTotalTime = 0;
  let fallbackTotalReps = 0;
  if ((!movelaps || movelaps.length === 0) && fastPlannerPayload && Array.isArray(fastPlannerPayload.rows)) {
    const rows = fastPlannerPayload.rows;
    if (fastPlannerPayload.plannerType === 'aerobic') {
      fallbackTotalMovelaps = rows.length;
      for (const r of rows) {
        const dist = parseInt((r?.distance ?? '').toString()) || 0;
        fallbackTotalDistance += dist;
        const t = r?.time != null ? r.time.toString() : '';
        if (t) {
          if (t.includes('h') || t.includes("'")) {
            const m = t.match(/(\d+)h(\d+)'(\d+)"/);
            if (m) {
              const hours = parseInt(m[1]) || 0;
              const minutes = parseInt(m[2]) || 0;
              const seconds = parseInt(m[3]) || 0;
              fallbackTotalTime += (hours * 60) + minutes + (seconds / 60);
            }
          } else if (t.includes(':')) {
            const parts = t.split(':');
            const hours = parseInt(parts[0]) || 0;
            const minutes = parseInt(parts[1]) || 0;
            const seconds = parseInt(parts[2]) || 0;
            fallbackTotalTime += (hours * 60) + minutes + (seconds / 60);
          } else {
            fallbackTotalTime += parseFloat(t) || 0;
          }
        }
      }
    } else {
      const mode = fastPlannerPayload.ripTimeMode;
      fallbackTotalMovelaps = rows.reduce((sum: number, r: any) => {
        const seriesCount = parseInt((r?.series ?? '').toString()) || 0;
        return sum + (seriesCount > 0 ? seriesCount : 1);
      }, 0);
      for (const r of rows) {
        const rt = (r?.ripTime ?? '').toString();
        const seriesCount = parseInt((r?.series ?? '').toString()) || 0;
        const multiplier = seriesCount > 0 ? seriesCount : 1;
        if (mode === 'reps') {
          fallbackTotalReps += (parseInt(rt) || 0) * multiplier;
        } else if (mode === 'time') {
          if (rt) {
            if (rt.includes("'") || rt.includes('"')) {
              const m = rt.match(/(\d+)'(\d+)"/);
              if (m) {
                const minutes = parseInt(m[1]) || 0;
                const seconds = parseInt(m[2]) || 0;
                fallbackTotalTime += (minutes + (seconds / 60)) * multiplier;
              }
            } else {
              fallbackTotalTime += (parseFloat(rt) || 0) * multiplier;
            }
          }
        }
      }
    }
  }
  const totalMovelaps = movelaps.length || fallbackTotalMovelaps;
  const completedMovelaps = movelaps.filter((ml: any) => ml.status === 'COMPLETED').length;
  const totalDistance = movelaps.length > 0
    ? movelaps.reduce((sum: number, ml: any) => sum + (parseInt(ml.distance) || 0), 0)
    : fallbackTotalDistance;
  const isCircuitBased = moveframe.isCircuitBased === true;
  const circuitData = isCircuitBased ? extractCircuitDataFromNotes(moveframe.notes) : null;
  const circuitConfig = circuitData?.config || null;
  const circuitRows: any[] = Array.isArray(circuitData?.circuits) ? circuitData.circuits : [];
  const pauseCircuitsSeconds: number | null =
    circuitConfig && circuitConfig.pauseCircuits !== undefined
      ? circuitConfig.pauseCircuits * 60
      : circuitConfig?.pauses?.circuits !== undefined
        ? circuitConfig.pauses.circuits
        : null;
  const pauseSeriesSeconds: number | null =
    circuitConfig && circuitConfig.pauseSeries !== undefined
      ? circuitConfig.pauseSeries * 60
      : circuitConfig?.pauses?.series !== undefined
        ? circuitConfig.pauses.series
        : null;
  const defaultSeriesPerCircuit: number | null =
    circuitConfig?.seriesPerCircuit ?? circuitConfig?.seriesCount ?? circuitConfig?.series ?? null;
  const defaultStationsPerCircuit: number | null = circuitConfig?.stationsPerCircuit ?? circuitConfig?.stations ?? null;
  const circuitInfoByLetter = new Map<string, { seriesCount: number; stationsPerSeries: number }>();
  if (isCircuitBased) {
    circuitRows.forEach((circuit: any) => {
      const letter = typeof circuit?.letter === 'string' ? circuit.letter : '';
      if (!letter) return;
      const seriesCount = circuit.series ?? circuit.stationsBySeries?.length ?? defaultSeriesPerCircuit ?? 0;
      const stationsPerSeries = circuit.stationsBySeries?.[0]?.length ?? defaultStationsPerCircuit ?? 0;
      circuitInfoByLetter.set(letter, { seriesCount, stationsPerSeries });
    });
  }
  const lastCircuitLetter =
    circuitRows.length > 0
      ? String(circuitRows[circuitRows.length - 1]?.letter ?? '').trim().toUpperCase()
      : '';
  const totalCircuitSeries = isCircuitBased ? totalMovelaps : 0;
  const completedCircuitSeries = isCircuitBased ? completedMovelaps : 0;
  const totalCircuitRepetitions = isCircuitBased
    ? movelaps.reduce((sum: number, ml: any) => {
        const valueSource = isDistanceBasedSport(moveframe.sport) ? ml.speed : ml.reps;
        return sum + (parseInt(valueSource) || 0);
      }, 0)
    : 0;
  
  // Parse time in format: HhMM'SS" (e.g., "1h23'45"")
  const totalTime = movelaps.length === 0
    ? fallbackTotalTime
    : movelaps.reduce((sum: number, ml: any) => {
    const timeStr = ml.time != null ? ml.time.toString() : '';
    let timeSeconds = 0;
    if (timeStr) {
      if (timeStr.includes('h') || timeStr.includes("'")) {
        const match = timeStr.match(/(\d+)h(\d+)'(\d+)"/);
        if (match) {
          const hours = parseInt(match[1]) || 0;
          const minutes = parseInt(match[2]) || 0;
          const seconds = parseInt(match[3]) || 0;
          timeSeconds = (hours * 3600) + (minutes * 60) + seconds;
        }
      } else if (timeStr.includes(':')) {
        const parts = timeStr.split(':');
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseInt(parts[2]) || 0;
        timeSeconds = (hours * 3600) + (minutes * 60) + seconds;
      } else {
        const mins = parseFloat(timeStr) || 0;
        timeSeconds = mins * 60;
      }
    }

    if (!isCircuitBased) return sum + (timeSeconds / 60);

    const meta = extractCircuitMetaFromNotes(ml?.notes);
    const circuitLetter =
      (typeof meta?.circuitLetter === 'string' && meta.circuitLetter.trim() !== ''
        ? meta.circuitLetter.trim()
        : (typeof ml?.circuitLetter === 'string' ? ml.circuitLetter.trim() : '')) || '';
    const normalizedCircuitLetter = circuitLetter.trim().toUpperCase();
    const localSeriesNumber =
      meta?.localSeriesNumber ?? meta?.seriesNumber ?? ml?.localSeriesNumber ?? ml?.seriesNumber ?? null;
    const stationNumber = meta?.stationNumber ?? ml?.stationNumber ?? null;

    const circuitInfo = circuitLetter ? circuitInfoByLetter.get(circuitLetter) : null;
    const seriesCount = circuitInfo?.seriesCount ?? defaultSeriesPerCircuit ?? 0;
    const stationsPerSeries = circuitInfo?.stationsPerSeries ?? defaultStationsPerCircuit ?? 0;
    const isEndOfSeries = !!(stationsPerSeries && stationNumber && stationNumber === stationsPerSeries);
    const isEndOfCircuit = !!(isEndOfSeries && seriesCount && localSeriesNumber && localSeriesNumber === seriesCount);
    const isWorkoutFinalRestRow =
      isEndOfCircuit &&
      !!lastCircuitLetter &&
      !!normalizedCircuitLetter &&
      normalizedCircuitLetter === lastCircuitLetter;

    const hasExplicitMacro = ml?.macroFinal != null && String(ml.macroFinal).trim() !== '';
    const shouldShowDerivedMacro =
      !hasExplicitMacro &&
      !isWorkoutFinalRestRow &&
      ((isEndOfCircuit && pauseCircuitsSeconds != null) || (isEndOfSeries && pauseSeriesSeconds != null));
    const hasMacroDisplay = hasExplicitMacro || shouldShowDerivedMacro;

    const macroSeconds = hasExplicitMacro
      ? parsePauseToSeconds(ml.macroFinal)
      : isWorkoutFinalRestRow
        ? 0
        : isEndOfCircuit && pauseCircuitsSeconds != null
          ? pauseCircuitsSeconds
          : isEndOfSeries && pauseSeriesSeconds != null
            ? pauseSeriesSeconds
            : 0;
    const pauseSeconds = hasMacroDisplay ? 0 : parsePauseToSeconds(ml.pause);

    return sum + ((timeSeconds + pauseSeconds + macroSeconds) / 60);
  }, 0);
  
  const totalReps = movelaps.length > 0
    ? movelaps.reduce((sum: number, ml: any) => sum + (parseInt(ml.reps) || 0), 0)
    : fallbackTotalReps;

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
                  <Image 
                    src={getSportIcon(moveframe.sport, iconType)} 
                    alt={moveframe.sport} 
                    width={48}
                    height={48}
                    className="w-12 h-12 object-cover rounded" 
                    unoptimized
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
                    if (moveframe.manualMode) {
                      const rawContent = (moveframe.notes || moveframe.description) || '';
                      const content = stripCircuitTags(rawContent);
                      return content ? (
                        <div
                          className="text-gray-700 max-w-none prose prose-lg"
                          style={{ fontSize: '16px', lineHeight: '1.8' }}
                          dangerouslySetInnerHTML={{ __html: content }}
                        />
                      ) : (
                        <p className="text-gray-700">No description provided</p>
                      );
                    }
                    // Non-manual: show ONLY distances (e.g. 100\A2+50\A1+200\B1) on first row, typed description on second row if exists
                    const distanceBasedSports = ['SWIM', 'BIKE', 'MTB', 'SPINNING', 'RUN', 'ROWING', 'CANOEING', 'SKATE', 'SKI', 'SNOWBOARD', 'HIKING', 'WALKING'];
                    const isDistanceBased = distanceBasedSports.includes(moveframe.sport);
                    const hasMovelaps = movelaps && movelaps.length > 0;
                    const distancesOnlyParts: string[] = [];
                    if (hasMovelaps && isDistanceBased) {
                      for (const ml of movelaps) {
                        const distRaw = ml.distance != null ? String(ml.distance).replace(/\s*m$/, '').trim() : '';
                        const distNum = distRaw ? distRaw.replace(/\D/g, '') || distRaw : '';
                        const speed = (ml.speed != null ? String(ml.speed).trim() : '') || '';
                        if (distNum || distRaw) {
                          const d = distNum || distRaw;
                          distancesOnlyParts.push(speed ? `${d}\\${speed}` : d);
                        }
                      }
                    } else if (isDistanceBased && fastPlannerPayload?.plannerType === 'aerobic' && Array.isArray(fastPlannerPayload.rows) && (fastPlannerPayload.rows as any[]).length > 0) {
                      for (const r of fastPlannerPayload.rows as any[]) {
                        const distRaw = r.distance != null ? String(r.distance).replace(/\s*m$/, '').trim() : '';
                        const distNum = distRaw ? distRaw.replace(/\D/g, '') || distRaw : '';
                        const speed = (r.speed != null ? String(r.speed).trim() : '') || '';
                        if (distNum || distRaw) {
                          const d = distNum || distRaw;
                          distancesOnlyParts.push(speed ? `${d}\\${speed}` : d);
                        }
                      }
                    }
                    const distancesOnlyLine = distancesOnlyParts.length > 0 ? distancesOnlyParts.join('+') : '';
                    let typedDescriptionLine = '';
                    if (fastPlannerPayload && typeof (fastPlannerPayload as any).descriptionInstructions === 'string') {
                      typedDescriptionLine = ((fastPlannerPayload as any).descriptionInstructions as string).trim();
                    }
                    if (!typedDescriptionLine && moveframe.description) {
                      const stripped = stripCircuitTags(moveframe.description);
                      const brIndex = stripped.indexOf('<br/>');
                      const nlIndex = stripped.indexOf('\n');
                      const splitAt = brIndex >= 0 ? brIndex : (nlIndex >= 0 ? nlIndex : -1);
                      if (splitAt > 0) {
                        const after = stripped.slice(splitAt).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
                        if (after) typedDescriptionLine = after;
                      }
                    }
                    if (distancesOnlyLine || typedDescriptionLine) {
                      return (
                        <div className="text-gray-700 text-sm space-y-2">
                          {distancesOnlyLine && (
                            <p className="font-medium text-gray-900 whitespace-pre-wrap">{distancesOnlyLine}</p>
                          )}
                          {typedDescriptionLine && (
                            <div
                              className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap"
                              dangerouslySetInnerHTML={{ __html: typedDescriptionLine.replace(/\n/g, '<br/>') }}
                            />
                          )}
                        </div>
                      );
                    }
                    // Parse pipe-separated format (e.g. "100m | Track | Speed A1 | Strokes 60 | ...") to extract distances only
                    const fallbackContent = stripCircuitTags(moveframe.description || '');
                    if (fallbackContent && fallbackContent.includes(' | ') && fallbackContent.includes('Speed ')) {
                      const parsedParts: string[] = [];
                      const lines = fallbackContent.split(/\r?\n/);
                      for (const line of lines) {
                        const parts = line.split(/\s*\|\s*/).map((p) => p.trim());
                        if (parts.length >= 1) {
                          const firstPart = (parts[0] || '').replace(/\s*m$/i, '').trim();
                          const distNum = firstPart.replace(/\D/g, '') || firstPart;
                          const speedPart = parts.find((p) => p.startsWith('Speed '));
                          const speed = speedPart ? speedPart.replace(/^Speed\s+/i, '').trim() : '';
                          if (distNum) {
                            parsedParts.push(speed ? `${distNum}\\${speed}` : distNum);
                          }
                        }
                      }
                      const parsedDistancesOnly = parsedParts.join('+');
                      if (parsedDistancesOnly) {
                        // Typed description from notes (user part outside metadata tags) if not already set
                        let parsedTypedDesc = typedDescriptionLine;
                        if (!parsedTypedDesc && typeof moveframe.notes === 'string') {
                          const userPart = stripCircuitTags(moveframe.notes);
                          if (userPart) parsedTypedDesc = userPart;
                        }
                        return (
                          <div className="text-gray-700 text-sm space-y-2">
                            <p className="font-medium text-gray-900 whitespace-pre-wrap">{parsedDistancesOnly}</p>
                            {parsedTypedDesc && (
                              <div
                                className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{ __html: parsedTypedDesc.replace(/\n/g, '<br/>') }}
                              />
                            )}
                          </div>
                        );
                      }
                    }
                    return fallbackContent ? (
                      <div
                        className="text-gray-700 max-w-none prose prose-sm"
                        dangerouslySetInnerHTML={{ __html: fallbackContent }}
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
                    <div className="text-purple-600 text-sm font-medium mb-1">{isCircuitBased ? 'Total series' : 'Total sets'}</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {isCircuitBased ? `${completedCircuitSeries}/${totalCircuitSeries}` : `${completedMovelaps}/${totalMovelaps}`}
                    </div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="text-orange-600 text-sm font-medium mb-1">
                      {isCircuitBased ? 'Total repetitions' : `Total ${getRepsLabelCap(moveframe.sport)}`}
                    </div>
                    <div className="text-2xl font-bold text-orange-900">
                      {isCircuitBased ? (totalCircuitRepetitions > 0 ? totalCircuitRepetitions : 'N/A') : (totalReps > 0 ? totalReps : 'N/A')}
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
                                  {movelapPauseFieldLabel(movelap.restType)}: {movelap.pause}
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
              {(isCircuitBased ? totalCircuitRepetitions > 0 : totalReps > 0) && (
                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-6 border border-orange-200">
                  <h4 className="font-semibold text-orange-900 mb-4">Repetitions Analysis</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-orange-700">
                        {isCircuitBased ? 'Total repetitions:' : `Total ${getRepsLabelCap(moveframe.sport)}:`}
                      </span>
                      <span className="font-bold text-orange-900">{isCircuitBased ? totalCircuitRepetitions : totalReps}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-orange-700">{isCircuitBased ? 'Average per Series:' : 'Average per Set:'}</span>
                      <span className="font-bold text-orange-900">
                        {totalMovelaps > 0
                          ? Math.round((isCircuitBased ? totalCircuitRepetitions : totalReps) / totalMovelaps)
                          : 'N/A'}
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

