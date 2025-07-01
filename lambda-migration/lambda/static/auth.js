// Auth state
let currentUser = null;

// Show login form modal
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
            <button type="submit" class="btn">Login</button>
            <button type="button" class="btn btn-outline" onclick="showRegisterForm()">Register</button>
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
  `;
  document.head.appendChild(styles);
}

// Show register form modal
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
            <label for="name">Full Name</label>
            <input type="text" id="name" name="name" required>
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
            <button type="submit" class="btn">Register</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// Close auth modal
function closeAuthModal() {
  const modal = document.querySelector('.auth-modal');
  if (modal) {
    modal.remove();
  }
}

// Handle login form submission
async function handleLogin(event) {
  event.preventDefault();
  
  const email = event.target.email.value;
  const password = event.target.password.value;
  const errorEl = document.getElementById('login-error');
  
  try {
    const response = await fetch('/dev/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      mode: 'cors',
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store token
      localStorage.setItem('token', data.token);
      
      // Update UI
      currentUser = data.user;
      updateAuthUI();
      
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
  }
}

// Handle register form submission
async function handleRegister(event) {
  event.preventDefault();
  
  const name = event.target.name.value;
  const email = event.target.email.value;
  const password = event.target.password.value;
  const errorEl = document.getElementById('register-error');
  
  try {
    const response = await fetch('/dev/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      mode: 'cors',
      body: JSON.stringify({ name, email, password })
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
  }
}

// Update auth UI based on current user
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

// Handle logout
async function handleLogout() {
  try {
    const response = await fetch('/dev/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      mode: 'cors'
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Clear token and user
      localStorage.removeItem('token');
      currentUser = null;
      
      // Update UI
      updateAuthUI();
      
      // Refresh page to update content
      window.location.reload();
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Check auth status on page load
async function checkAuthStatus() {
  const token = localStorage.getItem('token');
  if (!token) return;
  
  try {
    const response = await fetch('/dev/auth/verify-token', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      mode: 'cors'
    });
    
    const data = await response.json();
    
    if (data.success) {
      currentUser = data.user;
      updateAuthUI();
    } else {
      // Token invalid, clear it
      localStorage.removeItem('token');
    }
  } catch (error) {
    console.error('Auth check error:', error);
  }
}

// Initialize auth
document.addEventListener('DOMContentLoaded', checkAuthStatus);

// Close modal when clicking outside
document.addEventListener('click', (e) => {
  const modal = document.querySelector('.auth-modal');
  if (e.target === modal) {
    closeAuthModal();
  }
});

// Close modal on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAuthModal();
  }
});
