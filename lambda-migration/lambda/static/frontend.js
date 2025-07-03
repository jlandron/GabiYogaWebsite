const API_BASE_URL = window.location.origin + '/dev';

// Gallery state
let isTransitioning = false;
let allImages = [];
let featuredImages = [];
let currentSlide = 0;
let autoRotateInterval = null;
let isPaused = false;

// Calendar state
let currentDate = new Date();
let allClasses = [];
let calendarClasses = {};

// Load all content when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadGallery();
    loadAboutMe();
    loadClassSchedule();
    loadLatestBlog();
    checkUserRole();
});

// Global settings object
let siteSettings = {};

// Load site settings from API
async function loadSettings() {
    try {
        console.log('Loading settings from:', API_BASE_URL + '/settings');
        const response = await fetch(API_BASE_URL + '/settings');
        const data = await response.json();
        
        if (data.success) {
            siteSettings = data.categorized || {};
            
            // Update page title and meta description
            if (siteSettings.general && siteSettings.general.site_title) {
                document.title = siteSettings.general.site_title;
            }
            
            // Update hero section with dynamic content
            if (siteSettings.homepage) {
                const heroTitle = document.querySelector('.hero-content h1');
                const heroSubtitle = document.querySelector('.hero-content p');
                
                if (heroTitle && siteSettings.homepage.hero_title) {
                    heroTitle.textContent = siteSettings.homepage.hero_title;
                }
                
                if (heroSubtitle && siteSettings.homepage.hero_subtitle) {
                    heroSubtitle.textContent = siteSettings.homepage.hero_subtitle;
                }
            }
            
            console.log('✅ Loaded site settings');
        } else {
            throw new Error('Invalid settings response');
        }
    } catch (error) {
        console.error('❌ Error loading site settings:', error);
    }
}

// Load gallery images from Lambda API
async function loadGallery() {
    try {
        console.log('Loading gallery from:', API_BASE_URL + '/gallery');
        const response = await fetch(API_BASE_URL + '/gallery');
        const data = await response.json();
        
        const galleryLoading = document.getElementById('gallery-loading');
        const galleryCarousel = document.getElementById('gallery-carousel');
        
        if (data.success && data.images) {
            allImages = data.images.map(image => ({
                ...image,
                imageUrl: image.imageUrl,
                thumbnailUrl: image.thumbnailUrl || image.imageUrl
            }));
            
            // Only show images marked as featured
            featuredImages = allImages.filter(img => img.featured === true);
            if (featuredImages.length === 0) {
                // If no featured images, use first 6 as fallback
                featuredImages = allImages.slice(0, 6);
            }
            
            // Clear loading state
            galleryLoading.style.display = 'none';
            galleryCarousel.style.display = 'block';
            
            // Initialize carousel
            initializeCarousel();
            setupModalGallery();
            
            console.log('✅ Loaded gallery with', allImages.length, 'images,', featuredImages.length, 'featured');
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('❌ Error loading gallery:', error);
        document.getElementById('gallery-loading').innerHTML = 
            '<p style="color: #dc3545;"><strong>Error loading gallery</strong><br>' + error.message + '</p>';
    }
}

// Initialize carousel with featured images
function initializeCarousel() {
    const carouselTrack = document.getElementById('carousel-track');
    const carouselIndicators = document.getElementById('carousel-indicators');
    
    // Create carousel slides
    carouselTrack.innerHTML = featuredImages.map(function(image, index) {
        return '<div class="carousel-slide" data-index="' + index + '">' +
            '<img src="' + image.imageUrl + '" alt="' + (image.altText || image.title) + '" loading="' + (index === 0 ? 'eager' : 'lazy') + '">' +
        '</div>';
    }).join('');
    
    // Create indicators
    carouselIndicators.innerHTML = featuredImages.map(function(_, index) {
        return '<div class="carousel-indicator ' + (index === 0 ? 'active' : '') + '" data-slide="' + index + '"></div>';
    }).join('');
    
    // Setup carousel navigation
    setupCarouselNavigation();
    setupSidePreviewHandlers();
    
    // Initialize 3D positioning and side previews
    updateCarousel3D();
    updateSidePreviews();
}

// Setup carousel navigation and controls
function setupCarouselNavigation() {
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const indicators = document.querySelectorAll('.carousel-indicator');
    
    // Previous slide
    prevBtn.addEventListener('click', () => {
        if (isTransitioning) return;
        pauseAutoRotate();
        currentSlide = (currentSlide - 1 + featuredImages.length) % featuredImages.length;
        updateCarousel3D();
    });
    
    // Next slide
    nextBtn.addEventListener('click', () => {
        if (isTransitioning) return;
        pauseAutoRotate();
        currentSlide = (currentSlide + 1) % featuredImages.length;
        updateCarousel3D();
    });
    
    // Indicator clicks
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            if (isTransitioning || index === currentSlide) return;
            pauseAutoRotate();
            currentSlide = index;
            updateCarousel3D();
        });
    });
    
    // Start auto-play carousel
    startAutoRotate();
}

// Update carousel position and indicators with 3D animation
function updateCarousel3D() {
    if (isTransitioning) return;
    
    isTransitioning = true;
    const slides = document.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.carousel-indicator');
    
    slides.forEach((slide, index) => {
        const diff = index - currentSlide;
        let transform = '';
        let opacity = 1;
        let zIndex = 1;
        
        if (diff === 0) {
            // Current slide - center position
            transform = 'translateZ(0) rotateY(0deg) scale(1)';
            opacity = 1;
            zIndex = 10;
        } else if (diff === 1 || (diff === -(featuredImages.length - 1))) {
            // Next slide - right side
            transform = 'translateX(100%) translateZ(-200px) rotateY(-45deg) scale(0.8)';
            opacity = 0;
            zIndex = 5;
        } else if (diff === -1 || (diff === (featuredImages.length - 1))) {
            // Previous slide - left side
            transform = 'translateX(-100%) translateZ(-200px) rotateY(45deg) scale(0.8)';
            opacity = 0;
            zIndex = 5;
        } else {
            // Hidden slides
            transform = 'translateZ(-400px) scale(0.5)';
            opacity = 0;
            zIndex = 1;
        }
        
        slide.style.transform = transform;
        slide.style.opacity = opacity;
        slide.style.zIndex = zIndex;
    });
    
    // Update indicators
    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === currentSlide);
    });
    
    // Update side previews
    updateSidePreviews();
    
    // Reset transition flag after animation completes
    setTimeout(() => {
        isTransitioning = false;
    }, 800);
}

// Update side preview images
function updateSidePreviews() {
    if (featuredImages.length === 0) return;
    
    const leftPreview = document.getElementById('carousel-preview-left');
    const rightPreview = document.getElementById('carousel-preview-right');
    
    // Calculate prev/next indices
    const prevIndex = (currentSlide - 1 + featuredImages.length) % featuredImages.length;
    const nextIndex = (currentSlide + 1) % featuredImages.length;
    
    // Update left preview (previous image)
    const leftImg = leftPreview.querySelector('img');
    if (leftImg.src !== featuredImages[prevIndex].imageUrl) {
        leftImg.style.opacity = '0';
        setTimeout(() => {
            leftImg.src = featuredImages[prevIndex].imageUrl;
            leftImg.alt = featuredImages[prevIndex].altText || featuredImages[prevIndex].title;
            leftImg.style.opacity = '1';
        }, 200);
    }
    
    // Update right preview (next image)
    const rightImg = rightPreview.querySelector('img');
    if (rightImg.src !== featuredImages[nextIndex].imageUrl) {
        rightImg.style.opacity = '0';
        setTimeout(() => {
            rightImg.src = featuredImages[nextIndex].imageUrl;
            rightImg.alt = featuredImages[nextIndex].altText || featuredImages[nextIndex].title;
            rightImg.style.opacity = '1';
        }, 200);
    }
}

// Auto-rotation functions
function startAutoRotate() {
    if (autoRotateInterval) {
        clearInterval(autoRotateInterval);
    }
    autoRotateInterval = setInterval(() => {
        if (!isPaused && !isTransitioning) {
            currentSlide = (currentSlide + 1) % featuredImages.length;
            updateCarousel3D();
        }
    }, 5000);
}

function pauseAutoRotate() {
    isPaused = true;
    setTimeout(() => {
        isPaused = false;
    }, 10000);
}

// Setup side preview click handlers
function setupSidePreviewHandlers() {
    const leftPreview = document.getElementById('carousel-preview-left');
    const rightPreview = document.getElementById('carousel-preview-right');
    
    leftPreview.addEventListener('click', () => {
        if (isTransitioning) return;
        pauseAutoRotate();
        currentSlide = (currentSlide - 1 + featuredImages.length) % featuredImages.length;
        updateCarousel3D();
    });
    
    rightPreview.addEventListener('click', () => {
        if (isTransitioning) return;
        pauseAutoRotate();
        currentSlide = (currentSlide + 1) % featuredImages.length;
        updateCarousel3D();
    });
}

// Touch/swipe support for mobile carousel
let startX = 0;
let startY = 0;

document.getElementById('carousel-container').addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
});

document.getElementById('carousel-container').addEventListener('touchend', (e) => {
    if (!startX || !startY || isTransitioning) return;
    
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    
    const diffX = startX - endX;
    const diffY = startY - endY;
    
    // Only handle horizontal swipes
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        pauseAutoRotate();
        if (diffX > 0) {
            // Swipe left - next slide
            currentSlide = (currentSlide + 1) % featuredImages.length;
        } else {
            // Swipe right - previous slide
            currentSlide = (currentSlide - 1 + featuredImages.length) % featuredImages.length;
        }
        updateCarousel3D();
    }
    
    startX = 0;
    startY = 0;
});

// Setup modal gallery with masonry layout
function setupModalGallery() {
    const viewAllBtn = document.getElementById('view-all-btn');
    const modal = document.getElementById('gallery-modal');
    const modalClose = document.getElementById('modal-close');
    const masonryGrid = document.getElementById('masonry-grid');
    
    // Open modal
    viewAllBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Populate masonry grid
        masonryGrid.innerHTML = allImages.map(image => 
            '<div class="masonry-item">' +
                '<img src="' + image.thumbnailUrl + '" alt="' + (image.altText || image.title) + '" loading="lazy">' +
                '<div class="masonry-item-content">' +
                    '<h3>' + image.title + '</h3>' +
                    '<p>' + (image.description || image.category) + '</p>' +
                '</div>' +
            '</div>'
        ).join('');
        
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    });
    
    // Close modal
    modalClose.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    });
    
    // Close modal on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
    
    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
}

// Load About Me content from settings API
async function loadAboutMe() {
    try {
        console.log('Loading About Me from:', API_BASE_URL + '/settings');
        const response = await fetch(API_BASE_URL + '/settings');
        const data = await response.json();
        
        const aboutLoading = document.getElementById('about-loading');
        const aboutContent = document.getElementById('about-content');
        
        if (data.success && data.rawSettings) {
            // Find biography setting
            const biography = data.rawSettings.find(setting => setting.key === 'about_biography' || setting.id === 'about_biography');
            
            // Find profile image setting
            const profileImage = data.rawSettings.find(setting => setting.id === 'about_profile_image');
            
            // Find certifications setting
            const certifications = data.rawSettings.find(setting => setting.id === 'about_certifications');
            
            // Update profile image if available
            if (profileImage && profileImage.value) {
                const profileImageElement = document.getElementById('profile-image');
                const profileImageLoading = document.getElementById('profile-image-loading');
                
                if (profileImageElement) {
                    // Use presignedUrl if available, otherwise use the relative path
                    let imageUrl = '';
                    if (profileImage.presignedUrl) {
                        imageUrl = profileImage.presignedUrl;
                    } else if (profileImage.value.startsWith('http')) {
                        imageUrl = profileImage.value;
                    } else {
                        // For relative paths, add the API base URL
                        imageUrl = API_BASE_URL + profileImage.value;
                    }
                    
                    // Update the alt text
                    profileImageElement.alt = "Gabi Yoga Profile";
                    
                    // Load the image and handle loading state
                    profileImageElement.onload = function() {
                        // Hide loading indicator, show image
                        if (profileImageLoading) profileImageLoading.style.display = 'none';
                        profileImageElement.style.display = 'block';
                        console.log('✅ Profile image loaded successfully');
                    };
                    
                    profileImageElement.onerror = function() {
                        // Keep loading indicator visible with error message
                        if (profileImageLoading) {
                            profileImageLoading.innerHTML = '<p style="color: #dc3545;">Failed to load profile image</p>';
                        }
                        console.error('❌ Error loading profile image');
                    };
                    
                    // Set the source to trigger loading
                    profileImageElement.src = imageUrl;
                    
                    console.log('✅ Started loading profile image from:', imageUrl);
                }
            } else {
                // No profile image available - show a message
                const profileImageLoading = document.getElementById('profile-image-loading');
                if (profileImageLoading) {
                    profileImageLoading.innerHTML = '<p>No profile image available</p>';
                }
            }
            
            let aboutHtml = '';
            
            // Add biography if available
            if (biography && biography.value) {
                aboutHtml += 
                    '<div class="biography" style="white-space: pre-line; line-height: 1.8; font-size: 1.1rem; color: #555; margin-bottom: 2rem;">' +
                        biography.value +
                    '</div>';
            }
            
            // Add certifications if available
            if (certifications && certifications.value) {
                try {
                    const certsList = JSON.parse(certifications.value);
                    
                    if (certsList && certsList.length > 0) {
                        // Create certifications section
                        aboutHtml += '<div class="certifications-section">';
                        aboutHtml += '<h3 class="section-subtitle">Certifications & Training</h3>';
                        aboutHtml += '<div class="certifications-list">';
                        
                        // Loop through each certification
                        certsList.forEach(cert => {
                            aboutHtml += `
                                <div class="certification-item">
                                    <h4>${cert.title || ''}</h4>
                                    <div class="certification-meta">
                                        <span class="certification-org">${cert.organization || ''}</span>
                                        ${cert.year ? `<span class="certification-year">${cert.year}</span>` : ''}
                                    </div>
                                    ${cert.description ? `<p>${cert.description}</p>` : ''}
                                </div>
                            `;
                        });
                        
                        aboutHtml += '</div></div>';
                        
                        console.log('✅ Loaded certifications:', certsList.length);
                    }
                } catch (error) {
                    console.error('❌ Error parsing certifications:', error);
                }
            }
            
            if (aboutHtml) {
                aboutContent.innerHTML = aboutHtml;
                
                // Hide loading, show content
                aboutLoading.style.display = 'none';
                aboutContent.style.display = 'block';
                
                console.log('✅ Loaded About Me content');
            } else {
                throw new Error('No about me content found in settings');
            }
        } else {
            throw new Error('Invalid settings response');
        }
    } catch (error) {
        console.error('❌ Error loading About Me:', error);
        document.getElementById('about-loading').innerHTML = 
            '<p style="color: #dc3545;"><strong>Error loading About Me</strong><br>' + error.message + '</p>';
    }
}

// Load latest blog post from blog API
async function loadLatestBlog() {
    try {
        console.log('Loading latest blog from:', API_BASE_URL + '/blog');
        const response = await fetch(API_BASE_URL + '/blog?limit=1');
        const data = await response.json();
        
        const blogLoading = document.getElementById('blog-loading');
        const blogContent = document.getElementById('blog-content');
        
        if (data.success && data.posts && data.posts.length > 0) {
            const post = data.posts[0];
            
            blogContent.innerHTML = 
                '<div style="max-width: 800px; margin: 0 auto; background: white; padding: 2rem; border-radius: 15px; box-shadow: 0 8px 30px rgba(0,0,0,0.1);">' +
                    '<div style="text-align: center; margin-bottom: 1.5rem;">' +
                        '<span style="background: var(--color-primary); color: white; padding: 0.25rem 0.75rem; border-radius: 15px; font-size: 0.9rem; font-weight: 500;">' +
                            post.category +
                        '</span>' +
                    '</div>' +
                    '<h3 style="font-size: 1.8rem; margin-bottom: 1rem; text-align: center; color: #333;">' +
                        post.title +
                    '</h3>' +
                    '<div style="text-align: center; margin-bottom: 1.5rem; color: #666; font-size: 0.95rem;">' +
                        'Published on ' + new Date(post.publishedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }) +
                    '</div>' +
                    '<div style="font-size: 1.1rem; line-height: 1.7; color: #555; margin-bottom: 1.5rem;">' +
                        post.excerpt +
                    '</div>' +
                    '<div style="text-align: center;">' +
                        '<a href="/dev/blog-page/' + post.slug + '" style="display: inline-block; padding: 0.75rem 1.5rem; background: var(--color-primary); color: white; text-decoration: none; border-radius: 25px; font-weight: 600; transition: all 0.3s ease;">' +
                            'Read Full Article' +
                        '</a>' +
                    '</div>' +
                '</div>';
            
            // Hide loading, show content
            blogLoading.style.display = 'none';
            blogContent.style.display = 'block';
            
            console.log('✅ Loaded latest blog post:', post.title);
        } else {
            throw new Error('No blog posts found');
        }
    } catch (error) {
        console.error('❌ Error loading latest blog:', error);
        document.getElementById('blog-loading').innerHTML = 
            '<p style="color: #dc3545;"><strong>Error loading latest blog post</strong><br>' + error.message + '</p>';
    }
}

// Load class schedule from classes API and display as calendar
async function loadClassSchedule() {
    try {
        console.log('Loading class schedule from:', API_BASE_URL + '/classes');
        const response = await fetch(API_BASE_URL + '/classes?limit=50&upcoming=false');
        const data = await response.json();
        
        const classesLoading = document.getElementById('classes-loading');
        const classesContent = document.getElementById('classes-content');
        
        if (data.success && data.classes) {
            allClasses = data.classes;
            
            // Group classes by date
            calendarClasses = {};
            allClasses.forEach(classItem => {
                const dateKey = classItem.scheduleDate;
                if (!calendarClasses[dateKey]) {
                    calendarClasses[dateKey] = [];
                }
                calendarClasses[dateKey].push(classItem);
            });
            
            // Create calendar view
            createCalendarView();
            
            // Hide loading, show content
            classesLoading.style.display = 'none';
            classesContent.style.display = 'block';
            
            console.log('✅ Loaded class schedule with', allClasses.length, 'classes');
        } else {
            throw new Error('Invalid classes response');
        }
    } catch (error) {
        console.error('❌ Error loading class schedule:', error);
        document.getElementById('classes-loading').innerHTML = 
            '<p style="color: #dc3545;"><strong>Error loading class schedule</strong><br>' + error.message + '</p>';
    }
}

// Create calendar view
function createCalendarView() {
    const classesContent = document.getElementById('classes-content');
    
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
    
    classesContent.innerHTML = calendarHTML;
    
    // Initialize calendar
    initializeCalendar();
    
    // Add class detail modal
    addClassModal();
}

// Initialize calendar and set up event listeners
function initializeCalendar() {
    renderCalendar();
    setupEventListeners();
}

// Set up event listeners for calendar navigation
function setupEventListeners() {
    document.getElementById('prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
}

// Render calendar view with 4 weeks of classes
function renderCalendar() {
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
            
            classDiv.className = `calendar-class ${categoryClass} ${isFullClass}`;
            classDiv.textContent = `${classItem.startTime} ${classItem.title}`;
            classDiv.addEventListener('click', () => openClassModal(classItem.id));
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

// Check user role and update navigation
async function checkUserRole() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        // First verify if the token is valid and get user info
        const authResponse = await fetch(API_BASE_URL + '/auth/verify-token', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        const authData = await authResponse.json();
        if (!authData.success) {
            return;
        }

        // Add user portal link for all logged-in users
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks.innerHTML.includes('My Account')) {
            navLinks.innerHTML += '<li><a href="/dev/user.html">My Account</a></li>';
        }

        // If user is admin, add admin navigation
        if (authData.user.role === 'admin') {
            if (!navLinks.innerHTML.includes('Admin')) {
                navLinks.innerHTML += '<li><a href="/dev/admin.html">Admin</a></li>';
            }
        }

        // Update hero CTA for logged-in users
        const heroCta = document.getElementById('hero-cta');
        heroCta.innerHTML = '<a href="/dev/user.html" class="btn">My Account</a>';

    } catch (error) {
        console.error('Error checking user role:', error);
    }
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

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