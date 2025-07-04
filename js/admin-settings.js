/**
 * Admin Settings JavaScript for Gabi Jyoti Yoga
 */

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Admin Settings page loaded');
    
  // Use centralized authentication handler for admin pages
    const authenticated = await AuthHandler.initAdminPage();
    if (!authenticated) {
        return; // AuthHandler will have already redirected as needed
    }
    
    // Init all functionality
    fetchExistingSettings();
    initializeToggles();
    initializeCertifications();
    initializePhotoPreview();
    initializeTextEditors();
    initializeFloatingSaveButton();
    
    // Initialize save buttons
    document.getElementById('save-all-settings').addEventListener('click', saveAllSettings);
    document.getElementById('save-all-settings-fixed').addEventListener('click', saveAllSettings);
});

/**
 * Font mapping between Quill format values and CSS font-family values
 */
const FONT_MAP = {
    'playfair': "'Playfair Display', serif",
    'opensans': "'Open Sans', sans-serif",
    'julietta': "'Julietta', serif",
    'themunday': "'Themunday', serif",
    'arial': "Arial, sans-serif",
    'times': "'Times New Roman', serif",
    'helvetica': "'Helvetica Neue', Helvetica, sans-serif",
    'georgia': "Georgia, serif",
    'courier': "'Courier New', monospace",
    'roboto': "'Roboto', sans-serif",
    'dancing': "'Dancing Script', cursive",
    'greatvibes': "'Great Vibes', cursive",
    'pacifico': "'Pacifico', cursive",
    'sacramento': "'Sacramento', cursive",
    'allura': "'Allura', cursive",
    'satisfy': "'Satisfy', cursive",
    'amatic': "'Amatic SC', cursive",
    'caveat': "'Caveat', cursive",
    'shadows': "'Shadows Into Light', cursive"
};

/**
 * Helper function to map CSS font-family values to Quill format values
 */
function mapCSSFontToQuill(fontFamily) {
    // Handle common font mappings
    if (fontFamily.includes("Playfair")) return "playfair";
    if (fontFamily.includes("Open Sans")) return "opensans";
    if (fontFamily.includes("Julietta")) return "julietta";
    if (fontFamily.includes("Themunday")) return "themunday";
    if (fontFamily.includes("Arial")) return "arial";
    if (fontFamily.includes("Times")) return "times";
    if (fontFamily.includes("Helvetica")) return "helvetica";
    if (fontFamily.includes("Georgia")) return "georgia";
    if (fontFamily.includes("Courier")) return "courier";
    if (fontFamily.includes("Roboto")) return "roboto";
    if (fontFamily.includes("Dancing Script")) return "dancing";
    if (fontFamily.includes("Great Vibes")) return "greatvibes";
    if (fontFamily.includes("Pacifico")) return "pacifico";
    if (fontFamily.includes("Sacramento")) return "sacramento";
    if (fontFamily.includes("Allura")) return "allura";
    if (fontFamily.includes("Satisfy")) return "satisfy";
    if (fontFamily.includes("Amatic")) return "amatic";
    if (fontFamily.includes("Caveat")) return "caveat";
    if (fontFamily.includes("Shadows Into Light")) return "shadows";
    
    // Default to Open Sans if no match
    return "opensans";
}

/**
 * Initialize certifications table
 */
function initializeCertifications() {
    console.log('Initializing certifications table');
    
    // Add certification button
    const addCertBtn = document.getElementById('add-certification');
    if (addCertBtn) {
        addCertBtn.addEventListener('click', function() {
            const certTable = document.getElementById('certifications-table').getElementsByTagName('tbody')[0];
            const newRow = certTable.insertRow();
            
            const cell1 = newRow.insertCell(0);
            const cell2 = newRow.insertCell(1);
            
            cell1.innerHTML = '<input type="text" class="admin-form-control" placeholder="Enter certification">';
            cell2.classList.add('admin-table-actions');
            cell2.innerHTML = '<button class="delete-certification" title="Remove certification"><i class="fas fa-trash-alt"></i></button>';
            
            addDeleteCertificationListener(cell2.querySelector('.delete-certification'));
        });
    }
    
    // Add delete listeners to existing buttons
    document.querySelectorAll('.delete-certification').forEach(btn => {
        addDeleteCertificationListener(btn);
    });
}

/**
 * Add delete certification listener
 */
function addDeleteCertificationListener(btn) {
    btn.addEventListener('click', function() {
        const row = this.closest('tr');
        if (row && row.parentNode) {
            row.parentNode.removeChild(row);
        }
    });
}

/**
 * Initialize photo preview
 */
function initializePhotoPreview() {
    console.log('Initializing photo preview');
    
    const photoInput = document.getElementById('instructor-photo');
    const photoPreview = document.getElementById('instructor-photo-preview');
    
    if (photoInput && photoPreview) {
        photoInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    photoPreview.src = e.target.result;
                };
                
                reader.readAsDataURL(this.files[0]);
            }
        });
    }
}

/**
 * Initialize floating save button
 */
function initializeFloatingSaveButton() {
    const fixedButton = document.getElementById('fixed-save-button');
    const originalButton = document.getElementById('save-all-settings');
    const fixedSaveBtn = document.getElementById('save-all-settings-fixed');
    let lastScrollTop = 0;
    
    // Remove any existing listeners to avoid duplicates
    const newFixedButton = fixedButton.cloneNode(true);
    fixedButton.parentNode.replaceChild(newFixedButton, fixedButton);
    
    // Get the fresh elements
    const updatedFixedButton = document.getElementById('fixed-save-button');
    const updatedFixedSaveBtn = document.getElementById('save-all-settings-fixed');
    
    // Set up the save functionality for the fixed button
    if (updatedFixedSaveBtn) {
        updatedFixedSaveBtn.addEventListener('click', function(e) {
            saveAllSettings();
            e.stopPropagation();
        });
    }
    
    // Make the entire container trigger a save when clicked
    if (updatedFixedButton) {
        updatedFixedButton.addEventListener('click', function(e) {
            // Call saveAllSettings directly when the container is clicked
            if (this.classList.contains('visible')) {
                saveAllSettings();
                e.preventDefault();
            }
        });
    }
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Show button when scrolling down past original button
        if (scrollTop > originalButton.getBoundingClientRect().bottom + window.scrollY) {
            updatedFixedButton.classList.add('visible');
        } else {
            updatedFixedButton.classList.remove('visible');
        }
        
        lastScrollTop = scrollTop;
    });
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
            // Check if content is HTML
            if (heroHeading.value && heroHeading.value.trim().startsWith('<')) {
                previewHeading.innerHTML = heroHeading.value;
            } else {
                previewHeading.textContent = heroHeading.value;
            }
            
            // Apply styles
            previewHeading.style.fontFamily = heroHeading.style.fontFamily;
            previewHeading.style.fontSize = heroHeading.style.fontSize;
            previewHeading.style.fontWeight = heroHeading.style.fontWeight;
            previewHeading.style.fontStyle = heroHeading.style.fontStyle;
            previewHeading.style.textDecoration = heroHeading.style.textDecoration;
            previewHeading.style.textAlign = 'center';
        }
        
        if (previewSubheading) {
            // Check if content is HTML
            if (heroSubheading.value && heroSubheading.value.trim().startsWith('<')) {
                previewSubheading.innerHTML = heroSubheading.value;
            } else {
                previewSubheading.textContent = heroSubheading.value;
            }
            
            // Apply styles
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
            // Trigger event for section background alternation
            window.dispatchEvent(new CustomEvent('sectionsVisibilityChanged'));
        });
    });
}

/**
 * Fetch settings from API
 */
function fetchExistingSettings() {
    // Use AdminApiUtils for consistent authentication handling
    AdminApiUtils.request('/api/admin/settings')
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
}

// Store QuillJS editor instances for later access
let headingQuill, subheadingQuill, instructorBioQuill;
let offeringQuillEditors = {};

/**
 * Initialize text editors
 */
function initializeTextEditors() {
    console.log('Initializing text editors');
    
    // Check if createQuillEditor function is available
    if (!window.createQuillEditor) {
        console.error('createQuillEditor function not found. Make sure admin-quill-editor.js is properly loaded.');
        return;
    }
    
    // Initialize hero heading with QuillJS
    headingQuill = window.createQuillEditor('hero-heading', {
        defaultFont: "'Playfair Display', serif",
        defaultSize: "64px",
        height: 120, // Taller height to accommodate large text
        simplified: true
    });
    console.log('Hero heading editor initialized');
    
    // Initialize hero subheading with QuillJS
    subheadingQuill = window.createQuillEditor('hero-subheading', {
        defaultFont: "'Open Sans', sans-serif",
        defaultSize: "20px",
        height: 80, // Slightly shorter than heading but still spacious
        simplified: true
    });
    console.log('Hero subheading editor initialized');
    
    // Initialize Quill editors for all offering texts
    initializeOfferingEditors();
    
    // Initialize QuillJS for instructor bio
    instructorBioQuill = window.createQuillEditor('instructor-bio', {
        defaultFont: "'Open Sans', sans-serif",
        defaultSize: "16px",
        height: 350,
        simplified: false // Use full editor with all formatting options
    });
    console.log('Instructor bio editor initialized');
    
    // Update the preview when content changes
    if (headingQuill) {
        headingQuill.on('text-change', updateHomepageText);
    }
    
    if (subheadingQuill) {
        subheadingQuill.on('text-change', updateHomepageText);
    }
}

/**
 * Initialize Quill editors for all offering text areas
 */
function initializeOfferingEditors() {
    // Check if createQuillEditor function is available
    if (!window.createQuillEditor) {
        console.error('createQuillEditor function not found. Make sure admin-quill-editor.js is properly loaded.');
        return;
    }
    
    // Get all offering text areas
    const offeringElements = [
        { id: 'group-classes-text', height: 200 },
        { id: 'private-lessons-text', height: 200 },
        { id: 'workshops-text', height: 200 },
        { id: 'retreats-text', height: 200 }
    ];
    
    console.log('Initializing offering text editors');
    
    // Initialize a Quill editor for each offering using the reusable component
    offeringElements.forEach(element => {
        const editor = window.createQuillEditor(element.id, {
            defaultFont: "'Open Sans', sans-serif",
            defaultSize: "14px",
            height: element.height,
            simplified: false // Use full editor to allow for lists and formatting
        });
        
        if (editor) {
            console.log(`Quill editor initialized for ${element.id} using reusable component`);
        }
    });
}

/**
 * Save all settings
 */
function saveAllSettings() {
    console.log('Starting to save all settings');
    const settingsData = collectSettingsData();
    
    // Use AdminApiUtils for consistent authentication handling
    AdminApiUtils.request('/api/admin/settings', 'PUT', settingsData)
        .then(data => {
            if (data.success) {
                showNotification();
                updateHomepageText();
                // Trigger event for section background alternation
                window.dispatchEvent(new CustomEvent('sectionsVisibilityChanged'));
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
 * Extract formatting information from a QuillJS editor
 * @param {Object} quill - The Quill editor instance
 * @returns {Object} - Extracted formatting data
 */
function extractQuillFormat(quill) {
    if (!quill) {
        return {};
    }
    
    const length = quill.getLength();
    if (length <= 1) {
        return {};  // Empty editor
    }
    
    // Using a hardcoded size for headings to ensure consistency
    // Check if this is the hero heading editor by looking at the DOM
    let isHeroHeading = false;
    if (quill.root && quill.root.closest && quill.root.closest('#hero-heading-container')) {
        isHeroHeading = true;
    }
    
    const formatData = {};
    
    // For hero heading, always use 72px size
    if (isHeroHeading) {
        formatData.size = '64px';
    }
    
    // First try to get formats from Quill directly
    const format = quill.getFormat(0, Math.min(50, length - 1));
    
    // Add basic formatting properties from Quill formats
    if (format.font) {
        formatData.font = FONT_MAP[format.font] || format.font;
    }
    
    if (format.size) {
        formatData.size = format.size;
    }
    
    if (format.bold) {
        formatData.fontWeight = 'bold';
    }
    
    if (format.italic) {
        formatData.fontStyle = 'italic';
    }
    
    if (format.underline) {
        formatData.textDecoration = 'underline';
    }
    
    if (format.align) {
        formatData.textAlign = format.align;
    }
    
    // If no font was found in the format object, try to parse from HTML
    if (!formatData.font || !formatData.size) {
        const html = quill.root.innerHTML;
        
        // Check for Quill font classes
        const fontClassMatch = html.match(/ql-font-([a-zA-Z0-9]+)/);
        if (fontClassMatch && fontClassMatch[1]) {
            const fontKey = fontClassMatch[1];
            if (FONT_MAP[fontKey]) {
                formatData.font = FONT_MAP[fontKey];
            }
        }
        
        // Check for style attributes with font information
        const fontStyleMatch = html.match(/font-family:\s*([^;\"\']+)[;\"\']|font-family:\s*(\'[^\']+\')|font-family:\s*(\"[^\"]+\")/);
        if (fontStyleMatch) {
            const fontValue = (fontStyleMatch[1] || fontStyleMatch[2] || fontStyleMatch[3]).trim();
            formatData.font = fontValue;
        }
        
        // Look for size information
        const sizeStyleMatch = html.match(/font-size:\s*([^;\"\']+)[;\"\']/);
        if (sizeStyleMatch) {
            const sizeValue = sizeStyleMatch[1].trim();
            formatData.size = sizeValue;
        }
        
        // Check for alignment classes
        const alignClassMatch = html.match(/ql-align-([a-zA-Z0-9]+)/);
        if (alignClassMatch && alignClassMatch[1] && !formatData.textAlign) {
            formatData.textAlign = alignClassMatch[1];
        }
        
        // If still no font found and this is a heading/subheading, use defaults
        if (!formatData.font) {
            // Try to determine what kind of editor from the HTML
            if (html.includes('Find Your Inner Peace')) {
                formatData.font = "'Julietta', serif";
            } else if (html.toLowerCase().includes('gabi yoga')) {
                formatData.font = "'Themunday', serif";
            }
        }
    }
    return formatData;
}

/**
 * Collect form data
 */
function collectSettingsData() {
    // Get QuillJS content - the QuillJS editor already puts the cleaned HTML in these hidden textareas
    const heroHeading = document.getElementById('hero-heading');
    const heroSubheading = document.getElementById('hero-subheading');
    const instructorBio = document.getElementById('instructor-bio');
    
    // Hero text data - store both content and formatting
    const heroTextData = {
        heading: {
            text: heroHeading ? heroHeading.value : '',
            ...extractQuillFormat(headingQuill)
        },
        subheading: {
            text: heroSubheading ? heroSubheading.value : '',
            ...extractQuillFormat(subheadingQuill)
        }
    };

    // About section with null checks
    const aboutData = {
        name: document.getElementById('instructor-name')?.value || '',
        subtitle: document.getElementById('instructor-subtitle')?.value || '',
        bio: instructorBio?.value || '',
        ...extractQuillFormat(instructorBioQuill)
    };
    
    // Rename format properties to match expected aboutData structure
    if (aboutData.font) {
        aboutData.bioFont = aboutData.font;
        delete aboutData.font;
    }
    if (aboutData.size) {
        aboutData.bioSize = aboutData.size;
        delete aboutData.size;
    }
    if (aboutData.fontWeight) {
        aboutData.bioFontWeight = aboutData.fontWeight;
        delete aboutData.fontWeight;
    }
    if (aboutData.fontStyle) {
        aboutData.bioFontStyle = aboutData.fontStyle;
        delete aboutData.fontStyle;
    }
    if (aboutData.textDecoration) {
        aboutData.bioTextDecoration = aboutData.textDecoration;
        delete aboutData.textDecoration;
    }
    if (aboutData.textAlign) {
        aboutData.bioTextAlign = aboutData.textAlign;
        delete aboutData.textAlign;
    }
    
    // Log extracted bio formatting
    if (aboutData.bioFont || aboutData.bioSize) {
        console.log('Bio font saved as:', aboutData.bioFont);
        console.log('Bio size saved as:', aboutData.bioSize);
    }
    
    // Certifications
    const certificationRows = document.querySelectorAll('#certifications-table tbody tr');
    const certifications = Array.from(certificationRows)
        .map(row => row.querySelector('input').value)
        .filter(cert => cert.trim() !== '');
    
    // Classes & Offerings content with QuillJS content cleaning
    const offeringsContent = {};
    
    // Define our offerings to process
    const offeringIds = [
        { key: 'groupClasses', id: 'group-classes-text' },
        { key: 'privateLessons', id: 'private-lessons-text' },
        { key: 'workshops', id: 'workshops-text' },
        { key: 'retreats', id: 'retreats-text' }
    ];
    
    // Process each offering
    offeringIds.forEach(offering => {
        const textarea = document.getElementById(offering.id);
        offeringsContent[offering.key] = textarea?.value || '';
        
        // Get the QuillJS editor
        const editorContainer = document.getElementById(`${offering.id}-container`);
        if (editorContainer) {
            const quill = Quill.find(editorContainer);
            if (quill) {
                // Get formatting for each offering
                const format = extractQuillFormat(quill);
                
                // Add formatting properties to the offering with proper naming
                if (format.font) {
                    offeringsContent[`${offering.key}Font`] = format.font;
                    console.log(`${offering.key} font saved as:`, format.font);
                }
                
                if (format.size) {
                    offeringsContent[`${offering.key}Size`] = format.size;
                }
                
                if (format.fontWeight) {
                    offeringsContent[`${offering.key}FontWeight`] = format.fontWeight;
                }
                
                if (format.fontStyle) {
                    offeringsContent[`${offering.key}FontStyle`] = format.fontStyle;
                }
                
                if (format.textDecoration) {
                    offeringsContent[`${offering.key}TextDecoration`] = format.textDecoration;
                }
                
                if (format.textAlign) {
                    offeringsContent[`${offering.key}TextAlign`] = format.textAlign;
                }
            }
        }
    });
    
    // Log what we're saving to help with debugging
    console.log('Collecting settings data:');
    console.log('Hero heading:', heroTextData.heading.text.substring(0, 50) + (heroTextData.heading.text.length > 50 ? '...' : ''));
    console.log('Hero subheading:', heroTextData.subheading.text.substring(0, 50) + (heroTextData.subheading.text.length > 50 ? '...' : ''));
    console.log('Bio text:', aboutData.bio.substring(0, 50) + (aboutData.bio.length > 50 ? '...' : ''));
    
    // Toggles with null checks
    const sectionToggles = {
        groupClasses: document.getElementById('toggle-group-classes')?.checked ?? true,
        privateLessons: document.getElementById('toggle-private-lessons')?.checked ?? true,
        workshops: document.getElementById('toggle-workshops')?.checked ?? true,
        retreats: document.getElementById('toggle-retreats')?.checked ?? true,
        retreatsSection: document.getElementById('toggle-retreats-section')?.checked ?? true,
        scheduleSection: document.getElementById('toggle-schedule-section')?.checked ?? true,
        membershipSection: document.getElementById('toggle-membership-section')?.checked ?? true,
        privateSessionsSection: document.getElementById('toggle-private-sessions-section')?.checked ?? true,
        gallerySection: document.getElementById('toggle-gallery-section')?.checked ?? true
    };
    
    // Contact info with null checks
    const contactInfo = {
        address: document.getElementById('contact-address')?.value || '',
        phone: document.getElementById('contact-phone')?.value || '',
        email: document.getElementById('contact-email')?.value || '',
        socialMedia: {
            facebook: document.getElementById('social-facebook')?.value || '',
            instagram: document.getElementById('social-instagram')?.value || '',
            youtube: document.getElementById('social-youtube')?.value || ''
        }
    };
    
    return {
        heroText: heroTextData,
        about: aboutData,
        certifications: certifications,
        offeringsContent: offeringsContent,
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
 * Update form fields from settings data (non-Quill items)
 * @param {Object} settings - Settings from the API
 */
function updateFormFields(settings) {
    // About section
    if (settings.about) {
        const nameField = document.getElementById('instructor-name');
        if (nameField) nameField.value = settings.about.name || '';
        
        const subtitleField = document.getElementById('instructor-subtitle');
        if (subtitleField) subtitleField.value = settings.about.subtitle || '';
    }
    
    // Certifications
    if (settings.certifications && settings.certifications.length > 0) {
        const certTable = document.getElementById('certifications-table')?.getElementsByTagName('tbody')[0];
        if (certTable) {
            // Clear existing rows
            certTable.innerHTML = '';
            
            // Add new rows for each certification
            settings.certifications.forEach(cert => {
                const newRow = certTable.insertRow();
                
                const cell1 = newRow.insertCell(0);
                const cell2 = newRow.insertCell(1);
                
                cell1.innerHTML = `<input type="text" class="admin-form-control" value="${cert}">`;
                cell2.classList.add('admin-table-actions');
                cell2.innerHTML = '<button class="delete-certification" title="Remove certification"><i class="fas fa-trash-alt"></i></button>';
                
                addDeleteCertificationListener(cell2.querySelector('.delete-certification'));
            });
        }
    }
    
    // Toggle switches
    if (settings.sectionToggles) {
        Object.keys(settings.sectionToggles).forEach(key => {
            const toggle = document.getElementById(`toggle-${key}`);
            if (toggle) toggle.checked = !!settings.sectionToggles[key];
        });
    }
    
    // Contact info
    if (settings.contactInfo) {
        const addressField = document.getElementById('contact-address');
        if (addressField) addressField.value = settings.contactInfo.address || '';
        
        const phoneField = document.getElementById('contact-phone');
        if (phoneField) phoneField.value = settings.contactInfo.phone || '';
        
        const emailField = document.getElementById('contact-email');
        if (emailField) emailField.value = settings.contactInfo.email || '';
        
        // Social media
        if (settings.contactInfo.socialMedia) {
            const fbField = document.getElementById('social-facebook');
            if (fbField) fbField.value = settings.contactInfo.socialMedia.facebook || '';
            
            const igField = document.getElementById('social-instagram');
            if (igField) igField.value = settings.contactInfo.socialMedia.instagram || '';
            
            const ytField = document.getElementById('social-youtube');
            if (ytField) ytField.value = settings.contactInfo.socialMedia.youtube || '';
        }
    }
}

/**
 * Apply settings from API response
 */
function applySettingsFromAPI(settings) {
    console.log('Applying settings from API', settings);
    
    // Set the content in the QuillJS editors
    updateQuillContents(settings);
    
    // Update form fields - non-Quill items
    updateFormFields(settings);
    
    // Update preview
    updateHomepageText();
}

/**
 * Apply formatting to a Quill editor
 * @param {Object} quill - The Quill editor instance 
 * @param {Object} formats - Formatting to apply
 */
function applyQuillFormats(quill, formats) {
    if (!quill) {
        console.error('Cannot apply formats - quill is null');
        return;
    }
    
    if (!formats) {
        console.error('Cannot apply formats - formats object is null');
        return;
    }
    
    const length = quill.getLength();
    if (length <= 1) {
        console.warn('Cannot apply formats - quill editor has no content');
        return;
    }
    
    try {
        // Apply in specific order for best results
        
        // Convert CSS font family format to Quill format
        let quillFont = null;
        if (formats.font) {
            // Handle different font formats - extract the font name from quotes if needed
            const fontMatch = formats.font.match(/'([^']+)'|"([^"]+)"|([^,\s]+)/);
            if (fontMatch) {
                // Get the first matched group (whichever one isn't undefined)
                const fontName = fontMatch[1] || fontMatch[2] || fontMatch[3];
                
                // Map CSS font name back to Quill's internal font name format
                for (const [key, value] of Object.entries(FONT_MAP)) {
                    if (value.includes(fontName)) {
                        quillFont = key;
                        break;
                    }
                }
                
                if (!quillFont) {
                    console.warn(`Could not map font "${fontName}" to a Quill font, using as-is`);
                    quillFont = fontName;
                }
            }
        }

        // 1. Apply basic formatting first
        if (quillFont) {
            quill.formatText(0, length, { font: quillFont });
        }
        
        if (formats.size) {
            quill.formatText(0, length, { size: formats.size });
        }
        
        // 2. Apply styling attributes separately
        if (formats.bold) {
            quill.formatText(0, length, { bold: true });
        }
        
        if (formats.italic) {
            quill.formatText(0, length, { italic: true });
        }
        
        if (formats.underline) {
            quill.formatText(0, length, { underline: true });
        }
        
        // 3. Apply alignment last (global for the entire editor)
        if (formats.align) {
            quill.formatText(0, length, { align: formats.align });
        }
        
        // 4. Force update to ensure UI reflects changes
        setTimeout(() => {
            quill.update();
        }, 100);
    } catch (error) {
        console.error('Error applying formats:', error);
    }
}

/**
 * Update offering editors with content from settings
 * @param {Object} offeringsContent - Content for each offering
 */
function updateOfferingEditors(offeringsContent) {
    // Define our offerings and their corresponding QuillJS editor IDs
    const offerings = [
        { key: 'groupClasses', id: 'group-classes-text' },
        { key: 'privateLessons', id: 'private-lessons-text' },
        { key: 'workshops', id: 'workshops-text' },
        { key: 'retreats', id: 'retreats-text' }
    ];
    
    offerings.forEach(offering => {
        const content = offeringsContent[offering.key];
        if (!content) return;
        
        // First collect all formatting information
        const formats = {
            font: offeringsContent[`${offering.key}Font`] ? 
                cssToQuillFont(offeringsContent[`${offering.key}Font`]) : 'opensans',
            size: offeringsContent[`${offering.key}Size`] || '14px',
            bold: offeringsContent[`${offering.key}FontWeight`] === 'bold',
            italic: offeringsContent[`${offering.key}FontStyle`] === 'italic',
            underline: offeringsContent[`${offering.key}TextDecoration`] && 
                     offeringsContent[`${offering.key}TextDecoration`].includes('underline'),
            align: offeringsContent[`${offering.key}TextAlign`] || 'left'
        };
        
        console.log(`Collected formats for ${offering.key}:`, formats);
        
        // Set the value in the hidden textarea
        const textArea = document.getElementById(offering.id);
        if (textArea) {
            textArea.value = content;
        }
        
        // Get the QuillJS editor
        const editorContainer = document.getElementById(`${offering.id}-container`);
        if (!editorContainer) return;
        
        const quill = Quill.find(editorContainer);
        if (!quill) return;
        
        // Use our helper function to update the editor
        try {
            updateSingleQuillEditor(quill, content, formats, 'opensans');
            console.log(`Updated ${offering.key} QuillJS editor with content`);
        }
        catch (error) {
            console.error(`Error updating ${offering.key} editor:`, error);
        }
    });
}

/**
 * Update all Quill editors with content from settings 
 * @param {Object} settings - Settings from the API
 */
function updateQuillContents(settings) {
    // Update Hero Text - Heading
    if (settings.heroText && settings.heroText.heading && headingQuill) {
        // Update textarea value
        const textArea = document.getElementById('hero-heading');
        if (textArea) {
            textArea.value = settings.heroText.heading.text || '';
        }
        
        // Convert CSS font to Quill font format
        const fontValue = settings.heroText.heading.font ? 
            cssToQuillFont(settings.heroText.heading.font) : 'playfair';
            
        // Apply to Quill editor
        updateSingleQuillEditor(
            headingQuill,
            settings.heroText.heading.text || 'Find Your Inner Peace',
            {
                font: fontValue,
                size: settings.heroText.heading.size || '48px',
                bold: settings.heroText.heading.fontWeight === 'bold',
                italic: settings.heroText.heading.fontStyle === 'italic',
                underline: settings.heroText.heading.textDecoration && 
                         settings.heroText.heading.textDecoration.includes('underline'),
                align: settings.heroText.heading.textAlign || 'center'
            },
            'playfair'
        );
        
        console.log('Updated hero heading with content and formats');
    }
    
    // Update Hero Text - Subheading
    if (settings.heroText && settings.heroText.subheading && subheadingQuill) {
        // Update textarea value
        const textArea = document.getElementById('hero-subheading');
        if (textArea) {
            textArea.value = settings.heroText.subheading.text || '';
        }
        
        // Apply to Quill editor
        updateSingleQuillEditor(
            subheadingQuill,
            settings.heroText.subheading.text,
            {
                font: settings.heroText.subheading.font ? 
                    cssToQuillFont(settings.heroText.subheading.font) : 'opensans',
                size: settings.heroText.subheading.size || '20px',
                bold: settings.heroText.subheading.fontWeight === 'bold',
                italic: settings.heroText.subheading.fontStyle === 'italic',
                underline: settings.heroText.subheading.textDecoration && 
                         settings.heroText.subheading.textDecoration.includes('underline'),
                align: settings.heroText.subheading.textAlign || 'center'
            },
            'opensans'
        );
        
        console.log('Updated hero subheading with content and formats');
    }
    
    // Update Instructor Bio
    if (settings.about && instructorBioQuill) {
        // Update textarea value
        const textArea = document.getElementById('instructor-bio');
        if (textArea) {
            textArea.value = settings.about.bio || '';
        }
        
        // Apply to Quill editor
        updateSingleQuillEditor(
            instructorBioQuill,
            settings.about.bio,
            {
                font: settings.about.bioFont ? 
                    cssToQuillFont(settings.about.bioFont) : 'opensans',
                size: settings.about.bioSize || '16px',
                bold: settings.about.bioFontWeight === 'bold',
                italic: settings.about.bioFontStyle === 'italic',
                underline: settings.about.bioTextDecoration && 
                         settings.about.bioTextDecoration.includes('underline'),
                align: settings.about.bioTextAlign || 'left'
            },
            'opensans'
        );
        
        console.log('Updated instructor bio with content and formats');
    }
    
    // Update offerings content
    if (settings.offeringsContent) {
        updateOfferingEditors(settings.offeringsContent);
    }
}
