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

    // Initialize text editor controls with default values
    // Will be updated when settings are loaded from API
    initializeTextEditors();
    
    // Initialize save button
    document.getElementById('save-all-settings').addEventListener('click', saveAllSettings);
});

/**
 * Create text editor controls dynamically
 * @param {string} containerId - ID of the container where controls should be added
 * @param {string} targetId - ID of the text element to style
 * @param {string} defaultFont - Default font family
 * @param {string} defaultSize - Default font size
 * @returns {Object} - Object containing the created font and size selectors
 */
function createTextEditorControls(containerId, targetId, defaultFont, defaultSize) {
    const container = document.getElementById(containerId);
    if (!container) return { fontSelector: null, sizeSelector: null };
    
    // Clear existing controls if any
    container.innerHTML = '';
    
    // Create the controls structure
    const fontSelector = document.createElement('select');
    fontSelector.id = `${targetId}-font`;
    fontSelector.className = 'font-selector';
    
    const sizeSelector = document.createElement('select');
    sizeSelector.id = `${targetId}-size`;
    sizeSelector.className = 'size-selector';
    
    // Add font options
    const fonts = [
        // Standard fonts
        { value: "Arial, sans-serif", label: "Arial" },
        { value: "'Times New Roman', serif", label: "Times New Roman" },
        { value: "'Helvetica Neue', Helvetica, sans-serif", label: "Helvetica Neue" },
        { value: "Georgia, serif", label: "Georgia" },
        { value: "'Courier New', monospace", label: "Courier New" },
        { value: "'Open Sans', sans-serif", label: "Open Sans" },
        { value: "'Roboto', sans-serif", label: "Roboto" },
        { value: "'Playfair Display', serif", label: "Playfair Display" },
        
        // Cursive and script fonts
        { value: "'Dancing Script', cursive", label: "Dancing Script" },
        { value: "'Great Vibes', cursive", label: "Great Vibes" },
        { value: "'Pacifico', cursive", label: "Pacifico" },
        { value: "'Sacramento', cursive", label: "Sacramento" },
        { value: "'Allura', cursive", label: "Allura" },
        { value: "'Satisfy', cursive", label: "Satisfy" },
        { value: "'Pinyon Script', cursive", label: "Pinyon Script" },
        { value: "'Tangerine', cursive", label: "Tangerine" },
        { value: "'Alex Brush', cursive", label: "Alex Brush" },
        
        // Creative and organic fonts
        { value: "'Amatic SC', cursive", label: "Amatic SC" },
        { value: "'Caveat', cursive", label: "Caveat" },
        { value: "'Indie Flower', cursive", label: "Indie Flower" },
        { value: "'Kalam', cursive", label: "Kalam" },
        { value: "'Shadows Into Light', cursive", label: "Shadows Into Light" },
        { value: "'Architects Daughter', cursive", label: "Architects Daughter" },
        { value: "'Comic Neue', cursive", label: "Comic Neue" },
        { value: "'Courgette', cursive", label: "Courgette" }
    ];
    
    fonts.forEach(font => {
        const option = document.createElement('option');
        option.value = font.value;
        option.textContent = font.label;
        option.style.fontFamily = font.value;
        fontSelector.appendChild(option);
    });
    
    // Add size options - different ranges for headings vs. body text
    const sizes = targetId.includes('heading') ? 
        ["16px", "18px", "20px", "24px", "28px", "32px", "36px", "42px", "48px", "56px"] :
        ["14px", "16px", "18px", "20px", "22px", "24px"];
    
    sizes.forEach(size => {
        const option = document.createElement('option');
        option.value = size;
        option.textContent = size;
        sizeSelector.appendChild(option);
    });
    
    // Add the selectors to the container
    container.appendChild(fontSelector);
    container.appendChild(sizeSelector);
    
    // Get the target element
    const targetElement = document.getElementById(targetId);
    if (!targetElement) return { fontSelector, sizeSelector };
    
    // Add event listeners
    fontSelector.addEventListener('change', function() {
        targetElement.style.fontFamily = this.value;
        
        // Also update the font selector dropdown to show the text in the selected font
        this.style.fontFamily = this.value;
    });
    
    sizeSelector.addEventListener('change', function() {
        targetElement.style.fontSize = this.value;
    });
    
    // Set default values
    fontSelector.value = defaultFont;
    sizeSelector.value = defaultSize;
    
    // Apply initial styles
    targetElement.style.fontFamily = defaultFont;
    targetElement.style.fontSize = defaultSize;
    
    return { fontSelector, sizeSelector };
}

/**
 * Initialize text editors for fonts and sizes
 */
function initializeTextEditors() {
    // Create text editor controls for each editable text element
    createTextEditorControls('hero-heading-controls', 'hero-heading', "'Playfair Display', serif", "48px");
    createTextEditorControls('hero-subheading-controls', 'hero-subheading', "'Open Sans', sans-serif", "20px");
    createTextEditorControls('instructor-bio-controls', 'instructor-bio', "'Open Sans', sans-serif", "16px");
}

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
    // Hero Text
    const heroTextData = {
        heading: {
            text: document.getElementById('hero-heading').value,
            font: document.getElementById('hero-heading-font').value,
            size: document.getElementById('hero-heading-size').value
        },
        subheading: {
            text: document.getElementById('hero-subheading').value,
            font: document.getElementById('hero-subheading-font').value,
            size: document.getElementById('hero-subheading-size').value
        }
    };

    // About section
    const aboutData = {
        name: document.getElementById('instructor-name').value,
        subtitle: document.getElementById('instructor-subtitle').value,
        bio: document.getElementById('instructor-bio').value,
        bioFont: document.getElementById('instructor-bio-font').value,
        bioSize: document.getElementById('instructor-bio-size').value
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
        heroText: heroTextData,
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
    // Populate Hero Text section with text and font settings
    if (settings.heroText) {
        if (settings.heroText.heading) {
            const heroHeading = document.getElementById('hero-heading');
            const heroHeadingFont = document.getElementById('hero-heading-font');
            const heroHeadingSize = document.getElementById('hero-heading-size');
            
            if (heroHeading && settings.heroText.heading.text) {
                heroHeading.value = settings.heroText.heading.text;
            }
            
            if (heroHeadingFont && settings.heroText.heading.font) {
                heroHeadingFont.value = settings.heroText.heading.font;
                heroHeading.style.fontFamily = settings.heroText.heading.font;
            }
            
            if (heroHeadingSize && settings.heroText.heading.size) {
                heroHeadingSize.value = settings.heroText.heading.size;
                heroHeading.style.fontSize = settings.heroText.heading.size;
            }
        }
        
        if (settings.heroText.subheading) {
            const heroSubheading = document.getElementById('hero-subheading');
            const heroSubheadingFont = document.getElementById('hero-subheading-font');
            const heroSubheadingSize = document.getElementById('hero-subheading-size');
            
            if (heroSubheading && settings.heroText.subheading.text) {
                heroSubheading.value = settings.heroText.subheading.text;
            }
            
            if (heroSubheadingFont && settings.heroText.subheading.font) {
                heroSubheadingFont.value = settings.heroText.subheading.font;
                heroSubheading.style.fontFamily = settings.heroText.subheading.font;
            }
            
            if (heroSubheadingSize && settings.heroText.subheading.size) {
                heroSubheadingSize.value = settings.heroText.subheading.size;
                heroSubheading.style.fontSize = settings.heroText.subheading.size;
            }
        }
    }
    
    // Populate About section
    document.getElementById('instructor-name').value = settings.about.name;
    document.getElementById('instructor-subtitle').value = settings.about.subtitle;
    document.getElementById('instructor-bio').value = settings.about.bio;
    
    // Apply font settings for biography if they exist
    const biographyFont = document.getElementById('instructor-bio-font');
    const biographySize = document.getElementById('instructor-bio-size');
    const biography = document.getElementById('instructor-bio');
    
    if (biographyFont && settings.about.bioFont) {
        biographyFont.value = settings.about.bioFont;
        biography.style.fontFamily = settings.about.bioFont;
    }
    
    if (biographySize && settings.about.bioSize) {
        biographySize.value = settings.about.bioSize;
        biography.style.fontSize = settings.about.bioSize;
    }
    
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
