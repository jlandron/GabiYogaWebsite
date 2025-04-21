/**
 * Admin Retreats Management JavaScript
 * 
 * This file handles the retreats management functionality in the admin portal.
 * It allows adding, editing, and managing retreats and their registrations.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in and is admin
    if (!UserService.isLoggedIn() || !UserService.isAdmin()) {
        window.location.href = 'login.html';
        return;
    }

    // Initialize the retreats page
    await initializeRetreatsPage();

    // Setup action buttons
    const viewPublishedBtn = document.getElementById('view-published-btn');
    const addRetreatBtn = document.getElementById('add-retreat-btn');
    const retreatFilter = document.getElementById('retreat-filter');

    if (viewPublishedBtn) {
        viewPublishedBtn.addEventListener('click', () => {
            window.open('dashboard.html#retreats', '_blank');
        });
    }

    if (addRetreatBtn) {
        addRetreatBtn.addEventListener('click', () => {
            openRetreatModal();
        });
    }

    if (retreatFilter) {
        retreatFilter.addEventListener('change', () => {
            loadUpcomingRetreats();
        });
    }

    // Setup retreat slug generation from title
    const retreatTitleInput = document.getElementById('retreat-title');
    const retreatSlugInput = document.getElementById('retreat-slug');
    
    if (retreatTitleInput && retreatSlugInput) {
        retreatTitleInput.addEventListener('input', () => {
            // Only auto-generate slug if it's empty or was auto-generated before
            if (!retreatSlugInput.dataset.manuallyEdited || retreatSlugInput.value === '') {
                retreatSlugInput.value = generateSlug(retreatTitleInput.value);
            }
        });
        
        // Track if user manually edits the slug
        retreatSlugInput.addEventListener('input', () => {
            retreatSlugInput.dataset.manuallyEdited = 'true';
        });
    }
    
    // Setup tabs in retreat form
    setupTabNavigation();
});

/**
 * Setup tab navigation in the retreat form
 */
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Remove active class from all buttons
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabId).classList.add('active');
            
            // Add active class to clicked button
            button.classList.add('active');
        });
    });
}

/**
 * Initialize the retreats page
 */
async function initializeRetreatsPage() {
    try {
        // Load upcoming retreats
        await loadUpcomingRetreats();
        
        // Load past retreats
        await loadPastRetreats();
    } catch (error) {
        console.error('Error initializing retreats page:', error);
        showErrorMessage('Failed to initialize retreats. Please refresh the page and try again.');
    }
}

/**
 * Load upcoming retreats
 */
async function loadUpcomingRetreats() {
    try {
        showTableLoading('retreats-table');
        
        // Get filter value
        const filterValue = document.getElementById('retreat-filter')?.value || 'all';
        
        // Use AdminApiService to fetch retreats
        const response = await AdminApiService.authRequest('/api/admin/retreats', 'GET');
        if (!response.success) {
            throw new Error(response.message || 'Failed to fetch retreats');
        }
        
        let retreats = response.retreats || [];
        
        // Filter retreats by date to get upcoming ones
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        retreats = retreats.filter(retreat => {
            const retreatEndDate = new Date(retreat.end_date);
            return retreatEndDate >= today;
        });
        
        // Apply additional filters based on selection
        if (filterValue === 'active') {
            retreats = retreats.filter(retreat => retreat.active);
        } else if (filterValue === 'draft') {
            retreats = retreats.filter(retreat => !retreat.active);
        }
        
        // Sort by date (earliest first)
        retreats.sort((a, b) => {
            const dateA = new Date(a.start_date);
            const dateB = new Date(b.start_date);
            return dateA - dateB;
        });
        
        // Render retreats table
        renderUpcomingRetreatsTable(retreats);
    } catch (error) {
        console.error('Error loading upcoming retreats:', error);
        showErrorMessage('Failed to load upcoming retreats. Please try again.');
    }
}

/**
 * Render upcoming retreats table
 */
function renderUpcomingRetreatsTable(retreats) {
    const tbody = document.querySelector('#retreats-table tbody');
    if (!tbody) return;
    
    if (!retreats || retreats.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center;padding:20px;">
                    No upcoming retreats available.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = retreats.map(retreat => {
        // Format dates
        const startDate = new Date(retreat.start_date);
        const endDate = new Date(retreat.end_date);
        
        const formattedStartDate = formatDateForDisplay(startDate);
        const formattedEndDate = formatDateForDisplay(endDate);
        const dateRange = `
            <span class="date-range">
                ${formattedStartDate}
                <span class="date-separator">to</span>
                ${formattedEndDate}
            </span>
        `;
        
        // Calculate registrations/capacity
        const registrationCount = retreat.registration_count || 0;
        const capacityDisplay = `${registrationCount}/${retreat.capacity}`;
        
        // Determine status tag
        let statusTag;
        if (retreat.active) {
            statusTag = `
                <span class="admin-tag green">
                    <span class="status-indicator active"></span> Published
                </span>
            `;
        } else {
            statusTag = `
                <span class="admin-tag yellow">
                    <span class="status-indicator draft"></span> Draft
                </span>
            `;
        }
        
        // Determine featured tag
        let featuredTag;
        if (retreat.featured) {
            featuredTag = `
                <span class="featured-badge">
                    <i class="fas fa-star"></i> Featured
                </span>
            `;
        } else {
            featuredTag = `
                <span class="not-featured">Not featured</span>
            `;
        }
        
        return `
            <tr>
                <td>${retreat.title}</td>
                <td>${dateRange}</td>
                <td>${retreat.location}</td>
                <td>${retreat.capacity}</td>
                <td>${capacityDisplay}</td>
                <td>${statusTag}</td>
                <td>${featuredTag}</td>
                <td class="admin-table-actions">
                    <button class="view-registrations" data-id="${retreat.retreat_id}" title="View Registrations">
                        <i class="fas fa-users"></i>
                    </button>
                    <button class="toggle-featured" data-id="${retreat.retreat_id}" data-featured="${retreat.featured ? 'true' : 'false'}" title="${retreat.featured ? 'Remove from featured' : 'Add to featured'}">
                        <i class="fas ${retreat.featured ? 'fa-star-half-alt' : 'fa-star'}"></i>
                    </button>
                    <button class="edit-retreat" data-id="${retreat.retreat_id}" title="Edit Retreat">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-retreat" data-id="${retreat.retreat_id}" title="Delete Retreat">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners for retreat actions
    setupUpcomingRetreatActionListeners();
}

/**
 * Setup upcoming retreat action listeners
 */
function setupUpcomingRetreatActionListeners() {
    // View registrations
    document.querySelectorAll('.view-registrations').forEach(button => {
        button.addEventListener('click', () => {
            const retreatId = button.getAttribute('data-id');
            viewRetreatRegistrations(retreatId);
        });
    });
    
    // Toggle featured status
    document.querySelectorAll('.toggle-featured').forEach(button => {
        button.addEventListener('click', async () => {
            const retreatId = button.getAttribute('data-id');
            try {
                await toggleRetreatFeatured(retreatId);
                // Reload retreats to reflect changes
                await loadUpcomingRetreats();
            } catch (error) {
                showErrorMessage('Failed to update featured status');
            }
        });
    });
    
    // Edit retreat
    document.querySelectorAll('.edit-retreat').forEach(button => {
        button.addEventListener('click', () => {
            const retreatId = button.getAttribute('data-id');
            editRetreat(retreatId);
        });
    });
    
    // Delete retreat
    document.querySelectorAll('.delete-retreat').forEach(button => {
        button.addEventListener('click', () => {
            const retreatId = button.getAttribute('data-id');
            deleteRetreat(retreatId);
        });
    });
}

/**
 * Load past retreats
 */
async function loadPastRetreats() {
    try {
        showTableLoading('past-retreats-table');
        
        // Use AdminApiService to fetch retreats
        const response = await AdminApiService.authRequest('/api/admin/retreats', 'GET');
        if (!response.success) {
            throw new Error(response.message || 'Failed to fetch retreats');
        }
        
        let retreats = response.retreats || [];
        
        // Filter retreats by date to get past ones
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        retreats = retreats.filter(retreat => {
            const retreatEndDate = new Date(retreat.end_date);
            return retreatEndDate < today;
        });
        
        // Sort by date (most recent first)
        retreats.sort((a, b) => {
            const dateA = new Date(a.end_date);
            const dateB = new Date(b.end_date);
            return dateB - dateA;
        });
        
        // Render past retreats table
        renderPastRetreatsTable(retreats);
    } catch (error) {
        console.error('Error loading past retreats:', error);
        showErrorMessage('Failed to load past retreats. Please try again.');
    }
}

/**
 * Render past retreats table
 */
function renderPastRetreatsTable(retreats) {
    const tbody = document.querySelector('#past-retreats-table tbody');
    if (!tbody) return;
    
    if (!retreats || retreats.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:20px;">
                    No past retreats available.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = retreats.map(retreat => {
        // Format dates
        const startDate = new Date(retreat.start_date);
        const endDate = new Date(retreat.end_date);
        
        const formattedStartDate = formatDateForDisplay(startDate);
        const formattedEndDate = formatDateForDisplay(endDate);
        const dateRange = `
            <span class="date-range">
                ${formattedStartDate}
                <span class="date-separator">to</span>
                ${formattedEndDate}
            </span>
        `;
        
        // Calculate registrations/capacity
        const registrationCount = retreat.registration_count || 0;
        const capacityDisplay = `${registrationCount}/${retreat.capacity}`;
        
        return `
            <tr>
                <td>${retreat.title}</td>
                <td>${dateRange}</td>
                <td>${retreat.location}</td>
                <td>${retreat.capacity}</td>
                <td>${capacityDisplay}</td>
                <td class="admin-table-actions">
                    <button class="view-registrations" data-id="${retreat.retreat_id}" title="View Registrations">
                        <i class="fas fa-users"></i>
                    </button>
                    <button class="duplicate-retreat" data-id="${retreat.retreat_id}" title="Duplicate Retreat">
                        <i class="fas fa-copy"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners for past retreat actions
    setupPastRetreatActionListeners();
}

/**
 * Setup past retreat action listeners
 */
function setupPastRetreatActionListeners() {
    // View registrations
    document.querySelectorAll('#past-retreats-table .view-registrations').forEach(button => {
        button.addEventListener('click', () => {
            const retreatId = button.getAttribute('data-id');
            viewRetreatRegistrations(retreatId);
        });
    });
    
    // Duplicate retreat
    document.querySelectorAll('.duplicate-retreat').forEach(button => {
        button.addEventListener('click', () => {
            const retreatId = button.getAttribute('data-id');
            duplicateRetreat(retreatId);
        });
    });
}

/**
 * View retreat registrations
 */
async function viewRetreatRegistrations(retreatId) {
    try {
        // Show loading message
        showSuccessMessage('Loading retreat registrations...');
        
        // Fetch retreat details
        const retreat = await getRetreatById(retreatId);
        if (!retreat) {
            showErrorMessage('Retreat not found');
            return;
        }
        
        // Fetch retreat registrations
        const registrations = await getRetreatRegistrations(retreatId);
        
        // Open registrations modal
        openRegistrationsModal(retreat, registrations);
    } catch (error) {
        console.error('Error viewing retreat registrations:', error);
        showErrorMessage('Failed to load retreat registrations');
    }
}

/**
 * Get retreat by ID
 */
async function getRetreatById(retreatId) {
    try {
        const response = await AdminApiService.authRequest(`/api/admin/retreats/${retreatId}`, 'GET');
        if (!response.success) {
            throw new Error(response.message || 'Failed to fetch retreat');
        }
        
        return response.retreat;
    } catch (error) {
        console.error('Error getting retreat by ID:', error);
        throw error;
    }
}

/**
 * Toggle retreat featured status
 */
async function toggleRetreatFeatured(retreatId) {
    try {
        const response = await AdminApiService.authRequest(`/api/admin/retreats/${retreatId}/featured`, 'PUT');
        if (!response.success) {
            throw new Error(response.message || 'Failed to update featured status');
        }
        
        const featuredStatus = response.retreat.featured ? 'featured' : 'unfeatured';
        showSuccessMessage(`Retreat ${featuredStatus} successfully`);
        
        return response.retreat;
    } catch (error) {
        console.error('Error toggling retreat featured status:', error);
        throw error;
    }
}

/**
 * Get retreat registrations
 */
async function getRetreatRegistrations(retreatId) {
    try {
        const response = await AdminApiService.authRequest(`/api/admin/retreats/${retreatId}/registrations`, 'GET');
        if (!response.success) {
            throw new Error(response.message || 'Failed to fetch retreat registrations');
        }
        
        return response.registrations || [];
    } catch (error) {
        console.error('Error getting retreat registrations:', error);
        throw error;
    }
}

/**
 * Open registrations modal
 */
function openRegistrationsModal(retreat, registrations) {
    const modal = document.getElementById('registrations-modal');
    const modalTitle = document.getElementById('registrations-modal-title');
    const retreatDetails = document.getElementById('retreat-details');
    const registrationsTable = document.getElementById('registrations-table');
    
    if (!modal || !modalTitle || !retreatDetails || !registrationsTable) return;
    
    // Set modal title
    modalTitle.textContent = `Registrations: ${retreat.title}`;
    
    // Format dates
    const startDate = new Date(retreat.start_date);
    const endDate = new Date(retreat.end_date);
    
    const formattedStartDate = startDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
    });
    
    const formattedEndDate = endDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
    });
    
    // Calculate duration in days
    const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    // Display retreat details
    retreatDetails.innerHTML = `
        <div class="retreat-detail-row">
            <strong>Dates:</strong> ${formattedStartDate} to ${formattedEndDate} (${durationDays} days)
        </div>
        <div class="retreat-detail-row">
            <strong>Location:</strong> ${retreat.location}${retreat.venue_name ? ` - ${retreat.venue_name}` : ''}
        </div>
        <div class="retreat-detail-row">
            <strong>Price:</strong> $${retreat.price}${retreat.member_price ? ` (Members: $${retreat.member_price})` : ''}
        </div>
        <div class="retreat-detail-row">
            <strong>Registrations:</strong> ${registrations.length} / ${retreat.capacity}
        </div>
    `;
    
    // Display registrations
    const tbody = registrationsTable.querySelector('tbody');
    if (!tbody) return;
    
    if (!registrations || registrations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;padding:20px;">
                    No registrations for this retreat yet.
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = registrations.map(reg => {
            // Format registration date
            const regDate = new Date(reg.registration_date);
            const formattedRegDate = regDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            });
            
            // Format payment status
            let paymentStatusClass = '';
            switch (reg.payment_status) {
                case 'Deposit Paid':
                    paymentStatusClass = 'deposit';
                    break;
                case 'Partial Payment':
                    paymentStatusClass = 'partial';
                    break;
                case 'Full Payment':
                    paymentStatusClass = 'full';
                    break;
                case 'Pending':
                    paymentStatusClass = 'pending';
                    break;
                case 'Refunded':
                    paymentStatusClass = 'refunded';
                    break;
                case 'Cancelled':
                    paymentStatusClass = 'cancelled';
                    break;
            }
            
            const paymentStatusTag = `<span class="payment-status ${paymentStatusClass}">${reg.payment_status}</span>`;
            
            // Format monetary values
            const amountPaid = reg.amount_paid ? `$${reg.amount_paid.toFixed(2)}` : '$0.00';
            const balanceDue = reg.balance_due ? `$${reg.balance_due.toFixed(2)}` : '$0.00';
            
            return `
                <tr>
                    <td>${reg.user_name}</td>
                    <td>${reg.email}</td>
                    <td>${formattedRegDate}</td>
                    <td>${paymentStatusTag}</td>
                    <td>${amountPaid}</td>
                    <td>${balanceDue}</td>
                    <td class="admin-table-actions">
                        <button class="update-payment" data-id="${reg.registration_id}" title="Update Payment">
                            <i class="fas fa-money-bill-wave"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Add event listeners for registration actions
        setupRegistrationActionListeners();
    }
    
    // Setup export button
    const exportButton = document.getElementById('export-registrations');
    if (exportButton) {
        exportButton.onclick = () => exportRegistrations(retreat, registrations);
    }
    
    // Show modal
    modal.style.display = 'block';
    
    // Close modal when clicking X
    modal.querySelector('.admin-modal-close').onclick = () => {
        modal.style.display = 'none';
    };
    
    // Close modal when clicking Cancel/Close
    modal.querySelector('.admin-modal-cancel').onclick = () => {
        modal.style.display = 'none';
    };
    
    // Close modal when clicking outside
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

/**
 * Setup registration action listeners
 */
function setupRegistrationActionListeners() {
    // Update payment status
    document.querySelectorAll('.update-payment').forEach(button => {
        button.addEventListener('click', () => {
            const registrationId = button.getAttribute('data-id');
            openPaymentModal(registrationId);
        });
    });
}

/**
 * Open payment modal
 */
function openPaymentModal(registrationId) {
    const modal = document.getElementById('payment-modal');
    const form = document.getElementById('payment-form');
    
    if (!modal || !form) return;
    
    // Set registration ID in hidden field
    document.getElementById('registration-id').value = registrationId;
    
    // Show modal
    modal.style.display = 'block';
    
    // Handle form submission
    form.onsubmit = async (e) => {
        e.preventDefault();
        await updatePaymentStatus(form);
    };
    
    // Close modal when clicking X
    modal.querySelector('.admin-modal-close').onclick = () => {
        modal.style.display = 'none';
    };
    
    // Close modal when clicking Cancel
    modal.querySelector('.admin-modal-cancel').onclick = () => {
        modal.style.display = 'none';
    };
    
    // Close modal when clicking outside
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

/**
 * Update registration payment status
 */
async function updatePaymentStatus(form) {
    try {
        const formData = new FormData(form);
        const registrationId = formData.get('registration_id');
        const status = formData.get('status');
        const amountPaid = parseFloat(formData.get('amountPaid'));
        const balanceDue = parseFloat(formData.get('balanceDue'));
        
        const response = await AdminApiService.authRequest(
            `/api/admin/retreats/registrations/${registrationId}/payment`,
            'PUT',
            { status, amountPaid, balanceDue }
        );
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to update payment status');
        }
        
        // Hide payment modal
        document.getElementById('payment-modal').style.display = 'none';
        
        showSuccessMessage('Payment status updated successfully');
        
        // Refresh registrations by re-fetching the retreat ID from the current view
        const currentRetreatId = document.querySelector('.view-registrations')?.getAttribute('data-id');
        if (currentRetreatId) {
            await viewRetreatRegistrations(currentRetreatId);
        }
        
    } catch (error) {
        console.error('Error updating payment status:', error);
        showErrorMessage('Failed to update payment status');
    }
}

/**
 * Export registrations to CSV
 */
function exportRegistrations(retreat, registrations) {
    // Format date for filename
    const startDate = new Date(retreat.start_date);
    const formattedDate = `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${startDate.getDate().toString().padStart(2, '0')}`;
    
    // Create CSV content
    let csvContent = 'Name,Email,Registration Date,Payment Status,Amount Paid,Balance Due,Special Requests,Dietary Restrictions,Emergency Contact\n';
    
    registrations.forEach(reg => {
        const name = `"${reg.user_name}"`;
        const email = `"${reg.email}"`;
        const regDate = new Date(reg.registration_date).toLocaleDateString('en-US');
        const paymentStatus = reg.payment_status;
        const amountPaid = reg.amount_paid ? `$${reg.amount_paid}` : 'N/A';
        const balanceDue = reg.balance_due ? `$${reg.balance_due}` : 'N/A';
        const specialRequests = reg.special_requests ? `"${reg.special_requests.replace(/"/g, '""')}"` : '';
        const dietaryRestrictions = reg.dietary_restrictions ? `"${reg.dietary_restrictions.replace(/"/g, '""')}"` : '';
        const emergencyContact = reg.emergency_contact ? `"${reg.emergency_contact.replace(/"/g, '""')}"` : '';
        
        csvContent += `${name},${email},${regDate},${paymentStatus},${amountPaid},${balanceDue},${specialRequests},${dietaryRestrictions},${emergencyContact}\n`;
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${formattedDate}-${generateSlug(retreat.title)}-registrations.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Open retreat modal for creating or editing
 */
function openRetreatModal(retreatData = null) {
    const modal = document.getElementById('retreat-modal');
    const form = document.getElementById('retreat-form');
    const modalTitle = document.getElementById('retreat-modal-title');
    
    if (!modal || !form) return;
    
    // Reset form
    form.reset();
    
    // Reset slug manual edit tracking
    document.getElementById('retreat-slug').dataset.manuallyEdited = 'false';
    
    // Reset tabs to first tab
    document.querySelector('.tab-btn.active')?.classList.remove('active');
    document.querySelector('.tab-content.active')?.classList.remove('active');
    document.querySelector('.tab-btn[data-tab="basic-info"]').classList.add('active');
    document.getElementById('basic-info').classList.add('active');
    
    // Set modal title and populate form if editing
    if (retreatData) {
        modalTitle.textContent = 'Edit Retreat';
        document.getElementById('retreat-id').value = retreatData.retreat_id;
        
        // Set a minimum date that's either today or the retreat date
        const today = new Date();
        const retreatStartDate = new Date(retreatData.start_date);
        const retreatEndDate = new Date(retreatData.end_date);
        
        // Populate form with retreat data
        document.getElementById('retreat-title').value = retreatData.title;
        document.getElementById('retreat-subtitle').value = retreatData.subtitle || '';
        document.getElementById('retreat-start-date').value = formatDateForInput(retreatStartDate);
        document.getElementById('retreat-end-date').value = formatDateForInput(retreatEndDate);
        document.getElementById('retreat-location').value = retreatData.location;
        document.getElementById('retreat-venue').value = retreatData.venue_name || '';
        document.getElementById('retreat-capacity').value = retreatData.capacity;
        document.getElementById('retreat-instructors').value = retreatData.instructors;
        document.getElementById('retreat-description').value = retreatData.description;
        document.getElementById('retreat-itinerary').value = retreatData.detailed_itinerary || '';
        document.getElementById('retreat-accommodations').value = retreatData.accommodations || '';
        document.getElementById('retreat-included').value = retreatData.included_items || '';
        document.getElementById('retreat-price').value = retreatData.price;
        document.getElementById('retreat-member-price').value = retreatData.member_price || '';
        document.getElementById('retreat-early-bird').value = retreatData.early_bird_price || '';
        
        if (retreatData.early_bird_deadline) {
            document.getElementById('retreat-early-bird-deadline').value = formatDateForInput(new Date(retreatData.early_bird_deadline));
        }
        
        document.getElementById('retreat-deposit').value = retreatData.deposit_amount || '';
        document.getElementById('retreat-image').value = retreatData.image_url || '';
        document.getElementById('retreat-gallery').value = retreatData.gallery_images || '';
        document.getElementById('retreat-slug').value = retreatData.retreat_slug;
        document.getElementById('retreat-active').checked = retreatData.active;
        document.getElementById('retreat-featured').checked = retreatData.featured;
        
        // Mark slug as manually edited to prevent auto-generation when editing title
        document.getElementById('retreat-slug').dataset.manuallyEdited = 'true';
    } else {
        modalTitle.textContent = 'Add New Retreat';
        document.getElementById('retreat-id').value = '';
        
        // Set the date fields to today and a week from today
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        
        document.getElementById('retreat-start-date').value = formatDateForInput(nextWeek);
        
        // Default end date (start date + 5 days)
        const endDate = new Date(nextWeek);
        endDate.setDate(nextWeek.getDate() + 5);
        document.getElementById('retreat-end-date').value = formatDateForInput(endDate);
    }
    
    // Show modal
    modal.style.display = 'block';
    
    // Handle form submission
    form.onsubmit = async (e) => {
        e.preventDefault();
        await saveRetreat(form);
    };
    
    // Close modal when clicking X
    modal.querySelector('.admin-modal-close').onclick = () => {
        modal.style.display = 'none';
    };
    
    // Close modal when clicking Cancel
    modal.querySelector('.admin-modal-cancel').onclick = () => {
        modal.style.display = 'none';
    };
    
    // Close modal when clicking outside
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

/**
 * Save retreat data
 */
async function saveRetreat(form) {
    try {
        const formData = new FormData(form);
        const retreatId = formData.get('retreat_id');
        
        // Get numerical values
        const price = parseFloat(formData.get('price'));
        const memberPrice = formData.get('member_price') ? parseFloat(formData.get('member_price')) : null;
        const earlyBirdPrice = formData.get('early_bird_price') ? parseFloat(formData.get('early_bird_price')) : null;
        const depositAmount = formData.get('deposit_amount') ? parseFloat(formData.get('deposit_amount')) : null;
        const capacity = parseInt(formData.get('capacity'));
        
        // Prepare gallery images JSON
        let galleryImages = formData.get('gallery_images');
        if (galleryImages && galleryImages.trim()) {
            try {
                // If it's not valid JSON, make it a JSON array
                if (!galleryImages.trim().startsWith('[') && !galleryImages.trim().startsWith('{')) {
                    galleryImages = JSON.stringify(galleryImages.split(',').map(url => url.trim()));
                }
                // Otherwise validate that it's proper JSON
                else {
                    JSON.parse(galleryImages);
                }
            } catch (e) {
                // If there's an error parsing JSON, use empty array
                galleryImages = '[]';
            }
        } else {
            galleryImages = '[]';
        }
        
        // Prepare retreat data
        const retreatData = {
            title: formData.get('title'),
            subtitle: formData.get('subtitle'),
            description: formData.get('description'),
            detailed_itinerary: formData.get('detailed_itinerary'),
            accommodations: formData.get('accommodations'),
            included_items: formData.get('included_items'),
            start_date: formData.get('start_date'),
            end_date: formData.get('end_date'),
            location: formData.get('location'),
            venue_name: formData.get('venue_name'),
            price,
            member_price: memberPrice,
            early_bird_price: earlyBirdPrice,
            early_bird_deadline: formData.get('early_bird_deadline') || null,
            deposit_amount: depositAmount,
            capacity,
            instructors: formData.get('instructors'),
            image_url: formData.get('image_url') || null,
            gallery_images: galleryImages,
            retreat_slug: formData.get('retreat_slug'),
            active: formData.get('active') === 'on',
            featured: formData.get('featured') === 'on'
        };
        
        let response;
        
        if (retreatId) {
            // Update existing retreat
            response = await AdminApiService.authRequest(
                `/api/admin/retreats/${retreatId}`,
                'PUT',
                retreatData
            );
        } else {
            // Create new retreat
            response = await AdminApiService.authRequest(
                '/api/admin/retreats',
                'POST',
                retreatData
            );
        }
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to save retreat');
        }
        
        // Hide modal
        document.getElementById('retreat-modal').style.display = 'none';
        
        // Show success message
        const actionText = retreatId ? 'updated' : 'created';
        showSuccessMessage(`Retreat ${actionText} successfully`);
        
        // Reload retreats
        await loadUpcomingRetreats();
        await loadPastRetreats();
    } catch (error) {
        console.error('Error saving retreat:', error);
        showErrorMessage(`Failed to save retreat: ${error.message}`);
    }
}

/**
 * Edit a retreat
 */
async function editRetreat(retreatId) {
    try {
        // Show loading message
        showSuccessMessage('Loading retreat data...');
        
        // Fetch retreat data
        const retreat = await getRetreatById(retreatId);
        
        if (retreat) {
            openRetreatModal(retreat);
        } else {
            showErrorMessage('Retreat not found');
        }
    } catch (error) {
        console.error('Error editing retreat:', error);
        showErrorMessage('Failed to load retreat data');
    }
}

/**
 * Delete a retreat
 */
async function deleteRetreat(retreatId) {
    if (confirm('Are you sure you want to delete this retreat? This action cannot be undone.')) {
        try {
            const response = await AdminApiService.authRequest(
                `/api/admin/retreats/${retreatId}`,
                'DELETE'
            );
            
            if (!response.success) {
                throw new Error(response.message || 'Failed to delete retreat');
            }
            
            showSuccessMessage('Retreat deleted successfully');
            
            // Reload retreats to reflect the changes
            await loadUpcomingRetreats();
            await loadPastRetreats();
        } catch (error) {
            console.error('Error deleting retreat:', error);
            showErrorMessage(`Failed to delete retreat: ${error.message}`);
        }
    }
}

/**
 * Duplicate a retreat
 */
async function duplicateRetreat(retreatId) {
    try {
        // Show loading message
        showSuccessMessage('Preparing to duplicate retreat...');
        
        // Fetch original retreat data
        const originalRetreat = await getRetreatById(retreatId);
        
        if (!originalRetreat) {
            showErrorMessage('Retreat not found');
            return;
        }
        
        // Create duplicate with modifications
        const duplicateData = { ...originalRetreat };
        
        // Remove ID and set as draft
        delete duplicateData.retreat_id;
        duplicateData.active = false;
        duplicateData.featured = false;
        
        // Update title to indicate it's a copy
        duplicateData.title = `${duplicateData.title} (Copy)`;
        
        // Generate new slug
        duplicateData.retreat_slug = generateSlug(duplicateData.title);
        
        // Set future dates (1 year later than the original)
        const originalStartDate = new Date(duplicateData.start_date);
        const originalEndDate = new Date(duplicateData.end_date);
        
        const newStartDate = new Date(originalStartDate);
        newStartDate.setFullYear(newStartDate.getFullYear() + 1);
        
        const newEndDate = new Date(originalEndDate);
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        
        // Ensure the new dates are in the future
        const today = new Date();
        if (newStartDate < today) {
            // If adding a year still puts it in the past, schedule for next month
            newStartDate.setDate(today.getDate() + 30);
            
            // Calculate new end date based on original duration
            const duration = originalEndDate.getTime() - originalStartDate.getTime();
            newEndDate.setTime(newStartDate.getTime() + duration);
        }
        
        duplicateData.start_date = formatDateForInput(newStartDate);
        duplicateData.end_date = formatDateForInput(newEndDate);
        
        // Open modal with duplicate data
        openRetreatModal(duplicateData);
    } catch (error) {
        console.error('Error duplicating retreat:', error);
        showErrorMessage('Failed to duplicate retreat');
    }
}

/**
 * Generate URL-friendly slug from string
 */
function generateSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
}

/**
 * Format date for display
 */
function formatDateForDisplay(date) {
    if (!date) return '';
    
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

/**
 * Format date for input field (YYYY-MM-DD)
 */
function formatDateForInput(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

/**
 * Show loading spinner in a table
 */
function showTableLoading(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    const columnCount = table.querySelectorAll('thead th').length || 5;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="${columnCount}" style="text-align:center;padding:30px;">
                <i class="fas fa-spinner fa-spin"></i> Loading data...
            </td>
        </tr>
    `;
}

/**
 * Show error message
 */
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'admin-error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    const content = document.querySelector('.admin-content');
    if (content) {
        content.prepend(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'admin-success-message';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    
    const content = document.querySelector('.admin-content');
    if (content) {
        content.prepend(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 5000);
    }
}
