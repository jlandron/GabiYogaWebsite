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
        redirectInProgress: false,
        pendingValidationPromise: null // Store pending validation promise
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

        // If a validation is already in progress, return the pending promise
        // This fixes race conditions where multiple components request validation simultaneously
        if (this.authState.isValidating && this.authState.pendingValidationPromise) {
            console.log('AuthHandler: Reusing in-progress validation promise...');
            try {
                const result = await this.authState.pendingValidationPromise;
                // Call the success/error callbacks based on the validation result
                if (result && onSuccess) {
                    onSuccess();
                } else if (!result && onError) {
                    onError(new Error('Authentication validation failed'));
                }
                return result;
            } catch (error) {
                if (onError) onError(error);
                return false;
            }
        }

        // Check if we recently validated and don't need to revalidate
        if (!forceValidation && this.isRecentlyValidated()) {
            console.log('AuthHandler: Token was recently validated, skipping validation');
            if (onSuccess && typeof onSuccess === 'function') {
                onSuccess();
            }
            return true;
        }
        
        // Create a validation promise and store it
        this.authState.isValidating = true;
        this.authState.pendingValidationPromise = this._executeValidation(options);
        
        try {
            const result = await this.authState.pendingValidationPromise;
            return result;
        } finally {
            // Clear the pending promise once completed (success or failure)
            this.authState.pendingValidationPromise = null;
            this.authState.isValidating = false;
        }
    },
    
    /**
     * Internal method to perform the actual validation
     * This is separated to allow proper promise handling in validateAuth
     * @private
     */
    _executeValidation: async function(options = {}) {
        const { 
            adminRequired = false,
            timeout = 10000,
            onSuccess = null, 
            onError = null 
        } = options;

        try {
            console.log('AuthHandler: Validating authentication...');
            
            // Step 1: Check if user is logged in (has token and user info)
            const hasJwtToken = !!TokenService.getToken();
            const hasSessionCookie = document.cookie.includes('connect.sid') || document.cookie.includes('sessionId');
            const hasUserInfo = !!UserService.getUser();
            
            console.log('AuthHandler: Authentication state check: ', { 
                hasJwtToken, 
                hasSessionCookie, 
                hasUserInfo 
            });
            
            // Consider authenticated if we have either a JWT token or a session cookie, plus user info
            if ((!hasJwtToken && !hasSessionCookie) || !hasUserInfo) {
                console.log('AuthHandler: No token, session cookie, or user info found');
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

            // Validate the token with the server for admin pages to ensure it's really valid
            try {
                console.log('AuthHandler: Validating token with server...', {
                    url: `${API_BASE_URL}/auth/me`,
                    token: TokenService.getToken() ? TokenService.getToken().substring(0, 10) + '...' : 'null',
                    userInfo: UserService.getUser() ? 'exists' : 'missing',
                    hasCookies: document.cookie.includes('connect.sid') || document.cookie.includes('sessionId')
                });
                
                const startTime = Date.now();
                const response = await fetch(`${API_BASE_URL}/auth/me`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${TokenService.getToken()}`
                    },
                    credentials: 'include' // Include session cookies
                });
                const endTime = Date.now();
                
                console.log(`AuthHandler: Token validation response received in ${endTime - startTime}ms, status: ${response.status}`);
                
                if (!response.ok) {
                    console.error(`AuthHandler: Token validation FAILED with status ${response.status}`);
                    const responseText = await response.text();
                    console.error('AuthHandler: Response details:', {
                        status: response.status,
                        statusText: response.statusText,
                        responseText: responseText.substring(0, 200)
                    });
                    
                    // Check if we have session cookies - if so, we can continue despite JWT failure
                    const hasSessionCookie = document.cookie.includes('connect.sid') || document.cookie.includes('sessionId');
                    
                    // For 500 errors (server issues), be more forgiving and try to continue
                    if (response.status === 500 && (hasSessionCookie || TokenService.getToken())) {
                        console.log('AuthHandler: Server error (500) but we have authentication credentials - proceeding cautiously');
                        // Don't clear user data on server errors, just mark as needing revalidation later
                        this.authState.lastValidated = null; // Will trigger revalidation next time
                        return true;
                    }
                    
                    // For 401/403 errors with session cookies, try to continue
                    if ((response.status === 401 || response.status === 403) && hasSessionCookie) {
                        console.log('AuthHandler: JWT validation failed but session cookie exists - proceeding with session auth');
                        this.authState.lastValidated = Date.now();
                        window.tokenValidated = true;
                        return true;
                    }
                    
                    throw new Error(`Invalid token (Status: ${response.status})`);
                }
                
                const data = await response.json();
                console.log('AuthHandler: Token validated successfully', {
                    hasUserData: !!(data && (data.user || (data.data && data.data.user)))
                });
                
                // Update user data to ensure it's current
                if (data && (data.user || (data.data && data.data.user))) {
                    const userData = data.user || data.data.user;
                    console.log('AuthHandler: Updating user data with server response', {
                        userId: userData.id,
                        role: userData.role || 'member'
                    });
                    UserService.setUser(userData);
                } else {
                    console.warn('AuthHandler: Token validation succeeded but no user data returned!');
                }
                
            } catch (validationError) {
                console.error(`AuthHandler: Token validation error: ${validationError.message}`);
                console.error('AuthHandler: Full validation error details:', validationError);
                
                // Check for session cookies as a last fallback before giving up
                const hasSessionCookie = document.cookie.includes('connect.sid') || document.cookie.includes('sessionId');
                
                // If it's a network error or server error, be more forgiving
                if (validationError.name === 'TypeError' || validationError.message.includes('500')) {
                    console.log('AuthHandler: Network/server error during validation - proceeding with cached credentials');
                    // Don't clear credentials on network/server errors
                    this.authState.lastValidated = null; // Will retry validation next time
                    return true;
                }
                
                if (hasSessionCookie) {
                    console.log('AuthHandler: Exception in validation but session cookie exists - attempting to proceed');
                    // We'll attempt to continue with session cookies even after an exception
                    this.authState.lastValidated = Date.now();
                    window.tokenValidated = true;
                    return true;
                }
                
                // No JWT and no session cookie - authentication has truly failed
                console.log('AuthHandler: No valid JWT or session cookie - authentication failed');
                
                // Only clear credentials if we're sure it's an authentication failure, not a server issue
                if (!validationError.message.includes('500') && !validationError.name === 'TypeError') {
                    console.log('AuthHandler: Clearing token and user data due to validation failure');
                    TokenService.removeToken();
                    UserService.removeUser();
                }
                
                console.log('AuthHandler: Redirecting to login due to validation failure');
                this.redirectToLogin();
                return false;
            }
            
            // Update validation timestamp
            this.authState.lastValidated = Date.now();
            
            // Set global flag to prevent redundant validations
            window.tokenValidated = true;
            
            // Call success callback if provided
            if (onSuccess && typeof onSuccess === 'function') {
                onSuccess();
            }
            
            return true;
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
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').pop();
        const hasQueryParams = window.location.search && window.location.search.length > 1;
        
        // Don't try to redirect back to login-related pages
        const isLoginRelatedPage = 
            currentPage === 'login.html' || 
            currentPage === 'index.html' || 
            currentPage === 'forgot-password.html' || 
            currentPage === 'reset-password.html';
        
        // Build redirect parameter - only include if it's a page worth returning to
        const redirectParam = !isLoginRelatedPage ? 
            `?redirect=${encodeURIComponent(currentPage + (hasQueryParams ? window.location.search : ''))}` : 
            '';
        
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
            // Fallback to index page 
            console.log('AuthHandler: Redirecting to index page');
            window.location.href = `index.html${redirectParam}`;
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
                // Log the logout request to help debug
                console.log('AuthHandler: Making logout request with token', token ? token.substring(0, 10) + '...' : 'none');
                await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include' // Always include credentials for logout
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
        // Check if we have a timestamp for the last validation
        const hasValidTimestamp = !!this.authState.lastValidated;
        
        // Check if the validation was done recently (within validationTimeout)
        const isRecent = hasValidTimestamp && 
            (Date.now() - this.authState.lastValidated < this.authState.validationTimeout);
        
        // For admin pages (determined by URL), be more strict
        const isAdminPage = window.location.pathname.includes('admin-');
        
        // For admin pages, require a recent validation
        if (isAdminPage) {
            if (isRecent) {
                console.log('AuthHandler: Token was recently validated, skipping validation');
                return true;
            }
            
            console.log('AuthHandler: Admin page requires validation, validation will be performed');
            return false;
        }
        
        // For non-admin pages, we can be more lenient
        const hasJwtToken = !!TokenService.getToken();
        const hasSessionCookie = document.cookie.includes('connect.sid') || document.cookie.includes('sessionId');
        const hasUserInfo = !!UserService.getUser();
        
        if ((hasJwtToken || hasSessionCookie) && hasUserInfo) {
            console.log('AuthHandler: User has authentication credentials - but will validate for admin pages');
            return false;
        }
        
        return false;
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
        // If no token, don't proceed
        if (!TokenService.getToken()) {
            return false;
        }
        
        // As requested, we're now skipping validation calls to the server
        // Just update the timestamp to indicate we've "refreshed" the token
        console.log('AuthHandler: Skipping token refresh as requested');
        this.authState.lastValidated = Date.now();
        window.tokenValidated = true;
        return true;
        
        // Note: The code below is now disabled since we're skipping validation
        // It's been kept as a comment for future reference when validation is added back
        /* 
        console.log('AuthHandler: Token nearing expiration, refreshing...');
        
        // Store the refresh operation in a static variable to prevent multiple refreshes
        if (AuthHandler.refreshInProgress) {
            console.log('AuthHandler: Refresh already in progress, waiting for result...');
            try {
                return await AuthHandler.refreshInProgress;
            } catch (error) {
                console.error('AuthHandler: Error waiting for refresh:', error);
                return false;
            }
        }
        
        // Create and store the refresh promise
        AuthHandler.refreshInProgress = (async () => {
            try {
                const result = await this.validateAuth({
                    forceValidation: true, // Force validation even if recently validated
                    timeout: 5000 // Use a shorter timeout for refresh operations
                });
                return result;
            } catch (error) {
                console.error('AuthHandler: Token refresh failed:', error);
                return false;
            } finally {
                // Clear the refresh promise
                AuthHandler.refreshInProgress = null;
            }
        })();
        
        return await AuthHandler.refreshInProgress;
        */
    }
};
