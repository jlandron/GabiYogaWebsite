// Mobile Navigation Menu Toggle
document.addEventListener('DOMContentLoaded', () => {
    // Check if progressive loading is enabled
    if (window.PROGRESSIVE_LOADING_ENABLED) {
        console.log('[Script.js] Progressive loading enabled - skipping automatic content loading');
        
        // Only initialize essential UI components
        initializeEssentialComponents();
        return;
    }
    
    // Legacy loading behavior (when progressive loading is disabled)
    console.log('[Script.js] Using legacy loading behavior');
    
    // Initialize login requirements for all buttons
    addLoginRequirements();
    
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
    
    // Private Session Booking Modal functionality
    const privateBookingModal = document.getElementById('private-booking-modal');
    const closePrivateModal = document.querySelector('#private-booking-modal .close-modal');
    const privateSessionBtn = document.getElementById('private-session-btn');
    
    if (privateBookingModal && closePrivateModal) {
        // Close modal with X button
        closePrivateModal.addEventListener('click', () => {
            privateBookingModal.style.display = 'none';
            document.body.style.overflow = '';
        });
        
        // Close modal when clicking outside of it
        window.addEventListener('click', (e) => {
            if (e.target === privateBookingModal) {
                privateBookingModal.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
        
        // Handle private booking form submission
        const privateBookingForm = document.getElementById('private-booking-form');
        if (privateBookingForm) {
            privateBookingForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // Gather form data
                const sessionTypeSelect = document.getElementById('session-type');
                const sessionType = sessionTypeSelect.value;
                const sessionTypeText = sessionTypeSelect.options[sessionTypeSelect.selectedIndex].text;
                const sessionFocus = document.getElementById('session-focus').value;
                const date1 = document.getElementById('date1').value;
                const time1 = document.getElementById('time1').value;
                const notes = document.getElementById('booking-notes').value;
                
                // Get user data from user data manager
                let name = '';
                let email = '';
                let userId = null;
                
                try {
                    if (window.userDataManager) {
                        name = await window.userDataManager.getFullName();
                        email = await window.userDataManager.getEmail();
                        userId = await window.userDataManager.getUserId();
                    }
                } catch (userDataError) {
                    console.warn('Failed to load user data for private booking:', userDataError);
                }
                
                // Get package data from the sessionPackageData object
                const packageData = window.sessionPackageData ? window.sessionPackageData[sessionType] : null;
                const packageName = packageData ? packageData.name : sessionTypeText;
                
                // Get the display text for the selected focus option
                const sessionFocusSelect = document.getElementById('session-focus');
                const focusDisplayText = sessionFocusSelect.options[sessionFocusSelect.selectedIndex].text;
                
                // Prepare request body
                const requestBody = {
                    userId,
                    sessionType,
                    sessionFocus,
                    packageName,
                    date1,
                    time1,
                    date2: document.getElementById('date2').value || null,
                    time2: document.getElementById('time2').value || null,
                    date3: document.getElementById('date3').value || null,
                    time3: document.getElementById('time3').value || null,
                    notes,
                    name,
                    email
                };
                
                // Save booking to the API
                try {
                    const response = await fetch('/api/private-sessions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(requestBody),
                        credentials: 'include' // Include cookies for auth
                    });
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Error saving private session booking:', errorText);
                    }
                } catch (error) {
                    console.error('Error submitting private session booking:', error);
                }
                
                // Show success message
                alert(`Thank you${name ? ', ' + name : ''}! Your ${packageName} focusing on ${focusDisplayText} has been requested for ${date1} at ${time1}. I'll contact you within 24 hours to confirm your booking.`);
                
                privateBookingModal.style.display = 'none';
                document.body.style.overflow = '';
                privateBookingForm.reset();
            });
        }
    }
    
    // Private sessions buttons event handlers
    // Use event delegation since the button is created dynamically
    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'private-session-btn') {
            e.preventDefault();
            
            // Check if user is logged in first
            const isLoggedIn = window.userDataManager && window.userDataManager.isLoggedIn();
            
            if (!isLoggedIn) {
                // Show login modal with callback to open booking modal
                if (typeof showLoginModal === 'function') {
                    showLoginModal(false, () => {
                        openPrivateBookingModal();
                    });
                } else {
                    alert('Please log in to book a private session');
                }
            } else {
                openPrivateBookingModal();
            }
        }
    });
    
    // Private sessions section main CTA button
    const privateSectionsBtn = document.getElementById('private-sessions-btn');
    if (privateSectionsBtn) {
        privateSectionsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Check if user is logged in first
            const isLoggedIn = window.userDataManager && window.userDataManager.isLoggedIn();
            
            if (!isLoggedIn) {
                // Show login modal with callback to open booking modal
                if (typeof showLoginModal === 'function') {
                    showLoginModal(false, () => {
                        openPrivateBookingModal();
                    });
                } else {
                    alert('Please log in to book a private session');
                }
            } else {
                openPrivateBookingModal();
            }
        });
    }
});

// Function to initialize essential UI components when progressive loading is enabled
function initializeEssentialComponents() {
    console.log('[Script.js] Initializing essential UI components only');
    
    // Initialize modal functionality - this is critical for user interaction
    initializeModals();
    
    // Initialize login requirements for buttons that might already be in DOM
    addLoginRequirements();
    
    // Initialize form handlers
    initializeFormHandlers();
    
    // Mobile menu will be handled by progressive loader via header loader
    console.log('[Script.js] Essential components initialized');
}

// Function to initialize modal functionality
function initializeModals() {
    // Private Session Booking Modal functionality
    const privateBookingModal = document.getElementById('private-booking-modal');
    const closePrivateModal = document.querySelector('#private-booking-modal .close-modal');
    
    if (privateBookingModal && closePrivateModal) {
        // Close modal with X button
        closePrivateModal.addEventListener('click', () => {
            privateBookingModal.style.display = 'none';
            document.body.style.overflow = '';
        });
        
        // Close modal when clicking outside of it
        window.addEventListener('click', (e) => {
            if (e.target === privateBookingModal) {
                privateBookingModal.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
        
        // Handle private booking form submission
        const privateBookingForm = document.getElementById('private-booking-form');
        if (privateBookingForm) {
            privateBookingForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // Gather form data
                const sessionTypeSelect = document.getElementById('session-type');
                const sessionType = sessionTypeSelect.value;
                const sessionTypeText = sessionTypeSelect.options[sessionTypeSelect.selectedIndex].text;
                const sessionFocus = document.getElementById('session-focus').value;
                const date1 = document.getElementById('date1').value;
                const time1 = document.getElementById('time1').value;
                const notes = document.getElementById('booking-notes').value;
                
                // Get user data from user data manager
                let name = '';
                let email = '';
                let userId = null;
                
                try {
                    if (window.userDataManager) {
                        name = await window.userDataManager.getFullName();
                        email = await window.userDataManager.getEmail();
                        userId = await window.userDataManager.getUserId();
                    }
                } catch (userDataError) {
                    console.warn('Failed to load user data for private booking:', userDataError);
                }
                
                // Get package data from the sessionPackageData object
                const packageData = window.sessionPackageData ? window.sessionPackageData[sessionType] : null;
                const packageName = packageData ? packageData.name : sessionTypeText;
                
                // Get the display text for the selected focus option
                const sessionFocusSelect = document.getElementById('session-focus');
                const focusDisplayText = sessionFocusSelect.options[sessionFocusSelect.selectedIndex].text;
                
                // Prepare request body
                const requestBody = {
                    userId,
                    sessionType,
                    sessionFocus,
                    packageName,
                    date1,
                    time1,
                    date2: document.getElementById('date2').value || null,
                    time2: document.getElementById('time2').value || null,
                    date3: document.getElementById('date3').value || null,
                    time3: document.getElementById('time3').value || null,
                    notes,
                    name,
                    email
                };
                
                // Save booking to the API
                try {
                    const response = await fetch('/api/private-sessions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(requestBody),
                        credentials: 'include' // Include cookies for auth
                    });
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Error saving private session booking:', errorText);
                    }
                } catch (error) {
                    console.error('Error submitting private session booking:', error);
                }
                
                // Show success message
                alert(`Thank you${name ? ', ' + name : ''}! Your ${packageName} focusing on ${focusDisplayText} has been requested for ${date1} at ${time1}. I'll contact you within 24 hours to confirm your booking.`);
                
                privateBookingModal.style.display = 'none';
                document.body.style.overflow = '';
                privateBookingForm.reset();
            });
        }
    }
    
    // Private sessions buttons event handlers
    // Use event delegation since the button is created dynamically
    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'private-session-btn') {
            e.preventDefault();
            
            // Check if user is logged in first
            const isLoggedIn = window.userDataManager && window.userDataManager.isLoggedIn();
            
            if (!isLoggedIn) {
                // Show login modal without redirecting after login
                if (typeof showLoginModal === 'function') {
                    showLoginModal(false);
                } else {
                    alert('Please log in to book a private session');
                }
            } else {
                openPrivateBookingModal();
            }
        }
    });
    
    // Private sessions section main CTA button
    const privateSectionsBtn = document.getElementById('private-sessions-btn');
    if (privateSectionsBtn) {
        privateSectionsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Check if user is logged in first
            const isLoggedIn = window.userDataManager && window.userDataManager.isLoggedIn();
            
            if (!isLoggedIn) {
                // Show login modal without redirecting after login
                if (typeof showLoginModal === 'function') {
                    showLoginModal(false);
                } else {
                    alert('Please log in to book a private session');
                }
            } else {
                openPrivateBookingModal();
            }
        });
    }
}

// Function to open private booking modal
function openPrivateBookingModal() {
    const privateBookingModal = document.getElementById('private-booking-modal');
    
    // Set minimum date to today
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    
    document.getElementById('date1').min = formattedDate;
    document.getElementById('date2').min = formattedDate;
    document.getElementById('date3').min = formattedDate;
    
    // Show the modal
    privateBookingModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Function to fetch and populate session packages for booking modal
function fetchSessionPackagesForModal() {
    // First check if the private booking modal exists on this page
    const privateBookingModal = document.getElementById('private-booking-modal');
    if (!privateBookingModal) {
        // Modal doesn't exist on this page, skip loading packages
        return;
    }
    
    fetch('/api/pricing')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch pricing data');
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.pricing && data.pricing.sessionPackages) {
                populateSessionPackageDropdown(data.pricing.sessionPackages);
            } else {
                throw new Error(data.message || 'No session packages data found');
            }
        })
        .catch(error => {
            console.error('Error fetching session packages for modal:', error);
        });
}

// Function to populate session packages dropdown
function populateSessionPackageDropdown(packages) {
    const sessionTypeSelect = document.getElementById('session-type');
    if (!sessionTypeSelect) {
        console.error('Session type select element not found');
        return;
    }
    
    console.log('Populating session packages dropdown with:', packages);
    
    // Clear existing options (except the placeholder)
    while (sessionTypeSelect.options.length > 1) {
        sessionTypeSelect.options.remove(1);
    }
    
    // Add packages from API data
    packages.forEach(pkg => {
        // Skip packages without an id
        if (!pkg.id) {
            console.warn('Package missing id:', pkg);
            return;
        }
        
        const option = document.createElement('option');
        option.value = pkg.id.toString();
        
        // Format display text with price and duration
        let optionText = `${pkg.name} ($${pkg.price})`;
        if (pkg.session_duration) {
            optionText += ` - ${pkg.session_duration} min`;
        }
        
        option.textContent = optionText;
        sessionTypeSelect.appendChild(option);
    });
    
    // Build the packageNames lookup table for the success message and focus options
    window.sessionPackageData = {};
    packages.forEach(pkg => {
        // Skip packages without an id
        if (!pkg.id) return;
        
        window.sessionPackageData[pkg.id] = {
            name: pkg.name,
            price: pkg.price,
            duration: pkg.session_duration || 60,
            focus_options: pkg.focus_options || []
        };
    });
    
    console.log('Session package data loaded:', window.sessionPackageData);
    
    // Add event listener to update focus options when session type changes
    sessionTypeSelect.addEventListener('change', updateFocusOptions);
    
    // Auto-load focus options for the first package if there's only one option
    // or if user hasn't manually selected anything yet
    if (packages.length > 0) {
        // Set the first package as selected
        const firstPackageId = packages[0].id.toString();
        sessionTypeSelect.value = firstPackageId;
        
        // Trigger the focus options update for the first package
        setTimeout(() => {
            updateFocusOptions();
        }, 100); // Small delay to ensure DOM is ready
    }
}

// Function to update focus options based on selected session package
function updateFocusOptions() {
    const sessionTypeSelect = document.getElementById('session-type');
    const sessionFocusSelect = document.getElementById('session-focus');
    
    if (!sessionTypeSelect || !sessionFocusSelect) {
        console.error('Session type or focus select elements not found');
        return;
    }
    
    const selectedPackageId = sessionTypeSelect.value;
    
    // Clear existing focus options (except the placeholder)
    while (sessionFocusSelect.options.length > 1) {
        sessionFocusSelect.options.remove(1);
    }
    
    if (!selectedPackageId || !window.sessionPackageData) {
        console.log('No package selected or no package data available');
        return;
    }
    
    const packageData = window.sessionPackageData[selectedPackageId];
    if (!packageData || !packageData.focus_options) {
        console.warn('No focus options found for selected package:', selectedPackageId);
        return;
    }
    
    console.log('Updating focus options for package:', packageData.name, 'with options:', packageData.focus_options);
    
    // Add focus options from the selected package
    packageData.focus_options.forEach(focusOption => {
        const option = document.createElement('option');
        // Create a value from the option text (lowercase, replace spaces with hyphens)
        option.value = focusOption.toLowerCase().replace(/\s+/g, '-').replace(/[&]/g, 'and');
        option.textContent = focusOption;
        sessionFocusSelect.appendChild(option);
    });
    
    // Reset the focus selection to placeholder
    sessionFocusSelect.selectedIndex = 0;
}


// Function to check if user is logged in and prompt if needed
function loginPrompt(event, redirectUrl) {
    event.preventDefault();
    
    // Check if user is logged in using UserService if available
    const isLoggedIn = (window.UserService && window.UserService.isLoggedIn()) || 
                      localStorage.getItem('userLoggedIn') === 'true';
    
    if (!isLoggedIn) {
        // Show login modal without redirecting after login
        if (typeof showLoginModal === 'function') {
            showLoginModal(false);
        } else {
            alert('Please log in to access this feature');
        }
        return false;
    }
    
    // If logged in, allow the action to proceed
    return true;
}


// Helper function to show/hide empty state message
function showEmptyRetreats(isEmpty) {
    const emptyElement = document.getElementById('retreats-empty');
    if (emptyElement) {
        emptyElement.style.display = isEmpty ? 'block' : 'none';
    }
}

// Function to render retreats data
function renderRetreats(retreatsData) {
    // Log the retreat data for debugging
    console.log('Retreats data loaded:', retreatsData);
    
    const retreatsGrid = document.querySelector('.retreats-grid');
    
    if (!retreatsGrid) {
        console.error('Retreats grid not found in the DOM');
        return;
    }
    
    // Handle empty retreats data
    if (!retreatsData || !Array.isArray(retreatsData) || retreatsData.length === 0) {
        console.warn('No retreats data available from API');
        showEmptyRetreats(true);
        return;
    }
    
    // We have data, hide the empty message
    showEmptyRetreats(false);
    
    // Clear any existing retreat cards
    retreatsGrid.innerHTML = '';
    
    // Add each retreat
    retreatsData.forEach(retreat => {
        // Create slug from retreat name if no ID is provided
        const retreatSlug = retreat.slug || retreat.id || retreat.name.toLowerCase().replace(/\s+/g, '-');
        
        // Select a default image if none is provided
        const defaultImages = ['images/DSC02638.JPG', 'images/DSC02646.JPG', 'images/DSC02661~3.JPG'];
        const defaultImage = defaultImages[Math.floor(Math.random() * defaultImages.length)];
        
        const retreatCard = document.createElement('div');
        retreatCard.className = 'retreat-card';
        
        // Format the date range properly
        let dateRange = retreat.dateRange || '';
        if (retreat.start_date && retreat.end_date) {
            const startDate = new Date(retreat.start_date);
            const endDate = new Date(retreat.end_date);
            const options = { month: 'long', day: 'numeric' };
            
            if (startDate.getFullYear() === endDate.getFullYear()) {
                // Same year, format as "June 10-15, 2025"
                dateRange = `${startDate.toLocaleDateString('en-US', options)} - ${endDate.getDate()}, ${endDate.getFullYear()}`;
            } else {
                // Different years, include both years
                dateRange = `${startDate.toLocaleDateString('en-US', options)}, ${startDate.getFullYear()} - ${endDate.toLocaleDateString('en-US', options)}, ${endDate.getFullYear()}`;
            }
        }
        
        retreatCard.innerHTML = `
            <div class="retreat-image">
                <img src="${retreat.imageUrl || defaultImage}" alt="${retreat.name || 'Yoga Retreat'}">
            </div>
            <div class="retreat-content">
                <h3>${retreat.name || 'Upcoming Retreat'}</h3>
                <p class="retreat-location"><i class="fas fa-map-marker-alt"></i> ${retreat.location || 'Location TBA'}</p>
                <p class="retreat-date"><i class="far fa-calendar-alt"></i> ${dateRange}</p>
                <p class="retreat-price"><i class="fas fa-tag"></i> From $${retreat.price || '0'}</p>
                <p class="retreat-description">${retreat.description || 'Join us for this transformative retreat experience.'}</p>
                <a href="retreats/${retreatSlug}" class="btn" data-retreat-id="${retreat.id || ''}">Learn More</a>
            </div>
        `;
        
        retreatsGrid.appendChild(retreatCard);
    });
    
    // Add event listeners to the new Learn More buttons
    document.querySelectorAll('.retreat-card .btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            // Get the href attribute from the button
            const href = btn.getAttribute('href');
            if (href) {
                window.location.href = href;
            }
        });
    });
}

// Add login checks to all signup and booking buttons
const addLoginRequirements = () => {
    // Class signup button
    const signupBtn = document.getElementById('signup-btn');
    if (signupBtn) {
        signupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Check if user is logged in using UserService if available
            const isLoggedIn = (window.UserService && window.UserService.isLoggedIn()) || 
                              localStorage.getItem('userLoggedIn') === 'true';
            
            if (!isLoggedIn) {
                // Show login modal with callback to open signup modal
                if (typeof showLoginModal === 'function') {
                    showLoginModal(false, () => {
                        openClassSignupModal();
                    });
                } else {
                    alert('Please log in to sign up for classes');
                }
            } else {
                // If logged in, open the class signup modal
                openClassSignupModal();
            }
        });
    }
    
    // Workshops button
    const workshopsBtn = document.querySelector('a[href="#events"]');
    if (workshopsBtn) {
        workshopsBtn.addEventListener('click', (e) => {
            if (loginPrompt(e, 'dashboard.html#workshops')) {
                // If logged in, redirect to the dashboard workshops panel
                window.location.href = 'dashboard.html#workshops';
            }
        });
    }
    
    // For all retreat "Learn More" buttons, both static and dynamic
    document.querySelectorAll('.retreat-card .btn').forEach(btn => {
        // Remove any existing event listeners
        const newBtn = btn.cloneNode(true);
        if (btn.parentNode) {
            btn.parentNode.replaceChild(newBtn, btn);
        }
        
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Check for data-retreat-id attribute (from dynamic cards)
            const retreatId = newBtn.getAttribute('data-retreat-id');
            if (retreatId) {
                window.location.href = `retreats/${retreatId}`;
                return;
            }
            
            // Check for href attribute (from static cards in HTML)
            const href = newBtn.getAttribute('href');
            if (href && href !== '#') {
                window.location.href = href;
                return;
            }
            
            // Fallback: try to create a slug from retreat name
            const retreatName = newBtn.closest('.retreat-content')?.querySelector('h3')?.textContent;
            if (retreatName) {
                const slug = retreatName.toLowerCase().replace(/\s+/g, '-');
                window.location.href = `retreats/${slug}`;
            }
        });
    });
    
    // Pricing buttons (Purchase/Subscribe)
    document.querySelectorAll('.pricing-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (loginPrompt(e, 'dashboard.html#memberships')) {
                // If logged in, redirect to the dashboard memberships panel
                window.location.href = 'dashboard.html#memberships';
            }
        });
    });
    
    // Private sessions button is handled separately in the main DOMContentLoaded
    // to open the booking modal instead of redirecting to dashboard
    
    // Private booking buttons in pricing section
    const privateBookingBtns = document.querySelectorAll('.private-booking-btn');
    if (privateBookingBtns.length > 0) {
        privateBookingBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (loginPrompt(e, 'dashboard.html#private-sessions')) {
                    // If logged in, redirect to the dashboard private sessions panel
                    window.location.href = 'dashboard.html#private-sessions';
                }
            });
        });
    }
};

// Function to open class signup modal
function openClassSignupModal() {
    const signupModal = document.getElementById('signup-modal');
    if (signupModal) {
        // Populate class options from schedule
        populateClassOptions();
        
        // Show the modal
        signupModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// Function to populate class options in signup modal
async function populateClassOptions() {
    const classSelect = document.getElementById('class-select');
    
    if (!classSelect) return;
    
    try {
        // Fetch schedule from API
        const response = await fetch('/api/schedule');
        const data = await response.json();
        
        if (data.success && data.schedule) {
            // Clear existing options except the first placeholder
            while (classSelect.options.length > 1) {
                classSelect.options.remove(1);
            }
            
            // Add classes from schedule
            data.schedule.forEach(classItem => {
                const option = document.createElement('option');
                option.value = `${classItem.day.toLowerCase()}-${classItem.time}-${classItem.name}`;
                option.textContent = `${classItem.day} ${classItem.time} - ${classItem.name} (${classItem.level})`;
                classSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading class schedule:', error);
    }
}

// Function to handle class signup form submission
async function handleClassSignupSubmit(event) {
    event.preventDefault();
    
    const classSelect = document.getElementById('class-select');
    const paymentMethod = document.getElementById('payment-method');
    const submitButton = event.target.querySelector('button[type="submit"]');
    
    // Get form values 
    const selectedClass = classSelect.value;
    const selectedPayment = paymentMethod.value;
    
    if (!selectedClass || !selectedPayment) {
        alert('Please select both a class and payment method');
        return;
    }
    
    // Disable button and show loading state
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = 'Reserving...';
    submitButton.disabled = true;
    
    try {
        // Get user data
        let userId = null;
        let userName = '';
        let userEmail = '';
        
        if (window.UserService && window.UserService.isLoggedIn()) {
            const user = window.UserService.getUser();
            userId = user.id;
            userName = `${user.firstName} ${user.lastName}`;
            userEmail = user.email;
        } else if (window.userDataManager) {
            try {
                userId = await window.userDataManager.getUserId();
                userName = await window.userDataManager.getFullName();
                userEmail = await window.userDataManager.getEmail();
            } catch (error) {
                console.warn('Could not get user data:', error);
            }
        }
        
        // Prepare booking data
        const bookingData = {
            userId,
            className: classSelect.options[classSelect.selectedIndex].text,
            classIdentifier: selectedClass,
            paymentMethod: selectedPayment,
            userName,
            userEmail
        };
        
        // Submit class signup (this would need an API endpoint)
        const response = await fetch('/api/class-bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookingData),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show success message
            alert(`Great! Your spot in ${classSelect.options[classSelect.selectedIndex].text} has been reserved. You'll receive a confirmation email shortly.`);
            
            // Close modal and reset form
            document.getElementById('signup-modal').style.display = 'none';
            document.body.style.overflow = '';
            event.target.reset();
        } else {
            alert(result.message || 'Failed to reserve class. Please try again.');
        }
        
    } catch (error) {
        console.error('Error submitting class signup:', error);
        alert('Failed to reserve class. Please check your connection and try again.');
    } finally {
        // Re-enable button
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
    }
}

// Function to initialize form handlers
function initializeFormHandlers() {
    // Newsletter subscription form
    const newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = newsletterForm.querySelector('input[type="email"]');
            const submitButton = newsletterForm.querySelector('button[type="submit"]');
            const email = emailInput.value.trim();
            
            if (!email) {
                alert('Please enter your email address');
                return;
            }
            
            // Disable button and show loading state
            const originalButtonText = submitButton.textContent;
            submitButton.textContent = 'Subscribing...';
            submitButton.disabled = true;
            
            try {
                const response = await fetch('/api/newsletter/subscribe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert(data.message);
                    emailInput.value = ''; // Clear the form
                } else {
                    alert(data.message || 'Failed to subscribe. Please try again.');
                }
            } catch (error) {
                console.error('Error subscribing to newsletter:', error);
                alert('Failed to subscribe. Please check your connection and try again.');
            } finally {
                // Re-enable button
                submitButton.textContent = originalButtonText;
                submitButton.disabled = false;
            }
        });
    }
    
    // Class signup form
    const classSignupForm = document.getElementById('class-signup-form');
    if (classSignupForm) {
        classSignupForm.addEventListener('submit', handleClassSignupSubmit);
    }
    
    // Set up modal close functionality for signup modal
    const signupModal = document.getElementById('signup-modal');
    const signupModalClose = document.querySelector('#signup-modal .close-modal');
    
    if (signupModal && signupModalClose) {
        // Close modal with X button
        signupModalClose.addEventListener('click', () => {
            signupModal.style.display = 'none';
            document.body.style.overflow = '';
        });
        
        // Close modal when clicking outside of it
        window.addEventListener('click', (e) => {
            if (e.target === signupModal) {
                signupModal.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
    }
    
    // Contact form
    const contactForm = document.querySelector('.contact-form form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nameInput = contactForm.querySelector('#name');
            const emailInput = contactForm.querySelector('#email');
            const subjectInput = contactForm.querySelector('#subject');
            const messageInput = contactForm.querySelector('#message');
            const submitButton = contactForm.querySelector('button[type="submit"]');
            
            const formData = {
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                subject: subjectInput.value.trim(),
                message: messageInput.value.trim()
            };
            
            // Basic validation
            if (!formData.name || !formData.email || !formData.subject || !formData.message) {
                alert('Please fill in all fields');
                return;
            }
            
            // Disable button and show loading state
            const originalButtonText = submitButton.textContent;
            submitButton.textContent = 'Sending...';
            submitButton.disabled = true;
            
            try {
                const response = await fetch('/api/contact/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert(data.message);
                    contactForm.reset(); // Clear the form
                } else {
                    alert(data.message || 'Failed to send message. Please try again.');
                }
            } catch (error) {
                console.error('Error submitting contact form:', error);
                alert('Failed to send message. Please check your connection and try again.');
            } finally {
                // Re-enable button
                submitButton.textContent = originalButtonText;
                submitButton.disabled = false;
            }
        });
    }
}
