/**
 * Gabi Jyoti Yoga - Authentication Handler
 * Centralizes authentication logic for all secure pages
 * Updated to work with Passport.js authentication
 * 
 * This is the single source of truth for authentication state across the application.
 * All pages should use these methods for consistent authentication behavior.
 */

// Using the API_BASE_URL from account.js (don't redefine it)
// The variable should be available since account.js is loaded before this script

// Use the existing TokenService and UserService from account.js
const AuthHandler = {
    // Authentication state tracking
    authState: {
        isValidating: false,
        lastValidated: null,
        validationTimeout: 15 * 60 * 1000, // 15 minutes in milliseconds
        redirectInProgress: false
    },
    /**
     * Validates a user's authentication when entering a secure page
     * @param {Object} options - Configuration options
     * @param {boolean} options.adminRequired - Whether admin role is required (default: false)
     * @param {boolean} options.forceValidation - Force validation even if recently validated (default: false)
     * @param {number} options.timeout - Custom timeout for validation in ms (default: 10000)
     * @param {Function} options.onSuccess - Callback function on successful validation
     * @param {Function} options.onError - Callback function on validation error
     * @returns {Promise<boolean>} - Whether authentication was successful
     */
    validateAuth: async function(options = {}) {
        const { 
            adminRequired = false,
            forceValidation = false,
            timeout = 10000,
            onSuccess = null, 
            onError = null 
        } = options;

        // Check if we are already validating
        if (this.authState.isValidating) {
            console.log('AuthHandler: Authentication validation already in progress...');
            return false;
        }

        // Set validating flag to prevent multiple simultaneous validations
        this.authState.isValidating = true;

        // Check if we recently validated and don't need to revalidate
        if (!forceValidation && this.isRecentlyValidated()) {
            console.log('AuthHandler: Token was recently validated, skipping validation');
            this.authState.isValidating = false;
            if (onSuccess && typeof onSuccess === 'function') {
                onSuccess();
            }
            return true;
        }

        try {
            console.log('AuthHandler: Validating authentication...');
            
            // Step 1: Check if user is logged in (has token and user info)
            if (!TokenService.getToken() || !UserService.getUser()) {
                console.log('AuthHandler: No token or user info found');
                this.redirectToLogin();
                this.authState.isValidating = false;
                return false;
            }

            // Step 2: For admin pages, check if user is admin
            if (adminRequired && !UserService.isAdmin()) {
                console.log('AuthHandler: User is not an admin');
                // Redirect non-admin users to regular dashboard
                window.location.href = 'dashboard.html';
                this.authState.isValidating = false;
                return false;
            }

            // Step 3: Validate token with backend using Passport/JWT with timeout
            try {
                console.log('AuthHandler: Validating token with backend...');
                
                // Create a promise that rejects after the timeout
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Authentication timeout')), timeout);
                });
                
                // Token validation request
                const validationPromise = fetch(`${API_BASE_URL}/auth/validate`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${TokenService.getToken()}`
                    },
                    credentials: 'include'
                }).then(async response => {
                    if (!response.ok) {
                        throw new Error(`Token validation failed: ${response.statusText}`);
                    }
                    return await response.json();
                });
                
                // Race the validation against the timeout
                const data = await Promise.race([validationPromise, timeoutPromise]);
                console.log('AuthHandler: Validation response:', data);
                
                if (!data.valid) {
                    throw new Error('Invalid token');
                }
                
                // Update validation timestamp
                this.authState.lastValidated = Date.now();
                
                // Set global flag to prevent redundant validations
                window.tokenValidated = true;
                
                // Call success callback if provided
                if (onSuccess && typeof onSuccess === 'function') {
                    onSuccess();
                }
                
                this.authState.isValidating = false;
                return true;
            } catch (error) {
                console.error('AuthHandler: Token validation error:', error);
                
                this.authState.isValidating = false;
                
                // Call error callback if provided
                if (onError && typeof onError === 'function') {
                    onError(error);
                }

                // Only handle auth errors (not network errors) by logging out
                if (!error.message.includes('NetworkError')) {
                    this.handleAuthError(error);
                }
                return false;
            }
        } catch (error) {
            console.error('AuthHandler: Unexpected error during auth validation:', error);
            
            this.authState.isValidating = false;
            
            // Call error callback if provided
            if (onError && typeof onError === 'function') {
                onError(error);
            }
            
            this.handleAuthError(error);
            return false;
        }
    },

    /**
     * Handle authentication errors consistently
     * @param {Error} error - The authentication error
     */
    handleAuthError: function(error) {
        // Prevent handling errors if a redirect is already in progress
        if (this.authState.redirectInProgress) {
            return;
        }

        // If the error is related to invalid token, log out and redirect
        if (error.message.includes('token') || error.message.includes('Authentication timeout')) {
            console.log('AuthHandler: Handling auth error - logging out user');
            // Clear the validation state
            this.authState.lastValidated = null;
            window.tokenValidated = false;
            
            // Log out the user
            UserService.logout();
            this.redirectToLogin();
        }
    },

    /**
     * Redirect to login page with current page as redirect parameter,
     * or show login modal if on main site
     */
    redirectToLogin: function() {
        // Check if we're already redirecting to prevent loops
        if (this.authState.redirectInProgress) {
            console.log('AuthHandler: Redirect already in progress, skipping additional redirect');
            return;
        }
        
        this.authState.redirectInProgress = true;
        
        // Save current page for redirect
        const currentPage = window.location.pathname.split('/').pop();
        
        // Check if login-modal.js functions are available
        if (typeof showLoginModal === 'function') {
            // Show the login modal instead of redirecting
            console.log('AuthHandler: Opening login modal');
            showLoginModal(true);
            
            // Reset redirect flag after short delay
            setTimeout(() => {
                this.authState.redirectInProgress = false;
            }, 500);
        } else {
            // Fallback to index page since login.html doesn't exist
            console.log('AuthHandler: Redirecting to index page');
            window.location.href = `index.html?redirect=${currentPage}`;
            // Note: No need to reset redirectInProgress as page will reload
        }
    },

    /**
     * Log out user and redirect to index page
     */
    logout: async function() {
        try {
            const token = TokenService.getToken();
            
            // Call the logout endpoint
            if (token) {
                await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                });
                console.log('AuthHandler: Logout API call successful');
            }
        } catch (error) {
            // Log error but continue with logout process
            console.warn('AuthHandler: Error calling logout endpoint:', error);
        } finally {
            // Always clear validation state and local storage
            this.authState.lastValidated = null;
            window.tokenValidated = false;
            
            console.log('AuthHandler: Clearing local user data');
            UserService.logout();
            
            // Redirect to index page
            window.location.href = 'index.html';
        }
    },

    /**
     * Check if token has been recently validated
     * @returns {boolean} - Whether token has been recently validated
     */
    isRecentlyValidated: function() {
        // Check both window.tokenValidated flag and lastValidated timestamp
        if (!window.tokenValidated || !this.authState.lastValidated) {
            return false;
        }
        
        // Check if validation has expired based on timeout
        const now = Date.now();
        const timeSinceValidation = now - this.authState.lastValidated;
        return timeSinceValidation < this.authState.validationTimeout;
    },

    /**
     * Initialize admin pages with proper authentication
     * @param {Object} options - Additional options to pass to validateAuth
     * @returns {Promise<boolean>} - Whether initialization was successful
     */
    initAdminPage: async function(options = {}) {
        console.log('AuthHandler: Initializing admin page');
        
        // Check if we already have a token before trying validation
        if (!TokenService.getToken()) {
            console.log('AuthHandler: No auth token found, redirecting to login');
            this.redirectToLogin();
            return false;
        }
        
        // Validate with admin required
        try {
            const result = await this.validateAuth({
                adminRequired: true,
                ...options,
                onSuccess: () => {
                    console.log('AuthHandler: Admin page initialized successfully');
                    if (options.onSuccess) options.onSuccess();
                },
                onError: (error) => {
                    console.error('AuthHandler: Admin page initialization failed:', error);
                    this.handleAuthError(error);
                    if (options.onError) options.onError(error);
                }
            });
            
            return result;
        } catch (error) {
            console.error('AuthHandler: Unexpected error during admin page initialization:', error);
            return false;
        }
    },
    
    /**
     * Initialize any secure page (not admin-specific)
     * @param {Object} options - Additional options to pass to validateAuth
     * @returns {Promise<boolean>} - Whether initialization was successful
     */
    initSecurePage: async function(options = {}) {
        console.log('AuthHandler: Initializing secure page');
        
        // Check if we already have a token before trying validation
        if (!TokenService.getToken()) {
            console.log('AuthHandler: No auth token found, redirecting to login');
            this.redirectToLogin();
            return false;
        }
        
        // Validate authentication
        try {
            const result = await this.validateAuth({
                adminRequired: false,
                ...options,
                onSuccess: () => {
                    console.log('AuthHandler: Secure page initialized successfully');
                    if (options.onSuccess) options.onSuccess();
                },
                onError: (error) => {
                    console.error('AuthHandler: Secure page initialization failed:', error);
                    this.handleAuthError(error);
                    if (options.onError) options.onError(error);
                }
            });
            
            return result;
        } catch (error) {
            console.error('AuthHandler: Unexpected error during secure page initialization:', error);
            return false;
        }
    },
    
    /**
     * Refreshes the current authentication token if it's nearing expiration
     * @returns {Promise<boolean>} - Whether refresh was successful
     */
    refreshAuthTokenIfNeeded: async function() {
        // If no token or not validated, no need to refresh
        if (!TokenService.getToken() || !this.authState.lastValidated) {
            return false;
        }
        
        // Check if we're approaching the token expiration (75% of validation timeout)
        const now = Date.now();
        const timeSinceValidation = now - this.authState.lastValidated;
        const refreshThreshold = this.authState.validationTimeout * 0.75;
        
        if (timeSinceValidation < refreshThreshold) {
            // Token is still fresh enough
            return true;
        }
        
        console.log('AuthHandler: Token nearing expiration, refreshing...');
        
        // Re-validate token with the backend
        try {
            const result = await this.validateAuth({
                forceValidation: true, // Force validation even if recently validated
                timeout: 5000 // Use a shorter timeout for refresh operations
            });
            
            return result;
        } catch (error) {
            console.error('AuthHandler: Token refresh failed:', error);
            return false;
        }
    }
};
