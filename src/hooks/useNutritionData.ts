/**
 * useNutritionData Hook
 * Custom hook for managing workout data loading and state
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { nutritionPlanApi, periodsApi, userApi, coachApi } from '@/utils/api.utils';
import { sectionHelpers, permissionHelpers } from '@/utils/nutrition.helpers';
import type { 
  NutritionPlan, 
  Period, 
  User,
  SectionId, 
  FeedbackMessage 
} from '@/types/nutrition.types';

interface UseWorkoutDataOptions {
  initialSection?: SectionId;
}

interface UseWorkoutDataReturn {
  // Data
  nutritionPlan: NutritionPlan | null;
  periods: Period[];
  userType: string | null;
  athleteList: any[];
  
  // Loading states
  isLoading: boolean;
  isLoadingPeriods: boolean;
  isLoadingProfile: boolean;
  
  // Actions
  loadNutritionData: (section?: SectionId, subSection?: 'A' | 'B' | 'C') => Promise<void>;
  loadPeriods: () => Promise<void>;
  loadUserProfile: () => Promise<void>;
  loadAthleteList: () => Promise<void>;
  updateNutritionPlan: (plan: NutritionPlan | null) => void;
  
  // Feedback
  feedbackMessage: FeedbackMessage | null;
  showMessage: (type: FeedbackMessage['type'], text: string) => void;
}

export function useNutritionData({
  initialSection = 'B',
}: UseWorkoutDataOptions = {}): UseWorkoutDataReturn {
  // State
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [userType, setUserType] = useState<string | null>(null);
  const [athleteList, setAthleteList] = useState<any[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  
  // Feedback
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null);
  
  /**
   * Show feedback message (auto-clears after 4 seconds)
   */
  const showMessage = useCallback((type: FeedbackMessage['type'], text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 4000);
  }, []);

  /**
   * Load workout data for active section
   * @param section - Optional section ID to load (defaults to initialSection)
   */
  const loadNutritionData = useCallback(async (section?: SectionId, subSection?: 'A' | 'B' | 'C') => {
    const targetSection = section || initialSection;
    setIsLoading(true);
    
    // Clear old data immediately to prevent Section A/B/C data overlap
    setNutritionPlan(null);
    
    try {
      if (targetSection === 'W') {
        setNutritionPlan(null);
        setIsLoading(false);
        return;
      }

      const planType = sectionHelpers.getPlanType(targetSection);
      
      // For Section A, use the subsection (A, B, or C) to get independent plans
      const storageSection = targetSection === 'A' && subSection ? subSection : targetSection;
      
      console.log('🔄 Loading workout data for section:', targetSection, 'subsection:', subSection, 'storageSection:', storageSection, 'type:', planType);
      
      // Pass storage section parameter for TEMPLATE_WEEKS to get independent plans
      const response = await nutritionPlanApi.get(planType, false, storageSection);

      if (response.success && response.data) {
        const { plan } = response.data;
        console.log('✅ Plan loaded:', plan?.id);
        console.log('📊 Number of weeks:', plan?.weeks?.length);
        console.log('🔍 [CRITICAL] Plan weeks details:', {
          planId: plan?.id,
          planType: plan?.type,
          weeksCount: plan?.weeks?.length,
          firstWeek: plan?.weeks?.[0] ? {
            id: plan.weeks[0].id,
            weekNumber: plan.weeks[0].weekNumber,
            daysCount: plan.weeks[0].days?.length
          } : 'NO WEEKS'
        });
        
        // Check if any weekly plan has less than 3 weeks - if so, force recreation
        // IMPORTANT: For Section B (YEARLY_PLAN), we should NOT check for < 3 weeks!
        // This check is ONLY for Section A (TEMPLATE_WEEKS) which should have exactly 3 weeks
        if (targetSection === 'A' && plan?.weeks && plan.weeks.length < 3) {
          console.warn(`⚠️ Section ${targetSection} (storage: ${storageSection}) has only ${plan.weeks.length} weeks! Force recreating plan...`);
          const recreateResponse = await nutritionPlanApi.get(planType, true, storageSection); // forceRecreate = true
          if (recreateResponse.success && recreateResponse.data) {
            setNutritionPlan(recreateResponse.data.plan);
            console.log('✅ Plan recreated successfully with', recreateResponse.data.plan?.weeks?.length, 'weeks');
          }
          setIsLoading(false);
          return;
        } else if ((targetSection === 'B' || targetSection === 'C') && plan?.weeks && plan.weeks.length < 3) {
          console.error(`❌❌❌ CRITICAL BUG DETECTED ❌❌❌`);
          console.error(`Section ${targetSection} has only ${plan.weeks.length} weeks!`);
          console.error(`This should NOT happen! Section B should have 10+ weeks.`);
          console.error(`Plan ID: ${plan.id}, Type: ${plan.type}`);
          console.error(`DO NOT force recreate - this would delete all user data!`);
          // DO NOT recreate - just show a warning
        }
        
        // Debug: Check weeks structure
        if (plan?.weeks && plan.weeks.length > 0) {
          console.log('✅ First week:', plan.weeks[0]);
          console.log('✅ First week days:', plan.weeks[0].days);
        } else {
          // Only Section A (TEMPLATE_WEEKS) should force recreate if empty
          // Section B (YEARLY_PLAN) starts with 10 weeks initially, so if empty, API will auto-create
          // Section C and D can start empty and grow dynamically
          if (targetSection === 'A') {
            console.warn('⚠️ No weeks found in Section A plan! Force recreating...');
            const recreateResponse = await nutritionPlanApi.get(planType, true, storageSection);
            if (recreateResponse.success && recreateResponse.data) {
              setNutritionPlan(recreateResponse.data.plan);
              console.log('✅ Section A plan recreated successfully');
            }
            setIsLoading(false);
            return;
          } else {
            // For Section B, C, D - if no weeks, the API will create them on first load
            console.log(`ℹ️ Section ${targetSection} plan has no weeks yet (will be created by API if needed)`);
          }
        }
        
        // Debug: Check nutrition_foods
        if (plan?.weeks) {
          plan.weeks.forEach((week: any) => {
            week.days?.forEach((day: any) => {
              (day.meals ?? day.workouts ?? []).forEach((meal: any) => {
                if (meal.nutritionFoods && meal.nutritionFoods.length > 0) {
                  console.log(
                    `💪 NutritionMeal ${meal.id} has ${meal.nutritionFoods.length} nutritionFoods:`,
                    meal.nutritionFoods.map((mf: any) => `${mf.letter}-${mf.sport}`).join(', ')
                  );
                }
              });
            });
          });
        }
        
        // 2026-01-27 - Parse circuit data from notes field and set isCircuitBased flag
        if (plan?.weeks) {
          console.log('🔄 [useNutritionData] Parsing circuit data from nutritionFood notes...');
          plan.weeks.forEach((week: any) => {
            week.days?.forEach((day: any) => {
              (day.meals ?? day.workouts ?? []).forEach((meal: any) => {
                meal.nutritionFoods?.forEach((nutritionFood: any) => {
                  // Check if notes contain circuit data
                  if (nutritionFood.notes) {
                    const circuitDataMatch = nutritionFood.notes.match(/\[CIRCUIT_DATA\]([\s\S]*?)\[\/CIRCUIT_DATA\]/);
                    const circuitMetaMatch = nutritionFood.notes.match(/\[CIRCUIT_META\]([\s\S]*?)\[\/CIRCUIT_META\]/);
                    
                    if (circuitDataMatch || circuitMetaMatch) {
                      try {
                        const jsonStr = circuitDataMatch?.[1] || circuitMetaMatch?.[1];
                        const circuitData = JSON.parse(jsonStr);
                        
                        // Set isCircuitBased flag on the nutritionFood object
                        nutritionFood.isCircuitBased = true;
                        nutritionFood.circuitConfig = circuitData.config;
                        nutritionFood.circuits = circuitData.circuits;
                        
                        console.log(`🔄 [useNutritionData] Parsed circuit data for nutritionFood ${nutritionFood.letter}:`, {
                          hasDescription: !!nutritionFood.description,
                          descriptionLength: nutritionFood.description?.length || 0,
                          isCircuitBased: nutritionFood.isCircuitBased
                        });
                      } catch (error) {
                        console.error(`❌ [useNutritionData] Failed to parse circuit data for nutritionFood ${nutritionFood.letter}:`, error);
                      }
                    }
                  }
                });
              });
            });
          });
        }
        
        setNutritionPlan(plan);
        console.log('✅ nutritionPlan state set to:', plan);
      } else {
        console.error('❌ Failed to load plan:', response.error);
        const errText =
          response.error ||
          (response.data as { details?: string } | undefined)?.details ||
          'Failed to load nutrition plan';
        showMessage('error', errText);
      }
    } catch (error) {
      console.error('💥 Error loading nutrition data:', error);
      showMessage('error', 'Error loading nutrition data');
    } finally {
      setIsLoading(false);
    }
  }, [initialSection, showMessage]);

  /**
   * Load periods from API
   */
  const loadPeriods = useCallback(async () => {
    setIsLoadingPeriods(true);
    
    try {
      const response = await periodsApi.getAll();
      
      if (response.success && response.data) {
        const raw = response.data as unknown;
        const list = Array.isArray(raw) ? raw : (raw as { periods?: unknown })?.periods;
        setPeriods(Array.isArray(list) ? list : []);
        console.log('✅ Periods loaded:', Array.isArray(list) ? list.length : 0);
      } else {
        console.error('❌ Failed to load periods:', response.error);
      }
    } catch (error) {
      console.error('💥 Error loading periods:', error);
    } finally {
      setIsLoadingPeriods(false);
    }
  }, []);

  /**
   * Load user profile
   */
  const loadUserProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUserType(userData.userType);
        console.log('✅ User type:', userData.userType);
      }
    } catch (error) {
      console.error('💥 Error loading user profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  /**
   * Load athlete list for coaches
   */
  const loadAthleteList = useCallback(async () => {
    try {
      const response = await coachApi.getAthletes();
      
      if (response.success && response.data) {
        setAthleteList(response.data.athletes || []);
        console.log('✅ Athletes loaded:', response.data.athletes?.length);
      }
    } catch (error) {
      console.error('💥 Error loading athlete list:', error);
    }
  }, []);

  /**
   * Update workout plan (for local state updates without reloading)
   */
  const updateNutritionPlan = useCallback((plan: NutritionPlan | null) => {
    setNutritionPlan(plan);
  }, []);

  return {
    // Data
    nutritionPlan,
    periods,
    userType,
    athleteList,
    
    // Loading states
    isLoading,
    isLoadingPeriods,
    isLoadingProfile,
    
    // Actions
    loadNutritionData,
    loadPeriods,
    loadUserProfile,
    loadAthleteList,
    updateNutritionPlan,
    
    // Feedback
    feedbackMessage,
    showMessage
  };
}

