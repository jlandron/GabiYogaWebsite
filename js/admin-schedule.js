/**
 * Admin Schedule Management JavaScript
 * 
 * This file handles the schedule management functionality in the admin portal.
 * It ensures that changes made here are reflected on the homepage's Weekly Schedule.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in and is admin
    if (!UserService.isLoggedIn()) {
        console.log('User not logged in, redirecting to login page');
        window.location.href = 'login.html';
        return;
    }

    if (!UserService.isAdmin()) {
        console.log('User is not admin, redirecting to dashboard');
        window.location.href = 'dashboard.html';
        return;
    }

    console.log('User authenticated as admin, proceeding with schedule builder initialization');
    
    // Check token validity with backend using AdminApiService instead of ApiService
    try {
        await AdminApiService.authRequest(`${API_BASE_URL}/auth/me`);
        console.log('Token verified with backend');
    } catch (error) {
        console.error('Token validation failed:', error);
        alert('Your session has expired. Please log in again.');
        UserService.logout();
        window.location.href = 'login.html';
        return;
    }

    // Initialize the schedule builder after confirmed authentication
    await initializeScheduleBuilder();

    // Setup action buttons
    const viewPublishedBtn = document.querySelector('.admin-actions .admin-btn-secondary');
    const addClassBtn = document.querySelector('.admin-actions .admin-btn-primary');
    const addTemplateBtn = document.querySelector('.admin-panel-header .admin-btn-secondary');

    if (viewPublishedBtn) {
        viewPublishedBtn.addEventListener('click', () => {
            window.open('index.html#schedule', '_blank');
        });
    }

    if (addClassBtn) {
        addClassBtn.addEventListener('click', () => {
            openClassModal();
        });
    }

    if (addTemplateBtn) {
        addTemplateBtn.addEventListener('click', () => {
            openTemplateModal();
        });
    }
    
    // Add click events for schedule day tabs
    setupDayTabs();
    
    // Add click events for empty class slots
    document.querySelectorAll('.schedule-class.empty').forEach(slot => {
        slot.addEventListener('click', () => {
            addNewClass(slot.getAttribute('data-time'));
        });
    });
});

/**
 * Initialize the schedule builder
 */
async function initializeScheduleBuilder() {
    try {
        // Load templates
        await loadClassTemplates();

        // Load the weekly schedule
        await loadWeeklySchedule();
    } catch (error) {
        console.error('Error initializing schedule builder:', error);
        showErrorMessage('Failed to initialize schedule. Please refresh the page and try again.');
    }
}

/**
 * Load class templates from database
 */
async function loadClassTemplates() {
    try {
        showTableLoading('class-templates-table');

        // Use AdminApiService to fetch templates
        const templates = await AdminApiService.getClassTemplates();
        
        renderClassTemplatesTable(templates);
        
        return templates;
    } catch (error) {
        console.error('Error loading class templates:', error);
        throw error;
    }
}

/**
 * Render class templates table
 */
function renderClassTemplatesTable(templates) {
    const tbody = document.querySelector('#class-templates-table tbody');
    if (!tbody) return;

    if (!templates || templates.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:20px;">
                    No class templates available.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = templates.map(template => {
        return `
            <tr>
                <td>${template.name}</td>
                <td>${template.duration} min</td>
                <td>${template.level || 'All Levels'}</td>
                <td>${template.default_instructor || 'Gabi Jyoti'}</td>
                <td class="admin-table-actions">
                    <button class="use-template" data-id="${template.template_id}" title="Use Template">
                        <i class="fas fa-plus-circle"></i>
                    </button>
                    <button class="edit-template" data-id="${template.template_id}" title="Edit Template">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-template" data-id="${template.template_id}" title="Delete Template">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Add event listeners for template actions
    setupTemplateActionListeners();
}

/**
 * Setup day tabs for schedule builder
 */
function setupDayTabs() {
    const dayTabs = document.querySelectorAll('.schedule-day');
    if (!dayTabs.length) return;

    dayTabs.forEach(dayTab => {
        dayTab.addEventListener('click', async function() {
            // Remove active class from all day tabs
            dayTabs.forEach(tab => tab.classList.remove('active'));
            
            // Add active class to clicked day tab
            this.classList.add('active');
            
            // Load schedule for the selected day
            await loadDaySchedule();
        });
    });
}

/**
 * Load schedule for the selected day
 */
async function loadDaySchedule() {
    try {
        // Get active day
        const activeTab = document.querySelector('.schedule-day.active');
        if (!activeTab) return;

        const dayNumber = parseInt(activeTab.getAttribute('data-day-number'));
        
        // Show loading state
        const timeslotsContainer = document.querySelector('.schedule-timeslots');
        if (timeslotsContainer) {
            timeslotsContainer.innerHTML = `
                <div style="text-align:center;padding:30px;">
                    <i class="fas fa-spinner fa-spin"></i> Loading schedule...
                </div>
            `;
        }
        
        // Use AdminApiService to fetch classes
        const classes = await AdminApiService.getClasses();
        
        // Filter classes for the selected day
        const dayClasses = classes.filter(cls => parseInt(cls.day_of_week) === dayNumber);
        
        // Render classes for the day
        renderDaySchedule(dayClasses, timeslotsContainer, dayNumber);
    } catch (error) {
        console.error('Error loading day schedule:', error);
        const timeslotsContainer = document.querySelector('.schedule-timeslots');
        if (timeslotsContainer) {
            timeslotsContainer.innerHTML = `
                <div style="text-align:center;padding:30px;color:#e74c3c;">
                    <i class="fas fa-exclamation-circle"></i> Failed to load schedule. Please try again.
                </div>
            `;
        }
    }
}

/**
 * Render schedule for the selected day
 */
function renderDaySchedule(classes, container, dayNumber) {
    if (!container) return;

    // Sort classes by start time
    classes.sort((a, b) => {
        return a.start_time.localeCompare(b.start_time);
    });

    // Generate time slots
    const timeSlots = classes.length > 0 
        ? generateTimeSlotsFromClasses(classes)
        : generateDefaultTimeSlots(dayNumber);
    
    // Generate HTML for timeslots
    container.innerHTML = timeSlots.map(slot => {
        // Format display time (e.g., convert "07:00:00" to "7:00 AM")
        const displayTime = formatTimeForDisplay(slot.time);

        if (slot.class) {
            // Slot has a class
            return `
                <div class="schedule-timeslot">
                    <div class="schedule-time">${displayTime}</div>
                    <div class="schedule-class" data-id="${slot.class.class_id}">
                        <strong>${slot.class.name}</strong>
                        <div class="schedule-class-details">
                            <span><i class="fas fa-user"></i> ${slot.class.instructor}</span>
                            <span><i class="fas fa-signal"></i> ${slot.class.level || 'All Levels'}</span>
                            <span><i class="fas fa-clock"></i> ${slot.class.duration} min</span>
                        </div>
                    </div>
                    <div class="schedule-actions">
                        <button class="admin-btn-icon edit-class" data-id="${slot.class.class_id}" title="Edit Class">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="admin-btn-icon delete-class" data-id="${slot.class.class_id}" title="Delete Class">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
        } else {
            // Empty slot
            return `
                <div class="schedule-timeslot">
                    <div class="schedule-time">${displayTime}</div>
                    <div class="schedule-class empty" data-time="${slot.time}">
                        <span class="add-class-text"><i class="fas fa-plus-circle"></i> Add Class</span>
                    </div>
                </div>
            `;
        }
    }).join('');

    // Add event listeners to class actions
    setupClassActionListeners(container);
}

/**
 * Generate time slots from existing classes
 */
function generateTimeSlotsFromClasses(classes) {
    return classes.map(cls => {
        return {
            time: cls.start_time,
            class: cls
        };
    });
}

/**
 * Generate default time slots for a day
 */
function generateDefaultTimeSlots(dayNumber) {
    const defaultSlots = [
        "06:00:00", "07:00:00", "08:00:00", "09:00:00", "10:00:00", 
        "12:00:00", "17:00:00", "18:00:00", "19:30:00"
    ];
    
    return defaultSlots.map(time => {
        return { time, class: null };
    });
}

/**
 * Format time for display (convert "07:00:00" to "7:00 AM")
 */
function formatTimeForDisplay(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    
    // Determine if it's AM or PM
    const period = hour >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    
    return `${hour12}:${minutes} ${period}`;
}

/**
 * Setup class action listeners
 */
function setupClassActionListeners(container) {
    // Add event listeners for edit buttons
    container.querySelectorAll('.edit-class').forEach(button => {
        button.addEventListener('click', () => {
            const classId = button.getAttribute('data-id');
            editClass(classId);
        });
    });
    
    // Add event listeners for delete buttons
    container.querySelectorAll('.delete-class').forEach(button => {
        button.addEventListener('click', () => {
            const classId = button.getAttribute('data-id');
            deleteClass(classId);
        });
    });
    
    // Add event listeners for empty slots
    container.querySelectorAll('.schedule-class.empty').forEach(slot => {
        slot.addEventListener('click', () => {
            const time = slot.getAttribute('data-time');
            addNewClass(time);
        });
    });
}

/**
 * Setup template action listeners
 */
function setupTemplateActionListeners() {
    // Use template button
    document.querySelectorAll('.use-template').forEach(button => {
        button.addEventListener('click', () => {
            const templateId = button.getAttribute('data-id');
            useTemplate(templateId);
        });
    });
    
    // Edit template button
    document.querySelectorAll('.edit-template').forEach(button => {
        button.addEventListener('click', () => {
            const templateId = button.getAttribute('data-id');
            editTemplate(templateId);
        });
    });
    
    // Delete template button
    document.querySelectorAll('.delete-template').forEach(button => {
        button.addEventListener('click', () => {
            const templateId = button.getAttribute('data-id');
            deleteTemplate(templateId);
        });
    });
}

/**
 * Open class modal for adding or editing a class
 */
async function openClassModal(classData = null) {
    try {
        const modal = document.getElementById('class-modal');
        const form = document.getElementById('class-form');
        const modalTitle = document.getElementById('class-modal-title');
        
        if (!modal || !form) return;
        
        // Reset form
        form.reset();
        
        // Set modal title and populate form if editing (check for class_id to determine if editing)
        if (classData && classData.class_id) {
            modalTitle.textContent = 'Edit Class';
            document.getElementById('class-id').value = classData.class_id;
            
            // Populate form with class data
            document.getElementById('class-name').value = classData.name;
            document.getElementById('class-template').value = classData.template_id || '';
            document.getElementById('class-day').value = classData.day_of_week;
            document.getElementById('class-time').value = classData.start_time.split(':').slice(0, 2).join(':');
            document.getElementById('class-duration').value = classData.duration;
            document.getElementById('class-capacity').value = classData.capacity;
            document.getElementById('class-instructor').value = classData.instructor;
            document.getElementById('class-level').value = classData.level || 'All Levels';
            document.getElementById('class-description').value = classData.description || '';
            document.getElementById('class-active').checked = classData.active;
        } else {
            modalTitle.textContent = 'Add New Class';
            document.getElementById('class-id').value = '';
            
            // Set default values
            const activeDay = document.querySelector('.schedule-day.active');
            if (activeDay) {
                document.getElementById('class-day').value = activeDay.getAttribute('data-day-number');
            }
            
            // Pre-fill with any provided data for new classes
            if (classData) {
                if (classData.day_of_week) {
                    document.getElementById('class-day').value = classData.day_of_week;
                }
                if (classData.start_time) {
                    document.getElementById('class-time').value = classData.start_time.split(':').slice(0, 2).join(':');
                }
                if (classData.name) {
                    document.getElementById('class-name').value = classData.name;
                }
                if (classData.duration) {
                    document.getElementById('class-duration').value = classData.duration;
                }
                if (classData.instructor) {
                    document.getElementById('class-instructor').value = classData.instructor;
                }
                if (classData.level) {
                    document.getElementById('class-level').value = classData.level;
                }
                if (classData.description) {
                    document.getElementById('class-description').value = classData.description;
                }
                if (typeof classData.active === 'boolean') {
                    document.getElementById('class-active').checked = classData.active;
                }
            }
        }
        
        // Load templates in the dropdown
        await loadTemplateOptions();
        
        // Show modal
        modal.style.display = 'block';
        
        // Get the save button directly
        const saveButton = form.querySelector('button[type="submit"]');
        
        // Remove any existing event listeners from the form
        form.onsubmit = (e) => {
            e.preventDefault();
            console.log("Form submission prevented, using direct button click instead");
        };
        
        // Add direct click handler to save button
        if (saveButton) {
            console.log("Found save button, adding direct click handler");
            saveButton.onclick = async (e) => {
                e.preventDefault();
                console.log('Save button clicked!');
                
                // Verify all form elements have values before submitting
                const classNameValue = document.getElementById('class-name').value;
                const classTimeValue = document.getElementById('class-time').value;
                
                console.log('Class Name:', classNameValue);
                console.log('Class Time:', classTimeValue);
                
                if (!classNameValue || !classTimeValue) {
                    showErrorMessage('Please fill out all required fields');
                    return;
                }
                
                try {
                    await saveClass(form);
                } catch (error) {
                    console.error('Error in save button handler:', error);
                    showErrorMessage('Error saving class: ' + error.message);
                }
            };
        } else {
            console.error("Save button not found in form!");
            showErrorMessage("UI Error: Save button not found. Please refresh the page.");
        }
        
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
        
    } catch (error) {
        console.error('Error opening class modal:', error);
        showErrorMessage('Failed to prepare class form. Please try again.');
    }
}

/**
 * Load template options into class modal dropdown
 */
async function loadTemplateOptions() {
    try {
        const dropdown = document.getElementById('class-template');
        if (!dropdown) return;
        
        // Clear dropdown except first option
        while (dropdown.options.length > 1) {
            dropdown.remove(1);
        }
        
        // Use AdminApiService to fetch templates
        const templates = await AdminApiService.getClassTemplates();
        
        // Add options to dropdown
        templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.template_id;
            option.text = template.name;
            dropdown.add(option);
        });
        
        // Add event listener to populate form from template
        dropdown.onchange = () => {
            const selectedTemplateId = dropdown.value;
            if (!selectedTemplateId) return;
            
            const selectedTemplate = templates.find(t => t.template_id == selectedTemplateId);
            if (!selectedTemplate) return;
            
            // Fill form fields from template
            document.getElementById('class-name').value = selectedTemplate.name;
            document.getElementById('class-duration').value = selectedTemplate.duration;
            document.getElementById('class-level').value = selectedTemplate.level || 'All Levels';
            document.getElementById('class-instructor').value = selectedTemplate.default_instructor || 'Gabi Jyoti';
            document.getElementById('class-description').value = selectedTemplate.description || '';
        };
        
    } catch (error) {
        console.error('Error loading template options:', error);
        showErrorMessage('Failed to load class templates');
    }
}

/**
 * Save class data
 */
async function saveClass(form) {
    try {
        console.log('Form submission starting'); // Debug log
        
        // Get form field values directly from elements
        const classId = document.getElementById('class-id').value;
        
        // Convert template_id to null if empty string
        let templateId = document.getElementById('class-template').value;
        templateId = templateId && templateId.trim() !== '' ? templateId : null;
        
        const classData = {
            template_id: templateId,
            name: document.getElementById('class-name').value,
            day_of_week: parseInt(document.getElementById('class-day').value),
            start_time: document.getElementById('class-time').value + ':00', // Add seconds to match expected format
            duration: parseInt(document.getElementById('class-duration').value),
            instructor: document.getElementById('class-instructor').value,
            level: document.getElementById('class-level').value,
            capacity: parseInt(document.getElementById('class-capacity').value),
            description: document.getElementById('class-description').value,
            active: document.getElementById('class-active').checked
        };
        
        console.log('Saving class data:', classData); // Debug log
        
        if (classId) {
            // Update existing class
            try {
                const result = await AdminApiService.updateClass(classId, classData);
                console.log('Update result:', result);
                showSuccessMessage('Class updated successfully');
            } catch (error) {
                console.error('Error updating class:', error);
                showErrorMessage('Failed to update class: ' + (error.message || 'Unknown error'));
                return;
            }
        } else {
            // Create new class
            try {
                const result = await AdminApiService.createClass(classData);
                console.log('Create result:', result);
                showSuccessMessage('Class created successfully');
            } catch (error) {
                console.error('Error creating class:', error);
                showErrorMessage('Failed to create class: ' + (error.message || 'Unknown error'));
                return;
            }
        }
        
        // Hide modal
        document.getElementById('class-modal').style.display = 'none';
        
        // Reload schedule
        await loadWeeklySchedule();
        
    } catch (error) {
        console.error('Error saving class:', error);
        showErrorMessage('Failed to save class. Please try again.');
    }
}

/**
 * Edit a class
 */
async function editClass(classId) {
    try {
        // Show loading message
        showSuccessMessage('Loading class data...');
        
        // Use AdminApiService to fetch classes
        const classes = await AdminApiService.getClasses();
        const classData = classes.find(cls => cls.class_id == classId);
        
        if (classData) {
            openClassModal(classData);
        } else {
            showErrorMessage('Class not found');
        }
        
    } catch (error) {
        console.error('Error editing class:', error);
        showErrorMessage('Failed to load class data');
    }
}

/**
 * Delete a class
 */
async function deleteClass(classId) {
    if (confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
        try {
            // Use AdminApiService to delete the class
            await AdminApiService.authRequest(API_ENDPOINTS.classById(classId), 'DELETE');
            
            showSuccessMessage('Class deleted successfully');
            
            // Reload schedule to reflect the changes
            await loadWeeklySchedule();
            
        } catch (error) {
            console.error('Error deleting class:', error);
            showErrorMessage('Failed to delete class');
        }
    }
}

/**
 * Add a new class at a specific time slot
 */
function addNewClass(timeString) {
    openClassModal();
    
    // Set the time in the form
    if (timeString) {
        const timeInput = document.getElementById('class-time');
        if (timeInput) {
            timeInput.value = timeString.substring(0, 5); // Extract HH:MM from HH:MM:SS
        }
    }
}

/**
 * Open template modal for adding or editing a template
 */
async function openTemplateModal(templateData = null) {
    const modal = document.getElementById('template-modal');
    const form = document.getElementById('template-form');
    const modalTitle = document.getElementById('template-modal-title');
    
    if (!modal || !form) return;
    
    // Reset form
    form.reset();
    
    // Set modal title and populate form if editing
    if (templateData) {
        modalTitle.textContent = 'Edit Template';
        document.getElementById('template-id').value = templateData.template_id;
        
        // Populate form with template data
        document.getElementById('template-name').value = templateData.name;
        document.getElementById('template-duration').value = templateData.duration;
        document.getElementById('template-level').value = templateData.level || 'All Levels';
        document.getElementById('template-instructor').value = templateData.default_instructor || '';
        document.getElementById('template-description').value = templateData.description || '';
    } else {
        modalTitle.textContent = 'Add New Template';
        document.getElementById('template-id').value = '';
    }
    
    // Show modal
    modal.style.display = 'block';
    
    // Handle form submission
    form.onsubmit = async (e) => {
        e.preventDefault();
        await saveTemplate(form);
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
 * Save template data
 */
async function saveTemplate(form) {
    try {
        const formData = new FormData(form);
        const templateData = {
            name: formData.get('name'),
            duration: parseInt(formData.get('duration')),
            level: formData.get('level'),
            default_instructor: formData.get('default_instructor'),
            description: formData.get('description')
        };
        
        const templateId = formData.get('template_id');
        
        if (templateId) {
            // Update existing template
            await AdminApiService.authRequest(
                API_ENDPOINTS.classTemplateById(templateId),
                'PUT',
                templateData
            );
            showSuccessMessage('Template updated successfully');
        } else {
            // Create new template
            await AdminApiService.createClassTemplate(templateData);
            showSuccessMessage('Template created successfully');
        }
        
        // Hide modal
        document.getElementById('template-modal').style.display = 'none';
        
        // Reload templates
        await loadClassTemplates();
        
    } catch (error) {
        console.error('Error saving template:', error);
        showErrorMessage('Failed to save template. Please try again.');
    }
}

/**
 * Use a template to create a new class
 */
async function useTemplate(templateId) {
    try {
        // Fetch template data
        const templates = await AdminApiService.getClassTemplates();
        const template = templates.find(t => t.template_id == templateId);
        
        if (!template) {
            showErrorMessage('Template not found');
            return;
        }
        
        // Open class modal with template data pre-filled
        const classData = {
            template_id: template.template_id,
            name: template.name,
            duration: template.duration,
            level: template.level || 'All Levels',
            instructor: template.default_instructor || 'Gabi Jyoti',
            description: template.description || '',
            day_of_week: 1, // Default to Monday
            capacity: 20,
            active: true
        };
        
        openClassModal(classData);
        
    } catch (error) {
        console.error('Error using template:', error);
        showErrorMessage('Failed to use template');
    }
}

/**
 * Edit a template
 */
async function editTemplate(templateId) {
    try {
        // Fetch template data
        const templates = await AdminApiService.getClassTemplates();
        const template = templates.find(t => t.template_id == templateId);
        
        if (template) {
            openTemplateModal(template);
        } else {
            showErrorMessage('Template not found');
        }
        
    } catch (error) {
        console.error('Error editing template:', error);
        showErrorMessage('Failed to load template data');
    }
}

/**
 * Delete a template
 */
async function deleteTemplate(templateId) {
    if (confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
        try {
            // Use AdminApiService to delete the template
            await AdminApiService.authRequest(API_ENDPOINTS.classTemplateById(templateId), 'DELETE');
            
            showSuccessMessage('Template deleted successfully');
            
            // Reload templates to reflect the changes
            await loadClassTemplates();
            
        } catch (error) {
            console.error('Error deleting template:', error);
            showErrorMessage('Failed to delete template');
        }
    }
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
 * Load the weekly schedule
 */
async function loadWeeklySchedule() {
    try {
        // Get calendar container
        const calendarBody = document.querySelector('.weekly-calendar-body');
        if (!calendarBody) return;

        // Show loading state
        calendarBody.innerHTML = `
            <div style="text-align:center;padding:30px;grid-column: 1/-1;">
                <i class="fas fa-spinner fa-spin"></i> Loading weekly schedule...
            </div>
        `;
        
        console.log('Attempting to fetch classes from API');
        // Use AdminApiService to fetch all classes
        let classes;
        try {
            classes = await AdminApiService.getClasses();
            console.log(`Successfully fetched ${classes.length} classes`);
        } catch (error) {
            console.error('Error loading weekly schedule:', error);
            calendarBody.innerHTML = `
                <div style="text-align:center;padding:30px;color:#e74c3c;grid-column: 1/-1;">
                    <i class="fas fa-exclamation-circle"></i> 
                    Failed to load schedule: ${error.message}
                    <button class="admin-btn admin-btn-secondary mt-3" onclick="location.reload()">
                        <i class="fas fa-sync"></i> Retry
                    </button>
                </div>
            `;
            throw error;
        }
        
        // Get all unique time slots from the actual classes
        const allTimes = new Set();
        classes.forEach(cls => {
            allTimes.add(cls.start_time);
        });
        
        // Add some default time slots if there aren't many classes
        const defaultTimes = ["07:00", "09:00", "12:00", "17:00", "19:00"];
        defaultTimes.forEach(time => {
            allTimes.add(time);
        });
        
        // Convert to array and sort
        const timeSlots = Array.from(allTimes).sort();
        
        // Generate the calendar grid
        let calendarHTML = '';
        
        // Create time slots for each time
        timeSlots.forEach(timeSlot => {
            // Format display time (e.g., convert "07:00" to "7:00 AM")
            const displayTime = formatTimeForDisplay(timeSlot);
            
            // Create a row for this time slot
            calendarHTML += `
                <div class="time-slot-row">
                    <div class="time-label">${displayTime}</div>
            `;
            
            // Create cells for each day (1-6 are Monday-Saturday, 0 is Sunday)
            [1, 2, 3, 4, 5, 6, 0].forEach(dayNum => {
                // Find classes for this day and time slot
                const dayClasses = classes.filter(cls => 
                    parseInt(cls.day_of_week) === dayNum && 
                    cls.start_time === timeSlot
                );
                
                if (dayClasses.length > 0) {
                    // We have classes at this time slot for this day
                    const cls = dayClasses[0]; // Take the first class if multiple
                    
                    // Calculate height based on duration (1 hour = 80px)
                    const durationInHours = cls.duration / 60;
                    const heightInPixels = Math.max(durationInHours * 80 - 10, 70); // Minimum 70px height
                    
                    calendarHTML += `
                        <div class="day-time-slot">
                            <div class="calendar-class" style="height: ${heightInPixels}px" data-id="${cls.class_id}">
                                <div class="calendar-class-name">${cls.name}</div>
                                <div class="calendar-class-details">
                                    <span><i class="fas fa-user"></i> ${cls.instructor}</span>
                                    <span><i class="fas fa-signal"></i> ${cls.level || 'All Levels'}</span>
                                    <span><i class="fas fa-clock"></i> ${cls.duration} min</span>
                                </div>
                                <div class="calendar-class-actions">
                                    <button class="edit-class" data-id="${cls.class_id}" title="Edit Class">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="delete-class" data-id="${cls.class_id}" title="Delete Class">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    // Empty time slot
                    calendarHTML += `
                        <div class="day-time-slot empty" data-day="${dayNum}" data-time="${timeSlot}"></div>
                    `;
                }
            });
            
            calendarHTML += `</div>`;
        });
        
        // Add the calendar HTML to the container
        calendarBody.innerHTML = calendarHTML;
        
        // Add event listeners
        setupWeeklyCalendarListeners();
        
    } catch (error) {
        console.error('Error loading weekly schedule:', error);
        const calendarBody = document.querySelector('.weekly-calendar-body');
        if (calendarBody) {
            calendarBody.innerHTML = `
                <div style="text-align:center;padding:30px;color:#e74c3c;grid-column: 1/-1;">
                    <i class="fas fa-exclamation-circle"></i> Failed to load schedule. Please try again.
                </div>
            `;
        }
    }
}

/**
 * Setup event listeners for weekly calendar
 */
function setupWeeklyCalendarListeners() {
    // Add event listeners for clicking on classes to view bookings
    document.querySelectorAll('.calendar-class').forEach(classElement => {
        classElement.addEventListener('click', (e) => {
            // Don't trigger if clicking on action buttons
            if (e.target.closest('.calendar-class-actions')) {
                return;
            }
            
            const classId = classElement.getAttribute('data-id');
            openBookingsModal(classId);
        });
    });
    
    // Add event listeners for editing classes
    document.querySelectorAll('.calendar-class-actions .edit-class').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const classId = button.getAttribute('data-id');
            editClass(classId);
        });
    });
    
    // Add event listeners for deleting classes
    document.querySelectorAll('.calendar-class-actions .delete-class').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const classId = button.getAttribute('data-id');
            deleteClass(classId);
        });
    });
    
    // Add event listeners for empty time slots
    document.querySelectorAll('.day-time-slot.empty').forEach(slot => {
        slot.addEventListener('click', () => {
            const day = slot.getAttribute('data-day');
            const time = slot.getAttribute('data-time');
            
            // Open modal for adding new class (no data object)
            openClassModal();
            
            // Pre-fill the day and time after modal opens
            setTimeout(() => {
                const daySelect = document.getElementById('class-day');
                const timeInput = document.getElementById('class-time');
                
                if (daySelect) {
                    daySelect.value = day;
                }
                if (timeInput && time) {
                    timeInput.value = time.substring(0, 5); // Extract HH:MM from HH:MM:SS
                }
            }, 100);
        });
    });
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

/**
 * Open bookings modal for a specific class
 */
async function openBookingsModal(classId) {
    try {
        const modal = document.getElementById('class-bookings-modal');
        const modalTitle = document.getElementById('bookings-modal-title');
        
        if (!modal || !modalTitle) return;
        
        // Show modal
        modal.style.display = 'block';
        
        // Set loading state
        modalTitle.textContent = 'Loading Class Bookings...';
        document.getElementById('bookings-count').textContent = '0';
        document.getElementById('available-spaces').textContent = '0';
        document.getElementById('class-capacity').textContent = '0';
        document.getElementById('class-summary-content').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        
        const bookingsTableBody = document.querySelector('#class-bookings-table tbody');
        if (bookingsTableBody) {
            bookingsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;padding:30px;">
                        <i class="fas fa-spinner fa-spin"></i> Loading bookings...
                    </td>
                </tr>
            `;
        }
        
        // Get class details first
        const classes = await AdminApiService.getClasses();
        const classData = classes.find(cls => cls.class_id == classId);
        
        if (!classData) {
            showErrorMessage('Class not found');
            modal.style.display = 'none';
            return;
        }
        
        // Update modal title with class name
        modalTitle.textContent = `Bookings: ${classData.name}`;
        
        // Calculate next class date (for current week)
        const today = new Date();
        const dayOfWeek = classData.day_of_week; // 0 = Sunday, 1 = Monday, etc.
        const nextClassDate = getNextClassDate(dayOfWeek);
        const dateString = nextClassDate.toISOString().split('T')[0];
        
        // Update class summary
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        document.getElementById('class-summary-content').innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div><strong>Instructor:</strong> ${classData.instructor}</div>
                <div><strong>Level:</strong> ${classData.level || 'All Levels'}</div>
                <div><strong>Day:</strong> ${dayNames[dayOfWeek]}</div>
                <div><strong>Time:</strong> ${formatTimeForDisplay(classData.start_time)}</div>
                <div><strong>Duration:</strong> ${classData.duration} minutes</div>
                <div><strong>Next Class:</strong> ${nextClassDate.toLocaleDateString()}</div>
            </div>
        `;
        
        // Fetch bookings for this class
        const response = await fetch(`/api/schedule/class/${classId}/bookings?date=${dateString}`);
        const bookingsData = await response.json();
        
        if (bookingsData.success) {
            const bookings = bookingsData.bookings || [];
            const capacity = classData.capacity || 20;
            const bookedCount = bookings.length;
            const availableSpaces = Math.max(0, capacity - bookedCount);
            
            // Update stats
            document.getElementById('bookings-count').textContent = bookedCount;
            document.getElementById('available-spaces').textContent = availableSpaces;
            document.getElementById('class-capacity').textContent = capacity;
            
            // Render bookings table
            renderBookingsTable(bookings);
        } else {
            showErrorMessage('Failed to load bookings: ' + bookingsData.message);
            renderBookingsTable([]);
        }
        
        // Setup modal event handlers
        setupBookingsModalEventHandlers();
        
    } catch (error) {
        console.error('Error opening bookings modal:', error);
        showErrorMessage('Failed to load class bookings');
        
        const modal = document.getElementById('class-bookings-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

/**
 * Get the next occurrence of a class (for current week)
 */
function getNextClassDate(dayOfWeek) {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate days until the target day
    let daysUntilClass = dayOfWeek - currentDay;
    
    // If the class day has already passed this week, get next week's occurrence
    if (daysUntilClass < 0) {
        daysUntilClass += 7;
    }
    
    const nextClassDate = new Date(today);
    nextClassDate.setDate(today.getDate() + daysUntilClass);
    
    return nextClassDate;
}

/**
 * Render bookings table
 */
function renderBookingsTable(bookings) {
    const bookingsTableBody = document.querySelector('#class-bookings-table tbody');
    if (!bookingsTableBody) return;
    
    if (!bookings || bookings.length === 0) {
        bookingsTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:30px;">
                    <i class="fas fa-info-circle"></i> No bookings found for this class.
                </td>
            </tr>
        `;
        return;
    }
    
    bookingsTableBody.innerHTML = bookings.map(booking => {
        const statusClass = booking.status === 'Confirmed' ? 'status-confirmed' : 
                           booking.status === 'Attended' ? 'status-attended' : 
                           booking.status === 'Cancelled' ? 'status-cancelled' : 'status-pending';
        
        const bookingDate = new Date(booking.created_at).toLocaleDateString();
        
        return `
            <tr>
                <td>
                    <div class="customer-info">
                        <div class="customer-name">${booking.user_name}</div>
                        <div class="customer-id" style="font-size: 0.8em; color: #666;">ID: ${booking.user_id}</div>
                    </div>
                </td>
                <td>
                    <a href="mailto:${booking.user_email}" style="color: var(--primary-color);">
                        ${booking.user_email}
                    </a>
                </td>
                <td>
                    ${booking.user_phone ? `<a href="tel:${booking.user_phone}" style="color: var(--primary-color);">${booking.user_phone}</a>` : 'N/A'}
                </td>
                <td>
                    <span class="booking-status ${statusClass}">${booking.status}</span>
                </td>
                <td>${bookingDate}</td>
                <td class="booking-actions">
                    <button class="admin-btn-icon" onclick="viewCustomerProfile(${booking.user_id})" title="View Profile">
                        <i class="fas fa-user"></i>
                    </button>
                    <button class="admin-btn-icon" onclick="sendMessage('${booking.user_email}')" title="Send Message">
                        <i class="fas fa-envelope"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Setup bookings modal event handlers
 */
function setupBookingsModalEventHandlers() {
    const modal = document.getElementById('class-bookings-modal');
    if (!modal) return;
    
    // Close modal when clicking X
    const closeBtn = modal.querySelector('.admin-modal-close');
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
    }
    
    // Close modal when clicking Cancel
    const cancelBtn = modal.querySelector('.admin-modal-cancel');
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            modal.style.display = 'none';
        };
    }
    
    // Close modal when clicking outside
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
    
    // Export bookings functionality
    const exportBtn = document.getElementById('export-bookings-btn');
    if (exportBtn) {
        exportBtn.onclick = () => {
            exportBookings();
        };
    }
}

/**
 * View customer profile (placeholder function)
 */
function viewCustomerProfile(userId) {
    // This could open a customer profile modal or navigate to a customer page
    console.log('View customer profile:', userId);
    showSuccessMessage(`Customer profile view for user ${userId} - Feature coming soon!`);
}

/**
 * Send message to customer (placeholder function)
 */
function sendMessage(email) {
    // This could open an email client or messaging modal
    window.location.href = `mailto:${email}`;
}

/**
 * Export bookings to CSV
 */
function exportBookings() {
    const table = document.getElementById('class-bookings-table');
    const modalTitle = document.getElementById('bookings-modal-title').textContent;
    
    if (!table) return;
    
    let csv = 'Customer Name,Email,Phone,Status,Booking Date\n';
    
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 5) {
            const customerName = cells[0].querySelector('.customer-name')?.textContent || '';
            const email = cells[1].textContent.trim();
            const phone = cells[2].textContent.trim() === 'N/A' ? '' : cells[2].textContent.trim();
            const status = cells[3].textContent.trim();
            const bookingDate = cells[4].textContent.trim();
            
            csv += `"${customerName}","${email}","${phone}","${status}","${bookingDate}"\n`;
        }
    });
    
    // Create and download file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${modalTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_bookings.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showSuccessMessage('Bookings exported successfully!');
}
