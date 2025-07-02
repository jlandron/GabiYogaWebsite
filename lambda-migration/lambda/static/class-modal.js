// Class modal state
let currentBookingClass = null;

// Add class detail modal to the page
function addClassModal() {
    if (document.getElementById('class-modal')) {
        // Modal already exists
        return;
    }
    
    const modalHTML = 
        '<div id="class-modal" class="class-modal">' +
            '<div class="class-modal-content">' +
                '<div class="class-modal-header">' +
                    '<button class="class-modal-close" onclick="closeClassModal()">&times;</button>' +
                    '<h2 class="class-modal-title" id="class-modal-title"></h2>' +
                    '<div id="class-modal-category"></div>' +
                '</div>' +
                '<div class="class-modal-body">' +
                    '<div class="class-modal-details" id="class-modal-details"></div>' +
                    '<div id="class-modal-description"></div>' +
                    '<div class="class-modal-availability" id="class-modal-availability"></div>' +
                    '<div class="class-modal-actions">' +
                        '<button class="class-modal-btn class-modal-btn-primary" id="class-modal-book-btn" onclick="bookClass()">' +
                            'Book This Class' +
                        '</button>' +
                        '<button class="class-modal-btn class-modal-btn-secondary" onclick="closeClassModal()">' +
                            'Close' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Open class detail modal
function openClassModal(classId) {
    // Find class by ID
    const classItem = allClasses.find(c => c.id === classId);
    if (!classItem) return;
    
    // Make sure modal exists
    if (!document.getElementById('class-modal')) {
        addClassModal();
    }
    
    // Populate modal content
    document.getElementById('class-modal-title').textContent = classItem.title;
    document.getElementById('class-modal-category').textContent = classItem.category || 'General';
    document.getElementById('class-modal-description').innerHTML = 
        '<p style="margin-top: 1rem; line-height: 1.6; color: #666;">' + 
            (classItem.description || 'No description available.') + 
        '</p>';
    
    // Class details
    const detailsHTML = 
        '<div class="class-modal-detail">' +
            '<span>📅</span>' +
            '<span>' + new Date(classItem.scheduleDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            }) + '</span>' +
        '</div>' +
        '<div class="class-modal-detail">' +
            '<span>🕐</span>' +
            '<span>' + classItem.startTime + (classItem.endTime ? ' - ' + classItem.endTime : '') + '</span>' +
        '</div>' +
        '<div class="class-modal-detail">' +
            '<span>⏱️</span>' +
            '<span>' + classItem.duration + ' minutes</span>' +
        '</div>' +
        '<div class="class-modal-detail">' +
            '<span>👩‍🏫</span>' +
            '<span>' + classItem.instructor + '</span>' +
        '</div>' +
        (classItem.location ? 
        '<div class="class-modal-detail">' +
            '<span>📍</span>' +
            '<span>' + classItem.location + '</span>' +
        '</div>' : '') +
        (classItem.level ? 
        '<div class="class-modal-detail">' +
            '<span>🎯</span>' +
            '<span>' + classItem.level + '</span>' +
        '</div>' : '') +
        (classItem.price ? 
        '<div class="class-modal-detail">' +
            '<span>💰</span>' +
            '<span>$' + classItem.price + '</span>' +
        '</div>' : '');
    
    document.getElementById('class-modal-details').innerHTML = detailsHTML;
    
    // Availability
    const availabilityEl = document.getElementById('class-modal-availability');
    const bookBtn = document.getElementById('class-modal-book-btn');
    
    if (classItem.isFullyBooked) {
        availabilityEl.className = 'class-modal-availability full';
        availabilityEl.innerHTML = 
            '<div class="class-modal-availability-text">Class is Full</div>' +
            '<div class="class-modal-spots">' + classItem.currentBookings + '/' + classItem.maxParticipants + ' spots taken</div>';
        bookBtn.textContent = 'Join Waitlist';
        bookBtn.disabled = false;
    } else {
        availabilityEl.className = 'class-modal-availability';
        availabilityEl.innerHTML = 
            '<div class="class-modal-availability-text">' + classItem.availableSpots + ' Spots Available</div>' +
            '<div class="class-modal-spots">' + classItem.currentBookings + '/' + classItem.maxParticipants + ' spots taken</div>';
        bookBtn.textContent = 'Book This Class';
        bookBtn.disabled = false;
    }
    
    // Store current class for booking
    currentBookingClass = classItem;
    
    // Show modal
    document.getElementById('class-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Close class detail modal
function closeClassModal() {
    document.getElementById('class-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
    currentBookingClass = null;
}

// Book a class
async function bookClass() {
    if (!currentBookingClass) return;
    
    const classItem = currentBookingClass;
    const action = classItem.isFullyBooked ? 'join waitlist for' : 'book';
    
    // Show booking in progress
    const bookBtn = document.getElementById('class-modal-book-btn');
    const originalText = bookBtn.textContent;
    bookBtn.textContent = 'Processing...';
    bookBtn.disabled = true;
    
    try {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        if (!token) {
            // Redirect to login page with return URL
            const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/dev/login.html?redirect=${currentPath}`;
            return;
        }
        
        // Make API call to book the class
        const response = await fetch(`/dev/classes/${classItem.id}/book`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to book class');
        }
        
        const result = await response.json();
        
        // Show success message
        let message;
        if (result.booking.status === 'waitlisted') {
            message = `You've been added to the waitlist for "${classItem.title}" on ${formatDate(classItem.scheduleDate)} at ${classItem.startTime}. Your position: #${result.booking.waitlistPosition}`;
        } else {
            message = `You've successfully booked "${classItem.title}" on ${formatDate(classItem.scheduleDate)} at ${classItem.startTime}. See you there!`;
        }
        
        alert(message);
        
        // Update UI
        closeClassModal();
        
        // Refresh the calendar if it exists
        if (typeof loadCalendarData === 'function') {
            loadCalendarData();
        }
        
        // Refresh bookings list if on user dashboard
        if (typeof loadUpcomingClasses === 'function') {
            loadUpcomingClasses();
        }
    } catch (error) {
        console.error('Error booking class:', error);
        alert(error.message || 'An error occurred while booking the class. Please try again.');
        
        // Reset button
        bookBtn.textContent = originalText;
        bookBtn.disabled = false;
    }
}

// Format date helper
function formatDate(dateString) {
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('class-modal');
    if (e.target === modal) {
        closeClassModal();
    }
});

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('class-modal');
        if (modal && modal.style.display === 'block') {
            closeClassModal();
        }
    }
});
