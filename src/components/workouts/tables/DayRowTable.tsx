'use client';

import React from 'react';
import ReactDOM from 'react-dom';
import { useDroppable } from '@dnd-kit/core';
import { ChevronDown } from 'lucide-react';
import EditableCell from './EditableCell';
import { useColorSettings } from '@/hooks/useColorSettings';
import { isImageIcon } from '@/utils/sportIcons';
import { useSportIconType } from '@/hooks/useSportIconType';
import { useDropdownPosition } from '@/hooks/useDropdownPosition';
import { calculateSportSummaries, type SportSummary } from '@/utils/workoutHelpers';
import { isDistanceBasedSport } from '@/constants/moveframe.constants';

// Helper function to strip circuit metadata tags from content
const stripCircuitTags = (content: string | null | undefined): string => {
  if (!content) return '';
  return content
    .replace(/\[CIRCUIT_DATA\][\s\S]*?\[\/CIRCUIT_DATA\]/g, '')
    .replace(/\[CIRCUIT_META\][\s\S]*?\[\/CIRCUIT_META\]/g, '')
    .trim();
};

interface DayRowTableProps {
  day: any;
  currentWeek: any;
  isExpanded: boolean;
  isLastDayOfWeek?: boolean; // Add thick bottom border for week separator
  isSelected?: boolean; // Whether this day is selected
  activeSection?: 'A' | 'B' | 'C' | 'D'; // Active section for conditional display
  iconType?: 'emoji' | 'icon'; // Optional icon type override from parent
  onToggleDay: (dayId: string) => void;
  onToggleDaySelection?: (dayId: string) => void; // Toggle day selection
  onToggleWorkout?: (workoutId: string) => void;  // Added for clickable workout numbers
  onExpandOnlyThisWorkout?: (workout: any, day: any) => void; // For expanding only one workout
  onExpandDayWithAllWorkouts?: (dayId: string, workouts: any[]) => void; // For row click
  onCycleWorkoutExpansion?: (workout: any, day: any) => void; // 3-state cycle for workout numbers
  onEditDay?: (day: any) => void;
  onAddWorkout?: (day: any) => void;
  onShowDayInfo?: (day: any) => void;
  onShowDayOverview?: (day: any) => void;
  onCopyDay?: (day: any) => void;
  onMoveDay?: (day: any) => void;
  onPasteDay?: (day: any) => void;
  onShareDay?: (day: any) => void;
  onExportPdfDay?: (day: any) => void;
  onPrintDay?: (day: any) => void;
  onDeleteDay?: (day: any) => void;
}

export default function DayRowTable({
  day,
  currentWeek,
  isExpanded,
  isLastDayOfWeek = false,
  isSelected = false,
  activeSection = 'A',
  onToggleDay,
  onToggleDaySelection,
  onToggleWorkout,
  onExpandOnlyThisWorkout,
  onExpandDayWithAllWorkouts,
  onCycleWorkoutExpansion,
  onEditDay,
  onAddWorkout,
  onShowDayInfo,
  onShowDayOverview,
  onCopyDay,
  onMoveDay,
  onPasteDay,
  onShareDay,
  onExportPdfDay,
  onPrintDay,
  onDeleteDay,
  iconType: iconTypeProp
}: DayRowTableProps) {
  const { colors, getBorderStyle } = useColorSettings();
  const defaultIconType = useSportIconType();
  const iconType = iconTypeProp || defaultIconType;
  const hasWorkouts = day.workouts && day.workouts.length > 0;
  const dayWithWeek = { ...day, weekNumber: currentWeek?.weekNumber };
  const sportSummaries = calculateSportSummaries(day, iconType);
  const useImageIcons = isImageIcon(iconType);
  
  // Sort workouts by creation time (earliest = #1)
  const sortedWorkouts = day.workouts 
    ? [...day.workouts].sort((a, b) => {
        // Sort by id (earlier id = earlier created) or by createdAt timestamp
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : parseInt(a.id) || 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : parseInt(b.id) || 0;
        return timeA - timeB;
      })
    : [];
  
  // Dropdown state management (using custom hook)
  const {
    isOpen: isOptionsOpen,
    dropdownPosition,
    dropdownRef,
    dropdownContentRef,
    buttonRef,
    isMounted,
    toggleDropdown,
    closeDropdown
  } = useDropdownPosition();
  
  // Click popup state for main work (toggle on/off)
  const [clickedMoveframe, setClickedMoveframe] = React.useState<any>(null);
  const [popupPosition, setPopupPosition] = React.useState<{ x: number; y: number } | null>(null);
  const [clickedCellElement, setClickedCellElement] = React.useState<HTMLElement | null>(null);
  const popupRef = React.useRef<HTMLDivElement>(null);

  // Update popup position when scrolling to keep it attached to the cell
  React.useEffect(() => {
    if (!clickedCellElement || !clickedMoveframe) return;

    const updatePosition = () => {
      const rect = clickedCellElement.getBoundingClientRect();
      setPopupPosition({ 
        x: rect.left + rect.width / 2, 
        y: rect.bottom + 10 
      });
    };

    // Update position on scroll
    const handleScroll = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [clickedCellElement, clickedMoveframe]);

  // Close popup when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Don't close if clicking inside the popup
      if (popupRef.current && popupRef.current.contains(target)) {
        return;
      }
      
      // Don't close if clicking on one of the main work cells
      if (target.closest('.main-work-cell')) {
        return;
      }
      
      // Close the popup
      setClickedMoveframe(null);
      setPopupPosition(null);
      setClickedCellElement(null);
    };

    if (clickedMoveframe) {
      // Small delay to prevent immediate closing
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [clickedMoveframe]);
  
  // Make day row a drop zone
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${day.id}`,
    data: {
      type: 'day',
      day: dayWithWeek
    }
  });

  // Format date
  const dayDate = new Date(day.date);
  const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });

  // Determine if this is an even day (for alternate row coloring)
  const dayOfWeek = dayDate.getDay();
  const isEvenDay = dayOfWeek % 2 === 0;
  
  // Use custom colors from settings
  const rowBgColor = isOver 
    ? colors.selectedRow 
    : (isEvenDay ? colors.dayAlternateRow : colors.dayHeader);
  const rowTextColor = isOver 
    ? colors.selectedRowText 
    : (isEvenDay ? colors.dayAlternateRowText : colors.dayHeaderText);
  const bgStyle = rowBgColor;
  const borderStyle = getBorderStyle('day');
  
  // Check if this day is Sunday (0) for week separator
  const isSunday = dayOfWeek === 0;
  
  return (
    <React.Fragment>
    <tr
      ref={setNodeRef}
      className={`day-row-table border-b transition-colors hover:opacity-90 cursor-pointer ${
        isLastDayOfWeek ? 'week-separator-thick' : ''
      }`}
      style={{
        backgroundColor: bgStyle,
        color: rowTextColor,
        borderTop: borderStyle,
        borderLeft: borderStyle,
        borderRight: borderStyle
      }}
      onClick={() => {
        // Clicking on the row toggles the day expansion (shows/hides workouts)
        if (onToggleDay) {
          onToggleDay(day.id);
        }
      }}
    >
      {/* Check Checkbox */}
      <td className="border border-gray-200 px-1 py-2 text-center sticky-col-1 w-[50px] min-w-[50px]" style={{ backgroundColor: bgStyle, color: rowTextColor }} onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleDaySelection?.(day.id);
          }}
          className="w-4 h-4 cursor-pointer"
          title="Select this day for batch operations"
        />
      </td>

      {/* Period Color Circle */}
      <td className="border border-gray-200 px-2 py-2 text-center sticky-col-2 w-[50px] min-w-[50px]" style={{ backgroundColor: bgStyle, color: rowTextColor }}>
        <div className="flex items-center justify-center">
          <div
            className="w-6 h-6 rounded-full border border-gray-400 flex-shrink-0"
            style={{ backgroundColor: currentWeek?.period?.color || '#9CA3AF' }}
            title={currentWeek?.period?.name || 'No period'}
          />
        </div>
      </td>

      {/* Period Name */}
      <td className="border border-gray-200 px-2 py-2 text-center sticky-col-3 w-[90px] min-w-[90px]" style={{ backgroundColor: bgStyle, color: rowTextColor }}>
        <span className="text-xs font-medium">{currentWeek?.period?.name || '—'}</span>
      </td>

      {/* Week (Week Number) */}
      <td className="border border-gray-200 px-2 py-2 text-xs font-bold text-center sticky-col-4 w-[60px] min-w-[60px]" style={{ backgroundColor: bgStyle, color: rowTextColor }}>
        {currentWeek?.weekNumber || '—'}
      </td>

      {/* Day (Day Number of Week) */}
      <td className="border border-gray-200 px-2 py-2 text-xs font-bold text-center sticky-col-5 w-[50px] min-w-[50px]" style={{ backgroundColor: bgStyle, color: rowTextColor }}>
        {dayOfWeek === 0 ? 7 : dayOfWeek}
      </td>

      {/* Dayname - Show for sections B, C, and D (not A which is template mode) */}
      {activeSection !== 'A' && (
        <td 
          className="border border-gray-200 px-2 py-2 text-xs font-bold cursor-pointer hover:bg-blue-100 sticky-col-6 w-[120px] min-w-[120px]"
          style={{ backgroundColor: bgStyle }}
          onClick={(e) => {
            e.stopPropagation(); // Prevent row click
            onToggleDay(day.id); // Toggle just the day (collapse/expand)
          }}
          title="Click to collapse/expand day only"
        >
          <div className="flex flex-col items-center justify-center gap-0.5">
            <div className="flex items-center gap-1">
              <span>{isExpanded ? '▼' : '▶'}</span>
              <span>{dayName}</span>
            </div>
            <span className="text-[10px] text-gray-600">
              {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </td>
      )}

      {/* Match Done (Workout Completion Status) - For Section B and C */}
      {(activeSection === 'B' || activeSection === 'C') && (
        <td 
          className="border border-gray-200 px-1 py-2 text-center sticky-col-7 w-[60px] min-w-[60px]"
          style={{ 
            backgroundColor: bgStyle,
            color: rowTextColor
          }}
        >
          <div className="flex items-center justify-center">
            <div
              className="w-6 h-6 rounded-full border border-gray-400 flex-shrink-0"
              style={{ backgroundColor: hasWorkouts ? '#10B981' : '#D1D5DB' }}
              title={hasWorkouts ? 'Workouts planned' : 'No workouts'}
            />
          </div>
        </td>
      )}

      {/* Workout Sessions - Show numbers with symbols for each workout + Day Description */}
      <td 
        className={`border border-gray-200 px-1 py-2 text-center ${activeSection === 'A' ? 'sticky-col-6' : 'sticky-col-7'}`}
        style={{ backgroundColor: bgStyle }}
        onClick={(e) => e.stopPropagation()} // Prevent row click when clicking on workout numbers
      >
        <div className="flex items-center justify-center gap-2">
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((num) => {
              const workout = sortedWorkouts[num - 1]; // Use sorted workouts
              const symbols = ['○', '□', '△'];
              const symbol = symbols[num - 1];
              const hasData = workout && workout.moveframes && workout.moveframes.length > 0;
              const colorClass = hasData ? 'text-black' : 'text-gray-400';
              
              return (
                <span 
                  key={num} 
                  className={`text-xl font-bold ${colorClass} flex items-center gap-1 ${workout ? 'cursor-pointer hover:bg-blue-200 px-2 rounded transition-colors' : ''}`}
                  title={workout ? `Click to cycle: closed → moveframes → movelaps → closed` : `Workout ${num} (not created)`}
                  onClick={(e) => {
                    if (workout && onCycleWorkoutExpansion) {
                      e.stopPropagation();
                      console.log('🔢 User clicked workout number in day table:', num, workout.id);
                      // 3-state cycle: closed → show moveframes → show movelaps → closed
                      onCycleWorkoutExpansion(workout, day);
                    }
                  }}
                >
                  {num}<span className="text-sm">{symbol}</span>
                </span>
              );
          })}
          </div>
          
          {/* Day Description Text */}
          {day.description && (
            <div className="flex-1 text-[10px] text-gray-700 truncate px-2 max-w-[150px]" title={day.description}>
              {day.description}
            </div>
          )}
        </div>
      </td>

      {/* S1 - Sport 1 - Blue */}
      <td className="border border-gray-200 px-1 py-1 text-xs text-left bg-blue-100 text-black">
        {sportSummaries[0] ? (
          <div className="flex items-center justify-start gap-2">
            {useImageIcons ? (
              <img src={sportSummaries[0].icon} alt={sportSummaries[0].sport} className="w-10 h-10 object-cover rounded flex-shrink-0" />
            ) : (
              <span className="text-2xl flex-shrink-0">{sportSummaries[0].icon}</span>
            )}
            <span className="font-medium text-[10px]">{sportSummaries[0].sport}</span>
          </div>
        ) : '—'}
      </td>
      <td className="border border-gray-200 px-1 py-1 text-xs text-center bg-blue-100 text-black">
        {sportSummaries[0] ? (
          <div className="leading-tight">
            <div className="font-bold text-base">
              {sportSummaries[0].distance > 0 
                ? (isDistanceBasedSport(sportSummaries[0].sport) ? `${sportSummaries[0].distance}m` : sportSummaries[0].distance)
                : '—'}
            </div>
            <div className="mt-0.5 font-semibold text-[10px] text-gray-700">{sportSummaries[0]?.duration || '00:00:00'}</div>
          </div>
        ) : '—'}
      </td>
      <td className="main-work-cell border border-gray-200 px-1 py-1 text-xs text-left text-black font-semibold bg-blue-100 cursor-pointer" style={{ position: 'relative' }}
        onClick={(e) => {
          if (sportSummaries[0]?.mainWorkMoveframe) {
            e.stopPropagation();
            if (clickedMoveframe?.id === sportSummaries[0].mainWorkMoveframe.id) {
              setClickedMoveframe(null);
              setPopupPosition(null);
              setClickedCellElement(null);
            } else {
              const rect = e.currentTarget.getBoundingClientRect();
              setClickedMoveframe(sportSummaries[0].mainWorkMoveframe);
              setClickedCellElement(e.currentTarget);
              setPopupPosition({ 
                x: rect.left + rect.width / 2, 
                y: rect.bottom + 10 
              });
            }
          }
        }}
      >
        <div className="line-clamp-3 leading-tight whitespace-pre-wrap">
          {(() => {
            if (!sportSummaries[0]?.mainWork) return '—';
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = sportSummaries[0].mainWork;
            const plainText = (tempDiv.textContent || tempDiv.innerText || '').trim();
            const lines = plainText.split('\n');
            const firstThreeLines = lines.slice(0, 3).join('\n');
            return firstThreeLines || '—';
          })()}
        </div>
      </td>

      {/* S2 - Sport 2 - Green */}
      <td className="border border-gray-200 px-1 py-1 text-xs text-left bg-green-100 text-black">
        {sportSummaries[1] ? (
          <div className="flex items-center justify-start gap-2">
            {useImageIcons ? (
              <img src={sportSummaries[1].icon} alt={sportSummaries[1].sport} className="w-10 h-10 object-cover rounded flex-shrink-0" />
            ) : (
              <span className="text-2xl flex-shrink-0">{sportSummaries[1].icon}</span>
            )}
            <span className="font-medium text-[10px]">{sportSummaries[1].sport}</span>
          </div>
        ) : '—'}
      </td>
      <td className="border border-gray-200 px-1 py-1 text-xs text-center bg-green-100 text-black">
        {sportSummaries[1] ? (
          <div className="leading-tight">
            <div className="font-bold text-base">
              {sportSummaries[1].distance > 0 
                ? (isDistanceBasedSport(sportSummaries[1].sport) ? `${sportSummaries[1].distance}m` : sportSummaries[1].distance)
                : '—'}
            </div>
            <div className="mt-0.5 font-semibold text-[10px] text-gray-700">{sportSummaries[1]?.duration || '00:00:00'}</div>
          </div>
        ) : '—'}
      </td>
      <td className="main-work-cell border border-gray-200 px-1 py-1 text-xs text-left text-black font-semibold bg-green-100 cursor-pointer" style={{ position: 'relative' }}
        onClick={(e) => {
          if (sportSummaries[1]?.mainWorkMoveframe) {
            e.stopPropagation();
            if (clickedMoveframe?.id === sportSummaries[1].mainWorkMoveframe.id) {
              setClickedMoveframe(null);
              setPopupPosition(null);
              setClickedCellElement(null);
            } else {
              const rect = e.currentTarget.getBoundingClientRect();
              setClickedMoveframe(sportSummaries[1].mainWorkMoveframe);
              setClickedCellElement(e.currentTarget);
              setPopupPosition({ 
                x: rect.left + rect.width / 2, 
                y: rect.bottom + 10 
              });
            }
          }
        }}
      >
        <div className="line-clamp-3 leading-tight whitespace-pre-wrap">
          {(() => {
            if (!sportSummaries[1]?.mainWork) return '—';
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = sportSummaries[1].mainWork;
            const plainText = (tempDiv.textContent || tempDiv.innerText || '').trim();
            const lines = plainText.split('\n');
            const firstThreeLines = lines.slice(0, 3).join('\n');
            return firstThreeLines || '—';
          })()}
        </div>
      </td>

      {/* S3 - Sport 3 - Orange */}
      <td className="border border-gray-200 px-1 py-1 text-xs text-left bg-orange-100 text-black">
        {sportSummaries[2] ? (
          <div className="flex items-center justify-start gap-2">
            {useImageIcons ? (
              <img src={sportSummaries[2].icon} alt={sportSummaries[2].sport} className="w-10 h-10 object-cover rounded flex-shrink-0" />
            ) : (
              <span className="text-2xl flex-shrink-0">{sportSummaries[2].icon}</span>
            )}
            <span className="font-medium text-[10px]">{sportSummaries[2].sport}</span>
          </div>
        ) : '—'}
      </td>
      <td className="border border-gray-200 px-1 py-1 text-xs text-center bg-orange-100 text-black">
        {sportSummaries[2] ? (
          <div className="leading-tight">
            <div className="font-bold text-base">
              {sportSummaries[2].distance > 0 
                ? (isDistanceBasedSport(sportSummaries[2].sport) ? `${sportSummaries[2].distance}m` : sportSummaries[2].distance)
                : '—'}
            </div>
            <div className="mt-0.5 font-semibold text-[10px] text-gray-700">{sportSummaries[2]?.duration || '00:00:00'}</div>
          </div>
        ) : '—'}
      </td>
      <td className="main-work-cell border border-gray-200 px-1 py-1 text-xs text-left text-black font-semibold bg-orange-100 cursor-pointer" style={{ position: 'relative' }}
        onClick={(e) => {
          if (sportSummaries[2]?.mainWorkMoveframe) {
            e.stopPropagation();
            if (clickedMoveframe?.id === sportSummaries[2].mainWorkMoveframe.id) {
              setClickedMoveframe(null);
              setPopupPosition(null);
              setClickedCellElement(null);
            } else {
              const rect = e.currentTarget.getBoundingClientRect();
              setClickedMoveframe(sportSummaries[2].mainWorkMoveframe);
              setClickedCellElement(e.currentTarget);
              setPopupPosition({ 
                x: rect.left + rect.width / 2, 
                y: rect.bottom + 10 
              });
            }
          }
        }}
      >
        <div className="line-clamp-3 leading-tight whitespace-pre-wrap">
          {(() => {
            if (!sportSummaries[2]?.mainWork) return '—';
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = sportSummaries[2].mainWork;
            const plainText = (tempDiv.textContent || tempDiv.innerText || '').trim();
            const lines = plainText.split('\n');
            const firstThreeLines = lines.slice(0, 3).join('\n');
            return firstThreeLines || '—';
          })()}
        </div>
      </td>

      {/* S4 - Sport 4 - Pink */}
      <td className="border border-gray-200 px-1 py-1 text-xs text-left bg-pink-100 text-black">
        {sportSummaries[3] ? (
          <div className="flex items-center justify-start gap-2">
            {useImageIcons ? (
              <img src={sportSummaries[3].icon} alt={sportSummaries[3].sport} className="w-10 h-10 object-cover rounded flex-shrink-0" />
            ) : (
              <span className="text-2xl flex-shrink-0">{sportSummaries[3].icon}</span>
            )}
            <span className="font-medium text-[10px]">{sportSummaries[3].sport}</span>
          </div>
        ) : '—'}
      </td>
      <td className="border border-gray-200 px-1 py-1 text-xs text-center bg-pink-100 text-black">
        {sportSummaries[3] ? (
          <div className="leading-tight">
            <div className="font-bold text-base">
              {sportSummaries[3].distance > 0 
                ? (isDistanceBasedSport(sportSummaries[3].sport) ? `${sportSummaries[3].distance}m` : sportSummaries[3].distance)
                : '—'}
            </div>
            <div className="mt-0.5 font-semibold text-[10px] text-gray-700">{sportSummaries[3]?.duration || '00:00:00'}</div>
          </div>
        ) : '—'}
      </td>
      <td className="main-work-cell border border-gray-200 px-1 py-1 text-xs text-left text-black font-semibold bg-pink-100 cursor-pointer" style={{ position: 'relative' }}
        onClick={(e) => {
          if (sportSummaries[3]?.mainWorkMoveframe) {
            e.stopPropagation();
            if (clickedMoveframe?.id === sportSummaries[3].mainWorkMoveframe.id) {
              setClickedMoveframe(null);
              setPopupPosition(null);
              setClickedCellElement(null);
            } else {
              const rect = e.currentTarget.getBoundingClientRect();
              setClickedMoveframe(sportSummaries[3].mainWorkMoveframe);
              setClickedCellElement(e.currentTarget);
              setPopupPosition({ 
                x: rect.left + rect.width / 2, 
                y: rect.bottom + 10 
              });
            }
          }
        }}
      >
        <div className="line-clamp-3 leading-tight whitespace-pre-wrap">
          {(() => {
            if (!sportSummaries[3]?.mainWork) return '—';
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = sportSummaries[3].mainWork;
            const plainText = (tempDiv.textContent || tempDiv.innerText || '').trim();
            const lines = plainText.split('\n');
            const firstThreeLines = lines.slice(0, 3).join('\n');
            return firstThreeLines || '—';
          })()}
        </div>
      </td>

      {/* Options */}
      <td 
        className="border border-gray-200 px-1 py-1 sticky-options-col"
        style={{ backgroundColor: bgStyle }}
        onClick={(e) => e.stopPropagation()} // Prevent row click when clicking on buttons
      >
        <div className="flex gap-1 justify-center items-center relative" ref={dropdownRef}>
          {/* Overview Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowDayOverview?.(dayWithWeek);
            }}
            className="px-2 py-1 text-[11px] bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors font-medium"
            title="View Day Overview"
          >
            Overview
          </button>
          
          {/* Day Info Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowDayInfo?.(dayWithWeek);
            }}
            className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-medium whitespace-nowrap"
            title="View Day Information"
          >
            Day Info
          </button>
          
          {/* Option Button with Dropdown */}
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={(e) => {
                e.stopPropagation();
                toggleDropdown();
              }}
              className="px-2 py-1 text-[11px] bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors font-medium flex items-center gap-1"
              title="More Options"
            >
              Option
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {/* Dropdown Menu - Rendered via Portal */}
            {isOptionsOpen && isMounted && ReactDOM.createPortal(
              <div 
                ref={dropdownContentRef}
                className="fixed bg-white border border-gray-300 rounded-lg shadow-2xl z-[99999] min-w-[160px]" 
                style={{
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`
                }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeDropdown();
                    onEditDay?.(dayWithWeek);
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] hover:bg-green-50 transition-colors flex items-center gap-2"
                >
                  <span className="text-green-600">✏️</span>
                  <span>Edit Day</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeDropdown();
                    onCopyDay?.(dayWithWeek);
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] hover:bg-purple-50 transition-colors flex items-center gap-2 border-t border-gray-200"
                >
                  <span className="text-purple-600">📋</span>
                  <span>Copy</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeDropdown();
                    onMoveDay?.(dayWithWeek);
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] hover:bg-orange-50 transition-colors flex items-center gap-2 border-t border-gray-200"
                >
                  <span className="text-orange-600">➜</span>
                  <span>Move</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeDropdown();
                    onPasteDay?.(dayWithWeek);
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] hover:bg-green-50 transition-colors flex items-center gap-2 border-t border-gray-200"
                >
                  <span className="text-green-600">📄</span>
                  <span>Paste</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeDropdown();
                    onShareDay?.(dayWithWeek);
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] hover:bg-blue-50 transition-colors flex items-center gap-2 border-t border-gray-200"
                >
                  <span className="text-blue-600">🔗</span>
                  <span>Share</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeDropdown();
                    onExportPdfDay?.(dayWithWeek);
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] hover:bg-red-50 transition-colors flex items-center gap-2 border-t border-gray-200"
                >
                  <span className="text-red-600">📕</span>
                  <span>Export PDF</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeDropdown();
                    onPrintDay?.(dayWithWeek);
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] hover:bg-gray-50 transition-colors flex items-center gap-2 border-t border-gray-200"
                >
                  <span className="text-gray-600">🖨️</span>
                  <span>Print</span>
                </button>
              </div>,
              document.body
            )}
          </div>
          
          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteDay?.(dayWithWeek);
            }}
            className="px-2 py-1 text-[11px] bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-medium"
            title="Delete Day"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
    {/* Click Popup for Main Work (Toggle on/off, scrollable, close on outside click) */}
    {clickedMoveframe && popupPosition && ReactDOM.createPortal(
        <div 
          ref={popupRef}
          className="fixed z-[99999] bg-white border-2 border-blue-500 rounded-lg shadow-2xl p-4 max-w-md max-h-[80vh] overflow-y-auto animate-fadeIn"
          style={{
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`,
            transform: 'translate(-50%, 0)',
            pointerEvents: 'auto',
            overscrollBehavior: 'contain'
          }}
          onWheel={(e) => e.stopPropagation()}
          onMouseMove={(e) => e.stopPropagation()}
          onMouseEnter={(e) => e.stopPropagation()}
          onMouseLeave={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs space-y-2">
            {/* Moveframe Letter */}
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: clickedMoveframe.section?.color || '#6366f1' }}
              >
                {clickedMoveframe.letter || 'A'}
              </div>
              <div>
                <div className="font-bold text-sm text-gray-900">{clickedMoveframe.sport || 'Unknown'}</div>
                <div className="text-xs text-gray-500">{clickedMoveframe.section?.name || 'Section'}</div>
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="font-semibold text-gray-700 mb-1">Description:</div>
              <div className="text-gray-900 bg-gray-50 p-2 rounded max-h-[200px] overflow-y-auto">
                {(() => {
                  // For manual mode with priority, show full content from notes
                  // For manual mode WITHOUT priority, show blank (user wants to hide content)
                  // Otherwise show description
                  const content = (clickedMoveframe.manualMode && clickedMoveframe.manualPriority)
                    ? (clickedMoveframe.notes || clickedMoveframe.description)
                    : (clickedMoveframe.manualMode && !clickedMoveframe.manualPriority)
                    ? '' // Blank for manual mode without priority
                    : clickedMoveframe.description;
                  
                  return content ? (
                    <div dangerouslySetInnerHTML={{ __html: content }} />
                  ) : (
                    'No description'
                  );
                })()}
              </div>
            </div>

            {/* All Moveframe Details */}
            <div className="grid grid-cols-2 gap-2">
              {/* Repetitions */}
              {clickedMoveframe.repetitions && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Repetitions</span>
                  <span className="font-semibold text-blue-600">{clickedMoveframe.repetitions}</span>
                </div>
              )}

              {/* Movelaps Count */}
              <div className="flex flex-col">
                <span className="text-gray-500 text-[10px]">Movelaps</span>
                <span className="font-semibold text-purple-600">
                  {clickedMoveframe.movelaps?.length || 0}
                </span>
              </div>

              {/* Pause */}
              {clickedMoveframe.pause && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Pause</span>
                  <span className="font-semibold text-orange-600">{clickedMoveframe.pause}</span>
                </div>
              )}

              {/* Macro Rest */}
              {clickedMoveframe.macroRest && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Macro Rest</span>
                  <span className="font-semibold text-orange-600">{clickedMoveframe.macroRest}</span>
                </div>
              )}

              {/* Macro Final */}
              {clickedMoveframe.macroFinal && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Macro Final</span>
                  <span className="font-semibold text-green-600">{clickedMoveframe.macroFinal}</span>
                </div>
              )}

              {/* Alarm */}
              {clickedMoveframe.alarm && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Alarm</span>
                  <span className="font-semibold text-red-600">{clickedMoveframe.alarm}</span>
                </div>
              )}

              {/* Code */}
              {clickedMoveframe.code && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Code</span>
                  <span className="font-semibold text-gray-700 font-mono text-[10px]">{clickedMoveframe.code}</span>
                </div>
              )}

              {/* Total Distance - Hide for bodybuilding */}
              {clickedMoveframe.totalDistance > 0 && clickedMoveframe.sport !== 'BODY_BUILDING' && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Total Distance</span>
                  <span className="font-semibold text-blue-600">{clickedMoveframe.totalDistance}m</span>
                </div>
              )}

              {/* Total Reps */}
              {clickedMoveframe.totalReps > 0 && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Total Reps</span>
                  <span className="font-semibold text-purple-600">{clickedMoveframe.totalReps}</span>
                </div>
              )}
            </div>

            {/* Notes - Only show for non-manual moveframes, as manual mode uses notes for content */}
            {clickedMoveframe.notes && !clickedMoveframe.manualMode && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="font-semibold text-gray-700 mb-1 text-[10px]">Notes:</div>
                <div className="text-gray-900 bg-gray-50 p-2 rounded text-[10px]">
                  {stripCircuitTags(clickedMoveframe.notes)}
                </div>
              </div>
            )}

            {/* Movelaps Details */}
            {clickedMoveframe.movelaps && clickedMoveframe.movelaps.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="font-semibold text-gray-700 mb-1 text-[10px]">Movelaps ({clickedMoveframe.movelaps.length}):</div>
                <div className="space-y-1">
                  {clickedMoveframe.movelaps.map((lap: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 p-1.5 rounded text-[10px]">
                      <div className="font-semibold text-gray-700">#{idx + 1}</div>
                      <div className="grid grid-cols-2 gap-1 text-[9px]">
                        {/* For Body Building, show exercise name instead of distance */}
                        {clickedMoveframe.sport === 'BODY_BUILDING' ? (
                          lap.exercise && <div>Exercise: <span className="font-semibold">{lap.exercise}</span></div>
                        ) : (
                          lap.distance && <div>Distance: <span className="font-semibold">{isDistanceBasedSport(clickedMoveframe.sport) ? `${lap.distance}m` : lap.distance}</span></div>
                        )}
                        {lap.reps && <div>Reps: <span className="font-semibold">{lap.reps}</span></div>}
                        {lap.time && <div>Time: <span className="font-semibold">{lap.time}</span></div>}
                        {lap.pace && <div>Pace: <span className="font-semibold">{lap.pace}</span></div>}
                        {lap.speed && <div>Speed: <span className="font-semibold">{lap.speed}</span></div>}
                        {lap.pause && <div>Pause: <span className="font-semibold">{lap.pause}</span></div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </React.Fragment>
  );
}




