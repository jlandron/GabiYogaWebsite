// Class modal state
let currentBookingClass = null;
let isAdminMode = false; // Flag to determine if we're in admin mode


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

// Initialize admin class modal functionality - This is a separate function that gets called from admin pages
function initAdminClassModal() {
    isAdminMode = true;
    console.log('Admin class modal functionality initialized');
    
    // If we're in the admin interface, the modal is managed by schedule-editor.js
    // This function serves as a bridge between the two systems
    
    // Allow external scripts to use the formatDate function
    window.formatClassDate = formatDate;
    
    // Add event listeners for the admin modal
    document.addEventListener('DOMContentLoaded', () => {
        const modal = document.querySelector('.class-modal');
        if (modal) {
            // Setup tab navigation
            setupTabNavigation(modal);
            
            // Setup end time calculation
            setupEndTimeCalculation(modal);
        }
    });
}

// Setup tab navigation within the modal
function setupTabNavigation(modal) {
    const tabButtons = modal.querySelectorAll('.form-tabs .tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Update active tab
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show appropriate tab content
            modal.querySelectorAll('.tab-content').forEach(tab => {
                tab.style.display = 'none';
            });
            modal.querySelector(`#${targetTab}-tab`).style.display = 'block';
        });
    });
}

// Setup automatic end time calculation
function setupEndTimeCalculation(modal) {
    const timeInput = modal.querySelector('#class-time');
    const durationInput = modal.querySelector('#class-duration');
    const endTimeInput = modal.querySelector('#class-end-time');
    
    if (timeInput && durationInput && endTimeInput) {
        const calculateEndTime = () => {
            if (!timeInput.value) return;
            
            const [hours, minutes] = timeInput.value.split(':').map(Number);
            const duration = parseInt(durationInput.value) || 60;
            const endMinutes = hours * 60 + minutes + duration;
            const endHours = Math.floor(endMinutes / 60) % 24;
            const endMins = endMinutes % 60;
            
            endTimeInput.value = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
        };
        
        timeInput.addEventListener('change', calculateEndTime);
        durationInput.addEventListener('change', calculateEndTime);
        
        // Initial calculation
        calculateEndTime();
    }
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

// Parse list of items for requirements or what to bring
function parseListItems(text) {
    if (!text) return [];
    return text.split('\n')
        .map(item => item.trim())
        .filter(item => item.length > 0);
}

// Extract day of week from date
function extractDayOfWeek(dateString) {
    const date = new Date(dateString);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
}

// Calculate end time from start time and duration
function calculateEndTime(startTime, duration) {
    if (!startTime) return '';
    
    const [hours, minutes] = startTime.split(':').map(Number);
    const endMinutes = hours * 60 + minutes + (parseInt(duration) || 60);
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;
    
    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
}

// Global function to expose to admin scripts
if (typeof window !== 'undefined') {
    window.classModalHelpers = {
        formatDate,
        parseListItems,
        extractDayOfWeek,
        calculateEndTime
    };
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
