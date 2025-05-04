/**
 * Gabi Jyoti Yoga - Password Reset JavaScript
 * Handles password reset requests and form submission
 */

// API endpoints
const API_BASE_URL = window.location.origin + '/api';
const API_ENDPOINTS = {
    forgotPassword: `${API_BASE_URL}/auth/forgot-password`,
    resetPassword: `${API_BASE_URL}/auth/reset-password`
};

// Enable debugging for production issues
const DEBUG = true;
function debugLog(message, data) {
    if (DEBUG) {
        console.log(`[Password Reset Debug] ${message}`, data || '');
    }
}

// Helper function to show error message
function showErrorMessage(message, formId) {
    // Clear any existing error messages
    const existingErrors = document.querySelectorAll('.form-error');
    existingErrors.forEach(el => el.remove());
    
    // Create error element
    const errorEl = document.createElement('div');
    errorEl.className = 'form-error';
    errorEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    // Insert error in the form
    const form = document.getElementById(formId);
    if (form) {
        form.querySelector('button[type="submit"]').before(errorEl);
    }
}

// Helper function to show status message
function showStatusMessage(isSuccess, message) {
    // Hide both types of messages
    const successMessage = document.getElementById('success-message');
    
    if (successMessage) {
        if (isSuccess) {
            // Show success message
            successMessage.style.display = 'block';
            
            // Custom message if provided
            if (message) {
                successMessage.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
            }
        } else {
            // Create or update error message
            showErrorMessage(message || 'An error occurred. Please try again.', 'forgot-password-form');
        }
    }
}

// Helper function to set loading state on buttons
function setFormLoading(isLoading, formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const button = form.querySelector('button[type="submit"]');
    if (button) {
        button.disabled = isLoading;
        
        if (isLoading) {
            button.setAttribute('data-original-text', button.innerHTML);
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        } else if (button.hasAttribute('data-original-text')) {
            button.innerHTML = button.getAttribute('data-original-text');
            button.removeAttribute('data-original-text');
        }
    }
}

// Handle forgot password form submission
document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Show loading state and clear previous messages
            setFormLoading(true, 'forgot-password-form');
            
            const email = document.getElementById('reset-email').value;
            
            if (!email) {
                showErrorMessage('Please enter your email address.', 'forgot-password-form');
                setFormLoading(false, 'forgot-password-form');
                return;
            }
            
            try {
                debugLog('Sending password reset request', { email, endpoint: API_ENDPOINTS.forgotPassword });
                
                const response = await fetch(API_ENDPOINTS.forgotPassword, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });
                
                debugLog('Password reset response received', { 
                    status: response.status,
                    statusText: response.statusText
                });
                
                // Get the response data
                let responseData;
                try {
                    responseData = await response.json();
                    debugLog('Response data', responseData);
                } catch (jsonError) {
                    debugLog('Failed to parse JSON response', { error: jsonError.message });
                }
                
                if (!response.ok) {
                    debugLog('Response not OK', { 
                        status: response.status, 
                        statusText: response.statusText,
                        data: responseData 
                    });
                    
                    // Show technical error in debug, but generic message to user
                    if (responseData && responseData.message) {
                        console.error(`API error: ${responseData.message}`);
                    }
                    
                    // Still show success for security (don't reveal email existence)
                    showStatusMessage(true);
                } else {
                    // Success case
                    debugLog('Password reset request successful');
                    showStatusMessage(true);
                }
                
                // Hide form and show success message
                forgotPasswordForm.style.display = 'none';
                
            } catch (error) {
                debugLog('Error sending password reset request', { 
                    error: error.message,
                    stack: error.stack
                });
                
                console.error('Error sending password reset request:', error);
                
                // For user privacy, we won't show specific errors
                // Just show a generic message
                showStatusMessage(true);
                
                // Hide form to prevent repeated submissions
                forgotPasswordForm.style.display = 'none';
            } finally {
                setFormLoading(false, 'forgot-password-form');
            }
        });
    }
});
