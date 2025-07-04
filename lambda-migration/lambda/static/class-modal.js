/**
 * Admin Class Modal Functionality
 * Handles creation and editing of yoga classes with an enhanced modal interface
 */

/// Global variables
let classModal;
let currentClass = null;

/**
 * Initialize the admin class modal
 */
function initAdminClassModal() {
    console.log('Initializing admin class modal');
    
    // Create modal if it doesn't exist
    if (!document.getElementById('admin-class-modal')) {
        createClassModal();
    }
    
    // Initialize modal instance
    classModal = document.getElementById('admin-class-modal');
    
    // Add create class button to schedule editor
    addCreateClassButton();
}

/// Get auth headers for API requests
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return null;
    }
    
    // Clean the token to ensure it doesn't have any problematic characters
    const cleanToken = token.trim();
    console.log('Using auth token:', cleanToken);
    
    return {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
}

/**
 * Create the modal HTML structure and append to the document
 */
function createClassModal() {
    const modal = document.createElement('div');
    modal.id = 'admin-class-modal';
    modal.className = 'modal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2 id="class-modal-title">Create New Class</h2>
            
            <div class="form-tabs">
                <button type="button" class="tab-btn active" data-tab="basic-info">Basic Info</button>
                <button type="button" class="tab-btn" data-tab="details">Details</button>
                <button type="button" class="tab-btn" data-tab="advanced">Advanced</button>
            </div>
            
            <form id="class-form">
                <!-- Basic Info Tab -->
                <div class="tab-content" id="basic-info-tab" style="display: block;">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="class-title">Class Title*</label>
                            <input type="text" id="class-title" required placeholder="e.g., Vinyasa Flow">
                        </div>
                        <div class="form-group">
                            <label for="class-status">Status*</label>
                            <select id="class-status" required>
                                <option value="active">Active</option>
                                <option value="draft">Draft</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="class-category">Category*</label>
                            <select id="class-category" required>
                                <option value="all-levels">All Levels</option>
                                <option value="beginners">Beginners</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                                <option value="meditation">Meditation</option>
                                <option value="prenatal">Prenatal</option>
                                <option value="kids">Kids</option>
                                <option value="special">Special Event</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="class-level">Level</label>
                            <select id="class-level">
                                <option value="all-levels">All Levels</option>
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="class-description">Description</label>
                        <textarea id="class-description" rows="4" placeholder="Class description and details..."></textarea>
                    </div>
                </div>
                
                <!-- Details Tab -->
                <div class="tab-content" id="details-tab" style="display: none;">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="class-date">Date*</label>
                            <input type="date" id="class-date" required>
                        </div>
                        <div class="form-group">
                            <label for="class-day">Day of Week</label>
                            <select id="class-day" disabled>
                                <option value="monday">Monday</option>
                                <option value="tuesday">Tuesday</option>
                                <option value="wednesday">Wednesday</option>
                                <option value="thursday">Thursday</option>
                                <option value="friday">Friday</option>
                                <option value="saturday">Saturday</option>
                                <option value="sunday">Sunday</option>
                            </select>
                            <small>Auto-calculated from date</small>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="class-start-time">Start Time*</label>
                            <input type="time" id="class-start-time" required>
                        </div>
                        <div class="form-group">
                            <label for="class-duration">Duration (minutes)*</label>
                            <input type="number" id="class-duration" min="15" max="240" step="15" value="60" required>
                        </div>
                        <div class="form-group">
                            <label for="class-end-time">End Time</label>
                            <input type="time" id="class-end-time" disabled>
                            <small>Auto-calculated from start time and duration</small>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="class-location">Location*</label>
                            <input type="text" id="class-location" required placeholder="e.g., Main Studio">
                        </div>
                        <div class="form-group">
                            <label for="class-max-participants">Max Participants*</label>
                            <input type="number" id="class-max-participants" min="1" max="100" value="10" required>
                        </div>
                    </div>
                </div>
                
                <!-- Advanced Tab -->
                <div class="tab-content" id="advanced-tab" style="display: none;">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="class-price">Price ($)</label>
                            <input type="number" id="class-price" min="0" step="0.01" value="25">
                        </div>
                        <div class="form-group">
                            <label for="class-created-by">Created By</label>
                            <input type="text" id="class-created-by" disabled>
                            <small>Auto-filled with your user ID</small>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="class-id">Class ID</label>
                        <input type="text" id="class-id" disabled>
                        <small>Auto-generated for new classes</small>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="class-created-at">Created At</label>
                            <input type="datetime-local" id="class-created-at" disabled>
                        </div>
                        <div class="form-group">
                            <label for="class-updated-at">Updated At</label>
                            <input type="datetime-local" id="class-updated-at" disabled>
                        </div>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button type="button" id="class-cancel-btn" class="cancel-btn">Cancel</button>
                    <button type="submit" id="class-save-btn" class="primary-btn">Save Class</button>
                </div>
            </form>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(modal);
    
    // Add event listeners
    setupModalListeners();
}

/**
 * Setup event listeners for the modal
 */
function setupModalListeners() {
    const modal = document.getElementById('admin-class-modal');
    if (!modal) return;
    
    // Close button
    const closeBtn = modal.querySelector('.close');
    closeBtn.addEventListener('click', hideClassModal);
    
    // Tab switching
    const tabButtons = modal.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Show selected tab content, hide others
            const tabId = this.getAttribute('data-tab');
            
            // First, hide all tab contents
            const tabContents = modal.querySelectorAll('.tab-content');
            tabContents.forEach(tab => {
                tab.style.display = 'none';
            });
            
            // Then show the selected tab content
            // Use querySelector within modal to ensure we're targeting the right element
            const selectedTab = modal.querySelector(`#${tabId}-tab`);
            if (selectedTab) {
                selectedTab.style.display = 'block';
                console.log(`Showing tab: ${tabId}-tab`);
            } else {
                console.error(`Tab content not found: ${tabId}-tab`);
                // Fallback to first tab if the requested tab doesn't exist
                if (tabContents.length > 0) {
                    tabContents[0].style.display = 'block';
                }
            }
        });
    });
    
    // Form submission
    const form = document.getElementById('class-form');
    form.addEventListener('submit', handleFormSubmit);
    
    // Cancel button
    const cancelBtn = document.getElementById('class-cancel-btn');
    cancelBtn.addEventListener('click', hideClassModal);
    
    // Auto-calculate fields
    const startTimeInput = document.getElementById('class-start-time');
    const durationInput = document.getElementById('class-duration');
    const dateInput = document.getElementById('class-date');
    
    startTimeInput.addEventListener('change', calculateEndTime);
    durationInput.addEventListener('change', calculateEndTime);
    dateInput.addEventListener('change', calculateDayOfWeek);
}

/**
 * Add a Create Class button to the schedule editor
 */
function addCreateClassButton() {
    const scheduleContainer = document.getElementById('schedule-editor');
    if (!scheduleContainer) return;
    
    // Check if the button already exists
    if (document.getElementById('create-class-btn')) return;
    
    // Create button
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'schedule-actions';
    buttonContainer.style.marginBottom = '20px';
    
    const createButton = document.createElement('button');
    createButton.id = 'create-class-btn';
    createButton.className = 'primary-btn';
    createButton.innerHTML = '+ Create New Class';
    createButton.addEventListener('click', () => showClassModal());
    
    buttonContainer.appendChild(createButton);
    
    // Insert at the top of schedule container
    if (scheduleContainer.firstChild) {
        scheduleContainer.insertBefore(buttonContainer, scheduleContainer.firstChild);
    } else {
        scheduleContainer.appendChild(buttonContainer);
    }
}

/**
 * Show the class modal for creating or editing a class
 * @param {Object|null} classData - Class data for editing, null for new class
 */
function showClassModal(classData = null) {
    // Store current class being edited
    currentClass = classData;
    
    // Update modal title
    document.getElementById('class-modal-title').textContent = 
        classData ? 'Edit Class' : 'Create New Class';
    
    // Reset form and populate with data if editing
    resetForm();
    if (classData) {
        populateForm(classData);
    } else {
        // Set default values for new class
        setDefaultValues();
    }
    
    // Show first tab - ensure we're working within the modal
    const tabButtons = classModal.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    // Select the first tab button (basic-info)
    const firstTabButton = classModal.querySelector('.tab-btn[data-tab="basic-info"]');
    if (firstTabButton) {
        firstTabButton.classList.add('active');
    }
    
    // Hide all tab contents
    const tabContents = classModal.querySelectorAll('.tab-content');
    tabContents.forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Show first tab content
    const firstTabContent = classModal.querySelector('#basic-info-tab');
    if (firstTabContent) {
        firstTabContent.style.display = 'block';
        console.log('Showing basic info tab');
    }
    
    // Show modal
    classModal.style.display = 'flex';
}

/**
 * Hide the class modal
 */
function hideClassModal() {
    classModal.style.display = 'none';
    currentClass = null;
}

/**
 * Reset the form fields
 */
function resetForm() {
    document.getElementById('class-form').reset();
}

/**
 * Set default values for new class
 */
function setDefaultValues() {
    // Set today's date as default
    const today = new Date();
    const dateString = today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    document.getElementById('class-date').value = dateString;
    
    // Calculate day of week
    calculateDayOfWeek();
    
    // Default time values
    document.getElementById('class-start-time').value = '09:00';
    document.getElementById('class-duration').value = '60';
    calculateEndTime();
    
    // Default category and level
    document.getElementById('class-category').value = 'all-levels';
    document.getElementById('class-level').value = 'all-levels';
    
    // Default status
    document.getElementById('class-status').value = 'active';
    
    // Set creator (current user)
    getCurrentUserId().then(userId => {
        document.getElementById('class-created-by').value = userId;
    });
    
    // Set created/updated timestamps
    const nowString = today.toISOString().slice(0, 16); // Format as YYYY-MM-DDTHH:MM
    document.getElementById('class-created-at').value = nowString;
    document.getElementById('class-updated-at').value = nowString;
}

/**
 * Get the current user ID from the server
 */
async function getCurrentUserId() {
    try {
        const response = await fetch('/auth/verify-token', {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            return 'unknown';
        }
        
        const data = await response.json();
        return data.user?.id || 'unknown';
    } catch (error) {
        console.error('Error getting user ID:', error);
        return 'unknown';
    }
}

/**
 * Populate form with class data
 * @param {Object} classData - The class data object
 */
function populateForm(classData) {
    // Basic info - make sure to scope to the modal
    classModal.querySelector('#class-title').value = classData.title || '';
    classModal.querySelector('#class-status').value = classData.status || 'active';
    classModal.querySelector('#class-category').value = classData.category || 'all-levels';
    classModal.querySelector('#class-level').value = classData.level || 'all-levels';
    classModal.querySelector('#class-description').value = classData.description || '';
    
    // Details
    classModal.querySelector('#class-date').value = classData.date || '';
    classModal.querySelector('#class-day').value = classData.day || 'monday';
    classModal.querySelector('#class-start-time').value = classData.startTime || '09:00';
    classModal.querySelector('#class-duration').value = classData.duration || 60;
    classModal.querySelector('#class-end-time').value = classData.endTime || '10:00';
    classModal.querySelector('#class-location').value = classData.location || '';
    classModal.querySelector('#class-max-participants').value = classData.maxParticipants || 10;
    
    // Advanced
    classModal.querySelector('#class-price').value = classData.price || 25;
    classModal.querySelector('#class-id').value = classData.id || '';
    classModal.querySelector('#class-created-by').value = classData.createdBy || '';
    
    // Format timestamps for datetime-local input
    if (classData.createdAt) {
        classModal.querySelector('#class-created-at').value = 
            new Date(classData.createdAt).toISOString().slice(0, 16);
    }
    
    if (classData.updatedAt) {
        classModal.querySelector('#class-updated-at').value = 
            new Date(classData.updatedAt).toISOString().slice(0, 16);
    }
}

/**
 * Calculate end time based on start time and duration
 */
function calculateEndTime() {
    const startTimeInput = document.getElementById('class-start-time');
    const durationInput = document.getElementById('class-duration');
    const endTimeInput = document.getElementById('class-end-time');
    
    if (!startTimeInput.value || !durationInput.value) {
        return;
    }
    
    // Parse start time
    const [hours, minutes] = startTimeInput.value.split(':').map(Number);
    
    // Calculate end time
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + durationInput.value * 60000);
    
    // Format end time as HH:MM
    const endHours = endDate.getHours().toString().padStart(2, '0');
    const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
    
    endTimeInput.value = `${endHours}:${endMinutes}`;
}

/**
 * Calculate day of week based on date
 */
function calculateDayOfWeek() {
    const dateInput = document.getElementById('class-date');
    const dayInput = document.getElementById('class-day');
    
    if (!dateInput.value) {
        return;
    }
    
    // Get day of week
    const date = new Date(dateInput.value);
    const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Convert to our day values
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    dayInput.value = days[dayIndex];
}

/**
 * Handle form submission
 * @param {Event} event - The form submission event
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    
    try {
        // Get form data
        const formData = getFormData();
        
        // Validate form
        if (!validateForm(formData)) {
            return;
        }
        
        // Determine if creating or updating - check formData.id, not currentClass.id
        const isUpdate = !!formData.id;
        
        // API endpoint and method
        const endpoint = isUpdate ? `/classes/${formData.id}` : '/classes';
        const method = isUpdate ? 'PUT' : 'POST';
        
        // Send data to server
        const response = await fetch(endpoint, {
            method: method,
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${errorText}`);
        }
        
        // Handle success
        const result = await response.json();
        console.log('Class saved:', result);
        
        // Show notification and refresh schedule
        showNotification(`Class ${isUpdate ? 'updated' : 'created'} successfully`, 'success');
        
        // Trigger schedule update
        const scheduleContainer = document.getElementById('schedule-editor');
        if (scheduleContainer && scheduleEditor) {
            scheduleEditor.loadSchedule();
            
            // Dispatch custom event for potential listeners
            const event = new CustomEvent('schedule-updated', { 
                detail: { classData: result.class } 
            });
            scheduleContainer.dispatchEvent(event);
        }
        
        // Hide modal
        hideClassModal();
        
    } catch (error) {
        console.error('Error saving class:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

/**
 * Get form data as an object
 * @returns {Object} Form data object
 */
function getFormData() {
    // Get form values - make sure to scope to the modal
    const title = classModal.querySelector('#class-title').value;
    const status = classModal.querySelector('#class-status').value;
    const category = classModal.querySelector('#class-category').value;
    const level = classModal.querySelector('#class-level').value;
    const description = classModal.querySelector('#class-description').value;
    
    const date = classModal.querySelector('#class-date').value;
    const day = classModal.querySelector('#class-day').value;
    const startTime = classModal.querySelector('#class-start-time').value;
    const duration = parseInt(classModal.querySelector('#class-duration').value, 10);
    const endTime = classModal.querySelector('#class-end-time').value;
    const location = classModal.querySelector('#class-location').value;
    const maxParticipants = parseInt(classModal.querySelector('#class-max-participants').value, 10);
    
    const price = parseFloat(classModal.querySelector('#class-price').value);
    const id = classModal.querySelector('#class-id').value || null;
    const createdBy = classModal.querySelector('#class-created-by').value;
    
    // Combine date and start time for scheduleDate
    const scheduleDate = date;
    
    // Construct class data object
    const classData = {
        title,
        status,
        category,
        level,
        description,
        date,
        day,
        startTime,
        duration,
        endTime,
        location,
        maxParticipants,
        price,
        scheduleDate
    };
    
    // Add ID if editing existing class
    if (id) {
        classData.id = id;
    }
    
    // Add creator if available
    if (createdBy) {
        classData.createdBy = createdBy;
    }
    
    return classData;
}

/**
 * Validate form data
 * @param {Object} formData - The form data to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateForm(formData) {
    // Required fields
    const requiredFields = ['title', 'date', 'startTime', 'duration', 'location', 'maxParticipants'];
    
    for (const field of requiredFields) {
        if (!formData[field] || formData[field] === '') {
            showNotification(`Missing required field: ${formatFieldName(field)}`, 'error');
            return false;
        }
    }
    
    // Validate numeric fields
    if (isNaN(formData.duration) || formData.duration < 15) {
        showNotification('Duration must be at least 15 minutes', 'error');
        return false;
    }
    
    if (isNaN(formData.maxParticipants) || formData.maxParticipants < 1) {
        showNotification('Maximum participants must be at least 1', 'error');
        return false;
    }
    
    if (isNaN(formData.price) || formData.price < 0) {
        showNotification('Price cannot be negative', 'error');
        return false;
    }
    
    return true;
}

/**
 * Format a field name for display
 * @param {string} field - The field name
 * @returns {string} Formatted field name
 */
function formatFieldName(field) {
    return field
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
        .replace(/([A-Z])/g, match => match.toLowerCase()); // Lower case remaining capital letters
}

/// The copyClassModal function has been removed as this functionality is now
/// handled directly in the schedule editor by prefilling the create modal

/**
 * Show a notification message to the user
 * @param {string} message - The notification message
 * @param {string} type - The notification type (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
    // Use existing notification system if available
    if (window.showToast) {
        window.showToast(message, type);
        return;
    }
    
    // Create notification element if it doesn't exist
    let notification = document.getElementById('class-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'class-notification';
        notification.className = 'notification';
        document.body.appendChild(notification);
        
        // Style the notification
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.padding = '12px 20px';
        notification.style.borderRadius = '4px';
        notification.style.color = 'white';
        notification.style.fontWeight = '500';
        notification.style.zIndex = '9999';
        notification.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        notification.style.transition = 'opacity 0.3s ease-in-out';
        notification.style.maxWidth = '300px';
    }
    
    // Set notification type styling
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#4caf50';
            break;
        case 'error':
            notification.style.backgroundColor = '#f44336';
            break;
        case 'warning':
            notification.style.backgroundColor = '#ff9800';
            break;
        case 'info':
        default:
            notification.style.backgroundColor = '#2196f3';
            break;
    }
    
    // Set message and show notification
    notification.textContent = message;
    notification.style.display = 'block';
    notification.style.opacity = '1';
    
    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300); // Wait for fade out animation to complete
    }, 3000);
}

/// Export functions for external use
window.initAdminClassModal = initAdminClassModal;
window.showClassModal = showClassModal;
window.hideClassModal = hideClassModal;
