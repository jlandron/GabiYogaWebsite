/**
 * Admin API Utilities
 * 
 * This module provides consistent API access methods for admin pages,
 * ensuring proper authentication is always included with requests.
 * 
 * It handles both JWT token authentication and session cookie authentication,
 * preferring session cookies when available for longer session persistence.
 */
const logger = require('../utils/logger');


const AdminApiUtils = {
    /**
     * Make an authenticated API request
     * @param {string} url - The API endpoint to call
     * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
     * @param {Object} data - Optional data to send with the request
     * @returns {Promise} - Promise that resolves to the parsed JSON response
     */
    request: async function(url, method = 'GET', data = null) {
        const requestId = Math.random().toString(36).substr(2, 9);
        logger.info(`[${requestId}] AdminApiUtils: Starting ${method} request to ${url}`);
        
        if (data) {
            logger.info(`[${requestId}] AdminApiUtils: Request data:`, JSON.stringify(data, null, 2));
        }
        
        // Use a promise-based wrapper around XMLHttpRequest for better browser compatibility
        return new Promise((resolve, reject) => {
            try {
                // Get JWT token if available
                const token = localStorage.getItem('auth_token');
                logger.info(`[${requestId}] AdminApiUtils: Auth token available:`, !!token);
                
                // Check session cookie status
                const hasCookie = document.cookie.includes('connect.sid') || document.cookie.includes('sessionId');
                logger.info(`[${requestId}] AdminApiUtils: Session cookie available:`, hasCookie);
                
                // Create XHR object
                const xhr = new XMLHttpRequest();
                xhr.open(method, url, true);
                
                // Set headers
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.withCredentials = true; // Include session cookies with request
                
                logger.info(`[${requestId}] AdminApiUtils: Request headers set, credentials included`);
                
                // Set up response handler
                xhr.onload = function() {
                    logger.info(`[${requestId}] AdminApiUtils: Response received - Status: ${xhr.status}`);
                    
                    if (xhr.status >= 200 && xhr.status < 300) {
                        // Success
                        try {
                            const responseData = JSON.parse(xhr.responseText);
                            logger.info(`[${requestId}] AdminApiUtils: Request successful:`, responseData);
                            resolve(responseData);
                        } catch (e) {
                            console.error(`[${requestId}] AdminApiUtils: Failed to parse JSON response:`, xhr.responseText);
                            reject(new Error('Invalid JSON response'));
                        }
                    } else {
                        // Error handling
                        console.error(`[${requestId}] AdminApiUtils: Request failed with status ${xhr.status}`);
                        console.error(`[${requestId}] AdminApiUtils: Response text:`, xhr.responseText);
                        
                        if (xhr.status === 401) {
                            console.error(`[${requestId}] AdminApiUtils: Authentication failed`);
                            
                            // Let AuthHandler deal with the redirect
                            if (window.AuthHandler) {
                                window.AuthHandler.handleAuthError(new Error('Authentication failed'));
                            } else {
                                // Fallback if AuthHandler is not available
                                if (confirm('Your session has expired. Please log in again.')) {
                                    window.location.href = '/index.html';
                                }
                            }
                            
                            reject(new Error('Authentication failed'));
                        } else {
                            // For other errors, try to get error message from response
                            let errorMessage;
                            
                            try {
                                // Try to parse as JSON
                                const errorJson = JSON.parse(xhr.responseText);
                                errorMessage = errorJson.message || errorJson.error || `Error ${xhr.status}: ${xhr.statusText}`;
                                console.error(`[${requestId}] AdminApiUtils: Parsed error:`, errorJson);
                            } catch (e) {
                                // If parsing fails, use the raw text or status
                                errorMessage = xhr.responseText || `Error ${xhr.status}: ${xhr.statusText}`;
                                console.error(`[${requestId}] AdminApiUtils: Raw error response:`, xhr.responseText);
                            }
                            
                            reject(new Error(errorMessage));
                        }
                    }
                };
                
                // Handle network errors
                xhr.onerror = function() {
                    console.error(`[${requestId}] AdminApiUtils: Network error occurred`);
                    reject(new Error('Network error occurred'));
                };
                
                // Send the request
                if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
                    logger.info(`[${requestId}] AdminApiUtils: Sending request with data`);
                    xhr.send(JSON.stringify(data));
                } else {
                    logger.info(`[${requestId}] AdminApiUtils: Sending request without data`);
                    xhr.send();
                }
            } catch (error) {
                console.error(`[${requestId}] AdminApiUtils request error:`, error);
                reject(error);
            }
        });
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
