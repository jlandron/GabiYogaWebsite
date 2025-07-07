/**
 * Class Templates Functionality
 * Provides template management and loading for yoga class creation
 */

// Global templates store
let classTemplates = {};
let templatesLoaded = false;

/**
 * Initialize the templates functionality
 */
async function initClassTemplates() {
    console.log('Initializing class templates');
    await loadTemplates();
    setupTemplateControls();
}

/**
 * Load all available templates from the templates directory
 */
async function loadTemplates() {
    try {
        console.log('Loading class templates...');
        
        // Template definitions - eventually these could be loaded from the server
        // or from a database, but for now we'll hardcode the list
        const templateFiles = [
            'beginner-hatha.json',
            'intermediate-hatha.json',
            'beginner-vinyasa.json',
            'intermediate-vinyasa.json',
            'gentle-yoga-meditation.json'
        ];
        
        // Load each template
        const templatePromises = templateFiles.map(async (filename) => {
            try {
                const response = await fetch(`/static/templates/${filename}`);
                
                if (!response.ok) {
                    console.error(`Failed to load template: ${filename}`, response.status);
                    return null;
                }
                
                const templateData = await response.json();
                
                // Extract template key from filename (remove .json)
                const templateKey = filename.replace('.json', '');
                
                // Store the template
                classTemplates[templateKey] = templateData;
                
                console.log(`Loaded template: ${templateKey}`);
                
            } catch (error) {
                console.error(`Error loading template ${filename}:`, error);
                return null;
            }
        });
        
        // Wait for all templates to load
        await Promise.all(templatePromises);
        templatesLoaded = true;
        
        console.log('Templates loaded:', Object.keys(classTemplates));
        
        return classTemplates;
    } catch (error) {
        console.error('Error loading templates:', error);
        return {};
    }
}

/**
 * Setup the template controls in the class modal
 */
function setupTemplateControls() {
    // Add template selector to the class modal
    const classForm = document.getElementById('class-form');
    if (!classForm) {
        console.error('Class form not found');
        return;
    }
    
    // Check if template controls already exist
    if (document.getElementById('template-controls')) {
        return;
    }
    
    // Create the template selector container
    const templateContainer = document.createElement('div');
    templateContainer.id = 'template-controls';
    templateContainer.className = 'template-controls';
    templateContainer.style.marginBottom = '15px';
    
    // Create the select element
    const templateSelect = document.createElement('select');
    templateSelect.id = 'template-select';
    templateSelect.className = 'template-select';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a template...';
    templateSelect.appendChild(defaultOption);
    
    // Add template options
    for (const [key, template] of Object.entries(classTemplates)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = template.title;
        templateSelect.appendChild(option);
    }
    
    // Create apply button
    const applyButton = document.createElement('button');
    applyButton.type = 'button';
    applyButton.id = 'apply-template';
    applyButton.className = 'secondary-btn';
    applyButton.textContent = 'Apply Template';
    applyButton.style.marginLeft = '10px';
    
    // Add event listener
    applyButton.addEventListener('click', () => {
        const selectedTemplate = templateSelect.value;
        if (selectedTemplate) {
            applyClassTemplate(selectedTemplate);
        } else {
            showNotification('Please select a template first', 'warning');
        }
    });
    
    // Add elements to container
    templateContainer.appendChild(templateSelect);
    templateContainer.appendChild(applyButton);
    
    // Insert at the top of the form
    const firstElement = classForm.querySelector('h2') || classForm.firstChild;
    classForm.insertBefore(templateContainer, firstElement);
}

/**
 * Apply a template to the current class form
 * @param {string} templateKey - The key of the template to apply
 */
function applyClassTemplate(templateKey) {
    if (!templatesLoaded) {
        console.error('Templates not yet loaded');
        return;
    }
    
    const template = classTemplates[templateKey];
    if (!template) {
        console.error('Template not found:', templateKey);
        return;
    }
    
    console.log('Applying template:', templateKey, template);
    
    // Fill in the form with template data
    // We need to be careful not to override any fields that should be preserved
    // such as the date/time selections
    
    // Get all form fields
    const titleInput = document.getElementById('class-title');
    const statusInput = document.getElementById('class-status');
    const categoryInput = document.getElementById('class-category');
    const levelInput = document.getElementById('class-level');
    const descriptionInput = document.getElementById('class-description');
    const durationInput = document.getElementById('class-duration');
    const locationInput = document.getElementById('class-location');
    const maxParticipantsInput = document.getElementById('class-max-participants');
    const priceInput = document.getElementById('class-price');
    
    // Fill in basic fields if they exist
    if (titleInput) titleInput.value = template.title || '';
    if (statusInput) statusInput.value = template.status || 'active';
    if (categoryInput) categoryInput.value = template.category || 'all-levels';
    if (levelInput) levelInput.value = template.level || 'all-levels';
    if (descriptionInput) descriptionInput.value = template.description || '';
    if (durationInput) {
        durationInput.value = template.duration || 60;
        // Trigger event to calculate end time
        const event = new Event('change');
        durationInput.dispatchEvent(event);
    }
    if (locationInput) locationInput.value = template.location || 'Main Studio';
    if (maxParticipantsInput) maxParticipantsInput.value = template.maxParticipants || 10;
    if (priceInput) priceInput.value = template.price || 25;
    
    // Advanced fields (may be in different tabs)
    const requirementsInput = document.getElementById('class-requirements');
    const bringInput = document.getElementById('class-bring');
    const cancellationInput = document.getElementById('class-cancellation');
    
    // Fill in advanced fields if they exist
    if (requirementsInput && template.requirements) {
        requirementsInput.value = Array.isArray(template.requirements) 
            ? template.requirements.join('\n') 
            : template.requirements;
    }
    
    if (bringInput && template.whatToBring) {
        bringInput.value = Array.isArray(template.whatToBring) 
            ? template.whatToBring.join('\n') 
            : template.whatToBring;
    }
    
    if (cancellationInput) {
        cancellationInput.value = template.cancellationPolicy || 'Cancel up to 2 hours before class';
    }
    
    // Show notification
    if (typeof showNotification === 'function') {
        showNotification(`Applied "${template.title}" template`, 'success');
    } else {
        alert(`Applied "${template.title}" template`);
    }
}

/**
 * Get a list of available templates
 * @returns {Array} List of template keys
 */
function getAvailableTemplates() {
    return Object.keys(classTemplates);
}

// Export functions for external use
window.classTemplates = {
    init: initClassTemplates,
    load: loadTemplates,
    apply: applyClassTemplate,
    getList: getAvailableTemplates
};
