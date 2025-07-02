// Get auth headers for API requests
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/dev/index.html';
        return null;
    }
    
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
}

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/dev/auth/verify-token', {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            console.error('Token verification failed:', await response.text());
            window.location.href = '/dev/index.html';
            return;
        }

        const data = await response.json();
        console.log('Token verification response:', data);
        
        if (!data.user || data.user.role !== 'admin') {
            console.error('Access denied: User is not admin', data);
            window.location.href = '/dev/';
            return;
        }

        // Initialize dashboard
        loadDashboardData();
        setupEventListeners();
    } catch (error) {
        console.error('Authentication error:', error);
        window.location.href = '/dev/index.html';
    }
});

// Setup Event Listeners
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

// Navigation
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
            loadSettings();
            break;
        case 'users':
            loadUsers();
            break;
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        // Load blog count
        const blogResponse = await fetch('/dev/blog', { headers: getAuthHeaders() });
        const blogData = await blogResponse.json();
        document.getElementById('blog-count').textContent = blogData.posts?.length || 0;
        
        // Load user count
        const userResponse = await fetch('/dev/admin/users', { headers: getAuthHeaders() });
        const userData = await userResponse.json();
        document.getElementById('user-count').textContent = userData.users?.length || 0;

        // Load class count 
        const classResponse = await fetch('/dev/classes', { headers: getAuthHeaders() });
        const classData = await classResponse.json();
        document.getElementById('class-count').textContent = classData.classes?.length || 0;

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

// Blog Management Functions
let currentBlogEditor = null;

async function loadBlogPosts() {
    try {
        const response = await fetch('/dev/blog', {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        const blogs = data.posts || [];
        
        const blogList = document.querySelector('.blog-list');
        blogList.innerHTML = blogs.map(blog => `
            <div class="blog-item">
                <div class="blog-info">
                    <h3>${blog.title}</h3>
                    <p class="blog-meta">
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
    } catch (error) {
        console.error('Error loading blog posts:', error);
        showNotification('Error loading blog posts', 'error');
    }
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

    // Show blog list and new blog button
    blogList.style.display = 'grid';
    newBlogBtn.style.display = 'block';

    // Hide and clear editor container
    editorContainer.style.display = 'none';
    if (currentBlogEditor) {
        currentBlogEditor.hide();
        currentBlogEditor = null;
    }
}

async function editBlog(id) {
    try {
        const headers = getAuthHeaders();
        if (!headers) return;

        const response = await fetch(`/dev/blog/${id}`, {
            headers
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to load blog post');
        }
        
        showBlogEditor(data);
    } catch (error) {
        console.error('Error loading blog post:', error);
        showNotification('Error loading blog post', 'error');
    }
}

async function deleteBlog(id) {
    if (!confirm('Are you sure you want to delete this blog post?')) return;
    
    try {
        await fetch(`/dev/blog/${id}`, {
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
        await fetch(`/dev/blog/${id}/publish`, {
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

// Settings Management
let scheduleEditor = null;
let galleryManager = null;

async function loadSettings() {
    try {
        const response = await fetch('/dev/settings', {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        const settings = data.settings || {};

        // Load about content
        const aboutContent = settings.about || '';
        const aboutEditor = document.getElementById('about-content');
        aboutEditor.value = aboutContent;
        
        // Save about content when changed
        aboutEditor.addEventListener('change', async () => {
            try {
                await updateSetting('about', aboutEditor.value, 'general', 'Main about section content');
                showNotification('About content saved successfully');
            } catch (error) {
                console.error('Error saving about content:', error);
                showNotification('Error saving about content', 'error');
            }
        });

        // Add version checks and script loading verification
        if (typeof window.ScheduleEditor === 'undefined') {
            console.warn('ScheduleEditor class not found, attempting to load script');
            
            // Create script tag dynamically
            const scriptElement = document.createElement('script');
            scriptElement.src = 'static/schedule-editor.js'; // Fix the path to use static directory
            scriptElement.onload = function() {
                console.log('ScheduleEditor script loaded successfully');
                initializeScheduleEditor();
            };
            scriptElement.onerror = function() {
                console.error('Failed to load ScheduleEditor script');
                showFailMessage('schedule-editor');
            };
            document.head.appendChild(scriptElement);
        } else {
            initializeScheduleEditor();
        }

        // Helper function to initialize the schedule editor
        function initializeScheduleEditor() {
            const scheduleContainer = document.getElementById('schedule-editor');
            if (scheduleContainer) {
                try {
                    if (!scheduleEditor) {
                        console.log('Initializing schedule editor');
                        scheduleEditor = new ScheduleEditor(scheduleContainer);
                        
                        // Add listeners for schedule changes
                        scheduleContainer.addEventListener('schedule-updated', function(e) {
                            showNotification('Class schedule updated', 'success');
                        });
                    }
                } catch (error) {
                    console.error('Error initializing ScheduleEditor:', error);
                    showFailMessage('schedule-editor');
                }
            } else {
                console.error('Schedule editor container not found');
            }
        }

        // Helper function to show fail message
        function showFailMessage(componentId) {
            const container = document.getElementById(componentId);
            if (container) {
                container.innerHTML = '<p>Component loading failed. Please refresh the page.</p>';
            }
        }
        
        // Add version checks and script loading verification for gallery manager
        if (typeof window.GalleryManager === 'undefined') {
            console.warn('GalleryManager class not found, attempting to load script');
            
            // Create script tag dynamically
            const scriptElement = document.createElement('script');
            scriptElement.src = 'static/gallery-manager.js'; // Fix the path to use static directory
            scriptElement.onload = function() {
                console.log('GalleryManager script loaded successfully');
                initializeGalleryManager();
            };
            scriptElement.onerror = function() {
                console.error('Failed to load GalleryManager script');
                showFailMessage('gallery-manager');
            };
            document.head.appendChild(scriptElement);
        } else {
            initializeGalleryManager();
        }

        // Helper function to initialize the gallery manager
        function initializeGalleryManager() {
            const galleryContainer = document.getElementById('gallery-manager');
            if (galleryContainer) {
                try {
                    if (!galleryManager) {
                        console.log('Initializing gallery manager');
                        galleryManager = new GalleryManager(galleryContainer);
                        
                        // Add listeners for gallery changes
                        galleryContainer.addEventListener('gallery-updated', function(e) {
                            showNotification('Gallery updated', 'success');
                        });
                    }
                } catch (error) {
                    console.error('Error initializing GalleryManager:', error);
                    showFailMessage('gallery-manager');
                }
            } else {
                console.error('Gallery manager container not found');
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        showNotification('Error loading settings', 'error');
    }
}

// Update a setting
async function updateSetting(key, value, category = 'general', description = '') {
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
        throw new Error('Failed to update setting');
    }

    return response.json();
}

// Create notification element if it doesn't exist
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

// Show notification
function showNotification(message, type = 'success') {
    const notification = createNotificationElement();
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Load Users
async function loadUsers() {
    try {
        const response = await fetch('/dev/admin/users', {
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

// Make user admin
async function makeAdmin(userId) {
    if (!confirm('Are you sure you want to make this user an admin?')) return;
    
    try {
        await fetch(`/dev/admin/users/${userId}/make-admin`, {
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

// Delete user
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        await fetch(`/dev/admin/users/${userId}`, {
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

// Schedule Management
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

// Gallery Management
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

// Handle Logout
async function handleLogout() {
    try {
        await fetch('/dev/auth/logout', {
            method: 'POST',
            headers: getAuthHeaders()
        });
        window.location.href = '/dev/index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}
