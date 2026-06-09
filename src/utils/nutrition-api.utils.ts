/**
 * API Utility Functions
 * Centralized API call handling with error management
 */

import { API_ENDPOINTS, STORAGE_KEYS, ERROR_MESSAGES } from '@/config/nutrition.constants';
import type { ApiResponse, ErrorResponse } from '@/types/nutrition.types';

// ==================== AUTH HELPERS ====================
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
};

export const setAuthToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
};

export const clearAuth = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER_DATA);
};

export const redirectToLogin = (): void => {
  if (typeof window === 'undefined') return;
  clearAuth();
  window.location.href = '/login';
};

// ==================== BASE FETCH WRAPPER ====================
interface FetchOptions extends RequestInit {
  requiresAuth?: boolean;
  throwOnError?: boolean;
}

export async function apiFetch<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const {
    requiresAuth = true,
    throwOnError = false,
    headers = {},
    ...fetchOptions
  } = options;

  // Add auth header if required
  const token = getAuthToken();
  if (requiresAuth) {
    if (!token) {
      if (throwOnError) {
        throw new Error(ERROR_MESSAGES.NO_TOKEN);
      }
      redirectToLogin();
      return { success: false, error: ERROR_MESSAGES.NO_TOKEN };
    }
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  // Add content-type for JSON requests
  if (fetchOptions.body && typeof fetchOptions.body === 'string') {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      if (throwOnError) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }
      redirectToLogin();
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED };
    }

    // Parse response
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `HTTP ${response.status}`;
      if (throwOnError) {
        throw new Error(errorMessage);
      }
      return { success: false, error: errorMessage, data };
    }

    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.NETWORK_ERROR;
    if (throwOnError) {
      throw error;
    }
    return { success: false, error: errorMessage };
  }
}

// ==================== WORKOUT PLAN API ====================
export const nutritionPlanApi = {
  async get(type: string, forceRecreate = false, section?: string) {
    let url = `${API_ENDPOINTS.NUTRITION.PLAN}?type=${type}`;
    if (section) {
      url += `&section=${section}`;
    }
    if (forceRecreate) {
      url += '&forceRecreate=true';
    }
    return apiFetch(url);
  },

  async create(data: { type: string; startDate?: string }) {
    return apiFetch(API_ENDPOINTS.NUTRITION.PLAN, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

// ==================== MEAL API ====================
export const nutritionMealApi = {
  async create(dayId: string, data: any) {
    return apiFetch(API_ENDPOINTS.NUTRITION.CREATE, {
      method: 'POST',
      body: JSON.stringify({ dayId, ...data })
    });
  },

  async update(id: string, data: any) {
    return apiFetch(API_ENDPOINTS.NUTRITION.UPDATE(id), {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async delete(id: string) {
    return apiFetch(API_ENDPOINTS.NUTRITION.DELETE(id), {
      method: 'DELETE'
    });
  }
};

// ==================== FOOD API ====================
export const nutritionFoodApi = {
  async create(nutritionMealId: string, data: any) {
    return apiFetch(API_ENDPOINTS.FOODS.CREATE(nutritionMealId), {
      method: 'POST',
      body: JSON.stringify({ nutritionMealId, ...data })
    });
  },

  async update(id: string, data: any) {
    return apiFetch(API_ENDPOINTS.FOODS.UPDATE(id), {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async delete(id: string) {
    return apiFetch(API_ENDPOINTS.FOODS.DELETE(id), {
      method: 'DELETE'
    });
  }
};

// ==================== COMPONENT API ====================
export const nutritionComponentApi = {
  async create(nutritionFoodId: string, data: any) {
    return apiFetch(API_ENDPOINTS.COMPONENTS.CREATE, {
      method: 'POST',
      body: JSON.stringify({ nutritionFoodId, ...data })
    });
  },

  async update(id: string, data: any) {
    return apiFetch(API_ENDPOINTS.COMPONENTS.UPDATE(id), {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async delete(id: string) {
    return apiFetch(API_ENDPOINTS.COMPONENTS.DELETE(id), {
      method: 'DELETE'
    });
  }
};

// ==================== DAY API ====================
export const dayApi = {
  async update(id: string, data: any) {
    return apiFetch(API_ENDPOINTS.DAYS.UPDATE(id), {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async delete(id: string) {
    return apiFetch(API_ENDPOINTS.DAYS.DELETE(id), {
      method: 'DELETE'
    });
  }
};

// ==================== USER API ====================
export const userApi = {
  async getSettings() {
    return apiFetch(API_ENDPOINTS.USER.SETTINGS);
  },

  async updateSettings(data: any) {
    return apiFetch(API_ENDPOINTS.USER.SETTINGS, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async getProfile() {
    return apiFetch(API_ENDPOINTS.USER.PROFILE);
  }
};

// ==================== PERIODS API ====================
export const periodsApi = {
  async getAll() {
    return apiFetch(API_ENDPOINTS.PERIODS.LIST);
  },

  async create(data: any) {
    return apiFetch(API_ENDPOINTS.PERIODS.CREATE, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async update(id: string, data: any) {
    return apiFetch(`${API_ENDPOINTS.PERIODS.LIST}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async delete(id: string) {
    return apiFetch(`${API_ENDPOINTS.PERIODS.LIST}/${id}`, {
      method: 'DELETE'
    });
  }
};

// ==================== COACH API ====================
export const coachApi = {
  async getAthletes() {
    return apiFetch(API_ENDPOINTS.COACH.ATHLETES);
  }
};

