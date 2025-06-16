/**
 * Gabi Jyoti Yoga - Authentication Handler
 * Centralizes authentication logic for all secure pages
 */

// Maximum retries for API calls
const MAX_RETRIES = 2;

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

            // Step 3: Validate token with backend - with retry logic
            try {
                console.log('AuthHandler: Validating token with backend...');
                
                // Skip validation if we've already validated this token during this page load
                if (window.tokenValidated === true) {
                    console.log('AuthHandler: Token already validated in this session');
                    
                    // Call success callback if provided
                    if (onSuccess && typeof onSuccess === 'function') {
                        onSuccess();
                    }
                    
                    return true;
                }
                
                // Implement retry logic for network errors
                let retries = 0;
                let success = false;
                let lastError = null;
                
                while (retries <= MAX_RETRIES && !success) {
                    try {
                        // Use the existing /auth/me endpoint to validate the token
                        const response = await fetch(`${API_BASE_URL}/auth/me`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${TokenService.getToken()}`
                            },
                            credentials: 'include',
                            // Add cache control to prevent caching
                            cache: 'no-store'
                        });
                        
                        if (!response.ok) {
                            throw new Error(`Token validation failed: ${response.statusText}`);
                        }
                        
                        const data = await response.json();
                        
                        if (!data.success || !data.user) {
                            throw new Error('Invalid token');
                        }
                        
                        // If we get here, validation was successful
                        console.log('AuthHandler: Token validated successfully');
                        success = true;
                        
                        // Set global flag to prevent redundant validations
                        window.tokenValidated = true;
                        
                        // Update user data in local storage if needed
                        if (data.user) {
                            UserService.setUser(data.user);
                        }
                        
                        break; // Exit retry loop on success
                    } catch (retryError) {
                        lastError = retryError;
                        retries++;
                        
                        if (retries <= MAX_RETRIES) {
                            console.warn(`AuthHandler: Retry ${retries}/${MAX_RETRIES} after error: ${retryError.message}`);
                            // Wait briefly before retry
                            await new Promise(resolve => setTimeout(resolve, 500 * retries));
                        }
                    }
                }
                
                if (!success) {
                    // All retries failed
                    throw lastError || new Error('Token validation failed after multiple attempts');
                }
                
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
    }
};
