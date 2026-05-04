'use client';

import React from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import {
  getExercisesBySector,
  getExerciseMedia,
  getExercisePictureAThumbnailForDisplay,
  MockExercise,
} from '@/data/mockExercises';

interface Station {
  stationNumber: number;
  sector: string;
  exercise: string;
  reps: string;
  pause: number;
  notes: string;
}

interface Circuit {
  letter: string;
  stationsBySeries: Station[][];
  seriesPauses?: number[];
  pauseBetweenSeries: number;
  pauseAfterCircuit: number;
  series: number;
}

export interface HorizontalSeriesGridProps {
  circuit: Circuit;
  circuitIdx: number;
  circuits: Circuit[];
  seriesCountToRender: number;
  pauseHorizontalSeries: number;
  pauseSeries: number;
  pauseCircuits: number;
  selectedCircuits: Set<string>;
  selectedSeries: Set<string>;
  copyClickTimer: NodeJS.Timeout | null;
  setCircuits: React.Dispatch<React.SetStateAction<Circuit[]>>;
  setShowExerciseMenu: React.Dispatch<
    React.SetStateAction<{
      circuit: string;
      series: number;
      station: number;
      x: number;
      y: number;
    } | null>
  >;
  setCopyClickTimer: React.Dispatch<React.SetStateAction<NodeJS.Timeout | null>>;
  setExerciseGallery: React.Dispatch<
    React.SetStateAction<{
      title: string;
      pictureA: string | null;
      pictureB: string | null;
    } | null>
  >;
  setLoadNewStationScan: React.Dispatch<
    React.SetStateAction<{
      circuitIdx: number;
      seriesIdx: number;
      stationIdx: number;
      sector: string;
      orderedCandidates: MockExercise[];
      scanIndex: number;
    } | null>
  >;
  handleCircuitLetterClick: (letter: string) => void;
  toggleCircuitSelection: (letter: string) => void;
  handleRemoveCircuit: (letter: string) => void;
  reloadExercisesForCircuitHorizontal: (letter: string) => void;
  reloadExercisesForStationHorizontal: (letter: string, stationIdx0: number) => void;
  horizontalStationColumnFullySelected: (
    letter: string,
    stationNumber: number,
    nSeries: number
  ) => boolean;
  toggleHorizontalStationColumnSelection: (
    letter: string,
    stationNumber: number,
    nSeries: number
  ) => void;
  toggleSeriesSelection: (letter: string, seriesNum: number) => void;
  handleCopySeries: (letter: string, seriesNum: number) => void;
  handleDropOnStation: (
    e: React.DragEvent,
    letter: string,
    seriesIdx: number,
    stationNumber: number
  ) => void;
  handleSectorCellClick: (letter: string, seriesIdx: number, stationNumber: number) => void;
  handleDragStartFromStation: (
    e: React.DragEvent,
    sector: string,
    letter: string,
    seriesIdx: number,
    stationNumber: number
  ) => void;
  handleRemoveSector: (letter: string, seriesIdx: number, stationNumber: number) => void;
  handleDragExerciseOver: (e: React.DragEvent) => void;
  handleDropExercise: (
    e: React.DragEvent,
    letter: string,
    seriesNum: number,
    stationNumber: number
  ) => void;
  handleDragExerciseStart: (
    e: React.DragEvent,
    letter: string,
    seriesNum: number,
    stationNumber: number
  ) => void;
  handleRemoveStation: (letter: string, stationNumber: number, seriesNumber?: number) => void;
  handleCopyToNextStation: (letter: string, seriesIdx: number, stationNumber: number) => void;
  handleCopyRipPauseToRestOfSeries: (
    letter: string,
    seriesIdx: number,
    stationNumber: number
  ) => void;
  MUSCULAR_SECTOR_IMAGES: Record<string, string>;
  STATION_PAUSE_OPTIONS: { label: string; value: number }[];
  SERIES_PAUSE_OPTIONS: { label: string; value: number }[];
  CIRCUIT_PAUSE_OPTIONS: { label: string; value: number }[];
  formatPauseSeconds: (options: { label: string; value: number }[], valueSeconds: number) => string;
}

export function HorizontalSeriesCircuitGrid(p: HorizontalSeriesGridProps) {
  const {
    circuit,
    circuitIdx,
    circuits,
    seriesCountToRender,
    pauseHorizontalSeries,
    pauseSeries,
    pauseCircuits,
    selectedCircuits,
    selectedSeries,
    copyClickTimer,
    setCircuits,
    setShowExerciseMenu,
    setCopyClickTimer,
    setExerciseGallery,
    setLoadNewStationScan,
    handleCircuitLetterClick,
    toggleCircuitSelection,
    handleRemoveCircuit,
    reloadExercisesForCircuitHorizontal,
    reloadExercisesForStationHorizontal,
    horizontalStationColumnFullySelected,
    toggleHorizontalStationColumnSelection,
    toggleSeriesSelection,
    handleCopySeries,
    handleDropOnStation,
    handleSectorCellClick,
    handleDragStartFromStation,
    handleRemoveSector,
    handleDragExerciseOver,
    handleDropExercise,
    handleDragExerciseStart,
    handleRemoveStation,
    handleCopyToNextStation,
    handleCopyRipPauseToRestOfSeries,
    MUSCULAR_SECTOR_IMAGES,
    STATION_PAUSE_OPTIONS,
    SERIES_PAUSE_OPTIONS,
    CIRCUIT_PAUSE_OPTIONS,
    formatPauseSeconds,
  } = p;

  const nSer = seriesCountToRender;
  const nSta = circuit.stationsBySeries[0]?.length ?? 0;
  const betweenSeriesBlueRowsPerStation = Math.max(0, nSer - 1);
  const rowsPerStationBlock = nSer + betweenSeriesBlueRowsPerStation;
  const betweenStationRows = Math.max(0, nSta - 1);
  const totalRowsH =
    nSta * rowsPerStationBlock +
    betweenStationRows +
    (circuitIdx < circuits.length - 1 ? 1 : 0);
  let rowIndex = 0;

  return (
    <>
      {Array.from({ length: nSta }).map((_, stationIdx) => {
        const stationNum = stationIdx + 1;
        return (
          <React.Fragment key={`hgrid-${circuit.letter}-st-${stationNum}`}>
            {Array.from({ length: nSer }).map((_, seriesIdx) => {
              const seriesStations = circuit.stationsBySeries[seriesIdx];
              const station = seriesStations?.[stationIdx];
              if (!station) return null;
              const isFirstRowOfCircuit = rowIndex === 0;
              const isFirstRowOfStationBlock = seriesIdx === 0;
              const isLastStationCol = stationIdx === nSta - 1;
              rowIndex += 1;

              return (
                <React.Fragment key={`h-${circuit.letter}-${stationIdx}-${seriesIdx}`}>
                <tr
                  className="hover:bg-gray-50"
                  style={{ height: '70px' }}
                >
                  {isFirstRowOfCircuit && (
                    <td
                      rowSpan={totalRowsH}
                      className="border border-gray-300 px-2 py-2 text-center align-middle hover:bg-yellow-50"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className="font-bold text-lg cursor-pointer hover:text-blue-600"
                          onClick={() => handleCircuitLetterClick(circuit.letter)}
                          title="Click to select sectors for all stations"
                        >
                          {circuit.letter}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            reloadExercisesForCircuitHorizontal(circuit.letter);
                          }}
                          className="w-9 h-9 rounded-full border-2 border-green-600 flex items-center justify-center hover:bg-green-50 bg-white"
                          title="Scan all exercises in this circuit (distinct per station; avoid adjacent duplicates when possible)"
                        >
                          <Image
                            src="/rescan.png"
                            alt="scan circuit"
                            width={20}
                            height={20}
                            className="w-5 h-5 pointer-events-none"
                          />
                        </button>
                        <input
                          type="checkbox"
                          checked={selectedCircuits.has(circuit.letter)}
                          onChange={() => toggleCircuitSelection(circuit.letter)}
                          className="w-4 h-4 cursor-pointer"
                          title="Select circuit for removal"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCircuit(circuit.letter);
                          }}
                          className="w-6 h-6 rounded-full border-2 border-red-600 flex items-center justify-center hover:bg-red-50 transition-colors mt-1"
                          title={`Delete entire circuit ${circuit.letter}`}
                        >
                          <X size={16} className="text-red-600" strokeWidth={2.5} />
                        </button>
                      </div>
                    </td>
                  )}

                  {isFirstRowOfStationBlock && (
                    <td
                      rowSpan={rowsPerStationBlock}
                      className="relative border border-gray-300 px-2 py-2 text-center align-middle"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          reloadExercisesForStationHorizontal(circuit.letter, stationIdx);
                        }}
                        className="absolute top-1 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full border-2 border-blue-600 flex items-center justify-center hover:bg-blue-50 z-50 bg-white"
                        title={`Rescan exercises for station ${stationNum} (all series)`}
                      >
                        <Image
                          src="/rescan.png"
                          alt="rescan"
                          width={20}
                          height={20}
                          className="w-5 h-5 pointer-events-none"
                        />
                      </button>
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pt-11 pointer-events-none">
                        <div className="flex items-center justify-center gap-2 pointer-events-auto">
                          <input
                            type="checkbox"
                            checked={horizontalStationColumnFullySelected(
                              circuit.letter,
                              stationNum,
                              nSer
                            )}
                            onChange={() =>
                              toggleHorizontalStationColumnSelection(
                                circuit.letter,
                                stationNum,
                                nSer
                              )
                            }
                            className="w-4 h-4 cursor-pointer"
                            title="Select this station (all series) for removal"
                          />
                          <span className="text-sm font-medium">{stationNum}</span>
                        </div>
                      </div>
                    </td>
                  )}

                  <td className="border border-gray-300 px-2 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedSeries.has(`${circuit.letter}-${seriesIdx + 1}`)}
                        onChange={() => toggleSeriesSelection(circuit.letter, seriesIdx + 1)}
                        className="w-4 h-4 cursor-pointer"
                        title="Select series for removal"
                      />
                      <span className="text-sm">{seriesIdx + 1}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopySeries(circuit.letter, seriesIdx + 1);
                        }}
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-green-100 border border-green-600"
                        title="Copy serie"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      </button>
                    </div>
                  </td>

                  <td
                    className="border border-gray-300 px-2 py-1 bg-green-50 cursor-pointer hover:bg-green-100"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropOnStation(e, circuit.letter, seriesIdx, station.stationNumber)}
                    onClick={() =>
                      !station.sector &&
                      handleSectorCellClick(circuit.letter, 0, station.stationNumber)
                    }
                  >
                    {station.sector && MUSCULAR_SECTOR_IMAGES[station.sector] ? (
                      <div className="flex items-center gap-2 group">
                        <div
                          draggable
                          onDragStart={(e) =>
                            handleDragStartFromStation(
                              e,
                              station.sector,
                              circuit.letter,
                              seriesIdx,
                              station.stationNumber
                            )
                          }
                          className="flex items-center gap-2 flex-1 cursor-move hover:opacity-70"
                        >
                          <Image
                            src={MUSCULAR_SECTOR_IMAGES[station.sector]}
                            alt={station.sector}
                            width={56}
                            height={56}
                            className="w-14 h-14 object-contain flex-shrink-0 pointer-events-none"
                          />
                          <span className="text-sm font-medium text-gray-700 flex-1">
                            {station.sector}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSector(circuit.letter, seriesIdx, station.stationNumber);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                          title="Remove sector (all series at this station)"
                        >
                          <X size={16} className="text-red-600" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center min-h-[50px]">
                        <span className="text-sm text-gray-400">+</span>
                      </div>
                    )}
                  </td>

                  <td
                    className="border border-gray-300 px-0 py-0 bg-green-50 cursor-pointer"
                    onDragOver={handleDragExerciseOver}
                    onDrop={(e) =>
                      handleDropExercise(e, circuit.letter, seriesIdx + 1, station.stationNumber)
                    }
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      const currentSector = station?.sector;
                      if (currentSector) {
                        const allExercises = getExercisesBySector(currentSector);
                        const inColumn = new Set<string>();
                        for (let s = 0; s < nSer; s++) {
                          const ex = circuit.stationsBySeries[s]?.[stationIdx]?.exercise;
                          if (ex && ex.trim()) inColumn.add(ex.trim());
                        }
                        const notInColumn = allExercises.filter((ex) => !inColumn.has(ex.name));
                        const inCol = allExercises.filter((ex) => inColumn.has(ex.name));
                        const orderedCandidates = [...notInColumn, ...inCol];
                        if (orderedCandidates.length > 0) {
                          setLoadNewStationScan({
                            circuitIdx,
                            seriesIdx,
                            stationIdx,
                            sector: currentSector,
                            orderedCandidates,
                            scanIndex: 0,
                          });
                        } else {
                          alert(`No exercises available for ${currentSector}.`);
                        }
                      } else {
                        alert('Please assign a muscular sector first.');
                      }
                    }}
                    title="Double-click to open Load new station"
                  >
                    <div className="flex items-center gap-1 exercise-menu-container relative z-[10000]">
                      {(() => {
                        const picA = getExercisePictureAThumbnailForDisplay(
                          (station.exercise || '').trim()
                        );
                        const sectorImg =
                          station.sector && MUSCULAR_SECTOR_IMAGES[station.sector]
                            ? MUSCULAR_SECTOR_IMAGES[station.sector]
                            : null;
                        const src =
                          picA?.src ??
                          (station.exercise?.trim() && sectorImg ? sectorImg : null);
                        const openGallery = () => {
                          const exName = (station.exercise || '').trim();
                          const sectorS = (station.sector || '').trim();
                          const media = exName ? getExerciseMedia(exName) : null;
                          const title = exName || (sectorS ? `${sectorS} — select exercise` : 'Exercise');
                          const fallback = sectorImg || null;
                          setExerciseGallery({
                            title,
                            pictureA: media?.pictureA ?? fallback,
                            pictureB: media?.pictureB ?? media?.pictureA ?? fallback,
                          });
                        };
                        if (!src) {
                          return (
                            <button
                              type="button"
                              className="ml-1 h-11 w-11 flex-shrink-0 rounded-md border border-green-300 bg-green-100 hover:bg-green-200"
                              title="Click to view muscular area / exercise images"
                              aria-label="Open exercise images"
                              onClick={(e) => {
                                e.stopPropagation();
                                openGallery();
                              }}
                            />
                          );
                        }
                        const isData =
                          picA?.isDataUrl === true || (!!src && src.startsWith('data:'));
                        return (
                          <button
                            type="button"
                            title="Click to enlarge positions A and B"
                            className="ml-1 h-11 w-11 flex-shrink-0 overflow-hidden rounded-md border border-green-300 bg-green-50 hover:ring-2 hover:ring-teal-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              openGallery();
                            }}
                          >
                            {isData ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={src} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Image
                                src={src}
                                alt=""
                                width={44}
                                height={44}
                                className="h-full w-full object-contain"
                                unoptimized
                              />
                            )}
                          </button>
                        );
                      })()}
                      <input
                        type="text"
                        value={station.exercise}
                        readOnly
                        placeholder="Select exercise"
                        className="min-w-0 flex-1 px-2 py-2 text-sm border-0 bg-green-100 pointer-events-none"
                      />
                      <button
                        draggable
                        onDragStart={(e) =>
                          handleDragExerciseStart(
                            e,
                            circuit.letter,
                            seriesIdx + 1,
                            station.stationNumber
                          )
                        }
                        className="p-2 hover:bg-gray-200 rounded mr-1 cursor-move"
                        title="Drag to move exercise"
                      >
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                          <rect x="2" y="3" width="12" height="2" rx="1" />
                          <rect x="2" y="7" width="12" height="2" rx="1" />
                          <rect x="2" y="11" width="12" height="2" rx="1" />
                        </svg>
                      </button>
                    </div>
                  </td>

                  <td className="border border-gray-300 px-2 py-1">
                    <select
                      value={station.reps != null && station.reps !== '' ? String(station.reps) : ''}
                      onChange={(e) => {
                        setCircuits((prevCircuits) => {
                          const newCircuits = JSON.parse(JSON.stringify(prevCircuits)) as Circuit[];
                          newCircuits[circuitIdx].stationsBySeries[seriesIdx][stationIdx].reps =
                            e.target.value;
                          return newCircuits;
                        });
                      }}
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded"
                    >
                      <option value="">-</option>
                      {Array.from({ length: 99 }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={String(num)}>
                          {num}
                        </option>
                      ))}
                      <option value="nc">nc</option>
                    </select>
                  </td>

                  <td className="border border-gray-300 px-2 py-1">
                    {seriesIdx < seriesCountToRender - 1 ? (
                      <div
                        className="flex min-h-[38px] items-center justify-center rounded border border-gray-200 bg-blue-50/60 px-2 text-sm font-medium text-blue-900"
                        title="Pause between series at this station (Pause\\series)"
                      >
                        {formatPauseSeconds(
                          SERIES_PAUSE_OPTIONS,
                          circuit.seriesPauses?.[seriesIdx] ??
                            circuit.pauseBetweenSeries ??
                            pauseSeries
                        )}
                      </div>
                    ) : seriesIdx === seriesCountToRender - 1 && !isLastStationCol ? (
                      <div
                        className="flex min-h-[38px] items-center justify-center rounded border border-gray-200 bg-gray-100 px-2 text-sm font-medium text-gray-700"
                        title="After all series here — rest before next station (Pause after all the series of each station)"
                      >
                        {formatPauseSeconds(
                          STATION_PAUSE_OPTIONS,
                          station.pause ?? pauseHorizontalSeries
                        )}
                      </div>
                    ) : (
                      <div
                        className="flex min-h-[38px] items-center justify-center px-2 text-xs text-center font-semibold text-blue-600"
                        title="End of station column — see Between Circuits or workout end"
                      >
                        ↓ look down here
                      </div>
                    )}
                  </td>

                  <td className="border border-gray-300 px-2 py-1">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setShowExerciseMenu({
                            circuit: circuit.letter,
                            series: seriesIdx + 1,
                            station: station.stationNumber,
                            x: rect.left,
                            y: rect.bottom + 4,
                          });
                        }}
                        className="px-2 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                        title="Edit station"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (copyClickTimer) {
                            clearTimeout(copyClickTimer);
                            setCopyClickTimer(null);
                            handleCopyRipPauseToRestOfSeries(
                              circuit.letter,
                              seriesIdx,
                              station.stationNumber
                            );
                          } else {
                            const timer = setTimeout(() => {
                              handleCopyToNextStation(circuit.letter, seriesIdx, station.stationNumber);
                              setCopyClickTimer(null);
                            }, 300);
                            setCopyClickTimer(timer);
                          }
                        }}
                        className="p-1.5 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                        title="Single click: copy Rip & Pause to the next serie (same station). Double click: copy to all following series for this station."
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveStation(circuit.letter, station.stationNumber);
                        }}
                        className="p-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                        title="Delete this station from all series"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
                {seriesIdx < nSer - 1 && (
                  <tr
                    className="bg-blue-50"
                    style={{ height: '40px' }}
                    key={`hbetween-${circuit.letter}-${stationIdx}-${seriesIdx}`}
                  >
                    <td
                      colSpan={7}
                      className="border-l border-r border-t border-b border-gray-300 px-4 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-blue-700">
                          Pause between series (same for every station)
                        </span>
                        <select
                          value={
                            circuit.seriesPauses?.[seriesIdx] ??
                            circuit.pauseBetweenSeries ??
                            pauseSeries
                          }
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10);
                            setCircuits((prevCircuits) => {
                              const newCircuits = JSON.parse(JSON.stringify(prevCircuits)) as Circuit[];
                              const c = newCircuits[circuitIdx];
                              const n = c.stationsBySeries?.length ?? 0;
                              const len = Math.max(0, n - 1);
                              const fb = c.pauseBetweenSeries ?? pauseSeries;
                              let arr = Array.isArray(c.seriesPauses) ? [...c.seriesPauses] : [];
                              while (arr.length < len) arr.push(arr[arr.length - 1] ?? fb);
                              if (arr.length > len) arr = arr.slice(0, len);
                              arr[seriesIdx] = value;
                              c.seriesPauses = len > 0 ? arr : undefined;
                              return newCircuits;
                            });
                          }}
                          className="px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                        >
                          {SERIES_PAUSE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              );
            })}

            {stationIdx < nSta - 1 && (
              <tr
                key={`hafter-${circuit.letter}-${stationIdx}`}
                className="bg-teal-50"
                style={{ height: '40px' }}
              >
                <td
                  colSpan={7}
                  className="border-l border-r border-t border-b border-gray-300 px-4 py-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-teal-800">
                      After the series of the station
                    </span>
                    <select
                      value={
                        circuit.stationsBySeries[nSer - 1]?.[stationIdx]?.pause ??
                        pauseHorizontalSeries
                      }
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        setCircuits((prev) => {
                          const next = JSON.parse(JSON.stringify(prev)) as Circuit[];
                          next[circuitIdx].stationsBySeries[nSer - 1][stationIdx].pause = value;
                          return next;
                        });
                      }}
                      className="px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                    >
                      {STATION_PAUSE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            )}
          </React.Fragment>
        );
      })}

      {circuitIdx < circuits.length - 1 && (
        <tr className="bg-yellow-50" style={{ height: '40px' }}>
          <td
            colSpan={7}
            className="border-l border-r border-t border-b border-gray-300 px-4 py-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-amber-700">Between Circuits</span>
              <select
                value={circuit.pauseAfterCircuit}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  setCircuits((prevCircuits) => {
                    const newCircuits = JSON.parse(JSON.stringify(prevCircuits)) as Circuit[];
                    newCircuits[circuitIdx].pauseAfterCircuit = value;
                    return newCircuits;
                  });
                }}
                className="px-2 py-1 text-sm border border-gray-300 rounded"
              >
                {CIRCUIT_PAUSE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
