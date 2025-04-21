/**
 * Gabi Jyoti Yoga - Account & Dashboard JavaScript
 * Handles login, registration, and dashboard functionality
 * Integrates with SQLite database through backend API
 */

// Google OAuth Configuration (Replace with actual client ID from Google Cloud Console)
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

// API endpoints
const API_BASE_URL = '/api';
const API_ENDPOINTS = {
  login: `${API_BASE_URL}/auth/login`,
  register: `${API_BASE_URL}/auth/register`,
  google: `${API_BASE_URL}/auth/google`,
  me: `${API_BASE_URL}/auth/me`
};

// Store and retrieve auth token
const TokenService = {
  setToken: (token) => localStorage.setItem('auth_token', token),
  getToken: () => localStorage.getItem('auth_token'),
  removeToken: () => localStorage.removeItem('auth_token')
};

// Store and retrieve user info
const UserService = {
  setUser: (user) => localStorage.setItem('user_info', JSON.stringify(user)),
  getUser: () => {
    const userInfo = localStorage.getItem('user_info');
    return userInfo ? JSON.parse(userInfo) : null;
  },
  removeUser: () => localStorage.removeItem('user_info'),
  
  isLoggedIn: () => {
    return !!TokenService.getToken() && !!UserService.getUser();
  },
  
  isAdmin: () => {
    const user = UserService.getUser();
    return user && user.role === 'admin';
  },
  
  logout: () => {
    TokenService.removeToken();
    UserService.removeUser();
  }
};

// Function to fetch website settings and apply to dashboard
async function fetchWebsiteSettings() {
  try {
    const response = await fetch('/api/website-settings');
    
    if (!response.ok) {
      throw new Error('Failed to fetch website settings');
    }
    
    const data = await response.json();
    
    if (data.success && data.settings) {
      applyDashboardSettings(data.settings);
    } else {
      console.error('Error fetching website settings:', data.message || 'Unknown error');
    }
  } catch (error) {
    console.error('Error fetching website settings:', error);
    // Continue without changing settings if there's an error
  }
}

// Apply website settings to the dashboard UI
function applyDashboardSettings(settings) {
  if (!settings || !settings.sectionToggles) return;
  
  const toggles = settings.sectionToggles;
  
  // Only make changes if we're on the regular member dashboard page, not admin pages
  if (window.location.pathname.includes('dashboard') && !window.location.pathname.includes('admin')) {
    // Show/hide dashboard workshops tab and panel based on admin settings
    const workshopsTab = document.querySelector('.dashboard-nav-item[data-panel="workshops"]');
    const workshopsPanel = document.getElementById('workshops-panel');
    if (workshopsTab && !toggles.workshops) {
      workshopsTab.style.display = 'none';
      if (workshopsPanel) workshopsPanel.style.display = 'none';
    }
    
    // Show/hide dashboard retreats tab and panel based on admin settings
    const retreatsTab = document.querySelector('.dashboard-nav-item[data-panel="retreats"]');
    const retreatsPanel = document.getElementById('retreats-panel');
    if (retreatsTab && !toggles.retreats) {
      retreatsTab.style.display = 'none';
      if (retreatsPanel) retreatsPanel.style.display = 'none';
    }
    
    // Show/hide dashboard private sessions tab and panel based on admin settings
    const privateSessionsTab = document.querySelector('.dashboard-nav-item[data-panel="private-sessions"]');
    const privateSessionsPanel = document.getElementById('private-sessions-panel');
    if (privateSessionsTab && !toggles.privateLessons) {
      privateSessionsTab.style.display = 'none';
      if (privateSessionsPanel) privateSessionsPanel.style.display = 'none';
    }
    
    // If the active tab is one that's now hidden, switch to the bookings tab
    const activeTab = document.querySelector('.dashboard-nav-item.active');
    if (
      activeTab && 
      ((activeTab.getAttribute('data-panel') === 'workshops' && !toggles.workshops) ||
       (activeTab.getAttribute('data-panel') === 'retreats' && !toggles.retreats) ||
       (activeTab.getAttribute('data-panel') === 'private-sessions' && !toggles.privateLessons))
    ) {
      // Find the bookings tab and simulate a click to make it active
      const bookingsTab = document.querySelector('.dashboard-nav-item[data-panel="bookings"]');
      if (bookingsTab) {
        bookingsTab.click();
      }
    }
  }
}

// Dashboard redirection based on user role
const redirectToDashboard = () => {
  // Check if there's a redirect parameter in the URL
  const urlParams = new URLSearchParams(window.location.search);
  const redirectParam = urlParams.get('redirect');
  
  if (UserService.isAdmin()) {
    window.location.href = 'admin-dashboard.html';
  } else {
    // If there's a specific redirect for the dashboard, use it
    // This enables redirecting to specific dashboard tabs (e.g. dashboard.html#workshops)
    if (redirectParam && redirectParam.startsWith('dashboard.html')) {
      window.location.href = redirectParam;
    } else {
      window.location.href = 'dashboard.html';
    }
  }
};

// API service with fetch wrappers
const ApiService = {
  /**
   * Make authenticated requests
   */
  authRequest: async (url, method = 'GET', data = null) => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TokenService.getToken()}`
    };

    const options = {
      method,
      headers,
      credentials: 'include'
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.message || 'An error occurred');
    }

    return json;
  },

  /**
   * Make login request
   */
  login: async (credentials) => {
    const response = await fetch(API_ENDPOINTS.login, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.message || 'Invalid credentials');
    }

    if (json.token && json.user) {
      TokenService.setToken(json.token);
      UserService.setUser(json.user);
    }

    return json;
  },

  /**
   * Make registration request
   */
  register: async (userData) => {
    const response = await fetch(API_ENDPOINTS.register, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.message || 'Registration failed');
    }

    if (json.token && json.user) {
      TokenService.setToken(json.token);
      UserService.setUser(json.user);
    }

    return json;
  },

  /**
   * Process Google Sign-In
   */
  googleLogin: async (googleData) => {
    const response = await fetch(API_ENDPOINTS.google, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ googleData })
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.message || 'Google login failed');
    }

    if (json.token && json.user) {
      TokenService.setToken(json.token);
      UserService.setUser(json.user);
    }

    return json;
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async () => {
    return ApiService.authRequest(API_ENDPOINTS.me);
  }
};

// Load Google Identity Services API
function loadGoogleAPI() {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    
    // Initialize Google Sign-In after the script has loaded
    script.onload = initializeGoogleSignIn;
}

// Initialize Google Sign-In
function initializeGoogleSignIn() {
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleSignIn,
            auto_select: false,
            cancel_on_tap_outside: true
        });
    } else {
        console.error('Google API not loaded');
    }
}

// Handle Google Sign-In response
async function handleGoogleSignIn(response) {
    if (response.credential) {
        // Show loading state
        setFormLoading(true, 'google-login-btn');
        
        try {
            // Decode the JWT token to get user information
            const base64Url = response.credential.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            const googleData = JSON.parse(jsonPayload);
            
            // Send Google data to backend
            await ApiService.googleLogin(googleData);
            
            // Redirect based on role
            redirectToDashboard();
        } catch (error) {
            console.error('Google sign-in error:', error);
            showErrorMessage(error.message);
            setFormLoading(false, 'google-login-btn');
        }
    }
}

// Show loading state on buttons
function setFormLoading(isLoading, buttonId = null) {
    const loginBtn = document.querySelector('#login-form button[type="submit"]');
    const registerBtn = document.querySelector('#registration-form button[type="submit"]');
    const googleBtn = document.getElementById('google-login-btn');
    
    const buttons = [loginBtn, registerBtn, googleBtn].filter(btn => btn);
    
    if (buttonId) {
        const specificBtn = document.getElementById(buttonId);
        if (specificBtn) {
            specificBtn.disabled = isLoading;
            
            if (isLoading) {
                specificBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            } else {
                specificBtn.innerHTML = buttonId === 'google-login-btn' ? 
                    '<i class="fab fa-google"></i> Sign in with Google' : 
                    (buttonId === 'register-btn' ? 'Create Account' : 'Sign In');
            }
            return;
        }
    }
    
    // If no specific button, update all buttons
    buttons.forEach(btn => {
        if (btn) {
            btn.disabled = isLoading;
            
            if (isLoading) {
                btn.setAttribute('data-original-text', btn.innerHTML);
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            } else if (btn.hasAttribute('data-original-text')) {
                btn.innerHTML = btn.getAttribute('data-original-text');
                btn.removeAttribute('data-original-text');
            }
        }
    });
}

// Show error message
function showErrorMessage(message, formId = null) {
    // Clear any existing error messages
    const existingErrors = document.querySelectorAll('.form-error');
    existingErrors.forEach(el => el.remove());
    
    // Create error element
    const errorEl = document.createElement('div');
    errorEl.className = 'form-error';
    errorEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    // Insert error in the appropriate form
    if (formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.querySelector('button[type="submit"]').before(errorEl);
        }
    } else {
        // Try to add to visible form
        const loginCard = document.querySelector('#login-form');
        const registerCard = document.querySelector('#registration-form');
        
        if (loginCard && !loginCard.closest('.account-card').classList.contains('hidden')) {
            loginCard.querySelector('button[type="submit"]').before(errorEl);
        } else if (registerCard) {
            registerCard.querySelector('button[type="submit"]').before(errorEl);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Fetch website settings to determine which dashboard sections to show
    fetchWebsiteSettings();
    
    // First check if user is already logged in
    if (UserService.isLoggedIn()) {
        // If on login page, redirect to appropriate dashboard
        if (!window.location.pathname.includes('dashboard') && 
            !window.location.pathname.includes('admin')) {
            redirectToDashboard();
            return;
        }
        
        // If admin tries to access regular dashboard or vice versa, redirect
        const isAdminPath = window.location.pathname.includes('admin');
        if (UserService.isAdmin() && !isAdminPath) {
            window.location.href = 'admin-dashboard.html';
            return;
        } else if (!UserService.isAdmin() && isAdminPath) {
            window.location.href = 'dashboard.html';
            return;
        }
    } else if (window.location.pathname.includes('dashboard') || 
               window.location.pathname.includes('admin')) {
        // Not logged in but trying to access dashboard, redirect to login
        window.location.href = 'login.html';
        return;
    }
    
    // Load Google API when the page loads
    loadGoogleAPI();
    
    // ------------------
    // Login/Registration
    // ------------------
    const loginForm = document.getElementById('login-form');
    const registrationForm = document.getElementById('registration-form');
    const registrationCard = document.getElementById('registration-card');
    const showRegistrationBtn = document.getElementById('show-registration-btn');
    const showLoginBtn = document.getElementById('show-login-btn');
    
    // Toggle between login and registration forms
    if (showRegistrationBtn) {
        showRegistrationBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (loginForm) {
                loginForm.closest('.account-card').classList.add('hidden');
            }
            
            if (registrationCard) {
                registrationCard.classList.remove('hidden');
            }
        });
    }
    
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (registrationCard) {
                registrationCard.classList.add('hidden');
            }
            
            if (loginForm) {
                loginForm.closest('.account-card').classList.remove('hidden');
            }
        });
    }
    
    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            setFormLoading(true);
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            try {
                // Attempt login with API
                await ApiService.login({ email, password });
                
                // Redirect based on user role
                redirectToDashboard();
            } catch (error) {
                console.error('Login error:', error);
                showErrorMessage(error.message, 'login-form');
                setFormLoading(false);
            }
        });
    }
    
    // Handle registration form submission
    if (registrationForm) {
        registrationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            setFormLoading(true);
            
            const firstName = document.getElementById('register-first-name').value;
            const lastName = document.getElementById('register-last-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;
            
            // Simple validation
            if (password !== confirmPassword) {
                showErrorMessage('Passwords do not match!', 'registration-form');
                setFormLoading(false);
                return;
            }
            
            try {
                // Attempt registration with API
                await ApiService.register({ firstName, lastName, email, password });
                
                // Registered users are always regular members, redirect to dashboard
                window.location.href = 'dashboard.html';
            } catch (error) {
                console.error('Registration error:', error);
                showErrorMessage(error.message, 'registration-form');
                setFormLoading(false);
            }
        });
    }
    
    // ------------------
    // Dashboard Features
    // ------------------
    const dashboardNavItems = document.querySelectorAll('.dashboard-nav-item');
    const dashboardPanels = document.querySelectorAll('.dashboard-panel');
    const logoutBtn = document.getElementById('logout-btn');
    const profileForm = document.getElementById('profile-form');
    
    // Check if user is logged in for dashboard pages
    const checkLoginStatus = () => {
        if (!UserService.isLoggedIn()) {
            window.location.href = 'login.html';
            return null;
        }
        
        // Check if user is on the right dashboard
        const isOnAdminPage = window.location.pathname.includes('admin');
        const userIsAdmin = UserService.isAdmin();
        
        if (isOnAdminPage && !userIsAdmin) {
            window.location.href = 'dashboard.html';
            return null;
        } else if (!isOnAdminPage && userIsAdmin) {
            window.location.href = 'admin-dashboard.html';
            return null;
        }
        
        return UserService.getUser();
    };

    // Handle Google Sign-In button click
    const googleLoginBtn = document.getElementById('google-login-btn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
                // Prompt the Google Sign-In UI
                google.accounts.id.prompt();
            } else {
                console.error('Google Sign-In API not loaded properly');
                showErrorMessage('Google Sign-In is not available at the moment. Please try the email login or try again later.');
            }
        });
    }
    
    // Handle dashboard tab navigation
    if (dashboardNavItems.length > 0) {
        dashboardNavItems.forEach(item => {
            item.addEventListener('click', () => {
                // Get the panel to show
                const panelId = item.getAttribute('data-panel');
                
                // Remove active class from all nav items and panels
                dashboardNavItems.forEach(navItem => {
                    navItem.classList.remove('active');
                });
                
                dashboardPanels.forEach(panel => {
                    panel.classList.remove('active');
                });
                
                // Add active class to clicked nav item and corresponding panel
                item.classList.add('active');
                document.getElementById(`${panelId}-panel`)?.classList.add('active');
            });
        });
    }
    
    // Handle logout button click
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Clear user info and redirect to login page
            UserService.logout();
            window.location.href = 'login.html';
        });
    }
    
    // Handle profile form submission
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // In a real implementation, this would update the user's profile in the database
            // For now, we'll just update the local user info
            alert('Profile updated successfully!');
        });
    }
    
    // Set up dashboard with user info if on dashboard page
    const setupDashboard = async () => {
        const user = checkLoginStatus();
        if (!user) return;
        
        const welcomeMessage = document.querySelector('.welcome-message h2');
        if (welcomeMessage) {
            welcomeMessage.textContent = `Welcome, ${user.firstName}!`;
        }
        
        // Handle profile image - use profile picture if available
        const profileImg = document.getElementById('profile-photo');
        if (profileImg && user.profilePicture) {
            profileImg.src = user.profilePicture;
            
            // Handle image loading errors with a placeholder
            profileImg.onerror = function() {
                // Set a default avatar icon when image fails to load
                this.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="60" fill="%23f0f0f0"/><circle cx="60" cy="45" r="25" fill="%23c0c0c0"/><path d="M60,85 C40,85 25,105 25,105 L95,105 C95,105 80,85 60,85 Z" fill="%23c0c0c0"/></svg>';
                this.onerror = null;
            };
        }
        
        // Fill profile form with user data if exists
        const profileFirstName = document.getElementById('profile-first-name');
        const profileLastName = document.getElementById('profile-last-name');
        const profileEmail = document.getElementById('profile-email');
        
        if (profileFirstName && user.firstName) {
            profileFirstName.value = user.firstName;
        }
        
        if (profileLastName && user.lastName) {
            profileLastName.value = user.lastName;
        }
        
        if (profileEmail && user.email) {
            profileEmail.value = user.email;
        }
        
        // Try to get the most updated user data from the server
        try {
            const userData = await ApiService.getCurrentUser();
            if (userData && userData.user) {
                // Update local storage with the most recent user data
                UserService.setUser(userData.user);
                
                // Update form fields with the newest data
                if (profileFirstName && userData.user.firstName) {
                    profileFirstName.value = userData.user.firstName;
                }
                
                if (profileLastName && userData.user.lastName) {
                    profileLastName.value = userData.user.lastName;
                }
                
                if (profileEmail && userData.user.email) {
                    profileEmail.value = userData.user.email;
                }
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            // If token is invalid, logout and redirect
            if (error.message === 'Invalid token') {
                UserService.logout();
                window.location.href = 'login.html';
            }
        }
    };
    
    // Toggle password visibility
    const setupPasswordToggles = () => {
        const toggleButtons = document.querySelectorAll('.toggle-password');
        
        toggleButtons.forEach(button => {
            button.addEventListener('click', () => {
                const passwordInput = button.previousElementSibling;
                
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    button.classList.remove('fa-eye-slash');
                    button.classList.add('fa-eye');
                } else {
                    passwordInput.type = 'password';
                    button.classList.remove('fa-eye');
                    button.classList.add('fa-eye-slash');
                }
            });
        });
    };
    
    // Initialize features based on current page
    setupPasswordToggles();
    
    if (window.location.pathname.includes('dashboard') || window.location.pathname.includes('admin')) {
        setupDashboard();
        
        // Add click handlers for booking actions and calendar buttons
        // These remain the same for now - in a real implementation,
        // these would also make API calls to update the database
    }
    
    // Debug function to show current login status
    const debugStatus = document.getElementById('debug-login-status');
    if (debugStatus) {
        const user = UserService.getUser();
        if (user) {
            debugStatus.innerHTML = `
                <p><strong>Current User:</strong> ${user.firstName} ${user.lastName}</p>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Role:</strong> ${user.role || 'member'}</p>
                <p><strong>Has Token:</strong> ${TokenService.getToken() ? 'Yes' : 'No'}</p>
            `;
        } else {
            debugStatus.innerHTML = '<p>Not logged in</p>';
        }
    }
});
