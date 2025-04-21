/**
 * Gabi Jyoti Yoga - Admin Private Sessions JavaScript
 * Handles private sessions management functionality
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Only initialize if we're on the sessions page
    if (!window.location.pathname.includes('admin-sessions')) {
        return;
    }

    // Initialize session management
    initializeSessionsPage();
});

/**
 * Initialize the sessions management page
 */
async function initializeSessionsPage() {
    try {
        // Load sessions data
        await loadSessionsData();
        
        // Setup event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Error initializing sessions page:', error);
        showErrorMessage('Failed to initialize sessions page. Please refresh and try again.');
    }
}

/**
 * Load private sessions data from the database
 */
async function loadSessionsData() {
    try {
        // Get all private sessions
        const sessionsResponse = await AdminApiService.getPrivateSessions();
        const sessions = sessionsResponse.sessions || [];
        
        // Filter sessions by status
        const pendingSessions = sessions.filter(session => session.status.toLowerCase() === 'pending');
        const upcomingSessions = sessions.filter(session => 
            ['confirmed', 'tentative'].includes(session.status.toLowerCase()) && 
            new Date(session.date) >= new Date()
        );
        const pastSessions = sessions.filter(session => 
            new Date(session.date) < new Date() || 
            ['completed', 'cancelled'].includes(session.status.toLowerCase())
        );
        
        // Render sessions into tables
        renderPendingSessionsTable(pendingSessions);
        renderUpcomingSessionsTable(upcomingSessions);
        renderPastSessionsTable(pastSessions);
        
    } catch (error) {
        console.error('Error loading sessions data:', error);
        showErrorMessage('Failed to load sessions data. Please try again.');
    }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Button event listeners
    document.getElementById('calendar-view-btn').addEventListener('click', showCalendarView);
    document.getElementById('set-availability-btn').addEventListener('click', showAvailabilityModal);
    
    // Modal close buttons
    document.querySelectorAll('.admin-modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const modal = closeBtn.closest('.admin-modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Modal cancel buttons
    document.getElementById('cancel-availability-btn').addEventListener('click', () => {
        document.getElementById('availability-modal').style.display = 'none';
    });
    
    document.getElementById('cancel-reschedule-btn').addEventListener('click', () => {
        document.getElementById('reschedule-modal').style.display = 'none';
    });
    
    // Form submissions
    document.getElementById('availability-form').addEventListener('submit', handleAvailabilitySubmit);
    document.getElementById('reschedule-form').addEventListener('submit', handleRescheduleSubmit);
    
    // Blocked dates management
    document.getElementById('add-blocked-date-btn').addEventListener('click', addBlockedDate);
    
    // Window click event to close modal when clicking outside
    window.addEventListener('click', event => {
        document.querySelectorAll('.admin-modal').forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

/**
 * Render pending sessions table
 */
function renderPendingSessionsTable(sessions) {
    const table = document.getElementById('pending-sessions-table');
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    if (!sessions || sessions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:20px;">
                    No pending session requests at this time.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = sessions.map(session => {
        // Format date
        const sessionDate = new Date(session.date);
        const formattedDate = sessionDate.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
        });
        
        return `
            <tr>
                <td>${session.user_name}</td>
                <td>${formattedDate}</td>
                <td>${session.start_time}</td>
                <td>${session.focus || 'General Practice'}</td>
                <td>${session.notes || '-'}</td>
                <td class="admin-table-actions">
                    <button class="view-session" data-id="${session.session_id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="confirm-session" data-id="${session.session_id}" title="Approve Request">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="reschedule-session" data-id="${session.session_id}" title="Suggest Alternative Time">
                        <i class="fas fa-calendar-alt"></i>
                    </button>
                    <button class="cancel-session" data-id="${session.session_id}" title="Decline Request">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners to action buttons
    addSessionActionListeners(tbody);
}

/**
 * Render upcoming sessions table
 */
function renderUpcomingSessionsTable(sessions) {
    const table = document.getElementById('upcoming-sessions-table');
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    if (!sessions || sessions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;padding:20px;">
                    No upcoming sessions scheduled.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = sessions.map(session => {
        // Format date
        const sessionDate = new Date(session.date);
        const formattedDate = sessionDate.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
        });
        
        return `
            <tr>
                <td>${session.user_name}</td>
                <td>${formattedDate}</td>
                <td>${session.start_time}</td>
                <td>${session.duration} min</td>
                <td>${session.focus || 'General Practice'}</td>
                <td><span class="admin-tag ${getStatusColor(session.status)}">${session.status}</span></td>
                <td class="admin-table-actions">
                    <button class="view-session" data-id="${session.session_id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="reschedule-session" data-id="${session.session_id}" title="Reschedule">
                        <i class="fas fa-calendar-alt"></i>
                    </button>
                    <button class="cancel-session" data-id="${session.session_id}" title="Cancel">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners to action buttons
    addSessionActionListeners(tbody);
}

/**
 * Render past sessions table
 */
function renderPastSessionsTable(sessions) {
    const table = document.getElementById('past-sessions-table');
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    if (!sessions || sessions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;padding:20px;">
                    No past session history.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = sessions.map(session => {
        // Format date
        const sessionDate = new Date(session.date);
        const formattedDate = sessionDate.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
        });
        
        return `
            <tr>
                <td>${session.user_name}</td>
                <td>${formattedDate}</td>
                <td>${session.start_time}</td>
                <td>${session.duration} min</td>
                <td>${session.focus || 'General Practice'}</td>
                <td><span class="admin-tag ${getStatusColor(session.status)}">${session.status}</span></td>
                <td class="admin-table-actions">
                    <button class="view-session" data-id="${session.session_id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners to action buttons
    addSessionActionListeners(tbody);
}

/**
 * Add event listeners to session action buttons
 */
function addSessionActionListeners(tbody) {
    // View session details
    tbody.querySelectorAll('.view-session').forEach(btn => {
        btn.addEventListener('click', () => {
            const sessionId = btn.getAttribute('data-id');
            viewSessionDetails(sessionId);
        });
    });
    
    // Confirm session request
    tbody.querySelectorAll('.confirm-session').forEach(btn => {
        btn.addEventListener('click', () => {
            const sessionId = btn.getAttribute('data-id');
            confirmSession(sessionId);
        });
    });
    
    // Reschedule session
    tbody.querySelectorAll('.reschedule-session').forEach(btn => {
        btn.addEventListener('click', () => {
            const sessionId = btn.getAttribute('data-id');
            openRescheduleModal(sessionId);
        });
    });
    
    // Cancel session
    tbody.querySelectorAll('.cancel-session').forEach(btn => {
        btn.addEventListener('click', () => {
            const sessionId = btn.getAttribute('data-id');
            cancelSession(sessionId);
        });
    });
}

/**
 * View session details
 */
async function viewSessionDetails(sessionId) {
    try {
        // Get all sessions data
        const sessionsResponse = await AdminApiService.getPrivateSessions();
        const sessions = sessionsResponse.sessions || [];
        
        // Find the specific session
        const session = sessions.find(s => s.session_id == sessionId);
        if (!session) {
            showErrorMessage('Session not found. Please refresh and try again.');
            return;
        }
        
        // Format date
        const sessionDate = new Date(session.date);
        const formattedDate = sessionDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        });
        
        // Render session details
        const detailsContent = document.getElementById('session-details-content');
        detailsContent.innerHTML = `
            <div class="admin-form">
                <div class="admin-form-row">
                    <div class="admin-form-group">
                        <h3>Client Information</h3>
                        <p class="detail-item">
                            <strong>Name:</strong> ${session.user_name}
                        </p>
                        <p class="detail-item">
                            <strong>Email:</strong> ${session.user_email || 'N/A'}
                        </p>
                        <p class="detail-item">
                            <strong>Phone:</strong> ${session.user_phone || 'N/A'}
                        </p>
                    </div>
                    <div class="admin-form-group">
                        <h3>Session Details</h3>
                        <p class="detail-item">
                            <strong>Date:</strong> ${formattedDate}
                        </p>
                        <p class="detail-item">
                            <strong>Time:</strong> ${session.start_time}
                        </p>
                        <p class="detail-item">
                            <strong>Duration:</strong> ${session.duration} minutes
                        </p>
                        <p class="detail-item">
                            <strong>Status:</strong> <span class="admin-tag ${getStatusColor(session.status)}">${session.status}</span>
                        </p>
                    </div>
                </div>
                
                <div class="admin-form-group">
                    <h3>Focus Area</h3>
                    <p>${session.focus || 'General Practice'}</p>
                </div>
                
                <div class="admin-form-group">
                    <h3>Client Notes</h3>
                    <p>${session.notes || 'No additional notes provided.'}</p>
                </div>
            </div>
        `;
        
        // Set modal title
        document.getElementById('session-modal-title').textContent = 'Private Session Details';
        
        // Add action buttons based on session status
        const actionsContainer = document.getElementById('session-modal-actions');
        const status = session.status.toLowerCase();
        
        if (status === 'pending') {
            actionsContainer.innerHTML = `
                <button type="button" class="admin-btn admin-btn-secondary" onclick="document.getElementById('session-modal').style.display='none'">Close</button>
                <button type="button" class="admin-btn admin-btn-secondary" onclick="openRescheduleModal('${session.session_id}')">Suggest Alternative</button>
                <button type="button" class="admin-btn admin-btn-danger" onclick="cancelSession('${session.session_id}')">Decline Request</button>
                <button type="button" class="admin-btn admin-btn-primary" onclick="confirmSession('${session.session_id}')">Approve Request</button>
            `;
        } else if (['confirmed', 'tentative'].includes(status) && new Date(session.date) >= new Date()) {
            actionsContainer.innerHTML = `
                <button type="button" class="admin-btn admin-btn-secondary" onclick="document.getElementById('session-modal').style.display='none'">Close</button>
                <button type="button" class="admin-btn admin-btn-danger" onclick="cancelSession('${session.session_id}')">Cancel Session</button>
                <button type="button" class="admin-btn admin-btn-primary" onclick="openRescheduleModal('${session.session_id}')">Reschedule</button>
            `;
        } else {
            actionsContainer.innerHTML = `
                <button type="button" class="admin-btn admin-btn-secondary" onclick="document.getElementById('session-modal').style.display='none'">Close</button>
            `;
        }
        
        // Show modal
        document.getElementById('session-modal').style.display = 'block';
        
    } catch (error) {
        console.error('Error viewing session details:', error);
        showErrorMessage('Failed to load session details. Please try again.');
    }
}

/**
 * Confirm a session request
 */
async function confirmSession(sessionId) {
    if (confirm('Are you sure you want to approve this session request?')) {
        try {
            await AdminApiService.authRequest(
                `${API_ENDPOINTS.privateSessionById(sessionId)}/status`, 
                'PUT',
                { status: 'Confirmed' }
            );
            
            showSuccessMessage('Session has been confirmed successfully!');
            
            // Close modal if open
            document.getElementById('session-modal').style.display = 'none';
            
            // Reload sessions data
            await loadSessionsData();
            
        } catch (error) {
            console.error('Error confirming session:', error);
            showErrorMessage('Failed to confirm session. Please try again.');
        }
    }
}

/**
 * Open reschedule modal
 */
function openRescheduleModal(sessionId) {
    // Set session ID in hidden field
    document.getElementById('reschedule-session-id').value = sessionId;
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('reschedule-date').min = today;
    
    // Close details modal if open
    document.getElementById('session-modal').style.display = 'none';
    
    // Show reschedule modal
    document.getElementById('reschedule-modal').style.display = 'block';
}

/**
 * Handle reschedule form submission
 */
async function handleRescheduleSubmit(e) {
    e.preventDefault();
    
    const sessionId = document.getElementById('reschedule-session-id').value;
    const date = document.getElementById('reschedule-date').value;
    const time = document.getElementById('reschedule-time').value;
    const notes = document.getElementById('reschedule-notes').value;
    
    try {
        // Update session with new date/time
        await AdminApiService.authRequest(
            API_ENDPOINTS.privateSessionById(sessionId),
            'PUT',
            {
                date,
                start_time: time,
                admin_notes: notes,
                status: 'Tentative' // Change status to tentative until client confirms
            }
        );
        
        showSuccessMessage('Session rescheduled successfully. The client will be notified of the change.');
        
        // Hide modal
        document.getElementById('reschedule-modal').style.display = 'none';
        
        // Reload sessions data
        await loadSessionsData();
        
    } catch (error) {
        console.error('Error rescheduling session:', error);
        showErrorMessage('Failed to reschedule session. Please try again.');
    }
}

/**
 * Cancel a session
 */
async function cancelSession(sessionId) {
    if (confirm('Are you sure you want to cancel this session? This action cannot be undone.')) {
        try {
            await AdminApiService.authRequest(
                `${API_ENDPOINTS.privateSessionById(sessionId)}/status`, 
                'PUT',
                { status: 'Cancelled' }
            );
            
            showSuccessMessage('Session has been cancelled successfully.');
            
            // Close modal if open
            document.getElementById('session-modal').style.display = 'none';
            
            // Reload sessions data
            await loadSessionsData();
            
        } catch (error) {
            console.error('Error cancelling session:', error);
            showErrorMessage('Failed to cancel session. Please try again.');
        }
    }
}

/**
 * Show calendar view
 */
function showCalendarView() {
    alert('Calendar view is not yet implemented. This feature will be added soon.');
}

/**
 * Show availability modal
 */
async function showAvailabilityModal() {
    try {
        // Load current availability settings
        // This is a placeholder - in a real implementation, you would fetch this data
        // from your backend API
        
        // Reset form
        document.getElementById('availability-form').reset();
        
        // Show sample data (in a real app, this would be loaded from the database)
        document.getElementById('day-1').checked = true; // Monday
        document.getElementById('day-3').checked = true; // Wednesday
        document.getElementById('day-6').checked = true; // Saturday
        
        // Show modal
        document.getElementById('availability-modal').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading availability settings:', error);
        showErrorMessage('Failed to load availability settings. Please try again.');
    }
}

/**
 * Add a blocked date
 */
function addBlockedDate() {
    const date = document.getElementById('blocked-date').value;
    const reason = document.getElementById('blocked-reason').value;
    
    if (!date) {
        showErrorMessage('Please select a date to block.');
        return;
    }
    
    const tbody = document.querySelector('#blocked-dates-table tbody');
    if (!tbody) return;
    
    // Format date for display
    const displayDate = new Date(date).toLocaleDateString('en-US', {
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
    });
    
    // Add new row
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td>${displayDate}</td>
        <td>${reason || 'Unavailable'}</td>
        <td class="admin-table-actions">
            <button class="remove-blocked-date" title="Remove">
                <i class="fas fa-trash-alt"></i>
            </button>
        </td>
    `;
    
    // Add event listener to remove button
    newRow.querySelector('.remove-blocked-date').addEventListener('click', function() {
        newRow.remove();
    });
    
    tbody.appendChild(newRow);
    
    // Clear inputs
    document.getElementById('blocked-date').value = '';
    document.getElementById('blocked-reason').value = '';
}

/**
 * Handle availability form submit
 */
async function handleAvailabilitySubmit(e) {
    e.preventDefault();
    
    try {
        // Get available days
        const availableDays = [];
        const checkboxes = document.querySelectorAll('input[name="available_days"]:checked');
        checkboxes.forEach(checkbox => {
            const day = parseInt(checkbox.value);
            const startTime = document.getElementById(`start-time-${day}`).value;
            const endTime = document.getElementById(`end-time-${day}`).value;
            
            availableDays.push({
                day,
                start_time: startTime,
                end_time: endTime
            });
        });
        
        // Get blocked dates
        const blockedDates = [];
        const blockedRows = document.querySelectorAll('#blocked-dates-table tbody tr');
        blockedRows.forEach(row => {
            const dateText = row.querySelector('td:first-child').textContent;
            const reason = row.querySelector('td:nth-child(2)').textContent;
            
            // Parse date from display format
            const dateParts = dateText.match(/([A-Za-z]+) (\d+), (\d+)/);
            if (dateParts) {
                const month = new Date(`${dateParts[1]} 1, 2000`).getMonth() + 1;
                const day = parseInt(dateParts[2]);
                const year = parseInt(dateParts[3]);
                const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                
                blockedDates.push({
                    date: formattedDate,
                    reason
                });
            }
        });
        
        // In a real app, you would send this data to your backend API
        console.log('Availability settings to save:', { availableDays, blockedDates });
        
        showSuccessMessage('Availability settings have been saved.');
        
        // Hide modal
        document.getElementById('availability-modal').style.display = 'none';
        
    } catch (error) {
        console.error('Error saving availability settings:', error);
        showErrorMessage('Failed to save availability settings. Please try again.');
    }
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
