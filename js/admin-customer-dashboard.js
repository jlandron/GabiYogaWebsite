/**
 * Admin Customer Dashboard JavaScript
 * 
 * This file handles loading and displaying data in the admin customer dashboard view,
 * which shows the admin as if they were a regular user viewing their dashboard.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the admin sidebar
    loadAdminSidebar();

    // Set up back button
    document.getElementById('back-to-members').addEventListener('click', function() {
        window.location.href = 'admin-members.html';
    });

    // Load admin user data for the dashboard
    loadAdminDashboardData();

    // Initialize tabs functionality
    initDashboardTabs();
});

// Token handling (same as in admin.js)
const TokenService = {
    getToken: () => localStorage.getItem('auth_token'),
    removeToken: () => localStorage.removeItem('auth_token')
};

// User handling (same as in admin.js)
const UserService = {
    getUser: () => {
        const userInfo = localStorage.getItem('user_info');
        return userInfo ? JSON.parse(userInfo) : null;
    },
    removeUser: () => localStorage.removeItem('user_info')
};

/**
 * Create fetch options with auth token
 */
function createFetchOptions(method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TokenService.getToken()}`
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    return options;
}

/**
 * Load admin user data for dashboard preview
 */
async function loadAdminDashboardData() {
    try {
        // Check if user is logged in and is admin
        if (!TokenService.getToken()) {
            console.error("No auth token found");
            showErrorMessage('You need to be logged in to view this page.');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }

        // Debug
        console.log("Loading admin dashboard with token:", TokenService.getToken());

        // Fetch admin user info
        const adminInfo = UserService.getUser();
        if (adminInfo) {
            // Update admin name right away
            document.getElementById('admin-name').textContent = adminInfo.firstName || "Admin";
        }

        // Load all dashboard panels data
        loadAdminBookings();
        loadAdminMemberships();
        loadAdminPurchaseHistory();
        loadAdminWorkshops();
        loadAdminRetreats();
        loadAdminSessions();
        
        if (adminInfo) {
            loadAdminProfile(adminInfo);
        }
    } catch (error) {
        console.error('Error loading admin dashboard data:', error);
        showErrorMessage('Error loading dashboard data. Please try again.');
    }
}

/**
 * Initialize dashboard tab functionality
 */
function initDashboardTabs() {
    const navItems = document.querySelectorAll('.dashboard-nav-item');
    const panels = document.querySelectorAll('.dashboard-content .dashboard-panel');

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const panelId = this.getAttribute('data-panel');
            
            // Remove active class from all items and panels
            navItems.forEach(i => i.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked item and corresponding panel
            this.classList.add('active');
            document.getElementById(`${panelId}-panel`).classList.add('active');
        });
    });
}

/**
 * Load admin bookings
 */
async function loadAdminBookings() {
    const bookingsList = document.getElementById('admin-bookings-list');
    
    try {
        const response = await fetch('/api/admin/customer-dashboard/bookings', createFetchOptions());
        const bookings = await response.json();
        
        if (bookings.length === 0) {
            bookingsList.innerHTML = '<p class="no-data-message">No upcoming classes.</p>';
            return;
        }
        
        let html = '';
        
        bookings.forEach(booking => {
            html += `
                <div class="booking-item">
                    <div class="booking-details">
                        <div class="booking-title">${booking.class_name}</div>
                        <div class="booking-info">
                            <span><i class="far fa-calendar"></i> ${formatDate(booking.date)}</span>
                            <span><i class="far fa-clock"></i> ${booking.start_time} - ${calculateEndTime(booking.start_time, booking.duration)}</span>
                            <span><i class="fas fa-map-marker-alt"></i> Main Studio</span>
                        </div>
                    </div>
                    <div class="booking-actions">
                        <button title="Add to Calendar"><i class="far fa-calendar-plus"></i></button>
                        <button title="Cancel Booking"><i class="fas fa-times"></i></button>
                    </div>
                </div>
            `;
        });
        
        bookingsList.innerHTML = html;
    } catch (error) {
        console.error('Error loading admin bookings:', error);
        bookingsList.innerHTML = '<p class="error-message">Error loading bookings. Please try again.</p>';
    }
}

/**
 * Load admin memberships
 */
async function loadAdminMemberships() {
    const membershipsList = document.getElementById('admin-memberships-list');
    
    try {
        const response = await fetch('/api/admin/customer-dashboard/memberships', createFetchOptions());
        const memberships = await response.json();
        
        if (memberships.length === 0) {
            membershipsList.innerHTML = '<p class="no-data-message">No active memberships.</p>';
            return;
        }
        
        let html = '';
        
        memberships.forEach(membership => {
            html += `
                <div class="membership-item">
                    <div class="membership-details">
                        <div class="membership-title">${membership.membership_type}</div>
                        <div class="membership-info">
                            <span><i class="fas fa-calendar-check"></i> Active</span>
                            ${membership.end_date ? `<span><i class="far fa-calendar-alt"></i> Expires: ${formatDate(membership.end_date)}</span>` : ''}
                            ${membership.classes_remaining ? `<span><i class="fas fa-check-circle"></i> ${membership.classes_remaining} Classes Remaining</span>` : ''}
                            <span><i class="fas fa-tag"></i> $${membership.price}</span>
                        </div>
                    </div>
                    <div class="membership-actions">
                        <button title="Manage Billing"><i class="fas fa-credit-card"></i></button>
                        <button title="Cancel Subscription"><i class="fas fa-times"></i></button>
                    </div>
                </div>
            `;
        });
        
        membershipsList.innerHTML = html;
    } catch (error) {
        console.error('Error loading admin memberships:', error);
        membershipsList.innerHTML = '<p class="error-message">Error loading memberships. Please try again.</p>';
    }
}

/**
 * Load admin purchase history
 */
async function loadAdminPurchaseHistory() {
    const purchaseHistoryList = document.getElementById('admin-purchase-history-list');
    
    try {
        const response = await fetch('/api/admin/customer-dashboard/payments', createFetchOptions());
        const payments = await response.json();
        
        if (payments.length === 0) {
            purchaseHistoryList.innerHTML = '<p class="no-data-message">No purchase history.</p>';
            return;
        }
        
        let html = '';
        
        payments.forEach(payment => {
            let title;
            switch (payment.payment_type) {
                case 'membership':
                    title = 'Membership Payment';
                    break;
                case 'workshop':
                    title = 'Workshop Registration';
                    break;
                case 'private_session':
                    title = 'Private Session';
                    break;
                default:
                    title = 'Payment';
            }
            
            html += `
                <div class="membership-item">
                    <div class="membership-details">
                        <div class="membership-title">${title}</div>
                        <div class="membership-info">
                            <span><i class="far fa-calendar-alt"></i> ${formatDate(payment.payment_date)}</span>
                            <span><i class="fas fa-tag"></i> $${payment.amount.toFixed(2)}</span>
                            <span><i class="fas fa-credit-card"></i> ${payment.payment_method}</span>
                        </div>
                    </div>
                    <div class="membership-actions">
                        <button title="View Receipt"><i class="fas fa-file-invoice"></i></button>
                    </div>
                </div>
            `;
        });
        
        purchaseHistoryList.innerHTML = html;
    } catch (error) {
        console.error('Error loading admin purchase history:', error);
        purchaseHistoryList.innerHTML = '<p class="error-message">Error loading purchase history. Please try again.</p>';
    }
}

/**
 * Load admin workshops
 */
async function loadAdminWorkshops() {
    const workshopsList = document.getElementById('admin-workshops-list');
    
    try {
        const response = await fetch('/api/admin/customer-dashboard/workshops', createFetchOptions());
        const workshops = await response.json();
        
        if (workshops.length === 0) {
            workshopsList.innerHTML = '<p class="no-data-message">No upcoming workshops.</p>';
            return;
        }
        
        let html = '';
        
        workshops.forEach(workshop => {
            html += `
                <div class="workshop-item">
                    <div class="workshop-details">
                        <div class="workshop-title">${workshop.title}</div>
                        <div class="workshop-info">
                            <span><i class="far fa-calendar"></i> ${formatDate(workshop.date)}</span>
                            <span><i class="far fa-clock"></i> ${workshop.start_time} - ${workshop.end_time}</span>
                            <span><i class="fas fa-map-marker-alt"></i> ${workshop.location}</span>
                            <span><i class="fas fa-tag"></i> $${workshop.price} ($${workshop.member_price} for members)</span>
                        </div>
                        <p class="workshop-description">${workshop.description}</p>
                    </div>
                    <div class="workshop-actions">
                        <a href="#" class="btn-small">Register Now</a>
                    </div>
                </div>
            `;
        });
        
        workshopsList.innerHTML = html;
    } catch (error) {
        console.error('Error loading admin workshops:', error);
        workshopsList.innerHTML = '<p class="error-message">Error loading workshops. Please try again.</p>';
    }
}

/**
 * Load admin retreats
 */
async function loadAdminRetreats() {
    const retreatsList = document.getElementById('admin-retreats-list');
    
    try {
        const response = await fetch('/api/admin/customer-dashboard/retreats', createFetchOptions());
        const retreats = await response.json();
        
        if (retreats.length === 0) {
            retreatsList.innerHTML = '<p class="no-data-message">No upcoming retreats.</p>';
            return;
        }
        
        let html = '';
        
        retreats.forEach(retreat => {
            html += `
                <div class="retreat-item">
                    <div class="retreat-image">
                        <img src="${retreat.image_url}" alt="${retreat.title}">
                    </div>
                    <div class="retreat-details">
                        <div class="retreat-title">${retreat.title}</div>
                        <div class="retreat-info">
                            <span><i class="fas fa-map-marker-alt"></i> ${retreat.location}</span>
                            <span><i class="far fa-calendar-alt"></i> ${formatDate(retreat.start_date)} - ${formatDate(retreat.end_date)}</span>
                            <span><i class="fas fa-tag"></i> From $${retreat.price}</span>
                        </div>
                        <p class="retreat-description">${retreat.description}</p>
                        <div class="retreat-actions">
                            <a href="#" class="btn-small">Learn More</a>
                            <a href="#" class="btn-small">Register</a>
                        </div>
                    </div>
                </div>
            `;
        });
        
        retreatsList.innerHTML = html;
    } catch (error) {
        console.error('Error loading admin retreats:', error);
        retreatsList.innerHTML = '<p class="error-message">Error loading retreats. Please try again.</p>';
    }
}

/**
 * Load admin sessions
 */
async function loadAdminSessions() {
    const sessionsList = document.getElementById('admin-sessions-list');
    
    try {
        const response = await fetch('/api/admin/customer-dashboard/sessions', createFetchOptions());
        const sessions = await response.json();
        
        if (sessions.length === 0) {
            sessionsList.innerHTML = '<p class="no-data-message">No upcoming private sessions.</p>';
            return;
        }
        
        let html = '';
        
        sessions.forEach(session => {
            html += `
                <div class="session-item">
                    <div class="session-details">
                        <div class="session-title">Private Yoga Session</div>
                        <div class="session-info">
                            <span><i class="far fa-calendar"></i> ${formatDate(session.date)}</span>
                            <span><i class="far fa-clock"></i> ${session.start_time} - ${calculateEndTime(session.start_time, session.duration)}</span>
                            <span><i class="fas fa-map-marker-alt"></i> ${session.location || 'Studio'}</span>
                        </div>
                        <div class="session-focus">
                            <span><strong>Focus:</strong> ${session.focus}</span>
                        </div>
                    </div>
                    <div class="session-actions">
                        <button title="Add to Calendar"><i class="far fa-calendar-plus"></i></button>
                        <button title="Reschedule"><i class="far fa-clock"></i></button>
                        <button title="Cancel Session"><i class="fas fa-times"></i></button>
                    </div>
                </div>
            `;
        });
        
        sessionsList.innerHTML = html;
    } catch (error) {
        console.error('Error loading admin sessions:', error);
        sessionsList.innerHTML = '<p class="error-message">Error loading private sessions. Please try again.</p>';
    }
}

/**
 * Load admin profile
 */
function loadAdminProfile(adminData) {
    const profileDetails = document.getElementById('admin-profile-details');
    
    // Update profile photo if available
    if (adminData.profilePicture) {
        document.getElementById('profile-photo').src = adminData.profilePicture;
    }
    
    const html = `
        <div class="form-row">
            <div class="form-group">
                <label>First Name</label>
                <p class="form-data">${adminData.firstName}</p>
            </div>
            <div class="form-group">
                <label>Last Name</label>
                <p class="form-data">${adminData.lastName}</p>
            </div>
        </div>

        <div class="form-group">
            <label>Email Address</label>
            <p class="form-data">${adminData.email}</p>
        </div>

        <div class="form-group">
            <label>Phone Number</label>
            <p class="form-data">${adminData.phone || 'Not provided'}</p>
        </div>

        <div class="form-group">
            <label>Role</label>
            <p class="form-data">${adminData.role}</p>
        </div>
    `;
    
    profileDetails.innerHTML = html;
}

/**
 * Format date to readable string
 */
function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', options);
}

/**
 * Calculate end time based on start time and duration
 */
function calculateEndTime(startTimeStr, durationMinutes) {
    const [hours, minutes] = startTimeStr.split(':').map(Number);
    
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    const endHours = endDate.getHours();
    const endMinutes = endDate.getMinutes();
    
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

/**
 * Show error message
 */
function showErrorMessage(message) {
    const adminContent = document.querySelector('.admin-content');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'admin-error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    // Insert at the top of admin content
    adminContent.insertBefore(errorDiv, adminContent.firstChild);
    
    // Remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}
