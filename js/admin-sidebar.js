/**
 * Admin Sidebar Handler
 * This script loads the admin sidebar from a template and highlights the current page.
 * Requires admin-sidebar-template.js to be included before this script.
 */
document.addEventListener('DOMContentLoaded', function() {
    loadAdminSidebar();
});

/**
 * Loads the admin sidebar template and inserts it into the sidebar element
 */
function loadAdminSidebar() {
    try {
        // Insert the sidebar HTML into the sidebar element
        // ADMIN_SIDEBAR_HTML comes from admin-sidebar-template.js
        const sidebarElement = document.querySelector('.admin-sidebar');
        if (sidebarElement) {
            // Check if the template variable is available
            if (typeof ADMIN_SIDEBAR_HTML === 'undefined') {
                throw new Error('Admin sidebar template not found. Make sure admin-sidebar-template.js is included before this script.');
            }
            
            sidebarElement.innerHTML = ADMIN_SIDEBAR_HTML;
            
            // Highlight the current page in the navigation
            highlightCurrentPage();
            
            // Set up event listeners for sidebar elements
            setupSidebarEventListeners();
        } else {
            console.error('Admin sidebar element not found');
        }
    } catch (error) {
        console.error('Error loading admin sidebar:', error);
    }
}

/**
 * Highlights the current page in the navigation menu
 */
function highlightCurrentPage() {
    // Get the current page filename from the URL
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop();
    
    // Determine which nav item should be active
    let activePage = '';
    
    if (currentPage.includes('dashboard')) {
        activePage = 'dashboard';
    } else if (currentPage.includes('schedule')) {
        activePage = 'schedule';
    } else if (currentPage.includes('sessions')) {
        activePage = 'sessions';
    } else if (currentPage.includes('photos')) {
        activePage = 'photos';
    } else if (currentPage.includes('members')) {
        activePage = 'members';
    } else if (currentPage.includes('workshops')) {
        activePage = 'workshops';
    } else if (currentPage.includes('retreats')) {
        activePage = 'retreats';
    } else if (currentPage.includes('pricing')) {
        activePage = 'pricing';
    } else if (currentPage.includes('settings')) {
        activePage = 'settings';
    }
    
    // Add active class to the corresponding nav link
    if (activePage) {
        const activeNavLink = document.querySelector(`.admin-nav-link[data-page="${activePage}"]`);
        if (activeNavLink) {
            activeNavLink.classList.add('active');
        }
    }
    
    // Also check URL hash for specific sections
    const hash = window.location.hash.substring(1);
    if (hash) {
        const hashNavLink = document.querySelector(`.admin-nav-link[data-page="${hash}"]`);
        if (hashNavLink) {
            // Remove active class from any other links
            document.querySelectorAll('.admin-nav-link.active').forEach(el => {
                el.classList.remove('active');
            });
            // Add active class to the hash link
            hashNavLink.classList.add('active');
        }
    }
}

/**
 * Sets up event listeners for sidebar elements
 */
function setupSidebarEventListeners() {
    // Logout button event listener
    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Implement logout functionality
            console.log('Logout clicked');
            // Redirect to login page or trigger logout API call
            window.location.href = 'login.html';
        });
    }
}
