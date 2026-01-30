import React, { useState, useEffect } from 'react';
import { Calendar, Download, Table, Plus, X, List, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import type { SectionId, ViewMode } from '@/types/workout.types';
import { calculateWeeklyPlanColor, getWorkoutCountLabel } from '@/utils/weeklyPlanColors';

interface WorkoutSectionHeaderProps {
  // State
  activeSection: SectionId;
  activeSubSection?: 'A' | 'B' | 'C'; // For Section A subsections (Weekly Plans)
  viewMode: ViewMode;
  selectedWeekForTable: number | null;
  userType?: string;
  selectedAthlete: any;
  canAddDay?: boolean; // Whether adding a day is allowed (checks 7-day limit for Section A)
  weeksPerPage?: number; // For Section B pagination
  currentPageStart?: number; // Starting week number for current page
  totalWeeks?: number; // Total weeks in the plan
  workoutPlan?: any; // Workout plan data for color calculation
  excludeStretchingCheckbox?: React.ReactNode; // Checkbox for excluding stretching
  iconType?: 'emoji' | 'icon'; // Current icon type
  currentWeekIndex?: number; // Current week index for Section A
  
  // Actions
  onSectionChange: (section: SectionId) => void;
  onSubSectionChange?: (subSection: 'A' | 'B' | 'C') => void; // For Section A subsections
  onViewModeChange: (mode: ViewMode) => void;
  onIconTypeToggle?: () => void; // Toggle between emoji and icon
  onImportClick: () => void;
  onAthleteSelect: () => void;
  onWeekFilterClear: () => void;
  onAddDay: () => void;
  onCreatePlan?: () => void; // For Section B: Create yearly plan button
  onClose: () => void;
  onWeeksPerPageChange?: (weeks: number) => void;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  onWeekIndexChange?: (index: number) => void; // For Section A week navigation
  onPrintWeek?: () => void; // For Section A/C print button
}

export default function WorkoutSectionHeader({
  activeSection,
  activeSubSection: externalActiveSubSection,
  onSubSectionChange,
  viewMode,
  selectedWeekForTable,
  userType,
  selectedAthlete,
  canAddDay = true,
  weeksPerPage = 3,
  currentPageStart = 1,
  totalWeeks = 0,
  workoutPlan,
  excludeStretchingCheckbox,
  iconType = 'emoji',
  currentWeekIndex = 0,
  onSectionChange,
  onViewModeChange,
  onIconTypeToggle,
  onImportClick,
  onAthleteSelect,
  onWeekFilterClear,
  onAddDay,
  onCreatePlan,
  onClose,
  onWeeksPerPageChange,
  onPrevPage,
  onNextPage,
  onWeekIndexChange,
  onPrintWeek
}: WorkoutSectionHeaderProps) {
  
  // Local state for plan descriptions
  const [planDescriptions, setPlanDescriptions] = useState<Record<string, string>>({
    A: '',
    B: '',
    C: ''
  });

  // Use external activeSubSection if provided, otherwise use local state
  const activeSubSection = externalActiveSubSection || 'A';

  // State for showing color rules tooltip
  const [showColorRules, setShowColorRules] = useState(false);

  // Load descriptions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('weeklyPlanDescriptions');
    if (saved) {
      try {
        setPlanDescriptions(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load plan descriptions:', e);
      }
    }
  }, []);

  // Save description
  const handleDescriptionChange = (section: SectionId, value: string) => {
    const updated = { ...planDescriptions, [section]: value };
    setPlanDescriptions(updated);
    localStorage.setItem('weeklyPlanDescriptions', JSON.stringify(updated));
  };

  // Calculate color for current section (recalculate when workoutPlan changes)
  const planColor = calculateWeeklyPlanColor(workoutPlan);
  const workoutCountLabel = getWorkoutCountLabel(workoutPlan);
  
  console.log('🎨 Color calculation for section', activeSection, ':', {
    planId: workoutPlan?.id,
    color: planColor,
    label: workoutCountLabel,
    weeksCount: workoutPlan?.weeks?.length
  });
  
  // Section labels
  const getSectionLabel = (section: SectionId): string => {
    switch (section) {
      case 'A': return 'A';
      case 'B': return 'B';
      case 'C': return 'C';
      case 'D': return 'D';
      default: return '';
    }
  };
  
  // Section title
  const getSectionTitle = (section: SectionId): string => {
    switch (section) {
      case 'A': return 'Create Template Plans';
      case 'B': return 'Yearly Plan';
      case 'C': return 'Done';
      case 'D': return 'Archive';
      default: return '';
    }
  };
  
  return (
    <>
      {/* Top Close Button */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Workout Management</h1>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="Close workout section"
        >
          <X className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      {/* Section Tabs */}
      <div className="bg-white border-b border-gray-300 px-2 py-2">
        <div className="flex items-center gap-2">
          {/* Section Tabs */}
          {(['A', 'B', 'C', 'D'] as SectionId[]).map((section) => (
            <button
              key={section}
              onClick={() => onSectionChange(section)}
              className={`px-4 py-2 rounded-t font-semibold text-sm transition-colors ${
                activeSection === section 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {getSectionTitle(section)}
            </button>
          ))}
        </div>
      </div>

      {/* Weekly Plan Subsections (A, B, C) - Only show when Section A is active */}
      {activeSection === 'A' && (
        <div className="bg-gray-100 border-b border-gray-300 px-4 py-2">
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700 mr-2">Weekly Plans:</span>
            {(['A', 'B', 'C'] as const).map((plan) => (
              <button
                key={plan}
                onClick={() => onSubSectionChange?.(plan)}
                className={`px-4 py-1.5 rounded font-semibold text-sm transition-colors ${
                  activeSubSection === plan 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                Plan {plan}
              </button>
            ))}
            </div>
            
            {/* View Toggle Buttons - Right side */}
            <div className="flex gap-2 items-center">
              {/* Icon Type Toggle Button */}
              {onIconTypeToggle && (
                <button
                  onClick={onIconTypeToggle}
                  className="px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium transition-colors bg-green-500 text-white hover:bg-green-600"
                  title={`Switch to ${iconType === 'emoji' ? 'image' : 'emoji'} icons`}
                >
                  {iconType === 'emoji' ? '🎨 Images' : '😀 Emojis'}
                </button>
              )}
              
              <button
                onClick={() => onViewModeChange('tree')}
                className={`px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium transition-colors ${
                  viewMode === 'tree' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <List className="w-4 h-4" />
                Tree
              </button>
              
              <button
                onClick={() => onViewModeChange('table')}
                className={`px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium transition-colors ${
                  viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Table className="w-4 h-4" />
                Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Header: Title + Actions */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">
              {activeSection === 'A' ? `Weekly Plan ${activeSubSection}` : getSectionTitle(activeSection)}
            </h2>
            
            {/* Colored Circle and Description for Weekly Plans (Section A subsections) */}
            {activeSection === 'A' && (
              <div className="flex items-center gap-3">
                <div 
                  className="w-6 h-6 rounded-full border-2 border-gray-400 flex-shrink-0" 
                  style={{ backgroundColor: planColor }}
                  title={workoutCountLabel}
                />
                <input
                  type="text"
                  value={planDescriptions[activeSection === 'A' ? activeSubSection : activeSection] || ''}
                  onChange={(e) => handleDescriptionChange(activeSection === 'A' ? activeSubSection : activeSection, e.target.value)}
                  placeholder="Type description"
                  className="px-3 py-1 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ width: '200px' }}
                />
                
                {/* Info Icon with Color Rules Tooltip */}
                <div className="relative">
                  <button
                    onMouseEnter={() => setShowColorRules(true)}
                    onMouseLeave={() => setShowColorRules(false)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    type="button"
                  >
                    <Info className="w-5 h-5 text-blue-600" />
                  </button>
                  
                  {/* Color Rules Tooltip */}
                  {showColorRules && (
                    <div className="absolute left-0 top-8 z-50 bg-white border-2 border-gray-300 rounded-lg shadow-xl p-4 w-96">
                      <h3 className="font-bold text-sm mb-3 text-gray-900">Color Rules - Weekly Plan Status</h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full border-2 border-gray-400" style={{ backgroundColor: '#EF4444' }} />
                          <span className="text-gray-700"><strong>Red:</strong> 0 workouts with moveframes</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full border-2 border-gray-400" style={{ backgroundColor: '#D1D5DB' }} />
                          <span className="text-gray-700"><strong>Light Grey:</strong> 1 workout with moveframes</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full border-2 border-gray-400" style={{ backgroundColor: '#FDE047' }} />
                          <span className="text-gray-700"><strong>Light Yellow:</strong> 2 workouts with moveframes</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full border-2 border-gray-400" style={{ backgroundColor: '#FACC15' }} />
                          <span className="text-gray-700"><strong>Yellow:</strong> 3 workouts with moveframes</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full border-2 border-gray-400" style={{ backgroundColor: '#86EFAC' }} />
                          <span className="text-gray-700"><strong>Light Green:</strong> 4 workouts with moveframes</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full border-2 border-gray-400" style={{ backgroundColor: '#22C55E' }} />
                          <span className="text-gray-700"><strong>Green:</strong> 5 workouts with moveframes</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full border-2 border-gray-400" style={{ backgroundColor: '#15803D' }} />
                          <span className="text-gray-700"><strong>Dark Green:</strong> 6 workouts with moveframes</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full border-2 border-gray-400" style={{ backgroundColor: '#3B82F6' }} />
                          <span className="text-gray-700"><strong>Blue:</strong> 7+ workouts with moveframes</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Week Navigation Buttons - Right of Info Icon */}
                {workoutPlan?.weeks && workoutPlan.weeks.length > 0 && (
                  <div className="flex items-center gap-2 ml-4">
                    {workoutPlan.weeks.map((week: any, index: number) => (
                      <button
                        key={week.id}
                        onClick={() => onWeekIndexChange?.(index)}
                        className={`px-4 py-1.5 rounded-lg font-semibold text-sm transition-all ${
                          currentWeekIndex === index
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Week {index + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Buttons for Section B (Yearly Plan) - Right of Title */}
            {activeSection === 'B' && (
              <>
                {onCreatePlan && (
                  <button
                    onClick={onCreatePlan}
                    className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded text-sm font-medium flex items-center gap-2 transition-colors"
                    title="Set starting date and create yearly plan"
                  >
                    <Calendar className="w-4 h-4" />
                    Set Start Date
                  </button>
                )}
                {onImportClick && (
                  <button
                    onClick={onImportClick}
                    className="px-3 py-1.5 bg-purple-600 text-white hover:bg-purple-700 rounded text-sm font-medium flex items-center gap-2 transition-colors"
                    title="Copy weeks from template plans"
                  >
                    <Download className="w-4 h-4" />
                    Copy from Templates
                  </button>
                )}
                <button
                  onClick={onImportClick}
                  className="px-3 py-1.5 bg-purple-600 text-white hover:bg-purple-700 rounded text-sm font-medium flex items-center gap-2 transition-colors"
                  title="Import from your coach"
                >
                  <Download className="w-4 h-4" />
                  Import from your coach
                </button>
              </>
            )}
          </div>
          
          <div className="flex gap-2 items-center">
            {/* Athlete Selector for Section C (Coaches/Teams/Clubs only) */}
            {activeSection === 'C' && userType && ['COACH', 'TEAM', 'CLUB', 'TEAM_MANAGER', 'CLUB_TRAINER'].includes(userType) && (
              <button 
                onClick={onAthleteSelect}
                className="px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {selectedAthlete ? `Viewing: ${selectedAthlete.name}` : 'Select Athlete'}
              </button>
            )}
            
            {/* Save/Reset Buttons for Section B - Far Right */}
            {activeSection === 'B' && (
              <>
                  <button
                  onClick={async () => {
                    try {
                      const gridSettings = {
                        savedAt: new Date().toISOString(),
                        message: 'Grid settings saved successfully!'
                      };
                      localStorage.setItem('workoutGridSettings', JSON.stringify(gridSettings));
                      alert('✅ Grid settings saved successfully!');
                    } catch (error) {
                      console.error('Error saving grid settings:', error);
                      alert('❌ Failed to save grid settings');
                    }
                  }}
                  className="px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded text-sm font-medium flex items-center gap-2 transition-colors"
                  title="Save current grid settings"
                  >
                  <Download className="w-4 h-4" />
                  Save Grid Settings
                  </button>
                  <button
                  onClick={() => {
                    if (confirm('Are you sure you want to reset grid settings to default?')) {
                      try {
                        localStorage.removeItem('workoutGridSettings');
                        alert('✅ Grid settings reset to default!');
                        window.location.reload();
                      } catch (error) {
                        console.error('Error resetting grid settings:', error);
                        alert('❌ Failed to reset grid settings');
                      }
                    }
                  }}
                  className="px-3 py-1.5 bg-gray-600 text-white hover:bg-gray-700 rounded text-sm font-medium flex items-center gap-2 transition-colors"
                  title="Reset grid settings to default"
                  >
                  <Calendar className="w-4 h-4" />
                  Reset to Default
                  </button>
              </>
            )}
            
            {/* Import Button - Only for Section C (Done) */}
            {activeSection === 'C' && (
              <button
                onClick={onImportClick}
                className="px-3 py-1.5 bg-purple-600 text-white hover:bg-purple-700 rounded text-sm font-medium flex items-center gap-2 transition-colors"
                title="Import workouts from Yearly Plan"
              >
                <Download className="w-4 h-4" />
                Import from Plan
              </button>
            )}
            
            {/* Action Buttons - Only for non-B sections */}
            {activeSection !== 'B' && (
              <>
                {/* Print Button */}
                {onPrintWeek && (
                  <button
                    onClick={onPrintWeek}
                    className="px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium transition-colors bg-gray-700 text-white hover:bg-gray-800"
                    title="Print week overview"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    Print
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Section B - Second Row: Controls and Navigation */}
      {activeSection === 'B' && (
        <div className="bg-white px-4 py-3 border-b border-gray-200" style={{ position: 'relative', zIndex: 0 }}>
          <div className="flex items-center justify-between gap-4">
              {/* Left - Exclude checkbox, Display dropdown and navigation */}
              <div className="flex items-center gap-4">
                {excludeStretchingCheckbox}
                
                <div className="flex items-center gap-3">
                  {viewMode !== 'calendar' && onWeeksPerPageChange && (
                    <div className="flex items-center gap-2" style={{ position: 'relative', zIndex: 0 }}>
                      <label htmlFor="weeks-per-page" className="text-sm font-medium text-gray-700">
                        Display:
                      </label>
                      <select
                        id="weeks-per-page"
                        value={weeksPerPage}
                        onChange={(e) => onWeeksPerPageChange(parseInt(e.target.value))}
                        className="px-3 py-1.5 rounded border border-gray-300 text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ position: 'relative', zIndex: 'auto' }}
                      >
                        <option value={1}>Weeks 1 - 1</option>
                        <option value={2}>Weeks 1 - 2</option>
                        <option value={3}>Weeks 1 - 3</option>
                        <option value={4}>Weeks 1 - 4</option>
                        <option value={6}>Weeks 1 - 6</option>
                        <option value={8}>Weeks 1 - 8</option>
                        <option value={13}>Weeks 1 - 13 (3 months)</option>
                      </select>
                    </div>
                  )}
                  
                  {/* Week Navigation */}
                  {viewMode !== 'calendar' && onPrevPage && onNextPage && (
                    <>
                      <button
                        onClick={onPrevPage}
                        disabled={currentPageStart === 1}
                        className="px-3 py-1.5 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <span className="text-sm font-medium text-gray-700">
                        Weeks {currentPageStart} - {Math.min(currentPageStart + weeksPerPage - 1, totalWeeks)} of {totalWeeks}
                      </span>
                      <button
                        onClick={onNextPage}
                        disabled={currentPageStart + weeksPerPage > totalWeeks}
                        className="px-3 py-1.5 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
             </div>
            
            {/* Right - View Toggle Buttons */}
            <div className="flex items-center gap-2">
              {/* Icon Type Toggle Button */}
              {onIconTypeToggle && (
                <button
                  onClick={onIconTypeToggle}
                  className="px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium transition-colors bg-green-500 text-white hover:bg-green-600"
                  title={`Switch to ${iconType === 'emoji' ? 'image' : 'emoji'} icons`}
                >
                  {iconType === 'emoji' ? '🎨 Images' : '😀 Emojis'}
                </button>
              )}
              
              {/* View Toggle Buttons */}
            <button
              onClick={() => onViewModeChange('tree')}
              className={`px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium transition-colors ${
                viewMode === 'tree' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <List className="w-4 h-4" />
              Tree
            </button>
            
            <button
              onClick={() => onViewModeChange('table')}
              className={`px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium transition-colors ${
                viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Table className="w-4 h-4" />
              Table
            </button>
            
              <button
                onClick={() => onViewModeChange('calendar')}
                className={`px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium transition-colors ${
                  viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Calendar
              </button>
          </div>
        </div>
      </div>
      )}

      {/* Week Context Header - Show when viewing filtered weeks */}
      {selectedWeekForTable && viewMode === 'table' && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-900">
              Viewing: Week {selectedWeekForTable - 1} - Week {selectedWeekForTable} - Week {selectedWeekForTable + 1}
            </span>
            <span className="text-sm text-blue-700">(3 weeks context)</span>
          </div>
          <button
            onClick={onWeekFilterClear}
            className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-100 transition-colors text-sm font-medium"
          >
            ← Back to Calendar
          </button>
        </div>
      )}
    </>
  );
}

