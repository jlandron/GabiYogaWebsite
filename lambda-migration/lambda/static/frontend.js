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
    loadGallery();
    loadAboutMe();
    loadClassSchedule();
    loadLatestBlog();
    checkUserRole();
});

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
            
            if (biography) {
                aboutContent.innerHTML = 
                    '<div style="white-space: pre-line; line-height: 1.8; font-size: 1.1rem; color: #555;">' +
                        biography.value +
                    '</div>';
                
                // Hide loading, show content
                aboutLoading.style.display = 'none';
                aboutContent.style.display = 'block';
                
                console.log('✅ Loaded About Me content');
            } else {
                throw new Error('Biography not found in settings');
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
                '<div class="calendar-date-range" id="calendar-date-range"></div>' +
                '<div class="calendar-subtitle">This week and next 2 weeks</div>' +
            '</div>' +
            '<div class="calendar-grid" id="calendar-grid">' +
                '<!-- Calendar will be populated here -->' +
            '</div>' +
        '</div>';
    
    classesContent.innerHTML = calendarHTML;
    
    // Render the calendar
    renderCalendar();
    
    // Add class detail modal
    addClassModal();
}

// Render 3-week calendar view (this week + next 2 weeks)
function renderCalendar() {
    const dateRangeEl = document.getElementById('calendar-date-range');
    const calendarGrid = document.getElementById('calendar-grid');
    
    // Get today's date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Find the start of this week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    // Calculate the end date (3 weeks from start of this week)
    const endOfThreeWeeks = new Date(startOfWeek);
    endOfThreeWeeks.setDate(startOfWeek.getDate() + 20); // 3 weeks = 21 days, so 20 days from start
    
    // Set date range display
    dateRangeEl.textContent = startOfWeek.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    }) + ' - ' + endOfThreeWeeks.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    
    // Create calendar grid
    let calendarHTML = '';
    
    // Day headers
    const dayHeaders = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    dayHeaders.forEach(day => {
        calendarHTML += '<div class="calendar-day-header">' + day + '</div>';
    });
    
    // Generate exactly 3 weeks (21 days)
    for (let weekNum = 0; weekNum < 3; weekNum++) {
        for (let dayNum = 0; dayNum < 7; dayNum++) {
            const currentDay = new Date(startOfWeek);
            currentDay.setDate(startOfWeek.getDate() + (weekNum * 7) + dayNum);
            
            const dayStr = currentDay.toISOString().split('T')[0];
            const isToday = dayStr === todayStr;
            const dayClasses = calendarClasses[dayStr] || [];
            
            let dayClass = 'calendar-day';
            if (isToday) dayClass += ' today';
            
            let classesHTML = '';
            dayClasses.slice(0, 4).forEach(classItem => {
                const categoryClass = classItem.category ? classItem.category.toLowerCase() : 'general';
                const isFullClass = classItem.isFullyBooked ? 'full' : '';
                
                classesHTML += 
                    '<div class="calendar-class ' + categoryClass + ' ' + isFullClass + '" ' +
                         'data-class-id="' + classItem.id + '" ' +
                         'onclick="openClassModal(\'' + classItem.id + '\')" ' +
                         'title="' + classItem.title + ' - ' + classItem.startTime + '">' +
                        classItem.startTime + ' ' + classItem.title +
                    '</div>';
            });
            
            if (dayClasses.length > 4) {
                classesHTML += '<div class="calendar-class" style="background: #6c757d;">+' + (dayClasses.length - 4) + ' more</div>';
            }
            
            calendarHTML += 
                '<div class="' + dayClass + '">' +
                    '<div class="calendar-date">' + currentDay.getDate() + '</div>' +
                    '<div class="calendar-classes">' +
                        classesHTML +
                    '</div>' +
                '</div>';
        }
    }
    
    calendarGrid.innerHTML = calendarHTML;
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

// Logout function
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/dev';
}
