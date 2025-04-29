// Mobile Navigation Menu Toggle
document.addEventListener('DOMContentLoaded', () => {
    // Fetch data from API
    fetchWebsiteSettings();
    fetchClassSchedule();
    fetchWorkshops();
    fetchRetreats();
    fetchSessionPackagesForModal(); // Load session packages for the modal
    
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
            privateBookingForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // Gather form data
                const sessionTypeSelect = document.getElementById('session-type');
                const sessionType = sessionTypeSelect.value;
                const sessionTypeText = sessionTypeSelect.options[sessionTypeSelect.selectedIndex].text;
                const sessionFocus = document.getElementById('session-focus').value;
                const date1 = document.getElementById('date1').value;
                const time1 = document.getElementById('time1').value;
                const name = document.getElementById('booking-name').value;
                const email = document.getElementById('booking-email').value;
                const phone = document.getElementById('booking-phone').value;
                
                // Focus area names for the alert message
                const focusNames = {
                    'beginner': 'Beginners Introduction',
                    'alignment': 'Alignment & Technique',
                    'flexibility': 'Improving Flexibility',
                    'strength': 'Building Strength',
                    'meditation': 'Meditation & Breathwork',
                    'prenatal': 'Prenatal Yoga',
                    'therapeutic': 'Therapeutic Practice',
                    'custom': 'Custom Focus'
                };
                
                // Get package data from the sessionPackageData object
                const packageData = window.sessionPackageData ? window.sessionPackageData[sessionType] : null;
                const packageName = packageData ? packageData.name : sessionTypeText;
                
                // Show success message
                alert(`Thank you, ${name}! Your ${packageName} focusing on ${focusNames[sessionFocus]} has been requested for ${date1} at ${time1}. I'll contact you within 24 hours at ${email} or ${phone} to confirm your booking.`);
                
                privateBookingModal.style.display = 'none';
                document.body.style.overflow = '';
                privateBookingForm.reset();
            });
        }
    }
    
    // Private sessions button event handler
    if (privateSessionBtn) {
        privateSessionBtn.addEventListener('click', () => {
            openPrivateBookingModal();
        });
    }
});

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
    
    // Build the packageNames lookup table for the success message
    window.sessionPackageData = {};
    packages.forEach(pkg => {
        window.sessionPackageData[pkg.id] = {
            name: pkg.name,
            price: pkg.price,
            duration: pkg.session_duration || 60
        };
    });
    
    console.log('Session package data loaded:', window.sessionPackageData);
}

// Mock functions to prevent errors, these will be defined elsewhere
function fetchWebsiteSettings() { /* Implementation omitted */ }
function fetchClassSchedule() { /* Implementation omitted */ }
function fetchWorkshops() { /* Implementation omitted */ }
function fetchRetreats() { /* Implementation omitted */ }
function addLoginRequirements() { /* Implementation omitted */ }
