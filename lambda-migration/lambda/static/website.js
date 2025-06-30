/**
 * Static Website Lambda Function
 * Serves the homepage and static assets for the yoga website
 */

const { createResponse } = require('./utils');
const { serveBlogPage } = require('./blog');
const { serveBlogPostPage } = require('./blog-post');

exports.handler = async (event, context) => {
  const requestId = context.awsRequestId;
  
  try {
    console.log('Static website request:', {
      requestId,
      path: event.path,
      httpMethod: event.httpMethod,
      headers: event.headers
    });

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, '', {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
    }

    // Extract path from event
    const requestPath = event.path || event.pathParameters?.proxy || '/';
    
    // Serve homepage for root path
    if (requestPath === '/' || requestPath === '/index.html') {
      return serveHomepage();
    }
    
    // Serve blog page HTML (separate from blog API)
    if (requestPath === '/blog-page' || requestPath === '/blog.html') {
      return serveBlogPage();
    }
    
    // Serve individual blog post pages
    if (requestPath.startsWith('/blog-page/') && requestPath !== '/blog-page') {
      const slug = requestPath.replace('/blog-page/', '');
      return serveBlogPostPage(slug);
    }
    
    // Serve static assets
    if (requestPath.startsWith('/css/') || 
        requestPath.startsWith('/js/') || 
        requestPath.startsWith('/images/') ||
        requestPath.startsWith('/fonts/') ||
        requestPath.startsWith('/static-assets/')) {
      return serveStaticAsset(requestPath);
    }
    
    // 404 for other paths
    return createResponse(404, 'Page not found', {
      'Content-Type': 'text/plain'
    });

  } catch (error) {
    console.error('Static website error:', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    return createResponse(500, 'Internal server error', {
      'Content-Type': 'text/plain'
    });
  }
};

/**
 * Serve the homepage with the actual yoga website content
 */
function serveHomepage() {
  const homepage = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gabi Yoga - Find Your Inner Peace Through Yoga & Meditation</title>
    <meta name="description" content="Join Gabi Yoga for transformative yoga classes, workshops, retreats and private sessions. Discover inner peace and wellness through mindful practice.">
    <meta name="keywords" content="yoga, yoga classes, yoga studio, meditation, wellness, retreats, workshops, private yoga sessions, Gabi Yoga">
    
    <!-- Canonical URL -->
    <link rel="canonical" href="https://gabi.yoga/">
    
    <!-- Favicon -->
    <link rel="apple-touch-icon" sizes="180x180" href="/images/favicon/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/images/favicon/favicon-16x16.png">
    <link rel="manifest" href="/site.webmanifest">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://gabi.yoga/">
    <meta property="og:title" content="Gabi Yoga - Find Your Inner Peace">
    <meta property="og:description" content="Join our community and transform your mind, body, and spirit through yoga and meditation.">
    <meta property="og:image" content="https://gabi.yoga/images/og-image.jpg">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://gabi.yoga/">
    <meta property="twitter:title" content="Gabi Yoga - Find Your Inner Peace">
    <meta property="twitter:description" content="Join our community and transform your mind, body, and spirit through yoga and meditation.">
    <meta property="twitter:image" content="https://gabi.yoga/images/twitter-image.jpg">
    
    
    <!-- Stylesheets -->
    <link rel="stylesheet" href="/dev/static-assets/styles.css">
</head>
<body>
    <header class="header">
        <nav class="nav-container">
            <a href="/dev" class="logo">Gabi Yoga</a>
            <ul class="nav-links">
                <li><a href="/dev" class="active">Home</a></li>
                <li><a href="/dev/blog-page">Blog</a></li>
            </ul>
        </nav>
    </header>

    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-content">
            <h1>Gabi Yoga</h1>
            <p>Find Your Inner Peace Through Yoga & Meditation</p>
            <a href="#gallery" class="btn">Explore Our Journey</a>
        </div>
    </section>

    <!-- About Me Section -->
    <section id="about" class="section">
        <div class="container">
            <h2>About Me</h2>
            <div class="about-content">
                <div class="about-image">
                    <img id="profile-image" src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" alt="Yoga Instructor" style="width: 100%; max-width: 400px; border-radius: 15px; box-shadow: 0 8px 30px rgba(0,0,0,0.1);">
                </div>
                <div class="about-text">
                    <div id="about-loading" class="loading">
                        <p>Loading biography...</p>
                    </div>
                    <div id="about-content" style="display: none;">
                        <!-- Biography content will be loaded here -->
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Class Schedule Section -->
    <section id="classes" class="section">
        <div class="container">
            <h2>Upcoming Classes</h2>
            <div id="classes-loading" class="loading">
                <p>Loading class schedule...</p>
            </div>
            <div id="classes-content" style="display: none;">
                <!-- Class schedule will be loaded here -->
            </div>
        </div>
    </section>

    <!-- Latest Blog Post Section -->
    <section id="latest-blog" class="section" style="background: #f8f9fa;">
        <div class="container">
            <h2>Latest From The Blog</h2>
            <div id="blog-loading" class="loading">
                <p>📝 Loading latest blog post...</p>
            </div>
            <div id="blog-content" style="display: none;">
                <!-- Latest blog post will be loaded here -->
            </div>
        </div>
    </section>

    <!-- Gallery Section -->
    <section id="gallery" class="gallery-section">
        <div class="container">
            <h1 class="gallery-title">Gallery</h1>
            <div class="gallery-subtitle"></div>
            
            <div class="loading" id="gallery-loading">
                <p>Loading beautiful moments...</p>
            </div>
            
            <div class="gallery-carousel" id="gallery-carousel" style="display: none;">
                <div class="carousel-container" id="carousel-container">
                    <!-- Left preview -->
                    <div class="carousel-preview carousel-preview-left" id="carousel-preview-left">
                        <img src="" alt="">
                    </div>
                    
                    <!-- Main carousel -->
                    <div class="carousel-main">
                        <div class="carousel-track" id="carousel-track">
                            <!-- Featured images will be loaded here -->
                        </div>
                        <button class="carousel-nav carousel-prev" id="carousel-prev">‹</button>
                        <button class="carousel-nav carousel-next" id="carousel-next">›</button>
                    </div>
                    
                    <!-- Right preview -->
                    <div class="carousel-preview carousel-preview-right" id="carousel-preview-right">
                        <img src="" alt="">
                    </div>
                </div>
                <div class="carousel-indicators" id="carousel-indicators">
                    <!-- Indicators will be loaded here -->
                </div>
                <a href="#" class="view-all-btn" id="view-all-btn">View All Photos</a>
            </div>
        </div>
    </section>

    <!-- Gallery Modal -->
    <div id="gallery-modal" class="modal">
        <div class="modal-content">
            <span class="modal-close" id="modal-close">&times;</span>
            <div class="masonry-grid" id="masonry-grid">
                <!-- All images will be loaded here -->
            </div>
        </div>
    </div>

    <!-- Footer -->
    <footer>
        <div class="container">
            <p>&copy; 2025 Gabi Yoga. Powered by AWS Lambda Serverless Architecture</p>
        </div>
    </footer>

    <script>
        // Fixed API URL to avoid any syntax issues
        const API_BASE_URL = window.location.origin + '/dev';
        console.log("API Base URL:", API_BASE_URL);
        
        // Gallery state
        let allImages = [];
        let featuredImages = [];
        let currentSlide = 0;
        let autoRotateInterval = null;
        let isPaused = false;
        
        
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
            carouselTrack.innerHTML = featuredImages.map((image, index) => 
                '<div class="carousel-slide">' +
                    '<img src="' + image.imageUrl + '" alt="' + (image.altText || image.title) + '" loading="' + (index === 0 ? 'eager' : 'lazy') + '">' +
                '</div>'
            ).join('');
            
            // Create indicators
            carouselIndicators.innerHTML = featuredImages.map((_, index) => 
                '<div class="carousel-indicator ' + (index === 0 ? 'active' : '') + '" data-slide="' + index + '"></div>'
            ).join('');
            
            // Setup carousel navigation
            setupCarouselNavigation();
            setupSidePreviewHandlers();
            
            // Initialize the side previews
            updateSidePreviews();
        }
        
        // Setup carousel navigation and controls
        function setupCarouselNavigation() {
            const prevBtn = document.getElementById('carousel-prev');
            const nextBtn = document.getElementById('carousel-next');
            const indicators = document.querySelectorAll('.carousel-indicator');
            
            // Previous slide
            prevBtn.addEventListener('click', () => {
                pauseAutoRotate();
                currentSlide = (currentSlide - 1 + featuredImages.length) % featuredImages.length;
                updateCarousel();
            });
            
            // Next slide
            nextBtn.addEventListener('click', () => {
                pauseAutoRotate();
                currentSlide = (currentSlide + 1) % featuredImages.length;
                updateCarousel();
            });
            
            // Indicator clicks
            indicators.forEach((indicator, index) => {
                indicator.addEventListener('click', () => {
                    pauseAutoRotate();
                    currentSlide = index;
                    updateCarousel();
                });
            });
            
            // Start auto-play carousel
            startAutoRotate();
        }
        
        // Update carousel position and indicators
        function updateCarousel() {
            const carouselTrack = document.getElementById('carousel-track');
            const indicators = document.querySelectorAll('.carousel-indicator');
            
            // Move track
            const translateX = -currentSlide * 100;
            carouselTrack.style.transform = 'translateX(' + translateX + '%)';
            
            // Update indicators
            indicators.forEach((indicator, index) => {
                indicator.classList.toggle('active', index === currentSlide);
            });
            
            // Update side previews
            updateSidePreviews();
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
            leftImg.src = featuredImages[prevIndex].imageUrl;
            leftImg.alt = featuredImages[prevIndex].altText || featuredImages[prevIndex].title;
            
            // Update right preview (next image)
            const rightImg = rightPreview.querySelector('img');
            rightImg.src = featuredImages[nextIndex].imageUrl;
            rightImg.alt = featuredImages[nextIndex].altText || featuredImages[nextIndex].title;
        }
        
        // Auto-rotation functions
        function startAutoRotate() {
            if (autoRotateInterval) {
                clearInterval(autoRotateInterval);
            }
            autoRotateInterval = setInterval(() => {
                if (!isPaused) {
                    currentSlide = (currentSlide + 1) % featuredImages.length;
                    updateCarousel();
                }
            }, 5000);
        }
        
        function pauseAutoRotate() {
            isPaused = true;
            // Resume auto-rotation after 10 seconds of user inactivity
            setTimeout(() => {
                isPaused = false;
            }, 10000);
        }
        
        // Setup side preview click handlers
        function setupSidePreviewHandlers() {
            const leftPreview = document.getElementById('carousel-preview-left');
            const rightPreview = document.getElementById('carousel-preview-right');
            
            leftPreview.addEventListener('click', () => {
                pauseAutoRotate();
                currentSlide = (currentSlide - 1 + featuredImages.length) % featuredImages.length;
                updateCarousel();
            });
            
            rightPreview.addEventListener('click', () => {
                pauseAutoRotate();
                currentSlide = (currentSlide + 1) % featuredImages.length;
                updateCarousel();
            });
        }
        
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
                                '<a href="/dev/blog-page" style="display: inline-block; padding: 0.75rem 1.5rem; background: var(--color-primary); color: white; text-decoration: none; border-radius: 25px; font-weight: 600; transition: all 0.3s ease;">' +
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
        
        // Calendar state
        let currentDate = new Date();
        let allClasses = [];
        let calendarClasses = {};
        
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
                                 'onclick="openClassModal(' + classItem.id + ')" ' +
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
        
        // Calendar navigation functions (removed - using fixed 3-week view)
        
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
            window.currentBookingClass = classItem;
            
            // Show modal
            document.getElementById('class-modal').style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
        
        // Close class detail modal
        function closeClassModal() {
            document.getElementById('class-modal').style.display = 'none';
            document.body.style.overflow = 'auto';
            window.currentBookingClass = null;
        }
        
        // Book a class (placeholder - would integrate with booking system)
        function bookClass() {
            if (!window.currentBookingClass) return;
            
            const classItem = window.currentBookingClass;
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
        
        // Load all content when page loads
        document.addEventListener('DOMContentLoaded', () => {
            loadGallery();
            loadAboutMe();
            loadClassSchedule();
            loadLatestBlog();
        });
        
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
        
        // Touch/swipe support for mobile carousel
        let startX = 0;
        let startY = 0;
        
        document.getElementById('carousel-container').addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        
        document.getElementById('carousel-container').addEventListener('touchend', (e) => {
            if (!startX || !startY) return;
            
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
                updateCarousel();
            }
            
            startX = 0;
            startY = 0;
        });
    </script>
</body>
</html>`;

  return createResponse(200, homepage, {
    'Content-Type': 'text/html; charset=utf-8'
  });
}


/**
 * Serve static assets (placeholder - in production, use CloudFront/S3)
 */
function serveStaticAsset(requestPath) {
  // In a real implementation, you'd serve from S3 or CloudFront
  const mimeType = getMimeType(requestPath);
  
  // Serve the styles.css file
  if (requestPath === '/static-assets/styles.css') {
    const fs = require('fs');
    const path = require('path');
    try {
      // Read the CSS file from the current directory
      const cssContent = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
      return createResponse(200, cssContent, {
        'Content-Type': 'text/css'
      });
    } catch (error) {
      console.error('Error loading CSS file:', error);
    }
  }
  
  return createResponse(404, 'Static asset not found: ' + requestPath, {
    'Content-Type': mimeType
  });
}

/**
 * Simple MIME type detection
 */
function getMimeType(path) {
  const ext = path.split('.').pop().toLowerCase();
  
  const mimeTypes = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'otf': 'font/otf'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}
