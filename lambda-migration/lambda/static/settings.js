/**
* Settings Management Module
 *
 * Handles all functionality related to website settings in the admin panel
 * including loading, displaying, editing, and saving settings.
 */

import { compressProfileImage } from './image-compressor.js';

class SettingsManager {
    constructor(containerElement) {
        this.container = containerElement;
        this.allSettings = {};
        this.modifiedSettings = {};
        this.currentTab = 'general';
        
        // Initialize the settings manager
        this.init();
    }

    /**
     * Initialize the settings manager
     */
    async init() {
        try {
            // Add loading state
            this.container.innerHTML = '<div class="loading-spinner">Loading settings...</div>';
            
            // Setup tabs
            this.setupTabs();
            
            // Load settings
            await this.loadSettings();
            
            // Populate settings forms
            this.populateSettingsForms();
            
            console.log('✅ Settings Manager initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing Settings Manager:', error);
            this.container.innerHTML = `
                <div class="error-message">
                    <h3>Error Loading Settings</h3>
                    <p>${error.message}</p>
                    <button class="retry-button">Retry</button>
                </div>
            `;
            
            // Add retry button functionality
            this.container.querySelector('.retry-button').addEventListener('click', () => {
                this.init();
            });
        }
    }

    /**
     * Setup the settings tabs
     */
    setupTabs() {
        // Create the settings container structure
        this.container.innerHTML = `
            <div class="settings-container">
                <!-- Settings Navigation Tabs -->
                <div class="settings-tabs">
                    <button class="tab-button active" data-category="general">General</button>
                    <button class="tab-button" data-category="homepage">Homepage</button>
                    <button class="tab-button" data-category="content">Content</button>
                    <button class="tab-button" data-category="contact">Contact</button>
                    <button class="tab-button" data-category="social">Social</button>
                </div>
                
                <!-- Settings Content -->
                <div class="settings-content">
                    <!-- General Settings -->
                    <div class="settings-panel active" id="general-settings">
                        <h3>General Settings</h3>
                        <div class="settings-form" id="general-settings-form">
                            <div class="loading-spinner">Loading settings...</div>
                        </div>
                    </div>
                    
                    <!-- Homepage Settings -->
                    <div class="settings-panel" id="homepage-settings">
                        <h3>Homepage Settings</h3>
                        <div class="settings-form" id="homepage-settings-form">
                            <div class="loading-spinner">Loading settings...</div>
                        </div>
                    </div>
                    
                    <!-- Content Settings -->
                    <div class="settings-panel" id="content-settings">
                        <h3>Content Settings</h3>
                        <div class="settings-form" id="content-settings-form">
                            <div class="loading-spinner">Loading settings...</div>
                        </div>
                    </div>
                    
                    <!-- Contact Settings -->
                    <div class="settings-panel" id="contact-settings">
                        <h3>Contact Settings</h3>
                        <div class="settings-form" id="contact-settings-form">
                            <div class="loading-spinner">Loading settings...</div>
                        </div>
                    </div>
                    
                    <!-- Social Settings -->
                    <div class="settings-panel" id="social-settings">
                        <h3>Social Media Settings</h3>
                        <div class="settings-form" id="social-settings-form">
                            <div class="loading-spinner">Loading settings...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners to tab buttons
        const tabButtons = this.container.querySelectorAll('.settings-tabs .tab-button');
        const panels = this.container.querySelectorAll('.settings-panel');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const category = button.getAttribute('data-category');
                this.currentTab = category;
                
                // Update active tab button
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update active panel
                panels.forEach(panel => panel.classList.remove('active'));
                document.getElementById(`${category}-settings`).classList.add('active');
            });
        });
    }

    /**
     * Load settings from the API
     */
    async loadSettings() {
        const response = await fetch('/dev/settings', {
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error('Failed to load settings');
        }
        
        // Clear any existing modified settings
        this.modifiedSettings = {};
        
        // Group settings by category
        const settingsByCategory = {};
        data.rawSettings.forEach(setting => {
            const category = setting.category || 'general';
            if (!settingsByCategory[category]) {
                settingsByCategory[category] = [];
            }
            settingsByCategory[category].push(setting);
        });
        
        this.allSettings = settingsByCategory;
        return this.allSettings;
    }

    /**
     * Populate all settings forms
     */
    populateSettingsForms() {
        this.populateCategoryForm('general', 'General Settings');
        this.populateCategoryForm('homepage', 'Homepage Settings');
        this.populateCategoryForm('content', 'Content Settings');
        this.populateCategoryForm('contact', 'Contact Settings');
        this.populateCategoryForm('social', 'Social Media Settings');
    }

    /**
     * Populate a specific category form
     */
    populateCategoryForm(category, title) {
        const form = document.getElementById(`${category}-settings-form`);
        if (!form) return;
        
        form.innerHTML = ''; // Clear existing content
        
        // Find settings for this category
        const categorySettings = this.allSettings[category] || [];
        
        if (categorySettings.length === 0) {
            form.innerHTML = `<p>No ${title.toLowerCase()} found. Add settings through the API.</p>`;
            return;
        }
        
        // Add each setting as a form field
        categorySettings.forEach(setting => {
            const formGroup = this.createFormField(
                setting.id, 
                setting.key || setting.id, 
                setting.value, 
                setting.description, 
                category,
                this.isJsonContent(setting.id, setting.value),
                this.determineInputType(setting)
            );
            form.appendChild(formGroup);
        });
        
        // Add save button
        const formActions = document.createElement('div');
        formActions.className = 'form-actions';
        
        const saveButton = document.createElement('button');
        saveButton.className = 'save-settings-btn';
        saveButton.type = 'button';
        saveButton.textContent = 'Save Changes';
        saveButton.addEventListener('click', () => this.saveSettingsForCategory(category));
        
        formActions.appendChild(saveButton);
        form.appendChild(formActions);
    }

    /**
     * Determine the appropriate input type based on setting key and content
     */
    determineInputType(setting) {
        const key = setting.id.toLowerCase();
        
        if (key.includes('email')) return 'email';
        if (key.includes('phone')) return 'tel';
        if (key.includes('url') || key.includes('facebook') || 
            key.includes('instagram') || key.includes('twitter') || 
            key.includes('linkedin') || key.includes('youtube')) return 'url';
        
        // Default to text
        return 'text';
    }

    /**
     * Check if a setting value is likely JSON content
     */
    isJsonContent(id, value) {
        // Known JSON fields
        const jsonFields = ['about_certifications', 'certifications', 'testimonials', 'pricing', 'schedule', 'faq'];
        
        if (jsonFields.some(field => id.includes(field))) return true;
        
        // Try to detect JSON content
        if (typeof value === 'string' && value.trim().length > 0) {
            const firstChar = value.trim()[0];
            const lastChar = value.trim()[value.trim().length - 1];
            
            if ((firstChar === '{' && lastChar === '}') || (firstChar === '[' && lastChar === ']')) {
                try {
                    JSON.parse(value);
                    return true;
                } catch (e) {
                    // Not valid JSON
                    return false;
                }
            }
        }
        
        return false;
    }

    /**
     * Create a form field for a setting
     */
    createFormField(id, label, value, description, category, isJson = false, inputType = 'text') {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        
        // Create label
        const labelEl = document.createElement('label');
        labelEl.textContent = this.formatLabel(label);
        labelEl.setAttribute('for', `setting-${id}`);
        formGroup.appendChild(labelEl);
        
        // Add description if available
        if (description) {
            const descEl = document.createElement('small');
            descEl.textContent = description;
            formGroup.appendChild(descEl);
        }

        // Special handling for profile image
        if (id === 'about_profile_image') {
            return this.createProfileImageField(id, value, description, category);
        }
        
        // Special handling for certifications
        if (id === 'about_certifications') {
            return this.createCertificationsField(id, value, description, category);
        }
        
        // For large text content or JSON, use textarea
        if (isJson || (typeof value === 'string' && value.length > 100)) {
            const textarea = document.createElement('textarea');
            textarea.id = `setting-${id}`;
            
            if (isJson) {
                textarea.classList.add('json-editor');
                // Format JSON for readability
                try {
                    textarea.value = JSON.stringify(JSON.parse(value), null, 2);
                } catch (e) {
                    textarea.value = value;
                }
            } else {
                // For regular long text
                textarea.value = value;
                if (value.length > 200) {
                    textarea.classList.add('large-textarea');
                }
            }
            
            // Add change event listener
            textarea.addEventListener('change', (e) => this.handleSettingChange(id, e.target.value, category, description, isJson));
            
            formGroup.appendChild(textarea);
        } else {
            // Use input field for regular values
            const input = document.createElement('input');
            input.type = inputType;
            input.id = `setting-${id}`;
            input.value = value;
            
            // Add change event listener
            input.addEventListener('change', (e) => this.handleSettingChange(id, e.target.value, category, description, false));
            
            formGroup.appendChild(input);
        }
        
        return formGroup;
    }

    /**
     * Create profile image field with preview and upload functionality
     */
    createProfileImageField(id, value, description, category) {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        
        // Create label and description
        const labelEl = document.createElement('label');
        labelEl.textContent = this.formatLabel(id);
        formGroup.appendChild(labelEl);
        
        if (description) {
            const descEl = document.createElement('small');
            descEl.textContent = description;
            formGroup.appendChild(descEl);
        }
        
        // Create container for image preview and upload controls
        const imageContainer = document.createElement('div');
        imageContainer.className = 'profile-image-container';
        
        // Create image preview
        const imagePreview = document.createElement('div');
        imagePreview.className = 'image-preview';
        
                    // Create image element if the path is available
                    if (value && value.trim() !== '') {
                        const img = document.createElement('img');
                        
                        // Try to load the image using different strategies
                        if (value.startsWith('http')) {
                            // Direct URL - use as is
                            img.src = value;
                        } else if (value.startsWith('gallery/')) {
                            // Gallery path - try to get presigned URL
                            fetch(`/dev/gallery/upload?key=${encodeURIComponent(value)}`)
                                .then(response => response.json())
                                .then(data => {
                                    if (data && data.url) {
                                        img.src = data.url;
                                    } else {
                                        img.src = '/dev' + value;
                                    }
                                })
                                .catch(() => {
                                    // Fallback to direct path
                                    img.src = '/dev' + value;
                                });
                        } else {
                            // Regular path - use as is
                            img.src = '/dev' + value;
                        }
                        
                        img.alt = 'Profile Image';
                        img.className = 'profile-image';
                        
                        // Add error handler for image loading failures
                        img.onerror = () => {
                            console.warn('Failed to load image, trying settings API');
                            // Try to get the image via settings API
                            fetch(`/dev/settings/about_profile_image`, {
                                headers: getAuthHeaders()
                            })
                            .then(response => response.json())
                            .then(data => {
                                if (data.setting && data.setting.presignedUrl) {
                                    img.src = data.setting.presignedUrl;
                                } else {
                                    img.src = 'https://placehold.co/400x400?text=Profile+Image';
                                }
                            })
                            .catch(() => {
                                img.src = 'https://placehold.co/400x400?text=Profile+Image';
                            });
                        };
                        
                        imagePreview.appendChild(img);
                    } else {
                        // Show placeholder if no image
                        imagePreview.innerHTML = '<div class="image-placeholder">No image uploaded</div>';
                    }
        
        // Create file input and label for image upload
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = `file-${id}`;
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none'; // Hide the actual input
        
        const uploadButton = document.createElement('label');
        uploadButton.htmlFor = `file-${id}`;
        uploadButton.className = 'upload-button';
        uploadButton.innerHTML = '<i class="icon">📤</i> Upload New Image';
        
        // Create hidden input to store the actual value (S3 path)
        const valueInput = document.createElement('input');
        valueInput.type = 'hidden';
        valueInput.id = `setting-${id}`;
        valueInput.value = value || '';
        
        // Add file change event listener
        fileInput.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                
                // Show loading state
                imagePreview.innerHTML = '<div class="loading-indicator">Uploading...</div>';
                
                try {
                    // Upload the file to S3 and get the path
                    const newPath = await this.uploadImageToS3(file);
                    
                    // Update the preview with the new image
                    imagePreview.innerHTML = '';
                    const img = document.createElement('img');
                    
                    // Use the presigned URL for preview to avoid path issues
                    try {
                        // Request presigned URL for the image
                        const getUrlResponse = await fetch(`/dev/settings/${id}`, {
                            method: 'GET',
                            headers: getAuthHeaders()
                        });
                        
                        if (!getUrlResponse.ok) {
                            throw new Error('Failed to get presigned URL');
                        }
                        
                        const urlData = await getUrlResponse.json();
                        if (urlData.setting && urlData.setting.presignedUrl) {
                            img.src = urlData.setting.presignedUrl;
                        } else {
                            // Fallback to constructed path if needed
                            const previewPath = this.displayPath || ('/images/profile/' + newPath.split('/').pop());
                            img.src = '/dev' + previewPath;
                        }
                    } catch (error) {
                        console.warn('Error getting presigned URL, using display path instead:', error);
                        // Ensure we have a slash between /dev and the path
                        const previewPath = this.displayPath || ('/images/profile/' + newPath.split('/').pop());
                        img.src = '/dev' + (previewPath.startsWith('/') ? '' : '/') + previewPath;
                    }
                    
                    img.alt = 'Profile Image';
                    img.className = 'profile-image';
                    img.onerror = () => {
                        console.warn('Failed to load image, trying alternative format');
                        // Try alternative format if original fails
                        
                        // Use a presigned URL fetch endpoint instead of direct path
                        fetch(`/dev/settings/about_profile_image`, {
                            method: 'GET',
                            headers: getAuthHeaders()
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.setting && data.setting.presignedUrl) {
                                console.log('Loaded image via settings endpoint presigned URL');
                                img.src = data.setting.presignedUrl;
                            } else {
                                // Last resort fallback - use a temporary placeholder
                                img.src = 'https://placehold.co/400x400?text=Profile+Image';
                                console.error('Could not load profile image, using placeholder');
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching presigned URL:', error);
                            img.src = 'https://placehold.co/400x400?text=Profile+Image';
                        });
                    };
                    imagePreview.appendChild(img);
                    
                    // Update the hidden input value
                    valueInput.value = newPath;
                    
                    // Mark as modified
                    this.handleSettingChange(id, newPath, category, description, false);
                    
                    // Automatically save the setting without requiring a manual click
                    try {
                        await this.updateSetting(id, newPath, category, description);
                        showNotification('Profile image updated and saved successfully', 'success');
                        
                        // Remove from modified settings since we've already saved it
                        delete this.modifiedSettings[id];
                        
                        // Refresh the settings to show updated image with correct presigned URL
                        setTimeout(() => this.loadSettings(), 500);
                    } catch (saveError) {
                        console.error('Error auto-saving profile image setting:', saveError);
                        showNotification('Image uploaded but not saved. Please click Save Changes.', 'warning');
                    }
                } catch (error) {
                    console.error('Error uploading image:', error);
                    
                    // Restore previous image or placeholder
                    if (value && value.trim() !== '') {
                        imagePreview.innerHTML = `<img src="${value.startsWith('http') ? value : '/dev' + value}" alt="Profile Image" class="profile-image">`;
                    } else {
                        imagePreview.innerHTML = '<div class="image-placeholder">No image uploaded</div>';
                    }
                    
                    showNotification('Error uploading image', 'error');
                }
            }
        });
        
        // Add elements to containers
        imageContainer.appendChild(imagePreview);
        imageContainer.appendChild(uploadButton);
        imageContainer.appendChild(fileInput);
        imageContainer.appendChild(valueInput);
        
        formGroup.appendChild(imageContainer);
        
        return formGroup;
    }

    /**
     * Create certifications field with structured UI
     */
    createCertificationsField(id, value, description, category) {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group certifications-group';
        
        // Create label and description
        const labelEl = document.createElement('label');
        labelEl.textContent = this.formatLabel(id);
        formGroup.appendChild(labelEl);
        
        if (description) {
            const descEl = document.createElement('small');
            descEl.textContent = description;
            formGroup.appendChild(descEl);
        }
        
        // Parse certifications from JSON
        let certifications = [];
        try {
            certifications = JSON.parse(value) || [];
        } catch (e) {
            console.warn('Error parsing certifications:', e);
            certifications = [];
        }
        
        // Create container for certifications
        const certificationsContainer = document.createElement('div');
        certificationsContainer.className = 'certifications-container';
        
        // Create hidden input to store the actual JSON value
        const jsonInput = document.createElement('input');
        jsonInput.type = 'hidden';
        jsonInput.id = `setting-${id}`;
        jsonInput.value = value;
        
        // Function to update the hidden JSON value
        const updateJsonValue = () => {
            const updatedCertifications = [];
            
            // Get all certification items
            const items = certificationsContainer.querySelectorAll('.certification-item');
            items.forEach(item => {
                const titleInput = item.querySelector('[data-field="title"]');
                const orgInput = item.querySelector('[data-field="organization"]');
                const yearInput = item.querySelector('[data-field="year"]');
                const descInput = item.querySelector('[data-field="description"]');
                
                if (titleInput && orgInput && yearInput && descInput) {
                    updatedCertifications.push({
                        title: titleInput.value,
                        organization: orgInput.value,
                        year: yearInput.value,
                        description: descInput.value
                    });
                }
            });
            
            // Update the hidden input and mark as modified
            const newValue = JSON.stringify(updatedCertifications);
            jsonInput.value = newValue;
            this.handleSettingChange(id, newValue, category, description, true);
        };
        
        // Function to create a certification item
        const createCertificationItem = (cert = { title: '', organization: '', year: '', description: '' }) => {
            const item = document.createElement('div');
            item.className = 'certification-item';
            
            // Create fields
            item.innerHTML = `
                <div class="cert-field">
                    <label>Title</label>
                    <input type="text" data-field="title" value="${cert.title || ''}" placeholder="Certification Title">
                </div>
                <div class="cert-field">
                    <label>Organization</label>
                    <input type="text" data-field="organization" value="${cert.organization || ''}" placeholder="Issuing Organization">
                </div>
                <div class="cert-field">
                    <label>Year</label>
                    <input type="text" data-field="year" value="${cert.year || ''}" placeholder="Year">
                </div>
                <div class="cert-field">
                    <label>Description</label>
                    <textarea data-field="description" placeholder="Description">${cert.description || ''}</textarea>
                </div>
                <button type="button" class="remove-cert">Remove</button>
            `;
            
            // Add change listeners to all inputs
            item.querySelectorAll('input, textarea').forEach(input => {
                input.addEventListener('change', updateJsonValue);
            });
            
            // Add remove button functionality
            item.querySelector('.remove-cert').addEventListener('click', () => {
                item.remove();
                updateJsonValue();
            });
            
            return item;
        };
        
        // Add existing certifications
        certifications.forEach(cert => {
            certificationsContainer.appendChild(createCertificationItem(cert));
        });
        
        // Create button to add new certification
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'add-certification';
        addButton.innerHTML = '+ Add Certification';
        addButton.addEventListener('click', () => {
            certificationsContainer.appendChild(createCertificationItem());
            updateJsonValue();
        });
        
        // Add elements to form group
        formGroup.appendChild(certificationsContainer);
        formGroup.appendChild(addButton);
        formGroup.appendChild(jsonInput);
        
        return formGroup;
    }

    /**
     * Format a setting label to be more readable
     */
    formatLabel(key) {
        // Remove any prefix like "contact_" or "social_"
        const cleanKey = key.includes('_') ? key.split('_').slice(1).join('_') : key;
        
        // Replace underscores with spaces and capitalize each word
        return cleanKey
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Handle setting change and mark as modified
     */
    handleSettingChange(key, value, category, description, isJson) {
        const input = document.getElementById(`setting-${key}`);
        
        // Try to parse JSON if needed
        if (isJson) {
            try {
                const parsedValue = JSON.parse(value);
                // Re-stringify to ensure proper formatting
                value = JSON.stringify(parsedValue);
            } catch (e) {
                console.warn(`Invalid JSON for ${key}:`, e);
                showNotification(`Warning: Invalid JSON for ${this.formatLabel(key)}`, 'error');
            }
        }
        
        // Special handling for profile image
        if (key === 'about_profile_image' && this.s3Path) {
            // Use the full S3 path instead of the display path for storage in DynamoDB
            console.log('Using full S3 path for storage:', this.s3Path);
            value = this.s3Path;
        }
        
        // Mark as modified
        input.classList.add('setting-modified');
        
        // Add to modified settings
        this.modifiedSettings[key] = {
            value: value,
            category: category,
            description: description || ''
        };
    }

    /**
     * Save all modified settings for a specific category
     */
    async saveSettingsForCategory(category) {
        try {
            // Filter modified settings for this category
            const settingsToSave = Object.keys(this.modifiedSettings)
                .filter(key => this.modifiedSettings[key].category === category);
            
            if (settingsToSave.length === 0) {
                showNotification('No changes to save', 'success');
                return;
            }
            
            // Save each modified setting
            let successCount = 0;
            let failureCount = 0;
            
            for (const key of settingsToSave) {
                const setting = this.modifiedSettings[key];
                try {
                    await this.updateSetting(key, setting.value, setting.category, setting.description);
                    successCount++;
                    
                    // Remove visual indicator and from modified settings
                    const input = document.getElementById(`setting-${key}`);
                    if (input) input.classList.remove('setting-modified');
                    delete this.modifiedSettings[key];
                } catch (error) {
                    console.error(`Error saving setting ${key}:`, error);
                    failureCount++;
                }
            }
            
            if (failureCount > 0) {
                showNotification(`${successCount} setting(s) saved, ${failureCount} failed`, 'warning');
            } else {
                showNotification(`${successCount} setting(s) saved successfully`, 'success');
            }
        } catch (error) {
            console.error(`Error saving ${category} settings:`, error);
            showNotification(`Error saving ${category} settings`, 'error');
        }
    }

    /**
     * Upload an image file to S3 and return the path
     */
    async uploadImageToS3(file) {
        try {
            // Compress the image before uploading
            const compressedFile = await compressProfileImage(file);
            
            // Step 1: Get a presigned URL for upload
            const headers = getAuthHeaders();

            const getUrlResponse = await fetch('/dev/gallery/upload', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    filename: compressedFile.name,
                    contentType: compressedFile.type
                }),
            });
            
            if (!getUrlResponse.ok) {
                console.error('Failed to get upload URL:', getUrlResponse.status, getUrlResponse.statusText);
                throw new Error('Failed to get upload URL');
            }
            
            const urlData = await getUrlResponse.json();
            const { uploadUrl, imageUrl, s3Key, bucket } = urlData;
            
            // Step 2: Upload the compressed file directly to S3 using the presigned URL
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                body: compressedFile,
                headers: {
                    'Content-Type': compressedFile.type
                }
            });
            
            if (!uploadResponse.ok) {
                console.error('Failed to upload to S3:', uploadResponse.status, uploadResponse.statusText);
                throw new Error('Failed to upload to S3');
            }
            
            console.log('Upload successful:', imageUrl);
            
            // Create a display path for the frontend (for preview purposes only)
            const displayPath = '/images/profile/' + s3Key.split('/').pop();
            
            // Store both paths - we'll use s3Key for saving to DynamoDB
            this.s3Path = s3Key;
            this.displayPath = displayPath;
            
            // Return the S3 path directly - this ensures it gets saved properly in DynamoDB
            return s3Key;
        } catch (error) {
            console.error('Error in uploadImageToS3:', error);
            throw error;
        }
    }

    /**
     * Update a setting
     */
    async updateSetting(key, value, category = 'general', description = '') {
        console.log(`Updating setting ${key} with value:`, value);
        
        // For profile image, verify we're sending the correct S3 path
        if (key === 'about_profile_image') {
            console.log(`DEBUG - Profile image update:`, {
                key,
                value,
                category,
                description,
                s3Path: this.s3Path,
                displayPath: this.displayPath
            });
        }
        
        const response = await fetch('/dev/admin/settings', {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                key,
                value,
                category,
                description
            })
        });

        if (!response.ok) {
            console.error(`Error updating setting ${key}:`, await response.text());
            throw new Error(`Failed to update setting: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log(`Setting ${key} updated successfully:`, result);
        
        return result;
    }
}

// Initialize settings manager when DOM content is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('settings-section')) {
        window.settingsManager = new SettingsManager(document.getElementById('settings-section'));
    }
});
