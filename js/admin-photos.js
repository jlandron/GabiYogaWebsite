/**
 * Admin Photos Gallery Management
 * Handles the photo gallery administration including uploads, editing, and storage management
 * Currently uses localStorage but designed for future migration to S3
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the photo gallery
    const photoGallery = new PhotoGalleryManager();
    photoGallery.init();
});

/**
 * Photo Gallery Manager Class
 * Manages all aspects of the photo gallery administration
 */
class PhotoGalleryManager {
    constructor() {
        // DOM Elements
        this.galleryElement = document.getElementById('photo-gallery');
        this.uploadZone = document.getElementById('photo-upload-zone');
        this.fileInput = document.getElementById('photo-file-input');
        this.uploadBtn = document.getElementById('upload-photo-btn');
        this.selectAllBtn = document.getElementById('select-all-btn');
        this.deleteSelectedBtn = document.getElementById('delete-selected-btn');
        this.sortSelect = document.getElementById('gallery-sort');
        this.gallerySettingsForm = document.getElementById('gallery-settings-form');
        
        // Modal Elements
        this.photoDetailModal = document.getElementById('photo-detail-modal');
        this.modalPhoto = document.getElementById('modal-photo');
        this.photoDetailForm = document.getElementById('photo-detail-form');
        this.photoTitle = document.getElementById('photo-title');
        this.photoCaption = document.getElementById('photo-caption');
        this.photoAltText = document.getElementById('photo-alt-text');
        this.photoTags = document.getElementById('photo-tags');
        this.photoFilename = document.getElementById('photo-filename');
        this.photoSize = document.getElementById('photo-size');
        this.photoDimensions = document.getElementById('photo-dimensions');
        this.photoDate = document.getElementById('photo-date');
        this.deletePhotoBtn = document.getElementById('delete-photo-btn');
        this.modalCloseBtn = document.querySelector('.modal-close');
        
        // Storage Elements
        this.storageBar = document.getElementById('storage-bar');
        this.storageInfo = document.getElementById('storage-info');
        
        // State
        this.photos = [];
        this.selectedPhotos = [];
        this.currentPhoto = null;
        this.gallerySettings = this.loadGallerySettings();
        
        // Storage management
        this.maxStorageSize = 5 * 1024 * 1024 * 1024; // 5 GB in bytes (just for UI display)
        this.currentStorageUsage = 0;
        
        // Reference to this instance for event handlers
        const self = this;
        
        // Bind event handlers
        if (this.uploadBtn) {
            this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        }
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        if (this.uploadZone) {
            this.uploadZone.addEventListener('click', () => this.fileInput.click());
            this.uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
            this.uploadZone.addEventListener('dragleave', () => this.uploadZone.classList.remove('dragover'));
            this.uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
        }
        
        if (this.selectAllBtn) {
            this.selectAllBtn.addEventListener('click', () => this.toggleSelectAll());
        }
        if (this.deleteSelectedBtn) {
            this.deleteSelectedBtn.addEventListener('click', () => this.deleteSelected());
        }
        if (this.sortSelect) {
            this.sortSelect.addEventListener('change', () => this.sortGallery());
        }
        
        if (this.gallerySettingsForm) {
            this.gallerySettingsForm.addEventListener('submit', (e) => this.saveSettings(e));
        }
        
        // Modal events
        if (this.modalCloseBtn) {
            this.modalCloseBtn.addEventListener('click', () => this.closeModal());
        }
        if (this.photoDetailModal) {
            this.photoDetailModal.addEventListener('click', (e) => {
                if (e.target === this.photoDetailModal) this.closeModal();
            });
        }
        if (this.photoDetailForm) {
            this.photoDetailForm.addEventListener('submit', (e) => this.savePhotoDetails(e));
        }
        if (this.deletePhotoBtn) {
            this.deletePhotoBtn.addEventListener('click', () => this.deleteCurrentPhoto());
        }
        
        // Layout settings events
        const layoutSelect = document.getElementById('gallery-layout');
        if (layoutSelect) {
            layoutSelect.addEventListener('change', (e) => {
                this.updateGalleryLayout(e.target.value);
            });
        }
    }
    
    /**
     * Initialize the gallery manager
     */
    init() {
        // Load photos from storage
        this.loadPhotos();
        
        // Update gallery display
        this.renderGallery();
        
        // Apply saved settings to the form
        this.applySettingsToForm();
        
        // Update storage usage display
        this.updateStorageUsage();
        
        // Apply saved layout
        if (this.gallerySettings.layout) {
            this.updateGalleryLayout(this.gallerySettings.layout);
            const layoutSelect = document.getElementById('gallery-layout');
            if (layoutSelect) {
                layoutSelect.value = this.gallerySettings.layout;
            }
        }
    }
    
    /**
     * Load photos from the database via API
     */
    async loadPhotos() {
        try {
            const response = await fetch('/api/gallery/images');
            
            if (!response.ok) {
                throw new Error(`Failed to fetch photos: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Transform API data to match our local format
            // Note: image_data is not returned by the list endpoint for efficiency
            this.photos = data.images.map(img => ({
                id: img.image_id,
                title: img.title || '',
                description: img.description || '',
                alt: img.alt_text || '',
                caption: img.caption || '',
                tags: img.tags ? JSON.parse(img.tags) : [],
                size: img.size,
                mime_type: img.mime_type,
                dimensions: {
                    width: img.width,
                    height: img.height
                },
                uploadDate: img.created_at,
                isProfilePhoto: img.is_profile_photo === 1,
                // Temporary placeholder for data - will be loaded on demand
                data: `/api/gallery/images/${img.image_id}/data`
            }));
            
            // Calculate total storage used
            this.currentStorageUsage = this.photos.reduce((total, photo) => {
                return total + (photo.size || 0);
            }, 0);
            
            // Preload the thumbnails
            this.preloadThumbnails();
        } catch (error) {
            console.error('Error loading photos from API:', error);
            this.photos = [];
            this.showNotification('Failed to load photos from server', 'error');
        }
    }
    
    /**
     * Preload thumbnails for all photos
     */
    async preloadThumbnails() {
        for (const photo of this.photos) {
            if (typeof photo.data === 'string' && photo.data.startsWith('/api/')) {
                try {
                    const response = await fetch(photo.data);
                    if (response.ok) {
                        const blob = await response.blob();
                        photo.data = URL.createObjectURL(blob);
                    }
                } catch (error) {
                    console.error(`Error preloading thumbnail for photo ${photo.id}:`, error);
                }
            }
        }
        
        // Update the gallery with loaded thumbnails
        this.renderGallery();
    }
    
    /**
     * Save a photo to the database
     * @param {Object} photo - The photo object to save
     * @returns {Promise<boolean>} - Whether the operation was successful
     */
    async savePhoto(photo) {
        try {
            const isNew = !photo.id || photo.id.toString().startsWith('temp_');
            
            if (isNew) {
                // Upload new photo
                const response = await fetch('/api/gallery/images', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: photo.title,
                        description: photo.description,
                        alt_text: photo.alt,
                        caption: photo.caption,
                        tags: photo.tags,
                        image_data: photo.data,
                        mime_type: photo.mime_type || 'image/jpeg',
                        size: photo.size,
                        width: photo.dimensions?.width,
                        height: photo.dimensions?.height,
                        is_profile_photo: photo.isProfilePhoto
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to upload photo: ${response.statusText}`);
                }
                
                // Update photo with server-assigned ID
                const result = await response.json();
                photo.id = result.image_id;
            } else {
                // Update existing photo
                const response = await fetch(`/api/gallery/images/${photo.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: photo.title,
                        description: photo.description,
                        alt_text: photo.alt,
                        caption: photo.caption,
                        tags: photo.tags,
                        is_profile_photo: photo.isProfilePhoto
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to update photo: ${response.statusText}`);
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error saving photo:', error);
            this.showNotification(`Failed to save photo: ${error.message}`, 'error');
            return false;
        }
    }
    
    /**
     * Load gallery settings from local storage
     */
    loadGallerySettings() {
        try {
            const storedSettings = localStorage.getItem('admin_gallery_settings');
            return storedSettings ? JSON.parse(storedSettings) : {
                title: 'Yoga Gallery',
                description: 'A collection of yoga practice photos',
                photosPerPage: 24,
                layout: 'grid'
            };
        } catch (error) {
            console.error('Error loading gallery settings:', error);
            return {
                title: 'Yoga Gallery',
                description: 'A collection of yoga practice photos',
                photosPerPage: 24,
                layout: 'grid'
            };
        }
    }
    
    /**
     * Save gallery settings to local storage
     */
    saveGallerySettings() {
        try {
            localStorage.setItem('admin_gallery_settings', JSON.stringify(this.gallerySettings));
        } catch (error) {
            console.error('Error saving gallery settings:', error);
            alert('There was an error saving your gallery settings.');
        }
    }
    
    /**
     * Apply saved settings to the form
     */
    applySettingsToForm() {
        const titleInput = document.getElementById('gallery-title');
        if (titleInput) {
            titleInput.value = this.gallerySettings.title || '';
        }
        
        const descriptionInput = document.getElementById('gallery-description');
        if (descriptionInput) {
            descriptionInput.value = this.gallerySettings.description || '';
        }
        
        const photosPerPageSelect = document.getElementById('photos-per-page');
        if (photosPerPageSelect) {
            photosPerPageSelect.value = this.gallerySettings.photosPerPage || 24;
        }
        
        const layoutSelect = document.getElementById('gallery-layout');
        if (layoutSelect) {
            layoutSelect.value = this.gallerySettings.layout || 'grid';
        }
    }
    
    /**
     * Save settings from form
     */
    saveSettings(e) {
        e.preventDefault();
        
        this.gallerySettings = {
            title: document.getElementById('gallery-title')?.value || 'Yoga Gallery',
            description: document.getElementById('gallery-description')?.value || '',
            photosPerPage: document.getElementById('photos-per-page')?.value || 24,
            layout: document.getElementById('gallery-layout')?.value || 'grid'
        };
        
        this.saveGallerySettings();
        
        // Update layout if changed
        this.updateGalleryLayout(this.gallerySettings.layout);
        
        // Show confirmation
        this.showNotification('Gallery settings saved successfully!');
    }
    
    /**
     * Update the gallery layout based on selection
     */
    updateGalleryLayout(layout) {
        if (!this.galleryElement) return;
        
        // Remove all layout classes
        this.galleryElement.classList.remove('grid', 'masonry', 'carousel');
        
        // Add the selected layout class
        this.galleryElement.classList.add(layout);
        
        // Add carousel controls if needed
        if (layout === 'carousel') {
            if (!document.querySelector('.carousel-controls')) {
                const controls = document.createElement('div');
                controls.className = 'carousel-controls';
                controls.innerHTML = `
                    <button class="prev-btn"><i class="fas fa-chevron-left"></i></button>
                    <button class="next-btn"><i class="fas fa-chevron-right"></i></button>
                `;
                this.galleryElement.parentNode.insertBefore(controls, this.galleryElement.nextSibling);
                
                // Add event listeners
                document.querySelector('.prev-btn')?.addEventListener('click', () => {
                    this.galleryElement.scrollBy({ left: -this.galleryElement.offsetWidth, behavior: 'smooth' });
                });
                document.querySelector('.next-btn')?.addEventListener('click', () => {
                    this.galleryElement.scrollBy({ left: this.galleryElement.offsetWidth, behavior: 'smooth' });
                });
            }
        } else {
            // Remove carousel controls if they exist
            const controls = document.querySelector('.carousel-controls');
            if (controls) {
                controls.remove();
            }
        }
    }
    
    /**
     * Update the storage usage display
     */
    updateStorageUsage() {
        if (!this.storageBar || !this.storageInfo) return;
        
        const usagePercent = (this.currentStorageUsage / this.maxStorageSize) * 100;
        this.storageBar.style.width = `${Math.min(usagePercent, 100)}%`;
        
        // Change color based on usage
        if (usagePercent > 90) {
            this.storageBar.style.backgroundColor = '#e74c3c';
        } else if (usagePercent > 70) {
            this.storageBar.style.backgroundColor = '#f39c12';
        }
        
        // Display in readable format
        const usageInMB = (this.currentStorageUsage / (1024 * 1024)).toFixed(2);
        const totalInGB = this.maxStorageSize / (1024 * 1024 * 1024);
        this.storageInfo.textContent = `${usageInMB} MB used of ${totalInGB} GB`;
    }
    
    /**
     * Render the gallery with photos
     */
    renderGallery() {
        if (!this.galleryElement) return;
        
        // Clear the gallery
        this.galleryElement.innerHTML = '';
        
        // Check if we have any photos
        if (this.photos.length === 0) {
            this.galleryElement.innerHTML = `
                <div class="photo-gallery-empty">
                    <p>No photos in the gallery yet. Upload photos to get started.</p>
                </div>
            `;
            return;
        }
        
        // Create and append photo items
        this.photos.forEach((photo, index) => {
            const photoItem = document.createElement('div');
            photoItem.className = 'photo-item';
            photoItem.dataset.id = photo.id;
            
            // Add "profile photo" indicator if this is set as profile photo
            let profileBadge = '';
            if (photo.isProfilePhoto) {
                profileBadge = '<span class="profile-photo-badge"><i class="fas fa-user-circle"></i></span>';
                photoItem.classList.add('profile-photo');
            }
            
            photoItem.innerHTML = `
                <input type="checkbox" class="photo-checkbox" data-id="${photo.id}">
                ${profileBadge}
                <img src="${photo.data}" alt="${photo.alt || 'Photo'}" loading="lazy">
                <div class="photo-overlay">
                    <div class="photo-overlay-actions">
                        <button title="Edit" class="edit-photo-btn" data-id="${photo.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button title="Delete" class="delete-photo-btn" data-id="${photo.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                    <h3 class="photo-title">${photo.title || 'Untitled'}</h3>
                </div>
            `;
            
            this.galleryElement.appendChild(photoItem);
            
            // Add click event for checkbox
            const checkbox = photoItem.querySelector('.photo-checkbox');
            checkbox?.addEventListener('change', (e) => {
                e.stopPropagation();
                this.togglePhotoSelection(photo.id);
            });
            
            // Add click event for edit button
            const editBtn = photoItem.querySelector('.edit-photo-btn');
            editBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openPhotoDetails(photo);
            });
            
            // Add click event for delete button
            const deleteBtn = photoItem.querySelector('.delete-photo-btn');
            deleteBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deletePhoto(photo.id);
            });
            
            // Add click event for the whole photo item
            photoItem.addEventListener('click', () => {
                this.openPhotoDetails(photo);
            });
        });
        
        // Update the selected state for checkboxes
        this.updateSelectionDisplay();
    }
    
    /**
     * Handle file selection from input
     */
    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length) {
            this.processFiles(files);
        }
    }
    
    /**
     * Handle drag over event
     */
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        if (this.uploadZone) {
            this.uploadZone.classList.add('dragover');
        }
    }
    
    /**
     * Handle drop event
     */
    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        if (this.uploadZone) {
            this.uploadZone.classList.remove('dragover');
        }
        
        const files = e.dataTransfer.files;
        if (files.length) {
            this.processFiles(files);
        }
    }
    
    /**
     * Process uploaded files
     */
    async processFiles(files) {
        for (const file of files) {
            // Check if file is an image
            if (!file.type.startsWith('image/')) {
                continue;
            }
            
            try {
                // Show loading overlay
                this.showLoadingOverlay();
                
                // Read file as data URL
                const photoData = await this.readFileAsDataURL(file);
                
                // Get image dimensions
                const dimensions = await this.getImageDimensions(photoData);
                
                // Create photo object with temporary ID
                const photo = {
                    id: 'temp_' + this.generateUniqueId(),
                    title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
                    data: photoData,
                    size: file.size,
                    type: file.type,
                    mime_type: file.type,
                    dimensions: dimensions,
                    uploadDate: new Date().toISOString(),
                    caption: '',
                    alt: '',
                    tags: [],
                    isProfilePhoto: false
                };
                
                // Save photo to database via API
                const success = await this.savePhoto(photo);
                
                if (success) {
                    // Add photo to collection and render gallery
                    this.photos.push(photo);
                    this.renderGallery();
                    
                    // Display success notification
                    this.showNotification(`Uploaded ${file.name} successfully!`);
                }
                
                // Hide loading overlay
                this.hideLoadingOverlay();
            } catch (error) {
                console.error('Error processing file:', error);
                this.hideLoadingOverlay();
                this.showNotification(`Failed to upload ${file.name}. Error: ${error.message}`, 'error');
            }
        }
        
        // Reset file input
        if (this.fileInput) {
            this.fileInput.value = '';
        }
    }
    
    /**
     * Read file as data URL
     */
    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                resolve(event.target.result);
            };
            
            reader.onerror = (error) => {
                reject(error);
            };
            
            reader.readAsDataURL(file);
        });
    }
    
    /**
     * Get image dimensions
     */
    getImageDimensions(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                resolve({
                    width: img.width,
                    height: img.height
                });
            };
            
            img.onerror = (error) => {
                reject(error);
            };
            
            img.src = dataUrl;
        });
    }
    
    /**
     * Generate a unique ID for a photo
     */
    generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    
    /**
     * Toggle the selection of a photo
     */
    togglePhotoSelection(photoId) {
        const index = this.selectedPhotos.indexOf(photoId);
        
        if (index === -1) {
            this.selectedPhotos.push(photoId);
        } else {
            this.selectedPhotos.splice(index, 1);
        }
        
        this.updateSelectionDisplay();
    }
    
    /**
     * Update the display of selected photos
     */
    updateSelectionDisplay() {
        if (!this.selectAllBtn || !this.deleteSelectedBtn) return;
        
        // Update checkboxes
        document.querySelectorAll('.photo-checkbox').forEach(checkbox => {
            checkbox.checked = this.selectedPhotos.includes(checkbox.dataset.id);
        });
        
        // Update delete button state
        this.deleteSelectedBtn.disabled = this.selectedPhotos.length === 0;
        
        // Update select all button text
        if (this.selectedPhotos.length === this.photos.length && this.photos.length > 0) {
            this.selectAllBtn.innerHTML = '<i class="fas fa-times-square"></i> Deselect All';
        } else {
            this.selectAllBtn.innerHTML = '<i class="fas fa-check-square"></i> Select All';
        }
    }
    
    /**
     * Toggle select all photos
     */
    toggleSelectAll() {
        if (this.selectedPhotos.length === this.photos.length && this.photos.length > 0) {
            // Deselect all
            this.selectedPhotos = [];
        } else {
            // Select all
            this.selectedPhotos = this.photos.map(photo => photo.id);
        }
        
        this.updateSelectionDisplay();
    }
    
    /**
     * Delete selected photos
     */
    deleteSelected() {
        if (this.selectedPhotos.length === 0) return;
        
        if (!confirm(`Are you sure you want to delete ${this.selectedPhotos.length} selected photo(s)?`)) {
            return;
        }
        
        // Check if any of the selected photos is the profile photo
        const isProfilePhotoSelected = this.photos.some(photo => 
            this.selectedPhotos.includes(photo.id) && photo.isProfilePhoto
        );
        
        // Filter out selected photos
        this.photos = this.photos.filter(photo => !this.selectedPhotos.includes(photo.id));
        
        // Clear selection
        this.selectedPhotos = [];
        
        // Save photos
        this.savePhotos();
        
        // Update gallery display
        this.renderGallery();
        
        // Show notification
        let message = 'Selected photos deleted successfully.';
        if (isProfilePhotoSelected) {
            message += ' Note: The profile photo was deleted. Please select a new profile photo.';
        }
        this.showNotification(message);
    }
    
    /**
     * Sort the gallery
     */
    sortGallery() {
        const sortValue = this.sortSelect?.value;
        if (!sortValue) return;
        
        switch (sortValue) {
            case 'newest':
                this.photos.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
                break;
            case 'oldest':
                this.photos.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
                break;
            case 'name-asc':
                this.photos.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                break;
            case 'name-desc':
                this.photos.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
                break;
        }
        
        // Update gallery display
        this.renderGallery();
    }
    
    /**
     * Open photo details modal
     */
    openPhotoDetails(photo) {
        this.currentPhoto = photo;
        
        // Create modal if it doesn't exist
        if (!this.photoDetailModal) {
            this.createPhotoDetailModal();
        }
        
        if (!this.modalPhoto || !this.photoTitle || !this.photoCaption || !this.photoAltText ||
            !this.photoTags || !this.photoFilename || !this.photoSize || !this.photoDimensions || 
            !this.photoDate) {
            console.error("Missing required modal elements");
            return;
        }
        
        // Set modal content
        this.modalPhoto.src = photo.data;
        this.photoTitle.value = photo.title || '';
        this.photoCaption.value = photo.caption || '';
        this.photoAltText.value = photo.alt || '';
        this.photoTags.value = photo.tags ? photo.tags.join(', ') : '';
        
        // Check profile photo checkbox if this is the profile photo
        const profileCheckbox = document.getElementById('use-as-profile');
        if (profileCheckbox) {
            profileCheckbox.checked = photo.isProfilePhoto || false;
        }
        
        // Set info fields
        this.photoFilename.textContent = photo.title ? `${photo.title}${this.getFileExtension(photo.type)}` : '-';
        this.photoSize.textContent = this.formatFileSize(photo.size);
        this.photoDimensions.textContent = photo.dimensions ? `${photo.dimensions.width} × ${photo.dimensions.height}` : '-';
        this.photoDate.textContent = photo.uploadDate ? new Date(photo.uploadDate).toLocaleString() : '-';
        
        // Show the modal
        if (this.photoDetailModal) {
            this.photoDetailModal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }
    
    /**
     * Create the photo detail modal
     */
    createPhotoDetailModal() {
        const modal = document.createElement('div');
        modal.id = 'photo-detail-modal';
        modal.className = 'modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        modalContent.innerHTML = `
            <span class="close-modal">&times;</span>
            <h2 id="photo-detail-title">Photo Details</h2>
            <div class="modal-body">
                <div class="photo-detail-container">
                    <div class="photo-detail-image">
                        <img id="modal-photo" src="" alt="Photo preview">
                    </div>
                    <div class="photo-detail-info">
                        <form id="photo-detail-form">
                            <div class="admin-form-group">
                                <label for="photo-title">Title</label>
                                <input type="text" id="photo-title" class="admin-form-control" placeholder="Enter a title for this photo">
                            </div>
                            <div class="admin-form-group">
                                <label for="photo-caption">Caption</label>
                                <textarea id="photo-caption" class="admin-form-control" rows="3" placeholder="Enter a caption for this photo"></textarea>
                            </div>
                            <div class="admin-form-group">
                                <label for="photo-alt-text">Alt Text (for accessibility)</label>
                                <input type="text" id="photo-alt-text" class="admin-form-control" placeholder="Describe the image for screen readers">
                            </div>
                            <div class="admin-form-group">
                                <label for="photo-tags">Tags (comma separated)</label>
                                <input type="text" id="photo-tags" class="admin-form-control" placeholder="yoga, meditation, nature">
                            </div>
                            <div class="admin-form-group profile-photo-option">
                                <div class="profile-photo-checkbox">
                                    <input type="checkbox" id="use-as-profile">
                                    <label for="use-as-profile">Use as Profile Photo (About Me section)</label>
                                </div>
                            </div>
                            <div class="admin-form-group">
                                <label>Photo Information</label>
                                <table class="photo-info-table">
                                    <tr>
                                        <td>Filename:</td>
                                        <td id="photo-filename">-</td>
                                    </tr>
                                    <tr>
                                        <td>File Size:</td>
                                        <td id="photo-size">-</td>
                                    </tr>
                                    <tr>
                                        <td>Dimensions:</td>
                                        <td id="photo-dimensions">-</td>
                                    </tr>
                                    <tr>
                                        <td>Uploaded:</td>
                                        <td id="photo-date">-</td>
                                    </tr>
                                </table>
                            </div>
                            <div class="admin-form-actions">
                                <button type="submit" class="admin-btn admin-btn-primary">Save Changes</button>
                                <button type="button" id="delete-photo-btn" class="admin-btn admin-btn-danger">Delete Photo</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Update references to the new modal elements
        this.photoDetailModal = modal;
        this.modalPhoto = modal.querySelector('#modal-photo');
        this.photoDetailForm = modal.querySelector('#photo-detail-form');
        this.photoTitle = modal.querySelector('#photo-title');
        this.photoCaption = modal.querySelector('#photo-caption');
        this.photoAltText = modal.querySelector('#photo-alt-text');
        this.photoTags = modal.querySelector('#photo-tags');
        this.photoFilename = modal.querySelector('#photo-filename');
        this.photoSize = modal.querySelector('#photo-size');
        this.photoDimensions = modal.querySelector('#photo-dimensions');
        this.photoDate = modal.querySelector('#photo-date');
        this.deletePhotoBtn = modal.querySelector('#delete-photo-btn');
        this.modalCloseBtn = modal.querySelector('.close-modal');
        
        // Add event listeners
        this.modalCloseBtn?.addEventListener('click', () => this.closeModal());
        this.photoDetailModal.addEventListener('click', (e) => {
            if (e.target === this.photoDetailModal) this.closeModal();
        });
        this.photoDetailForm?.addEventListener('submit', (e) => this.savePhotoDetails(e));
        this.deletePhotoBtn?.addEventListener('click', () => this.deleteCurrentPhoto());
    }
    
    /**
     * Close the photo details modal
     */
    closeModal() {
        if (this.photoDetailModal) {
            this.photoDetailModal.classList.remove('show');
            document.body.style.overflow = '';
            this.currentPhoto = null;
        }
    }
    
    /**
     * Save photo details from the modal form
     */
    async savePhotoDetails(e) {
        e.preventDefault();
        
        if (!this.currentPhoto) return;
        
        // Find the photo in our local collection
        const photoIndex = this.photos.findIndex(p => p.id === this.currentPhoto.id);
        
        if (photoIndex === -1) {
            this.closeModal();
            return;
        }
        
        const useAsProfileCheckbox = document.getElementById('use-as-profile');
        const useAsProfile = useAsProfileCheckbox?.checked || false;
        const wasProfilePhotoChanged = this.photos[photoIndex].isProfilePhoto !== useAsProfile;
        
        // Update photo object locally
        this.photos[photoIndex].title = this.photoTitle?.value || '';
        this.photos[photoIndex].caption = this.photoCaption?.value || '';
        this.photos[photoIndex].alt = this.photoAltText?.value || '';
        this.photos[photoIndex].tags = this.photoTags?.value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag) || [];
        this.photos[photoIndex].isProfilePhoto = useAsProfile;
        
        // Show loading overlay
        this.showLoadingOverlay();
        
        try {
            // Save changes to the database
            const success = await this.savePhoto(this.photos[photoIndex]);
            
            if (success) {
                // Update gallery display
                this.renderGallery();
                
                // Show notification
                let message = 'Photo details saved successfully.';
                if (useAsProfile) {
                    message += ' This photo is now your profile photo!';
                } else if (wasProfilePhotoChanged) {
                    message += ' This photo is no longer your profile photo.';
                }
                
                this.showNotification(message);
            }
        } catch (error) {
            console.error('Error saving photo details:', error);
            this.showNotification(`Error saving photo details: ${error.message}`, 'error');
        } finally {
            // Hide loading overlay and close modal
            this.hideLoadingOverlay();
            this.closeModal();
        }
    }
    
    /**
     * Update the profile photo on the about me section
     */
    updateProfilePhoto(photo) {
        // Store the profile photo in localStorage for the frontend to use
        localStorage.setItem('profile_photo', photo.data);
        
        // If we're on the admin page, let's also update any visible profile images
        const aboutPreview = document.getElementById('instructor-photo-preview');
        if (aboutPreview) {
            aboutPreview.src = photo.data;
        }
    }
    
    /**
     * Delete the current photo
     */
    deleteCurrentPhoto() {
        if (!this.currentPhoto) return;
        
        if (!confirm('Are you sure you want to delete this photo?')) {
            return;
        }
        
        const wasProfilePhoto = this.currentPhoto.isProfilePhoto;
        
        this.deletePhoto(this.currentPhoto.id);
        this.closeModal();
        
        if (wasProfilePhoto) {
            this.showNotification('Photo deleted. Note: This was your profile photo. Please select a new profile photo.');
        }
    }
    
    /**
     * Delete a photo by ID
     */
    async deletePhoto(photoId) {
        try {
            // Show loading overlay
            this.showLoadingOverlay();
            
            // Get photo before deletion for checking if it was a profile photo
            const photo = this.photos.find(p => p.id === photoId);
            if (!photo) {
                throw new Error('Photo not found');
            }
            
            const wasProfilePhoto = photo.isProfilePhoto || false;
            
            // Delete from database
            const response = await fetch(`/api/gallery/images/${photoId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`Failed to delete photo: ${response.statusText}`);
            }
            
            // Filter out the photo from local collection
            this.photos = this.photos.filter(photo => photo.id !== photoId);
            
            // Remove from selected photos if it's there
            const selectedIndex = this.selectedPhotos.indexOf(photoId);
            if (selectedIndex !== -1) {
                this.selectedPhotos.splice(selectedIndex, 1);
            }
            
            // Update gallery display
            this.renderGallery();
            
            // Show notification
            let message = 'Photo deleted successfully.';
            if (wasProfilePhoto) {
                message += ' Note: This was your profile photo. Please select a new profile photo.';
            }
            this.showNotification(message);
        } catch (error) {
            console.error('Error deleting photo:', error);
            this.showNotification(`Failed to delete photo: ${error.message}`, 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }
    
    /**
     * Get file extension from MIME type
     */
    getFileExtension(mimeType) {
        switch (mimeType) {
            case 'image/jpeg':
                return '.jpg';
            case 'image/png':
                return '.png';
            case 'image/gif':
                return '.gif';
            case 'image/webp':
                return '.webp';
            default:
                return '';
        }
    }
    
    /**
     * Format file size to readable string
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Show loading overlay
     */
    showLoadingOverlay() {
        // Check if overlay already exists
        let overlay = document.querySelector('.loading-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<div class="spinner"></div>';
            document.body.appendChild(overlay);
        }
        
        overlay.style.display = 'flex';
    }
    
    /**
     * Hide loading overlay
     */
    hideLoadingOverlay() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    /**
     * Show notification
     */
    showNotification(message, type = 'success') {
        // Check if notification container exists
        let notificationContainer = document.querySelector('.notification-container');
        
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.className = 'notification-container';
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = message;
        
        // Add notification to container
        notificationContainer.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => {
                notification.remove();
                
                // Remove container if empty
                if (notificationContainer.children.length === 0) {
                    notificationContainer.remove();
                }
            }, 300);
        }, 3000);
    }
}
