/**
 * Login Modal JavaScript
 * Handles modal display, form submissions, and authentication flows
 */

// Import the existing authentication services from account.js
// These will be available globally since account.js is loaded first

// Global variables to track login modal state
let shouldRedirectAfterLogin = true;
let postLoginCallback = null;

// Modal display functions
function showLoginModal(redirectAfterLogin = true, callback = null) {
    shouldRedirectAfterLogin = redirectAfterLogin;
    postLoginCallback = callback;
    
    const modal = document.getElementById('loginModal');
    if (modal) {
        // Clear any existing messages
        clearModalMessages();
        modal.classList.add('show');
        modal.style.display = 'flex';
        
        // Focus on email input
        setTimeout(() => {
            const emailInput = document.getElementById('modalEmail');
            if (emailInput) emailInput.focus();
        }, 100);
    }
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        clearModalMessages();
    }
}

function showRegistrationModal() {
    // Close login modal first
    closeLoginModal();
    
    const modal = document.getElementById('registrationModal');
    if (modal) {
        clearModalMessages();
        modal.classList.add('show');
        modal.style.display = 'flex';
        
        // Focus on first name input
        setTimeout(() => {
            const firstNameInput = document.getElementById('modalFirstName');
            if (firstNameInput) firstNameInput.focus();
        }, 100);
    }
}

function closeRegistrationModal() {
    const modal = document.getElementById('registrationModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        clearModalMessages();
    }
}

function showForgotPasswordModal() {
    // Close login modal first
    closeLoginModal();
    
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        clearModalMessages();
        modal.classList.add('show');
        modal.style.display = 'flex';
        
        // Focus on email input
        setTimeout(() => {
            const emailInput = document.getElementById('modalResetEmail');
            if (emailInput) emailInput.focus();
        }, 100);
    }
}

function closeForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        clearModalMessages();
    }
}

function showTermsModal() {
    const modal = document.getElementById('termsModal');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
    }
}

function closeTermsModal() {
    const modal = document.getElementById('termsModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

function acceptTerms() {
    // Check the terms checkbox in the registration modal
    const termsCheckbox = document.getElementById('modalTermsAgree');
    if (termsCheckbox) {
        termsCheckbox.checked = true;
    }
    closeTermsModal();
}

// Clear all modal messages
function clearModalMessages() {
    const messageElements = [
        'loginModalMessage',
        'registrationModalMessage', 
        'forgotPasswordModalMessage'
    ];
    
    messageElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = '';
            element.className = 'message';
        }
    });
}

// Show modal-specific error messages
function showModalError(message, modalType = 'login') {
    const messageIds = {
        login: 'loginModalMessage',
        registration: 'registrationModalMessage',
        forgotPassword: 'forgotPasswordModalMessage'
    };
    
    const messageElement = document.getElementById(messageIds[modalType]);
    if (messageElement) {
        messageElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        messageElement.className = 'message error';
    }
}

// Show modal-specific success messages
function showModalSuccess(message, modalType = 'login') {
    const messageIds = {
        login: 'loginModalMessage',
        registration: 'registrationModalMessage',
        forgotPassword: 'forgotPasswordModalMessage'
    };
    
    const messageElement = document.getElementById(messageIds[modalType]);
    if (messageElement) {
        messageElement.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        messageElement.className = 'message success';
    }
}

// Set loading state for modal buttons
function setModalFormLoading(isLoading, modalType = 'login') {
    const buttonSelectors = {
        login: '#loginModalForm button[type="submit"]',
        registration: '#registrationModalForm button[type="submit"]',
        forgotPassword: '#forgotPasswordModalForm button[type="submit"]'
    };
    
    const button = document.querySelector(buttonSelectors[modalType]);
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

// Handle login form submission
async function handleLoginSubmit(event) {
    event.preventDefault();
    
    setModalFormLoading(true, 'login');
    clearModalMessages();
    
    const email = document.getElementById('modalEmail').value;
    const password = document.getElementById('modalPassword').value;
    
    try {
        // Use the existing ApiService from account.js
        // Passport.js integration: ApiService.login will handle token parsing
        const response = await ApiService.login({ email, password });
        
        // Check if login was successful
        if (!response || (!response.token && !response.data?.token)) {
            throw new Error('Login failed: Invalid server response');
        }
        
        // Initialize AuthHandler's validation state with the new token
        if (window.AuthHandler && typeof window.AuthHandler.validateAuth === 'function') {
            // Validate the token with the server and establish the auth state
            await window.AuthHandler.validateAuth({
                forceValidation: true,
                onError: (error) => {
                    throw new Error('Authentication validation failed: ' + error.message);
                }
            });
        }
        
        // Close modal
        closeLoginModal();
        
        // Only redirect if shouldRedirectAfterLogin is true
        if (shouldRedirectAfterLogin) {
            // Check user role and redirect appropriately
            if (UserService.isAdmin()) {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        } else {
            // Execute post-login callback if provided
            if (postLoginCallback && typeof postLoginCallback === 'function') {
                postLoginCallback();
            } else {
                // Just close the modal and stay on the current page
                console.log('User logged in successfully, staying on current page');
                
                // Optionally refresh the page to update any auth-dependent UI elements
                // window.location.reload();
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        showModalError(error.message, 'login');
        
        // Clear any token that might have been set during a failed login
        UserService.logout();
    } finally {
        setModalFormLoading(false, 'login');
    }
}

// Handle registration form submission
async function handleRegistrationSubmit(event) {
    event.preventDefault();
    
    setModalFormLoading(true, 'registration');
    clearModalMessages();
    
    const firstName = document.getElementById('modalFirstName').value;
    const lastName = document.getElementById('modalLastName').value;
    const email = document.getElementById('modalRegisterEmail').value;
    const password = document.getElementById('modalRegisterPassword').value;
    const confirmPassword = document.getElementById('modalConfirmPassword').value;
    const termsAgreed = document.getElementById('modalTermsAgree').checked;
    
    // Validation
    if (password !== confirmPassword) {
        showModalError('Passwords do not match!', 'registration');
        setModalFormLoading(false, 'registration');
        return;
    }
    
    if (!termsAgreed) {
        showModalError('You must agree to the Terms & Conditions to create an account.', 'registration');
        setModalFormLoading(false, 'registration');
        return;
    }
    
    try {
        // Use the existing ApiService from account.js
        // Passport.js integration: ApiService.register will handle token parsing
        const response = await ApiService.register({ firstName, lastName, email, password });
        
        // Check if registration was successful
        if (!response || (!response.token && !response.data?.token)) {
            throw new Error('Registration failed: Invalid server response');
        }
        
        // Close modal and redirect to dashboard (new users are always regular members)
        closeRegistrationModal();
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Registration error:', error);
        showModalError(error.message || 'An error occurred during registration', 'registration');
    } finally {
        setModalFormLoading(false, 'registration');
    }
}

// Handle forgot password form submission
async function handleForgotPasswordSubmit(event) {
    event.preventDefault();
    
    setModalFormLoading(true, 'forgotPassword');
    clearModalMessages();
    
    const email = document.getElementById('modalResetEmail').value;
    
    try {
        // Make API call to request password reset
        const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showModalSuccess('Password reset link sent to your email!', 'forgotPassword');
            // Clear the form
            document.getElementById('modalResetEmail').value = '';
        } else {
            showModalError(data.message || 'Failed to send reset email', 'forgotPassword');
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        showModalError('An error occurred. Please try again.', 'forgotPassword');
    } finally {
        setModalFormLoading(false, 'forgotPassword');
    }
}

// Setup password visibility toggles
function setupModalPasswordToggles() {
    const toggleButtons = document.querySelectorAll('#loginModal .toggle-password, #registrationModal .toggle-password, #forgotPasswordModal .toggle-password');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const passwordInput = button.previousElementSibling;
            
            if (passwordInput && passwordInput.type === 'password') {
                passwordInput.type = 'text';
                button.classList.remove('fa-eye-slash');
                button.classList.add('fa-eye');
            } else if (passwordInput) {
                passwordInput.type = 'password';
                button.classList.remove('fa-eye');
                button.classList.add('fa-eye-slash');
            }
        });
    });
}

// Initialize modal functionality
function initializeLoginModals() {
    // Set up form submissions
    const loginForm = document.getElementById('loginModalForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
    
    const registrationForm = document.getElementById('registrationModalForm');
    if (registrationForm) {
        registrationForm.addEventListener('submit', handleRegistrationSubmit);
    }
    
    const forgotPasswordForm = document.getElementById('forgotPasswordModalForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', handleForgotPasswordSubmit);
    }
    
    // Set up password toggles
    setupModalPasswordToggles();
    
    // Set up modal close functionality
    setupModalCloseFunctionality();
}

// Set up modal close functionality
function setupModalCloseFunctionality() {
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const modals = [
            document.getElementById('loginModal'),
            document.getElementById('registrationModal'),
            document.getElementById('forgotPasswordModal'),
            document.getElementById('termsModal')
        ];
        
        modals.forEach(modal => {
            if (modal && event.target === modal) {
                modal.classList.remove('show');
                modal.style.display = 'none';
                clearModalMessages();
            }
        });
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const visibleModals = [
                document.getElementById('loginModal'),
                document.getElementById('registrationModal'),
                document.getElementById('forgotPasswordModal'),
                document.getElementById('termsModal')
            ].filter(modal => modal && (modal.style.display === 'block' || modal.style.display === 'flex'));
            
            if (visibleModals.length > 0) {
                const lastModal = visibleModals[visibleModals.length - 1];
                lastModal.classList.remove('show');
                lastModal.style.display = 'none';
                clearModalMessages();
            }
        }
    });
}

// Handle "My Account" link click
function handleMyAccountClick(event) {
    event.preventDefault();
    
    // Check if user is logged in
    if (UserService && UserService.isLoggedIn()) {
        // Redirect to appropriate dashboard
        if (UserService.isAdmin()) {
            window.location.href = 'admin-dashboard.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    } else {
        // Show login modal
        showLoginModal();
    }
}

// Make functions available globally
window.showLoginModal = showLoginModal;
window.closeLoginModal = closeLoginModal;
window.showRegistrationModal = showRegistrationModal;
window.closeRegistrationModal = closeRegistrationModal;
window.showForgotPasswordModal = showForgotPasswordModal;
window.closeForgotPasswordModal = closeForgotPasswordModal;
window.showTermsModal = showTermsModal;
window.closeTermsModal = closeTermsModal;
window.acceptTerms = acceptTerms;
window.handleMyAccountClick = handleMyAccountClick;
window.initializeLoginModals = initializeLoginModals;
