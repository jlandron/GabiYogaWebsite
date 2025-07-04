/**
 * Public Class Modal Functionality
 * Handles viewing and booking classes directly from the homepage
 */

// Global variables
let publicClassModal;
let currentClassId = null;

/**
 * Initialize the public class modal
 */
function initPublicClassModal() {
    console.log('Initializing public class modal');
    
    // Create modal if it doesn't exist
    if (!document.getElementById('public-class-modal')) {
        createPublicClassModal();
    }
    
    // Initialize modal instance
    publicClassModal = document.getElementById('public-class-modal');
}

// Get auth headers for API requests
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/dev';
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
 * Create the modal HTML structure and append to the document
 */
function createPublicClassModal() {
    const modal = document.createElement('div');
    modal.id = 'public-class-modal';
    modal.className = 'class-modal';
    
    modal.innerHTML = `
        <div class="class-modal-content">
            <div class="class-modal-header">
                <button class="class-modal-close" onclick="closePublicClassModal()">&times;</button>
                <h2 class="class-modal-title" id="public-class-modal-title"></h2>
                <div id="public-class-modal-category"></div>
            </div>
            <div class="class-modal-body">
                <div class="class-modal-details" id="public-class-modal-details"></div>
                <div id="public-class-modal-description"></div>
                <div class="class-modal-availability" id="public-class-modal-availability"></div>
                <div class="class-modal-status" id="public-class-modal-status" style="display:none;"></div>
                <div class="class-modal-actions">
                    <button class="class-modal-btn class-modal-btn-primary" id="public-class-modal-book-btn">
                        Book This Class
                    </button>
                    <button class="class-modal-btn class-modal-btn-secondary" onclick="closePublicClassModal()">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(modal);
}

/**
 * Show the class modal for viewing and booking a class
 * @param {string} classId - ID of the class to view
 */
async function openPublicClassModal(classId) {
    try {
        // Store current class ID
        currentClassId = classId;
        
        // Make sure modal exists
        if (!document.getElementById('public-class-modal')) {
            initPublicClassModal();
        }
        
        // Set loading state
        document.getElementById('public-class-modal-title').textContent = 'Loading...';
        document.getElementById('public-class-modal-details').innerHTML = '';
        document.getElementById('public-class-modal-description').innerHTML = '';
        document.getElementById('public-class-modal-availability').innerHTML = '';
        document.getElementById('public-class-modal-status').style.display = 'none';
        
        // Show modal
        publicClassModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Fetch class details from API, don't use generic header method as that redirects
        const headers = {};
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            headers['Content-Type'] = 'application/json',
            headers['Accept'] = 'application/json'
        }
        
        const response = await fetch(`/dev/classes/${classId}`, { headers });
        const data = await response.json();
        
        if (!data.success || !data.classItem) {
            throw new Error('Failed to load class details');
        }
        
        const classItem = data.classItem;
        
        // Populate modal content
        document.getElementById('public-class-modal-title').textContent = classItem.title;
        document.getElementById('public-class-modal-category').textContent = classItem.category || 'General';
        document.getElementById('public-class-modal-description').innerHTML = 
            `<p style="margin-top: 1rem; line-height: 1.6; color: #666;">
                ${classItem.description || 'No description available.'}
            </p>`;
        
        // Class details
        const detailsHTML = 
            `<div class="class-modal-detail">
                <span>📅</span>
                <span>${new Date(classItem.scheduleDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                })}</span>
            </div>
            <div class="class-modal-detail">
                <span>🕐</span>
                <span>${classItem.startTime}${classItem.endTime ? ' - ' + classItem.endTime : ''}</span>
            </div>
            <div class="class-modal-detail">
                <span>⏱️</span>
                <span>${classItem.duration} minutes</span>
            </div>
            <div class="class-modal-detail">
                <span>👩‍🏫</span>
                <span>${classItem.instructor || 'TBD'}</span>
            </div>
            ${classItem.location ? 
            `<div class="class-modal-detail">
                <span>📍</span>
                <span>${classItem.location}</span>
            </div>` : ''}
                ${classItem.level ? 
            `<div class="class-modal-detail">
                <span>🎯</span>
                <span>${classItem.level}</span>
            </div>` : ''}
            ${classItem.price ? 
            `<div class="class-modal-detail">
                <span>💰</span>
                <span>$${classItem.price}</span>
            </div>` : ''}`;
        
        // Add optional fields if they exist
        let additionalSectionsHTML = '';
        
        // Requirements section
        if (classItem.requirements && classItem.requirements.length > 0) {
            additionalSectionsHTML += `
                <div class="class-modal-section">
                    <h3>Requirements</h3>
                    <ul class="class-modal-list">
                        ${classItem.requirements.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>`;
        }
        
        // What to Bring section
        if (classItem.whatToBring && classItem.whatToBring.length > 0) {
            additionalSectionsHTML += `
                <div class="class-modal-section">
                    <h3>What to Bring</h3>
                    <ul class="class-modal-list">
                        ${classItem.whatToBring.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>`;
        }
        
        // Cancellation Policy section
        if (classItem.cancellationPolicy) {
            additionalSectionsHTML += `
                <div class="class-modal-section">
                    <h3>Cancellation Policy</h3>
                    <p>${classItem.cancellationPolicy}</p>
                </div>`;
        }
        
        // Add additional sections after the description
        if (additionalSectionsHTML) {
            document.getElementById('public-class-modal-description').innerHTML += additionalSectionsHTML;
        }
        
        document.getElementById('public-class-modal-details').innerHTML = detailsHTML;
        
        // If there's a token, check the user's booking status
        const bookBtn = document.getElementById('public-class-modal-book-btn');
        const statusEl = document.getElementById('public-class-modal-status');
        const availabilityEl = document.getElementById('public-class-modal-availability');
        
        // By default, assume not booked or checking status
        let isBooked = false;
        let wasCanceled = false;
        let bookingId = null;
        
        // If user is logged in, check if they've booked this class
        if (token) {
            try {
                // Fetch user's bookings to check status
                const bookingsResponse = await fetch('/dev/bookings', {
                    headers: getAuthHeaders()
                });
                
                if (bookingsResponse.ok) {
                    const bookingsData = await bookingsResponse.json();
                    const bookings = bookingsData.bookings || [];
                    
                    // Check if user has a booking for this class
                    const existingBooking = bookings.find(b => b.classId === classId);
                    if (existingBooking) {
                        isBooked = existingBooking.status === 'confirmed' || 
                                  existingBooking.status === 'waitlisted';
                        wasCanceled = existingBooking.status === 'canceled';
                        bookingId = existingBooking.id;
                    }
                }
            } catch (error) {
                console.error('Error checking booking status:', error);
            }
        }
        
        // Update availability display
        if (classItem.isFullyBooked) {
            availabilityEl.className = 'class-modal-availability full';
            availabilityEl.innerHTML = 
                `<div class="class-modal-availability-text">Class is Full</div>
                 <div class="class-modal-spots">${classItem.currentBookings}/${classItem.maxParticipants} spots taken</div>`;
        } else {
            availabilityEl.className = 'class-modal-availability';
            availabilityEl.innerHTML = 
                `<div class="class-modal-availability-text">${classItem.availableSpots} Spots Available</div>
                 <div class="class-modal-spots">${classItem.currentBookings}/${classItem.maxParticipants} spots taken</div>`;
        }
        
        // Show booking status if user was canceled
        if (wasCanceled) {
            statusEl.style.display = 'block';
            statusEl.className = 'class-modal-availability canceled';
            statusEl.innerHTML = '<div class="class-modal-availability-text">You previously canceled this class</div>';
        } else {
            statusEl.style.display = 'none';
        }
        
        // Update booking button based on status
        if (isBooked) {
            bookBtn.textContent = 'Already Booked';
            bookBtn.disabled = true;
            bookBtn.classList.add('booked');
        } else if (wasCanceled && !classItem.isFullyBooked) {
            bookBtn.textContent = 'Book Again';
            bookBtn.disabled = false;
            bookBtn.onclick = () => handlePublicBooking(classId, token);
            bookBtn.classList.remove('booked');
        } else if (token) {
            // User is logged in but not booked
            if (classItem.isFullyBooked) {
                bookBtn.textContent = 'Join Waitlist';
            } else {
                bookBtn.textContent = 'Book This Class';
            }
            bookBtn.disabled = false;
            bookBtn.onclick = () => handlePublicBooking(classId, token);
            bookBtn.classList.remove('booked');
        } else {
            // User is not logged in
            bookBtn.textContent = 'Sign In to Book';
            bookBtn.disabled = false;
            bookBtn.onclick = () => {
                // Save the class ID to localStorage to redirect back after login
                localStorage.setItem('pendingBooking', classId);
                window.location.href = '/dev/user.html';
            };
            bookBtn.classList.remove('booked');
        }
        
    } catch (error) {
        console.error('Error opening class modal:', error);
        closePublicClassModal();
        alert('Failed to load class details. Please try again.');
    }
}

/**
 * Handle booking a class from the public modal
 * @param {string} classId - ID of the class to book
 * @param {string} token - Auth token
 */
async function handlePublicBooking(classId, token) {
    try {
        if (!token) {
            localStorage.setItem('pendingBooking', classId);
            window.location.href = '/dev/user.html';
            return;
        }
        
        // Update button state
        const bookBtn = document.getElementById('public-class-modal-book-btn');
        const originalText = bookBtn.textContent;
        bookBtn.textContent = 'Processing...';
        bookBtn.disabled = true;
        
        // Simplify booking logic - always use the book endpoint and let backend handle existing bookings
        try {
            // Create the booking - the backend will handle cases where a booking previously existed
            const response = await fetch(`/dev/classes/${classId}/book`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Booking failed');
            }
            
            const result = await response.json();
            
            // Show success message
            let message;
            if (result.booking.status === 'waitlisted') {
                message = `You've been added to the waitlist. Your position: #${result.booking.waitlistPosition}`;
            } else {
                message = 'Class booked successfully!';
            }
            
            // Update modal to show booked status
            closePublicClassModal();
            showNotification(message, 'success');
            
            // Refresh calendar if it exists
            if (window.renderCalendar) {
                window.renderCalendar();
            }
        } catch (error) {
            // Reset button state on error
            bookBtn.textContent = originalText;
            bookBtn.disabled = false;
            throw error;
        }
        
    } catch (error) {
        console.error('Error booking class:', error);
        const bookBtn = document.getElementById('public-class-modal-book-btn');
        bookBtn.textContent = 'Book This Class';
        bookBtn.disabled = false;
        showNotification('Booking failed: ' + error.message, 'error');
    }
}

/**
 * Close the public class modal
 */
function closePublicClassModal() {
    if (publicClassModal) {
        publicClassModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        currentClassId = null;
    }
}

/**
 * Show a notification message
 * @param {string} message - The notification message
 * @param {string} type - The notification type (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
    // Use existing notification system if available
    if (window.showToast) {
        window.showToast(message, type);
        return;
    }
    
    // Create notification element if it doesn't exist
    let notification = document.getElementById('class-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'class-notification';
        notification.className = 'notification';
        document.body.appendChild(notification);
        
        // Style the notification
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.padding = '12px 20px';
        notification.style.borderRadius = '4px';
        notification.style.color = 'white';
        notification.style.fontWeight = '500';
        notification.style.zIndex = '9999';
        notification.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        notification.style.transition = 'opacity 0.3s ease-in-out';
        notification.style.maxWidth = '300px';
    }
    
    // Set notification type styling
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#4caf50';
            break;
        case 'error':
            notification.style.backgroundColor = '#f44336';
            break;
        case 'warning':
            notification.style.backgroundColor = '#ff9800';
            break;
        case 'info':
        default:
            notification.style.backgroundColor = '#2196f3';
            break;
    }
    
    // Set message and show notification
    notification.textContent = message;
    notification.style.display = 'block';
    notification.style.opacity = '1';
    
    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300); // Wait for fade out animation to complete
    }, 3000);
}

/**
 * Check if there's a pending booking after login
 * This should be called when the page loads
 */
function checkPendingBooking() {
    const pendingBookingId = localStorage.getItem('pendingBooking');
    if (pendingBookingId) {
        // Clear the pending booking
        localStorage.removeItem('pendingBooking');
        
        // Open the booking modal
        setTimeout(() => {
            openPublicClassModal(pendingBookingId);
        }, 500); // Small delay to ensure everything is loaded
    }
}

// Export functions for external use
window.initPublicClassModal = initPublicClassModal;
window.openPublicClassModal = openPublicClassModal;
window.closePublicClassModal = closePublicClassModal;
window.checkPendingBooking = checkPendingBooking;
