/**
 * Admin Settings JavaScript for Gabi Jyoti Yoga
 * 
 * This file handles the functionality for the admin settings page,
 * including profile updates, certification management, and section toggling.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Load existing settings from the API
    fetchExistingSettings();
    
    // Initialize toggle switches
    initializeToggles();
    
    // Initialize certification management
    initializeCertifications();
    
    // Initialize photo upload preview
    initializePhotoPreview();
    
    // Initialize save button
    document.getElementById('save-all-settings').addEventListener('click', saveAllSettings);
});

/**
 * Fetch existing settings from the API
 */
function fetchExistingSettings() {
    // First try to get settings from the authenticated admin endpoint
    const authToken = localStorage.getItem('auth_token');
    
    if (authToken) {
        fetch('/api/admin/settings', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch settings');
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.settings) {
                // Apply the settings to the form
                applySettingsFromAPI(data.settings);
                console.log('Settings loaded successfully from admin API:', data.settings);
            }
        })
        .catch(error => {
            console.error('Error fetching settings from admin API:', error);
            // Fall back to the public endpoint
            fallbackToPublicSettings();
        });
    } else {
        // No auth token, fall back to public endpoint
        console.log('No authentication token found. Please log in to edit settings.');
        fallbackToPublicSettings();
    }
}

/**
 * Fallback to public settings endpoint
 * This is used to pre-fill the form even when not authenticated
 */
function fallbackToPublicSettings() {
    fetch('/api/website-settings')
    .then(response => response.json())
    .then(data => {
        if (data.success && data.settings) {
            // Apply the settings to the form
            applySettingsFromAPI(data.settings);
            console.log('Settings loaded successfully from public API:', data.settings);
        } else {
            console.error('Error loading settings from public API:', data.message || 'Unknown error');
        }
    })
    .catch(error => {
        console.error('Error fetching public settings:', error);
    });
}

/**
 * Initialize toggle switches with change event listeners
 */
function initializeToggles() {
    // Get all toggle switches
    const toggleSwitches = document.querySelectorAll('.toggle-switch input[type="checkbox"]');
    
    // Add change event listener to each toggle
    toggleSwitches.forEach(toggle => {
        toggle.addEventListener('change', function() {
            console.log(`Toggle ${this.id} changed to: ${this.checked}`);
        });
    });
}

/**
 * Initialize certification management (add/remove)
 */
function initializeCertifications() {
    // Add certification button
    document.getElementById('add-certification').addEventListener('click', function() {
        const table = document.getElementById('certifications-table').getElementsByTagName('tbody')[0];
        
        // Create new row
        const newRow = table.insertRow();
        
        // Create cells
        const cell1 = newRow.insertCell(0);
        const cell2 = newRow.insertCell(1);
        
        // Add content to cells
        cell1.innerHTML = '<input type="text" class="admin-form-control" placeholder="Enter certification">';
        cell2.classList.add('admin-table-actions');
        cell2.innerHTML = '<button class="delete-certification" title="Remove certification"><i class="fas fa-trash-alt"></i></button>';
        
        // Add event listener to the delete button
        addDeleteCertificationListener(cell2.querySelector('.delete-certification'));
    });
    
    // Add event listeners to existing delete buttons
    const deleteButtons = document.querySelectorAll('.delete-certification');
    deleteButtons.forEach(button => {
        addDeleteCertificationListener(button);
    });
}

/**
 * Add event listener to certification delete button
 */
function addDeleteCertificationListener(button) {
    button.addEventListener('click', function() {
        // Get the row to delete
        const row = this.closest('tr');
        
        // Remove the row from the table
        row.parentNode.removeChild(row);
    });
}

/**
 * Initialize photo preview functionality
 */
function initializePhotoPreview() {
    const photoInput = document.getElementById('instructor-photo');
    const photoPreview = document.getElementById('instructor-photo-preview');
    
    photoInput.addEventListener('change', function() {
        const file = this.files[0];
        
        if (file) {
            const reader = new FileReader();
            
            reader.addEventListener('load', function() {
                photoPreview.src = reader.result;
            });
            
            reader.readAsDataURL(file);
        }
    });
}

/**
 * Save all settings
 */
function saveAllSettings() {
    // Gather all settings data
    const settingsData = collectSettingsData();
    
    // Send settings to the server
    fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(settingsData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success notification
            showNotification();
            console.log('Settings saved successfully:', data);
        } else {
            console.error('Error saving settings:', data.message);
            alert('Error saving settings: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error saving settings:', error);
        alert('Error saving settings. Please try again.');
    });
}

/**
 * Collect all settings data from the form
 */
function collectSettingsData() {
    // About section
    const aboutData = {
        name: document.getElementById('instructor-name').value,
        subtitle: document.getElementById('instructor-subtitle').value,
        bio: document.getElementById('instructor-bio').value
    };
    
    // Certifications
    const certificationRows = document.querySelectorAll('#certifications-table tbody tr');
    const certifications = Array.from(certificationRows).map(row => {
        return row.querySelector('input').value;
    }).filter(cert => cert.trim() !== '');
    
    // Homepage section toggles
    const sectionToggles = {
        // Classes & Offerings
        groupClasses: document.getElementById('toggle-group-classes').checked,
        privateLessons: document.getElementById('toggle-private-lessons').checked,
        workshops: document.getElementById('toggle-workshops').checked,
        retreats: document.getElementById('toggle-retreats').checked,
        
        // Other Sections
        retreatsSection: document.getElementById('toggle-retreats-section').checked,
        scheduleSection: document.getElementById('toggle-schedule-section').checked,
        membershipSection: document.getElementById('toggle-membership-section').checked,
        gallerySection: document.getElementById('toggle-gallery-section').checked
    };
    
    // Contact information
    const contactInfo = {
        address: document.getElementById('contact-address').value,
        phone: document.getElementById('contact-phone').value,
        email: document.getElementById('contact-email').value,
        socialMedia: {
            facebook: document.getElementById('social-facebook').value,
            instagram: document.getElementById('social-instagram').value,
            youtube: document.getElementById('social-youtube').value
        }
    };
    
    // Return compiled settings object
    return {
        about: aboutData,
        certifications: certifications,
        sectionToggles: sectionToggles,
        contactInfo: contactInfo
    };
}

/**
 * Show a success notification
 */
function showNotification() {
    const notification = document.getElementById('settings-notification');
    
    // Add active class to show notification
    notification.classList.add('active');
    
    // Remove active class after 3 seconds
    setTimeout(() => {
        notification.classList.remove('active');
    }, 3000);
}

/**
 * Apply settings from API
 * This would be used when the page loads to populate the form with existing settings
 */
function applySettingsFromAPI(settings) {
    // This function would be called with the settings data from the API
    // For this demo, it's not being called but would be used in a real application
    
    // Populate About section
    document.getElementById('instructor-name').value = settings.about.name;
    document.getElementById('instructor-subtitle').value = settings.about.subtitle;
    document.getElementById('instructor-bio').value = settings.about.bio;
    
    // Populate certifications
    // First clear existing rows
    const certTable = document.getElementById('certifications-table').getElementsByTagName('tbody')[0];
    while (certTable.firstChild) {
        certTable.removeChild(certTable.firstChild);
    }
    
    // Add each certification
    settings.certifications.forEach(cert => {
        const newRow = certTable.insertRow();
        
        const cell1 = newRow.insertCell(0);
        const cell2 = newRow.insertCell(1);
        
        cell1.innerHTML = `<input type="text" class="admin-form-control" value="${cert}">`;
        cell2.classList.add('admin-table-actions');
        cell2.innerHTML = '<button class="delete-certification" title="Remove certification"><i class="fas fa-trash-alt"></i></button>';
        
        addDeleteCertificationListener(cell2.querySelector('.delete-certification'));
    });
    
    // Set toggle switches
    document.getElementById('toggle-group-classes').checked = settings.sectionToggles.groupClasses;
    document.getElementById('toggle-private-lessons').checked = settings.sectionToggles.privateLessons;
    document.getElementById('toggle-workshops').checked = settings.sectionToggles.workshops;
    document.getElementById('toggle-retreats').checked = settings.sectionToggles.retreats;
    
    document.getElementById('toggle-retreats-section').checked = settings.sectionToggles.retreatsSection;
    document.getElementById('toggle-schedule-section').checked = settings.sectionToggles.scheduleSection;
    document.getElementById('toggle-membership-section').checked = settings.sectionToggles.membershipSection;
    document.getElementById('toggle-gallery-section').checked = settings.sectionToggles.gallerySection;
    
    // Set contact information
    document.getElementById('contact-address').value = settings.contactInfo.address;
    document.getElementById('contact-phone').value = settings.contactInfo.phone;
    document.getElementById('contact-email').value = settings.contactInfo.email;
    
    document.getElementById('social-facebook').value = settings.contactInfo.socialMedia.facebook;
    document.getElementById('social-instagram').value = settings.contactInfo.socialMedia.instagram;
    document.getElementById('social-youtube').value = settings.contactInfo.socialMedia.youtube;
}
