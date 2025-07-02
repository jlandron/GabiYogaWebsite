// Get auth headers for API requests
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/dev/login.html';
        return;
    }
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/dev/login.html';
            return;
        }

        const response = await fetch('/dev/auth/verify-token', {
            method: 'GET',
            headers: getAuthHeaders(),
            credentials: 'include'
        });
        
        if (!response.ok) {
            window.location.href = '/dev/login.html';
            return;
        }

        // Initialize dashboard
        loadDashboardData();
        setupEventListeners();
        loadUserProfile();
    } catch (error) {
        console.error('Authentication error:', error);
        window.location.href = '/dev/login.html';
    }
});

// Setup Event Listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('[data-section]').forEach(element => {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToSection(e.target.dataset.section);
        });
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Profile form
    document.getElementById('save-profile').addEventListener('click', saveProfile);

    // History filters
    document.getElementById('month-filter').addEventListener('change', loadClassHistory);
    document.getElementById('type-filter').addEventListener('change', loadClassHistory);
}

// Navigation
function navigateToSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.user-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    document.getElementById(`${sectionId}-section`).classList.add('active');

    // Update navigation active state
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionId) {
            link.classList.add('active');
        }
    });

    // Load section data
    switch (sectionId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'upcoming':
            loadUpcomingClasses();
            break;
        case 'history':
            loadClassHistory();
            break;
        case 'profile':
            loadUserProfile();
            break;
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        // Load upcoming classes count
        const upcomingResponse = await fetch('/dev/bookings?type=upcoming', {
            headers: getAuthHeaders()
        });
        const upcomingData = await upcomingResponse.json();
        document.getElementById('upcoming-count').textContent = upcomingData.length;

        // Load attended classes count
        const historyResponse = await fetch('/dev/bookings?type=past', {
            headers: getAuthHeaders()
        });
        const historyData = await historyResponse.json();
        document.getElementById('attended-count').textContent = historyData.length;

        // Load next class
        if (upcomingData.length > 0) {
            const nextClass = upcomingData[0];
            document.getElementById('next-class').innerHTML = `
                <h4>${nextClass.className}</h4>
                <p>${formatDate(nextClass.date)} at ${nextClass.time}</p>
                <p>with ${nextClass.instructor}</p>
            `;
        } else {
            document.getElementById('next-class').innerHTML = `
                <p>No upcoming classes</p>
                <button onclick="navigateToSection('upcoming')">Book a Class</button>
            `;
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Load Upcoming Classes
async function loadUpcomingClasses() {
    try {
        // Load available classes
        const classesResponse = await fetch('/dev/classes', {
            headers: getAuthHeaders()
        });
        const classes = await classesResponse.json();
        
        // Load user's bookings
        const bookingsResponse = await fetch('/dev/bookings?type=upcoming', {
            headers: getAuthHeaders()
        });
        const bookings = await bookingsResponse.json();
        
        // Update calendar
        updateCalendar(classes, bookings);
        
        // Update registered classes list
        const classList = document.querySelector('.class-list');
        const bookingsList = Array.isArray(bookings) ? bookings : [];
        classList.innerHTML = bookingsList.map(booking => `
            <div class="class-item">
                <div class="class-info">
                    <h3>${booking.className}</h3>
                    <p>${formatDate(booking.date)} at ${booking.time}</p>
                    <p>with ${booking.instructor}</p>
                </div>
                <div class="class-actions">
                    <button onclick="cancelBooking('${booking.id}')" class="cancel-btn">Cancel</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading upcoming classes:', error);
    }
}

// Load Class History
async function loadClassHistory() {
    try {
        const monthFilter = document.getElementById('month-filter').value;
        const typeFilter = document.getElementById('type-filter').value;
        
        const response = await fetch(`/dev/bookings?type=past&month=${monthFilter}&classType=${typeFilter}`, {
            headers: getAuthHeaders()
        });
        const history = await response.json();
        
        const historyList = document.querySelector('.history-list');
        const historyItems = Array.isArray(history) ? history : [];
        historyList.innerHTML = historyItems.map(booking => `
            <div class="class-item">
                <div class="class-info">
                    <h3>${booking.className}</h3>
                    <p>${formatDate(booking.date)} at ${booking.time}</p>
                    <p>with ${booking.instructor}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading class history:', error);
    }
}

// Load User Profile
async function loadUserProfile() {
    try {
        const response = await fetch('/dev/auth/profile', {
            headers: getAuthHeaders()
        });
        const profile = await response.json();
        
        document.getElementById('name').value = profile.name || '';
        document.getElementById('email').value = profile.email || '';
        document.getElementById('phone').value = profile.phone || '';
        document.getElementById('preferences').value = profile.preferences || '';
        document.getElementById('notifications').checked = profile.notifications || false;
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// Save Profile Changes
async function saveProfile() {
    try {
        const profile = {
            name: document.getElementById('name').value,
            phone: document.getElementById('phone').value,
            preferences: document.getElementById('preferences').value,
            notifications: document.getElementById('notifications').checked
        };
        
        const response = await fetch('/dev/auth/profile', {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(profile)
        });
        
        if (response.ok) {
            alert('Profile updated successfully!');
        } else {
            throw new Error('Failed to update profile');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Failed to save profile changes. Please try again.');
    }
}

// Calendar Functions
function updateCalendar(classes, bookings) {
    // TODO: Implement calendar view with available classes and bookings
    const calendar = document.querySelector('.class-calendar');
    calendar.innerHTML = '<p>Calendar implementation coming soon...</p>';
}

// Booking Functions
async function bookClass(classId) {
    try {
        const response = await fetch(`/dev/classes/${classId}/book`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            loadUpcomingClasses();
        } else {
            throw new Error('Failed to book class');
        }
    } catch (error) {
        console.error('Error booking class:', error);
        alert('Failed to book class. Please try again.');
    }
}

async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this class?')) return;
    
    try {
        const response = await fetch(`/dev/bookings/${bookingId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            loadUpcomingClasses();
        } else {
            throw new Error('Failed to cancel booking');
        }
    } catch (error) {
        console.error('Error canceling booking:', error);
        alert('Failed to cancel class. Please try again.');
    }
}

// Handle Logout
async function handleLogout() {
    try {
        await fetch('/dev/auth/logout', {
            method: 'POST',
            headers: getAuthHeaders()
        });
        window.location.href = '/dev/login.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Utility Functions
function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}
