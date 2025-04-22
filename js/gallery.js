/**
 * Gallery.js
 * Loads photos from the admin photo gallery (localStorage) for display on the public-facing site
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the gallery
    initPublicGallery();
    
    // Initialize the profile photo in the About Me section
    initProfilePhoto();
});

/**
 * Initialize the public gallery with photos from the database
 */
function initPublicGallery() {
    const galleryGrid = document.querySelector('.gallery-grid');
    
    if (!galleryGrid) {
        return;
    }
    
    // Clear existing content (static placeholders)
    galleryGrid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i>Loading gallery...</div>';
    
    // Get gallery settings (still from localStorage for now)
    const gallerySettings = loadGallerySettings();
    
    // Fetch photos from API
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
            
            // Clear loading indicator
            galleryGrid.innerHTML = '';
            
            if (photos.length === 0) {
                galleryGrid.innerHTML = '<p>No photos available.</p>';
                return;
            }
            
            // Limit to a reasonable number for the public gallery
            const displayLimit = Math.min(photos.length, gallerySettings.publicDisplayLimit || 6);
            
            // Load each photo and add to gallery
            const loadPhotoPromises = [];
            
            for (let i = 0; i < displayLimit; i++) {
                const photo = photos[i];
                loadPhotoPromises.push(loadAndAddPhoto(galleryGrid, photo));
            }
            
            Promise.all(loadPhotoPromises).then(() => {
                // If there are more photos than we're displaying, add a "View All" button
                if (photos.length > displayLimit) {
                    addViewAllButton(galleryGrid);
                }
            });
        })
        .catch(error => {
            console.error('Error loading gallery:', error);
            galleryGrid.innerHTML = '<p>Error loading gallery. Please try again later.</p>';
        });
}

/**
 * Load photo data and add it to the gallery
 */
function loadAndAddPhoto(galleryGrid, photoInfo) {
    return new Promise((resolve, reject) => {
        fetch(`/api/gallery/images/${photoInfo.image_id}/data`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch image data: ${response.statusText}`);
                }
                return response.blob();
            })
            .then(blob => {
                // Create a URL for the blob
                const url = URL.createObjectURL(blob);
                
                // Create photo object for gallery
                const photo = {
                    id: photoInfo.image_id,
                    title: photoInfo.title || '',
                    description: photoInfo.description || '',
                    alt: photoInfo.alt_text || '',
                    caption: photoInfo.caption || '',
                    data: url,
                    tags: photoInfo.tags ? JSON.parse(photoInfo.tags) : [],
                    uploadDate: photoInfo.created_at,
                    isProfilePhoto: photoInfo.is_profile_photo === 1
                };
                
                // Add photo to gallery
                addPhotoToGallery(galleryGrid, photo);
                resolve();
            })
            .catch(error => {
                console.error(`Error loading photo ${photoInfo.image_id}:`, error);
                reject(error);
            });
    });
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

/**
 * Load photos from localStorage
 */
function loadPhotos() {
    try {
        const storedPhotos = localStorage.getItem('admin_gallery_photos');
        return storedPhotos ? JSON.parse(storedPhotos) : [];
    } catch (error) {
        console.error('Error loading photos from localStorage:', error);
        return [];
    }
}

/**
 * Sort photos based on the provided sort order
 */
function sortPhotos(photos, sortOrder) {
    const sortedPhotos = [...photos];
    
    switch (sortOrder) {
        case 'newest':
            sortedPhotos.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
            break;
        case 'oldest':
            sortedPhotos.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
            break;
        case 'name-asc':
            sortedPhotos.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            break;
        case 'name-desc':
            sortedPhotos.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
            break;
    }
    
    return sortedPhotos;
}

/**
 * Add a photo to the gallery grid
 */
function addPhotoToGallery(galleryGrid, photo) {
    const galleryItem = document.createElement('div');
    galleryItem.className = 'gallery-item';
    galleryItem.setAttribute('data-id', photo.id);
    
    const img = document.createElement('img');
    img.src = photo.data;
    img.alt = photo.alt || photo.title || 'Yoga photo';
    
    galleryItem.appendChild(img);
    
    // Add click event to show photo in modal
    galleryItem.addEventListener('click', () => {
        showPhotoModal(photo);
    });
    
    galleryGrid.appendChild(galleryItem);
}

/**
 * Add a "View All" button to the gallery
 */
function addViewAllButton(galleryGrid) {
    const viewAllItem = document.createElement('div');
    viewAllItem.className = 'gallery-item view-all';
    
    const viewAllContent = document.createElement('div');
    viewAllContent.className = 'view-all-content';
    viewAllContent.innerHTML = `
        <i class="fas fa-images"></i>
        <p>View All Photos</p>
    `;
    
    // Add click event to show full gallery modal
    viewAllItem.addEventListener('click', () => {
        showGalleryModal();
    });
    
    viewAllItem.appendChild(viewAllContent);
    galleryGrid.appendChild(viewAllItem);
}

/**
 * Show a modal with the photo details
 */
function showPhotoModal(photo) {
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
        
        // Add event listeners for navigation and closing
        const closeBtn = modal.querySelector('.close-modal');
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
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
    
    // Fetch all images from API 
    fetch('/api/gallery/images')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch photos: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            const photos = data.images || [];
            
            // Find current photo index
            const currentIndex = photos.findIndex(photo => photo.image_id.toString() === currentPhotoId.toString());
            if (currentIndex === -1) return;
            
            // Calculate next index
            let nextIndex;
            if (direction === 'prev') {
                nextIndex = (currentIndex - 1 + photos.length) % photos.length;
            } else {
                nextIndex = (currentIndex + 1) % photos.length;
            }
            
            // Get next photo data
            const nextPhoto = photos[nextIndex];
            
            // Fetch the image data for the next photo
            return fetch(`/api/gallery/images/${nextPhoto.image_id}/data`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to fetch image data: ${response.statusText}`);
                    }
                    return response.blob();
                })
                .then(blob => {
                    // Create photo object for the modal
                    const photoObj = {
                        id: nextPhoto.image_id,
                        title: nextPhoto.title || '',
                        alt: nextPhoto.alt_text || '',
                        caption: nextPhoto.caption || '',
                        data: URL.createObjectURL(blob)
                    };
                    
                    // Show the next/previous photo
                    showPhotoModal(photoObj);
                });
        })
        .catch(error => {
            console.error('Error navigating photos:', error);
        });
}

/**
 * Show a modal with all gallery photos
 */
/**
 * Initialize and load the profile photo for the About Me section
 */
function initProfilePhoto() {
    try {
        // Get the about section image
        const aboutImage = document.querySelector('.about-image img');
        
        if (aboutImage) {
            // Fetch profile photo from API - no need to use localStorage anymore
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

function showGalleryModal() {
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
        });
        
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // Add keyboard navigation
        document.addEventListener('keydown', (event) => {
            if (modal.style.display === 'block' && event.key === 'Escape') {
                modal.style.display = 'none';
            }
        });
    }
    
    // Show the modal while we load photos
    modal.style.display = 'block';
    
    // Clear the grid and show loading spinner
    const modalGrid = modal.querySelector('.gallery-modal-grid');
    modalGrid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i>Loading all photos...</div>';
    
    // Fetch photos from the API
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
