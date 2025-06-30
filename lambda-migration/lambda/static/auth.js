/**
 * Authentication Module
 * Handles user authentication, registration, and profile management
 */

// Auth state management
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// Event listeners for auth forms
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    if (authToken) {
        verifyToken();
    }

    // Setup auth-related click handlers
    setupAuthHandlers();
});

// Setup auth-related click handlers
function setupAuthHandlers() {
    // Auth button click handlers
    document.getElementById('auth-login-btn')?.addEventListener('click', showLoginForm);
    document.getElementById('auth-register-btn')?.addEventListener('click', showRegisterForm);
    document.getElementById('auth-logout-btn')?.addEventListener('click', handleLogout);
    document.getElementById('forgot-password-link')?.addEventListener('click', showForgotPasswordForm);
}

// Show login form
function showLoginForm() {
    const modalHTML = `
        <div id="auth-modal" class="auth-modal">
            <div class="auth-modal-content">
                <div class="auth-modal-header">
                    <h2>Login</h2>
                    <button class="auth-modal-close" onclick="closeAuthModal()">&times;</button>
                </div>
                <div class="auth-modal-body">
                    <form id="login-form" class="auth-form">
                        <div class="form-group">
                            <label for="login-email">Email</label>
                            <input type="email" id="login-email" required>
                        </div>
                        <div class="form-group">
                            <label for="login-password">Password</label>
                            <input type="password" id="login-password" required>
                        </div>
                        <div class="form-error" id="login-error"></div>
                        <button type="submit" class="btn btn-primary">Login</button>
                        <div class="auth-links">
                            <a href="#" id="forgot-password-link">Forgot Password?</a>
                            <span>Don't have an account? <a href="#" onclick="showRegisterForm()">Register</a></span>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('login-form').addEventListener('submit', handleLogin);
}

// Show register form
function showRegisterForm() {
    closeAuthModal();
    const modalHTML = `
        <div id="auth-modal" class="auth-modal">
            <div class="auth-modal-content">
                <div class="auth-modal-header">
                    <h2>Register</h2>
                    <button class="auth-modal-close" onclick="closeAuthModal()">&times;</button>
                </div>
                <div class="auth-modal-body">
                    <form id="register-form" class="auth-form">
                        <div class="form-group">
                            <label for="register-firstName">First Name</label>
                            <input type="text" id="register-firstName" required>
                        </div>
                        <div class="form-group">
                            <label for="register-lastName">Last Name</label>
                            <input type="text" id="register-lastName" required>
                        </div>
                        <div class="form-group">
                            <label for="register-email">Email</label>
                            <input type="email" id="register-email" required>
                        </div>
                        <div class="form-group">
                            <label for="register-password">Password</label>
                            <input type="password" id="register-password" required>
                            <small>Password must be at least 8 characters long</small>
                        </div>
                        <div class="form-error" id="register-error"></div>
                        <button type="submit" class="btn btn-primary">Register</button>
                        <div class="auth-links">
                            <span>Already have an account? <a href="#" onclick="showLoginForm()">Login</a></span>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
}

// Show forgot password form
function showForgotPasswordForm() {
    closeAuthModal();
    const modalHTML = `
        <div id="auth-modal" class="auth-modal">
            <div class="auth-modal-content">
                <div class="auth-modal-header">
                    <h2>Reset Password</h2>
                    <button class="auth-modal-close" onclick="closeAuthModal()">&times;</button>
                </div>
                <div class="auth-modal-body">
                    <form id="forgot-password-form" class="auth-form">
                        <div class="form-group">
                            <label for="forgot-email">Email</label>
                            <input type="email" id="forgot-email" required>
                        </div>
                        <div class="form-error" id="forgot-error"></div>
                        <button type="submit" class="btn btn-primary">Send Reset Link</button>
                        <div class="auth-links">
                            <span>Remember your password? <a href="#" onclick="showLoginForm()">Login</a></span>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('forgot-password-form').addEventListener('submit', handleForgotPassword);
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorElement = document.getElementById('login-error');
    
    try {
        const response = await fetch(API_BASE_URL + '/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Store auth token and user data
            localStorage.setItem('authToken', data.token);
            currentUser = data.user;
            authToken = data.token;
            
            // Update UI
            updateAuthUI();
            closeAuthModal();
            
            // Show success message
            showNotification('Login successful!', 'success');
        } else {
            errorElement.textContent = data.message || 'Login failed';
        }
    } catch (error) {
        console.error('Login error:', error);
        errorElement.textContent = 'An error occurred during login';
    }
}

// Handle register form submission
async function handleRegister(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('register-firstName').value;
    const lastName = document.getElementById('register-lastName').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const errorElement = document.getElementById('register-error');
    
    try {
        const response = await fetch(API_BASE_URL + '/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ firstName, lastName, email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Store auth token and user data
            localStorage.setItem('authToken', data.token);
            currentUser = data.user;
            authToken = data.token;
            
            // Update UI
            updateAuthUI();
            closeAuthModal();
            
            // Show success message
            showNotification('Registration successful!', 'success');
        } else {
            errorElement.textContent = data.message || 'Registration failed';
        }
    } catch (error) {
        console.error('Registration error:', error);
        errorElement.textContent = 'An error occurred during registration';
    }
}

// Handle forgot password form submission
async function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('forgot-email').value;
    const errorElement = document.getElementById('forgot-error');
    
    try {
        const response = await fetch(API_BASE_URL + '/auth/forgot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show success message
            closeAuthModal();
            showNotification('Password reset instructions sent to your email!', 'success');
        } else {
            errorElement.textContent = data.message || 'Failed to send reset instructions';
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        errorElement.textContent = 'An error occurred while processing your request';
    }
}

// Handle logout
async function handleLogout() {
    try {
        const response = await fetch(API_BASE_URL + '/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Clear auth data
            localStorage.removeItem('authToken');
            currentUser = null;
            authToken = null;
            
            // Update UI
            updateAuthUI();
            
            // Show success message
            showNotification('Logged out successfully!', 'success');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('An error occurred during logout', 'error');
    }
}

// Verify auth token
async function verifyToken() {
    try {
        const response = await fetch(API_BASE_URL + '/auth/verify', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            updateAuthUI();
        } else {
            // Token is invalid
            handleLogout();
        }
    } catch (error) {
        console.error('Token verification error:', error);
        handleLogout();
    }
}

// Update UI based on auth state
function updateAuthUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userProfile = document.getElementById('user-profile');
    
    if (currentUser) {
        // User is logged in
        authButtons.innerHTML = `
            <div class="user-menu">
                <button class="btn btn-secondary" onclick="toggleUserMenu()">
                    ${currentUser.firstName} ${currentUser.lastName}
                </button>
                <div class="user-menu-dropdown" id="user-menu-dropdown">
                    <a href="#" onclick="showUserProfile()">Profile</a>
                    <a href="#" onclick="handleLogout()">Logout</a>
                </div>
            </div>
        `;
    } else {
        // User is logged out
        authButtons.innerHTML = `
            <button class="btn btn-secondary" onclick="showLoginForm()">Login</button>
            <button class="btn btn-primary" onclick="showRegisterForm()">Register</button>
        `;
    }
}

// Toggle user menu dropdown
function toggleUserMenu() {
    const dropdown = document.getElementById('user-menu-dropdown');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

// Show user profile
function showUserProfile() {
    if (!currentUser) return;
    
    const modalHTML = `
        <div id="auth-modal" class="auth-modal">
            <div class="auth-modal-content">
                <div class="auth-modal-header">
                    <h2>User Profile</h2>
                    <button class="auth-modal-close" onclick="closeAuthModal()">&times;</button>
                </div>
                <div class="auth-modal-body">
                    <div class="user-profile">
                        <div class="profile-header">
                            <div class="profile-avatar">
                                ${currentUser.firstName[0]}${currentUser.lastName[0]}
                            </div>
                            <h3>${currentUser.firstName} ${currentUser.lastName}</h3>
                            <p>${currentUser.email}</p>
                        </div>
                        <div class="profile-content">
                            <h4>Account Details</h4>
                            <p><strong>Member Since:</strong> ${new Date(currentUser.createdAt).toLocaleDateString()}</p>
                            <p><strong>Role:</strong> ${currentUser.role}</p>
                            
                            <h4>Actions</h4>
                            <button class="btn btn-secondary" onclick="showChangePasswordForm()">
                                Change Password
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Show change password form
function showChangePasswordForm() {
    closeAuthModal();
    const modalHTML = `
        <div id="auth-modal" class="auth-modal">
            <div class="auth-modal-content">
                <div class="auth-modal-header">
                    <h2>Change Password</h2>
                    <button class="auth-modal-close" onclick="closeAuthModal()">&times;</button>
                </div>
                <div class="auth-modal-body">
                    <form id="change-password-form" class="auth-form">
                        <div class="form-group">
                            <label for="current-password">Current Password</label>
                            <input type="password" id="current-password" required>
                        </div>
                        <div class="form-group">
                            <label for="new-password">New Password</label>
                            <input type="password" id="new-password" required>
                            <small>Password must be at least 8 characters long</small>
                        </div>
                        <div class="form-group">
                            <label for="confirm-password">Confirm New Password</label>
                            <input type="password" id="confirm-password" required>
                        </div>
                        <div class="form-error" id="change-password-error"></div>
                        <button type="submit" class="btn btn-primary">Change Password</button>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('change-password-form').addEventListener('submit', handleChangePassword);
}

// Handle change password form submission
async function handleChangePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorElement = document.getElementById('change-password-error');
    
    if (newPassword !== confirmPassword) {
        errorElement.textContent = 'New passwords do not match';
        return;
    }
    
    try {
        const response = await fetch(API_BASE_URL + '/auth/change-password', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeAuthModal();
            showNotification('Password changed successfully!', 'success');
        } else {
            errorElement.textContent = data.message || 'Failed to change password';
        }
    } catch (error) {
        console.error('Change password error:', error);
        errorElement.textContent = 'An error occurred while changing password';
    }
}

// Close auth modal
function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.remove();
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Export functions for use in other modules
window.showLoginForm = showLoginForm;
window.showRegisterForm = showRegisterForm;
window.showForgotPasswordForm = showForgotPasswordForm;
window.handleLogout = handleLogout;
window.closeAuthModal = closeAuthModal;
window.toggleUserMenu = toggleUserMenu;
window.showUserProfile = showUserProfile;
window.showChangePasswordForm = showChangePasswordForm;
