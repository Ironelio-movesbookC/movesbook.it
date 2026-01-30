'use client';

import React from 'react';
import { X, Printer } from 'lucide-react';
import { shouldShowDistance, getDistanceUnit, AEROBIC_SPORTS } from '@/constants/moveframe.constants';
import { useSportIconType } from '@/hooks/useSportIconType';
import { isImageIcon } from '@/utils/sportIcons';

const stripCircuitTags = (content: string | null | undefined): string => {
  if (!content) return '';
  return content.replace(/\[CIRCUIT_DATA\][\s\S]*?\[\/CIRCUIT_DATA\]/g, '').replace(/\[CIRCUIT_META\][\s\S]*?\[\/CIRCUIT_META\]/g, '').trim();
};

interface DayOverviewModalProps { day: any; onClose: () => void; }

export default function DayOverviewModal({ day, onClose }: DayOverviewModalProps) {
  const iconType = useSportIconType();
  const useImageIcons = isImageIcon(iconType);
  const [showMovelaps, setShowMovelaps] = React.useState(true);
  
  const formatDecisecondsToTime = (deciseconds: number): string => {
    if (deciseconds <= 0) return '-';
    const totalSeconds = Math.floor(deciseconds / 10);
    const ds = deciseconds % 10;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h${minutes.toString().padStart(2, '0')}'${seconds.toString().padStart(2, '0')}"${ds}`;
  };
  
  const formatSecondsToTime = (seconds: number): string => {
    if (seconds <= 0) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const deciseconds = Math.round((seconds % 1) * 10);
    return `${hours}h${minutes.toString().padStart(2, '0')}'${secs.toString().padStart(2, '0')}"${deciseconds}`;
  };
  
  const workouts = day.workouts || [];
  const sportTotals: Record<string, { workouts: number; moveframes: number; movelaps: number; distance: number; duration: number; series: number; repetitions: number; workoutIds: Set<string> }> = {};
  
  workouts.forEach((workout: any) => {
    const workoutId = workout.id || Math.random().toString();
    (workout.moveframes || []).forEach((mf: any) => {
      const sport = mf.sport || 'Unknown';
      if (!sportTotals[sport]) {
        sportTotals[sport] = { workouts: 0, moveframes: 0, movelaps: 0, distance: 0, duration: 0, series: 0, repetitions: 0, workoutIds: new Set() };
      }
      sportTotals[sport].workoutIds.add(workoutId);
      sportTotals[sport].moveframes++;
      sportTotals[sport].movelaps += mf.movelaps?.length || 0;
      const isSeriesSport = !shouldShowDistance(sport);
      if (isSeriesSport) {
        if (mf.manualMode) {
          const totalSeries = mf.repetitions || 0;
          sportTotals[sport].series += totalSeries;
          sportTotals[sport].repetitions += totalSeries;
        } else {
          sportTotals[sport].series += mf.movelaps?.length || 0;
          mf.movelaps?.forEach((ml: any) => { sportTotals[sport].repetitions += parseInt(ml.reps) || 0; });
        }
      } else {
        const aerobicSeriesMultiplier = AEROBIC_SPORTS.includes(sport as any) ? (mf.aerobicSeries || 1) : 1;
        if (mf.manualMode && AEROBIC_SPORTS.includes(sport as any)) {
          const manualInputType = mf.manualInputType || 'meters';
          const manualValue = mf.distance || 0;
          if (manualInputType === 'time') { sportTotals[sport].duration += manualValue * aerobicSeriesMultiplier; }
          else { sportTotals[sport].distance += manualValue * aerobicSeriesMultiplier; }
        } else {
          mf.movelaps?.forEach((ml: any) => {
            sportTotals[sport].distance += (parseInt(ml.distance) || 0) * aerobicSeriesMultiplier;
            const timeInSeconds = parseFloat(ml.time) || 0;
            sportTotals[sport].duration += (timeInSeconds * 10) * aerobicSeriesMultiplier;
          });
        }
      }
      if (isSeriesSport && !mf.manualMode) {
        mf.movelaps?.forEach((ml: any) => {
          const timeInSeconds = parseFloat(ml.time) || 0;
          sportTotals[sport].duration += timeInSeconds * 10;
        });
      }
    });
  });
  
  Object.keys(sportTotals).forEach(sport => { sportTotals[sport].workouts = sportTotals[sport].workoutIds.size; });
  
  const grandTotals = {
    workouts: workouts.length,
    moveframes: Object.values(sportTotals).reduce((sum, sport) => sum + sport.moveframes, 0),
    movelaps: Object.values(sportTotals).reduce((sum, sport) => sum + sport.movelaps, 0),
    distance: Object.values(sportTotals).reduce((sum, sport) => sum + sport.distance, 0),
    duration: Object.values(sportTotals).reduce((sum, sport) => sum + sport.duration, 0),
    series: Object.values(sportTotals).reduce((sum, sport) => sum + sport.series, 0),
    repetitions: Object.values(sportTotals).reduce((sum, sport) => sum + sport.repetitions, 0)
  };
  
  const handlePrint = () => { window.print(); };
  const dayName = day.name || day.dayOfWeek || 'Day';
  const weekNumber = day.weekNumber || '';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Day Overview: {dayName}</h2>
            {weekNumber && <p className="text-sm text-gray-600">Week {weekNumber} {day.dateLabel ? `- ${day.dateLabel}` : ''}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm font-semibold" title="Print this day"><Printer className="w-4 h-4" />Print</button>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition"><X className="w-5 h-5 text-gray-600" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {day.notes && (
            <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-700"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                <h3 className="text-base font-bold text-amber-900">Day Annotations</h3>
              </div>
              <div className="text-sm text-gray-800 bg-white border border-amber-200 rounded-lg p-3 whitespace-pre-wrap">{day.notes}</div>
            </div>
          )}

          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"><p className="text-sm font-semibold text-blue-900">Total Workouts: {workouts.length}</p></div>

          <div className="mb-4 p-3 bg-white border-2 border-gray-300 rounded-lg">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              Day Summary
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead><tr className="bg-gray-100"><th className="border border-gray-300 px-2 py-1.5 text-left font-semibold">Sport</th><th className="border border-gray-300 px-2 py-1.5 text-center font-semibold">WO</th><th className="border border-gray-300 px-2 py-1.5 text-center font-semibold">Moveframes</th><th className="border border-gray-300 px-2 py-1.5 text-center font-semibold">Movelaps</th><th className="border border-gray-300 px-2 py-1.5 text-center font-semibold">Distance</th><th className="border border-gray-300 px-2 py-1.5 text-center font-semibold">Time</th><th className="border border-gray-300 px-2 py-1.5 text-center font-semibold">Series</th></tr></thead>
                <tbody>
                  {Object.entries(sportTotals).map(([sport, totals]) => {
                    const isSeriesSport = !shouldShowDistance(sport);
                    return (
                      <tr key={sport} className="hover:bg-blue-50">
                        <td className="border border-gray-300 px-2 py-1.5 font-medium">{sport.replace(/_/g, ' ')}</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center">{totals.workouts}</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center">{totals.moveframes}</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center">{totals.movelaps}</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center">{shouldShowDistance(sport) && totals.distance > 0 ? `${totals.distance}${getDistanceUnit(sport)}` : '-'}</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center">{totals.duration > 0 ? formatDecisecondsToTime(totals.duration) : '-'}</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center">{totals.series > 0 || totals.repetitions > 0 ? `${totals.series || totals.repetitions} series` : '-'}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-blue-100 font-bold">
                    <td className="border border-gray-300 px-2 py-1.5">TOTAL</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-center">{grandTotals.workouts}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-center">{grandTotals.moveframes}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-center">{grandTotals.movelaps}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-center">{grandTotals.distance > 0 ? `${grandTotals.distance}m` : '-'}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-center">{grandTotals.duration > 0 ? formatDecisecondsToTime(grandTotals.duration) : '-'}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-center">{grandTotals.series > 0 || grandTotals.repetitions > 0 ? `${grandTotals.series || grandTotals.repetitions} series` : '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-3 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showMovelaps} onChange={(e) => setShowMovelaps(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-sm font-medium text-gray-700">Show Movelaps Details</span>
            </label>
          </div>

          <div className="bg-white border-2 border-gray-300 rounded-lg p-3">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Day Details - All Workouts</h3>
            <div className="overflow-x-auto">
              {workouts.map((workout: any, workoutIdx: number) => {
                const workoutMoveframes = workout.moveframes || [];
                return (
                  <div key={workout.id} className="mb-6 last:mb-0">
                    <div className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-t-lg">
                      <span className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-sm font-bold text-purple-600">{workoutIdx + 1}</span>
                      <span className="font-semibold">Workout {workoutIdx + 1}</span>
                      {workout.name && <span className="text-white/80 text-sm">- {workout.name}</span>}
                    </div>
                    
                    {workoutMoveframes.map((mf: any, mfIdx: number) => {
                      const sport = mf.sport || 'SWIM';
                      const isCircuit = mf.isCircuitBased;
                      const isManual = mf.manualMode;
                      const isBodyBuilding = sport === 'BODY_BUILDING';
                      const distanceBasedSports = ['SWIM', 'BIKE', 'MTB', 'RUN', 'ROWING', 'CANOEING', 'SKATE', 'SKI', 'SNOWBOARD', 'HIKING', 'WALKING'];
                      const isDistanceBased = distanceBasedSports.includes(sport);
                      const hasTools = !isBodyBuilding && !isDistanceBased;
                      
                      return (
                        <div key={mf.id} className="border-l-4 border-r border-b border-gray-300 last:rounded-b-lg" style={{ borderLeftColor: mf.section?.color || '#6366f1' }}>
                          <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-100 border-b border-gray-200">
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: mf.section?.color || '#6366f1' }}>{mf.letter || String.fromCharCode(65 + mfIdx)}</span>
                            <span className="font-semibold text-sm text-gray-800">{sport.replace(/_/g, ' ')}</span>
                            {mf.description && <span className="text-gray-500 text-xs ml-2">- {stripCircuitTags(mf.description)?.substring(0, 40)}{(stripCircuitTags(mf.description)?.length || 0) > 40 ? '...' : ''}</span>}
                            {isManual && <span className="ml-2 px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-semibold rounded">MANUAL</span>}
                            {isCircuit && <span className="ml-2 px-2 py-0.5 bg-purple-400 text-purple-900 text-xs font-semibold rounded">CIRCUIT</span>}
                          </div>
                          
                          {isManual && !mf.movelaps?.length ? (
                            <div className="p-3 bg-yellow-50"><div className="text-xs text-gray-700 whitespace-pre-wrap">{stripCircuitTags(mf.description) || stripCircuitTags(mf.notes) || 'No content'}</div></div>
                          ) : showMovelaps && mf.movelaps?.length > 0 ? (
                            <table className="w-full text-xs border-collapse">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="border-b border-gray-200 px-2 py-1 text-center font-semibold w-10">#</th>
                                  {isBodyBuilding && !isCircuit && (<><th className="border-b border-gray-200 px-2 py-1 text-left font-semibold">Musc.Sector</th><th className="border-b border-gray-200 px-2 py-1 text-left font-semibold">Exercise</th><th className="border-b border-gray-200 px-2 py-1 text-center font-semibold">Reps</th><th className="border-b border-gray-200 px-2 py-1 text-center font-semibold">Weight</th><th className="border-b border-gray-200 px-2 py-1 text-center font-semibold">Tempo</th></>)}
                                  {isCircuit && (<><th className="border-b border-gray-200 px-2 py-1 text-left font-semibold">Musc.Sector</th><th className="border-b border-gray-200 px-2 py-1 text-left font-semibold">Exercise</th><th className="border-b border-gray-200 px-2 py-1 text-center font-semibold">Reps</th></>)}
                                  {isDistanceBased && !isCircuit && (<><th className="border-b border-gray-200 px-2 py-1 text-center font-semibold">Distance</th><th className="border-b border-gray-200 px-2 py-1 text-center font-semibold">Time</th><th className="border-b border-gray-200 px-2 py-1 text-center font-semibold">Speed/Pace</th>{sport === 'SWIM' && <th className="border-b border-gray-200 px-2 py-1 text-center font-semibold">Style</th>}{(sport === 'ROWING' || sport === 'CANOEING') && <th className="border-b border-gray-200 px-2 py-1 text-center font-semibold">Row/min</th>}</>)}
                                  {hasTools && !isCircuit && (<><th className="border-b border-gray-200 px-2 py-1 text-center font-semibold">Reps</th><th className="border-b border-gray-200 px-2 py-1 text-center font-semibold">Tools</th></>)}
                                  <th className="border-b border-gray-200 px-2 py-1 text-center font-semibold">Pause</th>
                                  <th className="border-b border-gray-200 px-2 py-1 text-left font-semibold">Notes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {mf.movelaps.map((ml: any, mlIdx: number) => (
                                  <tr key={ml.id || mlIdx} className="hover:bg-blue-50">
                                    <td className="border-b border-gray-100 px-2 py-1 text-center">{isCircuit && ml.circuitLetter ? `${ml.circuitLetter}-${ml.localSeriesNumber || ml.seriesNumber || 1}-${ml.stationNumber || mlIdx + 1}` : (mlIdx + 1)}</td>
                                    {isBodyBuilding && !isCircuit && (<><td className="border-b border-gray-100 px-2 py-1">{ml.muscularSector || ml.sector || '-'}</td><td className="border-b border-gray-100 px-2 py-1">{ml.exercise || '-'}</td><td className="border-b border-gray-100 px-2 py-1 text-center">{ml.reps || '-'}</td><td className="border-b border-gray-100 px-2 py-1 text-center">{ml.weight || '-'}</td><td className="border-b border-gray-100 px-2 py-1 text-center">{ml.tempo || ml.r1 || '-'}</td></>)}
                                    {isCircuit && (<><td className="border-b border-gray-100 px-2 py-1">{ml.muscularSector || ml.sector || '-'}</td><td className="border-b border-gray-100 px-2 py-1">{ml.exercise || '-'}</td><td className="border-b border-gray-100 px-2 py-1 text-center">{ml.reps || '-'}</td></>)}
                                    {isDistanceBased && !isCircuit && (<><td className="border-b border-gray-100 px-2 py-1 text-center">{ml.distance ? `${ml.distance}${getDistanceUnit(sport)}` : '-'}</td><td className="border-b border-gray-100 px-2 py-1 text-center">{ml.time || '-'}</td><td className="border-b border-gray-100 px-2 py-1 text-center">{ml.speed || ml.pace || '-'}</td>{sport === 'SWIM' && <td className="border-b border-gray-100 px-2 py-1 text-center">{ml.style || '-'}</td>}{(sport === 'ROWING' || sport === 'CANOEING') && <td className="border-b border-gray-100 px-2 py-1 text-center">{ml.rowPerMin || '-'}</td>}</>)}
                                    {hasTools && !isCircuit && (<><td className="border-b border-gray-100 px-2 py-1 text-center">{ml.reps || '-'}</td><td className="border-b border-gray-100 px-2 py-1 text-center">{ml.tools || '-'}</td></>)}
                                    <td className="border-b border-gray-100 px-2 py-1 text-center">{ml.pause || '-'}</td>
                                    <td className="border-b border-gray-100 px-2 py-1 text-xs">{stripCircuitTags(ml.notes) || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : !isManual && (
                            <div className="p-3 bg-gray-50 text-xs text-gray-500 italic">No movelaps defined</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="flex-1 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">Close</button>
        </div>
      </div>
    </div>
  );
}
