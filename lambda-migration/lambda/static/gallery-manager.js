// Ensure class is defined globally
window.GalleryManager = class GalleryManager {
    constructor(container) {
        this.container = container;
        this.images = [];
        this.isLoading = false;
        this.setupManager();
        // Don't call loadGallery() here - let parent component call it when ready
    }
    
    // New async initialization method that parent can await
    async initialize() {
        try {
            await this.loadGallery();
            return true;
        } catch (error) {
            console.error('Gallery initialization failed:', error);
            return false;
        }
    }

    setupManager() {
        this.container.innerHTML = `
            <div class="gallery-controls">
                <button class="primary-btn upload-btn">Upload Images</button>
                <input type="file" accept="image/*" multiple style="display: none;">
                <span class="status-text"></span>
            </div>
            <div class="gallery-grid"></div>
            <div class="gallery-empty" style="display: none; text-align: center; padding: 2rem;">
                <p>No images in the gallery. Upload some images to get started.</p>
            </div>
            <div class="gallery-loading" style="display: none; text-align: center; padding: 2rem;">
                <p>Loading gallery images...</p>
            </div>
        `;

        // Setup event listeners
        const uploadBtn = this.container.querySelector('.upload-btn');
        const fileInput = this.container.querySelector('input[type="file"]');
        const statusText = this.container.querySelector('.status-text');

        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                statusText.textContent = `Uploading ${e.target.files.length} images...`;
                this.handleFileUpload(e.target.files);
            }
        });

        // Load initial gallery
        this.loadGallery();
    }

    async loadGallery() {
        try {
            this.isLoading = true;
            this.updateUIState();
            
            const headers = getAuthHeaders();
            if (!headers) {
                throw new Error('Authentication failed');
            }
            
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch('/dev/gallery', {
                headers,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.images = data.images || [];
            
            // Update status text
            const statusText = this.container.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = `${this.images.length} images in gallery`;
            }
            
            // Render the gallery
            this.renderGallery();
            
            // Trigger event for parent components
            const event = new CustomEvent('gallery-loaded', { 
                detail: { count: this.images.length } 
            });
            this.container.dispatchEvent(event);
            
        } catch (error) {
            console.error('Gallery load failed:', error);
            this._safeShowNotification('Failed to load gallery: ' + error.message, 'error');
            // Don't redirect on every error - handle gracefully
            this.images = [];
        } finally {
            this.isLoading = false;
            this.updateUIState();
        }
    }
    
    updateUIState() {
        const grid = this.container.querySelector('.gallery-grid');
        const emptyMessage = this.container.querySelector('.gallery-empty');
        const loadingMessage = this.container.querySelector('.gallery-loading');
        
        if (this.isLoading) {
            grid.style.display = 'none';
            emptyMessage.style.display = 'none';
            loadingMessage.style.display = 'block';
        } else if (this.images.length === 0) {
            grid.style.display = 'none';
            emptyMessage.style.display = 'block';
            loadingMessage.style.display = 'none';
        } else {
            grid.style.display = 'grid';
            emptyMessage.style.display = 'none';
            loadingMessage.style.display = 'none';
        }
    }

    renderGallery() {
        const grid = this.container.querySelector('.gallery-grid');
        grid.innerHTML = '';

        this.images.forEach(image => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.innerHTML = `
                <div class="gallery-image-container">
                    <img src="${image.imageUrl}" alt="${image.altText || image.title || ''}">
                    <div class="gallery-overlay">
                        <button class="delete-btn">Delete</button>
                    </div>
                </div>
                <div class="gallery-controls">
                    <input type="text" class="title-input" placeholder="Title" value="${image.title || ''}" style="margin-bottom: 5px;">
                    <input type="text" class="caption-input" placeholder="Caption" value="${image.description || ''}">
                    <div class="checkbox-control" style="margin-top: 5px;">
                        <label>
                            <input type="checkbox" class="featured-checkbox" ${image.featured ? 'checked' : ''}>
                            Featured Image
                        </label>
                    </div>
                </div>
            `;

            // Setup delete button
            item.querySelector('.delete-btn').addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this image?')) {
                    this.deleteImage(image.id);
                }
            });

            // Setup title input
            const titleInput = item.querySelector('.title-input');
            titleInput.addEventListener('change', () => {
                this.updateImageMetadata(image.id, {
                    title: titleInput.value
                });
            });

            // Setup caption input
            const captionInput = item.querySelector('.caption-input');
            captionInput.addEventListener('change', () => {
                this.updateImageMetadata(image.id, {
                    description: captionInput.value
                });
            });
            
            // Setup featured checkbox
            const featuredCheckbox = item.querySelector('.featured-checkbox');
            featuredCheckbox.addEventListener('change', () => {
                this.updateImageMetadata(image.id, {
                    featured: featuredCheckbox.checked
                });
            });

            grid.appendChild(item);
        });
    }

    async handleFileUpload(files) {
        const statusText = this.container.querySelector('.status-text');
        const uploadBtn = this.container.querySelector('.upload-btn');
        const totalFiles = files.length;
        let successCount = 0;
        
        // Disable upload button during upload
        uploadBtn.disabled = true;
        
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                statusText.textContent = `Uploading image ${i + 1}/${totalFiles}...`;
                
                // Step 1: Get a presigned URL for upload
                const headers = getAuthHeaders();
                if (!headers) return;
                
                const getUrlResponse = await fetch('/dev/gallery/upload', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ 
                        filename: file.name,
                        contentType: file.type
                    }),
                });
                
                if (!getUrlResponse.ok) throw new Error('Failed to get upload URL');
                
                const urlData = await getUrlResponse.json();
                const { uploadUrl, imageUrl, s3Key, bucket } = urlData;
                
                // Step 2: Upload the file to the presigned URL
                const uploadResponse = await fetch(uploadUrl, {
                    method: 'PUT',
                    body: file,
                    headers: {
                        'Content-Type': file.type
                    }
                });
                
                if (!uploadResponse.ok) throw new Error('Failed to upload to S3');
                
                // Step 3: Save metadata in DynamoDB
                const metadataResponse = await fetch('/dev/gallery', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        imageUrl,
                        s3Key,
                        s3Bucket: bucket,
                        title: file.name.split('.')[0], // Use filename as default title
                        description: '',
                        altText: file.name.split('.')[0],
                        category: 'general',
                        featured: false
                    }),
                });
                
                if (!metadataResponse.ok) throw new Error('Failed to save image metadata');
                
                successCount++;
            }
            
            showNotification(`Successfully uploaded ${successCount} of ${totalFiles} images`, 'success');
            
            // Trigger custom event
            const event = new CustomEvent('gallery-updated', { 
                detail: { action: 'upload', count: successCount } 
            });
            this.container.dispatchEvent(event);
            
            // Reload the gallery
            await this.loadGallery();
        } catch (error) {
            console.error('Failed to upload images:', error);
            showNotification(`Failed to upload some images. ${successCount} of ${totalFiles} uploaded.`, 'error');
        } finally {
            // Re-enable upload button
            uploadBtn.disabled = false;
            statusText.textContent = successCount > 0 ? 
                `${successCount} images uploaded successfully` : '';
        }
    }

    async updateImageMetadata(imageId, metadata) {
        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            const response = await fetch(`/dev/gallery/${imageId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(metadata),
            });

            if (!response.ok) throw new Error('Failed to update image metadata');

            showNotification('Image updated successfully', 'success');
            
            // Find and update the image in the local array
            const index = this.images.findIndex(img => img.id === imageId);
            if (index !== -1) {
                this.images[index] = { ...this.images[index], ...metadata };
            }
            
            // Trigger custom event
            const event = new CustomEvent('gallery-updated', { 
                detail: { action: 'update', imageId } 
            });
            this.container.dispatchEvent(event);
        } catch (error) {
            console.error('Failed to update image metadata:', error);
            showNotification('Failed to update image', 'error');
        }
    }

    async deleteImage(imageId) {
        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            const response = await fetch(`/dev/gallery/${imageId}`, {
                method: 'DELETE',
                headers,
            });

            if (!response.ok) throw new Error('Failed to delete image');

            showNotification('Image deleted successfully', 'success');
            
            // Update local array
            this.images = this.images.filter(img => img.id !== imageId);
            this.renderGallery();
            this.updateUIState();
            
            // Update status text
            const statusText = this.container.querySelector('.status-text');
            statusText.textContent = `${this.images.length} images in gallery`;
            
            // Trigger custom event
            const event = new CustomEvent('gallery-updated', { 
                detail: { action: 'delete', imageId } 
            });
            this.container.dispatchEvent(event);
        } catch (error) {
            console.error('Failed to delete image:', error);
            showNotification('Failed to delete image', 'error');
            // Reload gallery to ensure consistency
            this.loadGallery();
        }
    }
    
    // Safe notification helper that works even if global function is missing
    _safeShowNotification(message, type = 'info') {
        try {
            // Try to use global notification function first
            if (typeof showNotification === 'function') {
                showNotification(message, type);
                return;
            }
            
            // Fallback to console and UI indication if possible
            console.log(`${type.toUpperCase()}: ${message}`);
            
            // Try to update status text as a fallback UI indicator
            const statusText = this.container.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = message;
                if (type === 'error') {
                    statusText.style.color = 'red';
                } else if (type === 'success') {
                    statusText.style.color = 'green';
                } else {
                    statusText.style.color = '';
                }
            }
        } catch (e) {
            // Last resort - just log to console
            console.error('Notification error:', e);
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Helper function for getting auth headers
function getAuthHeaders() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('Authentication token not found');
            return null;
        }
        return {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    } catch (error) {
        console.error('Error getting auth headers:', error);
        return null;
    }
}

// Fallback notification function if the global one doesn't exist
if (typeof showNotification !== 'function') {
    window.showNotification = function(message, type = 'info') {
        console.log(`${type.toUpperCase()}: ${message}`);
    };
}
