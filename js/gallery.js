/**
 * Gallery.js
 * Interactive Carousel Gallery for displaying photos from the admin photo gallery
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the gallery carousel
    initGalleryCarousel();
    
    // Initialize the profile photo in the About Me section
    initProfilePhoto();
});

// Global carousel state
let currentCarouselIndex = 0;
let carouselPhotos = [];
let carouselAutoPlayInterval = null;

/**
 * Initialize the interactive carousel gallery
 */
function initGalleryCarousel() {
    const carouselContainer = document.querySelector('.gallery-carousel-container');
    const loadingElement = document.querySelector('.carousel-loading');
    
    if (!carouselContainer || !loadingElement) {
        return;
    }
    
    // Fetch photos from API - only get photos that should be shown on homepage
    fetch('/api/gallery/images/homepage')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch gallery images: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            const photos = data.images || [];
            
            if (photos.length === 0) {
                loadingElement.innerHTML = '<p>No photos available for the gallery.</p>';
                return;
            }
            
            // Load photo data and create carousel
            loadCarouselPhotos(photos);
        })
        .catch(error => {
            console.error('Error loading gallery:', error);
            loadingElement.innerHTML = '<p>Error loading gallery. Please try again later.</p>';
        });
}

/**
 * Load carousel photos and initialize the carousel
 */
function loadCarouselPhotos(photoInfos) {
    const loadingElement = document.querySelector('.carousel-loading');
    const carousel = document.querySelector('.gallery-carousel');
    
    // Load each photo data
    const loadPromises = photoInfos.map(photoInfo => {
        return fetch(`/api/gallery/images/${photoInfo.image_id}/data`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch image data: ${response.statusText}`);
                }
                return response.blob();
            })
            .then(blob => {
                return {
                    id: photoInfo.image_id,
                    title: photoInfo.title || '',
                    description: photoInfo.description || '',
                    alt: photoInfo.alt_text || '',
                    caption: photoInfo.caption || '',
                    data: URL.createObjectURL(blob),
                    tags: photoInfo.tags ? JSON.parse(photoInfo.tags) : [],
                    uploadDate: photoInfo.created_at,
                    isProfilePhoto: photoInfo.is_profile_photo === 1
                };
            });
    });
    
    Promise.all(loadPromises)
        .then(photos => {
            carouselPhotos = photos;
            
            // Hide loading and show carousel
            loadingElement.style.display = 'none';
            carousel.style.display = 'block';
            
            // Build carousel
            buildCarousel();
            buildCarouselIndicators();
            initCarouselNavigation();
            initViewAllButton();
            
            // Start auto-play (optional)
            startCarouselAutoPlay();
        })
        .catch(error => {
            console.error('Error loading carousel photos:', error);
            loadingElement.innerHTML = '<p>Error loading gallery photos. Please try again later.</p>';
        });
}

/**
 * Build the carousel structure
 */
function buildCarousel() {
    const track = document.querySelector('.gallery-carousel-track');
    
    if (!track) return;
    
    // Clear existing content
    track.innerHTML = '';
    
    // Create carousel items
    carouselPhotos.forEach((photo, index) => {
        const carouselItem = document.createElement('div');
        carouselItem.className = 'gallery-carousel-item';
        carouselItem.setAttribute('data-index', index);
        
        const img = document.createElement('img');
        img.src = photo.data;
        img.alt = photo.alt || photo.title || 'Yoga photo';
        img.loading = 'lazy';
        
        carouselItem.appendChild(img);
        
        // Add click event to show photo in modal
        carouselItem.addEventListener('click', () => {
            showPhotoModal(photo);
        });
        
        track.appendChild(carouselItem);
    });
    
    // Set initial positions
    updateCarouselPositions();
}

/**
 * Build carousel indicators (dots)
 */
function buildCarouselIndicators() {
    const indicatorsContainer = document.querySelector('.carousel-indicators');
    
    if (!indicatorsContainer) return;
    
    // Clear existing indicators
    indicatorsContainer.innerHTML = '';
    
    // Create indicator for each photo
    carouselPhotos.forEach((_, index) => {
        const indicator = document.createElement('button');
        indicator.className = 'carousel-indicator';
        indicator.setAttribute('data-index', index);
        
        if (index === currentCarouselIndex) {
            indicator.classList.add('active');
        }
        
        indicator.addEventListener('click', () => {
            goToCarouselSlide(index);
        });
        
        indicatorsContainer.appendChild(indicator);
    });
}

/**
 * Initialize carousel navigation (prev/next buttons)
 */
function initCarouselNavigation() {
    const prevBtn = document.querySelector('.carousel-nav-btn.prev-btn');
    const nextBtn = document.querySelector('.carousel-nav-btn.next-btn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            goToPreviousSlide();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            goToNextSlide();
        });
    }
    
    // Add keyboard navigation
    document.addEventListener('keydown', (event) => {
        const carousel = document.querySelector('.gallery-carousel');
        if (carousel && carousel.style.display !== 'none') {
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                goToPreviousSlide();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                goToNextSlide();
            }
        }
    });
    
    // Add touch/swipe support for mobile
    initTouchNavigation();
}

/**
 * Initialize touch/swipe navigation for mobile
 */
function initTouchNavigation() {
    const carousel = document.querySelector('.gallery-carousel');
    if (!carousel) return;
    
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    
    carousel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
        stopCarouselAutoPlay(); // Stop auto-play during interaction
    });
    
    carousel.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentX = e.touches[0].clientX;
    });
    
    carousel.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        
        const deltaX = startX - currentX;
        const threshold = 50; // Minimum swipe distance
        
        if (Math.abs(deltaX) > threshold) {
            if (deltaX > 0) {
                goToNextSlide();
            } else {
                goToPreviousSlide();
            }
        }
        
        startCarouselAutoPlay(); // Restart auto-play
    });
}

/**
 * Initialize View All button
 */
function initViewAllButton() {
    const viewAllBtn = document.querySelector('.view-all-btn');
    
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            showGalleryModal();
        });
    }
}

/**
 * Go to specific carousel slide
 */
function goToCarouselSlide(index) {
    if (index < 0 || index >= carouselPhotos.length) return;
    
    currentCarouselIndex = index;
    updateCarouselPositions();
    updateCarouselIndicators();
}

/**
 * Go to previous slide
 */
function goToPreviousSlide() {
    const newIndex = currentCarouselIndex === 0 ? carouselPhotos.length - 1 : currentCarouselIndex - 1;
    goToCarouselSlide(newIndex);
}

/**
 * Go to next slide
 */
function goToNextSlide() {
    const newIndex = (currentCarouselIndex + 1) % carouselPhotos.length;
    goToCarouselSlide(newIndex);
}

/**
 * Update carousel item positions based on current index
 */
function updateCarouselPositions() {
    const items = document.querySelectorAll('.gallery-carousel-item');
    
    items.forEach((item, index) => {
        // Remove all position classes
        item.classList.remove('active', 'prev', 'next', 'far-prev', 'far-next', 'hidden');
        
        // Calculate relative position to current index
        const relativeIndex = index - currentCarouselIndex;
        
        if (relativeIndex === 0) {
            item.classList.add('active');
        } else if (relativeIndex === 1 || (relativeIndex === -(carouselPhotos.length - 1))) {
            item.classList.add('next');
        } else if (relativeIndex === -1 || (relativeIndex === carouselPhotos.length - 1)) {
            item.classList.add('prev');
        } else if (relativeIndex === 2 || (relativeIndex === -(carouselPhotos.length - 2))) {
            item.classList.add('far-next');
        } else if (relativeIndex === -2 || (relativeIndex === carouselPhotos.length - 2)) {
            item.classList.add('far-prev');
        } else {
            item.classList.add('hidden');
        }
    });
}

/**
 * Update carousel indicators
 */
function updateCarouselIndicators() {
    const indicators = document.querySelectorAll('.carousel-indicator');
    
    indicators.forEach((indicator, index) => {
        if (index === currentCarouselIndex) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    });
}

/**
 * Start carousel auto-play
 */
function startCarouselAutoPlay() {
    // Auto-play every 5 seconds
    carouselAutoPlayInterval = setInterval(() => {
        goToNextSlide();
    }, 5000);
}

/**
 * Stop carousel auto-play
 */
function stopCarouselAutoPlay() {
    if (carouselAutoPlayInterval) {
        clearInterval(carouselAutoPlayInterval);
        carouselAutoPlayInterval = null;
    }
}

/**
 * Pause auto-play when user hovers over carousel
 */
function initCarouselHoverPause() {
    const carousel = document.querySelector('.gallery-carousel');
    
    if (carousel) {
        carousel.addEventListener('mouseenter', stopCarouselAutoPlay);
        carousel.addEventListener('mouseleave', startCarouselAutoPlay);
    }
}

/**
 * Show a modal with the photo details
 */
function showPhotoModal(photo) {
    // Stop auto-play when modal is open
    stopCarouselAutoPlay();
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('photo-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'photo-modal';
        modal.className = 'modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content photo-modal-content';
        
        modalContent.innerHTML = `
            <span class="close-modal">&times;</span>
            <div class="photo-modal-container">
                <div class="photo-modal-image">
                    <img id="modal-photo-img" src="" alt="">
                </div>
                <div class="photo-modal-details">
                    <h3 id="modal-photo-title"></h3>
                    <p id="modal-photo-caption"></p>
                </div>
            </div>
            <div class="photo-modal-navigation">
                <button id="prev-photo-btn" class="nav-btn"><i class="fas fa-chevron-left"></i></button>
                <button id="next-photo-btn" class="nav-btn"><i class="fas fa-chevron-right"></i></button>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.appendChild(modalContent);
        
        // Add event listeners for navigation and closing
        const closeBtn = modal.querySelector('.close-modal');
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            startCarouselAutoPlay(); // Restart auto-play when modal closes
        });
        
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
                startCarouselAutoPlay(); // Restart auto-play when modal closes
            }
        });
        
        const prevBtn = modal.querySelector('#prev-photo-btn');
        const nextBtn = modal.querySelector('#next-photo-btn');
        
        prevBtn.addEventListener('click', () => {
            navigatePhoto('prev');
        });
        
        nextBtn.addEventListener('click', () => {
            navigatePhoto('next');
        });
        
        // Add keyboard navigation
        document.addEventListener('keydown', (event) => {
            if (modal.style.display === 'block') {
                if (event.key === 'ArrowLeft') {
                    navigatePhoto('prev');
                } else if (event.key === 'ArrowRight') {
                    navigatePhoto('next');
                } else if (event.key === 'Escape') {
                    modal.style.display = 'none';
                    startCarouselAutoPlay(); // Restart auto-play when modal closes
                }
            }
        });
    }
    
    // Set current photo data
    const modalImg = modal.querySelector('#modal-photo-img');
    const modalTitle = modal.querySelector('#modal-photo-title');
    const modalCaption = modal.querySelector('#modal-photo-caption');
    
    modalImg.src = photo.data;
    modalImg.alt = photo.alt || photo.title || 'Yoga photo';
    modalTitle.textContent = photo.title || 'Untitled';
    modalCaption.textContent = photo.caption || '';
    
    // Store current photo ID for navigation
    modal.dataset.currentPhotoId = photo.id;
    
    // Show the modal
    modal.style.display = 'block';
}

/**
 * Navigate to previous or next photo in the modal
 */
function navigatePhoto(direction) {
    const modal = document.getElementById('photo-modal');
    if (!modal) return;
    
    const currentPhotoId = modal.dataset.currentPhotoId;
    
    // Find current photo index in carousel photos
    const currentIndex = carouselPhotos.findIndex(photo => photo.id.toString() === currentPhotoId.toString());
    if (currentIndex === -1) return;
    
    // Calculate next index
    let nextIndex;
    if (direction === 'prev') {
        nextIndex = (currentIndex - 1 + carouselPhotos.length) % carouselPhotos.length;
    } else {
        nextIndex = (currentIndex + 1) % carouselPhotos.length;
    }
    
    // Show the next/previous photo
    const nextPhoto = carouselPhotos[nextIndex];
    showPhotoModal(nextPhoto);
}

/**
 * Show a modal with all gallery photos
 */
function showGalleryModal() {
    // Stop auto-play when modal is open
    stopCarouselAutoPlay();
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('gallery-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'gallery-modal';
        modal.className = 'modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content gallery-modal-content';
        
        // Get gallery settings
        const gallerySettings = loadGallerySettings();
        
        modalContent.innerHTML = `
            <span class="close-modal">&times;</span>
            <h2>${gallerySettings.title || 'Photo Gallery'}</h2>
            <p>${gallerySettings.description || ''}</p>
            <div class="gallery-modal-grid">
                <div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i>Loading all photos...</div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.appendChild(modalContent);
        
        // Add event listener for closing
        const closeBtn = modal.querySelector('.close-modal');
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            startCarouselAutoPlay(); // Restart auto-play when modal closes
        });
        
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
                startCarouselAutoPlay(); // Restart auto-play when modal closes
            }
        });
        
        // Add keyboard navigation
        document.addEventListener('keydown', (event) => {
            if (modal.style.display === 'block' && event.key === 'Escape') {
                modal.style.display = 'none';
                startCarouselAutoPlay(); // Restart auto-play when modal closes
            }
        });
    }
    
    // Show the modal while we load photos
    modal.style.display = 'block';
    
    // Clear the grid and show loading spinner
    const modalGrid = modal.querySelector('.gallery-modal-grid');
    modalGrid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i>Loading all photos...</div>';
    
    // Fetch all photos from the API
    fetch('/api/gallery/images')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch gallery images: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            // Photos are already sorted from the server
            const photos = data.images || [];
            
            // Clear the loading spinner
            modalGrid.innerHTML = '';
            
            if (photos.length === 0) {
                modalGrid.innerHTML = '<p>No photos available.</p>';
                return;
            }
            
            // Load each photo and add to modal grid
            const loadPhotoPromises = [];
            for (const photo of photos) {
                loadPhotoPromises.push(
                    fetch(`/api/gallery/images/${photo.image_id}/data`)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`Failed to fetch image data: ${response.statusText}`);
                            }
                            return response.blob();
                        })
                        .then(blob => {
                            // Create a URL for the blob
                            const url = URL.createObjectURL(blob);
                            
                            // Create photo object
                            const photoObj = {
                                id: photo.image_id,
                                title: photo.title || '',
                                alt: photo.alt_text || '',
                                caption: photo.caption || '',
                                data: url
                            };
                            
                            // Create gallery item
                            const galleryItem = document.createElement('div');
                            galleryItem.className = 'gallery-item';
                            galleryItem.setAttribute('data-id', photoObj.id);
                            
                            const img = document.createElement('img');
                            img.src = photoObj.data;
                            img.alt = photoObj.alt || photoObj.title || 'Yoga photo';
                            img.loading = 'lazy';
                            
                            galleryItem.appendChild(img);
                            
                            // Add click event to show photo in modal
                            galleryItem.addEventListener('click', () => {
                                modal.style.display = 'none';
                                showPhotoModal(photoObj);
                            });
                            
                            modalGrid.appendChild(galleryItem);
                        })
                );
            }
            
            return Promise.all(loadPhotoPromises);
        })
        .catch(error => {
            console.error('Error loading full gallery:', error);
            modalGrid.innerHTML = '<p>Error loading gallery. Please try again later.</p>';
        });
}

/**
 * Initialize and load the profile photo for the About Me section
 */
function initProfilePhoto() {
    try {
        // Get the about section image
        const aboutImage = document.querySelector('.about-image img');
        
        if (aboutImage) {
            // Fetch profile photo from API
            fetch('/api/gallery/profile-photo')
                .then(response => {
                    if (!response.ok) {
                        // If no profile photo is set, we'll use the default
                        return;
                    }
                    return response.blob();
                })
                .then(blob => {
                    if (blob) {
                        // Create an object URL for the blob
                        const url = URL.createObjectURL(blob);
                        
                        // Set the profile photo in the About section
                        aboutImage.src = url;
                        console.log('Profile photo updated in About section');
                    }
                })
                .catch(err => {
                    console.error('Error fetching profile photo:', err);
                });
        }
    } catch (error) {
        console.error('Error loading profile photo:', error);
    }
}

/**
 * Load gallery settings from localStorage
 */
function loadGallerySettings() {
    try {
        const storedSettings = localStorage.getItem('admin_gallery_settings');
        return storedSettings ? JSON.parse(storedSettings) : {
            title: 'Yoga Gallery',
            description: 'A collection of yoga practice photos',
            photosPerPage: 24,
            layout: 'grid',
            publicDisplayLimit: 6,
            sortOrder: 'newest'
        };
    } catch (error) {
        console.error('Error loading gallery settings:', error);
        return {
            title: 'Yoga Gallery',
            description: 'A collection of yoga practice photos',
            photosPerPage: 24,
            layout: 'grid',
            publicDisplayLimit: 6,
            sortOrder: 'newest'
        };
    }
}

// Initialize hover pause when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure carousel is built first
    setTimeout(initCarouselHoverPause, 1000);
});
