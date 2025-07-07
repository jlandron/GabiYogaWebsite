/// Auth state
let currentUser = null;

/// Show login form modal
function showLoginForm() {
  const modal = document.createElement('div');
  modal.className = 'auth-modal';
  modal.innerHTML = `
    <div class="auth-modal-content">
      <div class="auth-modal-header">
        <h2>Login</h2>
        <button class="auth-modal-close" onclick="closeAuthModal()">&times;</button>
      </div>
      <div class="auth-modal-body">
        <form id="login-form" onsubmit="handleLogin(event)">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required>
          </div>
          <div class="auth-error" id="login-error"></div>
          <div class="auth-actions">
            <button type="submit" class="btn" id="login-btn"><span>Login</span></button>
            <button type="button" class="btn btn-outline" onclick="showRegisterForm()">Register</button>
          </div>
          <div class="forgot-password-link">
            <a href="#" onclick="showForgotPasswordForm(); return false;">Forgot Password?</a>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Add styles
  const styles = document.createElement('style');
  styles.textContent = `
    .auth-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    
    .auth-modal-content {
      background: white;
      border-radius: 15px;
      width: 100%;
      max-width: 400px;
      animation: modalSlideIn 0.3s ease;
    }
    
    .auth-modal-header {
      padding: 1.5rem;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .auth-modal-header h2 {
      margin: 0;
      font-size: 1.5rem;
    }
    
    .auth-modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #666;
    }
    
    .auth-modal-body {
      padding: 1.5rem;
    }
    
    .form-group {
      margin-bottom: 1rem;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    
    .form-group input {
      width: 100%;
      padding: 0.8rem;
      border: 1px solid #ddd;
      border-radius: 5px;
      font-size: 1rem;
    }
    
    .auth-error {
      color: var(--color-danger);
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }
    
    .auth-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }
    
    .forgot-password-link {
      margin-top: 1rem;
      text-align: center;
      font-size: 0.9rem;
    }
    
    .forgot-password-link a {
      color: var(--color-primary);
      text-decoration: none;
    }
    
    .forgot-password-link a:hover {
      text-decoration: underline;
    }
  `;
  document.head.appendChild(styles);
}

/// Show register form modal
function showRegisterForm() {
  const modal = document.querySelector('.auth-modal');
  if (!modal) return;
  
  modal.innerHTML = `
    <div class="auth-modal-content">
      <div class="auth-modal-header">
        <h2>Register</h2>
        <button class="auth-modal-close" onclick="closeAuthModal()">&times;</button>
      </div>
      <div class="auth-modal-body">
        <form id="register-form" onsubmit="handleRegister(event)">
          <div class="form-group">
            <label for="firstName">First Name</label>
            <input type="text" id="firstName" name="firstName" required>
          </div>
          <div class="form-group">
            <label for="lastName">Last Name</label>
            <input type="text" id="lastName" name="lastName" required>
          </div>
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required minlength="8">
          </div>
          <div class="auth-error" id="register-error"></div>
          <div class="auth-actions">
            <button type="button" class="btn btn-outline" onclick="showLoginForm()">Back to Login</button>
            <button type="submit" class="btn" id="register-btn"><span>Register</span></button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/// Close auth modal
function closeAuthModal() {
  const modal = document.querySelector('.auth-modal');
  if (modal) {
    modal.remove();
  }
}

/// Handle login form submission
async function handleLogin(event) {
  event.preventDefault();
  
  const email = event.target.email.value;
  const password = event.target.password.value;
  const errorEl = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');
  
  // Add loading state
  loginBtn.classList.add('btn-loading');
  loginBtn.innerHTML = '<span>Logging in...</span><div class="loading-spinner"></div>';
  loginBtn.disabled = true;
  
  try {
    console.log('Attempting login...');
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors',
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Update UI
      currentUser = data.user;
      updateAuthUI();
      
      // Log success
      console.log('Login successful:', data.user);
      
      // Close modal
      closeAuthModal();
      
      // Refresh page to update content
      window.location.reload();
    } else {
      errorEl.textContent = data.message || 'Invalid email or password';
    }
  } catch (error) {
    console.error('Login error:', error);
    errorEl.textContent = 'An error occurred. Please try again.';
  } finally {
    // Remove loading state
    loginBtn.classList.remove('btn-loading');
    loginBtn.innerHTML = '<span>Login</span>';
    loginBtn.disabled = false;
  }
}

/// Handle register form submission
async function handleRegister(event) {
  event.preventDefault();
  
  const firstName = event.target.firstName.value;
  const lastName = event.target.lastName.value;
  const email = event.target.email.value;
  const password = event.target.password.value;
  const errorEl = document.getElementById('register-error');
  const registerBtn = document.getElementById('register-btn');
  
  // Add loading state
  registerBtn.classList.add('btn-loading');
  registerBtn.innerHTML = '<span>Registering...</span><div class="loading-spinner"></div>';
  registerBtn.disabled = true;
  
  try {
    console.log('Attempting registration...');
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors',
      body: JSON.stringify({ firstName, lastName, email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Show success message
      errorEl.style.color = 'var(--color-success)';
      errorEl.textContent = 'Registration successful! Please login.';
      
      // Switch to login form after 2 seconds
      setTimeout(() => {
        showLoginForm();
      }, 2000);
    } else {
      errorEl.textContent = data.message || 'Registration failed';
    }
  } catch (error) {
    console.error('Registration error:', error);
    errorEl.textContent = 'An error occurred. Please try again.';
  } finally {
    // Remove loading state
    registerBtn.classList.remove('btn-loading');
    registerBtn.innerHTML = '<span>Register</span>';
    registerBtn.disabled = false;
  }
}

/// Update auth UI based on current user
function updateAuthUI() {
  const authButtons = document.getElementById('auth-buttons');
  if (!authButtons) return;
  
  if (currentUser) {
    authButtons.innerHTML = `
      <button class="btn btn-outline" onclick="handleLogout()">Logout</button>
    `;
  } else {
    authButtons.innerHTML = `
      <button class="btn btn-outline" onclick="showLoginForm()">Login</button>
    `;
  }
}

/// Handle logout
async function handleLogout() {
  try {
    console.log('Logging out...');
    const response = await fetch('/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors'
    });
    
    const data = await response.json();
    console.log('Logout response:', data);
    
    if (data.success) {
      // Clear auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      currentUser = null;
      console.log('Auth data cleared');
      
      // Update UI
      updateAuthUI();
      
      // Refresh page to update content
      window.location.reload();
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
}

/// Check auth status on page load
async function checkAuthStatus() {
  const token = localStorage.getItem('token');
  if (!token) return;
  
  try {
    console.log('Verifying auth token...');
    const response = await fetch('/auth/verify-token', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors'
    });
    
    const data = await response.json();
    console.log('Token verification response:', data);
    
    if (data.success) {
      // Load stored user data
      const storedUser = localStorage.getItem('user');
      currentUser = storedUser ? JSON.parse(storedUser) : data.user;
      console.log('Current user:', currentUser);
      updateAuthUI();
    } else {
      // Token invalid, clear it
      console.error('Token invalid, clearing auth data');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  } catch (error) {
    console.error('Auth check error:', error);
  }
}

/// Initialize auth
document.addEventListener('DOMContentLoaded', checkAuthStatus);

/// Close modal when clicking outside
document.addEventListener('click', (e) => {
  const modal = document.querySelector('.auth-modal');
  if (e.target === modal) {
    closeAuthModal();
  }
});

/// Show forgot password form
function showForgotPasswordForm() {
  const modal = document.querySelector('.auth-modal');
  if (!modal) return;
  
  modal.innerHTML = `
    <div class="auth-modal-content">
      <div class="auth-modal-header">
        <h2>Forgot Password</h2>
        <button class="auth-modal-close" onclick="closeAuthModal()">&times;</button>
      </div>
      <div class="auth-modal-body">
        <form id="forgot-form" onsubmit="handleForgotPassword(event)">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
          </div>
          <div class="auth-error" id="forgot-error"></div>
          <div class="auth-actions">
            <button type="button" class="btn btn-outline" onclick="showLoginForm()">Back to Login</button>
            <button type="submit" class="btn" id="forgot-btn"><span>Reset Password</span></button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/// Handle forgot password form submission
async function handleForgotPassword(event) {
  event.preventDefault();
  
  const email = event.target.email.value;
  const errorEl = document.getElementById('forgot-error');
  const forgotBtn = document.getElementById('forgot-btn');
  
  // Add loading state
  forgotBtn.classList.add('btn-loading');
  forgotBtn.innerHTML = '<span>Processing...</span><div class="loading-spinner"></div>';
  forgotBtn.disabled = true;
  
  try {
    console.log('Sending password reset request...');
    const response = await fetch('/auth/forgot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors',
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    // Always show success message for security (to prevent user enumeration)
    errorEl.style.color = 'var(--color-success)';
    errorEl.textContent = data.message || 'If your email exists in our system, you will receive password reset instructions shortly.';
    
    // Disable the form fields after submission
    const emailInput = document.getElementById('email');
    if (emailInput) {
      emailInput.disabled = true;
    }
    
    // Show back to login button after 3 seconds
    setTimeout(() => {
      showLoginForm();
    }, 3000);
    
  } catch (error) {
    console.error('Password reset error:', error);
    errorEl.textContent = 'An error occurred. Please try again.';
  } finally {
    // Remove loading state
    forgotBtn.classList.remove('btn-loading');
    forgotBtn.innerHTML = '<span>Reset Password</span>';
    forgotBtn.disabled = true; // Keep disabled to prevent multiple submissions
  }
}

/// Close modal on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAuthModal();
  }
});
