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

/// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/auth/verify-token', {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            console.error('Token verification failed:', await response.text());
            window.location.href = '/index.html';
            return;
        }

        const data = await response.json();
        console.log('Token verification response:', data);
        
        if (!data.user || data.user.role !== 'admin') {
            console.error('Access denied: User is not admin', data);
            window.location.href = '/';
            return;
        }

        // Initialize dashboard
        loadDashboardData();
        setupEventListeners();
        
        // Listen for blog updates
        window.addEventListener('blogUpdated', () => {
            console.log('Blog updated event received, reloading blog posts');
            loadBlogPosts();
        });
    } catch (error) {
        console.error('Authentication error:', error);
        window.location.href = '/index.html';
    }
});

/// Setup Event Listeners
function setupEventListeners() {
    // Navigation - handle sidebar nav clicks with proper target determination
    document.querySelectorAll('.sidebar-nav a').forEach(element => {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            // Make sure we get the section from the clicked element even if we clicked on an icon or span
            const clickedElement = e.target;
            let sectionId;
            
            if (clickedElement.dataset.section) {
                sectionId = clickedElement.dataset.section;
            } else if (clickedElement.closest('[data-section]')) {
                sectionId = clickedElement.closest('[data-section]').dataset.section;
            }
            
            if (sectionId) {
                navigateToSection(sectionId);
            }
        });
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // New blog button
    document.getElementById('new-blog-btn')?.addEventListener('click', () => {
        showBlogEditor();
    });
}

/// Navigation
function navigateToSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    document.getElementById(`${sectionId}-section`).classList.add('active');

    // Update navigation active state in sidebar
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionId) {
            link.classList.add('active');
        }
    });

    // Load section data
    switch (sectionId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'blogs':
            loadBlogPosts();
            break;
        case 'schedule':
            loadSchedule();
            break;
        case 'gallery':
            loadGallery();
            break;
        case 'settings':
            // Settings are now managed by the SettingsManager class
            if (!window.settingsManager) {
                window.settingsManager = new SettingsManager(document.getElementById('settings-section'));
            }
            break;
        case 'users':
            loadUsers();
            break;
    }
}

/// Load Dashboard Data
async function loadDashboardData() {
    try {
        // Load blog count
        const blogResponse = await fetch('/blog', { headers: getAuthHeaders() });
        const blogData = await blogResponse.json();
        document.getElementById('blog-count').textContent = blogData.posts?.length || 0;
        
        // Load user count
        const userResponse = await fetch('/admin/users', { headers: getAuthHeaders() });
        const userData = await userResponse.json();
        document.getElementById('user-count').textContent = userData.users?.length || 0;

        // Load class count 
        const classResponse = await fetch('/classes', { headers: getAuthHeaders() });
        const classData = await classResponse.json();
        document.getElementById('class-count').textContent = classData.classes?.length || 0;

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

/// Blog Management Functions
let currentBlogEditor = null;

async function loadBlogPosts() {
    try {
        // Fetch all blogs (including drafts) by setting published=false
        const response = await fetch('/blog?published=false', {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        const blogs = data.posts || [];
        
        const blogList = document.querySelector('.blog-list');
        blogList.innerHTML = blogs.map(blog => `
            <div class="blog-item">
                <div class="blog-info">
                    <h3 class="blog-title" data-id="${blog.id}" data-slug="${blog.slug || ''}">
                        ${blog.title}
                    </h3>
                    <p class="blog-meta">
                        <span class="status ${blog.status}">${blog.status}</span>
                        <span class="date">${new Date(blog.updatedAt).toLocaleDateString()}</span>
                    </p>
                </div>
                <div class="blog-actions">
                    <button onclick="editBlog('${blog.id}')" class="secondary-btn">Edit</button>
                    <button onclick="deleteBlog('${blog.id}')" class="cancel-btn">Delete</button>
                    ${blog.status !== 'published' ? 
                        `<button onclick="publishBlog('${blog.id}')" class="primary-btn">Publish</button>` : 
                        ''}
                </div>
            </div>
        `).join('');
        
        // Add click listeners to blog titles
        document.querySelectorAll('.blog-title').forEach(title => {
            title.addEventListener('click', () => {
                const id = title.getAttribute('data-id');
                const slug = title.getAttribute('data-slug');
                viewBlogPost(id, slug);
            });
        });
    } catch (error) {
        console.error('Error loading blog posts:', error);
        showNotification('Error loading blog posts', 'error');
    }
}

/// Function to navigate to blog post on frontend
function viewBlogPost(id, slug) {
    let url;
    if (slug) {
        // Use the correct blog URL format
        url = `/blog-page/${slug}`;
    } else if (id) {
        url = `/blog-page.html?id=${id}`;
    } else {
        url = '/blog-page.html';
    }
    
    window.open(url, '_blank');
}

function showBlogEditor(blogData = null) {
    // Ensure blogs section is active
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById('blogs-section').classList.add('active');

    // Update navigation active state
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === 'blogs') {
            link.classList.add('active');
        }
    });

    const editorContainer = document.getElementById('blog-editor-container');
    if (!editorContainer) {
        console.error('Blog editor container not found');
        return;
    }

    const blogList = document.querySelector('.blog-list');
    const newBlogBtn = document.getElementById('new-blog-btn');

    // Hide blog list and new blog button
    if (blogList) blogList.style.display = 'none';
    if (newBlogBtn) newBlogBtn.style.display = 'none';

    // Show editor container
    editorContainer.style.display = 'block';

    // Initialize blog editor if BlogEditor is defined
    if (typeof BlogEditor !== 'undefined') {
        currentBlogEditor = new BlogEditor(editorContainer);
        if (blogData) {
            currentBlogEditor.loadBlog(blogData.id);
        }
    } else {
        console.error('BlogEditor is not defined');
        editorContainer.innerHTML = '<p>Error: Could not load blog editor. Please refresh the page and try again.</p>';
    }
}

function hideBlogEditor() {
    const editorContainer = document.getElementById('blog-editor-container');
    const blogList = document.querySelector('.blog-list');
    const newBlogBtn = document.getElementById('new-blog-btn');

    // Hide editor container
    editorContainer.style.display = 'none';
    
    // Clear editor instance
    if (currentBlogEditor) {
        // Don't call hide() as it would cause recursion
        currentBlogEditor = null;
    }

    // Show blog list and new blog button
    blogList.style.display = 'grid';
    newBlogBtn.style.display = 'block';
    
    // No need to explicitly call loadBlogPosts here
    // It will be called by the 'blogUpdated' event
}

async function editBlog(id) {
    try {
        const headers = getAuthHeaders();
        if (!headers) return;

        const response = await fetch(`/blog/${id}`, {
            headers
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.success || !data.post) {
            throw new Error(data.message || 'Failed to load blog post');
        }
        
        // Pass the blog data to the editor
        showBlogEditor({ id });
    } catch (error) {
        console.error('Error loading blog post:', error);
        showNotification('Error loading blog post', 'error');
    }
}

async function deleteBlog(id) {
    if (!confirm('Are you sure you want to delete this blog post?')) return;
    
    try {
        await fetch(`/blog/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        showNotification('Blog post deleted successfully');
        loadBlogPosts();
    } catch (error) {
        console.error('Error deleting blog:', error);
        showNotification('Error deleting blog post', 'error');
    }
}

async function publishBlog(id) {
    try {
        await fetch(`/blog/${id}/publish`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        showNotification('Blog post published successfully');
        loadBlogPosts();
    } catch (error) {
        console.error('Error publishing blog:', error);
        showNotification('Error publishing blog post', 'error');
    }
}

/// Settings Management
let scheduleEditor = null;
let galleryManager = null;
let allSettings = {};
let modifiedSettings = {};

/**
 * Load all settings from the API and populate the settings forms
 */
async function loadSettings() {
    try {
        // First, add click events to the settings tabs
        setupSettingsTabs();
        
        // Use the public settings endpoint to load settings
        const response = await fetch('/settings', {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        // Store settings for future reference
        if (data.rawSettings) {
            // Clear any existing modified settings
            modifiedSettings = {};
            
            // Group settings by category
            const settingsByCategory = {};
            data.rawSettings.forEach(setting => {
                const category = setting.category || 'general';
                if (!settingsByCategory[category]) {
                    settingsByCategory[category] = [];
                }
                settingsByCategory[category].push(setting);
            });
            
            allSettings = settingsByCategory;
            
            // Populate each settings panel
            populateGeneralSettings(allSettings.general || []);
            populateHomepageSettings(allSettings.homepage || []);
            populateContentSettings(allSettings.content || []);
            populateContactSettings(allSettings.contact || []);
            populateSocialSettings(allSettings.social || []);
            
            // Add save buttons to each panel with event listeners
            addSaveButtons();
            
            console.log('Settings loaded successfully:', allSettings);
        } else {
            console.error('No settings found in response');
            showNotification('Failed to load settings', 'error');
        }

    } catch (error) {
        console.error('Error loading settings:', error);
        showNotification('Error loading settings', 'error');
    }
}

/**
 * Setup tabs for switching between settings categories
 */
function setupSettingsTabs() {
    const tabButtons = document.querySelectorAll('.settings-tabs .tab-button');
    const panels = document.querySelectorAll('.settings-panel');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.getAttribute('data-category');
            
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
 * Add save buttons to each settings panel
 */
function addSaveButtons() {
    const categories = ['general', 'homepage', 'content', 'contact', 'social'];
    
    categories.forEach(category => {
        const form = document.getElementById(`${category}-settings-form`);
        if (!form) return;
        
        // Check if a save button already exists
        if (form.querySelector('.form-actions')) return;
        
        // Create form actions container
        const formActions = document.createElement('div');
        formActions.className = 'form-actions';
        
        // Create save button
        const saveButton = document.createElement('button');
        saveButton.className = 'save-settings-btn';
        saveButton.type = 'button';
        saveButton.textContent = 'Save Changes';
        saveButton.addEventListener('click', () => saveSettingsForCategory(category));
        
        // Add button to form
        formActions.appendChild(saveButton);
        form.appendChild(formActions);
    });
}

/**
 * Save all modified settings for a specific category
 */
async function saveSettingsForCategory(category) {
    try {
        // Filter modified settings for this category
        const settingsToSave = Object.keys(modifiedSettings)
            .filter(key => modifiedSettings[key].category === category);
        
        if (settingsToSave.length === 0) {
            showNotification('No changes to save', 'success');
            return;
        }
        
        // Save each modified setting
        let successCount = 0;
        for (const key of settingsToSave) {
            const setting = modifiedSettings[key];
            await updateSetting(key, setting.value, setting.category, setting.description);
            successCount++;
            
            // Remove visual indicator and from modified settings
            const input = document.getElementById(`setting-${key}`);
            if (input) input.classList.remove('setting-modified');
        }
        
        // Clear modified settings for this category
        settingsToSave.forEach(key => delete modifiedSettings[key]);
        
        showNotification(`${successCount} setting(s) saved successfully`, 'success');
    } catch (error) {
        console.error(`Error saving ${category} settings:`, error);
        showNotification(`Error saving ${category} settings`, 'error');
    }
}

/**
 * Populate general settings form
 */
function populateGeneralSettings(settings) {
    const form = document.getElementById('general-settings-form');
    if (!form) return;
    
    form.innerHTML = ''; // Clear existing content
    
    // Find general settings
    const generalSettings = settings.filter(setting => setting.id !== undefined);
    
    if (generalSettings.length === 0) {
        form.innerHTML = '<p>No general settings found. Add settings through the API.</p>';
        return;
    }
    
    // Add each setting as a form field
    generalSettings.forEach(setting => {
        const formGroup = createFormField(
            setting.id, 
            setting.key || setting.id, 
            setting.value, 
            setting.description, 
            'general'
        );
        form.appendChild(formGroup);
    });
}

/**
 * Populate homepage settings form
 */
function populateHomepageSettings(settings) {
    const form = document.getElementById('homepage-settings-form');
    if (!form) return;
    
    form.innerHTML = ''; // Clear existing content
    
    // Find homepage settings
    const homepageSettings = settings.filter(setting => setting.id !== undefined);
    
    if (homepageSettings.length === 0) {
        form.innerHTML = '<p>No homepage settings found. Add settings through the API.</p>';
        return;
    }
    
    // Add each setting as a form field
    homepageSettings.forEach(setting => {
        const formGroup = createFormField(
            setting.id, 
            setting.key || setting.id, 
            setting.value, 
            setting.description, 
            'homepage'
        );
        form.appendChild(formGroup);
    });
}

/**
 * Populate content settings form
 */
function populateContentSettings(settings) {
    const form = document.getElementById('content-settings-form');
    if (!form) return;
    
    form.innerHTML = ''; // Clear existing content
    
    // Find content settings
    const contentSettings = settings.filter(setting => setting.id !== undefined);
    
    if (contentSettings.length === 0) {
        form.innerHTML = '<p>No content settings found. Add settings through the API.</p>';
        return;
    }
    
    // Add each setting as a form field
    contentSettings.forEach(setting => {
        const formGroup = createFormField(
            setting.id, 
            setting.key || setting.id, 
            setting.value, 
            setting.description, 
            'content',
            isJsonContent(setting.id, setting.value)
        );
        form.appendChild(formGroup);
    });
}

/**
 * Populate contact settings form
 */
function populateContactSettings(settings) {
    const form = document.getElementById('contact-settings-form');
    if (!form) return;
    
    form.innerHTML = ''; // Clear existing content
    
    // Find contact settings
    const contactSettings = settings.filter(setting => setting.id !== undefined);
    
    if (contactSettings.length === 0) {
        form.innerHTML = '<p>No contact settings found. Add settings through the API.</p>';
        return;
    }
    
    // Add each setting as a form field
    contactSettings.forEach(setting => {
        const formGroup = createFormField(
            setting.id, 
            setting.key || setting.id, 
            setting.value, 
            setting.description, 
            'contact',
            false,
            setting.id.includes('email') ? 'email' : 
              setting.id.includes('phone') ? 'tel' : 'text'
        );
        form.appendChild(formGroup);
    });
}

/**
 * Populate social settings form
 */
function populateSocialSettings(settings) {
    const form = document.getElementById('social-settings-form');
    if (!form) return;
    
    form.innerHTML = ''; // Clear existing content
    
    // Find social settings
    const socialSettings = settings.filter(setting => setting.id !== undefined);
    
    if (socialSettings.length === 0) {
        form.innerHTML = '<p>No social media settings found. Add settings through the API.</p>';
        return;
    }
    
    // Add each setting as a form field
    socialSettings.forEach(setting => {
        const formGroup = createFormField(
            setting.id, 
            setting.key || setting.id, 
            setting.value, 
            setting.description, 
            'social',
            false,
            'url'  // Social settings are typically URLs
        );
        form.appendChild(formGroup);
    });
}

/**
 * Check if a setting value looks like JSON content
 */
function isJsonContent(id, value) {
    // Check for known JSON fields
    if (id === 'about_certifications') return true;
    
    // Try to detect JSON content by checking if it starts with [ or { and is not just a simple string
    if (typeof value === 'string' && value.trim().length > 0) {
        const firstChar = value.trim()[0];
        const lastChar = value.trim()[value.trim().length - 1];
        
        if (
            (firstChar === '{' && lastChar === '}') || 
            (firstChar === '[' && lastChar === ']')
        ) {
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
function createFormField(id, label, value, description, category, isJson = false, inputType = 'text') {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    
    // Create label
    const labelEl = document.createElement('label');
    labelEl.textContent = formatLabel(label);
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
        return createProfileImageField(id, value, description, category);
    }
    
    // Special handling for certifications
    if (id === 'about_certifications') {
        return createCertificationsField(id, value, description, category);
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
        textarea.addEventListener('change', (e) => handleSettingChange(id, e.target.value, category, description, isJson));
        
        formGroup.appendChild(textarea);
    } else {
        // Use input field for regular values
        const input = document.createElement('input');
        input.type = inputType;
        input.id = `setting-${id}`;
        input.value = value;
        
        // Add change event listener
        input.addEventListener('change', (e) => handleSettingChange(id, e.target.value, category, description, false));
        
        formGroup.appendChild(input);
    }
    
    return formGroup;
}

/**
 * Create profile image field with preview and upload functionality
 */
async function createProfileImageField(id, value, description, category) {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    
    // Create container for image preview and upload controls
    const imageContainer = document.createElement('div');
    imageContainer.className = 'profile-image-container';
    
    // Create image preview
    const imagePreview = document.createElement('div');
    imagePreview.className = 'image-preview';
    
    // Create image element if the path is available
    if (value && value.trim() !== '') {
        try {
            // Get a presigned URL for the image to display in the preview
            const imageUrlResponse = await fetch(`/gallery/upload?key=${encodeURIComponent(value)}`);
            
            if (imageUrlResponse.ok) {
                const imageUrlData = await imageUrlResponse.json();
                const imageUrl = imageUrlData.url;
                
                // Create image element
                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = "Profile Image";
                img.className = "profile-image";
                imagePreview.appendChild(img);
                imagePreview.classList.add('has-image');
            } else {
                // Create placeholder if failed to get image URL
                const placeholder = document.createElement('div');
                placeholder.className = 'image-placeholder';
                placeholder.textContent = 'Error loading image';
                imagePreview.appendChild(placeholder);
            }
        } catch (error) {
            console.error('Error loading profile image:', error);
            
            // Create placeholder on error
            const placeholder = document.createElement('div');
            placeholder.className = 'image-placeholder';
            placeholder.textContent = 'Error loading image';
            imagePreview.appendChild(placeholder);
        }
    } else {
        // Create placeholder if no image
        const placeholder = document.createElement('div');
        placeholder.className = 'image-placeholder';
        placeholder.textContent = 'No image uploaded';
        imagePreview.appendChild(placeholder);
    }
    
    // Create file input and label for image upload
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = `file-${id}`;
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none'; // Hide the actual input
    
    const uploadButton = document.createElement('button');
    uploadButton.type = 'button';
    uploadButton.className = 'upload-button';
    uploadButton.innerHTML = '<i class="icon">📤</i> Upload New Image';
    uploadButton.onclick = () => fileInput.click();
    
    // Create hidden input to store the actual value (S3 path)
    const valueInput = document.createElement('input');
    valueInput.type = 'hidden';
    valueInput.id = `setting-${id}`;
    valueInput.value = value || '';
    
    // Add file change event listener
    fileInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // Create loading indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading-indicator';
            loadingDiv.textContent = 'Uploading...';
            
            // Clear preview and show loading
            imagePreview.innerHTML = '';
            imagePreview.appendChild(loadingDiv);
            
            try {
                // 1. Upload the file to S3 and get the path
                const s3Key = await handleImageUpload(file);
                
                // 2. Get a presigned URL for the image to display in the preview
                const imageUrlResponse = await fetch(`/gallery/upload?key=${encodeURIComponent(s3Key)}`);

                if (!imageUrlResponse.ok) {
                    throw new Error('Failed to get image URL');
                }
                
                const imageUrlData = await imageUrlResponse.json();
                const imageUrl = imageUrlData.url;
                
                // 3. Update the preview with the new image
                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = "Profile Image";
                img.className = "profile-image";
                
                // Clear previous content and add new image
                imagePreview.innerHTML = '';
                imagePreview.appendChild(img);
                imagePreview.classList.add('has-image');
                
                // 4. Update the hidden input value with the S3 key
                valueInput.value = s3Key;
                
                // Mark as modified
                handleSettingChange(id, s3Key, category, description, false);
                
                showNotification('Profile image uploaded successfully', 'success');
            } catch (error) {
                console.error('Error uploading image:', error);
                
                // Handle error by restoring previous state or showing placeholder
                try {
                    imagePreview.innerHTML = '';
                    
                    if (value && value.trim() !== '') {
                        // Try to get a presigned URL again for the old value
                        const imageUrlResponse = await fetch(`/gallery/upload?key=${encodeURIComponent(value)}`);
                        if (imageUrlResponse.ok) {
                            const imageUrlData = await imageUrlResponse.json();
                            const imageUrl = imageUrlData.url;
                            
                            const img = document.createElement('img');
                            img.src = imageUrl;
                            img.alt = "Profile Image";
                            img.className = "profile-image";
                            imagePreview.appendChild(img);
                            imagePreview.classList.add('has-image');
                        } else {
                            const placeholder = document.createElement('div');
                            placeholder.className = 'image-placeholder';
                            placeholder.textContent = 'Error loading image';
                            imagePreview.appendChild(placeholder);
                        }
                    } else {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'image-placeholder';
                        placeholder.textContent = 'No image uploaded';
                        imagePreview.appendChild(placeholder);
                    }
                } catch (restoreError) {
                    console.error('Error restoring image preview:', restoreError);
                    imagePreview.innerHTML = '';
                    const placeholder = document.createElement('div');
                    placeholder.className = 'image-placeholder';
                    placeholder.textContent = 'Error loading image';
                    imagePreview.appendChild(placeholder);
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
function createCertificationsField(id, value, description, category) {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group certifications-group';
    
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
    function updateJsonValue() {
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
        handleSettingChange(id, newValue, category, description, true);
    }
    
    // Function to create a certification item
    function createCertificationItem(cert = { title: '', organization: '', year: '', description: '' }) {
        const item = document.createElement('div');
        item.className = 'certification-item';
        
        // Create fields
        item.innerHTML = `
            <div class="cert-field">
                <label>Title</label>
                <input type="text" data-field="title" value="${cert.title}" placeholder="Certification Title">
            </div>
            <div class="cert-field">
                <label>Organization</label>
                <input type="text" data-field="organization" value="${cert.organization}" placeholder="Issuing Organization">
            </div>
            <div class="cert-field">
                <label>Year</label>
                <input type="text" data-field="year" value="${cert.year}" placeholder="Year">
            </div>
            <div class="cert-field">
                <label>Description</label>
                <textarea data-field="description" placeholder="Description">${cert.description}</textarea>
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
    }
    
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
 * Upload an image file to S3 and return the path
 */
async function handleImageUpload(file) {
    try {
        // 1. Get headers for authentication
        const headers = getAuthHeaders();
        if (!headers) return;

        // 2. Request a presigned URL from the server
        const presignedResponse = await fetch('/gallery/upload', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                filename: file.name,
                contentType: file.type
            })
        });

        if (!presignedResponse.ok) throw new Error('Failed to get upload URL');

        const presignedData = await presignedResponse.json();
        console.log('Received presigned URL data for content image:', presignedData);

        // 3. Upload the file directly to S3 using the presigned URL
        const uploadResponse = await fetch(presignedData.uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type
            }
        });

        if (!uploadResponse.ok) throw new Error('S3 upload failed');

        // Return the S3 key (not the URL) to be stored
        return presignedData.s3Key;
    } catch (error) {
        console.error('Image upload failed:', error);
        showNotification('Failed to upload image', 'error');
        throw error;
    }
}

/**
 * Format a setting label to be more readable
 */
function formatLabel(key) {
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
function handleSettingChange(key, value, category, description, isJson) {
    const input = document.getElementById(`setting-${key}`);
    
    // Try to parse JSON if needed
    if (isJson) {
        try {
            const parsedValue = JSON.parse(value);
            // Re-stringify to ensure proper formatting
            value = JSON.stringify(parsedValue);
        } catch (e) {
            console.warn(`Invalid JSON for ${key}:`, e);
            showNotification(`Warning: Invalid JSON for ${formatLabel(key)}`, 'error');
        }
    }
    
    // Mark as modified
    input.classList.add('setting-modified');
    
    // Add to modified settings
    modifiedSettings[key] = {
        value: value,
        category: category,
        description: description || ''
    };
}

/// Update a setting
async function updateSetting(key, value, category = 'general', description = '') {
    const response = await fetch('/admin/settings', {
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
        throw new Error('Failed to update setting');
    }

    return response.json();
}

/// Create notification element if it doesn't exist
function createNotificationElement() {
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification';
        notification.style.display = 'none';
        document.body.appendChild(notification);
    }
    return notification;
}

/// Show notification
function showNotification(message, type = 'success') {
    const notification = createNotificationElement();
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

/// Load Users
async function loadUsers() {
    try {
        const response = await fetch('/admin/users', {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        const users = data.users || [];
        
        const usersList = document.querySelector('.users-list');
        usersList.innerHTML = users.map(user => `
            <div class="user-item">
                <div class="user-info">
                    <h3>${user.email}</h3>
                    <p class="user-meta">
                        <span class="role ${user.role}">${user.role}</span>
                        <span class="date">Joined: ${new Date(user.createdAt).toLocaleDateString()}</span>
                    </p>
                </div>
                <div class="user-actions">
                    ${user.role !== 'admin' ? 
                        `<button onclick="makeAdmin('${user.id}')" class="secondary-btn">Make Admin</button>` : 
                        ''}
                    <button onclick="deleteUser('${user.id}')" class="cancel-btn">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Error loading users', 'error');
    }
}

/// Make user admin
async function makeAdmin(userId) {
    if (!confirm('Are you sure you want to make this user an admin?')) return;
    
    try {
        await fetch(`/admin/users/${userId}/make-admin`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        showNotification('User role updated successfully');
        loadUsers();
    } catch (error) {
        console.error('Error updating user role:', error);
        showNotification('Error updating user role', 'error');
    }
}

/// Delete user
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        await fetch(`/admin/users/${userId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        showNotification('User deleted successfully');
        loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Error deleting user', 'error');
    }
}

/// Schedule Management
async function loadSchedule() {
    try {
        console.log('Loading schedule editor in dedicated page');
        
        const scheduleContainer = document.getElementById('schedule-editor');
        if (!scheduleContainer) {
            console.error('Schedule editor container not found');
            return;
        }
        
        // Check if ScheduleEditor class is loaded
        if (typeof window.ScheduleEditor === 'undefined') {
            console.warn('ScheduleEditor class not found, attempting to load script');
            
            // Create script tag dynamically
            const scriptElement = document.createElement('script');
            scriptElement.src = 'static/schedule-editor.js';
            scriptElement.onload = function() {
                console.log('ScheduleEditor script loaded successfully');
                initializeScheduleEditor();
            };
            scriptElement.onerror = function() {
                console.error('Failed to load ScheduleEditor script');
                scheduleContainer.innerHTML = '<p>Failed to load schedule editor. Please refresh the page and try again.</p>';
            };
            document.head.appendChild(scriptElement);
        } else {
            initializeScheduleEditor();
        }
        
        function initializeScheduleEditor() {
            try {
                // Initialize class modal functionality if available
                if (typeof initAdminClassModal === 'function') {
                    console.log('Initializing admin class modal');
                    initAdminClassModal();
                }
                
                if (!scheduleEditor) {
                    console.log('Initializing schedule editor');
                    scheduleEditor = new ScheduleEditor(scheduleContainer);
                    
                    // Add listeners for schedule changes
                    scheduleContainer.addEventListener('schedule-updated', function(e) {
                        showNotification('Class schedule updated', 'success');
                    });
                } else {
                    // Refresh schedule data if editor already exists
                    scheduleEditor.loadSchedule();
                }
            } catch (error) {
                console.error('Error initializing ScheduleEditor:', error);
                scheduleContainer.innerHTML = '<p>Error initializing schedule editor. Please refresh the page and try again.</p>';
            }
        }
    } catch (error) {
        console.error('Error loading schedule:', error);
        showNotification('Error loading schedule', 'error');
    }
}

/// Gallery Management
async function loadGallery() {
    try {
        console.log('Loading gallery manager in dedicated page');
        
        const galleryContainer = document.getElementById('gallery-manager');
        if (!galleryContainer) {
            console.error('Gallery manager container not found');
            return;
        }
        
        // Check if GalleryManager class is loaded
        if (typeof window.GalleryManager === 'undefined') {
            console.warn('GalleryManager class not found, attempting to load script');
            
            // Create script tag dynamically
            const scriptElement = document.createElement('script');
            scriptElement.src = 'static/gallery-manager.js';
            scriptElement.onload = function() {
                console.log('GalleryManager script loaded successfully');
                initializeGalleryManager();
            };
            scriptElement.onerror = function() {
                console.error('Failed to load GalleryManager script');
                galleryContainer.innerHTML = '<p>Failed to load gallery manager. Please refresh the page and try again.</p>';
            };
            document.head.appendChild(scriptElement);
        } else {
            initializeGalleryManager();
        }
        
        function initializeGalleryManager() {
            try {
                if (!galleryManager) {
                    console.log('Initializing gallery manager');
                    galleryManager = new GalleryManager(galleryContainer);
                    
                    // Add listeners for gallery changes
                    galleryContainer.addEventListener('gallery-updated', function(e) {
                        showNotification('Gallery updated', 'success');
                    });
                } else {
                    // Refresh gallery data if manager already exists
                    galleryManager.loadGallery();
                }
            } catch (error) {
                console.error('Error initializing GalleryManager:', error);
                galleryContainer.innerHTML = '<p>Error initializing gallery manager. Please refresh the page and try again.</p>';
            }
        }
    } catch (error) {
        console.error('Error loading gallery:', error);
        showNotification('Error loading gallery', 'error');
    }
}

/// Handle Logout
async function handleLogout() {
    try {
        await fetch('/auth/logout', {
            method: 'POST',
            headers: getAuthHeaders()
        });    
        localStorage.removeItem('token');
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
    }
}
