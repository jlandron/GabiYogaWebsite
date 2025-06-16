/**
 * Admin Customer Dashboard JavaScript
 * 
 * This file handles the admin view of the customer dashboard using an iframe to embed
 * the actual customer dashboard. It ensures proper admin authentication and handles
 * communication between the parent admin page and the embedded dashboard.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in and is admin (from admin.js)
    if (!UserService.isLoggedIn() || !UserService.isAdmin()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Initialize the admin sidebar
    loadAdminSidebar();

    // Set up back button
    document.getElementById('back-to-members').addEventListener('click', function() {
        window.location.href = 'admin-members.html';
    });

    // Set up the dashboard iframe with admin token
    setupDashboardIframe();
});

/**
 * Setup the dashboard iframe with proper authentication and mock data
 */
function setupDashboardIframe() {
    try {
        const iframe = document.getElementById('customer-dashboard-frame');
        
        // Wait for the iframe to load
        iframe.onload = function() {
            // Get admin token
            const adminToken = TokenService.getToken();
            if (!adminToken) {
                showErrorMessage('No authentication token found. Please log in again.');
                return;
            }
            
            console.log('Dashboard iframe loaded. Preparing to pass authentication data.');
            
            // Get admin user info
            const adminInfo = UserService.getUser();
            
            // Create enhanced mock data for iframe
            const mockData = {
                type: 'AUTH_DATA',
                token: adminToken,
                user: adminInfo || {
                    id: '12345',
                    firstName: 'Admin',
                    lastName: 'User',
                    email: 'admin@example.com',
                    role: 'admin'
                },
                isAdminView: true,
                mockMode: true,
                mockData: {
                    bookings: [
                        {
                            booking_id: 'mock-1',
                            class_name: 'Vinyasa Flow',
                            date: '2025-06-20',
                            start_time: '09:00',
                            duration: 75,
                            instructor: 'Gabriella'
                        },
                        {
                            booking_id: 'mock-2',
                            class_name: 'Gentle Hatha',
                            date: '2025-06-22',
                            start_time: '10:30',
                            duration: 60,
                            instructor: 'Michael'
                        }
                    ],
                    memberships: [
                        {
                            membership_id: 'mem-1',
                            membership_type: 'Monthly Unlimited',
                            start_date: '2025-05-01',
                            end_date: '2025-07-01',
                            price: 120,
                            auto_renew: true
                        }
                    ],
                    payments: [
                        {
                            payment_id: 'pay-1',
                            amount: 120.00,
                            payment_date: '2025-05-01',
                            payment_method: 'Credit Card',
                            description: 'Monthly Membership Renewal'
                        },
                        {
                            payment_id: 'pay-2',
                            amount: 45.00,
                            payment_date: '2025-04-15',
                            payment_method: 'Credit Card',
                            description: 'Workshop Registration'
                        }
                    ]
                }
            };
            
            // Send message to iframe
            setTimeout(() => {
                iframe.contentWindow.postMessage(mockData, '*');
                console.log('Mock data sent to iframe');
            }, 500);
            
            // Add custom styling to iframe contents
            setTimeout(() => {
                addAdminIndicatorStyles(iframe);
            }, 1000);
        };
        
        // Setup message listener for communication from the iframe
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type) {
                handleIframeMessage(event.data);
            }
        });
        
    } catch (error) {
        console.error('Error setting up dashboard iframe:', error);
        showErrorMessage('Error setting up dashboard preview. Please try again.');
    }
}

/**
 * Handle messages from the dashboard iframe
 */
function handleIframeMessage(message) {
    switch (message.type) {
        case 'IFRAME_READY':
            console.log('Dashboard iframe is ready for authentication');
            // We can resend auth data if needed here
            break;
            
        case 'IFRAME_AUTH_SUCCESS':
            console.log('Dashboard iframe authenticated successfully');
            break;
            
        case 'IFRAME_AUTH_ERROR':
            console.error('Dashboard iframe authentication error:', message.error);
            showErrorMessage('Error authenticating dashboard: ' + message.error);
            break;
            
        case 'IFRAME_ACTION':
            console.log('Dashboard action performed:', message.action);
            // Handle any specific actions if needed
            break;
            
        default:
            console.log('Unknown message from dashboard iframe:', message);
    }
}

/**
 * Add custom styles to indicate admin view in the iframe
 * and handle errors gracefully
 */
function addAdminIndicatorStyles(iframe) {
    try {
        // Wait for iframe content to be fully loaded
        setTimeout(() => {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                
                // Create a style element
                const style = iframeDoc.createElement('style');
                style.textContent = `
                    body::before {
                        content: 'ADMIN VIEW';
                        position: fixed;
                        top: 10px;
                        right: 10px;
                        background: rgba(255, 0, 0, 0.1);
                        color: #d32f2f;
                        padding: 5px 10px;
                        font-size: 12px;
                        font-weight: bold;
                        border-radius: 4px;
                        border: 1px solid #d32f2f;
                        z-index: 9999;
                        pointer-events: none;
                    }
                    
                    /* Hide error messages */
                    .error-message {
                        display: none !important;
                    }
                    
                    /* Style welcome message */
                    .welcome-message h2 {
                        color: #7e57c2;
                    }
                    
                    .welcome-message p {
                        font-weight: bold;
                    }
                    
                    /* Disable interactive elements */
                    form button[type="submit"],
                    .btn:not(.view-only),
                    .btn-small:not(.view-only) {
                        position: relative;
                        pointer-events: none;
                    }
                    
                    form button[type="submit"]::after,
                    .btn:not(.view-only)::after,
                    .btn-small:not(.view-only)::after {
                        content: 'Disabled in Admin View';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: rgba(0, 0, 0, 0.7);
                        color: white;
                        font-size: 12px;
                        opacity: 0.8;
                    }
                    
                    /* Show mock data notice */
                    .dashboard-content::before {
                        content: 'Sample data shown for preview purposes';
                        display: block;
                        background-color: #e8f5e9;
                        color: #2e7d32;
                        padding: 8px 15px;
                        margin-bottom: 20px;
                        border-radius: 4px;
                        font-size: 14px;
                        text-align: center;
                    }
                `;
                
                // Append style to iframe head
                iframeDoc.head.appendChild(style);
                
                // Update welcome message
                const welcomeMessage = iframeDoc.querySelector('.welcome-message h2');
                if (welcomeMessage) {
                    welcomeMessage.textContent = 'Welcome, Admin User!';
                }
                
                const welcomeMessageDesc = iframeDoc.querySelector('.welcome-message p');
                if (welcomeMessageDesc) {
                    welcomeMessageDesc.textContent = 'Admin Preview: Member Dashboard View';
                }
                
                // Add class to body for additional styling
                iframeDoc.body.classList.add('admin-preview-mode');
                
            } catch (innerError) {
                console.error('Error accessing iframe content:', innerError);
            }
        }, 1500); // Increased time to ensure iframe is fully loaded
    } catch (error) {
        console.error('Error adding admin indicator styles:', error);
    }
}

/**
 * Show error message
 */
function showErrorMessage(message) {
    const adminContent = document.querySelector('.admin-content');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'admin-error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    // Insert at the top of admin content
    adminContent.insertBefore(errorDiv, adminContent.firstChild);
    
    // Remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}
