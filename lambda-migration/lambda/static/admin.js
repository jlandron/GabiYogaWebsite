// Get auth headers for API requests
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/dev/login.html';
        return;
    }
    return {
        'Authorization': 'Bearer ' + token,
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
            window.location.href = '/dev/login.html';
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
        window.location.href = '/dev/login.html';
    }
});

// Setup Event Listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('[data-section]').forEach(element => {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToSection(e.target.dataset.section);
        });
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // New blog button
    document.getElementById('new-blog-btn').addEventListener('click', () => {
        // TODO: Implement new blog creation
        console.log('New blog creation to be implemented');
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

    // Update navigation active state
    document.querySelectorAll('.nav-links a').forEach(link => {
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
        document.getElementById('blog-count').textContent = blogData.length;

        // Load user count
        const userResponse = await fetch('/dev/admin/users', { headers: getAuthHeaders() });
        const userData = await userResponse.json();
        document.getElementById('user-count').textContent = userData.length;

        // Load class count
        const classResponse = await fetch('/dev/classes', { headers: getAuthHeaders() });
        const classData = await classResponse.json();
        document.getElementById('class-count').textContent = classData.length;

    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Load Blog Posts
async function loadBlogPosts() {
    try {
        const response = await fetch('/dev/blog', {
            headers: getAuthHeaders()
        });
        const blogs = await response.json();
        
        const blogList = document.querySelector('.blog-list');
        blogList.innerHTML = blogs.map(blog => `
            <div class="blog-item">
                <h3>${blog.title}</h3>
                <p>${blog.status === 'published' ? 'Published' : 'Draft'}</p>
                <div class="blog-actions">
                    <button onclick="editBlog('${blog.id}')">Edit</button>
                    <button onclick="deleteBlog('${blog.id}')">Delete</button>
                    ${blog.status !== 'published' ? 
                        `<button onclick="publishBlog('${blog.id}')">Publish</button>` : 
                        ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading blog posts:', error);
    }
}

// Load Settings
async function loadSettings() {
    try {
        const response = await fetch('/dev/settings', {
            headers: getAuthHeaders()
        });
        const settings = await response.json();
        
        // Load about content
        document.getElementById('about-content').value = settings.about || '';

        // Load schedule editor
        // TODO: Implement schedule editor
        
        // Load gallery manager
        // TODO: Implement gallery manager
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Load Users
async function loadUsers() {
    try {
        const response = await fetch('/dev/admin/users', {
            headers: getAuthHeaders()
        });
        const users = await response.json();
        
        const usersList = document.querySelector('.users-list');
        usersList.innerHTML = users.map(user => `
            <div class="user-item">
                <h3>${user.name}</h3>
                <p>${user.email}</p>
                <p>Role: ${user.role}</p>
                <div class="user-actions">
                    <button onclick="editUser('${user.id}')">Edit</button>
                    <button onclick="deleteUser('${user.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Handle Logout
async function handleLogout() {
    try {
        await fetch('/dev/auth/logout', {
            method: 'POST',
            headers: getAuthHeaders()
        });
        window.location.href = '/dev/login.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Blog Management Functions
async function editBlog(id) {
    // TODO: Implement blog editing
    console.log('Edit blog:', id);
}

async function deleteBlog(id) {
    if (!confirm('Are you sure you want to delete this blog post?')) return;
    
    try {
        await fetch(`/dev/blog/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        loadBlogPosts();
    } catch (error) {
        console.error('Error deleting blog:', error);
    }
}

async function publishBlog(id) {
    try {
        await fetch(`/dev/blog/${id}/publish`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        loadBlogPosts();
    } catch (error) {
        console.error('Error publishing blog:', error);
    }
}

// User Management Functions
async function editUser(id) {
    // TODO: Implement user editing
    console.log('Edit user:', id);
}

async function deleteUser(id) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        await fetch(`/dev/admin/users/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
    }
}
