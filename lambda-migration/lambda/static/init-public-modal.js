/**
 * Public Class Modal Initialization
 * This script initializes the public class modal on the homepage
 * and handles authentication-aware booking functionality.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize public class modal if it exists
    if (typeof window.initPublicClassModal === 'function') {
        window.initPublicClassModal({
            onBookingAttempt: handleBookingAttempt
        });
    } else {
        console.error('Public class modal initialization function not found');
    }
});

// Get auth headers for API requests
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/dev/index.html';
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


/**
 * Handle booking attempt based on authentication status
 * @param {string} classId - The ID of the class to book
 * @param {Object} classData - The class data object
 */
function handleBookingAttempt(classId, classData) {
    // Check if user is authenticated by looking for token
    const token = localStorage.getItem('token');
    
    if (token) {
        // User is authenticated - proceed with direct booking
        bookClass(classId, classData);
    } else {
        // User is not authenticated - show login prompt
        showLoginPrompt(classId);
    }
}

/**
 * Book a class directly from the homepage
 * @param {string} classId - The ID of the class to book
 * @param {Object} classData - The class data object
 */
function bookClass(classId, classData) {
    const token = localStorage.getItem('token');
    
    // Show booking in progress
    const bookingStatusEl = document.querySelector('#public-class-modal .modal-booking-status');
    if (bookingStatusEl) {
        bookingStatusEl.innerHTML = '<div class="booking-progress">Processing your booking...</div>';
        bookingStatusEl.style.display = 'block';
    }
    
    // Check if user previously canceled this booking
    fetch('/dev/bookings', {
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(data => {
        // Look for existing canceled booking for this class
        const existingBooking = data.bookings?.find(b => b.classId === classId && b.status === 'canceled');
        
        // Either update existing booking or create new one
        let endpoint, method;
        let bodyData = {};
        
        if (existingBooking) {
            // If there's a canceled booking, update it instead of creating a new one
            endpoint = `/dev/bookings/${existingBooking.id}`;
            method = 'PUT';
            bodyData = { status: 'confirmed' };
        } else {
            // Otherwise create a new booking
            endpoint = `/dev/classes/${classId}/book`;
            method = 'POST';
        }
        
        return fetch(endpoint, {
            method: method,
            headers: getAuthHeaders(),
            body: method === 'PUT' ? JSON.stringify(bodyData) : null
        });
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.message || 'Failed to book class');
            });
        }
        return response.json();
    })
    .then(result => {
        // Show success message
        if (bookingStatusEl) {
            const message = result.booking.status === 'waitlisted' 
                ? `<div class="booking-success waitlisted">You've been added to the waitlist. Position: #${result.booking.waitlistPosition}</div>`
                : '<div class="booking-success">Class booked successfully!</div>';
                
            bookingStatusEl.innerHTML = message;
            
            // Add view bookings button
            bookingStatusEl.innerHTML += '<div class="booking-action"><a href="/dev/user.html" class="btn view-bookings-btn">View My Bookings</a></div>';
            
            // Auto close after delay
            setTimeout(() => {
                const closeBtn = document.querySelector('#public-class-modal .modal-close');
                if (closeBtn) {
                    closeBtn.click();
                }
            }, 5000);
        }
    })
    .catch(error => {
        console.error('Error booking class:', error);
        if (bookingStatusEl) {
            bookingStatusEl.innerHTML = `<div class="booking-error">Failed to book class: ${error.message || 'Please try again.'}</div>`;
        }
    });
}

/**
 * Show login prompt when unauthenticated user tries to book
 * @param {string} classId - The ID of the class they tried to book
 */
function showLoginPrompt(classId) {
    const bookingStatusEl = document.querySelector('#public-class-modal .modal-booking-status');
    if (bookingStatusEl) {
        bookingStatusEl.innerHTML = `
            <div class="login-prompt">
                <p>Please log in to book this class</p>
                <button class="btn login-btn" onclick="showLoginForm()">Log In</button>
                <div class="login-help">Don't have an account? <a href="#" onclick="showSignupForm()">Sign Up</a></div>
            </div>
        `;
        bookingStatusEl.style.display = 'block';
        
        // Store the class ID to potentially book after login
        sessionStorage.setItem('pendingBookingClassId', classId);
    }
}

/**
 * Handle post-login booking if user was trying to book before login
 */
window.addEventListener('authSuccess', () => {
    const pendingClassId = sessionStorage.getItem('pendingBookingClassId');
    if (pendingClassId) {
        // Remove from storage to prevent duplicate booking
        sessionStorage.removeItem('pendingBookingClassId');
        
        // Check if modal is still open
        const modal = document.getElementById('public-class-modal');
        if (modal && modal.style.display === 'block') {
            // Get current class data
            const currentClassId = modal.getAttribute('data-class-id');
            
            // Only proceed if it's the same class they were trying to book
            if (currentClassId === pendingClassId) {
                // Get class data
                fetch(`/dev/classes/${currentClassId}`, {
                    headers: getAuthHeaders()
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.classItem) {
                        bookClass(currentClassId, data.classItem);
                    }
                });
            }
        }
    }
});
