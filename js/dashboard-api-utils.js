/**
 * Dashboard API Utilities
 * 
 * Shared functions for making authenticated API requests in the customer dashboard.
 * This ensures consistent authentication handling using both JWT tokens and session cookies.
 */

const DashboardApiUtils = {
  /**
   * Make authenticated request that works with both JWT and session auth
   * 
   * @param {string} url - API endpoint URL
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
   * @param {Object} data - Request body data for POST/PUT
   * @returns {Promise} - Response JSON
   */
  request: async function(url, method = 'GET', data = null) {
    try {
      console.log(`DashboardApiUtils: ${method} request to ${url}`);
      
      // Get token if available, but don't require it (will use session auth)
      const token = localStorage.getItem('auth_token') || localStorage.getItem('adminToken');
      
      // Setup request headers
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add authorization token if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.warn('DashboardApiUtils: No JWT token found - proceeding with session auth only');
      }
      
      // Setup request options
      const options = {
        method,
        headers,
        credentials: 'include' // Critical for session-based auth
      };
      
      // Add request body for POST/PUT/PATCH
      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
      }
      
      // Execute request
      const response = await fetch(url, options);
      
      // Handle non-success responses
      if (!response.ok) {
        // Try to parse error details from response
        let errorMessage = `Request failed with status ${response.status}`;
        
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // Couldn't parse JSON error response
          console.warn('DashboardApiUtils: Unable to parse error response as JSON');
        }
        
        // For authentication errors, log but don't redirect (fail open)
        if (response.status === 401) {
          console.warn('DashboardApiUtils: Authentication issue detected (401) - will attempt to recover');
          
          // If we're getting a 401 but have a session cookie, try to continue
          if (document.cookie.includes('connect.sid') || document.cookie.includes('sessionId')) {
            console.info('DashboardApiUtils: Session cookie found - trying to continue despite 401');
            // Return a default response to allow the UI to continue showing what it can
            return { success: false, authError: true, message: "Authentication issue - showing partial data" };
          }
        }
        
        throw new Error(errorMessage);
      }
      
      // Return successful response
      return await response.json();
    } catch (error) {
      console.error('DashboardApiUtils request error:', error);
      throw error;
    }
  },
  
  /**
   * Override the standard API Service to use our enhanced auth method
   * This allows us to drop in this replacement without changing existing code
   */
  applyOverrides: function() {
    // Store the original methods
    if (!window._originalApiService) {
      window._originalApiService = {
        authRequest: ApiService.authRequest
      };
      
      // Override the authRequest method
      ApiService.authRequest = async function(url, method, data) {
        console.log('Using enhanced auth request with session support');
        return DashboardApiUtils.request(url, method, data);
      };
      
      console.log('API Service methods have been overridden with session-enabled versions');
    }
  },
  
  /**
   * Restore the original API methods
   */
  restoreOriginals: function() {
    if (window._originalApiService) {
      ApiService.authRequest = window._originalApiService.authRequest;
      window._originalApiService = null;
      console.log('API Service methods have been restored to originals');
    }
  }
};

// Make available globally
window.DashboardApiUtils = DashboardApiUtils;

// Apply overrides immediately when this script is loaded
document.addEventListener('DOMContentLoaded', function() {
  DashboardApiUtils.applyOverrides();
});
