/**
 * Admin Communications JavaScript
 * Handles contact submissions and newsletter subscribers management
 */

// Global state
let currentContactPage = 1;
let currentSubscriberPage = 1;
let contactSearchTerm = '';
let subscriberSearchTerm = '';
let currentContactSubmission = null;

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('auth_token');
    return token !== null && token !== '';
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
  // Use centralized authentication handler for admin pages
    try {
        const authenticated = await AuthHandler.initAdminPage();
        if (!authenticated) {
            return; // AuthHandler will have already redirected as needed
        }
    
        // Load data for the page
        loadContactSubmissions();
        loadNewsletterSubscribers();
        
        // Add enter key search functionality
        document.getElementById('contactSearch').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchContacts();
            }
        });
        
        document.getElementById('subscriberSearch').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchSubscribers();
            }
        });
    } catch (error) {
        console.error('Error initializing admin communications page:', error);
        showError('Failed to initialize page. Please try refreshing.');
    }
});

/**
 * Load contact submissions with pagination and search
 */
async function loadContactSubmissions(page = 1, search = '') {
    const loadingElement = document.getElementById('contactSubmissionsLoading');
    const tableElement = document.getElementById('contactSubmissionsTable');
    
    loadingElement.style.display = 'block';
    tableElement.style.display = 'none';
    
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: '10',
            search: search
        });
        
        const token = localStorage.getItem('adminToken') || localStorage.getItem('auth_token');
        const response = await fetch(`/api/admin/contact-submissions?${params}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load contact submissions');
        }
        
        const data = await response.json();
        
        if (data.success) {
            renderContactSubmissions(data.submissions);
            updateContactPagination(data.pagination);
            currentContactPage = page;
            contactSearchTerm = search;
        } else {
            throw new Error(data.message || 'Failed to load contact submissions');
        }
    } catch (error) {
        console.error('Error loading contact submissions:', error);
        showError('Failed to load contact submissions: ' + error.message);
        document.getElementById('contactSubmissionsBody').innerHTML = 
            '<tr><td colspan="6" class="text-center">Error loading contact submissions</td></tr>';
    } finally {
        loadingElement.style.display = 'none';
        tableElement.style.display = 'table';
    }
}

/**
 * Load newsletter subscribers with pagination and search
 */
async function loadNewsletterSubscribers(page = 1, search = '') {
    const loadingElement = document.getElementById('subscribersLoading');
    const tableElement = document.getElementById('subscribersTable');
    
    loadingElement.style.display = 'block';
    tableElement.style.display = 'none';
    
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: '10',
            search: search
        });
        
        const token = localStorage.getItem('adminToken') || localStorage.getItem('auth_token');
        const response = await fetch(`/api/admin/newsletter-subscribers?${params}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load newsletter subscribers');
        }
        
        const data = await response.json();
        
        if (data.success) {
            renderNewsletterSubscribers(data.subscribers);
            updateSubscriberPagination(data.pagination);
            currentSubscriberPage = page;
            subscriberSearchTerm = search;
        } else {
            throw new Error(data.message || 'Failed to load newsletter subscribers');
        }
    } catch (error) {
        console.error('Error loading newsletter subscribers:', error);
        showError('Failed to load newsletter subscribers: ' + error.message);
        document.getElementById('subscribersBody').innerHTML = 
            '<tr><td colspan="4" class="text-center">Error loading newsletter subscribers</td></tr>';
    } finally {
        loadingElement.style.display = 'none';
        tableElement.style.display = 'table';
    }
}

/**
 * Render contact submissions table
 */
function renderContactSubmissions(submissions) {
    const tbody = document.getElementById('contactSubmissionsBody');
    
    if (!submissions || submissions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No contact submissions found</td></tr>';
        return;
    }
    
    tbody.innerHTML = submissions.map(submission => {
        const statusClass = getStatusClass(submission.status);
        const date = new Date(submission.created_at).toLocaleDateString();
        const time = new Date(submission.created_at).toLocaleTimeString();
        
        return `
            <tr>
                <td><strong>${escapeHtml(submission.name)}</strong></td>
                <td>${escapeHtml(submission.email)}</td>
                <td>${escapeHtml(truncateText(submission.subject, 40))}</td>
                <td><span class="status-badge ${statusClass}">${submission.status}</span></td>
                <td>${date}<br><small>${time}</small></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewContactDetails(${submission.submission_id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Render newsletter subscribers table
 */
function renderNewsletterSubscribers(subscribers) {
    const tbody = document.getElementById('subscribersBody');
    
    if (!subscribers || subscribers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No newsletter subscribers found</td></tr>';
        return;
    }
    
    tbody.innerHTML = subscribers.map(subscriber => {
        const statusClass = subscriber.active ? 'status-active' : 'status-inactive';
        const statusText = subscriber.active ? 'Active' : 'Inactive';
        const date = new Date(subscriber.subscribe_date).toLocaleDateString();
        const time = new Date(subscriber.subscribe_date).toLocaleTimeString();
        
        return `
            <tr>
                <td><strong>${escapeHtml(subscriber.email)}</strong></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${date}<br><small>${time}</small></td>
                <td>
                    <button class="btn btn-sm ${subscriber.active ? 'btn-warning' : 'btn-success'}" 
                            onclick="toggleSubscriberStatus(${subscriber.subscriber_id}, ${!subscriber.active})">
                        <i class="fas ${subscriber.active ? 'fa-pause' : 'fa-play'}"></i> 
                        ${subscriber.active ? 'Deactivate' : 'Activate'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * View contact details in modal
 */
async function viewContactDetails(submissionId) {
    try {
        const modal = document.getElementById('contactDetailModal');
        const content = document.getElementById('contactDetailContent');
        const statusSelect = document.getElementById('contactStatusSelect');
        
        // Show loading state
        content.innerHTML = `
            <div class="contact-detail-grid">
                <div class="detail-item">
                    <label>Name:</label>
                    <span>Loading...</span>
                </div>
                <div class="detail-item">
                    <label>Email:</label>
                    <span>Loading...</span>
                </div>
                <div class="detail-item">
                    <label>Subject:</label>
                    <span>Loading...</span>
                </div>
                <div class="detail-item full-width">
                    <label>Message:</label>
                    <div class="message-content">Loading...</div>
                </div>
                <div class="detail-item">
                    <label>Date:</label>
                    <span>Loading...</span>
                </div>
            </div>
        `;
        
        // Store current submission ID for status updates
        currentContactSubmission = submissionId;
        
        // Show modal
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Fetch contact details from API
        const token = localStorage.getItem('adminToken') || localStorage.getItem('auth_token');
        const response = await fetch(`/api/admin/contact-submissions/${submissionId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load contact details');
        }
        
        const data = await response.json();
        
        if (data.success && data.submission) {
            const submission = data.submission;
            const date = new Date(submission.created_at).toLocaleDateString();
            const time = new Date(submission.created_at).toLocaleTimeString();
            
            // Update modal content with actual data
            content.innerHTML = `
                <div class="contact-detail-grid">
                    <div class="detail-item">
                        <label>Name:</label>
                        <span>${escapeHtml(submission.name)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Email:</label>
                        <span>${escapeHtml(submission.email)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Subject:</label>
                        <span>${escapeHtml(submission.subject)}</span>
                    </div>
                    <div class="detail-item full-width">
                        <label>Message:</label>
                        <div class="message-content">${escapeHtml(submission.message)}</div>
                    </div>
                    <div class="detail-item">
                        <label>Date:</label>
                        <span>${date} at ${time}</span>
                    </div>
                </div>
            `;
            
            // Set the current status in the select dropdown
            statusSelect.value = submission.status || 'New';
        } else {
            throw new Error(data.message || 'Failed to load contact details');
        }
        
    } catch (error) {
        console.error('Error viewing contact details:', error);
        showError('Failed to load contact details: ' + error.message);
        
        // Show error in modal content
        const content = document.getElementById('contactDetailContent');
        content.innerHTML = `
            <div class="contact-detail-grid">
                <div class="detail-item full-width">
                    <label>Error:</label>
                    <span style="color: var(--danger-color);">Failed to load contact details. Please try again.</span>
                </div>
            </div>
        `;
    }
}

/**
 * Update contact submission status
 */
async function updateContactStatus() {
    if (!currentContactSubmission) {
        showError('No contact submission selected');
        return;
    }
    
    const statusSelect = document.getElementById('contactStatusSelect');
    const newStatus = statusSelect.value;
    
    try {
        const token = localStorage.getItem('adminToken') || localStorage.getItem('auth_token');
        const response = await fetch(`/api/admin/contact-submissions/${currentContactSubmission}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update contact status');
        }
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Contact status updated successfully');
            closeContactModal();
            loadContactSubmissions(currentContactPage, contactSearchTerm);
        } else {
            throw new Error(data.message || 'Failed to update contact status');
        }
    } catch (error) {
        console.error('Error updating contact status:', error);
        showError('Failed to update contact status: ' + error.message);
    }
}

/**
 * Toggle subscriber status (activate/deactivate)
 */
async function toggleSubscriberStatus(subscriberId, activate) {
    try {
        const token = localStorage.getItem('adminToken') || localStorage.getItem('auth_token');
        const response = await fetch(`/api/admin/newsletter-subscribers/${subscriberId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ active: activate })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update subscriber status');
        }
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess(`Subscriber ${activate ? 'activated' : 'deactivated'} successfully`);
            loadNewsletterSubscribers(currentSubscriberPage, subscriberSearchTerm);
        } else {
            throw new Error(data.message || 'Failed to update subscriber status');
        }
    } catch (error) {
        console.error('Error updating subscriber status:', error);
        showError('Failed to update subscriber status: ' + error.message);
    }
}

/**
 * Search contacts
 */
function searchContacts() {
    const searchInput = document.getElementById('contactSearch');
    const searchTerm = searchInput.value.trim();
    loadContactSubmissions(1, searchTerm);
}

/**
 * Search subscribers
 */
function searchSubscribers() {
    const searchInput = document.getElementById('subscriberSearch');
    const searchTerm = searchInput.value.trim();
    loadNewsletterSubscribers(1, searchTerm);
}

/**
 * Change contact page
 */
function changeContactPage(direction) {
    const newPage = currentContactPage + direction;
    if (newPage >= 1) {
        loadContactSubmissions(newPage, contactSearchTerm);
    }
}

/**
 * Change subscriber page
 */
function changeSubscriberPage(direction) {
    const newPage = currentSubscriberPage + direction;
    if (newPage >= 1) {
        loadNewsletterSubscribers(newPage, subscriberSearchTerm);
    }
}

/**
 * Update contact pagination controls
 */
function updateContactPagination(pagination) {
    const prevBtn = document.getElementById('contactPrevBtn');
    const nextBtn = document.getElementById('contactNextBtn');
    const pageInfo = document.getElementById('contactPageInfo');
    
    prevBtn.disabled = pagination.page <= 1;
    nextBtn.disabled = pagination.page >= pagination.totalPages;
    pageInfo.textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
}

/**
 * Update subscriber pagination controls
 */
function updateSubscriberPagination(pagination) {
    const prevBtn = document.getElementById('subscriberPrevBtn');
    const nextBtn = document.getElementById('subscriberNextBtn');
    const pageInfo = document.getElementById('subscriberPageInfo');
    
    prevBtn.disabled = pagination.page <= 1;
    nextBtn.disabled = pagination.page >= pagination.totalPages;
    pageInfo.textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
}

/**
 * Close contact modal
 */
function closeContactModal() {
    const modal = document.getElementById('contactDetailModal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
    currentContactSubmission = null;
}

/**
 * Get status class for styling
 */
function getStatusClass(status) {
    switch (status) {
        case 'New':
            return 'status-new';
        case 'Read':
            return 'status-read';
        case 'Responded':
            return 'status-responded';
        case 'Archived':
            return 'status-archived';
        default:
            return 'status-default';
    }
}

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '...';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show success message
 */
function showSuccess(message) {
    // You can implement a toast notification system here
    alert(message); // Simple implementation for now
}

/**
 * Show error message
 */
function showError(message) {
    // You can implement a toast notification system here
    alert('Error: ' + message); // Simple implementation for now
}

/**
 * Logout function
 */
function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = 'login.html';
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('contactDetailModal');
    if (event.target === modal) {
        closeContactModal();
    }
});
