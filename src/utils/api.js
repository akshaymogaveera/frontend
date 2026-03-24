/**
 * API Configuration and client utilities.
 * Centralize all API endpoints and fetch logic for easier maintenance and testing.
 */

// API base URL (relative so it works in dev and production)
export const API_BASE = '/api';

// Endpoint paths (grouped by domain for clarity)
export const ENDPOINTS = {
  // Auth/User
  ME: `${API_BASE}/me/`,
  AUTH: `${API_BASE}/auth/`,
  REGISTER: `${API_BASE}/register/`,
  VALIDATE_TOKEN: `${API_BASE}/validate/token/`,
  SEND_OTP: `${API_BASE}/send/otp/`,
  VERIFY_OTP: `${API_BASE}/verify/otp/`,

  // Appointments
  APPOINTMENTS: `${API_BASE}/appointments/`,
  APPOINTMENTS_ALL: (pageSize = 50, page = 1) =>
    `${API_BASE}/appointments/?type=all&page_size=${pageSize}&page=${page}`,
  // For user-facing pages (uses ?type= query param)
  APPOINTMENTS_UNSCHEDULED: (pageSize = 50, page = 1) =>
    `${API_BASE}/appointments/?type=unscheduled&page_size=${pageSize}&page=${page}`,
  APPOINTMENTS_SCHEDULED: (pageSize = 50, page = 1) =>
    `${API_BASE}/appointments/?type=scheduled&page_size=${pageSize}&page=${page}`,
  // For admin pages (uses actual /scheduled/ and /unscheduled/ endpoints)
  APPOINTMENTS_SCHEDULED_LIST: (pageSize = 100) =>
    `${API_BASE}/appointments/scheduled/?page_size=${pageSize}`,
  APPOINTMENTS_UNSCHEDULED_LIST: (pageSize = 100) =>
    `${API_BASE}/appointments/unscheduled/?page_size=${pageSize}`,
  APPOINTMENTS_UNSCHEDULE: `${API_BASE}/appointments/unschedule/`,
  APPOINTMENTS_UNSCHEDULED_COUNT: (categoryId) =>
    `${API_BASE}/appointments/unscheduled-count/?category_id=${categoryId}&status=active`,
  APPOINTMENTS_ADD_TO_QUEUE: `${API_BASE}/appointments/add_user_to_queue/`,
  APPOINTMENT_NOTES: (appointmentId) => `${API_BASE}/appointments/${appointmentId}/notes/`,
  APPOINTMENT_NOTE_FILE: (appointmentId, noteId) =>
    `${API_BASE}/appointments/${appointmentId}/notes/${noteId}/file/`,
  APPOINTMENT_CANCEL: (appointmentId) => `${API_BASE}/appointments/${appointmentId}/cancel/`,
  APPOINTMENT_CHECKIN: (appointmentId) => `${API_BASE}/appointments/${appointmentId}/check-in/`,
  APPOINTMENT_CHECKOUT: (appointmentId) => `${API_BASE}/appointments/${appointmentId}/checkout/`,
  APPOINTMENT_MOVE: (appointmentId) => `${API_BASE}/appointments/${appointmentId}/move/`,
  APPOINTMENT_DETAIL: (appointmentId) => `${API_BASE}/appointments/${appointmentId}/`,

  // Organizations
  ORGANIZATIONS: (pageSize = 100) => `${API_BASE}/organizations/?page_size=${pageSize}`,
  ORGANIZATIONS_ACTIVE: (q, page) =>
    `${API_BASE}/organizations/active/?search=${encodeURIComponent(q)}&page_size=20&page=${page}`,
  ORGANIZATION_LANDING: (orgId) => `${API_BASE}/organizations/${orgId}/landing/`,
  ORGANIZATION_ADMINS: (orgId) => `${API_BASE}/organizations/${orgId}/admins/`,
  ORGANIZATION_CATEGORIES: (orgId, pageSize = 100) =>
    `${API_BASE}/organizations/${orgId}/categories/?page_size=${pageSize}`,
  ORGANIZATION_DELETE_CATEGORY_USER: (orgId) =>
    `${API_BASE}/organizations/${orgId}/delete-category-user/`,

  // Categories
  CATEGORIES: (pageSize = 100) => `${API_BASE}/categories/?page_size=${pageSize}`,
  CATEGORIES_USER: (pageSize = 100) => `${API_BASE}/categories/user/?page_size=${pageSize}`,
  CATEGORIES_ACTIVE: (orgId, pageSize = 50, page = 1) =>
    `${API_BASE}/categories/active/?organization=${orgId}&page_size=${pageSize}&page=${page}`,
  CATEGORY_DETAIL: (categoryId) => `${API_BASE}/categories/${categoryId}/`,
  CATEGORY_UPDATE_STATUS: (categoryId) => `${API_BASE}/categories/${categoryId}/update-status/`,
  CATEGORY_UPDATE_INFO: (categoryId) => `${API_BASE}/categories/${categoryId}/update-info/`,
};

/**
 * Fetch wrapper that handles common auth and error logic.
 * @param {string} url - API endpoint URL
 * @param {object} options - fetch options (method, body, headers, etc.)
 * @returns {Promise<Response>} - fetch response
 */
export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('accessToken');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });
  return response;
}

/**
 * Helper to parse API responses and handle errors.
 * @param {Response} res - fetch response
 * @returns {Promise<object>} - parsed JSON or error object
 */
export async function parseApiResponse(res) {
  if (!res.ok) {
    let errorBody = {};
    let errorMessage = null;
    
    try {
      errorBody = await res.json();
    } catch (e) {
      // If response isn't JSON, try to get text
      try {
        const text = await res.text();
        if (text) {
          errorMessage = text;
        }
      } catch {
        // If that fails too, we'll use generic message below
      }
    }
    
    // If we don't have an error message yet, try to extract from error body
    if (!errorMessage) {
      // Check for nested errors object: {"errors": {"field": ["message"]}}
      if (errorBody.errors && typeof errorBody.errors === 'object') {
        for (const [field, msgs] of Object.entries(errorBody.errors)) {
          if (Array.isArray(msgs) && msgs.length > 0) {
            errorMessage = msgs[0];
            break;
          } else if (typeof msgs === 'string') {
            errorMessage = msgs;
            break;
          }
        }
      }
      // Check for simple message/error/detail fields
      if (!errorMessage) {
        if (errorBody.message) {
          errorMessage = errorBody.message;
        } else if (errorBody.error) {
          errorMessage = errorBody.error;
        } else if (errorBody.detail) {
          errorMessage = errorBody.detail;
        } else if (errorBody.non_field_errors && Array.isArray(errorBody.non_field_errors)) {
          errorMessage = errorBody.non_field_errors[0];
        } else if (typeof errorBody === 'object' && Object.keys(errorBody).length > 0) {
          // Look for first error in dict of field errors (top-level, not nested in .errors)
          for (const [field, msgs] of Object.entries(errorBody)) {
            if (field !== 'errors') {
              if (Array.isArray(msgs) && msgs.length > 0) {
                errorMessage = `${field}: ${msgs[0]}`;
                break;
              } else if (typeof msgs === 'string') {
                errorMessage = `${field}: ${msgs}`;
                break;
              }
            }
          }
        }
      }
    }
    
    // Fall back to HTTP status message if still no error message
    if (!errorMessage) {
      const statusText = res.statusText || 'Unknown error';
      errorMessage = statusText !== 'OK' && statusText ? statusText : `HTTP ${res.status}`;
    }
    
    const error = new Error(errorMessage);
    error.status = res.status;
    error.body = errorBody;
    throw error;
  }
  return res.json();
}

/**
 * Convenience wrapper: fetch + parse in one call.
 * @param {string} url - API endpoint URL
 * @param {object} options - fetch options
 * @returns {Promise<object>} - parsed JSON response
 */
export async function apiCall(url, options = {}) {
  const res = await apiFetch(url, options);
  return parseApiResponse(res);
}
