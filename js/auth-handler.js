/**
 * Gabi Jyoti Yoga - Authentication Handler
 * Centralizes authentication logic for all secure pages
 * Updated to work with Passport.js authentication
 */

// Using the API_BASE_URL from account.js (don't redefine it)
// The variable should be available since account.js is loaded before this script

// Use the existing TokenService and UserService from account.js
const AuthHandler = {
    /**
     * Validates a user's authentication when entering a secure page
     * @param {Object} options - Configuration options
     * @param {boolean} options.adminRequired - Whether admin role is required (default: false)
     * @param {Function} options.onSuccess - Callback function on successful validation
     * @param {Function} options.onError - Callback function on validation error
     * @returns {Promise<boolean>} - Whether authentication was successful
     */
    validateAuth: async function(options = {}) {
        const { 
            adminRequired = false, 
            onSuccess = null, 
            onError = null 
        } = options;

        try {
            console.log('AuthHandler: Validating authentication...');
            
            // Step 1: Check if user is logged in (has token and user info)
            if (!TokenService.getToken() || !UserService.getUser()) {
                console.log('AuthHandler: No token or user info found');
                this.redirectToLogin();
                return false;
            }

            // Step 2: For admin pages, check if user is admin
            if (adminRequired && !UserService.isAdmin()) {
                console.log('AuthHandler: User is not an admin');
                // Redirect non-admin users to regular dashboard
                window.location.href = 'dashboard.html';
                return false;
            }

            // Step 3: Validate token with backend using Passport/JWT
            try {
                console.log('AuthHandler: Validating token with backend...');
                
                // Use the token validation endpoint that uses Passport JWT strategy
                const response = await fetch(`${API_BASE_URL}/auth/validate`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${TokenService.getToken()}`
                    },
                    credentials: 'include'
                });

                if (!response.ok) {
                    console.error('AuthHandler: Token validation failed with status:', response.status);
                    throw new Error(`Token validation failed: ${response.statusText}`);
                }

                // Parse the response
                const data = await response.json();
                console.log('AuthHandler: Validation response:', data);
                
                if (!data.valid) {
                    throw new Error('Invalid token');
                }
                
                // Set global flag to prevent redundant validations
                window.tokenValidated = true;
                
                // Call success callback if provided
                if (onSuccess && typeof onSuccess === 'function') {
                    onSuccess();
                }
                
                return true;
            } catch (error) {
                console.error('AuthHandler: Token validation error:', error);
                
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
        // If the error is related to invalid token, log out and redirect
        if (error.message.includes('token')) {
            console.log('AuthHandler: Handling token error - logging out user');
            UserService.logout();
            this.redirectToLogin();
        }
    },

    /**
     * Redirect to login page with current page as redirect parameter,
     * or show login modal if on main site
     */
    redirectToLogin: function() {
        // Save current page for redirect
        const currentPage = window.location.pathname.split('/').pop();
        
        // Check if login-modal.js functions are available
        if (typeof showLoginModal === 'function') {
            // Show the login modal instead of redirecting
            console.log('AuthHandler: Opening login modal');
            showLoginModal(true);
        } else {
            // Fallback to index page since login.html doesn't exist
            console.log('AuthHandler: Redirecting to index page');
            window.location.href = `index.html?redirect=${currentPage}`;
        }
    },

    /**
     * Log out user and redirect to index page
     */
    logout: async function() {
        try {
            // Call the logout endpoint
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${TokenService.getToken()}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            console.log('AuthHandler: Logout API call successful');
        } catch (error) {
            // Log error but continue with logout process
            console.warn('AuthHandler: Error calling logout endpoint:', error);
        } finally {
            // Always clear local storage and redirect
            console.log('AuthHandler: Clearing local user data');
            UserService.logout();
            
            // Redirect to index page
            window.location.href = 'index.html';
        }
    },

    /**
     * Check if token has already been validated on this page
     * @returns {boolean} - Whether token has been validated
     */
    isTokenValidated: function() {
        return window.tokenValidated === true;
    },
    
    /**
     * Flag to prevent multiple login redirects
     */
    redirectInProgress: false,

    /**
     * Initialize admin pages with proper authentication
     * @returns {Promise<boolean>} - Whether initialization was successful
     */
    initAdminPage: async function() {
        console.log('AuthHandler: Initializing admin page');
        
        // Check if already validated in this session
        if (this.isTokenValidated()) {
            console.log('AuthHandler: Token already validated in this session');
            return true;
        }
        
        // Check if we already have a token before trying validation
        if (!TokenService.getToken()) {
            console.log('AuthHandler: No auth token found, redirecting to login');
            
            // If we're not already redirecting, initiate redirect
            if (!this.redirectInProgress) {
                this.redirectInProgress = true;
                
                // Small delay to prevent multiple redirects
                setTimeout(() => {
                    this.redirectToLogin();
                    this.redirectInProgress = false;
                }, 100);
            }
            
            return false;
        }
        
        // Validate with admin required
        try {
            const result = await this.validateAuth({
                adminRequired: true,
                onSuccess: () => {
                    console.log('AuthHandler: Admin page initialized successfully');
                },
                onError: (error) => {
                    console.error('AuthHandler: Admin page initialization failed:', error);
                    // Only attempt to handle auth errors if we're not already redirecting
                    if (!this.redirectInProgress) {
                        this.handleAuthError(error);
                    }
                }
            });
            
            return result;
        } catch (error) {
            console.error('AuthHandler: Unexpected error during admin page initialization:', error);
            return false;
        }
    }
};
