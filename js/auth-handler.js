/**
 * Gabi Jyoti Yoga - Authentication Handler
 * Centralizes authentication logic for all secure pages
 */

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

            // Step 3: Validate token with backend
            try {
                console.log('AuthHandler: Validating token with backend...');
                // Use a specific endpoint for token validation to minimize payload
                const response = await fetch(`${API_BASE_URL}/auth/validate`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${TokenService.getToken()}`
                    },
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error(`Token validation failed: ${response.statusText}`);
                }

                const data = await response.json();
                
                if (!data.valid) {
                    throw new Error('Invalid token');
                }

                console.log('AuthHandler: Token validated successfully');
                
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

                // Handle invalid token by logging out and redirecting
                this.handleAuthError(error);
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
     * Redirect to login page with current page as redirect parameter
     */
    redirectToLogin: function() {
        // Save current page for redirect
        const currentPage = window.location.pathname.split('/').pop();
        window.location.href = `login.html?redirect=${currentPage}`;
    },

    /**
     * Log out user and redirect to login page
     */
    logout: function() {
        // Save current page for redirect before logout
        const currentPage = window.location.pathname.split('/').pop();
        
        // Clear authentication data
        UserService.logout();
        
        // Redirect to login with the saved page as redirect parameter
        window.location.href = `login.html?redirect=${currentPage}`;
    },

    /**
     * Check if token has already been validated on this page
     * @returns {boolean} - Whether token has been validated
     */
    isTokenValidated: function() {
        return window.tokenValidated === true;
    },
    
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
        
        // Validate with admin required
        return await this.validateAuth({
            adminRequired: true,
            onSuccess: () => {
                console.log('AuthHandler: Admin page initialized successfully');
            },
            onError: (error) => {
                console.error('AuthHandler: Admin page initialization failed:', error);
                this.handleAuthError(error);
            }
        });
    }
};
