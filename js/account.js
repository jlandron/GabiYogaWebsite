/**
 * Gabi Jyoti Yoga - Account & Dashboard JavaScript
 * Handles login, registration, and dashboard functionality
 * Integrates with SQLite database through backend API
 */

// API endpoints
const API_BASE_URL = '/api';
const API_ENDPOINTS = {
  login: `${API_BASE_URL}/auth/login`,
  register: `${API_BASE_URL}/auth/register`,
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
    if (privateSessionsTab && !toggles.privateSessionsSection) {
      privateSessionsTab.style.display = 'none';
      if (privateSessionsPanel) privateSessionsPanel.style.display = 'none';
    }
    
    // If the active tab is one that's now hidden, switch to the bookings tab
    const activeTab = document.querySelector('.dashboard-nav-item.active');
    if (
      activeTab && 
      ((activeTab.getAttribute('data-panel') === 'workshops' && !toggles.workshops) ||
       (activeTab.getAttribute('data-panel') === 'retreats' && !toggles.retreats) ||
       (activeTab.getAttribute('data-panel') === 'private-sessions' && !toggles.privateSessionsSection))
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
  
  // Always go to admin dashboard for admins
  if (UserService.isAdmin()) {
    window.location.href = 'admin-dashboard.html';
    return;
  }
  
  // For regular users, check for valid redirect
  if (redirectParam) {
    // First check if it's a valid page to redirect to (not login-related)
    const isLoginRelatedPage = 
      redirectParam.startsWith('login.html') || 
      redirectParam.startsWith('index.html') ||
      redirectParam.startsWith('forgot-password.html') || 
      redirectParam.startsWith('reset-password.html');
      
    if (!isLoginRelatedPage) {
      // Decode the redirect URL and navigate
      try {
        const decodedRedirect = decodeURIComponent(redirectParam);
        console.log(`Redirecting to: ${decodedRedirect}`);
        window.location.href = decodedRedirect;
        return;
      } catch (e) {
        console.error('Error decoding redirect URL:', e);
        // Fall through to default redirect
      }
    }
  }
  
  // Default fallback for regular users with no valid redirect
  window.location.href = 'dashboard.html';
};

// API service with fetch wrappers
const ApiService = {
  // Track pending requests to prevent concurrent duplicates
  pendingRequests: {},

  /**
   * Make authenticated requests with deduplication
   */
  authRequest: async (url, method = 'GET', data = null) => {
    // Create a request key to identify duplicate calls
    const requestKey = `${method}:${url}:${data ? JSON.stringify(data) : 'nobody'}`;
    
    // If this exact request is already pending, return the promise
    if (ApiService.pendingRequests[requestKey]) {
      console.log('ApiService: Reusing pending request:', requestKey);
      return ApiService.pendingRequests[requestKey];
    }
    
    // Create request headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TokenService.getToken()}`
    };

    const options = {
      method,
      headers
      // No longer using credentials: 'include' to avoid mixing auth approaches
      // We're standardizing on JWT tokens in the Authorization header
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    // Create and store the request promise
    ApiService.pendingRequests[requestKey] = (async () => {
      try {
        const response = await fetch(url, options);
        const json = await response.json();

        if (!response.ok) {
          throw new Error(json.message || 'An error occurred');
        }

        return json;
      } catch (error) {
        console.error(`API Error (${method} ${url}):`, error);
        throw error;
      } finally {
        // Always delete the pending request reference
        delete ApiService.pendingRequests[requestKey];
      }
    })();
    
    return ApiService.pendingRequests[requestKey];
  },

  /**
   * Make login request - Using JWT token approach with race condition protection
   */
  login: async (credentials) => {
    // Create a request key to identify duplicate calls
    const requestKey = `POST:${API_ENDPOINTS.login}:${JSON.stringify(credentials)}`;
    
    // If this exact login request is already pending, return the promise
    if (ApiService.pendingRequests[requestKey]) {
      console.log('ApiService: Reusing pending login request');
      return ApiService.pendingRequests[requestKey];
    }
    
    // Create and store the login promise
    ApiService.pendingRequests[requestKey] = (async () => {
      try {
        // For initial login, we still need to include credentials for backward compatibility
        // as the server may use session authentication during the login process
        const response = await fetch(API_ENDPOINTS.login, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include', // Only needed for login endpoint
          body: JSON.stringify(credentials)
        });

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json.message || 'Invalid credentials');
        }

        // Handle token-based auth with Passport
        if (json.data && json.data.token && json.data.user) {
          TokenService.setToken(json.data.token);
          UserService.setUser(json.data.user);
        } else if (json.token && json.user) {
          // Backward compatibility with old response format
          TokenService.setToken(json.token);
          UserService.setUser(json.user);
        }

        return json;
      } finally {
        // Always delete the pending request reference
        delete ApiService.pendingRequests[requestKey];
      }
    })();
    
    return ApiService.pendingRequests[requestKey];
  },

  /**
   * Make registration request - Using JWT token approach
   */
  register: async (userData) => {
    try {
      // For registration, we still need to include credentials for backward compatibility
      const response = await fetch(API_ENDPOINTS.register, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Only needed for registration endpoint
        body: JSON.stringify(userData)
      });

      const json = await response.json();

      if (!response.ok) {
        // Include any additional error details from server
        const errorMsg = json.message || 'Registration failed';
        const detailMsg = json.error ? `: ${json.error}` : '';
        throw new Error(`${errorMsg}${detailMsg}`);
      }

      // Handle token-based auth with Passport
      if (json.data && json.data.token && json.data.user) {
        TokenService.setToken(json.data.token);
        UserService.setUser(json.data.user);
      } else if (json.token && json.user) {
        // Backward compatibility with old response format
        TokenService.setToken(json.token);
        UserService.setUser(json.user);
      }

      return json;
    } catch (error) {
      console.error('Registration API error:', error);
      throw error;
    }
  },

  /**
   * Get current user profile - Using JWT token approach
   */
  getCurrentUser: async () => {
    try {
      const response = await fetch(API_ENDPOINTS.me, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TokenService.getToken()}`
        }
        // No longer including credentials to avoid mixing authentication approaches
      });
      
      const json = await response.json();
      
      if (!response.ok) {
        throw new Error(json.message || 'Failed to get user data');
      }
      
      // Update stored user data with the most recent from server
      if (json.data && json.data.user) {
        UserService.setUser(json.data.user);
        return { user: json.data.user };
      } else if (json.user) {
        // Backward compatibility with old response format
        UserService.setUser(json.user);
        return { user: json.user };
      }
      
      return json;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }
};

// Show loading state on buttons
function setFormLoading(isLoading, buttonId = null) {
    const loginBtn = document.querySelector('#login-form button[type="submit"]');
    const registerBtn = document.querySelector('#registration-form button[type="submit"]');
    
    const buttons = [loginBtn, registerBtn].filter(btn => btn);
    
    if (buttonId) {
        const specificBtn = document.getElementById(buttonId);
        if (specificBtn) {
            specificBtn.disabled = isLoading;
            
            if (isLoading) {
                specificBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            } else {
                specificBtn.innerHTML = (buttonId === 'register-btn' ? 'Create Account' : 'Sign In');
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
        // Only redirect if on the login page specifically
        if (window.location.pathname.includes('login.html')) {
            redirectToDashboard();
            return;
        }
        
        // If admin tries to access regular dashboard or vice versa, redirect
        const isAdminPath = window.location.pathname.includes('admin');
        if (UserService.isAdmin() && !isAdminPath && (window.location.pathname.includes('dashboard'))) {
            window.location.href = 'admin-dashboard.html';
            return;
        } else if (!UserService.isAdmin() && isAdminPath) {
            window.location.href = 'dashboard.html';
            return;
        }
    } else if (window.location.pathname.includes('dashboard') || 
               window.location.pathname.includes('admin')) {
        // Not logged in but trying to access dashboard, redirect to homepage
        window.location.href = 'index.html';
        return;
    }
    
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
                // Check if user has agreed to terms & conditions
                const termsAgreed = document.getElementById('terms-agree').checked;
                if (!termsAgreed) {
                    showErrorMessage('You must agree to the Terms & Conditions to create an account.', 'registration-form');
                    setFormLoading(false);
                    return;
                }
                
                // Attempt registration with API
                await ApiService.register({ firstName, lastName, email, password });
                
                // Registered users are always regular members, redirect to dashboard
                window.location.href = 'dashboard.html';
            } catch (error) {
                console.error('Registration error:', error);
                showErrorMessage(error.message || 'An error occurred during registration', 'registration-form');
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
            
            // Always use AuthHandler's logout to ensure consistency across the site
            if (typeof AuthHandler === 'object' && typeof AuthHandler.logout === 'function') {
                AuthHandler.logout();
            } else {
                console.warn('AuthHandler not available, falling back to basic logout');
                // Make server logout request
                try {
                    fetch(`${API_BASE_URL}/auth/logout`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${TokenService.getToken()}`,
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include'
                    }).catch(err => console.warn('Logout request error:', err));
                } finally {
                    // Always clear token and redirect regardless of server response
                    UserService.logout();
                    window.location.href = 'index.html';
                }
            }
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
        
        // Setup payment handlers for membership purchases
        setupPaymentHandlers();
    };
    
    // Set up payment handlers for memberships and packages
    const setupPaymentHandlers = () => {
        // One-time purchase handlers (class packs, workshops, etc.)
        const purchaseButtons = document.querySelectorAll('.membership-actions button[title="Purchase More Classes"]');
        purchaseButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Get membership details from parent container
                const membershipItem = this.closest('.membership-item');
                const title = membershipItem.querySelector('.membership-title').textContent;
                
                // Open purchase modal
                openPurchaseModal(title, '150.00', 'Class Pack');
            });
        });
        
        // Subscription handlers for memberships
        const manageBillingButtons = document.querySelectorAll('.membership-actions button[title="Manage Billing"]');
        manageBillingButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Get membership details from parent container
                const membershipItem = this.closest('.membership-item');
                const title = membershipItem.querySelector('.membership-title').textContent;
                const priceInfo = membershipItem.querySelector('.membership-info span:nth-child(3)').textContent;
                
                // Extract price from the displayed text (e.g. "$120/month")
                const priceMatch = priceInfo.match(/\$(\d+(\.\d+)?)/);
                const price = priceMatch ? priceMatch[1] : '120.00';
                
                // Open subscription modal
                openSubscriptionModal(title, price);
            });
        });
        
        // Workshop registration buttons
        const workshopRegisterButtons = document.querySelectorAll('.workshop-actions a[data-workshop]');
        workshopRegisterButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Get workshop details
                const workshopItem = this.closest('.workshop-item');
                const title = workshopItem.querySelector('.workshop-title').textContent;
                const priceInfo = workshopItem.querySelector('.workshop-info span:last-child').textContent;
                
                // Extract price from the displayed text (e.g. "$45 ($40 for members)")
                const priceMatch = priceInfo.match(/\$(\d+)/);
                const price = priceMatch ? priceMatch[1] : '45.00';
                
                // Open purchase modal for workshop
                openPurchaseModal(title, price, 'Workshop');
            });
        });
        
        // Retreat registration buttons
        const retreatRegisterButtons = document.querySelectorAll('.retreat-actions a:nth-child(2)');
        retreatRegisterButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Get retreat details
                const retreatItem = this.closest('.retreat-item');
                const title = retreatItem.querySelector('.retreat-title').textContent;
                const priceInfo = retreatItem.querySelector('.retreat-info span:last-child').textContent;
                
                // Extract price from the displayed text (e.g. "From $1,200")
                const priceMatch = priceInfo.match(/\$([0-9,]+)/);
                const priceText = priceMatch ? priceMatch[1].replace(',', '') : '1200';
                
                // Open purchase modal for retreat with deposit amount (usually 25%)
                const depositAmount = (parseFloat(priceText) * 0.25).toFixed(2);
                openPurchaseModal(`${title} - Deposit`, depositAmount, 'Retreat Deposit');
            });
        });
        
        // Private session booking buttons
        const sessionBookButtons = document.querySelectorAll('.session-packages .btn-small');
        sessionBookButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Get session package details
                const packageItem = this.closest('.session-package-item');
                const title = packageItem.querySelector('.package-name').textContent;
                const price = packageItem.querySelector('.package-price').textContent.substring(1);
                
                // Open purchase modal
                openPurchaseModal(title, price, 'Private Session');
            });
        });
        
        // Set up close functionality for modals
        setupModalCloseFunctionality();
    };
    
    // Open purchase modal with item details
    const openPurchaseModal = (title, price, type) => {
        // Get modal and form elements
        const modal = document.getElementById('purchase-modal');
        const form = document.getElementById('purchase-form');
        
        if (!modal || !form) {
            console.error('Purchase modal or form not found');
            return;
        }
        
        // Set form values
        document.getElementById('purchase-type').value = `${type}: ${title}`;
        document.getElementById('purchase-price').value = `$${price}`;
        
        // Pre-fill user information if available
        const user = UserService.getUser();
        if (user) {
            const nameField = document.getElementById('purchase-name');
            const emailField = document.getElementById('purchase-email');
            const phoneField = document.getElementById('purchase-phone');
            
            if (nameField) nameField.value = `${user.firstName} ${user.lastName}`;
            if (emailField) emailField.value = user.email || '';
            if (phoneField && user.phone) phoneField.value = user.phone;
        }
        
        // Initialize Stripe payment element
        if (window.stripePaymentHandler) {
            window.stripePaymentHandler.setupOneTimePayment(price, `${type}: ${title}`);
        }
        
        // Show the modal
        modal.style.display = 'block';
    };
    
    // Open subscription modal with membership details
    const openSubscriptionModal = (title, price) => {
        // Get modal and form elements
        const modal = document.getElementById('subscription-modal');
        const form = document.getElementById('subscription-form');
        
        if (!modal || !form) {
            console.error('Subscription modal or form not found');
            return;
        }
        
        // Set form values
        document.getElementById('subscription-type').value = title;
        document.getElementById('subscription-price').value = `$${price}/month`;
        
        // Set start date to today
        const startDateInput = document.getElementById('subscription-start');
        if (startDateInput) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            startDateInput.value = `${yyyy}-${mm}-${dd}`;
        }
        
        // Pre-fill user information if available
        const user = UserService.getUser();
        if (user) {
            const nameField = document.getElementById('subscription-name');
            const emailField = document.getElementById('subscription-email');
            const phoneField = document.getElementById('subscription-phone');
            
            if (nameField) nameField.value = `${user.firstName} ${user.lastName}`;
            if (emailField) emailField.value = user.email || '';
            if (phoneField && user.phone) phoneField.value = user.phone;
        }
        
        // Show the modal
        modal.style.display = 'block';
    };
    
    // Set up modal close functionality
    const setupModalCloseFunctionality = () => {
        // Get all modals
        const modals = document.querySelectorAll('.modal');
        
        // Add click event for closing modals
        window.addEventListener('click', function(event) {
            modals.forEach(modal => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
        
        // Add click event for close buttons
        const closeButtons = document.querySelectorAll('.close-modal');
        closeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const modal = this.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });
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
