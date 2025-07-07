/**
 * User Data Manager
 * 
 * Handles user authentication state and provides user profile information
 * for use in purchase forms and other user-specific operations
 */

class UserDataManager {
  constructor() {
    this.currentUser = null;
    this.isLoaded = false;
    this.loadingPromise = null;
  }

  /**
   * Check if the user is logged in
   * @returns {boolean} True if user is logged in
   */
  isLoggedIn() {
    return !!localStorage.getItem('auth_token') && !!localStorage.getItem('user_info');
  }

  /**
   * Get authentication token from local storage
   * @returns {string|null} The auth token or null
   */
  getAuthToken() {
    return localStorage.getItem('auth_token');
  }

  /**
   * Load the current user's profile data
   * @param {boolean} force - Force a refresh even if data is already loaded
   * @returns {Promise<Object>} User profile data
   */
  async loadUserData(force = false) {
    // If we already have a loading operation in progress, return that promise
    if (this.loadingPromise && !force) {
      return this.loadingPromise;
    }
    
    // If user data is already loaded and we're not forcing a refresh
    if (this.isLoaded && this.currentUser && !force) {
      return this.currentUser;
    }
    
    // If not logged in, return null
    if (!this.isLoggedIn()) {
      this.currentUser = null;
      this.isLoaded = true;
      return null;
    }
    
    // Create a new loading promise
    this.loadingPromise = new Promise(async (resolve, reject) => {
      try {
        // Try loading from localStorage first
        try {
          const userInfo = localStorage.getItem('user_info');
          if (userInfo) {
            const user = JSON.parse(userInfo);
            this.currentUser = {
              id: user.user_id || user.id,
              email: user.email,
              firstName: user.first_name || user.firstName || '',
              lastName: user.last_name || user.lastName || '',
              role: user.role || 'member'
            };
            this.isLoaded = true;
            resolve(this.currentUser);
            return;
          }
        } catch (localError) {
          console.warn('Failed to parse user info from localStorage:', localError);
        }
        
        // Try loading from API as fallback
        try {
          const response = await window.API.user.getProfile();
          if (response.success && response.user) {
            this.currentUser = response.user;
            this.isLoaded = true;
            resolve(this.currentUser);
            return;
          }
        } catch (apiError) {
          console.warn('Failed to load user profile from API:', apiError);
          // Continue with fallback method
        }
        
        // Fallback to JWT token if available
        const token = this.getAuthToken();
        if (token) {
          try {
            // Attempt to parse user data from token (jwt structure: header.payload.signature)
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              
              this.currentUser = {
                id: payload.id,
                email: payload.email,
                firstName: payload.firstName || '',
                lastName: payload.lastName || '',
                role: payload.role || 'user'
              };
              
              this.isLoaded = true;
              resolve(this.currentUser);
              return;
            }
          } catch (tokenError) {
            console.warn('Failed to parse token:', tokenError);
          }
        }
        
        // If we reach here, we failed to load user data
        this.currentUser = null;
        this.isLoaded = false;
        resolve(null);
        
      } catch (error) {
        console.error('Error loading user data:', error);
        this.isLoaded = false;
        this.currentUser = null;
        reject(error);
      } finally {
        this.loadingPromise = null;
      }
    });
    
    return this.loadingPromise;
  }

  /**
   * Get the current user's full name
   * @returns {string} User's full name or empty string if not available
   */
  async getFullName() {
    const user = await this.loadUserData();
    if (!user) return '';
    
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
  }

  /**
   * Get the current user's email
   * @returns {string} User's email or empty string if not available
   */
  async getEmail() {
    const user = await this.loadUserData();
    return user ? user.email || '' : '';
  }

  /**
   * Get the current user's ID
   * @returns {string|number|null} User's ID or null if not available
   */
  async getUserId() {
    const user = await this.loadUserData();
    return user ? user.id : null;
  }
}

// Initialize and expose the user data manager instance
window.userDataManager = new UserDataManager();

// Automatically load user data on page load if logged in
document.addEventListener('DOMContentLoaded', () => {
  if (window.userDataManager.isLoggedIn()) {
    window.userDataManager.loadUserData().catch(console.error);
  }
});
