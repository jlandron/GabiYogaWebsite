/**
 * Header Loader Script
 * Loads the reusable header component on all pages
 */

document.addEventListener('DOMContentLoaded', function() {
    // Find the placeholder where the header should be inserted
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (!headerPlaceholder) {
        console.warn('Header placeholder not found in the document');
        return;
    }
    
    // Fetch the header component
    fetch('/components/header.html')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch header component');
            }
            return response.text();
        })
        .then(html => {
            // Insert the header HTML into the placeholder
            headerPlaceholder.innerHTML = html;
            
            // Initialize mobile menu functionality after header is loaded
            initMobileMenu();
            
            // Add active class to current page nav link
            highlightCurrentPage();
            
            // Initialize My Account link functionality
            initMyAccountLink();
        })
        .catch(error => {
            console.error('Error loading header component:', error);
            headerPlaceholder.innerHTML = `<header><nav class="navbar"><div class="logo"><h1>Gabi Yoga</h1></div></nav></header>`;
        });
});

/**
 * Initialize mobile menu toggle functionality
 */
function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
        
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }
}

/**
 * Add active class to current page nav link
 */
function highlightCurrentPage() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-links a');
    const logoLink = document.querySelector('.logo a');
    
    // Handle logo active state for home page
    if (logoLink && (currentPage === 'index.html' || currentPage === '')) {
        logoLink.classList.add('active');
    }
    
    // Handle navigation links
    navLinks.forEach(link => {
        const href = link.getAttribute('href').split('#')[0];
        if (href === currentPage) {
            link.classList.add('active');
        }
    });
}

/**
 * Initialize My Account link functionality
 */
function initMyAccountLink() {
    const myAccountLink = document.getElementById('myAccountLink');
    if (myAccountLink) {
        myAccountLink.addEventListener('click', function(event) {
            event.preventDefault();
            
            // Check if user is logged in
            if (typeof UserService !== 'undefined' && UserService.isLoggedIn()) {
                // Redirect to appropriate dashboard
                if (UserService.isAdmin()) {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            } else {
                // Show login modal if function is available
                if (typeof showLoginModal === 'function') {
                    showLoginModal();
                } else {
                    // Fallback to login page if modal functions aren't loaded
                    window.location.href = 'login.html';
                }
            }
        });
    }
}
