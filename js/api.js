/**
 * API Utilities for Gabi Jyoti Yoga Website
 * 
 * This file provides functions for interacting with the backend API.
 * It abstracts the fetch API calls and error handling for a cleaner code.
 */

const API = {
  // Base URL for API requests (adjust based on environment)
  baseUrl: window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api',
  
  // Track pending requests to avoid duplicates
  pendingRequests: {},
  
  /**
   * Generic function to make API requests
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
   * @param {Object} body - Request body (for POST and PUT)
   * @param {boolean} requiresAuth - Whether the request requires authentication
   * @returns {Promise} - Promise with response data
   */
  async request(endpoint, method = 'GET', body = null, requiresAuth = true) {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Generate a unique request key based on URL, method, and body
    // This helps deduplicate concurrent identical requests
    const requestKey = `${method}:${url}:${body ? JSON.stringify(body) : 'nobody'}`;
    
    // If this exact request is already pending, return the existing promise
    // This prevents race conditions with multiple identical requests
    if (this.pendingRequests[requestKey]) {
      console.log('API: Reusing in-progress request for:', requestKey);
      return this.pendingRequests[requestKey];
    }
    
    // Set up request options
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    // Only for auth endpoints or explicitly non-auth requests, include credentials
    // This helps with initial login/registration (for backward compatibility)
    if (endpoint.startsWith('/auth')) {
      options.credentials = 'include';
    }
    
    // Add authorization header if token exists and auth is required
    if (requiresAuth && window.TokenService && typeof window.TokenService.getToken === 'function') {
      const token = window.TokenService.getToken();
      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    // Create the request promise and store it
    this.pendingRequests[requestKey] = (async () => {
    
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `API request failed: ${response.statusText}`);
      }
      
      return data;
    } catch (error) {
      console.error(`API Error (${method} ${endpoint}):`, error);
      throw error;
    } finally {
      // Remove the pending request once completed (success or failure)
      delete this.pendingRequests[requestKey];
    }
    })(); // Execute the async function immediately
    
    // Return the promise
    return this.pendingRequests[requestKey];
  },
  
  // Authentication endpoints
  auth: {
    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @returns {Promise} - Promise with user data
     */
    register: async (userData) => {
      return API.request('/auth/register', 'POST', userData);
    },
    
    /**
     * Login user
     * @param {Object} credentials - Login credentials
     * @returns {Promise} - Promise with user data
     */
    login: async (credentials) => {
      return API.request('/auth/login', 'POST', credentials);
    },
    
    /**
     * Login with Google
     * @param {Object} googleData - Google auth data
     * @returns {Promise} - Promise with user data
     */
    googleLogin: async (googleData) => {
      return API.request('/auth/google', 'POST', googleData);
    },
    
    /**
     * Logout user
     * @returns {Promise} - Promise with logout result
     */
    logout: async () => {
      return API.request('/auth/logout', 'POST');
    }
  },
  
  // User profile endpoints
  user: {
    /**
     * Get user profile
     * @returns {Promise} - Promise with user profile data
     */
    getProfile: async () => {
      return API.request('/user/profile');
    },
    
    /**
     * Update user profile
     * @param {Object} profileData - Updated profile data
     * @returns {Promise} - Promise with updated user data
     */
    updateProfile: async (profileData) => {
      return API.request('/user/profile', 'PUT', profileData);
    }
  },
  
  // Class and booking endpoints
  classes: {
    /**
     * Get all classes
     * @returns {Promise} - Promise with classes data
     */
    getAll: async () => {
      return API.request('/classes');
    },
    
    /**
     * Book a class
     * @param {Object} bookingData - Booking data
     * @returns {Promise} - Promise with booking confirmation
     */
    book: async (bookingData) => {
      return API.request('/bookings', 'POST', bookingData);
    },
    
    /**
     * Get user's bookings
     * @returns {Promise} - Promise with user's bookings
     */
    getUserBookings: async () => {
      return API.request('/bookings');
    }
  },
  
  // Workshop endpoints
  workshops: {
    /**
     * Get all workshops
     * @returns {Promise} - Promise with workshops data
     */
    getAll: async () => {
      return API.request('/workshops');
    },
    
    /**
     * Register for a workshop
     * @param {Object} registrationData - Workshop registration data
     * @returns {Promise} - Promise with registration confirmation
     */
    register: async (registrationData) => {
      return API.request('/workshops/register', 'POST', registrationData);
    }
  },
  
  // Private session endpoints
  privateSessions: {
    /**
     * Book a private session
     * @param {Object} sessionData - Private session data
     * @returns {Promise} - Promise with booking confirmation
     */
    book: async (sessionData) => {
      return API.request('/private-sessions', 'POST', sessionData);
    }
  },
  
  // Admin endpoints
  admin: {
    /**
     * Get all users
     * @param {number} limit - Max number of users to return
     * @param {number} skip - Number of users to skip
     * @returns {Promise} - Promise with users data
     */
    getUsers: async (limit = 50, skip = 0) => {
      return API.request(`/admin/users?limit=${limit}&skip=${skip}`);
    },
    
    /**
     * Get all active memberships
     * @returns {Promise} - Promise with memberships data
     */
    getMemberships: async () => {
      return API.request('/admin/memberships');
    },
    
    /**
     * Get bookings for a specific class and date
     * @param {string} classId - Class ID
     * @param {string} date - Date string (YYYY-MM-DD)
     * @returns {Promise} - Promise with bookings data
     */
    getClassBookings: async (classId, date) => {
      return API.request(`/admin/bookings/${classId}/${date}`);
    },
    
    /**
     * Get all upcoming private sessions
     * @returns {Promise} - Promise with private sessions data
     */
    getPrivateSessions: async () => {
      return API.request('/admin/private-sessions');
    }
  },
  
  // Newsletter subscription
  newsletter: {
    /**
     * Subscribe to newsletter
     * @param {string} email - Email address
     * @returns {Promise} - Promise with subscription confirmation
     */
    subscribe: async (email) => {
      return API.request('/newsletter/subscribe', 'POST', { email });
    }
  }
};

// Export the API for use in other files
window.API = API;
