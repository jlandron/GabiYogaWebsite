/**
 * Gabi Jyoti Yoga - Authentication Handler
 * Simplified authentication that only checks on initial page load
 */

// Use the existing TokenService and UserService from account.js
const AuthHandler = {
    /**
     * Simplified validation - only checks user data without additional API calls
     * @param {Object} options - Configuration options
     * @param {boolean} options.adminRequired - Whether admin role is required
     * @param {Function} options.onSuccess - Callback function on successful validation
     * @param {Function} options.onError - Callback function on validation error
     * @returns {Promise<boolean>} - Whether authentication was successful
     */
    validateAuth: async function(options = {}) {
        const adminRequired = options.adminRequired || false;
        const onSuccess = options.onSuccess || null;
        const onError = options.onError || null;

        try {
            console.log('AuthHandler: Checking local authentication data');
            
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
            
            // Step 3: On initial page load only, verify token with backend once
            const initialAuthDone = window.tokenValidated === true || 
                                   localStorage.getItem('initialAuthDone') === 'true';
            
            if (!initialAuthDone) {
                console.log('AuthHandler: Initial authentication check');
                try {
                    // Single API call to verify token on first load
                    const response = await fetch(`${API_BASE_URL}/auth/me`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${TokenService.getToken()}`
                        },
                        credentials: 'include',
                        cache: 'no-store'
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Token validation failed: ${response.statusText}`);
                    }
                    
                    const data = await response.json();
                    
                    if (!data.success || !data.user) {
                        throw new Error('Invalid token');
                    }
                    
                    // Update user data in local storage
                    UserService.setUser(data.user);
                    
                    // Mark as authenticated for this session
                    window.tokenValidated = true;
                    localStorage.setItem('initialAuthDone', 'true');
                    console.log('AuthHandler: Initial authentication successful');
                    
                } catch (error) {
                    console.error('AuthHandler: Initial authentication failed:', error);
                    
                    if (onError && typeof onError === 'function') {
                        onError(error);
                    }
                    
                    // Handle failed initial auth
                    UserService.logout();
                    this.redirectToLogin();
                    return false;
                }
            } else {
                console.log('AuthHandler: Using cached authentication state');
            }
            
            // Call success callback if provided
            if (onSuccess && typeof onSuccess === 'function') {
                onSuccess();
            }
            
            return true;
            
        } catch (error) {
            console.error('AuthHandler: Unexpected error:', error);
            
            if (onError && typeof onError === 'function') {
                onError(error);
            }
            
            return false;
        }
    },

    /**
     * Simple error handler - no auto-logout
     * @param {Error} error - The authentication error
     */
    handleAuthError: function(error) {
        // Just log the error without automatic logout
        console.log('AuthHandler: Auth error detected:', error.message);
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
        localStorage.removeItem('initialAuthDone');
        window.tokenValidated = false;
        
        // Redirect to login with the saved page as redirect parameter
        window.location.href = `login.html?redirect=${currentPage}`;
    },

    /**
     * Check if initial authentication is done
     * @returns {boolean} - Whether initial auth check is done
     */
    isInitialAuthDone: function() {
        return window.tokenValidated === true || localStorage.getItem('initialAuthDone') === 'true';
    }
};
