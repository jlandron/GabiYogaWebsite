/**
 * Admin Settings JavaScript for Gabi Jyoti Yoga
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Settings page loaded');
    
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
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Show button when scrolling down past original button
        if (scrollTop > originalButton.getBoundingClientRect().bottom + window.scrollY) {
            fixedButton.classList.add('visible');
        } else {
            fixedButton.classList.remove('visible');
        }
        
        lastScrollTop = scrollTop;
    });
}


    // Add font options, keeping this list until we fix thequill editor.
    // const fonts = [
    //     // Site theme fonts
    //     { value: "'Playfair Display', serif", label: "Playfair Display (Site Headers)" },
    //     { value: "'Open Sans', sans-serif", label: "Open Sans (Site Body)" },
        
    //     // Custom fonts
    //     { value: "'Julietta', serif", label: "Julietta" },
    //     { value: "'Themunday', serif", label: "Themunday" },
        
    //     // Standard fonts
    //     { value: "Arial, sans-serif", label: "Arial" },
    //     { value: "'Times New Roman', serif", label: "Times New Roman" },
    //     { value: "'Helvetica Neue', Helvetica, sans-serif", label: "Helvetica Neue" },
    //     { value: "Georgia, serif", label: "Georgia" },
    //     { value: "'Courier New', monospace", label: "Courier New" },
    //     { value: "'Roboto', sans-serif", label: "Roboto" },
        
    //     // Script fonts 
    //     { value: "'Dancing Script', cursive", label: "Dancing Script" },
    //     { value: "'Great Vibes', cursive", label: "Great Vibes" },
    //     { value: "'Pacifico', cursive", label: "Pacifico" },
    //     { value: "'Sacramento', cursive", label: "Sacramento" },
    //     { value: "'Allura', cursive", label: "Allura" },
    //     { value: "'Satisfy', cursive", label: "Satisfy" },
        
    //     // Creative fonts
    //     { value: "'Amatic SC', cursive", label: "Amatic SC" },
    //     { value: "'Caveat', cursive", label: "Caveat" },
    //     { value: "'Shadows Into Light', cursive", label: "Shadows Into Light" }
    // ];
    
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
        defaultSize: "48px",
        height: 120, // Taller height to accommodate 72px text
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
 * Collect form data
 */
function collectSettingsData() {
    // Get QuillJS content - the QuillJS editor already puts the cleaned HTML in these hidden textareas
    const heroHeading = document.getElementById('hero-heading');
    const heroSubheading = document.getElementById('hero-subheading');
    const instructorBio = document.getElementById('instructor-bio');
    
    // Hero text data - just store the cleaned HTML content
    const heroTextData = {
        heading: {
            text: heroHeading ? heroHeading.value : '',
        },
        subheading: {
            text: heroSubheading ? heroSubheading.value : '',
        }
    };

// About section with null checks - storing the content AND formatting
const aboutData = {
    name: document.getElementById('instructor-name')?.value || '',
    subtitle: document.getElementById('instructor-subtitle')?.value || '',
    bio: instructorBio?.value || '',
};

// Extract formatting information from the Quill editor for the instructor bio
if (instructorBioQuill) {
    // Get the format from the first character which usually contains the formatting
    const format = instructorBioQuill.getFormat(0, 1);
    
    // Add formatting properties to aboutData
    if (format.font) {
        const fontMap = {
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
        aboutData.bioFont = fontMap[format.font] || format.font;
    }
    
    if (format.size) {
        aboutData.bioSize = format.size;
    }
    
    if (format.bold) {
        aboutData.bioFontWeight = 'bold';
    }
    
    if (format.italic) {
        aboutData.bioFontStyle = 'italic';
    }
    
    if (format.underline) {
        aboutData.bioTextDecoration = 'underline';
    }
    
    if (format.align) {
        aboutData.bioTextAlign = format.align;
    }
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
                // Get the format from the first character which usually contains the formatting
                const format = quill.getFormat(0, 1);
                
                // Add formatting properties to the offering
                if (format.font) {
                    const fontMap = {
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
                    offeringsContent[`${offering.key}Font`] = fontMap[format.font] || format.font;
                }
                
                if (format.size) {
                    offeringsContent[`${offering.key}Size`] = format.size;
                }
                
                if (format.bold) {
                    offeringsContent[`${offering.key}FontWeight`] = 'bold';
                }
                
                if (format.italic) {
                    offeringsContent[`${offering.key}FontStyle`] = 'italic';
                }
                
                if (format.underline) {
                    offeringsContent[`${offering.key}TextDecoration`] = 'underline';
                }
                
                if (format.align) {
                    offeringsContent[`${offering.key}TextAlign`] = format.align;
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
 * Update QuillJS editor contents from settings
 */
function updateQuillContents(settings) {
    // Hero Text - update the QuillJS editors directly
    if (settings.heroText) {
        // Set heading text and formatting if it exists
        if (settings.heroText.heading && headingQuill) {
            // First set the value in the hidden textarea
            const heroHeading = document.getElementById('hero-heading');
            if (heroHeading) {
                heroHeading.value = settings.heroText.heading.text || '';
            }
            
            // Clear editor first
            headingQuill.setText('');
            
            // Insert content
            if (settings.heroText.heading.text) {
                if (settings.heroText.heading.text.trim().startsWith('<')) {
                    // If it's HTML content
                    headingQuill.root.innerHTML = settings.heroText.heading.text;
                } else {
                    // If it's plain text
                    headingQuill.setText(settings.heroText.heading.text);
                }
            }
            
            // Apply formatting from settings if available, or use defaults
            const format = {
                // Use default values from our QuillJS editor initialization if not provided
                font: settings.heroText.heading.font ? 
                    mapCSSFontToQuill(settings.heroText.heading.font) : 'playfair',
                size: settings.heroText.heading.size || '48px'
            };
            
            // Select all text and apply format
            headingQuill.formatText(0, headingQuill.getLength(), format);
            
            // Apply additional formatting if available
            if (settings.heroText.heading.fontWeight === 'bold' || 
                (settings.heroText.heading.fontWeight && parseInt(settings.heroText.heading.fontWeight) >= 700)) {
                headingQuill.formatText(0, headingQuill.getLength(), { bold: true });
            }
            
            if (settings.heroText.heading.fontStyle === 'italic') {
                headingQuill.formatText(0, headingQuill.getLength(), { italic: true });
            }
            
            if (settings.heroText.heading.textDecoration && 
                settings.heroText.heading.textDecoration.includes('underline')) {
                headingQuill.formatText(0, headingQuill.getLength(), { underline: true });
            }
            
            // Set alignment
            const alignment = settings.heroText.heading.textAlign || 'center';
            headingQuill.formatText(0, headingQuill.getLength(), { align: alignment });
            
            console.log('Updated heading QuillJS editor with content and formatting:', {
                text: (settings.heroText.heading.text || '').substring(0, 30) + '...',
                font: format.font,
                size: format.size
            });
        }
        
        // Set subheading text and formatting
        if (settings.heroText.subheading && subheadingQuill) {
            // First set the value in the hidden textarea
            const heroSubheading = document.getElementById('hero-subheading');
            if (heroSubheading) {
                heroSubheading.value = settings.heroText.subheading.text || '';
            }
            
            // Clear editor first
            subheadingQuill.setText('');
            
            // Insert content
            if (settings.heroText.subheading.text) {
                if (settings.heroText.subheading.text.trim().startsWith('<')) {
                    // If it's HTML content
                    subheadingQuill.root.innerHTML = settings.heroText.subheading.text;
                } else {
                    // If it's plain text
                    subheadingQuill.setText(settings.heroText.subheading.text);
                }
            }
            
            // Apply formatting from settings if available, or use defaults
            const format = {
                // Use default values from our QuillJS editor initialization if not provided
                font: settings.heroText.subheading.font ? 
                    mapCSSFontToQuill(settings.heroText.subheading.font) : 'opensans',
                size: settings.heroText.subheading.size || '20px'
            };
            
            // Select all text and apply format
            subheadingQuill.formatText(0, subheadingQuill.getLength(), format);
            
            // Apply additional formatting if available
            if (settings.heroText.subheading.fontWeight === 'bold' || 
                (settings.heroText.subheading.fontWeight && parseInt(settings.heroText.subheading.fontWeight) >= 700)) {
                subheadingQuill.formatText(0, subheadingQuill.getLength(), { bold: true });
            }
            
            if (settings.heroText.subheading.fontStyle === 'italic') {
                subheadingQuill.formatText(0, subheadingQuill.getLength(), { italic: true });
            }
            
            if (settings.heroText.subheading.textDecoration && 
                settings.heroText.subheading.textDecoration.includes('underline')) {
                subheadingQuill.formatText(0, subheadingQuill.getLength(), { underline: true });
            }
            
            // Set alignment
            const alignment = settings.heroText.subheading.textAlign || 'center';
            subheadingQuill.formatText(0, subheadingQuill.getLength(), { align: alignment });
            
            console.log('Updated subheading QuillJS editor with content and formatting:', {
                text: (settings.heroText.subheading.text || '').substring(0, 30) + '...',
                font: format.font,
                size: format.size
            });
        }
    }
    
    // Instructor bio
    if (settings.about && settings.about.bio && instructorBioQuill) {
        // First set the value in the hidden textarea
        const instructorBio = document.getElementById('instructor-bio');
        if (instructorBio) {
            instructorBio.value = settings.about.bio || '';
        }
        
        // Clear editor first
        instructorBioQuill.setText('');
        
        // Insert content
        if (settings.about.bio) {
            if (settings.about.bio.trim().startsWith('<')) {
                // If it's HTML content
                instructorBioQuill.root.innerHTML = settings.about.bio;
            } else {
                // If it's plain text
                instructorBioQuill.setText(settings.about.bio);
            }
            
            // Apply formatting from settings if available
            if (settings.about.bioFont || settings.about.bioSize) {
                const format = {};
                
                if (settings.about.bioFont) {
                    format.font = mapCSSFontToQuill(settings.about.bioFont);
                }
                
                if (settings.about.bioSize) {
                    format.size = settings.about.bioSize;
                }
                
                // Apply formatting to all text
                instructorBioQuill.formatText(0, instructorBioQuill.getLength(), format);
            }
            
            // Apply additional formatting
            if (settings.about.bioFontWeight === 'bold' || 
                (settings.about.bioFontWeight && parseInt(settings.about.bioFontWeight) >= 700)) {
                instructorBioQuill.formatText(0, instructorBioQuill.getLength(), { bold: true });
            }
            
            if (settings.about.bioFontStyle === 'italic') {
                instructorBioQuill.formatText(0, instructorBioQuill.getLength(), { italic: true });
            }
            
            if (settings.about.bioTextDecoration && 
                settings.about.bioTextDecoration.includes('underline')) {
                instructorBioQuill.formatText(0, instructorBioQuill.getLength(), { underline: true });
            }
            
            // Set alignment
            if (settings.about.bioTextAlign) {
                instructorBioQuill.formatText(0, instructorBioQuill.getLength(), { 
                    align: settings.about.bioTextAlign 
                });
            }
        }
        
        console.log('Updated bio QuillJS editor with content:', 
            (settings.about.bio || '').substring(0, 50) + 
            (settings.about.bio && settings.about.bio.length > 50 ? '...' : ''));
    }
    
    // Offerings content
    if (settings.offeringsContent) {
        // Apply content to QuillJS editors
        updateOfferingEditors(settings.offeringsContent);
    }
}

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
 * Update offering editors with content from settings
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
        
        // First set the value in the hidden textarea
        const textArea = document.getElementById(offering.id);
        if (textArea) {
            textArea.value = content;
        }
        
        // Get the QuillJS editor - use the querySelector to find the editor container
        const editorContainer = document.getElementById(`${offering.id}-container`);
        if (!editorContainer) return;
        
        const quill = Quill.find(editorContainer);
        if (!quill) return;
        
        // Update the editor content
        if (content.trim().startsWith('<')) {
            // If it's HTML content
            quill.root.innerHTML = content;
        } else {
            // If it's plain text
            quill.setText(content);
        }
        
        console.log(`Updated ${offering.key} QuillJS editor with content:`, 
            content.substring(0, 50) + (content.length > 50 ? '...' : ''));
    });
}

/**
 * Update other form fields from settings
 */
function updateFormFields(settings) {
    // About section fields
    const instructorName = document.getElementById('instructor-name');
    const instructorSubtitle = document.getElementById('instructor-subtitle');
    
    if (instructorName && settings.about && settings.about.name) {
        instructorName.value = settings.about.name;
    }
    
    if (instructorSubtitle && settings.about && settings.about.subtitle) {
        instructorSubtitle.value = settings.about.subtitle;
    }
    
    // Certifications with null checks
    const certTable = document.getElementById('certifications-table')?.getElementsByTagName('tbody')[0];
    
    if (certTable) {
        // Clear existing rows
        while (certTable.firstChild) {
            certTable.removeChild(certTable.firstChild);
        }
        
        // Add certifications if available
        if (settings.certifications && Array.isArray(settings.certifications)) {
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
    
    // Classes & Offerings Content
    if (settings.offeringsContent) {
        // Apply content to offering text areas - these will be picked up by QuillJS
        const groupClassesText = document.getElementById('group-classes-text');
        const privateLessonsText = document.getElementById('private-lessons-text');
        const workshopsText = document.getElementById('workshops-text');
        const retreatsText = document.getElementById('retreats-text');
        
        if (groupClassesText && settings.offeringsContent.groupClasses) {
            groupClassesText.value = settings.offeringsContent.groupClasses;
        }
        
        if (privateLessonsText && settings.offeringsContent.privateLessons) {
            privateLessonsText.value = settings.offeringsContent.privateLessons;
        }
        
        if (workshopsText && settings.offeringsContent.workshops) {
            workshopsText.value = settings.offeringsContent.workshops;
        }
        
        if (retreatsText && settings.offeringsContent.retreats) {
            retreatsText.value = settings.offeringsContent.retreats;
        }
    }
    
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
