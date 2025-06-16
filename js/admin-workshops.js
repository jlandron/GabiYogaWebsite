/**
 * Admin Workshops Management JavaScript
 * 
 * This file handles the workshops management functionality in the admin portal.
 * It allows adding, editing, and managing workshops and their registrations.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Use centralized authentication handler for admin pages
    const authenticated = await AuthHandler.initAdminPage();
    if (!authenticated) {
        return; // AuthHandler will have already redirected as needed
    }

    // Initialize the workshops page
    await initializeWorkshopsPage();

    // Setup action buttons
    const viewPublishedBtn = document.getElementById('view-published-btn');
    const addWorkshopBtn = document.getElementById('add-workshop-btn');
    const workshopFilter = document.getElementById('workshop-filter');

    if (viewPublishedBtn) {
        viewPublishedBtn.addEventListener('click', () => {
            window.open('dashboard.html#workshops', '_blank');
        });
    }

    if (addWorkshopBtn) {
        addWorkshopBtn.addEventListener('click', () => {
            openWorkshopModal();
        });
    }

    if (workshopFilter) {
        workshopFilter.addEventListener('change', () => {
            loadUpcomingWorkshops();
        });
    }

    // Setup workshop slug generation from title
    const workshopTitleInput = document.getElementById('workshop-title');
    const workshopSlugInput = document.getElementById('workshop-slug');
    
    if (workshopTitleInput && workshopSlugInput) {
        workshopTitleInput.addEventListener('input', () => {
            // Only auto-generate slug if it's empty or was auto-generated before
            if (!workshopSlugInput.dataset.manuallyEdited || workshopSlugInput.value === '') {
                workshopSlugInput.value = generateSlug(workshopTitleInput.value);
            }
        });
        
        // Track if user manually edits the slug
        workshopSlugInput.addEventListener('input', () => {
            workshopSlugInput.dataset.manuallyEdited = 'true';
        });
    }
});

/**
 * Initialize the workshops page
 */
async function initializeWorkshopsPage() {
    try {
        // Load upcoming workshops
        await loadUpcomingWorkshops();
        
        // Load past workshops
        await loadPastWorkshops();
    } catch (error) {
        console.error('Error initializing workshops page:', error);
        showErrorMessage('Failed to initialize workshops. Please refresh the page and try again.');
    }
}

/**
 * Load upcoming workshops
 */
async function loadUpcomingWorkshops() {
    try {
        showTableLoading('workshops-table');
        
        // Get filter value
        const filterValue = document.getElementById('workshop-filter')?.value || 'all';
        
        // Use AdminApiService to fetch workshops
        const response = await AdminApiService.authRequest('/api/admin/workshops', 'GET');
        if (!response.success) {
            throw new Error(response.message || 'Failed to fetch workshops');
        }
        
        let workshops = response.workshops || [];
        
        // Filter workshops by date to get upcoming ones
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        workshops = workshops.filter(workshop => {
            const workshopDate = new Date(workshop.date);
            return workshopDate >= today;
        });
        
        // Apply additional filters based on selection
        if (filterValue === 'active') {
            workshops = workshops.filter(workshop => workshop.active);
        } else if (filterValue === 'draft') {
            workshops = workshops.filter(workshop => !workshop.active);
        }
        
        // Sort by date (earliest first)
        workshops.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA - dateB;
        });
        
        // Render workshops table
        renderUpcomingWorkshopsTable(workshops);
    } catch (error) {
        console.error('Error loading upcoming workshops:', error);
        showErrorMessage('Failed to load upcoming workshops. Please try again.');
    }
}

/**
 * Render upcoming workshops table
 */
function renderUpcomingWorkshopsTable(workshops) {
    const tbody = document.querySelector('#workshops-table tbody');
    if (!tbody) return;
    
    if (!workshops || workshops.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center;padding:20px;">
                    No upcoming workshops available.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = workshops.map(workshop => {
        // Format date
        const date = new Date(workshop.date);
        const formattedDate = date.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
        
        // Format time
        const startTime = formatTimeFromDB(workshop.start_time);
        const endTime = formatTimeFromDB(workshop.end_time);
        const timeRange = `${startTime} - ${endTime}`;
        
        // Calculate registrations/capacity
        const registrationCount = workshop.registration_count || 0;
        const capacityDisplay = `${registrationCount}/${workshop.capacity}`;
        
        // Determine status tag
        let statusTag;
        if (workshop.active) {
            statusTag = `<span class="admin-tag green">Published</span>`;
        } else {
            statusTag = `<span class="admin-tag yellow">Draft</span>`;
        }
        
        return `
            <tr>
                <td>${workshop.title}</td>
                <td>${formattedDate}</td>
                <td>${timeRange}</td>
                <td>${workshop.instructor}</td>
                <td>${workshop.capacity}</td>
                <td>${capacityDisplay}</td>
                <td>${statusTag}</td>
                <td class="admin-table-actions">
                    <button class="view-registrations" data-id="${workshop.workshop_id}" title="View Registrations">
                        <i class="fas fa-users"></i>
                    </button>
                    <button class="edit-workshop" data-id="${workshop.workshop_id}" title="Edit Workshop">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-workshop" data-id="${workshop.workshop_id}" title="Delete Workshop">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners for workshop actions
    setupUpcomingWorkshopActionListeners();
}

/**
 * Setup upcoming workshop action listeners
 */
function setupUpcomingWorkshopActionListeners() {
    // View registrations
    document.querySelectorAll('.view-registrations').forEach(button => {
        button.addEventListener('click', () => {
            const workshopId = button.getAttribute('data-id');
            viewWorkshopRegistrations(workshopId);
        });
    });
    
    // Edit workshop
    document.querySelectorAll('.edit-workshop').forEach(button => {
        button.addEventListener('click', () => {
            const workshopId = button.getAttribute('data-id');
            editWorkshop(workshopId);
        });
    });
    
    // Delete workshop
    document.querySelectorAll('.delete-workshop').forEach(button => {
        button.addEventListener('click', () => {
            const workshopId = button.getAttribute('data-id');
            deleteWorkshop(workshopId);
        });
    });
}

/**
 * Load past workshops
 */
async function loadPastWorkshops() {
    try {
        showTableLoading('past-workshops-table');
        
        // Use AdminApiService to fetch workshops
        const response = await AdminApiService.authRequest('/api/admin/workshops', 'GET');
        if (!response.success) {
            throw new Error(response.message || 'Failed to fetch workshops');
        }
        
        let workshops = response.workshops || [];
        
        // Filter workshops by date to get past ones
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        workshops = workshops.filter(workshop => {
            const workshopDate = new Date(workshop.date);
            return workshopDate < today;
        });
        
        // Sort by date (most recent first)
        workshops.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB - dateA;
        });
        
        // Render past workshops table
        renderPastWorkshopsTable(workshops);
    } catch (error) {
        console.error('Error loading past workshops:', error);
        showErrorMessage('Failed to load past workshops. Please try again.');
    }
}

/**
 * Render past workshops table
 */
function renderPastWorkshopsTable(workshops) {
    const tbody = document.querySelector('#past-workshops-table tbody');
    if (!tbody) return;
    
    if (!workshops || workshops.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:20px;">
                    No past workshops available.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = workshops.map(workshop => {
        // Format date
        const date = new Date(workshop.date);
        const formattedDate = date.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
        
        // Calculate registrations/capacity
        const registrationCount = workshop.registration_count || 0;
        const capacityDisplay = `${registrationCount}/${workshop.capacity}`;
        
        return `
            <tr>
                <td>${workshop.title}</td>
                <td>${formattedDate}</td>
                <td>${workshop.instructor}</td>
                <td>${workshop.capacity}</td>
                <td>${capacityDisplay}</td>
                <td class="admin-table-actions">
                    <button class="view-registrations" data-id="${workshop.workshop_id}" title="View Registrations">
                        <i class="fas fa-users"></i>
                    </button>
                    <button class="duplicate-workshop" data-id="${workshop.workshop_id}" title="Duplicate Workshop">
                        <i class="fas fa-copy"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners for past workshop actions
    setupPastWorkshopActionListeners();
}

/**
 * Setup past workshop action listeners
 */
function setupPastWorkshopActionListeners() {
    // View registrations
    document.querySelectorAll('#past-workshops-table .view-registrations').forEach(button => {
        button.addEventListener('click', () => {
            const workshopId = button.getAttribute('data-id');
            viewWorkshopRegistrations(workshopId);
        });
    });
    
    // Duplicate workshop
    document.querySelectorAll('.duplicate-workshop').forEach(button => {
        button.addEventListener('click', () => {
            const workshopId = button.getAttribute('data-id');
            duplicateWorkshop(workshopId);
        });
    });
}

/**
 * View workshop registrations
 */
async function viewWorkshopRegistrations(workshopId) {
    try {
        // Show loading message
        showSuccessMessage('Loading workshop registrations...');
        
        // Fetch workshop details
        const workshop = await getWorkshopById(workshopId);
        if (!workshop) {
            showErrorMessage('Workshop not found');
            return;
        }
        
        // Fetch workshop registrations
        const registrations = await getWorkshopRegistrations(workshopId);
        
        // Open registrations modal
        openRegistrationsModal(workshop, registrations);
    } catch (error) {
        console.error('Error viewing workshop registrations:', error);
        showErrorMessage('Failed to load workshop registrations');
    }
}

/**
 * Get workshop by ID
 */
async function getWorkshopById(workshopId) {
    try {
        const response = await AdminApiService.authRequest(`/api/admin/workshops/${workshopId}`, 'GET');
        if (!response.success) {
            throw new Error(response.message || 'Failed to fetch workshop');
        }
        
        return response.workshop;
    } catch (error) {
        console.error('Error getting workshop by ID:', error);
        throw error;
    }
}

/**
 * Get workshop registrations
 */
async function getWorkshopRegistrations(workshopId) {
    try {
        const response = await AdminApiService.authRequest(`/api/admin/workshops/${workshopId}/registrations`, 'GET');
        if (!response.success) {
            throw new Error(response.message || 'Failed to fetch workshop registrations');
        }
        
        return response.registrations || [];
    } catch (error) {
        console.error('Error getting workshop registrations:', error);
        throw error;
    }
}

/**
 * Open registrations modal
 */
function openRegistrationsModal(workshop, registrations) {
    const modal = document.getElementById('registrations-modal');
    const modalTitle = document.getElementById('registrations-modal-title');
    const workshopDetails = document.getElementById('workshop-details');
    const registrationsTable = document.getElementById('registrations-table');
    
    if (!modal || !modalTitle || !workshopDetails || !registrationsTable) return;
    
    // Set modal title
    modalTitle.textContent = `Registrations: ${workshop.title}`;
    
    // Format date
    const date = new Date(workshop.date);
    const formattedDate = date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
    });
    
    // Format time
    const startTime = formatTimeFromDB(workshop.start_time);
    const endTime = formatTimeFromDB(workshop.end_time);
    
    // Display workshop details
    workshopDetails.innerHTML = `
        <div class="workshop-detail-row">
            <strong>Date:</strong> ${formattedDate}
        </div>
        <div class="workshop-detail-row">
            <strong>Time:</strong> ${startTime} - ${endTime}
        </div>
        <div class="workshop-detail-row">
            <strong>Instructor:</strong> ${workshop.instructor}
        </div>
        <div class="workshop-detail-row">
            <strong>Registrations:</strong> ${registrations.length} / ${workshop.capacity}
        </div>
    `;
    
    // Display registrations
    const tbody = registrationsTable.querySelector('tbody');
    if (!tbody) return;
    
    if (!registrations || registrations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:20px;">
                    No registrations for this workshop yet.
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
            let paymentStatusTag;
            switch (reg.payment_status) {
                case 'Paid':
                    paymentStatusTag = `<span class="admin-tag green">Paid</span>`;
                    break;
                case 'Pending':
                    paymentStatusTag = `<span class="admin-tag yellow">Pending</span>`;
                    break;
                case 'Refunded':
                    paymentStatusTag = `<span class="admin-tag red">Refunded</span>`;
                    break;
                default:
                    paymentStatusTag = `<span class="admin-tag">${reg.payment_status}</span>`;
            }
            
            // Format attendance status
            let attendanceTag;
            if (reg.attended) {
                attendanceTag = `<span class="admin-tag green">Attended</span>`;
            } else {
                const workshopDate = new Date(workshop.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                if (workshopDate < today) {
                    attendanceTag = `<span class="admin-tag red">No-Show</span>`;
                } else {
                    attendanceTag = `<span class="admin-tag blue">Registered</span>`;
                }
            }
            
            return `
                <tr>
                    <td>${reg.user_name}</td>
                    <td>${reg.email}</td>
                    <td>${formattedRegDate}</td>
                    <td>${paymentStatusTag}</td>
                    <td>${attendanceTag}</td>
                    <td class="admin-table-actions">
                        <button class="mark-attended" data-id="${reg.registration_id}" title="Mark as Attended" ${reg.attended ? 'disabled' : ''}>
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="mark-refunded" data-id="${reg.registration_id}" title="Mark as Refunded" ${reg.payment_status === 'Refunded' ? 'disabled' : ''}>
                            <i class="fas fa-undo"></i>
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
        exportButton.onclick = () => exportRegistrations(workshop, registrations);
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
    // Mark as attended
    document.querySelectorAll('.mark-attended').forEach(button => {
        if (!button.disabled) {
            button.addEventListener('click', async () => {
                const registrationId = button.getAttribute('data-id');
                try {
                    await updateRegistrationAttendance(registrationId, true);
                    button.disabled = true;
                    showSuccessMessage('Attendance updated');
                } catch (error) {
                    showErrorMessage('Failed to update attendance');
                }
            });
        }
    });
    
    // Mark as refunded
    document.querySelectorAll('.mark-refunded').forEach(button => {
        if (!button.disabled) {
            button.addEventListener('click', async () => {
                const registrationId = button.getAttribute('data-id');
                try {
                    await updateRegistrationPaymentStatus(registrationId, 'Refunded');
                    button.disabled = true;
                    showSuccessMessage('Payment status updated');
                } catch (error) {
                    showErrorMessage('Failed to update payment status');
                }
            });
        }
    });
}

/**
 * Update registration attendance
 */
async function updateRegistrationAttendance(registrationId, attended) {
    try {
        const response = await AdminApiService.authRequest(
            `/api/admin/workshops/registrations/${registrationId}/attendance`,
            'PUT',
            { attended }
        );
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to update attendance');
        }
        
        return response.registration;
    } catch (error) {
        console.error('Error updating registration attendance:', error);
        throw error;
    }
}

/**
 * Update registration payment status
 */
async function updateRegistrationPaymentStatus(registrationId, status) {
    try {
        const response = await AdminApiService.authRequest(
            `/api/admin/workshops/registrations/${registrationId}/payment`,
            'PUT',
            { status }
        );
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to update payment status');
        }
        
        return response.registration;
    } catch (error) {
        console.error('Error updating registration payment status:', error);
        throw error;
    }
}

/**
 * Export registrations to CSV
 */
function exportRegistrations(workshop, registrations) {
    // Format date for filename
    const date = new Date(workshop.date);
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    
    // Create CSV content
    let csvContent = 'Name,Email,Registration Date,Payment Status,Payment Method,Amount Paid,Attended\n';
    
    registrations.forEach(reg => {
        const name = `"${reg.user_name}"`;
        const email = `"${reg.email}"`;
        const regDate = new Date(reg.registration_date).toLocaleDateString('en-US');
        const paymentStatus = reg.payment_status;
        const paymentMethod = reg.payment_method || 'N/A';
        const amountPaid = reg.amount_paid ? `$${reg.amount_paid}` : 'N/A';
        const attended = reg.attended ? 'Yes' : 'No';
        
        csvContent += `${name},${email},${regDate},${paymentStatus},${paymentMethod},${amountPaid},${attended}\n`;
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${formattedDate}-${generateSlug(workshop.title)}-registrations.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Open workshop modal for creating or editing
 */
function openWorkshopModal(workshopData = null) {
    const modal = document.getElementById('workshop-modal');
    const form = document.getElementById('workshop-form');
    const modalTitle = document.getElementById('workshop-modal-title');
    
    if (!modal || !form) return;
    
    // Reset form
    form.reset();
    
    // Reset slug manual edit tracking
    document.getElementById('workshop-slug').dataset.manuallyEdited = 'false';
    
    // Set modal title and populate form if editing
    if (workshopData) {
        modalTitle.textContent = 'Edit Workshop';
        document.getElementById('workshop-id').value = workshopData.workshop_id;
        
        // Set a minimum date that's either today or the workshop date
        const today = new Date();
        const workshopDate = new Date(workshopData.date);
        
        // Populate form with workshop data
        document.getElementById('workshop-title').value = workshopData.title;
        document.getElementById('workshop-instructor').value = workshopData.instructor;
        document.getElementById('workshop-date').value = formatDateForInput(workshopData.date);
        document.getElementById('workshop-start-time').value = workshopData.start_time.substring(0, 5);
        document.getElementById('workshop-end-time').value = workshopData.end_time.substring(0, 5);
        document.getElementById('workshop-price').value = workshopData.price;
        document.getElementById('workshop-member-price').value = workshopData.member_price || '';
        document.getElementById('workshop-capacity').value = workshopData.capacity;
        document.getElementById('workshop-location').value = workshopData.location || '';
        document.getElementById('workshop-image').value = workshopData.image_url || '';
        document.getElementById('workshop-slug').value = workshopData.workshop_slug;
        document.getElementById('workshop-description').value = workshopData.description;
        document.getElementById('workshop-active').checked = workshopData.active;
        
        // Mark slug as manually edited to prevent auto-generation when editing title
        document.getElementById('workshop-slug').dataset.manuallyEdited = 'true';
    } else {
        modalTitle.textContent = 'Add New Workshop';
        document.getElementById('workshop-id').value = '';
        
        // Set the date field to today
        document.getElementById('workshop-date').value = formatDateForInput(new Date());
        
        // Default start and end times
        document.getElementById('workshop-start-time').value = '10:00';
        document.getElementById('workshop-end-time').value = '12:00';
    }
    
    // Show modal
    modal.style.display = 'block';
    
    // Handle form submission
    form.onsubmit = async (e) => {
        e.preventDefault();
        await saveWorkshop(form);
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
 * Save workshop data
 */
async function saveWorkshop(form) {
    try {
        const formData = new FormData(form);
        const workshopId = formData.get('workshop_id');
        
        // Get numerical values
        const price = parseFloat(formData.get('price'));
        const memberPrice = formData.get('member_price') ? parseFloat(formData.get('member_price')) : null;
        const capacity = parseInt(formData.get('capacity'));
        
        // Prepare workshop data
        const workshopData = {
            title: formData.get('title'),
            description: formData.get('description'),
            date: formData.get('date'),
            start_time: formData.get('start_time') + ':00',
            end_time: formData.get('end_time') + ':00',
            price,
            member_price: memberPrice,
            capacity,
            instructor: formData.get('instructor'),
            location: formData.get('location'),
            image_url: formData.get('image_url') || null,
            workshop_slug: formData.get('workshop_slug'),
            active: formData.get('active') === 'on'
        };
        
        let response;
        
        if (workshopId) {
            // Update existing workshop
            response = await AdminApiService.authRequest(
                `/api/admin/workshops/${workshopId}`,
                'PUT',
                workshopData
            );
        } else {
            // Create new workshop
            response = await AdminApiService.authRequest(
                '/api/admin/workshops',
                'POST',
                workshopData
            );
        }
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to save workshop');
        }
        
        // Hide modal
        document.getElementById('workshop-modal').style.display = 'none';
        
        // Show success message
        const actionText = workshopId ? 'updated' : 'created';
        showSuccessMessage(`Workshop ${actionText} successfully`);
        
        // Reload workshops
        await loadUpcomingWorkshops();
        await loadPastWorkshops();
    } catch (error) {
        console.error('Error saving workshop:', error);
        showErrorMessage(`Failed to save workshop: ${error.message}`);
    }
}

/**
 * Edit a workshop
 */
async function editWorkshop(workshopId) {
    try {
        // Show loading message
        showSuccessMessage('Loading workshop data...');
        
        // Fetch workshop data
        const workshop = await getWorkshopById(workshopId);
        
        if (workshop) {
            openWorkshopModal(workshop);
        } else {
            showErrorMessage('Workshop not found');
        }
    } catch (error) {
        console.error('Error editing workshop:', error);
        showErrorMessage('Failed to load workshop data');
    }
}

/**
 * Delete a workshop
 */
async function deleteWorkshop(workshopId) {
    if (confirm('Are you sure you want to delete this workshop? This action cannot be undone.')) {
        try {
            const response = await AdminApiService.authRequest(
                `/api/admin/workshops/${workshopId}`,
                'DELETE'
            );
            
            if (!response.success) {
                throw new Error(response.message || 'Failed to delete workshop');
            }
            
            showSuccessMessage('Workshop deleted successfully');
            
            // Reload workshops to reflect the changes
            await loadUpcomingWorkshops();
            await loadPastWorkshops();
        } catch (error) {
            console.error('Error deleting workshop:', error);
            showErrorMessage(`Failed to delete workshop: ${error.message}`);
        }
    }
}

/**
 * Duplicate a workshop
 */
async function duplicateWorkshop(workshopId) {
    try {
        // Show loading message
        showSuccessMessage('Preparing to duplicate workshop...');
        
        // Fetch original workshop data
        const originalWorkshop = await getWorkshopById(workshopId);
        
        if (!originalWorkshop) {
            showErrorMessage('Workshop not found');
            return;
        }
        
        // Create duplicate with modifications
        const duplicateData = { ...originalWorkshop };
        
        // Remove ID and set as draft
        delete duplicateData.workshop_id;
        duplicateData.active = false;
        
        // Update title to indicate it's a copy
        duplicateData.title = `${duplicateData.title} (Copy)`;
        
        // Generate new slug
        duplicateData.workshop_slug = generateSlug(duplicateData.title);
        
        // Set future date (1 month later than the original)
        const originalDate = new Date(duplicateData.date);
        const newDate = new Date(originalDate);
        newDate.setMonth(newDate.getMonth() + 1);
        
        // Ensure the new date is in the future
        const today = new Date();
        if (newDate < today) {
            // If adding a month still puts it in the past, schedule for next week
            newDate.setDate(today.getDate() + 7);
        }
        
        duplicateData.date = formatDateForInput(newDate);
        
        // Open modal with duplicate data
        openWorkshopModal(duplicateData);
    } catch (error) {
        console.error('Error duplicating workshop:', error);
        showErrorMessage('Failed to duplicate workshop');
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
 * Format time from database (HH:MM:SS) to display format (h:MM AM/PM)
 */
function formatTimeFromDB(timeString) {
    if (!timeString) return '';
    
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    
    // Determine if it's AM or PM
    const period = hour >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    
    return `${hour12}:${minutes} ${period}`;
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
