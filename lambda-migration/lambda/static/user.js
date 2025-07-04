// Global state for bookings data
let allUserBookings = [];
let bookingFilterOptions = {
    months: [],
    categories: []
};

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

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/dev';
            return;
        }

        const response = await fetch('/dev/auth/verify-token', {
            method: 'GET',
            headers: getAuthHeaders(),
            credentials: 'include'
        });
        
        if (!response.ok) {
            window.location.href = '/dev';
            return;
        }

        // Initialize dashboard - fetch all bookings first
        await fetchAllBookings();
        setupEventListeners();
        loadUserProfile();
        loadDashboardData();
    } catch (error) {
        console.error('Authentication error:', error);
        window.location.href = '/dev';
    }
});

// Fetch all user bookings in one request
async function fetchAllBookings() {
    try {
        const response = await fetch('/dev/bookings', {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch bookings data');
        }
        
        const data = await response.json();
        
        // Store in global state
        allUserBookings = data.bookings || [];
        bookingFilterOptions = data.filterOptions || {
            months: [],
            categories: []
        };
        
        console.log(`Loaded ${allUserBookings.length} bookings`);
        
        // Initialize filter dropdowns with available options
        updateFilterDropdowns();
        
        return allUserBookings;
    } catch (error) {
        console.error('Error fetching all bookings:', error);
        return [];
    }
}

// Update filter dropdowns with available options
function updateFilterDropdowns() {
    // Month filter dropdown
    const monthFilter = document.getElementById('month-filter');
    if (monthFilter) {
        // Clear existing options, keeping the "All Months" option
        monthFilter.innerHTML = '<option value="">All Months</option>';
        
        // Add month options from the filter options
        bookingFilterOptions.months.forEach(month => {
            const option = document.createElement('option');
            option.value = month;
            // Format month for display (YYYY-MM -> Month YYYY)
            const [year, monthNum] = month.split('-');
            const monthName = new Date(year, parseInt(monthNum) - 1, 1).toLocaleString('default', { month: 'long' });
            option.textContent = `${monthName} ${year}`;
            monthFilter.appendChild(option);
        });
    }
    
    // Class type filter dropdown
    const typeFilter = document.getElementById('type-filter');
    if (typeFilter) {
        // Clear existing options, keeping the "All Types" option
        typeFilter.innerHTML = '<option value="">All Types</option>';
        
        // Add class type options from the filter options
        bookingFilterOptions.categories.forEach(category => {
            if (category) {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
                typeFilter.appendChild(option);
            }
        });
    }
    
    // Add status filter dropdown if it doesn't exist
    const historyFilters = document.querySelector('.history-filters');
    if (historyFilters && !document.getElementById('status-filter')) {
        const statusFilter = document.createElement('select');
        statusFilter.id = 'status-filter';
        statusFilter.innerHTML = `
            <option value="">All Statuses</option>
            <option value="confirmed">Attended</option>
            <option value="canceled">Canceled</option>
            <option value="waitlisted">Waitlisted</option>
        `;
        statusFilter.addEventListener('change', loadClassHistory);
        
        // Insert before the existing filters or at beginning
        if (historyFilters.firstChild) {
            historyFilters.insertBefore(statusFilter, historyFilters.firstChild);
        } else {
            historyFilters.appendChild(statusFilter);
        }
    }
}

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

    // Profile form
    document.getElementById('save-profile').addEventListener('click', saveProfile);

    // History filters
    document.getElementById('month-filter').addEventListener('change', loadClassHistory);
    document.getElementById('type-filter').addEventListener('change', loadClassHistory);
}

// Navigation
function navigateToSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.user-section').forEach(section => {
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
        case 'upcoming':
            loadUpcomingClasses();
            break;
        case 'history':
            loadClassHistory();
            break;
        case 'profile':
            loadUserProfile();
            break;
    }
}

// Filter bookings by type
function filterBookings(type = 'all', month = '', classType = '', includeStatus = []) {
    if (!allUserBookings || allUserBookings.length === 0) {
        return [];
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    return allUserBookings.filter(booking => {
        // Filter by past/upcoming
        if (type === 'upcoming' && booking.date < today) {
            return false;
        }
        if (type === 'past' && booking.date >= today) {
            return false;
        }
        
        // Filter by month
        if (month && !booking.date.startsWith(month)) {
            return false;
        }
        
        // Filter by class type
        if (classType && booking.category !== classType) {
            return false;
        }
        
        // Filter by status (if specified)
        if (includeStatus.length > 0 && !includeStatus.includes(booking.status)) {
            return false;
        }
        
        return true;
    });
}

// Load Dashboard Data
function loadDashboardData() {
    try {
        // Filter bookings for upcoming/past sections - exclude cancelled
        const upcomingBookings = filterBookings('upcoming', '', '', ['confirmed', 'waitlisted']);
        const pastBookings = filterBookings('past', '', '', ['confirmed', 'waitlisted']);
        
        // Update dashboard counters - only count non-cancelled bookings
        document.getElementById('upcoming-count').textContent = upcomingBookings.length;
        document.getElementById('attended-count').textContent = pastBookings.length;

        // Load next class - make sure it's a confirmed booking
        if (upcomingBookings.length > 0) {
            const nextClass = upcomingBookings[0]; // First upcoming class (they're already sorted)
            document.getElementById('next-class').innerHTML = `
                <h4>${nextClass.className}</h4>
                <p>${formatDate(nextClass.date)} at ${nextClass.time}</p>
                <p>with ${nextClass.instructor}</p>
            `;
        } else {
            document.getElementById('next-class').innerHTML = `
                <p>No upcoming classes</p>
                <button onclick="navigateToSection('upcoming')">Book a Class</button>
            `;
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Load Upcoming Classes
async function loadUpcomingClasses() {
    try {
        // Filter bookings for upcoming classes - exclude cancelled bookings
        const upcomingBookings = filterBookings('upcoming', '', '', ['confirmed', 'waitlisted']);
        
        // Also get canceled bookings for separate section
        const canceledBookings = filterBookings('upcoming', '', '', ['canceled']);
        
        // Load available classes (we still need to fetch these)
        const classesResponse = await fetch('/dev/classes', {
            headers: getAuthHeaders()
        });
        const classesData = await classesResponse.json();
        const classes = classesData.classes || [];
        
        // Update calendar - only show active bookings in calendar
        updateCalendar(classes, upcomingBookings);
        
        // Update registered classes list
        const classList = document.querySelector('.class-list');
        
        // First, show active bookings
        classList.innerHTML = '';
        if (upcomingBookings.length > 0) {
            classList.innerHTML += `
                ${upcomingBookings.map(booking => `
                    <div class="class-item ${booking.status || ''}">
                        <div class="class-info">
                            <h3>${booking.className}</h3>
                            <p>${formatDate(booking.date)} at ${booking.time}</p>
                            <p>with ${booking.instructor}</p>
                        </div>
                        <div class="class-actions">
                            <button onclick="cancelBooking('${booking.id}')" class="cancel-btn">Cancel</button>
                        </div>
                    </div>
                `).join('')}
            `;
        } else {
            classList.innerHTML += '<div class="empty-state">No upcoming classes. Book a class from the calendar above.</div>';
        }
        
        // Then, if we have canceled bookings, show them in a separate section
        if (canceledBookings.length > 0) {
            classList.innerHTML += `
                <h3 class="section-title canceled-title">Canceled Classes</h3>
                ${canceledBookings.map(booking => `
                    <div class="class-item canceled">
                        <div class="class-info">
                            <h3>${booking.className} <span class="status-badge canceled">Canceled</span></h3>
                            <p>${formatDate(booking.date)} at ${booking.time}</p>
                            <p>with ${booking.instructor}</p>
                        </div>
                        <div class="class-actions">
                            <button onclick="bookClass('${booking.classId}')" class="rebook-btn">Book Again</button>
                        </div>
                    </div>
                `).join('')}
            `;
        }
    } catch (error) {
        console.error('Error loading upcoming classes:', error);
    }
}

// Load Class History
function loadClassHistory() {
    try {
        const monthFilter = document.getElementById('month-filter').value;
        const typeFilter = document.getElementById('type-filter').value;
        const statusFilter = document.getElementById('status-filter')?.value || '';
        
        // Set up status filter array
        let statusFilters = [];
        if (statusFilter) {
            statusFilters = [statusFilter];
        }
        
        // Filter bookings using client-side filtering
        const historyBookings = filterBookings('past', monthFilter, typeFilter, statusFilters);
        
        const historyList = document.querySelector('.history-list');
        historyList.innerHTML = historyBookings.map(booking => {
            // Determine class status and styles
            let statusLabel = '';
            let actionButton = '';
            
            if (booking.status === 'canceled') {
                statusLabel = '<span class="status-badge canceled">Canceled</span>';
                
                // Check if class is in future and we should offer rebooking
                const today = new Date().toISOString().split('T')[0];
                if (booking.date >= today) {
                    actionButton = `<button onclick="bookClass('${booking.classId}')" class="rebook-btn">Book Again</button>`;
                }
            }
            
            return `
                <div class="class-item ${booking.status || ''}">
                    <div class="class-info">
                        <h3>${booking.className} ${statusLabel}</h3>
                        <p>${formatDate(booking.date)} at ${booking.time}</p>
                        <p>with ${booking.instructor}</p>
                    </div>
                    <div class="class-actions">
                        ${actionButton}
                    </div>
                </div>
            `;
        }).join('');
        
        if (historyBookings.length === 0) {
            historyList.innerHTML = '<div class="empty-state">No past classes found for the selected filters.</div>';
        }
    } catch (error) {
        console.error('Error loading class history:', error);
    }
}

// Load User Profile
async function loadUserProfile() {
    try {
        const response = await fetch('/dev/auth/profile', {
            headers: getAuthHeaders()
        });
        const profile = await response.json();
        
        document.getElementById('firstName').value = profile.firstName || '';
        document.getElementById('lastName').value = profile.lastName || '';
        document.getElementById('email').value = profile.email || '';
        document.getElementById('phoneNumber').value = profile.phoneNumber || '';
        
        // Handle preferences object
        document.getElementById('yogaPreferences').value = '';
        document.getElementById('newsletter').checked = profile.preferences?.newsletter || false;
        document.getElementById('notifications').checked = profile.preferences?.notifications || false;
        
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// Save Profile Changes
async function saveProfile() {
    try {
        const profile = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            phoneNumber: document.getElementById('phoneNumber').value,
            preferences: {
                newsletter: document.getElementById('newsletter').checked,
                notifications: document.getElementById('notifications').checked
            }
        };
        
        const response = await fetch('/dev/auth/profile', {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(profile)
        });
        
        if (response.ok) {
            alert('Profile updated successfully!');
        } else {
            throw new Error('Failed to update profile');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Failed to save profile changes. Please try again.');
    }
}

// Delete User Account
async function deleteAccount() {
    // First confirmation
    if (!confirm('Are you sure you want to delete your account? This action CANNOT be undone.')) {
        return;
    }
    
    // Second confirmation with explanation of consequences
    if (!confirm('FINAL WARNING: Deleting your account will remove all your personal data, bookings, and history. You will NOT be able to recover this information. Continue?')) {
        return;
    }
    
    try {
        const deleteBtn = document.getElementById('delete-account');
        const originalText = deleteBtn.textContent;
        deleteBtn.textContent = 'Processing...';
        deleteBtn.disabled = true;
        
        const response = await fetch('/dev/auth/account', {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete account');
        }
        
        // Success - clear token and redirect to home
        localStorage.removeItem('token');
        alert('Your account has been successfully deleted.');
        window.location.href = '/dev/';
        
    } catch (error) {
        console.error('Error deleting account:', error);
        alert('Failed to delete account: ' + (error.message || 'Please try again'));
        
        // Reset button
        const deleteBtn = document.getElementById('delete-account');
        deleteBtn.textContent = originalText;
        deleteBtn.disabled = false;
    }
}

// Calendar Functions
function updateCalendar(classes, bookings) {
    const calendar = document.querySelector('.class-calendar');
    
    // Create calendar structure (similar to homepage)
    const calendarHTML = 
        '<div class="calendar-container">' +
            '<div class="calendar-header">' +
                '<div class="calendar-navigation">' +
                    '<button class="nav-btn" id="prev-month">←</button>' +
                    '<div class="calendar-date-range" id="calendar-date-range">' +
                        '<!-- Date range will be populated here -->' +
                    '</div>' +
                    '<button class="nav-btn" id="next-month">→</button>' +
                '</div>' +
            '</div>' +
            '<div class="calendar-grid-container">' +
                '<div class="calendar-grid" id="calendar-grid">' +
                    '<!-- Calendar will be populated here -->' +
                '</div>' +
            '</div>' +
        '</div>';
    
    calendar.innerHTML = calendarHTML;
    
    // Initialize calendar
    initializeCalendar(classes, bookings);
    
    // Add class detail modal
    addClassModal();
}

// Initialize calendar and set up event listeners
function initializeCalendar(classes, bookings) {
    // Group classes by date
    const calendarClasses = {};
    classes.forEach(classItem => {
        const dateKey = classItem.scheduleDate;
        if (!calendarClasses[dateKey]) {
            calendarClasses[dateKey] = [];
        }
        calendarClasses[dateKey].push(classItem);
    });
    
    // Set current date
    const currentDate = new Date();
    
    // Setup navigation event listeners
    document.getElementById('prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar(currentDate, calendarClasses, bookings);
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar(currentDate, calendarClasses, bookings);
    });
    
    // Initial render
    renderCalendar(currentDate, calendarClasses, bookings);
}

// Render calendar with classes
function renderCalendar(currentDate, calendarClasses, bookings) {
    const grid = document.getElementById('calendar-grid');
    const dateRange = document.getElementById('calendar-date-range');
    
    // Calculate the start of the 4-week period
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startOfWeek = new Date(startOfMonth);
    startOfWeek.setDate(startOfMonth.getDate() - startOfMonth.getDay()); // Go to Sunday
    
    const endDate = new Date(startOfWeek);
    endDate.setDate(startOfWeek.getDate() + 27); // 4 weeks = 28 days
    
    // Update date range display
    dateRange.textContent = formatDateRange(startOfWeek) + ' - ' + formatDateRange(endDate);
    
    // Clear existing content
    grid.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const headerDiv = document.createElement('div');
        headerDiv.className = 'calendar-day-header';
        headerDiv.textContent = day;
        grid.appendChild(headerDiv);
    });
    
    // Convert bookings to map for quick lookup
    const bookedClassIds = new Map();
    if (bookings && Array.isArray(bookings)) {
        bookings.forEach(booking => {
            bookedClassIds.set(booking.classId, booking);
        });
    }
    
    // Generate 28 days (4 weeks)
    for (let i = 0; i < 28; i++) {
        const currentDay = new Date(startOfWeek);
        currentDay.setDate(startOfWeek.getDate() + i);
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        
        // Check if it's today
        const today = new Date();
        if (currentDay.toDateString() === today.toDateString()) {
            dayDiv.classList.add('today');
        }
        
        // Check if it's in a different month
        if (currentDay.getMonth() !== currentDate.getMonth()) {
            dayDiv.classList.add('other-month');
        }
        
        // Add date number
        const dateDiv = document.createElement('div');
        dateDiv.className = 'calendar-date';
        dateDiv.textContent = currentDay.getDate();
        dayDiv.appendChild(dateDiv);
        
        // Add classes for this day
        const classesDiv = document.createElement('div');
        classesDiv.className = 'calendar-classes';
        
        const dayStr = currentDay.toISOString().split('T')[0];
        const dayClasses = calendarClasses[dayStr] || [];
        
        dayClasses.forEach(classItem => {
            const classDiv = document.createElement('div');
            const categoryClass = classItem.category ? classItem.category.toLowerCase() : 'general';
            const isFullClass = classItem.isFullyBooked ? 'full' : '';
            
            // Check if user is already booked
            const isBooked = bookedClassIds.has(classItem.id);
            const bookedClass = isBooked ? 'booked' : '';
            
            classDiv.className = `calendar-class ${categoryClass} ${isFullClass} ${bookedClass}`;
            
            // Add a booked indicator for classes the user is already registered for
            let displayText = `${classItem.startTime} ${classItem.title}`;
            if (isBooked) {
                displayText = `✓ ${displayText}`;
            }
            
            classDiv.textContent = displayText;
            classDiv.addEventListener('click', () => openClassModal(classItem.id, isBooked));
            classesDiv.appendChild(classDiv);
        });
        
        dayDiv.appendChild(classesDiv);
        grid.appendChild(dayDiv);
    }
}

// Format date for display in the calendar header
function formatDateRange(date) {
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    });
}

// Format date for display (more detailed)
function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

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
                        '<button class="class-modal-btn class-modal-btn-primary" id="class-modal-book-btn">' +
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
    
    // Add event listeners
    document.getElementById('class-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('class-modal')) {
            closeClassModal();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('class-modal').style.display === 'block') {
            closeClassModal();
        }
    });
}

// Open class detail modal - enhanced to show booking status
function openClassModal(classId, isBooked = false) {
    // Find class by ID from the allClasses array
    fetch('/dev/classes/' + classId, {
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.classItem) {
            const classItem = data.classItem;
            
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
            
            // Check if this booking was previously cancelled 
            let bookingStatus = null;
            let bookingId = null;
            for (const booking of allUserBookings) {
                if (booking.classId === classId) {
                    bookingStatus = booking.status;
                    bookingId = booking.id;
                    break;
                }
            }
            
            // Availability
            const availabilityEl = document.getElementById('class-modal-availability');
            const bookBtn = document.getElementById('class-modal-book-btn');
            
            // Only consider a user booked if the status is confirmed or waitlisted
            const activelyBooked = isBooked && bookingStatus && 
                (bookingStatus === 'confirmed' || bookingStatus === 'waitlisted');
            
            if (activelyBooked) {
                // User is already booked for this class
                availabilityEl.className = 'class-modal-availability booked';
                availabilityEl.innerHTML = 
                    '<div class="class-modal-availability-text">You are booked for this class</div>' +
                    '<div class="class-modal-spots">' + classItem.currentBookings + '/' + classItem.maxParticipants + ' spots taken</div>';
                bookBtn.textContent = 'Cancel Booking';
                bookBtn.onclick = () => cancelBookingFromModal(classId);
                bookBtn.disabled = false;
            } else if (bookingStatus === 'canceled') {
                // User previously canceled this class
                availabilityEl.className = 'class-modal-availability canceled';
                availabilityEl.innerHTML = 
                    '<div class="class-modal-availability-text">You previously canceled this class</div>' +
                    '<div class="class-modal-spots">' + classItem.currentBookings + '/' + classItem.maxParticipants + ' spots taken</div>';
                
                if (classItem.isFullyBooked) {
                    bookBtn.textContent = 'Join Waitlist';
                } else {
                    bookBtn.textContent = 'Book Again';
                }
                bookBtn.onclick = () => bookClass(classId);
                bookBtn.disabled = false;
            } else if (classItem.isFullyBooked) {
                availabilityEl.className = 'class-modal-availability full';
                availabilityEl.innerHTML = 
                    '<div class="class-modal-availability-text">Class is Full</div>' +
                    '<div class="class-modal-spots">' + classItem.currentBookings + '/' + classItem.maxParticipants + ' spots taken</div>';
                bookBtn.textContent = 'Join Waitlist';
                bookBtn.onclick = () => bookClass(classId);
                bookBtn.disabled = false;
            } else {
                availabilityEl.className = 'class-modal-availability';
                availabilityEl.innerHTML = 
                    '<div class="class-modal-availability-text">' + classItem.availableSpots + ' Spots Available</div>' +
                    '<div class="class-modal-spots">' + classItem.currentBookings + '/' + classItem.maxParticipants + ' spots taken</div>';
                bookBtn.textContent = 'Book This Class';
                bookBtn.onclick = () => bookClass(classId);
                bookBtn.disabled = false;
            }
            
            // Show modal
            document.getElementById('class-modal').style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    })
    .catch(error => {
        console.error('Error fetching class details:', error);
        alert('Failed to load class details. Please try again.');
    });
}

// Close class modal
function closeClassModal() {
    document.getElementById('class-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Booking Functions
async function bookClass(classId) {
    try {
        // Show booking in progress
        const bookBtn = document.getElementById('class-modal-book-btn');
        const originalText = bookBtn.textContent;
        bookBtn.textContent = 'Processing...';
        bookBtn.disabled = true;
        
        // Simplify booking logic - always use the book endpoint
        // Backend will handle cases where the booking previously existed
        const response = await fetch(`/dev/classes/${classId}/book`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to book class');
        }
        
        const result = await response.json();
        
        // Show success message
        let message;
        if (result.booking.status === 'waitlisted') {
            message = `You've been added to the waitlist. Your position: #${result.booking.waitlistPosition}`;
        } else {
            message = result.message || 'Class booked successfully!';
        }
        
        alert(message);
        
        // Close modal and refresh data
        closeClassModal();
        
        // Re-fetch all bookings to update our data
        await fetchAllBookings();
        loadUpcomingClasses();
        loadDashboardData();
        
    } catch (error) {
        console.error('Error booking class:', error);
        alert('Failed to book class: ' + (error.message || 'Please try again.'));
        
        // Reset button
        const bookBtn = document.getElementById('class-modal-book-btn');
        bookBtn.textContent = originalText || 'Book This Class';
        bookBtn.disabled = false;
    }
}

// Cancel booking from class list
async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this class?')) return;
    
    try {
        const response = await fetch(`/dev/bookings/${bookingId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            // Re-fetch all bookings to update our data
            await fetchAllBookings();
            loadUpcomingClasses();
            loadDashboardData();
        } else {
            throw new Error('Failed to cancel booking');
        }
    } catch (error) {
        console.error('Error canceling booking:', error);
        alert('Failed to cancel class. Please try again.');
    }
}

// Cancel booking from modal
async function cancelBookingFromModal(classId) {
    try {
        // Find the booking for this class in our cached data
        const booking = allUserBookings.find(b => b.classId === classId);
        if (!booking) {
            throw new Error('Could not find your booking for this class');
        }
        
        // Confirm cancellation
        if (!confirm('Are you sure you want to cancel this class?')) return;
        
        // Show cancellation in progress
        const bookBtn = document.getElementById('class-modal-book-btn');
        bookBtn.textContent = 'Cancelling...';
        bookBtn.disabled = true;
        
        // Cancel the booking
        const response = await fetch(`/dev/bookings/${booking.id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('Failed to cancel booking');
        }
        
        // Show success message and refresh data
        alert('Your booking has been cancelled');
        closeClassModal();
        
        // Re-fetch all bookings to update our data
        await fetchAllBookings();
        loadUpcomingClasses();
        loadDashboardData();
        
    } catch (error) {
        console.error('Error canceling booking:', error);
        alert('Failed to cancel class: ' + error.message);
        
        // Reset button
        const bookBtn = document.getElementById('class-modal-book-btn');
        bookBtn.textContent = 'Cancel Booking';
        bookBtn.disabled = false;
    }
}

// Handle Logout
async function handleLogout() {
    try {
        await fetch('/dev/auth/logout', {
            method: 'POST',
            headers: getAuthHeaders()
        });    
        localStorage.removeItem('token');
        window.location.href = '/dev';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Utility Functions
function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}
