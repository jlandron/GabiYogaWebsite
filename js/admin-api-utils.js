/**
 * Admin API Utilities
 * 
 * Shared functions for making authenticated API requests across all admin modules.
 * This ensures consistent authentication handling using both JWT tokens and session cookies.
 */

const AdminApiUtils = {
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
      console.log(`AdminApiUtils: ${method} request to ${url}`);
      
      // Get token if available, but don't require it (will use session auth)
      const token = localStorage.getItem('adminToken') || localStorage.getItem('auth_token');
      
      // Setup request headers
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add authorization token if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.warn('AdminApiUtils: No JWT token found - proceeding with session auth only');
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
          console.warn('AdminApiUtils: Unable to parse error response as JSON');
        }
        
        // For authentication errors, log but don't redirect (fail open)
        if (response.status === 401) {
          console.warn('AdminApiUtils: Authentication issue detected (401) - continuing with UI');
        }
        
        throw new Error(errorMessage);
      }
      
      // Return successful response
      return await response.json();
    } catch (error) {
      console.error('AdminApiUtils request error:', error);
      throw error;
    }
  }
};

// Make available globally
window.AdminApiUtils = AdminApiUtils;
