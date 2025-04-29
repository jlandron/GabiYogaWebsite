// Mobile Navigation Menu Toggle
document.addEventListener('DOMContentLoaded', () => {
    // Load website settings and sections visibility first
    loadVisibilitySettings();
    
    // Fetch other data from API
    fetchWebsiteSettings();
    fetchClassSchedule();
    fetchWorkshops();
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
                
                // Save booking to the API
                try {
                    const response = await fetch('/api/private-sessions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
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
                        }),
                        credentials: 'include' // Include cookies for auth
                    });
                    
                    if (response.ok) {
                        console.log('Private session booking saved successfully');
                    } else {
                        console.warn('Error saving private session booking:', await response.text());
                    }
                } catch (error) {
                    console.error('Error submitting private session booking:', error);
                }
                
                // Show success message
                alert(`Thank you${name ? ', ' + name : ''}! Your ${packageName} focusing on ${focusNames[sessionFocus]} has been requested for ${date1} at ${time1}. I'll contact you within 24 hours to confirm your booking.`);
                
                privateBookingModal.style.display = 'none';
                document.body.style.overflow = '';
                privateBookingForm.reset();
            });
        }
    }
    
    // Private sessions buttons event handlers
    if (privateSessionBtn) {
        privateSessionBtn.addEventListener('click', () => {
            openPrivateBookingModal();
        });
    }
    
    // Private sessions section main CTA button
    const privateSectionsBtn = document.getElementById('private-sessions-btn');
    if (privateSectionsBtn) {
        privateSectionsBtn.addEventListener('click', () => {
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
    
    // Build the packageNames lookup table for the success message
    window.sessionPackageData = {};
    packages.forEach(pkg => {
        // Skip packages without an id
        if (!pkg.id) return;
        
        window.sessionPackageData[pkg.id] = {
            name: pkg.name,
            price: pkg.price,
            duration: pkg.session_duration || 60
        };
    });
    
    console.log('Session package data loaded:', window.sessionPackageData);
}

// Function to load visibility settings from the API and apply them
function loadVisibilitySettings() {
    fetch('/api/settings')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch settings data');
            }
            
            // Try to parse as text first to check for valid JSON
            return response.text().then(text => {
                try {
                    // Try to parse as JSON
                    return JSON.parse(text);
                } catch (err) {
                    console.error('Invalid JSON in API response:', text.substring(0, 100) + '...');
                    throw new Error('Invalid JSON response from server');
                }
            });
        })
        .then(data => {
            if (data.success && data.settings && data.settings.sectionToggles) {
                applyVisibilitySettings(data.settings.sectionToggles);
                
                // Only fetch retreats data if the section is enabled
                if (data.settings.sectionToggles.retreatsSection) {
                    fetchRetreats();
                } else {
                    // Hide retreats section if it's disabled
                    const retreatsSection = document.getElementById('retreats');
                    if (retreatsSection) {
                        retreatsSection.style.display = 'none';
                    }
                    
                    // Also hide any links to retreats section
                    const retreatLinks = document.querySelectorAll('a[href="#retreats"]');
                    retreatLinks.forEach(link => {
                        link.parentElement.style.display = 'none';
                    });
                }
            }
        })
        .catch(error => {
            console.error('Error loading visibility settings:', error);
        });
}

// Function to apply visibility settings from the admin panel
function applyVisibilitySettings(sectionToggles) {
    // Apply section visibility settings
    if (!sectionToggles.gallerySection) {
        const gallerySection = document.getElementById('gallery');
        if (gallerySection) {
            gallerySection.style.display = 'none';
        }
    }
    
    if (!sectionToggles.scheduleSection) {
        const scheduleSection = document.getElementById('schedule');
        if (scheduleSection) {
            scheduleSection.style.display = 'none';
        }
    }
    
    if (!sectionToggles.membershipSection) {
        const membershipSection = document.getElementById('membership');
        if (membershipSection) {
            membershipSection.style.display = 'none';
        }
    }
    
    if (!sectionToggles.privateSessionsSection) {
        const privateSessionsSection = document.getElementById('private-sessions');
        if (privateSessionsSection) {
            privateSessionsSection.style.display = 'none';
        }
        
        // Also hide any links to private sessions section
        const privateSessionsLinks = document.querySelectorAll('a[href="#private-sessions"]');
        privateSessionsLinks.forEach(link => {
            if (link.parentElement) {
                link.parentElement.style.display = 'none';
            }
        });
        
        // Disable private session buttons
        const privateSessionBtns = document.querySelectorAll('#private-session-btn, #private-sessions-btn');
        privateSessionBtns.forEach(btn => {
            btn.style.display = 'none';
        });
    }
    
    if (!sectionToggles.privateLessonsSection) {
        // Hide the Private Lessons offering card in the offerings section
        const privateLessonsCard = document.querySelector('.offering-card:nth-child(2)');
        if (privateLessonsCard) {
            privateLessonsCard.style.display = 'none';
        }
        
        // Also hide any links specifically to private lessons (separate from private sessions)
        const privateLessonsLinks = document.querySelectorAll('a[href="#private-lessons"]');
        privateLessonsLinks.forEach(link => {
            if (link.parentElement) {
                link.parentElement.style.display = 'none';
            }
        });
    }
    
    // Apply offering buttons visibility
    if (!sectionToggles.groupClasses) {
        const groupClassesCard = document.querySelector('.offering-card:nth-child(1)');
        if (groupClassesCard) {
            groupClassesCard.style.display = 'none';
        }
    }
    
    if (!sectionToggles.privateLessons) {
        const privateLessonsCard = document.querySelector('.offering-card:nth-child(2)');
        if (privateLessonsCard) {
            privateLessonsCard.style.display = 'none';
        }
    }
    
    if (!sectionToggles.workshops) {
        const workshopsCard = document.querySelector('.offering-card:nth-child(3)');
        if (workshopsCard) {
            workshopsCard.style.display = 'none';
        }
    }
    
    if (!sectionToggles.retreats) {
        const retreatsCard = document.querySelector('.offering-card:nth-child(4)');
        if (retreatsCard) {
            retreatsCard.style.display = 'none';
        }
    }
}

// Function to apply website settings from API data
function applyWebsiteSettings(settings) {
    // Apply hero text settings
    if (settings.heroText) {
        const heroTitle = document.querySelector('.hero-content h1');
        const heroSubtitle = document.querySelector('.hero-content p');
        
        if (heroTitle && settings.heroText.title) {
            heroTitle.textContent = settings.heroText.title;
        }
        
        if (heroSubtitle && settings.heroText.subtitle) {
            heroSubtitle.textContent = settings.heroText.subtitle;
        }
    }
    
    // Apply about section content
    if (settings.about) {
        const aboutName = document.querySelector('.about-text h3');
        const aboutSubtitle = document.querySelector('.about-text .subtitle');
        const aboutParagraphs = document.querySelectorAll('.about-text > p:not(.subtitle)');
        
        if (aboutName && settings.about.name) {
            aboutName.textContent = settings.about.name;
        }
        
        if (aboutSubtitle && settings.about.subtitle) {
            aboutSubtitle.textContent = settings.about.subtitle;
        }
        
        if (aboutParagraphs && settings.about.bio) {
            // Split bio into paragraphs for better readability
            const paragraphs = settings.about.bio.split('\n\n');
            
            // Update existing paragraph elements
            for (let i = 0; i < Math.min(aboutParagraphs.length, paragraphs.length); i++) {
                aboutParagraphs[i].textContent = paragraphs[i];
            }
        }
    }
    
    // Apply certifications
    if (settings.certifications && settings.certifications.length > 0) {
        const certsList = document.querySelector('.certifications ul');
        
        if (certsList) {
            // Clear existing items
            certsList.innerHTML = '';
            
            // Add each certification
            settings.certifications.forEach(cert => {
                const li = document.createElement('li');
                li.textContent = cert;
                certsList.appendChild(li);
            });
        }
    }
    
    // Apply contact information
    if (settings.contactInfo) {
        const addressElem = document.querySelector('.contact-info p:nth-child(2)');
        const phoneElem = document.querySelector('.contact-info p:nth-child(3)');
        const emailElem = document.querySelector('.contact-info p:nth-child(4)');
        
        if (addressElem && settings.contactInfo.address) {
            addressElem.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${settings.contactInfo.address}`;
        }
        
        if (phoneElem && settings.contactInfo.phone) {
            phoneElem.innerHTML = `<i class="fas fa-phone"></i> ${settings.contactInfo.phone}`;
        }
        
        if (emailElem && settings.contactInfo.email) {
            emailElem.innerHTML = `<i class="fas fa-envelope"></i> ${settings.contactInfo.email}`;
        }
        
        // Update social media links
        if (settings.contactInfo.socialMedia) {
            const fbLink = document.querySelector('.social-links a:nth-child(1)');
            const igLink = document.querySelector('.social-links a:nth-child(2)');
            const ytLink = document.querySelector('.social-links a:nth-child(3)');
            
            if (fbLink && settings.contactInfo.socialMedia.facebook) {
                fbLink.href = settings.contactInfo.socialMedia.facebook;
            }
            
            if (igLink && settings.contactInfo.socialMedia.instagram) {
                igLink.href = settings.contactInfo.socialMedia.instagram;
            }
            
            if (ytLink && settings.contactInfo.socialMedia.youtube) {
                ytLink.href = settings.contactInfo.socialMedia.youtube;
            }
        }
    }
}

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

// Function to check if user is logged in and prompt if needed
function loginPrompt(event, redirectUrl) {
    event.preventDefault();
    
    // Check if user is logged in (this would typically query a session cookie or token)
    // For demo purposes, we'll just use localStorage
    const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
    
    if (!isLoggedIn) {
        // If not logged in, ask user to login
        const wantsLogin = confirm('You need to be logged in to access this feature. Would you like to log in now?');
        
        if (wantsLogin) {
            // Store the page they wanted to access for redirection after login
            if (redirectUrl) {
                localStorage.setItem('loginRedirect', redirectUrl);
            }
            
            // Redirect to login page
            window.location.href = 'login.html';
            return false;
        }
        return false;
    }
    
    // If logged in, allow the action to proceed
    return true;
}

// Function to render class schedule data
function renderClassSchedule(scheduleData) {
    const scheduleTable = document.querySelector('.schedule-table tbody');
    
    if (!scheduleTable || !scheduleData || !scheduleData.length) {
        // If no schedule data, show message
        if (scheduleTable) {
            scheduleTable.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center;padding:20px;">
                        No classes currently scheduled. Please check back later.
                    </td>
                </tr>
            `;
        }
        return;
    }
    
    // Clear loading message
    scheduleTable.innerHTML = '';
    
    // Time slots (rows)
    const timeSlots = [
        '7:00 AM', 
        '9:00 AM', 
        '10:30 AM', 
        '12:00 PM', 
        '4:30 PM', 
        '6:00 PM', 
        '7:30 PM'
    ];
    
    // Create a row for each time slot
    timeSlots.forEach(timeSlot => {
        const row = document.createElement('tr');
        
        // Add time cell
        const timeCell = document.createElement('td');
        timeCell.textContent = timeSlot;
        row.appendChild(timeCell);
        
        // Add a cell for each day of the week
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].forEach(dayOfWeek => {
            const cell = document.createElement('td');
            
            // Find class for this day and time
            const classData = scheduleData.find(c => 
                c.day === dayOfWeek && 
                c.time === timeSlot
            );
            
            if (classData) {
                cell.innerHTML = `
                    <strong>${classData.name}</strong><br>
                    <span class="instructor">${classData.instructor}</span>
                `;
                
                // Add classes for styling based on class type
                if (classData.type) {
                    cell.classList.add(`class-${classData.type.toLowerCase().replace(/\s+/g, '-')}`);
                }
            } else {
                cell.innerHTML = '—';
            }
            
            row.appendChild(cell);
        });
        
        scheduleTable.appendChild(row);
    });
}

// Function to render workshops data
function renderWorkshops(workshopsData) {
    // This function would populate the workshops modal
    // For now, we'll just log the data
    console.log('Workshops data loaded:', workshopsData);
    
    // The workshops are already in the HTML as static content
    // In a real implementation, we would dynamically generate the workshop cards
}

// Function to render retreats data
function renderRetreats(retreatsData) {
    // This function would populate the retreats section
    // For now, we'll just log the data
    console.log('Retreats data loaded:', retreatsData);
    
    const retreatsGrid = document.querySelector('.retreats-grid');
    
    if (!retreatsGrid || !retreatsData || !retreatsData.length) {
        return;
    }
    
    // Clear any existing retreat cards
    retreatsGrid.innerHTML = '';
    
    // Add each retreat
    retreatsData.forEach(retreat => {
        const retreatCard = document.createElement('div');
        retreatCard.className = 'retreat-card';
        
        retreatCard.innerHTML = `
            <div class="retreat-image">
                <img src="${retreat.imageUrl || 'images/DSC02638.JPG'}" alt="${retreat.name}">
            </div>
            <div class="retreat-content">
                <h3>${retreat.name}</h3>
                <p class="retreat-location"><i class="fas fa-map-marker-alt"></i> ${retreat.location}</p>
                <p class="retreat-date"><i class="far fa-calendar-alt"></i> ${retreat.dateRange}</p>
                <p class="retreat-price"><i class="fas fa-tag"></i> From $${retreat.price}</p>
                <p class="retreat-description">${retreat.description}</p>
                <a href="#" class="btn" data-retreat-id="${retreat.id}">Learn More</a>
            </div>
        `;
        
        retreatsGrid.appendChild(retreatCard);
    });
    
    // Add event listeners to the new Learn More buttons
    document.querySelectorAll('.retreat-card .btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (loginPrompt(e, 'dashboard.html#retreats')) {
                // If logged in, redirect to the dashboard retreats panel
                window.location.href = 'dashboard.html#retreats';
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
