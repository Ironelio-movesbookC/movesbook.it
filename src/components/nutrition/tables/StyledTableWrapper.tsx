'use client';

import React from 'react';
import { useColorSettings } from '@/hooks/useColorSettings';

interface StyledTableWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that applies custom color settings from admin settings
 * to all workout tables via CSS variables
 */
export default function StyledTableWrapper({ children }: StyledTableWrapperProps) {
  const { colors, getBorderStyle } = useColorSettings();

  // Helper to convert border style string to individual CSS properties
  const parseBorderStyle = (borderStyle: string | undefined) => {
    if (!borderStyle) return { width: '1px', style: 'solid', color: '#e5e7eb' };
    const parts = borderStyle.split(' ');
    return {
      width: parts[0] || '1px',
      style: parts[1] || 'solid',
      color: parts[2] || '#e5e7eb'
    };
  };

  const dayBorder = parseBorderStyle(getBorderStyle('day'));
  const workoutBorder = parseBorderStyle(getBorderStyle('workout'));
  const nutritionFoodBorder = parseBorderStyle(getBorderStyle('moveframe'));
  const nutritionComponentBorder = parseBorderStyle(getBorderStyle('movelap'));

  return (
    <div
      className="workout-tables-container"
      style={{
        // Page background
        '--page-bg': colors.pageBackground,
        '--page-bg-opacity': colors.pageBackgroundOpacity / 100,
        
        // Week header colors
        '--week-header-bg': colors.weekHeader,
        '--week-header-text': colors.weekHeaderText,
        
        // Day colors
        '--day-header-bg': colors.dayHeader,
        '--day-header-text': colors.dayHeaderText,
        '--day-alt-bg': colors.dayAlternateRow,
        '--day-alt-text': colors.dayAlternateRowText,
        '--day-border-width': dayBorder.width,
        '--day-border-style': dayBorder.style,
        '--day-border-color': dayBorder.color,
        
        // NutritionMeal colors
        '--workout-1-bg': colors.workoutHeader,
        '--workout-1-text': colors.workoutHeaderText,
        '--workout-2-bg': colors.workout2Header,
        '--workout-2-text': colors.workout2HeaderText,
        '--workout-3-bg': colors.workout3Header,
        '--workout-3-text': colors.workout3HeaderText,
        '--workout-border-width': workoutBorder.width,
        '--workout-border-style': workoutBorder.style,
        '--workout-border-color': workoutBorder.color,
        
        // NutritionFood colors
        '--nutritionFood-header-bg': colors.moveframeHeader,
        '--nutritionFood-header-text': colors.moveframeHeaderText,
        '--nutritionFood-alt-bg': colors.alternateRowMoveframe,
        '--nutritionFood-alt-text': colors.alternateRowTextMoveframe,
        '--nutritionFood-border-width': nutritionFoodBorder.width,
        '--nutritionFood-border-style': nutritionFoodBorder.style,
        '--nutritionFood-border-color': nutritionFoodBorder.color,
        
        // NutritionComponent colors
        '--nutritionComponent-header-bg': colors.movelapHeader,
        '--nutritionComponent-header-text': colors.movelapHeaderText,
        '--nutritionComponent-alt-bg': colors.alternateRowMovelap,
        '--nutritionComponent-alt-text': colors.alternateRowTextMovelap,
        '--nutritionComponent-border-width': nutritionComponentBorder.width,
        '--nutritionComponent-border-style': nutritionComponentBorder.style,
        '--nutritionComponent-border-color': nutritionComponentBorder.color,
        
        // Selected/hover states
        '--selected-bg': colors.selectedRow,
        '--selected-text': colors.selectedRowText,
        
        // Button colors
        '--btn-add-bg': colors.buttonAdd,
        '--btn-add-hover': colors.buttonAddHover,
        '--btn-add-text': colors.buttonAddText,
        '--btn-edit-bg': colors.buttonEdit,
        '--btn-edit-hover': colors.buttonEditHover,
        '--btn-edit-text': colors.buttonEditText,
        '--btn-delete-bg': colors.buttonDelete,
        '--btn-delete-hover': colors.buttonDeleteHover,
        '--btn-delete-text': colors.buttonDeleteText,
        '--btn-print-bg': colors.buttonPrint,
        '--btn-print-hover': colors.buttonPrintHover,
        '--btn-print-text': colors.buttonPrintText,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

