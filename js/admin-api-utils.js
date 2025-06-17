/**
 * Admin API Utilities
 * 
 * This module provides consistent API access methods for admin pages,
 * ensuring proper authentication is always included with requests.
 * 
 * It handles both JWT token authentication and session cookie authentication,
 * preferring session cookies when available for longer session persistence.
 */

const AdminApiUtils = {
    /**
     * Make an authenticated API request
     * @param {string} url - The API endpoint to call
     * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
     * @param {Object} data - Optional data to send with the request
     * @returns {Promise} - Promise that resolves to the parsed JSON response
     */
    request: async function(url, method = 'GET', data = null) {
        console.log(`AdminApiUtils: Making ${method} request to ${url}`);
        
        try {
            // Get JWT token if available
            const token = localStorage.getItem('auth_token');
            
            // Configure fetch options
            const options = {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
            };
            
            // Add body for POST, PUT, PATCH methods
            if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
                options.body = JSON.stringify(data);
            }
            
            // Make the request
            const response = await fetch(url, options);
            
            // Check for HTTP errors
            if (!response.ok) {
                // Special handling for authentication errors
                if (response.status === 401) {
                    console.error('AdminApiUtils: Authentication failed');
                    
                    // Let AuthHandler deal with the redirect
                    if (window.AuthHandler) {
                        window.AuthHandler.handleAuthError(new Error('Authentication failed'));
                    } else {
                        // Fallback if AuthHandler is not available
                        if (confirm('Your session has expired. Please log in again.')) {
                            window.location.href = '/index.html';
                        }
                    }
                    
                    throw new Error('Authentication failed');
                }
                
                // For other errors, try to get error message from response
                const errorText = await response.text();
                let errorMessage;
                
                try {
                    // Try to parse as JSON
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || errorJson.error || `Error ${response.status}: ${response.statusText}`;
                } catch (e) {
                    // If parsing fails, use the raw text or status
                    errorMessage = errorText || `Error ${response.status}: ${response.statusText}`;
                }
                
                throw new Error(errorMessage);
            }
            
            // Parse JSON response
            const responseData = await response.json();
            return responseData;
        } catch (error) {
            console.error('AdminApiUtils request error:', error);
            
            // Re-throw error to be handled by caller
            throw error;
        }
    },
    
    /**
     * Get the authentication status
     * @returns {Object} - Authentication status object containing token and session info
     */
    getAuthStatus: function() {
        const token = localStorage.getItem('auth_token');
        const hasCookie = document.cookie.includes('connect.sid') || document.cookie.includes('sessionId');
        
        return {
            hasToken: !!token,
            hasSessionCookie: hasCookie,
            isAuthenticated: !!(token || hasCookie)
        };
    }
};

// Make available globally
window.AdminApiUtils = AdminApiUtils;
