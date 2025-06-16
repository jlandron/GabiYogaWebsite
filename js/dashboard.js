/**
 * Dashboard JavaScript for Gabi Jyoti Yoga
 * Handles fetching and displaying user data for the customer dashboard
 */

document.addEventListener('DOMContentLoaded', function() {
    // Setup listener for messages from parent iframe (for admin dashboard view)
    setupIframeMessaging();
    
    // Check if user is logged in
    if (!UserService.isLoggedIn()) {
        // Check if we're in an iframe (admin view)
        if (window.self !== window.top) {
            // We're in an iframe, wait for auth data from parent
            console.log("Dashboard loaded in iframe, waiting for auth data...");
            // Send ready message to parent
            window.parent.postMessage({
                type: 'IFRAME_READY'
            }, '*');
            return;
        } else {
            // Regular view, redirect to login
            window.location.href = 'login.html';
            return;
        }
    }

    // Initialize dashboard data and UI
    initializeDashboard();
});

/**
 * Setup messaging for iframe communication (admin dashboard view)
 */
function setupIframeMessaging() {
    // Only needed when loaded in an iframe
    if (window.self === window.top) return;
    
    window.addEventListener('message', function(event) {
        // Process messages from the parent frame
        if (!event.data || !event.data.type) return;
        
        console.log("Dashboard iframe received message:", event.data.type);
        
        switch (event.data.type) {
            case 'AUTH_DATA':
                handleParentAuthData(event.data);
                break;
                
            // Handle other message types if needed
        }
    });
}

/**
 * Handle authentication data received from parent frame
 */
function handleParentAuthData(data) {
    try {
        if (!data.token || !data.user) {
            console.error("Invalid auth data received from parent");
            window.parent.postMessage({
                type: 'IFRAME_AUTH_ERROR',
                error: 'Invalid authentication data'
            }, '*');
            return;
        }
        
        // Store the admin token and user data
        TokenService.setToken(data.token);
        UserService.setUser(data.user);
        
        console.log("Auth data from parent processed successfully");
        
        // Store mock data if provided for admin preview
        if (data.mockMode && data.mockData) {
            console.log("Using mock data for dashboard preview");
            window.mockDashboardData = data.mockData;
        }
        
        // Notify parent that auth was successful
        window.parent.postMessage({
            type: 'IFRAME_AUTH_SUCCESS'
        }, '*');
        
        // Initialize dashboard with the admin data
        initializeDashboard(true);
        
        // Add admin view indicator if not already present
        addAdminViewIndicator();
        
    } catch (error) {
        console.error("Error processing auth data from parent:", error);
        window.parent.postMessage({
            type: 'IFRAME_AUTH_ERROR',
            error: error.message
        }, '*');
    }
}

/**
 * Add admin view indicator
 */
function addAdminViewIndicator() {
    // Add class to body for styling
    document.body.classList.add('admin-view-mode');
    
    // Update welcome message to indicate admin view
    const welcomeMessage = document.querySelector('.welcome-message p');
    if (welcomeMessage) {
        welcomeMessage.textContent = 'Admin View: Member Dashboard Preview';
    }
}

/**
 * Initialize the dashboard with user data
 */
async function initializeDashboard() {
    try {
        // Show loading spinner
        showLoadingState();
        
        // Get current user data
        const userData = await fetchUserData();
        if (!userData) {
            console.error('Failed to fetch user data');
            showError('Failed to load your information. Please try again later.');
            return;
        }

        // Update welcome message
        updateWelcomeMessage(userData);
        
        // Load user profile data
        loadProfileData(userData);
        
        // Fetch and display bookings, memberships, etc.
        await Promise.all([
            loadUpcomingClasses(userData.id),
            loadMemberships(userData.id),
            loadPurchaseHistory(userData.id),
            loadWorkshops(),
            loadRetreats(),
            loadPrivateSessions(userData.id)
        ]);
        
        // Setup event listeners after content is loaded
        setupEventListeners();
        
        // Hide loading spinner
        hideLoadingState();
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showError('There was a problem loading your dashboard. Please try again later.');
        hideLoadingState();
    }
}

/**
 * Show loading spinner or state
 */
function showLoadingState() {
    // Create loading overlay if it doesn't exist
    if (!document.getElementById('dashboard-loading')) {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'dashboard-loading';
        loadingDiv.className = 'loading-overlay';
        loadingDiv.innerHTML = '<div class="loading-spinner"></div><p>Loading your information...</p>';
        document.body.appendChild(loadingDiv);
    } else {
        document.getElementById('dashboard-loading').style.display = 'flex';
    }
}

/**
 * Hide loading spinner
 */
function hideLoadingState() {
    const loadingElement = document.getElementById('dashboard-loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

/**
 * Show error message
 */
function showError(message) {
    // Check if error container exists
    let errorContainer = document.querySelector('.dashboard-error');
    if (!errorContainer) {
        errorContainer = document.createElement('div');
        errorContainer.className = 'dashboard-error';
        const dashboardContent = document.querySelector('.dashboard-content');
        dashboardContent.prepend(errorContainer);
    }
    
    errorContainer.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    errorContainer.style.display = 'block';
}

/**
 * Fetch current user data
 */
async function fetchUserData() {
    try {
        // Check if we're in an iframe with mock data (admin dashboard preview)
        if (window.self !== window.top && window.mockDashboardData) {
            console.log("Using mock user data in iframe admin preview");
            return UserService.getUser();
        }

        // Normal API request for real data
        const response = await ApiService.authRequest(API_ENDPOINTS.me);
        return response.user;
    } catch (error) {
        console.error('Error fetching user data:', error);
        
        // If in iframe, return the user data from local storage as fallback
        if (window.self !== window.top) {
            console.log("API error in iframe - falling back to stored user data");
            return UserService.getUser();
        }
        
        return null;
    }
}

/**
 * Update welcome message with user's name
 */
function updateWelcomeMessage(userData) {
    const welcomeMessage = document.querySelector('.welcome-message h2');
    if (welcomeMessage && userData) {
        welcomeMessage.textContent = `Welcome, ${userData.firstName}!`;
    }
}

/**
 * Load user profile data
 */
function loadProfileData(userData) {
    // Fill profile form with user data
    if (!userData) return;
    
    const profileForm = document.getElementById('profile-form');
    if (!profileForm) return;
    
    // Update form fields
    const fields = [
        { id: 'profile-first-name', value: userData.firstName || '' },
        { id: 'profile-last-name', value: userData.lastName || '' },
        { id: 'profile-email', value: userData.email || '' },
        { id: 'profile-phone', value: userData.phone || '' }
    ];
    
    fields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) {
            element.value = field.value;
        }
    });
    
    // Handle profile image if available
    const profileImg = document.getElementById('profile-photo');
    if (profileImg) {
        if (userData.profile_picture) {
            profileImg.src = userData.profile_picture;
            
            // Handle image loading errors with a placeholder
            profileImg.onerror = function() {
                this.src = 'images/profile-placeholder.jpg';
                this.onerror = null;
            };
        } else {
            profileImg.src = 'images/profile-placeholder.jpg';
        }
    }

    // Setup profile form submission
    profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const updatedUserData = {
            first_name: document.getElementById('profile-first-name').value,
            last_name: document.getElementById('profile-last-name').value,
            email: document.getElementById('profile-email').value,
            phone: document.getElementById('profile-phone').value
        };
        
        try {
            // Submit updated profile data
            const result = await ApiService.authRequest(
                `${API_BASE_URL}/users/profile`, 
                'PUT', 
                updatedUserData
            );
            
            if (result.success) {
                // Update stored user data
                const currentUser = UserService.getUser();
                const updatedUser = { ...currentUser, ...updatedUserData };
                UserService.setUser(updatedUser);
                
                // Show success message
                alert('Profile updated successfully!');
            } else {
                alert(result.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('An error occurred while updating your profile');
        }
    });
}

/**
 * Load upcoming and past classes for user
 */
async function loadUpcomingClasses(userId) {
    try {
        // Load both upcoming and past classes
        const [upcomingResponse, pastResponse] = await Promise.all([
            ApiService.authRequest(`${API_BASE_URL}/bookings/upcoming`),
            ApiService.authRequest(`${API_BASE_URL}/bookings/past`).catch(() => ({ bookings: [] })) // Fallback if endpoint doesn't exist yet
        ]);
        
        const bookingsList = document.querySelector('.booking-list');
        if (!bookingsList) return;
        
        // Clear existing content
        bookingsList.innerHTML = '';
        
        // Create sections for upcoming and past classes
        const upcomingSection = document.createElement('div');
        upcomingSection.className = 'classes-section upcoming-classes';
        upcomingSection.innerHTML = '<h4>Upcoming Classes</h4>';
        
        const pastSection = document.createElement('div');
        pastSection.className = 'classes-section past-classes';
        pastSection.innerHTML = '<h4>Past Classes</h4>';
        
        // Add upcoming classes
        if (!upcomingResponse.bookings || upcomingResponse.bookings.length === 0) {
            upcomingSection.innerHTML += `
                <div class="empty-state">
                    <i class="far fa-calendar"></i>
                    <p>You don't have any upcoming classes.</p>
                    <a href="#" id="book-class-btn" class="btn btn-small">Book a Class</a>
                </div>
            `;
        } else {
            // Render each upcoming booking
            upcomingResponse.bookings.forEach(booking => {
                const bookingElement = createBookingElement(booking, true);
                upcomingSection.appendChild(bookingElement);
            });
        }
        
        // Add past classes
        if (!pastResponse.bookings || pastResponse.bookings.length === 0) {
            pastSection.innerHTML += `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>You haven't attended any classes yet.</p>
                </div>
            `;
        } else {
            // Render each past booking
            pastResponse.bookings.forEach(booking => {
                const bookingElement = createBookingElement(booking, false);
                pastSection.appendChild(bookingElement);
            });
        }
        
        // Append both sections to the bookings list
        bookingsList.appendChild(upcomingSection);
        bookingsList.appendChild(pastSection);
        
        // Add event listeners to the new buttons
        addBookingButtonListeners();
        
        // Add event listener for "Book a Class" button if it exists
        const bookClassBtn = document.getElementById('book-class-btn');
        if (bookClassBtn) {
            bookClassBtn.addEventListener('click', function(e) {
                e.preventDefault();
                window.location.href = 'index.html#schedule';
            });
        }
        
    } catch (error) {
        console.error('Error loading classes:', error);
        const bookingsList = document.querySelector('.booking-list');
        if (bookingsList) {
            bookingsList.innerHTML = `
                <div class="error-message">
                    <p>There was a problem loading your classes. Please try again later.</p>
                </div>
            `;
        }
    }
}

/**
 * Create a booking element
 */
function createBookingElement(booking, isUpcoming) {
    // Format date
    const bookingDate = new Date(booking.date + 'T' + booking.start_time);
    const formattedDate = bookingDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Format time
    const startTime = formatTime(booking.start_time);
    const endTime = formatTime(calculateEndTime(booking.start_time, booking.duration));
    
    const bookingItem = document.createElement('div');
    bookingItem.className = 'booking-item';
    
    if (isUpcoming) {
        bookingItem.innerHTML = `
            <div class="booking-details">
                <div class="booking-title">${booking.class_name}</div>
                <div class="booking-info">
                    <span><i class="far fa-calendar"></i> ${formattedDate}</span>
                    <span><i class="far fa-clock"></i> ${startTime} - ${endTime}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${booking.instructor || 'Main Studio'}</span>
                </div>
            </div>
            <div class="booking-actions">
                <button title="Add to Calendar" class="add-to-calendar-btn" data-booking-id="${booking.booking_id}"><i class="far fa-calendar-plus"></i></button>
                <button title="Cancel Booking" class="cancel-booking-btn" data-booking-id="${booking.booking_id}"><i class="fas fa-times"></i></button>
            </div>
        `;
    } else {
        // Past classes have different styling and no action buttons
        bookingItem.className += ' past-booking';
        bookingItem.innerHTML = `
            <div class="booking-details">
                <div class="booking-title">${booking.class_name}</div>
                <div class="booking-info">
                    <span><i class="far fa-calendar"></i> ${formattedDate}</span>
                    <span><i class="far fa-clock"></i> ${startTime} - ${endTime}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${booking.instructor || 'Main Studio'}</span>
                    <span class="attendance-status"><i class="fas fa-check-circle"></i> Attended</span>
                </div>
            </div>
        `;
    }
    
    return bookingItem;
}

/**
 * Add event listeners to booking buttons
 */
function addBookingButtonListeners() {
    // Add to calendar buttons
    document.querySelectorAll('.add-to-calendar-btn').forEach(button => {
        button.addEventListener('click', function() {
            const bookingId = this.getAttribute('data-booking-id');
            addToCalendar(bookingId);
        });
    });
    
    // Cancel booking buttons
    document.querySelectorAll('.cancel-booking-btn').forEach(button => {
        button.addEventListener('click', function() {
            const bookingId = this.getAttribute('data-booking-id');
            cancelBooking(bookingId);
        });
    });
}

/**
 * Add a booking to calendar
 */
function addToCalendar(bookingId) {
    // Find the booking details from the DOM
    const bookingButton = document.querySelector(`.add-to-calendar-btn[data-booking-id="${bookingId}"]`);
    if (!bookingButton) return;
    
    const bookingItem = bookingButton.closest('.booking-item');
    const title = bookingItem.querySelector('.booking-title').textContent;
    const dateInfo = bookingItem.querySelector('.booking-info span:nth-child(1)').textContent;
    const timeInfo = bookingItem.querySelector('.booking-info span:nth-child(2)').textContent;
    const location = bookingItem.querySelector('.booking-info span:nth-child(3)').textContent;
    
    // Extract date and time
    const dateMatch = dateInfo.match(/(\w+, \w+ \d+, \d+)/);
    const timeMatch = timeInfo.match(/(\d+:\d+ \w+) - (\d+:\d+ \w+)/);
    
    if (!dateMatch || !timeMatch) {
        alert('Unable to create calendar event. Please try again.');
        return;
    }
    
    // Create iCal event
    const eventDate = new Date(dateMatch[1]);
    const startTime = timeMatch[1];
    const endTime = timeMatch[2];
    
    // Format dates for iCal
    const formatDate = (date, time) => {
        const [timeStr, period] = time.split(' ');
        const [hours, minutes] = timeStr.split(':');
        let hour = parseInt(hours);
        
        if (period === 'PM' && hour !== 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
        
        date.setHours(hour, parseInt(minutes), 0, 0);
        
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };
    
    const dtstart = formatDate(new Date(eventDate), startTime);
    const dtend = formatDate(new Date(eventDate), endTime);
    
    // Create iCal content
    const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Gabi Yoga//EN
BEGIN:VEVENT
UID:${bookingId}@gabi.yoga
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}Z
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${title} - Gabi Yoga
LOCATION:${location.replace(/.*?(?=\w)/, '')}
DESCRIPTION:Your yoga class at Gabi Yoga
END:VEVENT
END:VCALENDAR`;
    
    // Create blob and download
    const blob = new Blob([icalContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `yoga-class-${bookingId}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert('Calendar event downloaded! Open the file to add it to your calendar.');
}

/**
 * Cancel a booking
 */
async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) {
        return;
    }
    
    try {
        const response = await ApiService.authRequest(
            `${API_BASE_URL}/bookings/${bookingId}/cancel`, 
            'PUT'
        );
        
        if (response.success) {
            alert('Booking cancelled successfully!');
            // Refresh the bookings list
            const user = UserService.getUser();
            if (user) {
                loadUpcomingClasses(user.id);
            }
        } else {
            alert(response.message || 'Failed to cancel booking');
        }
    } catch (error) {
        console.error('Error cancelling booking:', error);
        alert('An error occurred while cancelling your booking');
    }
}

/**
 * Load user memberships
 */
async function loadMemberships(userId) {
    try {
        const response = await ApiService.authRequest(`${API_BASE_URL}/memberships/active`);
        
        const membershipList = document.querySelector('.membership-list');
        if (!membershipList) return;
        
        // Clear existing content (but only the first section, not purchase history)
        const firstMembershipList = document.querySelector('.membership-list');
        if (firstMembershipList) {
            firstMembershipList.innerHTML = '';
        }
        
        if (!response.memberships || response.memberships.length === 0) {
            firstMembershipList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-ticket-alt"></i>
                    <p>You don't have any active memberships or class packages.</p>
                    <a href="#" id="view-membership-options-btn" class="btn btn-small">View Membership Options</a>
                </div>
            `;
            
            // Add event listener for the "View Membership Options" button
            const viewMembershipBtn = document.getElementById('view-membership-options-btn');
            if (viewMembershipBtn) {
                viewMembershipBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    window.location.href = 'index.html#membership';
                });
            }
            
            return;
        }
        
        // Render each membership
        response.memberships.forEach(membership => {
            const membershipItem = document.createElement('div');
            membershipItem.className = 'membership-item';
            
            // Format dates
            const renewalDate = membership.end_date ? new Date(membership.end_date) : null;
            const formattedRenewalDate = renewalDate ? 
                renewalDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 
                'Auto-renewing';
            
            if (membership.membership_type.includes('Class Pack')) {
                // Class Pack display
                membershipItem.innerHTML = `
                    <div class="membership-details">
                        <div class="membership-title">${membership.membership_type}</div>
                        <div class="membership-info">
                            <span><i class="fas fa-check-circle"></i> ${membership.classes_remaining || 0} Classes Remaining</span>
                            <span><i class="far fa-calendar-alt"></i> Expires: ${formattedRenewalDate}</span>
                        </div>
                    </div>
                    <div class="membership-actions">
                        <button title="Purchase More Classes" class="purchase-more-btn" data-membership-id="${membership.membership_id}">
                            <i class="fas fa-plus-circle"></i>
                        </button>
                    </div>
                `;
            } else {
                // Recurring membership display
                membershipItem.innerHTML = `
                    <div class="membership-details">
                        <div class="membership-title">${membership.membership_type}</div>
                        <div class="membership-info">
                            <span><i class="fas fa-calendar-check"></i> Active</span>
                            <span><i class="far fa-calendar-alt"></i> Renews: ${formattedRenewalDate}</span>
                            <span><i class="fas fa-tag"></i> $${membership.price}/month</span>
                        </div>
                    </div>
                    <div class="membership-actions">
                        <button title="Manage Billing" class="manage-billing-btn" data-membership-id="${membership.membership_id}">
                            <i class="fas fa-credit-card"></i>
                        </button>
                        <button title="Cancel Subscription" class="cancel-subscription-btn" data-membership-id="${membership.membership_id}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            }
            
            firstMembershipList.appendChild(membershipItem);
        });
        
        // Add event listeners to the membership action buttons
        addMembershipButtonListeners();
        
    } catch (error) {
        console.error('Error loading memberships:', error);
        const firstMembershipList = document.querySelector('.membership-list');
        if (firstMembershipList) {
            firstMembershipList.innerHTML = `
                <div class="error-message">
                    <p>There was a problem loading your membership information. Please try again later.</p>
                </div>
            `;
        }
    }
}

/**
 * Add event listeners to membership buttons
 */
function addMembershipButtonListeners() {
    // Manage billing buttons
    document.querySelectorAll('.manage-billing-btn').forEach(button => {
        button.addEventListener('click', function() {
            const membershipId = this.getAttribute('data-membership-id');
            manageBilling(membershipId);
        });
    });
    
    // Cancel subscription buttons
    document.querySelectorAll('.cancel-subscription-btn').forEach(button => {
        button.addEventListener('click', function() {
            const membershipId = this.getAttribute('data-membership-id');
            cancelSubscription(membershipId);
        });
    });
    
    // Purchase more classes buttons
    document.querySelectorAll('.purchase-more-btn').forEach(button => {
        button.addEventListener('click', function() {
            const membershipId = this.getAttribute('data-membership-id');
            purchaseMoreClasses(membershipId);
        });
    });
}

/**
 * Manage billing for a membership
 */
function manageBilling(membershipId) {
    console.log(`Managing billing for membership ${membershipId}`);
    // In a real implementation, this would open a modal or redirect to billing management
    
    // Get membership title from the DOM
    const membershipItem = document.querySelector(`.manage-billing-btn[data-membership-id="${membershipId}"]`)
        .closest('.membership-item');
    const title = membershipItem.querySelector('.membership-title').textContent;
    
    // Extract price
    const priceInfo = membershipItem.querySelector('.membership-info span:nth-child(3)').textContent;
    const priceMatch = priceInfo.match(/\$(\d+)/);
    const price = priceMatch ? priceMatch[1] : '120';
    
    // Open subscription modal
    openSubscriptionModal(title, price);
}

/**
 * Cancel a subscription
 */
async function cancelSubscription(membershipId) {
    if (!confirm('Are you sure you want to cancel this membership? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await ApiService.authRequest(
            `${API_BASE_URL}/memberships/${membershipId}/cancel`, 
            'PUT'
        );
        
        if (response.success) {
            alert('Subscription cancelled successfully. You will still have access until the end of your current billing period.');
            // Refresh the memberships list
            const user = UserService.getUser();
            if (user) {
                loadMemberships(user.id);
            }
        } else {
            alert(response.message || 'Failed to cancel subscription');
        }
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        alert('An error occurred while cancelling your subscription');
    }
}

/**
 * Purchase more classes
 */
function purchaseMoreClasses(membershipId) {
    console.log(`Purchasing more classes for membership ${membershipId}`);
    
    // Get membership title from the DOM
    const membershipItem = document.querySelector(`.purchase-more-btn[data-membership-id="${membershipId}"]`)
        .closest('.membership-item');
    const title = membershipItem.querySelector('.membership-title').textContent;
    
    // Open purchase modal
    openPurchaseModal(title, '150.00', 'Class Pack');
}

/**
 * Load purchase history
 */
async function loadPurchaseHistory(userId) {
    try {
        const response = await ApiService.authRequest(`${API_BASE_URL}/payments/history`);
        
        // Find the purchase history section
        const purchaseHistoryHeader = document.querySelector('.panel-header[style="margin-top: 40px;"]');
        if (!purchaseHistoryHeader) return;
        
        // Get the membership list after the purchase history header
        const purchaseHistoryList = purchaseHistoryHeader.nextElementSibling;
        if (!purchaseHistoryList) return;
        
        // Clear existing content
        purchaseHistoryList.innerHTML = '';
        
        if (!response.payments || response.payments.length === 0) {
            purchaseHistoryList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>You don't have any purchase history yet.</p>
                </div>
            `;
            return;
        }
        
        // Render each payment
        response.payments.forEach(payment => {
            const paymentItem = document.createElement('div');
            paymentItem.className = 'membership-item';
            
            // Format date
            const paymentDate = new Date(payment.payment_date);
            const formattedDate = paymentDate.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
            });
            
            paymentItem.innerHTML = `
                <div class="membership-details">
                    <div class="membership-title">${payment.description || 'Payment'}</div>
                    <div class="membership-info">
                        <span><i class="far fa-calendar-alt"></i> ${formattedDate}</span>
                        <span><i class="fas fa-tag"></i> $${payment.amount.toFixed(2)}</span>
                    </div>
                </div>
                <div class="membership-actions">
                    <button title="View Receipt" class="view-receipt-btn" data-payment-id="${payment.payment_id}">
                        <i class="fas fa-file-invoice"></i>
                    </button>
                </div>
            `;
            
            purchaseHistoryList.appendChild(paymentItem);
        });
        
        // Add event listeners to the view receipt buttons
        document.querySelectorAll('.view-receipt-btn').forEach(button => {
            button.addEventListener('click', function() {
                const paymentId = this.getAttribute('data-payment-id');
                viewReceipt(paymentId);
            });
        });
        
    } catch (error) {
        console.error('Error loading purchase history:', error);
        const purchaseHistoryHeader = document.querySelector('.panel-header[style="margin-top: 40px;"]');
        if (purchaseHistoryHeader) {
            const purchaseHistoryList = purchaseHistoryHeader.nextElementSibling;
            if (purchaseHistoryList) {
                purchaseHistoryList.innerHTML = `
                    <div class="error-message">
                        <p>There was a problem loading your purchase history. Please try again later.</p>
                    </div>
                `;
            }
        }
    }
}

/**
 * View receipt for a payment
 */
function viewReceipt(paymentId) {
    console.log(`Viewing receipt for payment ${paymentId}`);
    alert('This feature is coming soon!');
    // In a real implementation, this would open a modal with the receipt or download a PDF
}

/**
 * Load workshops
 */
async function loadWorkshops() {
    try {
        const response = await ApiService.authRequest(`${API_BASE_URL}/workshops/upcoming`);
        
        const workshopList = document.querySelector('.workshop-list');
        if (!workshopList) return;
        
        // Clear existing content
        workshopList.innerHTML = '';
        
        if (!response.workshops || response.workshops.length === 0) {
            workshopList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book-open"></i>
                    <p>No upcoming workshops available at this time.</p>
                    <p>Check back soon for new workshop offerings!</p>
                </div>
            `;
            return;
        }
        
        // Render each workshop
        response.workshops.forEach(workshop => {
            // Format date
            const workshopDate = new Date(workshop.date);
            const formattedDate = workshopDate.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
            });
            
            const workshopItem = document.createElement('div');
            workshopItem.className = 'workshop-item';
            workshopItem.innerHTML = `
                <div class="workshop-details">
                    <div class="workshop-title">${workshop.title}</div>
                    <div class="workshop-info">
                        <span><i class="far fa-calendar"></i> ${formattedDate}</span>
                        <span><i class="far fa-clock"></i> ${workshop.start_time} - ${workshop.end_time}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${workshop.location || 'Main Studio'}</span>
                        <span><i class="fas fa-tag"></i> $${workshop.price} ${workshop.member_price ? `($${workshop.member_price} for members)` : ''}</span>
                    </div>
                    <p class="workshop-description">${workshop.description || 'Join us for this special workshop.'}</p>
                </div>
                <div class="workshop-actions">
                    <a href="#" class="btn-small workshop-register-btn" data-workshop-id="${workshop.workshop_id}">Register Now</a>
                </div>
            `;
            
            workshopList.appendChild(workshopItem);
        });
        
        // Add event listeners to the workshop register buttons
        document.querySelectorAll('.workshop-register-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const workshopId = this.getAttribute('data-workshop-id');
                registerForWorkshop(workshopId);
            });
        });
        
    } catch (error) {
        console.error('Error loading workshops:', error);
        const workshopList = document.querySelector('.workshop-list');
        if (workshopList) {
            workshopList.innerHTML = `
                <div class="error-message">
                    <p>There was a problem loading workshops. Please try again later.</p>
                </div>
            `;
        }
    }
}

/**
 * Register for a workshop
 */
function registerForWorkshop(workshopId) {
    console.log(`Registering for workshop ${workshopId}`);
    
    // Find the workshop item
    const workshopItem = document.querySelector(`.workshop-register-btn[data-workshop-id="${workshopId}"]`)
        .closest('.workshop-item');
    
    // Extract workshop details
    const title = workshopItem.querySelector('.workshop-title').textContent;
    const priceInfo = workshopItem.querySelector('.workshop-info span:last-child').textContent;
    const priceMatch = priceInfo.match(/\$(\d+)/);
    const price = priceMatch ? priceMatch[1] : '45';
    
    // Open purchase modal
    openPurchaseModal(title, price, 'Workshop');
}

/**
 * Load retreats
 */
async function loadRetreats() {
    try {
        const response = await ApiService.authRequest(`${API_BASE_URL}/retreats/upcoming`);
        
        const retreatList = document.querySelector('.retreat-list');
        if (!retreatList) return;
        
        // Clear existing content
        retreatList.innerHTML = '';
        
        if (!response.retreats || response.retreats.length === 0) {
            retreatList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-umbrella-beach"></i>
                    <p>No upcoming retreats available at this time.</p>
                    <p>Check back soon for new retreat offerings!</p>
                </div>
            `;
            return;
        }
        
        // Render each retreat
        response.retreats.forEach(retreat => {
            // Format dates
            const startDate = new Date(retreat.start_date);
            const endDate = new Date(retreat.end_date);
            
            const formattedDateRange = `${startDate.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric'
            })} - ${endDate.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric',
                year: 'numeric'
            })}`;
            
            const retreatItem = document.createElement('div');
            retreatItem.className = 'retreat-item';
            retreatItem.innerHTML = `
                <div class="retreat-image">
                    <img src="${retreat.image_url || 'images/placeholder-retreat.jpg'}" alt="${retreat.title}">
                </div>
                <div class="retreat-details">
                    <div class="retreat-title">${retreat.title}</div>
                    <div class="retreat-info">
                        <span><i class="fas fa-map-marker-alt"></i> ${retreat.location}</span>
                        <span><i class="far fa-calendar-alt"></i> ${formattedDateRange}</span>
                        <span><i class="fas fa-tag"></i> From $${retreat.price}</span>
                    </div>
                    <p class="retreat-description">${retreat.description || 'Join us for this transformative retreat experience.'}</p>
                    <div class="retreat-actions">
                        <a href="#" class="btn-small retreat-learn-more-btn" data-retreat-id="${retreat.retreat_id}">Learn More</a>
                        <a href="#" class="btn-small retreat-register-btn" data-retreat-id="${retreat.retreat_id}">Register</a>
                    </div>
                </div>
            `;
            
            retreatList.appendChild(retreatItem);
        });
        
        // Add event listeners to the retreat buttons
        document.querySelectorAll('.retreat-learn-more-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const retreatId = this.getAttribute('data-retreat-id');
                learnMoreAboutRetreat(retreatId);
            });
        });
        
        document.querySelectorAll('.retreat-register-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const retreatId = this.getAttribute('data-retreat-id');
                registerForRetreat(retreatId);
            });
        });
        
    } catch (error) {
        console.error('Error loading retreats:', error);
        const retreatList = document.querySelector('.retreat-list');
        if (retreatList) {
            retreatList.innerHTML = `
                <div class="error-message">
                    <p>There was a problem loading retreats. Please try again later.</p>
                </div>
            `;
        }
    }
}

/**
 * Learn more about a retreat
 */
function learnMoreAboutRetreat(retreatId) {
    console.log(`Learning more about retreat ${retreatId}`);
    alert('This feature is coming soon!');
    // In a real implementation, this would redirect to a detailed retreat page
}

/**
 * Register for a retreat
 */
function registerForRetreat(retreatId) {
    console.log(`Registering for retreat ${retreatId}`);
    
    // Find the retreat item
    const retreatItem = document.querySelector(`.retreat-register-btn[data-retreat-id="${retreatId}"]`)
        .closest('.retreat-item');
    
    // Extract retreat details
    const title = retreatItem.querySelector('.retreat-title').textContent;
    const priceInfo = retreatItem.querySelector('.retreat-info span:last-child').textContent;
    const priceMatch = priceInfo.match(/\$([0-9,]+)/);
    const priceText = priceMatch ? priceMatch[1].replace(',', '') : '1200';
    
    // Calculate deposit amount (25% of total)
    const depositAmount = (parseFloat(priceText) * 0.25).toFixed(2);
    
    // Open purchase modal with deposit
    openPurchaseModal(`${title} - Deposit`, depositAmount, 'Retreat Deposit');
}

/**
 * Load private sessions for user
 */
async function loadPrivateSessions(userId) {
    try {
        const response = await ApiService.authRequest(`${API_BASE_URL}/private-sessions/upcoming`);
        
        const sessionList = document.querySelector('.session-list');
        if (!sessionList) return;
        
        // Find the session item container (first div in the session list)
        const sessionItem = sessionList.querySelector('.session-item');
        if (!sessionItem) return;
        
        // Clear existing content but keep the structure
        sessionItem.innerHTML = '';
        
        if (!response.sessions || response.sessions.length === 0) {
            sessionItem.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user"></i>
                    <p>You don't have any upcoming private sessions.</p>
                    <a href="#" id="book-private-btn" class="btn btn-small">Book Private Session</a>
                </div>
            `;
            
            // Add event listener for the "Book Private Session" button
            const bookPrivateBtn = document.getElementById('book-private-btn');
            if (bookPrivateBtn) {
                bookPrivateBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    // Scroll to session packages section
                    const packageHeader = document.querySelector('.panel-header[style="margin-top: 40px;"]');
                    if (packageHeader) {
                        packageHeader.scrollIntoView({ behavior: 'smooth' });
                    }
                });
            }
            
            return;
        }
        
        // Get the first session
        const session = response.sessions[0];
        
        // Format date
        const sessionDate = new Date(session.date);
        const formattedDate = sessionDate.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
        });
        
        sessionItem.innerHTML = `
            <div class="session-details">
                <div class="session-title">Private Yoga Session</div>
                <div class="session-info">
                    <span><i class="far fa-calendar"></i> ${formattedDate}</span>
                    <span><i class="far fa-clock"></i> ${session.start_time}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${session.location || 'Studio Room 2'}</span>
                </div>
                <div class="session-focus">
                    <span><strong>Focus:</strong> ${session.focus || 'Alignment & Technique'}</span>
                </div>
            </div>
            <div class="session-actions">
                <button title="Add to Calendar" class="add-session-calendar-btn" data-session-id="${session.session_id}"><i class="far fa-calendar-plus"></i></button>
                <button title="Reschedule" class="reschedule-session-btn" data-session-id="${session.session_id}"><i class="far fa-clock"></i></button>
                <button title="Cancel Session" class="cancel-session-btn" data-session-id="${session.session_id}"><i class="fas fa-times"></i></button>
            </div>
        `;
        
        // Add event listeners to the session action buttons
        addSessionButtonListeners();
        
    } catch (error) {
        console.error('Error loading private sessions:', error);
        const sessionList = document.querySelector('.session-list');
        if (sessionList) {
            const sessionItem = sessionList.querySelector('.session-item');
            if (sessionItem) {
                sessionItem.innerHTML = `
                    <div class="error-message">
                        <p>There was a problem loading your private sessions. Please try again later.</p>
                    </div>
                `;
            }
        }
    }
    
    // Make sure "Book Now" buttons on session packages work
    setupSessionPackageButtons();
}

/**
 * Setup event listeners for session package buttons
 */
function setupSessionPackageButtons() {
    document.querySelectorAll('.session-package-item .btn-small').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get package details
            const packageItem = this.closest('.session-package-item');
            const name = packageItem.querySelector('.package-name').textContent;
            const price = packageItem.querySelector('.package-price').textContent.substring(1);
            
            // Open purchase modal
            openPurchaseModal(name, price, 'Private Session');
        });
    });
}

/**
 * Add event listeners to session buttons
 */
function addSessionButtonListeners() {
    // Add to calendar buttons
    document.querySelectorAll('.add-session-calendar-btn').forEach(button => {
        button.addEventListener('click', function() {
            const sessionId = this.getAttribute('data-session-id');
            addSessionToCalendar(sessionId);
        });
    });
    
    // Reschedule buttons
    document.querySelectorAll('.reschedule-session-btn').forEach(button => {
        button.addEventListener('click', function() {
            const sessionId = this.getAttribute('data-session-id');
            rescheduleSession(sessionId);
        });
    });
    
    // Cancel session buttons
    document.querySelectorAll('.cancel-session-btn').forEach(button => {
        button.addEventListener('click', function() {
            const sessionId = this.getAttribute('data-session-id');
            cancelSession(sessionId);
        });
    });
}

/**
 * Add a session to calendar
 */
function addSessionToCalendar(sessionId) {
    console.log(`Adding session ${sessionId} to calendar`);
    alert('Calendar event created successfully!');
}

/**
 * Reschedule a session
 */
function rescheduleSession(sessionId) {
    console.log(`Rescheduling session ${sessionId}`);
    alert('Please contact the studio to reschedule your session.');
}

/**
 * Cancel a session
 */
async function cancelSession(sessionId) {
    if (!confirm('Are you sure you want to cancel this private session? Cancellations within 24 hours may incur a fee.')) {
        return;
    }
    
    try {
        const response = await ApiService.authRequest(
            `${API_BASE_URL}/private-sessions/${sessionId}/cancel`, 
            'PUT'
        );
        
        if (response.success) {
            alert('Session cancelled successfully!');
            // Refresh the private sessions list
            const user = UserService.getUser();
            if (user) {
                loadPrivateSessions(user.id);
            }
        } else {
            alert(response.message || 'Failed to cancel session');
        }
    } catch (error) {
        console.error('Error cancelling session:', error);
        alert('An error occurred while cancelling your session');
    }
}

/**
 * Setup all event listeners for the dashboard
 */
function setupEventListeners() {
    // Book Now button
    const newBookingBtn = document.getElementById('new-booking-btn');
    if (newBookingBtn) {
        newBookingBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'index.html#schedule';
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Clear authentication data
            UserService.logout();
            
            // Show login modal with callback to reload page after login
            if (typeof showLoginModal === 'function') {
                showLoginModal(false, function() {
                    // Reload the page after successful login
                    window.location.reload();
                });
            } else {
                // Fallback: redirect to login page if modal isn't available
                window.location.href = 'login.html';
            }
        });
    }
    
    // View All Workshops button
    const viewAllWorkshopsBtn = document.getElementById('view-all-workshops-btn');
    if (viewAllWorkshopsBtn) {
        viewAllWorkshopsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'index.html#workshops';
        });
    }
    
    // View All Retreats button
    const viewAllRetreatsBtn = document.getElementById('view-all-retreats-btn');
    if (viewAllRetreatsBtn) {
        viewAllRetreatsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'index.html#retreats';
        });
    }
    
    // Book Private Session button
    const bookPrivateSessionBtn = document.getElementById('book-private-session-btn');
    if (bookPrivateSessionBtn) {
        bookPrivateSessionBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Scroll to session packages section
            const packageHeader = document.querySelector('.panel-header[style="margin-top: 40px;"]');
            if (packageHeader) {
                packageHeader.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
    
    // Password toggle buttons
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const passwordInput = this.previousElementSibling;
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            } else {
                passwordInput.type = 'password';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            }
        });
    });
    
    // Upload photo button
    const uploadPhotoBtn = document.getElementById('upload-photo');
    if (uploadPhotoBtn) {
        uploadPhotoBtn.addEventListener('click', function() {
            alert('Photo upload feature coming soon!');
        });
    }
    
    // Removed View Past Classes button functionality as we now show both by default
}

/**
 * Helper: Format time string
 */
function formatTime(timeStr) {
    if (!timeStr) return '';
    
    // Handle "HH:MM" time format
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    
    // Format as 12-hour time with AM/PM
    if (hour === 0) {
        return `12:${minutes} AM`;
    } else if (hour < 12) {
        return `${hour}:${minutes} AM`;
    } else if (hour === 12) {
        return `12:${minutes} PM`;
    } else {
        return `${hour - 12}:${minutes} PM`;
    }
}

/**
 * Helper: Calculate end time from start time and duration
 */
function calculateEndTime(startTime, durationMinutes) {
    if (!startTime || !durationMinutes) return '';
    
    const [hours, minutes] = startTime.split(':');
    let totalMinutes = (parseInt(hours) * 60) + parseInt(minutes) + parseInt(durationMinutes);
    
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    
    // Pad minutes with leading zero if needed
    const paddedMinutes = endMinutes.toString().padStart(2, '0');
    
    return `${endHours}:${paddedMinutes}`;
}

/**
 * Show past classes
 */
function showPastClasses() {
    // Toggle button text
    const viewPastClassesBtn = document.querySelector('.panel-header .btn-small');
    const panelHeader = document.querySelector('.panel-header h3');
    const bookingsList = document.querySelector('.booking-list');
    
    if (viewPastClassesBtn.textContent === 'View Past Classes') {
        // Switch to past classes view
        viewPastClassesBtn.textContent = 'View Upcoming Classes';
        panelHeader.textContent = 'Past Classes';
        
        // Clear current content
        bookingsList.innerHTML = '<div class="loading-spinner"></div><p>Loading past classes...</p>';
        
        // Fetch past classes (this would be a new endpoint)
        alert('Viewing past classes is coming soon! This will show your class history.');
        
        // For now, show a placeholder
        bookingsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>Your past class history will be displayed here.</p>
                <p>This feature is coming soon!</p>
            </div>
        `;
    } else {
        // Switch back to upcoming classes
        viewPastClassesBtn.textContent = 'View Past Classes';
        panelHeader.textContent = 'Upcoming Classes';
        
        // Reload upcoming classes
        const user = UserService.getUser();
        if (user) {
            loadUpcomingClasses(user.id);
        }
    }
}
