/**
 * Admin Settings JavaScript for Gabi Jyoti Yoga
 */

document.addEventListener('DOMContentLoaded', function() {
    // Init all functionality
    fetchExistingSettings();
    initializeToggles();
    initializeCertifications();
    initializePhotoPreview();
    initializeTextEditors();
    
    // Initialize save button
    document.getElementById('save-all-settings').addEventListener('click', saveAllSettings);
});

/**
 * Create text editor controls dynamically
 */
function createTextEditorControls(containerId, targetId, defaultFont, defaultSize) {
    const container = document.getElementById(containerId);
    if (!container) return { fontSelector: null, sizeSelector: null };
    
    // Clear existing controls
    container.innerHTML = '';
    
    // Create controls
    const fontSelector = document.createElement('select');
    fontSelector.id = `${targetId}-font`;
    fontSelector.className = 'font-selector';
    
    const sizeSelector = document.createElement('select');
    sizeSelector.id = `${targetId}-size`;
    sizeSelector.className = 'size-selector';
    
    // Add font options
    const fonts = [
        // Site theme fonts
        { value: "'Playfair Display', serif", label: "Playfair Display (Site Headers)" },
        { value: "'Open Sans', sans-serif", label: "Open Sans (Site Body)" },
        
        // Custom fonts
        { value: "'Julietta', serif", label: "Julietta" },
        { value: "'Themunday', serif", label: "Themunday" },
        
        // Standard fonts
        { value: "Arial, sans-serif", label: "Arial" },
        { value: "'Times New Roman', serif", label: "Times New Roman" },
        { value: "'Helvetica Neue', Helvetica, sans-serif", label: "Helvetica Neue" },
        { value: "Georgia, serif", label: "Georgia" },
        { value: "'Courier New', monospace", label: "Courier New" },
        { value: "'Roboto', sans-serif", label: "Roboto" },
        
        // Script fonts 
        { value: "'Dancing Script', cursive", label: "Dancing Script" },
        { value: "'Great Vibes', cursive", label: "Great Vibes" },
        { value: "'Pacifico', cursive", label: "Pacifico" },
        { value: "'Sacramento', cursive", label: "Sacramento" },
        { value: "'Allura', cursive", label: "Allura" },
        { value: "'Satisfy', cursive", label: "Satisfy" },
        
        // Creative fonts
        { value: "'Amatic SC', cursive", label: "Amatic SC" },
        { value: "'Caveat', cursive", label: "Caveat" },
        { value: "'Shadows Into Light', cursive", label: "Shadows Into Light" }
    ];
    
    fonts.forEach(font => {
        const option = document.createElement('option');
        option.value = font.value;
        option.textContent = font.label;
        option.style.fontFamily = font.value;
        fontSelector.appendChild(option);
    });
    
    // Add size options
    const sizes = targetId.includes('heading') ? 
        ["16px", "18px", "20px", "24px", "28px", "32px", "36px", "42px", "48px", "56px", "64px", "72px"] :
        ["12px", "14px", "16px", "18px", "20px", "22px", "24px", "26px", "28px", "32px"];
    
    sizes.forEach(size => {
        const option = document.createElement('option');
        option.value = size;
        option.textContent = size;
        sizeSelector.appendChild(option);
    });
    
    // Create text formatting controls
    const formattingControls = document.createElement('div');
    formattingControls.className = 'formatting-controls';
    
    // Bold button
    const boldButton = document.createElement('button');
    boldButton.type = 'button';
    boldButton.className = 'format-button';
    boldButton.innerHTML = '<i class="fas fa-bold"></i>';
    boldButton.title = 'Bold';
    
    // Italic button
    const italicButton = document.createElement('button');
    italicButton.type = 'button';
    italicButton.className = 'format-button';
    italicButton.innerHTML = '<i class="fas fa-italic"></i>';
    italicButton.title = 'Italic';
    
    // Underline button
    const underlineButton = document.createElement('button');
    underlineButton.type = 'button';
    underlineButton.className = 'format-button';
    underlineButton.innerHTML = '<i class="fas fa-underline"></i>';
    underlineButton.title = 'Underline';
    
    // For hero text, set text-align to center by default
    if (targetId.includes('hero')) {
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            targetElement.style.textAlign = 'center';
        }
    }
    
    // Add buttons to controls
    formattingControls.appendChild(boldButton);
    formattingControls.appendChild(italicButton);
    formattingControls.appendChild(underlineButton);
    
    // Add divider
    formattingControls.appendChild(document.createElement('span')).className = 'divider';
    
    // Add the selectors to the formatting controls (all in one row)
    fontSelector.style.marginLeft = '4px';
    formattingControls.appendChild(fontSelector);
    formattingControls.appendChild(sizeSelector);
    
    // Add to container
    container.appendChild(formattingControls);
    
    // Get target element
    const targetElement = document.getElementById(targetId);
    if (!targetElement) return { fontSelector, sizeSelector };
    
    // Add event listeners
    fontSelector.addEventListener('change', function() {
        targetElement.style.fontFamily = this.value;
        this.style.fontFamily = this.value;
        
        // Update homepage text preview
        if (targetId.includes('hero')) {
            updateHomepageText();
        }
    });
    
    sizeSelector.addEventListener('change', function() {
        targetElement.style.fontSize = this.value;
        
        if (targetId.includes('hero')) {
            updateHomepageText();
        }
    });
    
    // Bold button
    boldButton.addEventListener('click', function() {
        const currentWeight = getComputedStyle(targetElement).fontWeight;
        if (currentWeight === 'bold' || currentWeight >= 700) {
            targetElement.style.fontWeight = 'normal';
            this.classList.remove('active');
        } else {
            targetElement.style.fontWeight = 'bold';
            this.classList.add('active');
        }
        
        if (targetId.includes('hero')) {
            updateHomepageText();
        }
    });
    
    // Italic button
    italicButton.addEventListener('click', function() {
        const currentStyle = getComputedStyle(targetElement).fontStyle;
        if (currentStyle === 'italic') {
            targetElement.style.fontStyle = 'normal';
            this.classList.remove('active');
        } else {
            targetElement.style.fontStyle = 'italic';
            this.classList.add('active');
        }
        
        if (targetId.includes('hero')) {
            updateHomepageText();
        }
    });
    
    // Underline button
    underlineButton.addEventListener('click', function() {
        const currentDecoration = getComputedStyle(targetElement).textDecoration;
        if (currentDecoration.includes('underline')) {
            targetElement.style.textDecoration = 'none';
            this.classList.remove('active');
        } else {
            targetElement.style.textDecoration = 'underline';
            this.classList.add('active');
        }
        
        if (targetId.includes('hero')) {
            updateHomepageText();
        }
    });
    
    // Set default values
    fontSelector.value = defaultFont;
    sizeSelector.value = defaultSize;
    
    // Apply initial styles
    targetElement.style.fontFamily = defaultFont;
    targetElement.style.fontSize = defaultSize;
    
    // Center hero elements
    if (targetId.includes('hero')) {
        targetElement.style.textAlign = 'center';
    }
    
    return { fontSelector, sizeSelector };
}

/**
 * Update homepage preview with current settings
 */
function updateHomepageText() {
    console.log('Updating homepage text preview with current settings');
    
    // Get current settings
    const heroHeading = document.getElementById('hero-heading');
    const heroSubheading = document.getElementById('hero-subheading');
    
    if (heroHeading && heroSubheading) {
        // Log current settings
        console.log('Hero Heading:', {
            text: heroHeading.value,
            font: heroHeading.style.fontFamily,
            size: heroHeading.style.fontSize,
            weight: heroHeading.style.fontWeight,
            style: heroHeading.style.fontStyle,
            decoration: heroHeading.style.textDecoration,
            align: 'center'
        });
        
        // Update preview elements if they exist
        const previewHeading = document.getElementById('preview-hero-heading');
        const previewSubheading = document.getElementById('preview-hero-subheading');
        
        if (previewHeading) {
            previewHeading.textContent = heroHeading.value;
            previewHeading.style.fontFamily = heroHeading.style.fontFamily;
            previewHeading.style.fontSize = heroHeading.style.fontSize;
            previewHeading.style.fontWeight = heroHeading.style.fontWeight;
            previewHeading.style.fontStyle = heroHeading.style.fontStyle;
            previewHeading.style.textDecoration = heroHeading.style.textDecoration;
            previewHeading.style.textAlign = 'center';
        }
        
        if (previewSubheading) {
            previewSubheading.textContent = heroSubheading.value;
            previewSubheading.style.fontFamily = heroSubheading.style.fontFamily;
            previewSubheading.style.fontSize = heroSubheading.style.fontSize;
            previewSubheading.style.fontWeight = heroSubheading.style.fontWeight;
            previewSubheading.style.fontStyle = heroSubheading.style.fontStyle;
            previewSubheading.style.textDecoration = heroSubheading.style.textDecoration;
            previewSubheading.style.textAlign = 'center';
        }
    }
}

/**
 * Initialize text editors
 */
function initializeTextEditors() {
    createTextEditorControls('hero-heading-controls', 'hero-heading', "'Playfair Display', serif", "48px");
    createTextEditorControls('hero-subheading-controls', 'hero-subheading', "'Open Sans', sans-serif", "20px");
    createTextEditorControls('instructor-bio-controls', 'instructor-bio', "'Open Sans', sans-serif", "16px");
}

/**
 * Fetch settings from API
 */
function fetchExistingSettings() {
    const authToken = localStorage.getItem('auth_token');
    
    if (authToken) {
        fetch('/api/admin/settings', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch settings');
            return response.json();
        })
        .then(data => {
            if (data.success && data.settings) {
                applySettingsFromAPI(data.settings);
                updateHomepageText();
            }
        })
        .catch(error => {
            console.error('Error fetching settings:', error);
            fallbackToPublicSettings();
        });
    } else {
        console.log('No auth token found. Please log in to edit settings.');
        fallbackToPublicSettings();
    }
}

/**
 * Fallback to public settings endpoint
 */
function fallbackToPublicSettings() {
    fetch('/api/website-settings')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.settings) {
                applySettingsFromAPI(data.settings);
                updateHomepageText();
            }
        })
        .catch(error => {
            console.error('Error fetching public settings:', error);
        });
}

/**
 * Initialize toggle switches
 */
function initializeToggles() {
    const toggleSwitches = document.querySelectorAll('.toggle-switch input[type="checkbox"]');
    toggleSwitches.forEach(toggle => {
        toggle.addEventListener('change', function() {
            console.log(`Toggle ${this.id} changed to: ${this.checked}`);
        });
    });
}

/**
 * Initialize certification management
 */
function initializeCertifications() {
    document.getElementById('add-certification').addEventListener('click', function() {
        const table = document.getElementById('certifications-table').getElementsByTagName('tbody')[0];
        const newRow = table.insertRow();
        const cell1 = newRow.insertCell(0);
        const cell2 = newRow.insertCell(1);
        
        cell1.innerHTML = '<input type="text" class="admin-form-control" placeholder="Enter certification">';
        cell2.classList.add('admin-table-actions');
        cell2.innerHTML = '<button class="delete-certification" title="Remove certification"><i class="fas fa-trash-alt"></i></button>';
        
        addDeleteCertificationListener(cell2.querySelector('.delete-certification'));
    });
    
    const deleteButtons = document.querySelectorAll('.delete-certification');
    deleteButtons.forEach(button => {
        addDeleteCertificationListener(button);
    });
}

/**
 * Add delete event listener
 */
function addDeleteCertificationListener(button) {
    button.addEventListener('click', function() {
        const row = this.closest('tr');
        row.parentNode.removeChild(row);
    });
}

/**
 * Initialize photo preview
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
    const settingsData = collectSettingsData();
    
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
            showNotification();
            updateHomepageText();
        } else {
            alert('Error saving settings: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error saving settings:', error);
        alert('Error saving settings. Please try again.');
    });
}

/**
 * Collect form data
 */
function collectSettingsData() {
    const heroHeading = document.getElementById('hero-heading');
    const heroSubheading = document.getElementById('hero-subheading');
    const instructorBio = document.getElementById('instructor-bio');
    
    // Hero text
    const heroTextData = {
        heading: {
            text: heroHeading.value,
            font: document.getElementById('hero-heading-font').value,
            size: document.getElementById('hero-heading-size').value,
            fontWeight: getComputedStyle(heroHeading).fontWeight,
            fontStyle: getComputedStyle(heroHeading).fontStyle,
            textDecoration: getComputedStyle(heroHeading).textDecoration,
            textAlign: 'center' 
        },
        subheading: {
            text: heroSubheading.value,
            font: document.getElementById('hero-subheading-font').value,
            size: document.getElementById('hero-subheading-size').value,
            fontWeight: getComputedStyle(heroSubheading).fontWeight,
            fontStyle: getComputedStyle(heroSubheading).fontStyle,
            textDecoration: getComputedStyle(heroSubheading).textDecoration,
            textAlign: 'center'
        }
    };

    // About section
    const aboutData = {
        name: document.getElementById('instructor-name').value,
        subtitle: document.getElementById('instructor-subtitle').value,
        bio: instructorBio.value,
        bioFont: document.getElementById('instructor-bio-font').value,
        bioSize: document.getElementById('instructor-bio-size').value,
        bioFontWeight: getComputedStyle(instructorBio).fontWeight,
        bioFontStyle: getComputedStyle(instructorBio).fontStyle,
        bioTextDecoration: getComputedStyle(instructorBio).textDecoration,
        bioTextAlign: getComputedStyle(instructorBio).textAlign
    };
    
    // Certifications
    const certificationRows = document.querySelectorAll('#certifications-table tbody tr');
    const certifications = Array.from(certificationRows)
        .map(row => row.querySelector('input').value)
        .filter(cert => cert.trim() !== '');
    
    // Toggles
    const sectionToggles = {
        groupClasses: document.getElementById('toggle-group-classes').checked,
        privateLessons: document.getElementById('toggle-private-lessons').checked,
        workshops: document.getElementById('toggle-workshops').checked,
        retreats: document.getElementById('toggle-retreats').checked,
        retreatsSection: document.getElementById('toggle-retreats-section').checked,
        scheduleSection: document.getElementById('toggle-schedule-section').checked,
        membershipSection: document.getElementById('toggle-membership-section').checked,
        privateSessionsSection: document.getElementById('toggle-private-sessions-section').checked,
        gallerySection: document.getElementById('toggle-gallery-section').checked
    };
    
    // Contact info
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
    
    return {
        heroText: heroTextData,
        about: aboutData,
        certifications: certifications,
        sectionToggles: sectionToggles,
        contactInfo: contactInfo
    };
}

/**
 * Show notification
 */
function showNotification() {
    const notification = document.getElementById('settings-notification');
    notification.classList.add('active');
    setTimeout(() => {
        notification.classList.remove('active');
    }, 3000);
}

/**
 * Apply settings from API response
 */
function applySettingsFromAPI(settings) {
    // Hero Text
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
            
            // Apply formatting
            if (heroHeading) {
                // Font weight
                if (settings.heroText.heading.fontWeight) {
                    heroHeading.style.fontWeight = settings.heroText.heading.fontWeight;
                    const boldButton = heroHeading.closest('.admin-form-group').querySelector('button[title="Bold"]');
                    if (boldButton && (settings.heroText.heading.fontWeight === 'bold' || parseInt(settings.heroText.heading.fontWeight) >= 700)) {
                        boldButton.classList.add('active');
                    }
                }
                
                // Font style
                if (settings.heroText.heading.fontStyle) {
                    heroHeading.style.fontStyle = settings.heroText.heading.fontStyle;
                    const italicButton = heroHeading.closest('.admin-form-group').querySelector('button[title="Italic"]');
                    if (italicButton && settings.heroText.heading.fontStyle === 'italic') {
                        italicButton.classList.add('active');
                    }
                }
                
                // Text decoration
                if (settings.heroText.heading.textDecoration) {
                    heroHeading.style.textDecoration = settings.heroText.heading.textDecoration;
                    const underlineButton = heroHeading.closest('.admin-form-group').querySelector('button[title="Underline"]');
                    if (underlineButton && settings.heroText.heading.textDecoration.includes('underline')) {
                        underlineButton.classList.add('active');
                    }
                }
                
                // Center alignment
                heroHeading.style.textAlign = 'center';
            }
        }
        
        // Subheading
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
            
            // Apply formatting
            if (heroSubheading) {
                // Font weight
                if (settings.heroText.subheading.fontWeight) {
                    heroSubheading.style.fontWeight = settings.heroText.subheading.fontWeight;
                    const boldButton = heroSubheading.closest('.admin-form-group').querySelector('button[title="Bold"]');
                    if (boldButton && (settings.heroText.subheading.fontWeight === 'bold' || parseInt(settings.heroText.subheading.fontWeight) >= 700)) {
                        boldButton.classList.add('active');
                    }
                }
                
                // Font style
                if (settings.heroText.subheading.fontStyle) {
                    heroSubheading.style.fontStyle = settings.heroText.subheading.fontStyle;
                    const italicButton = heroSubheading.closest('.admin-form-group').querySelector('button[title="Italic"]');
                    if (italicButton && settings.heroText.subheading.fontStyle === 'italic') {
                        italicButton.classList.add('active');
                    }
                }
                
                // Text decoration
                if (settings.heroText.subheading.textDecoration) {
                    heroSubheading.style.textDecoration = settings.heroText.subheading.textDecoration;
                    const underlineButton = heroSubheading.closest('.admin-form-group').querySelector('button[title="Underline"]');
                    if (underlineButton && settings.heroText.subheading.textDecoration.includes('underline')) {
                        underlineButton.classList.add('active');
                    }
                }
                
                // Center alignment
                heroSubheading.style.textAlign = 'center';
            }
        }
    }
    
    // About section
    document.getElementById('instructor-name').value = settings.about.name;
    document.getElementById('instructor-subtitle').value = settings.about.subtitle;
    document.getElementById('instructor-bio').value = settings.about.bio;
    
    // Apply bio formatting
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
    
    if (biography) {
        // Font weight
        if (settings.about.bioFontWeight) {
            biography.style.fontWeight = settings.about.bioFontWeight;
            const boldButton = biography.closest('.admin-form-group').querySelector('button[title="Bold"]');
            if (boldButton && (settings.about.bioFontWeight === 'bold' || parseInt(settings.about.bioFontWeight) >= 700)) {
                boldButton.classList.add('active');
            }
        }
        
        // Font style
        if (settings.about.bioFontStyle) {
            biography.style.fontStyle = settings.about.bioFontStyle;
            const italicButton = biography.closest('.admin-form-group').querySelector('button[title="Italic"]');
            if (italicButton && settings.about.bioFontStyle === 'italic') {
                italicButton.classList.add('active');
            }
        }
        
        // Text decoration
        if (settings.about.bioTextDecoration) {
            biography.style.textDecoration = settings.about.bioTextDecoration;
            const underlineButton = biography.closest('.admin-form-group').querySelector('button[title="Underline"]');
            if (underlineButton && settings.about.bioTextDecoration.includes('underline')) {
                underlineButton.classList.add('active');
            }
        }
    }
    
    // Certifications
    const certTable = document.getElementById('certifications-table').getElementsByTagName('tbody')[0];
    while (certTable.firstChild) {
        certTable.removeChild(certTable.firstChild);
    }
    
    settings.certifications.forEach(cert => {
        const newRow = certTable.insertRow();
        const cell1 = newRow.insertCell(0);
        const cell2 = newRow.insertCell(1);
        
        cell1.innerHTML = `<input type="text" class="admin-form-control" value="${cert}">`;
        cell2.classList.add('admin-table-actions');
        cell2.innerHTML = '<button class="delete-certification" title="Remove certification"><i class="fas fa-trash-alt"></i></button>';
        
        addDeleteCertificationListener(cell2.querySelector('.delete-certification'));
    });
    
    // Toggles
    document.getElementById('toggle-group-classes').checked = settings.sectionToggles.groupClasses;
    document.getElementById('toggle-private-lessons').checked = settings.sectionToggles.privateLessons;
    document.getElementById('toggle-workshops').checked = settings.sectionToggles.workshops;
    document.getElementById('toggle-retreats').checked = settings.sectionToggles.retreats;
    document.getElementById('toggle-retreats-section').checked = settings.sectionToggles.retreatsSection;
    document.getElementById('toggle-schedule-section').checked = settings.sectionToggles.scheduleSection;
    document.getElementById('toggle-membership-section').checked = settings.sectionToggles.membershipSection;
    
    // Handle the private sessions section toggle (might be missing in older settings)
    const privateSessionsToggle = document.getElementById('toggle-private-sessions-section');
    if (privateSessionsToggle) {
        privateSessionsToggle.checked = settings.sectionToggles.privateSessionsSection !== false;
    }
    
    document.getElementById('toggle-gallery-section').checked = settings.sectionToggles.gallerySection;
    
    // Contact info
    document.getElementById('contact-address').value = settings.contactInfo.address;
    document.getElementById('contact-phone').value = settings.contactInfo.phone;
    document.getElementById('contact-email').value = settings.contactInfo.email;
    document.getElementById('social-facebook').value = settings.contactInfo.socialMedia.facebook;
    document.getElementById('social-instagram').value = settings.contactInfo.socialMedia.instagram;
    document.getElementById('social-youtube').value = settings.contactInfo.socialMedia.youtube;
}
