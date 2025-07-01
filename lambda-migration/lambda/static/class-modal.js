// Class modal state
let currentBookingClass = null;

// Add class detail modal to the page
function addClassModal() {
    const modalHTML = 
        '<div id="class-modal" class="class-modal">' +
            '<div class="class-modal-content">' +
                '<div class="class-modal-header">' +
                    '<button class="class-modal-close" onclick="closeClassModal()">&times;</button>' +
                    '<div class="class-modal-title" id="class-modal-title"></div>' +
                    '<div class="class-modal-category" id="class-modal-category"></div>' +
                '</div>' +
                '<div class="class-modal-body">' +
                    '<div class="class-modal-description" id="class-modal-description"></div>' +
                    '<div class="class-modal-details" id="class-modal-details"></div>' +
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
    
    // Populate modal content
    document.getElementById('class-modal-title').textContent = classItem.title;
    document.getElementById('class-modal-category').textContent = classItem.category;
    document.getElementById('class-modal-description').textContent = classItem.description;
    
    // Class details
    const detailsHTML = 
        '<div class="class-modal-detail">' +
            '<span class="class-modal-detail-icon">📅</span>' +
            new Date(classItem.scheduleDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) +
        '</div>' +
        '<div class="class-modal-detail">' +
            '<span class="class-modal-detail-icon">⏰</span>' +
            classItem.startTime + ' - ' + classItem.endTime +
        '</div>' +
        '<div class="class-modal-detail">' +
            '<span class="class-modal-detail-icon">⏱️</span>' +
            classItem.duration + ' minutes' +
        '</div>' +
        '<div class="class-modal-detail">' +
            '<span class="class-modal-detail-icon">📍</span>' +
            classItem.location +
        '</div>' +
        '<div class="class-modal-detail">' +
            '<span class="class-modal-detail-icon">🧘‍♀️</span>' +
            classItem.instructor +
        '</div>' +
        '<div class="class-modal-detail">' +
            '<span class="class-modal-detail-icon">🎯</span>' +
            classItem.level +
        '</div>' +
        '<div class="class-modal-detail">' +
            '<span class="class-modal-detail-icon">💰</span>' +
            '$' + classItem.price +
        '</div>';
    
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

// Book a class (placeholder - would integrate with booking system)
function bookClass() {
    if (!currentBookingClass) return;
    
    const classItem = currentBookingClass;
    const action = classItem.isFullyBooked ? 'join waitlist for' : 'book';
    
    // This would integrate with the booking system
    alert('Booking functionality coming soon! You want to ' + action + ' "' + classItem.title + '" on ' + classItem.scheduleDate + ' at ' + classItem.startTime + '.');
    
    // In a real implementation, this would:
    // 1. Check if user is logged in
    // 2. Show payment form if needed
    // 3. Create booking via API
    // 4. Send confirmation email
    // 5. Update calendar display
    
    closeClassModal();
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
