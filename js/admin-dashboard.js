/**
 * Admin Dashboard JavaScript
 * 
 * This file handles the admin dashboard functionality, fetching and displaying
 * real-time data from the database.
 */

// API endpoints
const API_BASE_URL = '/api';
const API_ENDPOINTS = {
    dashboardStats: `${API_BASE_URL}/admin/stats`,
    bookings: `${API_BASE_URL}/admin/bookings`,
    workshops: `${API_BASE_URL}/admin/workshops`,
    classes: `${API_BASE_URL}/admin/classes`,
    classTemplates: `${API_BASE_URL}/admin/class-templates`
};

// Using real database API endpoints for admin dashboard
console.log('Using real database API endpoints for admin dashboard');

// Token service for authentication
const TokenService = {
    getToken: () => localStorage.getItem('auth_token')
};

document.addEventListener('DOMContentLoaded', async () => {
    // For development testing, we'll continue even without login
    // In production, you'd want to redirect non-admin users

    // Initialize dashboard data
    await loadDashboardData();

    // Setup refresh button
    const refreshBtn = document.querySelector('.admin-actions .admin-btn-primary');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await loadDashboardData();
            showSuccessMessage('Dashboard data refreshed');
        });
    }
});

/**
 * Load dashboard data from the database
 */
async function loadDashboardData() {
    try {
        // Show loading indicators for stat cards
        document.querySelectorAll('.admin-card-value').forEach(el => {
            el.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        });
        
        // Show loading state for tables
        // Get tables for recent bookings and upcoming workshops
        const tables = document.querySelectorAll('.admin-table');
        tables.forEach(table => {
            const tbody = table.querySelector('tbody');
            if (tbody) {
                const columns = table.querySelectorAll('thead th').length;
                tbody.innerHTML = `
                    <tr>
                        <td colspan="${columns}" style="text-align:center;padding:30px;">
                            <i class="fas fa-spinner fa-spin"></i> Loading data...
                        </td>
                    </tr>
                `;
            }
        });
        
        // Fetch dashboard stats from the database
        const statsResponse = await fetch(API_ENDPOINTS.dashboardStats, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TokenService.getToken()}`
            }
        });
        
        if (!statsResponse.ok) {
            throw new Error('Failed to fetch dashboard statistics');
        }
        
        const statsData = await statsResponse.json();
        
        // Update stat cards with real data
        const statCards = document.querySelectorAll('.admin-card');
        
        // Active Members card
        statCards[0].querySelector('.admin-card-value').textContent = 
            statsData.activeMembers || 0;
            
        // Class Bookings This Week card
        statCards[1].querySelector('.admin-card-value').textContent = 
            statsData.weeklyBookings || 0;
            
        // Private Sessions Scheduled card
        statCards[2].querySelector('.admin-card-value').textContent = 
            statsData.upcomingSessions || 0;
            
        // Revenue This Month card
        statCards[3].querySelector('.admin-card-value').textContent = 
            `$${statsData.monthlyRevenue || 0}`;
        
        // Fetch and display recent bookings
        await loadRecentBookings();
        
        // Fetch and display upcoming workshops
        await loadUpcomingWorkshops();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showErrorMessage('Failed to load dashboard data. Please try again.');
    }
}

/**
 * Load recent bookings from database
 */
async function loadRecentBookings() {
    try {
        // Find the admin-panel with Recent Bookings title
        const panels = document.querySelectorAll('.admin-panel');
        let bookingsTable = null;
        
        // Search through panels to find the one with Recent Bookings title
        for (const panel of panels) {
            const title = panel.querySelector('.admin-panel-header .admin-panel-title');
            if (title && title.textContent.includes('Recent Bookings')) {
                bookingsTable = panel.querySelector('.admin-table');
                break;
            }
        }
        
        if (!bookingsTable) {
            console.error('Could not find Recent Bookings table');
            return;
        }
        
        const tbody = bookingsTable.querySelector('tbody');
        if (!tbody) return;
        
        // Fetch recent bookings from the database
        const response = await fetch(`${API_ENDPOINTS.bookings}?recent=true`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TokenService.getToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch recent bookings');
        }
        
        const data = await response.json();
        const bookings = data.bookings || [];
        
        if (bookings.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;padding:20px;">
                        No recent bookings available.
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = bookings.map(booking => {
            // Format date
            const bookingDate = new Date(booking.date);
            const formattedDate = bookingDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            // Format time
            let timeDisplay = '';
            if (booking.start_time) {
                timeDisplay = ` - ${booking.start_time}`;
            }
            
            return `
                <tr>
                    <td>${booking.user_name}</td>
                    <td>${booking.class_name}</td>
                    <td>${formattedDate}${timeDisplay}</td>
                    <td><span class="admin-tag ${getStatusColor(booking.status)}">${booking.status}</span></td>
                    <td class="admin-table-actions">
                        <button class="view" data-id="${booking.booking_id}" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="edit" data-id="${booking.booking_id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete" data-id="${booking.booking_id}" title="Cancel">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Add event listeners to action buttons
        const actionButtons = tbody.querySelectorAll('.view, .edit, .delete');
        actionButtons.forEach(button => {
            button.addEventListener('click', () => {
                const id = button.getAttribute('data-id');
                const action = button.classList.contains('view') ? 'view' :
                              button.classList.contains('edit') ? 'edit' : 'delete';
                
                handleBookingAction(action, id);
            });
        });
        
    } catch (error) {
        console.error('Error loading recent bookings:', error);
        showErrorMessage('Failed to load recent bookings');
    }
}

/**
 * Load upcoming workshops from database
 */
async function loadUpcomingWorkshops() {
    try {
        // Find the admin-panel with Upcoming Workshops title
        const panels = document.querySelectorAll('.admin-panel');
        let workshopsTable = null;
        
        // Search through panels to find the one with Upcoming Workshops title
        for (const panel of panels) {
            const title = panel.querySelector('.admin-panel-header .admin-panel-title');
            if (title && title.textContent.includes('Upcoming Workshops')) {
                workshopsTable = panel.querySelector('.admin-table');
                break;
            }
        }
        
        if (!workshopsTable) {
            console.error('Could not find Upcoming Workshops table');
            return;
        }
        
        const tbody = workshopsTable.querySelector('tbody');
        if (!tbody) return;
        
        // Fetch upcoming workshops from the database
        const response = await fetch(`${API_ENDPOINTS.workshops}?upcoming=true`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TokenService.getToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch upcoming workshops');
        }
        
        const data = await response.json();
        const workshops = data.workshops || [];
        
        if (workshops.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;padding:20px;">
                        No upcoming workshops available.
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = workshops.map(workshop => {
            // Format date
            const workshopDate = new Date(workshop.date);
            const formattedDate = workshopDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            return `
                <tr>
                    <td>${workshop.title}</td>
                    <td>${formattedDate}</td>
                    <td>${workshop.start_time} - ${workshop.end_time}</td>
                    <td>${workshop.registration_count || 0}</td>
                    <td>${workshop.capacity}</td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading upcoming workshops:', error);
        showErrorMessage('Failed to load upcoming workshops');
    }
}

/**
 * Handle booking actions (view, edit, delete)
 */
function handleBookingAction(action, bookingId) {
    switch (action) {
        case 'view':
            alert(`View booking details (ID: ${bookingId}) - This functionality will be implemented soon.`);
            break;
        case 'edit':
            alert(`Edit booking (ID: ${bookingId}) - This functionality will be implemented soon.`);
            break;
        case 'delete':
            if (confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
                alert(`Cancel booking (ID: ${bookingId}) - This functionality will be implemented soon.`);
            }
            break;
    }
}

/**
 * Get status color class for tags
 */
function getStatusColor(status) {
    if (!status) return '';
    
    status = status.toLowerCase();
    
    if (status === 'confirmed' || status === 'active' || status === 'completed') {
        return 'green';
    } else if (status === 'pending' || status === 'tentative') {
        return 'yellow';
    } else if (status === 'cancelled' || status === 'expired') {
        return 'red';
    } else if (status === 'new') {
        return 'blue';
    }
    
    return '';
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'admin-success-message';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    
    // Insert at the top of content
    const content = document.querySelector('.admin-content');
    if (content) {
        content.prepend(successDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            successDiv.remove();
        }, 5000);
    }
}

/**
 * Show error message
 */
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'admin-error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    // Insert at the top of content
    const content = document.querySelector('.admin-content');
    if (content) {
        content.prepend(errorDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}
