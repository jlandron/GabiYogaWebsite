// Mobile Navigation Menu Toggle
// Function to fetch class schedule data
async function fetchClassSchedule() {
    try {
        const response = await fetch('/api/schedule');
        
        if (!response.ok) {
            throw new Error('Failed to fetch schedule');
        }
        
        const data = await response.json();
        
        if (data.success) {
            renderClassSchedule(data.schedule);
        } else {
            console.error('Error fetching schedule:', data.message);
        }
    } catch (error) {
        console.error('Error fetching schedule:', error);
    }
}

// Function to render the class schedule
function renderClassSchedule(schedule) {
    const scheduleTable = document.querySelector('.schedule-table tbody');
    
    if (!scheduleTable) {
        return;
    }
    
    // Clear existing rows
    scheduleTable.innerHTML = '';
    
    // Get sorted class times across all days for the rows
    const allTimes = new Set();
    
    for (let day = 0; day <= 6; day++) {
        schedule[day].forEach(classInfo => {
            allTimes.add(classInfo.start_time);
        });
    }
    
    // Convert to array and sort
    const timeArray = Array.from(allTimes).sort();
    
    // For each time slot, create a row
    timeArray.forEach(time => {
        const row = document.createElement('tr');
        
        // Format the time to display (e.g., convert "07:00:00" to "7:00 AM")
        const formattedTime = formatTimeDisplay(time);
        
        // Add time cell
        const timeCell = document.createElement('td');
        timeCell.textContent = formattedTime;
        row.appendChild(timeCell);
        
        // Add cells for each day of week (Sunday is 0, but we want to display Mon-Sun)
        for (let day = 1; day <= 7; day++) {
            const dayIndex = day % 7; // Convert to 0-6 range (Mon=1 -> 1, Sun=7 -> 0)
            const dayClasses = schedule[dayIndex].filter(classInfo => classInfo.start_time === time);
            
            const dayCell = document.createElement('td');
            
            if (dayClasses.length > 0) {
                dayCell.textContent = dayClasses[0].name;
                // Add class level as a data attribute for potential styling
                if (dayClasses[0].level) {
                    dayCell.dataset.level = dayClasses[0].level;
                }
            } else {
                dayCell.textContent = '-';
            }
            
            row.appendChild(dayCell);
        }
        
        scheduleTable.appendChild(row);
    });
}

// Helper function to format time
function formatTimeDisplay(timeString) {
    // Extract hours and minutes from the time string (format: "HH:MM:SS")
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    
    // Determine if it's AM or PM
    const period = hour >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    
    // Return formatted time (e.g., "7:00 AM")
    return `${hour12}:${minutes} ${period}`;
}

// Function to fetch workshop data
async function fetchWorkshops() {
    try {
        const response = await fetch('/api/workshops');
        
        if (!response.ok) {
            throw new Error('Failed to fetch workshops');
        }
        
        const data = await response.json();
        
        if (data.success) {
            renderWorkshops(data.workshops);
        } else {
            console.error('Error fetching workshops:', data.message);
        }
    } catch (error) {
        console.error('Error fetching workshops:', error);
    }
}

// Function to render the workshops
function renderWorkshops(workshops) {
    const workshopsGrid = document.querySelector('#workshops-modal .workshops-grid');
    
    if (!workshopsGrid || workshops.length === 0) {
        return;
    }
    
    // Clear existing workshops
    workshopsGrid.innerHTML = '';
    
    // Add up to 4 workshops
    workshops.slice(0, 4).forEach(workshop => {
        const workshopDate = new Date(workshop.date);
        const formattedDate = workshopDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        const workshopCard = document.createElement('div');
        workshopCard.className = 'workshop-card';
        
        workshopCard.innerHTML = `
            <div class="workshop-date">
                <div class="date-box">
                    <span class="month">${workshopDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span>
                    <span class="day">${workshopDate.getDate()}</span>
                    <span class="year">${workshopDate.getFullYear()}</span>
                </div>
                <div class="time">${workshop.start_time.slice(0, 5)} - ${workshop.end_time.slice(0, 5)}</div>
            </div>
            <div class="workshop-details">
                <h3>${workshop.title}</h3>
                <p class="instructor"><i class="fas fa-user"></i> ${workshop.instructor}</p>
                <p class="location"><i class="fas fa-map-marker-alt"></i> ${workshop.location || 'Main Studio'}</p>
                <p class="workshop-description">${workshop.description}</p>
                <div class="workshop-pricing">
                    <span class="workshop-price">$${workshop.price}</span>
                    ${workshop.member_price ? `<span class="member-price">$${workshop.member_price} for members</span>` : ''}
                </div>
                <button class="btn-small workshop-signup-btn" data-workshop="${workshop.workshop_slug}">Register Now</button>
            </div>
        `;
        
        workshopsGrid.appendChild(workshopCard);
    });
    
    // Update workshop data lookup object for registration
    updateWorkshopData(workshops);
    
    // Attach event listeners to new workshop signup buttons
    setTimeout(() => {
        attachWorkshopSignupListeners();
    }, 0);
}

// Function to update workshop data lookup
function updateWorkshopData(workshops) {
    window.workshopData = {};
    
    workshops.forEach(workshop => {
        const workshopDate = new Date(workshop.date);
        const formattedDate = workshopDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const formattedTime = `${workshop.start_time.slice(0, 5)} - ${workshop.end_time.slice(0, 5)}`;
        
        window.workshopData[workshop.workshop_slug] = {
            title: workshop.title,
            date: formattedDate,
            time: formattedTime,
            price: `$${workshop.price}`,
            memberPrice: workshop.member_price ? `$${workshop.member_price}` : null
        };
    });
}

// Function to attach event listeners to workshop signup buttons
function attachWorkshopSignupListeners() {
    // Select all buttons (including dynamically added ones)
    const allWorkshopBtns = document.querySelectorAll('.workshop-signup-btn');
    
    allWorkshopBtns.forEach(btn => {
        // Remove any existing listeners to prevent duplicates
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        // Add fresh event listener
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const workshopId = newBtn.getAttribute('data-workshop');
            
            // With login requirements, redirect to login or members page
            if (loginPrompt(e, 'dashboard.html#workshops')) {
                // If logged in, redirect to the dashboard workshops panel
                window.location.href = 'dashboard.html#workshops';
            }
        });
    });
}

// Function to fetch retreat data
async function fetchRetreats() {
    try {
        const response = await fetch('/api/retreats/featured');
        
        if (!response.ok) {
            throw new Error('Failed to fetch retreats');
        }
        
        const data = await response.json();
        
        if (data.success) {
            renderRetreats(data.retreats);
        } else {
            console.error('Error fetching retreats:', data.message);
        }
    } catch (error) {
        console.error('Error fetching retreats:', error);
    }
}

// Function to render the retreats
function renderRetreats(retreats) {
    const retreatsGrid = document.querySelector('.retreats-grid');
    
    if (!retreatsGrid || retreats.length === 0) {
        return;
    }
    
    // Clear existing retreats
    retreatsGrid.innerHTML = '';
    
    // Add up to 3 retreats
    retreats.slice(0, 3).forEach(retreat => {
        const startDate = new Date(retreat.start_date);
        const endDate = new Date(retreat.end_date);
        
        const formattedDateRange = `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
        
        const retreatCard = document.createElement('div');
        retreatCard.className = 'retreat-card';
        
        retreatCard.innerHTML = `
            <div class="retreat-image">
                <img src="${retreat.image_url || 'images/DSC02638.JPG'}" alt="${retreat.title}">
            </div>
            <div class="retreat-content">
                <h3>${retreat.title}</h3>
                <p class="retreat-location"><i class="fas fa-map-marker-alt"></i> ${retreat.location}</p>
                <p class="retreat-date"><i class="far fa-calendar-alt"></i> ${formattedDateRange}</p>
                <p class="retreat-price"><i class="fas fa-tag"></i> From $${retreat.price}</p>
                <p class="retreat-description">${retreat.description.substring(0, 120)}${retreat.description.length > 120 ? '...' : ''}</p>
                <a href="#" class="btn" data-retreat="${retreat.retreat_slug}">Learn More</a>
            </div>
        `;
        
        retreatsGrid.appendChild(retreatCard);
    });
}

// Function to fetch website settings
async function fetchWebsiteSettings() {
    try {
        const response = await fetch('/api/website-settings');
        
        if (!response.ok) {
            throw new Error('Failed to fetch website settings');
        }
        
        const data = await response.json();
        
        if (data.success) {
            applyWebsiteSettings(data.settings);
        } else {
            console.error('Error fetching website settings:', data.message);
        }
    } catch (error) {
        console.error('Error fetching website settings:', error);
        // Continue with default settings if there's an error
    }
}

// Function to apply website settings to the homepage
function applyWebsiteSettings(settings) {
    if (!settings) return;
    
    // Update About section with instructor data
    if (settings.about) {
        const nameElement = document.querySelector('#about .about-text h3');
        const subtitleElement = document.querySelector('#about .about-text .subtitle');
        const bioElements = document.querySelectorAll('#about .about-text p:not(.subtitle)');
        const profileImage = document.querySelector('#about .about-image img');
        
        if (nameElement) nameElement.textContent = settings.about.name;
        if (subtitleElement) subtitleElement.textContent = settings.about.subtitle;
        
        if (bioElements.length > 0 && settings.about.bio) {
            // Split the bio into paragraphs
            const paragraphs = settings.about.bio.split('\n\n');
            
            // Update existing paragraphs
            for (let i = 0; i < Math.min(bioElements.length, paragraphs.length); i++) {
                bioElements[i].textContent = paragraphs[i];
            }
        }
        
        // Update profile photo if available
        if (profileImage && settings.about.profilePhoto) {
            profileImage.src = settings.about.profilePhoto;
        }
    }
    
    // Update certifications if available
    if (settings.certifications && settings.certifications.length > 0) {
        const certList = document.querySelector('#about .certifications ul');
        
        if (certList) {
            // Clear existing certifications
            certList.innerHTML = '';
            
            // Add certifications from settings
            settings.certifications.forEach(cert => {
                const li = document.createElement('li');
                li.textContent = cert;
                certList.appendChild(li);
            });
        }
    }
    
    // Apply section toggles to show/hide homepage sections
    if (settings.sectionToggles) {
        const toggles = settings.sectionToggles;
        
        // Handle offerings section toggles
        const offeringCards = document.querySelectorAll('.offerings-grid .offering-card');
        if (offeringCards.length >= 4) {
            if (!toggles.groupClasses) offeringCards[0].style.display = 'none';
            if (!toggles.privateLessons) offeringCards[1].style.display = 'none';
            if (!toggles.workshops) offeringCards[2].style.display = 'none';
            if (!toggles.retreats) offeringCards[3].style.display = 'none';
        }
        
        // Handle other section toggles
        const retreatsSection = document.getElementById('retreats');
        const scheduleSection = document.getElementById('schedule');
        const membershipSection = document.getElementById('membership');
        const gallerySection = document.getElementById('gallery');
        
        if (retreatsSection) retreatsSection.style.display = toggles.retreatsSection ? 'block' : 'none';
        if (scheduleSection) scheduleSection.style.display = toggles.scheduleSection ? 'block' : 'none';
        if (membershipSection) membershipSection.style.display = toggles.membershipSection ? 'block' : 'none';
        if (gallerySection) gallerySection.style.display = toggles.gallerySection ? 'block' : 'none';
    }
    
    // Update contact information
    if (settings.contactInfo) {
        // Update address, phone, email
        const addressElement = document.querySelector('.contact-info p:nth-child(2)');
        const phoneElement = document.querySelector('.contact-info p:nth-child(3)');
        const emailElement = document.querySelector('.contact-info p:nth-child(4)');
        
        if (addressElement) addressElement.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${settings.contactInfo.address}`;
        if (phoneElement) phoneElement.innerHTML = `<i class="fas fa-phone"></i> ${settings.contactInfo.phone}`;
        if (emailElement) emailElement.innerHTML = `<i class="fas fa-envelope"></i> ${settings.contactInfo.email}`;
        
        // Update social media links
        if (settings.contactInfo.socialMedia) {
            const socialLinks = document.querySelectorAll('.social-links a');
            if (socialLinks.length >= 3) {
                if (settings.contactInfo.socialMedia.facebook) {
                    socialLinks[0].href = settings.contactInfo.socialMedia.facebook;
                }
                if (settings.contactInfo.socialMedia.instagram) {
                    socialLinks[1].href = settings.contactInfo.socialMedia.instagram;
                }
                if (settings.contactInfo.socialMedia.youtube) {
                    socialLinks[2].href = settings.contactInfo.socialMedia.youtube;
                }
            }
        }
    }
}

// Check if user is logged in
const isUserLoggedIn = () => {
    return localStorage.getItem('auth_token') && localStorage.getItem('user_info');
};

// Function to redirect to login or show login prompt
const loginPrompt = (e, destination = null) => {
    e.preventDefault();
    
    if (!isUserLoggedIn()) {
        const targetUrl = destination ? 
            `login.html?redirect=${encodeURIComponent(destination)}` : 
            'login.html';
        
        // Show a message before redirecting
        if (confirm('Please log in to your account to continue. Would you like to log in now?')) {
            window.location.href = targetUrl;
        }
        return false;
    }
    
    return true;
};

// Add login checks to all signup and booking buttons
const addLoginRequirements = () => {
    // Class signup button
    const signupBtn = document.getElementById('signup-btn');
    if (signupBtn) {
        signupBtn.addEventListener('click', (e) => {
            if (loginPrompt(e, 'dashboard.html#bookings')) {
                // If logged in, redirect to the dashboard bookings panel
                window.location.href = 'dashboard.html#bookings';
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
    
    // Retreat "Learn More" buttons
    document.querySelectorAll('.retreat-card .btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (loginPrompt(e, 'dashboard.html#retreats')) {
                // If logged in, redirect to the dashboard retreats panel
                window.location.href = 'dashboard.html#retreats';
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
    
    // Private sessions button
    const privateSessionBtn = document.getElementById('private-session-btn');
    if (privateSessionBtn) {
        privateSessionBtn.addEventListener('click', (e) => {
            if (loginPrompt(e, 'dashboard.html#private-sessions')) {
                // If logged in, redirect to the dashboard private sessions panel
                window.location.href = 'dashboard.html#private-sessions';
            }
        });
    }
    
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

document.addEventListener('DOMContentLoaded', () => {
    // Fetch data from API
    fetchWebsiteSettings();
    fetchClassSchedule();
    fetchWorkshops();
    fetchRetreats();
    
    // Initialize login requirements for all buttons
    addLoginRequirements();
    
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    // Find the "Upcoming Workshops" button
    const workshopsBtn = document.querySelector('a[href="#events"]');
    const workshopsModal = document.getElementById('workshops-modal');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
        
        // Close menu when clicking a nav link on mobile
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }
    
    // Modal functionality for class sign-up
    const modal = document.getElementById('signup-modal');
    const signupBtn = document.getElementById('signup-btn');
    const closeModal = document.querySelector('#signup-modal .close-modal');
    
    if (modal && signupBtn && closeModal) {
        closeModal.addEventListener('click', () => {
            modal.style.display = 'none';
            document.body.style.overflow = ''; // Re-enable scrolling
        });
        
        // Close modal when clicking outside of it
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
        
        // Populate the class select dropdown based on available classes
        const populateClassOptions = async () => {
            try {
                const response = await fetch('/api/schedule');
                
                if (!response.ok) {
                    throw new Error('Failed to fetch schedule');
                }
                
                const data = await response.json();
                
                if (data.success) {
                    const classSelect = document.getElementById('class-select');
                    
                    if (classSelect) {
                        // Clear existing options (except the placeholder)
                        while (classSelect.options.length > 1) {
                            classSelect.options.remove(1);
                        }
                        
                        // Add classes from each day
                        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        
                        for (let day = 0; day <= 6; day++) {
                            const classes = data.schedule[day];
                            
                            if (classes && classes.length > 0) {
                                classes.forEach(classInfo => {
                                    const formattedTime = formatTimeDisplay(classInfo.start_time);
                                    const optionValue = `class-${classInfo.class_id}`;
                                    const optionText = `${dayNames[day]} ${formattedTime} - ${classInfo.name}`;
                                    
                                    const option = document.createElement('option');
                                    option.value = optionValue;
                                    option.textContent = optionText;
                                    classSelect.appendChild(option);
                                });
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error populating class options:', error);
            }
        };

        // Handle class signup form submission
        const classSignupForm = document.getElementById('class-signup-form');
        if (classSignupForm) {
            classSignupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // In a real application, you would send this data to a server
                const classSelectElement = document.getElementById('class-select');
                const classSelected = classSelectElement.value;
                const classText = classSelectElement.options[classSelectElement.selectedIndex].text;
                const name = document.getElementById('signup-name').value;
                const email = document.getElementById('signup-email').value;
                const paymentMethod = document.getElementById('payment-method').value;
                
                // For demonstration purposes, show success message
                alert(`Thank you, ${name}! Your spot for "${classText}" has been reserved. A confirmation email will be sent to ${email}.`);
                modal.style.display = 'none';
                document.body.style.overflow = '';
                classSignupForm.reset();
            });
        }
    }
    
    // Workshops Modal functionality
    if (workshopsBtn && workshopsModal) {
        const closeWorkshopsModal = workshopsModal.querySelector('.close-modal');
        
        // Close modal with X button
        if (closeWorkshopsModal) {
            closeWorkshopsModal.addEventListener('click', () => {
                workshopsModal.style.display = 'none';
                document.body.style.overflow = ''; // Re-enable scrolling
            });
        }
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === workshopsModal) {
                workshopsModal.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
    }
    
    // Workshop Signup Functionality
    const workshopSignupModal = document.getElementById('workshop-signup-modal');
    
    if (workshopSignupModal) {
        const closeWorkshopSignupModal = workshopSignupModal.querySelector('.close-modal');
        const workshopForm = document.getElementById('workshop-signup-form');
        
        // Close button functionality
        if (closeWorkshopSignupModal) {
            closeWorkshopSignupModal.addEventListener('click', () => {
                workshopSignupModal.style.display = 'none';
                document.body.style.overflow = '';
            });
        }
        
        // Click outside to close
        window.addEventListener('click', (e) => {
            if (e.target === workshopSignupModal) {
                workshopSignupModal.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
        
        // Handle workshop signup form submission
        if (workshopForm) {
            workshopForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // Get form values
                const workshopTitle = document.getElementById('workshop-title').value;
                const workshopDate = document.getElementById('workshop-date').value;
                const name = document.getElementById('workshop-name').value;
                const email = document.getElementById('workshop-email').value;
                const isMember = document.getElementById('workshop-member').value === 'member';
                const paymentChoice = document.querySelector('input[name="payment"]:checked').value;
                
                // Show success message
                const paymentMethod = paymentChoice === 'now' ? 'online payment' : 'payment at the studio';
                const priceType = isMember ? 'member price' : 'regular price';
                
                alert(`Thank you, ${name}! Your registration for "${workshopTitle}" on ${workshopDate} has been received. We'll send a confirmation email to ${email} with ${priceType} details and ${paymentMethod} instructions.`);
                
                // Close modal and reset form
                workshopSignupModal.style.display = 'none';
                document.body.style.overflow = '';
                workshopForm.reset();
            });
        }
    }
    
    // Private Session Booking Modal functionality
    const privateBookingModal = document.getElementById('private-booking-modal');
    const closePrivateModal = document.querySelector('#private-booking-modal .close-modal');
    
    if (privateBookingModal && closePrivateModal) {
        // Function to open private booking modal
        function openPrivateBookingModal(packageIndex = null) {
            // Set the default package selection based on which button was clicked
            if (packageIndex !== null) {
                const sessionTypeSelect = document.getElementById('session-type');
                if (sessionTypeSelect) {
                    if (packageIndex === 0) {
                        sessionTypeSelect.value = 'single';
                    } else if (packageIndex === 1) {
                        sessionTypeSelect.value = 'three-pack';
                    } else if (packageIndex === 2) {
                        sessionTypeSelect.value = 'five-pack';
                    }
                }
            }
            
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
                const sessionType = document.getElementById('session-type').value;
                const sessionFocus = document.getElementById('session-focus').value;
                const date1 = document.getElementById('date1').value;
                const time1 = document.getElementById('time1').value;
                const name = document.getElementById('booking-name').value;
                const email = document.getElementById('booking-email').value;
                const phone = document.getElementById('booking-phone').value;
                
                // Package type names for the alert message
                const packageNames = {
                    'single': 'Single Session',
                    'three-pack': '3-Session Package',
                    'five-pack': '5-Session Package'
                };
                
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
                
                // For demonstration purposes, show success message
                alert(`Thank you, ${name}! Your ${packageNames[sessionType]} focusing on ${focusNames[sessionFocus]} has been requested for ${date1} at ${time1}. I'll contact you within 24 hours at ${email} or ${phone} to confirm your booking.`);
                
                privateBookingModal.style.display = 'none';
                document.body.style.overflow = '';
                privateBookingForm.reset();
            });
        }
    }
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            if (this.getAttribute('href') !== '#') {
                // Skip login-required links
                if (this.classList.contains('pricing-btn') || 
                    this.classList.contains('workshop-signup-btn') ||
                    this.getAttribute('href') === '#events') {
                    return; // These are handled by login requirements
                }
                
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    const headerOffset = 80;
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                    
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
    
    // Form validation for the contact form
    const contactForm = document.querySelector('.contact-form form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // In a real application, you would send this data to a server
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const subject = document.getElementById('subject').value;
            const message = document.getElementById('message').value;
            
            // For demonstration purposes, show success message
            alert(`Thank you for your message, ${name}! I'll get back to you as soon as possible.`);
            contactForm.reset();
        });
    }
    
    // Newsletter form submission
    const newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = newsletterForm.querySelector('input[type="email"]').value;
            
            // For demonstration purposes, show success message
            alert(`Thank you for subscribing! You'll receive updates at ${email}.`);
            newsletterForm.reset();
        });
    }
});

// Add a simple animation on scroll effect to elements
window.addEventListener('scroll', () => {
    const elements = document.querySelectorAll('.offering-card, .pricing-card, .retreat-card, .gallery-item');
    
    elements.forEach(element => {
        const position = element.getBoundingClientRect().top;
        const screenHeight = window.innerHeight;
        
        // If element is in viewport
        if (position < screenHeight * 0.9) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }
    });
});

// Initialize elements with initial state for animations
document.addEventListener('DOMContentLoaded', () => {
    const elements = document.querySelectorAll('.offering-card, .pricing-card, .retreat-card, .gallery-item');
    
    elements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
    
    // Trigger initial check
    setTimeout(() => {
        window.dispatchEvent(new Event('scroll'));
    }, 100);
});
